import { useState, useEffect, Fragment } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Chip from '@mui/material/Chip'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Drawer from '@mui/material/Drawer'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import ShieldIcon from '@mui/icons-material/Shield'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import CloseIcon from '@mui/icons-material/Close'
import RefreshIcon from '@mui/icons-material/Refresh'
import DescriptionIcon from '@mui/icons-material/Description'
import DownloadIcon from '@mui/icons-material/Download'
import HistoryIcon from '@mui/icons-material/History'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import api from '../lib/apiClient'
import { useAuthStore } from '../stores/authStore'
import Pagination, { usePagination } from '../components/Pagination'
import PageHeader from '../components/layout/PageHeader'
import StatusChip from '../components/data-display/StatusChip'
import FileUploadField from '../components/forms/FileUploadField'
import ConfirmDialog from '../components/feedback/ConfirmDialog'
import { useConfirmDialog } from '../hooks/useConfirmDialog'
import { useSnackbar } from '../components/feedback/SnackbarProvider'
import { formatCurrency, formatDate, formatETDate } from '../lib/formatters'

type TabKey = 'handoffs' | 'sla' | 'policies' | 'exportLogs' | 'returns' | 'returnLogs' | 'shippingLogs'

const ALL_TABS: TabKey[] = ['handoffs', 'sla', 'policies', 'exportLogs', 'returns', 'returnLogs', 'shippingLogs']
const BUYER_TABS: TabKey[] = ['handoffs', 'returns']
const VENDOR_TABS: TabKey[] = ['handoffs', 'returns', 'returnLogs', 'shippingLogs']

const TAB_LABELS: Record<TabKey, string> = {
  handoffs: 'Handoffs',
  sla: 'SLA Evaluations',
  policies: 'SLA Policies',
  exportLogs: 'Export Logs',
  returns: 'Returns',
  returnLogs: 'Return Import Logs',
  shippingLogs: 'Shipping Import Logs',
}

// Helpers to map old badge-* classes to StatusChip-friendly status strings
function handoffStatusKey(status: string): string {
  const map: Record<string, string> = {
    received: 'in_progress',
    processing: 'processing',
    shipped: 'shipped',
    delivered: 'completed',
    exception: 'error',
    closed: 'closed',
    shipment_pending: 'pending',
  }
  return map[status] ?? 'unknown'
}

function slaOutcomeKey(outcome: string): string {
  const map: Record<string, string> = {
    on_time: 'completed',
    late: 'error',
    missing: 'error',
    partial: 'partial',
    pending: 'pending',
    overridden: 'archived',
  }
  return map[outcome] ?? 'unknown'
}

function policyStatusKey(status: string): string {
  const map: Record<string, string> = {
    draft: 'draft',
    active: 'active',
    superseded: 'pending',
    retired: 'retired',
  }
  return map[status] ?? 'unknown'
}

function returnStatusKey(rawStatus: string): string {
  const map: Record<string, string> = {
    return_sent_to_vendor: 'in_progress',
    return_received: 'pending',
    return_refunded: 'completed',
    return_rejected: 'rejected',
    return_closed: 'closed',
  }
  return map[rawStatus] ?? 'unknown'
}

function deliveryStatusChipColor(result: string | null | undefined): 'success' | 'info' | 'error' | 'default' {
  if (result === 'success') return 'success'
  if (result === 'no_recipients_configured') return 'info'
  if (result === 'failed') return 'error'
  return 'default'
}

function deliveryStatusLabel(result: string | null | undefined): string {
  if (result === 'success') return 'Sent'
  if (result === 'no_recipients_configured') return 'Download Only'
  return result || 'Pending'
}

function attemptDeliveryColor(status: string): 'success' | 'info' | 'error' | 'default' {
  if (status === 'SENT' || status === 'succeeded') return 'success'
  if (status === 'PROCESSING' || status === 'QUEUED') return 'info'
  if (status === 'failed' || status === 'DELIVERY_FAILED') return 'error'
  return 'default'
}

export default function FulfillmentPage() {
  const location = useLocation()
  const { user } = useAuthStore()
  const { showSnackbar } = useSnackbar()
  const { dialogProps, confirm } = useConfirmDialog()
  const isCixciAdmin = user?.is_cixci_admin || user?.company_type === 'cixci_internal'
  const isBuyer = user?.company_type === 'buyer'
  const isVendor = user?.company_type === 'vendor'
  const visibleTabs = isCixciAdmin ? ALL_TABS : isVendor ? VENDOR_TABS : isBuyer ? BUYER_TABS : ALL_TABS
  const canManageFulfillment = isCixciAdmin || isVendor
  const queryTab = new URLSearchParams(location.search).get('tab')
  const initialTab = (queryTab as any) || location.state?.tab || 'handoffs'
  const [tab, setTab] = useState<TabKey>(
    visibleTabs.includes(initialTab) ? (initialTab as TabKey) : visibleTabs[0]
  )
  const [selectedHandoff, setSelectedHandoff] = useState<any | null>(null)

  useEffect(() => {
    const activeTab = new URLSearchParams(location.search).get('tab') || location.state?.tab
    if (activeTab && visibleTabs.includes(activeTab)) {
      setTab(activeTab as TabKey)
      return
    }
    setTab(prev => visibleTabs.includes(prev) ? prev : visibleTabs[0])
  }, [location, visibleTabs])

  const { data: handoffData, isLoading: hLoading, refetch: refetchHandoffs } = useQuery({
    queryKey: ['fulfillment-handoffs'],
    queryFn: () => api.get('/fulfillment/handoffs/', { params: { paginate: 'false' } }).then(r => r.data),
  })

  const { data: slaData, isLoading: sLoading } = useQuery({
    queryKey: ['sla-evaluations'],
    queryFn: () => api.get('/fulfillment/sla-evaluations/', { params: { paginate: 'false' } }).then(r => r.data),
    enabled: tab === 'sla',
  })

  const { data: policyData, isLoading: pLoading } = useQuery({
    queryKey: ['sla-policies'],
    queryFn: () => api.get('/fulfillment/sla-policies/', { params: { paginate: 'false' } }).then(r => r.data),
    enabled: tab === 'policies',
  })

  const { data: logData, isLoading: lLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['export-logs'],
    queryFn: () => api.get('/routing/export-logs/', { params: { paginate: 'false' } }).then(r => r.data),
    enabled: tab === 'exportLogs',
  })

  const { data: returnsData, isLoading: rLoading, refetch: refetchReturns, error: returnsError } = useQuery({
    queryKey: ['return-requests'],
    queryFn: () => api.get('/fulfillment/return-requests/', { params: { paginate: 'false' } }).then(r => r.data),
    enabled: tab === 'returns',
  })

  const { data: returnLogData, isLoading: rlLoading, refetch: refetchReturnLogs } = useQuery({
    queryKey: ['return-import-logs'],
    queryFn: () => api.get('/fulfillment/return-import-logs/', { params: { paginate: 'false' } }).then(r => r.data),
    enabled: tab === 'returnLogs',
  })

  const { data: shippingLogData, isLoading: slLoading, refetch: refetchShippingLogs } = useQuery({
    queryKey: ['shipping-import-logs'],
    queryFn: () => api.get('/fulfillment/shipping-import-logs/', { params: { paginate: 'false' } }).then(r => r.data),
    enabled: tab === 'shippingLogs',
  })

  const handoffs = handoffData?.results ?? (Array.isArray(handoffData) ? handoffData : [])
  const slaEvals = slaData?.results ?? (Array.isArray(slaData) ? slaData : [])
  const policies = policyData?.results ?? (Array.isArray(policyData) ? policyData : [])
  const exportLogs = logData?.results ?? (Array.isArray(logData) ? logData : [])
  const returnRequests = returnsData?.results ?? (Array.isArray(returnsData) ? returnsData : [])
  const returnImportLogs = returnLogData?.results ?? (Array.isArray(returnLogData) ? returnLogData : [])
  const shippingImportLogs = shippingLogData?.results ?? (Array.isArray(shippingLogData) ? shippingLogData : [])

  const {
    currentPage: handoffPage,
    setCurrentPage: setHandoffPage,
    totalPages: totalHandoffPages,
    totalItems: totalHandoffs,
    paginatedItems: paginatedHandoffs,
  } = usePagination(handoffs, 50)

  const {
    currentPage: slaPage,
    setCurrentPage: setSlaPage,
    totalPages: totalSlaPages,
    totalItems: totalSlaEvals,
    paginatedItems: paginatedSlaEvals,
  } = usePagination(slaEvals, 50)

  const {
    currentPage: policyPage,
    setCurrentPage: setPolicyPage,
    totalPages: totalPolicyPages,
    totalItems: totalPolicies,
    paginatedItems: paginatedPolicies,
  } = usePagination(policies, 50)

  const {
    currentPage: logPage,
    setCurrentPage: setLogPage,
    totalPages: totalLogPages,
    totalItems: totalExportLogs,
    paginatedItems: paginatedExportLogs,
  } = usePagination(exportLogs, 50)

  const {
    currentPage: returnPage,
    setCurrentPage: setReturnPage,
    totalPages: totalReturnPages,
    totalItems: totalReturnRequests,
    paginatedItems: paginatedReturnRequests,
  } = usePagination(returnRequests, 50)

  const {
    currentPage: returnLogPage,
    setCurrentPage: setReturnLogPage,
    totalPages: totalReturnLogPages,
    totalItems: totalReturnImportLogs,
    paginatedItems: paginatedReturnImportLogs,
  } = usePagination(returnImportLogs, 50)

  const {
    currentPage: shippingLogPage,
    setCurrentPage: setShippingLogPage,
    totalPages: totalShippingLogPages,
    totalItems: totalShippingImportLogs,
    paginatedItems: paginatedShippingImportLogs,
  } = usePagination(shippingImportLogs, 50)

  const [reexportingId, setReexportingId] = useState<string | null>(null)
  const [selectedLogForReexport, setSelectedLogForReexport] = useState<any | null>(null)
  const [selectedLogForAuditHistory, setSelectedLogForAuditHistory] = useState<any | null>(null)
  const [reexportReason, setReexportReason] = useState<string>('')
  const [reexportExplanation, setReexportExplanation] = useState<string>('')
  const [expandedLogIds, setExpandedLogIds] = useState<string[]>([])

  const toggleExpandLog = (id: string) => {
    setExpandedLogIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  // Return Import Modal States
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)
  const [importError, setImportError] = useState<string | null>(null)

  // Shipping Import Modal States
  const [showShippingModal, setShowShippingModal] = useState(false)
  const [shippingFile, setShippingFile] = useState<File | null>(null)
  const [shippingImporting, setShippingImporting] = useState(false)
  const [shippingPreviewData, setShippingPreviewData] = useState<any>(null)
  const [shippingImportError, setShippingImportError] = useState<string | null>(null)

  const handleReexport = async (id: string, reason: string, explanation?: string) => {
    if (reexportingId) return
    setReexportingId(id)
    try {
      await api.post(`/routing/export-logs/${id}/reexport/`, { reason, explanation })
      showSnackbar('Re-export triggered successfully!', 'success')
      setSelectedLogForReexport(null)
      refetchLogs()
    } catch (err: any) {
      showSnackbar(err.response?.data?.detail || 'Failed to trigger re-export.', 'error')
    } finally {
      setReexportingId(null)
    }
  }

  const handleDownloadCSV = async (log: any) => {
    try {
      await api.post(`/routing/export-logs/${log.id}/audit_download/`)
      refetchLogs()
    } catch (err) {
      console.error("Failed to audit download:", err)
    }

    if (!log.csv_backup) {
      showSnackbar('No CSV content available for this log.', 'warning')
      return
    }
    const blob = new Blob([log.csv_backup], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', log.filename || 'export.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0])
      setPreviewData(null)
      setImportError(null)
    }
  }

  const handlePreview = async () => {
    if (!importFile) return
    setImporting(true)
    setImportError(null)
    const fd = new FormData()
    fd.append('file', importFile)
    fd.append('confirm', 'false')
    try {
      const resp = await api.post('/fulfillment/return-requests/import-returns/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setPreviewData(resp.data)
    } catch (err: any) {
      const errors = err.response?.data?.errors
      if (Array.isArray(errors) && errors.length > 0) {
        setImportError(errors.map((e: any) => `${e.row}: ${e.errors?.join(', ')}`).join('\n'))
      } else {
        setImportError(err.response?.data?.detail || 'Failed to process return import preview.')
      }
    } finally {
      setImporting(false)
    }
  }

  const handleConfirmApply = async () => {
    if (!importFile) return
    setImporting(true)
    setImportError(null)
    const fd = new FormData()
    fd.append('file', importFile)
    fd.append('confirm', 'true')
    try {
      const resp = await api.post('/fulfillment/return-requests/import-returns/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      showSnackbar(`Import applied successfully! Success: ${resp.data.success_count}, Skipped: ${resp.data.skipped_count}, Rejected: ${resp.data.rejected_count}, Review Required: ${resp.data.review_required_count}`, 'success')
      setShowImportModal(false)
      setImportFile(null)
      setPreviewData(null)
      refetchReturns()
      refetchReturnLogs()
    } catch (err: any) {
      const errors = err.response?.data?.errors
      if (Array.isArray(errors) && errors.length > 0) {
        setImportError(errors.map((e: any) => `${e.row}: ${e.errors?.join(', ')}`).join('\n'))
      } else {
        setImportError(err.response?.data?.detail || 'Failed to apply return import.')
      }
    } finally {
      setImporting(false)
    }
  }

  const handleExportReturnsCSV = async () => {
    try {
      const resp = await api.get('/fulfillment/return-requests/export-csv/', { responseType: 'blob' })
      const blob = new Blob([resp.data], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', 'export_returns.csv')
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err: any) {
      showSnackbar(err.response?.data?.detail || 'Failed to export return requests.', 'error')
    }
  }

  const handleShippingFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setShippingFile(e.target.files[0])
      setShippingPreviewData(null)
      setShippingImportError(null)
    }
  }

  const handleShippingPreview = async () => {
    if (!shippingFile) return
    setShippingImporting(true)
    setShippingImportError(null)
    const fd = new FormData()
    fd.append('file', shippingFile)
    fd.append('confirm', 'false')
    try {
      const resp = await api.post('/fulfillment/handoffs/import-shipping/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setShippingPreviewData(resp.data)
    } catch (err: any) {
      const errors = err.response?.data?.errors
      if (Array.isArray(errors) && errors.length > 0) {
        setShippingImportError(errors.map((e: any) => `${e.row}: ${e.errors?.join(', ')}`).join('\n'))
      } else {
        setShippingImportError(err.response?.data?.detail || 'Failed to process shipping import preview.')
      }
    } finally {
      setShippingImporting(false)
    }
  }

  const handleShippingConfirmApply = async () => {
    if (!shippingFile) return
    setShippingImporting(true)
    setShippingImportError(null)
    const fd = new FormData()
    fd.append('file', shippingFile)
    fd.append('confirm', 'true')
    try {
      const resp = await api.post('/fulfillment/handoffs/import-shipping/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      showSnackbar(`Shipping import applied successfully! Success: ${resp.data.success_count}, Skipped: ${resp.data.skipped_count}, Rejected: ${resp.data.rejected_count}`, 'success')
      setShowShippingModal(false)
      setShippingFile(null)
      setShippingPreviewData(null)
      refetchHandoffs()
      refetchShippingLogs()
    } catch (err: any) {
      const errors = err.response?.data?.errors
      if (Array.isArray(errors) && errors.length > 0) {
        setShippingImportError(errors.map((e: any) => `${e.row}: ${e.errors?.join(', ')}`).join('\n'))
      } else {
        setShippingImportError(err.response?.data?.detail || 'Failed to apply shipping import.')
      }
    } finally {
      setShippingImporting(false)
    }
  }

  // Build header actions depending on active tab
  const headerActions = canManageFulfillment ? (
    <>
      {(tab === 'returns' || tab === 'returnLogs') && (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<DescriptionIcon />} onClick={handleExportReturnsCSV}>
            Export Returns (CSV)
          </Button>
          <Button
            variant="contained"
            startIcon={<CloudUploadIcon />}
            onClick={() => {
              setImportFile(null)
              setPreviewData(null)
              setImportError(null)
              setShowImportModal(true)
            }}
          >
            Import Returns (CSV)
          </Button>
        </Box>
      )}
      {(tab === 'handoffs' || tab === 'shippingLogs') && (
        <Button
          variant="contained"
          startIcon={<CloudUploadIcon />}
          onClick={() => {
            setShippingFile(null)
            setShippingPreviewData(null)
            setShippingImportError(null)
            setShowShippingModal(true)
          }}
        >
          Import Shipping Update (CSV)
        </Button>
      )}
    </>
  ) : null

  // Loading spinner helper
  const LoadingState = () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
      <CircularProgress />
    </Box>
  )

  // Empty state helper
  const EmptyState = ({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, gap: 1, color: 'text.secondary' }}>
      {icon}
      <Typography variant="subtitle1">{title}</Typography>
      <Typography variant="caption" color="text.disabled">{subtitle}</Typography>
    </Box>
  )

  // Label for a metadata field
  const MetaLabel = ({ children }: { children: React.ReactNode }) => (
    <Typography variant="overline" sx={{ color: 'text.disabled', display: 'block', fontSize: '0.65rem', fontWeight: 600, lineHeight: 1.4 }}>
      {children}
    </Typography>
  )

  const MetaValue = ({ children, mono, sx: extraSx }: { children: React.ReactNode; mono?: boolean; sx?: object }) => (
    <Typography
      variant="body2"
      sx={{
        fontWeight: 500,
        color: 'text.primary',
        mt: 0.25,
        ...(mono ? { fontFamily: 'monospace' } : {}),
        ...extraSx,
      }}
    >
      {children}
    </Typography>
  )

  return (
    <Box>
      <PageHeader
        title="Fulfillment & Returns"
        subtitle={
          isBuyer
            ? 'Shipment tracking and return status for your orders'
            : isVendor
              ? 'Vendor handoffs, shipping updates, and returns'
              : 'Vendor handoffs, SLA evaluation records, and response policies'
        }
        actions={headerActions}
      />

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        {visibleTabs.map(t => (
          <Tab key={t} label={TAB_LABELS[t]} value={t} />
        ))}
      </Tabs>

      {/* ===== HANDOFFS TAB ===== */}
      {tab === 'handoffs' && (
        <>
          <Card variant="outlined">
            {hLoading ? (
              <LoadingState />
            ) : handoffs.length === 0 ? (
              <EmptyState
                icon={<LocalShippingIcon sx={{ fontSize: 40 }} />}
                title="No fulfillment handoffs"
                subtitle="Handoffs are created when Order Routing hands off a suborder to a vendor"
              />
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Buyer Order #</TableCell>
                      <TableCell>Buyer ID</TableCell>
                      <TableCell>Vendor Order</TableCell>
                      <TableCell>Carrier</TableCell>
                      <TableCell>Tracking Number</TableCell>
                      <TableCell>Order Status</TableCell>
                      <TableCell>Shipped Date</TableCell>
                      <TableCell>Delivered Date</TableCell>
                      <TableCell>Handoff Ref</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedHandoffs.map((h: any) => (
                      <TableRow
                        key={h.id}
                        hover
                        onClick={() => setSelectedHandoff(h)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'primary.main', fontWeight: 600, fontSize: '0.75rem' }}>
                            {h.buyer_order_number || '\u2014'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                            {h.buyer_id ? (h.buyer_id.length > 8 ? h.buyer_id.slice(0, 8) + '\u2026' : h.buyer_id) : (h.company_scope_reference ? h.company_scope_reference.slice(0, 8) + '\u2026' : '\u2014')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 500 }}>
                            {h.vendor_order || h.vendor_order_number || '\u2014'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {h.shipping_carrier || '\u2014'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                            {h.shipping_tracking_number || h.tracking_number || '\u2014'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <StatusChip status={handoffStatusKey(h.status)} label={h.order_status || h.status} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>{formatDate(h.shipped_date)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>{formatDate(h.delivered_date)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.disabled' }}>
                            {h.id?.slice(0, 8)}\u2026
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
          <Pagination
            currentPage={handoffPage}
            totalPages={totalHandoffPages}
            totalItems={totalHandoffs}
            pageSize={50}
            onPageChange={setHandoffPage}
            itemName="handoffs"
          />
        </>
      )}

      {/* ===== SLA EVALUATIONS TAB ===== */}
      {tab === 'sla' && (
        <>
          <Card variant="outlined">
            {sLoading ? (
              <LoadingState />
            ) : slaEvals.length === 0 ? (
              <EmptyState
                icon={<AccessTimeIcon sx={{ fontSize: 40 }} />}
                title="No SLA evaluations yet"
                subtitle="SLA evaluations are triggered by confirmed delivery evidence from Order Routing. Records are immutable after creation."
              />
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Evaluation ID</TableCell>
                      <TableCell>Outcome</TableCell>
                      <TableCell>Expected Response By</TableCell>
                      <TableCell>Import Received</TableCell>
                      <TableCell>Evaluated At</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedSlaEvals.map((e: any) => (
                      <TableRow key={e.id}>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                            {e.id?.slice(0, 8)}\u2026
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <StatusChip status={slaOutcomeKey(e.outcome)} label={e.outcome} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                            {e.expected_response_by ? formatETDate(e.expected_response_by) : '\u2014'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {e.fulfillment_import_received_timestamp ? (
                            <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                              {formatETDate(e.fulfillment_import_received_timestamp)}
                            </Typography>
                          ) : (
                            <StatusChip status="archived" label="Not received" />
                          )}
                        </TableCell>
                        <TableCell>
                          {e.evaluated_at ? (
                            <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                              {formatETDate(e.evaluated_at)}
                            </Typography>
                          ) : (
                            <StatusChip status="pending" label="Pending" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
          <Pagination
            currentPage={slaPage}
            totalPages={totalSlaPages}
            totalItems={totalSlaEvals}
            pageSize={50}
            onPageChange={setSlaPage}
            itemName="evaluations"
          />
        </>
      )}

      {/* ===== SLA POLICIES TAB ===== */}
      {tab === 'policies' && (
        <>
          <Card variant="outlined">
            {pLoading ? (
              <LoadingState />
            ) : policies.length === 0 ? (
              <EmptyState
                icon={<ShieldIcon sx={{ fontSize: 40 }} />}
                title="No SLA policies defined"
                subtitle="Configure per-vendor SLA response windows and partial fulfillment thresholds"
              />
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Policy ID</TableCell>
                      <TableCell>Vendor</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Response Window</TableCell>
                      <TableCell>Partial Threshold</TableCell>
                      <TableCell>Effective From</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedPolicies.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                            {p.id?.slice(0, 8)}\u2026
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                            {p.vendor_company_reference?.slice(0, 8)}\u2026
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <StatusChip status={policyStatusKey(p.status)} label={p.status} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{p.response_window_hours != null ? `${p.response_window_hours}h` : '\u2014'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{p.partial_threshold_percent != null ? `${p.partial_threshold_percent}%` : '\u2014'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                            {p.effective_from ? formatDate(p.effective_from) : '\u2014'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
          <Pagination
            currentPage={policyPage}
            totalPages={totalPolicyPages}
            totalItems={totalPolicies}
            pageSize={50}
            onPageChange={setPolicyPage}
            itemName="policies"
          />
        </>
      )}

      {/* ===== EXPORT LOGS TAB ===== */}
      {tab === 'exportLogs' && (
        <>
          <Card variant="outlined">
            {lLoading ? (
              <LoadingState />
            ) : exportLogs.length === 0 ? (
              <EmptyState
                icon={<LocalShippingIcon sx={{ fontSize: 40 }} />}
                title="No export logs yet"
                subtitle="Logs will appear when daily vendor CSV files are exported."
              />
            ) : (
              <TableContainer sx={{ overflowX: 'auto', maxWidth: '100%' }}>
                <Table size="small" sx={{ minWidth: 1600 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ minWidth: 120, whiteSpace: 'nowrap' }}>Batch ID</TableCell>
                      <TableCell sx={{ minWidth: 130, whiteSpace: 'nowrap' }}>Vendor</TableCell>
                      <TableCell sx={{ minWidth: 130, whiteSpace: 'nowrap' }}>Buyer</TableCell>
                      <TableCell sx={{ minWidth: 170, whiteSpace: 'nowrap' }}>Filename</TableCell>
                      <TableCell sx={{ minWidth: 130, whiteSpace: 'nowrap' }}>Sent At</TableCell>
                      <TableCell sx={{ minWidth: 70, whiteSpace: 'nowrap' }}>Orders</TableCell>
                      <TableCell sx={{ minWidth: 80, whiteSpace: 'nowrap' }}>Suborders</TableCell>
                      <TableCell sx={{ minWidth: 80, whiteSpace: 'nowrap' }}>Trigger</TableCell>
                      <TableCell sx={{ minWidth: 120, whiteSpace: 'nowrap' }}>Triggered By</TableCell>
                      <TableCell sx={{ minWidth: 110, whiteSpace: 'nowrap' }}>Delivery</TableCell>
                      <TableCell sx={{ minWidth: 150, whiteSpace: 'nowrap' }}>Re-export</TableCell>
                      <TableCell sx={{ minWidth: 240, whiteSpace: 'nowrap' }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedExportLogs.map((log: any) => (
                      <Fragment key={log.id}>
                        <TableRow>
                          <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
                            <Tooltip title={log.audit_reference || ''}>
                              <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 500 }} noWrap>
                                {log.audit_reference?.slice(0, 8)}&hellip;
                              </Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
                            <Tooltip title={log.vendor_name || log.vendor_company_reference || ''}>
                              <Typography variant="body2" noWrap>{log.vendor_name || log.vendor_company_reference}</Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
                            <Tooltip title={log.buyer_name || log.buyer_company_reference || ''}>
                              <Typography variant="body2" noWrap>{log.buyer_name || log.buyer_company_reference}</Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 170 }}>
                            <Tooltip title={log.filename || ''}>
                              <Typography variant="caption" noWrap>{log.filename}</Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                              {log.sent_at ? formatETDate(log.sent_at) : '\u2014'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{log.order_count}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{log.suborder_count}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={log.trigger_type}
                              size="small"
                              color={log.trigger_type?.toUpperCase() === 'USER' ? 'info' : 'default'}
                              variant="filled"
                            />
                          </TableCell>
                          <TableCell>
                            {log.trigger_type?.toUpperCase() === 'USER' ? (
                              <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.75rem' }}>
                                {log.triggered_by_user_name_snapshot || 'User'}
                              </Typography>
                            ) : (
                              <Typography variant="body2" sx={{ color: 'text.disabled', fontSize: '0.75rem' }}>
                                {log.system_process_name || 'System Process'}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Tooltip title={log.email_send_result || ''}>
                              <Chip
                                label={deliveryStatusLabel(log.email_send_result)}
                                size="small"
                                color={deliveryStatusChipColor(log.email_send_result)}
                                variant="filled"
                              />
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={log.reexport_count > 0 ? `Original \u00B7 Re-exported \u00D7${log.reexport_count}` : 'Original'}
                              size="small"
                              color={log.reexport_count > 0 ? 'secondary' : 'default'}
                              variant="filled"
                              onClick={() => toggleExpandLog(log.id)}
                              icon={expandedLogIds.includes(log.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                              sx={{ cursor: 'pointer' }}
                            />
                          </TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            <Stack direction="row" spacing={0.5}>
                              <Button
                                size="small"
                                variant="contained"
                                sx={{ fontSize: 12, px: 1.5, minWidth: 0 }}
                                onClick={() => {
                                  setSelectedLogForReexport(log)
                                  setReexportReason('')
                                  setReexportExplanation('')
                                }}
                              >
                                Re-export
                              </Button>
                              <Button size="small" variant="outlined" sx={{ fontSize: 12, px: 1, minWidth: 0 }} startIcon={<DownloadIcon sx={{ fontSize: '14px !important' }} />} onClick={() => handleDownloadCSV(log)}>
                                CSV
                              </Button>
                              <Button size="small" variant="outlined" sx={{ fontSize: 12, px: 1, minWidth: 0 }} startIcon={<HistoryIcon sx={{ fontSize: '14px !important' }} />} onClick={() => setSelectedLogForAuditHistory(log)}>
                                Audit
                              </Button>
                            </Stack>
                          </TableCell>
                        </TableRow>

                        {/* Expanded re-export history inline */}
                        {expandedLogIds.includes(log.id) && (
                          <TableRow>
                            <TableCell colSpan={12} sx={{ p: 2, bgcolor: 'action.hover' }}>
                              <Box sx={{ pl: 2, borderLeft: 3, borderColor: 'primary.main', bgcolor: 'background.paper', borderRadius: 1, p: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                  <Typography variant="subtitle2">Export and Re-export Delivery History</Typography>
                                  <Typography variant="caption" color="text.disabled">({log.filename})</Typography>
                                </Box>
                                <TableContainer sx={{ overflowX: 'auto' }}>
                                <Table size="small" sx={{ minWidth: 900 }}>
                                  <TableHead>
                                    <TableRow>
                                      <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', minWidth: 90 }}>Type</TableCell>
                                      <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', minWidth: 130 }}>Date / Time</TableCell>
                                      <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', minWidth: 80 }}>Trigger</TableCell>
                                      <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', minWidth: 150 }}>Triggered By</TableCell>
                                      <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', minWidth: 120 }}>Reason</TableCell>
                                      <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', minWidth: 120 }}>Recipient</TableCell>
                                      <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', minWidth: 100 }}>Checksum</TableCell>
                                      <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', minWidth: 100 }}>Status</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {/* Original export row */}
                                    <TableRow>
                                      <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>Original</Typography>
                                      </TableCell>
                                      <TableCell>
                                        <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>{formatETDate(log.sent_at)}</Typography>
                                      </TableCell>
                                      <TableCell>
                                        <Chip label={log.trigger_type} size="small" color={log.trigger_type === 'user' ? 'info' : 'default'} />
                                      </TableCell>
                                      <TableCell>
                                        {log.trigger_type === 'user' ? (
                                          <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{log.triggered_by_name || log.triggered_by_user_name_snapshot || 'User'}</Typography>
                                            {log.triggered_by && (
                                              <Typography variant="caption" color="text.disabled">User ID: {log.triggered_by}</Typography>
                                            )}
                                            {log.triggered_by_company_name_snapshot && (
                                              <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>Company: {log.triggered_by_company_name_snapshot}</Typography>
                                            )}
                                            {log.triggered_by_role_snapshot && (
                                              <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>Role: {log.triggered_by_role_snapshot}</Typography>
                                            )}
                                          </Box>
                                        ) : (
                                          <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{log.system_process_name || 'Scheduled Vendor Order Export'}</Typography>
                                            <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>Process ID: {log.system_process_id || 'scheduled_order_export'}</Typography>
                                            <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>Job ID: {log.system_job_id || `job_${log.id.slice(0, 8)}`}</Typography>
                                            <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>Schedule: {log.system_schedule_desc || 'Daily vendor export'}</Typography>
                                          </Box>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        <Typography variant="body2">Initial export</Typography>
                                      </TableCell>
                                      <TableCell>
                                        <Typography variant="caption">{log.recipients?.join(', ') || '\u2014'}</Typography>
                                      </TableCell>
                                      <TableCell>
                                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>\u2014</Typography>
                                      </TableCell>
                                      <TableCell>
                                        <Chip
                                          label={deliveryStatusLabel(log.email_send_result)}
                                          size="small"
                                          color={deliveryStatusChipColor(log.email_send_result)}
                                        />
                                      </TableCell>
                                    </TableRow>

                                    {/* Re-export attempt rows */}
                                    {(log.reexport_attempts || []).map((attempt: any) => (
                                      <TableRow key={attempt.id}>
                                        <TableCell>
                                          <Typography variant="body2" sx={{ fontWeight: 500, color: 'secondary.main' }}>Re-export</Typography>
                                        </TableCell>
                                        <TableCell>
                                          <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>{formatETDate(attempt.requested_at)}</Typography>
                                        </TableCell>
                                        <TableCell>
                                          <Chip label={attempt.trigger_type} size="small" color="info" />
                                        </TableCell>
                                        <TableCell>
                                          {attempt.trigger_type === 'USER' || attempt.trigger_type === 'user' ? (
                                            <Box>
                                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{attempt.triggered_by_user_name_snapshot || 'User'}</Typography>
                                              {attempt.triggered_by_user && (
                                                <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>User ID: {attempt.triggered_by_user}</Typography>
                                              )}
                                              {attempt.triggered_by_company_name_snapshot && (
                                                <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>Company: {attempt.triggered_by_company_name_snapshot}</Typography>
                                              )}
                                              {attempt.triggered_by_role_snapshot && (
                                                <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>Role: {attempt.triggered_by_role_snapshot}</Typography>
                                              )}
                                            </Box>
                                          ) : (
                                            <Box>
                                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{attempt.system_process_name || 'Automatic delivery retry'}</Typography>
                                              <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>Process: {attempt.system_process_id || 'automated_retry'}</Typography>
                                              <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>Job: {attempt.system_job_id || `job_${attempt.id.slice(0, 8)}`}</Typography>
                                              <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>Schedule: {attempt.system_schedule_desc || 'Automatic delivery retry'}</Typography>
                                            </Box>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          <Typography variant="body2">{attempt.reason_code}</Typography>
                                          {attempt.reason_notes && (
                                            <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                                              &ldquo;{attempt.reason_notes}&rdquo;
                                            </Typography>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          <Typography variant="caption">{attempt.delivery_destination_snapshot}</Typography>
                                        </TableCell>
                                        <TableCell>
                                          <Tooltip title={attempt.file_checksum || ''}>
                                            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                              {attempt.file_checksum ? `${attempt.file_checksum.slice(0, 8)}\u2026` : '\u2014'}
                                            </Typography>
                                          </Tooltip>
                                        </TableCell>
                                        <TableCell>
                                          <Chip
                                            label={attempt.delivery_status}
                                            size="small"
                                            color={attemptDeliveryColor(attempt.delivery_status)}
                                          />
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                                </TableContainer>
                              </Box>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
          <Pagination
            currentPage={logPage}
            totalPages={totalLogPages}
            totalItems={totalExportLogs}
            pageSize={50}
            onPageChange={setLogPage}
            itemName="export logs"
          />
        </>
      )}

      {/* ===== RETURNS TAB ===== */}
      {tab === 'returns' && (
        <>
          <Card variant="outlined">
            {rLoading ? (
              <LoadingState />
            ) : returnsError ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, gap: 1, color: 'error.main' }}>
                <DescriptionIcon sx={{ fontSize: 40 }} />
                <Typography variant="subtitle1">Failed to load return requests</Typography>
                <Typography variant="caption">
                  {(returnsError as any)?.response?.data?.detail || (returnsError as any)?.message || 'An error occurred while loading return requests.'}
                </Typography>
              </Box>
            ) : returnRequests.length === 0 ? (
              <EmptyState
                icon={<DescriptionIcon sx={{ fontSize: 40 }} />}
                title="No return requests found"
                subtitle="Return requests appear when buyers initiate vendor returns."
              />
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>RAN</TableCell>
                      <TableCell>Suborder ID</TableCell>
                      <TableCell>SKU</TableCell>
                      <TableCell>UPC</TableCell>
                      <TableCell>Qty</TableCell>
                      <TableCell>Wholesale Price</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Received Date</TableCell>
                      <TableCell>Refunded Amount</TableCell>
                      <TableCell>Rejection Reason</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedReturnRequests.map((req: any) => {
                      const subRefStr = req.suborder_reference ? String(req.suborder_reference) : ''
                      const subRefDisplay = subRefStr ? `${subRefStr.slice(0, 8)}\u2026` : '\u2014'
                      const rawStatus = req.status ? String(req.status) : 'return_sent_to_vendor'
                      const statusDisplay = rawStatus.replace(/^return_/, '').replace(/_/g, ' ')

                      return (
                        <TableRow key={req.id || Math.random()}>
                          <TableCell>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'primary.main', fontWeight: 500 }}>
                              {req.ran || '\u2014'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{subRefDisplay}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{req.sku || '\u2014'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{req.upc || '\u2014'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{req.return_quantity ?? req.quantity ?? 1}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {req.vendor_wholesale_price != null ? formatCurrency(req.vendor_wholesale_price) : '\u2014'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <StatusChip status={returnStatusKey(rawStatus)} label={statusDisplay} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                              {req.return_received_date ? formatDate(req.return_received_date) : '\u2014'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {req.return_refunded_amount != null ? formatCurrency(req.return_refunded_amount) : '\u2014'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ maxWidth: 150 }}>
                            <Tooltip title={req.rejected_reason || ''}>
                              <Typography variant="body2" noWrap>{req.rejected_reason || '\u2014'}</Typography>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
          <Pagination
            currentPage={returnPage}
            totalPages={totalReturnPages}
            totalItems={totalReturnRequests}
            pageSize={50}
            onPageChange={setReturnPage}
            itemName="return requests"
          />
        </>
      )}

      {/* ===== RETURN IMPORT LOGS TAB ===== */}
      {tab === 'returnLogs' && (
        <>
          <Card variant="outlined">
            {rlLoading ? (
              <LoadingState />
            ) : returnImportLogs.length === 0 ? (
              <EmptyState
                icon={<LocalShippingIcon sx={{ fontSize: 40 }} />}
                title="No return import logs yet"
                subtitle="Logs will appear when return CSV files are imported."
              />
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Audit Ref</TableCell>
                      <TableCell>Uploaded At</TableCell>
                      <TableCell>Filename</TableCell>
                      <TableCell>Applied</TableCell>
                      <TableCell>Skipped</TableCell>
                      <TableCell>Review Req</TableCell>
                      <TableCell>Rejected</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedReturnImportLogs.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Tooltip title={log.audit_reference || ''}>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                              {log.audit_reference?.slice(0, 8)}\u2026
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                            {log.uploaded_at ? formatETDate(log.uploaded_at) : '\u2014'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 200 }}>
                          <Tooltip title={log.csv_filename || ''}>
                            <Typography variant="caption" noWrap>{log.csv_filename || '\u2014'}</Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Chip label={log.rows_applied} size="small" color="success" />
                        </TableCell>
                        <TableCell>
                          <Chip label={log.rows_skipped} size="small" color="default" />
                        </TableCell>
                        <TableCell>
                          <Chip label={log.rows_review_required} size="small" color="warning" />
                        </TableCell>
                        <TableCell>
                          <Chip label={log.rows_rejected} size="small" color="error" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
          <Pagination
            currentPage={returnLogPage}
            totalPages={totalReturnLogPages}
            totalItems={totalReturnImportLogs}
            pageSize={50}
            onPageChange={setReturnLogPage}
            itemName="import logs"
          />
        </>
      )}

      {/* ===== SHIPPING IMPORT LOGS TAB ===== */}
      {tab === 'shippingLogs' && (
        <>
          <Card variant="outlined">
            {slLoading ? (
              <LoadingState />
            ) : shippingImportLogs.length === 0 ? (
              <EmptyState
                icon={<LocalShippingIcon sx={{ fontSize: 40 }} />}
                title="No shipping import logs yet"
                subtitle="Logs will appear when shipping CSV files are imported."
              />
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Audit Ref</TableCell>
                      <TableCell>Uploaded At</TableCell>
                      <TableCell>Filename</TableCell>
                      <TableCell>Applied</TableCell>
                      <TableCell>Skipped</TableCell>
                      <TableCell>Rejected</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedShippingImportLogs.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Tooltip title={log.audit_reference || ''}>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                              {log.audit_reference?.slice(0, 8)}\u2026
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                            {log.uploaded_at ? formatETDate(log.uploaded_at) : '\u2014'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 200 }}>
                          <Tooltip title={log.csv_filename || ''}>
                            <Typography variant="caption" noWrap>{log.csv_filename || '\u2014'}</Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Chip label={log.rows_applied} size="small" color="success" />
                        </TableCell>
                        <TableCell>
                          <Chip label={log.rows_skipped} size="small" color="default" />
                        </TableCell>
                        <TableCell>
                          <Chip label={log.rows_rejected} size="small" color="error" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
          <Pagination
            currentPage={shippingLogPage}
            totalPages={totalShippingLogPages}
            totalItems={totalShippingImportLogs}
            pageSize={50}
            onPageChange={setShippingLogPage}
            itemName="import logs"
          />
        </>
      )}

      {/* ===== IMPORT SHIPPING MODAL ===== */}
      <Dialog open={showShippingModal} onClose={() => setShowShippingModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Import Shipping Update CSV</Typography>
            <IconButton size="small" onClick={() => setShowShippingModal(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {!shippingPreviewData ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FileUploadField
                accept=".csv"
                label={shippingFile ? `${shippingFile.name} (${(shippingFile.size / 1024).toFixed(1)} KB)` : 'Select Shipping CSV File'}
                onFiles={(files) => {
                  if (files[0]) {
                    setShippingFile(files[0])
                    setShippingPreviewData(null)
                    setShippingImportError(null)
                  }
                }}
                disabled={shippingImporting}
              />

              {shippingImportError && (
                <Alert severity="error" variant="outlined" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Validation Errors:</Typography>
                  {shippingImportError}
                </Alert>
              )}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Summary Bar */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, bgcolor: 'action.hover', p: 1.5, borderRadius: 1, border: 1, borderColor: 'divider' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="overline" color="text.disabled">Applied</Typography>
                  <Typography variant="h6" sx={{ color: 'success.main', fontWeight: 600 }}>{shippingPreviewData.summary?.applied || 0}</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="overline" color="text.disabled">Skipped</Typography>
                  <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 600 }}>{shippingPreviewData.summary?.skipped || 0}</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="overline" color="text.disabled">Rejected</Typography>
                  <Typography variant="h6" sx={{ color: 'error.main', fontWeight: 600 }}>{shippingPreviewData.summary?.rejected || 0}</Typography>
                </Box>
              </Box>

              {/* Preview Rows Table */}
              <TableContainer sx={{ maxHeight: 250 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 60 }}>Row</TableCell>
                      <TableCell>Suborder</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Validation / Message</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(shippingPreviewData.rows || []).map((r: any) => (
                      <TableRow key={r.row_index}>
                        <TableCell>{r.row_index}</TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{r.suborder || '\u2014'}</Typography>
                        </TableCell>
                        <TableCell>
                          <StatusChip
                            status={r.status === 'applied' ? 'completed' : r.status === 'skipped' ? 'archived' : 'error'}
                            label={r.status}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ color: r.errors?.length ? 'error.main' : 'text.disabled' }}>
                            {r.errors?.join(', ') || 'Validation Passed'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {shippingImportError && (
                <Typography variant="caption" color="error">{shippingImportError}</Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {!shippingPreviewData ? (
            <>
              <Button onClick={() => setShowShippingModal(false)}>Cancel</Button>
              <Button variant="contained" disabled={!shippingFile || shippingImporting} onClick={handleShippingPreview}>
                {shippingImporting ? 'Processing...' : 'Upload & Preview'}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setShippingPreviewData(null)}>Back</Button>
              <Button variant="contained" disabled={shippingImporting} onClick={handleShippingConfirmApply}>
                {shippingImporting ? 'Applying...' : 'Confirm & Apply'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* ===== IMPORT RETURN MODAL ===== */}
      <Dialog open={showImportModal} onClose={() => setShowImportModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Import Vendor Return CSV</Typography>
            <IconButton size="small" onClick={() => setShowImportModal(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {!previewData ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FileUploadField
                accept=".csv"
                label={importFile ? `${importFile.name} (${(importFile.size / 1024).toFixed(1)} KB)` : 'Select Return CSV File'}
                onFiles={(files) => {
                  if (files[0]) {
                    setImportFile(files[0])
                    setPreviewData(null)
                    setImportError(null)
                  }
                }}
                disabled={importing}
              />

              {importError && (
                <Alert severity="error" variant="outlined" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Validation Errors:</Typography>
                  {importError}
                </Alert>
              )}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Summary Bar */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.5, bgcolor: 'action.hover', p: 1.5, borderRadius: 1, border: 1, borderColor: 'divider' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="overline" color="text.disabled">Applied</Typography>
                  <Typography variant="h6" sx={{ color: 'success.main', fontWeight: 600 }}>{previewData.summary?.applied || 0}</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="overline" color="text.disabled">Skipped</Typography>
                  <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 600 }}>{previewData.summary?.skipped || 0}</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="overline" color="text.disabled">Review Req.</Typography>
                  <Typography variant="h6" sx={{ color: 'warning.main', fontWeight: 600 }}>{previewData.summary?.review_required || 0}</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="overline" color="text.disabled">Rejected</Typography>
                  <Typography variant="h6" sx={{ color: 'error.main', fontWeight: 600 }}>{previewData.summary?.rejected || 0}</Typography>
                </Box>
              </Box>

              {/* Preview Rows Table */}
              <TableContainer sx={{ maxHeight: 250 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 60 }}>Row</TableCell>
                      <TableCell>RAN</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Validation / Message</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(previewData.rows || []).map((r: any) => (
                      <TableRow key={r.row_index}>
                        <TableCell>{r.row_index}</TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{r.ran || '\u2014'}</Typography>
                        </TableCell>
                        <TableCell>
                          <StatusChip
                            status={r.status === 'applied' ? 'completed' : r.status === 'review_required' ? 'pending' : 'error'}
                            label={r.status}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ color: r.errors?.length ? 'error.main' : 'text.disabled' }}>
                            {r.errors?.join(', ') || 'Validation Passed'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {importError && (
                <Typography variant="caption" color="error">{importError}</Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {!previewData ? (
            <>
              <Button onClick={() => setShowImportModal(false)}>Cancel</Button>
              <Button variant="contained" disabled={!importFile || importing} onClick={handlePreview}>
                {importing ? 'Processing...' : 'Upload & Preview'}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setPreviewData(null)}>Back</Button>
              <Button variant="contained" disabled={importing} onClick={handleConfirmApply}>
                {importing ? 'Applying...' : 'Confirm & Apply'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* ===== RE-EXPORT CONFIRMATION MODAL ===== */}
      <Dialog open={!!selectedLogForReexport} onClose={() => setSelectedLogForReexport(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Confirm Manual Re-export</Typography>
            <IconButton size="small" onClick={() => setSelectedLogForReexport(null)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>
        {selectedLogForReexport && (
          <>
            <DialogContent dividers>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Metadata grid */}
                <Box sx={{ bgcolor: 'action.hover', border: 1, borderColor: 'divider', borderRadius: 1, p: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
                  <Box>
                    <MetaLabel>Vendor</MetaLabel>
                    <MetaValue>{selectedLogForReexport.vendor_name || selectedLogForReexport.vendor_company_reference}</MetaValue>
                  </Box>
                  <Box>
                    <MetaLabel>Buyer</MetaLabel>
                    <MetaValue>{selectedLogForReexport.buyer_name || selectedLogForReexport.buyer_company_reference}</MetaValue>
                  </Box>
                  <Box sx={{ gridColumn: 'span 2' }}>
                    <MetaLabel>Original Filename</MetaLabel>
                    <MetaValue mono sx={{ wordBreak: 'break-all' }}>{selectedLogForReexport.filename}</MetaValue>
                  </Box>
                  <Box>
                    <MetaLabel>Original Export Date</MetaLabel>
                    <MetaValue>{formatETDate(selectedLogForReexport.sent_at)}</MetaValue>
                  </Box>
                  <Box>
                    <MetaLabel>Counts</MetaLabel>
                    <MetaValue>{selectedLogForReexport.order_count} Orders / {selectedLogForReexport.suborder_count} Suborders</MetaValue>
                  </Box>
                  <Box>
                    <MetaLabel>Original Delivery Status</MetaLabel>
                    <MetaValue>{selectedLogForReexport.email_send_result || 'Pending'}</MetaValue>
                  </Box>
                  <Box>
                    <MetaLabel>Previous Re-exports</MetaLabel>
                    <MetaValue>{selectedLogForReexport.reexport_count} times</MetaValue>
                  </Box>
                  <Box sx={{ gridColumn: 'span 2' }}>
                    <MetaLabel>Delivery Destination</MetaLabel>
                    <MetaValue>{selectedLogForReexport.recipients?.join(', ') || 'N/A'}</MetaValue>
                  </Box>
                </Box>

                {/* Reason select */}
                <FormControl fullWidth size="small">
                  <InputLabel required>Re-export Reason</InputLabel>
                  <Select
                    label="Re-export Reason"
                    value={reexportReason}
                    onChange={e => {
                      setReexportReason(e.target.value)
                      if (e.target.value !== 'Other') {
                        setReexportExplanation('')
                      }
                    }}
                  >
                    <MenuItem value="">-- Select a Reason --</MenuItem>
                    <MenuItem value="Vendor did not receive file">Vendor did not receive file</MenuItem>
                    <MenuItem value="Vendor requested another copy">Vendor requested another copy</MenuItem>
                    <MenuItem value="Delivery failure retry">Delivery failure retry</MenuItem>
                    <MenuItem value="Internal support request">Internal support request</MenuItem>
                    <MenuItem value="Other">Other (Requires explanation)</MenuItem>
                  </Select>
                </FormControl>

                {reexportReason === 'Other' && (
                  <TextField
                    label="Explanation"
                    required
                    multiline
                    rows={3}
                    placeholder="Provide a detailed reason for this manual re-export..."
                    value={reexportExplanation}
                    onChange={e => setReexportExplanation(e.target.value)}
                    size="small"
                    fullWidth
                  />
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedLogForReexport(null)}>Cancel</Button>
              <Button
                variant="contained"
                disabled={!reexportReason || (reexportReason === 'Other' && !reexportExplanation.trim()) || reexportingId === selectedLogForReexport.id}
                onClick={() => handleReexport(selectedLogForReexport.id, reexportReason, reexportExplanation)}
              >
                {reexportingId === selectedLogForReexport.id ? 'Sending...' : 'Confirm Re-export'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ===== AUDIT HISTORY MODAL ===== */}
      <Dialog open={!!selectedLogForAuditHistory} onClose={() => setSelectedLogForAuditHistory(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccessTimeIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h6">Fulfillment Audit Trail &amp; History</Typography>
            </Box>
            <IconButton size="small" onClick={() => setSelectedLogForAuditHistory(null)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>
        {selectedLogForAuditHistory && (
          <>
            <DialogContent dividers>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

                {/* Batch Metadata Header Card */}
                <Box sx={{ bgcolor: 'action.hover', border: 1, borderColor: 'divider', borderRadius: 1, p: 2, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                  <Box>
                    <MetaLabel>Batch ID / Audit Reference</MetaLabel>
                    <MetaValue mono>{selectedLogForAuditHistory.audit_reference}</MetaValue>
                  </Box>
                  <Box>
                    <MetaLabel>Filename</MetaLabel>
                    <MetaValue mono sx={{ wordBreak: 'break-all' }}>{selectedLogForAuditHistory.filename}</MetaValue>
                  </Box>
                  <Box>
                    <MetaLabel>Vendor / Buyer</MetaLabel>
                    <MetaValue>{selectedLogForAuditHistory.vendor_name || 'Vendor'} &rarr; {selectedLogForAuditHistory.buyer_name || 'Buyer'}</MetaValue>
                  </Box>
                  <Box>
                    <MetaLabel>Total Records</MetaLabel>
                    <MetaValue>{selectedLogForAuditHistory.order_count} Orders / {selectedLogForAuditHistory.suborder_count} Suborders</MetaValue>
                  </Box>
                </Box>

                {/* Timeline Container */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, position: 'relative', pl: 3, borderLeft: 2, borderColor: 'divider' }}>

                  {/* Node 1: Original Export */}
                  <Box sx={{ position: 'relative', mb: 1 }}>
                    {/* Timeline Dot */}
                    <Box sx={{
                      position: 'absolute',
                      left: -31,
                      top: 2,
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      bgcolor: selectedLogForAuditHistory.email_send_result === 'success' ? 'success.main' : 'warning.main',
                      border: 3,
                      borderColor: 'background.paper',
                    }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="subtitle2">Original Export (Initial Dispatch)</Typography>
                      <Typography variant="caption" color="text.disabled">{formatETDate(selectedLogForAuditHistory.sent_at)}</Typography>
                    </Box>

                    <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 1.5 }}>
                      <Box>
                        <Typography variant="overline" sx={{ color: 'text.disabled', fontSize: '0.6rem' }}>TRIGGER TYPE</Typography>
                        <Box sx={{ mt: 0.25 }}>
                          <Chip label={selectedLogForAuditHistory.trigger_type} size="small" color="default" />
                        </Box>
                      </Box>
                      <Box>
                        <Typography variant="overline" sx={{ color: 'text.disabled', fontSize: '0.6rem' }}>INITIATED BY</Typography>
                        {selectedLogForAuditHistory.trigger_type?.toUpperCase() === 'USER' ? (
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedLogForAuditHistory.triggered_by_user_name_snapshot || 'User'}</Typography>
                            <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>Role: {selectedLogForAuditHistory.triggered_by_role_snapshot || 'N/A'}</Typography>
                            <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>Company: {selectedLogForAuditHistory.triggered_by_company_name_snapshot || 'N/A'}</Typography>
                          </Box>
                        ) : (
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedLogForAuditHistory.system_process_name || 'System Auto-digest'}</Typography>
                            <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>Process ID: {selectedLogForAuditHistory.system_process_id}</Typography>
                            {selectedLogForAuditHistory.system_schedule_desc && (
                              <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>Schedule: {selectedLogForAuditHistory.system_schedule_desc}</Typography>
                            )}
                          </Box>
                        )}
                      </Box>
                      <Box>
                        <Typography variant="overline" sx={{ color: 'text.disabled', fontSize: '0.6rem' }}>DESTINATION & METHOD</Typography>
                        <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{selectedLogForAuditHistory.recipients?.join(', ') || 'Browser Download'}</Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>Method: {selectedLogForAuditHistory.sending_method}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="overline" sx={{ color: 'text.disabled', fontSize: '0.6rem' }}>DELIVERY OUTCOME</Typography>
                        <Box sx={{ mt: 0.25 }}>
                          <Chip
                            label={selectedLogForAuditHistory.email_send_result || 'Pending'}
                            size="small"
                            color={deliveryStatusChipColor(selectedLogForAuditHistory.email_send_result)}
                          />
                        </Box>
                      </Box>
                    </Box>
                  </Box>

                  {/* Audit chain / Re-export & Download history */}
                  {selectedLogForAuditHistory.reexport_attempts && selectedLogForAuditHistory.reexport_attempts.length > 0 ? (
                    [...selectedLogForAuditHistory.reexport_attempts]
                      .sort((a: any, b: any) => new Date(a.requested_at).getTime() - new Date(b.requested_at).getTime())
                      .map((attempt: any) => {
                        const isDownload = attempt.action_type === 'DOWNLOAD'
                        return (
                          <Box key={attempt.id} sx={{ position: 'relative', mb: 1 }}>
                            {/* Timeline Dot */}
                            <Box sx={{
                              position: 'absolute',
                              left: -31,
                              top: 2,
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              bgcolor: isDownload ? 'secondary.main' : (attempt.delivery_status === 'SENT' || attempt.delivery_status === 'succeeded' ? 'success.main' : 'error.main'),
                              border: 3,
                              borderColor: 'background.paper',
                            }} />

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                              <Typography variant="subtitle2" sx={{ color: isDownload ? 'secondary.main' : 'primary.main' }}>
                                {isDownload ? `Manual CSV Download (Attempt #${attempt.attempt_number})` : `Re-export Attempt #${attempt.attempt_number}`}
                              </Typography>
                              <Typography variant="caption" color="text.disabled">
                                {formatETDate(attempt.requested_at || attempt.sent_at)}
                              </Typography>
                            </Box>

                            <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 1.5 }}>
                              <Box>
                                <Typography variant="overline" sx={{ color: 'text.disabled', fontSize: '0.6rem' }}>ACTION TYPE</Typography>
                                <Box sx={{ mt: 0.25 }}>
                                  <Chip label={attempt.action_type || 'REEXPORT'} size="small" color={isDownload ? 'secondary' : 'info'} />
                                </Box>
                                {attempt.parent_attempt && (
                                  <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block', fontSize: '0.65rem' }}>
                                    Linked to Parent Attempt #{attempt.parent_attempt?.attempt_number || '1'}
                                  </Typography>
                                )}
                              </Box>
                              <Box>
                                <Typography variant="overline" sx={{ color: 'text.disabled', fontSize: '0.6rem' }}>INITIATED BY</Typography>
                                {attempt.trigger_type?.toUpperCase() === 'USER' ? (
                                  <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{attempt.triggered_by_user_name_snapshot || 'User'}</Typography>
                                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>Role: {attempt.triggered_by_role_snapshot || 'N/A'}</Typography>
                                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>Company: {attempt.triggered_by_company_name_snapshot || 'N/A'}</Typography>
                                  </Box>
                                ) : (
                                  <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{attempt.system_process_name || 'System Automated Retry'}</Typography>
                                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>Process ID: {attempt.system_process_id}</Typography>
                                  </Box>
                                )}
                              </Box>
                              <Box>
                                <Typography variant="overline" sx={{ color: 'text.disabled', fontSize: '0.6rem' }}>DESTINATION & DETAILS</Typography>
                                <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{attempt.delivery_destination_snapshot || 'Browser Download'}</Typography>
                                {attempt.reason_code && (
                                  <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic', mt: 0.25, display: 'block' }}>
                                    Reason: &ldquo;{attempt.reason_code}&rdquo;
                                  </Typography>
                                )}
                                {attempt.reason_notes && (
                                  <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic', display: 'block' }}>
                                    Note: &ldquo;{attempt.reason_notes}&rdquo;
                                  </Typography>
                                )}
                              </Box>
                              <Box>
                                <Typography variant="overline" sx={{ color: 'text.disabled', fontSize: '0.6rem' }}>STATUS</Typography>
                                <Box sx={{ mt: 0.25 }}>
                                  <Chip
                                    label={attempt.delivery_status}
                                    size="small"
                                    color={attemptDeliveryColor(attempt.delivery_status)}
                                  />
                                </Box>
                                {attempt.file_checksum && (
                                  <Tooltip title={attempt.file_checksum}>
                                    <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.disabled', mt: 0.5, display: 'block', fontSize: '0.65rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      SHA-256: {attempt.file_checksum.slice(0, 12)}...
                                    </Typography>
                                  </Tooltip>
                                )}
                                {attempt.ip_address && (
                                  <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', display: 'block' }}>
                                    IP: {attempt.ip_address}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </Box>
                        )
                      })
                  ) : (
                    <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic', py: 0.5 }}>
                      No re-exports or downloads have been recorded for this batch.
                    </Typography>
                  )}
                </Box>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button variant="contained" onClick={() => setSelectedLogForAuditHistory(null)}>
                Close Audit Trail
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ===== SHIPPING INFORMATION DRAWER ===== */}
      <Drawer
        anchor="right"
        open={!!selectedHandoff}
        onClose={() => setSelectedHandoff(null)}
        slotProps={{ paper: { sx: { width: 560, maxWidth: '100%' } } }}
      >
        {selectedHandoff && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: 1, borderColor: 'divider', pb: 2, mb: 2.5 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Shipping Information</Typography>
                <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5 }}>
                  Shipping Info Data Specification for Buyers
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => setSelectedHandoff(null)}>
                <CloseIcon />
              </IconButton>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
              <Box sx={{ bgcolor: 'action.hover', border: 1, borderColor: 'divider', borderRadius: 2, p: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <MetaLabel>1. Buyer Order Number</MetaLabel>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600, mt: 0.5 }}>
                    {selectedHandoff.buyer_order_number || '\u2014'}
                  </Typography>
                </Box>
                <Box>
                  <MetaLabel>2. Buyer ID</MetaLabel>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', mt: 0.5 }}>
                    {selectedHandoff.buyer_id || selectedHandoff.company_scope_reference || '\u2014'}
                  </Typography>
                </Box>
                <Box>
                  <MetaLabel>3. Vendor Order</MetaLabel>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 550, mt: 0.5 }}>
                    {selectedHandoff.vendor_order || selectedHandoff.vendor_order_number || '\u2014'}
                  </Typography>
                </Box>
                <Box>
                  <MetaLabel>4. Shipping Carrier</MetaLabel>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main', mt: 0.5 }}>
                    {selectedHandoff.shipping_carrier || '\u2014'}
                  </Typography>
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <MetaLabel>5. Shipping Tracking Number</MetaLabel>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', mt: 0.5, letterSpacing: '0.5px' }}>
                    {selectedHandoff.shipping_tracking_number || selectedHandoff.tracking_number || '\u2014'}
                  </Typography>
                </Box>
                <Box>
                  <MetaLabel>6. Order Status</MetaLabel>
                  <Box sx={{ mt: 0.5 }}>
                    <StatusChip status={handoffStatusKey(selectedHandoff.status)} label={selectedHandoff.order_status || selectedHandoff.status} />
                  </Box>
                </Box>
                <Box>
                  <MetaLabel>7. Shipped Date</MetaLabel>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {formatDate(selectedHandoff.shipped_date)}
                  </Typography>
                </Box>
                <Box>
                  <MetaLabel>8. Delivered Date</MetaLabel>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {formatDate(selectedHandoff.delivered_date)}
                  </Typography>
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <MetaLabel>Handoff Reference</MetaLabel>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.disabled', mt: 0.5 }}>
                    {selectedHandoff.id}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box sx={{ mt: 'auto', pt: 2.5, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="outlined" onClick={() => setSelectedHandoff(null)}>Close</Button>
            </Box>
          </Box>
        )}
      </Drawer>

      {/* ConfirmDialog for any future confirm() calls */}
      <ConfirmDialog {...dialogProps} />
    </Box>
  )
}
