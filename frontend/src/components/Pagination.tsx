import React, { useState, useEffect, useMemo } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'

export interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize?: number
  onPageChange: (page: number) => void
  itemName?: string
}

export function usePagination<T>(items: T[], pageSize = 50) {
  const [currentPage, setCurrentPage] = useState(1)

  const totalItems = items?.length || 0
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endIndex = Math.min(currentPage * pageSize, totalItems)

  const paginatedItems = useMemo(() => {
    if (!items || items.length === 0) return []
    const start = (currentPage - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, currentPage, pageSize])

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
  }

  const goToPrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1))
  }

  const resetPage = () => setCurrentPage(1)

  return {
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    paginatedItems,
    goToNextPage,
    goToPrevPage,
    resetPage,
    pageSize,
  }
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 50,
  onPageChange,
  itemName = 'items',
}) => {
  if (totalItems <= 0) return null

  const startIndex = (currentPage - 1) * pageSize + 1
  const endIndex = Math.min(currentPage * pageSize, totalItems)

  const canGoPrev = currentPage > 1
  const canGoNext = currentPage < totalPages

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: '12px 16px',
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1.5,
        mt: 2,
        mb: 1,
        flexWrap: 'wrap',
        gap: 1.5,
      }}
    >
      <Typography variant="body2" color="text.secondary">
        Showing <strong>{startIndex}</strong>&ndash;<strong>{endIndex}</strong> of{' '}
        <strong>{totalItems}</strong> {itemName}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton
          size="small"
          disabled={!canGoPrev}
          onClick={() => canGoPrev && onPageChange(currentPage - 1)}
          title="Previous Page"
        >
          <ChevronLeftIcon fontSize="small" />
        </IconButton>

        <Typography
          variant="body2"
          sx={{
            px: 1.5,
            py: 0.5,
            bgcolor: 'action.hover',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            fontWeight: 500,
            fontSize: 12,
            minWidth: 90,
            textAlign: 'center',
          }}
        >
          Page {currentPage} of {totalPages}
        </Typography>

        <IconButton
          size="small"
          disabled={!canGoNext}
          onClick={() => canGoNext && onPageChange(currentPage + 1)}
          title="Next Page"
        >
          <ChevronRightIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  )
}

export default Pagination
