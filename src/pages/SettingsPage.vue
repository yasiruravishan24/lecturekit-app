<template>
  <q-page class="lk-page">
    <!-- profile -->
    <q-card flat class="lk-card lk-profile q-mb-md">
      <q-avatar size="64px" font-size="24px" color="primary" text-color="white" style="font-weight: 500; border-radius: 50% !important; flex: none">{{ initials(auth.user && auth.user.full_name, auth.user && auth.user.email) }}</q-avatar>
      <div class="col" style="min-width: 0">
        <div class="lk-name ellipsis">{{ auth.user && auth.user.full_name }}</div>
        <div class="lk-meta ellipsis">{{ auth.user && auth.user.email }}</div>
        <div class="lk-chips">
          <span v-if="auth.user && auth.user.email_verified" class="lk-chip completed"><q-icon name="verified" size="14px" /> Email confirmed</span>
          <span v-if="auth.user && auth.user.google_linked" class="lk-chip info"><q-icon name="link" size="14px" /> Google linked</span>
          <span v-if="since" class="lk-chip idle">Member since {{ since }}</span>
        </div>
      </div>
    </q-card>

    <!-- appearance -->
    <q-card flat class="lk-card lk-pad q-mb-md">
      <div class="lk-label q-mb-xs">Appearance</div>
      <div class="lk-meta q-mb-md">Choose how Lecture Assistant looks. System follows your phone.</div>
      <q-btn-toggle :model-value="ui.theme" no-caps unelevated spread toggle-color="primary" class="lk-seg" aria-label="Theme" @update:model-value="ui.setTheme"
                    :options="[{ label: 'Light', value: 'light', icon: 'light_mode' }, { label: 'Dark', value: 'dark', icon: 'dark_mode' }, { label: 'System', value: 'auto', icon: 'brightness_auto' }]" />
    </q-card>

    <!-- sending (this phone only) -->
    <q-card flat class="lk-card q-mb-md">
      <q-item tag="label">
        <q-item-section avatar><q-icon name="wifi" color="primary" /></q-item-section>
        <q-item-section><q-item-label>Send recordings on Wi-Fi only</q-item-label><q-item-label caption>Wait for Wi-Fi instead of using mobile data.</q-item-label></q-item-section>
        <q-item-section side><q-toggle :model-value="settings.wifiOnly" @update:model-value="settings.setWifiOnly" /></q-item-section>
      </q-item>
    </q-card>

    <!-- password: only for an account that logs in with a password -->
    <q-card v-if="auth.user && auth.user.email_login" flat class="lk-card lk-pad q-mb-md">
      <div class="lk-label q-mb-xs">Password</div>
      <div class="lk-meta q-mb-md">Change the password you use to log in with your email.</div>
      <q-btn outline no-caps color="primary" icon="lock_reset" label="Change password" class="full-width" @click="pwOpen = true" />
    </q-card>

    <!-- legal -->
    <q-card flat class="lk-card q-mb-md">
      <div class="lk-label lk-pad q-pb-none">Legal</div>
      <q-list>
        <q-item clickable @click="openWeb('/terms')"><q-item-section avatar><q-icon name="gavel" /></q-item-section><q-item-section>Terms &amp; Conditions</q-item-section><q-item-section side><q-icon name="open_in_new" size="18px" /></q-item-section></q-item>
        <q-separator />
        <q-item clickable @click="openWeb('/privacy')"><q-item-section avatar><q-icon name="privacy_tip" /></q-item-section><q-item-section>Privacy Policy</q-item-section><q-item-section side><q-icon name="open_in_new" size="18px" /></q-item-section></q-item>
      </q-list>
    </q-card>

    <!-- storage -->
    <q-card flat class="lk-card lk-pad q-mb-md">
      <div class="lk-label q-mb-md">Storage</div>
      <div class="lk-store"><b>{{ formatSize(usage.used_bytes) }}</b><span class="lk-meta">of {{ limits.max_storage_gb }} GB used</span><span class="lk-pct">{{ pct }}%</span></div>
      <q-linear-progress :value="usedShare" rounded size="10px" :color="usedShare > 0.9 ? 'negative' : 'primary'" :track-color="$q.dark.isActive ? 'blue-grey-9' : 'blue-1'" aria-label="Storage used" />
      <div class="lk-facts">
        <div><b>{{ counts.lectures }}</b><span>Lectures</span></div>
        <div><b>{{ counts.courses }}</b><span>Courses</span></div>
        <div><b>{{ limits.daily_limit }}</b><span>Lectures a day</span></div>
      </div>
      <div class="lk-meta">Your recordings are kept for replay until you delete the lecture. Delete lectures you no longer need to free space.</div>
    </q-card>

    <q-btn outline no-caps color="primary" class="full-width q-mb-md" icon="logout" label="Log out" @click="logout" />

    <!-- danger zone -->
    <q-card flat class="lk-card lk-pad lk-danger">
      <div class="lk-label q-mb-sm text-negative">Danger zone</div>
      <div class="lk-meta q-mb-md"><b>Delete account</b><br>Removes your courses, lectures, recordings, notes and quizzes for good.</div>
      <q-btn outline no-caps color="negative" icon="delete_forever" label="Delete account" class="full-width" @click="confirmDelete" />
    </q-card>

    <q-dialog v-model="pwOpen" persistent @hide="resetPw">
      <q-card class="lk-dialog">
        <q-form @submit.prevent="changePw">
          <q-card-section>
            <div class="text-h6">Change password</div>
            <q-input v-model="pw.current" :type="pw.show ? 'text' : 'password'" outlined label="Current password" autocomplete="current-password" class="q-mt-md" />
            <q-input v-model="pw.next" :type="pw.show ? 'text' : 'password'" outlined label="New password" autocomplete="new-password" hint="At least 8 characters" class="q-mt-md" />
            <q-input v-model="pw.again" :type="pw.show ? 'text' : 'password'" outlined label="New password again" autocomplete="new-password" class="q-mt-md" />
            <q-checkbox v-model="pw.show" dense label="Show passwords" class="q-mt-sm" />
            <div v-if="pwError" class="lk-error q-mt-md" role="alert">{{ pwError }}</div>
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat no-caps color="primary" label="Cancel" v-close-popup />
            <q-btn type="submit" unelevated no-caps color="primary" label="Change password" :disable="!pw.current || pw.next.length < 8 || pw.next !== pw.again" :loading="pwBusy" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import * as authApi from '../api/auth'
import { useAuthStore } from '../stores/auth'
import { useLibraryStore } from '../stores/library'
import { useNotificationsStore } from '../stores/notifications'
import { useRealtimeStore } from '../stores/realtime'
import { useSettingsStore } from '../stores/settings'
import { useUiStore } from '../stores/ui'
import { friendly } from '../util/errors'
import { formatDate, formatSize, initials } from '../util/format'
import { isNative } from '../util/platform'

const $q = useQuasar()
const router = useRouter()
const auth = useAuthStore()
const library = useLibraryStore()
const settings = useSettingsStore()
const ui = useUiStore()

const counts = computed(() => library.counts)
const limits = computed(() => auth.limits)
const since = computed(() => (auth.user && auth.user.created_at ? formatDate(auth.user.created_at) : ''))
const usage = ref({ used_bytes: 0, limit_bytes: 1 })
const usedShare = computed(() => Math.min(1, usage.value.used_bytes / Math.max(1, usage.value.limit_bytes)))
const pct = computed(() => (usedShare.value < 0.01 && usage.value.used_bytes ? '<1' : Math.round(usedShare.value * 100)))
onMounted(() => { authApi.getUsage().then((u) => { usage.value = u }).catch(() => {}) })

// the terms and the privacy policy are pages of the web app: they open in the phone's browser
const openWeb = (path) => window.open(`${isNative() ? settings.server : window.location.origin}${path}`, '_blank')

const pwOpen = ref(false)
const pw = reactive({ current: '', next: '', again: '', show: false })
const pwError = ref('')
const pwBusy = ref(false)
const resetPw = () => { Object.assign(pw, { current: '', next: '', again: '', show: false }); pwError.value = '' }
async function changePw() {
  pwBusy.value = true
  pwError.value = ''
  try {
    await authApi.changePassword(pw.current, pw.next)
    pwOpen.value = false
    $q.notify({ type: 'positive', message: 'Your password was changed.' })
  } catch (e) {
    pwError.value = e.code === 'bad_current_password' ? 'The current password is wrong.' : friendly(e)
  } finally {
    pwBusy.value = false
  }
}

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

<style scoped>
.lk-pad { padding: 16px; }
.lk-profile { display: flex; align-items: center; gap: 16px; padding: 18px; }
.lk-name { font-size: 19px; font-weight: 500; }
.lk-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.lk-seg { border: 1px solid var(--lk-border); border-radius: 8px; }
.lk-seg :deep(.q-btn:not(.bg-primary)) { background: var(--lk-surface) !important; color: var(--lk-text-2) !important; }
.lk-store { display: flex; align-items: baseline; gap: 8px; margin-bottom: 10px; }
.lk-store b { font-size: 26px; font-weight: 500; }
.lk-pct { margin-left: auto; font-weight: 500; color: var(--lk-primary); }
.lk-facts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 16px 0; }
.lk-facts > div { background: var(--lk-surface-2); border-radius: 12px; padding: 10px 4px; text-align: center; display: flex; flex-direction: column; }
.lk-facts b { font-size: 20px; font-weight: 500; }
.lk-facts span { font-size: 12px; color: var(--lk-text-2); }
.lk-danger { border-color: rgba(193, 0, 21, 0.35) !important; }
.lk-dialog { width: 100%; max-width: 420px; }
</style>
