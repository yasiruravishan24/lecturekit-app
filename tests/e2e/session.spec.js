// A finished lecture (real pipeline): every part of the lecture page, as screenshots.
import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { loginAs, makeSession, makeUser, sample, startProcessing, upload, waitDone } from './helpers.js'

test('a finished lecture shows everything the web shows', async ({ page }) => {
  test.skip(!process.env.LK_REAL, 'uses the real pipeline: run with LK_REAL=1')
  test.setTimeout(480000)
  const user = await makeUser('lect')
  const { session } = await makeSession(user, 'Board lecture')
  await upload(user, session.id, [['board.mp4', readFileSync(sample('sample-board.mp4'))]])
  await waitDone(user, (await startProcessing(user, session.id)).json.job_id)
  await loginAs(page, user)
  if (process.env.LK_DARK) await page.addInitScript(() => localStorage.setItem('lk_theme', 'dark'))
  await page.goto(`/#/sessions/${session.id}`)
  await expect(page.getByRole('tab', { name: /^(Full notes|Notes)/ })).toBeVisible()
  const shot = async (n) => { await page.waitForTimeout(700); await page.screenshot({ path: `tests/e2e/shots/s-${n}.png`, fullPage: true }) }
  await shot('1-full')
  await page.getByRole('tab', { name: /Short/ }).click(); await shot('2-short')
  await page.locator('.lk-flash').click(); await expect(page.locator('.lk-flash-text')).toBeVisible(); await shot('2b-card')
  await page.getByRole('button', { name: 'I know it' }).click(); await expect(page.getByText(/Point 2 of/)).toBeVisible()
  await page.getByRole('tab', { name: /Quiz/ }).click(); await shot('3-quiz')
  await page.getByRole('tab', { name: /Learn more/ }).click(); await page.waitForTimeout(3000); await shot('4-learn')
  await page.getByRole('tab', { name: /Moments|Key moments/ }).click(); await expect(page.locator('.lk-shot').first()).toBeVisible({ timeout: 180000 }); await shot('5-moments')
  await page.getByRole('tab', { name: /Recording/ }).click(); await page.waitForTimeout(2000); await shot('6-recording')
})
