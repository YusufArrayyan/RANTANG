// Render mockup esai ke docs/mockup/*.png (3200×2000 px)
import fs from 'node:fs'
import path from 'node:path'
import { serve, browser, ROOT, sleep } from './lib.mjs'

const OUTDIR = path.join(ROOT, 'docs', 'mockup')
fs.mkdirSync(OUTDIR, { recursive: true })
fs.copyFileSync(path.join(ROOT, 'media', 'mockups.html'), path.join(ROOT, '_mockups.html'))
const srv = await serve(ROOT, 4322)
const b = await browser()
const page = await b.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 })
const names = { hero: 'mockup-utama-pc-dan-ponsel', mobile: 'mockup-ponsel-1', mobile2: 'mockup-ponsel-2', desktop: 'mockup-pc-dasbor', desktop2: 'mockup-pc-wadah-pintar', iot: 'mockup-integrasi-iot' }
for (const [k, file] of Object.entries(names)) {
  await page.goto(`http://localhost:4322/_mockups.html#${k}`)
  await page.reload()
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  await sleep(300)
  await page.screenshot({ path: path.join(OUTDIR, `${file}.png`) })
  console.log('✓', file)
}
await b.close()
srv.close()
fs.unlinkSync(path.join(ROOT, '_mockups.html'))
