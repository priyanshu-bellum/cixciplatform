import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Box, Button, Checkbox, FormControlLabel, MenuItem, Select, TextField, Typography } from '@mui/material'
import api from '../lib/apiClient'
import { apiError, COMPATIBILITY_LABELS, useCompatibilityOptions } from '../hooks/useCompatibilityOptions'

export default function CompatibilityValuesManager() {
  const queryClient = useQueryClient()
  const { data } = useCompatibilityOptions()
  const { data: records = [], refetch } = useQuery({ queryKey: ['managed-compatibility-values'], queryFn: async () => {
    const response = await api.get('/catalog/dropdown-configs/', { params: { paginate: 'false' } })
    return response.data.results || response.data
  } })
  const [field, setField] = useState('compatible_charging_interface')
  const [value, setValue] = useState('')
  const [capacities, setCapacities] = useState('')
  const [parent, setParent] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [editingLabel, setEditingLabel] = useState<{ id: string; label: string } | null>(null)
  const [matrix, setMatrix] = useState<Record<string, 'allowed' | 'prohibited' | ''>>({})
  const refresh = async () => { await refetch(); await queryClient.invalidateQueries({ queryKey: ['compatibility-options'] }) }
  const save = async (operation: () => Promise<any>) => {
    setError(''); setBusy(true)
    try { await operation(); await refresh() } catch (error) { setError(apiError(error)) } finally { setBusy(false) }
  }
  const wireless: string[] = (data?.fields?.wireless_charging_compatibility || []).map((option: any) => option.value).filter((value: string) => value !== 'Not Compatible')
  const combinations = wireless.flatMap((value, index) => wireless.slice(index + 1).map(other => [value, other]))
  if (wireless.length > 2) combinations.push([...wireless])
  const policy = data?.wireless_policy || {}
  const state = (combination: string[]) => {
    const key = [...combination].sort().join('+')
    if (key in matrix) return matrix[key]
    if ((policy.prohibited_combinations || []).some((row: string[]) => row.every(value => combination.includes(value)))) return 'prohibited'
    if ((policy.allowed_combinations || []).some((row: string[]) => row.length === combination.length && row.every(value => combination.includes(value)))) return 'allowed'
    return ''
  }
  return <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
    <Typography variant="subtitle1">Shared Device and Accessory Compatibility Values</Typography>
    <Typography variant="body2" color="text.secondary">The same approved values apply to device, product, CSV and API entry. Retire values to preserve existing history.</Typography>
    {error && <Alert severity="error">{error}</Alert>}
    <Select size="small" value={field} onChange={event => { setField(event.target.value); setValue(''); setError('') }}>
      {Object.entries(COMPATIBILITY_LABELS).filter(([key]) => key !== 'bluetooth_compatibility').map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}
    </Select>
    <Box sx={{ maxHeight: 230, overflow: 'auto' }}>
      {records.filter((record: any) => record.field_name === field).map((record: any) => <Box key={record.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
        {editingLabel?.id === record.id ? <>
          <TextField size="small" label="Display label" value={editingLabel?.label || ''} onChange={event => setEditingLabel({ id: record.id, label: event.target.value })} />
          <Button disabled={busy || !editingLabel?.label.trim()} onClick={() => save(async () => { await api.patch(`/catalog/dropdown-configs/${record.id}/`, { display_name: editingLabel?.label }); setEditingLabel(null) })}>Save label</Button>
          <Button onClick={() => setEditingLabel(null)}>Cancel</Button>
        </> : <Button sx={{ flex: 1, justifyContent: 'flex-start', textTransform: 'none' }} onClick={() => setEditingLabel({ id: record.id, label: record.display_name || record.value })}>{record.display_name || record.value}</Button>}
        <FormControlLabel label={record.status === 'active' ? 'Active' : 'Retired'} control={<Checkbox checked={record.status === 'active'} disabled={busy} onChange={() => save(() => api.patch(`/catalog/dropdown-configs/${record.id}/`, { status: record.status === 'active' ? 'retired' : 'active' }))}/>}/>
      </Box>)}
    </Box>
    <TextField size="small" label="New approved value" value={value} onChange={event => setValue(event.target.value)} />
    {field === 'storage_expansion_compatibility' && <TextField size="small" label="Linked capacities (comma separated, required)" value={capacities} onChange={event => setCapacities(event.target.value)} placeholder="256GB, 512GB" />}
    {field === 'memory_capacity' && <TextField select size="small" label="Linked Storage Expansion" value={parent} onChange={event => setParent(event.target.value)}>
      {(data?.fields?.storage_expansion_compatibility || []).filter((option: any) => option.value !== 'Not Compatible').map((option: any) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
    </TextField>}
    <Button variant="outlined" disabled={busy || !value.trim()} onClick={() => save(async () => {
      await api.post('/catalog/dropdown-configs/', { field_name: field, value, display_name: value, status: 'active', compatibility_rules:
        field === 'storage_expansion_compatibility' ? { capacity_options: capacities.split(',').map(value => value.trim()).filter(Boolean) } : field === 'memory_capacity' ? { storage_expansion: parent } : {} })
      setValue(''); setCapacities('')
    })}>Add approved value</Button>
    <Typography variant="subtitle1">Wireless Charging Combination Matrix</Typography>
    {!policy.configured && <Alert severity="info">Existing restrictions apply until an admin saves this matrix.</Alert>}
    {combinations.map(combination => <Box key={combination.join('+')} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography sx={{ flex: 1 }}>{combination.join(' + ')}</Typography>
      <Select size="small" displayEmpty value={state(combination)} onChange={event => setMatrix(previous => ({ ...previous, [[...combination].sort().join('+')]: event.target.value }))}>
        <MenuItem value="">No explicit combination</MenuItem><MenuItem value="allowed">Allowed</MenuItem><MenuItem value="prohibited">Prohibited</MenuItem>
      </Select>
    </Box>)}
    <Button disabled={busy} variant="outlined" onClick={() => save(() => {
      const payload = { field_name: 'wireless_combination_policy', value: 'global', display_name: 'Wireless Combination Policy', status: 'active', compatibility_rules: {
        allowed_combinations: combinations.filter(row => state(row) === 'allowed'), prohibited_combinations: combinations.filter(row => state(row) === 'prohibited'),
      } }
      return policy.id ? api.patch(`/catalog/dropdown-configs/${policy.id}/`, payload) : api.post('/catalog/dropdown-configs/', payload)
    })}>Save wireless matrix</Button>
    <Typography variant="caption">Not Compatible is always exclusive. Tablets never supply wireless charging evidence. Bluetooth remains Yes / No.</Typography>
  </Box>
}
