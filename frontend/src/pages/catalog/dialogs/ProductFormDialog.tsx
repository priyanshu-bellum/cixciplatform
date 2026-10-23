import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import CheckIcon from '@mui/icons-material/Check'
import JSZip from 'jszip'
import api from '../../../lib/apiClient'
import { getImageUrl } from '../../../lib/formatters'
import { useProductForm, parseWirelessCharging } from '../hooks/useProductForm'
import { extractUuid } from '../utils'
import { useConfirmDialog } from '../../../hooks/useConfirmDialog'
import ConfirmDialog from '../../../components/feedback/ConfirmDialog'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProductFormDialogProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  mode: 'add' | 'edit'
  product?: any
  user: any
  allowedBrands: string[]
  allowedCategories: string[]
  allowedColors: string[]
  devices: any[]
  deviceTypes: any[]
  activeCompatibilities?: any[]
}

// ---------------------------------------------------------------------------
// MultiSelectColor (inline component)
// ---------------------------------------------------------------------------

interface MultiSelectColorProps {
  selected: string
  options: string[]
  onChange: (val: string) => void
  label: string
}

function MultiSelectColor({ selected, options, onChange, label }: MultiSelectColorProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selectedColors = useMemo(() => {
    if (!selected) return [] as string[]
    return selected.split(',').map(s => s.trim()).filter(Boolean)
  }, [selected])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const toggle = (color: string) => {
    let next: string[]
    if (selectedColors.includes(color)) {
      next = selectedColors.filter(c => c !== color)
    } else {
      next = [...selectedColors, color]
    }
    onChange(next.join(', '))
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <label style={{ display: 'block', marginBottom: 4, fontSize: 13, color: 'var(--text-secondary)' }}>
        {label}
      </label>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '8px 12px',
          border: '1px solid var(--border)',
          borderRadius: 8,
          background: 'var(--bg)',
          cursor: 'pointer',
          minHeight: 38,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          alignItems: 'center',
        }}
      >
        {selectedColors.length === 0 ? (
          <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Select colors...</span>
        ) : (
          selectedColors.map(c => (
            <span
              key={c}
              style={{
                background: 'var(--accent)',
                color: '#fff',
                borderRadius: 4,
                padding: '2px 8px',
                fontSize: 12,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {c}
              <span
                onClick={e => { e.stopPropagation(); toggle(c) }}
                style={{ cursor: 'pointer', fontWeight: 700 }}
              >
                x
              </span>
            </span>
          ))
        )}
      </div>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            background: 'var(--bg-card, #fff)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            maxHeight: 200,
            overflowY: 'auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          {options.map(opt => (
            <div
              key={opt}
              onClick={() => toggle(opt)}
              style={{
                padding: '6px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: selectedColors.includes(opt) ? 'var(--bg-hover, #f0f4ff)' : 'transparent',
                fontSize: 14,
              }}
            >
              {selectedColors.includes(opt) && <CheckIcon sx={{ fontSize: 16, color: 'var(--accent)' }} />}
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helper: inline field style
// ---------------------------------------------------------------------------

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid var(--border)',
  borderRadius: 8,
  background: 'var(--bg)',
  color: 'var(--text-primary)',
  fontSize: 14,
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 4,
  fontSize: 13,
  color: 'var(--text-secondary)',
}

const twoColGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 12,
}

const sectionTitle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: 'var(--text-primary)',
  marginTop: 16,
  marginBottom: 8,
  borderBottom: '1px solid var(--border)',
  paddingBottom: 4,
}

// ---------------------------------------------------------------------------
// ProductFormDialog
// ---------------------------------------------------------------------------

export default function ProductFormDialog({
  open,
  onClose,
  onSaved,
  mode,
  product,
  user,
  allowedBrands,
  allowedCategories,
  allowedColors,
  devices,
  deviceTypes,
  activeCompatibilities,
}: ProductFormDialogProps) {
  const form = useProductForm()
  const { confirm, dialogProps } = useConfirmDialog()
  const [submitting, setSubmitting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isVendor = user?.role === 'vendor'
  const isAdmin = !!user?.is_cixci_admin

  // -------------------------------------------------------------------------
  // Populate form when opening in edit mode
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (open && mode === 'edit' && product) {
      form.populateFrom(product, activeCompatibilities)
    } else if (open && mode === 'add') {
      form.resetForm()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, product])

  // -------------------------------------------------------------------------
  // Dirty check and close handler
  // -------------------------------------------------------------------------
  const isDirty = useCallback(() => {
    if (mode === 'add') return form.isAddDirty()
    return form.isEditDirty(product, activeCompatibilities)
  }, [mode, form, product, activeCompatibilities])

  const handleClose = useCallback(async () => {
    if (isDirty()) {
      const ok = await confirm({
        title: 'Unsaved Changes',
        message: 'You have unsaved changes. Are you sure you want to close this form? All changes will be lost.',
        confirmLabel: 'Discard',
        confirmColor: 'error',
      })
      if (!ok) return
    }
    form.resetForm()
    onClose()
  }, [isDirty, confirm, form, onClose])

  // -------------------------------------------------------------------------
  // Image upload logic
  // -------------------------------------------------------------------------
  const handleUploadImage = useCallback(async (file: File): Promise<{ id: string; url: string } | null> => {
    try {
      const requestRes = await api.post('/media/assets/request_upload/', {
        filename: file.name,
        content_type: file.type || 'image/png',
      })
      const { upload_url, asset_id, storage_key } = requestRes.data

      if (upload_url) {
        await fetch(upload_url, {
          method: 'PUT',
          headers: { 'Content-Type': file.type || 'image/png' },
          body: file,
        })
      } else {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('asset_id', asset_id)
        await api.post('/media/assets/upload/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }

      const url = storage_key || `/media/assets/${asset_id}/`
      return { id: asset_id, url }
    } catch (err: any) {
      console.error('Image upload failed:', err)
      form.setFormError(`Image upload failed: ${err?.response?.data?.detail || err.message || 'Unknown error'}`)
      return null
    }
  }, [form])

  const handleImageChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    form.setFormError(null)

    if (file.name.toLowerCase().endsWith('.zip')) {
      setUploadingImage(true)
      try {
        const zip = await JSZip.loadAsync(file)
        const pngFiles: { name: string; blob: Blob }[] = []

        for (const [filename, entry] of Object.entries(zip.files)) {
          if (!entry.dir && filename.toLowerCase().endsWith('.png')) {
            const blob = await entry.async('blob')
            pngFiles.push({ name: filename.split('/').pop() || filename, blob })
          }
        }

        if (pngFiles.length === 0) {
          form.setFormError('ZIP file contains no PNG images.')
          setUploadingImage(false)
          return
        }

        const uploaded: { name: string; url: string; id: string }[] = []
        for (const pf of pngFiles) {
          const pngFile = new File([pf.blob], pf.name, { type: 'image/png' })
          const result = await handleUploadImage(pngFile)
          if (result) {
            uploaded.push({ name: pf.name, url: result.url, id: result.id })
          }
        }

        if (uploaded.length > 0) {
          form.setUploadedPrimaryAssetId(uploaded[0].id)
          form.setImagePreviewUrl(getImageUrl(uploaded[0].url))
          form.setProdPrimaryImageUrl(getImageUrl(uploaded[0].url))
          form.setUploadedZipImages(uploaded)

          // Assign additional images to slots
          const additionalSlots = [form.setProdImageUrl1, form.setProdImageUrl2, form.setProdImageUrl3, form.setProdImageUrl4, form.setProdImageUrl5]
          for (let i = 1; i < uploaded.length && i - 1 < additionalSlots.length; i++) {
            additionalSlots[i - 1](uploaded[i].url)
          }
        }
      } catch (err: any) {
        form.setFormError(`Failed to process ZIP: ${err.message}`)
      }
      setUploadingImage(false)
    } else if (file.type === 'image/png') {
      form.setSelectedImageFile(file)
      const reader = new FileReader()
      reader.onload = (ev) => {
        form.setImagePreviewUrl(ev.target?.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      form.setFormError('Only PNG files with transparent backgrounds or ZIP files containing PNGs are allowed.')
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [form, handleUploadImage])

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------
  const validate = useCallback((): string | null => {
    if (!form.prodName.trim()) return 'Product Name is required.'
    if (!form.prodSku.trim()) return 'SKU is required.'
    if (isVendor) {
      if (!form.prodUpc.trim()) return 'UPC is required.'
      if (!/^\d{12}$/.test(form.prodUpc.trim())) return 'UPC must be exactly 12 digits.'
      if (form.prodCategory !== 'branded_merchandise' && !form.prodCategory) return 'Product Category is required.'
      if (!form.prodLaunchDate) return 'Launch Date is required.'
      if (!form.prodColor.trim()) return 'Color is required.'
      if (!form.prodSystemColor.trim()) return 'System Color is required.'
      if (!form.prodWarranty.trim()) return 'Warranty is required.'
      if (!form.prodPrice.trim()) return 'Vendor Wholesale Price is required.'
      if (!form.prodMsrp.trim()) return 'MSRP is required.'
      if (!form.prodLength.trim()) return 'Length is required.'
      if (!form.prodWidth.trim()) return 'Width is required.'
      if (!form.prodHeight.trim()) return 'Height is required.'
      if (!form.prodWeight.trim()) return 'Weight is required.'
      if (!form.prodDescription.trim()) return 'Product Description is required.'
      if (form.prodType === 'accessory') {
        if (form.selectedDeviceIds.length === 0 && form.compUniversalDeviceTypes.length === 0) {
          return 'Device compatibility is required for accessories. Select devices or universal device types.'
        }
        // Category-specific compatibility checks
        const cat = form.prodCategory?.toLowerCase().replace(/[\s&]+/g, '_')
        if (cat === 'headphones') {
          if (!form.compHeadphoneJack) return 'Headphone Jack compatibility is required for Headphones.'
          if (!form.compBluetooth) return 'Bluetooth compatibility is required for Headphones.'
        } else if (cat === 'speakers') {
          if (!form.compChargingInterface) return 'Charging Interface is required for Speakers.'
          if (!form.compBluetooth) return 'Bluetooth compatibility is required for Speakers.'
        } else if (cat === 'chargers_and_cables' || cat === 'chargers' || cat === 'cables') {
          if (!form.compChargingInterface) return 'Charging Interface is required for Chargers & Cables.'
        } else if (cat === 'memory' || cat === 'memory_cards') {
          if (!form.compStorageExpansion) return 'Storage Expansion compatibility is required for Memory.'
          if (form.compStorageExpansion !== 'Not Compatible' && !form.compMemoryCapacity) {
            return 'Memory Capacity is required for Memory products.'
          }
        } else if (cat === 'wearable_tech' || cat === 'wearables') {
          if (!form.compChargingInterface) return 'Charging Interface is required for Wearable Tech.'
        } else if (cat === 'watch_accessories') {
          if (!form.compWatchCaseSize) return 'Watch Case Size is required for Watch Accessories.'
        }
      }
    }
    return null
  }, [form, isVendor])

  // -------------------------------------------------------------------------
  // Submit
  // -------------------------------------------------------------------------
  const handleSubmit = useCallback(async () => {
    form.setFormError(null)
    const validationError = validate()
    if (validationError) {
      form.setFormError(validationError)
      return
    }

    setSubmitting(true)
    try {
      // Upload primary image if new file selected
      let primaryImageRef = product?.primary_image_reference || null
      if (form.selectedImageFile) {
        const result = await handleUploadImage(form.selectedImageFile)
        if (result) {
          primaryImageRef = result.id
        } else {
          setSubmitting(false)
          return
        }
      } else if (form.uploadedPrimaryAssetId) {
        primaryImageRef = form.uploadedPrimaryAssetId
      }

      // Collect additional media references
      const mediaRefs = [
        form.prodImageUrl1, form.prodImageUrl2, form.prodImageUrl3,
        form.prodImageUrl4, form.prodImageUrl5,
      ].filter(Boolean)

      // Add zip image references if they exist
      if (form.uploadedZipImages.length > 1) {
        const zipMediaIds = form.uploadedZipImages.slice(1).map(img => img.id || img.url)
        mediaRefs.push(...zipMediaIds.filter(r => !mediaRefs.includes(r)))
      }

      const wirelessChargingStr = form.compWirelessCharging.length > 0
        ? form.compWirelessCharging.join('+')
        : ''

      const payload: Record<string, any> = {
        name: form.prodName.trim(),
        sku: form.prodSku.trim(),
        brand: form.prodBrand.trim(),
        product_type: form.prodType || 'accessory',
        product_category: form.prodCategory,
        description: form.prodDescription.trim(),
        vendor_wholesale_price_amount: form.prodPrice ? parseFloat(form.prodPrice) : null,
        vendor_wholesale_price_currency: form.prodCurrency || 'USD',
        primary_image_reference: primaryImageRef,
        status: form.prodStatus || 'active',
        selling_status: 'for_sale',
        vendor_company_reference: user?.company_reference || user?.company_id || null,
        upc: form.prodUpc.trim(),
        launch_date: form.prodLaunchDate || null,
        release_date: form.prodReleaseDate || null,
        eol_date: form.prodEolDate || null,
        color: form.prodColor.trim(),
        system_color: form.prodSystemColor.trim(),
        msrp: form.prodMsrp ? parseFloat(form.prodMsrp) : null,
        map_price: form.prodMapPrice ? parseFloat(form.prodMapPrice) : null,
        sale_price: form.prodSalePrice ? parseFloat(form.prodSalePrice) : null,
        recommended_accessory: form.prodRecommendedAccessory,
        inventory_level: form.prodInventoryLevel ? parseInt(form.prodInventoryLevel, 10) : null,
        inventory_threshold: form.prodInventoryThreshold ? parseInt(form.prodInventoryThreshold, 10) : null,
        length: form.prodLength ? parseFloat(form.prodLength) : null,
        width: form.prodWidth ? parseFloat(form.prodWidth) : null,
        height: form.prodHeight ? parseFloat(form.prodHeight) : null,
        weight: form.prodWeight ? parseFloat(form.prodWeight) : null,
        warranty: form.prodWarranty.trim(),
        short_description: form.prodShortDescription.trim(),
        promo_information: form.prodPromoInformation.trim(),
        meta_title: form.prodMetaTitle.trim(),
        meta_description: form.prodMetaDescription.trim(),
        media_references: mediaRefs,
        bluetooth_compatibility: form.compBluetooth || '',
        headphone_jack_compatibility: form.compHeadphoneJack || '',
        compatible_charging_interface: form.compChargingInterface || '',
        wireless_charging_compatibility: wirelessChargingStr,
        storage_expansion_compatibility: form.compStorageExpansion || '',
        memory_capacity: form.compMemoryCapacity || '',
        compatible_watch_case_size: form.compWatchCaseSize || '',
        compatible_device_types: form.compUniversalDeviceTypes,
      }

      let savedProduct: any
      if (mode === 'add') {
        const res = await api.post('/catalog/products/', payload)
        savedProduct = res.data
      } else {
        const productId = product?.id
        const res = await api.patch(`/catalog/products/${productId}/`, payload)
        savedProduct = res.data
      }

      // Submit device compatibilities if any selected
      if (form.selectedDeviceIds.length > 0 && savedProduct?.id) {
        try {
          await api.post(`/catalog/products/${savedProduct.id}/compatibility/`, {
            device_ids: form.selectedDeviceIds,
          })
        } catch (compatErr: any) {
          console.error('Failed to save device compatibility:', compatErr)
          // Non-fatal: product was saved successfully
        }
      }

      form.resetForm()
      onSaved()
    } catch (err: any) {
      const detail = err?.response?.data?.detail
        || err?.response?.data?.message
        || (typeof err?.response?.data === 'object' ? JSON.stringify(err.response.data) : null)
        || err.message
        || 'An unexpected error occurred.'
      form.setFormError(`Failed to ${mode === 'add' ? 'create' : 'update'} product: ${detail}`)
    } finally {
      setSubmitting(false)
    }
  }, [form, validate, mode, product, user, handleUploadImage, onSaved])

  // -------------------------------------------------------------------------
  // Device compatibility list (filtered)
  // -------------------------------------------------------------------------
  const filteredDevices = useMemo(() => {
    if (!form.deviceSearch.trim()) return devices
    const q = form.deviceSearch.toLowerCase()
    return devices.filter((d: any) =>
      (d.name || '').toLowerCase().includes(q) ||
      (d.model || '').toLowerCase().includes(q) ||
      (d.brand || '').toLowerCase().includes(q)
    )
  }, [devices, form.deviceSearch])

  // -------------------------------------------------------------------------
  // Category-specific compatibility fields
  // -------------------------------------------------------------------------
  const renderCategorySpecificCompatibility = () => {
    const cat = (form.prodCategory || '').toLowerCase().replace(/[\s&]+/g, '_')

    const bluetoothOptions = ['Bluetooth 4.0', 'Bluetooth 4.1', 'Bluetooth 4.2', 'Bluetooth 5.0', 'Bluetooth 5.1', 'Bluetooth 5.2', 'Bluetooth 5.3', 'Not Compatible']
    const headphoneJackOptions = ['3.5mm', 'USB-C', 'Lightning', 'Not Compatible']
    const chargingInterfaceOptions = ['USB-C', 'Lightning', 'Micro-USB', 'USB-A', 'Wireless Only', 'Not Compatible']
    const wirelessChargingOptions = ['Qi', 'MagSafe', 'Not Compatible']
    const storageExpansionOptions = ['microSD', 'SD', 'NM Card', 'Not Compatible']
    const memoryCapacityOptions = ['16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB']
    const watchCaseSizeOptions = ['38mm', '40mm', '41mm', '42mm', '44mm', '45mm', '46mm', '47mm', '49mm']

    const renderSelect = (label: string, value: string, onChange: (v: string) => void, options: string[]) => (
      <div>
        <label style={labelStyle}>{label}</label>
        <select value={value} onChange={e => onChange(e.target.value)} style={fieldStyle}>
          <option value="">Select...</option>
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>
    )

    const renderWirelessChargingCheckboxes = () => (
      <div>
        <label style={labelStyle}>Wireless Charging Compatibility</label>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {wirelessChargingOptions.map(opt => (
            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.compWirelessCharging.includes(opt)}
                onChange={() => form.handleWirelessChargingChange(opt)}
              />
              {opt}
            </label>
          ))}
        </div>
      </div>
    )

    if (cat === 'headphones') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Typography sx={sectionTitle}>Category Compatibility (Headphones)</Typography>
          <div style={twoColGrid}>
            {renderSelect('Headphone Jack', form.compHeadphoneJack, form.setCompHeadphoneJack, headphoneJackOptions)}
            {renderSelect('Bluetooth', form.compBluetooth, form.setCompBluetooth, bluetoothOptions)}
          </div>
        </div>
      )
    }

    if (cat === 'speakers') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Typography sx={sectionTitle}>Category Compatibility (Speakers)</Typography>
          <div style={twoColGrid}>
            {renderSelect('Charging Interface', form.compChargingInterface, form.setCompChargingInterface, chargingInterfaceOptions)}
            {renderSelect('Bluetooth', form.compBluetooth, form.setCompBluetooth, bluetoothOptions)}
          </div>
        </div>
      )
    }

    if (cat === 'chargers_and_cables' || cat === 'chargers' || cat === 'cables') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Typography sx={sectionTitle}>Category Compatibility (Chargers & Cables)</Typography>
          {renderSelect('Charging Interface', form.compChargingInterface, form.setCompChargingInterface, chargingInterfaceOptions)}
          {renderWirelessChargingCheckboxes()}
        </div>
      )
    }

    if (cat === 'memory' || cat === 'memory_cards') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Typography sx={sectionTitle}>Category Compatibility (Memory)</Typography>
          <div style={twoColGrid}>
            {renderSelect('Storage Expansion', form.compStorageExpansion, form.setCompStorageExpansion, storageExpansionOptions)}
            <div>
              <label style={labelStyle}>Memory Capacity</label>
              <select
                value={form.compMemoryCapacity}
                onChange={e => form.setCompMemoryCapacity(e.target.value)}
                disabled={form.compStorageExpansion === 'Not Compatible'}
                style={{
                  ...fieldStyle,
                  opacity: form.compStorageExpansion === 'Not Compatible' ? 0.5 : 1,
                  cursor: form.compStorageExpansion === 'Not Compatible' ? 'not-allowed' : 'pointer',
                }}
              >
                <option value="">Select...</option>
                {memoryCapacityOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          </div>
        </div>
      )
    }

    if (cat === 'wearable_tech' || cat === 'wearables') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Typography sx={sectionTitle}>Category Compatibility (Wearable Tech)</Typography>
          {renderSelect('Charging Interface', form.compChargingInterface, form.setCompChargingInterface, chargingInterfaceOptions)}
          {renderWirelessChargingCheckboxes()}
        </div>
      )
    }

    if (cat === 'watch_accessories') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Typography sx={sectionTitle}>Category Compatibility (Watch Accessories)</Typography>
          {renderSelect('Watch Case Size', form.compWatchCaseSize, form.setCompWatchCaseSize, watchCaseSizeOptions)}
          {renderWirelessChargingCheckboxes()}
        </div>
      )
    }

    return null
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              background: 'var(--bg-card, #fff)',
              color: 'var(--text-primary)',
              borderRadius: 3,
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border)',
            pb: 1,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {mode === 'add' ? 'Add New Product' : 'Edit Product'}
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 2, pb: 1 }}>
          {form.formError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => form.setFormError(null)}>
              {form.formError}
            </Alert>
          )}

          {/* ---- Basic Info ---- */}
          <Typography sx={sectionTitle}>Basic Information</Typography>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={twoColGrid}>
              <div>
                <label style={labelStyle}>Product Name *</label>
                <input
                  type="text"
                  value={form.prodName}
                  onChange={e => form.setProdName(e.target.value)}
                  placeholder="Product name"
                  style={fieldStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>SKU *</label>
                <input
                  type="text"
                  value={form.prodSku}
                  onChange={e => form.setProdSku(e.target.value)}
                  placeholder="SKU"
                  style={fieldStyle}
                />
              </div>
            </div>

            <div style={twoColGrid}>
              <div>
                <label style={labelStyle}>Brand</label>
                {isVendor ? (
                  <input
                    type="text"
                    value={form.prodBrand}
                    onChange={e => form.setProdBrand(e.target.value)}
                    placeholder="Brand"
                    style={fieldStyle}
                  />
                ) : (
                  <select value={form.prodBrand} onChange={e => form.setProdBrand(e.target.value)} style={fieldStyle}>
                    <option value="">Select brand...</option>
                    {allowedBrands.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label style={labelStyle}>Product Type</label>
                <select value={form.prodType} onChange={e => form.setProdType(e.target.value)} style={fieldStyle}>
                  <option value="">Select type...</option>
                  <option value="accessory">Accessory</option>
                  <option value="branded_merchandise">Branded Merchandise</option>
                </select>
              </div>
            </div>

            <div style={twoColGrid}>
              <div>
                <label style={labelStyle}>Product Category {isVendor && form.prodCategory !== 'branded_merchandise' ? '*' : ''}</label>
                <select value={form.prodCategory} onChange={e => form.setProdCategory(e.target.value)} style={fieldStyle}>
                  <option value="">Select category...</option>
                  {allowedCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>UPC {isVendor ? '*' : ''}</label>
                <input
                  type="text"
                  value={form.prodUpc}
                  onChange={e => form.setProdUpc(e.target.value)}
                  placeholder="123456789012"
                  maxLength={12}
                  style={fieldStyle}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Description {isVendor ? '*' : ''}</label>
              <textarea
                value={form.prodDescription}
                onChange={e => form.setProdDescription(e.target.value)}
                placeholder="Product description"
                rows={3}
                style={{ ...fieldStyle, resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={labelStyle}>Short Description</label>
              <textarea
                value={form.prodShortDescription}
                onChange={e => form.setProdShortDescription(e.target.value)}
                placeholder="Short description"
                rows={2}
                style={{ ...fieldStyle, resize: 'vertical' }}
              />
            </div>
          </div>

          {/* ---- Pricing ---- */}
          <Typography sx={sectionTitle}>Pricing</Typography>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={twoColGrid}>
              <div>
                <label style={labelStyle}>Vendor Wholesale Price {isVendor ? '*' : ''}</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.prodPrice}
                  onChange={e => form.setProdPrice(e.target.value)}
                  placeholder="0.00"
                  style={fieldStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Currency</label>
                <select value={form.prodCurrency} onChange={e => form.setProdCurrency(e.target.value)} style={fieldStyle}>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CAD">CAD</option>
                </select>
              </div>
            </div>
            <div style={twoColGrid}>
              <div>
                <label style={labelStyle}>MSRP {isVendor ? '*' : ''}</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.prodMsrp}
                  onChange={e => form.setProdMsrp(e.target.value)}
                  placeholder="0.00"
                  style={fieldStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>MAP Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.prodMapPrice}
                  onChange={e => form.setProdMapPrice(e.target.value)}
                  placeholder="0.00"
                  style={fieldStyle}
                />
              </div>
            </div>
            <div style={twoColGrid}>
              <div>
                <label style={labelStyle}>Sale Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.prodSalePrice}
                  onChange={e => form.setProdSalePrice(e.target.value)}
                  placeholder="0.00"
                  style={fieldStyle}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 24 }}>
                <input
                  type="checkbox"
                  checked={form.prodRecommendedAccessory}
                  onChange={e => form.setProdRecommendedAccessory(e.target.checked)}
                  id="recommendedAccessory"
                />
                <label htmlFor="recommendedAccessory" style={{ fontSize: 14, cursor: 'pointer' }}>
                  Recommended Accessory
                </label>
              </div>
            </div>
          </div>

          {/* ---- Dates ---- */}
          <Typography sx={sectionTitle}>Dates</Typography>
          <div style={twoColGrid}>
            <div>
              <label style={labelStyle}>Launch Date {isVendor ? '*' : ''}</label>
              <input
                type="date"
                value={form.prodLaunchDate}
                onChange={e => form.setProdLaunchDate(e.target.value)}
                style={fieldStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Release Date</label>
              <input
                type="date"
                value={form.prodReleaseDate}
                onChange={e => form.setProdReleaseDate(e.target.value)}
                style={fieldStyle}
              />
            </div>
          </div>
          <div style={{ ...twoColGrid, marginTop: 12 }}>
            <div>
              <label style={labelStyle}>EOL Date</label>
              <input
                type="date"
                value={form.prodEolDate}
                onChange={e => form.setProdEolDate(e.target.value)}
                style={fieldStyle}
              />
            </div>
            <div />
          </div>

          {/* ---- Colors ---- */}
          <Typography sx={sectionTitle}>Colors</Typography>
          <div style={twoColGrid}>
            <div>
              <label style={labelStyle}>Color {isVendor ? '*' : ''}</label>
              <input
                type="text"
                value={form.prodColor}
                onChange={e => form.setProdColor(e.target.value)}
                placeholder="e.g. Midnight Black"
                style={fieldStyle}
              />
            </div>
            <MultiSelectColor
              selected={form.prodSystemColor}
              options={allowedColors}
              onChange={form.setProdSystemColor}
              label={`System Color ${isVendor ? '*' : ''}`}
            />
          </div>

          {/* ---- Dimensions & Weight ---- */}
          <Typography sx={sectionTitle}>Dimensions & Weight</Typography>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Length {isVendor ? '*' : ''}</label>
              <input
                type="number"
                step="0.01"
                value={form.prodLength}
                onChange={e => form.setProdLength(e.target.value)}
                placeholder="in"
                style={fieldStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Width {isVendor ? '*' : ''}</label>
              <input
                type="number"
                step="0.01"
                value={form.prodWidth}
                onChange={e => form.setProdWidth(e.target.value)}
                placeholder="in"
                style={fieldStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Height {isVendor ? '*' : ''}</label>
              <input
                type="number"
                step="0.01"
                value={form.prodHeight}
                onChange={e => form.setProdHeight(e.target.value)}
                placeholder="in"
                style={fieldStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Weight {isVendor ? '*' : ''}</label>
              <input
                type="number"
                step="0.01"
                value={form.prodWeight}
                onChange={e => form.setProdWeight(e.target.value)}
                placeholder="oz"
                style={fieldStyle}
              />
            </div>
          </div>

          {/* ---- Inventory ---- */}
          <Typography sx={sectionTitle}>Inventory</Typography>
          <div style={twoColGrid}>
            <div>
              <label style={labelStyle}>Inventory Level</label>
              <input
                type="number"
                value={form.prodInventoryLevel}
                onChange={e => form.setProdInventoryLevel(e.target.value)}
                placeholder="0"
                style={fieldStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Inventory Threshold</label>
              <input
                type="number"
                value={form.prodInventoryThreshold}
                onChange={e => form.setProdInventoryThreshold(e.target.value)}
                placeholder="0"
                style={fieldStyle}
              />
            </div>
          </div>

          {/* ---- Warranty ---- */}
          <Typography sx={sectionTitle}>Warranty & Promo</Typography>
          <div style={twoColGrid}>
            <div>
              <label style={labelStyle}>Warranty {isVendor ? '*' : ''}</label>
              <input
                type="text"
                value={form.prodWarranty}
                onChange={e => form.setProdWarranty(e.target.value)}
                placeholder="e.g. 1 Year Limited"
                style={fieldStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Promo Information</label>
              <input
                type="text"
                value={form.prodPromoInformation}
                onChange={e => form.setProdPromoInformation(e.target.value)}
                placeholder="Promo info"
                style={fieldStyle}
              />
            </div>
          </div>

          {/* ---- Status (edit mode or admin) ---- */}
          {(mode === 'edit' || isAdmin) && (
            <>
              <Typography sx={sectionTitle}>Status</Typography>
              <div style={twoColGrid}>
                <div>
                  <label style={labelStyle}>Product Status</label>
                  <select value={form.prodStatus} onChange={e => form.setProdStatus(e.target.value)} style={fieldStyle}>
                    <option value="">Select status...</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="draft">Draft</option>
                    <option value="pending_review">Pending Review</option>
                    <option value="out_of_stock">Out of Stock</option>
                    <option value="eol">EOL</option>
                    {isAdmin && <option value="rejected">Rejected</option>}
                    {isAdmin && <option value="archived">Archived</option>}
                  </select>
                </div>
                <div />
              </div>
            </>
          )}

          {/* ---- Images ---- */}
          <Typography sx={sectionTitle}>Images</Typography>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>Primary Image (PNG with transparent background, or ZIP of PNGs)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.zip"
                onChange={handleImageChange}
                style={{ fontSize: 14 }}
              />
              {uploadingImage && (
                <Typography sx={{ fontSize: 13, color: 'var(--text-secondary)', mt: 0.5 }}>
                  Uploading images...
                </Typography>
              )}
            </div>

            {form.imagePreviewUrl && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                <img
                  src={form.imagePreviewUrl}
                  alt="Preview"
                  style={{
                    width: 80,
                    height: 80,
                    objectFit: 'contain',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: '#f8f8f8',
                  }}
                />
                <Button
                  size="small"
                  color="error"
                  onClick={() => {
                    form.setImagePreviewUrl('')
                    form.setProdPrimaryImageUrl('')
                    form.setSelectedImageFile(null)
                    form.setUploadedPrimaryAssetId(null)
                    form.setUploadedZipImages([])
                  }}
                >
                  Remove
                </Button>
              </Box>
            )}

            {form.uploadedZipImages.length > 1 && (
              <div>
                <label style={labelStyle}>ZIP Images ({form.uploadedZipImages.length} extracted)</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {form.uploadedZipImages.map((img, idx) => (
                    <div
                      key={img.id || idx}
                      style={{
                        position: 'relative',
                        border: idx === 0 ? '2px solid var(--accent)' : '1px solid var(--border)',
                        borderRadius: 8,
                        padding: 2,
                      }}
                    >
                      <img
                        src={getImageUrl(img.url)}
                        alt={img.name}
                        style={{ width: 60, height: 60, objectFit: 'contain', borderRadius: 6, background: '#f8f8f8' }}
                      />
                      {idx === 0 && (
                        <span style={{
                          position: 'absolute', top: -6, right: -6, background: 'var(--accent)', color: '#fff',
                          borderRadius: '50%', width: 18, height: 18, fontSize: 10, display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          P
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Typography sx={{ fontSize: 13, color: 'var(--text-secondary)' }}>Additional Image URLs</Typography>
            <div style={twoColGrid}>
              <div>
                <label style={labelStyle}>Image URL 1</label>
                <input type="text" value={form.prodImageUrl1} onChange={e => form.setProdImageUrl1(e.target.value)} placeholder="URL or storage key" style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>Image URL 2</label>
                <input type="text" value={form.prodImageUrl2} onChange={e => form.setProdImageUrl2(e.target.value)} placeholder="URL or storage key" style={fieldStyle} />
              </div>
            </div>
            <div style={twoColGrid}>
              <div>
                <label style={labelStyle}>Image URL 3</label>
                <input type="text" value={form.prodImageUrl3} onChange={e => form.setProdImageUrl3(e.target.value)} placeholder="URL or storage key" style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>Image URL 4</label>
                <input type="text" value={form.prodImageUrl4} onChange={e => form.setProdImageUrl4(e.target.value)} placeholder="URL or storage key" style={fieldStyle} />
              </div>
            </div>
            <div style={twoColGrid}>
              <div>
                <label style={labelStyle}>Image URL 5</label>
                <input type="text" value={form.prodImageUrl5} onChange={e => form.setProdImageUrl5(e.target.value)} placeholder="URL or storage key" style={fieldStyle} />
              </div>
              <div />
            </div>
          </div>

          {/* ---- SEO / Meta ---- */}
          <Typography sx={sectionTitle}>SEO / Meta</Typography>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>Meta Title</label>
              <input
                type="text"
                value={form.prodMetaTitle}
                onChange={e => form.setProdMetaTitle(e.target.value)}
                placeholder="Meta title"
                style={fieldStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Meta Description</label>
              <textarea
                value={form.prodMetaDescription}
                onChange={e => form.setProdMetaDescription(e.target.value)}
                placeholder="Meta description"
                rows={2}
                style={{ ...fieldStyle, resize: 'vertical' }}
              />
            </div>
          </div>

          {/* ---- Device Compatibility ---- */}
          {form.prodType === 'accessory' && (
            <>
              <Typography sx={sectionTitle}>Device Compatibility</Typography>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Universal Device Types */}
                <div>
                  <label style={labelStyle}>Universal Device Types</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {deviceTypes.map((dt: any) => {
                      const dtName = typeof dt === 'string' ? dt : dt.name || dt.value || ''
                      return (
                        <label key={dtName} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={form.compUniversalDeviceTypes.includes(dtName)}
                            onChange={() => {
                              form.setCompUniversalDeviceTypes(prev =>
                                prev.includes(dtName) ? prev.filter(x => x !== dtName) : [...prev, dtName]
                              )
                            }}
                          />
                          {dtName}
                        </label>
                      )
                    })}
                  </div>
                </div>

                {/* Specific Device Selection */}
                <div>
                  <label style={labelStyle}>Specific Device Compatibility</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={form.deviceSearch}
                      onChange={e => { form.setDeviceSearch(e.target.value); form.setShowDeviceDropdown(true) }}
                      onFocus={() => form.setShowDeviceDropdown(true)}
                      placeholder="Search devices..."
                      style={fieldStyle}
                    />
                    {form.showDeviceDropdown && filteredDevices.length > 0 && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          zIndex: 1000,
                          background: 'var(--bg-card, #fff)',
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                          maxHeight: 200,
                          overflowY: 'auto',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        }}
                      >
                        {filteredDevices.slice(0, 50).map((device: any) => {
                          const isSelected = form.selectedDeviceIds.includes(device.id)
                          return (
                            <div
                              key={device.id}
                              onClick={() => form.toggleDeviceSelection(device.id)}
                              style={{
                                padding: '6px 12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                background: isSelected ? 'var(--bg-hover, #f0f4ff)' : 'transparent',
                                fontSize: 14,
                              }}
                            >
                              {isSelected && <CheckIcon sx={{ fontSize: 16, color: 'var(--accent)' }} />}
                              <span>{device.brand} {device.name} {device.model ? `(${device.model})` : ''}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Selected devices display */}
                  {form.selectedDeviceIds.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {form.selectedDeviceIds.map(id => {
                        const device = devices.find((d: any) => d.id === id)
                        const displayName = device
                          ? `${device.brand || ''} ${device.name || ''} ${device.model ? `(${device.model})` : ''}`.trim()
                          : id
                        return (
                          <span
                            key={id}
                            style={{
                              background: 'var(--accent)',
                              color: '#fff',
                              borderRadius: 4,
                              padding: '2px 8px',
                              fontSize: 12,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            {displayName}
                            <span
                              onClick={() => form.toggleDeviceSelection(id)}
                              style={{ cursor: 'pointer', fontWeight: 700 }}
                            >
                              x
                            </span>
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* ---- Category-Specific Compatibility ---- */}
              {renderCategorySpecificCompatibility()}
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ borderTop: '1px solid var(--border)', px: 3, py: 1.5 }}>
          <Button onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting || uploadingImage}
          >
            {submitting
              ? (mode === 'add' ? 'Creating...' : 'Saving...')
              : (mode === 'add' ? 'Create Product' : 'Save Changes')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Dialog for dirty-close */}
      <ConfirmDialog {...dialogProps} />
    </>
  )
}
