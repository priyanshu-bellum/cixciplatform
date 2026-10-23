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
  imagesOnly?: boolean
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
  imagesOnly = false,
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
      setActiveStep(imagesOnly ? 1 : 0)
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
  }, [open, imagesOnly])

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
  // Derived — has a CSV been parsed?
  // ---------------------------------------------------------------------------
  const hasCsvPreview = csvHeaders.length > 0 && csvPreviewRows.length > 0

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={hasCsvPreview ? 'lg' : 'sm'}
      fullWidth
      PaperProps={{ sx: { transition: 'max-width 0.25s ease' } }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5 }}>
        {imagesOnly ? 'Upload Product Images' : 'Bulk Upload Products'}
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Stepper — only for bulk (not imagesOnly), and only when on CSV step or moving between */}
      {!imagesOnly && (
        <Box sx={{ px: 3, pb: 1 }}>
          <Stepper activeStep={activeStep}>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>
      )}

      <DialogContent dividers sx={{ p: 2.5 }}>
        {/* ============================================================== */}
        {/* Step 1: CSV Upload & Preview                                    */}
        {/* ============================================================== */}
        {activeStep === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {/* Hidden file input */}
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

            {/* ---- Before file selected: centered drop zone ------------ */}
            {!csvFile && !uploadSuccess && (
              <Box
                onClick={() => csvInputRef.current?.click()}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1.5,
                  border: '2px dashed var(--border, #ccc)',
                  borderRadius: 2,
                  cursor: 'pointer',
                  p: 4,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    background: 'rgba(25, 118, 210, 0.04)',
                  },
                }}
              >
                <CloudUploadIcon sx={{ fontSize: 40, color: 'var(--text-muted)' }} />
                <Typography variant="body2" color="textSecondary">
                  Drag & drop a CSV / XLSX file here, or click to browse
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                  <Button variant="outlined" size="small" startIcon={<CloudUploadIcon />}>
                    Select File
                  </Button>
                  <Button
                    variant="text"
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDownloadTemplate()
                    }}
                  >
                    Download Template
                  </Button>
                </Box>
              </Box>
            )}

            {/* ---- After file selected: toolbar + preview -------------- */}
            {(csvFile || uploadSuccess) && (
              <>
                {/* Controls bar */}
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    background: 'var(--bg-elevated, #fafafa)',
                    border: '1px solid var(--border, #e0e0e0)',
                    borderRadius: 1.5,
                    px: 1.5,
                    py: 1,
                  }}
                >
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<CloudUploadIcon />}
                    onClick={() => csvInputRef.current?.click()}
                  >
                    Change File
                  </Button>

                  <FormControl size="small" sx={{ minWidth: 170 }}>
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

                  <Box sx={{ flex: 1 }} />

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
                      variant="outlined"
                    />
                  )}

                  {hasCsvPreview && (
                    <Typography variant="caption" color="textSecondary">
                      {csvPreviewRows.length} row(s)
                    </Typography>
                  )}
                </Box>

                {/* Alerts */}
                {uploadError && <Alert severity="error" sx={{ py: 0.5 }}>{uploadError}</Alert>}
                {uploadSuccess && <Alert severity="success" sx={{ py: 0.5 }}>{uploadSuccess}</Alert>}
                {csvErrors.hasErrors && (
                  <Alert severity="warning" sx={{ py: 0.5 }}>
                    Validation errors found. Fix highlighted cells or the server will validate on upload.
                  </Alert>
                )}

                {/* Preview table */}
                {hasCsvPreview && (
                  <Box sx={{ overflow: 'auto', maxHeight: 400, border: '1px solid var(--border)', borderRadius: 1 }}>
                    <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
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
                              zIndex: 1,
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
                                zIndex: 1,
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
                  <Box sx={{ maxHeight: 120, overflow: 'auto' }}>
                    {Object.entries(csvErrors.rowErrors).map(([rowIdx, errors]) => (
                      <Alert key={rowIdx} severity="error" sx={{ mb: 0.5, py: 0, fontSize: 12 }}>
                        <strong>Row {Number(rowIdx) + 1}:</strong> {errors.join(' | ')}
                      </Alert>
                    ))}
                  </Box>
                )}

                {uploading && <LinearProgress />}
              </>
            )}
          </Box>
        )}

        {/* ============================================================== */}
        {/* Step 2: ZIP Image Upload                                        */}
        {/* ============================================================== */}
        {activeStep === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {importedCount > 0 && !imagesOnly && (
              <Alert severity="info" sx={{ py: 0.5 }}>
                {importedCount} product(s) imported. Upload a ZIP of product images to match them.
              </Alert>
            )}

            {imagesOnly && (
              <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                Upload a ZIP file containing product images. Images are matched by filename (e.g. SKU.jpg).
              </Typography>
            )}

            {/* Drag-and-drop zone */}
            <Box
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => zipInputRef.current?.click()}
              sx={{
                width: '100%',
                py: 5,
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
                '&:hover': {
                  borderColor: 'primary.main',
                  background: 'rgba(25, 118, 210, 0.04)',
                },
              }}
            >
              <CloudUploadIcon sx={{ fontSize: 40, color: 'var(--text-muted)' }} />
              <Typography variant="body2" color="textSecondary">
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
                size="small"
                variant="outlined"
              />
            )}

            {zipError && <Alert severity="error" sx={{ py: 0.5 }}>{zipError}</Alert>}
            {zipSuccess && <Alert severity="success" sx={{ py: 0.5 }}>{zipSuccess}</Alert>}
            {zipUploading && <LinearProgress />}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        {activeStep === 1 && !imagesOnly && (
          <Button onClick={() => setActiveStep(0)} disabled={zipUploading}>
            Back
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose} disabled={uploading || zipUploading}>
          {uploadSuccess || zipSuccess ? 'Done' : 'Cancel'}
        </Button>
        {activeStep === 0 && csvFile && (
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
