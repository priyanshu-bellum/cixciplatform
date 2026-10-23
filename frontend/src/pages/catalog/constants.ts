export const STATUS_BADGE: Record<string, string> = {
  active: 'badge-green',
  draft: 'badge-muted',
  archived: 'badge-muted',
  pending_review: 'badge-amber',
  rejected: 'badge-red',
  out_of_stock: 'badge-amber',
  eol: 'badge-muted',
  inactive: 'badge-muted',
}

export const SELL_BADGE: Record<string, string> = {
  selling: 'badge-green',
  stop_selling: 'badge-red',
  not_listed: 'badge-muted',
  under_review: 'badge-amber',
  for_sale: 'badge-green',
}

export const SERVER_PAGE_SIZE = 50

export const COLOR_SWATCH_MAP: [string[], string][] = [
  [['black', 'charcoal', 'dark'], '#18181b'],
  [['white', 'arctic', 'silver', 'platinum'], '#f8fafc'],
  [['blue', 'navy'], '#1d4ed8'],
  [['red', 'crimson'], '#dc2626'],
  [['green', 'olive', 'emerald'], '#16a34a'],
  [['clear', 'transparent'], 'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(200,225,255,0.4) 100%)'],
  [['gold', 'yellow'], '#eab308'],
  [['purple', 'violet'], '#9333ea'],
  [['pink', 'rose'], '#f43f5e'],
  [['orange'], '#f97316'],
  [['gray', 'grey', 'graphite'], '#64748b'],
]

export const DEFAULT_SWATCH_COLOR = '#94a3b8'

export const MSRP_RANGES = [
  { value: '0-10', label: '$0 - $10' },
  { value: '10-25', label: '$10 - $25' },
  { value: '25-50', label: '$25 - $50' },
  { value: '50-100', label: '$50 - $100' },
  { value: '100+', label: '$100+' },
]

export const PRODUCT_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'out_of_stock', label: 'Out of Stock' },
  { value: 'eol', label: 'EOL' },
]
