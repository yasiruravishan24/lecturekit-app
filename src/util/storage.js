// Where the app keeps things. The login token goes to the iPhone keychain (secure); settings go to plain preferences.
// In a browser (development, tests) both fall back to localStorage.
import { Preferences } from '@capacitor/preferences'
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'
import { isNative } from './platform'

export const secure = {
  async get(key) {
    if (!isNative()) return localStorage.getItem(key)
    try { return (await SecureStoragePlugin.get({ key })).value } catch { return null }
  },
  async set(key, value) {
    if (!isNative()) return localStorage.setItem(key, value)
    await SecureStoragePlugin.set({ key, value })
  },
  async remove(key) {
    if (!isNative()) return localStorage.removeItem(key)
    try { await SecureStoragePlugin.remove({ key }) } catch { /* it was not there */ }
  },
}

export const prefs = {
  async get(key) { return isNative() ? (await Preferences.get({ key })).value : localStorage.getItem(key) },
  async set(key, value) { return isNative() ? Preferences.set({ key, value: String(value) }) : localStorage.setItem(key, String(value)) },
  async remove(key) { return isNative() ? Preferences.remove({ key }) : localStorage.removeItem(key) },
  async getJson(key, fallback) { try { const v = await this.get(key); return v ? JSON.parse(v) : fallback } catch { return fallback } },
  async setJson(key, value) { return this.set(key, JSON.stringify(value)) },
}
