import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Truck, Clock, ShieldAlert, UploadCloud, CheckCircle2, AlertCircle, X, RefreshCw, FileText } from 'lucide-react'
import api from '../lib/apiClient'

const HANDOFF_STATUS: Record<string, string> = {
  received: 'badge-blue', processing: 'badge-amber', shipped: 'badge-purple',
  delivered: 'badge-green', exception: 'badge-red', closed: 'badge-muted',
  shipment_pending: 'badge-amber',
}

const SLA_OUTCOME: Record<string, string> = {
  on_time: 'badge-green', late: 'badge-red', missing: 'badge-red',
  partial: 'badge-amber', pending: 'badge-amber', overridden: 'badge-muted',
}

const POLICY_STATUS: Record<string, string> = {
  draft: 'badge-muted', active: 'badge-green', superseded: 'badge-amber', retired: 'badge-red',
}

const RETURN_STATUS_COLORS: Record<string, string> = {
  return_sent_to_vendor: 'badge-blue',
  return_received: 'badge-amber',
  return_refunded: 'badge-green',
  return_rejected: 'badge-red',
  return_closed: 'badge-muted',
}

export default function FulfillmentPage() {
  const [tab, setTab] = useState<'handoffs' | 'sla' | 'policies' | 'exportLogs' | 'returns' | 'returnLogs'>('handoffs')

  const { data: handoffData, isLoading: hLoading } = useQuery({
    queryKey: ['fulfillment-handoffs'],
    queryFn: () => api.get('/fulfillment/handoffs/').then(r => r.data).catch(() => ({ results: [] })),
  })

  const { data: slaData, isLoading: sLoading } = useQuery({
    queryKey: ['sla-evaluations'],
    queryFn: () => api.get('/fulfillment/sla-evaluations/').then(r => r.data).catch(() => ({ results: [] })),
    enabled: tab === 'sla',
  })

  const { data: policyData, isLoading: pLoading } = useQuery({
    queryKey: ['sla-policies'],
    queryFn: () => api.get('/fulfillment/sla-policies/').then(r => r.data).catch(() => ({ results: [] })),
    enabled: tab === 'policies',
  })

  const { data: logData, isLoading: lLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['export-logs'],
    queryFn: () => api.get('/routing/export-logs/').then(r => r.data).catch(() => ({ results: [] })),
    enabled: tab === 'exportLogs',
  })

  const { data: returnsData, isLoading: rLoading, refetch: refetchReturns } = useQuery({
    queryKey: ['return-requests'],
    queryFn: () => api.get('/fulfillment/return-requests/').then(r => r.data).catch(() => ({ results: [] })),
    enabled: tab === 'returns',
  })

  const { data: returnLogData, isLoading: rlLoading, refetch: refetchReturnLogs } = useQuery({
    queryKey: ['return-import-logs'],
    queryFn: () => api.get('/fulfillment/return-import-logs/').then(r => r.data).catch(() => ({ results: [] })),
    enabled: tab === 'returnLogs',
  })

  const handoffs = handoffData?.results ?? (Array.isArray(handoffData) ? handoffData : [])
  const slaEvals = slaData?.results ?? (Array.isArray(slaData) ? slaData : [])
  const policies = policyData?.results ?? (Array.isArray(policyData) ? policyData : [])
  const exportLogs = logData?.results ?? (Array.isArray(logData) ? logData : [])
  const returnRequests = returnsData?.results ?? (Array.isArray(returnsData) ? returnsData : [])
  const returnImportLogs = returnLogData?.results ?? (Array.isArray(returnLogData) ? returnLogData : [])

  const [reexportingId, setReexportingId] = useState<string | null>(null)
  
  // Return Import Modal States
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const handleReexport = async (id: string) => {
    if (reexportingId) return
    setReexportingId(id)
    try {
      await api.post(`/routing/export-logs/${id}/reexport/`)
      alert('Re-export triggered successfully!')
      refetchLogs()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to trigger re-export.')
    } finally {
      setReexportingId(null)
    }
  }

  const handleDownloadCSV = (log: any) => {
    if (!log.csv_backup) {
      alert('No CSV content available for this log.')
      return
    }
    const blob = new Blob([log.csv_backup], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', log.filename || 'export.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0])
      setPreviewData(null)
      setImportError(null)
    }
  }

  const handlePreview = async () => {
    if (!importFile) return
    setImporting(true)
    setImportError(null)
    const fd = new FormData()
    fd.append('file', importFile)
    fd.append('confirm', 'false')
    try {
      const resp = await api.post('/fulfillment/return-requests/import-returns/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setPreviewData(resp.data)
    } catch (err: any) {
      const errors = err.response?.data?.errors
      if (Array.isArray(errors) && errors.length > 0) {
        setImportError(errors.map((e: any) => `${e.row}: ${e.errors?.join(', ')}`).join('\n'))
      } else {
        setImportError(err.response?.data?.detail || 'Failed to process return import preview.')
      }
    } finally {
      setImporting(false)
    }
  }

  const handleConfirmApply = async () => {
    if (!importFile) return
    setImporting(true)
    setImportError(null)
    const fd = new FormData()
    fd.append('file', importFile)
    fd.append('confirm', 'true')
    try {
      const resp = await api.post('/fulfillment/return-requests/import-returns/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      alert(`Import applied successfully! Success: ${resp.data.success_count}, Skipped: ${resp.data.skipped_count}, Rejected: ${resp.data.rejected_count}, Review Required: ${resp.data.review_required_count}`)
      setShowImportModal(false)
      setImportFile(null)
      setPreviewData(null)
      refetchReturns()
      refetchReturnLogs()
    } catch (err: any) {
      setImportError(err.response?.data?.detail || 'Failed to apply return import.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Fulfillment & Returns</div>
          <div className="page-sub">Vendor handoffs, SLA evaluation records, and response policies</div>
        </div>
        {tab === 'returns' && (
          <button className="btn btn-primary" onClick={() => {
            setImportFile(null);
            setPreviewData(null);
            setImportError(null);
            setShowImportModal(true);
          }}>
            <UploadCloud size={14} style={{ marginRight: 6 }} /> Import Returns (CSV)
          </button>
        )}
      </div>

      <div className="tabs">
        <div className={`tab ${tab === 'handoffs' ? 'active' : ''}`} onClick={() => setTab('handoffs')}>
          Handoffs
        </div>
        <div className={`tab ${tab === 'sla' ? 'active' : ''}`} onClick={() => setTab('sla')}>
          SLA Evaluations
        </div>
        <div className={`tab ${tab === 'policies' ? 'active' : ''}`} onClick={() => setTab('policies')}>
          SLA Policies
        </div>
        <div className={`tab ${tab === 'exportLogs' ? 'active' : ''}`} onClick={() => setTab('exportLogs')}>
          Export Logs
        </div>
        <div className={`tab ${tab === 'returns' ? 'active' : ''}`} onClick={() => setTab('returns')}>
          Returns
        </div>
        <div className={`tab ${tab === 'returnLogs' ? 'active' : ''}`} onClick={() => setTab('returnLogs')}>
          Return Import Logs
        </div>
      </div>

      {tab === 'handoffs' && (
        <div className="table-wrap">
          {hLoading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : handoffs.length === 0 ? (
            <div className="empty-state">
              <Truck size={40} />
              <div>No fulfillment handoffs</div>
              <div style={{ fontSize: 12 }}>
                Handoffs are created when Order Routing hands off a suborder to a vendor
              </div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Handoff ID</th><th>Vendor</th><th>Status</th><th>Created</th><th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {handoffs.map((h: any) => (
                  <tr key={h.id}>
                    <td className="mono" style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: 11 }}>
                      {h.id?.slice(0, 8)}…
                    </td>
                    <td className="mono" style={{ fontSize: 11 }}>
                      {h.vendor_company_reference?.slice(0, 8)}…
                    </td>
                    <td>
                      <span className={`badge ${HANDOFF_STATUS[h.status] ?? 'badge-muted'}`}>{h.status}</span>
                    </td>
                    <td>{h.created_at ? new Date(h.created_at).toLocaleDateString() : '—'}</td>
                    <td>{h.updated_at ? new Date(h.updated_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'sla' && (
        <div className="table-wrap">
          {sLoading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : slaEvals.length === 0 ? (
            <div className="empty-state">
              <Clock size={40} />
              <div>No SLA evaluations yet</div>
              <div style={{ fontSize: 12 }}>
                SLA evaluations are triggered by confirmed delivery evidence from Order Routing.
                Records are immutable after creation.
              </div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Evaluation ID</th><th>Outcome</th><th>Expected Response By</th>
                  <th>Import Received</th><th>Evaluated At</th>
                </tr>
              </thead>
              <tbody>
                {slaEvals.map((e: any) => (
                  <tr key={e.id}>
                    <td className="mono" style={{ color: 'var(--text-primary)', fontSize: 11 }}>
                      {e.id?.slice(0, 8)}…
                    </td>
                    <td>
                      <span className={`badge ${SLA_OUTCOME[e.outcome] ?? 'badge-muted'}`}>{e.outcome}</span>
                    </td>
                    <td>{e.expected_response_by ? new Date(e.expected_response_by).toLocaleString() : '—'}</td>
                    <td>
                      {e.fulfillment_import_received_timestamp
                        ? new Date(e.fulfillment_import_received_timestamp).toLocaleString()
                        : <span className="badge badge-muted">Not received</span>}
                    </td>
                    <td>
                      {e.evaluated_at
                        ? new Date(e.evaluated_at).toLocaleString()
                        : <span className="badge badge-amber">Pending</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'policies' && (
        <div className="table-wrap">
          {pLoading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : policies.length === 0 ? (
            <div className="empty-state">
              <ShieldAlert size={40} />
              <div>No SLA policies defined</div>
              <div style={{ fontSize: 12 }}>
                Configure per-vendor SLA response windows and partial fulfillment thresholds
              </div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Policy ID</th><th>Vendor</th><th>Status</th>
                  <th>Response Window</th><th>Partial Threshold</th><th>Effective From</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((p: any) => (
                  <tr key={p.id}>
                    <td className="mono" style={{ color: 'var(--text-primary)', fontSize: 11 }}>
                      {p.id?.slice(0, 8)}…
                    </td>
                    <td className="mono" style={{ fontSize: 11 }}>
                      {p.vendor_company_reference?.slice(0, 8)}…
                    </td>
                    <td>
                      <span className={`badge ${POLICY_STATUS[p.status] ?? 'badge-muted'}`}>{p.status}</span>
                    </td>
                    <td>{p.response_window_hours != null ? `${p.response_window_hours}h` : '—'}</td>
                    <td>{p.partial_threshold_percent != null ? `${p.partial_threshold_percent}%` : '—'}</td>
                    <td>{p.effective_from ? new Date(p.effective_from).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'exportLogs' && (
        <div className="table-wrap">
          {lLoading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : exportLogs.length === 0 ? (
            <div className="empty-state">
              <Truck size={40} />
              <div>No export logs yet</div>
              <div style={{ fontSize: 12 }}>
                Logs will appear when daily vendor CSV files are exported.
              </div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Batch ID / Audit Ref</th>
                  <th>Vendor</th>
                  <th>Buyer</th>
                  <th>Filename</th>
                  <th>Sent At</th>
                  <th>Order Count</th>
                  <th>Suborder Count</th>
                  <th>Trigger</th>
                  <th>Re-export Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {exportLogs.map((log: any) => (
                  <tr key={log.id}>
                    <td className="mono" style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: 11 }} title={log.audit_reference}>
                      {log.audit_reference?.slice(0, 8)}…
                    </td>
                    <td className="mono" style={{ fontSize: 11 }} title={log.vendor_company_reference}>
                      {log.vendor_company_reference?.slice(0, 8)}…
                    </td>
                    <td className="mono" style={{ fontSize: 11 }} title={log.buyer_company_reference}>
                      {log.buyer_company_reference?.slice(0, 8)}…
                    </td>
                    <td style={{ fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.filename}>
                      {log.filename}
                    </td>
                    <td>{log.sent_at ? new Date(log.sent_at).toLocaleString() : '—'}</td>
                    <td>{log.order_count}</td>
                    <td>{log.suborder_count}</td>
                    <td>
                      <span className={`badge ${log.trigger_type === 'user' ? 'badge-blue' : 'badge-muted'}`}>{log.trigger_type}</span>
                    </td>
                    <td>
                      {log.is_reexport ? (
                        <span className="badge badge-purple" title={`Original log: ${log.original_log}`}>Re-export</span>
                      ) : (
                        <span className="badge badge-muted">Original</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={reexportingId === log.id}
                          onClick={() => handleReexport(log.id)}
                        >
                          {reexportingId === log.id ? 'Sending...' : 'Re-export'}
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleDownloadCSV(log)}
                        >
                          Download CSV
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'returns' && (
        <div className="table-wrap">
          {rLoading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : returnRequests.length === 0 ? (
            <div className="empty-state">
              <FileText size={40} />
              <div>No return requests found</div>
              <div style={{ fontSize: 12 }}>
                Return requests appear when buyers initiate vendor returns.
              </div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>RAN</th>
                  <th>Suborder ID</th>
                  <th>SKU</th>
                  <th>UPC</th>
                  <th>Qty</th>
                  <th>Wholesale Price</th>
                  <th>Status</th>
                  <th>Received Date</th>
                  <th>Refunded Amount</th>
                  <th>Rejection Reason</th>
                </tr>
              </thead>
              <tbody>
                {returnRequests.map((req: any) => (
                  <tr key={req.id}>
                    <td className="mono" style={{ color: 'var(--accent)', fontWeight: 500, fontSize: 11 }}>
                      {req.ran}
                    </td>
                    <td className="mono" style={{ fontSize: 11 }}>
                      {req.suborder_reference?.slice(0, 8)}…
                    </td>
                    <td className="mono" style={{ fontSize: 11 }}>
                      {req.sku}
                    </td>
                    <td className="mono" style={{ fontSize: 11 }}>
                      {req.upc}
                    </td>
                    <td>{req.return_quantity}</td>
                    <td>{req.vendor_wholesale_price != null ? `$${parseFloat(req.vendor_wholesale_price).toFixed(2)}` : '—'}</td>
                    <td>
                      <span className={`badge ${RETURN_STATUS_COLORS[req.status] ?? 'badge-muted'}`}>
                        {req.status?.replace('return_', '')?.replace('_', ' ')}
                      </span>
                    </td>
                    <td>{req.return_received_date ? new Date(req.return_received_date).toLocaleDateString() : '—'}</td>
                    <td>{req.return_refunded_amount != null ? `$${parseFloat(req.return_refunded_amount).toFixed(2)}` : '—'}</td>
                    <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={req.rejected_reason}>
                      {req.rejected_reason || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'returnLogs' && (
        <div className="table-wrap">
          {rlLoading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : returnImportLogs.length === 0 ? (
            <div className="empty-state">
              <Truck size={40} />
              <div>No return import logs yet</div>
              <div style={{ fontSize: 12 }}>
                Logs will appear when return CSV files are imported.
              </div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Audit Ref</th>
                  <th>Uploaded At</th>
                  <th>Filename</th>
                  <th>Applied</th>
                  <th>Skipped</th>
                  <th>Review Req</th>
                  <th>Rejected</th>
                </tr>
              </thead>
              <tbody>
                {returnImportLogs.map((log: any) => (
                  <tr key={log.id}>
                    <td className="mono" style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: 11 }} title={log.audit_reference}>
                      {log.audit_reference?.slice(0, 8)}…
                    </td>
                    <td>{log.uploaded_at ? new Date(log.uploaded_at).toLocaleString() : '—'}</td>
                    <td style={{ fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.csv_filename}>
                      {log.csv_filename || '—'}
                    </td>
                    <td><span className="badge badge-green">{log.rows_applied}</span></td>
                    <td><span className="badge badge-muted">{log.rows_skipped}</span></td>
                    <td><span className="badge badge-amber">{log.rows_review_required}</span></td>
                    <td><span className="badge badge-red">{log.rows_rejected}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Import Return Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal-container" style={{ width: 680, maxWidth: '95%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Import Vendor Return CSV</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowImportModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {!previewData ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{
                    border: '2px dashed var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: '32px 16px',
                    textAlign: 'center',
                    background: 'var(--bg-elevated)',
                    cursor: 'pointer'
                  }} onClick={() => document.getElementById('return-csv-input')?.click()}>
                    <UploadCloud size={32} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
                      {importFile ? importFile.name : 'Select Return CSV File'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {importFile ? `${(importFile.size / 1024).toFixed(1)} KB` : 'Click to browse files'}
                    </div>
                    <input
                      id="return-csv-input"
                      type="file"
                      accept=".csv"
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />
                  </div>

                  {importError && (
                    <div style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      color: '#f87171',
                      padding: 12,
                      borderRadius: 'var(--radius)',
                      fontSize: 12,
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'monospace'
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>Validation Errors:</div>
                      {importError}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Summary Bar */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 12,
                    background: 'var(--bg-elevated)',
                    padding: 12,
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Applied</div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--green)' }}>{previewData.summary?.applied || 0}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Skipped</div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-secondary)' }}>{previewData.summary?.skipped || 0}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Review Req.</div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--amber)' }}>{previewData.summary?.review_required || 0}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rejected</div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--red)' }}>{previewData.summary?.rejected || 0}</div>
                    </div>
                  </div>

                  {/* Preview Rows Table */}
                  <div className="table-wrap" style={{ maxHeight: 250, overflowY: 'auto' }}>
                    <table style={{ fontSize: 12 }}>
                      <thead>
                        <tr>
                          <th style={{ width: 60 }}>Row</th>
                          <th>RAN</th>
                          <th>Status</th>
                          <th>Validation / Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(previewData.rows || []).map((r: any) => {
                          const statusClass = r.status === 'applied' ? 'badge-green' : r.status === 'review_required' ? 'badge-amber' : 'badge-red';
                          return (
                            <tr key={r.row_index}>
                              <td>{r.row_index}</td>
                              <td className="mono" style={{ fontSize: 11 }}>{r.ran || '—'}</td>
                              <td><span className={`badge ${statusClass}`}>{r.status}</span></td>
                              <td style={{ color: r.errors?.length ? 'var(--red)' : 'var(--text-muted)', fontSize: 11 }}>
                                {r.errors?.join(', ') || 'Validation Passed'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {importError && (
                    <div style={{ color: 'var(--red)', fontSize: 12 }}>{importError}</div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              {!previewData ? (
                <>
                  <button className="btn btn-secondary" onClick={() => setShowImportModal(false)}>Cancel</button>
                  <button className="btn btn-primary" disabled={!importFile || importing} onClick={handlePreview}>
                    {importing ? 'Processing...' : 'Upload & Preview'}
                  </button>
                </>
              ) : (
                <>
                  <button className="btn btn-secondary" onClick={() => setPreviewData(null)}>Back</button>
                  <button className="btn btn-primary" disabled={importing} onClick={handleConfirmApply}>
                    {importing ? 'Applying...' : 'Confirm & Apply'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
