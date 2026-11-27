import React, { useMemo } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import GridViewIcon from '@mui/icons-material/GridView'
import ViewListIcon from '@mui/icons-material/ViewList'
import FileDownloadIcon from '@mui/icons-material/FileDownloadOutlined'
import CloseIcon from '@mui/icons-material/Close'
import SearchBar from '../../components/forms/SearchBar'
import MultiSelect from '../../components/forms/MultiSelect'

interface ProductFilterBarProps {
  filters: {
    search: string
    setSearch: (v: string) => void
    filterDeviceId: string
    setFilterDeviceId: (v: string) => void
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
    hasActiveFilters: boolean
    clearAll: () => void
  }
  user: any
  vendorCompanies?: any[]
  portfolio?: any[]
  allowedCategories: string[]
  allowedBrands: string[]
  allowedColors: string[]
  brandsList: string[]
  onExportExcel?: () => void
  exporting?: boolean
  selectedCount?: number
  onSelectAll?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClearSelection?: () => void
  onExportSelection?: () => void
  showSelectAll?: boolean
  allChecked?: boolean
  someChecked?: boolean
  totalProducts?: number
  viewMode?: 'grid' | 'table'
  onViewModeChange?: (mode: 'grid' | 'table') => void
}

const MSRP_OPTIONS = [
  { value: '0-25', label: 'Under $25' },
  { value: '25-50', label: '$25 to $50' },
  { value: '50-100', label: '$50 to $100' },
  { value: '100-200', label: '$100 to $200' },
  { value: '200+', label: 'Over $200' },
]

// Shared pill styling for the toolbar controls
const pillButtonSx = { height: 34, px: 1.75, borderRadius: '999px', textTransform: 'none', fontSize: 12, whiteSpace: 'nowrap' }
const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: '14px' } }

export default function ProductFilterBar({
  filters,
  user,
  vendorCompanies,
  portfolio,
  allowedCategories,
  brandsList,
  allowedColors,
  onExportExcel,
  exporting,
  selectedCount = 0,
  onSelectAll,
  onClearSelection,
  onExportSelection,
  showSelectAll,
  allChecked,
  someChecked,
  totalProducts,
  viewMode = 'grid',
  onViewModeChange,
}: ProductFilterBarProps) {
  const isCixciAdmin = user?.is_cixci_admin || user?.company_type === 'cixci_internal'
  const isBuyer = user?.company_type === 'buyer'

  const companies = Array.isArray(vendorCompanies)
    ? vendorCompanies
    : (vendorCompanies as any)?.results ?? []

  // Keep URL-restored categories visible even when they are not in the dropdown config
  const categoryOptions = useMemo(() => {
    const extra = filters.filterCategories.filter(c => !allowedCategories.includes(c))
    return [...allowedCategories, ...extra]
  }, [allowedCategories, filters.filterCategories])

  const toggleCategory = (category: string) => {
    filters.setFilterCategories(
      filters.filterCategories.includes(category)
        ? filters.filterCategories.filter(c => c !== category)
        : [...filters.filterCategories, category],
    )
  }

  const categoryChipSx = (active: boolean) => ({
    appearance: 'none',
    font: 'inherit',
    fontSize: 12,
    fontWeight: 600,
    height: 30,
    px: 1.5,
    borderRadius: '999px',
    border: 1,
    borderColor: active ? 'text.primary' : 'divider',
    bgcolor: active ? 'text.primary' : 'background.paper',
    color: active ? 'background.paper' : 'text.primary',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease',
    '&:hover': { borderColor: active ? 'text.primary' : 'text.secondary' },
    '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
  })

  const viewButtonSx = (active: boolean) => ({
    height: 26,
    px: 1.5,
    minWidth: 0,
    borderRadius: '999px',
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'none',
    bgcolor: active ? 'text.primary' : 'transparent',
    color: active ? 'background.paper' : 'text.secondary',
    '&:hover': { bgcolor: active ? 'text.primary' : 'action.hover' },
  })

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 1.5, md: 2 },
        mb: 2.5,
        borderRadius: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.75,
      }}
    >
      {/* Row 1: search, result count and view / export actions */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.25 }}>
        <SearchBar
          placeholder="Search by name, SKU, brand, category, color, status, price…"
          value={filters.search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => filters.setSearch(e.target.value)}
          sx={{
            flex: '1 1 280px',
            maxWidth: 520,
            '& .MuiOutlinedInput-root': { borderRadius: '999px', bgcolor: 'var(--bg-elevated)' },
          }}
        />

        {totalProducts != null && (
          <Typography sx={{ fontSize: 13, color: 'text.secondary', whiteSpace: 'nowrap' }}>
            <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {totalProducts.toLocaleString()}
            </Box>{' '}
            {totalProducts === 1 ? 'product' : 'products'}
          </Typography>
        )}

        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, ml: 'auto' }}>
          {showSelectAll && totalProducts != null && totalProducts > 0 && onSelectAll && (
            <Box
              component="label"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                height: 34,
                px: 1.5,
                borderRadius: '999px',
                border: 1,
                borderColor: 'divider',
                fontSize: 12,
                fontWeight: 600,
                color: 'text.primary',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                ref={(el) => {
                  if (el) el.indeterminate = !!someChecked
                }}
                checked={!!allChecked}
                onChange={onSelectAll}
                style={{ cursor: 'pointer', accentColor: 'var(--accent)', width: 14, height: 14 }}
              />
              <span>Select All</span>
            </Box>
          )}

          {onExportExcel && (
            <Button
              variant="outlined"
              onClick={onExportExcel}
              disabled={exporting}
              startIcon={<FileDownloadIcon sx={{ fontSize: 16 }} />}
              sx={pillButtonSx}
            >
              {exporting ? 'Exporting…' : 'Export Excel'}
            </Button>
          )}

          {onViewModeChange && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                height: 34,
                p: '3px',
                border: 1,
                borderColor: 'divider',
                borderRadius: '999px',
              }}
            >
              <Button
                onClick={() => onViewModeChange('grid')}
                aria-pressed={viewMode === 'grid'}
                startIcon={<GridViewIcon sx={{ fontSize: 14 }} />}
                sx={viewButtonSx(viewMode === 'grid')}
              >
                Grid
              </Button>
              <Button
                onClick={() => onViewModeChange('table')}
                aria-pressed={viewMode === 'table'}
                startIcon={<ViewListIcon sx={{ fontSize: 14 }} />}
                sx={viewButtonSx(viewMode === 'table')}
              >
                Table
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      {/* Row 2: category quick filters */}
      <Box role="group" aria-label="Category" sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        <Box
          component="button"
          type="button"
          aria-pressed={filters.filterCategories.length === 0}
          onClick={() => filters.setFilterCategories([])}
          sx={categoryChipSx(filters.filterCategories.length === 0)}
        >
          All Categories
        </Box>
        {categoryOptions.map(category => {
          const active = filters.filterCategories.includes(category)
          return (
            <Box
              key={category}
              component="button"
              type="button"
              aria-pressed={active}
              onClick={() => toggleCategory(category)}
              sx={categoryChipSx(active)}
            >
              {category}
            </Box>
          )
        })}
      </Box>

      {/* Row 3: attribute filters */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.25 }}>
        {isBuyer && portfolio && (
          <MultiSelect
            label="Filter by Device"
            placeholder="All Devices (My Portfolio)"
            value={filters.filterDeviceId ? filters.filterDeviceId.split(',').filter(Boolean) : []}
            options={portfolio.filter((d: any) => d.active_flag).map((d: any) => ({ value: d.device, label: d.device_name }))}
            onChange={(vals: string[]) => filters.setFilterDeviceId(vals.join(','))}
            sx={fieldSx}
          />
        )}

        <MultiSelect
          label="Brand"
          placeholder="All Brands"
          value={filters.filterBrands}
          options={brandsList}
          onChange={filters.setFilterBrands}
          sx={fieldSx}
        />

        <MultiSelect
          label="Color"
          placeholder="All Colors"
          value={filters.filterColors}
          options={allowedColors}
          onChange={filters.setFilterColors}
          sx={fieldSx}
        />

        <MultiSelect
          label="MSRP (Wholesale)"
          placeholder="All Prices"
          value={filters.filterMsrps}
          options={MSRP_OPTIONS.map(o => o.label)}
          onChange={filters.setFilterMsrps}
          sx={fieldSx}
        />

        {isCixciAdmin && (
          <>
            <FormControl size="small" sx={{ minWidth: 150, ...fieldSx }}>
              <InputLabel>Vendor</InputLabel>
              <Select
                value={filters.filterVendor}
                label="Vendor"
                onChange={(e) => filters.setFilterVendor(e.target.value as string)}
              >
                <MenuItem value="">All Vendors</MenuItem>
                {companies
                  .slice()
                  .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''))
                  .map((c: any) => (
                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                  ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 130, ...fieldSx }}>
              <InputLabel>MAP Price</InputLabel>
              <Select
                value={filters.filterMapPrice}
                label="MAP Price"
                onChange={(e) => filters.setFilterMapPrice(e.target.value as string)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="has">Has Value</MenuItem>
                <MenuItem value="missing">Missing</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150, ...fieldSx }}>
              <InputLabel>Wholesale Price</InputLabel>
              <Select
                value={filters.filterWholesalePrice}
                label="Wholesale Price"
                onChange={(e) => filters.setFilterWholesalePrice(e.target.value as string)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="has">Has Value</MenuItem>
                <MenuItem value="missing">Missing</MenuItem>
              </Select>
            </FormControl>
          </>
        )}

        {filters.hasActiveFilters && (
          <Button
            variant="text"
            onClick={filters.clearAll}
            startIcon={<CloseIcon sx={{ fontSize: 14 }} />}
            sx={{ ...pillButtonSx, color: 'text.secondary' }}
          >
            Clear Filters
          </Button>
        )}
      </Box>

      {/* Selection bar */}
      {selectedCount > 0 && (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 1.25,
            px: 2,
            py: 1,
            borderRadius: '14px',
            bgcolor: 'action.selected',
          }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', mr: 'auto' }}>
            {selectedCount} selected
          </Typography>
          {onClearSelection && (
            <Button variant="outlined" onClick={onClearSelection} sx={{ ...pillButtonSx, height: 30 }}>
              Clear
            </Button>
          )}
          {onExportSelection && (
            <Button variant="contained" onClick={onExportSelection} sx={{ ...pillButtonSx, height: 30 }}>
              {isBuyer ? 'Add Products' : 'Export Selection'}
            </Button>
          )}
        </Box>
      )}
    </Paper>
  )
}
