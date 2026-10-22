// Google sign-in on the phone: Google's page opens in the system browser, comes back to the app through the app's own address
// (com.googleusercontent.apps.<id>:/oauth2redirect), and the code is traded for an ID token with PKCE (no client secret on the phone).
// The ID token goes to our server exactly like the web app's (POST /auth/google).
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { CapacitorHttp } from '@capacitor/core'

import { buildAuthUrl, parseRedirect, pkcePair, random, redirectFor, schemeFor } from './googlePkce'

export async function googleIdToken(clientId) {
  const { verifier, challenge, method } = await pkcePair()
  const state = random(16)
  const nonce = random(16)
  const scheme = schemeFor(clientId)

  let settle
  const back = new Promise((resolve, reject) => { settle = { resolve, reject } })
  const subs = [
    await App.addListener('appUrlOpen', ({ url }) => { if (String(url).startsWith(`${scheme}:`)) settle.resolve(url) }),
    await Browser.addListener('browserFinished', () => setTimeout(() => settle.reject(Object.assign(new Error('cancelled'), { code: 'cancelled' })), 800)),
  ]
  try {
    await Browser.open({ url: buildAuthUrl({ clientId, challenge, method, state, nonce }), presentationStyle: 'popover' })
    const result = parseRedirect(await back, state)
    await Browser.close().catch(() => {})
    if (!result.code) throw Object.assign(new Error(result.error === 'access_denied' ? 'cancelled' : `Google said: ${result.error}`), { code: result.error === 'access_denied' ? 'cancelled' : 'google_error' })
    const res = await CapacitorHttp.post({
      url: 'https://oauth2.googleapis.com/token',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: { client_id: clientId, code: result.code, code_verifier: verifier, redirect_uri: redirectFor(clientId), grant_type: 'authorization_code' },
    })
    if (res.status !== 200 || !res.data || !res.data.id_token) throw Object.assign(new Error('Google did not give a sign-in token'), { code: 'google_error' })
    return res.data.id_token
  } finally {
    subs.forEach((s) => s.remove())
  }
}
