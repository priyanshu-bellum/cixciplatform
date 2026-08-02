import { useState, useEffect, Fragment } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
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
  const location = useLocation()
  const queryTab = new URLSearchParams(location.search).get('tab')
  const initialTab = (queryTab as any) || location.state?.tab || 'handoffs'
  const [tab, setTab] = useState<'handoffs' | 'sla' | 'policies' | 'exportLogs' | 'returns' | 'returnLogs' | 'shippingLogs'>(
    ['handoffs', 'sla', 'policies', 'exportLogs', 'returns', 'returnLogs', 'shippingLogs'].includes(initialTab) ? (initialTab as any) : 'handoffs'
  )

  useEffect(() => {
    const activeTab = new URLSearchParams(location.search).get('tab') || location.state?.tab
    if (activeTab && ['handoffs', 'sla', 'policies', 'exportLogs', 'returns', 'returnLogs', 'shippingLogs'].includes(activeTab)) {
      setTab(activeTab as any)
    }
  }, [location])

  const { data: handoffData, isLoading: hLoading, refetch: refetchHandoffs } = useQuery({
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

  const { data: shippingLogData, isLoading: slLoading, refetch: refetchShippingLogs } = useQuery({
    queryKey: ['shipping-import-logs'],
    queryFn: () => api.get('/fulfillment/shipping-import-logs/').then(r => r.data).catch(() => ({ results: [] })),
    enabled: tab === 'shippingLogs',
  })

  const handoffs = handoffData?.results ?? (Array.isArray(handoffData) ? handoffData : [])
  const slaEvals = slaData?.results ?? (Array.isArray(slaData) ? slaData : [])
  const policies = policyData?.results ?? (Array.isArray(policyData) ? policyData : [])
  const exportLogs = logData?.results ?? (Array.isArray(logData) ? logData : [])
  const returnRequests = returnsData?.results ?? (Array.isArray(returnsData) ? returnsData : [])
  const returnImportLogs = returnLogData?.results ?? (Array.isArray(returnLogData) ? returnLogData : [])
  const shippingImportLogs = shippingLogData?.results ?? (Array.isArray(shippingLogData) ? shippingLogData : [])

  const [reexportingId, setReexportingId] = useState<string | null>(null)
  const [selectedLogForReexport, setSelectedLogForReexport] = useState<any | null>(null)
  const [selectedLogForAuditHistory, setSelectedLogForAuditHistory] = useState<any | null>(null)
  const [reexportReason, setReexportReason] = useState<string>('')
  const [reexportExplanation, setReexportExplanation] = useState<string>('')
  const [expandedLogIds, setExpandedLogIds] = useState<string[]>([])

  const toggleExpandLog = (id: string) => {
    setExpandedLogIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }
  
  // Return Import Modal States
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)
  const [importError, setImportError] = useState<string | null>(null)

  // Shipping Import Modal States
  const [showShippingModal, setShowShippingModal] = useState(false)
  const [shippingFile, setShippingFile] = useState<File | null>(null)
  const [shippingImporting, setShippingImporting] = useState(false)
  const [shippingPreviewData, setShippingPreviewData] = useState<any>(null)
  const [shippingImportError, setShippingImportError] = useState<string | null>(null)

  const handleReexport = async (id: string, reason: string, explanation?: string) => {
    if (reexportingId) return
    setReexportingId(id)
    try {
      await api.post(`/routing/export-logs/${id}/reexport/`, { reason, explanation })
      alert('Re-export triggered successfully!')
      setSelectedLogForReexport(null)
      refetchLogs()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to trigger re-export.')
    } finally {
      setReexportingId(null)
    }
  }

  const handleDownloadCSV = async (log: any) => {
    try {
      await api.post(`/routing/export-logs/${log.id}/audit_download/`)
      refetchLogs()
    } catch (err) {
      console.error("Failed to audit download:", err)
    }

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

  const handleShippingFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setShippingFile(e.target.files[0])
      setShippingPreviewData(null)
      setShippingImportError(null)
    }
  }

  const handleShippingPreview = async () => {
    if (!shippingFile) return
    setShippingImporting(true)
    setShippingImportError(null)
    const fd = new FormData()
    fd.append('file', shippingFile)
    fd.append('confirm', 'false')
    try {
      const resp = await api.post('/fulfillment/handoffs/import-shipping/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setShippingPreviewData(resp.data)
    } catch (err: any) {
      const errors = err.response?.data?.errors
      if (Array.isArray(errors) && errors.length > 0) {
        setShippingImportError(errors.map((e: any) => `${e.row}: ${e.errors?.join(', ')}`).join('\n'))
      } else {
        setShippingImportError(err.response?.data?.detail || 'Failed to process shipping import preview.')
      }
    } finally {
      setShippingImporting(false)
    }
  }

  const handleShippingConfirmApply = async () => {
    if (!shippingFile) return
    setShippingImporting(true)
    setShippingImportError(null)
    const fd = new FormData()
    fd.append('file', shippingFile)
    fd.append('confirm', 'true')
    try {
      const resp = await api.post('/fulfillment/handoffs/import-shipping/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      alert(`Shipping import applied successfully! Success: ${resp.data.success_count}, Skipped: ${resp.data.skipped_count}, Rejected: ${resp.data.rejected_count}`)
      setShowShippingModal(false)
      setShippingFile(null)
      setShippingPreviewData(null)
      refetchHandoffs()
      refetchShippingLogs()
    } catch (err: any) {
      setShippingImportError(err.response?.data?.detail || 'Failed to apply shipping import.')
    } finally {
      setShippingImporting(false)
    }
  }


  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Fulfillment & Returns</div>
          <div className="page-sub">Vendor handoffs, SLA evaluation records, and response policies</div>
        </div>
        {(tab === 'returns' || tab === 'returnLogs') && (
          <button className="btn btn-primary" onClick={() => {
            setImportFile(null);
            setPreviewData(null);
            setImportError(null);
            setShowImportModal(true);
          }}>
            <UploadCloud size={14} style={{ marginRight: 6 }} /> Import Returns (CSV)
          </button>
        )}
        {(tab === 'handoffs' || tab === 'shippingLogs') && (
          <button className="btn btn-primary" onClick={() => {
            setShippingFile(null);
            setShippingPreviewData(null);
            setShippingImportError(null);
            setShowShippingModal(true);
          }}>
            <UploadCloud size={14} style={{ marginRight: 6 }} /> Import Shipping Update (CSV)
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
        <div className={`tab ${tab === 'shippingLogs' ? 'active' : ''}`} onClick={() => setTab('shippingLogs')}>
          Shipping Import Logs
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
                  <th>Triggered By</th>
                  <th>Delivery Status</th>
                  <th>Re-export Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {exportLogs.map((log: any) => (
                  <Fragment key={log.id}>
                    <tr>
                      <td className="mono" style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: 11 }} title={log.audit_reference}>
                        {log.audit_reference?.slice(0, 8)}…
                      </td>
                      <td title={log.vendor_name || log.vendor_company_reference}>
                        {log.vendor_name || log.vendor_company_reference}
                      </td>
                      <td title={log.buyer_name || log.buyer_company_reference}>
                        {log.buyer_name || log.buyer_company_reference}
                      </td>
                      <td style={{ fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.filename}>
                        {log.filename}
                      </td>
                      <td>{log.sent_at ? new Date(log.sent_at).toLocaleString() : '—'}</td>
                      <td>{log.order_count}</td>
                      <td>{log.suborder_count}</td>
                      <td>
                        <span className={`badge ${log.trigger_type?.toUpperCase() === 'USER' ? 'badge-blue' : 'badge-muted'}`}>{log.trigger_type}</span>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {log.trigger_type?.toUpperCase() === 'USER' ? (
                          <span style={{ fontWeight: 500 }}>{log.triggered_by_user_name_snapshot || 'User'}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>{log.system_process_name || 'System Process'}</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${
                          log.email_send_result === 'success' ? 'badge-green' :
                          log.email_send_result === 'no_recipients_configured' ? 'badge-blue' :
                          log.email_send_result === 'failed' ? 'badge-red' : 'badge-muted'
                        }`} title={log.email_send_result}>
                          {log.email_send_result === 'success' ? 'Sent' :
                           log.email_send_result === 'no_recipients_configured' ? 'Download Only' :
                           log.email_send_result || 'Pending'}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => toggleExpandLog(log.id)}
                          className={`badge ${log.reexport_count > 0 ? 'badge-purple' : 'badge-muted'}`}
                          style={{ border: 'none', cursor: 'pointer', padding: '4px 8px', fontSize: '11px', fontWeight: 500 }}
                        >
                          {log.reexport_count > 0 ? `Original · Re-exported ×${log.reexport_count}` : 'Original'}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              setSelectedLogForReexport(log);
                              setReexportReason('');
                              setReexportExplanation('');
                            }}
                          >
                            Re-export
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleDownloadCSV(log)}
                          >
                            Download CSV
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setSelectedLogForAuditHistory(log)}
                          >
                            Audit Trail
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedLogIds.includes(log.id) && (
                      <tr key={`history-${log.id}`}>
                        <td colSpan={12} style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                          <div style={{ padding: '16px', borderLeft: '3px solid var(--accent-color, #7047eb)', background: 'rgba(30, 30, 45, 0.6)', borderRadius: '4px' }}>
                            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                              <span>Export and Re-export Delivery History</span>
                              <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>({log.filename})</span>
                            </div>
                            <table className="inner-table" style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>
                                  <th style={{ textAlign: 'left', padding: '6px', fontWeight: 600 }}>Attempt Type</th>
                                  <th style={{ textAlign: 'left', padding: '6px', fontWeight: 600 }}>Date and Time</th>
                                  <th style={{ textAlign: 'left', padding: '6px', fontWeight: 600 }}>Trigger</th>
                                  <th style={{ textAlign: 'left', padding: '6px', fontWeight: 600 }}>Triggered By</th>
                                  <th style={{ textAlign: 'left', padding: '6px', fontWeight: 600 }}>Reason</th>
                                  <th style={{ textAlign: 'left', padding: '6px', fontWeight: 600 }}>Recipient</th>
                                  <th style={{ textAlign: 'left', padding: '6px', fontWeight: 600 }}>Checksum</th>
                                  <th style={{ textAlign: 'left', padding: '6px', fontWeight: 600 }}>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-primary)' }}>
                                  <td style={{ padding: '8px 6px', fontWeight: 500 }}>Original</td>
                                  <td style={{ padding: '8px 6px' }}>{new Date(log.sent_at).toLocaleString()}</td>
                                  <td style={{ padding: '8px 6px' }}>
                                    <span className={`badge ${log.trigger_type === 'user' ? 'badge-blue' : 'badge-muted'}`}>{log.trigger_type}</span>
                                  </td>
                                  <td style={{ padding: '8px 6px' }}>
                                    {log.trigger_type === 'user' ? (
                                      <>
                                        <div style={{ fontWeight: 600 }}>{log.triggered_by_name || log.triggered_by_user_name_snapshot || 'User'}</div>
                                        {log.triggered_by && (
                                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>User ID: {log.triggered_by}</div>
                                        )}
                                        {log.triggered_by_company_name_snapshot && (
                                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Company: {log.triggered_by_company_name_snapshot}</div>
                                        )}
                                        {log.triggered_by_role_snapshot && (
                                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Role: {log.triggered_by_role_snapshot}</div>
                                        )}
                                      </>
                                    ) : (
                                      <>
                                        <div style={{ fontWeight: 600 }}>{log.system_process_name || 'Scheduled Vendor Order Export'}</div>
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Process ID: {log.system_process_id || 'scheduled_order_export'}</div>
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Job ID: {log.system_job_id || `job_${log.id.slice(0, 8)}`}</div>
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Schedule: {log.system_schedule_desc || 'Daily vendor export'}</div>
                                      </>
                                    )}
                                  </td>
                                  <td style={{ padding: '8px 6px' }}>Initial export</td>
                                  <td style={{ padding: '8px 6px', fontSize: 11 }}>{log.recipients?.join(', ') || '—'}</td>
                                  <td style={{ padding: '8px 6px', fontFamily: 'monospace', fontSize: 11 }}>—</td>
                                  <td style={{ padding: '8px 6px' }}>
                                    <span className={`badge ${
                                      log.email_send_result === 'success' ? 'badge-green' :
                                      log.email_send_result === 'no_recipients_configured' ? 'badge-blue' :
                                      log.email_send_result === 'failed' ? 'badge-red' : 'badge-muted'
                                    }`}>
                                      {log.email_send_result === 'success' ? 'Sent' :
                                       log.email_send_result === 'no_recipients_configured' ? 'Download Only' :
                                       log.email_send_result || 'Pending'}
                                    </span>
                                  </td>
                                </tr>
                                {(log.reexport_attempts || []).map((attempt: any) => (
                                  <tr key={attempt.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-primary)' }}>
                                    <td style={{ padding: '8px 6px', fontWeight: 500, color: '#a78bfa' }}>Re-export</td>
                                    <td style={{ padding: '8px 6px' }}>{new Date(attempt.requested_at).toLocaleString()}</td>
                                    <td style={{ padding: '8px 6px' }}>
                                      <span className="badge badge-blue">{attempt.trigger_type}</span>
                                    </td>
                                    <td style={{ padding: '8px 6px' }}>
                                      {attempt.trigger_type === 'USER' || attempt.trigger_type === 'user' ? (
                                        <>
                                          <div style={{ fontWeight: 600 }}>{attempt.triggered_by_user_name_snapshot || 'User'}</div>
                                          {attempt.triggered_by_user && (
                                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>User ID: {attempt.triggered_by_user}</div>
                                          )}
                                          {attempt.triggered_by_company_name_snapshot && (
                                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Company: {attempt.triggered_by_company_name_snapshot}</div>
                                          )}
                                          {attempt.triggered_by_role_snapshot && (
                                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Role: {attempt.triggered_by_role_snapshot}</div>
                                          )}
                                        </>
                                      ) : (
                                        <>
                                          <div style={{ fontWeight: 600 }}>{attempt.system_process_name || 'Automatic delivery retry'}</div>
                                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Process: {attempt.system_process_id || 'automated_retry'}</div>
                                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Job: {attempt.system_job_id || `job_${attempt.id.slice(0, 8)}`}</div>
                                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Schedule: {attempt.system_schedule_desc || 'Automatic delivery retry'}</div>
                                        </>
                                      )}
                                    </td>
                                    <td style={{ padding: '8px 6px' }}>
                                      <div>{attempt.reason_code}</div>
                                      {attempt.reason_notes && (
                                        <div style={{ fontSize: 10, fontStyle: 'italic', color: 'var(--text-muted)' }}>"{attempt.reason_notes}"</div>
                                      )}
                                    </td>
                                    <td style={{ padding: '8px 6px', fontSize: 11 }}>{attempt.delivery_destination_snapshot}</td>
                                    <td style={{ padding: '8px 6px', fontFamily: 'monospace', fontSize: 11 }} title={attempt.file_checksum}>
                                      {attempt.file_checksum ? `${attempt.file_checksum.slice(0, 8)}…` : '—'}
                                    </td>
                                    <td style={{ padding: '8px 6px' }}>
                                      <span className={`badge ${
                                        attempt.delivery_status === 'SENT' ? 'badge-green' :
                                        attempt.delivery_status === 'PROCESSING' ? 'badge-blue' :
                                        attempt.delivery_status === 'DELIVERY_FAILED' ? 'badge-red' : 'badge-muted'
                                      }`}>
                                        {attempt.delivery_status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
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

      {tab === 'shippingLogs' && (
        <div className="table-wrap">
          {slLoading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : shippingImportLogs.length === 0 ? (
            <div className="empty-state">
              <Truck size={40} />
              <div>No shipping import logs yet</div>
              <div style={{ fontSize: 12 }}>
                Logs will appear when shipping CSV files are imported.
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
                  <th>Rejected</th>
                </tr>
              </thead>
              <tbody>
                {shippingImportLogs.map((log: any) => (
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
                    <td><span className="badge badge-red">{log.rows_rejected}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Import Shipping Modal */}
      {showShippingModal && (
        <div className="modal-overlay" onClick={() => setShowShippingModal(false)}>
          <div className="modal-container" style={{ width: 680, maxWidth: '95%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Import Shipping Update CSV</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowShippingModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {!shippingPreviewData ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{
                    border: '2px dashed var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: '32px 16px',
                    textAlign: 'center',
                    background: 'var(--bg-elevated)',
                    cursor: 'pointer'
                  }} onClick={() => document.getElementById('shipping-csv-input')?.click()}>
                    <UploadCloud size={32} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
                      {shippingFile ? shippingFile.name : 'Select Shipping CSV File'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {shippingFile ? `${(shippingFile.size / 1024).toFixed(1)} KB` : 'Click to browse files'}
                    </div>
                    <input
                      id="shipping-csv-input"
                      type="file"
                      accept=".csv"
                      style={{ display: 'none' }}
                      onChange={handleShippingFileChange}
                    />
                  </div>

                  {shippingImportError && (
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
                      {shippingImportError}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Summary Bar */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 12,
                    background: 'var(--bg-elevated)',
                    padding: 12,
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Applied</div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--green)' }}>{shippingPreviewData.summary?.applied || 0}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Skipped</div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-secondary)' }}>{shippingPreviewData.summary?.skipped || 0}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rejected</div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--red)' }}>{shippingPreviewData.summary?.rejected || 0}</div>
                    </div>
                  </div>

                  {/* Preview Rows Table */}
                  <div className="table-wrap" style={{ maxHeight: 250, overflowY: 'auto' }}>
                    <table style={{ fontSize: 12 }}>
                      <thead>
                        <tr>
                          <th style={{ width: 60 }}>Row</th>
                          <th>Suborder</th>
                          <th>Status</th>
                          <th>Validation / Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(shippingPreviewData.rows || []).map((r: any) => {
                          const statusClass = r.status === 'applied' ? 'badge-green' : r.status === 'skipped' ? 'badge-muted' : 'badge-red';
                          return (
                            <tr key={r.row_index}>
                              <td>{r.row_index}</td>
                              <td className="mono" style={{ fontSize: 11 }}>{r.suborder || '—'}</td>
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

                  {shippingImportError && (
                    <div style={{ color: 'var(--red)', fontSize: 12 }}>{shippingImportError}</div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              {!shippingPreviewData ? (
                <>
                  <button className="btn btn-secondary" onClick={() => setShowShippingModal(false)}>Cancel</button>
                  <button className="btn btn-primary" disabled={!shippingFile || shippingImporting} onClick={handleShippingPreview}>
                    {shippingImporting ? 'Processing...' : 'Upload & Preview'}
                  </button>
                </>
              ) : (
                <>
                  <button className="btn btn-secondary" onClick={() => setShippingPreviewData(null)}>Back</button>
                  <button className="btn btn-primary" disabled={shippingImporting} onClick={handleShippingConfirmApply}>
                    {shippingImporting ? 'Applying...' : 'Confirm & Apply'}
                  </button>
                </>
              )}
            </div>
          </div>
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

      {/* Re-export Confirmation Modal */}
      {selectedLogForReexport && (
        <div className="modal-overlay" onClick={() => setSelectedLogForReexport(null)}>
          <div className="modal-container" style={{ width: 560, maxWidth: '95%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Confirm Manual Re-export</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedLogForReexport(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '16px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px 16px',
                fontSize: '13px'
              }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Vendor</span>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{selectedLogForReexport.vendor_name || selectedLogForReexport.vendor_company_reference}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Buyer</span>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{selectedLogForReexport.buyer_name || selectedLogForReexport.buyer_company_reference}</span>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Original Filename</span>
                  <span className="mono" style={{ fontWeight: 500, color: 'var(--text-primary)', wordBreak: 'break-all' }}>{selectedLogForReexport.filename}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Original Export Date</span>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{new Date(selectedLogForReexport.sent_at).toLocaleString()}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Counts</span>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{selectedLogForReexport.order_count} Orders / {selectedLogForReexport.suborder_count} Suborders</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Original Delivery Status</span>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{selectedLogForReexport.email_send_result || 'Pending'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Previous Re-exports</span>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{selectedLogForReexport.reexport_count} times</span>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Delivery Destination</span>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{selectedLogForReexport.recipients?.join(', ') || 'N/A'}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Re-export Reason <span style={{ color: 'var(--red)' }}>*</span>
                </label>
                <select
                  className="form-control"
                  style={{ width: '100%', background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px' }}
                  value={reexportReason}
                  onChange={e => {
                    setReexportReason(e.target.value);
                    if (e.target.value !== 'Other') {
                      setReexportExplanation('');
                    }
                  }}
                >
                  <option value="">-- Select a Reason --</option>
                  <option value="Vendor did not receive file">Vendor did not receive file</option>
                  <option value="Vendor requested another copy">Vendor requested another copy</option>
                  <option value="Delivery failure retry">Delivery failure retry</option>
                  <option value="Internal support request">Internal support request</option>
                  <option value="Other">Other (Requires explanation)</option>
                </select>
              </div>

              {reexportReason === 'Other' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Explanation <span style={{ color: 'var(--red)' }}>*</span>
                  </label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Provide a detailed reason for this manual re-export..."
                    style={{ width: '100%', background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px', fontSize: '13px' }}
                    value={reexportExplanation}
                    onChange={e => setReexportExplanation(e.target.value)}
                  />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setSelectedLogForReexport(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={!reexportReason || (reexportReason === 'Other' && !reexportExplanation.trim()) || reexportingId === selectedLogForReexport.id}
                onClick={() => handleReexport(selectedLogForReexport.id, reexportReason, reexportExplanation)}
              >
                {reexportingId === selectedLogForReexport.id ? 'Sending...' : 'Confirm Re-export'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Audit History Modal */}
      {selectedLogForAuditHistory && (
        <div className="modal-overlay" onClick={() => setSelectedLogForAuditHistory(null)}>
          <div className="modal-container" style={{ width: 850, maxWidth: '95%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} style={{ color: 'var(--accent)' }} />
                <span>Fulfillment Audit Trail & History</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedLogForAuditHistory(null)}>
                <X size={16} />
              </button>
            </div>
            
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Batch Metadata Header Card */}
              <div style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '16px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                fontSize: '13px'
              }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Batch ID / Audit Reference</span>
                  <span className="mono" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{selectedLogForAuditHistory.audit_reference}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Filename</span>
                  <span className="mono" style={{ fontWeight: 500, color: 'var(--text-primary)', wordBreak: 'break-all' }}>{selectedLogForAuditHistory.filename}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Vendor / Buyer</span>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{selectedLogForAuditHistory.vendor_name || 'Vendor'} &rarr; {selectedLogForAuditHistory.buyer_name || 'Buyer'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Total Records</span>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{selectedLogForAuditHistory.order_count} Orders / {selectedLogForAuditHistory.suborder_count} Suborders</span>
                </div>
              </div>

              {/* Timeline Container */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', paddingLeft: '24px', borderLeft: '2px solid var(--border)' }}>
                
                {/* Node 1: Original Export */}
                <div style={{ position: 'relative', marginBottom: '8px' }}>
                  {/* Timeline Dot */}
                  <div style={{
                    position: 'absolute',
                    left: '-31px',
                    top: '2px',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: selectedLogForAuditHistory.email_send_result === 'success' ? 'var(--green)' : 'var(--amber)',
                    border: '3px solid var(--bg-surface)'
                  }} />
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>Original Export (Initial Dispatch)</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(selectedLogForAuditHistory.sent_at).toLocaleString()}</span>
                  </div>
                  
                  <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px', fontSize: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '10px' }}>TRIGGER TYPE</span>
                      <span className="badge badge-muted" style={{ marginTop: '2px' }}>{selectedLogForAuditHistory.trigger_type}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '10px' }}>INITIATED BY</span>
                      {selectedLogForAuditHistory.trigger_type?.toUpperCase() === 'USER' ? (
                        <div>
                          <div style={{ fontWeight: 600 }}>{selectedLogForAuditHistory.triggered_by_user_name_snapshot || 'User'}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Role: {selectedLogForAuditHistory.triggered_by_role_snapshot || 'N/A'}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Company: {selectedLogForAuditHistory.triggered_by_company_name_snapshot || 'N/A'}</div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontWeight: 600 }}>{selectedLogForAuditHistory.system_process_name || 'System Auto-digest'}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Process ID: {selectedLogForAuditHistory.system_process_id}</div>
                          {selectedLogForAuditHistory.system_schedule_desc && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Schedule: {selectedLogForAuditHistory.system_schedule_desc}</div>}
                        </div>
                      )}
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '10px' }}>DESTINATION & METHOD</span>
                      <div style={{ wordBreak: 'break-all' }}>{selectedLogForAuditHistory.recipients?.join(', ') || 'Browser Download'}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Method: {selectedLogForAuditHistory.sending_method}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '10px' }}>DELIVERY OUTCOME</span>
                      <span className={`badge ${
                        selectedLogForAuditHistory.email_send_result === 'success' ? 'badge-green' :
                        selectedLogForAuditHistory.email_send_result === 'no_recipients_configured' ? 'badge-blue' :
                        selectedLogForAuditHistory.email_send_result === 'failed' ? 'badge-red' : 'badge-muted'
                      }`} style={{ marginTop: '2px' }}>
                        {selectedLogForAuditHistory.email_send_result || 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Audit chain / Re-export & Download history */}
                {selectedLogForAuditHistory.reexport_attempts && selectedLogForAuditHistory.reexport_attempts.length > 0 ? (
                  [...selectedLogForAuditHistory.reexport_attempts]
                    .sort((a, b) => new Date(a.requested_at).getTime() - new Date(b.requested_at).getTime())
                    .map((attempt: any) => {
                      const isDownload = attempt.action_type === 'DOWNLOAD';
                      return (
                        <div key={attempt.id} style={{ position: 'relative', marginBottom: '8px' }}>
                          {/* Timeline Dot */}
                          <div style={{
                            position: 'absolute',
                            left: '-31px',
                            top: '2px',
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: isDownload ? 'var(--purple)' : (attempt.delivery_status === 'SENT' || attempt.delivery_status === 'succeeded' ? 'var(--green)' : 'var(--red)'),
                            border: '3px solid var(--bg-surface)'
                          }} />
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 600, fontSize: '14px', color: isDownload ? 'var(--purple)' : 'var(--accent)' }}>
                              {isDownload ? `Manual CSV Download (Attempt #${attempt.attempt_number})` : `Re-export Attempt #${attempt.attempt_number}`}
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(attempt.requested_at || attempt.sent_at).toLocaleString()}</span>
                          </div>

                          <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px', fontSize: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                            <div>
                              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '10px' }}>ACTION TYPE</span>
                              <span className={`badge ${isDownload ? 'badge-purple' : 'badge-blue'}`} style={{ marginTop: '2px' }}>{attempt.action_type || 'REEXPORT'}</span>
                              {attempt.parent_attempt && (
                                <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                  Linked to Parent Attempt #{attempt.parent_attempt?.attempt_number || '1'}
                                </div>
                              )}
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '10px' }}>INITIATED BY</span>
                              {attempt.trigger_type?.toUpperCase() === 'USER' ? (
                                <div>
                                  <div style={{ fontWeight: 600 }}>{attempt.triggered_by_user_name_snapshot || 'User'}</div>
                                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Role: {attempt.triggered_by_role_snapshot || 'N/A'}</div>
                                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Company: {attempt.triggered_by_company_name_snapshot || 'N/A'}</div>
                                </div>
                              ) : (
                                <div>
                                  <div style={{ fontWeight: 600 }}>{attempt.system_process_name || 'System Automated Retry'}</div>
                                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Process ID: {attempt.system_process_id}</div>
                                </div>
                              )}
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '10px' }}>DESTINATION & DETAILS</span>
                              <div style={{ wordBreak: 'break-all' }}>{attempt.delivery_destination_snapshot || 'Browser Download'}</div>
                              {attempt.reason_code && (
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', fontStyle: 'italic' }}>
                                  Reason: "{attempt.reason_code}"
                                </div>
                              )}
                              {attempt.reason_notes && (
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                  Note: "{attempt.reason_notes}"
                                </div>
                              )}
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '10px' }}>STATUS</span>
                              <span className={`badge ${
                                attempt.delivery_status === 'SENT' || attempt.delivery_status === 'succeeded' ? 'badge-green' :
                                attempt.delivery_status === 'PROCESSING' || attempt.delivery_status === 'QUEUED' ? 'badge-blue' :
                                attempt.delivery_status === 'failed' || attempt.delivery_status === 'DELIVERY_FAILED' ? 'badge-red' : 'badge-muted'
                              }`} style={{ marginTop: '2px' }}>
                                {attempt.delivery_status}
                              </span>
                              {attempt.file_checksum && (
                                <div className="mono" style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px', textOverflow: 'ellipsis', overflow: 'hidden' }} title={attempt.file_checksum}>
                                  SHA-256: {attempt.file_checksum.slice(0, 12)}...
                                </div>
                              )}
                              {attempt.ip_address && (
                                <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                                  IP: {attempt.ip_address}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic', padding: '4px 0' }}>
                    No re-exports or downloads have been recorded for this batch.
                  </div>
                )}
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setSelectedLogForAuditHistory(null)}>
                Close Audit Trail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
