import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Camera, Send, X } from 'lucide-react'
import { useStore } from '../data/store.jsx'
import { DISPUTE_CATEGORIES, fmtKg, fmtTime } from '../data/rules.js'
import { SW, FieldError, compressImage } from '../components/ui.jsx'

const DRAFT_KEY = 'rantang:ticket-draft'

export default function TiketBaru() {
  const { db, actions } = useStore()
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const recordId = sp.get('catatan')
  const rec = recordId && db.records.find((r) => r.id === recordId)
  // draf disimpan agar teks yang sudah diketik tidak hilang (PRD §7.4)
  const saved = (() => { try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY)) || {} } catch { return {} } })()
  const [category, setCategory] = useState(saved.category || '')
  const [title, setTitle] = useState(saved.title || '')
  const [desc, setDesc] = useState(saved.desc || '')
  const [photo, setPhoto] = useState(null)
  const [err, setErr] = useState({})

  const persist = (patch) => sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ category, title, desc, ...patch }))

  const submit = (e) => {
    e.preventDefault()
    const er = {}
    if (!category) er.category = 'Pilih salah satu kategori.'
    if (desc.trim().length < 10) er.desc = 'Ceritakan singkat apa yang terjadi (minimal 10 huruf).'
    setErr(er)
    if (Object.keys(er).length) return
    const t = actions.createTicket({ category, title: title.trim() || DISPUTE_CATEGORIES.find((c) => c.id === category).label, desc: desc.trim(), recordId, photo })
    sessionStorage.removeItem(DRAFT_KEY)
    nav(`/tiket/${t.id}`, { replace: true })
  }

  return (
    <form className="page narrow" onSubmit={submit} noValidate>
      <div className="row">
        <button type="button" onClick={() => nav(-1)} className="icon-btn" aria-label="Kembali" style={{ marginLeft: -12 }}><ArrowLeft size={24} strokeWidth={SW} /></button>
        <h1 style={{ flex: 1 }}>Buat tiket</h1>
      </div>

      {rec && <p className="banner info">Terkait catatan {fmtKg(rec.weightKg)} kg pukul {fmtTime(rec.createdAt)}.</p>}

      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="label" style={{ marginBottom: 8 }}>Kategori</legend>
        <div className="chips">
          {DISPUTE_CATEGORIES.map((c) => (
            <button type="button" key={c.id} className="pickchip" aria-pressed={category === c.id} onClick={() => { setCategory(c.id); persist({ category: c.id }); setErr((x) => ({ ...x, category: undefined })) }}>{c.label}</button>
          ))}
        </div>
        <FieldError>{err.category}</FieldError>
      </fieldset>

      <div className="field">
        <label htmlFor="tt">Judul singkat <span style={{ fontWeight: 400 }}>(tidak wajib)</span></label>
        <input id="tt" className="input" value={title} maxLength={80} onChange={(e) => { setTitle(e.target.value); persist({ title: e.target.value }) }} placeholder="Contoh: jemputan terlambat" />
      </div>

      <div className="field">
        <label htmlFor="td">Apa yang terjadi?</label>
        <textarea id="td" className={`textarea ${err.desc ? 'err' : ''}`} value={desc} onChange={(e) => { setDesc(e.target.value); persist({ desc: e.target.value }) }} aria-describedby="td-h" />
        <p className="help" id="td-h">Nama Anda tidak ditampilkan ke sesama warga.</p>
        <FieldError>{err.desc}</FieldError>
      </div>

      <label className="photo-drop">
        <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setPhoto(await compressImage(f)) }} />
        {photo ? <img src={photo} alt="Pratinjau foto" /> : <span className="pi"><Camera size={22} strokeWidth={SW} /></span>}
        <span style={{ flex: 1 }}><b style={{ display: 'block' }}>Foto pendukung</b><span className="help">Tidak wajib</span></span>
        {photo && <button type="button" className="icon-btn" aria-label="Hapus foto" onClick={(e) => { e.preventDefault(); setPhoto(null) }}><X size={20} /></button>}
      </label>

      <div className="actionbar">
        <button className="btn lg block"><Send size={20} strokeWidth={SW} />Kirim tiket</button>
      </div>
    </form>
  )
}
