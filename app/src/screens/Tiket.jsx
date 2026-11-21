import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, MessageSquareWarning, Clock, CheckCheck, ArrowUpRight } from 'lucide-react'
import { useStore } from '../data/store.jsx'
import { DISPUTE_CATEGORIES, fmtDate, fmtLeft } from '../data/rules.js'
import { SW, Empty, useNow } from '../components/ui.jsx'

export function TicketChip({ t, now }) {
  if (t.status === 'selesai') return <span className="chip done"><CheckCheck size={14} strokeWidth={2} />Selesai</span>
  if (t.status === 'eskalasi') return <span className="chip bad"><ArrowUpRight size={14} strokeWidth={2} />Ke Lurah & DLH</span>
  const left = t.deadline - now
  return left > 0
    ? <span className="chip wait"><Clock size={14} strokeWidth={2} />Sisa {fmtLeft(left)}</span>
    : <span className="chip bad"><Clock size={14} strokeWidth={2} />Lewat tenggat</span>
}

export default function Tiket() {
  const { db } = useStore()
  const now = useNow(30000)
  const [tab, setTab] = useState('open')
  const role = db.user.role
  const visible = db.tickets.filter((t) => role === 'admin' || role === 'sppg' || t.by === db.user.partyId)
  const list = visible.filter((t) => (tab === 'open' ? t.status !== 'selesai' : t.status === 'selesai'))
  const cat = (id) => DISPUTE_CATEGORIES.find((c) => c.id === id)?.label

  return (
    <div className="page narrow">
      <div className="row">
        <h1 style={{ flex: 1 }}>Tiket sengketa</h1>
        <Link to="/tiket/baru" className="btn sm"><Plus size={18} />Buat tiket</Link>
      </div>
      <p className="muted">Diselesaikan tim tiga orang (LPM, SPPG, penerima) dalam 3 hari. Lewat tenggat, tiket naik ke Lurah dan DLH.</p>

      <div className="seg" role="group" aria-label="Saring tiket">
        <button aria-pressed={tab === 'open'} onClick={() => setTab('open')}>Terbuka ({visible.filter((t) => t.status !== 'selesai').length})</button>
        <button aria-pressed={tab === 'done'} onClick={() => setTab('done')}>Selesai ({visible.filter((t) => t.status === 'selesai').length})</button>
      </div>

      {list.length === 0 ? (
        <Empty icon={MessageSquareWarning} title={tab === 'open' ? 'Tidak ada tiket terbuka' : 'Belum ada tiket selesai'}>
          Ada keluhan soal bau, jatah, mutu, jadwal, atau perilaku? Buat tiket agar tercatat dan ditangani.
        </Empty>
      ) : (
        <div className="list">
          {list.map((t) => (
            <Link className="item" key={t.id} to={`/tiket/${t.id}`}>
              <div className="grow">
                <p className="meta num">{t.id} · {cat(t.category)} · {fmtDate(t.createdAt)}</p>
                <p className="title">{t.title}</p>
                <div style={{ marginTop: 6 }}><TicketChip t={t} now={now} /></div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
