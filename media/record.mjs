// Rekam klip interaksi aplikasi untuk video (webm) ke media/_clips
import fs from 'node:fs'
import path from 'node:path'
import { serve, browser, DIST, ROOT, sleep } from './lib.mjs'

const PORT = 4324
const BASE = `http://localhost:${PORT}/`
const DIR = path.join(ROOT, 'media', '_clips')
fs.rmSync(DIR, { recursive: true, force: true })
fs.mkdirSync(DIR, { recursive: true })
const srv = await serve(DIST, PORT)
const b = await browser()

async function clip(name, mobile, fn) {
  const size = mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 }
  const ctx = await b.newContext({
    viewport: size, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile, locale: 'id-ID', timezoneId: 'Asia/Jakarta',
    recordVideo: { dir: DIR, size },
  })
  const page = await ctx.newPage()
  await fn(page)
  const v = page.video()
  await ctx.close()
  fs.renameSync(await v.path(), path.join(DIR, `${name}.webm`))
  console.log('✓', name)
}

const go = async (p, url) => { await p.goto(BASE + url); await p.waitForLoadState('networkidle'); await p.evaluate(() => document.fonts.ready) }

await clip('wadah', true, async (p) => {
  await go(p, '?as=sppg&reset=1#/wadah')
  await sleep(9000)
  await p.mouse.wheel(0, 500); await sleep(3000)
  await p.mouse.wheel(0, 500); await sleep(4000)
})

await clip('catat', true, async (p) => {
  await go(p, '?as=sppg&reset=1#/')
  await sleep(2500)
  await p.locator('a.fab').click(); await sleep(1800)
  await p.getByRole('button', { name: /Pangan layak/ }).click(); await sleep(3500)
  await p.mouse.wheel(0, 360); await sleep(2500)
  await p.getByRole('button', { name: 'Semua sesuai' }).click(); await sleep(2200)
  await p.mouse.wheel(0, 400); await sleep(1200)
  await p.getByRole('button', { name: /^Kirim/ }).click(); await sleep(4500)
  await p.getByRole('link', { name: 'Lihat status' }).click(); await sleep(4000)
})

await clip('penerima', true, async (p) => {
  await go(p, '?as=penerima&reset=1#/')
  await sleep(3500)
  await p.getByRole('button', { name: 'Saya ambil' }).click(); await sleep(3500)
  await p.getByRole('button', { name: 'Sudah diambil' }).click(); await sleep(3000)
  await go(p, '?as=sppg#/')
  await sleep(3500)
  await p.getByRole('button', { name: 'Benar' }).click(); await sleep(3500)
  await p.locator('a.item').first().click(); await sleep(4000)
})

await clip('dasbor', false, async (p) => {
  await go(p, '?as=admin&reset=1#/')
  await sleep(4000)
  await p.mouse.move(640, 400)
  for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, 90); await sleep(250) }
  await sleep(2500)
  await p.getByRole('link', { name: 'Wadah' }).click(); await sleep(5000)
  await p.getByRole('link', { name: 'Aturan' }).click(); await sleep(4000)
})

await b.close()
srv.close()
