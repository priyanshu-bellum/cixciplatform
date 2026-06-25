import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../lib/apiClient'
import toast from 'react-hot-toast'
import { ShieldCheck, AlertCircle } from 'lucide-react'

export default function ConfirmEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!token) {
      setError('Activation token is missing from the URL.')
      return
    }

    if (password.length < 10) {
      setError('Password must be at least 10 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await api.post('/tenant/users/confirm_email/', {
        token,
        password,
      })
      setSuccess(true)
      toast.success('Account activated successfully!')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to activate account. The link may have expired or is invalid.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{
            width: 60, height: 60, margin: '0 auto 20px',
            background: 'var(--green-dim)', border: '1px solid var(--green)',
            borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: 'var(--green)'
          }}>
            <ShieldCheck size={32} />
          </div>
          <div className="auth-title">Account Activated!</div>
          <div className="auth-sub" style={{ marginBottom: 24 }}>
            Your email has been confirmed and password is set. You can now login to your CIXCI dashboard.
          </div>
          <button
            onClick={() => navigate('/login')}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
          >
            Go to Login
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
            background: 'linear-gradient(135deg, var(--accent), var(--purple))',
            borderRadius: 14, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#fff',
          }}>C</div>
          <div className="auth-title">Confirm Account</div>
          <div className="auth-sub">Set your secure password to activate your CIXCI account</div>
        </div>

        {error && (
          <div className="auth-error" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {!token ? (
          <div className="auth-error" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
            <AlertCircle size={16} />
            <span>Activation token is invalid or missing. Please request a new invite.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="label">New Password</label>
              <input
                className="input"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimum 10 characters"
              />
            </div>
            <div className="form-group">
              <label className="label">Confirm Password</label>
              <input
                className="input"
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: 12, padding: '10px' }}
            >
              {loading ? <><div className="spinner" />Activating account…</> : 'Activate Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
