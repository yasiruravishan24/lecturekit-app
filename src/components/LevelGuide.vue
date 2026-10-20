<template>
  <div class="lk-level" :class="[state, { compact }]" role="status" :aria-label="text">
    <div v-if="grid" class="lk-thirds" aria-hidden="true"><i /><i /><b /><b /></div>
    <div class="lk-gauge" aria-hidden="true">
      <span class="lk-tick l" /><span class="lk-tick r" />
      <span class="lk-horizon" :style="{ transform: `translateY(-50%) rotate(${-roll}deg)` }" />
    </div>
    <div class="lk-level-text"><q-icon :name="icon" size="16px" /> {{ text }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

// How straight the phone is held, over the camera picture. roll: degrees from level (+ the right side is low); pitch: degrees the camera
// points up (+) or down (-). Green: level; amber: nearly; red: clearly tilted.
const props = defineProps({ roll: { type: Number, default: 0 }, pitch: { type: Number, default: 0 }, compact: Boolean, grid: Boolean })
const R = computed(() => Math.abs(props.roll))
const P = computed(() => Math.abs(props.pitch))
const state = computed(() => (R.value <= 2 && P.value <= 5 ? 'ok' : R.value <= 5 && P.value <= 10 ? 'near' : 'off'))
const text = computed(() => {
  if (state.value === 'ok') return 'Level'
  const parts = []
  if (R.value > 2) parts.push(props.roll > 0 ? `Right side is low (${R.value.toFixed(0)}°)` : `Left side is low (${R.value.toFixed(0)}°)`)
  if (P.value > 5) parts.push(props.pitch > 0 ? 'Pointing up' : 'Pointing down')
  return parts.join(' · ')
})
const icon = computed(() => (state.value === 'ok' ? 'check_circle' : 'straighten'))
</script>

<style scoped>
.lk-level { position: absolute; inset: 0; pointer-events: none; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.lk-gauge { position: relative; width: 70%; max-width: 280px; height: 36px; }
.lk-horizon { position: absolute; left: 0; right: 0; top: 50%; height: 3px; border-radius: 2px; background: var(--c); transition: background 0.2s; box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35); }
.lk-tick { position: absolute; top: 50%; width: 18px; height: 3px; border-radius: 2px; background: #fff; transform: translateY(-50%); box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35); }
.lk-tick.l { left: -26px; } .lk-tick.r { right: -26px; }
.lk-level { --c: #ff6b6b; } .lk-level.near { --c: #ffd54f; } .lk-level.ok { --c: #4cd964; }
.lk-level-text { position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 999px; font-size: 13px; font-weight: 500; white-space: nowrap; background: rgba(0, 0, 0, 0.6); color: var(--c); }
.lk-thirds { position: absolute; inset: 0; }
.lk-thirds i, .lk-thirds b { position: absolute; background: rgba(255, 255, 255, 0.35); }
.lk-thirds i { top: 0; bottom: 0; width: 1px; } .lk-thirds i:nth-child(1) { left: 33.3%; } .lk-thirds i:nth-child(2) { left: 66.6%; }
.lk-thirds b { left: 0; right: 0; height: 1px; } .lk-thirds b:nth-of-type(1) { top: 33.3%; } .lk-thirds b:nth-of-type(2) { top: 66.6%; }
.lk-level.compact .lk-gauge { height: 22px; max-width: 160px; }
.lk-level.compact .lk-level-text { bottom: 6px; font-size: 12px; padding: 2px 10px; }
</style>
