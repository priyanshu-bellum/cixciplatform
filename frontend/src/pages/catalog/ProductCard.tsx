import React, { useState } from 'react'
import Card from '@mui/material/Card'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import VisibilityIcon from '@mui/icons-material/Visibility'
import ImageIcon from '@mui/icons-material/Image'
import { getColorSwatchBg, formatExportedDate } from './utils'
import { getImageUrl, formatCurrency } from '../../lib/formatters'

// ---------------------------------------------------------------------------
// Status label / color maps (mirrors the original CatalogPage card)
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

const STATUS_COLOR: Record<string, string> = {
  active: 'in-stock',
  inactive: 'out-of-stock',
  out_of_stock: 'out-of-stock',
  eol: 'out-of-stock',
  draft: 'low-stock',
  pending_review: 'low-stock',
  archived: 'out-of-stock',
}

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
  const [hoveredImage, setHoveredImage] = useState<string | null>(null)

  const isCixciAdmin = !!user?.is_cixci_admin
  const isVendor = user?.role === 'vendor'
  const isBuyer = user?.role === 'buyer'

  // ---- Derived image data ------------------------------------------------
  const primaryUrl = p.primary_image_url || ''
  const cleanPrimary = primaryUrl.replace(/^(https?:\/\/[^/]+)/, '')
  const additionalImages: string[] = (p.media_references || [])
    .map((ref: any) => (typeof ref === 'string' ? ref : ref?.url || ref?.storage_key || ''))
    .filter((url: string) => {
      if (!url) return false
      const cleanRef = url.replace(/^(https?:\/\/[^/]+)/, '')
      return cleanRef !== cleanPrimary
    })

  const displayImg = hoveredImage || p.primary_image_url

  // ---- Status ------------------------------------------------------------
  const statusLabel = STATUS_LABEL[p.status] ?? (p.status || '\u2014')
  const statusColor = STATUS_COLOR[p.status] ?? 'low-stock'
  const inv =
    p.inventory_level !== undefined && p.inventory_level !== null
      ? Number(p.inventory_level)
      : null

  // ---- Is this product already exported? ---------------------------------
  const alreadyExported = exportedProductIds?.has(String(p.id)) ?? false

  return (
    <>
      {/* Scoped CSS -------------------------------------------------------- */}
      <style>{cardStyles}</style>

      <Card
        variant="outlined"
        className="admin-product-card"
        sx={{
          cursor: 'pointer',
          transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
          border: isSelected ? '1px solid var(--accent)' : undefined,
          boxShadow: isSelected ? '0 0 16px rgba(var(--accent-rgb), 0.35)' : undefined,
          '&:hover': {
            transform: 'translateY(-2px)',
            borderColor: 'primary.main',
            boxShadow: 3,
          },
        }}
        onMouseLeave={() => {
          if (hoveredImage) setHoveredImage(null)
        }}
        onClick={onClick}
      >
        {/* View Details hover badge */}
        <div className="admin-card-view-hint">
          <VisibilityIcon sx={{ fontSize: 11 }} /> View Details
        </div>

        {/* Recommended badge */}
        {p.recommended_accessory && (
          <div className="admin-recommended-badge">&#9733; RECOMMENDED</div>
        )}

        {/* Main image */}
        <div className="admin-photo-container">
          {displayImg ? (
            <img
              src={getImageUrl(displayImg)}
              alt={p.name}
              className="admin-main-img"
            />
          ) : (
            <div className="admin-placeholder-photo">
              <ImageIcon sx={{ fontSize: 32 }} className="admin-placeholder-icon" />
              <span className="admin-placeholder-text">Main product photo</span>
            </div>
          )}
        </div>

        {/* Angle thumbnails */}
        <div className="admin-angle-row">
          {[0, 1, 2, 3].map((idx) => {
            const angleImg = additionalImages[idx]
            if (!angleImg) {
              return (
                <div
                  key={idx}
                  className="admin-angle-box empty"
                  style={{ border: 'none', background: 'transparent' }}
                />
              )
            }
            const isActiveThumb = (hoveredImage || p.primary_image_url) === angleImg
            return (
              <div
                key={idx}
                className={`admin-angle-box${isActiveThumb ? ' active-thumb' : ''}`}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredImage(angleImg)}
                onClick={(e) => {
                  e.stopPropagation()
                  setHoveredImage(angleImg)
                }}
              >
                <img src={getImageUrl(angleImg)} alt={`Angle ${idx + 1}`} />
              </div>
            )
          })}
        </div>

        {/* Brand */}
        <div className="admin-card-brand">
          {(p.brand || p.vendor_name || '').toUpperCase()}
        </div>

        {/* Title */}
        <div className="admin-card-title" title={p.name}>
          {p.name}
        </div>

        {/* Category pill */}
        <div className="admin-cat-wrap">
          <span className="admin-category-pill">
            <span className="admin-cat-dot" />
            {p.product_category || p.product_type || 'Accessories'}
          </span>
        </div>

        {/* Exported date (admin / buyer) */}
        {(isCixciAdmin || isBuyer) &&
          p.exported_date &&
          formatExportedDate(p.exported_date) ? (
            <div className="admin-exported-row">
              <span className="admin-label">Exported Date:</span>
              <span className="admin-val">{formatExportedDate(p.exported_date)}</span>
            </div>
          ) : null}

        {/* SKU / UPC row */}
        <div className="admin-code-row">
          <div className="admin-code-item">
            <span className="admin-label">SKU</span>
            <span className="admin-code-val">{p.sku || '\u2014'}</span>
          </div>
          <div className="admin-code-item">
            <span className="admin-label">UPC</span>
            <span className="admin-code-val">{p.upc || '\u2014'}</span>
          </div>
        </div>

        {/* Color block */}
        <div className="admin-color-block">
          <div className="admin-color-row">
            <span className="admin-label">Color:</span>
            <span
              className="admin-color-swatch"
              style={{
                background: getColorSwatchBg(p.color, p.system_color),
                border:
                  p.color?.toLowerCase()?.includes('white') ||
                  p.color?.toLowerCase()?.includes('clear')
                    ? '1px solid rgba(255,255,255,0.4)'
                    : '1px solid rgba(0,0,0,0.3)',
                marginLeft: 0,
              }}
            />
            <span className="admin-color-val" style={{ marginLeft: 2 }}>
              {p.color || '\u2014'}
            </span>
          </div>
          <div className="admin-color-row">
            <span className="admin-label">System Color:</span>
            <span className="admin-color-val">
              {p.system_color || p.color || '\u2014'}
            </span>
          </div>
        </div>

        {/* Footer / pricing */}
        <div className="admin-card-footer">
          {/* MSRP */}
          <div className="admin-msrp-row">
            <span className="admin-label">MSRP:</span>
            <span className="admin-msrp-val">
              {formatCurrency(p.msrp || 0, p.vendor_wholesale_price_currency)}
            </span>
          </div>

          {/* Wholesale Price (admin / buyer) */}
          {(isCixciAdmin || isBuyer) && (
            <div className="admin-price-row">
              <span className="admin-label">Wholesale Price:</span>
              <span className="admin-val">
                {formatCurrency(
                  p.buyer_wholesale_price ?? p.vendor_wholesale_price_amount ?? 0,
                  p.vendor_wholesale_price_currency,
                )}
              </span>
            </div>
          )}

          {/* Vendor Wholesale Price (admin / vendor) */}
          {(isCixciAdmin || isVendor) && p.vendor_wholesale_price_amount != null && (
            <div className="admin-price-row">
              <span className="admin-label">Vendor Wholesale Price:</span>
              <span className="admin-val">
                {formatCurrency(
                  p.vendor_wholesale_price_amount,
                  p.vendor_wholesale_price_currency,
                )}
              </span>
            </div>
          )}

          {/* MAP */}
          {p.map_price && Number(p.map_price) > 0 ? (
            <div className="admin-price-row">
              <span className="admin-label">MAP:</span>
              <span className="admin-val">
                {formatCurrency(p.map_price, p.vendor_wholesale_price_currency)}
              </span>
            </div>
          ) : null}

          {/* Sale Price */}
          {p.sale_price && Number(p.sale_price) > 0 ? (
            <div className="admin-price-row admin-sale-row">
              <span className="admin-label">Sale Price:</span>
              <span className="admin-val">
                {formatCurrency(p.sale_price, p.vendor_wholesale_price_currency)}
              </span>
            </div>
          ) : null}

          {/* Status */}
          <div className="admin-status-row">
            <span className="admin-label">Product Status:</span>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 3,
              }}
            >
              <span className={`admin-stock-badge ${statusColor}`}>{statusLabel}</span>
              {inv !== null && (
                <span
                  style={{
                    fontSize: 10,
                    color: 'var(--text-muted)',
                    fontFamily: 'monospace',
                  }}
                >
                  Inventory: {inv}
                </span>
              )}
            </div>
          </div>

          {/* Buyer "Add Product" button */}
          {isBuyer &&
            showCheckbox &&
            (alreadyExported ? (
              <div
                className="buyer-add-product-btn selected"
                style={{ opacity: 0.75, cursor: 'default' }}
                onClick={(e) => e.stopPropagation()}
              >
                <span
                  style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}
                >
                  &#10003; Product Added
                </span>
              </div>
            ) : (
              <div
                className={`buyer-add-product-btn ${isSelected ? 'selected' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleSelect?.()
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}}
                  style={{
                    cursor: 'pointer',
                    accentColor: 'var(--accent)',
                    width: 14,
                    height: 14,
                  }}
                />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                  }}
                >
                  Add Product
                </span>
              </div>
            ))}
        </div>
      </Card>
    </>
  )
}

// ---------------------------------------------------------------------------
// Styles – ported verbatim from the original CatalogPage <style> block
// ---------------------------------------------------------------------------
const cardStyles = `
  .admin-product-card {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    position: relative;
    cursor: pointer;
    user-select: none;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .admin-product-card:hover {
    transform: translateY(-2px);
    border-color: var(--accent);
    box-shadow: 0 6px 24px rgba(var(--accent-rgb), 0.15);
  }

  /* View Details badge */
  .admin-card-view-hint {
    position: absolute;
    top: 10px;
    right: 10px;
    background: var(--bg-elevated);
    border: 1px solid rgba(var(--accent-rgb), 0.35);
    color: var(--accent);
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
    z-index: 10;
    pointer-events: none;
  }
  .admin-product-card:hover .admin-card-view-hint {
    opacity: 1;
  }

  /* Active thumbnail highlight */
  .admin-angle-box.active-thumb {
    border-color: rgba(var(--accent-rgb), 0.6);
    box-shadow: 0 0 6px rgba(var(--accent-rgb), 0.25);
  }
  .admin-angle-box:hover {
    border-color: rgba(var(--accent-rgb), 0.4);
  }

  /* Checkbox overlay (unused in current admin card but kept for parity) */
  .admin-card-checkbox {
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 10;
    background: var(--bg-elevated);
    border-radius: 4px;
    padding: 3px 5px;
    display: flex;
    align-items: center;
    border: 1px solid rgba(var(--accent-rgb), 0.3);
    cursor: pointer;
  }
  .admin-card-checkbox input {
    cursor: pointer;
    accent-color: var(--accent);
  }

  /* Buyer Add Product button */
  .buyer-add-product-btn {
    margin-top: 10px;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 8px 12px;
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .buyer-add-product-btn:hover {
    background: var(--bg-surface);
    border-color: var(--accent);
  }
  .buyer-add-product-btn.selected {
    background: rgba(var(--accent-rgb), 0.15);
    border-color: var(--accent);
  }

  /* Recommended badge */
  .admin-recommended-badge {
    align-self: flex-start;
    margin-bottom: 8px;
    background: rgba(245, 158, 11, 0.12);
    border: 1px dashed rgba(245, 158, 11, 0.5);
    color: var(--amber);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.05em;
    padding: 3px 8px;
    border-radius: 4px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  /* Photo container */
  .admin-photo-container {
    height: 160px;
    background: var(--bg-elevated);
    border: 1px dashed var(--border);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
  }
  .admin-main-img {
    max-width: 85%;
    max-height: 135px;
    object-fit: contain;
  }
  .admin-placeholder-photo {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .admin-placeholder-icon {
    color: var(--text-muted);
  }
  .admin-placeholder-text {
    font-size: 12px;
    color: var(--text-muted);
    font-weight: 500;
  }

  /* Angle thumbnails row */
  .admin-angle-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
    margin-top: 8px;
    margin-bottom: 14px;
  }
  .admin-angle-box {
    height: 42px;
    background: var(--bg-elevated);
    border: 1px dashed var(--border);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 500;
    color: var(--text-muted);
    overflow: hidden;
  }
  .admin-angle-box img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  /* Brand */
  .admin-card-brand {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: var(--accent);
    text-transform: uppercase;
    margin-bottom: 4px;
  }

  /* Title */
  .admin-card-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1.35;
    margin-bottom: 8px;
    min-height: 38px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* Category pill */
  .admin-cat-wrap {
    margin-bottom: 12px;
  }
  .admin-category-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    padding: 4px 12px;
    border-radius: 9999px;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
  }
  .admin-cat-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
    display: inline-block;
  }

  /* Exported date row */
  .admin-exported-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    margin-bottom: 8px;
  }
  .admin-exported-row .admin-label {
    color: var(--text-muted);
    font-size: 11px;
  }
  .admin-exported-row .admin-val {
    color: var(--text-secondary);
    font-weight: 500;
    font-size: 11px;
  }

  /* SKU / UPC code row */
  .admin-code-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    margin-bottom: 8px;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
  }
  .admin-code-item {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .admin-code-item .admin-label {
    color: var(--text-muted);
    font-size: 10px;
    font-weight: 600;
  }
  .admin-code-item .admin-code-val {
    color: var(--text-secondary);
    font-size: 11px;
  }

  /* Color block */
  .admin-color-block {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 14px;
    font-size: 12px;
  }
  .admin-color-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .admin-color-row .admin-label {
    color: var(--text-muted);
    font-size: 12px;
  }
  .admin-color-swatch {
    width: 11px;
    height: 11px;
    border-radius: 50%;
    display: inline-block;
    flex-shrink: 0;
  }
  .admin-color-row .admin-color-val {
    color: var(--text-primary);
    font-weight: 600;
    font-size: 12px;
  }

  /* Footer / pricing section */
  .admin-card-footer {
    margin-top: auto;
    border-top: 1px solid var(--border);
    padding-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .admin-msrp-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 2px;
  }
  .admin-msrp-row .admin-label {
    color: var(--text-secondary);
    font-size: 12px;
  }
  .admin-msrp-val {
    font-size: 22px;
    font-weight: 800;
    color: var(--text-primary);
    letter-spacing: -0.02em;
  }
  .admin-price-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
  }
  .admin-price-row .admin-label {
    color: var(--text-secondary);
  }
  .admin-price-row .admin-val {
    color: var(--text-primary);
    font-weight: 600;
  }
  .admin-sale-row .admin-label,
  .admin-sale-row .admin-val {
    color: #f97316 !important;
    font-weight: 700 !important;
  }

  /* Status badge */
  .admin-status-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    margin-top: 4px;
  }
  .admin-status-row .admin-label {
    color: var(--text-secondary);
  }
  .admin-stock-badge {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    padding: 3px 8px;
    border-radius: 4px;
    display: inline-flex;
    align-items: center;
  }
  .admin-stock-badge.in-stock {
    background: rgba(var(--accent-rgb), 0.12);
    border: 1px solid rgba(var(--accent-rgb), 0.4);
    color: var(--accent);
  }
  .admin-stock-badge.low-stock {
    background: rgba(180, 83, 9, 0.15);
    border: 1px solid rgba(234, 179, 8, 0.4);
    color: var(--amber);
  }
  .admin-stock-badge.out-of-stock {
    background: rgba(220, 38, 38, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.4);
    color: var(--red);
  }
`
