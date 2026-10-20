<template>
  <q-page class="lk-page lk-notif">
    <template v-if="items.length">
      <div class="lk-nbar">
        <div class="lk-seg2" role="tablist">
          <button type="button" role="tab" :class="{ on: filter === 'all' }" :aria-selected="filter === 'all'" @click="filter = 'all'">All</button>
          <button type="button" role="tab" :class="{ on: filter === 'unread' }" :aria-selected="filter === 'unread'" @click="filter = 'unread'">Unread<span v-if="notes.unread" class="lk-count">{{ notes.unread }}</span></button>
        </div>
        <q-btn v-if="notes.unread" flat dense no-caps color="primary" icon="done_all" label="Mark all read" @click="notes.markAllRead()" />
      </div>

      <section v-for="g in groups" :key="g.name" class="lk-ngroup">
        <div class="lk-label q-mb-sm">{{ g.name }}</div>
        <q-card flat class="lk-card">
          <q-list separator>
            <q-item v-for="n in g.items" :key="n.id" clickable class="lk-nitem" @click="open(n)">
              <q-item-section avatar>
                <span class="lk-nicon" :class="look(n).tone"><q-icon :name="look(n).icon" size="22px" /></span>
              </q-item-section>
              <q-item-section>
                <q-item-label class="lk-ntitle" :class="{ unread: !n.read }">{{ n.message }}</q-item-label>
                <q-item-label v-if="n.title" caption lines="2">{{ n.title }}</q-item-label>
              </q-item-section>
              <q-item-section side top>
                <span class="lk-meta">{{ ago(n.created_at) }}</span>
                <span v-if="!n.read" class="lk-dot" aria-label="Unread" />
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </section>

      <div v-if="!shown.length" class="lk-nempty">
        <q-icon name="mark_email_read" size="46px" class="lk-dim" />
        <div class="lk-section-title q-mt-sm">You are all caught up</div>
        <div class="lk-meta">No unread notifications.</div>
      </div>

      <q-btn flat no-caps color="negative" icon="delete_sweep" label="Clear all notifications" class="full-width q-mt-md" @click="confirmClear" />
    </template>

    <div v-else class="lk-nempty">
      <span class="lk-nbig"><q-icon name="notifications_none" size="40px" /></span>
      <div class="lk-section-title q-mt-md">No notifications yet</div>
      <div class="lk-meta">You will be told here when a recording starts or a lecture is ready, on every device.</div>
    </div>
  </q-page>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { useLibraryStore } from '../stores/library'
import { useNotificationsStore } from '../stores/notifications'

const $q = useQuasar()
const notes = useNotificationsStore()
const library = useLibraryStore()
const router = useRouter()
const filter = ref('all')

const LOOK = {
  recording_started: { tone: 'red', icon: 'fiber_manual_record' },
  processing_started: { tone: 'blue', icon: 'autorenew' },
  notes_ready: { tone: 'green', icon: 'task_alt' },
  replay_ready: { tone: 'teal', icon: 'movie' },
  failed: { tone: 'red', icon: 'error_outline' },
  deeper_ready: { tone: 'teal', icon: 'travel_explore' },
  deeper_failed: { tone: 'red', icon: 'error_outline' },
}
const look = (n) => LOOK[n.kind] || { tone: 'grey', icon: 'notifications' }
const items = computed(() => notes.items.filter((i) => !library.loaded || !i.session_id || library.session(i.session_id)))
const shown = computed(() => (filter.value === 'unread' ? items.value.filter((i) => !i.read) : items.value))

// Today, Yesterday, Earlier
const groups = computed(() => {
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const day = 86400000
  const buckets = { Today: [], Yesterday: [], Earlier: [] }
  for (const n of shown.value) {
    const t = new Date(n.created_at).getTime()
    buckets[t >= start.getTime() ? 'Today' : t >= start.getTime() - day ? 'Yesterday' : 'Earlier'].push(n)
  }
  return Object.entries(buckets).filter(([, v]) => v.length).map(([name, list]) => ({ name, items: list }))
})

function open(n) { notes.markRead(n.id); if (n.session_id) router.push(`/sessions/${n.session_id}`) }
function confirmClear() {
  $q.dialog({ title: 'Clear all notifications?', message: 'They are removed on all your devices.', cancel: true, ok: { label: 'Clear all', color: 'negative', unelevated: true }, persistent: true }).onOk(() => notes.clear())
}
function ago(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'now'
  if (s < 3600) return `${Math.floor(s / 60)} min`
  if (s < 86400) return `${Math.floor(s / 3600)} h`
  return `${Math.floor(s / 86400)} d`
}
</script>

<style scoped>
.lk-nbar { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 16px; }
.lk-seg2 { display: inline-flex; border: 1px solid var(--lk-border); border-radius: 999px; padding: 3px; background: var(--lk-surface); }
.lk-seg2 button { font: inherit; font-size: 14px; font-weight: 500; border: 0; background: transparent; color: var(--lk-text-2); padding: 7px 16px; border-radius: 999px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
.lk-seg2 button.on { background: var(--lk-primary); color: #fff; }
.lk-count { background: var(--lk-negative); color: #fff; border-radius: 999px; font-size: 11px; line-height: 16px; min-width: 16px; padding: 0 5px; }
.lk-ngroup { margin-bottom: 18px; }
.lk-nitem { min-height: 68px; padding-top: 10px; padding-bottom: 10px; }
.lk-nicon { width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; }
.lk-nicon.red { background: rgba(193, 0, 21, 0.12); color: var(--lk-negative); }
.lk-nicon.blue { background: var(--lk-tint); color: var(--lk-primary); }
.lk-nicon.green { background: rgba(33, 186, 69, 0.15); color: #1b9a3a; }
.lk-nicon.teal { background: rgba(22, 165, 165, 0.15); color: #0f8a8a; }
.lk-nicon.grey { background: var(--lk-surface-2); color: var(--lk-text-2); }
body.body--dark .lk-nicon.red { color: #ff6b7a; }
body.body--dark .lk-nicon.green { color: #5fd47c; }
body.body--dark .lk-nicon.teal { color: #4fd1d1; }
.lk-ntitle { font-size: 15px; }
.lk-ntitle.unread { font-weight: 600; }
.lk-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--lk-primary); margin-top: 8px; align-self: flex-end; }
.lk-nempty { text-align: center; padding: 56px 24px; display: flex; flex-direction: column; align-items: center; }
.lk-nbig { width: 84px; height: 84px; border-radius: 50%; background: var(--lk-tint); color: var(--lk-primary); display: grid; place-items: center; }
</style>
