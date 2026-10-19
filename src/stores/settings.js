import { defineStore } from 'pinia'
import { prefs } from '../util/storage'
import { isNative } from '../util/platform'

// The server the app talks to. In a browser it is the page's own address (the dev server forwards /api); on the phone it is a
// full address: the default built in (LK_SERVER) or the one typed under "Server" on the log-in screen (a tunnel address changes).
const DEFAULT_SERVER = (import.meta.env.LK_SERVER || 'https://localhost:8443').replace(/\/+$/, '')

export const useSettingsStore = defineStore('settings', {
  state: () => ({ server: DEFAULT_SERVER, wifiOnly: false, loaded: false }),
  getters: {
    apiBase: (s) => (isNative() ? `${s.server}/api` : '/api'),
    wsUrl: (s) => (isNative() ? `${s.server.replace(/^http/, 'ws')}/api/ws` : `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/api/ws`),
  },
  actions: {
    async load() {
      if (this.loaded) return
      this.server = ((await prefs.get('lk_server')) || DEFAULT_SERVER).replace(/\/+$/, '')
      this.wifiOnly = (await prefs.get('lk_wifi_only')) === '1'
      this.loaded = true
    },
    async setServer(url) {
      const clean = String(url || '').trim().replace(/\/+$/, '')
      if (!/^https:\/\/[^/\s]+/i.test(clean)) throw new Error('The server address must start with https://')
      this.server = clean
      await prefs.set('lk_server', clean)
    },
    async setWifiOnly(on) {
      this.wifiOnly = on
      await prefs.set('lk_wifi_only', on ? '1' : '0')
    },
  },
})
