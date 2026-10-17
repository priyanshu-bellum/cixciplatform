import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import PowerOutlinedIcon from '@mui/icons-material/PowerOutlined'
import WebhookIcon from '@mui/icons-material/Webhook'
import CallReceivedIcon from '@mui/icons-material/CallReceived'
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckIcon from '@mui/icons-material/Check'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import CloseIcon from '@mui/icons-material/Close'
import api from '../lib/apiClient'
import PageHeader from '../components/layout/PageHeader'
import DataTable, { type Column } from '../components/data-display/DataTable'
import StatusChip from '../components/data-display/StatusChip'
import { formatDate, formatETDate } from '../lib/formatters'
import { useSnackbar } from '../components/feedback/SnackbarProvider'
import { useConfirmDialog } from '../hooks/useConfirmDialog'
import ConfirmDialog from '../components/feedback/ConfirmDialog'

/* ── connector type chip colour mapping ── */
const CONNECTOR_COLOR: Record<string, 'success' | 'info' | 'secondary' | 'default'> = {
  quickbooks: 'success',
  sftp: 'info',
  rest_api: 'info',
  webhook: 'secondary',
  email: 'default',
  manual: 'default',
  csv: 'default',
}

type TabValue = 'connections' | 'webhooks' | 'inbound' | 'api-keys'

export default function IntegrationPage() {
  const [tab, setTab] = useState<TabValue>('connections')
  const { showSnackbar } = useSnackbar()
  const { confirm, dialogProps } = useConfirmDialog()

  // API Key creation / modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [keyLabel, setKeyLabel] = useState('')
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null)
  const [isCreatingKey, setIsCreatingKey] = useState(false)
  const [modalError, setModalError] = useState('')

  /* ── queries ── */
  const { data: connData, isLoading: cLoading } = useQuery({
    queryKey: ['integration-connections'],
    queryFn: () => api.get('/integration/connections/').then(r => r.data),
  })

  const { data: whData, isLoading: wLoading } = useQuery({
    queryKey: ['integration-webhooks'],
    queryFn: () => api.get('/integration/webhooks/').then(r => r.data),
    enabled: tab === 'webhooks',
  })

  const { data: inbData, isLoading: iLoading } = useQuery({
    queryKey: ['integration-inbound'],
    queryFn: () => api.get('/integration/inbound-webhooks/').then(r => r.data),
    enabled: tab === 'inbound',
  })

  const { data: keysData, isLoading: kLoading, refetch: refetchKeys } = useQuery({
    queryKey: ['integration-api-keys'],
    queryFn: () => api.get('/integration/api-keys/').then(r => r.data),
    enabled: tab === 'api-keys',
  })

  const connections = connData?.results ?? (Array.isArray(connData) ? connData : [])
  const webhooks = whData?.results ?? (Array.isArray(whData) ? whData : [])
  const inbound = inbData?.results ?? (Array.isArray(inbData) ? inbData : [])
  const apiKeys = keysData?.results ?? (Array.isArray(keysData) ? keysData : [])

  /* ── handlers ── */
  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!keyLabel.trim()) return
    setIsCreatingKey(true)
    setModalError('')
    try {
      const res = await api.post('/integration/api-keys/', { label: keyLabel })
      setGeneratedKey(res.data.token)
      refetchKeys()
    } catch (err: any) {
      console.error(err)
      setModalError('Failed to generate API Key. Please try again.')
    } finally {
      setIsCreatingKey(false)
    }
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKeyId(id)
    showSnackbar('Copied to clipboard', 'success')
    setTimeout(() => setCopiedKeyId(null), 2000)
  }

  const handleRevokeKey = async (id: string) => {
    const confirmed = await confirm({
      title: 'Revoke API Key',
      message: 'Are you sure you want to revoke this API key? External integrations using this key will immediately fail.',
      confirmLabel: 'Revoke',
      confirmColor: 'error',
    })
    if (!confirmed) return
    try {
      await api.delete(`/integration/api-keys/${id}/`)
      refetchKeys()
      showSnackbar('API key revoked', 'success')
    } catch (err) {
      console.error(err)
      showSnackbar('Failed to revoke API key', 'error')
    }
  }

  const openGenerateModal = () => {
    setKeyLabel('')
    setGeneratedKey(null)
    setModalError('')
    setIsModalOpen(true)
  }

  /* ── column definitions ── */
  const connectionColumns: Column<any>[] = useMemo(() => [
    {
      id: 'label',
      label: 'Label',
      render: (row) => (
        <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
          {row.label}
        </Typography>
      ),
    },
    {
      id: 'connector_type',
      label: 'Connector Type',
      render: (row) => (
        <Chip
          label={row.connector_type?.replace(/_/g, ' ')}
          color={CONNECTOR_COLOR[row.connector_type] ?? 'default'}
          size="small"
          variant="filled"
        />
      ),
    },
    {
      id: 'status',
      label: 'Status',
      render: (row) => <StatusChip status={row.status} />,
    },
    {
      id: 'created_at',
      label: 'Created',
      render: (row) => formatDate(row.created_at),
    },
    {
      id: 'updated_at',
      label: 'Updated',
      render: (row) => formatDate(row.updated_at),
    },
  ], [])

  const webhookColumns: Column<any>[] = useMemo(() => [
    {
      id: 'event_type',
      label: 'Event Type',
      render: (row) => (
        <Typography variant="body2" color="text.primary" sx={{ fontSize: 12, fontWeight: 500 }}>
          {row.event_type}
        </Typography>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      render: (row) => <StatusChip status={row.status} />,
    },
    {
      id: 'attempt_count',
      label: 'Attempts',
      render: (row) => row.attempt_count ?? 0,
    },
    {
      id: 'last_response_code',
      label: 'Last Response',
      render: (row) =>
        row.last_response_code ? (
          <Chip
            label={row.last_response_code}
            color={row.last_response_code < 300 ? 'success' : 'error'}
            size="small"
            variant="filled"
          />
        ) : (
          '\u2014'
        ),
    },
    {
      id: 'delivered_at',
      label: 'Delivered At',
      render: (row) => formatETDate(row.delivered_at),
    },
  ], [])

  const inboundColumns: Column<any>[] = useMemo(() => [
    {
      id: 'event_type',
      label: 'Event Type',
      render: (row) => (
        <Typography variant="body2" color="text.primary" sx={{ fontSize: 12, fontWeight: 500 }}>
          {row.event_type}
        </Typography>
      ),
    },
    {
      id: 'provider_event_id',
      label: 'Provider Event ID',
      render: (row) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 11 }}>
          {row.provider_event_id?.slice(0, 20)}{'\u2026'}
        </Typography>
      ),
    },
    {
      id: 'signature_verified',
      label: 'Sig Verified',
      render: (row) =>
        row.signature_verified ? (
          <StatusChip status="active" label="Verified" />
        ) : (
          <StatusChip status="failed" label="Unverified" />
        ),
    },
    {
      id: 'is_duplicate',
      label: 'Duplicate',
      render: (row) =>
        row.is_duplicate ? (
          <StatusChip status="pending" label="Duplicate" />
        ) : (
          <StatusChip status="unknown" label="Unique" />
        ),
    },
    {
      id: 'processing_status',
      label: 'Processing Status',
      render: (row) => <StatusChip status={row.processing_status} />,
    },
    {
      id: 'received_at',
      label: 'Received At',
      render: (row) => formatETDate(row.received_at),
    },
  ], [])

  const apiKeyColumns: Column<any>[] = useMemo(() => [
    {
      id: 'label',
      label: 'Label',
      render: (row) => (
        <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
          {row.label}
        </Typography>
      ),
    },
    {
      id: 'token',
      label: 'API Key / Token',
      sortable: false,
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            component="code"
            variant="body2"
            sx={{
              fontFamily: 'monospace',
              fontSize: 12,
              bgcolor: 'action.hover',
              px: 0.75,
              py: 0.25,
              borderRadius: 1,
            }}
          >
            {row.token}
          </Typography>
          <Tooltip title="Copy API Key">
            <IconButton size="small" onClick={() => handleCopy(row.token, row.id)}>
              {copiedKeyId === row.id ? (
                <CheckIcon fontSize="small" color="success" />
              ) : (
                <ContentCopyIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
    {
      id: 'created_at',
      label: 'Created At',
      render: (row) => formatETDate(row.created_at),
    },
    {
      id: 'last_used_at',
      label: 'Last Used',
      render: (row) => (row.last_used_at ? formatETDate(row.last_used_at) : 'Never'),
    },
    {
      id: 'is_active',
      label: 'Status',
      render: (row) => (
        <StatusChip
          status={row.is_active ? 'active' : 'inactive'}
          label={row.is_active ? 'Active' : 'Revoked'}
        />
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      sortable: false,
      align: 'right' as const,
      width: 80,
      render: (row) => (
        <Tooltip title="Revoke Key">
          <IconButton size="small" color="error" onClick={() => handleRevokeKey(row.id)}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ], [copiedKeyId])

  /* ── render ── */
  return (
    <Box>
      <PageHeader
        title="Integration"
        subtitle="External connections, webhooks, and B2B API access keys."
        actions={
          tab === 'api-keys' ? (
            <Button
              variant="contained"
              startIcon={<VpnKeyOutlinedIcon />}
              onClick={openGenerateModal}
            >
              Generate B2B API Key
            </Button>
          ) : undefined
        }
      />

      <Tabs
        value={tab}
        onChange={(_, v: TabValue) => setTab(v)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Connections" value="connections" />
        <Tab label="Outbound Webhooks" value="webhooks" />
        <Tab label="Inbound Receipts" value="inbound" />
        <Tab label="B2B API Keys" value="api-keys" />
      </Tabs>

      {/* ── Connections Tab ── */}
      {tab === 'connections' && (
        <DataTable
          columns={connectionColumns}
          rows={connections}
          loading={cLoading}
          rowKey={(row) => row.id}
          emptyMessage="No external connections"
          emptyIcon={<PowerOutlinedIcon sx={{ fontSize: 48 }} />}
        />
      )}

      {/* ── Outbound Webhooks Tab ── */}
      {tab === 'webhooks' && (
        <DataTable
          columns={webhookColumns}
          rows={webhooks}
          loading={wLoading}
          rowKey={(row) => row.id}
          emptyMessage="No outbound webhook deliveries"
          emptyIcon={<WebhookIcon sx={{ fontSize: 48 }} />}
        />
      )}

      {/* ── Inbound Receipts Tab ── */}
      {tab === 'inbound' && (
        <DataTable
          columns={inboundColumns}
          rows={inbound}
          loading={iLoading}
          rowKey={(row) => row.id}
          emptyMessage="No inbound webhook receipts"
          emptyIcon={<CallReceivedIcon sx={{ fontSize: 48 }} />}
        />
      )}

      {/* ── B2B API Keys Tab ── */}
      {tab === 'api-keys' && (
        <DataTable
          columns={apiKeyColumns}
          rows={apiKeys}
          loading={kLoading}
          rowKey={(row) => row.id}
          emptyMessage="No B2B API Keys"
          emptyIcon={<VpnKeyOutlinedIcon sx={{ fontSize: 48 }} />}
        />
      )}

      {/* ── API Key Generation Dialog ── */}
      <Dialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Generate B2B API Key
          <IconButton size="small" onClick={() => setIsModalOpen(false)} edge="end">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {modalError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {modalError}
            </Alert>
          )}

          {!generatedKey ? (
            <Box component="form" id="generate-key-form" onSubmit={handleGenerateKey}>
              <TextField
                label="Key Description / Label"
                placeholder="e.g. Telco Cellular Accessories Storefront"
                value={keyLabel}
                onChange={(e) => setKeyLabel(e.target.value)}
                required
                fullWidth
                size="small"
                helperText="Give the key a descriptive name representing what external client or system will use it."
              />
            </Box>
          ) : (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                API Key generated successfully! Make sure to copy it now. For security, we won't show it again.
              </Alert>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                API Key
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  value={generatedKey}
                  slotProps={{ input: { readOnly: true } }}
                  fullWidth
                  size="small"
                  sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: 13 } }}
                />
                <Button
                  variant="outlined"
                  startIcon={
                    copiedKeyId === 'modal' ? (
                      <CheckIcon color="success" />
                    ) : (
                      <ContentCopyIcon />
                    )
                  }
                  onClick={() => handleCopy(generatedKey, 'modal')}
                  sx={{ flexShrink: 0 }}
                >
                  {copiedKeyId === 'modal' ? 'Copied' : 'Copy'}
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          {!generatedKey ? (
            <>
              <Button variant="text" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                form="generate-key-form"
                variant="contained"
                disabled={isCreatingKey}
                startIcon={isCreatingKey ? <CircularProgress size={16} color="inherit" /> : undefined}
              >
                {isCreatingKey ? 'Generating...' : 'Generate Key'}
              </Button>
            </>
          ) : (
            <Button variant="contained" onClick={() => setIsModalOpen(false)}>
              I have copied the key
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <ConfirmDialog {...dialogProps} />
    </Box>
  )
}
