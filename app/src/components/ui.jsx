import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle, Check, CheckCheck, Clock, Hand, Info, Leaf, Recycle, Send, RefreshCw, WifiOff, X, CircleAlert,
} from 'lucide-react'
import { useStore, recordStatus } from '../data/store.jsx'

export const SW = 1.75 // ketebalan garis ikon (PRD §7.2)

const STATUS_ICONS = { clock: Clock, check: Check, checkDouble: CheckCheck, hand: Hand, alert: AlertTriangle, info: Info, offline: WifiOff }

export function StatusChip({ record }) {
  const { db } = useStore()
  const s = recordStatus(record, db)
  const I = STATUS_ICONS[s.icon] || Info
  return (
    <span className={`chip ${s.tone}`}>
      <I size={14} strokeWidth={2} aria-hidden />
      {s.label}
    </span>
  )
}

export function KindChip({ kind }) {
  return kind === 'layak' ? (
    <span className="chip ok"><Leaf size={14} strokeWidth={2} aria-hidden />Pangan layak</span>
  ) : (
    <span className="chip scrap"><Recycle size={14} strokeWidth={2} aria-hidden />Sisa piring</span>
  )
}

export function KindIcon({ kind, size = 22 }) {
  return (
    <span className={`kind-ico ${kind}`} aria-hidden>
      {kind === 'layak' ? <Leaf size={size} strokeWidth={SW} /> : <Recycle size={size} strokeWidth={SW} />}
    </span>
  )
}

export function Toasts() {
  const { toasts } = useStore()
  const icons = { ok: Check, send: Send, sync: RefreshCw, offline: WifiOff, warn: AlertTriangle, info: Info }
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => {
        const I = icons[t.icon] || Info
        return (
          <div className="toast" key={t.id}>
            <I size={18} strokeWidth={2} aria-hidden />
            <span>{t.text}</span>
          </div>
        )
      })}
    </div>
  )
}

export function Sheet({ open, onClose, title, children, labelledBy = 'sheet-title' }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    setTimeout(() => ref.current?.querySelector('button, input, textarea, select, [tabindex]')?.focus(), 30)
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.() }
  }, [open, onClose])
  if (!open) return null
  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={labelledBy} ref={ref}>
        <div className="grab" />
        <div className="row" style={{ marginBottom: 12 }}>
          <h2 id={labelledBy} style={{ flex: 1 }}>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Tutup"><X size={22} strokeWidth={SW} /></button>
        </div>
        {children}
      </div>
    </>
  )
}

export function Toggle({ checked, onChange, label, disabled }) {
  return (
    <span className="toggle">
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
      <span className="track" />
      <span className="knob" />
    </span>
  )
}

export function Empty({ icon: I = Info, title, children, action }) {
  return (
    <div className="empty">
      <span className="ei"><I size={26} strokeWidth={SW} /></span>
      <h3>{title}</h3>
      {children && <p className="muted small" style={{ maxWidth: '40ch' }}>{children}</p>}
      {action}
    </div>
  )
}

export function FieldError({ children }) {
  if (!children) return null
  return <p className="errtext" role="alert"><CircleAlert size={16} strokeWidth={2} aria-hidden />{children}</p>
}

/** detak waktu untuk penghitung mundur */
export function useNow(interval = 1000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const h = setInterval(() => setNow(Date.now()), interval)
    return () => clearInterval(h)
  }, [interval])
  return now
}

/** kompres foto di perangkat (PRD §7.1: hemat data) */
export function compressImage(file, max = 960, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * s)
      c.height = Math.round(img.height * s)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', quality))
    }
    img.onerror = reject
    img.src = url
  })
}
