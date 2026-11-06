import { NavLink, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import Avatar from '@mui/material/Avatar'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
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
import CollectionsIcon from '@mui/icons-material/CollectionsOutlined'
import BarChartIcon from '@mui/icons-material/BarChartOutlined'
import PowerIcon from '@mui/icons-material/PowerOutlined'
import RocketIcon from '@mui/icons-material/RocketLaunchOutlined'
import PublicIcon from '@mui/icons-material/Public'
import SettingsIcon from '@mui/icons-material/SettingsOutlined'
import LogoutIcon from '@mui/icons-material/LogoutOutlined'
import PeopleIcon from '@mui/icons-material/PeopleOutlined'
import ApiIcon from '@mui/icons-material/ApiOutlined'
import { useAuthStore } from '../stores/authStore'
import { useThemeMode } from '../theme/ThemeProvider'
import ConfirmDialog from './feedback/ConfirmDialog'
import { useConfirmDialog } from '../hooks/useConfirmDialog'

export const DRAWER_WIDTH = 260

const NAV = [
  {
    label: 'Core',
    items: [
      { to: '/', icon: <DashboardIcon fontSize="small" />, label: 'Dashboard' },
      { to: '/devices', icon: <SmartphoneIcon fontSize="small" />, label: 'Device Catalog' },
      { to: '/catalog', icon: <ShoppingBagIcon fontSize="small" />, label: 'Product Catalog' },
      { to: '/pricing', icon: <AttachMoneyIcon fontSize="small" />, label: 'Pricing' },
      { to: '/regions', icon: <PublicIcon fontSize="small" />, label: 'Regions' },
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
      { to: '/product-images', icon: <CollectionsIcon fontSize="small" />, label: 'Product Images' },
      { to: '/analytics', icon: <BarChartIcon fontSize="small" />, label: 'Analytics' },
      { to: '/integration', icon: <PowerIcon fontSize="small" />, label: 'Integration' },
      { to: '/launch', icon: <RocketIcon fontSize="small" />, label: 'Launch' },
    ],
  },
]

const navItemSx = {
  mx: 1.5,
  borderRadius: 2,
  mb: 0.5,
  py: 0.75,
  px: 1.5,
  transition: 'all 0.15s ease',
  position: 'relative' as const,
  '&::before': {
    content: '""',
    position: 'absolute',
    left: -12,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 3,
    height: 0,
    borderRadius: 4,
    bgcolor: 'primary.main',
    transition: 'height 0.2s ease',
  },
  '&:hover': {
    bgcolor: 'action.hover',
  },
  '&.active': {
    bgcolor: 'action.selected',
    color: 'primary.main',
    fontWeight: 600,
    '& .MuiListItemIcon-root': { color: 'primary.main' },
    '&::before': { height: 20 },
  },
}

interface SidebarProps {
  mobileOpen: boolean
  onMobileClose: () => void
}

export default function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const { mode } = useThemeMode()
  const { dialogProps, confirm } = useConfirmDialog()

  const isCixciAdmin = user?.is_cixci_admin || user?.company_type === 'cixci_internal'
  const isBuyer = user?.company_type === 'buyer'
  const isVendor = user?.company_type === 'vendor'

  const initials = user?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? 'U'
  const roleLabel = isCixciAdmin ? 'System Admin' : isBuyer ? 'Buyer' : isVendor ? 'Vendor' : 'User'

  const filteredNav = NAV.map(section => {
    const items = section.items.filter(item => {
      if (isCixciAdmin) {
        return ['/', '/devices', '/catalog', '/orders', '/fulfillment', '/invoicing', '/integration', '/analytics', '/notifications', '/regions', '/media'].includes(item.to)
      }
      if (isBuyer) {
        return ['/', '/devices', '/catalog', '/orders', '/fulfillment', '/invoicing', '/notifications', '/integration', '/product-images'].includes(item.to)
      }
      if (isVendor) {
        return ['/', '/catalog', '/orders', '/fulfillment', '/invoicing', '/notifications', '/regions', '/media'].includes(item.to)
      }
      return true
    })
    return { ...section, items }
  }).filter(section => section.items.length > 0)

  const handleLogout = async () => {
    const confirmed = await confirm({
      title: 'Sign out?',
      message: 'Are you sure you want to sign out?',
      confirmLabel: 'Sign out',
      cancelLabel: 'Cancel',
      confirmColor: 'warning',
    })
    if (!confirmed) return

    logout()
    navigate('/login')
  }

  const drawerPaperSx = {
    bgcolor: mode === 'dark' ? '#0c1021' : '#fafbfd',
    borderRight: '1px solid',
    borderColor: mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
  }

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Brand */}
      <Box sx={{ px: 2.5, pt: 2.5, pb: 2 }}>
        <Box
          component="img"
          src={mode === 'dark' ? '/cixci-logo-white-rgb-864px@72ppi.png' : '/cixci-logo-color.jpeg'}
          alt="CIXCI"
          sx={{ height: 38, objectFit: 'contain' }}
        />
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, overflow: 'auto', py: 0.5 }}>
        {filteredNav.map((section, idx) => (
          <Box key={section.label} sx={{ mb: 0.5 }}>
            <Typography
              sx={{
                px: 3,
                display: 'block',
                mt: idx === 0 ? 0.5 : 2,
                mb: 1,
                fontSize: '0.625rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'text.disabled',
              }}
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
                  sx={navItemSx}
                >
                  <ListItemIcon sx={{ minWidth: 30, color: 'text.secondary' }}>{icon}</ListItemIcon>
                  <ListItemText
                    primary={label}
                    slotProps={{ primary: { sx: { fontSize: '0.8125rem', fontWeight: 500 } } }}
                  />
                </ListItemButton>
              ))}
            </List>
          </Box>
        ))}
      </Box>

      {/* Footer — utility links */}
      <Box sx={{ px: 1.5, pb: 1 }}>
        <Box sx={{
          borderTop: '1px solid',
          borderColor: mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          pt: 1,
        }}>
          <List dense disablePadding>
            <ListItemButton component={NavLink} to="/users" sx={navItemSx}>
              <ListItemIcon sx={{ minWidth: 30, color: 'text.secondary' }}><PeopleIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="Users" slotProps={{ primary: { sx: { fontSize: '0.8125rem', fontWeight: 500 } } }} />
            </ListItemButton>
            <ListItemButton component={NavLink} to="/settings" sx={navItemSx}>
              <ListItemIcon sx={{ minWidth: 30, color: 'text.secondary' }}><SettingsIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="Settings" slotProps={{ primary: { sx: { fontSize: '0.8125rem', fontWeight: 500 } } }} />
            </ListItemButton>
            {isCixciAdmin && (
              <ListItemButton
                component="a"
                href="/api/v1/docs/"
                target="_blank"
                rel="noopener noreferrer"
                sx={navItemSx}
              >
                <ListItemIcon sx={{ minWidth: 30, color: 'text.secondary' }}><ApiIcon fontSize="small" /></ListItemIcon>
                <ListItemText primary="API Docs" slotProps={{ primary: { sx: { fontSize: '0.8125rem', fontWeight: 500 } } }} />
              </ListItemButton>
            )}
          </List>
        </Box>
      </Box>

      {/* User Profile Card */}
      {user && (
        <Box sx={{
          mx: 1.5,
          mb: 1.5,
          p: 1.5,
          borderRadius: 2.5,
          bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
          border: '1px solid',
          borderColor: mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}>
          <Avatar
            sx={{
              width: 34,
              height: 34,
              fontSize: 13,
              fontWeight: 700,
              bgcolor: 'primary.main',
              flexShrink: 0,
            }}
          >
            {initials}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{ fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.3 }}
              noWrap
            >
              {user.full_name}
            </Typography>
            <Typography
              sx={{ fontSize: '0.6875rem', color: 'text.disabled', lineHeight: 1.3 }}
              noWrap
            >
              {user.company_name} · {roleLabel}
            </Typography>
          </Box>
          <Tooltip title="Sign out" placement="top">
            <IconButton
              size="small"
              onClick={handleLogout}
              sx={{
                color: 'text.disabled',
                '&:hover': { color: 'error.main' },
              }}
            >
              <LogoutIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
      )}
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
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            ...drawerPaperSx,
          },
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
            ...drawerPaperSx,
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>

      <ConfirmDialog {...dialogProps} />
    </>
  )
}
