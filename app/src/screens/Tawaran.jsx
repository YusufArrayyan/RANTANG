import { Link } from 'react-router-dom'
import { MapPin, Clock, Check, X, Hand, Inbox, Leaf, Scale, Utensils } from 'lucide-react'
import { useStore, currentOffer } from '../data/store.jsx'
import { MIN, fmtKg, fmtLeft, fmtTime, safeDeadline } from '../data/rules.js'
import { SW, Empty, useNow } from '../components/ui.jsx'

export default function Tawaran() {
  const { db, actions, location } = useStore()
  const now = useNow(1000)
  const me = db.parties.find((p) => p.id === db.user.partyId)
  const mine = db.records.filter((r) => currentOffer(r)?.partyId === me?.id)
  const open = mine.filter((r) => r.status === 'ditawarkan')
  const ready = mine.filter((r) => r.status === 'dikonfirmasi')

  if (me && !me.active) {
    return (
      <div className="page narrow">
        <h1>Tawaran</h1>
        <Empty icon={Inbox} title="Anda sedang tidak menerima tawaran" action={<button className="btn" onClick={actions.rejoinProgram}>Terima tawaran lagi</button>}>
          Anda bisa kembali kapan saja. Riwayat Anda tetap tersimpan.
        </Empty>
      </div>
    )
  }

  return (
    <div className="page narrow">
      <div className="stack tight">
        <h1>Tawaran</h1>
        <p className="muted">Pangan dari {location.sppg.name}. Ambil hanya jika Anda bisa datang sebelum batas waktu.</p>
      </div>

      {ready.length > 0 && (
        <section className="section" aria-labelledby="ready-h">
          <h2 id="ready-h">Siap Anda ambil</h2>
          {ready.map((r) => (
            <article className="offer" key={r.id}>
              <div className="top">
                <span className="chip ok"><Check size={14} strokeWidth={2} />Terkonfirmasi</span>
                <p style={{ fontSize: 22, fontWeight: 800 }} className="num">{fmtKg(r.weightKg)} kg pangan siap saji</p>
                <dl className="kv">
                  <dt><MapPin size={14} strokeWidth={SW} />Ambil di</dt><dd>{location.pickup}</dd>
                  <dt><Clock size={14} strokeWidth={SW} />Sebelum</dt><dd className="num">{fmtTime(safeDeadline(r, db.rules))}</dd>
                </dl>
              </div>
              <div style={{ padding: '0 16px 16px' }}>
                <button className="btn lg block" onClick={() => actions.markPicked(r.id)}><Hand size={20} strokeWidth={SW} />Sudah diambil</button>
              </div>
            </article>
          ))}
        </section>
      )}

      <section className="section" aria-labelledby="open-h">
        <div className="section-head"><h2 id="open-h">Tawaran baru</h2><span className="muted small num">{open.length}</span></div>
        {open.length === 0 ? (
          <Empty icon={Inbox} title="Belum ada tawaran">Kami kirim kabar lewat WhatsApp begitu ada pangan untuk Anda.</Empty>
        ) : (
          open.map((r) => {
            const o = currentOffer(r)
            const confirmLeft = o.at + db.rules.confirmMinutes * MIN - now
            return (
              <article className="offer" key={r.id} aria-labelledby={`of-${r.id}`}>
                <div className="top">
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="chip ok"><Leaf size={14} strokeWidth={2} />Pangan layak</span>
                    <span className="chip wait"><Clock size={14} strokeWidth={2} />Jawab dalam <span className="countdown">{fmtLeft(confirmLeft)}</span></span>
                  </div>
                  <h3 id={`of-${r.id}`} style={{ fontSize: 22, fontWeight: 800 }}>Menu MBG hari ini</h3>
                  <dl className="kv">
                    <dt><Scale size={14} strokeWidth={SW} />Perkiraan</dt><dd className="num">{fmtKg(r.weightKg)} kg (±{Math.max(1, Math.round(r.weightKg * 2.5))} porsi)</dd>
                    <dt><Utensils size={14} strokeWidth={SW} />Dimasak</dt><dd className="num">{fmtTime(r.cookedAt)}</dd>
                    <dt><MapPin size={14} strokeWidth={SW} />Ambil di</dt><dd>{location.pickup}</dd>
                    <dt><Clock size={14} strokeWidth={SW} />Ambil sebelum</dt><dd className="num">{fmtTime(safeDeadline(r, db.rules))}</dd>
                  </dl>
                  <Link to={`/catatan/${r.id}`} className="small" style={{ fontWeight: 700 }}>Lihat rincian</Link>
                </div>
                <div className="acts">
                  <button className="btn ghost lg" onClick={() => actions.respondOffer(r.id, false)}><X size={20} />Lewati</button>
                  <button className="btn lg" onClick={() => actions.respondOffer(r.id, true)}><Check size={20} />Saya ambil</button>
                </div>
              </article>
            )
          })
        )}
      </section>
    </div>
  )
}
