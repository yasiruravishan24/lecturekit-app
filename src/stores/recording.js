import { defineStore } from 'pinia'
import { Capacitor } from '@capacitor/core'
import { Network } from '@capacitor/network'
import { KeepAwake } from '@capacitor-community/keep-awake'
import { LectureRecorder, LectureRecorderWeb } from 'lecturekit-recorder'
import * as library from '../api/library'
import * as sessionsApi from '../api/sessions'
import { friendly } from '../util/errors'
import { isNative } from '../util/platform'
import { prefs } from '../util/storage'
import { finalPlan } from '../recording/chunker'
import { readBlob } from '../recording/files'
import { makeQueue } from '../recording/queue'
import { useSettingsStore } from './settings'

// One lecture being recorded, sent and made into notes. The phone cuts the recording into 5-minute parts (native plugin), every finished
// part goes into a queue that is saved on the phone, and Stop sends the rest and asks the server for the notes.
const QUEUE_KEY = 'lk_queue'
const META_KEY = 'lk_recording'
const MIN_FREE_BYTES = 500 * 1024 * 1024

let queue = null
let cam = null          // the camera mode records picture and sound in the web view (the native recorder is sound only)
const recorderFor = (camera) => (camera ? (cam = cam || new LectureRecorderWeb()) : LectureRecorder)
export const cameraRecorder = () => recorderFor(true)
let listeners = []
let jobTimer = null

const diskStore = {
  async all() { return prefs.getJson(QUEUE_KEY, []) },
  async pending() { return (await this.all()).filter((c) => c.state === 'pending').sort((a, b) => a.sessionId - b.sessionId || a.index - b.index) },
  async put(item) {
    const all = (await this.all()).filter((c) => !(c.sessionId === item.sessionId && c.index === item.index))
    await prefs.setJson(QUEUE_KEY, [...all, item])
  },
  async remove(sessionId, index) { await prefs.setJson(QUEUE_KEY, (await this.all()).filter((c) => !(c.sessionId === sessionId && c.index === index))) },
  async get(sessionId, index) { return (await this.all()).find((c) => c.sessionId === sessionId && c.index === index) },
  async clearSession(sessionId) { await prefs.setJson(QUEUE_KEY, (await this.all()).filter((c) => c.sessionId !== sessionId)) },
}

export const useRecordingStore = defineStore('recording', {
  state: () => ({
    camera: false,            // true: picture and sound (the screen must stay on); false: sound only (the screen may be locked)
    phase: 'idle',            // idle recording paused interrupted stopping sending processing done failed limit
    sessionId: null, title: '', moduleId: null,
    seconds: 0, level: -80, quietFor: 0,
    chunkSeconds: 300, overlap: 5, folder: '',
    slides: [],               // [{ name, size, path? , blob? }]
    total: 0, jobId: null, job: null,
    sent: 0, pending: 0, waiting: null, retryIn: 0, paused401: false, fatal: null,
    error: '', notice: '',
    unsent: null,             // a recording that was cut short (app closed, phone restarted): { sessionId, title, parts }
  }),
  getters: {
    active: (s) => ['recording', 'paused', 'interrupted'].includes(s.phase),
    busy: (s) => ['stopping', 'sending', 'processing'].includes(s.phase),
  },
  actions: {
    _queue() {
      if (queue) return queue
      const settings = useSettingsStore()
      queue = makeQueue({
        store: diskStore,
        upload: async (item) => sessionsApi.uploadChunk(item.sessionId, item.index, await readBlob(item), item.name),
        allowed: async () => {
          if (!settings.wifiOnly || !isNative()) return { ok: true }
          const st = await Network.getStatus()
          return st.connectionType === 'wifi' ? { ok: true } : { ok: false, why: 'wifi' }
        },
        onChange: (q) => { this.sent = q.sent; this.pending = q.pending; this.waiting = q.waiting; this.retryIn = q.retryIn; this.paused401 = q.paused === 'login'; this.fatal = q.fatal },
      })
      return queue
    },
    kick() { return this._queue().kick() },

    _rec() { return recorderFor(this.camera) },

    async _listen() {
      this._unlisten()
      listeners = [
        await this._rec().addListener('chunk', (p) => this._onChunk(p)),
        await this._rec().addListener('level', (p) => this._onLevel(p)),
        await this._rec().addListener('state', (p) => this._onState(p)),
        await this._rec().addListener('error', (p) => { this.error = p.message }),
      ]
    },
    _unlisten() { listeners.forEach((l) => l.remove()); listeners = [] },

    async _onChunk(p) {
      if (this.sessionId == null) return
      await diskStore.put({ sessionId: this.sessionId, index: p.index, path: p.path || null, url: p.url || null, name: `chunk_${String(p.index).padStart(5, '0')}.${p.path ? 'm4a' : /mp4/.test(p.type || '') ? 'mp4' : 'webm'}`, seconds: p.seconds, state: 'pending', at: Date.now() })
      this.kick()
    },
    _onLevel(p) {
      this.level = p.db
      this.seconds = p.seconds
      this.quietFor = p.db < -50 ? this.quietFor + 0.2 : 0
    },
    _onState(p) {
      if (p.state === 'interrupted') { this.phase = 'interrupted'; this.notice = `Recording was interrupted at ${this.clockText(p.seconds ?? this.seconds)}` }
      else if (p.state === 'recording') { if (this.active) this.phase = 'recording'; this.notice = '' }
      else if (p.state === 'paused') this.phase = 'paused'
    },
    clockText(sec) {
      const s = Math.round(sec || 0)
      const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
      const pad = (n) => String(n).padStart(2, '0')
      return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`
    },

    // ---- start ----
    async start({ moduleId, title, slides = [], camera = false, facing = 'environment' }) {
      this.camera = camera
      this.error = ''
      this.notice = ''
      const perm = await this._rec().checkPermission()
      if (perm.status !== 'granted') {
        const asked = await this._rec().requestPermission()
        if (asked.status !== 'granted') throw Object.assign(new Error('Microphone access is off. Turn it on for Lecture Assistant in the phone Settings.'), { code: 'mic_denied' })
      }
      const { bytes } = await this._rec().freeSpace()
      if (bytes < MIN_FREE_BYTES) throw new Error('There is not enough free space on this phone to record (about 500 MB is needed).')
      const session = await library.createSession(moduleId, title)
      let live
      try { live = await sessionsApi.openLive(session.id) } catch (e) { library.deleteSession(session.id).catch(() => {}); throw e }
      const testSeconds = isNative() ? 0 : Number(localStorage.getItem('lk_test_chunk')) || 0         // short parts, for the browser tests only
      if (testSeconds) live = { ...live, chunk_seconds: testSeconds }
      Object.assign(this, { sessionId: session.id, title, moduleId, slides, seconds: 0, level: -80, quietFor: 0, chunkSeconds: live.chunk_seconds, overlap: live.overlap, total: 0, jobId: null, job: null, sent: 0, pending: 0 })
      await this._listen()
      try {
        const r = await this._rec().start({ chunkSeconds: live.chunk_seconds, overlap: live.overlap, folder: `s${session.id}`, ...(camera ? { video: true, facing } : {}) })
        this.folder = r.folder
      } catch (e) {
        this._unlisten()
        library.deleteSession(session.id).catch(() => {})
        this.sessionId = null
        throw e
      }
      await prefs.setJson(META_KEY, { sessionId: session.id, moduleId, title, folder: this.folder, chunkSeconds: live.chunk_seconds, overlap: live.overlap })
      KeepAwake.keepAwake().catch(() => {})
      this.phase = 'recording'
    },

    async pause() { await this._rec().pause(); this.phase = 'paused' },
    async resume() { await this._rec().resume(); this.phase = 'recording'; this.notice = '' },

    // ---- stop: send the rest, make the notes ----
    async stop() {
      this.phase = 'stopping'
      this.error = ''
      try {
        const r = await this._rec().stop()
        KeepAwake.allowSleep().catch(() => {})
        this._unlisten()
        const plan = finalPlan(r.seconds, this.chunkSeconds, this.overlap)
        for (const k of plan.drop) await diskStore.remove(this.sessionId, k)           // a last part that only repeats the overlap
        this.total = plan.total
        this.seconds = r.seconds
        if (!plan.total) { await this.reset(); return }
        await this.finish()
      } catch (e) {
        this.error = friendly(e)
        this.phase = 'failed'
      }
    },

    async finish() {
      this.phase = 'sending'
      this.error = ''
      try {
        const q = this._queue()
        for (let guard = 0; guard < 4; guard += 1) {                       // 1. every part on the server
          q.kick()
          for (;;) {
            const st = await q.refresh()
            if (st.paused) throw Object.assign(new Error('Log in again to continue sending.'), { code: 'login' })
            if (st.fatal) throw Object.assign(new Error(friendly({ code: st.fatal })), { code: st.fatal })
            if (!st.pending && !q.isRunning()) break
            await new Promise((r) => setTimeout(r, 700))
          }
          const status = await sessionsApi.liveStatus(this.sessionId, this.total)       // 2. does the server agree?
          if (!status.missing.length) break
          for (const k of status.missing) {
            const c = await diskStore.get(this.sessionId, k)
            if (c) await diskStore.put({ ...c, state: 'pending' })
          }
          if (guard === 3) throw new Error(`Part ${status.missing[0] + 1} did not arrive. Try again.`)
        }
        const slides = []
        for (const s of this.slides) slides.push({ name: s.name, blob: await readBlob(s) })
        try {
          const { job_id } = await sessionsApi.finishLive(this.sessionId, this.total, slides)
          this.jobId = job_id
          this.phase = 'processing'
          this.pollJob()
        } catch (e) {
          if (e.code !== 'daily_limit') throw e
          this.error = friendly(e)
          this.phase = 'limit'
        }
        await diskStore.clearSession(this.sessionId)                        // the server has everything
        await prefs.remove(META_KEY)
      } catch (e) {
        this.error = friendly(e)
        this.phase = 'failed'
      }
    },

    pollJob() {
      clearTimeout(jobTimer)
      const tick = async () => {
        if (this.phase !== 'processing' || !this.jobId) return
        try {
          this.job = await sessionsApi.getJob(this.jobId)
          if (this.job.state === 'done') { this.phase = 'done'; return }
          if (this.job.state === 'failed') { this.error = this.job.error_message || 'The notes could not be made.'; this.phase = 'failed'; return }
        } catch { /* try again */ }
        jobTimer = setTimeout(tick, 3000)
      }
      tick()
    },

    async reset() {
      clearTimeout(jobTimer)
      this._unlisten()
      Object.assign(this, { phase: 'idle', camera: false, sessionId: null, title: '', moduleId: null, seconds: 0, level: -80, slides: [], total: 0, jobId: null, job: null, error: '', notice: '' })
      await prefs.remove(META_KEY)
    },

    // ---- a recording that was never sent (the app was closed, the phone restarted) ----
    async checkUnsent() {
      if (this.phase !== 'idle') return
      const meta = await prefs.getJson(META_KEY, null)
      if (!meta) { this.unsent = null; return }
      const items = (await diskStore.all()).filter((c) => c.sessionId === meta.sessionId && c.path)       // only parts saved as files can be sent again
      if (!items.length) { await prefs.remove(META_KEY); this.unsent = null; return }
      this.unsent = { ...meta, parts: items.length }
    },

    async sendUnsent() {
      const u = this.unsent
      if (!u) return
      const items = (await diskStore.all()).filter((c) => c.sessionId === u.sessionId)
      let received = []
      try { received = (await sessionsApi.liveStatus(u.sessionId)).received || [] } catch { /* offline: the parts on the phone decide */ }
      const last = Math.max(-1, ...received, ...items.map((c) => c.index))
      Object.assign(this, { sessionId: u.sessionId, title: u.title, moduleId: u.moduleId, chunkSeconds: u.chunkSeconds, overlap: u.overlap, camera: false, total: last + 1, slides: [], jobId: null, job: null, error: '', notice: '', sent: 0, pending: 0, unsent: null })
      await this.finish()
    },

    async discardUnsent() {
      const u = this.unsent
      if (!u) return
      await diskStore.clearSession(u.sessionId)
      await prefs.remove(META_KEY)
      library.deleteSession(u.sessionId).catch(() => {})
      this.unsent = null
    },

    async discard() {                                                        // the person gives up this recording
      if (this.active) { try { await this._rec().stop() } catch { /* already stopped */ } }
      KeepAwake.allowSleep().catch(() => {})
      const id = this.sessionId
      if (id) { await diskStore.clearSession(id); library.deleteSession(id).catch(() => {}) }
      await this.reset()
    },
  },
})

export { diskStore, Capacitor }
