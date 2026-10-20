<template>
  <div>
    <h1 class="text-h5 q-mt-none q-mb-md" style="font-weight: 400">Confirm your email</h1>
    <p class="lk-meta">We sent a 6-digit code to <b>{{ email }}</b>. Enter it here.</p>
    <div v-if="info" class="lk-info" role="status">{{ info }}</div>
    <div v-if="error" class="lk-error" role="alert">{{ error }}</div>
    <q-input v-model="code" outlined label="6-digit code" inputmode="numeric" maxlength="6" autocomplete="one-time-code" class="lk-code" :disable="busy" autofocus
             @update:model-value="(v) => (code = String(v).replace(/\D/g, ''))" @keyup.enter="confirm" />
    <q-btn unelevated color="primary" size="lg" no-caps label="Confirm" class="full-width q-mt-md" :loading="busy" :disable="code.length !== 6" @click="confirm" />
    <q-btn flat no-caps color="primary" class="full-width q-mt-sm" :label="wait > 0 ? `Send a new code (${wait} s)` : 'Send a new code'" :disable="wait > 0" @click="resend" />
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as authApi from '../api/auth'
import { useAuthStore } from '../stores/auth'
import { friendly, isCode } from '../util/errors'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const email = String(route.query.email || '').toLowerCase()
const code = ref('')
const busy = ref(false)
const error = ref('')
const info = ref('')
const wait = ref(route.query.sent ? 60 : 0)
let timer = null

async function confirm() {
  if (code.value.length !== 6 || busy.value) return
  error.value = ''
  busy.value = true
  try {
    await authApi.verifyEmail(email, code.value)
    if (auth.pendingPassword) {
      const password = auth.pendingPassword
      auth.pendingPassword = ''
      await auth.login(email, password)
      router.replace('/')
    } else {
      router.replace({ name: 'login', query: { confirmed: '1', email } })
    }
  } catch (e) {
    error.value = isCode(e, 'invalid_code') ? 'That code is not right. Check the email and try again.' : friendly(e)
    code.value = ''
  } finally {
    busy.value = false
  }
}

async function resend() {
  error.value = ''
  info.value = ''
  try {
    await authApi.resendCode(email)
    info.value = 'If this address has an account waiting to be confirmed, a new code is on its way.'
    wait.value = 60
    code.value = ''
  } catch (e) {
    error.value = friendly(e)
  }
}

onMounted(() => {
  if (!email) router.replace('/login')
  timer = setInterval(() => { if (wait.value > 0) wait.value -= 1 }, 1000)
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<style scoped>
.lk-code :deep(input) { font-size: 24px; letter-spacing: 0.4em; text-align: center; }
</style>
