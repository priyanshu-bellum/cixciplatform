import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plug, Webhook, ArrowDownToLine } from 'lucide-react'
import api from '../lib/apiClient'

const CONN_STATUS: Record<string, string> = {
  draft: 'badge-muted', active: 'badge-green', suspended: 'badge-amber', retired: 'badge-red',
}

const DELIVERY_STATUS: Record<string, string> = {
  pending: 'badge-muted', in_flight: 'badge-blue', delivered: 'badge-green',
  failed: 'badge-red', retrying: 'badge-amber', superseded: 'badge-muted',
}

const CONNECTOR_BADGE: Record<string, string> = {
  quickbooks: 'badge-green', sftp: 'badge-blue', rest_api: 'badge-blue',
  webhook: 'badge-purple', email: 'badge-muted', manual: 'badge-muted', csv: 'badge-muted',
}

export default function IntegrationPage() {
  const [tab, setTab] = useState<'connections' | 'webhooks' | 'inbound'>('connections')

  const { data: connData, isLoading: cLoading } = useQuery({
    queryKey: ['integration-connections'],
    queryFn: () =>
      api.get('/integration/connections/').then(r => r.data).catch(() => ({ results: [] })),
  })

  const { data: whData, isLoading: wLoading } = useQuery({
    queryKey: ['integration-webhooks'],
    queryFn: () =>
      api.get('/integration/webhook-deliveries/').then(r => r.data).catch(() => ({ results: [] })),
    enabled: tab === 'webhooks',
  })

  const { data: inbData, isLoading: iLoading } = useQuery({
    queryKey: ['integration-inbound'],
    queryFn: () =>
      api.get('/integration/inbound-receipts/').then(r => r.data).catch(() => ({ results: [] })),
    enabled: tab === 'inbound',
  })

  const connections = connData?.results ?? (Array.isArray(connData) ? connData : [])
  const webhooks = whData?.results ?? (Array.isArray(whData) ? whData : [])
  const inbound = inbData?.results ?? (Array.isArray(inbData) ? inbData : [])

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Integration</div>
          <div className="page-sub">
            External connections and webhooks — coordination layer only, not business source of truth
          </div>
        </div>
      </div>

      <div className="tabs">
        <div className={`tab ${tab === 'connections' ? 'active' : ''}`} onClick={() => setTab('connections')}>
          Connections
        </div>
        <div className={`tab ${tab === 'webhooks' ? 'active' : ''}`} onClick={() => setTab('webhooks')}>
          Outbound Webhooks
        </div>
        <div className={`tab ${tab === 'inbound' ? 'active' : ''}`} onClick={() => setTab('inbound')}>
          Inbound Receipts
        </div>
      </div>

      {tab === 'connections' && (
        <div className="table-wrap">
          {cLoading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : connections.length === 0 ? (
            <div className="empty-state">
              <Plug size={40} />
              <div>No external connections</div>
              <div style={{ fontSize: 12 }}>
                Configure connections to QuickBooks, SFTP, REST APIs, and webhooks
              </div>
            </div>
          ) : (
            <table>
              <thead>
                <tr><th>Label</th><th>Connector Type</th><th>Status</th><th>Created</th><th>Updated</th></tr>
              </thead>
              <tbody>
                {connections.map((c: any) => (
                  <tr key={c.id}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{c.label}</td>
                    <td>
                      <span className={`badge ${CONNECTOR_BADGE[c.connector_type] ?? 'badge-muted'}`}>
                        {c.connector_type?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${CONN_STATUS[c.status] ?? 'badge-muted'}`}>{c.status}</span>
                    </td>
                    <td>{c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</td>
                    <td>{c.updated_at ? new Date(c.updated_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'webhooks' && (
        <div className="table-wrap">
          {wLoading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : webhooks.length === 0 ? (
            <div className="empty-state">
              <Webhook size={40} />
              <div>No outbound webhook deliveries</div>
              <div style={{ fontSize: 12 }}>
                Outbound webhooks carry platform events to external subscribers
              </div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Event Type</th><th>Status</th><th>Attempts</th>
                  <th>Last Response</th><th>Delivered At</th>
                </tr>
              </thead>
              <tbody>
                {webhooks.map((w: any) => (
                  <tr key={w.id}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: 12 }}>{w.event_type}</td>
                    <td>
                      <span className={`badge ${DELIVERY_STATUS[w.status] ?? 'badge-muted'}`}>{w.status}</span>
                    </td>
                    <td>{w.attempt_count ?? 0}</td>
                    <td>
                      {w.last_response_code
                        ? <span className={`badge ${w.last_response_code < 300 ? 'badge-green' : 'badge-red'}`}>{w.last_response_code}</span>
                        : '—'}
                    </td>
                    <td>{w.delivered_at ? new Date(w.delivered_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'inbound' && (
        <div className="table-wrap">
          {iLoading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : inbound.length === 0 ? (
            <div className="empty-state">
              <ArrowDownToLine size={40} />
              <div>No inbound webhook receipts</div>
              <div style={{ fontSize: 12 }}>
                Inbound receipts are deduplicated by provider event ID and signature-verified
              </div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Event Type</th><th>Provider Event ID</th><th>Sig Verified</th>
                  <th>Duplicate</th><th>Processing Status</th><th>Received At</th>
                </tr>
              </thead>
              <tbody>
                {inbound.map((r: any) => (
                  <tr key={r.id}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: 12 }}>{r.event_type}</td>
                    <td className="mono" style={{ fontSize: 11 }}>{r.provider_event_id?.slice(0, 20)}…</td>
                    <td>
                      {r.signature_verified
                        ? <span className="badge badge-green">Verified</span>
                        : <span className="badge badge-red">Unverified</span>}
                    </td>
                    <td>
                      {r.is_duplicate
                        ? <span className="badge badge-amber">Duplicate</span>
                        : <span className="badge badge-muted">Unique</span>}
                    </td>
                    <td><span className="badge badge-muted">{r.processing_status}</span></td>
                    <td>{r.received_at ? new Date(r.received_at).toLocaleString() : '—'}</td>
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
