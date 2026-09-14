import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ReceiptText, Plus, X, Calendar, Building2, DollarSign,
  FileText, ArrowRight, ShieldAlert, CheckCircle2,
} from 'lucide-react'
import api from '../lib/apiClient'
import Pagination, { usePagination } from '../components/Pagination'

const STATUS: Record<string, string> = {
  draft: 'badge-muted',
  pending_validation: 'badge-amber',
  validation_failed: 'badge-red',
  ready: 'badge-blue',
  issued: 'badge-blue',
  sent: 'badge-purple',
  acknowledged: 'badge-blue',
  disputed: 'badge-amber',
  partially_paid: 'badge-amber',
  paid: 'badge-green',
  overdue: 'badge-red',
  void: 'badge-muted',
  superseded: 'badge-amber',
  archived: 'badge-muted',
}

const TYPE_LABELS: Record<string, string> = {
  buyer_invoice: 'Buyer Invoice',
  vendor_statement: 'Vendor Statement',
  vendor_payable_package: 'Vendor Payable Package',
  commission_report: 'Commission Report',
  adjustment_report: 'Adjustment Report',
  internal_admin_invoice_report: 'Internal Admin Report',
}

const formatCurrency = (val: number | string | null | undefined, currency: string = 'USD') => {
  if (val === null || val === undefined || isNaN(Number(val))) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(Number(val))
}

export default function InvoicingPage() {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Fetch invoice runs
  const { data: runs } = useQuery({
    queryKey: ['invoice-runs'],
    queryFn: () => api.get('/invoicing/runs/').then(r => r.data).catch(() => ({ results: [] })),
  })
  const runList = runs?.results ?? (Array.isArray(runs) ? runs : [])

  // Fetch invoices list
  const { data: invoiceData, isLoading, refetch: refetchInvoices } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => api.get('/invoicing/invoices/', { params: { paginate: 'false' } }).then(r => r.data).catch(() => ({ results: [] })),
  })
  const rawInvoices = invoiceData?.results ?? (Array.isArray(invoiceData) ? invoiceData : [])

  // Filter invoices
  const filteredInvoices = rawInvoices.filter((inv: any) => {
    if (filterType !== 'all' && inv.invoice_type !== filterType) return false
    if (filterStatus !== 'all' && inv.status !== filterStatus) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchesId = inv.id?.toLowerCase().includes(q)
      const matchesCounterparty = inv.counterparty_name?.toLowerCase().includes(q) || inv.counterparty_reference?.toLowerCase().includes(q)
      const matchesCompany = inv.company_name?.toLowerCase().includes(q)
      if (!matchesId && !matchesCounterparty && !matchesCompany) return false
    }
    return true
  })

  // Pagination (50 items per page)
  const {
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    paginatedItems: paginatedInvoices,
  } = usePagination(filteredInvoices, 50)

  // Detail query for selected invoice
  const { data: invoiceDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['invoice-detail', selectedInvoiceId],
    queryFn: () => api.get(`/invoicing/invoices/${selectedInvoiceId}/`).then(r => r.data),
    enabled: !!selectedInvoiceId,
  })

  // Lines query for selected invoice
  const { data: invoiceLines, isLoading: isLoadingLines } = useQuery({
    queryKey: ['invoice-lines', selectedInvoiceId],
    queryFn: () => api.get(`/invoicing/invoices/${selectedInvoiceId}/lines/`).then(r => r.data),
    enabled: !!selectedInvoiceId,
  })

  // Adjustments query for selected invoice
  const { data: invoiceAdjustments } = useQuery({
    queryKey: ['invoice-adjustments', selectedInvoiceId],
    queryFn: () => api.get(`/invoicing/invoices/${selectedInvoiceId}/adjustments/`).then(r => r.data),
    enabled: !!selectedInvoiceId,
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
          width: 580px; max-width: 100%;
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
        }
        .drawer-close:hover {
          color: var(--text-primary);
          background: var(--bg-elevated);
        }
        .drawer-title {
          font-size: 18px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;
        }
        .drawer-subtitle {
          font-size: 12px; color: var(--text-muted); font-family: monospace;
        }
        .drawer-section {
          margin-bottom: 24px;
        }
        .drawer-section-title {
          font-size: 13px; font-weight: 600; color: var(--text-secondary);
          text-transform: uppercase; letter-spacing: 0.5px;
          margin-bottom: 12px; display: flex; align-items: center; gap: 8px;
        }
        .detail-card {
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
        }
        .detail-label {
          color: var(--text-secondary);
        }
        .detail-value {
          color: var(--text-primary);
          font-weight: 500;
        }
        .clickable-row {
          cursor: pointer;
          transition: background-color 0.15s ease;
        }
        .clickable-row:hover {
          background-color: var(--bg-elevated) !important;
        }
        .filter-bar {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .filter-input {
          padding: 6px 12px;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--text-primary);
          font-size: 13px;
          min-width: 220px;
        }
        .filter-select {
          padding: 6px 12px;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--text-primary);
          font-size: 13px;
        }
      `}</style>

      <div className="page-header">
        <div>
          <div className="page-title">Invoice Management</div>
          <div className="page-sub">Platform billing, vendor statements, and buyer invoicing across all counterparties</div>
        </div>
      </div>

      {runList.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="section-header">
            <span className="section-title">Active Invoice Runs</span>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {runList.slice(0, 4).map((r: any) => (
              <div
                key={r.id}
                style={{
                  padding: '10px 16px',
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  minWidth: 180,
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.run_label || 'Invoice Run'}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  <span className={`badge ${r.status === 'complete' ? 'badge-green' : 'badge-amber'}`}>
                    {r.status}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    {r.id.slice(0, 8)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="filter-bar">
        <input
          type="text"
          className="filter-input"
          placeholder="Search by ID, Counterparty, or Company..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          className="filter-select"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">All Invoice Types</option>
          <option value="buyer_invoice">Buyer Invoice</option>
          <option value="vendor_statement">Vendor Statement</option>
          <option value="vendor_payable_package">Vendor Payable Package</option>
          <option value="commission_report">Commission Report</option>
          <option value="adjustment_report">Adjustment Report</option>
          <option value="internal_admin_invoice_report">Internal Admin Report</option>
        </select>
        <select
          className="filter-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="ready">Ready</option>
          <option value="issued">Issued</option>
          <option value="sent">Sent</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="paid">Paid</option>
          <option value="disputed">Disputed</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      <div className="table-wrap">
        {isLoading ? (
          <div className="loading-overlay"><div className="spinner" /></div>
        ) : rawInvoices.length === 0 ? (
          <div className="empty-state">
            <ReceiptText size={40} />
            <div>No invoices generated yet</div>
          </div>
        ) : paginatedInvoices.length === 0 ? (
          <div className="empty-state">
            <ReceiptText size={40} />
            <div>No invoices matching filter criteria</div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Counterparty</th>
                <th>Role</th>
                <th>Type</th>
                <th>Status</th>
                <th>Grand Total</th>
                <th>Issued</th>
              </tr>
            </thead>
            <tbody>
              {paginatedInvoices.map((inv: any) => (
                <tr
                  key={inv.id}
                  onClick={() => setSelectedInvoiceId(inv.id)}
                  className="clickable-row"
                >
                  <td className="mono" style={{ color: 'var(--accent)', fontWeight: 500, fontSize: 12 }}>
                    {inv.id.slice(0, 8)}…
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      {inv.counterparty_name || inv.counterparty_reference?.slice(0, 8) || '—'}
                    </div>
                    {inv.company_name && inv.company_name !== inv.counterparty_name && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Scope: {inv.company_name}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${inv.counterparty_role === 'vendor' ? 'badge-purple' : 'badge-blue'}`}>
                      {inv.counterparty_role || 'counterparty'}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-muted" style={{ fontSize: 11 }}>
                      {TYPE_LABELS[inv.invoice_type] || inv.invoice_type}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${STATUS[inv.status] ?? 'badge-muted'}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                    {formatCurrency(inv.grand_total, inv.currency)}
                  </td>
                  <td>
                    {inv.issued_at ? new Date(inv.issued_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={50}
        onPageChange={setCurrentPage}
        itemName="invoices"
      />

      {/* Slide-over Invoice Details Drawer */}
      {selectedInvoiceId && (
        <>
          <div className="drawer-backdrop" onClick={() => setSelectedInvoiceId(null)} />
          <div className="drawer-panel">
            {/* Header */}
            <div className="drawer-header">
              <div>
                <div className="drawer-title">Invoice Details</div>
                <div className="drawer-subtitle">{selectedInvoiceId}</div>
              </div>
              <button className="drawer-close" onClick={() => setSelectedInvoiceId(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Financial Totals */}
            <div className="drawer-section">
              <div className="drawer-section-title">
                <DollarSign size={14} /> Financial Summary
              </div>
              <div className="detail-card">
                <div className="detail-item">
                  <span className="detail-label">Status</span>
                  <span className="detail-value">
                    <span className={`badge ${STATUS[invoiceDetail?.status] ?? 'badge-muted'}`}>
                      {invoiceDetail?.status ?? '...'}
                    </span>
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Invoice Type</span>
                  <span className="detail-value">
                    {TYPE_LABELS[invoiceDetail?.invoice_type] || invoiceDetail?.invoice_type || '...'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Subtotal</span>
                  <span className="detail-value">
                    {formatCurrency(invoiceDetail?.subtotal, invoiceDetail?.currency)}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Commission Total</span>
                  <span className="detail-value" style={{ color: 'var(--accent)' }}>
                    {formatCurrency(invoiceDetail?.commission_total, invoiceDetail?.currency)}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Adjustment Total</span>
                  <span className="detail-value">
                    {formatCurrency(invoiceDetail?.adjustment_total, invoiceDetail?.currency)}
                  </span>
                </div>
                <div className="detail-item" style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 4 }}>
                  <span className="detail-label" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Grand Total</span>
                  <span className="detail-value" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {formatCurrency(invoiceDetail?.grand_total, invoiceDetail?.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Counterparty & Scope Info */}
            <div className="drawer-section">
              <div className="drawer-section-title">
                <Building2 size={14} /> Counterparty & Scope
              </div>
              <div className="detail-card">
                <div className="detail-item">
                  <span className="detail-label">Counterparty Name</span>
                  <span className="detail-value" style={{ fontWeight: 600 }}>
                    {invoiceDetail?.counterparty_name || '—'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Counterparty Role</span>
                  <span className="detail-value">
                    <span className={`badge ${invoiceDetail?.counterparty_role === 'vendor' ? 'badge-purple' : 'badge-blue'}`}>
                      {invoiceDetail?.counterparty_role || '—'}
                    </span>
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Counterparty Ref</span>
                  <span className="detail-value mono" style={{ fontSize: 11 }}>
                    {invoiceDetail?.counterparty_reference || '—'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Company Scope</span>
                  <span className="detail-value">
                    {invoiceDetail?.company_name || invoiceDetail?.company_scope_reference?.slice(0, 8) || '—'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Issued Date</span>
                  <span className="detail-value">
                    {invoiceDetail?.issued_at ? new Date(invoiceDetail.issued_at).toLocaleString() : 'Not Issued Yet'}
                  </span>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="drawer-section">
              <div className="drawer-section-title">
                <FileText size={14} /> Line Items
              </div>
              {isLoadingLines ? (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)' }}>Loading lines...</div>
              ) : !invoiceLines || invoiceLines.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)' }}>No line items recorded</div>
              ) : (
                <div style={{ overflowX: 'auto', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <table style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceLines.map((line: any) => (
                        <tr key={line.id}>
                          <td>
                            <div style={{ fontWeight: 500 }}>{line.line_description || 'Product Line'}</div>
                            {line.source_product_reference && (
                              <div style={{ fontSize: 10, color: 'var(--text-muted)' }} className="mono">
                                Ref: {line.source_product_reference.slice(0, 8)}
                              </div>
                            )}
                          </td>
                          <td>{line.quantity}</td>
                          <td>{formatCurrency(line.unit_price_snapshot, line.currency)}</td>
                          <td style={{ fontWeight: 600 }}>{formatCurrency(line.line_total, line.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Adjustments (if any) */}
            {invoiceAdjustments && invoiceAdjustments.length > 0 && (
              <div className="drawer-section">
                <div className="drawer-section-title">
                  <ShieldAlert size={14} /> Adjustments
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {invoiceAdjustments.map((adj: any) => (
                    <div
                      key={adj.id}
                      style={{
                        padding: '10px 14px',
                        background: 'var(--bg-elevated)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 12 }}>{adj.adjustment_kind}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{adj.reason || 'No reason provided'}</div>
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--accent)' }}>
                        {formatCurrency(adj.amount, adj.currency)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
