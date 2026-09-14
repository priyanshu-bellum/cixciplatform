import React, { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        marginTop: 16,
        marginBottom: 8,
        fontSize: 13,
        color: 'var(--text-secondary)',
        flexWrap: 'wrap',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>
          Showing <strong style={{ color: 'var(--text-primary)' }}>{startIndex}</strong>–
          <strong style={{ color: 'var(--text-primary)' }}>{endIndex}</strong> of{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{totalItems}</strong> {itemName}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          onClick={() => canGoPrev && onPageChange(currentPage - 1)}
          disabled={!canGoPrev}
          title="Previous Page"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            background: canGoPrev ? 'var(--bg-elevated)' : 'transparent',
            color: canGoPrev ? 'var(--text-primary)' : 'var(--text-muted)',
            cursor: canGoPrev ? 'pointer' : 'not-allowed',
            opacity: canGoPrev ? 1 : 0.4,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (canGoPrev) e.currentTarget.style.background = 'var(--bg-hover)'
          }}
          onMouseLeave={(e) => {
            if (canGoPrev) e.currentTarget.style.background = 'var(--bg-elevated)'
          }}
        >
          <ChevronLeft size={16} />
        </button>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 12px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontWeight: 500,
            fontSize: 12,
            minWidth: 90,
            justifyContent: 'center',
          }}
        >
          Page {currentPage} of {totalPages}
        </span>

        <button
          type="button"
          onClick={() => canGoNext && onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          title="Next Page"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            background: canGoNext ? 'var(--bg-elevated)' : 'transparent',
            color: canGoNext ? 'var(--text-primary)' : 'var(--text-muted)',
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            opacity: canGoNext ? 1 : 0.4,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (canGoNext) e.currentTarget.style.background = 'var(--bg-hover)'
          }}
          onMouseLeave={(e) => {
            if (canGoNext) e.currentTarget.style.background = 'var(--bg-elevated)'
          }}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

export default Pagination
