<template>
  <div class="lk-mom">
    <div v-if="busy" class="lk-shots-wait">
      <q-spinner color="primary" size="28px" />
      <span>Looking at the board and the screen of the recording. Your notes will be updated when this is done.</span>
    </div>
    <div v-if="!shots.length && !busy" class="text-center q-py-lg">
      <q-icon name="photo_library" size="44px" class="lk-dim" />
      <div class="lk-section-title q-mt-sm">{{ emptyTitle }}</div>
      <div class="lk-meta">{{ emptyText }}</div>
    </div>

    <div v-if="shots.length" class="lk-mom-grid">
      <aside class="lk-mom-side">
        <div v-if="kinds.length > 1" class="lk-mom-filters" role="group" aria-label="Show">
          <button type="button" class="lk-filter" :class="{ on: filter === 'all' }" @click="setFilter('all')">All {{ shots.length }}</button>
          <button v-for="k in kinds" :key="k" type="button" class="lk-filter" :class="{ on: filter === k }" @click="setFilter(k)">
            {{ plain(k) }} {{ count(k) }}
          </button>
        </div>
        <ol class="lk-mom-list">
          <li v-for="(s, i) in list" :key="s.id">
            <button type="button" class="lk-shot" :class="{ on: i === sel }" :aria-current="i === sel" :aria-label="`Picture at ${clock(s.t)}`" @click="sel = i">
              <span class="lk-shot-img"><img :src="s.url" :alt="`${label(s.kind)} at ${clock(s.t)}`" loading="lazy" /></span>
              <span class="lk-shot-body">
                <span class="lk-shot-top"><span class="lk-chip info">{{ clock(s.t) }}</span><span class="lk-meta">{{ label(s.kind) }}</span></span>
                <span class="lk-shot-text">{{ s.text || s.description }}</span>
              </span>
            </button>
          </li>
        </ol>
      </aside>

      <section v-if="cur" class="lk-mom-view">
        <div class="lk-mom-bar">
          <div class="lk-mom-id">
            <span class="lk-chip info">{{ clock(cur.t) }}</span>
            <span class="lk-meta">{{ label(cur.kind) }} · {{ sel + 1 }} of {{ list.length }}</span>
          </div>
          <div class="lk-mom-actions">
            <q-btn outline round dense color="primary" icon="chevron_left" aria-label="Previous picture" :disable="sel === 0" @click="sel--" />
            <q-btn outline round dense color="primary" icon="chevron_right" aria-label="Next picture" :disable="sel >= list.length - 1" @click="sel++" />
            <q-btn outline round dense color="primary" icon="download" aria-label="Save the picture" :href="`${cur.url}?download=true`" />
            <q-btn v-if="canPlay" unelevated color="primary" icon="play_arrow" no-caps :label="`Play from ${clock(cur.t)}`" class="lk-mom-play" @click="$emit('play', cur.t)" />
          </div>
        </div>
        <div class="lk-mom-scroll">
          <a v-touch-swipe.horizontal="onSwipe" :href="cur.url" target="_blank" rel="noopener" class="lk-mom-pic" title="Open the picture in a new tab">
            <img :src="cur.url" :alt="`${label(cur.kind)} at ${clock(cur.t)}`" />
          </a>
          <div v-if="cur.text || cur.description" class="q-mt-md">
            <div class="lk-label q-mb-xs">What it says</div>
            <pre v-if="cur.text" class="lk-shot-pre">{{ cur.text }}</pre>
            <p v-if="cur.description" class="lk-meta q-mt-sm q-mb-none">Figure: {{ cur.description }}</p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { clock } from '../util/format'

const props = defineProps({ shots: { type: Array, default: () => [] }, busy: Boolean, canPlay: Boolean, emptyTitle: { type: String, default: 'No board or screen content found' }, emptyText: { type: String, default: 'Pictures appear here when the recording shows a board, a slide or a screen.' } })
defineEmits(['play'])
const sel = ref(0)
const filter = ref('all')
const label = (k) => ({ board: 'Board', slide: 'Slide on screen', screen: 'Screen' }[k] || 'Picture')
const plain = (k) => ({ board: 'Board', slide: 'Slides', screen: 'Screen' }[k] || 'Other')
const kinds = computed(() => [...new Set(props.shots.map((s) => s.kind))])
const count = (k) => props.shots.filter((s) => s.kind === k).length
const list = computed(() => (filter.value === 'all' ? props.shots : props.shots.filter((s) => s.kind === filter.value)))
const cur = computed(() => list.value[sel.value] || null)
const onSwipe = ({ direction }) => { if (direction === 'left' && sel.value < list.value.length - 1) sel.value++; else if (direction === 'right' && sel.value > 0) sel.value-- }
function setFilter(k) { filter.value = k; sel.value = 0 }
watch(() => props.shots.length, () => { if (sel.value >= list.value.length) sel.value = 0; if (filter.value !== 'all' && !kinds.value.includes(filter.value)) filter.value = 'all' })
</script>

<style scoped>
.lk-mom { height: 100%; }
.lk-mom-grid { display: grid; grid-template-columns: minmax(280px, 380px) minmax(0, 1fr); gap: 20px; height: 100%; min-height: 0; }
.lk-mom-side { display: flex; flex-direction: column; min-height: 0; }
.lk-mom-filters { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; flex: none; }
.lk-filter { font: inherit; font-size: 13px; cursor: pointer; border: 1px solid var(--lk-border); background: var(--lk-surface); color: inherit; border-radius: 999px; padding: 4px 12px; }
.lk-filter.on { background: var(--lk-tint); border-color: var(--lk-primary); color: var(--lk-link); }
.lk-filter:focus-visible { outline: 2px solid var(--lk-primary); outline-offset: 2px; }
.lk-mom-list { list-style: none; margin: 0; padding: 0 4px 0 0; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; scrollbar-width: thin; flex: 1 1 auto; min-height: 0; }
.lk-shot { width: 100%; display: flex; gap: 12px; text-align: left; align-items: flex-start; background: var(--lk-surface); border: 1px solid var(--lk-border); border-radius: 12px; padding: 8px; cursor: pointer; color: inherit; font: inherit; transition: border-color 0.15s, background 0.15s; }
.lk-shot:hover { border-color: var(--lk-primary); }
.lk-shot.on { background: var(--lk-tint); border-color: var(--lk-primary); }
.lk-shot:focus-visible { outline: 2px solid var(--lk-primary); outline-offset: 2px; }
.lk-shot-img { flex: none; width: 112px; aspect-ratio: 16 / 10; border-radius: 8px; overflow: hidden; background: var(--lk-surface-2); }
.lk-shot-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.lk-shot-body { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.lk-shot-top { display: flex; align-items: center; gap: 8px; }
.lk-shot-text { font-size: 13px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; word-break: break-word; }
.lk-mom-view { display: flex; flex-direction: column; min-height: 0; min-width: 0; border: 1px solid var(--lk-border); border-radius: 14px; background: var(--lk-surface); }
.lk-mom-bar { flex: none; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; padding: 10px 14px; border-bottom: 1px solid var(--lk-border); }
.lk-mom-id { display: flex; align-items: center; gap: 10px; }
.lk-mom-actions { display: flex; align-items: center; gap: 8px; }
.lk-mom-play { flex: 1 1 auto; min-height: 40px; }
.lk-mom-scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 16px; scrollbar-width: thin; }
.lk-mom-pic { display: block; background: var(--lk-surface-2); border-radius: 10px; overflow: hidden; }
.lk-mom-pic img { display: block; width: 100%; max-height: 62vh; object-fit: contain; }
.lk-shot-pre { margin: 0; white-space: pre-wrap; word-break: break-word; font-family: inherit; line-height: 1.6; background: var(--lk-surface-2); padding: 12px 14px; border-radius: 8px; }
.lk-shots-wait { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 10px; background: var(--lk-tint); color: var(--lk-link); margin-bottom: 16px; }
@media (max-width: 1023px) {
  .lk-mom { height: auto; }
  .lk-mom-grid { display: flex; flex-direction: column-reverse; height: auto; }
  .lk-mom-list { flex-direction: row; overflow-x: auto; overflow-y: hidden; padding: 0 0 6px; }
  .lk-shot { width: 240px; flex: none; }
  .lk-mom-view { border: 0; }
  .lk-mom-bar { flex-direction: column; align-items: stretch; gap: 10px; padding: 4px 0 12px; border-bottom: 0; }
  .lk-mom-actions { width: 100%; }
  .lk-mom-scroll { overflow: visible; padding: 12px 0; }
}
@media (prefers-reduced-motion: reduce) { .lk-shot { transition: none; } }
</style>
