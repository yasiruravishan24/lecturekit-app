// The app icon: the web app's graduation cap, white on the same blue as the logo badge. Writes the 1024x1024 picture iOS needs (no corners: iOS rounds them).
//   node scripts/make-icon.mjs
import { chromium } from '@playwright/test'
import { writeFileSync } from 'node:fs'

const out = 'src-capacitor/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1565c0"/><stop offset="1" stop-color="#2196f3"/></linearGradient></defs>
  <rect width="1024" height="1024" fill="url(#g)"/>
  <g transform="translate(512 520) scale(34) translate(-12 -11.5)"><path fill="#fff" d="M12 5 3 9.5l9 4.5 7-3.5V15h2V9.5L12 5zm-5 8.7v2.8c0 1.1 2.2 2.5 5 2.5s5-1.4 5-2.5v-2.8l-5 2.5-5-2.5z"/></g>
</svg>`
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } })
await page.setContent(`<body style="margin:0">${svg}</body>`)
writeFileSync(out, await page.screenshot({ type: 'png', omitBackground: false }))

// the picture shown for a moment while the app starts: the same blue, the cap in the middle
const splash = `<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732" viewBox="0 0 2732 2732">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1565c0"/><stop offset="1" stop-color="#2196f3"/></linearGradient></defs>
  <rect width="2732" height="2732" fill="url(#g)"/>
  <g transform="translate(1366 1390) scale(36) translate(-12 -11.5)"><path fill="#fff" d="M12 5 3 9.5l9 4.5 7-3.5V15h2V9.5L12 5zm-5 8.7v2.8c0 1.1 2.2 2.5 5 2.5s5-1.4 5-2.5v-2.8l-5 2.5-5-2.5z"/></g>
</svg>`
const big = await browser.newPage({ viewport: { width: 2732, height: 2732 } })
await big.setContent(`<body style="margin:0">${splash}</body>`)
const shot = await big.screenshot({ type: 'png' })
for (const f of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) writeFileSync(`src-capacitor/ios/App/App/Assets.xcassets/Splash.imageset/${f}`, shot)
await browser.close()
console.log('wrote', out)
