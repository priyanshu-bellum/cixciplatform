import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '../lib/apiClient'
import {
  Shield,
  Key,
  Plus,
  X,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Users,
  Mail,
  ShieldCheck,
  ShieldAlert,
  Trash2
} from 'lucide-react'

interface CapabilityItem {
  id: string
  code: string
  name?: string
  description?: string
  module?: string
  is_active?: boolean
}

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
  assigned_capabilities?: CapabilityItem[]
  delegated_capabilities?: CapabilityItem[]
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
  const [allCapabilities, setAllCapabilities] = useState<CapabilityItem[]>([])
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

  // Capability management modal state
  const [selectedMember, setSelectedMember] = useState<Membership | null>(null)
  const [capabilityToAssign, setCapabilityToAssign] = useState('')
  const [modifyingCapability, setModifyingCapability] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('action') === 'invite' || params.get('openInvite') === 'true') {
      setShowInviteModal(true)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [activeTab])

  useEffect(() => {
    fetchCapabilities()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'members') {
        const res = await api.get('/tenant/memberships/')
        const data = res.data
        setMemberships(data.results || data)
      } else {
        const res = await api.get('/tenant/invitations/')
        const data = res.data
        setInvitations(data.results || data)
      }
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to load user management records')
    } finally {
      setLoading(false)
    }
  }

  const fetchCapabilities = async () => {
    try {
      const res = await api.get('/tenant/capabilities/')
      const data = res.data
      setAllCapabilities(data.results || data)
    } catch (err) {
      console.error('Failed to fetch capabilities:', err)
    }
  }

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail || !inviteFirstName || !inviteLastName) {
      toast.error('Please fill in required fields')
      return
    }

    setSubmittingInvite(true)
    try {
      await api.post('/tenant/invitations/invite/', {
        email: inviteEmail,
        first_name: inviteFirstName,
        last_name: inviteLastName,
        role_bundle: inviteRole,
        job_title: inviteJobTitle
      })

      toast.success(`Invitation sent to ${inviteEmail}`)
      setShowInviteModal(false)
      setInviteEmail('')
      setInviteFirstName('')
      setInviteLastName('')
      setInviteJobTitle('')
      fetchData()
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to send invitation'
      toast.error(msg)
    } finally {
      setSubmittingInvite(false)
    }
  }

  const handleResend = async (id: string, email: string) => {
    try {
      await api.post(`/tenant/invitations/${id}/resend/`)
      toast.success(`Resent invitation to ${email}`)
      fetchData()
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to resend invitation'
      toast.error(msg)
    }
  }

  const handleRevoke = async (id: string) => {
    try {
      await api.post(`/tenant/invitations/${id}/revoke/`)
      toast.success('Invitation revoked')
      fetchData()
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to revoke invitation'
      toast.error(msg)
    }
  }

  const handleLifecycleChange = async (id: string, newStatus: string) => {
    try {
      await api.post(`/tenant/memberships/${id}/lifecycle/`, { status: newStatus })
      toast.success(`User status updated to ${newStatus}`)
      fetchData()
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to update user status'
      toast.error(msg)
    }
  }

  const handleAdminToggle = async (id: string, currentlyAdmin: boolean) => {
    const endpoint = currentlyAdmin ? 'revoke-admin' : 'grant-admin'
    try {
      await api.post(`/tenant/memberships/${id}/${endpoint}/`)
      toast.success(currentlyAdmin ? 'Revoked Company Admin authority' : 'Granted Company Admin authority')
      fetchData()
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Operation failed'
      toast.error(msg)
    }
  }

  const handleAssignCapability = async () => {
    if (!selectedMember || !capabilityToAssign) return
    setModifyingCapability(true)
    try {
      const res = await api.post(`/tenant/memberships/${selectedMember.id}/assign-capability/`, {
        capability_code: capabilityToAssign
      })
      toast.success(`Assigned capability '${capabilityToAssign}'`)
      setSelectedMember(res.data)
      setMemberships(prev => prev.map(m => m.id === res.data.id ? res.data : m))
      setCapabilityToAssign('')
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to assign capability'
      toast.error(msg)
    } finally {
      setModifyingCapability(false)
    }
  }

  const handleRemoveCapability = async (capabilityCode: string) => {
    if (!selectedMember) return
    setModifyingCapability(true)
    try {
      const res = await api.post(`/tenant/memberships/${selectedMember.id}/remove-capability/`, {
        capability_code: capabilityCode
      })
      toast.success(`Removed capability '${capabilityCode}'`)
      setSelectedMember(res.data)
      setMemberships(prev => prev.map(m => m.id === res.data.id ? res.data : m))
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to remove capability'
      toast.error(msg)
    } finally {
      setModifyingCapability(false)
    }
  }

  const filteredMemberships = memberships.filter(m =>
    m.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.user_first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.user_last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredInvitations = invitations.filter(i =>
    i.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const assignedCodes = new Set((selectedMember?.assigned_capabilities || []).map(c => c.code))
  const availableCapabilities = allCapabilities.filter(c => !assignedCodes.has(c.code))

  return (
    <div style={{ padding: '28px', maxWidth: '1280px', margin: '0 auto', color: '#f8fafc' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', gap: '20px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users style={{ width: '28px', height: '28px', color: '#3b82f6' }} />
            <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
              Company User & Capability Management
            </h1>
          </div>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '6px', maxWidth: '650px', lineHeight: 1.5 }}>
            Manage team members, grant individual system capabilities (such as return creation and fulfillment workflows), delegate Company Admin authority, and manage invitations.
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            padding: '11px 20px',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          <UserPlus style={{ width: '18px', height: '18px' }} />
          <span>Invite Team Member</span>
        </button>
      </div>

      {/* Controls & Search */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '22px',
        background: '#1e293b',
        padding: '12px 18px',
        borderRadius: '12px',
        border: '1px solid #334155',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', background: '#0f172a', padding: '4px', borderRadius: '8px', border: '1px solid #334155' }}>
          <button
            onClick={() => setActiveTab('members')}
            style={{
              background: activeTab === 'members' ? '#3b82f6' : 'transparent',
              color: activeTab === 'members' ? '#fff' : '#94a3b8',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 18px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              transition: 'all 0.15s ease'
            }}
          >
            Active Members ({memberships.length})
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            style={{
              background: activeTab === 'invitations' ? '#3b82f6' : 'transparent',
              color: activeTab === 'invitations' ? '#fff' : '#94a3b8',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 18px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              transition: 'all 0.15s ease'
            }}
          >
            Pending Invitations ({invitations.length})
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search style={{ position: 'absolute', left: '12px', top: '10px', width: '16px', height: '16px', color: '#64748b' }} />
          <input
            type="text"
            placeholder="Search by name, email, company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              background: '#0f172a',
              color: '#f8fafc',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '9px 12px 9px 36px',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Content Table */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155' }}>
          <RefreshCw style={{ width: '24px', height: '24px', animation: 'spin 1s linear infinite', margin: '0 auto 12px', display: 'block', color: '#3b82f6' }} />
          Loading user management records...
        </div>
      ) : activeTab === 'members' ? (
        <div style={{ background: '#1e293b', borderRadius: '14px', border: '1px solid #334155', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '16px 20px' }}>User</th>
                <th style={{ padding: '16px 20px' }}>Company</th>
                <th style={{ padding: '16px 20px' }}>Role & Authority</th>
                <th style={{ padding: '16px 20px' }}>Assigned Capabilities</th>
                <th style={{ padding: '16px 20px' }}>Status</th>
                <th style={{ padding: '16px 20px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMemberships.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    No membership records found matching your search.
                  </td>
                </tr>
              ) : (
                filteredMemberships.map((m) => {
                  const caps = m.assigned_capabilities || []
                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid #334155', transition: 'background 0.15s ease' }}>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '14px' }}>
                          {m.user_first_name} {m.user_last_name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Mail style={{ width: '12px', height: '12px' }} />
                          {m.user_email}
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', color: '#f8fafc', fontSize: '13px', fontWeight: 500 }}>
                        {m.company_name}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', background: '#3b82f620', color: '#60a5fa', padding: '3px 8px', borderRadius: '4px', border: '1px solid #3b82f640', fontWeight: 500 }}>
                            {m.role_bundle}
                          </span>
                          {m.is_company_admin && (
                            <span style={{ fontSize: '11px', background: '#f59e0b20', color: '#fbbf24', padding: '3px 8px', borderRadius: '4px', fontWeight: 600, border: '1px solid #f59e0b40', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <ShieldCheck style={{ width: '12px', height: '12px' }} />
                              Company Admin
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={() => setSelectedMember(m)}
                            style={{
                              background: '#0f172a',
                              border: '1px solid #3b82f660',
                              color: '#60a5fa',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontWeight: 500,
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <Key style={{ width: '13px', height: '13px', color: '#38bdf8' }} />
                            <span>{caps.length} {caps.length === 1 ? 'Capability' : 'Capabilities'}</span>
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          fontSize: '12px',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontWeight: 600,
                          textTransform: 'capitalize',
                          background: m.status === 'active' ? '#10b98120' : m.status === 'suspended' ? '#f59e0b20' : '#ef444420',
                          color: m.status === 'active' ? '#34d399' : m.status === 'suspended' ? '#fbbf24' : '#f87171',
                          border: `1px solid ${m.status === 'active' ? '#10b98140' : m.status === 'suspended' ? '#f59e0b40' : '#ef444440'}`
                        }}>
                          {m.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button
                            onClick={() => setSelectedMember(m)}
                            style={{
                              background: '#1e3a8a30',
                              border: '1px solid #3b82f650',
                              color: '#93c5fd',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              fontWeight: 500
                            }}
                          >
                            Capabilities
                          </button>
                          <button
                            onClick={() => handleAdminToggle(m.id, m.is_company_admin)}
                            style={{
                              background: 'transparent',
                              border: '1px solid #334155',
                              color: m.is_company_admin ? '#f87171' : '#fbbf24',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            {m.is_company_admin ? 'Revoke Admin' : 'Make Admin'}
                          </button>
                          {m.status === 'active' ? (
                            <button
                              onClick={() => handleLifecycleChange(m.id, 'suspended')}
                              style={{ background: 'transparent', border: '1px solid #334155', color: '#f87171', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => handleLifecycleChange(m.id, 'active')}
                              style={{ background: 'transparent', border: '1px solid #334155', color: '#34d399', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                            >
                              Reactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ background: '#1e293b', borderRadius: '14px', border: '1px solid #334155', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '16px 20px' }}>Invitee</th>
                <th style={{ padding: '16px 20px' }}>Role</th>
                <th style={{ padding: '16px 20px' }}>Status</th>
                <th style={{ padding: '16px 20px' }}>Expires</th>
                <th style={{ padding: '16px 20px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvitations.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    No pending invitation records found.
                  </td>
                </tr>
              ) : (
                filteredInvitations.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '14px' }}>{inv.first_name} {inv.last_name}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Mail style={{ width: '12px', height: '12px' }} />
                        {inv.email}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', color: '#f8fafc', fontSize: '13px' }}>
                      <span style={{ fontSize: '12px', background: '#3b82f620', color: '#60a5fa', padding: '3px 8px', borderRadius: '4px', border: '1px solid #3b82f640' }}>
                        {inv.role_bundle}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ fontSize: '12px', background: '#3b82f620', color: '#60a5fa', padding: '4px 10px', borderRadius: '12px', fontWeight: 600, textTransform: 'capitalize', border: '1px solid #3b82f640' }}>
                        {inv.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '13px', color: '#94a3b8' }}>
                      {new Date(inv.expires_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleResend(inv.id, inv.email)}
                          style={{ background: 'transparent', border: '1px solid #334155', color: '#60a5fa', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <RefreshCw style={{ width: '12px', height: '12px' }} />
                          Resend
                        </button>
                        <button
                          onClick={() => handleRevoke(inv.id)}
                          style={{ background: 'transparent', border: '1px solid #334155', color: '#f87171', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Trash2 style={{ width: '12px', height: '12px' }} />
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

      {/* Capability Management Modal */}
      {selectedMember && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '20px' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', width: '100%', maxWidth: '640px', padding: '26px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield style={{ width: '22px', height: '22px', color: '#38bdf8' }} />
                  <h2 style={{ fontSize: '19px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    User Capabilities
                  </h2>
                </div>
                <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
                  Managing individual capabilities for <strong style={{ color: '#f8fafc' }}>{selectedMember.user_first_name} {selectedMember.user_last_name}</strong> ({selectedMember.user_email}) at <strong>{selectedMember.company_name}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedMember(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            {selectedMember.is_company_admin && (
              <div style={{ background: '#f59e0b15', border: '1px solid #f59e0b35', borderRadius: '8px', padding: '12px 14px', marginBottom: '18px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <ShieldCheck style={{ width: '18px', height: '18px', color: '#fbbf24', flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '12px', color: '#fde68a', lineHeight: 1.5 }}>
                  This user is a <strong>Company Admin</strong>. They automatically inherit all capabilities assigned to <strong>{selectedMember.company_name}</strong>. Additional individual capabilities can still be explicitly granted below.
                </div>
              </div>
            )}

            {/* Current Capabilities */}
            <div style={{ marginBottom: '22px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Directly Assigned Capabilities ({(selectedMember.assigned_capabilities || []).length})
              </div>
              {(selectedMember.assigned_capabilities || []).length === 0 ? (
                <div style={{ background: '#0f172a', border: '1px dashed #334155', borderRadius: '10px', padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                  No direct individual capabilities assigned yet. This user relies on role/company permissions.
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {(selectedMember.assigned_capabilities || []).map((cap) => (
                    <div
                      key={cap.id || cap.code}
                      style={{
                        background: '#0f172a',
                        border: '1px solid #38bdf840',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px'
                      }}
                    >
                      <span style={{ color: '#38bdf8', fontWeight: 600, fontFamily: 'monospace' }}>{cap.code}</span>
                      {cap.module && (
                        <span style={{ fontSize: '11px', color: '#64748b' }}>({cap.module})</span>
                      )}
                      <button
                        type="button"
                        disabled={modifyingCapability}
                        onClick={() => handleRemoveCapability(cap.code)}
                        title={`Remove ${cap.code}`}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#f87171',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <X style={{ width: '14px', height: '14px' }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assign New Capability */}
            <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus style={{ width: '16px', height: '16px', color: '#3b82f6' }} />
                Assign Individual Capability
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <select
                  value={capabilityToAssign}
                  onChange={(e) => setCapabilityToAssign(e.target.value)}
                  style={{
                    flex: 1,
                    background: '#1e293b',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                >
                  <option value="">-- Select a capability to grant --</option>
                  {availableCapabilities.map((c) => (
                    <option key={c.id || c.code} value={c.code}>
                      {c.code} {c.description ? `— ${c.description}` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!capabilityToAssign || modifyingCapability}
                  onClick={handleAssignCapability}
                  style={{
                    background: capabilityToAssign ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : '#334155',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 18px',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: capabilityToAssign && !modifyingCapability ? 'pointer' : 'not-allowed',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {modifyingCapability ? 'Updating...' : 'Assign'}
                </button>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                Common operational capabilities: <code style={{ color: '#38bdf8' }}>fulfillment.return.create</code>, <code style={{ color: '#38bdf8' }}>fulfillment.handoff.update</code>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                style={{
                  background: '#334155',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '9px 18px',
                  fontWeight: 500,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '20px' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', width: '100%', maxWidth: '500px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus style={{ width: '20px', height: '20px', color: '#3b82f6' }} />
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
                  Invite Team Member
                </h2>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            <form onSubmit={handleSendInvite}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Email Address *</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>First Name *</label>
                  <input
                    type="text"
                    required
                    value={inviteFirstName}
                    onChange={(e) => setInviteFirstName(e.target.value)}
                    style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '14px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Last Name *</label>
                  <input
                    type="text"
                    required
                    value={inviteLastName}
                    onChange={(e) => setInviteLastName(e.target.value)}
                    style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '14px', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Role / Bundle</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '14px', outline: 'none' }}
                >
                  <option value="standard_user">Standard User</option>
                  <option value="company_admin">Company Admin</option>
                  <option value="procurement_manager">Procurement Manager</option>
                  <option value="fulfillment_specialist">Fulfillment Specialist</option>
                </select>
              </div>

              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Job Title (Optional)</label>
                <input
                  type="text"
                  value={inviteJobTitle}
                  onChange={(e) => setInviteJobTitle(e.target.value)}
                  placeholder="e.g. Operations Specialist"
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  style={{ background: 'transparent', border: '1px solid #334155', color: '#94a3b8', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingInvite}
                  style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
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
