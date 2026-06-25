import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Truck, Clock, ShieldAlert } from 'lucide-react'
import api from '../lib/apiClient'

const HANDOFF_STATUS: Record<string, string> = {
  received: 'badge-blue', processing: 'badge-amber', shipped: 'badge-purple',
  delivered: 'badge-green', exception: 'badge-red', closed: 'badge-muted',
}

const SLA_OUTCOME: Record<string, string> = {
  on_time: 'badge-green', late: 'badge-red', missing: 'badge-red',
  partial: 'badge-amber', pending: 'badge-amber', overridden: 'badge-muted',
}

const POLICY_STATUS: Record<string, string> = {
  draft: 'badge-muted', active: 'badge-green', superseded: 'badge-amber', retired: 'badge-red',
}

export default function FulfillmentPage() {
  const [tab, setTab] = useState<'handoffs' | 'sla' | 'policies'>('handoffs')

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

  const handoffs = handoffData?.results ?? (Array.isArray(handoffData) ? handoffData : [])
  const slaEvals = slaData?.results ?? (Array.isArray(slaData) ? slaData : [])
  const policies = policyData?.results ?? (Array.isArray(policyData) ? policyData : [])

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Fulfillment & Returns</div>
          <div className="page-sub">Vendor handoffs, SLA evaluation records, and response policies</div>
        </div>
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
    </div>
  )
}
