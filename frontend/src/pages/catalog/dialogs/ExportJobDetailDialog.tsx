import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'
import CloseIcon from '@mui/icons-material/Close'
import { formatETDate } from '../../../lib/formatters'
import { getImageUrl } from '../../../lib/formatters'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ExportJobDetailDialogProps {
  open: boolean
  onClose: () => void
  job: any
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getStatusColor(status: string): 'success' | 'error' | 'warning' | 'info' | 'default' {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'done':
      return 'success'
    case 'failed':
    case 'error':
      return 'error'
    case 'pending':
    case 'queued':
      return 'warning'
    case 'processing':
    case 'in_progress':
      return 'info'
    default:
      return 'default'
  }
}

function formatLabel(str: string): string {
  if (!str) return '\u2014'
  return str
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ExportJobDetailDialog({
  open,
  onClose,
  job,
}: ExportJobDetailDialogProps) {
  if (!job) return null

  const productsSnapshot: Array<{
    product_id: string
    product_name: string
    sku: string
    upc?: string
    vendor_name?: string
    primary_image_url?: string
  }> = job.products_snapshot || []

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Export Job Details
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {/* Job metadata */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 1,
            }}
          >
            <DetailRow label="Job ID" value={job.id} />
            <DetailRow
              label="Status"
              value={
                <Chip
                  label={formatLabel(job.status || 'unknown')}
                  color={getStatusColor(job.status)}
                  size="small"
                  variant="outlined"
                />
              }
            />
            <DetailRow label="Format" value={(job.format || '\u2014').toUpperCase()} />
            <DetailRow label="Trigger Type" value={formatLabel(job.trigger_type || '')} />
            <DetailRow label="Triggered By" value={job.triggered_by_name || '\u2014'} />
            <DetailRow
              label="Role"
              value={job.triggered_by_role ? formatLabel(job.triggered_by_role) : '\u2014'}
            />
            <DetailRow label="Created At" value={formatETDate(job.created_at)} />
            <DetailRow label="Completed At" value={formatETDate(job.completed_at)} />
          </Box>

          {/* Failure details */}
          {job.failure_details && (
            <Alert severity="error" sx={{ mt: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Failure Details
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {job.failure_details}
              </Typography>
            </Alert>
          )}

          {/* Products snapshot */}
          {productsSnapshot.length > 0 && (
            <>
              <Divider sx={{ mt: 1 }} />
              <Typography variant="subtitle2">
                Products Snapshot ({productsSnapshot.length})
              </Typography>

              <Box
                sx={{
                  overflow: 'auto',
                  maxHeight: 360,
                  border: '1px solid var(--border, #e0e0e0)',
                  borderRadius: 1,
                }}
              >
                <table
                  style={{
                    borderCollapse: 'collapse',
                    width: '100%',
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr>
                      {['Image', 'Product Name', 'SKU', 'UPC', 'Vendor'].map((header) => (
                        <th
                          key={header}
                          style={{
                            position: 'sticky',
                            top: 0,
                            background: 'var(--bg-elevated, #f5f5f5)',
                            padding: '8px 12px',
                            textAlign: 'left',
                            borderBottom: '2px solid var(--border, #e0e0e0)',
                            fontWeight: 600,
                            fontSize: 12,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {productsSnapshot.map((item, idx) => (
                      <tr key={item.product_id || idx}>
                        <td
                          style={{
                            padding: '6px 12px',
                            borderBottom: '1px solid var(--border, #e0e0e0)',
                            verticalAlign: 'middle',
                          }}
                        >
                          {item.primary_image_url ? (
                            <img
                              src={getImageUrl(item.primary_image_url)}
                              alt={item.product_name}
                              style={{
                                width: 36,
                                height: 36,
                                objectFit: 'cover',
                                borderRadius: 4,
                                border: '1px solid var(--border, #e0e0e0)',
                              }}
                            />
                          ) : (
                            <Box
                              sx={{
                                width: 36,
                                height: 36,
                                borderRadius: 1,
                                background: 'var(--bg-muted, #eee)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 10,
                                color: 'var(--text-muted)',
                              }}
                            >
                              N/A
                            </Box>
                          )}
                        </td>
                        <td
                          style={{
                            padding: '6px 12px',
                            borderBottom: '1px solid var(--border, #e0e0e0)',
                          }}
                        >
                          {item.product_name || '\u2014'}
                        </td>
                        <td
                          style={{
                            padding: '6px 12px',
                            borderBottom: '1px solid var(--border, #e0e0e0)',
                            fontFamily: 'monospace',
                            fontSize: 12,
                          }}
                        >
                          {item.sku || '\u2014'}
                        </td>
                        <td
                          style={{
                            padding: '6px 12px',
                            borderBottom: '1px solid var(--border, #e0e0e0)',
                            fontFamily: 'monospace',
                            fontSize: 12,
                          }}
                        >
                          {item.upc || '\u2014'}
                        </td>
                        <td
                          style={{
                            padding: '6px 12px',
                            borderBottom: '1px solid var(--border, #e0e0e0)',
                          }}
                        >
                          {item.vendor_name || '\u2014'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </>
          )}

          {productsSnapshot.length === 0 && (
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              No products snapshot available for this job.
            </Typography>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Detail row helper
// ---------------------------------------------------------------------------
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 0.25 }}>
        {label}
      </Typography>
      {typeof value === 'string' ? (
        <Typography variant="body2">{value}</Typography>
      ) : (
        value
      )}
    </Box>
  )
}
