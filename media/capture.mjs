// Ambil tangkapan layar aplikasi (ponsel & desktop) ke docs/media/screens
import fs from 'node:fs'
import path from 'node:path'
import { serve, browser, DIST, OUT, sleep } from './lib.mjs'

const PORT = 4321
const BASE = `http://localhost:${PORT}/`
const DIR = path.join(OUT, 'media', 'screens')
fs.mkdirSync(DIR, { recursive: true })

const srv = await serve(DIST, PORT)
const b = await browser()

async function shot(name, { as, reset = true, hash = '', mobile = true, act, full = false }) {
  const ctx = await b.newContext(mobile
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'id-ID', timezoneId: 'Asia/Jakarta' }
    : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'id-ID', timezoneId: 'Asia/Jakarta' })
  const page = await ctx.newPage()
  const q = as ? `?as=${as}${reset ? '&reset=1' : ''}` : ''
  await page.goto(`${BASE}${q}#/${hash}`)
  await page.waitForLoadState('networkidle')
  await sleep(1200)
  if (act) await act(page)
  await page.evaluate(() => document.fonts.ready)
  await sleep(500)
  await page.screenshot({ path: path.join(DIR, `${name}.png`), fullPage: full })
  await ctx.close()
  console.log('✓', name)
}

const catatFlow = async (p, send = false) => {
  await p.getByRole('button', { name: /Pangan layak/ }).click()
  await sleep(400)
  if (send) {
    await p.getByRole('button', { name: 'Semua sesuai' }).click()
    await p.getByRole('button', { name: /^(Kirim|Simpan)/ }).click()
    await sleep(1200)
  }
}

// ---- ponsel ----
await shot('m-login', {})
await shot('m-sppg-home', { as: 'sppg' })
await shot('m-catat', { as: 'sppg', hash: 'catat', act: (p) => catatFlow(p) })
await shot('m-catat-check', { as: 'sppg', hash: 'catat', act: async (p) => { await catatFlow(p); await p.getByRole('button', { name: 'Semua sesuai' }).click(); await p.mouse.wheel(0, 520); await sleep(500) } })
await shot('m-catat-done', { as: 'sppg', hash: 'catat', act: (p) => catatFlow(p, true) })
await shot('m-wadah', { as: 'sppg', hash: 'wadah', act: () => sleep(3500) })
await shot('m-tawaran', { as: 'penerima' })
await shot('m-detail', { as: 'sppg', act: async (p) => { await p.locator('a.item').first().click(); await sleep(600) } })
await shot('m-jemputan', { as: 'pengolah' })
await shot('m-tiket', { as: 'admin', hash: 'tiket/T-0412' })
await shot('m-tiket-baru', { as: 'penerima', hash: 'tiket/baru', act: async (p) => { await p.getByRole('button', { name: 'Jadwal' }).click(); await p.fill('#td', 'Jemputan hari Sabtu sering terlambat sehingga ember menumpuk di samping dapur.') } })
await shot('m-dasbor', { as: 'admin' })
await shot('m-akun', { as: 'penerima', hash: 'akun' })
await shot('m-offline', { as: 'sppg', act: async (p) => { await p.evaluate(() => { const k = 'rantang:v1'; const d = JSON.parse(localStorage.getItem(k)); d.simOffline = true; localStorage.setItem(k, JSON.stringify(d)) }); await p.goto(`${BASE}#/catat`); await sleep(800); await catatFlow(p, true) } })

// ---- desktop ----
await shot('d-login', { mobile: false })
await shot('d-dasbor', { as: 'admin', mobile: false })
await shot('d-wadah', { as: 'admin', hash: 'wadah', mobile: false, act: () => sleep(3500) })
await shot('d-aturan', { as: 'admin', hash: 'aturan', mobile: false })
await shot('d-tiket', { as: 'admin', hash: 'tiket', mobile: false })
await shot('d-sppg', { as: 'sppg', mobile: false })
await shot('d-pengamat', { as: 'pengamat', mobile: false })

await b.close()
srv.close()
