import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined'
import SendOutlinedIcon from '@mui/icons-material/SendOutlined'
import api from '../lib/apiClient'
import PageHeader from '../components/layout/PageHeader'
import DataTable, { type Column } from '../components/data-display/DataTable'
import StatusChip from '../components/data-display/StatusChip'
import { formatDate, formatETDate } from '../lib/formatters'

/* ── Channel display names ── */
const CHAN: Record<string, string> = {
  email: 'Email',
  in_app: 'In-App',
  sms: 'SMS',
  webhook: 'Webhook',
  push: 'Push',
}

/* ── Preference-outcome → MUI Chip color ── */
const PREF_COLOR: Record<string, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
  send: 'success',
  block: 'error',
  delay: 'warning',
  digest: 'info',
  review_required: 'warning',
  suppress: 'default',
}

/* ── Delivery status → MUI Chip color ── */
const DELIVERY_COLOR: Record<string, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
  requested: 'default',
  queued: 'info',
  sent: 'info',
  delivered: 'success',
  failed: 'error',
  bounced: 'error',
  suppressed: 'warning',
  delayed: 'warning',
  expired: 'default',
  cancelled: 'default',
  superseded: 'default',
}

/* ── Tab index helper ── */
const TAB_VALUES = ['templates', 'requests', 'delivery'] as const
type TabValue = typeof TAB_VALUES[number]

export default function NotificationsPage() {
  const [tab, setTab] = useState<TabValue>('templates')

  /* ── Queries (unchanged business logic) ── */
  const { data: tplData, isLoading: tLoading } = useQuery({
    queryKey: ['notif-templates'],
    queryFn: () => api.get('/notifications/templates/').then(r => r.data),
  })

  const { data: reqData, isLoading: rLoading } = useQuery({
    queryKey: ['notif-requests'],
    queryFn: () => api.get('/notifications/requests/').then(r => r.data),
    enabled: tab === 'requests',
  })

  const { data: dlvData, isLoading: dLoading } = useQuery({
    queryKey: ['notif-delivery'],
    queryFn: () =>
      api.get('/notifications/delivery-attempts/').then(r => r.data),
    enabled: tab === 'delivery',
  })

  const templates = tplData?.results ?? (Array.isArray(tplData) ? tplData : [])
  const requests = reqData?.results ?? (Array.isArray(reqData) ? reqData : [])
  const attempts = dlvData?.results ?? (Array.isArray(dlvData) ? dlvData : [])

  /* ── Column definitions ── */
  const templateColumns = useMemo<Column<any>[]>(() => [
    {
      id: 'template_code',
      label: 'Code',
      render: (row) => (
        <Typography
          variant="body2"
          sx={{ fontFamily: 'monospace', fontWeight: 500, color: 'text.primary', fontSize: 12 }}
        >
          {row.template_code}
        </Typography>
      ),
    },
    {
      id: 'channel',
      label: 'Channel',
      render: (row) => (
        <Chip label={CHAN[row.channel] ?? row.channel} color="info" size="small" variant="filled" />
      ),
    },
    {
      id: 'event_type',
      label: 'Event Type',
      render: (row) => (
        <Typography
          variant="body2"
          noWrap
          sx={{ color: 'text.secondary', fontSize: 12, maxWidth: 240 }}
        >
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
      id: 'version',
      label: 'Version',
      render: (row) => `v${row.version ?? 1}`,
    },
    {
      id: 'locale',
      label: 'Locale',
      render: (row) => row.locale ?? 'en',
    },
  ], [])

  const requestColumns = useMemo<Column<any>[]>(() => [
    {
      id: 'event_type',
      label: 'Event Type',
      render: (row) => (
        <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500, fontSize: 12 }}>
          {row.event_type}
        </Typography>
      ),
    },
    {
      id: 'source_module',
      label: 'Source Module',
      render: (row) => (
        <Chip label={row.source_module} color="default" size="small" variant="filled" />
      ),
    },
    {
      id: 'channel',
      label: 'Channel',
      render: (row) => (
        <Chip label={CHAN[row.channel] ?? row.channel} color="info" size="small" variant="filled" />
      ),
    },
    {
      id: 'preference_outcome',
      label: 'Preference Outcome',
      render: (row) =>
        row.preference_outcome ? (
          <Chip
            label={row.preference_outcome}
            color={PREF_COLOR[row.preference_outcome] ?? 'default'}
            size="small"
            variant="filled"
          />
        ) : (
          <Chip label="pending" color="warning" size="small" variant="filled" />
        ),
    },
    {
      id: 'created_at',
      label: 'Created',
      render: (row) => formatDate(row.created_at),
    },
  ], [])

  const deliveryColumns = useMemo<Column<any>[]>(() => [
    {
      id: 'channel',
      label: 'Channel',
      render: (row) => (
        <Chip label={CHAN[row.channel] ?? row.channel} color="info" size="small" variant="filled" />
      ),
    },
    {
      id: 'status',
      label: 'Status',
      render: (row) => (
        <Chip
          label={row.status}
          color={DELIVERY_COLOR[row.status] ?? 'default'}
          size="small"
          variant="filled"
        />
      ),
    },
    {
      id: 'provider_name',
      label: 'Provider',
      render: (row) => row.provider_name || '\u2014',
    },
    {
      id: 'attempt_number',
      label: 'Attempt',
      render: (row) => (
        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 12 }}>
          {row.attempt_number ?? 1} / {row.max_attempts ?? 3}
        </Typography>
      ),
    },
    {
      id: 'sent_at',
      label: 'Sent At',
      render: (row) => formatETDate(row.sent_at),
    },
    {
      id: 'created_at',
      label: 'Created',
      render: (row) => formatDate(row.created_at),
    },
  ], [])

  return (
    <Box>
      <PageHeader
        title="Notifications"
        subtitle="Templates, delivery requests, and 10-step preference resolution"
      />

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v: TabValue) => setTab(v)}
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab label="Templates" value="templates" />
          <Tab label="Requests" value="requests" />
          <Tab label="Delivery Attempts" value="delivery" />
        </Tabs>
      </Box>

      {tab === 'templates' && (
        <DataTable
          columns={templateColumns}
          rows={templates}
          loading={tLoading}
          rowKey={(row) => row.id}
          emptyMessage="No notification templates"
          emptyIcon={<DescriptionOutlinedIcon sx={{ fontSize: 48 }} />}
        />
      )}

      {tab === 'requests' && (
        <DataTable
          columns={requestColumns}
          rows={requests}
          loading={rLoading}
          rowKey={(row) => row.id}
          emptyMessage="No notification requests"
          emptyIcon={<NotificationsOutlinedIcon sx={{ fontSize: 48 }} />}
        />
      )}

      {tab === 'delivery' && (
        <DataTable
          columns={deliveryColumns}
          rows={attempts}
          loading={dLoading}
          rowKey={(row) => row.id}
          emptyMessage="No delivery attempts recorded"
          emptyIcon={<SendOutlinedIcon sx={{ fontSize: 48 }} />}
        />
      )}
    </Box>
  )
}
