import { defineConfig } from '@playwright/test'

// Runs the app in a browser (the recorder falls back to MediaRecorder with a fake microphone). The server is the local Docker stack.
//   docker compose up -d   (project folder)      then      NODE_TLS_REJECT_UNAUTHORIZED=0 npx playwright test
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120000,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:9000',
    viewport: { width: 390, height: 844 },
    launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] },
    permissions: ['microphone'],
  },
  webServer: { command: 'npx quasar dev', url: 'http://localhost:9000', reuseExistingServer: true, timeout: 120000, env: { LK_API: process.env.LK_API || 'https://localhost:8443' } },
})
