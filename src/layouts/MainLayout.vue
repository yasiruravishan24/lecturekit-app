<template>
  <q-layout view="hHh lpR fFf">
    <q-header v-if="!route.meta.bare" class="lk-bar">
      <q-toolbar class="lk-toolbar">
        <q-btn v-if="route.meta.back" flat round dense icon="arrow_back" aria-label="Back" @click="goBack" />
        <q-toolbar-title class="lk-bar-title">{{ title }}</q-toolbar-title>
      </q-toolbar>
    </q-header>
    <q-page-container>
      <unsent-banner v-if="route.meta.tab && route.meta.tab !== 'capture'" />
      <router-view @title="(t) => (pageTitle = t)" />
    </q-page-container>

    <q-footer v-if="showTabs" class="lk-tabs-bar">
      <nav class="lk-tabbar" aria-label="Main">
        <router-link to="/" class="lk-tab" :class="{ on: route.meta.tab === 'home' }"><q-icon name="home" size="26px" /><span>Home</span></router-link>
        <router-link to="/courses" class="lk-tab" :class="{ on: route.meta.tab === 'courses' }"><q-icon name="folder" size="26px" /><span>Courses</span></router-link>
        <router-link to="/capture" class="lk-tab lk-tab-rec" :class="{ on: route.meta.tab === 'capture' }" aria-label="Record a lecture"><span class="lk-rec-btn"><q-icon name="center_focus_strong" size="28px" /></span><span>Capture</span></router-link>
        <router-link to="/notifications" class="lk-tab" :class="{ on: route.meta.tab === 'notifications' }">
          <span class="lk-tab-icon"><q-icon name="notifications" size="26px" /><q-badge v-if="notes.unread" color="negative" rounded floating>{{ notes.unread > 9 ? '9+' : notes.unread }}</q-badge></span><span>Alerts</span>
        </router-link>
        <router-link to="/settings" class="lk-tab" :class="{ on: route.meta.tab === 'settings' }"><q-icon name="person" size="26px" /><span>Account</span></router-link>
      </nav>
    </q-footer>
  </q-layout>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useLibraryStore } from '../stores/library'
import { useNotificationsStore } from '../stores/notifications'
import { useRealtimeStore } from '../stores/realtime'
import { useRecordingStore } from '../stores/recording'
import UnsentBanner from '../components/UnsentBanner.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const library = useLibraryStore()
const notes = useNotificationsStore()
const realtime = useRealtimeStore()
const recording = useRecordingStore()
const showTabs = computed(() => !!route.meta.tab && !recording.active)       // the tab bar is hidden while recording, so a tap cannot leave the recording screen
const pageTitle = ref('')
const title = computed(() => pageTitle.value || route.meta.title || 'Lecture Assistant')
watch(() => route.fullPath, () => { pageTitle.value = '' })
watch(() => recording.phase, (p) => { if (p === 'idle') recording.checkUnsent().catch(() => {}) })

const goBack = () => (window.history.length > 1 ? router.back() : router.replace('/'))

// one WebSocket tells the app what changes (the extension, the web app, another phone): lists and notifications update by themselves
let timer = null
onMounted(async () => {
  recording.checkUnsent().catch(() => {})
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
.lk-bar { color: #fff; }
.lk-toolbar { min-height: 52px; padding: 0 8px; }
.lk-bar-title { font-size: 20px; font-weight: 500; padding-left: 8px; }
</style>
