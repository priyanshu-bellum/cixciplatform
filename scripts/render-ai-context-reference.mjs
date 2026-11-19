// Render only mechanical references; never overwrite curated memory or agent rules.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export function normalizeRoute(route) {
  return route.replaceAll('^', '').replaceAll('$', '')
    .replace(/\(\?P<(\w+)>[^)]+\)/g, '{$1}')
    .replace(/<(?:\w+:)?(\w+)>/g, '{$1}')
}

const code = value => '`' + String(value ?? 'none').replaceAll('`', "'").replaceAll('|', '\\|').replaceAll('\n', ' ') + '`'
const json = value => code(JSON.stringify(value))
const link = p => p ? `[${p}](../../../../${p})` : 'framework/dynamic (inspect handler)'
const names = xs => xs?.length ? xs.map(code).join(', ') : 'none declared'

export function renderSchema(app, models, inventory) {
  const migrations = inventory.source.filter(s => s.path.startsWith(`backend/apps/${app}/migrations/`) && !s.path.endsWith('__init__.py'))
  let md = `# ${app} — model definition reference\n\nGenerated from Django metadata using test settings. No database queried.\nThis describes checked-in definitions, not applied/deployed schema.\n\n`
  for (const m of models) {
    md += `## ${m.model}\n\nTable: ${code(m.table)}. Source: ${link(m.source)}.${m.auto_created ? ' Automatic M2M join model.' : ''}\n\n`
    md += '| Field / column | Django type | Constraints / defaults | Relationship |\n|---|---|---|---|\n'
    for (const f of m.fields) {
      const flags = [f.primary_key && 'PK', f.unique && 'unique', f.db_index && 'indexed', f.null ? 'NULL' : 'NOT NULL', f.blank && 'blank allowed', f.max_length != null && `length=${f.max_length}`, f.max_digits != null && `precision=${f.max_digits}, scale=${f.decimal_places}`, f.auto_now && 'auto_now', f.auto_now_add && 'auto_now_add', `default=${JSON.stringify(f.default)}`].filter(Boolean)
      const rel = f.relation ? `${f.relation}; ${f.on_delete || 'M2M'}; reverse=${f.related_name ?? '(default)'}${f.through ? '; through=' + f.through : ''}` : '—'
      md += `| ${code(f.name)} / ${code(f.column)} | ${code(f.type)} | ${code(flags.join('; '))} | ${code(rel)} |\n`
    }
    const choices = m.fields.filter(f => f.choices?.length)
    if (choices.length) md += '\nChoices (stored value → display label):\n\n' + choices.map(f => `- ${code(f.name)}: ${json(f.choices)}`).join('\n') + '\n'
    md += `\nIndexes: ${json(m.indexes)}.\n\nConstraints: ${json(m.constraints)}.\n\nUnique together: ${json(m.unique_together)}. Ordering: ${json(m.ordering)}.\n\n`
  }
  md += '## Migrations\n\n' + migrations.map(m => `- ${link(m.path)}`).join('\n') + '\n'
  return md
}

function sourceConsumers(root, routes) {
  const normalized = routes.map(r => normalizeRoute(r.path).replace(/^\/api\/v1/, ''))
  const needles = [...new Set(normalized.map(n => {
    const segments = n.split('/').filter(Boolean)
    // Resource matches avoid treating SPA navigation as API consumption.
    return '/' + segments.slice(0, segments[1] === 'operations' ? 3 : 2).join('/')
  }))]
  const found = []
  function scan(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name)
      if (entry.isDirectory()) scan(p)
      else if (/\.tsx?$/.test(p) && needles.some(n => fs.readFileSync(p, 'utf8').includes(n))) found.push(path.relative(root, p).replaceAll('\\', '/'))
    }
  }
  if (fs.existsSync(path.join(root, 'frontend/src'))) scan(path.join(root, 'frontend/src'))
  return found
}

export function renderApi(group, routes, root) {
  let md = `# ${group} — active URL reference\n\nGenerated from the active Django URL resolver using test settings. HEAD/OPTIONS,\nformat suffix aliases, router roots and Django admin internals are omitted.\nSee [API_REGISTRY](../../API_REGISTRY.md) for lifecycle, errors and contract notes.\n\n`
  for (const view of [...new Set(routes.map(r => r.view))].sort()) {
    const entries = routes.filter(r => r.view === view)
    const r = entries[0]
    md += `## ${view}\n\nHandler: ${link(r.source)}. Declared queryset model: ${code(r.model ?? 'dynamic/undeclared; inspect handler')}.\n\n`
    md += `Declared permissions: ${names(r.permission_classes)}. Authentication: ${names(r.authentication_classes)}.\n\nThrottles: ${names(r.throttle_classes)}. Required capability: ${code(r.required_capability)}.\n\nAction capability map: ${json(r.action_capability_map)}.\n\n`
    md += 'These are declarations, not a complete access proof: read custom permission,\nqueryset and action checks in the handler and its mixins. Plain Django views may\nimplement signature or session validation instead of DRF policies.\n\n'
    md += `Serializer: ${code(r.serializer)} at ${link(r.serializer_source)}.\n\n`
    const s = r.serializer_definition
    if (s) md += `Serializer fields: ${json(s.fields ?? 'dynamic')}. Read-only fields: ${json(s.read_only_fields ?? [])}. Excluded: ${json(s.exclude ?? [])}. Validation methods: ${names(s.validation_methods)}.\n\n`
    md += '| Method | Endpoint | Action |\n|---|---|---|\n'
    for (const e of entries) for (const [method, action] of Object.entries(e.methods)) md += `| ${method} | ${code(normalizeRoute(e.path))} | ${code(action)} |\n`
    md += '\n'
    const handlers = new Map()
    for (const e of entries) for (const [method, action] of Object.entries(e.methods)) {
      const h = e.handlers?.[method]
      if (h && !handlers.has(h.symbol)) handlers.set(h.symbol, { ...h, action })
    }
    for (const h of handlers.values()) {
      md += `- ${code(h.action)}: ${code(h.symbol)} in ${link(h.source)}. Direct request/query keys: ${names(h.request_keys)}. Direct Response dictionary keys: ${names(h.response_keys)}. Local service imports: ${names(h.dependencies)}.\n`
    }
    md += '\nRequest/response key extraction is static and partial; inherited CRUD uses the\nserializer above. Action-specific serializers, nested schemas, validations,\nservice calls and conditional response redaction must be read in source.\n\n'
    const consumers = sourceConsumers(root, entries)
    md += 'Frontend consumers (resource-path text matches; confirm action callers): ' + (consumers.length ? consumers.map(link).join(', ') : 'no direct resource-path match; may be indirect or external') + '.\n\n'
  }
  return md
}

export function renderReferences(inventory, root, selected = null) {
  const base = path.join(root, 'docs/ai-context/reference')
  let written = 0
  for (const app of [...new Set(inventory.models.map(m => m.model.split('.')[0]))].sort()) {
    if (selected && selected !== app) continue
    const p = path.join(base, 'schema', `${app}.md`)
    fs.mkdirSync(path.dirname(p), { recursive: true })
    fs.writeFileSync(p, renderSchema(app, inventory.models.filter(m => m.model.startsWith(app + '.')), inventory))
    written++
  }
  const groups = new Map()
  for (const route of inventory.routes) {
    const normalized = normalizeRoute(route.path)
    const candidate = normalized.startsWith('/api/v1/') ? normalized.split('/')[3] : ''
    const group = ['auth', 'tenant', 'audit', 'devices', 'catalog', 'media', 'notifications', 'pricing', 'routing', 'fulfillment', 'invoicing', 'integration', 'analytics', 'procurement', 'launch'].includes(candidate) ? candidate : 'platform'
    if (!groups.has(group)) groups.set(group, [])
    groups.get(group).push(route)
  }
  for (const [group, routes] of groups) {
    if (selected && selected !== group) continue
    const p = path.join(base, 'api', `${group}.md`)
    fs.mkdirSync(path.dirname(p), { recursive: true })
    fs.writeFileSync(p, renderApi(group, routes, root))
    written++
  }
  return written
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const inventoryFile = process.argv[2]
  if (!inventoryFile) throw new Error('Usage: node scripts/render-ai-context-reference.mjs <inventory.json> [app-or-route-group]')
  const inventory = JSON.parse(fs.readFileSync(inventoryFile, 'utf8').replace(/^\uFEFF/, ''))
  if (inventory.format_version !== 1 || inventory.database_queried !== false) throw new Error('Unsupported or unsafe inventory')
  console.log(`Rendered ${renderReferences(inventory, root, process.argv[3])} reference files. Curated documents were not changed.`)
}
