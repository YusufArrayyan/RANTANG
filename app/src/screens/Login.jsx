import { useRef, useState } from 'react'
import { ChefHat, Home, Sprout, Landmark, Eye, ArrowRight, Loader2, ChevronRight, MessageCircle } from 'lucide-react'
import { useStore } from '../data/store.jsx'
import { SW, FieldError } from '../components/ui.jsx'

const ROLES = [
  { id: 'sppg', icon: ChefHat, t: 'Petugas SPPG', d: 'Mencatat sisa pangan dapur' },
  { id: 'penerima', icon: Home, t: 'Penerima', d: 'Melihat dan mengambil tawaran' },
  { id: 'pengolah', icon: Sprout, t: 'Pengolah', d: 'Maggot atau kompos' },
  { id: 'admin', icon: Landmark, t: 'Admin kelurahan', d: 'Aturan, daftar, sengketa' },
  { id: 'pengamat', icon: Eye, t: 'Pengamat', d: 'DLH/BGN, baca saja' },
]

export default function Login() {
  const { actions } = useStore()
  const [role, setRole] = useState('sppg')
  const [phone, setPhone] = useState('812 0000 1111')
  const [step, setStep] = useState('phone')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const refs = useRef([])

  const sendOtp = (e) => {
    e.preventDefault()
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 9) return setErr('Nomor WhatsApp minimal 9 angka setelah +62.')
    setErr('')
    setBusy(true)
    setTimeout(() => { setBusy(false); setStep('otp'); setTimeout(() => refs.current[0]?.focus(), 50) }, 700)
  }

  const verify = (e) => {
    e?.preventDefault()
    const code = otp.join('')
    if (code.length < 6) return setErr('Masukkan 6 angka kode.')
    if (code !== '123456') return setErr('Kode salah. Untuk demo, pakai 123456.')
    setBusy(true)
    setTimeout(() => actions.login(role), 400)
  }

  const setDigit = (i, v) => {
    const d = v.replace(/\D/g, '')
    if (d.length > 1) {
      const all = d.slice(0, 6).split('')
      setOtp([...all, ...Array(6 - all.length).fill('')])
      refs.current[Math.min(5, all.length)]?.focus()
      return
    }
    const next = [...otp]
    next[i] = d
    setOtp(next)
    setErr('')
    if (d && i < 5) refs.current[i + 1]?.focus()
  }

  return (
    <div className="login">
      <section className="art" aria-hidden>
        <div className="row" style={{ gap: 12 }}>
          <span style={{ width: 52, height: 52, background: '#fff', borderRadius: 14, display: 'grid', placeItems: 'center' }}>
            <img src="./icons/mark-128.png" alt="" style={{ width: 38 }} />
          </span>
          <b style={{ fontSize: 22, letterSpacing: '0.04em' }}>RANTANG</b>
        </div>
        <div className="stack" style={{ gap: 20 }}>
          <h2>Sisa pangan dapur sampai ke tangan yang tepat.</h2>
          <p>Pangan layak untuk warga, sisa piring untuk pengolah. Dua aliran terpisah sejak dapur, setiap serah terima tercatat.</p>
          <div className="flow">
            <span>Pilah</span><ChevronRight size={16} /><span>Catat</span><ChevronRight size={16} /><span>Cocokkan</span>
          </div>
        </div>
        <p className="small">Percontohan Kelurahan Sukamaju · 2 SPPG</p>
        <span className="ring" />
      </section>

      <section className="panel">
        <img className="logo" src="./icons/mark-128.png" alt="Logo RANTANG" />
        <div className="stack tight">
          <h1>Masuk ke RANTANG</h1>
          <p className="muted">Pakai nomor WhatsApp yang terdaftar di kelurahan.</p>
        </div>

        {step === 'phone' ? (
          <form className="stack" style={{ gap: 20 }} onSubmit={sendOtp} noValidate>
            <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="label" style={{ marginBottom: 6 }}>Masuk sebagai</legend>
              <div className="roles">
                {ROLES.map((r) => (
                  <button type="button" key={r.id} className="role" aria-pressed={role === r.id} onClick={() => setRole(r.id)}>
                    <span className="ri"><r.icon size={22} strokeWidth={SW} /></span>
                    <span><b>{r.t}</b><span>{r.d}</span></span>
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="field">
              <label htmlFor="wa">Nomor WhatsApp</label>
              <div className="prefix-input">
                <span>+62</span>
                <input id="wa" inputMode="tel" autoComplete="tel-national" value={phone} onChange={(e) => setPhone(e.target.value)} aria-describedby="wa-help" />
              </div>
              <p className="help" id="wa-help">Kode masuk dikirim lewat WhatsApp.</p>
              <FieldError>{err}</FieldError>
            </div>
            <button className="btn lg block" disabled={busy}>
              {busy ? <Loader2 size={20} className="spin" /> : <MessageCircle size={20} strokeWidth={SW} />}
              {busy ? 'Mengirim kode…' : 'Kirim kode'}
            </button>
          </form>
        ) : (
          <form className="stack" style={{ gap: 20 }} onSubmit={verify} noValidate>
            <div className="field">
              <span className="label" id="otp-label">Kode 6 angka dari WhatsApp ke +62 {phone}</span>
              <div className="otp" role="group" aria-labelledby="otp-label">
                {otp.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => (refs.current[i] = el)}
                    inputMode="numeric"
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    maxLength={6}
                    value={d}
                    aria-label={`Angka ke-${i + 1}`}
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Backspace' && !otp[i] && i > 0) refs.current[i - 1]?.focus() }}
                  />
                ))}
              </div>
              <p className="help">Mode demo: kode <b>123456</b>.</p>
              <FieldError>{err}</FieldError>
            </div>
            <button className="btn lg block" disabled={busy}>
              {busy ? <Loader2 size={20} className="spin" /> : <ArrowRight size={20} strokeWidth={SW} />}
              Masuk
            </button>
            <button type="button" className="linkbtn" onClick={() => { setStep('phone'); setOtp(['', '', '', '', '', '']); setErr('') }}>
              Ganti nomor atau peran
            </button>
          </form>
        )}
      </section>
    </div>
  )
}
