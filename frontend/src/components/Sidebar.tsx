import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Smartphone, ShoppingBag, DollarSign,
  Package, ReceiptText, Bell, Image, BarChart2, Truck,
  Plug, ShoppingCart, Rocket, LogOut, Settings,
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

const NAV = [
  {
    label: 'Core',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/devices', icon: Smartphone, label: 'Device Catalog' },
      { to: '/catalog', icon: ShoppingBag, label: 'Product Catalog' },
      { to: '/pricing', icon: DollarSign, label: 'Pricing' },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { to: '/orders', icon: Package, label: 'Orders' },
      { to: '/fulfillment', icon: Truck, label: 'Fulfillment' },
      { to: '/invoicing', icon: ReceiptText, label: 'Invoicing' },
      { to: '/procurement', icon: ShoppingCart, label: 'Procurement' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { to: '/notifications', icon: Bell, label: 'Notifications' },
      { to: '/media', icon: Image, label: 'Media' },
      { to: '/analytics', icon: BarChart2, label: 'Analytics' },
      { to: '/integration', icon: Plug, label: 'Integration' },
      { to: '/launch', icon: Rocket, label: 'Launch' },
    ],
  },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const isCixciAdmin = user?.is_cixci_admin || user?.company_type === 'cixci_internal'
  const isBuyer = user?.company_type === 'buyer'
  const isVendor = user?.company_type === 'vendor'

  const filteredNav = NAV.map(section => {
    const items = section.items.filter(item => {
      if (isCixciAdmin) {
        return ['/', '/devices', '/catalog', '/integration', '/analytics', '/notifications'].includes(item.to)
      }
      if (isBuyer) {
        return ['/', '/devices', '/catalog', '/pricing', '/orders', '/invoicing', '/procurement', '/notifications', '/integration'].includes(item.to)
      }
      if (isVendor) {
        return ['/', '/catalog', '/orders', '/fulfillment', '/invoicing', '/notifications'].includes(item.to)
      }
      return true
    })
    return { ...section, items }
  }).filter(section => section.items.length > 0)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">
          <div className="brand-icon">C</div>
          CIXCI
        </div>
        {user && (
          <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
            {user.company_name}
          </div>
        )}
      </div>

      {filteredNav.map((section) => (
        <div className="nav-section" key={section.label}>
          <div className="nav-label">{section.label}</div>
          {section.items.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </div>
      ))}

      <div className="sidebar-footer">
        <NavLink to="/settings" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <Settings size={15} /> Settings
        </NavLink>
        <button className="nav-item" style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer' }} onClick={handleLogout}>
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </aside>
  )
}
