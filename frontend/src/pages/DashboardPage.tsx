import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Smartphone, ShoppingBag, Package, ReceiptText, TrendingUp, Users, Building, Shield, X, FileText, Truck, Upload, Clock
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts'
import api from '../lib/apiClient'
import { useAuthStore } from '../stores/authStore'
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

// AM/PM Time Picker — converts between 24hr storage and 12hr display
function AmPmTimePicker({ value, onChange, allowEmpty, inputStyle }: { value: string; onChange: (v: string) => void; allowEmpty?: boolean; inputStyle?: React.CSSProperties }) {
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

  const base: React.CSSProperties = inputStyle ?? {
    padding: '8px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 6, color: 'var(--text-primary)', fontSize: 13, outline: 'none',
    width: '100%', boxSizing: 'border-box'
  }

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <select style={{ ...base, flex: 1, padding: '8px 4px', textAlign: 'center' }} value={hour} onChange={e => emit(e.target.value, minute, ampm)}>
        {allowEmpty && <option value=''>--</option>}
        {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
          <option key={h} value={String(h)}>{String(h).padStart(2, '0')}</option>
        ))}
      </select>
      <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>:</span>
      <select style={{ ...base, flex: 1, padding: '8px 4px', textAlign: 'center' }} value={minute} onChange={e => emit(hour, e.target.value, ampm)}>
        {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
      <select style={{ ...base, flex: 'none', width: 58, padding: '8px 4px', textAlign: 'center' }} value={ampm} onChange={e => emit(hour, minute, e.target.value)}>
        <option value='AM'>AM</option>
        <option value='PM'>PM</option>
      </select>
    </div>
  )
}

// ─── ONBOARD ORGANIZATION MODAL ──────────────────────────────────────────────
function OnboardOrgModal({ onClose }: { onClose: () => void }) {
  const [showConfirmClose, setShowConfirmClose] = useState(false)
  const [companyType, setCompanyType] = useState('')
  const [buyerType, setBuyerType] = useState('')
  const [vendorType, setVendorType] = useState('')
  const [integrationMode, setIntegrationMode] = useState('') // 'api' | 'manual'
  const [dailyEmailTime, setDailyEmailTime] = useState('08:00')
  const [dailyEmailTime2, setDailyEmailTime2] = useState('')
  const [buyerPricingMode, setBuyerPricingMode] = useState('standard')
  const [commissionPercentage, setCommissionPercentage] = useState('14.00')
  const [returnAddress1, setReturnAddress1] = useState('')
  const [returnAddress2, setReturnAddress2] = useState('')
  const [returnCity, setReturnCity] = useState('')
  const [returnZip, setReturnZip] = useState('')
  const [returnRegion, setReturnRegion] = useState('')
  const [returnCountry, setReturnCountry] = useState('')
  const [sameAsCompanyAddress, setSameAsCompanyAddress] = useState(false)
  const [mapPricingEnforced, setMapPricingEnforced] = useState(false)
  const [orderDigestEmails, setOrderDigestEmails] = useState<string[]>([])
  const [newDigestEmail, setNewDigestEmail] = useState('')

  const handleAddDigestEmail = () => {
    const email = newDigestEmail.trim()
    if (email && !orderDigestEmails.includes(email)) {
      setOrderDigestEmails([...orderDigestEmails, email])
      setNewDigestEmail('')
    }
  }

  const handleRemoveDigestEmail = (email: string) => {
    setOrderDigestEmails(orderDigestEmails.filter(e => e !== email))
  }


  const [companyName, setCompanyName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [slug, setSlug] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [emailDomain, setEmailDomain] = useState('')
  const [status, setStatus] = useState('draft')
  const [isParent, setIsParent] = useState(true)
  const [parentId, setParentId] = useState('')
  const [allowPersonalEmail, setAllowPersonalEmail] = useState(false)
  const [erpId, setErpId] = useState('')
  const [allowedChannels, setAllowedChannels] = useState<string[]>(['online_dtc', 'buyer_storefront'])
  const [region, setRegion] = useState('')         // state/province code
  const [country, setCountry] = useState('USA')
  const [address1, setAddress1] = useState('')
  const [address2, setAddress2] = useState('')
  const [city, setCity] = useState('')
  const [zip, setZip] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Fetch existing parent companies for dropdown
  const [companies, setCompanies] = useState<any[]>([])
  useEffect(() => {
    api.get('/tenant/companies/').then(r => {
      setCompanies(Array.isArray(r.data) ? r.data : r.data?.results ?? [])
    }).catch(() => {})
  }, [])

  const isFormDirty = () => {
    return (
      companyType !== '' ||
      buyerType !== '' ||
      vendorType !== '' ||
      integrationMode !== '' ||
      dailyEmailTime !== '08:00' ||
      dailyEmailTime2 !== '' ||
      buyerPricingMode !== 'standard' ||
      commissionPercentage !== '14.00' ||
      returnAddress1 !== '' ||
      returnAddress2 !== '' ||
      returnCity !== '' ||
      returnZip !== '' ||
      returnRegion !== '' ||
      returnCountry !== '' ||
      mapPricingEnforced !== false ||
      orderDigestEmails.length > 0 ||
      companyName !== '' ||
      displayName !== '' ||
      slug !== '' ||
      contactName !== '' ||
      contactEmail !== '' ||
      phone !== '' ||
      website !== '' ||
      emailDomain !== '' ||
      status !== 'draft' ||
      !isParent ||
      parentId !== '' ||
      allowPersonalEmail ||
      erpId !== '' ||
      region !== '' ||
      country !== 'USA' ||
      address1 !== '' ||
      address2 !== '' ||
      city !== '' ||
      zip !== '' ||
      logoFile !== null
    )
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      setLogoFile(f)
      setLogoPreview(URL.createObjectURL(f))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!companyType) { setError('Please select a company type.'); return }
    if (!companyName) { setError('Company name is required.'); return }
    if (!contactEmail) { setError('Business email is required.'); return }
    setSubmitting(true)
    try {
      const autoSlug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now()
      const finalSlug = slug.trim() || autoSlug

      // Upload logo if provided
      let logoAssetId: string | null = null
      if (logoFile) {
        try {
          const reqRes = await api.post('/media/assets/request_upload/', {
            filename: logoFile.name,
            mime_type: logoFile.type,
            asset_type: 'brand_logo',
            owner_module: 'tenant',
          })
          logoAssetId = reqRes.data.id
          const fd = new FormData()
          fd.append('file', logoFile)
          await api.post(`/media/assets/${logoAssetId}/upload_file/`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        } catch (_) { /* logo upload failure is non-blocking */ }
      }

      await api.post('/tenant/companies/', {
        name: companyName,
        display_name: displayName || companyName,
        slug: finalSlug,
        company_type: companyType,
        status: status || 'draft',
        country_code: country || 'USA',
        region_code: region,
        website: website || '',
        business_email_domain: emailDomain || '',
        primary_contact_name: contactName || '',
        primary_contact_email: contactEmail || '',
        phone_number: phone || '',
        address_line1: address1 || '',
        address_line2: address2 || '',
        is_parent: isParent,
        parent_company: (!isParent && parentId) ? parentId : null,
        allow_personal_email_exception: allowPersonalEmail,
        allowed_channels: allowedChannels,
        buyer_pricing_mode: buyerPricingMode,
        commission_percentage: buyerPricingMode === 'custom' ? parseFloat(commissionPercentage) : (buyerPricingMode === 'no_commission' ? 0.00 : 14.00),
        return_address: companyType === 'vendor' ? JSON.stringify({
          address_line1: returnAddress1 || '',
          address_line2: returnAddress2 || '',
          city: returnCity || '',
          region_code: returnRegion || '',
          zip: returnZip || '',
          country_code: returnCountry || '',
        }) : '',
        map_pricing_enforced: companyType === 'vendor' ? mapPricingEnforced : false,
        order_digest_emails: companyType === 'vendor' && integrationMode === 'manual' ? orderDigestEmails : [],
        external_id: JSON.stringify({
          buyer_type: buyerType || null,
          vendor_type: vendorType || null,
          integration_mode: integrationMode || null,
          daily_email_time: integrationMode === 'manual' ? dailyEmailTime : null,
          daily_email_time_2: (integrationMode === 'manual' && dailyEmailTime2) ? dailyEmailTime2 : null,
          logo_asset_id: logoAssetId,
          city: city || null,
          zip: zip || null,
          erp_id: erpId || null,
        }),
      })
      setSuccess(true)
    } catch (err: any) {
      const d = err.response?.data
      if (d && typeof d === 'object') {
        const detail = d.detail
        if (detail && typeof detail === 'object') {
          setError(Object.entries(detail).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | '))
        } else if (typeof detail === 'string') {
          setError(detail)
        } else {
          setError(Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | '))
        }
      } else {
        setError('Failed to create company.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const S: Record<string, React.CSSProperties> = {
    overlay: { position: 'fixed', inset: 0, background: 'rgba(4,6,10,0.82)', backdropFilter: 'blur(6px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    modal: { background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius)', width: 560, maxWidth: '96vw', maxHeight: '92vh', overflowY: 'auto', padding: 28, boxShadow: '0 32px 64px -12px rgba(0,0,0,0.75)', animation: 'modalEnter .25s cubic-bezier(.16,1,.3,1)' },
    row: { display: 'flex', gap: 14 },
    col: { display: 'flex', flexDirection: 'column', gap: 4, flex: 1 },
    label: { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' },
    input: { padding: '8px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' },
    section: { borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 },
  }

  if (success) return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Organization Onboarded!</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>{companyName} has been created and activated on the platform.</div>
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={S.overlay}>
      <style>{`@keyframes modalEnter{from{opacity:0;transform:scale(.96) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
      <div style={S.modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Onboard Organization</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Register a new buyer or vendor tenant on the platform</div>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => { if (isFormDirty()) setShowConfirmClose(true); else onClose() }}><X size={18} /></button>
        </div>

        {error && <div style={{ background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 6, padding: '8px 12px', color: '#ef4444', fontSize: 12, marginBottom: 14 }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Company Type */}
          <div style={S.col}>
            <label style={S.label}>Company Type *</label>
            <select style={S.input} value={companyType} onChange={e => { setCompanyType(e.target.value); setBuyerType(''); setVendorType(''); setIntegrationMode('') }}>
              <option value=''>Select Company Type</option>
              <option value='buyer'>Buyer</option>
              <option value='vendor'>Vendor</option>
              <option value='device_distributor'>Device Distributor</option>
            </select>
          </div>

          {/* Buyer Sub-type */}
          {companyType === 'buyer' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={S.col}>
                <label style={S.label}>Buyer Type *</label>
                <select style={S.input} value={buyerType} onChange={e => setBuyerType(e.target.value)}>
                  <option value=''>Select Buyer Type</option>
                  <option value='mvno'>MVNO</option>
                  <option value='wireless_carrier'>Wireless Carrier</option>
                  <option value='retailer'>Retailer</option>
                  <option value='enterprise_corporate'>Enterprise/ Corporate</option>
                </select>
              </div>
              <div style={S.row}>
                <div style={S.col}>
                  <label style={S.label}>Buyer Pricing Mode *</label>
                  <select style={S.input} value={buyerPricingMode} onChange={e => setBuyerPricingMode(e.target.value)}>
                    <option value="standard">Standard Buyer Commission (14%)</option>
                    <option value="no_commission">No Buyer Commission (0%)</option>
                    <option value="custom">Custom Buyer Commission</option>
                  </select>
                </div>
                {buyerPricingMode === 'custom' && (
                  <div style={S.col}>
                    <label style={S.label}>Commission Percentage (%) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      style={S.input}
                      placeholder="e.g. 10.00"
                      value={commissionPercentage}
                      onChange={e => setCommissionPercentage(e.target.value)}
                      required
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Vendor Sub-type */}
          {companyType === 'vendor' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={S.col}>
                <label style={S.label}>Vendor Type *</label>
                <select style={S.input} value={vendorType} onChange={e => setVendorType(e.target.value)}>
                  <option value=''>Select Vendor Type</option>
                  <option value='accessory_vendor'>Accessory Vendor</option>
                </select>
              </div>
            </div>
          )}

          {/* Core Identity */}
          <div style={S.row}>
            <div style={S.col}>
              <label style={S.label}>Company Legal Name *</label>
              <input style={S.input} placeholder='e.g. Acme Corp Ltd.' required value={companyName} onChange={e => {
                const val = e.target.value;
                setCompanyName(val);
                setDisplayName(prev => (prev === '' || prev === companyName) ? val : prev);
              }} />
            </div>
            <div style={S.col}>
              <label style={S.label}>Display Name *</label>
              <input style={S.input} placeholder='Short name for UI' required value={displayName} onChange={e => setDisplayName(e.target.value)} />
            </div>
          </div>

          <div style={S.row}>
            <div style={S.col}>
              <label style={S.label}>Primary Contact Name *</label>
              <input style={S.input} placeholder='Jane Smith' required value={contactName} onChange={e => setContactName(e.target.value)} />
            </div>
            <div style={S.col}>
              <label style={S.label}>Business Email *</label>
              <input style={S.input} type='email' placeholder='admin@company.com' required value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
            </div>
          </div>

          <div style={S.row}>
            <div style={S.col}>
              <label style={S.label}>Website *</label>
              <input style={S.input} placeholder='https://company.com' required value={website} onChange={e => setWebsite(e.target.value)} />
            </div>
            <div style={S.col}>
              <label style={S.label}>Email Domain *</label>
              <input style={S.input} placeholder='company.com' required value={emailDomain} onChange={e => setEmailDomain(e.target.value)} />
            </div>
          </div>

          <div style={S.row}>
            <div style={S.col}>
              <label style={S.label}>Phone Number <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 10 }}>(optional)</span></label>
              <input style={S.input} placeholder='+1-555-0199' value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div style={S.col}>
              <label style={S.label}>Country Code *</label>
              <input style={S.input} placeholder='USA' required value={country} onChange={e => {
                setCountry(e.target.value)
                if (sameAsCompanyAddress) setReturnCountry(e.target.value)
              }} />
            </div>
          </div>

          {/* Address with Google Places */}
          <div style={S.col}>
            <label style={S.label}>Address Line 1 *</label>
            <AddressAutocomplete
              value={address1}
              onChange={val => {
                setAddress1(val)
                if (sameAsCompanyAddress) setReturnAddress1(val)
              }}
              onSelect={({ address1: a1, city: c, state: s, zip: z, country: co }) => {
                setAddress1(a1)
                setCity(c)
                setRegion(s)
                setZip(z)
                setCountry(co)
                if (sameAsCompanyAddress) {
                  setReturnAddress1(a1)
                  setReturnCity(c)
                  setReturnRegion(s)
                  setReturnZip(z)
                  setReturnCountry(co)
                }
              }}
              style={S.input}
              className=''
              placeholder='Start typing an address…'
            />
          </div>

          <div style={S.row}>
            <div style={S.col}>
              <label style={S.label}>Address Line 2 <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 10 }}>(unit, suite…)</span></label>
              <input style={S.input} placeholder='e.g. Suite 400' value={address2} onChange={e => {
                setAddress2(e.target.value)
                if (sameAsCompanyAddress) setReturnAddress2(e.target.value)
              }} />
            </div>
            <div style={S.col}>
              <label style={S.label}>City</label>
              <input style={S.input} placeholder='Auto-filled' value={city} onChange={e => {
                setCity(e.target.value)
                if (sameAsCompanyAddress) setReturnCity(e.target.value)
              }} />
            </div>
          </div>

          <div style={S.row}>
            <div style={S.col}>
              <label style={S.label}>ZIP / Postal Code</label>
              <input style={S.input} placeholder='Auto-filled' value={zip} onChange={e => {
                setZip(e.target.value)
                if (sameAsCompanyAddress) setReturnZip(e.target.value)
              }} />
            </div>
            <div style={S.col}>
              <label style={S.label}>State / Province</label>
              <select style={S.input} value={region} onChange={e => {
                setRegion(e.target.value)
                if (sameAsCompanyAddress) setReturnRegion(e.target.value)
              }}>
                <option value=''>— Select state —</option>
                {US_STATES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          {/* Vendor Return Address Section */}
          {companyType === 'vendor' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, borderTop: '1px solid var(--border-light)', paddingTop: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer', marginBottom: 12 }}>
                <input 
                  type='checkbox' 
                  checked={sameAsCompanyAddress} 
                  onChange={e => {
                    const checked = e.target.checked
                    setSameAsCompanyAddress(checked)
                    if (checked) {
                      setReturnAddress1(address1)
                      setReturnAddress2(address2)
                      setReturnCity(city)
                      setReturnRegion(region)
                      setReturnZip(zip)
                      setReturnCountry(country)
                    }
                  }} 
                />
                <strong>Same as company address</strong>
              </label>

              <div style={S.col}>
                <label style={S.label}>Return Address Line 1 *</label>
                <AddressAutocomplete
                  value={returnAddress1}
                  onChange={val => {
                    setReturnAddress1(val)
                    setSameAsCompanyAddress(false)
                  }}
                  onSelect={({ address1: a1, city: c, state: s, zip: z, country: co }) => {
                    setReturnAddress1(a1)
                    setReturnCity(c)
                    setReturnRegion(s)
                    setReturnZip(z)
                    setReturnCountry(co)
                    setSameAsCompanyAddress(false)
                  }}
                  style={S.input}
                  className=''
                  placeholder='Start typing return address…'
                />
              </div>

              <div style={S.row}>
                <div style={S.col}>
                  <label style={S.label}>Return Address Line 2 <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 10 }}>(unit, suite…)</span></label>
                  <input style={S.input} placeholder='e.g. Suite 400' value={returnAddress2} onChange={e => {
                    setReturnAddress2(e.target.value)
                    setSameAsCompanyAddress(false)
                  }} />
                </div>
                <div style={S.col}>
                  <label style={S.label}>Return City</label>
                  <input style={S.input} placeholder='Auto-filled' value={returnCity} onChange={e => {
                    setReturnCity(e.target.value)
                    setSameAsCompanyAddress(false)
                  }} />
                </div>
              </div>

              <div style={S.row}>
                <div style={S.col}>
                  <label style={S.label}>Return ZIP / Postal Code</label>
                  <input style={S.input} placeholder='Auto-filled' value={returnZip} onChange={e => {
                    setReturnZip(e.target.value)
                    setSameAsCompanyAddress(false)
                  }} />
                </div>
                <div style={S.col}>
                  <label style={S.label}>Return State / Province</label>
                  <select style={S.input} value={returnRegion} onChange={e => {
                    setReturnRegion(e.target.value)
                    setSameAsCompanyAddress(false)
                  }}>
                    <option value=''>— Select state —</option>
                    {US_STATES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div style={S.row}>
                <div style={S.col}>
                  <label style={S.label}>Return Country Code *</label>
                  <input style={S.input} placeholder='USA' value={returnCountry} onChange={e => {
                    setReturnCountry(e.target.value)
                    setSameAsCompanyAddress(false)
                  }} />
                </div>
                <div style={S.col}></div>
              </div>
            </div>
          )}

          {/* Company Logo */}
          <div style={{ ...S.section }}>
            <label style={{ ...S.label, display: 'block', marginBottom: 8 }}>Company / Tenant Logo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {logoPreview ? (
                <img src={logoPreview} alt='Logo preview' style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', padding: 4 }} />
              ) : (
                <div style={{ width: 56, height: 56, borderRadius: 8, border: '2px dashed var(--border)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  <Upload size={20} />
                </div>
              )}
              <div>
                <label style={{ cursor: 'pointer' }}>
                  <span className='btn btn-secondary btn-sm'><Upload size={13} /> Choose Logo</span>
                  <input type='file' accept='image/png,image/jpeg,image/webp,image/svg+xml' style={{ display: 'none' }} onChange={handleLogoChange} />
                </label>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>PNG, JPG, WEBP or SVG. Recommended 256×256px.</div>
              </div>
            </div>
          </div>

          {/* Additional Fields: Slug, ERP ID, Status, Channels, Flags */}
          <div style={S.section}>
            <div style={{ ...S.label, display: 'block', marginBottom: 10 }}>Organization Settings</div>

            <div style={S.row}>
              <div style={S.col}>
                <label style={S.label}>Custom Slug <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 10 }}>(optional, auto-generated if blank)</span></label>
                <input style={S.input} placeholder='e.g. acme-corp' value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} />
              </div>
              <div style={S.col}>
                <label style={S.label}>External ERP ID <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 10 }}>(optional)</span></label>
                <input style={S.input} placeholder='e.g. EXT-908' value={erpId} onChange={e => setErpId(e.target.value)} />
              </div>
            </div>

            <div style={{ ...S.row, marginTop: 10 }}>
              <div style={S.col}>
                <label style={S.label}>Status</label>
                <select style={S.input} value={status} onChange={e => setStatus(e.target.value)}>
                  <option value='draft'>Draft</option>
                  <option value='active'>Active</option>
                  <option value='suspended'>Suspended</option>
                </select>
              </div>
              <div style={{ ...S.col, justifyContent: 'center', gap: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer', marginTop: 8 }}>
                  <input type='checkbox' checked={isParent} onChange={e => setIsParent(e.target.checked)} />
                  <strong>Mark as Parent Company</strong>
                </label>
                {companyType === 'vendor' && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>
                    <input type='checkbox' checked={mapPricingEnforced} onChange={e => setMapPricingEnforced(e.target.checked)} />
                    <strong>Enforce MAP Pricing</strong>
                  </label>
                )}
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input type='checkbox' checked={allowPersonalEmail} onChange={e => setAllowPersonalEmail(e.target.checked)} />
                  <strong>Allow personal email domain exception</strong>
                </label>
              </div>
            </div>

            {!isParent && (
              <div style={{ ...S.col, marginTop: 10 }}>
                <label style={S.label}>Parent Company</label>
                <select style={S.input} value={parentId} onChange={e => setParentId(e.target.value)}>
                  <option value=''>— Select parent —</option>
                  {companies.filter((c: any) => c.is_parent).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ marginTop: 12 }}>
              <label style={{ ...S.label, display: 'block', marginBottom: 8 }}>Allowed Sales Channels</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[
                  { val: 'online_dtc', lbl: 'Online DTC' },
                  { val: 'bulk_po', lbl: 'Bulk PO' },
                  { val: 'owned_channel', lbl: 'Owned Channel' },
                  { val: 'buyer_storefront', lbl: 'Buyer Storefront' },
                  { val: 'marketplace', lbl: 'Marketplace' },
                  { val: 'retail_pos', lbl: 'Retail POS' },
                ].map(ch => (
                  <label key={ch.val} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input type='checkbox' checked={allowedChannels.includes(ch.val)}
                      onChange={e => setAllowedChannels(e.target.checked ? [...allowedChannels, ch.val] : allowedChannels.filter(x => x !== ch.val))}
                    />
                    {ch.lbl}
                  </label>
                ))}
              </div>
            </div>
          </div>
          {companyType === 'vendor' && (
            <div style={S.section}>
              <div style={{ ...S.label, marginBottom: 10, display: 'block' }}>Integration Mode</div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                {(['api', 'manual'] as const).map(mode => (
                  <button
                    key={mode}
                    type='button'
                    onClick={() => {
                      if (integrationMode === mode) {
                        if (mode === 'api') {
                          setIntegrationMode('')
                        } else if (mode === 'manual') {
                          const isEmpty = (dailyEmailTime === '08:00' || !dailyEmailTime) && !dailyEmailTime2 && orderDigestEmails.length === 0
                          if (isEmpty) {
                            setIntegrationMode('')
                          }
                        }
                      } else {
                        setIntegrationMode(mode)
                      }
                    }}
                    style={{
                      flex: 1, padding: '10px 0', borderRadius: 8, border: `1.5px solid ${integrationMode === mode ? 'var(--accent)' : 'var(--border)'}`,
                      background: integrationMode === mode ? 'rgba(99,102,241,.12)' : 'var(--bg-elevated)',
                      color: integrationMode === mode ? 'var(--accent)' : 'var(--text-secondary)',
                      fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all .15s'
                    }}
                  >
                    {mode === 'api' ? '🔌 API Integration' : '📋 Manual (Order Sheet)'}
                  </button>
                ))}
              </div>
              {integrationMode === 'api' && (
                <div style={{ padding: '10px 12px', background: 'rgba(99,102,241,.08)', borderRadius: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                  API keys will be generated and sent to the vendor's business email after approval. The vendor will use the CIXCI REST API to push/pull order data.
                </div>
              )}
              {integrationMode === 'manual' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ padding: '10px 12px', background: 'rgba(245,158,11,.08)', borderRadius: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                    Order digest emails will be sent automatically to the primary business email and any additional addresses configured below. No API credentials will be issued.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={S.col}>
                      <label style={{ ...S.label, display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={12} /> First Send Time</label>
                      <AmPmTimePicker value={dailyEmailTime} onChange={setDailyEmailTime} inputStyle={S.input} />
                    </div>
                    <div style={S.col}>
                      <label style={{ ...S.label, display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={12} /> Second Send Time <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 10 }}>(optional)</span></label>
                      <AmPmTimePicker value={dailyEmailTime2} onChange={setDailyEmailTime2} allowEmpty inputStyle={S.input} />
                    </div>
                  </div>
                  <div style={S.col}>
                    <label style={S.label}>Additional Automated Digest Recipients</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="email"
                        style={{ ...S.input, flex: 1 }}
                        placeholder="e.g. sales@vendor.com"
                        value={newDigestEmail}
                        onChange={e => setNewDigestEmail(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddDigestEmail(); } }}
                      />
                      <button
                        type="button"
                        onClick={handleAddDigestEmail}
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
                    {orderDigestEmails.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6, maxHeight: 120, overflowY: 'auto', background: 'var(--bg-elevated)', borderRadius: 6, padding: 6, border: '1px solid var(--border)' }}>
                        {orderDigestEmails.map(email => (
                          <div key={email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', padding: '4px 8px', borderRadius: 4, fontSize: 12, border: '1px solid var(--border-light)' }}>
                            <span style={{ color: 'var(--text-primary)' }}>{email}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveDigestEmail(email)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 11, fontWeight: 500 }}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Order digests emailed daily to the configured recipients at these times.</div>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid var(--border)', marginTop: 4 }}>
            <button type='button' className='btn btn-secondary' onClick={() => { if (isFormDirty()) setShowConfirmClose(true); else onClose() }} disabled={submitting}>Cancel</button>
            <button type='submit' className='btn btn-primary' disabled={submitting}>
              {submitting ? 'Creating…' : '✓ Onboard Organization'}
            </button>
          </div>
        </form>

        {showConfirmClose && (
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
                <button type='button' className="btn btn-secondary btn-sm" onClick={() => setShowConfirmClose(false)}>No, Keep Editing</button>
                <button type='button' className="btn btn-danger btn-sm" style={{ background: 'var(--red)', borderColor: 'var(--red)', color: '#fff' }} onClick={onClose}>Yes, Discard</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, color, linkTo }: any) {
  const content = (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: `${color}18` }}>
        <Icon size={18} color={color} />
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  )
  return linkTo ? <Link to={linkTo} style={{ textDecoration: 'none' }}>{content}</Link> : content
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const isCixciAdmin = user?.is_cixci_admin || user?.company_type === 'cixci_internal'
  const isBuyer = user?.company_type === 'buyer'
  const isVendor = user?.company_type === 'vendor'

  const count = (d: any) => d?.count ?? d?.results?.length ?? d?.length ?? '0'

  if (isCixciAdmin) {
    return <AdminDashboard count={count} />
  } else if (isBuyer) {
    return <BuyerDashboard count={count} user={user} />
  } else if (isVendor) {
    return <VendorDashboard count={count} user={user} />
  } else {
    return <BuyerDashboard count={count} user={user} />
  }
}

// ─── CIXCI ADMIN DASHBOARD ───────────────────────────────────────────────────
function AdminDashboard({ count }: any) {
  const [showOnboardModal, setShowOnboardModal] = useState(false)
  const { data: companies } = useQuery({ queryKey: ['admin-companies'], queryFn: () => api.get('/tenant/companies/').then(r => r.data).catch(() => []) })
  const { data: users } = useQuery({ queryKey: ['admin-users'], queryFn: () => api.get('/tenant/users/').then(r => r.data).catch(() => []) })
  const { data: devices } = useQuery({ queryKey: ['admin-devices'], queryFn: () => api.get('/devices/devices/').then(r => r.data).catch(() => []) })
  const { data: products } = useQuery({ queryKey: ['admin-products'], queryFn: () => api.get('/catalog/products/').then(r => r.data).catch(() => []) })

  const cCount = count(companies)
  const uCount = count(users)
  const dCount = count(devices)
  const pCount = count(products)

  const globalActivity = [
    { event: 'Tenant activated', desc: 'Added buyer: Telco Retailer', status: 'badge-green', statusText: 'Active', time: '5 min ago' },
    { event: 'Device catalog import', desc: 'Imported 12 new 5G models', status: 'badge-blue', statusText: 'Complete', time: '14 min ago' },
    { event: 'SLA rule triggered', desc: 'Evaluated 4 pending fulfillments', status: 'badge-purple', statusText: 'Evaluated', time: '1 hr ago' },
    { event: 'Invoice issued', desc: 'Generated buyer transaction invoice', status: 'badge-green', statusText: 'Success', time: '2 hr ago' },
  ]

  const dataChart = [
    { name: 'Jan', companies: 4, users: 10 },
    { name: 'Feb', companies: 8, users: 18 },
    { name: 'Mar', companies: 12, users: 26 },
    { name: 'Apr', companies: 15, users: 35 },
    { name: 'May', companies: 22, users: 49 },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">CIXCI System Admin Console</div>
          <div className="page-sub">Global platform health, tenant activations, and system metrics</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowOnboardModal(true)}>
          <Building size={14} /> Onboard Organization
        </button>
        {showOnboardModal && <OnboardOrgModal onClose={() => setShowOnboardModal(false)} />}
      </div>

      <div className="card-grid card-grid-4" style={{ marginBottom: 24 }}>
        <StatCard icon={Building} label="Active Companies" value={cCount} sub="registered tenants" color="var(--purple)" linkTo="/settings" />
        <StatCard icon={Users} label="System Admins & Users" value={uCount} sub="onboarded members" color="var(--accent)" linkTo="/settings" />
        <StatCard icon={Smartphone} label="Global Devices" value={dCount} sub="in master catalog" color="var(--green)" linkTo="/devices" />
        <StatCard icon={ShoppingBag} label="Catalog Products" value={pCount} sub="wholesale accessories" color="var(--amber)" linkTo="/catalog" />
      </div>

      <div className="card-grid card-grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <span className="section-title" style={{ fontSize: 15, fontWeight: 600 }}>Platform Growth Trend</span>
            <span className="badge badge-purple">Global Tenants</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dataChart}>
              <defs>
                <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--purple)" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="var(--purple)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--text-muted)" />
              <YAxis stroke="var(--text-muted)" />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
              <Area type="monotone" dataKey="companies" stroke="var(--purple)" strokeWidth={2} fill="url(#colorComp)" name="Companies" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="section-header" style={{ marginBottom: 16 }}>
            <span className="section-title" style={{ fontSize: 15, fontWeight: 600 }}>System Quick Actions</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, justifyContent: 'center' }}>
            <Link to="/settings" className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: 12 }}>
              <Users size={16} color="var(--accent)" />
              <div style={{ textAlign: 'left', marginLeft: 8 }}>
                <div style={{ fontWeight: 650 }}>Invite Organization Admin</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Send time-limited secure onboarding link</div>
              </div>
            </Link>
            <Link to="/devices" className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: 12 }}>
              <Smartphone size={16} color="var(--green)" />
              <div style={{ textAlign: 'left', marginLeft: 8 }}>
                <div style={{ fontWeight: 650 }}>Import Device Data</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Upload CSV compatibility and features</div>
              </div>
            </Link>
            <Link to="/integration" className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: 12 }}>
              <Shield size={16} color="var(--amber)" />
              <div style={{ textAlign: 'left', marginLeft: 8 }}>
                <div style={{ fontWeight: 650 }}>System Integration Logs</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Check API payloads, sync alerts, and errors</div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-header" style={{ marginBottom: 16 }}>
          <span className="section-title" style={{ fontSize: 15, fontWeight: 600 }}>Global Audit Trail</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Event</th><th>Description</th><th>Status</th><th>Time</th></tr>
            </thead>
            <tbody>
              {globalActivity.map((row, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{row.event}</td>
                  <td>{row.desc}</td>
                  <td><span className={`badge ${row.status}`}>{row.statusText}</span></td>
                  <td>{row.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── BUYER DASHBOARD ─────────────────────────────────────────────────────────
function BuyerDashboard({ count, user }: any) {
  const { data: myDevices } = useQuery({ queryKey: ['buyer-portfolio'], queryFn: () => api.get('/devices/portfolio/my_devices/').then(r => r.data).catch(() => []) })
  const { data: projection } = useQuery({ queryKey: ['buyer-projection'], queryFn: () => api.get('/catalog/my-projection/my_projection/').then(r => r.data).catch(() => null) })
  const { data: orders } = useQuery({ queryKey: ['buyer-orders'], queryFn: () => api.get('/routing/orders/').then(r => r.data).catch(() => []) })
  const { data: invoices } = useQuery({ queryKey: ['buyer-invoices'], queryFn: () => api.get('/invoicing/invoices/').then(r => r.data).catch(() => []) })

  const dCount = count(myDevices)
  const cCount = projection?.compatible_product_count ?? 0
  const oCount = count(orders)
  const iCount = count(invoices)

  const ordersData = Array.isArray(orders) ? orders : (orders?.results ?? [])

  const orderVolumeTrend = [
    { day: 'Mon', orders: Math.min(oCount, 3) },
    { day: 'Tue', orders: Math.min(oCount + 1, 5) },
    { day: 'Wed', orders: Math.min(oCount, 4) },
    { day: 'Thu', orders: Math.min(oCount + 2, 7) },
    { day: 'Fri', orders: oCount || 2 },
    { day: 'Sat', orders: Math.max(0, oCount - 1) },
    { day: 'Sun', orders: Math.max(0, oCount - 2) },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Buyer Console — {user?.company_name || 'Retailer Portal'}</div>
          <div className="page-sub">Accessory procurement, device compatibility portfolios, and storefront channels</div>
        </div>
        <Link to="/devices" className="btn btn-primary">
          <Smartphone size={14} /> Manage My Devices
        </Link>
      </div>

      <div className="card-grid card-grid-4" style={{ marginBottom: 24 }}>
        <StatCard icon={Smartphone} label="My Device Portfolio" value={dCount} sub="compatible targets" color="var(--accent)" linkTo="/devices" />
        <StatCard icon={ShoppingBag} label="Compatible Accessories" value={cCount} sub="available in catalog" color="var(--purple)" linkTo="/catalog" />
        <StatCard icon={Package} label="Orders Placed" value={oCount} sub="tracked packages" color="var(--green)" linkTo="/orders" />
        <StatCard icon={ReceiptText} label="Procurement Invoices" value={iCount} sub="issued total" color="var(--amber)" linkTo="/invoicing" />
      </div>

      <div className="card-grid card-grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <span className="section-title" style={{ fontSize: 15, fontWeight: 600 }}>My Weekly Order Volume</span>
            <span className="badge badge-blue"><TrendingUp size={10} /> Scoped Placed</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={orderVolumeTrend}>
              <defs>
                <linearGradient id="buyerOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" stroke="var(--text-muted)" />
              <YAxis stroke="var(--text-muted)" />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
              <Area type="monotone" dataKey="orders" stroke="var(--accent)" strokeWidth={2} fill="url(#buyerOrders)" name="Orders" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="section-header" style={{ marginBottom: 16 }}>
            <span className="section-title" style={{ fontSize: 15, fontWeight: 600 }}>Quick Actions</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Link to="/catalog" className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: 12 }}>
              <ShoppingBag size={16} color="var(--purple)" />
              <div style={{ textAlign: 'left', marginLeft: 8 }}>
                <div style={{ fontWeight: 650 }}>Export Selection Catalog</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Generate CSV/JSON/XLSX compatibility exports</div>
              </div>
            </Link>
            <Link to="/devices" className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: 12 }}>
              <Smartphone size={16} color="var(--accent)" />
              <div style={{ textAlign: 'left', marginLeft: 8 }}>
                <div style={{ fontWeight: 650 }}>Review Devices Portfolio</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Update your list of active cell phones & tablets</div>
              </div>
            </Link>
            <Link to="/orders" className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: 12 }}>
              <Package size={16} color="var(--green)" />
              <div style={{ textAlign: 'left', marginLeft: 8 }}>
                <div style={{ fontWeight: 650 }}>Track Routed Orders</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Monitor real-time fulfillment status of purchases</div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-header" style={{ marginBottom: 16 }}>
          <span className="section-title" style={{ fontSize: 15, fontWeight: 600 }}>Recent Routed Purchases</span>
        </div>
        <div className="table-wrap">
          {ordersData.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
              No purchase orders found.
            </div>
          ) : (
            <table>
              <thead>
                <tr><th>Order Reference</th><th>SKU</th><th>Quantity</th><th>Routed State</th><th>Created</th></tr>
              </thead>
              <tbody>
                {ordersData.slice(0, 5).map((ord: any) => (
                  <tr key={ord.id}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }} className="mono">{ord.id.slice(0, 8)}…</td>
                    <td className="mono">{ord.sku}</td>
                    <td>{ord.quantity}</td>
                    <td><span className="badge badge-green">{ord.routing_status || 'Routed'}</span></td>
                    <td>{new Date(ord.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── VENDOR DASHBOARD ────────────────────────────────────────────────────────
function VendorDashboard({ count, user }: any) {
  const { data: products } = useQuery({ queryKey: ['vendor-products'], queryFn: () => api.get('/catalog/products/').then(r => r.data).catch(() => []) })
  const { data: orders } = useQuery({ queryKey: ['vendor-orders'], queryFn: () => api.get('/routing/orders/').then(r => r.data).catch(() => []) })
  const { data: relationships } = useQuery({ queryKey: ['vendor-relationships'], queryFn: () => api.get('/tenant/relationships/').then(r => r.data).catch(() => []) })
  const { data: invoices } = useQuery({ queryKey: ['vendor-invoices'], queryFn: () => api.get('/invoicing/invoices/').then(r => r.data).catch(() => []) })

  const pCount = count(products)
  const oCount = count(orders)
  const rCount = count(relationships)
  const iCount = count(invoices)

  const ordersData = Array.isArray(orders) ? orders : (orders?.results ?? [])

  const fulfillData = [
    { day: 'Mon', on_time: 14, late: 1 },
    { day: 'Tue', on_time: 19, late: 0 },
    { day: 'Wed', on_time: 12, late: 2 },
    { day: 'Thu', on_time: 25, late: 1 },
    { day: 'Fri', on_time: 18, late: 3 },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Vendor Portal — {user?.company_name || 'Partner Workspace'}</div>
          <div className="page-sub">Accessory inventory, catalog listings, fulfillment SLA tracking</div>
        </div>
        <Link to="/catalog" className="btn btn-primary">
          <ShoppingBag size={14} /> Add New Product
        </Link>
      </div>

      <div className="card-grid card-grid-4" style={{ marginBottom: 24 }}>
        <StatCard icon={ShoppingBag} label="Listed Accessories" value={pCount} sub="in active catalog" color="var(--purple)" linkTo="/catalog" />
        <StatCard icon={Package} label="Assigned Orders" value={oCount} sub="pending fulfillment" color="var(--green)" linkTo="/orders" />
        <StatCard icon={Building} label="Active Buyers" value={rCount} sub="retailer partnerships" color="var(--accent)" />
        <StatCard icon={ReceiptText} label="Invoices Issued" value={iCount} sub="billing total" color="var(--amber)" linkTo="/invoicing" />
      </div>

      <div className="card-grid card-grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <span className="section-title" style={{ fontSize: 15, fontWeight: 600 }}>Fulfillment SLA Performance</span>
            <span className="badge badge-green">On-time vs Late</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={fulfillData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" stroke="var(--text-muted)" />
              <YAxis stroke="var(--text-muted)" />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
              <Bar dataKey="on_time" fill="var(--green)" radius={[4, 4, 0, 0]} name="On Time" />
              <Bar dataKey="late" fill="var(--red)" radius={[4, 4, 0, 0]} name="Late" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="section-header" style={{ marginBottom: 16 }}>
            <span className="section-title" style={{ fontSize: 15, fontWeight: 600 }}>Fulfillment Quick Actions</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Link to="/catalog" className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: 12 }}>
              <ShoppingBag size={16} color="var(--purple)" />
              <div style={{ textAlign: 'left', marginLeft: 8 }}>
                <div style={{ fontWeight: 650 }}>List New Accessory</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Publish a new accessory SKU with specs & wholesale price</div>
              </div>
            </Link>
            <Link to="/fulfillment" className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: 12 }}>
              <Truck size={16} color="var(--green)" />
              <div style={{ textAlign: 'left', marginLeft: 8 }}>
                <div style={{ fontWeight: 650 }}>Process Shipments</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Update tracking codes, SLA parameters, and return approvals</div>
              </div>
            </Link>
            <Link to="/invoicing" className="btn btn-secondary" style={{ justifyContent: 'flex-start', padding: 12 }}>
              <ReceiptText size={16} color="var(--amber)" />
              <div style={{ textAlign: 'left', marginLeft: 8 }}>
                <div style={{ fontWeight: 650 }}>Generate Invoices</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Create wholesale invoice statements for fulfilled orders</div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-header" style={{ marginBottom: 16 }}>
          <span className="section-title" style={{ fontSize: 15, fontWeight: 600 }}>Incoming Orders to Fulfill</span>
        </div>
        <div className="table-wrap">
          {ordersData.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
              No routing orders assigned.
            </div>
          ) : (
            <table>
              <thead>
                <tr><th>Order Reference</th><th>SKU</th><th>Quantity</th><th>State</th><th>Fulfill By</th></tr>
              </thead>
              <tbody>
                {ordersData.slice(0, 5).map((ord: any) => (
                  <tr key={ord.id}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }} className="mono">{ord.id.slice(0, 8)}…</td>
                    <td className="mono">{ord.sku}</td>
                    <td>{ord.quantity}</td>
                    <td><span className="badge badge-amber">{ord.routing_status || 'Received'}</span></td>
                    <td>{ord.sla_deadline ? new Date(ord.sla_deadline).toLocaleDateString() : 'Immediate'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

