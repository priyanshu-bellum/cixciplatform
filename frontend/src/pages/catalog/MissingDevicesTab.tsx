import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import AddIcon from '@mui/icons-material/Add'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CloseIcon from '@mui/icons-material/Close'
import SmartphoneIcon from '@mui/icons-material/Smartphone'
import TabletIcon from '@mui/icons-material/Tablet'
import WatchIcon from '@mui/icons-material/Watch'
import api from '../../lib/apiClient'

interface MissingDevice {
  vendor_device_name: string
  alert_count: number
  suggested_manufacturer: { id: string; name: string } | null
  suggested_device_type: string
  already_exists: boolean
}

interface Manufacturer {
  id: string
  name: string
}

interface DeviceTypeOption {
  id: string
  code: string
  name: string
}

export default function MissingDevicesTab() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<MissingDevice | null>(null)
  const [deviceName, setDeviceName] = useState('')
  const [manufacturerId, setManufacturerId] = useState('')
  const [deviceTypeCode, setDeviceTypeCode] = useState('phone')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set())

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['missing-devices'],
    queryFn: () => api.get('/catalog/missing-devices/').then(r => r.data),
    refetchInterval: 120000,
  })

  const devices: MissingDevice[] = data?.devices ?? []
  const manufacturers: Manufacturer[] = data?.manufacturers ?? []
  const deviceTypes: DeviceTypeOption[] = data?.device_types ?? []

  const filtered = devices.filter(d => {
    if (recentlyAdded.has(d.vendor_device_name)) return false
    if (!search) return true
    return d.vendor_device_name.toLowerCase().includes(search.toLowerCase())
  })

  const openAddDialog = (device: MissingDevice) => {
    setSelectedDevice(device)
    setDeviceName(cleanDeviceName(device.vendor_device_name))
    setManufacturerId(device.suggested_manufacturer?.id ?? '')
    setDeviceTypeCode(device.suggested_device_type || 'phone')
    setError('')
    setNotice('')
    setAddDialogOpen(true)
  }

  const handleAdd = async () => {
    if (!selectedDevice || !manufacturerId || !deviceName.trim()) {
      setError('Manufacturer and device name are required.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = await api.post('/catalog/missing-devices/add_device/', {
        vendor_device_name: selectedDevice.vendor_device_name,
        manufacturer_id: manufacturerId,
        device_name: deviceName.trim(),
        device_type_code: deviceTypeCode,
      })
      const d = res.data
      setRecentlyAdded(prev => new Set(prev).add(selectedDevice.vendor_device_name))
      setNotice(`${d.device_name} ${d.created ? 'created' : 'found'} — ${d.products_matched} products matched.`)
      setAddDialogOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['import-alerts'] })
      void queryClient.invalidateQueries({ queryKey: ['import-alerts-count'] })
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to add device.')
    } finally {
      setBusy(false)
    }
  }

  const handleDismiss = async (vendorName: string) => {
    try {
      await api.post('/catalog/missing-devices/dismiss_device/', {
        vendor_device_name: vendorName,
      })
      setRecentlyAdded(prev => new Set(prev).add(vendorName))
    } catch { /* ignore */ }
  }

  const deviceTypeIcon = (code: string) => {
    if (code === 'tablet') return <TabletIcon fontSize="small" />
    if (code === 'smartwatch') return <WatchIcon fontSize="small" />
    return <SmartphoneIcon fontSize="small" />
  }

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
  }

  return (
    <Box>
      {notice && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>
          {notice}
        </Alert>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h6">Missing Devices</Typography>
          <Typography variant="body2" color="text.secondary">
            Vendor device names not found in CIXCI Device Catalog. Add them so cases and screen protectors get matched.
          </Typography>
        </Box>
        <Chip
          label={`${filtered.length} unresolved`}
          color={filtered.length > 0 ? 'error' : 'success'}
          variant="outlined"
        />
      </Box>

      <TextField
        size="small"
        placeholder="Search device names..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ mb: 2, width: 320 }}
      />

      {filtered.length === 0 ? (
        <Alert severity="success" icon={<CheckCircleIcon />}>
          <AlertTitle>All Clear</AlertTitle>
          All vendor device references are matched to the CIXCI Device Catalog.
        </Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Vendor Device Name</TableCell>
                <TableCell align="center">Alerts</TableCell>
                <TableCell>Suggested Manufacturer</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(d => (
                <TableRow key={d.vendor_device_name} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {d.vendor_device_name}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={d.alert_count} size="small" color="warning" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    {d.suggested_manufacturer ? (
                      <Chip label={d.suggested_manufacturer.name} size="small" variant="outlined" />
                    ) : (
                      <Typography variant="caption" color="text.secondary">Unknown</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Tooltip title={d.suggested_device_type}>
                      {deviceTypeIcon(d.suggested_device_type)}
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => openAddDialog(d)}
                      sx={{ mr: 1 }}
                    >
                      Add
                    </Button>
                    <Tooltip title="Dismiss (not a real device)">
                      <IconButton size="small" onClick={() => handleDismiss(d.vendor_device_name)}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Add Device to Catalog
          {selectedDevice && (
            <Typography variant="body2" color="text.secondary">
              Vendor reference: {selectedDevice.vendor_device_name}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              select
              label="Manufacturer"
              value={manufacturerId}
              onChange={e => setManufacturerId(e.target.value)}
              required
              fullWidth
            >
              {manufacturers.map(m => (
                <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Device Name"
              value={deviceName}
              onChange={e => setDeviceName(e.target.value)}
              required
              fullWidth
              helperText="e.g. Galaxy A57 5G, iPhone 15 Pro Max"
            />
            <TextField
              select
              label="Device Type"
              value={deviceTypeCode}
              onChange={e => setDeviceTypeCode(e.target.value)}
              fullWidth
            >
              {deviceTypes.map(dt => (
                <MenuItem key={dt.code} value={dt.code}>{dt.name}</MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAdd}
            disabled={busy || !manufacturerId || !deviceName.trim()}
            startIcon={busy ? <CircularProgress size={16} /> : <AddIcon />}
          >
            {busy ? 'Adding...' : 'Add to Device Catalog'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

function cleanDeviceName(vendorName: string): string {
  let name = vendorName.trim()
  const prefixes = ['Apple ', 'Samsung ', 'Google ', 'Motorola ', 'LG ', 'OnePlus ', 'Nokia ', 'TCL ', 'Kyocera ', 'ZTE ']
  for (const prefix of prefixes) {
    if (name.toLowerCase().startsWith(prefix.toLowerCase())) {
      name = name.slice(prefix.length).trim()
      break
    }
  }
  return name
}
