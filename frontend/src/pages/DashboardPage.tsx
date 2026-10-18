import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts'

// MUI components
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Divider from '@mui/material/Divider'

// MUI Icons
import SmartphoneIcon from '@mui/icons-material/Smartphone'
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag'
import InventoryIcon from '@mui/icons-material/Inventory'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import PeopleIcon from '@mui/icons-material/People'
import BusinessIcon from '@mui/icons-material/Business'
import ShieldIcon from '@mui/icons-material/Shield'
import CloseIcon from '@mui/icons-material/Close'
import DescriptionIcon from '@mui/icons-material/Description'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import UploadIcon from '@mui/icons-material/Upload'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import AccessTimeIcon from '@mui/icons-material/AccessTime'

// Shared components and utilities
import api from '../lib/apiClient'
import { useAuthStore } from '../stores/authStore'
import AddressAutocomplete from '../components/AddressAutocomplete'
import PageHeader from '../components/layout/PageHeader'
import StatCard from '../components/data-display/StatCard'
import StatusChip from '../components/data-display/StatusChip'
import ConfirmDialog from '../components/feedback/ConfirmDialog'
import { useConfirmDialog } from '../hooks/useConfirmDialog'
import { useSnackbar } from '../components/feedback/SnackbarProvider'
import { formatCurrency, formatDate } from '../lib/formatters'
import { US_STATES } from '../lib/constants'

// ─── AM/PM Time Picker ──────────────────────────────────────────────────────
function AmPmTimePicker({ value, onChange, allowEmpty }: { value: string; onChange: (v: string) => void; allowEmpty?: boolean }) {
  const parseTime = (v: string) => {
    if (!v || v === '--:--') return { hour: '', minute: '00', ampm: 'AM' }
    const [h, m] = v.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    return { hour: String(hour12), minute: String(m).padStart(2, '0'), ampm }
  }
  const { hour, minute, ampm } = parseTime(value)

  const emit = (h: string, m: string, ap: string) => {
    if (!h && allowEmpty) { onChange(''); return }
    const hNum = parseInt(h || '12')
    let h24 = hNum
    if (ap === 'AM' && hNum === 12) h24 = 0
    else if (ap === 'PM' && hNum !== 12) h24 = hNum + 12
    onChange(`${String(h24).padStart(2, '0')}:${m || '00'}`)
  }

  return (
    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
      <Select
        size="small"
        value={hour}
        onChange={e => emit(e.target.value, minute, ampm)}
        sx={{ flex: 1, textAlign: 'center' }}
      >
        {allowEmpty && <MenuItem value=''>--</MenuItem>}
        {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
          <MenuItem key={h} value={String(h)}>{String(h).padStart(2, '0')}</MenuItem>
        ))}
      </Select>
      <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>:</Typography>
      <Select
        size="small"
        value={minute}
        onChange={e => emit(hour, e.target.value, ampm)}
        sx={{ flex: 1, textAlign: 'center' }}
      >
        {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => (
          <MenuItem key={m} value={m}>{m}</MenuItem>
        ))}
      </Select>
      <Select
        size="small"
        value={ampm}
        onChange={e => emit(hour, minute, e.target.value)}
        sx={{ flex: 'none', width: 72, textAlign: 'center' }}
      >
        <MenuItem value='AM'>AM</MenuItem>
        <MenuItem value='PM'>PM</MenuItem>
      </Select>
    </Box>
  )
}

// ─── ONBOARD ORGANIZATION MODAL ──────────────────────────────────────────────
function OnboardOrgModal({ onClose }: { onClose: () => void }) {
  const { confirm, dialogProps } = useConfirmDialog()
  const { showSnackbar } = useSnackbar()

  const [companyType, setCompanyType] = useState('')
  const [buyerType, setBuyerType] = useState('')
  const [vendorType, setVendorType] = useState('')
  const [integrationMode, setIntegrationMode] = useState('') // 'api' | 'manual'
  const [dailyEmailTime, setDailyEmailTime] = useState('08:00')
  const [dailyEmailTime2, setDailyEmailTime2] = useState('')
  const [buyerPricingMode, setBuyerPricingMode] = useState('standard')
  const [commissionPercentage, setCommissionPercentage] = useState('14.00')
  const [returnAddress1, setReturnAddress1] = useState('')
  const [returnAddress2, setReturnAddress2] = useState('')
  const [returnCity, setReturnCity] = useState('')
  const [returnZip, setReturnZip] = useState('')
  const [returnRegion, setReturnRegion] = useState('')
  const [returnCountry, setReturnCountry] = useState('')
  const [sameAsCompanyAddress, setSameAsCompanyAddress] = useState(false)
  const [mapPricingEnforced, setMapPricingEnforced] = useState(false)
  const [orderDigestEmails, setOrderDigestEmails] = useState<string[]>([])
  const [newDigestEmail, setNewDigestEmail] = useState('')

  const handleAddDigestEmail = () => {
    const email = newDigestEmail.trim()
    if (email && !orderDigestEmails.includes(email)) {
      setOrderDigestEmails([...orderDigestEmails, email])
      setNewDigestEmail('')
    }
  }

  const handleRemoveDigestEmail = (email: string) => {
    setOrderDigestEmails(orderDigestEmails.filter(e => e !== email))
  }


  const [companyName, setCompanyName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [slug, setSlug] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [emailDomain, setEmailDomain] = useState('')
  const [status, setStatus] = useState('draft')
  const [isParent, setIsParent] = useState(true)
  const [parentId, setParentId] = useState('')
  const [allowPersonalEmail, setAllowPersonalEmail] = useState(false)
  const [erpId, setErpId] = useState('')
  const [allowedChannels, setAllowedChannels] = useState<string[]>(['online_dtc', 'buyer_storefront'])
  const [region, setRegion] = useState('')         // state/province code
  const [country, setCountry] = useState('USA')
  const [address1, setAddress1] = useState('')
  const [address2, setAddress2] = useState('')
  const [city, setCity] = useState('')
  const [zip, setZip] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Fetch existing parent companies for dropdown
  const [companies, setCompanies] = useState<any[]>([])
  useEffect(() => {
    api.get('/tenant/companies/').then(r => {
      setCompanies(Array.isArray(r.data) ? r.data : r.data?.results ?? [])
    })
  }, [])

  const isFormDirty = () => {
    return (
      companyType !== '' ||
      buyerType !== '' ||
      vendorType !== '' ||
      integrationMode !== '' ||
      dailyEmailTime !== '08:00' ||
      dailyEmailTime2 !== '' ||
      buyerPricingMode !== 'standard' ||
      commissionPercentage !== '14.00' ||
      returnAddress1 !== '' ||
      returnAddress2 !== '' ||
      returnCity !== '' ||
      returnZip !== '' ||
      returnRegion !== '' ||
      returnCountry !== '' ||
      mapPricingEnforced !== false ||
      orderDigestEmails.length > 0 ||
      companyName !== '' ||
      displayName !== '' ||
      slug !== '' ||
      contactName !== '' ||
      contactEmail !== '' ||
      phone !== '' ||
      website !== '' ||
      emailDomain !== '' ||
      status !== 'draft' ||
      !isParent ||
      parentId !== '' ||
      allowPersonalEmail ||
      erpId !== '' ||
      region !== '' ||
      country !== 'USA' ||
      address1 !== '' ||
      address2 !== '' ||
      city !== '' ||
      zip !== '' ||
      logoFile !== null
    )
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      setLogoFile(f)
      setLogoPreview(URL.createObjectURL(f))
    }
  }

  const handleClose = async () => {
    if (isFormDirty()) {
      const confirmed = await confirm({
        title: 'Unsaved Changes',
        message: 'Your progress will be lost because you have unsaved changes. Are you sure you want to close?',
        confirmLabel: 'Yes, Discard',
        cancelLabel: 'No, Keep Editing',
        confirmColor: 'error',
      })
      if (confirmed) onClose()
    } else {
      onClose()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!companyType) { setError('Please select a company type.'); return }
    if (!companyName) { setError('Company name is required.'); return }
    if (!contactEmail) { setError('Business email is required.'); return }
    setSubmitting(true)
    try {
      const autoSlug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now()
      const finalSlug = slug.trim() || autoSlug

      // Upload logo if provided
      let logoAssetId: string | null = null
      if (logoFile) {
        try {
          const reqRes = await api.post('/media/assets/request_upload/', {
            filename: logoFile.name,
            mime_type: logoFile.type,
            asset_type: 'brand_logo',
            owner_module: 'tenant',
          })
          logoAssetId = reqRes.data.id
          const fd = new FormData()
          fd.append('file', logoFile)
          await api.post(`/media/assets/${logoAssetId}/upload_file/`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        } catch (_) { /* logo upload failure is non-blocking */ }
      }

      await api.post('/tenant/companies/', {
        name: companyName,
        display_name: displayName || companyName,
        slug: finalSlug,
        company_type: companyType,
        status: status || 'draft',
        country_code: country || 'USA',
        region_code: region,
        website: website || '',
        business_email_domain: emailDomain || '',
        primary_contact_name: contactName || '',
        primary_contact_email: contactEmail || '',
        phone_number: phone || '',
        address_line1: address1 || '',
        address_line2: address2 || '',
        is_parent: isParent,
        parent_company: (!isParent && parentId) ? parentId : null,
        allow_personal_email_exception: allowPersonalEmail,
        allowed_channels: allowedChannels,
        buyer_pricing_mode: buyerPricingMode,
        commission_percentage: buyerPricingMode === 'custom' ? parseFloat(commissionPercentage) : (buyerPricingMode === 'no_commission' ? 0.00 : 14.00),
        return_address: companyType === 'vendor' ? JSON.stringify({
          address_line1: returnAddress1 || '',
          address_line2: returnAddress2 || '',
          city: returnCity || '',
          region_code: returnRegion || '',
          zip: returnZip || '',
          country_code: returnCountry || '',
        }) : '',
        map_pricing_enforced: companyType === 'vendor' ? mapPricingEnforced : false,
        order_digest_emails: companyType === 'vendor' && integrationMode === 'manual' ? orderDigestEmails : [],
        external_id: JSON.stringify({
          buyer_type: buyerType || null,
          vendor_type: vendorType || null,
          integration_mode: integrationMode || null,
          daily_email_time: integrationMode === 'manual' ? dailyEmailTime : null,
          daily_email_time_2: (integrationMode === 'manual' && dailyEmailTime2) ? dailyEmailTime2 : null,
          logo_asset_id: logoAssetId,
          city: city || null,
          zip: zip || null,
          erp_id: erpId || null,
        }),
      })
      setSuccess(true)
    } catch (err: any) {
      const d = err.response?.data
      if (d && typeof d === 'object') {
        const detail = d.detail
        if (detail && typeof detail === 'object') {
          setError(Object.entries(detail).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | '))
        } else if (typeof detail === 'string') {
          setError(detail)
        } else {
          setError(Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | '))
        }
      } else {
        setError('Failed to create company.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (success) return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogContent>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography sx={{ fontSize: 40, mb: 1.5 }}>🎉</Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Organization Onboarded!
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {companyName} has been created and activated on the platform.
          </Typography>
          <Button variant="contained" onClick={onClose}>Close</Button>
        </Box>
      </DialogContent>
    </Dialog>
  )

  return (
    <>
      <Dialog
        open
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { maxHeight: '92vh' } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', pb: 1 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Onboard Organization</Typography>
            <Typography variant="caption" color="text.secondary">
              Register a new buyer or vendor tenant on the platform
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleClose} sx={{ mt: -0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
          )}

          <Box component="form" id="onboard-org-form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Company Type */}
            <FormControl fullWidth size="small">
              <InputLabel>Company Type *</InputLabel>
              <Select
                value={companyType}
                label="Company Type *"
                onChange={e => { setCompanyType(e.target.value); setBuyerType(''); setVendorType(''); setIntegrationMode('') }}
              >
                <MenuItem value=''>Select Company Type</MenuItem>
                <MenuItem value='buyer'>Buyer</MenuItem>
                <MenuItem value='vendor'>Vendor</MenuItem>
                <MenuItem value='device_distributor'>Device Distributor</MenuItem>
              </Select>
            </FormControl>

            {/* Buyer Sub-type */}
            {companyType === 'buyer' && (
              <>
                <FormControl fullWidth size="small">
                  <InputLabel>Buyer Type *</InputLabel>
                  <Select value={buyerType} label="Buyer Type *" onChange={e => setBuyerType(e.target.value)}>
                    <MenuItem value=''>Select Buyer Type</MenuItem>
                    <MenuItem value='mvno'>MVNO</MenuItem>
                    <MenuItem value='wireless_carrier'>Wireless Carrier</MenuItem>
                    <MenuItem value='retailer'>Retailer</MenuItem>
                    <MenuItem value='enterprise_corporate'>Enterprise/ Corporate</MenuItem>
                  </Select>
                </FormControl>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: buyerPricingMode === 'custom' ? 6 : 12 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Buyer Pricing Mode *</InputLabel>
                      <Select value={buyerPricingMode} label="Buyer Pricing Mode *" onChange={e => setBuyerPricingMode(e.target.value)}>
                        <MenuItem value="standard">Standard Buyer Commission (14%)</MenuItem>
                        <MenuItem value="no_commission">No Buyer Commission (0%)</MenuItem>
                        <MenuItem value="custom">Custom Buyer Commission</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  {buyerPricingMode === 'custom' && (
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Commission Percentage (%) *"
                        placeholder="e.g. 10.00"
                        slotProps={{ htmlInput: { step: '0.01', min: '0', max: '100' } }}
                        value={commissionPercentage}
                        onChange={e => setCommissionPercentage(e.target.value)}
                        required
                      />
                    </Grid>
                  )}
                </Grid>
              </>
            )}

            {/* Vendor Sub-type */}
            {companyType === 'vendor' && (
              <FormControl fullWidth size="small">
                <InputLabel>Vendor Type *</InputLabel>
                <Select value={vendorType} label="Vendor Type *" onChange={e => setVendorType(e.target.value)}>
                  <MenuItem value=''>Select Vendor Type</MenuItem>
                  <MenuItem value='accessory_vendor'>Accessory Vendor</MenuItem>
                </Select>
              </FormControl>
            )}

            {/* Core Identity */}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth size="small" label="Company Legal Name *" placeholder="e.g. Acme Corp Ltd." required
                  value={companyName}
                  onChange={e => {
                    const val = e.target.value;
                    setCompanyName(val);
                    setDisplayName(prev => (prev === '' || prev === companyName) ? val : prev);
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth size="small" label="Display Name *" placeholder="Short name for UI" required
                  value={displayName} onChange={e => setDisplayName(e.target.value)}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth size="small" label="Primary Contact Name *" placeholder="Jane Smith" required
                  value={contactName} onChange={e => setContactName(e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth size="small" type="email" label="Business Email *" placeholder="admin@company.com" required
                  value={contactEmail} onChange={e => setContactEmail(e.target.value)}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth size="small" label="Website *" placeholder="https://company.com" required
                  value={website} onChange={e => setWebsite(e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth size="small" label="Email Domain *" placeholder="company.com" required
                  value={emailDomain} onChange={e => setEmailDomain(e.target.value)}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth size="small" label="Phone Number (optional)" placeholder="+1-555-0199"
                  value={phone} onChange={e => setPhone(e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth size="small" label="Country Code *" placeholder="USA" required
                  value={country} onChange={e => {
                    setCountry(e.target.value)
                    if (sameAsCompanyAddress) setReturnCountry(e.target.value)
                  }}
                />
              </Grid>
            </Grid>

            {/* Address with Google Places */}
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Address Line 1 *
              </Typography>
              <AddressAutocomplete
                value={address1}
                onChange={val => {
                  setAddress1(val)
                  if (sameAsCompanyAddress) setReturnAddress1(val)
                }}
                onSelect={({ address1: a1, city: c, state: s, zip: z, country: co }) => {
                  setAddress1(a1)
                  setCity(c)
                  setRegion(s)
                  setZip(z)
                  setCountry(co)
                  if (sameAsCompanyAddress) {
                    setReturnAddress1(a1)
                    setReturnCity(c)
                    setReturnRegion(s)
                    setReturnZip(z)
                    setReturnCountry(co)
                  }
                }}
                style={{
                  padding: '8.5px 14px', background: 'transparent', border: '1px solid rgba(0,0,0,0.23)',
                  borderRadius: 4, color: 'inherit', fontSize: '0.875rem', outline: 'none',
                  width: '100%', boxSizing: 'border-box',
                }}
                className=''
                placeholder='Start typing an address...'
              />
            </Box>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth size="small" label="Address Line 2 (unit, suite...)" placeholder="e.g. Suite 400"
                  value={address2} onChange={e => {
                    setAddress2(e.target.value)
                    if (sameAsCompanyAddress) setReturnAddress2(e.target.value)
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth size="small" label="City" placeholder="Auto-filled"
                  value={city} onChange={e => {
                    setCity(e.target.value)
                    if (sameAsCompanyAddress) setReturnCity(e.target.value)
                  }}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth size="small" label="ZIP / Postal Code" placeholder="Auto-filled"
                  value={zip} onChange={e => {
                    setZip(e.target.value)
                    if (sameAsCompanyAddress) setReturnZip(e.target.value)
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>State / Province</InputLabel>
                  <Select
                    value={region}
                    label="State / Province"
                    onChange={e => {
                      setRegion(e.target.value)
                      if (sameAsCompanyAddress) setReturnRegion(e.target.value)
                    }}
                  >
                    <MenuItem value=''>-- Select state --</MenuItem>
                    {US_STATES.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* Vendor Return Address Section */}
            {companyType === 'vendor' && (
              <>
                <Divider sx={{ mt: 1 }} />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={sameAsCompanyAddress}
                      onChange={e => {
                        const checked = e.target.checked
                        setSameAsCompanyAddress(checked)
                        if (checked) {
                          setReturnAddress1(address1)
                          setReturnAddress2(address2)
                          setReturnCity(city)
                          setReturnRegion(region)
                          setReturnZip(zip)
                          setReturnCountry(country)
                        }
                      }}
                    />
                  }
                  label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Same as company address</Typography>}
                  sx={{ mb: 1 }}
                />

                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Return Address Line 1 *
                  </Typography>
                  <AddressAutocomplete
                    value={returnAddress1}
                    onChange={val => {
                      setReturnAddress1(val)
                      setSameAsCompanyAddress(false)
                    }}
                    onSelect={({ address1: a1, city: c, state: s, zip: z, country: co }) => {
                      setReturnAddress1(a1)
                      setReturnCity(c)
                      setReturnRegion(s)
                      setReturnZip(z)
                      setReturnCountry(co)
                      setSameAsCompanyAddress(false)
                    }}
                    style={{
                      padding: '8.5px 14px', background: 'transparent', border: '1px solid rgba(0,0,0,0.23)',
                      borderRadius: 4, color: 'inherit', fontSize: '0.875rem', outline: 'none',
                      width: '100%', boxSizing: 'border-box',
                    }}
                    className=''
                    placeholder='Start typing return address...'
                  />
                </Box>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth size="small" label="Return Address Line 2 (unit, suite...)" placeholder="e.g. Suite 400"
                      value={returnAddress2} onChange={e => {
                        setReturnAddress2(e.target.value)
                        setSameAsCompanyAddress(false)
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth size="small" label="Return City" placeholder="Auto-filled"
                      value={returnCity} onChange={e => {
                        setReturnCity(e.target.value)
                        setSameAsCompanyAddress(false)
                      }}
                    />
                  </Grid>
                </Grid>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth size="small" label="Return ZIP / Postal Code" placeholder="Auto-filled"
                      value={returnZip} onChange={e => {
                        setReturnZip(e.target.value)
                        setSameAsCompanyAddress(false)
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Return State / Province</InputLabel>
                      <Select
                        value={returnRegion}
                        label="Return State / Province"
                        onChange={e => {
                          setReturnRegion(e.target.value)
                          setSameAsCompanyAddress(false)
                        }}
                      >
                        <MenuItem value=''>-- Select state --</MenuItem>
                        {US_STATES.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth size="small" label="Return Country Code *" placeholder="USA"
                      value={returnCountry} onChange={e => {
                        setReturnCountry(e.target.value)
                        setSameAsCompanyAddress(false)
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }} />
                </Grid>
              </>
            )}

            {/* Company Logo */}
            <Divider sx={{ mt: 1 }} />
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', mb: 1 }}>
                Company / Tenant Logo
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {logoPreview ? (
                  <Box
                    component="img"
                    src={logoPreview}
                    alt="Logo preview"
                    sx={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 1, border: 1, borderColor: 'divider', bgcolor: 'action.hover', p: 0.5 }}
                  />
                ) : (
                  <Box sx={{
                    width: 56, height: 56, borderRadius: 1, border: '2px dashed',
                    borderColor: 'divider', bgcolor: 'action.hover',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary',
                  }}>
                    <UploadIcon />
                  </Box>
                )}
                <Box>
                  <Button variant="outlined" size="small" component="label" startIcon={<UploadIcon />}>
                    Choose Logo
                    <input type='file' accept='image/png,image/jpeg,image/webp,image/svg+xml' hidden onChange={handleLogoChange} />
                  </Button>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    PNG, JPG, WEBP or SVG. Recommended 256x256px.
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Additional Fields: Slug, ERP ID, Status, Channels, Flags */}
            <Divider sx={{ mt: 1 }} />
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Organization Settings
            </Typography>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth size="small" label="Custom Slug (optional, auto-generated if blank)" placeholder="e.g. acme-corp"
                  value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth size="small" label="External ERP ID (optional)" placeholder="e.g. EXT-908"
                  value={erpId} onChange={e => setErpId(e.target.value)}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select value={status} label="Status" onChange={e => setStatus(e.target.value)}>
                    <MenuItem value='draft'>Draft</MenuItem>
                    <MenuItem value='active'>Active</MenuItem>
                    <MenuItem value='suspended'>Suspended</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
                  <FormControlLabel
                    control={<Checkbox size="small" checked={isParent} onChange={e => setIsParent(e.target.checked)} />}
                    label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Mark as Parent Company</Typography>}
                  />
                  {companyType === 'vendor' && (
                    <FormControlLabel
                      control={<Checkbox size="small" checked={mapPricingEnforced} onChange={e => setMapPricingEnforced(e.target.checked)} />}
                      label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Enforce MAP Pricing</Typography>}
                    />
                  )}
                  <FormControlLabel
                    control={<Checkbox size="small" checked={allowPersonalEmail} onChange={e => setAllowPersonalEmail(e.target.checked)} />}
                    label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Allow personal email domain exception</Typography>}
                  />
                </Box>
              </Grid>
            </Grid>

            {!isParent && (
              <FormControl fullWidth size="small">
                <InputLabel>Parent Company</InputLabel>
                <Select value={parentId} label="Parent Company" onChange={e => setParentId(e.target.value)}>
                  <MenuItem value=''>-- Select parent --</MenuItem>
                  {companies.filter((c: any) => c.is_parent).map((c: any) => (
                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', mb: 1 }}>
                Allowed Sales Channels
              </Typography>
              <Grid container spacing={1}>
                {[
                  { val: 'online_dtc', lbl: 'Online DTC' },
                  { val: 'bulk_po', lbl: 'Bulk PO' },
                  { val: 'owned_channel', lbl: 'Owned Channel' },
                  { val: 'buyer_storefront', lbl: 'Buyer Storefront' },
                  { val: 'marketplace', lbl: 'Marketplace' },
                  { val: 'retail_pos', lbl: 'Retail POS' },
                ].map(ch => (
                  <Grid size={{ xs: 6, sm: 4 }} key={ch.val}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={allowedChannels.includes(ch.val)}
                          onChange={e => setAllowedChannels(e.target.checked ? [...allowedChannels, ch.val] : allowedChannels.filter(x => x !== ch.val))}
                        />
                      }
                      label={<Typography variant="body2">{ch.lbl}</Typography>}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>

            {companyType === 'vendor' && (
              <>
                <Divider sx={{ mt: 1 }} />
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', mb: 1 }}>
                  Integration Mode
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
                  {(['api', 'manual'] as const).map(mode => (
                    <Button
                      key={mode}
                      variant={integrationMode === mode ? 'contained' : 'outlined'}
                      color={integrationMode === mode ? 'primary' : 'inherit'}
                      onClick={() => {
                        if (integrationMode === mode) {
                          if (mode === 'api') {
                            setIntegrationMode('')
                          } else if (mode === 'manual') {
                            const isEmpty = (dailyEmailTime === '08:00' || !dailyEmailTime) && !dailyEmailTime2 && orderDigestEmails.length === 0
                            if (isEmpty) {
                              setIntegrationMode('')
                            }
                          }
                        } else {
                          setIntegrationMode(mode)
                        }
                      }}
                      sx={{ flex: 1, py: 1.25, fontWeight: 600, fontSize: 13 }}
                    >
                      {mode === 'api' ? 'API Integration' : 'Manual (Order Sheet)'}
                    </Button>
                  ))}
                </Box>
                {integrationMode === 'api' && (
                  <Alert severity="info" variant="outlined" sx={{ fontSize: 12 }}>
                    API keys will be generated and sent to the vendor's business email after approval. The vendor will use the CIXCI REST API to push/pull order data.
                  </Alert>
                )}
                {integrationMode === 'manual' && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Alert severity="warning" variant="outlined" sx={{ fontSize: 12 }}>
                      Order digest emails will be sent automatically to the primary business email and any additional addresses configured below. No API credentials will be issued.
                    </Alert>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                          <AccessTimeIcon sx={{ fontSize: 12 }} /> First Send Time
                        </Typography>
                        <AmPmTimePicker value={dailyEmailTime} onChange={setDailyEmailTime} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                          <AccessTimeIcon sx={{ fontSize: 12 }} /> Second Send Time (optional)
                        </Typography>
                        <AmPmTimePicker value={dailyEmailTime2} onChange={setDailyEmailTime2} allowEmpty />
                      </Grid>
                    </Grid>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                        Additional Automated Digest Recipients
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField
                          fullWidth size="small" type="email" placeholder="e.g. sales@vendor.com"
                          value={newDigestEmail}
                          onChange={e => setNewDigestEmail(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddDigestEmail(); } }}
                        />
                        <Button variant="contained" size="small" onClick={handleAddDigestEmail} sx={{ whiteSpace: 'nowrap' }}>
                          + Add
                        </Button>
                      </Box>
                      {orderDigestEmails.length > 0 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1, maxHeight: 120, overflowY: 'auto', bgcolor: 'action.hover', borderRadius: 1, p: 1, border: 1, borderColor: 'divider' }}>
                          {orderDigestEmails.map(email => (
                            <Box key={email} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'background.paper', px: 1, py: 0.5, borderRadius: 0.5, border: 1, borderColor: 'divider' }}>
                              <Typography variant="body2">{email}</Typography>
                              <Button size="small" color="error" onClick={() => handleRemoveDigestEmail(email)} sx={{ fontSize: 11, minWidth: 'auto' }}>
                                Remove
                              </Button>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Order digests emailed daily to the configured recipients at these times.
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button variant="outlined" onClick={handleClose} disabled={submitting}>Cancel</Button>
          <Button type="submit" form="onboard-org-form" variant="contained" disabled={submitting}>
            {submitting ? 'Creating...' : 'Onboard Organization'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog {...dialogProps} />
    </>
  )
}

// ─── MAIN DASHBOARD PAGE ─────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuthStore()
  const isCixciAdmin = user?.is_cixci_admin || user?.company_type === 'cixci_internal'
  const isBuyer = user?.company_type === 'buyer'
  const isVendor = user?.company_type === 'vendor'

  const count = (d: any) => d?.count ?? d?.results?.length ?? d?.length ?? '0'

  if (isCixciAdmin) {
    return <AdminDashboard count={count} />
  } else if (isBuyer) {
    return <BuyerDashboard count={count} user={user} />
  } else if (isVendor) {
    return <VendorDashboard count={count} user={user} />
  } else {
    return <BuyerDashboard count={count} user={user} />
  }
}

// ─── CIXCI ADMIN DASHBOARD ───────────────────────────────────────────────────
function AdminDashboard({ count }: any) {
  const [showOnboardModal, setShowOnboardModal] = useState(false)
  const { data: companies } = useQuery({ queryKey: ['admin-companies'], queryFn: () => api.get('/tenant/companies/').then(r => r.data) })
  const { data: users } = useQuery({ queryKey: ['admin-users'], queryFn: () => api.get('/tenant/users/').then(r => r.data) })
  const { data: devices } = useQuery({ queryKey: ['admin-devices'], queryFn: () => api.get('/devices/devices/').then(r => r.data) })
  const { data: products } = useQuery({ queryKey: ['admin-products'], queryFn: () => api.get('/catalog/products/').then(r => r.data) })

  const cCount = count(companies)
  const uCount = count(users)
  const dCount = count(devices)
  const pCount = count(products)

  const { data: auditData } = useQuery({
    queryKey: ['admin-audit-trail'],
    queryFn: () => api.get('/audit/records/', { params: { page_size: 10, paginate: 'false' } }).then(r => r.data),
  })
  const auditRecords = Array.isArray(auditData) ? auditData : (auditData?.results ?? [])
  const globalActivity: { event: string; desc: string; status: string; statusText: string; time: string }[] = auditRecords.slice(0, 10).map((r: any) => ({
    event: r.event_code?.replace(/_/g, ' ') || 'System event',
    desc: r.event_description || r.source_module || '—',
    status: r.status || 'unknown',
    statusText: r.status?.replace(/_/g, ' ') || 'Unknown',
    time: r.created_at ? formatDate(r.created_at) : '—',
  }))

  const dataChart = [
    { name: 'Companies', companies: cCount },
    { name: 'Users', companies: uCount },
    { name: 'Devices', companies: dCount },
    { name: 'Products', companies: pCount },
  ]

  return (
    <Box>
      <PageHeader
        title="CIXCI System Admin Console"
        subtitle="Global platform health, tenant activations, and system metrics"
        actions={
          <Button variant="contained" startIcon={<BusinessIcon />} onClick={() => setShowOnboardModal(true)}>
            Onboard Organization
          </Button>
        }
      />
      {showOnboardModal && <OnboardOrgModal onClose={() => setShowOnboardModal(false)} />}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Link to="/settings" style={{ textDecoration: 'none' }}>
            <StatCard icon={<BusinessIcon />} title="Active Companies" value={cCount} subtitle="registered tenants" color="var(--purple)" />
          </Link>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Link to="/settings" style={{ textDecoration: 'none' }}>
            <StatCard icon={<PeopleIcon />} title="System Admins & Users" value={uCount} subtitle="onboarded members" color="var(--accent)" />
          </Link>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Link to="/devices" style={{ textDecoration: 'none' }}>
            <StatCard icon={<SmartphoneIcon />} title="Global Devices" value={dCount} subtitle="in master catalog" color="var(--green)" />
          </Link>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Link to="/catalog" style={{ textDecoration: 'none' }}>
            <StatCard icon={<ShoppingBagIcon />} title="Catalog Products" value={pCount} subtitle="wholesale accessories" color="var(--amber)" />
          </Link>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Platform Entity Overview</Typography>
                <Chip label="Current Counts" size="small" color="secondary" />
              </Box>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dataChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" />
                  <YAxis stroke="var(--text-muted)" />
                  <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
                  <Bar dataKey="companies" fill="var(--purple)" radius={[4, 4, 0, 0]} name="Count" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>System Quick Actions</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flex: 1, justifyContent: 'center' }}>
                <Button
                  component={Link} to="/settings?tab=users&action=invite" variant="outlined" color="inherit"
                  sx={{ justifyContent: 'flex-start', p: 1.5, textTransform: 'none', textAlign: 'left' }}
                  startIcon={<PeopleIcon sx={{ color: 'var(--accent)' }} />}
                >
                  <Box sx={{ ml: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 650 }}>Invite Organization Admin</Typography>
                    <Typography variant="caption" color="text.secondary">Send time-limited secure onboarding link</Typography>
                  </Box>
                </Button>
                <Button
                  component={Link} to="/devices" variant="outlined" color="inherit"
                  sx={{ justifyContent: 'flex-start', p: 1.5, textTransform: 'none', textAlign: 'left' }}
                  startIcon={<SmartphoneIcon sx={{ color: 'var(--green)' }} />}
                >
                  <Box sx={{ ml: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 650 }}>Import Device Data</Typography>
                    <Typography variant="caption" color="text.secondary">Upload CSV compatibility and features</Typography>
                  </Box>
                </Button>
                <Button
                  component={Link} to="/integration" variant="outlined" color="inherit"
                  sx={{ justifyContent: 'flex-start', p: 1.5, textTransform: 'none', textAlign: 'left' }}
                  startIcon={<ShieldIcon sx={{ color: 'var(--amber)' }} />}
                >
                  <Box sx={{ ml: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 650 }}>System Integration Logs</Typography>
                    <Typography variant="caption" color="text.secondary">Check API payloads, sync alerts, and errors</Typography>
                  </Box>
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Global Audit Trail</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Event</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Time</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {globalActivity.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell sx={{ fontWeight: 500 }}>{row.event}</TableCell>
                    <TableCell>{row.desc}</TableCell>
                    <TableCell><StatusChip status={row.status} label={row.statusText} /></TableCell>
                    <TableCell>{row.time}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  )
}

// ─── BUYER DASHBOARD ─────────────────────────────────────────────────────────
function BuyerDashboard({ count, user }: any) {
  const { data: myDevices } = useQuery({ queryKey: ['buyer-portfolio'], queryFn: () => api.get('/devices/portfolio/my_devices/').then(r => r.data) })
  const { data: projection } = useQuery({ queryKey: ['buyer-projection'], queryFn: () => api.get('/catalog/my-projection/my_projection/').then(r => r.data) })
  const { data: orders } = useQuery({ queryKey: ['buyer-orders'], queryFn: () => api.get('/routing/orders/').then(r => r.data) })
  const { data: invoices } = useQuery({ queryKey: ['buyer-invoices'], queryFn: () => api.get('/invoicing/invoices/').then(r => r.data) })

  const dCount = count(myDevices)
  const cCount = projection?.compatible_product_count ?? 0
  const oCount = count(orders)
  const iCount = count(invoices)

  const ordersData = Array.isArray(orders) ? orders : (orders?.results ?? [])

  // Derive order volume from actual order data grouped by day
  const orderVolumeTrend = (() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const counts: Record<string, number> = {}
    dayNames.forEach(d => { counts[d] = 0 })
    ordersData.forEach((o: any) => {
      const d = o.placed_at || o.order_date_time || o.created_at
      if (d) {
        const day = dayNames[new Date(d).getDay()]
        counts[day] = (counts[day] || 0) + 1
      }
    })
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => ({ day: d, orders: counts[d] || 0 }))
  })()

  return (
    <Box>
      <PageHeader
        title={`Buyer Console — ${user?.company_name || 'Retailer Portal'}`}
        subtitle="Accessory procurement, device compatibility portfolios, and storefront channels"
        actions={
          <Button component={Link} to="/devices" variant="contained" startIcon={<SmartphoneIcon />}>
            Manage My Devices
          </Button>
        }
      />

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Link to="/devices" style={{ textDecoration: 'none' }}>
            <StatCard icon={<SmartphoneIcon />} title="My Device Portfolio" value={dCount} subtitle="compatible targets" color="var(--accent)" />
          </Link>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Link to="/catalog" style={{ textDecoration: 'none' }}>
            <StatCard icon={<ShoppingBagIcon />} title="Compatible Accessories" value={cCount} subtitle="available in catalog" color="var(--purple)" />
          </Link>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Link to="/orders" style={{ textDecoration: 'none' }}>
            <StatCard icon={<InventoryIcon />} title="Orders Placed" value={oCount} subtitle="tracked packages" color="var(--green)" />
          </Link>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Link to="/invoicing" style={{ textDecoration: 'none' }}>
            <StatCard icon={<ReceiptLongIcon />} title="Procurement Invoices" value={iCount} subtitle="issued total" color="var(--amber)" />
          </Link>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>My Weekly Order Volume</Typography>
                <Chip icon={<TrendingUpIcon sx={{ fontSize: 14 }} />} label="Scoped Placed" size="small" color="primary" />
              </Box>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={orderVolumeTrend}>
                  <defs>
                    <linearGradient id="buyerOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" stroke="var(--text-muted)" />
                  <YAxis stroke="var(--text-muted)" />
                  <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
                  <Area type="monotone" dataKey="orders" stroke="var(--accent)" strokeWidth={2} fill="url(#buyerOrders)" name="Orders" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Quick Actions</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Button
                  component={Link} to="/catalog" variant="outlined" color="inherit"
                  sx={{ justifyContent: 'flex-start', p: 1.5, textTransform: 'none', textAlign: 'left' }}
                  startIcon={<ShoppingBagIcon sx={{ color: 'var(--purple)' }} />}
                >
                  <Box sx={{ ml: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 650 }}>Export Selection Catalog</Typography>
                    <Typography variant="caption" color="text.secondary">Generate CSV/JSON/XLSX compatibility exports</Typography>
                  </Box>
                </Button>
                <Button
                  component={Link} to="/devices" variant="outlined" color="inherit"
                  sx={{ justifyContent: 'flex-start', p: 1.5, textTransform: 'none', textAlign: 'left' }}
                  startIcon={<SmartphoneIcon sx={{ color: 'var(--accent)' }} />}
                >
                  <Box sx={{ ml: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 650 }}>Review Devices Portfolio</Typography>
                    <Typography variant="caption" color="text.secondary">Update your list of active cell phones & tablets</Typography>
                  </Box>
                </Button>
                <Button
                  component={Link} to="/orders" variant="outlined" color="inherit"
                  sx={{ justifyContent: 'flex-start', p: 1.5, textTransform: 'none', textAlign: 'left' }}
                  startIcon={<InventoryIcon sx={{ color: 'var(--green)' }} />}
                >
                  <Box sx={{ ml: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 650 }}>Track Routed Orders</Typography>
                    <Typography variant="caption" color="text.secondary">Monitor real-time fulfillment status of purchases</Typography>
                  </Box>
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Recent Routed Purchases</Typography>
          <TableContainer>
            {ordersData.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                No purchase orders found.
              </Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Order Reference</TableCell>
                    <TableCell>SKU</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Routed State</TableCell>
                    <TableCell>Created</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ordersData.slice(0, 5).map((ord: any) => (
                    <TableRow key={ord.id}>
                      <TableCell sx={{ fontWeight: 500, fontFamily: 'monospace' }}>{ord.id.slice(0, 8)}...</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{ord.sku}</TableCell>
                      <TableCell>{ord.quantity}</TableCell>
                      <TableCell><StatusChip status={ord.routing_status || 'active'} label={ord.routing_status || 'Routed'} /></TableCell>
                      <TableCell>{formatDate(ord.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  )
}

// ─── VENDOR DASHBOARD ────────────────────────────────────────────────────────
function VendorDashboard({ count, user }: any) {
  const { data: products } = useQuery({ queryKey: ['vendor-products'], queryFn: () => api.get('/catalog/products/').then(r => r.data) })
  const { data: orders } = useQuery({ queryKey: ['vendor-orders'], queryFn: () => api.get('/routing/orders/').then(r => r.data) })
  const { data: relationships } = useQuery({ queryKey: ['vendor-relationships'], queryFn: () => api.get('/tenant/relationships/').then(r => r.data) })
  const { data: invoices } = useQuery({ queryKey: ['vendor-invoices'], queryFn: () => api.get('/invoicing/invoices/').then(r => r.data) })
  const { data: returns } = useQuery({ queryKey: ['vendor-returns'], queryFn: () => api.get('/fulfillment/return-requests/').then(r => r.data) })

  const pCount = count(products)
  const oCount = count(orders)
  const rCount = count(relationships)
  const iCount = count(invoices)
  const retCount = count(returns)

  const ordersData = Array.isArray(orders) ? orders : (orders?.results ?? [])

  // Derive fulfillment data from actual orders
  const fulfillData = (() => {
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
    const result: { day: string; on_time: number; late: number }[] = dayNames.map(d => ({ day: d, on_time: 0, late: 0 }))
    ordersData.forEach((o: any) => {
      const d = o.placed_at || o.order_date_time || o.created_at
      if (d) {
        const dayIdx = new Date(d).getDay()
        if (dayIdx >= 1 && dayIdx <= 5) {
          const idx = dayIdx - 1
          if (o.status === 'delivered' || o.status === 'shipped') {
            result[idx].on_time += 1
          } else if (o.status === 'exception' || o.status === 'sla_breach') {
            result[idx].late += 1
          }
        }
      }
    })
    return result
  })()

  return (
    <Box>
      <PageHeader
        title={`Vendor Portal — ${user?.company_name || 'Partner Workspace'}`}
        subtitle="Accessory inventory, catalog listings, fulfillment SLA tracking"
        actions={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button component={Link} to="/fulfillment" variant="outlined" startIcon={<CloudUploadIcon />}>
              Import Returns
            </Button>
            <Button component={Link} to="/catalog" variant="contained" startIcon={<ShoppingBagIcon />}>
              Add New Product
            </Button>
          </Box>
        }
      />

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Link to="/catalog" style={{ textDecoration: 'none' }}>
            <StatCard icon={<ShoppingBagIcon />} title="Listed Accessories" value={pCount} subtitle="in active catalog" color="var(--purple)" />
          </Link>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Link to="/orders" style={{ textDecoration: 'none' }}>
            <StatCard icon={<InventoryIcon />} title="Assigned Orders" value={oCount} subtitle="pending fulfillment" color="var(--green)" />
          </Link>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <StatCard icon={<BusinessIcon />} title="Active Buyers" value={rCount} subtitle="retailer partnerships" color="var(--accent)" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Link to="/invoicing" style={{ textDecoration: 'none' }}>
            <StatCard icon={<ReceiptLongIcon />} title="Invoices Issued" value={iCount} subtitle="billing total" color="var(--amber)" />
          </Link>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Link to="/fulfillment" style={{ textDecoration: 'none' }}>
            <StatCard icon={<LocalShippingIcon />} title="Return Requests" value={retCount} subtitle="import & manage" color="var(--red, #ef4444)" />
          </Link>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Fulfillment SLA Performance</Typography>
                <Chip label="On-time vs Late" size="small" color="success" />
              </Box>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={fulfillData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" stroke="var(--text-muted)" />
                  <YAxis stroke="var(--text-muted)" />
                  <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
                  <Bar dataKey="on_time" fill="var(--green)" radius={[4, 4, 0, 0]} name="On Time" />
                  <Bar dataKey="late" fill="var(--red)" radius={[4, 4, 0, 0]} name="Late" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Fulfillment Quick Actions</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Button
                  component={Link} to="/catalog" variant="outlined" color="inherit"
                  sx={{ justifyContent: 'flex-start', p: 1.5, textTransform: 'none', textAlign: 'left' }}
                  startIcon={<ShoppingBagIcon sx={{ color: 'var(--purple)' }} />}
                >
                  <Box sx={{ ml: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 650 }}>List New Accessory</Typography>
                    <Typography variant="caption" color="text.secondary">Publish a new accessory SKU with specs & wholesale price</Typography>
                  </Box>
                </Button>
                <Button
                  component={Link} to="/fulfillment" variant="outlined" color="inherit"
                  sx={{ justifyContent: 'flex-start', p: 1.5, textTransform: 'none', textAlign: 'left' }}
                  startIcon={<LocalShippingIcon sx={{ color: 'var(--green)' }} />}
                >
                  <Box sx={{ ml: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 650 }}>Process Shipments</Typography>
                    <Typography variant="caption" color="text.secondary">Update tracking codes, SLA parameters, and return approvals</Typography>
                  </Box>
                </Button>
                <Button
                  component={Link} to="/invoicing" variant="outlined" color="inherit"
                  sx={{ justifyContent: 'flex-start', p: 1.5, textTransform: 'none', textAlign: 'left' }}
                  startIcon={<ReceiptLongIcon sx={{ color: 'var(--amber)' }} />}
                >
                  <Box sx={{ ml: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 650 }}>Generate Invoices</Typography>
                    <Typography variant="caption" color="text.secondary">Create wholesale invoice statements for fulfilled orders</Typography>
                  </Box>
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Incoming Orders to Fulfill</Typography>
          <TableContainer>
            {ordersData.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                No routing orders assigned.
              </Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Order Reference</TableCell>
                    <TableCell>SKU</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>State</TableCell>
                    <TableCell>Fulfill By</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ordersData.slice(0, 5).map((ord: any) => (
                    <TableRow key={ord.id}>
                      <TableCell sx={{ fontWeight: 500, fontFamily: 'monospace' }}>{ord.id.slice(0, 8)}...</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{ord.sku}</TableCell>
                      <TableCell>{ord.quantity}</TableCell>
                      <TableCell><StatusChip status={ord.routing_status || 'pending'} label={ord.routing_status || 'Received'} /></TableCell>
                      <TableCell>{ord.sla_deadline ? formatDate(ord.sla_deadline) : 'Immediate'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  )
}
