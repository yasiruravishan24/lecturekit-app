<template>
  <q-card flat bordered class="lk-card lk-progress">
    <div class="lk-progress-head">
      <span class="lk-badge-icon lk-pulse"><q-icon name="auto_awesome" size="26px" /></span>
      <div>
        <div class="lk-section-title">Making your notes</div>
        <div class="lk-meta">{{ queued ? 'Waiting for its turn' : elapsedText }}</div>
      </div>
    </div>

    <div class="lk-progress-body">
      <!-- the ring -->
      <div class="lk-ring">
        <q-circular-progress :value="percent" :indeterminate="queued" size="150px" :thickness="0.13" rounded color="primary"
                             :track-color="$q.dark.isActive ? 'blue-grey-9' : 'blue-1'" show-value>
          <div class="lk-ring-value">
            <template v-if="queued"><q-icon name="hourglass_top" size="34px" /></template>
            <template v-else>{{ percent }}<span>%</span></template>
          </div>
        </q-circular-progress>
        <div class="lk-ring-stage" aria-live="polite"><span class="lk-dot" />{{ stageText(job ? job.stage : 'starting') }}</div>
      </div>

      <!-- the steps -->
      <ol class="lk-steps" aria-label="Progress">
        <li v-for="(s, i) in steps" :key="s.key" :class="{ done: i < current, active: i === current, todo: i > current }">
          <span class="lk-step-mark">
            <q-icon v-if="i < current" name="check" size="18px" />
            <span v-else-if="i === current" class="lk-step-spin" />
            <span v-else class="lk-step-no">{{ i + 1 }}</span>
          </span>
          <span class="lk-step-text">
            <span class="lk-step-title">{{ s.label }}</span>
            <span class="lk-step-note">{{ NOTES[s.key] }}</span>
          </span>
        </li>
      </ol>
    </div>

    <div class="lk-progress-foot">
      <q-icon name="info" size="20px" />
      This takes a few minutes. You can leave this page and come back; the lecture will show as Completed.
    </div>
    <div class="lk-progress-cancel lk-no-print">
      <span class="lk-meta">Pressed Make notes by mistake? Cancel stops it and deletes this lecture.</span>
      <q-btn outline no-caps color="negative" icon="close" :label="cancelling ? 'Stopping…' : 'Cancel'" :loading="cancelling" :disable="cancelling" @click="$emit('cancel')" />
    </div>
  </q-card>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { currentStep, stageText, stepList } from '../util/stages'

const props = defineProps({ job: { type: Object, default: null }, hasSlides: Boolean, cancelling: Boolean })
defineEmits(['cancel'])

const NOTES = {
  received: 'Your files are safely on the server.',
  speech: 'Listening to the lecture and writing it down.',
  slides: 'Reading your slides and matching them to what was said.',
  notes: 'Writing the notes and the quiz questions.',
}

const queued = computed(() => !!props.job && props.job.state === 'queued')
const percent = computed(() => Math.max(0, Math.min(100, (props.job && props.job.percent) || 0)))
const steps = computed(() => stepList(props.hasSlides))
const current = computed(() => currentStep(props.job ? props.job.stage : 'starting', props.job ? props.job.state : 'queued', props.hasSlides, percent.value))

// how long it has been running
const now = ref(Date.now())
let timer = null
onMounted(() => { timer = setInterval(() => { now.value = Date.now() }, 1000) })
onBeforeUnmount(() => clearInterval(timer))
const elapsedText = computed(() => {
  const start = props.job && (props.job.started_at || props.job.created_at)
  if (!start) return 'Starting'
  const s = Math.max(0, Math.round((now.value - new Date(start).getTime()) / 1000))
  return s < 60 ? `Running for ${s} s` : `Running for ${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`
})
</script>

<style scoped>
.lk-progress-cancel { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 12px 28px 16px; border-top: 1px solid var(--lk-border); }
@media (max-width: 599px) { .lk-progress-cancel { padding: 12px 16px 16px; } }
.lk-progress { overflow: hidden; }
.lk-progress-head { display: flex; align-items: center; gap: 16px; padding: 22px 28px 0; }
.lk-progress-body { display: grid; grid-template-columns: minmax(220px, 320px) minmax(0, 1fr); gap: 32px; align-items: center; padding: 24px 28px; }
.lk-ring { display: flex; flex-direction: column; align-items: center; text-align: center; }
.lk-ring-value { font-size: 38px; font-weight: 500; letter-spacing: -0.02em; color: var(--lk-text); }
.lk-ring-value span { font-size: 18px; color: var(--lk-text-2); margin-left: 2px; }
.lk-ring-stage { margin-top: 12px; font-weight: 500; display: inline-flex; align-items: center; gap: 8px; }
.lk-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--lk-primary); animation: blink 1.2s ease-in-out infinite; }
@keyframes blink { 50% { opacity: 0.25; } }
.lk-pulse { animation: pulse 2.4s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(25, 118, 210, 0.35); } 50% { box-shadow: 0 0 0 10px rgba(25, 118, 210, 0); } }

/* vertical steps joined by a line */
.lk-steps { list-style: none; margin: 0; padding: 0; }
.lk-steps li { position: relative; display: flex; gap: 16px; padding-bottom: 22px; }
.lk-steps li:last-child { padding-bottom: 0; }
.lk-steps li:not(:last-child)::before { content: ''; position: absolute; left: 15px; top: 34px; bottom: 2px; width: 2px; background: var(--lk-border); }
.lk-steps li.done:not(:last-child)::before { background: var(--lk-positive); }
.lk-step-mark { flex: none; width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; border: 2px solid var(--lk-border); background: var(--lk-surface); color: var(--lk-text-2); font-size: 13px; font-weight: 500; position: relative; z-index: 1; }
.done .lk-step-mark { background: var(--lk-positive); border-color: var(--lk-positive); color: #fff; }
.active .lk-step-mark { border-color: var(--lk-primary); }
.lk-step-spin { width: 16px; height: 16px; border-radius: 50%; border: 2.5px solid var(--lk-tint); border-top-color: var(--lk-primary); animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.lk-step-text { display: flex; flex-direction: column; padding-top: 4px; }
.lk-step-title { font-size: 16px; font-weight: 500; }
.lk-step-note { font-size: 13px; color: var(--lk-text-2); margin-top: 2px; }
.todo .lk-step-title { color: var(--lk-text-2); font-weight: 400; }

.lk-progress-foot { display: flex; align-items: center; gap: 10px; padding: 14px 28px; background: var(--lk-tint); color: var(--lk-link); font-size: 14px; }

@media (max-width: 700px) {
  .lk-progress-body { grid-template-columns: 1fr; gap: 24px; padding: 20px; }
  .lk-progress-head, .lk-progress-foot { padding-left: 20px; padding-right: 20px; }
}
@media (prefers-reduced-motion: reduce) { .lk-dot, .lk-pulse, .lk-step-spin { animation: none; } }
</style>
