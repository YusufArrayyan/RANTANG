// Server RANTANG (percontohan). Tanpa dependensi wajib: hanya modul bawaan Node.
// - REST untuk catatan, tawaran, serah terima, tiket
// - POST /api/iot/telemetry  : ESP32 mengirim berat & suhu (HTTP, kunci perangkat)
// - MQTT (opsional)          : jika MQTT_URL di-set dan paket "mqtt" terpasang
// - GET  /api/stream         : Server-Sent Events ke aplikasi (telemetri & perubahan status)
//
// Penyimpanan di memori untuk demo. Produksi: PostgreSQL (lihat docs/ARSITEKTUR.md).

import http from 'node:http'
import { randomUUID, timingSafeEqual } from 'node:crypto'
import { validateRecord, nextParty, allowedTargetTypes } from '../../app/src/data/rules.js'
import { makeSeed } from '../../app/src/data/seed.js'

const PORT = Number(process.env.PORT || 8080)
const CORS = process.env.CORS_ORIGIN || '*'
const DEVICE_KEYS = Object.fromEntries(
  (process.env.DEVICE_KEYS || 'RTG-01-L:demo-layak,RTG-01-S:demo-sisa').split(',').map((p) => p.trim().split(':')),
)

const db = makeSeed()
const clients = new Set()

function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const res of clients) res.write(msg)
}

function audit(who, text) {
  db.audit.unshift({ at: Date.now(), who, text })
}

// ---------- IoT ----------
function safeEq(a, b) {
  const x = Buffer.from(String(a || ''))
  const y = Buffer.from(String(b || ''))
  return x.length === y.length && timingSafeEqual(x, y)
}

export function ingestTelemetry(t, via) {
  const dv = db.devices.find((d) => d.id === t.device_id)
  if (!dv) return { ok: false, code: 404, error: 'perangkat tidak dikenal' }
  if (typeof t.weight_g !== 'number' || t.weight_g < -500 || t.weight_g > 250000) return { ok: false, code: 422, error: 'weight_g tidak wajar' }
  Object.assign(dv, {
    weightKg: Math.max(0, t.weight_g / 1000),
    tempC: typeof t.temp_c === 'number' ? t.temp_c : dv.tempC,
    battery: t.battery_pct ?? dv.battery,
    rssi: t.rssi ?? dv.rssi,
    fw: t.fw ?? dv.fw,
    lastSeen: Date.now(),
    online: true,
  })
  broadcast('telemetry', { ...t, via, ts: t.ts || new Date().toISOString() })
  return { ok: true }
}

async function startMqtt() {
  if (!process.env.MQTT_URL) return
  try {
    const { connect } = await import('mqtt')
    const c = connect(process.env.MQTT_URL)
    const topic = process.env.MQTT_TOPIC || 'rantang/+/bin/+/telemetry'
    c.on('connect', () => { c.subscribe(topic); console.log(`[mqtt] berlangganan ${topic}`) })
    c.on('message', (tp, buf) => {
      try {
        const t = JSON.parse(buf.toString())
        // topik membawa id perangkat; kunci dicek di broker (ACL per perangkat)
        t.device_id ||= tp.split('/')[3]
        ingestTelemetry(t, 'mqtt')
      } catch (e) { console.warn('[mqtt] pesan tidak valid', e.message) }
    })
  } catch {
    console.warn('[mqtt] paket "mqtt" belum terpasang. Jalankan: npm i mqtt')
  }
}

// ---------- domain ----------
function route(r, now = Date.now()) {
  const p = nextParty(r, db.parties, db.rules, now)
  if (!p) { r.status = 'tanpa_pasangan'; return null }
  r.offers.push({ id: randomUUID(), partyId: p.id, status: 'ditawarkan', at: now, respondedAt: null })
  r.status = 'ditawarkan'
  // di sini: kirim notifikasi WhatsApp Business API ke p.phone
  return p
}

function publicRecord(r, role) {
  // privasi: penerima tidak melihat identitas penerima lain
  if (role === 'admin' || role === 'sppg') return r
  return { ...r, offers: r.offers.map((o) => ({ ...o, partyId: db.parties.find((p) => p.id === o.partyId)?.type })) }
}

// ---------- HTTP ----------
function send(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': CORS })
  res.end(JSON.stringify(body))
}

async function readJson(req) {
  let raw = ''
  for await (const ch of req) { raw += ch; if (raw.length > 1e6) throw new Error('payload terlalu besar') }
  return raw ? JSON.parse(raw) : {}
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const role = req.headers['x-role'] || 'pengamat' // demo: produksi memakai token sesi hasil OTP WhatsApp
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': CORS, 'Access-Control-Allow-Headers': 'content-type,x-role,x-device-key', 'Access-Control-Allow-Methods': 'GET,POST' })
    return res.end()
  }
  try {
    // SSE
    if (req.method === 'GET' && url.pathname === '/api/stream') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'Access-Control-Allow-Origin': CORS })
      res.write(': rantang\n\n')
      clients.add(res)
      const ka = setInterval(() => res.write(': ping\n\n'), 25000)
      req.on('close', () => { clearInterval(ka); clients.delete(res) })
      return
    }
    if (req.method === 'GET' && url.pathname === '/api/health') return send(res, 200, { ok: true, devices: db.devices.length, clients: clients.size })

    // IoT HTTP
    if (req.method === 'POST' && url.pathname === '/api/iot/telemetry') {
      const t = await readJson(req)
      if (!safeEq(req.headers['x-device-key'], DEVICE_KEYS[t.device_id])) return send(res, 401, { error: 'kunci perangkat salah' })
      const r = ingestTelemetry(t, 'http')
      return send(res, r.ok ? 202 : r.code, r)
    }
    if (req.method === 'GET' && url.pathname === '/api/devices') return send(res, 200, db.devices)

    // Catatan
    if (req.method === 'GET' && url.pathname === '/api/records') return send(res, 200, db.records.map((r) => publicRecord(r, role)))
    if (req.method === 'POST' && url.pathname === '/api/records') {
      if (role !== 'sppg') return send(res, 403, { error: 'hanya petugas SPPG' })
      const b = await readJson(req)
      // berat dari wadah pintar jika diminta
      if (b.useDevice) {
        const dv = db.devices.find((d) => d.kind === b.kind)
        if (dv) { b.weightKg = Math.round(dv.weightKg * 10) / 10; b.deviceId = dv.id; b.tempC = dv.tempC; b.source = 'iot' }
      }
      const errors = validateRecord(b, db.rules)
      if (Object.keys(errors).length) return send(res, 422, { errors })
      const r = {
        id: randomUUID(), kind: b.kind, weightKg: Number(b.weightKg), cookedAt: b.cookedAt, createdAt: Date.now(),
        source: b.source || 'manual', deviceId: b.deviceId || null, tempC: b.tempC ?? null, checklist: b.checklist || null,
        photo: null, status: 'baru', sync: 'synced', offers: [], handover: null,
      }
      db.records.unshift(r)
      const p = route(r)
      broadcast('record', { id: r.id, status: r.status })
      return send(res, 201, { record: r, matchedType: p?.type ?? null, allowed: allowedTargetTypes(r, db.rules) })
    }
    const m = url.pathname.match(/^\/api\/records\/([^/]+)\/(respond|pickup|confirm)$/)
    if (req.method === 'POST' && m) {
      const r = db.records.find((x) => x.id === m[1])
      if (!r) return send(res, 404, { error: 'catatan tidak ditemukan' })
      const b = await readJson(req)
      const cur = r.offers.at(-1)
      if (m[2] === 'respond') {
        if (!cur || cur.status !== 'ditawarkan') return send(res, 409, { error: 'tidak ada tawaran aktif' })
        cur.respondedAt = Date.now()
        if (b.accept) { cur.status = 'diterima'; r.status = 'dikonfirmasi' } else { cur.status = 'dilewati'; route(r) }
      } else if (m[2] === 'pickup') {
        if (r.status !== 'dikonfirmasi') return send(res, 409, { error: 'belum dikonfirmasi' })
        r.status = 'diserahkan'
        r.handover = { at: Date.now(), weightKg: Number(b.weightKg) || r.weightKg, by: cur.partyId, partyConfirmedAt: Date.now(), sppgConfirmedAt: null }
      } else {
        if (role !== 'sppg' || !r.handover) return send(res, 409, { error: 'tidak bisa dikonfirmasi' })
        r.handover.sppgConfirmedAt = Date.now()
        r.status = 'selesai'
      }
      broadcast('record', { id: r.id, status: r.status })
      return send(res, 200, publicRecord(r, role))
    }

    // Tiket
    if (req.method === 'GET' && url.pathname === '/api/tickets') return send(res, 200, db.tickets)
    if (req.method === 'POST' && url.pathname === '/api/tickets') {
      const b = await readJson(req)
      if (!['bau', 'jatah', 'mutu', 'jadwal', 'perilaku'].includes(b.category)) return send(res, 422, { error: 'kategori tidak dikenal' })
      const t = { id: `T-${Date.now().toString(36)}`, ...b, createdAt: Date.now(), deadline: Date.now() + 3 * 864e5, status: 'terbuka', history: [] }
      db.tickets.unshift(t)
      return send(res, 201, t)
    }

    // Aturan
    if (req.method === 'GET' && url.pathname === '/api/rules') return send(res, 200, db.rules)
    if (req.method === 'POST' && url.pathname === '/api/rules') {
      if (role !== 'admin') return send(res, 403, { error: 'hanya admin kelurahan' })
      const b = await readJson(req)
      delete b.twoStreamLocked // aturan dua aliran tidak dapat diubah
      Object.assign(db.rules, b)
      audit('admin', `Aturan diubah: ${JSON.stringify(b)}`)
      return send(res, 200, db.rules)
    }

    send(res, 404, { error: 'tidak ditemukan' })
  } catch (e) {
    send(res, 400, { error: e.message })
  }
})

// pemeriksa tawaran kedaluwarsa
setInterval(() => {
  const now = Date.now()
  for (const r of db.records) {
    const cur = r.offers.at(-1)
    if (r.status === 'ditawarkan' && cur && now - cur.at > db.rules.confirmMinutes * 60000) {
      cur.status = 'kedaluwarsa'
      cur.respondedAt = now
      route(r, now)
      broadcast('record', { id: r.id, status: r.status })
    }
  }
  for (const d of db.devices) if (now - d.lastSeen > 60000) d.online = false
}, 10000)

server.listen(PORT, () => {
  console.log(`RANTANG API di http://localhost:${PORT}`)
  startMqtt()
})
