<template>
  <div class="lk-replay">
    <!-- ready -->
    <div v-if="replay && replay.state === 'ready' && replay.url" class="lk-rec">
      <section class="lk-rec-main">
        <div class="lk-rec-stage">
          <video v-if="replay.kind === 'video'" ref="media" class="lk-video" :src="`${replay.url}#t=0.1`" controls preload="metadata" playsinline @timeupdate="onTime" />
          <div v-else class="lk-audio">
            <q-icon name="graphic_eq" size="48px" color="primary" />
            <audio ref="media" :src="replay.url" controls preload="metadata" @timeupdate="onTime" />
          </div>
        </div>
        <div class="lk-rec-bar">
          <div class="lk-rec-speed" role="group" aria-label="Playback speed">
            <span class="lk-meta q-mr-xs">Speed</span>
            <button v-for="s in speeds" :key="s" type="button" class="lk-filter" :class="{ on: speed === s }" @click="setSpeed(s)">{{ s }}×</button>
          </div>
          <div class="lk-rec-info">
            <span class="lk-meta">{{ formatSize(replay.bytes) }} · {{ replay.kind === 'video' ? 'faces of other people are blurred' : 'audio only' }}</span>
            <q-btn flat dense color="primary" icon="download" no-caps :label="replay.kind === 'video' ? 'Download video' : 'Download audio'" :href="`${replay.url}?download=true`" />
          </div>
        </div>
      </section>

      <aside class="lk-rec-side">
        <div class="lk-label q-mb-sm">Jump to</div>
        <ol v-if="shots.length" class="lk-rec-list">
          <li v-for="(s, i) in shots" :key="s.id">
            <button type="button" class="lk-rec-jump" :class="{ on: i === current }" @click="seek(s.t)">
              <span class="lk-rec-thumb"><img :src="s.url" alt="" loading="lazy" /></span>
              <span class="lk-rec-jump-body">
                <span class="lk-chip info">{{ clock(s.t) }}</span>
                <span class="lk-rec-jump-text">{{ s.text || s.description }}</span>
              </span>
            </button>
          </li>
        </ol>
        <div v-else class="lk-rec-none">
          <q-icon name="touch_app" size="26px" class="lk-dim" />
          <div class="lk-meta">{{ replay.kind === 'video' ? 'Moments from the board and screen will be listed here so you can jump to them.' : 'Audio only: there are no pictures to jump to.' }}</div>
        </div>
      </aside>
    </div>

    <!-- being made -->
    <div v-else-if="replay && (replay.state === 'queued' || replay.state === 'processing' || visualsBusy || (replay.state === 'none' && auto && canMake))" class="lk-replay-wait">
      <q-icon name="movie_filter" size="44px" color="primary" />
      <div class="lk-section-title q-mt-sm">Preparing the replay</div>
      <div class="lk-meta q-mb-md">{{ waitText }}</div>
      <q-linear-progress rounded size="8px" :value="(replay.percent || 0) / 100" :indeterminate="replay.state !== 'processing'" style="max-width: 360px; margin: 0 auto" />
      <div class="lk-meta q-mt-sm">Your notes are already ready. This runs in the background.</div>
    </div>

    <!-- failed -->
    <div v-else-if="replay && replay.state === 'failed'" class="lk-replay-wait">
      <q-icon name="error_outline" size="44px" color="negative" />
      <div class="lk-section-title q-mt-sm">The replay could not be made</div>
      <div class="lk-meta q-mb-md">Your recording is still on the server. You can try again.</div>
      <q-btn unelevated color="primary" icon="refresh" label="Try again" :loading="starting" @click="$emit('make')" />
    </div>

    <!-- none: an older lecture, or the original is gone -->
    <div v-else class="lk-replay-wait">
      <q-icon name="videocam_off" size="44px" class="lk-dim" />
      <div class="lk-section-title q-mt-sm">No replay for this lecture</div>
      <div class="lk-meta q-mb-md">{{ canMake ? 'It was processed before replays existed. You can make one now.' : 'The original recording is no longer on the server.' }}</div>
      <q-btn v-if="canMake" unelevated color="primary" icon="movie" label="Make the replay" :loading="starting" @click="$emit('make')" />
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { clock, formatSize } from '../util/format'

const props = defineProps({ replay: { type: Object, default: null }, shots: { type: Array, default: () => [] }, canMake: Boolean, starting: Boolean, auto: Boolean })
defineEmits(['make'])
const media = ref(null)
const speeds = [0.75, 1, 1.25, 1.5, 2]
const speed = ref(1)
const now = ref(0)
const current = computed(() => { let c = -1; props.shots.forEach((s, i) => { if (s.t <= now.value + 0.5) c = i }); return c })
const onTime = () => { if (media.value) now.value = media.value.currentTime }
function setSpeed(s) { speed.value = s; if (media.value) media.value.playbackRate = s }
const visualsBusy = computed(() => props.replay && ['queued', 'processing'].includes(props.replay.visuals_state))
const waitText = computed(() => {
  const r = props.replay
  if (r.state === 'processing') return `Blurring faces and converting the video${r.percent ? `: ${r.percent}%` : ''}`
  if (r.visuals_state === 'processing') return 'First looking at the board and screen, then the replay follows'
  return 'Waiting for its turn'
})

// jump to a moment of the lecture and play from there
function seek(seconds) {
  nextTick(() => {
    if (!media.value) return
    media.value.currentTime = seconds
    media.value.playbackRate = speed.value
    media.value.play().catch(() => {})
  })
}
defineExpose({ seek })
</script>

<style scoped>
.lk-replay { height: 100%; }
.lk-rec { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 20px; height: 100%; min-height: 0; }
.lk-rec-main { display: flex; flex-direction: column; min-height: 0; min-width: 0; gap: 12px; }
.lk-rec-stage { flex: 1 1 auto; min-height: 0; display: flex; align-items: center; justify-content: center; background: #000; border-radius: 14px; overflow: hidden; }
.lk-video { width: 100%; height: 100%; max-height: 100%; object-fit: contain; background: #000; display: block; }
.lk-audio { display: flex; align-items: center; gap: 16px; padding: 20px; background: var(--lk-tint); width: 100%; }
.lk-audio audio { flex: 1; min-width: 0; }
.lk-rec-bar { flex: none; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.lk-rec-speed, .lk-rec-info { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.lk-filter { font: inherit; font-size: 13px; cursor: pointer; border: 1px solid var(--lk-border); background: var(--lk-surface); color: inherit; border-radius: 999px; padding: 3px 11px; }
.lk-filter.on { background: var(--lk-tint); border-color: var(--lk-primary); color: var(--lk-link); }
.lk-filter:focus-visible { outline: 2px solid var(--lk-primary); outline-offset: 2px; }
.lk-rec-side { display: flex; flex-direction: column; min-height: 0; border: 1px solid var(--lk-border); border-radius: 14px; background: var(--lk-surface); padding: 14px 12px 12px; }
.lk-rec-list { list-style: none; margin: 0; padding: 0 2px 0 0; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; scrollbar-width: thin; flex: 1 1 auto; min-height: 0; }
.lk-rec-jump { width: 100%; display: flex; gap: 10px; align-items: flex-start; text-align: left; font: inherit; color: inherit; cursor: pointer; background: transparent; border: 1px solid var(--lk-border); border-radius: 10px; padding: 6px; transition: border-color 0.15s, background 0.15s; }
.lk-rec-jump:hover { border-color: var(--lk-primary); }
.lk-rec-jump.on { background: var(--lk-tint); border-color: var(--lk-primary); }
.lk-rec-jump:focus-visible { outline: 2px solid var(--lk-primary); outline-offset: 2px; }
.lk-rec-thumb { flex: none; width: 88px; aspect-ratio: 16 / 10; border-radius: 6px; overflow: hidden; background: var(--lk-surface-2); }
.lk-rec-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.lk-rec-jump-body { min-width: 0; display: flex; flex-direction: column; gap: 4px; align-items: flex-start; }
.lk-rec-jump-text { font-size: 12.5px; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; word-break: break-word; }
.lk-rec-none { text-align: center; padding: 24px 8px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.lk-replay-wait { text-align: center; padding: 36px 16px; }
@media (max-width: 1023px) {
  .lk-replay { height: auto; }
  .lk-rec { display: flex; flex-direction: column; height: auto; }
  .lk-rec-stage { aspect-ratio: 16 / 9; flex: none; }
  .lk-rec-side { border: 0; padding: 0; }
  .lk-rec-list { flex-direction: row; overflow-x: auto; overflow-y: hidden; padding-bottom: 6px; }
  .lk-rec-jump { width: 250px; flex: none; }
}
@media (prefers-reduced-motion: reduce) { .lk-rec-jump { transition: none; } }
</style>
