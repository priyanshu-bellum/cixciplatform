import { Box, Button, Typography } from '@mui/material'
import { Link } from 'react-router-dom'

export default function VendorCatalogEntry({ company, currentMode }: { company: any; currentMode: string }) {
  let savedMode = ''
  try { savedMode = JSON.parse(company.external_id || '{}').integration_mode || '' } catch { /* Unconfigured profile. */ }
  const enabled = savedMode === 'api' && currentMode === 'api'
  const path = `/settings/vendor-integrations/${company.id}`
  return <Box sx={{ my: 1.5 }}>
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
      <Button component={Link} to={path} variant="outlined" disabled={!enabled}>Manage API Catalog</Button>
      <Button component={Link} to={`${path}?tab=brands`} variant="outlined">Manage Vendor Brands</Button>
    </Box>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
      {enabled ? 'Open the full Vendor Integrations page to configure any supported supplier API, test it and manage synchronization.' : 'Select API mode and save Company Profile to enable API configuration. Brand management is available for manual vendors too.'}
    </Typography>
  </Box>
}
