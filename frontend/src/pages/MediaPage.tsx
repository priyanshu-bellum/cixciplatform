import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import AddIcon from '@mui/icons-material/Add'
import ImageIcon from '@mui/icons-material/Image'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import PublicIcon from '@mui/icons-material/Public'
import LockIcon from '@mui/icons-material/Lock'
import api from '../lib/apiClient'
import { formatDate } from '../lib/formatters'
import PageHeader from '../components/layout/PageHeader'
import StatusChip from '../components/data-display/StatusChip'
import DataTable, { type Column } from '../components/data-display/DataTable'
import FileUploadField from '../components/forms/FileUploadField'
import { useSnackbar } from '../components/feedback/SnackbarProvider'

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
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const { showSnackbar } = useSnackbar()

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

  const assets = assetData?.results ?? (Array.isArray(assetData) ? assetData : [])
  const sessions = sessionData?.results ?? (Array.isArray(sessionData) ? sessionData : [])

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setUploading(true)
    setError(null)
    setProgress(15)

    try {
      // 1. Request presigned upload URL from NPS/Media API
      const reqRes = await api.post('/media/assets/request_upload/', {
        filename: file.name,
        mime_type: file.type || 'application/octet-stream',
        asset_type: assetType,
        owner_module: ownerModule,
        is_public: isPublic,
      })

      const { presigned_url, asset: assetId } = reqRes.data
      setProgress(40)

      // 2. Perform direct binary upload to GCS/S3 presigned PUT URL
      const uploadRes = await fetch(presigned_url, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      })

      if (!uploadRes.ok) {
        throw new Error(`Direct upload failed with status ${uploadRes.status}`)
      }

      setProgress(85)

      // 3. Inform backend the asset is ready for consumption
      await api.patch(`/media/assets/${assetId}/`, {
        status: 'ready',
        file_size_bytes: file.size,
      })

      setProgress(100)
      setTimeout(() => {
        setUploading(false)
        setShowModal(false)
        setFile(null)
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
      setError(null)
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
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowModal(true)}
          >
            Upload Asset
          </Button>
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
                label="Click to browse or drag file here"
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
    </Box>
  )
}
