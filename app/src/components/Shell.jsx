import { NavLink, Link, Outlet, useLocation } from 'react-router-dom'
import {
  Home, Plus, Cpu, MessageSquareWarning, UserRound, Inbox, History, Truck, LayoutDashboard, SlidersHorizontal, WifiOff,
} from 'lucide-react'
import { useStore } from '../data/store.jsx'
import { ROLE_LABEL } from '../data/seed.js'
import { SW, Toasts } from './ui.jsx'

const NAV = {
  sppg: [
    { to: '/', label: 'Beranda', icon: Home, end: true },
    { to: '/catat', label: 'Catat', icon: Plus },
    { to: '/wadah', label: 'Wadah', icon: Cpu },
    { to: '/tiket', label: 'Tiket', icon: MessageSquareWarning, badge: 'tickets' },
    { to: '/akun', label: 'Akun', icon: UserRound },
  ],
  penerima: [
    { to: '/', label: 'Tawaran', icon: Inbox, end: true, badge: 'offers' },
    { to: '/riwayat', label: 'Riwayat', icon: History },
    { to: '/tiket', label: 'Tiket', icon: MessageSquareWarning },
    { to: '/akun', label: 'Akun', icon: UserRound },
  ],
  pengolah: [
    { to: '/', label: 'Jemputan', icon: Truck, end: true, badge: 'offers' },
    { to: '/riwayat', label: 'Riwayat', icon: History },
    { to: '/tiket', label: 'Tiket', icon: MessageSquareWarning },
    { to: '/akun', label: 'Akun', icon: UserRound },
  ],
  admin: [
    { to: '/', label: 'Dasbor', icon: LayoutDashboard, end: true },
    { to: '/tiket', label: 'Tiket', icon: MessageSquareWarning, badge: 'tickets' },
    { to: '/aturan', label: 'Aturan', icon: SlidersHorizontal },
    { to: '/wadah', label: 'Wadah', icon: Cpu },
    { to: '/akun', label: 'Akun', icon: UserRound },
  ],
  pengamat: [
    { to: '/', label: 'Dasbor', icon: LayoutDashboard, end: true },
    { to: '/wadah', label: 'Wadah', icon: Cpu },
    { to: '/akun', label: 'Akun', icon: UserRound },
  ],
}

export default function Shell() {
  const { db, isOnline } = useStore()
  const { pathname } = useLocation()
  const user = db.user
  const items = NAV[user.role]
  const badges = {
    tickets: db.tickets.filter((t) => t.status !== 'selesai').length,
    offers: db.records.filter((r) => r.status === 'ditawarkan' && r.offers.at(-1)?.partyId === user.partyId).length,
  }
  const pending = db.records.filter((r) => r.sync === 'pending').length
  const mobileItems = user.role === 'sppg' ? items.filter((i) => i.to !== '/catat') : items

  return (
    <div className="shell">
      <aside className="sidebar" aria-label="Navigasi utama">
        <div className="brandmark">
          <span className="tile"><img src="./icons/mark-128.png" alt="" /></span>
          <span>RANTANG<small>{db.user.org}</small></span>
        </div>
        {user.role === 'sppg' && (
          <Link to="/catat" className="btn onDark block sidecta"><Plus size={20} strokeWidth={2.25} />Catat sisa pangan</Link>
        )}
        {items.filter((i) => !(user.role === 'sppg' && i.to === '/catat')).map((i) => (
          <NavLink key={i.to} to={i.to} end={i.end}>
            <i.icon size={20} strokeWidth={SW} aria-hidden />
            <span style={{ flex: 1 }}>{i.label}</span>
            {i.badge && badges[i.badge] > 0 && <span className="dot-badge">{badges[i.badge]}</span>}
          </NavLink>
        ))}
        <div className="grow" />
        <div className="whoami"><b>{user.name}</b>{ROLE_LABEL[user.role]}</div>
      </aside>

      <div className="main">
        {!isOnline && (
          <div className="netbar" role="status"><WifiOff size={16} strokeWidth={2} />Luring. {pending ? `${pending} catatan menunggu sinyal.` : 'Catatan baru disimpan di ponsel.'}</div>
        )}
        <header className="topbar">
          <span className="brandmark"><img src="./icons/mark-128.png" alt="" />RANTANG</span>
          <span className="spacer" />
          <span className="who"><b>{user.name}</b><span>{ROLE_LABEL[user.role]}</span></span>
        </header>
        <main id="konten" key={pathname}>
          <Outlet />
        </main>
        {user.role === 'sppg' && pathname !== '/catat' && (
          <Link to="/catat" className="fab" aria-label="Catat sisa pangan"><Plus size={24} strokeWidth={2.5} />Catat</Link>
        )}
        <nav className="bottomnav" aria-label="Navigasi bawah">
          {mobileItems.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.end}>
              <i.icon size={24} strokeWidth={SW} aria-hidden />
              {i.label}
              {i.badge && badges[i.badge] > 0 && <span className="dot-badge badge">{badges[i.badge]}</span>}
            </NavLink>
          ))}
        </nav>
        <Toasts />
      </div>
    </div>
  )
}
