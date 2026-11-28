import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Box, Button, Chip, CircularProgress, Divider, FormControlLabel, IconButton, Link, MenuItem, Paper, Stack, Switch,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography } from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import LocalShippingIcon from '@mui/icons-material/LocalShippingOutlined'
import SyncIcon from '@mui/icons-material/Sync'
import api from '../../lib/apiClient'
import { formatETDate } from '../../lib/formatters'
import { useSnackbar } from '../../components/feedback/SnackbarProvider'

const BASE = '/fulfillment/carrier-tracking/'
type TrackerState = 'pending' | 'registered' | 'failed' | 'stopped'
interface Config {
  enabled: boolean; mode: 'test' | 'production'; has_api_key: boolean; api_key_hint: string; has_webhook_secret: boolean
  provider_webhook_id: string; webhook_path: string; track_vendor_api_shipments: boolean; carrier_map: Record<string, string>
  poll_interval_minutes: number; last_verified_at: string | null; last_error: string
  trackers: Record<TrackerState | 'delivered', number>
  last_webhook: { received_at: string; status: string; event_type: string } | null
}
interface Tracker {
  id: string; tracking_code: string; carrier: string; provider_carrier: string; state: TrackerState; status: string
  status_detail: string; last_event_at: string | null; last_synced_at: string | null; last_error: string; public_url: string
  handoff_status: string
}
const STATE_COLOR: Record<TrackerState, 'default' | 'info' | 'error' | 'success'> = { pending: 'default', registered: 'info', failed: 'error', stopped: 'success' }
const STATE_LABEL: Record<TrackerState, string> = { pending: 'Waiting', registered: 'Tracking', failed: 'Failed', stopped: 'Finished' }

const message = (error: unknown) => {
  const data = (error as { response?: { data?: unknown } })?.response?.data
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    // The platform error envelope nests field errors: { detail: { field: [message] } }.
    let first: unknown = record.detail ?? Object.values(record)[0]
    if (first && typeof first === 'object' && !Array.isArray(first)) first = Object.values(first)[0]
    return Array.isArray(first) ? String(first[0]) : String(first)
  }
  return 'The request could not be completed.'
}
// The provider must call the API host, which can differ from the page's own origin.
const apiOrigin = () => { try { return new URL(String(api.defaults.baseURL || ''), window.location.origin).origin } catch { return window.location.origin } }

export default function CarrierTrackingPanel() {
  const config = useQuery({ queryKey: ['carrier-tracking'], queryFn: async () => (await api.get<Config>(BASE)).data })
  if (config.isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={28} /></Box>
  if (config.error || !config.data) return <Alert severity="error">{message(config.error)}</Alert>
  // Remount on every saved change so the form always starts from the stored settings.
  return <CarrierTrackingForm key={config.dataUpdatedAt} data={config.data} />
}

function CarrierTrackingForm({ data }: { data: Config }) {
  const queryClient = useQueryClient()
  const { showSnackbar } = useSnackbar()
  const [stateFilter, setStateFilter] = useState<TrackerState | ''>('')
  const trackers = useQuery({ queryKey: ['carrier-trackers', stateFilter], queryFn: async () => {
    const data = (await api.get(BASE + 'trackers/', { params: { state: stateFilter || undefined } })).data
    return (Array.isArray(data) ? data : data.results || []) as Tracker[]
  } })
  const [apiKey, setApiKey] = useState('')
  const [draft, setDraft] = useState({ enabled: data.enabled, mode: data.mode, track_vendor_api_shipments: data.track_vendor_api_shipments,
    poll_interval_minutes: data.poll_interval_minutes })
  const [carriers, setCarriers] = useState<[string, string][]>(() => Object.entries(data.carrier_map || {}))

  const secret = useQuery({ queryKey: ['carrier-tracking-secret'], queryFn: () => '', staleTime: Infinity, enabled: false }).data || ''
  const setSecret = (value: string) => queryClient.setQueryData(['carrier-tracking-secret'], value)
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['carrier-tracking'] })
    void queryClient.invalidateQueries({ queryKey: ['carrier-trackers'] })
  }
  const run = useMutation({
    mutationFn: async (request: { method: 'post' | 'patch'; path: string; body?: unknown; done: string }) =>
      ({ data: (await api[request.method](BASE + request.path, request.body)).data, done: request.done }),
    onSuccess: ({ data: result, done }) => {
      // Kept in the query cache so it survives the remount; shown once, never refetched.
      if (result?.webhook_secret) queryClient.setQueryData(['carrier-tracking-secret'], result.webhook_secret)
      showSnackbar(done, 'success'); setApiKey(''); refresh()
    },
    onError: error => { showSnackbar(message(error), 'error'); refresh() },
  })
  const busy = run.isPending
  const webhookUrl = apiOrigin() + data.webhook_path
  const copy = (text: string, label: string) => { void navigator.clipboard.writeText(text); showSnackbar(label + ' copied', 'success') }
  const save = () => run.mutate({ method: 'patch', path: 'config/', done: 'Carrier tracking settings saved.',
    body: { ...draft, ...(apiKey ? { api_key: apiKey.trim() } : {}), carrier_map: Object.fromEntries(carriers.filter(([name, target]) => name.trim() && target.trim())) } })
  const section = { p: 2, borderRadius: 2 }

  return <Stack spacing={2} data-testid="carrier-tracking-panel">
    <Paper variant="outlined" sx={section}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: .5, flexWrap: 'wrap', rowGap: 1 }}>
        <LocalShippingIcon color="primary" />
        <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 700 }}>EasyPost carrier tracking</Typography>
        <Chip size="small" color={data.enabled ? 'success' : 'default'} label={data.enabled ? 'Enabled' : 'Disabled'} />
        <Chip size="small" variant="outlined" label={data.mode === 'production' ? 'Production' : 'Test mode'} />
        {data.last_verified_at && <Chip size="small" variant="outlined" color="success" label={'Key verified ' + formatETDate(data.last_verified_at)} />}
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Shipments that vendors upload by CSV are registered with EasyPost. Carrier scans then update the shipment, the order and the buyer automatically.
      </Typography>
      {data.last_error && <Alert severity="warning" sx={{ mb: 2 }}>Last provider error: {data.last_error}</Alert>}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr' }, gap: 2 }}>
        <TextField label="EasyPost API key" type="password" size="small" value={apiKey} disabled={busy} autoComplete="off"
          onChange={event => setApiKey(event.target.value)} placeholder={data.has_api_key ? `Saved (${data.api_key_hint}). Enter a new key to replace it` : 'Paste the API key'}
          helperText="Stored encrypted. It is never shown again." slotProps={{ inputLabel: { shrink: true } }} />
        <TextField select label="Mode" size="small" value={draft.mode} disabled={busy}
          onChange={event => setDraft({ ...draft, mode: event.target.value as Config['mode'] })} helperText="Must match the key type">
          <MenuItem value="test">Test</MenuItem><MenuItem value="production">Production</MenuItem>
        </TextField>
        <TextField label="Safety poll (minutes)" type="number" size="small" value={draft.poll_interval_minutes} disabled={busy}
          onChange={event => setDraft({ ...draft, poll_interval_minutes: Number(event.target.value) })} helperText="30–1440; webhooks are the main path" />
      </Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1.5 }}>
        <FormControlLabel control={<Switch checked={draft.enabled} disabled={busy} onChange={event => setDraft({ ...draft, enabled: event.target.checked })} />} label="Enable carrier tracking" />
        <FormControlLabel control={<Switch checked={draft.track_vendor_api_shipments} disabled={busy}
          onChange={event => setDraft({ ...draft, track_vendor_api_shipments: event.target.checked })} />}
          label="Also track shipments from API vendors (they already report status)" />
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', rowGap: 1 }}>
        <Button variant="contained" disabled={busy} onClick={save}>Save settings</Button>
        <Button variant="outlined" disabled={busy || !data.has_api_key} onClick={() => run.mutate({ method: 'post', path: 'test/', done: 'EasyPost accepted the API key.' })}>Test connection</Button>
      </Stack>
    </Paper>

    <Paper variant="outlined" sx={section}>
      <Typography sx={{ fontWeight: 700, mb: .5 }}>Webhook</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        EasyPost posts every carrier update to this address. Each event is verified with the signing secret before it is accepted.
      </Typography>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
        <TextField size="small" fullWidth value={webhookUrl} slotProps={{ input: { readOnly: true, sx: { fontFamily: 'monospace', fontSize: 12 } } }} />
        <Tooltip title="Copy address"><IconButton onClick={() => copy(webhookUrl, 'Webhook address')}><ContentCopyIcon fontSize="small" /></IconButton></Tooltip>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1, alignItems: 'center' }}>
        <Button variant="contained" disabled={busy || !data.has_api_key || !webhookUrl.startsWith('https://')}
          onClick={() => run.mutate({ method: 'post', path: 'register-webhook/', body: { origin: apiOrigin() }, done: 'Webhook registered with EasyPost.' })}>
          Register with EasyPost</Button>
        <Button variant="outlined" disabled={busy} onClick={() => run.mutate({ method: 'post', path: 'generate-webhook-secret/', done: 'Signing secret generated.' })}>
          Generate secret for manual setup</Button>
        <Chip size="small" color={data.has_webhook_secret ? 'success' : 'warning'} variant="outlined" label={data.has_webhook_secret ? 'Signing secret saved' : 'No signing secret yet'} />
        {data.provider_webhook_id && <Chip size="small" variant="outlined" label={'EasyPost webhook ' + data.provider_webhook_id} />}
        {data.last_webhook && <Chip size="small" variant="outlined" label={`Last event ${formatETDate(data.last_webhook.received_at)} · ${data.last_webhook.status}`} />}
      </Stack>
      {!webhookUrl.startsWith('https://') && <Alert severity="info" sx={{ mt: 1.5 }}>EasyPost only delivers to a public https address. On this local address use the safety poll or a tunnel.</Alert>}
      {secret && <Alert severity="warning" sx={{ mt: 1.5 }} onClose={() => setSecret('')}
        action={<Button size="small" onClick={() => copy(secret, 'Signing secret')}>Copy</Button>}>
        Paste this signing secret into the EasyPost webhook settings now. It is shown only once: <Box component="code" sx={{ wordBreak: 'break-all' }}>{secret}</Box>
      </Alert>}
    </Paper>

    <Paper variant="outlined" sx={section}>
      <Typography sx={{ fontWeight: 700, mb: .5 }}>Carrier names</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Map the carrier text vendors type to the EasyPost carrier name. A carrier that is not listed is detected by EasyPost from the tracking number.
      </Typography>
      <Stack spacing={1}>
        {carriers.map(([name, target], index) => <Stack key={index} direction="row" spacing={1}>
          <TextField size="small" label="Vendor writes" value={name} disabled={busy}
            onChange={event => setCarriers(carriers.map((row, i) => i === index ? [event.target.value, row[1]] : row))} />
          <TextField size="small" label="EasyPost carrier" value={target} disabled={busy}
            onChange={event => setCarriers(carriers.map((row, i) => i === index ? [row[0], event.target.value] : row))} />
          <IconButton aria-label={`Remove ${name}`} disabled={busy} onClick={() => setCarriers(carriers.filter((_, i) => i !== index))}><DeleteOutlineIcon fontSize="small" /></IconButton>
        </Stack>)}
        <Box><Button size="small" disabled={busy} onClick={() => setCarriers([...carriers, ['', '']])}>Add carrier</Button></Box>
      </Stack>
    </Paper>

    <Paper variant="outlined" sx={section}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5, flexWrap: 'wrap', rowGap: 1 }}>
        <Typography sx={{ fontWeight: 700, flex: 1 }}>Tracked shipments</Typography>
        {(['pending', 'registered', 'failed', 'stopped'] as TrackerState[]).map(state =>
          <Chip key={state} size="small" clickable color={stateFilter === state ? 'primary' : STATE_COLOR[state]} variant={stateFilter === state ? 'filled' : 'outlined'}
            label={`${STATE_LABEL[state]} ${data.trackers[state] ?? 0}`} onClick={() => setStateFilter(stateFilter === state ? '' : state)} />)}
        <Chip size="small" variant="outlined" color="success" label={`Delivered ${data.trackers.delivered ?? 0}`} />
        <Button size="small" startIcon={<SyncIcon />} disabled={busy || !data.enabled} onClick={() => run.mutate({ method: 'post', path: 'sync/', done: 'Sync finished.' })}>Sync now</Button>
      </Stack>
      <Divider />
      <TableContainer sx={{ maxHeight: 420 }}><Table size="small" stickyHeader aria-label="Tracked shipments">
        <TableHead><TableRow><TableCell>Tracking #</TableCell><TableCell>Carrier</TableCell><TableCell>Tracker</TableCell>
          <TableCell>Carrier status</TableCell><TableCell>Shipment</TableCell><TableCell>Last scan</TableCell><TableCell /></TableRow></TableHead>
        <TableBody>
          {(trackers.data || []).map(row => <TableRow key={row.id} hover>
            <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{row.public_url
              ? <Link href={row.public_url} target="_blank" rel="noreferrer">{row.tracking_code}</Link> : row.tracking_code}</TableCell>
            <TableCell>{row.provider_carrier || row.carrier || '—'}</TableCell>
            <TableCell><Chip size="small" color={STATE_COLOR[row.state]} label={STATE_LABEL[row.state]} /></TableCell>
            <TableCell>{row.status ? row.status.replace(/_/g, ' ') : '—'}{row.last_error && <Typography variant="caption" color="error" sx={{ display: 'block' }}>{row.last_error}</Typography>}</TableCell>
            <TableCell>{row.handoff_status}</TableCell>
            <TableCell>{row.last_event_at ? formatETDate(row.last_event_at) : '—'}</TableCell>
            <TableCell align="right">{row.state === 'failed' && <Button size="small" disabled={busy}
              onClick={() => run.mutate({ method: 'post', path: `trackers/${row.id}/retry/`, done: 'Tracker queued again.' })}>Retry</Button>}</TableCell>
          </TableRow>)}
          {!trackers.isLoading && !(trackers.data || []).length && <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', color: 'text.secondary', py: 3 }}>
            No shipments are being tracked{stateFilter ? ' in this state' : ' yet'}.</TableCell></TableRow>}
        </TableBody>
      </Table></TableContainer>
    </Paper>
  </Stack>
}
