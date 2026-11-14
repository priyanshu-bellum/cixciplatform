import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import api from '../lib/apiClient'
import { apiError } from '../hooks/useCompatibilityOptions'

type Props = { value: string; onChange: (value: string) => void; disabled: boolean; supportedFields: string[] }
const label = (field: string) => field.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase())

export default function VendorCatalogConfigEditor({ value, onChange, disabled, supportedFields }: Props) {
  const [newField, setNewField] = useState('')
  const [sourceCategory, setSourceCategory] = useState('')
  const [category, setCategory] = useState('')
  const [error, setError] = useState('')
  const [constants, setConstants] = useState<Record<string, string>>({})
  const parsed = useMemo(() => {
    try {
      const data = JSON.parse(value)
      if (!data || Array.isArray(data) || typeof data !== 'object') return null
      if ('fields' in data && (!data.fields || Array.isArray(data.fields) || typeof data.fields !== 'object'
          || Object.values(data.fields).some(rule => !rule || Array.isArray(rule) || typeof rule !== 'object'))) return null
      if ('category_map' in data && (!data.category_map || Array.isArray(data.category_map) || typeof data.category_map !== 'object')) return null
      return data
    } catch { return null }
  }, [value])
  const categories = useQuery({ queryKey: ['vendor-catalog-approved-categories'], queryFn: async () => {
    const response = await api.get('/catalog/dropdown-configs/', { params: { field_name: 'product_category', status: 'active', paginate: 'false' } })
    return response.data.results || response.data
  } })
  const update = (changes: Record<string, any>) => { onChange(JSON.stringify({ ...parsed, ...changes }, null, 2)); setError('') }
  const fieldRule = (field: string, rule: Record<string, any> | null) => {
    const fields = { ...(parsed?.fields || {}) }
    if (rule) fields[field] = rule
    else delete fields[field]
    update({ fields })
  }
  const pathInput = (field: string, title: string, help?: string) => <TextField key={field} label={title} value={parsed?.[field] ?? ''} disabled={disabled} size="small"
    onChange={event => update({ [field]: event.target.value })} helperText={help}/>
  const approvedCategories = (categories.data || []).map((row: any) => row.value)
  return <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
    {error && <Alert severity="error">{error}</Alert>}
    {categories.error && <Alert severity="error">{apiError(categories.error)}</Alert>}
    {!parsed ? <Alert severity="warning">The mapping JSON is invalid. Correct it in Advanced JSON below to resume visual editing.</Alert> : <>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>Response & pagination</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
          {pathInput('items_path', 'Items array path', 'Example: data.items or records')}
          <TextField select label="Pagination method" value={parsed.pagination || 'cursor'} disabled={disabled} size="small" onChange={event => update({ pagination: event.target.value,
            ...(event.target.value === 'page' ? { page_param: parsed.page_param || 'page', has_more_path: parsed.has_more_path || 'has_more' } : {}),
            ...(event.target.value === 'offset' ? { offset_param: parsed.offset_param || 'offset', has_more_path: parsed.has_more_path || 'has_more' } : {}) })}>
            <MenuItem value="cursor">Cursor</MenuItem><MenuItem value="page">Page number</MenuItem><MenuItem value="offset">Offset</MenuItem><MenuItem value="none">Single response</MenuItem>
          </TextField>
          {pathInput('limit_param', 'Page size query parameter')}
          {parsed.pagination === 'cursor' && <>{pathInput('cursor_param', 'Cursor query parameter')}{pathInput('next_cursor_path', 'Next cursor response path')}</>}
          {parsed.pagination === 'page' && pathInput('page_param', 'Page number query parameter')}
          {parsed.pagination === 'offset' && pathInput('offset_param', 'Offset query parameter')}
          {['page', 'offset'].includes(parsed.pagination) && pathInput('has_more_path', 'Has more response path', 'Provider must return true or false.')}
          {pathInput('success_path', 'Success flag path (optional)', 'When configured, the response value must be true.')}
          {pathInput('watermark_path', 'Watermark response path (optional)')}
        </Box>
      </Paper>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, minWidth: 0 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Product field mapping</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Map each CIXCI field to the supplier's JSON path. Different suppliers can use different paths and price units. Constants must be explicitly verified; missing facts remain in review.</Typography>
        <TableContainer sx={{ maxHeight: 590, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Table size="small" stickyHeader sx={{ minWidth: 800 }}>
            <TableHead><TableRow>{['CIXCI field', 'Value source', 'Source path / constant', 'Conversion', ''].map(title => <TableCell key={title} sx={{ bgcolor: 'background.paper', fontWeight: 600 }}>{title}</TableCell>)}</TableRow></TableHead>
            <TableBody>{Object.entries(parsed.fields || {}).map(([field, item]) => {
              const rule = item as any
              const constant = Object.prototype.hasOwnProperty.call(rule, 'constant')
              return <TableRow key={field}>
                <TableCell sx={{ minWidth: 180 }}>{label(field)}{['external_id', 'sku', 'name'].includes(field) ? ' *' : ''}</TableCell>
                <TableCell><TextField select size="small" label={`Source for ${field}`} value={constant ? 'constant' : 'path'} disabled={disabled} sx={{ minWidth: 130 }} onChange={event => {
                  setConstants(previous => { const next = { ...previous }; delete next[field]; return next })
                  fieldRule(field, event.target.value === 'constant' ? { constant: '' } : { path: field })
                }}><MenuItem value="path">JSON path</MenuItem><MenuItem value="constant">Verified constant</MenuItem></TextField></TableCell>
                <TableCell sx={{ minWidth: 260 }}>{constant ? <TextField size="small" fullWidth label={`Constant for ${field} (JSON)`} disabled={disabled}
                  value={constants[field] ?? JSON.stringify(rule.constant)} onChange={event => setConstants(previous => ({ ...previous, [field]: event.target.value }))}
                  onBlur={() => { if (constants[field] === undefined) return; try { fieldRule(field, { ...rule, constant: JSON.parse(constants[field]) }) } catch { setError(`Enter a valid JSON constant for ${label(field)}, for example a quoted string or a number.`) } }}/>
                  : <TextField size="small" fullWidth label={`Path for ${field}`} value={rule.path || ''} disabled={disabled} onChange={event => fieldRule(field, { ...rule, path: event.target.value })}/>}</TableCell>
                <TableCell><TextField select size="small" label={`Conversion for ${field}`} value={rule.transform || 'identity'} disabled={disabled} sx={{ minWidth: 130 }} onChange={event => fieldRule(field, { ...rule, transform: event.target.value })}><MenuItem value="identity">As supplied</MenuItem><MenuItem value="cents">Cents → units</MenuItem></TextField></TableCell>
                <TableCell><Button size="small" disabled={disabled || ['external_id', 'sku', 'name'].includes(field)} onClick={() => fieldRule(field, null)}>Remove</Button></TableCell>
              </TableRow>
            })}</TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
          <TextField select label="Add CIXCI field" size="small" value={newField} disabled={disabled} sx={{ minWidth: 250 }} onChange={event => setNewField(event.target.value)}>
            {supportedFields.filter(field => !Object.prototype.hasOwnProperty.call(parsed.fields || {}, field)).map(field => <MenuItem key={field} value={field}>{label(field)}</MenuItem>)}
          </TextField><Button disabled={disabled || !newField} onClick={() => { fieldRule(newField, { path: newField }); setNewField('') }}>Add field mapping</Button>
        </Box>
      </Paper>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Category mapping</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Map source categories to approved CIXCI categories. A default applies to the entire feed; leave it blank when products belong to different categories.</Typography>
        <TextField select label="Default CIXCI category (optional)" value={parsed.default_category || ''} size="small" disabled={disabled} sx={{ minWidth: 250, maxWidth: '100%', mb: 2 }} onChange={event => update({ default_category: event.target.value })}>
          <MenuItem value="">No default — use approved mappings</MenuItem>
          {approvedCategories.map((name: string) => <MenuItem key={name} value={name}>{name}</MenuItem>)}
        </TextField>
        {Object.entries(parsed.category_map || {}).map(([source, destination]) => <Box key={source} sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
          <Typography sx={{ minWidth: 180, flex: 1 }}>{source}</Typography>
          <TextField select label={`CIXCI category for ${source}`} size="small" value={destination} disabled={disabled} sx={{ minWidth: 240 }} onChange={event => update({ category_map: { ...parsed.category_map, [source]: event.target.value } })}>
            {approvedCategories.map((name: string) => <MenuItem key={name} value={name}>{name}</MenuItem>)}
          </TextField><Button disabled={disabled} onClick={() => { const mappings = { ...parsed.category_map }; delete mappings[source]; update({ category_map: mappings }) }}>Remove</Button>
        </Box>)}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
          <TextField label="Source category value" size="small" value={sourceCategory} disabled={disabled} onChange={event => setSourceCategory(event.target.value)}/>
          <TextField select label="Map to CIXCI category" size="small" value={category} disabled={disabled} sx={{ minWidth: 240 }} onChange={event => setCategory(event.target.value)}>
            {approvedCategories.map((name: string) => <MenuItem key={name} value={name}>{name}</MenuItem>)}
          </TextField><Button disabled={disabled || !sourceCategory.trim() || !category} onClick={() => {
            const source = sourceCategory.trim()
            if (Object.prototype.hasOwnProperty.call(parsed.category_map || {}, source)) { setError('This source category already has a mapping. Edit its existing mapping.'); return }
            update({ category_map: { ...parsed.category_map, [source]: category } }); setSourceCategory(''); setCategory('')
          }}>Add category mapping</Button>
        </Box>
      </Paper>
      <Accordion variant="outlined" disableGutters>
        <AccordionSummary><Typography sx={{ fontWeight: 600 }}>Request limits & budget</Typography></AccordionSummary>
        <AccordionDetails><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
          {['page_size', 'requests_per_minute', 'daily_row_limit', 'daily_request_limit'].map(field => <TextField key={field} type="number" label={label(field)} size="small" value={parsed[field] ?? ''} disabled={disabled} onChange={event => update({ [field]: Number(event.target.value) })}/>)}
          {pathInput('budget_timezone', 'Provider budget timezone')}
        </Box></AccordionDetails>
      </Accordion>
    </>}
    <Accordion variant="outlined" disableGutters defaultExpanded={!parsed}>
      <AccordionSummary><Typography sx={{ fontWeight: 600 }}>Advanced JSON</Typography></AccordionSummary>
      <AccordionDetails><TextField label="Catalog field and pagination mapping (JSON)" multiline fullWidth minRows={12} maxRows={24} value={value} disabled={disabled} onChange={event => onChange(event.target.value)} slotProps={{ input: { sx: { fontFamily: 'monospace', fontSize: 13 } } }}/></AccordionDetails>
    </Accordion>
  </Box>
}
