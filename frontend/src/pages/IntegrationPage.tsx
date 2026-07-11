import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plug, Webhook, ArrowDownToLine, Key, Copy, Check, Trash2, X, AlertCircle } from 'lucide-react'
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
  const [tab, setTab] = useState<'connections' | 'webhooks' | 'inbound' | 'api-keys'>('connections')

  // API Key creation/modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [keyLabel, setKeyLabel] = useState('')
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null)
  const [isCreatingKey, setIsCreatingKey] = useState(false)
  const [modalError, setModalError] = useState('')

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

  const { data: keysData, isLoading: kLoading, refetch: refetchKeys } = useQuery({
    queryKey: ['integration-api-keys'],
    queryFn: () =>
      api.get('/integration/api-keys/').then(r => r.data).catch(() => ({ results: [] })),
    enabled: tab === 'api-keys',
  })

  const connections = connData?.results ?? (Array.isArray(connData) ? connData : [])
  const webhooks = whData?.results ?? (Array.isArray(whData) ? whData : [])
  const inbound = inbData?.results ?? (Array.isArray(inbData) ? inbData : [])
  const apiKeys = keysData?.results ?? (Array.isArray(keysData) ? keysData : [])

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!keyLabel.trim()) return
    setIsCreatingKey(true)
    setModalError('')
    try {
      const res = await api.post('/integration/api-keys/', { label: keyLabel })
      setGeneratedKey(res.data.token)
      refetchKeys()
    } catch (err: any) {
      console.error(err)
      setModalError('Failed to generate API Key. Please try again.')
    } finally {
      setIsCreatingKey(false)
    }
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKeyId(id)
    setTimeout(() => setCopiedKeyId(null), 2000)
  }

  const handleRevokeKey = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key? External integrations using this key will immediately fail.')) return
    try {
      await api.delete(`/integration/api-keys/${id}/`)
      refetchKeys()
    } catch (err) {
      console.error(err)
    }
  }

  const openGenerateModal = () => {
    setKeyLabel('')
    setGeneratedKey(null)
    setModalError('')
    setIsModalOpen(true)
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="page-title">Integration</div>
          <div className="page-sub">
            External connections, webhooks, and B2B API access keys.
          </div>
        </div>
        {tab === 'api-keys' && (
          <button className="btn btn-primary" onClick={openGenerateModal}>
            <Key size={16} style={{ marginRight: 6 }} />
            Generate B2B API Key
          </button>
        )}
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
        <div className={`tab ${tab === 'api-keys' ? 'active' : ''}`} onClick={() => setTab('api-keys')}>
          B2B API Keys
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

      {tab === 'api-keys' && (
        <div className="table-wrap">
          {kLoading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : apiKeys.length === 0 ? (
            <div className="empty-state">
              <Key size={40} />
              <div>No B2B API Keys</div>
              <div style={{ fontSize: 12, marginBottom: 16 }}>
                Create B2B API keys to authorize your external storefronts, scripts, or ERP systems.
              </div>
              <button className="btn btn-primary btn-sm" onClick={openGenerateModal}>
                Generate First Key
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Label</th>
                  <th>API Key / Token</th>
                  <th>Created At</th>
                  <th>Last Used</th>
                  <th>Status</th>
                  <th style={{ width: 80, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map((k: any) => (
                  <tr key={k.id}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{k.label}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <code className="mono" style={{ background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>
                          {k.token}
                        </code>
                        <button className="btn btn-ghost" style={{ padding: 4 }} onClick={() => handleCopy(k.token, k.id)} title="Copy API Key">
                          {copiedKeyId === k.id ? <Check size={14} style={{ color: 'var(--green)' }} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </td>
                    <td>{k.created_at ? new Date(k.created_at).toLocaleString() : '—'}</td>
                    <td>{k.last_used_at ? new Date(k.last_used_at).toLocaleString() : 'Never'}</td>
                    <td>
                      <span className={`badge ${k.is_active ? 'badge-green' : 'badge-red'}`}>
                        {k.is_active ? 'Active' : 'Revoked'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-ghost" style={{ padding: 4, color: 'var(--red)' }} onClick={() => handleRevokeKey(k.id)} title="Revoke Key">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* API Key Generation Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: 500, maxWidth: '95%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Generate B2B API Key</div>
              <button className="btn btn-ghost" style={{ padding: 4 }} onClick={() => setIsModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            {modalError && (
              <div style={{ background: 'var(--red-dim)', color: 'var(--red)', padding: '10px 12px', borderRadius: 6, marginBottom: 12, fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}>
                <AlertCircle size={14} />
                <span>{modalError}</span>
              </div>
            )}

            {!generatedKey ? (
              <form onSubmit={handleGenerateKey}>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="label">Key Description / Label *</label>
                  <input
                    className="input"
                    placeholder="e.g. Telco Cellular Accessories Storefront"
                    value={keyLabel}
                    onChange={e => setKeyLabel(e.target.value)}
                    required
                  />
                  <small style={{ display: 'block', marginTop: 4, color: 'var(--text-secondary)', fontSize: 11 }}>
                    Give the key a descriptive name representing what external client or system will use it.
                  </small>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={isCreatingKey}>
                    {isCreatingKey ? 'Generating...' : 'Generate Key'}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div style={{ background: 'var(--green-dim)', color: 'var(--green)', padding: '10px 12px', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
                  API Key generated successfully! Make sure to copy it now. For security, we won't show it again.
                </div>
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label className="label">API Key</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      className="input mono"
                      style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                      value={generatedKey}
                      readOnly
                    />
                    <button className="btn btn-secondary" onClick={() => handleCopy(generatedKey, 'modal')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {copiedKeyId === 'modal' ? <Check size={16} style={{ color: 'var(--green)' }} /> : <Copy size={16} />}
                      <span>{copiedKeyId === 'modal' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary" onClick={() => setIsModalOpen(false)}>I have copied the key</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
