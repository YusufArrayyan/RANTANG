import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Clock, X, Hand, ClipboardCheck, Cpu, Thermometer, MessageSquareWarning, Lock } from 'lucide-react'
import { useStore, currentOffer } from '../data/store.jsx'
import { fmtDateTime, fmtKg, fmtTime, safeDeadline, fmtLeft } from '../data/rules.js'
import { KindChip, StatusChip, SW, Empty, useNow } from '../components/ui.jsx'

export default function RecordDetail() {
  const { id } = useParams()
  const { db, actions } = useStore()
  const nav = useNavigate()
  const now = useNow(1000)
  const r = db.records.find((x) => x.id === id)
  const role = db.user.role
  if (!r) return <div className="page narrow"><Empty title="Catatan tidak ditemukan">Mungkin sudah dihapus atau tautannya salah.</Empty></div>

  const seesNames = role === 'sppg' || role === 'admin'
  const nameOf = (pid) => {
    const p = db.parties.find((x) => x.id === pid)
    if (!p) return '—'
    if (p.type === 'pengolah') return p.nick
    if (seesNames) return `${p.nick} (${p.rt})`
    return pid === db.user.partyId ? 'Anda' : `Penerima ${p.rt}`
  }
  const cur = currentOffer(r)
  const mine = cur && cur.partyId === db.user.partyId
  const left = safeDeadline(r, db.rules) - now

  const steps = [
    { done: true, t: 'Dicatat dapur', m: `${fmtDateTime(r.createdAt)} · ${r.source === 'iot' ? `berat dari ${r.deviceId}` : 'diketik manual'}` },
    ...r.offers.map((o) => ({
      done: o.status === 'diterima',
      bad: o.status === 'kedaluwarsa' || o.status === 'dilewati',
      todo: o.status === 'ditawarkan',
      t: `Ditawarkan ke ${nameOf(o.partyId)}`,
      m: o.status === 'ditawarkan' ? `Menunggu jawaban sejak ${fmtTime(o.at)}`
        : o.status === 'diterima' ? `Diterima ${fmtTime(o.respondedAt)}${o.pickupAt ? ` · jemput ±${fmtTime(o.pickupAt)}` : ''}`
        : o.status === 'dilewati' ? `Dilewati ${fmtTime(o.respondedAt)}`
        : `Waktu habis ${o.respondedAt ? fmtTime(o.respondedAt) : ''}, dialihkan`,
    })),
    {
      done: !!r.handover, todo: !r.handover,
      t: 'Diambil', m: r.handover ? `${fmtDateTime(r.handover.at)} · ${fmtKg(r.handover.weightKg)} kg` : 'Belum',
    },
    {
      done: !!r.handover?.sppgConfirmedAt, todo: !r.handover?.sppgConfirmedAt,
      t: 'Dikonfirmasi dua pihak', m: r.handover?.sppgConfirmedAt ? `Dapur ${fmtTime(r.handover.sppgConfirmedAt)} · pengambil ${fmtTime(r.handover.partyConfirmedAt)}` : 'Menunggu',
    },
  ]

  return (
    <div className="page narrow">
      <div className="row">
        <button onClick={() => nav(-1)} className="icon-btn" aria-label="Kembali" style={{ marginLeft: -12 }}><ArrowLeft size={24} strokeWidth={SW} /></button>
        <h1 style={{ flex: 1 }}>Serah terima</h1>
      </div>

      <section className="zone stack">
        <div className="row wrap" style={{ gap: 8 }}><KindChip kind={r.kind} /><StatusChip record={r} /></div>
        <p style={{ fontSize: 40, fontWeight: 800, lineHeight: 1 }} className="num">{fmtKg(r.handover?.weightKg ?? r.weightKg)} <span style={{ fontSize: 18, color: 'var(--ink-2)' }}>kg</span></p>
        <dl className="kv" style={{ margin: 0 }}>
          <dt><Clock size={14} strokeWidth={SW} />Jam masak</dt><dd className="num">{fmtDateTime(r.cookedAt)}</dd>
          {r.kind === 'layak' && !r.handover && (<><dt><ClipboardCheck size={14} strokeWidth={SW} />Batas aman</dt><dd className="num">{fmtTime(safeDeadline(r, db.rules))} ({left > 0 ? `sisa ${fmtLeft(left)}` : 'lewat, hanya ke pengolah'})</dd></>)}
          {r.deviceId && (<><dt><Cpu size={14} strokeWidth={SW} />Perangkat</dt><dd>{r.deviceId}</dd></>)}
          {r.tempC != null && (<><dt><Thermometer size={14} strokeWidth={SW} />Suhu saat dicatat</dt><dd className="num">{r.tempC.toFixed ? r.tempC.toFixed(1) : r.tempC} °C</dd></>)}
        </dl>
        {r.photo && <img src={r.photo} alt="Foto wadah" style={{ borderRadius: 12, maxHeight: 220, objectFit: 'cover' }} />}
      </section>

      {/* aksi sesuai peran */}
      {mine && r.status === 'ditawarkan' && (
        <div className="grid2" style={{ gridTemplateColumns: '1fr 2fr', gap: 8 }}>
          <button className="btn ghost lg" onClick={() => actions.respondOffer(r.id, false)}><X size={20} />Lewati</button>
          <button className="btn lg" onClick={() => actions.respondOffer(r.id, true)}><Check size={20} />{db.user.role === 'pengolah' ? 'Konfirmasi jemputan' : 'Saya ambil'}</button>
        </div>
      )}
      {mine && r.status === 'dikonfirmasi' && (
        <button className="btn lg block" onClick={() => actions.markPicked(r.id)}><Hand size={20} strokeWidth={SW} />{db.user.role === 'pengolah' ? 'Sudah dijemput' : 'Sudah diambil'}</button>
      )}
      {role === 'sppg' && r.status === 'diserahkan' && (
        <button className="btn lg block" onClick={() => actions.confirmHandover(r.id)}><Check size={20} />Konfirmasi serah terima</button>
      )}

      <section className="section" aria-labelledby="tl-h">
        <h2 id="tl-h">Riwayat</h2>
        <ol className="timeline">
          {steps.map((s, i) => (
            <li key={i}>
              <span className={`node ${s.bad ? 'bad' : s.todo ? 'todo' : ''}`} aria-hidden>
                {s.bad ? <X size={14} strokeWidth={2.5} /> : s.todo ? <Clock size={14} strokeWidth={2.5} /> : <Check size={14} strokeWidth={2.5} />}
              </span>
              <div><p className="t">{s.t}</p><p className="m num">{s.m}</p></div>
            </li>
          ))}
        </ol>
      </section>

      {r.kind === 'sisa' && (
        <p className="banner info"><Lock size={18} strokeWidth={SW} style={{ flexShrink: 0 }} /><span>Sisa piring hanya diteruskan ke pengolah. Aturan ini terkunci dan tidak bisa diubah.</span></p>
      )}

      {role !== 'pengamat' && (
        <Link className="btn ghost block" to={`/tiket/baru?catatan=${r.id}`}><MessageSquareWarning size={18} strokeWidth={SW} />Laporkan masalah</Link>
      )}
    </div>
  )
}
