import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

interface Membership {
  id: string
  user: string
  user_email: string
  user_first_name: string
  user_last_name: string
  company_name: string
  role_bundle: string
  is_company_admin: boolean
  status: 'active' | 'suspended' | 'deactivated'
  created_at: string
}

interface Invitation {
  id: string
  email: string
  first_name: string
  last_name: string
  role_bundle: string
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  expires_at: string
  created_at: string
}

export default function CompanyUsersPage() {
  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>('members')
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteFirstName, setInviteFirstName] = useState('')
  const [inviteLastName, setInviteLastName] = useState('')
  const [inviteRole, setInviteRole] = useState('standard_user')
  const [inviteJobTitle, setInviteJobTitle] = useState('')
  const [submittingInvite, setSubmittingInvite] = useState(false)

  useEffect(() => {
    fetchData()
  }, [activeTab])

  const fetchData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'members') {
        const res = await fetch('/api/v1/tenant/memberships/')
        if (res.ok) {
          const data = await res.json()
          setMemberships(data.results || data)
        }
      } else {
        const res = await fetch('/api/v1/tenant/invitations/')
        if (res.ok) {
          const data = await res.json()
          setInvitations(data.results || data)
        }
      }
    } catch (err) {
      loggerError(err)
    } finally {
      setLoading(false)
    }
  }

  const loggerError = (err: any) => {
    console.error(err)
  }

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail || !inviteFirstName || !inviteLastName) {
      toast.error('Please fill in required fields')
      return
    }

    setSubmittingInvite(true)
    try {
      const res = await fetch('/api/v1/tenant/invitations/invite/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          first_name: inviteFirstName,
          last_name: inviteLastName,
          role_bundle: inviteRole,
          job_title: inviteJobTitle
        })
      })

      if (res.ok) {
        toast.success(`Invitation sent to ${inviteEmail}`)
        setShowInviteModal(false)
        setInviteEmail('')
        setInviteFirstName('')
        setInviteLastName('')
        setInviteJobTitle('')
        fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to send invitation')
      }
    } catch (err) {
      toast.error('Network error sending invitation')
    } finally {
      setSubmittingInvite(false)
    }
  }

  const handleResend = async (id: string, email: string) => {
    try {
      const res = await fetch(`/api/v1/tenant/invitations/${id}/resend/`, { method: 'POST' })
      if (res.ok) {
        toast.success(`Resent invitation to ${email}`)
        fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to resend invitation')
      }
    } catch (err) {
      toast.error('Network error resending invitation')
    }
  }

  const handleRevoke = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/tenant/invitations/${id}/revoke/`, { method: 'POST' })
      if (res.ok) {
        toast.success('Invitation revoked')
        fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to revoke invitation')
      }
    } catch (err) {
      toast.error('Network error revoking invitation')
    }
  }

  const handleLifecycleChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/v1/tenant/memberships/${id}/lifecycle/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (res.ok) {
        toast.success(`User status updated to ${newStatus}`)
        fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to update user status')
      }
    } catch (err) {
      toast.error('Network error updating status')
    }
  }

  const handleAdminToggle = async (id: string, currentlyAdmin: boolean) => {
    const endpoint = currentlyAdmin ? 'revoke-admin' : 'grant-admin'
    try {
      const res = await fetch(`/api/v1/tenant/memberships/${id}/${endpoint}/`, { method: 'POST' })
      if (res.ok) {
        toast.success(currentlyAdmin ? 'Revoked Company Admin authority' : 'Granted Company Admin authority')
        fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Operation failed')
      }
    } catch (err) {
      toast.error('Network error')
    }
  }

  const filteredMemberships = memberships.filter(m =>
    m.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.user_first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.user_last_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredInvitations = invitations.filter(i =>
    i.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.last_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary, #fff)', margin: 0 }}>
            Company User Management
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary, #94a3b8)', marginTop: '4px' }}>
            Manage team membership, capability assignments, Company Admin authority, and invitations.
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 18px',
            fontWeight: 500,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>+</span> Invite User
        </button>
      </div>

      {/* Controls & Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: 'var(--bg-surface, #1e293b)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border, #334155)' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('members')}
            style={{
              background: activeTab === 'members' ? 'var(--bg-accent, #3b82f6)' : 'transparent',
              color: activeTab === 'members' ? '#fff' : 'var(--text-secondary, #94a3b8)',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Active Members ({memberships.length})
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            style={{
              background: activeTab === 'invitations' ? 'var(--bg-accent, #3b82f6)' : 'transparent',
              color: activeTab === 'invitations' ? '#fff' : 'var(--text-secondary, #94a3b8)',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Pending Invitations ({invitations.length})
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            background: 'var(--bg-elevated, #0f172a)',
            color: 'var(--text-primary, #fff)',
            border: '1px solid var(--border, #334155)',
            borderRadius: '6px',
            padding: '8px 14px',
            width: '260px'
          }}
        />
      </div>

      {/* Content Table */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary, #94a3b8)' }}>
          Loading user management records...
        </div>
      ) : activeTab === 'members' ? (
        <div style={{ background: 'var(--bg-surface, #1e293b)', borderRadius: '12px', border: '1px solid var(--border, #334155)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated, #0f172a)', borderBottom: '1px solid var(--border, #334155)', color: 'var(--text-secondary, #94a3b8)', fontSize: '12px', textTransform: 'uppercase' }}>
                <th style={{ padding: '14px 20px' }}>User</th>
                <th style={{ padding: '14px 20px' }}>Company</th>
                <th style={{ padding: '14px 20px' }}>Role / Admin</th>
                <th style={{ padding: '14px 20px' }}>Status</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMemberships.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary, #94a3b8)' }}>
                    No membership records found.
                  </td>
                </tr>
              ) : (
                filteredMemberships.map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--border, #334155)' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary, #fff)' }}>{m.user_first_name} {m.user_last_name}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary, #94a3b8)' }}>{m.user_email}</div>
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-primary, #fff)' }}>
                      {m.company_name}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ fontSize: '13px', background: '#3b82f620', color: '#60a5fa', padding: '4px 8px', borderRadius: '4px', marginRight: '6px' }}>
                        {m.role_bundle}
                      </span>
                      {m.is_company_admin && (
                        <span style={{ fontSize: '12px', background: '#f59e0b20', color: '#fbbf24', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          Company Admin
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        fontSize: '12px',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        background: m.status === 'active' ? '#10b98120' : m.status === 'suspended' ? '#f59e0b20' : '#ef444420',
                        color: m.status === 'active' ? '#34d399' : m.status === 'suspended' ? '#fbbf24' : '#f87171'
                      }}>
                        {m.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleAdminToggle(m.id, m.is_company_admin)}
                          style={{ background: 'transparent', border: '1px solid var(--border, #334155)', color: '#fbbf24', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                        >
                          {m.is_company_admin ? 'Revoke Admin' : 'Make Admin'}
                        </button>
                        {m.status === 'active' ? (
                          <button
                            onClick={() => handleLifecycleChange(m.id, 'suspended')}
                            style={{ background: 'transparent', border: '1px solid var(--border, #334155)', color: '#f87171', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() => handleLifecycleChange(m.id, 'active')}
                            style={{ background: 'transparent', border: '1px solid var(--border, #334155)', color: '#34d399', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-surface, #1e293b)', borderRadius: '12px', border: '1px solid var(--border, #334155)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated, #0f172a)', borderBottom: '1px solid var(--border, #334155)', color: 'var(--text-secondary, #94a3b8)', fontSize: '12px', textTransform: 'uppercase' }}>
                <th style={{ padding: '14px 20px' }}>Invitee</th>
                <th style={{ padding: '14px 20px' }}>Role</th>
                <th style={{ padding: '14px 20px' }}>Status</th>
                <th style={{ padding: '14px 20px' }}>Expires</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvitations.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary, #94a3b8)' }}>
                    No pending invitation records found.
                  </td>
                </tr>
              ) : (
                filteredInvitations.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid var(--border, #334155)' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary, #fff)' }}>{inv.first_name} {inv.last_name}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary, #94a3b8)' }}>{inv.email}</div>
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-primary, #fff)' }}>
                      {inv.role_bundle}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ fontSize: '12px', background: '#3b82f620', color: '#60a5fa', padding: '4px 10px', borderRadius: '12px', fontWeight: 600, textTransform: 'capitalize' }}>
                        {inv.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '13px', color: 'var(--text-secondary, #94a3b8)' }}>
                      {new Date(inv.expires_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleResend(inv.id, inv.email)}
                          style={{ background: 'transparent', border: '1px solid var(--border, #334155)', color: '#60a5fa', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                        >
                          Resend
                        </button>
                        <button
                          onClick={() => handleRevoke(inv.id)}
                          style={{ background: 'transparent', border: '1px solid var(--border, #334155)', color: '#f87171', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                        >
                          Revoke
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-surface, #1e293b)', border: '1px solid var(--border, #334155)', borderRadius: '16px', width: '480px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary, #fff)', marginTop: 0, marginBottom: '16px' }}>
              Invite Team Member
            </h2>
            <form onSubmit={handleSendInvite}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary, #94a3b8)', marginBottom: '6px' }}>Email Address *</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  style={{ width: '100%', background: 'var(--bg-elevated, #0f172a)', border: '1px solid var(--border, #334155)', borderRadius: '6px', padding: '10px', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary, #94a3b8)', marginBottom: '6px' }}>First Name *</label>
                  <input
                    type="text"
                    required
                    value={inviteFirstName}
                    onChange={(e) => setInviteFirstName(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-elevated, #0f172a)', border: '1px solid var(--border, #334155)', borderRadius: '6px', padding: '10px', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary, #94a3b8)', marginBottom: '6px' }}>Last Name *</label>
                  <input
                    type="text"
                    required
                    value={inviteLastName}
                    onChange={(e) => setInviteLastName(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-elevated, #0f172a)', border: '1px solid var(--border, #334155)', borderRadius: '6px', padding: '10px', color: '#fff' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary, #94a3b8)', marginBottom: '6px' }}>Role / Bundle</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-elevated, #0f172a)', border: '1px solid var(--border, #334155)', borderRadius: '6px', padding: '10px', color: '#fff' }}
                >
                  <option value="standard_user">Standard User</option>
                  <option value="company_admin">Company Admin</option>
                  <option value="procurement_manager">Procurement Manager</option>
                  <option value="fulfillment_specialist">Fulfillment Specialist</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary, #94a3b8)', marginBottom: '6px' }}>Job Title (Optional)</label>
                <input
                  type="text"
                  value={inviteJobTitle}
                  onChange={(e) => setInviteJobTitle(e.target.value)}
                  placeholder="e.g. Operations Manager"
                  style={{ width: '100%', background: 'var(--bg-elevated, #0f172a)', border: '1px solid var(--border, #334155)', borderRadius: '6px', padding: '10px', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  style={{ background: 'transparent', border: '1px solid var(--border, #334155)', color: 'var(--text-secondary, #94a3b8)', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingInvite}
                  style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 500, cursor: 'pointer' }}
                >
                  {submittingInvite ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
