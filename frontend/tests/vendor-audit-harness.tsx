// Vite serves this test-only entry; it is not imported by the production app.
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import { SnackbarProvider } from '../src/components/feedback/SnackbarProvider'
import VendorAuditTab from '../src/pages/catalog/VendorAuditTab'
import api from '../src/lib/apiClient'

const params = new URLSearchParams(location.search)
const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false }, mutations: { retry: false } } })
const route = '/catalog?tab=vendor-audit' + (params.get('empty') ? '' : '&vendor=00000000-0000-4000-8000-000000000001')
const theme = createTheme({ palette: { mode: params.get('dark') ? 'dark' : 'light' } })
function Harness() {
  const configs = useQuery({ queryKey: ['dropdown-configs'], enabled: !params.get('buyer'), queryFn: () => api.get('/catalog/dropdown-configs/', { params: { paginate: 'false' } }).then(response => response.data) })
  return params.get('buyer') || configs.data ? <VendorAuditTab user={{ id: 'admin-test', is_cixci_admin: !params.get('buyer') }} dropdownConfigs={configs.data || []} /> : null
}
createRoot(document.getElementById('root')!).render(<ThemeProvider theme={theme}><CssBaseline />
  <QueryClientProvider client={client}><MemoryRouter initialEntries={[route]}><SnackbarProvider>
    <Harness />
  </SnackbarProvider></MemoryRouter></QueryClientProvider>
</ThemeProvider>)
