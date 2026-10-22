import { useState, useEffect } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Stack from '@mui/material/Stack'
import FormControlLabel from '@mui/material/FormControlLabel'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import FormControl from '@mui/material/FormControl'
import FormLabel from '@mui/material/FormLabel'
import Typography from '@mui/material/Typography'
import api from '../../lib/apiClient'
import { useSnackbar } from '../../components/feedback/SnackbarProvider'

interface RegionUpdateDialogProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  companyId: string
  companyName?: string
}

export default function RegionUpdateDialog({ open, onClose, onSaved, companyId, companyName }: RegionUpdateDialogProps) {
  const { showSnackbar } = useSnackbar()
  const [submitting, setSubmitting] = useState(false)
  const [action, setAction] = useState<'activate' | 'deactivate'>('activate')
  const [regionCode, setRegionCode] = useState('')
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (open) {
      setAction('activate')
      setRegionCode('')
      setReason('')
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!regionCode) {
      showSnackbar('Region code is required', 'error')
      return
    }

    setSubmitting(true)
    try {
      await api.post(`/tenant/companies/${companyId}/update-regions/`, {
        action,
        region_code: regionCode,
        reason,
      })
      showSnackbar(`Region ${regionCode} ${action}d successfully`, 'success')
      onSaved()
      onClose()
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.error || 'Failed to update region'
      showSnackbar(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Update Region</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {companyName && (
              <Typography variant="body2" color="text.secondary">
                Updating regions for <strong>{companyName}</strong>
              </Typography>
            )}
            <FormControl>
              <FormLabel>Action</FormLabel>
              <RadioGroup
                row
                value={action}
                onChange={(e) => setAction(e.target.value as 'activate' | 'deactivate')}
              >
                <FormControlLabel value="activate" control={<Radio size="small" />} label="Activate" />
                <FormControlLabel value="deactivate" control={<Radio size="small" />} label="Deactivate" />
              </RadioGroup>
            </FormControl>
            <TextField
              label="Region Code"
              required
              fullWidth
              size="small"
              value={regionCode}
              onChange={(e) => setRegionCode(e.target.value)}
              placeholder="e.g. US, EU, APAC"
            />
            <TextField
              label="Reason (optional)"
              fullWidth
              size="small"
              multiline
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this region being activated/deactivated?"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
            color={action === 'deactivate' ? 'error' : 'primary'}
          >
            {submitting ? 'Updating...' : action === 'activate' ? 'Activate Region' : 'Deactivate Region'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
