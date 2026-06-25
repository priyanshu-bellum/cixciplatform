import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ShoppingCart, Plus, List } from 'lucide-react'
import api from '../lib/apiClient'

const PO_STATUS: Record<string, string> = {
  draft: 'badge-muted', pending_approval: 'badge-amber', approved: 'badge-blue',
  submitted: 'badge-blue', acknowledged: 'badge-purple', partially_fulfilled: 'badge-amber',
  fulfilled: 'badge-green', cancelled: 'badge-muted', rejected: 'badge-red',
  expired: 'badge-muted', dispute: 'badge-red', closed: 'badge-muted',
}

export default function ProcurementPage() {
  const [tab, setTab] = useState<'orders' | 'lines'>('orders')
  const [selectedPO, setSelectedPO] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () =>
      api.get('/procurement/purchase-orders/').then(r => r.data).catch(() => ({ results: [] })),
  })

  const { data: lineData, isLoading: lineLoading } = useQuery({
    queryKey: ['po-lines', selectedPO?.id],
    queryFn: () =>
      api.get(`/procurement/purchase-orders/${selectedPO.id}/lines/`).then(r => r.data).catch(() => []),
    enabled: tab === 'lines' && !!selectedPO,
  })

  const orders = data?.results ?? (Array.isArray(data) ? data : [])
  const lines = lineData?.results ?? (Array.isArray(lineData) ? lineData : [])

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Procurement</div>
          <div className="page-sub">
            Bulk purchase orders — pricing consumed from immutable snapshots, never recalculated
          </div>
        </div>
        <button className="btn btn-primary"><Plus size={14} /> New PO</button>
      </div>

      <div className="tabs">
        <div className={`tab ${tab === 'orders' ? 'active' : ''}`} onClick={() => setTab('orders')}>
          Purchase Orders
        </div>
        <div className={`tab ${tab === 'lines' ? 'active' : ''}`} onClick={() => setTab('lines')}>
          PO Lines {selectedPO && <span className="badge badge-muted" style={{ marginLeft: 6, fontSize: 10 }}>{selectedPO.po_number || selectedPO.id?.slice(0, 8)}</span>}
        </div>
      </div>

      {tab === 'orders' && (
        <div className="table-wrap">
          {isLoading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : orders.length === 0 ? (
            <div className="empty-state">
              <ShoppingCart size={40} />
              <div>No purchase orders</div>
              <div style={{ fontSize: 12 }}>
                Create bulk purchase orders — prices are bound to Pricing snapshots at submission time
              </div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>PO Number</th><th>Vendor</th><th>Status</th><th>Currency</th>
                  <th>Total</th><th>Created</th><th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o: any) => (
                  <tr key={o.id}>
                    <td className="mono" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {o.po_number || o.id?.slice(0, 8)}
                    </td>
                    <td className="mono" style={{ fontSize: 11 }}>
                      {o.vendor_company_reference?.slice(0, 8)}…
                    </td>
                    <td>
                      <span className={`badge ${PO_STATUS[o.status] ?? 'badge-muted'}`}>
                        {o.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>{o.currency ?? 'USD'}</td>
                    <td style={{ color: 'var(--text-primary)' }}>
                      {o.total_amount != null ? Number(o.total_amount).toLocaleString() : '—'}
                    </td>
                    <td>{o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}</td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => { setSelectedPO(o); setTab('lines') }}
                        title="View lines"
                      >
                        <List size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'lines' && (
        <>
          {!selectedPO ? (
            <div className="empty-state" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              <ShoppingCart size={40} />
              <div>Select a purchase order</div>
              <div style={{ fontSize: 12 }}>Click the lines icon on a PO to view its line items</div>
            </div>
          ) : lineLoading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : lines.length === 0 ? (
            <div className="empty-state" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              <ShoppingCart size={40} />
              <div>No lines on this PO</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Line ID</th><th>Product</th><th>Quantity</th>
                    <th>Unit Price (Snapshot)</th><th>Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l: any) => (
                    <tr key={l.id}>
                      <td className="mono" style={{ fontSize: 11, color: 'var(--text-primary)' }}>
                        {l.id?.slice(0, 8)}…
                      </td>
                      <td className="mono" style={{ fontSize: 11 }}>
                        {l.product_reference?.slice(0, 8)}…
                      </td>
                      <td>{l.quantity}</td>
                      <td>{l.unit_price_snapshot}</td>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{l.line_total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
