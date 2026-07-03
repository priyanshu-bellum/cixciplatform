import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ShoppingBag, RefreshCw, Plus, Search, Check, Download, AlertCircle, FileText, X, Upload, Edit, Trash2, Settings } from 'lucide-react'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import api from '../lib/apiClient'
import { useAuthStore } from '../stores/authStore'

const STATUS_BADGE: Record<string, string> = {
  active: 'badge-green', draft: 'badge-muted', archived: 'badge-muted',
  pending_review: 'badge-amber', rejected: 'badge-red',
  out_of_stock: 'badge-amber', eol: 'badge-muted', inactive: 'badge-muted',
}
const SELL_BADGE: Record<string, string> = {
  selling: 'badge-green', stop_selling: 'badge-red',
  not_listed: 'badge-muted', under_review: 'badge-amber',
  for_sale: 'badge-green',
}

function CellInput({
  value,
  onSave,
  hasError,
  headerName = ''
}: {
  value: string
  onSave: (v: string) => void
  hasError: boolean
  headerName?: string
}) {
  const [localVal, setLocalVal] = useState(value)
  useEffect(() => {
    setLocalVal(value)
  }, [value])

  const normHeader = headerName.toLowerCase().replace(/[^a-z0-9]/g, '')
  const isScrollable = ['productdescription', 'description', 'metatitle', 'metadescription', 'shortdescription', 'promoinformation'].includes(normHeader)
  const isProductName = ['productname', 'accessoryname', 'name'].includes(normHeader)

  if (isScrollable) {
    return (
      <textarea
        style={{
          width: '100%',
          minWidth: 180,
          minHeight: 60,
          height: 80,
          background: hasError ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
          border: hasError ? '1px solid var(--red)' : '1px solid var(--border)',
          color: hasError ? 'var(--red)' : 'var(--text-secondary)',
          fontSize: 12,
          outline: 'none',
          padding: '4px 6px',
          borderRadius: 4,
          transition: 'all 0.15s ease',
          resize: 'vertical',
          overflowY: 'auto',
          fontFamily: 'inherit',
          lineHeight: '1.3',
        }}
        value={localVal}
        onChange={e => setLocalVal(e.target.value)}
        onBlur={() => {
          if (localVal !== value) {
            onSave(localVal)
          }
        }}
      />
    )
  }

  return (
    <input
      style={{
        width: '100%',
        minWidth: isProductName ? 320 : 90,
        background: hasError ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
        border: hasError ? '1px solid var(--red)' : 'none',
        color: hasError ? 'var(--red)' : 'var(--text-secondary)',
        fontSize: 12,
        outline: 'none',
        padding: '4px 6px',
        borderRadius: 4,
        transition: 'all 0.15s ease',
      }}
      value={localVal}
      onChange={e => setLocalVal(e.target.value)}
      onBlur={() => {
        if (localVal !== value) {
          onSave(localVal)
        }
      }}
    />
  )
}

function MultiSelectColor({
  selected,
  options,
  onChange,
  label
}: {
  selected: string
  options: string[]
  onChange: (val: string) => void
  label: string
}) {
  const [open, setOpen] = useState(false)
  const selectedList = useMemo(() => {
    return selected.split(',').map(s => s.trim()).filter(Boolean)
  }, [selected])

  const toggleOption = (opt: string) => {
    let newList
    if (selectedList.includes(opt)) {
      newList = selectedList.filter(x => x !== opt)
    } else {
      newList = [...selectedList, opt]
    }
    onChange(newList.join(', '))
  }

  return (
    <div className="form-group" style={{ position: 'relative' }}>
      <label className="label">{label}</label>
      <div
        onClick={() => setOpen(!open)}
        style={{
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '8px 12px',
          background: 'var(--bg-main)',
          cursor: 'pointer',
          minHeight: 40,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          alignItems: 'center',
          marginTop: 4,
        }}
      >
        {selectedList.length === 0 ? (
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Select colors...</span>
        ) : (
          selectedList.map(color => (
            <span
              key={color}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                padding: '2px 8px',
                borderRadius: 4,
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
              onClick={(e) => {
                e.stopPropagation()
                toggleOption(color)
              }}
            >
              {color}
              <X size={12} style={{ color: 'var(--red)', cursor: 'pointer' }} />
            </span>
          ))
        )}
      </div>

      {open && (
        <>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9 }} onClick={() => setOpen(false)} />
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              right: 0,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              boxShadow: '0 -4px 12px rgba(0,0,0,0.15)',
              zIndex: 10,
              marginBottom: 4,
              padding: 6,
              maxHeight: 200,
              overflowY: 'auto',
            }}
          >
            {options.map(opt => {
              const isSelected = selectedList.includes(opt)
              return (
                <div
                  key={opt}
                  onClick={() => toggleOption(opt)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(var(--accent-rgb), 0.1)' : 'transparent',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: 13, color: isSelected ? 'var(--accent)' : 'var(--text-secondary)' }}>{opt}</span>
                  {isSelected && <Check size={14} style={{ color: 'var(--accent)' }} />}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

const formatCurrency = (amount: number | string | null | undefined, currency: string = 'USD') => {
  if (amount === null || amount === undefined || amount === '') return '—';
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericAmount)) return '—';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(numericAmount);
  } catch (e) {
    return `${currency} ${numericAmount.toFixed(2)}`;
  }
};

export default function CatalogPage() {
  const { user } = useAuthStore()
  const isCixciAdmin = user?.is_cixci_admin || user?.company_type === 'cixci_internal'
  const isVendor = user?.company_type === 'vendor'
  const isBuyer = user?.company_type === 'buyer'

  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'products' | 'projection' | 'export_jobs'>('products')

  // Selection state for Buyer
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showManageModal, setShowManageModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [showDropdownManagerModal, setShowDropdownManagerModal] = useState(false)
  const [manageField, setManageField] = useState<'brand' | 'product_category' | 'system_color'>('brand')
  const [newDropdownValue, setNewDropdownValue] = useState('')
  const [dropdownError, setDropdownError] = useState<string | null>(null)

  // Category Compatibility Config States
  const [editingCategoryConfig, setEditingCategoryConfig] = useState<any | null>(null)
  const [categoryConfigMode, setCategoryConfigMode] = useState('feature_based')
  const [categoryConfigStatus, setCategoryConfigStatus] = useState('setup_required')
  const [categoryConfigMatchLogic, setCategoryConfigMatchLogic] = useState('OR')
  const [categoryConfigEligibleTypes, setCategoryConfigEligibleTypes] = useState<string[]>([])
  const [categoryConfigAccessoryFields, setCategoryConfigAccessoryFields] = useState<string[]>([])
  const [categoryConfigRules, setCategoryConfigRules] = useState<Record<string, { mode: string }>>({})

  const { data: deviceTypesData } = useQuery({
    queryKey: ['deviceTypes'],
    queryFn: () => api.get('/devices/types/', { params: { limit: 100 } }).then(r => r.data),
  })
  const deviceTypes = useMemo(() => {
    return Array.isArray(deviceTypesData) ? deviceTypesData : (deviceTypesData?.results ?? [])
  }, [deviceTypesData])

  useEffect(() => {
    if (editingCategoryConfig) {
      setCategoryConfigMode(editingCategoryConfig.compatibility_mode || 'feature_based')
      setCategoryConfigStatus(editingCategoryConfig.status || 'setup_required')
      setCategoryConfigMatchLogic(editingCategoryConfig.match_logic || 'OR')
      setCategoryConfigEligibleTypes(editingCategoryConfig.eligible_device_types || [])
      setCategoryConfigAccessoryFields(editingCategoryConfig.accessory_fields || [])
      setCategoryConfigRules(editingCategoryConfig.compatibility_rules || {})
    }
  }, [editingCategoryConfig])

  // Add/Edit Product Form State
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

  // Image Upload Form State
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('')
  const [prodPrimaryImageUrl, setProdPrimaryImageUrl] = useState<string>('')
  const [uploadedZipImages, setUploadedZipImages] = useState<{ name: string; url: string }[]>([])

  // Device Compatibility Selection State
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([])
  const [deviceSearch, setDeviceSearch] = useState('')
  const [showDeviceDropdown, setShowDeviceDropdown] = useState(false)

  // Category-specific compatibility fields state
  const [compBluetooth, setCompBluetooth] = useState('')
  const [compHeadphoneJack, setCompHeadphoneJack] = useState('')
  const [compChargingInterface, setCompChargingInterface] = useState('')
  const [compWirelessCharging, setCompWirelessCharging] = useState<string[]>([])
  const [compStorageExpansion, setCompStorageExpansion] = useState('')
  const [compMemoryCapacity, setCompMemoryCapacity] = useState('')
  const [compWatchCaseSize, setCompWatchCaseSize] = useState('')

  // Manage / Edit product targets
  const [selectedManageProduct, setSelectedManageProduct] = useState<any>(null)
  const [editingProduct, setEditingProduct] = useState<any>(null)

  // Compatibility Management States
  const [manageTab, setManageTab] = useState<'details' | 'compatibility' | 'bulk' | 'audit'>('details')
  const [showExcludeModal, setShowExcludeModal] = useState(false)
  const [excludeDevice, setExcludeDevice] = useState<any>(null)
  const [excludeReason, setExcludeReason] = useState('physical_mismatch')
  const [excludeNotes, setExcludeNotes] = useState('')
  const [quickAddDeviceId, setQuickAddDeviceId] = useState('')
  const [bulkUpdateType, setBulkUpdateType] = useState<'add' | 'replace' | 'remove'>('add')
  const [bulkSelectedDevices, setBulkSelectedDevices] = useState<string[]>([])
  const [auditHistory, setAuditHistory] = useState<any[]>([])
  const [isLoadingAudit, setIsLoadingAudit] = useState(false)
  const [isRecalculating, setIsRecalculating] = useState(false)

  // Bulk Upload state
  const [bulkFile, setBulkFile] = useState<File | null>(null)
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [bulkResult, setBulkResult] = useState<any | null>(null)
  const [uploadingBulk, setUploadingBulk] = useState(false)
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvPreviewRows, setCsvPreviewRows] = useState<string[][]>([])
  const [updateMode, setUpdateMode] = useState<string>('create_only')

  const handleWirelessChargingChange = (val: string) => {
    if (val === 'Not Compatible') {
      setCompWirelessCharging(['Not Compatible'])
    } else {
      let next = compWirelessCharging.filter(x => x !== 'Not Compatible')
      if (next.includes(val)) {
        next = next.filter(x => x !== val)
      } else {
        next = [...next, val]
      }
      setCompWirelessCharging(next)
    }
  }

  const renderCategorySpecificCompatibility = () => {
    if (!prodCategory) return null;
    
    const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 };
    const selectStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: 13 };
    const checkboxContainerStyle: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 6 };
    const checkboxLabelStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' };

    if (prodCategory === 'Headphones') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Headphone Jack Compatibility *</label>
            <select style={selectStyle} value={compHeadphoneJack} onChange={e => setCompHeadphoneJack(e.target.value)}>
              <option value="">Select...</option>
              <option value="Lightning">Lightning</option>
              <option value="Type-C">Type-C</option>
              <option value="Not Compatible">Not Compatible</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Bluetooth Compatibility *</label>
            <select style={selectStyle} value={compBluetooth} onChange={e => setCompBluetooth(e.target.value)}>
              <option value="">Select...</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
        </div>
      );
    }

    if (prodCategory === 'Speakers') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Compatible Charging Interface *</label>
            <select style={selectStyle} value={compChargingInterface} onChange={e => setCompChargingInterface(e.target.value)}>
              <option value="">Select...</option>
              <option value="Lightning">Lightning</option>
              <option value="Type-C">Type-C</option>
              <option value="Not Compatible">Not Compatible</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Bluetooth Compatibility *</label>
            <select style={selectStyle} value={compBluetooth} onChange={e => setCompBluetooth(e.target.value)}>
              <option value="">Select...</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
        </div>
      );
    }

    if (prodCategory === 'Chargers and Cables') {
      const isNotCompatible = compWirelessCharging.includes('Not Compatible');
      const hasSpecific = compWirelessCharging.some(x => ['MagSafe', 'Qi', 'Qi2'].includes(x));
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Compatible Charging Interface *</label>
            <select style={selectStyle} value={compChargingInterface} onChange={e => setCompChargingInterface(e.target.value)}>
              <option value="">Select...</option>
              <option value="Lightning">Lightning</option>
              <option value="Type-C">Type-C</option>
              <option value="Not Compatible">Not Compatible</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Wireless Charging Compatibility *</label>
            <div style={checkboxContainerStyle}>
              {['MagSafe', 'Qi', 'Qi2', 'Not Compatible'].map(opt => {
                const checked = compWirelessCharging.includes(opt);
                const disabled = opt === 'Not Compatible' ? hasSpecific : isNotCompatible;
                return (
                  <label key={opt} style={{ ...checkboxLabelStyle, opacity: disabled ? 0.5 : 1 }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => handleWirelessChargingChange(opt)}
                    />
                    {opt}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    if (prodCategory === 'Memory') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Storage Expansion Compatibility *</label>
            <select style={selectStyle} value={compStorageExpansion} onChange={e => {
              const val = e.target.value;
              setCompStorageExpansion(val);
              if (val === 'Not Compatible') {
                setCompMemoryCapacity('Not Compatible');
              } else {
                setCompMemoryCapacity('');
              }
            }}>
              <option value="">Select...</option>
              <option value="microSDXC">microSDXC</option>
              <option value="microSDHC">microSDHC</option>
              <option value="Not Compatible">Not Compatible</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Memory Capacity *</label>
            <select
              style={selectStyle}
              value={compMemoryCapacity}
              disabled={compStorageExpansion === 'Not Compatible' || !compStorageExpansion}
              onChange={e => setCompMemoryCapacity(e.target.value)}
            >
              {compStorageExpansion === 'Not Compatible' ? (
                <option value="Not Compatible">Not Compatible</option>
              ) : (
                <>
                  <option value="">Select...</option>
                  {compStorageExpansion === 'microSDHC' && <option value="16GB">16GB</option>}
                  <option value="32GB">32GB</option>
                  <option value="64GB">64GB</option>
                  <option value="128GB">128GB</option>
                  <option value="256GB">256GB</option>
                  <option value="512GB">512GB</option>
                  <option value="1TB">1TB</option>
                  {compStorageExpansion === 'microSDHC' && <option value="1.5TB">1.5TB</option>}
                  {compStorageExpansion === 'microSDXC' && <option value="2TB">2TB</option>}
                </>
              )}
            </select>
          </div>
        </div>
      );
    }

    if (prodCategory === 'Wearable Tech') {
      const isNotCompatible = compWirelessCharging.includes('Not Compatible');
      const hasSpecific = compWirelessCharging.some(x => ['MagSafe', 'Qi', 'Qi2'].includes(x));
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Compatible Charging Interface *</label>
            <select style={selectStyle} value={compChargingInterface} onChange={e => setCompChargingInterface(e.target.value)}>
              <option value="">Select...</option>
              <option value="Lightning">Lightning</option>
              <option value="Type-C">Type-C</option>
              <option value="Not Compatible">Not Compatible</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Wireless Charging Compatibility *</label>
            <div style={checkboxContainerStyle}>
              {['MagSafe', 'Qi', 'Qi2', 'Not Compatible'].map(opt => {
                const checked = compWirelessCharging.includes(opt);
                const disabled = opt === 'Not Compatible' ? hasSpecific : isNotCompatible;
                return (
                  <label key={opt} style={{ ...checkboxLabelStyle, opacity: disabled ? 0.5 : 1 }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => handleWirelessChargingChange(opt)}
                    />
                    {opt}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    if (prodCategory === 'Watch Accessories') {
      const isNotCompatible = compWirelessCharging.includes('Not Compatible');
      const hasSpecific = compWirelessCharging.some(x => ['MagSafe', 'Qi', 'Qi2'].includes(x));
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Compatible Watch Case Size *</label>
            <select style={selectStyle} value={compWatchCaseSize} onChange={e => setCompWatchCaseSize(e.target.value)}>
              <option value="">Select...</option>
              <option value="40mm">40mm</option>
              <option value="41mm">41mm</option>
              <option value="42mm">42mm</option>
              <option value="44mm">44mm</option>
              <option value="45mm">45mm</option>
              <option value="46mm">46mm</option>
              <option value="49mm">49mm</option>
              <option value="Not Compatible">Not Compatible</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Wireless Charging Compatibility *</label>
            <div style={checkboxContainerStyle}>
              {['MagSafe', 'Qi', 'Qi2', 'Not Compatible'].map(opt => {
                const checked = compWirelessCharging.includes(opt);
                const disabled = opt === 'Not Compatible' ? hasSpecific : isNotCompatible;
                return (
                  <label key={opt} style={{ ...checkboxLabelStyle, opacity: disabled ? 0.5 : 1 }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => handleWirelessChargingChange(opt)}
                    />
                    {opt}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    return null;
  }

  const isAddFormDirty = () => {
    return (
      prodName !== '' ||
      prodStatus !== '' ||
      prodSku !== '' ||
      prodBrand !== '' ||
      prodType !== '' ||
      prodCategory !== '' ||
      prodDescription !== '' ||
      prodPrice !== '' ||
      prodCurrency !== 'USD' ||
      prodUpc !== '' ||
      prodLaunchDate !== '' ||
      prodReleaseDate !== '' ||
      prodEolDate !== '' ||
      prodColor !== '' ||
      prodSystemColor !== '' ||
      prodMsrp !== '' ||
      prodMapPrice !== '' ||
      prodSalePrice !== '' ||
      prodRecommendedAccessory !== false ||
      prodInventoryLevel !== '' ||
      prodInventoryThreshold !== '' ||
      prodLength !== '' ||
      prodWidth !== '' ||
      prodHeight !== '' ||
      prodWeight !== '' ||
      prodWarranty !== '' ||
      prodShortDescription !== '' ||
      prodPromoInformation !== '' ||
      prodImageUrl1 !== '' ||
      prodImageUrl2 !== '' ||
      prodImageUrl3 !== '' ||
      prodImageUrl4 !== '' ||
      prodImageUrl5 !== '' ||
      prodMetaTitle !== '' ||
      prodMetaDescription !== '' ||
      selectedDeviceIds.length > 0 ||
      selectedImageFile !== null ||
      prodPrimaryImageUrl !== '' ||
      uploadedZipImages.length > 0 ||
      compBluetooth !== '' ||
      compHeadphoneJack !== '' ||
      compChargingInterface !== '' ||
      compWirelessCharging.length > 0 ||
      compStorageExpansion !== '' ||
      compMemoryCapacity !== '' ||
      compWatchCaseSize !== ''
    )
  }

  const isEditFormDirty = () => {
    if (!editingProduct) return false
    const activeCompatIds = (activeCompatibilities || []).map((c: any) => c.device_reference)
    const compatibilitiesMatch = (
      Array.isArray(selectedDeviceIds) &&
      selectedDeviceIds.length === activeCompatIds.length &&
      selectedDeviceIds.every((x: string) => activeCompatIds.includes(x))
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
      prodPrice !== (editingProduct.vendor_wholesale_price_amount !== null && editingProduct.vendor_wholesale_price_amount !== undefined ? String(editingProduct.vendor_wholesale_price_amount) : '') ||
      prodCurrency !== (editingProduct.vendor_wholesale_price_currency || 'USD') ||
      prodUpc !== (editingProduct.upc || '') ||
      prodLaunchDate !== (editingProduct.launch_date || '') ||
      prodReleaseDate !== (editingProduct.release_date || '') ||
      prodEolDate !== (editingProduct.eol_date || '') ||
      prodColor !== (editingProduct.color || '') ||
      prodSystemColor !== (editingProduct.system_color || '') ||
      prodMsrp !== (editingProduct.msrp !== null && editingProduct.msrp !== undefined ? String(editingProduct.msrp) : '') ||
      prodMapPrice !== (editingProduct.map_price !== null && editingProduct.map_price !== undefined ? String(editingProduct.map_price) : '') ||
      prodSalePrice !== (editingProduct.sale_price !== null && editingProduct.sale_price !== undefined ? String(editingProduct.sale_price) : '') ||
      prodRecommendedAccessory !== (!!editingProduct.recommended_accessory) ||
      prodInventoryLevel !== (editingProduct.inventory_level !== null && editingProduct.inventory_level !== undefined ? String(editingProduct.inventory_level) : '') ||
      prodInventoryThreshold !== (editingProduct.inventory_threshold !== null && editingProduct.inventory_threshold !== undefined ? String(editingProduct.inventory_threshold) : '') ||
      prodLength !== (editingProduct.length !== null && editingProduct.weight !== undefined ? String(editingProduct.length) : '') ||
      prodWidth !== (editingProduct.width !== null && editingProduct.width !== undefined ? String(editingProduct.width) : '') ||
      prodHeight !== (editingProduct.height !== null && editingProduct.height !== undefined ? String(editingProduct.height) : '') ||
      prodWeight !== (editingProduct.weight !== null && editingProduct.weight !== undefined ? String(editingProduct.weight) : '') ||
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
      !compatibilitiesMatch ||
      selectedImageFile !== null ||
      prodPrimaryImageUrl !== (editingProduct.primary_image_url ? getImageUrl(editingProduct.primary_image_url) : '') ||
      uploadedZipImages.length > 0 ||
      compBluetooth !== (editingProduct.bluetooth_compatibility || '') ||
      compHeadphoneJack !== (editingProduct.headphone_jack_compatibility || '') ||
      compChargingInterface !== (editingProduct.compatible_charging_interface || '') ||
      compWirelessCharging.join('+') !== (editingProduct.wireless_charging_compatibility || '') ||
      compStorageExpansion !== (editingProduct.storage_expansion_compatibility || '') ||
      compMemoryCapacity !== (editingProduct.memory_capacity || '') ||
      compWatchCaseSize !== (editingProduct.compatible_watch_case_size || '')
    )
  }

  const isBulkFormDirty = () => {
    return bulkFile !== null || csvHeaders.length > 0 || bulkResult !== null
  }

  const handleCloseAddModal = () => {
    if (isAddFormDirty()) {
      if (!window.confirm('You have unsaved changes. Are you sure you want to close and discard them?')) {
        return
      }
    }
    setShowAddModal(false)
  }

  const resetProductForm = () => {
    setProdName('')
    setProdSku('')
    setProdBrand('')
    setProdType('')
    setProdCategory('')
    setProdDescription('')
    setProdPrice('')
    setProdUpc('')
    setProdStatus('')
    setProdLaunchDate('')
    setProdReleaseDate('')
    setProdEolDate('')
    setProdColor('')
    setProdSystemColor('')
    setProdMsrp('')
    setProdMapPrice('')
    setProdSalePrice('')
    setProdRecommendedAccessory(false)
    setProdInventoryLevel('')
    setProdInventoryThreshold('')
    setProdLength('')
    setProdWidth('')
    setProdHeight('')
    setProdWeight('')
    setProdWarranty('')
    setProdShortDescription('')
    setProdPromoInformation('')
    setProdImageUrl1('')
    setProdImageUrl2('')
    setProdImageUrl3('')
    setProdImageUrl4('')
    setProdImageUrl5('')
    setProdMetaTitle('')
    setProdMetaDescription('')
    setSelectedImageFile(null)
    setImagePreviewUrl('')
    setProdPrimaryImageUrl('')
    setUploadedZipImages([])
    setSelectedDeviceIds([])
    setCompBluetooth('')
    setCompHeadphoneJack('')
    setCompChargingInterface('')
    setCompWirelessCharging([])
    setCompStorageExpansion('')
    setCompMemoryCapacity('')
    setCompWatchCaseSize('')
    setFormError(null)
  }

  const handleCloseEditModal = () => {
    if (isEditFormDirty()) {
      if (!window.confirm('You have unsaved changes. Are you sure you want to close and discard them?')) {
        return
      }
    }
    setShowEditModal(false)
  }

  const handleCloseBulkModal = () => {
    if (isBulkFormDirty()) {
      if (!window.confirm('You have unsaved changes. Are you sure you want to close and discard them?')) {
        return
      }
    }
    setShowBulkModal(false)
    setBulkFile(null)
    setBulkResult(null)
    setBulkError(null)
    setCsvHeaders([])
    setCsvPreviewRows([])
  }

  const { data: dropdownConfigsData, refetch: refetchDropdownConfigs } = useQuery({
    queryKey: ['dropdown-configs'],
    queryFn: () => api.get('/catalog/dropdown-configs/').then(r => r.data),
  })

  const dropdownConfigs = useMemo(() => {
    return Array.isArray(dropdownConfigsData) ? dropdownConfigsData : (dropdownConfigsData?.results ?? [])
  }, [dropdownConfigsData])

  const allowedCategories: string[] = useMemo(() => {
    const cats = dropdownConfigs.filter((c: any) => c.field_name === 'product_category').map((c: any) => c.value)
    return cats.length > 0 ? cats : [
      'Cases', 'Screen Protection', 'Headphones', 'Speakers', 
      'Chargers and Cables', 'Memory', 'Wearable Tech', 'Phone Attachments'
    ]
  }, [dropdownConfigs])

  const allowedColors: string[] = useMemo(() => {
    const cols = dropdownConfigs.filter((c: any) => c.field_name === 'system_color').map((c: any) => c.value)
    return cols.length > 0 ? cols : [
      'Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple', 'Pink', 'Brown', 'Black', 'White', 'Silver', 'Multi-Color'
    ]
  }, [dropdownConfigs])

  const allowedBrands: string[] = useMemo(() => {
    return dropdownConfigs.filter((c: any) => c.field_name === 'brand').map((c: any) => c.value)
  }, [dropdownConfigs])

  // Runs inline validation checks on all rows and cells.
  const validation = useMemo(() => {
    if (csvHeaders.length === 0 || csvPreviewRows.length === 0) {
      return { hasErrors: false, rowErrors: {}, cellErrors: {} }
    }
    
    const normalize = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '')
    const normalizedHeaders = csvHeaders.map(normalize)
    const nameColIdx = normalizedHeaders.findIndex(h => h === 'accessoryname' || h === 'name' || h === 'productname')
    const skuColIdx = normalizedHeaders.findIndex(h => h === 'sku')
    const brandColIdx = normalizedHeaders.findIndex(h => h === 'brand')
    const upcColIdx = normalizedHeaders.findIndex(h => h === 'upc')
    const categoryColIdx = normalizedHeaders.findIndex(h => h === 'productcategory' || h === 'category')
    const launchDateColIdx = normalizedHeaders.findIndex(h => h === 'launchdate')
    const colorColIdx = normalizedHeaders.findIndex(h => h === 'color')
    const sysColorColIdx = normalizedHeaders.findIndex(h => h === 'systemcolor')
    const warrantyColIdx = normalizedHeaders.findIndex(h => h === 'brandwarranty' || h === 'warranty')
    const wholesaleColIdx = normalizedHeaders.findIndex(h => h === 'vendorwholesaleprice' || h === 'wholesaleprice' || h === 'vendorwholesalepriceamount')
    const msrpColIdx = normalizedHeaders.findIndex(h => h === 'msrp')
    const lengthColIdx = normalizedHeaders.findIndex(h => h === 'length')
    const widthColIdx = normalizedHeaders.findIndex(h => h === 'width')
    const heightColIdx = normalizedHeaders.findIndex(h => h === 'height')
    const weightColIdx = normalizedHeaders.findIndex(h => h === 'weight')
    const descColIdx = normalizedHeaders.findIndex(h => h === 'productdescription' || h === 'description')
    const compatColIdx = normalizedHeaders.findIndex(h => h === 'devicecompatibility' || h === 'compatibility')

    const dateColIdxs = normalizedHeaders.map((h, i) => ['launchdate', 'releasedate'].includes(h) ? i : -1).filter(i => i !== -1)
    const boolColIdxs = normalizedHeaders.map((h, i) => ['recommendedacccessory', 'recommendedaccessory'].includes(h) ? i : -1).filter(i => i !== -1)
    const priceColIdxs = normalizedHeaders.map((h, i) => ['vendorwholesaleprice', 'wholesaleprice', 'vendorwholesalepriceamount', 'msrp', 'mapprice', 'saleprice'].includes(h) ? i : -1).filter(i => i !== -1)
    const numColIdxs = normalizedHeaders.map((h, i) => ['inventorylevel', 'inventorythreshold', 'length', 'width', 'height', 'weight'].includes(h) ? i : -1).filter(i => i !== -1)

    const rowErrors: Record<number, string[]> = {}
    const cellErrors: Record<string, boolean> = {}
    const seenSkus = new Set<string>()
    let hasErrors = false

    csvPreviewRows.forEach((row, rowIdx) => {
      const errors: string[] = []

      // 1. Brand Check
      if (brandColIdx === -1) {
        errors.push("Missing 'Brand' column.")
      } else {
        const val = row[brandColIdx]?.trim()
        if (!val) {
          errors.push("Brand is required.")
          cellErrors[`${rowIdx}-${brandColIdx}`] = true
        } else if (val.length > 200) {
          errors.push("Brand exceeds database limit of 200 characters.")
          cellErrors[`${rowIdx}-${brandColIdx}`] = true
        } else if (isVendor && user?.company_name && val.toLowerCase() !== user.company_name.toLowerCase()) {
          errors.push(`Brand must match your company name '${user.company_name}'.`)
          cellErrors[`${rowIdx}-${brandColIdx}`] = true
        } else if (!isVendor && allowedBrands.length > 0 && !allowedBrands.some((b: string) => b.toLowerCase() === val.toLowerCase())) {
          errors.push(`Brand must be one of: ${allowedBrands.join(', ')}`)
          cellErrors[`${rowIdx}-${brandColIdx}`] = true
        }
      }

      // 2. Product Name Check
      if (nameColIdx === -1) {
        errors.push("Missing 'Product Name' or 'Name' column.")
      } else {
        const val = row[nameColIdx]?.trim()
        if (!val) {
          errors.push("Product Name is required.")
          cellErrors[`${rowIdx}-${nameColIdx}`] = true
        } else if (val.length > 300) {
          errors.push("Product Name exceeds database limit of 300 characters.")
          cellErrors[`${rowIdx}-${nameColIdx}`] = true
        }
      }

      // 3. SKU Check
      if (skuColIdx === -1) {
        errors.push("Missing 'SKU' column.")
      } else {
        const val = row[skuColIdx]?.trim()
        if (!val) {
          errors.push("SKU is required.")
          cellErrors[`${rowIdx}-${skuColIdx}`] = true
        } else {
          if (val.length > 200) {
            errors.push("SKU exceeds database limit of 200 characters.")
            cellErrors[`${rowIdx}-${skuColIdx}`] = true
          }
          if (seenSkus.has(val.toLowerCase())) {
            errors.push(`Duplicate SKU '${val}' in file.`)
            cellErrors[`${rowIdx}-${skuColIdx}`] = true
          }
          seenSkus.add(val.toLowerCase())
        }
      }

      // 4. UPC Check
      if (upcColIdx === -1) {
        errors.push("Missing 'UPC' column.")
      } else {
        const val = row[upcColIdx]?.trim()
        if (!val) {
          errors.push("UPC is required.")
          cellErrors[`${rowIdx}-${upcColIdx}`] = true
        } else if (val.length > 100) {
          errors.push("UPC exceeds database limit of 100 characters.")
          cellErrors[`${rowIdx}-${upcColIdx}`] = true
        }
      }

      // 5. Product Category Check
      if (categoryColIdx === -1) {
        errors.push("Missing 'Product Category' column.")
      } else {
        const val = row[categoryColIdx]?.trim()
        if (!val) {
          errors.push("Product Category is required.")
          cellErrors[`${rowIdx}-${categoryColIdx}`] = true
        } else {
          const match = allowedCategories.some((cat: string) => cat.toLowerCase() === val.toLowerCase())
          if (!match) {
            errors.push(`Product Category must be one of: ${allowedCategories.join(', ')}`)
            cellErrors[`${rowIdx}-${categoryColIdx}`] = true
          }
        }
      }

      // 6. Launch Date Check
      if (launchDateColIdx === -1) {
        errors.push("Missing 'Launch Date' column.")
      } else {
        const val = row[launchDateColIdx]?.trim()
        if (!val) {
          errors.push("Launch Date is required.")
          cellErrors[`${rowIdx}-${launchDateColIdx}`] = true
        }
      }

      // 7. Color Check
      if (colorColIdx === -1) {
        errors.push("Missing 'Color' column.")
      } else {
        const val = row[colorColIdx]?.trim()
        if (!val) {
          errors.push("Color is required.")
          cellErrors[`${rowIdx}-${colorColIdx}`] = true
        } else if (val.length > 100) {
          errors.push("Color exceeds database limit of 100 characters.")
          cellErrors[`${rowIdx}-${colorColIdx}`] = true
        }
      }

      // 8. System Color Check
      if (sysColorColIdx === -1) {
        errors.push("Missing 'System Color' column.")
      } else {
        const val = row[sysColorColIdx]?.trim()
        if (!val) {
          errors.push("System Color is required.")
          cellErrors[`${rowIdx}-${sysColorColIdx}`] = true
        } else {
          const sysColors = val.replace(/;/g, ',').split(',').map(x => x.trim().toLowerCase()).filter(Boolean)
          const invalid = sysColors.filter(sc => !allowedColors.some((ac: string) => ac.toLowerCase() === sc))
          if (invalid.length > 0) {
            errors.push(`Invalid system colors: ${invalid.join(', ')}. Must be from: ${allowedColors.join(', ')}`)
            cellErrors[`${rowIdx}-${sysColorColIdx}`] = true
          }
        }
      }

      // 9. Brand Warranty Check
      if (warrantyColIdx === -1) {
        errors.push("Missing 'Brand Warranty' column.")
      } else {
        const val = row[warrantyColIdx]?.trim()
        if (!val) {
          errors.push("Brand Warranty is required.")
          cellErrors[`${rowIdx}-${warrantyColIdx}`] = true
        } else if (val.length > 200) {
          errors.push("Warranty exceeds database limit of 200 characters.")
          cellErrors[`${rowIdx}-${warrantyColIdx}`] = true
        }
      }

      // 10. Vendor Wholesale Price Check
      if (wholesaleColIdx === -1) {
        errors.push("Missing 'Vendor Wholesale Price' column.")
      } else {
        const val = row[wholesaleColIdx]?.trim()
        if (!val) {
          errors.push("Vendor Wholesale Price is required.")
          cellErrors[`${rowIdx}-${wholesaleColIdx}`] = true
        }
      }

      // 11. MSRP Check
      if (msrpColIdx === -1) {
        errors.push("Missing 'MSRP' column.")
      } else {
        const val = row[msrpColIdx]?.trim()
        if (!val) {
          errors.push("MSRP is required.")
          cellErrors[`${rowIdx}-${msrpColIdx}`] = true
        }
      }

      // 12. Length Check
      if (lengthColIdx === -1) {
        errors.push("Missing 'Length' column.")
      } else {
        const val = row[lengthColIdx]?.trim()
        if (!val) {
          errors.push("Length is required.")
          cellErrors[`${rowIdx}-${lengthColIdx}`] = true
        }
      }

      // 13. Width Check
      if (widthColIdx === -1) {
        errors.push("Missing 'Width' column.")
      } else {
        const val = row[widthColIdx]?.trim()
        if (!val) {
          errors.push("Width is required.")
          cellErrors[`${rowIdx}-${widthColIdx}`] = true
        }
      }

      // 14. Height Check
      if (heightColIdx === -1) {
        errors.push("Missing 'Height' column.")
      } else {
        const val = row[heightColIdx]?.trim()
        if (!val) {
          errors.push("Height is required.")
          cellErrors[`${rowIdx}-${heightColIdx}`] = true
        }
      }

      // 15. Weight Check
      if (weightColIdx === -1) {
        errors.push("Missing 'Weight' column.")
      } else {
        const val = row[weightColIdx]?.trim()
        if (!val) {
          errors.push("Weight is required.")
          cellErrors[`${rowIdx}-${weightColIdx}`] = true
        }
      }

      // 16. Description Check
      if (descColIdx === -1) {
        errors.push("Missing 'Product Description' column.")
      } else {
        const val = row[descColIdx]?.trim()
        if (!val) {
          errors.push("Product Description is required.")
          cellErrors[`${rowIdx}-${descColIdx}`] = true
        }
      }

      // 17. Device Compatibility Check
      if (compatColIdx === -1) {
        errors.push("Missing 'Device Compatibility' column.")
      } else {
        const val = row[compatColIdx]?.trim()
        if (!val) {
          errors.push("Device Compatibility is required.")
          cellErrors[`${rowIdx}-${compatColIdx}`] = true
        }
      }

      // Price Numeric Checks
      priceColIdxs.forEach(colIdx => {
        const val = row[colIdx]?.trim()
        if (val) {
          const cleaned = val.replace('$', '').replace(/,/g, '').trim()
          if (isNaN(Number(cleaned))) {
            errors.push(`Invalid price '${val}' in '${csvHeaders[colIdx]}'.`)
            cellErrors[`${rowIdx}-${colIdx}`] = true
          }
        }
      })

      // Other Numeric Checks
      numColIdxs.forEach(colIdx => {
        const val = row[colIdx]?.trim()
        if (val && isNaN(Number(val))) {
          errors.push(`Invalid numeric value '${val}' in '${csvHeaders[colIdx]}'.`)
          cellErrors[`${rowIdx}-${colIdx}`] = true
        }
      })

      // Date Validity Checks
      dateColIdxs.forEach(colIdx => {
        const val = row[colIdx]?.trim()
        if (val) {
          const timestamp = Date.parse(val)
          if (isNaN(timestamp)) {
            errors.push(`Invalid date '${val}' in '${csvHeaders[colIdx]}'. Use MM-DD-YYYY.`)
            cellErrors[`${rowIdx}-${colIdx}`] = true
          }
        }
      })

      // Boolean Checks
      boolColIdxs.forEach(colIdx => {
        const val = row[colIdx]?.trim()
        if (val) {
          const lower = val.toLowerCase()
          const validBools = ['true', 'false', 'yes', 'no', 'y', 'n', '1', '0']
          if (!validBools.includes(lower)) {
            errors.push(`Invalid boolean value '${val}' in '${csvHeaders[colIdx]}'. Use true/false or yes/no.`)
            cellErrors[`${rowIdx}-${colIdx}`] = true
          }
        }
      })

      if (errors.length > 0) {
        rowErrors[rowIdx] = errors
        hasErrors = true
      }
    })

    return { hasErrors, rowErrors, cellErrors }
  }, [csvHeaders, csvPreviewRows, isVendor, user?.company_name, allowedCategories, allowedColors, allowedBrands])

  // Export Job Form State
  const [exportFormat, setExportFormat] = useState('csv')
  const [includeIncompatible, setIncludeIncompatible] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  
  // Projection recalculation state
  const [refreshingProj, setRefreshingProj] = useState(false)

  // TanStack Queries
  const { data, isLoading, refetch: refreshProducts } = useQuery({
    queryKey: ['products', search],
    queryFn: () => api.get('/catalog/products/', { params: { search } }).then(r => r.data),
  })



  const { data: devicesData } = useQuery({
    queryKey: ['devices'],
    queryFn: () => api.get('/devices/devices/').then(r => r.data),
    enabled: isVendor || isCixciAdmin,
  })

  const { data: activeCompatibilities, refetch: refetchCompatibilities } = useQuery({
    queryKey: ['compatibility', selectedManageProduct?.id],
    queryFn: () => api.get(`/catalog/products/${selectedManageProduct.id}/compatibility/`).then(r => r.data).catch(() => []),
    enabled: !!selectedManageProduct && showManageModal,
  })

  const { data: projection, refetch: refreshProjection, isRefetching: isRefetchingProj } = useQuery({
    queryKey: ['my-projection'],
    queryFn: () => api.get('/catalog/my-projection/my_projection/').then(r => r.data).catch(() => null),
    enabled: tab === 'projection' && isBuyer,
  })

  const { data: exportJobs, refetch: refreshJobs, isRefetching: isRefetchingJobs } = useQuery({
    queryKey: ['export-jobs'],
    queryFn: () => api.get('/catalog/export-jobs/list_jobs/').then(r => r.data).catch(() => []),
    enabled: tab === 'export_jobs' && isBuyer,
  })

  const { data: portfolio } = useQuery({
    queryKey: ['my-devices'],
    queryFn: () => api.get('/devices/portfolio/my_devices/').then(r => r.data).catch(() => []),
    enabled: isBuyer,
  })

  const products = data?.results ?? data ?? []
  const compatibleProducts = products.filter((p: any) =>
    projection?.compatible_product_ids?.includes(p.id)
  )
  const jobs = Array.isArray(exportJobs) ? exportJobs : (exportJobs?.results ?? [])
  const devices = devicesData?.results ?? devicesData ?? []

  // Helper to build media URLs
  const getImageUrl = (path: string) => {
    if (!path) return ''
    if (path.startsWith('http://') || path.startsWith('https://')) return path
    const apiBase = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1'
    const host = apiBase.replace('/api/v1', '')
    return `${host}${path}`
  }

  const extractUuid = (str: string): string | null => {
    if (!str) return null
    const match = str.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
    return match ? match[0] : null
  }

  // Handle local file uploads
  const handleUploadImage = async (file: File): Promise<{ id: string; storage_key: string }> => {
    const reqRes = await api.post('/media/assets/request_upload/', {
      filename: file.name,
      mime_type: file.type,
      asset_type: 'product_image',
      owner_module: 'catalog',
    })
    const assetId = reqRes.data.id

    const formData = new FormData()
    formData.append('file', file)
    const uploadRes = await api.post(`/media/assets/${assetId}/upload_file/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return {
      id: assetId,
      storage_key: uploadRes.data.storage_key
    }
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const isZip = e.target.files.length === 1 && (
        e.target.files[0].name.endsWith('.zip') || 
        e.target.files[0].type === 'application/zip' || 
        e.target.files[0].type === 'application/x-zip-compressed'
      )

      if (isZip) {
        const file = e.target.files[0]
        setFormError(null)
        try {
          setFormError('Extracting and uploading images from ZIP... Please wait.')
          const zip = new JSZip()
          const contents = await zip.loadAsync(file)
          const imageFiles: File[] = []
          for (const [relativePath, entry] of Object.entries(contents.files)) {
            if (!entry.dir && /\.(png|jpe?g|webp|gif)$/i.test(relativePath)) {
              const blob = await entry.async('blob')
              const name = relativePath.split('/').pop() || 'image.jpg'
              const imgFile = new File([blob], name, { type: blob.type || 'image/jpeg' })
              imageFiles.push(imgFile)
            }
          }
          if (imageFiles.length === 0) {
            setFormError('No valid images (PNG, JPG, JPEG, WEBP, GIF) found in the ZIP file.')
            setSelectedImageFile(null)
            setImagePreviewUrl('')
            setUploadedZipImages([])
            return
          }
          
          const uploadedList: { name: string; url: string }[] = []
          for (const f of imageFiles) {
            const uploadRes = await handleUploadImage(f)
            const absoluteUrl = getImageUrl('/media/' + uploadRes.storage_key)
            uploadedList.push({ name: f.name, url: absoluteUrl })
          }

          setUploadedZipImages(uploadedList)
          setImagePreviewUrl(uploadedList[0].url)
          setProdPrimaryImageUrl(uploadedList[0].url)
          setFormError(null)
        } catch (err: any) {
          setFormError('Failed to extract images from ZIP file: ' + err.message)
          setSelectedImageFile(null)
          setImagePreviewUrl('')
          setUploadedZipImages([])
        }
      } else {
        const files = Array.from(e.target.files)
        setFormError(null)
        try {
          if (files.length === 1) {
            const file = files[0]
            setSelectedImageFile(file)
            setImagePreviewUrl(URL.createObjectURL(file))
            setUploadedZipImages([])
          } else {
            setFormError('Uploading selected images... Please wait.')
            const uploadedList: { name: string; url: string }[] = []
            for (const f of files) {
              const uploadRes = await handleUploadImage(f)
              const absoluteUrl = getImageUrl('/media/' + uploadRes.storage_key)
              uploadedList.push({ name: f.name, url: absoluteUrl })
            }
            setUploadedZipImages(uploadedList)
            setImagePreviewUrl(uploadedList[0].url)
            setProdPrimaryImageUrl(uploadedList[0].url)
            setSelectedImageFile(files[0])
            setFormError(null)
          }
        } catch (err: any) {
          setFormError('Failed to upload one or more images: ' + err.message)
          setSelectedImageFile(null)
          setImagePreviewUrl('')
          setUploadedZipImages([])
        }
      }
    }
  }

  // Actions
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (isVendor) {
      if (!prodName) { setFormError('Product Name is required.'); return; }
      if (!prodSku) { setFormError('SKU is required.'); return; }
      if (!prodUpc) { setFormError('UPC is required.'); return; }
      if (prodType !== 'branded_merchandise' && !prodCategory) { setFormError('Product Category is required.'); return; }
      if (!prodLaunchDate) { setFormError('Launch Date is required.'); return; }
      if (!prodColor) { setFormError('Color is required.'); return; }
      if (!prodSystemColor) { setFormError('System Color is required.'); return; }
      if (!prodWarranty) { setFormError('Brand Warranty is required.'); return; }
      if (!prodPrice) { setFormError('Vendor Wholesale Price is required.'); return; }
      if (!prodMsrp) { setFormError('MSRP is required.'); return; }
      if (!prodLength) { setFormError('Length is required.'); return; }
      if (!prodWidth) { setFormError('Width is required.'); return; }
      if (!prodHeight) { setFormError('Height is required.'); return; }
      if (!prodWeight) { setFormError('Weight is required.'); return; }
      if (!prodDescription) { setFormError('Product Description is required.'); return; }
      if (['Cases', 'Screen Protection', 'Phone Attachments'].includes(prodCategory)) {
        if (selectedDeviceIds.length === 0) { setFormError('Device Compatibility is required. Select at least one device.'); return; }
      } else if (['Headphones', 'Speakers', 'Chargers and Cables', 'Memory', 'Wearable Tech', 'Watch Accessories'].includes(prodCategory)) {
        if (prodCategory === 'Headphones') {
          if (!compHeadphoneJack || !compBluetooth) { setFormError('Headphone Jack Compatibility and Bluetooth Compatibility are required.'); return; }
        } else if (prodCategory === 'Speakers') {
          if (!compChargingInterface || !compBluetooth) { setFormError('Compatible Charging Interface and Bluetooth Compatibility are required.'); return; }
        } else if (prodCategory === 'Chargers and Cables') {
          if (!compChargingInterface || compWirelessCharging.length === 0) { setFormError('Compatible Charging Interface and Wireless Charging Compatibility are required.'); return; }
        } else if (prodCategory === 'Memory') {
          if (!compStorageExpansion || !compMemoryCapacity) { setFormError('Storage Expansion Compatibility and Memory Capacity are required.'); return; }
        } else if (prodCategory === 'Wearable Tech') {
          if (!compChargingInterface || compWirelessCharging.length === 0) { setFormError('Compatible Charging Interface and Wireless Charging Compatibility are required.'); return; }
        } else if (prodCategory === 'Watch Accessories') {
          if (!compWatchCaseSize || compWirelessCharging.length === 0) { setFormError('Compatible Watch Case Size and Wireless Charging Compatibility are required.'); return; }
        }
      }
    } else {
      if (!prodName || !prodSku) {
        setFormError('Product Name and SKU are required.')
        return
      }
    }
    if (!prodType) {
      setFormError('Please select a product type.')
      return
    }
    try {
      let imageRef = null
      const mediaRefs = [
        prodImageUrl1,
        prodImageUrl2,
        prodImageUrl3,
        prodImageUrl4,
        prodImageUrl5
      ].filter(url => url.trim() !== '')

      if (prodPrimaryImageUrl) {
        const uuid = extractUuid(prodPrimaryImageUrl)
        if (uuid) {
          imageRef = uuid
        } else {
          setFormError('Primary Product Image URL/ID must contain a valid asset UUID.')
          return
        }
      } else if (selectedImageFile) {
        const uploadRes = await handleUploadImage(selectedImageFile)
        imageRef = uploadRes.id
      }

      const prodRes = await api.post('/catalog/products/', {
        name: prodName,
        sku: prodSku,
        brand: isVendor ? (user?.company_name || prodBrand) : prodBrand,
        product_type: prodType,
        product_category: prodType === 'branded_merchandise' ? null : (prodCategory || null),
        description: prodDescription,
        vendor_wholesale_price_amount: parseFloat(prodPrice) || 0.0,
        vendor_wholesale_price_currency: prodCurrency,
        primary_image_reference: imageRef,
        status: prodStatus,
        selling_status: 'for_sale',
        vendor_company_reference: user?.company_id || '04a98853-f5af-479a-af91-95de4489af00',
        upc: prodUpc || null,
        launch_date: prodLaunchDate || null,
        release_date: prodReleaseDate || null,
        eol_date: prodEolDate || null,
        color: prodColor || null,
        system_color: prodSystemColor || null,
        msrp: prodMsrp ? parseFloat(prodMsrp) : null,
        map_price: prodMapPrice ? parseFloat(prodMapPrice) : null,
        sale_price: prodSalePrice ? parseFloat(prodSalePrice) : null,
        recommended_accessory: prodRecommendedAccessory,
        inventory_level: prodInventoryLevel ? parseInt(prodInventoryLevel, 10) : null,
        inventory_threshold: prodInventoryThreshold ? parseInt(prodInventoryThreshold, 10) : 0,
        length: prodLength ? parseFloat(prodLength) : null,
        width: prodWidth ? parseFloat(prodWidth) : null,
        height: prodHeight ? parseFloat(prodHeight) : null,
        weight: prodWeight ? parseFloat(prodWeight) : null,
        warranty: prodWarranty || null,
        short_description: prodShortDescription || null,
        promo_information: prodPromoInformation || null,
        meta_title: prodMetaTitle || null,
        meta_description: prodMetaDescription || null,
        media_references: mediaRefs,
        bluetooth_compatibility: compBluetooth || null,
        headphone_jack_compatibility: compHeadphoneJack || null,
        compatible_charging_interface: compChargingInterface || null,
        wireless_charging_compatibility: compWirelessCharging.length > 0 ? compWirelessCharging.join('+') : null,
        storage_expansion_compatibility: compStorageExpansion || null,
        memory_capacity: compMemoryCapacity || null,
        compatible_watch_case_size: compWatchCaseSize || null,
      })

      const productId = prodRes.data.id

      if (selectedDeviceIds.length > 0) {
        await api.post(`/catalog/products/${productId}/compatibility/`, {
          assertions: selectedDeviceIds.map(devId => ({
            device_id: devId,
            is_compatible: true,
          }))
        })
      }

      setShowAddModal(false)
      resetProductForm()
      refreshProducts()
    } catch (err: any) {
      const data = err.response?.data
      let msg = 'Failed to list product accessory.'
      if (data) {
        if (typeof data.detail === 'string') {
          msg = data.detail
        } else if (data.detail && typeof data.detail === 'object') {
          msg = Object.entries(data.detail).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')
        } else if (typeof data === 'object') {
          msg = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')
        }
      }
      setFormError(msg)
    }
  }

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!editingProduct) return
    if (isVendor) {
      if (!prodName) { setFormError('Product Name is required.'); return; }
      if (!prodSku) { setFormError('SKU is required.'); return; }
      if (!prodUpc) { setFormError('UPC is required.'); return; }
      if (prodType !== 'branded_merchandise' && !prodCategory) { setFormError('Product Category is required.'); return; }
      if (!prodLaunchDate) { setFormError('Launch Date is required.'); return; }
      if (!prodColor) { setFormError('Color is required.'); return; }
      if (!prodSystemColor) { setFormError('System Color is required.'); return; }
      if (!prodWarranty) { setFormError('Brand Warranty is required.'); return; }
      if (!prodPrice) { setFormError('Vendor Wholesale Price is required.'); return; }
      if (!prodMsrp) { setFormError('MSRP is required.'); return; }
      if (!prodLength) { setFormError('Length is required.'); return; }
      if (!prodWidth) { setFormError('Width is required.'); return; }
      if (!prodHeight) { setFormError('Height is required.'); return; }
      if (!prodWeight) { setFormError('Weight is required.'); return; }
      if (!prodDescription) { setFormError('Product Description is required.'); return; }
      if (['Cases', 'Screen Protection', 'Phone Attachments'].includes(prodCategory)) {
        if (selectedDeviceIds.length === 0) { setFormError('Device Compatibility is required. Select at least one device.'); return; }
      } else if (['Headphones', 'Speakers', 'Chargers and Cables', 'Memory', 'Wearable Tech', 'Watch Accessories'].includes(prodCategory)) {
        if (prodCategory === 'Headphones') {
          if (!compHeadphoneJack || !compBluetooth) { setFormError('Headphone Jack Compatibility and Bluetooth Compatibility are required.'); return; }
        } else if (prodCategory === 'Speakers') {
          if (!compChargingInterface || !compBluetooth) { setFormError('Compatible Charging Interface and Bluetooth Compatibility are required.'); return; }
        } else if (prodCategory === 'Chargers and Cables') {
          if (!compChargingInterface || compWirelessCharging.length === 0) { setFormError('Compatible Charging Interface and Wireless Charging Compatibility are required.'); return; }
        } else if (prodCategory === 'Memory') {
          if (!compStorageExpansion || !compMemoryCapacity) { setFormError('Storage Expansion Compatibility and Memory Capacity are required.'); return; }
        } else if (prodCategory === 'Wearable Tech') {
          if (!compChargingInterface || compWirelessCharging.length === 0) { setFormError('Compatible Charging Interface and Wireless Charging Compatibility are required.'); return; }
        } else if (prodCategory === 'Watch Accessories') {
          if (!compWatchCaseSize || compWirelessCharging.length === 0) { setFormError('Compatible Watch Case Size and Wireless Charging Compatibility are required.'); return; }
        }
      }
    } else {
      if (!prodName || !prodSku) {
        setFormError('Product Name and SKU are required.')
        return
      }
    }
    if (!prodType) {
      setFormError('Please select a product type.')
      return
    }
    try {
      let imageRef = editingProduct.primary_image_reference
      const mediaRefs = [
        prodImageUrl1,
        prodImageUrl2,
        prodImageUrl3,
        prodImageUrl4,
        prodImageUrl5
      ].filter(url => url.trim() !== '')

      if (prodPrimaryImageUrl) {
        const uuid = extractUuid(prodPrimaryImageUrl)
        if (uuid) {
          imageRef = uuid
        } else {
          setFormError('Primary Product Image URL/ID must contain a valid asset UUID.')
          return
        }
      } else if (selectedImageFile) {
        const uploadRes = await handleUploadImage(selectedImageFile)
        imageRef = uploadRes.id
      }

      await api.patch(`/catalog/products/${editingProduct.id}/`, {
        name: prodName,
        sku: prodSku,
        brand: isVendor ? (user?.company_name || prodBrand) : prodBrand,
        product_type: prodType,
        product_category: prodType === 'branded_merchandise' ? null : (prodCategory || null),
        description: prodDescription,
        vendor_wholesale_price_amount: parseFloat(prodPrice) || 0.0,
        vendor_wholesale_price_currency: prodCurrency,
        primary_image_reference: imageRef,
        status: prodStatus,
        upc: prodUpc || null,
        launch_date: prodLaunchDate || null,
        release_date: prodReleaseDate || null,
        eol_date: prodEolDate || null,
        color: prodColor || null,
        system_color: prodSystemColor || null,
        msrp: prodMsrp ? parseFloat(prodMsrp) : null,
        map_price: prodMapPrice ? parseFloat(prodMapPrice) : null,
        sale_price: prodSalePrice ? parseFloat(prodSalePrice) : null,
        recommended_accessory: prodRecommendedAccessory,
        inventory_level: prodInventoryLevel ? parseInt(prodInventoryLevel, 10) : null,
        inventory_threshold: prodInventoryThreshold ? parseInt(prodInventoryThreshold, 10) : 0,
        length: prodLength ? parseFloat(prodLength) : null,
        width: prodWidth ? parseFloat(prodWidth) : null,
        height: prodHeight ? parseFloat(prodHeight) : null,
        weight: prodWeight ? parseFloat(prodWeight) : null,
        warranty: prodWarranty || null,
        short_description: prodShortDescription || null,
        promo_information: prodPromoInformation || null,
        meta_title: prodMetaTitle || null,
        meta_description: prodMetaDescription || null,
        media_references: mediaRefs,
        bluetooth_compatibility: compBluetooth || null,
        headphone_jack_compatibility: compHeadphoneJack || null,
        compatible_charging_interface: compChargingInterface || null,
        wireless_charging_compatibility: compWirelessCharging.length > 0 ? compWirelessCharging.join('+') : null,
        storage_expansion_compatibility: compStorageExpansion || null,
        memory_capacity: compMemoryCapacity || null,
        compatible_watch_case_size: compWatchCaseSize || null,
      })

      if (['Cases', 'Screen Protection', 'Phone Attachments'].includes(prodCategory) && selectedDeviceIds.length > 0) {
        await api.post(`/catalog/products/${editingProduct.id}/compatibility/`, {
          assertions: selectedDeviceIds.map(devId => ({
            device_id: devId,
            is_compatible: true,
          }))
        })
      }

      setShowEditModal(false)
      setEditingProduct(null)
      // Reset form
      setProdName('')
      setProdSku('')
      setProdBrand('')
      setProdType('')
      setProdCategory('')
      setProdDescription('')
      setProdPrice('19.99')
      setProdUpc('')
      setProdLaunchDate('')
      setProdReleaseDate('')
      setProdEolDate('')
      setProdColor('')
      setProdSystemColor('')
      setProdMsrp('')
      setProdMapPrice('')
      setProdSalePrice('')
      setProdRecommendedAccessory(false)
      setProdInventoryLevel('')
      setProdInventoryThreshold('')
      setProdLength('')
      setProdWidth('')
      setProdHeight('')
      setProdWeight('')
      setProdWarranty('')
      setProdShortDescription('')
      setProdPromoInformation('')
      setProdImageUrl1('')
      setProdImageUrl2('')
      setProdImageUrl3('')
      setProdImageUrl4('')
      setProdImageUrl5('')
      setProdMetaTitle('')
      setProdMetaDescription('')
      setSelectedImageFile(null)
      setImagePreviewUrl('')
      setSelectedDeviceIds([])
      setCompBluetooth('')
      setCompHeadphoneJack('')
      setCompChargingInterface('')
      setCompWirelessCharging([])
      setCompStorageExpansion('')
      setCompMemoryCapacity('')
      setCompWatchCaseSize('')
      refreshProducts()
    } catch (err: any) {
      const data = err.response?.data
      let msg = 'Failed to update product accessory.'
      if (data) {
        if (typeof data.detail === 'string') {
          msg = data.detail
        } else if (data.detail && typeof data.detail === 'object') {
          msg = Object.entries(data.detail).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')
        } else if (typeof data === 'object') {
          msg = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')
        }
      }
      setFormError(msg)
    }
  }

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this accessory?")) return
    try {
      await api.delete(`/catalog/products/${id}/`)
      setShowManageModal(false)
      setSelectedManageProduct(null)
      refreshProducts()
    } catch (err: any) {
      alert("Failed to delete product: " + (err.response?.data?.detail || err.message))
    }
  }

  // Compatibility management functions
  const handleOpenExcludeModal = (device: any) => {
    setExcludeDevice(device)
    setExcludeReason('physical_mismatch')
    setExcludeNotes('')
    setShowExcludeModal(true)
  }

  const handleSubmitExclusion = async () => {
    if (!selectedManageProduct || !excludeDevice) return
    try {
      await api.post(`/catalog/products/${selectedManageProduct.id}/compatibility/`, {
        action: 'exclude',
        device_reference: excludeDevice.id,
        exclusion_reason: excludeReason,
        notes: excludeNotes
      })
      refetchCompatibilities()
      setShowExcludeModal(false)
      setExcludeDevice(null)
    } catch (err: any) {
      alert("Failed to exclude device: " + (err.response?.data?.error || err.message))
    }
  }

  const handleRestoreCompatibility = async (deviceReference: string, exclusionType: string, isLocked: boolean) => {
    if (!selectedManageProduct) return
    if (!isCixciAdmin) {
      if (isLocked) {
        alert("Cannot restore a locked mapping.")
        return
      }
      if (exclusionType !== 'vendor') {
        alert("Vendors can only restore vendor exclusions.")
        return
      }
    }
    try {
      await api.post(`/catalog/products/${selectedManageProduct.id}/compatibility/`, {
        action: 'restore',
        device_reference: deviceReference
      })
      refetchCompatibilities()
    } catch (err: any) {
      alert("Failed to restore device: " + (err.response?.data?.error || err.message))
    }
  }

  const handleLockCompatibility = async (deviceReference: string) => {
    if (!selectedManageProduct) return
    if (!isCixciAdmin) {
      alert("Only CIXCI Admins can lock device mappings.")
      return
    }
    try {
      await api.post(`/catalog/products/${selectedManageProduct.id}/compatibility/`, {
        action: 'lock',
        device_reference: deviceReference
      })
      refetchCompatibilities()
    } catch (err: any) {
      alert("Failed to lock mapping: " + (err.response?.data?.error || err.message))
    }
  }

  const handleConvertToAdminExclusion = async (deviceReference: string) => {
    if (!selectedManageProduct) return
    if (!isCixciAdmin) {
      alert("Only CIXCI Admins can convert exclusions to Admin exclusions.")
      return
    }
    try {
      await api.post(`/catalog/products/${selectedManageProduct.id}/compatibility/`, {
        action: 'convert_to_admin_exclusion',
        device_reference: deviceReference
      })
      refetchCompatibilities()
    } catch (err: any) {
      alert("Failed to convert exclusion: " + (err.response?.data?.error || err.message))
    }
  }

  const handleQuickAddDevice = async () => {
    if (!selectedManageProduct || !quickAddDeviceId) return
    try {
      await api.post(`/catalog/products/${selectedManageProduct.id}/compatibility/`, {
        compatibility_update_type: 'add',
        assertions: [{
          device_id: quickAddDeviceId,
          is_compatible: true
        }]
      })
      refetchCompatibilities()
      setQuickAddDeviceId('')
    } catch (err: any) {
      alert("Failed to add compatibility: " + (err.response?.data?.error || err.message))
    }
  }

  const handleBulkCompatUpdate = async () => {
    if (!selectedManageProduct || bulkSelectedDevices.length === 0) {
      alert("Please select at least one device.")
      return
    }
    if (bulkUpdateType !== 'add' && selectedManageProduct.status === 'active' && !isCixciAdmin) {
      alert("Replacing or removing device compatibility assertions on active products requires CIXCI Admin approval.")
      return
    }
    try {
      const assertions = bulkSelectedDevices.map(dId => ({
        device_id: dId,
        is_compatible: true
      }))
      await api.post(`/catalog/products/${selectedManageProduct.id}/compatibility/`, {
        compatibility_update_type: bulkUpdateType,
        assertions
      })
      refetchCompatibilities()
      alert("Bulk compatibility update completed successfully.")
      setBulkSelectedDevices([])
    } catch (err: any) {
      alert("Failed to perform bulk update: " + (err.response?.data?.error || err.message))
    }
  }

  const handleManualRecalculate = async () => {
    if (!selectedManageProduct) return
    if (!isCixciAdmin) {
      alert("Only CIXCI Admins can manually trigger compatibility recalculation.")
      return
    }
    setIsRecalculating(true)
    try {
      await api.post(`/catalog/products/${selectedManageProduct.id}/recalculate_compatibility/`)
      refetchCompatibilities()
      alert("Compatibility recalculated successfully.")
    } catch (err: any) {
      alert("Failed to recalculate compatibility: " + (err.response?.data?.error || err.message))
    } finally {
      setIsRecalculating(false)
    }
  }

  useEffect(() => {
    if (manageTab === 'audit' && selectedManageProduct && showManageModal) {
      setIsLoadingAudit(true)
      api.get(`/catalog/products/${selectedManageProduct.id}/audit_history/`)
        .then(res => {
          setAuditHistory(res.data)
          setIsLoadingAudit(false)
        })
        .catch(() => {
          setAuditHistory([])
          setIsLoadingAudit(false)
        })
    }
  }, [manageTab, selectedManageProduct, showManageModal])

  useEffect(() => {
    if (!showManageModal) {
      setManageTab('details')
      setBulkSelectedDevices([])
      setQuickAddDeviceId('')
    }
  }, [showManageModal])

  const parseCSV = (text: string): string[][] => {
    const result: string[][] = [];
    let row: string[] = [];
    let currentCell = '';
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentCell += '"';
          i++; // skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(currentCell.trim());
        currentCell = '';
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        row.push(currentCell.trim());
        if (row.some(cell => cell !== '')) {
          result.push(row);
        }
        row = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    
    if (currentCell !== '' || row.length > 0) {
      row.push(currentCell.trim());
      if (row.some(cell => cell !== '')) {
        result.push(row);
      }
    }
    
    return result;
  };

  const handleDownloadTemplate = () => {
    const link = document.createElement("a");
    link.setAttribute("href", "/Download CSV Template.csv");
    link.setAttribute("download", "Download CSV Template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (csvPreviewRows.length === 0) return

    if (validation.hasErrors) {
      setBulkError("Please correct all validation errors in the preview before uploading.")
      return
    }

    setBulkError(null)
    setBulkResult(null)
    setUploadingBulk(true)

    // Convert the edited grid back to CSV format for backend consumption
    const escapeCell = (val: string) => {
      const s = val === null || val === undefined ? '' : String(val)
      if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return `"${s.replace(/"/g, '""')}"`
      }
      return s
    }
    const headerLine = csvHeaders.map(escapeCell).join(',')
    const rowLines = csvPreviewRows.map(row => row.map(escapeCell).join(','))
    const csvContent = [headerLine, ...rowLines].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const origName = bulkFile?.name || 'catalog_upload.csv'
    const finalName = origName.replace(/\.[^/.]+$/, "") + ".csv"
    const finalFile = new File([blob], finalName, { type: 'text/csv' })

    const formData = new FormData()
    formData.append('file', finalFile)
    formData.append('update_mode', updateMode)

    try {
      const res = await api.post('/catalog/products/bulk_upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setBulkResult({
        total_rows_processed: res.data.total_rows_processed,
        rows_passed: res.data.rows_passed,
        rows_failed: res.data.rows_failed,
        rows_staged: res.data.rows_staged,
        errors: res.data.errors || [],
      })
      setBulkFile(null)
      setCsvHeaders([])
      setCsvPreviewRows([])
      refreshProducts()
    } catch (err: any) {
      if (err.response?.status === 207 || err.response?.status === 400) {
        const data = err.response.data
        if (data && typeof data === 'object' && ('total_rows_processed' in data || 'errors' in data)) {
          setBulkResult({
            total_rows_processed: data.total_rows_processed || 0,
            rows_passed: data.rows_passed || 0,
            rows_failed: data.rows_failed || 0,
            rows_staged: data.rows_staged || 0,
            errors: data.errors || [],
          })
          setBulkFile(null)
          setCsvHeaders([])
          setCsvPreviewRows([])
          refreshProducts()
          return
        }
      }
      setBulkError(err.response?.data?.error || err.response?.data?.detail || 'Failed to upload catalog.')
    } finally {
      setUploadingBulk(false)
    }
  }

  const handleAddDropdownValue = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDropdownValue.trim()) return
    setDropdownError(null)
    try {
      await api.post('/catalog/dropdown-configs/', {
        field_name: manageField,
        value: newDropdownValue.trim(),
      })
      setNewDropdownValue('')
      refetchDropdownConfigs()
    } catch (err: any) {
      setDropdownError(err.response?.data?.detail || err.response?.data?.value?.[0] || 'Failed to add value.')
    }
  }

  const handleDeleteDropdownValue = async (id: string) => {
    setDropdownError(null)
    try {
      await api.delete(`/catalog/dropdown-configs/${id}/`)
      refetchDropdownConfigs()
    } catch (err: any) {
      setDropdownError(err.response?.data?.detail || 'Failed to delete value.')
    }
  }

  const handleSaveCategoryConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    setDropdownError(null)
    try {
      await api.patch(`/catalog/dropdown-configs/${editingCategoryConfig.id}/`, {
        compatibility_mode: categoryConfigMode,
        status: categoryConfigStatus,
        match_logic: categoryConfigMatchLogic,
        eligible_device_types: categoryConfigEligibleTypes,
        accessory_fields: categoryConfigAccessoryFields,
        compatibility_rules: categoryConfigRules,
      })
      setEditingCategoryConfig(null)
      refetchDropdownConfigs()
    } catch (err: any) {
      setDropdownError(err.response?.data?.detail || 'Failed to save configuration.')
    }
  }

  const handleStartExport = async (e: React.FormEvent) => {
    e.preventDefault()
    setExportError(null)
    try {
      await api.post('/catalog/export-jobs/create_job/', {
        format: exportFormat,
        include_incompatible: includeIncompatible,
      })
      setSelectedIds([])
      setShowExportModal(false)
      setTab('export_jobs')
      refreshJobs()
    } catch (err: any) {
      setExportError(err.response?.data?.detail || 'Failed to create export job.')
    }
  }

  const handleRefreshProjection = async () => {
    setRefreshingProj(true)
    try {
      await api.post('/catalog/my-projection/refresh/')
      refreshProjection()
    } catch (err: any) {
      alert("Failed to refresh compatibility projection: " + (err.response?.data?.detail || err.message))
    } finally {
      setRefreshingProj(false)
    }
  }

  const openEditModal = (p: any) => {
    setEditingProduct(p)
    setProdName(p.name || '')
    setProdSku(p.sku || '')
    setProdBrand(p.brand || '')
    setProdStatus(p.status || 'active')
    setProdType(p.product_type || 'accessory')
    setProdCategory(p.product_category || '')
    setProdDescription(p.description || '')
    setProdPrice(String(p.vendor_wholesale_price_amount || '19.99'))
    setProdCurrency(p.vendor_wholesale_price_currency || 'USD')
    setImagePreviewUrl(p.primary_image_url ? getImageUrl(p.primary_image_url) : '')
    setProdPrimaryImageUrl(p.primary_image_url ? getImageUrl(p.primary_image_url) : '')
    
    // Prefill all the new fields
    setProdUpc(p.upc || '')
    setProdLaunchDate(p.launch_date || '')
    setProdReleaseDate(p.release_date || '')
    setProdEolDate(p.eol_date || '')
    setProdColor(p.color || '')
    setProdSystemColor(p.system_color || '')
    setProdMsrp(p.msrp !== null && p.msrp !== undefined ? String(p.msrp) : '')
    setProdMapPrice(p.map_price !== null && p.map_price !== undefined ? String(p.map_price) : '')
    setProdSalePrice(p.sale_price !== null && p.sale_price !== undefined ? String(p.sale_price) : '')
    setProdRecommendedAccessory(!!p.recommended_accessory)
    setProdInventoryLevel(p.inventory_level !== null && p.inventory_level !== undefined ? String(p.inventory_level) : '')
    setProdInventoryThreshold(p.inventory_threshold !== null && p.inventory_threshold !== undefined ? String(p.inventory_threshold) : '')
    setProdLength(p.length !== null && p.length !== undefined ? String(p.length) : '')
    setProdWidth(p.width !== null && p.width !== undefined ? String(p.width) : '')
    setProdHeight(p.height !== null && p.height !== undefined ? String(p.height) : '')
    setProdWeight(p.weight !== null && p.weight !== undefined ? String(p.weight) : '')
    setProdWarranty(p.warranty || '')
    setProdShortDescription(p.short_description || '')
    setProdPromoInformation(p.promo_information || '')
    setProdImageUrl1(p.media_references?.[0] || '')
    setProdImageUrl2(p.media_references?.[1] || '')
    setProdImageUrl3(p.media_references?.[2] || '')
    setProdImageUrl4(p.media_references?.[3] || '')
    setProdImageUrl5(p.media_references?.[4] || '')
    setProdMetaTitle(p.meta_title || '')
    setProdMetaDescription(p.meta_description || '')

    // Prefill category-specific compatibility attributes
    setCompBluetooth(p.bluetooth_compatibility || '')
    setCompHeadphoneJack(p.headphone_jack_compatibility || '')
    setCompChargingInterface(p.compatible_charging_interface || '')
    
    const wirelessVal = p.wireless_charging_compatibility || ''
    if (wirelessVal) {
      setCompWirelessCharging(wirelessVal.split('+'))
    } else {
      setCompWirelessCharging([])
    }
    
    setCompStorageExpansion(p.storage_expansion_compatibility || '')
    setCompMemoryCapacity(p.memory_capacity || '')
    setCompWatchCaseSize(p.compatible_watch_case_size || '')

    // Prefill active compatibilities
    const compatList = activeCompatibilities || []
    setSelectedDeviceIds(compatList.map((c: any) => c.device_reference))
    
    setShowManageModal(false)
    setShowEditModal(true)
  }

  const toggleSelectProduct = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(products.map((p: any) => p.id))
    }
  }

  const toggleDeviceSelection = (id: string) => {
    if (selectedDeviceIds.includes(id)) {
      setSelectedDeviceIds(selectedDeviceIds.filter(x => x !== id))
    } else {
      setSelectedDeviceIds([...selectedDeviceIds, id])
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Product Catalog</div>
          <div className="page-sub">Accessories, compatibility projections, export governance</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {isCixciAdmin && (
            <button className="btn btn-secondary" onClick={() => { setManageField('system_color'); setShowDropdownManagerModal(true); }}>
              <Settings size={14} style={{ marginRight: 6 }} /> Manage Dropdowns
            </button>
          )}
          {isVendor && (
            <>
              <button className="btn btn-secondary" onClick={() => setShowBulkModal(true)}>
                <Upload size={14} /> Bulk Upload Catalog
              </button>
              <button className="btn btn-primary" onClick={() => {
                resetProductForm()
                setShowAddModal(true)
              }}>
                <Plus size={14} /> Add Product
              </button>
            </>
          )}
        </div>
      </div>

      <div className="tabs">
        <div className={`tab ${tab === 'products' ? 'active' : ''}`} onClick={() => setTab('products')}>
          All Products
        </div>
        {isBuyer && (
          <>
            <div className={`tab ${tab === 'projection' ? 'active' : ''}`} onClick={() => setTab('projection')}>
              My Compatibility
            </div>
            <div className={`tab ${tab === 'export_jobs' ? 'active' : ''}`} onClick={() => setTab('export_jobs')}>
              Export Jobs
            </div>
          </>
        )}
      </div>

      {tab === 'products' && (
        <>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="search-bar" style={{ width: 280 }}>
              <Search size={14} />
              <input placeholder="Search by name, SKU, brand…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {selectedIds.length > 0 && isBuyer && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 550 }}>
                  {selectedIds.length} accessories selected
                </span>
                <button className="btn btn-primary btn-sm" onClick={() => setShowExportModal(true)}>
                  Export Selection
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setSelectedIds([])}>
                  Clear
                </button>
              </div>
            )}
          </div>
          <div className="table-wrap">
            {isLoading ? (
              <div className="loading-overlay"><div className="spinner" /> Loading products…</div>
            ) : isBuyer && (!portfolio || portfolio.filter((d: any) => d.active_flag).length === 0) ? (
              <div className="empty-state">
                <ShoppingBag size={40} />
                <div>Please add devices to your portfolio to view compatible products</div>
              </div>
            ) : products.length === 0 ? (
              <div className="empty-state">
                <ShoppingBag size={40} />
                <div>No products yet</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    {isBuyer && (
                      <th style={{ width: 40, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={products.length > 0 && selectedIds.length === products.length}
                          onChange={toggleSelectAll}
                        />
                      </th>
                    )}
                    <th style={{ width: 60 }}>Image</th>
                    <th>Product Name</th>
                    <th>Brand</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Wholesale Price</th>
                    <th>MSRP</th>
                    <th>Status</th>
                    <th>Selling</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p: any) => (
                    <tr
                      key={p.id}
                      onClick={() => {
                        setSelectedManageProduct(p)
                        setShowManageModal(true)
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {isBuyer && (
                        <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(p.id)}
                            onChange={() => toggleSelectProduct(p.id)}
                          />
                        </td>
                      )}
                      <td>
                        {p.primary_image_url ? (
                          <img
                            src={getImageUrl(p.primary_image_url)}
                            alt={p.name}
                            style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border)' }}
                          />
                        ) : (
                          <div style={{ width: 36, height: 36, background: 'var(--bg-elevated)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                            <ShoppingBag size={14} />
                          </div>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{p.name}</td>
                      <td>{p.brand}</td>
                      <td>{p.product_type}</td>
                      <td>{p.product_category || '—'}</td>
                      <td className="mono">
                        {isBuyer
                          ? formatCurrency(p.buyer_wholesale_price, p.vendor_wholesale_price_currency)
                          : formatCurrency(p.vendor_wholesale_price_amount, p.vendor_wholesale_price_currency)
                        }
                      </td>
                      <td className="mono">{formatCurrency(p.msrp)}</td>
                      <td><span className={`badge ${STATUS_BADGE[p.status] ?? 'badge-muted'}`}>{p.status}</span></td>
                      <td><span className={`badge ${SELL_BADGE[p.selling_status] ?? 'badge-muted'}`}>{p.selling_status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {tab === 'projection' && isBuyer && (
        <div className="card">
          <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span className="section-title" style={{ fontSize: 15, fontWeight: 600 }}>Buyer Compatibility Projection</span>
            <button className="btn btn-secondary btn-sm" onClick={handleRefreshProjection} disabled={refreshingProj || isRefetchingProj}>
              <RefreshCw size={13} className={refreshingProj || isRefetchingProj ? 'spin' : ''} />
              {refreshingProj || isRefetchingProj ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
          {!projection ? (
            <div className="empty-state">
              <ShoppingBag size={40} />
              <div>No projection available</div>
              <div style={{ fontSize: 12 }}>Add devices to your portfolio to generate a projection</div>
            </div>
          ) : (
            <>
              <div className="card-grid card-grid-3" style={{ marginBottom: 16 }}>
                <div style={{ textAlign: 'center', padding: '16px 0', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--green)' }}>{projection.compatible_product_count ?? 0}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Compatible Products</div>
                </div>
                <div style={{ textAlign: 'center', padding: '16px 0', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--red)' }}>{projection.incompatible_product_ids?.length ?? 0}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Incompatible Accessories</div>
                </div>
                <div style={{ textAlign: 'center', padding: '16px 0', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                  <span className={`badge ${projection.status === 'active' ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: 13, padding: '6px 14px', marginTop: 8 }}>
                    {projection.status}
                  </span>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 12 }}>Projection status</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 24 }}>
                Last recalculated: {projection.last_recalculated_at ? new Date(projection.last_recalculated_at).toLocaleString() : '—'}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 16, flexWrap: 'wrap' }}>
                  <div className="search-bar" style={{ width: 280, margin: 0 }}>
                    <Search size={14} />
                    <input placeholder="Search compatible products…" value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                  {selectedIds.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 550 }}>
                        {selectedIds.length} selected
                      </span>
                      <button className="btn btn-primary btn-sm" onClick={() => setShowExportModal(true)}>
                        Export Selection
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setSelectedIds([])}>
                        Clear
                      </button>
                    </div>
                  )}
                </div>
                <div className="table-wrap">
                  {compatibleProducts.length === 0 ? (
                    <div className="empty-state" style={{ padding: '32px 0' }}>
                      <ShoppingBag size={32} />
                      <div>No compatible products found</div>
                    </div>
                  ) : (
                    <table>
                      <thead>
                        <tr>
                          <th style={{ width: 40, textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={compatibleProducts.length > 0 && compatibleProducts.every((p: any) => selectedIds.includes(p.id))}
                              onChange={() => {
                                const allSelected = compatibleProducts.every((p: any) => selectedIds.includes(p.id))
                                if (allSelected) {
                                  setSelectedIds(selectedIds.filter(id => !compatibleProducts.some((p: any) => p.id === id)))
                                } else {
                                  const newIds = [...selectedIds]
                                  compatibleProducts.forEach((p: any) => {
                                    if (!newIds.includes(p.id)) newIds.push(p.id)
                                  })
                                  setSelectedIds(newIds)
                                }
                              }}
                            />
                          </th>
                          <th style={{ width: 60 }}>Image</th>
                          <th>Product Name</th>
                          <th>Brand</th>
                          <th>Type</th>
                          <th>Category</th>
                          <th>Wholesale Price</th>
                          <th>MSRP</th>
                          <th>Status</th>
                          <th>Selling</th>
                        </tr>
                      </thead>
                      <tbody>
                        {compatibleProducts.map((p: any) => (
                          <tr
                            key={p.id}
                            onClick={() => {
                              setSelectedManageProduct(p)
                              setShowManageModal(true)
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(p.id)}
                                onChange={() => {
                                  if (selectedIds.includes(p.id)) {
                                    setSelectedIds(selectedIds.filter(x => x !== p.id))
                                  } else {
                                    setSelectedIds([...selectedIds, p.id])
                                  }
                                }}
                              />
                            </td>
                            <td>
                              {p.primary_image_url ? (
                                <img
                                  src={getImageUrl(p.primary_image_url)}
                                  alt={p.name}
                                  style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border)' }}
                                />
                              ) : (
                                <div style={{ width: 36, height: 36, background: 'var(--bg-elevated)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                  <ShoppingBag size={14} />
                                </div>
                              )}
                            </td>
                            <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{p.name}</td>
                            <td>{p.brand}</td>
                            <td>{p.product_type}</td>
                            <td>{p.product_category || '—'}</td>
                            <td className="mono">
                              {isBuyer
                                ? formatCurrency(p.buyer_wholesale_price, p.vendor_wholesale_price_currency)
                                : formatCurrency(p.vendor_wholesale_price_amount, p.vendor_wholesale_price_currency)
                              }
                            </td>
                            <td className="mono">{formatCurrency(p.msrp)}</td>
                            <td><span className={`badge ${STATUS_BADGE[p.status] ?? 'badge-muted'}`}>{p.status}</span></td>
                            <td><span className={`badge ${SELL_BADGE[p.selling_status] ?? 'badge-muted'}`}>{p.selling_status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'export_jobs' && isBuyer && (
        <div>
          <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Procurement Export Jobs</div>
            <button className="btn btn-secondary btn-sm" onClick={() => refreshJobs()} disabled={isRefetchingJobs}>
              <RefreshCw size={13} className={isRefetchingJobs ? 'spin' : ''} />
              {isRefetchingJobs ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
          <div className="table-wrap">
            {jobs.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No export jobs requested.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Job ID</th><th>Format</th><th>Include Incompatible</th><th>Created</th><th>Status</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job: any) => (
                    <tr key={job.id}>
                      <td className="mono" style={{ fontSize: 12 }}>{job.id.slice(0, 8)}…</td>
                      <td className="mono" style={{ textTransform: 'uppercase' }}>{job.format}</td>
                      <td>{job.include_incompatible ? 'Yes' : 'No'}</td>
                      <td>{new Date(job.created_at).toLocaleString()}</td>
                      <td>
                        <span className={`badge ${
                          job.status === 'completed' ? 'badge-green' :
                          job.status === 'failed' ? 'badge-red' :
                          job.status === 'running' ? 'badge-blue' : 'badge-muted'
                        }`}>
                          {job.status}
                        </span>
                      </td>
                      <td>
                        {job.status === 'completed' ? (
                          <button className="btn btn-ghost btn-sm" onClick={() => alert(`Downloading export catalog file ${job.id}`)}>
                            <Download size={13} /> Download
                          </button>
                        ) : job.status === 'pending' || job.status === 'running' ? (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Processing…</span>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--red)' }}>Error</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ─── ADD PRODUCT MODAL ─────────────────────────────────────────────────── */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: 720, maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Add Product</div>
              <button className="btn btn-ghost" style={{ padding: 4 }} onClick={handleCloseAddModal}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddProduct}>
              {formError && (
                <div style={{ background: 'var(--red-dim)', color: 'var(--red)', padding: '10px 12px', borderRadius: 6, marginBottom: 12, fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <AlertCircle size={14} />
                  <span>{formError}</span>
                </div>
              )}

              {/* 1. Basic & Identity Information */}
              <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 16, marginBottom: 16 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>1. Basic & Identity Information</h4>
                <div className="form-group">
                  <label className="label">Product Name *</label>
                  <input className="input" placeholder="e.g. Ultra Fast USB-C Charger" value={prodName} onChange={e => setProdName(e.target.value)} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="label">SKU *</label>
                    <input className="input" placeholder="e.g. ACC-USBC-01" value={prodSku} onChange={e => setProdSku(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="label">UPC *</label>
                    <input className="input" placeholder="e.g. 190123456789" value={prodUpc} onChange={e => setProdUpc(e.target.value)} required={isVendor} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="label">Brand *</label>
                    {isVendor ? (
                      <input
                        className="input"
                        placeholder="e.g. ChargeCore"
                        value={user?.company_name || ''}
                        disabled
                        required
                      />
                    ) : (
                      <select
                        className="input"
                        value={prodBrand}
                        onChange={e => setProdBrand(e.target.value)}
                        required
                      >
                        <option value="">Select Brand</option>
                        {allowedBrands.map((b: string) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="label">Product Type *</label>
                    <select className="input" value={prodType} onChange={e => setProdType(e.target.value)} required>
                      <option value="">Select Product Type</option>
                      <option value="accessory">Accessory</option>
                      <option value="branded_merchandise">Branded Merchandise</option>
                    </select>
                  </div>
                </div>
                {prodType === 'accessory' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="label">Product Category *</label>
                      <select className="input" value={prodCategory} onChange={e => setProdCategory(e.target.value)} required={isVendor && prodType === 'accessory'}>
                        <option value="">Select Category</option>
                        {allowedCategories.map((cat: string) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="label">Product Status *</label>
                      <select className="input" value={prodStatus} onChange={e => setProdStatus(e.target.value)} required>
                        <option value="">Select Product Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="out_of_stock">Out of Stock</option>
                        <option value="eol">EOL</option>
                      </select>
                    </div>
                    {['Headphones', 'Speakers', 'Chargers and Cables', 'Memory', 'Wearable Tech', 'Watch Accessories'].includes(prodCategory) && (
                      <div style={{ gridColumn: '1 / -1', marginTop: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
                          Category-Specific Compatibility *
                        </span>
                        {renderCategorySpecificCompatibility()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="label">Product Status *</label>
                    <select className="input" value={prodStatus} onChange={e => setProdStatus(e.target.value)} required>
                      <option value="">Select Product Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="out_of_stock">Out of Stock</option>
                      <option value="eol">EOL</option>
                    </select>
                  </div>
                )}
              </div>

              {/* 2. Timeline & Attributes */}
              <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 16, marginBottom: 16 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>2. Timeline & Attributes</h4>
                <div style={{ display: 'grid', gridTemplateColumns: prodStatus === 'eol' ? '1fr 1fr 1fr' : '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="label">Launch Date *</label>
                    <input className="input" type="date" value={prodLaunchDate} onChange={e => setProdLaunchDate(e.target.value)} required={isVendor} />
                  </div>
                  <div className="form-group">
                    <label className="label">Release Date</label>
                    <input className="input" type="date" value={prodReleaseDate} onChange={e => setProdReleaseDate(e.target.value)} />
                  </div>
                  {prodStatus === 'eol' && (
                    <div className="form-group">
                      <label className="label">EOL Date *</label>
                      <input className="input" type="date" value={prodEolDate} onChange={e => setProdEolDate(e.target.value)} required />
                    </div>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="label">Color *</label>
                    <input className="input" placeholder="e.g. Midnight Black" value={prodColor} onChange={e => setProdColor(e.target.value)} required={isVendor} />
                  </div>
                  <MultiSelectColor selected={prodSystemColor} options={allowedColors} onChange={setProdSystemColor} label="System Color *" />
                  <div className="form-group">
                    <label className="label">Brand Warranty *</label>
                    <input className="input" placeholder="e.g. 1 Year Limited" value={prodWarranty} onChange={e => setProdWarranty(e.target.value)} required={isVendor} />
                  </div>
                </div>
              </div>

              {/* 3. Pricing & Inventory */}
              <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 16, marginBottom: 16 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>3. Pricing & Inventory</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="label">{isVendor ? 'Vendor Wholesale Price *' : 'Wholesale Price *'}</label>
                    <input className="input" type="number" step="0.01" value={prodPrice} onChange={e => setProdPrice(e.target.value)} required={isVendor} />
                  </div>
                  <div className="form-group">
                    <label className="label">Currency</label>
                    <input className="input" value={prodCurrency} onChange={e => setProdCurrency(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="label">Inventory Level</label>
                    <input className="input" type="number" placeholder="e.g. 100" value={prodInventoryLevel} onChange={e => setProdInventoryLevel(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="label">Inventory Threshold</label>
                    <input className="input" type="number" placeholder="e.g. 10" value={prodInventoryThreshold} onChange={e => setProdInventoryThreshold(e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="label">MSRP *</label>
                    <input className="input" type="number" step="0.01" placeholder="e.g. 29.99" value={prodMsrp} onChange={e => setProdMsrp(e.target.value)} required={isVendor} />
                  </div>
                  <div className="form-group">
                    <label className="label">MAP Price {isVendor && user?.company_map_pricing_enforced && '*'}</label>
                    <input className="input" type="number" step="0.01" placeholder="e.g. 24.99" value={prodMapPrice} onChange={e => setProdMapPrice(e.target.value)} required={isVendor && user?.company_map_pricing_enforced} />
                  </div>
                  <div className="form-group">
                    <label className="label">Sale Price</label>
                    <input className="input" type="number" step="0.01" placeholder="e.g. 19.99" value={prodSalePrice} onChange={e => setProdSalePrice(e.target.value)} />
                  </div>
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <input type="checkbox" id="recommended" checked={prodRecommendedAccessory} onChange={e => setProdRecommendedAccessory(e.target.checked)} />
                  <label htmlFor="recommended" style={{ fontSize: 13, cursor: 'pointer', color: 'var(--text-secondary)' }}>Recommended Accessory</label>
                </div>
              </div>

              {/* 4. Logistics & Shipping Dimensions */}
              <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 16, marginBottom: 16 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>4. Logistics & Dimensions</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
                  <div className="form-group">
                    <label className="label">Length (in) *</label>
                    <input className="input" type="number" step="0.001" placeholder="in" value={prodLength} onChange={e => setProdLength(e.target.value)} required={isVendor} />
                  </div>
                  <div className="form-group">
                    <label className="label">Width (in) *</label>
                    <input className="input" type="number" step="0.001" placeholder="in" value={prodWidth} onChange={e => setProdWidth(e.target.value)} required={isVendor} />
                  </div>
                  <div className="form-group">
                    <label className="label">Height (in) *</label>
                    <input className="input" type="number" step="0.001" placeholder="in" value={prodHeight} onChange={e => setProdHeight(e.target.value)} required={isVendor} />
                  </div>
                  <div className="form-group">
                    <label className="label">Weight (lbs) *</label>
                    <input className="input" type="number" step="0.001" placeholder="lbs" value={prodWeight} onChange={e => setProdWeight(e.target.value)} required={isVendor} />
                  </div>
                </div>
              </div>

              {/* 5. Detailed Descriptions */}
              <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 16, marginBottom: 16 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>5. Product Descriptions & Promo</h4>
                <div className="form-group">
                  <label className="label">Short Description</label>
                  <input className="input" placeholder="A brief catchphrase or summary…" value={prodShortDescription} onChange={e => setProdShortDescription(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="label">Product Description *</label>
                  <textarea className="input" style={{ minHeight: 80, resize: 'vertical', overflowY: 'auto' }} placeholder="Full detailed product capabilities and specifications…" value={prodDescription} onChange={e => setProdDescription(e.target.value)} required={isVendor} />
                </div>
                <div className="form-group">
                  <label className="label">Promo Information</label>
                  <input className="input" placeholder="e.g. Save 10% on orders above 100 units" value={prodPromoInformation} onChange={e => setProdPromoInformation(e.target.value)} />
                </div>
              </div>

              {/* 6. Media & Image Resources */}
              <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 16, marginBottom: 16 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>6. Product Media & Image URLs</h4>
                
                {/* File Upload (for primary image reference) */}
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="label">Primary Product Image File</label>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                    {imagePreviewUrl ? (
                      <img
                        src={imagePreviewUrl}
                        alt="Preview"
                        style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }}
                      />
                    ) : (
                      <div style={{ width: 56, height: 56, background: 'var(--bg-elevated)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)' }}>
                        <ShoppingBag size={18} />
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <input
                        type="file"
                        accept="image/*,.zip"
                        id="add-image-file"
                        style={{ display: 'none' }}
                        onChange={handleImageChange}
                        multiple
                      />
                      <label htmlFor="add-image-file" className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-block', width: 'fit-content' }}>
                        Choose File
                      </label>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>JPEG, PNG, WEBP, ZIP (Max 5MB)</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Or Primary Image URL / Asset ID</span>
                      <input
                        className="input input-sm"
                        placeholder="Paste image URL or asset ID"
                        value={prodPrimaryImageUrl}
                        onChange={e => {
                          setProdPrimaryImageUrl(e.target.value)
                          setImagePreviewUrl(e.target.value)
                        }}
                      />
                    </div>
                  </div>
                  {uploadedZipImages.length > 0 && (
                    <div style={{ marginTop: 10, padding: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Check size={14} style={{ color: 'var(--success)' }} /> Generated Image Links:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {uploadedZipImages.map((img, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: 'var(--bg-card)', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                              <img src={img.url} alt={img.name} style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }} />
                              <div style={{ overflow: 'hidden' }}>
                                <div style={{ fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{img.name}</div>
                                <div style={{ fontSize: 9, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{img.url}</div>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="btn btn-secondary btn-xs"
                              style={{ padding: '2px 6px', fontSize: 10, flexShrink: 0 }}
                              onClick={() => {
                                navigator.clipboard.writeText(img.url)
                                alert(`Copied link for ${img.name}!`)
                              }}
                            >
                              Copy Link
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="label">Additional Image URLs</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Image URL 1</span>
                      <input className="input" placeholder="https://example.com/image1.jpg" value={prodImageUrl1} onChange={e => setProdImageUrl1(e.target.value)} />
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Image URL 2</span>
                      <input className="input" placeholder="https://example.com/image2.jpg" value={prodImageUrl2} onChange={e => setProdImageUrl2(e.target.value)} />
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Image URL 3</span>
                      <input className="input" placeholder="https://example.com/image3.jpg" value={prodImageUrl3} onChange={e => setProdImageUrl3(e.target.value)} />
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Image URL 4</span>
                      <input className="input" placeholder="https://example.com/image4.jpg" value={prodImageUrl4} onChange={e => setProdImageUrl4(e.target.value)} />
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Image URL 5</span>
                      <input className="input" placeholder="https://example.com/image5.jpg" value={prodImageUrl5} onChange={e => setProdImageUrl5(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>

              {/* 7. SEO & Metadata */}
              <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 16, marginBottom: 16 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>7. SEO & Metadata</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="label">Meta Title</label>
                    <textarea className="input" style={{ minHeight: 80, resize: 'vertical', padding: '8px 10px', overflowY: 'auto' }} placeholder="SEO optimized title" value={prodMetaTitle} onChange={e => setProdMetaTitle(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="label">Meta Description</label>
                    <textarea className="input" style={{ minHeight: 80, resize: 'vertical', padding: '8px 10px', overflowY: 'auto' }} placeholder="SEO optimized description" value={prodMetaDescription} onChange={e => setProdMetaDescription(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* 8. Device Compatibility or Category-Specific Compatibility */}
              {['Cases', 'Screen Protection', 'Phone Attachments'].includes(prodCategory) && (
                <div className="form-group" style={{ marginBottom: 20, position: 'relative' }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                    8. Device Compatibility *
                  </h4>
                  
                  {/* Trigger Area showing tags */}
                  <div
                    onClick={() => setShowDeviceDropdown(!showDeviceDropdown)}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      padding: '8px 12px',
                      background: 'var(--bg-main)',
                      cursor: 'pointer',
                      minHeight: 40,
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 6,
                      alignItems: 'center',
                      marginTop: 4,
                    }}
                  >
                    {selectedDeviceIds.length === 0 ? (
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Select device compatibility...</span>
                    ) : (
                      selectedDeviceIds.map(id => {
                        const dev = devices.find((d: any) => d.id === id)
                        return (
                          <span
                            key={id}
                            style={{
                              background: 'var(--bg-elevated)',
                              border: '1px solid var(--border)',
                              color: 'var(--text-primary)',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: 12,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleDeviceSelection(id);
                            }}
                          >
                            {dev ? `${dev.manufacturer_name} ${dev.name}` : id.slice(0, 8)}
                            <X size={12} style={{ color: 'var(--red)', cursor: 'pointer' }} />
                          </span>
                        )
                      })
                    )}
                  </div>

                  {/* Dropdown Floating Panel */}
                  {showDeviceDropdown && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: 0,
                        right: 0,
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        boxShadow: '0 -4px 12px rgba(0,0,0,0.15)',
                        zIndex: 10,
                        marginBottom: 4,
                        padding: 10,
                      }}
                    >
                      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                        <input
                          type="text"
                          className="input"
                          placeholder="Search devices..."
                          value={deviceSearch}
                          onChange={e => setDeviceSearch(e.target.value)}
                          style={{ height: 32, fontSize: 13, padding: '4px 8px', flex: 1 }}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => { setShowDeviceDropdown(false); setDeviceSearch(''); }}
                          style={{ padding: '4px 8px', height: 32 }}
                        >
                          Done
                        </button>
                      </div>

                      <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {devices
                          .filter((dev: any) => {
                            const query = deviceSearch.toLowerCase()
                            const nameMatch = dev.name?.toLowerCase().includes(query)
                            const mfgMatch = dev.manufacturer_name?.toLowerCase().includes(query)
                            const skuMatch = dev.sku?.toLowerCase().includes(query)
                            return nameMatch || mfgMatch || skuMatch
                          })
                          .map((dev: any) => {
                            const isSelected = selectedDeviceIds.includes(dev.id)
                            return (
                              <div
                                key={dev.id}
                                onClick={() => toggleDeviceSelection(dev.id)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '6px 8px',
                                  borderRadius: 4,
                                  cursor: 'pointer',
                                  background: isSelected ? 'rgba(var(--accent-rgb), 0.1)' : 'transparent',
                                  transition: 'background 0.15s ease',
                                }}
                              >
                                <div style={{ flex: 1, fontSize: 13, color: isSelected ? 'var(--accent)' : 'var(--text-secondary)' }}>
                                  {dev.manufacturer_name} {dev.name} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({dev.sku})</span>
                                </div>
                                {isSelected && <Check size={14} style={{ color: 'var(--accent)' }} />}
                              </div>
                            )
                          })}
                        {devices.filter((dev: any) => {
                          const query = deviceSearch.toLowerCase()
                          return dev.name?.toLowerCase().includes(query) || dev.manufacturer_name?.toLowerCase().includes(query) || dev.sku?.toLowerCase().includes(query)
                        }).length === 0 && (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', padding: '6px 8px' }}>No matching devices found.</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}


              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
                <button type="button" className="btn btn-secondary" onClick={handleCloseAddModal}>Cancel</button>
                <button type="submit" className="btn btn-primary">List Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── EDIT PRODUCT MODAL ─────────────────────────────────────────────────── */}
      {showEditModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: 720, maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Edit Accessory Product</div>
              <button className="btn btn-ghost" style={{ padding: 4 }} onClick={handleCloseEditModal}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleEditProduct}>
              {formError && (
                <div style={{ background: 'var(--red-dim)', color: 'var(--red)', padding: '10px 12px', borderRadius: 6, marginBottom: 12, fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <AlertCircle size={14} />
                  <span>{formError}</span>
                </div>
              )}

              {/* 1. Basic & Identity Information */}
              <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 16, marginBottom: 16 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>1. Basic & Identity Information</h4>
                <div className="form-group">
                  <label className="label">Product Name *</label>
                  <input className="input" placeholder="e.g. Ultra Fast USB-C Charger" value={prodName} onChange={e => setProdName(e.target.value)} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="label">SKU *</label>
                    <input className="input" placeholder="e.g. ACC-USBC-01" value={prodSku} onChange={e => setProdSku(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="label">UPC *</label>
                    <input className="input" placeholder="e.g. 190123456789" value={prodUpc} onChange={e => setProdUpc(e.target.value)} required={isVendor} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="label">Brand *</label>
                    {isVendor ? (
                      <input
                        className="input"
                        placeholder="e.g. ChargeCore"
                        value={user?.company_name || ''}
                        disabled
                        required
                      />
                    ) : (
                      <select
                        className="input"
                        value={prodBrand}
                        onChange={e => setProdBrand(e.target.value)}
                        required
                      >
                        <option value="">Select Brand</option>
                        {allowedBrands.map((b: string) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="label">Product Type *</label>
                    <select className="input" value={prodType} onChange={e => setProdType(e.target.value)} required>
                      <option value="">Select Product Type</option>
                      <option value="accessory">Accessory</option>
                      <option value="branded_merchandise">Branded Merchandise</option>
                    </select>
                  </div>
                </div>
                {prodType === 'accessory' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="label">Product Category *</label>
                      <select className="input" value={prodCategory} onChange={e => setProdCategory(e.target.value)} required={isVendor && prodType === 'accessory'}>
                        <option value="">Select Category</option>
                        {allowedCategories.map((cat: string) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="label">Product Status *</label>
                      <select className="input" value={prodStatus} onChange={e => setProdStatus(e.target.value)} required>
                        <option value="">Select Product Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="out_of_stock">Out of Stock</option>
                        <option value="eol">EOL</option>
                      </select>
                    </div>
                    {['Headphones', 'Speakers', 'Chargers and Cables', 'Memory', 'Wearable Tech', 'Watch Accessories'].includes(prodCategory) && (
                      <div style={{ gridColumn: '1 / -1', marginTop: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
                          Category-Specific Compatibility *
                        </span>
                        {renderCategorySpecificCompatibility()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="label">Product Status *</label>
                    <select className="input" value={prodStatus} onChange={e => setProdStatus(e.target.value)} required>
                      <option value="">Select Product Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="out_of_stock">Out of Stock</option>
                      <option value="eol">EOL</option>
                    </select>
                  </div>
                )}
              </div>

              {/* 2. Timeline & Attributes */}
              <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 16, marginBottom: 16 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>2. Timeline & Attributes</h4>
                <div style={{ display: 'grid', gridTemplateColumns: prodStatus === 'eol' ? '1fr 1fr 1fr' : '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="label">Launch Date *</label>
                    <input className="input" type="date" value={prodLaunchDate} onChange={e => setProdLaunchDate(e.target.value)} required={isVendor} />
                  </div>
                  <div className="form-group">
                    <label className="label">Release Date</label>
                    <input className="input" type="date" value={prodReleaseDate} onChange={e => setProdReleaseDate(e.target.value)} />
                  </div>
                  {prodStatus === 'eol' && (
                    <div className="form-group">
                      <label className="label">EOL Date *</label>
                      <input className="input" type="date" value={prodEolDate} onChange={e => setProdEolDate(e.target.value)} required />
                    </div>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="label">Color *</label>
                    <input className="input" placeholder="e.g. Midnight Black" value={prodColor} onChange={e => setProdColor(e.target.value)} required={isVendor} />
                  </div>
                  <MultiSelectColor selected={prodSystemColor} options={allowedColors} onChange={setProdSystemColor} label="System Color *" />
                  <div className="form-group">
                    <label className="label">Brand Warranty *</label>
                    <input className="input" placeholder="e.g. 1 Year Limited" value={prodWarranty} onChange={e => setProdWarranty(e.target.value)} required={isVendor} />
                  </div>
                </div>
              </div>

              {/* 3. Pricing & Inventory */}
              <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 16, marginBottom: 16 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>3. Pricing & Inventory</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="label">{isVendor ? 'Vendor Wholesale Price *' : 'Wholesale Price *'}</label>
                    <input className="input" type="number" step="0.01" value={prodPrice} onChange={e => setProdPrice(e.target.value)} required={isVendor} />
                  </div>
                  <div className="form-group">
                    <label className="label">Currency</label>
                    <input className="input" value={prodCurrency} onChange={e => setProdCurrency(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="label">Inventory Level</label>
                    <input className="input" type="number" placeholder="e.g. 100" value={prodInventoryLevel} onChange={e => setProdInventoryLevel(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="label">Inventory Threshold</label>
                    <input className="input" type="number" placeholder="e.g. 10" value={prodInventoryThreshold} onChange={e => setProdInventoryThreshold(e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="label">MSRP *</label>
                    <input className="input" type="number" step="0.01" placeholder="e.g. 29.99" value={prodMsrp} onChange={e => setProdMsrp(e.target.value)} required={isVendor} />
                  </div>
                  <div className="form-group">
                    <label className="label">MAP Price {isVendor && user?.company_map_pricing_enforced && '*'}</label>
                    <input className="input" type="number" step="0.01" placeholder="e.g. 24.99" value={prodMapPrice} onChange={e => setProdMapPrice(e.target.value)} required={isVendor && user?.company_map_pricing_enforced} />
                  </div>
                  <div className="form-group">
                    <label className="label">Sale Price</label>
                    <input className="input" type="number" step="0.01" placeholder="e.g. 19.99" value={prodSalePrice} onChange={e => setProdSalePrice(e.target.value)} />
                  </div>
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <input type="checkbox" id="edit-recommended" checked={prodRecommendedAccessory} onChange={e => setProdRecommendedAccessory(e.target.checked)} />
                  <label htmlFor="edit-recommended" style={{ fontSize: 13, cursor: 'pointer', color: 'var(--text-secondary)' }}>Recommended Accessory</label>
                </div>
              </div>

              {/* 4. Logistics & Shipping Dimensions */}
              <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 16, marginBottom: 16 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>4. Logistics & Dimensions</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
                  <div className="form-group">
                    <label className="label">Length (in) *</label>
                    <input className="input" type="number" step="0.001" placeholder="in" value={prodLength} onChange={e => setProdLength(e.target.value)} required={isVendor} />
                  </div>
                  <div className="form-group">
                    <label className="label">Width (in) *</label>
                    <input className="input" type="number" step="0.001" placeholder="in" value={prodWidth} onChange={e => setProdWidth(e.target.value)} required={isVendor} />
                  </div>
                  <div className="form-group">
                    <label className="label">Height (in) *</label>
                    <input className="input" type="number" step="0.001" placeholder="in" value={prodHeight} onChange={e => setProdHeight(e.target.value)} required={isVendor} />
                  </div>
                  <div className="form-group">
                    <label className="label">Weight (lbs) *</label>
                    <input className="input" type="number" step="0.001" placeholder="lbs" value={prodWeight} onChange={e => setProdWeight(e.target.value)} required={isVendor} />
                  </div>
                </div>
              </div>

              {/* 5. Detailed Descriptions */}
              <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 16, marginBottom: 16 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>5. Product Descriptions & Promo</h4>
                <div className="form-group">
                  <label className="label">Short Description</label>
                  <input className="input" placeholder="A brief catchphrase or summary…" value={prodShortDescription} onChange={e => setProdShortDescription(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="label">Product Description *</label>
                  <textarea className="input" style={{ minHeight: 80, resize: 'vertical', overflowY: 'auto' }} placeholder="Full detailed product capabilities and specifications…" value={prodDescription} onChange={e => setProdDescription(e.target.value)} required={isVendor} />
                </div>
                <div className="form-group">
                  <label className="label">Promo Information</label>
                  <input className="input" placeholder="e.g. Save 10% on orders above 100 units" value={prodPromoInformation} onChange={e => setProdPromoInformation(e.target.value)} />
                </div>
              </div>

              {/* 6. Media & Image Resources */}
              <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 16, marginBottom: 16 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>6. Product Media & Image URLs</h4>
                
                {/* File Upload (for primary image reference) */}
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="label">Primary Product Image File</label>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                    {imagePreviewUrl ? (
                      <img
                        src={imagePreviewUrl}
                        alt="Preview"
                        style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }}
                      />
                    ) : (
                      <div style={{ width: 56, height: 56, background: 'var(--bg-elevated)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)' }}>
                        <ShoppingBag size={18} />
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <input
                        type="file"
                        accept="image/*,.zip"
                        id="edit-image-file"
                        style={{ display: 'none' }}
                        onChange={handleImageChange}
                        multiple
                      />
                      <label htmlFor="edit-image-file" className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-block', width: 'fit-content' }}>
                        Choose File
                      </label>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>JPEG, PNG, WEBP, ZIP (Leave blank to keep current)</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Or Primary Image URL / Asset ID</span>
                      <input
                        className="input input-sm"
                        placeholder="Paste image URL or asset ID"
                        value={prodPrimaryImageUrl}
                        onChange={e => {
                          setProdPrimaryImageUrl(e.target.value)
                          setImagePreviewUrl(e.target.value)
                        }}
                      />
                    </div>
                  </div>
                  {uploadedZipImages.length > 0 && (
                    <div style={{ marginTop: 10, padding: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Check size={14} style={{ color: 'var(--success)' }} /> Generated Image Links:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {uploadedZipImages.map((img, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: 'var(--bg-card)', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                              <img src={img.url} alt={img.name} style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }} />
                              <div style={{ overflow: 'hidden' }}>
                                <div style={{ fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{img.name}</div>
                                <div style={{ fontSize: 9, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{img.url}</div>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="btn btn-secondary btn-xs"
                              style={{ padding: '2px 6px', fontSize: 10, flexShrink: 0 }}
                              onClick={() => {
                                navigator.clipboard.writeText(img.url)
                                alert(`Copied link for ${img.name}!`)
                              }}
                            >
                              Copy Link
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="label">Additional Image URLs</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Image URL 1</span>
                      <input className="input" placeholder="https://example.com/image1.jpg" value={prodImageUrl1} onChange={e => setProdImageUrl1(e.target.value)} />
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Image URL 2</span>
                      <input className="input" placeholder="https://example.com/image2.jpg" value={prodImageUrl2} onChange={e => setProdImageUrl2(e.target.value)} />
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Image URL 3</span>
                      <input className="input" placeholder="https://example.com/image3.jpg" value={prodImageUrl3} onChange={e => setProdImageUrl3(e.target.value)} />
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Image URL 4</span>
                      <input className="input" placeholder="https://example.com/image4.jpg" value={prodImageUrl4} onChange={e => setProdImageUrl4(e.target.value)} />
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Image URL 5</span>
                      <input className="input" placeholder="https://example.com/image5.jpg" value={prodImageUrl5} onChange={e => setProdImageUrl5(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>

              {/* 7. SEO & Metadata */}
              <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 16, marginBottom: 16 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>7. SEO & Metadata</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="label">Meta Title</label>
                    <textarea className="input" style={{ minHeight: 80, resize: 'vertical', padding: '8px 10px', overflowY: 'auto' }} placeholder="SEO optimized title" value={prodMetaTitle} onChange={e => setProdMetaTitle(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="label">Meta Description</label>
                    <textarea className="input" style={{ minHeight: 80, resize: 'vertical', padding: '8px 10px', overflowY: 'auto' }} placeholder="SEO optimized description" value={prodMetaDescription} onChange={e => setProdMetaDescription(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* 8. Device Compatibility or Category-Specific Compatibility */}
              {['Cases', 'Screen Protection', 'Phone Attachments'].includes(prodCategory) && (
                <div className="form-group" style={{ marginBottom: 20, position: 'relative' }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                    8. Device Compatibility *
                  </h4>
                  
                  {/* Trigger Area showing tags */}
                  <div
                    onClick={() => setShowDeviceDropdown(!showDeviceDropdown)}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      padding: '8px 12px',
                      background: 'var(--bg-main)',
                      cursor: 'pointer',
                      minHeight: 40,
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 6,
                      alignItems: 'center',
                      marginTop: 4,
                    }}
                  >
                    {selectedDeviceIds.length === 0 ? (
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Select device compatibility...</span>
                    ) : (
                      selectedDeviceIds.map(id => {
                        const dev = devices.find((d: any) => d.id === id)
                        return (
                          <span
                            key={id}
                            style={{
                              background: 'var(--bg-elevated)',
                              border: '1px solid var(--border)',
                              color: 'var(--text-primary)',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: 12,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleDeviceSelection(id);
                            }}
                          >
                            {dev ? `${dev.manufacturer_name} ${dev.name}` : id.slice(0, 8)}
                            <X size={12} style={{ color: 'var(--red)', cursor: 'pointer' }} />
                          </span>
                        )
                      })
                    )}
                  </div>

                  {/* Dropdown Floating Panel */}
                  {showDeviceDropdown && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: 0,
                        right: 0,
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        boxShadow: '0 -4px 12px rgba(0,0,0,0.15)',
                        zIndex: 10,
                        marginBottom: 4,
                        padding: 10,
                      }}
                    >
                      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                        <input
                          type="text"
                          className="input"
                          placeholder="Search devices..."
                          value={deviceSearch}
                          onChange={e => setDeviceSearch(e.target.value)}
                          style={{ height: 32, fontSize: 13, padding: '4px 8px', flex: 1 }}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => { setShowDeviceDropdown(false); setDeviceSearch(''); }}
                          style={{ padding: '4px 8px', height: 32 }}
                        >
                          Done
                        </button>
                      </div>

                      <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {devices
                          .filter((dev: any) => {
                            const query = deviceSearch.toLowerCase()
                            const nameMatch = dev.name?.toLowerCase().includes(query)
                            const mfgMatch = dev.manufacturer_name?.toLowerCase().includes(query)
                            const skuMatch = dev.sku?.toLowerCase().includes(query)
                            return nameMatch || mfgMatch || skuMatch
                          })
                          .map((dev: any) => {
                            const isSelected = selectedDeviceIds.includes(dev.id)
                            return (
                              <div
                                key={dev.id}
                                onClick={() => toggleDeviceSelection(dev.id)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '6px 8px',
                                  borderRadius: 4,
                                  cursor: 'pointer',
                                  background: isSelected ? 'rgba(var(--accent-rgb), 0.1)' : 'transparent',
                                  transition: 'background 0.15s ease',
                                }}
                              >
                                <div style={{ flex: 1, fontSize: 13, color: isSelected ? 'var(--accent)' : 'var(--text-secondary)' }}>
                                  {dev.manufacturer_name} {dev.name} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({dev.sku})</span>
                                </div>
                                {isSelected && <Check size={14} style={{ color: 'var(--accent)' }} />}
                              </div>
                            )
                          })}
                        {devices.filter((dev: any) => {
                          const query = deviceSearch.toLowerCase()
                          return dev.name?.toLowerCase().includes(query) || dev.manufacturer_name?.toLowerCase().includes(query) || dev.sku?.toLowerCase().includes(query)
                        }).length === 0 && (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', padding: '6px 8px' }}>No matching devices found.</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}


              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
                <button type="button" className="btn btn-secondary" onClick={handleCloseEditModal}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MANAGE PRODUCT (DETAILS) MODAL ─────────────────────────────────────── */}
      {showManageModal && selectedManageProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: 640, maxWidth: '95%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{isBuyer ? 'Product Details' : 'Manage Accessory'}</div>
              <button className="btn btn-ghost" style={{ padding: 4 }} onClick={() => setShowManageModal(false)}>
                <X size={16} />
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: 16, marginBottom: 18 }}>
              {selectedManageProduct.primary_image_url ? (
                <img
                  src={getImageUrl(selectedManageProduct.primary_image_url)}
                  alt={selectedManageProduct.name}
                  style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }}
                />
              ) : (
                <div style={{ width: 80, height: 80, background: 'var(--bg-elevated)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  <ShoppingBag size={28} />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: 17, fontWeight: 650, color: 'var(--text-primary)' }}>{selectedManageProduct.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Brand: {selectedManageProduct.brand || '—'} | SKU: {selectedManageProduct.sku}</div>
                <div style={{ fontSize: 14, color: 'var(--accent)', fontWeight: 600, marginTop: 4 }}>
                  {isBuyer
                    ? formatCurrency(selectedManageProduct.buyer_wholesale_price, selectedManageProduct.vendor_wholesale_price_currency)
                    : formatCurrency(selectedManageProduct.vendor_wholesale_price_amount, selectedManageProduct.vendor_wholesale_price_currency)
                  }
                </div>
              </div>
            </div>

            {/* Tab navigation */}
            {!isBuyer && (
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 16, gap: 16 }}>
                {[
                  { id: 'details', label: 'Details' },
                  { id: 'compatibility', label: 'Device Compatibility' },
                  { id: 'bulk', label: 'Bulk Update' },
                  { id: 'audit', label: 'Audit Trail' }
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setManageTab(t.id as any)}
                    style={{
                      padding: '8px 4px',
                      fontSize: 13,
                      fontWeight: manageTab === t.id ? 600 : 500,
                      color: manageTab === t.id ? 'var(--accent)' : 'var(--text-secondary)',
                      borderBottom: manageTab === t.id ? '2px solid var(--accent)' : 'none',
                      background: 'none',
                      borderLeft: 'none',
                      borderRight: 'none',
                      borderTop: 'none',
                      cursor: 'pointer',
                      outline: 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            {/* 1. Details Tab */}
            {(manageTab === 'details' || isBuyer) && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, background: 'var(--bg-elevated)', padding: 10, borderRadius: 6 }}>
                    {selectedManageProduct.description || 'No description provided.'}
                  </div>
                </div>

                {/* Specifications & Metadata */}
                <div style={{ marginBottom: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Specifications & Metadata</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>
                    {isBuyer ? (
                      <>
                        {selectedManageProduct.msrp && <div><strong>MSRP:</strong> {formatCurrency(selectedManageProduct.msrp)}</div>}
                        {selectedManageProduct.color && <div><strong>Color:</strong> {selectedManageProduct.color}</div>}
                        {selectedManageProduct.warranty && <div><strong>Warranty:</strong> {selectedManageProduct.warranty}</div>}
                      </>
                    ) : (
                      <>
                        {selectedManageProduct.upc && <div><strong>UPC:</strong> {selectedManageProduct.upc}</div>}
                        {selectedManageProduct.msrp && <div><strong>MSRP:</strong> {formatCurrency(selectedManageProduct.msrp)}</div>}
                        {selectedManageProduct.map_price && <div><strong>MAP Price:</strong> {formatCurrency(selectedManageProduct.map_price)}</div>}
                        {selectedManageProduct.sale_price && <div><strong>Sale Price:</strong> {formatCurrency(selectedManageProduct.sale_price)}</div>}
                        {selectedManageProduct.color && <div><strong>Color:</strong> {selectedManageProduct.color}</div>}
                        {selectedManageProduct.system_color && <div><strong>System Color:</strong> {selectedManageProduct.system_color}</div>}
                        {selectedManageProduct.inventory_level !== undefined && selectedManageProduct.inventory_level !== null && <div><strong>Inventory:</strong> {selectedManageProduct.inventory_level} units</div>}
                        {selectedManageProduct.warranty && <div><strong>Warranty:</strong> {selectedManageProduct.warranty}</div>}
                        {(selectedManageProduct.length || selectedManageProduct.width || selectedManageProduct.height) && (
                          <div><strong>Dimensions:</strong> {selectedManageProduct.length || 0}L × {selectedManageProduct.width || 0}W × {selectedManageProduct.height || 0}H in</div>
                        )}
                        {selectedManageProduct.weight && <div><strong>Weight:</strong> {selectedManageProduct.weight} lbs</div>}
                        {selectedManageProduct.recommended_accessory && <div><strong>Status:</strong> Recommended Accessory</div>}
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* 2. Device Compatibility Tab */}
            {manageTab === 'compatibility' && !isBuyer && (
              <div style={{ maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
                {/* Recalculate button (admin only) */}
                {isCixciAdmin && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleManualRecalculate}
                      disabled={isRecalculating}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <RefreshCw size={13} className={isRecalculating ? 'spin' : ''} />
                      {isRecalculating ? 'Recalculating...' : 'Trigger Manual Recalculation'}
                    </button>
                  </div>
                )}

                {/* Add single device quick-form */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 16, background: 'var(--bg-elevated)', padding: 10, borderRadius: 6 }}>
                  <select
                    id="quick-add-device-select"
                    style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '6px 10px', borderRadius: 4, fontSize: 13 }}
                    value={quickAddDeviceId}
                    onChange={e => setQuickAddDeviceId(e.target.value)}
                  >
                    <option value="">-- Select Device to Add --</option>
                    {devices
                      .filter((d: any) => !activeCompatibilities?.some((c: any) => c.device_reference === d.id && !c.is_excluded))
                      .map((d: any) => (
                        <option key={d.id} value={d.id}>
                          {d.manufacturer_name} {d.name}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleQuickAddDevice}
                    disabled={!quickAddDeviceId}
                  >
                    <Plus size={14} /> Add Device
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {!activeCompatibilities || activeCompatibilities.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                      No target devices mapped.
                    </div>
                  ) : (
                    activeCompatibilities.map((c: any) => {
                      const dev = devices.find((d: any) => d.id === c.device_reference)
                      const deviceName = dev ? `${dev.manufacturer_name} ${dev.name}` : c.device_reference.slice(0, 8)
                      return (
                        <div key={c.id} style={{ display: 'flex', flexDirection: 'column', padding: 10, border: '1px solid var(--border)', borderRadius: 6, background: c.is_excluded ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-elevated)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{deviceName}</span>
                              {c.is_locked && (
                                <span className="badge badge-amber" style={{ fontSize: 10, padding: '2px 6px' }}>Locked</span>
                              )}
                              {c.is_excluded ? (
                                <span className="badge badge-red" style={{ fontSize: 10, padding: '2px 6px' }}>Excluded</span>
                              ) : (
                                <span className="badge badge-green" style={{ fontSize: 10, padding: '2px 6px' }}>Active</span>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {/* Action: Restore */}
                              {c.is_excluded && (
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '3px 8px', fontSize: 11 }}
                                  onClick={() => handleRestoreCompatibility(c.device_reference, c.exclusion_type, c.is_locked)}
                                >
                                  Restore
                                </button>
                              )}

                              {/* Action: Exclude */}
                              {!c.is_excluded && (
                                <button
                                  type="button"
                                  className="btn btn-danger btn-sm"
                                  style={{ padding: '3px 8px', fontSize: 11, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--red)' }}
                                  onClick={() => handleOpenExcludeModal(dev || { id: c.device_reference, name: deviceName })}
                                >
                                  Exclude
                                </button>
                              )}

                              {/* Action: Lock (Admin only) */}
                              {isCixciAdmin && !c.is_locked && (
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '3px 8px', fontSize: 11 }}
                                  onClick={() => handleLockCompatibility(c.device_reference)}
                                >
                                  Lock
                                </button>
                              )}

                              {/* Action: Convert to Admin Exclusion (Admin only) */}
                              {isCixciAdmin && c.is_excluded && c.exclusion_type === 'vendor' && (
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '3px 8px', fontSize: 11 }}
                                  onClick={() => handleConvertToAdminExclusion(c.device_reference)}
                                >
                                  Convert to Admin Exclusion
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Exclusion Details */}
                          {c.is_excluded && (
                            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-secondary)', borderTop: '1px dashed var(--border)', paddingTop: 4 }}>
                              <strong>Exclusion Reason:</strong> {c.exclusion_reason} ({c.exclusion_type} level)<br />
                              {c.notes && <div><strong>Notes:</strong> {c.notes}</div>}
                            </div>
                          )}

                          {/* Mapping Metadata */}
                          <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                            Source: {c.match_source} | Status at Mapping: {c.device_status_at_mapping || 'Unknown'} | Launch Date: {c.device_launch_date_at_mapping || 'None'}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}

            {/* 3. Bulk Compatibility Tab */}
            {manageTab === 'bulk' && !isBuyer && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 300, overflowY: 'auto' }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Select devices and choose the update type. 
                  {selectedManageProduct.status === 'active' && !isCixciAdmin && (
                    <div style={{ color: 'var(--amber)', fontSize: 12, marginTop: 4, fontWeight: 500 }}>
                      ⚠️ Note: Replacing or removing compatibility assertions on active products requires CIXCI Admin privileges.
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 16, alignItems: 'center', background: 'var(--bg-elevated)', padding: 10, borderRadius: 6 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>UPDATE TYPE</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[
                        { id: 'add', label: 'Add Mappings' },
                        { id: 'replace', label: 'Replace All Mappings' },
                        { id: 'remove', label: 'Remove Mappings' }
                      ].map(type => (
                        <button
                          key={type.id}
                          type="button"
                          className={`btn btn-sm ${bulkUpdateType === type.id ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setBulkUpdateType(type.id as any)}
                          disabled={selectedManageProduct.status === 'active' && !isCixciAdmin && type.id !== 'add'}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ border: '1px solid var(--border)', borderRadius: 6, padding: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Select Devices ({bulkSelectedDevices.length} selected)
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                        style={{ fontSize: 11, padding: '2px 6px' }}
                        onClick={() => setBulkSelectedDevices(devices.map((d: any) => d.id))}
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                        style={{ fontSize: 11, padding: '2px 6px' }}
                        onClick={() => setBulkSelectedDevices([])}
                      >
                        Clear Selection
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', maxHeight: 180, overflowY: 'auto', paddingRight: 4 }}>
                    {devices.map((d: any) => {
                      const isChecked = bulkSelectedDevices.includes(d.id)
                      return (
                        <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-primary)', cursor: 'pointer' }}>
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
                        </label>
                      )
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ marginTop: 6 }}
                  onClick={handleBulkCompatUpdate}
                  disabled={bulkSelectedDevices.length === 0}
                >
                  Execute Bulk Update ({bulkSelectedDevices.length} items)
                </button>
              </div>
            )}

            {/* 4. Audit History Tab */}
            {manageTab === 'audit' && !isBuyer && (
              <div style={{ maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
                {isLoadingAudit ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                    Loading audit trail history...
                  </div>
                ) : !auditHistory || auditHistory.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                    No compatibility audit records found for this product.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {auditHistory.map((item: any) => {
                      const dateStr = new Date(item.created_at).toLocaleString()
                      const p = item.payload
                      return (
                        <div key={item.id} style={{ border: '1px solid var(--border)', borderRadius: 6, padding: 10, background: 'var(--bg-elevated)', fontSize: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: 4, fontSize: 11 }}>
                            <span>{dateStr}</span>
                            <span>Source: {item.change_source || 'System'}</span>
                          </div>
                          <div style={{ color: 'var(--text-primary)', fontWeight: 500, marginBottom: 4 }}>
                            Device compatibility status transitioned from <strong>{p.previous_mapping_status}</strong> to <strong>{p.new_mapping_status}</strong> for <strong>{p.device_name}</strong>
                          </div>
                          <div style={{ color: 'var(--text-secondary)', paddingLeft: 6, borderLeft: '2px solid var(--border)' }}>
                            {p.exclusion_reason && p.exclusion_reason !== 'None' && (
                              <div>• <strong>Exclusion Reason:</strong> {p.exclusion_reason}</div>
                            )}
                            {p.changed_by && (
                              <div>• <strong>Actor:</strong> {p.changed_by}</div>
                            )}
                            {p.change_source && (
                              <div>• <strong>Details:</strong> {p.change_source}</div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16 }}>
              {isBuyer ? (
                <div style={{ display: 'flex', width: '100%', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowManageModal(false)}>Close</button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ background: 'var(--red-dim)', color: 'var(--red)' }}
                    onClick={() => handleDeleteProduct(selectedManageProduct.id)}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowManageModal(false)}>Close</button>
                    <button type="button" className="btn btn-primary" onClick={() => openEditModal(selectedManageProduct)}>
                      <Edit size={14} /> Edit Product
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── EXCLUSION REASON MODAL ──────────────────────────────────────────────── */}
      {showExcludeModal && excludeDevice && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div className="card" style={{ width: 400, maxWidth: '95%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Exclude Device Compatibility</div>
              <button className="btn btn-ghost" style={{ padding: 4 }} onClick={() => { setShowExcludeModal(false); setExcludeDevice(null); }}>
                <X size={16} />
              </button>
            </div>
            
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
              Define the exclusion reason for <strong>{excludeDevice.manufacturer_name ? `${excludeDevice.manufacturer_name} ${excludeDevice.name}` : excludeDevice.name}</strong>.
            </div>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="label">Exclusion Reason Code *</label>
              <select
                id="exclusion-reason-select"
                style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '6px 10px', borderRadius: 4, fontSize: 13 }}
                value={excludeReason}
                onChange={e => setExcludeReason(e.target.value)}
              >
                <option value="physical_mismatch">Physical Mismatch</option>
                <option value="connector_incompatibility">Connector Incompatibility</option>
                <option value="power_spec_conflict">Power Spec Conflict</option>
                <option value="firmware_os_limitation">Firmware / OS Limitation</option>
                <option value="performance_issue">Performance Issue</option>
                <option value="regulatory_unsupported">Regulatory Unsupported</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="label">Notes {excludeReason === 'other' ? '*' : '(Optional)'}</label>
              <textarea
                id="exclusion-notes-textarea"
                style={{ width: '100%', height: 70, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '6px 10px', borderRadius: 4, fontSize: 13, resize: 'none' }}
                value={excludeNotes}
                onChange={e => setExcludeNotes(e.target.value)}
                placeholder={excludeReason === 'other' ? 'Descriptive notes are required...' : 'Add any additional notes...'}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowExcludeModal(false); setExcludeDevice(null); }}>Cancel</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmitExclusion}
                disabled={excludeReason === 'other' && !excludeNotes.trim()}
              >
                Exclude Device
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── BULK UPLOAD MODAL ─────────────────────────────────────────────────── */}
      {showBulkModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: csvPreviewRows.length > 0 ? 1100 : 480, maxWidth: '95%', transition: 'all 0.2s ease-in-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Bulk Import Products</div>
              <button className="btn btn-ghost" style={{ padding: 4 }} onClick={handleCloseBulkModal} >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleBulkUploadSubmit}>
              {bulkError && (
                <div style={{ background: 'var(--red-dim)', color: 'var(--red)', padding: '10px 12px', borderRadius: 6, marginBottom: 12, fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <AlertCircle size={14} />
                  <span>{bulkError}</span>
                </div>
              )}

              {validation.hasErrors && (
                <div style={{ background: 'var(--red-dim)', color: 'var(--red)', padding: '10px 12px', borderRadius: 6, marginBottom: 12, fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <AlertCircle size={14} />
                  <span>Validation failed. Please correct the highlighted cells in the data grid below before uploading.</span>
                </div>
              )}

              {bulkResult && (
                <div style={{ background: 'var(--bg-elevated)', padding: 12, borderRadius: 8, marginBottom: 14 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--green)', fontWeight: 600, fontSize: 14 }}>
                    <Check size={16} />
                    <span>
                      Bulk upload complete. Processed: {bulkResult.total_rows_processed} | Passed: {bulkResult.rows_passed} | Failed: {bulkResult.rows_failed} | Staged: {bulkResult.rows_staged}
                    </span>
                  </div>
                  {bulkResult.errors && bulkResult.errors.length > 0 && (
                    <div style={{ marginTop: 8, fontSize: 12, maxHeight: 150, overflowY: 'auto' }}>
                      <div style={{ fontWeight: 600, color: 'var(--red)', marginBottom: 4 }}>Errors encountered:</div>
                      {bulkResult.errors.map((err: any, i: number) => {
                        const errMsg = typeof err === 'object' && err !== null
                          ? `Row ${err.row_number || '?'}${err.column_name ? ` (Col: ${err.column_name})` : ''}: ${err.validation_error || JSON.stringify(err)}${err.recommended_correction ? ` [Correction: ${err.recommended_correction}]` : ''}`
                          : String(err);
                        return (
                          <div key={i} style={{ color: 'var(--text-secondary)', marginBottom: 4, paddingLeft: 8, borderLeft: '2px solid var(--red)' }}>
                            {errMsg}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label className="label">Catalog Template Guidelines</label>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleDownloadTemplate} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', fontSize: 11 }}>
                    <Download size={12} /> Download CSV Template
                  </button>
                </div>
                <div style={{ background: 'var(--bg-elevated)', padding: 10, borderRadius: 6, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 14 }}>
                  Upload a <strong>.csv</strong> or <strong>.xlsx</strong> file containing catalog rows. Supported columns:<br />
                  • <strong>Accessory Name</strong> (Required)<br />
                  • <strong>SKU</strong> (Required, unique)<br />
                  • <strong>Brand</strong>, <strong>Product Category</strong><br />
                  • <strong>Vendor Wholesale Price</strong>, <strong>MSRP</strong>, <strong>MAP Price</strong><br />
                  • <strong>Device Compatibility</strong> (comma-separated)<br />
                  • <strong>Dimensions (Length, Width, Height, Weight)</strong>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="label">Update Mode</label>
                <select
                  className="form-control"
                  style={{ marginTop: 4, width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', color: 'var(--text-primary)' }}
                  value={updateMode}
                  onChange={e => setUpdateMode(e.target.value)}
                >
                  <option value="create_only">Create Product Only</option>
                  <option value="update_only">Update Product Only</option>
                  <option value="upsert">Create/ Update Product Only</option>
                </select>
              </div>

              <div className="form-group">
                <label className="label">Select File (.csv, .xlsx)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    key="bulk-import-file-input"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0]
                        setBulkFile(file)
                        setBulkResult(null)
                        setBulkError(null)
                        
                        if (file.name.endsWith('.csv')) {
                          const reader = new FileReader()
                          reader.onload = (evt) => {
                            const text = evt.target?.result as string
                            const parsed = parseCSV(text)
                            if (parsed.length > 0) {
                              setCsvHeaders(parsed[0])
                              setCsvPreviewRows(parsed.slice(1))
                            }
                          }
                          reader.readAsText(file)
                        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                          const reader = new FileReader()
                          reader.onload = (evt) => {
                            try {
                              const data = evt.target?.result
                              const workbook = XLSX.read(data, { type: 'array' })
                              const sheetName = workbook.SheetNames[0]
                              const sheet = workbook.Sheets[sheetName]
                              const parsed = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 })
                              if (parsed.length > 0) {
                                const filtered = parsed.filter(row => Array.isArray(row) && row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== ''))
                                const stringified = filtered.map(row => row.map(cell => cell !== null && cell !== undefined ? String(cell) : ''))
                                if (stringified.length > 0) {
                                  setCsvHeaders(stringified[0])
                                  setCsvPreviewRows(stringified.slice(1))
                                }
                              }
                            } catch (err) {
                              console.error("Failed to parse Excel preview:", err)
                              setCsvHeaders([])
                              setCsvPreviewRows([])
                            }
                          }
                          reader.readAsArrayBuffer(file)
                        } else {
                          setCsvHeaders([])
                          setCsvPreviewRows([])
                        }
                      }
                    }}
                    required
                  />
                </div>
              </div>

              {csvPreviewRows.length > 0 && (
                <div className="form-group" style={{ marginTop: 14 }}>
                  <label className="label">Data Grid (All Rows & Columns - Click any cell to edit)</label>
                  <div style={{ overflow: 'auto', border: '1px solid var(--border)', borderRadius: 6, maxHeight: 320, background: 'var(--bg-main)', marginTop: 4 }}>
                    <table style={{ minWidth: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 1 }}>
                          <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--text-primary)', minWidth: 120 }}>Validation Status</th>
                          {csvHeaders.map((h, i) => (
                            <th key={i} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--text-primary)', minWidth: 140 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreviewRows.map((row, rowIdx) => {
                          const errors = validation.rowErrors[rowIdx] || []
                          const isRowClean = errors.length === 0
                          
                          return (
                            <tr key={rowIdx} style={{ borderBottom: rowIdx < csvPreviewRows.length - 1 ? '1px solid var(--border-light)' : 'none', background: isRowClean ? 'transparent' : 'rgba(239, 68, 68, 0.03)' }}>
                              <td style={{ padding: '6px 10px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                {isRowClean ? (
                                  <span style={{ color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                                    <Check size={14} /> Ok
                                  </span>
                                ) : (
                                  <span
                                    title={errors.join(' | ')}
                                    style={{ color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500, cursor: 'help' }}
                                  >
                                    <AlertCircle size={14} /> {errors[0]}
                                  </span>
                                )}
                              </td>
                              {row.map((cell, colIdx) => {
                                const hasError = !!validation.cellErrors[`${rowIdx}-${colIdx}`]
                                return (
                                  <td key={colIdx} style={{ padding: '4px 6px' }}>
                                    <CellInput
                                      value={cell}
                                      hasError={hasError}
                                      headerName={csvHeaders[colIdx]}
                                      onSave={(newVal) => {
                                        setCsvPreviewRows(prev => {
                                          const updated = [...prev]
                                          updated[rowIdx] = [...updated[rowIdx]]
                                          updated[rowIdx][colIdx] = newVal
                                          return updated
                                        })
                                      }}
                                    />
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={handleCloseBulkModal}>
                  Close
                </button>
                <button type="submit" className="btn btn-primary" disabled={uploadingBulk || csvPreviewRows.length === 0 || validation.hasErrors}>
                  {uploadingBulk ? 'Uploading…' : 'Upload Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── EXPORT JOB MODAL ──────────────────────────────────────────────────── */}
      {showExportModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: 420, maxWidth: '95%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Export Compatibility Catalog</div>
              <button className="btn btn-ghost" style={{ padding: 4 }} onClick={() => setShowExportModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleStartExport}>
              {exportError && (
                <div style={{ background: 'var(--red-dim)', color: 'var(--red)', padding: '10px 12px', borderRadius: 6, marginBottom: 12, fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <AlertCircle size={14} />
                  <span>{exportError}</span>
                </div>
              )}
              <div className="form-group">
                <label className="label">Export Format</label>
                <select className="input" value={exportFormat} onChange={e => setExportFormat(e.target.value)}>
                  <option value="csv">CSV (Comma Separated)</option>
                  <option value="json">JSON (Structured Data)</option>
                  <option value="xlsx">Excel Workbook (XLSX)</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0' }}>
                <input
                  type="checkbox"
                  id="include_incomp"
                  checked={includeIncompatible}
                  onChange={e => setIncludeIncompatible(e.target.checked)}
                />
                <label htmlFor="include_incomp" style={{ fontSize: 13, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  Include Incompatible Products
                </label>
              </div>
              <div style={{ background: 'var(--bg-elevated)', padding: 12, borderRadius: 8, fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                This creates a background export task for {selectedIds.length} selected accessory products. Output will be available in the "Export Jobs" tab.
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowExportModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Start Export Job</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDropdownManagerModal && isCixciAdmin && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: 500, maxWidth: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid var(--border-light)', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>
                {editingCategoryConfig ? 'Configure Category Compatibility' : 'Manage Dropdown Values'}
              </div>
              <button className="btn btn-ghost" style={{ padding: 4 }} onClick={() => { setShowDropdownManagerModal(false); setEditingCategoryConfig(null); }}>
                <X size={16} />
              </button>
            </div>

            {dropdownError && (
              <div style={{ background: 'var(--red-dim)', color: 'var(--red)', padding: '10px 12px', borderRadius: 6, marginBottom: 12, fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}>
                <AlertCircle size={14} />
                <span>{dropdownError}</span>
              </div>
            )}

            {editingCategoryConfig ? (
              <form onSubmit={handleSaveCategoryConfig} style={{ display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flex: 1, paddingRight: 4 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Configuring Category: <span style={{ color: 'var(--primary)' }}>{editingCategoryConfig.value}</span>
                </div>

                <div className="form-group">
                  <label className="label" style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Compatibility Mode</label>
                  <select
                    className="input"
                    value={categoryConfigMode}
                    onChange={e => setCategoryConfigMode(e.target.value)}
                  >
                    <option value="feature_based">Feature Based Rule Mapping</option>
                    <option value="explicit">Explicit Device-Model Mapping</option>
                    <option value="inactive">Disabled</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="label" style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Status</label>
                  <select
                    className="input"
                    value={categoryConfigStatus}
                    onChange={e => setCategoryConfigStatus(e.target.value)}
                  >
                    <option value="active">Active</option>
                    <option value="setup_required">Setup Required</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="label" style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Match Logic</label>
                  <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="match_logic"
                        value="AND"
                        checked={categoryConfigMatchLogic === 'AND'}
                        onChange={e => setCategoryConfigMatchLogic(e.target.value)}
                      />
                      AND (All fields must match)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="match_logic"
                        value="OR"
                        checked={categoryConfigMatchLogic === 'OR'}
                        onChange={e => setCategoryConfigMatchLogic(e.target.value)}
                      />
                      OR (At least one field must match)
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label className="label" style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Eligible Device Types</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                    {deviceTypes.map((dt: any) => {
                      const code = dt.code || dt.name.toLowerCase()
                      const checked = categoryConfigEligibleTypes.includes(code)
                      return (
                        <label key={dt.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={e => {
                              if (e.target.checked) {
                                setCategoryConfigEligibleTypes([...categoryConfigEligibleTypes, code])
                              } else {
                                setCategoryConfigEligibleTypes(categoryConfigEligibleTypes.filter(x => x !== code))
                              }
                            }}
                          />
                          {dt.name}
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div className="form-group">
                  <label className="label" style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Accessory Compatibility Fields</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
                    {[
                      { value: 'compatible_charging_interface', label: 'Charging Interface' },
                      { value: 'storage_expansion_compatibility', label: 'Storage Expansion Compatibility' },
                      { value: 'memory_capacity', label: 'Memory Capacity' },
                      { value: 'headphone_jack_compatibility', label: 'Headphone Jack Compatibility' },
                      { value: 'bluetooth_compatibility', label: 'Bluetooth Compatibility' },
                      { value: 'wireless_charging_compatibility', label: 'Wireless Charging Compatibility' },
                      { value: 'compatible_watch_case_size', label: 'Compatible Watch Case Size' },
                    ].map(opt => {
                      const checked = categoryConfigAccessoryFields.includes(opt.value)
                      const rule = categoryConfigRules[opt.value] || { mode: 'optional' }
                      return (
                        <div key={opt.value} style={{ display: 'flex', flexDirection: 'column', padding: 8, background: 'var(--bg-elevated)', borderRadius: 6, border: '1px solid var(--border-light)' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 550, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={e => {
                                if (e.target.checked) {
                                  setCategoryConfigAccessoryFields([...categoryConfigAccessoryFields, opt.value])
                                  if (!categoryConfigRules[opt.value]) {
                                    setCategoryConfigRules({
                                      ...categoryConfigRules,
                                      [opt.value]: { mode: 'optional' }
                                    })
                                  }
                                } else {
                                  setCategoryConfigAccessoryFields(categoryConfigAccessoryFields.filter(x => x !== opt.value))
                                  const updatedRules = { ...categoryConfigRules }
                                  delete updatedRules[opt.value]
                                  setCategoryConfigRules(updatedRules)
                                }
                              }}
                            />
                            {opt.label}
                          </label>
                          {checked && (
                            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 20 }}>
                              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Rule Mode:</span>
                              <select
                                style={{ padding: '2px 6px', fontSize: 12, borderRadius: 4, background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                                value={rule.mode}
                                onChange={e => {
                                  setCategoryConfigRules({
                                    ...categoryConfigRules,
                                    [opt.value]: { ...rule, mode: e.target.value }
                                  })
                                }}
                              >
                                <option value="required">Required</option>
                                <option value="optional">Optional</option>
                                <option value="hidden">Hidden</option>
                              </select>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-light)' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setEditingCategoryConfig(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save Configuration
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${manageField === 'brand' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => { setManageField('brand'); setDropdownError(null); setNewDropdownValue(''); }}
                  >
                    Brands
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${manageField === 'product_category' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => { setManageField('product_category'); setDropdownError(null); setNewDropdownValue(''); }}
                  >
                    Categories
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${manageField === 'system_color' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => { setManageField('system_color'); setDropdownError(null); setNewDropdownValue(''); }}
                  >
                    System Colors
                  </button>
                </div>

                <form onSubmit={handleAddDropdownValue} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <input
                    className="input"
                    style={{ flex: 1 }}
                    placeholder={`Add new ${manageField === 'system_color' ? 'color' : manageField === 'product_category' ? 'category' : 'brand'}...`}
                    value={newDropdownValue}
                    onChange={e => setNewDropdownValue(e.target.value)}
                    required
                  />
                  <button type="submit" className="btn btn-primary">
                    Add Value
                  </button>
                </form>

                <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-card)', maxHeight: '40vh' }}>
                  {dropdownConfigs.filter((c: any) => c.field_name === manageField).length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                      No values configured.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {dropdownConfigs
                        .filter((c: any) => c.field_name === manageField)
                        .map((item: any) => (
                          <div
                            key={item.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '10px 12px',
                              borderBottom: '1px solid var(--border-light)',
                            }}
                          >
                            <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 550 }}>
                              {item.value}
                            </span>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {manageField === 'product_category' && (
                                <button
                                  type="button"
                                  className="btn btn-ghost"
                                  style={{ padding: 4, color: 'var(--primary)', background: 'transparent', border: 'none' }}
                                  onClick={() => setEditingCategoryConfig(item)}
                                >
                                  <Settings size={14} />
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn btn-ghost"
                                style={{ padding: 4, color: 'var(--red)', background: 'transparent', border: 'none' }}
                                onClick={() => handleDeleteDropdownValue(item.id)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-light)' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowDropdownManagerModal(false)}>
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
