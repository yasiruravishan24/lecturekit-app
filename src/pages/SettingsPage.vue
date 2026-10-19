<template>
  <q-page class="lk-page">
    <q-card flat class="lk-card lk-pad q-mb-md">
      <div class="row items-center no-wrap">
        <q-avatar size="56px" color="primary" text-color="white" class="q-mr-md">{{ initials(auth.user && auth.user.full_name, auth.user && auth.user.email) }}</q-avatar>
        <div class="col" style="min-width: 0">
          <div class="lk-section-title ellipsis">{{ auth.user && auth.user.full_name }}</div>
          <div class="lk-meta ellipsis">{{ auth.user && auth.user.email }}</div>
        </div>
      </div>
    </q-card>

    <q-card flat class="lk-card q-mb-md">
      <q-item tag="label">
        <q-item-section><q-item-label>Send on Wi-Fi only</q-item-label><q-item-label caption>Recordings wait for Wi-Fi instead of using mobile data.</q-item-label></q-item-section>
        <q-item-section side><q-toggle :model-value="settings.wifiOnly" @update:model-value="settings.setWifiOnly" /></q-item-section>
      </q-item>
      <q-separator />
      <q-item clickable to="/spike"><q-item-section><q-item-label>Recording test</q-item-label><q-item-label caption>Check that this phone can record in the background</q-item-label></q-item-section><q-item-section side><q-icon name="chevron_right" /></q-item-section></q-item>
    </q-card>

    <q-card flat class="lk-card lk-pad q-mb-md">
      <div class="lk-label q-mb-sm">Server</div>
      <div class="lk-meta">{{ settings.server }}</div>
    </q-card>

    <q-card flat class="lk-card lk-pad q-mb-md">
      <div class="lk-label q-mb-sm">Recordings on this phone</div>
      <div class="lk-meta">Recordings are kept on the phone until they have been sent and the notes are made. The files are in the app's own storage.</div>
    </q-card>

    <q-btn outline no-caps color="primary" class="full-width q-mb-sm" icon="logout" label="Log out" @click="logout" />
    <q-btn flat no-caps color="negative" class="full-width" icon="delete_forever" label="Delete account" @click="confirmDelete" />
  </q-page>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import * as authApi from '../api/auth'
import { useAuthStore } from '../stores/auth'
import { useLibraryStore } from '../stores/library'
import { useNotificationsStore } from '../stores/notifications'
import { useRealtimeStore } from '../stores/realtime'
import { useSettingsStore } from '../stores/settings'
import { friendly } from '../util/errors'
import { initials } from '../util/format'

const $q = useQuasar()
const router = useRouter()
const auth = useAuthStore()
const library = useLibraryStore()
const settings = useSettingsStore()

function out() {
  useRealtimeStore().stop()
  useNotificationsStore().reset()
  auth.logout()
  library.reset()
  router.replace('/login')
}
const logout = out
function confirmDelete() {
  $q.dialog({ title: 'Delete your account?', message: `Your courses, lectures, recordings, notes and quizzes are deleted for good. Type ${auth.user && auth.user.email} to confirm.`, prompt: { model: '', outlined: true }, cancel: true, persistent: true,
    ok: { label: 'Delete account', color: 'negative', unelevated: true } })
    .onOk(async (typed) => {
      if (String(typed).trim().toLowerCase() !== (auth.user.email || '').toLowerCase()) return $q.notify({ type: 'negative', message: 'The email does not match.' })
      try { await authApi.deleteAccount(); out() } catch (e) { $q.notify({ type: 'negative', message: friendly(e) }) }
    })
}
</script>

<style scoped>.lk-pad { padding: 16px; }</style>
