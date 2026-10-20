<template>
  <q-page class="lk-page">
    <!-- ready -->
    <template v-if="rec.phase === 'idle'">
      <div v-if="error" class="lk-error" role="alert">{{ error }}</div>
      <div v-if="library.loaded && !options.length" class="lk-info">You need a course and a module first. Add them on the My courses screen.</div>
      <pick-field v-model="courseId" :options="courseOptions" label="Course" class="q-mb-md" :disable="!courseOptions.length" />
      <pick-field v-model="moduleId" :options="moduleOptions" label="Module" class="q-mb-md" :disable="!moduleOptions.length" />
      <div v-if="courseId && !moduleOptions.length" class="lk-meta q-mb-md">This course has no module yet. Add one on the Courses screen.</div>

      <q-input v-model="title" outlined label="Lecture title" maxlength="160" class="q-mb-md" />
      <q-btn-toggle v-model="camera" spread unelevated no-caps toggle-color="primary" color="white" text-color="grey-8" class="lk-mode q-mb-md"
                    :options="[{ label: 'Sound only', value: false, icon: 'mic' }, { label: 'Camera + sound', value: true, icon: 'videocam' }]" />
      <div v-if="camera" class="lk-cam q-mb-md">
        <video :ref="setVideo" muted playsinline autoplay />
        <q-btn round dense unelevated color="grey-9" icon="cameraswitch" aria-label="Switch camera" class="lk-flip" @click="flip" />
        <div v-if="camError" class="lk-cam-msg">{{ camError }}</div>
      </div>
      <q-card flat class="lk-card q-mb-md">
        <q-item clickable @click="pick">
          <q-item-section avatar><q-icon name="slideshow" color="primary" size="28px" /></q-item-section>
          <q-item-section>
            <q-item-label>Lecture slides</q-item-label>
            <q-item-label caption>{{ slideText }}</q-item-label>
          </q-item-section>
          <q-item-section side><span class="text-primary text-weight-medium">{{ rec.slides.length ? 'CHANGE' : 'ADD' }}</span></q-item-section>
        </q-item>
      </q-card>
      <div class="lk-meta q-mb-md"><q-icon name="info" size="16px" />
        <template v-if="camera"> Point the camera at the board or screen. Keep this screen open and the phone still: the camera stops if you leave the app or lock the phone. Record only where the lecturer agrees.</template>
        <template v-else> Record only where the lecturer agrees. Keep the phone near the lecturer; you can lock the screen while it records.</template>
      </div>
      <q-btn unelevated color="negative" size="lg" no-caps :icon="camera ? 'videocam' : 'center_focus_strong'" label="Start recording" class="full-width" :loading="starting" :disable="!moduleId" @click="start" />
      <div class="text-center q-mt-lg"><span class="lk-meta">Already have a recording?</span> <router-link :to="{ path: '/upload', query: moduleId ? { module: moduleId } : {} }" class="lk-link">Upload it</router-link></div>
    </template>

    <!-- recording -->
    <template v-else-if="rec.active">
      <div class="lk-meta">{{ where }}</div>
      <div class="lk-section-title q-mb-sm">{{ rec.title }}</div>
      <div class="lk-panel" :class="[rec.phase, { cam: rec.camera }]">
        <div class="lk-panel-top"><span class="dot" /> {{ rec.phase === 'paused' ? 'PAUSED' : rec.phase === 'interrupted' ? 'INTERRUPTED' : 'REC' }} {{ rec.clockText(rec.seconds) }}</div>
        <video v-if="rec.camera" :ref="setVideo" class="lk-rec-video" muted playsinline autoplay />
        <div class="lk-bars" :class="{ small: rec.camera }" aria-hidden="true"><span v-for="(h, i) in bars" :key="i" :style="{ height: (rec.camera ? Math.round(h / 3) : h) + 'px' }" /></div>
        <div class="lk-panel-note">{{ levelText }}</div>
      </div>
      <div v-if="rec.notice" class="lk-info q-mt-md" role="status">{{ rec.notice }}</div>
      <div v-if="rec.error" class="lk-error q-mt-md" role="alert">{{ rec.error }}</div>
      <div class="lk-meta text-center q-my-md">{{ rec.camera ? 'Keep this screen open: the camera stops if you leave the app or lock the phone.' : 'Keep the phone near the lecturer. You can lock the screen; recording continues.' }}</div>
      <div class="lk-controls">
        <q-btn flat round size="lg" :icon="rec.phase === 'recording' ? 'pause' : 'play_arrow'" :aria-label="rec.phase === 'recording' ? 'Pause' : 'Resume'" @click="rec.phase === 'recording' ? rec.pause() : rec.resume()" />
        <q-btn round size="xl" color="negative" icon="stop" aria-label="Stop" class="lk-stop" @click="confirmStop" />
        <span class="lk-spacer" />
      </div>
      <q-card flat class="lk-card q-mb-md">
        <q-item clickable @click="pick">
          <q-item-section avatar><q-icon name="slideshow" color="primary" size="28px" /></q-item-section>
          <q-item-section><q-item-label>Lecture slides</q-item-label><q-item-label caption>{{ slideText }}</q-item-label></q-item-section>
          <q-item-section side><span class="text-primary text-weight-medium">{{ rec.slides.length ? 'CHANGE' : 'ADD' }}</span></q-item-section>
        </q-item>
      </q-card>
      <q-btn unelevated color="primary" size="lg" no-caps icon="cloud_upload" label="Stop and generate notes" class="full-width" @click="confirmStop" />
    </template>

    <!-- stopping, sending, processing, done, failed -->
    <template v-else>
      <!-- done -->
      <q-card v-if="rec.phase === 'done'" flat class="lk-card lk-after">
        <div class="lk-hero-ico ok"><q-icon name="check" size="46px" /></div>
        <div class="lk-after-title">Notes are ready</div>
        <div class="lk-meta q-mb-lg">{{ rec.title }}</div>
        <q-btn unelevated color="primary" no-caps size="lg" icon="description" class="full-width" label="Open notes" :to="`/sessions/${rec.sessionId}`" @click="rec.reset()" />
        <q-btn flat no-caps color="primary" class="full-width q-mt-sm" label="Record another lecture" @click="rec.reset()" />
      </q-card>

      <!-- saved for tomorrow -->
      <q-card v-else-if="rec.phase === 'limit'" flat class="lk-card lk-after">
        <div class="lk-hero-ico warn"><q-icon name="event" size="42px" /></div>
        <div class="lk-after-title">Saved for tomorrow</div>
        <div class="lk-callout warn q-my-md"><q-icon name="info" size="20px" /><span>{{ rec.error }}</span></div>
        <div class="lk-meta q-mb-lg">Your recording is on the server. Open the lecture and press "Finish and make notes" when you can.</div>
        <q-btn unelevated color="primary" no-caps size="lg" class="full-width" label="Open the lecture" :to="`/sessions/${rec.sessionId}`" @click="rec.reset()" />
      </q-card>

      <!-- failed -->
      <q-card v-else-if="rec.phase === 'failed'" flat class="lk-card lk-after">
        <div class="lk-hero-ico bad"><q-icon name="error_outline" size="44px" /></div>
        <div class="lk-after-title">Something went wrong</div>
        <div class="lk-callout bad q-my-md" role="alert"><q-icon name="error" size="20px" /><span>{{ rec.error }}</span></div>
        <div class="lk-meta q-mb-lg">Your recording is safe on this phone.</div>
        <q-btn v-if="rec.total" unelevated color="primary" no-caps size="lg" icon="refresh" class="full-width" label="Try again" @click="rec.finish()" />
        <q-btn flat no-caps color="negative" class="full-width q-mt-sm" label="Discard this recording" @click="confirmDiscard" />
      </q-card>

      <!-- saving, sending, making notes -->
      <q-card v-else flat class="lk-card lk-after">
        <div class="lk-hero-ico" :class="trouble ? 'warn' : 'blue'"><q-icon :name="heroIcon" size="44px" /></div>
        <div class="lk-after-title">{{ heading }}</div>
        <div class="lk-meta">{{ rec.title }}</div>

        <div class="lk-pct q-mt-md">
          <q-linear-progress rounded size="10px" :value="progress" :indeterminate="rec.phase === 'stopping'" :color="trouble ? 'warning' : 'primary'" :track-color="$q.dark.isActive ? 'blue-grey-9' : 'blue-1'" />
          <div class="lk-pct-row"><span>{{ sendText }}</span><b v-if="rec.phase !== 'stopping'">{{ Math.round(progress * 100) }}%</b></div>
        </div>

        <ol class="lk-steps2">
          <li v-for="(s, i) in steps" :key="s.label" :class="{ done: i < stepNow, now: i === stepNow }">
            <span class="lk-dotn"><q-icon v-if="i < stepNow" name="check" size="16px" /><template v-else>{{ i + 1 }}</template></span>
            <span class="lk-steptxt"><span class="lk-steptitle">{{ s.label }}</span><span v-if="i === stepNow" class="lk-stepnote">{{ s.note }}</span></span>
          </li>
        </ol>

        <div v-if="rec.paused401" class="lk-callout warn"><q-icon name="lock" size="20px" /><span>Log in again to continue sending.</span></div>
        <div v-else-if="rec.waiting === 'wifi'" class="lk-callout info"><q-icon name="wifi" size="20px" /><span>Waiting for Wi-Fi. <a class="lk-link" @click="sendNow">Send now on mobile data</a></span></div>
        <div v-else-if="rec.retryIn" class="lk-callout warn">
          <q-icon name="cloud_off" size="20px" />
          <span><b>Can't reach the server right now.</b> Trying again in {{ rec.retryIn }} s. Check that the phone is online and the server is running.<span v-if="rec.lastError" class="lk-reason"> ({{ rec.lastError }})</span></span>
        </div>

        <div class="lk-safe"><q-icon name="lock" size="16px" /> Your recording is saved on this phone until it has been sent.</div>
        <q-btn outline no-caps color="primary" class="full-width q-mt-md" icon="home" label="Leave this screen" to="/" />
      </q-card>
    </template>
  </q-page>
</template>

<script setup>
import PickField from '../components/PickField.vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute } from 'vue-router'
import { useLibraryStore } from '../stores/library'
import { cameraRecorder, useRecordingStore } from '../stores/recording'
import { useSettingsStore } from '../stores/settings'
import { pickSlides } from '../recording/files'
import { friendly } from '../util/errors'
import { formatSize } from '../util/format'
import { stageText } from '../util/stages'

const $q = useQuasar()
const route = useRoute()
const library = useLibraryStore()
const rec = useRecordingStore()
const settings = useSettingsStore()
const error = ref('')
const camera = ref(false)
const facing = ref('environment')
const camError = ref('')
let videoEl = null
const setVideo = (el) => { videoEl = el; attach() }
function attach() {
  if (!videoEl) return
  const s = cameraRecorder().stream()
  if (s && videoEl.srcObject !== s) videoEl.srcObject = s
}
async function openPreview() {
  camError.value = ''
  try { await cameraRecorder().preview(facing.value); await nextTick(); attach() } catch (e) { camError.value = 'The camera or microphone is off. Turn them on for Lecture Assistant in the phone Settings.' }
}
watch(camera, (on) => { if (on) openPreview(); else cameraRecorder().stopPreview() })
function flip() { facing.value = facing.value === 'environment' ? 'user' : 'environment'; openPreview() }
function onHidden() { if (document.hidden && rec.active && rec.camera) rec.notice = 'The camera stops when the app is in the background. Come back to this screen to carry on.' }
onMounted(() => document.addEventListener('visibilitychange', onHidden))
onBeforeUnmount(() => { document.removeEventListener('visibilitychange', onHidden); if (!rec.active) cameraRecorder().stopPreview() })
const starting = ref(false)
const moduleId = ref(Number(route.query.module) || null)
const stamp = new Date()
const title = ref(`Lecture ${stamp.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][stamp.getMonth()]} ${String(stamp.getHours()).padStart(2, '0')}:${String(stamp.getMinutes()).padStart(2, '0')}`)

const options = computed(() => library.courses.flatMap((c) => c.modules.map((m) => ({ label: `${c.name} › ${m.name}`, value: m.id }))))
const courseId = ref(null)
const courseOptions = computed(() => library.courses.map((c) => ({ label: c.name, value: c.id })))
const moduleOptions = computed(() => ((library.courses.find((c) => c.id === courseId.value) || {}).modules || []).map((m) => ({ label: m.name, value: m.id })))
// the course follows the module that was asked for (a link from a module page); else the first course
watch(() => library.courses, (cs) => {
  if (!cs.length) return
  if (courseId.value == null) courseId.value = (cs.find((c) => c.modules.some((m) => m.id === moduleId.value)) || cs[0]).id
}, { immediate: true })
watch(courseId, () => { if (!moduleOptions.value.some((m) => m.value === moduleId.value)) moduleId.value = moduleOptions.value.length ? moduleOptions.value[0].value : null }, { immediate: true })
const where = computed(() => (options.value.find((o) => o.value === rec.moduleId) || {}).label || '')
const slideText = computed(() => (rec.slides.length ? rec.slides.map((s) => `${s.name}${s.size ? ` · ${formatSize(s.size)}` : ''}`).join(', ') : '(optional) PDF or PowerPoint'))

// the sound level as bars: the newest on the right
const history = ref(Array(24).fill(-80))
watch(() => rec.level, (db) => { history.value = [...history.value.slice(1), db] })
const bars = computed(() => history.value.map((db) => Math.round(6 + Math.max(0, (db + 70) / 70) * 90)))
const levelText = computed(() => (rec.phase === 'paused' ? 'Paused' : rec.phase === 'interrupted' ? 'Not recording' : rec.quietFor > 30 ? 'Sound is very low. Move the phone closer to the lecturer.' : rec.level < -55 ? 'Sound is low' : 'Sound level is good'))

const progress = computed(() => {
  if (rec.phase === 'processing') return Math.max(0.05, ((rec.job && rec.job.percent) || 0) / 100)
  return rec.total ? rec.sent / rec.total : 0
})
const trouble = computed(() => !!(rec.retryIn || rec.paused401))
const heroIcon = computed(() => (trouble.value ? 'cloud_off' : rec.phase === 'processing' ? 'auto_awesome' : rec.phase === 'stopping' ? 'save' : 'cloud_upload'))
const heading = computed(() => (rec.phase === 'processing' ? 'Making your notes' : rec.phase === 'stopping' ? 'Saving your recording' : trouble.value ? 'Waiting to send' : 'Sending to the server'))
const stepNow = computed(() => (rec.phase === 'stopping' ? 0 : rec.phase === 'sending' ? 1 : 2))
const steps = computed(() => [
  { label: 'Saved on this phone', note: 'Finishing the last part' },
  { label: 'Sent to the server', note: `${rec.sent} of ${rec.total} parts sent` },
  { label: 'Notes and quiz made', note: stageText(rec.job && rec.job.stage) },
])
const sendText = computed(() => {
  if (rec.phase === 'stopping') return 'Finishing the recording'
  if (rec.phase === 'processing') return stageText(rec.job && rec.job.stage)
  if (rec.paused401) return 'Log in again to continue sending.'
  return `${rec.sent} of ${rec.total} parts sent`
})

async function pick() {
  try {
    const files = await pickSlides()
    if (files.length) rec.slides = files
  } catch (e) { if (!/cancel/i.test(String(e && e.message))) error.value = friendly(e) }
}

async function start() {
  error.value = ''
  starting.value = true
  try {
    await rec.start({ moduleId: moduleId.value, title: title.value.trim() || 'Lecture', slides: rec.slides, camera: camera.value, facing: facing.value })
    await nextTick()
    attach()
  } catch (e) {
    error.value = e.message || friendly(e)
  } finally {
    starting.value = false
  }
}

function confirmStop() {
  $q.dialog({ title: 'Stop and generate notes?', message: 'The recording ends and is sent to the server. Notes and a quiz are made from it.', cancel: { label: 'Keep recording', flat: true }, ok: { label: 'Stop', color: 'negative', unelevated: true }, persistent: true })
    .onOk(() => rec.stop())
}
function confirmDiscard() {
  $q.dialog({ title: 'Discard this recording?', message: 'It cannot be recovered.', cancel: true, ok: { label: 'Discard', color: 'negative', unelevated: true }, persistent: true }).onOk(() => rec.discard())
}
async function sendNow() { await settings.setWifiOnly(false); rec.kick() }
</script>

<style scoped>
.lk-panel { background: var(--lk-rec); color: #cfd8dc; border-radius: 8px; padding: 16px; min-height: 260px; display: flex; flex-direction: column; }
.lk-panel-top { color: #ff5252; font-weight: 500; letter-spacing: 0.05em; display: flex; align-items: center; gap: 8px; }
.lk-panel.paused .lk-panel-top, .lk-panel.interrupted .lk-panel-top { color: #ffd54f; }
.dot { width: 9px; height: 9px; border-radius: 50%; background: currentColor; }
.lk-panel.recording .dot { animation: lk-blink 1.4s infinite; }
@keyframes lk-blink { 50% { opacity: 0.25; } }
.lk-bars { flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px; min-height: 120px; }
.lk-bars span { width: 6px; border-radius: 3px; background: #5aa5f0; transition: height 0.15s; }
.lk-panel-note { text-align: center; font-size: 14px; }
.lk-mode { border: 1px solid var(--lk-border); border-radius: 8px; background: var(--lk-surface); }
.lk-cam { position: relative; background: #000; border-radius: 12px; overflow: hidden; aspect-ratio: 16 / 10; }
.lk-cam video, .lk-rec-video { width: 100%; height: 100%; object-fit: cover; display: block; }
.lk-flip { position: absolute; right: 10px; bottom: 10px; opacity: 0.85; }
.lk-cam-msg { position: absolute; inset: 0; display: grid; place-items: center; padding: 16px; text-align: center; color: #fff; font-size: 13px; background: rgba(0, 0, 0, 0.6); }
.lk-panel.cam { min-height: 0; padding: 12px; }
.lk-rec-video { margin: 10px 0; border-radius: 8px; aspect-ratio: 16 / 10; background: #000; }
.lk-bars.small { flex: none; min-height: 36px; }
.lk-controls { display: flex; align-items: center; justify-content: space-between; padding: 0 12px; margin-bottom: 16px; }
.lk-spacer { width: 48px; }
.lk-stop { width: 84px; height: 84px; }
.lk-after { padding: 24px 18px 18px; text-align: center; }
.lk-hero-ico { width: 84px; height: 84px; border-radius: 50% !important; display: grid; place-items: center; margin: 0 auto 14px; }
.lk-hero-ico.blue { background: var(--lk-tint); color: var(--lk-primary); }
.lk-hero-ico.ok { background: rgba(33, 186, 69, 0.16); color: var(--lk-positive); }
.lk-hero-ico.warn { background: rgba(242, 192, 55, 0.2); color: #b26a00; }
.lk-hero-ico.bad { background: rgba(193, 0, 21, 0.12); color: var(--lk-negative); }
.lk-after-title { font-size: 21px; font-weight: 600; letter-spacing: -0.01em; }
.lk-pct { text-align: left; }
.lk-pct-row { display: flex; justify-content: space-between; gap: 12px; margin-top: 6px; font-size: 13px; color: var(--lk-text-2); }
.lk-pct-row b { color: var(--lk-text); }
.lk-steps2 { list-style: none; margin: 20px 0 14px; padding: 0; text-align: left; display: flex; flex-direction: column; gap: 14px; }
.lk-steps2 li { display: flex; gap: 12px; align-items: flex-start; color: var(--lk-text-2); }
.lk-dotn { flex: none; width: 28px; height: 28px; border-radius: 50%; border: 1.5px solid var(--lk-border); display: grid; place-items: center; font-size: 13px; font-weight: 600; }
.lk-steps2 li.now { color: var(--lk-text); } .lk-steps2 li.now .lk-dotn { border-color: var(--lk-primary); color: var(--lk-primary); background: var(--lk-tint); }
.lk-steps2 li.done .lk-dotn { background: var(--lk-positive); border-color: var(--lk-positive); color: #fff; }
.lk-steptxt { display: flex; flex-direction: column; padding-top: 3px; }
.lk-steptitle { font-weight: 500; }
.lk-stepnote { font-size: 13px; color: var(--lk-text-2); margin-top: 2px; }
.lk-callout { display: flex; gap: 10px; align-items: flex-start; text-align: left; border-radius: 12px; padding: 12px 14px; font-size: 14px; line-height: 1.5; margin-bottom: 12px; }
.lk-callout .q-icon { flex: none; margin-top: 2px; }
.lk-callout.warn { background: rgba(242, 192, 55, 0.16); border: 1px solid rgba(242, 192, 55, 0.6); }
.lk-callout.bad { background: rgba(193, 0, 21, 0.1); color: var(--lk-negative); }
.lk-callout.info { background: var(--lk-tint); color: var(--lk-link); }
.lk-reason { color: var(--lk-text-2); word-break: break-word; }
.lk-safe { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 12.5px; color: var(--lk-text-2); }
@media (prefers-reduced-motion: reduce) { .lk-panel.recording .dot, .lk-bars span { animation: none; transition: none; } }
</style>
