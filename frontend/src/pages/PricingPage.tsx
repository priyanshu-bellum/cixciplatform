import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DollarSign, TrendingUp } from 'lucide-react'
import api from '../lib/apiClient'

const PROFILE_STATUS: Record<string, string> = {
  draft: 'badge-muted', active: 'badge-green',
  superseded: 'badge-amber', retired: 'badge-red',
}

const BIND_STATUS: Record<string, string> = {
  order_bindable: 'badge-green', procurement_bindable: 'badge-blue',
  invoice_bindable: 'badge-purple', export_bindable: 'badge-green',
  not_bindable: 'badge-red', requote_required: 'badge-amber',
  expired: 'badge-muted', superseded: 'badge-amber',
}

const CHANNEL_LABEL: Record<string, string> = {
  online_dtc: 'Online DTC', bulk_po: 'Bulk PO', owned_channel: 'Owned',
  buyer_storefront: 'Storefront', marketplace: 'Marketplace',
  retail_pos: 'Retail POS', promotional: 'Promotional', buyer_contract: 'Contract',
}

function pct(v: any) {
  if (v == null) return '—'
  return `${(parseFloat(v) * 100).toFixed(2)}%`
}

export default function PricingPage() {
  const [tab, setTab] = useState<'profiles' | 'snapshots'>('profiles')

  const { data: profileData, isLoading: pLoading } = useQuery({
    queryKey: ['pricing-profiles'],
    queryFn: () => api.get('/pricing/profiles/').then(r => r.data).catch(() => ({ results: [] })),
  })

  const { data: snapData, isLoading: sLoading } = useQuery({
    queryKey: ['pricing-snapshots'],
    queryFn: () => api.get('/pricing/snapshots/').then(r => r.data).catch(() => ({ results: [] })),
    enabled: tab === 'snapshots',
  })

  const profiles = profileData?.results ?? (Array.isArray(profileData) ? profileData : [])
  const snapshots = snapData?.results ?? (Array.isArray(snapData) ? snapData : [])

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Pricing</div>
          <div className="page-sub">Price profiles, effective snapshots, and channel bindability</div>
        </div>
      </div>

      <div className="tabs">
        <div className={`tab ${tab === 'profiles' ? 'active' : ''}`} onClick={() => setTab('profiles')}>
          Price Profiles
        </div>
        <div className={`tab ${tab === 'snapshots' ? 'active' : ''}`} onClick={() => setTab('snapshots')}>
          Price Snapshots
        </div>
      </div>

      {tab === 'profiles' && (
        <div className="table-wrap">
          {pLoading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : profiles.length === 0 ? (
            <div className="empty-state">
              <DollarSign size={40} />
              <div>No pricing profiles configured</div>
              <div style={{ fontSize: 12 }}>Create a pricing profile to define vendor/channel commission rules</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Vendor</th><th>Channel</th><th>Status</th>
                  <th>Vendor Commission</th><th>Buyer Commission</th><th>Currency</th><th>Effective From</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p: any) => (
                  <tr key={p.id}>
                    <td className="mono" style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: 11 }}>
                      {p.vendor_company_reference?.slice(0, 8)}…
                    </td>
                    <td><span className="badge badge-muted">{CHANNEL_LABEL[p.channel] ?? p.channel}</span></td>
                    <td><span className={`badge ${PROFILE_STATUS[p.status] ?? 'badge-muted'}`}>{p.status}</span></td>
                    <td>{pct(p.vendor_side_commission_rate)}</td>
                    <td>{pct(p.buyer_side_commission_rate)}</td>
                    <td>{p.currency ?? 'USD'}</td>
                    <td>{p.effective_from ? new Date(p.effective_from).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'snapshots' && (
        <div className="table-wrap">
          {sLoading ? (
            <div className="loading-overlay"><div className="spinner" /></div>
          ) : snapshots.length === 0 ? (
            <div className="empty-state">
              <TrendingUp size={40} />
              <div>No price snapshots</div>
              <div style={{ fontSize: 12 }}>
                Snapshots are immutable records created when pricing is calculated for an order
              </div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Product</th><th>Channel</th><th>Buyer Price</th>
                  <th>Currency</th><th>Bindability</th><th>Current</th><th>Valid From</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.map((s: any) => (
                  <tr key={s.id}>
                    <td className="mono" style={{ color: 'var(--text-primary)', fontSize: 11 }}>
                      {s.product_reference?.slice(0, 8)}…
                    </td>
                    <td><span className="badge badge-muted">{CHANNEL_LABEL[s.channel] ?? s.channel}</span></td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{s.buyer_facing_price}</td>
                    <td>{s.currency ?? 'USD'}</td>
                    <td>
                      <span className={`badge ${BIND_STATUS[s.bindability_status] ?? 'badge-muted'}`}>
                        {s.bindability_status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      {s.is_current
                        ? <span className="badge badge-green">Current</span>
                        : <span className="badge badge-muted">Superseded</span>}
                    </td>
                    <td>{s.valid_from ? new Date(s.valid_from).toLocaleDateString() : '—'}</td>
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
