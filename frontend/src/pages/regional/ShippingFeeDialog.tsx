import { useState, useEffect } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Stack from '@mui/material/Stack'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import api from '../../lib/apiClient'
import { useSnackbar } from '../../components/feedback/SnackbarProvider'
import { useAuthStore } from '../../stores/authStore'

const FEE_TYPES = [
  { value: 'flat', label: 'Flat Rate' },
  { value: 'per_unit', label: 'Per Unit' },
  { value: 'percentage', label: 'Percentage of Order' },
]

const STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'superseded', label: 'Superseded' },
  { value: 'retired', label: 'Retired' },
]

interface ShippingFeeDialogProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editItem?: any | null
}

export default function ShippingFeeDialog({ open, onClose, onSaved, editItem }: ShippingFeeDialogProps) {
  const { showSnackbar } = useSnackbar()
  const { user } = useAuthStore()
  const [submitting, setSubmitting] = useState(false)

  const [regionCode, setRegionCode] = useState('')
  const [feeAmount, setFeeAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [feeType, setFeeType] = useState('flat')
  const [status, setStatus] = useState('draft')
  const [effectiveFrom, setEffectiveFrom] = useState('')
  const [effectiveTo, setEffectiveTo] = useState('')

  useEffect(() => {
    if (open) {
      if (editItem) {
        setRegionCode(editItem.region_code || '')
        setFeeAmount(editItem.fee_amount || '')
        setCurrency(editItem.currency || 'USD')
        setFeeType(editItem.fee_type || 'flat')
        setStatus(editItem.status || 'draft')
        setEffectiveFrom(editItem.effective_from ? editItem.effective_from.slice(0, 16) : '')
        setEffectiveTo(editItem.effective_to ? editItem.effective_to.slice(0, 16) : '')
      } else {
        setRegionCode('')
        setFeeAmount('')
        setCurrency('USD')
        setFeeType('flat')
        setStatus('draft')
        setEffectiveFrom('')
        setEffectiveTo('')
      }
    }
  }, [open, editItem])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!regionCode || !feeAmount) {
      showSnackbar('Region code and fee amount are required', 'error')
      return
    }

    setSubmitting(true)
    try {
      const payload: Record<string, any> = {
        region_code: regionCode,
        fee_amount: feeAmount,
        currency,
        fee_type: feeType,
        status,
        effective_from: effectiveFrom || undefined,
        effective_to: effectiveTo || undefined,
      }

      if (!editItem) {
        payload.vendor_company_reference = user?.company_id
      }

      if (editItem) {
        await api.put(`/pricing/shipping-fees/${editItem.id}/`, payload)
        showSnackbar('Shipping fee updated', 'success')
      } else {
        await api.post('/pricing/shipping-fees/', payload)
        showSnackbar('Shipping fee created', 'success')
      }
      onSaved()
      onClose()
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.error || 'Failed to save shipping fee'
      showSnackbar(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{editItem ? 'Edit Shipping Fee' : 'Create Shipping Fee'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
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
              label="Fee Amount"
              required
              fullWidth
              size="small"
              type="number"
              slotProps={{ htmlInput: { step: '0.01', min: '0' } }}
              value={feeAmount}
              onChange={(e) => setFeeAmount(e.target.value)}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Currency"
                fullWidth
                size="small"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                slotProps={{ htmlInput: { maxLength: 3 } }}
              />
              <FormControl size="small" fullWidth>
                <InputLabel>Fee Type</InputLabel>
                <Select value={feeType} onChange={(e) => setFeeType(e.target.value)} label="Fee Type">
                  {FEE_TYPES.map((ft) => (
                    <MenuItem key={ft.value} value={ft.value}>{ft.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            <FormControl size="small" fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={status} onChange={(e) => setStatus(e.target.value)} label="Status">
                {STATUSES.map((s) => (
                  <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Effective From"
                type="datetime-local"
                fullWidth
                size="small"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Effective To"
                type="datetime-local"
                fullWidth
                size="small"
                value={effectiveTo}
                onChange={(e) => setEffectiveTo(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Saving...' : editItem ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
