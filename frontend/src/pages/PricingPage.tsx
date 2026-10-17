import { useState } from 'react'
import type { SyntheticEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import api from '../lib/apiClient'
import { formatCurrency, formatDate } from '../lib/formatters'
import PageHeader from '../components/layout/PageHeader'
import DataTable, { type Column } from '../components/data-display/DataTable'
import StatusChip from '../components/data-display/StatusChip'

/* ── Status-to-colour maps ── */

const PROFILE_STATUS_COLOR: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  draft: 'default',
  active: 'success',
  superseded: 'warning',
  retired: 'error',
}

const BIND_STATUS_COLOR: Record<string, 'default' | 'success' | 'info' | 'secondary' | 'warning' | 'error'> = {
  order_bindable: 'success',
  procurement_bindable: 'info',
  invoice_bindable: 'secondary',
  export_bindable: 'success',
  not_bindable: 'error',
  requote_required: 'warning',
  expired: 'default',
  superseded: 'warning',
}

const CHANNEL_LABEL: Record<string, string> = {
  online_dtc: 'Online DTC',
  bulk_po: 'Bulk PO',
  owned_channel: 'Owned',
  buyer_storefront: 'Storefront',
  marketplace: 'Marketplace',
  retail_pos: 'Retail POS',
  promotional: 'Promotional',
  buyer_contract: 'Contract',
}

function pct(v: any) {
  if (v == null) return '\u2014'
  return `${(parseFloat(v) * 100).toFixed(2)}%`
}

/* ── Column definitions ── */

const profileColumns: Column<any>[] = [
  {
    id: 'vendor_company_reference',
    label: 'Vendor',
    render: (p) => (
      <Typography
        variant="body2"
        sx={{ fontFamily: 'monospace', color: 'text.primary', fontWeight: 500, fontSize: 11 }}
      >
        {p.vendor_company_reference?.slice(0, 8)}&hellip;
      </Typography>
    ),
  },
  {
    id: 'channel',
    label: 'Channel',
    render: (p) => (
      <Chip label={CHANNEL_LABEL[p.channel] ?? p.channel} size="small" variant="filled" />
    ),
  },
  {
    id: 'status',
    label: 'Status',
    render: (p) => {
      const color = PROFILE_STATUS_COLOR[p.status] ?? ('default' as const)
      return (
        <Chip
          label={p.status?.replace(/_/g, ' ')}
          color={color}
          size="small"
          variant="filled"
        />
      )
    },
  },
  {
    id: 'vendor_side_commission_rate',
    label: 'Vendor Commission',
    render: (p) => pct(p.vendor_side_commission_rate),
  },
  {
    id: 'buyer_side_commission_rate',
    label: 'Buyer Commission',
    render: (p) => pct(p.buyer_side_commission_rate),
  },
  {
    id: 'currency',
    label: 'Currency',
    render: (p) => p.currency ?? 'USD',
  },
  {
    id: 'effective_from',
    label: 'Effective From',
    render: (p) => (p.effective_from ? formatDate(p.effective_from) : '\u2014'),
  },
]

const snapshotColumns: Column<any>[] = [
  {
    id: 'product_reference',
    label: 'Product',
    render: (s) => (
      <Typography
        variant="body2"
        sx={{ fontFamily: 'monospace', color: 'text.primary', fontSize: 11 }}
      >
        {s.product_reference?.slice(0, 8)}&hellip;
      </Typography>
    ),
  },
  {
    id: 'channel',
    label: 'Channel',
    render: (s) => (
      <Chip label={CHANNEL_LABEL[s.channel] ?? s.channel} size="small" variant="filled" />
    ),
  },
  {
    id: 'buyer_facing_price',
    label: 'Buyer Price',
    render: (s) => (
      <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>
        {formatCurrency(s.buyer_facing_price, s.currency)}
      </Typography>
    ),
  },
  {
    id: 'currency',
    label: 'Currency',
    render: (s) => s.currency ?? 'USD',
  },
  {
    id: 'bindability_status',
    label: 'Bindability',
    render: (s) => {
      const color = BIND_STATUS_COLOR[s.bindability_status] ?? ('default' as const)
      return (
        <Chip
          label={s.bindability_status?.replace(/_/g, ' ')}
          color={color}
          size="small"
          variant="filled"
        />
      )
    },
  },
  {
    id: 'is_current',
    label: 'Current',
    render: (s) =>
      s.is_current ? (
        <StatusChip status="active" label="Current" />
      ) : (
        <StatusChip status="retired" label="Superseded" />
      ),
  },
  {
    id: 'valid_from',
    label: 'Valid From',
    render: (s) => (s.valid_from ? formatDate(s.valid_from) : '\u2014'),
  },
]

/* ── Page component ── */

export default function PricingPage() {
  const [tab, setTab] = useState<'profiles' | 'snapshots'>('profiles')

  const { data: profileData, isLoading: pLoading } = useQuery({
    queryKey: ['pricing-profiles'],
    queryFn: () => api.get('/pricing/profiles/').then((r) => r.data),
  })

  const { data: snapData, isLoading: sLoading } = useQuery({
    queryKey: ['pricing-snapshots'],
    queryFn: () => api.get('/pricing/snapshots/').then((r) => r.data),
    enabled: tab === 'snapshots',
  })

  const profiles = profileData?.results ?? (Array.isArray(profileData) ? profileData : [])
  const snapshots = snapData?.results ?? (Array.isArray(snapData) ? snapData : [])

  const handleTabChange = (_: SyntheticEvent, newValue: string) => {
    setTab(newValue as 'profiles' | 'snapshots')
  }

  return (
    <Box>
      <PageHeader
        title="Pricing"
        subtitle="Price profiles, effective snapshots, and channel bindability"
      />

      <Tabs
        value={tab}
        onChange={handleTabChange}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Price Profiles" value="profiles" />
        <Tab label="Price Snapshots" value="snapshots" />
      </Tabs>

      {tab === 'profiles' && (
        <DataTable
          columns={profileColumns}
          rows={profiles}
          loading={pLoading}
          rowKey={(p) => p.id}
          emptyMessage="No pricing profiles configured"
          emptyIcon={<AttachMoneyIcon sx={{ fontSize: 48 }} />}
        />
      )}

      {tab === 'snapshots' && (
        <DataTable
          columns={snapshotColumns}
          rows={snapshots}
          loading={sLoading}
          rowKey={(s) => s.id}
          emptyMessage="No price snapshots"
          emptyIcon={<TrendingUpIcon sx={{ fontSize: 48 }} />}
        />
      )}
    </Box>
  )
}
