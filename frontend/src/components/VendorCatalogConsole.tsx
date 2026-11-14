import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Paper, Tab, Tabs, TextField, Typography } from '@mui/material'
import api from '../lib/apiClient'
import { apiError } from '../hooks/useCompatibilityOptions'
import VendorCatalogConfigEditor from './VendorCatalogConfigEditor'
import { Link } from 'react-router-dom'

const base = '/integration/vendor-catalog-connections/'
const list = (value: any) => value?.results || value || []
const savedMode = (company: any) => { try { return JSON.parse(company.external_id || '{}')?.integration_mode } catch { return '' } }
const cursor = (next: string | null) => next ? new URL(next, location.origin).searchParams.get('cursor') : null

export default function VendorCatalogConsole({ company, initialTab = 'config', initialConnection = '' }: { company: any; initialTab?: string; initialConnection?: string }) {
  const queryClient = useQueryClient()
  const enabled = savedMode(company) === 'api'
  const [tab, setTab] = useState(enabled && ['config', 'brands', 'review', 'history'].includes(initialTab) ? initialTab : 'brands')
  const initialApplied = useRef(false)
  const [id, setId] = useState('')
  const [label, setLabel] = useState('')
  const [endpoint, setEndpoint] = useState('')
  const [authType, setAuthType] = useState('bearer')
  const [authHeader, setAuthHeader] = useState('X-API-Key')
  const [secret, setSecret] = useState('')
  const [username, setUsername] = useState('')
  const [loadedVersion, setLoadedVersion] = useState('')
  const [template, setTemplate] = useState('generic')
  const [config, setConfig] = useState('{}')
  const [weekly, setWeekly] = useState(true)
  const [retired, setRetired] = useState(false)
  const [showRetired, setShowRetired] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [probe, setProbe] = useState<any>(null)
  const [itemCursor, setItemCursor] = useState<string | null>(null)
  const [runCursor, setRunCursor] = useState<string | null>(null)
  const [brandName, setBrandName] = useState('')
  const [brandId, setBrandId] = useState('')
  const [relationship, setRelationship] = useState('owned')
  const [inspected, setInspected] = useState<any>(null)
  const metadata = useQuery({ queryKey: ['vendor-catalog-template', template], enabled,
    queryFn: async () => (await api.get(`${base}template/`, { params: { provider: template } })).data })
  const connections = useQuery({ queryKey: ['vendor-catalog-connections', company.id], enabled,
    queryFn: async () => list((await api.get(base, { params: { vendor_company: company.id, paginate: 'false' } })).data),
    refetchInterval: enabled ? 5000 : false })
  const selected = connections.data?.find((row: any) => row.id === id)
  const lastRun = selected?.last_run
  const syncActive = ['queued', 'running', 'retrying'].includes(lastRun?.status)
  const items = useQuery({ queryKey: ['vendor-catalog-items', id, itemCursor], enabled: !!id && tab === 'review',
    queryFn: async () => (await api.get(`${base}${id}/items/`, { params: { page_size: 25, ...(itemCursor ? { cursor: itemCursor } : {}) } })).data })
  const runs = useQuery({ queryKey: ['vendor-catalog-runs', id, runCursor], enabled: !!id && tab === 'history',
    queryFn: async () => (await api.get(`${base}${id}/runs/`, { params: { page_size: 25, ...(runCursor ? { cursor: runCursor } : {}) } })).data,
    refetchInterval: tab === 'history' ? 5000 : false })
  const brands = useQuery({ queryKey: ['catalog-brands'], enabled: tab === 'brands',
    queryFn: async () => list((await api.get('/integration/catalog-brands/', { params: { paginate: 'false' } })).data) })
  const relationships = useQuery({ queryKey: ['vendor-brand-relationships', company.id], enabled: tab === 'brands',
    queryFn: async () => list((await api.get('/integration/vendor-brand-relationships/', { params: { vendor_company: company.id, paginate: 'false' } })).data) })
  useEffect(() => {
    initialApplied.current = false
    setId(''); setLabel(''); setEndpoint(''); setAuthType('bearer'); setAuthHeader('X-API-Key')
    setConfig('{}'); setWeekly(true); setRetired(false); setSecret(''); setUsername(''); setLoadedVersion('')
    setError(''); setNotice(''); setItemCursor(null); setRunCursor(null); setBrandId(''); setBrandName(''); setInspected(null)
  }, [company.id])
  const populate = (row: any) => {
    setId(row?.id || ''); setLabel(row?.label || ''); setEndpoint(row?.endpoint_url || '')
    setAuthType(row?.auth_type || 'bearer'); setAuthHeader(row?.auth_header || 'X-API-Key')
    setLoadedVersion(row?.config_version || '')
    setConfig(JSON.stringify(row?.config || metadata.data?.config || {}, null, 2)); setWeekly(row?.schedule_enabled ?? true)
    setRetired(!!row?.is_retired); setSecret(''); setUsername(''); setItemCursor(null); setRunCursor(null); setNotice(''); setError(''); setProbe(null)
  }
  useEffect(() => {
    if (!initialApplied.current && connections.isSuccess) {
      initialApplied.current = true
      const row = initialConnection ? connections.data?.find((record: any) => record.id === initialConnection)
        : connections.data?.find((record: any) => !record.is_retired && record.last_run?.rows_seen > 0)
          || connections.data?.find((record: any) => !record.is_retired) || connections.data?.[0]
      if (row) populate(row)
    }
  }, [connections.data, connections.isSuccess, initialConnection])
  useEffect(() => {
    if (!id && config === '{}' && metadata.data?.config) setConfig(JSON.stringify(metadata.data.config, null, 2))
  }, [id, config, metadata.data])
  const perform = async (operation: () => Promise<any>, message: string) => {
    if (busy) return
    setBusy(true); setError(''); setNotice('')
    try { await operation(); setNotice(message) } catch (error) { setError(apiError(error)) } finally { setBusy(false) }
  }
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['vendor-catalog-connections', company.id] })
    await queryClient.invalidateQueries({ queryKey: ['vendor-catalog-items', id] })
    await queryClient.invalidateQueries({ queryKey: ['vendor-catalog-runs', id] })
  }
  useEffect(() => {
    if (!id || !lastRun?.id) return
    // Connection polling carries bounded progress. Refresh visible source pages
    // on each committed page and once more at completion, including fast runs
    // that finish between two polls. No extra provider requests are made here.
    void queryClient.invalidateQueries({ queryKey: ['vendor-catalog-items', id] })
    void queryClient.invalidateQueries({ queryKey: ['vendor-catalog-runs', id] })
    if (lastRun.status === 'completed') void queryClient.invalidateQueries({ queryKey: ['products'] })
  }, [id, lastRun?.id, lastRun?.status, lastRun?.page_index, lastRun?.rows_seen, queryClient])
  return <Box sx={{ minWidth: 0 }}>
    <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 3 }, borderRadius: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>{enabled ? 'API Catalog' : 'Vendor Brands'} — {company.display_name || company.name}</Typography>
      {!enabled && <Alert severity="info" sx={{ mb: 2 }}>Save API Integration Mode in Company Profile to enable connection configuration. Manual Vendor Brand management remains available.</Alert>}
      <Box>
        <Alert severity="info">This Vendor owns its connections and imported offers. Sync stores data in CIXCI; Buyer catalog requests use saved data. Imported rows require the existing category, Brand, compatibility, pricing and media checks.</Alert>
        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
        {notice && <Alert severity="success" sx={{ mt: 1 }}>{notice}</Alert>}
        {busy && <Alert severity="info" role="status" sx={{ mt: 1 }}>Processing request. Connection tests may take a few seconds.</Alert>}
        {[metadata.error, connections.error, items.error, runs.error, brands.error, relationships.error].filter(Boolean).map((error, index) => <Alert key={index} severity="error">{apiError(error)}</Alert>)}
        {enabled && <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, my: 2 }}>
          <TextField select label="Saved API connection" helperText="Select a saved supplier API, or add a new connection." size="small" sx={{ minWidth: 260 }} value={id} disabled={busy} onChange={event => populate(connections.data?.find((row: any) => row.id === event.target.value))}>
            <MenuItem value="">New connection</MenuItem>
            {(connections.data || []).filter((row: any) => !row.is_retired || showRetired || row.id === id).map((row: any) => <MenuItem key={row.id} value={row.id}>{row.label}{row.is_retired ? ' (retired)' : ''}</MenuItem>)}
          </TextField>
          <Button disabled={busy} onClick={() => { populate(undefined); setTab('config') }}>Add API Connection</Button>
          <FormControlLabel control={<Checkbox size="small" checked={showRetired} onChange={event => setShowRetired(event.target.checked)}/>} label="Show retired"/>
          <Button disabled={!id || busy || retired} onClick={() => perform(async () => { setProbe(null); const result = await api.post(`${base}${id}/test_connection/`, {}, { timeout: 75000 }); setProbe(result.data) }, 'API connection test completed. Review the preview below.')}>Test API Connection</Button>
          <Button disabled={!id || busy || retired} onClick={() => perform(async () => { await api.post(`${base}${id}/sync/`); await refresh() }, 'Synchronization queued. Check Run History for progress.')}>Sync Now</Button>
          <Button disabled={!id || busy || retired} onClick={() => perform(async () => { await api.post(`${base}${id}/recheck/`); await refresh() }, 'Saved review rows queued for revalidation.')}>Recheck Review Rows</Button>
          <Button disabled={!id || busy || !['queued', 'running', 'retrying'].includes(selected?.last_run?.status)} onClick={() => perform(async () => { await api.post(`${base}${id}/cancel/`); await refresh() }, 'Active synchronization cancelled. Saved data and history are retained.')}>Cancel Sync</Button>
          <Button disabled={!id || busy} onClick={() => perform(refresh, 'Saved data refreshed. No supplier request was made.')}>Refresh Data</Button>
        </Box>}
        {enabled && probe && <Alert severity="success" sx={{ mb: 2 }}>
          HTTP {probe.http_status} · {probe.sample_count} sample item(s) returned · {probe.imported_count} imported by this test.
          {' '}{probe.detail}
          {(probe.samples || []).map((sample: any, index: number) => <Typography key={index} variant="body2">{sample.sku} · {sample.name} · {sample.brand}</Typography>)}
        </Alert>}
        {selected && <Typography variant="body2">Last sync: {selected.last_synced_at || 'Never'} · Next weekly sync: {selected.next_sync_at || 'Disabled'} · Latest run: {selected.last_run?.status || 'None'}{selected.last_run?.error_code ? ` (${selected.last_run.error_code})` : ''}</Typography>}
        {syncActive && <Alert severity="info" role="status" sx={{ mt: 1 }}>Synchronization {lastRun.status}. {lastRun.page_index} page(s) saved; progress and imported rows refresh automatically.{lastRun.next_retry_at ? ` Next retry: ${lastRun.next_retry_at}.` : ''}{lastRun.error_code ? ` ${lastRun.error_code}.` : ''}</Alert>}
        {lastRun?.status === 'failed' && <Alert severity="error" sx={{ mt: 1 }}>Synchronization failed: {lastRun.error_code || 'Check Run History'}. Previously saved data is retained. Review the connection before retrying.</Alert>}
        {selected?.last_run && <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5, my: 2 }}>
          {[['Rows in latest run', lastRun.rows_seen], ['Products created', lastRun.created_count], ['Products updated', lastRun.updated_count], ['Unchanged rows', lastRun.unchanged_count], ['Rows needing review', lastRun.review_count], ['Source errors', lastRun.error_count]].map(([label, value]) =>
            <Paper key={label} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="h6" sx={{ fontWeight: 600 }}>{value}</Typography></Paper>)}
        </Box>}
        <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2 }}>
          <Tab value="config" label="Connection & Mapping" disabled={!enabled}/><Tab value="brands" label="Vendor Brands"/><Tab value="review" label="Imported Rows & Review" disabled={!enabled || !id}/><Tab value="history" label="Run History" disabled={!enabled || !id}/>
        </Tabs>
        {tab === 'config' && <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {!id && <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField select label="API setup preset" helperText="Optional starting settings. Enter this supplier's URL, credentials and field mapping below." value={template} disabled={busy} size="small" sx={{ minWidth: 240, maxWidth: 520 }} onChange={event => setTemplate(event.target.value)}>
              <MenuItem value="generic">Generic REST / JSON setup</MenuItem><MenuItem value="balaji">Balaji Wireless prefilled setup</MenuItem>
            </TextField>
            <Button disabled={busy || !metadata.data} onClick={() => perform(async () => populate(metadata.data), `${template === 'balaji' ? 'Balaji' : 'Generic REST/JSON'} mapping template loaded. Review the source fields and enter this supplier's credentials.`)}>Use Preset</Button>
          </Box>}
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Connection details</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
          <TextField label="Connection label" value={label} onChange={event => setLabel(event.target.value)} size="small"/>
          <TextField label="Catalog HTTPS URL" value={endpoint} onChange={event => setEndpoint(event.target.value)} size="small" helperText="Public HTTPS JSON endpoint. Authentication belongs in the credential fields below."/>
          <TextField select label="Authentication" value={authType} onChange={event => { setAuthType(event.target.value); setSecret(''); setUsername('') }} size="small">
            <MenuItem value="bearer">Bearer token</MenuItem><MenuItem value="api_key">API-key header</MenuItem><MenuItem value="basic">Basic authentication</MenuItem><MenuItem value="none">Public API</MenuItem>
          </TextField>
          {authType === 'api_key' && <TextField label="API-key header" value={authHeader} onChange={event => setAuthHeader(event.target.value)} size="small"/>}
          {authType === 'basic' && <TextField label="API username" value={username} onChange={event => setUsername(event.target.value)} size="small" autoComplete="off"/>}
          {authType !== 'none' && <TextField label={id && selected?.has_credentials ? 'Replacement credential (leave blank to keep saved)' : 'API credential'} type="password" value={secret} onChange={event => setSecret(event.target.value)} size="small" autoComplete="new-password" helperText="Credentials are encrypted and never returned by the API."/>}
          </Box>
          <Alert severity="info">Map source fields and approved category values explicitly. Bare Universal requires Device Types; missing launch date, category, MSRP, Brand relationship or approved media stays in review. Do not guess these values from a title.</Alert>
          <VendorCatalogConfigEditor value={config} onChange={setConfig} disabled={busy} supportedFields={metadata.data?.supported_fields || []}/>
          <FormControlLabel control={<Checkbox checked={weekly} onChange={event => setWeekly(event.target.checked)}/>} label="Weekly full resync"/>
          {id && <FormControlLabel control={<Checkbox checked={retired} onChange={event => setRetired(event.target.checked)}/>} label="Retire connection (retain imported history)"/>}
          <Button variant="contained" disabled={busy || !label.trim() || !endpoint.trim()} onClick={() => perform(async () => {
            let parsed; try { parsed = JSON.parse(config) } catch { throw new Error('Mapping must be valid JSON.') }
            const payload: any = { label, endpoint_url: endpoint, auth_type: authType, auth_header: authHeader, config: parsed, schedule_enabled: weekly, is_retired: retired }
            if (!id) payload.vendor_company = company.id
            if (authType === 'none') payload.credential = {}
            else if (secret) payload.credential = authType === 'basic' ? { username, password: secret } : { token: secret }
            const response = id ? await api.patch(`${base}${id}/`, payload, { headers: { 'If-Match': loadedVersion } }) : await api.post(base, payload)
            populate(response.data); await refresh()
          }, 'Catalog connection saved.')}>Save Catalog Connection</Button>
        </Box>}
        {tab === 'brands' && <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography>Register the Brand once, then explicitly approve this Vendor as its Owner or Authorized Distributor. A Brand does not create another Vendor account.</Typography>
          <TextField label="New Brand name" value={brandName} onChange={event => setBrandName(event.target.value)} size="small"/>
          <Button disabled={busy || !brandName.trim()} onClick={() => perform(async () => { const result = await api.post('/integration/catalog-brands/', { name: brandName }); setBrandId(result.data.id); setBrandName(''); await brands.refetch() }, 'Brand registered. Select its supplier relationship below.')}>Register Brand</Button>
          <TextField select label="Approved Brand" value={brandId} onChange={event => setBrandId(event.target.value)} size="small">
            {(brands.data || []).filter((brand: any) => brand.is_active).map((brand: any) => <MenuItem key={brand.id} value={brand.id}>{brand.name}</MenuItem>)}
          </TextField>
          <TextField select label="Supplier Brand relationship" value={relationship} onChange={event => setRelationship(event.target.value)} size="small"><MenuItem value="owned">Owned</MenuItem><MenuItem value="authorized_distributor">Authorized Distributor</MenuItem></TextField>
          <Button disabled={busy || !brandId} onClick={() => perform(async () => { await api.post('/integration/vendor-brand-relationships/', { vendor_company: company.id, brand: brandId, relationship_type: relationship }); await relationships.refetch() }, 'Supplier Brand relationship approved.')}>Approve Brand Relationship</Button>
          {(relationships.data || []).map((row: any) => <Box key={row.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Typography sx={{ flex: 1 }}>{row.brand_name} · {row.relationship_type === 'owned' ? 'Owned' : 'Authorized Distributor'} · {row.is_active ? 'Active' : 'Retired'}</Typography><Button disabled={busy} onClick={() => perform(async () => { await api.patch(`/integration/vendor-brand-relationships/${row.id}/`, { is_active: !row.is_active }); await relationships.refetch() }, 'Brand relationship updated.')}>{row.is_active ? 'Retire' : 'Reactivate'}</Button></Box>)}
        </Box>}
        {tab === 'review' && <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button component={Link} to={`/catalog?tab=api-imports&connection=${id}`} sx={{ alignSelf: 'flex-start' }}>View imports in Product Catalog</Button>
          <Typography>Invalid updates hold only the affected offer from future Buyer catalog/export. Last saved Product data and historical transactions are preserved. Correct its source/mapping or complete canonical Product setup, then recheck.</Typography>
          {list(items.data).map((row: any) => <Box key={row.id} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <Typography sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{row.source_summary?.name || row.external_id}</Typography>
            <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{row.source_summary?.sku || row.external_id} · {row.review_required ? 'Review Required' : row.is_listed ? 'Validated' : 'No longer listed'}{!row.is_listed && row.review_required ? ' · No longer listed' : ''}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
              Source values (current mapping): Brand {row.source_summary?.brand || 'Not supplied'}
              {' · '}Wholesale {row.source_summary?.vendor_wholesale_price_amount ?? 'Not supplied'} {row.source_summary?.vendor_wholesale_price_currency || ''}
              {' · '}Stock {row.source_summary?.inventory_level ?? 'Not supplied'}
            </Typography>
            <Typography variant="body2">{(row.review_errors || []).map((error: any) => `${error.field}: ${error.code}`).join('; ') || 'No outstanding source errors.'}</Typography>
            <Button onClick={() => setInspected(row)}>Inspect Source Row</Button>
            <Typography variant="caption" sx={{ display: 'block' }}>{row.product ? `Product Catalog ID: ${row.product}` : 'No canonical Product yet. Complete the supplier/SKU entry in Product Catalog with verified required data, then Recheck Review Rows.'}</Typography>
          </Box>)}
          {!items.isFetching && !items.error && !list(items.data).length && <Typography>{syncActive ? 'Waiting for the next saved page. Imported rows will appear automatically.' : 'No source rows yet. Start a synchronization.'}</Typography>}
          <Box sx={{ display: 'flex', gap: 1 }}><Button disabled={!itemCursor || items.isFetching} onClick={() => setItemCursor(null)}>First page</Button><Button disabled={!items.data?.next || items.isFetching} onClick={() => setItemCursor(cursor(items.data.next))}>Next rows</Button></Box>
        </Box>}
        {tab === 'history' && <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {list(runs.data).map((run: any) => <Box key={run.id} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}><Typography sx={{ fontWeight: 600 }}>{run.trigger} · {run.status} · {run.created_at}</Typography><Typography variant="body2">Rows {run.rows_seen} · Created {run.created_count} · Updated {run.updated_count} · Unchanged {run.unchanged_count} · Review {run.review_count} · Errors {run.error_count}{run.error_code ? ` · ${run.error_code}` : ''}</Typography></Box>)}
          {!runs.isFetching && !list(runs.data).length && <Typography>No synchronization runs yet.</Typography>}
          <Box sx={{ display: 'flex', gap: 1 }}><Button disabled={!runCursor || runs.isFetching} onClick={() => setRunCursor(null)}>First runs</Button><Button disabled={!runs.data?.next || runs.isFetching} onClick={() => setRunCursor(cursor(runs.data.next))}>Next runs</Button></Box>
        </Box>}
      </Box>
    </Paper>
    <Dialog open={!!inspected} onClose={() => setInspected(null)} maxWidth="md" fullWidth><DialogTitle>Source Row — {inspected?.external_id}</DialogTitle><DialogContent dividers><Box component="pre" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(inspected, null, 2)}</Box></DialogContent><DialogActions><Button onClick={() => setInspected(null)}>Close Source Row</Button></DialogActions></Dialog>
  </Box>
}
