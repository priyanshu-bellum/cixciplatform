import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

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
import { SettingsPage } from './pages/StubPages'
import ConfirmEmailPage from './pages/ConfirmEmailPage'

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } })

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()
  if (loading) return <div className="loading-overlay"><div className="spinner" /></div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const { fetchMe } = useAuthStore()
  useEffect(() => { fetchMe() }, [])

  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/confirm-email" element={<ConfirmEmailPage />} />
          <Route path="/" element={<RequireAuth><AppLayout /></RequireAuth>}>
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
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="/telco-cellular" element={<TelcoCellularPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" toastOptions={{ style: { background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' } }} />
    </QueryClientProvider>
  )
}
