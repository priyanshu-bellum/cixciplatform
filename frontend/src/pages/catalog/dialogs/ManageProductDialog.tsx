import React, { useState, useEffect, useMemo } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Tooltip from '@mui/material/Tooltip'
import CloseIcon from '@mui/icons-material/Close'
import LockIcon from '@mui/icons-material/Lock'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import api from '../../../lib/apiClient'
import { getImageUrl, formatCurrency, formatDate, formatETDate } from '../../../lib/formatters'
import { useSnackbar } from '../../../components/feedback/SnackbarProvider'
import { useConfirmDialog } from '../../../hooks/useConfirmDialog'
import ConfirmDialog from '../../../components/feedback/ConfirmDialog'
import ExcludeDeviceDialog from './ExcludeDeviceDialog'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import { useCompatibilityOptions, apiError } from '../../../hooks/useCompatibilityOptions'

interface ManageProductDialogProps {
  open: boolean
  onClose: () => void
  product: any
  user: any
  onProductUpdated: () => void
  onEditProduct: (p: any) => void
  devices: any[]
  activeCompatibilities: any[]
  refetchCompatibilities: () => void
  compatibilityLoading?: boolean
  compatibilityError?: boolean
}

type TabKey = 'details' | 'compatibility' | 'bulk' | 'audit' | 'original'

// ─── Presentational helpers ────────────────────────────────────────────────
const fieldLabelSx = { fontSize: 10.5, fontWeight: 600, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.5 }
const pillTabSx = (active: boolean) => ({
  appearance: 'none',
  font: 'inherit',
  fontSize: 12,
  fontWeight: 600,
  height: 32,
  px: 1.75,
  borderRadius: '999px',
  border: 1,
  borderColor: active ? 'text.primary' : 'divider',
  bgcolor: active ? 'text.primary' : 'background.paper',
  color: active ? 'background.paper' : 'text.primary',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease',
  '&:hover': { borderColor: active ? 'text.primary' : 'text.secondary' },
  '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
})
const galleryArrowSx = {
  position: 'absolute', top: '50%', transform: 'translateY(-50%)',
  width: 36, height: 36,
  bgcolor: 'background.paper', color: 'text.primary',
  border: 1, borderColor: 'divider',
  '&:hover': { bgcolor: 'background.paper', borderColor: 'text.secondary' },
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ bgcolor: 'background.paper', borderRadius: '16px', border: 1, borderColor: 'divider', p: 2.25 }}>
      <Typography sx={{ fontWeight: 700, fontSize: 13, color: 'text.primary', mb: 1.5 }}>
        {title}
      </Typography>
      {children}
    </Box>
  )
}

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography sx={{ ...fieldLabelSx, mb: 0.25 }}>
        {label}
      </Typography>
      <Box>{children}</Box>
    </Box>
  )
}

function PriceTile({ label, value, color = 'text.primary' }: { label: string; value: string; color?: string }) {
  return (
    <Box sx={{ flex: '1 1 130px', bgcolor: 'var(--bg-elevated)', borderRadius: '12px', px: 1.5, py: 1.25 }}>
      <Typography sx={fieldLabelSx}>{label}</Typography>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color, lineHeight: 1.3, mt: 0.25, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Typography>
    </Box>
  )
}

export default function ManageProductDialog({
  open,
  onClose,
  product,
  user,
  onProductUpdated,
  onEditProduct,
  devices,
  activeCompatibilities,
  refetchCompatibilities,
  compatibilityLoading,
  compatibilityError,
}: ManageProductDialogProps) {
  const { showSnackbar } = useSnackbar()
  const { dialogProps, confirm } = useConfirmDialog()

  const isCixciAdmin = user?.is_cixci_admin || user?.company_type === 'cixci_internal'
  const isVendor = user?.company_type === 'vendor'
  const isBuyer = user?.company_type === 'buyer'

  // ─── Local State ─────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabKey>('details')
  const [activeDetailImageUrl, setActiveDetailImageUrl] = useState<string | null>(null)

  // Compatibility tab
  const [quickAddDeviceId, setQuickAddDeviceId] = useState('')

  // Bulk tab
  const [bulkUpdateType, setBulkUpdateType] = useState<'add' | 'replace' | 'remove'>('add')
  const [bulkSelectedDevices, setBulkSelectedDevices] = useState<string[]>([])
  const [bulkReason, setBulkReason] = useState('')
  const [bulkNotes, setBulkNotes] = useState('')
  const { data: compatibilityOptions } = useCompatibilityOptions()
  const [isRecalculating, setIsRecalculating] = useState(false)

  // Audit tab
  const [auditHistory, setAuditHistory] = useState<any[]>([])
  const [isLoadingAudit, setIsLoadingAudit] = useState(false)

  // Exclude modal
  const [showExcludeModal, setShowExcludeModal] = useState(false)
  const [excludeDevice, setExcludeDevice] = useState<any>(null)

  // ─── Image Gallery ───────────────────────────────────────────────────────
  const allImages = useMemo(() => {
    if (!product) return []
    const list: string[] = []
    if (product.primary_image_url) {
      list.push(getImageUrl(product.primary_image_url))
    }
    if (Array.isArray(product.media_references)) {
      product.media_references.forEach((ref: any) => {
        const rawUrl = typeof ref === 'string' ? ref : (ref?.url || ref?.storage_key)
        if (rawUrl) {
          const url = getImageUrl(rawUrl)
          if (!list.includes(url)) {
            list.push(url)
          }
        }
      })
    }
    return list
  }, [product])

  // Sync active image on product change
  useEffect(() => {
    if (product) {
      setActiveDetailImageUrl(allImages[0] || null)
    } else {
      setActiveDetailImageUrl(null)
    }
  }, [product, allImages])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setActiveTab('details')
      setBulkSelectedDevices([])
      setQuickAddDeviceId('')
      setAuditHistory([])
    }
  }, [open])

  // Fetch audit history when audit tab is active
  useEffect(() => {
    if (activeTab === 'audit' && product && open) {
      setIsLoadingAudit(true)
      api.get(`/catalog/products/${product.id}/audit_history/`)
        .then(res => {
          setAuditHistory(res.data)
          setIsLoadingAudit(false)
        })
        .catch(() => {
          setAuditHistory([])
          setIsLoadingAudit(false)
        })
    }
  }, [activeTab, product, open])

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleDeleteProduct = async () => {
    if (!product) return
    if (product.status === 'active') {
      showSnackbar('Active products that are live and being sold by buyers cannot be deleted.', 'warning')
      return
    }
    const ok = await confirm({
      title: 'Delete product?',
      message: 'Are you sure you want to delete this product? This action cannot be undone.',
      confirmLabel: 'Delete',
      confirmColor: 'error',
    })
    if (!ok) return
    try {
      await api.delete(`/catalog/products/${product.id}/`)
      onClose()
      onProductUpdated()
    } catch (err: any) {
      showSnackbar('Failed to delete product: ' + (err.response?.data?.detail || err.message), 'error')
    }
  }

  // ── Compatibility Handlers ───────────────────────────────────────────────

  const handleOpenExcludeModal = (device: any) => {
    setExcludeDevice(device)
    setShowExcludeModal(true)
  }

  const handleExclusionSubmitted = () => {
    setShowExcludeModal(false)
    setExcludeDevice(null)
    refetchCompatibilities()
  }

  const handleRestoreCompatibility = async (deviceReference: string, exclusionType: string, isLocked: boolean) => {
    if (!product) return
    if (!isCixciAdmin) {
      if (isLocked) {
        showSnackbar('Cannot restore a locked mapping.', 'warning')
        return
      }
      if (exclusionType !== 'vendor') {
        showSnackbar('Vendors can only restore vendor exclusions.', 'warning')
        return
      }
    }
    try {
      await api.post(`/catalog/products/${product.id}/compatibility/`, {
        action: 'restore',
        device_reference: deviceReference,
      })
      refetchCompatibilities()
    } catch (err: any) {
      showSnackbar('Failed to restore device: ' + (err.response?.data?.error || err.message), 'error')
    }
  }

  const handleLockCompatibility = async (deviceReference: string) => {
    if (!product) return
    if (!isCixciAdmin) {
      showSnackbar('Only CIXCI Admins can lock device mappings.', 'warning')
      return
    }
    try {
      await api.post(`/catalog/products/${product.id}/compatibility/`, {
        action: 'lock',
        device_reference: deviceReference,
      })
      refetchCompatibilities()
    } catch (err: any) {
      showSnackbar('Failed to lock mapping: ' + (err.response?.data?.error || err.message), 'error')
    }
  }

  const handleConvertToAdminExclusion = async (deviceReference: string) => {
    if (!product) return
    if (!isCixciAdmin) {
      showSnackbar('Only CIXCI Admins can convert exclusions to Admin exclusions.', 'warning')
      return
    }
    try {
      await api.post(`/catalog/products/${product.id}/compatibility/`, {
        action: 'convert_to_admin_exclusion',
        device_reference: deviceReference,
      })
      refetchCompatibilities()
    } catch (err: any) {
      showSnackbar('Failed to convert exclusion: ' + (err.response?.data?.error || err.message), 'error')
    }
  }

  const handleQuickAddDevice = async () => {
    if (!product || !quickAddDeviceId) return
    try {
      await api.post(`/catalog/products/${product.id}/compatibility/`, {
        compatibility_update_type: 'add',
        assertions: [{ device_id: quickAddDeviceId, is_compatible: true }],
      })
      refetchCompatibilities()
      setQuickAddDeviceId('')
    } catch (err: any) {
      showSnackbar('Failed to add compatibility: ' + (err.response?.data?.error || err.message), 'error')
    }
  }

  // ── Bulk Handlers ────────────────────────────────────────────────────────

  const handleBulkCompatUpdate = async () => {
    if (!product || bulkSelectedDevices.length === 0) {
      showSnackbar('Please select at least one device.', 'warning')
      return
    }
    if (bulkUpdateType === 'replace' && product.status === 'active' && !isCixciAdmin) {
      showSnackbar('Replacing mappings on an active product requires CIXCI Admin approval.', 'warning')
      return
    }
    if (bulkUpdateType === 'remove' && (!bulkReason || (bulkReason === 'other' && !bulkNotes.trim()))) {
      showSnackbar('Select an exclusion reason. Other requires descriptive notes.', 'warning')
      return
    }
    try {
      const assertions = bulkSelectedDevices.map(dId => ({
        device_id: dId,
        is_compatible: true,
        ...(bulkUpdateType === 'remove' ? { exclusion_reason: bulkReason, notes: bulkNotes } : {}),
      }))
      await api.post(`/catalog/products/${product.id}/compatibility/`, {
        compatibility_update_type: bulkUpdateType,
        assertions,
      })
      refetchCompatibilities()
      showSnackbar('Bulk compatibility update completed successfully.', 'success')
      setBulkSelectedDevices([])
    } catch (err: any) {
      showSnackbar(apiError(err), 'error')
    }
  }

  const handleManualRecalculate = async () => {
    if (!product) return
    if (!isCixciAdmin) {
      showSnackbar('Only CIXCI Admins can manually trigger compatibility recalculation.', 'warning')
      return
    }
    setIsRecalculating(true)
    try {
      await api.post(`/catalog/products/${product.id}/recalculate-compatibility/`)
      refetchCompatibilities()
      showSnackbar('Compatibility recalculated successfully.', 'success')
    } catch (err: any) {
      showSnackbar('Failed to recalculate compatibility: ' + (err.response?.data?.error || err.message), 'error')
    } finally {
      setIsRecalculating(false)
    }
  }

  // ─── Image Navigation ───────────────────────────────────────────────────
  const navigateImage = (direction: -1 | 1) => {
    if (!activeDetailImageUrl || allImages.length <= 1) return
    const idx = allImages.indexOf(activeDetailImageUrl)
    const nextIdx = (idx + direction + allImages.length) % allImages.length
    setActiveDetailImageUrl(allImages[nextIdx])
  }

  // ─── Tab Definitions ────────────────────────────────────────────────────
  const tabs: { id: TabKey; label: string }[] = useMemo(() => {
    const list: { id: TabKey; label: string }[] = [
      { id: 'details', label: 'Details' },
      { id: 'compatibility', label: 'Device Compatibility' },
    ]
    if (!isBuyer && !isCixciAdmin) {
      list.push({ id: 'bulk', label: 'Bulk Update' })
    }
    if (!isBuyer) {
      list.push({ id: 'audit', label: 'Audit Trail' })
    }
    if (!isBuyer && product?.vendor_original_data && Object.keys(product.vendor_original_data).length > 0) {
      list.push({ id: 'original', label: 'Vendor Original' })
    }
    return list
  }, [isBuyer, isCixciAdmin, product?.vendor_original_data])

  if (!product) return null

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="lg"
        scroll="paper"
        slotProps={{ paper: { sx: { borderRadius: '24px', overflow: 'hidden', height: { md: 'min(880px, calc(100% - 64px))' } } } }}
      >
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <Box sx={{ px: 3, pt: 2.5, pb: 2, display: 'flex', gap: 2, alignItems: 'center', bgcolor: 'background.paper' }}>
          <Box sx={{
            width: 64, height: 64, flexShrink: 0,
            borderRadius: '14px', bgcolor: 'var(--bg-elevated)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            color: 'text.disabled', fontSize: 20, fontWeight: 600,
          }}>
            {product.primary_image_url ? (
              <Box
                component="img"
                src={getImageUrl(product.primary_image_url)}
                alt={product.name}
                sx={{ maxWidth: '84%', maxHeight: '84%', objectFit: 'contain' }}
              />
            ) : '?'}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            {(product.brand || product.series) && (
              <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.7, textTransform: 'uppercase', color: 'primary.light', mb: 0.25 }}>
                {product.brand}
                {product.series && (
                  <Box component="span" sx={{ color: 'text.disabled', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>
                    {product.brand ? ' · ' : ''}{product.series}
                  </Box>
                )}
              </Typography>
            )}
            <Typography sx={{ fontWeight: 600, fontSize: 17, lineHeight: 1.25, letterSpacing: '-0.01em', mb: 0.75 }}>
              {product.name}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', fontFamily: "'JetBrains Mono', monospace" }}>
                SKU: {product.sku}
              </Typography>
              {product.product_category && (
                <Box sx={{ px: 1.25, py: 0.25, borderRadius: '999px', bgcolor: 'var(--bg-elevated)', fontSize: 12, fontWeight: 500, color: 'text.secondary' }}>
                  {product.product_category}
                </Box>
              )}
            </Box>
          </Box>

          {/* Status Indicator */}
          <Box sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.75, flexShrink: 0,
            height: 30, px: 1.5, borderRadius: '999px', border: 1, borderColor: 'divider',
          }}>
            <Box sx={{
              width: 8, height: 8, borderRadius: '50%',
              bgcolor: product.status === 'active' ? 'success.main' : product.status === 'inactive' ? 'error.main' : 'warning.main',
            }} />
            <Typography sx={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
              {(product.status || 'unknown').replace(/_/g, ' ')}
            </Typography>
          </Box>

          <IconButton
            size="small"
            onClick={onClose}
            aria-label="Close"
            sx={{ flexShrink: 0, width: 36, height: 36, border: 1, borderColor: 'divider', alignSelf: 'flex-start' }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* ── Pill Navigation Tabs ─────────────────────────────────────────── */}
        <Box
          role="tablist"
          sx={{
            px: 3, pb: 2,
            borderBottom: 1, borderColor: 'divider',
            display: 'flex', gap: 1, flexWrap: 'wrap',
            bgcolor: 'background.paper',
          }}
        >
          {tabs.map(t => (
            <Box
              key={t.id}
              component="button"
              type="button"
              role="tab"
              aria-selected={activeTab === t.id}
              onClick={() => setActiveTab(t.id)}
              sx={pillTabSx(activeTab === t.id)}
            >
              {t.label}
            </Box>
          ))}
        </Box>

        {/* ── Dialog Content ───────────────────────────────────────────────── */}
        <DialogContent sx={{ p: 0, bgcolor: 'background.default' }}>
          <Box sx={{ p: 2.5 }}>

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* 1. DETAILS TAB                                                  */}
            {/* ════════════════════════════════════════════════════════════════ */}
            {activeTab === 'details' && (
              <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap' }}>

                {/* ── Left Column: Image Gallery ─────────────────────────── */}
                <Box sx={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: 2 }}>

                  {/* Image Viewer Card */}
                  <Box sx={{ bgcolor: 'background.paper', borderRadius: '16px', border: 1, borderColor: 'divider', p: 1.25 }}>
                    {/* Main Image */}
                    <Box sx={{
                      width: '100%', height: 340,
                      position: 'relative',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: 'var(--bg-elevated)', borderRadius: '12px', overflow: 'hidden',
                    }}>
                      {activeDetailImageUrl ? (
                        <>
                          <Box
                            component="img"
                            src={activeDetailImageUrl}
                            alt={product.name}
                            sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', p: 3 }}
                          />
                          {allImages.length > 1 && (
                            <>
                              <IconButton
                                size="small"
                                aria-label="Previous image"
                                onClick={() => navigateImage(-1)}
                                sx={{ ...galleryArrowSx, left: 10 }}
                              >
                                <ArrowBackIosNewIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                              <IconButton
                                size="small"
                                aria-label="Next image"
                                onClick={() => navigateImage(1)}
                                sx={{ ...galleryArrowSx, right: 10 }}
                              >
                                <ArrowForwardIosIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                              {/* Position Indicator */}
                              <Box sx={{
                                position: 'absolute', bottom: 10,
                                px: 1.25, py: 0.25, borderRadius: '999px',
                                bgcolor: 'background.paper', border: 1, borderColor: 'divider',
                                fontSize: 11.5, fontWeight: 600, color: 'text.secondary', fontVariantNumeric: 'tabular-nums',
                              }}>
                                {allImages.indexOf(activeDetailImageUrl) + 1} of {allImages.length}
                              </Box>
                            </>
                          )}
                        </>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, color: 'text.disabled' }}>
                          <Box sx={{ fontSize: 48, opacity: 0.3, lineHeight: 1 }}>&#128247;</Box>
                          <Typography variant="caption">No Image Available</Typography>
                        </Box>
                      )}
                    </Box>

                    {/* Thumbnail Strip */}
                    {allImages.length > 1 && (
                      <Box sx={{ display: 'flex', gap: 1, pt: 1.25, overflowX: 'auto' }}>
                        {allImages.map((imgUrl, i) => (
                          <Box
                            key={i}
                            component="button"
                            type="button"
                            aria-label={`Show image ${i + 1}`}
                            onClick={() => setActiveDetailImageUrl(imgUrl)}
                            sx={{
                              width: 58, height: 58, p: 0.5, flexShrink: 0,
                              border: '2px solid',
                              borderColor: activeDetailImageUrl === imgUrl ? 'text.primary' : 'transparent',
                              borderRadius: '12px',
                              bgcolor: 'var(--bg-elevated)',
                              overflow: 'hidden',
                              cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'all 0.2s',
                              opacity: activeDetailImageUrl === imgUrl ? 1 : 0.7,
                              '&:hover': {
                                opacity: 1,
                                borderColor: activeDetailImageUrl === imgUrl ? 'text.primary' : 'divider',
                              },
                            }}
                          >
                            <Box component="img" src={imgUrl} alt={`Thumbnail ${i + 1}`} sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>

                  {/* Image URLs */}
                  <SectionCard title="Image URLs">
                    {allImages.length === 0 ? (
                      <Typography variant="caption" color="text.disabled">{'—'}</Typography>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                        {allImages.map((url, i) => (
                          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0, fontFamily: 'monospace' }}>{i + 1}.</Typography>
                            <Typography
                              component="a"
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              variant="caption"
                              sx={{ color: 'primary.main', textDecoration: 'none', wordBreak: 'break-all', flex: 1, '&:hover': { textDecoration: 'underline' } }}
                            >
                              {url}
                            </Typography>
                            <Tooltip title="Open in new tab">
                              <IconButton size="small" component="a" href={url} target="_blank" rel="noopener noreferrer" sx={{ p: 0.25, flexShrink: 0 }}>
                                <OpenInNewIcon sx={{ fontSize: 13 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </SectionCard>
                </Box>

                {/* ── Right Column: Product Info ──────────────────────────── */}
                <Box sx={{ flex: '2 2 400px', display: 'flex', flexDirection: 'column', gap: 2 }}>

                  {/* Pricing */}
                  <SectionCard title="Pricing">
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', gap: 1.25 }}>
                      <Box sx={{ flex: '1 1 100%' }}>
                        <Typography sx={fieldLabelSx}>MSRP</Typography>
                        <Typography sx={{ fontSize: 24, fontWeight: 700, color: 'text.primary', letterSpacing: '-0.02em', lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>
                          {formatCurrency(product.msrp, product.vendor_wholesale_price_currency)}
                        </Typography>
                      </Box>

                      {!isVendor && (
                        <PriceTile
                          label="Wholesale"
                          color="primary.light"
                          value={formatCurrency(product.buyer_wholesale_price ?? product.vendor_wholesale_price_amount, product.vendor_wholesale_price_currency)}
                        />
                      )}

                      {(isVendor || isCixciAdmin) && product.vendor_wholesale_price_amount != null && (
                        <PriceTile
                          label="Vendor Wholesale"
                          color="primary.light"
                          value={formatCurrency(product.vendor_wholesale_price_amount, product.vendor_wholesale_price_currency)}
                        />
                      )}

                      {product.vendor_map_pricing_enforced && (
                        <PriceTile
                          label="MAP Price"
                          value={formatCurrency(product.map_price, product.vendor_wholesale_price_currency)}
                        />
                      )}

                      {product.sale_price && (
                        <PriceTile
                          label="Sale Price"
                          color="success.main"
                          value={formatCurrency(product.sale_price, product.vendor_wholesale_price_currency)}
                        />
                      )}
                    </Box>
                  </SectionCard>

                  {/* Specifications */}
                  <SectionCard title="Specifications">
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '14px 20px' }}>
                      <DetailField label="UPC">
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 500 }}>{product.upc || '—'}</Typography>
                      </DetailField>

                      <DetailField label="Color">
                        <Typography variant="body2">{product.color || '—'}</Typography>
                      </DetailField>

                      <DetailField label="System Color">
                        <Typography variant="body2">{product.system_color || '—'}</Typography>
                      </DetailField>

                      <DetailField label="Series">
                        <Typography variant="body2">{product.series || '—'}</Typography>
                      </DetailField>

                      <DetailField label="Product Category">
                        <Typography variant="body2">{product.product_category || '—'}</Typography>
                      </DetailField>

                      <DetailField label="Launch Date">
                        <Typography variant="body2">{product.launch_date ? formatDate(product.launch_date) : '—'}</Typography>
                      </DetailField>

                      {product.release_date && (
                        <DetailField label="Release Date">
                          <Typography variant="body2">{formatDate(product.release_date)}</Typography>
                        </DetailField>
                      )}

                      <DetailField label="Brand Warranty">
                        <Typography variant="body2">{product.warranty || '—'}</Typography>
                      </DetailField>

                      <DetailField label="Recommended">
                        <Chip
                          label={product.recommended_accessory ? 'Yes' : 'No'}
                          size="small"
                          color={product.recommended_accessory ? 'success' : 'default'}
                          variant="outlined"
                          sx={{ fontSize: 11, height: 22 }}
                        />
                      </DetailField>

                      {product.product_type && (
                        <DetailField label="Product Type">
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{product.product_type}</Typography>
                        </DetailField>
                      )}

                      {product.selling_status && (
                        <DetailField label="Selling Status">
                          <Typography variant="body2">{product.selling_status}</Typography>
                        </DetailField>
                      )}

                      {product.exported_date && (
                        <DetailField label={isBuyer ? 'Product Added Date' : 'Exported Date'}>
                          <Typography variant="body2">{product.exported_date}</Typography>
                        </DetailField>
                      )}
                    </Box>

                    {product.compatibility_mode === 'universal_device_type' && Array.isArray(product.compatible_device_types) && product.compatible_device_types.length > 0 && (
                      <Box sx={{ mt: 2, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
                        <Typography sx={{ fontSize: 10.5, fontWeight: 600, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.75 }}>
                          Universal Device Types
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                          {product.compatible_device_types.map((typeCode: string) => (
                            <Chip key={typeCode} label={typeCode} size="small" color="primary" variant="outlined" sx={{ textTransform: 'capitalize', fontSize: 11 }} />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </SectionCard>

                  {/* Physical Details & Inventory */}
                  <SectionCard title="Physical Details & Inventory">
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '14px 20px' }}>
                      <DetailField label="Dimensions">
                        <Typography variant="body2">
                          {product.length || product.width || product.height
                            ? `${product.length || 0}L × ${product.width || 0}W × ${product.height || 0}H in`
                            : '—'}
                        </Typography>
                      </DetailField>

                      <DetailField label="Weight">
                        <Typography variant="body2">{product.weight ? `${product.weight} ${product.weight_unit || 'oz'}` : '—'}</Typography>
                      </DetailField>

                      <DetailField label="Inventory Level">
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {product.inventory_level !== null && product.inventory_level !== undefined ? `${product.inventory_level} units` : '—'}
                        </Typography>
                      </DetailField>

                      <DetailField label="Inventory Threshold">
                        <Typography variant="body2">
                          {product.inventory_threshold !== null && product.inventory_threshold !== undefined ? `${product.inventory_threshold} units` : '—'}
                        </Typography>
                      </DetailField>
                    </Box>
                  </SectionCard>

                  {/* Clearance */}
                  {product.is_clearance && (
                    <SectionCard title="Clearance">
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '14px 20px' }}>
                        <DetailField label="Clearance Status">
                          <Chip label="Clearance" size="small" color="warning" sx={{ fontSize: 11, height: 22 }} />
                        </DetailField>
                        {product.clearance_type && (
                          <DetailField label="Clearance Type">
                            <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                              {product.clearance_type.replace(/_/g, ' ')}
                            </Typography>
                          </DetailField>
                        )}
                        {product.clearance_end_date && (
                          <DetailField label="Clearance End Date">
                            <Typography variant="body2">{formatDate(product.clearance_end_date)}</Typography>
                          </DetailField>
                        )}
                      </Box>
                    </SectionCard>
                  )}

                  {/* Vendor Return Address — Admin Only */}
                  {isCixciAdmin && (product.vendor_return_address1 || product.vendor_return_address) && (
                    <SectionCard title="Vendor Return Address">
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                        Vendor return shipping information (sent once per vendor, per buyer in export response).
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px 20px' }}>
                        <DetailField label="Address 1">
                          <Typography variant="body2">
                            {product.vendor_return_address1 || product.vendor_return_address?.address1 || '—'}
                          </Typography>
                        </DetailField>
                        <DetailField label="Address 2">
                          <Typography variant="body2">
                            {product.vendor_return_address2 || product.vendor_return_address?.address2 || '—'}
                          </Typography>
                        </DetailField>
                        <DetailField label="City">
                          <Typography variant="body2">
                            {product.vendor_return_city || product.vendor_return_address?.city || '—'}
                          </Typography>
                        </DetailField>
                        <DetailField label="State">
                          <Typography variant="body2">
                            {product.vendor_return_state || product.vendor_return_address?.state || '—'}
                          </Typography>
                        </DetailField>
                        <DetailField label="Zip Code">
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {product.vendor_return_zip_code || product.vendor_return_address?.zip_code || '—'}
                          </Typography>
                        </DetailField>
                      </Box>
                    </SectionCard>
                  )}

                  {/* Description */}
                  <SectionCard title="Description">
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary', lineHeight: 1.65, fontSize: 13 }}>
                      {product.description || '—'}
                    </Typography>
                  </SectionCard>

                  {/* SEO & Meta */}
                  <SectionCard title="SEO & Meta">
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
                      <Box>
                        <Typography sx={{ fontSize: 10.5, fontWeight: 600, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>
                          Meta Title
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>{product.meta_title || '—'}</Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: 10.5, fontWeight: 600, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>
                          Meta Description
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>{product.meta_description || '—'}</Typography>
                      </Box>
                    </Box>
                  </SectionCard>

                  {/* Short Description */}
                  {product.short_description && (
                    <SectionCard title="Short Description">
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary', lineHeight: 1.65, fontSize: 13 }}>
                        {product.short_description}
                      </Typography>
                    </SectionCard>
                  )}

                  {/* Promo Information */}
                  {product.promo_information && (
                    <SectionCard title="Promo Description">
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary', lineHeight: 1.65, fontSize: 13 }}>
                        {product.promo_information}
                      </Typography>
                    </SectionCard>
                  )}
                </Box>
              </Box>
            )}

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* 2. COMPATIBILITY TAB                                            */}
            {/* ════════════════════════════════════════════════════════════════ */}
            {activeTab === 'compatibility' && (
              <Box>
                {/* Universal Product Mapping Banner */}
                {product.compatibility_mode === 'universal_device_type' && Array.isArray(product.compatible_device_types) && product.compatible_device_types.length > 0 && (
                  <Alert severity="info" sx={{ mb: 1, fontSize: 12, py: 0.25 }}>
                    <strong>Universal Product Mapping Active:</strong> This product universally supports all{' '}
                    <strong>{product.compatible_device_types.join(' & ')}</strong>{' '}
                    devices within the configured category and device eligibility rules. Exclusions remain effective.
                  </Alert>
                )}

                {/* Quick-add device dropdown */}
                {!isCixciAdmin && !isBuyer && product.compatibility_mode !== 'universal_device_type' && !compatibilityLoading && !compatibilityError && (
                  <Box sx={{ display: 'flex', gap: 1, mb: 1, bgcolor: 'background.paper', p: 1.25, borderRadius: 2, border: 1, borderColor: 'divider' }}>
                    <Box
                      component="select"
                      value={quickAddDeviceId}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setQuickAddDeviceId(e.target.value)}
                      sx={{ flex: 1, bgcolor: 'background.default', border: 1, borderColor: 'divider', color: 'text.primary', p: '6px 10px', borderRadius: 1, fontSize: 13 }}
                    >
                      <option value="">-- Select Device to Add --</option>
                      {devices
                        .filter((d: any) => !activeCompatibilities?.some((c: any) => c.device_reference === d.id && !c.is_excluded))
                        .map((d: any) => (
                          <option key={d.id} value={d.id}>
                            {d.manufacturer_name} {d.name}
                          </option>
                        ))}
                    </Box>
                    <Button variant="contained" size="small" onClick={handleQuickAddDevice} disabled={!quickAddDeviceId}>
                      Add Device
                    </Button>
                  </Box>
                )}

                {/* Compatibility List */}
                {compatibilityLoading && <Alert severity="info">Loading current mappings…</Alert>}
                {compatibilityError && <Alert severity="error" action={<Button onClick={refetchCompatibilities}>Retry</Button>}>Current mappings could not be loaded.</Alert>}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {(() => {
                    const compatList = !isBuyer
                      ? activeCompatibilities
                      : (product.device_compatibility || []).map((dc: any) => ({
                          id: dc.device_id || dc.id || Math.random().toString(),
                          device_reference: dc.device_id || dc.id,
                          name: dc.name || dc.device_name,
                          model_number: dc.model_number,
                          is_excluded: false,
                        }))

                    if (!compatList || compatList.length === 0) {
                      return (
                        <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center', py: 2.5 }}>
                          No target devices mapped.
                        </Typography>
                      )
                    }

                    return compatList.map((c: any) => {
                      const dev = devices.find((d: any) => d.id === c.device_reference)
                      const deviceName = c.device_name || c.name || (dev ? `${dev.manufacturer_name} ${dev.name}` : 'Device record unavailable')

                      return (
                        <Box
                          key={c.id}
                          sx={{
                            display: 'flex', flexDirection: 'column', p: 1.25,
                            border: 1, borderColor: 'divider', borderRadius: 2,
                            bgcolor: c.is_excluded ? 'rgba(239, 68, 68, 0.05)' : 'background.paper',
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{deviceName}</Typography>
                              {c.model_number && (
                                <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace' }}>({c.model_number})</Typography>
                              )}
                              {c.is_locked && (
                                <Chip icon={<LockIcon sx={{ fontSize: 12 }} />} label="Locked" size="small" color="warning" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                              )}
                              {c.is_excluded ? (
                                <Chip label="Excluded" size="small" color="error" sx={{ fontSize: 10, height: 20 }} />
                              ) : (
                                <Chip label={c.is_compatible === false ? (c.match_status || 'Not currently compatible') : 'Compatible'} size="small" color={c.is_compatible === false ? 'default' : 'success'} sx={{ fontSize: 10, height: 20 }} />
                              )}
                              {c.exclusion_type && c.is_excluded && (
                                <Chip label={c.exclusion_type} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                              )}
                            </Box>

                            {/* Actions */}
                            <Box sx={{ display: 'flex', gap: 0.75 }}>
                              {/* Vendor actions */}
                              {!isCixciAdmin && !isBuyer && (
                                <>
                                  {c.is_excluded && (
                                    <Button size="small" variant="outlined" sx={{ fontSize: 11, py: 0.25, px: 1, minWidth: 0 }} onClick={() => handleRestoreCompatibility(c.device_reference, c.exclusion_type, c.is_locked)}>
                                      Restore
                                    </Button>
                                  )}
                                  {!c.is_excluded && (
                                    <Button size="small" variant="outlined" color="error" sx={{ fontSize: 11, py: 0.25, px: 1, minWidth: 0 }} onClick={() => handleOpenExcludeModal(dev || { id: c.device_reference, name: deviceName })}>
                                      Exclude
                                    </Button>
                                  )}
                                </>
                              )}

                              {/* Admin actions */}
                              {isCixciAdmin && (
                                <>
                                  {c.is_excluded && (
                                    <>
                                      <Button size="small" variant="outlined" sx={{ fontSize: 11, py: 0.25, px: 1, minWidth: 0 }} onClick={() => handleRestoreCompatibility(c.device_reference, c.exclusion_type, c.is_locked)}>
                                        Restore
                                      </Button>
                                      {c.exclusion_type === 'vendor' && (
                                        <Button size="small" variant="outlined" color="warning" sx={{ fontSize: 11, py: 0.25, px: 1, minWidth: 0 }} onClick={() => handleConvertToAdminExclusion(c.device_reference)}>
                                          Convert to Admin
                                        </Button>
                                      )}
                                    </>
                                  )}
                                  {!c.is_excluded && (
                                    <Button size="small" variant="outlined" color="error" sx={{ fontSize: 11, py: 0.25, px: 1, minWidth: 0 }} onClick={() => handleOpenExcludeModal(dev || { id: c.device_reference, name: deviceName })}>
                                      Exclude
                                    </Button>
                                  )}
                                  {!c.is_locked && (
                                    <Button size="small" variant="outlined" color="secondary" sx={{ fontSize: 11, py: 0.25, px: 1, minWidth: 0 }} onClick={() => handleLockCompatibility(c.device_reference)} startIcon={<LockIcon sx={{ fontSize: 12 }} />}>
                                      Lock
                                    </Button>
                                  )}
                                </>
                              )}
                            </Box>
                          </Box>

                          {/* Exclusion Details */}
                          {c.is_excluded && (
                            <Box sx={{ mt: 0.75, fontSize: 12, color: 'text.secondary', borderTop: '1px dashed', borderColor: 'divider', pt: 0.5 }}>
                              <Typography variant="caption">
                                <strong>Exclusion Reason:</strong> {c.exclusion_reason} ({c.exclusion_type} level)
                              </Typography>
                              {c.notes && (
                                <Typography variant="caption" sx={{ display: 'block' }}><strong>Notes:</strong> {c.notes}</Typography>
                              )}
                            </Box>
                          )}

                          {/* Mapping Metadata */}
                          <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5 }}>
                            Source: {c.match_source || 'N/A'} | Status at Mapping: {c.device_status_at_mapping || 'Unknown'} | Launch Date: {c.device_launch_date_at_mapping || 'None'}
                          </Typography>
                        </Box>
                      )
                    })
                  })()}
                </Box>
              </Box>
            )}

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* 3. BULK TAB                                                     */}
            {/* ════════════════════════════════════════════════════════════════ */}
            {activeTab === 'bulk' && !isBuyer && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                  Select devices and choose the update type.
                </Typography>
                {product.status === 'active' && !isCixciAdmin && (
                  <Alert severity="warning" sx={{ fontSize: 12, py: 0.5 }}>
                    Replacing mappings on active products requires CIXCI Admin approval. Remove records a reasoned exclusion.
                  </Alert>
                )}

                {/* Update type selector */}
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', bgcolor: 'background.paper', p: 1.25, borderRadius: 2, border: 1, borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="overline" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: 11 }}>Update Type</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {([
                        { id: 'add' as const, label: 'Add Mappings' },
                        { id: 'replace' as const, label: 'Replace All Mappings' },
                        { id: 'remove' as const, label: 'Remove Mappings' },
                      ] as const).map(type => (
                        <Button
                          key={type.id}
                          size="small"
                          variant={bulkUpdateType === type.id ? 'contained' : 'outlined'}
                          onClick={() => setBulkUpdateType(type.id)}
                          disabled={(product.status === 'active' && !isCixciAdmin && type.id === 'replace') || (product.compatibility_mode === 'universal_device_type' && type.id !== 'remove')}
                          sx={{ fontSize: 12, textTransform: 'none' }}
                        >
                          {type.label}
                        </Button>
                      ))}
                    </Box>
                  </Box>
                </Box>

                {bulkUpdateType === 'remove' && <>
                  <TextField select size="small" label="Exclusion Reason" value={bulkReason} onChange={event => setBulkReason(event.target.value)}>
                    {(compatibilityOptions?.exclusion_reasons || []).map((reason: string) => <MenuItem key={reason} value={reason}>{reason.replace(/_/g, ' ')}</MenuItem>)}
                  </TextField>
                  <TextField size="small" label="Exclusion Notes" required={bulkReason === 'other'} multiline value={bulkNotes} onChange={event => setBulkNotes(event.target.value)} />
                </>}

                {/* Device selection */}
                <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 1.25, bgcolor: 'background.paper' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                      Select Devices ({bulkSelectedDevices.length} selected)
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button size="small" variant="text" sx={{ fontSize: 11, textTransform: 'none' }} onClick={() => setBulkSelectedDevices(devices.map((d: any) => d.id))}>
                        Select All
                      </Button>
                      <Button size="small" variant="text" sx={{ fontSize: 11, textTransform: 'none' }} onClick={() => setBulkSelectedDevices([])}>
                        Clear
                      </Button>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', maxHeight: 220, overflowY: 'auto', pr: 0.5 }}>
                    {devices.map((d: any) => {
                      const isChecked = bulkSelectedDevices.includes(d.id)
                      return (
                        <Box
                          key={d.id}
                          component="label"
                          sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 12, cursor: 'pointer', color: 'text.primary' }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setBulkSelectedDevices(bulkSelectedDevices.filter(id => id !== d.id))
                              } else {
                                setBulkSelectedDevices([...bulkSelectedDevices, d.id])
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                          <span>{d.manufacturer_name} {d.name}</span>
                        </Box>
                      )
                    })}
                  </Box>
                </Box>

                <Button variant="contained" sx={{ mt: 0.75 }} onClick={handleBulkCompatUpdate} disabled={bulkSelectedDevices.length === 0}>
                  Execute Bulk Update ({bulkSelectedDevices.length} items)
                </Button>

                {/* Admin-only: Manual Recalculate */}
                {isCixciAdmin && (
                  <Box sx={{ mt: 1 }}>
                    <Divider sx={{ mb: 1.5 }} />
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={handleManualRecalculate}
                      disabled={isRecalculating}
                      startIcon={isRecalculating ? <CircularProgress size={14} /> : undefined}
                    >
                      {isRecalculating ? 'Recalculating...' : 'Trigger Manual Recalculation'}
                    </Button>
                  </Box>
                )}
              </Box>
            )}

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* 4. AUDIT TAB                                                    */}
            {/* ════════════════════════════════════════════════════════════════ */}
            {activeTab === 'original' && !isBuyer && product?.vendor_original_data && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Alert severity="info" sx={{ fontSize: 12 }}>
                  Comparison of vendor-supplied original values vs. current normalized values. Changes made by the normalization service are highlighted.
                </Alert>
                {(() => {
                  const orig = product.vendor_original_data || {}
                  const fieldMap: { key: string; label: string; currentKey?: string }[] = [
                    { key: 'name', label: 'Product Name' },
                    { key: 'brand', label: 'Brand' },
                    { key: 'color', label: 'Color', currentKey: 'color' },
                    { key: 'description', label: 'Description' },
                    { key: 'short_description', label: 'Short Description' },
                    { key: 'meta_title', label: 'Meta Title' },
                    { key: 'meta_description', label: 'Meta Description' },
                  ]
                  return fieldMap.filter(f => orig[f.key] != null).map(f => {
                    const originalVal = String(orig[f.key] || '')
                    const currentVal = String(product[f.currentKey || f.key] || '')
                    const changed = originalVal.trim() !== currentVal.trim()
                    return (
                      <Box key={f.key} sx={{ border: 1, borderColor: changed ? 'warning.main' : 'divider', borderRadius: 2, overflow: 'hidden' }}>
                        <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider', bgcolor: changed ? 'warning.light' : 'action.hover', display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: 11.5, letterSpacing: 0.8, textTransform: 'uppercase', color: changed ? 'warning.dark' : 'text.secondary' }}>
                            {f.label}
                          </Typography>
                          {changed && <Chip label="Modified" size="small" color="warning" sx={{ height: 18, fontSize: '0.65rem' }} />}
                        </Box>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 0 }}>
                          <Box sx={{ p: 2, borderRight: { md: 1 }, borderColor: 'divider', bgcolor: changed ? 'error.50' : 'transparent' }}>
                            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 0.5, fontWeight: 600, textTransform: 'uppercase', fontSize: 10 }}>
                              Vendor Original
                            </Typography>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, color: changed ? 'error.dark' : 'text.primary' }}>
                              {originalVal || <em style={{ color: 'gray' }}>empty</em>}
                            </Typography>
                          </Box>
                          <Box sx={{ p: 2, bgcolor: changed ? 'success.50' : 'transparent' }}>
                            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 0.5, fontWeight: 600, textTransform: 'uppercase', fontSize: 10 }}>
                              Current (Normalized)
                            </Typography>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, color: changed ? 'success.dark' : 'text.primary' }}>
                              {currentVal || <em style={{ color: 'gray' }}>empty</em>}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    )
                  })
                })()}
              </Box>
            )}

            {activeTab === 'audit' && !isBuyer && (
              <Box>
                {isLoadingAudit ? (
                  <Box sx={{ textAlign: 'center', py: 5 }}>
                    <CircularProgress size={24} />
                    <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>Loading audit trail history...</Typography>
                  </Box>
                ) : !auditHistory || auditHistory.length === 0 ? (
                  <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center', py: 5 }}>
                    No compatibility audit records found for this product.
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    {auditHistory.map((item: any) => {
                      const dateStr = formatETDate(item.created_at)
                      const p = item.payload || {}
                      return (
                        <Box key={item.id} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 1.25, bgcolor: 'background.paper', fontSize: 12 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'text.disabled', mb: 0.25, fontSize: 11 }}>
                            <span>{dateStr}</span>
                            <span>Source: {item.change_source || 'System'}</span>
                          </Box>
                          <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.25, fontSize: 12 }}>
                            Device compatibility status transitioned from <strong>{p.previous_mapping_status}</strong> to <strong>{p.new_mapping_status}</strong> for <strong>{p.device_name}</strong>
                          </Typography>
                          <Box sx={{ color: 'text.secondary', pl: 0.75, borderLeft: '2px solid', borderColor: 'divider' }}>
                            {p.exclusion_reason && p.exclusion_reason !== 'None' && (
                              <Typography variant="caption" sx={{ display: 'block' }}>&bull; <strong>Exclusion Reason:</strong> {p.exclusion_reason}</Typography>
                            )}
                            {p.changed_by && (
                              <Typography variant="caption" sx={{ display: 'block' }}>&bull; <strong>Actor:</strong> {p.changed_by}</Typography>
                            )}
                            {p.change_source && (
                              <Typography variant="caption" sx={{ display: 'block' }}>&bull; <strong>Details:</strong> {p.change_source}</Typography>
                            )}
                          </Box>
                        </Box>
                      )
                    })}
                  </Box>
                )}
              </Box>
            )}

          </Box>
        </DialogContent>

        {/* ── Dialog Actions ────────────────────────────────────────────────── */}
        <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 1.5, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          {isBuyer ? (
            <Box sx={{ display: 'flex', width: '100%', justifyContent: 'flex-end' }}>
              <Button variant="outlined" onClick={onClose} sx={{ borderRadius: '999px', height: 34, px: 2.25, textTransform: 'none', fontWeight: 600 }}>Close</Button>
            </Box>
          ) : (
            <>
              {!isCixciAdmin && (
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleDeleteProduct}
                  startIcon={<DeleteIcon sx={{ fontSize: 14 }} />}
                  sx={{
                    borderRadius: '999px', height: 34, px: 2.25, textTransform: 'none', fontWeight: 600,
                    opacity: product.status === 'active' ? 0.5 : 1,
                    cursor: product.status === 'active' ? 'not-allowed' : 'pointer',
                  }}
                >
                  Delete
                </Button>
              )}
              <Box sx={{ display: 'flex', gap: 1.25, ml: isCixciAdmin ? 'auto' : 0 }}>
                <Button variant="outlined" onClick={onClose} sx={{ borderRadius: '999px', height: 34, px: 2.25, textTransform: 'none', fontWeight: 600 }}>Close</Button>
                {!isCixciAdmin && (
                  <Button
                    variant="contained"
                    onClick={() => onEditProduct(product)}
                    startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                    sx={{ borderRadius: '999px', height: 34, px: 2.25, textTransform: 'none', fontWeight: 600 }}
                  >
                    Edit Product
                  </Button>
                )}
              </Box>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* ── Exclude Device Dialog ──────────────────────────────────────────── */}
      <ExcludeDeviceDialog
        open={showExcludeModal && !!excludeDevice}
        onClose={() => { setShowExcludeModal(false); setExcludeDevice(null) }}
        device={excludeDevice}
        product={product}
        onSaved={handleExclusionSubmitted}
      />

      {/* ── Confirm Dialog ─────────────────────────────────────────────────── */}
      <ConfirmDialog {...dialogProps} />
    </>
  )
}
