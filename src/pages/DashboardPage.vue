<template>
  <q-page class="lk-dash">
    <header class="lk-greet">
      <div class="col" style="min-width: 0">
        <div class="lk-meta ellipsis">Hi, {{ firstName }}</div>
        <h1 class="lk-welcome">Welcome back!</h1>
      </div>
      <router-link to="/notifications" class="lk-round" aria-label="Notifications">
        <q-icon name="notifications_none" size="24px" />
        <q-badge v-if="notes.unread" color="negative" rounded floating>{{ notes.unread > 9 ? '9+' : notes.unread }}</q-badge>
      </router-link>
      <router-link to="/settings" class="lk-avatar" aria-label="Account">{{ initials(auth.user && auth.user.full_name, auth.user && auth.user.email) }}</router-link>
    </header>

    <section class="lk-block">
      <div class="lk-block-head"><h2>Overview</h2></div>
      <router-link v-for="o in overview" :key="o.title" :to="o.to" class="lk-ov">
        <q-icon :name="o.icon" size="30px" :style="{ color: o.color }" />
        <span class="col">
          <span class="lk-ov-title">{{ o.title }}</span>
          <span class="lk-ov-sub">{{ o.sub }}</span>
        </span>
        <span class="lk-go"><q-icon name="arrow_forward" size="18px" /></span>
      </router-link>
    </section>

    <section class="lk-block">
      <div class="lk-block-head"><h2>Summary</h2><router-link to="/courses" class="lk-link">See all lectures</router-link></div>
      <div class="lk-tiles">
        <router-link v-for="t in tiles" :key="t.label" :to="t.to" class="lk-tile">
          <q-icon :name="t.icon" size="30px" :style="{ color: t.color }" />
          <span class="lk-tile-label">{{ t.label }}</span>
          <span class="lk-tile-num">{{ t.value }}</span>
        </router-link>
      </div>
    </section>

    <section v-if="recent.length" class="lk-block">
      <div class="lk-block-head"><h2>Recent lectures</h2></div>
      <q-card flat class="lk-card">
        <q-list separator>
          <q-item v-for="s in recent" :key="s.id" clickable :to="`/sessions/${s.id}`">
            <q-item-section avatar><q-icon :name="kindOf(s).icon" color="primary" /></q-item-section>
            <q-item-section><q-item-label>{{ s.title }}</q-item-label><q-item-label caption>{{ s.module_name }}</q-item-label></q-item-section>
            <q-item-section side><status-chip :session="s" /></q-item-section>
          </q-item>
        </q-list>
      </q-card>
    </section>
    <q-inner-loading :showing="library.loading && !library.loaded" />
  </q-page>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useLibraryStore } from '../stores/library'
import { useNotificationsStore } from '../stores/notifications'
import StatusChip from '../components/StatusChip.vue'
import { initials, plural } from '../util/format'
import { kindOf } from '../util/status'

const auth = useAuthStore()
const library = useLibraryStore()
const notes = useNotificationsStore()
const firstName = computed(() => ((auth.user && auth.user.full_name) || 'there').split(/\s+/)[0])
const sorted = computed(() => [...library.allSessions].sort((a, b) => b.id - a.id))
const recent = computed(() => sorted.value.slice(0, 3))
const latestReady = computed(() => sorted.value.find((s) => s.state === 'done'))
const c = computed(() => library.counts)

const overview = computed(() => [
  { title: 'Record a lecture', sub: 'Sound only, or with the camera', icon: 'center_focus_strong', color: '#c10015', to: '/capture' },
  { title: 'My courses', sub: `${plural(c.value.courses, 'course')} · ${plural(c.value.modules, 'module')}`, icon: 'folder_open', color: '#1976d2', to: '/courses' },
  latestReady.value
    ? { title: 'Latest notes', sub: latestReady.value.title, icon: 'description', color: '#e08a00', to: `/sessions/${latestReady.value.id}` }
    : { title: 'Latest notes', sub: 'Your notes appear here when a lecture is ready', icon: 'description', color: '#e08a00', to: '/courses' },
])
const tiles = computed(() => [
  { label: 'Lectures', value: c.value.lectures, icon: 'video_library', color: '#1976d2', to: '/courses' },
  { label: 'Notes ready', value: c.value.ready, icon: 'task_alt', color: '#21ba45', to: '/courses' },
  { label: 'Being processed', value: c.value.processing, icon: 'autorenew', color: '#e08a00', to: '/courses' },
  { label: 'Unread alerts', value: notes.unread, icon: 'notifications_none', color: '#c10015', to: '/notifications' },
])
</script>

<style scoped>
.lk-dash { padding: calc(var(--lk-safe-top) + 14px) 16px 24px; background: radial-gradient(700px 320px at 20% -5%, rgba(25, 118, 210, 0.16), transparent 70%), var(--lk-bg); }
.lk-greet { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.lk-welcome { margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.01em; line-height: 1.2; }
.lk-round, .lk-avatar { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; position: relative; flex: none; text-decoration: none; }
.lk-round { background: var(--lk-surface); color: var(--lk-text); box-shadow: var(--lk-shadow); }
.lk-avatar { background: linear-gradient(135deg, #1565c0, #2196f3); color: #fff; font-weight: 500; }
.lk-block { margin-bottom: 22px; }
.lk-block-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 10px; }
.lk-block-head h2 { margin: 0; font-size: 20px; font-weight: 700; color: var(--lk-text-2); }
.lk-ov { display: flex; align-items: center; gap: 14px; background: var(--lk-surface); border: 1px solid var(--lk-border); border-radius: 16px; padding: 14px 14px 14px 16px; margin-bottom: 10px; box-shadow: var(--lk-shadow); text-decoration: none; color: var(--lk-text); min-height: 68px; }
.lk-ov-title { display: block; font-size: 16px; font-weight: 600; }
.lk-ov-sub { display: block; font-size: 13px; color: var(--lk-text-2); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 220px; }
.lk-go { width: 34px; height: 34px; border-radius: 50%; background: var(--lk-tint); color: var(--lk-link); display: grid; place-items: center; flex: none; }
.lk-tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.lk-tile { background: var(--lk-surface); border: 1px solid var(--lk-border); border-radius: 16px; padding: 16px; display: flex; flex-direction: column; gap: 6px; box-shadow: var(--lk-shadow); text-decoration: none; color: var(--lk-text); }
.lk-tile-label { font-size: 13px; color: var(--lk-text-2); margin-top: 6px; }
.lk-tile-num { font-size: 26px; font-weight: 700; line-height: 1; }
</style>
