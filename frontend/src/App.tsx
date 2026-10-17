import { useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'

import { CixciThemeProvider } from './theme/ThemeProvider'
import { SnackbarProvider, useSnackbar } from './components/feedback/SnackbarProvider'
import ErrorBoundary from './components/feedback/ErrorBoundary'
import { useAuthStore } from './stores/authStore'
import AppLayout from './components/AppLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import DevicesPage from './pages/DevicesPage'
import CatalogPage from './pages/CatalogPage'
import PricingPage from './pages/PricingPage'
import OrdersPage from './pages/OrdersPage'
import FulfillmentPage from './pages/FulfillmentPage'
import InvoicingPage from './pages/InvoicingPage'
import ProcurementPage from './pages/ProcurementPage'
import NotificationsPage from './pages/NotificationsPage'
import MediaPage from './pages/MediaPage'
import AnalyticsPage from './pages/AnalyticsPage'
import IntegrationPage from './pages/IntegrationPage'
import LaunchPage from './pages/LaunchPage'
import TelcoCellularPage from './pages/TelcoCellularPage'
import CompanyUsersPage from './pages/CompanyUsersPage'
import { SettingsPage } from './pages/StubPages'
import ConfirmEmailPage from './pages/ConfirmEmailPage'
import ResetPasswordPage from './pages/ResetPasswordPage'

function extractErrorMessage(error: unknown): string {
  const err = error as any
  const data = err?.response?.data
  if (data?.detail) return data.detail
  if (data?.error) return data.error
  if (typeof data === 'string') return data
  if (err?.message) return err.message
  return 'An unexpected error occurred'
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, initialized } = useAuthStore()
  if (!initialized) return <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><CircularProgress /></Box>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppWithQuery() {
  const { showSnackbar } = useSnackbar()
  const { fetchMe } = useAuthStore()

  const queryClientRef = useRef<QueryClient | null>(null)
  if (!queryClientRef.current) {
    queryClientRef.current = new QueryClient({
      defaultOptions: {
        queries: { retry: 1, staleTime: 30_000 },
      },
      queryCache: new QueryCache({
        onError: (error, query) => {
          // Skip showing error if the query opted out via meta.silent
          if (query.meta?.silent) return
          // Don't show errors for 401s (handled by auth redirect)
          if ((error as any)?.response?.status === 401) return
          const msg = (query.meta?.errorMessage as string) || extractErrorMessage(error)
          showSnackbar(msg, 'error')
        },
      }),
      mutationCache: new MutationCache({
        onError: (error, _variables, _context, mutation) => {
          if (mutation.meta?.silent) return
          if ((error as any)?.response?.status === 401) return
          const msg = (mutation.meta?.errorMessage as string) || extractErrorMessage(error)
          showSnackbar(msg, 'error')
        },
      }),
    })
  }

  useEffect(() => { void fetchMe() }, [fetchMe])

  return (
    <QueryClientProvider client={queryClientRef.current}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/confirm-email" element={<ConfirmEmailPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/" element={<RequireAuth><ErrorBoundary><AppLayout /></ErrorBoundary></RequireAuth>}>
            <Route index element={<DashboardPage />} />
            <Route path="devices" element={<DevicesPage />} />
            <Route path="catalog" element={<CatalogPage />} />
            <Route path="pricing" element={<PricingPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="fulfillment" element={<FulfillmentPage />} />
            <Route path="invoicing" element={<InvoicingPage />} />
            <Route path="procurement" element={<ProcurementPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="media" element={<MediaPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="integration" element={<IntegrationPage />} />
            <Route path="launch" element={<LaunchPage />} />
            <Route path="users" element={<CompanyUsersPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="/telco-cellular" element={<TelcoCellularPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default function App() {
  return (
    <CixciThemeProvider>
      <SnackbarProvider>
        <AppWithQuery />
      </SnackbarProvider>
    </CixciThemeProvider>
  )
}
