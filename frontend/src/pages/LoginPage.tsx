import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Eye, EyeOff, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react'
import api from '../lib/apiClient'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const location = useLocation()
  const prefilled = (location.state as any)?.prefilledEmail
  const [email, setEmail] = useState(prefilled || 'admin@cixci.com')
  const [password, setPassword] = useState(prefilled ? '' : 'password')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const { login, loading } = useAuthStore()
  const navigate = useNavigate()

  // Forgot password state
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
      toast.success('Password reset link sent!')
    } catch {
      toast.error('Failed to request password reset.')
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div style={{
            width: 52, height: 52, margin: '0 auto 12px',
            background: 'linear-gradient(135deg, var(--accent), var(--purple))',
            borderRadius: 14, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#fff',
          }}>C</div>
          <div className="auth-title">CIXCI Platform</div>
          <div className="auth-sub">
            {showForgot ? 'Reset your password to regain access' : 'B2B Accessory Commerce — Sign in to continue'}
          </div>
        </div>

        {error && !showForgot && <div className="auth-error">{error}</div>}

        {showForgot ? (
          <div>
            {forgotSent ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 12px'
                }}>
                  <CheckCircle2 size={26} />
                </div>
                <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                  Check your inbox
                </h4>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 20 }}>
                  If an active account exists for <strong style={{ color: 'var(--text-primary)' }}>{forgotEmail}</strong>, we've sent a link to reset your password. The link expires in 60 minutes.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setShowForgot(false); setForgotSent(false); }}
                  style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
                >
                  <ArrowLeft size={15} /> Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit}>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="label">Account email address</label>
                  <input
                    className="input"
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="name@company.com"
                  />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    We'll email you a secure link to create a new password.
                  </div>
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={forgotLoading}
                  style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
                >
                  {forgotLoading ? <><div className="spinner" />Sending link…</> : <><KeyRound size={15} /> Send Reset Link</>}
                </button>
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <button
                    type="button"
                    onClick={() => setShowForgot(false)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', padding: 0 }}
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="label">Email address</label>
              <input
                className="input" type="email" required
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="admin@cixci.com"
              />
            </div>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label className="label" style={{ margin: 0 }}>Password</label>
                <button
                  type="button"
                  onClick={() => { setForgotEmail(email); setShowForgot(true); }}
                  style={{
                    background: 'none', border: 'none', color: 'var(--accent)',
                    fontSize: 12, cursor: 'pointer', padding: 0
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  className="input" type={showPassword ? 'text' : 'password'} required
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
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
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: 8, padding: '10px' }}
            >
              {loading ? <><div className="spinner" />Signing in…</> : 'Sign in'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
