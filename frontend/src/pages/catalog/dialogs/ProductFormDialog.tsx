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
import TextField from '@mui/material/TextField'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Chip from '@mui/material/Chip'
import InputAdornment from '@mui/material/InputAdornment'
import CloseIcon from '@mui/icons-material/Close'
import CheckIcon from '@mui/icons-material/Check'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
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
// MultiSelectColor (inline component — MUI-styled)
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
    <Box ref={ref} sx={{ position: 'relative' }}>
      <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary' }}>
        {label}
      </Typography>
      <Box
        onClick={() => setOpen(o => !o)}
        sx={{
          px: 1.5,
          py: 1,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'background.paper',
          cursor: 'pointer',
          minHeight: 40,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 0.5,
          alignItems: 'center',
          '&:hover': { borderColor: 'text.primary' },
        }}
      >
        {selectedColors.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Select colors...</Typography>
        ) : (
          selectedColors.map(c => (
            <Chip
              key={c}
              label={c}
              size="small"
              color="primary"
              onDelete={(e) => { e.stopPropagation(); toggle(c) }}
              sx={{ height: 24, fontSize: 12 }}
            />
          ))
        )}
      </Box>
      {open && (
        <Box
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1300,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            maxHeight: 200,
            overflowY: 'auto',
            boxShadow: 3,
          }}
        >
          {options.map(opt => (
            <Box
              key={opt}
              onClick={() => toggle(opt)}
              sx={{
                px: 1.5,
                py: 0.75,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                bgcolor: selectedColors.includes(opt) ? 'action.hover' : 'transparent',
                '&:hover': { bgcolor: 'action.hover' },
                fontSize: 14,
              }}
            >
              {selectedColors.includes(opt) && <CheckIcon sx={{ fontSize: 16, color: 'primary.main' }} />}
              {opt}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Shared sx helpers
// ---------------------------------------------------------------------------

const sectionTitleSx = {
  fontSize: 13,
  fontWeight: 600,
  color: 'text.primary',
  mt: 2.5,
  mb: 1,
  pb: 0.5,
  borderBottom: '1px solid',
  borderColor: 'divider',
}

const gridTwoCol = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 2,
}

const gridFourCol = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr 1fr' },
  gap: 2,
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
      if (form.prodType !== 'branded_merchandise' && !form.prodVendorCategory.trim()) return 'Vendor Category is required.'
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
        // Category-specific compatibility checks (admin only — vendors don't manage these)
        if (!isVendor) {
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
        compatible_device_types: form.compUniversalDeviceTypes,
      }

      // Compatibility fields: CIXCI-internal, only admins manage these
      if (!isVendor) {
        payload.bluetooth_compatibility = form.compBluetooth || ''
        payload.headphone_jack_compatibility = form.compHeadphoneJack || ''
        payload.compatible_charging_interface = form.compChargingInterface || ''
        payload.wireless_charging_compatibility = wirelessChargingStr
        payload.storage_expansion_compatibility = form.compStorageExpansion || ''
        payload.memory_capacity = form.compMemoryCapacity || ''
        payload.compatible_watch_case_size = form.compWatchCaseSize || ''
      }

      // Category Governance: Vendors provide vendor_category, Admins can set both + override
      if (isVendor) {
        payload.vendor_category = form.prodVendorCategory.trim()
      } else if (isAdmin) {
        payload.product_category = form.prodCategory || null
        payload.vendor_category = form.prodVendorCategory.trim() || null
        payload.product_category_override = form.prodCategoryOverride || null
      } else {
        // Regular users (if any) can set product_category
        payload.product_category = form.prodCategory || null
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
      <FormControl size="small" fullWidth>
        <InputLabel>{label}</InputLabel>
        <Select value={value} onChange={e => onChange(e.target.value as string)} label={label}>
          <MenuItem value=""><em>Select...</em></MenuItem>
          {options.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
        </Select>
      </FormControl>
    )

    const renderWirelessChargingCheckboxes = () => (
      <Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
          Wireless Charging Compatibility
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {wirelessChargingOptions.map(opt => (
            <FormControlLabel
              key={opt}
              control={
                <Checkbox
                  size="small"
                  checked={form.compWirelessCharging.includes(opt)}
                  onChange={() => form.handleWirelessChargingChange(opt)}
                />
              }
              label={opt}
              sx={{ '& .MuiFormControlLabel-label': { fontSize: 14 } }}
            />
          ))}
        </Box>
      </Box>
    )

    if (cat === 'headphones') {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography sx={sectionTitleSx}>Category Compatibility (Headphones)</Typography>
          <Box sx={gridTwoCol}>
            {renderSelect('Headphone Jack', form.compHeadphoneJack, form.setCompHeadphoneJack, headphoneJackOptions)}
            {renderSelect('Bluetooth', form.compBluetooth, form.setCompBluetooth, bluetoothOptions)}
          </Box>
        </Box>
      )
    }

    if (cat === 'speakers') {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography sx={sectionTitleSx}>Category Compatibility (Speakers)</Typography>
          <Box sx={gridTwoCol}>
            {renderSelect('Charging Interface', form.compChargingInterface, form.setCompChargingInterface, chargingInterfaceOptions)}
            {renderSelect('Bluetooth', form.compBluetooth, form.setCompBluetooth, bluetoothOptions)}
          </Box>
        </Box>
      )
    }

    if (cat === 'chargers_and_cables' || cat === 'chargers' || cat === 'cables') {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography sx={sectionTitleSx}>Category Compatibility (Chargers & Cables)</Typography>
          {renderSelect('Charging Interface', form.compChargingInterface, form.setCompChargingInterface, chargingInterfaceOptions)}
          {renderWirelessChargingCheckboxes()}
        </Box>
      )
    }

    if (cat === 'memory' || cat === 'memory_cards') {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography sx={sectionTitleSx}>Category Compatibility (Memory)</Typography>
          <Box sx={gridTwoCol}>
            {renderSelect('Storage Expansion', form.compStorageExpansion, form.setCompStorageExpansion, storageExpansionOptions)}
            <FormControl size="small" fullWidth disabled={form.compStorageExpansion === 'Not Compatible'}>
              <InputLabel>Memory Capacity</InputLabel>
              <Select
                value={form.compMemoryCapacity}
                onChange={e => form.setCompMemoryCapacity(e.target.value as string)}
                label="Memory Capacity"
              >
                <MenuItem value=""><em>Select...</em></MenuItem>
                {memoryCapacityOptions.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
        </Box>
      )
    }

    if (cat === 'wearable_tech' || cat === 'wearables') {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography sx={sectionTitleSx}>Category Compatibility (Wearable Tech)</Typography>
          {renderSelect('Charging Interface', form.compChargingInterface, form.setCompChargingInterface, chargingInterfaceOptions)}
          {renderWirelessChargingCheckboxes()}
        </Box>
      )
    }

    if (cat === 'watch_accessories') {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography sx={sectionTitleSx}>Category Compatibility (Watch Accessories)</Typography>
          {renderSelect('Watch Case Size', form.compWatchCaseSize, form.setCompWatchCaseSize, watchCaseSizeOptions)}
          {renderWirelessChargingCheckboxes()}
        </Box>
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
              bgcolor: 'background.paper',
              color: 'text.primary',
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
            borderBottom: '1px solid',
            borderColor: 'divider',
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

        <DialogContent sx={{ pt: 2, pb: 1, px: 3 }}>
          {form.formError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => form.setFormError(null)}>
              {form.formError}
            </Alert>
          )}

          {/* ---- Basic Info ---- */}
          <Typography sx={sectionTitleSx}>Basic Information</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={gridTwoCol}>
              <TextField
                size="small"
                fullWidth
                label={`Product Name *`}
                value={form.prodName}
                onChange={e => form.setProdName(e.target.value)}
                placeholder="Product name"
              />
              <TextField
                size="small"
                fullWidth
                label="SKU *"
                value={form.prodSku}
                onChange={e => form.setProdSku(e.target.value)}
                placeholder="SKU"
              />
            </Box>

            <Box sx={gridTwoCol}>
              {isVendor ? (
                <TextField
                  size="small"
                  fullWidth
                  label="Brand"
                  value={form.prodBrand}
                  onChange={e => form.setProdBrand(e.target.value)}
                  placeholder="Brand"
                />
              ) : (
                <FormControl size="small" fullWidth>
                  <InputLabel>Brand</InputLabel>
                  <Select value={form.prodBrand} onChange={e => form.setProdBrand(e.target.value as string)} label="Brand">
                    <MenuItem value=""><em>Select brand...</em></MenuItem>
                    {allowedBrands.map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
                  </Select>
                </FormControl>
              )}
              <FormControl size="small" fullWidth>
                <InputLabel>Product Type</InputLabel>
                <Select value={form.prodType} onChange={e => form.setProdType(e.target.value as string)} label="Product Type">
                  <MenuItem value=""><em>Select type...</em></MenuItem>
                  <MenuItem value="accessory">Accessory</MenuItem>
                  <MenuItem value="branded_merchandise">Branded Merchandise</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box sx={gridTwoCol}>
              {isVendor ? (
                <Box>
                  <TextField
                    size="small"
                    fullWidth
                    label={`Vendor Category ${form.prodType !== 'branded_merchandise' ? '*' : ''}`}
                    value={form.prodVendorCategory}
                    onChange={e => form.setProdVendorCategory(e.target.value)}
                    placeholder="Enter your category name"
                  />
                  {form.prodCategory && (
                    <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>
                      Mapped to CIXCI category: <strong>{form.prodCategory}</strong>
                    </Typography>
                  )}
                </Box>
              ) : (
                <FormControl size="small" fullWidth>
                  <InputLabel>Product Category</InputLabel>
                  <Select value={form.prodCategory} onChange={e => form.setProdCategory(e.target.value as string)} label="Product Category">
                    <MenuItem value=""><em>Select category...</em></MenuItem>
                    {allowedCategories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </Select>
                </FormControl>
              )}
              <TextField
                size="small"
                fullWidth
                label={`UPC ${isVendor ? '*' : ''}`}
                value={form.prodUpc}
                onChange={e => form.setProdUpc(e.target.value)}
                placeholder="123456789012"
                slotProps={{ htmlInput: { maxLength: 12 } }}
              />
            </Box>

            {/* Admin: Show vendor category + category override + validation status */}
            {isAdmin && (
              <>
                <Box sx={gridTwoCol}>
                  <TextField
                    size="small"
                    fullWidth
                    label="Vendor Category (Original)"
                    value={form.prodVendorCategory}
                    onChange={e => form.setProdVendorCategory(e.target.value)}
                    placeholder="Vendor's original category name"
                    slotProps={{ input: { readOnly: mode === 'edit' } }}
                  />
                  <Box>
                    <FormControl size="small" fullWidth>
                      <InputLabel>Category Override</InputLabel>
                      <Select
                        value={form.prodCategoryOverride}
                        onChange={e => form.setProdCategoryOverride(e.target.value as string)}
                        label="Category Override"
                      >
                        <MenuItem value="">No override (use mapping)</MenuItem>
                        {allowedCategories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                      </Select>
                    </FormControl>
                    {form.prodCategoryOverride && (
                      <Typography sx={{ fontSize: 11, color: 'warning.main', mt: 0.5 }}>
                        Override active — takes priority over mapping
                      </Typography>
                    )}
                  </Box>
                </Box>
                {mode === 'edit' && form.prodCategoryValidationStatus && (
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>
                    Category Status: <strong style={{
                      color: form.prodCategoryValidationStatus === 'resolved' ? '#2e7d32'
                        : form.prodCategoryValidationStatus === 'override_applied' ? '#ed6c02'
                        : form.prodCategoryValidationStatus === 'mapping_required' ? '#d32f2f'
                        : '#757575'
                    }}>
                      {form.prodCategoryValidationStatus === 'resolved' ? 'Resolved via Mapping'
                        : form.prodCategoryValidationStatus === 'override_applied' ? 'Override Applied'
                        : form.prodCategoryValidationStatus === 'mapping_required' ? 'Mapping Required'
                        : 'Pending'}
                    </strong>
                  </Typography>
                )}
              </>
            )}
            {/* Vendor: Show category validation status */}
            {isVendor && mode === 'edit' && form.prodCategoryValidationStatus && (
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                Category Status: <strong style={{
                  color: form.prodCategoryValidationStatus === 'resolved' ? '#2e7d32'
                    : form.prodCategoryValidationStatus === 'mapping_required' ? '#d32f2f'
                    : '#757575'
                }}>
                  {form.prodCategoryValidationStatus === 'resolved' ? 'Resolved'
                    : form.prodCategoryValidationStatus === 'mapping_required' ? 'Mapping Required'
                    : 'Pending'}
                </strong>
              </Typography>
            )}

            <TextField
              size="small"
              fullWidth
              multiline
              rows={2}
              label={`Description ${isVendor ? '*' : ''}`}
              value={form.prodDescription}
              onChange={e => form.setProdDescription(e.target.value)}
              placeholder="Product description"
            />

            <TextField
              size="small"
              fullWidth
              multiline
              rows={1}
              label="Short Description"
              value={form.prodShortDescription}
              onChange={e => form.setProdShortDescription(e.target.value)}
              placeholder="Short description"
            />
          </Box>

          {/* ---- Pricing ---- */}
          <Typography sx={sectionTitleSx}>Pricing</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={gridTwoCol}>
              <TextField
                size="small"
                fullWidth
                type="number"
                label={`Vendor Wholesale Price ${isVendor ? '*' : ''}`}
                value={form.prodPrice}
                onChange={e => form.setProdPrice(e.target.value)}
                placeholder="0.00"
                slotProps={{ htmlInput: { step: '0.01' } }}
              />
              <FormControl size="small" fullWidth>
                <InputLabel>Currency</InputLabel>
                <Select value={form.prodCurrency} onChange={e => form.setProdCurrency(e.target.value as string)} label="Currency">
                  <MenuItem value="USD">USD</MenuItem>
                  <MenuItem value="EUR">EUR</MenuItem>
                  <MenuItem value="GBP">GBP</MenuItem>
                  <MenuItem value="CAD">CAD</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={gridTwoCol}>
              <TextField
                size="small"
                fullWidth
                type="number"
                label={`MSRP ${isVendor ? '*' : ''}`}
                value={form.prodMsrp}
                onChange={e => form.setProdMsrp(e.target.value)}
                placeholder="0.00"
                slotProps={{ htmlInput: { step: '0.01' } }}
              />
              <TextField
                size="small"
                fullWidth
                type="number"
                label="MAP Price"
                value={form.prodMapPrice}
                onChange={e => form.setProdMapPrice(e.target.value)}
                placeholder="0.00"
                slotProps={{ htmlInput: { step: '0.01' } }}
              />
            </Box>
            <Box sx={gridTwoCol}>
              <TextField
                size="small"
                fullWidth
                type="number"
                label="Sale Price"
                value={form.prodSalePrice}
                onChange={e => form.setProdSalePrice(e.target.value)}
                placeholder="0.00"
                slotProps={{ htmlInput: { step: '0.01' } }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', pt: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={form.prodRecommendedAccessory}
                      onChange={e => form.setProdRecommendedAccessory(e.target.checked)}
                    />
                  }
                  label="Recommended Accessory"
                  sx={{ '& .MuiFormControlLabel-label': { fontSize: 14 } }}
                />
              </Box>
            </Box>
          </Box>

          {/* ---- Dates ---- */}
          <Typography sx={sectionTitleSx}>Dates</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={gridTwoCol}>
              <TextField
                size="small"
                fullWidth
                type="date"
                label={`Launch Date ${isVendor ? '*' : ''}`}
                value={form.prodLaunchDate}
                onChange={e => form.setProdLaunchDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                size="small"
                fullWidth
                type="date"
                label="Release Date"
                value={form.prodReleaseDate}
                onChange={e => form.setProdReleaseDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>
            <Box sx={gridTwoCol}>
              <TextField
                size="small"
                fullWidth
                type="date"
                label="EOL Date"
                value={form.prodEolDate}
                onChange={e => form.setProdEolDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <Box />
            </Box>
          </Box>

          {/* ---- Colors ---- */}
          <Typography sx={sectionTitleSx}>Colors</Typography>
          <Box sx={gridTwoCol}>
            <TextField
              size="small"
              fullWidth
              label={`Color ${isVendor ? '*' : ''}`}
              value={form.prodColor}
              onChange={e => form.setProdColor(e.target.value)}
              placeholder="e.g. Midnight Black"
            />
            <MultiSelectColor
              selected={form.prodSystemColor}
              options={allowedColors}
              onChange={form.setProdSystemColor}
              label={`System Color ${isVendor ? '*' : ''}`}
            />
          </Box>

          {/* ---- Dimensions & Weight ---- */}
          <Typography sx={sectionTitleSx}>Dimensions & Weight</Typography>
          <Box sx={gridFourCol}>
            <TextField
              size="small"
              fullWidth
              type="number"
              label={`Length ${isVendor ? '*' : ''}`}
              value={form.prodLength}
              onChange={e => form.setProdLength(e.target.value)}
              placeholder="0.00"
              slotProps={{ htmlInput: { step: '0.01' }, input: { endAdornment: <InputAdornment position="end">in</InputAdornment> } }}
            />
            <TextField
              size="small"
              fullWidth
              type="number"
              label={`Width ${isVendor ? '*' : ''}`}
              value={form.prodWidth}
              onChange={e => form.setProdWidth(e.target.value)}
              placeholder="0.00"
              slotProps={{ htmlInput: { step: '0.01' }, input: { endAdornment: <InputAdornment position="end">in</InputAdornment> } }}
            />
            <TextField
              size="small"
              fullWidth
              type="number"
              label={`Height ${isVendor ? '*' : ''}`}
              value={form.prodHeight}
              onChange={e => form.setProdHeight(e.target.value)}
              placeholder="0.00"
              slotProps={{ htmlInput: { step: '0.01' }, input: { endAdornment: <InputAdornment position="end">in</InputAdornment> } }}
            />
            <TextField
              size="small"
              fullWidth
              type="number"
              label={`Weight ${isVendor ? '*' : ''}`}
              value={form.prodWeight}
              onChange={e => form.setProdWeight(e.target.value)}
              placeholder="0.00"
              slotProps={{ htmlInput: { step: '0.01' }, input: { endAdornment: <InputAdornment position="end">oz</InputAdornment> } }}
            />
          </Box>

          {/* ---- Inventory ---- */}
          <Typography sx={sectionTitleSx}>Inventory</Typography>
          <Box sx={gridTwoCol}>
            <TextField
              size="small"
              fullWidth
              type="number"
              label="Inventory Level"
              value={form.prodInventoryLevel}
              onChange={e => form.setProdInventoryLevel(e.target.value)}
              placeholder="0"
            />
            <TextField
              size="small"
              fullWidth
              type="number"
              label="Inventory Threshold"
              value={form.prodInventoryThreshold}
              onChange={e => form.setProdInventoryThreshold(e.target.value)}
              placeholder="0"
            />
          </Box>

          {/* ---- Warranty & Promo ---- */}
          <Typography sx={sectionTitleSx}>Warranty & Promo</Typography>
          <Box sx={gridTwoCol}>
            <TextField
              size="small"
              fullWidth
              label={`Warranty ${isVendor ? '*' : ''}`}
              value={form.prodWarranty}
              onChange={e => form.setProdWarranty(e.target.value)}
              placeholder="e.g. 1 Year Limited"
            />
            <TextField
              size="small"
              fullWidth
              label="Promo Information"
              value={form.prodPromoInformation}
              onChange={e => form.setProdPromoInformation(e.target.value)}
              placeholder="Promo info"
            />
          </Box>

          {/* ---- Status (edit mode or admin) ---- */}
          {(mode === 'edit' || isAdmin) && (
            <>
              <Typography sx={sectionTitleSx}>Status</Typography>
              <Box sx={gridTwoCol}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Product Status</InputLabel>
                  <Select value={form.prodStatus} onChange={e => form.setProdStatus(e.target.value as string)} label="Product Status">
                    <MenuItem value=""><em>Select status...</em></MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="pending_review">Pending Review</MenuItem>
                    <MenuItem value="out_of_stock">Out of Stock</MenuItem>
                    <MenuItem value="eol">EOL</MenuItem>
                    {isAdmin && <MenuItem value="rejected">Rejected</MenuItem>}
                    {isAdmin && <MenuItem value="archived">Archived</MenuItem>}
                  </Select>
                </FormControl>
                <Box />
              </Box>
            </>
          )}

          {/* ---- Images ---- */}
          <Typography sx={sectionTitleSx}>Images</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                Primary Image (PNG with transparent background, or ZIP of PNGs)
              </Typography>
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.zip"
                onChange={handleImageChange}
                style={{ display: 'none' }}
                id="product-image-upload"
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={<CloudUploadIcon />}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
              >
                {uploadingImage ? 'Uploading...' : 'Choose File'}
              </Button>
              {uploadingImage && (
                <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5 }}>
                  Uploading images...
                </Typography>
              )}
            </Box>

            {form.imagePreviewUrl && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  component="img"
                  src={form.imagePreviewUrl}
                  alt="Preview"
                  sx={{
                    width: 80,
                    height: 80,
                    objectFit: 'contain',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: '#f8f8f8',
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
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                  ZIP Images ({form.uploadedZipImages.length} extracted)
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {form.uploadedZipImages.map((img, idx) => (
                    <Box
                      key={img.id || idx}
                      sx={{
                        position: 'relative',
                        border: idx === 0 ? '2px solid' : '1px solid',
                        borderColor: idx === 0 ? 'primary.main' : 'divider',
                        borderRadius: 1,
                        p: 0.25,
                      }}
                    >
                      <Box
                        component="img"
                        src={getImageUrl(img.url)}
                        alt={img.name}
                        sx={{ width: 60, height: 60, objectFit: 'contain', borderRadius: 0.75, bgcolor: '#f8f8f8' }}
                      />
                      {idx === 0 && (
                        <Box
                          sx={{
                            position: 'absolute', top: -6, right: -6,
                            bgcolor: 'primary.main', color: '#fff',
                            borderRadius: '50%', width: 18, height: 18,
                            fontSize: 10, display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          P
                        </Box>
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Additional Image URLs</Typography>
            <Box sx={gridTwoCol}>
              <TextField size="small" fullWidth label="Image URL 1" value={form.prodImageUrl1} onChange={e => form.setProdImageUrl1(e.target.value)} placeholder="URL or storage key" />
              <TextField size="small" fullWidth label="Image URL 2" value={form.prodImageUrl2} onChange={e => form.setProdImageUrl2(e.target.value)} placeholder="URL or storage key" />
            </Box>
            <Box sx={gridTwoCol}>
              <TextField size="small" fullWidth label="Image URL 3" value={form.prodImageUrl3} onChange={e => form.setProdImageUrl3(e.target.value)} placeholder="URL or storage key" />
              <TextField size="small" fullWidth label="Image URL 4" value={form.prodImageUrl4} onChange={e => form.setProdImageUrl4(e.target.value)} placeholder="URL or storage key" />
            </Box>
            <Box sx={gridTwoCol}>
              <TextField size="small" fullWidth label="Image URL 5" value={form.prodImageUrl5} onChange={e => form.setProdImageUrl5(e.target.value)} placeholder="URL or storage key" />
              <Box />
            </Box>
          </Box>

          {/* ---- SEO / Meta ---- */}
          <Typography sx={sectionTitleSx}>SEO / Meta</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              size="small"
              fullWidth
              label="Meta Title"
              value={form.prodMetaTitle}
              onChange={e => form.setProdMetaTitle(e.target.value)}
              placeholder="Meta title"
            />
            <TextField
              size="small"
              fullWidth
              multiline
              rows={2}
              label="Meta Description"
              value={form.prodMetaDescription}
              onChange={e => form.setProdMetaDescription(e.target.value)}
              placeholder="Meta description"
            />
          </Box>

          {/* ---- Device Compatibility ---- */}
          {form.prodType === 'accessory' && (
            <>
              <Typography sx={sectionTitleSx}>Device Compatibility</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Universal Device Types */}
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                    Universal Device Types
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {deviceTypes.map((dt: any) => {
                      const dtName = typeof dt === 'string' ? dt : dt.name || dt.value || ''
                      return (
                        <FormControlLabel
                          key={dtName}
                          control={
                            <Checkbox
                              size="small"
                              checked={form.compUniversalDeviceTypes.includes(dtName)}
                              onChange={() => {
                                form.setCompUniversalDeviceTypes(prev =>
                                  prev.includes(dtName) ? prev.filter(x => x !== dtName) : [...prev, dtName]
                                )
                              }}
                            />
                          }
                          label={dtName}
                          sx={{ '& .MuiFormControlLabel-label': { fontSize: 14 } }}
                        />
                      )
                    })}
                  </Box>
                </Box>

                {/* Specific Device Selection */}
                <Box>
                  <Box sx={{ position: 'relative' }}>
                    <TextField
                      size="small"
                      fullWidth
                      label="Specific Device Compatibility"
                      value={form.deviceSearch}
                      onChange={e => { form.setDeviceSearch(e.target.value); form.setShowDeviceDropdown(true) }}
                      onFocus={() => form.setShowDeviceDropdown(true)}
                      placeholder="Search devices..."
                    />
                    {form.showDeviceDropdown && filteredDevices.length > 0 && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          zIndex: 1300,
                          bgcolor: 'background.paper',
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          maxHeight: 200,
                          overflowY: 'auto',
                          boxShadow: 3,
                        }}
                      >
                        {filteredDevices.slice(0, 50).map((device: any) => {
                          const isSelected = form.selectedDeviceIds.includes(device.id)
                          return (
                            <Box
                              key={device.id}
                              onClick={() => form.toggleDeviceSelection(device.id)}
                              sx={{
                                px: 1.5,
                                py: 0.75,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                bgcolor: isSelected ? 'action.hover' : 'transparent',
                                '&:hover': { bgcolor: 'action.hover' },
                                fontSize: 14,
                              }}
                            >
                              {isSelected && <CheckIcon sx={{ fontSize: 16, color: 'primary.main' }} />}
                              <span>{device.brand} {device.name} {device.model ? `(${device.model})` : ''}</span>
                            </Box>
                          )
                        })}
                      </Box>
                    )}
                  </Box>

                  {/* Selected devices display */}
                  {form.selectedDeviceIds.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
                      {form.selectedDeviceIds.map(id => {
                        const device = devices.find((d: any) => d.id === id)
                        const displayName = device
                          ? `${device.brand || ''} ${device.name || ''} ${device.model ? `(${device.model})` : ''}`.trim()
                          : id
                        return (
                          <Chip
                            key={id}
                            label={displayName}
                            size="small"
                            color="primary"
                            onDelete={() => form.toggleDeviceSelection(id)}
                            sx={{ height: 24, fontSize: 12 }}
                          />
                        )
                      })}
                    </Box>
                  )}
                </Box>
              </Box>

              {/* ---- Category-Specific Compatibility (admin only — CIXCI internal auto-mapping) ---- */}
              {!isVendor && renderCategorySpecificCompatibility()}
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ borderTop: '1px solid', borderColor: 'divider', px: 3, py: 1.5 }}>
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
