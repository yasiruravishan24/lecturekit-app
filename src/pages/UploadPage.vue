<template>
  <q-page class="lk-page">
    <div v-if="library.loaded && !library.courses.length" class="lk-info">You need a course and a module first. Add them on the Courses screen.</div>

    <div class="lk-label q-mb-sm">1. Course and module</div>
    <pick-field v-model="courseId" :options="courseOptions" label="Course" class="q-mb-md" :disable="busy || !courseOptions.length" @update:model-value="moduleId = null" />
    <pick-field v-model="moduleId" :options="moduleOptions" label="Module" class="q-mb-md" :disable="busy || !courseId || !moduleOptions.length" />
    <div v-if="courseId && !moduleOptions.length" class="lk-meta q-mb-md">This course has no module yet. Add one on the Courses screen.</div>
    <q-input v-model="title" outlined label="Lecture title" maxlength="160" class="q-mb-lg" :disable="busy" />

    <div class="lk-label q-mb-sm">2. Lecture recording <span class="text-negative">*</span></div>
    <q-card flat class="lk-card q-mb-lg">
      <div v-if="!recordings.length" class="lk-drop-empty">
        <q-icon name="upload_file" size="40px" color="primary" />
        <div class="lk-meta q-mb-sm">MP3, M4A, WAV, MP4 and more · up to {{ limits.max_recording_mb }} MB in total</div>
        <q-btn outline no-caps color="primary" icon="folder_open" label="Choose a file" :disable="busy" @click="add(pickRecordings, recordings, RECORDING_TYPES)" />
      </div>
      <template v-else>
        <q-list separator>
          <q-item v-for="(f, i) in recordings" :key="i">
            <q-item-section avatar><q-icon :name="isVideo(f.name) ? 'videocam' : 'graphic_eq'" color="primary" /></q-item-section>
            <q-item-section><q-item-label class="ellipsis">{{ f.name }}</q-item-label><q-item-label caption>{{ formatSize(f.size) }}</q-item-label></q-item-section>
            <q-item-section side>
              <div class="row no-wrap">
                <q-btn v-if="recordings.length > 1" flat round dense icon="arrow_upward" aria-label="Move up" :disable="busy || i === 0" @click="move(recordings, i, -1)" />
                <q-btn v-if="recordings.length > 1" flat round dense icon="arrow_downward" aria-label="Move down" :disable="busy || i === recordings.length - 1" @click="move(recordings, i, 1)" />
                <q-btn flat round dense icon="close" aria-label="Remove" :disable="busy" @click="recordings.splice(i, 1)" />
              </div>
            </q-item-section>
          </q-item>
        </q-list>
        <div class="lk-pad">
          <div v-if="recordings.length > 1" class="lk-meta q-mb-sm">The parts are joined in this order into one lecture.</div>
          <q-btn flat no-caps color="primary" icon="add" label="Add another part" :disable="busy" @click="add(pickRecordings, recordings, RECORDING_TYPES)" />
        </div>
      </template>
    </q-card>

    <div class="lk-label q-mb-sm">3. Lecture slides <span class="lk-meta">(optional)</span></div>
    <q-card flat class="lk-card q-mb-lg">
      <q-item clickable :disable="busy" @click="add(pickSlides, slides, SLIDE_EXTENSIONS)">
        <q-item-section avatar><q-icon name="slideshow" color="primary" size="28px" /></q-item-section>
        <q-item-section><q-item-label>Add slides to improve the notes</q-item-label><q-item-label caption>PDF, PPTX or DOCX · up to {{ limits.max_slides_mb }} MB each</q-item-label></q-item-section>
        <q-item-section side><span class="text-primary text-weight-medium">ADD</span></q-item-section>
      </q-item>
      <q-list v-if="slides.length" separator>
        <q-item v-for="(f, i) in slides" :key="i">
          <q-item-section avatar><q-icon name="description" /></q-item-section>
          <q-item-section><q-item-label class="ellipsis">{{ f.name }}</q-item-label><q-item-label caption>{{ formatSize(f.size) }}</q-item-label></q-item-section>
          <q-item-section side><q-btn flat round dense icon="close" aria-label="Remove" :disable="busy" @click="slides.splice(i, 1)" /></q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <div v-if="error" class="lk-error" role="alert">{{ error }}</div>
    <div v-if="busy" class="q-mb-md">
      <q-linear-progress rounded size="8px" :value="percent / 100" :indeterminate="percent <= 0" class="q-mb-xs" />
      <div class="lk-meta">{{ percent > 0 && percent < 100 ? `Uploading ${percent}%` : percent >= 100 ? 'Starting the notes' : 'Getting the files ready' }}. Keep this screen open.</div>
    </div>
    <q-btn unelevated color="primary" size="lg" no-caps icon="auto_awesome" label="Create notes and quiz" class="full-width" :loading="busy" :disable="!canSubmit" @click="submit" />
    <div class="lk-meta q-mt-md text-center">Notes, short revision notes and a quiz are made from the recording. With slides the notes also use the slide text.</div>
  </q-page>
</template>

<script setup>
import PickField from '../components/PickField.vue'
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import * as lib from '../api/library'
import * as sessionsApi from '../api/sessions'
import { useAuthStore } from '../stores/auth'
import { useLibraryStore } from '../stores/library'
import { extOf, pickRecordings, pickSlides, readBlob, RECORDING_TYPES, SLIDE_EXTENSIONS } from '../recording/files'
import { friendly } from '../util/errors'
import { formatDate, formatSize } from '../util/format'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const library = useLibraryStore()

const courseId = ref(null)
const moduleId = ref(null)
const title = ref(`Lecture ${formatDate(new Date().toISOString())}`)
const recordings = ref([])
const slides = ref([])
const busy = ref(false)
const error = ref('')
const percent = ref(0)
const limits = computed(() => auth.limits)
const courseOptions = computed(() => library.courses.map((c) => ({ label: c.name, value: c.id })))
const moduleOptions = computed(() => ((library.course(courseId.value) || {}).modules || []).map((m) => ({ label: m.name, value: m.id })))
const canSubmit = computed(() => !!moduleId.value && title.value.trim() && recordings.value.length > 0 && !busy.value)
const isVideo = (name) => ['.mp4', '.mov', '.webm', '.mkv'].includes(extOf(name))

// pick files, keep the ones of a type the server accepts
async function add(picker, list, allowed) {
  try {
    const files = await picker()
    const bad = files.filter((f) => !allowed.includes(extOf(f.name)))
    if (bad.length) $q.notify({ type: 'warning', message: `${bad.map((f) => f.name).join(', ')}: this file type is not supported.` })
    list.push(...files.filter((f) => allowed.includes(extOf(f.name))))
  } catch (e) {
    if (!/cancel/i.test(String(e && e.message))) error.value = friendly(e)
  }
}
function move(list, i, d) {
  const j = i + d
  if (j < 0 || j >= list.length) return
  ;[list[i], list[j]] = [list[j], list[i]]
}

function validateSizes() {
  const mb = (n) => n / (1024 * 1024)
  if (recordings.value.length > limits.value.max_recording_parts) return `A lecture can have at most ${limits.value.max_recording_parts} recording files.`
  if (mb(recordings.value.reduce((n, f) => n + (f.size || 0), 0)) > limits.value.max_recording_mb) return `The recordings are too large (limit ${limits.value.max_recording_mb} MB in total).`
  const big = slides.value.find((f) => mb(f.size || 0) > limits.value.max_slides_mb)
  return big ? `${big.name} is too large (limit ${limits.value.max_slides_mb} MB per slide file).` : ''
}

async function submit() {
  error.value = validateSizes()
  if (error.value) return
  busy.value = true
  percent.value = 0
  let session = null
  try {
    const recs = []
    for (const f of recordings.value) recs.push({ name: f.name, blob: await readBlob(f) })
    const sl = []
    for (const f of slides.value) sl.push({ name: f.name, blob: await readBlob(f) })
    session = await lib.createSession(moduleId.value, title.value.trim())
    await sessionsApi.uploadFiles(session.id, recs, sl, (p) => { percent.value = p })
    percent.value = 100
  } catch (e) {
    error.value = friendly(e)
    if (session) lib.deleteSession(session.id).catch(() => {})        // do not leave an empty lecture behind
    busy.value = false
    return
  }
  try {
    await sessionsApi.startProcessing(session.id)
  } catch (e) {
    $q.notify({ type: 'warning', message: friendly(e) })              // the lecture stays uploaded; its page offers "Make notes"
  }
  await library.refresh().catch(() => {})
  router.replace(`/sessions/${session.id}`)
}

onMounted(async () => {
  await Promise.all([library.load(), auth.loadConfig().catch(() => {})])
  const fromModule = library.module(route.query.module)
  const course = fromModule ? fromModule.course : library.courses[0]
  if (course) {
    courseId.value = course.id
    moduleId.value = fromModule ? fromModule.id : course.modules.length === 1 ? course.modules[0].id : null
  }
})
</script>

<style scoped>
.lk-drop-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; padding: 24px 16px; border: 1.5px dashed var(--lk-border); border-radius: 12px; margin: 12px; }
.lk-pad { padding: 8px 12px 12px; }
</style>
