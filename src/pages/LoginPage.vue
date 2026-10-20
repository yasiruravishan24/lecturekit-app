<template>
  <div>
    <form @submit.prevent="submit">
      <h1 class="text-h5 q-mt-none q-mb-md" style="font-weight: 400">Log in</h1>
      <div v-if="info" class="lk-info" role="status">{{ info }}</div>
      <div v-if="error" class="lk-error" role="alert">{{ error }}</div>
      <q-input v-model="email" type="email" label="Email" outlined autocomplete="username" inputmode="email" autocapitalize="off" class="q-mb-md" hide-bottom-space :disable="busy"><template #prepend><q-icon name="mail" /></template></q-input>
      <q-input v-model="password" :type="show ? 'text' : 'password'" label="Password" outlined autocomplete="current-password" class="q-mb-md" hide-bottom-space :disable="busy">
        <template #prepend><q-icon name="lock" /></template>
        <template #append><q-icon :name="show ? 'visibility_off' : 'visibility'" class="cursor-pointer" aria-label="Show password" @click="show = !show" /></template>
      </q-input>
      <q-btn type="submit" unelevated color="primary" size="lg" no-caps label="Log in" class="full-width" style="height: 44px" :loading="busy" :disable="!email || !password" />
      <div class="lk-or"><span>or</span></div>
      <q-btn outline no-caps class="full-width lk-google" style="height: 44px" disable>
        <svg class="lk-g" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.8 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
        Continue with Google
      </q-btn>
      <div class="text-center q-mt-md lk-meta">New here? <router-link to="/register" class="lk-link">Create an account</router-link></div>
    </form>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { friendly, isCode } from '../util/errors'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const email = ref(String(route.query.email || ''))
const password = ref('')
const show = ref(false)
const busy = ref(false)
const error = ref('')
const info = ref(route.query.confirmed ? 'Your email is confirmed. Log in to continue.' : route.query.reason === 'expired' ? 'Your session ended. Please log in again.' : '')

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
.lk-or { display: flex; align-items: center; gap: 10px; color: var(--lk-text-2); font-size: 12px; margin: 14px 0; }
.lk-or::before, .lk-or::after { content: ''; flex: 1; height: 1px; background: var(--lk-border); }
</style>
