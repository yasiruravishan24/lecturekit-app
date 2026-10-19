import { defineStore } from 'pinia'
import * as authApi from '../api/auth'
import { configureClient } from '../api/client'
import { secure } from '../util/storage'
import { useSettingsStore } from './settings'

const KEY = 'lk_token'
const KEY_EXP = 'lk_expires'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: null,
    expiresAt: null,
    user: null,
    config: null,                 // from GET /auth/config: Google client id, the server limits and features
    checked: false,               // has the stored token been checked with /auth/me
    loaded: false,                // has the token been read from the keychain
    pendingPassword: '',          // in memory only, for the one flow register -> confirm -> log in
  }),
  getters: {
    loggedIn: (s) => !!s.token && (!s.expiresAt || new Date(s.expiresAt) > new Date()),
    limits: (s) => (s.config && s.config.limits) || { daily_limit: 10, keep_media_days: 7, max_recording_mb: 1500, max_slides_mb: 100, max_recording_parts: 10, max_storage_gb: 10 },
  },
  actions: {
    wire(router) {
      const settings = useSettingsStore()
      configureClient({
        getToken: () => this.token,
        getBase: () => settings.apiBase,
        unauthorized: () => {
          const had = !!this.token
          this.clear()
          if (had) router.push({ path: '/login', query: { reason: 'expired' } })
        },
      })
    },
    async load() {                // at start: the token lives in the keychain
      if (this.loaded) return
      this.token = await secure.get(KEY)
      this.expiresAt = await secure.get(KEY_EXP)
      this.loaded = true
    },
    async setSession({ token, expires_at, user }) {
      this.token = token
      this.expiresAt = expires_at
      this.user = user
      this.checked = true
      await secure.set(KEY, token)
      await secure.set(KEY_EXP, expires_at)
    },
    clear() {
      this.token = null
      this.expiresAt = null
      this.user = null
      this.checked = false
      secure.remove(KEY)
      secure.remove(KEY_EXP)
    },
    async loadConfig(force = false) {
      if (!this.config || force) this.config = await authApi.getConfig()
      return this.config
    },
    async login(email, password) {
      await this.setSession(await authApi.login(email, password))
    },
    async check() {
      if (this.checked || !this.token) return
      try {
        this.user = (await authApi.me()).user
        this.checked = true
      } catch (e) {
        if (e.status === 401) this.clear()
        else throw e
      }
    },
    logout() {
      this.clear()
    },
  },
})
