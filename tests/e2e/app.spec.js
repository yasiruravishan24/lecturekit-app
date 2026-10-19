// The app in a browser (fake microphone), against the real local server. The native recorder is replaced by its browser version.
import { test, expect } from '@playwright/test'
import { api, loginAs, makeSession, makeUser, PASSWORD } from './helpers.js'

test('log in with a wrong and then the right password', async ({ page }) => {
  const user = await makeUser('m1')
  await page.goto('/#/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill('not-the-password')
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page.getByText('Wrong email or password.')).toBeVisible()
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page.getByText('My courses', { exact: true }).first()).toBeVisible()
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
