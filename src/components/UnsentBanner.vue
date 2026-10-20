<template>
  <q-card v-if="rec.unsent && rec.phase === 'idle'" flat class="lk-card lk-unsent">
    <div class="row items-start no-wrap">
      <q-icon name="cloud_off" size="28px" color="warning" class="q-mr-md q-mt-xs" />
      <div class="col">
        <div class="lk-section-title">A recording was not sent</div>
        <div class="lk-meta">"{{ rec.unsent.title }}" · {{ plural(rec.unsent.parts, 'part') }} saved on this phone. The last few minutes before it stopped may be missing.</div>
      </div>
    </div>
    <div class="row q-gutter-sm q-mt-xs justify-end">
      <q-btn flat no-caps color="negative" label="Discard" @click="discard" />
      <q-btn unelevated no-caps color="primary" icon="cloud_upload" label="Send and make notes" @click="send" />
    </div>
  </q-card>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { useRecordingStore } from '../stores/recording'
import { plural } from '../util/format'

const $q = useQuasar()
const router = useRouter()
const rec = useRecordingStore()
function send() { rec.sendUnsent(); router.push('/capture') }               // the Capture screen shows the progress
function discard() {
  $q.dialog({ title: 'Discard this recording?', message: 'The parts on this phone are deleted. This cannot be undone.', cancel: true, ok: { label: 'Discard', color: 'negative', unelevated: true }, persistent: true }).onOk(() => rec.discardUnsent())
}
</script>

<style scoped>
.lk-unsent { margin: 12px 16px 0; padding: 14px 16px; border-color: var(--lk-warning); }
</style>
