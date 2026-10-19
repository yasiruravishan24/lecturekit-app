import { defineBoot } from '#q-app'
import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/settings'
import { setRouter } from '../stores/realtime'

// Before the first page: read the server address and the login from the phone, and tell the API client how to find them.
export default defineBoot(async ({ app, router }) => {
  const settings = useSettingsStore()
  const auth = useAuthStore()
  await settings.load()
  await auth.load()
  auth.wire(router)
  setRouter(router)
  if (import.meta.env.LK_SELFTEST) router.replace('/selftest')
})
