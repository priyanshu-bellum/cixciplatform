import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart2, Calendar, Activity } from 'lucide-react'
import api from '../lib/apiClient'

const WINDOW_STATUS: Record<string, string> = {
  active: 'badge-green',
  delivery_failed: 'badge-red',
  superseded: 'badge-amber',
  suppressed_no_activity: 'badge-muted',
}

export default function AnalyticsPage() {
  const [tab, setTab] = useState<'metrics' | 'windows' | 'aggregations'>('metrics')

  const { data: metricData, isLoading: mLoading } = useQuery({
    queryKey: ['analytics-metrics'],
    queryFn: () => api.get('/analytics/metrics/').then(r => r.data).catch(() => ({ results: [] })),
  })

  const { data: windowData, isLoading: wLoading } = useQuery({
    queryKey: ['analytics-windows'],
    queryFn: () => api.get('/analytics/windows/').then(r => r.data).catch(() => ({ results: [] })),
    enabled: tab === 'windows',
  })

  const { data: aggData, isLoading: aLoading } = useQuery({
    queryKey: ['analytics-aggregations'],
    queryFn: () => api.get('/analytics/aggregations/').then(r => r.data).catch(() => ({ results: [] })),
    enabled: tab === 'aggregations',
  })

  const metrics = metricData?.results ?? (Array.isArray(metricData) ? metricData : [])
  const windows = windowData?.results ?? (Array.isArray(windowData) ? windowData : [])
  const aggregations = aggData?.results ?? (Array.isArray(aggData) ? aggData : [])

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Analytics & Reporting</div>
          <div className="page-sub">Metric definitions, summary windows, and immutable aggregation records</div>
        </div>
      </div>

      <div className="tabs">
        <div className={`tab ${tab === 'metrics' ? 'active' : ''}`} onClick={() => setTab('metrics')}>
          Metrics
        </div>
        <div className={`tab ${tab === 'windows' ? 'active' : ''}`} onClick={() => setTab('windows')}>
          Reporting Windows
        </div>
        <div className={`tab ${tab === 'aggregations' ? 'active' : ''}`} onClick={() => setTab('aggregations')}>
          Aggregations
        </div>
      </div>

      {tab === 'metrics' && (
        <div className="table-wrap">
          {mLoading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : metrics.length === 0 ? (
            <div className="empty-state">
              <BarChart2 size={40} />
              <div>No metrics defined</div>
              <div style={{ fontSize: 12 }}>
                Metrics track platform activity — consumed read-only from source modules
              </div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Code</th><th>Label</th><th>Source Module</th><th>Method</th><th>Active</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m: any) => (
                  <tr key={m.id}>
                    <td className="mono" style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: 12 }}>
                      {m.code}
                    </td>
                    <td>{m.label}</td>
                    <td><span className="badge badge-muted">{m.source_module}</span></td>
                    <td><span className="badge badge-blue">{m.aggregation_method}</span></td>
                    <td>
                      {m.is_active
                        ? <span className="badge badge-green">Active</span>
                        : <span className="badge badge-muted">Inactive</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'windows' && (
        <div className="table-wrap">
          {wLoading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : windows.length === 0 ? (
            <div className="empty-state">
              <Calendar size={40} />
              <div>No reporting windows</div>
              <div style={{ fontSize: 12 }}>
                Windows are created per scheduled summary cycle.
                Failed windows carry forward into the next window's interval.
              </div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Window Start</th><th>Window End</th><th>Status</th>
                  <th>Effective Start</th><th>Created</th>
                </tr>
              </thead>
              <tbody>
                {windows.map((w: any) => (
                  <tr key={w.id}>
                    <td style={{ color: 'var(--text-primary)' }}>
                      {w.window_start ? new Date(w.window_start).toLocaleString() : '—'}
                    </td>
                    <td>{w.window_end ? new Date(w.window_end).toLocaleString() : '—'}</td>
                    <td>
                      <span className={`badge ${WINDOW_STATUS[w.status] ?? 'badge-muted'}`}>
                        {w.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>{w.effective_start ? new Date(w.effective_start).toLocaleString() : '—'}</td>
                    <td>{w.created_at ? new Date(w.created_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'aggregations' && (
        <div className="table-wrap">
          {aLoading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : aggregations.length === 0 ? (
            <div className="empty-state">
              <Activity size={40} />
              <div>No aggregation records</div>
              <div style={{ fontSize: 12 }}>
                Activity summary aggregations are immutable records created per reporting window
              </div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Orders</th><th>Shipments</th><th>SLA Exceptions</th>
                  <th>Late Imports</th><th>Missing Imports</th><th>Current</th><th>Aggregated At</th>
                </tr>
              </thead>
              <tbody>
                {aggregations.map((a: any) => (
                  <tr key={a.id}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{a.orders_count ?? 0}</td>
                    <td>{a.shipments_count ?? 0}</td>
                    <td>{a.sla_exceptions_count ?? 0}</td>
                    <td style={{ color: (a.late_imports_count ?? 0) > 0 ? 'var(--red)' : 'var(--text-secondary)' }}>
                      {a.late_imports_count ?? 0}
                    </td>
                    <td style={{ color: (a.missing_imports_count ?? 0) > 0 ? 'var(--amber)' : 'var(--text-secondary)' }}>
                      {a.missing_imports_count ?? 0}
                    </td>
                    <td>
                      {a.is_current
                        ? <span className="badge badge-green">Current</span>
                        : <span className="badge badge-muted">Old</span>}
                    </td>
                    <td>{a.aggregated_at ? new Date(a.aggregated_at).toLocaleString() : '—'}</td>
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
