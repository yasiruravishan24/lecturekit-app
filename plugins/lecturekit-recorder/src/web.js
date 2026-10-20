import { WebPlugin } from '@capacitor/core'

// The browser version: one MediaRecorder per part, with the same overlap rules as the native one. The phone app also uses it for the
// camera mode (picture and sound), because the native recorder is sound only. start({ video: true, facing: 'environment' }) records video parts.
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

  // the camera picture before recording starts (and the same stream is then recorded). facing: 'environment' (back) or 'user' (front)
  async preview(facing = 'environment') {
    this.stopPreview()
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 10, max: 15 } },
    })
    this.pre = stream
    return stream
  }

  stopPreview() {
    if (this.pre) this.pre.getTracks().forEach((t) => t.stop())
    this.pre = null
  }

  stream() { return (this.r && this.r.stream) || this.pre || null }

  async start({ chunkSeconds = 300, overlap = 5, folder = 'recording', video = false, facing = 'environment' } = {}) {
    if (this.r) throw new Error('A recording is already running')
    let stream = this.pre
    this.pre = null
    if (!video && stream) { stream.getTracks().forEach((t) => t.stop()); stream = null }
    if (!stream) stream = video ? await this.preview(facing).then((s) => { this.pre = null; return s }) : await navigator.mediaDevices.getUserMedia({ audio: true })
    const ctx = new AudioContext()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 1024
    ctx.createMediaStreamSource(stream).connect(analyser)
    const r = { stream, ctx, analyser, L: chunkSeconds, o: overlap, t: 0, last: performance.now(), paused: false, recorders: new Map(), started: new Set(), saved: [], folder, video }
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
    const mime = r.video ? ['video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'].find((m) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) : ''
    const mr = new MediaRecorder(r.stream, r.video ? { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 500000, audioBitsPerSecond: 64000 } : undefined)      // about 4 MB a minute
    const parts = []
    const startedAt = r.t
    mr.ondataavailable = (e) => { if (e.data && e.data.size) parts.push(e.data) }
    mr.onstop = () => {
      const blob = new Blob(parts, { type: mr.mimeType || (r.video ? 'video/webm' : 'audio/webm') })
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
