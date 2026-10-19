<template>
  <q-page class="lk-page">
    <div class="lk-meta q-mb-md">Use this to check that this phone records properly. Nothing is sent to the server. Parts are 20 seconds long here so the test is short.</div>
    <q-card flat class="lk-card lk-pad q-mb-md">
      <div class="lk-label q-mb-sm">1. Two recorders at once (the overlap)</div>
      <div class="lk-meta q-mb-sm">Records 50 seconds. Part 1 and part 2 must both be complete and have sound: part 2 starts 5 seconds before part 1 ends.</div>
      <q-btn unelevated color="primary" no-caps :label="running ? 'Recording...' : 'Start the 50 second test'" :disable="running" @click="run(50)" />
    </q-card>
    <q-card flat class="lk-card lk-pad q-mb-md">
      <div class="lk-label q-mb-sm">2. Background recording</div>
      <div class="lk-meta q-mb-sm">Start, then lock the phone and put it down for the time you choose (30 minutes is the real test). Come back and press Stop: the recording must be as long as the time that passed.</div>
      <q-btn-toggle v-model="minutes" no-caps unelevated toggle-color="primary" :options="[{ label: '1 min', value: 1 }, { label: '5 min', value: 5 }, { label: '30 min', value: 30 }]" class="q-mb-sm" />
      <div class="row q-gutter-sm">
        <q-btn unelevated color="negative" no-caps :label="manual ? 'Stop' : 'Start (stop it yourself)'" @click="manual ? stopManual() : startManual()" />
      </div>
    </q-card>
    <q-card flat class="lk-card lk-pad q-mb-md">
      <div class="lk-label q-mb-sm">3. Calls and other apps</div>
      <div class="lk-meta">While test 2 runs, call this phone, or start an alarm, then return. The panel below must say "interrupted" and then "recording" again, and the recording must not lose the lecture.</div>
    </q-card>
    <q-card flat class="lk-card lk-pad">
      <div class="lk-label q-mb-sm">Result</div>
      <div class="lk-meta">State: <b>{{ state }}</b> · time: <b>{{ clockText }}</b> · sound level: <b>{{ Math.round(db) }} dB</b></div>
      <div v-for="p in parts" :key="p.index" class="q-mt-sm">Part {{ p.index + 1 }}: {{ p.seconds.toFixed(1) }} s <span v-if="p.size">· {{ (p.size / 1024).toFixed(0) }} KB</span>
        <audio v-if="p.url" :src="p.url" controls class="full-width q-mt-xs" />
      </div>
      <div v-if="verdict" class="q-mt-md" :class="verdict.ok ? 'text-positive' : 'text-negative'">{{ verdict.text }}</div>
    </q-card>
  </q-page>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Capacitor } from '@capacitor/core'
import { LectureRecorder } from 'lecturekit-recorder'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { clock } from '../util/format'

const props = defineProps({ auto: Boolean })
const state = ref('idle')
const seconds = ref(0)
const db = ref(-80)
const parts = ref([])
const verdict = ref(null)
const running = ref(false)
const manual = ref(false)
const minutes = ref(1)
const clockText = computed(() => clock(seconds.value))
let listeners = []

async function listen() {
  listeners.forEach((l) => l.remove())
  listeners = [
    await LectureRecorder.addListener('chunk', async (p) => {
      let size = 0
      if (p.path) { try { size = (await Filesystem.stat({ path: p.path })).size } catch { /* unknown */ } }
      parts.value = [...parts.value, { ...p, size, url: p.url || (p.path ? Capacitor.convertFileSrc(`file://${p.path}`) : null) }].sort((a, b) => a.index - b.index)
    }),
    await LectureRecorder.addListener('level', (p) => { db.value = p.db; seconds.value = p.seconds }),
    await LectureRecorder.addListener('state', (p) => { state.value = p.state === 'interrupted' && p.canResume ? 'interrupted (press Resume)' : p.state }),
    await LectureRecorder.addListener('error', (p) => { verdict.value = { ok: false, text: p.message } }),
  ]
}

async function ready() {
  const perm = await LectureRecorder.requestPermission()
  if (perm.status !== 'granted') { verdict.value = { ok: false, text: 'Microphone access is off. Turn it on in the phone Settings.' }; return false }
  parts.value = []
  verdict.value = null
  await listen()
  return true
}

async function run(total) {
  if (!(await ready())) return
  running.value = true
  await LectureRecorder.start({ chunkSeconds: 20, overlap: 5, folder: 'spike' })
  await new Promise((r) => setTimeout(r, total * 1000))
  const r = await LectureRecorder.stop()
  running.value = false
  const lengths = r.parts.map((p) => p.seconds)
  const ok = r.parts.length >= 3 && lengths.every((s) => s > 3)
  verdict.value = { ok, text: ok ? `Passed: ${r.parts.length} parts were made, two of them overlapping. Play parts 1 and 2 above: both must have sound.` : `Check this: ${r.parts.length} parts, lengths ${lengths.map((s) => s.toFixed(1)).join(', ')} s.` }
}

let startedAt = 0
async function startManual() {
  if (!(await ready())) return
  manual.value = true
  startedAt = Date.now()
  await LectureRecorder.start({ chunkSeconds: 300, overlap: 5, folder: 'spike' })
}
async function stopManual() {
  const r = await LectureRecorder.stop()
  manual.value = false
  const wall = (Date.now() - startedAt) / 1000
  const ok = Math.abs(r.seconds - wall) < Math.max(5, wall * 0.02)
  verdict.value = { ok, text: ok ? `Passed: ${Math.round(wall)} s passed and ${Math.round(r.seconds)} s were recorded.` : `Failed: ${Math.round(wall)} s passed but only ${Math.round(r.seconds)} s were recorded. Recording stops in the background.` }
}

onMounted(async () => {
  if (!props.auto) return
  await run(50)                                                      // a self test: the result is written to a file the computer can read
  const out = { verdict: verdict.value, parts: parts.value.map((p) => ({ index: p.index, seconds: p.seconds, size: p.size, path: p.path })), finishedAt: new Date().toISOString() }
  await Filesystem.writeFile({ path: 'spike-result.json', data: JSON.stringify(out, null, 1), directory: Directory.Documents, encoding: Encoding.UTF8 })
})
onBeforeUnmount(async () => { listeners.forEach((l) => l.remove()); try { await LectureRecorder.stop() } catch { /* not running */ } })
</script>

<style scoped>.lk-pad { padding: 16px; }</style>
