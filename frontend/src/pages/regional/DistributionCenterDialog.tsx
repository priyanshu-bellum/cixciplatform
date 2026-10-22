import { useState, useEffect, useCallback } from 'react'
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
import Typography from '@mui/material/Typography'
import api from '../../lib/apiClient'
import { useSnackbar } from '../../components/feedback/SnackbarProvider'
import { useAuthStore } from '../../stores/authStore'
import AddressAutocomplete, { type ParsedAddress } from '../../components/AddressAutocomplete'

const DC_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'retired', label: 'Retired' },
]

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
]

interface DistributionCenterDialogProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editItem?: any | null
}

export default function DistributionCenterDialog({ open, onClose, onSaved, editItem }: DistributionCenterDialogProps) {
  const { showSnackbar } = useSnackbar()
  const { user } = useAuthStore()
  const [submitting, setSubmitting] = useState(false)

  const [name, setName] = useState('')
  const [status, setStatus] = useState('draft')
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [countryCode, setCountryCode] = useState('US')
  const [regionCode, setRegionCode] = useState('')

  useEffect(() => {
    if (open) {
      if (editItem) {
        setName(editItem.name || '')
        setStatus(editItem.status || 'draft')
        setAddressLine1(editItem.address_line1 || '')
        setAddressLine2(editItem.address_line2 || '')
        setCity(editItem.city || '')
        setState(editItem.state || '')
        setZipCode(editItem.zip_code || '')
        setCountryCode(editItem.country_code || 'US')
        setRegionCode(editItem.region_code || '')
      } else {
        setName('')
        setStatus('draft')
        setAddressLine1('')
        setAddressLine2('')
        setCity('')
        setState('')
        setZipCode('')
        setCountryCode('US')
        setRegionCode('')
      }
    }
  }, [open, editItem])

  const handleAddressSelect = useCallback((parsed: ParsedAddress) => {
    setAddressLine1(parsed.address1)
    setCity(parsed.city)
    setState(parsed.state)
    setZipCode(parsed.zip)
    setCountryCode(parsed.country || 'US')
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) {
      showSnackbar('Name is required', 'error')
      return
    }

    setSubmitting(true)
    try {
      const payload: Record<string, any> = {
        name,
        status,
        address_line1: addressLine1,
        address_line2: addressLine2,
        city,
        state,
        zip_code: zipCode,
        country_code: countryCode,
        region_code: regionCode,
      }

      if (!editItem) {
        payload.vendor_company = user?.company_id
      }

      if (editItem) {
        await api.put(`/tenant/distribution-centers/${editItem.id}/`, payload)
        showSnackbar('Distribution center updated', 'success')
      } else {
        await api.post('/tenant/distribution-centers/', payload)
        showSnackbar('Distribution center created', 'success')
      }
      onSaved()
      onClose()
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.error || 'Failed to save distribution center'
      showSnackbar(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{editItem ? 'Edit Distribution Center' : 'Create Distribution Center'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              required
              fullWidth
              size="small"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. East Coast Warehouse"
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={status} onChange={(e) => setStatus(e.target.value)} label="Status">
                {DC_STATUSES.map((s) => (
                  <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Typography variant="caption" color="text.secondary">Address</Typography>
            <AddressAutocomplete
              value={addressLine1}
              onChange={setAddressLine1}
              onSelect={handleAddressSelect}
              placeholder="Start typing address..."
              style={{
                width: '100%',
                padding: '8.5px 14px',
                fontSize: '0.875rem',
                border: '1px solid rgba(0,0,0,0.23)',
                borderRadius: 4,
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
            <TextField
              label="Address Line 2"
              fullWidth
              size="small"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              placeholder="Suite, unit, floor, etc."
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="City"
                fullWidth
                size="small"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <FormControl size="small" fullWidth>
                <InputLabel>State</InputLabel>
                <Select value={state} onChange={(e) => setState(e.target.value)} label="State">
                  <MenuItem value=""><em>Select</em></MenuItem>
                  {US_STATES.map((s) => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                label="ZIP Code"
                fullWidth
                size="small"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
              />
              <TextField
                label="Country Code"
                fullWidth
                size="small"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
                inputProps={{ maxLength: 3 }}
              />
            </Stack>
            <TextField
              label="Region Code"
              fullWidth
              size="small"
              value={regionCode}
              onChange={(e) => setRegionCode(e.target.value)}
              placeholder="e.g. US, EU, APAC"
            />
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
