import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Box from '@mui/material/Box'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import MenuIcon from '@mui/icons-material/Menu'
import LightModeIcon from '@mui/icons-material/LightModeOutlined'
import DarkModeIcon from '@mui/icons-material/DarkModeOutlined'
import Sidebar, { DRAWER_WIDTH } from './Sidebar'
import { useThemeMode } from '../theme/ThemeProvider'
import SearchBar from './forms/SearchBar'
import NotificationBell from './NotificationBell'

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
  '/product-images': 'Product Images',
}

// Pill-style page tabs for every page rendered inside the layout (dialogs keep the default tabs)
const pageTabsSx = {
  '& .MuiTabs-root': { borderBottom: 'none', minHeight: 36 },
  '& .MuiTabs-indicator': { display: 'none' },
  '& .MuiTabs-flexContainer, & .MuiTabs-list': { gap: 1 },
  '& .MuiTab-root': {
    minHeight: 34,
    px: 2,
    py: 0,
    fontSize: '0.78125rem',
    fontWeight: 600,
    borderRadius: '999px',
    border: 1,
    borderColor: 'divider',
    bgcolor: 'background.paper',
    color: 'text.primary',
    transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease',
    '&:hover': { borderColor: 'text.secondary' },
  },
  '& .MuiTab-root.Mui-selected': { bgcolor: 'text.primary', borderColor: 'text.primary', color: 'background.paper' },
}

export default function AppLayout() {
  const { pathname } = useLocation()
  const { mode, toggleMode } = useThemeMode()
  const [mobileOpen, setMobileOpen] = useState(false)

  const title = pathname.startsWith('/settings/vendor-integrations') ? 'Vendor Integrations' : TITLES[pathname] ?? TITLES[`/${pathname.split('/')[1]}`] ?? 'CIXCI'

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
            bgcolor: 'background.default',
            color: 'text.primary',
            borderBottom: 1,
            borderColor: 'divider',
            backdropFilter: 'blur(8px)',
          }}
        >
          <Toolbar sx={{ gap: 1, minHeight: { xs: 52, sm: 52 } }}>
            <IconButton
              edge="start"
              onClick={() => setMobileOpen(true)}
              sx={{ display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>

            <Typography sx={{ fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>
              {title}
            </Typography>

            <Box sx={{ flex: 1 }} />

            <SearchBar
              sx={{ display: { xs: 'none', sm: 'flex' }, maxWidth: 240 }}
              size="small"
            />

            <Tooltip title={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}>
              <IconButton onClick={toggleMode} size="small">
                {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
              </IconButton>
            </Tooltip>

            <NotificationBell />
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ flex: 1, p: { xs: 2, sm: 3 }, overflow: 'auto', ...pageTabsSx }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
