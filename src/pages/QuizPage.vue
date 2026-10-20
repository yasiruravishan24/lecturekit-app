<template>
  <q-page class="lk-page lk-quiz">
    <div v-if="error" class="lk-error" role="alert">{{ error }}</div>

    <!-- result -->
    <template v-if="result">
      <q-card flat class="lk-card lk-result text-center q-mb-md">
        <q-circular-progress :value="percent" size="150px" :thickness="0.12" rounded :color="ringColor" :track-color="$q.dark.isActive ? 'blue-grey-9' : 'grey-3'" show-value class="q-mb-md">
          <div class="lk-ring"><b>{{ percent }}<small>%</small></b><span>{{ result.score }} of {{ result.total }}</span></div>
        </q-circular-progress>
        <div class="lk-section-title">{{ verdict.title }}</div>
        <div class="lk-meta q-mb-md">{{ verdict.text }}</div>
        <div class="lk-stats">
          <div class="good"><b>{{ counts.right }}</b><span>Correct</span></div>
          <div class="bad"><b>{{ counts.wrong }}</b><span>Not quite</span></div>
          <div class="skip"><b>{{ counts.skipped }}</b><span>Skipped</span></div>
        </div>
        <div class="row q-gutter-sm q-mt-xs">
          <q-btn unelevated color="primary" no-caps icon="description" label="Back to notes" :to="`/sessions/${id}`" class="col" />
          <q-btn outline color="primary" no-caps icon="replay" label="Try again" class="col" @click="again" />
        </div>
      </q-card>

      <div class="row items-center q-mb-sm">
        <div class="lk-label col">Review your answers</div>
        <div class="lk-seg2" role="tablist">
          <button type="button" role="tab" :class="{ on: show === 'all' }" @click="show = 'all'">All</button>
          <button type="button" role="tab" :class="{ on: show === 'missed' }" @click="show = 'missed'">Missed ({{ counts.wrong + counts.skipped }})</button>
        </div>
      </div>
      <q-card v-for="r in shownRows" :key="r.id" flat class="lk-card lk-rev q-mb-sm" :class="r.state">
        <div class="lk-rev-head">
          <span class="lk-rev-no">{{ r.position }}</span>
          <span class="lk-rev-state"><q-icon :name="r.state === 'ok' ? 'check_circle' : r.state === 'skip' ? 'remove_circle_outline' : 'cancel'" size="18px" /> {{ r.correct ? 'Correct' : r.chosen == null ? 'Skipped' : 'Not quite' }}</span>
        </div>
        <div class="lk-rev-q"><rich-text :text="r.text" legacy /></div>
        <div v-if="r.chosen != null" class="lk-ans" :class="r.correct ? 'right' : 'wrong'"><span class="lk-ans-label">Your answer</span><rich-text :text="r.chosen" /></div>
        <div v-if="!r.correct" class="lk-ans right"><span class="lk-ans-label">Correct answer</span><rich-text :text="r.right" /></div>
        <div v-if="r.explanation" class="lk-expl"><q-icon name="lightbulb" size="18px" /><span>{{ r.explanation }}</span></div>
      </q-card>
      <div v-if="!shownRows.length" class="lk-meta text-center q-pa-lg">Nothing was missed. Well done.</div>
    </template>

    <!-- one question at a time -->
    <template v-else-if="questions.length">
      <div class="lk-qhead">
        <div class="col">
          <div class="lk-qno">Question {{ index + 1 }} <span class="lk-meta">of {{ questions.length }}</span></div>
          <div class="lk-meta">{{ answered }} answered</div>
        </div>
        <q-btn flat round dense icon="grid_view" aria-label="All questions" @click="gridOpen = true" />
      </div>
      <q-linear-progress :value="(index + 1) / questions.length" rounded size="6px" class="q-mb-md" />

      <div v-touch-swipe.horizontal="onSwipe">
        <q-card flat class="lk-card lk-qcard q-mb-md">
          <div class="lk-tags">
            <span v-if="q.bloom_level" class="lk-chip bloom">{{ q.bloom_level }}</span>
            <span v-if="q.source === 'extra'" class="lk-chip info">Beyond the lecture</span>
            <span v-else-if="q.source === 'board'" class="lk-chip info">From the board</span>
          </div>
          <div class="lk-q"><rich-text :text="q.question" legacy /></div>
        </q-card>
        <label v-for="(o, i) in q.options" :key="`${q.id}-${i}`" class="lk-opt" :class="{ on: chosen[q.id] === i }">
          <input v-model="chosen[q.id]" type="radio" :name="`q${q.id}`" :value="i" />
          <span class="lk-letter"><q-icon v-if="chosen[q.id] === i" name="check" size="18px" /><template v-else>{{ 'ABCD'[i] }}</template></span>
          <rich-text :text="o" class="lk-opt-text" />
        </label>
      </div>

      <div class="lk-bottom">
        <q-btn outline round color="primary" icon="arrow_back" aria-label="Previous question" :disable="index === 0" @click="index--" />
        <q-btn v-if="index < questions.length - 1" unelevated color="primary" no-caps size="lg" class="col" :icon-right="'arrow_forward'" :label="chosen[q.id] == null ? 'Skip' : 'Next'" @click="index++" />
        <q-btn v-else unelevated color="positive" no-caps size="lg" class="col" icon="check" label="Submit quiz" :loading="busy" @click="askSubmit" />
      </div>
      <div class="lk-meta text-center q-mt-sm">Answers and explanations are shown after you submit the whole quiz.</div>

      <!-- all questions -->
      <q-dialog v-model="gridOpen" position="bottom">
        <q-card class="lk-sheet">
          <div class="lk-sheet-grip" />
          <div class="lk-sheet-title">All questions</div>
          <div class="lk-grid">
            <button v-for="(x, i) in questions" :key="x.id" type="button" class="lk-cell" :class="{ done: Number.isInteger(chosen[x.id]), here: i === index }" @click="index = i; gridOpen = false">{{ i + 1 }}</button>
          </div>
          <div class="lk-legend"><span><i class="done" /> Answered</span><span><i /> Not yet</span></div>
          <div class="q-px-md q-pt-md"><q-btn unelevated color="positive" no-caps class="full-width" size="lg" icon="check" label="Submit quiz" :loading="busy" @click="gridOpen = false; askSubmit()" /></div>
        </q-card>
      </q-dialog>
    </template>
    <q-inner-loading :showing="loading" />
  </q-page>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import * as quizApi from '../api/quiz'
import RichText from '../components/RichText.vue'
import { friendly } from '../util/errors'
import { plural } from '../util/format'

const props = defineProps({ id: { type: String, required: true } })
const $q = useQuasar()
const questions = ref([])
const index = ref(0)
const chosen = reactive({})
const result = ref(null)
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const gridOpen = ref(false)
const show = ref('all')
const q = computed(() => questions.value[index.value])
const answered = computed(() => questions.value.filter((x) => Number.isInteger(chosen[x.id])).length)
const unanswered = computed(() => questions.value.length - answered.value)

const rows = computed(() => {
  const byId = Object.fromEntries(questions.value.map((x) => [x.id, x]))
  return [...result.value.results].sort((a, b) => a.position - b.position).map((r) => {
    const x = byId[r.question_id] || { question: '', options: [] }
    return { id: r.question_id, position: r.position, correct: r.correct, state: r.correct ? 'ok' : r.chosen_index == null ? 'skip' : 'no', text: x.question, chosen: r.chosen_index == null ? null : x.options[r.chosen_index], right: x.options[r.correct_index], explanation: r.explanation }
  })
})
const shownRows = computed(() => (show.value === 'missed' ? rows.value.filter((r) => !r.correct) : rows.value))
const counts = computed(() => ({ right: rows.value.filter((r) => r.correct).length, wrong: rows.value.filter((r) => !r.correct && r.chosen != null).length, skipped: rows.value.filter((r) => !r.correct && r.chosen == null).length }))
const percent = computed(() => (result.value.total ? Math.round((100 * result.value.score) / result.value.total) : 0))
const ringColor = computed(() => (percent.value >= 70 ? 'positive' : percent.value >= 40 ? 'warning' : 'negative'))
const verdict = computed(() => {
  const share = result.value.total ? result.value.score / result.value.total : 0
  if (share === 1) return { title: 'Perfect score', text: 'You answered every question correctly.' }
  if (share >= 0.7) return { title: 'Good work', text: 'Review the questions you missed below.' }
  if (share >= 0.4) return { title: 'Getting there', text: 'Read the notes again, then try the quiz once more.' }
  return { title: 'Keep going', text: 'Read the notes carefully, then try the quiz again.' }
})

const onSwipe = ({ direction }) => {
  if (direction === 'left' && index.value < questions.value.length - 1) index.value++
  else if (direction === 'right' && index.value > 0) index.value--
}
function askSubmit() {
  if (!unanswered.value) return submit()
  $q.dialog({ title: 'Submit the quiz?', message: `${plural(unanswered.value, 'question')} not answered yet. Unanswered questions count as wrong.`, cancel: { label: 'Keep answering', flat: true }, ok: { label: 'Submit', color: 'primary', unelevated: true }, persistent: true }).onOk(submit)
}
async function load() {
  loading.value = true
  try { questions.value = (await quizApi.getQuiz(props.id)).questions } catch (e) { error.value = friendly(e) } finally { loading.value = false }
}
async function submit() {
  busy.value = true
  error.value = ''
  try { result.value = await quizApi.submitAttempt(props.id, quizApi.buildAnswers(questions.value, chosen)); show.value = 'all' } catch (e) {
    if (e.code === 'quiz_changed') { await load(); error.value = 'New questions were added to this quiz. Answer them and submit again.' } else error.value = friendly(e)
  } finally { busy.value = false }
}
function again() { result.value = null; index.value = 0; Object.keys(chosen).forEach((k) => delete chosen[k]); load() }
onMounted(load)
</script>

<style scoped>
.lk-quiz { padding-bottom: 28px; }
.lk-qhead { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.lk-qno { font-size: 20px; font-weight: 600; }
.lk-qcard { padding: 18px; }
.lk-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.lk-tags:empty { display: none; }
.lk-tags .lk-chip { text-transform: capitalize; }
.lk-q { font-size: 19px; font-weight: 500; line-height: 1.5; }
.lk-opt { position: relative; display: flex; gap: 14px; align-items: center; border: 1.5px solid var(--lk-border); background: var(--lk-surface); border-radius: 14px; padding: 14px 16px; margin-bottom: 10px; min-height: 60px; cursor: pointer; }
.lk-opt.on { border-color: var(--lk-primary); background: var(--lk-tint); }
.lk-opt input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; margin: 0; }
.lk-letter { flex: none; width: 32px; height: 32px; border-radius: 50%; border: 1.5px solid var(--lk-border); display: grid; place-items: center; font-size: 14px; font-weight: 600; color: var(--lk-text-2); }
.lk-opt.on .lk-letter { background: var(--lk-primary); border-color: var(--lk-primary); color: #fff; }
.lk-opt-text { flex: 1; min-width: 0; font-size: 16px; line-height: 1.45; }
.lk-bottom { position: sticky; bottom: 0; display: flex; align-items: center; gap: 12px; padding: 12px 0 calc(8px + var(--lk-safe-bottom)); margin-top: 8px; background: var(--lk-bg); }
.lk-bottom .q-btn.col { height: 52px; }

.lk-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; padding: 8px 16px; }
.lk-cell { font: inherit; font-weight: 600; height: 48px; border-radius: 12px; border: 1.5px solid var(--lk-border); background: var(--lk-surface); color: var(--lk-text-2); cursor: pointer; }
.lk-cell.done { background: var(--lk-tint); border-color: var(--lk-primary); color: var(--lk-link); }
.lk-cell.here { outline: 2px solid var(--lk-primary); outline-offset: 2px; }
.lk-legend { display: flex; gap: 18px; padding: 4px 20px; font-size: 12px; color: var(--lk-text-2); }
.lk-legend i { display: inline-block; width: 12px; height: 12px; border-radius: 4px; border: 1.5px solid var(--lk-border); margin-right: 6px; vertical-align: -1px; }
.lk-legend i.done { background: var(--lk-tint); border-color: var(--lk-primary); }

.lk-result { padding: 24px 18px 18px; }
.lk-ring { display: flex; flex-direction: column; align-items: center; line-height: 1.1; }
.lk-ring b { font-size: 36px; font-weight: 600; }
.lk-ring small { font-size: 18px; color: var(--lk-text-2); }
.lk-ring span { font-size: 13px; color: var(--lk-text-2); margin-top: 2px; }
.lk-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 4px 0 16px; }
.lk-stats > div { background: var(--lk-surface-2); border-radius: 12px; padding: 10px 4px; display: flex; flex-direction: column; }
.lk-stats b { font-size: 22px; font-weight: 600; }
.lk-stats span { font-size: 12px; color: var(--lk-text-2); }
.lk-stats .good b { color: var(--lk-positive); } .lk-stats .bad b { color: var(--lk-negative); }
.lk-seg2 { display: inline-flex; border: 1px solid var(--lk-border); border-radius: 999px; padding: 3px; background: var(--lk-surface); }
.lk-seg2 button { font: inherit; font-size: 13px; font-weight: 500; border: 0; background: transparent; color: var(--lk-text-2); padding: 5px 12px; border-radius: 999px; cursor: pointer; }
.lk-seg2 button.on { background: var(--lk-primary); color: #fff; }

.lk-rev { padding: 14px 16px; border-left: 5px solid var(--lk-border); }
.lk-rev.ok { border-left-color: var(--lk-positive); } .lk-rev.no { border-left-color: var(--lk-negative); } .lk-rev.skip { border-left-color: var(--lk-text-2); }
.lk-rev-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.lk-rev-no { width: 28px; height: 28px; border-radius: 50%; background: var(--lk-surface-2); display: grid; place-items: center; font-size: 13px; font-weight: 600; color: var(--lk-text-2); }
.lk-rev-state { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 600; }
.lk-rev.ok .lk-rev-state { color: var(--lk-positive); } .lk-rev.no .lk-rev-state { color: var(--lk-negative); } .lk-rev.skip .lk-rev-state { color: var(--lk-text-2); }
.lk-rev-q { font-weight: 500; line-height: 1.5; margin-bottom: 10px; }
.lk-ans { border-radius: 10px; padding: 8px 12px; margin-top: 8px; line-height: 1.45; }
.lk-ans.right { background: rgba(33, 186, 69, 0.14); } .lk-ans.wrong { background: rgba(193, 0, 21, 0.1); }
.lk-ans-label { display: block; font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--lk-text-2); font-weight: 600; margin-bottom: 2px; }
.lk-expl { display: flex; gap: 8px; align-items: flex-start; margin-top: 10px; padding: 10px 12px; border-radius: 10px; background: var(--lk-tint); font-size: 14px; line-height: 1.5; }
.lk-expl .q-icon { color: var(--lk-primary); margin-top: 2px; flex: none; }
</style>
