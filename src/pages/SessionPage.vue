<template>
  <q-page class="lk-page" :class="{ 'lk-fill': showNotes }">
    <template v-if="session">
      <nav v-if="where" class="lk-crumbs lk-no-print" aria-label="Breadcrumb">
        <router-link to="/courses">{{ where.course.name }}</router-link>
        <q-icon name="chevron_right" size="18px" />
        <router-link :to="`/modules/${where.id}`">{{ where.name }}</router-link>
      </nav>

      <div class="lk-head-row" :class="{ solo: session.state !== 'done' }">
        <div class="lk-title-row">
          <h1 class="lk-title q-mb-none">{{ session.title }}</h1>
          <status-chip :session="session" />
          <span v-if="meta" class="lk-chip info">{{ meta }}</span>
        </div>
        <div class="lk-no-print lk-head-actions" :class="{ solo: session.state !== 'done' }">
          <template v-if="session.state === 'done'">
            <q-btn outline color="primary" icon="ios_share" :label="$q.screen.lt.md ? undefined : 'Export'" :round="$q.screen.lt.md" :icon-right="$q.screen.lt.md ? undefined : 'arrow_drop_down'" aria-label="Export" class="q-mr-sm">
              <q-menu><q-list style="min-width: 220px">
                <q-item clickable v-close-popup @click="downloadMarkdown"><q-item-section avatar><q-icon name="download" /></q-item-section><q-item-section>Download Markdown</q-item-section></q-item>
                <q-item clickable v-close-popup @click="downloadPdf"><q-item-section avatar><q-icon name="picture_as_pdf" /></q-item-section><q-item-section>Download PDF</q-item-section></q-item>
              </q-list></q-menu>
            </q-btn>
            <q-btn unelevated color="primary" no-caps icon="quiz" label="Take quiz" :to="`/quiz/${session.id}`" class="q-mr-xs lk-quiz-btn" />
          </template>
          <q-btn flat round dense icon="more_vert" aria-label="Lecture menu">
            <q-menu><q-list style="min-width: 160px">
              <q-item clickable v-close-popup @click="openWeb"><q-item-section avatar><q-icon name="open_in_new" /></q-item-section><q-item-section>Open full version</q-item-section></q-item>
              <q-item clickable v-close-popup @click="rename"><q-item-section avatar><q-icon name="edit" /></q-item-section><q-item-section>Rename</q-item-section></q-item>
              <q-item clickable v-close-popup :disable="isBusy(session)" @click="remove"><q-item-section avatar><q-icon name="delete" color="negative" /></q-item-section><q-item-section class="text-negative">Delete</q-item-section></q-item>
            </q-list></q-menu>
          </q-btn>
        </div>
      </div>

      <error-banner :message="error" />

      <!-- processing -->
      <progress-panel v-if="isBusy(session)" :job="job" :has-slides="session.has_slides" :cancelling="cancelling" @cancel="cancelMain" />

      <!-- failed -->
      <q-card v-else-if="session.state === 'failed'" flat bordered class="lk-card">
        <q-card-section>
          <div class="lk-section-title">The notes could not be made</div>
          <error-banner class="q-mt-md" :message="failedMessage" />
          <div class="lk-meta q-mb-md">Nothing is lost: your recording is still on the server, so you can try again.</div>
          <q-btn unelevated color="primary" icon="refresh" label="Try again" :loading="working" @click="retry" />
        </q-card-section>
      </q-card>

      <!-- uploaded, waiting for Make notes -->
      <q-card v-else-if="session.state === 'uploaded'" flat bordered class="lk-card">
        <q-card-section>
          <div class="lk-section-title">Ready to make notes</div>
          <div class="lk-meta q-mb-md">{{ fileSummary }}</div>
          <q-btn unelevated color="primary" icon="auto_awesome" label="Make notes" :loading="working" @click="start" />
        </q-card-section>
      </q-card>

      <!-- a recording made with the extension (or the mobile app): going on, or not finished -->
      <div v-else-if="session.state === 'live'" class="lk-livecard" :class="{ going: recordingNow }">
        <span class="lk-live-badge"><span v-if="recordingNow" class="lk-live-ring" /><q-icon :name="recordingNow ? 'sensors' : 'pause_circle_outline'" size="40px" /></span>
        <div class="lk-live-title">{{ recordingNow ? 'Recording in progress' : 'This recording was not finished' }}</div>
        <div class="lk-meta lk-live-sub">
          <template v-if="recordingNow">{{ isThisPhone ? 'This phone is recording this lecture.' : 'Another device is recording this lecture.' }} This page updates by itself.</template>
          <template v-else>{{ liveTotal ? 'The recording stopped before it was finished. You can make notes from what arrived.' : 'No part of the recording reached the server.' }}</template>
        </div>

        <div class="lk-live-grid">
          <div><b>{{ liveReceived }}</b><span>{{ liveReceived === 1 ? 'Part received' : 'Parts received' }}</span></div>
          <div><b>{{ liveMinutes }}</b><span>Minutes so far</span></div>
          <div><b>{{ liveTranscribed }}</b><span>Transcribed</span></div>
        </div>

        <template v-if="recordingNow">
          <q-btn v-if="isThisPhone" unelevated color="negative" no-caps size="lg" icon="center_focus_strong" label="Go to the recording" to="/capture" class="full-width" />
          <div v-else class="lk-live-hint"><q-icon name="info" size="18px" /><span>A part reaches the server about every 5 minutes. Press Stop on the device that is recording to make the notes.</span></div>
        </template>
        <div v-else class="lk-live-buttons">
          <q-btn unelevated color="primary" no-caps size="lg" icon="auto_awesome" label="Finish and make notes" :loading="working" :disable="!liveTotal" class="full-width" @click="finishLive" />
          <q-btn flat color="negative" no-caps icon="delete" label="Delete this recording" :disable="working" class="full-width" @click="remove" />
        </div>
      </div>

      <!-- empty -->
      <q-card v-else-if="session.state === 'empty'" flat bordered class="lk-card">
        <q-card-section>
          <div class="lk-section-title">No recording yet</div>
          <div class="lk-meta q-mb-md">Add a recording to make notes and a quiz.</div>
          <q-btn unelevated color="primary" icon="center_focus_strong" label="Capture a lecture" :to="{ path: '/capture', query: where ? { module: where.id } : {} }" />
        </q-card-section>
      </q-card>

      <!-- done -->
      <notes-view v-else-if="notes" :notes="notes" :session-id="session.id" :slide-count="slideCount" :quiz-count="quizCount" :attempts="attempts"
                  :shots="shots" :replay="replay" :visuals-busy="visualsBusy" :can-make-replay="canMakeReplay" :starting-replay="startingReplay" :deeper="deeper" :starting-deeper="startingDeeper" :deeper-auto="deeperAuto" :replay-auto="replayAuto" @make-replay="startReplay" @start-deeper="startDeeper" @cancel-extra="cancelExtra" />
      <q-inner-loading :showing="loadingNotes" />
    </template>

    <div v-else-if="notFound" class="lk-card" style="max-width: 560px">
      <empty-state icon="search_off" text="This lecture was not found.">
        <q-btn unelevated color="primary" label="My courses" to="/courses" />
      </empty-state>
    </div>
    <q-inner-loading :showing="!session && !notFound" />
  </q-page>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import * as sessionsApi from '../api/sessions'
import * as lib from '../api/library'
import * as quizApi from '../api/quiz'
import { useLibraryStore } from '../stores/library'
import StatusChip from '../components/StatusChip.vue'
import ProgressPanel from '../components/ProgressPanel.vue'
import NotesView from '../components/NotesView.vue'
import ErrorBanner from '../components/ErrorBanner.vue'
import EmptyState from '../components/EmptyState.vue'
import { askName, confirmDelete } from '../util/dialogs'
import { friendly } from '../util/errors'
import { plural } from '../util/format'
import { isBusy, isRecording, kindOf } from '../util/status'
import { useRealtimeStore } from '../stores/realtime'
import { useRecordingStore } from '../stores/recording'
import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/settings'
import { isNative } from '../util/platform'
import { Share } from '@capacitor/share'
import { Directory, Filesystem } from '@capacitor/filesystem'

const props = defineProps({ id: { type: String, required: true } })
const $q = useQuasar()
const router = useRouter()
const library = useLibraryStore()
const auth = useAuthStore()
const realtime = useRealtimeStore()
const recording = useRecordingStore()
const isThisPhone = computed(() => recording.active && String(recording.sessionId) === String(props.id))
const settings = useSettingsStore()
// the server gives addresses like /api/media/...: on the phone they need the server in front
const abs = (u) => (u && u.startsWith('/') && isNative() ? `${settings.server}${u}` : u)

const session = ref(null)
const job = ref(null)
const notes = ref(null)
const quizCount = ref(null)
const attempts = ref([])
const notFound = ref(false)
const working = ref(false)
const loadingNotes = ref(false)
const error = ref('')
const liveReceived = ref(0)
const liveTotal = ref(0)
const liveTranscribed = ref(0)
const liveSeconds = ref(300)
const replay = ref(null)                // the replay and the state of the extra background work
const shots = ref([])
const startingReplay = ref(false)
const deeper = ref(null)               // "Go deeper": state and, when ready, what was found
const startingDeeper = ref(false)
const replayAuto = computed(() => !!(auth.config && auth.config.features && auth.config.features.visuals))
let replayAutoTried = ''                // the lecture for which the replay was started by itself (once)
const deeperAuto = computed(() => !!(auth.config && auth.config.features && auth.config.features.deeper_auto))
let deeperAutoTried = ''                 // the lecture for which it was started by itself (once)

const bgBusy = (r) => !!r && (['queued', 'processing'].includes(r.state) || ['queued', 'processing'].includes(r.visuals_state))
const visualsBusy = computed(() => !!replay.value && ['queued', 'processing'].includes(replay.value.visuals_state))
const canMakeReplay = computed(() => !!session.value && session.value.files.some((f) => f.kind === 'recording' && !f.removed))
const recordingNow = computed(() => !!session.value && isRecording(session.value))
const liveMinutes = computed(() => Math.round((liveReceived.value * liveSeconds.value) / 60))
const showNotes = computed(() => !!session.value && session.value.state === 'done' && !!notes.value)
const where = computed(() => (session.value ? library.module(session.value.module_id) : null))
const slideCount = computed(() => (session.value ? session.value.files.filter((f) => f.kind === 'slides').length : 0))
const meta = computed(() => {
  if (!session.value || session.value.state !== 'done') return ''
  const kind = kindOf(session.value).word
  return [kind ? kind[0].toUpperCase() + kind.slice(1) : '', session.value.has_slides ? 'slides' : '', session.value.shot_count ? 'board' : ''].filter(Boolean).join(' · ')
})
const fileSummary = computed(() => {
  const n = session.value.files.filter((f) => f.kind === 'recording').length
  return `${plural(n, 'recording file')}${slideCount.value ? ` and ${plural(slideCount.value, 'slide file')}` : ''} uploaded.`
})
const failedMessage = computed(() => (session.value && session.value.latest_job && session.value.latest_job.error_message) || 'Something went wrong while making the notes.')

let timer = null
let startedAt = 0
let gone = false

const stopPolling = () => { clearTimeout(timer); timer = null; clearTimeout(extrasTimer); clearTimeout(deeperTimer) }

async function load() {
  error.value = ''
  try {
    session.value = await lib.getSession(props.id)
    notFound.value = false
  } catch (e) {
    if (cancelling.value && (e.status === 404 || e.status === 422)) {              // the lecture was deleted by Cancel: leave
      library.refresh().catch(() => {})
      router.replace(leaveTo || '/courses')
      return
    }
    if (e.status === 404 || e.status === 422) notFound.value = true
    else error.value = friendly(e)
    return
  }
  if (session.value.latest_job) job.value = session.value.latest_job
  if (isBusy(session.value)) schedulePoll()
  else if (session.value.state === 'done') await loadResults()
  else if (session.value.state === 'live') await loadLive()
}

async function loadResults() {
  if (notes.value) return
  loadingNotes.value = true
  try {
    notes.value = await sessionsApi.getNotes(props.id)
    quizApi.getQuiz(props.id).then((q) => { quizCount.value = q.questions.length }).catch(() => {})
    quizApi.listAttempts(props.id).then((a) => { attempts.value = a }).catch(() => {})
    refreshExtras()
    refreshDeeper()
  } catch (e) {
    error.value = friendly(e)
  } finally {
    loadingNotes.value = false
  }
}

async function loadLive() {
  try {
    const s = await sessionsApi.liveStatus(props.id)
    const received = s.received || []
    liveReceived.value = received.length
    liveTranscribed.value = (s.transcribed || []).length
    liveSeconds.value = s.chunk_seconds || 300
    liveTotal.value = received.length ? Math.max(...received) + 1 : 0
  } catch { /* the numbers stay as they were */ }
}

// the replay and the board pictures are made after the notes: look at them now and then until they are finished
let extrasTimer = null
async function refreshExtras() {
  clearTimeout(extrasTimer)
  try {
    const before = replay.value ? replay.value.visuals_state : null
    const r = await sessionsApi.getReplay(props.id)
    replay.value = r && r.url ? { ...r, url: abs(r.url) } : r
    shots.value = (await sessionsApi.listShots(props.id)).map((x) => ({ ...x, url: abs(x.url) }))
    if (before && ['queued', 'processing'].includes(before) && replay.value.visuals_state === 'done') {
      notes.value = await sessionsApi.getNotes(props.id)                  // the notes now include what was on the board
      const was = quizCount.value
      const quiz = await quizApi.getQuiz(props.id)
      quizCount.value = quiz.questions.length
      const added = was == null ? 0 : quiz.questions.length - was
      $q.notify({ type: 'positive', message: added > 0 ? `The notes now include the board and screen content, and ${plural(added, 'question')} about the board ${added === 1 ? 'was' : 'were'} added to the quiz.` : 'The notes now include the board and screen content.' })
    }
  } catch { /* the extras are optional: the notes stay usable */ }
  if (replay.value && replay.value.state === 'none' && replay.value.visuals_state === 'none' && replayAuto.value && canMakeReplay.value && replayAutoTried !== props.id) {
    replayAutoTried = props.id                 // a lecture from before replays existed: make it once, without a button to press
    startReplay()
    return
  }
  if (!gone && bgBusy(replay.value)) extrasTimer = setTimeout(refreshExtras, 4000)
}

// "Go deeper" is made on request, in the background: look at it now and then while it is being made (the socket also tells us)
let deeperTimer = null
async function refreshDeeper() {
  clearTimeout(deeperTimer)
  try {
    const before = deeper.value ? deeper.value.state : null
    deeper.value = await sessionsApi.getDeeper(props.id)
    if (before && before !== 'done' && deeper.value.state === 'done') {
      const quiz = await quizApi.getQuiz(props.id)                         // it added questions
      quizCount.value = quiz.questions.length
    }
  } catch { /* optional */ }
  if (deeper.value && deeper.value.state === 'none' && deeperAuto.value && deeperAutoTried !== props.id) {      // a lecture from before it was made by itself
    deeperAutoTried = props.id
    startDeeper()
    return
  }
  if (!gone && deeper.value && ['queued', 'processing'].includes(deeper.value.state)) deeperTimer = setTimeout(refreshDeeper, 5000)
}

async function startDeeper() {
  startingDeeper.value = true
  try {
    await sessionsApi.startDeeper(props.id)
    await refreshDeeper()
  } catch (e) {
    $q.notify({ type: 'negative', message: friendly(e) })
  } finally {
    startingDeeper.value = false
  }
}

async function startReplay() {
  startingReplay.value = true
  try {
    await sessionsApi.makeReplay(props.id)
    await refreshExtras()
  } catch (e) {
    $q.notify({ type: 'negative', message: friendly(e) })
  } finally {
    startingReplay.value = false
  }
}

// Cancel: notes in the making stop and the lecture (with its recording) is deleted; an extra (pictures, replay, learn more) only stops
const cancelling = ref(false)
let leaveTo = ''
async function cancelMain() {
  if (!(await confirmDelete({ title: 'Cancel and delete this lecture?', message: 'The processing stops, and the lecture, its recording and anything made so far are deleted. This cannot be undone.', ok: 'Cancel and delete' }))) return
  cancelling.value = true
  leaveTo = `/modules/${session.value.module_id}`
  try {
    const r = await sessionsApi.cancel(props.id)
    if (r.state === 'deleted') { await library.refresh().catch(() => {}); router.replace(leaveTo); return }
    job.value = { ...(job.value || {}), stage: 'cancelling' }                                    // it stops within seconds; this page then finds the lecture gone
  } catch (e) {
    cancelling.value = false
    if (e.code === 'nothing_to_cancel') { await load(); return }                                // it had just finished
    error.value = friendly(e)
  }
}
async function cancelExtra(kind) {
  try { await sessionsApi.cancel(props.id, kind) } catch (e) { if (e.code !== 'nothing_to_cancel') $q.notify({ type: 'negative', message: friendly(e) }) }
  refreshExtras()
  refreshDeeper()
}

// poll the job every 2 s (every 5 s after the first minute); pause while the tab is hidden
function schedulePoll() {
  stopPolling()
  const delay = Date.now() - startedAt > 60000 ? 5000 : 2000
  timer = setTimeout(poll, delay)
}

async function poll() {
  if (gone) return
  if (document.hidden) return schedulePoll()
  try {
    const id = (job.value && job.value.id) || (session.value.latest_job && session.value.latest_job.id)
    if (id) job.value = await sessionsApi.getJob(id)
    if (job.value && (job.value.state === 'done' || job.value.state === 'failed' || job.value.state === 'cancelled')) {
      await load()
      library.refresh().catch(() => {})
      return
    }
  } catch (e) {
    if (e.code !== 'network') error.value = friendly(e)
  }
  schedulePoll()
}

async function run(action) {
  working.value = true
  error.value = ''
  try {
    const started = await action()
    job.value = { id: started.job_id, state: 'queued', stage: 'queued', percent: 0 }
    startedAt = Date.now()
    await load()
    library.refresh().catch(() => {})
  } catch (e) {
    error.value = friendly(e)
  } finally {
    working.value = false
  }
}

const start = () => run(() => sessionsApi.startProcessing(props.id))
const retry = () => run(() => sessionsApi.retry(props.id))
const finishLive = () => run(() => sessionsApi.finishLive(props.id, liveTotal.value))

// the web app shows everything on a bigger screen (it opens in the phone's browser)
const openWeb = () => window.open(`${isNative() ? settings.server : window.location.origin}/sessions/${props.id}`, '_blank')

async function rename() {
  const title = await askName({ title: 'Rename lecture', label: 'Lecture title', value: session.value.title, max: 160 })
  if (!title) return
  try { session.value = await lib.renameSession(props.id, title); library.refresh().catch(() => {}) } catch (e) { $q.notify({ type: 'negative', message: friendly(e) }) }
}

async function remove() {
  if (!(await confirmDelete({ title: `Delete "${session.value.title}"?`, message: 'Its recording, notes and quiz are deleted. This cannot be undone.' }))) return
  try {
    const moduleId = session.value.module_id
    await library.removeSession(props.id)
    router.replace(`/modules/${moduleId}`)
  } catch (e) { $q.notify({ type: 'negative', message: friendly(e) }) }
}

async function saveFile(blob, ext) {
  const name = `${session.value.title.replace(/[^\w\- ]+/g, '').trim() || 'notes'}.${ext}`
  if (!isNative()) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = name
    a.click()
    URL.revokeObjectURL(a.href)
    return
  }
  const data = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result).split(',')[1]); r.onerror = reject; r.readAsDataURL(blob) })
  const file = await Filesystem.writeFile({ path: name, data, directory: Directory.Cache })
  await Share.share({ title: session.value.title, url: file.uri })                 // the share sheet: Files, Mail, AirDrop, ...
}
async function downloadMarkdown() {
  try { await saveFile(await sessionsApi.exportMarkdown(props.id), 'md') } catch (e) { $q.notify({ type: 'negative', message: friendly(e) }) }
}
async function downloadPdf() {
  try { await saveFile(await sessionsApi.exportPdf(props.id), 'pdf') } catch (e) { $q.notify({ type: 'negative', message: friendly(e) }) }
}

onMounted(() => { startedAt = Date.now(); load() })
onBeforeUnmount(() => { gone = true; stopPolling() })
// the server pushes changes (the extension or the mobile app did something, a job moved on): look again, without a refresh
watch(() => realtime.syncTick, async () => {
  if (!session.value || gone) return
  await load()
  if (session.value && session.value.state === 'done') { refreshExtras(); refreshDeeper() }
})
watch(() => realtime.jobs[props.id], (j) => {                           // progress of the job that is running now
  if (j && session.value && isBusy(session.value)) job.value = { ...(job.value || {}), state: 'processing', stage: j.stage, percent: j.percent, message: j.message }
})

watch(() => props.id, () => { session.value = null; job.value = null; notes.value = null; replay.value = null; shots.value = []; quizCount.value = null; deeper.value = null; attempts.value = []; notFound.value = false; stopPolling(); startedAt = Date.now(); load() })
</script>
