import { defineBoot } from '#q-app'
import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/settings'
import { setRouter } from '../stores/realtime'
import { applyTheme, useUiStore } from '../stores/ui'

// Before the first page: read the server address and the login from the phone, and tell the API client how to find them.
export default defineBoot(async ({ app, router }) => {
  if (import.meta.env.LK_SELFTEST) {                         // a self-test build shows errors on the screen, since there is no console on the phone
    const show = (m) => { const pre = document.createElement('pre'); pre.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#000;color:#ff8;font:11px monospace;margin:0;padding:6px;white-space:pre-wrap;max-height:50vh;overflow:auto'; pre.textContent = String(m); document.body.appendChild(pre) }
    window.addEventListener('error', (e) => show(`error: ${e.message} ${e.filename}:${e.lineno}`))
    window.addEventListener('unhandledrejection', (e) => show(`rejection: ${(e.reason && (e.reason.stack || e.reason.message)) || e.reason}`))
    app.config.errorHandler = (err, _i, info) => show(`vue: ${err && (err.stack || err.message)} (${info})`)
    router.onError((err) => show(`router: ${err && (err.stack || err.message)}`))
    router.afterEach((to) => show(`route ${to.fullPath} -> ${to.matched.map((m) => m.path || '(empty)').join(' > ')}`))
  }
  applyTheme(useUiStore().theme)                              // light, dark, or follow the phone: the same choice as on the web
  const settings = useSettingsStore()
  const auth = useAuthStore()
  await settings.load()
  await auth.load()
  auth.wire(router)
  setRouter(router)
  if (import.meta.env.LK_SELFTEST) {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
    const note = (m) => Filesystem.appendFile({ path: 'selftest-log.txt', data: `${new Date().toISOString()} ${m}\n`, directory: Directory.Documents, encoding: Encoding.UTF8 }).catch(() => {})
    window.__note = note
    note('boot')
    window.addEventListener('error', (e) => note(`error: ${e.message}`))
    window.addEventListener('unhandledrejection', (e) => note(`rejection: ${e.reason && (e.reason.message || e.reason)}`))
    router.afterEach((to) => note(`route ${to.fullPath}`))
    router.isReady().then(() => router.replace('/selftest'))      // after the first navigation, which would otherwise win
  }
})
