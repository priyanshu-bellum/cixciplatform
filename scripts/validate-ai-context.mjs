// Dependency-free memory validation. Read-only; optional fresh inventory checks drift.
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { normalizeRoute, renderSchema, renderApi } from './render-ai-context-reference.mjs'

export const requiredDocs = ['PROJECT_OVERVIEW', 'ARCHITECTURE', 'CODEBASE_MAP', 'FEATURE_REGISTRY', 'DATABASE_SCHEMA', 'API_REGISTRY', 'BUSINESS_RULES', 'DECISIONS', 'CHANGELOG', 'CURRENT_STATE', 'KNOWN_ISSUES', 'TASKS', 'SESSION_HANDOFF']
const arrayFields = ['frontend_files', 'backend_files', 'database_entities', 'api_endpoints', 'dependencies', 'business_rules', 'related_tests', 'known_issues']
export function parseFeatures(text) {
  return [...text.matchAll(/```yaml\s*\n([\s\S]*?)```/g)].map(([, block]) => {
    const feature = {}
    for (const line of block.split(/\r?\n/)) {
      const m = line.match(/^([a-z_]+):\s*(.*)$/)
      if (!m) continue
      feature[m[1]] = arrayFields.includes(m[1]) ? JSON.parse(m[2]) : m[2]
    }
    return feature
  })
}

function markdownFiles(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name)
    return e.isDirectory() ? markdownFiles(p) : e.name.endsWith('.md') ? [p] : []
  })
}

export function validateMemory(root, inventory = null) {
  const errors = [], warnings = []
  const base = path.join(root, 'docs/ai-context')
  const read = p => fs.existsSync(p) ? fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '') : ''
  const check = (condition, message) => { if (!condition) errors.push(message) }
  const rel = p => path.relative(root, p).replaceAll('\\', '/')
  for (const name of requiredDocs) check(read(path.join(base, name + '.md')).trim().length > 30, `Missing/empty ${name}.md`)
  for (const p of ['AGENTS.md', 'CLAUDE.md']) check(read(path.join(root, p)).trim().length > 30, `Missing/empty ${p}`)
  const files = [...markdownFiles(base), ...['AGENTS.md', 'CLAUDE.md'].map(p => path.join(root, p))]
  const contents = new Map(files.map(p => [p, read(p)]))
  let links = 0
  for (const [p, body] of contents) {
    for (const [, target] of body.matchAll(/\[[^\]\n]+\]\(([^)\n]+)\)/g)) {
      if (/^(?:https?:|mailto:|#)/i.test(target)) continue
      const clean = target.replace(/^<|>$/g, '').split('#')[0].replace(/:\d+$/, '')
      check(fs.existsSync(path.resolve(path.dirname(p), decodeURIComponent(clean))), `Broken link in ${rel(p)}: ${target}`)
      links++
    }
    for (const [, target] of body.matchAll(/`((?:backend|frontend|scripts|architecture|modules)\/[A-Za-z0-9_./-]+)`/g)) {
      check(fs.existsSync(path.resolve(root, target)), `Missing source path in ${rel(p)}: ${target}`)
    }
  }
  let features = []
  try { features = parseFeatures(read(path.join(base, 'FEATURE_REGISTRY.md'))) }
  catch (e) { errors.push(`Invalid feature arrays: ${e.message}`) }
  check(features.length > 0, 'No feature records')
  const featureIds = new Set()
  for (const f of features) {
    check(/^[A-Z]+-\d{3}$/.test(f.feature_id), `Invalid feature ID ${f.feature_id}`)
    check(!featureIds.has(f.feature_id), `Duplicate feature ID ${f.feature_id}`)
    featureIds.add(f.feature_id)
    for (const key of ['feature_name', 'status', 'description', ...arrayFields]) check(Object.hasOwn(f, key), `${f.feature_id}: missing ${key}`)
    for (const key of arrayFields) check(Array.isArray(f[key]), `${f.feature_id}: ${key} must be an array`)
    check(['implemented', 'partial', 'planned', 'retired'].includes(f.status), `${f.feature_id}: invalid status`)
    for (const key of ['frontend_files', 'backend_files', 'related_tests']) for (const p of f[key] ?? []) check(fs.existsSync(path.join(root, p)), `${f.feature_id}: missing ${p}`)
  }
  const rules = new Set([...read(path.join(base, 'BUSINESS_RULES.md')).matchAll(/^\| (BR-[A-Z]+-\d+) \|/gm)].map(m => m[1]))
  const issues = new Set([...read(path.join(base, 'KNOWN_ISSUES.md')).matchAll(/^\| (ISSUE-\d+) /gm)].map(m => m[1]))
  const refs = [...contents.entries()].filter(([p]) => p.includes(`${path.sep}reference${path.sep}`))
  const models = new Set(refs.flatMap(([, body]) => [...body.matchAll(/^## (\w+\.\w+)$/gm)].map(m => m[1])))
  const endpoints = new Set(refs.flatMap(([, body]) => [...body.matchAll(/^\| (GET|POST|PUT|PATCH|DELETE) \| `([^`]+)`/gm)].map(m => `${m[1]} ${m[2]}`)))
  for (const f of features) {
    for (const d of f.dependencies ?? []) check(featureIds.has(d), `${f.feature_id}: unknown dependency ${d}`)
    for (const r of f.business_rules ?? []) check(rules.has(r), `${f.feature_id}: unknown rule ${r}`)
    for (const i of f.known_issues ?? []) check(issues.has(i), `${f.feature_id}: unknown issue ${i}`)
    for (const m of f.database_entities ?? []) check(models.has(m), `${f.feature_id}: unknown model ${m}`)
    for (const e of f.api_endpoints ?? []) check(endpoints.has(e), `${f.feature_id}: undocumented/nonexistent endpoint ${e}`)
  }
  const tasksText = read(path.join(base, 'TASKS.md'))
  const tasks = [...tasksText.matchAll(/^## (TASK-\d+) [^\n]+\n([\s\S]*?)(?=^## |$(?![\s\S]))/gm)]
  const taskIds = new Set()
  for (const [, id, body] of tasks) {
    check(!taskIds.has(id), `Duplicate task ID ${id}`); taskIds.add(id)
    check(/^- Status: (pending|in_progress|blocked|completed)$/m.test(body), `${id}: missing/invalid task status`)
  }
  check(tasks.length > 0, 'No task records')
  for (const p of ['CURRENT_STATE.md', 'SESSION_HANDOFF.md']) {
    const text = read(path.join(base, p))
    for (const id of new Set(text.match(/TASK-\d+/g) ?? [])) check(taskIds.has(id), `${p}: unknown task ${id}`)
    const objective = text.match(/^Active task: (TASK-\d+) — (in_progress|completed)\./m)
    check(Boolean(objective), `${p}: missing active task/status marker`)
    if (objective) {
      const task = tasks.find(t => t[1] === objective[1])
      check(Boolean(task && task[2].includes(`- Status: ${objective[2]}`)), `${p}: active task status differs from TASKS.md`)
    }
  }
  const stateMarker = read(path.join(base, 'CURRENT_STATE.md')).match(/^Active task:.*$/m)?.[0]
  const handoffMarker = read(path.join(base, 'SESSION_HANDOFF.md')).match(/^Active task:.*$/m)?.[0]
  check(stateMarker === handoffMarker, 'Current state and handoff active task markers differ')
  const ownedApps = fs.existsSync(path.join(root, 'backend/apps')) ? fs.readdirSync(path.join(root, 'backend/apps'), { withFileTypes: true }).filter(e => e.isDirectory() && fs.existsSync(path.join(root, 'backend/apps', e.name, 'models.py'))).map(e => e.name) : []
  for (const app of ownedApps) check(fs.existsSync(path.join(base, 'modules', app + '.md')), `Missing module guide ${app}`)
  if (inventory) {
    check(inventory.format_version === 1 && inventory.database_queried === false, 'Unsupported/unsafe inventory')
    for (const source of inventory.source) {
      const p = path.join(root, source.path)
      check(fs.existsSync(p), `Inventory source was removed: ${source.path}`)
      if (fs.existsSync(p) && source.sha256) check(createHash('sha256').update(fs.readFileSync(p)).digest('hex') === source.sha256, `Inventory is stale for ${source.path}; collect a fresh inventory`)
    }
    for (const m of inventory.models) check(models.has(m.model), `Model absent from references: ${m.model}`)
    check(models.size === inventory.models.length, 'Documented model count differs from inventory')
    const actual = new Set(inventory.routes.flatMap(r => Object.keys(r.methods).map(method => `${method} ${normalizeRoute(r.path)}`)))
    for (const e of actual) check(endpoints.has(e), `Route absent from references: ${e}`)
    for (const e of endpoints) check(actual.has(e), `Stale route in references: ${e}`)
    for (const app of new Set(inventory.models.map(m => m.model.split('.')[0]))) {
      check(read(path.join(base, 'reference/schema', app + '.md')) === renderSchema(app, inventory.models.filter(m => m.model.startsWith(app + '.')), inventory), `Schema metadata drift: ${app}`)
    }
    for (const p of fs.existsSync(path.join(base, 'reference/api')) ? fs.readdirSync(path.join(base, 'reference/api')) : []) {
      const group = p.replace(/\.md$/, '')
      const known = ['auth', 'tenant', 'audit', 'devices', 'catalog', 'media', 'notifications', 'pricing', 'routing', 'fulfillment', 'invoicing', 'integration', 'analytics', 'procurement', 'launch']
      const routes = inventory.routes.filter(r => { const n = normalizeRoute(r.path); const c = n.startsWith('/api/v1/') ? n.split('/')[3] : ''; return (known.includes(c) ? c : 'platform') === group })
      check(read(path.join(base, 'reference/api', p)) === renderApi(group, routes, root), `API handler/policy/consumer drift: ${group}`)
    }
  } else warnings.push('Fresh Django inventory not supplied: runtime route/model/handler drift not checked.')
  return { errors, warnings, stats: { documents: files.length, links, features: features.length, models: models.size, endpointMethods: endpoints.size, tasks: tasks.length, modules: ownedApps.length } }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const inventory = process.argv[2] ? JSON.parse(fs.readFileSync(process.argv[2], 'utf8').replace(/^\uFEFF/, '')) : null
  const result = validateMemory(root, inventory)
  console.log(JSON.stringify(result, null, 2))
  process.exitCode = result.errors.length ? 1 : 0
}
