import { Fragment, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, AlertTitle, Autocomplete, Box, Button, Chip, CircularProgress, Collapse, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
  ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CloseIcon from '@mui/icons-material/Close'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import LaptopIcon from '@mui/icons-material/LaptopMac'
import LinkIcon from '@mui/icons-material/Link'
import RestoreIcon from '@mui/icons-material/Restore'
import SmartphoneIcon from '@mui/icons-material/Smartphone'
import TabletIcon from '@mui/icons-material/Tablet'
import WatchIcon from '@mui/icons-material/Watch'
import api from '../../lib/apiClient'
import { formatDate } from '../../lib/formatters'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'

type Status = 'missing' | 'mapped' | 'dismissed'
interface Option { id: string; name: string }
interface DeviceTypeOption { id: string; code: string; name: string }
interface MissingDevice {
  id: string; vendor_device_name: string; status: Status; vendor_company_id: string; vendor_name: string
  product_count: number; first_seen_at: string; last_seen_at: string; resolved_at: string | null
  device: { id: string; name: string; device_type: string } | null
  suggested_manufacturer?: Option | null; suggested_device_type?: string; similar_devices?: Option[]
}
interface Listing {
  devices: MissingDevice[]; total: number; counts: Record<Status, number>; affected_products: number
  manufacturers: Option[]; device_types: DeviceTypeOption[]
}
interface Outcome {
  device_name: string; device_type: string; created: boolean; products_matched: number; reviews_cleared: number
  not_mapped: { reason: string; products: number }[]; vendor_device_name: string
}
interface AffectedProduct { id: string; sku: string; name: string; product_category: string; status: string; compatibility_status: string }
interface CatalogDevice { id: string; name: string; display_name?: string; manufacturer_name?: string }

const BASE = '/catalog/missing-devices/'
const STATUS_LABEL: Record<Status, string> = { missing: 'Missing', mapped: 'Resolved', dismissed: 'Dismissed' }
const typeIcon = (code?: string) => code === 'tablet' ? <TabletIcon fontSize="small" /> : code === 'smartwatch' ? <WatchIcon fontSize="small" />
  : code === 'laptop' ? <LaptopIcon fontSize="small" /> : <SmartphoneIcon fontSize="small" />
const failure = (error: unknown) => {
  const data = (error as { response?: { data?: Record<string, unknown> } })?.response?.data
  return String(data?.error || data?.detail || 'The request could not be completed.')
}
// "Acme ProBook 14" with manufacturer Acme is stored as device name "ProBook 14".
const withoutManufacturer = (name: string, manufacturer?: string) => {
  const text = name.trim()
  return manufacturer && text.toLowerCase().startsWith(manufacturer.toLowerCase() + ' ') ? text.slice(manufacturer.length).trim() : text
}

export default function MissingDevicesTab() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<Status>('missing')
  const [search, setSearch] = useState('')
  const [vendor, setVendor] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [adding, setAdding] = useState<MissingDevice | null>(null)
  const [linking, setLinking] = useState<{ row: MissingDevice; device?: Option } | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [error, setError] = useState('')
  const debounced = useDebouncedValue(search, 300)
  const listing = useQuery({ queryKey: ['missing-devices', status, debounced], refetchInterval: 120000, placeholderData: previous => previous,
    queryFn: async () => (await api.get<Listing>(BASE, { params: { status, search: debounced || undefined } })).data })

  const refresh = () => Promise.all(['missing-devices', 'missing-device-products', 'import-alerts', 'import-alerts-count', 'vendor-audit',
    'vendor-audit-stats', 'products'].map(key => queryClient.invalidateQueries({ queryKey: [key] })))
  const act = useMutation({
    mutationFn: async (request: { path: string; body: Record<string, unknown>; row: MissingDevice }) =>
      ({ data: (await api.post(BASE + request.path, request.body)).data, request }),
    onSuccess: ({ data, request }) => {
      setError('')
      if (request.path === 'add_device/' || request.path === 'link_device/') setOutcome({ ...data, vendor_device_name: request.row.vendor_device_name })
      setAdding(null); setLinking(null)
      void refresh()
    },
    onError: failure_ => setError(failure(failure_)),
  })

  if (listing.isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
  if (listing.error || !listing.data) return <Alert severity="error">{failure(listing.error)}</Alert>
  const data = listing.data
  const vendors = [...new Map(data.devices.map(row => [row.vendor_company_id, row.vendor_name || 'Vendor'])).entries()]
  const rows = data.devices.filter(row => !vendor || row.vendor_company_id === vendor)
  const busy = act.isPending
  const tile = (label: string, value: number, color: string, hint: string) => <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
    <Typography sx={{ fontSize: 24, fontWeight: 700, color, lineHeight: 1.1 }}>{value}</Typography>
    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{label}</Typography>
    <Typography variant="caption" color="text.secondary">{hint}</Typography>
  </Paper>

  return <Box data-testid="missing-devices">
    <Box sx={{ mb: 2 }}>
      <Typography variant="h6">Missing Devices</Typography>
      <Typography variant="body2" color="text.secondary">
        A vendor named these device models, but they are not in the Device Catalog. Nothing is created automatically. Add the device with its
        correct type, or link the name to a device that already exists. Every product that named it is then mapped for you.
      </Typography>
    </Box>

    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 1.5, mb: 2 }}>
      {tile('Missing device names', data.counts.missing, data.counts.missing ? 'error.main' : 'success.main', 'Need your decision')}
      {tile('Products waiting', status === 'missing' ? data.affected_products : 0, 'warning.main', 'Named a missing device')}
      {tile('Resolved', data.counts.mapped, 'success.main', 'Added or linked')}
      {tile('Dismissed', data.counts.dismissed, 'text.secondary', 'Not a real device')}
    </Box>

    {outcome && <Alert severity={outcome.not_mapped.length ? 'warning' : 'success'} sx={{ mb: 2 }} onClose={() => setOutcome(null)} data-testid="missing-device-outcome">
      <AlertTitle>“{outcome.vendor_device_name}” is now {outcome.device_name} ({outcome.device_type}){outcome.created ? ' — new device created' : ''}</AlertTitle>
      {outcome.products_matched} product{outcome.products_matched === 1 ? '' : 's'} mapped
      {outcome.reviews_cleared ? ` · ${outcome.reviews_cleared} review flag${outcome.reviews_cleared === 1 ? '' : 's'} cleared` : ''}.
      Later vendor syncs will keep using this decision.
      {outcome.not_mapped.map(item => <Typography key={item.reason} variant="body2" sx={{ mt: .5 }}>
        <b>{item.products} product{item.products === 1 ? '' : 's'} not mapped:</b> {item.reason}</Typography>)}
    </Alert>}
    {error && !adding && !linking && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2, alignItems: { md: 'center' } }}>
      <ToggleButtonGroup size="small" exclusive value={status} onChange={(_, value) => { if (value) { setStatus(value); setExpanded(null); setVendor('') } }}>
        {(['missing', 'mapped', 'dismissed'] as Status[]).map(value => <ToggleButton key={value} value={value} sx={{ textTransform: 'none', px: 2 }}>
          {STATUS_LABEL[value]} ({data.counts[value]})</ToggleButton>)}
      </ToggleButtonGroup>
      <TextField size="small" placeholder="Search the vendor's device name" value={search} onChange={event => setSearch(event.target.value)} sx={{ width: { xs: '100%', md: 300 } }} />
      {vendors.length > 1 && <TextField select size="small" label="Vendor" value={vendor} onChange={event => setVendor(event.target.value)} sx={{ minWidth: 200 }}>
        <MenuItem value="">All vendors</MenuItem>
        {vendors.map(([id, name]) => <MenuItem key={id} value={id}>{name}</MenuItem>)}
      </TextField>}
    </Stack>

    {!rows.length ? <Alert severity={status === 'missing' ? 'success' : 'info'} icon={status === 'missing' ? <CheckCircleIcon /> : undefined}>
      {status === 'missing' ? 'Every device name your vendors use is matched to the Device Catalog.' : `Nothing ${STATUS_LABEL[status].toLowerCase()} yet.`}
    </Alert> : <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
      <Table size="small" aria-label="Vendor device names">
        <TableHead><TableRow>
          <TableCell>Vendor's device name</TableCell><TableCell>Vendor</TableCell><TableCell align="center">Products</TableCell>
          <TableCell>{status === 'missing' ? 'Looks like' : status === 'mapped' ? 'Catalog device' : 'Dismissed'}</TableCell>
          <TableCell>Last seen</TableCell><TableCell align="right">Actions</TableCell>
        </TableRow></TableHead>
        <TableBody>{rows.map(row => <Fragment key={row.id}>
          <TableRow hover data-testid="missing-device-row">
            <TableCell sx={{ minWidth: 180 }}><Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: 'break-word' }}>{row.vendor_device_name}</Typography></TableCell>
            <TableCell><Typography variant="body2" color="text.secondary">{row.vendor_name || '—'}</Typography></TableCell>
            <TableCell align="center">
              <Tooltip title="Show the products that named this device">
                <Chip size="small" clickable color={row.product_count ? 'warning' : 'default'} variant="outlined" label={row.product_count}
                  onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                  deleteIcon={<ExpandMoreIcon sx={{ transform: expanded === row.id ? 'rotate(180deg)' : 'none' }} />} onDelete={() => setExpanded(expanded === row.id ? null : row.id)} />
              </Tooltip>
            </TableCell>
            <TableCell>
              {status === 'missing' && <Stack spacing={.5}>
                <Stack direction="row" spacing={.75} sx={{ alignItems: 'center' }}>
                  {typeIcon(row.suggested_device_type)}
                  <Typography variant="body2">{data.device_types.find(type => type.code === row.suggested_device_type)?.name || 'Choose a type'}
                    {row.suggested_manufacturer ? ` · ${row.suggested_manufacturer.name}` : ''}</Typography>
                </Stack>
                {!!row.similar_devices?.length && <Stack direction="row" spacing={.5} sx={{ flexWrap: 'wrap', rowGap: .5, alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">Already in catalog?</Typography>
                  {row.similar_devices.map(device => <Chip key={device.id} size="small" icon={<LinkIcon />} label={device.name} disabled={busy}
                    onClick={() => { setError(''); setLinking({ row, device }) }} />)}
                </Stack>}
              </Stack>}
              {status === 'mapped' && <Typography variant="body2">{row.device ? `${row.device.name} · ${row.device.device_type}` : '—'}</Typography>}
              {status === 'dismissed' && <Typography variant="body2" color="text.secondary">Ignored by vendor syncs</Typography>}
            </TableCell>
            <TableCell><Typography variant="body2" color="text.secondary">{formatDate(row.last_seen_at)}</Typography></TableCell>
            <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
              {status === 'missing' ? <>
                <Button size="small" variant="contained" startIcon={<AddIcon />} disabled={busy} onClick={() => { setError(''); setAdding(row) }} sx={{ mr: 1 }}>Add device</Button>
                <Button size="small" variant="outlined" startIcon={<LinkIcon />} disabled={busy} onClick={() => { setError(''); setLinking({ row }) }} sx={{ mr: .5 }}>Link existing</Button>
                <Tooltip title="Not a real device: hide it and let syncs ignore it">
                  <IconButton size="small" aria-label={`Dismiss ${row.vendor_device_name}`} disabled={busy}
                    onClick={() => act.mutate({ path: 'dismiss_device/', body: { mapping_id: row.id }, row })}><CloseIcon fontSize="small" /></IconButton>
                </Tooltip>
              </> : <Button size="small" startIcon={<RestoreIcon />} disabled={busy}
                onClick={() => act.mutate({ path: 'restore_device/', body: { mapping_id: row.id }, row })}>
                {status === 'mapped' ? 'Undo' : 'Restore'}</Button>}
            </TableCell>
          </TableRow>
          <TableRow><TableCell colSpan={6} sx={{ py: 0, borderBottom: expanded === row.id ? undefined : 'none' }}>
            <Collapse in={expanded === row.id} unmountOnExit><AffectedProducts id={row.id} /></Collapse>
          </TableCell></TableRow>
        </Fragment>)}</TableBody>
      </Table>
    </TableContainer>}

    {adding && <AddDeviceDialog key={adding.id} row={adding} listing={data} busy={busy} error={error} onClose={() => { setAdding(null); setError('') }}
      onSubmit={body => act.mutate({ path: 'add_device/', body: { mapping_id: adding.id, ...body }, row: adding })} />}
    {linking && <LinkDeviceDialog key={linking.row.id + (linking.device?.id || '')} row={linking.row} preset={linking.device} busy={busy} error={error}
      onClose={() => { setLinking(null); setError('') }}
      onSubmit={deviceId => act.mutate({ path: 'link_device/', body: { mapping_id: linking.row.id, device_id: deviceId }, row: linking.row })} />}
  </Box>
}

function AffectedProducts({ id }: { id: string }) {
  const products = useQuery({ queryKey: ['missing-device-products', id],
    queryFn: async () => (await api.get<{ count: number; products: AffectedProduct[] }>(`${BASE}${id}/products/`)).data })
  if (products.isLoading) return <Box sx={{ py: 1.5 }}><CircularProgress size={18} /></Box>
  if (!products.data?.count) return <Typography variant="body2" color="text.secondary" sx={{ py: 1.5 }}>No product currently names this device.</Typography>
  return <Box sx={{ py: 1.5 }}>
    <Typography variant="caption" color="text.secondary">
      {products.data.count} product{products.data.count === 1 ? '' : 's'} named this device{products.data.count > products.data.products.length ? ` (first ${products.data.products.length} shown)` : ''}
    </Typography>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: .5, mt: .5 }}>
      {products.data.products.map(product => <Typography key={product.id} variant="body2" sx={{ overflowWrap: 'anywhere' }}>
        <Box component="span" sx={{ fontFamily: 'monospace', fontSize: 12, mr: 1 }}>{product.sku}</Box>{product.name}
        <Box component="span" sx={{ color: 'text.secondary' }}> · {product.product_category || 'No category'}</Box>
      </Typography>)}
    </Box>
  </Box>
}

function AddDeviceDialog({ row, listing, busy, error, onClose, onSubmit }: { row: MissingDevice; listing: Listing; busy: boolean; error: string
  onClose: () => void; onSubmit: (body: Record<string, unknown>) => void }) {
  const [manufacturer, setManufacturer] = useState<Option | string | null>(row.suggested_manufacturer || null)
  const manufacturerName = typeof manufacturer === 'string' ? manufacturer.trim() : manufacturer?.name || ''
  const [name, setName] = useState(withoutManufacturer(row.vendor_device_name, row.suggested_manufacturer?.name))
  const [type, setType] = useState(listing.device_types.some(item => item.code === row.suggested_device_type) ? row.suggested_device_type! : '')
  const existing = typeof manufacturer === 'string' ? listing.manufacturers.find(item => item.name.toLowerCase() === manufacturerName.toLowerCase()) : manufacturer
  const typeName = listing.device_types.find(item => item.code === type)?.name
  const ready = !!manufacturerName && !!name.trim() && !!type
  return <Dialog open onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
    <DialogTitle>Add device to the catalog</DialogTitle>
    <DialogContent>
      <Stack spacing={2} sx={{ mt: .5 }}>
        <Alert severity="info" icon={false}>
          Vendor <b>{row.vendor_name || 'unknown'}</b> wrote: <b>{row.vendor_device_name}</b>
          <br />{row.product_count} product{row.product_count === 1 ? '' : 's'} named it and will be mapped after you save.
        </Alert>
        {error && <Alert severity="error">{error}</Alert>}
        <Autocomplete freeSolo options={listing.manufacturers} value={manufacturer} disabled={busy}
          getOptionLabel={option => typeof option === 'string' ? option : option.name}
          onChange={(_, value) => { setManufacturer(value); if (value && typeof value !== 'string') setName(withoutManufacturer(row.vendor_device_name, value.name)) }}
          onInputChange={(_, value, reason) => { if (reason === 'input') setManufacturer(value) }}
          renderInput={params => <TextField {...params} label="Manufacturer" required
            helperText={manufacturerName && !existing ? `“${manufacturerName}” is new and will be added as a manufacturer.` : 'Pick one, or type a new manufacturer'} />} />
        <TextField label="Device name" value={name} required disabled={busy} onChange={event => setName(event.target.value)}
          helperText="The model only, without the manufacturer, e.g. Galaxy A57 5G" />
        <TextField select label="Device type" value={type} required disabled={busy} onChange={event => setType(event.target.value)}
          helperText="Only Active device types are listed. Check this: the suggestion is a guess from the name.">
          {listing.device_types.map(item => <MenuItem key={item.code} value={item.code}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>{typeIcon(item.code)}<span>{item.name}</span></Stack></MenuItem>)}
        </TextField>
        {ready && <Typography variant="body2" color="text.secondary">Will be saved as <b>{manufacturerName} {name.trim()}</b> · {typeName}</Typography>}
      </Stack>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} disabled={busy}>Cancel</Button>
      <Button variant="contained" disabled={busy || !ready} startIcon={busy ? <CircularProgress size={16} /> : <AddIcon />}
        onClick={() => onSubmit({ device_name: name.trim(), device_type_code: type,
          ...(existing ? { manufacturer_id: existing.id } : { manufacturer_name: manufacturerName }) })}>
        {busy ? 'Adding…' : 'Add device and map products'}</Button>
    </DialogActions>
  </Dialog>
}

function LinkDeviceDialog({ row, preset, busy, error, onClose, onSubmit }: { row: MissingDevice; preset?: Option; busy: boolean; error: string
  onClose: () => void; onSubmit: (deviceId: string) => void }) {
  const [search, setSearch] = useState('')
  const [device, setDevice] = useState<Option | null>(preset || null)
  const debounced = useDebouncedValue(search, 300)
  const options = useQuery({ queryKey: ['missing-device-link-options', debounced], enabled: !preset || !!search, queryFn: async () => {
    const data = (await api.get('/devices/devices/', { params: { search: debounced || undefined, page_size: 50 } })).data
    const rows: CatalogDevice[] = Array.isArray(data) ? data : data.results || []
    return rows.map(item => ({ id: item.id, name: item.display_name || [item.manufacturer_name, item.name].filter(Boolean).join(' ') }))
  } })
  return <Dialog open onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
    <DialogTitle>Link to an existing device</DialogTitle>
    <DialogContent>
      <Stack spacing={2} sx={{ mt: .5 }}>
        <Alert severity="info" icon={false}>
          Use this when <b>{row.vendor_device_name}</b> is just another spelling of a device that is already in the catalog.
          No device is created; {row.product_count} product{row.product_count === 1 ? '' : 's'} will be mapped to the one you choose.
        </Alert>
        {error && <Alert severity="error">{error}</Alert>}
        <Autocomplete options={options.data || (preset ? [preset] : [])} value={device} loading={options.isFetching} disabled={busy}
          getOptionLabel={option => option.name} isOptionEqualToValue={(a, b) => a.id === b.id} filterOptions={items => items}
          onInputChange={(_, value, reason) => { if (reason === 'input') setSearch(value) }} onChange={(_, value) => setDevice(value)}
          renderInput={params => <TextField {...params} label="Catalog device" placeholder="Search by model or manufacturer" />} />
      </Stack>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} disabled={busy}>Cancel</Button>
      <Button variant="contained" disabled={busy || !device} startIcon={busy ? <CircularProgress size={16} /> : <LinkIcon />}
        onClick={() => device && onSubmit(device.id)}>{busy ? 'Linking…' : 'Link and map products'}</Button>
    </DialogActions>
  </Dialog>
}
