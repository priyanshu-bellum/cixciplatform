import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import {
  Smartphone,
  ShoppingBag,
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Info,
  SlidersHorizontal,
  CheckCircle,
  X,
  Loader2,
  AlertCircle,
  Eye
} from 'lucide-react'
import api from '../lib/apiClient'
import toast from 'react-hot-toast'
import axios from 'axios'

const telcoApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'X-API-Key': 'cixci_key_fab27b938452fc44e137592f38f7ada03de80374ecffca3f',
  },
})

interface CartItem {
  id: string
  name: string
  sku: string
  price: number
  qty: number
  primary_image_url?: string
  vendor_company_reference: string
}


function OrderDetailsRow({ order, accessoriesData, refetchOrders, refetchReturns, returns, onReturnClick }: any) {
  const [isOpen, setIsOpen] = useState(false)

  const { data: suborders, isLoading: isSubsLoading, refetch: refetchSuborders } = useQuery({
    queryKey: ['order-suborders', order.id],
    queryFn: () => telcoApi.get(`/routing/orders/${order.id}/suborders/`).then(r => r.data),
    enabled: isOpen,
  })

  const { data: lines, isLoading: isLinesLoading } = useQuery({
    queryKey: ['order-lines', order.id],
    queryFn: () => telcoApi.get(`/routing/orders/${order.id}/lines/`).then(r => r.data),
    enabled: isOpen,
  })

  const mockShipMutation = useMutation({
    mutationFn: async ({ suborderId, sku, status }: { suborderId: string, sku: string, status: 'shipped' | 'delivered' }) => {
      const shippedDate = status === 'shipped' || status === 'delivered' ? '2026-08-01' : '';
      const deliveredDate = status === 'delivered' ? '2026-08-02' : '';
      
      const csvHeader = 'Buyer,First Name,Last Name,Address 1,Address 2,City,State,Zip Code,Suborder,SKU,UPC,Quantity,Vendor Confirmation Number,Shipping Carrier,Shipping Tracking Number,Shipped Date,Delivered Date';
      const csvRow = `Jane,Doe,100 Telco Way,,San Jose,CA,95112,${suborderId},${sku},,,1,CONF123,UPS,1Z12345,${shippedDate},${deliveredDate}`;
      const csvContent = `${csvHeader}\n${csvRow}`;
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const formData = new FormData();
      formData.append('file', blob, 'shipping_update.csv');

      return telcoApi.post('/fulfillment/handoffs/import-shipping/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    },
    onSuccess: () => {
      toast.success('Mock shipping status updated successfully!');
      refetchSuborders();
      refetchOrders();
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to mock ship.';
      toast.error(errMsg);
    }
  })

  const getSuborderStatusClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'shipped': return 'status-badge-shipped';
      case 'delivered': return 'status-badge-delivered';
      case 'processing': return 'status-badge-processing';
      case 'placed': return 'status-badge-placed';
      default: return 'status-badge-pending';
    }
  }

  const formatPlacedDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  return (
    <div className="order-card" style={{ marginBottom: 12 }}>
      <div className="order-card-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="order-card-summary">
          <div className="order-summary-item">
            <span className="order-summary-label">Order Reference</span>
            <span className="order-summary-value mono">{order.id.slice(0, 8).toUpperCase()}...</span>
          </div>
          <div className="order-summary-item">
            <span className="order-summary-label">Placed At</span>
            <span className="order-summary-value">{formatPlacedDate(order.placed_at || order.created_at)}</span>
          </div>
          <div className="order-summary-item">
            <span className="order-summary-label">Overall Status</span>
            <span className={`suborder-status ${getSuborderStatusClass(order.status)}`}>
              {order.status?.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="order-summary-item">
            <span className="order-summary-label">Buyer Name</span>
            <span className="order-summary-value">{order.buyer_name}</span>
          </div>
        </div>
        <div style={{ color: '#20D1F2', fontSize: 13, fontWeight: 600 }}>
          {isOpen ? 'Collapse ▲' : 'Expand ▼'}
        </div>
      </div>

      {isOpen && (
        <div className="order-card-content">
          {isSubsLoading || isLinesLoading ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              <Loader2 className="spinner" size={16} />
              <span>Loading order components...</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {suborders?.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No routed suborders for this order.</div>
              ) : (
                suborders?.map((sub: any) => {
                  const suborderLines = lines?.filter((line: any) => {
                    const product = accessoriesData?.find((p: any) => p.id === line.product_reference);
                    return !product || product.vendor_company_reference === sub.vendor_company_reference;
                  }) || [];

                  return (
                    <div key={sub.id} className="suborder-section">
                      <div className="suborder-header">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span className="suborder-title">Suborder {sub.id.slice(0, 8).toUpperCase()} (Vendor: {sub.vendor_company_reference.slice(0, 8)})</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            Fulfillment: {sub.fulfillment_channel || 'Standard'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {sub.status !== 'shipped' && sub.status !== 'delivered' && (
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '2px 8px', fontSize: 11 }}
                              disabled={mockShipMutation.isPending}
                              onClick={(e) => {
                                e.stopPropagation();
                                mockShipMutation.mutate({
                                  suborderId: sub.id,
                                  sku: suborderLines[0]?.sku || '',
                                  status: 'shipped'
                                });
                              }}
                            >
                              Mock Ship
                            </button>
                          )}
                          {sub.status === 'shipped' && (
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '2px 8px', fontSize: 11 }}
                              disabled={mockShipMutation.isPending}
                              onClick={(e) => {
                                e.stopPropagation();
                                mockShipMutation.mutate({
                                  suborderId: sub.id,
                                  sku: suborderLines[0]?.sku || '',
                                  status: 'delivered'
                                });
                              }}
                            >
                              Mock Deliver
                            </button>
                          )}
                          <span className={`suborder-status ${getSuborderStatusClass(sub.status)}`}>
                            {sub.status}
                          </span>
                        </div>
                      </div>

                      <table className="lines-table">
                        <thead>
                          <tr>
                            <th>Item Name</th>
                            <th>SKU</th>
                            <th>Quantity</th>
                            <th>Unit Price</th>
                            <th>Total</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {suborderLines.map((line: any) => {
                            const existingReturn = returns?.find(
                              (ret: any) => String(ret.suborder_reference) === String(sub.id) &&
                                            (ret.sku === line.sku || (ret.sku && line.sku && String(ret.sku).trim().toUpperCase() === String(line.sku).trim().toUpperCase()))
                            );

                            const isEligibleForReturn = sub.status === 'shipped' || sub.status === 'delivered';
                            const retStatus = existingReturn?.status ? String(existingReturn.status) : '';
                            const retStatusDisplay = retStatus ? retStatus.replace(/^return_/, '').replace(/_/g, ' ') : '';

                            return (
                              <tr key={line.id}>
                                <td>
                                  <div className="line-product-info">
                                    <div className="line-product-img">
                                      {line.primary_image_url ? (
                                        <img src={line.primary_image_url} alt={line.product_name} />
                                      ) : (
                                        <ShoppingBag size={18} style={{ color: 'var(--text-muted)' }} />
                                      )}
                                    </div>
                                    <span>{line.product_name}</span>
                                  </div>
                                </td>
                                <td className="mono">{line.sku}</td>
                                <td>{line.quantity}</td>
                                <td>${line.unit_price_snapshot.toFixed(2)}</td>
                                <td>${line.line_total.toFixed(2)}</td>
                                <td style={{ textAlign: 'right' }}>
                                  {existingReturn ? (
                                    <span className={`return-badge ${retStatus.includes('refund') ? 'closed' : ''}`}>
                                      Return: {retStatusDisplay} ({existingReturn.ran || 'Pending'})
                                    </span>
                                  ) : isEligibleForReturn ? (
                                    <button
                                      className="btn btn-secondary"
                                      style={{ padding: '4px 10px', fontSize: 12, borderColor: '#20D1F2', color: '#20D1F2' }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onReturnClick(sub.id, line);
                                      }}
                                    >
                                      Request Return
                                    </button>
                                  ) : (
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                      Pending Shipping
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function TelcoCellularPage() {
  const { user } = useAuthStore()

  if (user && user.company_type !== 'buyer') {
    return <Navigate to="/" replace />
  }

  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedDevice, setSelectedDevice] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [maxPrice, setMaxPrice] = useState(250)
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [checkoutResult, setCheckoutResult] = useState<any>(null)

  const [firstName, setFirstName] = useState('Jane')
  const [lastName, setLastName] = useState('Doe')
  const [address1, setAddress1] = useState('100 Telco Way')
  const [address2, setAddress2] = useState('Suite A')
  const [city, setCity] = useState('San Jose')
  const [state, setState] = useState('CA')
  const [zipCode, setZipCode] = useState('95112')

  const [activeTab, setActiveTab] = useState<'browse' | 'orders'>('browse')
  const [returnModalOpen, setReturnModalOpen] = useState(false)
  const [returnTarget, setReturnTarget] = useState<{ suborderId: string, line: any } | null>(null)
  const [returnReason, setReturnReason] = useState('')
  const [returnQty, setReturnQty] = useState(1)

  const [selectedProduct, setSelectedProduct] = useState<any | null>(null)
  const [detailQty, setDetailQty] = useState<number>(1)
  const [detailActiveTab, setDetailActiveTab] = useState<'overview' | 'specs' | 'compatibility'>('overview')
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0)

  const { data: orders, isLoading: isOrdersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['telco-orders'],
    queryFn: () => telcoApi.get('/routing/orders/').then(r => r.data?.results ?? r.data ?? []),
    enabled: activeTab === 'orders',
  })

  const { data: returns, isLoading: isReturnsLoading, refetch: refetchReturns } = useQuery({
    queryKey: ['telco-returns'],
    queryFn: () => telcoApi.get('/fulfillment/return-requests/').then(r => r.data?.results ?? r.data ?? []),
    enabled: activeTab === 'orders',
  })

  const returnMutation = useMutation({
    mutationFn: (payload: any) => telcoApi.post('/fulfillment/return-requests/', payload).then(r => r.data),
    onSuccess: () => {
      toast.success('Return requested successfully!')
      setReturnModalOpen(false)
      setReturnTarget(null)
      setReturnReason('')
      setReturnQty(1)
      refetchReturns()
      refetchOrders()
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to submit return request.'
      toast.error(errMsg)
    }
  })

  const handleRequestReturn = () => {
    if (!returnTarget) return
    returnMutation.mutate({
      suborder_reference: returnTarget.suborderId,
      sku: returnTarget.line.sku,
      upc: returnTarget.line.upc || 'N/A',
      return_quantity: returnQty,
      quantity: returnQty,
      reason: returnReason,
    })
  }
  
  // Fetch active portfolio devices for the compatibility filter
  const { data: portfolio, isLoading: isPortfolioLoading } = useQuery({
    queryKey: ['my-devices'],
    queryFn: () => telcoApi.get('/devices/portfolio/my_devices/').then(r => r.data).catch(() => []),
  })

  // Filter devices to only active ones
  const activeDevices = useMemo(() => {
    return portfolio?.filter((d: any) => d.active_flag) ?? []
  }, [portfolio])

  // Fetch accessories matching search and compatibility
  const { data: accessoriesData, isLoading: isAccessoriesLoading, refetch: refetchAccessories } = useQuery({
    queryKey: ['telco-accessories', search, selectedDevice],
    queryFn: () =>
      telcoApi.get('/catalog/products/', {
        params: {
          product_type: 'accessory',
          search: search || undefined,
          device_id: selectedDevice || undefined,
        },
      }).then(r => r.data?.results ?? r.data ?? []),
  })

  // Local filtering for Category and Price
  const filteredAccessories = useMemo(() => {
    if (!accessoriesData) return []
    return accessoriesData.filter((item: any) => {
      // Category filter
      if (selectedCategory && item.product_category !== selectedCategory) {
        return false
      }
      // Price filter
      const price = Number(item.sale_price || item.msrp || item.vendor_wholesale_price_amount || 0)
      if (price > maxPrice) {
        return false
      }
      return true
    })
  }, [accessoriesData, selectedCategory, maxPrice])

  // Categories list derived from current items for dynamic sidebar options
  const categories = useMemo(() => {
    if (!accessoriesData) return []
    const cats = new Set<string>()
    accessoriesData.forEach((item: any) => {
      if (item.product_category) {
        cats.add(item.product_category)
      }
    })
    return Array.from(cats)
  }, [accessoriesData])

  // Cart operations
  const addToCart = (product: any, qtyToAdd: number = 1) => {
    const price = Number(product.sale_price || product.msrp || product.vendor_wholesale_price_amount || 0)
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + qtyToAdd } : item)
      } else {
        return [
          ...prev,
          {
            id: product.id,
            name: product.name,
            sku: product.sku,
            price,
            qty: qtyToAdd,
            primary_image_url: product.primary_image_url,
            vendor_company_reference: product.vendor_company_reference
          }
        ]
      }
    })
    toast.success(`${product.name} (${qtyToAdd}x) added to cart!`, { duration: 1500 })
    setIsCartOpen(true)
  }

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id))
  }

  const updateQty = (id: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.id === id) {
            const nextQty = item.qty + delta
            return nextQty > 0 ? { ...item, qty: nextQty } : item
          }
          return item
        })
        .filter(item => item.qty > 0)
    )
  }

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  }, [cart])

  // Flat 7.25% mock tax rate for checkout calculations
  const taxRate = 0.0725
  const cartTax = cartSubtotal * taxRate
  const cartTotal = cartSubtotal + cartTax

  // Mutation to place test order
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const checkoutMutation = useMutation({
    mutationFn: (payload: any) => telcoApi.post('/procurement/purchase-orders/', payload).then(r => r.data),
    onSuccess: (data) => {
      setCheckoutResult(data)
      setCheckoutError(null)
      setCart([])
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      toast.success('Test Purchase Order submitted successfully!')
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to place purchase order.'
      setCheckoutError(errMsg)
      toast.error(errMsg, { duration: 5000 })
    }
  })

  const handlePlaceOrder = () => {
    if (cart.length === 0) return

    // Grouping by vendor — standard CIXCI orders require a primary vendor.
    // We take the vendor of the first cart item as the target PO vendor.
    const primaryVendor = cart[0].vendor_company_reference
    const randomPoSuffix = Math.floor(100000 + Math.random() * 900000)

    const payload = {
      vendor_company_reference: primaryVendor,
      po_number: `PO-TELCO-${randomPoSuffix}`,
      currency: 'USD',
      lines: cart.map(item => ({
        product_reference: item.id,
        quantity: item.qty
      })),
      customer_shipping: {
        customer_first_name: firstName,
        customer_last_name: lastName,
        address_1: address1,
        address_2: address2,
        city: city,
        state: state,
        zip: zipCode,
        country: 'US'
      }
    }

    checkoutMutation.mutate(payload)
  }

  return (
    <div className="telco-page-container">
      {/* Dynamic styles to inject telcocellular design palette */}
      <style>{`
        .telco-page-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          color: #f1f5f9;
          font-family: 'Inter', sans-serif;
          position: relative;
          min-height: 100vh;
          background-color: #0b0f19;
          padding: 24px;
          box-sizing: border-box;
        }

        /* ── Header Styling ── */
        .telco-banner {
          background: linear-gradient(135deg, #145C76 0%, #006488 50%, #0c4a60 100%);
          border: 1px solid rgba(32, 209, 242, 0.25);
          border-radius: 12px;
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }
        .telco-banner::after {
          content: '';
          position: absolute;
          width: 200px;
          height: 200px;
          background: rgba(32, 209, 242, 0.15);
          border-radius: 50%;
          top: -50px;
          right: -50px;
          filter: blur(40px);
        }
        .telco-banner-left h1 {
          font-size: 24px;
          font-weight: 800;
          color: #20D1F2;
          margin: 0;
          letter-spacing: -0.5px;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        .telco-banner-left p {
          color: #a5f3fc;
          font-size: 13px;
          margin-top: 4px;
          max-width: 500px;
          opacity: 0.9;
        }

        /* ── Layout grid ── */
        .telco-content {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 20px;
          align-items: start;
        }

        /* ── Sidebar Filters ── */
        .telco-sidebar {
          background: #111827;
          border: 1px solid #1f2d45;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          position: sticky;
          top: 20px;
        }
        .telco-sidebar-title {
          font-size: 14px;
          font-weight: 700;
          color: #20D1F2;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          border-bottom: 1px solid #1f2d45;
          padding-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .telco-filter-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .telco-filter-label {
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
        }
        .telco-select {
          background: #1a2235;
          border: 1px solid #1f2d45;
          border-radius: 6px;
          padding: 8px 12px;
          color: #f1f5f9;
          font-size: 13px;
          outline: none;
          cursor: pointer;
          transition: border-color 0.2s;
        }
        .telco-select:focus {
          border-color: #20D1F2;
        }
        .telco-category-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .telco-category-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 10px;
          background: #1a2235;
          border: 1px solid transparent;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .telco-category-item:hover {
          background: #1e2a40;
          border-color: rgba(32, 209, 242, 0.2);
        }
        .telco-category-item.active {
          background: rgba(32, 209, 242, 0.1);
          border-color: #20D1F2;
          color: #20D1F2;
          font-weight: 600;
        }
        .telco-slider-wrap {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .telco-slider-header {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #94a3b8;
        }
        .telco-range {
          width: 100%;
          accent-color: #20D1F2;
          cursor: pointer;
        }

        /* ── Product Grid ── */
        .telco-grid-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .telco-search-wrap {
          display: flex;
          align-items: center;
          background: #111827;
          border: 1px solid #1f2d45;
          border-radius: 8px;
          padding: 8px 14px;
          gap: 10px;
        }
        .telco-search-wrap input {
          background: transparent;
          border: none;
          color: #f1f5f9;
          font-size: 13px;
          width: 100%;
          outline: none;
        }
        .telco-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 16px;
        }

        /* ── Product Cards ── */
        .telco-card {
          background: rgba(17, 24, 39, 0.6);
          border: 1px solid rgba(32, 209, 242, 0.15);
          border-radius: 10px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          height: 100%;
          position: relative;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(10px);
          cursor: pointer;
          user-select: none;
        }
        .telco-card:hover {
          transform: translateY(-4px);
          border-color: #20D1F2;
          box-shadow: 0 4px 20px rgba(32, 209, 242, 0.15);
        }
        .telco-card-view-hint {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid rgba(32, 209, 242, 0.3);
          color: #20D1F2;
          font-size: 10px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 99px;
          opacity: 0;
          transition: opacity 0.2s ease;
          display: flex;
          align-items: center;
          gap: 4px;
          backdrop-filter: blur(4px);
          z-index: 2;
        }
        .telco-card:hover .telco-card-view-hint {
          opacity: 1;
        }

        /* ── Product Detail View Modal ── */
        .telco-product-detail-modal {
          width: 840px;
          max-width: 95vw;
          max-height: 92vh;
          background: #0f172a;
          border: 1px solid #20D1F2;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(32, 209, 242, 0.15);
          border-radius: 14px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .detail-modal-body {
          padding: 24px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .detail-top-grid {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 24px;
        }
        @media (max-width: 768px) {
          .detail-top-grid {
            grid-template-columns: 1fr;
          }
        }
        .detail-media-gallery {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .detail-main-img-wrap {
          width: 100%;
          height: 260px;
          background: #090d16;
          border: 1px solid #1f2d45;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          position: relative;
          overflow: hidden;
        }
        .detail-main-img-wrap img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
        .detail-thumbnails {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
        }
        .detail-thumb {
          width: 54px;
          height: 54px;
          border-radius: 6px;
          background: #090d16;
          border: 1px solid #1f2d45;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          flex-shrink: 0;
          transition: all 0.2s;
        }
        .detail-thumb.active, .detail-thumb:hover {
          border-color: #20D1F2;
          box-shadow: 0 0 10px rgba(32, 209, 242, 0.3);
        }
        .detail-thumb img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
        .detail-info-pane {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .detail-brand-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          color: #20D1F2;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          background: rgba(32, 209, 242, 0.1);
          padding: 4px 10px;
          border-radius: 6px;
          width: fit-content;
          border: 1px solid rgba(32, 209, 242, 0.2);
        }
        .detail-product-title {
          font-size: 18px;
          font-weight: 800;
          color: #f8fafc;
          line-height: 1.3;
          margin: 0;
        }
        .detail-sku-row {
          display: flex;
          align-items: center;
          gap: 16px;
          font-size: 12px;
          color: #94a3b8;
        }
        .detail-price-card {
          background: #111827;
          border: 1px solid #1f2d45;
          border-radius: 10px;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .detail-price-left {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .detail-price-main {
          font-size: 24px;
          font-weight: 800;
          color: #20D1F2;
        }
        .detail-price-msrp {
          font-size: 13px;
          color: #64748b;
          text-decoration: line-through;
        }
        .detail-save-tag {
          background: rgba(34, 197, 94, 0.15);
          color: #4ade80;
          border: 1px solid rgba(34, 197, 94, 0.3);
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 4px;
        }
        .detail-specs-quick {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .detail-quick-pill {
          font-size: 11px;
          color: #cbd5e1;
          background: #1e293b;
          border: 1px solid #334155;
          padding: 4px 10px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .detail-actions-row {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-top: 6px;
        }
        .detail-qty-picker {
          display: flex;
          align-items: center;
          background: #111827;
          border: 1px solid #1f2d45;
          border-radius: 8px;
          height: 42px;
          overflow: hidden;
        }
        .detail-qty-btn {
          width: 36px;
          height: 100%;
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s;
        }
        .detail-qty-btn:hover {
          background: #1e293b;
          color: #f1f5f9;
        }
        .detail-qty-input {
          width: 44px;
          text-align: center;
          background: transparent;
          border: none;
          color: #f1f5f9;
          font-weight: 700;
          font-size: 14px;
        }
        .detail-tab-header {
          display: flex;
          border-bottom: 1px solid #1f2d45;
          gap: 8px;
          margin-top: 8px;
        }
        .detail-tab-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
        }
        .detail-tab-btn:hover {
          color: #20D1F2;
        }
        .detail-tab-btn.active {
          color: #20D1F2;
          border-bottom-color: #20D1F2;
        }
        .detail-tab-content {
          background: #111827;
          border: 1px solid #1f2d45;
          border-radius: 10px;
          padding: 18px;
          font-size: 13px;
          color: #cbd5e1;
          line-height: 1.6;
        }
        .detail-specs-table {
          width: 100%;
          border-collapse: collapse;
        }
        .detail-specs-table tr {
          border-bottom: 1px solid #1f2d45;
        }
        .detail-specs-table tr:last-child {
          border-bottom: none;
        }
        .detail-specs-table td {
          padding: 10px 12px;
          font-size: 13px;
        }
        .detail-specs-table td.spec-key {
          color: #94a3b8;
          font-weight: 600;
          width: 40%;
        }
        .detail-specs-table td.spec-val {
          color: #f1f5f9;
        }
        .telco-card-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: #fff;
          font-size: 9px;
          font-weight: 700;
          padding: 3px 6px;
          border-radius: 4px;
          text-transform: uppercase;
          z-index: 2;
        }
        .telco-card-img-wrap {
          height: 140px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0f172a;
          border-radius: 8px;
          margin-bottom: 12px;
          overflow: hidden;
          border: 1px solid #1f2d45;
        }
        .telco-card-img-wrap img {
          max-width: 90%;
          max-height: 120px;
          object-fit: contain;
        }
        .telco-card-name {
          font-size: 13px;
          font-weight: 700;
          color: #f1f5f9;
          line-height: 1.4;
          margin-bottom: 4px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .telco-card-sku {
          font-size: 10px;
          font-family: 'JetBrains Mono', monospace;
          color: #64748b;
          margin-bottom: 8px;
        }
        .telco-card-spec-row {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-bottom: 12px;
        }
        .telco-card-spec-pill {
          font-size: 9px;
          font-weight: 600;
          color: #94a3b8;
          background: #1e293b;
          padding: 2px 6px;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          gap: 3px;
          border: 1px solid #334155;
        }
        .telco-color-swatch {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.2);
        }
        .telco-card-footer {
          margin-top: auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
          border-top: 1px solid #1f2d45;
          padding-top: 10px;
        }
        .telco-price-row {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }
        .telco-sale-price {
          font-size: 16px;
          font-weight: 800;
          color: #20D1F2;
        }
        .telco-msrp-strike {
          font-size: 11px;
          color: #64748b;
          text-decoration: line-through;
        }
        .telco-status-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
        }
        .telco-status-active {
          color: #22c55e;
          font-weight: 600;
        }
        .telco-status-out {
          color: #ef4444;
          font-weight: 600;
        }
        .telco-card-btn {
          width: 100%;
          background: linear-gradient(135deg, #20D1F2 0%, #006488 100%);
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .telco-card-btn:hover {
          filter: brightness(1.1);
        }
        .telco-card-btn:disabled {
          background: #334155;
          color: #64748b;
          cursor: not-allowed;
        }

        /* ── Cart Drawer / Sidebar Panel ── */
        .telco-cart-drawer {
          position: fixed;
          top: 0;
          right: 0;
          width: 380px;
          height: 100vh;
          background: #111827;
          border-left: 1px solid #1f2d45;
          box-shadow: -4px 0 30px rgba(0, 0, 0, 0.5);
          z-index: 999;
          display: flex;
          flex-direction: column;
          transform: translateX(100%);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .telco-cart-drawer.open {
          transform: translateX(0);
        }
        .telco-cart-header {
          padding: 16px 20px;
          border-bottom: 1px solid #1f2d45;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .telco-cart-header h2 {
          font-size: 16px;
          font-weight: 700;
          color: #20D1F2;
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
        }
        .telco-cart-close {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
        }
        .telco-cart-close:hover {
          color: #f1f5f9;
        }
        .telco-cart-items {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .telco-cart-item {
          display: flex;
          gap: 10px;
          background: #1a2235;
          border: 1px solid #1f2d45;
          border-radius: 8px;
          padding: 10px;
          align-items: center;
        }
        .telco-cart-item-img {
          width: 50px;
          height: 50px;
          background: #0f172a;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border: 1px solid #1f2d45;
        }
        .telco-cart-item-img img {
          max-width: 90%;
          max-height: 45px;
          object-fit: contain;
        }
        .telco-cart-item-details {
          flex: 1;
        }
        .telco-cart-item-name {
          font-size: 12px;
          font-weight: 600;
          color: #f1f5f9;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .telco-cart-item-price {
          font-size: 11px;
          color: #20D1F2;
          margin-top: 2px;
          font-weight: 600;
        }
        .telco-cart-item-actions {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
        }
        .telco-qty-controls {
          display: flex;
          align-items: center;
          background: #0f172a;
          border: 1px solid #1f2d45;
          border-radius: 4px;
          overflow: hidden;
        }
        .telco-qty-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px 8px;
          font-size: 10px;
        }
        .telco-qty-btn:hover {
          color: #f1f5f9;
          background: #1e293b;
        }
        .telco-qty-val {
          font-size: 11px;
          font-weight: 600;
          color: #f1f5f9;
          padding: 0 4px;
          min-width: 16px;
          text-align: center;
        }
        .telco-cart-item-remove {
          background: transparent;
          border: none;
          color: #64748b;
          cursor: pointer;
        }
        .telco-cart-item-remove:hover {
          color: #ef4444;
        }
        .telco-cart-footer {
          border-top: 1px solid #1f2d45;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: #0f172a;
        }
        .telco-summary-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: #94a3b8;
        }
        .telco-summary-row.total {
          font-size: 15px;
          font-weight: 700;
          color: #20D1F2;
          border-top: 1px solid #1f2d45;
          padding-top: 8px;
        }
        .telco-checkout-btn {
          width: 100%;
          background: linear-gradient(135deg, #20D1F2 0%, #006488 100%);
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 12px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .telco-checkout-btn:hover {
          filter: brightness(1.1);
        }

        /* ── Checkout Dialog ── */
        .telco-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(10, 13, 20, 0.8);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .telco-modal {
          background: #111827;
          border: 1px solid #1f2d45;
          border-radius: 12px;
          width: 500px;
          max-width: 90vw;
          max-height: 85vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        }
        .telco-modal-header {
          padding: 16px 20px;
          border-bottom: 1px solid #1f2d45;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .telco-modal-header h3 {
          font-size: 15px;
          font-weight: 700;
          color: #20D1F2;
          margin: 0;
        }
        .telco-modal-content {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .telco-modal-close {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
        }
        .telco-modal-close:hover {
          color: #f1f5f9;
        }

        /* ── Floating Cart Trigger ── */
        .telco-cart-trigger {
          position: fixed;
          bottom: 30px;
          right: 30px;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #20D1F2 0%, #006488 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 20px rgba(32, 209, 242, 0.4);
          cursor: pointer;
          z-index: 998;
          transition: transform 0.2s;
        }
        .telco-cart-trigger:hover {
          transform: scale(1.05);
        }
        .telco-cart-badge-count {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #ef4444;
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #111827;
        }

        /* ── Tabs Styling ── */
        .telco-tabs-container {
          display: flex;
          border-bottom: 2px solid #1f2d45;
          margin-bottom: 20px;
          gap: 4px;
        }
        .telco-tab-button {
          background: transparent;
          border: none;
          color: #94a3b8;
          padding: 12px 24px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          position: relative;
          transition: all 0.2s ease-in-out;
          outline: none;
        }
        .telco-tab-button:hover {
          color: #20D1F2;
        }
        .telco-tab-button.active {
          color: #20D1F2;
        }
        .telco-tab-button.active::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 0;
          height: 2px;
          background: #20D1F2;
          box-shadow: 0 0 8px rgba(32, 209, 242, 0.8);
        }

        /* ── Orders Panel Styling ── */
        .orders-panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
        }
        .order-card {
          background: #111827;
          border: 1px solid #1f2d45;
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .order-card:hover {
          border-color: #20D1F2;
          box-shadow: 0 4px 20px rgba(32, 209, 242, 0.05);
        }
        .order-card-header {
          padding: 16px 20px;
          background: rgba(31, 45, 69, 0.2);
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          user-select: none;
        }
        .order-card-summary {
          display: flex;
          align-items: center;
          gap: 24px;
          flex-wrap: wrap;
        }
        .order-summary-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .order-summary-label {
          font-size: 10px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .order-summary-value {
          font-size: 13px;
          font-weight: 600;
          color: #f1f5f9;
        }
        .order-card-content {
          border-top: 1px solid #1f2d45;
          padding: 20px;
          background: rgba(17, 24, 39, 0.5);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .suborder-section {
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 12px;
        }
        .suborder-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          border-bottom: 1px solid #1e293b;
          padding-bottom: 8px;
        }
        .suborder-title {
          font-size: 13px;
          font-weight: 700;
          color: #38bdf8;
        }
        .suborder-status {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 9999px;
        }
        .status-badge-pending { background: rgba(234, 179, 8, 0.15); color: #facc15; }
        .status-badge-processing { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
        .status-badge-shipped { background: rgba(16, 185, 129, 0.15); color: #34d399; }
        .status-badge-delivered { background: rgba(16, 185, 129, 0.25); color: #10b981; }
        .status-badge-cancelled { background: rgba(239, 68, 68, 0.15); color: #f87171; }
        .status-badge-placed { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
        
        .lines-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .lines-table th {
          text-align: left;
          color: #64748b;
          font-weight: 600;
          padding: 8px 12px;
          border-bottom: 1px solid #1e293b;
        }
        .lines-table td {
          padding: 12px;
          border-bottom: 1px solid #1e293b;
          color: #cbd5e1;
        }
        .lines-table tr:last-child td {
          border-bottom: none;
        }
        .line-product-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .line-product-img {
          width: 36px;
          height: 36px;
          border-radius: 4px;
          background: #1e293b;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border: 1px solid #334155;
        }
        .line-product-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .return-badge {
          display: inline-block;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 6px;
          background: rgba(32, 209, 242, 0.1);
          color: #20D1F2;
          border: 1px solid rgba(32, 209, 242, 0.2);
        }
        .return-badge.closed {
          background: rgba(34, 197, 94, 0.1);
          color: #22c55e;
          border-color: rgba(34, 197, 94, 0.2);
        }
        
        .returns-panel {
          background: #111827;
          border: 1px solid #1f2d45;
          border-radius: 12px;
          padding: 24px;
          width: 100%;
          margin-top: 24px;
        }
        .returns-title {
          font-size: 16px;
          font-weight: 700;
          color: #20D1F2;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
      `}</style>

      {/* Page Banner mimicking telcocellular.com/accessories.php header */}
      <div className="telco-banner">
        <div className="telco-banner-left">
          <h1>Telco Cellular Accessories Store</h1>
          <p>
            Simulated MVNO Buyer Catalog integration. Browse and test procurement flows against your company's active device portfolio compatibilities.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={() => setIsCartOpen(true)} style={{ position: 'relative' }}>
          <ShoppingCart size={16} />
          View Cart
          {cart.length > 0 && (
            <span style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              background: '#ef4444',
              color: '#fff',
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '99px',
              fontWeight: 700
            }}>
              {cart.reduce((sum, item) => sum + item.qty, 0)}
            </span>
          )}
        </button>
      </div>

      {/* Tabs Menu */}
      <div className="telco-tabs-container">
        <button
          className={`telco-tab-button ${activeTab === 'browse' ? 'active' : ''}`}
          onClick={() => setActiveTab('browse')}
        >
          Browse Products
        </button>
        <button
          className={`telco-tab-button ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          My Orders & Returns
        </button>
      </div>

      <div className="telco-content">
        {activeTab === 'browse' ? (
          <>
            {/* Left Sidebar Filter Panel */}
            <aside className="telco-sidebar">
              <div className="telco-sidebar-title">
                <SlidersHorizontal size={14} />
                Filter Products
              </div>

              {/* Portfolio Compatibility Selector */}
              <div className="telco-filter-group">
                <label className="telco-filter-label">Device Compatibility</label>
                {isPortfolioLoading ? (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading devices...</div>
                ) : activeDevices.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--amber)', display: 'flex', gap: 6, alignItems: 'center' }}>
                    <AlertCircle size={14} />
                    No devices in portfolio
                  </div>
                ) : (
                  <select
                    className="telco-select"
                    value={selectedDevice}
                    onChange={(e) => setSelectedDevice(e.target.value)}
                  >
                    <option value="">All Portfolio Devices</option>
                    {activeDevices.map((d: any) => (
                      <option key={d.device} value={d.device}>
                        {d.device_name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Category Filter list */}
              <div className="telco-filter-group">
                <label className="telco-filter-label">Category</label>
                <div className="telco-category-list">
                  <div
                    className={`telco-category-item ${selectedCategory === '' ? 'active' : ''}`}
                    onClick={() => setSelectedCategory('')}
                  >
                    All Accessories
                  </div>
                  {categories.map(cat => (
                    <div
                      key={cat}
                      className={`telco-category-item ${selectedCategory === cat ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Range Filter */}
              <div className="telco-filter-group">
                <div className="telco-slider-header">
                  <label className="telco-filter-label">Max Price</label>
                  <span>${maxPrice}</span>
                </div>
                <input
                  type="range"
                  className="telco-range"
                  min="0"
                  max="250"
                  step="5"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                />
              </div>
            </aside>

            {/* Right Main Grid */}
            <div className="telco-grid-container">
              {/* Search bar */}
              <div className="telco-search-wrap">
                <Search size={16} style={{ color: 'var(--text-muted)' }} />
                <input
                  placeholder="Search accessories by name, SKU or brand..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                    onClick={() => setSearch('')}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Catalog products grid */}
              {isAccessoriesLoading ? (
                <div className="loading-overlay">
                  <Loader2 className="spinner" />
                  <span>Loading catalog...</span>
                </div>
              ) : filteredAccessories.length === 0 ? (
                <div className="empty-state card">
                  <ShoppingBag size={40} />
                  <div>No accessories match your current filters</div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Try relaxing your compatibility, search query or price filters.
                  </p>
                </div>
              ) : (
                <div className="telco-grid">
                  {filteredAccessories.map((product: any) => {
                    const srp = Number(product.msrp || 0)
                    const salePrice = Number(product.sale_price || 0)
                    const displayPrice = salePrice > 0 ? salePrice : srp
                    const hasPromo = product.promo_information && product.promo_information.trim() !== ''
                    const badgeText = hasPromo ? product.promo_information : (salePrice > 0 && salePrice < srp ? 'Sale' : '')
                    
                    // Compatibility specs display
                    const specs = []
                    if (product.color) specs.push({ type: 'color', val: product.color })
                    if (product.headphone_jack_compatibility === 'true') specs.push({ label: '3.5mm Jack' })
                    if (product.bluetooth_compatibility) specs.push({ label: `Bluetooth ${product.bluetooth_compatibility}` })
                    if (product.compatible_charging_interface) specs.push({ label: product.compatible_charging_interface })
                    if (product.wireless_charging_compatibility === 'true') specs.push({ label: 'Wireless Charging' })

                    const isOutOfStock = product.status === 'out_of_stock' || product.inventory_level <= 0
                    
                    return (
                      <div
                        className="telco-card"
                        key={product.id}
                        onClick={() => {
                          setSelectedProduct(product)
                          setDetailQty(1)
                          setDetailActiveTab('overview')
                          setActiveImageIndex(0)
                        }}
                      >
                        {badgeText && <div className="telco-card-badge">{badgeText}</div>}
                        <div className="telco-card-view-hint">
                          <Eye size={12} /> View Specs
                        </div>
                        
                        <div className="telco-card-img-wrap">
                          {product.primary_image_url ? (
                            <img src={product.primary_image_url} alt={product.name} />
                          ) : (
                            <ShoppingBag size={32} style={{ color: 'var(--text-muted)' }} />
                          )}
                        </div>

                        <div className="telco-card-name" title={product.name}>
                          {product.name}
                        </div>
                        <div className="telco-card-sku">SKU: {product.sku}</div>

                        <div className="telco-card-spec-row">
                          {specs.map((s, idx) => (
                            <span className="telco-card-spec-pill" key={idx}>
                              {s.type === 'color' && (
                                <span className="telco-color-swatch" style={{ background: s.val.toLowerCase() }} />
                              )}
                              {s.label || s.val}
                            </span>
                          ))}
                        </div>

                        <div className="telco-card-footer">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className="telco-price-row">
                              <span className="telco-sale-price">${displayPrice.toFixed(2)}</span>
                              {salePrice > 0 && salePrice < srp && (
                                <span className="telco-msrp-strike">${srp.toFixed(2)}</span>
                              )}
                            </div>
                            <div className="telco-status-row">
                              {isOutOfStock ? (
                                <span className="telco-status-out">Out of Stock</span>
                              ) : (
                                <span className="telco-status-active">Active ({product.inventory_level || 0})</span>
                              )}
                            </div>
                          </div>

                          <button
                            className="telco-card-btn"
                            disabled={isOutOfStock}
                            onClick={(e) => {
                              e.stopPropagation()
                              addToCart(product)
                            }}
                          >
                            {isOutOfStock ? 'Unavailable' : 'Add to Cart'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ gridColumn: 'span 2', width: '100%' }}>
            <div className="orders-panel">
              <div className="returns-title" style={{ fontSize: 18, marginBottom: 8 }}>
                <ShoppingBag size={20} />
                Your Purchase Orders
              </div>

              {isOrdersLoading ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '24px 0' }}>
                  <Loader2 className="spinner" />
                  <span>Loading your orders...</span>
                </div>
              ) : !orders || orders.length === 0 ? (
                <div className="empty-state card" style={{ padding: 40, textAlign: 'center' }}>
                  <ShoppingBag size={40} />
                  <div>No purchase orders found</div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Place an order using the accessory shop to see it here!
                  </p>
                </div>
              ) : (
                orders.map((order: any) => (
                  <OrderDetailsRow
                    key={order.id}
                    order={order}
                    accessoriesData={accessoriesData}
                    refetchOrders={refetchOrders}
                    refetchReturns={refetchReturns}
                    returns={returns}
                    onReturnClick={(suborderId: string, line: any) => {
                      setReturnTarget({ suborderId, line });
                      setReturnQty(1);
                      setReturnReason('');
                      setReturnModalOpen(true);
                    }}
                  />
                ))
              )}
            </div>

            {/* Returns Tracking Section */}
            <div className="returns-panel">
              <div className="returns-title">
                <CheckCircle size={18} />
                Return Requests History
              </div>
              {isReturnsLoading ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  <Loader2 className="spinner" size={16} />
                  <span>Loading return history...</span>
                </div>
              ) : !returns || returns.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 0' }}>
                  No return requests submitted yet.
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="lines-table">
                    <thead>
                      <tr>
                        <th>RAN</th>
                        <th>Suborder ID</th>
                        <th>SKU</th>
                        <th>Quantity</th>
                        <th>Reason</th>
                        <th>Status</th>
                        <th>Requested Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {returns.map((ret: any) => {
                        const subRefStr = ret.suborder_reference ? String(ret.suborder_reference) : ''
                        const subRefDisplay = subRefStr ? `${subRefStr.slice(0, 8)}...` : 'N/A'
                        const rawStatus = ret.status ? String(ret.status) : 'return_sent_to_vendor'
                        const statusDisplay = rawStatus.replace(/^return_/, '').replace(/_/g, ' ')
                        const displayQty = ret.return_quantity ?? ret.quantity ?? 1

                        return (
                          <tr key={ret.id || Math.random()}>
                            <td className="mono" style={{ color: '#20D1F2', fontWeight: 600 }}>{ret.ran || 'N/A'}</td>
                            <td className="mono">{subRefDisplay}</td>
                            <td className="mono">{ret.sku || 'N/A'}</td>
                            <td>{displayQty}</td>
                            <td>{ret.reason || 'N/A'}</td>
                            <td>
                              <span className={`suborder-status ${rawStatus.includes('refund') ? 'status-badge-delivered' : 'status-badge-pending'}`}>
                                {statusDisplay}
                              </span>
                            </td>
                            <td>{ret.created_at ? new Date(ret.created_at).toLocaleDateString() : new Date().toLocaleDateString()}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Return Request Modal */}
      {returnModalOpen && returnTarget && (
        <div className="telco-overlay" onClick={() => setReturnModalOpen(false)}>
          <div className="telco-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <div className="telco-modal-header">
              <h3>Submit Return Request</h3>
              <button className="telco-modal-close" onClick={() => setReturnModalOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="telco-modal-content" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                You are requesting a return for item <strong style={{ color: '#20D1F2' }}>{returnTarget.line.product_name}</strong>.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>SKU</span>
                  <span className="mono" style={{ fontSize: 13 }}>{returnTarget.line.sku}</span>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Ordered Qty</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{returnTarget.line.quantity}</span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Return Quantity</label>
                <input
                  type="number"
                  min="1"
                  max={returnTarget.line.quantity}
                  className="telco-select"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  value={returnQty}
                  onChange={e => setReturnQty(Math.min(returnTarget.line.quantity, Math.max(1, Number(e.target.value))))}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Reason for Return</label>
                <textarea
                  className="telco-select"
                  style={{ width: '100%', minHeight: 80, padding: 8, boxSizing: 'border-box', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: '#f1f5f9', fontFamily: 'inherit', fontSize: 13 }}
                  placeholder="Describe why you want to return this product..."
                  value={returnReason}
                  onChange={e => setReturnReason(e.target.value)}
                />
              </div>

              <button
                className="telco-checkout-btn"
                style={{ marginTop: 8 }}
                disabled={returnMutation.isPending}
                onClick={handleRequestReturn}
              >
                {returnMutation.isPending ? (
                  <>
                    <Loader2 className="spinner" size={14} />
                    Submitting request...
                  </>
                ) : (
                  'Submit Return Request'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Cart Trigger Button */}
      {cart.length > 0 && (
        <div className="telco-cart-trigger" onClick={() => setIsCartOpen(true)}>
          <ShoppingCart size={24} style={{ color: '#fff' }} />
          <span className="telco-cart-badge-count">
            {cart.reduce((sum, item) => sum + item.qty, 0)}
          </span>
        </div>
      )}

      {/* Cart Drawer Sliding Panel */}
      <div className={`telco-cart-drawer ${isCartOpen ? 'open' : ''}`}>
        <div className="telco-cart-header">
          <h2>
            <ShoppingCart size={18} />
            Your Cart
          </h2>
          <button className="telco-cart-close" onClick={() => setIsCartOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="telco-cart-items">
          {cart.length === 0 ? (
            <div className="empty-state" style={{ height: '100%' }}>
              <ShoppingCart size={32} />
              <div>Your cart is empty</div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Browse accessories and add them here to test procurement.</p>
            </div>
          ) : (
            cart.map(item => (
              <div className="telco-cart-item" key={item.id}>
                <div className="telco-cart-item-img">
                  {item.primary_image_url ? (
                    <img src={item.primary_image_url} alt={item.name} />
                  ) : (
                    <ShoppingBag size={20} style={{ color: 'var(--text-muted)' }} />
                  )}
                </div>
                <div className="telco-cart-item-details">
                  <div className="telco-cart-item-name" title={item.name}>{item.name}</div>
                  <div className="telco-cart-item-price">${(item.price * item.qty).toFixed(2)}</div>
                </div>
                <div className="telco-cart-item-actions">
                  <div className="telco-qty-controls">
                    <button className="telco-qty-btn" onClick={() => updateQty(item.id, -1)}><Minus size={10} /></button>
                    <span className="telco-qty-val">{item.qty}</span>
                    <button className="telco-qty-btn" onClick={() => updateQty(item.id, 1)}><Plus size={10} /></button>
                  </div>
                  <button className="telco-cart-item-remove" onClick={() => removeFromCart(item.id)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="telco-cart-footer">
            <div className="telco-summary-row">
              <span>Subtotal</span>
              <span>${cartSubtotal.toFixed(2)}</span>
            </div>
            <div className="telco-summary-row">
              <span>Estimated Tax (7.25%)</span>
              <span>${cartTax.toFixed(2)}</span>
            </div>
            <div className="telco-summary-row total">
              <span>Total</span>
              <span>${cartTotal.toFixed(2)}</span>
            </div>

            <button
              className="telco-checkout-btn"
              disabled={checkoutMutation.isPending}
              onClick={() => {
                setIsCartOpen(false)
                setCheckoutError(null)
                setIsCheckoutOpen(true)
              }}
            >
              Proceed to Test Checkout
            </button>
          </div>
        )}
      </div>

      {/* Checkout/Order confirmation modal */}
      {isCheckoutOpen && (
        <div className="telco-overlay" onClick={() => setIsCheckoutOpen(false)}>
          <div className="telco-modal" onClick={e => e.stopPropagation()}>
            <div className="telco-modal-header">
              <h3>Confirm Test Purchase Order</h3>
              <button className="telco-modal-close" onClick={() => setIsCheckoutOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="telco-modal-content">
              {checkoutResult ? (
                // Success State
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', textAlign: 'center', padding: '10px 0' }}>
                  <CheckCircle size={44} style={{ color: '#22c55e' }} />
                  <h4 style={{ color: '#f1f5f9', fontWeight: 700 }}>Order Submitted Successfully!</h4>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    Your simulated order has been registered as a Purchase Order in the CIXCI coordination layer.
                  </p>
                  
                  <div className="table-wrap" style={{ width: '100%', padding: 12, background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                      <span style={{ color: 'var(--text-muted)' }}>PO Number:</span>
                      <strong className="mono" style={{ color: '#20D1F2' }}>{checkoutResult.po_number}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Order ID:</span>
                      <span className="mono">{checkoutResult.id}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                      <span className="badge badge-amber">{checkoutResult.status?.replace(/_/g, ' ')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Total Amount:</span>
                      <strong>${Number(checkoutResult.total_amount).toFixed(2)}</strong>
                    </div>
                  </div>

                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setIsCheckoutOpen(false)
                      setCheckoutResult(null)
                    }}
                    style={{ marginTop: 10 }}
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                // Checkout confirmation state
                <>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    You are placing a simulated procurement Purchase Order for testing purposes.
                  </div>

                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    background: 'var(--bg-elevated)',
                    padding: 12,
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    marginTop: 10
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
                      Shipping Address (Test Customer)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>First Name</label>
                        <input
                          className="telco-select"
                          style={{ width: '100%', boxSizing: 'border-box' }}
                          value={firstName}
                          onChange={e => setFirstName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Last Name</label>
                        <input
                          className="telco-select"
                          style={{ width: '100%', boxSizing: 'border-box' }}
                          value={lastName}
                          onChange={e => setLastName(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Address Line 1</label>
                      <input
                        className="telco-select"
                        style={{ width: '100%', boxSizing: 'border-box' }}
                        value={address1}
                        onChange={e => setAddress1(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Address Line 2 (Opt)</label>
                      <input
                        className="telco-select"
                        style={{ width: '100%', boxSizing: 'border-box' }}
                        value={address2}
                        onChange={e => setAddress2(e.target.value)}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px', gap: 8 }}>
                      <div>
                        <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>City</label>
                        <input
                          className="telco-select"
                          style={{ width: '100%', boxSizing: 'border-box' }}
                          value={city}
                          onChange={e => setCity(e.target.value)}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>State</label>
                        <input
                          className="telco-select"
                          style={{ width: '100%', boxSizing: 'border-box' }}
                          value={state}
                          onChange={e => setState(e.target.value.toUpperCase())}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Zip Code</label>
                        <input
                          className="telco-select"
                          style={{ width: '100%', boxSizing: 'border-box' }}
                          value={zipCode}
                          onChange={e => setZipCode(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {checkoutError && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8 }}>
                      <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: '#fca5a5' }}>{checkoutError}</span>
                    </div>
                  )}
                  
                  <div className="table-wrap" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Qty</th>
                          <th style={{ textAlign: 'right' }}>Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cart.map(item => (
                          <tr key={item.id}>
                            <td style={{ fontSize: 12 }}>{item.name}</td>
                            <td>{item.qty}</td>
                            <td style={{ textAlign: 'right', fontSize: 12 }}>${(item.price * item.qty).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="divider" style={{ margin: '4px 0' }} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Subtotal:</span>
                      <span>${cartSubtotal.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Estimated Tax (7.25%):</span>
                      <span>${cartTax.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: '#20D1F2' }}>
                      <span>Total:</span>
                      <span>${cartTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    className="telco-checkout-btn"
                    disabled={checkoutMutation.isPending}
                    onClick={() => {
                      setCheckoutError(null)
                      handlePlaceOrder()
                    }}
                    style={{ marginTop: 10 }}
                  >
                    {checkoutMutation.isPending ? (
                      <>
                        <Loader2 className="spinner" style={{ width: 14, height: 14 }} />
                        Submitting PO...
                      </>
                    ) : (
                      'Confirm & Place Order'
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Product Details Modal */}
      {selectedProduct && (
        <div className="telco-overlay" style={{ zIndex: 1050 }} onClick={() => setSelectedProduct(null)}>
          <div className="telco-modal telco-product-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="telco-modal-header" style={{ padding: '16px 24px', borderBottom: '1px solid #1f2d45' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShoppingBag size={20} style={{ color: '#20D1F2' }} />
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0 }}>Product Specifications & Details</h3>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Catalog Reference ID #{String(selectedProduct.id).slice(0, 8)}</span>
                </div>
              </div>
              <button className="telco-modal-close" onClick={() => setSelectedProduct(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="detail-modal-body">
              {/* Top Grid: Media Gallery & Key Info */}
              <div className="detail-top-grid">
                {/* Left Media Gallery */}
                <div className="detail-media-gallery">
                  {(() => {
                    const allImages = [
                      selectedProduct.primary_image_url,
                      ...(Array.isArray(selectedProduct.media_references) ? selectedProduct.media_references : [])
                    ].filter((img): img is string => Boolean(img && typeof img === 'string'))

                    const currentImg = allImages[activeImageIndex] || selectedProduct.primary_image_url

                    return (
                      <>
                        <div className="detail-main-img-wrap">
                          {currentImg ? (
                            <img src={currentImg} alt={selectedProduct.name} />
                          ) : (
                            <ShoppingBag size={72} style={{ color: '#334155' }} />
                          )}
                        </div>

                        {allImages.length > 1 && (
                          <div className="detail-thumbnails">
                            {allImages.map((img, idx) => (
                              <div
                                key={idx}
                                className={`detail-thumb ${activeImageIndex === idx ? 'active' : ''}`}
                                onClick={() => setActiveImageIndex(idx)}
                              >
                                <img src={img} alt={`Thumb ${idx}`} />
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>

                {/* Right Key Information & Purchase Pane */}
                <div className="detail-info-pane">
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {selectedProduct.brand && (
                      <div className="detail-brand-badge">{selectedProduct.brand}</div>
                    )}
                    {selectedProduct.product_category && (
                      <span className="telco-card-spec-pill" style={{ borderColor: '#20D1F2', color: '#20D1F2' }}>
                        {selectedProduct.product_category}
                      </span>
                    )}
                    {selectedProduct.recommended_accessory && (
                      <span className="telco-card-badge" style={{ position: 'static' }}>★ Recommended</span>
                    )}
                  </div>

                  <h2 className="detail-product-title">{selectedProduct.name}</h2>

                  <div className="detail-sku-row">
                    <span>SKU: <strong className="mono" style={{ color: '#f1f5f9' }}>{selectedProduct.sku}</strong></span>
                    {selectedProduct.upc && <span>UPC: <strong className="mono" style={{ color: '#f1f5f9' }}>{selectedProduct.upc}</strong></span>}
                  </div>

                  {/* Price Box */}
                  {(() => {
                    const srp = Number(selectedProduct.msrp || 0)
                    const salePrice = Number(selectedProduct.sale_price || 0)
                    const displayPrice = salePrice > 0 ? salePrice : (srp > 0 ? srp : Number(selectedProduct.vendor_wholesale_price_amount || 0))
                    const savings = salePrice > 0 && srp > salePrice ? srp - salePrice : 0
                    const savingsPct = savings > 0 ? Math.round((savings / srp) * 100) : 0
                    const isOutOfStock = selectedProduct.status === 'out_of_stock' || selectedProduct.inventory_level <= 0

                    return (
                      <>
                        <div className="detail-price-card">
                          <div className="detail-price-left">
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                              <span className="detail-price-main">${displayPrice.toFixed(2)}</span>
                              {salePrice > 0 && srp > salePrice && (
                                <span className="detail-price-msrp">${srp.toFixed(2)}</span>
                              )}
                            </div>
                            <span style={{ fontSize: 11, color: '#64748b' }}>Unit Price (USD)</span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                            {savings > 0 && (
                              <div className="detail-save-tag">
                                Save ${savings.toFixed(2)} ({savingsPct}% OFF)
                              </div>
                            )}
                            <div>
                              {isOutOfStock ? (
                                <span className="telco-status-out">Out of Stock</span>
                              ) : (
                                <span className="telco-status-active" style={{ fontSize: 12 }}>
                                  ✓ In Stock ({selectedProduct.inventory_level || 0} units available)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Quick specs pills */}
                        <div className="detail-specs-quick">
                          {selectedProduct.color && (
                            <span className="detail-quick-pill">
                              <span className="telco-color-swatch" style={{ background: selectedProduct.color.toLowerCase() }} />
                              Color: {selectedProduct.color}
                            </span>
                          )}
                          {selectedProduct.bluetooth_compatibility && (
                            <span className="detail-quick-pill">Bluetooth {selectedProduct.bluetooth_compatibility}</span>
                          )}
                          {selectedProduct.compatible_charging_interface && (
                            <span className="detail-quick-pill">Charging: {selectedProduct.compatible_charging_interface}</span>
                          )}
                          {selectedProduct.wireless_charging_compatibility === 'true' && (
                            <span className="detail-quick-pill">Wireless Charging Ready</span>
                          )}
                          {selectedProduct.headphone_jack_compatibility === 'true' && (
                            <span className="detail-quick-pill">3.5mm Headphone Jack</span>
                          )}
                        </div>

                        {/* Quantity & Cart Action Row */}
                        <div className="detail-actions-row">
                          <div className="detail-qty-picker">
                            <button
                              className="detail-qty-btn"
                              onClick={() => setDetailQty(q => Math.max(1, q - 1))}
                            >
                              <Minus size={14} />
                            </button>
                            <input
                              className="detail-qty-input"
                              value={detailQty}
                              readOnly
                            />
                            <button
                              className="detail-qty-btn"
                              onClick={() => setDetailQty(q => q + 1)}
                            >
                              <Plus size={14} />
                            </button>
                          </div>

                          <button
                            className="telco-checkout-btn"
                            style={{ flex: 1, padding: '12px 20px', height: 42 }}
                            disabled={isOutOfStock}
                            onClick={() => {
                              addToCart(selectedProduct, detailQty)
                            }}
                          >
                            <ShoppingCart size={16} />
                            Add {detailQty} to Cart
                          </button>

                          <button
                            className="btn btn-secondary"
                            style={{ height: 42, padding: '0 18px', borderColor: '#20D1F2', color: '#20D1F2', fontWeight: 600 }}
                            disabled={isOutOfStock}
                            onClick={() => {
                              addToCart(selectedProduct, detailQty)
                              setSelectedProduct(null)
                              setIsCheckoutOpen(true)
                            }}
                          >
                            Buy Now
                          </button>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>

              {/* Bottom Section: Tabs for Overview, Specs, Compatibility */}
              <div>
                <div className="detail-tab-header">
                  <button
                    className={`detail-tab-btn ${detailActiveTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setDetailActiveTab('overview')}
                  >
                    Overview & Description
                  </button>
                  <button
                    className={`detail-tab-btn ${detailActiveTab === 'specs' ? 'active' : ''}`}
                    onClick={() => setDetailActiveTab('specs')}
                  >
                    Technical Specifications
                  </button>
                  <button
                    className={`detail-tab-btn ${detailActiveTab === 'compatibility' ? 'active' : ''}`}
                    onClick={() => setDetailActiveTab('compatibility')}
                  >
                    Device Compatibility ({activeDevices.length})
                  </button>
                </div>

                <div className="detail-tab-content">
                  {detailActiveTab === 'overview' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {selectedProduct.short_description && (
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', borderLeft: '3px solid #20D1F2', paddingLeft: 12 }}>
                          {selectedProduct.short_description}
                        </div>
                      )}

                      <div>
                        <h4 style={{ color: '#f8fafc', fontSize: 14, fontWeight: 700, margin: '0 0 6px 0' }}>Product Description</h4>
                        <p style={{ margin: 0, color: '#94a3b8', whiteSpace: 'pre-line' }}>
                          {selectedProduct.description || 'No detailed description provided for this catalog item.'}
                        </p>
                      </div>

                      {selectedProduct.promo_information && (
                        <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 8, padding: 12 }}>
                          <div style={{ color: '#f59e0b', fontWeight: 700, fontSize: 12, marginBottom: 2 }}>Promotional Offer</div>
                          <div style={{ color: '#fbbf24', fontSize: 13 }}>{selectedProduct.promo_information}</div>
                        </div>
                      )}

                      {selectedProduct.warranty && (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: '#94a3b8' }}>
                          <Info size={14} style={{ color: '#20D1F2' }} />
                          <span>Warranty: <strong style={{ color: '#f1f5f9' }}>{selectedProduct.warranty}</strong></span>
                        </div>
                      )}
                    </div>
                  )}

                  {detailActiveTab === 'specs' && (
                    <table className="detail-specs-table">
                      <tbody>
                        <tr>
                          <td className="spec-key">Product Name</td>
                          <td className="spec-val" style={{ fontWeight: 600 }}>{selectedProduct.name}</td>
                        </tr>
                        <tr>
                          <td className="spec-key">Brand</td>
                          <td className="spec-val">{selectedProduct.brand || 'Generic / Unbranded'}</td>
                        </tr>
                        <tr>
                          <td className="spec-key">Category</td>
                          <td className="spec-val">{selectedProduct.product_category || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td className="spec-key">Product Type</td>
                          <td className="spec-val">{selectedProduct.product_type || 'Accessory'}</td>
                        </tr>
                        <tr>
                          <td className="spec-key">SKU Code</td>
                          <td className="spec-val mono">{selectedProduct.sku}</td>
                        </tr>
                        {selectedProduct.upc && (
                          <tr>
                            <td className="spec-key">UPC Code</td>
                            <td className="spec-val mono">{selectedProduct.upc}</td>
                          </tr>
                        )}
                        {selectedProduct.color && (
                          <tr>
                            <td className="spec-key">Color</td>
                            <td className="spec-val">{selectedProduct.color} {selectedProduct.system_color ? `(${selectedProduct.system_color})` : ''}</td>
                          </tr>
                        )}
                        {selectedProduct.bluetooth_compatibility && (
                          <tr>
                            <td className="spec-key">Bluetooth Version</td>
                            <td className="spec-val">{selectedProduct.bluetooth_compatibility}</td>
                          </tr>
                        )}
                        {selectedProduct.compatible_charging_interface && (
                          <tr>
                            <td className="spec-key">Charging Interface</td>
                            <td className="spec-val">{selectedProduct.compatible_charging_interface}</td>
                          </tr>
                        )}
                        {selectedProduct.wireless_charging_compatibility && (
                          <tr>
                            <td className="spec-key">Wireless Charging</td>
                            <td className="spec-val">{selectedProduct.wireless_charging_compatibility === 'true' ? 'Supported' : selectedProduct.wireless_charging_compatibility}</td>
                          </tr>
                        )}
                        {selectedProduct.headphone_jack_compatibility && (
                          <tr>
                            <td className="spec-key">3.5mm Audio Jack</td>
                            <td className="spec-val">{selectedProduct.headphone_jack_compatibility === 'true' ? 'Yes' : selectedProduct.headphone_jack_compatibility}</td>
                          </tr>
                        )}
                        {selectedProduct.memory_capacity && (
                          <tr>
                            <td className="spec-key">Memory / Storage Capacity</td>
                            <td className="spec-val">{selectedProduct.memory_capacity}</td>
                          </tr>
                        )}
                        {selectedProduct.storage_expansion_compatibility && (
                          <tr>
                            <td className="spec-key">Storage Expansion</td>
                            <td className="spec-val">{selectedProduct.storage_expansion_compatibility}</td>
                          </tr>
                        )}
                        {selectedProduct.compatible_watch_case_size && (
                          <tr>
                            <td className="spec-key">Watch Case Size</td>
                            <td className="spec-val">{selectedProduct.compatible_watch_case_size}</td>
                          </tr>
                        )}
                        {(selectedProduct.length || selectedProduct.width || selectedProduct.height) && (
                          <tr>
                            <td className="spec-key">Dimensions (L × W × H)</td>
                            <td className="spec-val">{selectedProduct.length || 0} × {selectedProduct.width || 0} × {selectedProduct.height || 0} inches</td>
                          </tr>
                        )}
                        {selectedProduct.weight && (
                          <tr>
                            <td className="spec-key">Weight</td>
                            <td className="spec-val">{selectedProduct.weight} oz</td>
                          </tr>
                        )}
                        {selectedProduct.map_price && (
                          <tr>
                            <td className="spec-key">MAP Price</td>
                            <td className="spec-val">${Number(selectedProduct.map_price).toFixed(2)}</td>
                          </tr>
                        )}
                        {selectedProduct.warranty && (
                          <tr>
                            <td className="spec-key">Manufacturer Warranty</td>
                            <td className="spec-val">{selectedProduct.warranty}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}

                  {detailActiveTab === 'compatibility' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>
                        The list below indicates devices in your company's active device portfolio compatible with <strong style={{ color: '#20D1F2' }}>{selectedProduct.name}</strong> based on hardware interfaces, device model matching, and vendor compatibility assertions.
                      </div>

                      {activeDevices.length === 0 ? (
                        <div style={{ padding: 16, textAlign: 'center', background: '#090d16', borderRadius: 8, color: '#64748b' }}>
                          No active devices found in your company portfolio.
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginTop: 6 }}>
                          {activeDevices.map((d: any) => {
                            const isSelectedDevice = selectedDevice && String(d.device) === String(selectedDevice)
                            const isMatchName = selectedProduct.name.toLowerCase().includes(d.device_name?.toLowerCase() || '')

                            return (
                              <div
                                key={d.device}
                                style={{
                                  background: '#090d16',
                                  border: isSelectedDevice || isMatchName ? '1px solid #20D1F2' : '1px solid #1f2d45',
                                  borderRadius: 8,
                                  padding: 10,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 10
                                }}
                              >
                                <Smartphone size={20} style={{ color: isSelectedDevice || isMatchName ? '#20D1F2' : '#64748b' }} />
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9' }}>{d.device_name}</span>
                                  <span style={{ fontSize: 10, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 3 }}>
                                    <CheckCircle size={10} /> Compatible
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
