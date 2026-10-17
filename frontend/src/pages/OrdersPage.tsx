import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Card from '@mui/material/Card'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Drawer from '@mui/material/Drawer'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'

import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import PersonIcon from '@mui/icons-material/Person'
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined'
import DescriptionIcon from '@mui/icons-material/Description'
import TagIcon from '@mui/icons-material/Tag'
import EmailIcon from '@mui/icons-material/Email'
import PlaceIcon from '@mui/icons-material/Place'
import EditIcon from '@mui/icons-material/Edit'
import InventoryIcon from '@mui/icons-material/Inventory'

import api from '../lib/apiClient'
import Pagination, { usePagination } from '../components/Pagination'
import PageHeader from '../components/layout/PageHeader'
import StatusChip from '../components/data-display/StatusChip'
import ConfirmDialog from '../components/feedback/ConfirmDialog'
import { useSnackbar } from '../components/feedback/SnackbarProvider'
import { useConfirmDialog } from '../hooks/useConfirmDialog'
import { formatCurrency, formatDate, getImageUrl } from '../lib/formatters'

const DEFAULT_FORM_DATA = {
  buyer_order_number: '',
  buyer_id: '',
  vendor_id: '',
  order_date_time: new Date().toISOString().slice(0, 19),
  first_name: '',
  last_name: '',
  email: '',
  address1: '',
  address2: '',
  city: '',
  state: '',
  zip_code: '',
  sku: '',
  product_name: '',
  vendor_color: '',
  quantity: 1,
  upc: '',
}

export default function OrdersPage() {
  const navigate = useNavigate()
  const { showSnackbar } = useSnackbar()
  const { dialogProps, confirm } = useConfirmDialog()

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [showNewOrderModal, setShowNewOrderModal] = useState(false)
  const [inputMode, setInputMode] = useState<'form' | 'json'>('form')
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA)
  const [rawJson, setRawJson] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  // Shipping Modal State
  const [showShippingModal, setShowShippingModal] = useState(false)
  const [shippingError, setShippingError] = useState<string | null>(null)
  const [shippingSuccess, setShippingSuccess] = useState<string | null>(null)
  const [isUpdatingShipping, setIsUpdatingShipping] = useState(false)
  const [pendingExportSubId, setPendingExportSubId] = useState<string | null>(null)
  const [shippingForm, setShippingForm] = useState({
    customer_first_name: '',
    customer_last_name: '',
    email: '',
    address_1: '',
    address_2: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
  })

  // Fetch orders list
  const { data, isLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.get('/routing/orders/', { params: { paginate: 'false' } }).then(r => r.data),
  })
  const orders = data?.results ?? (Array.isArray(data) ? data : [])

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    paginatedItems: paginatedOrders,
  } = usePagination(orders, 50)

  // Fetch detail for selected order
  const { data: orderDetail, refetch: refetchOrderDetail } = useQuery({
    queryKey: ['order-detail', selectedOrderId],
    queryFn: () => api.get(`/routing/orders/${selectedOrderId}/`).then(r => r.data),
    enabled: !!selectedOrderId,
  })

  // Fetch lines/items for selected order
  const { data: orderLines, isLoading: isLoadingLines } = useQuery({
    queryKey: ['order-lines', selectedOrderId],
    queryFn: () => api.get(`/routing/orders/${selectedOrderId}/lines/`).then(r => r.data),
    enabled: !!selectedOrderId,
  })

  // Fetch suborders for selected order
  const { data: suborders, isLoading: isLoadingSubs, refetch: refetchSuborders } = useQuery({
    queryKey: ['order-suborders', selectedOrderId],
    queryFn: () => api.get(`/routing/orders/${selectedOrderId}/suborders/`).then(r => r.data),
    enabled: !!selectedOrderId,
  })

  const handleOpenCreateModal = () => {
    setFormData({
      ...DEFAULT_FORM_DATA,
      buyer_order_number: `ORD-${Date.now().toString().slice(-6)}`,
      order_date_time: new Date().toISOString().slice(0, 19),
    })
    setRawJson('')
    setFormError(null)
    setFormSuccess(null)
    setShowNewOrderModal(true)
  }

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)
    setIsSubmitting(true)

    try {
      let payload: any = {}
      if (inputMode === 'json') {
        try {
          payload = JSON.parse(rawJson)
        } catch (err: any) {
          throw new Error('Invalid JSON payload: ' + err.message)
        }
      } else {
        payload = {
          ...formData,
          quantity: Number(formData.quantity) || 1,
        }
        if (!payload.buyer_id) delete payload.buyer_id
        if (!payload.vendor_id) delete payload.vendor_id
      }

      // Client-side completeness guard
      const fn = (payload.first_name || '').trim()
      const ln = (payload.last_name || '').trim()
      const a1 = (payload.address1 || payload.address_1 || '').trim()
      const ci = (payload.city || '').trim()
      const st = (payload.state || '').trim()
      const zp = (payload.zip_code || payload.zip || '').trim()
      const bon = (payload.buyer_order_number || '').trim()
      const sku = (payload.sku || '').trim()
      const upc = (payload.upc || '').trim()

      if (!bon) throw new Error('Buyer Order Number is required.')
      if (!fn) throw new Error('Customer First Name is required.')
      if (!ln) throw new Error('Customer Last Name is required.')
      if (!a1) throw new Error('Customer Shipping Address (Address Line 1) is required.')
      if (!ci) throw new Error('Customer City is required.')
      if (!st) throw new Error('Customer State is required.')
      if (!zp) throw new Error('Customer Zip Code is required.')
      if (!payload.order_lines && !sku && !upc) throw new Error('Order must include a valid Product SKU or UPC.')

      const res = await api.post('/routing/orders/', payload)
      setFormSuccess('Order created successfully!')
      refetchOrders()
      setTimeout(() => {
        setShowNewOrderModal(false)
        setFormSuccess(null)
        if (res.data?.id) {
          setSelectedOrderId(res.data.id)
        }
      }, 700)
    } catch (err: any) {
      const respData = err.response?.data
      let msg = err.message || 'Failed to create order.'
      if (respData) {
        const detail = respData.detail ?? respData
        if (typeof detail === 'string') {
          msg = detail
        } else if (Array.isArray(detail)) {
          msg = detail.join(' ')
        } else if (typeof detail === 'object') {
          const msgs: string[] = []
          for (const [k, v] of Object.entries(detail)) {
            msgs.push(`${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          }
          msg = msgs.join('; ')
        }
      }
      setFormError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenShippingModal = (errorContext?: string, autoRetrySubId?: string) => {
    const cust = orderDetail?.customer_details || {}
    const subCust = suborders?.[0]?.routing_snapshot?.customer_shipping || {}

    setShippingForm({
      customer_first_name: orderDetail?.first_name || cust.first_name || subCust.customer_first_name || subCust.first_name || '',
      customer_last_name: orderDetail?.last_name || cust.last_name || subCust.customer_last_name || subCust.last_name || '',
      email: orderDetail?.email || cust.email || subCust.email || subCust.customer_email || '',
      address_1: orderDetail?.address1 || cust.address1 || subCust.address_1 || subCust.address1 || '',
      address_2: orderDetail?.address2 || cust.address2 || subCust.address_2 || subCust.address2 || '',
      city: orderDetail?.city || cust.city || subCust.city || '',
      state: orderDetail?.state || cust.state || subCust.state || '',
      zip: orderDetail?.zip_code || cust.zip_code || subCust.zip || subCust.zip_code || '',
      country: subCust.country || 'US',
    })
    setShippingError(errorContext || null)
    setShippingSuccess(null)
    setPendingExportSubId(autoRetrySubId || null)
    setShowShippingModal(true)
  }

  const handleSaveShipping = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrderId) return

    setIsUpdatingShipping(true)
    setShippingError(null)
    setShippingSuccess(null)

    try {
      await api.patch(`/routing/orders/${selectedOrderId}/update-shipping/`, {
        customer_first_name: shippingForm.customer_first_name,
        customer_last_name: shippingForm.customer_last_name,
        email: shippingForm.email,
        address_1: shippingForm.address_1,
        address_2: shippingForm.address_2,
        city: shippingForm.city,
        state: shippingForm.state,
        zip: shippingForm.zip,
        country: shippingForm.country,
      })

      await Promise.all([
        refetchOrders(),
        refetchOrderDetail(),
        refetchSuborders(),
      ])

      if (pendingExportSubId) {
        setShippingSuccess('Shipping updated! Retrying manual export...')
        try {
          await api.post('/routing/orders/manual-export/', {
            suborder_ids: [pendingExportSubId],
            confirm: true,
          })
          setShowShippingModal(false)
          setPendingExportSubId(null)
          showSnackbar('Shipping updated and manual export initiated successfully! Redirecting to Fulfillment Export Logs...', 'success')
          navigate('/fulfillment?tab=exportLogs', { state: { tab: 'exportLogs' } })
          return
        } catch (exportErr: any) {
          const exportErrDetail = exportErr.response?.data?.detail || 'Failed to auto-retry export after updating shipping.'
          setShippingError(exportErrDetail)
          setIsUpdatingShipping(false)
          return
        }
      }

      setShippingSuccess('Shipping details updated successfully!')
      setTimeout(() => {
        setShowShippingModal(false)
      }, 800)
    } catch (err: any) {
      setShippingError(err.response?.data?.detail || 'Failed to update shipping information.')
    } finally {
      setIsUpdatingShipping(false)
    }
  }

  const handleManualExport = async (subId: string) => {
    const confirmed = await confirm({
      title: 'Manual Export',
      message: 'Manually export this suborder to the vendor?',
      confirmLabel: 'Export',
      confirmColor: 'primary',
    })
    if (!confirmed) return

    try {
      await api.post('/routing/orders/manual-export/', { suborder_ids: [subId], confirm: true })
      showSnackbar('Manual export initiated successfully! Redirecting to Export Logs...', 'success')
      refetchOrders()
      refetchOrderDetail()
      refetchSuborders()
      navigate('/fulfillment?tab=exportLogs', { state: { tab: 'exportLogs' } })
    } catch (err: any) {
      const errorDetail = err.response?.data?.detail || ''
      const ineligibleSuborders = err.response?.data?.preview?.ineligible_suborders || []
      const errorList = ineligibleSuborders.flatMap((item: any) => item.errors || [])

      const isShippingIssue = errorDetail.toLowerCase().includes('ineligible') ||
        errorList.some((msg: string) => /shipping|address|zip|city|state|customer/i.test(msg))

      if (isShippingIssue) {
        const reason = errorList.length > 0
          ? errorList.join('; ')
          : errorDetail || 'Missing required customer shipping information.'
        handleOpenShippingModal(
          `Export failed: ${reason}. Please supply the customer shipping details below to proceed.`,
          subId
        )
      } else {
        showSnackbar(errorDetail || 'Failed to trigger manual export.', 'error')
      }
    }
  }

  /* ---------- Shared sx helpers ---------- */
  const sectionTitleSx = {
    fontSize: 11,
    fontWeight: 600,
    color: 'text.secondary',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    mb: 1.5,
    display: 'flex',
    alignItems: 'center',
    gap: 1,
  } as const

  const detailCardSx = {
    bgcolor: 'action.hover',
    border: 1,
    borderColor: 'divider',
    borderRadius: 1,
    p: 2,
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 2,
  } as const

  const detailLabelSx = {
    fontSize: 11,
    color: 'text.secondary',
    fontWeight: 500,
  } as const

  const detailValueSx = {
    fontSize: 13,
    color: 'text.secondary',
  } as const

  const monoSx = {
    fontFamily: '"JetBrains Mono", monospace',
  } as const

  const formLabelSx = {
    fontSize: 11,
    fontWeight: 600,
    color: 'text.secondary',
    mb: 0.5,
  } as const

  return (
    <Box>
      <PageHeader
        title="Orders"
        subtitle="Buyer orders and vendor routing specification"
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateModal}
            size="small"
          >
            New Order
          </Button>
        }
      />

      {/* ---- Orders Table ---- */}
      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
            <CircularProgress size={32} />
          </Box>
        ) : orders.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, color: 'text.disabled', gap: 1 }}>
            <InventoryIcon sx={{ fontSize: 40 }} />
            <Typography variant="body2">No orders yet</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Order ID</TableCell>
                  <TableCell>Buyer Order #</TableCell>
                  <TableCell>Buyer</TableCell>
                  <TableCell>Placed</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Customer Name</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedOrders.map((o: any) => (
                  <TableRow
                    key={o.id}
                    hover
                    onClick={() => setSelectedOrderId(o.id)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell sx={{ color: 'primary.main', fontWeight: 600, ...monoSx }}>
                      {o.order_id || `${o.id.slice(0, 8)}...`}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, fontWeight: 550, color: 'text.primary', ...monoSx }}>
                      {o.buyer_order_number || o.buyer_reference || '\u2014'}
                    </TableCell>
                    <TableCell>{o.buyer_name ?? '\u2014'}</TableCell>
                    <TableCell>
                      {formatDate(o.order_date_time || o.placed_at)}
                    </TableCell>
                    <TableCell>
                      <StatusChip status={o.status} />
                    </TableCell>
                    <TableCell>
                      {o.customer_name ?? (o.first_name ? `${o.first_name} ${o.last_name || ''}`.trim() : '\u2014')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={50}
        onPageChange={setCurrentPage}
        itemName="orders"
      />

      {/* ---- CREATE / INGEST BUYER ORDER MODAL ---- */}
      <Dialog
        open={showNewOrderModal}
        onClose={() => setShowNewOrderModal(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { maxHeight: '90vh' } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', pb: 1 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              New Buyer Order
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Ingest an order matching the 17-field Order Data Specification for Buyers
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setShowNewOrderModal(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          {/* Mode Toggle */}
          <ToggleButtonGroup
            value={inputMode}
            exclusive
            onChange={(_e, val) => {
              if (val) {
                if (val === 'json' && !rawJson) {
                  setRawJson(JSON.stringify(formData, null, 2))
                }
                setInputMode(val)
              }
            }}
            size="small"
            sx={{ mb: 2 }}
          >
            <ToggleButton value="form">Form View</ToggleButton>
            <ToggleButton value="json">Raw JSON</ToggleButton>
          </ToggleButtonGroup>

          {formError && (
            <Alert severity="error" icon={<ErrorOutlineIcon fontSize="small" />} sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}

          {formSuccess && (
            <Alert severity="success" icon={<CheckCircleOutlineIcon fontSize="small" />} sx={{ mb: 2 }}>
              {formSuccess}
            </Alert>
          )}

          <Box component="form" id="create-order-form" onSubmit={handleCreateOrder}>
            {inputMode === 'json' ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Order Data JSON Payload (17 Fields)
                </Typography>
                <TextField
                  multiline
                  rows={16}
                  value={rawJson}
                  onChange={(e) => setRawJson(e.target.value)}
                  placeholder="Paste order JSON with vendor_id, first_name, last_name, email, address1, etc."
                  fullWidth
                  slotProps={{
                    input: { sx: { ...monoSx, fontSize: 12, lineHeight: 1.4 } },
                  }}
                />
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {/* Section 1: Order Identifiers */}
                <Box>
                  <Typography sx={{ ...formLabelSx, textTransform: 'uppercase', mb: 1.25, display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 12, fontWeight: 700 }}>
                    <TagIcon sx={{ fontSize: 14, color: 'primary.main' }} /> 1. Order Identifiers
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 1.5 }}>
                    <Box>
                      <Typography sx={formLabelSx}>Buyer Order Number *</Typography>
                      <TextField
                        size="small"
                        required
                        fullWidth
                        value={formData.buyer_order_number}
                        onChange={e => setFormData({ ...formData, buyer_order_number: e.target.value })}
                        placeholder="e.g. ORD-100234"
                      />
                    </Box>
                    <Box>
                      <Typography sx={formLabelSx}>Buyer ID (Optional UUID)</Typography>
                      <TextField
                        size="small"
                        fullWidth
                        value={formData.buyer_id}
                        onChange={e => setFormData({ ...formData, buyer_id: e.target.value })}
                        placeholder="Auto-resolved if omitted"
                        slotProps={{ input: { sx: monoSx } }}
                      />
                    </Box>
                    <Box>
                      <Typography sx={formLabelSx}>Order Date Time (UTC)</Typography>
                      <TextField
                        size="small"
                        type="datetime-local"
                        fullWidth
                        value={formData.order_date_time}
                        onChange={e => setFormData({ ...formData, order_date_time: e.target.value })}
                      />
                    </Box>
                  </Box>
                </Box>

                {/* Section 2: Shipping & Customer Information */}
                <Box>
                  <Typography sx={{ ...formLabelSx, textTransform: 'uppercase', mb: 1.25, display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 12, fontWeight: 700 }}>
                    <PlaceIcon sx={{ fontSize: 14, color: 'primary.main' }} /> 2. Customer Shipping Information
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 1.5 }}>
                    <Box>
                      <Typography sx={formLabelSx}>First Name *</Typography>
                      <TextField
                        size="small"
                        required
                        fullWidth
                        value={formData.first_name}
                        onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                        placeholder="e.g. Jane"
                      />
                    </Box>
                    <Box>
                      <Typography sx={formLabelSx}>Last Name *</Typography>
                      <TextField
                        size="small"
                        required
                        fullWidth
                        value={formData.last_name}
                        onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                        placeholder="e.g. Doe"
                      />
                    </Box>
                    <Box>
                      <Typography sx={formLabelSx}>Email *</Typography>
                      <TextField
                        size="small"
                        type="email"
                        required
                        fullWidth
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        placeholder="e.g. jane.doe@example.com"
                      />
                    </Box>
                    <Box sx={{ gridColumn: '1 / -1' }}>
                      <Typography sx={formLabelSx}>Address 1 *</Typography>
                      <TextField
                        size="small"
                        required
                        fullWidth
                        value={formData.address1}
                        onChange={e => setFormData({ ...formData, address1: e.target.value })}
                        placeholder="e.g. 100 Main St"
                      />
                    </Box>
                    <Box>
                      <Typography sx={formLabelSx}>Address 2</Typography>
                      <TextField
                        size="small"
                        fullWidth
                        value={formData.address2}
                        onChange={e => setFormData({ ...formData, address2: e.target.value })}
                        placeholder="e.g. Suite 400"
                      />
                    </Box>
                    <Box>
                      <Typography sx={formLabelSx}>City *</Typography>
                      <TextField
                        size="small"
                        required
                        fullWidth
                        value={formData.city}
                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                        placeholder="e.g. Austin"
                      />
                    </Box>
                    <Box>
                      <Typography sx={formLabelSx}>State *</Typography>
                      <TextField
                        size="small"
                        required
                        fullWidth
                        value={formData.state}
                        onChange={e => setFormData({ ...formData, state: e.target.value })}
                        placeholder="e.g. TX"
                      />
                    </Box>
                    <Box>
                      <Typography sx={formLabelSx}>Zip Code *</Typography>
                      <TextField
                        size="small"
                        required
                        fullWidth
                        value={formData.zip_code}
                        onChange={e => setFormData({ ...formData, zip_code: e.target.value })}
                        placeholder="e.g. 78701"
                      />
                    </Box>
                  </Box>
                </Box>

                {/* Section 3: Product Item & Vendor Details */}
                <Box>
                  <Typography sx={{ ...formLabelSx, textTransform: 'uppercase', mb: 1.25, display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 12, fontWeight: 700 }}>
                    <ShoppingBagIcon sx={{ fontSize: 14, color: 'primary.main' }} /> 3. Product & Vendor Details
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 1.5 }}>
                    <Box>
                      <Typography sx={formLabelSx}>Vendor ID (Optional UUID)</Typography>
                      <TextField
                        size="small"
                        fullWidth
                        value={formData.vendor_id}
                        onChange={e => setFormData({ ...formData, vendor_id: e.target.value })}
                        placeholder="Vendor brand UUID"
                        slotProps={{ input: { sx: monoSx } }}
                      />
                    </Box>
                    <Box>
                      <Typography sx={formLabelSx}>Product Name *</Typography>
                      <TextField
                        size="small"
                        required
                        fullWidth
                        value={formData.product_name}
                        onChange={e => setFormData({ ...formData, product_name: e.target.value })}
                        placeholder="e.g. Ultra Grip Phone Case"
                      />
                    </Box>
                    <Box>
                      <Typography sx={formLabelSx}>SKU *</Typography>
                      <TextField
                        size="small"
                        required
                        fullWidth
                        value={formData.sku}
                        onChange={e => setFormData({ ...formData, sku: e.target.value })}
                        placeholder="e.g. SKU-1001"
                        slotProps={{ input: { sx: monoSx } }}
                      />
                    </Box>
                    <Box>
                      <Typography sx={formLabelSx}>Vendor Color</Typography>
                      <TextField
                        size="small"
                        fullWidth
                        value={formData.vendor_color}
                        onChange={e => setFormData({ ...formData, vendor_color: e.target.value })}
                        placeholder="e.g. Midnight Black"
                      />
                    </Box>
                    <Box>
                      <Typography sx={formLabelSx}>Quantity *</Typography>
                      <TextField
                        size="small"
                        type="number"
                        required
                        fullWidth
                        slotProps={{ htmlInput: { min: 1 } }}
                        value={formData.quantity}
                        onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                      />
                    </Box>
                    <Box>
                      <Typography sx={formLabelSx}>UPC</Typography>
                      <TextField
                        size="small"
                        fullWidth
                        value={formData.upc}
                        onChange={e => setFormData({ ...formData, upc: e.target.value })}
                        placeholder="e.g. 012345678905"
                        slotProps={{ input: { sx: monoSx } }}
                      />
                    </Box>
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setShowNewOrderModal(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-order-form"
            variant="contained"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating Order...' : 'Submit Buyer Order'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---- ADD / UPDATE SHIPPING MODAL ---- */}
      <Dialog
        open={showShippingModal}
        onClose={() => setShowShippingModal(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { maxHeight: '90vh' } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', pb: 1 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
              <LocalShippingIcon sx={{ fontSize: 20, color: 'primary.main' }} />
              {pendingExportSubId ? 'Add Shipping to Complete Export' : 'Update Customer Shipping'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {pendingExportSubId
                ? 'This order requires valid customer shipping details before it can be exported to the vendor.'
                : 'Update the customer shipping address for this placed order.'}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setShowShippingModal(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          {shippingError && (
            <Alert severity="error" icon={<ErrorOutlineIcon fontSize="small" />} sx={{ mb: 2 }}>
              {shippingError}
            </Alert>
          )}

          {shippingSuccess && (
            <Alert severity="success" icon={<CheckCircleOutlineIcon fontSize="small" />} sx={{ mb: 2 }}>
              {shippingSuccess}
            </Alert>
          )}

          <Box
            component="form"
            id="shipping-form"
            onSubmit={handleSaveShipping}
            sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}
          >
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 1.5 }}>
              <Box>
                <Typography sx={formLabelSx}>First Name *</Typography>
                <TextField
                  size="small"
                  required
                  fullWidth
                  value={shippingForm.customer_first_name}
                  onChange={e => setShippingForm({ ...shippingForm, customer_first_name: e.target.value })}
                  placeholder="e.g. Jane"
                />
              </Box>
              <Box>
                <Typography sx={formLabelSx}>Last Name *</Typography>
                <TextField
                  size="small"
                  required
                  fullWidth
                  value={shippingForm.customer_last_name}
                  onChange={e => setShippingForm({ ...shippingForm, customer_last_name: e.target.value })}
                  placeholder="e.g. Doe"
                />
              </Box>
            </Box>

            <Box>
              <Typography sx={formLabelSx}>Email (Optional)</Typography>
              <TextField
                size="small"
                type="email"
                fullWidth
                value={shippingForm.email}
                onChange={e => setShippingForm({ ...shippingForm, email: e.target.value })}
                placeholder="e.g. jane.doe@example.com"
              />
            </Box>

            <Box>
              <Typography sx={formLabelSx}>Address Line 1 *</Typography>
              <TextField
                size="small"
                required
                fullWidth
                value={shippingForm.address_1}
                onChange={e => setShippingForm({ ...shippingForm, address_1: e.target.value })}
                placeholder="e.g. 123 Main St"
              />
            </Box>

            <Box>
              <Typography sx={formLabelSx}>Address Line 2</Typography>
              <TextField
                size="small"
                fullWidth
                value={shippingForm.address_2}
                onChange={e => setShippingForm({ ...shippingForm, address_2: e.target.value })}
                placeholder="e.g. Suite 400"
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 1.5 }}>
              <Box>
                <Typography sx={formLabelSx}>City *</Typography>
                <TextField
                  size="small"
                  required
                  fullWidth
                  value={shippingForm.city}
                  onChange={e => setShippingForm({ ...shippingForm, city: e.target.value })}
                  placeholder="e.g. Austin"
                />
              </Box>
              <Box>
                <Typography sx={formLabelSx}>State *</Typography>
                <TextField
                  size="small"
                  required
                  fullWidth
                  value={shippingForm.state}
                  onChange={e => setShippingForm({ ...shippingForm, state: e.target.value })}
                  placeholder="e.g. TX"
                />
              </Box>
              <Box>
                <Typography sx={formLabelSx}>Zip Code *</Typography>
                <TextField
                  size="small"
                  required
                  fullWidth
                  value={shippingForm.zip}
                  onChange={e => setShippingForm({ ...shippingForm, zip: e.target.value })}
                  placeholder="e.g. 78701"
                />
              </Box>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            disabled={isUpdatingShipping}
            onClick={() => setShowShippingModal(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="shipping-form"
            variant="contained"
            disabled={isUpdatingShipping}
          >
            {isUpdatingShipping
              ? (pendingExportSubId ? 'Saving & Exporting...' : 'Saving...')
              : (pendingExportSubId ? 'Save & Export Now' : 'Save Shipping Details')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---- Order Details Drawer ---- */}
      <Drawer
        anchor="right"
        open={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        slotProps={{
          paper: {
            sx: {
              width: 580,
              maxWidth: '100%',
              p: 3,
              display: 'flex',
              flexDirection: 'column',
            },
          },
        }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', pb: 2, borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Order Routing Details
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={monoSx}>
              {orderDetail?.order_id ? `${orderDetail.order_id} \u2022 ${selectedOrderId}` : selectedOrderId}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setSelectedOrderId(null)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ overflowY: 'auto', flex: 1 }}>
          {/* Metadata Summary */}
          <Box sx={{ mb: 3.5 }}>
            <Typography sx={sectionTitleSx}>
              <InventoryIcon sx={{ fontSize: 14 }} /> Routing Metadata
            </Typography>
            <Box sx={detailCardSx}>
              <Box>
                <Typography sx={detailLabelSx}>Order ID</Typography>
                <Typography sx={{ ...detailValueSx, ...monoSx, fontSize: 13, fontWeight: 600, color: 'primary.main' }}>
                  {orderDetail?.order_id || '\u2014'}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Status</Typography>
                <Box sx={{ mt: 0.25 }}>
                  <StatusChip status={orderDetail?.status ?? '...'} />
                </Box>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Buyer Order Number</Typography>
                <Typography sx={{ ...detailValueSx, ...monoSx, fontSize: 12, fontWeight: 600, color: 'text.primary' }}>
                  {orderDetail?.buyer_order_number || orderDetail?.buyer_reference || '\u2014'}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Order Date Time (UTC)</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, ...detailValueSx }}>
                  <CalendarTodayIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                  <Typography variant="body2" sx={detailValueSx}>
                    {orderDetail?.order_date_time
                      ? formatDate(orderDetail.order_date_time)
                      : (orderDetail?.placed_at ? formatDate(orderDetail.placed_at) : '\u2014')
                    }
                  </Typography>
                </Box>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Buyer</Typography>
                <Typography sx={{ ...detailValueSx, fontWeight: 500 }}>
                  {orderDetail?.buyer_name ?? '\u2014'}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Buyer ID</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, ...detailValueSx, ...monoSx, fontSize: 11 }}>
                  <PersonIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                  <Typography variant="body2" sx={{ ...monoSx, fontSize: 11 }}>
                    {orderDetail?.buyer_id || orderDetail?.buyer_company_id || '\u2014'}
                  </Typography>
                </Box>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Company Scope</Typography>
                <Typography sx={{ ...detailValueSx, ...monoSx, fontSize: 11 }}>
                  {orderDetail?.company_scope_reference ?? '\u2014'}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Customer Details Section */}
          <Box sx={{ mb: 3.5 }}>
            <Box sx={{ ...sectionTitleSx, justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <PersonIcon sx={{ fontSize: 14 }} /> Customer & Shipping Details
              </Box>
              {orderDetail?.status === 'placed' && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<EditIcon sx={{ fontSize: 12 }} />}
                  onClick={() => handleOpenShippingModal()}
                  sx={{ fontSize: 11, py: 0.25, px: 1, minHeight: 'auto', textTransform: 'none' }}
                >
                  Edit Shipping
                </Button>
              )}
            </Box>
            <Box sx={detailCardSx}>
              <Box>
                <Typography sx={detailLabelSx}>First Name</Typography>
                <Typography sx={detailValueSx}>{orderDetail?.first_name || orderDetail?.customer_details?.first_name || '\u2014'}</Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Last Name</Typography>
                <Typography sx={detailValueSx}>{orderDetail?.last_name || orderDetail?.customer_details?.last_name || '\u2014'}</Typography>
              </Box>
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Typography sx={detailLabelSx}>Email</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, ...detailValueSx }}>
                  <EmailIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                  <Typography variant="body2" sx={detailValueSx}>
                    {orderDetail?.email || orderDetail?.customer_details?.email || '\u2014'}
                  </Typography>
                </Box>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Address 1</Typography>
                <Typography sx={detailValueSx}>{orderDetail?.address1 || orderDetail?.customer_details?.address1 || '\u2014'}</Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Address 2</Typography>
                <Typography sx={detailValueSx}>{orderDetail?.address2 || orderDetail?.customer_details?.address2 || '\u2014'}</Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>City</Typography>
                <Typography sx={detailValueSx}>{orderDetail?.city || orderDetail?.customer_details?.city || '\u2014'}</Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>State</Typography>
                <Typography sx={detailValueSx}>{orderDetail?.state || orderDetail?.customer_details?.state || '\u2014'}</Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Zip Code</Typography>
                <Typography sx={{ ...detailValueSx, ...monoSx }}>{orderDetail?.zip_code || orderDetail?.customer_details?.zip_code || '\u2014'}</Typography>
              </Box>
            </Box>
          </Box>

          {/* Items Ordered Section */}
          <Box sx={{ mb: 3.5 }}>
            <Typography sx={sectionTitleSx}>
              <ShoppingBagIcon sx={{ fontSize: 14 }} /> Items Ordered
            </Typography>
            {isLoadingLines ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={24} />
              </Box>
            ) : !orderLines || orderLines.length === 0 ? (
              <Typography variant="body2" color="text.disabled" sx={{ py: 2.5 }}>
                No line items found.
              </Typography>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Product / SKU</TableCell>
                      <TableCell>Vendor / Details</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orderLines.map((line: any) => (
                      <TableRow key={line.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            {line.primary_image_url ? (
                              <Box
                                component="img"
                                src={getImageUrl(line.primary_image_url)}
                                alt={line.product_name}
                                sx={{
                                  width: 40,
                                  height: 40,
                                  objectFit: 'cover',
                                  borderRadius: 0.75,
                                  border: 1,
                                  borderColor: 'divider',
                                  bgcolor: 'action.hover',
                                }}
                              />
                            ) : (
                              <Box
                                sx={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 0.75,
                                  border: 1,
                                  borderColor: 'divider',
                                  bgcolor: 'action.hover',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'text.disabled',
                                }}
                              >
                                <InventoryIcon sx={{ fontSize: 20 }} />
                              </Box>
                            )}
                            <Box>
                              <Typography variant="body2" color="text.primary" sx={{ fontSize: 13, fontWeight: 500 }}>
                                {line.product_name}
                              </Typography>
                              <Typography variant="caption" color="text.disabled" sx={{ ...monoSx, fontSize: 10 }}>
                                SKU: {line.sku} | UPC: {line.upc ?? 'N/A'}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ fontSize: 11, color: 'text.secondary' }}>
                            {(line.vendor_color || line.color) && (
                              <Typography variant="caption" component="div">
                                Color: <Box component="span" sx={{ color: 'primary.main', fontWeight: 500 }}>{line.vendor_color || line.color}</Box>
                              </Typography>
                            )}
                            <Typography variant="caption" color="text.disabled" sx={{ ...monoSx, fontSize: 10, display: 'block', mt: 0.25 }}>
                              Vendor: {line.vendor_name || (line.vendor_id ? line.vendor_id.slice(0, 8) + '...' : '\u2014')}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{line.quantity}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="text.secondary">
                            {formatCurrency(line.unit_price_snapshot)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
                            {formatCurrency(line.line_total)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>

          {/* Shipping Information Section (8-Field Buyer Shipping Specification) */}
          <Box sx={{ mb: 3.5 }}>
            <Typography sx={sectionTitleSx}>
              <LocalShippingIcon sx={{ fontSize: 14 }} /> Shipping Information
            </Typography>
            <Box sx={detailCardSx}>
              <Box>
                <Typography sx={detailLabelSx}>1. Buyer Order Number</Typography>
                <Typography sx={{ ...detailValueSx, ...monoSx, fontWeight: 600 }}>
                  {orderDetail?.buyer_order_number || orderDetail?.buyer_reference || '\u2014'}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>2. Buyer ID</Typography>
                <Typography sx={{ ...detailValueSx, ...monoSx, fontSize: 11 }}>
                  {orderDetail?.buyer_id || orderDetail?.company_scope_reference || '\u2014'}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>3. Vendor Order</Typography>
                <Typography sx={{ ...detailValueSx, ...monoSx }}>
                  {orderDetail?.vendor_order || '\u2014'}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>4. Shipping Carrier</Typography>
                <Typography sx={{ ...detailValueSx, fontWeight: 550, color: 'primary.main' }}>
                  {orderDetail?.shipping_carrier || (suborders && suborders[0]?.shipping_carrier) || '\u2014'}
                </Typography>
              </Box>
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Typography sx={detailLabelSx}>5. Shipping Tracking Number</Typography>
                <Typography sx={{ ...detailValueSx, ...monoSx, fontSize: 13, letterSpacing: '0.5px' }}>
                  {orderDetail?.shipping_tracking_number || (suborders && suborders[0]?.tracking_number) || '\u2014'}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>6. Order Status</Typography>
                <Box sx={{ mt: 0.25 }}>
                  <StatusChip status={orderDetail?.order_status || orderDetail?.status || '\u2014'} />
                </Box>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>7. Shipped Date</Typography>
                <Typography sx={detailValueSx}>
                  {orderDetail?.shipped_date || (suborders && suborders[0]?.shipped_date) || '\u2014'}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>8. Delivered Date</Typography>
                <Typography sx={detailValueSx}>
                  {orderDetail?.delivered_date || (suborders && suborders[0]?.delivered_date) || '\u2014'}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Suborders Section */}
          <Box sx={{ mb: 0 }}>
            <Typography sx={sectionTitleSx}>
              <LocalShippingIcon sx={{ fontSize: 14 }} /> Vendor Suborders
            </Typography>
            {isLoadingSubs ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={24} />
              </Box>
            ) : !suborders || suborders.length === 0 ? (
              <Typography variant="body2" color="text.disabled" sx={{ py: 2.5 }}>
                No vendor suborders routed.
              </Typography>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Vendor Reference</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {suborders.map((sub: any) => (
                      <TableRow key={sub.id}>
                        <TableCell sx={{ ...monoSx, fontSize: 11, color: 'text.secondary' }}>
                          {sub.vendor_company_reference}
                        </TableCell>
                        <TableCell>
                          <StatusChip status={sub.status} />
                        </TableCell>
                        <TableCell align="right">
                          {sub.status === 'placed' && (
                            <Button
                              variant="contained"
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleManualExport(sub.id)
                              }}
                              sx={{ fontSize: 12, textTransform: 'none' }}
                            >
                              Manual Export
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Box>
      </Drawer>

      {/* ---- Confirm Dialog ---- */}
      <ConfirmDialog {...dialogProps} />
    </Box>
  )
}
