// Set-up through the API (fast), so the browser tests can spend their time on what the browser shows.
import { execSync } from 'node:child_process'
import path from 'node:path'

export const root = path.resolve(import.meta.dirname, '../../..')      // the project folder (docker compose runs there)
export const sample = (name) => path.join(root, 'lecturekit-server/postman/sample-files', name)
export const PASSWORD = 'Passw0rd-for-tests'
const API = (process.env.LK_API || 'https://localhost:8443') + '/api'

async function call(method, url, token, body, form) {
  const res = await fetch(API + url, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: form || (body ? JSON.stringify(body) : undefined),
  })
  const text = await res.text()
  return { status: res.status, json: text ? JSON.parse(text) : null }
}

export const api = (method, url, user, body) => call(method, url, user.token, body)     // what another device (the extension, the phone) would do

export async function makeUser(label) {
  const email = `${label}${Date.now()}${Math.floor(Math.random() * 1000)}@example.com`
  const reg = await call('POST', '/auth/register', null, { full_name: `${label} Tester`, email, password: PASSWORD, accept_terms: true })
  if (reg.status !== 201) throw new Error(`register failed ${reg.status}`)
  execSync(`docker compose exec -T app python -m server.admin verify-email ${email}`, { cwd: root, stdio: 'ignore' })
  const login = await call('POST', '/auth/login', null, { email, password: PASSWORD })
  return { email, token: login.json.token, expires: login.json.expires_at }
}

export async function makeSession(user, title = 'Strings and input') {
  const course = (await call('POST', '/courses', user.token, { name: 'BSc Computing' })).json
  const module = (await call('POST', `/courses/${course.id}/modules`, user.token, { name: 'Programming Fundamentals' })).json
  const session = (await call('POST', `/modules/${module.id}/sessions`, user.token, { title })).json
  return { course, module, session }
}

export async function upload(user, sessionId, recordings, slides = []) {
  const { readFileSync } = await import('node:fs')
  const form = new FormData()
  for (const [name, bytes] of recordings) form.append('recording', new Blob([bytes]), name)
  for (const f of slides) form.append('slides', new Blob([readFileSync(sample(f))]), f)
  return call('POST', `/sessions/${sessionId}/upload`, user.token, null, form)
}

export const startProcessing = (user, id) => call('POST', `/sessions/${id}/process`, user.token)

export async function waitDone(user, jobId) {
  for (let i = 0; i < 200; i++) {
    const job = (await call('GET', `/jobs/${jobId}`, user.token)).json
    if (job.state === 'done' || job.state === 'failed') return job
    await new Promise((r) => setTimeout(r, 2000))
  }
  throw new Error('job did not finish')
}

// open the app already logged in
export async function loginAs(page, user) {
  await page.addInitScript(([t, e]) => { localStorage.setItem('lk_token', t); localStorage.setItem('lk_expires', e) }, [user.token, user.expires])
}
