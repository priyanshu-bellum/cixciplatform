import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import BarChartIcon from '@mui/icons-material/BarChart'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import TimelineIcon from '@mui/icons-material/Timeline'
import api from '../lib/apiClient'
import PageHeader from '../components/layout/PageHeader'
import DataTable, { type Column } from '../components/data-display/DataTable'
import StatusChip from '../components/data-display/StatusChip'
import { formatDate } from '../lib/formatters'

const formatDateTime = (dateStr: string | null | undefined): string => {
  return formatDate(dateStr)
}

export default function AnalyticsPage() {
  const [tab, setTab] = useState<'metrics' | 'windows' | 'aggregations'>('metrics')

  const { data: metricData, isLoading: mLoading } = useQuery({
    queryKey: ['analytics-metrics'],
    queryFn: () => api.get('/analytics/metrics/').then(r => r.data),
  })

  const { data: windowData, isLoading: wLoading } = useQuery({
    queryKey: ['analytics-windows'],
    queryFn: () => api.get('/analytics/summary-windows/').then(r => r.data),
    enabled: tab === 'windows' || tab === 'aggregations',
  })

  const windows = windowData?.results ?? (Array.isArray(windowData) ? windowData : [])

  const { data: aggData, isLoading: aLoading } = useQuery({
    queryKey: ['analytics-aggregations', windows],
    queryFn: async () => {
      // Aggregations are nested under each summary-window
      const allAggs: any[] = []
      for (const w of windows) {
        try {
          const res = await api.get(`/analytics/summary-windows/${w.id}/aggregations/`)
          const items = res.data?.results ?? (Array.isArray(res.data) ? res.data : [])
          allAggs.push(...items)
        } catch { /* skip windows with no aggregations */ }
      }
      return allAggs
    },
    enabled: tab === 'aggregations' && windows.length > 0,
  })

  const metrics = metricData?.results ?? (Array.isArray(metricData) ? metricData : [])
  const aggregations = aggData?.results ?? (Array.isArray(aggData) ? aggData : [])

  const metricColumns = useMemo<Column<any>[]>(() => [
    {
      id: 'code',
      label: 'Code',
      render: (m) => (
        <Typography
          variant="body2"
          sx={{ fontFamily: 'monospace', color: 'text.primary', fontWeight: 500, fontSize: 12 }}
        >
          {m.code}
        </Typography>
      ),
    },
    {
      id: 'label',
      label: 'Label',
    },
    {
      id: 'source_module',
      label: 'Source Module',
      render: (m) => <StatusChip status="unknown" label={m.source_module} />,
    },
    {
      id: 'aggregation_method',
      label: 'Method',
      render: (m) => <StatusChip status="in_progress" label={m.aggregation_method} />,
    },
    {
      id: 'is_active',
      label: 'Active',
      render: (m) =>
        m.is_active
          ? <StatusChip status="active" />
          : <StatusChip status="inactive" label="Inactive" />,
    },
  ], [])

  const windowColumns = useMemo<Column<any>[]>(() => [
    {
      id: 'window_start',
      label: 'Window Start',
      render: (w) => (
        <Typography variant="body2" sx={{ color: 'text.primary' }}>
          {formatDateTime(w.window_start)}
        </Typography>
      ),
    },
    {
      id: 'window_end',
      label: 'Window End',
      render: (w) => formatDateTime(w.window_end),
    },
    {
      id: 'status',
      label: 'Status',
      render: (w) => (
        <StatusChip
          status={w.status ?? 'unknown'}
          label={w.status?.replace(/_/g, ' ')}
        />
      ),
    },
    {
      id: 'effective_start',
      label: 'Effective Start',
      render: (w) => formatDateTime(w.effective_start),
    },
    {
      id: 'created_at',
      label: 'Created',
      render: (w) => formatDate(w.created_at),
    },
  ], [])

  const aggregationColumns = useMemo<Column<any>[]>(() => [
    {
      id: 'orders_count',
      label: 'Orders',
      render: (a) => (
        <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>
          {a.orders_count ?? 0}
        </Typography>
      ),
    },
    {
      id: 'shipments_count',
      label: 'Shipments',
      render: (a) => a.shipments_count ?? 0,
    },
    {
      id: 'sla_exceptions_count',
      label: 'SLA Exceptions',
      render: (a) => a.sla_exceptions_count ?? 0,
    },
    {
      id: 'late_imports_count',
      label: 'Late Imports',
      render: (a) => (
        <Typography
          variant="body2"
          sx={{
            color: (a.late_imports_count ?? 0) > 0 ? 'error.main' : 'text.secondary',
          }}
        >
          {a.late_imports_count ?? 0}
        </Typography>
      ),
    },
    {
      id: 'missing_imports_count',
      label: 'Missing Imports',
      render: (a) => (
        <Typography
          variant="body2"
          sx={{
            color: (a.missing_imports_count ?? 0) > 0 ? 'warning.main' : 'text.secondary',
          }}
        >
          {a.missing_imports_count ?? 0}
        </Typography>
      ),
    },
    {
      id: 'is_current',
      label: 'Current',
      render: (a) =>
        a.is_current
          ? <StatusChip status="active" label="Current" />
          : <StatusChip status="unknown" label="Old" />,
    },
    {
      id: 'aggregated_at',
      label: 'Aggregated At',
      render: (a) => formatDateTime(a.aggregated_at),
    },
  ], [])

  return (
    <Box>
      <PageHeader
        title="Analytics & Reporting"
        subtitle="Metric definitions, summary windows, and immutable aggregation records"
      />

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Metrics" value="metrics" />
        <Tab label="Reporting Windows" value="windows" />
        <Tab label="Aggregations" value="aggregations" />
      </Tabs>

      {tab === 'metrics' && (
        <DataTable
          columns={metricColumns}
          rows={metrics}
          loading={mLoading}
          rowKey={(m) => String(m.id)}
          emptyMessage="No metrics defined"
          emptyIcon={<BarChartIcon sx={{ fontSize: 48 }} />}
        />
      )}

      {tab === 'windows' && (
        <DataTable
          columns={windowColumns}
          rows={windows}
          loading={wLoading}
          rowKey={(w) => String(w.id)}
          emptyMessage="No reporting windows"
          emptyIcon={<CalendarTodayIcon sx={{ fontSize: 48 }} />}
        />
      )}

      {tab === 'aggregations' && (
        <DataTable
          columns={aggregationColumns}
          rows={aggregations}
          loading={aLoading}
          rowKey={(a) => String(a.id)}
          emptyMessage="No aggregation records"
          emptyIcon={<TimelineIcon sx={{ fontSize: 48 }} />}
        />
      )}
    </Box>
  )
}
