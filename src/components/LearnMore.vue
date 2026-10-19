<template>
  <div>
    <!-- failed, or not made yet and not made by itself -->
    <q-card v-if="(!deeper || deeper.state === 'none') && !auto || (deeper && deeper.state === 'failed')" flat class="lk-card lk-pad text-center">
      <q-icon name="travel_explore" size="40px" color="primary" />
      <div class="lk-section-title q-mt-sm">{{ DEEPER_NAME }}</div>
      <div class="lk-meta q-mb-md">Background, examples, common mistakes, things to check and pages to read for every topic.</div>
      <div v-if="deeper && deeper.state === 'failed'" class="lk-error" role="alert">It did not work this time. Your notes are not changed.</div>
      <q-btn unelevated color="primary" no-caps :label="deeper && deeper.state === 'failed' ? 'Try again' : 'Make it now'" @click="$emit('start')" />
    </q-card>

    <!-- being made -->
    <q-card v-else-if="!deeper || deeper.state !== 'done'" flat class="lk-card lk-pad text-center">
      <q-spinner color="primary" size="34px" />
      <div class="lk-section-title q-mt-sm">Reading around your topics</div>
      <div class="lk-meta q-mb-md">{{ stageLabel }}</div>
      <q-linear-progress rounded size="8px" :value="((deeper && deeper.percent) || 0) / 100" :indeterminate="!deeper || deeper.state !== 'processing'" />
      <div class="lk-meta q-mt-md">You can leave this screen. It appears here when it is ready.</div>
    </q-card>

    <!-- ready -->
    <template v-else-if="deeper.data">
      <q-card v-for="t in deeper.data.topics" :key="t.index" flat class="lk-card q-mb-sm">
        <q-expansion-item :label="heading(t)" :default-opened="t.index === 1" header-class="lk-sec-head">
          <div class="lk-pad">
            <div v-if="t.background" class="lk-bg"><div class="lk-label text-primary">Background</div><p>{{ t.background }}</p></div>
            <div v-if="t.example" class="q-mb-md"><div class="lk-label text-primary q-mb-xs">Worked example</div><rich-text :text="t.example" /></div>
            <div v-if="t.mistakes.length" class="q-mb-md"><div class="lk-label text-primary q-mb-xs">Common mistakes</div><ul class="lk-list"><li v-for="(m, i) in t.mistakes" :key="i">{{ m }}</li></ul></div>
            <div v-if="t.check.length" class="q-mb-md">
              <div class="lk-label q-mb-xs" style="color: #b26a00">Check this</div>
              <div v-for="(c, i) in t.check" :key="i" class="lk-check"><div class="lk-meta">The notes say: <i>{{ c.claim }}</i></div><div>{{ c.why }}</div></div>
            </div>
            <div v-if="t.links.length"><div class="lk-label text-primary q-mb-xs">Pages to read</div>
              <a v-for="l in t.links" :key="l.url" :href="l.url" target="_blank" rel="noopener noreferrer" class="lk-link"><q-icon name="open_in_new" size="18px" /><span>{{ l.title }}</span><small class="lk-meta">{{ host(l.url) }}</small></a>
            </div>
          </div>
        </q-expansion-item>
      </q-card>

      <q-card v-if="gaps.length" flat class="lk-card q-mb-sm">
        <q-expansion-item :label="GAPS_NAME" header-class="lk-sec-head">
          <div class="lk-pad">
            <div v-for="(x, i) in gaps" :key="i" class="lk-gap">
              <div class="lk-gap-title">{{ x.title }}</div>
              <p v-if="x.explanation">{{ x.explanation }}</p>
              <div v-if="x.why" class="lk-why"><b>Why it matters:</b> {{ x.why }}</div>
            </div>
          </div>
        </q-expansion-item>
      </q-card>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import RichText from './RichText.vue'
import { DEEPER_NAME, GAPS_NAME } from '../util/names'

defineEmits(['start'])
const props = defineProps({ deeper: { type: Object, default: null }, notes: { type: Object, required: true }, auto: Boolean })
const heading = (t) => t.heading || (props.notes.full_notes[t.index - 1] || {}).heading || `Topic ${t.index}`
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return '' } }
const gaps = computed(() => ((props.deeper && props.deeper.data && props.deeper.data.not_covered) || []).map((x) => (typeof x === 'string' ? { title: x, explanation: '', why: '' } : x)))
const stageLabel = computed(() => {
  const s = props.deeper && props.deeper.stage
  return s === 'questions' ? 'Writing and checking a few extra questions' : s === 'save' ? 'Almost done' : 'Searching the web and writing what the lecture may have missed'
})
</script>

<style scoped>
.lk-pad { padding: 16px; }
:deep(.lk-sec-head) { font-weight: 500; font-size: 16px; }
.lk-bg { background: var(--lk-tint); border-radius: 10px; padding: 12px 14px; margin-bottom: 14px; }
.lk-bg p { margin: 4px 0 0; line-height: 1.6; }
.lk-list { margin: 0; padding-left: 20px; line-height: 1.6; }
.lk-check { border: 1px solid rgba(242, 192, 55, 0.7); background: rgba(242, 192, 55, 0.12); border-radius: 10px; padding: 10px 12px; margin-bottom: 8px; line-height: 1.5; }
.lk-link { display: flex; align-items: center; gap: 8px; padding: 8px 0; color: var(--lk-link); text-decoration: none; }
.lk-link span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lk-gap { margin-bottom: 14px; }
.lk-gap-title { font-weight: 500; font-size: 16px; }
.lk-gap p { margin: 4px 0 6px; line-height: 1.6; }
.lk-why { background: var(--lk-tint); border-radius: 8px; padding: 8px 12px; font-size: 14px; line-height: 1.5; }
</style>
