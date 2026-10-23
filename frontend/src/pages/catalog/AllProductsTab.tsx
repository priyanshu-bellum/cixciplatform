import React, { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import Skeleton from '@mui/material/Skeleton'
import Button from '@mui/material/Button'
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag'
import api from '../../lib/apiClient'
import { getImageUrl, formatCurrency } from '../../lib/formatters'
import { SERVER_PAGE_SIZE } from './constants'
import { useCatalogFilters } from './hooks/useCatalogFilters'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import ProductCard, { ProductCardSkeleton } from './ProductCard'
import ProductFilterBar from './ProductFilterBar'
import { Pagination } from '../../components/Pagination'
import StatusChip from '../../components/data-display/StatusChip'
import type { ProductsPageResponse } from './types'

interface AllProductsTabProps {
  user: any
  onManageProduct: (p: any) => void
  onEditProduct: (p: any) => void
  dropdownConfigs: any[]
  allowedCategories: string[]
  allowedBrands: string[]
  allowedColors: string[]
}

export default function AllProductsTab({
  user,
  onManageProduct,
  onEditProduct,
  dropdownConfigs,
  allowedCategories,
  allowedBrands,
  allowedColors,
}: AllProductsTabProps) {
  const isCixciAdmin = user?.is_cixci_admin || user?.company_type === 'cixci_internal'
  const isBuyer = user?.company_type === 'buyer'

  const filters = useCatalogFilters('all')
  const debouncedSearch = useDebouncedValue(filters.search, 400)

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [serverPage, setServerPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [exportedProductIds, setExportedProductIds] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)

  // Reset page on filter changes
  useEffect(() => { setServerPage(1) }, [
    debouncedSearch, filters.filterCategories, filters.filterBrands,
    filters.filterColors, filters.filterMsrps, filters.filterDeviceId,
    filters.filterVendor, filters.filterMapPrice, filters.filterWholesalePrice,
  ])

  const productsFilterParams = useMemo(() => ({
    search: debouncedSearch || undefined,
    device_id: filters.filterDeviceId || undefined,
    product_category: filters.filterCategories.length ? filters.filterCategories.join(',') : undefined,
    brand: filters.filterBrands.length ? filters.filterBrands.join(',') : undefined,
    color: filters.filterColors.length ? filters.filterColors.join(',') : undefined,
    msrp_range: filters.filterMsrps.length ? filters.filterMsrps.join(',') : undefined,
    vendor_company_reference: filters.filterVendor || undefined,
    has_map_price: filters.filterMapPrice === 'has' ? 'true' : filters.filterMapPrice === 'missing' ? 'false' : undefined,
    has_wholesale_price: filters.filterWholesalePrice === 'has' ? 'true' : filters.filterWholesalePrice === 'missing' ? 'false' : undefined,
  }), [debouncedSearch, filters.filterDeviceId, filters.filterCategories, filters.filterBrands,
    filters.filterColors, filters.filterMsrps, filters.filterVendor, filters.filterMapPrice, filters.filterWholesalePrice])

  const { data: productsPage, isLoading, isFetching, refetch: refreshProducts } = useQuery<ProductsPageResponse>({
    queryKey: ['products', 'all', debouncedSearch, filters.filterDeviceId,
      filters.filterCategories, filters.filterBrands, filters.filterColors, filters.filterMsrps,
      serverPage, filters.filterVendor, filters.filterMapPrice, filters.filterWholesalePrice],
    queryFn: () => api.get('/catalog/products/', {
      params: { ...productsFilterParams, page: serverPage, page_size: SERVER_PAGE_SIZE },
    }).then(r => r.data),
    placeholderData: (previous: any) => previous,
  })

  const { data: devicesData } = useQuery({
    queryKey: ['devices'],
    queryFn: () => api.get('/devices/devices/?paginate=false').then(r => r.data),
  })

  const { data: vendorCompaniesData } = useQuery({
    queryKey: ['vendor-companies'],
    queryFn: () => api.get('/tenant/companies/', { params: { company_type: 'vendor', paginate: 'false' } }).then(r => r.data),
    enabled: !!isCixciAdmin,
  })

  const { data: portfolio } = useQuery({
    queryKey: ['my-devices'],
    queryFn: () => api.get('/devices/portfolio/my_devices/').then(r => r.data).catch(() => []),
    enabled: isBuyer,
  })

  const products = useMemo(() => {
    if (!productsPage) return []
    return Array.isArray(productsPage) ? productsPage : (productsPage.results ?? [])
  }, [productsPage])

  const totalProducts = (productsPage as any)?.count ?? products.length
  const totalPages = Math.max(1, Math.ceil(totalProducts / SERVER_PAGE_SIZE))

  const brandsList = useMemo(() => {
    const unique = new Set<string>()
    allowedBrands.forEach(b => { if (b) unique.add(b) })
    products.forEach((p: any) => { if (p.brand) unique.add(p.brand) })
    return Array.from(unique).sort()
  }, [allowedBrands, products])

  const fetchMatchingIds = async (): Promise<string[]> => {
    try {
      const res = await api.get('/catalog/products/ids/', { params: productsFilterParams })
      return res.data?.ids ?? []
    } catch { return [] }
  }

  const handleExportExcel = async () => {
    setExporting(true)
    try {
      const XLSX = await import('xlsx')
      const res = await api.get('/catalog/products/', {
        params: { ...productsFilterParams, page_size: 10000, paginate: 'false' },
      })
      const allProducts = Array.isArray(res.data) ? res.data : res.data?.results ?? []
      const wsData = allProducts.map((p: any) => ({
        'Product Name': p.name, SKU: p.sku, UPC: p.upc, Brand: p.brand,
        'Product Category': p.product_category, Status: p.status,
        MSRP: p.msrp, 'Wholesale Price': p.vendor_wholesale_price_amount,
        'MAP Price': p.map_price, Color: p.color, 'System Color': p.system_color,
        'Launch Date': p.launch_date, 'Inventory Level': p.inventory_level,
        Description: p.description,
      }))
      const ws = XLSX.utils.json_to_sheet(wsData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Products')
      XLSX.writeFile(wb, 'catalog_export.xlsx')
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  const handlePageChange = (page: number) => {
    setServerPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const allChecked = products.length > 0 && products.every((p: any) => selectedIds.includes(p.id))
  const someChecked = !allChecked && products.some((p: any) => selectedIds.includes(p.id))

  if (isLoading && !products.length) {
    return (
      <Box>
        <ProductFilterBar
          filters={filters}
          user={user}
          vendorCompanies={vendorCompaniesData}
          portfolio={portfolio}
          allowedCategories={allowedCategories}
          allowedBrands={allowedBrands}
          allowedColors={allowedColors}
          brandsList={brandsList}
          onExportExcel={isCixciAdmin ? handleExportExcel : undefined}
          exporting={exporting}
          selectedCount={0}
          showSelectAll={isBuyer}
          totalProducts={0}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
        {viewMode === 'grid' ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2.5 }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 60 }}>Image</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell>Brand</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">MSRP</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton variant="rounded" width={40} height={40} /></TableCell>
                    <TableCell><Skeleton variant="text" width="70%" /></TableCell>
                    <TableCell><Skeleton variant="text" width="60%" /></TableCell>
                    <TableCell><Skeleton variant="text" width="50%" /></TableCell>
                    <TableCell><Skeleton variant="text" width="60%" /></TableCell>
                    <TableCell align="right"><Skeleton variant="text" width="40%" sx={{ ml: 'auto' }} /></TableCell>
                    <TableCell><Skeleton variant="rounded" width={60} height={22} sx={{ borderRadius: '10px' }} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Box>
    )
  }

  return (
    <Box>
      <ProductFilterBar
        filters={filters}
        user={user}
        vendorCompanies={vendorCompaniesData}
        portfolio={portfolio}
        allowedCategories={allowedCategories}
        allowedBrands={allowedBrands}
        allowedColors={allowedColors}
        brandsList={brandsList}
        onExportExcel={isCixciAdmin ? handleExportExcel : undefined}
        exporting={exporting}
        selectedCount={selectedIds.length}
        onSelectAll={async (e) => {
          if (e.target.checked) {
            const allIds = await fetchMatchingIds()
            setSelectedIds(allIds)
          } else {
            setSelectedIds([])
          }
        }}
        onClearSelection={() => setSelectedIds([])}
        onExportSelection={() => setShowExportModal(true)}
        showSelectAll={isBuyer}
        allChecked={allChecked}
        someChecked={someChecked}
        totalProducts={totalProducts}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {products.length === 0 && !isLoading ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <ShoppingBagIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            {filters.hasActiveFilters ? 'No products match your filters' : 'No products yet'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {filters.hasActiveFilters ? 'Try adjusting your filters.' : 'Add your first product to get started.'}
          </Typography>
        </Box>
      ) : viewMode === 'grid' ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2.5 }}>
          {products.map((p: any) => (
            <ProductCard
              key={p.id}
              product={p}
              user={user}
              onClick={() => onManageProduct(p)}
              isSelected={selectedIds.includes(p.id)}
              onToggleSelect={() => {
                setSelectedIds(prev =>
                  prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id]
                )
              }}
              showCheckbox={isBuyer}
              exportedProductIds={exportedProductIds}
            />
          ))}
        </Box>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 60 }}>Image</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>SKU</TableCell>
                <TableCell>Brand</TableCell>
                <TableCell>Category</TableCell>
                <TableCell align="right">MSRP</TableCell>
                {(isCixciAdmin || isBuyer) && <TableCell align="right">Wholesale</TableCell>}
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((p: any) => (
                <TableRow
                  key={p.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => onManageProduct(p)}
                >
                  <TableCell>
                    {p.primary_image_url ? (
                      <img
                        src={getImageUrl(p.primary_image_url)}
                        alt={p.name}
                        style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 4 }}
                      />
                    ) : (
                      <Box sx={{ width: 40, height: 40, bgcolor: 'action.hover', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShoppingBagIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 250 }}>{p.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{p.sku}</Typography>
                  </TableCell>
                  <TableCell>{p.brand}</TableCell>
                  <TableCell>{p.product_category || '—'}</TableCell>
                  <TableCell align="right">{formatCurrency(p.msrp || 0, p.vendor_wholesale_price_currency)}</TableCell>
                  {(isCixciAdmin || isBuyer) && (
                    <TableCell align="right">
                      {formatCurrency(p.buyer_wholesale_price ?? p.vendor_wholesale_price_amount ?? 0, p.vendor_wholesale_price_currency)}
                    </TableCell>
                  )}
                  <TableCell>
                    <StatusChip status={p.status ?? 'unknown'} size="small" />
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      size="small"
                      variant="text"
                      onClick={(e) => { e.stopPropagation(); onEditProduct(p) }}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      <Pagination
        currentPage={serverPage}
        totalPages={totalPages}
        totalItems={totalProducts}
        pageSize={SERVER_PAGE_SIZE}
        onPageChange={handlePageChange}
        itemName="products"
      />
    </Box>
  )
}
