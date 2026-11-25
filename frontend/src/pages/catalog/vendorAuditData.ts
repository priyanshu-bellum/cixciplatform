export type AuditStatus = 'review' | 'no_devices' | 'no_image' | 'ok' | 'new'
export interface AuditDevice { device_id?: string; id?: string; name: string; model_number?: string }
export interface AuditUser { id: string; is_cixci_admin?: boolean }
export interface AuditConfig { id?: string; field_name: string; value: string; status: string;
  compatibility_mode?: string; eligible_device_types?: string[]; accessory_fields?: string[]; compatibility_rules?: Record<string, unknown> }
export interface AuditVendor { id: string; name: string; display_name?: string }
export interface CatalogDevice { id: string; name: string; display_name?: string; manufacturer_name?: string; manufacturer?: string | { name: string }; device_type?: string }
export interface LastSyncInfo {
  completed_at: string | null; created_count: number; updated_count: number
  review_count: number; rows_seen: number
}
export interface AuditStats {
  total: number; active: number; mapped: number; unmapped: number; review_products: number
  review_required: number; no_image: number; unlinked_review_required?: number
  new_count?: number
  last_sync?: LastSyncInfo | null
  brands: { brand_reference_id: string; brand_reference__name: string }[]
  categories?: string[]
  category_counts?: { name: string; count: number }[]
}
export interface AuditPage { count: number; next: string | null; previous: string | null; results: AuditProduct[] }
export interface AuditWriteBody extends Record<string, unknown> { device_ids?: string[]; update_type?: 'add' | 'replace' | 'remove' }
export interface AuditWriteResult { device_count?: number; unapplied_device_ids?: string[]; pending_device_ids?: string[];
  protected_device_ids?: string[]; failures?: { product_id: string; errors: unknown }[];
  results?: { product_id: string; unapplied_device_ids?: string[]; pending_device_ids?: string[]; protected_device_ids?: string[] }[] }
export type AuditSubmit = (path: string, body: AuditWriteBody, method?: 'post' | 'patch') => void
export interface LiveSearchResult {
  sku: string; external_id: string; name: string; brand: string; category: string
  in_system: boolean; payload: Record<string, unknown>
}
export interface AuditProduct {
  id: string; name: string; sku: string; brand: string; brand_reference?: string
  product_category: string; product_category_override?: string; system_color: string; status: string; compatibility_mode: string
  primary_image_url?: string; vendor_payload: Record<string, unknown>; audit_status: AuditStatus
  vendor_values?: Record<string, unknown>
  review_errors: { code?: string; field?: string; message?: string }[]
  device_assertions: AuditDevice[]; payload_devices: { name: string }[]; payload_images: string[]
  payload_category: string; msrp: string; vendor_wholesale_price_amount: string; inventory_level: number
  created_at?: string
}
export const auditLabels: Record<AuditStatus, string> = {
  review: 'Review Required', no_devices: 'No Devices', no_image: 'No Image', ok: 'OK', new: 'New',
}
export const auditColors = { review: 'error', no_devices: 'warning', no_image: 'warning', ok: 'success', new: 'info' } as const
export const deviceId = (device: AuditDevice) => device.device_id || device.id || ''
export const normalizeLabel = (name: string) => String(name || '').trim().replace(/\s+/g, ' ').toLowerCase()
export const responseRows = <T,>(data: unknown): T[] => {
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object' && 'results' in data && Array.isArray(data.results)) return data.results as T[]
  return []
}
export const comparable = (value: unknown) => Array.isArray(value)
  ? value.map(item => normalizeLabel(String(item))).sort().join('|') : normalizeLabel(String(value ?? ''))
