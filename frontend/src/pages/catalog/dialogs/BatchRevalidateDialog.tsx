import { useState } from 'react'
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, MenuItem, TextField, Typography,
} from '@mui/material'
import api from '../../../lib/apiClient'
import { apiError } from '../../../hooks/useCompatibilityOptions'

interface Props {
  open: boolean
  onClose: () => void
  categories: string[]
}

type Mode = 'report' | 'preview' | 'commit'

export default function BatchRevalidateDialog({ open, onClose, categories }: Props) {
  const [mode, setMode] = useState<Mode>('report')
  const [vendor, setVendor] = useState('')
  const [category, setCategory] = useState('')
  const [limit, setLimit] = useState('500')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<any>(null)

  const reset = () => { setResult(null); setError('') }

  const run = async () => {
    setBusy(true); setError(''); setResult(null)
    try {
      const payload: any = { mode, limit: parseInt(limit) || 500 }
      if (vendor) payload.vendor_company_reference = vendor
      if (category) payload.product_category = category
      const r = await api.post('/catalog/products/batch-revalidate/', payload)
      setResult(r.data)
    } catch (e) {
      setError(apiError(e))
    } finally {
      setBusy(false)
    }
  }

  const summary = result?.summary
  const outcomeColor = (o: string) => o === 'PASS' ? 'success' : o === 'WARN' ? 'warning' : 'error'

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Batch Revalidation — Normalization Rules v{result?.rule_version ?? '1.0.0'}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2, alignItems: 'end' }}>
          <TextField select label="Mode" value={mode} onChange={e => { setMode(e.target.value as Mode); reset() }} size="small" sx={{ minWidth: 180 }}>
            <MenuItem value="report">Report Only</MenuItem>
            <MenuItem value="preview">Preview & Approve</MenuItem>
            <MenuItem value="commit">Approved Batch Commit</MenuItem>
          </TextField>
          <TextField label="Vendor ID (optional)" value={vendor} onChange={e => setVendor(e.target.value)} size="small" sx={{ minWidth: 280 }}
            helperText="Leave blank for all vendors"/>
          <TextField select label="Category (optional)" value={category} onChange={e => setCategory(e.target.value)} size="small" sx={{ minWidth: 180 }}>
            <MenuItem value="">All Categories</MenuItem>
            {categories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </TextField>
          <TextField label="Limit" value={limit} onChange={e => setLimit(e.target.value)} size="small" type="number" sx={{ width: 100 }}/>
          <Button variant="contained" disabled={busy} onClick={run} color={mode === 'commit' ? 'error' : 'primary'}>
            {busy ? <CircularProgress size={20}/> : mode === 'commit' ? 'Run & Apply' : 'Run'}
          </Button>
        </Box>
        {mode === 'commit' && <Alert severity="warning" sx={{ mb: 2 }}>
          Commit mode will apply PASS-only normalization changes to live product data. This is audited but not easily reversible.
        </Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {summary && <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 1.5, mb: 2 }}>
          {[
            ['Total', summary.total, 'default'],
            ['Pass', summary.pass, 'success'],
            ['Warn', summary.warn, 'warning'],
            ['Fail', summary.fail, 'error'],
            ['Changed', summary.changed, 'info'],
            ...(mode === 'commit' ? [['Applied', summary.applied, 'success']] : []),
          ].map(([label, val, color]) => (
            <Box key={label as string} sx={{ p: 1, border: 1, borderColor: 'divider', borderRadius: 1, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">{label as string}</Typography>
              <Typography variant="h6" sx={{ fontWeight: 600 }} color={`${color}.main`}>{val as number}</Typography>
            </Box>
          ))}
        </Box>}
        {result?.results?.length > 0 && <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 400, overflow: 'auto' }}>
          {result.results.filter((r: any) => Object.keys(r.changes).length > 0 || r.warnings.length > 0).map((r: any) => (
            <Box key={r.product_id} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography sx={{ fontWeight: 600, flex: 1 }}>{r.sku} — {r.name}</Typography>
                <Chip label={r.outcome} size="small" color={outcomeColor(r.outcome) as any}/>
                {r.applied && <Chip label="Applied" size="small" color="success"/>}
              </Box>
              {Object.entries(r.changes).map(([field, diff]: [string, any]) => (
                <Box key={field} sx={{ ml: 1, mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{field}:</Typography>
                  <Typography variant="body2" sx={{ color: 'error.main', textDecoration: 'line-through', fontSize: '0.8rem' }}>
                    {String(diff.original).substring(0, 120) || '(empty)'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'success.main', fontSize: '0.8rem' }}>
                    {String(diff.proposed).substring(0, 120) || '(empty)'}
                  </Typography>
                </Box>
              ))}
              {r.warnings.map((w: any, i: number) => (
                <Typography key={i} variant="caption" color="warning.main" sx={{ ml: 1 }}>
                  {w.code}: {w.detail || w.field}
                </Typography>
              ))}
            </Box>
          ))}
          {result.results.filter((r: any) => Object.keys(r.changes).length === 0 && r.warnings.length === 0).length > 0 && (
            <Typography variant="body2" color="text.secondary">
              {result.results.filter((r: any) => Object.keys(r.changes).length === 0 && r.warnings.length === 0).length} product(s) already compliant — no changes needed.
            </Typography>
          )}
        </Box>}
        {!result && !busy && <Typography color="text.secondary">
          Select filters and mode, then run to see normalization results. Report mode shows the first 50 results; Preview shows all.
        </Typography>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
