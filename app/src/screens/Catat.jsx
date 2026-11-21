import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Leaf, Recycle, Check, Camera, Send, Cpu, Pencil, Delete, CheckCircle2, ShieldCheck, Thermometer, X, Loader2,
} from 'lucide-react'
import { useStore } from '../data/store.jsx'
import { CHECKLIST, HOUR, MIN, fmtKg, fmtTime, tempZone } from '../data/rules.js'
import { SW, FieldError, compressImage } from '../components/ui.jsx'

function cookChoices(now = Date.now()) {
  const step = 30 * MIN
  const base = Math.floor(now / step) * step
  return [4, 3, 2, 1].map((k) => base - k * step)
}

export default function Catat() {
  const { db, actions, isOnline } = useStore()
  const nav = useNavigate()
  const [kind, setKind] = useState(null)
  const [manual, setManual] = useState(false)
  const [typed, setTyped] = useState('')
  const choices = useMemo(() => cookChoices(), [])
  const [cookedAt, setCookedAt] = useState(choices[2])
  const [otherTime, setOtherTime] = useState('')
  const [checks, setChecks] = useState([false, false, false])
  const [photo, setPhoto] = useState(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [errors, setErrors] = useState({})
  const [done, setDone] = useState(null)
  const [sending, setSending] = useState(false)

  const device = kind ? db.devices.find((d) => d.kind === kind) : null
  const iotOk = device?.online && device.weightKg > 0.3
  const useIot = iotOk && !manual
  const weight = useIot ? Math.round(device.weightKg * 10) / 10 : Number(typed.replace(',', '.')) || 0
  const safeUntil = cookedAt + db.rules.maxHoursFromCook * HOUR
  const zone = device ? tempZone(device.tempC) : 'unknown'

  const pickKind = (k) => {
    setKind(k)
    setErrors({})
    const dv = db.devices.find((d) => d.kind === k)
    setManual(!(dv?.online && dv.weightKg > 0.3))
  }

  const press = (k) => {
    setErrors((e) => ({ ...e, weightKg: undefined }))
    if (k === 'del') return setTyped((t) => t.slice(0, -1))
    if (k === ',') return setTyped((t) => (t.includes(',') ? t : (t || '0') + ','))
    setTyped((t) => {
      const next = t === '0' ? k : t + k
      const [a, b] = next.split(',')
      if (a.length > 3 || (b && b.length > 1)) return t
      return next
    })
  }

  const onPhoto = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setPhotoBusy(true)
    try { setPhoto(await compressImage(f)) } catch { setErrors((x) => ({ ...x, photo: 'Foto tidak bisa dibaca. Coba ambil ulang.' })) }
    setPhotoBusy(false)
  }

  const submit = () => {
    setSending(true)
    const res = actions.createRecord({
      kind, weightKg: weight, cookedAt, checklist: checks, photo,
      source: useIot ? 'iot' : 'manual', deviceId: useIot ? device.id : null, tempC: device?.tempC ?? null,
    })
    setTimeout(() => {
      setSending(false)
      if (!res.ok) { setErrors(res.errors); return }
      setDone(res.record)
    }, 350)
  }

  if (done) return <Done record={done} onAgain={() => { setDone(null); setKind(null); setChecks([false, false, false]); setPhoto(null); setTyped('') }} />

  return (
    <div className="page narrow">
      <div className="row">
        <Link to="/" className="icon-btn" aria-label="Kembali" style={{ marginLeft: -12 }}><ArrowLeft size={24} strokeWidth={SW} /></Link>
        <h1 style={{ flex: 1 }}>Catat sisa pangan</h1>
      </div>

      <section className="section" aria-labelledby="k-h">
        <h2 id="k-h">Jenis isi wadah</h2>
        <div className="grid2" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <button className="choice layak" aria-pressed={kind === 'layak'} onClick={() => pickKind('layak')}>
            <span className="ico"><Leaf size={24} strokeWidth={SW} /></span>
            <span className="t">Pangan layak</span>
            <span className="d">Belum disajikan, tertutup. Boleh untuk warga.</span>
          </button>
          <button className="choice sisa" aria-pressed={kind === 'sisa'} onClick={() => pickKind('sisa')}>
            <span className="ico"><Recycle size={24} strokeWidth={SW} /></span>
            <span className="t">Sisa piring</span>
            <span className="d">Bekas makan siswa. Hanya untuk pengolah.</span>
          </button>
        </div>
        <FieldError>{errors.kind}</FieldError>
      </section>

      {kind && (
        <>
          <section className="section" aria-labelledby="w-h">
            <div className="section-head">
              <h2 id="w-h">Berat</h2>
              {iotOk && (
                <button className="linkbtn" onClick={() => setManual((m) => !m)}>
                  {manual ? <><Cpu size={14} style={{ verticalAlign: -2 }} /> Pakai wadah pintar</> : <><Pencil size={14} style={{ verticalAlign: -2 }} /> Ketik manual</>}
                </button>
              )}
            </div>
            {useIot ? (
              <div className="zone stack" style={{ gap: 10 }}>
                <div className="weight-display" aria-live="polite">
                  <span className="v num">{fmtKg(weight)}</span><span className="u">kg</span>
                </div>
                <div className="iot-fill">
                  <span className="pulse live" aria-hidden />
                  <span style={{ flex: 1 }}>Dibaca langsung dari {device.name.toLowerCase()} ({device.id})</span>
                  <span className="num"><Thermometer size={14} style={{ verticalAlign: -2 }} /> {device.tempC.toFixed(1)} °C</span>
                </div>
                {kind === 'layak' && zone === 'danger' && (
                  <p className="banner bad">Suhu wadah {device.tempC.toFixed(1)} °C ada di zona bahaya (5–60 °C). Pastikan pemanas wadah menyala.</p>
                )}
              </div>
            ) : (
              <div className="zone stack" style={{ gap: 12 }}>
                <div className="weight-display" aria-live="polite">
                  <span className="v num">{typed || '0'}</span><span className="u">kg</span>
                </div>
                <div className="numpad" role="group" aria-label="Papan angka berat">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0'].map((k) => (
                    <button key={k} type="button" onClick={() => press(k)} aria-label={k === ',' ? 'koma' : k}>{k}</button>
                  ))}
                  <button type="button" onClick={() => press('del')} aria-label="Hapus satu angka"><Delete size={22} strokeWidth={SW} style={{ margin: 'auto' }} /></button>
                </div>
                {!device?.online && <p className="help">Wadah pintar tidak terhubung. Berat diketik manual.</p>}
              </div>
            )}
            <FieldError>{errors.weightKg}</FieldError>
          </section>

          <section className="section" aria-labelledby="c-h">
            <h2 id="c-h">Jam masak</h2>
            <div className="chips" role="group" aria-labelledby="c-h">
              {choices.map((t) => (
                <button key={t} className="pickchip num" aria-pressed={cookedAt === t && !otherTime} onClick={() => { setCookedAt(t); setOtherTime(''); setErrors((e) => ({ ...e, cookedAt: undefined })) }}>
                  {fmtTime(t)}
                </button>
              ))}
              <label className="pickchip row" style={{ gap: 6, paddingRight: 8 }} aria-pressed={!!otherTime}>
                <span className="small">Lain</span>
                <input
                  type="time" value={otherTime} aria-label="Jam masak lain"
                  style={{ border: 0, background: 'transparent', minHeight: 40, fontSize: 15 }}
                  onChange={(e) => {
                    setOtherTime(e.target.value)
                    if (e.target.value) {
                      const [h, m] = e.target.value.split(':').map(Number)
                      const d = new Date(); d.setHours(h, m, 0, 0)
                      setCookedAt(d.getTime())
                    }
                  }}
                />
              </label>
            </div>
            {kind === 'layak' && (
              <p className="help"><ShieldCheck size={14} style={{ verticalAlign: -2 }} /> Aman ditawarkan sampai <b className="num">{fmtTime(safeUntil)}</b> (batas {db.rules.maxHoursFromCook} jam dari jam masak).</p>
            )}
            <FieldError>{errors.cookedAt}</FieldError>
          </section>

          {kind === 'layak' && (
            <section className="section" aria-labelledby="ck-h">
              <div className="section-head">
                <h2 id="ck-h">Cek kelayakan</h2>
                <button className="linkbtn" onClick={() => { setChecks([true, true, true]); setErrors((e) => ({ ...e, checklist: undefined })) }}>Semua sesuai</button>
              </div>
              <div className="stack tight">
                {CHECKLIST.map((c, i) => (
                  <label key={i} className={`check ${checks[i] ? 'on' : ''}`}>
                    <input type="checkbox" checked={checks[i]} onChange={(e) => { const n = [...checks]; n[i] = e.target.checked; setChecks(n); setErrors((x) => ({ ...x, checklist: undefined })) }} />
                    <span className="box"><Check size={16} strokeWidth={3} /></span>
                    <span>{c}</span>
                  </label>
                ))}
              </div>
              <FieldError>{errors.checklist}</FieldError>
            </section>
          )}

          <section className="section" aria-labelledby="p-h">
            <h2 id="p-h">Foto <span className="muted small" style={{ fontWeight: 500 }}>(tidak wajib)</span></h2>
            <label className="photo-drop">
              <input type="file" accept="image/*" capture="environment" onChange={onPhoto} className="sr-only" />
              {photo ? <img src={photo} alt="Pratinjau foto wadah" /> : <span className="pi">{photoBusy ? <Loader2 className="spin" size={22} /> : <Camera size={22} strokeWidth={SW} />}</span>}
              <span style={{ flex: 1 }}>
                <b style={{ display: 'block' }}>{photo ? 'Foto siap' : 'Ambil foto wadah'}</b>
                <span className="help">Dikompres di ponsel agar hemat kuota.</span>
              </span>
              {photo && <button type="button" className="icon-btn" aria-label="Hapus foto" onClick={(e) => { e.preventDefault(); setPhoto(null) }}><X size={20} /></button>}
            </label>
            <FieldError>{errors.photo}</FieldError>
          </section>

          <div className="actionbar">
            <button className="btn lg block" onClick={submit} disabled={sending}>
              {sending ? <Loader2 size={20} className="spin" /> : <Send size={20} strokeWidth={SW} />}
              {isOnline ? `Kirim ${weight ? fmtKg(weight) + ' kg' : ''}` : 'Simpan di ponsel'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function Done({ record, onAgain }) {
  const { db } = useStore()
  const r = db.records.find((x) => x.id === record.id) || record
  const cur = r.offers?.at(-1)
  const p = cur && db.parties.find((x) => x.id === cur.partyId)
  return (
    <div className="page narrow" style={{ paddingTop: 48 }}>
      <div className="stack" style={{ alignItems: 'center', textAlign: 'center', gap: 16 }}>
        <span style={{ width: 72, height: 72, borderRadius: 24, background: 'var(--mint)', color: 'var(--brand)', display: 'grid', placeItems: 'center' }}>
          <CheckCircle2 size={40} strokeWidth={SW} />
        </span>
        <h1>{r.sync === 'pending' ? 'Tersimpan di ponsel' : 'Catatan terkirim'}</h1>
        <p className="muted" style={{ maxWidth: '36ch' }}>
          {r.sync === 'pending'
            ? 'Akan dikirim otomatis begitu ada sinyal.'
            : p
              ? `${fmtKg(r.weightKg)} kg ${r.kind === 'layak' ? 'pangan layak' : 'sisa piring'} ditawarkan ke ${p.type === 'pengolah' ? p.nick : 'penerima terdekat (' + p.rt + ')'}. Batas konfirmasi ${db.rules.confirmMinutes} menit.`
              : 'Belum ada pihak aktif yang cocok. Admin kelurahan diberi tahu.'}
        </p>
      </div>
      <div className="stack" style={{ marginTop: 8 }}>
        <Link className="btn lg block" to={`/catatan/${r.id}`}>Lihat status</Link>
        <button className="btn ghost lg block" onClick={onAgain}>Catat wadah lain</button>
      </div>
    </div>
  )
}
