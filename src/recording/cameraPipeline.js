// The camera picture goes through a canvas before it is recorded. That lets the app (which stays portrait) turn the picture to match how the
// phone is held, and zoom in. What is on the canvas is what is shown and what is recorded.

const FPS = 15
const MAX_SIDE = 1280

// angle: how the phone is held (0 upright, 90 turned clockwise, -90 turned counter-clockwise, 180 upside down)
export const snapAngle = (angle) => { const a = ((Math.round(angle / 90) * 90) % 360 + 360) % 360; return a === 270 ? -90 : a }

// how much to turn a picture of the given shape so it looks upright for the way the phone is held
export function rotationFor(snap, streamLandscape) {
  const holdLandscape = snap === 90 || snap === -90
  if (holdLandscape === streamLandscape) return snap === 180 ? 180 : 0              // already the right shape
  return holdLandscape ? snap : 90                                                    // a portrait picture, phone on its side: turn it; and the other way round
}

export async function createCameraPipeline(raw) {
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.srcObject = new MediaStream(raw.getVideoTracks())
  await video.play().catch(() => {})
  if (!video.videoWidth) await new Promise((r) => { video.onloadedmetadata = r; setTimeout(r, 2000) })

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const state = { hold: 0, offset: 0, zoom: 1, locked: false, rot: 0 }
  const listeners = new Set()
  const notify = () => listeners.forEach((f) => f({ rot: state.rot, zoom: state.zoom, hold: state.hold, offset: state.offset }))

  function layout() {
    const vw = video.videoWidth || 640
    const vh = video.videoHeight || 480
    const rot = (((rotationFor(snapAngle(state.hold), vw > vh) + state.offset) % 360) + 360) % 360
    const swap = rot % 180 !== 0
    const w = swap ? vh : vw
    const h = swap ? vw : vh
    const k = Math.min(1, MAX_SIDE / Math.max(w, h))
    return { vw, vh, rot, swap, W: Math.round(w * k), H: Math.round(h * k) }
  }

  let lay = layout()
  function draw() {
    if (!state.locked) {                                             // while recording the shape must not change
      const next = layout()
      if (next.W !== lay.W || next.H !== lay.H || next.rot !== lay.rot) {
        lay = next
        state.rot = next.rot
        canvas.width = lay.W                                         // the canvas has its new shape before anyone is told
        canvas.height = lay.H
        notify()
      }
    }
    if (canvas.width !== lay.W || canvas.height !== lay.H) { canvas.width = lay.W; canvas.height = lay.H }
    const { vw, vh, rot, swap, W, H } = lay
    const sw = vw / state.zoom
    const sh = vh / state.zoom
    ctx.save()
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, W, H)
    ctx.translate(W / 2, H / 2)
    ctx.rotate((rot * Math.PI) / 180)
    const dw = swap ? H : W
    const dh = swap ? W : H
    ctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, -dw / 2, -dh / 2, dw, dh)
    ctx.restore()
  }
  draw()
  const timer = setInterval(draw, 1000 / FPS)
  state.rot = lay.rot

  const stream = new MediaStream([...canvas.captureStream(FPS).getVideoTracks(), ...raw.getAudioTracks()])

  return {
    canvas,
    stream,
    get rot() { return state.rot },
    get zoom() { return state.zoom },
    setHold(angle) { state.hold = angle },
    setZoom(z) { state.zoom = Math.max(1, Math.min(4, z)); notify() },
    turn() { state.offset = (state.offset + 90) % 360; notify() },        // "the picture looks wrong": turn it a quarter more
    lock() { state.locked = true },
    unlock() { state.locked = false },
    onChange(f) { listeners.add(f); return () => listeners.delete(f) },
    destroy() {
      clearInterval(timer)
      video.srcObject = null
      raw.getTracks().forEach((t) => t.stop())
      stream.getTracks().forEach((t) => t.stop())
    },
  }
}
