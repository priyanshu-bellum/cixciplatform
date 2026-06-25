// Orders page
import { useQuery } from '@tanstack/react-query'
import { Package, Plus } from 'lucide-react'
import api from '../lib/apiClient'

const STATUS: Record<string, string> = {
  pending: 'badge-amber', routed: 'badge-green', in_progress: 'badge-blue',
  failed: 'badge-red', cancelled: 'badge-muted', partially_routed: 'badge-amber',
}

export default function OrdersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.get('/routing/orders/').then(r => r.data),
  })
  const orders = data?.results ?? data ?? []

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Orders</div>
          <div className="page-sub">Buyer orders and vendor routing</div>
        </div>
        <button className="btn btn-primary"><Plus size={14} /> New Order</button>
      </div>
      <div className="table-wrap">
        {isLoading ? (
          <div className="loading-overlay"><div className="spinner" /></div>
        ) : orders.length === 0 ? (
          <div className="empty-state"><Package size={40} /><div>No orders yet</div></div>
        ) : (
          <table>
            <thead><tr><th>Order ID</th><th>Status</th><th>Placed</th><th>Buyer</th></tr></thead>
            <tbody>
              {orders.map((o: any) => (
                <tr key={o.id}>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }} className="mono">{o.id.slice(0, 8)}…</td>
                  <td><span className={`badge ${STATUS[o.status] ?? 'badge-muted'}`}>{o.status}</span></td>
                  <td>{new Date(o.placed_at).toLocaleDateString()}</td>
                  <td className="mono" style={{ fontSize: 11 }}>{o.buyer_reference?.slice(0, 8)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
