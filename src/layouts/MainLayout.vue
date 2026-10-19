<template>
  <q-layout view="hHh lpR fFf">
    <q-header class="lk-bar">
      <q-toolbar>
        <q-btn v-if="route.meta.back" flat round dense icon="arrow_back" aria-label="Back" @click="goBack" />
        <q-toolbar-title class="lk-bar-title">{{ title }}</q-toolbar-title>
        <template v-if="route.name === 'home'">
          <q-btn flat round dense icon="notifications" aria-label="Notifications" class="q-mr-xs" to="/notifications">
            <q-badge v-if="notes.unread" color="negative" floating rounded>{{ notes.unread > 9 ? '9+' : notes.unread }}</q-badge>
          </q-btn>
          <q-btn flat round dense icon="person" aria-label="Account" class="q-mr-xs" to="/settings" />
          <q-btn flat round dense icon="add" aria-label="Add a course or module" @click="$emit('add')" />
        </template>
      </q-toolbar>
    </q-header>
    <q-page-container><router-view @title="(t) => (pageTitle = t)" /></q-page-container>
  </q-layout>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useLibraryStore } from '../stores/library'
import { useNotificationsStore } from '../stores/notifications'
import { useRealtimeStore } from '../stores/realtime'

defineEmits(['add'])
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const library = useLibraryStore()
const notes = useNotificationsStore()
const realtime = useRealtimeStore()
const pageTitle = ref('')
const title = computed(() => pageTitle.value || route.meta.title || 'Lecture Assistant')
watch(() => route.fullPath, () => { pageTitle.value = '' })
const goBack = () => (window.history.length > 1 ? router.back() : router.replace('/'))

// one WebSocket tells the app what changes (the extension, the web app, another phone): lists and notifications update by themselves
let timer = null
onMounted(async () => {
  try { await auth.check() } catch { /* offline: the pages show their own message */ }
  if (!auth.loggedIn) return
  notes.load()
  realtime.start()
  library.load().catch(() => {})
  timer = setInterval(() => { if (!realtime.connected && !document.hidden) library.refresh().catch(() => {}) }, 8000)      // the fallback when the socket is down
})
onBeforeUnmount(() => { clearInterval(timer); realtime.stop() })
</script>

<style scoped>
.lk-bar { background: var(--lk-primary); color: #fff; padding-top: var(--lk-safe-top); }
.lk-bar-title { font-size: 20px; font-weight: 500; }
</style>
