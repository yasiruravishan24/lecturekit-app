<template>
  <q-page class="lk-page">
    <div class="row items-center q-mb-md">
      <div class="lk-section-title col">Notifications</div>
      <q-btn v-if="notes.unread" flat dense no-caps color="primary" label="Mark all as read" @click="notes.markAllRead()" />
      <q-btn v-if="items.length" flat dense no-caps color="grey-7" label="Clear" @click="notes.clear()" />
    </div>
    <q-card v-if="items.length" flat class="lk-card">
      <q-list separator>
        <q-item v-for="n in items" :key="n.id" clickable :class="{ unread: !n.read }" @click="open(n)">
          <q-item-section avatar><q-avatar size="36px" :color="look(n).color" text-color="white" :icon="look(n).icon" /></q-item-section>
          <q-item-section><q-item-label class="text-weight-medium">{{ n.message }}</q-item-label><q-item-label caption lines="2">{{ n.title }}</q-item-label></q-item-section>
          <q-item-section side top><span class="lk-meta">{{ ago(n.created_at) }}</span></q-item-section>
        </q-item>
      </q-list>
    </q-card>
    <div v-else class="lk-card q-pa-lg text-center lk-meta">Nothing yet. You will be told here when a recording starts or a lecture is ready, on every device.</div>
  </q-page>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useLibraryStore } from '../stores/library'
import { useNotificationsStore } from '../stores/notifications'

const notes = useNotificationsStore()
const library = useLibraryStore()
const router = useRouter()
const LOOK = { recording_started: { color: 'negative', icon: 'fiber_manual_record' }, processing_started: { color: 'primary', icon: 'autorenew' }, notes_ready: { color: 'positive', icon: 'check' },
  replay_ready: { color: 'teal', icon: 'movie' }, failed: { color: 'negative', icon: 'error_outline' }, deeper_ready: { color: 'teal', icon: 'travel_explore' }, deeper_failed: { color: 'negative', icon: 'error_outline' } }
const look = (n) => LOOK[n.kind] || { color: 'grey', icon: 'notifications' }
const items = computed(() => notes.items.filter((i) => !library.loaded || !i.session_id || library.session(i.session_id)))
function open(n) { notes.markRead(n.id); if (n.session_id) router.push(`/sessions/${n.session_id}`) }
function ago(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'now'
  if (s < 3600) return `${Math.floor(s / 60)} min`
  if (s < 86400) return `${Math.floor(s / 3600)} h`
  return `${Math.floor(s / 86400)} d`
}
</script>

<style scoped>.unread { background: var(--lk-tint); }</style>
