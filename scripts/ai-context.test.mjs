import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeRoute, renderSchema, renderReferences } from './render-ai-context-reference.mjs'
import { parseFeatures, validateMemory } from './validate-ai-context.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
function removeFixture(dir) {
  const resolved = path.resolve(dir)
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !/^cixci-memory-(?:test|render)-/.test(path.basename(resolved))) throw new Error('Unsafe fixture cleanup path')
  fs.rmSync(resolved, { recursive: true, force: true })
}
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cixci-memory-test-'))
  // This fixed fixture directory is created by this test only.
  t.after(() => removeFixture(dir))
  fs.cpSync(path.join(root, 'docs/ai-context'), path.join(dir, 'docs/ai-context'), { recursive: true })
  fs.copyFileSync(path.join(root, 'AGENTS.md'), path.join(dir, 'AGENTS.md'))
  fs.copyFileSync(path.join(root, 'CLAUDE.md'), path.join(dir, 'CLAUDE.md'))
  return dir
}

test('Django regex and converter paths normalize to stable endpoint placeholders', () => {
  assert.equal(normalizeRoute('/api/v1/catalog/^products/(?P<pk>[^/.]+)/$'), '/api/v1/catalog/products/{pk}/')
  assert.equal(normalizeRoute('/api/v1/integration/webhooks/<uuid:receiver_id>/'), '/api/v1/integration/webhooks/{receiver_id}/')
  assert.equal(normalizeRoute('/api/img/<str:code>'), '/api/img/{code}')
})

test('feature parser keeps arrays structured and rejects malformed arrays', () => {
  const block = '```yaml\nfeature_id: A-001\ndependencies: ["B-001"]\n```'
  assert.deepEqual(parseFeatures(block)[0].dependencies, ['B-001'])
  assert.throws(() => parseFeatures(block.replace('["B-001"]', '[invalid]')))
})

test('schema rendering retains FK deletion, precision, defaults and constraints', () => {
  const model = { model: 'x.Line', table: 'x_line', source: 'backend/apps/x/models.py', fields: [{ name: 'amount', column: 'amount', type: 'DecimalField', max_digits: 10, decimal_places: 4, null: false, default: '0', relation: 'x.Parent', on_delete: 'PROTECT' }], indexes: [], constraints: [['unique', [], {name:'unique_line'}]], unique_together: [], ordering: [] }
  const md = renderSchema('x', [model], {source: []})
  assert.match(md, /precision=10, scale=4/)
  assert.match(md, /x.Parent; PROTECT/)
  assert.match(md, /unique_line/)
  assert.match(md, /NOT NULL/)
})

test('reference rendering preserves curated files and supports targeted refresh', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cixci-memory-render-'))
  t.after(() => removeFixture(dir))
  fs.mkdirSync(path.join(dir, 'docs/ai-context'), {recursive: true})
  const state = path.join(dir, 'docs/ai-context/CURRENT_STATE.md')
  fs.writeFileSync(state, 'curated state')
  const inventory = {source: [], models: [{model:'x.Item', table:'x', fields:[], indexes:[], constraints:[], unique_together:[], ordering:[]}], routes:[]}
  assert.equal(renderReferences(inventory, dir, 'unrelated'), 0)
  assert.equal(renderReferences(inventory, dir, 'x'), 1)
  assert.equal(fs.readFileSync(state, 'utf8'), 'curated state')
})

test('repository memory has valid paths, feature references and consistent startup records', () => {
  const result = validateMemory(root)
  assert.deepEqual(result.errors, [])
  assert.ok(result.stats.features >= 29)
  assert.equal(result.stats.modules, 14)
})

test('validator catches a broken relative link', t => {
  const dir = fixture(t)
  fs.appendFileSync(path.join(dir, 'docs/ai-context/PROJECT_OVERVIEW.md'), '\n[broken](missing-source.md)\n')
  assert.ok(validateMemory(dir).errors.some(e => e.includes('missing-source.md')))
})

test('validator catches unknown feature dependency and endpoint', t => {
  const dir = fixture(t)
  const registry = path.join(dir, 'docs/ai-context/FEATURE_REGISTRY.md')
  fs.appendFileSync(registry, '\n```yaml\nfeature_id: BAD-001\nfeature_name: bad\nstatus: implemented\ndescription: bad\nfrontend_files: []\nbackend_files: []\ndatabase_entities: []\napi_endpoints: ["GET /api/v1/missing/"]\ndependencies: ["MISSING-999"]\nbusiness_rules: []\nrelated_tests: []\nknown_issues: []\n```\n')
  const errors = validateMemory(dir).errors
  assert.ok(errors.some(e => e.includes('unknown dependency MISSING-999')))
  assert.ok(errors.some(e => e.includes('endpoint GET /api/v1/missing/')))
})

test('validator catches duplicate IDs and inconsistent active task status', t => {
  const dir = fixture(t)
  const registry = path.join(dir, 'docs/ai-context/FEATURE_REGISTRY.md')
  fs.appendFileSync(registry, '\n```yaml\nfeature_id: AUTH-001\n```\n')
  const state = path.join(dir, 'docs/ai-context/CURRENT_STATE.md')
  const current = fs.readFileSync(state, 'utf8')
  const wrongStatus = current.includes('Active task: TASK-001 — completed.') ? 'in_progress' : 'completed'
  fs.writeFileSync(state, current.replace(/^Active task:.*$/m, `Active task: TASK-001 — ${wrongStatus}.`))
  const errors = validateMemory(dir).errors
  assert.ok(errors.some(e => e.includes('Duplicate feature ID AUTH-001')))
  assert.ok(errors.some(e => e.includes('active task status differs') || e.includes('markers differ')))
})
