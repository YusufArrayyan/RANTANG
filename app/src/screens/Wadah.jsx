import { Battery, Wifi, Thermometer, Scale, Cpu, Radio, Server, Smartphone, ArrowRight, RotateCcw } from 'lucide-react'
import { useStore } from '../data/store.jsx'
import { fmtKg, fmtTime, tempZone } from '../data/rules.js'
import { KindIcon, SW, useNow } from '../components/ui.jsx'

export default function Wadah() {
  const { db, iotLog, iotMode, actions } = useStore()
  const now = useNow(1000)
  const canTare = db.user.role === 'sppg'

  return (
    <div className="page">
      <div className="stack tight">
        <h1>Wadah pintar</h1>
        <p className="muted">Timbangan dan sensor suhu di dua wadah dapur. Berat terisi otomatis saat petugas mencatat.</p>
      </div>

      <div className="grid2">
        {db.devices.map((dv) => {
          const ago = Math.max(0, Math.round((now - dv.lastSeen) / 1000))
          const z = tempZone(dv.tempC)
          const pct = Math.min(100, (dv.weightKg / dv.capacityKg) * 100)
          const zoneText = dv.kind === 'sisa' ? 'Suhu ruang' : z === 'hot' ? 'Hangat aman (≥60 °C)' : z === 'cold' ? 'Dingin aman (≤5 °C)' : 'Zona bahaya 5–60 °C'
          return (
            <article className="bin" key={dv.id} aria-label={dv.name}>
              <div className="head">
                <KindIcon kind={dv.kind} />
                <div style={{ flex: 1 }}>
                  <h2>{dv.name}</h2>
                  <p className="small muted row" style={{ gap: 6 }}>
                    <span className={`pulse ${dv.online && ago < 15 ? 'live' : 'offline'}`} aria-hidden />
                    {dv.id} · {dv.online && ago < 15 ? `data ${ago} dtk lalu` : 'terputus'}
                  </p>
                </div>
              </div>
              <div className="reading" aria-live="polite">
                <span className="v num">{fmtKg(dv.weightKg)}</span><span className="u">kg</span>
                <span className="muted small" style={{ marginLeft: 'auto' }}>kapasitas {dv.capacityKg} kg</span>
              </div>
              <div className="fill" aria-hidden><i style={{ width: `${pct}%`, background: dv.kind === 'layak' ? 'var(--brand)' : 'var(--scrap)' }} /></div>
              <div className="metrics">
                <div><Thermometer size={14} strokeWidth={SW} aria-hidden /> Suhu<b className="num">{dv.tempC.toFixed(1)} °C</b><span style={{ color: dv.kind === 'layak' && z === 'danger' ? 'var(--danger-ink)' : 'inherit', fontWeight: 600 }}>{zoneText}</span></div>
                <div><Battery size={14} strokeWidth={SW} aria-hidden /> Baterai<b className="num">{dv.battery}%</b></div>
                <div><Wifi size={14} strokeWidth={SW} aria-hidden /> Sinyal<b className="num">{dv.rssi} dBm</b></div>
              </div>
              {canTare && (
                <button className="btn quiet sm" style={{ alignSelf: 'flex-start' }} onClick={() => actions.tareDevice(dv.id)}>
                  <RotateCcw size={16} strokeWidth={SW} />Nolkan timbangan
                </button>
              )}
            </article>
          )
        })}
      </div>

      <section className="section" aria-labelledby="flow-h">
        <h2 id="flow-h">Alur data</h2>
        <div className="zone">
          <ol className="row wrap" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 10, alignItems: 'stretch' }}>
            {[
              { i: Scale, t: 'Sensor', d: 'Load cell HX711 + DS18B20' },
              { i: Cpu, t: 'ESP32', d: 'Kirim tiap 10 dtk / saat berat stabil berubah' },
              { i: Radio, t: 'MQTT / HTTPS', d: 'rantang/sppg-01/bin/+/telemetry' },
              { i: Server, t: 'API RANTANG', d: 'Validasi kunci perangkat, simpan, siarkan' },
              { i: Smartphone, t: 'Aplikasi', d: 'Berat terisi otomatis, peringatan suhu' },
            ].map((s, k, arr) => (
              <li key={s.t} className="row" style={{ gap: 10, flex: '1 1 160px' }}>
                <div className="stack tight" style={{ background: '#fff', borderRadius: 12, padding: 12, flex: 1, border: '1px solid var(--mint-line)' }}>
                  <s.i size={22} strokeWidth={SW} color="var(--brand)" aria-hidden />
                  <b>{s.t}</b>
                  <span className="small muted">{s.d}</span>
                </div>
                {k < arr.length - 1 && <ArrowRight size={18} color="var(--ink-3)" aria-hidden />}
              </li>
            ))}
          </ol>
        </div>
        <p className="help">
          Sumber data: {iotMode === 'sim' ? 'simulasi di peramban (tanpa server). Hubungkan server dengan VITE_API_URL untuk data perangkat asli.' : 'server RANTANG (Server-Sent Events).'}
        </p>
      </section>

      <section className="section" aria-labelledby="log-h">
        <h2 id="log-h">Pesan masuk terbaru</h2>
        <div className="log" role="log" aria-live="off">
          {iotLog.length === 0 && <div>Menunggu data perangkat…</div>}
          {iotLog.slice(0, 14).map((m, i) => (
            <div key={i}>
              <span className="t">{fmtTime(m.at)}:{String(new Date(m.at).getSeconds()).padStart(2, '0')}</span>{' '}
              {m.topic} {JSON.stringify({ w: m.payload.weight_g, t: m.payload.temp_c, bat: m.payload.battery_pct })}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
