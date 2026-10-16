import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import AddIcon from '@mui/icons-material/Add'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import api from '../lib/apiClient'
import { formatDate } from '../lib/formatters'
import PageHeader from '../components/layout/PageHeader'
import StatusChip from '../components/data-display/StatusChip'
import DataTable, { type Column } from '../components/data-display/DataTable'

export default function LaunchPage() {
  const [tab, setTab] = useState<'events' | 'detail'>('events')
  const [selected, setSelected] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['launch-events'],
    queryFn: () => api.get('/launch/events/').then(r => r.data),
  })

  const events = data?.results ?? (Array.isArray(data) ? data : [])

  function openDetail(ev: any) {
    setSelected(ev)
    setTab('detail')
  }

  const columns: Column<any>[] = [
    {
      id: 'name',
      label: 'Name',
      render: (row) => (
        <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>
          {row.name}
        </Typography>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      render: (row) => <StatusChip status={row.status ?? 'unknown'} />,
    },
    {
      id: 'target_launch_date',
      label: 'Target Launch',
      render: (row) => formatDate(row.target_launch_date),
    },
    {
      id: 'products',
      label: 'Products',
      sortable: false,
      render: (row) => row.product_readiness_references?.length ?? 0,
    },
    {
      id: 'devices',
      label: 'Devices',
      sortable: false,
      render: (row) => row.device_readiness_references?.length ?? 0,
    },
    {
      id: 'pricing_refs',
      label: 'Pricing Refs',
      sortable: false,
      render: (row) => row.pricing_readiness_references?.length ?? 0,
    },
    {
      id: 'created_at',
      label: 'Created',
      render: (row) => formatDate(row.created_at),
    },
    {
      id: 'actions',
      label: '',
      sortable: false,
      render: () => <CheckCircleIcon fontSize="small" sx={{ color: 'text.disabled' }} />,
    },
  ]

  return (
    <Box>
      <PageHeader
        title="Launch & Events"
        subtitle="Product launch coordination — readiness aggregation across products, devices, and pricing"
        actions={
          <Button variant="contained" startIcon={<AddIcon />}>
            New Launch Event
          </Button>
        }
      />

      <Tabs
        value={tab}
        onChange={(_, newValue) => setTab(newValue)}
        sx={{ mb: 2 }}
      >
        <Tab label="Launch Events" value="events" />
        {selected && (
          <Tab label={selected.name} value="detail" />
        )}
      </Tabs>

      {tab === 'events' && (
        <DataTable
          columns={columns}
          rows={events}
          loading={isLoading}
          emptyMessage="No launch events"
          emptyIcon={<RocketLaunchIcon sx={{ fontSize: 48 }} />}
          rowKey={(row) => String(row.id)}
          onRowClick={openDetail}
        />
      )}

      {tab === 'detail' && selected && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  {selected.name}
                </Typography>
                <StatusChip status={selected.status ?? 'unknown'} />
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                  gap: 2,
                }}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Target Launch Date
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>
                    {selected.target_launch_date
                      ? formatDate(selected.target_launch_date)
                      : 'TBD'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Created
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(selected.created_at)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Updated
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(selected.updated_at)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              gap: 2,
            }}
          >
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                  Product Readiness
                </Typography>
                {(selected.product_readiness_references ?? []).length === 0 ? (
                  <Typography variant="caption" color="text.disabled">
                    No product references
                  </Typography>
                ) : (
                  (selected.product_readiness_references ?? []).map((ref: string) => (
                    <Typography
                      key={ref}
                      variant="caption"
                      sx={{ fontFamily: 'monospace', color: 'text.secondary', display: 'block', mb: 0.5 }}
                    >
                      {ref}
                    </Typography>
                  ))
                )}
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                  Device Readiness
                </Typography>
                {(selected.device_readiness_references ?? []).length === 0 ? (
                  <Typography variant="caption" color="text.disabled">
                    No device references
                  </Typography>
                ) : (
                  (selected.device_readiness_references ?? []).map((ref: string) => (
                    <Typography
                      key={ref}
                      variant="caption"
                      sx={{ fontFamily: 'monospace', color: 'text.secondary', display: 'block', mb: 0.5 }}
                    >
                      {ref}
                    </Typography>
                  ))
                )}
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                  Pricing Readiness
                </Typography>
                {(selected.pricing_readiness_references ?? []).length === 0 ? (
                  <Typography variant="caption" color="text.disabled">
                    No pricing references
                  </Typography>
                ) : (
                  (selected.pricing_readiness_references ?? []).map((ref: string) => (
                    <Typography
                      key={ref}
                      variant="caption"
                      sx={{ fontFamily: 'monospace', color: 'text.secondary', display: 'block', mb: 0.5 }}
                    >
                      {ref}
                    </Typography>
                  ))
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>
      )}
    </Box>
  )
}
