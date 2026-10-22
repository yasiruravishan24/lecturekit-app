// The plain parts of Google sign-in on the phone (no plugins, so they can be tested without the app).
export const schemeFor = (clientId) => `com.googleusercontent.apps.${String(clientId).replace(/\.apps\.googleusercontent\.com$/, '')}`
export const redirectFor = (clientId) => `${schemeFor(clientId)}:/oauth2redirect`

const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
export const random = (n = 32) => b64url(crypto.getRandomValues(new Uint8Array(n)))

// the secret the phone keeps (verifier) and its fingerprint that goes to Google (challenge)
export async function pkcePair() {
  const verifier = random(48)
  if (globalThis.crypto && crypto.subtle) {
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
    return { verifier, challenge: b64url(digest), method: 'S256' }
  }
  return { verifier, challenge: verifier, method: 'plain' }
}

export function buildAuthUrl({ clientId, challenge, method, state, nonce }) {
  return `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
    client_id: clientId, redirect_uri: redirectFor(clientId), response_type: 'code', scope: 'openid email profile',
    code_challenge: challenge, code_challenge_method: method, state, nonce, prompt: 'select_account',
  })}`
}

// what Google sent back to the app's address: { code } or { error }
export function parseRedirect(url, state) {
  const q = new URL(String(url).replace(/^[^:]+:\//, 'https://app/')).searchParams
  if (q.get('error')) return { error: q.get('error') }
  if (q.get('state') !== state) return { error: 'state_mismatch' }
  return { code: q.get('code') }
}

