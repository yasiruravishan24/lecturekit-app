<template>
  <q-card flat bordered class="lk-card lk-notes-card">
    <div v-if="$q.screen.lt.lg" class="lk-pills lk-no-print" role="tablist">
      <button v-for="x in tabList" :key="x.name" type="button" role="tab" class="lk-pill" :class="{ on: tab === x.name }" :aria-selected="tab === x.name" @click="tab = x.name">
        <q-icon :name="x.icon" size="18px" /><span>{{ x.label }}</span>
      </button>
    </div>
    <q-tabs v-else v-model="tab" align="left" indicator-color="primary" active-color="primary" class="lk-no-print" style="border-bottom: 1px solid var(--lk-border)">
      <q-tab name="full" icon="description" label="Full notes" />
      <q-tab name="short" icon="short_text" label="Short notes" />
      <q-tab name="quiz" icon="quiz" :label="`Quiz${quizCount != null ? ` (${quizCount})` : ''}`" />
      <q-tab name="deeper" icon="travel_explore" :label="DEEPER_NAME" />
      <q-tab name="moments" icon="photo_library" :label="`Key moments${shots.length ? ` (${shots.length})` : ''}`" />
      <q-tab name="recording" icon="play_circle" label="Recording" />
    </q-tabs>

    <q-dialog v-model="topicsOpen" position="bottom">
      <q-card class="lk-sheet">
        <div class="lk-sheet-grip" />
        <div class="lk-sheet-title">Topics</div>
        <q-list>
          <q-item v-for="(t, i) in notes.full_notes" :key="i" clickable v-close-popup :active="active === i" active-class="lk-active" @click="goTo(i)">
            <q-item-section avatar class="lk-topic-no">{{ i + 1 }}</q-item-section>
            <q-item-section>{{ t.heading }}</q-item-section>
            <q-item-section v-if="active === i" side><q-icon name="check" color="primary" /></q-item-section>
          </q-item>
        </q-list>
      </q-card>
    </q-dialog>

    <q-tab-panels v-model="tab" animated class="lk-print-all">
      <q-tab-panel name="full" class="lk-full-panel">
        <div class="lk-fullwrap">
          <aside class="lk-left lk-no-print">
            <q-card flat bordered class="lk-card q-mb-md">
              <q-card-section class="q-pb-md lk-label lk-topics-head" :class="{ pick: $q.screen.lt.lg }" @click="$q.screen.lt.lg && (topicsOpen = true)">
                <span>Topics</span>
                <span v-if="$q.screen.lt.lg" class="lk-topics-now">{{ active + 1 }} of {{ notes.full_notes.length }} · {{ notes.full_notes[active].heading }}<q-icon name="unfold_more" size="20px" /></span>
              </q-card-section>
              <q-list v-show="!$q.screen.lt.lg" role="tablist" aria-orientation="vertical" aria-label="Topics" class="q-pb-sm">
                <q-item v-for="(t, i) in notes.full_notes" :key="i" clickable role="tab" :aria-selected="active === i" :active="active === i" active-class="lk-active" @click="goTo(i)">
                  <q-item-section avatar class="lk-topic-no">{{ i + 1 }}</q-item-section>
                  <q-item-section>{{ t.heading }}</q-item-section>
                </q-item>
              </q-list>
            </q-card>
            <q-card v-if="!$q.screen.lt.lg" flat bordered class="lk-card">
              <q-card-section class="q-pb-md lk-label">Built from</q-card-section>
              <q-list class="q-pb-sm">
                <q-item><q-item-section avatar><q-icon name="mic" color="primary" /></q-item-section><q-item-section>Lecture audio</q-item-section></q-item>
                <q-item v-if="shots.length"><q-item-section avatar><q-icon name="draw" color="teal" /></q-item-section><q-item-section>Board and screen</q-item-section></q-item>
                <q-item v-else-if="visualsBusy"><q-item-section avatar><q-spinner color="teal" size="22px" /></q-item-section><q-item-section class="lk-dim">Board and screen (being read)</q-item-section></q-item>
                <q-item v-if="slideCount"><q-item-section avatar><q-icon name="slideshow" color="purple" /></q-item-section><q-item-section>Slides</q-item-section></q-item>
              </q-list>
            </q-card>
          </aside>

          <div class="lk-right">
            <div v-if="$q.screen.lt.lg" class="lk-built lk-no-print">
              <span class="lk-meta">Built from</span>
              <span class="lk-chip info"><q-icon name="mic" size="14px" /> Audio</span>
              <span v-if="shots.length" class="lk-chip info"><q-icon name="draw" size="14px" /> Board and screen</span>
              <span v-else-if="visualsBusy" class="lk-chip idle"><q-spinner size="12px" /> Reading the board</span>
              <span v-if="slideCount" class="lk-chip info"><q-icon name="slideshow" size="14px" /> Slides</span>
            </div>
            <div ref="scroller" v-touch-swipe.horizontal="onSwipe" class="lk-topic-scroll">
              <section v-for="(t, i) in notes.full_notes" v-show="active === i" :id="`topic-${i}`" :key="i" class="lk-topic" role="tabpanel">
                <h2 class="lk-topic-title">{{ t.heading }}</h2>
                <div class="lk-summary">
                  <div class="lk-label text-primary">Summary</div>
                  <p>{{ t.summary }}</p>
                </div>
                <div v-if="t.key_points && t.key_points.length" class="lk-label text-primary lk-kp-head">Key points · {{ t.key_points.length }}</div>
                <ol v-if="t.key_points && t.key_points.length" class="lk-kp">
                  <li v-for="(k, j) in t.key_points" :key="j"><span class="lk-kp-n">{{ j + 1 }}</span><span>{{ k }}</span></li>
                </ol>
              </section>
            </div>
            <div v-if="notes.full_notes.length > 1" class="lk-pager lk-no-print">
              <q-btn flat no-caps icon="arrow_back" label="Previous topic" :disable="active === 0" @click="goTo(active - 1)" />
              <span class="lk-meta">Topic {{ active + 1 }} of {{ notes.full_notes.length }}</span>
              <q-btn flat color="primary" no-caps icon-right="arrow_forward" label="Next topic" :disable="active === notes.full_notes.length - 1" @click="goTo(active + 1)" />
            </div>
          </div>
        </div>
      </q-tab-panel>

      <q-tab-panel name="short" class="lk-short-panel">
        <div class="lk-short-head">
          <div>
            <div class="lk-short-title">Quick revision</div>
            <div class="lk-meta">{{ plural(notes.short_notes.length, 'point') }} to remember. Tick each one when you know it.</div>
          </div>
          <div class="lk-short-count lk-no-print">{{ known.size }} / {{ notes.short_notes.length }}</div>
        </div>
        <q-linear-progress :value="notes.short_notes.length ? known.size / notes.short_notes.length : 0" rounded size="6px" color="positive" track-color="grey-3" class="lk-no-print q-mb-md" />
        <div v-if="$q.screen.lt.lg" class="lk-viewswitch lk-no-print">
          <button type="button" :class="{ on: shortView === 'cards' }" @click="shortView = 'cards'">Cards</button>
          <button type="button" :class="{ on: shortView === 'list' }" @click="shortView = 'list'">List</button>
        </div>
        <div v-if="$q.screen.lt.lg && shortView === 'cards'" class="lk-deck lk-no-print">
          <template v-if="deck.length">
            <div v-touch-swipe.horizontal="onCardSwipe" class="lk-flash" :class="{ shown: revealed }" role="button" tabindex="0" @click="revealed = !revealed" @keyup.enter="revealed = !revealed">
                <div class="lk-flash-no">Point {{ deck[0] + 1 }} of {{ notes.short_notes.length }}</div>
                <div v-if="revealed" class="lk-flash-text">{{ notes.short_notes[deck[0]] }}</div>
                <div v-else class="lk-flash-hide"><q-icon name="touch_app" size="34px" /><span>Try to remember this point, then tap to check</span></div>
            </div>
            <div class="lk-flash-actions">
              <q-btn outline no-caps color="warning" text-color="grey-8" icon="replay" label="Again" @click="again" />
              <q-btn unelevated no-caps color="positive" icon="check" label="I know it" @click="gotIt" />
            </div>
            <div class="lk-meta text-center q-mt-sm">{{ deck.length }} left · swipe right if you know it, left to see it again</div>
          </template>
          <div v-else class="lk-flash lk-flash-done">
            <q-icon name="emoji_events" size="44px" color="positive" />
            <div class="lk-short-title q-mt-sm">All {{ notes.short_notes.length }} points learned</div>
            <q-btn flat no-caps color="primary" icon="replay" label="Go through them again" class="q-mt-md" @click="resetDeck" />
          </div>
        </div>
        <div v-show="!$q.screen.lt.lg || shortView === 'list'" class="lk-short-grid">
          <button v-for="(s, i) in notes.short_notes" :key="i" type="button" class="lk-short-card" :class="{ known: known.has(i) }"
                  :aria-pressed="known.has(i)" @click="toggleKnown(i)">
            <span class="lk-short-n">{{ known.has(i) ? '✓' : i + 1 }}</span>
            <span>{{ s }}</span>
          </button>
        </div>
      </q-tab-panel>

      <q-tab-panel name="quiz" class="lk-no-print">
        <div class="lk-quizwrap">
          <section class="lk-quiz-hero">
            <div class="lk-quiz-icon"><q-icon name="quiz" size="30px" /></div>
            <div class="lk-quiz-title">{{ attempts.length ? 'Try again and beat your score' : 'Test what you learned' }}</div>
            <div class="lk-meta">Multiple choice, one answer each. The correct answers and explanations appear after you submit the whole quiz.</div>
            <div class="lk-quiz-stats">
              <div><b>{{ quizCount != null ? quizCount : '-' }}</b><span>Questions</span></div>
              <div><b>{{ quizCount != null ? `${Math.max(1, Math.round(quizCount * 0.75))} min` : '-' }}</b><span>About</span></div>
              <div><b>{{ best == null ? '-' : `${best}%` }}</b><span>Best score</span></div>
            </div>
            <q-btn unelevated color="primary" size="lg" no-caps icon="play_arrow" :label="attempts.length ? 'Retake quiz' : 'Take quiz'" :to="`/quiz/${sessionId}`" class="full-width" />
          </section>

          <section class="lk-quiz-history">
            <div class="lk-label q-mb-sm">Your attempts</div>
            <div v-if="!attempts.length" class="lk-quiz-none">
              <q-icon name="history" size="28px" />
              <div>No attempts yet. Your scores will be listed here.</div>
            </div>
            <ul v-else class="lk-attempts">
              <li v-for="(a, i) in newest" :key="a.id">
                <span class="lk-attempt-n">#{{ attempts.length - i }}</span>
                <div class="lk-attempt-body">
                  <div class="lk-attempt-top"><b>{{ a.score }} / {{ a.total }}</b><span class="lk-meta">{{ formatDate(a.submitted_at, true) }}</span></div>
                  <div class="lk-bar"><span :class="barClass(a)" :style="{ width: pct(a) + '%' }" /></div>
                </div>
                <span class="lk-attempt-pct">{{ pct(a) }}%</span>
              </li>
            </ul>
          </section>
        </div>
      </q-tab-panel>

      <q-tab-panel name="deeper" class="lk-no-print lk-mom-panel">
        <deeper-view :deeper="deeper" :notes="notes" :starting="startingDeeper" :auto="deeperAuto" @start="$emit('start-deeper')" @cancel="$emit('cancel-extra', 'deeper')" />
      </q-tab-panel>

      <q-tab-panel name="moments" class="lk-no-print lk-mom-panel">
        <shots-gallery :shots="shots" :busy="visualsBusy" :can-play="!!(replay && replay.state === 'ready')" :empty-title="momentsEmpty.title" :empty-text="momentsEmpty.text" @play="playFrom" @cancel="$emit('cancel-extra', 'visuals')" />
      </q-tab-panel>

      <q-tab-panel name="recording" class="lk-no-print lk-mom-panel">
        <replay-player ref="player" :replay="replay" :shots="shots" :can-make="canMakeReplay" :starting="startingReplay" :auto="replayAuto" @make="$emit('make-replay')" @cancel="$emit('cancel-extra', visualsBusy ? 'visuals' : 'replay')" />
      </q-tab-panel>
    </q-tab-panels>
  </q-card>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { formatDate, plural } from '../util/format'
import ReplayPlayer from './ReplayPlayer.vue'
import ShotsGallery from './ShotsGallery.vue'
import DeeperView from './DeeperView.vue'
import { DEEPER_NAME } from '../util/names'

const props = defineProps({
  notes: { type: Object, required: true },
  sessionId: { type: [Number, String], required: true },
  slideCount: { type: Number, default: 0 },
  quizCount: { type: Number, default: null },
  attempts: { type: Array, default: () => [] },
  shots: { type: Array, default: () => [] },
  replay: { type: Object, default: null },
  visualsBusy: Boolean,
  canMakeReplay: Boolean,
  startingReplay: Boolean,
  deeper: { type: Object, default: null },
  startingDeeper: Boolean,
  deeperAuto: Boolean,
  replayAuto: Boolean,
})
defineEmits(['make-replay', 'start-deeper', 'cancel-extra'])
const tab = ref('full')
const tabList = computed(() => [
  { name: 'full', icon: 'description', label: 'Notes' },
  { name: 'short', icon: 'short_text', label: 'Short' },
  { name: 'quiz', icon: 'quiz', label: `Quiz${props.quizCount != null ? ` (${props.quizCount})` : ''}` },
  { name: 'deeper', icon: 'travel_explore', label: DEEPER_NAME },
  { name: 'moments', icon: 'photo_library', label: `Moments${props.shots.length ? ` (${props.shots.length})` : ''}` },
  { name: 'recording', icon: 'play_circle', label: 'Recording' },
])
const player = ref(null)

// "Play from 12:30": open the recording tab and jump there
async function playFrom(seconds) {
  tab.value = 'recording'
  await nextTick()
  setTimeout(() => player.value && player.value.seek(seconds), 400)
}

const momentsEmpty = computed(() => (props.replay && props.replay.kind === 'audio'
  ? { title: 'This recording has no picture', text: 'Pictures of the board and screen come from video recordings.' }
  : { title: 'No board or screen content found', text: 'Pictures appear here when the recording shows a board, a slide or a screen.' }))
const active = ref(0)
const topicsOpen = ref(false)             // on a phone the list of topics is folded away until asked for
const pct = (a) => (a.total ? Math.round((100 * a.score) / a.total) : 0)
const barClass = (a) => (pct(a) >= 70 ? 'good' : pct(a) >= 40 ? 'mid' : 'low')
const newest = computed(() => [...props.attempts].reverse())            // the server lists them oldest first
const best = computed(() => (props.attempts.length ? Math.max(...props.attempts.map(pct)) : null))
const scroller = ref(null)
const known = ref(new Set())
const shortView = ref('cards')
const revealed = ref(false)
const deck = ref(props.notes.short_notes.map((_, i) => i))          // the points not known yet, in the order they come
function nextCard(markKnown) {
  const i = deck.value[0]
  deck.value = markKnown ? deck.value.slice(1) : [...deck.value.slice(1), i]
  if (markKnown) known.value = new Set([...known.value, i])
  revealed.value = false
}
const gotIt = () => nextCard(true)
const again = () => nextCard(false)
const onCardSwipe = ({ direction }) => { if (direction === 'right') gotIt(); else if (direction === 'left') again() }
function resetDeck() { known.value = new Set(); deck.value = props.notes.short_notes.map((_, i) => i); revealed.value = false }
function toggleKnown(i) {
  const s = new Set(known.value)
  s.has(i) ? s.delete(i) : s.add(i)
  known.value = s
  deck.value = props.notes.short_notes.map((_, k) => k).filter((k) => !s.has(k))      // the cards follow the list
}

function onSwipe({ direction }) {                       // a phone: swipe left for the next topic, right for the one before
  if (direction === 'left') goTo(active.value + 1)
  else if (direction === 'right') goTo(active.value - 1)
}

function goTo(i) {
  if (i < 0 || i >= props.notes.full_notes.length) return
  active.value = i
  topicsOpen.value = false
  nextTick(() => { if (scroller.value) scroller.value.scrollTop = 0 })      // every topic starts at its top
}
</script>

<style scoped>
.lk-pager .lk-meta { white-space: nowrap; text-align: center; }
.lk-pager .q-btn { min-width: 0; }
.lk-viewswitch { display: inline-flex; border: 1px solid var(--lk-border); border-radius: 999px; padding: 3px; margin-bottom: 14px; background: var(--lk-surface-2); }
.lk-viewswitch button { font: inherit; font-size: 14px; font-weight: 500; border: 0; background: transparent; color: var(--lk-text-2); padding: 6px 18px; border-radius: 999px; cursor: pointer; }
.lk-viewswitch button.on { background: var(--lk-primary); color: #fff; }
.lk-flash { min-height: 260px; border-radius: 20px; background: var(--lk-surface); border: 1px solid var(--lk-border); box-shadow: var(--lk-shadow); padding: 22px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; gap: 14px; cursor: pointer; user-select: none; }
.lk-flash.shown { background: var(--lk-tint); border-color: var(--lk-primary); }
.lk-flash-no { font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--lk-text-2); font-weight: 500; }
.lk-flash-text { font-size: 19px; line-height: 1.55; }
.lk-flash-hide { display: flex; flex-direction: column; align-items: center; gap: 10px; color: var(--lk-text-2); font-size: 15px; }
.lk-flash-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; }
.lk-flash-actions .q-btn { height: 48px; }
.lk-flash-done { cursor: default; }
.lk-built { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 12px 0 0; }
.lk-pills { display: flex; gap: 8px; overflow-x: auto; padding: 10px 12px; border-bottom: 1px solid var(--lk-border); position: sticky; top: calc(var(--lk-safe-top) + 50px); z-index: 5; background: var(--lk-surface); border-radius: 12px 12px 0 0; }
.lk-pill { flex: none; display: inline-flex; align-items: center; gap: 6px; font: inherit; font-size: 14px; font-weight: 500; color: var(--lk-text-2); background: var(--lk-surface-2); border: 1px solid var(--lk-border); border-radius: 999px; padding: 8px 14px; min-height: 40px; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.lk-pill.on { background: var(--lk-primary); border-color: var(--lk-primary); color: #fff; }
.lk-topics-head.pick { cursor: pointer; }
.lk-sheet { width: 100%; max-height: 70vh; overflow-y: auto; border-radius: 20px 20px 0 0 !important; padding: 8px 0 calc(16px + var(--lk-safe-bottom)); background: var(--lk-surface); color: var(--lk-text); }
.lk-sheet-grip { width: 40px; height: 4px; border-radius: 2px; background: var(--lk-border); margin: 4px auto 10px; }
.lk-sheet-title { font-size: 17px; font-weight: 500; padding: 0 20px 8px; }
.lk-sheet .q-item { min-height: 54px; }
.lk-topics-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.lk-topics-now { display: flex; align-items: center; gap: 4px; min-width: 0; text-transform: none; letter-spacing: 0; font-size: 14px; color: var(--lk-link); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.lk-mom-panel { height: 100%; }
@media (min-width: 1024px) { .lk-mom-panel { overflow: hidden; } }
.lk-short-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; margin-bottom: 10px; }
.lk-short-title { font-size: 20px; font-weight: 500; letter-spacing: -0.01em; }
.lk-short-count { font-size: 14px; font-weight: 500; color: var(--lk-primary); }
.lk-short-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; }
.lk-short-card { display: flex; gap: 12px; align-items: flex-start; text-align: left; font: inherit; color: inherit; line-height: 1.55; cursor: pointer; background: var(--lk-surface); border: 1px solid var(--lk-border); border-radius: 12px; padding: 12px 16px; align-items: center; transition: border-color .15s, background .15s; }
.lk-short-card:hover { border-color: var(--lk-primary); }
.lk-short-card:focus-visible { outline: 2px solid var(--lk-primary); outline-offset: 2px; }
.lk-short-card.known { background: var(--lk-tint); border-color: var(--lk-positive); }
.lk-short-card.known > span:last-child { opacity: 0.7; }
.lk-short-n { flex: none; width: 26px; height: 26px; border-radius: 50%; background: var(--lk-tint); color: var(--lk-primary); font-size: 13px; font-weight: 500; display: grid; place-items: center; }
.lk-short-card.known .lk-short-n { background: var(--lk-positive); color: #fff; }
.lk-quizwrap { display: grid; grid-template-columns: minmax(280px, 400px) minmax(0, 1fr); gap: 28px; align-items: start; }
.lk-quiz-hero { background: var(--lk-tint); border-radius: 16px; padding: 24px; text-align: center; }
.lk-quiz-icon { width: 60px; height: 60px; border-radius: 50%; background: var(--lk-surface); color: var(--lk-primary); display: grid; place-items: center; margin: 0 auto 12px; }
.lk-quiz-title { font-size: 20px; font-weight: 500; letter-spacing: -0.01em; margin-bottom: 6px; }
.lk-quiz-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 20px 0; }
.lk-quiz-stats > div { background: var(--lk-surface); border-radius: 12px; padding: 10px 4px; display: flex; flex-direction: column; }
.lk-quiz-stats b { font-size: 18px; font-weight: 500; }
.lk-quiz-stats span { font-size: 12px; color: var(--lk-text-2); }
.lk-quiz-none { border: 1px dashed var(--lk-border); border-radius: 12px; padding: 28px; text-align: center; color: var(--lk-text-2); display: flex; flex-direction: column; align-items: center; gap: 6px; }
.lk-attempts { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.lk-attempts li { display: flex; align-items: center; gap: 14px; border: 1px solid var(--lk-border); background: var(--lk-surface); border-radius: 12px; padding: 12px 16px; }
.lk-attempt-n { flex: none; width: 36px; color: var(--lk-text-2); font-variant-numeric: tabular-nums; }
.lk-attempt-body { flex: 1 1 auto; min-width: 0; }
.lk-attempt-top { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 6px; }
.lk-bar { height: 8px; border-radius: 4px; background: var(--lk-border); overflow: hidden; }
.lk-bar span { display: block; height: 100%; border-radius: 4px; }
.lk-bar .good { background: var(--lk-positive); } .lk-bar .mid { background: var(--lk-warning); } .lk-bar .low { background: var(--lk-negative); }
.lk-attempt-pct { flex: none; width: 48px; text-align: right; font-weight: 500; }
@media (max-width: 860px) { .lk-quizwrap { grid-template-columns: 1fr; } }
.lk-topic-title { font-size: 20px; font-weight: 500; margin: 0 0 14px; letter-spacing: -0.01em; }
.lk-summary { background: var(--lk-tint); border-radius: 12px; padding: 14px 18px; margin-bottom: 20px; }
.lk-summary p { margin: 4px 0 0; line-height: 1.65; }
.lk-kp-head { margin-bottom: 8px; }
.lk-kp { list-style: none; margin: 0; padding: 0; }
.lk-kp li { display: flex; gap: 12px; align-items: flex-start; padding: 10px 2px; line-height: 1.6; border-bottom: 1px solid var(--lk-border); }
.lk-kp li:last-child { border-bottom: 0; }
.lk-kp-n { flex: none; width: 24px; height: 24px; border-radius: 50%; background: var(--lk-tint); color: var(--lk-primary); font-size: 12px; font-weight: 500; display: grid; place-items: center; margin-top: 2px; }
.lk-topic-no { min-width: 0; padding-right: 12px; color: var(--lk-text-2); font-variant-numeric: tabular-nums; }
.lk-full-panel { padding: 0; height: 100%; overflow: hidden; }
.lk-fullwrap { display: grid; grid-template-columns: minmax(260px, 340px) minmax(0, 1fr); gap: 24px; height: 100%; }
.lk-left { scrollbar-width: thin; overflow-y: auto; padding: 16px 0 16px 16px; }
.lk-right { display: flex; flex-direction: column; min-height: 0; min-width: 0; }
.lk-topic-scroll { scrollbar-width: thin; flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 16px 24px 16px 0; }
.lk-pager { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 24px 10px 0; border-top: 1px solid var(--lk-border); background: var(--lk-surface); }
@media (max-width: 1023px) {                         /* a phone or small tablet: the page scrolls as usual, the buttons stay at the bottom edge of the screen */
  .lk-full-panel { height: auto; overflow: visible; padding: 16px; }
  .lk-fullwrap { display: block; height: auto; }
  .lk-left { padding: 0; overflow: visible; }
  .lk-topic-scroll { overflow: visible; padding: 8px 0 0; }
  .lk-pager { position: sticky; bottom: 0; padding: 10px 0; }
}
@media print { .lk-topic { display: block !important; margin-bottom: 24px; } .lk-full-panel, .lk-fullwrap, .lk-topic-scroll { height: auto !important; overflow: visible !important; } }
</style>
