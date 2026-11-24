import { Fragment, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { alpha } from '@mui/material/styles'
import { Alert, Avatar, Box, Button, Checkbox, Chip, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle, Divider, MenuItem, Pagination,
  Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography } from '@mui/material'
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
  AuditUser, AuditVendor, AuditWriteBody, AuditWriteResult, LiveSearchResult } from './vendorAuditData'

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
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 400)
  const [auditFilter, setAuditFilter] = useState<AuditStatus | 'all'>('all')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkDevices, setBulkDevices] = useState<AuditDevice[]>([])
  const [bulkType, setBulkType] = useState<'add' | 'replace'>('add')
  const resetFilters = () => { setPage(1); setSelectedId(null); setSelectedIds([]) }
  const stats = useQuery({ queryKey: ['vendor-audit-stats', user.id, vendor], queryFn: async () =>
    (await api.get<AuditStats>(base + 'vendor-audit-stats/', { params: { vendor } })).data })
  const products = useQuery({ queryKey: ['vendor-audit', user.id, vendor, brand, debouncedSearch, auditFilter, page],
    refetchOnWindowFocus: false,
    queryFn: async () => (await api.get<AuditPage>(base + 'vendor-audit/', { params: { vendor, brand: brand || undefined,
      search: debouncedSearch || undefined, audit_status: auditFilter === 'all' ? undefined : auditFilter, page, page_size: 25 } })).data })
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
      <TextField select size="small" label="Brand" value={brand} disabled={busy} sx={{ minWidth: 200 }}
        onChange={event => { setBrand(event.target.value); resetFilters() }}>
        <MenuItem value="">All brands</MenuItem>
        {(stats.data?.brands || []).map(item => <MenuItem key={item.brand_reference_id} value={item.brand_reference_id}>{item.brand_reference__name}</MenuItem>)}
      </TextField>
      <TextField label="Search products" size="small" value={search} disabled={busy} sx={{ flex: 1 }}
        onChange={event => { setSearch(event.target.value); resetFilters() }} />
      <Button disabled={busy || products.isFetching} onClick={() => { void products.refetch(); void stats.refetch() }}>Refresh</Button>
      <ForceSyncButton vendor={vendor} busy={busy} />
    </Stack>
    <Stack direction="row" spacing={1} useFlexGap sx={{ mb: 2, flexWrap: 'wrap' }}>
      {(['all', 'review', 'no_devices', 'no_image', 'ok'] as const).map(value => <Chip key={value}
        label={value === 'all' ? 'All' : auditLabels[value]} color={value === 'all' ? 'default' : auditColors[value]}
        variant={auditFilter === value ? 'filled' : 'outlined'} disabled={busy}
        onClick={() => { setAuditFilter(value); resetFilters() }} />)}
    </Stack>
    {stats.data && <Stack direction="row" spacing={2} useFlexGap sx={{ mb: 2, flexWrap: 'wrap' }} data-testid="audit-stats">
      {[['Total', stats.data.total], ['Active', stats.data.active], ['Mapped', stats.data.mapped],
        ['Unmapped', stats.data.unmapped], ['Review', stats.data.review_products], ['No image', stats.data.no_image]].map(([label, value]) =>
        <Typography key={label} variant="body2"><strong>{value}</strong> {label}</Typography>)}
    </Stack>}
    {!!stats.data?.unlinked_review_required && <Alert severity="info" sx={{ mb: 2 }}>
      {stats.data.unlinked_review_required} source rows need review before a product can be created. Open API Import Review for those rows.
    </Alert>}
    <LiveApiSearch vendor={vendor} />
    {[stats.error, products.error].filter(Boolean).map((error, index) => <Alert key={index} severity="error" sx={{ mb: 1 }}>{apiError(error)}</Alert>)}
    {bulkError && <Alert severity="warning" onClose={() => setBulkError('')} sx={{ mb: 1, overflowWrap: 'anywhere' }}>{bulkError}</Alert>}
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', lg: '300px minmax(0,1fr) 350px' }, gap: 2, alignItems: 'start' }}>
      <Paper variant="outlined" sx={panel}>
        <Stack direction="row" sx={{ alignItems: 'center' }}><Checkbox checked={allOnPage} disabled={busy || !rows.length}
          indeterminate={!allOnPage && rows.some(product => selectedIds.includes(product.id))}
          slotProps={{ input: { 'aria-label': 'Select all products on this page' } }} onChange={() => setSelectedIds(current => allOnPage
            ? current.filter(id => !rows.some(product => product.id === id)) : [...new Set([...current, ...rows.map(product => product.id)])])} />
          <Typography variant="subtitle2">Products ({products.data?.count || 0})</Typography></Stack>
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
                <Chip size="small" label={auditLabels[product.audit_status]} color={auditColors[product.audit_status]} sx={{ mt: .5 }} />
              </Box>
            </Button>
          </Box>)}
        </Box>
        <Pagination size="small" count={Math.max(1, Math.ceil((products.data?.count || 0) / 25))} page={page}
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

function Images({ urls }: { urls: string[] }) {
  const valid = urls.map(imageUrl).filter(Boolean)
  return valid.length ? <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>{valid.slice(0, 6).map((url, i) =>
    <Box key={url + i} component="a" href={url} target="_blank" rel="noopener noreferrer"><Box component="img" src={url} loading="lazy"
      alt={`Product image ${i + 1}`} sx={{ width: 64, height: 64, objectFit: 'contain', border: 1, borderColor: 'divider', borderRadius: 1 }} /></Box>)}</Box> : <>No image</>
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
  const payload = product.vendor_payload || {}
  return <Paper variant="outlined" sx={panel} data-testid="audit-comparison">
    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Typography variant="h6">{product.name}</Typography>
      <Button size="small" onClick={() => setShowRaw(!showRaw)}>{showRaw ? 'Mapped View' : 'Full API Response'}</Button>
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
      <TableHead><TableRow><TableCell>Field</TableCell><TableCell>Vendor API</TableCell><TableCell>CIXCI System</TableCell></TableRow></TableHead>
      <TableBody>{fields.map(([label, original, current]) => <TableRow key={label as string}
        sx={theme => ({ bgcolor: label !== 'Status' && original !== null && current !== null && comparable(original) !== comparable(current) ? alpha(theme.palette.warning.main, .12) : undefined,
          '& td': { verticalAlign: 'top', overflowWrap: 'anywhere' } })}>
        <TableCell>{label as string}</TableCell>
        <TableCell>{label === 'Images' ? <Images urls={product.payload_images || []} /> : label === 'Devices'
          ? vendorModels.map((name, i) => <Chip key={name + i} label={name} size="small" sx={{ m: .25 }} />) : display(original)}
          {label === 'Category' && <Typography variant="caption" sx={{ display: 'block' }}>Mapped category →</Typography>}</TableCell>
        <TableCell>{label === 'Images' ? <Images urls={product.primary_image_url ? [product.primary_image_url] : []} /> : label === 'Devices'
          ? systemModels.map((name, i) => <Chip key={name + i} label={name} size="small" sx={{ m: .25 }} />)
          : label === 'Status' ? <StatusChip status={product.status} /> : current === null ? <Typography variant="caption" color="text.secondary">N/A</Typography> : display(current)}</TableCell>
      </TableRow>)}</TableBody>
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
