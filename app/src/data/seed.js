import { DAY, HOUR, MIN, startOfDay } from './rules.js'

export const DEFAULT_RULES = {
  maxHoursFromCook: 4, // ditetapkan bersama ahli keamanan pangan sebelum peluncuran
  confirmMinutes: 30,
  opsStart: '06:00',
  opsEnd: '14:00',
  pickupWindowMinutes: 60,
  twoStreamLocked: true,
}

export const LOCATIONS = {
  sppg: { id: 'sppg-01', name: 'SPPG Sukamaju 01', address: 'Jl. Melati No. 12, Kel. Sukamaju' },
  kelurahan: { id: 'kel-sukamaju', name: 'Kelurahan Sukamaju' },
  pickup: 'Pintu samping dapur SPPG, Jl. Melati 12',
}

export const PARTIES = [
  { id: 'p1', type: 'penerima', nick: 'Bu Sari', rt: 'RT 03/RW 05', phone: '0812 3456 7801', distanceKm: 0.4, active: true, joinedAt: 0 },
  { id: 'p2', type: 'penerima', nick: 'Pak Udin', rt: 'RT 01/RW 05', phone: '0813 2211 9080', distanceKm: 0.6, active: true, joinedAt: 0 },
  { id: 'p3', type: 'penerima', nick: 'Mbak Rina', rt: 'RT 06/RW 04', phone: '0857 1100 2233', distanceKm: 0.9, active: true, joinedAt: 0 },
  { id: 'p4', type: 'penerima', nick: 'Bu Tini', rt: 'RT 02/RW 04', phone: '0821 7788 1122', distanceKm: 1.2, active: false, joinedAt: 0 },
  { id: 'p5', type: 'penerima', nick: 'Pak Jaka', rt: 'RT 04/RW 06', phone: '0878 9900 1234', distanceKm: 1.4, active: true, joinedAt: 0 },
  { id: 'o1', type: 'pengolah', nick: 'Maggot Lestari', rt: 'RW 07', phone: '0811 5566 7788', distanceKm: 1.1, active: true, joinedAt: 0, kind: 'Budidaya maggot BSF' },
  { id: 'o2', type: 'pengolah', nick: 'Kompos RW 05', rt: 'RW 05', phone: '0812 9988 7766', distanceKm: 0.8, active: true, joinedAt: 0, kind: 'Kompos komunal' },
]

export const DEMO_USERS = {
  sppg: { id: 'u-sppg', role: 'sppg', name: 'Dimas', org: 'SPPG Sukamaju 01', phone: '0812 0000 1111' },
  penerima: { id: 'u-p1', role: 'penerima', name: 'Bu Sari', org: 'RT 03/RW 05', partyId: 'p1', phone: '0812 3456 7801' },
  pengolah: { id: 'u-o1', role: 'pengolah', name: 'Maggot Lestari', org: 'RW 07', partyId: 'o1', phone: '0811 5566 7788' },
  admin: { id: 'u-adm', role: 'admin', name: 'Pak Hendra', org: 'LPM Kelurahan Sukamaju', phone: '0813 4444 5555' },
  pengamat: { id: 'u-obs', role: 'pengamat', name: 'Tim DLH Kota', org: 'Dinas Lingkungan Hidup', phone: '0811 2222 3333' },
}

export const ROLE_LABEL = {
  sppg: 'Petugas SPPG',
  penerima: 'Penerima',
  pengolah: 'Pengolah',
  admin: 'Admin kelurahan',
  pengamat: 'Pengamat',
}

let n = 100
const id = (p) => `${p}-${(n++).toString(36)}`

function doneRecord(dayTs, kind, kg, partyId, cookH, pickH, source = 'iot') {
  const cookedAt = dayTs + cookH * HOUR
  const createdAt = cookedAt + 75 * MIN
  const pickedAt = dayTs + pickH * HOUR
  return {
    id: id('c'),
    kind,
    weightKg: kg,
    cookedAt,
    createdAt,
    source,
    deviceId: source === 'iot' ? (kind === 'layak' ? 'RTG-01-L' : 'RTG-01-S') : null,
    tempC: kind === 'layak' ? 63 : 29,
    checklist: kind === 'layak' ? [true, true, true] : null,
    photo: null,
    status: 'selesai',
    sync: 'synced',
    offers: [{ id: id('o'), partyId, status: 'diterima', at: createdAt + 2 * MIN, respondedAt: createdAt + 9 * MIN }],
    handover: { at: pickedAt, weightKg: kg, by: partyId, sppgConfirmedAt: pickedAt + 4 * MIN, partyConfirmedAt: pickedAt },
  }
}

export function makeSeed(now = Date.now()) {
  const today = startOfDay(now)
  const records = []
  // 6 hari ke belakang, pola dapur 3.000 porsi
  const pattern = [
    [9.5, 21.0], [12.2, 18.4], [7.8, 24.6], [10.4, 19.9], [13.1, 22.7], [8.6, 17.2],
  ]
  pattern.forEach(([l, s], i) => {
    const d = today - (6 - i) * DAY
    const wd = new Date(d).getDay()
    if (wd === 0) return // Minggu libur
    records.push(doneRecord(d, 'layak', l, ['p1', 'p2', 'p3', 'p5'][i % 4], 8.5, 12))
    records.push(doneRecord(d, 'sisa', s, i % 2 ? 'o1' : 'o2', 8.5, 13.5))
  })
  // satu tawaran yang kedaluwarsa lalu dialihkan ke pengolah (kemarin)
  const y = today - DAY
  records.push({
    ...doneRecord(y, 'layak', 3.2, 'o2', 7, 13, 'manual'),
    offers: [
      { id: id('o'), partyId: 'p2', status: 'kedaluwarsa', at: y + 9 * HOUR, respondedAt: null },
      { id: id('o'), partyId: 'p3', status: 'dilewati', at: y + 9.5 * HOUR, respondedAt: y + 9.6 * HOUR },
      { id: id('o'), partyId: 'o2', status: 'diterima', at: y + 11.2 * HOUR, respondedAt: y + 11.3 * HOUR },
    ],
  })

  // hari ini — beberapa keadaan sekaligus
  const cook = now - 70 * MIN // relatif terhadap jam buka demo agar selalu dalam batas aman
  const r1 = {
    id: id('c'), kind: 'layak', weightKg: 6.4, cookedAt: cook, createdAt: now - 5 * MIN, source: 'iot', deviceId: 'RTG-01-L', tempC: 64,
    checklist: [true, true, true], photo: null, status: 'ditawarkan', sync: 'synced',
    offers: [{ id: id('o'), partyId: 'p1', status: 'ditawarkan', at: now - 4 * MIN, respondedAt: null }],
    handover: null,
  }
  const r2 = {
    id: id('c'), kind: 'sisa', weightKg: 14.8, cookedAt: cook, createdAt: now - 40 * MIN, source: 'iot', deviceId: 'RTG-01-S', tempC: 30,
    checklist: null, photo: null, status: 'dikonfirmasi', sync: 'synced',
    offers: [{ id: id('o'), partyId: 'o1', status: 'diterima', at: now - 39 * MIN, respondedAt: now - 31 * MIN, pickupAt: now + 35 * MIN }],
    handover: null,
  }
  records.push(r1, r2)

  const tickets = [
    {
      id: 'T-0412', category: 'bau', recordId: null, by: 'p2', byRole: 'penerima', title: 'Bau dari titik jemput maggot',
      desc: 'Sore hari tercium bau dari ember sisa piring yang menunggu dijemput di samping dapur.',
      createdAt: now - 1.6 * DAY, deadline: now - 1.6 * DAY + 3 * DAY, status: 'terbuka', photo: null,
      history: [
        { at: now - 1.6 * DAY, who: 'Penerima RT 01', text: 'Tiket dibuat.' },
        { at: now - 1.2 * DAY, who: 'Pak Hendra (LPM)', text: 'Tim tiga orang dibentuk: LPM, SPPG, perwakilan penerima.' },
      ],
    },
    {
      id: 'T-0415', category: 'jadwal', recordId: null, by: 'o1', byRole: 'pengolah', title: 'Jemputan Sabtu bentrok',
      desc: 'Hari Sabtu dapur tutup lebih awal, jemputan jam 13.30 tidak bisa masuk.',
      createdAt: now - 0.3 * DAY, deadline: now - 0.3 * DAY + 3 * DAY, status: 'terbuka', photo: null,
      history: [{ at: now - 0.3 * DAY, who: 'Maggot Lestari', text: 'Tiket dibuat.' }],
    },
    {
      id: 'T-0398', category: 'jatah', recordId: null, by: 'p3', byRole: 'penerima', title: 'Pembagian tidak bergilir',
      desc: 'Dua minggu berturut-turut tawaran selalu ke penerima yang sama.',
      createdAt: now - 9 * DAY, deadline: now - 6 * DAY, status: 'selesai', resolvedAt: now - 7.5 * DAY, photo: null,
      history: [
        { at: now - 9 * DAY, who: 'Penerima RT 06', text: 'Tiket dibuat.' },
        { at: now - 7.5 * DAY, who: 'Pak Hendra (LPM)', text: 'Urutan tawaran kini bergilir setelah penerima menerima 2 kali berturut-turut.' },
      ],
    },
    {
      id: 'T-0391', category: 'mutu', recordId: null, by: 'p5', byRole: 'penerima', title: 'Nasi sudah dingin',
      desc: 'Nasi diterima sudah dingin dan keras.', createdAt: now - 12 * DAY, deadline: now - 9 * DAY, status: 'selesai',
      resolvedAt: now - 10.8 * DAY, photo: null,
      history: [
        { at: now - 12 * DAY, who: 'Penerima RT 04', text: 'Tiket dibuat.' },
        { at: now - 10.8 * DAY, who: 'SPPG Sukamaju 01', text: 'Wadah layak kini berinsulasi; suhu dipantau sensor wadah pintar.' },
      ],
    },
  ]

  const devices = [
    { id: 'RTG-01-L', name: 'Wadah pangan layak', kind: 'layak', capacityKg: 25, weightKg: 4.2, tempC: 66.5, battery: 86, rssi: -61, lastSeen: now, online: true, fw: '0.3.1' },
    { id: 'RTG-01-S', name: 'Wadah sisa piring', kind: 'sisa', capacityKg: 40, weightKg: 11.6, tempC: 30.4, battery: 71, rssi: -67, lastSeen: now, online: true, fw: '0.3.1' },
  ]

  const audit = [
    { at: now - 20 * DAY, who: 'Pak Hendra (LPM)', text: 'Batas waktu jam masak → serah terima ditetapkan 4 jam (rapat dengan ahli keamanan pangan).' },
    { at: now - 20 * DAY, who: 'Pak Hendra (LPM)', text: 'Jam operasi 06.00–14.00.' },
    { at: now - 14 * DAY, who: 'Musyawarah RW 04–06', text: '6 penerima ditetapkan; 1 nonaktif atas permintaan sendiri.' },
  ]

  return { records, tickets, devices, audit, parties: PARTIES.map((p) => ({ ...p })), rules: { ...DEFAULT_RULES } }
}
