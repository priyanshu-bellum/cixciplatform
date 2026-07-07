import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import { Building, Building2, Users, Plus, ShieldCheck, AlertCircle, Upload, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/apiClient'
import AddressAutocomplete from '../components/AddressAutocomplete'

const US_STATES = [
  ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],
  ['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['FL','Florida'],['GA','Georgia'],
  ['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],
  ['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],
  ['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],['MO','Missouri'],
  ['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],
  ['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],
  ['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],
  ['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],
  ['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming'],
  ['OTHER','Other / International'],
]

// Status Badge Classes
const STATUS_BADGE: Record<string, string> = {
  active: 'badge-green', draft: 'badge-muted', suspended: 'badge-red',
}

const TYPE_BADGE: Record<string, string> = {
  cixci_internal: 'badge-purple', buyer: 'badge-blue', vendor: 'badge-amber', manufacturer: 'badge-muted',
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
  if (companyType === 'cixci_internal') return true;

  if (companyType === 'vendor') {
    const allowedPrefixes = [
      'catalog.product.',
      'media.asset.',
      'analytics.metrics.',
      'analytics.summary.',
      'tenant.relationship.read',
      'tenant.relationship.list',
    ];
    return allowedPrefixes.some(pref => code.startsWith(pref));
  }

  if (companyType === 'buyer') {
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
    }
  }

  const handleRemoveEditDigestEmail = (email: string) => {
    setEditOrderDigestEmails(editOrderDigestEmails.filter(e => e !== email))
  }

  const isEditFormDirty = () => {
    if (!selectedCompany) return false
    let meta: any = {}
    try {
      meta = selectedCompany.external_id ? JSON.parse(selectedCompany.external_id) : {}
    } catch (_) {}

    let origR1 = '', origR2 = '', origCity = '', origZip = '', origRegion = '', origCountry = ''
    try {
      if (selectedCompany.return_address && selectedCompany.return_address.startsWith('{')) {
        const parsed = JSON.parse(selectedCompany.return_address)
        origR1 = parsed.address_line1 || parsed.address1 || ''
        origR2 = parsed.address_line2 || parsed.address2 || ''
        origCity = parsed.city || ''
        origRegion = parsed.region_code || parsed.region || ''
        origZip = parsed.zip || ''
        origCountry = parsed.country_code || parsed.country || ''
      } else {
        origR1 = selectedCompany.return_address || ''
      }
    } catch (_) {
      origR1 = selectedCompany.return_address || ''
    }

    const channelsMatch = (
      Array.isArray(editCompanyAllowedChannels) &&
      Array.isArray(selectedCompany.allowed_channels) &&
      editCompanyAllowedChannels.length === selectedCompany.allowed_channels.length &&
      editCompanyAllowedChannels.every((x: string) => selectedCompany.allowed_channels.includes(x))
    )

    const digestEmailsMatch = (
      Array.isArray(editOrderDigestEmails) &&
      Array.isArray(selectedCompany.order_digest_emails) &&
      editOrderDigestEmails.length === selectedCompany.order_digest_emails.length &&
      editOrderDigestEmails.every((x: string) => selectedCompany.order_digest_emails.includes(x))
    )

    return (
      editCompanyName !== (selectedCompany.name || '') ||
      editCompanyDisplayName !== (selectedCompany.display_name || '') ||
      editCompanyStatus !== (selectedCompany.status || '') ||
      editCompanyWebsite !== (selectedCompany.website || '') ||
      editCompanyEmailDomain !== (selectedCompany.business_email_domain || '') ||
      editCompanyContactName !== (selectedCompany.primary_contact_name || '') ||
      editCompanyContactEmail !== (selectedCompany.primary_contact_email || '') ||
      editCompanyPhone !== (selectedCompany.phone_number || '') ||
      editCompanyAddress1 !== (selectedCompany.address_line1 || '') ||
      editCompanyAddress2 !== (selectedCompany.address_line2 || '') ||
      editCompanyIsParent !== (selectedCompany.is_parent || false) ||
      editCompanyParentId !== (selectedCompany.parent_company || '') ||
      editCompanyCountry !== (selectedCompany.country_code || 'USA') ||
      editCompanyRegion !== (selectedCompany.region_code || '') ||
      editCompanyCity !== (meta.city || '') ||
      editCompanyZip !== (meta.zip || '') ||
      editBuyerType !== (meta.buyer_type || '') ||
      editVendorType !== (meta.vendor_type || '') ||
      editMapPricingEnforced !== (selectedCompany.map_pricing_enforced || false) ||
      editIntegrationMode !== (meta.integration_mode || '') ||
      editDailyEmailTime !== (meta.daily_email_time || '08:00') ||
      editDailyEmailTime2 !== (meta.daily_email_time_2 || '') ||
      editBuyerPricingMode !== (selectedCompany.buyer_pricing_mode || 'standard') ||
      String(editCommissionPercentage) !== String(selectedCompany.commission_percentage !== null && selectedCompany.commission_percentage !== undefined ? selectedCompany.commission_percentage : '14.00') ||
      editReturnAddress1 !== origR1 ||
      editReturnAddress2 !== origR2 ||
      editReturnCity !== origCity ||
      editReturnZip !== origZip ||
      editReturnRegion !== origRegion ||
      editReturnCountry !== origCountry ||
      !digestEmailsMatch ||
      !channelsMatch ||
      editLogoFile !== null
    )
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
    queryFn: () => api.get('/tenant/companies/').then(r => r.data).catch(() => []),
    enabled: isAdmin && (activeTab === 'companies' || activeTab === 'onboarding' || showOnboardingModal || showCompanyDetailsModal),
  })

  const { data: entitiesData, refetch: refetchEntities } = useQuery({
    queryKey: ['admin-entities'],
    queryFn: () => api.get('/tenant/entities/').then(r => r.data).catch(() => []),
    enabled: isAdmin && (activeTab === 'entities' || activeTab === 'users' || showEntityModal || showUserModal),
  })

  const { data: usersData, refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/tenant/users/').then(r => r.data).catch(() => []),
    enabled: isAdmin && activeTab === 'users',
  })

  const { data: allCapabilitiesData } = useQuery({
    queryKey: ['admin-capabilities'],
    queryFn: () => api.get('/tenant/capabilities/').then(r => r.data).catch(() => []),
    enabled: isAdmin,
  })

  const hasChildOnboardingCapability = user?.is_cixci_admin || (user?.capabilities && Array.isArray(user.capabilities) && user.capabilities.some((c: any) => c.code?.startsWith('tenant.child_onboarding')))

  const { data: onboardingRequestsData, refetch: refetchOnboardingRequests } = useQuery({
    queryKey: ['onboarding-requests'],
    queryFn: () => api.get('/tenant/child-onboarding-requests/').then(r => r.data).catch(() => []),
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
        map_pricing_enforced: selectedCompany.company_type === 'vendor' ? editMapPricingEnforced : false,
        buyer_pricing_mode: editBuyerPricingMode,
        commission_percentage: editBuyerPricingMode === 'custom' ? parseFloat(editCommissionPercentage) : (editBuyerPricingMode === 'no_commission' ? 0.00 : 14.00),
        return_address: selectedCompany.company_type === 'vendor' ? JSON.stringify({
          address_line1: editReturnAddress1 || '',
          address_line2: editReturnAddress2 || '',
          city: editReturnCity || '',
          region_code: editReturnRegion || '',
          zip: editReturnZip || '',
          country_code: editReturnCountry || '',
        }) : '',
        order_digest_emails: selectedCompany.company_type === 'vendor' && editIntegrationMode === 'manual' ? editOrderDigestEmails : [],
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
      refetchCompanies()
      setErrorMsg(null)
      toast.success('Company profile changes saved successfully!')
    } catch (err: any) {
      setErrorMsg(getErrorMessage(err))
      toast.error('Failed to save profile changes.')
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

  const [mapExceptions, setMapExceptions] = useState<any[]>([])
  const [mapExceptionsLoading, setMapExceptionsLoading] = useState(false)
  const [newExcSku, setNewExcSku] = useState('')
  const [newExcBuyerId, setNewExcBuyerId] = useState('')
  const [newExcMinPrice, setNewExcMinPrice] = useState('')
  const [newExcStartDate, setNewExcStartDate] = useState('')
  const [newExcEndDate, setNewExcEndDate] = useState('')

  useEffect(() => {
    if (selectedCompany && selectedCompany.company_type === 'vendor') {
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
      toast.success('MAP pricing exception added successfully!')
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add MAP exception.')
    }
  }

  const handleDeleteMapException = async (id: string) => {
    if (!selectedCompany) return
    try {
      await api.delete(`/pricing/exceptions/${id}/`)
      const res = await api.get(`/pricing/exceptions/?vendor_company_reference=${selectedCompany.id}`)
      setMapExceptions(res.data.results || res.data || [])
      toast.success('MAP exception deleted.')
    } catch (err: any) {
      toast.error('Failed to delete exception.')
    }
  }

  return (
    <div>
      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(4, 6, 10, 0.8);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(5px);
        }
        .modal-content {
          background: var(--bg-surface);
          border: 1px solid var(--border-light);
          border-radius: var(--radius);
          width: 500px;
          max-width: 90%;
          padding: 24px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
          animation: modalEnter 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes modalEnter {
          from { opacity: 0; transform: scale(0.96) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      {/* Settings Navigation Tabs */}
      <div className="tabs">
        <div className={`tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
          Profile & Org
        </div>
        {isAdmin && (
          <>
            <div className={`tab ${activeTab === 'companies' ? 'active' : ''}`} onClick={() => setActiveTab('companies')}>
              Companies
            </div>
            <div className={`tab ${activeTab === 'entities' ? 'active' : ''}`} onClick={() => setActiveTab('entities')}>
              Entities
            </div>
            <div className={`tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
              User Directory
            </div>
          </>
        )}
        {hasChildOnboardingCapability && (
          <div className={`tab ${activeTab === 'onboarding' ? 'active' : ''}`} onClick={() => setActiveTab('onboarding')}>
            Child Onboarding
          </div>
        )}
      </div>

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
                      <span className="badge badge-purple" style={{ gap: '4px' }}><ShieldCheck size={10} /> CIXCI Admin</span>
                    ) : (
                      <span className="badge badge-blue">Platform User</span>
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
                <Plus size={14} /> Request Child Company
              </button>
            )}
          </div>
          <div className="table-wrap">
            {onboardingRequestsList.length === 0 ? (
              <div className="empty-state">
                <Building2 size={40} />
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
              <Plus size={14} /> Add Company
            </button>
          </div>
          <div className="table-wrap">
            {companiesList.length === 0 ? (
              <div className="empty-state">
                <Building size={40} />
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
                        <span className={`badge ${TYPE_BADGE[c.company_type] ?? 'badge-muted'}`}>
                          {c.company_type?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[c.status] ?? 'badge-muted'}`}>{c.status}</span>
                      </td>
                      <td>
                        {c.is_parent ? (
                          <span className="badge badge-purple">Parent Company</span>
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
                          setEditBuyerPricingMode(c.buyer_pricing_mode || 'standard')
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
                              }).catch(() => {})
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
              <Plus size={14} /> Add Entity
            </button>
          </div>
          <div className="table-wrap">
            {entitiesList.length === 0 ? (
              <div className="empty-state">
                <Building2 size={40} />
                <div>No entities found</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Entity Name</th><th>Parent Company</th><th>Status</th><th>Country</th>
                  </tr>
                </thead>
                <tbody>
                  {entitiesList.map((e: any) => (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{e.name}</td>
                      <td>{e.company_name}</td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[e.status] ?? 'badge-muted'}`}>{e.status}</span>
                      </td>
                      <td>{e.country_code || '—'}</td>
                    </tr>
                  ))}
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
              <Plus size={14} /> Add User
            </button>
          </div>
          <div className="table-wrap">
            {usersList.length === 0 ? (
              <div className="empty-state">
                <Users size={40} />
                <div>No users found</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Name</th><th>Email</th><th>Company & Entity Scope</th><th>Access</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u: any) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{u.first_name} {u.last_name}</td>
                      <td className="mono" style={{ fontSize: 12 }}>{u.email}</td>
                      <td>
                        <div>{u.company_name || 'System'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.entity_name || 'CIXCI Scope'}</div>
                      </td>
                      <td>
                        {u.is_cixci_admin ? (
                          <span className="badge badge-purple" style={{ gap: '4px' }}><ShieldCheck size={10} /> CIXCI Admin</span>
                        ) : (
                          <span className="badge badge-blue">Org User</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ADD COMPANY MODAL */}
      {showCompanyModal && (
        <div className="modal-overlay" onClick={e => {
          if (e.target === e.currentTarget) {
            if (isCreateFormDirty()) {
              setShowConfirmCloseCreate(true)
            } else {
              setShowCompanyModal(false)
            }
          }
        }}>
          <div className="modal-content" style={{ width: '640px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Create Company Profile</h3>
            {errorMsg && (
              <div style={{ display: 'flex', gap: 8, background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid var(--red)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: 14 }}>
                <AlertCircle size={16} />
                <span style={{ fontSize: 12, lineHeight: '1.4' }}>{errorMsg}</span>
              </div>
            )}
            <form onSubmit={handleCreateCompany}>
              <div className="card-grid card-grid-2">
                <div className="form-group">
                  <label className="label">Company Legal Name</label>
                  <input
                    type="text" className="input" placeholder="e.g. Acme Corp" required
                    value={companyName}
                    onChange={e => {
                      const val = e.target.value
                      setCompanyName(val)
                      if (!companyDisplayName || companyDisplayName === companyName) {
                        setCompanyDisplayName(val)
                      }
                    }}
                    style={{
                      borderColor: companyName.trim() && companiesList.some(
                        (c: any) => c.name?.trim().toLowerCase() === companyName.trim().toLowerCase()
                      ) ? 'var(--red)' : undefined
                    }}
                  />
                  {companyName.trim() && companiesList.some(
                    (c: any) => c.name?.trim().toLowerCase() === companyName.trim().toLowerCase()
                  ) && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      marginTop: 5, fontSize: 11, color: 'var(--red)',
                      background: 'var(--red-dim)', border: '1px solid var(--red)',
                      padding: '5px 10px', borderRadius: 'var(--radius-sm)'
                    }}>
                      <AlertCircle size={11} />
                      A company with this name already exists. Each company can only be onboarded once.
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="label">Display Name</label>
                  <input type="text" className="input" placeholder="e.g. Acme Accessories" required value={companyDisplayName} onChange={e => setCompanyDisplayName(e.target.value)} />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 10 }}>
                <label className="label">Company Type / Category</label>
                <select className="input" value={companyType} onChange={e => setCompanyType(e.target.value)}>
                  <option value="">Select Company Type</option>
                  <option value="buyer">Buyer</option>
                  <option value="vendor">Vendor</option>
                  <option value="device_distributor">Device Distributor</option>
                </select>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Short name (slug) is auto-generated from the Legal Name.</div>
              </div>

              {/* Buyer / Vendor sub-type */}
              {companyType === 'buyer' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                  <div className="form-group">
                    <label className="label">Buyer Type</label>
                    <select className="input" value={companyBuyerType} onChange={e => setCompanyBuyerType(e.target.value)}>
                      <option value=''>Select Buyer Type</option>
                      <option value='mvno'>MVNO</option>
                      <option value='wireless_carrier'>Wireless Carrier</option>
                      <option value='retailer'>Retailer</option>
                      <option value='enterprise_corporate'>Enterprise/ Corporate</option>
                    </select>
                  </div>
                  <div className="card-grid card-grid-2">
                    <div className="form-group">
                      <label className="label">Buyer Pricing Mode</label>
                      <select className="input" value={companyBuyerPricingMode} onChange={e => setCompanyBuyerPricingMode(e.target.value)}>
                        <option value="standard">Standard Buyer Commission (14%)</option>
                        <option value="no_commission">No Buyer Commission (0%)</option>
                        <option value="custom">Custom Buyer Commission</option>
                      </select>
                    </div>
                    {companyBuyerPricingMode === 'custom' && (
                      <div className="form-group">
                        <label className="label">Commission Percentage (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          className="input"
                          placeholder="e.g. 10.00"
                          value={companyCommissionPercentage}
                          onChange={e => setCompanyCommissionPercentage(e.target.value)}
                          required
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
              {companyType === 'vendor' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                  <div className="form-group">
                    <label className="label">Vendor Type</label>
                    <select className="input" value={companyVendorType} onChange={e => setCompanyVendorType(e.target.value)}>
                      <option value=''>Select Vendor Type</option>
                      <option value='accessory_vendor'>Accessory Vendor</option>
                    </select>
                  </div>
                </div>
              )}
                  
              {companyType === 'vendor' && (
                <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 12, marginTop: 8 }}>
                  <div className="label" style={{ marginBottom: 8 }}>Integration Mode</div>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div className="card-grid card-grid-2">
                        <div className="form-group">
                          <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={11} /> First Send Time</label>
                          <AmPmTimePicker value={companyDailyEmailTime} onChange={setCompanyDailyEmailTime} />
                        </div>
                        <div className="form-group">
                          <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={11} /> Second Send Time <span style={{fontWeight:400,color:'var(--text-muted)',fontSize:10}}>(optional)</span></label>
                          <AmPmTimePicker value={companyDailyEmailTime2} onChange={setCompanyDailyEmailTime2} allowEmpty />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="label">Additional Automated Digest Recipients</label>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input
                            type="email"
                            className="input"
                            placeholder="e.g. sales@vendor.com"
                            value={companyNewDigestEmail}
                            onChange={e => setCompanyNewDigestEmail(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCompanyDigestEmail(); } }}
                          />
                          <button
                            type="button"
                            onClick={handleAddCompanyDigestEmail}
                            style={{
                              background: 'var(--accent)',
                              border: 'none',
                              borderRadius: 6,
                              color: '#fff',
                              padding: '0 14px',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            + Add
                          </button>
                        </div>
                        {companyOrderDigestEmails.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6, maxHeight: 120, overflowY: 'auto', background: 'var(--bg-elevated)', borderRadius: 6, padding: 6, border: '1px solid var(--border)' }}>
                            {companyOrderDigestEmails.map(email => (
                              <div key={email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', padding: '4px 8px', borderRadius: 4, fontSize: 12, border: '1px solid var(--border-light)' }}>
                                <span style={{ color: 'var(--text-primary)' }}>{email}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCompanyDigestEmail(email)}
                                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 11, fontWeight: 500 }}
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Order digest emailed daily to the configured recipients at these UTC times.</div>
                    </div>
                  )}
                </div>
              )}

              {/* Logo */}
              <div className="form-group" style={{ marginTop: 10 }}>
                <label className="label">Company Logo</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {companyLogoPreview ? (
                    <img src={companyLogoPreview} alt='Logo' style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-elevated)', padding: 3 }} />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: 6, border: '2px dashed var(--border)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><Upload size={18} /></div>
                  )}
                  <label style={{ cursor: 'pointer' }}>
                    <span className='btn btn-secondary btn-sm'><Upload size={12} /> Choose Logo</span>
                    <input type='file' accept='image/*' style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { setCompanyLogoFile(f); setCompanyLogoPreview(URL.createObjectURL(f)) } }} />
                  </label>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>PNG, JPG, WEBP or SVG</span>
                </div>
              </div>

              <div className="card-grid card-grid-2" style={{ marginTop: 10 }}>
                <div className="form-group">
                  <label className="label">Website *</label>
                  <input type="text" className="input" placeholder="e.g. https://acme.com" required value={companyWebsite} onChange={e => setCompanyWebsite(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="label">Business Email Domain *</label>
                  <input type="text" className="input" placeholder="e.g. acme.com (no gmail.com)" required value={companyEmailDomain} onChange={e => setCompanyEmailDomain(e.target.value)} />
                </div>
              </div>

              <div className="card-grid card-grid-2" style={{ marginTop: 10 }}>
                <div className="form-group">
                  <label className="label">Primary Contact Name *</label>
                  <input type="text" className="input" placeholder="John Doe" required value={companyContactName} onChange={e => setCompanyContactName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="label">Primary Contact Email *</label>
                  <input type="email" className="input" placeholder="john@acme.com" required value={companyContactEmail} onChange={e => setCompanyContactEmail(e.target.value)} />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 10 }}>
                <label className="label">Phone Number (optional)</label>
                <input type="text" className="input" placeholder="+1-555-0199" value={companyPhone} onChange={e => setCompanyPhone(e.target.value)} />
              </div>

              <div style={{ marginTop: 10 }}>
                <div className="form-group" style={{ marginBottom: 8 }}>
                  <label className="label">Address Line 1 *</label>
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
                </div>
                <div className="card-grid card-grid-3">
                  <div className="form-group">
                    <label className="label">Address Line 2 <span style={{fontWeight:400,color:'var(--text-muted)',fontSize:10}}>(unit, suite…)</span></label>
                    <input type="text" className="input" placeholder="e.g. Suite 400" value={companyAddress2} onChange={e => {
                      setCompanyAddress2(e.target.value)
                      if (companySameAsCompanyAddress) setCompanyReturnAddress2(e.target.value)
                    }} />
                  </div>
                  <div className="form-group">
                    <label className="label">City</label>
                    <input type="text" className="input" placeholder="Auto-filled" value={companyCity} onChange={e => {
                      setCompanyCity(e.target.value)
                      if (companySameAsCompanyAddress) setCompanyReturnCity(e.target.value)
                    }} />
                  </div>
                  <div className="form-group">
                    <label className="label">ZIP / Postal Code</label>
                    <input type="text" className="input" placeholder="Auto-filled" value={companyZip} onChange={e => {
                      setCompanyZip(e.target.value)
                      if (companySameAsCompanyAddress) setCompanyReturnZip(e.target.value)
                    }} />
                  </div>
                </div>
              </div>

              <div className="card-grid card-grid-3" style={{ marginTop: 10 }}>
                <div className="form-group">
                  <label className="label">Country Code</label>
                  <input type="text" className="input" value={companyCountry} onChange={e => {
                    setCompanyCountry(e.target.value)
                    if (companySameAsCompanyAddress) setCompanyReturnCountry(e.target.value)
                  }} />
                </div>
                <div className="form-group">
                  <label className="label">State</label>
                  <select className="input" value={companyRegion} onChange={e => {
                    setCompanyRegion(e.target.value)
                    if (companySameAsCompanyAddress) setCompanyReturnRegion(e.target.value)
                  }}>
                    <option value=''>— Select state —</option>
                    {US_STATES.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">External ERP ID</label>
                  <input type="text" className="input" placeholder="e.g. EXT-908" value={companyExternalId} onChange={e => setCompanyExternalId(e.target.value)} />
                </div>
              </div>

              {companyType === 'vendor' && (
                <div style={{ marginTop: 15, borderTop: '1px solid var(--border-light)', paddingTop: 15 }}>
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>
                      <input 
                        type='checkbox' 
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
                      <strong>Same as company address</strong>
                    </label>
                  </div>
                  <div className="form-group" style={{ marginBottom: 8 }}>
                    <label className="label">Return Address Line 1 *</label>
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
                  </div>

                  <div className="card-grid card-grid-3" style={{ marginTop: 10 }}>
                    <div className="form-group">
                      <label className="label">Return Address Line 2 <span style={{fontWeight:400,color:'var(--text-muted)',fontSize:10}}>(unit, suite…)</span></label>
                      <input type="text" className="input" placeholder="e.g. Suite 400" value={companyReturnAddress2} onChange={e => {
                        setCompanyReturnAddress2(e.target.value)
                        setCompanySameAsCompanyAddress(false)
                      }} />
                    </div>
                    <div className="form-group">
                      <label className="label">Return City</label>
                      <input type="text" className="input" placeholder="Auto-filled" value={companyReturnCity} onChange={e => {
                        setCompanyReturnCity(e.target.value)
                        setCompanySameAsCompanyAddress(false)
                      }} />
                    </div>
                    <div className="form-group">
                      <label className="label">Return ZIP / Postal Code</label>
                      <input type="text" className="input" placeholder="Auto-filled" value={companyReturnZip} onChange={e => {
                        setCompanyReturnZip(e.target.value)
                        setCompanySameAsCompanyAddress(false)
                      }} />
                    </div>
                  </div>

                  <div className="card-grid card-grid-2" style={{ marginTop: 10 }}>
                    <div className="form-group">
                      <label className="label">Return Country Code</label>
                      <input type="text" className="input" placeholder="USA" value={companyReturnCountry} onChange={e => {
                        setCompanyReturnCountry(e.target.value)
                        setCompanySameAsCompanyAddress(false)
                      }} />
                    </div>
                    <div className="form-group">
                      <label className="label">Return State</label>
                      <select className="input" value={companyReturnRegion} onChange={e => {
                        setCompanyReturnRegion(e.target.value)
                        setCompanySameAsCompanyAddress(false)
                      }}>
                        <option value=''>— Select state —</option>
                        {US_STATES.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="card-grid card-grid-2" style={{ marginTop: 10 }}>
                <div className="form-group">
                  <label className="label">Status</label>
                  <select className="input" value={companyStatus || 'draft'} onChange={e => setCompanyStatus(e.target.value)}>
                    <option value="draft">Draft</option>
                    <option value="active">Active (Requires full setup/admin)</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer', marginTop: 12 }}>
                    <input
                      type="checkbox"
                      checked={companyIsParent}
                      onChange={e => setCompanyIsParent(e.target.checked)}
                    />
                    <strong>Mark as a Parent Company</strong>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={allowPersonalEmailException}
                      onChange={e => setAllowPersonalEmailException(e.target.checked)}
                    />
                    <strong>Allow personal email domain exception</strong>
                  </label>
                  {companyType === 'vendor' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={companyMapPricingEnforced}
                        onChange={e => setCompanyMapPricingEnforced(e.target.checked)}
                      />
                      <strong>Enforce MAP Pricing</strong>
                    </label>
                  )}
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 10 }}>
                <label className="label">Parent Company (Optional - if not marking as parent)</label>
                <select className="input" value={companyParentId} onChange={e => setCompanyParentId(e.target.value)} disabled={companyIsParent}>
                  <option value="">Select one</option>
                  {companiesList.filter((c: any) => c.is_parent).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginTop: 12 }}>
                <label className="label" style={{ marginBottom: 6 }}>Allowed Sales Channels</label>
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
                        checked={companyAllowedChannels.includes(ch.val)}
                        onChange={e => {
                          if (e.target.checked) {
                            setCompanyAllowedChannels([...companyAllowedChannels, ch.val])
                          } else {
                            setCompanyAllowedChannels(companyAllowedChannels.filter(x => x !== ch.val))
                          }
                        }}
                      />
                      {ch.lbl}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                <button type="button" className="btn btn-secondary" onClick={() => { if (isCreateFormDirty()) setShowConfirmCloseCreate(true); else setShowCompanyModal(false) }}>Cancel</button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!!companyName.trim() && companiesList.some(
                    (c: any) => c.name?.trim().toLowerCase() === companyName.trim().toLowerCase()
                  )}
                >Create Company</button>
              </div>
            </form>

            {showConfirmCloseCreate && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(4,6,10,0.92)',
                backdropFilter: 'blur(4px)',
                zIndex: 3000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
                borderRadius: 'var(--radius)'
              }}>
                <div style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 8,
                  padding: 24,
                  maxWidth: 360,
                  textAlign: 'center',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Unsaved Changes</h4>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.4 }}>
                    Your progress will be lost because you have unsaved changes. Are you sure you want to close?
                  </p>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                    <button type='button' className="btn btn-secondary btn-sm" onClick={() => setShowConfirmCloseCreate(false)}>No, Keep Editing</button>
                    <button type='button' className="btn btn-danger btn-sm" style={{ background: 'var(--red)', borderColor: 'var(--red)', color: '#fff' }} onClick={() => { setShowCompanyModal(false); setShowConfirmCloseCreate(false) }}>Yes, Discard</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADD ENTITY MODAL */}
      {showEntityModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '540px' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Create Company Entity</h3>
            {errorMsg && (
              <div style={{ display: 'flex', gap: 8, background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid var(--red)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: 14 }}>
                <AlertCircle size={16} />
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
                <AlertCircle size={16} />
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
                <AlertCircle size={16} />
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
                <AlertCircle size={16} />
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
      {showCompanyDetailsModal && selectedCompany && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '900px', maxWidth: '96vw', maxHeight: '92vh', overflowY: 'auto', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid var(--border-light)', paddingBottom: 12 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Manage Company Profile</h3>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: {selectedCompany.id} &nbsp;·&nbsp; Type: {selectedCompany.company_type}</span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => {
                if (isEditFormDirty()) {
                  setShowConfirmCloseManage(true)
                } else {
                  setShowCompanyDetailsModal(false)
                  setSelectedCompany(null)
                  setErrorMsg(null)
                }
              }}>Close</button>
            </div>

            {errorMsg && (
              <div style={{ display: 'flex', gap: 8, background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid var(--red)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: 14 }}>
                <AlertCircle size={16} />
                <span style={{ fontSize: 12, lineHeight: '1.4' }}>{errorMsg}</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
              {/* Profile Editor */}
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--accent)' }}>Edit Profile</h4>
                <form onSubmit={handleUpdateCompany}>
                  {/* Company / Buyer / Vendor sub-type */}
                  {selectedCompany.company_type === 'buyer' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10 }}>
                      <div className="form-group">
                        <label className="label">Buyer Type</label>
                        <select className="input" value={editBuyerType} onChange={e => setEditBuyerType(e.target.value)}>
                          <option value=''>Select Buyer Type</option>
                          <option value='mvno'>MVNO</option>
                          <option value='wireless_carrier'>Wireless Carrier</option>
                          <option value='retailer'>Retailer</option>
                          <option value='enterprise_corporate'>Enterprise/ Corporate</option>
                        </select>
                      </div>
                      <div className="card-grid card-grid-2">
                        <div className="form-group">
                          <label className="label">Buyer Pricing Mode</label>
                          <select className="input" value={editBuyerPricingMode} onChange={e => setEditBuyerPricingMode(e.target.value)}>
                            <option value="standard">Standard Buyer Commission (14%)</option>
                            <option value="no_commission">No Buyer Commission (0%)</option>
                            <option value="custom">Custom Buyer Commission</option>
                          </select>
                        </div>
                        {editBuyerPricingMode === 'custom' && (
                          <div className="form-group">
                            <label className="label">Commission Percentage (%)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              className="input"
                              placeholder="e.g. 10.00"
                              value={editCommissionPercentage}
                              onChange={e => setEditCommissionPercentage(e.target.value)}
                              required
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {selectedCompany.company_type === 'vendor' && (
                    <div className="form-group" style={{ marginBottom: 10 }}>
                      <label className="label">Vendor Type</label>
                      <select className="input" value={editVendorType} onChange={e => setEditVendorType(e.target.value)}>
                        <option value=''>Select Vendor Type</option>
                        <option value='accessory_vendor'>Accessory Vendor</option>
                      </select>
                    </div>
                  )}
                  {/* Logo */}
                  <div className="form-group" style={{ marginBottom: 10 }}>
                    <label className="label">Company Logo</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {editLogoPreview ? (
                        <img src={editLogoPreview} alt='Logo' style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-elevated)', padding: 3 }} />
                      ) : (
                        <div style={{ width: 48, height: 48, borderRadius: 6, border: '2px dashed var(--border)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><Upload size={18} /></div>
                      )}
                      <label style={{ cursor: 'pointer' }}>
                        <span className='btn btn-secondary btn-sm'><Upload size={12} /> Choose Logo</span>
                        <input type='file' accept='image/*' style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { setEditLogoFile(f); setEditLogoPreview(URL.createObjectURL(f)) } }} />
                      </label>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>PNG, JPG, WEBP or SVG</span>
                    </div>
                  </div>
                  <div className="card-grid card-grid-2">
                    <div className="form-group">
                      <label className="label">Company Legal Name</label>
                      <input type="text" className="input" required value={editCompanyName} onChange={e => {
                        const val = e.target.value
                        setEditCompanyName(val)
                        if (!editCompanyDisplayName || editCompanyDisplayName === editCompanyName) {
                          setEditCompanyDisplayName(val)
                        }
                      }} />
                    </div>
                    <div className="form-group">
                      <label className="label">Display Name</label>
                      <input type="text" className="input" required value={editCompanyDisplayName} onChange={e => setEditCompanyDisplayName(e.target.value)} />
                    </div>
                  </div>

                  <div className="card-grid card-grid-2" style={{ marginTop: 10 }}>
                    <div className="form-group">
                      <label className="label">Status</label>
                      <select className="input" value={editCompanyStatus} onChange={e => setEditCompanyStatus(e.target.value)}>
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="label">Business Email Domain *</label>
                      <input type="text" className="input" placeholder="e.g. corp.com (no gmail.com)" required value={editCompanyEmailDomain} onChange={e => setEditCompanyEmailDomain(e.target.value)} />
                    </div>
                  </div>

                  <div className="card-grid card-grid-2" style={{ marginTop: 10 }}>
                    <div className="form-group">
                      <label className="label">Website *</label>
                      <input type="text" className="input" placeholder="e.g. https://corp.com" required value={editCompanyWebsite} onChange={e => setEditCompanyWebsite(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="label">Primary Contact Name *</label>
                      <input type="text" className="input" required value={editCompanyContactName} onChange={e => setEditCompanyContactName(e.target.value)} />
                    </div>
                  </div>

                  <div className="card-grid card-grid-2" style={{ marginTop: 10 }}>
                    <div className="form-group">
                      <label className="label">Primary Contact Email *</label>
                      <input type="email" className="input" required value={editCompanyContactEmail} onChange={e => setEditCompanyContactEmail(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="label">Phone Number (optional)</label>
                      <input type="text" className="input" placeholder="+1-555-0199" value={editCompanyPhone} onChange={e => setEditCompanyPhone(e.target.value)} />
                    </div>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <div className="form-group" style={{ marginBottom: 8 }}>
                      <label className="label">Address Line 1 *</label>
                      <AddressAutocomplete
                        value={editCompanyAddress1}
                        onChange={val => {
                          setEditCompanyAddress1(val)
                          if (editSameAsCompanyAddress) setEditReturnAddress1(val)
                        }}
                        onSelect={({ address1, city, state, zip, country }) => {
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
                    </div>
                    <div className="card-grid card-grid-3">
                      <div className="form-group">
                        <label className="label">Address Line 2 <span style={{fontWeight:400,color:'var(--text-muted)',fontSize:10}}>(unit, suite…)</span></label>
                        <input type="text" className="input" placeholder="e.g. Suite 400" value={editCompanyAddress2} onChange={e => {
                          setEditCompanyAddress2(e.target.value)
                          if (editSameAsCompanyAddress) setEditReturnAddress2(e.target.value)
                        }} />
                      </div>
                      <div className="form-group">
                        <label className="label">City</label>
                        <input type="text" className="input" placeholder="Auto-filled" value={editCompanyCity} onChange={e => {
                          setEditCompanyCity(e.target.value)
                          if (editSameAsCompanyAddress) setEditCompanyCity(e.target.value)
                        }} />
                      </div>
                      <div className="form-group">
                        <label className="label">ZIP / Postal Code</label>
                        <input type="text" className="input" placeholder="Auto-filled" value={editCompanyZip} onChange={e => {
                          setEditCompanyZip(e.target.value)
                          if (editSameAsCompanyAddress) setEditCompanyZip(e.target.value)
                        }} />
                      </div>
                    </div>
                  </div>

                  <div className="card-grid card-grid-3" style={{ marginTop: 10 }}>
                    <div className="form-group">
                      <label className="label">Country Code</label>
                      <input type="text" className="input" value={editCompanyCountry} onChange={e => {
                        setEditCompanyCountry(e.target.value)
                        if (editSameAsCompanyAddress) setEditReturnCountry(e.target.value)
                      }} />
                    </div>
                    <div className="form-group">
                      <label className="label">State</label>
                      <select className="input" value={editCompanyRegion} onChange={e => {
                        setEditCompanyRegion(e.target.value)
                        if (editSameAsCompanyAddress) setEditReturnRegion(e.target.value)
                      }}>
                        <option value=''>— Select state —</option>
                        {US_STATES.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                  </div>

                  {selectedCompany.company_type === 'vendor' && (
                    <div style={{ marginTop: 15, borderTop: '1px solid var(--border-light)', paddingTop: 15 }}>
                      <div className="form-group" style={{ marginBottom: 12 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>
                          <input 
                            type='checkbox' 
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
                          <strong>Same as company address</strong>
                        </label>
                      </div>
                      <div className="form-group" style={{ marginBottom: 8 }}>
                        <label className="label">Return Address Line 1 *</label>
                        <AddressAutocomplete
                          value={editReturnAddress1}
                          onChange={val => {
                            setEditReturnAddress1(val)
                            setEditSameAsCompanyAddress(false)
                          }}
                          onSelect={({ address1, city, state, zip, country }) => {
                            setEditReturnAddress1(address1)
                            setEditReturnCity(city)
                            setEditReturnRegion(state)
                            setEditReturnZip(zip)
                            setEditReturnCountry(country)
                            setEditSameAsCompanyAddress(false)
                          }}
                          className="input"
                          placeholder="Start typing return address…"
                        />
                      </div>

                      <div className="card-grid card-grid-3" style={{ marginTop: 10 }}>
                        <div className="form-group">
                          <label className="label">Return Address Line 2 <span style={{fontWeight:400,color:'var(--text-muted)',fontSize:10}}>(unit, suite…)</span></label>
                          <input type="text" className="input" placeholder="e.g. Suite 400" value={editReturnAddress2} onChange={e => {
                            setEditReturnAddress2(e.target.value)
                            setEditSameAsCompanyAddress(false)
                          }} />
                        </div>
                        <div className="form-group">
                          <label className="label">Return City</label>
                          <input type="text" className="input" placeholder="Auto-filled" value={editReturnCity} onChange={e => {
                            setEditReturnCity(e.target.value)
                            setEditSameAsCompanyAddress(false)
                          }} />
                        </div>
                        <div className="form-group">
                          <label className="label">Return ZIP / Postal Code</label>
                          <input type="text" className="input" placeholder="Auto-filled" value={editReturnZip} onChange={e => {
                            setEditReturnZip(e.target.value)
                            setEditSameAsCompanyAddress(false)
                          }} />
                        </div>
                      </div>

                      <div className="card-grid card-grid-2" style={{ marginTop: 10 }}>
                        <div className="form-group">
                          <label className="label">Return Country Code</label>
                          <input type="text" className="input" placeholder="USA" value={editReturnCountry} onChange={e => {
                            setEditReturnCountry(e.target.value)
                            setEditSameAsCompanyAddress(false)
                          }} />
                        </div>
                        <div className="form-group">
                          <label className="label">Return State</label>
                          <select className="input" value={editReturnRegion} onChange={e => {
                            setEditReturnRegion(e.target.value)
                            setEditSameAsCompanyAddress(false)
                          }}>
                            <option value=''>— Select state —</option>
                            {US_STATES.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Vendor: Integration Mode */}
                  {selectedCompany.company_type === 'vendor' && (
                    <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 12, marginTop: 8 }}>
                      <div className="label" style={{ marginBottom: 8 }}>Integration Mode</div>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                        {(['api','manual'] as const).map(mode => (
                          <button key={mode} type='button' onClick={() => {
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div className="card-grid card-grid-2">
                            <div className="form-group">
                              <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={11} /> First Send Time</label>
                              <AmPmTimePicker value={editDailyEmailTime} onChange={setEditDailyEmailTime} />
                            </div>
                            <div className="form-group">
                              <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={11} /> Second Send Time <span style={{fontWeight:400,color:'var(--text-muted)',fontSize:10}}>(optional)</span></label>
                              <AmPmTimePicker value={editDailyEmailTime2} onChange={setEditDailyEmailTime2} allowEmpty />
                            </div>
                          </div>
                          <div className="form-group">
                            <label className="label">Additional Automated Digest Recipients</label>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <input
                                type="email"
                                className="input"
                                placeholder="e.g. sales@vendor.com"
                                value={editNewDigestEmail}
                                onChange={e => setEditNewDigestEmail(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddEditDigestEmail(); } }}
                              />
                              <button
                                type="button"
                                onClick={handleAddEditDigestEmail}
                                style={{
                                  background: 'var(--accent)',
                                  border: 'none',
                                  borderRadius: 6,
                                  color: '#fff',
                                  padding: '0 14px',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                + Add
                              </button>
                            </div>
                            {editOrderDigestEmails.length > 0 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6, maxHeight: 120, overflowY: 'auto', background: 'var(--bg-elevated)', borderRadius: 6, padding: 6, border: '1px solid var(--border)' }}>
                                {editOrderDigestEmails.map(email => (
                                  <div key={email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', padding: '4px 8px', borderRadius: 4, fontSize: 12, border: '1px solid var(--border-light)' }}>
                                    <span style={{ color: 'var(--text-primary)' }}>{email}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveEditDigestEmail(email)}
                                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 11, fontWeight: 500 }}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Order digest emailed daily to the configured recipients at these UTC times.</div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="form-group" style={{ marginTop: 12 }}>
                    <label className="label" style={{ marginBottom: 6 }}>Allowed Sales Channels</label>
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
                            checked={editCompanyAllowedChannels.includes(ch.val)}
                            onChange={e => {
                              if (e.target.checked) {
                                setEditCompanyAllowedChannels([...editCompanyAllowedChannels, ch.val])
                              } else {
                                setEditCompanyAllowedChannels(editCompanyAllowedChannels.filter(x => x !== ch.val))
                              }
                            }}
                          />
                          {ch.lbl}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editCompanyIsParent}
                        onChange={e => setEditCompanyIsParent(e.target.checked)}
                      />
                      <strong>Mark as a Parent Company</strong>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editCompanyAllowPersonalEmailException}
                        onChange={e => setEditCompanyAllowPersonalEmailException(e.target.checked)}
                      />
                      <strong>Allow personal email domain exception</strong>
                    </label>
                    {selectedCompany.company_type === 'vendor' && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={editMapPricingEnforced}
                          onChange={e => setEditMapPricingEnforced(e.target.checked)}
                        />
                        <strong>Enforce MAP Pricing</strong>
                      </label>
                    )}
                  </div>

                  <div className="form-group" style={{ marginTop: 10 }}>
                    <label className="label">Parent Company (If child)</label>
                    <select className="input" value={editCompanyParentId} onChange={e => setEditCompanyParentId(e.target.value)} disabled={editCompanyIsParent}>
                      <option value="">Select one</option>
                      {companiesList.filter((c: any) => c.is_parent && c.id !== selectedCompany.id).map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
                    {isEditFormDirty() && <span style={{ fontSize: 11, color: 'var(--amber)' }}>⚠ Unsaved changes</span>}
                    <button type="submit" className="btn btn-primary">Save Profile Changes</button>
                  </div>
                </form>
              </div>

               {/* Governance & Capabilities */}
              <div style={{ borderLeft: '1px solid var(--border-light)', paddingLeft: 24 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--accent)' }}>Assigned Capabilities</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '240px', overflowY: 'auto', marginBottom: 16, background: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                  {(!selectedCompany.capabilities || selectedCompany.capabilities.length === 0) ? (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No capabilities assigned</div>
                  ) : (
                    selectedCompany.capabilities.map((cap: any) => {
                      const info = getCapabilityInfo(cap.code)
                      return (
                        <div key={cap.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: '4px' }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{info.name}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }} className="mono">{cap.code}</div>
                          </div>
                          <button type="button" className="btn btn-red btn-xs" style={{ padding: '2px 6px' }} onClick={() => handleRemoveCapability(cap.code)}>Remove</button>
                        </div>
                      )
                    })
                  )}
                </div>

                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--accent)' }}>Assign New Capability</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <select className="input" style={{ flex: 1 }} value={selectedCapabilityCode} onChange={e => setSelectedCapabilityCode(e.target.value)}>
                      <option value="">Select one</option>
                      {allCapabilitiesList
                        .filter((cap: any) => !selectedCompany.capabilities?.some((c: any) => c.code === cap.code))
                        .filter((cap: any) => isCapabilityAllowedForCompany(cap.code, selectedCompany.company_type, editBuyerType))
                        .map((cap: any) => {
                          const info = getCapabilityInfo(cap.code)
                          return (
                            <option key={cap.id} value={cap.code}>{info.name}</option>
                          )
                        })}
                    </select>
                    <button type="button" className="btn btn-primary" onClick={() => {
                      handleAssignCapability(selectedCapabilityCode)
                      setSelectedCapabilityCode('')
                    }} disabled={!selectedCapabilityCode}>Assign</button>
                  </div>
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
                </div>

                {selectedCompany.company_type === 'vendor' && (
                  <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 20, marginTop: 20 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      🏷️ MAP Pricing Exceptions
                    </h4>
                    
                    {/* List of exceptions */}
                    <div style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {mapExceptionsLoading ? (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>Loading MAP exceptions...</div>
                      ) : mapExceptions.length === 0 ? (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>No active MAP exceptions</div>
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
                              <button type="button" className="btn btn-red btn-xs" style={{ background: 'var(--red)', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }} onClick={() => handleDeleteMapException(exc.id)}>Delete</button>
                            </div>
                          )
                        })
                      )}
                    </div>
                    
                    {/* Add exception form */}
                    <form onSubmit={handleAddMapException} style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', borderRadius: 8, padding: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Add New MAP Exception</div>
                      <div className="card-grid card-grid-2">
                        <div className="form-group">
                          <label className="label" style={{ fontSize: 11 }}>SKU</label>
                          <input type="text" className="input" placeholder="e.g. iPhone SKU" required value={newExcSku} onChange={e => setNewExcSku(e.target.value)} style={{ padding: '6px 10px', fontSize: 12 }} />
                        </div>
                        <div className="form-group">
                          <label className="label" style={{ fontSize: 11 }}>Buyer Company</label>
                          <select className="input" value={newExcBuyerId} onChange={e => setNewExcBuyerId(e.target.value)} style={{ padding: '6px 10px', fontSize: 12 }}>
                            <option value="">All Buyers (Global)</option>
                            {companiesList.filter((c: any) => c.company_type === 'buyer').map((c: any) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="label" style={{ fontSize: 11 }}>Approved Minimum Price ($)</label>
                        <input type="number" step="0.01" min="0" className="input" placeholder="0.00" required value={newExcMinPrice} onChange={e => setNewExcMinPrice(e.target.value)} style={{ padding: '6px 10px', fontSize: 12 }} />
                      </div>
                      <div className="card-grid card-grid-2">
                        <div className="form-group">
                          <label className="label" style={{ fontSize: 11 }}>Start Date</label>
                          <input type="date" className="input" required value={newExcStartDate} onChange={e => setNewExcStartDate(e.target.value)} style={{ padding: '6px 10px', fontSize: 12 }} />
                        </div>
                        <div className="form-group">
                          <label className="label" style={{ fontSize: 11 }}>End Date</label>
                          <input type="date" className="input" required value={newExcEndDate} onChange={e => setNewExcEndDate(e.target.value)} style={{ padding: '6px 10px', fontSize: 12 }} />
                        </div>
                      </div>
                      <button type="submit" className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-end', marginTop: 4 }}>Add Exception</button>
                    </form>
                  </div>
                )}
              </div>
            </div>

            {showConfirmCloseManage && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(4,6,10,0.92)',
                backdropFilter: 'blur(4px)',
                zIndex: 3000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
                borderRadius: 'var(--radius)'
              }}>
                <div style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 8,
                  padding: 24,
                  maxWidth: 360,
                  textAlign: 'center',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Unsaved Changes</h4>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.4 }}>
                    Your progress will be lost because you have unsaved changes. Are you sure you want to close?
                  </p>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                    <button type='button' className="btn btn-secondary btn-sm" onClick={() => setShowConfirmCloseManage(false)}>No, Keep Editing</button>
                    <button type='button' className="btn btn-danger btn-sm" style={{ background: 'var(--red)', borderColor: 'var(--red)', color: '#fff' }} onClick={() => { setShowCompanyDetailsModal(false); setSelectedCompany(null); setErrorMsg(null); setShowConfirmCloseManage(false) }}>Yes, Discard</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

