import { useState, useMemo, ReactNode } from 'react';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import TablePagination from '@mui/material/TablePagination';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import EmptyState from './EmptyState';

export interface Column<T> {
  id: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: number | string;
  render?: (row: T, index: number) => ReactNode;
  getValue?: (row: T) => string | number;
}

type Order = 'asc' | 'desc';

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  rowKey?: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  initialSortColumn?: string;
  initialSortOrder?: Order;
  pageSize?: number;
  pageSizeOptions?: number[];
  stickyHeader?: boolean;
  maxHeight?: number | string;
  dense?: boolean;
}

export default function DataTable<T>({
  columns,
  rows,
  loading = false,
  emptyMessage = 'No data found',
  emptyIcon,
  rowKey,
  onRowClick,
  initialSortColumn,
  initialSortOrder = 'asc',
  pageSize = 25,
  pageSizeOptions = [10, 25, 50, 100],
  stickyHeader = false,
  maxHeight,
  dense = true,
}: DataTableProps<T>) {
  const [orderBy, setOrderBy] = useState(initialSortColumn ?? '');
  const [order, setOrder] = useState<Order>(initialSortOrder);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(pageSize);

  const handleSort = (colId: string) => {
    if (orderBy === colId) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setOrderBy(colId);
      setOrder('asc');
    }
  };

  const sorted = useMemo(() => {
    if (!orderBy) return rows;
    const col = columns.find((c) => c.id === orderBy);
    if (!col) return rows;
    const getValue = col.getValue ?? ((r: T) => (r as Record<string, unknown>)[col.id] as string | number);
    return [...rows].sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      const cmp = typeof va === 'string' ? va.localeCompare(String(vb)) : Number(va) - Number(vb);
      return order === 'asc' ? cmp : -cmp;
    });
  }, [rows, orderBy, order, columns]);

  const paginated = useMemo(
    () => sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [sorted, page, rowsPerPage],
  );

  if (loading) {
    return (
      <TableContainer component={Paper} variant="outlined">
        <Table size={dense ? 'small' : 'medium'}>
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={col.id} align={col.align}>{col.label}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {columns.map((col) => (
                  <TableCell key={col.id}><Skeleton variant="text" /></TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  if (!rows.length) {
    return (
      <Paper variant="outlined" sx={{ p: 4 }}>
        <EmptyState message={emptyMessage} icon={emptyIcon} />
      </Paper>
    );
  }

  return (
    <Box>
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ maxHeight: maxHeight ?? (stickyHeader ? 600 : undefined) }}
      >
        <Table size={dense ? 'small' : 'medium'} stickyHeader={stickyHeader}>
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell
                  key={col.id}
                  align={col.align}
                  sx={{ width: col.width }}
                >
                  {col.sortable !== false ? (
                    <TableSortLabel
                      active={orderBy === col.id}
                      direction={orderBy === col.id ? order : 'asc'}
                      onClick={() => handleSort(col.id)}
                    >
                      {col.label}
                    </TableSortLabel>
                  ) : (
                    col.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.map((row, idx) => (
              <TableRow
                key={rowKey ? rowKey(row, page * rowsPerPage + idx) : idx}
                hover
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                sx={onRowClick ? { cursor: 'pointer' } : undefined}
              >
                {columns.map((col) => (
                  <TableCell key={col.id} align={col.align}>
                    {col.render
                      ? col.render(row, page * rowsPerPage + idx)
                      : String((row as Record<string, unknown>)[col.id] ?? '\u2014')}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {rows.length > pageSizeOptions[0] && (
        <TablePagination
          component="div"
          count={rows.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={pageSizeOptions}
        />
      )}
    </Box>
  );
}
