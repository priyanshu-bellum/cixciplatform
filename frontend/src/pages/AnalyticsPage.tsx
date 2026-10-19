import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import BarChartIcon from '@mui/icons-material/BarChart'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import TimelineIcon from '@mui/icons-material/Timeline'
import DashboardIcon from '@mui/icons-material/Dashboard'
import RefreshIcon from '@mui/icons-material/Refresh'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningIcon from '@mui/icons-material/Warning'
import ErrorIcon from '@mui/icons-material/Error'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import GavelIcon from '@mui/icons-material/Gavel'
import ScheduleIcon from '@mui/icons-material/Schedule'
import api from '../lib/apiClient'
import PageHeader from '../components/layout/PageHeader'
import DataTable, { type Column } from '../components/data-display/DataTable'
import StatusChip from '../components/data-display/StatusChip'
import { formatDate } from '../lib/formatters'

const formatDateTime = (dateStr: string | null | undefined): string => {
  return formatDate(dateStr)
}

function SummaryCard({ title, value, icon, color, subtitle }: {
  title: string; value: string | number; icon: React.ReactNode; color: string; subtitle?: string
}) {
  return (
    <Card variant="outlined" sx={{ flex: 1, minWidth: 180 }}>
      <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {title}
          </Typography>
          <Box sx={{ color, display: 'flex' }}>{icon}</Box>
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.2 }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

function FreshnessIndicator({ marker }: { marker: any }) {
  const isStale = marker.is_stale
  const lastProcessed = marker.last_processed_at ? new Date(marker.last_processed_at) : null
  const hoursSince = lastProcessed ? Math.floor((Date.now() - lastProcessed.getTime()) / (1000 * 60 * 60)) : null

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5, px: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ color: isStale ? 'warning.main' : 'success.main', display: 'flex' }}>
        {isStale ? <WarningIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{marker.source_module}</Typography>
        {marker.source_event_type && (
          <Typography variant="caption" color="text.secondary">{marker.source_event_type}</Typography>
        )}
      </Box>
      <Box sx={{ textAlign: 'right' }}>
        <Typography variant="caption" color={isStale ? 'warning.main' : 'text.secondary'}>
          {hoursSince != null ? `${hoursSince}h ago` : '—'}
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
          {lastProcessed ? formatDateTime(lastProcessed.toISOString()) : 'Never'}
        </Typography>
      </Box>
      <Chip
        label={isStale ? 'Stale' : 'Fresh'}
        size="small"
        color={isStale ? 'warning' : 'success'}
        variant="filled"
      />
    </Box>
  )
}

export default function AnalyticsPage() {
  const [tab, setTab] = useState<'dashboard' | 'metrics' | 'windows' | 'aggregations' | 'freshness'>('dashboard')

  const { data: metricData, isLoading: mLoading } = useQuery({
    queryKey: ['analytics-metrics'],
    queryFn: () => api.get('/analytics/metrics/').then(r => r.data),
  })

  const { data: windowData, isLoading: wLoading } = useQuery({
    queryKey: ['analytics-windows'],
    queryFn: () => api.get('/analytics/summary-windows/').then(r => r.data),
  })

  const { data: freshnessData, isLoading: fLoading, refetch: refetchFreshness } = useQuery({
    queryKey: ['analytics-freshness'],
    queryFn: () => api.get('/analytics/freshness-markers/').then(r => r.data),
  })

  const windows = windowData?.results ?? (Array.isArray(windowData) ? windowData : [])

  const { data: aggData, isLoading: aLoading } = useQuery({
    queryKey: ['analytics-aggregations', windows],
    queryFn: async () => {
      const allAggs: any[] = []
      for (const w of windows) {
        try {
          const res = await api.get(`/analytics/summary-windows/${w.id}/aggregations/`)
          const items = res.data?.results ?? (Array.isArray(res.data) ? res.data : [])
          allAggs.push(...items)
        } catch { /* skip */ }
      }
      return allAggs
    },
    enabled: windows.length > 0,
  })

  const metrics = metricData?.results ?? (Array.isArray(metricData) ? metricData : [])
  const aggregations = aggData ?? []
  const freshnessMarkers = freshnessData?.results ?? (Array.isArray(freshnessData) ? freshnessData : [])

  // Dashboard summary values
  const totalOrders = aggregations.reduce((s, a) => s + (a.orders_count ?? 0), 0)
  const totalShipments = aggregations.reduce((s, a) => s + (a.shipments_count ?? 0), 0)
  const totalSlaExceptions = aggregations.reduce((s, a) => s + (a.sla_exceptions_count ?? 0), 0)
  const totalLateImports = aggregations.reduce((s, a) => s + (a.late_imports_count ?? 0), 0)
  const staleCount = freshnessMarkers.filter((f: any) => f.is_stale).length
  const freshCount = freshnessMarkers.length - staleCount
  const activeWindows = windows.filter((w: any) => w.status === 'active' || w.status === 'current').length
  const currentAggs = aggregations.filter((a: any) => a.is_current)

  const metricColumns = useMemo<Column<any>[]>(() => [
    {
      id: 'code',
      label: 'Code',
      render: (m) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.primary', fontWeight: 500, fontSize: 12 }}>
          {m.code}
        </Typography>
      ),
    },
    { id: 'label', label: 'Label' },
    { id: 'source_module', label: 'Source Module', render: (m) => <StatusChip status="unknown" label={m.source_module} /> },
    { id: 'aggregation_method', label: 'Method', render: (m) => <StatusChip status="in_progress" label={m.aggregation_method} /> },
    {
      id: 'is_active', label: 'Active',
      render: (m) => m.is_active ? <StatusChip status="active" /> : <StatusChip status="inactive" label="Inactive" />,
    },
  ], [])

  const windowColumns = useMemo<Column<any>[]>(() => [
    { id: 'window_start', label: 'Window Start', render: (w) => <Typography variant="body2" sx={{ color: 'text.primary' }}>{formatDateTime(w.window_start)}</Typography> },
    { id: 'window_end', label: 'Window End', render: (w) => formatDateTime(w.window_end) },
    { id: 'status', label: 'Status', render: (w) => <StatusChip status={w.status ?? 'unknown'} label={w.status?.replace(/_/g, ' ')} /> },
    { id: 'effective_start', label: 'Effective Start', render: (w) => formatDateTime(w.effective_start) },
    { id: 'created_at', label: 'Created', render: (w) => formatDate(w.created_at) },
  ], [])

  const aggregationColumns = useMemo<Column<any>[]>(() => [
    {
      id: 'orders_count', label: 'Orders',
      render: (a) => <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>{a.orders_count ?? 0}</Typography>,
    },
    { id: 'shipments_count', label: 'Shipments', render: (a) => a.shipments_count ?? 0 },
    { id: 'sla_exceptions_count', label: 'SLA Exceptions', render: (a) => a.sla_exceptions_count ?? 0 },
    {
      id: 'late_imports_count', label: 'Late Imports',
      render: (a) => (
        <Typography variant="body2" sx={{ color: (a.late_imports_count ?? 0) > 0 ? 'error.main' : 'text.secondary' }}>
          {a.late_imports_count ?? 0}
        </Typography>
      ),
    },
    {
      id: 'missing_imports_count', label: 'Missing Imports',
      render: (a) => (
        <Typography variant="body2" sx={{ color: (a.missing_imports_count ?? 0) > 0 ? 'warning.main' : 'text.secondary' }}>
          {a.missing_imports_count ?? 0}
        </Typography>
      ),
    },
    { id: 'partial_imports_count', label: 'Partial Imports', render: (a) => a.partial_imports_count ?? 0 },
    {
      id: 'is_current', label: 'Current',
      render: (a) => a.is_current ? <StatusChip status="active" label="Current" /> : <StatusChip status="unknown" label="Old" />,
    },
    { id: 'aggregated_at', label: 'Aggregated At', render: (a) => formatDateTime(a.aggregated_at) },
  ], [])

  return (
    <Box>
      <PageHeader
        title="Analytics & Reporting"
        subtitle="Metric definitions, data freshness, summary windows, and immutable aggregation records"
      />

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Dashboard" value="dashboard" icon={<DashboardIcon fontSize="small" />} iconPosition="start" />
        <Tab label="Data Freshness" value="freshness" icon={<ScheduleIcon fontSize="small" />} iconPosition="start" />
        <Tab label="Metrics" value="metrics" icon={<BarChartIcon fontSize="small" />} iconPosition="start" />
        <Tab label="Reporting Windows" value="windows" icon={<CalendarTodayIcon fontSize="small" />} iconPosition="start" />
        <Tab label="Aggregations" value="aggregations" icon={<TimelineIcon fontSize="small" />} iconPosition="start" />
      </Tabs>

      {tab === 'dashboard' && (
        <Box>
          {/* Summary cards row */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <SummaryCard
              title="Total Orders"
              value={totalOrders}
              icon={<TrendingUpIcon />}
              color="primary.main"
              subtitle={`${currentAggs.length} current aggregation(s)`}
            />
            <SummaryCard
              title="Total Shipments"
              value={totalShipments}
              icon={<LocalShippingIcon />}
              color="success.main"
              subtitle="Across all reporting windows"
            />
            <SummaryCard
              title="SLA Exceptions"
              value={totalSlaExceptions}
              icon={<GavelIcon />}
              color={totalSlaExceptions > 0 ? 'error.main' : 'text.disabled'}
              subtitle="Cumulative across windows"
            />
            <SummaryCard
              title="Active Windows"
              value={activeWindows}
              icon={<CalendarTodayIcon />}
              color="info.main"
              subtitle={`${windows.length} total windows`}
            />
          </Box>

          {/* Freshness overview + latest aggregations */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {/* Data Freshness panel */}
            <Card variant="outlined" sx={{ flex: 1, minWidth: 320 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>Data Freshness</Typography>
                  <Tooltip title="Refresh">
                    <IconButton size="small" onClick={() => refetchFreshness()}>
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Chip label={`${freshCount} Fresh`} color="success" size="small" variant="outlined" />
                  <Chip label={`${staleCount} Stale`} color={staleCount > 0 ? 'warning' : 'default'} size="small" variant="outlined" />
                </Box>
                {fLoading ? (
                  <Typography variant="body2" color="text.secondary">Loading freshness data...</Typography>
                ) : freshnessMarkers.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No freshness markers recorded yet.</Typography>
                ) : (
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                    {freshnessMarkers.slice(0, 8).map((marker: any) => (
                      <FreshnessIndicator key={marker.id} marker={marker} />
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Latest Aggregations panel */}
            <Card variant="outlined" sx={{ flex: 1, minWidth: 320 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Latest Aggregations</Typography>
                {currentAggs.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No current aggregations available.</Typography>
                ) : (
                  currentAggs.slice(0, 5).map((agg: any, i: number) => (
                    <Box key={i} sx={{ py: 1.5, borderBottom: i < Math.min(5, currentAggs.length) - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {agg.orders_count ?? 0} orders / {agg.shipments_count ?? 0} shipments
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDateTime(agg.aggregated_at)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {(agg.sla_exceptions_count ?? 0) > 0 && (
                          <Chip label={`${agg.sla_exceptions_count} SLA exceptions`} size="small" color="error" variant="outlined" />
                        )}
                        {(agg.late_imports_count ?? 0) > 0 && (
                          <Chip label={`${agg.late_imports_count} late imports`} size="small" color="warning" variant="outlined" />
                        )}
                        {(agg.missing_imports_count ?? 0) > 0 && (
                          <Chip label={`${agg.missing_imports_count} missing imports`} size="small" color="warning" variant="outlined" />
                        )}
                        {(agg.partial_imports_count ?? 0) > 0 && (
                          <Chip label={`${agg.partial_imports_count} partial imports`} size="small" color="info" variant="outlined" />
                        )}
                      </Box>
                    </Box>
                  ))
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>
      )}

      {tab === 'freshness' && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Data freshness markers track when each source module's data was last ingested for analytics.
            </Typography>
            <IconButton onClick={() => refetchFreshness()} size="small">
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Box>
          {freshnessMarkers.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <ScheduleIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography variant="h6" color="text.secondary">No freshness markers</Typography>
              <Typography variant="body2" color="text.disabled">Freshness markers will appear once source modules begin reporting.</Typography>
            </Box>
          ) : (
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
              {freshnessMarkers.map((marker: any) => (
                <FreshnessIndicator key={marker.id} marker={marker} />
              ))}
            </Box>
          )}
        </Box>
      )}

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
