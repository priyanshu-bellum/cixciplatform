import { Outlet, useLocation } from 'react-router-dom'
import { Bell, Search } from 'lucide-react'
import Sidebar from './Sidebar'
import { useAuthStore } from '../stores/authStore'

const TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/devices': 'Device Catalog',
  '/catalog': 'Product Catalog',
  '/pricing': 'Pricing',
  '/orders': 'Orders',
  '/fulfillment': 'Fulfillment & Returns',
  '/invoicing': 'Invoice Management',
  '/procurement': 'Procurement',
  '/notifications': 'Notifications',
  '/media': 'Media Assets',
  '/analytics': 'Analytics',
  '/integration': 'Integration',
  '/launch': 'Launch & Events',
  '/telco-cellular': 'Telco Cellular Storefront',
  '/settings': 'Settings',
}

export default function AppLayout() {
  const { pathname } = useLocation()
  const { user } = useAuthStore()
  const title = TITLES[pathname] ?? 'CIXCI'
  const initials = user?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? 'U'

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <header className="topbar">
          <span className="topbar-title">{title}</span>
          <div className="topbar-right">
            <div className="search-bar">
              <Search size={14} />
              <input placeholder="Search…" />
            </div>
            <button className="btn btn-ghost btn-sm" style={{ padding: '6px' }}>
              <Bell size={16} />
            </button>
            <div className="avatar" title={user?.email}>{initials}</div>
          </div>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
