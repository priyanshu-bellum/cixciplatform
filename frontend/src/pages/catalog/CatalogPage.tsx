import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Button from '@mui/material/Button'
import AddIcon from '@mui/icons-material/Add'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import SettingsIcon from '@mui/icons-material/Settings'
import ImageIcon from '@mui/icons-material/Image'
import api from '../../lib/apiClient'
import { useAuthStore } from '../../stores/authStore'
import { useConfirmDialog } from '../../hooks/useConfirmDialog'
import PageHeader from '../../components/layout/PageHeader'
import ConfirmDialog from '../../components/feedback/ConfirmDialog'

import AllProductsTab from './AllProductsTab'
import CompatibilityTab from './CompatibilityTab'
import ExportJobsTab from './ExportJobsTab'
import ProductFormDialog from './dialogs/ProductFormDialog'
import ManageProductDialog from './dialogs/ManageProductDialog'
import BulkUploadDialog from './dialogs/BulkUploadDialog'
import DropdownManagerDialog from './dialogs/DropdownManagerDialog'

export default function CatalogPage() {
  const { user } = useAuthStore()
  const { dialogProps, confirm } = useConfirmDialog()

  const isCixciAdmin = user?.is_cixci_admin || user?.company_type === 'cixci_internal'
  const isVendor = user?.company_type === 'vendor'
  const isBuyer = user?.company_type === 'buyer'

  // Tab state
  const [tab, setTab] = useState<string>('products')

  // Modal orchestration
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showManageDialog, setShowManageDialog] = useState(false)
  const [showBulkDialog, setShowBulkDialog] = useState(false)
  const [showDropdownDialog, setShowDropdownDialog] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [selectedManageProduct, setSelectedManageProduct] = useState<any>(null)
  const [bulkImagesOnly, setBulkImagesOnly] = useState(false)

  // Shared queries
  const { data: dropdownConfigsData, refetch: refetchDropdownConfigs } = useQuery({
    queryKey: ['dropdown-configs'],
    queryFn: () => api.get('/catalog/dropdown-configs/').then(r => r.data),
  })

  const dropdownConfigs = useMemo(() => {
    return Array.isArray(dropdownConfigsData) ? dropdownConfigsData : (dropdownConfigsData?.results ?? [])
  }, [dropdownConfigsData])

  const allowedCategories: string[] = useMemo(() => {
    const cats = dropdownConfigs.filter((c: any) => c.field_name === 'product_category').map((c: any) => c.value)
    return cats.length > 0 ? cats : [
      'Cases', 'Screen Protection', 'Headphones', 'Speakers',
      'Chargers and Cables', 'Memory', 'Wearable Tech', 'Phone Attachments',
    ]
  }, [dropdownConfigs])

  const allowedColors: string[] = useMemo(() => {
    const cols = dropdownConfigs.filter((c: any) => c.field_name === 'system_color').map((c: any) => c.value)
    return cols.length > 0 ? cols : [
      'Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple', 'Pink', 'Brown', 'Black', 'White', 'Silver', 'Multi-Color',
    ]
  }, [dropdownConfigs])

  const allowedBrands: string[] = useMemo(() => {
    return dropdownConfigs.filter((c: any) => c.field_name === 'brand').map((c: any) => c.value)
  }, [dropdownConfigs])

  const dropdownsLoaded = dropdownConfigs.length > 0

  const { data: deviceTypesData } = useQuery({
    queryKey: ['device-types'],
    queryFn: () => api.get('/devices/types/').then(r => r.data).catch(() => []),
  })
  const deviceTypes = Array.isArray(deviceTypesData) ? deviceTypesData : (deviceTypesData?.results ?? [])

  const { data: devicesData } = useQuery({
    queryKey: ['devices'],
    queryFn: () => api.get('/devices/devices/?paginate=false').then(r => r.data),
  })
  const devices = devicesData?.results ?? devicesData ?? []

  const { data: activeCompatibilities, refetch: refetchCompatibilities } = useQuery({
    queryKey: ['compatibility', selectedManageProduct?.id],
    queryFn: () => api.get(`/catalog/products/${selectedManageProduct.id}/compatibility/`).then(r => r.data).catch(() => []),
    enabled: !!selectedManageProduct && showManageDialog,
  })

  // Buyer projection query
  const { data: projectionResponse, isLoading: isProjectionLoading, refetch: refreshProjection } = useQuery<{ projection: any | null; reason: string | null }>({
    queryKey: ['my-projection'],
    queryFn: async () => {
      try {
        const res = await api.get('/catalog/my-projection/my_projection/')
        return { projection: res.data, reason: null }
      } catch (err: any) {
        if (err?.response?.status === 404) {
          return { projection: null, reason: err.response?.data?.reason ?? 'no_portfolio_devices' }
        }
        throw err
      }
    },
    enabled: tab === 'projection' && isBuyer,
    retry: false,
  })
  const projection = projectionResponse?.projection ?? null

  const handleManageProduct = async (p: any) => {
    setSelectedManageProduct(p)
    setShowManageDialog(true)
    try {
      const detailRes = await api.get(`/catalog/products/${p.id}/`)
      setSelectedManageProduct(detailRes.data)
    } catch {}
  }

  const handleEditProduct = (p: any) => {
    setEditingProduct(p)
    setShowManageDialog(false)
    setShowEditDialog(true)
  }

  const openBulkModal = () => {
    setBulkImagesOnly(false)
    setShowBulkDialog(true)
  }

  const openBulkImagesModal = () => {
    setBulkImagesOnly(true)
    setShowBulkDialog(true)
  }

  const headerActions = (
    <Box sx={{ display: 'flex', gap: 1 }}>
      {(isCixciAdmin || isVendor) && (
        <>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setShowAddDialog(true)}
          >
            Add Product
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<UploadFileIcon />}
            onClick={openBulkModal}
          >
            Bulk Upload
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ImageIcon />}
            onClick={openBulkImagesModal}
          >
            Upload Images
          </Button>
        </>
      )}
      {isCixciAdmin && (
        <Button
          variant="outlined"
          size="small"
          startIcon={<SettingsIcon />}
          onClick={() => setShowDropdownDialog(true)}
        >
          Manage Dropdowns
        </Button>
      )}
    </Box>
  )

  return (
    <Box>
      <PageHeader title="Product Catalog" actions={headerActions} />

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="All Products" value="products" />
        {isBuyer && <Tab label="My Compatibility" value="projection" />}
        {isBuyer && <Tab label="Export Jobs" value="export_jobs" />}
      </Tabs>

      {tab === 'products' && (
        <AllProductsTab
          user={user}
          onManageProduct={handleManageProduct}
          onEditProduct={handleEditProduct}
          dropdownConfigs={dropdownConfigs}
          allowedCategories={allowedCategories}
          allowedBrands={allowedBrands}
          allowedColors={allowedColors}
        />
      )}

      {tab === 'projection' && isBuyer && (
        <CompatibilityTab
          user={user}
          onManageProduct={handleManageProduct}
          projection={projection}
          refreshProjection={() => refreshProjection()}
          isProjectionLoading={isProjectionLoading}
          allowedCategories={allowedCategories}
          allowedBrands={allowedBrands}
          allowedColors={allowedColors}
        />
      )}

      {tab === 'export_jobs' && isBuyer && (
        <ExportJobsTab user={user} />
      )}

      {/* All dialogs rendered at page level */}
      <ProductFormDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSaved={() => { setShowAddDialog(false) }}
        mode="add"
        user={user}
        allowedBrands={allowedBrands}
        allowedCategories={allowedCategories}
        allowedColors={allowedColors}
        devices={devices}
        deviceTypes={deviceTypes}
      />

      <ProductFormDialog
        open={showEditDialog}
        onClose={() => { setShowEditDialog(false); setEditingProduct(null) }}
        onSaved={() => { setShowEditDialog(false); setEditingProduct(null) }}
        mode="edit"
        product={editingProduct}
        user={user}
        allowedBrands={allowedBrands}
        allowedCategories={allowedCategories}
        allowedColors={allowedColors}
        devices={devices}
        deviceTypes={deviceTypes}
        activeCompatibilities={activeCompatibilities}
      />

      <ManageProductDialog
        open={showManageDialog}
        onClose={() => { setShowManageDialog(false); setSelectedManageProduct(null) }}
        product={selectedManageProduct}
        user={user}
        onProductUpdated={() => {}}
        onEditProduct={handleEditProduct}
        devices={devices}
        activeCompatibilities={activeCompatibilities || []}
        refetchCompatibilities={refetchCompatibilities}
      />

      <BulkUploadDialog
        open={showBulkDialog}
        onClose={() => setShowBulkDialog(false)}
        onUploaded={() => { setShowBulkDialog(false) }}
        user={user}
        allowedCategories={allowedCategories}
        allowedColors={allowedColors}
        allowedBrands={allowedBrands}
        dropdownsLoaded={dropdownsLoaded}
      />

      <DropdownManagerDialog
        open={showDropdownDialog}
        onClose={() => setShowDropdownDialog(false)}
        dropdownConfigs={dropdownConfigs}
        onConfigChanged={() => refetchDropdownConfigs()}
      />

      <ConfirmDialog {...dialogProps} />
    </Box>
  )
}
