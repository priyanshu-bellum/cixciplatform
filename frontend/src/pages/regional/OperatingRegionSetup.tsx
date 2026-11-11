import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Autocomplete, Box, Button, Chip, Stack, TextField, Typography } from '@mui/material'
import api from '../../lib/apiClient'
import { apiError } from '../../hooks/useCompatibilityOptions'
import { useSnackbar } from '../../components/feedback/SnackbarProvider'

type Region = { id: string; code: string; name: string; is_active: boolean }
type Entity = { id: string; company: string; company_name: string; name: string; country_code: string; operating_region: string | null }
type Country = { code: string; alpha3: string; name: string }
type Save = (operation: () => Promise<unknown>, message: string) => Promise<boolean>

async function allRows<T>(url: string) {
  const rows: T[] = []
  let next: string | null = url
  while (next) {
    const { data }: { data: any } = await api.get(next)
    rows.push(...(Array.isArray(data) ? data : data.results || []))
    next = Array.isArray(data) ? null : data.next
  }
  return rows
}

function RegionItem({ region, saving, save }: { region: Region; saving: boolean; save: Save }) {
  const [name, setName] = useState(region.name)
  useEffect(() => { setName(region.name) }, [region.name])
  return <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mb: 1.5, alignItems: { md: 'center' } }}>
    <TextField size="small" label={`Region Name (${region.code})`} value={name} disabled={saving}
      onChange={event => setName(event.target.value)} slotProps={{ htmlInput: { maxLength: 100 } }} />
    <Button disabled={saving || !name.trim() || name.trim() === region.name}
      onClick={() => save(() => api.patch(`/tenant/operating-regions/${region.id}/`, { name: name.trim() }), `Region ${region.code} name saved.`)}>Save Name</Button>
    <Chip size="small" label={region.is_active ? 'Active' : 'Retired'} />
    <Button disabled={saving} onClick={() => save(() => api.patch(`/tenant/operating-regions/${region.id}/`, { is_active: !region.is_active }), `Region ${region.code} ${region.is_active ? 'retired' : 'reactivated'}.`)}>
      {region.is_active ? 'Retire' : 'Reactivate'}
    </Button>
  </Stack>
}

export default function OperatingRegionSetup() {
  const client = useQueryClient()
  const { showSnackbar } = useSnackbar()
  const regions = useQuery({ queryKey: ['operating-regions'], queryFn: () => allRows<Region>('/tenant/operating-regions/') })
  const entities = useQuery({ queryKey: ['regional-buyer-entities'], queryFn: async () => {
    const [companies, units] = await Promise.all([allRows<{ id: string }>('/tenant/companies/?company_type=buyer'), allRows<Entity>('/tenant/entities/')])
    const buyers = new Set(companies.map(company => company.id))
    return units.filter(entity => buyers.has(entity.company))
  } })
  const countries = useQuery({ queryKey: ['operating-countries'], queryFn: () => allRows<Country>('/tenant/operating-regions/countries/') })
  const [country, setCountry] = useState<Country | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const save: Save = async (operation, message) => {
    setSaving(true); setError(''); setNotice('')
    try {
      await operation()
      await Promise.all([
        ['operating-regions'], ['regional-buyer-entities'], ['buyer-regional-context'], ['buyer-current-vendor-fees'],
      ].map(queryKey => client.invalidateQueries({ queryKey })))
      setNotice(message); showSnackbar(message, 'success')
      return true
    } catch (problem) {
      const message = apiError(problem)
      setError(message); showSnackbar(message, 'error')
      return false
    } finally { setSaving(false) }
  }
  return <Box sx={{ mb: 3 }}>
    <Typography variant="h6">Operating Regions</Typography>
    <Alert severity="info" sx={{ my: 1 }}>Buyer regions are resolved automatically from the country saved during onboarding. Each Buyer Entity uses its own country. Configure Vendor supported regions and fees here; no separate Buyer region assignment is needed.</Alert>
    {(error || regions.isError || entities.isError || countries.isError) && <Alert severity="error" sx={{ mb: 1 }}
      action={(regions.isError || entities.isError || countries.isError) ? <Button onClick={() => { void regions.refetch(); void entities.refetch(); void countries.refetch() }}>Retry</Button> : undefined}>
      {error || 'Region configuration could not be loaded.'}
    </Alert>}
    {notice && <Alert severity="success" sx={{ mb: 1 }}>{notice}</Alert>}
    <Typography variant="subtitle1" sx={{ mt: 2 }}>Vendor operating countries</Typography>
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ my: 2, alignItems: { md: 'flex-start' } }}>
      <Autocomplete options={countries.data || []} value={country} onChange={(_, value) => setCountry(value)} loading={countries.isLoading}
        disabled={saving || countries.isError} sx={{ minWidth: 300, flex: 1, maxWidth: 540 }}
        getOptionLabel={value => `${value.name} (${value.code} / ${value.alpha3})`} isOptionEqualToValue={(a, b) => a.code === b.code}
        renderInput={params => <TextField {...params} label="Operating country" helperText="Buyer onboarding registers its country automatically. Add another country here when preparing Vendor coverage." />} />
      <Button variant="outlined" disabled={saving || !country || (regions.data || []).some(region => region.code.toUpperCase() === country.code)}
        onClick={() => { if (country) void save(async () => { await api.post('/tenant/operating-regions/', { code: country.code, name: country.name }); setCountry(null) }, 'Operating country registered for Vendor setup.') }}>
        Register Country
      </Button>
    </Stack>
    {(regions.data || []).map(region => <RegionItem key={region.id} region={region} saving={saving} save={save} />)}
    {!regions.isLoading && !regions.isError && !regions.data?.length && <Alert severity="info" sx={{ mb: 2 }}>
      Countries appear automatically when Buyers are onboarded. No Buyer-by-Buyer region setup is required.
    </Alert>}
    <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Buyer country resolution</Typography>
    {entities.isLoading && <Typography role="status">Loading Buyer Entities…</Typography>}
    {!entities.isLoading && !entities.isError && !entities.data?.length && <Typography>No Buyer Entities found.</Typography>}
    {(entities.data || []).map(entity => {
      const selected = (regions.data || []).find(region => region.id === entity.operating_region)
      return <Stack key={entity.id} direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2, alignItems: { md: 'center' } }}>
        <Typography variant="body2" sx={{ width: { md: 280 }, minWidth: 0, overflowWrap: 'anywhere' }}>{entity.company_name} / {entity.name}</Typography>
        <Chip size="small" label={`Country: ${entity.country_code || 'Missing'}`} />
        <Typography variant="body2">{selected ? `${selected.name} (${selected.code})` : 'Correct the country in onboarding / Entity settings'}</Typography>
        <Chip size="small" label={selected ? (selected.is_active ? 'Resolved automatically' : 'Region retired') : 'Country setup required'} />
      </Stack>
    })}
    <Alert severity="info">Configure each Vendor's regional shipping fee, then activate its supported country using Update Regions below. Vendor coverage must match the Buyer's operating country. Approved relationships and normal product eligibility still apply.</Alert>
  </Box>
}
