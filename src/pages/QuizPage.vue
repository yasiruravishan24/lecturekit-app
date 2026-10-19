<template>
  <q-page class="lk-page">
    <div v-if="error" class="lk-error" role="alert">{{ error }}</div>

    <!-- result -->
    <template v-if="result">
      <q-card flat class="lk-card lk-pad text-center q-mb-md">
        <div class="lk-score">{{ result.score }}<small> / {{ result.total }}</small></div>
        <div class="lk-section-title">{{ verdict.title }}</div>
        <div class="lk-meta q-mb-md">{{ verdict.text }}</div>
        <q-btn unelevated color="primary" no-caps label="Back to notes" :to="`/sessions/${id}`" class="q-mr-sm" />
        <q-btn outline color="primary" no-caps label="Try again" @click="again" />
      </q-card>
      <q-card v-for="r in rows" :key="r.id" flat class="lk-card lk-pad q-mb-sm" :class="r.correct ? 'ok' : 'no'">
        <div class="lk-label">Question {{ r.position }} · {{ r.correct ? 'Correct' : r.chosen == null ? 'Skipped' : 'Not quite' }}</div>
        <div class="text-weight-medium q-my-xs"><rich-text :text="r.text" legacy /></div>
        <div>You chose: <b v-if="r.chosen != null"><rich-text :text="r.chosen" class="inline" /></b><span v-else class="lk-meta">no answer</span></div>
        <div v-if="!r.correct">Correct answer: <span class="lk-good"><rich-text :text="r.right" class="inline" /></span></div>
        <div v-if="r.explanation" class="lk-meta q-mt-xs">Explanation: {{ r.explanation }}</div>
      </q-card>
    </template>

    <!-- one question at a time -->
    <template v-else-if="questions.length">
      <div class="row items-center q-mb-sm"><div class="lk-meta col">Question {{ index + 1 }} of {{ questions.length }}</div><span v-if="q.source === 'extra'" class="lk-chip info">Beyond the lecture</span><span v-else-if="q.source === 'board'" class="lk-chip info">From the board</span></div>
      <q-linear-progress :value="(index + 1) / questions.length" rounded size="6px" class="q-mb-md" />
      <q-card flat class="lk-card lk-pad q-mb-md">
        <div v-if="q.bloom_level" class="q-mb-sm"><span class="lk-chip bloom">Bloom level: {{ q.bloom_level }}</span></div>
        <div class="lk-q"><rich-text :text="q.question" legacy /></div>
      </q-card>
      <label v-for="(o, i) in q.options" :key="`${q.id}-${i}`" class="lk-opt" :class="{ on: chosen[q.id] === i }">
        <input v-model="chosen[q.id]" type="radio" :name="`q${q.id}`" :value="i" />
        <span class="lk-letter">{{ 'ABCD'[i] }}</span><rich-text :text="o" class="lk-opt-text" />
      </label>
      <div class="row q-gutter-sm q-mt-md">
        <q-btn flat no-caps class="col" label="Previous" :disable="index === 0" @click="index--" />
        <q-btn v-if="index < questions.length - 1" unelevated color="primary" no-caps class="col" label="Next" @click="index++" />
        <q-btn v-else unelevated color="primary" no-caps class="col" label="Submit quiz" :loading="busy" @click="submit" />
      </div>
      <div class="lk-meta text-center q-mt-md">{{ unanswered ? `${plural(unanswered, 'question')} not answered yet. ` : '' }}Answers are shown after you submit the whole quiz.</div>
    </template>
    <q-inner-loading :showing="loading" />
  </q-page>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import * as quizApi from '../api/quiz'
import RichText from '../components/RichText.vue'
import { friendly } from '../util/errors'
import { plural } from '../util/format'

const props = defineProps({ id: { type: String, required: true } })
const questions = ref([])
const index = ref(0)
const chosen = reactive({})
const result = ref(null)
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const q = computed(() => questions.value[index.value])
const unanswered = computed(() => questions.value.filter((x) => !Number.isInteger(chosen[x.id])).length)

const rows = computed(() => {
  const byId = Object.fromEntries(questions.value.map((x) => [x.id, x]))
  return [...result.value.results].sort((a, b) => a.position - b.position).map((r) => {
    const x = byId[r.question_id] || { question: '', options: [] }
    return { id: r.question_id, position: r.position, correct: r.correct, text: x.question, chosen: r.chosen_index == null ? null : x.options[r.chosen_index], right: x.options[r.correct_index], explanation: r.explanation }
  })
})
const verdict = computed(() => {
  const share = result.value.total ? result.value.score / result.value.total : 0
  if (share === 1) return { title: 'Perfect score', text: 'You answered every question correctly.' }
  if (share >= 0.7) return { title: 'Good work', text: 'Review the questions you missed below.' }
  if (share >= 0.4) return { title: 'Getting there', text: 'Read the notes again, then try the quiz once more.' }
  return { title: 'Keep going', text: 'Read the notes carefully, then try the quiz again.' }
})

async function load() {
  loading.value = true
  try { questions.value = (await quizApi.getQuiz(props.id)).questions } catch (e) { error.value = friendly(e) } finally { loading.value = false }
}
async function submit() {
  busy.value = true
  error.value = ''
  try { result.value = await quizApi.submitAttempt(props.id, quizApi.buildAnswers(questions.value, chosen)) } catch (e) {
    if (e.code === 'quiz_changed') { await load(); error.value = 'New questions were added to this quiz. Answer them and submit again.' } else error.value = friendly(e)
  } finally { busy.value = false }
}
function again() { result.value = null; index.value = 0; Object.keys(chosen).forEach((k) => delete chosen[k]); load() }
onMounted(load)
</script>

<style scoped>
.lk-pad { padding: 16px; }
.lk-score { font-size: 56px; color: var(--lk-primary); line-height: 1.1; }
.lk-score small { font-size: 28px; color: var(--lk-text-2); }
.lk-q { font-size: 18px; font-weight: 500; }
.lk-opt { position: relative; display: flex; gap: 12px; align-items: flex-start; border: 1.5px solid var(--lk-border); background: var(--lk-surface); border-radius: 12px; padding: 12px 14px; margin-bottom: 10px; }
.lk-opt.on { border-color: var(--lk-primary); background: var(--lk-tint); }
.lk-opt input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; margin: 0; }
.lk-letter { flex: none; width: 28px; height: 28px; border-radius: 50%; border: 1.5px solid var(--lk-border); display: grid; place-items: center; font-size: 13px; font-weight: 500; color: var(--lk-text-2); }
.lk-opt.on .lk-letter { background: var(--lk-primary); border-color: var(--lk-primary); color: #fff; }
.lk-opt-text { flex: 1; min-width: 0; padding-top: 2px; }
.ok { border-left: 4px solid var(--lk-positive); } .no { border-left: 4px solid var(--lk-negative); }
.lk-good { color: var(--lk-positive); font-weight: 500; }
.inline { display: inline-block; vertical-align: top; }
</style>
