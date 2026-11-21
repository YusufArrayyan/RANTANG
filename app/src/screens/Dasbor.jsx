import { Link } from 'react-router-dom'
import { Download, Scale, Percent, Users, MessageSquareWarning, ChevronRight, Eye } from 'lucide-react'
import { useStore, weekStats, toCsv, partyType } from '../data/store.jsx'
import { fmtKg, fmtTime } from '../data/rules.js'
import { SW, useNow, KindIcon, StatusChip } from '../components/ui.jsx'
import { TicketChip } from './Tiket.jsx'

function WeekChart({ days }) {
  const W = 640, H = 220, pad = { l: 36, r: 8, t: 12, b: 28 }
  const max = Math.max(10, ...days.map((d) => d.layak + d.sisa))
  const nice = Math.ceil(max / 10) * 10
  const bw = (W - pad.l - pad.r) / days.length
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / nice)
  const ticks = [0, nice / 2, nice]
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Grafik berat tercatat per hari, 7 hari terakhir">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#DDE5E3" />
          <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#4A5862">{t}</text>
        </g>
      ))}
      {days.map((d, i) => {
        const x = pad.l + i * bw + bw * 0.22
        const w = bw * 0.56
        const yl = y(d.layak)
        const ys = y(d.layak + d.sisa)
        const isToday = i === days.length - 1
        return (
          <g key={d.ts}>
            <title>{`${new Date(d.ts).toLocaleDateString('id-ID', { weekday: 'long' })}: layak ${fmtKg(d.layak)} kg, sisa piring ${fmtKg(d.sisa)} kg`}</title>
            {d.sisa > 0 && <rect x={x} y={ys} width={w} height={Math.max(0, yl - ys - 2)} rx="4" fill="#B79A7B" />}
            {d.layak > 0 && <rect x={x} y={yl} width={w} height={H - pad.b - yl} rx="4" fill="#116C65" />}
            <text x={x + w / 2} y={H - 8} textAnchor="middle" fontSize="12" fontWeight={isToday ? 800 : 500} fill={isToday ? '#23303A' : '#4A5862'}>
              {isToday ? 'Hari ini' : new Date(d.ts).toLocaleDateString('id-ID', { weekday: 'short' })}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export default function Dasbor() {
  const { db, location } = useStore()
  const now = useNow(30000)
  const st = weekStats(db, now)
  const readOnly = db.user.role === 'pengamat'
  const openT = db.tickets.filter((t) => t.status !== 'selesai')
  const recent = db.records.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 6)

  const exportCsv = () => {
    const blob = new Blob(['﻿' + toCsv(db)], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `rantang-${location.sppg.id}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="page">
      <div className="row wrap" style={{ alignItems: 'flex-end' }}>
        <div className="stack tight" style={{ flex: 1, minWidth: 240 }}>
          <p className="muted">{location.kelurahan.name} · 7 hari terakhir</p>
          <h1>Dasbor indikator</h1>
        </div>
        {readOnly && <span className="chip off"><Eye size={14} strokeWidth={2} />Baca saja</span>}
        <button className="btn ghost" onClick={exportCsv}><Download size={18} strokeWidth={SW} />Ekspor CSV</button>
      </div>

      <section className="stats" aria-label="Indikator utama">
        <div className="stat">
          <span className="k"><Scale size={15} strokeWidth={SW} />Dialihkan dari TPA</span>
          <span className="v num">{fmtKg(st.kgDiverted)}<small>kg</small></span>
          <span className="d">serah terima selesai</span>
        </div>
        <div className="stat">
          <span className="k"><Percent size={15} strokeWidth={SW} />Layak tersalur ke warga</span>
          <span className="v num">{st.pctLayak}<small>%</small></span>
          <span className="d">dari catatan pangan layak</span>
        </div>
        <div className="stat">
          <span className="k"><Users size={15} strokeWidth={SW} />Pihak aktif</span>
          <span className="v num">{st.activeRecv + st.activeProc}</span>
          <span className="d num">{st.activeRecv} penerima · {st.activeProc} pengolah</span>
        </div>
        <div className="stat">
          <span className="k"><MessageSquareWarning size={15} strokeWidth={SW} />Keluhan selesai ≤3 hari</span>
          <span className="v num">{st.pctTickets}<small>%</small></span>
          <span className="d num">target ≥80% · {st.openTickets} terbuka</span>
        </div>
      </section>

      <div className="grid2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', alignItems: 'start' }}>
        <section className="card stack" aria-labelledby="ch-h" style={{ gridColumn: 'span 1' }}>
          <div className="section-head"><h2 id="ch-h">Berat tercatat per hari</h2></div>
          <div className="legend">
            <span><i style={{ background: '#116C65' }} />Pangan layak</span>
            <span><i style={{ background: '#B79A7B' }} />Sisa piring</span>
          </div>
          <WeekChart days={st.days} />
          <p className="small muted">Satuan kg. Penurunan volume dianggap keberhasilan program, bukan kegagalan.</p>
        </section>

        <section className="section" aria-labelledby="ot-h">
          <div className="section-head">
            <h2 id="ot-h">Tiket terbuka</h2>
            {!readOnly && <Link to="/tiket">Semua <ChevronRight size={14} style={{ verticalAlign: -2 }} /></Link>}
          </div>
          {openT.length === 0 ? <p className="banner ok">Tidak ada tiket terbuka.</p> : (
            <div className="list">
              {openT.map((t) => {
                const inner = (
                  <>
                    <div className="grow"><p className="meta num">{t.id}</p><p className="title">{t.title}</p></div>
                    <TicketChip t={t} now={now} />
                  </>
                )
                return readOnly ? <div className="item" key={t.id}>{inner}</div> : <Link className="item" to={`/tiket/${t.id}`} key={t.id}>{inner}</Link>
              })}
            </div>
          )}
        </section>
      </div>

      <section className="section" aria-labelledby="rc-h">
        <h2 id="rc-h">Catatan terbaru</h2>
        <div className="tablewrap">
          <table className="table">
            <thead><tr><th>Jenis</th><th>Berat</th><th>Dicatat</th><th>Sumber</th><th>Tujuan</th><th>Status</th></tr></thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id}>
                  <td><span className="row" style={{ gap: 8 }}><KindIcon kind={r.kind} size={18} />{r.kind === 'layak' ? 'Layak' : 'Sisa piring'}</span></td>
                  <td className="num"><b>{fmtKg(r.weightKg)} kg</b></td>
                  <td className="num">{new Date(r.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} {fmtTime(r.createdAt)}</td>
                  <td>{r.source === 'iot' ? r.deviceId : 'Manual'}</td>
                  <td>{r.offers.at(-1) ? (partyType(db, r.offers.at(-1).partyId) === 'pengolah' ? 'Pengolah' : 'Penerima') : '—'}</td>
                  <td><StatusChip record={r} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
