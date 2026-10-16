import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Link from '@mui/material/Link'
import Divider from '@mui/material/Divider'
import LoadingButton from '@mui/lab/LoadingButton'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
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

  const logoSrc = mode === 'dark'
    ? '/cixci-logo-white-rgb-864px@72ppi.png'
    : '/cixci-logo-color.jpeg'

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        background: mode === 'dark'
          ? 'radial-gradient(ellipse at 50% 0%, #0f1b33 0%, #0a0d14 70%)'
          : 'radial-gradient(ellipse at 50% 0%, #e0edff 0%, #f8fafc 70%)',
        p: 2,
      }}
    >
      <Box sx={{ maxWidth: 440, width: '100%' }}>
        {/* Logo */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            component="img"
            src={logoSrc}
            alt="CIXCI"
            sx={{
              height: 44,
              maxWidth: 200,
              objectFit: 'contain',
              mx: 'auto',
              display: 'block',
            }}
          />
        </Box>

        <Card
          elevation={mode === 'dark' ? 8 : 2}
          sx={{
            borderRadius: 3,
            border: 1,
            borderColor: mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'divider',
          }}
        >
          <CardContent sx={{ px: { xs: 3, sm: 4.5 }, py: 4 }}>
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 3.5 }}>
              <Typography variant="h3" sx={{ fontWeight: 700, mb: 0.5 }}>
                {showForgot ? 'Reset Password' : 'Welcome back'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {showForgot
                  ? 'Enter your email and we\'ll send a reset link'
                  : 'Sign in to your CIXCI account to continue'}
              </Typography>
            </Box>

            {error && !showForgot && (
              <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>
            )}

            {showForgot ? (
              forgotSent ? (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <CheckCircleOutlineIcon sx={{ fontSize: 52, color: 'success.main', mb: 2 }} />
                  <Typography variant="h5" gutterBottom>Check your inbox</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    If an active account exists for <strong>{forgotEmail}</strong>, we've sent a link to reset your password. The link expires in 60 minutes.
                  </Typography>
                  <LoadingButton
                    fullWidth
                    variant="outlined"
                    startIcon={<ArrowBackIcon />}
                    onClick={() => { setShowForgot(false); setForgotSent(false); }}
                  >
                    Back to Sign In
                  </LoadingButton>
                </Box>
              ) : (
                <form onSubmit={handleForgotSubmit}>
                  <TextField
                    label="Account email address"
                    type="email"
                    required
                    fullWidth
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="name@company.com"
                    helperText="We'll email you a secure link to create a new password."
                    sx={{ mb: 2.5 }}
                  />
                  <LoadingButton
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    loading={forgotLoading}
                  >
                    Send Reset Link
                  </LoadingButton>
                  <Box sx={{ textAlign: 'center', mt: 2 }}>
                    <Link component="button" variant="body2" onClick={() => setShowForgot(false)} underline="hover">
                      Back to Sign In
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
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@cixci.com"
                  sx={{ mb: 2.5 }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Password</Typography>
                  <Link
                    component="button"
                    type="button"
                    variant="caption"
                    onClick={() => { setForgotEmail(email); setShowForgot(true); }}
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
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword(v => !v)} edge="end" size="small" tabIndex={-1}>
                            {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{ mb: 3 }}
                />
                <LoadingButton
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  loading={loading}
                  startIcon={<LockOutlinedIcon />}
                >
                  Sign in
                </LoadingButton>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Divider sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.disabled">CIXCI B2B Commerce</Typography>
          </Divider>
          <Typography variant="caption" color="text.disabled">
            Secure enterprise platform for accessory vendor commerce
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
