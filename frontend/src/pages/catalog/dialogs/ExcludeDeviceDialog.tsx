import { useState, useEffect, useCallback } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import LinearProgress from '@mui/material/LinearProgress'
import CloseIcon from '@mui/icons-material/Close'
import api from '../../../lib/apiClient'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ExcludeDeviceDialogProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  product: any
  device: any
}

const EXCLUSION_REASONS = [
  { value: 'physical_mismatch', label: 'Physical Mismatch' },
  { value: 'electronic_incompatibility', label: 'Electronic Incompatibility' },
  { value: 'vendor_request', label: 'Vendor Request' },
  { value: 'other', label: 'Other' },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ExcludeDeviceDialog({
  open,
  onClose,
  onSaved,
  product,
  device,
}: ExcludeDeviceDialogProps) {
  const [exclusionReason, setExclusionReason] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setExclusionReason('')
      setNotes('')
      setSaving(false)
      setError(null)
    }
  }, [open])

  const handleSubmit = useCallback(async () => {
    if (!exclusionReason) {
      setError('Please select an exclusion reason.')
      return
    }
    if (!product?.id || !device?.id) {
      setError('Product and device are required.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      await api.post(`/catalog/products/${product.id}/compatibility/`, {
        action: 'exclude',
        device_reference: device.id,
        exclusion_reason: exclusionReason,
        notes,
      })
      onSaved()
      onClose()
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Failed to save exclusion'
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setSaving(false)
    }
  }, [exclusionReason, notes, product, device, onSaved, onClose])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Exclude Device
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          {/* Context info */}
          <Box>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Product: <strong>{product?.name || product?.sku || 'Unknown'}</strong>
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Device: <strong>{device?.name || device?.model || device?.id || 'Unknown'}</strong>
            </Typography>
          </Box>

          {/* Exclusion reason */}
          <FormControl fullWidth size="small" required>
            <InputLabel>Exclusion Reason</InputLabel>
            <Select
              value={exclusionReason}
              label="Exclusion Reason"
              onChange={(e) => setExclusionReason(e.target.value)}
            >
              {EXCLUSION_REASONS.map((r) => (
                <MenuItem key={r.value} value={r.value}>
                  {r.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Notes */}
          <TextField
            label="Notes"
            multiline
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
            size="small"
            placeholder="Optional notes about this exclusion..."
          />

          {/* Error */}
          {error && <Alert severity="error">{error}</Alert>}
          {saving && <LinearProgress />}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleSubmit}
          disabled={saving || !exclusionReason}
        >
          {saving ? 'Saving...' : 'Exclude Device'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
