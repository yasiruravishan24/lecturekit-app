<template>
  <div class="lk-deeper">
    <!-- not made yet, or it failed -->
    <div v-if="((!deeper || deeper.state === 'none') && !auto) || (deeper && deeper.state === 'failed')" class="lk-deeper-intro">
      <span class="lk-deeper-icon"><q-icon name="travel_explore" size="34px" /></span>
      <h2>{{ DEEPER_NAME }}</h2>
      <p class="lk-meta">A lecturer cannot say everything. Claude reads your notes again, searches the web, and adds what may be missing, topic by topic:</p>
      <ul class="lk-deeper-points">
        <li><q-icon name="school" size="20px" /> <span><b>Background</b> the lecture took for granted</span></li>
        <li><q-icon name="lightbulb" size="20px" /> <span><b>A worked example</b> and <b>common mistakes</b></span></li>
        <li><q-icon name="rule" size="20px" /> <span><b>Check this</b>: things in the notes that look wrong or unclear</span></li>
        <li><q-icon name="menu_book" size="20px" /> <span><b>Pages to read</b> that were found on the web</span></li>
        <li><q-icon name="quiz" size="20px" /> <span>A few extra <b>quiz questions</b> about it</span></li>
      </ul>
      <div v-if="deeper && deeper.state === 'failed'" class="lk-deeper-error" role="alert">It did not work this time. Your notes are not changed. Try again in a moment.</div>
      <q-btn unelevated color="primary" size="lg" no-caps icon="travel_explore" :label="deeper && deeper.state === 'failed' ? 'Try again' : 'Make it now'" :loading="starting" @click="$emit('start')" />
      <div class="lk-meta">It takes about a minute. Only the text of your notes is searched, never your recording.</div>
    </div>

    <!-- being made -->
    <div v-else-if="!deeper || deeper.state === 'none' || deeper.state === 'queued' || deeper.state === 'processing'" class="lk-deeper-intro">
      <span class="lk-deeper-icon"><q-spinner color="primary" size="34px" /></span>
      <h2>Reading around your topics</h2>
      <p class="lk-meta">{{ stageText }}</p>
      <q-linear-progress rounded size="8px" :value="((deeper && deeper.percent) || 0) / 100" :indeterminate="!deeper || deeper.state !== 'processing'" style="max-width: 360px; margin: 0 auto" />
      <div class="lk-meta">You can leave this page. You will be told when it is ready.</div>
      <q-btn flat no-caps color="negative" icon="close" label="Cancel" @click="$emit('cancel')" />
    </div>

    <!-- ready -->
    <div v-else-if="deeper && deeper.data" class="lk-deeperwrap">
      <aside class="lk-left">
        <q-card flat bordered class="lk-card">
          <q-card-section class="q-pb-md lk-label lk-topics-head" :class="{ pick: $q.screen.lt.lg }" @click="$q.screen.lt.lg && (pickOpen = true)">
            <span>Topics</span>
            <span v-if="$q.screen.lt.lg" class="lk-topics-now">{{ sel === 0 ? GAPS_NAME : `${pos + 1} of ${count} · ${heading(sel)}` }}<q-icon name="unfold_more" size="20px" /></span>
          </q-card-section>
          <q-list v-show="!$q.screen.lt.lg" role="tablist" aria-orientation="vertical" aria-label="Topics" class="q-pb-sm">
            <q-item v-for="t in topics" :key="t.index" clickable role="tab" :aria-selected="sel === t.index" :active="sel === t.index" active-class="lk-active" @click="sel = t.index">
              <q-item-section avatar class="lk-topic-no">{{ t.index }}</q-item-section>
              <q-item-section>{{ heading(t.index) }}</q-item-section>
              <q-item-section v-if="t.check.length" side><q-icon name="rule" color="warning" size="18px"><q-tooltip>Something to check</q-tooltip></q-icon></q-item-section>
            </q-item>
            <q-item v-if="deeper.data.not_covered.length" clickable role="tab" :aria-selected="sel === 0" :active="sel === 0" active-class="lk-active" @click="sel = 0">
              <q-item-section avatar class="lk-topic-no"><q-icon name="add_circle_outline" size="18px" /></q-item-section>
              <q-item-section>{{ GAPS_NAME }}</q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </aside>

      <q-dialog v-model="pickOpen" position="bottom">
        <q-card class="lk-sheet">
          <div class="lk-sheet-grip" />
          <div class="lk-sheet-title">Topics</div>
          <q-list>
            <q-item v-for="t in topics" :key="t.index" clickable v-close-popup :active="sel === t.index" active-class="lk-active" @click="sel = t.index">
              <q-item-section avatar class="lk-topic-no">{{ t.index }}</q-item-section>
              <q-item-section>{{ heading(t.index) }}</q-item-section>
              <q-item-section v-if="t.check.length" side><q-icon name="rule" color="warning" size="18px" /></q-item-section>
              <q-item-section v-else-if="sel === t.index" side><q-icon name="check" color="primary" /></q-item-section>
            </q-item>
            <q-item v-if="deeper.data.not_covered.length" clickable v-close-popup :active="sel === 0" active-class="lk-active" @click="sel = 0">
              <q-item-section avatar class="lk-topic-no"><q-icon name="add_circle_outline" size="18px" /></q-item-section>
              <q-item-section>{{ GAPS_NAME }}</q-item-section>
              <q-item-section v-if="sel === 0" side><q-icon name="check" color="primary" /></q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </q-dialog>

      <div class="lk-right">
        <div v-touch-swipe.horizontal="onSwipe" class="lk-topic-scroll">
          <template v-if="sel === 0">
            <h2 class="lk-topic-title">{{ GAPS_TITLE }}</h2>
            <article v-for="(x, i) in gaps" :key="i" class="lk-gap">
              <h3>{{ x.title }}</h3>
              <p v-if="x.explanation">{{ x.explanation }}</p>
              <div v-if="x.why" class="lk-gap-why"><q-icon name="flag" size="16px" /> <span><b>Why it matters:</b> {{ x.why }}</span></div>
            </article>
          </template>

          <template v-else-if="cur">
            <h2 class="lk-topic-title">{{ heading(cur.index) }}</h2>
            <div v-if="cur.background" class="lk-summary"><div class="lk-label text-primary">Background</div><p>{{ cur.background }}</p></div>
            <div v-if="cur.example" class="lk-deeper-block"><div class="lk-label text-primary q-mb-xs">Worked example</div><rich-text :text="cur.example" /></div>
            <div v-if="cur.mistakes.length" class="lk-deeper-block">
              <div class="lk-label text-primary q-mb-xs">Common mistakes</div>
              <ul class="lk-deeper-list"><li v-for="(m, i) in cur.mistakes" :key="i">{{ m }}</li></ul>
            </div>
            <div v-if="cur.check.length" class="lk-deeper-block">
              <div class="lk-label q-mb-xs" style="color: var(--lk-warning-text, #b26a00)">Check this</div>
              <div v-for="(c, i) in cur.check" :key="i" class="lk-check">
                <div class="lk-check-head"><q-icon name="rule" size="18px" /> The notes say</div>
                <blockquote class="lk-check-claim">{{ c.claim }}</blockquote>
                <div class="lk-check-head q-mt-sm"><q-icon name="lightbulb" size="18px" /> Why it may need a second look</div>
                <div class="lk-check-why">{{ c.why }}</div>
              </div>
            </div>
            <div v-if="cur.links.length" class="lk-deeper-block">
              <div class="lk-label text-primary q-mb-xs">Pages to read</div>
              <a v-for="l in cur.links" :key="l.url" :href="l.url" target="_blank" rel="noopener noreferrer" class="lk-link-row">
                <span class="lk-link-icon"><q-icon name="public" size="20px" /></span>
                <span class="lk-link-body"><span class="lk-link-text">{{ l.title }}</span><span class="lk-link-host">{{ host(l.url) }}</span></span>
                <q-icon name="open_in_new" size="18px" class="lk-link-go" />
              </a>
            </div>
          </template>
        </div>
        <div v-if="count > 1" class="lk-pager lk-no-print">
          <q-btn flat no-caps icon="arrow_back" label="Previous" :disable="pos === 0" @click="go(-1)" />
          <span class="lk-meta lk-nowrap">{{ pos + 1 }} of {{ count }}</span>
          <q-btn flat color="primary" no-caps icon-right="arrow_forward" label="Next" :disable="pos >= count - 1" @click="go(1)" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import RichText from './RichText.vue'
import { DEEPER_NAME, GAPS_NAME, GAPS_TITLE } from '../util/names'

defineEmits(['start', 'cancel'])
const props = defineProps({ deeper: { type: Object, default: null }, notes: { type: Object, required: true }, starting: Boolean, auto: Boolean })
const sel = ref(1)
const pickOpen = ref(false)
const onSwipe = ({ direction }) => { if (direction === 'left') go(1); else if (direction === 'right') go(-1) }

const topics = computed(() => (props.deeper && props.deeper.data ? props.deeper.data.topics : []))
const cur = computed(() => topics.value.find((t) => t.index === sel.value) || null)
const order = computed(() => [...topics.value.map((t) => t.index), ...(props.deeper && props.deeper.data && props.deeper.data.not_covered.length ? [0] : [])])
const pos = computed(() => Math.max(0, order.value.indexOf(sel.value)))
const count = computed(() => order.value.length)
const go = (d) => { sel.value = order.value[Math.min(count.value - 1, Math.max(0, pos.value + d))] }
watch(topics, (t) => { if (t.length && !t.some((x) => x.index === sel.value) && sel.value !== 0) sel.value = t[0].index }, { immediate: true })

const gaps = computed(() => ((props.deeper && props.deeper.data && props.deeper.data.not_covered) || []).map((x) => (typeof x === 'string' ? { title: x, explanation: '', why: '' } : x)))
const heading = (i) => ((topics.value.find((t) => t.index === i) || {}).heading) || (props.notes.full_notes[i - 1] || {}).heading || `Topic ${i}`
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return '' } }
const stageText = computed(() => {
  if (!props.deeper || props.deeper.state === 'none') return 'Getting started'
  const s = props.deeper && props.deeper.stage
  if (s === 'questions') return 'Writing and checking a few extra questions'
  if (s === 'save') return 'Almost done'
  return 'Searching the web and writing what the lecture may have missed'
})
</script>

<style scoped>
.lk-deeper { height: 100%; }
.lk-deeper-intro { max-width: 560px; margin: 0 auto; padding: 24px 8px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.lk-deeper-intro h2 { font-size: 22px; font-weight: 500; margin: 0; letter-spacing: -0.01em; }
.lk-deeper-icon { width: 68px; height: 68px; border-radius: 20px; background: var(--lk-tint); color: var(--lk-primary); display: grid; place-items: center; }
.lk-deeper-points { list-style: none; margin: 4px 0 8px; padding: 0; text-align: left; display: flex; flex-direction: column; gap: 10px; }
.lk-deeper-points li { display: flex; gap: 12px; align-items: center; }
.lk-deeper-points .q-icon { color: var(--lk-primary); flex: none; }
.lk-deeper-error { background: rgba(193, 0, 21, 0.1); color: var(--lk-negative); border-radius: 10px; padding: 10px 14px; }
.lk-deeperwrap { display: grid; grid-template-columns: minmax(260px, 340px) minmax(0, 1fr); gap: 24px; height: 100%; }
.lk-left { overflow-y: auto; padding: 16px 0 16px 16px; scrollbar-width: thin; }
.lk-right { display: flex; flex-direction: column; min-height: 0; min-width: 0; }
.lk-topic-scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 16px 24px 16px 0; scrollbar-width: thin; }
.lk-topic-title { font-size: 20px; font-weight: 500; margin: 0 0 14px; letter-spacing: -0.01em; }
.lk-topic-no { min-width: 0; padding-right: 12px; color: var(--lk-text-2); font-variant-numeric: tabular-nums; }
.lk-gap { border: 1px solid var(--lk-border); background: var(--lk-surface); border-radius: 12px; padding: 16px 18px; margin-bottom: 12px; }
.lk-gap h3 { margin: 0 0 6px; font-size: 16px; font-weight: 500; }
.lk-gap p { margin: 0 0 8px; line-height: 1.65; }
.lk-gap-why { display: flex; gap: 8px; align-items: flex-start; background: var(--lk-tint); border-radius: 8px; padding: 8px 12px; font-size: 14px; line-height: 1.5; }
.lk-gap-why .q-icon { color: var(--lk-primary); margin-top: 3px; flex: none; }
.lk-summary { background: var(--lk-tint); border-radius: 12px; padding: 14px 18px; margin-bottom: 18px; }
.lk-summary p { margin: 4px 0 0; line-height: 1.65; }
.lk-deeper-block { margin-bottom: 18px; }
.lk-deeper-list { margin: 0; padding-left: 20px; line-height: 1.7; }
.lk-check { border: 1px solid rgba(242, 192, 55, 0.7); background: rgba(242, 192, 55, 0.12); border-radius: 12px; padding: 12px 14px; margin-bottom: 10px; line-height: 1.55; }
.lk-check-head { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: var(--lk-text-2); }
.lk-check-claim { margin: 6px 0 0; padding: 8px 12px; border-left: 3px solid var(--lk-warning); background: var(--lk-surface); border-radius: 0 8px 8px 0; font-style: italic; line-height: 1.5; }
.lk-check-why { margin-top: 6px; line-height: 1.55; }
.lk-link-row { display: flex; align-items: center; gap: 12px; padding: 12px; margin-bottom: 8px; border: 1px solid var(--lk-border); background: var(--lk-surface); border-radius: 12px; color: var(--lk-text); text-decoration: none; }
.lk-link-row:hover { background: var(--lk-tint); }
.lk-link-icon { flex: none; width: 36px; height: 36px; border-radius: 50%; background: var(--lk-tint); color: var(--lk-primary); display: grid; place-items: center; }
.lk-link-body { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.lk-link-text { color: var(--lk-link); font-weight: 500; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; word-break: break-word; }
.lk-link-host { font-size: 12.5px; color: var(--lk-text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lk-link-go { flex: none; color: var(--lk-text-2); }
.lk-pager { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 24px 10px 0; border-top: 1px solid var(--lk-border); background: var(--lk-surface); }
@media (max-width: 1023px) {
  .lk-deeper { height: auto; }
  .lk-deeperwrap { display: block; height: auto; }
  .lk-left { padding: 0 0 12px; overflow: visible; }
  .lk-topic-scroll { overflow: visible; padding: 8px 0 0; }
  .lk-pager { position: sticky; bottom: 0; padding: 10px 0; }
}
</style>
