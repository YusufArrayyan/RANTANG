import { useState } from 'react'
import { Lock, Minus, Plus, UserPlus, History } from 'lucide-react'
import { useStore } from '../data/store.jsx'
import { fmtDateTime } from '../data/rules.js'
import { SW, Toggle, Sheet, FieldError } from '../components/ui.jsx'

function Stepper({ value, onChange, min, max, step = 1, unit, label }) {
  return (
    <div className="row" style={{ gap: 8 }} role="group" aria-label={label}>
      <button className="icon-btn" style={{ border: '1.5px solid var(--line)' }} onClick={() => onChange(Math.max(min, value - step))} aria-label={`Kurangi ${label}`} disabled={value <= min}><Minus size={18} /></button>
      <b className="num" style={{ minWidth: 72, textAlign: 'center', fontSize: 18 }}>{value} {unit}</b>
      <button className="icon-btn" style={{ border: '1.5px solid var(--line)' }} onClick={() => onChange(Math.min(max, value + step))} aria-label={`Tambah ${label}`} disabled={value >= max}><Plus size={18} /></button>
    </div>
  )
}

export default function Aturan() {
  const { db, actions } = useStore()
  const { rules } = db
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ nick: '', rt: '', phone: '', type: 'penerima' })
  const [err, setErr] = useState('')

  const add = (e) => {
    e.preventDefault()
    if (form.nick.trim().length < 2 || form.phone.replace(/\D/g, '').length < 9) return setErr('Isi nama panggilan dan nomor WhatsApp yang benar.')
    actions.addParty({ ...form, nick: form.nick.trim() })
    setForm({ nick: '', rt: '', phone: '', type: 'penerima' })
    setErr('')
    setOpen(false)
  }

  return (
    <div className="page">
      <div className="stack tight">
        <h1>Pengaturan aturan</h1>
        <p className="muted">Setiap perubahan tercatat di log audit.</p>
      </div>

      <div className="lock" role="note">
        <Lock size={22} strokeWidth={SW} />
        <div>
          <b>Aturan dua aliran (terkunci)</b>
          <p>Hanya catatan pangan layak yang boleh ditawarkan ke warga. Sisa piring hanya ke pengolah. Aturan ini tidak dapat diubah dari aplikasi.</p>
        </div>
      </div>

      <div className="grid2" style={{ alignItems: 'start' }}>
        <section className="card stack" aria-labelledby="w-h">
          <h2 id="w-h">Batas waktu</h2>
          <div className="row wrap" style={{ justifyContent: 'space-between' }}>
            <div><b>Jam masak → serah terima</b><p className="help">Ditetapkan bersama ahli keamanan pangan.</p></div>
            <Stepper label="batas jam" value={rules.maxHoursFromCook} min={1} max={8} unit="jam" onChange={(v) => actions.setRule('maxHoursFromCook', v, `Batas waktu jam masak → serah terima diubah menjadi ${v} jam.`)} />
          </div>
          <hr className="divider" />
          <div className="row wrap" style={{ justifyContent: 'space-between' }}>
            <div><b>Waktu menjawab tawaran</b><p className="help">Lewat dari ini, tawaran dialihkan.</p></div>
            <Stepper label="waktu jawab" value={rules.confirmMinutes} min={10} max={120} step={5} unit="mnt" onChange={(v) => actions.setRule('confirmMinutes', v, `Waktu menjawab tawaran diubah menjadi ${v} menit.`)} />
          </div>
          <hr className="divider" />
          <div className="row wrap" style={{ justifyContent: 'space-between' }}>
            <b>Jam operasi dapur</b>
            <div className="row" style={{ gap: 8 }}>
              <input aria-label="Mulai" type="time" className="input" style={{ width: 120 }} value={rules.opsStart} onChange={(e) => actions.setRule('opsStart', e.target.value, `Jam operasi mulai ${e.target.value}.`)} />
              <span>–</span>
              <input aria-label="Selesai" type="time" className="input" style={{ width: 120 }} value={rules.opsEnd} onChange={(e) => actions.setRule('opsEnd', e.target.value, `Jam operasi selesai ${e.target.value}.`)} />
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="p-h">
          <div className="section-head">
            <h2 id="p-h">Daftar penerima & pengolah</h2>
            <button className="linkbtn" onClick={() => setOpen(true)}><UserPlus size={15} style={{ verticalAlign: -2 }} /> Tambah</button>
          </div>
          <p className="help">Ditetapkan lewat musyawarah. Daftar ini privat: hanya admin kelurahan dan SPPG terkait yang melihat.</p>
          <div className="list">
            {db.parties.map((p) => (
              <div className="item" key={p.id}>
                <div className="grow">
                  <p className="title">{p.nick}</p>
                  <p className="meta">{p.type === 'pengolah' ? `Pengolah · ${p.kind || ''}` : 'Penerima'} · {p.rt} · {p.distanceKm.toFixed(1)} km</p>
                </div>
                <span className={`chip ${p.active ? 'ok' : 'off'}`}>{p.active ? 'Aktif' : 'Nonaktif'}</span>
                <Toggle checked={p.active} label={`${p.nick} aktif`} onChange={(v) => actions.setPartyActive(p.id, v)} />
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="section" aria-labelledby="a-h">
        <h2 id="a-h"><History size={18} strokeWidth={SW} style={{ verticalAlign: -3 }} /> Log audit</h2>
        <div className="list">
          {db.audit.slice(0, 10).map((a, i) => (
            <div className="item" key={i} style={{ minHeight: 56 }}>
              <div className="grow"><p>{a.text}</p><p className="meta num">{a.who} · {fmtDateTime(a.at)}</p></div>
            </div>
          ))}
        </div>
      </section>

      <Sheet open={open} onClose={() => setOpen(false)} title="Tambah ke daftar">
        <form className="stack" onSubmit={add} noValidate>
          <div className="seg" role="group" aria-label="Jenis">
            <button type="button" aria-pressed={form.type === 'penerima'} onClick={() => setForm({ ...form, type: 'penerima' })}>Penerima</button>
            <button type="button" aria-pressed={form.type === 'pengolah'} onClick={() => setForm({ ...form, type: 'pengolah' })}>Pengolah</button>
          </div>
          <div className="field"><label htmlFor="an">Nama panggilan</label><input id="an" className="input" value={form.nick} onChange={(e) => setForm({ ...form, nick: e.target.value })} /></div>
          <div className="field"><label htmlFor="ar">RT/RW</label><input id="ar" className="input" value={form.rt} onChange={(e) => setForm({ ...form, rt: e.target.value })} placeholder="RT 02/RW 05" /></div>
          <div className="field"><label htmlFor="ap">Nomor WhatsApp</label><input id="ap" className="input" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <FieldError>{err}</FieldError>
          <button className="btn lg block">Simpan</button>
        </form>
      </Sheet>
    </div>
  )
}
