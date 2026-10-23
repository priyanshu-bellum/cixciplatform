export interface ProductsPageResponse {
  count: number
  next?: string | null
  previous?: string | null
  results: any[]
}

export interface Product {
  id: string
  name: string
  sku: string
  upc?: string
  brand?: string
  product_type?: string
  product_category?: string
  description?: string
  short_description?: string
  promo_information?: string
  status?: string
  selling_status?: string
  color?: string
  system_color?: string
  vendor_wholesale_price_amount?: number | null
  vendor_wholesale_price_currency?: string
  buyer_wholesale_price?: number | null
  msrp?: number | null
  map_price?: number | null
  sale_price?: number | null
  primary_image_url?: string | null
  media_references?: any[]
  launch_date?: string | null
  release_date?: string | null
  eol_date?: string | null
  warranty?: string
  recommended_accessory?: boolean
  inventory_level?: number | null
  inventory_threshold?: number | null
  length?: number | null
  width?: number | null
  height?: number | null
  weight?: number | null
  meta_title?: string
  meta_description?: string
  compatible_device_types?: string[]
  device_compatibility?: any[]
  bluetooth_compatibility?: string
  headphone_jack_compatibility?: string
  compatible_charging_interface?: string
  wireless_charging_compatibility?: string
  storage_expansion_compatibility?: string
  memory_capacity?: string
  compatible_watch_case_size?: string
  vendor_company_reference?: string
  vendor_map_pricing_enforced?: boolean
  vendor_return_address?: any
  vendor_return_address1?: string
  vendor_return_address2?: string
  vendor_return_city?: string
  vendor_return_state?: string
  vendor_return_zip_code?: string
  primary_image_reference?: string
  exported_date?: string
  [key: string]: any
}

export interface ExportJob {
  id: string
  status: string
  format: string
  trigger_type?: string
  triggered_by_name?: string
  triggered_by_role?: string
  created_at: string
  completed_at?: string
  failure_details?: string
  products_snapshot?: Array<{
    product_id: string
    product_name: string
    sku: string
    upc?: string
    vendor_name?: string
    primary_image_url?: string
  }>
  [key: string]: any
}

export interface DropdownConfig {
  id: string
  field_name: string
  value: string
  compatibility_mode?: string
  status?: string
  match_logic?: string
  eligible_device_types?: string[]
  accessory_fields?: string[]
  compatibility_rules?: Record<string, { mode: string }>
  [key: string]: any
}

export interface CatalogFilters {
  search: string
  setSearch: (v: string) => void
  filterDeviceId: string
  setFilterDeviceId: (v: string) => void
  filterStatus: string
  setFilterStatus: (v: string) => void
  filterSellingStatus: string
  setFilterSellingStatus: (v: string) => void
  filterCategories: string[]
  setFilterCategories: (v: string[]) => void
  filterBrands: string[]
  setFilterBrands: (v: string[]) => void
  filterColors: string[]
  setFilterColors: (v: string[]) => void
  filterMsrps: string[]
  setFilterMsrps: (v: string[]) => void
  filterVendor: string
  setFilterVendor: (v: string) => void
  filterMapPrice: string
  setFilterMapPrice: (v: string) => void
  filterWholesalePrice: string
  setFilterWholesalePrice: (v: string) => void
  sort: string
  setSort: (v: string) => void
  clearAll: () => void
  hasActiveFilters: boolean
}
