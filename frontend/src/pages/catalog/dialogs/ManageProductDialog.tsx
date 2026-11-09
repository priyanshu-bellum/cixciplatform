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
import Avatar from '@mui/material/Avatar'
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
}

type TabKey = 'details' | 'compatibility' | 'bulk' | 'audit'

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
    if (bulkUpdateType !== 'add' && product.status === 'active' && !isCixciAdmin) {
      showSnackbar('Replacing or removing device compatibility assertions on active products requires CIXCI Admin approval.', 'warning')
      return
    }
    try {
      const assertions = bulkSelectedDevices.map(dId => ({
        device_id: dId,
        is_compatible: true,
      }))
      await api.post(`/catalog/products/${product.id}/compatibility/`, {
        compatibility_update_type: bulkUpdateType,
        assertions,
      })
      refetchCompatibilities()
      showSnackbar('Bulk compatibility update completed successfully.', 'success')
      setBulkSelectedDevices([])
    } catch (err: any) {
      showSnackbar('Failed to perform bulk update: ' + (err.response?.data?.error || err.message), 'error')
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
    return list
  }, [isBuyer, isCixciAdmin])

  if (!product) return null

  // ─── Inline Helpers ────────────────────────────────────────────────────
  const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <Box sx={{ bgcolor: 'background.paper', borderRadius: 2.5, border: 1, borderColor: 'divider', overflow: 'hidden' }}>
      <Box sx={{ px: 2, py: 1.25, borderBottom: 1, borderColor: 'divider', bgcolor: 'action.hover' }}>
        <Typography sx={{ fontWeight: 700, fontSize: 11.5, letterSpacing: 0.8, textTransform: 'uppercase', color: 'text.secondary' }}>
          {title}
        </Typography>
      </Box>
      <Box sx={{ p: 2 }}>{children}</Box>
    </Box>
  )

  const DetailField = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <Box>
      <Typography sx={{ fontSize: 10.5, fontWeight: 600, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.25 }}>
        {label}
      </Typography>
      <Box>{children}</Box>
    </Box>
  )

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
        PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
      >
        {/* ── Branded Gradient Header ──────────────────────────────────────── */}
        <Box sx={{
          background: 'linear-gradient(135deg, #042C71 0%, #084387 50%, #0B6AB0 100%)',
          color: '#fff',
          px: 3, py: 2.5,
          position: 'relative',
        }}>
          <IconButton
            size="small"
            onClick={onClose}
            sx={{
              position: 'absolute', top: 12, right: 12,
              color: 'rgba(255,255,255,0.8)',
              bgcolor: 'rgba(255,255,255,0.1)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {product.primary_image_url ? (
              <Avatar
                variant="rounded"
                src={getImageUrl(product.primary_image_url)}
                alt={product.name}
                sx={{ width: 56, height: 56, border: '2px solid rgba(255,255,255,0.25)', borderRadius: 2 }}
              />
            ) : (
              <Avatar
                variant="rounded"
                sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 2, fontSize: 20 }}
              >
                ?
              </Avatar>
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 18, lineHeight: 1.2, mb: 0.5 }}>
                {product.name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                {product.brand && (
                  <Chip
                    label={product.brand}
                    size="small"
                    sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 600, fontSize: 11, height: 22 }}
                  />
                )}
                <Typography sx={{ fontSize: 12, opacity: 0.75, fontFamily: 'monospace' }}>
                  SKU: {product.sku}
                </Typography>
                {product.product_category && (
                  <Typography sx={{ fontSize: 12, opacity: 0.75 }}>
                    {product.product_category}
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Status Indicator */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 4 }}>
              <Box sx={{
                width: 8, height: 8, borderRadius: '50%',
                bgcolor: product.status === 'active' ? '#34D399' : product.status === 'inactive' ? '#F87171' : '#FCD34D',
                boxShadow: product.status === 'active' ? '0 0 8px rgba(52,211,153,0.6)' : 'none',
              }} />
              <Typography sx={{
                fontSize: 12, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', opacity: 0.9,
              }}>
                {(product.status || 'unknown').replace(/_/g, ' ')}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* ── Chip-style Navigation Tabs ───────────────────────────────────── */}
        <Box sx={{
          px: 3, py: 1.5,
          borderBottom: 1, borderColor: 'divider',
          display: 'flex', gap: 1, flexWrap: 'wrap',
          bgcolor: 'background.paper',
        }}>
          {tabs.map(t => (
            <Chip
              key={t.id}
              label={t.label}
              onClick={() => setActiveTab(t.id)}
              variant={activeTab === t.id ? 'filled' : 'outlined'}
              color={activeTab === t.id ? 'primary' : 'default'}
              sx={{
                fontWeight: activeTab === t.id ? 600 : 400,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.2s',
                ...(activeTab !== t.id && { '&:hover': { bgcolor: 'action.hover' } }),
              }}
            />
          ))}
        </Box>

        {/* ── Dialog Content ───────────────────────────────────────────────── */}
        <DialogContent sx={{ p: 0, bgcolor: 'action.hover' }}>
          <Box sx={{ p: 2.5 }}>

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* 1. DETAILS TAB                                                  */}
            {/* ════════════════════════════════════════════════════════════════ */}
            {activeTab === 'details' && (
              <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap' }}>

                {/* ── Left Column: Image Gallery ─────────────────────────── */}
                <Box sx={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: 2 }}>

                  {/* Image Viewer Card */}
                  <Box sx={{ bgcolor: 'background.paper', borderRadius: 2.5, border: 1, borderColor: 'divider', overflow: 'hidden' }}>
                    {/* Main Image */}
                    <Box sx={{
                      width: '100%', height: 320,
                      position: 'relative',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: 'action.hover',
                    }}>
                      {activeDetailImageUrl ? (
                        <>
                          <Box
                            component="img"
                            src={activeDetailImageUrl}
                            alt={product.name}
                            sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', p: 2 }}
                          />
                          {allImages.length > 1 && (
                            <>
                              <IconButton
                                size="small"
                                onClick={() => navigateImage(-1)}
                                sx={{
                                  position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                                  bgcolor: 'rgba(0,0,0,0.45)', color: '#fff',
                                  width: 34, height: 34,
                                  '&:hover': { bgcolor: 'rgba(0,0,0,0.65)' },
                                  transition: 'all 0.2s',
                                }}
                              >
                                <ArrowBackIosNewIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => navigateImage(1)}
                                sx={{
                                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                                  bgcolor: 'rgba(0,0,0,0.45)', color: '#fff',
                                  width: 34, height: 34,
                                  '&:hover': { bgcolor: 'rgba(0,0,0,0.65)' },
                                  transition: 'all 0.2s',
                                }}
                              >
                                <ArrowForwardIosIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                              {/* Dot Indicators */}
                              <Box sx={{ position: 'absolute', bottom: 12, display: 'flex', gap: 0.75 }}>
                                {allImages.map((_, i) => (
                                  <Box
                                    key={i}
                                    onClick={() => setActiveDetailImageUrl(allImages[i])}
                                    sx={{
                                      width: 8, height: 8, borderRadius: '50%', cursor: 'pointer',
                                      bgcolor: allImages.indexOf(activeDetailImageUrl!) === i ? '#fff' : 'rgba(255,255,255,0.4)',
                                      transition: 'all 0.2s',
                                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                                    }}
                                  />
                                ))}
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
                      <Box sx={{
                        display: 'flex', gap: 1, p: 1.5,
                        borderTop: 1, borderColor: 'divider',
                        overflowX: 'auto', justifyContent: 'center',
                      }}>
                        {allImages.map((imgUrl, i) => (
                          <Box
                            key={i}
                            component="button"
                            type="button"
                            onClick={() => setActiveDetailImageUrl(imgUrl)}
                            sx={{
                              width: 54, height: 54, p: 0, flexShrink: 0,
                              border: '2px solid',
                              borderColor: activeDetailImageUrl === imgUrl ? 'primary.main' : 'transparent',
                              borderRadius: 1.5,
                              bgcolor: 'action.hover',
                              overflow: 'hidden',
                              cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'all 0.2s',
                              opacity: activeDetailImageUrl === imgUrl ? 1 : 0.7,
                              '&:hover': {
                                opacity: 1,
                                borderColor: activeDetailImageUrl === imgUrl ? 'primary.main' : 'divider',
                              },
                            }}
                          >
                            <Box component="img" src={imgUrl} alt={`Thumbnail ${i + 1}`} sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover' }} />
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
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 2 }}>
                      <Box>
                        <Typography sx={{ fontSize: 10.5, fontWeight: 600, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          MSRP
                        </Typography>
                        <Typography sx={{ fontSize: 22, fontWeight: 700, color: 'text.primary', lineHeight: 1.3, mt: 0.25 }}>
                          {formatCurrency(product.msrp, product.vendor_wholesale_price_currency)}
                        </Typography>
                      </Box>

                      {!isVendor && (
                        <Box>
                          <Typography sx={{ fontSize: 10.5, fontWeight: 600, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Wholesale
                          </Typography>
                          <Typography sx={{ fontSize: 22, fontWeight: 700, color: 'primary.main', lineHeight: 1.3, mt: 0.25 }}>
                            {formatCurrency(product.buyer_wholesale_price ?? product.vendor_wholesale_price_amount, product.vendor_wholesale_price_currency)}
                          </Typography>
                        </Box>
                      )}

                      {(isVendor || isCixciAdmin) && product.vendor_wholesale_price_amount != null && (
                        <Box>
                          <Typography sx={{ fontSize: 10.5, fontWeight: 600, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Vendor Wholesale
                          </Typography>
                          <Typography sx={{ fontSize: 22, fontWeight: 700, color: 'primary.main', lineHeight: 1.3, mt: 0.25 }}>
                            {formatCurrency(product.vendor_wholesale_price_amount, product.vendor_wholesale_price_currency)}
                          </Typography>
                        </Box>
                      )}

                      {product.vendor_map_pricing_enforced && (
                        <Box>
                          <Typography sx={{ fontSize: 10.5, fontWeight: 600, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            MAP Price
                          </Typography>
                          <Typography sx={{ fontSize: 17, fontWeight: 600, color: 'text.primary', mt: 0.25 }}>
                            {formatCurrency(product.map_price, product.vendor_wholesale_price_currency)}
                          </Typography>
                        </Box>
                      )}

                      {product.sale_price && (
                        <Box>
                          <Typography sx={{ fontSize: 10.5, fontWeight: 600, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Sale Price
                          </Typography>
                          <Typography sx={{ fontSize: 17, fontWeight: 600, color: 'success.main', mt: 0.25 }}>
                            {formatCurrency(product.sale_price, product.vendor_wholesale_price_currency)}
                          </Typography>
                        </Box>
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

                    {Array.isArray(product.compatible_device_types) && product.compatible_device_types.length > 0 && (
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
                        <Typography variant="body2">{product.weight ? `${product.weight} lbs` : '—'}</Typography>
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
              <Box sx={{ maxHeight: 400, overflowY: 'auto', pr: 0.5 }}>
                {/* Universal Product Mapping Banner */}
                {Array.isArray(product.compatible_device_types) && product.compatible_device_types.length > 0 && (
                  <Alert severity="info" sx={{ mb: 1, fontSize: 12, py: 0.25 }}>
                    <strong>Universal Product Mapping Active:</strong> This product universally supports all{' '}
                    <strong>{product.compatible_device_types.join(' & ')}</strong>{' '}
                    devices. All current models and any newly launched models added to CIXCI are mapped automatically.
                  </Alert>
                )}

                {/* Quick-add device dropdown */}
                {!isCixciAdmin && !isBuyer && (
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
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {(() => {
                    const compatList = (activeCompatibilities && activeCompatibilities.length > 0)
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
                      const deviceName = c.name || (dev ? `${dev.manufacturer_name} ${dev.name}` : (c.device_reference ? c.device_reference.slice(0, 8) : 'Device'))

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
                                <Chip label="Active" size="small" color="success" sx={{ fontSize: 10, height: 20 }} />
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
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 400, overflowY: 'auto' }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                  Select devices and choose the update type.
                </Typography>
                {product.status === 'active' && !isCixciAdmin && (
                  <Alert severity="warning" sx={{ fontSize: 12, py: 0.5 }}>
                    Replacing or removing compatibility assertions on active products requires CIXCI Admin privileges.
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
                          disabled={product.status === 'active' && !isCixciAdmin && type.id !== 'add'}
                          sx={{ fontSize: 12, textTransform: 'none' }}
                        >
                          {type.label}
                        </Button>
                      ))}
                    </Box>
                  </Box>
                </Box>

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
            {activeTab === 'audit' && !isBuyer && (
              <Box sx={{ maxHeight: 400, overflowY: 'auto', pr: 0.5 }}>
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
              <Button variant="outlined" onClick={onClose} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>Close</Button>
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
                    borderRadius: 2, textTransform: 'none', fontWeight: 600,
                    opacity: product.status === 'active' ? 0.5 : 1,
                    cursor: product.status === 'active' ? 'not-allowed' : 'pointer',
                  }}
                >
                  Delete
                </Button>
              )}
              <Box sx={{ display: 'flex', gap: 1.25, ml: isCixciAdmin ? 'auto' : 0 }}>
                <Button variant="outlined" onClick={onClose} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>Close</Button>
                {!isCixciAdmin && (
                  <Button
                    variant="contained"
                    onClick={() => onEditProduct(product)}
                    startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
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
