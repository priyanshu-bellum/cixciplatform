import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../lib/apiClient'
import toast from 'react-hot-toast'
import { ShieldCheck, AlertCircle, CheckCircle2, Lock, ArrowRight } from 'lucide-react'

export default function ConfirmEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()

  const [verifying, setVerifying] = useState(true)
  const [recipientInfo, setRecipientInfo] = useState<{
    email: string
    first_name?: string
    company_name?: string
  } | null>(null)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [confirmedEmail, setConfirmedEmail] = useState('')

  // Verify token validity on mount
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
            setRecipientInfo({
              email: res.data.email,
              first_name: res.data.first_name,
              company_name: res.data.company_name,
            })
            setConfirmedEmail(res.data.email)
          } else {
            setError(res.data?.error || 'Activation link is invalid or has expired.')
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.response?.data?.error || 'Activation link is invalid or has expired.')
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
      setError('Activation token is missing from the URL.')
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
      const res = await api.post('/tenant/users/confirm_email/', {
        token,
        password,
      })
      if (res.data?.email) {
        setConfirmedEmail(res.data.email)
      }
      setSuccess(true)
      toast.success('Account activated successfully!')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to activate account. The link may have expired or is invalid.')
    } finally {
      setLoading(false)
    }
  }

  if (verifying) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div className="spinner" style={{ margin: '0 auto 16px', width: 28, height: 28 }} />
          <div className="auth-title" style={{ fontSize: 18 }}>Verifying Activation Link…</div>
          <div className="auth-sub">Connecting to CIXCI Platform</div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, margin: '0 auto 20px',
            background: 'rgba(34, 197, 94, 0.12)', border: '1px solid #22c55e',
            borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#22c55e'
          }}>
            <ShieldCheck size={34} />
          </div>
          <div className="auth-title">Account Activated!</div>
          <div className="auth-sub" style={{ marginBottom: 16 }}>
            Your email has been confirmed and your password is set.
          </div>
          {confirmedEmail && (
            <div style={{
              background: 'var(--bg-card-subtle, #1e293b)',
              padding: '10px 14px',
              borderRadius: 8,
              fontSize: 13,
              color: 'var(--text-primary, #f1f5f9)',
              marginBottom: 24,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              border: '1px solid var(--border-color, #334155)'
            }}>
              <CheckCircle2 size={16} color="#22c55e" />
              <span>Ready to log in as <strong>{confirmedEmail}</strong></span>
            </div>
          )}
          <button
            onClick={() => navigate('/login', { state: { prefilledEmail: confirmedEmail } })}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px', gap: 8 }}
          >
            <span>Proceed to Login</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div style={{
            width: 52, height: 52, margin: '0 auto 12px',
            background: 'linear-gradient(135deg, #0a2e66, #2563eb)',
            borderRadius: 14, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#fff',
            boxShadow: '0 4px 12px rgba(10, 46, 102, 0.3)'
          }}>C</div>
          <div className="auth-title">Confirm Your Account</div>
          <div className="auth-sub">
            {recipientInfo?.first_name
              ? `Hi ${recipientInfo.first_name}, please set your password to log in to CIXCI.`
              : recipientInfo?.email
              ? `Set your password for ${recipientInfo.email} to activate your account.`
              : 'Set your secure password to activate your CIXCI account.'}
          </div>
        </div>

        {error && (
          <div className="auth-error" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{error}</span>
          </div>
        )}

        {!token || (!recipientInfo && error) ? (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button
              onClick={() => navigate('/login')}
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
            >
              Return to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {recipientInfo?.email && (
              <div className="form-group">
                <label className="label">Confirmed Email</label>
                <input
                  className="input"
                  type="email"
                  disabled
                  value={recipientInfo.email}
                  style={{ opacity: 0.8, cursor: 'not-allowed', background: 'var(--bg-disabled, #1e293b)' }}
                />
              </div>
            )}

            <div className="form-group">
              <label className="label">Set New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  style={{ paddingLeft: 36 }}
                />
                <Lock size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted, #94a3b8)' }} />
              </div>
            </div>

            <div className="form-group">
              <label className="label">Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  style={{ paddingLeft: 36 }}
                />
                <Lock size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted, #94a3b8)' }} />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: 16, padding: '11px' }}
            >
              {loading ? <><div className="spinner" />Activating account…</> : 'Activate Account & Log In'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
