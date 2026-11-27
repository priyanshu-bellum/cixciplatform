import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import SmartphoneIcon from '@mui/icons-material/Smartphone'
import TabletIcon from '@mui/icons-material/TabletMac'
import WatchIcon from '@mui/icons-material/Watch'
import LaptopIcon from '@mui/icons-material/LaptopMac'
import HeadphonesIcon from '@mui/icons-material/Headphones'
import DevicesOtherIcon from '@mui/icons-material/DevicesOther'
import ArrowOutwardIcon from '@mui/icons-material/ArrowOutward'
import AddIcon from '@mui/icons-material/Add'
import CheckIcon from '@mui/icons-material/Check'
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import './deviceCatalog.css'

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
const STATUS_LABEL: Record<string, string> = {
  available: 'Available',
  launching: 'Launching',
  inactive: 'Inactive',
  eol: 'EOL',
}

const STATUS_TONE: Record<string, string> = {
  available: 'is-ok',
  launching: 'is-warn',
  inactive: 'is-off',
  eol: 'is-neutral',
}

const statusLabel = (status: string) =>
  STATUS_LABEL[status] ?? (status ? status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—')

// Icon is picked from the device type name only; unknown types fall back to a generic icon
function DeviceTypeIcon({ typeName }: { typeName?: string | null }) {
  const t = (typeName || '').toLowerCase()
  const sx = { fontSize: 24 }
  if (t.includes('watch') || t.includes('wearable')) return <WatchIcon sx={sx} />
  if (t.includes('tablet') || t.includes('ipad')) return <TabletIcon sx={sx} />
  if (t.includes('laptop') || t.includes('computer')) return <LaptopIcon sx={sx} />
  if (t.includes('headphone') || t.includes('earbud') || t.includes('audio')) return <HeadphonesIcon sx={sx} />
  if (t.includes('phone')) return <SmartphoneIcon sx={sx} />
  return <DevicesOtherIcon sx={sx} />
}

// ---------------------------------------------------------------------------
// Summary tile
// ---------------------------------------------------------------------------
export function DeviceStat({ label, value, tone, ink }: { label: string; value: ReactNode; tone?: string; ink?: boolean }) {
  return (
    <div className={`dc-stat${ink ? ' is-ink' : ''}`}>
      {tone && <span className="dc-stat-dot" style={{ background: tone }} />}
      <span className="dc-stat-label">{label}</span>
      <span className="dc-stat-value">{value}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// All Devices card
// ---------------------------------------------------------------------------
interface DeviceCardProps {
  name: string
  manufacturer?: string | null
  typeName?: string | null
  status: string
  launchDate?: string | null
  onOpen: () => void
  showPortfolioAction?: boolean
  inPortfolio?: boolean
  onAddToPortfolio?: () => void
}

export function DeviceCard({
  name,
  manufacturer,
  typeName,
  status,
  launchDate,
  onOpen,
  showPortfolioAction = false,
  inPortfolio = false,
  onAddToPortfolio,
}: DeviceCardProps) {
  return (
    <article
      className="dc-card is-clickable"
      role="button"
      tabIndex={0}
      aria-label={`View details for ${name}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
    >
      <div className="dc-head">
        <div className="dc-icon">
          <DeviceTypeIcon typeName={typeName} />
        </div>
        <div className="dc-titles">
          <span className="dc-mfr">{manufacturer || '—'}</span>
          <span className="dc-name" title={name}>{name}</span>
        </div>
        <span className="dc-arrow" aria-hidden="true">
          <ArrowOutwardIcon sx={{ fontSize: 16 }} />
        </span>
      </div>

      <div className="dc-meta">
        <span className="dc-pill">{typeName || '—'}</span>
        <span className={`dc-status ${STATUS_TONE[status] ?? 'is-neutral'}`}>{statusLabel(status)}</span>
        {launchDate && <span className="dc-date">Launch {launchDate}</span>}
      </div>

      {showPortfolioAction && (
        <div className="dc-actions">
          {inPortfolio ? (
            <button type="button" className="dc-btn is-done" disabled onClick={(e) => e.stopPropagation()}>
              <CheckIcon sx={{ fontSize: 15 }} /> In Portfolio
            </button>
          ) : (
            <button
              type="button"
              className="dc-btn"
              onClick={(e) => {
                e.stopPropagation()
                onAddToPortfolio?.()
              }}
            >
              <AddIcon sx={{ fontSize: 15 }} /> Add to Portfolio
            </button>
          )}
        </div>
      )}
    </article>
  )
}

// ---------------------------------------------------------------------------
// My Portfolio card
// ---------------------------------------------------------------------------
interface PortfolioDeviceCardProps {
  name: string
  manufacturer?: string | null
  typeName?: string | null
  status: string
  addedDate: string
  active: boolean
  canViewProducts: boolean
  onOpen: () => void
  onViewProducts: () => void
  onRemove: () => void
  onAddBack: () => void
}

export function PortfolioDeviceCard({
  name,
  manufacturer,
  typeName,
  status,
  addedDate,
  active,
  canViewProducts,
  onOpen,
  onViewProducts,
  onRemove,
  onAddBack,
}: PortfolioDeviceCardProps) {
  return (
    <article className={`dc-card${active ? '' : ' is-muted'}`}>
      <div className="dc-head">
        <div className="dc-icon">
          <DeviceTypeIcon typeName={typeName} />
        </div>
        <div className="dc-titles">
          <span className="dc-mfr">{manufacturer || '—'}</span>
          <button type="button" className="dc-name dc-name-link" title="View device details" onClick={onOpen}>
            {name}
          </button>
        </div>
      </div>

      <div className="dc-meta">
        <span className="dc-pill">{typeName || '—'}</span>
        <span className={`dc-status ${STATUS_TONE[status] ?? 'is-neutral'}`}>{statusLabel(status)}</span>
        <span className="dc-date">Added {addedDate}</span>
      </div>

      <div className="dc-actions">
        {canViewProducts && (
          <button type="button" className="dc-btn is-primary" onClick={onViewProducts}>
            View Products
          </button>
        )}
        {active ? (
          <button type="button" className="dc-btn is-danger" onClick={onRemove}>
            <DeleteIcon sx={{ fontSize: 15 }} /> Remove
          </button>
        ) : (
          <button type="button" className="dc-btn" onClick={onAddBack}>
            <AddIcon sx={{ fontSize: 15 }} /> Add back
          </button>
        )}
      </div>
    </article>
  )
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
export function DeviceCardSkeleton({ withAction = false }: { withAction?: boolean }) {
  return (
    <Box sx={{ p: '14px', borderRadius: '20px', border: 1, borderColor: 'divider', bgcolor: 'background.paper', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Skeleton variant="rounded" width={52} height={52} sx={{ borderRadius: '14px', flexShrink: 0 }} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="35%" sx={{ fontSize: 11 }} />
          <Skeleton variant="text" width="75%" sx={{ fontSize: 15 }} />
        </Box>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <Skeleton variant="rounded" width={78} height={24} sx={{ borderRadius: '999px' }} />
        <Skeleton variant="text" width={70} sx={{ fontSize: 12 }} />
      </Box>
      {withAction && <Skeleton variant="rounded" width="100%" height={36} sx={{ borderRadius: '999px' }} />}
    </Box>
  )
}
