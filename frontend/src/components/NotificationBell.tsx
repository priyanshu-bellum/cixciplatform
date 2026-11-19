import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Popover from '@mui/material/Popover'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import api from '../lib/apiClient'
import { useAuthStore } from '../stores/authStore'
import { useNotificationSocket } from '../hooks/useNotificationSocket'

interface InAppNotification {
  id: string
  title: string
  body: string
  event_type: string
  classification: string
  source_module: string
  link: string
  is_read: boolean
  created_at: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function classificationIcon(classification: string) {
  switch (classification) {
    case 'critical': return <ErrorOutlinedIcon fontSize="small" color="error" />
    case 'warning': return <WarningAmberIcon fontSize="small" color="warning" />
    default: return <InfoOutlinedIcon fontSize="small" color="info" />
  }
}

export default function NotificationBell() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const open = Boolean(anchorEl)

  const isCixciAdmin = user?.is_cixci_admin || user?.company_type === 'cixci_internal'

  useNotificationSocket()

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => api.get('/notifications/in-app/unread-count/').then(r => r.data),
    refetchInterval: 60000,
    enabled: !!user,
  })
  const unreadCount: number = unreadData?.unread_count ?? 0

  const { data: importAlertsData } = useQuery({
    queryKey: ['import-alerts-count'],
    queryFn: () => api.get('/catalog/import-alerts/').then(r => r.data),
    refetchInterval: 120000,
    enabled: !!user && !!isCixciAdmin,
  })
  const importAlertCount: number = (importAlertsData?.alerts ?? []).length

  const totalBadge = unreadCount + importAlertCount

  const { data: recentData, isLoading: recentLoading } = useQuery({
    queryKey: ['notifications-recent'],
    queryFn: () => api.get('/notifications/in-app/?ordering=-created_at&page_size=10').then(r => r.data),
    enabled: open && !!user,
    refetchInterval: open ? 15000 : false,
  })
  const recentNotifications: InAppNotification[] = recentData?.results ?? recentData ?? []

  const markRead = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/in-app/${id}/mark-read/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-recent'] })
    },
  })

  const markAllRead = useMutation({
    mutationFn: () => api.post('/notifications/in-app/mark-all-read/'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-recent'] })
    },
  })

  const handleNotificationClick = (n: InAppNotification) => {
    if (!n.is_read) markRead.mutate(n.id)
    if (n.link) {
      setAnchorEl(null)
      navigate(n.link)
    }
  }

  const importAlerts: any[] = importAlertsData?.alerts ?? []

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton size="small" onClick={e => setAnchorEl(e.currentTarget)}>
          <Badge badgeContent={totalBadge} color="error" max={99}
            sx={{ '& .MuiBadge-badge': { fontSize: '0.65rem', minWidth: 16, height: 16 } }}>
            <NotificationsOutlinedIcon fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: { width: 380, maxHeight: 520, display: 'flex', flexDirection: 'column' },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Notifications</Typography>
          {unreadCount > 0 && (
            <Button
              size="small"
              startIcon={<DoneAllIcon />}
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              Mark all read
            </Button>
          )}
        </Box>
        <Divider />

        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {isCixciAdmin && importAlerts.length > 0 && (
            <>
              <Box sx={{ px: 2, py: 1, bgcolor: 'warning.main', color: 'warning.contrastText' }}>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  Import Alerts ({importAlerts.length})
                </Typography>
              </Box>
              <List dense disablePadding>
                {importAlerts.slice(0, 3).map((alert: any) => (
                  <ListItemButton
                    key={alert.id}
                    onClick={() => { setAnchorEl(null); navigate('/catalog') }}
                    sx={{ py: 1, px: 2 }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <WarningAmberIcon fontSize="small" color="warning" />
                          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                            {alert.event_type === 'catalog.missing_device_reference'
                              ? 'Missing Devices'
                              : alert.event_type === 'catalog.unresolved_category'
                                ? 'Unmapped Categories'
                                : 'Unmapped Colors'}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {alert.message}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                ))}
                {importAlerts.length > 3 && (
                  <Box sx={{ px: 2, py: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      +{importAlerts.length - 3} more alerts
                    </Typography>
                  </Box>
                )}
              </List>
              <Divider />
            </>
          )}

          {recentLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={24} />
            </Box>
          )}

          {!recentLoading && recentNotifications.length === 0 && importAlerts.length === 0 && (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <NotificationsOutlinedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">No notifications yet</Typography>
            </Box>
          )}

          {!recentLoading && recentNotifications.length > 0 && (
            <List dense disablePadding>
              {recentNotifications.map(n => (
                <ListItemButton
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  sx={{
                    py: 1, px: 2,
                    bgcolor: n.is_read ? 'transparent' : 'action.hover',
                    borderLeft: n.is_read ? 'none' : '3px solid',
                    borderLeftColor: n.is_read ? 'transparent' : 'primary.main',
                  }}
                >
                  <Box sx={{ mr: 1, mt: 0.5 }}>{classificationIcon(n.classification)}</Box>
                  <ListItemText
                    primary={
                      <Typography variant="body2" sx={{ fontWeight: n.is_read ? 400 : 600 }} noWrap>
                        {n.title}
                      </Typography>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {n.body}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, alignItems: 'center' }}>
                          <Chip label={n.source_module || 'system'} size="small" variant="outlined"
                            sx={{ height: 18, fontSize: '0.65rem' }} />
                          <Typography variant="caption" color="text.disabled">
                            {timeAgo(n.created_at)}
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </Box>

        <Divider />
        <Box sx={{ p: 1, textAlign: 'center' }}>
          <Button
            size="small"
            onClick={() => { setAnchorEl(null); navigate('/notifications') }}
          >
            View All Notifications
          </Button>
        </Box>
      </Popover>
    </>
  )
}
