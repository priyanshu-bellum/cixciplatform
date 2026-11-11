import { useQuery } from '@tanstack/react-query'
import api from '../lib/apiClient'

export const COMPATIBILITY_LABELS: Record<string, string> = {
  compatible_charging_interface: 'Charging Interface', headphone_jack_compatibility: 'Headphone Jack',
  bluetooth_compatibility: 'Bluetooth', wireless_charging_compatibility: 'Wireless Charging',
  storage_expansion_compatibility: 'Storage Expansion', memory_capacity: 'Memory Capacity',
  compatible_watch_case_size: 'Watch Case Size',
}
export const compatibilityField = (field: string) => ({ charging_interface: 'compatible_charging_interface', headphone_jack_type: 'headphone_jack_compatibility', bluetooth_supported: 'bluetooth_compatibility', wireless_charging_type: 'wireless_charging_compatibility', storage_expansion_type: 'storage_expansion_compatibility', max_supported_storage: 'memory_capacity', maximum_supported_storage: 'memory_capacity', watch_case_size: 'compatible_watch_case_size' } as Record<string, string>)[field] || field
export function normalizedRules(rules: Record<string, any> = {}) {
  return Object.fromEntries(Object.entries(rules).filter(([field]) => !field.startsWith('_')).map(([field, rule]) => [compatibilityField(field), rule]))
}
export function useCompatibilityOptions() {
  return useQuery({ queryKey: ['compatibility-options'], queryFn: async () => (await api.get('/catalog/dropdown-configs/compatibility-options/')).data, staleTime: 30_000 })
}
export function apiError(error: any) {
  const value = error?.response?.data || error?.message || 'The change could not be saved.'
  return typeof value === 'string' ? value : JSON.stringify(value)
}
export function wirelessError(values: string[], policy: any) {
  if (values.includes('Not Compatible') && values.length > 1) return 'Not Compatible must be selected alone.'
  if (values.length < 2) return ''
  const prohibited: string[][] = policy?.prohibited_combinations || []
  const allowed: string[][] = policy?.allowed_combinations || []
  if (prohibited.some(combo => combo.every(value => values.includes(value)))) return 'This combination is prohibited by the saved configuration.'
  if (allowed.length && !allowed.some(combo => combo.length === values.length && combo.every(value => values.includes(value)))) return 'This combination is not in the saved allowed matrix.'
  return ''
}
