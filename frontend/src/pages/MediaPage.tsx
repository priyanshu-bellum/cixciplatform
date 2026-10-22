import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import Typography from '@mui/material/Typography'
import LinearProgress from '@mui/material/LinearProgress'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import AddIcon from '@mui/icons-material/Add'
import ImageIcon from '@mui/icons-material/Image'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import PublicIcon from '@mui/icons-material/Public'
import LockIcon from '@mui/icons-material/Lock'
import ArchiveIcon from '@mui/icons-material/Archive'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import WarningIcon from '@mui/icons-material/Warning'
import api from '../lib/apiClient'
import { formatDate } from '../lib/formatters'
import PageHeader from '../components/layout/PageHeader'
import StatusChip from '../components/data-display/StatusChip'
import DataTable, { type Column } from '../components/data-display/DataTable'
import FileUploadField from '../components/forms/FileUploadField'
import { useSnackbar } from '../components/feedback/SnackbarProvider'
import { useConfirmDialog } from '../hooks/useConfirmDialog'
import ConfirmDialog from '../components/feedback/ConfirmDialog'

const ASSET_TYPE_COLOR: Record<string, 'primary' | 'secondary' | 'warning' | 'default'> = {
  product_image: 'primary',
  device_image: 'secondary',
  brand_logo: 'warning',
  document: 'default',
  video: 'default',
  other: 'default',
}

function fmtBytes(b: number | null | undefined) {
  if (b == null) return '\u2014'
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

export default function MediaPage() {
  const [tab, setTab] = useState<'assets' | 'sessions'>('assets')
  const [showModal, setShowModal] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [assetType, setAssetType] = useState('product_image')
  const [ownerModule, setOwnerModule] = useState('catalog')
  const [isPublic, setIsPublic] = useState(false)
  const [altText, setAltText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [showZipModal, setShowZipModal] = useState(false)
  const [zipFile, setZipFile] = useState<File | null>(null)
  const [zipResult, setZipResult] = useState<any>(null)
  // Rule §10: a single upload must attach to the selected product only.
  const [productSearch, setProductSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<{ id: string; sku: string; name: string } | null>(null)
  const [setAsPrimary, setSetAsPrimary] = useState(true)

  const { showSnackbar } = useSnackbar()
  const { confirm, dialogProps } = useConfirmDialog()
  const queryClient = useQueryClient()

  const { data: assetData, isLoading: aLoading, refetch: refetchAssets } = useQuery({
    queryKey: ['media-assets'],
    queryFn: () => api.get('/media/assets/').then(r => r.data),
  })

  const { data: sessionData, isLoading: sLoading, refetch: refetchSessions } = useQuery({
    queryKey: ['upload-sessions'],
    queryFn: () =>
      api.get('/media/upload-sessions/').then(r => r.data),
    enabled: tab === 'sessions',
  })

  // Product search for the single-upload product picker (Rule §10).
  const { data: productSearchData, isFetching: searchingProducts } = useQuery({
    queryKey: ['media-product-search', productSearch],
    queryFn: () =>
      api.get('/catalog/products/', {
        params: { search: productSearch.trim(), page_size: 10 },
      }).then(r => r.data),
    enabled: ownerModule === 'catalog' && productSearch.trim().length >= 2,
  })
  const productMatches: any[] = useMemo(() => {
    const data = productSearchData
    if (!data) return []
    return Array.isArray(data) ? data : (data.results ?? [])
  }, [productSearchData])

  const assets = assetData?.results ?? (Array.isArray(assetData) ? assetData : [])
  const sessions = sessionData?.results ?? (Array.isArray(sessionData) ? sessionData : [])

  const zipUploadMutation = useMutation({
    mutationFn: (formData: FormData) =>
      api.post('/media/assets/upload_zip/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(r => r.data),
    onSuccess: (data) => {
      setZipResult(data)
      showSnackbar(
        `ZIP processed: ${data.matched} matched, ${data.unmatched} unmatched, ${data.failed} failed`,
        data.failed > 0 ? 'warning' : 'success'
      )
      queryClient.invalidateQueries({ queryKey: ['media-assets'] })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || err?.message || 'ZIP upload failed'
      showSnackbar(msg, 'error')
    },
  })

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    // Rule §3: only PNG with a transparent background is allowed.
    if (file.type !== 'image/png' || !/\.png$/i.test(file.name)) {
      setError(`"${file.name}" is not a PNG. Only transparent PNG images are allowed.`)
      return
    }

    setUploading(true)
    setError(null)
    setProgress(15)

    try {
      // 1. Request presigned upload URL from NPS/Media API
      const reqRes = await api.post('/media/assets/request_upload/', {
        filename: file.name,
        mime_type: 'image/png',
        asset_type: assetType,
        owner_module: ownerModule,
        // Rule §10: attach the upload to the selected product only.
        ...(ownerModule === 'catalog' && selectedProduct ? { owner_record_id: selectedProduct.id } : {}),
        is_public: isPublic,
        alt_text: altText.trim() || undefined,
      })

      const { presigned_url, id: assetId, asset: assetIdAlt } = reqRes.data
      const resolvedAssetId = assetId || assetIdAlt
      setProgress(40)

      const isPlaceholder = !presigned_url ||
        presigned_url.includes('placeholder-upload.cixci.com') ||
        presigned_url.includes('placeholder')

      const uploadDirect = async (confirmReplace: boolean) => {
        // 2a. Server-side upload (validates PNG + transparency, sets metadata/status)
        const formData = new FormData()
        formData.append('file', file)
        if (setAsPrimary) formData.append('set_as_primary', 'true')
        if (confirmReplace) formData.append('confirm_replace', 'true')
        await api.post(`/media/assets/${resolvedAssetId}/upload_file/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }

      const uploadPresigned = async (confirmReplace: boolean) => {
        // 2b. Direct binary upload to GCS/S3 presigned PUT URL
        const uploadRes = await fetch(presigned_url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'image/png',
          },
          body: file,
        })

        if (!uploadRes.ok) {
          throw new Error(`Direct upload failed with status ${uploadRes.status}`)
        }

        // 3. Validate the uploaded object server-side before it can be used
        //    (Rule §15/§20) — the client never marks an asset ready itself.
        await api.post(`/media/assets/${resolvedAssetId}/finalize_upload/`, {
          ...(setAsPrimary ? { set_as_primary: 'true' } : {}),
          ...(confirmReplace ? { confirm_replace: 'true' } : {}),
        })
      }

      const run = async (confirmReplace: boolean) =>
        isPlaceholder ? uploadDirect(confirmReplace) : uploadPresigned(confirmReplace)

      try {
        await run(false)
      } catch (err: any) {
        // Rule §16: replacing the primary image of an Active product needs an
        // explicit confirmation.
        if (err?.response?.status === 409 && err?.response?.data?.requires_confirmation) {
          const ok = await confirm({
            title: 'Replace primary image?',
            message: 'This product is Active. Replacing its primary image archives the current image and is recorded in the audit log. Continue?',
            confirmLabel: 'Replace image',
            cancelLabel: 'Cancel',
          })
          if (!ok) {
            throw new Error('Image replacement cancelled. The existing primary image was kept.')
          }
          await run(true)
        } else {
          throw err
        }
      }

      setProgress(100)
      setTimeout(() => {
        setUploading(false)
        setShowModal(false)
        setFile(null)
        setProductSearch('')
        setSelectedProduct(null)
        showSnackbar('Asset uploaded successfully', 'success')
        refetchAssets()
        if (tab === 'sessions') {
          refetchSessions()
        }
      }, 500)
    } catch (err: any) {
      console.error(err)
      setError(err?.message || 'An error occurred during upload.')
      setUploading(false)
    }
  }

  const handleCloseModal = () => {
    if (!uploading) {
      setShowModal(false)
      setFile(null)
      setAltText('')
      setError(null)
      setProductSearch('')
      setSelectedProduct(null)
    }
  }

  const assetColumns: Column<any>[] = useMemo(() => [
    {
      id: 'original_filename',
      label: 'Filename',
      width: 220,
      render: (row: any) => (
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            color: 'text.primary',
            maxWidth: 220,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {row.original_filename}
        </Typography>
      ),
    },
    {
      id: 'asset_type',
      label: 'Type',
      render: (row: any) => (
        <Chip
          label={row.asset_type?.replace(/_/g, ' ')}
          color={ASSET_TYPE_COLOR[row.asset_type] ?? 'default'}
          size="small"
          variant="filled"
        />
      ),
    },
    {
      id: 'status',
      label: 'Status',
      render: (row: any) => <StatusChip status={row.status} />,
    },
    {
      id: 'has_transparency',
      label: 'Transparent',
      render: (row: any) =>
        row.has_transparency ? (
          <Chip
            icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
            label="PNG"
            color="success"
            size="small"
            variant="filled"
          />
        ) : (
          <Chip
            icon={<ErrorIcon sx={{ fontSize: 14 }} />}
            label="No alpha"
            color="error"
            size="small"
            variant="filled"
          />
        ),
    },
    {
      id: 'review_status',
      label: 'Review',
      render: (row: any) => (
        <Chip
          label={(row.review_status ?? 'pending')?.replace(/_/g, ' ')}
          color={
            row.review_status === 'approved'
              ? 'success'
              : row.review_status === 'rejected'
                ? 'error'
                : 'warning'
          }
          size="small"
          variant="filled"
        />
      ),
    },
    {
      id: 'file_size_bytes',
      label: 'Size',
      render: (row: any) => (
        <Typography variant="body2" color="text.secondary">
          {fmtBytes(row.file_size_bytes)}
        </Typography>
      ),
    },
    {
      id: 'owner_module',
      label: 'Owner Module',
      render: (row: any) => (
        <Chip label={row.owner_module ?? '\u2014'} size="small" variant="filled" />
      ),
    },
    {
      id: 'is_public',
      label: 'Access',
      sortable: false,
      render: (row: any) =>
        row.is_public ? (
          <Chip
            icon={<PublicIcon sx={{ fontSize: 14 }} />}
            label="Public"
            color="success"
            size="small"
            variant="filled"
          />
        ) : (
          <Chip
            icon={<LockIcon sx={{ fontSize: 14 }} />}
            label="Private"
            size="small"
            variant="filled"
          />
        ),
    },
    {
      id: 'created_at',
      label: 'Created',
      render: (row: any) => (
        <Typography variant="body2" color="text.secondary">
          {formatDate(row.created_at)}
        </Typography>
      ),
    },
  ], [])

  const sessionColumns: Column<any>[] = useMemo(() => [
    {
      id: 'expected_filename',
      label: 'Expected Filename',
      render: (row: any) => (
        <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
          {row.expected_filename}
        </Typography>
      ),
    },
    {
      id: 'expected_mime_type',
      label: 'MIME Type',
      render: (row: any) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 11 }}>
          {row.expected_mime_type}
        </Typography>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      render: (row: any) => <StatusChip status={row.status} />,
    },
    {
      id: 'expires_at',
      label: 'Expires At',
      render: (row: any) => (
        <Typography
          variant="body2"
          sx={{
            color: row.expires_at && new Date(row.expires_at) < new Date()
              ? 'error.main'
              : 'text.secondary',
          }}
        >
          {row.expires_at ? formatDate(row.expires_at) : '\u2014'}
        </Typography>
      ),
    },
    {
      id: 'completed_at',
      label: 'Completed At',
      render: (row: any) => (
        <Typography variant="body2" color="text.secondary">
          {row.completed_at ? formatDate(row.completed_at) : '\u2014'}
        </Typography>
      ),
    },
  ], [])

  return (
    <Box>
      <PageHeader
        title="Media Assets"
        subtitle="Images, documents, renditions, and upload sessions"
        actions={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<ArchiveIcon />}
              onClick={() => { setShowZipModal(true); setZipResult(null); setZipFile(null) }}
            >
              Upload ZIP
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowModal(true)}
            >
              Upload Asset
            </Button>
          </Box>
        }
      />

      <Tabs
        value={tab}
        onChange={(_, newVal) => setTab(newVal)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Assets" value="assets" />
        <Tab label="Upload Sessions" value="sessions" />
      </Tabs>

      {tab === 'assets' && (
        <DataTable
          columns={assetColumns}
          rows={assets}
          loading={aLoading}
          rowKey={(row: any) => row.id}
          emptyMessage="No media assets"
          emptyIcon={<ImageIcon sx={{ fontSize: 48 }} />}
        />
      )}

      {tab === 'sessions' && (
        <DataTable
          columns={sessionColumns}
          rows={sessions}
          loading={sLoading}
          rowKey={(row: any) => row.id}
          emptyMessage="No upload sessions"
          emptyIcon={<CloudUploadIcon sx={{ fontSize: 48 }} />}
        />
      )}

      {/* Upload Asset Modal */}
      <Dialog
        open={showModal}
        onClose={handleCloseModal}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { component: 'form', onSubmit: handleUploadSubmit } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Upload Media Asset
          <IconButton
            size="small"
            onClick={handleCloseModal}
            disabled={uploading}
            aria-label="close"
          >
            <Box component="span" sx={{ fontSize: 18, lineHeight: 1 }}>&times;</Box>
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ mb: 2.5 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Select File
            </Typography>
            {file ? (
              <Box
                sx={{
                  border: '2px dashed',
                  borderColor: 'primary.main',
                  borderRadius: 2,
                  p: 3,
                  textAlign: 'center',
                  cursor: uploading ? 'default' : 'pointer',
                  bgcolor: 'action.hover',
                  transition: 'all 0.2s',
                }}
                onClick={() => {
                  if (!uploading) setFile(null)
                }}
              >
                <CloudUploadIcon sx={{ fontSize: 36, color: 'primary.main', mb: 1 }} />
                <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-all' }}>
                  {file.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {fmtBytes(file.size)} &mdash; Click to change
                </Typography>
              </Box>
            ) : (
              <FileUploadField
                onFiles={(files) => setFile(files[0] || null)}
                accept=".png"
                label="Click to browse or drag a PNG here"
                disabled={uploading}
              />
            )}
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2.5 }}>
            <TextField
              select
              label="Asset Type"
              size="small"
              value={assetType}
              onChange={(e) => setAssetType(e.target.value)}
              disabled={uploading}
              fullWidth
            >
              <MenuItem value="product_image">Product Image</MenuItem>
              <MenuItem value="device_image">Device Image</MenuItem>
              <MenuItem value="brand_logo">Brand Logo</MenuItem>
              <MenuItem value="document">Document</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </TextField>

            <TextField
              label="Owner Module"
              size="small"
              value={ownerModule}
              onChange={(e) => setOwnerModule(e.target.value)}
              placeholder="e.g., catalog"
              disabled={uploading}
              fullWidth
            />
          </Box>

          <Box sx={{ mb: 2.5 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Attach to product
            </Typography>
            <TextField
              size="small"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search by SKU or product name"
              disabled={uploading}
              fullWidth
              helperText={
                selectedProduct
                  ? `Attached to ${selectedProduct.sku} — ${selectedProduct.name}`
                  : 'A product image must be attached to a product (Rule §10).'
              }
            />
            {searchingProducts && (
              <Typography variant="caption" color="text.secondary">
                Searching…
              </Typography>
            )}
            {!selectedProduct && productMatches.length > 0 && (
              <Box sx={{ mt: 1, maxHeight: 140, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                {productMatches.map((p: any) => (
                  <Box
                    key={p.id}
                    onClick={() => {
                      setSelectedProduct({ id: p.id, sku: p.sku, name: p.name })
                      setProductSearch(p.sku)
                    }}
                    sx={{ px: 1, py: 0.75, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {p.sku}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {p.name}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          <FormControlLabel
            control={
              <Checkbox
                checked={setAsPrimary}
                onChange={(e) => setSetAsPrimary(e.target.checked)}
                disabled={uploading || !selectedProduct}
                size="small"
              />
            }
            label="Set as the product's primary image"
          />

          <TextField
            label="Alt Text (accessibility)"
            size="small"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="Describe the image for screen readers"
            helperText="Required for accessibility review; max 500 chars."
            disabled={uploading}
            fullWidth
            multiline
            minRows={2}
            sx={{ mb: 2.5 }}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                disabled={uploading}
                size="small"
              />
            }
            label={
              <Typography variant="body2">
                Make this asset publicly readable
              </Typography>
            }
            sx={{ mb: 1 }}
          />

          {uploading && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Uploading...
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {progress}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: 'action.hover',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 3,
                    background: (theme) =>
                      `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  },
                }}
              />
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            variant="outlined"
            onClick={() => {
              setShowModal(false)
              setFile(null)
              setError(null)
            }}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!file || uploading}
          >
            {uploading ? 'Uploading...' : 'Start Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ZIP Upload Modal */}
      <Dialog
        open={showZipModal}
        onClose={() => { if (!zipUploadMutation.isPending) { setShowZipModal(false); setZipResult(null); setZipFile(null) } }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Bulk ZIP Image Upload
          <IconButton
            size="small"
            onClick={() => { setShowZipModal(false); setZipResult(null); setZipFile(null) }}
            disabled={zipUploadMutation.isPending}
            aria-label="close"
          >
            <Box component="span" sx={{ fontSize: 18, lineHeight: 1 }}>&times;</Box>
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {!zipResult && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                Upload a ZIP file containing product images. Files should be PNG format.
                Images are matched to products by SKU in the filename (e.g., <strong>PP-211_Main_1.png</strong> or <strong>PP-211.png</strong>).
              </Alert>

              {zipUploadMutation.isError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {(zipUploadMutation.error as any)?.response?.data?.error || (zipUploadMutation.error as any)?.message || 'ZIP upload failed'}
                </Alert>
              )}

              {zipFile ? (
                <Box
                  sx={{
                    border: '2px dashed',
                    borderColor: 'primary.main',
                    borderRadius: 2,
                    p: 4,
                    textAlign: 'center',
                    cursor: zipUploadMutation.isPending ? 'default' : 'pointer',
                    bgcolor: 'action.hover',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => { if (!zipUploadMutation.isPending) setZipFile(null) }}
                >
                  <ArchiveIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, wordBreak: 'break-all' }}>
                    {zipFile.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {fmtBytes(zipFile.size)} &mdash; Click to change
                  </Typography>
                </Box>
              ) : (
                <Box
                  sx={{
                    border: '2px dashed',
                    borderColor: 'divider',
                    borderRadius: 2,
                    p: 4,
                    textAlign: 'center',
                    cursor: 'pointer',
                    '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                    transition: 'all 0.2s',
                  }}
                  onClick={() => document.getElementById('zip-file-input')?.click()}
                >
                  <CloudUploadIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    Click to browse or drag a .zip file here
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    PNG files only, max 100 MB ZIP, max 10 MB per image
                  </Typography>
                  <input
                    id="zip-file-input"
                    type="file"
                    accept=".zip"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) setZipFile(f)
                    }}
                  />
                </Box>
              )}

              {zipUploadMutation.isPending && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                    Processing ZIP archive...
                  </Typography>
                  <LinearProgress sx={{ height: 6, borderRadius: 3 }} />
                </Box>
              )}
            </>
          )}

          {zipResult && (
            <Box>
              {/* Summary cards */}
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Box sx={{ flex: 1, p: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>{zipResult.total_files}</Typography>
                  <Typography variant="caption" color="text.secondary">Total Files</Typography>
                </Box>
                <Box sx={{ flex: 1, p: 2, bgcolor: 'success.main', color: 'success.contrastText', borderRadius: 1, textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>{zipResult.matched}</Typography>
                  <Typography variant="caption">Matched to Products</Typography>
                </Box>
                <Box sx={{ flex: 1, p: 2, bgcolor: 'warning.main', color: 'warning.contrastText', borderRadius: 1, textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>{zipResult.unmatched}</Typography>
                  <Typography variant="caption">No SKU Match</Typography>
                </Box>
                <Box sx={{ flex: 1, p: 2, bgcolor: 'error.main', color: 'error.contrastText', borderRadius: 1, textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>{zipResult.failed}</Typography>
                  <Typography variant="caption">Failed Validation</Typography>
                </Box>
              </Box>

              {/* Per-file results table */}
              <Typography variant="subtitle2" sx={{ mb: 1 }}>File Results</Typography>
              <TableContainer sx={{ maxHeight: 350, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Filename</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Matched SKU</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Details</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {zipResult.results?.map((r: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell>
                          {r.status === 'matched' && <CheckCircleIcon color="success" fontSize="small" />}
                          {r.status === 'unmatched' && <WarningIcon color="warning" fontSize="small" />}
                          {r.status === 'failed' && <ErrorIcon color="error" fontSize="small" />}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 11 }}>{r.filename}</Typography>
                        </TableCell>
                        <TableCell>
                          {r.product_sku ? (
                            <Chip label={r.product_sku} size="small" color="success" variant="outlined" />
                          ) : (
                            <Typography variant="body2" color="text.disabled">—</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color={r.status === 'failed' ? 'error.main' : 'text.secondary'}>
                            {r.reason || (r.status === 'matched' ? 'Matched to product' : 'No product with this SKU')}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            variant="outlined"
            onClick={() => { setShowZipModal(false); setZipResult(null); setZipFile(null) }}
            disabled={zipUploadMutation.isPending}
          >
            {zipResult ? 'Close' : 'Cancel'}
          </Button>
          {!zipResult && (
            <Button
              variant="contained"
              disabled={!zipFile || zipUploadMutation.isPending}
              onClick={() => {
                const fd = new FormData()
                fd.append('file', zipFile!)
                zipUploadMutation.mutate(fd)
              }}
            >
              {zipUploadMutation.isPending ? 'Processing...' : 'Upload ZIP'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <ConfirmDialog {...dialogProps} />
    </Box>
  )
}
