import { useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

type Prefix = 'all' | 'compat'

const paramKeys = (prefix: Prefix) => ({
  search: `${prefix}_search`,
  deviceId: `${prefix}_device_id`,
  category: prefix === 'all' ? 'all_category' : 'compatibility_category',
  brand: prefix === 'all' ? 'all_brand' : 'compatibility_brand',
  color: prefix === 'all' ? 'all_color' : 'compatibility_color',
  price: prefix === 'all' ? 'all_price' : 'compatibility_price',
  vendor: 'all_vendor',
  mapPrice: 'all_map_price',
  wholesalePrice: 'all_wholesale_price',
})

export function useCatalogFilters(prefix: Prefix) {
  const [searchParams, setSearchParams] = useSearchParams()
  const keys = paramKeys(prefix)

  const readList = (key: string) => searchParams.get(key)?.split(',').filter(Boolean) || []
  const readStr = (key: string) => searchParams.get(key) || ''

  const [search, setSearchState] = useState(readStr(keys.search))
  const [filterDeviceId, setFilterDeviceIdState] = useState(readStr(keys.deviceId))
  const [filterCategories, setFilterCategoriesState] = useState<string[]>(readList(keys.category))
  const [filterBrands, setFilterBrandsState] = useState<string[]>(readList(keys.brand))
  const [filterColors, setFilterColorsState] = useState<string[]>(readList(keys.color))
  const [filterMsrps, setFilterMsrpsState] = useState<string[]>(readList(keys.price))
  const [filterVendor, setFilterVendorState] = useState(readStr(keys.vendor))
  const [filterMapPrice, setFilterMapPriceState] = useState(readStr(keys.mapPrice))
  const [filterWholesalePrice, setFilterWholesalePriceState] = useState(readStr(keys.wholesalePrice))
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSellingStatus, setFilterSellingStatus] = useState('')
  const [sort, setSort] = useState('')

  const syncParam = useCallback((key: string, val: string | string[]) => {
    const newParams = new URLSearchParams(searchParams)
    const strVal = Array.isArray(val) ? val.join(',') : val
    if (strVal) {
      newParams.set(key, strVal)
    } else {
      newParams.delete(key)
    }
    setSearchParams(newParams)
  }, [searchParams, setSearchParams])

  const setSearch = useCallback((v: string) => { setSearchState(v); syncParam(keys.search, v) }, [syncParam, keys.search])
  const setFilterDeviceId = useCallback((v: string) => { setFilterDeviceIdState(v); syncParam(keys.deviceId, v) }, [syncParam, keys.deviceId])
  const setFilterCategories = useCallback((v: string[]) => { setFilterCategoriesState(v); syncParam(keys.category, v) }, [syncParam, keys.category])
  const setFilterBrands = useCallback((v: string[]) => { setFilterBrandsState(v); syncParam(keys.brand, v) }, [syncParam, keys.brand])
  const setFilterColors = useCallback((v: string[]) => { setFilterColorsState(v); syncParam(keys.color, v) }, [syncParam, keys.color])
  const setFilterMsrps = useCallback((v: string[]) => { setFilterMsrpsState(v); syncParam(keys.price, v) }, [syncParam, keys.price])
  const setFilterVendor = useCallback((v: string) => { setFilterVendorState(v); syncParam(keys.vendor, v) }, [syncParam, keys.vendor])
  const setFilterMapPrice = useCallback((v: string) => { setFilterMapPriceState(v); syncParam(keys.mapPrice, v) }, [syncParam, keys.mapPrice])
  const setFilterWholesalePrice = useCallback((v: string) => { setFilterWholesalePriceState(v); syncParam(keys.wholesalePrice, v) }, [syncParam, keys.wholesalePrice])

  const clearAll = useCallback(() => {
    setSearchState('')
    setFilterDeviceIdState('')
    setFilterCategoriesState([])
    setFilterBrandsState([])
    setFilterColorsState([])
    setFilterMsrpsState([])
    setFilterVendorState('')
    setFilterMapPriceState('')
    setFilterWholesalePriceState('')
    setFilterStatus('')
    setFilterSellingStatus('')
    setSort('')
    const newParams = new URLSearchParams(searchParams)
    Object.values(keys).forEach(k => newParams.delete(k))
    setSearchParams(newParams)
  }, [searchParams, setSearchParams, keys])

  const hasActiveFilters = Boolean(
    search || filterDeviceId || filterCategories.length > 0 ||
    filterBrands.length > 0 || filterColors.length > 0 || filterMsrps.length > 0 ||
    filterVendor || filterMapPrice || filterWholesalePrice ||
    filterStatus || filterSellingStatus
  )

  return {
    search, setSearch,
    filterDeviceId, setFilterDeviceId,
    filterStatus, setFilterStatus,
    filterSellingStatus, setFilterSellingStatus,
    filterCategories, setFilterCategories,
    filterBrands, setFilterBrands,
    filterColors, setFilterColors,
    filterMsrps, setFilterMsrps,
    filterVendor, setFilterVendor,
    filterMapPrice, setFilterMapPrice,
    filterWholesalePrice, setFilterWholesalePrice,
    sort, setSort,
    clearAll,
    hasActiveFilters,
  }
}
