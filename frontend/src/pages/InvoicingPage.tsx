import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import MenuItem from '@mui/material/MenuItem'
import Select, { type SelectChangeEvent } from '@mui/material/Select'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Stack from '@mui/material/Stack'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Alert from '@mui/material/Alert'
import Tooltip from '@mui/material/Tooltip'
import TextField from '@mui/material/TextField'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import CloseIcon from '@mui/icons-material/Close'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import BusinessIcon from '@mui/icons-material/Business'
import DescriptionIcon from '@mui/icons-material/Description'
import GppMaybeIcon from '@mui/icons-material/GppMaybe'
import SendIcon from '@mui/icons-material/Send'
import CompareArrowsIcon from '@mui/icons-material/CompareArrows'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import api from '../lib/apiClient'
import Pagination, { usePagination } from '../components/Pagination'
import PageHeader from '../components/layout/PageHeader'
import StatusChip from '../components/data-display/StatusChip'
import SearchBar from '../components/forms/SearchBar'
import { useSnackbar } from '../components/feedback/SnackbarProvider'
import { formatCurrency, formatDate } from '../lib/formatters'
import { useAuthStore } from '../stores/authStore'

// ─── Types ──────────────────────────────────────────────────────────────────

interface InvoiceRun {
  id: string
  status: string
  company_scope_reference: string
  run_label: string
  idempotency_key: string
  scheduled_for: string | null
  started_at: string | null
  completed_at: string | null
  error_detail: string
  created_at: string
}

interface InvoiceListItem {
  id: string
  invoice_type: string
  status: string
  counterparty_role: string
  counterparty_reference: string
  counterparty_name: string
  company_scope_reference: string
  company_name: string
  grand_total: string
  currency: string
  issued_at: string | null
  created_at: string
}

interface InvoiceDetail extends InvoiceListItem {
  subtotal: string
  commission_total: string
  adjustment_total: string
  quickbooks_handoff_request_reference: string | null
  quickbooks_payment_status_reference: string
  auto_payment_submitted: boolean
  run: string
  period: string
}

interface InvoiceLine {
  id: string
  invoice: string
  idempotency_key: string
  source_module: string
  source_order_line_reference: string
  source_product_reference: string | null
  unit_price_snapshot: string
  quantity: number
  line_total: string
  currency: string
  line_description: string
  created_at: string
}

interface InvoiceAdjustment {
  id: string
  invoice: string
  original_line: string | null
  adjustment_kind: string
  amount: string
  currency: string
  reason: string
  evidence_reference: string | null
  created_at: string
}

interface ReconciliationJob {
  id: string
  invoice: string
  vendor_company_reference: string
  status: string
  row_count: number | null
  matched_count: number | null
  unmatched_count: number | null
  uploaded_at: string | null
  completed_at: string | null
  created_at: string
}

interface CompanyOption {
  id: string
  name: string
  company_type: string
}

interface CreateLineItem {
  description: string
  quantity: string
  unit_price: string
}

const EMPTY_LINE: CreateLineItem = { description: '', quantity: '1', unit_price: '0.00' }

// ─── Constants ──────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  buyer_invoice: 'Buyer Invoice',
  vendor_statement: 'Vendor Statement',
  vendor_payable_package: 'Vendor Payable Package',
  commission_report: 'Commission Report',
  adjustment_report: 'Adjustment Report',
  internal_admin_invoice_report: 'Internal Admin Report',
}

const ISSUABLE_STATUSES = new Set(['draft', 'ready'])

// ─── Component ──────────────────────────────────────────────────────────────

export default function InvoicingPage() {
  const { showSnackbar } = useSnackbar()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const isCixciAdmin = user?.is_cixci_admin || user?.company_type === 'cixci_internal'

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [issueDialogOpen, setIssueDialogOpen] = useState(false)
  const [transitionDialogOpen, setTransitionDialogOpen] = useState(false)
  const [transitionTarget, setTransitionTarget] = useState<string>('')

  // Create Invoice dialog state
  const [createOpen, setCreateOpen] = useState(false)
  const [createMode, setCreateMode] = useState<'manual' | 'auto'>('manual')
  const [createType, setCreateType] = useState<string>('buyer_invoice')
  const [createRole, setCreateRole] = useState<string>('buyer')
  const [createCounterparty, setCreateCounterparty] = useState<string>('')
  const [createPeriodStart, setCreatePeriodStart] = useState<string>('')
  const [createPeriodEnd, setCreatePeriodEnd] = useState<string>('')
  const [createCurrency, setCreateCurrency] = useState<string>('USD')
  const [createLines, setCreateLines] = useState<CreateLineItem[]>([{ ...EMPTY_LINE }])

  // ─── Queries ────────────────────────────────────────────────────────────

  const { data: runs } = useQuery({
    queryKey: ['invoice-runs'],
    queryFn: () => api.get('/invoicing/runs/').then(r => r.data),
    meta: { errorMessage: 'Failed to load invoice runs' },
  })
  const runList: InvoiceRun[] = runs?.results ?? (Array.isArray(runs) ? runs : [])

  const { data: invoiceData, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => api.get('/invoicing/invoices/', { params: { paginate: 'false' } }).then(r => r.data),
    meta: { errorMessage: 'Failed to load invoices' },
  })
  const rawInvoices: InvoiceListItem[] = invoiceData?.results ?? (Array.isArray(invoiceData) ? invoiceData : [])

  const filteredInvoices = rawInvoices.filter((inv) => {
    if (filterType !== 'all' && inv.invoice_type !== filterType) return false
    if (filterStatus !== 'all' && inv.status !== filterStatus) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchesId = inv.id?.toLowerCase().includes(q)
      const matchesCounterparty = inv.counterparty_name?.toLowerCase().includes(q) || inv.counterparty_reference?.toLowerCase().includes(q)
      const matchesCompany = inv.company_name?.toLowerCase().includes(q)
      if (!matchesId && !matchesCounterparty && !matchesCompany) return false
    }
    return true
  })

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    paginatedItems: paginatedInvoices,
  } = usePagination(filteredInvoices, 50)

  // Detail query
  const { data: invoiceDetail, isLoading: isLoadingDetail } = useQuery<InvoiceDetail>({
    queryKey: ['invoice-detail', selectedInvoiceId],
    queryFn: () => api.get(`/invoicing/invoices/${selectedInvoiceId}/`).then(r => r.data),
    enabled: !!selectedInvoiceId,
  })

  // Lines query
  const { data: invoiceLines, isLoading: isLoadingLines } = useQuery<InvoiceLine[]>({
    queryKey: ['invoice-lines', selectedInvoiceId],
    queryFn: () => api.get(`/invoicing/invoices/${selectedInvoiceId}/lines/`).then(r => r.data),
    enabled: !!selectedInvoiceId,
  })

  // Adjustments query
  const { data: invoiceAdjustments } = useQuery<InvoiceAdjustment[]>({
    queryKey: ['invoice-adjustments', selectedInvoiceId],
    queryFn: () => api.get(`/invoicing/invoices/${selectedInvoiceId}/adjustments/`).then(r => r.data),
    enabled: !!selectedInvoiceId,
  })

  // Reconciliation jobs query
  const { data: reconciliationJobs } = useQuery<ReconciliationJob[]>({
    queryKey: ['invoice-reconciliation', selectedInvoiceId],
    queryFn: () => api.get(`/invoicing/invoices/${selectedInvoiceId}/reconciliation/`).then(r => r.data),
    enabled: !!selectedInvoiceId,
  })

  // Companies for counterparty dropdown
  const { data: companiesData } = useQuery({
    queryKey: ['companies-list'],
    queryFn: () => api.get('/tenant/companies/', { params: { paginate: 'false' } }).then(r => r.data),
    enabled: createOpen,
  })
  const companies: CompanyOption[] = companiesData?.results ?? (Array.isArray(companiesData) ? companiesData : [])

  // Order preview for auto-invoice mode
  const { data: orderPreview, isFetching: previewLoading } = useQuery({
    queryKey: ['invoice-order-preview', createCounterparty, createPeriodStart, createPeriodEnd],
    queryFn: () => api.get('/invoicing/invoices/preview-from-orders/', {
      params: {
        buyer_id: createCounterparty,
        period_start: createPeriodStart,
        period_end: createPeriodEnd,
      },
    }).then(r => r.data),
    enabled: createOpen && createMode === 'auto' && !!createCounterparty && !!createPeriodStart && !!createPeriodEnd,
    retry: false,
  })

  // ─── Mutations ──────────────────────────────────────────────────────────

  const createInvoiceMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.post('/invoicing/invoices/create-manual/', payload).then(r => r.data),
    onSuccess: () => {
      showSnackbar('Invoice created successfully', 'success')
      setCreateOpen(false)
      resetCreateForm()
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice-runs'] })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || err?.response?.data?.errors
        ? 'Validation errors — check form fields'
        : err?.message || 'Failed to create invoice'
      showSnackbar(typeof msg === 'string' ? msg : 'Validation errors — check form fields', 'error')
    },
  })

  const createFromOrdersMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.post('/invoicing/invoices/create-from-orders/', payload).then(r => r.data),
    onSuccess: (data) => {
      const excCount = data?.exceptions?.length || 0
      showSnackbar(
        excCount > 0
          ? `Invoice created with ${excCount} exception(s) — check invoice details`
          : 'Invoice generated from orders successfully',
        excCount > 0 ? 'warning' : 'success'
      )
      setCreateOpen(false)
      resetCreateForm()
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice-runs'] })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || err?.message || 'Failed to generate invoice from orders'
      showSnackbar(msg, 'error')
    },
  })

  const issueMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const detail = await api.get(`/invoicing/invoices/${invoiceId}/`).then(r => r.data)
      if (detail.status === 'draft') {
        await api.post(`/invoicing/invoices/${invoiceId}/transition/`, { status: 'ready' })
      }
      return api.post(`/invoicing/invoices/${invoiceId}/issue/`).then(r => r.data)
    },
    onSuccess: () => {
      showSnackbar('Invoice issued successfully', 'success')
      setIssueDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice-detail', selectedInvoiceId] })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || err?.message || 'Failed to issue invoice'
      showSnackbar(msg, 'error')
    },
  })

  const transitionMutation = useMutation({
    mutationFn: ({ invoiceId, status }: { invoiceId: string; status: string }) =>
      api.post(`/invoicing/invoices/${invoiceId}/transition/`, { status }).then(r => r.data),
    onSuccess: () => {
      showSnackbar('Invoice status updated', 'success')
      setTransitionDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice-detail', selectedInvoiceId] })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || err?.message || 'Status transition failed'
      showSnackbar(msg, 'error')
    },
  })

  const reconciliationMutation = useMutation({
    mutationFn: (invoiceId: string) =>
      api.post(`/invoicing/invoices/${invoiceId}/reconciliation/`).then(r => r.data),
    onSuccess: () => {
      showSnackbar('Reconciliation job created', 'success')
      queryClient.invalidateQueries({ queryKey: ['invoice-reconciliation', selectedInvoiceId] })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || err?.message || 'Failed to create reconciliation job'
      showSnackbar(msg, 'error')
    },
  })

  // ─── Helpers ────────────────────────────────────────────────────────────

  const canIssue = invoiceDetail && ISSUABLE_STATUSES.has(invoiceDetail.status)
  const canTransition = invoiceDetail && !['archived', 'void'].includes(invoiceDetail.status)

  const getAvailableTransitions = (status: string): string[] => {
    const map: Record<string, string[]> = {
      draft: ['ready', 'void'],
      ready: ['issued', 'void'],
      issued: ['sent', 'void'],
      sent: ['acknowledged', 'overdue', 'void'],
      acknowledged: ['partially_paid', 'paid', 'disputed'],
      disputed: ['acknowledged', 'void'],
      partially_paid: ['paid', 'overdue', 'disputed'],
      overdue: ['paid', 'void', 'disputed'],
      paid: ['archived'],
      void: ['archived'],
    }
    return map[status] || []
  }

  // ─── Create Invoice helpers ─────────────────────────────────────────────

  const resetCreateForm = () => {
    setCreateMode('manual')
    setCreateType('buyer_invoice')
    setCreateRole('buyer')
    setCreateCounterparty('')
    setCreatePeriodStart('')
    setCreatePeriodEnd('')
    setCreateCurrency('USD')
    setCreateLines([{ ...EMPTY_LINE }])
  }

  const handleAddLine = () => setCreateLines(prev => [...prev, { ...EMPTY_LINE }])

  const handleRemoveLine = (idx: number) =>
    setCreateLines(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev)

  const handleLineChange = (idx: number, field: keyof CreateLineItem, value: string) =>
    setCreateLines(prev => prev.map((line, i) => i === idx ? { ...line, [field]: value } : line))

  const computeSubtotal = () =>
    createLines.reduce((sum, l) => sum + (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0), 0)

  const handleCreateSubmit = () => {
    if (createMode === 'auto') {
      createFromOrdersMutation.mutate({
        invoice_type: createType,
        counterparty_reference: createCounterparty,
        period_start: createPeriodStart,
        period_end: createPeriodEnd,
        currency: createCurrency,
      })
    } else {
      createInvoiceMutation.mutate({
        invoice_type: createType,
        counterparty_role: createRole,
        counterparty_reference: createCounterparty,
        period_start: createPeriodStart,
        period_end: createPeriodEnd,
        currency: createCurrency,
        lines: createLines.map(l => ({
          description: l.description,
          quantity: parseInt(l.quantity) || 0,
          unit_price: l.unit_price,
        })),
      })
    }
  }

  // Auto-set counterparty role based on invoice type
  const handleTypeChange = (type: string) => {
    setCreateType(type)
    if (type === 'buyer_invoice') setCreateRole('buyer')
    else if (type === 'vendor_statement' || type === 'vendor_payable_package') setCreateRole('vendor')
  }

  // Filter companies by counterparty role
  const filteredCompanies = companies.filter(c => {
    if (createRole === 'buyer') return c.company_type === 'buyer'
    if (createRole === 'vendor') return c.company_type === 'vendor'
    return true
  })

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <Box>
      <PageHeader
        title="Invoice Management"
        subtitle="Platform billing, vendor statements, and buyer invoicing across all counterparties"
        actions={isCixciAdmin ? (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
            size="small"
          >
            Create Invoice
          </Button>
        ) : undefined}
      />

      {/* Active Invoice Runs */}
      {runList.length > 0 && (
        <Card sx={{ mb: 2.5 }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
              Active Invoice Runs
            </Typography>
            <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1.5 }}>
              {runList.slice(0, 4).map((r) => (
                <Paper
                  key={r.id}
                  variant="outlined"
                  sx={{ px: 2, py: 1.25, minWidth: 180, bgcolor: 'action.hover' }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {r.run_label || 'Invoice Run'}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.75 }}>
                    <StatusChip status={r.status} />
                    <Typography
                      variant="caption"
                      sx={{ fontFamily: 'monospace', color: 'text.disabled', fontSize: 11 }}
                    >
                      {r.id.slice(0, 8)}
                    </Typography>
                  </Box>
                </Paper>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Filters Bar */}
      <Stack direction="row" spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchBar
          placeholder="Search by ID, Counterparty, or Company..."
          value={searchQuery}
          onSearch={(value) => setSearchQuery(value)}
          sx={{ minWidth: 280 }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <Select
            value={filterType}
            onChange={(e: SelectChangeEvent) => setFilterType(e.target.value)}
            displayEmpty
          >
            <MenuItem value="all">All Invoice Types</MenuItem>
            <MenuItem value="buyer_invoice">Buyer Invoice</MenuItem>
            <MenuItem value="vendor_statement">Vendor Statement</MenuItem>
            <MenuItem value="vendor_payable_package">Vendor Payable Package</MenuItem>
            <MenuItem value="commission_report">Commission Report</MenuItem>
            <MenuItem value="adjustment_report">Adjustment Report</MenuItem>
            <MenuItem value="internal_admin_invoice_report">Internal Admin Report</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <Select
            value={filterStatus}
            onChange={(e: SelectChangeEvent) => setFilterStatus(e.target.value)}
            displayEmpty
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="draft">Draft</MenuItem>
            <MenuItem value="ready">Ready</MenuItem>
            <MenuItem value="issued">Issued</MenuItem>
            <MenuItem value="sent">Sent</MenuItem>
            <MenuItem value="acknowledged">Acknowledged</MenuItem>
            <MenuItem value="paid">Paid</MenuItem>
            <MenuItem value="disputed">Disputed</MenuItem>
            <MenuItem value="overdue">Overdue</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {/* Invoice Table */}
      <TableContainer component={Paper} variant="outlined">
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : rawInvoices.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, color: 'text.secondary' }}>
            <ReceiptLongIcon sx={{ fontSize: 40, mb: 1, color: 'text.disabled' }} />
            <Typography variant="body2">No invoices generated yet</Typography>
          </Box>
        ) : paginatedInvoices.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, color: 'text.secondary' }}>
            <ReceiptLongIcon sx={{ fontSize: 40, mb: 1, color: 'text.disabled' }} />
            <Typography variant="body2">No invoices matching filter criteria</Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Invoice</TableCell>
                <TableCell>Counterparty</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Grand Total</TableCell>
                <TableCell>Issued</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedInvoices.map((inv) => (
                <TableRow
                  key={inv.id}
                  hover
                  onClick={() => setSelectedInvoiceId(inv.id)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{ fontFamily: 'monospace', color: 'primary.main', fontWeight: 500, fontSize: 12 }}
                    >
                      {inv.id.slice(0, 8)}...
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {inv.counterparty_name || inv.counterparty_reference?.slice(0, 8) || '\u2014'}
                    </Typography>
                    {inv.company_name && inv.company_name !== inv.counterparty_name && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Scope: {inv.company_name}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={inv.counterparty_role || 'counterparty'}
                      size="small"
                      color={inv.counterparty_role === 'vendor' ? 'secondary' : 'info'}
                      variant="filled"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={TYPE_LABELS[inv.invoice_type] || inv.invoice_type}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: 11 }}
                    />
                  </TableCell>
                  <TableCell>
                    <StatusChip status={inv.status} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatCurrency(inv.grand_total, inv.currency)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {inv.issued_at ? formatDate(inv.issued_at) : '\u2014'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={50}
        onPageChange={setCurrentPage}
        itemName="invoices"
      />

      {/* ─── Invoice Details Drawer ──────────────────────────────────────── */}
      <Drawer
        anchor="right"
        open={!!selectedInvoiceId}
        onClose={() => setSelectedInvoiceId(null)}
        slotProps={{ paper: { sx: { width: 580, maxWidth: '100%', p: 3 } } }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            pb: 2.25,
            borderBottom: 1,
            borderColor: 'divider',
            mb: 3,
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              Invoice Details
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              {selectedInvoiceId}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setSelectedInvoiceId(null)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {isLoadingDetail ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Action Buttons */}
            {isCixciAdmin && invoiceDetail && (
              <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
                {canIssue && (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<SendIcon />}
                    onClick={() => setIssueDialogOpen(true)}
                    disabled={issueMutation.isPending}
                  >
                    Issue Invoice
                  </Button>
                )}
                {canTransition && getAvailableTransitions(invoiceDetail.status).length > 0 && (
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <Select
                      value=""
                      displayEmpty
                      onChange={(e) => {
                        if (e.target.value) {
                          setTransitionTarget(e.target.value)
                          setTransitionDialogOpen(true)
                        }
                      }}
                      renderValue={() => 'Change Status...'}
                      sx={{ fontSize: 13 }}
                    >
                      {getAvailableTransitions(invoiceDetail.status).map((s) => (
                        <MenuItem key={s} value={s}>
                          {s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Stack>
            )}

            {/* Financial Totals */}
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="overline"
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, fontWeight: 600, color: 'text.secondary', letterSpacing: 0.5 }}
              >
                <AttachMoneyIcon sx={{ fontSize: 14 }} /> Financial Summary
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, bgcolor: 'action.hover' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  <StatusChip status={invoiceDetail?.status ?? '...'} />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Invoice Type</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {TYPE_LABELS[invoiceDetail?.invoice_type ?? ''] || invoiceDetail?.invoice_type || '...'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {formatCurrency(invoiceDetail?.subtotal, invoiceDetail?.currency)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Commission Total</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: 'primary.main' }}>
                    {formatCurrency(invoiceDetail?.commission_total, invoiceDetail?.currency)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Adjustment Total</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {formatCurrency(invoiceDetail?.adjustment_total, invoiceDetail?.currency)}
                  </Typography>
                </Box>
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Grand Total</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {formatCurrency(invoiceDetail?.grand_total, invoiceDetail?.currency)}
                  </Typography>
                </Box>
              </Paper>
            </Box>

            {/* Counterparty & Scope */}
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="overline"
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, fontWeight: 600, color: 'text.secondary', letterSpacing: 0.5 }}
              >
                <BusinessIcon sx={{ fontSize: 14 }} /> Counterparty & Scope
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, bgcolor: 'action.hover' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Counterparty Name</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {invoiceDetail?.counterparty_name || '\u2014'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Counterparty Role</Typography>
                  <Chip
                    label={invoiceDetail?.counterparty_role || '\u2014'}
                    size="small"
                    color={invoiceDetail?.counterparty_role === 'vendor' ? 'secondary' : 'info'}
                    variant="filled"
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Counterparty Ref</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 500 }}>
                    {invoiceDetail?.counterparty_reference || '\u2014'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Company Scope</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {invoiceDetail?.company_name || invoiceDetail?.company_scope_reference?.slice(0, 8) || '\u2014'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Issued Date</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {invoiceDetail?.issued_at ? formatDate(invoiceDetail.issued_at) : 'Not Issued Yet'}
                  </Typography>
                </Box>
              </Paper>
            </Box>

            {/* Line Items */}
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="overline"
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, fontWeight: 600, color: 'text.secondary', letterSpacing: 0.5 }}
              >
                <DescriptionIcon sx={{ fontSize: 14 }} /> Line Items
              </Typography>
              {isLoadingLines ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : !invoiceLines || invoiceLines.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No line items recorded
                </Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ bgcolor: 'action.hover' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Description</TableCell>
                        <TableCell>Qty</TableCell>
                        <TableCell>Unit Price</TableCell>
                        <TableCell>Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invoiceLines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {line.line_description || 'Product Line'}
                            </Typography>
                            {line.source_product_reference && (
                              <Typography
                                variant="caption"
                                sx={{ fontFamily: 'monospace', color: 'text.disabled', fontSize: 10, display: 'block' }}
                              >
                                Ref: {line.source_product_reference.slice(0, 8)}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{line.quantity}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatCurrency(line.unit_price_snapshot, line.currency)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {formatCurrency(line.line_total, line.currency)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>

            {/* Adjustments */}
            {invoiceAdjustments && invoiceAdjustments.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="overline"
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, fontWeight: 600, color: 'text.secondary', letterSpacing: 0.5 }}
                >
                  <GppMaybeIcon sx={{ fontSize: 14 }} /> Adjustments
                </Typography>
                <Stack spacing={1}>
                  {invoiceAdjustments.map((adj) => (
                    <Paper
                      key={adj.id}
                      variant="outlined"
                      sx={{ px: 1.75, py: 1.25, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'action.hover' }}
                    >
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>
                          {adj.adjustment_kind.replace(/_/g, ' ')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {adj.reason || 'No reason provided'}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {formatCurrency(adj.amount, adj.currency)}
                      </Typography>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            )}

            {/* Reconciliation Jobs */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography
                  variant="overline"
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600, color: 'text.secondary', letterSpacing: 0.5 }}
                >
                  <CompareArrowsIcon sx={{ fontSize: 14 }} /> Vendor Reconciliation
                </Typography>
                {invoiceDetail && user?.company_type === 'vendor' && (
                  <Tooltip title="Create a new reconciliation comparison job">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => selectedInvoiceId && reconciliationMutation.mutate(selectedInvoiceId)}
                      disabled={reconciliationMutation.isPending}
                    >
                      New Job
                    </Button>
                  </Tooltip>
                )}
              </Box>
              <Alert severity="info" variant="outlined" sx={{ mb: 1.5, fontSize: 12 }}>
                Vendor reconciliation files are comparison evidence only — CIXCI invoice lines remain authoritative.
              </Alert>
              {!reconciliationJobs || reconciliationJobs.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No reconciliation jobs
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {reconciliationJobs.map((job) => (
                    <Paper
                      key={job.id}
                      variant="outlined"
                      sx={{ px: 2, py: 1.5, bgcolor: 'action.hover' }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                        <StatusChip status={job.status} />
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.disabled', fontSize: 10 }}>
                          {job.id.slice(0, 8)}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={2}>
                        {job.row_count != null && (
                          <Typography variant="caption" color="text.secondary">
                            Rows: {job.row_count}
                          </Typography>
                        )}
                        {job.matched_count != null && (
                          <Typography variant="caption" color="success.main">
                            Matched: {job.matched_count}
                          </Typography>
                        )}
                        {job.unmatched_count != null && job.unmatched_count > 0 && (
                          <Typography variant="caption" color="warning.main">
                            Unmatched: {job.unmatched_count}
                          </Typography>
                        )}
                      </Stack>
                      {job.completed_at && (
                        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
                          Completed: {formatDate(job.completed_at)}
                        </Typography>
                      )}
                    </Paper>
                  ))}
                </Stack>
              )}
            </Box>
          </>
        )}
      </Drawer>

      {/* ─── Issue Confirmation Dialog ─────────────────────────────────── */}
      <Dialog open={issueDialogOpen} onClose={() => setIssueDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Issue Invoice</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mt: 1 }}>
            This will mark the invoice as <strong>Issued</strong> and set the issued date. This action
            cannot be undone — issued invoices are immutable.
          </Typography>
          {invoiceDetail && (
            <Paper variant="outlined" sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover' }}>
              <Typography variant="caption" color="text.secondary">Grand Total</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {formatCurrency(invoiceDetail.grand_total, invoiceDetail.currency)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Counterparty: {invoiceDetail.counterparty_name}
              </Typography>
            </Paper>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIssueDialogOpen(false)} disabled={issueMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={issueMutation.isPending ? <CircularProgress size={16} /> : <CheckCircleIcon />}
            onClick={() => selectedInvoiceId && issueMutation.mutate(selectedInvoiceId)}
            disabled={issueMutation.isPending}
          >
            Confirm Issue
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Transition Confirmation Dialog ────────────────────────────── */}
      <Dialog open={transitionDialogOpen} onClose={() => setTransitionDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Change Invoice Status</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Transition invoice from <strong>{invoiceDetail?.status?.replace(/_/g, ' ')}</strong> to{' '}
            <strong>{transitionTarget.replace(/_/g, ' ')}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransitionDialogOpen(false)} disabled={transitionMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => selectedInvoiceId && transitionMutation.mutate({ invoiceId: selectedInvoiceId, status: transitionTarget })}
            disabled={transitionMutation.isPending}
            startIcon={transitionMutation.isPending ? <CircularProgress size={16} /> : undefined}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Create Invoice Dialog ─────────────────────────────────────── */}
      <Dialog
        open={createOpen}
        onClose={() => { setCreateOpen(false); resetCreateForm() }}
        fullWidth
        maxWidth="md"
        scroll="paper"
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Create Invoice
          <IconButton size="small" onClick={() => { setCreateOpen(false); resetCreateForm() }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {/* Create Mode Toggle */}
          <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
            <Button
              variant={createMode === 'manual' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setCreateMode('manual')}
              startIcon={<AddIcon />}
            >
              Manual Entry
            </Button>
            <Button
              variant={createMode === 'auto' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setCreateMode('auto')}
              startIcon={<ReceiptLongIcon />}
            >
              Generate from Orders
            </Button>
          </Stack>
          {createMode === 'auto' && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Invoice lines will be auto-generated from all purchase orders for this buyer within the selected date range.
              Lines with zero pricing are skipped and recorded as exceptions.
            </Alert>
          )}

          {/* Invoice Type & Counterparty */}
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
            Invoice Details
          </Typography>
          <Stack spacing={2} sx={{ mb: 3 }}>
            <Stack direction="row" spacing={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Invoice Type</InputLabel>
                <Select
                  value={createType}
                  label="Invoice Type"
                  onChange={(e) => handleTypeChange(e.target.value)}
                >
                  <MenuItem value="buyer_invoice">Buyer Invoice</MenuItem>
                  <MenuItem value="vendor_statement">Vendor Statement</MenuItem>
                  <MenuItem value="vendor_payable_package">Vendor Payable Package</MenuItem>
                  <MenuItem value="commission_report">Commission Report</MenuItem>
                  <MenuItem value="adjustment_report">Adjustment Report</MenuItem>
                  <MenuItem value="internal_admin_invoice_report">Internal Admin Report</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>Counterparty Role</InputLabel>
                <Select
                  value={createRole}
                  label="Counterparty Role"
                  onChange={(e) => setCreateRole(e.target.value)}
                >
                  <MenuItem value="buyer">Buyer</MenuItem>
                  <MenuItem value="vendor">Vendor</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <FormControl fullWidth size="small">
              <InputLabel>Counterparty</InputLabel>
              <Select
                value={createCounterparty}
                label="Counterparty"
                onChange={(e) => setCreateCounterparty(e.target.value)}
              >
                {filteredCompanies.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name} ({c.company_type})
                  </MenuItem>
                ))}
                {filteredCompanies.length === 0 && (
                  <MenuItem disabled value="">
                    No {createRole} companies found
                  </MenuItem>
                )}
              </Select>
            </FormControl>
          </Stack>

          {/* Billing Period */}
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
            Billing Period
          </Typography>
          <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
            <TextField
              fullWidth
              size="small"
              label="Period Start"
              type="date"
              value={createPeriodStart}
              onChange={(e) => setCreatePeriodStart(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              fullWidth
              size="small"
              label="Period End"
              type="date"
              value={createPeriodEnd}
              onChange={(e) => setCreatePeriodEnd(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Currency</InputLabel>
              <Select
                value={createCurrency}
                label="Currency"
                onChange={(e) => setCreateCurrency(e.target.value)}
              >
                <MenuItem value="USD">USD</MenuItem>
                <MenuItem value="EUR">EUR</MenuItem>
                <MenuItem value="GBP">GBP</MenuItem>
                <MenuItem value="CAD">CAD</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          {/* Order Preview — Auto mode only */}
          {createMode === 'auto' && createCounterparty && createPeriodStart && createPeriodEnd && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                Order Preview
              </Typography>
              {previewLoading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="text.secondary">Loading order preview…</Typography>
                </Box>
              ) : orderPreview ? (
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                  <Stack direction="row" spacing={3} sx={{ mb: 1.5, flexWrap: 'wrap' }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Orders</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{orderPreview.orders_count}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Total Lines</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{orderPreview.total_lines}</Typography>
                    </Box>
                    {orderPreview.zero_price_lines > 0 && (
                      <Box>
                        <Typography variant="caption" color="warning.main">Zero-Price Lines</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'warning.main' }}>{orderPreview.zero_price_lines}</Typography>
                      </Box>
                    )}
                    <Box>
                      <Typography variant="caption" color="text.secondary">Estimated Total</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                        ${orderPreview.estimated_total?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                  </Stack>
                  {orderPreview.orders?.length > 0 && (
                    <TableContainer sx={{ maxHeight: 200 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>PO Number</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell align="right">Lines</TableCell>
                            <TableCell align="right">Total</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {orderPreview.orders.map((o: any) => (
                            <TableRow key={o.po_id}>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>{o.po_number}</Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                  {o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2">{o.line_count}</Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  ${o.total_amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                  {orderPreview.orders_count === 0 && (
                    <Alert severity="warning" sx={{ mt: 1 }}>
                      No billable orders found for this buyer in the selected period.
                    </Alert>
                  )}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Select a buyer and date range to preview matching orders.
                </Typography>
              )}
            </Box>
          )}

          {/* Line Items — Manual mode only */}
          {createMode === 'manual' && (
          <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Line Items
            </Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={handleAddLine}>
              Add Line
            </Button>
          </Box>

          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: '45%' }}>Description</TableCell>
                  <TableCell sx={{ width: '15%' }}>Qty</TableCell>
                  <TableCell sx={{ width: '20%' }}>Unit Price</TableCell>
                  <TableCell sx={{ width: '15%' }}>Total</TableCell>
                  <TableCell sx={{ width: '5%' }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {createLines.map((line, idx) => {
                  const lineTotal = (parseFloat(line.quantity) || 0) * (parseFloat(line.unit_price) || 0)
                  return (
                    <TableRow key={idx}>
                      <TableCell sx={{ py: 0.75 }}>
                        <TextField
                          fullWidth
                          size="small"
                          placeholder="Item description"
                          value={line.description}
                          onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                          variant="standard"
                        />
                      </TableCell>
                      <TableCell sx={{ py: 0.75 }}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          value={line.quantity}
                          onChange={(e) => handleLineChange(idx, 'quantity', e.target.value)}
                          variant="standard"
                          slotProps={{ htmlInput: { min: 1 } }}
                        />
                      </TableCell>
                      <TableCell sx={{ py: 0.75 }}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          value={line.unit_price}
                          onChange={(e) => handleLineChange(idx, 'unit_price', e.target.value)}
                          variant="standard"
                          slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
                        />
                      </TableCell>
                      <TableCell sx={{ py: 0.75 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatCurrency(lineTotal.toFixed(2), createCurrency)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 0.75 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveLine(idx)}
                          disabled={createLines.length <= 1}
                        >
                          <DeleteOutlinedIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Subtotal Preview */}
          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Subtotal ({createLines.length} item{createLines.length !== 1 ? 's' : ''})
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {formatCurrency(computeSubtotal().toFixed(2), createCurrency)}
              </Typography>
            </Box>
          </Paper>
          </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => { setCreateOpen(false); resetCreateForm() }} disabled={createInvoiceMutation.isPending || createFromOrdersMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateSubmit}
            disabled={
              createInvoiceMutation.isPending ||
              createFromOrdersMutation.isPending ||
              !createCounterparty ||
              !createPeriodStart ||
              !createPeriodEnd ||
              (createMode === 'manual' && createLines.every(l => !l.description.trim()))
            }
            startIcon={createInvoiceMutation.isPending || createFromOrdersMutation.isPending ? <CircularProgress size={16} /> : <CheckCircleIcon />}
          >
            {createMode === 'auto' ? 'Generate Invoice' : 'Create Invoice'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
