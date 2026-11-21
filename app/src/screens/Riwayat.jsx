import { Link } from 'react-router-dom'
import { History } from 'lucide-react'
import { useStore } from '../data/store.jsx'
import { fmtDateTime, fmtKg } from '../data/rules.js'
import { KindIcon, StatusChip, Empty } from '../components/ui.jsx'

export default function Riwayat() {
  const { db } = useStore()
  const mine = db.records
    .filter((r) => r.handover?.by === db.user.partyId)
    .sort((a, b) => b.handover.at - a.handover.at)
  const total = mine.reduce((s, r) => s + r.handover.weightKg, 0)

  return (
    <div className="page narrow">
      <div className="stack tight">
        <h1>Riwayat serah terima</h1>
        <p className="muted num">{mine.length} kali · {fmtKg(total)} kg</p>
      </div>
      {mine.length === 0 ? (
        <Empty icon={History} title="Belum ada serah terima">Setiap pengambilan tercatat di sini dengan jam dan beratnya.</Empty>
      ) : (
        <div className="list">
          {mine.map((r) => (
            <Link className="item" to={`/catatan/${r.id}`} key={r.id}>
              <KindIcon kind={r.kind} />
              <div className="grow">
                <p className="title num">{fmtKg(r.handover.weightKg)} kg</p>
                <p className="meta num">{fmtDateTime(r.handover.at)}</p>
              </div>
              <StatusChip record={r} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
