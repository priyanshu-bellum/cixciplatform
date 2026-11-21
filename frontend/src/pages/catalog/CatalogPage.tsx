import React, { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Chip from '@mui/material/Chip'
import Collapse from '@mui/material/Collapse'
import IconButton from '@mui/material/IconButton'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import SettingsIcon from '@mui/icons-material/Settings'
import ImageIcon from '@mui/icons-material/Image'
import RuleIcon from '@mui/icons-material/Rule'
import CloseIcon from '@mui/icons-material/Close'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import api from '../../lib/apiClient'
import { useAuthStore } from '../../stores/authStore'
import { useConfirmDialog } from '../../hooks/useConfirmDialog'
import PageHeader from '../../components/layout/PageHeader'
import ConfirmDialog from '../../components/feedback/ConfirmDialog'

import AllProductsTab from './AllProductsTab'
import CompatibilityTab from './CompatibilityTab'
import ExportJobsTab from './ExportJobsTab'
import VendorImportReviewTab from './VendorImportReviewTab'
import ProductFormDialog from './dialogs/ProductFormDialog'
import ManageProductDialog from './dialogs/ManageProductDialog'
import BulkUploadDialog from './dialogs/BulkUploadDialog'
import DropdownManagerDialog from './dialogs/DropdownManagerDialog'
import BatchRevalidateDialog from './dialogs/BatchRevalidateDialog'
import MissingDevicesTab from './MissingDevicesTab'
import VendorAuditTab from './VendorAuditTab'

export default function CatalogPage() {
  const queryClient = useQueryClient()
  const refreshCatalog = () => {
    void queryClient.invalidateQueries({ queryKey: ['products'] })
    void queryClient.invalidateQueries({ queryKey: ['my-projection'] })
    void queryClient.invalidateQueries({ queryKey: ['compatibility'] })
  }
  const { user } = useAuthStore()
  const { dialogProps, confirm } = useConfirmDialog()

  const isCixciAdmin = user?.is_cixci_admin || user?.company_type === 'cixci_internal'
  const isVendor = user?.company_type === 'vendor'
  const isBuyer = user?.company_type === 'buyer'
  const [alertsExpanded, setAlertsExpanded] = useState(true)

  const { data: importAlertsData, refetch: refetchAlerts } = useQuery({
    queryKey: ['import-alerts'],
    queryFn: () => api.get('/catalog/import-alerts/').then(r => r.data),
    enabled: isCixciAdmin,
    refetchInterval: 60000,
  })
  const importAlerts: any[] = importAlertsData?.alerts ?? []

  const dismissAlert = useMutation({
    mutationFn: (id: string) => api.post(`/catalog/import-alerts/${id}/dismiss/`),
    onSuccess: () => refetchAlerts(),
  })

  // Tab state — read initial tab from URL (e.g. ?tab=projection from Device Catalog)
  const [searchParams] = useSearchParams()
  const initialTab = (() => {
    const t = searchParams.get('tab')
    if (t === 'my-compatibility' || t === 'projection') return 'projection'
    if (t === 'api-imports' && isCixciAdmin) return 'api-imports'
    if (t === 'vendor-audit' && user?.is_cixci_admin) return 'vendor-audit'
    if (t === 'missing-devices' && isCixciAdmin) return 'missing-devices'
    return 'products'
  })()
  const [tab, setTab] = useState<string>(initialTab)
  useEffect(() => {
    if (searchParams.get('tab') === 'vendor-audit' && user?.is_cixci_admin) setTab('vendor-audit')
  }, [searchParams, user?.is_cixci_admin])

  // Modal orchestration
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showManageDialog, setShowManageDialog] = useState(false)
  const [showBulkDialog, setShowBulkDialog] = useState(false)
  const [showDropdownDialog, setShowDropdownDialog] = useState(false)
  const [showBatchRevalidate, setShowBatchRevalidate] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [selectedManageProduct, setSelectedManageProduct] = useState<any>(null)
  const [bulkImagesOnly, setBulkImagesOnly] = useState(false)

  // Shared queries
  const { data: dropdownConfigsData, refetch: refetchDropdownConfigs } = useQuery({
    queryKey: ['dropdown-configs'],
    queryFn: () => api.get('/catalog/dropdown-configs/?paginate=false').then(r => r.data),
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

  const { data: activeCompatibilities, refetch: refetchCompatibilities, isFetching: compatibilityLoading, isError: compatibilityError } = useQuery({
    queryKey: ['compatibility', selectedManageProduct?.id],
    queryFn: () => api.get(`/catalog/products/${selectedManageProduct.id}/compatibility/`).then(r => r.data),
    enabled: !!selectedManageProduct && showManageDialog,
  })

  const { data: regionalContext } = useQuery({ queryKey: ['buyer-regional-context', user?.id], enabled: isBuyer,
    queryFn: async () => (await api.get('/tenant/operating-regions/context/')).data })

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
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', maxWidth: { xs: 'calc(100vw - 48px)', md: 'none' } }}>
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
        <>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RuleIcon />}
            onClick={() => setShowBatchRevalidate(true)}
          >
            Batch Revalidate
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<SettingsIcon />}
            onClick={() => setShowDropdownDialog(true)}
          >
            Manage Dropdowns
          </Button>
        </>
      )}
    </Box>
  )

  return (
    <Box>
      <PageHeader title="Product Catalog" actions={headerActions} />

      {isCixciAdmin && importAlerts.length > 0 && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <IconButton size="small" onClick={() => setAlertsExpanded(v => !v)}>
              {alertsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          }
        >
          <AlertTitle>Import Data Quality Alerts ({importAlerts.length})</AlertTitle>
          <Collapse in={alertsExpanded}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
              {importAlerts.map((alert: any) => (
                <Box key={alert.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <Chip
                    size="small"
                    label={
                      alert.event_type === 'catalog.missing_device_reference' ? 'Missing Devices' :
                      alert.event_type === 'catalog.unresolved_category' ? 'Unmapped Categories' :
                      'Unmapped Colors'
                    }
                    color={alert.event_type === 'catalog.missing_device_reference' ? 'error' : 'warning'}
                    sx={{ minWidth: 130, cursor: alert.event_type === 'catalog.missing_device_reference' ? 'pointer' : undefined }}
                    onClick={alert.event_type === 'catalog.missing_device_reference' ? () => setTab('missing-devices') : undefined}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2">{alert.message}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                      {(alert.items || []).slice(0, 10).map((item: string) => (
                        <Chip key={item} label={item} size="small" variant="outlined" />
                      ))}
                      {(alert.items || []).length > 10 && (
                        <Chip label={`+${alert.items.length - 10} more`} size="small" variant="outlined" />
                      )}
                    </Box>
                  </Box>
                  <IconButton size="small" onClick={() => dismissAlert.mutate(alert.id)} title="Dismiss">
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          </Collapse>
        </Alert>
      )}

      {isBuyer && regionalContext?.enforced && regionalContext.status === 'configuration_required' && <Alert severity="warning" sx={{ mb: 2 }}>
        Configuration Required: contact your administrator to review your Entity Operating Region, Vendor eligibility and regional fee setup.
      </Alert>}

      <Tabs
        value={tab}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="All Products" value="products" />
        {isCixciAdmin && <Tab label="API Import Review" value="api-imports" />}
        {user?.is_cixci_admin && <Tab label="Vendor Audit" value="vendor-audit" />}
        {isCixciAdmin && <Tab label="Missing Devices" value="missing-devices" />}
        {isBuyer && <Tab label="My Compatibility" value="projection" />}
        {isBuyer && <Tab label="Added Products" value="export_jobs" />}
      </Tabs>

      {tab === 'api-imports' && isCixciAdmin && <VendorImportReviewTab initialConnection={searchParams.get('connection') || ''} onEditProduct={handleEditProduct}/>}

      {tab === 'missing-devices' && isCixciAdmin && <MissingDevicesTab />}
      {tab === 'vendor-audit' && user?.is_cixci_admin && <VendorAuditTab user={user} dropdownConfigs={dropdownConfigs} />}

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
        onSaved={() => { setShowAddDialog(false); refreshCatalog() }}
        mode="add"
        user={user}
        allowedBrands={allowedBrands}
        allowedCategories={allowedCategories}
        allowedColors={allowedColors}
        devices={devices}
        deviceTypes={deviceTypes}
        dropdownConfigs={dropdownConfigs}
      />

      <ProductFormDialog
        open={showEditDialog}
        onClose={() => { setShowEditDialog(false); setEditingProduct(null) }}
        onSaved={() => { setShowEditDialog(false); setEditingProduct(null); refreshCatalog() }}
        mode="edit"
        product={editingProduct}
        user={user}
        allowedBrands={allowedBrands}
        allowedCategories={allowedCategories}
        allowedColors={allowedColors}
        devices={devices}
        deviceTypes={deviceTypes}
        activeCompatibilities={activeCompatibilities}
        dropdownConfigs={dropdownConfigs}
      />

      <ManageProductDialog
        open={showManageDialog}
        onClose={() => { setShowManageDialog(false); setSelectedManageProduct(null) }}
        product={selectedManageProduct}
        user={user}
        onProductUpdated={refreshCatalog}
        onEditProduct={handleEditProduct}
        devices={devices}
        activeCompatibilities={activeCompatibilities || []}
        refetchCompatibilities={refetchCompatibilities}
        compatibilityLoading={compatibilityLoading}
        compatibilityError={compatibilityError}
      />

      <BulkUploadDialog
        open={showBulkDialog}
        onClose={() => { setShowBulkDialog(false); setBulkImagesOnly(false) }}
        onUploaded={refreshCatalog}
        user={user}
        allowedCategories={allowedCategories}
        allowedColors={allowedColors}
        allowedBrands={allowedBrands}
        dropdownsLoaded={dropdownsLoaded}
        imagesOnly={bulkImagesOnly}
      />

      <DropdownManagerDialog
        open={showDropdownDialog}
        onClose={() => setShowDropdownDialog(false)}
        dropdownConfigs={dropdownConfigs}
        onConfigChanged={() => refetchDropdownConfigs()}
      />

      <BatchRevalidateDialog
        open={showBatchRevalidate}
        onClose={() => setShowBatchRevalidate(false)}
        categories={allowedCategories}
      />

      <ConfirmDialog {...dialogProps} />
    </Box>
  )
}
