import { NavLink, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import DashboardIcon from '@mui/icons-material/DashboardOutlined'
import SmartphoneIcon from '@mui/icons-material/SmartphoneOutlined'
import ShoppingBagIcon from '@mui/icons-material/ShoppingBagOutlined'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import InventoryIcon from '@mui/icons-material/Inventory2Outlined'
import LocalShippingIcon from '@mui/icons-material/LocalShippingOutlined'
import ReceiptIcon from '@mui/icons-material/ReceiptLongOutlined'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCartOutlined'
import NotificationsIcon from '@mui/icons-material/NotificationsOutlined'
import ImageIcon from '@mui/icons-material/ImageOutlined'
import BarChartIcon from '@mui/icons-material/BarChartOutlined'
import PowerIcon from '@mui/icons-material/PowerOutlined'
import RocketIcon from '@mui/icons-material/RocketLaunchOutlined'
import SettingsIcon from '@mui/icons-material/SettingsOutlined'
import LogoutIcon from '@mui/icons-material/LogoutOutlined'
import PeopleIcon from '@mui/icons-material/PeopleOutlined'
import { useAuthStore } from '../stores/authStore'
import { useThemeMode } from '../theme/ThemeProvider'

export const DRAWER_WIDTH = 240

const NAV = [
  {
    label: 'Core',
    items: [
      { to: '/', icon: <DashboardIcon fontSize="small" />, label: 'Dashboard' },
      { to: '/devices', icon: <SmartphoneIcon fontSize="small" />, label: 'Device Catalog' },
      { to: '/catalog', icon: <ShoppingBagIcon fontSize="small" />, label: 'Product Catalog' },
      { to: '/pricing', icon: <AttachMoneyIcon fontSize="small" />, label: 'Pricing' },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { to: '/orders', icon: <InventoryIcon fontSize="small" />, label: 'Orders' },
      { to: '/fulfillment', icon: <LocalShippingIcon fontSize="small" />, label: 'Fulfillment' },
      { to: '/invoicing', icon: <ReceiptIcon fontSize="small" />, label: 'Invoice' },
      { to: '/procurement', icon: <ShoppingCartIcon fontSize="small" />, label: 'Procurement' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { to: '/notifications', icon: <NotificationsIcon fontSize="small" />, label: 'Notifications' },
      { to: '/media', icon: <ImageIcon fontSize="small" />, label: 'Media' },
      { to: '/analytics', icon: <BarChartIcon fontSize="small" />, label: 'Analytics' },
      { to: '/integration', icon: <PowerIcon fontSize="small" />, label: 'Integration' },
      { to: '/launch', icon: <RocketIcon fontSize="small" />, label: 'Launch' },
    ],
  },
]

interface SidebarProps {
  mobileOpen: boolean
  onMobileClose: () => void
}

export default function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const { mode } = useThemeMode()

  const isCixciAdmin = user?.is_cixci_admin || user?.company_type === 'cixci_internal'
  const isBuyer = user?.company_type === 'buyer'
  const isVendor = user?.company_type === 'vendor'

  const filteredNav = NAV.map(section => {
    const items = section.items.filter(item => {
      if (isCixciAdmin) {
        return ['/', '/devices', '/catalog', '/orders', '/fulfillment', '/invoicing', '/integration', '/analytics', '/notifications'].includes(item.to)
      }
      if (isBuyer) {
        return ['/', '/devices', '/catalog', '/pricing', '/orders', '/fulfillment', '/invoicing', '/procurement', '/notifications', '/integration'].includes(item.to)
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

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Brand */}
      <Box sx={{ px: 2.5, py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            component="img"
            src={mode === 'dark' ? '/cixci-logo-white-rgb-864px@72ppi.png' : '/cixci-logo-color.jpeg'}
            alt="CIXCI"
            sx={{ height: 32, objectFit: 'contain' }}
          />
        </Box>
        {user && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {user.company_name}
          </Typography>
        )}
      </Box>

      <Divider />

      {/* Navigation */}
      <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
        {filteredNav.map((section) => (
          <Box key={section.label} sx={{ mb: 1 }}>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ px: 2.5, display: 'block', mt: 1.5, mb: 0.5 }}
            >
              {section.label}
            </Typography>
            <List dense disablePadding>
              {section.items.map(({ to, icon, label }) => (
                <ListItemButton
                  key={to}
                  component={NavLink}
                  to={to}
                  end={to === '/' ? true : undefined}
                  onClick={onMobileClose}
                  sx={{
                    mx: 1,
                    borderRadius: 1.5,
                    mb: 0.25,
                    '&.active': {
                      bgcolor: 'action.selected',
                      color: 'primary.main',
                      '& .MuiListItemIcon-root': { color: 'primary.main' },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>{icon}</ListItemIcon>
                  <ListItemText primary={label} slotProps={{ primary: { sx: { fontSize: '0.8125rem' } } }} />
                </ListItemButton>
              ))}
            </List>
          </Box>
        ))}
      </Box>

      <Divider />

      {/* Footer */}
      <Box sx={{ py: 1 }}>
        <List dense disablePadding>
          <ListItemButton
            component={NavLink}
            to="/users"
            sx={{ mx: 1, borderRadius: 1.5, '&.active': { bgcolor: 'action.selected', color: 'primary.main' } }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}><PeopleIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Users" slotProps={{ primary: { sx: { fontSize: '0.8125rem' } } }} />
          </ListItemButton>
          <ListItemButton
            component={NavLink}
            to="/settings"
            sx={{ mx: 1, borderRadius: 1.5, '&.active': { bgcolor: 'action.selected', color: 'primary.main' } }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}><SettingsIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Settings" slotProps={{ primary: { sx: { fontSize: '0.8125rem' } } }} />
          </ListItemButton>
          <ListItemButton onClick={handleLogout} sx={{ mx: 1, borderRadius: 1.5 }}>
            <ListItemIcon sx={{ minWidth: 32 }}><LogoutIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Sign out" slotProps={{ primary: { sx: { fontSize: '0.8125rem' } } }} />
          </ListItemButton>
        </List>
      </Box>
    </Box>
  )

  return (
    <>
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            borderRight: 1,
            borderColor: 'divider',
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </>
  )
}
