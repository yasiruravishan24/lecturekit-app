<template>
  <teleport to="body">
    <div class="lk-stage" role="dialog" aria-label="Camera">
      <div ref="host" class="lk-stage-view" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up" />
      <div v-if="grid" class="lk-stage-grid" aria-hidden="true"><i /><i /><b /><b /></div>
      <div v-if="level && tilt.ok" class="lk-stage-level" :style="{ transform: `translate(-50%, -50%) rotate(${uiRot}deg)` }"><level-guide :roll="tilt.roll" :pitch="tilt.pitch" /></div>
      <div v-if="message" class="lk-stage-msg">{{ message }}</div>

      <!-- top -->
      <div class="lk-stage-top">
        <button type="button" class="lk-round" :disabled="rec.active" aria-label="Close the camera" @click="$emit('close')"><q-icon name="close" size="24px" :style="iconTurn" /></button>
        <div v-if="rec.active" class="lk-stage-rec" :class="recClass"><span class="dot" :class="{ off: rec.phase !== 'recording' }" /> {{ rec.phase === 'paused' ? 'PAUSED' : 'REC' }} {{ rec.clockText(rec.seconds) }}</div>
        <div v-else-if="uiRot === 0" class="lk-stage-hint">Hold the phone the way you want to record</div>
        <div v-else class="lk-stage-hint" />
        <button type="button" class="lk-round" :disabled="rec.active" aria-label="Switch camera" @click="$emit('flip')"><q-icon name="cameraswitch" size="24px" :style="iconTurn" /></button>
      </div>

      <!-- bottom -->
      <div class="lk-stage-bottom">
        <div class="lk-zoom" role="group" aria-label="Zoom">
          <button v-for="z in [1, 2, 3]" :key="z" type="button" :class="{ on: Math.abs(zoom - z) < 0.15 }" @click="setZoom(z)"><span :style="iconTurn">{{ z }}×</span></button>
          <span v-if="![1, 2, 3].some((z) => Math.abs(zoom - z) < 0.15)" class="lk-zoom-now"><span :style="iconTurn">{{ zoom.toFixed(1) }}×</span></span>
        </div>
        <div v-if="!rec.active && diag" class="lk-diag">{{ diag }}</div>
        <div class="lk-stage-row">
          <div class="lk-slot">
            <button v-if="!rec.active" type="button" class="lk-round" aria-label="Turn the picture a quarter" @click="pipeline && pipeline.turn()"><q-icon name="screen_rotation" size="24px" :style="iconTurn" /></button>
            <button v-else type="button" class="lk-round" :aria-label="rec.phase === 'recording' ? 'Pause' : 'Resume'" @click="$emit('pause')"><q-icon :name="rec.phase === 'recording' ? 'pause' : 'play_arrow'" size="28px" :style="iconTurn" /></button>
          </div>
          <button v-if="!rec.active" type="button" class="lk-rec-big" aria-label="Start recording" :disabled="!ready || starting" @click="$emit('record', pipeline)"><span /></button>
          <button v-else type="button" class="lk-rec-big on" aria-label="Stop" @click="$emit('stop')"><span /></button>
          <div class="lk-slot right"><div class="lk-pair">
            <button type="button" class="lk-round small" :class="{ lit: level }" :aria-pressed="level" aria-label="Level" @click="$emit('update:level', !level)"><q-icon name="straighten" size="20px" :style="iconTurn" /></button>
            <button type="button" class="lk-round small" :class="{ lit: grid }" :aria-pressed="grid" aria-label="Grid" @click="$emit('update:grid', !grid)"><q-icon name="grid_on" size="19px" :style="iconTurn" /></button>
          </div></div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { createCameraPipeline, snapAngle } from '../recording/cameraPipeline'
import { cameraRecorder, useRecordingStore } from '../stores/recording'
import LevelGuide from './LevelGuide.vue'

// The full-screen camera. The app stays portrait; the picture (and the recording) is turned to match how the phone is held, so a phone on its
// side records a landscape video. The buttons turn too, so they stay readable.
const props = defineProps({ facing: { type: String, default: 'environment' }, level: Boolean, grid: Boolean, tilt: { type: Object, default: () => ({ ok: false, roll: 0, pitch: 0, angle: 0 }) }, starting: Boolean })
defineEmits(['close', 'flip', 'record', 'stop', 'pause', 'update:level', 'update:grid'])
const rec = useRecordingStore()
const host = ref(null)
const message = ref('')
const ready = ref(false)
const zoom = ref(1)
const picRot = ref(0)
let pipeline = null
let off = null

const uiRot = computed(() => -snapAngle(props.tilt.angle || 0))                    // buttons and text turn back to upright for the person holding the phone
const iconTurn = computed(() => ({ transform: `rotate(${uiRot.value}deg)`, transition: 'transform 0.2s' }))
const diag = ref('')
// the timer pill is laid out the way the person reads it: sideways it becomes a tall pill with the text running down (or up), so nothing is cut off
const recClass = computed(() => (uiRot.value === 90 ? 'down' : uiRot.value === -90 ? 'up' : uiRot.value === 180 || uiRot.value === -180 ? 'flip' : ''))
function fit() {
  if (!pipeline || !host.value) return
  const c = pipeline.canvas
  const cw = host.value.clientWidth
  const ch = host.value.clientHeight
  const a = c.width / c.height
  const snap = snapAngle(props.tilt.angle || 0)
  const sideways = snap === 90 || snap === -90
  let w
  let h
  if (sideways) { h = Math.min(cw, ch / a); w = h * a } else { w = Math.min(cw, ch * a); h = w / a }
  Object.assign(c.style, { width: `${w}px`, height: `${h}px`, transform: `translate(-50%, -50%) rotate(${-snap}deg)` })
  diag.value = `picture ${c.width}×${c.height} · phone ${snap}° · turned ${picRot.value}°`
}

async function open() {
  ready.value = false
  message.value = ''
  try {
    const raw = await cameraRecorder().preview(props.facing)
    pipeline = await createCameraPipeline(raw)
    pipeline.canvas.className = 'lk-stage-canvas'
    host.value.innerHTML = ''
    host.value.appendChild(pipeline.canvas)
    off = pipeline.onChange((s) => { zoom.value = s.zoom; picRot.value = s.rot; fit() })
    zoom.value = pipeline.zoom
    picRot.value = pipeline.rot
    pipeline.setHold(props.tilt.angle || 0)
    fit()
    ready.value = true
  } catch (e) {
    message.value = 'The camera or microphone is off. Turn them on for Lecture Assistant in the phone Settings.'
  }
}
function close() {
  if (off) off()
  off = null
  if (pipeline) pipeline.destroy()
  pipeline = null
  cameraRecorder().stopPreview()
}
onMounted(open)
onBeforeUnmount(close)
watch(() => props.facing, () => { if (!rec.active) { close(); open() } })
watch(() => props.tilt.angle, (a) => { if (pipeline) pipeline.setHold(a || 0); fit() })
onMounted(() => window.addEventListener('resize', fit))
onBeforeUnmount(() => window.removeEventListener('resize', fit))
const setZoom = (z) => pipeline && pipeline.setZoom(z)

// pinch to zoom
const pointers = new Map()
let startDist = 0
let startZoom = 1
const dist = () => { const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y) }
function down(e) { pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pointers.size === 2) { startDist = dist(); startZoom = zoom.value } }
function move(e) {
  if (!pointers.has(e.pointerId)) return
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  if (pointers.size === 2 && startDist > 0 && pipeline) pipeline.setZoom(startZoom * (dist() / startDist))
}
function up(e) { pointers.delete(e.pointerId) }

defineExpose({ get pipeline() { return pipeline } })
</script>

<style scoped>
.lk-stage { position: fixed; inset: 0; z-index: 5000; background: #000; color: #fff; touch-action: none; user-select: none; -webkit-user-select: none; }
.lk-stage-view { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.lk-stage-view { overflow: hidden; }
.lk-stage-view :deep(.lk-stage-canvas) { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); transform-origin: center; }
.lk-diag { font-size: 11px; opacity: 0.6; text-align: center; }
.lk-stage-grid { position: absolute; inset: 0; pointer-events: none; }
.lk-stage-grid i, .lk-stage-grid b { position: absolute; background: rgba(255, 255, 255, 0.28); }
.lk-stage-grid i { top: 0; bottom: 0; width: 1px; } .lk-stage-grid i:nth-child(1) { left: 33.3%; } .lk-stage-grid i:nth-child(2) { left: 66.6%; }
.lk-stage-grid b { left: 0; right: 0; height: 1px; } .lk-stage-grid b:nth-of-type(1) { top: 33.3%; } .lk-stage-grid b:nth-of-type(2) { top: 66.6%; }
.lk-stage-level { position: absolute; left: 50%; top: 50%; width: min(80vw, 60vh); height: min(80vw, 60vh); pointer-events: none; }
.lk-stage-msg { position: absolute; inset: 0; display: grid; place-items: center; padding: 24px; text-align: center; background: rgba(0, 0, 0, 0.7); }
.lk-stage-top { position: absolute; left: 0; right: 0; top: 0; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: calc(var(--lk-safe-top) + 10px) 14px 10px; background: linear-gradient(rgba(0, 0, 0, 0.55), transparent); }
.lk-stage-hint { flex: 1; text-align: center; font-size: 12.5px; opacity: 0.85; padding: 0 6px; }
.lk-stage-rec { display: inline-flex; align-items: center; gap: 8px; font-weight: 600; letter-spacing: 0.04em; background: rgba(0, 0, 0, 0.5); padding: 6px 12px; border-radius: 999px; }
.lk-stage-rec.down, .lk-stage-rec.up { writing-mode: vertical-rl; padding: 12px 6px; flex: none; }
.lk-stage-rec.up, .lk-stage-rec.flip { transform: rotate(180deg); }
.dot { flex: none; width: 10px; height: 10px; border-radius: 50%; background: #ff3b30; } .dot.off { background: #ffd54f; }
.lk-stage-bottom { position: absolute; left: 0; right: 0; bottom: 0; padding: 10px 20px calc(var(--lk-safe-bottom) + 18px); background: linear-gradient(transparent, rgba(0, 0, 0, 0.6)); display: flex; flex-direction: column; align-items: center; gap: 14px; }
.lk-zoom { display: inline-flex; gap: 6px; background: rgba(0, 0, 0, 0.45); border-radius: 999px; padding: 4px; align-items: center; }
.lk-zoom button { font: inherit; font-size: 13px; font-weight: 600; color: #fff; background: transparent; border: 0; width: 40px; height: 32px; border-radius: 999px; display: grid; place-items: center; padding: 0; }
.lk-zoom button span, .lk-zoom-now span { display: inline-block; }
.lk-zoom button.on { background: rgba(255, 213, 79, 0.95); color: #000; }
.lk-zoom-now { font-size: 13px; font-weight: 600; padding: 0 10px; color: #ffd54f; }
.lk-stage-row { width: 100%; max-width: 380px; display: flex; align-items: center; justify-content: space-between; }
.lk-round { width: 46px; height: 46px; border-radius: 50%; border: 0; display: grid; place-items: center; color: #fff; background: rgba(255, 255, 255, 0.18); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }
.lk-pair { display: flex; gap: 8px; }
.lk-slot { width: 96px; display: flex; align-items: center; }
.lk-slot.right { justify-content: flex-end; }
.lk-round.small { width: 40px; height: 40px; }
.lk-round:disabled { opacity: 0.35; } .lk-round.lit { background: rgba(255, 255, 255, 0.4); }
.lk-rec-big { width: 76px; height: 76px; border-radius: 50%; border: 4px solid #fff; background: transparent; display: grid; place-items: center; padding: 0; }
.lk-rec-big span { width: 58px; height: 58px; border-radius: 50%; background: #ff3b30; display: block; }
.lk-rec-big.on span { width: 30px; height: 30px; border-radius: 7px; }
.lk-rec-big:disabled { opacity: 0.4; }
</style>
