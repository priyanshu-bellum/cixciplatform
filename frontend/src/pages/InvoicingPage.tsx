import { useQuery } from '@tanstack/react-query'
import { ReceiptText, Plus } from 'lucide-react'
import api from '../lib/apiClient'

const STATUS: Record<string, string> = {
  draft: 'badge-muted', issued: 'badge-blue', paid: 'badge-green',
  overdue: 'badge-red', disputed: 'badge-amber', void: 'badge-muted',
}

export default function InvoicingPage() {
  const { data: runs } = useQuery({ queryKey: ['invoice-runs'], queryFn: () => api.get('/invoicing/runs/').then(r => r.data) })
  const { data, isLoading } = useQuery({ queryKey: ['invoices'], queryFn: () => api.get('/invoicing/invoices/').then(r => r.data) })
  const invoices = data?.results ?? data ?? []
  const runList = runs?.results ?? runs ?? []

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Invoice Management</div><div className="page-sub">Billing, reconciliation, and payment tracking</div></div>
        <button className="btn btn-primary"><Plus size={14} /> New Run</button>
      </div>

      {runList.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="section-header"><span className="section-title">Invoice Runs</span></div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {runList.slice(0, 4).map((r: any) => (
              <div key={r.id} style={{ padding: '10px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', minWidth: 160 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.run_label || 'Run'}</div>
                <span className={`badge ${r.status === 'complete' ? 'badge-green' : 'badge-amber'}`} style={{ marginTop: 6 }}>{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="table-wrap">
        {isLoading ? <div className="loading-overlay"><div className="spinner" /></div>
          : invoices.length === 0 ? <div className="empty-state"><ReceiptText size={40} /><div>No invoices yet</div></div>
          : (
            <table>
              <thead><tr><th>Invoice</th><th>Type</th><th>Status</th><th>Total</th><th>Issued</th></tr></thead>
              <tbody>
                {invoices.map((inv: any) => (
                  <tr key={inv.id}>
                    <td className="mono" style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: 12 }}>{inv.id.slice(0, 8)}…</td>
                    <td><span className="badge badge-muted">{inv.invoice_type}</span></td>
                    <td><span className={`badge ${STATUS[inv.status] ?? 'badge-muted'}`}>{inv.status}</span></td>
                    <td style={{ color: 'var(--text-primary)' }}>{inv.currency} {inv.grand_total}</td>
                    <td>{inv.issued_at ? new Date(inv.issued_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  )
}
