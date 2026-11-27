import { Fragment, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { alpha } from '@mui/material/styles'
import { Alert, Avatar, Box, Button, Checkbox, Chip, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, MenuItem, Pagination,
  Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Tooltip, Typography } from '@mui/material'
import StorefrontIcon from '@mui/icons-material/StorefrontOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import SyncIcon from '@mui/icons-material/Sync'
import FileDownloadIcon from '@mui/icons-material/FileDownloadOutlined'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import DevicesIcon from '@mui/icons-material/DevicesOutlined'
import CategoryIcon from '@mui/icons-material/CategoryOutlined'
import PaletteIcon from '@mui/icons-material/PaletteOutlined'
import TravelExploreIcon from '@mui/icons-material/TravelExplore'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CompareArrowsIcon from '@mui/icons-material/CompareArrows'
import api from '../../lib/apiClient'
import { getImageUrl } from '../../lib/formatters'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { apiError } from '../../hooks/useCompatibilityOptions'
import { useSnackbar } from '../../components/feedback/SnackbarProvider'
import StatusChip from '../../components/data-display/StatusChip'
import DevicePicker from './VendorAuditDevicePicker'
import VendorAuditCategoryDrawer from './VendorAuditCategoryDrawer'
import DropdownManagerDialog from './dialogs/DropdownManagerDialog'
import { auditColors, auditLabels, comparable, deviceId, responseRows } from './vendorAuditData'
import type { AuditConfig, AuditDevice, AuditPage, AuditProduct, AuditStats, AuditStatus, AuditSubmit,
  AuditUser, AuditVendor, AuditWriteBody, AuditWriteResult, LastSyncInfo, LiveSearchResult } from './vendorAuditData'

interface VendorAuditTabProps { user: AuditUser; dropdownConfigs: AuditConfig[] }
const base = '/catalog/products/'
const panel = { p: 2, minWidth: 0, bgcolor: 'var(--bg-surface, var(--mui-palette-background-paper))', borderColor: 'var(--border, var(--mui-palette-divider))' }
// Shared presentation tokens for the audit workspace
const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: '12px' } }
const sectionSx = { p: 1.5, mb: 1.5, borderRadius: '12px', bgcolor: 'var(--bg-elevated, rgba(127,127,127,.08))', minWidth: 0 }
const sectionTitleSx = { display: 'flex', alignItems: 'center', gap: .75, fontWeight: 700, fontSize: 13, mb: 1 }
const wrapButtonSx = { whiteSpace: 'normal' }
// Desktop workspace: three equal-height panes that fill the screen; each pane body scrolls on its own
// and the page scrolls normally everywhere else (and continues once a pane reaches its end).
// 52px sticky app bar + 12px gap above, 24px below
const workspaceHeight = 'calc(100vh - 88px)'
const paneBodySx = { overflowY: { lg: 'auto' }, minHeight: 0, scrollbarWidth: 'thin', scrollbarGutter: 'stable',
  '&::-webkit-scrollbar': { width: 8 }, '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(127,127,127,.35)', borderRadius: 99 } }
const CHIP_PREVIEW = 12
const mutedTileBg = 'var(--bg-elevated, rgba(127,127,127,.08))'
const imageUrl = (value?: string) => {
  if (!value || typeof value !== 'string') return ''
  try { const url = new URL(getImageUrl(value)); return ['http:', 'https:'].includes(url.protocol) ? url.href : '' } catch { return '' }
}

export default function VendorAuditTab(props: VendorAuditTabProps) {
  // Match the server guard exactly; an internal-company label alone is insufficient.
  return props.user?.is_cixci_admin ? <AuditWorkspace {...props} />
    : <Alert severity="error">Vendor Audit requires CIXCI System Admin access.</Alert>
}

function AuditWorkspace({ user, dropdownConfigs }: VendorAuditTabProps) {
  const [params, setParams] = useSearchParams()
  const vendor = params.get('vendor') || ''
  const vendors = useQuery({ queryKey: ['vendor-audit-vendors', user.id], queryFn: async () =>
    responseRows<AuditVendor>((await api.get('/tenant/companies/', { params: { company_type: 'vendor', paginate: 'false' } })).data) })
  const changeVendor = (value: string) => {
    const next = new URLSearchParams(params)
    next.set('tab', 'vendor-audit')
    if (value) next.set('vendor', value); else next.delete('vendor')
    setParams(next, { replace: true })
  }
  const selector = <TextField select label="Vendor" value={vendor} onChange={event => changeVendor(event.target.value)}
    size="small" sx={{ width: { xs: '100%', sm: 220 }, ...fieldSx }} data-testid="audit-vendor-selector">
    <MenuItem value="">Select a vendor</MenuItem>
    {!!vendor && !(vendors.data || []).some(company => company.id === vendor) && <MenuItem value={vendor} disabled>{vendors.isLoading ? 'Loading vendor…' : 'Vendor unavailable'}</MenuItem>}
    {(vendors.data || []).map(company => <MenuItem key={company.id} value={company.id}>{company.display_name || company.name}</MenuItem>)}
  </TextField>
  return <Box data-testid="vendor-audit" sx={{ minWidth: 0 }}>
    {vendors.error && <Alert severity="error" sx={{ mb: 2 }}>{apiError(vendors.error)}</Alert>}
    {vendor ? <VendorWorkspace key={vendor} vendor={vendor} user={user} dropdownConfigs={dropdownConfigs} selector={selector} />
      : <Paper variant="outlined" sx={{ ...panel, py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, textAlign: 'center' }}>
        <Avatar sx={{ width: 56, height: 56, bgcolor: mutedTileBg, color: 'text.secondary' }}><StorefrontIcon /></Avatar>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: 15 }}>Choose a vendor to audit</Typography>
          <Typography variant="body2" color="text.secondary">Select a vendor to compare API observations with catalog products.</Typography>
        </Box>
        {selector}
        {vendors.isLoading && <CircularProgress size={22} />}
      </Paper>}
  </Box>
}

function VendorWorkspace({ vendor, user, dropdownConfigs, selector }: VendorAuditTabProps & { vendor: string; selector: ReactNode }) {
  const queryClient = useQueryClient()
  const { showSnackbar } = useSnackbar()
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 400)
  const [auditFilter, setAuditFilter] = useState<AuditStatus | 'all'>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [sortBy, setSortBy] = useState('-updated_at')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkDevices, setBulkDevices] = useState<AuditDevice[]>([])
  const [bulkType, setBulkType] = useState<'add' | 'replace'>('add')
  const resetFilters = () => { setPage(1); setSelectedId(null); setSelectedIds([]) }
  const stats = useQuery({ queryKey: ['vendor-audit-stats', user.id, vendor], queryFn: async () =>
    (await api.get<AuditStats>(base + 'vendor-audit-stats/', { params: { vendor } })).data })
  const products = useQuery({ queryKey: ['vendor-audit', user.id, vendor, brand, category, debouncedSearch, auditFilter, page, pageSize, sortBy],
    refetchOnWindowFocus: false,
    queryFn: async () => (await api.get<AuditPage>(base + 'vendor-audit/', { params: { vendor, brand: brand || undefined,
      product_category: category || undefined,
      search: debouncedSearch || undefined, audit_status: auditFilter === 'all' ? undefined : auditFilter, page, page_size: pageSize, ordering: sortBy } })).data })
  const rows = responseRows<AuditProduct>(products.data)
  const selected = rows.find(product => product.id === selectedId)
  const mutation = useMutation({
    mutationFn: ({ path, body, method = 'post' }: { path: string; body: AuditWriteBody; method?: 'post' | 'patch' }) => api[method]<AuditWriteResult>(path, body),
    onSuccess: async (response, variables) => {
      const failed = response.data.failures?.length || 0
      const protectedSelections = response.data.protected_device_ids?.length || response.data.results?.some(result => result.protected_device_ids?.length)
      const pendingSelections = response.data.pending_device_ids?.length || response.data.results?.some(result => result.pending_device_ids?.length)
      const additionalMatches = variables.body.update_type === 'replace' && response.data.device_count !== undefined
        && response.data.device_count !== variables.body.device_ids?.length
      if (failed) showSnackbar(`${failed} products could not be updated. Review the listed reasons.`, 'warning')
      else if (protectedSelections) showSnackbar('Admin exclusions or locked mappings were preserved. Review those selections.', 'warning')
      else if (pendingSelections) showSnackbar('Selections saved. Future-device mappings will become active when the devices launch.', 'info')
      else if (additionalMatches) showSnackbar('Explicit selections saved; additional category matches remain active.', 'info')
      else showSnackbar('Changes saved.', 'success')
      if (response.data.failures?.length) setBulkError(JSON.stringify(response.data.failures))
      else { setBulkOpen(false); setBulkError('') }
      setPage(1)
      setSelectedIds((response.data.failures || []).map(failure => failure.product_id))
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['vendor-audit'] }),
        queryClient.invalidateQueries({ queryKey: ['vendor-audit-stats'] }),
        ...['products', 'compatibility', 'my-projection', 'catalog-brand-options', 'vendor-catalog-items'].map(key => queryClient.invalidateQueries({ queryKey: [key] })),
      ])
    },
    onError: error => showSnackbar(apiError(error), 'error'),
  })
  const [bulkError, setBulkError] = useState('')
  const busy = mutation.isPending
  const submit: AuditSubmit = (path, body, method = 'post') => mutation.mutate({ path, body, method })
  const toggle = (id: string) => setSelectedIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])
  const allOnPage = !!rows.length && rows.every(product => selectedIds.includes(product.id))
  // Opening a product brings the three panes to the top of the screen so they can be worked without page scrolling
  const workspaceRef = useRef<HTMLDivElement>(null)
  const openProduct = (id: string) => {
    setSelectedId(id)
    if (window.matchMedia('(min-width: 1200px)').matches) workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const statTiles = stats.data ? ([['Total', stats.data.total, 'default'], ['New', stats.data.new_count || 0, 'info'], ['Active', stats.data.active, 'success'], ['Mapped', stats.data.mapped, 'success'],
    ['Unmapped', stats.data.unmapped, 'warning'], ['Review', stats.data.review_products, 'error'], ['No image', stats.data.no_image, 'warning']] as const) : []
  const hasCategories = !!stats.data?.category_counts?.length
  return <Box>
    {/* Toolbar: vendor, filters and vendor-level actions */}
    <Paper variant="outlined" sx={{ ...panel, mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
      {selector}
      <TextField select size="small" label="Brand" value={brand} disabled={busy} sx={{ minWidth: 150, flex: { xs: '1 1 100%', sm: '0 0 auto' }, ...fieldSx }}
        onChange={event => { setBrand(event.target.value); resetFilters() }}>
        <MenuItem value="">All brands</MenuItem>
        {(stats.data?.brands || []).map(item => <MenuItem key={item.brand_reference_id} value={item.brand_reference_id}>{item.brand_reference__name}</MenuItem>)}
      </TextField>
      <TextField select size="small" label="Category" value={category} disabled={busy} sx={{ minWidth: 150, flex: { xs: '1 1 100%', sm: '0 0 auto' }, ...fieldSx }}
        onChange={event => { setCategory(event.target.value); resetFilters() }}>
        <MenuItem value="">All categories</MenuItem>
        {(stats.data?.categories || []).map(cat => <MenuItem key={cat} value={cat}>{cat}</MenuItem>)}
      </TextField>
      <TextField label="Search products" size="small" value={search} disabled={busy} sx={{ flex: '1 1 180px', '& .MuiOutlinedInput-root': { borderRadius: '999px' } }}
        onChange={event => { setSearch(event.target.value); resetFilters() }} />
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <Button startIcon={<RefreshIcon sx={{ fontSize: 16 }} />} disabled={busy || products.isFetching} onClick={() => { void products.refetch(); void stats.refetch() }}>Refresh</Button>
        <ForceSyncButton vendor={vendor} busy={busy} />
        <ExportCsvButton rows={rows} disabled={busy} />
      </Stack>
    </Paper>

    {/* Vendor summary */}
    {stats.data && <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', lg: hasCategories ? 'minmax(0,1.35fr) minmax(0,1fr)' : 'minmax(0,1fr)' }, gap: 2, mb: 2 }}>
      <Paper variant="outlined" sx={panel} data-testid="audit-stats">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(auto-fit, minmax(86px, 1fr))', lg: 'repeat(7, minmax(0, 1fr))' }, gap: .75, mb: stats.data.last_sync ? 1.5 : 0 }}>
          {statTiles.map(([label, value, color]) =>
            <Box key={label} sx={{ px: .75, py: 1, borderRadius: '12px', minWidth: 0, bgcolor: mutedTileBg,
              border: 1, borderColor: 'transparent', cursor: label === 'New' && value ? 'pointer' : undefined,
              '&:hover': label === 'New' && value ? { borderColor: 'info.main' } : undefined }}
              onClick={() => { if (label === 'New' && value) { setAuditFilter('new'); resetFilters() } }}>
              <Stack direction="row" spacing={.5} sx={{ alignItems: 'center' }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, bgcolor: color === 'default' ? 'text.disabled' : `${color}.main` }} />
                <Typography variant="caption" color="text.secondary" noWrap sx={{ letterSpacing: '-0.01em' }}>{label}</Typography>
              </Stack>
              <Typography sx={{ fontWeight: 700, fontSize: 20, lineHeight: 1.25, fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
            </Box>)}
        </Box>
        {stats.data.last_sync && <LastSyncSummary lastSync={stats.data.last_sync} />}
      </Paper>
      {hasCategories && <Paper variant="outlined" sx={panel}>
        <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 1 }}>Products by Category</Typography>
        <Box sx={{ maxHeight: 132, overflowY: 'auto', pr: .5 }}>
          <CategoryBreakdown categoryCounts={stats.data.category_counts || []} total={stats.data.total} />
        </Box>
      </Paper>}
    </Box>}
    {!!stats.data?.unlinked_review_required && <Alert severity="info" sx={{ mb: 2, py: .25 }}>
      {stats.data.unlinked_review_required} source rows need review before a product can be created. Open API Import Review for those rows.
    </Alert>}
    {[stats.error, products.error].filter(Boolean).map((error, index) => <Alert key={index} severity="error" sx={{ mb: 1 }}>{apiError(error)}</Alert>)}
    {bulkError && <Alert severity="warning" onClose={() => setBulkError('')} sx={{ mb: 1, overflowWrap: 'anywhere' }}>{bulkError}</Alert>}

    {/* Audit status filter */}
    <Stack direction="row" spacing={1} useFlexGap sx={{ mb: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mr: .5 }}>Audit status</Typography>
      {(['all', 'new', 'review', 'no_devices', 'no_image', 'ok'] as const).map(value => <Chip key={value}
        label={value === 'all' ? 'All' : value === 'new' ? `New${stats.data?.new_count ? ` (${stats.data.new_count})` : ''}` : auditLabels[value]}
        color={value === 'all' ? 'default' : auditColors[value]}
        variant={auditFilter === value ? 'filled' : 'outlined'} disabled={busy}
        onClick={() => { setAuditFilter(value); resetFilters() }} sx={{ height: 28, px: .5 }} />)}
    </Stack>

    {/* Workspace: product list, comparison, actions */}
    <Box ref={workspaceRef} sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', lg: '320px minmax(0,1fr) 340px' }, gridTemplateRows: { lg: 'minmax(0,1fr)' },
      height: { lg: workspaceHeight }, minHeight: { lg: 520 }, gap: 2, alignItems: { xs: 'start', lg: 'stretch' }, mb: 2, scrollMarginTop: 64 }}>
      <Paper variant="outlined" sx={{ ...panel, p: 1.5, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Stack direction="row" sx={{ alignItems: 'center', mb: 1 }}><Checkbox checked={allOnPage} disabled={busy || !rows.length}
          indeterminate={!allOnPage && rows.some(product => selectedIds.includes(product.id))}
          slotProps={{ input: { 'aria-label': 'Select all products on this page' } }} onChange={() => setSelectedIds(current => allOnPage
            ? current.filter(id => !rows.some(product => product.id === id)) : [...new Set([...current, ...rows.map(product => product.id)])])} />
          <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 700 }}>Products ({products.data?.count || 0})</Typography>
          {products.isFetching && <CircularProgress size={16} />}</Stack>
        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
          <TextField select size="small" value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1) }} sx={{ flex: 1, ...fieldSx }} label="Sort">
            <MenuItem value="-updated_at">Newest</MenuItem>
            <MenuItem value="updated_at">Oldest</MenuItem>
            <MenuItem value="name">Name A-Z</MenuItem>
            <MenuItem value="-name">Name Z-A</MenuItem>
            <MenuItem value="sku">SKU A-Z</MenuItem>
            <MenuItem value="product_category">Category</MenuItem>
          </TextField>
          <TextField select size="small" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }} sx={{ width: 76, ...fieldSx }} label="Show">
            <MenuItem value={25}>25</MenuItem>
            <MenuItem value={50}>50</MenuItem>
            <MenuItem value={100}>100</MenuItem>
          </TextField>
        </Stack>
        <Box sx={{ ...paneBodySx, maxHeight: { xs: 380, lg: 'none' }, flex: { lg: 1 }, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: .5, pr: .25 }}>
          {!products.isLoading && !products.error && !rows.length && <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>No products match these filters.</Typography>}
          {rows.map(product => <Box key={product.id} data-testid="audit-product" sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, borderRadius: '12px', border: 1,
            borderColor: selectedId === product.id ? 'primary.main' : 'transparent', bgcolor: selectedId === product.id ? 'action.selected' : 'transparent',
            transition: 'background-color .15s, border-color .15s', '&:hover': { bgcolor: selectedId === product.id ? 'action.selected' : 'action.hover' } }}>
            <Checkbox checked={selectedIds.includes(product.id)} onChange={() => toggle(product.id)} disabled={busy} size="small"
              slotProps={{ input: { 'aria-label': `Select ${product.sku}` } }} />
            <Button color="inherit" disabled={busy} data-product-id={product.id} onClick={() => openProduct(product.id)}
              sx={{ justifyContent: 'start', textTransform: 'none', minWidth: 0, flex: 1, gap: 1, p: 1, pl: .5, borderRadius: '12px', whiteSpace: 'normal', '&:hover': { bgcolor: 'transparent' } }}>
              <Avatar variant="rounded" src={imageUrl(product.primary_image_url)} sx={{ width: 46, height: 46, borderRadius: '10px', bgcolor: mutedTileBg, color: 'text.secondary', '& img': { objectFit: 'contain' } }}>{product.name.slice(0, 1)}</Avatar>
              <Box sx={{ minWidth: 0, textAlign: 'left', flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: .75 }}><Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  bgcolor: product.audit_status === 'no_devices' ? '#eab308' : product.audit_status === 'no_image' ? 'warning.main' : auditColors[product.audit_status] + '.main' }} />
                  <Typography noWrap variant="body2" sx={{ fontWeight: 600 }}>{product.name}</Typography></Box>
                <Typography noWrap variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', display: 'block' }}>{product.sku}</Typography>
                <Stack direction="row" spacing={.5} sx={{ mt: .5, flexWrap: 'wrap', gap: .5 }}>
                  <Chip size="small" label={auditLabels[product.audit_status]} color={auditColors[product.audit_status]} sx={{ height: 20 }} />
                  {isNewProduct(product) && <Chip size="small" label="NEW" color="info" sx={{ fontWeight: 700, fontSize: 10, height: 20 }} />}
                  {product.product_category && <Chip size="small" label={product.product_category} variant="outlined" sx={{ maxWidth: 120, height: 20 }} />}
                </Stack>
              </Box>
            </Button>
          </Box>)}
        </Box>
        <Pagination size="small" count={Math.max(1, Math.ceil((products.data?.count || 0) / pageSize))} page={page}
          disabled={busy || products.isFetching} onChange={(_, next) => { setPage(next); setSelectedId(null) }} sx={{ mt: 1.5, display: 'flex', justifyContent: 'center' }} />
        {!!selectedIds.length && <Stack spacing={1} sx={{ ...sectionSx, mt: 1.5, mb: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedIds.length} selected</Typography>
          <Button variant="contained" disabled={busy || selectedIds.length > 50} onClick={() => { setBulkDevices([]); setBulkOpen(true) }}>Map Devices to Selected</Button>
          <Button variant="outlined" color="warning" disabled={busy || selectedIds.length > 200} onClick={() => submit(base + 'bulk-resolve-review/', { product_ids: selectedIds })}>Resolve Review for Selected</Button>
          {selectedIds.length > 50 && <Typography variant="caption">Device mapping supports up to 50 products per request.</Typography>}
        </Stack>}
      </Paper>
      {selected ? <>
        <Comparison product={selected} />
        <ProductActions key={selected.id + ':' + products.dataUpdatedAt} scope={user.id + ':' + vendor} product={selected} configs={dropdownConfigs} busy={busy} submit={submit} />
      </> : <Paper variant="outlined" sx={{ ...panel, gridColumn: { lg: 'span 2' }, py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, textAlign: 'center' }}>
        <Avatar sx={{ width: 56, height: 56, bgcolor: mutedTileBg, color: 'text.secondary' }}><CompareArrowsIcon /></Avatar>
        <Typography sx={{ fontWeight: 700, fontSize: 15 }}>Select a product to compare and review.</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
          Pick a product from the list to see the vendor API values next to the CIXCI catalog values, then fix its device mapping, category or color.
        </Typography>
      </Paper>}
    </Box>
    <LiveApiSearch vendor={vendor} />
    <Dialog open={bulkOpen} onClose={() => { if (!busy) setBulkOpen(false) }} fullWidth maxWidth="sm">
      <DialogTitle>Map Devices to Selected</DialogTitle>
      <DialogContent><Typography sx={{ mb: 2 }}>{selectedIds.length} products selected</Typography>
        {bulkError && <Alert severity="warning" sx={{ mb: 2, overflowWrap: 'anywhere' }}>{bulkError}</Alert>}
        <TextField select fullWidth size="small" label="Update type" value={bulkType} disabled={busy} sx={{ mb: 2 }}
          onChange={event => setBulkType(event.target.value as 'add' | 'replace')}>
          <MenuItem value="add">Add to current mappings</MenuItem><MenuItem value="replace">Replace explicit mappings</MenuItem>
        </TextField>
        <DevicePicker scope={user.id + ':' + vendor} value={bulkDevices} onChange={setBulkDevices} disabled={busy} />
      </DialogContent>
      <DialogActions><Button disabled={busy} onClick={() => setBulkOpen(false)}>Cancel</Button>
        <Button variant="contained" disabled={busy || !bulkDevices.length || !selectedIds.length} onClick={() => submit(base + 'bulk-map-devices/',
          { product_ids: selectedIds, device_ids: bulkDevices.map(deviceId), update_type: bulkType })}>Apply device mapping</Button></DialogActions>
    </Dialog>
  </Box>
}

function Images({ urls, size = 80 }: { urls: string[]; size?: number }) {
  const valid = urls.map(imageUrl).filter(Boolean)
  const [zoomed, setZoomed] = useState<string | null>(null)
  return valid.length ? <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
    {valid.slice(0, 6).map((url, i) =>
      <Tooltip key={url + i} title="Click to enlarge">
        <Box component="img" src={url} loading="lazy" onClick={() => setZoomed(zoomed === url ? null : url)}
          alt={`Product image ${i + 1}`} sx={{ width: size, height: size, objectFit: 'contain', border: 1,
            borderColor: 'divider', borderRadius: 1, cursor: 'pointer', transition: 'transform .2s', '&:hover': { transform: 'scale(1.1)' } }} />
      </Tooltip>)}
    {zoomed && <Dialog open onClose={() => setZoomed(null)} maxWidth="md">
      <Box component="img" src={zoomed} sx={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', p: 2 }} />
    </Dialog>}
  </Box> : <Typography variant="caption" color="text.secondary">No image</Typography>
}

// Device lists can run to 100+ models: show the count and scroll inside a fixed-height box
function DeviceChips({ names }: { names: string[] }) {
  const [expanded, setExpanded] = useState(false)
  if (!names.length) return null
  const visible = expanded ? names : names.slice(0, CHIP_PREVIEW)
  return <Box>
    {names.length > 6 && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: .5, fontWeight: 600 }}>{names.length} devices</Typography>}
    <Box>{visible.map((name, i) => <Chip key={name + i} label={name} size="small" sx={{ m: .25, maxWidth: '100%' }} />)}</Box>
    {names.length > CHIP_PREVIEW && <Button size="small" onClick={() => setExpanded(!expanded)} sx={{ mt: .5, px: 1, fontSize: 11 }}>
      {expanded ? 'Show fewer' : `Show all ${names.length}`}
    </Button>}
  </Box>
}

function Comparison({ product }: { product: AuditProduct }) {
  const [showRaw, setShowRaw] = useState(false)
  const raw = product.vendor_values || {}
  const vendorModels = (product.payload_devices || []).map(device => String(device.name || ''))
  const systemModels = (product.device_assertions || []).map(device => device.name)
  const money = (value: unknown) => value === null || value === undefined || value === '' ? 'Not supplied' : Number(value).toFixed(2)
  const fields: [string, unknown, unknown][] = [
    ['Name', raw.name, product.name], ['Category', product.payload_category, product.product_category],
    ['Devices', vendorModels, systemModels], ['Color', raw.color, product.system_color],
    ['Images', product.payload_images, product.primary_image_url ? [product.primary_image_url] : []],
    ['Brand', raw.brand, product.brand], ['MSRP', money(raw.msrp), money(product.msrp)],
    ['Wholesale', money(raw.vendor_wholesale_price_amount), money(product.vendor_wholesale_price_amount)],
    ['Inventory', raw.inventory_level, product.inventory_level],
    ['Weight', raw.weight, null], ['Length', raw.length, null], ['Width', raw.width, null], ['Height', raw.height, null],
    ['Status', null, product.status],
  ]
  const display = (value: unknown) => value === null || value === undefined || value === '' ? 'Not supplied' : String(value)
  const diffColor = (label: string, original: unknown, current: unknown) => {
    if (label === 'Status' || original === null || current === null) return undefined
    return comparable(original) === comparable(current) ? 'success' : 'error'
  }
  const payload = product.vendor_payload || {}
  const differences = fields.filter(([label, original, current]) => diffColor(label, original, current) === 'error').length
  return <Paper variant="outlined" sx={{ ...panel, p: 0, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }} data-testid="audit-comparison">
    <Stack direction="row" spacing={1.5} useFlexGap sx={{ alignItems: 'flex-start', flexWrap: 'wrap', p: 2, pb: 1.5, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
      <Avatar variant="rounded" src={imageUrl(product.primary_image_url)} sx={{ width: 56, height: 56, borderRadius: '12px', flexShrink: 0,
        bgcolor: mutedTileBg, color: 'text.secondary', '& img': { objectFit: 'contain' } }}>{product.name.slice(0, 1)}</Avatar>
      <Box sx={{ minWidth: 0, flex: '1 1 200px' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.3, overflowWrap: 'anywhere' }}>{product.name}</Typography>
          {isNewProduct(product) && <Chip size="small" label="NEW" color="info" sx={{ fontWeight: 700, fontSize: 10 }} />}
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', overflowWrap: 'anywhere' }}>{product.sku}</Typography>
        <Stack direction="row" spacing={.75} useFlexGap sx={{ flexWrap: 'wrap', mt: .75, alignItems: 'center' }}>
          <Chip size="small" label={product.product_category || 'No category'} variant="outlined" />
          <Chip size="small" label={auditLabels[product.audit_status]} color={auditColors[product.audit_status]} />
          <Chip size="small" variant="outlined" color={differences ? 'error' : 'success'}
            label={differences ? `${differences} field${differences === 1 ? '' : 's'} differ` : 'All compared fields match'} />
        </Stack>
      </Box>
      <Button size="small" variant={showRaw ? 'contained' : 'outlined'} onClick={() => setShowRaw(!showRaw)} sx={{ flexShrink: 0 }}>
        {showRaw ? 'Mapped View' : 'Full API Response'}
      </Button>
    </Stack>
    <Box sx={{ ...paneBodySx, p: 2, flex: { lg: 1 } }}>
    {!!product.review_errors?.length && <Alert severity="error" sx={{ mb: 2 }}>{product.review_errors.map((error, i) =>
      <Typography key={i} variant="body2">{error.code}{error.field ? ` — ${error.field}` : ''}{error.message ? `: ${error.message}` : ''}</Typography>)}</Alert>}
    {showRaw ? <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Raw Vendor API Payload</Typography>
      <TableContainer><Table size="small" aria-label="Full vendor API payload">
        <TableHead><TableRow><TableCell>Key</TableCell><TableCell>Value</TableCell></TableRow></TableHead>
        <TableBody>{Object.entries(payload).map(([key, value]) => <TableRow key={key}
          sx={{ '& td': { verticalAlign: 'top', overflowWrap: 'anywhere' } }}>
          <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>{key}</TableCell>
          <TableCell>{key === 'image_urls' || key === 'images' ? (Array.isArray(value) ? <Images urls={value as string[]} />
            : display(value)) : Array.isArray(value) ? value.map((item, i) => <Chip key={String(item) + i}
              label={typeof item === 'object' ? JSON.stringify(item) : String(item)} size="small" sx={{ m: .25, maxWidth: '100%' }} />)
            : typeof value === 'object' && value !== null
              ? <Box component="pre" sx={{ fontSize: 11, m: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{JSON.stringify(value, null, 2)}</Box>
              : <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{display(value)}</Typography>}</TableCell>
        </TableRow>)}</TableBody>
      </Table></TableContainer>
    </Box> : <TableContainer><Table size="small" aria-label="Vendor and system comparison" sx={{ tableLayout: 'fixed', minWidth: 420 }}>
      <TableHead><TableRow><TableCell sx={{ width: 96 }}>Field</TableCell><TableCell>Vendor API</TableCell><TableCell>CIXCI System</TableCell><TableCell sx={{ width: 28 }} /></TableRow></TableHead>
      <TableBody>{fields.map(([label, original, current]) => { const diff = diffColor(label as string, original, current); return <TableRow key={label as string}
        sx={theme => ({ bgcolor: diff === 'error' ? alpha(theme.palette.error.main, .07) : undefined,
          boxShadow: diff === 'error' ? `inset 3px 0 0 ${theme.palette.error.main}` : undefined,
          '& td': { verticalAlign: 'top', overflowWrap: 'anywhere' } })}>
        <TableCell sx={{ fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', overflowWrap: 'normal !important' }}>{label as string}</TableCell>
        <TableCell>{label === 'Images' ? <Images urls={product.payload_images || []} size={96} /> : label === 'Devices'
          ? <DeviceChips names={vendorModels} /> : display(original)}
          {label === 'Category' && <Typography variant="caption" sx={{ display: 'block' }}>Mapped category →</Typography>}</TableCell>
        <TableCell>{label === 'Images' ? <Images urls={product.primary_image_url ? [product.primary_image_url] : []} size={96} /> : label === 'Devices'
          ? <DeviceChips names={systemModels} />
          : label === 'Status' ? <StatusChip status={product.status} /> : current === null ? <Typography variant="caption" color="text.secondary">N/A</Typography> : display(current)}</TableCell>
        <TableCell sx={{ p: 0.5 }}>{diff === 'success' ? <Tooltip title="Values match"><CheckCircleIcon sx={{ fontSize: 16, color: 'success.main', display: 'block' }} /></Tooltip>
          : diff === 'error' ? <Tooltip title="Values differ"><ErrorIcon sx={{ fontSize: 16, color: 'error.main', display: 'block' }} /></Tooltip> : null}</TableCell>
      </TableRow> })}</TableBody>
    </Table></TableContainer>}
    </Box>
  </Paper>
}

function ProductActions({ scope, product, configs, busy, submit }: { scope: string; product: AuditProduct; configs: AuditConfig[]; busy: boolean;
  submit: AuditSubmit }) {
  const queryClient = useQueryClient()
  const { showSnackbar } = useSnackbar()
  const [devices, setDevices] = useState<AuditDevice[]>(product.device_assertions || [])
  const [category, setCategory] = useState(product.product_category || '')
  const [color, setColor] = useState(product.system_color || '')
  const [setupOpen, setSetupOpen] = useState(false)
  const [mappingRulesOpen, setMappingRulesOpen] = useState(false)
  const currentConfig = configs.find(item => item.field_name === 'product_category' && item.value === product.product_category)
  const manual = product.compatibility_mode === 'direct_device' && currentConfig?.status === 'active'
    && ['device_specific', 'explicit', 'hybrid'].includes(currentConfig.compatibility_mode || '')
  const approved = (field: string) => configs.filter(item => item.field_name === field && item.status === 'active').map(item => item.value as string)
  const categories = approved('product_category')
  const colors = approved('system_color')
  const refreshRules = () => {
    setMappingRulesOpen(false)
    showSnackbar('Category rules saved. Device selection follows the updated configuration.', 'success')
    void Promise.all(['dropdown-configs', 'compatibility-options', 'vendor-audit', 'vendor-audit-stats',
      'vendor-audit-product-detail', 'products', 'compatibility', 'my-projection'].map(key =>
      queryClient.invalidateQueries({ queryKey: [key] })))
  }
  return <Paper variant="outlined" sx={{ ...panel, ...paneBodySx, p: 1.5 }} data-testid="audit-actions">
    <Box sx={sectionSx}>
      <Typography sx={sectionTitleSx}><DevicesIcon sx={{ fontSize: 17, color: 'primary.main' }} />Device Mapping</Typography>
      {manual ? <DevicePicker scope={scope} value={devices} onChange={setDevices} disabled={busy} suggestions={product.payload_devices || []} />
        : <Alert severity="info" sx={{ py: .25 }}>{product.compatibility_mode === 'universal_device_type' ? 'This product uses Universal Device Types. Edit its compatibility setup to adjust the scope.'
          : 'Exact model mapping requires Device Specific or Hybrid category rules. Open compatibility setup to review fields or adjust Category Rules.'}</Alert>}
      {!manual && product.compatibility_mode === 'direct_device' && <Box sx={{ mt: 1 }}>
        <Button fullWidth variant="contained" disabled={busy || !currentConfig} onClick={() => setMappingRulesOpen(true)} sx={wrapButtonSx}>Configure manual mapping</Button>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: .5 }}>
          Open {product.product_category} category rules and choose Hybrid to enable model selection. Rule changes apply to all products in this category.
        </Typography>
      </Box>}
      {manual && <Button fullWidth variant="contained" sx={{ mt: 1.5, ...wrapButtonSx }} disabled={busy} onClick={() => submit(base + product.id + '/map-devices/',
        { device_ids: devices.map(deviceId), update_type: 'replace' })}>Save device mapping</Button>
      }
      <Button fullWidth variant="outlined" disabled={busy} sx={{ mt: 1, ...wrapButtonSx }} onClick={() => { setCategory(product.product_category); setSetupOpen(true) }}>Edit compatibility / Universal</Button>
    </Box>
    <Box sx={sectionSx}>
      <Typography sx={sectionTitleSx}><CategoryIcon sx={{ fontSize: 17, color: 'primary.main' }} />Category</Typography>
      <TextField select fullWidth label="Approved category" size="small" value={category} disabled={busy} sx={fieldSx}
        onChange={event => { setCategory(event.target.value); setSetupOpen(true) }}>
        {!categories.includes(category) && <MenuItem value={category} disabled>{category || 'Select category'}</MenuItem>}
        {categories.map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
      </TextField>
      <Button fullWidth variant="outlined" sx={{ mt: 1, ...wrapButtonSx }} disabled={busy || !category || !categories.includes(category)} onClick={() => setSetupOpen(true)}>Review category setup</Button>
    </Box>
    <Box sx={{ ...sectionSx, mb: product.audit_status === 'review' ? 1.5 : 0 }}>
      <Typography sx={sectionTitleSx}><PaletteIcon sx={{ fontSize: 17, color: 'primary.main' }} />Color Mapping</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>Vendor: {String(product.vendor_values?.color || 'Not supplied')}</Typography>
      <TextField select fullWidth label="System color" size="small" value={color} disabled={busy} sx={fieldSx} onChange={event => setColor(event.target.value)}>
        {!colors.includes(color) && <MenuItem value={color} disabled>{color || 'Select color'}</MenuItem>}
        {colors.map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
      </TextField>
      <Button fullWidth variant="outlined" sx={{ mt: 1 }} disabled={busy || !color || !colors.includes(color)} onClick={() => submit(base + product.id + '/',
        { system_color: color, system_colors: [color] }, 'patch')}>Save color</Button>
    </Box>
    {product.audit_status === 'review' && <Box sx={{ p: 1.5, border: 1, borderColor: 'error.main', borderRadius: '12px' }}>
      <Typography color="error" variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: .75, fontWeight: 700 }}><ErrorIcon sx={{ fontSize: 17 }} />Review Required</Typography>
      {product.review_errors.map((error, i) => <Typography key={i} variant="caption" sx={{ display: 'block', overflowWrap: 'anywhere' }}>{error.code}: {error.field}</Typography>)}
      <Button fullWidth variant="contained" color="warning" sx={{ mt: 1 }} disabled={busy} onClick={() => submit(base + product.id + '/resolve-review/', {})}>Resolve Review</Button>
    </Box>}
    {setupOpen && <VendorAuditCategoryDrawer product={product} category={category} configs={configs} scope={scope}
      onClose={() => { setSetupOpen(false); setCategory(product.product_category) }} />}
    {mappingRulesOpen && <DropdownManagerDialog open onClose={() => setMappingRulesOpen(false)} dropdownConfigs={configs}
      initialCategoryValue={product.product_category} onConfigChanged={refreshRules} />}
  </Paper>
}

const catColors = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#4f46e5', '#be185d', '#65a30d', '#ea580c']

function CategoryBreakdown({ categoryCounts, total }: { categoryCounts: { name: string; count: number }[]; total: number }) {
  if (!categoryCounts.length || !total) return null
  const maxCount = categoryCounts[0]?.count || 1
  return <Stack spacing={0.75}>{categoryCounts.slice(0, 10).map((cat, i) =>
    <Stack key={cat.name} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Tooltip title={cat.name}><Typography variant="caption" sx={{ width: 130, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</Typography></Tooltip>
      <LinearProgress variant="determinate" value={(cat.count / maxCount) * 100}
        sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { bgcolor: catColors[i % catColors.length], borderRadius: 3 } }} />
      <Typography variant="caption" sx={{ minWidth: 32, textAlign: 'right' }}>{cat.count}</Typography>
    </Stack>
  )}{categoryCounts.length > 10 && <Typography variant="caption" color="text.secondary">+{categoryCounts.length - 10} more</Typography>}
  </Stack>
}

const NEW_PRODUCT_DAYS = 7
function isNewProduct(product: AuditProduct): boolean {
  if (!product.created_at) return false
  const created = new Date(product.created_at).getTime()
  return Date.now() - created < NEW_PRODUCT_DAYS * 86_400_000
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function LastSyncSummary({ lastSync }: { lastSync: LastSyncInfo }) {
  if (!lastSync.completed_at) return null
  return <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', pt: 1.25, borderTop: 1, borderColor: 'divider' }}>
    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Last Sync:</Typography>
    <Chip size="small" label={`${lastSync.created_count} new`} color={lastSync.created_count > 0 ? 'info' : 'default'} variant="outlined" />
    <Chip size="small" label={`${lastSync.updated_count} updated`} variant="outlined" />
    <Chip size="small" label={`${lastSync.review_count} review`} color={lastSync.review_count > 0 ? 'warning' : 'default'} variant="outlined" />
    <Chip size="small" label={`${lastSync.rows_seen} rows`} variant="outlined" />
    <Typography variant="caption" color="text.secondary">{timeAgo(lastSync.completed_at)}</Typography>
  </Box>
}

function ExportCsvButton({ rows, disabled }: { rows: AuditProduct[]; disabled: boolean }) {
  const exportCsv = () => {
    if (!rows.length) return
    const headers = ['SKU', 'Name', 'Brand', 'Category', 'Status', 'Audit Status', 'New', 'Devices', 'MSRP', 'Wholesale', 'Created']
    const csvRows = rows.map(p => [p.sku, p.name, p.brand, p.product_category, p.status, p.audit_status,
      isNewProduct(p) ? 'Yes' : '', (p.device_assertions || []).map(d => d.name).join('; '), p.msrp, p.vendor_wholesale_price_amount,
      p.created_at ? new Date(p.created_at).toLocaleDateString() : ''])
    const csv = [headers, ...csvRows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `vendor-audit-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(a.href)
  }
  return <Button variant="outlined" startIcon={<FileDownloadIcon sx={{ fontSize: 16 }} />} disabled={disabled || !rows.length} onClick={exportCsv}>Export CSV</Button>
}

function ForceSyncButton({ vendor, busy }: { vendor: string; busy: boolean }) {
  const queryClient = useQueryClient()
  const { showSnackbar } = useSnackbar()
  const sync = useMutation({
    mutationFn: () => api.post(base + 'vendor-force-sync/', { vendor }),
    onSuccess: (response) => {
      showSnackbar(`Full sync started (run ${response.data.run_status}). Products will appear after sync completes.`, 'success')
      void queryClient.invalidateQueries({ queryKey: ['vendor-audit'] })
      void queryClient.invalidateQueries({ queryKey: ['vendor-audit-stats'] })
    },
    onError: error => showSnackbar(apiError(error), 'error'),
  })
  return <Button variant="outlined" color="warning" startIcon={<SyncIcon sx={{ fontSize: 16 }} />} disabled={busy || sync.isPending}
    onClick={() => sync.mutate()}>
    {sync.isPending ? 'Syncing…' : '100% Sync'}
  </Button>
}

function LiveApiSearch({ vendor }: { vendor: string }) {
  const queryClient = useQueryClient()
  const { showSnackbar } = useSnackbar()
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [results, setResults] = useState<LiveSearchResult[]>([])
  const [searchMeta, setSearchMeta] = useState<{ query?: string; total_returned?: number; error?: string } | null>(null)
  const [expandedPayload, setExpandedPayload] = useState<string | null>(null)
  const search = useMutation({
    mutationFn: (q: string) => api.get<{ results: LiveSearchResult[]; query: string; total_returned: number; error?: string }>(
      base + 'vendor-live-search/', { params: { vendor, q } }),
    onSuccess: (response) => { setResults(response.data.results || []); setSearchMeta(response.data) },
    onError: error => { setResults([]); setSearchMeta({ error: apiError(error) }) },
  })
  const syncProduct = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post(base + 'vendor-sync-product/', { vendor, payload }),
    onSuccess: (response) => {
      const d = response.data
      showSnackbar(`Synced: ${d.created} created, ${d.updated} updated, ${d.review} review`, 'success')
      void queryClient.invalidateQueries({ queryKey: ['vendor-audit'] })
      void queryClient.invalidateQueries({ queryKey: ['vendor-audit-stats'] })
      void queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: error => showSnackbar(apiError(error), 'error'),
  })
  const busy = search.isPending || syncProduct.isPending
  return <Paper variant="outlined" sx={{ ...panel, p: 0, mb: 2, overflow: 'hidden' }}>
    <Box component="button" type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}
      sx={{ all: 'unset', boxSizing: 'border-box', width: '100%', display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.25, cursor: 'pointer',
        '&:hover': { bgcolor: 'action.hover' }, '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: -2 } }}>
      <TravelExploreIcon sx={{ fontSize: 20, color: 'primary.main' }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 13 }}>Live API Search</Typography>
        <Typography variant="caption" color="text.secondary">Search the vendor API by SKU / UID and sync products that are missing from the system</Typography>
      </Box>
      <ExpandMoreIcon sx={{ color: 'text.secondary', transition: 'transform .2s', transform: expanded ? 'rotate(180deg)' : 'none' }} />
    </Box>
    {expanded && <Box sx={{ px: 2, pb: 2 }}>
      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
        <TextField size="small" label="Search vendor API (SKU / UID / name)" value={query} sx={{ flex: 1 }}
          disabled={busy} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && query.trim()) search.mutate(query.trim()) }} />
        <Button variant="contained" disabled={busy || !query.trim()} onClick={() => search.mutate(query.trim())}>
          {search.isPending ? <CircularProgress size={20} /> : 'Search'}
        </Button>
      </Stack>
      {searchMeta?.error && <Alert severity="error" sx={{ mb: 1 }}>{searchMeta.error}</Alert>}
      {searchMeta && !searchMeta.error && <Typography variant="caption" sx={{ mb: 1, display: 'block' }}>
        {results.length} results returned{searchMeta.total_returned !== undefined ? ` (of ${searchMeta.total_returned} from API)` : ''} for "{searchMeta.query}"
      </Typography>}
      {results.length > 0 && <TableContainer sx={{ maxHeight: 400 }}><Table size="small" stickyHeader>
        <TableHead><TableRow>
          <TableCell>SKU</TableCell><TableCell>Name</TableCell><TableCell>Brand</TableCell>
          <TableCell>Category</TableCell><TableCell>In System</TableCell><TableCell>Actions</TableCell>
        </TableRow></TableHead>
        <TableBody>{results.map((item, i) => <Fragment key={item.sku + i}><TableRow
          sx={{ bgcolor: item.in_system ? undefined : alpha('#eab308', .08) }}>
          <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{item.sku || item.external_id}</TableCell>
          <TableCell>{item.name}</TableCell><TableCell>{item.brand}</TableCell><TableCell>{item.category}</TableCell>
          <TableCell>{item.in_system ? <Chip label="Yes" color="success" size="small" /> : <Chip label="Missing" color="warning" size="small" />}</TableCell>
          <TableCell><Stack direction="row" spacing={.5}>
            {!item.in_system && <Button size="small" variant="contained" disabled={syncProduct.isPending}
              onClick={() => syncProduct.mutate(item.payload)}>Sync</Button>}
            <Button size="small" onClick={() => setExpandedPayload(expandedPayload === item.sku ? null : item.sku)}>
              {expandedPayload === item.sku ? 'Hide' : 'Payload'}</Button>
          </Stack></TableCell>
        </TableRow>
        {expandedPayload === item.sku && <TableRow><TableCell colSpan={6}>
          <Box component="pre" sx={{ fontSize: 11, m: 0, p: 1, maxHeight: 300, overflow: 'auto',
            bgcolor: 'action.hover', borderRadius: 1, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
            {JSON.stringify(item.payload, null, 2)}
          </Box>
        </TableCell></TableRow>}
        </Fragment>)}</TableBody>
      </Table></TableContainer>}
    </Box>}
  </Paper>
}
