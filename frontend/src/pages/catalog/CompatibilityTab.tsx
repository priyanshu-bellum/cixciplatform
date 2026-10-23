import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import CircularProgress from '@mui/material/CircularProgress'
import Button from '@mui/material/Button'
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag'
import RefreshIcon from '@mui/icons-material/Refresh'
import api from '../../lib/apiClient'
import { getImageUrl, formatCurrency } from '../../lib/formatters'
import { SERVER_PAGE_SIZE } from './constants'
import { useCatalogFilters } from './hooks/useCatalogFilters'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import ProductCard from './ProductCard'
import ProductFilterBar from './ProductFilterBar'
import { Pagination } from '../../components/Pagination'
import StatusChip from '../../components/data-display/StatusChip'
import ExportDialog from './dialogs/ExportDialog'
import type { ProductsPageResponse } from './types'

interface CompatibilityTabProps {
  user: any
  onManageProduct: (p: any) => void
  projection: any
  refreshProjection: () => void
  isProjectionLoading: boolean
  allowedCategories: string[]
  allowedBrands: string[]
  allowedColors: string[]
}

export default function CompatibilityTab({
  user,
  onManageProduct,
  projection,
  refreshProjection,
  isProjectionLoading,
  allowedCategories,
  allowedBrands,
  allowedColors,
}: CompatibilityTabProps) {
  const navigate = useNavigate()
  const filters = useCatalogFilters('compat')
  const debouncedSearch = useDebouncedValue(filters.search, 400)

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [serverPage, setServerPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [exportedProductIds, setExportedProductIds] = useState<Set<string>>(new Set())
  const [showExportModal, setShowExportModal] = useState(false)
  const [refreshingProj, setRefreshingProj] = useState(false)

  useEffect(() => { setServerPage(1) }, [
    debouncedSearch, filters.filterCategories, filters.filterBrands,
    filters.filterColors, filters.filterMsrps, filters.filterDeviceId, projection,
  ])

  const productsFilterParams = useMemo(() => ({
    search: debouncedSearch || undefined,
    device_id: filters.filterDeviceId || undefined,
    product_category: filters.filterCategories.length ? filters.filterCategories.join(',') : undefined,
    brand: filters.filterBrands.length ? filters.filterBrands.join(',') : undefined,
    color: filters.filterColors.length ? filters.filterColors.join(',') : undefined,
    msrp_range: filters.filterMsrps.length ? filters.filterMsrps.join(',') : undefined,
    projection_scope: true,
  }), [debouncedSearch, filters.filterDeviceId, filters.filterCategories, filters.filterBrands,
    filters.filterColors, filters.filterMsrps])

  const { data: productsPage, isLoading, isFetching } = useQuery<ProductsPageResponse>({
    queryKey: ['products', 'projection', debouncedSearch, filters.filterDeviceId,
      filters.filterCategories, filters.filterBrands, filters.filterColors, filters.filterMsrps,
      projection?.last_recalculated_at, serverPage],
    queryFn: () => api.get('/catalog/products/', {
      params: { ...productsFilterParams, page: serverPage, page_size: SERVER_PAGE_SIZE },
    }).then(r => r.data),
    enabled: !!projection,
    placeholderData: (previous: any) => previous,
  })

  const { data: portfolio } = useQuery({
    queryKey: ['my-devices'],
    queryFn: () => api.get('/devices/portfolio/my_devices/').then(r => r.data).catch(() => []),
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

  const portfolioDeviceCount = useMemo(() => {
    if (!Array.isArray(portfolio)) return 0
    const ids = new Set<string>()
    portfolio.forEach((ref: any) => {
      if (ref?.active_flag && ref?.device) ids.add(ref.device)
    })
    return ids.size
  }, [portfolio])

  const fetchMatchingIds = async (): Promise<string[]> => {
    try {
      const res = await api.get('/catalog/products/ids/', { params: productsFilterParams })
      return res.data?.ids ?? []
    } catch { return [] }
  }

  const handleRefreshProjection = async () => {
    setRefreshingProj(true)
    try {
      await api.post('/catalog/my-projection/refresh/')
      await refreshProjection()
    } catch {} finally {
      setRefreshingProj(false)
    }
  }

  const handlePageChange = (page: number) => {
    setServerPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const allChecked = products.length > 0 && products.every((p: any) => selectedIds.includes(p.id))
  const someChecked = !allChecked && products.some((p: any) => selectedIds.includes(p.id))

  const compatEmptyState = filters.hasActiveFilters
    ? { title: 'No compatible products match your filters', hint: 'Clear the filters to see all compatible accessories.' }
    : portfolioDeviceCount === 0
      ? { title: 'No devices in your portfolio yet', hint: 'Add devices in My Devices to see accessories that fit them.' }
      : { title: 'No compatible accessories yet', hint: `No accessories in the catalog are mapped to your ${portfolioDeviceCount} portfolio device${portfolioDeviceCount === 1 ? '' : 's'} yet.` }

  if (isProjectionLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        {projection && (
          <Typography variant="caption" color="text.secondary">
            Last updated: {projection.last_recalculated_at ? new Date(projection.last_recalculated_at).toLocaleString() : 'Never'}
          </Typography>
        )}
        <Button
          size="small"
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleRefreshProjection}
          disabled={refreshingProj}
        >
          {refreshingProj ? 'Refreshing…' : 'Refresh'}
        </Button>
      </Box>

      <ProductFilterBar
        filters={filters}
        user={user}
        portfolio={portfolio}
        allowedCategories={allowedCategories}
        allowedBrands={allowedBrands}
        allowedColors={allowedColors}
        brandsList={brandsList}
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
        showSelectAll
        allChecked={allChecked}
        someChecked={someChecked}
        totalProducts={totalProducts}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {isFetching && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
          <CircularProgress size={20} />
        </Box>
      )}

      {products.length === 0 && !isLoading ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <ShoppingBagIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">{compatEmptyState.title}</Typography>
          <Typography variant="body2" color="text.secondary">{compatEmptyState.hint}</Typography>
          {portfolioDeviceCount === 0 && !filters.hasActiveFilters && (
            <Button variant="contained" size="small" sx={{ mt: 2 }} onClick={() => navigate('/devices')}>
              Go to My Devices
            </Button>
          )}
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
              showCheckbox
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
                <TableCell align="right">Wholesale</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((p: any) => (
                <TableRow key={p.id} hover sx={{ cursor: 'pointer' }} onClick={() => onManageProduct(p)}>
                  <TableCell>
                    {p.primary_image_url ? (
                      <img src={getImageUrl(p.primary_image_url)} alt={p.name} style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 4 }} />
                    ) : (
                      <Box sx={{ width: 40, height: 40, bgcolor: 'action.hover', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShoppingBagIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                      </Box>
                    )}
                  </TableCell>
                  <TableCell><Typography variant="body2" noWrap sx={{ maxWidth: 250 }}>{p.name}</Typography></TableCell>
                  <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{p.sku}</Typography></TableCell>
                  <TableCell>{p.brand}</TableCell>
                  <TableCell>{p.product_category || '—'}</TableCell>
                  <TableCell align="right">{formatCurrency(p.msrp || 0, p.vendor_wholesale_price_currency)}</TableCell>
                  <TableCell align="right">{formatCurrency(p.buyer_wholesale_price ?? p.vendor_wholesale_price_amount ?? 0, p.vendor_wholesale_price_currency)}</TableCell>
                  <TableCell><StatusChip status={p.status ?? 'unknown'} size="small" /></TableCell>
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

      <ExportDialog
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExported={() => {
          setExportedProductIds(prev => {
            const next = new Set(prev)
            selectedIds.forEach(id => next.add(id))
            return next
          })
          setSelectedIds([])
          setShowExportModal(false)
        }}
        selectedProductIds={selectedIds}
        tab="projection"
      />
    </Box>
  )
}
