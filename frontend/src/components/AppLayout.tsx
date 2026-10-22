import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Box from '@mui/material/Box'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Avatar from '@mui/material/Avatar'
import MenuIcon from '@mui/icons-material/Menu'
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined'
import LightModeIcon from '@mui/icons-material/LightModeOutlined'
import DarkModeIcon from '@mui/icons-material/DarkModeOutlined'
import Sidebar, { DRAWER_WIDTH } from './Sidebar'
import { useAuthStore } from '../stores/authStore'
import { useThemeMode } from '../theme/ThemeProvider'
import SearchBar from './forms/SearchBar'

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
  '/regions': 'Regional Visibility',
  '/users': 'Company Users',
  '/settings': 'Settings',
}

export default function AppLayout() {
  const { pathname } = useLocation()
  const { user } = useAuthStore()
  const { mode, toggleMode } = useThemeMode()
  const [mobileOpen, setMobileOpen] = useState(false)

  const title = TITLES[pathname] ?? 'CIXCI'
  const initials = user?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? 'U'

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          width: { xs: '100%', md: `calc(100% - ${DRAWER_WIDTH}px)` },
        }}
      >
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: 'background.paper',
            color: 'text.primary',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Toolbar variant="dense" sx={{ gap: 1 }}>
            <IconButton
              edge="start"
              onClick={() => setMobileOpen(true)}
              sx={{ display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>

            <Typography variant="h5" sx={{ fontWeight: 600, flexShrink: 0 }}>
              {title}
            </Typography>

            <Box sx={{ flex: 1 }} />

            <SearchBar
              sx={{ display: { xs: 'none', sm: 'flex' }, maxWidth: 260 }}
              size="small"
            />

            <IconButton onClick={toggleMode} size="small" title={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}>
              {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
            </IconButton>

            <IconButton size="small">
              <NotificationsOutlinedIcon fontSize="small" />
            </IconButton>

            <Avatar
              sx={{ width: 28, height: 28, fontSize: 11, fontWeight: 700, bgcolor: 'primary.main' }}
              title={user?.email}
            >
              {initials}
            </Avatar>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ flex: 1, p: { xs: 2, sm: 3 }, overflow: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
