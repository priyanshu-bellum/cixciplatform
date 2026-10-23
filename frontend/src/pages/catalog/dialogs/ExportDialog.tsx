import { useState, useEffect, useCallback } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import CloseIcon from '@mui/icons-material/Close'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import api from '../../../lib/apiClient'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ExportDialogProps {
  open: boolean
  onClose: () => void
  onExported: () => void
  selectedProductIds: string[]
  tab: string
}

const FORMAT_OPTIONS = [
  { value: 'csv', label: 'CSV' },
  { value: 'xlsx', label: 'XLSX (Excel)' },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ExportDialog({
  open,
  onClose,
  onExported,
  selectedProductIds,
  tab,
}: ExportDialogProps) {
  const [format, setFormat] = useState('csv')
  const [includeIncompatible, setIncludeIncompatible] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setFormat('csv')
      setIncludeIncompatible(false)
      setExporting(false)
      setError(null)
      setSuccess(null)
    }
  }, [open])

  const handleExport = useCallback(async () => {
    setExporting(true)
    setError(null)
    setSuccess(null)

    try {
      const payload: Record<string, any> = {
        format,
        include_incompatible: includeIncompatible,
        product_ids: selectedProductIds,
      }

      await api.post('/catalog/export-jobs/create_job/', payload)

      setSuccess('Export job created successfully. You will be notified when it is ready.')
      onExported()
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Failed to create export job'
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setExporting(false)
    }
  }, [format, includeIncompatible, selectedProductIds, onExported])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FileDownloadIcon />
          Export Products
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          {/* Selection info */}
          <Typography variant="body2" color="textSecondary">
            {selectedProductIds.length > 0
              ? `${selectedProductIds.length} product(s) selected for export from the "${tab}" tab.`
              : `All products in the "${tab}" tab will be exported.`}
          </Typography>

          {/* Format select */}
          <FormControl fullWidth size="small">
            <InputLabel>Export Format</InputLabel>
            <Select
              value={format}
              label="Export Format"
              onChange={(e) => setFormat(e.target.value)}
            >
              {FORMAT_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Include incompatible checkbox */}
          <FormControlLabel
            control={
              <Checkbox
                checked={includeIncompatible}
                onChange={(e) => setIncludeIncompatible(e.target.checked)}
              />
            }
            label="Include incompatible products"
          />

          {/* Status messages */}
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}
          {exporting && <LinearProgress />}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} disabled={exporting}>
          {success ? 'Close' : 'Cancel'}
        </Button>
        {!success && (
          <Button
            variant="contained"
            onClick={handleExport}
            disabled={exporting}
            startIcon={<FileDownloadIcon />}
          >
            {exporting ? 'Creating Job...' : 'Export'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
