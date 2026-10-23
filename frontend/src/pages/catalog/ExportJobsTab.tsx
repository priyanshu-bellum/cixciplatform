import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import RefreshIcon from '@mui/icons-material/Refresh'
import DescriptionIcon from '@mui/icons-material/Description'
import api from '../../lib/apiClient'
import { Pagination, usePagination } from '../../components/Pagination'
import ExportJobDetailDialog from './dialogs/ExportJobDetailDialog'

interface ExportJobsTabProps {
  user: any
}

const STATUS_CHIP_COLOR: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
  completed: 'success',
  processing: 'warning',
  pending: 'info',
  failed: 'error',
  cancelled: 'default',
}

export default function ExportJobsTab({ user }: ExportJobsTabProps) {
  const [selectedJob, setSelectedJob] = useState<any>(null)

  const { data: exportJobs, refetch: refreshJobs, isRefetching, isLoading } = useQuery({
    queryKey: ['export-jobs'],
    queryFn: () => api.get('/catalog/export-jobs/list_jobs/', { params: { paginate: 'false' } }).then(r => r.data).catch(() => []),
  })

  const jobs = Array.isArray(exportJobs) ? exportJobs : (exportJobs?.results ?? [])

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    paginatedItems: paginatedJobs,
  } = usePagination(jobs, 50)

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Export Jobs</Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => refreshJobs()}
          disabled={isRefetching}
        >
          {isRefetching ? 'Refreshing…' : 'Refresh'}
        </Button>
      </Box>

      {isLoading ? (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Job ID</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Format</TableCell>
                <TableCell align="center">Products</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Completed</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton variant="text" width={70} /></TableCell>
                  <TableCell><Skeleton variant="rounded" width={70} height={22} sx={{ borderRadius: '10px' }} /></TableCell>
                  <TableCell><Skeleton variant="text" width={40} /></TableCell>
                  <TableCell align="center"><Skeleton variant="text" width={30} sx={{ mx: 'auto' }} /></TableCell>
                  <TableCell><Skeleton variant="text" width={130} /></TableCell>
                  <TableCell><Skeleton variant="text" width={130} /></TableCell>
                  <TableCell align="center"><Skeleton variant="text" width={80} sx={{ mx: 'auto' }} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      ) : jobs.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <DescriptionIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">No export jobs yet</Typography>
          <Typography variant="body2" color="text.secondary">
            Select products from the All Products or My Compatibility tab and click Export to create a job.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Job ID</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Format</TableCell>
                <TableCell align="center">Products</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Completed</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedJobs.map((job: any) => (
                <TableRow key={job.id} hover>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                      {job.id?.substring(0, 8)}…
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={job.status}
                      size="small"
                      color={STATUS_CHIP_COLOR[job.status] ?? 'default'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{(job.format || 'csv').toUpperCase()}</TableCell>
                  <TableCell align="center">
                    {job.products_snapshot?.length ?? '—'}
                  </TableCell>
                  <TableCell>
                    {job.created_at ? new Date(job.created_at).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell>
                    {job.completed_at ? new Date(job.completed_at).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => setSelectedJob(job)}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      {totalItems > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={50}
          onPageChange={setCurrentPage}
          itemName="jobs"
        />
      )}

      <ExportJobDetailDialog
        open={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        job={selectedJob}
      />
    </Box>
  )
}
