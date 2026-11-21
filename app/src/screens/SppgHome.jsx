import { Link } from 'react-router-dom'
import { Plus, ClipboardList, Cpu, Thermometer, ChevronRight, Hand } from 'lucide-react'
import { useStore, weekStats, currentOffer } from '../data/store.jsx'
import { fmtKg, fmtTime, startOfDay, tempZone } from '../data/rules.js'
import { KindIcon, StatusChip, Empty, SW } from '../components/ui.jsx'

export default function SppgHome() {
  const { db, actions, location } = useStore()
  const st = weekStats(db)
  const today = db.records.filter((r) => r.createdAt >= startOfDay())
  const needConfirm = db.records.filter((r) => r.status === 'diserahkan')
  const wl = st.days.reduce((s, d) => s + d.layak, 0)
  const ws = st.days.reduce((s, d) => s + d.sisa, 0)
  const tot = wl + ws || 1
  const hour = new Date().getHours()
  const greet = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : 'Selamat sore'

  return (
    <div className="page narrow">
      <div className="stack tight">
        <p className="muted">{greet}, {db.user.name}</p>
        <h1>{location.sppg.name}</h1>
      </div>

      <section className="hero" aria-label="Ringkasan minggu ini">
        <div>
          <p className="k">Tercatat 7 hari terakhir</p>
          <p className="big num">{fmtKg(wl + ws)}<small>kg</small></p>
        </div>
        <div className="bar" aria-hidden>
          <i style={{ width: `${(wl / tot) * 100}%`, background: 'var(--accent)' }} />
          <i style={{ width: `${(ws / tot) * 100}%`, background: 'rgba(255,255,255,.55)' }} />
        </div>
        <div className="split">
          <div><b className="num">{fmtKg(wl)} kg</b>pangan layak</div>
          <div><b className="num">{fmtKg(ws)} kg</b>sisa piring</div>
          <div><b className="num">{st.pctLayak}%</b>layak sampai ke warga</div>
        </div>
        <Link to="/catat" className="btn onDark lg block"><Plus size={22} strokeWidth={2.5} />Catat sisa pangan</Link>
      </section>

      {needConfirm.length > 0 && (
        <section className="section" aria-labelledby="confirm-h">
          <div className="section-head"><h2 id="confirm-h">Perlu konfirmasi Anda</h2></div>
          <div className="list">
            {needConfirm.map((r) => {
              const p = db.parties.find((x) => x.id === r.handover.by)
              return (
                <div className="item" key={r.id}>
                  <KindIcon kind={r.kind} />
                  <div className="grow">
                    <p className="title num">{fmtKg(r.handover.weightKg)} kg diambil {p?.type === 'pengolah' ? p.nick : 'penerima'}</p>
                    <p className="meta">Pukul {fmtTime(r.handover.at)} · tekan jika sesuai</p>
                  </div>
                  <button className="btn sm" onClick={() => actions.confirmHandover(r.id)}><Hand size={16} strokeWidth={SW} />Benar</button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section className="section" aria-labelledby="today-h">
        <div className="section-head">
          <h2 id="today-h">Hari ini</h2>
          <span className="muted small num">{today.length} catatan</span>
        </div>
        {today.length === 0 ? (
          <Empty icon={ClipboardList} title="Belum ada catatan hari ini" action={<Link className="btn" to="/catat"><Plus size={18} />Mulai catat</Link>}>
            Pisahkan dua wadah dulu, lalu catat dalam tiga ketukan.
          </Empty>
        ) : (
          <div className="list">
            {today.map((r) => {
              const cur = currentOffer(r)
              const p = cur && db.parties.find((x) => x.id === cur.partyId)
              return (
                <Link className="item" to={`/catatan/${r.id}`} key={r.id}>
                  <KindIcon kind={r.kind} />
                  <div className="grow">
                    <p className="title num">{fmtKg(r.weightKg)} kg · {r.kind === 'layak' ? 'Pangan layak' : 'Sisa piring'}</p>
                    <p className="meta">
                      {fmtTime(r.createdAt)}{r.source === 'iot' ? ' · dari wadah pintar' : ''}{p ? ` · ${p.type === 'pengolah' ? p.nick : 'penerima ' + p.rt}` : ''}
                    </p>
                    <div style={{ marginTop: 6 }}><StatusChip record={r} /></div>
                  </div>
                  <ChevronRight size={18} color="var(--ink-3)" aria-hidden />
                </Link>
              )
            })}
          </div>
        )}
      </section>

      <section className="section" aria-labelledby="bins-h">
        <div className="section-head">
          <h2 id="bins-h">Wadah pintar</h2>
          <Link to="/wadah">Detail <ChevronRight size={14} style={{ verticalAlign: -2 }} /></Link>
        </div>
        <div className="list">
          {db.devices.map((dv) => {
            const z = tempZone(dv.tempC)
            return (
              <Link className="item" to="/wadah" key={dv.id}>
                <KindIcon kind={dv.kind} />
                <div className="grow">
                  <p className="title">{dv.name}</p>
                  <p className="meta row" style={{ gap: 6 }}>
                    <span className={`pulse ${dv.online ? 'live' : 'offline'}`} aria-hidden />
                    <Cpu size={13} strokeWidth={SW} aria-hidden />{dv.id}
                    <Thermometer size={13} strokeWidth={SW} aria-hidden style={{ marginLeft: 6 }} />
                    <span className="num">{dv.tempC.toFixed(1)} °C</span>
                    {dv.kind === 'layak' && z === 'danger' && <span style={{ color: 'var(--danger-ink)', fontWeight: 700 }}>· zona bahaya</span>}
                  </p>
                </div>
                <div className="end"><b className="num" style={{ fontSize: 20 }}>{fmtKg(dv.weightKg)}</b> <span className="muted small">kg</span></div>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
