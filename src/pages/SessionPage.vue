<template>
  <q-page class="lk-page lk-session">
    <template v-if="session">
      <div class="lk-meta q-mb-sm">{{ where }}</div>
      <div class="row items-center q-gutter-sm q-mb-md"><status-chip :session="session" /><span v-if="meta" class="lk-meta">{{ meta }}</span></div>
      <div v-if="error" class="lk-error" role="alert">{{ error }}</div>

      <q-card v-if="busy" flat class="lk-card lk-pad">
        <div class="lk-section-title q-mb-sm">Making your notes</div>
        <q-linear-progress rounded size="8px" :value="Math.max(0.05, ((job && job.percent) || 0) / 100)" :indeterminate="!job" class="q-mb-sm" />
        <div class="lk-meta">{{ stageText(job && job.stage) }}. You can leave this screen; it updates by itself.</div>
      </q-card>

      <q-card v-else-if="session.state === 'failed'" flat class="lk-card lk-pad">
        <div class="lk-section-title">The notes could not be made</div>
        <div class="lk-error q-mt-sm">{{ (session.latest_job && session.latest_job.error_message) || 'Something went wrong.' }}</div>
        <div class="lk-meta q-mb-md">Nothing is lost: the recording is still on the server.</div>
        <q-btn unelevated color="primary" no-caps icon="refresh" label="Try again" :loading="working" @click="retry" />
      </q-card>

      <q-card v-else-if="session.state === 'live'" flat class="lk-card lk-pad">
        <div class="lk-section-title">{{ recordingNow ? 'Recording in progress' : 'This recording was not finished' }}</div>
        <div class="lk-meta q-mb-md">{{ recordingNow ? 'A part reaches the server about every 5 minutes. This screen updates by itself.' : 'You can make notes from what arrived.' }}</div>
        <q-btn v-if="!recordingNow" unelevated color="primary" no-caps icon="auto_awesome" label="Finish and make notes" :loading="working" @click="finishLive" />
      </q-card>

      <q-card v-else-if="session.state === 'uploaded'" flat class="lk-card lk-pad">
        <div class="lk-section-title">Ready to make notes</div>
        <q-btn class="q-mt-md" unelevated color="primary" no-caps icon="auto_awesome" label="Make notes" :loading="working" @click="start" />
      </q-card>

      <template v-else-if="notes">
        <q-tabs v-model="tab" dense align="justify" indicator-color="primary" active-color="primary" class="lk-tabs">
          <q-tab name="notes" label="Notes" />
          <q-tab name="short" label="Short" />
          <q-tab name="quiz" :label="`Quiz${quizCount != null ? ` (${quizCount})` : ''}`" />
          <q-tab name="learn" :label="DEEPER_NAME" />
        </q-tabs>
        <q-tab-panels v-model="tab" animated class="lk-panels">
          <q-tab-panel name="notes" class="q-pa-none q-pt-md">
            <section v-for="(t, i) in notes.full_notes" :key="i" class="q-mb-lg">
              <h2 class="lk-topic">{{ t.heading }}</h2>
              <div class="lk-block"><div class="lk-label text-primary">Summary</div><p>{{ t.summary }}</p></div>
              <div v-if="t.key_points && t.key_points.length" class="lk-block"><div class="lk-label text-primary">Key points</div><ul><li v-for="(k, j) in t.key_points" :key="j">{{ k }}</li></ul></div>
            </section>
          </q-tab-panel>
          <q-tab-panel name="short" class="q-pa-none q-pt-md">
            <div class="lk-label q-mb-sm">Short revision notes</div>
            <q-card v-for="(s, i) in notes.short_notes" :key="i" flat class="lk-card lk-short"><span class="lk-n">{{ i + 1 }}</span><span>{{ s }}</span></q-card>
          </q-tab-panel>
          <q-tab-panel name="quiz" class="q-pa-none q-pt-md">
            <q-card flat class="lk-card lk-pad">
              <div class="lk-section-title">Test what you learned</div>
              <div class="lk-meta q-mb-md">{{ quizCount != null ? plural(quizCount, 'question') : 'Questions' }}. The correct answers are shown after you submit the whole quiz.</div>
              <q-btn unelevated color="primary" no-caps class="full-width" :label="attempts.length ? 'Retake quiz' : 'Take quiz'" :to="`/quiz/${session.id}`" />
            </q-card>
          </q-tab-panel>
          <q-tab-panel name="learn" class="q-pa-none q-pt-md">
            <learn-more :deeper="deeper" :notes="notes" :auto="true" @start="startDeeper" />
          </q-tab-panel>
        </q-tab-panels>
      </template>
    </template>
    <q-inner-loading :showing="!session && !notFound" />
    <div v-if="notFound" class="lk-card lk-pad text-center">This lecture was not found.</div>
  </q-page>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import * as lib from '../api/library'
import * as quizApi from '../api/quiz'
import * as sessionsApi from '../api/sessions'
import LearnMore from '../components/LearnMore.vue'
import StatusChip from '../components/StatusChip.vue'
import { useLibraryStore } from '../stores/library'
import { useRealtimeStore } from '../stores/realtime'
import { friendly } from '../util/errors'
import { plural } from '../util/format'
import { DEEPER_NAME } from '../util/names'
import { stageText } from '../util/stages'
import { isBusy, isRecording, kindOf } from '../util/status'

const props = defineProps({ id: { type: String, required: true } })
const $q = useQuasar()
const library = useLibraryStore()
const realtime = useRealtimeStore()
const session = ref(null)
const job = ref(null)
const notes = ref(null)
const deeper = ref(null)
const quizCount = ref(null)
const attempts = ref([])
const tab = ref('notes')
const error = ref('')
const working = ref(false)
const notFound = ref(false)
let timer = null
let gone = false

const busy = computed(() => !!session.value && isBusy(session.value))
const recordingNow = computed(() => !!session.value && isRecording(session.value))
const where = computed(() => (session.value ? (library.module(session.value.module_id) || {}).name || '' : ''))
const meta = computed(() => (session.value && session.value.state === 'done' ? [kindOf(session.value).word, session.value.has_slides ? 'slides' : ''].filter(Boolean).join(' · ') : ''))

async function load() {
  error.value = ''
  try {
    session.value = await lib.getSession(props.id)
    notFound.value = false
  } catch (e) {
    if (e.status === 404 || e.status === 422) notFound.value = true
    else error.value = friendly(e)
    return
  }
  if (session.value.latest_job) job.value = session.value.latest_job
  if (busy.value) schedule()
  else if (session.value.state === 'done') await loadResults()
}

async function loadResults() {
  if (!notes.value) {
    try {
      notes.value = await sessionsApi.getNotes(props.id)
      quizApi.listAttempts(props.id).then((a) => { attempts.value = a }).catch(() => {})
    } catch (e) { error.value = friendly(e); return }
  }
  quizApi.getQuiz(props.id).then((q) => { quizCount.value = q.questions.length }).catch(() => {})
  refreshDeeper()
}

async function refreshDeeper() {
  try {
    deeper.value = await sessionsApi.getDeeper(props.id)
    if (deeper.value.state === 'none') { await startDeeper(true) }
  } catch { /* optional */ }
}
async function startDeeper(silent) {
  try { await sessionsApi.startDeeper(props.id); deeper.value = await sessionsApi.getDeeper(props.id) } catch (e) { if (!silent) $q.notify({ type: 'negative', message: friendly(e) }) }
}

function schedule() {
  clearTimeout(timer)
  timer = setTimeout(async () => {
    if (gone) return
    try {
      const id = (job.value && job.value.id) || (session.value.latest_job && session.value.latest_job.id)
      if (id) job.value = await sessionsApi.getJob(id)
      if (job.value && ['done', 'failed'].includes(job.value.state)) { await load(); library.refresh().catch(() => {}); return }
    } catch { /* try again */ }
    schedule()
  }, 3000)
}

async function run(action) {
  working.value = true
  error.value = ''
  try { const r = await action(); job.value = { id: r.job_id, state: 'queued', stage: 'queued', percent: 0 }; await load() } catch (e) { error.value = friendly(e) } finally { working.value = false }
}
const start = () => run(() => sessionsApi.startProcessing(props.id))
const retry = () => run(() => sessionsApi.retry(props.id))
async function finishLive() {
  const st = await sessionsApi.liveStatus(props.id)
  const total = st.received.length ? Math.max(...st.received) + 1 : 0
  return run(() => sessionsApi.finishLive(props.id, total))
}

// the server tells us what changed (another device, a job that moved on): look again without a pull to refresh
watch(() => realtime.syncTick, () => { if (!gone) load() })
watch(() => realtime.jobs[props.id], (j) => { if (j && busy.value) job.value = { ...(job.value || {}), state: 'processing', stage: j.stage, percent: j.percent } })
watch(() => props.id, () => { session.value = null; notes.value = null; deeper.value = null; job.value = null; quizCount.value = null; load() })

onMounted(load)
onBeforeUnmount(() => { gone = true; clearTimeout(timer) })
</script>

<style scoped>
.lk-pad { padding: 16px; }
.lk-topic { font-size: 20px; font-weight: 500; margin: 0 0 8px; }
.lk-block { border-left: 3px solid var(--lk-primary); padding: 2px 0 2px 14px; margin-bottom: 12px; }
.lk-block p { margin: 4px 0 0; line-height: 1.6; }
.lk-block ul { margin: 4px 0 0; padding-left: 20px; line-height: 1.6; }
.lk-short { display: flex; gap: 12px; padding: 12px 14px; margin-bottom: 8px; line-height: 1.5; }
.lk-n { flex: none; width: 24px; height: 24px; border-radius: 50%; background: var(--lk-tint); color: var(--lk-link); display: grid; place-items: center; font-size: 12px; font-weight: 500; }
.lk-tabs { background: var(--lk-surface); border-radius: 8px; }
.lk-panels { background: transparent; }
</style>
