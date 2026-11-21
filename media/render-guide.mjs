// Render panduan pengguna ke docs/Panduan_Pengguna_RANTANG.pdf
import fs from 'node:fs'
import path from 'node:path'
import { serve, browser, ROOT, sleep } from './lib.mjs'

const srv = await serve(ROOT, 4323)
const b = await browser()
const page = await b.newPage()
await page.goto('http://localhost:4323/media/guide.html')
await page.waitForLoadState('networkidle')
await page.evaluate(() => document.fonts.ready)
await sleep(500)
const out = path.join(ROOT, 'docs', 'Panduan_Pengguna_RANTANG.pdf')
await page.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true })
// pratinjau halaman untuk diperiksa
await page.setViewportSize({ width: 794, height: 1123 })
fs.mkdirSync(path.join(ROOT, 'media', '_guide'), { recursive: true })
const n = await page.locator('section.page').count()
for (let i = 0; i < n; i++) await page.locator('section.page').nth(i).screenshot({ path: path.join(ROOT, 'media', '_guide', `p${i + 1}.png`) })
console.log('✓', out, fs.statSync(out).size, 'bytes,', n, 'halaman')
await b.close()
srv.close()
