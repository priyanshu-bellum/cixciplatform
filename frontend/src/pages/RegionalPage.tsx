import { useState } from 'react'
import type { SyntheticEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import PublicIcon from '@mui/icons-material/Public'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/EditOutlined'
import RateReviewIcon from '@mui/icons-material/RateReviewOutlined'
import api from '../lib/apiClient'
import { useAuthStore } from '../stores/authStore'
import { formatCurrency, formatDate } from '../lib/formatters'
import PageHeader from '../components/layout/PageHeader'
import DataTable, { type Column } from '../components/data-display/DataTable'
import StatusChip from '../components/data-display/StatusChip'
import ShippingFeeDialog from './regional/ShippingFeeDialog'
import DistributionCenterDialog from './regional/DistributionCenterDialog'
import RegionUpdateDialog from './regional/RegionUpdateDialog'
import ReviewRegionConfigDialog from './regional/ReviewRegionConfigDialog'

/* ── Tab type ── */

type TabValue = 'company-regions' | 'shipping-fees' | 'buyer-fees' | 'distribution-centers' | 'region-events'

/* ── Column definitions ── */

const companyRegionColumns: Column<any>[] = [
  {
    id: 'name',
    label: 'Company',
    render: (c) => (
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>{c.name}</Typography>
        <Typography variant="caption" color="text.secondary">{c.display_name || ''}</Typography>
      </Box>
    ),
  },
  {
    id: 'company_type',
    label: 'Type',
    render: (c) => <Chip label={c.company_type?.replace(/_/g, ' ')} size="small" variant="outlined" />,
  },
  {
    id: 'region_code',
    label: 'Region',
    render: (c) => c.region_code || '\u2014',
  },
  {
    id: 'approved_regions',
    label: 'Approved Regions',
    render: (c) => {
      const regions = c.approved_regions || []
      if (!regions.length) return <Typography variant="caption" color="text.secondary">None</Typography>
      return (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {regions.map((r: string) => <Chip key={r} label={r} size="small" variant="filled" />)}
        </Box>
      )
    },
  },
  {
    id: 'status',
    label: 'Status',
    render: (c) => <StatusChip status={c.status} />,
  },
]

const shippingFeeColumns: Column<any>[] = [
  {
    id: 'vendor_company_reference',
    label: 'Vendor',
    render: (f) => (
      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 11 }}>
        {f.vendor_company_reference?.slice(0, 8)}&hellip;
      </Typography>
    ),
  },
  { id: 'region_code', label: 'Region', render: (f) => f.region_code || '\u2014' },
  {
    id: 'fee_amount',
    label: 'Fee',
    render: (f) => (
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {formatCurrency(f.fee_amount, f.currency)}
      </Typography>
    ),
  },
  {
    id: 'fee_type',
    label: 'Type',
    render: (f) => <Chip label={f.fee_type?.replace(/_/g, ' ')} size="small" variant="outlined" />,
  },
  { id: 'status', label: 'Status', render: (f) => <StatusChip status={f.status} /> },
  {
    id: 'effective_from',
    label: 'Effective From',
    render: (f) => f.effective_from ? formatDate(f.effective_from) : '\u2014',
  },
]

const buyerFeeColumns: Column<any>[] = [
  {
    id: 'vendor_company_reference',
    label: 'Vendor',
    render: (s) => (
      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 11 }}>
        {s.vendor_company_reference?.slice(0, 8)}&hellip;
      </Typography>
    ),
  },
  { id: 'region_code', label: 'Region', render: (s) => s.region_code || '\u2014' },
  {
    id: 'fee_amount',
    label: 'Fee',
    render: (s) => (
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {formatCurrency(s.fee_amount, s.currency)}
      </Typography>
    ),
  },
  {
    id: 'fee_type',
    label: 'Type',
    render: (s) => <Chip label={s.fee_type?.replace(/_/g, ' ')} size="small" variant="outlined" />,
  },
  {
    id: 'applied_amount',
    label: 'Applied',
    render: (s) => (
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {formatCurrency(s.applied_amount, s.currency)}
      </Typography>
    ),
  },
  {
    id: 'created_at',
    label: 'Date',
    render: (s) => s.created_at ? formatDate(s.created_at) : '\u2014',
  },
]

const dcColumns: Column<any>[] = [
  {
    id: 'name',
    label: 'Name',
    render: (d) => (
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>{d.name}</Typography>
        <Typography variant="caption" color="text.secondary">{d.vendor_company_name || ''}</Typography>
      </Box>
    ),
  },
  { id: 'status', label: 'Status', render: (d) => <StatusChip status={d.status} /> },
  { id: 'city', label: 'City', render: (d) => d.city || '\u2014' },
  { id: 'state', label: 'State', render: (d) => d.state || '\u2014' },
  { id: 'region_code', label: 'Region', render: (d) => d.region_code || '\u2014' },
  {
    id: 'region_configuration_required',
    label: 'Config Review',
    render: (d) => d.region_configuration_required
      ? <StatusChip status="review_required" label="Needs Review" />
      : <StatusChip status="approved" label="Reviewed" />,
  },
]

const eventColumns: Column<any>[] = [
  {
    id: 'vendor_company_name',
    label: 'Vendor',
    render: (e) => e.vendor_company_name || '\u2014',
  },
  { id: 'region_code', label: 'Region', render: (e) => e.region_code || '\u2014' },
  {
    id: 'action',
    label: 'Action',
    render: (e) => (
      <Chip
        label={e.action?.replace(/_/g, ' ')}
        size="small"
        color={e.action === 'region_activated' ? 'success' : 'error'}
        variant="filled"
      />
    ),
  },
  {
    id: 'regions_after',
    label: 'Regions After',
    render: (e) => {
      const regions = e.regions_after || []
      if (!regions.length) return '\u2014'
      return (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {regions.map((r: string) => <Chip key={r} label={r} size="small" variant="outlined" />)}
        </Box>
      )
    },
  },
  {
    id: 'affected_buyer_count',
    label: 'Affected Buyers',
    render: (e) => e.affected_buyer_count ?? 0,
  },
  {
    id: 'created_at',
    label: 'Date',
    render: (e) => e.created_at ? formatDate(e.created_at) : '\u2014',
  },
]

/* ── Page component ── */

export default function RegionalPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const isAdmin = user?.is_cixci_admin || user?.company_type === 'cixci_internal'
  const isBuyer = user?.company_type === 'buyer'
  const isVendor = user?.company_type === 'vendor'

  const defaultTab: TabValue = isBuyer ? 'buyer-fees' : isAdmin ? 'company-regions' : 'shipping-fees'
  const [tab, setTab] = useState<TabValue>(defaultTab)

  // ── Dialog state ──
  const [shippingFeeOpen, setShippingFeeOpen] = useState(false)
  const [shippingFeeEdit, setShippingFeeEdit] = useState<any | null>(null)
  const [dcOpen, setDcOpen] = useState(false)
  const [dcEdit, setDcEdit] = useState<any | null>(null)
  const [regionUpdateOpen, setRegionUpdateOpen] = useState(false)
  const [regionUpdateCompany, setRegionUpdateCompany] = useState<{ id: string; name: string } | null>(null)
  const [reviewConfigOpen, setReviewConfigOpen] = useState(false)
  const [reviewConfigDc, setReviewConfigDc] = useState<{ id: string; name: string } | null>(null)

  // ── Queries ──
  const { data: companiesData, isLoading: companiesLoading, error: companiesError } = useQuery({
    queryKey: ['regional-companies'],
    queryFn: () => api.get('/tenant/companies/', { params: { company_type: 'vendor' } }).then((r) => r.data),
    enabled: isAdmin && tab === 'company-regions',
  })

  const { data: feesData, isLoading: feesLoading, error: feesError } = useQuery({
    queryKey: ['shipping-fees'],
    queryFn: () => api.get('/pricing/shipping-fees/').then((r) => r.data),
    enabled: (isVendor || isAdmin) && tab === 'shipping-fees',
  })

  const { data: buyerFeesData, isLoading: buyerFeesLoading, error: buyerFeesError } = useQuery({
    queryKey: ['buyer-fee-snapshots'],
    queryFn: () => api.get('/pricing/shipping-fee-snapshots/').then((r) => r.data),
    enabled: isBuyer && tab === 'buyer-fees',
  })

  const { data: dcsData, isLoading: dcsLoading, error: dcsError } = useQuery({
    queryKey: ['distribution-centers'],
    queryFn: () => api.get('/tenant/distribution-centers/').then((r) => r.data),
    enabled: (isVendor || isAdmin) && tab === 'distribution-centers',
  })

  const { data: eventsData, isLoading: eventsLoading, error: eventsError } = useQuery({
    queryKey: ['region-events'],
    queryFn: () => api.get('/tenant/region-events/').then((r) => r.data),
    enabled: (isVendor || isAdmin) && tab === 'region-events',
  })

  // ── Normalize data ──
  const companies = companiesData?.results ?? (Array.isArray(companiesData) ? companiesData : [])
  const fees = feesData?.results ?? (Array.isArray(feesData) ? feesData : [])
  const buyerFees = buyerFeesData?.results ?? (Array.isArray(buyerFeesData) ? buyerFeesData : [])
  const dcs = dcsData?.results ?? (Array.isArray(dcsData) ? dcsData : [])
  const events = eventsData?.results ?? (Array.isArray(eventsData) ? eventsData : [])

  const handleTabChange = (_: SyntheticEvent, newValue: string) => {
    setTab(newValue as TabValue)
  }

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['shipping-fees'] })
    queryClient.invalidateQueries({ queryKey: ['distribution-centers'] })
    queryClient.invalidateQueries({ queryKey: ['regional-companies'] })
    queryClient.invalidateQueries({ queryKey: ['region-events'] })
    queryClient.invalidateQueries({ queryKey: ['buyer-fee-snapshots'] })
  }

  // ── Action columns (with edit/review buttons) ──
  const shippingFeeActionColumns: Column<any>[] = [
    ...shippingFeeColumns,
    {
      id: 'actions',
      label: '',
      sortable: false,
      align: 'right',
      render: (f) => (
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => { setShippingFeeEdit(f); setShippingFeeOpen(true) }}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ]

  const companyRegionActionColumns: Column<any>[] = [
    ...companyRegionColumns,
    {
      id: 'actions',
      label: '',
      sortable: false,
      align: 'right',
      render: (c) => c.company_type === 'vendor' ? (
        <Button
          size="small"
          variant="outlined"
          onClick={() => { setRegionUpdateCompany({ id: c.id, name: c.name }); setRegionUpdateOpen(true) }}
          sx={{ textTransform: 'none', fontSize: '0.75rem' }}
        >
          Update Regions
        </Button>
      ) : null,
    },
  ]

  const dcActionColumns: Column<any>[] = [
    ...dcColumns,
    {
      id: 'actions',
      label: '',
      sortable: false,
      align: 'right',
      render: (d) => (
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => { setDcEdit(d); setDcOpen(true) }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {isAdmin && d.region_configuration_required && (
            <Tooltip title="Review Region Config">
              <IconButton size="small" onClick={() => { setReviewConfigDc({ id: d.id, name: d.name }); setReviewConfigOpen(true) }}>
                <RateReviewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ]

  // ── Subtitle ──
  const subtitle = isBuyer
    ? 'Shipping fees applied to your orders by region'
    : isAdmin
      ? 'Manage vendor regions, shipping fees, and distribution centers'
      : 'Configure your regional shipping fees and distribution centers'

  // ── Tab header actions ──
  const renderActions = () => {
    if (tab === 'shipping-fees' && (isVendor || isAdmin)) {
      return (
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { setShippingFeeEdit(null); setShippingFeeOpen(true) }}
        >
          Add Shipping Fee
        </Button>
      )
    }
    if (tab === 'distribution-centers' && (isVendor || isAdmin)) {
      return (
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { setDcEdit(null); setDcOpen(true) }}
        >
          Add Distribution Center
        </Button>
      )
    }
    return null
  }

  // ── Visible tabs ──
  const tabs: { value: TabValue; label: string; visible: boolean }[] = [
    { value: 'company-regions', label: 'Company Regions', visible: !!isAdmin },
    { value: 'shipping-fees', label: 'Shipping Fees', visible: !!isVendor || !!isAdmin },
    { value: 'buyer-fees', label: 'Vendor Shipping Fees', visible: !!isBuyer },
    { value: 'distribution-centers', label: 'Distribution Centers', visible: !!isVendor || !!isAdmin },
    { value: 'region-events', label: 'Region Events', visible: !!isVendor || !!isAdmin },
  ]

  const visibleTabs = tabs.filter((t) => t.visible)

  return (
    <Box>
      <PageHeader
        title="Regional Visibility"
        subtitle={subtitle}
        actions={renderActions()}
      />

      {visibleTabs.length > 1 && (
        <Tabs
          value={tab}
          onChange={handleTabChange}
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          {visibleTabs.map((t) => (
            <Tab key={t.value} label={t.label} value={t.value} />
          ))}
        </Tabs>
      )}

      {isBuyer && (
        <Alert severity="info" sx={{ mb: 2 }}>
          These are the shipping fee snapshots applied to your orders. Fees are set by vendors and captured at order time.
        </Alert>
      )}

      {/* Company Regions tab — Admin only */}
      {tab === 'company-regions' && isAdmin && (
        <>
          {companiesError && <Alert severity="error" sx={{ mb: 2 }}>Failed to load company regions.</Alert>}
          <DataTable
            columns={companyRegionActionColumns}
            rows={companies}
            loading={companiesLoading}
            rowKey={(c) => c.id}
            emptyMessage="No vendor companies found"
            emptyIcon={<PublicIcon sx={{ fontSize: 48 }} />}
          />
        </>
      )}

      {/* Shipping Fees tab — Vendor + Admin */}
      {tab === 'shipping-fees' && (
        <>
          {feesError && <Alert severity="error" sx={{ mb: 2 }}>Failed to load shipping fees.</Alert>}
          <DataTable
            columns={shippingFeeActionColumns}
            rows={fees}
            loading={feesLoading}
            rowKey={(f) => f.id}
            emptyMessage="No shipping fees configured"
            emptyIcon={<PublicIcon sx={{ fontSize: 48 }} />}
          />
        </>
      )}

      {/* Buyer Fees tab — Buyer only */}
      {tab === 'buyer-fees' && isBuyer && (
        <>
          {buyerFeesError && <Alert severity="error" sx={{ mb: 2 }}>Failed to load shipping fee snapshots.</Alert>}
          <DataTable
            columns={buyerFeeColumns}
            rows={buyerFees}
            loading={buyerFeesLoading}
            rowKey={(s) => s.id}
            emptyMessage="No shipping fee snapshots available"
            emptyIcon={<PublicIcon sx={{ fontSize: 48 }} />}
          />
        </>
      )}

      {/* Distribution Centers tab — Vendor + Admin */}
      {tab === 'distribution-centers' && (
        <>
          {dcsError && <Alert severity="error" sx={{ mb: 2 }}>Failed to load distribution centers.</Alert>}
          <DataTable
            columns={dcActionColumns}
            rows={dcs}
            loading={dcsLoading}
            rowKey={(d) => d.id}
            emptyMessage="No distribution centers configured"
            emptyIcon={<PublicIcon sx={{ fontSize: 48 }} />}
          />
        </>
      )}

      {/* Region Events tab — Vendor + Admin */}
      {tab === 'region-events' && (
        <>
          {eventsError && <Alert severity="error" sx={{ mb: 2 }}>Failed to load region events.</Alert>}
          <DataTable
            columns={eventColumns}
            rows={events}
            loading={eventsLoading}
            rowKey={(e) => e.id}
            emptyMessage="No region change events"
            emptyIcon={<PublicIcon sx={{ fontSize: 48 }} />}
          />
        </>
      )}

      {/* Dialogs */}
      <ShippingFeeDialog
        open={shippingFeeOpen}
        onClose={() => setShippingFeeOpen(false)}
        onSaved={invalidateAll}
        editItem={shippingFeeEdit}
      />
      <DistributionCenterDialog
        open={dcOpen}
        onClose={() => setDcOpen(false)}
        onSaved={invalidateAll}
        editItem={dcEdit}
      />
      {regionUpdateCompany && (
        <RegionUpdateDialog
          open={regionUpdateOpen}
          onClose={() => setRegionUpdateOpen(false)}
          onSaved={invalidateAll}
          companyId={regionUpdateCompany.id}
          companyName={regionUpdateCompany.name}
        />
      )}
      <ReviewRegionConfigDialog
        open={reviewConfigOpen}
        onClose={() => setReviewConfigOpen(false)}
        onSaved={invalidateAll}
        dc={reviewConfigDc}
      />
    </Box>
  )
}
