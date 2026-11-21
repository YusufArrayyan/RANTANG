import { LogOut, WifiOff, RotateCcw, ShieldCheck, Phone, UserRoundX } from 'lucide-react'
import { useStore } from '../data/store.jsx'
import { ROLE_LABEL } from '../data/seed.js'
import { SW, Toggle } from '../components/ui.jsx'

export default function Akun() {
  const { db, actions } = useStore()
  const u = db.user
  const me = u.partyId && db.parties.find((p) => p.id === u.partyId)

  return (
    <div className="page narrow">
      <h1>Akun</h1>
      <section className="zone row" style={{ gap: 14 }}>
        <span style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--brand)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 22 }} aria-hidden>
          {u.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
        </span>
        <div>
          <h2>{u.name}</h2>
          <p className="muted small">{ROLE_LABEL[u.role]} · {u.org}</p>
          <p className="muted small row" style={{ gap: 6 }}><Phone size={13} strokeWidth={SW} />+62 {u.phone.replace(/^0/, '')}</p>
        </div>
      </section>

      {me && u.role === 'penerima' && (
        <section className="section">
          <h2>Keikutsertaan</h2>
          <div className="list">
            <div className="item">
              <div className="grow">
                <p className="title">Terima tawaran pangan</p>
                <p className="meta">Sukarela. Bisa berhenti dan kembali kapan saja.</p>
              </div>
              <Toggle checked={me.active} label="Terima tawaran" onChange={(v) => (v ? actions.rejoinProgram() : actions.leaveProgram())} />
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <h2>Privasi</h2>
        <p className="banner info"><ShieldCheck size={18} strokeWidth={SW} style={{ flexShrink: 0 }} /><span>Data yang disimpan hanya nama panggilan dan nomor. Nama penerima tidak pernah ditampilkan ke sesama warga.</span></p>
        <button className="btn ghost block" onClick={() => alert('Permintaan hapus akun dikirim ke admin kelurahan. Data dihapus dalam 7 hari.')}><UserRoundX size={18} strokeWidth={SW} />Minta hapus akun</button>
      </section>

      <section className="section">
        <h2>Mode demo</h2>
        <div className="list">
          <div className="item">
            <WifiOff size={22} strokeWidth={SW} color="var(--ink-2)" />
            <div className="grow"><p className="title">Simulasikan luring</p><p className="meta">Catatan disimpan di ponsel dan dikirim saat sinyal kembali.</p></div>
            <Toggle checked={!!db.simOffline} label="Simulasikan luring" onChange={actions.setSimOffline} />
          </div>
          <button className="item" onClick={actions.resetDemo}>
            <RotateCcw size={22} strokeWidth={SW} color="var(--ink-2)" />
            <div className="grow"><p className="title">Pulihkan data demo</p><p className="meta">Kembalikan semua catatan contoh.</p></div>
          </button>
        </div>
      </section>

      <button className="btn ghost lg block" onClick={actions.logout}><LogOut size={20} strokeWidth={SW} />Keluar / ganti peran</button>
      <p className="small muted" style={{ textAlign: 'center' }}>RANTANG v0.1 · percontohan</p>
    </div>
  )
}
