import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Chip from '@mui/material/Chip'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Tooltip from '@mui/material/Tooltip'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Alert from '@mui/material/Alert'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import AddIcon from '@mui/icons-material/Add'
import SmartphoneIcon from '@mui/icons-material/Smartphone'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import CheckIcon from '@mui/icons-material/Check'
import DeleteIcon from '@mui/icons-material/Delete'
import CloseIcon from '@mui/icons-material/Close'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined'
import DownloadIcon from '@mui/icons-material/Download'
import SettingsIcon from '@mui/icons-material/Settings'
import api from '../lib/apiClient'
import { useAuthStore } from '../stores/authStore'
import Pagination, { usePagination } from '../components/Pagination'
import PageHeader from '../components/layout/PageHeader'
import StatusChip from '../components/data-display/StatusChip'
import SearchBar from '../components/forms/SearchBar'
import ConfirmDialog from '../components/feedback/ConfirmDialog'
import { useConfirmDialog } from '../hooks/useConfirmDialog'
import { useSnackbar } from '../components/feedback/SnackbarProvider'
import { formatDate } from '../lib/formatters'
import { MONO_FONT } from '../theme/typography'

function parseApiError(err: any, fallback: string = 'An error occurred'): string {
  const data = err?.response?.data
  if (!data) return fallback
  if (typeof data === 'string') return data

  const target = data.detail !== undefined ? data.detail : data

  if (typeof target === 'string') return target
  if (Array.isArray(target)) return target.join(' ')

  if (typeof target === 'object' && target !== null) {
    const messages: string[] = []
    Object.entries(target).forEach(([field, val]) => {
      if (field === 'status_code') return
      const fieldLabel = field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ')
      const valStr = Array.isArray(val)
        ? val.join(' ')
        : (typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val))
      messages.push(`${fieldLabel}: ${valStr}`)
    })
    if (messages.length > 0) return messages.join('; ')
  }

  return fallback
}

export function parseWirelessCharging(val: string | null | undefined): string[] {
  if (!val) return []
  const parts = val.split(/[\+,;\/]+/).map(s => s.trim()).filter(Boolean)
  const result: string[] = []
  for (const p of parts) {
    const pl = p.toLowerCase()
    if (pl === 'magsafe') {
      if (!result.includes('MagSafe')) result.push('MagSafe')
    } else if (pl === 'qi2') {
      if (!result.includes('Qi2')) result.push('Qi2')
    } else if (pl === 'qi') {
      if (!result.includes('Qi')) result.push('Qi')
    } else if (pl === 'not compatible' || pl === 'not_compatible' || pl === 'none' || pl === 'n/a') {
      if (!result.includes('Not Compatible')) result.push('Not Compatible')
    } else if (p && !result.includes(p)) {
      result.push(p)
    }
  }
  return result
}

export default function DevicesPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { showSnackbar } = useSnackbar()
  const { dialogProps, confirm } = useConfirmDialog()
  const isBuyer = user?.company_type === 'buyer'
  const isCixciAdmin = user?.is_cixci_admin || user?.company_type === 'cixci_internal'
  const canImportDevices = isCixciAdmin || (!isBuyer && user?.capabilities && Array.isArray(user.capabilities) && user.capabilities.some((c: any) => c.code === 'devices.device.import'))
  const canManageDropdowns = isCixciAdmin || (!isBuyer && user?.capabilities && Array.isArray(user.capabilities) && user.capabilities.some((c: any) => c.code === 'devices.type.manage' || c.code === 'devices.manufacturer.manage'))

  const [search, setSearch] = useState('')
  const [filterManufacturer, setFilterManufacturer] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [tab, setTab] = useState<'devices' | 'portfolio'>('devices')

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)

  // Add form fields state
  const [addManufacturer, setAddManufacturer] = useState('')
  const [addName, setAddName] = useState('')
  const [addDeviceType, setAddDeviceType] = useState('')
  const [addLaunchDate, setAddLaunchDate] = useState('')
  const [addCharging, setAddCharging] = useState('')
  const [addStorage, setAddStorage] = useState('')
  const [addMaxStorage, setAddMaxStorage] = useState('')
  const [addHeadphone, setAddHeadphone] = useState('')
  const [addBluetooth, setAddBluetooth] = useState('')
  const [addWireless, setAddWireless] = useState<string[]>([])
  const [addWatchCase, setAddWatchCase] = useState('')
  const [addError, setAddError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Modals state
  const [showDropdownModal, setShowDropdownModal] = useState(false)
  const [manageField, setManageField] = useState<'manufacturer' | 'device_type'>('manufacturer')
  const [newDropdownValue, setNewDropdownValue] = useState('')
  const [dropdownError, setDropdownError] = useState<string | null>(null)

  // Device Type Configuration States
  const [editingTypeConfig, setEditingTypeConfig] = useState<any | null>(null)
  const [typeConfigStatus, setTypeConfigStatus] = useState('active')
  const [typeConfigAutoMappingEligible, setTypeConfigAutoMappingEligible] = useState(true)
  const [typeConfigSupportedCategories, setTypeConfigSupportedCategories] = useState<string[]>([])
  const [typeConfigRules, setTypeConfigRules] = useState<Record<string, { mode: string, default?: string }>>({})

  const { data: dropdownConfigsData } = useQuery({
    queryKey: ['dropdown-configs'],
    queryFn: () => api.get('/catalog/dropdown-configs/').then(r => r.data),
  })
  const categories = useMemo(() => {
    const data = dropdownConfigsData?.results ?? dropdownConfigsData ?? []
    return data.filter((c: any) => c.field_name === 'product_category').map((c: any) => c.value)
  }, [dropdownConfigsData])

  useEffect(() => {
    if (editingTypeConfig) {
      setTypeConfigStatus(editingTypeConfig.status || 'active')
      setTypeConfigAutoMappingEligible(editingTypeConfig.auto_mapping_eligible !== false)
      const existingCats = editingTypeConfig.supported_accessory_categories || []
      setTypeConfigSupportedCategories(existingCats.length > 0 ? existingCats : (categories || []))
      setTypeConfigRules(editingTypeConfig.compatibility_rules || {})
    }
  }, [editingTypeConfig, categories])

  // Edit / Detail Modal state
  const [editingDevice, setEditingDevice] = useState<any>(null)
  const [editTab, setEditTab] = useState<'details' | 'compatibility' | 'products' | 'audit'>('details')

  // Compatible Products tab state
  const [compProdSearch, setCompProdSearch] = useState('')
  const [compProdVendor, setCompProdVendor] = useState('')
  const [compProdCategory, setCompProdCategory] = useState('')
  const [compProdStatus, setCompProdStatus] = useState('')

  // Remove confirmation state
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [confirmRemoveName, setConfirmRemoveName] = useState('')
  const [editManufacturer, setEditManufacturer] = useState('')
  const [editName, setEditName] = useState('')
  const [editDeviceType, setEditDeviceType] = useState('')
  const [editLaunchDate, setEditLaunchDate] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [editCharging, setEditCharging] = useState('')
  const [editStorage, setEditStorage] = useState('')
  const [editMaxStorage, setEditMaxStorage] = useState('')
  const [editHeadphone, setEditHeadphone] = useState('')
  const [editBluetooth, setEditBluetooth] = useState('')
  const [editWireless, setEditWireless] = useState<string[]>([])
  const [editWatchCase, setEditWatchCase] = useState('')
  const [editError, setEditError] = useState('')
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false)

  // Device Audit History Query
  const [selectedDeviceIdForAudit, setSelectedDeviceIdForAudit] = useState<string | null>(null)
  const { data: auditHistory } = useQuery({
    queryKey: ['device-audit', selectedDeviceIdForAudit],
    queryFn: () => api.get(`/devices/devices/${selectedDeviceIdForAudit}/audit_history/`).then(r => r.data),
    enabled: !!selectedDeviceIdForAudit,
  })

  // Compatible Products Query
  const { data: compProductsData, isLoading: isLoadingCompProducts } = useQuery({
    queryKey: ['device-compatible-products', selectedDeviceIdForAudit],
    queryFn: () => api.get('/catalog/products/', { params: { device_id: selectedDeviceIdForAudit, limit: 1000 } }).then(r => r.data),
    enabled: !!selectedDeviceIdForAudit && editTab === 'products',
  })

  const compProducts = useMemo(() => {
    const list = compProductsData?.results ?? compProductsData ?? []
    return Array.isArray(list) ? list : []
  }, [compProductsData])

  const vendors = useMemo(() => {
    const set = new Set<string>()
    const list: { id: string, name: string }[] = []
    compProducts.forEach((p: any) => {
      if (p.vendor_name && !set.has(p.vendor_name)) {
        set.add(p.vendor_name)
        list.push({ id: p.vendor_company_reference || '', name: p.vendor_name })
      }
    })
    return list.sort((a, b) => a.name.localeCompare(b.name))
  }, [compProducts])

  const stats = useMemo(() => {
    let total = 0
    let active = 0
    let inactive = 0
    let eol = 0
    let outOfStock = 0
    let other = 0

    compProducts.forEach((p: any) => {
      total++
      const st = String(p.status).toLowerCase()
      if (st === 'active') active++
      else if (st === 'inactive') inactive++
      else if (st === 'eol') eol++
      else if (st === 'out_of_stock') outOfStock++
      else other++
    })

    return { total, active, inactive, eol, outOfStock, other }
  }, [compProducts])

  const filteredCompProducts = useMemo(() => {
    let list = compProducts

    if (compProdSearch.trim()) {
      const q = compProdSearch.toLowerCase().trim()
      list = list.filter((p: any) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.upc && p.upc.toLowerCase().includes(q))
      )
    }

    if (compProdVendor) {
      list = list.filter((p: any) => p.vendor_company_reference === compProdVendor)
    }

    if (compProdCategory) {
      list = list.filter((p: any) => p.product_category === compProdCategory)
    }

    if (compProdStatus) {
      list = list.filter((p: any) => p.status === compProdStatus)
    }

    return list
  }, [compProducts, compProdSearch, compProdVendor, compProdCategory, compProdStatus])

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importMode, setImportMode] = useState('Create New Only')
  const [importErrors, setImportErrors] = useState<any[]>([])
  const [importErrorGeneral, setImportErrorGeneral] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [importSuccess, setImportSuccess] = useState('')

  const resetImportState = () => {
    setImportFile(null)
    setImportErrors([])
    setImportErrorGeneral('')
    setImportSuccess('')
    setImportMode('Create New Only')
  }

  const resetAddState = () => {
    setAddManufacturer('')
    setAddName('')
    setAddDeviceType('')
    setAddLaunchDate('')
    setAddCharging('')
    setAddStorage('')
    setAddMaxStorage('')
    setAddHeadphone('')
    setAddBluetooth('')
    setAddWireless([])
    setAddWatchCase('')
    setAddError('')
  }

  const [portfolioSearch, setPortfolioSearch] = useState('')
  const [portfolioMfg, setPortfolioMfg] = useState('')
  const [portfolioType, setPortfolioType] = useState('')

  // TanStack queries
  const { data, isLoading, refetch: refreshDevices } = useQuery({
    queryKey: ['devices', search, filterManufacturer, filterType, filterStatus],
    queryFn: () => api.get('/devices/devices/', {
      params: {
        search,
        manufacturer: filterManufacturer || undefined,
        device_type: filterType || undefined,
        lifecycle_status: filterStatus || undefined,
        paginate: 'false',
      }
    }).then(r => r.data),
  })

  const { data: portfolio, refetch: refreshPortfolio } = useQuery({
    queryKey: ['my-devices'],
    queryFn: () => api.get('/devices/portfolio/my_devices/').then(r => r.data),
    enabled: isBuyer,
  })

  const { data: manufacturersData, refetch: refetchManufacturers } = useQuery({
    queryKey: ['manufacturers'],
    queryFn: () => api.get('/devices/manufacturers/', { params: { limit: 100 } }).then(r => r.data),
  })

  const { data: typesData, refetch: refetchTypes } = useQuery({
    queryKey: ['device-types'],
    queryFn: () => api.get('/devices/types/', { params: { limit: 100 } }).then(r => r.data),
  })

  const devices = data?.results ?? (Array.isArray(data) ? data : [])
  const myDevices = portfolio ?? []

  const filteredMyDevices = useMemo(() => {
    let list = portfolio ?? []
    if (portfolioSearch.trim()) {
      const q = portfolioSearch.toLowerCase().trim()
      list = list.filter((ref: any) =>
        (ref.device_name && ref.device_name.toLowerCase().includes(q)) ||
        (ref.device_sku && ref.device_sku.toLowerCase().includes(q)) ||
        (ref.device_model_number && ref.device_model_number.toLowerCase().includes(q)) ||
        (ref.device_manufacturer && ref.device_manufacturer.toLowerCase().includes(q))
      )
    }
    if (portfolioMfg) {
      list = list.filter((ref: any) => ref.device_manufacturer_id === portfolioMfg)
    }
    if (portfolioType) {
      list = list.filter((ref: any) => ref.device_type_id === portfolioType)
    }
    return list
  }, [portfolio, portfolioSearch, portfolioMfg, portfolioType])

  const {
    currentPage: devicePage,
    setCurrentPage: setDevicePage,
    totalPages: totalDevicePages,
    totalItems: totalDevices,
    paginatedItems: paginatedDevices,
  } = usePagination(devices, 50)

  useEffect(() => {
    setDevicePage(1)
  }, [search, filterManufacturer, filterType, filterStatus, setDevicePage])

  const {
    currentPage: portfolioPage,
    setCurrentPage: setPortfolioPage,
    totalPages: totalPortfolioPages,
    totalItems: totalPortfolioDevices,
    paginatedItems: paginatedMyDevices,
  } = usePagination(filteredMyDevices, 50)

  useEffect(() => {
    setPortfolioPage(1)
  }, [portfolioSearch, portfolioMfg, portfolioType, setPortfolioPage])

  const manufacturers = manufacturersData?.results ?? manufacturersData ?? []
  const deviceTypes = typesData?.results ?? typesData ?? []

  const activeManufacturers = manufacturers.filter((m: any) => m.is_active !== false)
  const activeDeviceTypes = deviceTypes.filter((t: any) => t.is_active !== false && t.status === 'active')

  // Set of device IDs currently in the portfolio
  const portfolioDeviceIds = new Set(
    myDevices.filter((ref: any) => ref.active_flag).map((ref: any) => ref.device)
  )

  const handleAdd = async (deviceId: string) => {
    try {
      await api.post('/devices/portfolio/add/', { device_id: deviceId })
      refreshPortfolio()
    } catch {
      showSnackbar('Failed to add device to portfolio.', 'error')
    }
  }

  const handleRemoveClick = (deviceId: string, deviceName: string) => {
    setConfirmRemoveId(deviceId)
    setConfirmRemoveName(deviceName)
  }

  const handleConfirmRemove = async () => {
    if (!confirmRemoveId) return
    try {
      await api.post('/devices/portfolio/remove/', { device_id: confirmRemoveId })
      refreshPortfolio()
    } catch {
      showSnackbar('Failed to remove device from portfolio.', 'error')
    } finally {
      setConfirmRemoveId(null)
      setConfirmRemoveName('')
    }
  }

  const handlePortfolioDeviceClick = async (ref: any) => {
    const found = devices.find((d: any) => d.id === ref.device)
    if (found) {
      handleRowClick(found)
    } else {
      try {
        const resp = await api.get(`/devices/devices/${ref.device}/`)
        handleRowClick(resp.data)
      } catch {
        handleRowClick({
          id: ref.device,
          name: ref.device_name,
          manufacturer_name: ref.device_manufacturer,
          lifecycle_status: ref.active_flag ? 'available' : 'inactive',
        })
      }
    }
  }

  const handleAddDropdownValue = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDropdownValue.trim()) return
    setDropdownError(null)
    try {
      if (manageField === 'manufacturer') {
        await api.post('/devices/manufacturers/', {
          name: newDropdownValue.trim(),
        })
        refetchManufacturers()
      } else {
        await api.post('/devices/types/', {
          name: newDropdownValue.trim(),
        })
        refetchTypes()
      }
      setNewDropdownValue('')
    } catch (err: any) {
      setDropdownError(parseApiError(err, 'Failed to add value.'))
    }
  }

  const handleDeleteDropdownValue = async (id: string) => {
    setDropdownError(null)
    const confirmed = await confirm({
      title: 'Delete Value',
      message: 'Are you sure you want to delete this value? This action cannot be undone.',
      confirmLabel: 'Delete',
      confirmColor: 'error',
    })
    if (!confirmed) return
    try {
      if (manageField === 'manufacturer') {
        await api.delete(`/devices/manufacturers/${id}/`)
        refetchManufacturers()
      } else {
        await api.delete(`/devices/types/${id}/`)
        refetchTypes()
      }
    } catch (err: any) {
      setDropdownError(parseApiError(err, 'Failed to delete value.'))
    }
  }

  const handleSaveTypeConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    setDropdownError(null)
    try {
      await api.patch(`/devices/types/${editingTypeConfig.id}/`, {
        status: typeConfigStatus,
        auto_mapping_eligible: typeConfigAutoMappingEligible,
        supported_accessory_categories: typeConfigSupportedCategories,
        compatibility_rules: typeConfigRules,
      })
      setEditingTypeConfig(null)
      refetchTypes()
    } catch (err: any) {
      setDropdownError(parseApiError(err, 'Failed to save configuration.'))
    }
  }

  const handleRowClick = (d: any) => {
    setEditingDevice(d)
    setEditTab('details')
    setEditManufacturer(d.manufacturer || '')
    setEditName(d.name || '')
    setEditDeviceType(d.device_type || '')

    let formattedLaunchDate = ''
    if (d.launch_date) {
      const parts = d.launch_date.split('/')
      if (parts.length === 3) {
        formattedLaunchDate = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`
      } else {
        formattedLaunchDate = d.launch_date
      }
    }
    setEditLaunchDate(formattedLaunchDate)

    setEditStatus(d.lifecycle_status || 'available')
    setEditCharging(d.compatible_charging_interface || 'Not Compatible')
    setEditStorage(d.storage_expansion_compatibility || 'Not Compatible')
    setEditMaxStorage(d.maximum_supported_storage || 'Not Compatible')
    setEditHeadphone(d.headphone_jack_compatibility || 'Not Compatible')
    setEditBluetooth(d.bluetooth_compatibility || 'Yes')
    setEditWireless(parseWirelessCharging(d.wireless_charging_compatibility))
    setEditWatchCase(d.compatible_watch_case_size || 'Not Compatible')
    setEditError('')
    setSelectedDeviceIdForAudit(d.id)
    setCompProdSearch('')
    setCompProdVendor('')
    setCompProdCategory('')
    setCompProdStatus('')
  }

  const selectedEditTypeObj = deviceTypes.find((t: any) => t.id === editDeviceType)
  const selectedEditTypeName = selectedEditTypeObj ? selectedEditTypeObj.name : ''
  const selectedEditCategory = getDeviceCategory(selectedEditTypeName)

  const handleEditStorageChange = (val: string) => {
    setEditStorage(val)
    if (val === 'microSDXC') {
      setEditMaxStorage('32GB')
    } else if (val === 'microSDHC') {
      setEditMaxStorage('16GB')
    } else {
      setEditMaxStorage('Not Compatible')
    }
  }

  const handleEditWirelessChange = (val: string) => {
    if (val === 'Not Compatible') {
      setEditWireless(['Not Compatible'])
      return
    }
    let updated = [...editWireless].filter(v => v !== 'Not Compatible')
    if (updated.includes(val)) {
      updated = updated.filter(v => v !== val)
    } else {
      if (val === 'Qi') {
        updated = ['Qi']
      } else {
        updated = updated.filter(v => v !== 'Qi')
        updated.push(val)
      }
    }
    setEditWireless(updated)
  }

  const handleUpdateDevice = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditError('')
    setIsSubmittingEdit(true)

    if (!editManufacturer) {
      setEditError('Manufacturer is required.')
      setIsSubmittingEdit(false)
      return
    }
    if (!editName.trim()) {
      setEditError('Device Name is required.')
      setIsSubmittingEdit(false)
      return
    }
    if (!editDeviceType) {
      setEditError('Device Type is required.')
      setIsSubmittingEdit(false)
      return
    }

    const payload: any = {
      manufacturer: editManufacturer,
      name: editName.trim(),
      device_type: editDeviceType,
      launch_date: editLaunchDate ? formatLaunchDate(editLaunchDate) : null,
      lifecycle_status: editStatus,
    }

    if (selectedEditCategory === 'phone') {
      if (!editCharging) {
        setEditError('Charging Interface is required.')
        setIsSubmittingEdit(false)
        return
      }
      if (!editStorage) {
        setEditError('Storage Expansion is required.')
        setIsSubmittingEdit(false)
        return
      }
      if (editStorage !== 'Not Compatible' && !editMaxStorage) {
        setEditError('Maximum Expansion is required.')
        setIsSubmittingEdit(false)
        return
      }
      if (!editHeadphone) {
        setEditError('Headphone Jack is required.')
        setIsSubmittingEdit(false)
        return
      }
      if (!editBluetooth) {
        setEditError('Bluetooth Compatibility is required.')
        setIsSubmittingEdit(false)
        return
      }
      if (editWireless.length === 0) {
        setEditError('Wireless Charging Compatibility is required.')
        setIsSubmittingEdit(false)
        return
      }
      payload.compatible_charging_interface = editCharging
      payload.storage_expansion_compatibility = editStorage
      payload.maximum_supported_storage = editStorage !== 'Not Compatible' ? editMaxStorage : 'Not Compatible'
      payload.headphone_jack_compatibility = editHeadphone
      payload.bluetooth_compatibility = editBluetooth
      payload.wireless_charging_compatibility = editWireless.join('+') || 'Not Compatible'
      payload.compatible_watch_case_size = 'Not Compatible'
    } else if (selectedEditCategory === 'tablet') {
      if (!editCharging) {
        setEditError('Charging Interface is required.')
        setIsSubmittingEdit(false)
        return
      }
      if (!editStorage) {
        setEditError('Storage Expansion is required.')
        setIsSubmittingEdit(false)
        return
      }
      if (editStorage !== 'Not Compatible' && !editMaxStorage) {
        setEditError('Maximum Expansion is required.')
        setIsSubmittingEdit(false)
        return
      }
      if (!editHeadphone) {
        setEditError('Headphone Jack is required.')
        setIsSubmittingEdit(false)
        return
      }
      if (!editBluetooth) {
        setEditError('Bluetooth Compatibility is required.')
        setIsSubmittingEdit(false)
        return
      }
      payload.compatible_charging_interface = editCharging
      payload.storage_expansion_compatibility = editStorage
      payload.maximum_supported_storage = editStorage !== 'Not Compatible' ? editMaxStorage : 'Not Compatible'
      payload.headphone_jack_compatibility = editHeadphone
      payload.bluetooth_compatibility = editBluetooth
      payload.wireless_charging_compatibility = 'Not Compatible'
      payload.compatible_watch_case_size = 'Not Compatible'
    } else if (selectedEditCategory === 'smartwatch') {
      if (!editBluetooth) {
        setEditError('Bluetooth Compatibility is required.')
        setIsSubmittingEdit(false)
        return
      }
      if (editWireless.length === 0) {
        setEditError('Wireless Charging Compatibility is required.')
        setIsSubmittingEdit(false)
        return
      }
      if (!editWatchCase) {
        setEditError('Compatible Watch Case Size is required.')
        setIsSubmittingEdit(false)
        return
      }
      payload.compatible_charging_interface = 'Not Compatible'
      payload.storage_expansion_compatibility = 'Not Compatible'
      payload.maximum_supported_storage = 'Not Compatible'
      payload.headphone_jack_compatibility = 'Not Compatible'
      payload.bluetooth_compatibility = editBluetooth
      payload.wireless_charging_compatibility = editWireless.join('+') || 'Not Compatible'
      payload.compatible_watch_case_size = editWatchCase
    } else if (selectedEditCategory === 'laptop') {
      if (!editCharging) {
        setEditError('Charging Interface is required.')
        setIsSubmittingEdit(false)
        return
      }
      if (!editHeadphone) {
        setEditError('Headphone Jack is required.')
        setIsSubmittingEdit(false)
        return
      }
      if (!editBluetooth) {
        setEditError('Bluetooth Compatibility is required.')
        setIsSubmittingEdit(false)
        return
      }
      payload.compatible_charging_interface = editCharging
      payload.storage_expansion_compatibility = 'Not Compatible'
      payload.maximum_supported_storage = 'Not Compatible'
      payload.headphone_jack_compatibility = editHeadphone
      payload.bluetooth_compatibility = editBluetooth
      payload.wireless_charging_compatibility = 'Not Compatible'
      payload.compatible_watch_case_size = 'Not Compatible'
    }

    try {
      await api.put(`/devices/devices/${editingDevice.id}/`, payload)
      setEditingDevice(null)
      refreshDevices()
    } catch (err: any) {
      console.error(err)
      const data = err.response?.data
      if (data) {
        const errorSource = (data.detail && typeof data.detail === 'object') ? data.detail : data
        if (typeof errorSource === 'object') {
          const firstErr = Object.entries(errorSource)
            .map(([field, msg]) => {
              if (field === 'error' || field === 'status_code') return null
              const cleanMsg = Array.isArray(msg)
                ? msg[0]
                : (typeof msg === 'object' && msg !== null ? JSON.stringify(msg) : msg)
              return `${field}: ${cleanMsg}`
            })
            .filter(Boolean)
            .join('\n')
          setEditError(firstErr || 'Failed to update device.')
        } else {
          setEditError(String(data))
        }
      } else {
        setEditError('Failed to update device. Please verify your fields and try again.')
      }
    } finally {
      setIsSubmittingEdit(false)
    }
  }

  function getDeviceCategory(typeName: string) {
    const name = typeName.toLowerCase().trim()
    if (name === 'phone' || name === 'smartphone') return 'phone'
    if (name === 'tablet') return 'tablet'
    if (name === 'smartwatch' || name === 'wearable' || name === 'watch') return 'smartwatch'
    if (name === 'laptop') return 'laptop'
    return ''
  }

  const selectedTypeObj = deviceTypes.find((t: any) => t.id === addDeviceType)
  const selectedTypeName = selectedTypeObj ? selectedTypeObj.name : ''
  const selectedCategory = getDeviceCategory(selectedTypeName)

  const handleStorageChange = (val: string) => {
    setAddStorage(val)
    if (val === 'microSDXC') {
      setAddMaxStorage('32GB')
    } else if (val === 'microSDHC') {
      setAddMaxStorage('16GB')
    } else {
      setAddMaxStorage('Not Compatible')
    }
  }

  const handleWirelessChange = (val: string) => {
    if (val === 'Not Compatible') {
      setAddWireless(['Not Compatible'])
      return
    }
    let updated = [...addWireless].filter(v => v !== 'Not Compatible')
    if (updated.includes(val)) {
      updated = updated.filter(v => v !== val)
    } else {
      if (val === 'Qi') {
        updated = ['Qi']
      } else {
        updated = updated.filter(v => v !== 'Qi')
        updated.push(val)
      }
    }
    setAddWireless(updated)
  }

  const formatLaunchDate = (dateStr: string) => {
    if (!dateStr) return ''
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      return `${parts[1]}/${parts[2]}/${parts[0]}`
    }
    return dateStr
  }

  const handleSubmitDevice = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError('')
    setIsSubmitting(true)

    if (!addManufacturer) {
      setAddError('Manufacturer is required.')
      setIsSubmitting(false)
      return
    }
    if (!addName.trim()) {
      setAddError('Device Name is required.')
      setIsSubmitting(false)
      return
    }
    if (!addDeviceType) {
      setAddError('Device Type is required.')
      setIsSubmitting(false)
      return
    }
    if (!addLaunchDate) {
      setAddError('Launch Date is required.')
      setIsSubmitting(false)
      return
    }

    const payload: any = {
      manufacturer: addManufacturer,
      name: addName.trim(),
      device_type: addDeviceType,
      launch_date: formatLaunchDate(addLaunchDate),
      lifecycle_status: 'available',
    }

    if (selectedCategory === 'phone') {
      if (!addCharging) {
        setAddError('Charging Interface is required.')
        setIsSubmitting(false)
        return
      }
      if (!addStorage) {
        setAddError('Storage Expansion is required.')
        setIsSubmitting(false)
        return
      }
      if (addStorage !== 'Not Compatible' && !addMaxStorage) {
        setAddError('Maximum Expansion is required.')
        setIsSubmitting(false)
        return
      }
      if (!addHeadphone) {
        setAddError('Headphone Jack is required.')
        setIsSubmitting(false)
        return
      }
      if (!addBluetooth) {
        setAddError('Bluetooth Compatibility is required.')
        setIsSubmitting(false)
        return
      }
      if (addWireless.length === 0) {
        setAddError('Wireless Charging Compatibility is required.')
        setIsSubmitting(false)
        return
      }
      payload.compatible_charging_interface = addCharging
      payload.storage_expansion_compatibility = addStorage
      payload.maximum_supported_storage = addStorage !== 'Not Compatible' ? addMaxStorage : 'Not Compatible'
      payload.headphone_jack_compatibility = addHeadphone
      payload.bluetooth_compatibility = addBluetooth
      payload.wireless_charging_compatibility = addWireless.join('+') || 'Not Compatible'
      payload.compatible_watch_case_size = 'Not Compatible'
    } else if (selectedCategory === 'tablet') {
      if (!addCharging) {
        setAddError('Charging Interface is required.')
        setIsSubmitting(false)
        return
      }
      if (!addStorage) {
        setAddError('Storage Expansion is required.')
        setIsSubmitting(false)
        return
      }
      if (addStorage !== 'Not Compatible' && !addMaxStorage) {
        setAddError('Maximum Expansion is required.')
        setIsSubmitting(false)
        return
      }
      if (!addHeadphone) {
        setAddError('Headphone Jack is required.')
        setIsSubmitting(false)
        return
      }
      if (!addBluetooth) {
        setAddError('Bluetooth Compatibility is required.')
        setIsSubmitting(false)
        return
      }
      payload.compatible_charging_interface = addCharging
      payload.storage_expansion_compatibility = addStorage
      payload.maximum_supported_storage = addStorage !== 'Not Compatible' ? addMaxStorage : 'Not Compatible'
      payload.headphone_jack_compatibility = addHeadphone
      payload.bluetooth_compatibility = addBluetooth
      payload.wireless_charging_compatibility = 'Not Compatible'
      payload.compatible_watch_case_size = 'Not Compatible'
    } else if (selectedCategory === 'smartwatch') {
      if (!addBluetooth) {
        setAddError('Bluetooth Compatibility is required.')
        setIsSubmitting(false)
        return
      }
      if (addWireless.length === 0) {
        setAddError('Wireless Charging Compatibility is required.')
        setIsSubmitting(false)
        return
      }
      if (!addWatchCase) {
        setAddError('Compatible Watch Case Size is required.')
        setIsSubmitting(false)
        return
      }
      payload.compatible_charging_interface = 'Not Compatible'
      payload.storage_expansion_compatibility = 'Not Compatible'
      payload.maximum_supported_storage = 'Not Compatible'
      payload.headphone_jack_compatibility = 'Not Compatible'
      payload.bluetooth_compatibility = addBluetooth
      payload.wireless_charging_compatibility = addWireless.join('+') || 'Not Compatible'
      payload.compatible_watch_case_size = addWatchCase
    } else if (selectedCategory === 'laptop') {
      if (!addCharging) {
        setAddError('Charging Interface is required.')
        setIsSubmitting(false)
        return
      }
      if (!addHeadphone) {
        setAddError('Headphone Jack is required.')
        setIsSubmitting(false)
        return
      }
      if (!addBluetooth) {
        setAddError('Bluetooth Compatibility is required.')
        setIsSubmitting(false)
        return
      }
      payload.compatible_charging_interface = addCharging
      payload.storage_expansion_compatibility = 'Not Compatible'
      payload.maximum_supported_storage = 'Not Compatible'
      payload.headphone_jack_compatibility = addHeadphone
      payload.bluetooth_compatibility = addBluetooth
      payload.wireless_charging_compatibility = 'Not Compatible'
      payload.compatible_watch_case_size = 'Not Compatible'
    }

    try {
      await api.post('/devices/devices/', payload)
      setShowAddModal(false)
      refreshDevices()
      // Reset form
      setAddManufacturer('')
      setAddName('')
      setAddDeviceType('')
      setAddLaunchDate('')
      setAddCharging('')
      setAddStorage('')
      setAddMaxStorage('')
      setAddHeadphone('')
      setAddBluetooth('')
      setAddWireless([])
      setAddWatchCase('')
    } catch (err: any) {
      console.error(err)
      const data = err.response?.data
      if (data) {
        const errorSource = (data.detail && typeof data.detail === 'object') ? data.detail : data
        if (typeof errorSource === 'object') {
          const firstErr = Object.entries(errorSource)
            .map(([field, msg]) => {
              if (field === 'error' || field === 'status_code') return null
              const cleanMsg = Array.isArray(msg)
                ? msg[0]
                : (typeof msg === 'object' && msg !== null ? JSON.stringify(msg) : msg)
              return `${field}: ${cleanMsg}`
            })
            .filter(Boolean)
            .join('\n')
          setAddError(firstErr || 'Failed to add device.')
        } else {
          setAddError(String(data))
        }
      } else {
        setAddError('Failed to add device. Please verify your fields and try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDownloadTemplate = () => {
    window.open(`${api.defaults.baseURL}/devices/devices/import_template/`, '_blank')
  }

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setImportErrors([])
    setImportErrorGeneral('')
    setImportSuccess('')
    setIsImporting(true)

    if (!importFile) {
      setImportErrorGeneral('Please select a CSV file to import.')
      setIsImporting(false)
      return
    }

    const formData = new FormData()
    formData.append('file', importFile)
    formData.append('import_mode', importMode)

    try {
      const resp = await api.post('/devices/devices/bulk_import/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      setImportSuccess(`Import completed successfully! Created: ${resp.data.created_count}, Updated: ${resp.data.updated_count}`)
      setImportFile(null)
      refreshDevices()
      setTimeout(() => {
        setShowImportModal(false)
        setImportSuccess('')
      }, 3000)
    } catch (err: any) {
      console.error(err)
      const data = err.response?.data
      if (data?.status === 'validation_failed' && Array.isArray(data.errors)) {
        setImportErrors(data.errors)
      } else if (data?.error) {
        setImportErrorGeneral(data.error)
      } else {
        setImportErrorGeneral('Failed to import file. Please check the columns and format.')
      }
    } finally {
      setIsImporting(false)
    }
  }

  // Helper: render a read-only field value box
  const ReadOnlyField = ({ children }: { children: React.ReactNode }) => (
    <Box
      sx={{
        px: 1.5,
        py: 1,
        bgcolor: 'action.hover',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        color: 'text.primary',
        fontSize: '0.8125rem',
        minHeight: 38,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {children}
    </Box>
  )

  // Helper: render a wireless charging checkbox group
  const WirelessCheckboxGroup = ({
    wireless,
    onChange,
  }: {
    wireless: string[]
    onChange: (val: string) => void
  }) => (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 1,
        p: 1.25,
        bgcolor: 'action.hover',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
      }}
    >
      <FormControlLabel
        control={
          <Checkbox
            size="small"
            checked={wireless.includes('MagSafe')}
            disabled={wireless.includes('Not Compatible') || wireless.includes('Qi')}
            onChange={() => onChange('MagSafe')}
          />
        }
        label={<Typography variant="body2">MagSafe</Typography>}
      />
      <FormControlLabel
        control={
          <Checkbox
            size="small"
            checked={wireless.includes('Qi2')}
            disabled={wireless.includes('Not Compatible') || wireless.includes('Qi')}
            onChange={() => onChange('Qi2')}
          />
        }
        label={<Typography variant="body2">Qi2</Typography>}
      />
      <FormControlLabel
        control={
          <Checkbox
            size="small"
            checked={wireless.includes('Qi')}
            disabled={wireless.includes('Not Compatible') || wireless.includes('MagSafe') || wireless.includes('Qi2')}
            onChange={() => onChange('Qi')}
          />
        }
        label={<Typography variant="body2">Qi</Typography>}
      />
      <FormControlLabel
        control={
          <Checkbox
            size="small"
            checked={wireless.includes('Not Compatible')}
            onChange={() => onChange('Not Compatible')}
          />
        }
        label={<Typography variant="body2">Not Compatible</Typography>}
      />
    </Box>
  )

  const getDisplayStatus = (lifecycleStatus: string, launchDate?: string) => {
    const isLaunching = lifecycleStatus === 'launching' || (lifecycleStatus === 'inactive' && launchDate && new Date(launchDate) > new Date())
    return isLaunching ? 'launching' : lifecycleStatus
  }

  return (
    <Box>
      <PageHeader
        title="Device Catalog"
        subtitle="All devices, features, and buyer portfolios"
        actions={
          (canManageDropdowns || canImportDevices) ? (
            <>
              {canManageDropdowns && (
                <Button variant="outlined" size="small" onClick={() => setShowDropdownModal(true)}>
                  Manage Dropdown Values
                </Button>
              )}
              {canImportDevices && (
                <>
                  <Button variant="outlined" size="small" onClick={() => { resetImportState(); setShowImportModal(true); }}>
                    Import Devices
                  </Button>
                  <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => { resetAddState(); setShowAddModal(true); }}>
                    Add Device
                  </Button>
                </>
              )}
            </>
          ) : undefined
        }
      />

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={tab === 'devices' ? 0 : 1}
          onChange={(_, v) => setTab(v === 0 ? 'devices' : 'portfolio')}
        >
          <Tab label="All Devices" />
          {isBuyer && <Tab label="My Portfolio" />}
        </Tabs>
      </Box>

      {tab === 'devices' && (
        <>
          <Box sx={{ mb: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <SearchBar
              placeholder="Search by name, SKU, model..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              sx={{ width: 280 }}
            />

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <Select
                value={filterManufacturer}
                onChange={e => setFilterManufacturer(e.target.value)}
                displayEmpty
              >
                <MenuItem value="">All Manufacturers</MenuItem>
                {manufacturers.map((m: any) => (
                  <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <Select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                displayEmpty
              >
                <MenuItem value="">All Device Types</MenuItem>
                {deviceTypes.map((t: any) => (
                  <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                displayEmpty
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="available">Available</MenuItem>
                <MenuItem value="launching">Launching</MenuItem>
                {!isBuyer && [
                  <MenuItem key="inactive" value="inactive">Inactive</MenuItem>,
                  <MenuItem key="eol" value="eol">EOL</MenuItem>,
                ]}
              </Select>
            </FormControl>

            {(search || filterManufacturer || filterType || filterStatus) && (
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setSearch('')
                  setFilterManufacturer('')
                  setFilterType('')
                  setFilterStatus('')
                }}
              >
                Clear Filters
              </Button>
            )}
          </Box>

          <Paper variant="outlined">
            {isLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, py: 6 }}>
                <CircularProgress size={24} />
                <Typography variant="body2" color="text.secondary">Loading devices...</Typography>
              </Box>
            ) : devices.length === 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 1 }}>
                <SmartphoneIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
                <Typography variant="body1">No devices found</Typography>
                <Typography variant="body2" color="text.secondary">Import devices via CSV to get started</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Manufacturer</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Status</TableCell>
                      {isBuyer && <TableCell>Action</TableCell>}
                      <TableCell sx={{ width: 32 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedDevices.map((d: any) => {
                      const inPortfolio = portfolioDeviceIds.has(d.id)
                      const displayStatus = getDisplayStatus(d.lifecycle_status, d.launch_date)
                      return (
                        <TableRow
                          key={d.id}
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() => handleRowClick(d)}
                        >
                          <TableCell sx={{ fontWeight: 500, color: 'text.primary' }}>{d.name}</TableCell>
                          <TableCell>{d.manufacturer_name ?? d.manufacturer}</TableCell>
                          <TableCell>{d.device_type_name ?? d.device_type}</TableCell>
                          <TableCell>
                            <StatusChip
                              status={displayStatus}
                              label={displayStatus === 'eol' ? 'EOL' : undefined}
                            />
                          </TableCell>
                          {isBuyer && (
                            <TableCell onClick={e => e.stopPropagation()}>
                              {inPortfolio ? (
                                <Chip
                                  icon={<CheckIcon sx={{ fontSize: 14 }} />}
                                  label="In Portfolio"
                                  color="success"
                                  size="small"
                                  variant="filled"
                                />
                              ) : (
                                <Button variant="outlined" size="small" sx={{ py: 0.25, px: 1 }} onClick={() => handleAdd(d.id)}>
                                  Add to Portfolio
                                </Button>
                              )}
                            </TableCell>
                          )}
                          <TableCell>
                            <ChevronRightIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
          <Pagination
            currentPage={devicePage}
            totalPages={totalDevicePages}
            totalItems={totalDevices}
            pageSize={50}
            onPageChange={setDevicePage}
            itemName="devices"
          />
        </>
      )}

      {tab === 'portfolio' && isBuyer && (
        <>
          <Box sx={{ mb: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <SearchBar
              placeholder="Search by name, SKU, model..."
              value={portfolioSearch}
              onChange={e => setPortfolioSearch(e.target.value)}
              sx={{ width: 280 }}
            />

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <Select
                value={portfolioMfg}
                onChange={e => setPortfolioMfg(e.target.value)}
                displayEmpty
              >
                <MenuItem value="">All Manufacturers</MenuItem>
                {manufacturers.map((m: any) => (
                  <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <Select
                value={portfolioType}
                onChange={e => setPortfolioType(e.target.value)}
                displayEmpty
              >
                <MenuItem value="">All Device Types</MenuItem>
                {deviceTypes.map((t: any) => (
                  <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Paper variant="outlined">
            {(portfolio ?? []).length === 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 1 }}>
                <SmartphoneIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
                <Typography variant="body1">Your portfolio is empty</Typography>
                <Typography variant="body2" color="text.secondary">Add devices from the All Devices tab</Typography>
              </Box>
            ) : filteredMyDevices.length === 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 1 }}>
                <SmartphoneIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
                <Typography variant="body1">No matching devices found</Typography>
                <Typography variant="body2" color="text.secondary">Try clearing or adjusting your search filters</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Device</TableCell>
                      <TableCell>Manufacturer</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Added</TableCell>
                      <TableCell>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedMyDevices.map((ref: any) => {
                      const displayStatus = getDisplayStatus(ref.device_status, ref.device_launch_date)
                      return (
                        <TableRow key={ref.id} hover>
                          <TableCell>
                            <Tooltip title="View device details">
                              <Typography
                                component="span"
                                variant="body2"
                                sx={{
                                  color: 'primary.main',
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                  textDecoration: 'underline',
                                  textUnderlineOffset: '2px',
                                  '&:hover': { opacity: 0.8 },
                                }}
                                onClick={() => handlePortfolioDeviceClick(ref)}
                              >
                                {ref.device_name}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell>{ref.device_manufacturer}</TableCell>
                          <TableCell>{ref.device_type ?? '\u2014'}</TableCell>
                          <TableCell>
                            <StatusChip
                              status={displayStatus || 'available'}
                              label={displayStatus === 'eol' ? 'EOL' : undefined}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">{formatDate(ref.created_at)}</Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              {ref.active_flag ? (
                                <Button
                                  variant="outlined"
                                  color="error"
                                  size="small"
                                  startIcon={<DeleteIcon sx={{ fontSize: 14 }} />}
                                  onClick={() => handleRemoveClick(ref.device, ref.device_name)}
                                >
                                  Remove
                                </Button>
                              ) : (
                                <Button variant="outlined" size="small" onClick={() => handleAdd(ref.device)}>
                                  Add back
                                </Button>
                              )}
                              {ref.active_flag && ref.has_accessories && (
                                <Button
                                  variant="contained"
                                  size="small"
                                  onClick={() => navigate(`/catalog?tab=my-compatibility&compatibility_device=${ref.device}`)}
                                >
                                  View Products
                                </Button>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
          <Pagination
            currentPage={portfolioPage}
            totalPages={totalPortfolioPages}
            totalItems={totalPortfolioDevices}
            pageSize={50}
            onPageChange={setPortfolioPage}
            itemName="devices"
          />
        </>
      )}

      {/* Remove Confirmation Dialog */}
      <Dialog
        open={!!confirmRemoveId}
        onClose={() => { setConfirmRemoveId(null); setConfirmRemoveName(''); }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirm Removal</DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 1.5 }}>
            <ErrorOutlineIcon sx={{ fontSize: 40, color: 'error.main', mb: 1.5 }} />
            <Typography variant="subtitle1" gutterBottom>
              Are you sure you want to remove this device from your My Portfolio?
            </Typography>
            {confirmRemoveName && (
              <Typography variant="body2" color="text.secondary">
                <strong>{confirmRemoveName}</strong> will be removed from your portfolio.
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', gap: 1.5, pb: 2 }}>
          <Button variant="outlined" onClick={() => { setConfirmRemoveId(null); setConfirmRemoveName(''); }}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={handleConfirmRemove}>
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Device Dialog */}
      <Dialog
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Device</DialogTitle>
        <form onSubmit={handleSubmitDevice}>
          <DialogContent dividers>
            {addError && (
              <Alert severity="error" icon={<ErrorOutlineIcon />} sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                {addError}
              </Alert>
            )}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.75 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Manufacturer *</InputLabel>
                <Select
                  value={addManufacturer}
                  onChange={e => setAddManufacturer(e.target.value)}
                  label="Manufacturer *"
                >
                  {activeManufacturers.map((m: any) => (
                    <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                size="small"
                label="Device Name *"
                placeholder="e.g. iPhone 16 Pro"
                value={addName}
                onChange={e => setAddName(e.target.value)}
              />

              <FormControl size="small" fullWidth>
                <InputLabel>Device Type *</InputLabel>
                <Select
                  value={addDeviceType}
                  onChange={e => setAddDeviceType(e.target.value)}
                  label="Device Type *"
                >
                  {activeDeviceTypes.map((t: any) => (
                    <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                size="small"
                label="Launch Date *"
                type="date"
                value={addLaunchDate}
                onChange={e => setAddLaunchDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />

              {selectedCategory && (
                <Box sx={{ gridColumn: 'span 2' }}>
                  <Divider sx={{ my: 1 }} />
                </Box>
              )}

              {/* Phone / Tablet / Laptop fields */}
              {(selectedCategory === 'phone' || selectedCategory === 'tablet' || selectedCategory === 'laptop') && (
                <FormControl size="small" fullWidth>
                  <InputLabel>Charging Interface *</InputLabel>
                  <Select
                    value={addCharging}
                    onChange={e => setAddCharging(e.target.value)}
                    label="Charging Interface *"
                  >
                    <MenuItem value="Type-C">Type-C</MenuItem>
                    {selectedCategory !== 'laptop' && <MenuItem value="Lightning">Lightning</MenuItem>}
                    <MenuItem value="Not Compatible">Not Compatible</MenuItem>
                  </Select>
                </FormControl>
              )}

              {(selectedCategory === 'phone' || selectedCategory === 'tablet') && (
                <>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Storage Expansion *</InputLabel>
                    <Select
                      value={addStorage}
                      onChange={e => handleStorageChange(e.target.value)}
                      label="Storage Expansion *"
                    >
                      <MenuItem value="Not Compatible">Not Compatible</MenuItem>
                      <MenuItem value="microSDXC">microSDXC</MenuItem>
                      <MenuItem value="microSDHC">microSDHC</MenuItem>
                    </Select>
                  </FormControl>

                  {(addStorage === 'microSDXC' || addStorage === 'microSDHC') && (
                    <FormControl size="small" fullWidth>
                      <InputLabel>Maximum Expansion *</InputLabel>
                      <Select
                        value={addMaxStorage}
                        onChange={e => setAddMaxStorage(e.target.value)}
                        label="Maximum Expansion *"
                      >
                        {addStorage === 'microSDXC' ? (
                          ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB'].map(v => (
                            <MenuItem key={v} value={v}>{v}</MenuItem>
                          ))
                        ) : (
                          ['16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '1.5TB'].map(v => (
                            <MenuItem key={v} value={v}>{v}</MenuItem>
                          ))
                        )}
                      </Select>
                    </FormControl>
                  )}
                </>
              )}

              {(selectedCategory === 'phone' || selectedCategory === 'tablet' || selectedCategory === 'laptop') && (
                <FormControl size="small" fullWidth>
                  <InputLabel>Headphone Jack *</InputLabel>
                  <Select
                    value={addHeadphone}
                    onChange={e => setAddHeadphone(e.target.value)}
                    label="Headphone Jack *"
                  >
                    <MenuItem value="Not Compatible">Not Compatible</MenuItem>
                    <MenuItem value="Type-C">Type-C</MenuItem>
                    {selectedCategory !== 'laptop' && <MenuItem value="Lightning">Lightning</MenuItem>}
                  </Select>
                </FormControl>
              )}

              {/* Bluetooth (all categories) */}
              {selectedCategory && (
                <FormControl size="small" fullWidth>
                  <InputLabel>Bluetooth Compatibility *</InputLabel>
                  <Select
                    value={addBluetooth}
                    onChange={e => setAddBluetooth(e.target.value)}
                    label="Bluetooth Compatibility *"
                  >
                    <MenuItem value="Yes">Yes</MenuItem>
                    <MenuItem value="No">No</MenuItem>
                  </Select>
                </FormControl>
              )}

              {/* Wireless Charging (Phone / Smartwatch) */}
              {(selectedCategory === 'phone' || selectedCategory === 'smartwatch') && (
                <Box sx={{ gridColumn: 'span 2' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Wireless Charging Compatibility *
                  </Typography>
                  <WirelessCheckboxGroup wireless={addWireless} onChange={handleWirelessChange} />
                </Box>
              )}

              {/* Watch Case Size (Smartwatch) */}
              {selectedCategory === 'smartwatch' && (
                <FormControl size="small" fullWidth>
                  <InputLabel>Watch Case Size *</InputLabel>
                  <Select
                    value={addWatchCase}
                    onChange={e => setAddWatchCase(e.target.value)}
                    label="Watch Case Size *"
                  >
                    <MenuItem value="Not Compatible">Not Compatible</MenuItem>
                    {['40mm', '41mm', '42mm', '44mm', '45mm', '46mm', '49mm'].map(v => (
                      <MenuItem key={v} value={v}>{v}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowAddModal(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Add Device'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Import Dialog */}
      <Dialog
        open={showImportModal}
        onClose={() => { setShowImportModal(false); resetImportState(); }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Import Devices</DialogTitle>
        <form onSubmit={handleImportSubmit}>
          <DialogContent dividers>
            {importErrorGeneral && (
              <Alert severity="error" icon={<ErrorOutlineIcon />} sx={{ mb: 2 }}>
                {importErrorGeneral}
              </Alert>
            )}
            {importSuccess && (
              <Alert severity="success" icon={<CheckIcon />} sx={{ mb: 2 }}>
                {importSuccess}
              </Alert>
            )}

            <Box sx={{ mb: 2.25 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                <Typography variant="subtitle2">Device CSV Template</Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}
                  onClick={handleDownloadTemplate}
                >
                  Download Template
                </Button>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Download the standard Device CSV Import template to ensure proper columns and validation alignment.
              </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.75 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Import Mode *</InputLabel>
                <Select
                  value={importMode}
                  onChange={e => setImportMode(e.target.value)}
                  label="Import Mode *"
                >
                  <MenuItem value="Create New Only">Create New Only</MenuItem>
                  <MenuItem value="Update Existing">Update Existing</MenuItem>
                  <MenuItem value="Upsert">Upsert (Create & Update)</MenuItem>
                </Select>
              </FormControl>

              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Select CSV File *</Typography>
                <input
                  type="file"
                  accept=".csv"
                  key={importFile ? 'has-file' : 'no-file'}
                  style={{ fontSize: 13 }}
                  onChange={e => setImportFile(e.target.files?.[0] || null)}
                />
              </Box>
            </Box>

            {importErrors.length > 0 && (
              <Box sx={{ mt: 2.5 }}>
                <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', mb: 1 }}>
                  <ErrorOutlineIcon sx={{ fontSize: 16, color: 'error.main' }} />
                  <Typography variant="subtitle2" color="error">
                    Import Validation Failed ({importErrors.length} Errors Found)
                  </Typography>
                </Box>
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 200 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: 50, fontWeight: 600 }}>Row</TableCell>
                        <TableCell sx={{ width: 140, fontWeight: 600 }}>Column</TableCell>
                        <TableCell sx={{ width: 130, fontWeight: 600 }}>Submitted Value</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Error Message</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {importErrors.map((err, i) => (
                        <TableRow key={i} hover>
                          <TableCell sx={{ fontWeight: 600 }}>{err.row}</TableCell>
                          <TableCell sx={{ color: 'text.primary' }}>{err.column}</TableCell>
                          <TableCell sx={{ fontFamily: MONO_FONT, fontSize: '0.6875rem' }}>
                            {err.submitted_value || <Typography component="span" variant="caption" color="text.disabled">[empty]</Typography>}
                          </TableCell>
                          <TableCell sx={{ color: 'error.main' }}>{err.error_message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => { setShowImportModal(false); resetImportState(); }}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={isImporting || !importFile}>
              {isImporting ? 'Importing...' : 'Start Import'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dropdown Manager Dialog */}
      <Dialog
        open={showDropdownModal}
        onClose={() => { setShowDropdownModal(false); setEditingTypeConfig(null); }}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { maxHeight: '90vh' } } }}
      >
        <DialogTitle>
          {editingTypeConfig ? 'Configure Device Type Rules' : 'Manage Dropdown Values'}
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {dropdownError && (
            <Alert severity="error" icon={<ErrorOutlineIcon />}>
              {dropdownError}
            </Alert>
          )}

          {editingTypeConfig ? (
            <form onSubmit={handleSaveTypeConfig} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Configuring Rules for: <Typography component="span" color="primary.main" sx={{ fontWeight: 600 }}>{editingTypeConfig.name}</Typography>
              </Typography>

              <FormControl size="small" fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={typeConfigStatus}
                  onChange={e => setTypeConfigStatus(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="setup_required">Setup Required</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={typeConfigAutoMappingEligible}
                    onChange={e => setTypeConfigAutoMappingEligible(e.target.checked)}
                    size="small"
                  />
                }
                label={<Typography variant="body2" color="text.secondary">Eligible for Auto-Mapping Remap</Typography>}
              />

              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Supported Accessory Categories</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 0.5 }}>
                  {categories.map((cat: string) => {
                    const checked = typeConfigSupportedCategories.includes(cat)
                    return (
                      <FormControlLabel
                        key={cat}
                        control={
                          <Checkbox
                            size="small"
                            checked={checked}
                            onChange={e => {
                              if (e.target.checked) {
                                setTypeConfigSupportedCategories([...typeConfigSupportedCategories, cat])
                              } else {
                                setTypeConfigSupportedCategories(typeConfigSupportedCategories.filter(x => x !== cat))
                              }
                            }}
                          />
                        }
                        label={<Typography variant="body2">{cat}</Typography>}
                      />
                    )
                  })}
                </Box>
              </Box>

              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Device Compatibility Rules</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 0.75 }}>
                  {[
                    { value: 'compatible_charging_interface', label: 'Charging Interface' },
                    { value: 'storage_expansion_compatibility', label: 'Storage Expansion' },
                    { value: 'maximum_supported_storage', label: 'Max Supported Storage' },
                    { value: 'headphone_jack_compatibility', label: 'Headphone Jack' },
                    { value: 'bluetooth_compatibility', label: 'Bluetooth' },
                    { value: 'wireless_charging_compatibility', label: 'Wireless Charging' },
                    { value: 'compatible_watch_case_size', label: 'Watch Case Size' },
                  ].map(opt => {
                    const rule = typeConfigRules[opt.value] || { mode: 'hidden' }
                    return (
                      <Paper
                        key={opt.value}
                        variant="outlined"
                        sx={{ p: 1, bgcolor: 'action.hover' }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ fontWeight: 555 }}>{opt.label}</Typography>
                          <Select
                            size="small"
                            value={rule.mode}
                            onChange={e => {
                              setTypeConfigRules({
                                ...typeConfigRules,
                                [opt.value]: { ...rule, mode: e.target.value }
                              })
                            }}
                            sx={{ fontSize: '0.75rem', height: 28 }}
                          >
                            <MenuItem value="hidden">Hidden</MenuItem>
                            <MenuItem value="required">Required</MenuItem>
                            <MenuItem value="optional">Optional</MenuItem>
                            <MenuItem value="defaulted">Defaulted</MenuItem>
                          </Select>
                        </Box>
                        {rule.mode === 'defaulted' && (
                          <Box sx={{ mt: 0.75, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption" color="text.secondary">Default Value:</Typography>
                            <TextField
                              size="small"
                              value={rule.default || ''}
                              onChange={e => {
                                setTypeConfigRules({
                                  ...typeConfigRules,
                                  [opt.value]: { ...rule, default: e.target.value }
                                })
                              }}
                              placeholder="Enter default value..."
                              sx={{ flex: 1 }}
                              slotProps={{ input: { sx: { fontSize: '0.75rem', height: 28 } } }}
                            />
                          </Box>
                        )}
                      </Paper>
                    )
                  })}
                </Box>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.25, mt: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
                <Button variant="outlined" onClick={() => setEditingTypeConfig(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="contained">
                  Save Rules
                </Button>
              </Box>
            </form>
          ) : (
            <>
              <FormControl size="small" fullWidth>
                <InputLabel>Select Taxonomy Dropdown</InputLabel>
                <Select
                  value={manageField}
                  onChange={e => {
                    setManageField(e.target.value as any)
                    setNewDropdownValue('')
                    setDropdownError(null)
                  }}
                  label="Select Taxonomy Dropdown"
                >
                  <MenuItem value="manufacturer">Device Manufacturer</MenuItem>
                  <MenuItem value="device_type">Device Type</MenuItem>
                </Select>
              </FormControl>

              <Box component="form" onSubmit={handleAddDropdownValue} sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
                <TextField
                  size="small"
                  placeholder={`Add new ${manageField === 'manufacturer' ? 'manufacturer' : 'device type'}...`}
                  value={newDropdownValue}
                  onChange={e => setNewDropdownValue(e.target.value)}
                  sx={{ flex: 1 }}
                />
                <Button type="submit" variant="contained">
                  Add Value
                </Button>
              </Box>

              <Paper variant="outlined" sx={{ flex: 1, overflow: 'auto', maxHeight: '35vh' }}>
                {(manageField === 'manufacturer' ? manufacturers : deviceTypes).length === 0 ? (
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">No values configured.</Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    {(manageField === 'manufacturer' ? manufacturers : deviceTypes).map((item: any) => (
                      <Box
                        key={item.id}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          px: 1.5,
                          py: 1.25,
                          borderBottom: 1,
                          borderColor: 'divider',
                        }}
                      >
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 555 }}>
                            {item.name}
                          </Typography>
                          {!item.is_active && (
                            <Typography variant="caption" color="text.disabled">Inactive</Typography>
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          {manageField === 'device_type' && (
                            <Tooltip title="Configure rules">
                              <IconButton size="small" color="primary" onClick={() => setEditingTypeConfig(item)}>
                                <SettingsIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Button
                            size="small"
                            sx={{ fontSize: '0.6875rem', minWidth: 'auto', px: 0.5, color: 'text.secondary' }}
                            onClick={async () => {
                              try {
                                if (manageField === 'manufacturer') {
                                  await api.patch(`/devices/manufacturers/${item.id}/`, { is_active: !item.is_active })
                                  refetchManufacturers()
                                } else {
                                  await api.patch(`/devices/types/${item.id}/`, {
                                    is_active: !item.is_active,
                                    status: !item.is_active ? 'active' : 'inactive'
                                  })
                                  refetchTypes()
                                }
                              } catch (err: any) {
                                setDropdownError(parseApiError(err, 'Failed to toggle status.'))
                              }
                            }}
                          >
                            {item.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteDropdownValue(item.id)}
                            >
                              <DeleteIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </Paper>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
                <Button variant="outlined" onClick={() => setShowDropdownModal(false)}>
                  Close
                </Button>
              </Box>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit / Detail Dialog */}
      <Dialog
        open={!!editingDevice}
        onClose={() => setEditingDevice(null)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { maxHeight: '90vh' } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Device Details & History
          <IconButton size="small" onClick={() => setEditingDevice(null)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        {/* Modal Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2.5 }}>
          <Tabs
            value={editTab === 'details' ? 0 : editTab === 'compatibility' ? 1 : editTab === 'products' ? 2 : 3}
            onChange={(_, v) => {
              const tabs: ('details' | 'compatibility' | 'products' | 'audit')[] = ['details', 'compatibility', 'products', 'audit']
              setEditTab(tabs[v])
            }}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label={isCixciAdmin ? 'Edit Details' : 'View Details'} />
            <Tab label="Device Compatibility" />
            {!isBuyer && <Tab label="Compatible Products" />}
            {!isBuyer && <Tab label="Audit History" />}
          </Tabs>
        </Box>

        {editTab === 'details' ? (
          <form onSubmit={handleUpdateDevice}>
            <DialogContent dividers>
              {editError && (
                <Alert severity="error" icon={<ErrorOutlineIcon />} sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                  {editError}
                </Alert>
              )}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.75 }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Manufacturer *</Typography>
                  {isCixciAdmin ? (
                    <FormControl size="small" fullWidth>
                      <Select
                        value={editManufacturer}
                        onChange={e => setEditManufacturer(e.target.value)}
                        displayEmpty
                      >
                        <MenuItem value="">Select Manufacturer</MenuItem>
                        {manufacturers.map((m: any) => (
                          <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : (
                    <ReadOnlyField>{editingDevice?.manufacturer_name}</ReadOnlyField>
                  )}
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Device Name *</Typography>
                  {isCixciAdmin ? (
                    <TextField
                      size="small"
                      fullWidth
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                    />
                  ) : (
                    <ReadOnlyField>{editingDevice?.name}</ReadOnlyField>
                  )}
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Device Type *</Typography>
                  {isCixciAdmin ? (
                    <FormControl size="small" fullWidth>
                      <Select
                        value={editDeviceType}
                        onChange={e => setEditDeviceType(e.target.value)}
                        displayEmpty
                      >
                        <MenuItem value="">Select Device Type</MenuItem>
                        {deviceTypes.map((t: any) => (
                          <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : (
                    <ReadOnlyField>{editingDevice?.device_type_name}</ReadOnlyField>
                  )}
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Launch Date</Typography>
                  {isCixciAdmin ? (
                    <TextField
                      size="small"
                      fullWidth
                      type="date"
                      value={editLaunchDate}
                      onChange={e => setEditLaunchDate(e.target.value)}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  ) : (
                    <ReadOnlyField>
                      {editingDevice?.launch_date ? (
                        editingDevice.launch_date.match(/^\d{4}-\d{2}-\d{2}$/)
                          ? editingDevice.launch_date.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$2-$3-$1')
                          : editingDevice.launch_date
                      ) : 'N/A'}
                    </ReadOnlyField>
                  )}
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Lifecycle Status</Typography>
                  {isCixciAdmin ? (
                    <FormControl size="small" fullWidth>
                      <Select
                        value={editStatus}
                        onChange={e => setEditStatus(e.target.value)}
                      >
                        <MenuItem value="available">Available</MenuItem>
                        <MenuItem value="launching">Launching</MenuItem>
                        <MenuItem value="inactive">Inactive</MenuItem>
                        <MenuItem value="eol">EOL</MenuItem>
                      </Select>
                    </FormControl>
                  ) : (
                    <ReadOnlyField>
                      {(() => {
                        const display = getDisplayStatus(editingDevice?.lifecycle_status, editingDevice?.launch_date)
                        return display === 'eol' ? 'EOL' : display
                      })()}
                    </ReadOnlyField>
                  )}
                </Box>

                {/* Extra identity fields for buyer view */}
                {!isCixciAdmin && (
                  <>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>SKU</Typography>
                      <ReadOnlyField>{editingDevice?.sku || 'N/A'}</ReadOnlyField>
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Model Number</Typography>
                      <ReadOnlyField>{editingDevice?.model_number || 'N/A'}</ReadOnlyField>
                    </Box>
                    {editingDevice?.announced_date && (
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Announced Date</Typography>
                        <ReadOnlyField>{editingDevice.announced_date}</ReadOnlyField>
                      </Box>
                    )}
                    {editingDevice?.release_date && (
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Release Date</Typography>
                        <ReadOnlyField>{editingDevice.release_date}</ReadOnlyField>
                      </Box>
                    )}
                    {editingDevice?.eol_date && (
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>EOL Date</Typography>
                        <ReadOnlyField>{editingDevice.eol_date}</ReadOnlyField>
                      </Box>
                    )}
                  </>
                )}

                {isCixciAdmin && selectedEditCategory && (
                  <Box sx={{ gridColumn: 'span 2' }}>
                    <Divider sx={{ my: 1 }} />
                  </Box>
                )}

                {/* Conditional Compatibility Fields - admin only in details tab */}
                {isCixciAdmin && (selectedEditCategory === 'phone' || selectedEditCategory === 'tablet' || selectedEditCategory === 'laptop') && (
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Charging Interface *</Typography>
                    <FormControl size="small" fullWidth>
                      <Select
                        value={editCharging}
                        onChange={e => setEditCharging(e.target.value)}
                        displayEmpty
                      >
                        <MenuItem value="">Select Charging Interface</MenuItem>
                        <MenuItem value="Type-C">Type-C</MenuItem>
                        {selectedEditCategory !== 'laptop' && <MenuItem value="Lightning">Lightning</MenuItem>}
                        <MenuItem value="Not Compatible">Not Compatible</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                )}

                {isCixciAdmin && (selectedEditCategory === 'phone' || selectedEditCategory === 'tablet') && (
                  <>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Storage Expansion *</Typography>
                      <FormControl size="small" fullWidth>
                        <Select
                          value={editStorage}
                          onChange={e => handleEditStorageChange(e.target.value)}
                          displayEmpty
                        >
                          <MenuItem value="">Select Storage Expansion</MenuItem>
                          <MenuItem value="Not Compatible">Not Compatible</MenuItem>
                          <MenuItem value="microSDXC">microSDXC</MenuItem>
                          <MenuItem value="microSDHC">microSDHC</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>

                    {(editStorage === 'microSDXC' || editStorage === 'microSDHC') && (
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Maximum Expansion *</Typography>
                        <FormControl size="small" fullWidth>
                          <Select
                            value={editMaxStorage}
                            onChange={e => setEditMaxStorage(e.target.value)}
                          >
                            {editStorage === 'microSDXC' ? (
                              ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB'].map(v => (
                                <MenuItem key={v} value={v}>{v}</MenuItem>
                              ))
                            ) : (
                              ['16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '1.5TB'].map(v => (
                                <MenuItem key={v} value={v}>{v}</MenuItem>
                              ))
                            )}
                          </Select>
                        </FormControl>
                      </Box>
                    )}
                  </>
                )}

                {isCixciAdmin && (selectedEditCategory === 'phone' || selectedEditCategory === 'tablet' || selectedEditCategory === 'laptop') && (
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Headphone Jack *</Typography>
                    <FormControl size="small" fullWidth>
                      <Select
                        value={editHeadphone}
                        onChange={e => setEditHeadphone(e.target.value)}
                        displayEmpty
                      >
                        <MenuItem value="">Select Headphone Jack</MenuItem>
                        <MenuItem value="Not Compatible">Not Compatible</MenuItem>
                        <MenuItem value="Type-C">Type-C</MenuItem>
                        {selectedEditCategory !== 'laptop' && <MenuItem value="Lightning">Lightning</MenuItem>}
                      </Select>
                    </FormControl>
                  </Box>
                )}

                {isCixciAdmin && selectedEditCategory && (
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Bluetooth Compatibility *</Typography>
                    <FormControl size="small" fullWidth>
                      <Select
                        value={editBluetooth}
                        onChange={e => setEditBluetooth(e.target.value)}
                        displayEmpty
                      >
                        <MenuItem value="">Select Bluetooth Compatibility</MenuItem>
                        <MenuItem value="Yes">Yes</MenuItem>
                        <MenuItem value="No">No</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                )}

                {isCixciAdmin && (selectedEditCategory === 'phone' || selectedEditCategory === 'smartwatch') && (
                  <Box sx={{ gridColumn: 'span 2' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Wireless Charging Compatibility *</Typography>
                    <WirelessCheckboxGroup wireless={editWireless} onChange={handleEditWirelessChange} />
                  </Box>
                )}

                {isCixciAdmin && selectedEditCategory === 'smartwatch' && (
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Watch Case Size *</Typography>
                    <FormControl size="small" fullWidth>
                      <Select
                        value={editWatchCase}
                        onChange={e => setEditWatchCase(e.target.value)}
                        displayEmpty
                      >
                        <MenuItem value="">Select Watch Case Size</MenuItem>
                        <MenuItem value="Not Compatible">Not Compatible</MenuItem>
                        {['40mm', '41mm', '42mm', '44mm', '45mm', '46mm', '49mm'].map(v => (
                          <MenuItem key={v} value={v}>{v}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setEditingDevice(null)}>
                Close
              </Button>
              {isCixciAdmin && (
                <Button type="submit" variant="contained" disabled={isSubmittingEdit}>
                  {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
                </Button>
              )}
            </DialogActions>
          </form>
        ) : editTab === 'compatibility' ? (
          <>
            <DialogContent dividers>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Hardware compatibility specifications for this device.{' '}
                {!isCixciAdmin && <span>These fields are managed by CIXCI administrators.</span>}
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.75 }}>
                {(selectedEditCategory === 'phone' || selectedEditCategory === 'tablet' || selectedEditCategory === 'laptop') && (
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Charging Interface</Typography>
                    <ReadOnlyField>{editingDevice?.compatible_charging_interface || 'Not Compatible'}</ReadOnlyField>
                  </Box>
                )}

                {(selectedEditCategory === 'phone' || selectedEditCategory === 'tablet') && (
                  <>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Storage Expansion</Typography>
                      <ReadOnlyField>{editingDevice?.storage_expansion_compatibility || 'Not Compatible'}</ReadOnlyField>
                    </Box>
                    {editingDevice?.storage_expansion_compatibility && editingDevice.storage_expansion_compatibility !== 'Not Compatible' && (
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Maximum Supported Storage</Typography>
                        <ReadOnlyField>{editingDevice?.maximum_supported_storage || 'Not Compatible'}</ReadOnlyField>
                      </Box>
                    )}
                  </>
                )}

                {(selectedEditCategory === 'phone' || selectedEditCategory === 'tablet' || selectedEditCategory === 'laptop') && (
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Headphone Jack</Typography>
                    <ReadOnlyField>{editingDevice?.headphone_jack_compatibility || 'Not Compatible'}</ReadOnlyField>
                  </Box>
                )}

                {selectedEditCategory && (
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Bluetooth Compatibility</Typography>
                    <ReadOnlyField>{editingDevice?.bluetooth_compatibility || 'N/A'}</ReadOnlyField>
                  </Box>
                )}

                {(selectedEditCategory === 'phone' || selectedEditCategory === 'smartwatch') && (
                  <Box sx={{ gridColumn: 'span 2' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Wireless Charging Compatibility</Typography>
                    <ReadOnlyField>{parseWirelessCharging(editingDevice?.wireless_charging_compatibility).join(', ') || 'Not Compatible'}</ReadOnlyField>
                  </Box>
                )}

                {selectedEditCategory === 'smartwatch' && (
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Watch Case Size</Typography>
                    <ReadOnlyField>{editingDevice?.compatible_watch_case_size || 'Not Compatible'}</ReadOnlyField>
                  </Box>
                )}

                {!selectedEditCategory && (
                  <Box sx={{ gridColumn: 'span 2', py: 3, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      No compatibility data available for this device type.
                    </Typography>
                  </Box>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setEditingDevice(null)}>
                Close
              </Button>
            </DialogActions>
          </>
        ) : editTab === 'products' ? (
          <>
            <DialogContent dividers>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Compatible Products &mdash; {editingDevice?.manufacturer_name || editingDevice?.manufacturer} {editingDevice?.name}
                  </Typography>
                  <StatusChip
                    status={editingDevice?.lifecycle_status || 'unknown'}
                    label={`Device Status: ${editingDevice?.lifecycle_status === 'eol' ? 'EOL' : editingDevice?.lifecycle_status}`}
                  />
                </Box>

                {/* Summary Cards */}
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.5 }}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>{stats.total}</Typography>
                      <Typography variant="caption" color="text.secondary">Total Compatible</Typography>
                    </CardContent>
                  </Card>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>{stats.active}</Typography>
                      <Typography variant="caption" color="text.secondary">Active</Typography>
                    </CardContent>
                  </Card>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.disabled' }}>{stats.inactive}</Typography>
                      <Typography variant="caption" color="text.secondary">Inactive</Typography>
                    </CardContent>
                  </Card>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: 'error.main' }}>{stats.eol + stats.outOfStock + stats.other}</Typography>
                      <Typography variant="caption" color="text.secondary">EOL / OOS / Other</Typography>
                    </CardContent>
                  </Card>
                </Box>

                {/* Search and Filters */}
                <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>
                  <SearchBar
                    placeholder="Search name, SKU, UPC..."
                    value={compProdSearch}
                    onChange={e => setCompProdSearch(e.target.value)}
                    sx={{ flex: '1 1 200px' }}
                  />
                  <FormControl size="small" sx={{ flex: '1 1 120px' }}>
                    <Select
                      value={compProdVendor}
                      onChange={e => setCompProdVendor(e.target.value)}
                      displayEmpty
                    >
                      <MenuItem value="">All Vendors</MenuItem>
                      {vendors.map(v => (
                        <MenuItem key={v.id} value={v.id}>{v.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ flex: '1 1 120px' }}>
                    <Select
                      value={compProdCategory}
                      onChange={e => setCompProdCategory(e.target.value)}
                      displayEmpty
                    >
                      <MenuItem value="">All Categories</MenuItem>
                      {categories.map((c: string) => (
                        <MenuItem key={c} value={c}>{c}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ flex: '1 1 120px' }}>
                    <Select
                      value={compProdStatus}
                      onChange={e => setCompProdStatus(e.target.value)}
                      displayEmpty
                    >
                      <MenuItem value="">All Statuses</MenuItem>
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="inactive">Inactive</MenuItem>
                      <MenuItem value="draft">Draft</MenuItem>
                      <MenuItem value="pending_review">Pending Review</MenuItem>
                      <MenuItem value="archived">Archived</MenuItem>
                      <MenuItem value="eol">EOL</MenuItem>
                      <MenuItem value="out_of_stock">Out of Stock</MenuItem>
                    </Select>
                  </FormControl>
                  {(compProdSearch || compProdVendor || compProdCategory || compProdStatus) && (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        setCompProdSearch('')
                        setCompProdVendor('')
                        setCompProdCategory('')
                        setCompProdStatus('')
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </Box>

                {/* Table */}
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 350 }}>
                  {isLoadingCompProducts ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">Loading compatible products...</Typography>
                    </Box>
                  ) : compProducts.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        No compatible products are currently mapped to this device.
                      </Typography>
                    </Box>
                  ) : filteredCompProducts.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        No compatible products found matching your filters.
                      </Typography>
                    </Box>
                  ) : (
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Vendor</TableCell>
                          <TableCell>Image</TableCell>
                          <TableCell>Product Name</TableCell>
                          <TableCell>SKU</TableCell>
                          <TableCell>UPC</TableCell>
                          <TableCell>Category</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="center">Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredCompProducts.map((p: any) => (
                          <TableRow key={p.id} hover>
                            <TableCell sx={{ fontSize: '0.75rem' }}>{p.vendor_name || '\u2014'}</TableCell>
                            <TableCell>
                              {p.primary_image_url ? (
                                <Box
                                  component="img"
                                  src={p.primary_image_url}
                                  alt={p.name}
                                  sx={{
                                    width: 28,
                                    height: 28,
                                    objectFit: 'contain',
                                    borderRadius: 0.5,
                                    bgcolor: '#fff',
                                    border: 1,
                                    borderColor: 'divider',
                                  }}
                                />
                              ) : (
                                <Box
                                  sx={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 0.5,
                                    bgcolor: 'action.hover',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: 1,
                                    borderColor: 'divider',
                                  }}
                                >
                                  <SmartphoneIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                                </Box>
                              )}
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.75rem', fontWeight: 500 }}>{p.name}</TableCell>
                            <TableCell sx={{ fontFamily: MONO_FONT, fontSize: '0.6875rem' }}>{p.sku}</TableCell>
                            <TableCell sx={{ fontFamily: MONO_FONT, fontSize: '0.6875rem' }}>{p.upc || '\u2014'}</TableCell>
                            <TableCell sx={{ fontSize: '0.6875rem' }}>{p.product_category || '\u2014'}</TableCell>
                            <TableCell>
                              <StatusChip status={p.status || 'unknown'} />
                            </TableCell>
                            <TableCell align="center">
                              <Button
                                size="small"
                                sx={{ fontSize: '0.6875rem', py: 0.25, px: 1, minHeight: 0 }}
                                onClick={() => {
                                  navigate(`/catalog?tab=all-products&all_search=${encodeURIComponent(p.sku || p.name)}`)
                                }}
                              >
                                View Product
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TableContainer>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setEditingDevice(null)}>
                Close
              </Button>
            </DialogActions>
          </>
        ) : (
          <>
            <DialogContent dividers>
              <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                {!auditHistory || auditHistory.length === 0 ? (
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      No audit history records found for this device.
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {auditHistory.map((record: any) => (
                      <Paper
                        key={record.id}
                        variant="outlined"
                        sx={{ p: 1.5 }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                          <Chip
                            label={record.event_code}
                            color="info"
                            size="small"
                            variant="filled"
                            sx={{ fontSize: '0.6875rem', textTransform: 'none' }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(record.created_at)}
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {record.description}
                        </Typography>
                        {record.actor_id && (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            Actor ID: {record.actor_id}
                          </Typography>
                        )}
                      </Paper>
                    ))}
                  </Box>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setEditingDevice(null)}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Shared ConfirmDialog for delete actions */}
      <ConfirmDialog {...dialogProps} />
    </Box>
  )
}
