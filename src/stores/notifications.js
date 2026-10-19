import { defineStore } from 'pinia'
import * as api from '../api/notifications'

// "Recording started", "Making your notes", "Notes are ready", "Processing failed", "Replay is ready". They live on the server, so every
// device shows the same list; new ones arrive on the WebSocket (stores/realtime.js) without a refresh.
export const useNotificationsStore = defineStore('notifications', {
  state: () => ({ items: [], unread: 0, loaded: false }),
  actions: {
    async load() {
      try {
        const r = await api.listNotifications()
        this.items = r.items
        this.unread = r.unread
        this.loaded = true
      } catch { /* the bell stays as it is */ }
    },
    push(n) {                                            // one that just arrived on the socket
      if (this.items.some((x) => x.id === n.id)) return
      this.items = [n, ...this.items].slice(0, 50)
      if (!n.read) this.unread += 1
    },
    async markRead(id) {
      const n = this.items.find((x) => x.id === id)
      if (!n || n.read) return
      n.read = true
      this.unread = Math.max(0, this.unread - 1)
      api.markRead(id).catch(() => {})
    },
    async markAllRead() {
      this.items.forEach((n) => { n.read = true })
      this.unread = 0
      api.markAllRead().catch(() => {})
    },
    async clear() {
      this.items = []
      this.unread = 0
      api.clearNotifications().catch(() => {})
    },
    reset() { this.items = []; this.unread = 0; this.loaded = false },
  },
})
