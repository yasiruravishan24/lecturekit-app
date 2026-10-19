<template>
  <q-page class="lk-page">
    <!-- ready -->
    <template v-if="rec.phase === 'idle'">
      <div v-if="error" class="lk-error" role="alert">{{ error }}</div>
      <div v-if="library.loaded && !options.length" class="lk-info">You need a course and a module first. Add them on the My courses screen.</div>
      <q-select v-model="moduleId" :options="options" emit-value map-options outlined label="Course and module" class="q-mb-md" :disable="!options.length" />
      <q-input v-model="title" outlined label="Lecture title" maxlength="160" class="q-mb-md" />
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
      <div class="lk-meta q-mb-md"><q-icon name="info" size="16px" /> Record only where the lecturer agrees. Keep the phone near the lecturer; you can lock the screen while it records.</div>
      <q-btn unelevated color="negative" size="lg" no-caps icon="mic" label="Start recording" class="full-width" :loading="starting" :disable="!moduleId" @click="start" />
    </template>

    <!-- recording -->
    <template v-else-if="rec.active">
      <div class="lk-meta">{{ where }}</div>
      <div class="lk-section-title q-mb-sm">{{ rec.title }}</div>
      <div class="lk-panel" :class="rec.phase">
        <div class="lk-panel-top"><span class="dot" /> {{ rec.phase === 'paused' ? 'PAUSED' : rec.phase === 'interrupted' ? 'INTERRUPTED' : 'REC' }} {{ rec.clockText(rec.seconds) }}</div>
        <div class="lk-bars" aria-hidden="true"><span v-for="(h, i) in bars" :key="i" :style="{ height: h + 'px' }" /></div>
        <div class="lk-panel-note">{{ levelText }}</div>
      </div>
      <div v-if="rec.notice" class="lk-info q-mt-md" role="status">{{ rec.notice }}</div>
      <div v-if="rec.error" class="lk-error q-mt-md" role="alert">{{ rec.error }}</div>
      <div class="lk-meta text-center q-my-md">Keep the phone near the lecturer. You can lock the screen; recording continues.</div>
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
      <q-card flat class="lk-card lk-after">
        <template v-if="rec.phase === 'done'">
          <div class="lk-big ok"><q-icon name="check" size="40px" /></div>
          <div class="lk-section-title">Notes are ready</div>
          <div class="lk-meta q-mb-md">{{ rec.title }}</div>
          <q-btn unelevated color="primary" no-caps class="full-width" label="Open notes" :to="`/sessions/${rec.sessionId}`" @click="rec.reset()" />
          <q-btn flat no-caps color="primary" class="full-width q-mt-sm" label="Record another lecture" @click="rec.reset()" />
        </template>
        <template v-else-if="rec.phase === 'limit'">
          <div class="lk-section-title">Saved for tomorrow</div>
          <div class="lk-error q-mt-sm">{{ rec.error }}</div>
          <div class="lk-meta q-mb-md">Your recording is on the server. Open the lecture and press "Finish and make notes" when you can.</div>
          <q-btn unelevated color="primary" no-caps class="full-width" label="Open the lecture" :to="`/sessions/${rec.sessionId}`" @click="rec.reset()" />
        </template>
        <template v-else-if="rec.phase === 'failed'">
          <div class="lk-section-title">Something went wrong</div>
          <div class="lk-error q-mt-sm" role="alert">{{ rec.error }}</div>
          <div class="lk-meta q-mb-md">Your recording is safe on this phone.</div>
          <q-btn v-if="rec.total" unelevated color="primary" no-caps class="full-width" label="Try again" @click="rec.finish()" />
          <q-btn flat no-caps color="negative" class="full-width q-mt-sm" label="Discard this recording" @click="confirmDiscard" />
        </template>
        <template v-else>
          <div class="lk-section-title q-mb-sm">{{ rec.phase === 'processing' ? 'Making your notes' : 'Sending to the server' }}</div>
          <q-linear-progress rounded size="8px" :value="progress" :indeterminate="rec.phase === 'stopping'" class="q-mb-sm" />
          <div class="lk-meta">{{ sendText }}</div>
          <div v-if="rec.waiting === 'wifi'" class="lk-info q-mt-md">Waiting for Wi-Fi. <a class="text-primary" @click="sendNow">Send now on mobile data</a></div>
          <div class="lk-meta q-mt-md">Your recording is saved on this phone until it has been sent. You can leave this screen.</div>
        </template>
      </q-card>
    </template>
  </q-page>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute } from 'vue-router'
import { useLibraryStore } from '../stores/library'
import { useRecordingStore } from '../stores/recording'
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
const starting = ref(false)
const moduleId = ref(Number(route.query.module) || null)
const stamp = new Date()
const title = ref(`Lecture ${stamp.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][stamp.getMonth()]} ${String(stamp.getHours()).padStart(2, '0')}:${String(stamp.getMinutes()).padStart(2, '0')}`)

const options = computed(() => library.courses.flatMap((c) => c.modules.map((m) => ({ label: `${c.name} › ${m.name}`, value: m.id }))))
watch(options, (o) => { if (!moduleId.value && o.length) moduleId.value = o[0].value }, { immediate: true })
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
const sendText = computed(() => {
  if (rec.phase === 'stopping') return 'Finishing the recording'
  if (rec.phase === 'processing') return stageText(rec.job && rec.job.stage)
  if (rec.paused401) return 'Log in again to continue sending.'
  if (rec.retryIn) return `Could not send a part. Trying again in ${rec.retryIn} s.`
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
    await rec.start({ moduleId: moduleId.value, title: title.value.trim() || 'Lecture', slides: rec.slides })
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
.lk-controls { display: flex; align-items: center; justify-content: space-between; padding: 0 12px; margin-bottom: 16px; }
.lk-spacer { width: 48px; }
.lk-stop { width: 84px; height: 84px; }
.lk-after { padding: 20px; text-align: center; }
.lk-big { width: 72px; height: 72px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 12px; color: #fff; }
.lk-big.ok { background: var(--lk-positive); }
@media (prefers-reduced-motion: reduce) { .lk-panel.recording .dot, .lk-bars span { animation: none; transition: none; } }
</style>
