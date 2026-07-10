import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Smartphone, ChevronRight, Check, Trash2, X, AlertCircle, Download, Settings } from 'lucide-react'
import api from '../lib/apiClient'
import { useAuthStore } from '../stores/authStore'

const LC_COLORS: Record<string, string> = {
  available: 'badge-green',
  inactive: 'badge-muted',
  archived: 'badge-amber',
  launching: 'badge-amber',
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const year = date.getFullYear()
  return `${month}-${day}-${year}`
}

const modalStyles = `
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(10, 13, 20, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease-out;
}
.modal-container {
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  width: 550px;
  max-width: 95vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.25s ease-out;
  display: flex;
  flex-direction: column;
}
.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.modal-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}
.modal-body {
  padding: 20px;
  overflow-y: auto;
}
.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.form-grid-full {
  grid-column: span 2;
}
.validation-errors-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  margin-top: 10px;
}
.validation-errors-table th, .validation-errors-table td {
  padding: 8px;
  border: 1px solid var(--border);
}
.validation-errors-table th {
  background: var(--bg-elevated);
  text-align: left;
}
.validation-errors-table tr:hover td {
  background: var(--bg-elevated);
}
.checkbox-group {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  padding: 10px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
.checkbox-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
}
.input-read-only {
  padding: 8px 12px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 13px;
  min-height: 38px;
  display: flex;
  align-items: center;
}
`

export default function DevicesPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isBuyer = user?.company_type === 'buyer'
  const isCixciAdmin = user?.is_cixci_admin || user?.company_type === 'cixci_internal'

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
      setTypeConfigSupportedCategories(editingTypeConfig.supported_accessory_categories || [])
      setTypeConfigRules(editingTypeConfig.compatibility_rules || {})
    }
  }, [editingTypeConfig])

  // Edit / Detail Modal state
  const [editingDevice, setEditingDevice] = useState<any>(null)
  const [editTab, setEditTab] = useState<'details' | 'compatibility' | 'audit'>('details')

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
  const { data: auditHistory, refetch: refetchAuditHistory } = useQuery({
    queryKey: ['device-audit', selectedDeviceIdForAudit],
    queryFn: () => api.get(`/devices/devices/${selectedDeviceIdForAudit}/audit_history/`).then(r => r.data),
    enabled: !!selectedDeviceIdForAudit,
  })

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

  const devices = data?.results ?? data ?? []
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
    } catch (err) {
      alert('Failed to add device to portfolio.')
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
    } catch (err) {
      alert('Failed to remove device from portfolio.')
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
      const data = err.response?.data
      let msg = 'Failed to add value.'
      if (data) {
        if (typeof data === 'string') {
          msg = data
        } else if (data.error) {
          msg = data.error
        } else if (data.detail) {
          msg = data.detail
        } else {
          const errors = Object.entries(data).map(([field, msgs]) => {
            const fieldName = field.charAt(0).toUpperCase() + field.slice(1)
            const fieldMsgs = Array.isArray(msgs) ? msgs.join(' ') : String(msgs)
            return `${fieldName}: ${fieldMsgs}`
          })
          if (errors.length > 0) {
            msg = errors.join('; ')
          }
        }
      }
      setDropdownError(msg)
    }
  }

  const handleDeleteDropdownValue = async (id: string) => {
    setDropdownError(null)
    try {
      if (manageField === 'manufacturer') {
        await api.delete(`/devices/manufacturers/${id}/`)
        refetchManufacturers()
      } else {
        await api.delete(`/devices/types/${id}/`)
        refetchTypes()
      }
    } catch (err: any) {
      const data = err.response?.data
      let msg = 'Failed to delete value.'
      if (data) {
        if (typeof data === 'string') {
          msg = data
        } else if (data.error) {
          msg = data.error
        } else if (data.detail) {
          msg = data.detail
        }
      }
      setDropdownError(msg)
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
      setDropdownError(err.response?.data?.error || err.response?.data?.detail || 'Failed to save configuration.')
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
    setEditWireless(d.wireless_charging_compatibility ? d.wireless_charging_compatibility.split('+') : [])
    setEditWatchCase(d.compatible_watch_case_size || 'Not Compatible')
    setEditError('')
    setSelectedDeviceIdForAudit(d.id)
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

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: modalStyles }} />
      <div className="page-header">
        <div>
          <div className="page-title">Device Catalog</div>
          <div className="page-sub">All devices, features, and buyer portfolios</div>
        </div>
        {isCixciAdmin && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => setShowDropdownModal(true)}>
              Manage Dropdown Values
            </button>
            <button className="btn btn-secondary" onClick={() => { resetImportState(); setShowImportModal(true); }}>
              Import Devices
            </button>
            <button className="btn btn-primary" onClick={() => { resetAddState(); setShowAddModal(true); }}>
              <Plus size={14} /> Add Device
            </button>
          </div>
        )}
      </div>

      <div className="tabs">
        <div className={`tab ${tab === 'devices' ? 'active' : ''}`} onClick={() => setTab('devices')}>All Devices</div>
        {isBuyer && (
          <div className={`tab ${tab === 'portfolio' ? 'active' : ''}`} onClick={() => setTab('portfolio')}>My Portfolio</div>
        )}
      </div>

      {tab === 'devices' && (
        <>
          <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="search-bar" style={{ width: 280, margin: 0 }}>
              <Search size={14} />
              <input
                placeholder="Search by name, SKU, model…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <select
              className="input"
              style={{ width: 180, height: 36, padding: '0 10px', fontSize: 13 }}
              value={filterManufacturer}
              onChange={e => setFilterManufacturer(e.target.value)}
            >
              <option value="">All Manufacturers</option>
              {manufacturers.map((m: any) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>

            <select
              className="input"
              style={{ width: 180, height: 36, padding: '0 10px', fontSize: 13 }}
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="">All Device Types</option>
              {deviceTypes.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            <select
              className="input"
              style={{ width: 150, height: 36, padding: '0 10px', fontSize: 13 }}
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="available">Available</option>
              <option value="launching">Launching</option>
              {!isBuyer && (
                <>
                  <option value="inactive">Inactive</option>
                  <option value="eol">EOL</option>
                </>
              )}
            </select>

            {(search || filterManufacturer || filterType || filterStatus) && (
              <button
                className="btn btn-secondary btn-sm"
                style={{ height: 36, fontSize: 13 }}
                onClick={() => {
                  setSearch('')
                  setFilterManufacturer('')
                  setFilterType('')
                  setFilterStatus('')
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
          <div className="table-wrap">
            {isLoading ? (
              <div className="loading-overlay"><div className="spinner" /> Loading devices…</div>
            ) : devices.length === 0 ? (
              <div className="empty-state">
                <Smartphone size={40} />
                <div>No devices found</div>
                <div style={{ fontSize: 12 }}>Import devices via CSV to get started</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Name</th><th>Manufacturer</th><th>Type</th>
                    <th>Status</th>
                    {isBuyer && <th>Action</th>}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((d: any) => {
                    const inPortfolio = portfolioDeviceIds.has(d.id)
                    return (
                      <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => handleRowClick(d)}>
                        <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{d.name}</td>
                        <td>{d.manufacturer_name ?? d.manufacturer}</td>
                        <td>{d.device_type_name ?? d.device_type}</td>
                        <td>
                          {(() => {
                            const isLaunching = d.lifecycle_status === 'inactive' && d.launch_date && new Date(d.launch_date) > new Date();
                            const displayStatus = isLaunching ? 'launching' : d.lifecycle_status;
                            return (
                              <span className={`badge ${LC_COLORS[displayStatus] ?? 'badge-muted'}`}>
                                {displayStatus}
                              </span>
                            );
                          })()}
                        </td>
                        {isBuyer && (
                          <td onClick={e => e.stopPropagation()}>
                            {inPortfolio ? (
                              <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Check size={11} /> In Portfolio
                              </span>
                            ) : (
                              <button className="btn btn-secondary btn-sm" style={{ padding: '3px 8px' }} onClick={() => handleAdd(d.id)}>
                                Add to Portfolio
                              </button>
                            )}
                          </td>
                        )}
                        <td><ChevronRight size={14} style={{ color: 'var(--text-muted)' }} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {tab === 'portfolio' && isBuyer && (
        <>
          <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="search-bar" style={{ width: 280, margin: 0 }}>
              <Search size={14} />
              <input
                placeholder="Search by name, SKU, model…"
                value={portfolioSearch}
                onChange={e => setPortfolioSearch(e.target.value)}
              />
            </div>

            <select
              className="input"
              style={{ width: 180, height: 36, padding: '0 10px', fontSize: 13 }}
              value={portfolioMfg}
              onChange={e => setPortfolioMfg(e.target.value)}
            >
              <option value="">All Manufacturers</option>
              {manufacturers.map((m: any) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>

            <select
              className="input"
              style={{ width: 180, height: 36, padding: '0 10px', fontSize: 13 }}
              value={portfolioType}
              onChange={e => setPortfolioType(e.target.value)}
            >
              <option value="">All Device Types</option>
              {deviceTypes.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="table-wrap">
            {(portfolio ?? []).length === 0 ? (
              <div className="empty-state">
                <Smartphone size={40} />
                <div>Your portfolio is empty</div>
                <div style={{ fontSize: 12 }}>Add devices from the All Devices tab</div>
              </div>
            ) : filteredMyDevices.length === 0 ? (
              <div className="empty-state">
                <Smartphone size={40} />
                <div>No matching devices found</div>
                <div style={{ fontSize: 12 }}>Try clearing or adjusting your search filters</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Device</th>
                    <th>Manufacturer</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Added</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMyDevices.map((ref: any) => (
                    <tr key={ref.id}>
                      <td 
                        style={{ 
                          color: 'var(--accent)', 
                          fontWeight: 500, 
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          textDecorationColor: 'var(--accent)',
                          textUnderlineOffset: '2px'
                        }}
                        onClick={() => handlePortfolioDeviceClick(ref)}
                        title="View device details"
                      >
                        {ref.device_name}
                      </td>
                      <td>{ref.device_manufacturer}</td>
                      <td>{ref.device_type ?? '—'}</td>
                      <td>
                        {(() => {
                          const isLaunching = ref.device_status === 'inactive' && ref.device_launch_date && new Date(ref.device_launch_date) > new Date();
                          const displayStatus = isLaunching ? 'launching' : ref.device_status;
                          return (
                            <span className={`badge ${LC_COLORS[displayStatus] ?? 'badge-muted'}`}>
                              {displayStatus || 'available'}
                            </span>
                          );
                        })()}
                      </td>
                      <td style={{ fontSize: 12 }}>{formatDate(ref.created_at)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          {ref.active_flag ? (
                            <button className="btn btn-danger btn-sm" onClick={() => handleRemoveClick(ref.device, ref.device_name)}>
                              <Trash2 size={12} /> Remove
                            </button>
                          ) : (
                            <button className="btn btn-secondary btn-sm" onClick={() => handleAdd(ref.device)}>
                              Add back
                            </button>
                          )}
                          {ref.active_flag && ref.has_accessories && (
                            <button 
                              className="btn btn-primary btn-sm" 
                              onClick={() => navigate(`/catalog?device=${ref.device}`)}
                            >
                              View Accessories
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Remove Confirmation Modal */}
      {confirmRemoveId && (
        <div className="modal-overlay" onClick={() => { setConfirmRemoveId(null); setConfirmRemoveName(''); }}>
          <div className="modal-container" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Confirm Removal</div>
              <button className="btn btn-ghost btn-sm" onClick={() => { setConfirmRemoveId(null); setConfirmRemoveName(''); }}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <AlertCircle size={40} style={{ color: 'var(--red)', marginBottom: 12 }} />
                <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 8 }}>
                  Are you sure you want to remove this device from your My Portfolio?
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {confirmRemoveName && <><strong>{confirmRemoveName}</strong> will be removed from your portfolio.</>}
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center', gap: 12 }}>
              <button className="btn btn-secondary" onClick={() => { setConfirmRemoveId(null); setConfirmRemoveName(''); }}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleConfirmRemove}>
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Add New Device</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAddModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmitDevice}>
              <div className="modal-body">
                {addError && (
                  <div className="auth-error" style={{ whiteSpace: 'pre-wrap', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <div>{addError}</div>
                  </div>
                )}
                <div className="form-grid">
                  <div className="form-group">
                    <label className="label">Manufacturer *</label>
                    <select
                      className="input"
                      value={addManufacturer}
                      onChange={e => setAddManufacturer(e.target.value)}
                    >
                      <option value="">Select Manufacturer</option>
                      {activeManufacturers.map((m: any) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label">Device Name *</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. iPhone 16 Pro"
                      value={addName}
                      onChange={e => setAddName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Device Type *</label>
                    <select
                      className="input"
                      value={addDeviceType}
                      onChange={e => setAddDeviceType(e.target.value)}
                    >
                      <option value="">Select Device Type</option>
                      {activeDeviceTypes.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label">Launch Date *</label>
                    <input
                      type="date"
                      className="input"
                      value={addLaunchDate}
                      onChange={e => setAddLaunchDate(e.target.value)}
                    />
                  </div>

                  {selectedCategory && <div className="divider form-grid-full" style={{ margin: '8px 0' }} />}

                  {/* Phone / Tablet fields */}
                  {(selectedCategory === 'phone' || selectedCategory === 'tablet' || selectedCategory === 'laptop') && (
                    <div className="form-group">
                      <label className="label">Charging Interface *</label>
                      <select
                        className="input"
                        value={addCharging}
                        onChange={e => setAddCharging(e.target.value)}
                      >
                        <option value="">Select Charging Interface</option>
                        <option value="Type-C">Type-C</option>
                        {selectedCategory !== 'laptop' && <option value="Lightning">Lightning</option>}
                        <option value="Not Compatible">Not Compatible</option>
                      </select>
                    </div>
                  )}

                  {(selectedCategory === 'phone' || selectedCategory === 'tablet') && (
                    <>
                      <div className="form-group">
                        <label className="label">Storage Expansion *</label>
                        <select
                          className="input"
                          value={addStorage}
                          onChange={e => handleStorageChange(e.target.value)}
                        >
                          <option value="">Select Storage Expansion</option>
                          <option value="Not Compatible">Not Compatible</option>
                          <option value="microSDXC">microSDXC</option>
                          <option value="microSDHC">microSDHC</option>
                        </select>
                      </div>

                      {(addStorage === 'microSDXC' || addStorage === 'microSDHC') && (
                        <div className="form-group">
                          <label className="label">Maximum Expansion *</label>
                          <select
                            className="input"
                            value={addMaxStorage}
                            onChange={e => setAddMaxStorage(e.target.value)}
                          >
                            {addStorage === 'microSDXC' ? (
                              <>
                                <option value="32GB">32GB</option>
                                <option value="64GB">64GB</option>
                                <option value="128GB">128GB</option>
                                <option value="256GB">256GB</option>
                                <option value="512GB">512GB</option>
                                <option value="1TB">1TB</option>
                                <option value="2TB">2TB</option>
                              </>
                            ) : (
                              <>
                                <option value="16GB">16GB</option>
                                <option value="32GB">32GB</option>
                                <option value="64GB">64GB</option>
                                <option value="128GB">128GB</option>
                                <option value="256GB">256GB</option>
                                <option value="512GB">512GB</option>
                                <option value="1TB">1TB</option>
                                <option value="1.5TB">1.5TB</option>
                              </>
                            )}
                          </select>
                        </div>
                      )}
                    </>
                  )}

                  {(selectedCategory === 'phone' || selectedCategory === 'tablet' || selectedCategory === 'laptop') && (
                    <div className="form-group">
                      <label className="label">Headphone Jack *</label>
                      <select
                        className="input"
                        value={addHeadphone}
                        onChange={e => setAddHeadphone(e.target.value)}
                      >
                        <option value="">Select Headphone Jack</option>
                        <option value="Not Compatible">Not Compatible</option>
                        <option value="Type-C">Type-C</option>
                        {selectedCategory !== 'laptop' && <option value="Lightning">Lightning</option>}
                      </select>
                    </div>
                  )}

                  {/* Bluetooth (all categories) */}
                  {selectedCategory && (
                    <div className="form-group">
                      <label className="label">Bluetooth Compatibility *</label>
                      <select
                        className="input"
                        value={addBluetooth}
                        onChange={e => setAddBluetooth(e.target.value)}
                      >
                        <option value="">Select Bluetooth Compatibility</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                  )}

                  {/* Wireless Charging (Phone / Smartwatch) */}
                  {(selectedCategory === 'phone' || selectedCategory === 'smartwatch') && (
                    <div className="form-group form-grid-full">
                      <label className="label">Wireless Charging Compatibility *</label>
                      <div className="checkbox-group">
                        <label className="checkbox-item">
                          <input
                            type="checkbox"
                            checked={addWireless.includes('MagSafe')}
                            disabled={addWireless.includes('Not Compatible') || addWireless.includes('Qi')}
                            onChange={() => handleWirelessChange('MagSafe')}
                          />
                          MagSafe
                        </label>
                        <label className="checkbox-item">
                          <input
                            type="checkbox"
                            checked={addWireless.includes('Qi2')}
                            disabled={addWireless.includes('Not Compatible') || addWireless.includes('Qi')}
                            onChange={() => handleWirelessChange('Qi2')}
                          />
                          Qi2
                        </label>
                        <label className="checkbox-item">
                          <input
                            type="checkbox"
                            checked={addWireless.includes('Qi')}
                            disabled={addWireless.includes('Not Compatible') || addWireless.includes('MagSafe') || addWireless.includes('Qi2')}
                            onChange={() => handleWirelessChange('Qi')}
                          />
                          Qi
                        </label>
                        <label className="checkbox-item">
                          <input
                            type="checkbox"
                            checked={addWireless.includes('Not Compatible')}
                            onChange={() => handleWirelessChange('Not Compatible')}
                          />
                          Not Compatible
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Watch Case Size (Smartwatch) */}
                  {selectedCategory === 'smartwatch' && (
                    <div className="form-group">
                      <label className="label">Watch Case Size *</label>
                      <select
                        className="input"
                        value={addWatchCase}
                        onChange={e => setAddWatchCase(e.target.value)}
                      >
                        <option value="">Select Watch Case Size</option>
                        <option value="Not Compatible">Not Compatible</option>
                        <option value="40mm">40mm</option>
                        <option value="41mm">41mm</option>
                        <option value="42mm">42mm</option>
                        <option value="44mm">44mm</option>
                        <option value="45mm">45mm</option>
                        <option value="46mm">46mm</option>
                        <option value="49mm">49mm</option>
                      </select>
                    </div>
                  )}

                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Add Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => { setShowImportModal(false); resetImportState(); }}>
          <div className="modal-container" style={{ width: 620 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Import Devices</div>
              <button className="btn btn-ghost btn-sm" onClick={() => { setShowImportModal(false); resetImportState(); }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleImportSubmit}>
              <div className="modal-body">
                {importErrorGeneral && (
                  <div className="auth-error" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <div>{importErrorGeneral}</div>
                  </div>
                )}
                {importSuccess && (
                  <div className="badge badge-green" style={{ display: 'flex', width: '100%', padding: 12, marginBottom: 16, fontSize: 13, gap: 6, borderRadius: 'var(--radius-sm)' }}>
                    <Check size={16} />
                    <div>{importSuccess}</div>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label className="label" style={{ margin: 0 }}>Device CSV Template</label>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleDownloadTemplate}
                      style={{ padding: '4px 8px' }}
                    >
                      <Download size={12} /> Download Template
                    </button>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Download the standard Device CSV Import template to ensure proper columns and validation alignment.
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="label">Import Mode *</label>
                    <select
                      className="input"
                      value={importMode}
                      onChange={e => setImportMode(e.target.value)}
                    >
                      <option value="Create New Only">Create New Only</option>
                      <option value="Update Existing">Update Existing</option>
                      <option value="Upsert">Upsert (Create & Update)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="label">Select CSV File *</label>
                    <input
                      type="file"
                      accept=".csv"
                      key={importFile ? 'has-file' : 'no-file'}
                      className="input"
                      style={{ padding: '6px 10px' }}
                      onChange={e => setImportFile(e.target.files?.[0] || null)}
                    />
                  </div>
                </div>

                {importErrors.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)', marginBottom: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
                      <AlertCircle size={14} />
                      Import Validation Failed ({importErrors.length} Errors Found)
                    </div>
                    <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                      <table className="validation-errors-table">
                        <thead>
                          <tr>
                            <th style={{ width: 50 }}>Row</th>
                            <th style={{ width: 140 }}>Column</th>
                            <th style={{ width: 130 }}>Submitted Value</th>
                            <th>Error Message</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importErrors.map((err, i) => (
                            <tr key={i}>
                              <td style={{ fontWeight: 600 }}>{err.row}</td>
                              <td style={{ color: 'var(--text-primary)' }}>{err.column}</td>
                              <td className="mono" style={{ fontSize: 11 }}>{err.submitted_value || <span style={{ color: 'var(--text-muted)' }}>[empty]</span>}</td>
                              <td style={{ color: 'var(--red)' }}>{err.error_message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setShowImportModal(false); resetImportState(); }}
                  disabled={isImporting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isImporting || !importFile}
                >
                  {isImporting ? 'Importing...' : 'Start Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dropdown Manager Modal */}
      {showDropdownModal && (
        <div className="modal-overlay" onClick={() => { setShowDropdownModal(false); setEditingTypeConfig(null); }}>
          <div className="modal-container" style={{ width: editingTypeConfig ? 520 : 480, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                {editingTypeConfig ? 'Configure Device Type Rules' : 'Manage Dropdown Values'}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => { setShowDropdownModal(false); setEditingTypeConfig(null); }}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: 1 }}>
              {dropdownError && (
                <div className="auth-error" style={{ display: 'flex', gap: 8, alignItems: 'center', margin: 0 }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <div>{dropdownError}</div>
                </div>
              )}

              {editingTypeConfig ? (
                <form onSubmit={handleSaveTypeConfig} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Configuring Rules for: <span style={{ color: 'var(--primary)' }}>{editingTypeConfig.name}</span>
                  </div>

                  <div className="form-group">
                    <label className="label" style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Status</label>
                    <select
                      className="input"
                      value={typeConfigStatus}
                      onChange={e => setTypeConfigStatus(e.target.value)}
                    >
                      <option value="active">Active</option>
                      <option value="setup_required">Setup Required</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      id="auto_mapping_eligible"
                      checked={typeConfigAutoMappingEligible}
                      onChange={e => setTypeConfigAutoMappingEligible(e.target.checked)}
                    />
                    <label htmlFor="auto_mapping_eligible" style={{ fontSize: 13, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                      Eligible for Auto-Mapping Remap
                    </label>
                  </div>

                  <div className="form-group">
                    <label className="label" style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Supported Accessory Categories</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                      {categories.map((cat: string) => {
                        const checked = typeConfigSupportedCategories.includes(cat)
                        return (
                          <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={e => {
                                if (e.target.checked) {
                                  setTypeConfigSupportedCategories([...typeConfigSupportedCategories, cat])
                                } else {
                                  setTypeConfigSupportedCategories(typeConfigSupportedCategories.filter(x => x !== cat))
                                }
                              }}
                            />
                            {cat}
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="label" style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Device Compatibility Rules</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
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
                          <div key={opt.value} style={{ display: 'flex', flexDirection: 'column', padding: 8, background: 'var(--bg-elevated)', borderRadius: 6, border: '1px solid var(--border-light)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 13, fontWeight: 555 }}>{opt.label}</span>
                              <select
                                style={{ padding: '2px 6px', fontSize: 12, borderRadius: 4, background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                                value={rule.mode}
                                onChange={e => {
                                  setTypeConfigRules({
                                    ...typeConfigRules,
                                    [opt.value]: { ...rule, mode: e.target.value }
                                  })
                                }}
                              >
                                <option value="hidden">Hidden</option>
                                <option value="required">Required</option>
                                <option value="optional">Optional</option>
                                <option value="defaulted">Defaulted</option>
                              </select>
                            </div>
                            {rule.mode === 'defaulted' && (
                              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Default Value:</span>
                                <input
                                  type="text"
                                  className="input"
                                  style={{ padding: '2px 6px', fontSize: 12, height: 26, flex: 1 }}
                                  value={rule.default || ''}
                                  onChange={e => {
                                    setTypeConfigRules({
                                      ...typeConfigRules,
                                      [opt.value]: { ...rule, default: e.target.value }
                                    })
                                  }}
                                  placeholder="Enter default value..."
                                />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-light)' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setEditingTypeConfig(null)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Save Rules
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="form-group">
                    <label className="label">Select Taxonomy Dropdown</label>
                    <select
                      className="input"
                      value={manageField}
                      onChange={e => {
                        setManageField(e.target.value as any)
                        setNewDropdownValue('')
                        setDropdownError(null)
                      }}
                    >
                      <option value="manufacturer">Device Manufacturer</option>
                      <option value="device_type">Device Type</option>
                    </select>
                  </div>

                  <form onSubmit={handleAddDropdownValue} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                    <input
                      type="text"
                      className="input"
                      placeholder={`Add new ${manageField === 'manufacturer' ? 'manufacturer' : 'device type'}…`}
                      value={newDropdownValue}
                      onChange={e => setNewDropdownValue(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button type="submit" className="btn btn-primary">
                      Add Value
                    </button>
                  </form>

                  <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-card)', maxHeight: '35vh' }}>
                    {(manageField === 'manufacturer' ? manufacturers : deviceTypes).length === 0 ? (
                      <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        No values configured.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {(manageField === 'manufacturer' ? manufacturers : deviceTypes).map((item: any) => (
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
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 555 }}>
                                {item.name}
                              </span>
                              {!item.is_active && (
                                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Inactive</span>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              {manageField === 'device_type' && (
                                <button
                                  type="button"
                                  className="btn btn-ghost"
                                  style={{ padding: 4, color: 'var(--primary)', background: 'transparent', border: 'none' }}
                                  onClick={() => setEditingTypeConfig(item)}
                                >
                                  <Settings size={14} />
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn btn-ghost"
                                style={{ padding: '2px 4px', fontSize: 11, color: 'var(--text-muted)' }}
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
                                    setDropdownError(err.response?.data?.error || err.response?.data?.detail || 'Failed to toggle status.')
                                  }
                                }}
                              >
                                {item.is_active ? 'Deactivate' : 'Activate'}
                              </button>
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

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, paddingTop: 12, borderTop: '1px solid var(--border-light)' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowDropdownModal(false)}>
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit / Detail Modal */}
      {editingDevice && (
        <div className="modal-overlay" onClick={() => setEditingDevice(null)}>
          <div className="modal-container" style={{ width: 620 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Device Details & History</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingDevice(null)}>
                <X size={16} />
              </button>
            </div>
            
            {/* Modal Tabs */}
            <div className="tabs" style={{ padding: '0 20px', borderBottom: '1px solid var(--border)' }}>
              <div className={`tab ${editTab === 'details' ? 'active' : ''}`} onClick={() => setEditTab('details')}>
                {isCixciAdmin ? 'Edit Details' : 'View Details'}
              </div>
              <div className={`tab ${editTab === 'compatibility' ? 'active' : ''}`} onClick={() => setEditTab('compatibility')}>
                Device Compatibility
              </div>
              <div className={`tab ${editTab === 'audit' ? 'active' : ''}`} onClick={() => setEditTab('audit')}>
                Audit History
              </div>
            </div>

            {editTab === 'details' ? (
              <form onSubmit={handleUpdateDevice}>
                <div className="modal-body">
                  {editError && (
                    <div className="auth-error" style={{ whiteSpace: 'pre-wrap', display: 'flex', gap: 8, alignItems: 'center' }}>
                      <AlertCircle size={16} style={{ flexShrink: 0 }} />
                      <div>{editError}</div>
                    </div>
                  )}
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="label">Manufacturer *</label>
                      {isCixciAdmin ? (
                        <select
                          className="input"
                          value={editManufacturer}
                          onChange={e => setEditManufacturer(e.target.value)}
                        >
                          <option value="">Select Manufacturer</option>
                          {manufacturers.map((m: any) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="input-read-only">{editingDevice.manufacturer_name}</div>
                      )}
                    </div>
                    <div className="form-group">
                      <label className="label">Device Name *</label>
                      {isCixciAdmin ? (
                        <input
                          type="text"
                          className="input"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                        />
                      ) : (
                        <div className="input-read-only">{editingDevice.name}</div>
                      )}
                    </div>
                    <div className="form-group">
                      <label className="label">Device Type *</label>
                      {isCixciAdmin ? (
                        <select
                          className="input"
                          value={editDeviceType}
                          onChange={e => setEditDeviceType(e.target.value)}
                        >
                          <option value="">Select Device Type</option>
                          {deviceTypes.map((t: any) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="input-read-only">{editingDevice.device_type_name}</div>
                      )}
                    </div>
                    <div className="form-group">
                      <label className="label">Launch Date</label>
                      {isCixciAdmin ? (
                        <input
                          type="date"
                          className="input"
                          value={editLaunchDate}
                          onChange={e => setEditLaunchDate(e.target.value)}
                        />
                      ) : (
                        <div className="input-read-only">
                          {editingDevice.launch_date ? (
                            editingDevice.launch_date.match(/^\d{4}-\d{2}-\d{2}$/) ? 
                            editingDevice.launch_date.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$2-$3-$1') : 
                            editingDevice.launch_date
                          ) : 'N/A'}
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="label">Lifecycle Status</label>
                      {isCixciAdmin ? (
                        <select
                          className="input"
                          value={editStatus}
                          onChange={e => setEditStatus(e.target.value)}
                        >
                          <option value="available">Available</option>
                          <option value="inactive">Inactive</option>
                          <option value="archived">Archived</option>
                        </select>
                      ) : (
                        <div className="input-read-only">
                          {(() => {
                            const isLaunching = editingDevice.lifecycle_status === 'inactive' && editingDevice.launch_date && new Date(editingDevice.launch_date) > new Date();
                            return isLaunching ? 'launching' : editingDevice.lifecycle_status;
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Extra identity fields for buyer view */}
                    {!isCixciAdmin && (
                      <>
                        <div className="form-group">
                          <label className="label">SKU</label>
                          <div className="input-read-only">{editingDevice.sku || 'N/A'}</div>
                        </div>
                        <div className="form-group">
                          <label className="label">Model Number</label>
                          <div className="input-read-only">{editingDevice.model_number || 'N/A'}</div>
                        </div>
                        {editingDevice.announced_date && (
                          <div className="form-group">
                            <label className="label">Announced Date</label>
                            <div className="input-read-only">{editingDevice.announced_date}</div>
                          </div>
                        )}
                        {editingDevice.release_date && (
                          <div className="form-group">
                            <label className="label">Release Date</label>
                            <div className="input-read-only">{editingDevice.release_date}</div>
                          </div>
                        )}
                        {editingDevice.eol_date && (
                          <div className="form-group">
                            <label className="label">EOL Date</label>
                            <div className="input-read-only">{editingDevice.eol_date}</div>
                          </div>
                        )}
                      </>
                    )}

                    {isCixciAdmin && selectedEditCategory && <div className="divider form-grid-full" style={{ margin: '8px 0' }} />}
                    {/* Conditional Compatibility Fields - admin only in details tab */}
                    {isCixciAdmin && (selectedEditCategory === 'phone' || selectedEditCategory === 'tablet' || selectedEditCategory === 'laptop') && (
                      <div className="form-group">
                        <label className="label">Charging Interface *</label>
                        {isCixciAdmin ? (
                          <select
                            className="input"
                            value={editCharging}
                            onChange={e => setEditCharging(e.target.value)}
                          >
                            <option value="">Select Charging Interface</option>
                            <option value="Type-C">Type-C</option>
                            {selectedEditCategory !== 'laptop' && <option value="Lightning">Lightning</option>}
                            <option value="Not Compatible">Not Compatible</option>
                          </select>
                        ) : (
                          <div className="input-read-only">{editCharging}</div>
                        )}
                      </div>
                    )}

                    {isCixciAdmin && (selectedEditCategory === 'phone' || selectedEditCategory === 'tablet') && (
                      <>
                        <div className="form-group">
                          <label className="label">Storage Expansion *</label>
                          {isCixciAdmin ? (
                            <select
                              className="input"
                              value={editStorage}
                              onChange={e => handleEditStorageChange(e.target.value)}
                            >
                              <option value="">Select Storage Expansion</option>
                              <option value="Not Compatible">Not Compatible</option>
                              <option value="microSDXC">microSDXC</option>
                              <option value="microSDHC">microSDHC</option>
                            </select>
                          ) : (
                            <div className="input-read-only">{editStorage}</div>
                          )}
                        </div>

                        {(editStorage === 'microSDXC' || editStorage === 'microSDHC') && (
                          <div className="form-group">
                            <label className="label">Maximum Expansion *</label>
                            {isCixciAdmin ? (
                              <select
                                className="input"
                                value={editMaxStorage}
                                onChange={e => setEditMaxStorage(e.target.value)}
                              >
                                {editStorage === 'microSDXC' ? (
                                  <>
                                    <option value="32GB">32GB</option>
                                    <option value="64GB">64GB</option>
                                    <option value="128GB">128GB</option>
                                    <option value="256GB">256GB</option>
                                    <option value="512GB">512GB</option>
                                    <option value="1TB">1TB</option>
                                    <option value="2TB">2TB</option>
                                  </>
                                ) : (
                                  <>
                                    <option value="16GB">16GB</option>
                                    <option value="32GB">32GB</option>
                                    <option value="64GB">64GB</option>
                                    <option value="128GB">128GB</option>
                                    <option value="256GB">256GB</option>
                                    <option value="512GB">512GB</option>
                                    <option value="1TB">1TB</option>
                                    <option value="1.5TB">1.5TB</option>
                                  </>
                                )}
                              </select>
                            ) : (
                              <div className="input-read-only">{editMaxStorage}</div>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {isCixciAdmin && (selectedEditCategory === 'phone' || selectedEditCategory === 'tablet' || selectedEditCategory === 'laptop') && (
                      <div className="form-group">
                        <label className="label">Headphone Jack *</label>
                        {isCixciAdmin ? (
                          <select
                            className="input"
                            value={editHeadphone}
                            onChange={e => setEditHeadphone(e.target.value)}
                          >
                            <option value="">Select Headphone Jack</option>
                            <option value="Not Compatible">Not Compatible</option>
                            <option value="Type-C">Type-C</option>
                            {selectedEditCategory !== 'laptop' && <option value="Lightning">Lightning</option>}
                          </select>
                        ) : (
                          <div className="input-read-only">{editHeadphone}</div>
                        )}
                      </div>
                    )}

                    {isCixciAdmin && selectedEditCategory && (
                      <div className="form-group">
                        <label className="label">Bluetooth Compatibility *</label>
                        {isCixciAdmin ? (
                          <select
                            className="input"
                            value={editBluetooth}
                            onChange={e => setEditBluetooth(e.target.value)}
                          >
                            <option value="">Select Bluetooth Compatibility</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        ) : (
                          <div className="input-read-only">{editBluetooth}</div>
                        )}
                      </div>
                    )}

                    {isCixciAdmin && (selectedEditCategory === 'phone' || selectedEditCategory === 'smartwatch') && (
                      <div className="form-group form-grid-full">
                        <label className="label">Wireless Charging Compatibility *</label>
                        {isCixciAdmin ? (
                          <div className="checkbox-group">
                            <label className="checkbox-item">
                              <input
                                type="checkbox"
                                checked={editWireless.includes('MagSafe')}
                                disabled={editWireless.includes('Not Compatible') || editWireless.includes('Qi')}
                                onChange={() => handleEditWirelessChange('MagSafe')}
                              />
                              MagSafe
                            </label>
                            <label className="checkbox-item">
                              <input
                                type="checkbox"
                                checked={editWireless.includes('Qi2')}
                                disabled={editWireless.includes('Not Compatible') || editWireless.includes('Qi')}
                                onChange={() => handleEditWirelessChange('Qi2')}
                              />
                              Qi2
                            </label>
                            <label className="checkbox-item">
                              <input
                                type="checkbox"
                                checked={editWireless.includes('Qi')}
                                disabled={editWireless.includes('Not Compatible') || editWireless.includes('MagSafe') || editWireless.includes('Qi2')}
                                onChange={() => handleEditWirelessChange('Qi')}
                              />
                              Qi
                            </label>
                            <label className="checkbox-item">
                              <input
                                type="checkbox"
                                checked={editWireless.includes('Not Compatible')}
                                onChange={() => handleEditWirelessChange('Not Compatible')}
                              />
                              Not Compatible
                            </label>
                          </div>
                        ) : (
                          <div className="input-read-only">{editWireless.join(', ') || 'Not Compatible'}</div>
                        )}
                      </div>
                    )}

                    {isCixciAdmin && selectedEditCategory === 'smartwatch' && (
                      <div className="form-group">
                        <label className="label">Watch Case Size *</label>
                        {isCixciAdmin ? (
                          <select
                            className="input"
                            value={editWatchCase}
                            onChange={e => setEditWatchCase(e.target.value)}
                          >
                            <option value="">Select Watch Case Size</option>
                            <option value="Not Compatible">Not Compatible</option>
                            <option value="40mm">40mm</option>
                            <option value="41mm">41mm</option>
                            <option value="42mm">42mm</option>
                            <option value="44mm">44mm</option>
                            <option value="45mm">45mm</option>
                            <option value="46mm">46mm</option>
                            <option value="49mm">49mm</option>
                          </select>
                        ) : (
                          <div className="input-read-only">{editWatchCase}</div>
                        )}
                      </div>
                    )}
                    {/* End admin-only compatibility fields in details tab */}

                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setEditingDevice(null)}
                  >
                    Close
                  </button>
                  {isCixciAdmin && (
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSubmittingEdit}
                    >
                      {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
                    </button>
                  )}
                </div>
              </form>
            ) : editTab === 'compatibility' ? (
              <div className="modal-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
                    Hardware compatibility specifications for this device. {!isCixciAdmin && <span>These fields are managed by CIXCI administrators.</span>}
                  </div>

                  <div className="form-grid">
                    {(selectedEditCategory === 'phone' || selectedEditCategory === 'tablet' || selectedEditCategory === 'laptop') && (
                      <div className="form-group">
                        <label className="label">Charging Interface</label>
                        <div className="input-read-only">{editingDevice.compatible_charging_interface || 'Not Compatible'}</div>
                      </div>
                    )}

                    {(selectedEditCategory === 'phone' || selectedEditCategory === 'tablet') && (
                      <>
                        <div className="form-group">
                          <label className="label">Storage Expansion</label>
                          <div className="input-read-only">{editingDevice.storage_expansion_compatibility || 'Not Compatible'}</div>
                        </div>
                        {editingDevice.storage_expansion_compatibility && editingDevice.storage_expansion_compatibility !== 'Not Compatible' && (
                          <div className="form-group">
                            <label className="label">Maximum Supported Storage</label>
                            <div className="input-read-only">{editingDevice.maximum_supported_storage || 'Not Compatible'}</div>
                          </div>
                        )}
                      </>
                    )}

                    {(selectedEditCategory === 'phone' || selectedEditCategory === 'tablet' || selectedEditCategory === 'laptop') && (
                      <div className="form-group">
                        <label className="label">Headphone Jack</label>
                        <div className="input-read-only">{editingDevice.headphone_jack_compatibility || 'Not Compatible'}</div>
                      </div>
                    )}

                    {selectedEditCategory && (
                      <div className="form-group">
                        <label className="label">Bluetooth Compatibility</label>
                        <div className="input-read-only">{editingDevice.bluetooth_compatibility || 'N/A'}</div>
                      </div>
                    )}

                    {(selectedEditCategory === 'phone' || selectedEditCategory === 'smartwatch') && (
                      <div className="form-group form-grid-full">
                        <label className="label">Wireless Charging Compatibility</label>
                        <div className="input-read-only">{editingDevice.wireless_charging_compatibility?.replace(/\+/g, ', ') || 'Not Compatible'}</div>
                      </div>
                    )}

                    {selectedEditCategory === 'smartwatch' && (
                      <div className="form-group">
                        <label className="label">Watch Case Size</label>
                        <div className="input-read-only">{editingDevice.compatible_watch_case_size || 'Not Compatible'}</div>
                      </div>
                    )}

                    {!selectedEditCategory && (
                      <div className="form-grid-full" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                        No compatibility data available for this device type.
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-footer" style={{ padding: '16px 0 0 0', marginTop: 16 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setEditingDevice(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="modal-body">
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  {!auditHistory || auditHistory.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                      No audit history records found for this device.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {auditHistory.map((record: any) => (
                        <div
                          key={record.id}
                          style={{
                            padding: '12px 14px',
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-light)',
                            borderRadius: 'var(--radius)',
                            fontSize: 13,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span className="badge badge-indigo" style={{ textTransform: 'none', fontSize: 11 }}>
                              {record.event_code}
                            </span>
                            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                              {new Date(record.created_at).toLocaleString()}
                            </span>
                          </div>
                          <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                            {record.description}
                          </div>
                          {record.actor_id && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                              Actor ID: {record.actor_id}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="modal-footer" style={{ padding: '16px 0 0 0', marginTop: 16 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setEditingDevice(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
