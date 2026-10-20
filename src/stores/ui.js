import { defineStore } from 'pinia'
import { Dark } from 'quasar'

const KEY = 'lk_theme'                                  // 'auto' (follow the system), 'light' or 'dark'
const read = () => { try { return localStorage.getItem(KEY) || 'auto' } catch { return 'auto' } }

export function applyTheme(mode) {
  Dark.set(mode === 'dark' ? true : mode === 'light' ? false : 'auto')
}

export const useUiStore = defineStore('ui', {
  state: () => ({ theme: read() }),
  getters: { isDark: () => Dark.isActive },
  actions: {
    setTheme(mode) {
      this.theme = mode
      try { localStorage.setItem(KEY, mode) } catch { /* private window */ }
      applyTheme(mode)
    },
    toggleDark() {
      this.setTheme(Dark.isActive ? 'light' : 'dark')
    },
  },
})
