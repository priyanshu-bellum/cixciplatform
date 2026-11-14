import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Paper from '@mui/material/Paper'
import PowerOutlinedIcon from '@mui/icons-material/PowerOutlined'
import WebhookIcon from '@mui/icons-material/Webhook'
import CallReceivedIcon from '@mui/icons-material/CallReceived'
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckIcon from '@mui/icons-material/Check'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import CloseIcon from '@mui/icons-material/Close'
import StorefrontIcon from '@mui/icons-material/Storefront'
import SyncIcon from '@mui/icons-material/Sync'
import MenuItem from '@mui/material/MenuItem'
import api from '../lib/apiClient'
import PageHeader from '../components/layout/PageHeader'
import DataTable, { type Column } from '../components/data-display/DataTable'
import StatusChip from '../components/data-display/StatusChip'
import { formatDate, formatETDate } from '../lib/formatters'
import { useSnackbar } from '../components/feedback/SnackbarProvider'
import { useConfirmDialog } from '../hooks/useConfirmDialog'
import ConfirmDialog from '../components/feedback/ConfirmDialog'
import { useAuthStore } from '../stores/authStore'
import { Link } from 'react-router-dom'

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

type TabValue = 'connections' | 'webhooks' | 'inbound' | 'api-keys' | 'commerce'

const ADAPTER_LABELS: Record<string, string> = {
  generic_json: 'Generic REST/JSON',
  balaji: 'Balaji Wireless',
}
const MODE_LABELS: Record<string, string> = {
  preview: 'Preview (Dry-run)',
  test: 'Test (Sandbox)',
  live: 'Live (Production)',
}

export default function IntegrationPage() {
  const [tab, setTab] = useState<TabValue>('connections')
  const { showSnackbar } = useSnackbar()
  const { confirm, dialogProps } = useConfirmDialog()
  const { user } = useAuthStore()
  const isCixciAdmin = user?.is_cixci_admin || user?.company_type === 'cixci_internal'

  const queryClient = useQueryClient()

  // API Key creation / modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [keyLabel, setKeyLabel] = useState('')
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null)
  const [isCreatingKey, setIsCreatingKey] = useState(false)
  const [modalError, setModalError] = useState('')

  // Commerce profile modal state
  const [commerceModalOpen, setCommerceModalOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<any>(null)
  const [commerceForm, setCommerceForm] = useState({
    connection: '',
    vendor_company: '',
    adapter: 'generic_json',
    mode: 'preview',
    order_enabled: false,
    webhook_enabled: false,
    polling_enabled: false,
    webhook_secret: '',
  })
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [commerceError, setCommerceError] = useState('')

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

  const { data: commerceData, isLoading: cpLoading } = useQuery({
    queryKey: ['integration-commerce-profiles'],
    queryFn: () => api.get('/integration/vendor-commerce-profiles/').then(r => r.data),
    enabled: tab === 'commerce',
  })

  const { data: companiesData } = useQuery({
    queryKey: ['integration-companies'],
    queryFn: () => api.get('/tenant/companies/', { params: { paginate: 'false' } }).then(r => r.data),
    enabled: (tab === 'api-keys' || tab === 'commerce') && isCixciAdmin,
  })
  const companies = Array.isArray(companiesData) ? companiesData : companiesData?.results ?? []

  const connections = connData?.results ?? (Array.isArray(connData) ? connData : [])
  const webhooks = whData?.results ?? (Array.isArray(whData) ? whData : [])
  const inbound = inbData?.results ?? (Array.isArray(inbData) ? inbData : [])
  const apiKeys = keysData?.results ?? (Array.isArray(keysData) ? keysData : [])
  const commerceProfiles = commerceData?.results ?? (Array.isArray(commerceData) ? commerceData : [])
  const vendorConnections = connections.filter((c: any) => c.connector_type === 'rest_api')
  const vendorCompanies = companies.filter((c: any) => c.company_type === 'vendor')

  /* ── handlers ── */
  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!keyLabel.trim() || !selectedCompanyId) return
    setIsCreatingKey(true)
    setModalError('')
    try {
      const res = await api.post('/integration/api-keys/', {
        label: keyLabel,
        company_scope_reference: selectedCompanyId,
      })
      setGeneratedKey(res.data.token)
      refetchKeys()
    } catch (err: any) {
      console.error(err)
      const detail = err?.response?.data?.detail || err?.response?.data?.company_scope_reference?.[0]
      setModalError(detail || 'Failed to generate API Key. Please try again.')
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
    setSelectedCompanyId('')
    setGeneratedKey(null)
    setModalError('')
    setIsModalOpen(true)
  }

  /* ── commerce profile handlers ── */
  const openCommerceCreate = () => {
    setEditingProfile(null)
    setCommerceForm({
      connection: '', vendor_company: '', adapter: 'generic_json', mode: 'preview',
      order_enabled: false, webhook_enabled: false, polling_enabled: false, webhook_secret: '',
    })
    setCommerceError('')
    setCommerceModalOpen(true)
  }

  const openCommerceEdit = (profile: any) => {
    setEditingProfile(profile)
    setCommerceForm({
      connection: profile.connection || '',
      vendor_company: profile.vendor_company || '',
      adapter: profile.adapter || 'generic_json',
      mode: profile.mode || 'preview',
      order_enabled: !!profile.order_enabled,
      webhook_enabled: !!profile.webhook_enabled,
      polling_enabled: !!profile.polling_enabled,
      webhook_secret: '',
    })
    setCommerceError('')
    setCommerceModalOpen(true)
  }

  const handleSaveCommerceProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingProfile(true)
    setCommerceError('')
    try {
      const payload: any = { ...commerceForm }
      if (!payload.webhook_secret) delete payload.webhook_secret
      if (editingProfile) {
        delete payload.connection
        delete payload.vendor_company
        await api.patch(`/integration/vendor-commerce-profiles/${editingProfile.id}/`, payload)
        showSnackbar('Commerce profile updated', 'success')
      } else {
        await api.post('/integration/vendor-commerce-profiles/', payload)
        showSnackbar('Commerce profile created', 'success')
      }
      queryClient.invalidateQueries({ queryKey: ['integration-commerce-profiles'] })
      setCommerceModalOpen(false)
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.response?.data?.non_field_errors?.[0]
        || JSON.stringify(err?.response?.data) || 'Failed to save commerce profile.'
      setCommerceError(detail)
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleTriggerPoll = async (profileId: string) => {
    try {
      await api.post(`/integration/vendor-commerce-profiles/${profileId}/poll_now/`)
      showSnackbar('Shipment poll triggered', 'success')
    } catch (err: any) {
      showSnackbar(err?.response?.data?.polling_enabled?.[0] || 'Failed to trigger poll', 'error')
    }
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

  const apiKeyColumns: Column<any>[] = useMemo(() => {
    const cols: Column<any>[] = [
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
        id: 'company_name',
        label: 'Company',
        render: (row) => row.company_name || '\u2014',
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
    ]
    if (isCixciAdmin) {
      cols.push({
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
      })
    }
    return cols
  }, [copiedKeyId, isCixciAdmin])

  const commerceColumns: Column<any>[] = useMemo(() => [
    {
      id: 'vendor_name',
      label: 'Vendor',
      render: (row) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.vendor_name || '—'}</Typography>
          <Typography variant="caption" color="text.disabled">{row.connection_label}</Typography>
        </Box>
      ),
    },
    {
      id: 'adapter',
      label: 'Adapter',
      render: (row) => (
        <Chip label={ADAPTER_LABELS[row.adapter] || row.adapter} size="small" variant="outlined" />
      ),
    },
    {
      id: 'mode',
      label: 'Mode',
      render: (row) => (
        <Chip
          label={MODE_LABELS[row.mode] || row.mode}
          size="small"
          color={row.mode === 'live' ? 'success' : row.mode === 'test' ? 'warning' : 'default'}
          variant="filled"
        />
      ),
    },
    {
      id: 'capabilities',
      label: 'Capabilities',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {row.order_enabled && <Chip label="Orders" size="small" color="info" variant="outlined" />}
          {row.webhook_enabled && <Chip label="Webhook" size="small" color="secondary" variant="outlined" />}
          {row.polling_enabled && <Chip label="Polling" size="small" color="default" variant="outlined" />}
          {!row.order_enabled && !row.webhook_enabled && !row.polling_enabled && (
            <Typography variant="caption" color="text.disabled">None enabled</Typography>
          )}
        </Box>
      ),
    },
    {
      id: 'webhook_url',
      label: 'Webhook URL',
      render: (row) => row.webhook_url ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography sx={{ fontFamily: 'monospace', fontSize: 11 }}>{row.webhook_url}</Typography>
          <IconButton size="small" onClick={() => handleCopy(row.webhook_url, `wh-${row.id}`)}>
            {copiedKeyId === `wh-${row.id}` ? <CheckIcon fontSize="small" color="success" /> : <ContentCopyIcon sx={{ fontSize: 14 }} />}
          </IconButton>
        </Box>
      ) : '—',
    },
    {
      id: 'actions',
      label: 'Actions',
      sortable: false,
      align: 'right' as const,
      width: 140,
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
          {row.polling_enabled && (
            <Tooltip title="Trigger Poll Now">
              <IconButton size="small" color="primary" onClick={() => handleTriggerPoll(row.id)}>
                <SyncIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Button size="small" variant="outlined" onClick={() => openCommerceEdit(row)} sx={{ fontSize: 11, textTransform: 'none' }}>
            Edit
          </Button>
        </Box>
      ),
    },
  ], [copiedKeyId])

  /* ── render ── */
  return (
    <Box>
      <PageHeader
        title="Integration"
        subtitle="External connections, webhooks, and B2B API access keys."
        actions={isCixciAdmin ? <>
            <Button component={Link} to="/settings/vendor-integrations" variant="outlined">Vendor Catalog APIs</Button>
          {tab === 'api-keys' ? (
            <Button
              variant="contained"
              startIcon={<VpnKeyOutlinedIcon />}
              onClick={openGenerateModal}
            >
              Generate B2B API Key
            </Button>
          ) : null}</> : undefined
        }
      />

      <Tabs
        value={tab}
        onChange={(_, v: TabValue) => setTab(v)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Connections" value="connections" />
        {isCixciAdmin && <Tab label="Commerce Profiles" value="commerce" />}
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

      {/* ── Commerce Profiles Tab ── */}
      {tab === 'commerce' && isCixciAdmin && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
            <Button variant="contained" startIcon={<StorefrontIcon />} onClick={openCommerceCreate} sx={{ textTransform: 'none' }}>
              Add Commerce Profile
            </Button>
          </Box>
          <DataTable
            columns={commerceColumns}
            rows={commerceProfiles}
            loading={cpLoading}
            rowKey={(row) => row.id}
            emptyMessage="No vendor commerce profiles configured"
            emptyIcon={<StorefrontIcon sx={{ fontSize: 48 }} />}
          />
        </Box>
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
        <Box>
        <Alert severity="info" sx={{ mb: 2 }}>API keys belong to the company and can support its authorized users. Send X-CIXCI-Entity with the authorized Entity ID to select a store/entity. A single eligible entity is selected automatically; requests never combine other entities.</Alert>
        <DataTable
          columns={apiKeyColumns}
          rows={apiKeys}
          loading={kLoading}
          rowKey={(row) => row.id}
          emptyMessage="No B2B API Keys"
          emptyIcon={<VpnKeyOutlinedIcon sx={{ fontSize: 48 }} />}
        />
        </Box>
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
            <Box component="form" id="generate-key-form" onSubmit={handleGenerateKey} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                select
                label="Company"
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                required
                fullWidth
                size="small"
                helperText="Select the company this API key will authenticate as."
              >
                {companies.map((co: any) => (
                  <MenuItem key={co.id} value={co.id}>
                    {co.name} ({co.company_type?.replace(/_/g, ' ')})
                  </MenuItem>
                ))}
              </TextField>
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
                disabled={isCreatingKey || !selectedCompanyId}
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

      {/* ── Commerce Profile Dialog ── */}
      <Dialog open={commerceModalOpen} onClose={() => setCommerceModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {editingProfile ? 'Edit Commerce Profile' : 'Add Commerce Profile'}
          <IconButton size="small" onClick={() => setCommerceModalOpen(false)} edge="end"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {commerceError && <Alert severity="error" sx={{ mb: 2 }}>{commerceError}</Alert>}
          <Box component="form" id="commerce-form" onSubmit={handleSaveCommerceProfile} sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {!editingProfile && (
              <>
                <TextField
                  select label="Vendor Company" value={commerceForm.vendor_company} required fullWidth size="small"
                  onChange={(e) => setCommerceForm(f => ({ ...f, vendor_company: e.target.value }))}
                  helperText="The vendor company this profile connects to."
                >
                  {vendorCompanies.map((co: any) => (
                    <MenuItem key={co.id} value={co.id}>{co.name}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  select label="Connection" value={commerceForm.connection} required fullWidth size="small"
                  onChange={(e) => setCommerceForm(f => ({ ...f, connection: e.target.value }))}
                  helperText="The vendor catalog API connection to use."
                >
                  {vendorConnections.map((c: any) => (
                    <MenuItem key={c.id} value={c.id}>{c.label}</MenuItem>
                  ))}
                </TextField>
              </>
            )}
            <TextField
              select label="Adapter" value={commerceForm.adapter} required fullWidth size="small"
              onChange={(e) => setCommerceForm(f => ({ ...f, adapter: e.target.value }))}
              helperText="API adapter determines field mappings and authentication."
            >
              <MenuItem value="generic_json">Generic REST/JSON</MenuItem>
              <MenuItem value="balaji">Balaji Wireless</MenuItem>
            </TextField>
            <TextField
              select label="Execution Mode" value={commerceForm.mode} required fullWidth size="small"
              onChange={(e) => setCommerceForm(f => ({ ...f, mode: e.target.value }))}
            >
              <MenuItem value="preview">Preview (Dry-run only)</MenuItem>
              <MenuItem value="test">Test (Sandbox orders)</MenuItem>
              <MenuItem value="live">Live (Production orders)</MenuItem>
            </TextField>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Capabilities</Typography>
              <FormControlLabel
                control={<Switch checked={commerceForm.order_enabled} onChange={(e) => setCommerceForm(f => ({ ...f, order_enabled: e.target.checked }))} size="small" />}
                label={<Typography variant="body2">Order Dispatch</Typography>}
              />
              <FormControlLabel
                control={<Switch checked={commerceForm.webhook_enabled} onChange={(e) => setCommerceForm(f => ({ ...f, webhook_enabled: e.target.checked }))} size="small" />}
                label={<Typography variant="body2">Inbound Webhooks</Typography>}
              />
              <FormControlLabel
                control={<Switch checked={commerceForm.polling_enabled} onChange={(e) => setCommerceForm(f => ({ ...f, polling_enabled: e.target.checked }))} size="small" />}
                label={<Typography variant="body2">Shipment Polling</Typography>}
              />
            </Paper>

            {commerceForm.webhook_enabled && (
              <TextField
                label="Webhook Signing Secret" type="password" fullWidth size="small"
                value={commerceForm.webhook_secret}
                onChange={(e) => setCommerceForm(f => ({ ...f, webhook_secret: e.target.value }))}
                helperText={editingProfile?.has_webhook_secret
                  ? 'Leave blank to keep existing secret. Enter a new value to replace it.'
                  : 'Required when webhooks are enabled.'}
              />
            )}

            {editingProfile?.webhook_url && (
              <Alert severity="info" icon={<WebhookIcon />}>
                Webhook endpoint: <code>{editingProfile.webhook_url}</code>
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button variant="text" onClick={() => setCommerceModalOpen(false)}>Cancel</Button>
          <Button
            type="submit" form="commerce-form" variant="contained"
            disabled={isSavingProfile}
            startIcon={isSavingProfile ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {isSavingProfile ? 'Saving...' : (editingProfile ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog {...dialogProps} />
    </Box>
  )
}
