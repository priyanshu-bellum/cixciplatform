import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Box, Button, Checkbox, Chip, CircularProgress, Divider, Drawer, FormControlLabel,
  MenuItem, Stack, TextField, Typography } from '@mui/material'
import api from '../../lib/apiClient'
import CompatibilityFields from '../../components/CompatibilityFields'
import { COMPATIBILITY_LABELS, apiError, normalizedRules, useCompatibilityOptions } from '../../hooks/useCompatibilityOptions'
import { useSnackbar } from '../../components/feedback/SnackbarProvider'
import DropdownManagerDialog from './dialogs/DropdownManagerDialog'
import DevicePicker from './VendorAuditDevicePicker'
import { categoryDeviceTypes, declaredTypeIds } from './compatibilityEntry'
import { deviceId, explicitDevices } from './vendorAuditData'
import type { AuditConfig, AuditDevice, AuditProduct, AuditWriteBody } from './vendorAuditData'

type Rule = { mode?: string; default_value?: string; default?: string; condition_field?: string; condition_values?: string[] }
type DeviceType = { id: string; code: string; name: string }
type Detail = AuditProduct & Record<string, unknown>
type Props = { product: AuditProduct; category: string; configs: AuditConfig[]; scope: string; onClose: () => void }

export default function VendorAuditCategoryDrawer(props: Props) {
  const [saving, setSaving] = useState(false)
  const detail = useQuery({ queryKey: ['vendor-audit-product-detail', props.scope, props.product.id],
    queryFn: async () => (await api.get<Detail>(`/catalog/products/${props.product.id}/`)).data })
  return <Drawer anchor="right" open onClose={() => { if (!saving) props.onClose() }} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 540 }, maxWidth: '100%' } } }}>
    <Box role="dialog" aria-label="Category compatibility setup" sx={{ p: 3 }}>
      <Typography variant="h6">Category &amp; Compatibility</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>{props.product.sku} · {props.category}</Typography>
      {detail.isLoading && <CircularProgress size={24} />}
      {detail.error && <Alert severity="error">{apiError(detail.error)}</Alert>}
      {detail.data && <CategoryForm key={props.product.id + ':' + props.category} {...props} detail={detail.data} onBusyChange={setSaving} />}
      {!detail.data && <Button onClick={props.onClose}>Close</Button>}
    </Box>
  </Drawer>
}

function CategoryForm({ product, detail, category, configs, scope, onClose, onBusyChange }: Props & { detail: Detail; onBusyChange: (value: boolean) => void }) {
  const queryClient = useQueryClient()
  const { showSnackbar } = useSnackbar()
  const { data: options, isLoading: optionsLoading, error: optionsError } = useCompatibilityOptions()
  const config = configs.find(item => item.field_name === 'product_category' && item.value === category)
  const previousConfig = configs.find(item => item.field_name === 'product_category' && item.value === product.product_category)
  const mode = config?.compatibility_mode === 'explicit' ? 'device_specific' : config?.compatibility_mode
  const rules = normalizedRules(config?.compatibility_rules || {}) as Record<string, Rule>
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(Object.keys(COMPATIBILITY_LABELS).map(field => {
    const previousRule = (previousConfig?.compatibility_rules?.[field] || {}) as Rule
    const wasDeclared = previousRule.mode ? previousRule.mode !== 'hidden' : previousConfig?.accessory_fields?.includes(field)
    return [field, category !== product.product_category && !wasDeclared ? '' : String(detail[field] || '')]
  })))
  const [choice, setChoice] = useState(detail.compatibility_mode === 'universal_device_type' ? 'universal' : 'category')
  const universal = mode === 'universal' || choice === 'universal'
  const supportsModels = !universal && ['device_specific', 'hybrid'].includes(mode || '')
  const types: DeviceType[] = options?.device_types || []
  const eligible: DeviceType[] = categoryDeviceTypes(types, config)
  const savedTypes = Array.isArray(detail.universal_device_type_ids) && detail.universal_device_type_ids.length
    ? detail.universal_device_type_ids as string[] : Array.isArray(detail.compatible_device_types) ? detail.compatible_device_types as string[] : []
  const [typeDraft, setTypeDraft] = useState<string[]>(savedTypes)
  const selectedTypes = declaredTypeIds(typeDraft, types)
  const [devices, setDevices] = useState<AuditDevice[]>(() => explicitDevices(product.device_assertions))
  const [errors, setErrors] = useState<string[]>([])
  const [rulesOpen, setRulesOpen] = useState(false)
  const save = useMutation({ mutationFn: (body: AuditWriteBody) => api.patch(`/catalog/products/${product.id}/`, body),
    onMutate: () => onBusyChange(true),
    onSettled: () => onBusyChange(false),
    onSuccess: async () => {
      showSnackbar('Category and compatibility saved.', 'success')
      await Promise.all(['vendor-audit','vendor-audit-stats','products','compatibility','my-projection',
        'catalog-brand-options','vendor-audit-product-detail'].map(key => queryClient.invalidateQueries({ queryKey: [key] })))
      onClose()
    },
    onError: error => {
      setErrors([apiError(error)])
      void queryClient.invalidateQueries({ queryKey: ['dropdown-configs'] })
      void queryClient.invalidateQueries({ queryKey: ['compatibility-options'] })
    },
  })
  const submit = () => {
    const fields = { ...values }
    const missing: string[] = []
    for (const [field, rule] of Object.entries(rules)) {
      if (!fields[field] && rule.mode === 'defaulted') fields[field] = rule.default_value || rule.default || ''
      const conditional = rule.mode === 'conditional' && (rule.condition_values || []).some(value =>
        value.trim().toLowerCase() === (fields[rule.condition_field || ''] || '').trim().toLowerCase())
      if ((rule.mode === 'required' || conditional) && !fields[field]) missing.push(`${COMPATIBILITY_LABELS[field] || field} requires a declared answer.`)
    }
    if (!config || config.status !== 'active') missing.push('Choose an active configured category.')
    if (universal && !selectedTypes.length) missing.push('Select at least one approved Universal Device Type.')
    if (universal && selectedTypes.some(id => !eligible.some(type => type.id === id))) missing.push('Review Universal types outside this category’s approved scope.')
    if (supportsModels && mode === 'device_specific' && !devices.length) missing.push('Select the exact compatible device models.')
    setErrors(missing)
    if (missing.length) return
    const body: AuditWriteBody = { product_category: category,
      compatibility_mode: universal ? 'universal_device_type' : 'direct_device',
      compatible_device_types: universal ? selectedTypes : [], ...fields }
    if (category !== product.product_category) body.product_category_override = category
    if (supportsModels) Object.assign(body, { device_ids: devices.map(deviceId), compatibility_update_type: 'replace' })
    save.mutate(body)
  }
  const savedRules = async () => {
    await Promise.all(['dropdown-configs','compatibility-options'].map(key => queryClient.invalidateQueries({ queryKey: [key] })))
    setRulesOpen(false)
  }
  return <Stack spacing={2}>
    <Alert severity="info">Complete this category’s configured fields before saving. Required answers may be No or Not Compatible when accurate.</Alert>
    {errors.map((message, index) => <Alert key={index} severity="error" sx={{ overflowWrap: 'anywhere' }}>{message}</Alert>)}
    {optionsError && <Alert severity="error">{apiError(optionsError)}</Alert>}
    <TextField select label="Product compatibility" size="small" value={universal ? 'universal' : 'category'} disabled={save.isPending}
      onChange={event => { setChoice(event.target.value); setErrors([]) }}>
      {mode !== 'universal' && <MenuItem value="category">Use category compatibility rules</MenuItem>}
      <MenuItem value="universal">Universal Device Types</MenuItem>
    </TextField>
    {universal && <Box>
      <Typography variant="subtitle2">Universal Device Types</Typography>
      <Typography variant="body2" color="text.secondary">Choose the approved types this product supports. Current and future eligible models of those types will be mapped.</Typography>
      {eligible.map(type => <FormControlLabel key={type.id} label={type.name} control={<Checkbox disabled={save.isPending}
        slotProps={{ input: { 'aria-label': `Universal ${type.name}` } }}
        checked={selectedTypes.includes(type.id)} onChange={() => { setTypeDraft(selectedTypes.includes(type.id) ? selectedTypes.filter(id => id !== type.id) : [...selectedTypes, type.id]); setErrors([]) }} />} />)}
      {selectedTypes.filter(id => !eligible.some(type => type.id === id)).map(id => <Chip key={id} label={`Review unavailable saved type: ${id}`}
        color="warning" onDelete={() => setTypeDraft(selectedTypes.filter(value => value !== id))} />)}
      {!eligible.length && !optionsLoading && <Alert severity="warning">No approved types are configured for this category. Review Category Rules.</Alert>}
    </Box>}
    {supportsModels && <DevicePicker scope={scope} value={devices} onChange={setDevices} disabled={save.isPending}
      eligibleTypeIds={eligible.map(type => type.id)} suggestions={product.payload_devices} />}
    {!universal && mode === 'feature_based' && <Alert severity="info">Feature Based uses the configured fields below. To choose exact models, explicitly change the category rule to Hybrid.</Alert>}
    <Divider />
    <Typography variant="subtitle2">{category} fields</Typography>
    <CompatibilityFields values={values} rules={config?.compatibility_rules || {}} assignedFields={config?.accessory_fields || []}
      onChange={(field, value) => { setValues(current => ({ ...current, [field]: value })); setErrors([]) }} />
    <Button onClick={() => setRulesOpen(true)} disabled={save.isPending}>Edit Category Rules</Button>
    <Typography variant="caption" color="text.secondary">Category rule changes apply to every product in that category and use the existing audited configuration workflow.</Typography>
    <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
      <Button disabled={save.isPending} onClick={onClose}>Cancel</Button>
      <Button variant="contained" disabled={save.isPending || optionsLoading || !!optionsError || !config} onClick={submit}>Save category</Button>
    </Stack>
    <DropdownManagerDialog open={rulesOpen} onClose={() => setRulesOpen(false)} dropdownConfigs={configs}
      initialCategoryValue={category} onConfigChanged={() => { void savedRules() }} />
  </Stack>
}
