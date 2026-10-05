import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Package, Plus, X, Calendar, User, ShoppingBag, Truck, AlertCircle, CheckCircle2, FileText, Hash, Mail, MapPin, Edit2 } from 'lucide-react'
import api from '../lib/apiClient'
import Pagination, { usePagination } from '../components/Pagination'

const STATUS: Record<string, string> = {
  pending: 'badge-amber', routed: 'badge-green', in_progress: 'badge-blue',
  failed: 'badge-red', cancelled: 'badge-muted', partially_routed: 'badge-amber',
  placed: 'badge-amber', processing: 'badge-blue', shipment_pending: 'badge-amber',
}

const getImageUrl = (path: string | null) => {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const apiBase = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1'
  const host = apiBase.replace('/api/v1', '')
  return `${host}${path}`
}

const DEFAULT_FORM_DATA = {
  buyer_order_number: '',
  buyer_id: '',
  vendor_id: '',
  order_date_time: new Date().toISOString().slice(0, 19),
  first_name: '',
  last_name: '',
  email: '',
  address1: '',
  address2: '',
  city: '',
  state: '',
  zip_code: '',
  sku: '',
  product_name: '',
  vendor_color: '',
  quantity: 1,
  upc: '',
}

export default function OrdersPage() {
  const navigate = useNavigate()
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [showNewOrderModal, setShowNewOrderModal] = useState(false)
  const [inputMode, setInputMode] = useState<'form' | 'json'>('form')
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA)
  const [rawJson, setRawJson] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  // Shipping Modal State
  const [showShippingModal, setShowShippingModal] = useState(false)
  const [shippingError, setShippingError] = useState<string | null>(null)
  const [shippingSuccess, setShippingSuccess] = useState<string | null>(null)
  const [isUpdatingShipping, setIsUpdatingShipping] = useState(false)
  const [pendingExportSubId, setPendingExportSubId] = useState<string | null>(null)
  const [shippingForm, setShippingForm] = useState({
    customer_first_name: '',
    customer_last_name: '',
    email: '',
    address_1: '',
    address_2: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
  })

  // Fetch orders list
  const { data, isLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.get('/routing/orders/', { params: { paginate: 'false' } }).then(r => r.data),
  })
  const orders = data?.results ?? (Array.isArray(data) ? data : [])

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    paginatedItems: paginatedOrders,
  } = usePagination(orders, 50)

  // Fetch detail for selected order
  const { data: orderDetail, refetch: refetchOrderDetail } = useQuery({
    queryKey: ['order-detail', selectedOrderId],
    queryFn: () => api.get(`/routing/orders/${selectedOrderId}/`).then(r => r.data),
    enabled: !!selectedOrderId,
  })

  // Fetch lines/items for selected order
  const { data: orderLines, isLoading: isLoadingLines } = useQuery({
    queryKey: ['order-lines', selectedOrderId],
    queryFn: () => api.get(`/routing/orders/${selectedOrderId}/lines/`).then(r => r.data),
    enabled: !!selectedOrderId,
  })

  // Fetch suborders for selected order
  const { data: suborders, isLoading: isLoadingSubs, refetch: refetchSuborders } = useQuery({
    queryKey: ['order-suborders', selectedOrderId],
    queryFn: () => api.get(`/routing/orders/${selectedOrderId}/suborders/`).then(r => r.data),
    enabled: !!selectedOrderId,
  })

  const handleOpenCreateModal = () => {
    setFormData({
      ...DEFAULT_FORM_DATA,
      buyer_order_number: `ORD-${Date.now().toString().slice(-6)}`,
      order_date_time: new Date().toISOString().slice(0, 19),
    })
    setRawJson('')
    setFormError(null)
    setFormSuccess(null)
    setShowNewOrderModal(true)
  }

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)
    setIsSubmitting(true)

    try {
      let payload: any = {}
      if (inputMode === 'json') {
        try {
          payload = JSON.parse(rawJson)
        } catch (err: any) {
          throw new Error('Invalid JSON payload: ' + err.message)
        }
      } else {
        payload = {
          ...formData,
          quantity: Number(formData.quantity) || 1,
        }
        if (!payload.buyer_id) delete payload.buyer_id
        if (!payload.vendor_id) delete payload.vendor_id
      }

      // Client-side completeness guard
      const fn = (payload.first_name || '').trim()
      const ln = (payload.last_name || '').trim()
      const a1 = (payload.address1 || payload.address_1 || '').trim()
      const ci = (payload.city || '').trim()
      const st = (payload.state || '').trim()
      const zp = (payload.zip_code || payload.zip || '').trim()
      const bon = (payload.buyer_order_number || '').trim()
      const sku = (payload.sku || '').trim()
      const upc = (payload.upc || '').trim()

      if (!bon) throw new Error('Buyer Order Number is required.')
      if (!fn) throw new Error('Customer First Name is required.')
      if (!ln) throw new Error('Customer Last Name is required.')
      if (!a1) throw new Error('Customer Shipping Address (Address Line 1) is required.')
      if (!ci) throw new Error('Customer City is required.')
      if (!st) throw new Error('Customer State is required.')
      if (!zp) throw new Error('Customer Zip Code is required.')
      if (!payload.order_lines && !sku && !upc) throw new Error('Order must include a valid Product SKU or UPC.')

      const res = await api.post('/routing/orders/', payload)
      setFormSuccess('Order created successfully!')
      refetchOrders()
      setTimeout(() => {
        setShowNewOrderModal(false)
        setFormSuccess(null)
        if (res.data?.id) {
          setSelectedOrderId(res.data.id)
        }
      }, 700)
    } catch (err: any) {
      const respData = err.response?.data
      let msg = err.message || 'Failed to create order.'
      if (respData) {
        const detail = respData.detail ?? respData
        if (typeof detail === 'string') {
          msg = detail
        } else if (Array.isArray(detail)) {
          msg = detail.join(' ')
        } else if (typeof detail === 'object') {
          const msgs: string[] = []
          for (const [k, v] of Object.entries(detail)) {
            msgs.push(`${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          }
          msg = msgs.join('; ')
        }
      }
      setFormError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenShippingModal = (errorContext?: string, autoRetrySubId?: string) => {
    const cust = orderDetail?.customer_details || {}
    const subCust = suborders?.[0]?.routing_snapshot?.customer_shipping || {}

    setShippingForm({
      customer_first_name: orderDetail?.first_name || cust.first_name || subCust.customer_first_name || subCust.first_name || '',
      customer_last_name: orderDetail?.last_name || cust.last_name || subCust.customer_last_name || subCust.last_name || '',
      email: orderDetail?.email || cust.email || subCust.email || subCust.customer_email || '',
      address_1: orderDetail?.address1 || cust.address1 || subCust.address_1 || subCust.address1 || '',
      address_2: orderDetail?.address2 || cust.address2 || subCust.address_2 || subCust.address2 || '',
      city: orderDetail?.city || cust.city || subCust.city || '',
      state: orderDetail?.state || cust.state || subCust.state || '',
      zip: orderDetail?.zip_code || cust.zip_code || subCust.zip || subCust.zip_code || '',
      country: subCust.country || 'US',
    })
    setShippingError(errorContext || null)
    setShippingSuccess(null)
    setPendingExportSubId(autoRetrySubId || null)
    setShowShippingModal(true)
  }

  const handleSaveShipping = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrderId) return

    setIsUpdatingShipping(true)
    setShippingError(null)
    setShippingSuccess(null)

    try {
      await api.patch(`/routing/orders/${selectedOrderId}/update-shipping/`, {
        customer_first_name: shippingForm.customer_first_name,
        customer_last_name: shippingForm.customer_last_name,
        email: shippingForm.email,
        address_1: shippingForm.address_1,
        address_2: shippingForm.address_2,
        city: shippingForm.city,
        state: shippingForm.state,
        zip: shippingForm.zip,
        country: shippingForm.country,
      })

      await Promise.all([
        refetchOrders(),
        refetchOrderDetail(),
        refetchSuborders(),
      ])

      if (pendingExportSubId) {
        setShippingSuccess('Shipping updated! Retrying manual export...')
        try {
          await api.post('/routing/orders/manual-export/', {
            suborder_ids: [pendingExportSubId],
            confirm: true,
          })
          setShowShippingModal(false)
          setPendingExportSubId(null)
          alert('Shipping updated and manual export initiated successfully! Redirecting to Fulfillment Export Logs...')
          navigate('/fulfillment?tab=exportLogs', { state: { tab: 'exportLogs' } })
          return
        } catch (exportErr: any) {
          const exportErrDetail = exportErr.response?.data?.detail || 'Failed to auto-retry export after updating shipping.'
          setShippingError(exportErrDetail)
          setIsUpdatingShipping(false)
          return
        }
      }

      setShippingSuccess('Shipping details updated successfully!')
      setTimeout(() => {
        setShowShippingModal(false)
      }, 800)
    } catch (err: any) {
      setShippingError(err.response?.data?.detail || 'Failed to update shipping information.')
    } finally {
      setIsUpdatingShipping(false)
    }
  }

  const handleManualExport = async (subId: string) => {
    if (!confirm('Manually export this suborder to the vendor?')) return

    try {
      await api.post('/routing/orders/manual-export/', { suborder_ids: [subId], confirm: true })
      alert('Manual export initiated successfully! You will now be redirected to the "Export Logs" tab in the Fulfillment page to download the CSV.')
      refetchOrders()
      refetchOrderDetail()
      refetchSuborders()
      navigate('/fulfillment?tab=exportLogs', { state: { tab: 'exportLogs' } })
    } catch (err: any) {
      const errorDetail = err.response?.data?.detail || ''
      const ineligibleSuborders = err.response?.data?.preview?.ineligible_suborders || []
      const errorList = ineligibleSuborders.flatMap((item: any) => item.errors || [])

      const isShippingIssue = errorDetail.toLowerCase().includes('ineligible') || 
        errorList.some((msg: string) => /shipping|address|zip|city|state|customer/i.test(msg))

      if (isShippingIssue) {
        const reason = errorList.length > 0
          ? errorList.join('; ')
          : errorDetail || 'Missing required customer shipping information.'
        handleOpenShippingModal(
          `Export failed: ${reason}. Please supply the customer shipping details below to proceed.`,
          subId
        )
      } else {
        alert(errorDetail || 'Failed to trigger manual export.')
      }
    }
  }

  return (
    <div>
      <style>{`
        .drawer-backdrop {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(4, 6, 12, 0.7);
          backdrop-filter: blur(4px);
          z-index: 1000;
        }
        .drawer-panel {
          position: fixed;
          top: 0; right: 0; bottom: 0;
          width: 580px; max-width: 100%;
          background: var(--bg-surface);
          border-left: 1px solid var(--border);
          z-index: 1001;
          padding: 24px;
          overflow-y: auto;
          box-shadow: -10px 0 40px rgba(0, 0, 0, 0.6);
          display: flex;
          flex-direction: column;
          animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .drawer-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding-bottom: 18px;
          border-bottom: 1px solid var(--border);
          margin-bottom: 24px;
        }
        .drawer-close {
          background: transparent; border: none; cursor: pointer;
          color: var(--text-secondary); padding: 6px; border-radius: var(--radius-sm);
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s;
        }
        .drawer-close:hover {
          background: var(--bg-elevated); color: var(--text-primary);
        }
        .drawer-title {
          font-size: 16px; font-weight: 600; color: var(--text-primary);
        }
        .drawer-subtitle {
          font-size: 11px; color: var(--text-muted); font-family: 'JetBrains Mono', monospace;
          margin-top: 5px;
        }
        .drawer-section {
          margin-bottom: 28px;
        }
        .drawer-section-title {
          font-size: 11px; font-weight: 600; color: var(--text-muted);
          text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 14px;
          display: flex; align-items: center; gap: 8px;
        }
        .detail-card {
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 16px;
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;
        }
        .detail-item {
          display: flex; flex-direction: column; gap: 4px;
        }
        .detail-label {
          font-size: 11px; color: var(--text-muted); font-weight: 500;
        }
        .detail-value {
          font-size: 13px; color: var(--text-secondary);
        }
        .clickable-row {
          cursor: pointer;
          transition: background-color 0.15s ease;
        }
        .clickable-row:hover td {
          background: var(--bg-hover) !important;
          color: var(--text-primary) !important;
        }
      `}</style>

      <div className="page-header">
        <div>
          <div className="page-title">Orders</div>
          <div className="page-sub">Buyer orders and vendor routing specification</div>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreateModal}>
          <Plus size={14} /> New Order
        </button>
      </div>

      <div className="table-wrap">
        {isLoading ? (
          <div className="loading-overlay"><div className="spinner" /></div>
        ) : orders.length === 0 ? (
          <div className="empty-state"><Package size={40} /><div>No orders yet</div></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Buyer Order #</th>
                <th>Buyer</th>
                <th>Placed</th>
                <th>Status</th>
                <th>Customer Name</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((o: any) => (
                <tr key={o.id} onClick={() => setSelectedOrderId(o.id)} className="clickable-row">
                  <td style={{ color: 'var(--accent)', fontWeight: 600 }} className="mono">
                    {o.order_id || `${o.id.slice(0, 8)}…`}
                  </td>
                  <td className="mono" style={{ fontSize: 12, fontWeight: 550, color: 'var(--text-primary)' }}>
                    {o.buyer_order_number || o.buyer_reference || '—'}
                  </td>
                  <td>{o.buyer_name ?? '—'}</td>
                  <td>{new Date(o.order_date_time || o.placed_at).toLocaleDateString()}</td>
                  <td>
                    <span className={`badge ${STATUS[o.status] ?? 'badge-muted'}`}>{o.status}</span>
                  </td>
                  <td>
                    {o.customer_name ?? (o.first_name ? `${o.first_name} ${o.last_name || ''}`.trim() : '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={50}
        onPageChange={setCurrentPage}
        itemName="orders"
      />

      {/* ─── CREATE / INGEST BUYER ORDER MODAL (17 SPEC FIELDS) ────────────────── */}
      {showNewOrderModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: 680, maxWidth: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>New Buyer Order</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Ingest an order matching the 17-field Order Data Specification for Buyers
                </div>
              </div>
              <button className="btn btn-ghost" style={{ padding: 4 }} onClick={() => setShowNewOrderModal(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Mode Toggle */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <button
                type="button"
                className={`btn btn-sm ${inputMode === 'form' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setInputMode('form')}
              >
                Form View
              </button>
              <button
                type="button"
                className={`btn btn-sm ${inputMode === 'json' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => {
                  setInputMode('json')
                  if (!rawJson) {
                    setRawJson(JSON.stringify(formData, null, 2))
                  }
                }}
              >
                Raw JSON
              </button>
            </div>

            {formError && (
              <div style={{ background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid var(--red)', padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid #22c55e', padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={16} />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateOrder} style={{ overflowY: 'auto', flex: 1, paddingRight: 4 }}>
              {inputMode === 'json' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Order Data JSON Payload (17 Fields)
                  </label>
                  <textarea
                    rows={16}
                    value={rawJson}
                    onChange={(e) => setRawJson(e.target.value)}
                    className="input mono"
                    style={{ fontSize: 12, lineHeight: 1.4, resize: 'vertical' }}
                    placeholder="Paste order JSON with vendor_id, first_name, last_name, email, address1, etc."
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Section 1: Order Identifiers */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Hash size={14} style={{ color: 'var(--accent)' }} /> 1. Order Identifiers
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                      <div>
                        <label className="label" style={{ fontSize: 11, fontWeight: 600 }}>Buyer Order Number *</label>
                        <input
                          type="text"
                          required
                          className="input"
                          value={formData.buyer_order_number}
                          onChange={e => setFormData({ ...formData, buyer_order_number: e.target.value })}
                          placeholder="e.g. ORD-100234"
                        />
                      </div>
                      <div>
                        <label className="label" style={{ fontSize: 11, fontWeight: 600 }}>Buyer ID (Optional UUID)</label>
                        <input
                          type="text"
                          className="input mono"
                          value={formData.buyer_id}
                          onChange={e => setFormData({ ...formData, buyer_id: e.target.value })}
                          placeholder="Auto-resolved if omitted"
                        />
                      </div>
                      <div>
                        <label className="label" style={{ fontSize: 11, fontWeight: 600 }}>Order Date Time (UTC)</label>
                        <input
                          type="datetime-local"
                          className="input"
                          value={formData.order_date_time}
                          onChange={e => setFormData({ ...formData, order_date_time: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Shipping & Customer Information */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MapPin size={14} style={{ color: 'var(--accent)' }} /> 2. Customer Shipping Information
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                      <div>
                        <label className="label" style={{ fontSize: 11, fontWeight: 600 }}>First Name *</label>
                        <input
                          type="text"
                          required
                          className="input"
                          value={formData.first_name}
                          onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                          placeholder="e.g. Jane"
                        />
                      </div>
                      <div>
                        <label className="label" style={{ fontSize: 11, fontWeight: 600 }}>Last Name *</label>
                        <input
                          type="text"
                          required
                          className="input"
                          value={formData.last_name}
                          onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                          placeholder="e.g. Doe"
                        />
                      </div>
                      <div>
                        <label className="label" style={{ fontSize: 11, fontWeight: 600 }}>Email *</label>
                        <input
                          type="email"
                          required
                          className="input"
                          value={formData.email}
                          onChange={e => setFormData({ ...formData, email: e.target.value })}
                          placeholder="e.g. jane.doe@example.com"
                        />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label className="label" style={{ fontSize: 11, fontWeight: 600 }}>Address 1 *</label>
                        <input
                          type="text"
                          required
                          className="input"
                          value={formData.address1}
                          onChange={e => setFormData({ ...formData, address1: e.target.value })}
                          placeholder="e.g. 100 Main St"
                        />
                      </div>
                      <div>
                        <label className="label" style={{ fontSize: 11, fontWeight: 600 }}>Address 2</label>
                        <input
                          type="text"
                          className="input"
                          value={formData.address2}
                          onChange={e => setFormData({ ...formData, address2: e.target.value })}
                          placeholder="e.g. Suite 400"
                        />
                      </div>
                      <div>
                        <label className="label" style={{ fontSize: 11, fontWeight: 600 }}>City *</label>
                        <input
                          type="text"
                          required
                          className="input"
                          value={formData.city}
                          onChange={e => setFormData({ ...formData, city: e.target.value })}
                          placeholder="e.g. Austin"
                        />
                      </div>
                      <div>
                        <label className="label" style={{ fontSize: 11, fontWeight: 600 }}>State *</label>
                        <input
                          type="text"
                          required
                          className="input"
                          value={formData.state}
                          onChange={e => setFormData({ ...formData, state: e.target.value })}
                          placeholder="e.g. TX"
                        />
                      </div>
                      <div>
                        <label className="label" style={{ fontSize: 11, fontWeight: 600 }}>Zip Code *</label>
                        <input
                          type="text"
                          required
                          className="input"
                          value={formData.zip_code}
                          onChange={e => setFormData({ ...formData, zip_code: e.target.value })}
                          placeholder="e.g. 78701"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Product Item & Vendor Details */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ShoppingBag size={14} style={{ color: 'var(--accent)' }} /> 3. Product & Vendor Details
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                      <div>
                        <label className="label" style={{ fontSize: 11, fontWeight: 600 }}>Vendor ID (Optional UUID)</label>
                        <input
                          type="text"
                          className="input mono"
                          value={formData.vendor_id}
                          onChange={e => setFormData({ ...formData, vendor_id: e.target.value })}
                          placeholder="Vendor brand UUID"
                        />
                      </div>
                      <div>
                        <label className="label" style={{ fontSize: 11, fontWeight: 600 }}>Product Name *</label>
                        <input
                          type="text"
                          required
                          className="input"
                          value={formData.product_name}
                          onChange={e => setFormData({ ...formData, product_name: e.target.value })}
                          placeholder="e.g. Ultra Grip Phone Case"
                        />
                      </div>
                      <div>
                        <label className="label" style={{ fontSize: 11, fontWeight: 600 }}>SKU *</label>
                        <input
                          type="text"
                          required
                          className="input mono"
                          value={formData.sku}
                          onChange={e => setFormData({ ...formData, sku: e.target.value })}
                          placeholder="e.g. SKU-1001"
                        />
                      </div>
                      <div>
                        <label className="label" style={{ fontSize: 11, fontWeight: 600 }}>Vendor Color</label>
                        <input
                          type="text"
                          className="input"
                          value={formData.vendor_color}
                          onChange={e => setFormData({ ...formData, vendor_color: e.target.value })}
                          placeholder="e.g. Midnight Black"
                        />
                      </div>
                      <div>
                        <label className="label" style={{ fontSize: 11, fontWeight: 600 }}>Quantity *</label>
                        <input
                          type="number"
                          min={1}
                          required
                          className="input"
                          value={formData.quantity}
                          onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                      <div>
                        <label className="label" style={{ fontSize: 11, fontWeight: 600 }}>UPC</label>
                        <input
                          type="text"
                          className="input mono"
                          value={formData.upc}
                          onChange={e => setFormData({ ...formData, upc: e.target.value })}
                          placeholder="e.g. 012345678905"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowNewOrderModal(false)} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating Order...' : 'Submit Buyer Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── ADD / UPDATE SHIPPING MODAL ────────────────── */}
      {showShippingModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1002 }}>
          <div className="card" style={{ width: 560, maxWidth: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Truck size={18} style={{ color: 'var(--accent)' }} />
                  {pendingExportSubId ? 'Add Shipping to Complete Export' : 'Update Customer Shipping'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {pendingExportSubId
                    ? 'This order requires valid customer shipping details before it can be exported to the vendor.'
                    : 'Update the customer shipping address for this placed order.'}
                </div>
              </div>
              <button className="btn btn-ghost" style={{ padding: 4 }} onClick={() => setShowShippingModal(false)}>
                <X size={18} />
              </button>
            </div>

            {shippingError && (
              <div style={{ background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid var(--red)', padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{shippingError}</span>
              </div>
            )}

            {shippingSuccess && (
              <div style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid #22c55e', padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span>{shippingSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveShipping} style={{ overflowY: 'auto', flex: 1, paddingRight: 4, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <div>
                  <label className="label" style={{ fontSize: 11, fontWeight: 600 }}>First Name *</label>
                  <input
                    type="text"
                    required
                    className="input"
                    value={shippingForm.customer_first_name}
                    onChange={e => setShippingForm({ ...shippingForm, customer_first_name: e.target.value })}
                    placeholder="e.g. Jane"
                  />
                </div>
                <div>
                  <label className="label" style={{ fontSize: 11, fontWeight: 600 }}>Last Name *</label>
                  <input
                    type="text"
                    required
                    className="input"
                    value={shippingForm.customer_last_name}
                    onChange={e => setShippingForm({ ...shippingForm, customer_last_name: e.target.value })}
                    placeholder="e.g. Doe"
                  />
                </div>
              </div>

              <div>
                <label className="label" style={{ fontSize: 11, fontWeight: 600 }}>Email (Optional)</label>
                <input
                  type="email"
                  className="input"
                  value={shippingForm.email}
                  onChange={e => setShippingForm({ ...shippingForm, email: e.target.value })}
                  placeholder="e.g. jane.doe@example.com"
                />
              </div>

              <div>
                <label className="label" style={{ fontSize: 11, fontWeight: 600 }}>Address Line 1 *</label>
                <input
                  type="text"
                  required
                  className="input"
                  value={shippingForm.address_1}
                  onChange={e => setShippingForm({ ...shippingForm, address_1: e.target.value })}
                  placeholder="e.g. 123 Main St"
                />
              </div>

              <div>
                <label className="label" style={{ fontSize: 11, fontWeight: 600 }}>Address Line 2</label>
                <input
                  type="text"
                  className="input"
                  value={shippingForm.address_2}
                  onChange={e => setShippingForm({ ...shippingForm, address_2: e.target.value })}
                  placeholder="e.g. Suite 400"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
                <div>
                  <label className="label" style={{ fontSize: 11, fontWeight: 600 }}>City *</label>
                  <input
                    type="text"
                    required
                    className="input"
                    value={shippingForm.city}
                    onChange={e => setShippingForm({ ...shippingForm, city: e.target.value })}
                    placeholder="e.g. Austin"
                  />
                </div>
                <div>
                  <label className="label" style={{ fontSize: 11, fontWeight: 600 }}>State *</label>
                  <input
                    type="text"
                    required
                    className="input"
                    value={shippingForm.state}
                    onChange={e => setShippingForm({ ...shippingForm, state: e.target.value })}
                    placeholder="e.g. TX"
                  />
                </div>
                <div>
                  <label className="label" style={{ fontSize: 11, fontWeight: 600 }}>Zip Code *</label>
                  <input
                    type="text"
                    required
                    className="input"
                    value={shippingForm.zip}
                    onChange={e => setShippingForm({ ...shippingForm, zip: e.target.value })}
                    placeholder="e.g. 78701"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={isUpdatingShipping}
                  onClick={() => setShowShippingModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isUpdatingShipping}
                >
                  {isUpdatingShipping
                    ? (pendingExportSubId ? 'Saving & Exporting...' : 'Saving...')
                    : (pendingExportSubId ? 'Save & Export Now' : 'Save Shipping Details')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slide-over Order Details Drawer */}
      {selectedOrderId && (
        <>
          <div className="drawer-backdrop" onClick={() => setSelectedOrderId(null)} />
          <div className="drawer-panel">
            {/* Header */}
            <div className="drawer-header">
              <div>
                <div className="drawer-title">Order Routing Details</div>
                <div className="drawer-subtitle">{orderDetail?.order_id ? `${orderDetail.order_id} • ${selectedOrderId}` : selectedOrderId}</div>
              </div>
              <button className="drawer-close" onClick={() => setSelectedOrderId(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Metadata Summary */}
            <div className="drawer-section">
              <div className="drawer-section-title"><Package size={14} /> Routing Metadata</div>
              <div className="detail-card">
                <div className="detail-item">
                  <span className="detail-label">Order ID</span>
                  <span className="detail-value mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
                    {orderDetail?.order_id || '—'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status</span>
                  <span className="detail-value">
                    <span className={`badge ${STATUS[orderDetail?.status] ?? 'badge-muted'}`} style={{ marginTop: 2 }}>
                      {orderDetail?.status ?? '...'}
                    </span>
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Buyer Order Number</span>
                  <span className="detail-value mono" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {orderDetail?.buyer_order_number || orderDetail?.buyer_reference || '—'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Order Date Time (UTC)</span>
                  <span className="detail-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                    {orderDetail?.order_date_time
                      ? new Date(orderDetail.order_date_time).toLocaleString()
                      : (orderDetail?.placed_at ? new Date(orderDetail.placed_at).toLocaleString() : '—')
                    }
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Buyer</span>
                  <span className="detail-value" style={{ fontWeight: 500 }}>
                    {orderDetail?.buyer_name ?? '—'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Buyer ID</span>
                  <span className="detail-value mono" style={{ fontSize: 11 }}>
                    <User size={13} style={{ color: 'var(--text-muted)', marginRight: 6, verticalAlign: 'middle' }} />
                    {orderDetail?.buyer_id || orderDetail?.buyer_company_id || '—'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Company Scope</span>
                  <span className="detail-value mono" style={{ fontSize: 11 }}>
                    {orderDetail?.company_scope_reference ?? '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Customer Details Section */}
            <div className="drawer-section">
              <div className="drawer-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <User size={14} /> Customer & Shipping Details
                </span>
                {orderDetail?.status === 'placed' && (
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: 11, padding: '3px 8px', height: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}
                    onClick={() => handleOpenShippingModal()}
                  >
                    <Edit2 size={12} /> Edit Shipping
                  </button>
                )}
              </div>
              <div className="detail-card">
                <div className="detail-item">
                  <span className="detail-label">First Name</span>
                  <span className="detail-value">{orderDetail?.first_name || orderDetail?.customer_details?.first_name || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Last Name</span>
                  <span className="detail-value">{orderDetail?.last_name || orderDetail?.customer_details?.last_name || '—'}</span>
                </div>
                <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                  <span className="detail-label">Email</span>
                  <span className="detail-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Mail size={13} style={{ color: 'var(--text-muted)' }} />
                    {orderDetail?.email || orderDetail?.customer_details?.email || '—'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Address 1</span>
                  <span className="detail-value">{orderDetail?.address1 || orderDetail?.customer_details?.address1 || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Address 2</span>
                  <span className="detail-value">{orderDetail?.address2 || orderDetail?.customer_details?.address2 || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">City</span>
                  <span className="detail-value">{orderDetail?.city || orderDetail?.customer_details?.city || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">State</span>
                  <span className="detail-value">{orderDetail?.state || orderDetail?.customer_details?.state || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Zip Code</span>
                  <span className="detail-value mono">{orderDetail?.zip_code || orderDetail?.customer_details?.zip_code || '—'}</span>
                </div>
              </div>
            </div>

            {/* Items Ordered Section */}
            <div className="drawer-section">
              <div className="drawer-section-title"><ShoppingBag size={14} /> Items Ordered</div>
              {isLoadingLines ? (
                <div className="loading-overlay" style={{ height: 80 }}><div className="spinner" /></div>
              ) : !orderLines || orderLines.length === 0 ? (
                <div className="empty-state" style={{ padding: '20px 0' }}>No line items found.</div>
              ) : (
                <div className="table-wrap" style={{ borderRadius: 'var(--radius-sm)' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Product / SKU</th>
                        <th>Vendor / Details</th>
                        <th style={{ textAlign: 'right' }}>Qty</th>
                        <th style={{ textAlign: 'right' }}>Price</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderLines.map((line: any) => (
                        <tr key={line.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              {line.primary_image_url ? (
                                <img
                                  src={getImageUrl(line.primary_image_url)}
                                  alt={line.product_name}
                                  style={{
                                    width: 40,
                                    height: 40,
                                    objectFit: 'cover',
                                    borderRadius: 6,
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-elevated)',
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 6,
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-elevated)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--text-muted)',
                                  }}
                                >
                                  <Package size={20} />
                                </div>
                              )}
                              <div>
                                <div style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: 13 }}>
                                  {line.product_name}
                                </div>
                                <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                                  SKU: {line.sku} | UPC: {line.upc ?? 'N/A'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                              {(line.vendor_color || line.color) && (
                                <div>Color: <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{line.vendor_color || line.color}</span></div>
                              )}
                              <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                                Vendor: {line.vendor_id ? line.vendor_id.slice(0, 8) + '…' : '—'}
                              </div>
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 500 }}>
                            {line.quantity}
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                            ${line.unit_price_snapshot != null ? Number(line.unit_price_snapshot).toFixed(2) : '0.00'}
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--text-primary)', fontWeight: 500 }}>
                            ${line.line_total != null ? Number(line.line_total).toFixed(2) : '0.00'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Shipping Information Section (8-Field Buyer Shipping Specification) */}
            <div className="drawer-section">
              <div className="drawer-section-title"><Truck size={14} /> Shipping Information</div>
              <div className="detail-card">
                <div className="detail-item">
                  <span className="detail-label">1. Buyer Order Number</span>
                  <span className="detail-value mono" style={{ fontWeight: 600 }}>
                    {orderDetail?.buyer_order_number || orderDetail?.buyer_reference || '—'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">2. Buyer ID</span>
                  <span className="detail-value mono" style={{ fontSize: 11 }}>
                    {orderDetail?.buyer_id || orderDetail?.company_scope_reference || '—'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">3. Vendor Order</span>
                  <span className="detail-value mono">
                    {orderDetail?.vendor_order || '—'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">4. Shipping Carrier</span>
                  <span className="detail-value" style={{ fontWeight: 550, color: 'var(--accent)' }}>
                    {orderDetail?.shipping_carrier || (suborders && suborders[0]?.shipping_carrier) || '—'}
                  </span>
                </div>
                <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                  <span className="detail-label">5. Shipping Tracking Number</span>
                  <span className="detail-value mono" style={{ fontSize: 13, letterSpacing: '0.5px' }}>
                    {orderDetail?.shipping_tracking_number || (suborders && suborders[0]?.tracking_number) || '—'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">6. Order Status</span>
                  <span className="detail-value">
                    <span className={`badge ${STATUS[orderDetail?.status] ?? 'badge-muted'}`}>
                      {orderDetail?.order_status || orderDetail?.status || '—'}
                    </span>
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">7. Shipped Date</span>
                  <span className="detail-value">
                    {orderDetail?.shipped_date || (suborders && suborders[0]?.shipped_date) || '—'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">8. Delivered Date</span>
                  <span className="detail-value">
                    {orderDetail?.delivered_date || (suborders && suborders[0]?.delivered_date) || '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Suborders Section */}
            <div className="drawer-section" style={{ marginBottom: 0 }}>
              <div className="drawer-section-title"><Truck size={14} /> Vendor Suborders</div>
              {isLoadingSubs ? (
                <div className="loading-overlay" style={{ height: 80 }}><div className="spinner" /></div>
              ) : !suborders || suborders.length === 0 ? (
                <div className="empty-state" style={{ padding: '20px 0' }}>No vendor suborders routed.</div>
              ) : (
                <div className="table-wrap" style={{ borderRadius: 'var(--radius-sm)' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Vendor Reference</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suborders.map((sub: any) => (
                        <tr key={sub.id}>
                          <td className="mono" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            {sub.vendor_company_reference}
                          </td>
                          <td>
                            <span className={`badge ${STATUS[sub.status] ?? 'badge-muted'}`}>
                              {sub.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {sub.status === 'placed' && (
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleManualExport(sub.id)
                                }}
                              >
                                Manual Export
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
