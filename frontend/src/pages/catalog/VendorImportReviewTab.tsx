import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Checkbox, Chip, CircularProgress, FormControlLabel, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../../lib/apiClient'
import { apiError } from '../../hooks/useCompatibilityOptions'

const base = '/integration/vendor-catalog-connections/'
const list = (data: any) => data?.results || data || []
const issueLabels: Record<string, string> = {
  CATEGORY_MAPPING_REQUIRED: 'Map the supplier category to a CIXCI category',
  MSRP_REQUIRED: 'Verified MSRP missing', BRAND_RELATIONSHIP_REQUIRED: 'Approve the supplier/Brand relationship',
  MEDIA_REVIEW_REQUIRED: 'Canonical product images need review', COMPATIBILITY_REVIEW_REQUIRED: 'Compatibility declaration needs review',
}

export default function VendorImportReviewTab({ initialConnection = '', onEditProduct }: { initialConnection?: string; onEditProduct: (product: any) => void }) {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState(initialConnection)
  const [cursor, setCursor] = useState<string | null>(null)
  const [reviewOnly, setReviewOnly] = useState(false)
  const connections = useQuery({ queryKey: ['catalog-import-connections'],
    queryFn: async () => list((await api.get(base, { params: { paginate: 'false' } })).data), refetchInterval: 5000 })
  const vendors = useQuery({ queryKey: ['vendor-companies'],
    queryFn: async () => (await api.get('/tenant/companies/', { params: { company_type: 'vendor', paginate: 'false' } })).data })
  const available = (connections.data || []).filter((row: any) => !row.is_retired || row.id === initialConnection)
  const connection = selectedId ? available.find((row: any) => row.id === selectedId)
    : available.find((row: any) => row.last_run?.rows_seen > 0) || available[0]
  const id = connection?.id
  const run = connection?.last_run
  const vendorNames = useMemo(() => new Map<string, string>(list(vendors.data).map((vendor: any) => [vendor.id, vendor.display_name || vendor.name])), [vendors.data])
  const items = useQuery({ queryKey: ['vendor-catalog-items', id, cursor, reviewOnly], enabled: !!id,
    queryFn: async () => (await api.get(`${base}${id}/items/`, { params: { page_size: 25,
      ...(cursor ? { cursor } : {}), ...(reviewOnly ? { review_required: 'true' } : {}) } })).data })
  useEffect(() => {
    if (id) void queryClient.invalidateQueries({ queryKey: ['vendor-catalog-items', id] })
  }, [id, run?.id, run?.status, run?.page_index, queryClient])
  const rows = list(items.data)
  return <Box sx={{ minWidth: 0 }}>
    <Alert severity="info" sx={{ mb: 2 }}>API source rows are saved here even when required Product setup prevents creation. All Products contains canonical Product records. Review rows are not automatically published to Buyers.</Alert>
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2, alignItems: 'center' }}>
      <TextField select label="Imported supplier feed" value={id || ''} size="small" sx={{ minWidth: 260, maxWidth: '100%' }}
        onChange={event => { setSelectedId(event.target.value); setCursor(null) }}>
        {!id && <MenuItem value="">Select a feed</MenuItem>}
        {available.map((record: any) => <MenuItem key={record.id} value={record.id}>{vendorNames.get(record.vendor_company) || 'Vendor'} / {record.label}{record.is_retired ? ' (retired)' : ''}</MenuItem>)}
      </TextField>
      <FormControlLabel control={<Checkbox checked={reviewOnly} onChange={event => { setReviewOnly(event.target.checked); setCursor(null) }}/>} label="Needs review only"/>
      <Button disabled={!id || items.isFetching} onClick={() => { void connections.refetch(); void items.refetch() }}>Refresh saved rows</Button>
      {connection && <Button component={Link} to={`/settings/vendor-integrations/${connection.vendor_company}?connection=${id}&tab=review`}>Open API setup</Button>}
    </Box>
    {[connections.error, vendors.error, items.error].filter(Boolean).map((error, index) => <Alert key={index} severity="error" sx={{ mb: 1 }}>{apiError(error)}</Alert>)}
    {selectedId && connections.isSuccess && !connection && <Alert severity="warning">This connection is unavailable. Select an accessible active supplier feed.</Alert>}
    {run && <Typography variant="body2" sx={{ mb: 2 }}>Latest run: {run.status} · Rows processed: {run.rows_seen} · Products created in that run: {run.created_count} · Rows needing review: {run.review_count}</Typography>}
    {(connections.isLoading || items.isLoading && !!id) && <CircularProgress size={24}/>}
    {!connections.isLoading && !available.length && !connections.error && <Typography>No supplier API connections yet.</Typography>}
    {id && <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 600, overflowX: 'auto' }}>
      <Table size="small" stickyHeader aria-label="Imported API catalog rows" sx={{ minWidth: 1020, '& th': { bgcolor: 'background.paper' } }}>
        <TableHead><TableRow>{['Source product / SKU', 'Brand', 'Source wholesale / stock', 'Product setup', 'Review reasons', 'Action'].map(label => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
        <TableBody>{rows.map((row: any) => <TableRow key={row.id} data-source-id={row.id}>
          <TableCell sx={{ maxWidth: 280, overflowWrap: 'anywhere' }}><Typography variant="body2" sx={{ fontWeight: 600 }}>{row.source_summary?.name || row.external_id}</Typography><Typography variant="caption">{row.source_summary?.sku || row.external_id}</Typography></TableCell>
          <TableCell>{row.source_summary?.brand || 'Not supplied'}</TableCell>
          <TableCell>{row.source_summary?.vendor_wholesale_price_amount ?? 'Not supplied'} {row.source_summary?.vendor_wholesale_price_currency || ''}<Typography variant="caption" sx={{ display: 'block' }}>Stock: {row.source_summary?.inventory_level ?? 'Not supplied'}</Typography></TableCell>
          <TableCell><Chip size="small" label={row.product ? 'Product linked' : 'Product not created'} color={row.product ? 'default' : 'warning'}/><Typography variant="caption" sx={{ display: 'block' }}>{!row.is_listed ? 'No longer listed' : row.review_required ? 'Review required' : 'Source validated'}</Typography></TableCell>
          <TableCell sx={{ minWidth: 260 }}>{(row.review_errors || []).map((issue: any, index: number) => <Typography variant="body2" key={index}>{issueLabels[issue.code] || (issue.code === 'PRODUCT_VALIDATION_REQUIRED' ? `Required or invalid Product field: ${issue.field}` : `${issue.field}: ${issue.code}`)}</Typography>)}{!row.review_errors?.length && 'No source review issues.'}</TableCell>
          <TableCell>{row.product ? <Button size="small" onClick={() => onEditProduct({ id: row.product })}>Edit Product</Button> : <Button size="small" component={Link} to={`/settings/vendor-integrations/${connection.vendor_company}?connection=${id}&tab=config`}>Review setup</Button>}</TableCell>
        </TableRow>)}</TableBody>
      </Table>
    </TableContainer>}
    {id && !items.isFetching && !items.error && !rows.length && <Typography sx={{ my: 2 }}>No saved rows match this view.</Typography>}
    <Box sx={{ display: 'flex', gap: 1, mt: 2 }}><Button disabled={!cursor || items.isFetching} onClick={() => setCursor(null)}>First page</Button><Button disabled={!items.data?.next || items.isFetching} onClick={() => setCursor(new URL(items.data.next, location.origin).searchParams.get('cursor'))}>Next rows</Button></Box>
  </Box>
}
