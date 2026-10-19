<template>
  <q-card flat class="lk-card lk-auth-card">
    <form @submit.prevent="submit">
      <h1 class="lk-title">Log in</h1>
      <div v-if="info" class="lk-info" role="status">{{ info }}</div>
      <div v-if="error" class="lk-error" role="alert">{{ error }}</div>
      <q-input v-model="email" type="email" label="Email" outlined autocomplete="username" inputmode="email" autocapitalize="off" class="q-mb-md" :disable="busy" />
      <q-input v-model="password" :type="show ? 'text' : 'password'" label="Password" outlined autocomplete="current-password" class="q-mb-md" :disable="busy">
        <template #append><q-icon :name="show ? 'visibility_off' : 'visibility'" class="cursor-pointer" aria-label="Show password" @click="show = !show" /></template>
      </q-input>
      <q-btn type="submit" unelevated color="primary" size="lg" no-caps label="Log in" class="full-width" :loading="busy" :disable="!email || !password" />
      <div class="lk-or"><span>or</span></div>
      <q-btn outline no-caps class="full-width" icon="login" label="Continue with Google" disable>
        <q-tooltip>Google sign-in is not available in the app yet</q-tooltip>
      </q-btn>
      <div class="text-center q-mt-md">New here? <router-link to="/register" class="text-primary">Create an account</router-link></div>
    </form>

    <q-expansion-item dense label="Server" class="q-mt-md lk-server" header-class="lk-meta">
      <div class="q-pt-sm">
        <q-input v-model="server" label="Server address" outlined dense inputmode="url" autocapitalize="off" hint="For testing: the https address of your tunnel" />
        <q-btn flat no-caps color="primary" label="Save address" class="q-mt-sm" @click="saveServer" />
      </div>
    </q-expansion-item>
  </q-card>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/settings'
import { friendly, isCode } from '../util/errors'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const settings = useSettingsStore()
const email = ref(String(route.query.email || ''))
const password = ref('')
const show = ref(false)
const busy = ref(false)
const error = ref('')
const info = ref(route.query.confirmed ? 'Your email is confirmed. Log in to continue.' : route.query.reason === 'expired' ? 'Your session ended. Please log in again.' : '')
const server = ref(settings.server)

async function saveServer() {
  try { await settings.setServer(server.value); info.value = 'Server address saved.'; error.value = '' } catch (e) { error.value = e.message }
}

async function submit() {
  error.value = ''
  info.value = ''
  busy.value = true
  try {
    await auth.login(email.value.trim().toLowerCase(), password.value)
    router.replace(String(route.query.redirect || '/'))
  } catch (e) {
    if (isCode(e, 'email_not_verified')) return router.push({ name: 'verify', query: { email: email.value.trim().toLowerCase() } })
    error.value = isCode(e, 'bad_credentials') ? 'Wrong email or password.' : friendly(e)
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.lk-auth-card { padding: 22px; }
.lk-or { display: flex; align-items: center; gap: 10px; color: var(--lk-text-2); font-size: 12px; margin: 14px 0; }
.lk-or::before, .lk-or::after { content: ''; flex: 1; height: 1px; background: var(--lk-border); }
</style>
