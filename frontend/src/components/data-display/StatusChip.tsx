import Chip, { type ChipProps } from '@mui/material/Chip';

const STATUS_MAP: Record<string, { color: ChipProps['color']; label?: string }> = {
  active: { color: 'success' },
  approved: { color: 'success' },
  completed: { color: 'success' },
  complete: { color: 'success' },
  refunded: { color: 'success' },
  paid: { color: 'success' },
  exported: { color: 'success' },
  ready: { color: 'success' },
  shipped: { color: 'success' },
  selling: { color: 'success' },
  for_sale: { color: 'success', label: 'For Sale' },
  issued: { color: 'success' },
  sent: { color: 'success' },
  acknowledged: { color: 'success' },

  pending: { color: 'warning' },
  pending_review: { color: 'warning', label: 'Pending Review' },
  review_required: { color: 'warning', label: 'Review Required' },
  in_progress: { color: 'warning', label: 'In Progress' },
  processing: { color: 'warning' },
  draft: { color: 'warning' },
  partial: { color: 'warning' },
  out_of_stock: { color: 'warning', label: 'Out of Stock' },
  under_review: { color: 'warning', label: 'Under Review' },
  partially_paid: { color: 'warning', label: 'Partially Paid' },
  disputed: { color: 'warning' },

  rejected: { color: 'error' },
  failed: { color: 'error' },
  cancelled: { color: 'error' },
  inactive: { color: 'error' },
  deactivated: { color: 'error' },
  overdue: { color: 'error' },
  error: { color: 'error' },
  closed: { color: 'error' },
  stop_selling: { color: 'error', label: 'Stop Selling' },
  suspended: { color: 'error' },
  void: { color: 'error' },

  retired: { color: 'default' },
  archived: { color: 'default' },
  incomplete: { color: 'default' },
  unknown: { color: 'default' },
  not_listed: { color: 'default', label: 'Not Listed' },
  eol: { color: 'default', label: 'EOL' },
  superseded: { color: 'default' },
};

interface StatusChipProps {
  status: string;
  label?: string;
  size?: ChipProps['size'];
}

export default function StatusChip({ status, label, size = 'small' }: StatusChipProps) {
  const key = (status || '').toLowerCase().replace(/\s+/g, '_');
  const mapped = STATUS_MAP[key] ?? { color: 'default' as const };
  const displayLabel = label ?? mapped.label ?? status?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ?? 'Unknown';

  return <Chip label={displayLabel} color={mapped.color} size={size} variant="filled" />;
}
