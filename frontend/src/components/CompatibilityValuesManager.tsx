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
  const [combinationValues, setCombinationValues] = useState<string[]>([])
  const [combinationRule, setCombinationRule] = useState<'allowed' | 'prohibited'>('allowed')
  const [notice, setNotice] = useState('')
  const refresh = async () => { await refetch(); await queryClient.invalidateQueries({ queryKey: ['compatibility-options'] }) }
  const save = async (operation: () => Promise<any>) => {
    setError(''); setNotice(''); setBusy(true)
    try { await operation(); await refresh(); return true } catch (error) { setError(apiError(error)); return false } finally { setBusy(false) }
  }
  const wireless: string[] = (data?.fields?.wireless_charging_compatibility || []).map((option: any) => option.value).filter((value: string) => value !== 'Not Compatible')
  const policy = data?.wireless_policy || {}
  const keyFor = (values: string[]) => JSON.stringify([...new Set(values)].sort())
  const savedRows = new Map<string, 'allowed' | 'prohibited' | ''>()
  for (const row of policy.allowed_combinations || []) savedRows.set(keyFor(row), 'allowed')
  for (const row of policy.prohibited_combinations || []) savedRows.set(keyFor(row), 'prohibited')
  const rows = new Map([...savedRows, ...Object.entries(matrix)])
  const rulesFor = (source: Map<string, 'allowed' | 'prohibited' | ''>) => ({
    allowed_combinations: [...source].filter(([, rule]) => rule === 'allowed').map(([key]) => JSON.parse(key) as string[]).sort((a, b) => keyFor(a).localeCompare(keyFor(b))),
    prohibited_combinations: [...source].filter(([, rule]) => rule === 'prohibited').map(([key]) => JSON.parse(key) as string[]).sort((a, b) => keyFor(a).localeCompare(keyFor(b))),
  })
  const draftRules = rulesFor(rows)
  const matrixDirty = JSON.stringify(draftRules) !== JSON.stringify(rulesFor(savedRows))
  const setRule = (key: string, rule: 'allowed' | 'prohibited' | '') => {
    setMatrix(previous => ({ ...previous, [key]: rule })); setNotice(''); setError('')
  }
  return <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
    <Typography variant="subtitle1">Shared Device and Accessory Compatibility Values</Typography>
    <Typography variant="body2" color="text.secondary">The same approved values apply to device, product, CSV and API entry. Retire values to preserve existing history.</Typography>
    {error && <Alert severity="error">{error}</Alert>}
    {busy && <Alert severity="info" role="status">Saving configuration and recalculating affected compatibility…</Alert>}
    {notice && <Alert severity="success">{notice}</Alert>}
    <TextField select label="Managed compatibility field" size="small" value={field} onChange={event => { setField(event.target.value); setValue(''); setError(''); setEditingLabel(null) }}>
      {Object.entries(COMPATIBILITY_LABELS).filter(([key]) => key !== 'bluetooth_compatibility').map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}
    </TextField>
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
      setValue(''); setCapacities(''); setNotice('Approved value saved.')
    })}>Add approved value</Button>
    {field === 'wireless_charging_compatibility' && <>
      <Typography variant="subtitle1">Wireless Charging Combination Matrix</Typography>
      {!policy.configured && <Alert severity="info">Existing restrictions apply until an admin saves this matrix.</Alert>}
      <Typography variant="body2" color="text.secondary">
        {draftRules.allowed_combinations.length ? 'Unlisted multi-value combinations are rejected while an allowed list is configured.' : 'Without an allowed list, unlisted combinations are accepted unless they contain a prohibited combination.'}
        {' '}A prohibited combination also blocks any selection containing it. Not Compatible must always be selected alone.
      </Typography>
      {[...rows].map(([key, rule]) => <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography sx={{ flex: 1 }}>{(JSON.parse(key) as string[]).join(' + ')}</Typography>
        <Select size="small" displayEmpty value={rule} disabled={busy} inputProps={{ 'aria-label': `Rule for ${(JSON.parse(key) as string[]).join(' + ')}` }} onChange={event => setRule(key, event.target.value as 'allowed' | 'prohibited' | '')}>
          <MenuItem value="">Remove explicit rule</MenuItem><MenuItem value="allowed">Allowed</MenuItem><MenuItem value="prohibited">Prohibited</MenuItem>
        </Select>
      </Box>)}
      <TextField select size="small" label="Combination values" value={combinationValues}
        slotProps={{ select: { multiple: true, renderValue: selected => (selected as string[]).join(' + ') } }}
        onChange={event => setCombinationValues(typeof event.target.value === 'string' ? event.target.value.split(',') : event.target.value)} disabled={busy}>
        {wireless.map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
      </TextField>
      <TextField select size="small" label="Combination rule" value={combinationRule} disabled={busy}
        onChange={event => setCombinationRule(event.target.value as 'allowed' | 'prohibited')}>
        <MenuItem value="allowed">Allowed</MenuItem><MenuItem value="prohibited">Prohibited</MenuItem>
      </TextField>
      <Button disabled={busy || combinationValues.length < 2} onClick={() => {
        const key = keyFor(combinationValues)
        if (rows.get(key)) { setError('This combination already exists. Edit its rule in the matrix.'); return }
        setRule(key, combinationRule); setCombinationValues([])
      }}>Add combination</Button>
      <Button disabled={busy || !data || (policy.configured && !matrixDirty)} variant="outlined" onClick={async () => {
        const payload = { field_name: 'wireless_combination_policy', value: 'global', display_name: 'Wireless Combination Policy', status: 'active', compatibility_rules: draftRules }
        const success = await save(() => policy.id ? api.patch(`/catalog/dropdown-configs/${policy.id}/`, payload) : api.post('/catalog/dropdown-configs/', payload))
        if (success) { setMatrix({}); setNotice('Wireless matrix saved.') }
      }}>Save wireless matrix</Button>
    </>}
    <Typography variant="caption">Not Compatible is always exclusive. Tablets never supply wireless charging evidence. Bluetooth remains Yes / No.</Typography>
  </Box>
}
