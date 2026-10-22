import test from 'node:test'
import assert from 'node:assert/strict'
import { buildAuthUrl, parseRedirect, pkcePair, redirectFor, schemeFor } from '../../src/util/googlePkce.js'

const ID = '358728206200-b62eg6beup53egu3dg6bj5gd5c6s205p.apps.googleusercontent.com'

test('the app address Google sends the person back to is the reversed client ID', () => {
  assert.equal(schemeFor(ID), 'com.googleusercontent.apps.358728206200-b62eg6beup53egu3dg6bj5gd5c6s205p')
  assert.equal(redirectFor(ID), 'com.googleusercontent.apps.358728206200-b62eg6beup53egu3dg6bj5gd5c6s205p:/oauth2redirect')
})

test('the sign-in address asks for a code with a challenge, and for the basic scopes only', () => {
  const u = new URL(buildAuthUrl({ clientId: ID, challenge: 'abc', method: 'S256', state: 's1', nonce: 'n1' }))
  assert.equal(u.origin + u.pathname, 'https://accounts.google.com/o/oauth2/v2/auth')
  const q = u.searchParams
  assert.equal(q.get('client_id'), ID)
  assert.equal(q.get('response_type'), 'code')
  assert.equal(q.get('scope'), 'openid email profile')
  assert.equal(q.get('code_challenge'), 'abc')
  assert.equal(q.get('code_challenge_method'), 'S256')
  assert.equal(q.get('state'), 's1')
  assert.equal(q.get('redirect_uri'), redirectFor(ID))
})

test('the answer from Google: a code, an error, or an answer to somebody else (wrong state)', () => {
  const base = redirectFor(ID)
  assert.deepEqual(parseRedirect(`${base}?state=s1&code=4%2Fabc`, 's1'), { code: '4/abc' })
  assert.deepEqual(parseRedirect(`${base}?error=access_denied&state=s1`, 's1'), { error: 'access_denied' })
  assert.deepEqual(parseRedirect(`${base}?state=other&code=x`, 's1'), { error: 'state_mismatch' })
})

test('the challenge is the fingerprint of the verifier (SHA-256, base64url), and the verifier is never sent', async () => {
  const { verifier, challenge, method } = await pkcePair()
  assert.equal(method, 'S256')
  assert.ok(verifier.length >= 43 && /^[A-Za-z0-9_-]+$/.test(verifier))
  const again = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))).toString('base64url')
  assert.equal(challenge, again)
  assert.notEqual(challenge, verifier)
})
