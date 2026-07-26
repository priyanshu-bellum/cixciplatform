import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Package, Plus, X, Calendar, User, ShoppingBag, Truck } from 'lucide-react'
import api from '../lib/apiClient'

const STATUS: Record<string, string> = {
  pending: 'badge-amber', routed: 'badge-green', in_progress: 'badge-blue',
  failed: 'badge-red', cancelled: 'badge-muted', partially_routed: 'badge-amber',
}

export default function OrdersPage() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  // Fetch orders list
  const { data, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.get('/routing/orders/').then(r => r.data),
  })
  const orders = data?.results ?? data ?? []

  // Fetch detail for selected order
  const { data: orderDetail } = useQuery({
    queryKey: ['order-detail', selectedOrderId],
    queryFn: () => api.get(`/routing/orders/${selectedOrderId}/`).then(r => r.data),
    enabled: !!selectedOrderId,
  })

  // Fetch lines/items for selected order
  const { data: orderLines, isLoading: isLoadingLines } = useQuery({
    queryKey: ['order-lines', selectedOrderId],
    queryFn: () => api.get(`/routing/orders/${selectedOrderId}/lines/`).then(r => r.data),
    enabled: !!selectedOrderId,
  })

  // Fetch suborders for selected order
  const { data: suborders, isLoading: isLoadingSubs } = useQuery({
    queryKey: ['order-suborders', selectedOrderId],
    queryFn: () => api.get(`/routing/orders/${selectedOrderId}/suborders/`).then(r => r.data),
    enabled: !!selectedOrderId,
  })

  return (
    <div>
      <style>{`
        .drawer-backdrop {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(4, 6, 12, 0.7);
          backdrop-filter: blur(4px);
          z-index: 1000;
        }
        .drawer-panel {
          position: fixed;
          top: 0; right: 0; bottom: 0;
          width: 550px; max-width: 100%;
          background: var(--bg-surface);
          border-left: 1px solid var(--border);
          z-index: 1001;
          padding: 24px;
          overflow-y: auto;
          box-shadow: -10px 0 40px rgba(0, 0, 0, 0.6);
          display: flex;
          flex-direction: column;
          animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .drawer-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding-bottom: 18px;
          border-bottom: 1px solid var(--border);
          margin-bottom: 24px;
        }
        .drawer-close {
          background: transparent; border: none; cursor: pointer;
          color: var(--text-secondary); padding: 6px; border-radius: var(--radius-sm);
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s;
        }
        .drawer-close:hover {
          background: var(--bg-elevated); color: var(--text-primary);
        }
        .drawer-title {
          font-size: 16px; font-weight: 600; color: var(--text-primary);
        }
        .drawer-subtitle {
          font-size: 11px; color: var(--text-muted); font-family: 'JetBrains Mono', monospace;
          margin-top: 5px;
        }
        .drawer-section {
          margin-bottom: 28px;
        }
        .drawer-section-title {
          font-size: 11px; font-weight: 600; color: var(--text-muted);
          text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 14px;
          display: flex; align-items: center; gap: 8px;
        }
        .detail-card {
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 16px;
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;
        }
        .detail-item {
          display: flex; flex-direction: column; gap: 4px;
        }
        .detail-label {
          font-size: 11px; color: var(--text-muted); font-weight: 500;
        }
        .detail-value {
          font-size: 13px; color: var(--text-secondary);
        }
        .clickable-row {
          cursor: pointer;
          transition: background-color 0.15s ease;
        }
        .clickable-row:hover td {
          background: var(--bg-hover) !important;
          color: var(--text-primary) !important;
        }
      `}</style>

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
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Status</th>
                <th>Placed</th>
                <th>Buyer</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o: any) => (
                <tr key={o.id} onClick={() => setSelectedOrderId(o.id)} className="clickable-row">
                  <td style={{ color: 'var(--accent)', fontWeight: 500 }} className="mono">
                    {o.id.slice(0, 8)}…
                  </td>
                  <td>
                    <span className={`badge ${STATUS[o.status] ?? 'badge-muted'}`}>{o.status}</span>
                  </td>
                  <td>{new Date(o.placed_at).toLocaleDateString()}</td>
                  <td className="mono" style={{ fontSize: 11 }}>
                    {o.buyer_reference?.slice(0, 8)}…
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Slide-over Order Details Drawer */}
      {selectedOrderId && (
        <>
          <div className="drawer-backdrop" onClick={() => setSelectedOrderId(null)} />
          <div className="drawer-panel">
            {/* Header */}
            <div className="drawer-header">
              <div>
                <div className="drawer-title">Order Routing Details</div>
                <div className="drawer-subtitle">{selectedOrderId}</div>
              </div>
              <button className="drawer-close" onClick={() => setSelectedOrderId(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Metadata Summary */}
            <div className="drawer-section">
              <div className="drawer-section-title"><Package size={14} /> Routing Metadata</div>
              <div className="detail-card">
                <div className="detail-item">
                  <span className="detail-label">Status</span>
                  <span className="detail-value">
                    <span className={`badge ${STATUS[orderDetail?.status] ?? 'badge-muted'}`} style={{ marginTop: 2 }}>
                      {orderDetail?.status ?? '...'}
                    </span>
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Placed At</span>
                  <span className="detail-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                    {orderDetail?.placed_at ? new Date(orderDetail.placed_at).toLocaleString() : '...'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Buyer Reference</span>
                  <span className="detail-value mono" style={{ fontSize: 11 }}>
                    <User size={13} style={{ color: 'var(--text-muted)', marginRight: 6, verticalAlign: 'middle' }} />
                    {orderDetail?.buyer_reference ?? '...'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Company Scope</span>
                  <span className="detail-value mono" style={{ fontSize: 11 }}>
                    {orderDetail?.company_scope_reference ?? '...'}
                  </span>
                </div>
              </div>
            </div>

            {/* Items Ordered Section */}
            <div className="drawer-section">
              <div className="drawer-section-title"><ShoppingBag size={14} /> Items Ordered</div>
              {isLoadingLines ? (
                <div className="loading-overlay" style={{ height: 80 }}><div className="spinner" /></div>
              ) : !orderLines || orderLines.length === 0 ? (
                <div className="empty-state" style={{ padding: '20px 0' }}>No line items found.</div>
              ) : (
                <div className="table-wrap" style={{ borderRadius: 'var(--radius-sm)' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Product / SKU</th>
                        <th style={{ textAlign: 'right' }}>Qty</th>
                        <th style={{ textAlign: 'right' }}>Price</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderLines.map((line: any) => (
                        <tr key={line.id}>
                          <td>
                            <div style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: 13 }}>
                              {line.product_name}
                            </div>
                            <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                              {line.sku}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 500 }}>
                            {line.quantity}
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                            ${line.unit_price_snapshot.toFixed(2)}
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--text-primary)', fontWeight: 500 }}>
                            ${line.line_total.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Suborders Section */}
            <div className="drawer-section" style={{ marginBottom: 0 }}>
              <div className="drawer-section-title"><Truck size={14} /> Vendor Suborders</div>
              {isLoadingSubs ? (
                <div className="loading-overlay" style={{ height: 80 }}><div className="spinner" /></div>
              ) : !suborders || suborders.length === 0 ? (
                <div className="empty-state" style={{ padding: '20px 0' }}>No vendor suborders routed.</div>
              ) : (
                <div className="table-wrap" style={{ borderRadius: 'var(--radius-sm)' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Vendor Reference</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suborders.map((sub: any) => (
                        <tr key={sub.id}>
                          <td className="mono" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            {sub.vendor_company_reference}
                          </td>
                          <td>
                            <span className={`badge ${STATUS[sub.status] ?? 'badge-muted'}`}>
                              {sub.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
