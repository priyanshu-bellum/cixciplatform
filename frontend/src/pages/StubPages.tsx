import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import api from '../lib/apiClient'
import AddressAutocomplete from '../components/AddressAutocomplete'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Alert from '@mui/material/Alert'
import Paper from '@mui/material/Paper'
import Divider from '@mui/material/Divider'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Stack from '@mui/material/Stack'
import CircularProgress from '@mui/material/CircularProgress'
import BusinessIcon from '@mui/icons-material/Business'
import ApartmentIcon from '@mui/icons-material/Apartment'
import PeopleIcon from '@mui/icons-material/People'
import AddIcon from '@mui/icons-material/Add'
import SecurityIcon from '@mui/icons-material/Security'
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import DeleteIcon from '@mui/icons-material/Delete'
import CloseIcon from '@mui/icons-material/Close'
import { useSnackbar } from '../components/feedback/SnackbarProvider'
import PageHeader from '../components/layout/PageHeader'
import StatusChip from '../components/data-display/StatusChip'
import { US_STATES } from '../lib/constants'
import { formatDate } from '../lib/formatters'

// Status Badge Colors
const STATUS_COLOR: Record<string, 'success' | 'default' | 'error' | 'warning' | 'info'> = {
  active: 'success', draft: 'default', suspended: 'error',
}

const TYPE_COLOR: Record<string, 'secondary' | 'info' | 'warning' | 'default'> = {
  cixci_internal: 'secondary', buyer: 'info', vendor: 'warning', manufacturer: 'default',
}

const CAPABILITY_INFO: Record<string, { name: string; desc: string }> = {
  // Devices
  'devices.device.list': { name: 'View Device List', desc: 'Allows listing and searching all cell phone and device models.' },
  'devices.device.read': { name: 'View Device Details', desc: 'Allows viewing specifications, pricing tiers, and details of individual devices.' },
  'devices.device.import': { name: 'Import Devices', desc: 'Allows bulk-importing new devices or specifications from sheets/feeds.' },
  'devices.device.manage': { name: 'Manage Devices', desc: 'Allows adding, editing, updating specifications, and deleting devices.' },
  'devices.type.list': { name: 'View Device Types', desc: 'Allows viewing categories or types of devices (e.g. smartphone, tablet).' },
  'devices.type.read': { name: 'View Device Type Details', desc: 'Allows viewing details of specific device categories.' },
  'devices.type.manage': { name: 'Manage Device Types', desc: 'Allows creating, editing, and deleting device categories.' },
  'devices.manufacturer.list': { name: 'View Manufacturers', desc: 'Allows viewing list of hardware manufacturers (e.g. Apple, Samsung).' },
  'devices.manufacturer.read': { name: 'View Manufacturer Details', desc: 'Allows viewing details about individual manufacturers.' },
  'devices.manufacturer.manage': { name: 'Manage Manufacturers', desc: 'Allows adding, updating, and removing manufacturers.' },
  'devices.feature.list': { name: 'View Device Features', desc: 'Allows viewing list of phone features (e.g. 5G, OLED screen).' },
  'devices.feature.read': { name: 'View Feature Details', desc: 'Allows viewing individual feature properties.' },
  'devices.feature.manage': { name: 'Manage Device Features', desc: 'Allows creating, editing, and deleting specs/features.' },
  'devices.dqe.list': { name: 'View Device Quality Evaluation (DQE) Tasks', desc: 'Allows listing and monitoring device validation queues.' },
  'devices.dqe.read': { name: 'View DQE Task Details', desc: 'Allows viewing verification tests and logs for a device.' },
  'devices.dqe.create': { name: 'Submit DQE Task', desc: 'Allows requesting a quality check for new hardware devices.' },
  'devices.dqe.resolve': { name: 'Resolve DQE Task', desc: 'Allows approving, rejecting, or resolving device quality issues.' },
  'devices.portfolio.self_modify': { name: 'Update Self Portfolio', desc: 'Allows the user to adjust their own device portfolio access settings.' },

  // Catalog
  'catalog.product.list': { name: 'View Product List', desc: 'Allows listing accessories and general products in the catalog.' },
  'catalog.product.read': { name: 'View Product Details', desc: 'Allows viewing retail price, vendor details, and SKU details.' },
  'catalog.product.create': { name: 'Create Product', desc: 'Allows listing new accessories or products.' },
  'catalog.product.update': { name: 'Update Product', desc: 'Allows modifying existing product descriptions, prices, and specs.' },
  'catalog.product.delete': { name: 'Delete Product', desc: 'Allows removing products from the active catalog.' },
  'catalog.product.manage_selling': { name: 'Manage Selling Status', desc: 'Allows toggling products online/offline or editing channels.' },

  // Tenant / Company
  'tenant.company.list': { name: 'List Companies', desc: 'Allows listing all system companies, buyers, and vendors.' },
  'tenant.company.read': { name: 'View Company Details', desc: 'Allows viewing company registration, status, and contacts.' },
  'tenant.company.create': { name: 'Onboard Companies', desc: 'Allows registering/onboarding new business profiles.' },
  'tenant.company.update': { name: 'Edit Company Profiles', desc: 'Allows modifying business settings, logo, addresses, and status.' },
  'tenant.entity.list': { name: 'List Billing Entities', desc: 'Allows viewing legal entities or billing units.' },
  'tenant.entity.read': { name: 'View Billing Entity Details', desc: 'Allows viewing legal entity parameters.' },
  'tenant.entity.create': { name: 'Create Billing Entity', desc: 'Allows creating new legal entity definitions.' },
  'tenant.entity.update': { name: 'Update Billing Entity', desc: 'Allows editing legal entity parameters.' },
  'tenant.entity.delete': { name: 'Delete Billing Entity', desc: 'Allows deleting legal entity definitions.' },
  'tenant.user.list': { name: 'List Users', desc: 'Allows listing company users and staff.' },
  'tenant.user.read': { name: 'View User Details', desc: 'Allows viewing user emails, roles, and status.' },
  'tenant.user.create': { name: 'Invite Users', desc: 'Allows inviting/onboarding new staff users.' },
  'tenant.user.update': { name: 'Edit User Roles', desc: 'Allows editing user accounts and capabilities.' },
  'tenant.user.delete': { name: 'Delete Users', desc: 'Allows removing users from the company.' },
  'tenant.relationship.list': { name: 'List Vendor-Buyer Relations', desc: 'Allows viewing relationships and contracts between companies.' },
  'tenant.relationship.read': { name: 'View Relation Details', desc: 'Allows viewing relationship contract parameters.' },
  'tenant.relationship.create': { name: 'Request Relationship', desc: 'Allows proposing a new buyer-vendor link.' },
  'tenant.relationship.update': { name: 'Update Relationship', desc: 'Allows editing relationship agreements or terms.' },
  'tenant.relationship.approve': { name: 'Approve Relationship Request', desc: 'Allows administrative approval of vendor links.' },

  // Media
  'media.asset.list': { name: 'List Media Files', desc: 'Allows listing uploaded files and images.' },
  'media.asset.read': { name: 'View Media File', desc: 'Allows viewing/downloading media files and logos.' },
  'media.asset.upload': { name: 'Upload Media Files', desc: 'Allows uploading new brand logos or product photos.' },
  'media.asset.manage': { name: 'Delete/Edit Media Files', desc: 'Allows renaming or deleting media assets.' },

  // Analytics
  'analytics.metrics.list': { name: 'List Performance Metrics', desc: 'Allows listing metric categories.' },
  'analytics.metrics.read': { name: 'View Analytics Metrics', desc: 'Allows reading performance, sales, and order data.' },
  'analytics.summary.read': { name: 'View Summary Reports', desc: 'Allows viewing executive dashboards and summary charts.' },

  // Integration
  'integration.connection.list': { name: 'List ERP Connections', desc: 'Allows listing API links to ERP/wholesaler channels.' },
  'integration.connection.read': { name: 'View Connection Details', desc: 'Allows viewing status of integrations.' },
  'integration.connection.manage': { name: 'Configure Integrations', desc: 'Allows setting up webhook URLs and sync paths.' },
  'integration.action.list': { name: 'List Integration Actions', desc: 'Allows listing action logs of synchronization tasks.' },
  'integration.action.read': { name: 'View Integration Logs', desc: 'Allows reading synchronization payloads.' },

  // Procurement (PO)
  'procurement.po.list': { name: 'List Purchase Orders', desc: 'Allows viewing buy-flows and bulk purchase order records.' },
  'procurement.po.read': { name: 'View Purchase Order Details', desc: 'Allows reading order lists, status, and shipping logs.' },
  'procurement.po.create': { name: 'Create Purchase Order', desc: 'Allows creating new bulk POs.' },
  'procurement.po.update': { name: 'Modify Purchase Order', desc: 'Allows editing PO quantities or items before dispatch.' },
  'procurement.po.approve': { name: 'Approve Purchase Order', desc: 'Allows approving bulk purchase requests.' },
  'procurement.po.manage': { name: 'Procurement Settings Manager', desc: 'Full configuration of wholesale catalog buy-flows.' },

  // Launch Events
  'launch.event.list': { name: 'List Event Runs', desc: 'Allows listing batch execution logs or event launches.' },
  'launch.event.read': { name: 'View Event Details', desc: 'Allows reading execution results.' },
  'launch.event.create': { name: 'Trigger Event Run', desc: 'Allows triggering sync runs or automation flows manually.' },
  'launch.event.update': { name: 'Modify Event Options', desc: 'Allows editing scheduled event configs.' },
  'launch.event.manage': { name: 'Launch Settings Manager', desc: 'Allows scheduling launch cycles or managing automated actions.' },

  // Fulfillment & Returns
  'fulfillment.handoff.list': { name: 'List Fulfillment Handoffs', desc: 'Allows viewing the list of vendor fulfillment handoff records.' },
  'fulfillment.handoff.read': { name: 'View Fulfillment Handoff Details', desc: 'Allows reading individual fulfillment handoff status and shipping info.' },
  'fulfillment.handoff.create': { name: 'Create Fulfillment Handoff', desc: 'Allows creating new fulfillment handoff records.' },
  'fulfillment.handoff.update': { name: 'Update Fulfillment Handoff', desc: 'Allows updating shipping status, tracking numbers, and carrier info.' },
  'fulfillment.handoff.manage': { name: 'Manage Fulfillment Handoffs', desc: 'Allows full administration of fulfillment handoff records.' },
  'fulfillment.return.list': { name: 'List Return Requests', desc: 'Allows viewing all return requests across orders.' },
  'fulfillment.return.read': { name: 'View Return Request Details', desc: 'Allows reading individual return request records and status.' },
  'fulfillment.return.create': { name: 'Create Return Request', desc: 'Allows submitting new return requests for fulfilled orders.' },
  'fulfillment.return.update': { name: 'Update Return Request', desc: 'Allows updating return outcomes, received dates, and refund amounts.' },
  'fulfillment.return.manage': { name: 'Manage Return Requests', desc: 'Allows full administration of return requests including deletion.' },
  'fulfillment.sla.read': { name: 'View SLA Evaluations', desc: 'Allows reading vendor SLA evaluation records and outcomes.' },
}

const getCapabilityInfo = (code: string) => {
  if (CAPABILITY_INFO[code]) return CAPABILITY_INFO[code]
  const parts = code.split('.')
  const moduleName = parts[0] ? parts[0].toUpperCase() : ''
  const entityName = parts[1] ? parts[1].replace(/_/g, ' ') : ''
  const actionName = parts[2] ? parts[2].replace(/_/g, ' ') : ''
  const prettyName = [actionName, entityName].filter(Boolean).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ') || code
  return {
    name: `${prettyName} (${moduleName})`,
    desc: `Access to ${actionName || 'manage'} ${entityName || 'system records'} inside the ${moduleName} module.`,
  }
}

const isCapabilityAllowedForCompany = (code: string, companyType: string, buyerType?: string): boolean => {
  const normType = (companyType || '').toLowerCase();
  if (normType === 'cixci_internal') return true;

  if (normType === 'vendor') {
    const allowedPrefixes = [
      'catalog.product.',
      'media.asset.',
      'analytics.metrics.',
      'analytics.summary.',
      'tenant.relationship.read',
      'tenant.relationship.list',
      'devices.device.list',
      'devices.device.read',
      'devices.type.list',
      'devices.type.read',
      'devices.manufacturer.list',
      'devices.manufacturer.read',
      'fulfillment.return.',
      'fulfillment.handoff.',
      'routing.order.',
      'routing.export.',
    ];
    return allowedPrefixes.some(pref => code.startsWith(pref));
  }

  if (normType === 'buyer') {
    const buyerSafeCaps = new Set([
      'devices.portfolio.self_modify',
      'devices.device.list',
      'devices.device.read',
      'devices.type.list',
      'devices.type.read',
      'devices.manufacturer.list',
      'devices.manufacturer.read',
      'devices.feature.list',
      'devices.feature.read',
      'catalog.product.list',
      'catalog.product.read',
      'tenant.company.read',
      'tenant.entity.list',
      'tenant.entity.read',
      'tenant.user.list',
      'tenant.user.read',
      'tenant.relationship.list',
      'tenant.relationship.read',
      'tenant.relationship.create',
      'integration.connection.list',
      'integration.connection.read',
      'integration.connection.manage',
      'procurement.po.create',
      'procurement.po.list',
      'procurement.po.read',
      'procurement.po.update',
      'fulfillment.return.list',
      'fulfillment.return.read',
      'fulfillment.return.create',
      'fulfillment.handoff.list',
      'fulfillment.handoff.read',
      'company_user_management.read_users',
      'company_user_management.manage_invitations',
      'company_user_management.manage_user_access',
      'company_user_management.manage_user_lifecycle',
      'company_user_management.grant_company_admin',
    ]);
    if (buyerSafeCaps.has(code)) return true;

    if (buyerType === 'mvno' || buyerType === 'wireless_carrier') {
      const dqeCaps = new Set([
        'devices.dqe.create',
        'devices.dqe.read',
        'devices.dqe.list',
      ]);
      if (dqeCaps.has(code)) return true;
    }

    return false;
  }

  return true;
};


// AM/PM Time Picker — converts between 24hr storage and 12hr display
function AmPmTimePicker({ value, onChange, allowEmpty }: { value: string; onChange: (v: string) => void; allowEmpty?: boolean }) {
  const parseTime = (v: string) => {
    if (!v || v === '--:--') return { hour: '', minute: '00', ampm: 'AM' }
    const [h, m] = v.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    return { hour: String(hour12), minute: String(m).padStart(2, '0'), ampm }
  }
  const { hour, minute, ampm } = parseTime(value)

  const emit = (h: string, m: string, ap: string) => {
    if (!h && allowEmpty) { onChange(''); return }
    const hNum = parseInt(h || '12')
    let h24 = hNum
    if (ap === 'AM' && hNum === 12) h24 = 0
    else if (ap === 'PM' && hNum !== 12) h24 = hNum + 12
    onChange(`${String(h24).padStart(2, '0')}:${m || '00'}`)
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
    fontSize: 13, padding: '6px 4px', textAlign: 'center', outline: 'none', width: '100%'
  }

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <select style={{ ...inputStyle, flex: 1 }} value={hour} onChange={e => emit(e.target.value, minute, ampm)}>
        {allowEmpty && <option value="">--</option>}
        {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
          <option key={h} value={String(h)}>{String(h).padStart(2, '0')}</option>
        ))}
      </select>
      <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>:</span>
      <select style={{ ...inputStyle, flex: 1 }} value={minute} onChange={e => emit(hour, e.target.value, ampm)}>
        {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
      <select style={{ ...inputStyle, flex: 'none', width: 54 }} value={ampm} onChange={e => emit(hour, minute, e.target.value)}>
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  )
}

export function SettingsPage() {
  const { user } = useAuthStore()
  const { showSnackbar } = useSnackbar()
  const isAdmin = user?.is_cixci_admin ?? false

  const [activeTab, setActiveTab] = useState<'profile' | 'companies' | 'entities' | 'users' | 'onboarding'>(
    isAdmin ? 'companies' : 'profile'
  )

  // Modals / Dialog state
  const [showCompanyModal, setShowCompanyModal] = useState(false)
  const [showEntityModal, setShowEntityModal] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)

  // Form Fields
  const [companyName, setCompanyName] = useState('')
  const [companyDisplayName, setCompanyDisplayName] = useState('')
  const [companyType, setCompanyType] = useState('')
  const [companyStatus, setCompanyStatus] = useState('draft')
  const [companyCountry, setCompanyCountry] = useState('USA')
  const [companyParentId, setCompanyParentId] = useState('')
  const [companyExternalId, setCompanyExternalId] = useState('')
  const [companyRegion, setCompanyRegion] = useState('')
  const [companyAllowedChannels, setCompanyAllowedChannels] = useState<string[]>([
    'online_dtc', 'buyer_storefront'
  ])
  const [companyWebsite, setCompanyWebsite] = useState('')
  const [companyEmailDomain, setCompanyEmailDomain] = useState('')
  const [companyContactName, setCompanyContactName] = useState('')
  const [companyContactEmail, setCompanyContactEmail] = useState('')
  const [companyPhone, setCompanyPhone] = useState('')
  const [companyAddress1, setCompanyAddress1] = useState('')
  const [companyAddress2, setCompanyAddress2] = useState('')
  const [companyCity, setCompanyCity] = useState('')
  const [companyZip, setCompanyZip] = useState('')
  const [companyIsParent, setCompanyIsParent] = useState(false)
  const [allowPersonalEmailException, setAllowPersonalEmailException] = useState(false)
  const [companyBuyerType, setCompanyBuyerType] = useState('')
  const [companyVendorType, setCompanyVendorType] = useState('')
  const [companyIntegrationMode, setCompanyIntegrationMode] = useState('')
  const [companyDailyEmailTime, setCompanyDailyEmailTime] = useState('08:00')
  const [companyDailyEmailTime2, setCompanyDailyEmailTime2] = useState('')
  const [companyLogoFile, setCompanyLogoFile] = useState<File | null>(null)
  const [companyLogoPreview, setCompanyLogoPreview] = useState('')
  const [companyBuyerPricingMode, setCompanyBuyerPricingMode] = useState('standard')
  const [companyCommissionPercentage, setCompanyCommissionPercentage] = useState('14.00')
  const [companyReturnAddress1, setCompanyReturnAddress1] = useState('')
  const [companyReturnAddress2, setCompanyReturnAddress2] = useState('')
  const [companyReturnCity, setCompanyReturnCity] = useState('')
  const [companyReturnZip, setCompanyReturnZip] = useState('')
  const [companyReturnRegion, setCompanyReturnRegion] = useState('')
  const [companyReturnCountry, setCompanyReturnCountry] = useState('')
  const [companySameAsCompanyAddress, setCompanySameAsCompanyAddress] = useState(false)
  const [companyMapPricingEnforced, setCompanyMapPricingEnforced] = useState(false)
  const [companyOrderDigestEmails, setCompanyOrderDigestEmails] = useState<string[]>([])
  const [companyNewDigestEmail, setCompanyNewDigestEmail] = useState('')

  const handleAddCompanyDigestEmail = () => {
    const email = companyNewDigestEmail.trim()
    if (email && !companyOrderDigestEmails.includes(email)) {
      setCompanyOrderDigestEmails([...companyOrderDigestEmails, email])
      setCompanyNewDigestEmail('')
    }
  }

  const handleRemoveCompanyDigestEmail = (email: string) => {
    setCompanyOrderDigestEmails(companyOrderDigestEmails.filter(e => e !== email))
  }

  const [entityName, setEntityName] = useState('')
  const [entityCompanyId, setEntityCompanyId] = useState('')
  const [entityStatus, setEntityStatus] = useState('')
  const [entityCountry, setEntityCountry] = useState('USA')
  const [entityRegion, setEntityRegion] = useState('')
  const [entityChannelsOverride, setEntityChannelsOverride] = useState<string[]>([])

  const [userEmail, setUserEmail] = useState('')
  const [userFirstName, setUserFirstName] = useState('')
  const [userLastName, setUserLastName] = useState('')
  const [userEntityId, setUserEntityId] = useState('')
  const [userPassword, setUserPassword] = useState('')
  const [userIsActive, setUserIsActive] = useState(true)

  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Unsaved-changes tracking
  const [showConfirmCloseCreate, setShowConfirmCloseCreate] = useState(false)
  const [showConfirmCloseManage, setShowConfirmCloseManage] = useState(false)
  const [isManageFormDirty, setIsManageFormDirty] = useState(false)

  const isCreateFormDirty = () => {
    return (
      companyName !== '' ||
      companyDisplayName !== '' ||
      companyType !== '' ||
      companyStatus !== 'draft' ||
      companyCountry !== 'USA' ||
      companyParentId !== '' ||
      companyExternalId !== '' ||
      companyRegion !== '' ||
      companyWebsite !== '' ||
      companyEmailDomain !== '' ||
      companyContactName !== '' ||
      companyContactEmail !== '' ||
      companyPhone !== '' ||
      companyAddress1 !== '' ||
      companyAddress2 !== '' ||
      companyCity !== '' ||
      companyZip !== '' ||
      companyIsParent ||
      allowPersonalEmailException ||
      companyBuyerType !== '' ||
      companyVendorType !== '' ||
      companyIntegrationMode !== '' ||
      companyDailyEmailTime !== '08:00' ||
      companyDailyEmailTime2 !== '' ||
      companyLogoFile !== null ||
      companyBuyerPricingMode !== 'standard' ||
      companyCommissionPercentage !== '14.00' ||
      companyReturnAddress1 !== '' ||
      companyReturnAddress2 !== '' ||
      companyReturnCity !== '' ||
      companyReturnZip !== '' ||
      companyReturnRegion !== '' ||
      companyReturnCountry !== '' ||
      companyMapPricingEnforced !== false ||
      companyOrderDigestEmails.length > 0
    )
  }

  // Company Details/Governance Modal State
  const [selectedCompany, setSelectedCompany] = useState<any | null>(null)
  const [showCompanyDetailsModal, setShowCompanyDetailsModal] = useState(false)
  const [editCompanyName, setEditCompanyName] = useState('')
  const [editCompanyDisplayName, setEditCompanyDisplayName] = useState('')
  const [editCompanyStatus, setEditCompanyStatus] = useState('')
  const [editCompanyWebsite, setEditCompanyWebsite] = useState('')
  const [editCompanyEmailDomain, setEditCompanyEmailDomain] = useState('')
  const [editCompanyContactName, setEditCompanyContactName] = useState('')
  const [editCompanyContactEmail, setEditCompanyContactEmail] = useState('')
  const [editCompanyPhone, setEditCompanyPhone] = useState('')
  const [editCompanyAddress1, setEditCompanyAddress1] = useState('')
  const [editCompanyAddress2, setEditCompanyAddress2] = useState('')
  const [editCompanyCity, setEditCompanyCity] = useState('')
  const [editCompanyZip, setEditCompanyZip] = useState('')
  const [editCompanyIsParent, setEditCompanyIsParent] = useState(false)
  const [editCompanyParentId, setEditCompanyParentId] = useState('')
  const [editCompanyCountry, setEditCompanyCountry] = useState('USA')
  const [editCompanyRegion, setEditCompanyRegion] = useState('')
  const [editCompanyAllowedChannels, setEditCompanyAllowedChannels] = useState<string[]>([])
  const [editCompanyAllowPersonalEmailException, setEditCompanyAllowPersonalEmailException] = useState(false)
  const [selectedCapabilityCode, setSelectedCapabilityCode] = useState('')
  const [editMapPricingEnforced, setEditMapPricingEnforced] = useState(false)
  // Extended manage fields (mirrors onboarding)
  const [editBuyerType, setEditBuyerType] = useState('')
  const [editVendorType, setEditVendorType] = useState('')
  const [editIntegrationMode, setEditIntegrationMode] = useState('')
  const [editDailyEmailTime, setEditDailyEmailTime] = useState('08:00')
  const [editDailyEmailTime2, setEditDailyEmailTime2] = useState('')
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null)
  const [editLogoPreview, setEditLogoPreview] = useState('')
  const [editBuyerPricingMode, setEditBuyerPricingMode] = useState('standard')
  const [editCommissionPercentage, setEditCommissionPercentage] = useState('14.00')
  const [editReturnAddress1, setEditReturnAddress1] = useState('')
  const [editReturnAddress2, setEditReturnAddress2] = useState('')
  const [editReturnCity, setEditReturnCity] = useState('')
  const [editReturnZip, setEditReturnZip] = useState('')
  const [editReturnRegion, setEditReturnRegion] = useState('')
  const [editReturnCountry, setEditReturnCountry] = useState('')
  const [editSameAsCompanyAddress, setEditSameAsCompanyAddress] = useState(false)
  const [editOrderDigestEmails, setEditOrderDigestEmails] = useState<string[]>([])
  const [editNewDigestEmail, setEditNewDigestEmail] = useState('')

  const handleAddEditDigestEmail = () => {
    const email = editNewDigestEmail.trim()
    if (email && !editOrderDigestEmails.includes(email)) {
      setEditOrderDigestEmails([...editOrderDigestEmails, email])
      setEditNewDigestEmail('')
      setIsManageFormDirty(true)
    }
  }

  const handleRemoveEditDigestEmail = (email: string) => {
    setEditOrderDigestEmails(editOrderDigestEmails.filter(e => e !== email))
    setIsManageFormDirty(true)
  }

  const isEditFormDirty = () => {
    return isManageFormDirty
  }

  // Child Onboarding state
  const [showOnboardingModal, setShowOnboardingModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [selectedOnboardingReqId, setSelectedOnboardingReqId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  // Child Onboarding Form Fields
  const [onboardCompanyName, setOnboardCompanyName] = useState('')
  const [onboardBrandName, setOnboardBrandName] = useState('')
  const [onboardWebsite, setOnboardWebsite] = useState('')
  const [onboardRegion, setOnboardRegion] = useState('')
  const [onboardContact, setOnboardContact] = useState('')
  const [onboardDomain, setOnboardDomain] = useState('')
  const [onboardAllowPersonalEmailException, setOnboardAllowPersonalEmailException] = useState(false)
  const [onboardCommissionPercentage, setOnboardCommissionPercentage] = useState('14.00')

  // Queries
  const { data: companiesData, refetch: refetchCompanies } = useQuery({
    queryKey: ['admin-companies'],
    queryFn: () => api.get('/tenant/companies/').then(r => r.data),
    enabled: isAdmin && (activeTab === 'companies' || activeTab === 'onboarding' || showOnboardingModal || showCompanyDetailsModal),
  })

  const { data: entitiesData, refetch: refetchEntities } = useQuery({
    queryKey: ['admin-entities'],
    queryFn: () => api.get('/tenant/entities/').then(r => r.data),
    enabled: isAdmin && (activeTab === 'entities' || activeTab === 'users' || showEntityModal || showUserModal),
  })

  const { data: usersData, refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/tenant/users/').then(r => r.data),
    enabled: isAdmin && activeTab === 'users',
  })

  const { data: allCapabilitiesData } = useQuery({
    queryKey: ['admin-capabilities'],
    queryFn: () => api.get('/tenant/capabilities/').then(r => r.data),
    enabled: isAdmin || showCompanyDetailsModal,
  })

  const hasChildOnboardingCapability = user?.is_cixci_admin || (user?.capabilities && Array.isArray(user.capabilities) && user.capabilities.some((c: any) => c.code?.startsWith('tenant.child_onboarding')))

  const { data: onboardingRequestsData, refetch: refetchOnboardingRequests } = useQuery({
    queryKey: ['onboarding-requests'],
    queryFn: () => api.get('/tenant/child-onboarding-requests/').then(r => r.data),
    enabled: !!hasChildOnboardingCapability && (activeTab === 'onboarding' || showOnboardingModal),
  })

  const companiesList = Array.isArray(companiesData) ? companiesData : (companiesData?.results ?? [])
  const entitiesList = Array.isArray(entitiesData) ? entitiesData : (entitiesData?.results ?? [])
  const usersList = Array.isArray(usersData) ? usersData : (usersData?.results ?? [])
  const allCapabilitiesList = Array.isArray(allCapabilitiesData) ? allCapabilitiesData : (allCapabilitiesData?.results ?? [])
  const onboardingRequestsList = Array.isArray(onboardingRequestsData) ? onboardingRequestsData : (onboardingRequestsData?.results ?? [])



  const getErrorMessage = (err: any): string => {
    if (!err.response?.data) return 'Failed to create company profile.'
    const data = err.response.data
    // If there is an object with validation errors in 'detail'
    if (data.detail && typeof data.detail === 'object') {
      return Object.entries(data.detail)
        .map(([field, msgs]) => {
          const msgStr = Array.isArray(msgs) ? msgs.join(', ') : String(msgs)
          return `${field}: ${msgStr}`
        })
        .join(' | ')
    }
    // If it's a direct dictionary of field errors (e.g. {name: [...], website: [...]})
    if (typeof data === 'object' && !data.detail && !data.error) {
      return Object.entries(data)
        .map(([field, msgs]) => {
          const msgStr = Array.isArray(msgs) ? msgs.join(', ') : String(msgs)
          return `${field}: ${msgStr}`
        })
        .join(' | ')
    }
    if (data.detail && typeof data.detail === 'string') {
      return data.detail
    }
    if (typeof data === 'string') return data
    return JSON.stringify(data)
  }

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    if (!companyType) {
      setErrorMsg('Please select a company type.')
      return
    }
    if (!companyStatus) {
      setErrorMsg('Please select a company status.')
      return
    }
    // Duplicate check is real-time (inline under the name field) — no need to re-check here
    try {
      const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

      // Upload logo if provided
      let logoAssetId: string | null = null
      if (companyLogoFile) {
        try {
          const reqRes = await api.post('/media/assets/request_upload/', {
            filename: companyLogoFile.name,
            mime_type: companyLogoFile.type,
            asset_type: 'brand_logo',
            owner_module: 'tenant',
          })
          logoAssetId = reqRes.data.id
          const fd = new FormData()
          fd.append('file', companyLogoFile)
          await api.post(`/media/assets/${logoAssetId}/upload_file/`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        } catch (_) {}
      }

      await api.post('/tenant/companies/', {
        name: companyName,
        display_name: companyDisplayName || companyName,
        company_type: companyType,
        status: companyStatus,
        slug: slug,
        country_code: companyCountry,
        region_code: companyRegion,
        parent_company: companyParentId || null,
        external_id: JSON.stringify({
          buyer_type: companyBuyerType || null,
          vendor_type: companyVendorType || null,
          integration_mode: companyIntegrationMode || null,
          daily_email_time: companyIntegrationMode === 'manual' ? companyDailyEmailTime : null,
          daily_email_time_2: (companyIntegrationMode === 'manual' && companyDailyEmailTime2) ? companyDailyEmailTime2 : null,
          logo_asset_id: logoAssetId,
          city: companyCity || null,
          zip: companyZip || null,
          erp_id: companyExternalId || null,
        }),
        allowed_channels: companyAllowedChannels,
        website: companyWebsite || '',
        business_email_domain: companyEmailDomain || '',
        primary_contact_name: companyContactName || '',
        primary_contact_email: companyContactEmail || '',
        phone_number: companyPhone || '',
        address_line1: companyAddress1 || '',
        address_line2: companyAddress2 || '',
        is_parent: companyIsParent,
        buyer_pricing_mode: companyBuyerPricingMode,
        commission_percentage: companyBuyerPricingMode === 'custom' ? parseFloat(companyCommissionPercentage) : (companyBuyerPricingMode === 'no_commission' ? 0.00 : 14.00),
        return_address: companyType === 'vendor' ? JSON.stringify({
          address_line1: companyReturnAddress1 || '',
          address_line2: companyReturnAddress2 || '',
          city: companyReturnCity || '',
          region_code: companyReturnRegion || '',
          zip: companyReturnZip || '',
          country_code: companyReturnCountry || '',
        }) : '',
        map_pricing_enforced: companyType === 'vendor' ? companyMapPricingEnforced : false,
        order_digest_emails: companyType === 'vendor' && companyIntegrationMode === 'manual' ? companyOrderDigestEmails : [],
      })
      setShowCompanyModal(false)
      setCompanyName('')
      setCompanyDisplayName('')
      setCompanyType('')
      setCompanyStatus('draft')
      setCompanyExternalId('')
      setCompanyRegion('')
      setCompanyParentId('')
      setCompanyWebsite('')
      setCompanyEmailDomain('')
      setCompanyContactName('')
      setCompanyContactEmail('')
      setCompanyPhone('')
      setCompanyAddress1('')
      setCompanyAddress2('')
      setCompanyCity('')
      setCompanyZip('')
      setCompanyIsParent(false)
      setCompanyBuyerType('')
      setCompanyVendorType('')
      setCompanyIntegrationMode('')
      setCompanyDailyEmailTime('08:00')
      setCompanyReturnAddress1('')
      setCompanyReturnAddress2('')
      setCompanyReturnCity('')
      setCompanyReturnZip('')
      setCompanyReturnRegion('')
      setCompanyReturnCountry('')
      setCompanySameAsCompanyAddress(false)
      setCompanyMapPricingEnforced(false)
      setCompanyOrderDigestEmails([])
      setCompanyNewDigestEmail('')
      setCompanyDailyEmailTime2('')
      setCompanyLogoFile(null)
      setCompanyLogoPreview('')
      setCompanyBuyerPricingMode('standard')
      setCompanyCommissionPercentage('14.00')
      refetchCompanies()
    } catch (err: any) {
      setErrorMsg(getErrorMessage(err))
    }
  }

  const handleCreateEntity = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    if (!entityCompanyId) {
      setErrorMsg('Please select a parent company.')
      return
    }
    if (!entityStatus) {
      setErrorMsg('Please select a status.')
      return
    }
    try {
      await api.post('/tenant/entities/', {
        name: entityName,
        company: entityCompanyId,
        status: entityStatus,
        country_code: entityCountry,
        region_code: entityRegion,
        allowed_channels_override: entityChannelsOverride.length > 0 ? entityChannelsOverride : null,
      })
      setShowEntityModal(false)
      setEntityName('')
      setEntityCompanyId('')
      setEntityStatus('')
      setEntityCountry('USA')
      setEntityRegion('')
      setEntityChannelsOverride([])
      refetchEntities()
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to create entity profile.')
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    if (!userEntityId) {
      setErrorMsg('Please select a company entity scope.')
      return
    }
    try {
      await api.post('/tenant/users/', {
        email: userEmail,
        first_name: userFirstName,
        last_name: userLastName,
        entity: userEntityId,
        password: userPassword || undefined,
        is_active: userIsActive,
      })
      setShowUserModal(false)
      setUserEmail('')
      setUserFirstName('')
      setUserLastName('')
      setUserEntityId('')
      setUserPassword('')
      setUserIsActive(true)
      refetchUsers()
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to onboard organization admin.')
    }
  }

  const handleCreateOnboardingRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    try {
      await api.post('/tenant/child-onboarding-requests/', {
        company_name: onboardCompanyName,
        brand_name: onboardBrandName,
        website: onboardWebsite,
        region: onboardRegion,
        primary_contact: onboardContact,
        business_email_domain: onboardDomain,
        allow_personal_email_exception: onboardAllowPersonalEmailException,
        commission_percentage: parseFloat(onboardCommissionPercentage) || 14.00,
      })
      setShowOnboardingModal(false)
      setOnboardCompanyName('')
      setOnboardBrandName('')
      setOnboardWebsite('')
      setOnboardRegion('')
      setOnboardContact('')
      setOnboardDomain('')
      setOnboardAllowPersonalEmailException(false)
      setOnboardCommissionPercentage('14.00')
      refetchOnboardingRequests()
    } catch (err: any) {
      setErrorMsg(getErrorMessage(err))
    }
  }

  const handleApproveOnboardingRequest = async (id: string) => {
    setErrorMsg(null)
    try {
      await api.post(`/tenant/child-onboarding-requests/${id}/approve/`)
      refetchOnboardingRequests()
      if (isAdmin) refetchCompanies()
    } catch (err: any) {
      setErrorMsg(getErrorMessage(err))
    }
  }

  const handleRejectOnboardingRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    if (!selectedOnboardingReqId) return
    try {
      await api.post(`/tenant/child-onboarding-requests/${selectedOnboardingReqId}/reject/`, {
        rejection_reason: rejectionReason,
      })
      setShowRejectModal(false)
      setSelectedOnboardingReqId(null)
      setRejectionReason('')
      refetchOnboardingRequests()
    } catch (err: any) {
      setErrorMsg(getErrorMessage(err))
    }
  }

  const handleWithdrawOnboardingRequest = async (id: string) => {
    setErrorMsg(null)
    try {
      await api.post(`/tenant/child-onboarding-requests/${id}/withdraw/`)
      refetchOnboardingRequests()
    } catch (err: any) {
      setErrorMsg(getErrorMessage(err))
    }
  }

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    if (!selectedCompany) return
    if (!editCompanyStatus) {
      setErrorMsg('Please select a company status.')
      return
    }
    try {
      let existingLogoAssetId: string | null = null
      try {
        const meta = selectedCompany.external_id ? JSON.parse(selectedCompany.external_id) : {}
        existingLogoAssetId = meta.logo_asset_id || null
      } catch {}

      let logoAssetId = existingLogoAssetId
      if (editLogoFile) {
        try {
          const reqRes = await api.post('/media/assets/request_upload/', {
            filename: editLogoFile.name,
            mime_type: editLogoFile.type,
            asset_type: 'brand_logo',
            owner_module: 'tenant',
          })
          logoAssetId = reqRes.data.id
          const fd = new FormData()
          fd.append('file', editLogoFile)
          await api.post(`/media/assets/${logoAssetId}/upload_file/`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        } catch (_) {}
      }

      const resp = await api.patch(`/tenant/companies/${selectedCompany.id}/`, {
        name: editCompanyName,
        display_name: editCompanyDisplayName,
        status: editCompanyStatus,
        website: editCompanyWebsite,
        business_email_domain: editCompanyEmailDomain,
        primary_contact_name: editCompanyContactName,
        primary_contact_email: editCompanyContactEmail,
        phone_number: editCompanyPhone,
        address_line1: editCompanyAddress1,
        address_line2: editCompanyAddress2,
        is_parent: editCompanyIsParent,
        parent_company: editCompanyParentId || null,
        country_code: editCompanyCountry,
        region_code: editCompanyRegion,
        allowed_channels: editCompanyAllowedChannels,
        allow_personal_email_exception: editCompanyAllowPersonalEmailException,
        map_pricing_enforced: (selectedCompany.company_type || '').toLowerCase() === 'vendor' ? editMapPricingEnforced : false,
        buyer_pricing_mode: (editBuyerPricingMode === 'default' ? 'standard' : editBuyerPricingMode) || 'standard',
        commission_percentage: editBuyerPricingMode === 'custom' ? parseFloat(editCommissionPercentage) : (editBuyerPricingMode === 'no_commission' ? 0.00 : 14.00),
        return_address: (selectedCompany.company_type || '').toLowerCase() === 'vendor' ? JSON.stringify({
          address_line1: editReturnAddress1 || '',
          address_line2: editReturnAddress2 || '',
          city: editReturnCity || '',
          region_code: editReturnRegion || '',
          zip: editReturnZip || '',
          country_code: editReturnCountry || '',
        }) : '',
        order_digest_emails: (selectedCompany.company_type || '').toLowerCase() === 'vendor' && editIntegrationMode === 'manual' ? editOrderDigestEmails : [],
        external_id: JSON.stringify({
          buyer_type: editBuyerType || null,
          vendor_type: editVendorType || null,
          integration_mode: editIntegrationMode || null,
          daily_email_time: editIntegrationMode === 'manual' ? editDailyEmailTime : null,
          daily_email_time_2: (editIntegrationMode === 'manual' && editDailyEmailTime2) ? editDailyEmailTime2 : null,
          logo_asset_id: logoAssetId,
          city: editCompanyCity || null,
          zip: editCompanyZip || null,
        }),
      })
      setSelectedCompany(resp.data)
      setEditLogoFile(null)
      setIsManageFormDirty(false)
      refetchCompanies()
      setErrorMsg(null)
      showSnackbar('Company profile changes saved successfully!', 'success')
    } catch (err: any) {
      setErrorMsg(getErrorMessage(err))
      showSnackbar('Failed to save profile changes.', 'error')
    }
  }

  const handleAssignCapability = async (capabilityCode: string) => {
    setErrorMsg(null)
    if (!selectedCompany || !capabilityCode) return
    try {
      await api.post(`/tenant/companies/${selectedCompany.id}/assign_capability/`, {
        capability_code: capabilityCode,
      })
      const resp = await api.get(`/tenant/companies/${selectedCompany.id}/`)
      setSelectedCompany(resp.data)
      refetchCompanies()
    } catch (err: any) {
      setErrorMsg(getErrorMessage(err))
    }
  }

  const handleRemoveCapability = async (capabilityCode: string) => {
    setErrorMsg(null)
    if (!selectedCompany || !capabilityCode) return
    try {
      await api.post(`/tenant/companies/${selectedCompany.id}/remove_capability/`, {
        capability_code: capabilityCode,
      })
      const resp = await api.get(`/tenant/companies/${selectedCompany.id}/`)
      setSelectedCompany(resp.data)
      refetchCompanies()
    } catch (err: any) {
      setErrorMsg(getErrorMessage(err))
    }
  }

  // ─── DELETE CONFIRMATION STATE ────────────────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'company' | 'entity' | 'user'
    id: string
    label: string
    subLabel?: string
  } | null>(null)

  const handleDeleteCompany = async (id: string) => {
    try {
      await api.delete(`/tenant/companies/${id}/`)
      showSnackbar('Company deleted successfully.', 'success')
      refetchCompanies()
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to delete company.'
      showSnackbar(msg, 'error')
    } finally {
      setDeleteConfirm(null)
    }
  }

  const handleDeleteEntity = async (id: string) => {
    try {
      await api.delete(`/tenant/entities/${id}/`)
      showSnackbar('Entity deleted successfully.', 'success')
      refetchEntities()
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to delete entity.'
      showSnackbar(msg, 'error')
    } finally {
      setDeleteConfirm(null)
    }
  }

  const handleDeleteUser = async (id: string) => {
    try {
      await api.delete(`/tenant/users/${id}/`)
      showSnackbar('User deleted successfully.', 'success')
      refetchUsers()
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to delete user.'
      showSnackbar(msg, 'error')
    } finally {
      setDeleteConfirm(null)
    }
  }

  const [mapExceptions, setMapExceptions] = useState<any[]>([])
  const [mapExceptionsLoading, setMapExceptionsLoading] = useState(false)
  const [newExcSku, setNewExcSku] = useState('')
  const [newExcBuyerId, setNewExcBuyerId] = useState('')
  const [newExcMinPrice, setNewExcMinPrice] = useState('')
  const [newExcStartDate, setNewExcStartDate] = useState('')
  const [newExcEndDate, setNewExcEndDate] = useState('')

  useEffect(() => {
    if (selectedCompany && (selectedCompany.company_type || '').toLowerCase() === 'vendor') {
      setMapExceptionsLoading(true)
      api.get(`/pricing/exceptions/?vendor_company_reference=${selectedCompany.id}`)
        .then(res => {
          setMapExceptions(res.data.results || res.data || [])
          setMapExceptionsLoading(false)
        })
        .catch(() => {
          setMapExceptions([])
          setMapExceptionsLoading(false)
        })
    } else {
      setMapExceptions([])
    }
  }, [selectedCompany])

  const handleAddMapException = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCompany) return
    try {
      const payload = {
        vendor_company_reference: selectedCompany.id,
        buyer_company_reference: newExcBuyerId || null,
        sku: newExcSku,
        approved_minimum_price: newExcMinPrice,
        start_date: newExcStartDate,
        end_date: newExcEndDate,
        status: 'approved'
      }
      await api.post('/pricing/exceptions/', payload)
      const res = await api.get(`/pricing/exceptions/?vendor_company_reference=${selectedCompany.id}`)
      setMapExceptions(res.data.results || res.data || [])
      setNewExcSku('')
      setNewExcBuyerId('')
      setNewExcMinPrice('')
      setNewExcStartDate('')
      setNewExcEndDate('')
      showSnackbar('MAP pricing exception added successfully!', 'success')
    } catch (err: any) {
      showSnackbar(err.response?.data?.error || 'Failed to add MAP exception.', 'error')
    }
  }

  const handleDeleteMapException = async (id: string) => {
    if (!selectedCompany) return
    try {
      await api.delete(`/pricing/exceptions/${id}/`)
      const res = await api.get(`/pricing/exceptions/?vendor_company_reference=${selectedCompany.id}`)
      setMapExceptions(res.data.results || res.data || [])
      showSnackbar('MAP exception deleted.', 'success')
    } catch (err: any) {
      showSnackbar('Failed to delete exception.', 'error')
    }
  }

  return (
    <Box>
      <PageHeader
        title="Settings"
        subtitle="Manage your organization, users, entities, and platform configuration"
      />

      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Profile & Org" value="profile" />
        {isAdmin && <Tab label="Companies" value="companies" />}
        {isAdmin && <Tab label="Entities" value="entities" />}
        {isAdmin && <Tab label="User Directory" value="users" />}
        {hasChildOnboardingCapability && <Tab label="Child Onboarding" value="onboarding" />}
      </Tabs>

      {/* PROFILE & ORG TAB */}
      {activeTab === 'profile' && (
        <>
          <div className="card-grid card-grid-2" style={{ marginBottom: 20 }}>
            <div className="card">
              <div className="section-header">
                <span className="section-title">Account details</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <div className="label">Full Name</div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{user?.full_name ?? '—'}</div>
                </div>
                <div>
                  <div className="label">Email</div>
                  <div className="mono" style={{ fontSize: 12 }}>{user?.email ?? '—'}</div>
                </div>
                <div>
                  <div className="label">System Role</div>
                  <div>
                    {user?.is_cixci_admin ? (
                      <Chip icon={<SecurityIcon sx={{ fontSize: 12 }} />} label="CIXCI Admin" size="small" color="secondary" />
                    ) : (
                      <Chip label="Platform User" size="small" color="info" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="section-header">
                <span className="section-title">Organization Membership</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <div className="label">Company</div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{user?.company_name ?? '—'}</div>
                </div>
                <div>
                  <div className="label">Entity</div>
                  <div>{user?.entity_name ?? '—'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="section-header">
              <span className="section-title">API & Integrations</span>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              API key management, webhook endpoints, and external integration credentials are configured
              via the Integration module. Credentials are never stored in plain text — vault references only.
            </div>
          </div>
        </>
      )}

      {/* CHILD ONBOARDING TAB */}
      {hasChildOnboardingCapability && activeTab === 'onboarding' && (
        <div>
          <div className="section-header" style={{ marginBottom: 16 }}>
            <span className="section-title">Child Company Onboarding Requests</span>
            {!isAdmin && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowOnboardingModal(true)}>
                <AddIcon sx={{ fontSize: 14 }} /> Request Child Company
              </button>
            )}
          </div>
          <div className="table-wrap">
            {onboardingRequestsList.length === 0 ? (
              <div className="empty-state">
                <ApartmentIcon sx={{ fontSize: 40, color: "text.disabled" }} />
                <div>No onboarding requests found</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Child Name</th>
                    <th>Brand/Entity</th>
                    <th>Requester</th>
                    <th>Status</th>
                    <th>Contact & Domain</th>
                    <th>Region</th>
                    <th>Rejection Reason</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {onboardingRequestsList.map((req: any) => (
                    <tr key={req.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{req.company_name}</td>
                      <td>{req.brand_name}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{req.requester_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{req.parent_company_name}</div>
                      </td>
                      <td>
                        <span className={`badge ${
                          req.status === 'approved' ? 'badge-green' :
                          req.status === 'rejected' ? 'badge-red' :
                          req.status === 'withdrawn' ? 'badge-muted' :
                          'badge-blue'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td>
                        {req.website && (
                          <div>
                            <a href={req.website} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'underline' }}>
                              {req.website}
                            </a>
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          Domain: {req.business_email_domain}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          Contact: {req.primary_contact}
                        </div>
                      </td>
                      <td>{req.region}</td>
                      <td style={{ color: 'var(--red)', fontSize: 11 }}>{req.rejection_reason || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {isAdmin && req.status === 'submitted' && (
                            <>
                              <button className="btn btn-green btn-xs" onClick={() => handleApproveOnboardingRequest(req.id)}>Approve</button>
                              <button className="btn btn-red btn-xs" onClick={() => {
                                setSelectedOnboardingReqId(req.id)
                                setShowRejectModal(true)
                              }}>Reject</button>
                            </>
                          )}
                          {!isAdmin && req.status === 'submitted' && (
                            <button className="btn btn-red btn-xs" onClick={() => handleWithdrawOnboardingRequest(req.id)}>Withdraw</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* COMPANIES TAB */}
      {isAdmin && activeTab === 'companies' && (
        <div>
          <div className="section-header" style={{ marginBottom: 16 }}>
            <span className="section-title">All Registered Companies (Tenants)</span>
            <button className="btn btn-primary btn-sm" onClick={() => {
              setCompanyName('')
              setCompanyDisplayName('')
              setCompanyType('')
              setCompanyStatus('draft')
              setCompanyExternalId('')
              setCompanyRegion('')
              setCompanyParentId('')
              setCompanyWebsite('')
              setCompanyEmailDomain('')
              setCompanyContactName('')
              setCompanyContactEmail('')
              setCompanyPhone('')
              setCompanyAddress1('')
              setCompanyAddress2('')
              setCompanyCity('')
              setCompanyZip('')
              setCompanyIsParent(false)
              setAllowPersonalEmailException(false)
              setCompanyBuyerType('')
              setCompanyVendorType('')
              setCompanyIntegrationMode('')
              setCompanyDailyEmailTime('08:00')
              setCompanyDailyEmailTime2('')
              setCompanyAllowedChannels(['online_dtc', 'buyer_storefront'])
              setCompanyLogoFile(null)
              setCompanyLogoPreview('')
              setErrorMsg(null)
              setShowCompanyModal(true)
            }}>
              <AddIcon sx={{ fontSize: 14 }} /> Add Company
            </button>
          </div>
          <div className="table-wrap">
            {companiesList.length === 0 ? (
              <div className="empty-state">
                <BusinessIcon sx={{ fontSize: 40, color: "text.disabled" }} />
                <div>No companies found</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Company Name / Display</th><th>Type</th><th>Status</th><th>Parent Status</th><th>Website & Contact</th><th>Slug</th><th>Country</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {companiesList.map((c: any) => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</div>
                        {c.display_name && c.display_name !== c.name && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.display_name}</div>
                        )}
                      </td>
                      <td>
                        <Chip label={c.company_type?.replace(/_/g, ' ')} size="small" color={TYPE_COLOR[c.company_type?.toLowerCase()] ?? 'default'} />
                      </td>
                      <td>
                        <StatusChip status={c.status ?? 'unknown'} />
                      </td>
                      <td>
                        {c.is_parent ? (
                          <Chip label="Parent Company" size="small" color="secondary" />
                        ) : c.parent_company ? (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            Child of: <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                              {companiesList.find((p: any) => p.id === c.parent_company)?.name || 'Parent'}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
                        )}
                      </td>
                      <td>
                        {c.website && (
                          <div>
                            <a href={c.website} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'underline' }}>
                              {c.website}
                            </a>
                          </div>
                        )}
                        {c.primary_contact_name && (
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            {c.primary_contact_name} ({c.primary_contact_email || 'No email'})
                          </div>
                        )}
                      </td>
                      <td className="mono" style={{ fontSize: 12 }}>{c.slug}</td>
                      <td>{c.country_code || '—'}</td>
                      <td>
                        <button className="btn btn-secondary btn-xs" onClick={() => {
                          setSelectedCompany(c)
                          setIsManageFormDirty(false)
                          setEditLogoFile(null)
                          setEditCompanyName(c.name || '')
                          setEditCompanyDisplayName(c.display_name || '')
                          setEditCompanyStatus(c.status || '')
                          setEditCompanyWebsite(c.website || '')
                          setEditCompanyEmailDomain(c.business_email_domain || '')
                          setEditCompanyContactName(c.primary_contact_name || '')
                          setEditCompanyContactEmail(c.primary_contact_email || '')
                          setEditCompanyPhone(c.phone_number || '')
                          setEditCompanyAddress1(c.address_line1 || '')
                          setEditCompanyAddress2(c.address_line2 || '')
                          setEditCompanyIsParent(c.is_parent || false)
                          setEditCompanyParentId(c.parent_company || '')
                          setEditCompanyCountry(c.country_code || 'USA')
                          setEditCompanyRegion(c.region_code || '')
                          setEditCompanyAllowedChannels(c.allowed_channels || [])
                          setEditCompanyAllowPersonalEmailException(c.allow_personal_email_exception || false)
                          setEditBuyerPricingMode((c.buyer_pricing_mode === 'default' ? 'standard' : c.buyer_pricing_mode) || 'standard')
                          setEditCommissionPercentage(c.commission_percentage !== null && c.commission_percentage !== undefined ? String(c.commission_percentage) : '14.00')
                          setEditMapPricingEnforced(c.map_pricing_enforced || false)
                          let rAddr1 = ''
                          let rAddr2 = ''
                          let rCity = ''
                          let rZip = ''
                          let rRegion = ''
                          let rCountry = ''
                          try {
                            if (c.return_address && c.return_address.startsWith('{')) {
                              const parsed = JSON.parse(c.return_address)
                              rAddr1 = parsed.address_line1 || parsed.address1 || ''
                              rAddr2 = parsed.address_line2 || parsed.address2 || ''
                              rCity = parsed.city || ''
                              rRegion = parsed.region_code || parsed.region || ''
                              rZip = parsed.zip || ''
                              rCountry = parsed.country_code || parsed.country || ''
                            } else {
                              rAddr1 = c.return_address || ''
                            }
                          } catch (_) {
                            rAddr1 = c.return_address || ''
                          }
                          setEditReturnAddress1(rAddr1)
                          setEditReturnAddress2(rAddr2)
                          setEditReturnCity(rCity)
                          setEditReturnZip(rZip)
                          setEditReturnRegion(rRegion)
                          setEditReturnCountry(rCountry)

                          let parsedCity = ''
                          let parsedZip = ''
                          try {
                            const meta = c.external_id ? JSON.parse(c.external_id) : {}
                            parsedCity = meta.city || ''
                            parsedZip = meta.zip || ''
                          } catch (_) {}

                          const isSame = (
                            rAddr1 !== '' &&
                            rAddr1 === (c.address_line1 || '') &&
                            rAddr2 === (c.address_line2 || '') &&
                            rCity === parsedCity &&
                            rZip === parsedZip &&
                            rRegion === (c.region_code || '') &&
                            rCountry === (c.country_code || '')
                          )
                          setEditSameAsCompanyAddress(isSame)
                          setEditOrderDigestEmails(c.order_digest_emails || [])
                          setEditNewDigestEmail('')
                          setEditCompanyCity('')
                          setEditCompanyZip('')
                          // Extended fields from external_id metadata
                          try {
                            const meta = c.external_id ? JSON.parse(c.external_id) : {}
                            setEditBuyerType(meta.buyer_type || '')
                            setEditVendorType(meta.vendor_type || '')
                            setEditIntegrationMode(meta.integration_mode || '')
                            setEditDailyEmailTime(meta.daily_email_time || '08:00')
                            setEditCompanyCity(meta.city || '')
                            setEditCompanyZip(meta.zip || '')
                            setEditLogoPreview('')
                            setEditLogoFile(null)
                            if (meta.logo_asset_id) {
                              api.get(`/media/assets/${meta.logo_asset_id}/`).then(res => {
                                if (res.data?.storage_key) {
                                  const base = (import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1').replace('/api/v1', '')
                                  setEditLogoPreview(`${base}/media/${res.data.storage_key}`)
                                }
                              })
                            }
                          } catch {
                            setEditBuyerType('')
                            setEditVendorType('')
                            setEditIntegrationMode('')
                            setEditDailyEmailTime('08:00')
                            setEditCompanyCity('')
                            setEditCompanyZip('')
                          }
                          setShowCompanyDetailsModal(true)
                        }}>Manage</button>
                        <button
                          className="btn btn-xs"
                          disabled={c.company_type === 'cixci_internal'}
                          title={c.company_type === 'cixci_internal' ? 'System companies cannot be deleted' : 'Delete company'}
                          style={{
                            background: c.company_type === 'cixci_internal' ? 'var(--bg-elevated)' : 'var(--red-dim)',
                            color: c.company_type === 'cixci_internal' ? 'var(--text-muted)' : 'var(--red)',
                            border: `1px solid ${c.company_type === 'cixci_internal' ? 'var(--border)' : 'var(--red)'}`,
                            cursor: c.company_type === 'cixci_internal' ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: 4
                          }}
                          onClick={() => {
                            if (c.company_type !== 'cixci_internal') {
                              setDeleteConfirm({ type: 'company', id: c.id, label: c.name, subLabel: c.company_type?.replace(/_/g, ' ') })
                            }
                          }}
                        >
                          <DeleteIcon sx={{ fontSize: 12 }} /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ENTITIES TAB */}
      {isAdmin && activeTab === 'entities' && (
        <div>
          <div className="section-header" style={{ marginBottom: 16 }}>
            <span className="section-title">All Company Entities</span>
            <button className="btn btn-primary btn-sm" onClick={() => {
              setEntityName('')
              setEntityCompanyId('')
              setEntityStatus('')
              setEntityCountry('USA')
              setEntityRegion('')
              setEntityChannelsOverride([])
              setErrorMsg(null)
              setShowEntityModal(true)
            }}>
              <AddIcon sx={{ fontSize: 14 }} /> Add Entity
            </button>
          </div>
          <div className="table-wrap">
            {entitiesList.length === 0 ? (
              <div className="empty-state">
                <ApartmentIcon sx={{ fontSize: 40, color: "text.disabled" }} />
                <div>No entities found</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Entity Name</th><th>Parent Company</th><th>Status</th><th>Country</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entitiesList.map((e: any) => {
                    const companySiblings = entitiesList.filter((x: any) => x.company === e.company || x.company_name === e.company_name)
                    const isLastEntity = companySiblings.length <= 1
                    return (
                      <tr key={e.id}>
                        <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{e.name}</td>
                        <td>{e.company_name}</td>
                        <td>
                          <StatusChip status={e.status ?? 'unknown'} />
                        </td>
                        <td>{e.country_code || '—'}</td>
                        <td>
                          <button
                            className="btn btn-xs"
                            disabled={isLastEntity}
                            title={isLastEntity ? 'Cannot delete the only entity of a company' : 'Delete entity'}
                            style={{
                              background: isLastEntity ? 'var(--bg-elevated)' : 'var(--red-dim)',
                              color: isLastEntity ? 'var(--text-muted)' : 'var(--red)',
                              border: `1px solid ${isLastEntity ? 'var(--border)' : 'var(--red)'}`,
                              cursor: isLastEntity ? 'not-allowed' : 'pointer',
                              display: 'flex', alignItems: 'center', gap: 4
                            }}
                            onClick={() => {
                              if (!isLastEntity) {
                                setDeleteConfirm({ type: 'entity', id: e.id, label: e.name, subLabel: e.company_name })
                              }
                            }}
                          >
                            <DeleteIcon sx={{ fontSize: 12 }} /> Delete
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* USERS TAB */}
      {isAdmin && activeTab === 'users' && (
        <div>
          <div className="section-header" style={{ marginBottom: 16 }}>
            <span className="section-title">User Directory</span>
            <button className="btn btn-primary btn-sm" onClick={() => {
              setUserEmail('')
              setUserFirstName('')
              setUserLastName('')
              setUserEntityId('')
              setUserPassword('')
              setUserIsActive(true)
              setErrorMsg(null)
              setShowUserModal(true)
            }}>
              <AddIcon sx={{ fontSize: 14 }} /> Add User
            </button>
          </div>
          <div className="table-wrap">
            {usersList.length === 0 ? (
              <div className="empty-state">
                <PeopleIcon sx={{ fontSize: 40, color: "text.disabled" }} />
                <div>No users found</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Name</th><th>Email</th><th>Company & Entity Scope</th><th>Access</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u: any) => {
                    const isSelf = u.id === user?.id
                    return (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{u.first_name} {u.last_name}</td>
                        <td className="mono" style={{ fontSize: 12 }}>{u.email}</td>
                        <td>
                          <div>{u.company_name || 'System'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.entity_name || 'CIXCI Scope'}</div>
                        </td>
                        <td>
                          {u.is_cixci_admin ? (
                            <Chip icon={<SecurityIcon sx={{ fontSize: 12 }} />} label="CIXCI Admin" size="small" color="secondary" />
                          ) : (
                            <Chip label="Org User" size="small" color="info" />
                          )}
                        </td>
                        <td>
                          <button
                            className="btn btn-xs"
                            disabled={isSelf}
                            title={isSelf ? 'You cannot delete your own account' : 'Delete user'}
                            style={{
                              background: isSelf ? 'var(--bg-elevated)' : 'var(--red-dim)',
                              color: isSelf ? 'var(--text-muted)' : 'var(--red)',
                              border: `1px solid ${isSelf ? 'var(--border)' : 'var(--red)'}`,
                              cursor: isSelf ? 'not-allowed' : 'pointer',
                              display: 'flex', alignItems: 'center', gap: 4
                            }}
                            onClick={() => {
                              if (!isSelf) {
                                setDeleteConfirm({
                                  type: 'user',
                                  id: u.id,
                                  label: `${u.first_name} ${u.last_name}`.trim() || u.email,
                                  subLabel: u.email
                                })
                              }
                            }}
                          >
                            <DeleteIcon sx={{ fontSize: 12 }} /> Delete
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setDeleteConfirm(null) }}>
          <div className="modal-content" style={{ width: 420 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'var(--red-dim)', border: '1px solid var(--red)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <DeleteIcon sx={{ fontSize: 16, color: "error.main" }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                  Delete {deleteConfirm.type === 'company' ? 'Company' : deleteConfirm.type === 'entity' ? 'Entity' : 'User'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>This action cannot be undone.</div>
              </div>
            </div>

            <div style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-sm)', padding: '12px 14px', marginBottom: 16
            }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>{deleteConfirm.label}</div>
              {deleteConfirm.subLabel && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{deleteConfirm.subLabel}</div>
              )}
            </div>

            <div style={{
              fontSize: 12, color: 'var(--text-secondary)', lineHeight: '1.6',
              background: 'var(--red-dim)', border: '1px solid var(--red)',
              borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 20
            }}>
              {deleteConfirm.type === 'company' && (
                <span>⚠️ Deleting a company will fail if it still has <strong>entities or users</strong> attached. Remove those first, or the server will reject this request.</span>
              )}
              {deleteConfirm.type === 'entity' && (
                <span>⚠️ Deleting an entity will fail if <strong>users are still assigned</strong> to it. Reassign or delete those users first.</span>
              )}
              {deleteConfirm.type === 'user' && (
                <span>⚠️ This will <strong>permanently remove</strong> the user account and revoke all access. The last active company admin cannot be deleted.</span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button
                className="btn btn-sm"
                style={{ background: 'var(--red)', color: '#fff', border: '1px solid var(--red)', display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => {
                  if (deleteConfirm.type === 'company') handleDeleteCompany(deleteConfirm.id)
                  else if (deleteConfirm.type === 'entity') handleDeleteEntity(deleteConfirm.id)
                  else handleDeleteUser(deleteConfirm.id)
                }}
              >
                <DeleteIcon sx={{ fontSize: 13 }} /> Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD COMPANY MODAL */}
      <Dialog open={showCompanyModal} onClose={() => { if (isCreateFormDirty()) setShowConfirmCloseCreate(true); else setShowCompanyModal(false) }} maxWidth="sm" fullWidth>
        <DialogTitle>Create Company Profile</DialogTitle>
        <DialogContent dividers>
            {errorMsg && (
              <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>
            )}
            <form id="create-company-form" onSubmit={handleCreateCompany}>
              <Stack direction="row" spacing={2}>
                <Box sx={{ flex: 1 }}>
                  <TextField
                    size="small" fullWidth label="Company Legal Name" placeholder="e.g. Acme Corp" required
                    value={companyName}
                    onChange={e => {
                      const val = e.target.value
                      setCompanyName(val)
                      if (!companyDisplayName || companyDisplayName === companyName) {
                        setCompanyDisplayName(val)
                      }
                    }}
                    error={!!(companyName.trim() && companiesList.some(
                      (c: any) => c.name?.trim().toLowerCase() === companyName.trim().toLowerCase()
                    ))}
                    helperText={companyName.trim() && companiesList.some(
                      (c: any) => c.name?.trim().toLowerCase() === companyName.trim().toLowerCase()
                    ) ? 'A company with this name already exists. Each company can only be onboarded once.' : undefined}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <TextField size="small" fullWidth label="Display Name" placeholder="e.g. Acme Accessories" required value={companyDisplayName} onChange={e => setCompanyDisplayName(e.target.value)} />
                </Box>
              </Stack>

              <Box sx={{ mt: 1.5 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Company Type / Category</InputLabel>
                  <Select label="Company Type / Category" value={companyType} onChange={e => setCompanyType(e.target.value as string)}>
                    <MenuItem value="">Select Company Type</MenuItem>
                    <MenuItem value="buyer">Buyer</MenuItem>
                    <MenuItem value="vendor">Vendor</MenuItem>
                    <MenuItem value="device_distributor">Device Distributor</MenuItem>
                  </Select>
                </FormControl>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>Short name (slug) is auto-generated from the Legal Name.</Typography>
              </Box>

              {/* Buyer / Vendor sub-type */}
              {companyType === 'buyer' && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1.5 }}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Buyer Type</InputLabel>
                    <Select label="Buyer Type" value={companyBuyerType} onChange={e => setCompanyBuyerType(e.target.value as string)}>
                      <MenuItem value=''>Select Buyer Type</MenuItem>
                      <MenuItem value='mvno'>MVNO</MenuItem>
                      <MenuItem value='wireless_carrier'>Wireless Carrier</MenuItem>
                      <MenuItem value='retailer'>Retailer</MenuItem>
                      <MenuItem value='enterprise_corporate'>Enterprise/ Corporate</MenuItem>
                    </Select>
                  </FormControl>
                  <Stack direction="row" spacing={2}>
                    <Box sx={{ flex: 1 }}>
                      <FormControl size="small" fullWidth>
                        <InputLabel>Buyer Pricing Mode</InputLabel>
                        <Select label="Buyer Pricing Mode" value={companyBuyerPricingMode} onChange={e => setCompanyBuyerPricingMode(e.target.value as string)}>
                          <MenuItem value="standard">Standard Buyer Commission (14%)</MenuItem>
                          <MenuItem value="no_commission">No Buyer Commission (0%)</MenuItem>
                          <MenuItem value="custom">Custom Buyer Commission</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                    {companyBuyerPricingMode === 'custom' && (
                      <Box sx={{ flex: 1 }}>
                        <TextField
                          size="small" fullWidth label="Commission Percentage (%)"
                          type="number"
                          inputProps={{ step: '0.01', min: '0', max: '100' }}
                          placeholder="e.g. 10.00"
                          value={companyCommissionPercentage}
                          onChange={e => setCompanyCommissionPercentage(e.target.value)}
                          required
                        />
                      </Box>
                    )}
                  </Stack>
                </Box>
              )}
              {companyType === 'vendor' && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1.5 }}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Vendor Type</InputLabel>
                    <Select label="Vendor Type" value={companyVendorType} onChange={e => setCompanyVendorType(e.target.value as string)}>
                      <MenuItem value=''>Select Vendor Type</MenuItem>
                      <MenuItem value='accessory_vendor'>Accessory Vendor</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              )}

              {companyType === 'vendor' && (
                <Box sx={{ borderTop: '1px solid var(--border-light)', pt: 1.5, mt: 1 }}>
                  <Typography variant="caption" sx={{ mb: 1, display: 'block' }}>Integration Mode</Typography>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    {(['api','manual'] as const).map(mode => (
                      <button key={mode} type='button' onClick={() => {
                        if (companyIntegrationMode === mode) {
                          if (mode === 'api') {
                            setCompanyIntegrationMode('')
                          } else if (mode === 'manual') {
                            const isEmpty = (companyDailyEmailTime === '08:00' || !companyDailyEmailTime) && !companyDailyEmailTime2 && companyOrderDigestEmails.length === 0
                            if (isEmpty) {
                              setCompanyIntegrationMode('')
                            }
                          }
                        } else {
                          setCompanyIntegrationMode(mode)
                        }
                      }}
                        style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: `1.5px solid ${companyIntegrationMode === mode ? 'var(--accent)' : 'var(--border)'}`, background: companyIntegrationMode === mode ? 'rgba(99,102,241,.12)' : 'var(--bg-elevated)', color: companyIntegrationMode === mode ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                        {mode === 'api' ? '🔌 API' : '📋 Manual'}
                      </button>
                    ))}
                  </div>
                  {companyIntegrationMode === 'manual' && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Stack direction="row" spacing={2}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}><AccessTimeIcon sx={{ fontSize: 11 }} /> First Send Time</Typography>
                          <AmPmTimePicker value={companyDailyEmailTime} onChange={setCompanyDailyEmailTime} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}><AccessTimeIcon sx={{ fontSize: 11 }} /> Second Send Time <span style={{fontWeight:400,color:'var(--text-muted)',fontSize:10}}>(optional)</span></Typography>
                          <AmPmTimePicker value={companyDailyEmailTime2} onChange={setCompanyDailyEmailTime2} allowEmpty />
                        </Box>
                      </Stack>
                      <Box>
                        <Typography variant="caption" sx={{ mb: 0.5, display: 'block' }}>Additional Automated Digest Recipients</Typography>
                        <Stack direction="row" spacing={1}>
                          <TextField
                            size="small" fullWidth
                            type="email"
                            placeholder="e.g. sales@vendor.com"
                            value={companyNewDigestEmail}
                            onChange={e => setCompanyNewDigestEmail(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCompanyDigestEmail(); } }}
                          />
                          <Button
                            type="button"
                            variant="contained"
                            size="small"
                            onClick={handleAddCompanyDigestEmail}
                          >
                            + Add
                          </Button>
                        </Stack>
                        {companyOrderDigestEmails.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6, maxHeight: 120, overflowY: 'auto', background: 'var(--bg-elevated)', borderRadius: 6, padding: 6, border: '1px solid var(--border)' }}>
                            {companyOrderDigestEmails.map(email => (
                              <div key={email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', padding: '4px 8px', borderRadius: 4, fontSize: 12, border: '1px solid var(--border-light)' }}>
                                <span style={{ color: 'var(--text-primary)' }}>{email}</span>
                                <Button
                                  size="small"
                                  color="error"
                                  onClick={() => handleRemoveCompanyDigestEmail(email)}
                                  sx={{ fontSize: 11, minWidth: 'auto', p: '0 4px' }}
                                >
                                  Remove
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary">Order digest emailed daily to the configured recipients at these UTC times.</Typography>
                    </Box>
                  )}
                </Box>
              )}

              {/* Logo */}
              <Box sx={{ mt: 1.5 }}>
                <Typography variant="caption" sx={{ mb: 0.5, display: 'block' }}>Company Logo</Typography>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {companyLogoPreview ? (
                    <img src={companyLogoPreview} alt='Logo' style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-elevated)', padding: 3 }} />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: 6, border: '2px dashed var(--border)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><CloudUploadIcon sx={{ fontSize: 18 }} /></div>
                  )}
                  <label style={{ cursor: 'pointer' }}>
                    <Button component="span" size="small" startIcon={<CloudUploadIcon sx={{ fontSize: 12 }} />}>Choose Logo</Button>
                    <input type='file' accept='image/*' style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { setCompanyLogoFile(f); setCompanyLogoPreview(URL.createObjectURL(f)) } }} />
                  </label>
                  <Typography variant="caption" color="text.secondary">PNG, JPG, WEBP or SVG</Typography>
                </div>
              </Box>

              <Stack direction="row" spacing={2} sx={{ mt: 1.5 }}>
                <Box sx={{ flex: 1 }}>
                  <TextField size="small" fullWidth label="Website *" placeholder="e.g. https://acme.com" required value={companyWebsite} onChange={e => setCompanyWebsite(e.target.value)} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <TextField size="small" fullWidth label="Business Email Domain *" placeholder="e.g. acme.com (no gmail.com)" required value={companyEmailDomain} onChange={e => setCompanyEmailDomain(e.target.value)} />
                </Box>
              </Stack>

              <Stack direction="row" spacing={2} sx={{ mt: 1.5 }}>
                <Box sx={{ flex: 1 }}>
                  <TextField size="small" fullWidth label="Primary Contact Name *" placeholder="John Doe" required value={companyContactName} onChange={e => setCompanyContactName(e.target.value)} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <TextField size="small" fullWidth label="Primary Contact Email *" type="email" placeholder="john@acme.com" required value={companyContactEmail} onChange={e => setCompanyContactEmail(e.target.value)} />
                </Box>
              </Stack>

              <Box sx={{ mt: 1.5 }}>
                <TextField size="small" fullWidth label="Phone Number (optional)" placeholder="+1-555-0199" value={companyPhone} onChange={e => setCompanyPhone(e.target.value)} />
              </Box>

              <Box sx={{ mt: 1.5 }}>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" sx={{ mb: 0.5, display: 'block' }}>Address Line 1 *</Typography>
                  <AddressAutocomplete
                    value={companyAddress1}
                    onChange={val => {
                      setCompanyAddress1(val)
                      if (companySameAsCompanyAddress) setCompanyReturnAddress1(val)
                    }}
                    onSelect={({ address1, city, state, zip, country }) => {
                      setCompanyAddress1(address1)
                      setCompanyCity(city)
                      setCompanyRegion(state)
                      setCompanyZip(zip)
                      setCompanyCountry(country)
                      if (companySameAsCompanyAddress) {
                        setCompanyReturnAddress1(address1)
                        setCompanyReturnCity(city)
                        setCompanyReturnRegion(state)
                        setCompanyReturnZip(zip)
                        setCompanyReturnCountry(country)
                      }
                    }}
                    className="input"
                    placeholder="Start typing an address…"
                  />
                </Box>
                <Stack direction="row" spacing={2}>
                  <Box sx={{ flex: 1 }}>
                    <TextField size="small" fullWidth label={<>Address Line 2 <span style={{fontWeight:400,color:'var(--text-muted)',fontSize:10}}>(unit, suite…)</span></>} placeholder="e.g. Suite 400" value={companyAddress2} onChange={e => {
                      setCompanyAddress2(e.target.value)
                      if (companySameAsCompanyAddress) setCompanyReturnAddress2(e.target.value)
                    }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <TextField size="small" fullWidth label="City" placeholder="Auto-filled" value={companyCity} onChange={e => {
                      setCompanyCity(e.target.value)
                      if (companySameAsCompanyAddress) setCompanyReturnCity(e.target.value)
                    }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <TextField size="small" fullWidth label="ZIP / Postal Code" placeholder="Auto-filled" value={companyZip} onChange={e => {
                      setCompanyZip(e.target.value)
                      if (companySameAsCompanyAddress) setCompanyReturnZip(e.target.value)
                    }} />
                  </Box>
                </Stack>
              </Box>

              <Stack direction="row" spacing={2} sx={{ mt: 1.5 }}>
                <Box sx={{ flex: 1 }}>
                  <TextField size="small" fullWidth label="Country Code" value={companyCountry} onChange={e => {
                    setCompanyCountry(e.target.value)
                    if (companySameAsCompanyAddress) setCompanyReturnCountry(e.target.value)
                  }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>State</InputLabel>
                    <Select label="State" value={companyRegion} onChange={e => {
                      setCompanyRegion(e.target.value as string)
                      if (companySameAsCompanyAddress) setCompanyReturnRegion(e.target.value as string)
                    }}>
                      <MenuItem value=''>-- Select state --</MenuItem>
                      {US_STATES.map(([v,l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <TextField size="small" fullWidth label="External ERP ID" placeholder="e.g. EXT-908" value={companyExternalId} onChange={e => setCompanyExternalId(e.target.value)} />
                </Box>
              </Stack>

              {companyType === 'vendor' && (
                <Box sx={{ mt: 2, borderTop: '1px solid var(--border-light)', pt: 2 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={companySameAsCompanyAddress}
                        onChange={e => {
                          const checked = e.target.checked
                          setCompanySameAsCompanyAddress(checked)
                          if (checked) {
                            setCompanyReturnAddress1(companyAddress1)
                            setCompanyReturnAddress2(companyAddress2)
                            setCompanyReturnCity(companyCity)
                            setCompanyReturnRegion(companyRegion)
                            setCompanyReturnZip(companyZip)
                            setCompanyReturnCountry(companyCountry)
                          }
                        }}
                      />
                    }
                    label={<strong>Same as company address</strong>}
                    sx={{ mb: 1.5 }}
                  />
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" sx={{ mb: 0.5, display: 'block' }}>Return Address Line 1 *</Typography>
                    <AddressAutocomplete
                      value={companyReturnAddress1}
                      onChange={val => {
                        setCompanyReturnAddress1(val)
                        setCompanySameAsCompanyAddress(false)
                      }}
                      onSelect={({ address1, city, state, zip, country }) => {
                        setCompanyReturnAddress1(address1)
                        setCompanyReturnCity(city)
                        setCompanyReturnRegion(state)
                        setCompanyReturnZip(zip)
                        setCompanyReturnCountry(country)
                        setCompanySameAsCompanyAddress(false)
                      }}
                      className="input"
                      placeholder="Start typing return address…"
                    />
                  </Box>

                  <Stack direction="row" spacing={2} sx={{ mt: 1.5 }}>
                    <Box sx={{ flex: 1 }}>
                      <TextField size="small" fullWidth label={<>Return Address Line 2 <span style={{fontWeight:400,color:'var(--text-muted)',fontSize:10}}>(unit, suite…)</span></>} placeholder="e.g. Suite 400" value={companyReturnAddress2} onChange={e => {
                        setCompanyReturnAddress2(e.target.value)
                        setCompanySameAsCompanyAddress(false)
                      }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <TextField size="small" fullWidth label="Return City" placeholder="Auto-filled" value={companyReturnCity} onChange={e => {
                        setCompanyReturnCity(e.target.value)
                        setCompanySameAsCompanyAddress(false)
                      }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <TextField size="small" fullWidth label="Return ZIP / Postal Code" placeholder="Auto-filled" value={companyReturnZip} onChange={e => {
                        setCompanyReturnZip(e.target.value)
                        setCompanySameAsCompanyAddress(false)
                      }} />
                    </Box>
                  </Stack>

                  <Stack direction="row" spacing={2} sx={{ mt: 1.5 }}>
                    <Box sx={{ flex: 1 }}>
                      <TextField size="small" fullWidth label="Return Country Code" placeholder="USA" value={companyReturnCountry} onChange={e => {
                        setCompanyReturnCountry(e.target.value)
                        setCompanySameAsCompanyAddress(false)
                      }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <FormControl size="small" fullWidth>
                        <InputLabel>Return State</InputLabel>
                        <Select label="Return State" value={companyReturnRegion} onChange={e => {
                          setCompanyReturnRegion(e.target.value as string)
                          setCompanySameAsCompanyAddress(false)
                        }}>
                          <MenuItem value=''>-- Select state --</MenuItem>
                          {US_STATES.map(([v,l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Box>
                  </Stack>
                </Box>
              )}

              <Stack direction="row" spacing={2} sx={{ mt: 1.5 }}>
                <Box sx={{ flex: 1 }}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select label="Status" value={companyStatus || 'draft'} onChange={e => setCompanyStatus(e.target.value as string)}>
                      <MenuItem value="draft">Draft</MenuItem>
                      <MenuItem value="active">Active (Requires full setup/admin)</MenuItem>
                      <MenuItem value="suspended">Suspended</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0.5 }}>
                  <FormControlLabel
                    control={<Checkbox checked={companyIsParent} onChange={e => setCompanyIsParent(e.target.checked)} />}
                    label={<strong>Mark as a Parent Company</strong>}
                  />
                  <FormControlLabel
                    control={<Checkbox checked={allowPersonalEmailException} onChange={e => setAllowPersonalEmailException(e.target.checked)} />}
                    label={<strong>Allow personal email domain exception</strong>}
                  />
                  {companyType === 'vendor' && (
                    <FormControlLabel
                      control={<Checkbox checked={companyMapPricingEnforced} onChange={e => setCompanyMapPricingEnforced(e.target.checked)} />}
                      label={<strong>Enforce MAP Pricing</strong>}
                    />
                  )}
                </Box>
              </Stack>

              <Box sx={{ mt: 1.5 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Parent Company (Optional - if not marking as parent)</InputLabel>
                  <Select label="Parent Company (Optional - if not marking as parent)" value={companyParentId} onChange={e => setCompanyParentId(e.target.value as string)} disabled={companyIsParent}>
                    <MenuItem value="">Select one</MenuItem>
                    {companiesList.filter((c: any) => c.is_parent).map((c: any) => (
                      <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ mt: 1.5 }}>
                <Typography variant="caption" sx={{ mb: 0.5, display: 'block' }}>Allowed Sales Channels</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
                  {[
                    { val: 'online_dtc', lbl: 'Online DTC' },
                    { val: 'bulk_po', lbl: 'Bulk PO' },
                    { val: 'owned_channel', lbl: 'Owned Channel' },
                    { val: 'buyer_storefront', lbl: 'Buyer Storefront' },
                    { val: 'marketplace', lbl: 'Marketplace' },
                    { val: 'retail_pos', lbl: 'Retail POS' },
                  ].map(ch => (
                    <FormControlLabel
                      key={ch.val}
                      control={
                        <Checkbox
                          size="small"
                          checked={companyAllowedChannels.includes(ch.val)}
                          onChange={e => {
                            if (e.target.checked) {
                              setCompanyAllowedChannels([...companyAllowedChannels, ch.val])
                            } else {
                              setCompanyAllowedChannels(companyAllowedChannels.filter(x => x !== ch.val))
                            }
                          }}
                        />
                      }
                      label={ch.lbl}
                      sx={{ '& .MuiFormControlLabel-label': { fontSize: 12 } }}
                    />
                  ))}
                </Box>
              </Box>
            </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { if (isCreateFormDirty()) setShowConfirmCloseCreate(true); else setShowCompanyModal(false) }}>Cancel</Button>
          <Button
            type="submit"
            form="create-company-form"
            variant="contained"
            disabled={!!companyName.trim() && companiesList.some(
              (c: any) => c.name?.trim().toLowerCase() === companyName.trim().toLowerCase()
            )}
          >Create Company</Button>
        </DialogActions>
      </Dialog>

      {/* Unsaved changes confirmation for Create */}
      <Dialog open={showConfirmCloseCreate} onClose={() => setShowConfirmCloseCreate(false)}>
        <DialogTitle>Unsaved Changes</DialogTitle>
        <DialogContent>
          <Typography>
            Your progress will be lost because you have unsaved changes. Are you sure you want to close?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmCloseCreate(false)}>No, Keep Editing</Button>
          <Button color="error" variant="contained" onClick={() => { setShowCompanyModal(false); setShowConfirmCloseCreate(false) }}>Yes, Discard</Button>
        </DialogActions>
      </Dialog>

      {/* ADD ENTITY MODAL */}
      {showEntityModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '540px' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Create Company Entity</h3>
            {errorMsg && (
              <div style={{ display: 'flex', gap: 8, background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid var(--red)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: 14 }}>
                <ErrorOutlinedIcon sx={{ fontSize: 16 }} />
                <span>{errorMsg}</span>
              </div>
            )}
            <form onSubmit={handleCreateEntity}>
              <div className="card-grid card-grid-2">
                <div className="form-group">
                  <label className="label">Entity Name</label>
                  <input type="text" className="input" required value={entityName} onChange={e => setEntityName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="label">Parent Company</label>
                  <select className="input" value={entityCompanyId} onChange={e => setEntityCompanyId(e.target.value)}>
                    <option value="">Select one</option>
                    {companiesList.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.company_type})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="card-grid card-grid-3" style={{ marginTop: 10 }}>
                <div className="form-group">
                  <label className="label">Status</label>
                  <select className="input" value={entityStatus} onChange={e => setEntityStatus(e.target.value)}>
                    <option value="">Select one</option>
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Country Code</label>
                  <input type="text" className="input" value={entityCountry} onChange={e => setEntityCountry(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="label">Region Code</label>
                  <input type="text" className="input" placeholder="e.g. CA" value={entityRegion} onChange={e => setEntityRegion(e.target.value)} />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 12 }}>
                <label className="label" style={{ marginBottom: 6 }}>Channel Eligibility Override (Optional)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { val: 'online_dtc', lbl: 'Online DTC' },
                    { val: 'bulk_po', lbl: 'Bulk PO' },
                    { val: 'owned_channel', lbl: 'Owned Channel' },
                    { val: 'buyer_storefront', lbl: 'Buyer Storefront' },
                    { val: 'marketplace', lbl: 'Marketplace' },
                    { val: 'retail_pos', lbl: 'Retail POS' },
                  ].map(ch => (
                    <label key={ch.val} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={entityChannelsOverride.includes(ch.val)}
                        onChange={e => {
                          if (e.target.checked) {
                            setEntityChannelsOverride([...entityChannelsOverride, ch.val])
                          } else {
                            setEntityChannelsOverride(entityChannelsOverride.filter(x => x !== ch.val))
                          }
                        }}
                      />
                      {ch.lbl}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEntityModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Entity</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD USER MODAL */}
      {showUserModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Onboard Admin User</h3>
            {errorMsg && (
              <div style={{ display: 'flex', gap: 8, background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid var(--red)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: 14 }}>
                <ErrorOutlinedIcon sx={{ fontSize: 16 }} />
                <span>{errorMsg}</span>
              </div>
            )}
            <form onSubmit={handleCreateUser}>
              <div className="card-grid card-grid-2">
                <div className="form-group">
                  <label className="label">First Name</label>
                  <input type="text" className="input" required value={userFirstName} onChange={e => setUserFirstName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="label">Last Name</label>
                  <input type="text" className="input" required value={userLastName} onChange={e => setUserLastName(e.target.value)} />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: 10 }}>
                <label className="label">Email Address</label>
                <input type="email" className="input" required value={userEmail} onChange={e => setUserEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="label">Assign Company Entity Scope</label>
                <select className="input" value={userEntityId} onChange={e => setUserEntityId(e.target.value)}>
                  <option value="">Select one</option>
                  {entitiesList.map((ent: any) => (
                    <option key={ent.id} value={ent.id}>{ent.company_name} — {ent.name}</option>
                  ))}
                </select>
              </div>
              <div className="card-grid card-grid-2" style={{ marginTop: 10 }}>
                <div className="form-group">
                  <label className="label">Password (Optional)</label>
                  <input type="password" className="input" placeholder="e.g. secret123" value={userPassword} onChange={e => setUserPassword(e.target.value)} />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={userIsActive}
                      onChange={e => setUserIsActive(e.target.checked)}
                    />
                    <strong>Activate immediately</strong>
                  </label>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowUserModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Onboard User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHILD ONBOARDING MODAL */}
      {showOnboardingModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '580px' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Request Child Onboarding</h3>
            {errorMsg && (
              <div style={{ display: 'flex', gap: 8, background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid var(--red)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: 14 }}>
                <ErrorOutlinedIcon sx={{ fontSize: 16 }} />
                <span style={{ fontSize: 12 }}>{errorMsg}</span>
              </div>
            )}
            <form onSubmit={handleCreateOnboardingRequest}>
              <div className="card-grid card-grid-2">
                <div className="form-group">
                  <label className="label">Child Company Legal Name</label>
                  <input type="text" className="input" placeholder="e.g. Sub Corp" required value={onboardCompanyName} onChange={e => setOnboardCompanyName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="label">Brand Name</label>
                  <input type="text" className="input" placeholder="e.g. Sub Brand" required value={onboardBrandName} onChange={e => setOnboardBrandName(e.target.value)} />
                </div>
              </div>
              <div className="card-grid card-grid-2" style={{ marginTop: 10 }}>
                <div className="form-group">
                  <label className="label">Website</label>
                  <input type="text" className="input" placeholder="e.g. https://sub.com" required value={onboardWebsite} onChange={e => setOnboardWebsite(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="label">Region</label>
                  <input type="text" className="input" placeholder="e.g. US" required value={onboardRegion} onChange={e => setOnboardRegion(e.target.value)} />
                </div>
              </div>
              <div className="card-grid card-grid-2" style={{ marginTop: 10 }}>
                <div className="form-group">
                  <label className="label">Primary Contact</label>
                  <input type="text" className="input" placeholder="e.g. John Doe" required value={onboardContact} onChange={e => setOnboardContact(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="label">Business Email Domain</label>
                  <input type="text" className="input" placeholder="e.g. sub.com" required value={onboardDomain} onChange={e => setOnboardDomain(e.target.value)} />
                </div>
              </div>
              <div className="card-grid card-grid-2" style={{ marginTop: 10 }}>
                <div className="form-group">
                  <label className="label">Requested Commission Percentage (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    className="input"
                    placeholder="e.g. 14.00"
                    value={onboardCommissionPercentage}
                    onChange={e => setOnboardCommissionPercentage(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={onboardAllowPersonalEmailException}
                      onChange={e => setOnboardAllowPersonalEmailException(e.target.checked)}
                    />
                    <strong>Allow personal email domain exception</strong>
                  </label>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowOnboardingModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECT ONBOARDING MODAL */}
      {showRejectModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Reject Onboarding Request</h3>
            {errorMsg && (
              <div style={{ display: 'flex', gap: 8, background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid var(--red)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: 14 }}>
                <ErrorOutlinedIcon sx={{ fontSize: 16 }} />
                <span style={{ fontSize: 12 }}>{errorMsg}</span>
              </div>
            )}
            <form onSubmit={handleRejectOnboardingRequest}>
              <div className="form-group">
                <label className="label">Rejection Reason (Mandatory)</label>
                <textarea
                  className="input"
                  rows={4}
                  required
                  placeholder="Explain why this request is rejected..."
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowRejectModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Reject Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPANY DETAILS & GOVERNANCE MODAL */}
      <Dialog
        open={showCompanyDetailsModal && !!selectedCompany}
        onClose={() => {
          if (isEditFormDirty()) {
            setShowConfirmCloseManage(true)
          } else {
            setShowCompanyDetailsModal(false)
            setSelectedCompany(null)
            setErrorMsg(null)
            setIsManageFormDirty(false)
          }
        }}
        maxWidth="md"
        fullWidth
      >
        {selectedCompany && (
          <>
            <DialogTitle>
              Manage Company Profile
              <Typography variant="caption" display="block" color="text.secondary">
                ID: {selectedCompany.id} &nbsp;·&nbsp; Type: {selectedCompany.company_type}
              </Typography>
            </DialogTitle>
            <DialogContent dividers>
              {errorMsg && (
                <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>
              )}

              <Box sx={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 3 }}>
                {/* Profile Editor */}
                <div>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'var(--accent)' }}>Edit Profile</Typography>
                  <form onSubmit={handleUpdateCompany} onChange={() => setIsManageFormDirty(true)}>
                    {/* Company / Buyer / Vendor sub-type */}
                    {(selectedCompany.company_type || '').toLowerCase() === 'buyer' && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 1.5 }}>
                        <FormControl size="small" fullWidth>
                          <InputLabel>Buyer Type</InputLabel>
                          <Select label="Buyer Type" value={editBuyerType} onChange={e => setEditBuyerType(e.target.value as string)}>
                            <MenuItem value=''>Select Buyer Type</MenuItem>
                            <MenuItem value='mvno'>MVNO</MenuItem>
                            <MenuItem value='wireless_carrier'>Wireless Carrier</MenuItem>
                            <MenuItem value='retailer'>Retailer</MenuItem>
                            <MenuItem value='enterprise_corporate'>Enterprise/ Corporate</MenuItem>
                          </Select>
                        </FormControl>
                        <Stack direction="row" spacing={2}>
                          <Box sx={{ flex: 1 }}>
                            <FormControl size="small" fullWidth>
                              <InputLabel>Buyer Pricing Mode</InputLabel>
                              <Select label="Buyer Pricing Mode" value={editBuyerPricingMode} onChange={e => setEditBuyerPricingMode(e.target.value as string)}>
                                <MenuItem value="standard">Standard Buyer Commission (14%)</MenuItem>
                                <MenuItem value="no_commission">No Buyer Commission (0%)</MenuItem>
                                <MenuItem value="custom">Custom Buyer Commission</MenuItem>
                              </Select>
                            </FormControl>
                          </Box>
                          {editBuyerPricingMode === 'custom' && (
                            <Box sx={{ flex: 1 }}>
                              <TextField
                                size="small" fullWidth label="Commission Percentage (%)"
                                type="number"
                                inputProps={{ step: '0.01', min: '0', max: '100' }}
                                placeholder="e.g. 10.00"
                                value={editCommissionPercentage}
                                onChange={e => setEditCommissionPercentage(e.target.value)}
                                required
                              />
                            </Box>
                          )}
                        </Stack>
                      </Box>
                    )}
                    {(selectedCompany.company_type || '').toLowerCase() === 'vendor' && (
                      <Box sx={{ mb: 1.5 }}>
                        <FormControl size="small" fullWidth>
                          <InputLabel>Vendor Type</InputLabel>
                          <Select label="Vendor Type" value={editVendorType} onChange={e => setEditVendorType(e.target.value as string)}>
                            <MenuItem value=''>Select Vendor Type</MenuItem>
                            <MenuItem value='accessory_vendor'>Accessory Vendor</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                    )}
                    {/* Logo */}
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="caption" sx={{ mb: 0.5, display: 'block' }}>Company Logo</Typography>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {editLogoPreview ? (
                          <img src={editLogoPreview} alt='Logo' style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-elevated)', padding: 3 }} />
                        ) : (
                          <div style={{ width: 48, height: 48, borderRadius: 6, border: '2px dashed var(--border)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><CloudUploadIcon sx={{ fontSize: 18 }} /></div>
                        )}
                        <label style={{ cursor: 'pointer' }}>
                          <Button component="span" size="small" startIcon={<CloudUploadIcon sx={{ fontSize: 12 }} />}>Choose Logo</Button>
                          <input type='file' accept='image/*' style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { setEditLogoFile(f); setEditLogoPreview(URL.createObjectURL(f)); setIsManageFormDirty(true); } }} />
                        </label>
                        <Typography variant="caption" color="text.secondary">PNG, JPG, WEBP or SVG</Typography>
                      </div>
                    </Box>
                    <Stack direction="row" spacing={2}>
                      <Box sx={{ flex: 1 }}>
                        <TextField size="small" fullWidth label="Company Legal Name" required value={editCompanyName} onChange={e => {
                          const val = e.target.value
                          setEditCompanyName(val)
                          if (!editCompanyDisplayName || editCompanyDisplayName === editCompanyName) {
                            setEditCompanyDisplayName(val)
                          }
                        }} />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <TextField size="small" fullWidth label="Display Name" required value={editCompanyDisplayName} onChange={e => setEditCompanyDisplayName(e.target.value)} />
                      </Box>
                    </Stack>

                    <Stack direction="row" spacing={2} sx={{ mt: 1.5 }}>
                      <Box sx={{ flex: 1 }}>
                        <FormControl size="small" fullWidth>
                          <InputLabel>Status</InputLabel>
                          <Select label="Status" value={editCompanyStatus} onChange={e => setEditCompanyStatus(e.target.value as string)}>
                            <MenuItem value="draft">Draft</MenuItem>
                            <MenuItem value="active">Active</MenuItem>
                            <MenuItem value="suspended">Suspended</MenuItem>
                            <MenuItem value="archived">Archived</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <TextField size="small" fullWidth label="Business Email Domain *" placeholder="e.g. corp.com (no gmail.com)" required value={editCompanyEmailDomain} onChange={e => setEditCompanyEmailDomain(e.target.value)} />
                      </Box>
                    </Stack>

                    <Stack direction="row" spacing={2} sx={{ mt: 1.5 }}>
                      <Box sx={{ flex: 1 }}>
                        <TextField size="small" fullWidth label="Website *" placeholder="e.g. https://corp.com" required value={editCompanyWebsite} onChange={e => setEditCompanyWebsite(e.target.value)} />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <TextField size="small" fullWidth label="Primary Contact Name *" required value={editCompanyContactName} onChange={e => setEditCompanyContactName(e.target.value)} />
                      </Box>
                    </Stack>

                    <Stack direction="row" spacing={2} sx={{ mt: 1.5 }}>
                      <Box sx={{ flex: 1 }}>
                        <TextField size="small" fullWidth label="Primary Contact Email *" type="email" required value={editCompanyContactEmail} onChange={e => setEditCompanyContactEmail(e.target.value)} />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <TextField size="small" fullWidth label="Phone Number (optional)" placeholder="+1-555-0199" value={editCompanyPhone} onChange={e => setEditCompanyPhone(e.target.value)} />
                      </Box>
                    </Stack>

                    <Box sx={{ mt: 1.5 }}>
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="caption" sx={{ mb: 0.5, display: 'block' }}>Address Line 1 *</Typography>
                        <AddressAutocomplete
                          value={editCompanyAddress1}
                          onChange={val => {
                            setEditCompanyAddress1(val)
                            setIsManageFormDirty(true)
                            if (editSameAsCompanyAddress) setEditReturnAddress1(val)
                          }}
                          onSelect={({ address1, city, state, zip, country }) => {
                            setIsManageFormDirty(true)
                            setEditCompanyAddress1(address1)
                            setEditCompanyCity(city)
                            setEditCompanyRegion(state)
                            setEditCompanyZip(zip)
                            setEditCompanyCountry(country)
                            if (editSameAsCompanyAddress) {
                              setEditReturnAddress1(address1)
                              setEditReturnCity(city)
                              setEditReturnRegion(state)
                              setEditReturnZip(zip)
                              setEditReturnCountry(country)
                            }
                          }}
                          className="input"
                          placeholder="Start typing an address…"
                        />
                      </Box>
                      <Stack direction="row" spacing={2}>
                        <Box sx={{ flex: 1 }}>
                          <TextField size="small" fullWidth label={<>Address Line 2 <span style={{fontWeight:400,color:'var(--text-muted)',fontSize:10}}>(unit, suite…)</span></>} placeholder="e.g. Suite 400" value={editCompanyAddress2} onChange={e => {
                            setEditCompanyAddress2(e.target.value)
                            if (editSameAsCompanyAddress) setEditReturnAddress2(e.target.value)
                          }} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <TextField size="small" fullWidth label="City" placeholder="Auto-filled" value={editCompanyCity} onChange={e => {
                            setEditCompanyCity(e.target.value)
                            if (editSameAsCompanyAddress) setEditCompanyCity(e.target.value)
                          }} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <TextField size="small" fullWidth label="ZIP / Postal Code" placeholder="Auto-filled" value={editCompanyZip} onChange={e => {
                            setEditCompanyZip(e.target.value)
                            if (editSameAsCompanyAddress) setEditCompanyZip(e.target.value)
                          }} />
                        </Box>
                      </Stack>
                    </Box>

                    <Stack direction="row" spacing={2} sx={{ mt: 1.5 }}>
                      <Box sx={{ flex: 1 }}>
                        <TextField size="small" fullWidth label="Country Code" value={editCompanyCountry} onChange={e => {
                          setEditCompanyCountry(e.target.value)
                          if (editSameAsCompanyAddress) setEditReturnCountry(e.target.value)
                        }} />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <FormControl size="small" fullWidth>
                          <InputLabel>State</InputLabel>
                          <Select label="State" value={editCompanyRegion} onChange={e => {
                            setEditCompanyRegion(e.target.value as string)
                            if (editSameAsCompanyAddress) setEditReturnRegion(e.target.value as string)
                          }}>
                            <MenuItem value=''>-- Select state --</MenuItem>
                            {US_STATES.map(([v,l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </Box>
                    </Stack>

                    {(selectedCompany.company_type || '').toLowerCase() === 'vendor' && (
                      <Box sx={{ mt: 2, borderTop: '1px solid var(--border-light)', pt: 2 }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={editSameAsCompanyAddress}
                              onChange={e => {
                                const checked = e.target.checked
                                setEditSameAsCompanyAddress(checked)
                                if (checked) {
                                  setEditReturnAddress1(editCompanyAddress1)
                                  setEditReturnAddress2(editCompanyAddress2)
                                  setEditReturnCity(editCompanyCity)
                                  setEditReturnRegion(editCompanyRegion)
                                  setEditReturnZip(editCompanyZip)
                                  setEditReturnCountry(editCompanyCountry)
                                }
                              }}
                            />
                          }
                          label={<strong>Same as company address</strong>}
                          sx={{ mb: 1.5 }}
                        />
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="caption" sx={{ mb: 0.5, display: 'block' }}>Return Address Line 1 *</Typography>
                          <AddressAutocomplete
                            value={editReturnAddress1}
                            onChange={val => {
                              setEditReturnAddress1(val)
                              setIsManageFormDirty(true)
                              setEditSameAsCompanyAddress(false)
                            }}
                            onSelect={({ address1, city, state, zip, country }) => {
                              setEditReturnAddress1(address1)
                              setEditReturnCity(city)
                              setEditReturnRegion(state)
                              setEditReturnZip(zip)
                              setEditReturnCountry(country)
                              setEditSameAsCompanyAddress(false)
                              setIsManageFormDirty(true)
                            }}
                            className="input"
                            placeholder="Start typing return address…"
                          />
                        </Box>

                        <Stack direction="row" spacing={2} sx={{ mt: 1.5 }}>
                          <Box sx={{ flex: 1 }}>
                            <TextField size="small" fullWidth label={<>Return Address Line 2 <span style={{fontWeight:400,color:'var(--text-muted)',fontSize:10}}>(unit, suite…)</span></>} placeholder="e.g. Suite 400" value={editReturnAddress2} onChange={e => {
                              setEditReturnAddress2(e.target.value)
                              setEditSameAsCompanyAddress(false)
                            }} />
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <TextField size="small" fullWidth label="Return City" placeholder="Auto-filled" value={editReturnCity} onChange={e => {
                              setEditReturnCity(e.target.value)
                              setEditSameAsCompanyAddress(false)
                            }} />
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <TextField size="small" fullWidth label="Return ZIP / Postal Code" placeholder="Auto-filled" value={editReturnZip} onChange={e => {
                              setEditReturnZip(e.target.value)
                              setEditSameAsCompanyAddress(false)
                            }} />
                          </Box>
                        </Stack>

                        <Stack direction="row" spacing={2} sx={{ mt: 1.5 }}>
                          <Box sx={{ flex: 1 }}>
                            <TextField size="small" fullWidth label="Return Country Code" placeholder="USA" value={editReturnCountry} onChange={e => {
                              setEditReturnCountry(e.target.value)
                              setEditSameAsCompanyAddress(false)
                            }} />
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <FormControl size="small" fullWidth>
                              <InputLabel>Return State</InputLabel>
                              <Select label="Return State" value={editReturnRegion} onChange={e => {
                                setEditReturnRegion(e.target.value as string)
                                setEditSameAsCompanyAddress(false)
                              }}>
                                <MenuItem value=''>-- Select state --</MenuItem>
                                {US_STATES.map(([v,l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
                              </Select>
                            </FormControl>
                          </Box>
                        </Stack>
                      </Box>
                    )}

                    {/* Vendor: Integration Mode */}
                    {(selectedCompany.company_type || '').toLowerCase() === 'vendor' && (
                      <Box sx={{ borderTop: '1px solid var(--border-light)', pt: 1.5, mt: 1 }}>
                        <Typography variant="caption" sx={{ mb: 1, display: 'block' }}>Integration Mode</Typography>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                          {(['api','manual'] as const).map(mode => (
                            <button key={mode} type='button' onClick={() => {
                              setIsManageFormDirty(true)
                              if (editIntegrationMode === mode) {
                                if (mode === 'api') {
                                  setEditIntegrationMode('')
                                } else if (mode === 'manual') {
                                  const isEmpty = (editDailyEmailTime === '08:00' || !editDailyEmailTime) && !editDailyEmailTime2 && editOrderDigestEmails.length === 0
                                  if (isEmpty) {
                                    setEditIntegrationMode('')
                                  }
                                }
                              } else {
                                setEditIntegrationMode(mode)
                              }
                            }}
                              style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: `1.5px solid ${editIntegrationMode === mode ? 'var(--accent)' : 'var(--border)'}`, background: editIntegrationMode === mode ? 'rgba(99,102,241,.12)' : 'var(--bg-elevated)', color: editIntegrationMode === mode ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                              {mode === 'api' ? '🔌 API' : '📋 Manual'}
                            </button>
                          ))}
                        </div>
                        {editIntegrationMode === 'manual' && (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            <Stack direction="row" spacing={2}>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}><AccessTimeIcon sx={{ fontSize: 11 }} /> First Send Time</Typography>
                                <AmPmTimePicker value={editDailyEmailTime} onChange={val => { setEditDailyEmailTime(val); setIsManageFormDirty(true); }} />
                              </Box>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}><AccessTimeIcon sx={{ fontSize: 11 }} /> Second Send Time <span style={{fontWeight:400,color:'var(--text-muted)',fontSize:10}}>(optional)</span></Typography>
                                <AmPmTimePicker value={editDailyEmailTime2} onChange={val => { setEditDailyEmailTime2(val); setIsManageFormDirty(true); }} allowEmpty />
                              </Box>
                            </Stack>
                            <Box>
                              <Typography variant="caption" sx={{ mb: 0.5, display: 'block' }}>Additional Automated Digest Recipients</Typography>
                              <Stack direction="row" spacing={1}>
                                <TextField
                                  size="small" fullWidth
                                  type="email"
                                  placeholder="e.g. sales@vendor.com"
                                  value={editNewDigestEmail}
                                  onChange={e => setEditNewDigestEmail(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddEditDigestEmail(); } }}
                                />
                                <Button
                                  type="button"
                                  variant="contained"
                                  size="small"
                                  onClick={handleAddEditDigestEmail}
                                >
                                  + Add
                                </Button>
                              </Stack>
                              {editOrderDigestEmails.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6, maxHeight: 120, overflowY: 'auto', background: 'var(--bg-elevated)', borderRadius: 6, padding: 6, border: '1px solid var(--border)' }}>
                                  {editOrderDigestEmails.map(email => (
                                    <div key={email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', padding: '4px 8px', borderRadius: 4, fontSize: 12, border: '1px solid var(--border-light)' }}>
                                      <span style={{ color: 'var(--text-primary)' }}>{email}</span>
                                      <Button
                                        size="small"
                                        color="error"
                                        onClick={() => handleRemoveEditDigestEmail(email)}
                                        sx={{ fontSize: 11, minWidth: 'auto', p: '0 4px' }}
                                      >
                                        Remove
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </Box>
                            <Typography variant="caption" color="text.secondary">Order digest emailed daily to the configured recipients at these UTC times.</Typography>
                          </Box>
                        )}
                      </Box>
                    )}

                    <Box sx={{ mt: 1.5 }}>
                      <Typography variant="caption" sx={{ mb: 0.5, display: 'block' }}>Allowed Sales Channels</Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
                        {[
                          { val: 'online_dtc', lbl: 'Online DTC' },
                          { val: 'bulk_po', lbl: 'Bulk PO' },
                          { val: 'owned_channel', lbl: 'Owned Channel' },
                          { val: 'buyer_storefront', lbl: 'Buyer Storefront' },
                          { val: 'marketplace', lbl: 'Marketplace' },
                          { val: 'retail_pos', lbl: 'Retail POS' },
                        ].map(ch => (
                          <FormControlLabel
                            key={ch.val}
                            control={
                              <Checkbox
                                size="small"
                                checked={editCompanyAllowedChannels.includes(ch.val)}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setEditCompanyAllowedChannels([...editCompanyAllowedChannels, ch.val])
                                  } else {
                                    setEditCompanyAllowedChannels(editCompanyAllowedChannels.filter(x => x !== ch.val))
                                  }
                                }}
                              />
                            }
                            label={ch.lbl}
                            sx={{ '& .MuiFormControlLabel-label': { fontSize: 12 } }}
                          />
                        ))}
                      </Box>
                    </Box>

                    <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <FormControlLabel
                        control={<Checkbox checked={editCompanyIsParent} onChange={e => setEditCompanyIsParent(e.target.checked)} />}
                        label={<strong>Mark as a Parent Company</strong>}
                      />
                      <FormControlLabel
                        control={<Checkbox checked={editCompanyAllowPersonalEmailException} onChange={e => setEditCompanyAllowPersonalEmailException(e.target.checked)} />}
                        label={<strong>Allow personal email domain exception</strong>}
                      />
                      {(selectedCompany.company_type || '').toLowerCase() === 'vendor' && (
                        <FormControlLabel
                          control={<Checkbox checked={editMapPricingEnforced} onChange={e => setEditMapPricingEnforced(e.target.checked)} />}
                          label={<strong>Enforce MAP Pricing</strong>}
                        />
                      )}
                    </Box>

                    <Box sx={{ mt: 1.5 }}>
                      <FormControl size="small" fullWidth>
                        <InputLabel>Parent Company (If child)</InputLabel>
                        <Select label="Parent Company (If child)" value={editCompanyParentId} onChange={e => setEditCompanyParentId(e.target.value as string)} disabled={editCompanyIsParent}>
                          <MenuItem value="">Select one</MenuItem>
                          {companiesList.filter((c: any) => c.is_parent && c.id !== selectedCompany.id).map((c: any) => (
                            <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>

                    <Box sx={{ mt: 2, display: 'flex', gap: 1.5, justifyContent: 'flex-end', alignItems: 'center' }}>
                      {isEditFormDirty() && <Typography variant="caption" sx={{ color: 'var(--amber)' }}>Unsaved changes</Typography>}
                      <Button type="submit" variant="contained">Save Profile Changes</Button>
                    </Box>
                  </form>
                </div>

                {/* Governance & Capabilities */}
                <Box sx={{ borderLeft: '1px solid var(--border-light)', pl: 3 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'var(--accent)' }}>Assigned Capabilities</Typography>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '240px', overflowY: 'auto', marginBottom: 16, background: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                    {(!selectedCompany.capabilities || selectedCompany.capabilities.length === 0) ? (
                      <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', py: 2.5 }}>No capabilities assigned</Typography>
                    ) : (
                      selectedCompany.capabilities.map((cap: any) => {
                        const info = getCapabilityInfo(cap.code)
                        return (
                          <div key={cap.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: '4px' }}>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{info.name}</div>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)' }} className="mono">{cap.code}</div>
                            </div>
                            <Button size="small" color="error" sx={{ minWidth: 'auto', p: '2px 6px', fontSize: 11 }} onClick={() => handleRemoveCapability(cap.code)}>Remove</Button>
                          </div>
                        )
                      })
                    )}
                  </div>

                  <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'var(--accent)' }}>Assign New Capability</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Stack direction="row" spacing={1.5}>
                      {(() => {
                        const availableCaps = allCapabilitiesList
                          .filter((cap: any) => !selectedCompany.capabilities?.some((c: any) => c.code === cap.code))
                          .filter((cap: any) => isCapabilityAllowedForCompany(cap.code, selectedCompany.company_type, editBuyerType))

                        return (
                          <FormControl size="small" sx={{ flex: 1 }}>
                            <InputLabel>Capability</InputLabel>
                            <Select label="Capability" value={selectedCapabilityCode} onChange={e => setSelectedCapabilityCode(e.target.value as string)}>
                              <MenuItem value="">{availableCaps.length === 0 ? (allCapabilitiesList.length === 0 ? 'Loading capabilities...' : 'No additional capabilities available') : 'Select one'}</MenuItem>
                              {availableCaps.map((cap: any) => {
                                const info = getCapabilityInfo(cap.code)
                                return (
                                  <MenuItem key={cap.id} value={cap.code}>{info.name}</MenuItem>
                                )
                              })}
                            </Select>
                          </FormControl>
                        )
                      })()}
                      <Button variant="contained" onClick={() => {
                        handleAssignCapability(selectedCapabilityCode)
                        setSelectedCapabilityCode('')
                      }} disabled={!selectedCapabilityCode}>Assign</Button>
                    </Stack>
                    {selectedCapabilityCode && (
                      <div style={{ padding: 12, borderRadius: 6, border: '1px solid var(--border-light)', background: 'rgba(255,255,255,0.02)', fontSize: 12 }}>
                        <div style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: 4 }}>
                          {getCapabilityInfo(selectedCapabilityCode).name}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                          {getCapabilityInfo(selectedCapabilityCode).desc}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6, fontFamily: 'monospace' }}>
                          Permission Code: {selectedCapabilityCode}
                        </div>
                      </div>
                    )}
                  </Box>

                  {(selectedCompany.company_type || '').toLowerCase() === 'vendor' && (
                    <Box sx={{ borderTop: '1px solid var(--border-light)', pt: 2.5, mt: 2.5 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        MAP Pricing Exceptions
                      </Typography>

                      {/* List of exceptions */}
                      <div style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {mapExceptionsLoading ? (
                          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', py: 1.5 }}>Loading MAP exceptions...</Typography>
                        ) : mapExceptions.length === 0 ? (
                          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', py: 1.5 }}>No active MAP exceptions</Typography>
                        ) : (
                          mapExceptions.map((exc: any) => {
                            const buyerName = companiesList.find((c: any) => c.id === exc.buyer_company_reference)?.name || 'Global / All Buyers'
                            return (
                              <div key={exc.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: 6, padding: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>SKU: {exc.sku}</div>
                                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Buyer: {buyerName}</div>
                                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Min Price: ${exc.approved_minimum_price}</div>
                                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{exc.start_date} to {exc.end_date}</div>
                                </div>
                                <Button size="small" color="error" variant="contained" sx={{ minWidth: 'auto', p: '4px 8px', fontSize: 11 }} onClick={() => handleDeleteMapException(exc.id)}>Delete</Button>
                              </div>
                            )
                          })
                        )}
                      </div>

                      {/* Add exception form */}
                      <form onSubmit={handleAddMapException} style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', borderRadius: 8, padding: 12 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>Add New MAP Exception</Typography>
                        <Stack direction="row" spacing={2}>
                          <Box sx={{ flex: 1 }}>
                            <TextField size="small" fullWidth label="SKU" placeholder="e.g. iPhone SKU" required value={newExcSku} onChange={e => setNewExcSku(e.target.value)} />
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <FormControl size="small" fullWidth>
                              <InputLabel>Buyer Company</InputLabel>
                              <Select label="Buyer Company" value={newExcBuyerId} onChange={e => setNewExcBuyerId(e.target.value as string)}>
                                <MenuItem value="">All Buyers (Global)</MenuItem>
                                {companiesList.filter((c: any) => (c.company_type || '').toLowerCase() === 'buyer').map((c: any) => (
                                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Box>
                        </Stack>
                        <TextField size="small" fullWidth label="Approved Minimum Price ($)" type="number" inputProps={{ step: '0.01', min: '0' }} placeholder="0.00" required value={newExcMinPrice} onChange={e => setNewExcMinPrice(e.target.value)} />
                        <Stack direction="row" spacing={2}>
                          <Box sx={{ flex: 1 }}>
                            <TextField size="small" fullWidth label="Start Date" type="date" required value={newExcStartDate} onChange={e => setNewExcStartDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <TextField size="small" fullWidth label="End Date" type="date" required value={newExcEndDate} onChange={e => setNewExcEndDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                          </Box>
                        </Stack>
                        <Button type="submit" variant="contained" size="small" sx={{ alignSelf: 'flex-end', mt: 0.5 }}>Add Exception</Button>
                      </form>
                    </Box>
                  )}
                </Box>
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* Unsaved changes confirmation for Manage */}
      <Dialog open={showConfirmCloseManage} onClose={() => setShowConfirmCloseManage(false)}>
        <DialogTitle>Unsaved Changes</DialogTitle>
        <DialogContent>
          <Typography>
            Your progress will be lost because you have unsaved changes. Are you sure you want to close?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmCloseManage(false)}>No, Keep Editing</Button>
          <Button color="error" variant="contained" onClick={() => { setShowCompanyDetailsModal(false); setSelectedCompany(null); setErrorMsg(null); setShowConfirmCloseManage(false); setIsManageFormDirty(false); }}>Yes, Discard</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

