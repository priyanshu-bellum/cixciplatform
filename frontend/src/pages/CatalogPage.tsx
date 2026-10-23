import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams, useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import api from '../lib/apiClient'
import { useAuthStore } from '../stores/authStore'
import { parseWirelessCharging } from './DevicesPage'
import Pagination, { usePagination } from '../components/Pagination'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
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
import InputAdornment from '@mui/material/InputAdornment'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Tooltip from '@mui/material/Tooltip'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import Divider from '@mui/material/Divider'
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag'
import RefreshIcon from '@mui/icons-material/Refresh'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import SearchBar from '../components/forms/SearchBar'
import CheckIcon from '@mui/icons-material/Check'
import DownloadIcon from '@mui/icons-material/Download'
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined'
import DescriptionIcon from '@mui/icons-material/Description'
import CloseIcon from '@mui/icons-material/Close'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import SettingsIcon from '@mui/icons-material/Settings'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import GridViewIcon from '@mui/icons-material/GridView'
import ViewListIcon from '@mui/icons-material/ViewList'
import VisibilityIcon from '@mui/icons-material/Visibility'
import ImageIcon from '@mui/icons-material/Image'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import { useSnackbar } from '../components/feedback/SnackbarProvider'
import { useConfirmDialog } from '../hooks/useConfirmDialog'
import ConfirmDialog from '../components/feedback/ConfirmDialog'
import PageHeader from '../components/layout/PageHeader'
import StatusChip from '../components/data-display/StatusChip'
import { formatCurrency as sharedFormatCurrency, formatDate, formatETDate as sharedFormatETDate, getImageUrl } from '../lib/formatters'

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

// Server-side pagination for the product list.
const SERVER_PAGE_SIZE = 50

// Shape of the paginated product list returned by /catalog/products/.
interface ProductsPageResponse {
  count: number
  next?: string | null
  previous?: string | null
  results: any[]
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

function MultiSelect({
  selected,
  options,
  onChange,
  label,
  placeholder = 'Select...'
}: {
  selected: string[]
  options: { value: string; label: string }[] | string[]
  onChange: (val: string[]) => void
  label: string
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const normOptions = useMemo(() => {
    return options.map(o => typeof o === 'string' ? { value: o, label: o } : o)
  }, [options])

  const selectedObjects = useMemo(() => {
    return normOptions.filter(o => selected.includes(o.value))
  }, [selected, normOptions])

  const toggleOption = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter(x => x !== val))
    } else {
      onChange([...selected, val])
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, position: 'relative' }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</label>
      <div
        onClick={() => setOpen(!open)}
        style={{
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '6px 12px',
          background: 'var(--bg)',
          color: 'var(--text-primary)',
          fontSize: 13,
          cursor: 'pointer',
          minWidth: 150,
          minHeight: 38,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          alignItems: 'center',
          marginTop: 4,
        }}
      >
        {selectedObjects.length === 0 ? (
          <span style={{ color: 'var(--text-muted)' }}>{placeholder}</span>
        ) : (
          selectedObjects.map(o => (
            <span
              key={o.value}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                padding: '1px 6px',
                borderRadius: 4,
                fontSize: 12,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
              onClick={(e) => {
                e.stopPropagation()
                toggleOption(o.value)
              }}
            >
              {o.label}
              <CloseIcon sx={{ fontSize: 11, color: 'error.main', cursor: 'pointer' }} />
            </span>
          ))
        )}
      </div>

      {open && (
        <>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} onClick={() => setOpen(false)} />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 1000,
              marginTop: 4,
              padding: 4,
              maxHeight: 200,
              overflowY: 'auto',
            }}
          >
            {normOptions.map(opt => {
              const isSelected = selected.includes(opt.value)
              return (
                <div
                  key={opt.value}
                  onClick={() => toggleOption(opt.value)}
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
                  <span style={{ fontSize: 13, color: isSelected ? 'var(--accent)' : 'var(--text-secondary)' }}>{opt.label}</span>
                  {isSelected && <CheckIcon sx={{ fontSize: 14, color: 'primary.main' }} />}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
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
              <CloseIcon sx={{ fontSize: 12, color: 'error.main', cursor: 'pointer' }} />
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
                  {isSelected && <CheckIcon sx={{ fontSize: 14, color: 'primary.main' }} />}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export const formatCurrency = (amount: number | string | null | undefined, currency: string = 'USD') => {
  if (amount === null || amount === undefined || amount === '') return '—';
  let numericAmount: number;
  if (typeof amount === 'string') {
    const cleaned = amount.replace(/[^0-9.-]/g, '');
    numericAmount = parseFloat(cleaned);
  } else {
    numericAmount = amount;
  }
  if (isNaN(numericAmount)) return '—';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  } catch (e) {
    return `${currency} ${numericAmount.toFixed(2)}`;
  }
};

export const formatETDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'Never Exported'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Never Exported'
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
  
  const parts = formatter.formatToParts(date)
  const month = parts.find(p => p.type === 'month')?.value || ''
  const day = parts.find(p => p.type === 'day')?.value || ''
  const year = parts.find(p => p.type === 'year')?.value || ''
  const hour = parts.find(p => p.type === 'hour')?.value || ''
  const minute = parts.find(p => p.type === 'minute')?.value || ''
  const dayPeriod = parts.find(p => p.type === 'dayPeriod')?.value || ''
  
  return `${month}-${day}-${year} ${hour}:${minute} ${dayPeriod} ET`
}

export default function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { showSnackbar } = useSnackbar()
  const { confirm, dialogProps } = useConfirmDialog()
  const isCixciAdmin = user?.is_cixci_admin || user?.company_type === 'cixci_internal'
  const isVendor = user?.company_type === 'vendor'
  const isBuyer = user?.company_type === 'buyer'

  const tabParam = searchParams.get('tab')
  const initialTab = (tabParam === 'my-compatibility' || searchParams.has('compatibility_device') || searchParams.has('device')) ? 'projection' : (tabParam === 'export-jobs' ? 'export_jobs' : 'products')
  const [tab, setTabState] = useState<'products' | 'projection' | 'export_jobs'>(initialTab)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  // Server-side page cursor for the product list (1-based).
  const [serverPage, setServerPage] = useState(1)

  const setTab = (newTab: 'products' | 'projection' | 'export_jobs') => {
    setTabState(newTab)
    const newParams = new URLSearchParams(searchParams)
    newParams.set('tab', newTab === 'projection' ? 'my-compatibility' : (newTab === 'products' ? 'all-products' : 'export-jobs'))
    setSearchParams(newParams)
  }

  // All Products isolated filters state
  const [allSearch, setAllSearchState] = useState(searchParams.get('all_search') || '')
  const setAllSearch = (val: string) => {
    setAllSearchState(val)
    const newParams = new URLSearchParams(searchParams)
    if (val) {
      newParams.set('all_search', val)
    } else {
      newParams.delete('all_search')
    }
    setSearchParams(newParams)
  }

  const allFilterDeviceId = searchParams.get('all_device') || ''
  const setAllFilterDeviceId = (val: string) => {
    const newParams = new URLSearchParams(searchParams)
    if (val) {
      newParams.set('all_device', val)
    } else {
      newParams.delete('all_device')
    }
    setSearchParams(newParams)
  }

  const [allFilterStatus, setAllFilterStatusState] = useState<string[]>(
    searchParams.get('all_status')?.split(',').filter(Boolean) || []
  )
  const setAllFilterStatus = (vals: string[]) => {
    setAllFilterStatusState(vals)
    const newParams = new URLSearchParams(searchParams)
    if (vals.length > 0) {
      newParams.set('all_status', vals.join(','))
    } else {
      newParams.delete('all_status')
    }
    setSearchParams(newParams)
  }

  const [allFilterSellingStatus, setAllFilterSellingStatusState] = useState<string[]>(
    searchParams.get('all_selling_status')?.split(',').filter(Boolean) || []
  )
  const setAllFilterSellingStatus = (vals: string[]) => {
    setAllFilterSellingStatusState(vals)
    const newParams = new URLSearchParams(searchParams)
    if (vals.length > 0) {
      newParams.set('all_selling_status', vals.join(','))
    } else {
      newParams.delete('all_selling_status')
    }
    setSearchParams(newParams)
  }

  const [allSort, setAllSortState] = useState(searchParams.get('all_sort') || '')
  const setAllSort = (val: string) => {
    setAllSortState(val)
    const newParams = new URLSearchParams(searchParams)
    if (val) {
      newParams.set('all_sort', val)
    } else {
      newParams.delete('all_sort')
    }
    setSearchParams(newParams)
  }

  const [allPage, setAllPageState] = useState(searchParams.get('all_page') || '1')
  const setAllPage = (val: string) => {
    setAllPageState(val)
    const newParams = new URLSearchParams(searchParams)
    if (val && val !== '1') {
      newParams.set('all_page', val)
    } else {
      newParams.delete('all_page')
    }
    setSearchParams(newParams)
  }

  const [allProductsSelectedIds, setAllProductsSelectedIds] = useState<string[]>([])
  // Track which product IDs a buyer has successfully exported (session-scoped)
  const [exportedProductIds, setExportedProductIds] = useState<Set<string>>(new Set())

  // My Compatibility isolated filters state
  const [compatSearch, setCompatSearchState] = useState(searchParams.get('compatibility_search') || '')
  const setCompatSearch = (val: string) => {
    setCompatSearchState(val)
    const newParams = new URLSearchParams(searchParams)
    if (val) {
      newParams.set('compatibility_search', val)
    } else {
      newParams.delete('compatibility_search')
    }
    setSearchParams(newParams)
  }

  const compatFilterDeviceId = searchParams.get('compatibility_device') || searchParams.get('device') || ''
  const setCompatFilterDeviceId = (val: string) => {
    const newParams = new URLSearchParams(searchParams)
    if (val) {
      newParams.set('compatibility_device', val)
    } else {
      newParams.delete('compatibility_device')
      newParams.delete('device')
    }
    setSearchParams(newParams)
  }

  const [compatFilterStatus, setCompatFilterStatusState] = useState<string[]>(
    searchParams.get('compatibility_status')?.split(',').filter(Boolean) || []
  )
  const setCompatFilterStatus = (vals: string[]) => {
    setCompatFilterStatusState(vals)
    const newParams = new URLSearchParams(searchParams)
    if (vals.length > 0) {
      newParams.set('compatibility_status', vals.join(','))
    } else {
      newParams.delete('compatibility_status')
    }
    setSearchParams(newParams)
  }

  const [compatFilterSellingStatus, setCompatFilterSellingStatusState] = useState<string[]>(
    searchParams.get('compatibility_selling_status')?.split(',').filter(Boolean) || []
  )
  const setCompatFilterSellingStatus = (vals: string[]) => {
    setCompatFilterSellingStatusState(vals)
    const newParams = new URLSearchParams(searchParams)
    if (vals.length > 0) {
      newParams.set('compatibility_selling_status', vals.join(','))
    } else {
      newParams.delete('compatibility_selling_status')
    }
    setSearchParams(newParams)
  }

  const [compatSort, setCompatSortState] = useState(searchParams.get('compatibility_sort') || '')
  const setCompatSort = (val: string) => {
    setCompatSortState(val)
    const newParams = new URLSearchParams(searchParams)
    if (val) {
      newParams.set('compatibility_sort', val)
    } else {
      newParams.delete('compatibility_sort')
    }
    setSearchParams(newParams)
  }

  const [myCompatibilitySelectedIds, setMyCompatibilitySelectedIds] = useState<string[]>([])

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showManageModal, setShowManageModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [showDropdownManagerModal, setShowDropdownManagerModal] = useState(false)
  const [manageField, setManageField] = useState<'brand' | 'product_category' | 'system_color'>('brand')
  const [newDropdownValue, setNewDropdownValue] = useState('')
  const [selectedJob, setSelectedJob] = useState<any>(null)
  const [dropdownError, setDropdownError] = useState<string | null>(null)

  const formatETDate = (dateString: any) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).formatToParts(date);
      const get = (t: string) => parts.find((p) => p.type === t)?.value || '';
      return `${get('month')}-${get('day')}-${get('year')} ${get('hour')}:${get('minute')} ${get('dayPeriod')} ET`;
    } catch (e) {
      return dateString;
    }
  };

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
    enabled: !!isCixciAdmin,
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
  const [uploadedZipImages, setUploadedZipImages] = useState<{ name: string; url: string; id: string }[]>([])
  const [uploadedPrimaryAssetId, setUploadedPrimaryAssetId] = useState<string | null>(null)

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
  const [compUniversalDeviceTypes, setCompUniversalDeviceTypes] = useState<string[]>([])

  // Manage / Edit product targets
  const [selectedManageProduct, setSelectedManageProduct] = useState<any>(null)
  const [editingProduct, setEditingProduct] = useState<any>(null)

  // Compatibility Management States
  const [manageTab, setManageTab] = useState<'details' | 'compatibility' | 'bulk' | 'audit'>('details')
  // All Products filters state
  const [allFilterCategories, setAllFilterCategoriesState] = useState<string[]>(
    searchParams.get('all_category')?.split(',').filter(Boolean) || []
  )
  const setAllFilterCategories = (vals: string[]) => {
    setAllFilterCategoriesState(vals)
    const newParams = new URLSearchParams(searchParams)
    if (vals.length > 0) {
      newParams.set('all_category', vals.join(','))
    } else {
      newParams.delete('all_category')
    }
    setSearchParams(newParams)
  }

  const [allFilterBrands, setAllFilterBrandsState] = useState<string[]>(
    searchParams.get('all_brand')?.split(',').filter(Boolean) || []
  )
  const setAllFilterBrands = (vals: string[]) => {
    setAllFilterBrandsState(vals)
    const newParams = new URLSearchParams(searchParams)
    if (vals.length > 0) {
      newParams.set('all_brand', vals.join(','))
    } else {
      newParams.delete('all_brand')
    }
    setSearchParams(newParams)
  }

  const [allFilterColors, setAllFilterColorsState] = useState<string[]>(
    searchParams.get('all_color')?.split(',').filter(Boolean) || []
  )
  const setAllFilterColors = (vals: string[]) => {
    setAllFilterColorsState(vals)
    const newParams = new URLSearchParams(searchParams)
    if (vals.length > 0) {
      newParams.set('all_color', vals.join(','))
    } else {
      newParams.delete('all_color')
    }
    setSearchParams(newParams)
  }

  const [allFilterMsrps, setAllFilterMsrpsState] = useState<string[]>(
    searchParams.get('all_price')?.split(',').filter(Boolean) || []
  )
  const setAllFilterMsrps = (vals: string[]) => {
    setAllFilterMsrpsState(vals)
    const newParams = new URLSearchParams(searchParams)
    if (vals.length > 0) {
      newParams.set('all_price', vals.join(','))
    } else {
      newParams.delete('all_price')
    }
    setSearchParams(newParams)
  }

  // Admin-only filters: Vendor, MAP Price, Wholesale Price
  const [allFilterVendor, setAllFilterVendorState] = useState(searchParams.get('all_vendor') || '')
  const setAllFilterVendor = (val: string) => {
    setAllFilterVendorState(val)
    const newParams = new URLSearchParams(searchParams)
    if (val) {
      newParams.set('all_vendor', val)
    } else {
      newParams.delete('all_vendor')
    }
    setSearchParams(newParams)
  }

  const [allFilterMapPrice, setAllFilterMapPriceState] = useState(searchParams.get('all_map_price') || '')
  const setAllFilterMapPrice = (val: string) => {
    setAllFilterMapPriceState(val)
    const newParams = new URLSearchParams(searchParams)
    if (val) {
      newParams.set('all_map_price', val)
    } else {
      newParams.delete('all_map_price')
    }
    setSearchParams(newParams)
  }

  const [allFilterWholesalePrice, setAllFilterWholesalePriceState] = useState(searchParams.get('all_wholesale_price') || '')
  const setAllFilterWholesalePrice = (val: string) => {
    setAllFilterWholesalePriceState(val)
    const newParams = new URLSearchParams(searchParams)
    if (val) {
      newParams.set('all_wholesale_price', val)
    } else {
      newParams.delete('all_wholesale_price')
    }
    setSearchParams(newParams)
  }

  const [exporting, setExporting] = useState(false)

  // My Compatibility filters state
  const [compatFilterCategories, setCompatFilterCategoriesState] = useState<string[]>(
    searchParams.get('compatibility_category')?.split(',').filter(Boolean) || []
  )
  const setCompatFilterCategories = (vals: string[]) => {
    setCompatFilterCategoriesState(vals)
    const newParams = new URLSearchParams(searchParams)
    if (vals.length > 0) {
      newParams.set('compatibility_category', vals.join(','))
    } else {
      newParams.delete('compatibility_category')
    }
    setSearchParams(newParams)
  }

  const [compatFilterBrands, setCompatFilterBrandsState] = useState<string[]>(
    searchParams.get('compatibility_brand')?.split(',').filter(Boolean) || []
  )
  const setCompatFilterBrands = (vals: string[]) => {
    setCompatFilterBrandsState(vals)
    const newParams = new URLSearchParams(searchParams)
    if (vals.length > 0) {
      newParams.set('compatibility_brand', vals.join(','))
    } else {
      newParams.delete('compatibility_brand')
    }
    setSearchParams(newParams)
  }

  const [compatFilterColors, setCompatFilterColorsState] = useState<string[]>(
    searchParams.get('compatibility_color')?.split(',').filter(Boolean) || []
  )
  const setCompatFilterColors = (vals: string[]) => {
    setCompatFilterColorsState(vals)
    const newParams = new URLSearchParams(searchParams)
    if (vals.length > 0) {
      newParams.set('compatibility_color', vals.join(','))
    } else {
      newParams.delete('compatibility_color')
    }
    setSearchParams(newParams)
  }

  const [compatFilterMsrps, setCompatFilterMsrpsState] = useState<string[]>(
    searchParams.get('compatibility_price')?.split(',').filter(Boolean) || []
  )
  const setCompatFilterMsrps = (vals: string[]) => {
    setCompatFilterMsrpsState(vals)
    const newParams = new URLSearchParams(searchParams)
    if (vals.length > 0) {
      newParams.set('compatibility_price', vals.join(','))
    } else {
      newParams.delete('compatibility_price')
    }
    setSearchParams(newParams)
  }
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
  // Per-card hovered image state: maps product id -> current displayed image url
  const [hoveredCardImages, setHoveredCardImages] = useState<Record<string, string>>({})

  // Bulk Upload state
  const [bulkFile, setBulkFile] = useState<File | null>(null)
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [bulkResult, setBulkResult] = useState<any | null>(null)
  const [uploadingBulk, setUploadingBulk] = useState(false)
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvPreviewRows, setCsvPreviewRows] = useState<string[][]>([])
  const [updateMode, setUpdateMode] = useState<string>('create_only')
  // Bulk import — step 2: product images
  const [bulkStep, setBulkStep] = useState<1 | 2>(1)
  const [bulkImagesOnly, setBulkImagesOnly] = useState(false)
  const [bulkImportedSkus, setBulkImportedSkus] = useState<string[]>([])
  const [bulkZipFile, setBulkZipFile] = useState<File | null>(null)
  const [bulkZipResult, setBulkZipResult] = useState<any | null>(null)
  const [bulkZipError, setBulkZipError] = useState<string | null>(null)
  const [uploadingBulkZip, setUploadingBulkZip] = useState(false)
  const [bulkZipDragging, setBulkZipDragging] = useState(false)
  const bulkZipInputRef = useRef<HTMLInputElement | null>(null)

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
    const selectStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 13 };
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
      compWatchCaseSize !== '' ||
      compUniversalDeviceTypes.length > 0
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
    const origUdt = editingProduct.compatible_device_types || []
    const udtMatch = (
      Array.isArray(compUniversalDeviceTypes) &&
      compUniversalDeviceTypes.length === origUdt.length &&
      compUniversalDeviceTypes.every((x: string) => origUdt.includes(x))
    )
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
      !udtMatch ||
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
  }

  const isBulkFormDirty = () => {
    const hasHeaders = Array.isArray(csvHeaders) && csvHeaders.length > 0
    return (bulkFile !== null || hasHeaders) && bulkResult === null
  }

  const handleCloseAddModal = async () => {
    if (isAddFormDirty()) {
      const ok = await confirm({ title: 'Discard changes?', message: 'You have unsaved changes. Are you sure you want to close and discard them?', confirmLabel: 'Discard', confirmColor: 'error' })
      if (!ok) return
    }
    setShowAddModal(false)
    resetProductForm()
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
    setUploadedPrimaryAssetId(null)
    setSelectedDeviceIds([])
    setCompBluetooth('')
    setCompHeadphoneJack('')
    setCompChargingInterface('')
    setCompWirelessCharging([])
    setCompStorageExpansion('')
    setCompMemoryCapacity('')
    setCompWatchCaseSize('')
    setCompUniversalDeviceTypes([])
    setFormError(null)
  }

  const handleCloseEditModal = async () => {
    if (isEditFormDirty()) {
      const ok = await confirm({ title: 'Discard changes?', message: 'You have unsaved changes. Are you sure you want to close and discard them?', confirmLabel: 'Discard', confirmColor: 'error' })
      if (!ok) return
    }
    setShowEditModal(false)
    resetProductForm()
    setEditingProduct(null)
  }

  const resetBulkState = () => {
    setBulkStep(1)
    setBulkImagesOnly(false)
    setBulkImportedSkus([])
    setBulkFile(null)
    setBulkResult(null)
    setBulkError(null)
    setBulkZipFile(null)
    setBulkZipResult(null)
    setBulkZipError(null)
    setBulkZipDragging(false)
    setCsvHeaders([])
    setCsvPreviewRows([])
  }

  const openBulkModal = () => {
    resetBulkState()
    setShowBulkModal(true)
  }

  const openBulkImagesModal = () => {
    resetBulkState()
    setBulkImagesOnly(true)
    setBulkStep(2)
    setShowBulkModal(true)
  }

  const handleCloseBulkModal = async () => {
    // After an import some products are staged until they get a transparent
    // PNG, so keep the vendor inside the flow and take them to Step 2.
    const importedCount = (bulkResult?.rows_passed || 0) + (bulkResult?.rows_staged || 0)
    if (bulkResult && importedCount > 0) {
      const ok = await confirm({
        title: 'Upload product images',
        message: `You imported ${importedCount} product(s). Until each one has a valid transparent PNG primary image it stays hidden from buyers. Upload the images in Step 2 now?`,
        confirmLabel: 'Go to Step 2',
        cancelLabel: 'Close anyway',
      })
      if (ok) {
        setBulkStep(2)
        return
      }
      setShowBulkModal(false)
      resetBulkState()
      return
    }
    if (isBulkFormDirty()) {
      const ok = await confirm({ title: 'Discard changes?', message: 'You have unsaved changes. Are you sure you want to close and discard them?', confirmLabel: 'Discard', confirmColor: 'error' })
      if (!ok) return
    }
    setShowBulkModal(false)
    setTimeout(resetBulkState, 300)
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

  // Dropdowns come from the API; until they load, do not reject values the
  // backend may accept (this caused false "invalid system color" errors).
  const dropdownsLoaded = dropdownConfigs.length > 0

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
    const statusColIdx = normalizedHeaders.findIndex(h => h === 'productstatus' || h === 'status' || h === 'prodstatus')
    const inventoryLevelColIdx = normalizedHeaders.findIndex(h => h === 'inventorylevel' || h === 'inventory' || h === 'qty' || h === 'quantity' || h === 'stock')

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
        } else if (!isVendor && dropdownsLoaded && allowedBrands.length > 0 && !allowedBrands.some((b: string) => b.toLowerCase() === val.toLowerCase())) {
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
        } else if (!/^\d{12}$/.test(val)) {
          errors.push("UPC must follow valid UPC-A format (12 numeric characters).")
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
          if (dropdownsLoaded && !match) {
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
          if (dropdownsLoaded && invalid.length > 0) {
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

      // 18. Product Status Check
      if (statusColIdx === -1) {
        errors.push("Missing 'Product Status' column.")
      } else {
        const val = row[statusColIdx]?.trim()
        if (!val) {
          errors.push("Product Status is required.")
          cellErrors[`${rowIdx}-${statusColIdx}`] = true
        } else {
          const validStatuses = ['active', 'inactive', 'eol', 'out_of_stock']
          if (!validStatuses.includes(val.toLowerCase())) {
            errors.push(`Product Status must be one of: Active, Inactive, EOL, Out of Stock. Got '${val}'.`)
            cellErrors[`${rowIdx}-${statusColIdx}`] = true
          }
        }
      }

      // 19. Inventory Level Check
      if (inventoryLevelColIdx === -1) {
        errors.push("Missing 'Inventory Level' column.")
      } else {
        const val = row[inventoryLevelColIdx]?.trim()
        if (!val) {
          errors.push("Inventory Level is required.")
          cellErrors[`${rowIdx}-${inventoryLevelColIdx}`] = true
        } else if (isNaN(Number(val)) || Number(val) < 0) {
          errors.push(`Inventory Level must be a non-negative number. Got '${val}'.`)
          cellErrors[`${rowIdx}-${inventoryLevelColIdx}`] = true
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
  }, [csvHeaders, csvPreviewRows, isVendor, user?.company_name, allowedCategories, allowedColors, allowedBrands, dropdownsLoaded])

  // Export Job Form State
  const [exportFormat, setExportFormat] = useState('csv')
  const [includeIncompatible, setIncludeIncompatible] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  
  // Projection recalculation state
  const [refreshingProj, setRefreshingProj] = useState(false)

  const activeSearch = tab === 'projection' ? compatSearch : allSearch
  // Typing should not fire a request per keystroke.
  const debouncedActiveSearch = useDebouncedValue(activeSearch, 400)
  const activeFilterDeviceId = tab === 'projection' ? compatFilterDeviceId : allFilterDeviceId
  const activeFilterCategories = tab === 'projection' ? compatFilterCategories : allFilterCategories
  const activeFilterBrands = tab === 'projection' ? compatFilterBrands : allFilterBrands
  const activeFilterColors = tab === 'projection' ? compatFilterColors : allFilterColors
  const activeFilterMsrps = tab === 'projection' ? compatFilterMsrps : allFilterMsrps

  // TanStack Queries
  // The product list is paginated and filtered on the server so the browser
  // never has to download the whole catalog to render one page.
  const { data: projectionResponse, error: projectionError, isLoading: isProjectionLoading, refetch: refreshProjection, isRefetching: isRefetchingProj } = useQuery<{ projection: any | null; reason: string | null }>({
    queryKey: ['my-projection'],
    queryFn: async () => {
      try {
        const res = await api.get('/catalog/my-projection/my_projection/')
        return { projection: res.data, reason: null }
      } catch (err: any) {
        // 404 = the buyer has no portfolio devices yet. It is a valid empty
        // state, not a load failure, so it must not be surfaced as an error.
        if (err?.response?.status === 404) {
          return { projection: null, reason: err.response?.data?.reason ?? 'no_portfolio_devices' }
        }
        throw err
      }
    },
    enabled: tab === 'projection' && isBuyer,
    retry: false,
  })
  const projection = projectionResponse?.projection ?? null

  // On the "My Compatibility" tab the visible set is the buyer's projected
  // product list. The projection is resolved server-side (projection_scope)
  // because a buyer can have thousands of compatible products — sending the
  // id list as a query parameter would exceed the request-line limit.
  const projectionScope = tab === 'projection' ? true : undefined

  // Shared filter params for the product list and the "matching ids" lookup.
  const productsFilterParams = useMemo(() => ({
    search: debouncedActiveSearch || undefined,
    device_id: activeFilterDeviceId || undefined,
    product_category: activeFilterCategories.length ? activeFilterCategories.join(',') : undefined,
    brand: activeFilterBrands.length ? activeFilterBrands.join(',') : undefined,
    color: activeFilterColors.length ? activeFilterColors.join(',') : undefined,
    msrp_range: activeFilterMsrps.length ? activeFilterMsrps.join(',') : undefined,
    projection_scope: projectionScope,
    vendor_company_reference: allFilterVendor || undefined,
    has_map_price: allFilterMapPrice === 'has' ? 'true' : allFilterMapPrice === 'missing' ? 'false' : undefined,
    has_wholesale_price: allFilterWholesalePrice === 'has' ? 'true' : allFilterWholesalePrice === 'missing' ? 'false' : undefined,
  }), [
    debouncedActiveSearch, activeFilterDeviceId, activeFilterCategories, activeFilterBrands,
    activeFilterColors, activeFilterMsrps, projectionScope,
    allFilterVendor, allFilterMapPrice, allFilterWholesalePrice,
  ])

  const {
    data: productsPage,
    isLoading,
    isFetching: isProductsFetching,
    refetch: refreshProducts,
  } = useQuery<ProductsPageResponse>({
    queryKey: [
      'products', tab, debouncedActiveSearch, activeFilterDeviceId,
      activeFilterCategories, activeFilterBrands, activeFilterColors, activeFilterMsrps,
      projectionScope, projection?.last_recalculated_at, serverPage,
      allFilterVendor, allFilterMapPrice, allFilterWholesalePrice,
    ],
    queryFn: () =>
      api.get('/catalog/products/', {
        params: {
          ...productsFilterParams,
          page: serverPage,
          page_size: SERVER_PAGE_SIZE,
        },
      }).then(r => r.data),
    // On My Compatibility the server resolves the projection server-side, so
    // wait until it exists — otherwise the first paint races the projection
    // request and renders an empty (but compatible) catalog.
    enabled: tab !== 'projection' || !!projection,
    placeholderData: (previous) => previous,
  })



  const { data: devicesData } = useQuery({
    queryKey: ['devices'],
    queryFn: () => api.get('/devices/devices/?paginate=false').then(r => r.data),
  })

  const { data: vendorCompaniesData } = useQuery({
    queryKey: ['vendor-companies'],
    queryFn: () => api.get('/tenant/companies/', { params: { company_type: 'vendor', paginate: 'false' } }).then(r => r.data),
    enabled: !!isCixciAdmin,
  })

  const { data: activeCompatibilities, refetch: refetchCompatibilities } = useQuery({
    queryKey: ['compatibility', selectedManageProduct?.id],
    queryFn: () => api.get(`/catalog/products/${selectedManageProduct.id}/compatibility/`).then(r => r.data).catch(() => []),
    enabled: !!selectedManageProduct && showManageModal,
  })

  const { data: exportJobs, refetch: refreshJobs, isRefetching: isRefetchingJobs } = useQuery({
    queryKey: ['export-jobs'],
    queryFn: () => api.get('/catalog/export-jobs/list_jobs/', { params: { paginate: 'false' } }).then(r => r.data).catch(() => []),
    enabled: tab === 'export_jobs' && isBuyer,
  })

  const { data: portfolio } = useQuery({
    queryKey: ['my-devices'],
    queryFn: () => api.get('/devices/portfolio/my_devices/').then(r => r.data).catch(() => []),
    enabled: isBuyer,
  })

  // The API returns one page of already-filtered products.
  const products = useMemo(() => {
    if (!productsPage) return []
    return Array.isArray(productsPage) ? productsPage : (productsPage.results ?? [])
  }, [productsPage])
  const totalProducts = productsPage?.count ?? products.length

  const [activeDetailImageUrl, setActiveDetailImageUrl] = useState<string | null>(null)

  // Extract all images
  const allImages = useMemo(() => {
    if (!selectedManageProduct) return []
    const list: string[] = []
    if (selectedManageProduct.primary_image_url) {
      list.push(getImageUrl(selectedManageProduct.primary_image_url))
    }
    if (Array.isArray(selectedManageProduct.media_references)) {
      selectedManageProduct.media_references.forEach((ref: any) => {
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
  }, [selectedManageProduct])

  // Sync activeDetailImageUrl on product select
  useEffect(() => {
    if (selectedManageProduct) {
      setActiveDetailImageUrl(allImages[0] || null)
    } else {
      setActiveDetailImageUrl(null)
    }
  }, [selectedManageProduct, allImages])

  // Category / brand / color / MSRP filters are applied server-side (see the
  // products query), so the page we received is already the filtered result.
  const filteredProducts = products

  const brandsList = useMemo(() => {
    const unique = new Set<string>()
    allowedBrands.forEach(b => { if (b) unique.add(b) })
    products.forEach((p: any) => { if (p.brand) unique.add(p.brand) })
    return Array.from(unique).sort()
  }, [allowedBrands, products])

  const filteredDeviceRef = portfolio?.find((ref: any) => ref.device === activeFilterDeviceId)
  const filteredDeviceName = filteredDeviceRef ? filteredDeviceRef.device_name : 'Selected Device'
  // On the compatibility tab the server already restricted the page to the
  // buyer's projected products, so no further client-side narrowing is needed.
  const compatibleProducts = filteredProducts
  const portfolioDeviceCount = (() => {
    if (!Array.isArray(portfolio)) return 0
    const ids = new Set<string>()
    portfolio.forEach((ref: any) => {
      if (ref?.active_flag && ref?.device) ids.add(ref.device)
    })
    return ids.size
  })()
  const compatHasActiveFilters = Boolean(
    compatFilterDeviceId || compatSearch || compatFilterCategories.length > 0 ||
    compatFilterBrands.length > 0 || compatFilterColors.length > 0 || compatFilterMsrps.length > 0
  )
  const compatEmptyState = compatHasActiveFilters
    ? {
        title: 'No compatible products match your filters',
        hint: 'Clear the filters to see all compatible accessories.',
      }
    : portfolioDeviceCount === 0
      ? {
          title: 'No devices in your portfolio yet',
          hint: 'Add devices in My Devices to see accessories that fit them.',
        }
      : {
          title: 'No compatible accessories yet',
          hint: `No accessories in the catalog are mapped to your ${portfolioDeviceCount} portfolio device${portfolioDeviceCount === 1 ? '' : 's'} yet.`,
        }
  const jobs = Array.isArray(exportJobs) ? exportJobs : (exportJobs?.results ?? [])
  const devices = devicesData?.results ?? devicesData ?? []

  // 1. All Products pagination — driven by the server (one page per request).
  const totalAllProducts = totalProducts
  const totalAllProductsPages = Math.max(1, Math.ceil(totalProducts / SERVER_PAGE_SIZE))
  const allProductsPage = serverPage
  const setAllProductsPage = (page: number) => {
    setServerPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const paginatedAllProducts = filteredProducts

  // Any filter/search change invalidates the current page number.
  useEffect(() => {
    setServerPage(1)
  }, [debouncedActiveSearch, allFilterCategories, allFilterBrands, allFilterColors, allFilterMsrps, activeFilterDeviceId, tab, allFilterVendor, allFilterMapPrice, allFilterWholesalePrice])

  // 2. My Compatibility pagination — same server query, scoped by the buyer's
  //    compatibility projection.
  const totalCompatProducts = totalProducts
  const totalCompatPages = totalAllProductsPages
  const compatPage = serverPage
  const setCompatPage = (page: number) => {
    setServerPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const paginatedCompatProducts = filteredProducts

  useEffect(() => {
    setServerPage(1)
  }, [debouncedActiveSearch, compatFilterCategories, compatFilterBrands, compatFilterColors, compatFilterMsrps, projection])

  // "Select all" spans every page, so the full id set for the active filters
  // is fetched from the API (ids only — no product payload).
  const fetchMatchingIds = async (): Promise<string[]> => {
    try {
      const res = await api.get('/catalog/products/ids/', { params: productsFilterParams })
      return res.data?.ids ?? []
    } catch {
      return []
    }
  }

  // 3. Export Jobs pagination (50 items per page)
  const {
    currentPage: jobsPage,
    setCurrentPage: setJobsPage,
    totalPages: totalJobsPages,
    totalItems: totalJobs,
    paginatedItems: paginatedJobs,
  } = usePagination(jobs, 50)

  const formatExcelDate = (val: any): string => {
    if (val === undefined || val === null) return ''
    if (val instanceof Date) {
      const month = String(val.getUTCMonth() + 1).padStart(2, '0')
      const day = String(val.getUTCDate()).padStart(2, '0')
      const year = val.getUTCFullYear()
      return `${month}-${day}-${year}`
    }
    const str = String(val).trim()
    if (!str) return ''
    const slash = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (slash) {
      return `${slash[1].padStart(2, '0')}-${slash[2].padStart(2, '0')}-${slash[3]}`
    }
    const num = Number(str)
    if (!isNaN(num) && num > 25569 && num < 100000) {
      const date = new Date((num - 25569) * 24 * 60 * 60 * 1000)
      const month = String(date.getUTCMonth() + 1).padStart(2, '0')
      const day = String(date.getUTCDate()).padStart(2, '0')
      const year = date.getUTCFullYear()
      return `${month}-${day}-${year}`
    }
    const parsedDate = new Date(str)
    if (!isNaN(parsedDate.getTime())) {
      const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
      const day = String(parsedDate.getDate()).padStart(2, '0')
      const year = parsedDate.getFullYear()
      return `${month}-${day}-${year}`
    }
    return str
  }

  // Helper to build media URLs
  function getImageUrl(path: string) {
    if (!path) return ''
    if (path.startsWith('http://') || path.startsWith('https://')) return path
    const apiBase = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1'
    const host = apiBase.replace('/api/v1', '')
    return `${host}${path}`
  }

  const extractUuid = (str: string): string | null => {
    if (!str) return null
    const matches = str.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi)
    return matches && matches.length > 0 ? matches[matches.length - 1] : null
  }

  // Handle local file uploads
  const handleUploadImage = async (file: File, ownerRecordId?: string | null, setAsPrimary = true): Promise<{ id: string; storage_key: string }> => {
    // Rule §3: only PNG with a transparent background is allowed.
    if (file.type !== 'image/png' || !/\.png$/i.test(file.name)) {
      throw new Error(`"${file.name}" is not a PNG. Only transparent PNG images are allowed.`)
    }
    const reqRes = await api.post('/media/assets/request_upload/', {
      filename: file.name,
      mime_type: 'image/png',
      asset_type: 'product_image',
      owner_module: 'catalog',
      // Rule §10: a single upload must attach to the selected product only.
      ...(ownerRecordId ? { owner_record_id: ownerRecordId } : {}),
    })
    const { presigned_url, id: assetId, storage_key } = reqRes.data

    const isPlaceholder = !presigned_url || 
      presigned_url.includes('placeholder-upload.cixci.com') || 
      presigned_url.includes('placeholder')

    const uploadDirect = async (confirmReplace: boolean) => {
      const formData = new FormData()
      formData.append('file', file)
      // The product form always uploads the PRIMARY image (Rule §16).
      if (setAsPrimary) formData.append('set_as_primary', 'true')
      if (confirmReplace) formData.append('confirm_replace', 'true')
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

    const uploadPresigned = async (confirmReplace: boolean) => {
      const uploadRes = await fetch(presigned_url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'image/png',
        },
        body: file,
      })
      if (!uploadRes.ok) {
        throw new Error(`Direct upload failed with status ${uploadRes.status}`)
      }
      // Rule §15/§20: the asset is validated server-side before it can
      // become Ready/Approved. It is never marked ready from the client.
      const finalizeRes = await api.post(`/media/assets/${assetId}/finalize_upload/`, {
        ...(setAsPrimary ? { set_as_primary: 'true' } : {}),
        ...(confirmReplace ? { confirm_replace: 'true' } : {}),
      })
      return {
        id: assetId,
        storage_key: finalizeRes.data.storage_key || storage_key
      }
    }

    const run = async (confirmReplace: boolean) =>
      isPlaceholder ? uploadDirect(confirmReplace) : uploadPresigned(confirmReplace)

    try {
      return await run(false)
    } catch (err: any) {
      // Rule §16: replacing the primary image of an Active product requires an
      // explicit confirmation from the vendor.
      const status = err?.response?.status
      const data = err?.response?.data
      if (status === 409 && data?.requires_confirmation) {
        const ok = await confirm({
          title: 'Replace primary image?',
          message: 'This product is Active. Replacing its primary image archives the current image and is recorded in the audit log. Continue?',
          confirmLabel: 'Replace image',
          cancelLabel: 'Cancel',
        })
        if (!ok) {
          throw new Error('Image replacement cancelled. The existing primary image was kept.')
        }
        return await run(true)
      }
      throw err
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
            if (!entry.dir && /\.png$/i.test(relativePath)) {
              const blob = await entry.async('blob')
              const name = relativePath.split('/').pop() || 'image.png'
              const imgFile = new File([blob], name, { type: 'image/png' })
              imageFiles.push(imgFile)
            }
          }
          if (imageFiles.length === 0) {
            setFormError('No valid images found in the ZIP file. Only PNG files are allowed.')
            setSelectedImageFile(null)
            setImagePreviewUrl('')
            setUploadedZipImages([])
            setUploadedPrimaryAssetId(null)
            return
          }
          
          const uploadedList: { name: string; url: string; id: string }[] = []
          for (const [i, f] of imageFiles.entries()) {
            // Only the first image becomes the product's primary image.
            const uploadRes = await handleUploadImage(f, editingProduct?.id ?? null, i === 0)
            const absoluteUrl = getImageUrl('/media/' + uploadRes.storage_key)
            uploadedList.push({ name: f.name, url: absoluteUrl, id: uploadRes.id })
          }

          setUploadedZipImages(uploadedList)
          setUploadedPrimaryAssetId(uploadedList[0]?.id || null)
          setImagePreviewUrl(uploadedList[0].url)
          setProdPrimaryImageUrl(uploadedList[0].url)
          
          setProdImageUrl1(uploadedList[1]?.url || '')
          setProdImageUrl2(uploadedList[2]?.url || '')
          setProdImageUrl3(uploadedList[3]?.url || '')
          setProdImageUrl4(uploadedList[4]?.url || '')
          setProdImageUrl5(uploadedList[5]?.url || '')
          setFormError(null)
        } catch (err: any) {
          setFormError('Failed to extract images from ZIP file: ' + err.message)
          setSelectedImageFile(null)
          setImagePreviewUrl('')
          setUploadedZipImages([])
          setUploadedPrimaryAssetId(null)
        }
      } else {
        const files = Array.from(e.target.files)
        setFormError(null)
        try {
          setFormError('Uploading selected images... Please wait.')
          const uploadedList: { name: string; url: string; id: string }[] = []
          for (const [i, f] of files.entries()) {
            // Only the first image becomes the product's primary image.
            const uploadRes = await handleUploadImage(f, editingProduct?.id ?? null, i === 0)
            const absoluteUrl = getImageUrl('/media/' + uploadRes.storage_key)
            uploadedList.push({ name: f.name, url: absoluteUrl, id: uploadRes.id })
          }
          setUploadedZipImages(uploadedList)
          setUploadedPrimaryAssetId(uploadedList[0]?.id || null)
          setImagePreviewUrl(uploadedList[0].url)
          setProdPrimaryImageUrl(uploadedList[0].url)
          
          setProdImageUrl1(uploadedList[1]?.url || '')
          setProdImageUrl2(uploadedList[2]?.url || '')
          setProdImageUrl3(uploadedList[3]?.url || '')
          setProdImageUrl4(uploadedList[4]?.url || '')
          setProdImageUrl5(uploadedList[5]?.url || '')
          
          setSelectedImageFile(files[0])
          setFormError(null)
        } catch (err: any) {
          setFormError('Failed to upload one or more images: ' + err.message)
          setSelectedImageFile(null)
          setImagePreviewUrl('')
          setUploadedZipImages([])
          setUploadedPrimaryAssetId(null)
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
      if (!/^\d{12}$/.test(prodUpc)) { setFormError('UPC must follow valid UPC-A format (12 numeric characters).'); return; }
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
      if (prodType === 'accessory') {
        if (selectedDeviceIds.length === 0 && compUniversalDeviceTypes.length === 0) { setFormError('Device Compatibility is required. Select at least one device or universal device type.'); return; }
        if (['Headphones', 'Speakers', 'Chargers and Cables', 'Memory', 'Wearable Tech', 'Watch Accessories'].includes(prodCategory)) {
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

      if (uploadedPrimaryAssetId) {
        // The uploaded asset id is used directly — the asset is already
        // attached to the product by the upload endpoint (Rule §10).
        imageRef = uploadedPrimaryAssetId
      } else if (prodPrimaryImageUrl) {
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
        compatible_device_types: compUniversalDeviceTypes,
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
      if (!/^\d{12}$/.test(prodUpc)) { setFormError('UPC must follow valid UPC-A format (12 numeric characters).'); return; }
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
      if (prodType === 'accessory') {
        if (selectedDeviceIds.length === 0 && compUniversalDeviceTypes.length === 0) { setFormError('Device Compatibility is required. Select at least one device or universal device type.'); return; }
        if (['Headphones', 'Speakers', 'Chargers and Cables', 'Memory', 'Wearable Tech', 'Watch Accessories'].includes(prodCategory)) {
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

      if (uploadedPrimaryAssetId) {
        // The uploaded asset id is used directly — the asset is already
        // attached to the product by the upload endpoint (Rule §10).
        imageRef = uploadedPrimaryAssetId
      } else if (prodPrimaryImageUrl) {
        const uuid = extractUuid(prodPrimaryImageUrl)
        if (uuid) {
          imageRef = uuid
        } else {
          setFormError('Primary Product Image URL/ID must contain a valid asset UUID.')
          return
        }
      } else if (selectedImageFile) {
        const uploadRes = await handleUploadImage(selectedImageFile, editingProduct?.id ?? null)
        imageRef = uploadRes.id
      }

      const editRes = await api.patch(`/catalog/products/${editingProduct.id}/`, {
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
        compatible_device_types: compUniversalDeviceTypes,
      })
      setSelectedManageProduct(editRes.data)

      if (prodType === 'accessory' && selectedDeviceIds.length > 0) {
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
      setProdPrice('')
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
      setUploadedPrimaryAssetId(null)
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
    if (selectedManageProduct && selectedManageProduct.status === 'active') {
      showSnackbar("Active products that are live and being sold by buyers cannot be deleted.", "warning")
      return
    }
    const ok = await confirm({ title: 'Delete product?', message: 'Are you sure you want to delete this product? This action cannot be undone.', confirmLabel: 'Delete', confirmColor: 'error' })
    if (!ok) return
    try {
      await api.delete(`/catalog/products/${id}/`)
      setShowManageModal(false)
      setSelectedManageProduct(null)
      refreshProducts()
    } catch (err: any) {
      showSnackbar("Failed to delete product: " + (err.response?.data?.detail || err.message), 'error')
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
      showSnackbar("Failed to exclude device: " + (err.response?.data?.error || err.message), 'error')
    }
  }

  const handleRestoreCompatibility = async (deviceReference: string, exclusionType: string, isLocked: boolean) => {
    if (!selectedManageProduct) return
    if (!isCixciAdmin) {
      if (isLocked) {
        showSnackbar("Cannot restore a locked mapping.", "warning")
        return
      }
      if (exclusionType !== 'vendor') {
        showSnackbar("Vendors can only restore vendor exclusions.", "warning")
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
      showSnackbar("Failed to restore device: " + (err.response?.data?.error || err.message), 'error')
    }
  }

  const handleLockCompatibility = async (deviceReference: string) => {
    if (!selectedManageProduct) return
    if (!isCixciAdmin) {
      showSnackbar("Only CIXCI Admins can lock device mappings.", "warning")
      return
    }
    try {
      await api.post(`/catalog/products/${selectedManageProduct.id}/compatibility/`, {
        action: 'lock',
        device_reference: deviceReference
      })
      refetchCompatibilities()
    } catch (err: any) {
      showSnackbar("Failed to lock mapping: " + (err.response?.data?.error || err.message), 'error')
    }
  }

  const handleConvertToAdminExclusion = async (deviceReference: string) => {
    if (!selectedManageProduct) return
    if (!isCixciAdmin) {
      showSnackbar("Only CIXCI Admins can convert exclusions to Admin exclusions.", "warning")
      return
    }
    try {
      await api.post(`/catalog/products/${selectedManageProduct.id}/compatibility/`, {
        action: 'convert_to_admin_exclusion',
        device_reference: deviceReference
      })
      refetchCompatibilities()
    } catch (err: any) {
      showSnackbar("Failed to convert exclusion: " + (err.response?.data?.error || err.message), 'error')
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
      showSnackbar("Failed to add compatibility: " + (err.response?.data?.error || err.message), 'error')
    }
  }

  const handleBulkCompatUpdate = async () => {
    if (!selectedManageProduct || bulkSelectedDevices.length === 0) {
      showSnackbar("Please select at least one device.", "warning")
      return
    }
    if (bulkUpdateType !== 'add' && selectedManageProduct.status === 'active' && !isCixciAdmin) {
      showSnackbar("Replacing or removing device compatibility assertions on active products requires CIXCI Admin approval.", "warning")
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
      showSnackbar("Bulk compatibility update completed successfully.", "warning")
      setBulkSelectedDevices([])
    } catch (err: any) {
      showSnackbar("Failed to perform bulk update: " + (err.response?.data?.error || err.message), 'error')
    }
  }

  const handleManualRecalculate = async () => {
    if (!selectedManageProduct) return
    if (!isCixciAdmin) {
      showSnackbar("Only CIXCI Admins can manually trigger compatibility recalculation.", "warning")
      return
    }
    setIsRecalculating(true)
    try {
      await api.post(`/catalog/products/${selectedManageProduct.id}/recalculate-compatibility/`)
      refetchCompatibilities()
      showSnackbar("Compatibility recalculated successfully.", "warning")
    } catch (err: any) {
      showSnackbar("Failed to recalculate compatibility: " + (err.response?.data?.error || err.message), 'error')
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

    const applyBulkResult = (data: any) => {
      setBulkResult({
        total_rows_processed: data.total_rows_processed || 0,
        rows_passed: data.rows_passed || 0,
        rows_failed: data.rows_failed || 0,
        rows_staged: data.rows_staged || 0,
        errors: data.errors || [],
      })
      const importedSkus = Array.isArray(data.products)
        ? data.products.map((p: any) => p.sku).filter(Boolean)
        : []
      setBulkImportedSkus(importedSkus)
      setBulkFile(null)
      setCsvHeaders([])
      setCsvPreviewRows([])
      // Move straight to the image step — staged products stay hidden from
      // buyers until their images are attached.
      setBulkStep(2)
      refreshProducts()
    }

    try {
      const res = await api.post('/catalog/products/bulk_upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      applyBulkResult(res.data)
    } catch (err: any) {
      if (err.response?.status === 207 || err.response?.status === 400) {
        const data = err.response.data
        if (data && typeof data === 'object' && ('total_rows_processed' in data || 'errors' in data)) {
          applyBulkResult(data)
          return
        }
      }
      setBulkError(err.response?.data?.error || err.response?.data?.detail || 'Failed to upload catalog.')
    } finally {
      setUploadingBulk(false)
    }
  }

  const handleBulkImageUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bulkZipFile) return

    setBulkZipError(null)
    setBulkZipResult(null)
    setUploadingBulkZip(true)

    const formData = new FormData()
    formData.append('file', bulkZipFile)

    try {
      const res = await api.post('/media/assets/upload_zip/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setBulkZipResult(res.data)
      setBulkZipFile(null)
      refreshProducts()
    } catch (err: any) {
      setBulkZipError(
        err.response?.data?.error ||
        err.response?.data?.detail ||
        err.message ||
        'Failed to upload product images.'
      )
    } finally {
      setUploadingBulkZip(false)
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
    const exportIds = tab === 'products' ? allProductsSelectedIds : myCompatibilitySelectedIds
    try {
      await api.post('/catalog/export-jobs/create_job/', {
        format: exportFormat,
        include_incompatible: includeIncompatible,
        product_ids: exportIds,
      })
      if (tab === 'products') {
        setAllProductsSelectedIds([])
      } else {
        // Mark all exported products as "Product Added" for this buyer session
        setExportedProductIds(prev => {
          const next = new Set(prev)
          exportIds.forEach((id: string) => next.add(id))
          return next
        })
        setMyCompatibilitySelectedIds([])
      }
      setShowExportModal(false)
      setTab('export_jobs')
      refreshJobs()
    } catch (err: any) {
      const data = err.response?.data
      let msg = 'Failed to create export job.'
      if (data) {
        // CIXCI custom exception handler wraps all errors as { error, status_code, detail }
        const detail = data.detail ?? data
        if (typeof detail === 'string') {
          msg = detail
        } else if (Array.isArray(detail)) {
          msg = detail.join(' ')
        } else if (typeof detail === 'object') {
          // Field-level errors: { product_ids: ["msg1", "msg2"] } or nested
          const msgs: string[] = []
          for (const val of Object.values(detail)) {
            if (Array.isArray(val)) msgs.push(...val.map(String))
            else msgs.push(String(val))
          }
          msg = msgs.join(' ')
        }
      }
      setExportError(msg)
    }
  }

  const handleRefreshProjection = async () => {
    setRefreshingProj(true)
    try {
      await api.post('/catalog/my-projection/refresh/')
      await refreshProjection()
    } catch (err: any) {
      showSnackbar("Failed to refresh compatibility projection: " + (err.response?.data?.detail || err.message), 'error')
    } finally {
      setRefreshingProj(false)
    }
  }

  const openEditModal = (p: any) => {
    resetProductForm()
    setEditingProduct(p)
    setProdName(p.name || '')
    setProdSku(p.sku || '')
    setProdBrand(p.brand || '')
    setProdStatus(p.status || 'active')
    setProdType(p.product_type || 'accessory')
    setProdCategory(p.product_category || '')
    setProdDescription(p.description || '')
    const cleanPriceInput = (val: any) => {
      if (val === null || val === undefined || val === '') return '';
      const parsed = parseFloat(val);
      return isNaN(parsed) ? '' : parsed.toFixed(2);
    };
    setProdPrice(cleanPriceInput(p.vendor_wholesale_price_amount))
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
    setProdMsrp(cleanPriceInput(p.msrp))
    setProdMapPrice(cleanPriceInput(p.map_price))
    setProdSalePrice(cleanPriceInput(p.sale_price))
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
    // Filter out primary image from media references for additional fields
    const primaryUrl = p.primary_image_url || ''
    const cleanPrimary = primaryUrl.replace(/^(https?:\/\/[^\/]+)/, '')
    const additionalImages = (p.media_references || []).map((ref: any) => {
      return typeof ref === 'string' ? ref : (ref?.url || ref?.storage_key || '')
    }).filter((url: string) => {
      if (!url) return false
      const cleanRef = url.replace(/^(https?:\/\/[^\/]+)/, '')
      return cleanRef !== cleanPrimary
    })

    setProdImageUrl1(additionalImages[0] || '')
    setProdImageUrl2(additionalImages[1] || '')
    setProdImageUrl3(additionalImages[2] || '')
    setProdImageUrl4(additionalImages[3] || '')
    setProdImageUrl5(additionalImages[4] || '')
    setProdMetaTitle(p.meta_title || '')
    setProdMetaDescription(p.meta_description || '')

    // Prefill category-specific compatibility attributes
    setCompBluetooth(p.bluetooth_compatibility || '')
    setCompHeadphoneJack(p.headphone_jack_compatibility || '')
    setCompChargingInterface(p.compatible_charging_interface || '')
    
    const wirelessVal = p.wireless_charging_compatibility || ''
    setCompWirelessCharging(parseWirelessCharging(wirelessVal))
    
    setCompStorageExpansion(p.storage_expansion_compatibility || '')
    setCompMemoryCapacity(p.memory_capacity || '')
    setCompWatchCaseSize(p.compatible_watch_case_size || '')
    setCompUniversalDeviceTypes(p.compatible_device_types || [])

    // Prefill active compatibilities
    const compatList = activeCompatibilities || []
    setSelectedDeviceIds(compatList.map((c: any) => c.device_reference))
    
    setShowManageModal(false)
    setShowEditModal(true)
  }



  const toggleDeviceSelection = (id: string) => {
    if (selectedDeviceIds.includes(id)) {
      setSelectedDeviceIds(selectedDeviceIds.filter(x => x !== id))
    } else {
      setSelectedDeviceIds([...selectedDeviceIds, id])
    }
  }

  const getColorSwatchBg = (colorStr?: string | null, sysColorStr?: string | null) => {
    const c = ((colorStr || '') + ' ' + (sysColorStr || '')).toLowerCase().trim()
    if (c.includes('black') || c.includes('charcoal') || c.includes('dark')) return '#18181b'
    if (c.includes('white') || c.includes('arctic') || c.includes('silver') || c.includes('platinum')) return '#f8fafc'
    if (c.includes('blue') || c.includes('navy')) return '#1d4ed8'
    if (c.includes('red') || c.includes('crimson')) return '#dc2626'
    if (c.includes('green') || c.includes('olive') || c.includes('emerald')) return '#16a34a'
    if (c.includes('clear') || c.includes('transparent')) return 'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(200,225,255,0.4) 100%)'
    if (c.includes('gold') || c.includes('yellow')) return '#eab308'
    if (c.includes('purple') || c.includes('violet')) return '#9333ea'
    if (c.includes('pink') || c.includes('rose')) return '#f43f5e'
    if (c.includes('orange')) return '#f97316'
    if (c.includes('gray') || c.includes('grey') || c.includes('graphite')) return '#64748b'
    return '#94a3b8'
  }

  const formatExportedDate = (dateVal: any) => {
    if (!dateVal) return null
    try {
      const d = new Date(dateVal)
      if (isNaN(d.getTime())) return null
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      return `${mm}-${dd}-${d.getFullYear()}`
    } catch {
      return null
    }
  }

  const renderCatalogProductCard = (
    p: any,
    isSelected: boolean,
    onToggleSelect: () => void,
    showCheckbox: boolean,
    showBuyerAddBtn: boolean = true
  ) => {
    if (isCixciAdmin || isVendor || isBuyer) {
      const primaryUrl = p.primary_image_url || ''
      const cleanPrimary = primaryUrl.replace(/^(https?:\/\/[^\/]+)/, '')
      const additionalImages = (p.media_references || []).map((ref: any) => {
        return typeof ref === 'string' ? ref : (ref?.url || ref?.storage_key || '')
      }).filter((url: string) => {
        if (!url) return false
        const cleanRef = url.replace(/^(https?:\/\/[^\/]+)/, '')
        return cleanRef !== cleanPrimary
      })

      // Map dropdown status values to human-readable labels and badge colors
      const STATUS_LABEL: Record<string, string> = {
        active: 'Active',
        inactive: 'Inactive',
        out_of_stock: 'Out of Stock',
        eol: 'EOL',
        draft: 'Draft',
        pending_review: 'Pending Review',
        archived: 'Archived',
      }
      const STATUS_COLOR: Record<string, string> = {
        active: 'in-stock',
        inactive: 'out-of-stock',
        out_of_stock: 'out-of-stock',
        eol: 'out-of-stock',
        draft: 'low-stock',
        pending_review: 'low-stock',
        archived: 'out-of-stock',
      }
      const statusLabel = STATUS_LABEL[p.status] ?? (p.status || '—')
      const statusColor = STATUS_COLOR[p.status] ?? 'low-stock'
      const inv = p.inventory_level !== undefined && p.inventory_level !== null ? Number(p.inventory_level) : null

      return (
        <div
          className="admin-product-card"
          key={p.id}
          style={{
            border: isSelected ? '1px solid var(--accent)' : undefined,
            boxShadow: isSelected ? '0 0 16px rgba(var(--accent-rgb), 0.35)' : undefined,
          }}
          onMouseLeave={() => {
            if (hoveredCardImages[p.id]) {
              setHoveredCardImages(prev => {
                const next = { ...prev }
                delete next[p.id]
                return next
              })
            }
          }}
          onClick={async () => {
            setSelectedManageProduct(p)
            setShowManageModal(true)
            try {
              const detailRes = await api.get(`/catalog/products/${p.id}/`)
              setSelectedManageProduct(detailRes.data)
            } catch {}
          }}
        >
          {/* View Details hover badge – top-right corner */}
          <div className="admin-card-view-hint">
            <VisibilityIcon sx={{ fontSize: 11 }} /> View Details
          </div>

          {p.recommended_accessory && (
            <div className="admin-recommended-badge">
              ★ RECOMMENDED
            </div>
          )}

          <div className="admin-photo-container">
            {(() => {
              const displayImg = hoveredCardImages[p.id] || p.primary_image_url
              return displayImg ? (
                <img src={getImageUrl(displayImg)} alt={p.name} className="admin-main-img" />
              ) : (
                <div className="admin-placeholder-photo">
                  <ImageIcon sx={{ fontSize: 32 }} className="admin-placeholder-icon" />
                  <span className="admin-placeholder-text">Main product photo</span>
                </div>
              )
            })()}
          </div>

          <div className="admin-angle-row">
            {[0, 1, 2, 3].map((idx) => {
              const angleImg = additionalImages[idx]
              if (!angleImg) {
                return (
                  <div
                    key={idx}
                    className="admin-angle-box empty"
                    style={{ border: 'none', background: 'transparent' }}
                  />
                )
              }
              const isActiveThumb = (hoveredCardImages[p.id] || p.primary_image_url) === angleImg
              return (
                <div
                  key={idx}
                  className={`admin-angle-box${isActiveThumb ? ' active-thumb' : ''}`}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => {
                    setHoveredCardImages(prev => ({ ...prev, [p.id]: angleImg }))
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setHoveredCardImages(prev => ({ ...prev, [p.id]: angleImg }))
                  }}
                >
                  <img src={getImageUrl(angleImg)} alt={`Angle ${idx + 1}`} />
                </div>
              )
            })}
          </div>

          <div className="admin-card-brand">
            {(p.brand || p.vendor_name || 'TESTCOMM').toUpperCase()}
          </div>

          <div className="admin-card-title" title={p.name}>
            {p.name}
          </div>

          <div className="admin-cat-wrap">
            <span className="admin-category-pill">
              <span className="admin-cat-dot" />
              {p.product_category || p.product_type || 'Accessories'}
            </span>
          </div>

          {(isCixciAdmin || isBuyer) && p.exported_date && formatExportedDate(p.exported_date) ? (
            <div className="admin-exported-row">
              <span className="admin-label">Exported Date:</span>
              <span className="admin-val">{formatExportedDate(p.exported_date)}</span>
            </div>
          ) : null}

          <div className="admin-code-row">
            <div className="admin-code-item">
              <span className="admin-label">SKU</span>
              <span className="admin-code-val">{p.sku || '—'}</span>
            </div>
            <div className="admin-code-item">
              <span className="admin-label">UPC</span>
              <span className="admin-code-val">{p.upc || '—'}</span>
            </div>
          </div>

          <div className="admin-color-block">
            <div className="admin-color-row">
              <span className="admin-label">Color:</span>
              <span
                className="admin-color-swatch"
                style={{
                  background: getColorSwatchBg(p.color, p.system_color),
                  border: p.color?.toLowerCase()?.includes('white') || p.color?.toLowerCase()?.includes('clear') ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(0,0,0,0.3)',
                  marginLeft: 0,
                }}
              />
              <span className="admin-color-val" style={{ marginLeft: 2 }}>{p.color || '—'}</span>
            </div>
            <div className="admin-color-row">
              <span className="admin-label">System Color:</span>
              <span className="admin-color-val">{p.system_color || p.color || '—'}</span>
            </div>
          </div>

          <div className="admin-card-footer">
            <div className="admin-msrp-row">
              <span className="admin-label">MSRP:</span>
              <span className="admin-msrp-val">
                {formatCurrency(p.msrp || 0, p.vendor_wholesale_price_currency)}
              </span>
            </div>

            {(isCixciAdmin || isBuyer) && (
              <div className="admin-price-row">
                <span className="admin-label">Wholesale Price:</span>
                <span className="admin-val">
                  {formatCurrency(p.buyer_wholesale_price ?? p.vendor_wholesale_price_amount ?? 0, p.vendor_wholesale_price_currency)}
                </span>
              </div>
            )}

            {(isCixciAdmin || isVendor) && p.vendor_wholesale_price_amount != null && (
              <div className="admin-price-row">
                <span className="admin-label">Vendor Wholesale Price:</span>
                <span className="admin-val">
                  {formatCurrency(p.vendor_wholesale_price_amount, p.vendor_wholesale_price_currency)}
                </span>
              </div>
            )}

            {p.map_price && Number(p.map_price) > 0 ? (
              <div className="admin-price-row">
                <span className="admin-label">MAP:</span>
                <span className="admin-val">
                  {formatCurrency(p.map_price, p.vendor_wholesale_price_currency)}
                </span>
              </div>
            ) : null}

            {p.sale_price && Number(p.sale_price) > 0 ? (
              <div className="admin-price-row admin-sale-row">
                <span className="admin-label">Sale Price:</span>
                <span className="admin-val">
                  {formatCurrency(p.sale_price, p.vendor_wholesale_price_currency)}
                </span>
              </div>
            ) : null}

            <div className="admin-status-row">
              <span className="admin-label">Product Status:</span>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                <span className={`admin-stock-badge ${statusColor}`}>
                  {statusLabel}
                </span>
                {inv !== null && (
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    Inventory: {inv}
                  </span>
                )}
              </div>
            </div>

            {isBuyer && showBuyerAddBtn && (
              exportedProductIds.has(String(p.id)) ? (
                <div
                  className="buyer-add-product-btn selected"
                  style={{ opacity: 0.75, cursor: 'default' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>✓ Product Added</span>
                </div>
              ) : (
                <div
                  className={`buyer-add-product-btn ${isSelected ? 'selected' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleSelect()
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    style={{ cursor: 'pointer', accentColor: 'var(--accent)', width: 14, height: 14 }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 600, color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }}>
                    Add Product
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      )
    }

    const srp = Number(p.msrp || 0)
    const salePrice = Number(p.sale_price || 0)
    const displayPrice = isBuyer
      ? (p.buyer_wholesale_price ?? p.vendor_wholesale_price_amount ?? (salePrice > 0 ? salePrice : srp))
      : (p.vendor_wholesale_price_amount ?? (salePrice > 0 ? salePrice : srp))

    const hasPromo = p.promo_information && p.promo_information.trim() !== ''
    const badgeText = hasPromo ? p.promo_information : (salePrice > 0 && salePrice < srp ? 'Sale' : '')

    const specs = []
    if (p.brand) specs.push({ label: p.brand })
    if (p.color) specs.push({ type: 'color', val: p.color })
    if (p.headphone_jack_compatibility && p.headphone_jack_compatibility !== 'Not Compatible') {
      specs.push({ label: `Jack: ${p.headphone_jack_compatibility}` })
    }
    if (p.bluetooth_compatibility && p.bluetooth_compatibility !== 'No') {
      specs.push({ label: `BT ${p.bluetooth_compatibility}` })
    }
    if (p.compatible_charging_interface && p.compatible_charging_interface !== 'Not Compatible') {
      specs.push({ label: p.compatible_charging_interface })
    }
    if (p.wireless_charging_compatibility && p.wireless_charging_compatibility !== 'Not Compatible') {
      const parsedWireless = parseWirelessCharging(p.wireless_charging_compatibility).join(', ')
      if (parsedWireless && parsedWireless !== 'Not Compatible') {
        specs.push({ label: `Wireless: ${parsedWireless}` })
      }
    }

    return (
      <div
        className="telco-card"
        key={p.id}
        style={{
          border: isSelected ? '1px solid #20D1F2' : undefined,
          boxShadow: isSelected ? '0 0 12px rgba(32, 209, 242, 0.3)' : undefined,
        }}
        onClick={async () => {
          setSelectedManageProduct(p)
          setShowManageModal(true)
          try {
            const detailRes = await api.get(`/catalog/products/${p.id}/`)
            setSelectedManageProduct(detailRes.data)
          } catch {}
        }}
      >
        {showCheckbox && (
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              zIndex: 5,
              background: 'var(--bg-elevated)',
              borderRadius: 4,
              padding: '2px 4px',
              display: 'flex',
              alignItems: 'center',
              border: '1px solid var(--border)',
            }}
            onClick={(e) => {
              e.stopPropagation()
              onToggleSelect()
            }}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => {}}
              style={{ cursor: 'pointer' }}
            />
          </div>
        )}

        {badgeText && (
          <div className="telco-card-badge" style={{ left: showCheckbox ? 36 : 10 }}>
            {badgeText}
          </div>
        )}

        <div className="telco-card-view-hint">
          <VisibilityIcon sx={{ fontSize: 12 }} /> View Details
        </div>
        
        <div className="telco-card-img-wrap">
          {p.primary_image_url ? (
            <img src={getImageUrl(p.primary_image_url)} alt={p.name} width={120} height={120} loading="lazy" decoding="async" onLoad={e => (e.target as HTMLImageElement).classList.add('loaded')} />
          ) : (
            <ShoppingBagIcon sx={{ fontSize: 32, color: 'text.disabled' }} />
          )}
        </div>

        <div className="telco-card-name" title={p.name}>
          {p.name}
        </div>
        <div className="telco-card-sku">SKU: {p.sku}</div>

        <div className="telco-card-spec-row">
          {specs.map((s, idx) => (
            <span className="telco-card-spec-pill" key={idx}>
              {s.type === 'color' && (
                <span className="telco-color-swatch" style={{ background: s.val.toLowerCase() }} />
              )}
              {s.label || s.val}
            </span>
          ))}
        </div>

        <div className="telco-card-footer">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="telco-price-row">
              <span className="telco-sale-price">
                {formatCurrency(displayPrice, p.vendor_wholesale_price_currency)}
              </span>
              {srp > 0 && srp > Number(displayPrice) && (
                <span className="telco-msrp-strike">
                  {formatCurrency(srp, p.vendor_wholesale_price_currency)}
                </span>
              )}
            </div>
            <div className="telco-status-row">
              <StatusChip status={p.status ?? 'unknown'} size="small" />
            </div>
          </div>

          <button
            className="telco-card-btn"
            onClick={(e) => {
              e.stopPropagation()
              setSelectedManageProduct(p)
              setShowManageModal(true)
              api.get(`/catalog/products/${p.id}/`).then(res => setSelectedManageProduct(res.data)).catch(() => {})
            }}
          >
            Manage Product
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <style>{`
        .telco-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }
        .admin-product-card {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          position: relative;
          cursor: pointer;
          user-select: none;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .admin-product-card:hover {
          transform: translateY(-2px);
          border-color: var(--accent);
          box-shadow: 0 6px 24px rgba(var(--accent-rgb), 0.15);
        }
        .admin-card-view-hint {
          position: absolute;
          top: 10px;
          right: 10px;
          background: var(--bg-elevated);
          border: 1px solid rgba(var(--accent-rgb), 0.35);
          color: var(--accent);
          font-size: 10px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 99px;
          opacity: 0;
          transition: opacity 0.2s ease;
          display: flex;
          align-items: center;
          gap: 4px;
          backdrop-filter: blur(4px);
          z-index: 10;
          pointer-events: none;
        }
        .admin-product-card:hover .admin-card-view-hint {
          opacity: 1;
        }
        .admin-angle-box.active-thumb {
          border-color: rgba(var(--accent-rgb), 0.6);
          box-shadow: 0 0 6px rgba(var(--accent-rgb), 0.25);
        }
        .admin-angle-box:hover {
          border-color: rgba(var(--accent-rgb), 0.4);
        }
        .admin-card-checkbox {
          position: absolute;
          top: 12px;
          right: 12px;
          z-index: 10;
          background: var(--bg-elevated);
          border-radius: 4px;
          padding: 3px 5px;
          display: flex;
          align-items: center;
          border: 1px solid rgba(var(--accent-rgb), 0.3);
          cursor: pointer;
        }
        .admin-card-checkbox input {
          cursor: pointer;
          accent-color: var(--accent);
        }
        .buyer-add-product-btn {
          margin-top: 10px;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 8px 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .buyer-add-product-btn:hover {
          background: var(--bg-surface);
          border-color: var(--accent);
        }
        .buyer-add-product-btn.selected {
          background: rgba(var(--accent-rgb), 0.15);
          border-color: var(--accent);
        }
        .admin-recommended-badge {
          align-self: flex-start;
          margin-bottom: 8px;
          background: rgba(245, 158, 11, 0.12);
          border: 1px dashed rgba(245, 158, 11, 0.5);
          color: var(--amber);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.05em;
          padding: 3px 8px;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .admin-photo-container {
          height: 160px;
          background: var(--bg-elevated);
          border: 1px dashed var(--border);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }
        .admin-main-img {
          max-width: 85%;
          max-height: 135px;
          object-fit: contain;
        }
        .admin-placeholder-photo {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .admin-placeholder-icon {
          color: var(--text-muted);
        }
        .admin-placeholder-text {
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 500;
        }
        .admin-angle-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
          margin-top: 8px;
          margin-bottom: 14px;
        }
        .admin-angle-box {
          height: 42px;
          background: var(--bg-elevated);
          border: 1px dashed var(--border);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 500;
          color: var(--text-muted);
          overflow: hidden;
        }
        .admin-angle-box img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .admin-card-brand {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          color: var(--accent);
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .admin-card-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.35;
          margin-bottom: 8px;
          min-height: 38px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .admin-cat-wrap {
          margin-bottom: 12px;
        }
        .admin-category-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
        }
        .admin-cat-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
          display: inline-block;
        }
        .admin-exported-row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          margin-bottom: 8px;
        }
        .admin-exported-row .admin-label {
          color: var(--text-muted);
          font-size: 11px;
        }
        .admin-exported-row .admin-val {
          color: var(--text-secondary);
          font-weight: 500;
          font-size: 11px;
        }
        .admin-code-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          margin-bottom: 8px;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
        }
        .admin-code-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .admin-code-item .admin-label {
          color: var(--text-muted);
          font-size: 10px;
          font-weight: 600;
        }
        .admin-code-item .admin-code-val {
          color: var(--text-secondary);
          font-size: 11px;
        }
        .admin-color-block {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 14px;
          font-size: 12px;
        }
        .admin-color-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .admin-color-row .admin-label {
          color: var(--text-muted);
          font-size: 12px;
        }
        .admin-color-swatch {
          width: 11px;
          height: 11px;
          border-radius: 50%;
          display: inline-block;
          flex-shrink: 0;
        }
        .admin-color-row .admin-color-val {
          color: var(--text-primary);
          font-weight: 600;
          font-size: 12px;
        }
        .admin-card-footer {
          margin-top: auto;
          border-top: 1px solid var(--border);
          padding-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .admin-msrp-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 2px;
        }
        .admin-msrp-row .admin-label {
          color: var(--text-secondary);
          font-size: 12px;
        }
        .admin-msrp-val {
          font-size: 22px;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }
        .admin-price-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
        }
        .admin-price-row .admin-label {
          color: var(--text-secondary);
        }
        .admin-price-row .admin-val {
          color: var(--text-primary);
          font-weight: 600;
        }
        .admin-sale-row .admin-label,
        .admin-sale-row .admin-val {
          color: #f97316 !important;
          font-weight: 700 !important;
        }
        .admin-status-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          margin-top: 4px;
        }
        .admin-status-row .admin-label {
          color: var(--text-secondary);
        }
        .admin-stock-badge {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
        }
        .admin-stock-badge.in-stock {
          background: rgba(var(--accent-rgb), 0.12);
          border: 1px solid rgba(var(--accent-rgb), 0.4);
          color: var(--accent);
        }
        .admin-stock-badge.low-stock {
          background: rgba(180, 83, 9, 0.15);
          border: 1px solid rgba(234, 179, 8, 0.4);
          color: var(--amber);
        }
        .admin-stock-badge.out-of-stock {
          background: rgba(220, 38, 38, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: var(--red);
        }
        .telco-card {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          height: 100%;
          position: relative;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          user-select: none;
        }
        .telco-card:hover {
          transform: translateY(-4px);
          border-color: var(--accent);
          box-shadow: 0 4px 20px rgba(var(--accent-rgb), 0.15);
        }
        .telco-card-view-hint {
          position: absolute;
          top: 10px;
          right: 10px;
          background: var(--bg-elevated);
          border: 1px solid rgba(var(--accent-rgb), 0.3);
          color: var(--accent);
          font-size: 10px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 99px;
          opacity: 0;
          transition: opacity 0.2s ease;
          display: flex;
          align-items: center;
          gap: 4px;
          backdrop-filter: blur(4px);
          z-index: 2;
        }
        .telco-card:hover .telco-card-view-hint {
          opacity: 1;
        }
        .telco-card-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          background: linear-gradient(135deg, var(--amber) 0%, #d97706 100%);
          color: #fff;
          font-size: 9px;
          font-weight: 700;
          padding: 3px 6px;
          border-radius: 4px;
          text-transform: uppercase;
          z-index: 2;
          max-width: 110px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .telco-card-img-wrap {
          height: 140px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-elevated);
          border-radius: 8px;
          margin-bottom: 12px;
          overflow: hidden;
          border: 1px solid var(--border);
        }
        .telco-card-img-wrap img {
          max-width: 90%;
          max-height: 120px;
          object-fit: contain;
          opacity: 0;
          transition: opacity 0.15s ease;
        }
        .telco-card-img-wrap img.loaded {
          opacity: 1;
        }
        .telco-card-name {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.4;
          margin-bottom: 4px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .telco-card-sku {
          font-size: 10px;
          font-family: 'JetBrains Mono', monospace;
          color: var(--text-muted);
          margin-bottom: 8px;
        }
        .telco-card-spec-row {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-bottom: 12px;
        }
        .telco-card-spec-pill {
          font-size: 9px;
          font-weight: 600;
          color: var(--text-secondary);
          background: var(--bg-elevated);
          padding: 2px 6px;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          gap: 3px;
          border: 1px solid var(--border);
        }
        .telco-color-swatch {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: 1px solid var(--border);
        }
        .telco-card-footer {
          margin-top: auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
          border-top: 1px solid var(--border);
          padding-top: 10px;
        }
        .telco-price-row {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }
        .telco-sale-price {
          font-size: 15px;
          font-weight: 800;
          color: var(--accent);
        }
        .telco-msrp-strike {
          font-size: 11px;
          color: var(--text-muted);
          text-decoration: line-through;
        }
        .telco-status-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
        }
        .telco-card-btn {
          width: 100%;
          background: var(--accent);
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .telco-card-btn:hover {
          filter: brightness(1.1);
        }
      `}</style>
      <PageHeader
        title="Product Catalog"
        subtitle="Accessories, compatibility projections, export governance"
        actions={
          <Box sx={{ display: 'flex', gap: 1 }}>
            {isCixciAdmin && (
              <Button variant="outlined" startIcon={<SettingsIcon />} onClick={() => { setManageField('system_color'); setShowDropdownManagerModal(true); }}>
                Manage Dropdowns
              </Button>
            )}
            {isVendor && (
              <>
                <Button variant="outlined" startIcon={<CloudUploadIcon />} onClick={openBulkModal}>
                  Bulk Upload
                </Button>
                <Button variant="outlined" startIcon={<ImageIcon />} onClick={openBulkImagesModal}>
                  Upload Images (ZIP)
                </Button>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => { resetProductForm(); setShowAddModal(true); }}>
                  Add Product
                </Button>
              </>
            )}
          </Box>
        }
      />

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="All Products" value="products" />
        {isBuyer && <Tab label="My Compatibility" value="projection" />}
        {isBuyer && <Tab label="Export Jobs" value="export_jobs" />}
      </Tabs>

      {tab === 'products' && (
        <>
          <Box
            sx={{
              mb: 2,
              display: 'flex',
              gap: 1.5,
              flexWrap: 'wrap',
              alignItems: 'center',
              p: 2,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
            }}
          >
            <SearchBar
              placeholder="Search by name, SKU, brand, category, color, status, price…"
              value={allSearch}
              onChange={(e) => setAllSearch(e.target.value)}
              sx={{ width: 280 }}
            />

            {isBuyer && (
              <MultiSelect
                label="Filter by Device"
                placeholder="All Devices (My Portfolio)"
                selected={allFilterDeviceId ? allFilterDeviceId.split(',').filter(Boolean) : []}
                options={portfolio?.filter((d: any) => d.active_flag).map((d: any) => ({ value: d.device, label: d.device_name })) ?? []}
                onChange={(vals) => {
                  const newParams = new URLSearchParams(searchParams)
                  if (vals.length > 0) {
                    newParams.set('all_device', vals.join(','))
                  } else {
                    newParams.delete('all_device')
                  }
                  setSearchParams(newParams)
                }}
              />
            )}

            <MultiSelect
              label="Category"
              placeholder="All Categories"
              selected={allFilterCategories}
              options={allowedCategories}
              onChange={setAllFilterCategories}
            />

            <MultiSelect
              label="Brand"
              placeholder="All Brands"
              selected={allFilterBrands}
              options={brandsList}
              onChange={setAllFilterBrands}
            />

            <MultiSelect
              label="Color"
              placeholder="All Colors"
              selected={allFilterColors}
              options={allowedColors}
              onChange={setAllFilterColors}
            />

            <MultiSelect
              label="MSRP (Wholesale)"
              placeholder="All Prices"
              selected={allFilterMsrps}
              options={[
                { value: '0-25', label: 'Under $25' },
                { value: '25-50', label: '$25 to $50' },
                { value: '50-100', label: '$50 to $100' },
                { value: '100-200', label: '$100 to $200' },
                { value: '200+', label: 'Over $200' }
              ]}
              onChange={setAllFilterMsrps}
            />

            {isCixciAdmin && (
              <>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Vendor</InputLabel>
                  <Select
                    value={allFilterVendor}
                    label="Vendor"
                    onChange={(e) => setAllFilterVendor(e.target.value as string)}
                  >
                    <MenuItem value="">All Vendors</MenuItem>
                    {(Array.isArray(vendorCompaniesData) ? vendorCompaniesData : vendorCompaniesData?.results ?? [])
                      .slice()
                      .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''))
                      .map((c: any) => (
                        <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                      ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel>MAP Price</InputLabel>
                  <Select
                    value={allFilterMapPrice}
                    label="MAP Price"
                    onChange={(e) => setAllFilterMapPrice(e.target.value as string)}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="has">Has Value</MenuItem>
                    <MenuItem value="missing">Missing</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Wholesale Price</InputLabel>
                  <Select
                    value={allFilterWholesalePrice}
                    label="Wholesale Price"
                    onChange={(e) => setAllFilterWholesalePrice(e.target.value as string)}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="has">Has Value</MenuItem>
                    <MenuItem value="missing">Missing</MenuItem>
                  </Select>
                </FormControl>
              </>
            )}

            {(allFilterDeviceId || allFilterCategories.length > 0 || allFilterBrands.length > 0 || allFilterColors.length > 0 || allFilterMsrps.length > 0 || allFilterVendor || allFilterMapPrice || allFilterWholesalePrice) && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ alignSelf: 'flex-end', height: 38, padding: '0 12px' }}
                onClick={() => {
                  setAllFilterCategories([])
                  setAllFilterBrands([])
                  setAllFilterColors([])
                  setAllFilterMsrps([])
                  setAllFilterVendor('')
                  setAllFilterMapPrice('')
                  setAllFilterWholesalePrice('')
                  const newParams = new URLSearchParams(searchParams)
                  newParams.delete('all_device')
                  setSearchParams(newParams)
                }}
              >
                Clear Filters
              </button>
            )}

            {isCixciAdmin && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon />}
                disabled={exporting}
                sx={{ alignSelf: 'flex-end', height: 38 }}
                onClick={async () => {
                  setExporting(true)
                  try {
                    const res = await api.get('/catalog/products/', {
                      params: { ...productsFilterParams, paginate: 'false' },
                    })
                    const allProducts = Array.isArray(res.data) ? res.data : (res.data.results ?? [])
                    const rows = allProducts.map((p: any) => ({
                      SKU: p.sku || '',
                      Name: p.name || '',
                      Brand: p.brand || '',
                      Vendor: p.vendor_name || '',
                      Category: p.product_category || '',
                      Status: p.status || '',
                      'Selling Status': p.selling_status || '',
                      'MAP Price': p.map_price ?? '',
                      'Wholesale Price': p.vendor_wholesale_price_amount ?? '',
                      MSRP: p.msrp ?? '',
                      Color: p.color || '',
                      UPC: p.upc || '',
                    }))
                    const ws = XLSX.utils.json_to_sheet(rows)
                    const wb = XLSX.utils.book_new()
                    XLSX.utils.book_append_sheet(wb, ws, 'Products')
                    XLSX.writeFile(wb, 'products_export.xlsx')
                  } catch (err) {
                    console.error('Export failed', err)
                    showSnackbar?.('Export failed. Please try again.', 'error')
                  } finally {
                    setExporting(false)
                  }
                }}
              >
                {exporting ? 'Exporting…' : 'Export Excel'}
              </Button>
            )}

            {!isCixciAdmin && !isVendor && !isBuyer && allProductsSelectedIds.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
                <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 550 }}>
                  {allProductsSelectedIds.length} selected
                </span>
                <button className="btn btn-primary btn-sm" onClick={() => setShowExportModal(true)}>
                  Export Selection
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setAllProductsSelectedIds([])}>
                  Clear
                </button>
              </div>
            )}

            {/* View Mode Toggle Switch */}
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: 3, marginLeft: allProductsSelectedIds.length > 0 ? 0 : 'auto' }}>
              <button
                type="button"
                title="Grid View"
                onClick={() => setViewMode('grid')}
                style={{
                  background: viewMode === 'grid' ? 'var(--accent-dim)' : 'transparent',
                  border: viewMode === 'grid' ? '1px solid rgba(var(--accent-rgb), 0.4)' : '1px solid transparent',
                  color: viewMode === 'grid' ? 'var(--accent)' : 'var(--text-muted)',
                  borderRadius: 4,
                  padding: '4px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                }}
              >
                <GridViewIcon sx={{ fontSize: 14 }} />
                Grid
              </button>
              <button
                type="button"
                title="Table View"
                onClick={() => setViewMode('table')}
                style={{
                  background: viewMode === 'table' ? 'var(--accent-dim)' : 'transparent',
                  border: viewMode === 'table' ? '1px solid rgba(var(--accent-rgb), 0.4)' : '1px solid transparent',
                  color: viewMode === 'table' ? 'var(--accent)' : 'var(--text-muted)',
                  borderRadius: 4,
                  padding: '4px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                }}
              >
                <ViewListIcon sx={{ fontSize: 14 }} />
                Table
              </button>
            </div>
          </Box>

          {isProductsFetching && !isLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
              <CircularProgress size={12} />
              Updating results…
            </div>
          )}

          {viewMode === 'grid' ? (
            isLoading ? (
              <div className="loading-overlay"><div className="spinner" /> Loading products…</div>
            ) : isBuyer && (!portfolio || portfolio.filter((d: any) => d.active_flag).length === 0) ? (
              <div className="empty-state">
                <ShoppingBagIcon sx={{ fontSize: 40 }} />
                <div>Please add devices to your portfolio to view compatible products</div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="empty-state">
                <ShoppingBagIcon sx={{ fontSize: 40 }} />
                <div>No products found matching filters</div>
              </div>
            ) : (
              <div className="telco-grid" style={{ marginBottom: 24 }}>
                {paginatedAllProducts.map((p: any) =>
                  renderCatalogProductCard(
                    p,
                    allProductsSelectedIds.includes(p.id),
                    () => {
                      if (allProductsSelectedIds.includes(p.id)) {
                        setAllProductsSelectedIds(allProductsSelectedIds.filter(x => x !== p.id))
                      } else {
                        setAllProductsSelectedIds([...allProductsSelectedIds, p.id])
                      }
                    },
                    !isCixciAdmin && !isVendor,
                    false  // hide Add Product on All Products tab for buyers
                  )
                )}
              </div>
            )
          ) : (
            <div className="table-wrap">
              {isLoading ? (
                <div className="loading-overlay"><div className="spinner" /> Loading products…</div>
              ) : isBuyer && (!portfolio || portfolio.filter((d: any) => d.active_flag).length === 0) ? (
                <div className="empty-state">
                  <ShoppingBagIcon sx={{ fontSize: 40 }} />
                  <div>Please add devices to your portfolio to view compatible products</div>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="empty-state">
                  <ShoppingBagIcon sx={{ fontSize: 40 }} />
                  <div>No products found matching filters</div>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      {!isBuyer && !isCixciAdmin && !isVendor && (
                        <th style={{ width: 40, textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={filteredProducts.length > 0 && filteredProducts.every((p: any) => allProductsSelectedIds.includes(p.id))}
                            onChange={async () => {
                              const allSelected = filteredProducts.length > 0 && filteredProducts.every((p: any) => allProductsSelectedIds.includes(p.id))
                              if (allSelected) {
                                setAllProductsSelectedIds(allProductsSelectedIds.filter(id => !filteredProducts.some((p: any) => p.id === id)))
                              } else {
                                const matchingIds = await fetchMatchingIds()
                                setAllProductsSelectedIds(Array.from(new Set([...allProductsSelectedIds, ...matchingIds])))
                              }
                            }}
                          />
                        </th>
                      )}
                      <th style={{ width: 60 }}>Image</th>
                      <th>Product Name</th>
                      <th>SKU</th>
                      <th>Brand</th>
                      <th>Type</th>
                      <th>Category</th>
                      <th>{isVendor ? 'Vendor Wholesale Price' : 'Wholesale Price'}</th>
                      <th>MSRP</th>
                      {isBuyer && <th>Exported Date</th>}
                      <th>Status</th>
                      <th>Selling</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAllProducts.map((p: any) => (
                      <tr
                        key={p.id}
                        onClick={async () => {
                          setSelectedManageProduct(p)
                          setShowManageModal(true)
                          try {
                            const detailRes = await api.get(`/catalog/products/${p.id}/`)
                            setSelectedManageProduct(detailRes.data)
                          } catch {}
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {!isBuyer && !isCixciAdmin && !isVendor && (
                          <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={allProductsSelectedIds.includes(p.id)}
                              onChange={() => {
                                if (allProductsSelectedIds.includes(p.id)) {
                                  setAllProductsSelectedIds(allProductsSelectedIds.filter(x => x !== p.id))
                                } else {
                                  setAllProductsSelectedIds([...allProductsSelectedIds, p.id])
                                }
                              }}
                            />
                          </td>
                        )}
                        <td>
                          {p.primary_image_url ? (
                            <img
                              src={getImageUrl(p.primary_image_url)}
                              alt={p.name}
                              loading="lazy"
                              decoding="async"
                              style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border)' }}
                            />
                          ) : (
                            <div style={{ width: 36, height: 36, background: 'var(--bg-elevated)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                              <ShoppingBagIcon sx={{ fontSize: 14 }} />
                            </div>
                          )}
                        </td>
                        <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{p.name}</td>
                        <td>{p.sku}</td>
                        <td>{p.brand}</td>
                        <td>{p.product_type}</td>
                        <td>{p.product_category || '—'}</td>
                        <td className="mono">
                          {isBuyer
                            ? formatCurrency(p.buyer_wholesale_price, p.vendor_wholesale_price_currency)
                            : formatCurrency(p.vendor_wholesale_price_amount, p.vendor_wholesale_price_currency)
                          }
                        </td>
                        <td className="mono">{formatCurrency(p.msrp, p.vendor_wholesale_price_currency)}</td>
                        {isBuyer && (
                          <td>
                            {p.exported_date ? (
                              formatETDate(p.exported_date)
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>Never Exported</span>
                            )}
                          </td>
                        )}
                        <td><StatusChip status={p.status ?? 'unknown'} /></td>
                        <td><StatusChip status={p.selling_status ?? 'unknown'} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
          <Pagination
            currentPage={allProductsPage}
            totalPages={totalAllProductsPages}
            totalItems={totalAllProducts}
            pageSize={50}
            onPageChange={setAllProductsPage}
            itemName="products"
          />
        </>
      )}

      {tab === 'projection' && isBuyer && (
        <div className="card">
          <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span className="section-title" style={{ fontSize: 15, fontWeight: 600 }}>Buyer Compatibility Projection</span>
            <button className="btn btn-secondary btn-sm" onClick={handleRefreshProjection} disabled={refreshingProj || isRefetchingProj}>
              <RefreshIcon sx={{ fontSize: 13 }} className={refreshingProj || isRefetchingProj ? 'spin' : ''} />
              {refreshingProj || isRefetchingProj ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
          {!projection ? (
            <div className="empty-state">
              {isProjectionLoading ? (
                <>
                  <RefreshIcon sx={{ fontSize: 40 }} className="spin" />
                  <div>Loading your compatibility projection…</div>
                </>
              ) : projectionError ? (
                <>
                  <ShoppingBagIcon sx={{ fontSize: 40 }} />
                  <div>Could not load your compatibility projection</div>
                  <div style={{ fontSize: 12 }}>Check your connection and try again.</div>
                  <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={() => refreshProjection()}>
                    Retry
                  </button>
                </>
              ) : (
                <>
                  <ShoppingBagIcon sx={{ fontSize: 40 }} />
                  <div>No devices in your portfolio yet</div>
                  <div style={{ fontSize: 12 }}>Add devices in My Devices to see accessories that fit them.</div>
                  <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => navigate('/devices')}>
                    Go to My Devices
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
                <div style={{ textAlign: 'center', padding: '20px 16px', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--green)', lineHeight: 1 }}>
                    {(compatFilterDeviceId || compatSearch || compatFilterCategories.length > 0 || compatFilterBrands.length > 0 || compatFilterColors.length > 0 || compatFilterMsrps.length > 0)
                      ? compatibleProducts.length
                      : (projection.compatible_product_count ?? compatibleProducts.length)
                    }
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginTop: 8 }}>Compatible Products</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Unique accessories currently compatible with one or more devices in My Portfolio</div>
                </div>
                <div style={{ textAlign: 'center', padding: '20px 16px', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span className={`badge ${
                    projection.status === 'active' ? 'badge-green' :
                    projection.status === 'recalculating' ? 'badge-blue' :
                    projection.status === 'review_required' ? 'badge-amber' : 'badge-muted'
                  }`} style={{ fontSize: 13, padding: '6px 14px', textTransform: 'capitalize', display: 'inline-block' }}>
                    {projection.status === 'recalculating' ? 'Calculating' : (projection.status === 'review_required' ? 'Review Required' : projection.status)}
                  </span>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginTop: 12 }}>Projection Status</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Whether the buyer compatibility projection is active, calculating, or requires review</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 24 }}>
                Last recalculated: {projection.last_recalculated_at ? formatETDate(projection.last_recalculated_at) : '—'}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 12,
                  padding: 16,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  marginBottom: 16,
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Search</label>
                    <div className="search-bar" style={{ width: 240, margin: 0 }}>
                      <SearchIcon sx={{ fontSize: 14 }} />
                      <input placeholder="Search compatible products…" value={compatSearch} onChange={e => setCompatSearch(e.target.value)} />
                    </div>
                  </div>

                  {isBuyer && (
                    <MultiSelect
                      label="Filter by Device"
                      placeholder="All Devices (My Portfolio)"
                      selected={compatFilterDeviceId ? compatFilterDeviceId.split(',').filter(Boolean) : []}
                      options={portfolio?.filter((d: any) => d.active_flag).map((d: any) => ({ value: d.device, label: d.device_name })) ?? []}
                      onChange={(vals) => {
                        const newParams = new URLSearchParams(searchParams)
                        if (vals.length > 0) {
                          newParams.set('compatibility_device', vals.join(','))
                        } else {
                          newParams.delete('compatibility_device')
                        }
                        setSearchParams(newParams)
                      }}
                    />
                  )}

                  <MultiSelect
                    label="Category"
                    placeholder="All Categories"
                    selected={compatFilterCategories}
                    options={allowedCategories}
                    onChange={setCompatFilterCategories}
                  />

                  <MultiSelect
                    label="Brand"
                    placeholder="All Brands"
                    selected={compatFilterBrands}
                    options={brandsList}
                    onChange={setCompatFilterBrands}
                  />

                  <MultiSelect
                    label="Color"
                    placeholder="All Colors"
                    selected={compatFilterColors}
                    options={allowedColors}
                    onChange={setCompatFilterColors}
                  />

                  <MultiSelect
                    label="MSRP (Wholesale)"
                    placeholder="All Prices"
                    selected={compatFilterMsrps}
                    options={[
                      { value: '0-25', label: 'Under $25' },
                      { value: '25-50', label: '$25 to $50' },
                      { value: '50-100', label: '$50 to $100' },
                      { value: '100-200', label: '$100 to $200' },
                      { value: '200+', label: 'Over $200' }
                    ]}
                    onChange={setCompatFilterMsrps}
                  />

                  {(compatFilterDeviceId || compatFilterCategories.length > 0 || compatFilterBrands.length > 0 || compatFilterColors.length > 0 || compatFilterMsrps.length > 0) && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ alignSelf: 'flex-end', height: 38, padding: '0 12px' }}
                      onClick={() => {
                        setCompatFilterCategories([])
                        setCompatFilterBrands([])
                        setCompatFilterColors([])
                        setCompatFilterMsrps([])
                        const newParams = new URLSearchParams(searchParams)
                        newParams.delete('compatibility_device')
                        newParams.delete('device')
                        setSearchParams(newParams)
                      }}
                    >
                      Clear Filters
                    </button>
                  )}

                  {compatibleProducts.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-end', height: 38, marginLeft: myCompatibilitySelectedIds.length > 0 ? 0 : 'auto' }}>
                      <label
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          userSelect: 'none',
                          padding: '0 12px',
                          height: 38,
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          transition: 'all 0.15s ease',
                        }}
                        title="Select or deselect all compatible products across all pages"
                      >
                        <input
                          type="checkbox"
                          checked={compatibleProducts.length > 0 && compatibleProducts.every((p: any) => myCompatibilitySelectedIds.includes(p.id))}
                          ref={(el) => {
                            if (el) {
                              const isAll = compatibleProducts.length > 0 && compatibleProducts.every((p: any) => myCompatibilitySelectedIds.includes(p.id))
                              const isSome = !isAll && compatibleProducts.some((p: any) => myCompatibilitySelectedIds.includes(p.id))
                              el.indeterminate = isSome
                            }
                          }}
                          onChange={async (e) => {
                            if (e.target.checked) {
                              const allIds = await fetchMatchingIds()
                              setMyCompatibilitySelectedIds(allIds)
                            } else {
                              setMyCompatibilitySelectedIds([])
                            }
                          }}
                          style={{ cursor: 'pointer', accentColor: 'var(--accent)', width: 14, height: 14 }}
                        />
                        <span>Select All</span>
                      </label>
                    </div>
                  )}

                  {myCompatibilitySelectedIds.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
                      <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 550 }}>
                        {myCompatibilitySelectedIds.length} selected
                      </span>
                      <button className="btn btn-primary btn-sm" onClick={() => setShowExportModal(true)}>
                        Export Selection
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setMyCompatibilitySelectedIds([])}>
                        Clear
                      </button>
                    </div>
                  )}

                  {/* View Mode Toggle Switch */}
                  <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: 3, marginLeft: 0 }}>
                    <button
                      type="button"
                      title="Grid View"
                      onClick={() => setViewMode('grid')}
                      style={{
                        background: viewMode === 'grid' ? 'var(--accent-dim)' : 'transparent',
                        border: viewMode === 'grid' ? '1px solid rgba(var(--accent-rgb), 0.4)' : '1px solid transparent',
                        color: viewMode === 'grid' ? 'var(--accent)' : 'var(--text-muted)',
                        borderRadius: 4,
                        padding: '4px 10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <GridViewIcon sx={{ fontSize: 14 }} />
                      Grid
                    </button>
                    <button
                      type="button"
                      title="Table View"
                      onClick={() => setViewMode('table')}
                      style={{
                        background: viewMode === 'table' ? 'var(--accent-dim)' : 'transparent',
                        border: viewMode === 'table' ? '1px solid rgba(var(--accent-rgb), 0.4)' : '1px solid transparent',
                        color: viewMode === 'table' ? 'var(--accent)' : 'var(--text-muted)',
                        borderRadius: 4,
                        padding: '4px 10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <ViewListIcon sx={{ fontSize: 14 }} />
                      Table
                    </button>
                  </div>
                </div>

                {viewMode === 'grid' ? (
                  compatibleProducts.length === 0 ? (
                    <div className="empty-state" style={{ padding: '32px 0' }}>
                      <ShoppingBagIcon sx={{ fontSize: 32 }} />
                      <div>{compatEmptyState.title}</div>
                      <div style={{ fontSize: 12 }}>{compatEmptyState.hint}</div>
                      {portfolioDeviceCount === 0 && !compatHasActiveFilters && (
                        <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => navigate('/devices')}>
                          Go to My Devices
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="telco-grid" style={{ marginBottom: 24 }}>
                      {paginatedCompatProducts.map((p: any) =>
                        renderCatalogProductCard(
                          p,
                          myCompatibilitySelectedIds.includes(p.id),
                          () => {
                            if (myCompatibilitySelectedIds.includes(p.id)) {
                              setMyCompatibilitySelectedIds(myCompatibilitySelectedIds.filter(x => x !== p.id))
                            } else {
                              setMyCompatibilitySelectedIds([...myCompatibilitySelectedIds, p.id])
                            }
                          },
                          true,
                          true  // show Add Product / Product Added on My Compatibility tab
                        )
                      )}
                    </div>
                  )
                ) : (
                  <div className="table-wrap">
                    {compatibleProducts.length === 0 ? (
                      <div className="empty-state" style={{ padding: '32px 0' }}>
                        <ShoppingBagIcon sx={{ fontSize: 32 }} />
                        <div>{compatEmptyState.title}</div>
                        <div style={{ fontSize: 12 }}>{compatEmptyState.hint}</div>
                        {portfolioDeviceCount === 0 && !compatHasActiveFilters && (
                          <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => navigate('/devices')}>
                            Go to My Devices
                          </button>
                        )}
                      </div>
                    ) : (
                      <table>
                        <thead>
                          <tr>
                            <th style={{ width: 40, textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={compatibleProducts.length > 0 && compatibleProducts.every((p: any) => myCompatibilitySelectedIds.includes(p.id))}
                                onChange={async () => {
                                  const allSelected = compatibleProducts.length > 0 && compatibleProducts.every((p: any) => myCompatibilitySelectedIds.includes(p.id))
                                  if (allSelected) {
                                    setMyCompatibilitySelectedIds(myCompatibilitySelectedIds.filter(id => !compatibleProducts.some((p: any) => p.id === id)))
                                  } else {
                                    const matchingIds = await fetchMatchingIds()
                                    setMyCompatibilitySelectedIds(Array.from(new Set([...myCompatibilitySelectedIds, ...matchingIds])))
                                  }
                                }}
                              />
                            </th>
                            <th style={{ width: 60 }}>Image</th>
                            <th>Product Name</th>
                            <th>SKU</th>
                            <th>Brand</th>
                            <th>Type</th>
                            <th>Category</th>
                            <th>{isVendor ? 'Vendor Wholesale Price' : 'Wholesale Price'}</th>
                            <th>MSRP</th>
                            <th>Status</th>
                            <th>Selling</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedCompatProducts.map((p: any) => (
                            <tr
                              key={p.id}
                              onClick={async () => {
                                setSelectedManageProduct(p)
                                setShowManageModal(true)
                                try {
                                  const detailRes = await api.get(`/catalog/products/${p.id}/`)
                                  setSelectedManageProduct(detailRes.data)
                                } catch {}
                              }}
                              style={{ cursor: 'pointer' }}
                            >
                              <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={myCompatibilitySelectedIds.includes(p.id)}
                                  onChange={() => {
                                    if (myCompatibilitySelectedIds.includes(p.id)) {
                                      setMyCompatibilitySelectedIds(myCompatibilitySelectedIds.filter(x => x !== p.id))
                                    } else {
                                      setMyCompatibilitySelectedIds([...myCompatibilitySelectedIds, p.id])
                                    }
                                  }}
                                />
                              </td>
                              <td>
                                {p.primary_image_url ? (
                                  <img
                                    src={getImageUrl(p.primary_image_url)}
                                    alt={p.name}
                                    loading="lazy"
                                    decoding="async"
                                    style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border)' }}
                                  />
                                ) : (
                                  <div style={{ width: 36, height: 36, background: 'var(--bg-elevated)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                    <ShoppingBagIcon sx={{ fontSize: 14 }} />
                                  </div>
                                )}
                              </td>
                              <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{p.name}</td>
                              <td>{p.sku}</td>
                              <td>{p.brand}</td>
                              <td>{p.product_type}</td>
                              <td>{p.product_category || '—'}</td>
                              <td className="mono">
                                {isBuyer
                                  ? formatCurrency(p.buyer_wholesale_price, p.vendor_wholesale_price_currency)
                                  : formatCurrency(p.vendor_wholesale_price_amount, p.vendor_wholesale_price_currency)
                                }
                              </td>
                              <td className="mono">{formatCurrency(p.msrp, p.vendor_wholesale_price_currency)}</td>
                              <td><span className={`badge ${STATUS_BADGE[p.status] ?? 'badge-muted'}`}>{p.status}</span></td>
                              <td><span className={`badge ${SELL_BADGE[p.selling_status] ?? 'badge-muted'}`}>{p.selling_status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
                <Pagination
                  currentPage={compatPage}
                  totalPages={totalCompatPages}
                  totalItems={totalCompatProducts}
                  pageSize={50}
                  onPageChange={setCompatPage}
                  itemName="products"
                />
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
              <RefreshIcon sx={{ fontSize: 13 }} className={isRefetchingJobs ? 'spin' : ''} />
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
                    <th>Job ID</th><th>Format</th><th>Exported By</th><th>Product Count</th><th>Created</th><th>Status</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedJobs.map((job: any) => (
                    <tr key={job.id}>
                      <td className="mono" style={{ fontSize: 12 }}>
                        <button 
                          className="btn-link" 
                          style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer', color: 'var(--blue)', textDecoration: 'underline' }} 
                          onClick={() => setSelectedJob(job)}
                        >
                          {job.id.slice(0, 8)}…
                        </button>
                      </td>
                      <td className="mono" style={{ textTransform: 'uppercase' }}>{job.format}</td>
                      <td>{job.triggered_by_name || 'System'}</td>
                      <td>{job.product_count ?? 0}</td>
                      <td>{formatETDate(job.created_at)}</td>
                      <td>
                        <span className={`badge ${
                          job.status === 'completed' ? 'badge-green' :
                          job.status === 'completed_with_errors' ? 'badge-amber' :
                          job.status === 'failed' ? 'badge-red' :
                          job.status === 'cancelled' || job.status === 'canceled' ? 'badge-muted' :
                          job.status === 'running' || job.status === 'processing' ? 'badge-blue' : 'badge-muted'
                        }`} style={{ textTransform: 'capitalize' }}>
                          {job.status === 'completed_with_errors' ? 'Completed with Errors' :
                           job.status === 'processing' || job.status === 'running' ? 'Processing' :
                           job.status}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => setSelectedJob(job)}>
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <Pagination
            currentPage={jobsPage}
            totalPages={totalJobsPages}
            totalItems={totalJobs}
            pageSize={50}
            onPageChange={setJobsPage}
            itemName="jobs"
          />
        </div>
      )}

      {/* ─── ADD PRODUCT MODAL ─────────────────────────────────────────────────── */}
      <Dialog open={showAddModal} onClose={handleCloseAddModal} fullWidth maxWidth="md" scroll="paper" slotProps={{ paper: { component: 'form', onSubmit: handleAddProduct } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Add Product
          <IconButton size="small" onClick={handleCloseAddModal}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
              {formError && (
                <div style={{ background: 'var(--red-dim)', color: 'var(--red)', padding: '10px 12px', borderRadius: 6, marginBottom: 12, fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <ErrorOutlinedIcon sx={{ fontSize: 14 }} />
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
                <div className="form-group">
                  <label className="label">SKU *</label>
                  <input className="input" placeholder="e.g. ACC-USBC-01" value={prodSku} onChange={e => setProdSku(e.target.value)} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="label">UPC *</label>
                    <input className="input" placeholder="e.g. 190123456789" value={prodUpc} onChange={e => setProdUpc(e.target.value)} required={isVendor} />
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
                        <ShoppingBagIcon sx={{ fontSize: 18 }} />
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <input
                        type="file"
                        accept=".png,.zip"
                        id="add-image-file"
                        style={{ display: 'none' }}
                        onChange={handleImageChange}
                        multiple
                      />
                      <label htmlFor="add-image-file" className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-block', width: 'fit-content' }}>
                        Choose File
                      </label>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>PNG (transparent) or ZIP of PNGs (Max 10MB)</div>
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
                          setUploadedPrimaryAssetId(null)
                        }}
                      />
                    </div>
                  </div>
                  {uploadedZipImages.length > 0 && (
                    <div style={{ marginTop: 10, padding: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckIcon sx={{ fontSize: 14, color: 'success.main' }} /> Generated Image Links:
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
                                showSnackbar(`Copied link for ${img.name}!`, "warning")
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

              {/* 8. Compatibility */}
              {prodType === 'accessory' && (
                <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 16, marginBottom: 16 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>8. Compatibility</h4>
                  
                  {['Headphones', 'Speakers', 'Chargers and Cables', 'Memory', 'Wearable Tech', 'Watch Accessories'].includes(prodCategory) && (
                    <div style={{ gridColumn: '1 / -1', marginTop: 4, marginBottom: 16 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
                        Category-Specific Compatibility *
                      </span>
                      {renderCategorySpecificCompatibility()}
                    </div>
                  )}

                  {/* Universal Device Types selector */}
                  <div style={{ gridColumn: '1 / -1', marginBottom: 14, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 650, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Universal Device Types (Auto-map all devices of type)
                      </span>
                      {compUniversalDeviceTypes.length > 0 && (
                        <span className="badge badge-accent" style={{ fontSize: 10, padding: '1px 6px' }}>Universal Active</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.4 }}>
                      For universal accessories (e.g. tether straps, generic chargers). Automatically maps to all current and future devices of the selected types.
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {[
                        { code: 'phone', label: '📱 All Phones', hint: '75+ models' },
                        { code: 'tablet', label: '📱 All Tablets', hint: '27+ models' },
                        { code: 'smartwatch', label: '⌚ All Smartwatches', hint: 'Smartwatch models' },
                      ].map(({ code, label, hint }) => {
                        const isSelected = compUniversalDeviceTypes.includes(code);
                        return (
                          <button
                            key={code}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setCompUniversalDeviceTypes(compUniversalDeviceTypes.filter(c => c !== code));
                              } else {
                                setCompUniversalDeviceTypes([...compUniversalDeviceTypes, code]);
                              }
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '6px 12px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 550,
                              cursor: 'pointer',
                              border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                              background: isSelected ? 'var(--accent-dim, rgba(59, 130, 246, 0.15))' : 'var(--bg-main)',
                              color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <span>{label}</span>
                            <span style={{ fontSize: 10, opacity: 0.75 }}>({hint})</span>
                            {isSelected && <CheckIcon sx={{ fontSize: 12 }} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ gridColumn: '1 / -1', marginTop: 12, position: 'relative', zIndex: showDeviceDropdown ? 50 : 1 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
                      Device Compatibility *
                    </span>
                    
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
                              <CloseIcon sx={{ fontSize: 12, color: 'error.main', cursor: 'pointer' }} />
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
                          top: '100%',
                          left: 0,
                          right: 0,
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          zIndex: 100,
                          marginTop: 4,
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
                                  {isSelected && <CheckIcon sx={{ fontSize: 14, color: 'primary.main' }} />}
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
                </div>
              )}


        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={handleCloseAddModal}>Cancel</Button>
          <Button variant="contained" type="submit">List Product</Button>
        </DialogActions>
      </Dialog>

      {/* ─── EDIT PRODUCT MODAL ─────────────────────────────────────────────────── */}
      <Dialog open={showEditModal} onClose={handleCloseEditModal} fullWidth maxWidth="md" scroll="paper" slotProps={{ paper: { component: 'form', onSubmit: handleEditProduct } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Edit Product
          <IconButton size="small" onClick={handleCloseEditModal}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
              {formError && (
                <div style={{ background: 'var(--red-dim)', color: 'var(--red)', padding: '10px 12px', borderRadius: 6, marginBottom: 12, fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <ErrorOutlinedIcon sx={{ fontSize: 14 }} />
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
                <div className="form-group">
                  <label className="label">SKU *</label>
                  <input className="input" placeholder="e.g. ACC-USBC-01" value={prodSku} onChange={e => setProdSku(e.target.value)} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="label">UPC *</label>
                    <input className="input" placeholder="e.g. 190123456789" value={prodUpc} onChange={e => setProdUpc(e.target.value)} required={isVendor} />
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
                        <ShoppingBagIcon sx={{ fontSize: 18 }} />
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <input
                        type="file"
                        accept=".png,.zip"
                        id="edit-image-file"
                        style={{ display: 'none' }}
                        onChange={handleImageChange}
                        multiple
                      />
                      <label htmlFor="edit-image-file" className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-block', width: 'fit-content' }}>
                        Choose File
                      </label>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>PNG (transparent) or ZIP of PNGs (Leave blank to keep current)</div>
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
                          setUploadedPrimaryAssetId(null)
                        }}
                      />
                    </div>
                  </div>
                  {uploadedZipImages.length > 0 && (
                    <div style={{ marginTop: 10, padding: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckIcon sx={{ fontSize: 14, color: 'success.main' }} /> Generated Image Links:
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
                                showSnackbar(`Copied link for ${img.name}!`, "warning")
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

              {/* 8. Compatibility */}
              {prodType === 'accessory' && (
                <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 16, marginBottom: 16 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>8. Compatibility</h4>
                  
                  {['Headphones', 'Speakers', 'Chargers and Cables', 'Memory', 'Wearable Tech', 'Watch Accessories'].includes(prodCategory) && (
                    <div style={{ gridColumn: '1 / -1', marginTop: 4, marginBottom: 16 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
                        Category-Specific Compatibility *
                      </span>
                      {renderCategorySpecificCompatibility()}
                    </div>
                  )}

                  {/* Universal Device Types selector */}
                  <div style={{ gridColumn: '1 / -1', marginBottom: 14, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 650, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Universal Device Types (Auto-map all devices of type)
                      </span>
                      {compUniversalDeviceTypes.length > 0 && (
                        <span className="badge badge-accent" style={{ fontSize: 10, padding: '1px 6px' }}>Universal Active</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.4 }}>
                      For universal accessories (e.g. tether straps, generic chargers). Automatically maps to all current and future devices of the selected types.
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {[
                        { code: 'phone', label: '📱 All Phones', hint: '75+ models' },
                        { code: 'tablet', label: '📱 All Tablets', hint: '27+ models' },
                        { code: 'smartwatch', label: '⌚ All Smartwatches', hint: 'Smartwatch models' },
                      ].map(({ code, label, hint }) => {
                        const isSelected = compUniversalDeviceTypes.includes(code);
                        return (
                          <button
                            key={code}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setCompUniversalDeviceTypes(compUniversalDeviceTypes.filter(c => c !== code));
                              } else {
                                setCompUniversalDeviceTypes([...compUniversalDeviceTypes, code]);
                              }
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '6px 12px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 550,
                              cursor: 'pointer',
                              border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                              background: isSelected ? 'var(--accent-dim, rgba(59, 130, 246, 0.15))' : 'var(--bg-main)',
                              color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <span>{label}</span>
                            <span style={{ fontSize: 10, opacity: 0.75 }}>({hint})</span>
                            {isSelected && <CheckIcon sx={{ fontSize: 12 }} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ gridColumn: '1 / -1', marginTop: 12, position: 'relative', zIndex: showDeviceDropdown ? 50 : 1 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
                      Device Compatibility *
                    </span>
                    
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
                              <CloseIcon sx={{ fontSize: 12, color: 'error.main', cursor: 'pointer' }} />
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
                          top: '100%',
                          left: 0,
                          right: 0,
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          zIndex: 100,
                          marginTop: 4,
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
                                  {isSelected && <CheckIcon sx={{ fontSize: 14, color: 'primary.main' }} />}
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
                </div>
              )}

              

        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={handleCloseEditModal}>Cancel</Button>
          <Button variant="contained" type="submit">Save Changes</Button>
        </DialogActions>
      </Dialog>

      {/* ─── MANAGE PRODUCT (DETAILS) MODAL ─────────────────────────────────────── */}
      <Dialog open={!!(showManageModal && selectedManageProduct)} onClose={() => setShowManageModal(false)} fullWidth maxWidth="lg" scroll="paper">
        {selectedManageProduct && (<>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {isBuyer ? 'Product Details' : 'Manage Product'}
          <IconButton size="small" onClick={() => setShowManageModal(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
            
            <div style={{ display: 'flex', gap: 16, marginBottom: 18 }}>
              {selectedManageProduct.primary_image_url ? (
                <img
                  src={getImageUrl(selectedManageProduct.primary_image_url)}
                  alt={selectedManageProduct.name}
                  style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }}
                />
              ) : (
                <div style={{ width: 80, height: 80, background: 'var(--bg-elevated)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  <ShoppingBagIcon sx={{ fontSize: 28 }} />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: 17, fontWeight: 650, color: 'var(--text-primary)' }}>{selectedManageProduct.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Brand: {selectedManageProduct.brand || '—'} | SKU: {selectedManageProduct.sku}</div>
              </div>
            </div>

            {/* Tab navigation */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 16, gap: 16 }}>
              {[
                { id: 'details', label: 'Details' },
                { id: 'compatibility', label: 'Device Compatibility' },
                ...(!isBuyer && !isCixciAdmin ? [{ id: 'bulk', label: 'Bulk Update' }] : []),
                ...(!isBuyer ? [{ id: 'audit', label: 'Audit Trail' }] : [])
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

            {/* 1. Details Tab */}
            {manageTab === 'details' && (
              <div style={{ display: 'flex', gap: 24, flexDirection: 'row', flexWrap: 'wrap' }}>
                {/* Left Column: Image gallery and Image URLS */}
                <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Image Gallery */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Images</label>
                    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, background: 'var(--bg-elevated)', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
                      {/* Active Main Image Carousel */}
                      <div style={{ width: '100%', height: 240, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
                        {activeDetailImageUrl ? (
                          <>
                            <img
                              src={getImageUrl(activeDetailImageUrl)}
                              alt={selectedManageProduct.name}
                              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                            />
                            {allImages.length > 1 && (
                              <>
                                {/* Left Arrow */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const idx = allImages.indexOf(activeDetailImageUrl)
                                    const prevIdx = (idx - 1 + allImages.length) % allImages.length
                                    setActiveDetailImageUrl(allImages[prevIdx])
                                  }}
                                  style={{
                                    position: 'absolute',
                                    left: 8,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'rgba(0,0,0,0.5)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: 32,
                                    height: 32,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s',
                                    zIndex: 2,
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.7)'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
                                >
                                  <ChevronLeftIcon sx={{ fontSize: 20 }} />
                                </button>
                                {/* Right Arrow */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const idx = allImages.indexOf(activeDetailImageUrl)
                                    const nextIdx = (idx + 1) % allImages.length
                                    setActiveDetailImageUrl(allImages[nextIdx])
                                  }}
                                  style={{
                                    position: 'absolute',
                                    right: 8,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'rgba(0,0,0,0.5)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: 32,
                                    height: 32,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s',
                                    zIndex: 2,
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.7)'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
                                >
                                  <ChevronRightIcon sx={{ fontSize: 20 }} />
                                </button>
                                {/* Pagination Badge */}
                                <div style={{
                                  position: 'absolute',
                                  bottom: 8,
                                  background: 'rgba(0,0,0,0.6)',
                                  color: '#fff',
                                  padding: '2px 8px',
                                  borderRadius: 12,
                                  fontSize: 11,
                                  fontWeight: 500,
                                  zIndex: 2,
                                }}>
                                  {allImages.indexOf(activeDetailImageUrl) + 1} / {allImages.length}
                                </div>
                              </>
                            )}
                          </>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
                            <ShoppingBagIcon sx={{ fontSize: 48 }} />
                            <span style={{ fontSize: 13 }}>No Image Available</span>
                          </div>
                        )}
                      </div>

                      {/* Thumbnails Row */}
                      {allImages.length > 1 && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', width: '100%', justifyContent: 'center' }}>
                          {allImages.map((imgUrl, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setActiveDetailImageUrl(imgUrl)}
                              style={{
                                width: 48,
                                height: 48,
                                padding: 0,
                                border: activeDetailImageUrl === imgUrl ? '2px solid var(--accent)' : '1px solid var(--border)',
                                borderRadius: 4,
                                background: 'var(--bg-main)',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <img
                                src={getImageUrl(imgUrl)}
                                alt={`Thumbnail ${i + 1}`}
                                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover' }}
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Image URLs */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Image URLs</label>
                    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, background: 'var(--bg-elevated)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {allImages.length === 0 ? (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                      ) : (
                        allImages.map((url, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>{i + 1}:</span>
                            <a
                              href={getImageUrl(url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'underline', wordBreak: 'break-all' }}
                            >
                              {getImageUrl(url)}
                            </a>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Properties & Descriptions */}
                <div style={{ flex: '2 2 400px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px 16px' }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 550, color: 'var(--text-muted)' }}>Product Status</div>
                      <div style={{ marginTop: 2 }}>
                        <StatusChip status={selectedManageProduct.status ?? 'unknown'} />
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 11, fontWeight: 550, color: 'var(--text-muted)' }}>UPC</div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 2, fontFamily: 'monospace' }}>{selectedManageProduct.upc || '—'}</div>
                    </div>

                    <div>
                      <div style={{ fontSize: 11, fontWeight: 550, color: 'var(--text-muted)' }}>Launch Date</div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 2 }}>{selectedManageProduct.launch_date ? formatDate(selectedManageProduct.launch_date) : '—'}</div>
                    </div>

                    <div>
                      <div style={{ fontSize: 11, fontWeight: 550, color: 'var(--text-muted)' }}>Color</div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 2 }}>{selectedManageProduct.color || '—'}</div>
                    </div>

                    <div>
                      <div style={{ fontSize: 11, fontWeight: 550, color: 'var(--text-muted)' }}>System Color</div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 2 }}>{selectedManageProduct.system_color || '—'}</div>
                    </div>

                    <div>
                      <div style={{ fontSize: 11, fontWeight: 550, color: 'var(--text-muted)' }}>MSRP</div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 2, fontWeight: 500 }}>{formatCurrency(selectedManageProduct.msrp, selectedManageProduct.vendor_wholesale_price_currency)}</div>
                    </div>

                    {!isVendor && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 550, color: 'var(--text-muted)' }}>Wholesale Price</div>
                        <div style={{ fontSize: 13, marginTop: 2, fontWeight: 600, color: 'var(--accent)' }}>
                          {formatCurrency(selectedManageProduct.buyer_wholesale_price ?? selectedManageProduct.vendor_wholesale_price_amount, selectedManageProduct.vendor_wholesale_price_currency)}
                        </div>
                      </div>
                    )}

                    {(isVendor || isCixciAdmin) && selectedManageProduct.vendor_wholesale_price_amount != null && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 550, color: 'var(--text-muted)' }}>Vendor Wholesale Price</div>
                        <div style={{ fontSize: 13, marginTop: 2, fontWeight: 600, color: 'var(--accent)' }}>
                          {formatCurrency(selectedManageProduct.vendor_wholesale_price_amount, selectedManageProduct.vendor_wholesale_price_currency)}
                        </div>
                      </div>
                    )}

                    <div>
                      <div style={{ fontSize: 11, fontWeight: 550, color: 'var(--text-muted)' }}>Product Category</div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 2 }}>{selectedManageProduct.product_category || '—'}</div>
                    </div>

                    <div>
                      <div style={{ fontSize: 11, fontWeight: 550, color: 'var(--text-muted)' }}>Brand Warranty</div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 2 }}>{selectedManageProduct.warranty || '—'}</div>
                    </div>

                    <div>
                      <div style={{ fontSize: 11, fontWeight: 550, color: 'var(--text-muted)' }}>Inventory Level</div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 2 }}>
                        {selectedManageProduct.inventory_level !== null && selectedManageProduct.inventory_level !== undefined ? `${selectedManageProduct.inventory_level} units` : '—'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 11, fontWeight: 550, color: 'var(--text-muted)' }}>Inventory Threshold</div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 2 }}>
                        {selectedManageProduct.inventory_threshold !== null && selectedManageProduct.inventory_threshold !== undefined ? `${selectedManageProduct.inventory_threshold} units` : '—'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 11, fontWeight: 550, color: 'var(--text-muted)' }}>Dimensions</div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 2 }}>
                        {selectedManageProduct.length || selectedManageProduct.width || selectedManageProduct.height
                          ? `${selectedManageProduct.length || 0}L × ${selectedManageProduct.width || 0}W × ${selectedManageProduct.height || 0}H in`
                          : '—'
                        }
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 11, fontWeight: 550, color: 'var(--text-muted)' }}>Recommended</div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 2 }}>{selectedManageProduct.recommended_accessory ? 'Yes' : 'No'}</div>
                    </div>

                    {/* Conditional Fields in grid */}
                    {selectedManageProduct.vendor_map_pricing_enforced && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 550, color: 'var(--text-muted)' }}>MAP Price</div>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 2 }}>{formatCurrency(selectedManageProduct.map_price, selectedManageProduct.vendor_wholesale_price_currency)}</div>
                      </div>
                    )}

                    {selectedManageProduct.sale_price && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 550, color: 'var(--text-muted)' }}>Sale Price</div>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 2 }}>{formatCurrency(selectedManageProduct.sale_price, selectedManageProduct.vendor_wholesale_price_currency)}</div>
                      </div>
                    )}

                    {selectedManageProduct.release_date && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 550, color: 'var(--text-muted)' }}>Release Date</div>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 2 }}>{formatDate(selectedManageProduct.release_date)}</div>
                      </div>
                    )}

                    {selectedManageProduct.product_type && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 550, color: 'var(--text-muted)' }}>Product Type</div>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 2, textTransform: 'capitalize' }}>{selectedManageProduct.product_type}</div>
                      </div>
                    )}

                    {selectedManageProduct.selling_status && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 550, color: 'var(--text-muted)' }}>Selling Status</div>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 2 }}>{selectedManageProduct.selling_status}</div>
                      </div>
                    )}

                    {selectedManageProduct.exported_date && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 550, color: 'var(--text-muted)' }}>Exported Date</div>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 2 }}>{selectedManageProduct.exported_date}</div>
                      </div>
                    )}

                    {Array.isArray(selectedManageProduct.compatible_device_types) && selectedManageProduct.compatible_device_types.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 550, color: 'var(--text-muted)' }}>Universal Device Types</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                          {selectedManageProduct.compatible_device_types.map((typeCode: string) => (
                            <span key={typeCode} className="badge badge-accent" style={{ textTransform: 'capitalize', fontSize: 11 }}>
                              {typeCode}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Vendor Return Address (Sent once per vendor per buyer) */}
                  {(selectedManageProduct.vendor_return_address1 || selectedManageProduct.vendor_return_address) && (
                    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginTop: 4 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <LocalShippingIcon sx={{ fontSize: 14, color: 'primary.main' }} /> Vendor Return Address
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                        Vendor return shipping information (sent once per vendor, per buyer in export response).
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px 12px', fontSize: 12 }}>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Address 1:</span>{' '}
                          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                            {selectedManageProduct.vendor_return_address1 || selectedManageProduct.vendor_return_address?.address1 || '—'}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Address 2:</span>{' '}
                          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                            {selectedManageProduct.vendor_return_address2 || selectedManageProduct.vendor_return_address?.address2 || '—'}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>City:</span>{' '}
                          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                            {selectedManageProduct.vendor_return_city || selectedManageProduct.vendor_return_address?.city || '—'}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>State:</span>{' '}
                          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                            {selectedManageProduct.vendor_return_state || selectedManageProduct.vendor_return_address?.state || '—'}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Zip Code:</span>{' '}
                          <span className="mono" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                            {selectedManageProduct.vendor_return_zip_code || selectedManageProduct.vendor_return_address?.zip_code || '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Product Description */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Product Description</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', background: 'var(--bg-elevated)', padding: 12, borderRadius: 6, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                        {selectedManageProduct.description || '—'}
                      </div>
                    </div>

                    {/* Meta Title & Description */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Meta Title</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-elevated)', padding: 10, borderRadius: 6 }}>
                          {selectedManageProduct.meta_title || '—'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Meta Description</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-elevated)', padding: 10, borderRadius: 6 }}>
                          {selectedManageProduct.meta_description || '—'}
                        </div>
                      </div>
                    </div>

                    {/* Conditional: Short Description */}
                    {selectedManageProduct.short_description && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Short Description</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', background: 'var(--bg-elevated)', padding: 12, borderRadius: 6, lineHeight: 1.5 }}>
                          {selectedManageProduct.short_description}
                        </div>
                      </div>
                    )}

                    {/* Conditional: Promo Description */}
                    {selectedManageProduct.promo_information && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Promo Description</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', background: 'var(--bg-elevated)', padding: 12, borderRadius: 6, lineHeight: 1.5 }}>
                          {selectedManageProduct.promo_information}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 2. Device Compatibility Tab */}
            {manageTab === 'compatibility' && (
              <div style={{ maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
                {/* Recalculate button (admin only) - Hiding from admin as well since no action items for admin */}
                {false && isCixciAdmin && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleManualRecalculate}
                      disabled={isRecalculating}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <RefreshIcon sx={{ fontSize: 13 }} className={isRecalculating ? 'spin' : ''} />
                      {isRecalculating ? 'Recalculating...' : 'Trigger Manual Recalculation'}
                    </button>
                  </div>
                )}

                {/* Universal Product Mapping Banner */}
                {Array.isArray(selectedManageProduct.compatible_device_types) && selectedManageProduct.compatible_device_types.length > 0 && (
                  <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: 6, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>⚡</span>
                    <div>
                      <strong>Universal Product Mapping Active:</strong> This product universally supports all{' '}
                      <span style={{ textTransform: 'uppercase', fontWeight: 650, color: 'var(--accent)' }}>
                        {selectedManageProduct.compatible_device_types.join(' & ')}
                      </span>{' '}
                      devices. All current models and any newly launched models added to CIXCI are mapped automatically.
                    </div>
                  </div>
                )}

                {/* Add single device quick-form (Vendor only) */}
                {!isCixciAdmin && !isBuyer && (
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
                      <AddIcon sx={{ fontSize: 14 }} /> Add Device
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(() => {
                    const compatList = (activeCompatibilities && activeCompatibilities.length > 0)
                      ? activeCompatibilities
                      : (selectedManageProduct.device_compatibility || []).map((dc: any) => ({
                          id: dc.device_id || dc.id || Math.random().toString(),
                          device_reference: dc.device_id || dc.id,
                          name: dc.name || dc.device_name,
                          model_number: dc.model_number,
                          is_excluded: false,
                        }))

                    if (!compatList || compatList.length === 0) {
                      return (
                        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                          No target devices mapped.
                        </div>
                      )
                    }

                    return compatList.map((c: any) => {
                      const dev = devices.find((d: any) => d.id === c.device_reference)
                      const deviceName = c.name || (dev ? `${dev.manufacturer_name} ${dev.name}` : (c.device_reference ? c.device_reference.slice(0, 8) : 'Device'))
                      return (
                        <div key={c.id} style={{ display: 'flex', flexDirection: 'column', padding: 10, border: '1px solid var(--border)', borderRadius: 6, background: c.is_excluded ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-elevated)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{deviceName}</span>
                              {c.model_number && (
                                <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>({c.model_number})</span>
                              )}
                              {c.is_locked && (
                                <span className="badge badge-amber" style={{ fontSize: 10, padding: '2px 6px' }}>Locked</span>
                              )}
                              {c.is_excluded ? (
                                <span className="badge badge-red" style={{ fontSize: 10, padding: '2px 6px' }}>Excluded</span>
                              ) : (
                                <span className="badge badge-green" style={{ fontSize: 10, padding: '2px 6px' }}>Active</span>
                              )}
                            </div>
                            {!isCixciAdmin && !isBuyer && (
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
                              </div>
                            )}
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
                  })()}
                </div>
              </div>
            )}

            {/* 3. Bulk Compatibility Tab */}
            {manageTab === 'bulk' && !isBuyer && !isCixciAdmin && (
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
                      const dateStr = formatETDate(item.created_at)
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

        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between' }}>
          {isBuyer ? (
            <div style={{ display: 'flex', width: '100%', justifyContent: 'flex-end' }}>
              <Button variant="outlined" onClick={() => setShowManageModal(false)}>Close</Button>
            </div>
          ) : (
            <>
              {!isCixciAdmin && (
                <Button
                  variant="contained"
                  color="error"
                  style={{
                    opacity: (selectedManageProduct?.status === 'active') ? 0.5 : 1,
                    cursor: (selectedManageProduct?.status === 'active') ? 'not-allowed' : 'pointer'
                  }}
                  onClick={() => handleDeleteProduct(selectedManageProduct.id)}
                >
                  <DeleteIcon sx={{ fontSize: 14 }} /> Delete
                </Button>
              )}
              <div style={{ display: 'flex', gap: 10, marginLeft: isCixciAdmin ? 'auto' : 0 }}>
                <Button variant="outlined" onClick={() => setShowManageModal(false)}>Close</Button>
                {!isCixciAdmin && (
                  <Button variant="contained" onClick={() => openEditModal(selectedManageProduct)}>
                    <EditIcon sx={{ fontSize: 14 }} /> Edit Product
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogActions>
        </>)}
      </Dialog>

      {/* ─── EXCLUSION REASON MODAL ──────────────────────────────────────────────── */}
      <Dialog open={!!(showExcludeModal && excludeDevice)} onClose={() => { setShowExcludeModal(false); setExcludeDevice(null); }} fullWidth maxWidth="sm" scroll="paper">
        {excludeDevice && (<>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Exclude Device Compatibility
          <IconButton size="small" onClick={() => { setShowExcludeModal(false); setExcludeDevice(null); }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
              Define the exclusion reason for <strong>{excludeDevice?.manufacturer_name ? `${excludeDevice.manufacturer_name} ${excludeDevice.name}` : excludeDevice?.name}</strong>.
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
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => { setShowExcludeModal(false); setExcludeDevice(null); }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmitExclusion}
            disabled={excludeReason === 'other' && !excludeNotes.trim()}
          >
            Exclude Device
          </Button>
        </DialogActions>
        </>)}
      </Dialog>

      {/* ─── BULK UPLOAD MODAL ─────────────────────────────────────────────────── */}
      <Dialog open={showBulkModal} onClose={handleCloseBulkModal} fullWidth maxWidth="md" scroll="paper" slotProps={{ paper: { component: 'form', onSubmit: handleBulkUploadSubmit } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            {bulkImagesOnly ? 'Upload Product Images' : 'Bulk Import Products'}
            <span style={{ marginLeft: 10, fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>
              {bulkImagesOnly
                ? 'ZIP of transparent PNGs named by SKU'
                : `Step ${bulkStep} of 2 — ${bulkStep === 1 ? 'Catalog file' : 'Product images'}`}
            </span>
          </span>
          <IconButton size="small" onClick={handleCloseBulkModal}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
              {bulkStep === 1 && (
                <>
              {bulkError && (
                <div style={{ background: 'var(--red-dim)', color: 'var(--red)', padding: '10px 12px', borderRadius: 6, marginBottom: 12, fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <ErrorOutlinedIcon sx={{ fontSize: 14 }} />
                  <span>{bulkError}</span>
                </div>
              )}

              {validation.hasErrors && (
                <div style={{ background: 'var(--red-dim)', color: 'var(--red)', padding: '10px 12px', borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontWeight: 600 }}>
                    <ErrorOutlinedIcon sx={{ fontSize: 14 }} />
                    <span>
                      Validation failed: {Object.values(validation.rowErrors).reduce((n, errs) => n + errs.length, 0)} issue(s)
                      in {Object.keys(validation.rowErrors).length} row(s). Fix the highlighted cells below.
                    </span>
                  </div>
                  <div style={{ marginTop: 6, maxHeight: 110, overflowY: 'auto', fontSize: 12 }}>
                    {Object.entries(validation.rowErrors).slice(0, 10).map(([rowIdx, errs]) => (
                      <div key={rowIdx} style={{ marginBottom: 2 }}>
                        Row {Number(rowIdx) + 2}: {errs[0]}
                        {errs.length > 1 ? ` (+${errs.length - 1} more)` : ''}
                      </div>
                    ))}
                  </div>
                </div>
              )}
                </>
              )}

              {bulkStep === 2 && (
                <>
              {bulkImagesOnly && (
                <div style={{ background: 'rgba(var(--accent-rgb), 0.08)', border: '1px solid rgba(var(--accent-rgb), 0.25)', padding: '10px 12px', borderRadius: 6, marginBottom: 14, fontSize: 12, color: 'var(--text-secondary)' }}>
                  Upload one transparent PNG per SKU. Name each file after the product SKU
                  (for example <strong>STEP2CBL01.png</strong>). Images are matched case-insensitively,
                  attached as the primary image, and each product activates automatically once validation passes.
                  Already attached images are skipped.
                </div>
              )}
              <div style={{ display: bulkImagesOnly ? 'none' : 'block', background: 'var(--bg-elevated)', padding: 12, borderRadius: 8, marginBottom: 14, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--green)', fontWeight: 600, fontSize: 14 }}>
                  <CheckIcon sx={{ fontSize: 16 }} />
                  <span>
                    Catalog import finished. Imported: {(bulkResult?.rows_passed || 0) + (bulkResult?.rows_staged || 0)} of {bulkResult?.total_rows_processed || 0}
                    {bulkResult?.rows_failed ? ` — ${bulkResult.rows_failed} row(s) failed validation` : ''}
                  </span>
                </div>
                {(bulkResult?.rows_staged || 0) > 0 && (
                  <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 6, background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.35)', fontSize: 12, color: 'var(--text-primary)' }}>
                    <strong>{bulkResult.rows_staged} product(s)</strong> were imported as <strong>Inactive (staged)</strong> because
                    they have no image yet. Upload the ZIP below — each product activates automatically once its transparent PNG passes validation.
                  </div>
                )}
                {bulkResult?.errors && bulkResult.errors.length > 0 && (
                  <div style={{ marginTop: 10, fontSize: 12, maxHeight: 160, overflowY: 'auto' }}>
                    <div style={{ fontWeight: 600, color: 'var(--red)', marginBottom: 4 }}>
                      Validation errors ({bulkResult.errors.length}):
                    </div>
                    {bulkResult.errors.map((err: any, i: number) => {
                      const errMsg = typeof err === 'object' && err !== null
                        ? `Row ${err.row_number || '?'}${err.column_name ? ` (${err.column_name})` : ''}: ${err.validation_error || JSON.stringify(err)}${err.recommended_correction ? ` — ${err.recommended_correction}` : ''}`
                        : String(err);
                      return (
                        <div key={i} style={{ color: 'var(--text-secondary)', marginBottom: 4, paddingLeft: 8, borderLeft: '2px solid var(--red)' }}>
                          {errMsg}
                        </div>
                      );
                    })}
                  </div>
                )}
                {bulkImportedSkus.length > 0 && (
                  <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Imported SKUs</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 80, overflowY: 'auto' }}>
                      {bulkImportedSkus.map(sku => (
                        <span key={sku} style={{ padding: '2px 8px', borderRadius: 10, background: 'var(--bg-main)', border: '1px solid var(--border)', fontSize: 11 }}>
                          {sku}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ padding: '10px 12px', background: 'rgba(var(--accent-rgb), 0.08)', border: '1px solid rgba(var(--accent-rgb), 0.25)', borderRadius: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  Upload product images (ZIP)
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
                  PNG files must be named after the SKU — <strong>SKU123.png</strong> or <strong>VENDOR-SKU123-primary.png</strong>.
                  Each image is validated (transparent PNG) and attached to its product automatically, no manual editing needed.
                </div>

                <input
                  ref={bulkZipInputRef}
                  type="file"
                  accept=".zip,application/zip,application/x-zip-compressed"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const f = e.target.files && e.target.files[0]
                    setBulkZipFile(f || null)
                    setBulkZipResult(null)
                    setBulkZipError(null)
                    e.target.value = ''
                  }}
                />

                <div
                  onClick={() => { if (!uploadingBulkZip) bulkZipInputRef.current?.click() }}
                  onDragOver={e => { e.preventDefault(); setBulkZipDragging(true) }}
                  onDragLeave={() => setBulkZipDragging(false)}
                  onDrop={e => {
                    e.preventDefault()
                    setBulkZipDragging(false)
                    const f = e.dataTransfer.files && e.dataTransfer.files[0]
                    if (!f) return
                    if (!/\.zip$/i.test(f.name)) {
                      setBulkZipError('Only .zip archives are allowed.')
                      return
                    }
                    setBulkZipFile(f)
                    setBulkZipResult(null)
                    setBulkZipError(null)
                  }}
                  style={{
                    border: `2px dashed ${bulkZipDragging ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 8,
                    padding: '18px 12px',
                    textAlign: 'center',
                    cursor: uploadingBulkZip ? 'default' : 'pointer',
                    background: bulkZipDragging ? 'rgba(var(--accent-rgb), 0.06)' : 'var(--bg-main)',
                  }}
                >
                  <CloudUploadIcon sx={{ fontSize: 28, color: 'var(--text-secondary)' }} />
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 4 }}>
                    {bulkZipFile ? bulkZipFile.name : 'Click or drag & drop a ZIP of product images'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {bulkZipFile
                      ? `${(bulkZipFile.size / (1024 * 1024)).toFixed(1)} MB — click to choose a different file`
                      : 'Max 100 MB. Only transparent PNG files are accepted.'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 10 }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    disabled={!bulkZipFile || uploadingBulkZip}
                    onClick={handleBulkImageUpload}
                  >
                    <ImageIcon sx={{ fontSize: 14 }} />
                    {uploadingBulkZip ? 'Uploading images...' : 'Upload Images (ZIP)'}
                  </button>
                  {bulkZipFile && !uploadingBulkZip && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => { setBulkZipFile(null); setBulkZipResult(null); setBulkZipError(null) }}
                    >
                      Remove file
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}
                    onClick={() => navigate('/media')}
                  >
                    <ImageIcon sx={{ fontSize: 14 }} />
                    Open Media Manager
                  </button>
                </div>

                {bulkZipError && (
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--red)' }}>
                    {bulkZipError}
                  </div>
                )}

                {bulkZipResult && (
                  <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                      Images attached: {bulkZipResult.created} | matched: {bulkZipResult.matched} | unmatched: {bulkZipResult.unmatched} | failed: {bulkZipResult.failed}
                    </div>
                    <div style={{ marginBottom: 6 }}>
                      Products now media-ready: {bulkZipResult.products_now_media_ready} | Media incomplete: {bulkZipResult.products_still_media_incomplete} | Activated: {bulkZipResult.products_now_active}
                    </div>
                    {Array.isArray(bulkZipResult.results) && bulkZipResult.results.length > 0 && (
                      <div style={{ maxHeight: 160, overflowY: 'auto' }}>
                        {bulkZipResult.results.map((r: any, i: number) => (
                          <div
                            key={i}
                            style={{
                              marginBottom: 4,
                              paddingLeft: 8,
                              borderLeft: `2px solid ${r.status === 'created' ? 'var(--green)' : 'var(--red)'}`,
                            }}
                          >
                            {r.filename}{r.product_sku ? ` → ${r.product_sku}` : ''} — {r.reason || r.status}
                          </div>
                        ))}
                      </div>
                    )}
                    {bulkZipResult.products_now_active > 0 && (
                      <div style={{ marginTop: 8, color: 'var(--green)' }}>
                        {bulkZipResult.products_now_active} product(s) are now active and visible to buyers.
                      </div>
                    )}
                    {bulkZipResult.products_still_media_incomplete > 0 && (
                      <div style={{ marginTop: 8, color: 'var(--text-secondary)' }}>
                        Upload a ZIP with the missing SKU files to finish the remaining products.
                      </div>
                    )}
                  </div>
                )}
              </div>
                </>
              )}

              {bulkStep === 1 && (
                <>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label className="label">Catalog Template Guidelines</label>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleDownloadTemplate} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', fontSize: 11 }}>
                    <DownloadIcon sx={{ fontSize: 12 }} /> Download CSV Template
                  </button>
                </div>
                <div style={{ background: 'var(--bg-elevated)', padding: 10, borderRadius: 6, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 14 }}>
                  Upload a <strong>.csv</strong> or <strong>.xlsx</strong> file containing catalog rows. Supported columns:<br />
                  • <strong>Accessory Name</strong> (Required)<br />
                  • <strong>SKU</strong> (Required, unique)<br />
                  • <strong>Brand</strong>, <strong>Product Category</strong><br />
                  • <strong>Vendor Wholesale Price</strong>, <strong>MSRP</strong>, <strong>MAP Price</strong><br />
                  • <strong>Device Compatibility</strong> (comma-separated specific devices)<br />
                  • <strong>Universal Device Types</strong> (Phone, Tablet, Smartwatch — auto-maps to all current & future devices)<br />
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
                              const headers = parsed[0]
                              const normalizedHeaders = headers.map(h => String(h).toLowerCase().replace(/[^a-z0-9]/g, ''))
                              const statusColIdx = normalizedHeaders.findIndex(h => h === 'productstatus' || h === 'status' || h === 'prodstatus')
                              const inventoryLevelColIdx = normalizedHeaders.findIndex(h => h === 'inventorylevel' || h === 'inventory' || h === 'qty' || h === 'quantity' || h === 'stock')

                              const dateColIdxs = headers.map((h, i) => {
                                const nh = String(h).toLowerCase().replace(/[^a-z0-9]/g, '')
                                return ['launchdate', 'releasedate', 'eoldate'].includes(nh) ? i : -1
                              }).filter(i => i !== -1)

                              const previewRows = parsed.slice(1).map(row => {
                                return Array.from({ length: headers.length }, (_, i) => {
                                  const val = row[i]
                                  if (val === undefined || val === null || String(val).trim() === '') {
                                    if (i === statusColIdx) return 'active'
                                    if (i === inventoryLevelColIdx) return '0'
                                    return ''
                                  }
                                  if (dateColIdxs.includes(i)) {
                                    return formatExcelDate(val)
                                  }
                                  return String(val)
                                })
                              })
                              setCsvHeaders(headers)
                              setCsvPreviewRows(previewRows)
                            }
                          }
                          reader.readAsText(file)
                        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                          const reader = new FileReader()
                          reader.onload = (evt) => {
                            try {
                              const data = evt.target?.result
                              const workbook = XLSX.read(data, { type: 'array', cellDates: true })
                              const sheetName = workbook.SheetNames[0]
                              const sheet = workbook.Sheets[sheetName]
                              const parsed = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 })
                              if (parsed.length > 0) {
                                const filtered = parsed.filter(row => Array.isArray(row) && row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== ''))
                                if (filtered.length > 0) {
                                  const headers = Array.from(filtered[0]).map(cell => cell !== null && cell !== undefined ? String(cell) : '')
                                  const normalizedHeaders = headers.map(h => String(h).toLowerCase().replace(/[^a-z0-9]/g, ''))
                                  const statusColIdx = normalizedHeaders.findIndex(h => h === 'productstatus' || h === 'status' || h === 'prodstatus')
                                  const inventoryLevelColIdx = normalizedHeaders.findIndex(h => h === 'inventorylevel' || h === 'inventory' || h === 'qty' || h === 'quantity' || h === 'stock')

                                  const dateColIdxs = headers.map((h, i) => {
                                    const nh = String(h).toLowerCase().replace(/[^a-z0-9]/g, '')
                                    return ['launchdate', 'releasedate', 'eoldate'].includes(nh) ? i : -1
                                  }).filter(i => i !== -1)

                                  const previewRows = filtered.slice(1).map(row => {
                                    return Array.from({ length: headers.length }, (_, i) => {
                                      const val = row[i]
                                      if (val === undefined || val === null || String(val).trim() === '') {
                                        if (i === statusColIdx) return 'active'
                                        if (i === inventoryLevelColIdx) return '0'
                                        return ''
                                      }
                                      if (dateColIdxs.includes(i)) {
                                        return formatExcelDate(val)
                                      }
                                      return String(val)
                                    })
                                  })
                                  setCsvHeaders(headers)
                                  setCsvPreviewRows(previewRows)
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
                                    <CheckIcon sx={{ fontSize: 14 }} /> Ok
                                  </span>
                                ) : (
                                  <span
                                    title={errors.join(' | ')}
                                    style={{ color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500, cursor: 'help' }}
                                  >
                                    <ErrorOutlinedIcon sx={{ fontSize: 14 }} /> {errors[0]}
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
                </>
              )}

        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between' }}>
          {bulkStep === 2 ? (
            <>
              {bulkImagesOnly ? <span /> : (
                <Button variant="outlined" onClick={() => setBulkStep(1)} disabled={uploadingBulkZip}>
                  Back to Import
                </Button>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <Button variant="outlined" onClick={handleCloseBulkModal} disabled={uploadingBulkZip}>
                  Close
                </Button>
                <Button
                  variant="contained"
                  onClick={handleBulkImageUpload}
                  disabled={!bulkZipFile || uploadingBulkZip}
                >
                  {uploadingBulkZip ? 'Uploading…' : 'Upload Images (ZIP)'}
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button variant="outlined" onClick={handleCloseBulkModal} disabled={uploadingBulk}>
                Close
              </Button>
              <Button variant="contained" type="submit" disabled={uploadingBulk || csvPreviewRows.length === 0 || validation.hasErrors}>
                {uploadingBulk ? 'Uploading…' : 'Upload Catalog'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* ─── EXPORT JOB MODAL ──────────────────────────────────────────────────── */}
      <Dialog open={showExportModal} onClose={() => setShowExportModal(false)} fullWidth maxWidth="sm" scroll="paper" slotProps={{ paper: { component: 'form', onSubmit: handleStartExport } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Export Compatibility Catalog
          <IconButton size="small" onClick={() => setShowExportModal(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
              {exportError && (
                <div style={{ background: 'var(--red-dim)', color: 'var(--red)', padding: '10px 12px', borderRadius: 6, marginBottom: 12, fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <ErrorOutlinedIcon sx={{ fontSize: 14 }} />
                  <span>{exportError}</span>
                </div>
              )}
              <div style={{ background: 'var(--bg-elevated)', padding: 14, borderRadius: 8, fontSize: 13, color: 'var(--text-primary)', marginBottom: 16, border: '1px solid var(--border)' }}>
                You are about to initiate an export job for <strong>{tab === 'products' ? allProductsSelectedIds.length : myCompatibilitySelectedIds.length}</strong> selected products.
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20 }}>
                <p style={{ margin: '0 0 8px 0' }}>• Export format: <strong>API</strong></p>
                <p style={{ margin: 0 }}>• Incompatible products will be excluded.</p>
              </div>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setShowExportModal(false)}>Cancel</Button>
          <Button variant="contained" type="submit">Start Export Job</Button>
        </DialogActions>
      </Dialog>

      {/* ─── EXPORT JOB DETAILS MODAL (AUDIT COMPLIANT) ────────────────────────── */}
      <Dialog open={!!selectedJob} onClose={() => setSelectedJob(null)} fullWidth maxWidth="md" scroll="paper">
        {selectedJob && (<>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Export Job Details</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{selectedJob.id}</span>
          </div>
          <IconButton size="small" onClick={() => setSelectedJob(null)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
              {/* Metadata Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Status</div>
                  <div style={{ marginTop: 4 }}>
                    <span className={`badge ${
                      selectedJob.status === 'completed' ? 'badge-green' :
                      selectedJob.status === 'completed_with_errors' ? 'badge-amber' :
                      selectedJob.status === 'failed' ? 'badge-red' : 'badge-muted'
                    }`} style={{ textTransform: 'capitalize' }}>
                      {selectedJob.status === 'completed_with_errors' ? 'Completed with Errors' : selectedJob.status}
                    </span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Format</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>{selectedJob.format}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Initiated By</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 4 }}>
                    {selectedJob.triggered_by_name || 'System'} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({selectedJob.triggered_by_role || 'System'})</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Trigger Type</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 4 }}>{selectedJob.trigger_type || 'USER'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Initiated Date</div>
                  <div style={{ fontSize: 12, color: 'var(--text-primary)', marginTop: 4 }}>{formatETDate(selectedJob.created_at)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Completed Date</div>
                  <div style={{ fontSize: 12, color: 'var(--text-primary)', marginTop: 4 }}>{formatETDate(selectedJob.completed_at)}</div>
                </div>
              </div>

              {/* Failure Details */}
              {selectedJob.status === 'failed' && selectedJob.failure_details && (
                <div style={{ background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid var(--red)', padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 20 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Failure Reason:</div>
                  <div className="mono" style={{ fontSize: 12 }}>{selectedJob.failure_details}</div>
                </div>
              )}

              {/* Product Snapshot List */}
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
                Exported Product Snapshot ({selectedJob.products_snapshot?.length ?? 0} Products)
              </div>

              <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                {!selectedJob.products_snapshot || selectedJob.products_snapshot.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    No products captured in this export job snapshot.
                  </div>
                ) : (
                  <table style={{ margin: 0, width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ width: 60 }}>Image</th>
                        <th>Vendor</th>
                        <th>Product Name</th>
                        <th>SKU</th>
                        <th>UPC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedJob.products_snapshot.map((p: any, idx: number) => (
                        <tr key={p.product_id || idx}>
                          <td>
                            {p.primary_image_url ? (
                              <img
                                src={p.primary_image_url}
                                alt={p.product_name}
                                style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 4, background: '#fff', border: '1px solid var(--border)' }}
                              />
                            ) : (
                              <div style={{ width: 40, height: 40, borderRadius: 4, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                                <ShoppingBagIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                              </div>
                            )}
                          </td>
                          <td style={{ fontSize: 13, color: 'var(--text-primary)' }}>{p.vendor_name}</td>
                          <td style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{p.product_name}</td>
                          <td className="mono" style={{ fontSize: 12 }}>{p.sku}</td>
                          <td className="mono" style={{ fontSize: 12 }}>{p.upc || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setSelectedJob(null)}>Close</Button>
        </DialogActions>
        </>)}
      </Dialog>

      <Dialog open={!!(showDropdownManagerModal && isCixciAdmin)} onClose={() => { setShowDropdownManagerModal(false); setEditingCategoryConfig(null); }} fullWidth maxWidth="md" scroll="paper">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {editingCategoryConfig ? 'Configure Category Compatibility' : 'Manage Dropdown Values'}
          <IconButton size="small" onClick={() => { setShowDropdownManagerModal(false); setEditingCategoryConfig(null); }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
            {dropdownError && (
              <div style={{ background: 'var(--red-dim)', color: 'var(--red)', padding: '10px 12px', borderRadius: 6, marginBottom: 12, fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}>
                <ErrorOutlinedIcon sx={{ fontSize: 14 }} />
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
                  <Button variant="outlined" onClick={() => setEditingCategoryConfig(null)}>
                    Cancel
                  </Button>
                  <Button variant="contained" type="submit">
                    Save Configuration
                  </Button>
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
                                  <SettingsIcon sx={{ fontSize: 14 }} />
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn btn-ghost"
                                style={{ padding: 4, color: 'var(--red)', background: 'transparent', border: 'none' }}
                                onClick={() => handleDeleteDropdownValue(item.id)}
                              >
                                <DeleteIcon sx={{ fontSize: 14 }} />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-light)' }}>
                  <Button variant="outlined" onClick={() => setShowDropdownManagerModal(false)}>
                    Close
                  </Button>
                </div>
              </>
            )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog {...dialogProps} />
    </div>
  )
}
