// Aturan inti RANTANG. Fungsi-fungsi ini sengaja murni (tanpa efek samping)
// sehingga dipakai sama persis oleh klien dan server (lihat server/src/rules.js).

export const KIND = { LAYAK: 'layak', SISA: 'sisa' }

export const KIND_LABEL = { layak: 'Pangan layak', sisa: 'Sisa piring' }

export const DISPUTE_CATEGORIES = [
  { id: 'bau', label: 'Bau' },
  { id: 'jatah', label: 'Jatah' },
  { id: 'mutu', label: 'Mutu' },
  { id: 'jadwal', label: 'Jadwal' },
  { id: 'perilaku', label: 'Perilaku' },
]

export const CHECKLIST = [
  'Disimpan tertutup dan terpisah dari sisa piring',
  'Tidak berbau, berlendir, atau berubah warna',
  'Belum disentuh atau dibagi ke piring siswa',
]

export const DAY = 24 * 60 * 60 * 1000
export const HOUR = 60 * 60 * 1000
export const MIN = 60 * 1000

/**
 * Aturan keras dua aliran (tidak dapat diubah pengguna):
 * - catatan "layak" boleh ke penerima manusia; jika lewat batas waktu, hanya ke pengolah.
 * - catatan "sisa" hanya boleh ke pengolah.
 */
export function allowedTargetTypes(record, rules, now = Date.now()) {
  if (record.kind === KIND.SISA) return ['pengolah']
  if (isPastSafeWindow(record, rules, now)) return ['pengolah']
  return ['penerima', 'pengolah']
}

export function safeDeadline(record, rules) {
  return record.cookedAt + rules.maxHoursFromCook * HOUR
}

export function isPastSafeWindow(record, rules, now = Date.now()) {
  return now > safeDeadline(record, rules)
}

/** Suhu zona bahaya pangan matang: 5–60 °C. */
export function tempZone(tempC) {
  if (tempC == null) return 'unknown'
  if (tempC >= 60) return 'hot'
  if (tempC <= 5) return 'cold'
  return 'danger'
}

/** Validasi catatan sebelum dikirim. Mengembalikan daftar pesan galat yang bisa dibaca manusia. */
export function validateRecord(draft, rules, now = Date.now()) {
  const errs = {}
  if (!draft.kind) errs.kind = 'Pilih jenis: pangan layak atau sisa piring.'
  const w = Number(draft.weightKg)
  if (!w || w <= 0) errs.weightKg = 'Isi berat lebih dari 0 kg.'
  else if (w > 200) errs.weightKg = 'Berat di atas 200 kg. Periksa lagi angkanya.'
  if (draft.kind === KIND.LAYAK) {
    if (!draft.cookedAt) errs.cookedAt = 'Pilih jam masak.'
    else if (draft.cookedAt > now) errs.cookedAt = 'Jam masak tidak boleh di masa depan.'
    else if (now - draft.cookedAt > rules.maxHoursFromCook * HOUR)
      errs.cookedAt = `Sudah lewat ${rules.maxHoursFromCook} jam dari jam masak. Catat sebagai sisa piring untuk pengolah.`
    if (!draft.checklist || draft.checklist.some((c) => !c)) errs.checklist = 'Centang ketiga butir kelayakan.'
  }
  return errs
}

/** Pilih pihak berikutnya yang aktif dan belum pernah ditawari/menolak catatan ini. */
export function nextParty(record, parties, rules, now = Date.now()) {
  const types = allowedTargetTypes(record, rules, now)
  const tried = new Set((record.offers || []).map((o) => o.partyId))
  for (const type of types) {
    const pool = parties
      .filter((p) => p.type === type && p.active && !p.suspended && !tried.has(p.id))
      .sort((a, b) => a.distanceKm - b.distanceKm)
    if (pool.length) return pool[0]
  }
  return null
}

export function fmtKg(n) {
  const v = Math.round(Number(n || 0) * 10) / 10
  return v.toLocaleString('id-ID', { maximumFractionDigits: 1 })
}

export function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

export function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function fmtDateTime(ts) {
  return `${fmtDate(ts)}, ${fmtTime(ts)}`
}

export function fmtLeft(ms) {
  if (ms <= 0) return 'habis'
  const h = Math.floor(ms / HOUR)
  const m = Math.floor((ms % HOUR) / MIN)
  if (h >= 24) {
    const d = Math.floor(h / 24)
    return `${d} hr ${h % 24} j`
  }
  if (h > 0) return `${h} j ${m} mnt`
  return `${m} mnt`
}

export function startOfDay(ts = Date.now()) {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
