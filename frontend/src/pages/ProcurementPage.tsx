import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import AddIcon from '@mui/icons-material/Add'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import ListIcon from '@mui/icons-material/List'
import api from '../lib/apiClient'
import { formatCurrency, formatDate } from '../lib/formatters'
import PageHeader from '../components/layout/PageHeader'
import DataTable, { type Column } from '../components/data-display/DataTable'
import StatusChip from '../components/data-display/StatusChip'

export default function ProcurementPage() {
  const [tab, setTab] = useState<'orders' | 'lines'>('orders')
  const [selectedPO, setSelectedPO] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () =>
      api.get('/procurement/purchase-orders/').then(r => r.data),
  })

  const { data: lineData, isLoading: lineLoading } = useQuery({
    queryKey: ['po-lines', selectedPO?.id],
    queryFn: () =>
      api.get(`/procurement/purchase-orders/${selectedPO.id}/lines/`).then(r => r.data),
    enabled: tab === 'lines' && !!selectedPO,
  })

  const orders = data?.results ?? (Array.isArray(data) ? data : [])
  const lines = lineData?.results ?? (Array.isArray(lineData) ? lineData : [])

  const orderColumns = useMemo<Column<any>[]>(() => [
    {
      id: 'po_number',
      label: 'PO Number',
      render: (o) => (
        <Typography
          variant="body2"
          sx={{ fontFamily: 'monospace', color: 'text.primary', fontWeight: 500 }}
        >
          {o.po_number || o.id?.slice(0, 8)}
        </Typography>
      ),
    },
    {
      id: 'vendor_company_reference',
      label: 'Vendor',
      render: (o) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.6875rem' }}>
          {o.vendor_company_reference?.slice(0, 8)}&hellip;
        </Typography>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      render: (o) => <StatusChip status={o.status ?? 'unknown'} />,
    },
    {
      id: 'currency',
      label: 'Currency',
      render: (o) => o.currency ?? 'USD',
    },
    {
      id: 'total_amount',
      label: 'Total',
      align: 'right',
      render: (o) => (
        <Typography variant="body2" sx={{ color: 'text.primary' }}>
          {formatCurrency(o.total_amount, o.currency)}
        </Typography>
      ),
    },
    {
      id: 'created_at',
      label: 'Created',
      render: (o) => formatDate(o.created_at),
    },
    {
      id: 'actions',
      label: '',
      sortable: false,
      width: 48,
      render: (o) => (
        <Tooltip title="View lines">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation()
              setSelectedPO(o)
              setTab('lines')
            }}
          >
            <ListIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ], [])

  const lineColumns = useMemo<Column<any>[]>(() => [
    {
      id: 'id',
      label: 'Line ID',
      render: (l) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.6875rem', color: 'text.primary' }}>
          {l.id?.slice(0, 8)}&hellip;
        </Typography>
      ),
    },
    {
      id: 'product_reference',
      label: 'Product',
      render: (l) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.6875rem' }}>
          {l.product_reference?.slice(0, 8)}&hellip;
        </Typography>
      ),
    },
    {
      id: 'quantity',
      label: 'Quantity',
      align: 'right',
    },
    {
      id: 'msrp_snapshot',
      label: 'MSRP',
      align: 'right',
      render: (l) => l.msrp_snapshot ? formatCurrency(l.msrp_snapshot, selectedPO?.currency) : '\u2014',
    },
    {
      id: 'unit_price_snapshot',
      label: 'Unit Price (Snapshot)',
      align: 'right',
      render: (l) => formatCurrency(l.unit_price_snapshot, selectedPO?.currency),
    },
    {
      id: 'line_total',
      label: 'Line Total',
      align: 'right',
      render: (l) => (
        <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>
          {formatCurrency(l.line_total, selectedPO?.currency)}
        </Typography>
      ),
    },
  ], [selectedPO?.currency])

  return (
    <Box>
      <PageHeader
        title="Procurement"
        subtitle="Bulk purchase orders — pricing consumed from immutable snapshots, never recalculated"
        actions={
          <Button variant="contained" startIcon={<AddIcon />}>
            New PO
          </Button>
        }
      />

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Purchase Orders" value="orders" />
        <Tab
          value="lines"
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              PO Lines
              {selectedPO && (
                <Chip
                  label={selectedPO.po_number || selectedPO.id?.slice(0, 8)}
                  size="small"
                  color="default"
                  sx={{ fontSize: '0.625rem', height: 20 }}
                />
              )}
            </Box>
          }
        />
      </Tabs>

      {tab === 'orders' && (
        <DataTable
          columns={orderColumns}
          rows={orders}
          loading={isLoading}
          rowKey={(o) => o.id}
          emptyMessage="No purchase orders"
          emptyIcon={<ShoppingCartOutlinedIcon sx={{ fontSize: 48 }} />}
        />
      )}

      {tab === 'lines' && (
        <>
          {!selectedPO ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <Box sx={{ color: 'text.disabled', mb: 1.5 }}>
                <ShoppingCartOutlinedIcon sx={{ fontSize: 48 }} />
              </Box>
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                Select a purchase order
              </Typography>
              <Typography variant="body2" color="text.disabled">
                Click the lines icon on a PO to view its line items
              </Typography>
            </Paper>
          ) : (
            <DataTable
              columns={lineColumns}
              rows={lines}
              loading={lineLoading}
              rowKey={(l) => l.id}
              emptyMessage="No lines on this PO"
              emptyIcon={<ShoppingCartOutlinedIcon sx={{ fontSize: 48 }} />}
            />
          )}
        </>
      )}
    </Box>
  )
}
