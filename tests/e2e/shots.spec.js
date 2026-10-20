// Screenshots of every phone page, for checking the look against the web app (not a pass/fail test).
import { test } from '@playwright/test'
import { loginAs, makeSession, makeUser, upload, sample, startProcessing, waitDone } from './helpers.js'
import { readFileSync } from 'node:fs'

test('screens', async ({ page }) => {
  test.setTimeout(300000)
  const user = await makeUser('shots')
  const { module, session } = await makeSession(user, 'Strings and input')
  const snap = async (name) => { await page.waitForTimeout(700); await page.screenshot({ path: `tests/e2e/shots/${name}.png`, fullPage: false }) }
  await page.goto('/#/login'); await snap('1-login')
  await page.goto('/#/register'); await snap('2-register')
  await loginAs(page, user)
  const go = async (u) => { await page.goto('about:blank'); await page.goto(u) }
  await go('/#/'); await snap('3-home')
  await go('/#/courses'); await snap('3b-courses'); await go('/#/upload'); await snap('3c-upload')
  await go(`/#/capture?module=${module.id}`); await snap('4-capture'); await page.locator('.lk-pickfield').first().click(); await snap('4b-pick'); await page.keyboard.press('Escape')
  await go(`/#/modules/${module.id}`); await snap('5-module')
  await go('/#/settings'); await snap('6-settings'); await page.getByText('Manage account', { exact: true }).click(); await snap('6b-manage')
  await go('/#/notifications'); await snap('7-notifications')
  await upload(user, session.id, [['lecture.m4a', readFileSync(sample('sample-recording.m4a'))]]).catch(() => {})
  await go(`/#/sessions/${session.id}`); await snap('8-session')
})
