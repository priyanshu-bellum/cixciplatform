import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Link from '@mui/material/Link'
import LoadingButton from '@mui/lab/LoadingButton'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import StorefrontIcon from '@mui/icons-material/Storefront'
import InventoryIcon from '@mui/icons-material/Inventory'
import DevicesIcon from '@mui/icons-material/Devices'
import HandshakeIcon from '@mui/icons-material/Handshake'
import { useAuthStore } from '../stores/authStore'
import api from '../lib/apiClient'
import { useSnackbar } from '../components/feedback/SnackbarProvider'
import { useThemeMode } from '../theme/ThemeProvider'

export default function LoginPage() {
  const location = useLocation()
  const prefilled = (location.state as any)?.prefilledEmail
  const [email, setEmail] = useState(prefilled || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const { login, loading } = useAuthStore()
  const navigate = useNavigate()
  const { showSnackbar } = useSnackbar()
  const { mode } = useThemeMode()

  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      navigate('/')
    } catch {
      setError('Invalid email or password.')
    }
  }

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotEmail.trim()) return
    setForgotLoading(true)
    try {
      await api.post('/tenant/users/request_password_reset/', { email: forgotEmail.trim() })
      setForgotSent(true)
      showSnackbar('Password reset link sent!', 'success')
    } catch {
      showSnackbar('Failed to request password reset.', 'error')
    } finally {
      setForgotLoading(false)
    }
  }

  const capabilities = [
    {
      icon: <StorefrontIcon sx={{ fontSize: 20 }} />,
      title: 'Vendor Catalog Management',
      desc: 'Onboard products, manage pricing, and sync inventory across all your retail partners.',
    },
    {
      icon: <DevicesIcon sx={{ fontSize: 20 }} />,
      title: 'Device Compatibility Engine',
      desc: 'Automatic accessory-to-device mapping powered by controlled device features and rules.',
    },
    {
      icon: <InventoryIcon sx={{ fontSize: 20 }} />,
      title: 'Buyer Procurement Tools',
      desc: 'Curate assortments, track compatibility projections, and export orders seamlessly.',
    },
    {
      icon: <HandshakeIcon sx={{ fontSize: 20 }} />,
      title: 'Multi-Tenant B2B Commerce',
      desc: 'Separate workspaces for vendors, buyers, and admins with role-based access controls.',
    },
  ]

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex' }}>
      {/* ── Left branded panel ── */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          width: '52%',
          minWidth: 480,
          bgcolor: '#0b1120',
          color: '#e2e8f0',
          px: { md: 6, lg: 8 },
          py: 6,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '-30%',
            right: '-20%',
            width: '70%',
            height: '70%',
            background: 'radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: '-20%',
            left: '-10%',
            width: '50%',
            height: '50%',
            background: 'radial-gradient(circle, rgba(79,142,247,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
          },
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 520 }}>
          <Box
            component="img"
            src="/cixci-logo-white-rgb-864px@72ppi.png"
            alt="CIXCI"
            sx={{ height: 36, objectFit: 'contain', mb: 6 }}
          />

          <Typography
            sx={{
              fontSize: { md: '1.75rem', lg: '2rem' },
              fontWeight: 700,
              lineHeight: 1.3,
              letterSpacing: '-0.02em',
              color: '#f1f5f9',
              mb: 1.5,
            }}
          >
            The accessory commerce platform built for scale.
          </Typography>
          <Typography
            sx={{
              fontSize: '0.95rem',
              color: '#94a3b8',
              lineHeight: 1.6,
              mb: 5,
              maxWidth: 440,
            }}
          >
            Connect vendors, buyers, and device manufacturers on one platform.
            From catalog to checkout, CIXCI handles the complexity.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {capabilities.map((c) => (
              <Box key={c.title} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <Box
                  sx={{
                    mt: '2px',
                    width: 36,
                    height: 36,
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'rgba(79,142,247,0.1)',
                    color: '#4f8ef7',
                    flexShrink: 0,
                  }}
                >
                  {c.icon}
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#e2e8f0', mb: 0.25 }}>
                    {c.title}
                  </Typography>
                  <Typography sx={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>
                    {c.desc}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>

          <Box sx={{ mt: 6, pt: 4, borderTop: '1px solid rgba(148,163,184,0.12)' }}>
            <Typography sx={{ fontSize: '0.75rem', color: '#475569' }}>
              Trusted by wireless carriers, MVNOs, and accessory brands across the US.
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ── Right form panel ── */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: mode === 'dark' ? '#0a0d14' : '#ffffff',
          px: { xs: 3, sm: 5 },
          py: 4,
          minHeight: '100vh',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          {/* Mobile logo */}
          <Box sx={{ display: { xs: 'block', md: 'none' }, textAlign: 'center', mb: 5 }}>
            <Box
              component="img"
              src={mode === 'dark' ? '/cixci-logo-white-rgb-864px@72ppi.png' : '/cixci-logo-color.jpeg'}
              alt="CIXCI"
              sx={{ height: 36, objectFit: 'contain' }}
            />
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography
              variant="h4"
              sx={{ fontWeight: 700, mb: 0.5, fontSize: '1.5rem', color: 'text.primary' }}
            >
              {showForgot ? 'Reset password' : 'Sign in'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {showForgot
                ? "Enter your email and we'll send a reset link."
                : 'Enter your credentials to access your account.'}
            </Typography>
          </Box>

          {error && !showForgot && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 1.5 }}>{error}</Alert>
          )}

          {showForgot ? (
            forgotSent ? (
              <Box sx={{ py: 2 }}>
                <CheckCircleOutlineIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>Check your inbox</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
                  If an active account exists for <strong>{forgotEmail}</strong>, we've sent a password reset link. It expires in 60 minutes.
                </Typography>
                <LoadingButton
                  fullWidth
                  variant="outlined"
                  startIcon={<ArrowBackIcon />}
                  onClick={() => { setShowForgot(false); setForgotSent(false) }}
                  sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}
                >
                  Back to sign in
                </LoadingButton>
              </Box>
            ) : (
              <form onSubmit={handleForgotSubmit}>
                <TextField
                  label="Email address"
                  type="email"
                  required
                  fullWidth
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="you@company.com"
                  helperText="We'll email you a secure link to create a new password."
                  sx={{ mb: 3 }}
                />
                <LoadingButton
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  loading={forgotLoading}
                  sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600, py: 1.3 }}
                >
                  Send reset link
                </LoadingButton>
                <Box sx={{ textAlign: 'center', mt: 2.5 }}>
                  <Link
                    component="button"
                    variant="body2"
                    onClick={() => setShowForgot(false)}
                    underline="hover"
                    sx={{ fontWeight: 500 }}
                  >
                    Back to sign in
                  </Link>
                </Box>
              </form>
            )
          ) : (
            <form onSubmit={handleSubmit}>
              <TextField
                label="Email address"
                type="email"
                required
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                sx={{ mb: 2.5 }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Password
                </Typography>
                <Link
                  component="button"
                  type="button"
                  variant="caption"
                  onClick={() => { setForgotEmail(email); setShowForgot(true) }}
                  underline="hover"
                  sx={{ fontWeight: 500 }}
                >
                  Forgot password?
                </Link>
              </Box>
              <TextField
                type={showPassword ? 'text' : 'password'}
                required
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword((v) => !v)}
                          edge="end"
                          size="small"
                          tabIndex={-1}
                        >
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ mb: 3.5 }}
              />
              <LoadingButton
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                loading={loading}
                sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600, py: 1.3 }}
              >
                Sign in
              </LoadingButton>
            </form>
          )}

          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ display: 'block', textAlign: 'center', mt: 5 }}
          >
            &copy; {new Date().getFullYear()} CIXCI Inc. All rights reserved.
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
