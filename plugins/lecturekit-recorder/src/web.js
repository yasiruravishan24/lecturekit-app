import { WebPlugin } from '@capacitor/core'

// The browser version: one MediaRecorder per part, with the same overlap rules as the native one. For development and tests only.
const active = (t, L, o) => {
  const base = Math.floor(t / L)
  return [base, base + 1].filter((k) => k >= 0 && Math.max(0, k * L - o) <= t && t < (k + 1) * L)
}

export class LectureRecorderWeb extends WebPlugin {
  async checkPermission() {
    try { const r = await navigator.permissions.query({ name: 'microphone' }); return { status: r.state } } catch { return { status: 'prompt' } }
  }

  async requestPermission() {
    try { (await navigator.mediaDevices.getUserMedia({ audio: true })).getTracks().forEach((t) => t.stop()); return { status: 'granted' } } catch { return { status: 'denied' } }
  }

  async freeSpace() { return { bytes: 10 * 1024 * 1024 * 1024 } }

  async start({ chunkSeconds = 300, overlap = 5, folder = 'recording' } = {}) {
    if (this.r) throw new Error('A recording is already running')
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const ctx = new AudioContext()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 1024
    ctx.createMediaStreamSource(stream).connect(analyser)
    const r = { stream, ctx, analyser, L: chunkSeconds, o: overlap, t: 0, last: performance.now(), paused: false, recorders: new Map(), started: new Set(), saved: [], folder }
    this.r = r
    r.timer = setInterval(() => this.tick(), 200)
    this.tick()
    this.notifyListeners('state', { state: 'recording' })
    return { folder }
  }

  tick() {
    const r = this.r
    if (!r) return
    const now = performance.now()
    if (!r.paused) r.t += (now - r.last) / 1000
    r.last = now
    const want = new Set(active(r.t, r.L, r.o))
    for (const k of want) if (!r.started.has(k)) this.open(k)
    for (const k of [...r.recorders.keys()]) if (!want.has(k)) this.close(k)
    const buf = new Float32Array(r.analyser.fftSize)
    r.analyser.getFloatTimeDomainData(buf)
    const rms = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length)
    this.notifyListeners('level', { db: rms > 0 ? Math.max(-80, 20 * Math.log10(rms)) : -80, seconds: r.t })
  }

  open(k) {
    const r = this.r
    const mr = new MediaRecorder(r.stream)
    const parts = []
    const startedAt = r.t
    mr.ondataavailable = (e) => { if (e.data && e.data.size) parts.push(e.data) }
    mr.onstop = () => {
      const blob = new Blob(parts, { type: mr.mimeType || 'audio/webm' })
      const part = { index: k, path: null, url: URL.createObjectURL(blob), seconds: Math.max(0, r.t - startedAt), type: blob.type }
      r.saved.push(part)
      this.notifyListeners('chunk', part)
      if (r.stopWaiters) r.stopWaiters.forEach((f) => f())
    }
    mr.start(1000)
    if (r.paused) mr.pause()
    r.recorders.set(k, mr)
    r.started.add(k)
  }

  close(k) {
    const mr = this.r.recorders.get(k)
    if (mr && mr.state !== 'inactive') mr.stop()
    this.r.recorders.delete(k)
  }

  async pause() {
    this.tick()
    this.r.paused = true
    this.r.recorders.forEach((mr) => mr.state === 'recording' && mr.pause())
    this.notifyListeners('state', { state: 'paused' })
  }

  async resume() {
    this.r.paused = false
    this.r.last = performance.now()
    this.r.recorders.forEach((mr) => mr.state === 'paused' && mr.resume())
    this.notifyListeners('state', { state: 'recording' })
  }

  async stop() {
    const r = this.r
    if (!r) return { seconds: 0, parts: [] }
    this.tick()
    clearInterval(r.timer)
    const open = [...r.recorders.keys()]
    const done = new Promise((resolve) => {
      let left = open.length
      if (!left) resolve()
      r.stopWaiters = [() => { left -= 1; if (left <= 0) resolve() }]
    })
    open.forEach((k) => this.close(k))
    await done
    r.stream.getTracks().forEach((t) => t.stop())
    r.ctx.close().catch(() => {})
    this.r = null
    this.notifyListeners('state', { state: 'stopped' })
    return { seconds: r.t, parts: r.saved, folder: r.folder }
  }

  async status() {
    const r = this.r
    return r ? { state: r.paused ? 'paused' : 'recording', seconds: r.t, parts: r.saved, folder: r.folder } : { state: 'idle', seconds: 0, parts: [] }
  }
}
