import { Link } from 'react-router-dom'
import { Truck, Clock, MapPin, Check, X, Hand, Scale } from 'lucide-react'
import { useStore, currentOffer } from '../data/store.jsx'
import { MIN, fmtKg, fmtLeft, fmtTime } from '../data/rules.js'
import { SW, Empty, KindChip, useNow } from '../components/ui.jsx'

export default function Jemputan() {
  const { db, actions, location } = useStore()
  const now = useNow(1000)
  const mine = db.records.filter((r) => currentOffer(r)?.partyId === db.user.partyId)
  const open = mine.filter((r) => r.status === 'ditawarkan')
  const sched = mine.filter((r) => r.status === 'dikonfirmasi').sort((a, b) => (currentOffer(a).pickupAt || 0) - (currentOffer(b).pickupAt || 0))
  const total = [...open, ...sched].reduce((s, r) => s + r.weightKg, 0)

  return (
    <div className="page narrow">
      <div className="stack tight">
        <h1>Jemputan hari ini</h1>
        <p className="muted">{location.pickup}</p>
      </div>

      <section className="hero" aria-label="Ringkasan jemputan">
        <div>
          <p className="k">Perkiraan pasokan hari ini</p>
          <p className="big num">{fmtKg(total)}<small>kg</small></p>
        </div>
        <div className="split">
          <div><b className="num">{sched.length}</b>terjadwal</div>
          <div><b className="num">{open.length}</b>perlu konfirmasi</div>
        </div>
      </section>

      {open.length > 0 && (
        <section className="section" aria-labelledby="new-h">
          <h2 id="new-h">Perlu konfirmasi</h2>
          {open.map((r) => {
            const left = currentOffer(r).at + db.rules.confirmMinutes * MIN - now
            return (
              <article className="offer" key={r.id}>
                <div className="top">
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <KindChip kind={r.kind} />
                    <span className="chip wait"><Clock size={14} strokeWidth={2} />{fmtLeft(left)}</span>
                  </div>
                  <p style={{ fontSize: 22, fontWeight: 800 }} className="num">{fmtKg(r.weightKg)} kg</p>
                  {r.kind === 'layak' && <p className="small muted">Pangan layak yang lewat batas waktu atau tidak diambil warga.</p>}
                </div>
                <div className="acts">
                  <button className="btn ghost lg" onClick={() => actions.respondOffer(r.id, false)}><X size={20} />Lewati</button>
                  <button className="btn lg" onClick={() => actions.respondOffer(r.id, true)}><Check size={20} />Konfirmasi</button>
                </div>
              </article>
            )
          })}
        </section>
      )}

      <section className="section" aria-labelledby="sch-h">
        <h2 id="sch-h">Jadwal</h2>
        {sched.length === 0 ? (
          <Empty icon={Truck} title="Belum ada jemputan terjadwal">Jadwal muncul setelah Anda mengonfirmasi pasokan dari dapur.</Empty>
        ) : (
          <div className="stack">
            {sched.map((r) => {
              const o = currentOffer(r)
              return (
                <article className="offer" key={r.id}>
                  <Link className="top" to={`/catatan/${r.id}`} style={{ textDecoration: 'none', color: 'inherit', flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <div style={{ textAlign: 'center', minWidth: 64 }}>
                      <b className="num" style={{ fontSize: 22, display: 'block' }}>{fmtTime(o.pickupAt || now)}</b>
                      <span className="small muted">perkiraan</span>
                    </div>
                    <div className="stack tight" style={{ flex: 1 }}>
                      <b className="num" style={{ fontSize: 18 }}><Scale size={16} strokeWidth={SW} style={{ verticalAlign: -2 }} /> {fmtKg(r.weightKg)} kg {r.kind === 'sisa' ? 'sisa piring' : 'pangan'}</b>
                      <span className="small muted"><MapPin size={13} strokeWidth={SW} style={{ verticalAlign: -2 }} /> Pintu samping dapur</span>
                    </div>
                  </Link>
                  <div style={{ padding: '0 16px 16px' }}>
                    <button className="btn lg block" onClick={() => actions.markPicked(r.id)}><Hand size={20} strokeWidth={SW} />Sudah dijemput</button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
