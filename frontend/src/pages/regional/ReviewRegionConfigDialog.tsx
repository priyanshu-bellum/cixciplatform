import { useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import api from '../../lib/apiClient'
import { useSnackbar } from '../../components/feedback/SnackbarProvider'

interface ReviewRegionConfigDialogProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  dc: { id: string; name: string } | null
}

export default function ReviewRegionConfigDialog({ open, onClose, onSaved, dc }: ReviewRegionConfigDialogProps) {
  const { showSnackbar } = useSnackbar()
  const [submitting, setSubmitting] = useState(false)

  const handleConfirm = async () => {
    if (!dc) return
    setSubmitting(true)
    try {
      await api.post(`/tenant/distribution-centers/${dc.id}/review-region-config/`)
      showSnackbar(`Region config reviewed for '${dc.name}'`, 'success')
      onSaved()
      onClose()
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.error || 'Failed to review region config'
      showSnackbar(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Review Region Configuration</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2">
          Mark region configuration as reviewed for distribution center <strong>'{dc?.name}'</strong>?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          This will clear the region configuration review flag for this DC.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleConfirm} disabled={submitting}>
          {submitting ? 'Reviewing...' : 'Confirm Review'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
