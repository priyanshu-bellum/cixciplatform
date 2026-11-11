import { Box, Alert, Checkbox, FormControl, FormControlLabel, InputLabel, MenuItem, Select, Typography } from '@mui/material'
import { COMPATIBILITY_LABELS, normalizedRules, useCompatibilityOptions, wirelessError } from '../hooks/useCompatibilityOptions'

type Props = { values: Record<string, string>; onChange: (field: string, value: string) => void; rules: Record<string, any>; deviceType?: string; assignedFields?: string[] }

export default function CompatibilityFields({ values, onChange, rules: rawRules, deviceType, assignedFields }: Props) {
  const { data, isLoading, error } = useCompatibilityOptions()
  const rules = normalizedRules(rawRules)
  if (isLoading) return <Typography>Loading approved compatibility options…</Typography>
  if (error || !data) return <Alert severity="error">Compatibility options could not be loaded. Refresh before saving.</Alert>
  const options: Record<string, string[]> = Object.fromEntries(Object.entries(data.fields || {}).map(([field, values]) => [field, (values as any[]).map(option => option.value)]))
  const optionLabel = (field: string, value: string) => (data.fields?.[field] || []).find((option: any) => option.value === value)?.label || value
  return <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
    {Object.entries(COMPATIBILITY_LABELS).map(([field, label]) => {
      const rule = rules[field] || {}
      if ((rule.mode || (assignedFields?.includes(field) ? 'optional' : 'hidden')) === 'hidden') return null
      if (deviceType === 'tablet' && field === 'wireless_charging_compatibility') return null
      if (deviceType && deviceType !== 'smartwatch' && field === 'compatible_watch_case_size') return null
      const conditional = rule.mode === 'conditional' && (rule.condition_values || []).includes(values[rule.condition_field])
      const required = rule.mode === 'required' || conditional
      const value: string = values[field] || (rule.mode === 'defaulted' ? rule.default_value || rule.default || '' : '')
      let choices: string[] = field === 'bluetooth_compatibility' ? ['Yes', 'No'] : options[field] || []
      if (field === 'memory_capacity') {
        if (!values.storage_expansion_compatibility || values.storage_expansion_compatibility === 'Not Compatible') return null
        choices = data.storage_capacity_options?.[values.storage_expansion_compatibility] || []
        label = deviceType ? 'Maximum Supported Storage' : label
      }
      if (field === 'wireless_charging_compatibility') {
        const selected = value.split('+').filter(Boolean)
        const warning = wirelessError(selected, data.wireless_policy)
        return <Box key={field} sx={{ gridColumn: '1 / -1' }}>
          <Typography variant="body2">{label}{required ? ' *' : ''}</Typography>
          {choices.map(option => <FormControlLabel key={option} label={optionLabel(field, option)} control={<Checkbox size="small" checked={selected.includes(option)} onChange={() => {
            const next = selected.includes(option) ? selected.filter(item => item !== option) : option === 'Not Compatible' ? [option] : [...selected.filter(item => item !== 'Not Compatible'), option]
            onChange(field, next.join('+'))
          }} />}/>)}
          {warning && <Alert severity="warning">{warning}</Alert>}
        </Box>
      }
      return <FormControl key={field} size="small" fullWidth required={required}>
        <InputLabel>{label}</InputLabel><Select value={value} label={label} onChange={event => {
          onChange(field, event.target.value)
          if (field === 'storage_expansion_compatibility') onChange('memory_capacity', event.target.value === 'Not Compatible' ? 'Not Compatible' : '')
        }}>
          <MenuItem value=""><em>Select…</em></MenuItem>
          {value && !choices.includes(value) && <MenuItem value={value} disabled>{value} (retired; choose an approved value)</MenuItem>}
          {choices.map(option => <MenuItem key={option} value={option}>{optionLabel(field, option)}</MenuItem>)}
        </Select>
      </FormControl>
    })}
  </Box>
}
