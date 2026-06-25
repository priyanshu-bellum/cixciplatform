import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bell, FileText, Send } from 'lucide-react'
import api from '../lib/apiClient'

const TEMPLATE_STATUS: Record<string, string> = {
  draft: 'badge-muted', approved: 'badge-green', retired: 'badge-red',
}

const DELIVERY_STATUS: Record<string, string> = {
  requested: 'badge-muted', queued: 'badge-blue', sent: 'badge-blue',
  delivered: 'badge-green', failed: 'badge-red', bounced: 'badge-red',
  suppressed: 'badge-amber', delayed: 'badge-amber', expired: 'badge-muted',
  cancelled: 'badge-muted', superseded: 'badge-muted',
}

const PREF_OUTCOME: Record<string, string> = {
  send: 'badge-green', block: 'badge-red', delay: 'badge-amber',
  digest: 'badge-blue', review_required: 'badge-amber', suppress: 'badge-muted',
}

const CHAN: Record<string, string> = {
  email: 'Email', in_app: 'In-App', sms: 'SMS', webhook: 'Webhook', push: 'Push',
}

export default function NotificationsPage() {
  const [tab, setTab] = useState<'templates' | 'requests' | 'delivery'>('templates')

  const { data: tplData, isLoading: tLoading } = useQuery({
    queryKey: ['notif-templates'],
    queryFn: () => api.get('/notifications/templates/').then(r => r.data).catch(() => ({ results: [] })),
  })

  const { data: reqData, isLoading: rLoading } = useQuery({
    queryKey: ['notif-requests'],
    queryFn: () => api.get('/notifications/requests/').then(r => r.data).catch(() => ({ results: [] })),
    enabled: tab === 'requests',
  })

  const { data: dlvData, isLoading: dLoading } = useQuery({
    queryKey: ['notif-delivery'],
    queryFn: () =>
      api.get('/notifications/delivery-attempts/').then(r => r.data).catch(() => ({ results: [] })),
    enabled: tab === 'delivery',
  })

  const templates = tplData?.results ?? (Array.isArray(tplData) ? tplData : [])
  const requests = reqData?.results ?? (Array.isArray(reqData) ? reqData : [])
  const attempts = dlvData?.results ?? (Array.isArray(dlvData) ? dlvData : [])

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Notifications</div>
          <div className="page-sub">Templates, delivery requests, and 10-step preference resolution</div>
        </div>
      </div>

      <div className="tabs">
        <div className={`tab ${tab === 'templates' ? 'active' : ''}`} onClick={() => setTab('templates')}>
          Templates
        </div>
        <div className={`tab ${tab === 'requests' ? 'active' : ''}`} onClick={() => setTab('requests')}>
          Requests
        </div>
        <div className={`tab ${tab === 'delivery' ? 'active' : ''}`} onClick={() => setTab('delivery')}>
          Delivery Attempts
        </div>
      </div>

      {tab === 'templates' && (
        <div className="table-wrap">
          {tLoading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : templates.length === 0 ? (
            <div className="empty-state">
              <FileText size={40} />
              <div>No notification templates</div>
              <div style={{ fontSize: 12 }}>
                Templates define versioned message content per event type and channel
              </div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Code</th><th>Channel</th><th>Event Type</th><th>Status</th><th>Version</th><th>Locale</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t: any) => (
                  <tr key={t.id}>
                    <td className="mono" style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: 12 }}>
                      {t.template_code}
                    </td>
                    <td><span className="badge badge-blue">{CHAN[t.channel] ?? t.channel}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.event_type}
                    </td>
                    <td>
                      <span className={`badge ${TEMPLATE_STATUS[t.status] ?? 'badge-muted'}`}>{t.status}</span>
                    </td>
                    <td>v{t.version ?? 1}</td>
                    <td>{t.locale ?? 'en'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'requests' && (
        <div className="table-wrap">
          {rLoading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : requests.length === 0 ? (
            <div className="empty-state">
              <Bell size={40} />
              <div>No notification requests</div>
              <div style={{ fontSize: 12 }}>
                Requests are created by source modules when notifiable events occur
              </div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Event Type</th><th>Source Module</th><th>Channel</th>
                  <th>Preference Outcome</th><th>Created</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r: any) => (
                  <tr key={r.id}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: 12 }}>{r.event_type}</td>
                    <td><span className="badge badge-muted">{r.source_module}</span></td>
                    <td><span className="badge badge-blue">{CHAN[r.channel] ?? r.channel}</span></td>
                    <td>
                      {r.preference_outcome
                        ? <span className={`badge ${PREF_OUTCOME[r.preference_outcome] ?? 'badge-muted'}`}>{r.preference_outcome}</span>
                        : <span className="badge badge-amber">pending</span>}
                    </td>
                    <td>{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'delivery' && (
        <div className="table-wrap">
          {dLoading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : attempts.length === 0 ? (
            <div className="empty-state">
              <Send size={40} />
              <div>No delivery attempts recorded</div>
              <div style={{ fontSize: 12 }}>
                Delivery attempts are logged per-recipient per-request.
                External providers are transport-layer only — not CIXCI source of truth.
              </div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Channel</th><th>Status</th><th>Provider</th><th>Attempt</th><th>Sent At</th><th>Created</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a: any) => (
                  <tr key={a.id}>
                    <td><span className="badge badge-blue">{CHAN[a.channel] ?? a.channel}</span></td>
                    <td>
                      <span className={`badge ${DELIVERY_STATUS[a.status] ?? 'badge-muted'}`}>{a.status}</span>
                    </td>
                    <td>{a.provider_name || '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {a.attempt_number ?? 1} / {a.max_attempts ?? 3}
                    </td>
                    <td>{a.sent_at ? new Date(a.sent_at).toLocaleString() : '—'}</td>
                    <td>{a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}</td>
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
