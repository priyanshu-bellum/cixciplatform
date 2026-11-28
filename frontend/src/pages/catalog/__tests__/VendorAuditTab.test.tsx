import { test, after, afterEach, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import type { AuditProduct } from '../vendorAuditData'

interface TestRequest { endpoint: string; method: string; body: { device_ids?: string[]; product_ids?: string[]; update_type?: string }; params: Record<string, string> }
interface TestHarness {
  state: { rows: AuditProduct[]; requests: TestRequest[]; errors: string[]; failure: { endpoint: string; code: number; data: unknown } | null }
  vendorId: string; productIds: string[]; devices: { id: string }[]; phoneTypeId: string
  reset: (query?: string) => Promise<void>; close: () => Promise<void>
  evaluate: (expression: string) => Promise<unknown>; until: (expression: string) => Promise<void>
  click: (selector: string) => Promise<void>; button: (text: string) => Promise<void>
  select: (label: string, value: string) => Promise<void>; screenshot: (name: string) => Promise<void>
  chooseDevice: (name: string, scope?: string) => Promise<void>; call: (method: string, params: Record<string, unknown>) => Promise<unknown>
}
const h = (globalThis as unknown as { __vendorAuditTest: TestHarness }).__vendorAuditTest
beforeEach(async () => { await h.reset(); await h.until('document.querySelectorAll(\'[data-testid="audit-product"]\').length===2') })
after(async () => { await h.close() })
afterEach(() => assert.deepEqual(h.state.errors, []))

test('renders vendor selector and loads products after vendor selection', async () => {
  await h.reset('?empty=1')
  assert.equal(await h.evaluate('!!document.querySelector(\'[data-testid="audit-vendor-selector"]\')'), true)
  assert.equal(await h.evaluate('document.querySelectorAll(\'[data-testid="audit-product"]\').length'), 0)
  await h.select('Vendor', h.vendorId)
  await h.until('document.querySelectorAll(\'[data-testid="audit-product"]\').length===2')
  assert.ok(h.state.requests.some(request => request.endpoint.endsWith('/vendor-audit/') && request.params.vendor === h.vendorId))
})

test('product click shows vendor/system comparison and review errors', async () => {
  await h.click(`[data-product-id="${h.productIds[0]}"]`)
  await h.until('!!document.querySelector(\'[data-testid="audit-comparison"]\')')
  const text = String(await h.evaluate('document.querySelector(\'[data-testid="audit-comparison"]\').innerText'))
  assert.match(text, /Provider product 1/)
  assert.match(text, /System product 1/)
  assert.match(text, /COMPATIBILITY_REVIEW_REQUIRED/)
  await h.screenshot('vendor-audit-comparison.png')
})

test('device add/remove and save send canonical UUIDs', async () => {
  await h.click(`[data-product-id="${h.productIds[0]}"]`)
  await h.button('Auto-suggest')
  await h.button('Model Alpha')
  await h.until('document.querySelector(\'[data-testid="audit-current-devices"]\').innerText.includes("Model Alpha")')
  await h.click('[data-testid="audit-current-devices"] .MuiChip-deleteIcon')
  await h.until('!document.querySelector(\'[data-testid="audit-current-devices"]\').innerText.includes("Model Alpha")')
  await h.chooseDevice('Model Beta')
  await h.button('Save device mapping')
  await h.until('document.body.innerText.includes("Changes saved.")')
  const request = h.state.requests.find(request => request.endpoint.endsWith('/map-devices/'))!
  assert.deepEqual(request.body.device_ids, [h.devices[1].id])
  assert.equal(request.body.update_type, 'replace')
  assert.equal(h.state.rows[0].device_assertions[0].device_id, h.devices[1].id)
})

test('bulk select and map update both selected products', async () => {
  await h.click('input[aria-label="Select SKU-1"]')
  await h.click('input[aria-label="Select SKU-2"]')
  await h.button('Map Devices to Selected')
  await h.until('!!document.querySelector(\'[role="dialog"]\')')
  await h.chooseDevice('Model Alpha', '[role="dialog"]')
  await h.button('Apply device mapping')
  await h.until('!document.querySelector(\'[role="dialog"]\')')
  const request = h.state.requests.find(request => request.endpoint.endsWith('/bulk-map-devices/'))!
  assert.deepEqual(request.body.product_ids, h.productIds)
  assert.deepEqual(request.body.device_ids, [h.devices[0].id])
  assert.ok(h.state.rows.every(row => row.device_assertions.length === 1))
})

test('review resolve clears review and refreshes the product and stats', async () => {
  await h.click(`[data-product-id="${h.productIds[0]}"]`)
  await h.button('Resolve Review')
  await h.until('document.body.innerText.includes("Changes saved.")')
  assert.deepEqual(h.state.rows[0].review_errors, [])
  assert.ok(h.state.requests.filter(request => request.endpoint.endsWith('/vendor-audit-stats/')).length >= 2)
  await h.until('!document.querySelector(\'[data-testid="audit-actions"]\').innerText.includes("Review Required")')
})

test('category override and color save use existing product PATCH contracts', async () => {
  await h.click(`[data-product-id="${h.productIds[0]}"]`)
  await h.select('Approved category', 'Screen Protection')
  await h.until('!!document.querySelector(\'[aria-label="Category compatibility setup"]\')')
  await h.chooseDevice('Model Alpha', '[aria-label="Category compatibility setup"]')
  await h.button('Save category')
  await h.until('document.querySelector(\'[data-testid="audit-comparison"]\').innerText.includes("Screen Protection")')
  assert.equal(h.state.rows[0].product_category_override, 'Screen Protection')
  await h.select('System color', 'Blue')
  await h.button('Save color')
  await h.until('[...document.querySelectorAll(\'[data-testid="audit-comparison"] tr\')].some(row=>row.cells[0]?.textContent === "Color" && row.cells[2]?.textContent === "Blue")')
  assert.equal(h.state.rows[0].system_color, 'Blue')
})

test('Speakers category opens required fields and saves declared answers and Universal scope together', async () => {
  await h.click(`[data-product-id="${h.productIds[0]}"]`)
  await h.select('Approved category','Speakers')
  await h.until('document.body.innerText.includes("Speakers fields")')
  await h.button('Save category')
  await h.until('document.body.innerText.includes("Charging Interface requires a declared answer")')
  assert.equal(h.state.requests.filter(request=>request.method==='PATCH').length,0)
  await h.select('Charging Interface','USB-C')
  await h.select('Bluetooth','No')
  await h.click('input[aria-label="Universal Phone"]')
  await h.button('Save category')
  await h.until('!document.querySelector(\'[aria-label="Category compatibility setup"]\')')
  const request=h.state.requests.find(request=>request.method==='PATCH')!
  assert.equal((request.body as Record<string,unknown>).compatible_charging_interface,'USB-C')
  assert.equal((request.body as Record<string,unknown>).bluetooth_compatibility,'No')
  assert.deepEqual((request.body as Record<string,unknown>).compatible_device_types,[h.phoneTypeId])
})

test('per-product Universal option preserves category and requires explicit type selection', async () => {
  await h.click(`[data-product-id="${h.productIds[0]}"]`)
  await h.button('Edit compatibility / Universal')
  await h.until('!!document.querySelector(\'[aria-label="Category compatibility setup"]\')')
  await h.select('Product compatibility','universal')
  await h.click('input[aria-label="Universal Phone"]')
  await h.button('Save category')
  await h.until('!document.querySelector(\'[aria-label="Category compatibility setup"]\')')
  assert.equal(h.state.rows[0].product_category,'Cases')
  assert.equal(h.state.rows[0].product_category_override,undefined)
  assert.equal(h.state.rows[0].compatibility_mode,'universal_device_type')
})

test('No Devices feature-based product requires an explicit Hybrid rule change before model mapping', async () => {
  await h.reset('?feature=1')
  await h.until('document.querySelectorAll(\'[data-testid="audit-product"]\').length===2')
  await h.button('No Devices')
  await h.until('document.querySelectorAll(\'[data-testid="audit-product"]\').length===2')
  await h.click(`[data-product-id="${h.productIds[0]}"]`)
  await h.until('document.querySelector(\'[data-testid="audit-actions"]\').innerText.includes("Hybrid category rules")')
  assert.equal(await h.evaluate('[...document.querySelectorAll("button")].some(button=>button.textContent === "Save device mapping")'),false)
  await h.button('Edit compatibility / Universal')
  await h.button('Edit Category Rules')
  await h.select('Compatibility Mode','hybrid')
  await h.button('Save Configuration')
  await h.until('!!document.querySelector(\'[aria-label="Category compatibility setup"] input[role="combobox"]\')')
  await h.chooseDevice('Model Beta','[aria-label="Category compatibility setup"]')
  await h.button('Save category')
  await h.until('!document.querySelector(\'[aria-label="Category compatibility setup"]\')')
  const mapping=h.state.requests.find(request=>request.method==='PATCH'&&request.endpoint.includes('/products/'))!
  assert.deepEqual(mapping.body.device_ids,[h.devices[1].id])
  assert.equal(await h.evaluate('document.body.innerText.includes("Some mappings were unavailable or protected")'),false)
})

test('failed mutation shows error and keeps review unchanged', async () => {
  await h.click(`[data-product-id="${h.productIds[0]}"]`)
  h.state.failure = { endpoint: `/api/v1/catalog/products/${h.productIds[0]}/resolve-review/`, code: 400, data: { detail: 'Review could not be saved' } }
  await h.button('Resolve Review')
  await h.until('document.body.innerText.includes("Review could not be saved")')
  assert.equal(h.state.rows[0].review_errors.length, 1)
})

test('bundle mapping has a direct Hybrid setup action and saves a different canonical model', async () => {
  await h.reset('?bundle=1')
  await h.until('document.querySelectorAll(\'[data-testid="audit-product"]\').length===2')
  await h.click(`[data-product-id="${h.productIds[0]}"]`)
  await h.button('Configure manual mapping')
  await h.until('document.body.innerText.includes("Configuring Category:")')
  assert.equal(h.state.requests.filter(request=>request.method==='PATCH').length,0)
  assert.equal(await h.evaluate('document.querySelector(\'[role="dialog"]\').innerText.includes("Feature Based")'),true)
  assert.equal(await h.evaluate('document.querySelector(\'[role="dialog"]\').innerText.includes("every product in Phone Attachments")'),true)
  await h.select('Compatibility Mode','hybrid')
  await h.button('Save Configuration')
  await h.until('!!document.querySelector(\'[data-testid="audit-actions"] input[role="combobox"]\')')
  await h.chooseDevice('Galaxy Z Fold8','[data-testid="audit-actions"]')
  await h.button('Save device mapping')
  await h.until('document.body.innerText.includes("Changes saved.")')
  const mapping=h.state.requests.find(request=>request.endpoint.endsWith('/map-devices/'))!
  assert.deepEqual(mapping.body.device_ids,[h.devices[2].id])
  assert.equal(h.state.rows[0].product_category,'Phone Attachments')
  assert.deepEqual(h.state.rows[0].payload_devices,[{name:'Galaxy Z Flip8'}])
  assert.deepEqual(h.state.rows[0].vendor_payload.compatible_devices,[{name:'Galaxy Z Flip8'}])
  assert.equal(h.state.rows[0].device_assertions[0].device_id,h.devices[2].id)
  await h.screenshot('vendor-audit-bundle-manual-mapping.png')
})

test('cancelled or rejected category configuration does not enable manual mapping', async () => {
  await h.reset('?bundle=1')
  await h.until('document.querySelectorAll(\'[data-testid="audit-product"]\').length===2')
  await h.click(`[data-product-id="${h.productIds[0]}"]`)
  await h.button('Configure manual mapping')
  await h.until('document.body.innerText.includes("Configuring Category:")')
  await h.click('[aria-label="Close category configuration"]')
  await h.until('!document.querySelector(\'[role="dialog"]\')')
  assert.equal(h.state.requests.filter(request=>request.method==='PATCH').length,0)
  await h.button('Configure manual mapping')
  await h.select('Compatibility Mode','hybrid')
  h.state.failure={endpoint:'/api/v1/catalog/dropdown-configs/config-2/',code:400,data:{detail:'Category rule change rejected'}}
  await h.button('Save Configuration')
  await h.until('document.body.innerText.includes("Category rule change rejected")')
  assert.equal(await h.evaluate('!!document.querySelector(\'[data-testid="audit-actions"] input[role="combobox"]\')'),false)
  assert.equal(h.state.requests.filter(request=>request.endpoint.endsWith('/map-devices/')).length,0)
})

test('switching a Universal product to category rules does not turn rule-derived devices into selections', async () => {
  await h.reset('?derived=1')
  await h.until('document.querySelectorAll(\'[data-testid="audit-product"]\').length===2')
  await h.click(`[data-product-id="${h.productIds[0]}"]`)
  await h.until('document.querySelector(\'[data-testid="audit-comparison"]\').innerText.includes("Model Alpha")')
  await h.button('Edit compatibility / Universal')
  await h.until('!!document.querySelector(\'[aria-label="Category compatibility setup"]\')')
  await h.select('Product compatibility','category')
  const drawerDevices = '[aria-label="Category compatibility setup"] [data-testid="audit-current-devices"]'
  await h.until(`!!document.querySelector('${drawerDevices}')`)
  assert.equal(await h.evaluate(`document.querySelector('${drawerDevices}').innerText.includes("No models selected")`),true)
  assert.equal(await h.evaluate(`document.querySelector('${drawerDevices}').innerText.includes("Model Alpha")`),false)
  await h.button('Save category')
  await h.until('!document.querySelector(\'[aria-label="Category compatibility setup"]\')')
  const request=h.state.requests.find(request=>request.method==='PATCH')!
  assert.equal((request.body as Record<string,unknown>).compatibility_mode,'direct_device')
  assert.deepEqual(request.body.device_ids,[])
})

test('dark mode narrow layout and buyer guard', async () => {
  await h.reset('?dark=1')
  await h.until('document.querySelectorAll(\'[data-testid="audit-product"]\').length===2')
  await h.call('Emulation.setDeviceMetricsOverride', { width: 480, height: 900, deviceScaleFactor: 1, mobile: false })
  await h.click(`[data-product-id="${h.productIds[0]}"]`)
  await h.until('!!document.querySelector(\'[data-testid="audit-actions"]\')')
  assert.equal(await h.evaluate('document.documentElement.scrollWidth <= innerWidth'), true)
  await h.screenshot('vendor-audit-mobile-dark.png')
  await h.reset('?buyer=1')
  assert.equal(await h.evaluate('!!document.querySelector(\'[data-testid="vendor-audit"]\')'), false)
  assert.equal(h.state.requests.length, 0)
})
