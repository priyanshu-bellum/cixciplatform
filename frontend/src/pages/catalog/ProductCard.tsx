import React, { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import VisibilityIcon from '@mui/icons-material/Visibility'
import ImageIcon from '@mui/icons-material/ImageOutlined'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ArrowOutwardIcon from '@mui/icons-material/ArrowOutward'
import AddIcon from '@mui/icons-material/Add'
import CheckIcon from '@mui/icons-material/Check'
import { getColorSwatchBg, formatExportedDate } from './utils'
import { getImageUrl, formatCurrency } from '../../lib/formatters'
import './productCatalog.css'

// ---------------------------------------------------------------------------
// Status label / tone maps
// ---------------------------------------------------------------------------
const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  out_of_stock: 'Out of Stock',
  eol: 'EOL',
  draft: 'Draft',
  pending_review: 'Pending Review',
  archived: 'Archived',
}

const STATUS_TONE: Record<string, string> = {
  active: 'is-ok',
  inactive: 'is-off',
  out_of_stock: 'is-off',
  eol: 'is-off',
  draft: 'is-warn',
  pending_review: 'is-warn',
  archived: 'is-off',
}

const stripOrigin = (url: string) => url.replace(/^(https?:\/\/[^/]+)/, '')

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface ProductCardProps {
  product: any
  user: any
  onClick: () => void
  isSelected?: boolean
  onToggleSelect?: () => void
  showCheckbox?: boolean
  exportedProductIds?: Set<string>
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ProductCard({
  product: p,
  user,
  onClick,
  isSelected = false,
  onToggleSelect,
  showCheckbox = false,
  exportedProductIds,
}: ProductCardProps) {
  const [imageIndex, setImageIndex] = useState(0)

  const isCixciAdmin = !!user?.is_cixci_admin
  const isVendor = user?.company_type === 'vendor'
  const isBuyer = user?.company_type === 'buyer'

  // ---- Gallery: primary image first, then the remaining media references ----
  const images = useMemo(() => {
    const list: string[] = []
    const seen = new Set<string>()
    const push = (url: string) => {
      if (!url) return
      const key = stripOrigin(url)
      if (seen.has(key)) return
      seen.add(key)
      list.push(url)
    }
    push(p.primary_image_url || '')
    ;(p.media_references || []).forEach((ref: any) =>
      push(typeof ref === 'string' ? ref : ref?.url || ref?.storage_key || ''),
    )
    return list
  }, [p.primary_image_url, p.media_references])

  const activeIndex = Math.min(imageIndex, Math.max(images.length - 1, 0))
  const displayImg = images[activeIndex]
  const stepImage = (e: React.MouseEvent, direction: -1 | 1) => {
    e.stopPropagation()
    setImageIndex((activeIndex + direction + images.length) % images.length)
  }

  // ---- Status ------------------------------------------------------------
  const statusLabel = STATUS_LABEL[p.status] ?? (p.status || '—')
  const statusTone = STATUS_TONE[p.status] ?? 'is-warn'
  const inv =
    p.inventory_level !== undefined && p.inventory_level !== null
      ? Number(p.inventory_level)
      : null

  const currency = p.vendor_wholesale_price_currency
  const brand = p.brand || p.vendor_name || ''
  const exportedDate =
    (isCixciAdmin || isBuyer) && p.exported_date ? formatExportedDate(p.exported_date) : null
  const showWholesale = isCixciAdmin || isBuyer
  const showVendorWholesale = (isCixciAdmin || isVendor) && p.vendor_wholesale_price_amount != null
  const showMap = !!p.map_price && Number(p.map_price) > 0
  const showSale = !!p.sale_price && Number(p.sale_price) > 0
  const showPricePanel = showWholesale || showVendorWholesale || showMap || showSale || inv !== null

  // ---- Is this product already exported? ---------------------------------
  const alreadyExported = exportedProductIds?.has(String(p.id)) ?? false

  return (
    <article
      className={`pc-card${isSelected ? ' is-selected' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${p.name}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      {/* Media tile */}
      <div className="pc-media">
        {p.recommended_accessory && (
          <div className="pc-badges">
            <span className="pc-badge-recommended">&#9733; Recommended</span>
          </div>
        )}
        <div className="pc-view-hint">
          <VisibilityIcon sx={{ fontSize: 12 }} /> View Details
        </div>
        {displayImg ? (
          <img
            src={getImageUrl(displayImg)}
            alt={p.name}
            loading="lazy"
            className="pc-media-img"
          />
        ) : (
          <div className="pc-placeholder">
            <ImageIcon sx={{ fontSize: 34 }} />
            <span>No product photo</span>
          </div>
        )}
        {/* Gallery pager */}
        {images.length > 1 && (
          <div className="pc-pager">
            <button
              type="button"
              className="pc-pager-btn"
              aria-label="Previous image"
              onClick={(e) => stepImage(e, -1)}
            >
              <ChevronLeftIcon sx={{ fontSize: 16 }} />
            </button>
            <span>
              {activeIndex + 1} of {images.length}
            </span>
            <button
              type="button"
              className="pc-pager-btn"
              aria-label="Next image"
              onClick={(e) => stepImage(e, 1)}
            >
              <ChevronRightIcon sx={{ fontSize: 16 }} />
            </button>
          </div>
        )}
      </div>

      <div className="pc-body">
        {/* Brand / series + category */}
        <div className="pc-brand-row">
          <div className="pc-brand-main">
            <span className="pc-brand">{brand.toUpperCase()}</span>
            {p.series && (
              <span className="pc-series" title={p.series}>
                {p.series}
              </span>
            )}
          </div>
          <span className="pc-category" title={p.product_category || p.product_type || 'Accessories'}>
            <span className="pc-category-dot" />
            <span className="pc-category-text">{p.product_category || p.product_type || 'Accessories'}</span>
          </span>
        </div>

        {/* Title */}
        <div className="pc-title" title={p.name}>
          {p.name}
        </div>

        {/* Identifiers and colors */}
        <div className="pc-specs">
          <div className="pc-spec-row">
            <div className="pc-spec is-grow">
              <span className="pc-spec-label">SKU</span>
              <span className="pc-spec-val is-mono" title={p.sku || undefined}>
                <span>{p.sku || '—'}</span>
              </span>
            </div>
          </div>
          <div className="pc-spec-row">
            <div className="pc-spec">
              <span className="pc-spec-label">UPC</span>
              <span className="pc-spec-val is-mono" title={p.upc || undefined}>
                <span>{p.upc || '—'}</span>
              </span>
            </div>
          </div>
          <div className="pc-spec-row">
            <div className="pc-spec">
              <span className="pc-spec-label">Color</span>
              <span className="pc-spec-val" title={p.color || undefined}>
                <span
                  className="pc-swatch"
                  style={{ background: getColorSwatchBg(p.color, p.system_color) }}
                />
                <span>{p.color || '—'}</span>
              </span>
            </div>
          </div>
          <div className="pc-spec-row">
            <div className="pc-spec">
              <span className="pc-spec-label">System Color</span>
              <span className="pc-spec-val" title={p.system_color || p.color || undefined}>
                <span>{p.system_color || p.color || '—'}</span>
              </span>
            </div>
          </div>
          {exportedDate && (
            <div className="pc-spec-row">
              <div className="pc-spec">
                <span className="pc-spec-label">
                  {isBuyer ? 'Product Added Date' : 'Exported Date'}
                </span>
                <span className="pc-spec-val">
                  <span>{exportedDate}</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Secondary pricing + inventory */}
        {showPricePanel && (
          <div className="pc-prices">
            {showWholesale && (
              <div className="pc-price-row">
                <span>Wholesale Price</span>
                <span>
                  {formatCurrency(
                    p.buyer_wholesale_price ?? p.vendor_wholesale_price_amount ?? 0,
                    currency,
                  )}
                </span>
              </div>
            )}
            {showVendorWholesale && (
              <div className="pc-price-row">
                <span>Vendor Wholesale Price</span>
                <span>{formatCurrency(p.vendor_wholesale_price_amount, currency)}</span>
              </div>
            )}
            {showMap && (
              <div className="pc-price-row">
                <span>MAP</span>
                <span>{formatCurrency(p.map_price, currency)}</span>
              </div>
            )}
            {showSale && (
              <div className="pc-price-row is-sale">
                <span>Sale Price</span>
                <span>{formatCurrency(p.sale_price, currency)}</span>
              </div>
            )}
            {inv !== null && (
              <div className="pc-price-row">
                <span>Inventory</span>
                <span>{inv}</span>
              </div>
            )}
          </div>
        )}

        {/* MSRP + product status */}
        <div className="pc-footer">
          <div>
            <span className="pc-msrp-label">MSRP</span>
            <div className="pc-price-line">
              <span className="pc-msrp">{formatCurrency(p.msrp || 0, currency)}</span>
              <span className={`pc-status ${statusTone}`} title="Product Status">
                {statusLabel}
              </span>
            </div>
          </div>
          <span className="pc-open-btn" aria-hidden="true">
            <ArrowOutwardIcon sx={{ fontSize: 18 }} />
          </span>
        </div>

        {/* Buyer "Add Product" button */}
        {isBuyer &&
          showCheckbox &&
          (alreadyExported ? (
            <button
              type="button"
              className="pc-add-btn is-added"
              disabled
              onClick={(e) => e.stopPropagation()}
            >
              <CheckIcon sx={{ fontSize: 16 }} /> Product Added
            </button>
          ) : (
            <button
              type="button"
              className={`pc-add-btn${isSelected ? ' is-selected' : ''}`}
              aria-pressed={isSelected}
              onClick={(e) => {
                e.stopPropagation()
                onToggleSelect?.()
              }}
            >
              {isSelected ? <CheckIcon sx={{ fontSize: 16 }} /> : <AddIcon sx={{ fontSize: 16 }} />}
              {isSelected ? 'Selected' : 'Add Product'}
            </button>
          ))}
      </div>
    </article>
  )
}

// ---------------------------------------------------------------------------
// Skeleton variant – matches the card layout for a smooth loading experience
// ---------------------------------------------------------------------------
export function ProductCardSkeleton() {
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: '20px',
        p: '10px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Media tile */}
      <Skeleton variant="rounded" width="100%" height={136} sx={{ borderRadius: '14px' }} />
      <Box sx={{ px: '6px', pt: '10px', pb: '6px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {/* Brand */}
        <Skeleton variant="text" width="35%" sx={{ fontSize: 11 }} />
        {/* Title */}
        <Skeleton variant="text" width="85%" sx={{ fontSize: 15 }} />
        {/* Category pill */}
        <Skeleton variant="rounded" width={96} height={24} sx={{ borderRadius: '999px' }} />
        {/* Spec grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} variant="text" width="70%" sx={{ fontSize: 12 }} />
          ))}
        </Box>
        {/* Price panel */}
        <Skeleton variant="rounded" width="100%" height={52} sx={{ borderRadius: '12px' }} />
        {/* MSRP + action */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Skeleton variant="text" width="40%" sx={{ fontSize: 22 }} />
          <Skeleton variant="circular" width={38} height={38} />
        </Box>
      </Box>
    </Box>
  )
}
