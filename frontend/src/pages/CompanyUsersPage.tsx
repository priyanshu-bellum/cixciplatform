import React, { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'

import PersonAddIcon from '@mui/icons-material/PersonAdd'
import VpnKeyIcon from '@mui/icons-material/VpnKey'
import ShieldIcon from '@mui/icons-material/Shield'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import CloseIcon from '@mui/icons-material/Close'
import AddIcon from '@mui/icons-material/Add'
import RefreshIcon from '@mui/icons-material/Refresh'
import EmailIcon from '@mui/icons-material/Email'
import DeleteIcon from '@mui/icons-material/Delete'
import SecurityIcon from '@mui/icons-material/Security'

import api from '../lib/apiClient'
import { formatDate } from '../lib/formatters'
import PageHeader from '../components/layout/PageHeader'
import StatusChip from '../components/data-display/StatusChip'
import SearchBar from '../components/forms/SearchBar'
import ConfirmDialog from '../components/feedback/ConfirmDialog'
import { useSnackbar } from '../components/feedback/SnackbarProvider'
import { useConfirmDialog } from '../hooks/useConfirmDialog'

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
  const { showSnackbar } = useSnackbar()
  const { dialogProps, confirm } = useConfirmDialog()

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
      showSnackbar('Failed to load user management records', 'error')
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
      showSnackbar('Please fill in required fields', 'error')
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

      showSnackbar(`Invitation sent to ${inviteEmail}`, 'success')
      setShowInviteModal(false)
      setInviteEmail('')
      setInviteFirstName('')
      setInviteLastName('')
      setInviteJobTitle('')
      fetchData()
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to send invitation'
      showSnackbar(msg, 'error')
    } finally {
      setSubmittingInvite(false)
    }
  }

  const handleResend = async (id: string, email: string) => {
    try {
      await api.post(`/tenant/invitations/${id}/resend/`)
      showSnackbar(`Resent invitation to ${email}`, 'success')
      fetchData()
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to resend invitation'
      showSnackbar(msg, 'error')
    }
  }

  const handleRevoke = async (id: string) => {
    const confirmed = await confirm({
      title: 'Revoke Invitation',
      message: 'Are you sure you want to revoke this invitation? The invitee will no longer be able to accept it.',
      confirmLabel: 'Revoke',
      confirmColor: 'error',
    })
    if (!confirmed) return

    try {
      await api.post(`/tenant/invitations/${id}/revoke/`)
      showSnackbar('Invitation revoked', 'success')
      fetchData()
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to revoke invitation'
      showSnackbar(msg, 'error')
    }
  }

  const handleLifecycleChange = async (id: string, newStatus: string) => {
    const action = newStatus === 'suspended' ? 'suspend' : 'reactivate'
    const confirmed = await confirm({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
      message: `Are you sure you want to ${action} this user?`,
      confirmLabel: action.charAt(0).toUpperCase() + action.slice(1),
      confirmColor: newStatus === 'suspended' ? 'warning' : 'success',
    })
    if (!confirmed) return

    try {
      await api.post(`/tenant/memberships/${id}/lifecycle/`, { status: newStatus })
      showSnackbar(`User status updated to ${newStatus}`, 'success')
      fetchData()
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to update user status'
      showSnackbar(msg, 'error')
    }
  }

  const handleAdminToggle = async (id: string, currentlyAdmin: boolean) => {
    const action = currentlyAdmin ? 'revoke' : 'grant'
    const confirmed = await confirm({
      title: `${currentlyAdmin ? 'Revoke' : 'Grant'} Company Admin`,
      message: currentlyAdmin
        ? 'Are you sure you want to revoke Company Admin authority from this user?'
        : 'Are you sure you want to grant Company Admin authority to this user? They will inherit all company capabilities.',
      confirmLabel: currentlyAdmin ? 'Revoke Admin' : 'Grant Admin',
      confirmColor: currentlyAdmin ? 'error' : 'warning',
    })
    if (!confirmed) return

    const endpoint = currentlyAdmin ? 'revoke-admin' : 'grant-admin'
    try {
      await api.post(`/tenant/memberships/${id}/${endpoint}/`)
      showSnackbar(currentlyAdmin ? 'Revoked Company Admin authority' : 'Granted Company Admin authority', 'success')
      fetchData()
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Operation failed'
      showSnackbar(msg, 'error')
    }
  }

  const handleAssignCapability = async () => {
    if (!selectedMember || !capabilityToAssign) return
    setModifyingCapability(true)
    try {
      const res = await api.post(`/tenant/memberships/${selectedMember.id}/assign-capability/`, {
        capability_code: capabilityToAssign
      })
      showSnackbar(`Assigned capability '${capabilityToAssign}'`, 'success')
      setSelectedMember(res.data)
      setMemberships(prev => prev.map(m => m.id === res.data.id ? res.data : m))
      setCapabilityToAssign('')
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to assign capability'
      showSnackbar(msg, 'error')
    } finally {
      setModifyingCapability(false)
    }
  }

  const handleRemoveCapability = async (capabilityCode: string) => {
    if (!selectedMember) return
    const confirmed = await confirm({
      title: 'Remove Capability',
      message: `Are you sure you want to remove the capability '${capabilityCode}' from this user?`,
      confirmLabel: 'Remove',
      confirmColor: 'error',
    })
    if (!confirmed) return

    setModifyingCapability(true)
    try {
      const res = await api.post(`/tenant/memberships/${selectedMember.id}/remove-capability/`, {
        capability_code: capabilityCode
      })
      showSnackbar(`Removed capability '${capabilityCode}'`, 'success')
      setSelectedMember(res.data)
      setMemberships(prev => prev.map(m => m.id === res.data.id ? res.data : m))
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to remove capability'
      showSnackbar(msg, 'error')
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
    <Box sx={{ p: 3.5, maxWidth: 1280, mx: 'auto' }}>
      {/* Header */}
      <PageHeader
        title="Company User & Capability Management"
        subtitle="Manage team members, grant individual system capabilities (such as return creation and fulfillment workflows), delegate Company Admin authority, and manage invitations."
        actions={
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => setShowInviteModal(true)}
          >
            Invite Team Member
          </Button>
        }
      />

      {/* Controls & Search */}
      <Card
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2.75,
          p: 1.5,
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          sx={{
            minHeight: 'auto',
            '& .MuiTab-root': { minHeight: 40, textTransform: 'none', fontWeight: 600, fontSize: '0.8125rem' },
          }}
        >
          <Tab label={`Active Members (${memberships.length})`} value="members" />
          <Tab label={`Pending Invitations (${invitations.length})`} value="invitations" />
        </Tabs>

        <SearchBar
          placeholder="Search by name, email, company..."
          value={searchTerm}
          onSearch={(val) => setSearchTerm(val)}
          sx={{ minWidth: 280 }}
        />
      </Card>

      {/* Content Table */}
      {loading ? (
        <Card sx={{ p: 7.5, textAlign: 'center' }}>
          <CircularProgress size={24} sx={{ mb: 1.5 }} />
          <Typography variant="body2" color="text.secondary">
            Loading user management records...
          </Typography>
        </Card>
      ) : activeTab === 'members' ? (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Company</TableCell>
                  <TableCell>Role & Authority</TableCell>
                  <TableCell>Assigned Capabilities</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredMemberships.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 5 }}>
                      <Typography variant="body2" color="text.secondary">
                        No membership records found matching your search.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMemberships.map((m) => {
                    const caps = m.assigned_capabilities || []
                    return (
                      <TableRow key={m.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {m.user_first_name} {m.user_last_name}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                            <EmailIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">
                              {m.user_email}
                            </Typography>
                          </Box>
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {m.company_name}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
                            <Chip
                              label={m.role_bundle}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                            {m.is_company_admin && (
                              <Chip
                                icon={<AdminPanelSettingsIcon />}
                                label="Company Admin"
                                size="small"
                                color="warning"
                                variant="filled"
                              />
                            )}
                          </Stack>
                        </TableCell>

                        <TableCell>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<VpnKeyIcon sx={{ fontSize: 16 }} />}
                            onClick={() => setSelectedMember(m)}
                            sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                          >
                            {caps.length} {caps.length === 1 ? 'Capability' : 'Capabilities'}
                          </Button>
                        </TableCell>

                        <TableCell>
                          <StatusChip status={m.status} />
                        </TableCell>

                        <TableCell align="right">
                          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', alignItems: 'center' }}>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => setSelectedMember(m)}
                              sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                            >
                              Capabilities
                            </Button>
                            <Button
                              variant="outlined"
                              size="small"
                              color={m.is_company_admin ? 'error' : 'warning'}
                              onClick={() => handleAdminToggle(m.id, m.is_company_admin)}
                              sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                            >
                              {m.is_company_admin ? 'Revoke Admin' : 'Make Admin'}
                            </Button>
                            {m.status === 'active' ? (
                              <Button
                                variant="outlined"
                                size="small"
                                color="error"
                                onClick={() => handleLifecycleChange(m.id, 'suspended')}
                                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                              >
                                Suspend
                              </Button>
                            ) : (
                              <Button
                                variant="outlined"
                                size="small"
                                color="success"
                                onClick={() => handleLifecycleChange(m.id, 'active')}
                                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                              >
                                Reactivate
                              </Button>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      ) : (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Invitee</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Expires</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredInvitations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ textAlign: 'center', py: 5 }}>
                      <Typography variant="body2" color="text.secondary">
                        No pending invitation records found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvitations.map((inv) => (
                    <TableRow key={inv.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {inv.first_name} {inv.last_name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                          <EmailIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {inv.email}
                          </Typography>
                        </Box>
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={inv.role_bundle}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>

                      <TableCell>
                        <StatusChip status={inv.status} />
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(inv.expires_at)}
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<RefreshIcon sx={{ fontSize: 14 }} />}
                            onClick={() => handleResend(inv.id, inv.email)}
                            sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                          >
                            Resend
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            color="error"
                            startIcon={<DeleteIcon sx={{ fontSize: 14 }} />}
                            onClick={() => handleRevoke(inv.id)}
                            sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                          >
                            Revoke
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Capability Management Dialog */}
      <Dialog
        open={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { maxHeight: '90vh' } } }}
      >
        {selectedMember && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SecurityIcon color="primary" />
                  <Typography variant="h6" component="span" fontWeight={700}>
                    User Capabilities
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Managing individual capabilities for{' '}
                  <strong>{selectedMember.user_first_name} {selectedMember.user_last_name}</strong>{' '}
                  ({selectedMember.user_email}) at <strong>{selectedMember.company_name}</strong>
                </Typography>
              </Box>
              <IconButton onClick={() => setSelectedMember(null)} size="small" sx={{ ml: 1 }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>

            <DialogContent dividers>
              {selectedMember.is_company_admin && (
                <Alert severity="warning" icon={<AdminPanelSettingsIcon />} sx={{ mb: 2.25 }}>
                  This user is a <strong>Company Admin</strong>. They automatically inherit all
                  capabilities assigned to <strong>{selectedMember.company_name}</strong>. Additional
                  individual capabilities can still be explicitly granted below.
                </Alert>
              )}

              {/* Current Capabilities */}
              <Box sx={{ mb: 2.75 }}>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ display: 'block', mb: 1.25, letterSpacing: '0.04em' }}
                >
                  Directly Assigned Capabilities ({(selectedMember.assigned_capabilities || []).length})
                </Typography>

                {(selectedMember.assigned_capabilities || []).length === 0 ? (
                  <Box
                    sx={{
                      border: '1px dashed',
                      borderColor: 'divider',
                      borderRadius: 1.25,
                      p: 2.5,
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="body2" color="text.disabled">
                      No direct individual capabilities assigned yet. This user relies on role/company permissions.
                    </Typography>
                  </Box>
                ) : (
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                    {(selectedMember.assigned_capabilities || []).map((cap) => (
                      <Chip
                        key={cap.id || cap.code}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography
                              variant="caption"
                              sx={{ fontWeight: 600, fontFamily: 'monospace', color: 'primary.light' }}
                            >
                              {cap.code}
                            </Typography>
                            {cap.module && (
                              <Typography variant="caption" color="text.disabled">
                                ({cap.module})
                              </Typography>
                            )}
                          </Box>
                        }
                        onDelete={() => handleRemoveCapability(cap.code)}
                        disabled={modifyingCapability}
                        deleteIcon={
                          <Tooltip title={`Remove ${cap.code}`}>
                            <CloseIcon sx={{ fontSize: 16 }} />
                          </Tooltip>
                        }
                        variant="outlined"
                        color="primary"
                      />
                    ))}
                  </Stack>
                )}
              </Box>

              {/* Assign New Capability */}
              <Card variant="outlined" sx={{ p: 2, mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.25 }}>
                  <AddIcon fontSize="small" color="primary" />
                  <Typography variant="subtitle2">Assign Individual Capability</Typography>
                </Box>

                <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Select a capability to grant</InputLabel>
                    <Select
                      value={capabilityToAssign}
                      onChange={(e) => setCapabilityToAssign(e.target.value)}
                      label="Select a capability to grant"
                    >
                      <MenuItem value="">
                        <em>-- Select a capability to grant --</em>
                      </MenuItem>
                      {availableCapabilities.map((c) => (
                        <MenuItem key={c.id || c.code} value={c.code}>
                          {c.code} {c.description ? `\u2014 ${c.description}` : ''}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Button
                    variant="contained"
                    disabled={!capabilityToAssign || modifyingCapability}
                    onClick={handleAssignCapability}
                    sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    {modifyingCapability ? 'Updating...' : 'Assign'}
                  </Button>
                </Stack>

                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1 }}>
                  Common operational capabilities:{' '}
                  <Typography component="code" variant="caption" color="primary.light">
                    fulfillment.return.create
                  </Typography>
                  ,{' '}
                  <Typography component="code" variant="caption" color="primary.light">
                    fulfillment.handoff.update
                  </Typography>
                </Typography>
              </Card>
            </DialogContent>

            <DialogActions>
              <Button onClick={() => setSelectedMember(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Invite Team Member Dialog */}
      <Dialog
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonAddIcon color="primary" />
            <Typography variant="h6" component="span" fontWeight={600}>
              Invite Team Member
            </Typography>
          </Box>
          <IconButton onClick={() => setShowInviteModal(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <form onSubmit={handleSendInvite}>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField
                label="Email Address"
                type="email"
                required
                fullWidth
                size="small"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
              />

              <Stack direction="row" spacing={1.5}>
                <TextField
                  label="First Name"
                  required
                  fullWidth
                  size="small"
                  value={inviteFirstName}
                  onChange={(e) => setInviteFirstName(e.target.value)}
                />
                <TextField
                  label="Last Name"
                  required
                  fullWidth
                  size="small"
                  value={inviteLastName}
                  onChange={(e) => setInviteLastName(e.target.value)}
                />
              </Stack>

              <FormControl size="small" fullWidth>
                <InputLabel>Role / Bundle</InputLabel>
                <Select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  label="Role / Bundle"
                >
                  <MenuItem value="standard_user">Standard User</MenuItem>
                  <MenuItem value="company_admin">Company Admin</MenuItem>
                  <MenuItem value="procurement_manager">Procurement Manager</MenuItem>
                  <MenuItem value="fulfillment_specialist">Fulfillment Specialist</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Job Title (Optional)"
                fullWidth
                size="small"
                value={inviteJobTitle}
                onChange={(e) => setInviteJobTitle(e.target.value)}
                placeholder="e.g. Operations Specialist"
              />
            </Stack>
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setShowInviteModal(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={submittingInvite}>
              {submittingInvite ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Shared Confirm Dialog */}
      <ConfirmDialog {...dialogProps} />
    </Box>
  )
}
