import { Alert, Box, Button, Chip, CircularProgress, MenuItem, Paper, TextField, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import api from '../lib/apiClient'
import { apiError } from '../hooks/useCompatibilityOptions'
import VendorCatalogConsole from '../components/VendorCatalogConsole'
import VendorCatalogGuide from '../components/VendorCatalogGuide'

export default function VendorCatalogPage() {
  const { vendorId = '' } = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const vendors = useQuery({ queryKey: ['vendor-integration-companies'], queryFn: async () => {
    const response = await api.get('/tenant/companies/', { params: { company_type: 'vendor', paginate: 'false' } })
    return (response.data.results || response.data).filter((company: any) => company.company_type === 'vendor')
  } })
  const vendor = useQuery({ queryKey: ['vendor-integration-company', vendorId], enabled: !!vendorId,
    queryFn: async () => (await api.get(`/tenant/companies/${vendorId}/`)).data })
  const company = vendor.data
  let mode = ''
  try { mode = JSON.parse(company?.external_id || '{}').integration_mode || '' } catch { /* Show setup guidance. */ }
  return <Box sx={{ maxWidth: 1600, mx: 'auto', width: '100%', minWidth: 0 }}>
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 3 }}>
      <Box><Typography variant="h5" sx={{ fontWeight: 700 }}>Vendor Integrations</Typography>
        <Typography color="text.secondary" variant="body2">Connect supplier catalogs, map their data, and manage imports from one workspace.</Typography></Box>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}><VendorCatalogGuide/><Button component={Link} to="/settings">Company Settings</Button></Box>
    </Box>
    <Paper variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField select label="Vendor company" value={vendorId} size="small" sx={{ minWidth: 260, flex: 1, maxWidth: 480 }}
          onChange={event => navigate(`/settings/vendor-integrations/${event.target.value}`)}>
          <MenuItem value="">Select a Vendor</MenuItem>
          {(vendors.data || []).map((record: any) => <MenuItem key={record.id} value={record.id}>{record.display_name || record.name}</MenuItem>)}
        </TextField>
        {company && <><Chip label={company.status} size="small" variant="outlined"/><Chip label={mode === 'api' ? 'API mode saved' : 'Manual / not configured'} size="small" color={mode === 'api' ? 'success' : 'default'}/></>}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>Create the Vendor Company first. Every connection, credential, source row and catalog offer stays bound to that supplier.</Typography>
    </Paper>
    {(vendors.error || vendor.error) && <Alert severity="error">{apiError(vendors.error || vendor.error)}</Alert>}
    {vendor.isFetching && <CircularProgress size={24}/>}
    {!vendorId && <Alert severity="info">Select a Vendor to manage its API connections or Brands. Generic REST/JSON configuration supports future suppliers; Balaji is an optional starting template.</Alert>}
    {company && company.company_type !== 'vendor' && <Alert severity="error">Select an Accessory Vendor company.</Alert>}
    {company?.company_type === 'vendor' && <VendorCatalogConsole key={company.id} company={company}
      initialTab={search.get('tab') || 'config'} initialConnection={search.get('connection') || ''}/>}
  </Box>
}
