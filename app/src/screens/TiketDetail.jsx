import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, ArrowUpRight, MessageCircle, Users } from 'lucide-react'
import { useStore } from '../data/store.jsx'
import { DISPUTE_CATEGORIES, fmtDateTime, fmtLeft } from '../data/rules.js'
import { SW, Empty, useNow } from '../components/ui.jsx'
import { TicketChip } from './Tiket.jsx'

export default function TiketDetail() {
  const { id } = useParams()
  const { db, actions } = useStore()
  const nav = useNavigate()
  const now = useNow(1000)
  const [note, setNote] = useState('')
  const t = db.tickets.find((x) => x.id === id)
  if (!t) return <div className="page narrow"><Empty title="Tiket tidak ditemukan" /></div>
  const canManage = db.user.role === 'admin' || db.user.role === 'sppg'
  const left = t.deadline - now
  const elapsed = Math.min(1, Math.max(0, (now - t.createdAt) / (t.deadline - t.createdAt)))

  return (
    <div className="page narrow">
      <div className="row">
        <button onClick={() => nav(-1)} className="icon-btn" aria-label="Kembali" style={{ marginLeft: -12 }}><ArrowLeft size={24} strokeWidth={SW} /></button>
        <p className="muted num" style={{ flex: 1 }}>{t.id} · {DISPUTE_CATEGORIES.find((c) => c.id === t.category)?.label}</p>
        <TicketChip t={t} now={now} />
      </div>
      <div className="stack tight">
        <h1>{t.title}</h1>
        <p>{t.desc}</p>
      </div>
      {t.photo && <img src={t.photo} alt="Foto pendukung" style={{ borderRadius: 12, maxHeight: 240, objectFit: 'cover' }} />}

      {t.status !== 'selesai' && (
        <section className="zone stack" aria-label="Tenggat">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <b>Tenggat 3 hari</b>
            <span className="num" style={{ fontWeight: 800, color: left < 0 ? 'var(--danger-ink)' : 'var(--ink)' }}>{left > 0 ? `sisa ${fmtLeft(left)}` : 'lewat tenggat'}</span>
          </div>
          <div className="bin" style={{ padding: 0, border: 0, background: 'none' }}>
            <div className="fill" aria-hidden><i style={{ width: `${elapsed * 100}%`, background: elapsed > 0.8 ? 'var(--danger)' : 'var(--accent)' }} /></div>
          </div>
          <p className="small muted row" style={{ gap: 6 }}><Users size={14} strokeWidth={SW} />Tim: LPM, SPPG, perwakilan penerima</p>
        </section>
      )}

      <section className="section" aria-labelledby="h-h">
        <h2 id="h-h">Riwayat</h2>
        <ol className="timeline">
          {t.history.map((h, i) => (
            <li key={i}>
              <span className="node" aria-hidden><MessageCircle size={14} strokeWidth={2.25} /></span>
              <div><p className="t">{h.who}</p><p>{h.text}</p><p className="m num">{fmtDateTime(h.at)}</p></div>
            </li>
          ))}
        </ol>
      </section>

      {t.status !== 'selesai' && (
        <form className="stack" onSubmit={(e) => { e.preventDefault(); if (note.trim()) { actions.addTicketNote(t.id, note.trim()); setNote('') } }}>
          <div className="field">
            <label htmlFor="nt">Tambah catatan</label>
            <textarea id="nt" className="textarea" style={{ minHeight: 80 }} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="row wrap">
            <button className="btn ghost" disabled={!note.trim()}>Kirim catatan</button>
            {canManage && <button type="button" className="btn" onClick={() => actions.resolveTicket(t.id, note.trim() || undefined)}><Check size={18} />Tandai selesai</button>}
            {canManage && t.status !== 'eskalasi' && <button type="button" className="btn ghost" onClick={() => actions.escalateTicket(t.id)}><ArrowUpRight size={18} />Naikkan ke Lurah & DLH</button>}
          </div>
        </form>
      )}
    </div>
  )
}
