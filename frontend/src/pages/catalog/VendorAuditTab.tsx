import { Fragment, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { alpha } from '@mui/material/styles'
import { Alert, Avatar, Box, Button, Checkbox, Chip, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle, Divider, LinearProgress, MenuItem, Pagination,
  Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Tooltip, Typography } from '@mui/material'
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
  return <Box data-testid="vendor-audit" sx={{ minWidth: 0 }}>
    <TextField select label="Vendor" value={vendor} onChange={event => changeVendor(event.target.value)}
      size="small" sx={{ width: { xs: '100%', sm: 320 }, mb: 2 }} data-testid="audit-vendor-selector">
      <MenuItem value="">Select a vendor</MenuItem>
      {!!vendor && !(vendors.data || []).some(company => company.id === vendor) && <MenuItem value={vendor} disabled>{vendors.isLoading ? 'Loading vendor…' : 'Vendor unavailable'}</MenuItem>}
      {(vendors.data || []).map(company => <MenuItem key={company.id} value={company.id}>{company.display_name || company.name}</MenuItem>)}
    </TextField>
    {vendors.error && <Alert severity="error">{apiError(vendors.error)}</Alert>}
    {vendors.isLoading && <CircularProgress size={24} />}
    {vendor ? <VendorWorkspace key={vendor} vendor={vendor} user={user} dropdownConfigs={dropdownConfigs} />
      : <Alert severity="info">Select a vendor to compare API observations with catalog products.</Alert>}
  </Box>
}

function VendorWorkspace({ vendor, user, dropdownConfigs }: VendorAuditTabProps & { vendor: string }) {
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
  return <Box>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
      <TextField select size="small" label="Brand" value={brand} disabled={busy} sx={{ minWidth: 180 }}
        onChange={event => { setBrand(event.target.value); resetFilters() }}>
        <MenuItem value="">All brands</MenuItem>
        {(stats.data?.brands || []).map(item => <MenuItem key={item.brand_reference_id} value={item.brand_reference_id}>{item.brand_reference__name}</MenuItem>)}
      </TextField>
      <TextField select size="small" label="Category" value={category} disabled={busy} sx={{ minWidth: 180 }}
        onChange={event => { setCategory(event.target.value); resetFilters() }}>
        <MenuItem value="">All categories</MenuItem>
        {(stats.data?.categories || []).map(cat => <MenuItem key={cat} value={cat}>{cat}</MenuItem>)}
      </TextField>
      <TextField label="Search products" size="small" value={search} disabled={busy} sx={{ flex: 1 }}
        onChange={event => { setSearch(event.target.value); resetFilters() }} />
      <Button disabled={busy || products.isFetching} onClick={() => { void products.refetch(); void stats.refetch() }}>Refresh</Button>
      <ForceSyncButton vendor={vendor} busy={busy} />
      <ExportCsvButton rows={rows} disabled={busy} />
    </Stack>
    <Stack direction="row" spacing={1} useFlexGap sx={{ mb: 2, flexWrap: 'wrap' }}>
      {(['all', 'new', 'review', 'no_devices', 'no_image', 'ok'] as const).map(value => <Chip key={value}
        label={value === 'all' ? 'All' : value === 'new' ? `New${stats.data?.new_count ? ` (${stats.data.new_count})` : ''}` : auditLabels[value]}
        color={value === 'all' ? 'default' : auditColors[value]}
        variant={auditFilter === value ? 'filled' : 'outlined'} disabled={busy}
        onClick={() => { setAuditFilter(value); resetFilters() }} />)}
    </Stack>
    {stats.data && <Paper variant="outlined" sx={{ p: 2, mb: 2 }} data-testid="audit-stats">
      <Stack direction="row" spacing={3} useFlexGap sx={{ flexWrap: 'wrap', mb: stats.data.categories?.length || stats.data.last_sync ? 2 : 0 }}>
        {([['Total', stats.data.total, 'default'], ['New', stats.data.new_count || 0, 'info'], ['Active', stats.data.active, 'success'], ['Mapped', stats.data.mapped, 'success'],
          ['Unmapped', stats.data.unmapped, 'warning'], ['Review', stats.data.review_products, 'error'], ['No image', stats.data.no_image, 'warning']] as const).map(([label, value, color]) =>
          <Box key={label} sx={{ textAlign: 'center', minWidth: 64, cursor: label === 'New' && value ? 'pointer' : undefined,
            borderRadius: 1, p: .5, '&:hover': label === 'New' && value ? { bgcolor: 'action.hover' } : undefined }}
            onClick={() => { if (label === 'New' && value) { setAuditFilter('new'); resetFilters() } }}>
            <Typography variant="h5" color={color === 'default' ? 'text.primary' : `${color}.main`} sx={{ fontWeight: 700 }}>{value}</Typography>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
          </Box>)}
      </Stack>
      {stats.data.last_sync && <LastSyncSummary lastSync={stats.data.last_sync} />}
      {!!stats.data.category_counts?.length && <Box>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>Products by Category</Typography>
        <CategoryBreakdown categoryCounts={stats.data.category_counts} total={stats.data.total} />
      </Box>}
    </Paper>}
    {!!stats.data?.unlinked_review_required && <Alert severity="info" sx={{ mb: 2 }}>
      {stats.data.unlinked_review_required} source rows need review before a product can be created. Open API Import Review for those rows.
    </Alert>}
    <LiveApiSearch vendor={vendor} />
    {[stats.error, products.error].filter(Boolean).map((error, index) => <Alert key={index} severity="error" sx={{ mb: 1 }}>{apiError(error)}</Alert>)}
    {bulkError && <Alert severity="warning" onClose={() => setBulkError('')} sx={{ mb: 1, overflowWrap: 'anywhere' }}>{bulkError}</Alert>}
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', lg: '300px minmax(0,1fr) 350px' }, gap: 2, alignItems: 'start' }}>
      <Paper variant="outlined" sx={panel}>
        <Stack direction="row" sx={{ alignItems: 'center', mb: 1 }}><Checkbox checked={allOnPage} disabled={busy || !rows.length}
          indeterminate={!allOnPage && rows.some(product => selectedIds.includes(product.id))}
          slotProps={{ input: { 'aria-label': 'Select all products on this page' } }} onChange={() => setSelectedIds(current => allOnPage
            ? current.filter(id => !rows.some(product => product.id === id)) : [...new Set([...current, ...rows.map(product => product.id)])])} />
          <Typography variant="subtitle2" sx={{ flex: 1 }}>Products ({products.data?.count || 0})</Typography></Stack>
        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
          <TextField select size="small" value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1) }} sx={{ flex: 1 }} label="Sort">
            <MenuItem value="-updated_at">Newest</MenuItem>
            <MenuItem value="updated_at">Oldest</MenuItem>
            <MenuItem value="name">Name A-Z</MenuItem>
            <MenuItem value="-name">Name Z-A</MenuItem>
            <MenuItem value="sku">SKU A-Z</MenuItem>
            <MenuItem value="product_category">Category</MenuItem>
          </TextField>
          <TextField select size="small" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }} sx={{ width: 72 }} label="Show">
            <MenuItem value={25}>25</MenuItem>
            <MenuItem value={50}>50</MenuItem>
            <MenuItem value={100}>100</MenuItem>
          </TextField>
        </Stack>
        {products.isFetching && <CircularProgress size={20} />}
        <Box sx={{ maxHeight: { xs: 380, lg: '65vh' }, overflowY: 'auto' }}>
          {!products.isLoading && !products.error && !rows.length && <Typography sx={{ p: 2 }}>No products match these filters.</Typography>}
          {rows.map(product => <Box key={product.id} data-testid="audit-product" sx={{ display: 'flex', borderBottom: 1,
            borderColor: 'divider', bgcolor: selectedId === product.id ? 'action.selected' : 'transparent', alignItems: 'center' }}>
            <Checkbox checked={selectedIds.includes(product.id)} onChange={() => toggle(product.id)} disabled={busy}
              slotProps={{ input: { 'aria-label': `Select ${product.sku}` } }} />
            <Button color="inherit" disabled={busy} data-product-id={product.id} onClick={() => setSelectedId(product.id)}
              sx={{ justifyContent: 'start', textTransform: 'none', minWidth: 0, flex: 1, gap: 1, p: 1 }}>
              <Avatar variant="rounded" src={imageUrl(product.primary_image_url)} sx={{ width: 50, height: 50 }}>{product.name.slice(0, 1)}</Avatar>
              <Box sx={{ minWidth: 0, textAlign: 'left', flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: .75 }}><Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  bgcolor: product.audit_status === 'no_devices' ? '#eab308' : product.audit_status === 'no_image' ? 'warning.main' : auditColors[product.audit_status] + '.main' }} />
                  <Typography noWrap variant="body2" sx={{ fontWeight: 600 }}>{product.name}</Typography></Box>
                <Typography noWrap variant="caption" sx={{ fontFamily: 'monospace', display: 'block' }}>{product.sku}</Typography>
                <Stack direction="row" spacing={.5} sx={{ mt: .5, flexWrap: 'wrap', gap: .5 }}>
                  <Chip size="small" label={auditLabels[product.audit_status]} color={auditColors[product.audit_status]} />
                  {isNewProduct(product) && <Chip size="small" label="NEW" color="info" sx={{ fontWeight: 700, fontSize: 10 }} />}
                  {product.product_category && <Chip size="small" label={product.product_category} variant="outlined" sx={{ maxWidth: 120 }} />}
                </Stack>
              </Box>
            </Button>
          </Box>)}
        </Box>
        <Pagination size="small" count={Math.max(1, Math.ceil((products.data?.count || 0) / pageSize))} page={page}
          disabled={busy || products.isFetching} onChange={(_, next) => { setPage(next); setSelectedId(null) }} sx={{ mt: 2 }} />
        {!!selectedIds.length && <Stack spacing={1} sx={{ mt: 2 }}>
          <Typography variant="body2">{selectedIds.length} selected</Typography>
          <Button variant="outlined" disabled={busy || selectedIds.length > 50} onClick={() => { setBulkDevices([]); setBulkOpen(true) }}>Map Devices to Selected</Button>
          <Button color="warning" disabled={busy || selectedIds.length > 200} onClick={() => submit(base + 'bulk-resolve-review/', { product_ids: selectedIds })}>Resolve Review for Selected</Button>
          {selectedIds.length > 50 && <Typography variant="caption">Device mapping supports up to 50 products per request.</Typography>}
        </Stack>}
      </Paper>
      {selected ? <>
        <Comparison product={selected} />
        <ProductActions key={selected.id + ':' + products.dataUpdatedAt} scope={user.id + ':' + vendor} product={selected} configs={dropdownConfigs} busy={busy} submit={submit} />
      </> : <Paper variant="outlined" sx={{ ...panel, gridColumn: { lg: 'span 2' } }}><Typography>Select a product to compare and review.</Typography></Paper>}
    </Box>
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
  return <Paper variant="outlined" sx={panel} data-testid="audit-comparison">
    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
      <Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{product.name}</Typography>
          {isNewProduct(product) && <Chip size="small" label="NEW" color="info" sx={{ fontWeight: 700, fontSize: 10 }} />}
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{product.sku}</Typography>
      </Box>
      <Stack direction="row" spacing={1}>
        <Chip size="small" label={product.product_category || 'No category'} variant="outlined" />
        <Button size="small" variant={showRaw ? 'contained' : 'outlined'} onClick={() => setShowRaw(!showRaw)}>
          {showRaw ? 'Mapped View' : 'Full API Response'}
        </Button>
      </Stack>
    </Stack>
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
    </Box> : <TableContainer><Table size="small" aria-label="Vendor and system comparison">
      <TableHead><TableRow><TableCell sx={{ width: 100 }}>Field</TableCell><TableCell>Vendor API</TableCell><TableCell>CIXCI System</TableCell><TableCell sx={{ width: 28 }} /></TableRow></TableHead>
      <TableBody>{fields.map(([label, original, current]) => { const diff = diffColor(label as string, original, current); return <TableRow key={label as string}
        sx={theme => ({ bgcolor: diff === 'error' ? alpha(theme.palette.error.main, .06) : diff === 'success' ? alpha(theme.palette.success.main, .04) : undefined,
          '& td': { verticalAlign: 'top', overflowWrap: 'anywhere' } })}>
        <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>{label as string}</TableCell>
        <TableCell>{label === 'Images' ? <Images urls={product.payload_images || []} size={96} /> : label === 'Devices'
          ? vendorModels.map((name, i) => <Chip key={name + i} label={name} size="small" sx={{ m: .25 }} />) : display(original)}
          {label === 'Category' && <Typography variant="caption" sx={{ display: 'block' }}>Mapped category →</Typography>}</TableCell>
        <TableCell>{label === 'Images' ? <Images urls={product.primary_image_url ? [product.primary_image_url] : []} size={96} /> : label === 'Devices'
          ? systemModels.map((name, i) => <Chip key={name + i} label={name} size="small" sx={{ m: .25 }} />)
          : label === 'Status' ? <StatusChip status={product.status} /> : current === null ? <Typography variant="caption" color="text.secondary">N/A</Typography> : display(current)}</TableCell>
        <TableCell sx={{ p: 0.5 }}>{diff === 'success' ? <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'success.main' }} />
          : diff === 'error' ? <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'error.main' }} /> : null}</TableCell>
      </TableRow> })}</TableBody>
    </Table></TableContainer>}
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
  return <Paper variant="outlined" sx={{ ...panel, position: { lg: 'sticky' }, top: 16 }} data-testid="audit-actions">
    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Device Mapping</Typography>
    {manual ? <DevicePicker scope={scope} value={devices} onChange={setDevices} disabled={busy} suggestions={product.payload_devices || []} />
      : <Alert severity="info">{product.compatibility_mode === 'universal_device_type' ? 'This product uses Universal Device Types. Edit its compatibility setup to adjust the scope.'
        : 'Exact model mapping requires Device Specific or Hybrid category rules. Open compatibility setup to review fields or adjust Category Rules.'}</Alert>}
    {!manual && product.compatibility_mode === 'direct_device' && <Box sx={{ mt: 1 }}>
      <Button fullWidth variant="contained" disabled={busy || !currentConfig} onClick={() => setMappingRulesOpen(true)}>Configure manual mapping</Button>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: .5 }}>
        Open {product.product_category} category rules and choose Hybrid to enable model selection. Rule changes apply to all products in this category.
      </Typography>
    </Box>}
    {manual && <Button fullWidth variant="contained" sx={{ mt: 2 }} disabled={busy} onClick={() => submit(base + product.id + '/map-devices/',
      { device_ids: devices.map(deviceId), update_type: 'replace' })}>Save device mapping</Button>
    }
    <Button fullWidth disabled={busy} onClick={() => { setCategory(product.product_category); setSetupOpen(true) }}>Edit compatibility / Universal</Button>
    <Divider sx={{ my: 2 }} />
    <Typography variant="subtitle1" sx={{ mb: 1 }}>Category</Typography>
    <TextField select fullWidth label="Approved category" size="small" value={category} disabled={busy}
      onChange={event => { setCategory(event.target.value); setSetupOpen(true) }}>
      {!categories.includes(category) && <MenuItem value={category} disabled>{category || 'Select category'}</MenuItem>}
      {categories.map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
    </TextField>
    <Button fullWidth disabled={busy || !category || !categories.includes(category)} onClick={() => setSetupOpen(true)}>Review category setup</Button>
    <Divider sx={{ my: 2 }} />
    <Typography variant="subtitle1">Color Mapping</Typography>
    <Typography variant="body2" sx={{ mb: 1 }}>Vendor: {String(product.vendor_values?.color || 'Not supplied')}</Typography>
    <TextField select fullWidth label="System color" size="small" value={color} disabled={busy} onChange={event => setColor(event.target.value)}>
      {!colors.includes(color) && <MenuItem value={color} disabled>{color || 'Select color'}</MenuItem>}
      {colors.map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
    </TextField>
    <Button fullWidth disabled={busy || !color || !colors.includes(color)} onClick={() => submit(base + product.id + '/',
      { system_color: color, system_colors: [color] }, 'patch')}>Save color</Button>
    {product.audit_status === 'review' && <Box sx={{ mt: 2, p: 1.5, border: 1, borderColor: 'error.main', borderRadius: 1 }}>
      <Typography color="error" variant="subtitle2">Review Required</Typography>
      {product.review_errors.map((error, i) => <Typography key={i} variant="caption" sx={{ display: 'block' }}>{error.code}: {error.field}</Typography>)}
      <Button fullWidth color="warning" disabled={busy} onClick={() => submit(base + product.id + '/resolve-review/', {})}>Resolve Review</Button>
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
  return <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', pt: 1, borderTop: 1, borderColor: 'divider' }}>
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
  return <Button variant="outlined" size="small" disabled={disabled || !rows.length} onClick={exportCsv}>Export CSV</Button>
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
  return <Button variant="outlined" color="warning" disabled={busy || sync.isPending}
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
  return <Paper variant="outlined" sx={{ ...panel, mb: 2 }}>
    <Button size="small" onClick={() => setExpanded(!expanded)} sx={{ mb: expanded ? 1 : 0 }}>
      {expanded ? '▾ Live API Search' : '▸ Live API Search — search vendor API by SKU/UID'}
    </Button>
    {expanded && <Box>
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
