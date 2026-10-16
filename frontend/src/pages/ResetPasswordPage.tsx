import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import MuiLink from '@mui/material/Link'
import LoadingButton from '@mui/lab/LoadingButton'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined'

import api from '../lib/apiClient'
import { useSnackbar } from '../components/feedback/SnackbarProvider'
import { useThemeMode } from '../theme/ThemeProvider'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const { showSnackbar } = useSnackbar()
  const { mode } = useThemeMode()

  const [verifying, setVerifying] = useState(true)
  const [userInfo, setUserInfo] = useState<{ email: string; first_name?: string } | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) { setVerifying(false); setError('Password reset link is missing a valid token.'); return }
    let isMounted = true
    api.get(`/tenant/users/verify_reset_token/?token=${encodeURIComponent(token)}`)
      .then((res) => {
        if (isMounted) {
          if (res.data?.valid) setUserInfo({ email: res.data.email, first_name: res.data.first_name })
          else setError(res.data?.error || 'Password reset link is invalid or has expired.')
        }
      })
      .catch((err) => { if (isMounted) setError(err.response?.data?.error || 'Password reset link is invalid or has expired.') })
      .finally(() => { if (isMounted) setVerifying(false) })
    return () => { isMounted = false }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!token) { setError('Password reset token is missing.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters long.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }

    setLoading(true)
    try {
      await api.post('/tenant/users/reset_password/', { token, password })
      setSuccess(true)
      showSnackbar('Password reset successfully!', 'success')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password. The link may have expired or is invalid.')
    } finally {
      setLoading(false)
    }
  }

  if (verifying) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <Card sx={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
          <CardContent sx={{ p: 5 }}>
            <CircularProgress size={28} sx={{ mb: 2 }} />
            <Typography variant="h5">Verifying reset link</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Validating your security token.</Typography>
          </CardContent>
        </Card>
      </Box>
    )
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 2 }}>
      <Card sx={{ maxWidth: 440, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box
              component="img"
              src={mode === 'dark' ? '/cixci-logo-white-rgb-864px@72ppi.png' : '/cixci-logo-color.jpeg'}
              alt="CIXCI"
              sx={{ height: 40, maxWidth: 180, objectFit: 'contain', mx: 'auto', display: 'block', mb: 2 }}
            />
            <Typography variant="h4">Reset your password</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Create a new secure password for your CIXCI account
            </Typography>
          </Box>

          {error && !success && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <AlertTitle>Unable to proceed</AlertTitle>
              {error}
            </Alert>
          )}

          {success ? (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <CheckCircleOutlineIcon sx={{ fontSize: 54, color: 'success.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>Password Reset Complete!</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Your password has been securely updated for <strong>{userInfo?.email}</strong>.
              </Typography>
              <LoadingButton
                fullWidth variant="contained"
                onClick={() => navigate('/login', { state: { prefilledEmail: userInfo?.email } })}
              >
                Sign In to CIXCI
              </LoadingButton>
            </Box>
          ) : error && !userInfo ? (
            <LoadingButton fullWidth variant="outlined" component={RouterLink} to="/login">
              Back to Login
            </LoadingButton>
          ) : (
            <form onSubmit={handleSubmit}>
              {userInfo && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Resetting password for: <strong>{userInfo.first_name ? `${userInfo.first_name} (${userInfo.email})` : userInfo.email}</strong>
                </Alert>
              )}

              <TextField
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                required fullWidth size="small"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
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
                sx={{ mb: 2 }}
              />

              <TextField
                label="Confirm New Password"
                type={showConfirmPassword ? 'text' : 'password'}
                required fullWidth size="small"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowConfirmPassword(v => !v)} edge="end" size="small" tabIndex={-1}>
                          {showConfirmPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ mb: 3 }}
              />

              <LoadingButton type="submit" fullWidth variant="contained" loading={loading}>
                Save New Password
              </LoadingButton>

              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <MuiLink component={RouterLink} to="/login" variant="body2" underline="hover">
                  Remembered your password? Back to Login
                </MuiLink>
              </Box>
            </form>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
