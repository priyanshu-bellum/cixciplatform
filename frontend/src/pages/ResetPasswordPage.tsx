import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import api from '../lib/apiClient'
import toast from 'react-hot-toast'
import { KeyRound, AlertCircle, CheckCircle2, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()

  const [verifying, setVerifying] = useState(true)
  const [userInfo, setUserInfo] = useState<{
    email: string
    first_name?: string
  } | null>(null)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Verify reset token validity on mount (60 minute expiry)
  useEffect(() => {
    if (!token) {
      setVerifying(false)
      setError('Password reset link is missing a valid token.')
      return
    }

    let isMounted = true
    api.get(`/tenant/users/verify_reset_token/?token=${encodeURIComponent(token)}`)
      .then((res) => {
        if (isMounted) {
          if (res.data?.valid) {
            setUserInfo({
              email: res.data.email,
              first_name: res.data.first_name,
            })
          } else {
            setError(res.data?.error || 'Password reset link is invalid or has expired (links expire after 60 minutes).')
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.response?.data?.error || 'Password reset link is invalid or has expired (links expire after 60 minutes).')
        }
      })
      .finally(() => {
        if (isMounted) setVerifying(false)
      })

    return () => {
      isMounted = false
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!token) {
      setError('Password reset token is missing from the URL.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await api.post('/tenant/users/reset_password/', {
        token,
        password,
      })
      setSuccess(true)
      toast.success('Password reset successfully!')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password. The link may have expired or is invalid.')
    } finally {
      setLoading(false)
    }
  }

  if (verifying) {
    return (
      <div className="auth-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="auth-card" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <div className="spinner" style={{ margin: '0 auto 16px', width: 28, height: 28 }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Verifying reset link…</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>Please wait while we validate your security token.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="auth-card" style={{ maxWidth: 440, width: '100%' }}>
        {/* Brand Header */}
        <div className="auth-logo" style={{ marginBottom: 24, textAlign: 'center' }}>
          <div style={{
            width: 52, height: 52, margin: '0 auto 12px',
            background: 'linear-gradient(135deg, var(--accent), #0c3370)',
            borderRadius: 14, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#fff',
          }}>
            <KeyRound size={26} />
          </div>
          <div className="auth-title" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
            Reset your password
          </div>
          <div className="auth-sub" style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Create a new secure password for your CIXCI account
          </div>
        </div>

        {/* Error State */}
        {error && !success && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            background: 'var(--red-dim)',
            border: '1px solid var(--red)',
            color: 'var(--red)',
            padding: '12px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: 13,
            lineHeight: 1.4,
            marginBottom: 20
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontWeight: 600 }}>Unable to proceed</div>
              <div style={{ marginTop: 2 }}>{error}</div>
            </div>
          </div>
        )}

        {/* Success Screen */}
        {success ? (
          <div style={{ textAlign: 'center', padding: '16px 8px' }}>
            <div style={{
              width: 54,
              height: 54,
              borderRadius: '50%',
              background: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              color: '#22c55e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <CheckCircle2 size={30} />
            </div>

            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              Password Reset Complete!
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 24 }}>
              Your password has been securely updated for{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{userInfo?.email}</strong>.
              You can now sign in with your new credentials.
            </p>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate('/login', { state: { prefilledEmail: userInfo?.email } })}
              style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14 }}
            >
              Sign In to CIXCI <ArrowRight size={16} />
            </button>
          </div>
        ) : error && !userInfo ? (
          <div style={{ textAlign: 'center', paddingTop: 8 }}>
            <Link
              to="/login"
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
            >
              Back to Login
            </Link>
          </div>
        ) : (
          /* Password Setup Form */
          <form onSubmit={handleSubmit}>
            {userInfo && (
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                marginBottom: 20,
                fontSize: 13
              }}>
                <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Resetting password for:</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                  {userInfo.first_name ? `${userInfo.first_name} (${userInfo.email})` : userInfo.email}
                </div>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="label">New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  placeholder="At least 8 characters"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', padding: 0, display: 'flex', alignItems: 'center'
                  }}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="label">Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="input"
                  placeholder="Re-enter password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(v => !v)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', padding: 0, display: 'flex', alignItems: 'center'
                  }}
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: 14 }}
            >
              {loading ? (
                <>
                  <div className="spinner" /> Saving New Password…
                </>
              ) : (
                <>
                  <Lock size={15} /> Save New Password
                </>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Link to="/login" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>
                Remembered your password? Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
