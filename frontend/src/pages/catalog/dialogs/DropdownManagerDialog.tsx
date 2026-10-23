import React, { useState, useMemo } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import CloseIcon from '@mui/icons-material/Close'
import DeleteIcon from '@mui/icons-material/Delete'
import SettingsIcon from '@mui/icons-material/Settings'
import api from '../../../lib/apiClient'

interface DropdownManagerDialogProps {
  open: boolean
  onClose: () => void
  dropdownConfigs: any[]
  onConfigChanged: () => void
}

type ManageFieldType = 'brand' | 'product_category' | 'system_color'

const FIELD_TAB_MAP: { value: ManageFieldType; label: string }[] = [
  { value: 'brand', label: 'Brand' },
  { value: 'product_category', label: 'Category' },
  { value: 'system_color', label: 'Color' },
]

const COMPATIBILITY_MODES = [
  { value: 'device_specific', label: 'Device Specific' },
  { value: 'universal', label: 'Universal' },
  { value: 'hybrid', label: 'Hybrid' },
]

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

const MATCH_LOGIC_OPTIONS = [
  { value: 'match_any', label: 'Match Any' },
  { value: 'match_all', label: 'Match All' },
]

const DEVICE_TYPE_OPTIONS = [
  'smartphone',
  'tablet',
  'laptop',
  'smartwatch',
  'earbuds',
  'desktop',
  'gaming_console',
  'e_reader',
]

const ACCESSORY_FIELD_OPTIONS = [
  { value: 'compatible_charging_interface', label: 'Charging Interface' },
  { value: 'storage_expansion_compatibility', label: 'Storage Expansion' },
  { value: 'memory_capacity', label: 'Memory Capacity' },
  { value: 'headphone_jack_compatibility', label: 'Headphone Jack' },
  { value: 'bluetooth_compatibility', label: 'Bluetooth' },
  { value: 'wireless_charging_compatibility', label: 'Wireless Charging' },
  { value: 'compatible_watch_case_size', label: 'Watch Case Size' },
]

export default function DropdownManagerDialog({
  open,
  onClose,
  dropdownConfigs,
  onConfigChanged,
}: DropdownManagerDialogProps) {
  // Dropdown list management state
  const [manageField, setManageField] = useState<ManageFieldType>('brand')
  const [newDropdownValue, setNewDropdownValue] = useState('')
  const [dropdownError, setDropdownError] = useState<string | null>(null)

  // Category compatibility config editing state
  const [editingCategoryConfig, setEditingCategoryConfig] = useState<any | null>(null)
  const [categoryConfigMode, setCategoryConfigMode] = useState('device_specific')
  const [categoryConfigStatus, setCategoryConfigStatus] = useState('active')
  const [categoryConfigMatchLogic, setCategoryConfigMatchLogic] = useState('match_any')
  const [categoryConfigEligibleTypes, setCategoryConfigEligibleTypes] = useState<string[]>([])
  const [categoryConfigAccessoryFields, setCategoryConfigAccessoryFields] = useState<string[]>([])
  const [categoryConfigRules, setCategoryConfigRules] = useState<any>({})

  // When editingCategoryConfig is set, populate all the config fields
  const handleStartEditConfig = (item: any) => {
    setEditingCategoryConfig(item)
    setCategoryConfigMode(item.compatibility_mode || 'device_specific')
    setCategoryConfigStatus(item.status || 'active')
    setCategoryConfigMatchLogic(item.match_logic || 'match_any')
    setCategoryConfigEligibleTypes(item.eligible_device_types || [])
    setCategoryConfigAccessoryFields(item.accessory_fields || [])
    setCategoryConfigRules(item.compatibility_rules || {})
    setDropdownError(null)
  }

  const handleCancelEditConfig = () => {
    setEditingCategoryConfig(null)
    setDropdownError(null)
  }

  // Filtered configs for the active tab
  const filteredConfigs = useMemo(() => {
    return dropdownConfigs.filter((c: any) => c.field_name === manageField)
  }, [dropdownConfigs, manageField])

  // Resolve the current tab index from manageField
  const tabIndex = FIELD_TAB_MAP.findIndex((t) => t.value === manageField)

  const handleTabChange = (_: React.SyntheticEvent, newIndex: number) => {
    setManageField(FIELD_TAB_MAP[newIndex].value)
    setNewDropdownValue('')
    setDropdownError(null)
    setEditingCategoryConfig(null)
  }

  const handleClose = () => {
    setEditingCategoryConfig(null)
    setDropdownError(null)
    setNewDropdownValue('')
    onClose()
  }

  // ------- API Handlers -------

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
      onConfigChanged()
    } catch (err: any) {
      setDropdownError(
        err.response?.data?.detail ||
          err.response?.data?.value?.[0] ||
          'Failed to add value.'
      )
    }
  }

  const handleDeleteDropdownValue = async (id: string) => {
    setDropdownError(null)
    try {
      await api.delete(`/catalog/dropdown-configs/${id}/`)
      onConfigChanged()
    } catch (err: any) {
      setDropdownError(err.response?.data?.detail || 'Failed to delete value.')
    }
  }

  const handleSaveCategoryConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCategoryConfig) return
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
      onConfigChanged()
    } catch (err: any) {
      setDropdownError(err.response?.data?.detail || 'Failed to save configuration.')
    }
  }

  // ------- Toggle helpers for multi-select arrays -------

  const toggleEligibleType = (type: string) => {
    setCategoryConfigEligibleTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  const toggleAccessoryField = (fieldValue: string) => {
    if (categoryConfigAccessoryFields.includes(fieldValue)) {
      setCategoryConfigAccessoryFields((prev) => prev.filter((f) => f !== fieldValue))
      setCategoryConfigRules((prev: any) => {
        const updated = { ...prev }
        delete updated[fieldValue]
        return updated
      })
    } else {
      setCategoryConfigAccessoryFields((prev) => [...prev, fieldValue])
      setCategoryConfigRules((prev: any) => ({
        ...prev,
        [fieldValue]: { mode: 'optional' },
      }))
    }
  }

  const updateRuleMode = (fieldValue: string, mode: string) => {
    setCategoryConfigRules((prev: any) => ({
      ...prev,
      [fieldValue]: { ...(prev[fieldValue] || {}), mode },
    }))
  }

  // ------- Placeholder text helper -------

  const addPlaceholder = useMemo(() => {
    switch (manageField) {
      case 'system_color':
        return 'Add new color...'
      case 'product_category':
        return 'Add new category...'
      default:
        return 'Add new brand...'
    }
  }, [manageField])

  // ------- Render -------

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="md"
      scroll="paper"
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {editingCategoryConfig ? 'Configure Category Compatibility' : 'Manage Dropdown Values'}
        <IconButton size="small" onClick={handleClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {dropdownError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDropdownError(null)}>
            {dropdownError}
          </Alert>
        )}

        {editingCategoryConfig ? (
          /* ---------- Category Compatibility Config Editor ---------- */
          <Box component="form" onSubmit={handleSaveCategoryConfig} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Configuring Category:{' '}
              <Typography component="span" variant="subtitle2" color="primary">
                {editingCategoryConfig.value}
              </Typography>
            </Typography>

            {/* Compatibility Mode */}
            <FormControl fullWidth size="small">
              <InputLabel>Compatibility Mode</InputLabel>
              <Select
                label="Compatibility Mode"
                value={categoryConfigMode}
                onChange={(e) => setCategoryConfigMode(e.target.value)}
              >
                {COMPATIBILITY_MODES.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Status */}
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={categoryConfigStatus}
                onChange={(e) => setCategoryConfigStatus(e.target.value)}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Match Logic */}
            <FormControl fullWidth size="small">
              <InputLabel>Match Logic</InputLabel>
              <Select
                label="Match Logic"
                value={categoryConfigMatchLogic}
                onChange={(e) => setCategoryConfigMatchLogic(e.target.value)}
              >
                {MATCH_LOGIC_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Eligible Device Types */}
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Eligible Device Types
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
                {DEVICE_TYPE_OPTIONS.map((type) => (
                  <FormControlLabel
                    key={type}
                    control={
                      <Checkbox
                        size="small"
                        checked={categoryConfigEligibleTypes.includes(type)}
                        onChange={() => toggleEligibleType(type)}
                      />
                    }
                    label={
                      <Typography variant="body2">
                        {type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </Typography>
                    }
                  />
                ))}
              </Box>
            </Box>

            {/* Accessory Fields with Rule Modes */}
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Accessory Compatibility Fields
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {ACCESSORY_FIELD_OPTIONS.map((opt) => {
                  const checked = categoryConfigAccessoryFields.includes(opt.value)
                  const rule = categoryConfigRules[opt.value] || { mode: 'optional' }
                  return (
                    <Box
                      key={opt.value}
                      sx={{
                        p: 1.5,
                        bgcolor: 'action.hover',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={checked}
                            onChange={() => toggleAccessoryField(opt.value)}
                          />
                        }
                        label={
                          <Typography variant="body2" sx={{ fontWeight: 550 }}>
                            {opt.label}
                          </Typography>
                        }
                      />
                      {checked && (
                        <Box sx={{ ml: 4, mt: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Rule Mode:
                          </Typography>
                          <Select
                            size="small"
                            value={rule.mode}
                            onChange={(e) => updateRuleMode(opt.value, e.target.value)}
                            sx={{ minWidth: 120, fontSize: '0.8rem' }}
                          >
                            <MenuItem value="required">Required</MenuItem>
                            <MenuItem value="optional">Optional</MenuItem>
                            <MenuItem value="hidden">Hidden</MenuItem>
                          </Select>
                        </Box>
                      )}
                    </Box>
                  )
                })}
              </Box>
            </Box>

            {/* Compatibility Rules JSON Editor (simplified) */}
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Compatibility Rules (JSON)
              </Typography>
              <TextField
                fullWidth
                multiline
                minRows={4}
                maxRows={10}
                size="small"
                value={JSON.stringify(categoryConfigRules, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value)
                    setCategoryConfigRules(parsed)
                    setDropdownError(null)
                  } catch {
                    // Allow typing without error -- validation on save
                  }
                }}
                slotProps={{ htmlInput: { style: { fontFamily: 'monospace', fontSize: 13 } } }}
                helperText="Edit raw JSON for advanced rule configuration"
              />
            </Box>

            {/* Config form actions */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Button variant="outlined" onClick={handleCancelEditConfig}>
                Cancel
              </Button>
              <Button variant="contained" type="submit">
                Save Configuration
              </Button>
            </Box>
          </Box>
        ) : (
          /* ---------- Dropdown Values Manager ---------- */
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Field Selector Tabs */}
            <Tabs
              value={tabIndex}
              onChange={handleTabChange}
              sx={{ mb: 2, borderBottom: '1px solid', borderColor: 'divider' }}
            >
              {FIELD_TAB_MAP.map((tab) => (
                <Tab key={tab.value} label={tab.label} />
              ))}
            </Tabs>

            <Box sx={{ display: 'flex', gap: 2, flex: 1, minHeight: 0 }}>
              {/* Right section: list of current values */}
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Box
                  sx={{
                    flex: 1,
                    overflowY: 'auto',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    maxHeight: '40vh',
                  }}
                >
                  {filteredConfigs.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        No values configured.
                      </Typography>
                    </Box>
                  ) : (
                    <List disablePadding dense>
                      {filteredConfigs.map((item: any) => (
                        <ListItem
                          key={item.id}
                          secondaryAction={
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              {manageField === 'product_category' && (
                                <IconButton
                                  edge="end"
                                  size="small"
                                  color="primary"
                                  onClick={() => handleStartEditConfig(item)}
                                  title="Configure compatibility"
                                >
                                  <SettingsIcon fontSize="small" />
                                </IconButton>
                              )}
                              <IconButton
                                edge="end"
                                size="small"
                                color="error"
                                onClick={() => handleDeleteDropdownValue(item.id)}
                                title="Delete value"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          }
                          sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
                        >
                          <ListItemText
                            primary={item.value}
                            slotProps={{ primary: { variant: 'body2', sx: { fontWeight: 550 } } }}
                          />
                          {manageField === 'product_category' && item.compatibility_mode && (
                            <Chip
                              label={item.compatibility_mode.replace(/_/g, ' ')}
                              size="small"
                              variant="outlined"
                              color={item.status === 'active' ? 'success' : 'default'}
                              sx={{ mr: 6, textTransform: 'capitalize' }}
                            />
                          )}
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Box>

                {/* Add new value form */}
                <Box
                  component="form"
                  onSubmit={handleAddDropdownValue}
                  sx={{ display: 'flex', gap: 1, mt: 2 }}
                >
                  <TextField
                    size="small"
                    fullWidth
                    placeholder={addPlaceholder}
                    value={newDropdownValue}
                    onChange={(e) => setNewDropdownValue(e.target.value)}
                    required
                  />
                  <Button variant="contained" type="submit" sx={{ whiteSpace: 'nowrap' }}>
                    Add Value
                  </Button>
                </Box>
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>

      {!editingCategoryConfig && (
        <DialogActions>
          <Button variant="outlined" onClick={handleClose}>
            Close
          </Button>
        </DialogActions>
      )}
    </Dialog>
  )
}
