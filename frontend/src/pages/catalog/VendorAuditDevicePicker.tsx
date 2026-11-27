import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, Autocomplete, Box, Button, Chip, TextField, Typography } from '@mui/material'
import api from '../../lib/apiClient'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { apiError } from '../../hooks/useCompatibilityOptions'
import { useSnackbar } from '../../components/feedback/SnackbarProvider'
import { deviceId, normalizeLabel, responseRows } from './vendorAuditData'
import type { AuditDevice, CatalogDevice } from './vendorAuditData'

export default function VendorAuditDevicePicker({ scope, value, onChange, disabled, suggestions = [], eligibleTypeIds }: {
  scope: string; value: AuditDevice[]; onChange: (value: AuditDevice[]) => void; disabled: boolean;
  suggestions?: { name: string }[]; eligibleTypeIds?: string[]
}) {
  const [search, setSearch] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  // Long selections are collapsed to a preview instead of scrolling inside the panel
  const [showAll, setShowAll] = useState(false)
  const PREVIEW = 12
  const visible = showAll ? value : value.slice(0, PREVIEW)
  const debounced = useDebouncedValue(search, 400)
  const { showSnackbar } = useSnackbar()
  const options = useQuery({ queryKey: ['vendor-audit-device-options', scope, debounced], queryFn: async () =>
    responseRows<CatalogDevice>((await api.get('/devices/devices/', { params: { search: debounced || undefined, page_size: 50 } })).data), enabled: !disabled })
  const optionDevice = (item: CatalogDevice): AuditDevice => ({ device_id: item.id, name: item.display_name ||
    [item.manufacturer_name || (typeof item.manufacturer === 'object' ? item.manufacturer?.name : ''), item.name].filter(Boolean).join(' ') })
  const permitted = (item: CatalogDevice) => !eligibleTypeIds || eligibleTypeIds.includes(item.device_type || '')
  const add = (device: AuditDevice) => { if (!value.some(current => deviceId(current) === deviceId(device))) onChange([...value, device]) }
  const [suggesting, setSuggesting] = useState(false)
  const suggest = async (name: string) => {
    setSuggesting(true)
    try {
      const data = responseRows<CatalogDevice>((await api.get('/devices/devices/', { params: { search: name, page_size: 50 } })).data)
      const exact = data.filter(item => permitted(item) && [item.name, optionDevice(item).name].some(label => normalizeLabel(label) === normalizeLabel(name)))
      if (exact.length === 1) add(optionDevice(exact[0]))
      else showSnackbar('No unique eligible canonical match. Search the Device Catalog or review Missing Devices.', 'warning')
    } catch (error) { showSnackbar(apiError(error), 'error') } finally { setSuggesting(false) }
  }
  return <Box>
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: .5, mb: 1 }} data-testid="audit-current-devices">
      {visible.map(device => <Chip key={deviceId(device)} label={device.name} size="small" disabled={disabled}
        onDelete={() => onChange(value.filter(item => deviceId(item) !== deviceId(device)))} />)}
      {!value.length && <Typography variant="body2" color="text.secondary">No models selected.</Typography>}
    </Box>
    {value.length > PREVIEW && <Button size="small" onClick={() => setShowAll(!showAll)} sx={{ mb: 1, px: 1, fontSize: 11 }}>
      {showAll ? 'Show fewer' : `Show all ${value.length} selected`}
    </Button>}
    <Autocomplete options={(options.data || []).filter(permitted).map(optionDevice).filter(item => !value.some(current => deviceId(current) === deviceId(item)))}
      value={null} inputValue={search} getOptionLabel={item => item.name} filterOptions={items => items}
      loading={options.isFetching} disabled={disabled || suggesting} isOptionEqualToValue={(a, b) => deviceId(a) === deviceId(b)}
      onInputChange={(_, input) => setSearch(input)} onChange={(_, item) => { if (item) { add(item); setSearch('') } }}
      renderInput={input => <TextField {...input} label="Add device" size="small" />} />
    {options.error && <Alert severity="error">{apiError(options.error)}</Alert>}
    {!!suggestions.length && <Button size="small" disabled={disabled || suggesting} onClick={() => setShowSuggestions(!showSuggestions)}>Auto-suggest</Button>}
    {showSuggestions && <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: .5, mt: 1 }}>{suggestions
      .filter(item => item.name && normalizeLabel(item.name) !== 'universal').map((item, i) => <Chip key={item.name + i} size="small"
        label={item.name} disabled={disabled || suggesting} onClick={() => { void suggest(item.name) }} />)}</Box>}
  </Box>
}
