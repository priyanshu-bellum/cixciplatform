import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import api from '../lib/apiClient'
import axios from 'axios'
import { formatCurrency, formatDate, getImageUrl } from '../lib/formatters'
import { useSnackbar } from '../components/feedback/SnackbarProvider'
import StatusChip from '../components/data-display/StatusChip'
import SearchBar from '../components/forms/SearchBar'
import ConfirmDialog from '../components/feedback/ConfirmDialog'
import { useConfirmDialog } from '../hooks/useConfirmDialog'
import { MONO_FONT } from '../theme/typography'

// MUI Components
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Grid from '@mui/material/Grid'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Drawer from '@mui/material/Drawer'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Slider from '@mui/material/Slider'
import Badge from '@mui/material/Badge'
import Fab from '@mui/material/Fab'
import Tooltip from '@mui/material/Tooltip'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Collapse from '@mui/material/Collapse'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'

// MUI Icons
import SmartphoneIcon from '@mui/icons-material/Smartphone'
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import TuneIcon from '@mui/icons-material/Tune'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CloseIcon from '@mui/icons-material/Close'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined'
import VisibilityIcon from '@mui/icons-material/Visibility'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import StarIcon from '@mui/icons-material/Star'
import LocalOfferIcon from '@mui/icons-material/LocalOffer'

/* ------------------------------------------------------------------ */
/*  Telco brand colour used as accent across the storefront           */
/* ------------------------------------------------------------------ */
const TELCO_CYAN = '#20D1F2'
const TELCO_DARK = '#0b0f19'
const TELCO_PAPER = '#111827'
const TELCO_BORDER = '#1f2d45'
const TELCO_ELEVATED = '#1a2235'

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

/* ================================================================== */
/*  OrderDetailsRow sub-component                                     */
/* ================================================================== */
function OrderDetailsRow({ order, accessoriesData, refetchOrders, refetchReturns, returns, onReturnClick }: any) {
  const [isOpen, setIsOpen] = useState(false)
  const { showSnackbar } = useSnackbar()

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
      showSnackbar('Mock shipping status updated successfully!', 'success')
      refetchSuborders();
      refetchOrders();
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to mock ship.';
      showSnackbar(errMsg, 'error')
    }
  })

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
    <Card
      sx={{
        mb: 1.5,
        bgcolor: TELCO_PAPER,
        borderColor: TELCO_BORDER,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': { borderColor: TELCO_CYAN, boxShadow: `0 4px 20px rgba(32, 209, 242, 0.05)` },
      }}
    >
      {/* Header */}
      <Box
        onClick={() => setIsOpen(!isOpen)}
        sx={{
          px: 2.5,
          py: 2,
          bgcolor: 'rgba(31, 45, 69, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <Box>
            <Typography variant="overline" sx={{ color: 'text.disabled' }}>Order Reference</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: MONO_FONT }}>{order.id.slice(0, 8).toUpperCase()}...</Typography>
          </Box>
          <Box>
            <Typography variant="overline" sx={{ color: 'text.disabled' }}>Placed At</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatPlacedDate(order.placed_at || order.created_at)}</Typography>
          </Box>
          <Box>
            <Typography variant="overline" sx={{ color: 'text.disabled' }}>Overall Status</Typography>
            <Box><StatusChip status={order.status || 'unknown'} /></Box>
          </Box>
          <Box>
            <Typography variant="overline" sx={{ color: 'text.disabled' }}>Buyer Name</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{order.buyer_name}</Typography>
          </Box>
        </Stack>
        <Typography variant="body2" sx={{ color: TELCO_CYAN, fontWeight: 600 }}>
          {isOpen ? (
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <span>Collapse</span><ExpandLessIcon fontSize="small" />
            </Stack>
          ) : (
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <span>Expand</span><ExpandMoreIcon fontSize="small" />
            </Stack>
          )}
        </Typography>
      </Box>

      {/* Content */}
      <Collapse in={isOpen}>
        <Box sx={{ borderTop: `1px solid ${TELCO_BORDER}`, p: 2.5, bgcolor: 'rgba(17, 24, 39, 0.5)' }}>
          {isSubsLoading || isLinesLoading ? (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <CircularProgress size={16} sx={{ color: TELCO_CYAN }} />
              <Typography variant="body2" color="text.secondary">Loading order components...</Typography>
            </Stack>
          ) : (
            <Stack spacing={2}>
              {suborders?.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No routed suborders for this order.</Typography>
              ) : (
                suborders?.map((sub: any) => {
                  const suborderLines = lines?.filter((line: any) => {
                    const product = accessoriesData?.find((p: any) => p.id === line.product_reference);
                    return !product || product.vendor_company_reference === sub.vendor_company_reference;
                  }) || [];

                  return (
                    <Paper
                      key={sub.id}
                      variant="outlined"
                      sx={{ bgcolor: '#0f172a', borderColor: '#1e293b', p: 2 }}
                    >
                      {/* Suborder header */}
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          mb: 1.5,
                          borderBottom: '1px solid #1e293b',
                          pb: 1,
                        }}
                      >
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#38bdf8' }}>
                            Suborder {sub.id.slice(0, 8).toUpperCase()} (Vendor: {sub.vendor_company_reference.slice(0, 8)})
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Fulfillment: {sub.fulfillment_channel || 'Standard'}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          {sub.status !== 'shipped' && sub.status !== 'delivered' && (
                            <Button
                              variant="outlined"
                              size="small"
                              disabled={mockShipMutation.isPending}
                              onClick={(e) => {
                                e.stopPropagation();
                                mockShipMutation.mutate({
                                  suborderId: sub.id,
                                  sku: suborderLines[0]?.sku || '',
                                  status: 'shipped'
                                });
                              }}
                              sx={{ fontSize: 11, py: 0.25, px: 1 }}
                            >
                              Mock Ship
                            </Button>
                          )}
                          {sub.status === 'shipped' && (
                            <Button
                              variant="outlined"
                              size="small"
                              disabled={mockShipMutation.isPending}
                              onClick={(e) => {
                                e.stopPropagation();
                                mockShipMutation.mutate({
                                  suborderId: sub.id,
                                  sku: suborderLines[0]?.sku || '',
                                  status: 'delivered'
                                });
                              }}
                              sx={{ fontSize: 11, py: 0.25, px: 1 }}
                            >
                              Mock Deliver
                            </Button>
                          )}
                          <StatusChip status={sub.status} />
                        </Stack>
                      </Box>

                      {/* Lines table */}
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ color: 'text.disabled', fontWeight: 600, borderColor: '#1e293b' }}>Item Name</TableCell>
                              <TableCell sx={{ color: 'text.disabled', fontWeight: 600, borderColor: '#1e293b' }}>SKU</TableCell>
                              <TableCell sx={{ color: 'text.disabled', fontWeight: 600, borderColor: '#1e293b' }}>Quantity</TableCell>
                              <TableCell sx={{ color: 'text.disabled', fontWeight: 600, borderColor: '#1e293b' }}>Unit Price</TableCell>
                              <TableCell sx={{ color: 'text.disabled', fontWeight: 600, borderColor: '#1e293b' }}>Total</TableCell>
                              <TableCell sx={{ color: 'text.disabled', fontWeight: 600, borderColor: '#1e293b', textAlign: 'right' }}>Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {suborderLines.map((line: any) => {
                              const existingReturn = returns?.find(
                                (ret: any) => String(ret.suborder_reference) === String(sub.id) &&
                                              (ret.sku === line.sku || (ret.sku && line.sku && String(ret.sku).trim().toUpperCase() === String(line.sku).trim().toUpperCase()))
                              );

                              const isEligibleForReturn = sub.status === 'shipped' || sub.status === 'delivered';
                              const retStatus = existingReturn?.status ? String(existingReturn.status) : '';
                              const retStatusDisplay = retStatus ? retStatus.replace(/^return_/, '').replace(/_/g, ' ') : '';

                              return (
                                <TableRow key={line.id} sx={{ '&:last-child td': { borderBottom: 'none' } }}>
                                  <TableCell sx={{ borderColor: '#1e293b', color: '#cbd5e1' }}>
                                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                                      <Box
                                        sx={{
                                          width: 36, height: 36, borderRadius: 0.5,
                                          bgcolor: '#1e293b', border: '1px solid #334155',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          overflow: 'hidden', flexShrink: 0,
                                        }}
                                      >
                                        {line.primary_image_url ? (
                                          <Box component="img" src={line.primary_image_url} alt={line.product_name} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                          <ShoppingBagIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                                        )}
                                      </Box>
                                      <Typography variant="body2">{line.product_name}</Typography>
                                    </Stack>
                                  </TableCell>
                                  <TableCell sx={{ borderColor: '#1e293b', color: '#cbd5e1', fontFamily: MONO_FONT }}>{line.sku}</TableCell>
                                  <TableCell sx={{ borderColor: '#1e293b', color: '#cbd5e1' }}>{line.quantity}</TableCell>
                                  <TableCell sx={{ borderColor: '#1e293b', color: '#cbd5e1' }}>{formatCurrency(line.unit_price_snapshot)}</TableCell>
                                  <TableCell sx={{ borderColor: '#1e293b', color: '#cbd5e1' }}>{formatCurrency(line.line_total)}</TableCell>
                                  <TableCell sx={{ borderColor: '#1e293b', textAlign: 'right' }}>
                                    {existingReturn ? (
                                      <Chip
                                        size="small"
                                        label={`Return: ${retStatusDisplay} (${existingReturn.ran || 'Pending'})`}
                                        sx={{
                                          bgcolor: retStatus.includes('refund') ? 'rgba(34, 197, 94, 0.1)' : `rgba(32, 209, 242, 0.1)`,
                                          color: retStatus.includes('refund') ? '#22c55e' : TELCO_CYAN,
                                          border: `1px solid ${retStatus.includes('refund') ? 'rgba(34, 197, 94, 0.2)' : 'rgba(32, 209, 242, 0.2)'}`,
                                          fontWeight: 600,
                                        }}
                                      />
                                    ) : isEligibleForReturn ? (
                                      <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onReturnClick(sub.id, line);
                                        }}
                                        sx={{ fontSize: 12, borderColor: TELCO_CYAN, color: TELCO_CYAN, py: 0.5, px: 1.25 }}
                                      >
                                        Request Return
                                      </Button>
                                    ) : (
                                      <Typography variant="caption" color="text.secondary">
                                        Pending Shipping
                                      </Typography>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Paper>
                  );
                })
              )}
            </Stack>
          )}
        </Box>
      </Collapse>
    </Card>
  )
}

/* ================================================================== */
/*  Main Page Component                                                */
/* ================================================================== */
export default function TelcoCellularPage() {
  const { user } = useAuthStore()

  if (user && user.company_type !== 'buyer') {
    return <Navigate to="/" replace />
  }

  const queryClient = useQueryClient()
  const { showSnackbar } = useSnackbar()
  const { dialogProps, confirm } = useConfirmDialog()

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
      showSnackbar('Return requested successfully!', 'success')
      setReturnModalOpen(false)
      setReturnTarget(null)
      setReturnReason('')
      setReturnQty(1)
      refetchReturns()
      refetchOrders()
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to submit return request.'
      showSnackbar(errMsg, 'error')
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
    queryFn: () => telcoApi.get('/devices/portfolio/my_devices/').then(r => r.data),
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
    showSnackbar(`${product.name} (${qtyToAdd}x) added to cart!`, 'success')
    setIsCartOpen(true)
  }

  const removeFromCart = async (id: string) => {
    const confirmed = await confirm({
      title: 'Remove Item',
      message: 'Are you sure you want to remove this item from your cart?',
      confirmLabel: 'Remove',
      confirmColor: 'error',
    })
    if (confirmed) {
      setCart(prev => prev.filter(item => item.id !== id))
    }
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
      showSnackbar('Test Purchase Order submitted successfully!', 'success')
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to place purchase order.'
      setCheckoutError(errMsg)
      showSnackbar(errMsg, 'error')
    }
  })

  const handlePlaceOrder = () => {
    if (cart.length === 0) return

    // Grouping by vendor -- standard CIXCI orders require a primary vendor.
    // We take the vendor of the first cart item as the target PO vendor.
    const primaryVendor = cart[0].vendor_company_reference
    const randomPoSuffix = Math.floor(100000 + Math.random() * 900000)

    const payload = {
      vendor_company_reference: primaryVendor,
      po_number: `PO-TELCO-${randomPoSuffix}`,
      currency: 'USD',
      lines: cart.map(item => ({
        product_reference: item.id,
        quantity: item.qty,
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

  const cartItemCount = cart.reduce((sum, item) => sum + item.qty, 0)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, minHeight: '100vh', bgcolor: TELCO_DARK, p: 3, boxSizing: 'border-box' }}>

      {/* ── Page Banner ── */}
      <Paper
        elevation={0}
        sx={{
          background: 'linear-gradient(135deg, #145C76 0%, #006488 50%, #0c4a60 100%)',
          border: `1px solid rgba(32, 209, 242, 0.25)`,
          borderRadius: 1.5,
          p: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
          '&::after': {
            content: '""',
            position: 'absolute',
            width: 200,
            height: 200,
            background: 'rgba(32, 209, 242, 0.15)',
            borderRadius: '50%',
            top: -50,
            right: -50,
            filter: 'blur(40px)',
          },
        }}
      >
        <Box>
          <Typography variant="h1" sx={{ color: TELCO_CYAN, fontSize: 24, fontWeight: 800, letterSpacing: -0.5, textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
            Telco Cellular Accessories Store
          </Typography>
          <Typography variant="body2" sx={{ color: '#a5f3fc', mt: 0.5, maxWidth: 500, opacity: 0.9 }}>
            Simulated MVNO Buyer Catalog integration. Browse and test procurement flows against your company's active device portfolio compatibilities.
          </Typography>
        </Box>
        <Badge badgeContent={cartItemCount} color="error" invisible={cartItemCount === 0}>
          <Button
            variant="outlined"
            startIcon={<ShoppingCartIcon />}
            onClick={() => setIsCartOpen(true)}
            sx={{ borderColor: 'rgba(255,255,255,0.3)', color: '#fff', '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.08)' } }}
          >
            View Cart
          </Button>
        </Badge>
      </Paper>

      {/* ── Tabs ── */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{
          borderBottom: `2px solid ${TELCO_BORDER}`,
          '& .MuiTabs-indicator': { bgcolor: TELCO_CYAN, boxShadow: `0 0 8px ${TELCO_CYAN}` },
          '& .MuiTab-root': { color: 'text.secondary', fontWeight: 600, fontSize: 14 },
          '& .Mui-selected': { color: `${TELCO_CYAN} !important` },
        }}
      >
        <Tab label="Browse Products" value="browse" />
        <Tab label="My Orders & Returns" value="orders" />
      </Tabs>

      {/* ── Main Content Area ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: activeTab === 'browse' ? '280px 1fr' : '1fr', gap: 2.5, alignItems: 'start' }}>

        {activeTab === 'browse' ? (
          <>
            {/* ── Left Sidebar Filter Panel ── */}
            <Paper
              variant="outlined"
              sx={{
                bgcolor: TELCO_PAPER,
                borderColor: TELCO_BORDER,
                borderRadius: 1.5,
                p: 2.5,
                display: 'flex',
                flexDirection: 'column',
                gap: 2.5,
                position: 'sticky',
                top: 20,
              }}
            >
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', borderBottom: `1px solid ${TELCO_BORDER}`, pb: 1 }}>
                <TuneIcon sx={{ fontSize: 14, color: TELCO_CYAN }} />
                <Typography variant="overline" sx={{ color: TELCO_CYAN, fontWeight: 700 }}>
                  Filter Products
                </Typography>
              </Stack>

              {/* Device Compatibility Selector */}
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                  Device Compatibility
                </Typography>
                {isPortfolioLoading ? (
                  <Typography variant="caption" color="text.secondary">Loading devices...</Typography>
                ) : activeDevices.length === 0 ? (
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                    <ErrorOutlineIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                    <Typography variant="caption" color="warning.main">No devices in portfolio</Typography>
                  </Stack>
                ) : (
                  <FormControl fullWidth size="small">
                    <Select
                      value={selectedDevice}
                      onChange={(e) => setSelectedDevice(e.target.value)}
                      displayEmpty
                      sx={{
                        bgcolor: TELCO_ELEVATED,
                        borderColor: TELCO_BORDER,
                        color: '#f1f5f9',
                        fontSize: 13,
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: TELCO_BORDER },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: TELCO_CYAN },
                      }}
                    >
                      <MenuItem value="">All Portfolio Devices</MenuItem>
                      {activeDevices.map((d: any) => (
                        <MenuItem key={d.device} value={d.device}>{d.device_name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Box>

              {/* Category Filter list */}
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                  Category
                </Typography>
                <List dense disablePadding>
                  <ListItemButton
                    selected={selectedCategory === ''}
                    onClick={() => setSelectedCategory('')}
                    sx={{
                      borderRadius: 0.75,
                      mb: 0.75,
                      bgcolor: TELCO_ELEVATED,
                      border: '1px solid transparent',
                      '&.Mui-selected': { bgcolor: 'rgba(32, 209, 242, 0.1)', borderColor: TELCO_CYAN, color: TELCO_CYAN },
                      '&:hover': { bgcolor: '#1e2a40', borderColor: 'rgba(32, 209, 242, 0.2)' },
                    }}
                  >
                    <ListItemText primary="All Accessories" slotProps={{ primary: { variant: 'body2', sx: { fontSize: 12 } } }} />
                  </ListItemButton>
                  {categories.map(cat => (
                    <ListItemButton
                      key={cat}
                      selected={selectedCategory === cat}
                      onClick={() => setSelectedCategory(cat)}
                      sx={{
                        borderRadius: 0.75,
                        mb: 0.75,
                        bgcolor: TELCO_ELEVATED,
                        border: '1px solid transparent',
                        '&.Mui-selected': { bgcolor: 'rgba(32, 209, 242, 0.1)', borderColor: TELCO_CYAN, color: TELCO_CYAN, fontWeight: 600 },
                        '&:hover': { bgcolor: '#1e2a40', borderColor: 'rgba(32, 209, 242, 0.2)' },
                      }}
                    >
                      <ListItemText primary={cat} slotProps={{ primary: { variant: 'body2', sx: { fontSize: 12 } } }} />
                    </ListItemButton>
                  ))}
                </List>
              </Box>

              {/* Price Range Filter */}
              <Box>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>Max Price</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>{formatCurrency(maxPrice)}</Typography>
                </Stack>
                <Slider
                  value={maxPrice}
                  min={0}
                  max={250}
                  step={5}
                  onChange={(_, v) => setMaxPrice(v as number)}
                  sx={{
                    color: TELCO_CYAN,
                    '& .MuiSlider-thumb': { width: 16, height: 16 },
                    mt: 1,
                  }}
                />
              </Box>
            </Paper>

            {/* ── Right Main Grid ── */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Search bar */}
              <SearchBar
                placeholder="Search accessories by name, SKU or brand..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{
                  bgcolor: TELCO_PAPER,
                  borderRadius: 1,
                  '& .MuiOutlinedInput-root': { bgcolor: TELCO_PAPER, borderColor: TELCO_BORDER },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: TELCO_BORDER },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: TELCO_CYAN },
                }}
                slotProps={{
                  input: {
                    endAdornment: search ? (
                      <IconButton size="small" onClick={() => setSearch('')}>
                        <CloseIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                      </IconButton>
                    ) : undefined,
                  },
                }}
              />

              {/* Catalog products grid */}
              {isAccessoriesLoading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 8 }}>
                  <CircularProgress sx={{ color: TELCO_CYAN }} />
                  <Typography variant="body2" color="text.secondary">Loading catalog...</Typography>
                </Box>
              ) : filteredAccessories.length === 0 ? (
                <Paper
                  variant="outlined"
                  sx={{ p: 6, textAlign: 'center', bgcolor: TELCO_PAPER, borderColor: TELCO_BORDER }}
                >
                  <ShoppingBagIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>No accessories match your current filters</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Try relaxing your compatibility, search query or price filters.
                  </Typography>
                </Paper>
              ) : (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                    gap: 2,
                  }}
                >
                  {filteredAccessories.map((product: any) => {
                    const srp = Number(product.msrp || 0)
                    const salePrice = Number(product.sale_price || 0)
                    const displayPrice = salePrice > 0 ? salePrice : srp
                    const hasPromo = product.promo_information && product.promo_information.trim() !== ''
                    const badgeText = hasPromo ? product.promo_information : (salePrice > 0 && salePrice < srp ? 'Sale' : '')

                    // Compatibility specs display
                    const specs: { type?: string; val?: string; label?: string }[] = []
                    if (product.color) specs.push({ type: 'color', val: product.color })
                    if (product.headphone_jack_compatibility === 'true') specs.push({ label: '3.5mm Jack' })
                    if (product.bluetooth_compatibility) specs.push({ label: `Bluetooth ${product.bluetooth_compatibility}` })
                    if (product.compatible_charging_interface) specs.push({ label: product.compatible_charging_interface })
                    if (product.wireless_charging_compatibility === 'true') specs.push({ label: 'Wireless Charging' })

                    const isOutOfStock = product.status === 'out_of_stock' || product.inventory_level <= 0

                    return (
                      <Card
                        key={product.id}
                        variant="outlined"
                        onClick={() => {
                          setSelectedProduct(product)
                          setDetailQty(1)
                          setDetailActiveTab('overview')
                          setActiveImageIndex(0)
                        }}
                        sx={{
                          bgcolor: 'rgba(17, 24, 39, 0.6)',
                          borderColor: 'rgba(32, 209, 242, 0.15)',
                          p: 1.75,
                          display: 'flex',
                          flexDirection: 'column',
                          height: '100%',
                          position: 'relative',
                          cursor: 'pointer',
                          userSelect: 'none',
                          backdropFilter: 'blur(10px)',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            borderColor: TELCO_CYAN,
                            boxShadow: `0 4px 20px rgba(32, 209, 242, 0.15)`,
                          },
                          '&:hover .view-hint': { opacity: 1 },
                        }}
                      >
                        {/* Promo badge */}
                        {badgeText && (
                          <Chip
                            label={badgeText}
                            size="small"
                            sx={{
                              position: 'absolute',
                              top: 10,
                              left: 10,
                              zIndex: 2,
                              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                              color: '#fff',
                              fontSize: 9,
                              fontWeight: 700,
                              height: 20,
                              textTransform: 'uppercase',
                            }}
                          />
                        )}

                        {/* View hint */}
                        <Chip
                          className="view-hint"
                          icon={<VisibilityIcon sx={{ fontSize: '12px !important', color: `${TELCO_CYAN} !important` }} />}
                          label="View Specs"
                          size="small"
                          sx={{
                            position: 'absolute',
                            top: 10,
                            right: 10,
                            zIndex: 2,
                            bgcolor: 'rgba(15, 23, 42, 0.85)',
                            border: '1px solid rgba(32, 209, 242, 0.3)',
                            color: TELCO_CYAN,
                            fontSize: 10,
                            fontWeight: 600,
                            height: 22,
                            opacity: 0,
                            transition: 'opacity 0.2s ease',
                            backdropFilter: 'blur(4px)',
                          }}
                        />

                        {/* Image */}
                        <Box
                          sx={{
                            height: 140,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: '#0f172a',
                            borderRadius: 1,
                            mb: 1.5,
                            overflow: 'hidden',
                            border: `1px solid ${TELCO_BORDER}`,
                          }}
                        >
                          {product.primary_image_url ? (
                            <Box component="img" src={getImageUrl(product.primary_image_url)} alt={product.name} sx={{ maxWidth: '90%', maxHeight: 120, objectFit: 'contain' }} />
                          ) : (
                            <ShoppingBagIcon sx={{ fontSize: 32, color: 'text.disabled' }} />
                          )}
                        </Box>

                        <Tooltip title={product.name} placement="top">
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              lineHeight: 1.4,
                              mb: 0.5,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {product.name}
                          </Typography>
                        </Tooltip>

                        <Typography variant="caption" sx={{ fontFamily: MONO_FONT, color: 'text.disabled', mb: 1 }}>
                          SKU: {product.sku}
                        </Typography>

                        {/* Spec pills */}
                        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', mb: 1.5 }}>
                          {specs.map((s, idx) => (
                            <Chip
                              key={idx}
                              size="small"
                              label={
                                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                                  {s.type === 'color' && (
                                    <Box
                                      sx={{
                                        width: 8, height: 8, borderRadius: '50%',
                                        bgcolor: s.val?.toLowerCase(),
                                        border: '1px solid rgba(255,255,255,0.2)',
                                      }}
                                    />
                                  )}
                                  <span>{s.label || s.val}</span>
                                </Stack>
                              }
                              sx={{
                                fontSize: 9,
                                fontWeight: 600,
                                height: 20,
                                color: 'text.secondary',
                                bgcolor: '#1e293b',
                                border: '1px solid #334155',
                              }}
                            />
                          ))}
                        </Stack>

                        {/* Footer */}
                        <Box sx={{ mt: 'auto', borderTop: `1px solid ${TELCO_BORDER}`, pt: 1.25, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'baseline' }}>
                              <Typography sx={{ fontSize: 16, fontWeight: 800, color: TELCO_CYAN }}>
                                {formatCurrency(displayPrice)}
                              </Typography>
                              {salePrice > 0 && salePrice < srp && (
                                <Typography sx={{ fontSize: 11, color: 'text.disabled', textDecoration: 'line-through' }}>
                                  {formatCurrency(srp)}
                                </Typography>
                              )}
                            </Stack>
                            {isOutOfStock ? (
                              <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'error.main' }}>Out of Stock</Typography>
                            ) : (
                              <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'success.main' }}>Active ({product.inventory_level || 0})</Typography>
                            )}
                          </Box>

                          <Button
                            variant="contained"
                            fullWidth
                            disabled={isOutOfStock}
                            onClick={(e) => {
                              e.stopPropagation()
                              addToCart(product)
                            }}
                            sx={{
                              background: isOutOfStock ? undefined : `linear-gradient(135deg, ${TELCO_CYAN} 0%, #006488 100%)`,
                              color: '#fff',
                              fontSize: 12,
                              fontWeight: 600,
                              gap: 0.75,
                              '&:hover': { filter: 'brightness(1.1)' },
                              '&.Mui-disabled': { bgcolor: '#334155', color: '#64748b' },
                            }}
                          >
                            {isOutOfStock ? 'Unavailable' : 'Add to Cart'}
                          </Button>
                        </Box>
                      </Card>
                    )
                  })}
                </Box>
              )}
            </Box>
          </>
        ) : (
          /* ── Orders & Returns Tab ── */
          <Box sx={{ gridColumn: 'span 1', width: '100%' }}>
            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                <ShoppingBagIcon sx={{ fontSize: 20, color: TELCO_CYAN }} />
                <Typography variant="h3" sx={{ color: TELCO_CYAN }}>
                  Your Purchase Orders
                </Typography>
              </Stack>

              {isOrdersLoading ? (
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', py: 3 }}>
                  <CircularProgress size={20} sx={{ color: TELCO_CYAN }} />
                  <Typography variant="body2" color="text.secondary">Loading your orders...</Typography>
                </Stack>
              ) : !orders || orders.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', bgcolor: TELCO_PAPER, borderColor: TELCO_BORDER }}>
                  <ShoppingBagIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>No purchase orders found</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Place an order using the accessory shop to see it here!
                  </Typography>
                </Paper>
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
            </Box>

            {/* Returns Tracking Section */}
            <Paper
              variant="outlined"
              sx={{ bgcolor: TELCO_PAPER, borderColor: TELCO_BORDER, borderRadius: 1.5, p: 3, width: '100%', mt: 3 }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
                <CheckCircleIcon sx={{ fontSize: 18, color: TELCO_CYAN }} />
                <Typography variant="h4" sx={{ color: TELCO_CYAN, fontWeight: 700 }}>
                  Return Requests History
                </Typography>
              </Stack>

              {isReturnsLoading ? (
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <CircularProgress size={16} sx={{ color: TELCO_CYAN }} />
                  <Typography variant="body2" color="text.secondary">Loading return history...</Typography>
                </Stack>
              ) : !returns || returns.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 1.5 }}>
                  No return requests submitted yet.
                </Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: 'text.disabled', fontWeight: 600, borderColor: '#1e293b' }}>RAN</TableCell>
                        <TableCell sx={{ color: 'text.disabled', fontWeight: 600, borderColor: '#1e293b' }}>Suborder ID</TableCell>
                        <TableCell sx={{ color: 'text.disabled', fontWeight: 600, borderColor: '#1e293b' }}>SKU</TableCell>
                        <TableCell sx={{ color: 'text.disabled', fontWeight: 600, borderColor: '#1e293b' }}>Quantity</TableCell>
                        <TableCell sx={{ color: 'text.disabled', fontWeight: 600, borderColor: '#1e293b' }}>Reason</TableCell>
                        <TableCell sx={{ color: 'text.disabled', fontWeight: 600, borderColor: '#1e293b' }}>Status</TableCell>
                        <TableCell sx={{ color: 'text.disabled', fontWeight: 600, borderColor: '#1e293b' }}>Requested Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {returns.map((ret: any) => {
                        const subRefStr = ret.suborder_reference ? String(ret.suborder_reference) : ''
                        const subRefDisplay = subRefStr ? `${subRefStr.slice(0, 8)}...` : 'N/A'
                        const rawStatus = ret.status ? String(ret.status) : 'return_sent_to_vendor'
                        const statusDisplay = rawStatus.replace(/^return_/, '').replace(/_/g, ' ')
                        const displayQty = ret.return_quantity ?? ret.quantity ?? 1

                        return (
                          <TableRow key={ret.id || Math.random()} sx={{ '&:last-child td': { borderBottom: 'none' } }}>
                            <TableCell sx={{ borderColor: '#1e293b', color: TELCO_CYAN, fontWeight: 600, fontFamily: MONO_FONT }}>{ret.ran || 'N/A'}</TableCell>
                            <TableCell sx={{ borderColor: '#1e293b', fontFamily: MONO_FONT, color: '#cbd5e1' }}>{subRefDisplay}</TableCell>
                            <TableCell sx={{ borderColor: '#1e293b', fontFamily: MONO_FONT, color: '#cbd5e1' }}>{ret.sku || 'N/A'}</TableCell>
                            <TableCell sx={{ borderColor: '#1e293b', color: '#cbd5e1' }}>{displayQty}</TableCell>
                            <TableCell sx={{ borderColor: '#1e293b', color: '#cbd5e1' }}>{ret.reason || 'N/A'}</TableCell>
                            <TableCell sx={{ borderColor: '#1e293b' }}>
                              <StatusChip status={rawStatus.includes('refund') ? 'completed' : 'pending'} label={statusDisplay} />
                            </TableCell>
                            <TableCell sx={{ borderColor: '#1e293b', color: '#cbd5e1' }}>
                              {formatDate(ret.created_at || new Date().toISOString())}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Box>
        )}
      </Box>

      {/* ── Return Request Modal ── */}
      <Dialog
        open={returnModalOpen && !!returnTarget}
        onClose={() => setReturnModalOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { bgcolor: TELCO_PAPER, borderColor: TELCO_BORDER, border: `1px solid ${TELCO_BORDER}` } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: TELCO_CYAN, fontWeight: 700 }}>
          Submit Return Request
          <IconButton size="small" onClick={() => setReturnModalOpen(false)} sx={{ color: 'text.secondary' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.75, pt: '8px !important' }}>
          {returnTarget && (
            <>
              <Typography variant="body2" color="text.secondary">
                You are requesting a return for item <Typography component="span" sx={{ color: TELCO_CYAN, fontWeight: 600 }}>{returnTarget.line.product_name}</Typography>.
              </Typography>

              <Grid container spacing={1.5}>
                <Grid size={6}>
                  <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 0.5 }}>SKU</Typography>
                  <Typography variant="body2" sx={{ fontFamily: MONO_FONT }}>{returnTarget.line.sku}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 0.5 }}>Ordered Qty</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{returnTarget.line.quantity}</Typography>
                </Grid>
              </Grid>

              <TextField
                label="Return Quantity"
                type="number"
                size="small"
                fullWidth
                slotProps={{ htmlInput: { min: 1, max: returnTarget.line.quantity } }}
                value={returnQty}
                onChange={e => setReturnQty(Math.min(returnTarget.line.quantity, Math.max(1, Number(e.target.value))))}
                sx={{
                  '& .MuiOutlinedInput-root': { bgcolor: TELCO_ELEVATED },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: TELCO_BORDER },
                }}
              />

              <TextField
                label="Reason for Return"
                multiline
                minRows={3}
                fullWidth
                placeholder="Describe why you want to return this product..."
                value={returnReason}
                onChange={e => setReturnReason(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': { bgcolor: TELCO_ELEVATED },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: TELCO_BORDER },
                }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setReturnModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={returnMutation.isPending}
            onClick={handleRequestReturn}
            startIcon={returnMutation.isPending ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{
              background: `linear-gradient(135deg, ${TELCO_CYAN} 0%, #006488 100%)`,
              color: '#fff',
              '&:hover': { filter: 'brightness(1.1)' },
            }}
          >
            {returnMutation.isPending ? 'Submitting request...' : 'Submit Return Request'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Floating Cart FAB ── */}
      {cart.length > 0 && (
        <Fab
          onClick={() => setIsCartOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 30,
            right: 30,
            background: `linear-gradient(135deg, ${TELCO_CYAN} 0%, #006488 100%)`,
            boxShadow: `0 4px 20px rgba(32, 209, 242, 0.4)`,
            '&:hover': { transform: 'scale(1.05)' },
            zIndex: 998,
          }}
        >
          <Badge badgeContent={cartItemCount} color="error">
            <ShoppingCartIcon sx={{ color: '#fff' }} />
          </Badge>
        </Fab>
      )}

      {/* ── Cart Drawer ── */}
      <Drawer
        anchor="right"
        open={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        slotProps={{ paper: { sx: { width: 380, bgcolor: TELCO_PAPER, borderLeft: `1px solid ${TELCO_BORDER}` } } }}
      >
        {/* Cart Header */}
        <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${TELCO_BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <ShoppingCartIcon sx={{ fontSize: 18, color: TELCO_CYAN }} />
            <Typography variant="h4" sx={{ color: TELCO_CYAN, fontWeight: 700 }}>Your Cart</Typography>
          </Stack>
          <IconButton size="small" onClick={() => setIsCartOpen(false)} sx={{ color: 'text.secondary' }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Cart Items */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {cart.length === 0 ? (
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <ShoppingCartIcon sx={{ fontSize: 32, color: 'text.disabled' }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Your cart is empty</Typography>
              <Typography variant="caption" color="text.secondary">
                Browse accessories and add them here to test procurement.
              </Typography>
            </Box>
          ) : (
            cart.map(item => (
              <Paper
                key={item.id}
                variant="outlined"
                sx={{
                  display: 'flex',
                  gap: 1.25,
                  bgcolor: TELCO_ELEVATED,
                  borderColor: TELCO_BORDER,
                  p: 1.25,
                  alignItems: 'center',
                }}
              >
                {/* Item image */}
                <Box
                  sx={{
                    width: 50, height: 50, bgcolor: '#0f172a',
                    borderRadius: 0.75, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0,
                    border: `1px solid ${TELCO_BORDER}`,
                  }}
                >
                  {item.primary_image_url ? (
                    <Box component="img" src={getImageUrl(item.primary_image_url)} alt={item.name} sx={{ maxWidth: '90%', maxHeight: 45, objectFit: 'contain' }} />
                  ) : (
                    <ShoppingBagIcon sx={{ fontSize: 20, color: 'text.disabled' }} />
                  )}
                </Box>

                {/* Item details */}
                <Box sx={{ flex: 1 }}>
                  <Tooltip title={item.name}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        fontSize: 12,
                      }}
                    >
                      {item.name}
                    </Typography>
                  </Tooltip>
                  <Typography variant="caption" sx={{ color: TELCO_CYAN, fontWeight: 600 }}>
                    {formatCurrency(item.price * item.qty)}
                  </Typography>
                </Box>

                {/* Qty controls & remove */}
                <Stack spacing={0.75} sx={{ alignItems: 'flex-end' }}>
                  <Stack direction="row" sx={{ alignItems: 'center', bgcolor: '#0f172a', border: `1px solid ${TELCO_BORDER}`, borderRadius: 0.5, overflow: 'hidden' }}>
                    <IconButton size="small" onClick={() => updateQty(item.id, -1)} sx={{ borderRadius: 0, width: 28, height: 28, color: 'text.secondary' }}>
                      <RemoveIcon sx={{ fontSize: 12 }} />
                    </IconButton>
                    <Typography variant="body2" sx={{ fontWeight: 600, px: 0.5, minWidth: 16, textAlign: 'center', fontSize: 11 }}>
                      {item.qty}
                    </Typography>
                    <IconButton size="small" onClick={() => updateQty(item.id, 1)} sx={{ borderRadius: 0, width: 28, height: 28, color: 'text.secondary' }}>
                      <AddIcon sx={{ fontSize: 12 }} />
                    </IconButton>
                  </Stack>
                  <IconButton size="small" onClick={() => removeFromCart(item.id)} sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
                    <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Stack>
              </Paper>
            ))
          )}
        </Box>

        {/* Cart Footer */}
        {cart.length > 0 && (
          <Box sx={{ borderTop: `1px solid ${TELCO_BORDER}`, p: 2.5, bgcolor: '#0f172a', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Subtotal</Typography>
              <Typography variant="body2" color="text.secondary">{formatCurrency(cartSubtotal)}</Typography>
            </Stack>
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Estimated Tax (7.25%)</Typography>
              <Typography variant="body2" color="text.secondary">{formatCurrency(cartTax)}</Typography>
            </Stack>
            <Divider sx={{ borderColor: TELCO_BORDER }} />
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Typography variant="body1" sx={{ fontWeight: 700, color: TELCO_CYAN }}>Total</Typography>
              <Typography variant="body1" sx={{ fontWeight: 700, color: TELCO_CYAN }}>{formatCurrency(cartTotal)}</Typography>
            </Stack>

            <Button
              variant="contained"
              fullWidth
              disabled={checkoutMutation.isPending}
              onClick={() => {
                setIsCartOpen(false)
                setCheckoutError(null)
                setIsCheckoutOpen(true)
              }}
              sx={{
                background: `linear-gradient(135deg, ${TELCO_CYAN} 0%, #006488 100%)`,
                color: '#fff',
                fontWeight: 700,
                py: 1.5,
                '&:hover': { filter: 'brightness(1.1)' },
              }}
            >
              Proceed to Test Checkout
            </Button>
          </Box>
        )}
      </Drawer>

      {/* ── Checkout Dialog ── */}
      <Dialog
        open={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { bgcolor: TELCO_PAPER, borderColor: TELCO_BORDER, border: `1px solid ${TELCO_BORDER}` } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: TELCO_CYAN, fontWeight: 700 }}>
          Confirm Test Purchase Order
          <IconButton size="small" onClick={() => setIsCheckoutOpen(false)} sx={{ color: 'text.secondary' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          {checkoutResult ? (
            /* ── Success State ── */
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75, alignItems: 'center', textAlign: 'center', py: 1.25 }}>
              <CheckCircleIcon sx={{ fontSize: 44, color: 'success.main' }} />
              <Typography variant="h4" sx={{ fontWeight: 700 }}>Order Submitted Successfully!</Typography>
              <Typography variant="body2" color="text.secondary">
                Your simulated order has been registered as a Purchase Order in the CIXCI coordination layer.
              </Typography>

              <Paper variant="outlined" sx={{ width: '100%', p: 1.5, bgcolor: TELCO_ELEVATED, borderColor: TELCO_BORDER }}>
                <Stack spacing={1}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">PO Number:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: MONO_FONT, color: TELCO_CYAN }}>{checkoutResult.po_number}</Typography>
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Order ID:</Typography>
                    <Typography variant="body2" sx={{ fontFamily: MONO_FONT }}>{checkoutResult.id}</Typography>
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Status:</Typography>
                    <StatusChip status={checkoutResult.status || 'pending'} />
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Total Amount:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatCurrency(checkoutResult.total_amount)}</Typography>
                  </Stack>
                </Stack>
              </Paper>

              <Button
                variant="outlined"
                onClick={() => {
                  setIsCheckoutOpen(false)
                  setCheckoutResult(null)
                }}
                sx={{ mt: 1.25 }}
              >
                Continue Shopping
              </Button>
            </Box>
          ) : (
            /* ── Checkout Confirmation State ── */
            <>
              <Typography variant="body2" color="text.secondary">
                You are placing a simulated procurement Purchase Order for testing purposes.
              </Typography>

              <Paper variant="outlined" sx={{ bgcolor: TELCO_ELEVATED, borderColor: TELCO_BORDER, p: 1.5, mt: 1.25 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, borderBottom: `1px solid ${TELCO_BORDER}`, pb: 0.75, mb: 1.25 }}>
                  Shipping Address (Test Customer)
                </Typography>
                <Grid container spacing={1}>
                  <Grid size={6}>
                    <TextField
                      label="First Name"
                      size="small"
                      fullWidth
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: TELCO_ELEVATED }, '& .MuiOutlinedInput-notchedOutline': { borderColor: TELCO_BORDER } }}
                    />
                  </Grid>
                  <Grid size={6}>
                    <TextField
                      label="Last Name"
                      size="small"
                      fullWidth
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: TELCO_ELEVATED }, '& .MuiOutlinedInput-notchedOutline': { borderColor: TELCO_BORDER } }}
                    />
                  </Grid>
                  <Grid size={12}>
                    <TextField
                      label="Address Line 1"
                      size="small"
                      fullWidth
                      value={address1}
                      onChange={e => setAddress1(e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: TELCO_ELEVATED }, '& .MuiOutlinedInput-notchedOutline': { borderColor: TELCO_BORDER } }}
                    />
                  </Grid>
                  <Grid size={12}>
                    <TextField
                      label="Address Line 2 (Opt)"
                      size="small"
                      fullWidth
                      value={address2}
                      onChange={e => setAddress2(e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: TELCO_ELEVATED }, '& .MuiOutlinedInput-notchedOutline': { borderColor: TELCO_BORDER } }}
                    />
                  </Grid>
                  <Grid size={6}>
                    <TextField
                      label="City"
                      size="small"
                      fullWidth
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: TELCO_ELEVATED }, '& .MuiOutlinedInput-notchedOutline': { borderColor: TELCO_BORDER } }}
                    />
                  </Grid>
                  <Grid size={3}>
                    <TextField
                      label="State"
                      size="small"
                      fullWidth
                      value={state}
                      onChange={e => setState(e.target.value.toUpperCase())}
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: TELCO_ELEVATED }, '& .MuiOutlinedInput-notchedOutline': { borderColor: TELCO_BORDER } }}
                    />
                  </Grid>
                  <Grid size={3}>
                    <TextField
                      label="Zip Code"
                      size="small"
                      fullWidth
                      value={zipCode}
                      onChange={e => setZipCode(e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: TELCO_ELEVATED }, '& .MuiOutlinedInput-notchedOutline': { borderColor: TELCO_BORDER } }}
                    />
                  </Grid>
                </Grid>
              </Paper>

              {checkoutError && (
                <Alert severity="error" variant="outlined" icon={<ErrorOutlineIcon />} sx={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                  {checkoutError}
                </Alert>
              )}

              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 200, bgcolor: TELCO_ELEVATED, borderColor: TELCO_BORDER }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ bgcolor: TELCO_PAPER, borderColor: TELCO_BORDER }}>Item</TableCell>
                      <TableCell sx={{ bgcolor: TELCO_PAPER, borderColor: TELCO_BORDER }}>Qty</TableCell>
                      <TableCell sx={{ bgcolor: TELCO_PAPER, borderColor: TELCO_BORDER, textAlign: 'right' }}>Price</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {cart.map(item => (
                      <TableRow key={item.id}>
                        <TableCell sx={{ borderColor: TELCO_BORDER, fontSize: 12 }}>{item.name}</TableCell>
                        <TableCell sx={{ borderColor: TELCO_BORDER }}>{item.qty}</TableCell>
                        <TableCell sx={{ borderColor: TELCO_BORDER, textAlign: 'right', fontSize: 12 }}>{formatCurrency(item.price * item.qty)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Divider sx={{ borderColor: TELCO_BORDER }} />

              <Stack spacing={0.75}>
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Subtotal:</Typography>
                  <Typography variant="body2">{formatCurrency(cartSubtotal)}</Typography>
                </Stack>
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Estimated Tax (7.25%):</Typography>
                  <Typography variant="body2">{formatCurrency(cartTax)}</Typography>
                </Stack>
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography variant="body1" sx={{ fontWeight: 700, color: TELCO_CYAN }}>Total:</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700, color: TELCO_CYAN }}>{formatCurrency(cartTotal)}</Typography>
                </Stack>
              </Stack>
            </>
          )}
        </DialogContent>

        {!checkoutResult && (
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setIsCheckoutOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              disabled={checkoutMutation.isPending}
              onClick={() => {
                setCheckoutError(null)
                handlePlaceOrder()
              }}
              startIcon={checkoutMutation.isPending ? <CircularProgress size={14} color="inherit" /> : undefined}
              sx={{
                background: `linear-gradient(135deg, ${TELCO_CYAN} 0%, #006488 100%)`,
                color: '#fff',
                fontWeight: 700,
                '&:hover': { filter: 'brightness(1.1)' },
              }}
            >
              {checkoutMutation.isPending ? 'Submitting PO...' : 'Confirm & Place Order'}
            </Button>
          </DialogActions>
        )}
      </Dialog>

      {/* ── Product Details Dialog ── */}
      <Dialog
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { bgcolor: '#0f172a', border: `1px solid ${TELCO_CYAN}`, boxShadow: `0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(32, 209, 242, 0.15)`, maxHeight: '92vh' } } }}
      >
        {selectedProduct && (
          <>
            <DialogTitle
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                px: 3,
                py: 2,
                borderBottom: `1px solid ${TELCO_BORDER}`,
              }}
            >
              <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                <ShoppingBagIcon sx={{ fontSize: 20, color: TELCO_CYAN }} />
                <Box>
                  <Typography variant="h4" sx={{ color: '#f8fafc', fontWeight: 700, fontSize: 16 }}>
                    Product Specifications & Details
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    Catalog Reference ID #{String(selectedProduct.id).slice(0, 8)}
                  </Typography>
                </Box>
              </Stack>
              <IconButton size="small" onClick={() => setSelectedProduct(null)} sx={{ color: 'text.secondary' }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Top Grid: Media Gallery & Key Info */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '320px 1fr' },
                  gap: 3,
                }}
              >
                {/* Left Media Gallery */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {(() => {
                    const allImages = [
                      selectedProduct.primary_image_url,
                      ...(Array.isArray(selectedProduct.media_references) ? selectedProduct.media_references : [])
                    ].filter((img): img is string => Boolean(img && typeof img === 'string'))

                    const currentImg = allImages[activeImageIndex] || selectedProduct.primary_image_url

                    return (
                      <>
                        <Box
                          sx={{
                            width: '100%',
                            height: 260,
                            bgcolor: '#090d16',
                            border: `1px solid ${TELCO_BORDER}`,
                            borderRadius: 1.25,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            p: 2,
                            overflow: 'hidden',
                          }}
                        >
                          {currentImg ? (
                            <Box component="img" src={getImageUrl(currentImg)} alt={selectedProduct.name} sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                          ) : (
                            <ShoppingBagIcon sx={{ fontSize: 72, color: '#334155' }} />
                          )}
                        </Box>

                        {allImages.length > 1 && (
                          <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.5 }}>
                            {allImages.map((img, idx) => (
                              <Box
                                key={idx}
                                onClick={() => setActiveImageIndex(idx)}
                                sx={{
                                  width: 54,
                                  height: 54,
                                  borderRadius: 0.75,
                                  bgcolor: '#090d16',
                                  border: `1px solid ${activeImageIndex === idx ? TELCO_CYAN : TELCO_BORDER}`,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  p: 0.5,
                                  flexShrink: 0,
                                  transition: 'all 0.2s',
                                  boxShadow: activeImageIndex === idx ? `0 0 10px rgba(32, 209, 242, 0.3)` : 'none',
                                  '&:hover': { borderColor: TELCO_CYAN, boxShadow: `0 0 10px rgba(32, 209, 242, 0.3)` },
                                }}
                              >
                                <Box component="img" src={getImageUrl(img)} alt={`Thumb ${idx}`} sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                              </Box>
                            ))}
                          </Stack>
                        )}
                      </>
                    )
                  })()}
                </Box>

                {/* Right Key Information & Purchase Pane */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
                    {selectedProduct.brand && (
                      <Chip
                        label={selectedProduct.brand}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(32, 209, 242, 0.1)',
                          color: TELCO_CYAN,
                          border: '1px solid rgba(32, 209, 242, 0.2)',
                          fontWeight: 700,
                          fontSize: 11,
                          textTransform: 'uppercase',
                          letterSpacing: 0.8,
                        }}
                      />
                    )}
                    {selectedProduct.product_category && (
                      <Chip
                        label={selectedProduct.product_category}
                        size="small"
                        sx={{
                          bgcolor: 'transparent',
                          border: `1px solid ${TELCO_CYAN}`,
                          color: TELCO_CYAN,
                          fontSize: 11,
                        }}
                      />
                    )}
                    {selectedProduct.recommended_accessory && (
                      <Chip
                        icon={<StarIcon sx={{ fontSize: '14px !important', color: '#fff !important' }} />}
                        label="Recommended"
                        size="small"
                        sx={{
                          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          color: '#fff',
                          fontSize: 9,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                        }}
                      />
                    )}
                  </Stack>

                  <Typography variant="h2" sx={{ fontSize: 18, fontWeight: 800, color: '#f8fafc', lineHeight: 1.3 }}>
                    {selectedProduct.name}
                  </Typography>

                  <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      SKU: <Typography component="span" sx={{ fontFamily: MONO_FONT, fontWeight: 600, color: '#f1f5f9' }}>{selectedProduct.sku}</Typography>
                    </Typography>
                    {selectedProduct.upc && (
                      <Typography variant="body2" color="text.secondary">
                        UPC: <Typography component="span" sx={{ fontFamily: MONO_FONT, fontWeight: 600, color: '#f1f5f9' }}>{selectedProduct.upc}</Typography>
                      </Typography>
                    )}
                  </Stack>

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
                        <Paper
                          variant="outlined"
                          sx={{
                            bgcolor: TELCO_PAPER,
                            borderColor: TELCO_BORDER,
                            borderRadius: 1.25,
                            px: 2.25,
                            py: 1.75,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Box>
                            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'baseline' }}>
                              <Typography sx={{ fontSize: 24, fontWeight: 800, color: TELCO_CYAN }}>
                                {formatCurrency(displayPrice)}
                              </Typography>
                              {salePrice > 0 && srp > salePrice && (
                                <Typography sx={{ fontSize: 13, color: 'text.disabled', textDecoration: 'line-through' }}>
                                  {formatCurrency(srp)}
                                </Typography>
                              )}
                            </Stack>
                            <Typography variant="caption" color="text.disabled">Unit Price (USD)</Typography>
                          </Box>

                          <Stack spacing={0.5} sx={{ alignItems: 'flex-end' }}>
                            {savings > 0 && (
                              <Chip
                                label={`Save ${formatCurrency(savings)} (${savingsPct}% OFF)`}
                                size="small"
                                sx={{
                                  bgcolor: 'rgba(34, 197, 94, 0.15)',
                                  color: '#4ade80',
                                  border: '1px solid rgba(34, 197, 94, 0.3)',
                                  fontWeight: 700,
                                  fontSize: 11,
                                }}
                              />
                            )}
                            {isOutOfStock ? (
                              <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'error.main' }}>Out of Stock</Typography>
                            ) : (
                              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                                <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
                                <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'success.main' }}>
                                  In Stock ({selectedProduct.inventory_level || 0} units available)
                                </Typography>
                              </Stack>
                            )}
                          </Stack>
                        </Paper>

                        {/* Quick specs pills */}
                        <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap' }}>
                          {selectedProduct.color && (
                            <Chip
                              size="small"
                              label={
                                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: selectedProduct.color.toLowerCase(), border: '1px solid rgba(255,255,255,0.2)' }} />
                                  <span>Color: {selectedProduct.color}</span>
                                </Stack>
                              }
                              sx={{ bgcolor: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', fontSize: 11 }}
                            />
                          )}
                          {selectedProduct.bluetooth_compatibility && (
                            <Chip size="small" label={`Bluetooth ${selectedProduct.bluetooth_compatibility}`} sx={{ bgcolor: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', fontSize: 11 }} />
                          )}
                          {selectedProduct.compatible_charging_interface && (
                            <Chip size="small" label={`Charging: ${selectedProduct.compatible_charging_interface}`} sx={{ bgcolor: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', fontSize: 11 }} />
                          )}
                          {selectedProduct.wireless_charging_compatibility === 'true' && (
                            <Chip size="small" label="Wireless Charging Ready" sx={{ bgcolor: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', fontSize: 11 }} />
                          )}
                          {selectedProduct.headphone_jack_compatibility === 'true' && (
                            <Chip size="small" label="3.5mm Headphone Jack" sx={{ bgcolor: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', fontSize: 11 }} />
                          )}
                        </Stack>

                        {/* Quantity & Cart Action Row */}
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mt: 0.75 }}>
                          <Stack
                            direction="row"
                            sx={{
                              alignItems: 'center',
                              bgcolor: TELCO_PAPER,
                              border: `1px solid ${TELCO_BORDER}`,
                              borderRadius: 1,
                              height: 42,
                              overflow: 'hidden',
                            }}
                          >
                            <IconButton
                              onClick={() => setDetailQty(q => Math.max(1, q - 1))}
                              sx={{ borderRadius: 0, width: 36, height: '100%', color: 'text.secondary', '&:hover': { bgcolor: '#1e293b', color: '#f1f5f9' } }}
                            >
                              <RemoveIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                            <Typography sx={{ width: 44, textAlign: 'center', fontWeight: 700, fontSize: 14 }}>
                              {detailQty}
                            </Typography>
                            <IconButton
                              onClick={() => setDetailQty(q => q + 1)}
                              sx={{ borderRadius: 0, width: 36, height: '100%', color: 'text.secondary', '&:hover': { bgcolor: '#1e293b', color: '#f1f5f9' } }}
                            >
                              <AddIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Stack>

                          <Button
                            variant="contained"
                            startIcon={<ShoppingCartIcon sx={{ fontSize: 16 }} />}
                            disabled={isOutOfStock}
                            onClick={() => {
                              addToCart(selectedProduct, detailQty)
                            }}
                            sx={{
                              flex: 1,
                              height: 42,
                              background: `linear-gradient(135deg, ${TELCO_CYAN} 0%, #006488 100%)`,
                              color: '#fff',
                              fontWeight: 700,
                              '&:hover': { filter: 'brightness(1.1)' },
                            }}
                          >
                            Add {detailQty} to Cart
                          </Button>

                          <Button
                            variant="outlined"
                            disabled={isOutOfStock}
                            onClick={() => {
                              addToCart(selectedProduct, detailQty)
                              setSelectedProduct(null)
                              setIsCheckoutOpen(true)
                            }}
                            sx={{
                              height: 42,
                              px: 2.25,
                              borderColor: TELCO_CYAN,
                              color: TELCO_CYAN,
                              fontWeight: 600,
                              '&:hover': { borderColor: TELCO_CYAN, bgcolor: 'rgba(32, 209, 242, 0.08)' },
                            }}
                          >
                            Buy Now
                          </Button>
                        </Stack>
                      </>
                    )
                  })()}
                </Box>
              </Box>

              {/* Bottom Section: Tabs for Overview, Specs, Compatibility */}
              <Box>
                <Tabs
                  value={detailActiveTab}
                  onChange={(_, v) => setDetailActiveTab(v)}
                  sx={{
                    borderBottom: `1px solid ${TELCO_BORDER}`,
                    mt: 1,
                    '& .MuiTabs-indicator': { bgcolor: TELCO_CYAN },
                    '& .MuiTab-root': { color: 'text.secondary', fontWeight: 600, fontSize: 13 },
                    '& .Mui-selected': { color: `${TELCO_CYAN} !important` },
                  }}
                >
                  <Tab label="Overview & Description" value="overview" />
                  <Tab label="Technical Specifications" value="specs" />
                  <Tab label={`Device Compatibility (${activeDevices.length})`} value="compatibility" />
                </Tabs>

                <Paper
                  variant="outlined"
                  sx={{
                    bgcolor: TELCO_PAPER,
                    borderColor: TELCO_BORDER,
                    borderRadius: 1.25,
                    p: 2.25,
                    mt: -0.125,
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                  }}
                >
                  {detailActiveTab === 'overview' && (
                    <Stack spacing={1.75}>
                      {selectedProduct.short_description && (
                        <Typography variant="body1" sx={{ fontWeight: 600, borderLeft: `3px solid ${TELCO_CYAN}`, pl: 1.5 }}>
                          {selectedProduct.short_description}
                        </Typography>
                      )}

                      <Box>
                        <Typography variant="h5" sx={{ mb: 0.75 }}>Product Description</Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                          {selectedProduct.description || 'No detailed description provided for this catalog item.'}
                        </Typography>
                      </Box>

                      {selectedProduct.promo_information && (
                        <Alert
                          severity="warning"
                          variant="outlined"
                          icon={<LocalOfferIcon />}
                          sx={{ borderColor: 'rgba(245, 158, 11, 0.3)', bgcolor: 'rgba(245, 158, 11, 0.1)' }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#f59e0b', fontSize: 12, mb: 0.25 }}>Promotional Offer</Typography>
                          <Typography variant="body2" sx={{ color: '#fbbf24' }}>{selectedProduct.promo_information}</Typography>
                        </Alert>
                      )}

                      {selectedProduct.warranty && (
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <InfoOutlinedIcon sx={{ fontSize: 14, color: TELCO_CYAN }} />
                          <Typography variant="body2" color="text.secondary">
                            Warranty: <Typography component="span" sx={{ fontWeight: 600 }}>{selectedProduct.warranty}</Typography>
                          </Typography>
                        </Stack>
                      )}
                    </Stack>
                  )}

                  {detailActiveTab === 'specs' && (
                    <TableContainer>
                      <Table size="small">
                        <TableBody>
                          {[
                            { key: 'Product Name', val: selectedProduct.name, bold: true },
                            { key: 'Brand', val: selectedProduct.brand || 'Generic / Unbranded' },
                            { key: 'Category', val: selectedProduct.product_category || 'N/A' },
                            { key: 'Product Type', val: selectedProduct.product_type || 'Accessory' },
                            { key: 'SKU Code', val: selectedProduct.sku, mono: true },
                            selectedProduct.upc ? { key: 'UPC Code', val: selectedProduct.upc, mono: true } : null,
                            selectedProduct.color ? { key: 'Color', val: `${selectedProduct.color}${selectedProduct.system_color ? ` (${selectedProduct.system_color})` : ''}` } : null,
                            selectedProduct.bluetooth_compatibility ? { key: 'Bluetooth Version', val: selectedProduct.bluetooth_compatibility } : null,
                            selectedProduct.compatible_charging_interface ? { key: 'Charging Interface', val: selectedProduct.compatible_charging_interface } : null,
                            selectedProduct.wireless_charging_compatibility ? { key: 'Wireless Charging', val: selectedProduct.wireless_charging_compatibility === 'true' ? 'Supported' : selectedProduct.wireless_charging_compatibility } : null,
                            selectedProduct.headphone_jack_compatibility ? { key: '3.5mm Audio Jack', val: selectedProduct.headphone_jack_compatibility === 'true' ? 'Yes' : selectedProduct.headphone_jack_compatibility } : null,
                            selectedProduct.memory_capacity ? { key: 'Memory / Storage Capacity', val: selectedProduct.memory_capacity } : null,
                            selectedProduct.storage_expansion_compatibility ? { key: 'Storage Expansion', val: selectedProduct.storage_expansion_compatibility } : null,
                            selectedProduct.compatible_watch_case_size ? { key: 'Watch Case Size', val: selectedProduct.compatible_watch_case_size } : null,
                            (selectedProduct.length || selectedProduct.width || selectedProduct.height) ? { key: 'Dimensions (L x W x H)', val: `${selectedProduct.length || 0} x ${selectedProduct.width || 0} x ${selectedProduct.height || 0} inches` } : null,
                            selectedProduct.weight ? { key: 'Weight', val: `${selectedProduct.weight} oz` } : null,
                            selectedProduct.map_price ? { key: 'MAP Price', val: formatCurrency(selectedProduct.map_price) } : null,
                            selectedProduct.warranty ? { key: 'Manufacturer Warranty', val: selectedProduct.warranty } : null,
                          ].filter(Boolean).map((row: any, idx) => (
                            <TableRow key={idx} sx={{ '&:last-child td': { borderBottom: 'none' } }}>
                              <TableCell sx={{ color: 'text.secondary', fontWeight: 600, width: '40%', borderColor: TELCO_BORDER }}>
                                {row.key}
                              </TableCell>
                              <TableCell sx={{ color: '#f1f5f9', borderColor: TELCO_BORDER, fontWeight: row.bold ? 600 : 400, fontFamily: row.mono ? MONO_FONT : undefined }}>
                                {row.val}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}

                  {detailActiveTab === 'compatibility' && (
                    <Stack spacing={1.5}>
                      <Typography variant="body2" color="text.secondary">
                        The list below indicates devices in your company's active device portfolio compatible with <Typography component="span" sx={{ color: TELCO_CYAN, fontWeight: 600 }}>{selectedProduct.name}</Typography> based on hardware interfaces, device model matching, and vendor compatibility assertions.
                      </Typography>

                      {activeDevices.length === 0 ? (
                        <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: '#090d16', borderColor: TELCO_BORDER }}>
                          <Typography variant="body2" color="text.disabled">
                            No active devices found in your company portfolio.
                          </Typography>
                        </Paper>
                      ) : (
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                            gap: 1.25,
                            mt: 0.75,
                          }}
                        >
                          {activeDevices.map((d: any) => {
                            const isSelectedDevice = selectedDevice && String(d.device) === String(selectedDevice)
                            const isMatchName = selectedProduct.name.toLowerCase().includes(d.device_name?.toLowerCase() || '')
                            const isHighlighted = isSelectedDevice || isMatchName

                            return (
                              <Paper
                                key={d.device}
                                variant="outlined"
                                sx={{
                                  bgcolor: '#090d16',
                                  borderColor: isHighlighted ? TELCO_CYAN : TELCO_BORDER,
                                  p: 1.25,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1.25,
                                }}
                              >
                                <SmartphoneIcon sx={{ fontSize: 20, color: isHighlighted ? TELCO_CYAN : 'text.disabled' }} />
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{d.device_name}</Typography>
                                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                                    <CheckCircleIcon sx={{ fontSize: 10, color: 'success.main' }} />
                                    <Typography variant="caption" sx={{ color: 'success.main' }}>Compatible</Typography>
                                  </Stack>
                                </Box>
                              </Paper>
                            )
                          })}
                        </Box>
                      )}
                    </Stack>
                  )}
                </Paper>
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* ── Confirm Dialog for cart item removal etc. ── */}
      <ConfirmDialog {...dialogProps} />
    </Box>
  )
}
