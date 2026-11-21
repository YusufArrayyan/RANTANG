import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { makeSeed, DEMO_USERS, LOCATIONS } from './seed.js'
import { DAY, HOUR, MIN, nextParty, isPastSafeWindow, startOfDay, validateRecord } from './rules.js'
import { startIot } from './iot.js'

const KEY = 'rantang:v1'
const Ctx = createContext(null)

function load() {
  // Tautan demo: ?as=sppg|penerima|pengolah|admin|pengamat (&reset=1 untuk data contoh baru)
  try {
    const q = new URLSearchParams(location.search)
    const as = q.get('as')
    if (as && DEMO_USERS[as]) {
      let base = null
      if (q.get('reset') !== '1') base = JSON.parse(localStorage.getItem(KEY) || 'null')
      return { ...(base || { ...makeSeed(), simOffline: false }), user: { ...DEMO_USERS[as] } }
    }
  } catch {}
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { ...makeSeed(), user: null, simOffline: false }
}

let uid = Date.now() % 100000
const newId = (p) => `${p}-${(uid++).toString(36)}`

export function StoreProvider({ children }) {
  const [db, setDb] = useState(load)
  const [toasts, setToasts] = useState([])
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  const [iotLog, setIotLog] = useState([])
  const [iotMode, setIotMode] = useState('sim')
  const dbRef = useRef(db)
  dbRef.current = db

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(db)) } catch {}
  }, [db])

  const toast = useCallback((text, icon = 'info') => {
    const t = { id: newId('t'), text, icon }
    setToasts((x) => [...x, t])
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== t.id)), 4200)
  }, [])

  const mutate = useCallback((fn) => {
    setDb((prev) => {
      const next = structuredClone(prev)
      fn(next)
      return next
    })
  }, [])

  // ---- Jaringan / luring ----
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  const isOnline = online && !db.simOffline

  // ketika sinyal kembali, kirim antrean
  useEffect(() => {
    if (!isOnline) return
    const pending = dbRef.current.records.filter((r) => r.sync === 'pending')
    if (!pending.length) return
    const t = setTimeout(() => {
      mutate((d) => {
        d.records.forEach((r) => {
          if (r.sync === 'pending') {
            r.sync = 'synced'
            routeRecord(d, r, Date.now())
          }
        })
      })
      toast(`${pending.length} catatan terkirim setelah sinyal kembali.`, 'sync')
    }, 900)
    return () => clearTimeout(t)
  }, [isOnline, mutate, toast])

  // ---- IoT: wadah pintar ----
  useEffect(() => {
    const stop = startIot({
      getDevices: () => dbRef.current.devices,
      onTelemetry: (msg) => {
        setDb((prev) => {
          const devices = prev.devices.map((dv) => (dv.id === msg.deviceId ? { ...dv, ...msg.patch, lastSeen: msg.at, online: true } : dv))
          return { ...prev, devices }
        })
        setIotLog((l) => [msg, ...l].slice(0, 40))
      },
      onMode: setIotMode,
    })
    return stop
  }, [])

  // ---- Pengatur waktu: tawaran kedaluwarsa & batas aman ----
  useEffect(() => {
    const tick = () => {
      const now = Date.now()
      const d0 = dbRef.current
      const needs = d0.records.some((r) => {
        const cur = currentOffer(r)
        if (r.status === 'ditawarkan' && cur && now - cur.at > d0.rules.confirmMinutes * MIN) return true
        if (r.kind === 'layak' && ['ditawarkan', 'tanpa_pasangan'].includes(r.status) && isPastSafeWindow(r, d0.rules, now) && cur && partyType(d0, cur.partyId) === 'penerima') return true
        return false
      })
      if (!needs) return
      mutate((d) => {
        d.records.forEach((r) => {
          const cur = currentOffer(r)
          if (r.status !== 'ditawarkan' || !cur) return
          const expired = now - cur.at > d.rules.confirmMinutes * MIN
          const unsafe = r.kind === 'layak' && isPastSafeWindow(r, d.rules, now) && partyType(d, cur.partyId) === 'penerima'
          if (expired || unsafe) {
            cur.status = 'kedaluwarsa'
            cur.respondedAt = now
            routeRecord(d, r, now)
          }
        })
      })
    }
    const h = setInterval(tick, 10000)
    tick()
    return () => clearInterval(h)
  }, [mutate])

  // ---- Aksi ----
  const actions = useMemo(() => ({
    login(role) {
      mutate((d) => { d.user = { ...DEMO_USERS[role] } })
    },
    logout() {
      mutate((d) => { d.user = null })
    },
    resetDemo() {
      const user = dbRef.current.user
      setDb({ ...makeSeed(), user, simOffline: false })
      toast('Data demo dipulihkan.', 'sync')
    },
    setSimOffline(v) {
      mutate((d) => { d.simOffline = v })
    },

    /** F2 — catatan dapur. Mengembalikan {ok, errors, record}. */
    createRecord(draft) {
      const now = Date.now()
      const errors = validateRecord(draft, dbRef.current.rules, now)
      if (Object.keys(errors).length) return { ok: false, errors }
      const offline = !(navigator.onLine && !dbRef.current.simOffline)
      const rec = {
        id: newId('c'),
        kind: draft.kind,
        weightKg: Math.round(Number(draft.weightKg) * 10) / 10,
        cookedAt: draft.cookedAt || now,
        createdAt: now,
        source: draft.source || 'manual',
        deviceId: draft.deviceId || null,
        tempC: draft.tempC ?? null,
        checklist: draft.kind === 'layak' ? draft.checklist : null,
        photo: draft.photo || null,
        status: offline ? 'antre' : 'baru',
        sync: offline ? 'pending' : 'synced',
        offers: [],
        handover: null,
      }
      let matched = null
      mutate((d) => {
        d.records.unshift(structuredClone(rec))
        const r = d.records[0]
        if (!offline) matched = routeRecord(d, r, now)
        // wadah dikosongkan setelah isinya dicatat
        if (rec.deviceId) {
          const dv = d.devices.find((x) => x.id === rec.deviceId)
          if (dv) dv.weightKg = 0.2
        }
      })
      if (offline) toast('Tersimpan di ponsel. Menunggu sinyal untuk dikirim.', 'offline')
      else {
        const p = nextParty(rec, dbRef.current.parties, dbRef.current.rules, now)
        if (p) toast(`Ditawarkan ke ${p.type === 'penerima' ? 'penerima terdekat' : p.nick}. Notifikasi WhatsApp terkirim.`, 'send')
        else toast('Belum ada pasangan aktif. Admin kelurahan diberi tahu.', 'warn')
      }
      return { ok: true, record: rec, matched }
    },

    /** F3 — penerima/pengolah menjawab tawaran */
    respondOffer(recordId, accept) {
      const now = Date.now()
      mutate((d) => {
        const r = d.records.find((x) => x.id === recordId)
        const cur = r && currentOffer(r)
        if (!cur) return
        cur.respondedAt = now
        if (accept) {
          cur.status = 'diterima'
          if (partyType(d, cur.partyId) === 'pengolah') cur.pickupAt = now + 45 * MIN
          r.status = 'dikonfirmasi'
        } else {
          cur.status = 'dilewati'
          routeRecord(d, r, now)
        }
      })
      toast(accept ? 'Terkonfirmasi. Dapur sudah diberi tahu.' : 'Dilewati. Tawaran diteruskan.', accept ? 'ok' : 'info')
    },

    /** F4 — pengambil menekan "Sudah diambil/dijemput" */
    markPicked(recordId, weightKg) {
      const now = Date.now()
      mutate((d) => {
        const r = d.records.find((x) => x.id === recordId)
        const cur = r && currentOffer(r)
        if (!r || !cur) return
        r.status = 'diserahkan'
        r.handover = { at: now, weightKg: Number(weightKg) || r.weightKg, by: cur.partyId, partyConfirmedAt: now, sppgConfirmedAt: null }
      })
      toast('Serah terima tercatat dengan stempel waktu.', 'ok')
    },

    /** F4 — dapur mengonfirmasi serah terima (konfirmasi dua pihak) */
    confirmHandover(recordId) {
      const now = Date.now()
      mutate((d) => {
        const r = d.records.find((x) => x.id === recordId)
        if (!r?.handover) return
        r.handover.sppgConfirmedAt = now
        r.status = 'selesai'
      })
      toast('Serah terima dikonfirmasi kedua pihak.', 'ok')
    },

    /** F5 — tiket sengketa */
    createTicket({ category, title, desc, recordId, photo }) {
      const now = Date.now()
      const u = dbRef.current.user
      const n = 416 + dbRef.current.tickets.length
      const t = {
        id: `T-0${n}`, category, title: title || 'Tanpa judul', desc, recordId: recordId || null, photo: photo || null,
        by: u?.partyId || u?.id, byRole: u?.role, createdAt: now, deadline: now + 3 * DAY, status: 'terbuka',
        history: [{ at: now, who: displayWho(u), text: 'Tiket dibuat. Tim tiga orang (LPM, SPPG, penerima) diberi tahu.' }],
      }
      mutate((d) => {
        d.tickets.unshift(t)
        if (recordId) {
          const r = d.records.find((x) => x.id === recordId)
          if (r && r.status !== 'selesai') r.status = 'sengketa'
        }
      })
      toast(`Tiket ${t.id} dibuat. Tenggat 3 hari.`, 'ok')
      return t
    },
    addTicketNote(ticketId, text) {
      const u = dbRef.current.user
      mutate((d) => {
        const t = d.tickets.find((x) => x.id === ticketId)
        t?.history.push({ at: Date.now(), who: displayWho(u), text })
      })
    },
    resolveTicket(ticketId, text) {
      const u = dbRef.current.user
      mutate((d) => {
        const t = d.tickets.find((x) => x.id === ticketId)
        if (!t) return
        t.status = 'selesai'
        t.resolvedAt = Date.now()
        t.history.push({ at: Date.now(), who: displayWho(u), text: text || 'Tiket diselesaikan.' })
      })
      toast(`Tiket ${ticketId} selesai.`, 'ok')
    },
    escalateTicket(ticketId) {
      const u = dbRef.current.user
      mutate((d) => {
        const t = d.tickets.find((x) => x.id === ticketId)
        if (!t) return
        t.status = 'eskalasi'
        t.history.push({ at: Date.now(), who: displayWho(u), text: 'Dinaikkan ke Lurah dan DLH.' })
      })
      toast('Tiket dinaikkan ke Lurah dan DLH.', 'warn')
    },

    /** Aturan (admin) — setiap perubahan masuk log audit */
    setRule(key, value, label) {
      const u = dbRef.current.user
      mutate((d) => {
        if (key === 'twoStreamLocked') return
        d.rules[key] = value
        d.audit.unshift({ at: Date.now(), who: displayWho(u), text: label })
      })
    },
    setPartyActive(partyId, active) {
      const u = dbRef.current.user
      mutate((d) => {
        const p = d.parties.find((x) => x.id === partyId)
        if (!p) return
        p.active = active
        d.audit.unshift({ at: Date.now(), who: displayWho(u), text: `${p.nick} ${active ? 'diaktifkan' : 'dinonaktifkan'} (${p.type}).` })
      })
    },
    addParty({ nick, rt, phone, type }) {
      const u = dbRef.current.user
      mutate((d) => {
        d.parties.push({ id: newId(type === 'pengolah' ? 'o' : 'p'), type, nick, rt, phone, distanceKm: 1 + Math.random(), active: true, joinedAt: Date.now() })
        d.audit.unshift({ at: Date.now(), who: displayWho(u), text: `${nick} ditambahkan sebagai ${type} (hasil musyawarah).` })
      })
      toast(`${nick} ditambahkan.`, 'ok')
    },
    /** Penerima keluar kapan saja (PRD §6) */
    leaveProgram() {
      const u = dbRef.current.user
      mutate((d) => {
        const p = d.parties.find((x) => x.id === u?.partyId)
        if (p) p.active = false
      })
      toast('Anda tidak lagi menerima tawaran. Bisa diaktifkan kembali kapan saja.', 'info')
    },
    rejoinProgram() {
      const u = dbRef.current.user
      mutate((d) => {
        const p = d.parties.find((x) => x.id === u?.partyId)
        if (p) p.active = true
      })
      toast('Anda kembali menerima tawaran.', 'ok')
    },
    tareDevice(deviceId) {
      mutate((d) => {
        const dv = d.devices.find((x) => x.id === deviceId)
        if (dv) dv.weightKg = 0
      })
      toast('Timbangan dinolkan (tare).', 'ok')
    },
  }), [mutate, toast])

  const value = { db, actions, toasts, isOnline, iotLog, iotMode, location: LOCATIONS }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  return useContext(Ctx)
}

// ---------- pembantu ----------
export function currentOffer(r) {
  return r.offers && r.offers.length ? r.offers[r.offers.length - 1] : null
}

export function partyType(d, partyId) {
  return d.parties.find((p) => p.id === partyId)?.type
}

function displayWho(u) {
  if (!u) return 'Sistem'
  if (u.role === 'penerima') return 'Penerima'
  return u.role === 'admin' ? `${u.name} (LPM)` : u.name
}

/** Cocokkan catatan ke pihak berikutnya sesuai aturan dua aliran. */
function routeRecord(d, r, now) {
  const p = nextParty(r, d.parties, d.rules, now)
  if (!p) {
    r.status = 'tanpa_pasangan'
    return null
  }
  r.offers.push({ id: newId('o'), partyId: p.id, status: 'ditawarkan', at: now, respondedAt: null })
  r.status = 'ditawarkan'
  return p
}

// ---------- turunan untuk tampilan ----------
export function recordStatus(r, d) {
  const cur = currentOffer(r)
  const type = cur ? partyType(d, cur.partyId) : null
  switch (r.status) {
    case 'antre': return { tone: 'wait', label: 'Menunggu sinyal', icon: 'offline' }
    case 'baru': return { tone: 'wait', label: 'Mencari pasangan', icon: 'clock' }
    case 'ditawarkan': return { tone: 'wait', label: type === 'pengolah' ? 'Menunggu pengolah' : 'Menunggu penerima', icon: 'clock' }
    case 'dikonfirmasi': return { tone: 'ok', label: type === 'pengolah' ? 'Jemputan terjadwal' : 'Siap diambil', icon: 'check' }
    case 'diserahkan': return { tone: 'wait', label: 'Perlu konfirmasi dapur', icon: 'hand' }
    case 'selesai': return { tone: 'done', label: 'Selesai', icon: 'checkDouble' }
    case 'tanpa_pasangan': return { tone: 'bad', label: 'Belum ada pasangan', icon: 'alert' }
    case 'sengketa': return { tone: 'bad', label: 'Sengketa', icon: 'alert' }
    default: return { tone: 'off', label: r.status, icon: 'info' }
  }
}

export function weekStats(d, now = Date.now()) {
  const from = startOfDay(now) - 6 * DAY
  const recs = d.records.filter((r) => r.createdAt >= from)
  const done = recs.filter((r) => r.status === 'selesai')
  const kgDiverted = done.reduce((s, r) => s + (r.handover?.weightKg || r.weightKg), 0)
  const layak = recs.filter((r) => r.kind === 'layak')
  const layakToPeople = layak.filter((r) => r.status === 'selesai' && partyType(d, r.handover?.by) === 'penerima')
  const pctLayak = layak.length ? Math.round((layakToPeople.length / layak.length) * 100) : 0
  const activeRecv = d.parties.filter((p) => p.type === 'penerima' && p.active).length
  const activeProc = d.parties.filter((p) => p.type === 'pengolah' && p.active).length
  const closed = d.tickets.filter((t) => t.status === 'selesai')
  const ontime = closed.filter((t) => t.resolvedAt - t.createdAt <= 3 * DAY)
  const pctTickets = closed.length ? Math.round((ontime.length / closed.length) * 100) : 100
  const days = []
  for (let i = 0; i < 7; i++) {
    const s = from + i * DAY
    const e = s + DAY
    const dayRecs = d.records.filter((r) => r.createdAt >= s && r.createdAt < e)
    days.push({
      ts: s,
      layak: dayRecs.filter((r) => r.kind === 'layak').reduce((a, r) => a + r.weightKg, 0),
      sisa: dayRecs.filter((r) => r.kind === 'sisa').reduce((a, r) => a + r.weightKg, 0),
    })
  }
  return { kgDiverted, pctLayak, activeRecv, activeProc, pctTickets, openTickets: d.tickets.filter((t) => t.status !== 'selesai').length, days, count: recs.length }
}

export function toCsv(d) {
  const head = ['id', 'jenis', 'berat_kg', 'jam_masak', 'dicatat', 'sumber', 'perangkat', 'suhu_c', 'status', 'diserahkan_ke_tipe', 'jam_serah', 'berat_serah_kg']
  const rows = d.records.map((r) => [
    r.id, r.kind, r.weightKg, new Date(r.cookedAt).toISOString(), new Date(r.createdAt).toISOString(), r.source, r.deviceId || '', r.tempC ?? '',
    r.status, r.handover ? partyType(d, r.handover.by) : '', r.handover ? new Date(r.handover.at).toISOString() : '', r.handover?.weightKg ?? '',
  ])
  return [head, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
}

export { HOUR, MIN }
