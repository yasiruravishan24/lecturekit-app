// The app in a browser (fake microphone), against the real local server. The native recorder is replaced by its browser version.
import { readFileSync } from 'node:fs'
import { test, expect } from '@playwright/test'
import { api, loginAs, makeSession, makeUser, PASSWORD, sample } from './helpers.js'

test('log in with a wrong and then the right password', async ({ page }) => {
  const user = await makeUser('m1')
  await page.goto('/#/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill('not-the-password')
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page.getByText('Wrong email or password.')).toBeVisible()
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page.getByText('Welcome back!')).toBeVisible()
  await page.getByLabel('Main').getByRole('link', { name: 'Courses' }).click()
  await expect(page.getByText('No courses yet')).toBeVisible()
})

test('record in parts, pause, stop: every part is sent and the notes are asked for', async ({ page }) => {
  const user = await makeUser('m2')
  const { module } = await makeSession(user, 'x')
  await loginAs(page, user)
  await page.addInitScript(() => localStorage.setItem('lk_test_chunk', '10'))            // 10-second parts, so the test is short
  let finished = null
  await page.route('**/api/sessions/*/live/finish*', (r) => { finished = r.request().url(); r.fulfill({ json: { job_id: 999 } }) })        // no speech in a fake microphone: do not make real notes
  await page.route('**/api/jobs/999', (r) => r.fulfill({ json: { id: 999, state: 'done', stage: 'done', percent: 100 } }))
  await page.goto(`/#/capture?module=${module.id}`)
  await page.getByLabel('Lecture title').fill('Fake microphone lecture')
  await page.getByRole('button', { name: 'Start recording' }).click()
  await expect(page.getByText(/REC 00:0/)).toBeVisible()
  await page.waitForTimeout(6000)
  await page.getByRole('button', { name: 'Pause' }).click()
  await expect(page.getByText(/PAUSED/)).toBeVisible()
  const frozen = await page.locator('.lk-panel-top').textContent()
  await page.waitForTimeout(2500)
  expect(await page.locator('.lk-panel-top').textContent()).toBe(frozen)                  // the clock stops while paused
  await page.getByRole('button', { name: 'Resume' }).click()
  await page.waitForTimeout(18000)                                                       // about 24 s recorded: parts 1, 2 and 3
  await page.getByRole('button', { name: 'Stop', exact: true }).click()
  await page.getByRole('button', { name: 'Stop', exact: true }).last().click()          // the confirmation
  await expect(page.getByRole('heading', { name: /Notes are ready/ }).or(page.getByText('Notes are ready'))).toBeVisible({ timeout: 60000 })
  const s = await api('GET', `/modules/${module.id}/sessions`, user)
  const id = s.json.at(-1).id                                                          // the newest lecture (the first one is the empty one the helper made)
  const status = await api('GET', `/sessions/${id}/live?total=3`, user)
  expect(status.json.received).toEqual([0, 1, 2])
  expect(status.json.missing).toEqual([])
  expect(finished).toContain('total=3')
  await page.screenshot({ path: 'test-results/done.png' })
})

test('camera mode: the parts that reach the server have picture and sound', async ({ page }) => {
  const user = await makeUser('m3')
  const { module } = await makeSession(user, 'x')
  await loginAs(page, user)
  await page.addInitScript(() => localStorage.setItem('lk_test_chunk', '10'))
  await page.route('**/api/sessions/*/live/finish*', (r) => r.fulfill({ json: { job_id: 998 } }))
  await page.route('**/api/jobs/998', (r) => r.fulfill({ json: { id: 998, state: 'done', stage: 'done', percent: 100 } }))
  await page.goto(`/#/capture?module=${module.id}`)
  await page.getByLabel('Lecture title').fill('Camera lecture')
  await page.getByRole('button', { name: 'Camera + sound' }).click()
  await expect.poll(() => page.locator('.lk-cam video').evaluate((v) => v.videoWidth), { timeout: 15000 }).toBeGreaterThan(0)      // the picture shows before recording
  await page.screenshot({ path: 'test-results/camera-ready.png' })
  await page.getByRole('button', { name: 'Start recording' }).click()
  await expect(page.getByText(/REC 00:0/)).toBeVisible()
  await expect.poll(() => page.locator('.lk-rec-video').evaluate((v) => v.videoWidth), { timeout: 10000 }).toBeGreaterThan(0)       // and while recording
  await page.screenshot({ path: 'test-results/camera-recording.png' })
  await page.waitForTimeout(14000)
  await page.getByRole('button', { name: 'Stop', exact: true }).click()
  await page.getByRole('button', { name: 'Stop', exact: true }).last().click()
  await expect(page.getByText('Notes are ready')).toBeVisible({ timeout: 60000 })
  const id = (await api('GET', `/modules/${module.id}/sessions`, user)).json.at(-1).id
  const status = await api('GET', `/sessions/${id}/live?total=2`, user)
  expect(status.json.received).toEqual([0, 1])
  const down = await fetch(`https://localhost:8443/api/sessions/${id}`, { headers: { Authorization: `Bearer ${user.token}` } }).then((r) => r.json())
  expect(down.id).toBe(id)
})

test('a recording that was never sent is offered again, and can be discarded', async ({ page }) => {
  const user = await makeUser('m4')
  const { module } = await makeSession(user, 'x')
  const made = await api('POST', `/modules/${module.id}/sessions`, user, { title: 'Cut short' })
  await loginAs(page, user)
  await page.addInitScript((id) => {
    localStorage.setItem('lk_recording', JSON.stringify({ sessionId: id, moduleId: 1, title: 'Cut short', folder: `s${id}`, chunkSeconds: 300, overlap: 5 }))
    localStorage.setItem('lk_queue', JSON.stringify([{ sessionId: id, index: 0, path: '/nowhere/chunk_00000.m4a', name: 'chunk_00000.m4a', seconds: 300, state: 'pending', at: Date.now() }]))
  }, made.json.id)
  await page.goto('/#/')
  await expect(page.getByText('A recording was not sent')).toBeVisible()
  await expect(page.getByText(/Cut short.*1 part saved/)).toBeVisible()
  await page.getByRole('button', { name: 'Discard' }).click()
  await page.getByRole('button', { name: 'Discard' }).last().click()
  await expect(page.getByText('A recording was not sent')).toHaveCount(0)
})

test('change the password in Settings', async ({ page }) => {
  const user = await makeUser('m5')
  await loginAs(page, user)
  await page.goto('/#/settings')
  await page.getByText('Manage account', { exact: true }).click()
  await page.getByText('The password you use to log in with your email').click()
  await page.getByLabel('Current password').fill('this is not it')
  await page.getByLabel('New password', { exact: true }).fill('a brand new secret')
  await page.getByLabel('New password again').fill('a brand new secret')
  await page.getByRole('button', { name: 'Change password' }).last().click()
  await expect(page.getByText('The current password is wrong.')).toBeVisible()
  await page.getByLabel('Current password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Change password' }).last().click()
  await expect(page.getByText('Your password was changed.')).toBeVisible()
  const again = await fetch('https://localhost:8443/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email, password: 'a brand new secret' }) })
  expect(again.status).toBe(200)
})

test('upload a recording and slides from the phone: the lecture is created and sent', async ({ page }) => {
  const user = await makeUser('m6')
  const { module } = await makeSession(user, 'x')
  await loginAs(page, user)
  let processed = false
  await page.route('**/api/sessions/*/process', (r) => { processed = true; r.fulfill({ json: { job_id: 997 } }) })        // no real notes: only the upload is tested
  await page.goto(`/#/upload?module=${module.id}`)
  await page.getByLabel('Lecture title').fill('Uploaded lecture')
  const rec = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Choose a file' }).click()
  await (await rec).setFiles(sample('sample-recording.m4a'))
  await expect(page.getByText('sample-recording.m4a')).toBeVisible()
  const sl = page.waitForEvent('filechooser')
  await page.getByText('Add slides to improve the notes').click()
  await (await sl).setFiles(sample('sample-slides.pdf'))
  await expect(page.getByText('sample-slides.pdf')).toBeVisible()
  await page.getByRole('button', { name: 'Create notes and quiz' }).click()
  await expect(page).toHaveURL(/#\/sessions\/\d+/)
  const id = Number(page.url().match(/sessions\/(\d+)/)[1])
  const s = await api('GET', `/sessions/${id}`, user)
  expect(s.json.title).toBe('Uploaded lecture')
  expect(s.json.files.map((f) => f.kind).sort()).toEqual(['recording', 'slides'])
  expect(processed).toBe(true)
})

test('Courses tab: five courses, a button for all of them, and the latest three lectures', async ({ page }) => {
  const user = await makeUser('m7')
  for (let i = 1; i <= 7; i += 1) {
    const c = await api('POST', '/courses', user, { name: `Course ${i}` })
    const m = await api('POST', `/courses/${c.json.id}/modules`, user, { name: 'Module' })
    if (i <= 4) await api('POST', `/modules/${m.json.id}/sessions`, user, { title: `Lecture ${i}` })
  }
  await loginAs(page, user)
  await page.goto('/#/courses')
  await expect(page.locator('.lk-course')).toHaveCount(5)
  await expect(page.locator('.lk-act')).toHaveCount(2)                                            // capture and upload come first
  await expect(page.getByText('Recent lectures')).toBeVisible()
  await expect(page.locator('a[href*="#/sessions/"]')).toHaveCount(3)                              // only the latest three
  await page.getByRole('link', { name: /View all courses \(7\)/ }).click()
  await expect(page.locator('.lk-course')).toHaveCount(7)
  await expect(page.getByText('Recent lectures')).toHaveCount(0)
})

test('a lecture that is being recorded by another device shows its progress', async ({ page }) => {
  const user = await makeUser('m8')
  const { module } = await makeSession(user, 'x')
  const made = (await api('POST', `/modules/${module.id}/sessions`, user, { title: 'Live lecture' })).json
  const base = 'https://localhost:8443/api'
  await fetch(`${base}/sessions/${made.id}/live`, { method: 'POST', headers: { Authorization: `Bearer ${user.token}` } })
  const form = new FormData()
  form.append('chunk', new Blob([readFileSync(sample('chunk0.m4a'))]), 'chunk_00000.m4a')
  await fetch(`${base}/sessions/${made.id}/live/chunks?index=0`, { method: 'POST', headers: { Authorization: `Bearer ${user.token}` }, body: form })
  await loginAs(page, user)
  await page.goto(`/#/sessions/${made.id}`)
  await expect(page.getByText('Recording in progress')).toBeVisible()
  await expect(page.getByText('Another device is recording this lecture.')).toBeVisible()
  await expect(page.getByText('Parts received')).toHaveCount(0)                      // exactly one part: singular
  await expect(page.getByText('Part received')).toBeVisible()
  await page.screenshot({ path: 'tests/e2e/shots/live.png' })
})
