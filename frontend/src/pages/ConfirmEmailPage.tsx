import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import LoadingButton from '@mui/lab/LoadingButton'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined'
import api from '../lib/apiClient'
import { useSnackbar } from '../components/feedback/SnackbarProvider'
import { useThemeMode } from '../theme/ThemeProvider'

export default function ConfirmEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const { showSnackbar } = useSnackbar()
  const { mode } = useThemeMode()

  const [verifying, setVerifying] = useState(true)
  const [recipientInfo, setRecipientInfo] = useState<{
    email: string; first_name?: string; company_name?: string;
  } | null>(null)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [confirmedEmail, setConfirmedEmail] = useState('')

  useEffect(() => {
    if (!token) {
      setVerifying(false)
      setError('Activation link is missing a valid token.')
      return
    }
    let isMounted = true
    api.get(`/tenant/users/verify_token/?token=${encodeURIComponent(token)}`)
      .then((res) => {
        if (isMounted) {
          if (res.data?.valid) {
            setRecipientInfo({ email: res.data.email, first_name: res.data.first_name, company_name: res.data.company_name })
            setConfirmedEmail(res.data.email)
          } else {
            setError(res.data?.error || 'Activation link is invalid or has expired.')
          }
        }
      })
      .catch((err) => { if (isMounted) setError(err.response?.data?.error || 'Activation link is invalid or has expired.') })
      .finally(() => { if (isMounted) setVerifying(false) })
    return () => { isMounted = false }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!token) { setError('Activation token is missing from the URL.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters long.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }

    setLoading(true)
    try {
      const res = await api.post('/tenant/users/confirm_email/', { token, password })
      if (res.data?.email) setConfirmedEmail(res.data.email)
      setSuccess(true)
      showSnackbar('Account activated successfully!', 'success')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to activate account. The link may have expired or is invalid.')
    } finally {
      setLoading(false)
    }
  }

  if (verifying) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
        <Card sx={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
          <CardContent sx={{ p: 4 }}>
            <CircularProgress size={28} sx={{ mb: 2 }} />
            <Typography variant="h5">Verifying Activation Link</Typography>
            <Typography variant="body2" color="text.secondary">Connecting to CIXCI Platform</Typography>
          </CardContent>
        </Card>
      </Box>
    )
  }

  if (success) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 2 }}>
        <Card sx={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
          <CardContent sx={{ p: 4 }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 56, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>Account Activated!</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Your email has been confirmed and your password is set.
              {confirmedEmail && <> Ready to log in as <strong>{confirmedEmail}</strong></>}
            </Typography>
            <LoadingButton
              fullWidth
              variant="contained"
              onClick={() => navigate('/login', { state: { prefilledEmail: confirmedEmail } })}
            >
              Proceed to Login
            </LoadingButton>
          </CardContent>
        </Card>
      </Box>
    )
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 2 }}>
      <Card sx={{ maxWidth: 420, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box
              component="img"
              src={mode === 'dark' ? '/cixci-logo-white-rgb-864px@72ppi.png' : '/cixci-logo-color.jpeg'}
              alt="CIXCI"
              sx={{ height: 40, maxWidth: 180, objectFit: 'contain', mx: 'auto', display: 'block', mb: 2 }}
            />
            <Typography variant="h4">Confirm Your Account</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {recipientInfo?.first_name
                ? `Hi ${recipientInfo.first_name}, please set your password to log in to CIXCI.`
                : recipientInfo?.email
                ? `Set your password for ${recipientInfo.email} to activate your account.`
                : 'Set your secure password to activate your CIXCI account.'}
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {!token || (!recipientInfo && error) ? (
            <LoadingButton fullWidth variant="outlined" onClick={() => navigate('/login')}>
              Return to Login
            </LoadingButton>
          ) : (
            <form onSubmit={handleSubmit}>
              {recipientInfo?.email && (
                <TextField
                  label="Confirmed Email"
                  fullWidth size="small" disabled
                  value={recipientInfo.email}
                  sx={{ mb: 2 }}
                />
              )}
              <TextField
                label="Set New Password"
                type="password" required fullWidth size="small"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                sx={{ mb: 2 }}
              />
              <TextField
                label="Confirm Password"
                type="password" required fullWidth size="small"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                sx={{ mb: 2 }}
              />
              <LoadingButton type="submit" fullWidth variant="contained" loading={loading}>
                Activate Account
              </LoadingButton>
            </form>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
