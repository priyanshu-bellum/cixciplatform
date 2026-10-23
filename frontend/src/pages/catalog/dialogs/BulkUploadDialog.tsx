import { useState, useEffect, useRef, useCallback } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import Stepper from '@mui/material/Stepper'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import LinearProgress from '@mui/material/LinearProgress'
import Chip from '@mui/material/Chip'
import CloseIcon from '@mui/icons-material/Close'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import DownloadIcon from '@mui/icons-material/Download'
import { parseCSV, validateCsvRows, formatExcelDate } from '../utils'
import api from '../../../lib/apiClient'

// ---------------------------------------------------------------------------
// CellInput -- inline editable table cell
// ---------------------------------------------------------------------------
function CellInput({
  value,
  onChange,
  isError,
  style,
}: {
  value: string
  onChange: (v: string) => void
  isError?: boolean
  style?: React.CSSProperties
}) {
  const [editing, setEditing] = useState(false)
  const [localVal, setLocalVal] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLocalVal(value)
  }, [value])

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus()
  }, [editing])

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={localVal}
        onChange={(e) => setLocalVal(e.target.value)}
        onBlur={() => {
          setEditing(false)
          if (localVal !== value) onChange(localVal)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            setEditing(false)
            if (localVal !== value) onChange(localVal)
          }
          if (e.key === 'Escape') {
            setEditing(false)
            setLocalVal(value)
          }
        }}
        style={{
          ...style,
          width: '100%',
          padding: '4px 6px',
          border: '1px solid var(--accent)',
          borderRadius: 4,
          background: 'var(--bg)',
          color: 'var(--text-primary)',
          fontSize: 12,
          outline: 'none',
        }}
      />
    )
  }

  return (
    <div
      onClick={() => setEditing(true)}
      style={{
        ...style,
        cursor: 'text',
        minHeight: 24,
        padding: '4px 6px',
        borderRadius: 4,
        border: isError ? '1px solid #ef4444' : '1px solid transparent',
        background: isError ? 'rgba(239,68,68,0.08)' : 'transparent',
        fontSize: 12,
        color: 'var(--text-primary)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
      title={value}
    >
      {value || (
        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
          empty
        </span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface BulkUploadDialogProps {
  open: boolean
  onClose: () => void
  onUploaded: () => void
  user: any
  allowedCategories: string[]
  allowedColors: string[]
  allowedBrands: string[]
  dropdownsLoaded: boolean
}

const STEPS = ['Upload & Preview CSV', 'Upload Images (ZIP)']

const UPDATE_MODE_OPTIONS = [
  { value: 'create_only', label: 'Create Only' },
  { value: 'update_existing', label: 'Update Existing' },
  { value: 'create_and_update', label: 'Create & Update' },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function BulkUploadDialog({
  open,
  onClose,
  onUploaded,
  user,
  allowedCategories,
  allowedColors,
  allowedBrands,
  dropdownsLoaded,
}: BulkUploadDialogProps) {
  const [activeStep, setActiveStep] = useState(0)

  // Step 1 state
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvPreviewRows, setCsvPreviewRows] = useState<string[][]>([])
  const [csvErrors, setCsvErrors] = useState<ReturnType<typeof validateCsvRows>>({
    hasErrors: false,
    rowErrors: {},
    cellErrors: {},
  })
  const [updateMode, setUpdateMode] = useState('create_only')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [importedCount, setImportedCount] = useState(0)
  const csvInputRef = useRef<HTMLInputElement>(null)

  // Step 2 state
  const [zipFile, setZipFile] = useState<File | null>(null)
  const [zipUploading, setZipUploading] = useState(false)
  const [zipError, setZipError] = useState<string | null>(null)
  const [zipSuccess, setZipSuccess] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const zipInputRef = useRef<HTMLInputElement>(null)

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setActiveStep(0)
      setCsvFile(null)
      setCsvHeaders([])
      setCsvPreviewRows([])
      setCsvErrors({ hasErrors: false, rowErrors: {}, cellErrors: {} })
      setUpdateMode('create_only')
      setUploading(false)
      setUploadError(null)
      setUploadSuccess(null)
      setImportedCount(0)
      setZipFile(null)
      setZipUploading(false)
      setZipError(null)
      setZipSuccess(null)
      setDragOver(false)
    }
  }, [open])

  // ---------------------------------------------------------------------------
  // CSV / XLSX parsing
  // ---------------------------------------------------------------------------
  const handleCsvFileSelect = useCallback(
    async (file: File) => {
      setCsvFile(file)
      setUploadError(null)
      setUploadSuccess(null)

      try {
        let headers: string[] = []
        let rows: string[][] = []

        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          const XLSX = await import('xlsx')
          const buffer = await file.arrayBuffer()
          const workbook = XLSX.read(buffer, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const sheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json<string[]>(sheet, {
            header: 1,
            raw: false,
            defval: '',
          })
          if (jsonData.length > 0) {
            headers = (jsonData[0] as string[]).map((h) => String(h).trim())
            rows = (jsonData.slice(1) as string[][])
              .filter((r) => r.some((c) => String(c).trim() !== ''))
              .map((r) =>
                r.map((c, ci) => {
                  const hNorm = headers[ci]?.toLowerCase().replace(/[^a-z0-9]/g, '') || ''
                  if (['launchdate', 'releasedate'].includes(hNorm)) {
                    return formatExcelDate(c)
                  }
                  return String(c ?? '').trim()
                }),
              )
          }
        } else {
          const text = await file.text()
          const parsed = parseCSV(text)
          if (parsed.length > 0) {
            headers = parsed[0]
            rows = parsed.slice(1)
          }
        }

        setCsvHeaders(headers)
        setCsvPreviewRows(rows)

        // Run validation
        const isVendor = user?.role === 'vendor' || user?.company_type === 'vendor'
        const validation = validateCsvRows(headers, rows, {
          isVendor,
          companyName: user?.company_name,
          allowedCategories,
          allowedColors,
          allowedBrands,
          dropdownsLoaded,
        })
        setCsvErrors(validation)
      } catch (err: any) {
        setUploadError(`Failed to parse file: ${err.message || 'Unknown error'}`)
        setCsvHeaders([])
        setCsvPreviewRows([])
      }
    },
    [user, allowedCategories, allowedColors, allowedBrands, dropdownsLoaded],
  )

  // ---------------------------------------------------------------------------
  // Inline cell edit handler
  // ---------------------------------------------------------------------------
  const handleCellEdit = useCallback(
    (rowIdx: number, colIdx: number, newVal: string) => {
      setCsvPreviewRows((prev) => {
        const updated = prev.map((r) => [...r])
        updated[rowIdx][colIdx] = newVal
        return updated
      })

      // Re-validate after edit
      setCsvPreviewRows((latest) => {
        const isVendor = user?.role === 'vendor' || user?.company_type === 'vendor'
        const validation = validateCsvRows(csvHeaders, latest, {
          isVendor,
          companyName: user?.company_name,
          allowedCategories,
          allowedColors,
          allowedBrands,
          dropdownsLoaded,
        })
        setCsvErrors(validation)
        return latest
      })
    },
    [csvHeaders, user, allowedCategories, allowedColors, allowedBrands, dropdownsLoaded],
  )

  // ---------------------------------------------------------------------------
  // Step 1 submit -- CSV upload
  // ---------------------------------------------------------------------------
  const handleCsvUpload = useCallback(async () => {
    if (!csvFile) return

    setUploading(true)
    setUploadError(null)
    setUploadSuccess(null)

    try {
      const formData = new FormData()
      formData.append('file', csvFile)
      formData.append('update_mode', updateMode)

      const res = await api.post('/catalog/products/bulk_upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const count = res.data?.imported_count ?? res.data?.count ?? csvPreviewRows.length
      setImportedCount(count)
      setUploadSuccess(`Successfully processed ${count} row(s).`)
      onUploaded()

      // Prompt to continue to image upload
      if (count > 0) {
        const goToImages = window.confirm(
          `${count} product(s) imported successfully. Would you like to upload product images (ZIP) now?`,
        )
        if (goToImages) {
          setActiveStep(1)
        }
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Upload failed'
      setUploadError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setUploading(false)
    }
  }, [csvFile, updateMode, csvPreviewRows.length, onUploaded])

  // ---------------------------------------------------------------------------
  // Step 2 -- ZIP upload
  // ---------------------------------------------------------------------------
  const handleZipSelect = useCallback((file: File) => {
    setZipFile(file)
    setZipError(null)
    setZipSuccess(null)
  }, [])

  const handleZipUpload = useCallback(async () => {
    if (!zipFile) return

    setZipUploading(true)
    setZipError(null)
    setZipSuccess(null)

    try {
      const formData = new FormData()
      formData.append('file', zipFile)

      await api.post('/media/assets/upload_zip/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setZipSuccess('Images uploaded successfully.')
      onUploaded()
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'ZIP upload failed'
      setZipError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setZipUploading(false)
    }
  }, [zipFile, onUploaded])

  // ---------------------------------------------------------------------------
  // Drag-and-drop handlers for ZIP
  // ---------------------------------------------------------------------------
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files?.[0]
      if (file && (file.name.endsWith('.zip') || file.type === 'application/zip')) {
        handleZipSelect(file)
      } else {
        setZipError('Please drop a ZIP file.')
      }
    },
    [handleZipSelect],
  )

  // ---------------------------------------------------------------------------
  // Download template
  // ---------------------------------------------------------------------------
  const handleDownloadTemplate = useCallback(() => {
    const link = document.createElement('a')
    link.href = '/Download CSV Template.csv'
    link.download = 'Download CSV Template.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Bulk Upload Products
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box sx={{ px: 3, pb: 1 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <DialogContent dividers sx={{ minHeight: 400 }}>
        {/* ---------------------------------------------------------------- */}
        {/* Step 1: CSV Upload & Preview                                      */}
        {/* ---------------------------------------------------------------- */}
        {activeStep === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Controls row */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                onClick={() => csvInputRef.current?.click()}
              >
                Select CSV / XLSX
              </Button>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleCsvFileSelect(file)
                  e.target.value = ''
                }}
              />

              <Button
                variant="text"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadTemplate}
                size="small"
              >
                Download Template
              </Button>

              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Update Mode</InputLabel>
                <Select
                  value={updateMode}
                  label="Update Mode"
                  onChange={(e) => setUpdateMode(e.target.value)}
                >
                  {UPDATE_MODE_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {csvFile && (
                <Chip
                  label={csvFile.name}
                  onDelete={() => {
                    setCsvFile(null)
                    setCsvHeaders([])
                    setCsvPreviewRows([])
                    setCsvErrors({ hasErrors: false, rowErrors: {}, cellErrors: {} })
                  }}
                  size="small"
                />
              )}
            </Box>

            {/* Errors / Success */}
            {uploadError && <Alert severity="error">{uploadError}</Alert>}
            {uploadSuccess && <Alert severity="success">{uploadSuccess}</Alert>}
            {csvErrors.hasErrors && (
              <Alert severity="warning">
                Validation errors found. Fix the highlighted cells or upload will proceed
                with the server performing its own validation.
              </Alert>
            )}

            {/* Preview table */}
            {csvHeaders.length > 0 && csvPreviewRows.length > 0 && (
              <Box sx={{ overflow: 'auto', maxHeight: 420, border: '1px solid var(--border)', borderRadius: 1 }}>
                <table
                  style={{
                    borderCollapse: 'collapse',
                    width: '100%',
                    fontSize: 12,
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        style={{
                          position: 'sticky',
                          top: 0,
                          background: 'var(--bg-elevated, #f5f5f5)',
                          padding: '6px 8px',
                          textAlign: 'left',
                          borderBottom: '2px solid var(--border)',
                          fontSize: 11,
                          fontWeight: 600,
                          minWidth: 30,
                        }}
                      >
                        #
                      </th>
                      {csvHeaders.map((h, i) => (
                        <th
                          key={i}
                          style={{
                            position: 'sticky',
                            top: 0,
                            background: 'var(--bg-elevated, #f5f5f5)',
                            padding: '6px 8px',
                            textAlign: 'left',
                            borderBottom: '2px solid var(--border)',
                            fontSize: 11,
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            minWidth: 100,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreviewRows.map((row, rowIdx) => (
                      <tr key={rowIdx}>
                        <td
                          style={{
                            padding: '2px 8px',
                            borderBottom: '1px solid var(--border)',
                            color: 'var(--text-muted)',
                            fontSize: 11,
                            verticalAlign: 'top',
                          }}
                        >
                          {rowIdx + 1}
                          {csvErrors.rowErrors[rowIdx] && (
                            <span
                              style={{ color: '#ef4444', marginLeft: 4, cursor: 'help' }}
                              title={csvErrors.rowErrors[rowIdx].join('\n')}
                            >
                              !
                            </span>
                          )}
                        </td>
                        {csvHeaders.map((_, colIdx) => (
                          <td
                            key={colIdx}
                            style={{
                              padding: '1px 2px',
                              borderBottom: '1px solid var(--border)',
                              verticalAlign: 'top',
                            }}
                          >
                            <CellInput
                              value={row[colIdx] ?? ''}
                              onChange={(v) => handleCellEdit(rowIdx, colIdx, v)}
                              isError={!!csvErrors.cellErrors[`${rowIdx}-${colIdx}`]}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            )}

            {/* Row error details */}
            {Object.keys(csvErrors.rowErrors).length > 0 && (
              <Box sx={{ maxHeight: 160, overflow: 'auto' }}>
                {Object.entries(csvErrors.rowErrors).map(([rowIdx, errors]) => (
                  <Alert key={rowIdx} severity="error" sx={{ mb: 0.5, py: 0, fontSize: 12 }}>
                    <strong>Row {Number(rowIdx) + 1}:</strong> {errors.join(' | ')}
                  </Alert>
                ))}
              </Box>
            )}

            {uploading && <LinearProgress />}
          </Box>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Step 2: ZIP Image Upload                                          */}
        {/* ---------------------------------------------------------------- */}
        {activeStep === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
            {importedCount > 0 && (
              <Alert severity="info" sx={{ width: '100%' }}>
                {importedCount} product(s) were imported. Upload a ZIP file containing product
                images to associate them with your products.
              </Alert>
            )}

            {/* Drag-and-drop zone */}
            <Box
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => zipInputRef.current?.click()}
              sx={{
                width: '100%',
                maxWidth: 500,
                minHeight: 200,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                border: dragOver ? '2px dashed var(--accent, #1976d2)' : '2px dashed var(--border, #ccc)',
                borderRadius: 2,
                cursor: 'pointer',
                background: dragOver ? 'rgba(25, 118, 210, 0.04)' : 'transparent',
                transition: 'all 0.2s ease',
                p: 3,
              }}
            >
              <CloudUploadIcon sx={{ fontSize: 48, color: 'var(--text-muted)' }} />
              <Typography variant="body1" color="textSecondary">
                Drag & drop a ZIP file here, or click to browse
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Supported format: .zip
              </Typography>
            </Box>

            <input
              ref={zipInputRef}
              type="file"
              accept=".zip"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleZipSelect(file)
                e.target.value = ''
              }}
            />

            {zipFile && (
              <Chip
                label={zipFile.name}
                onDelete={() => {
                  setZipFile(null)
                  setZipError(null)
                  setZipSuccess(null)
                }}
              />
            )}

            {zipError && <Alert severity="error" sx={{ width: '100%' }}>{zipError}</Alert>}
            {zipSuccess && <Alert severity="success" sx={{ width: '100%' }}>{zipSuccess}</Alert>}
            {zipUploading && <LinearProgress sx={{ width: '100%' }} />}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        {activeStep === 1 && (
          <Button onClick={() => setActiveStep(0)} disabled={zipUploading}>
            Back
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose} disabled={uploading || zipUploading}>
          {uploadSuccess || zipSuccess ? 'Done' : 'Cancel'}
        </Button>
        {activeStep === 0 && (
          <Button
            variant="contained"
            onClick={handleCsvUpload}
            disabled={!csvFile || uploading}
          >
            {uploading ? 'Uploading...' : 'Upload CSV'}
          </Button>
        )}
        {activeStep === 1 && (
          <Button
            variant="contained"
            onClick={handleZipUpload}
            disabled={!zipFile || zipUploading}
          >
            {zipUploading ? 'Uploading...' : 'Upload ZIP'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
