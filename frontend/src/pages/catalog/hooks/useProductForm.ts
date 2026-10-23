import { useState, useCallback } from 'react'
import { getImageUrl } from '../../../lib/formatters'

// Re-export for convenience: parseWirelessCharging is imported from DevicesPage
// in the original. We inline a simple version here to avoid the cross-page import.
export function parseWirelessCharging(val: string): string[] {
  if (!val) return []
  return val.split('+').map(s => s.trim()).filter(Boolean)
}

export function useProductForm() {
  const [prodName, setProdName] = useState('')
  const [prodStatus, setProdStatus] = useState('')
  const [prodSku, setProdSku] = useState('')
  const [prodBrand, setProdBrand] = useState('')
  const [prodType, setProdType] = useState('')
  const [prodCategory, setProdCategory] = useState('')
  const [prodDescription, setProdDescription] = useState('')
  const [prodPrice, setProdPrice] = useState('')
  const [prodCurrency, setProdCurrency] = useState('USD')
  const [prodUpc, setProdUpc] = useState('')
  const [prodLaunchDate, setProdLaunchDate] = useState('')
  const [prodReleaseDate, setProdReleaseDate] = useState('')
  const [prodEolDate, setProdEolDate] = useState('')
  const [prodColor, setProdColor] = useState('')
  const [prodSystemColor, setProdSystemColor] = useState('')
  const [prodMsrp, setProdMsrp] = useState('')
  const [prodMapPrice, setProdMapPrice] = useState('')
  const [prodSalePrice, setProdSalePrice] = useState('')
  const [prodRecommendedAccessory, setProdRecommendedAccessory] = useState(false)
  const [prodInventoryLevel, setProdInventoryLevel] = useState('')
  const [prodInventoryThreshold, setProdInventoryThreshold] = useState('')
  const [prodLength, setProdLength] = useState('')
  const [prodWidth, setProdWidth] = useState('')
  const [prodHeight, setProdHeight] = useState('')
  const [prodWeight, setProdWeight] = useState('')
  const [prodWarranty, setProdWarranty] = useState('')
  const [prodShortDescription, setProdShortDescription] = useState('')
  const [prodPromoInformation, setProdPromoInformation] = useState('')
  const [prodImageUrl1, setProdImageUrl1] = useState('')
  const [prodImageUrl2, setProdImageUrl2] = useState('')
  const [prodImageUrl3, setProdImageUrl3] = useState('')
  const [prodImageUrl4, setProdImageUrl4] = useState('')
  const [prodImageUrl5, setProdImageUrl5] = useState('')
  const [prodMetaTitle, setProdMetaTitle] = useState('')
  const [prodMetaDescription, setProdMetaDescription] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  // Image Upload State
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')
  const [prodPrimaryImageUrl, setProdPrimaryImageUrl] = useState('')
  const [uploadedZipImages, setUploadedZipImages] = useState<{ name: string; url: string; id: string }[]>([])
  const [uploadedPrimaryAssetId, setUploadedPrimaryAssetId] = useState<string | null>(null)

  // Device Compatibility State
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([])
  const [deviceSearch, setDeviceSearch] = useState('')
  const [showDeviceDropdown, setShowDeviceDropdown] = useState(false)

  // Category-specific compatibility fields
  const [compBluetooth, setCompBluetooth] = useState('')
  const [compHeadphoneJack, setCompHeadphoneJack] = useState('')
  const [compChargingInterface, setCompChargingInterface] = useState('')
  const [compWirelessCharging, setCompWirelessCharging] = useState<string[]>([])
  const [compStorageExpansion, setCompStorageExpansion] = useState('')
  const [compMemoryCapacity, setCompMemoryCapacity] = useState('')
  const [compWatchCaseSize, setCompWatchCaseSize] = useState('')
  const [compUniversalDeviceTypes, setCompUniversalDeviceTypes] = useState<string[]>([])

  const resetForm = useCallback(() => {
    setProdName(''); setProdSku(''); setProdBrand(''); setProdType(''); setProdCategory('')
    setProdDescription(''); setProdPrice(''); setProdCurrency('USD'); setProdUpc(''); setProdStatus('')
    setProdLaunchDate(''); setProdReleaseDate(''); setProdEolDate(''); setProdColor(''); setProdSystemColor('')
    setProdMsrp(''); setProdMapPrice(''); setProdSalePrice(''); setProdRecommendedAccessory(false)
    setProdInventoryLevel(''); setProdInventoryThreshold(''); setProdLength(''); setProdWidth('')
    setProdHeight(''); setProdWeight(''); setProdWarranty(''); setProdShortDescription('')
    setProdPromoInformation(''); setProdImageUrl1(''); setProdImageUrl2(''); setProdImageUrl3('')
    setProdImageUrl4(''); setProdImageUrl5(''); setProdMetaTitle(''); setProdMetaDescription('')
    setSelectedImageFile(null); setImagePreviewUrl(''); setProdPrimaryImageUrl('')
    setUploadedZipImages([]); setUploadedPrimaryAssetId(null); setSelectedDeviceIds([])
    setCompBluetooth(''); setCompHeadphoneJack(''); setCompChargingInterface('')
    setCompWirelessCharging([]); setCompStorageExpansion(''); setCompMemoryCapacity('')
    setCompWatchCaseSize(''); setCompUniversalDeviceTypes([]); setFormError(null)
    setDeviceSearch(''); setShowDeviceDropdown(false)
  }, [])

  const populateFrom = useCallback((p: any, activeCompatibilities?: any[]) => {
    resetForm()
    const cleanPrice = (val: any) => {
      if (val === null || val === undefined || val === '') return ''
      const parsed = parseFloat(val)
      return isNaN(parsed) ? '' : parsed.toFixed(2)
    }
    setProdName(p.name || ''); setProdSku(p.sku || ''); setProdBrand(p.brand || '')
    setProdStatus(p.status || 'active'); setProdType(p.product_type || 'accessory')
    setProdCategory(p.product_category || ''); setProdDescription(p.description || '')
    setProdPrice(cleanPrice(p.vendor_wholesale_price_amount))
    setProdCurrency(p.vendor_wholesale_price_currency || 'USD')
    setImagePreviewUrl(p.primary_image_url ? getImageUrl(p.primary_image_url) : '')
    setProdPrimaryImageUrl(p.primary_image_url ? getImageUrl(p.primary_image_url) : '')
    setProdUpc(p.upc || ''); setProdLaunchDate(p.launch_date || ''); setProdReleaseDate(p.release_date || '')
    setProdEolDate(p.eol_date || ''); setProdColor(p.color || ''); setProdSystemColor(p.system_color || '')
    setProdMsrp(cleanPrice(p.msrp)); setProdMapPrice(cleanPrice(p.map_price)); setProdSalePrice(cleanPrice(p.sale_price))
    setProdRecommendedAccessory(!!p.recommended_accessory)
    setProdInventoryLevel(p.inventory_level != null ? String(p.inventory_level) : '')
    setProdInventoryThreshold(p.inventory_threshold != null ? String(p.inventory_threshold) : '')
    setProdLength(p.length != null ? String(p.length) : '')
    setProdWidth(p.width != null ? String(p.width) : '')
    setProdHeight(p.height != null ? String(p.height) : '')
    setProdWeight(p.weight != null ? String(p.weight) : '')
    setProdWarranty(p.warranty || ''); setProdShortDescription(p.short_description || '')
    setProdPromoInformation(p.promo_information || '')

    const primaryUrl = p.primary_image_url || ''
    const cleanPrimary = primaryUrl.replace(/^(https?:\/\/[^\/]+)/, '')
    const additionalImages = (p.media_references || []).map((ref: any) =>
      typeof ref === 'string' ? ref : (ref?.url || ref?.storage_key || '')
    ).filter((url: string) => {
      if (!url) return false
      const cleanRef = url.replace(/^(https?:\/\/[^\/]+)/, '')
      return cleanRef !== cleanPrimary
    })
    setProdImageUrl1(additionalImages[0] || ''); setProdImageUrl2(additionalImages[1] || '')
    setProdImageUrl3(additionalImages[2] || ''); setProdImageUrl4(additionalImages[3] || '')
    setProdImageUrl5(additionalImages[4] || '')
    setProdMetaTitle(p.meta_title || ''); setProdMetaDescription(p.meta_description || '')

    setCompBluetooth(p.bluetooth_compatibility || '')
    setCompHeadphoneJack(p.headphone_jack_compatibility || '')
    setCompChargingInterface(p.compatible_charging_interface || '')
    setCompWirelessCharging(parseWirelessCharging(p.wireless_charging_compatibility || ''))
    setCompStorageExpansion(p.storage_expansion_compatibility || '')
    setCompMemoryCapacity(p.memory_capacity || '')
    setCompWatchCaseSize(p.compatible_watch_case_size || '')
    setCompUniversalDeviceTypes(p.compatible_device_types || [])

    const compatList = activeCompatibilities || []
    setSelectedDeviceIds(compatList.map((c: any) => c.device_reference))
  }, [resetForm])

  const isAddDirty = useCallback(() => {
    return (
      prodName !== '' || prodStatus !== '' || prodSku !== '' || prodBrand !== '' || prodType !== '' ||
      prodCategory !== '' || prodDescription !== '' || prodPrice !== '' || prodCurrency !== 'USD' ||
      prodUpc !== '' || prodLaunchDate !== '' || prodReleaseDate !== '' || prodEolDate !== '' ||
      prodColor !== '' || prodSystemColor !== '' || prodMsrp !== '' || prodMapPrice !== '' ||
      prodSalePrice !== '' || prodRecommendedAccessory !== false || prodInventoryLevel !== '' ||
      prodInventoryThreshold !== '' || prodLength !== '' || prodWidth !== '' || prodHeight !== '' ||
      prodWeight !== '' || prodWarranty !== '' || prodShortDescription !== '' || prodPromoInformation !== '' ||
      prodImageUrl1 !== '' || prodImageUrl2 !== '' || prodImageUrl3 !== '' || prodImageUrl4 !== '' ||
      prodImageUrl5 !== '' || prodMetaTitle !== '' || prodMetaDescription !== '' ||
      selectedDeviceIds.length > 0 || selectedImageFile !== null || prodPrimaryImageUrl !== '' ||
      uploadedZipImages.length > 0 || compBluetooth !== '' || compHeadphoneJack !== '' ||
      compChargingInterface !== '' || compWirelessCharging.length > 0 || compStorageExpansion !== '' ||
      compMemoryCapacity !== '' || compWatchCaseSize !== '' || compUniversalDeviceTypes.length > 0
    )
  }, [
    prodName, prodStatus, prodSku, prodBrand, prodType, prodCategory, prodDescription, prodPrice,
    prodCurrency, prodUpc, prodLaunchDate, prodReleaseDate, prodEolDate, prodColor, prodSystemColor,
    prodMsrp, prodMapPrice, prodSalePrice, prodRecommendedAccessory, prodInventoryLevel,
    prodInventoryThreshold, prodLength, prodWidth, prodHeight, prodWeight, prodWarranty,
    prodShortDescription, prodPromoInformation, prodImageUrl1, prodImageUrl2, prodImageUrl3,
    prodImageUrl4, prodImageUrl5, prodMetaTitle, prodMetaDescription, selectedDeviceIds,
    selectedImageFile, prodPrimaryImageUrl, uploadedZipImages, compBluetooth, compHeadphoneJack,
    compChargingInterface, compWirelessCharging, compStorageExpansion, compMemoryCapacity,
    compWatchCaseSize, compUniversalDeviceTypes,
  ])

  const isEditDirty = useCallback((editingProduct: any, activeCompatibilities?: any[]) => {
    if (!editingProduct) return false
    const activeCompatIds = (activeCompatibilities || []).map((c: any) => c.device_reference)
    const compatibilitiesMatch = (
      Array.isArray(selectedDeviceIds) &&
      selectedDeviceIds.length === activeCompatIds.length &&
      selectedDeviceIds.every((x: string) => activeCompatIds.includes(x))
    )
    const origUdt = editingProduct.compatible_device_types || []
    const udtMatch = (
      Array.isArray(compUniversalDeviceTypes) &&
      compUniversalDeviceTypes.length === origUdt.length &&
      compUniversalDeviceTypes.every((x: string) => origUdt.includes(x))
    )
    const mediaList = editingProduct.media_references || []
    return (
      prodName !== (editingProduct.name || '') ||
      prodSku !== (editingProduct.sku || '') ||
      prodBrand !== (editingProduct.brand || '') ||
      prodStatus !== (editingProduct.status || '') ||
      prodType !== (editingProduct.product_type || 'accessory') ||
      prodCategory !== (editingProduct.product_category || '') ||
      prodDescription !== (editingProduct.description || '') ||
      prodPrice !== (editingProduct.vendor_wholesale_price_amount != null ? String(editingProduct.vendor_wholesale_price_amount) : '') ||
      prodCurrency !== (editingProduct.vendor_wholesale_price_currency || 'USD') ||
      prodUpc !== (editingProduct.upc || '') ||
      prodLaunchDate !== (editingProduct.launch_date || '') ||
      prodReleaseDate !== (editingProduct.release_date || '') ||
      prodEolDate !== (editingProduct.eol_date || '') ||
      prodColor !== (editingProduct.color || '') ||
      prodSystemColor !== (editingProduct.system_color || '') ||
      prodMsrp !== (editingProduct.msrp != null ? String(editingProduct.msrp) : '') ||
      prodMapPrice !== (editingProduct.map_price != null ? String(editingProduct.map_price) : '') ||
      prodSalePrice !== (editingProduct.sale_price != null ? String(editingProduct.sale_price) : '') ||
      prodRecommendedAccessory !== (!!editingProduct.recommended_accessory) ||
      prodInventoryLevel !== (editingProduct.inventory_level != null ? String(editingProduct.inventory_level) : '') ||
      prodInventoryThreshold !== (editingProduct.inventory_threshold != null ? String(editingProduct.inventory_threshold) : '') ||
      prodLength !== (editingProduct.length != null ? String(editingProduct.length) : '') ||
      prodWidth !== (editingProduct.width != null ? String(editingProduct.width) : '') ||
      prodHeight !== (editingProduct.height != null ? String(editingProduct.height) : '') ||
      prodWeight !== (editingProduct.weight != null ? String(editingProduct.weight) : '') ||
      prodWarranty !== (editingProduct.warranty || '') ||
      prodShortDescription !== (editingProduct.short_description || '') ||
      prodPromoInformation !== (editingProduct.promo_information || '') ||
      prodImageUrl1 !== (mediaList[0] || '') ||
      prodImageUrl2 !== (mediaList[1] || '') ||
      prodImageUrl3 !== (mediaList[2] || '') ||
      prodImageUrl4 !== (mediaList[3] || '') ||
      prodImageUrl5 !== (mediaList[4] || '') ||
      prodMetaTitle !== (editingProduct.meta_title || '') ||
      prodMetaDescription !== (editingProduct.meta_description || '') ||
      !compatibilitiesMatch || !udtMatch ||
      selectedImageFile !== null ||
      prodPrimaryImageUrl !== (editingProduct.primary_image_url ? getImageUrl(editingProduct.primary_image_url) : '') ||
      uploadedZipImages.length > 0 ||
      compBluetooth !== (editingProduct.bluetooth_compatibility || '') ||
      compHeadphoneJack !== (editingProduct.headphone_jack_compatibility || '') ||
      compChargingInterface !== (editingProduct.compatible_charging_interface || '') ||
      parseWirelessCharging(compWirelessCharging.join('+')).sort().join('+') !== parseWirelessCharging(editingProduct.wireless_charging_compatibility || '').sort().join('+') ||
      compStorageExpansion !== (editingProduct.storage_expansion_compatibility || '') ||
      compMemoryCapacity !== (editingProduct.memory_capacity || '') ||
      compWatchCaseSize !== (editingProduct.compatible_watch_case_size || '')
    )
  }, [
    prodName, prodSku, prodBrand, prodStatus, prodType, prodCategory, prodDescription, prodPrice,
    prodCurrency, prodUpc, prodLaunchDate, prodReleaseDate, prodEolDate, prodColor, prodSystemColor,
    prodMsrp, prodMapPrice, prodSalePrice, prodRecommendedAccessory, prodInventoryLevel,
    prodInventoryThreshold, prodLength, prodWidth, prodHeight, prodWeight, prodWarranty,
    prodShortDescription, prodPromoInformation, prodImageUrl1, prodImageUrl2, prodImageUrl3,
    prodImageUrl4, prodImageUrl5, prodMetaTitle, prodMetaDescription, selectedDeviceIds,
    selectedImageFile, prodPrimaryImageUrl, uploadedZipImages, compBluetooth, compHeadphoneJack,
    compChargingInterface, compWirelessCharging, compStorageExpansion, compMemoryCapacity,
    compWatchCaseSize, compUniversalDeviceTypes,
  ])

  const handleWirelessChargingChange = useCallback((val: string) => {
    if (val === 'Not Compatible') {
      setCompWirelessCharging(['Not Compatible'])
    } else {
      setCompWirelessCharging(prev => {
        let next = prev.filter(x => x !== 'Not Compatible')
        if (next.includes(val)) {
          next = next.filter(x => x !== val)
        } else {
          next = [...next, val]
        }
        return next
      })
    }
  }, [])

  const toggleDeviceSelection = useCallback((id: string) => {
    setSelectedDeviceIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }, [])

  return {
    // Basic fields
    prodName, setProdName, prodStatus, setProdStatus, prodSku, setProdSku,
    prodBrand, setProdBrand, prodType, setProdType, prodCategory, setProdCategory,
    prodDescription, setProdDescription, prodPrice, setProdPrice, prodCurrency, setProdCurrency,
    prodUpc, setProdUpc, prodLaunchDate, setProdLaunchDate, prodReleaseDate, setProdReleaseDate,
    prodEolDate, setProdEolDate, prodColor, setProdColor, prodSystemColor, setProdSystemColor,
    prodMsrp, setProdMsrp, prodMapPrice, setProdMapPrice, prodSalePrice, setProdSalePrice,
    prodRecommendedAccessory, setProdRecommendedAccessory,
    prodInventoryLevel, setProdInventoryLevel, prodInventoryThreshold, setProdInventoryThreshold,
    prodLength, setProdLength, prodWidth, setProdWidth, prodHeight, setProdHeight,
    prodWeight, setProdWeight, prodWarranty, setProdWarranty,
    prodShortDescription, setProdShortDescription, prodPromoInformation, setProdPromoInformation,
    prodImageUrl1, setProdImageUrl1, prodImageUrl2, setProdImageUrl2,
    prodImageUrl3, setProdImageUrl3, prodImageUrl4, setProdImageUrl4,
    prodImageUrl5, setProdImageUrl5, prodMetaTitle, setProdMetaTitle,
    prodMetaDescription, setProdMetaDescription, formError, setFormError,
    // Image state
    selectedImageFile, setSelectedImageFile, imagePreviewUrl, setImagePreviewUrl,
    prodPrimaryImageUrl, setProdPrimaryImageUrl, uploadedZipImages, setUploadedZipImages,
    uploadedPrimaryAssetId, setUploadedPrimaryAssetId,
    // Device compat state
    selectedDeviceIds, setSelectedDeviceIds, deviceSearch, setDeviceSearch,
    showDeviceDropdown, setShowDeviceDropdown,
    // Category compat fields
    compBluetooth, setCompBluetooth, compHeadphoneJack, setCompHeadphoneJack,
    compChargingInterface, setCompChargingInterface, compWirelessCharging, setCompWirelessCharging,
    compStorageExpansion, setCompStorageExpansion, compMemoryCapacity, setCompMemoryCapacity,
    compWatchCaseSize, setCompWatchCaseSize, compUniversalDeviceTypes, setCompUniversalDeviceTypes,
    // Actions
    resetForm, populateFrom, isAddDirty, isEditDirty,
    handleWirelessChargingChange, toggleDeviceSelection,
  }
}
