import { defineStore } from 'pinia'
import { Notify } from 'quasar'
import { useAuthStore } from './auth'
import { useLibraryStore } from './library'
import { useNotificationsStore } from './notifications'
import { useSettingsStore } from './settings'

let routerRef = null
export const setRouter = (r) => { routerRef = r }

// One WebSocket per open page. The server pushes what changed (extension, other browser, later the mobile app), so lists, progress and
// notifications update without a refresh. If the socket is down the app still works: it falls back to asking now and then (MainLayout).
// The messages are described in lecturekit-server/server/events.py (the mobile app must understand the same ones).
let socket = null
let retryTimer = null
let watchdog = null
let refreshTimer = null
let wanted = false
let tries = 0
let seenHello = false
let lastMessage = 0

const wsUrl = () => useSettingsStore().wsUrl
const TOAST = { recording_started: 'info', processing_started: 'info', notes_ready: 'positive', failed: 'negative', replay_ready: 'positive', deeper_ready: 'positive', deeper_failed: 'negative' }
const ICON = { recording_started: 'fiber_manual_record', processing_started: 'autorenew', notes_ready: 'check_circle', failed: 'error', replay_ready: 'movie', deeper_ready: 'travel_explore', deeper_failed: 'error' }

export const useRealtimeStore = defineStore('realtime', {
  state: () => ({ connected: false, syncTick: 0, jobs: {} }),
  actions: {
    start() {
      wanted = true
      if (socket || !useAuthStore().token) return
      this.open()
    },
    stop() {
      wanted = false
      clearTimeout(retryTimer)
      clearInterval(watchdog)
      if (socket) { try { socket.close() } catch { /* already closed */ } }
      socket = null
      this.connected = false
      this.jobs = {}
      seenHello = false
      tries = 0
    },
    open() {
      const auth = useAuthStore()
      let ws
      try { ws = new WebSocket(wsUrl()) } catch { return this.retry() }
      socket = ws
      ws.onopen = () => ws.send(JSON.stringify({ token: auth.token }))
      ws.onmessage = (e) => { lastMessage = Date.now(); this.handle(JSON.parse(e.data)) }
      ws.onclose = (e) => {
        if (socket === ws) socket = null
        this.connected = false
        clearInterval(watchdog)
        if (wanted && e.code !== 4401) this.retry()
      }
      ws.onerror = () => { /* onclose follows */ }
      lastMessage = Date.now()
      clearInterval(watchdog)
      watchdog = setInterval(() => { if (Date.now() - lastMessage > 70000) ws.close() }, 10000)       // the server pings every 25 s: silence means a dead connection
    },
    retry() {
      clearTimeout(retryTimer)
      const wait = [1, 2, 4, 8, 15, 30][Math.min(tries, 5)] * 1000
      tries += 1
      retryTimer = setTimeout(() => { if (wanted && !socket) this.open() }, wait)
    },
    // lists are fetched again, but not more than a few times a second
    refreshSoon() {
      clearTimeout(refreshTimer)
      refreshTimer = setTimeout(() => {
        useLibraryStore().refresh().catch(() => {})
        this.syncTick += 1
      }, 250)
    },
    handle(m) {
      const notes = useNotificationsStore()
      if (m.type === 'hello') {
        this.connected = true
        tries = 0
        if (seenHello) { this.refreshSoon(); notes.load() }            // we were away for a while: catch up
        seenHello = true
      } else if (m.type === 'sync') {
        this.refreshSoon()
      } else if (m.type === 'resync') {
        this.refreshSoon()
        notes.load()
      } else if (m.type === 'job') {
        this.jobs = { ...this.jobs, [m.session_id]: { kind: m.kind, stage: m.stage, percent: m.percent, message: m.message } }
      } else if (m.type === 'notification') {
        const n = m.notification
        notes.push(n)
        Notify.create({
          type: TOAST[n.kind] || 'info', icon: ICON[n.kind], message: n.title ? `${n.message}: ${n.title}` : n.message, timeout: 6000,
          actions: n.session_id ? [{ label: 'Open', color: 'white', handler: () => { notes.markRead(n.id); routerRef && routerRef.push(`/sessions/${n.session_id}`) } }] : [],
        })
      }
    },
  },
})
