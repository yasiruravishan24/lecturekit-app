<template>
  <q-card flat class="lk-card lk-auth-card">
    <form @submit.prevent="submit" novalidate>
      <h1 class="lk-title">Create an account</h1>
      <div v-if="error" class="lk-error" role="alert">{{ error }}</div>
      <q-input v-model="fullName" label="Full name" outlined autocomplete="name" class="q-mb-sm" :error="!!errors.fullName" :error-message="errors.fullName" :disable="busy" />
      <q-input v-model="email" type="email" label="Email" outlined autocomplete="email" inputmode="email" autocapitalize="off" class="q-mb-sm" :error="!!errors.email" :error-message="errors.email" :disable="busy" />
      <q-input v-model="password" :type="show ? 'text' : 'password'" label="Password" outlined autocomplete="new-password" class="q-mb-sm" :error="!!errors.password" :error-message="errors.password" hint="At least 8 characters" :disable="busy">
        <template #append><q-icon :name="show ? 'visibility_off' : 'visibility'" class="cursor-pointer" aria-label="Show password" @click="show = !show" /></template>
      </q-input>
      <q-checkbox v-model="terms" class="q-mt-sm" :disable="busy">
        <span>I agree to the <a :href="`${site}/terms`" target="_blank" rel="noopener" class="text-primary" @click.stop>Terms &amp; Conditions</a> and the <a :href="`${site}/privacy`" target="_blank" rel="noopener" class="text-primary" @click.stop>Privacy Policy</a></span>
      </q-checkbox>
      <div v-if="errors.terms" class="text-negative text-caption q-mb-sm">{{ errors.terms }}</div>
      <q-btn type="submit" unelevated color="primary" size="lg" no-caps label="Create account" class="full-width q-mt-md" :loading="busy" />
      <div class="text-center q-mt-md">Already have an account? <router-link to="/login" class="text-primary">Log in</router-link></div>
    </form>
  </q-card>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import * as authApi from '../api/auth'
import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/settings'
import { friendly, isCode } from '../util/errors'
import { isNative } from '../util/platform'

const router = useRouter()
const auth = useAuthStore()
const settings = useSettingsStore()
const site = computed(() => (isNative() ? settings.server : ''))
const fullName = ref('')
const email = ref('')
const password = ref('')
const terms = ref(false)
const show = ref(false)
const busy = ref(false)
const error = ref('')
const errors = reactive({ fullName: '', email: '', password: '', terms: '' })

function validate() {
  errors.fullName = fullName.value.trim() ? '' : 'Enter your name'
  errors.email = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value.trim()) ? '' : 'Enter a valid email address'
  errors.password = password.value.length >= 8 ? '' : 'Use at least 8 characters'
  errors.terms = terms.value ? '' : 'Please agree to the Terms & Conditions and the Privacy Policy'
  return !Object.values(errors).some(Boolean)
}

async function submit() {
  error.value = ''
  if (!validate()) return
  busy.value = true
  try {
    const cleanEmail = email.value.trim().toLowerCase()
    await authApi.register({ full_name: fullName.value.trim(), email: cleanEmail, password: password.value, accept_terms: true })
    auth.pendingPassword = password.value
    router.push({ name: 'verify', query: { email: cleanEmail, sent: '1' } })
  } catch (e) {
    error.value = isCode(e, 'email_taken') ? 'That email is already registered.' : friendly(e)
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.lk-auth-card { padding: 22px; }
</style>
