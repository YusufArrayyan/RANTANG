import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { StoreProvider, useStore } from './data/store.jsx'
import Shell from './components/Shell.jsx'
import Login from './screens/Login.jsx'
import SppgHome from './screens/SppgHome.jsx'
import Catat from './screens/Catat.jsx'
import Wadah from './screens/Wadah.jsx'
import RecordDetail from './screens/RecordDetail.jsx'
import Tawaran from './screens/Tawaran.jsx'
import Jemputan from './screens/Jemputan.jsx'
import Riwayat from './screens/Riwayat.jsx'
import Tiket from './screens/Tiket.jsx'
import TiketBaru from './screens/TiketBaru.jsx'
import TiketDetail from './screens/TiketDetail.jsx'
import Dasbor from './screens/Dasbor.jsx'
import Aturan from './screens/Aturan.jsx'
import Akun from './screens/Akun.jsx'

function Home() {
  const { db } = useStore()
  switch (db.user.role) {
    case 'sppg': return <SppgHome />
    case 'penerima': return <Tawaran />
    case 'pengolah': return <Jemputan />
    default: return <Dasbor />
  }
}

function Gate() {
  const { db } = useStore()
  if (!db.user) return <Login />
  const r = db.user.role
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Home />} />
        {r === 'sppg' && <Route path="catat" element={<Catat />} />}
        {['sppg', 'admin', 'pengamat'].includes(r) && <Route path="wadah" element={<Wadah />} />}
        <Route path="catatan/:id" element={<RecordDetail />} />
        {['penerima', 'pengolah'].includes(r) && <Route path="riwayat" element={<Riwayat />} />}
        {r !== 'pengamat' && <Route path="tiket" element={<Tiket />} />}
        {r !== 'pengamat' && <Route path="tiket/baru" element={<TiketBaru />} />}
        {r !== 'pengamat' && <Route path="tiket/:id" element={<TiketDetail />} />}
        {r === 'admin' && <Route path="aturan" element={<Aturan />} />}
        <Route path="akun" element={<Akun />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <Gate />
      </HashRouter>
    </StoreProvider>
  )
}
