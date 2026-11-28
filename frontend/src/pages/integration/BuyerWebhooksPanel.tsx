import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Paper,
  Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography } from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import api from '../../lib/apiClient'
import { formatETDate } from '../../lib/formatters'
import { useSnackbar } from '../../components/feedback/SnackbarProvider'

const BASE = '/integration/buyer-webhooks/'
interface Endpoint { id: string; company: string; company_name: string; url: string; is_active: boolean; events: string[]; updated_at: string; signing_secret?: string }
interface Delivery { id: string; event_type: string; status: string; attempt_count: number; last_response_code: number | null; last_error: string; delivered_at: string | null; created_at: string }
interface Company { id: string; name: string; company_type: string }
const STATUS_COLOR: Record<string, 'default' | 'success' | 'error' | 'warning' | 'info'> = { delivered: 'success', failed: 'error', retrying: 'warning', pending: 'default', in_flight: 'info' }

const message = (error: unknown) => {
  const data = (error as { response?: { data?: unknown } })?.response?.data
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    let first: unknown = record.detail ?? Object.values(record)[0]
    if (first && typeof first === 'object' && !Array.isArray(first)) first = Object.values(first)[0]
    return Array.isArray(first) ? String(first[0]) : String(first)
  }
  return 'The request could not be completed.'
}

export default function BuyerWebhooksPanel({ isAdmin }: { isAdmin: boolean }) {
  const queryClient = useQueryClient()
  const { showSnackbar } = useSnackbar()
  const [company, setCompany] = useState('')
  const [url, setUrl] = useState('')
  const [secret, setSecret] = useState<{ company: string; value: string } | null>(null)
  const [opened, setOpened] = useState<Endpoint | null>(null)
  const endpoints = useQuery({ queryKey: ['buyer-webhooks'], queryFn: async () => (await api.get<Endpoint[]>(BASE)).data })
  const companies = useQuery({ queryKey: ['buyer-webhook-companies'], enabled: isAdmin, queryFn: async () => {
    const data = (await api.get('/tenant/companies/', { params: { paginate: 'false' } })).data
    return ((Array.isArray(data) ? data : data.results || []) as Company[]).filter(row => row.company_type === 'buyer')
  } })
  const deliveries = useQuery({ queryKey: ['buyer-webhook-deliveries', opened?.id], enabled: !!opened,
    queryFn: async () => (await api.get<Delivery[]>(`${BASE}${opened!.id}/deliveries/`)).data })
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: ['buyer-webhooks'] }),
    queryClient.invalidateQueries({ queryKey: ['buyer-webhook-deliveries'] })])
  const fail = (error: unknown) => showSnackbar(message(error), 'error')

  const save = useMutation({
    mutationFn: async (body: { company: string; url: string; is_active?: boolean }) => (await api.post<Endpoint>(BASE, body)).data,
    onSuccess: async data => {
      if (data.signing_secret) setSecret({ company: data.company_name, value: data.signing_secret })
      else showSnackbar('Webhook saved.', 'success')
      setCompany(''); setUrl('')
      await refresh()
    }, onError: fail })
  const rotate = useMutation({
    mutationFn: async (row: Endpoint) => (await api.post<Endpoint>(`${BASE}${row.id}/rotate-secret/`)).data,
    onSuccess: data => setSecret({ company: data.company_name, value: data.signing_secret || '' }), onError: fail })
  const remove = useMutation({ mutationFn: (row: Endpoint) => api.delete(`${BASE}${row.id}/`),
    onSuccess: async () => { showSnackbar('Webhook removed.', 'success'); await refresh() }, onError: fail })
  const test = useMutation({
    mutationFn: async (row: Endpoint) => (await api.post<Delivery>(`${BASE}${row.id}/test/`)).data,
    onSuccess: async data => {
      if (data.status === 'delivered') showSnackbar(`Test delivered (HTTP ${data.last_response_code}).`, 'success')
      else showSnackbar(`Test not delivered: ${data.last_error || data.status}.`, 'warning')
      await refresh()
    }, onError: fail })
  const busy = save.isPending || rotate.isPending || remove.isPending || test.isPending

  if (endpoints.isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={28} /></Box>
  if (endpoints.error) return <Alert severity="error">{message(endpoints.error)}</Alert>
  const rows = endpoints.data || []
  const taken = new Set(rows.map(row => row.company))

  return <Stack spacing={2}>
    <Alert severity="info">
      A buyer with a webhook receives <b>order.shipment_complete</b> and <b>order.delivery_complete</b> as a signed HTTPS POST when every
      vendor of an order has confirmed, instead of polling the API. Each request carries
      {' '}<code>CIXCI-Signature: t=&lt;unix time&gt;,v1=&lt;hex&gt;</code>, an HMAC-SHA256 of <code>&lt;t&gt;.&lt;raw body&gt;</code> with the signing secret.
    </Alert>
    {isAdmin && <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Add a buyer webhook</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
        <TextField select size="small" label="Buyer company" value={company} onChange={event => setCompany(event.target.value)} sx={{ minWidth: 240 }}>
          {(companies.data || []).filter(row => !taken.has(row.id)).map(row => <MenuItem key={row.id} value={row.id}>{row.name}</MenuItem>)}
        </TextField>
        <TextField size="small" fullWidth label="HTTPS address" placeholder="https://example.com/cixci/webhook" value={url}
          onChange={event => setUrl(event.target.value)} />
        <Button variant="contained" disabled={busy || !company || !url.trim()} onClick={() => save.mutate({ company, url: url.trim() })}
          sx={{ whiteSpace: 'nowrap' }}>Add webhook</Button>
      </Stack>
    </Paper>}
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead><TableRow>
          <TableCell>Buyer</TableCell><TableCell>Address</TableCell><TableCell>Active</TableCell><TableCell>Updated</TableCell><TableCell align="right">Actions</TableCell>
        </TableRow></TableHead>
        <TableBody>
          {!rows.length && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
            {isAdmin ? 'No buyer has a webhook yet.' : 'No webhook is set up for your company. Ask CIXCI to add one.'}</TableCell></TableRow>}
          {rows.map(row => <TableRow key={row.id} hover>
            <TableCell>{row.company_name}</TableCell>
            <TableCell sx={{ fontFamily: 'monospace', fontSize: 12, overflowWrap: 'anywhere' }}>{row.url}</TableCell>
            <TableCell>{isAdmin
              ? <Switch size="small" checked={row.is_active} disabled={busy} onChange={event => save.mutate({ company: row.company, url: row.url, is_active: event.target.checked })} />
              : <Chip size="small" label={row.is_active ? 'Active' : 'Paused'} color={row.is_active ? 'success' : 'default'} />}</TableCell>
            <TableCell>{formatETDate(row.updated_at)}</TableCell>
            <TableCell align="right">
              <Button size="small" onClick={() => setOpened(row)}>Deliveries</Button>
              {isAdmin && <>
                <Button size="small" disabled={busy || !row.is_active} onClick={() => test.mutate(row)}>Send test</Button>
                <Button size="small" disabled={busy} onClick={() => rotate.mutate(row)}>New secret</Button>
                <Tooltip title="Remove webhook"><span><IconButton size="small" disabled={busy} onClick={() => remove.mutate(row)}><DeleteOutlineIcon fontSize="small" /></IconButton></span></Tooltip>
              </>}
            </TableCell>
          </TableRow>)}
        </TableBody>
      </Table>
    </TableContainer>

    <Dialog open={!!secret} fullWidth maxWidth="sm">
      <DialogTitle>Signing secret for {secret?.company}</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>Copy it now and give it to the buyer over a secure channel. It is not shown again; a lost secret is replaced with “New secret”.</Alert>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <TextField size="small" fullWidth value={secret?.value || ''} slotProps={{ input: { readOnly: true, sx: { fontFamily: 'monospace', fontSize: 13 } } }} />
          <Tooltip title="Copy"><IconButton onClick={() => { void navigator.clipboard.writeText(secret?.value || ''); showSnackbar('Copied.', 'success') }}><ContentCopyIcon fontSize="small" /></IconButton></Tooltip>
        </Stack>
      </DialogContent>
      <DialogActions><Button variant="contained" onClick={() => setSecret(null)}>I have copied it</Button></DialogActions>
    </Dialog>

    <Dialog open={!!opened} onClose={() => setOpened(null)} fullWidth maxWidth="md">
      <DialogTitle>Deliveries to {opened?.company_name}</DialogTitle>
      <DialogContent>
        {deliveries.isLoading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>
          : <Table size="small">
            <TableHead><TableRow><TableCell>Event</TableCell><TableCell>Status</TableCell><TableCell>Attempts</TableCell><TableCell>Answer</TableCell><TableCell>Created</TableCell></TableRow></TableHead>
            <TableBody>
              {!(deliveries.data || []).length && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>Nothing has been sent yet.</TableCell></TableRow>}
              {(deliveries.data || []).map(row => <TableRow key={row.id}>
                <TableCell>{row.event_type}</TableCell>
                <TableCell><Chip size="small" label={row.status} color={STATUS_COLOR[row.status] || 'default'} /></TableCell>
                <TableCell>{row.attempt_count}</TableCell>
                <TableCell>{row.last_response_code ? `HTTP ${row.last_response_code}` : row.last_error || '—'}</TableCell>
                <TableCell>{formatETDate(row.created_at)}</TableCell>
              </TableRow>)}
            </TableBody>
          </Table>}
      </DialogContent>
      <DialogActions><Button onClick={() => setOpened(null)}>Close</Button></DialogActions>
    </Dialog>
  </Stack>
}
