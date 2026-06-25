import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Rocket, Plus, CheckCircle } from 'lucide-react'
import api from '../lib/apiClient'

const LAUNCH_STATUS: Record<string, string> = {
  draft: 'badge-muted', planning: 'badge-blue', readiness_check: 'badge-amber',
  blocked: 'badge-red', ready: 'badge-green', launched: 'badge-green',
  cancelled: 'badge-muted', postponed: 'badge-amber',
  post_launch_review: 'badge-purple', closed: 'badge-muted',
}

export default function LaunchPage() {
  const [tab, setTab] = useState<'events' | 'detail'>('events')
  const [selected, setSelected] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['launch-events'],
    queryFn: () => api.get('/launch/events/').then(r => r.data).catch(() => ({ results: [] })),
  })

  const events = data?.results ?? (Array.isArray(data) ? data : [])

  function openDetail(ev: any) {
    setSelected(ev)
    setTab('detail')
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Launch & Events</div>
          <div className="page-sub">
            Product launch coordination — readiness aggregation across products, devices, and pricing
          </div>
        </div>
        <button className="btn btn-primary"><Plus size={14} /> New Launch Event</button>
      </div>

      <div className="tabs">
        <div className={`tab ${tab === 'events' ? 'active' : ''}`} onClick={() => setTab('events')}>
          Launch Events
        </div>
        {selected && (
          <div className={`tab ${tab === 'detail' ? 'active' : ''}`} onClick={() => setTab('detail')}>
            {selected.name}
          </div>
        )}
      </div>

      {tab === 'events' && (
        <div className="table-wrap">
          {isLoading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : events.length === 0 ? (
            <div className="empty-state">
              <Rocket size={40} />
              <div>No launch events</div>
              <div style={{ fontSize: 12 }}>
                Launch events coordinate product readiness across all modules.
                Products, devices, and pricing records remain authoritative in their own modules.
              </div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th><th>Status</th><th>Target Launch</th>
                  <th>Products</th><th>Devices</th><th>Pricing Refs</th><th>Created</th><th></th>
                </tr>
              </thead>
              <tbody>
                {events.map((e: any) => (
                  <tr key={e.id} style={{ cursor: 'pointer' }} onClick={() => openDetail(e)}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{e.name}</td>
                    <td>
                      <span className={`badge ${LAUNCH_STATUS[e.status] ?? 'badge-muted'}`}>
                        {e.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      {e.target_launch_date
                        ? new Date(e.target_launch_date).toLocaleDateString()
                        : '—'}
                    </td>
                    <td>{e.product_readiness_references?.length ?? 0}</td>
                    <td>{e.device_readiness_references?.length ?? 0}</td>
                    <td>{e.pricing_readiness_references?.length ?? 0}</td>
                    <td>{e.created_at ? new Date(e.created_at).toLocaleDateString() : '—'}</td>
                    <td><CheckCircle size={14} style={{ color: 'var(--text-muted)' }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'detail' && selected && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="section-header">
              <span className="section-title">{selected.name}</span>
              <span className={`badge ${LAUNCH_STATUS[selected.status] ?? 'badge-muted'}`}>
                {selected.status?.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="card-grid card-grid-3">
              <div>
                <div className="label">Target Launch Date</div>
                <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                  {selected.target_launch_date
                    ? new Date(selected.target_launch_date).toLocaleDateString()
                    : 'TBD'}
                </div>
              </div>
              <div>
                <div className="label">Created</div>
                <div>{selected.created_at ? new Date(selected.created_at).toLocaleDateString() : '—'}</div>
              </div>
              <div>
                <div className="label">Updated</div>
                <div>{selected.updated_at ? new Date(selected.updated_at).toLocaleDateString() : '—'}</div>
              </div>
            </div>
          </div>

          <div className="card-grid card-grid-3">
            <div className="card">
              <div className="section-title" style={{ marginBottom: 12 }}>Product Readiness</div>
              {(selected.product_readiness_references ?? []).length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No product references</div>
              ) : (
                (selected.product_readiness_references ?? []).map((ref: string) => (
                  <div key={ref} className="mono" style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    {ref}
                  </div>
                ))
              )}
            </div>
            <div className="card">
              <div className="section-title" style={{ marginBottom: 12 }}>Device Readiness</div>
              {(selected.device_readiness_references ?? []).length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No device references</div>
              ) : (
                (selected.device_readiness_references ?? []).map((ref: string) => (
                  <div key={ref} className="mono" style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    {ref}
                  </div>
                ))
              )}
            </div>
            <div className="card">
              <div className="section-title" style={{ marginBottom: 12 }}>Pricing Readiness</div>
              {(selected.pricing_readiness_references ?? []).length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No pricing references</div>
              ) : (
                (selected.pricing_readiness_references ?? []).map((ref: string) => (
                  <div key={ref} className="mono" style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    {ref}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
