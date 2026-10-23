import React, { useRef } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import GridViewIcon from '@mui/icons-material/GridView'
import ViewListIcon from '@mui/icons-material/ViewList'
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

export default function ProductFilterBar({
  filters,
  user,
  vendorCompanies,
  portfolio,
  allowedCategories,
  allowedBrands,
  allowedColors,
  brandsList,
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
  const selectAllRef = useRef<HTMLInputElement>(null)

  const companies = Array.isArray(vendorCompanies)
    ? vendorCompanies
    : (vendorCompanies as any)?.results ?? []

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        mb: 2,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 1.5,
      }}
    >
      <SearchBar
        placeholder="Search by name, SKU, brand, category, color, status, price…"
        value={filters.search}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => filters.setSearch(e.target.value)}
        sx={{ width: 280 }}
      />

      {isBuyer && portfolio && (
        <MultiSelect
          label="Filter by Device"
          placeholder="All Devices (My Portfolio)"
          selected={filters.filterDeviceId ? filters.filterDeviceId.split(',').filter(Boolean) : []}
          options={portfolio.filter((d: any) => d.active_flag).map((d: any) => ({ value: d.device, label: d.device_name }))}
          onChange={(vals: string[]) => filters.setFilterDeviceId(vals.join(','))}
        />
      )}

      <MultiSelect
        label="Category"
        placeholder="All Categories"
        selected={filters.filterCategories}
        options={allowedCategories}
        onChange={filters.setFilterCategories}
      />

      <MultiSelect
        label="Brand"
        placeholder="All Brands"
        selected={filters.filterBrands}
        options={brandsList}
        onChange={filters.setFilterBrands}
      />

      <MultiSelect
        label="Color"
        placeholder="All Colors"
        selected={filters.filterColors}
        options={allowedColors}
        onChange={filters.setFilterColors}
      />

      <MultiSelect
        label="MSRP (Wholesale)"
        placeholder="All Prices"
        selected={filters.filterMsrps}
        options={MSRP_OPTIONS}
        onChange={filters.setFilterMsrps}
      />

      {isCixciAdmin && (
        <>
          <FormControl size="small" sx={{ minWidth: 150 }}>
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

          <FormControl size="small" sx={{ minWidth: 130 }}>
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

          <FormControl size="small" sx={{ minWidth: 150 }}>
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
          size="small"
          variant="outlined"
          onClick={filters.clearAll}
          sx={{ alignSelf: 'center', height: 38 }}
        >
          Clear Filters
        </Button>
      )}

      {onExportExcel && (
        <Button
          size="small"
          variant="outlined"
          onClick={onExportExcel}
          disabled={exporting}
          sx={{ alignSelf: 'center', height: 38 }}
        >
          {exporting ? 'Exporting…' : 'Export Excel'}
        </Button>
      )}

      {showSelectAll && totalProducts != null && totalProducts > 0 && onSelectAll && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, height: 38 }}>
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-primary)',
              userSelect: 'none',
              padding: '0 12px',
              height: 38,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 6,
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
          </label>
        </Box>
      )}

      {selectedCount > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ml: 'auto' }}>
          <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 550 }}>
            {selectedCount} selected
          </span>
          {onExportSelection && (
            <Button size="small" variant="contained" onClick={onExportSelection}>
              Export Selection
            </Button>
          )}
          {onClearSelection && (
            <Button size="small" variant="outlined" onClick={onClearSelection}>
              Clear
            </Button>
          )}
        </Box>
      )}

      {onViewModeChange && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            bgcolor: 'action.hover',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            p: '3px',
            ml: selectedCount > 0 ? 0 : 'auto',
          }}
        >
          <Button
            size="small"
            onClick={() => onViewModeChange('grid')}
            startIcon={<GridViewIcon sx={{ fontSize: 14 }} />}
            sx={{
              bgcolor: viewMode === 'grid' ? 'primary.main' : 'transparent',
              color: viewMode === 'grid' ? 'primary.contrastText' : 'text.secondary',
              '&:hover': { bgcolor: viewMode === 'grid' ? 'primary.dark' : 'action.hover' },
              borderRadius: 0.5,
              px: 1.5,
              minWidth: 0,
              fontSize: 12,
              fontWeight: 600,
              textTransform: 'none',
            }}
          >
            Grid
          </Button>
          <Button
            size="small"
            onClick={() => onViewModeChange('table')}
            startIcon={<ViewListIcon sx={{ fontSize: 14 }} />}
            sx={{
              bgcolor: viewMode === 'table' ? 'primary.main' : 'transparent',
              color: viewMode === 'table' ? 'primary.contrastText' : 'text.secondary',
              '&:hover': { bgcolor: viewMode === 'table' ? 'primary.dark' : 'action.hover' },
              borderRadius: 0.5,
              px: 1.5,
              minWidth: 0,
              fontSize: 12,
              fontWeight: 600,
              textTransform: 'none',
            }}
          >
            Table
          </Button>
        </Box>
      )}
    </Paper>
  )
}
