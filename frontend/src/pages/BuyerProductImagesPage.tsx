import { useState, useMemo, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import CircularProgress from '@mui/material/CircularProgress'
import Checkbox from '@mui/material/Checkbox'
import Tooltip from '@mui/material/Tooltip'
import SearchIcon from '@mui/icons-material/Search'
import ImageIcon from '@mui/icons-material/ImageOutlined'
import DownloadIcon from '@mui/icons-material/Download'
import FolderZipIcon from '@mui/icons-material/FolderZip'
import CloseIcon from '@mui/icons-material/Close'
import VisibilityIcon from '@mui/icons-material/Visibility'
import StarIcon from '@mui/icons-material/Star'
import JSZip from 'jszip'
import api from '../lib/apiClient'
import { getImageUrl } from '../lib/formatters'
import { Pagination } from '../components/Pagination'

const PAGE_SIZE = 25

interface ProductRow {
  id: string
  name: string
  sku: string
  upc: string
  brand: string
  vendor_name: string
  product_category: string
  selling_status: string
  status: string
  primary_image_url: string
  image_count: number
}

interface ImageItem {
  id: string
  filename: string
  is_primary: boolean
  image_type: string
  width: number | null
  height: number | null
  file_size_bytes: number | null
  display_order: number
  alt_text: string
  url: string
}

export default function BuyerProductImagesPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [filterBrand, setFilterBrand] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [galleryProduct, setGalleryProduct] = useState<ProductRow | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { setPage(1) }, [debouncedSearch, filterBrand, filterCategory])

  const params = useMemo(() => ({
    search: debouncedSearch || undefined,
    brand: filterBrand || undefined,
    product_category: filterCategory || undefined,
    page,
    page_size: PAGE_SIZE,
  }), [debouncedSearch, filterBrand, filterCategory, page])

  const { data: dropdownData } = useQuery({
    queryKey: ['dropdown-configs'],
    queryFn: () => api.get('/catalog/dropdown-configs/').then(r => r.data),
  })
  const dropdownConfigs = Array.isArray(dropdownData) ? dropdownData : (dropdownData?.results ?? [])
  const brandOptions: string[] = dropdownConfigs.filter((c: any) => c.field_name === 'brand').map((c: any) => c.value)
  const categoryOptions: string[] = dropdownConfigs.filter((c: any) => c.field_name === 'product_category').map((c: any) => c.value)

  const { data, isLoading } = useQuery({
    queryKey: ['buyer-product-images', params],
    queryFn: () => api.get('/media/buyer-product-images/', { params }).then(r => r.data),
  })

  const products: ProductRow[] = data?.results ?? (Array.isArray(data) ? data : [])
  const totalProducts = data?.count ?? products.length
  const totalPages = Math.max(1, Math.ceil(totalProducts / PAGE_SIZE))

  const { data: galleryData, isLoading: galleryLoading } = useQuery({
    queryKey: ['buyer-product-images', galleryProduct?.id, 'images'],
    queryFn: () => api.get(`/media/buyer-product-images/${galleryProduct!.id}/images/`).then(r => r.data),
    enabled: !!galleryProduct,
  })

  const images: ImageItem[] = galleryData?.images ?? []

  const handleDownloadImage = useCallback(async (productId: string, assetId: string, filename: string) => {
    setDownloading(assetId)
    try {
      const resp = await api.get(`/media/buyer-product-images/${productId}/download-image/${assetId}/`, {
        responseType: 'blob',
      })
      const contentType = String(resp.headers['content-type'] || 'image/png')
      const blob = new Blob([resp.data], { type: contentType })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch {
      console.error('Download failed')
    } finally {
      setDownloading(null)
    }
  }, [])

  const handleDownloadAll = useCallback(async (product: ProductRow) => {
    setDownloading(`zip-${product.id}`)
    try {
      const resp = await api.get(`/media/buyer-product-images/${product.id}/download-all/`, {
        responseType: 'blob',
      })
      const blob = new Blob([resp.data], { type: 'application/zip' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${product.sku}_images.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch {
      console.error('ZIP download failed')
    } finally {
      setDownloading(null)
    }
  }, [])

  const handleDownloadSelected = useCallback(async (product: ProductRow, selected: Set<string>, imageList: ImageItem[]) => {
    if (selected.size === 0) return
    setDownloading('zip-selected')
    try {
      const zip = new JSZip()
      const toDownload = imageList.filter(img => selected.has(img.id))
      await Promise.all(toDownload.map(async (img) => {
        const resp = await api.get(`/media/buyer-product-images/${product.id}/download-image/${img.id}/`, {
          responseType: 'blob',
        })
        zip.file(img.filename, resp.data)
      }))
      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${product.sku}_selected_images.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch {
      console.error('Selected download failed')
    } finally {
      setDownloading(null)
    }
  }, [])

  const toggleImageSelection = useCallback((id: string) => {
    setSelectedImages(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>Product Images</Typography>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Search by name, SKU, UPC, or brand..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ minWidth: 280, flex: 1, maxWidth: 420 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            },
          }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Brand</InputLabel>
          <Select value={filterBrand} label="Brand" onChange={e => setFilterBrand(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {brandOptions.map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Category</InputLabel>
          <Select value={filterCategory} label="Category" onChange={e => setFilterCategory(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {categoryOptions.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      {/* Table */}
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 56 }}>Image</TableCell>
              <TableCell>Product</TableCell>
              <TableCell>SKU</TableCell>
              <TableCell>Brand</TableCell>
              <TableCell>Category</TableCell>
              <TableCell align="center">Images</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton variant="rounded" width={40} height={40} /></TableCell>
                  <TableCell><Skeleton width="70%" /></TableCell>
                  <TableCell><Skeleton width="60%" /></TableCell>
                  <TableCell><Skeleton width="50%" /></TableCell>
                  <TableCell><Skeleton width="50%" /></TableCell>
                  <TableCell align="center"><Skeleton width={30} sx={{ mx: 'auto' }} /></TableCell>
                  <TableCell />
                </TableRow>
              ))
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: 'center', py: 6 }}>
                  <ImageIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary">
                    {debouncedSearch ? 'No products match your search.' : 'No products available.'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              products.map(p => (
                <TableRow key={p.id} hover>
                  <TableCell>
                    {p.primary_image_url ? (
                      <img
                        src={getImageUrl(p.primary_image_url)}
                        alt={p.name}
                        style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 4 }}
                      />
                    ) : (
                      <Box sx={{
                        width: 40, height: 40, bgcolor: 'action.hover', borderRadius: 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <ImageIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 220 }}>{p.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{p.sku}</Typography>
                  </TableCell>
                  <TableCell>{p.brand}</TableCell>
                  <TableCell>{p.product_category || '—'}</TableCell>
                  <TableCell align="center">
                    <Chip label={p.image_count} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <Tooltip title="View Images">
                        <IconButton
                          size="small"
                          onClick={() => { setSelectedImages(new Set()); setGalleryProduct(p) }}
                          disabled={p.image_count === 0}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Download All (ZIP)">
                        <IconButton
                          size="small"
                          onClick={() => handleDownloadAll(p)}
                          disabled={p.image_count === 0 || downloading === `zip-${p.id}`}
                        >
                          {downloading === `zip-${p.id}` ? (
                            <CircularProgress size={18} />
                          ) : (
                            <FolderZipIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Box>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={totalProducts}
        pageSize={PAGE_SIZE}
        onPageChange={p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
        itemName="products"
      />

      {/* Image Gallery Dialog */}
      <Dialog
        open={!!galleryProduct}
        onClose={() => setGalleryProduct(null)}
        maxWidth="md"
        fullWidth
      >
        {galleryProduct && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>{galleryProduct.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  SKU: {galleryProduct.sku}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {selectedImages.size > 0 && (
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={downloading === 'zip-selected' ? <CircularProgress size={16} /> : <DownloadIcon />}
                    onClick={() => handleDownloadSelected(galleryProduct, selectedImages, images)}
                    disabled={downloading === 'zip-selected'}
                  >
                    Download {selectedImages.size} Selected
                  </Button>
                )}
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={downloading === `zip-${galleryProduct.id}` ? <CircularProgress size={16} /> : <FolderZipIcon />}
                  onClick={() => handleDownloadAll(galleryProduct)}
                  disabled={downloading === `zip-${galleryProduct.id}` || images.length === 0}
                >
                  Download All
                </Button>
                <IconButton onClick={() => setGalleryProduct(null)} size="small">
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              {galleryLoading ? (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 2 }}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} variant="rounded" height={200} />
                  ))}
                </Box>
              ) : images.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <ImageIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary">No images available for this product.</Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 2 }}>
                  {images.map(img => (
                    <Box
                      key={img.id}
                      sx={{
                        border: 1,
                        borderColor: selectedImages.has(img.id) ? 'primary.main' : img.is_primary ? 'primary.main' : 'divider',
                        borderRadius: 2,
                        overflow: 'hidden',
                        position: 'relative',
                        bgcolor: selectedImages.has(img.id) ? 'action.selected' : 'transparent',
                      }}
                    >
                      <Checkbox
                        size="small"
                        checked={selectedImages.has(img.id)}
                        onChange={() => toggleImageSelection(img.id)}
                        sx={{ position: 'absolute', top: 4, right: 4, zIndex: 2, bgcolor: 'background.paper', borderRadius: 1, p: 0.25 }}
                      />
                      {img.is_primary && (
                        <Chip
                          icon={<StarIcon sx={{ fontSize: '14px !important' }} />}
                          label="Primary"
                          size="small"
                          color="primary"
                          sx={{ position: 'absolute', top: 8, left: 8, zIndex: 1 }}
                        />
                      )}
                      <Box sx={{
                        height: 180,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'action.hover',
                        p: 1,
                      }}>
                        <img
                          src={getImageUrl(img.url)}
                          alt={img.alt_text || img.filename}
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        />
                      </Box>
                      <Box sx={{ p: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                          <Typography variant="caption" noWrap sx={{ flex: 1 }}>
                            {img.filename}
                          </Typography>
                          {img.image_type && (
                            <Chip label={img.image_type} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                          )}
                        </Box>
                        {img.width && img.height && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            {img.width} x {img.height}
                            {img.file_size_bytes ? ` · ${(img.file_size_bytes / 1024).toFixed(0)} KB` : ''}
                          </Typography>
                        )}
                        <Button
                          size="small"
                          variant="outlined"
                          fullWidth
                          startIcon={downloading === img.id ? <CircularProgress size={14} /> : <DownloadIcon />}
                          disabled={downloading === img.id}
                          onClick={() => handleDownloadImage(galleryProduct.id, img.id, img.filename)}
                          sx={{ textTransform: 'none' }}
                        >
                          Download PNG
                        </Button>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  )
}
