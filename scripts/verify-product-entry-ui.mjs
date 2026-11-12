// Browser-only fixtures: capture the real form payload without writing products.
export async function verifyProductEntry({ call, on, evaluate, waitFor, clickText, chooseSelect, fillField, report, tokens }) {
  const headers = { Authorization: `Bearer ${tokens.access}` }
  const options = await (await fetch('http://localhost:8000/api/v1/catalog/dropdown-configs/compatibility-options/', { headers })).json()
  const types = options.device_types
  const phone = types.find(type => type.code === 'phone')
  const tablet = types.find(type => type.code === 'tablet')
  if (!phone || !tablet) throw new Error('Phone and Tablet configuration required for browser checks')
  const configs = ['device_specific', 'universal', 'hybrid', 'feature_based'].map((method, index) => ({
    id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`, field_name: 'product_category',
    value: `Browser ${method}`, status: 'active', compatibility_mode: method, eligible_device_types: [phone.id],
    accessory_fields: ['hybrid', 'feature_based'].includes(method) ? ['bluetooth_compatibility'] : [],
    compatibility_rules: ['hybrid', 'feature_based'].includes(method) ? { bluetooth_compatibility: { mode: 'optional', comparison: 'is_true' } } : {},
  }))
  const models = Array.from({ length: 76 }, (_, index) => ({
    id: `00000000-0000-4000-9000-${String(index).padStart(12, '0')}`, device_type: index === 75 ? tablet.id : phone.id,
    manufacturer_name: 'Browser Maker', name: `Browser Device ${index + 1}`, model_number: `CHECK-${index + 1}`,
  }))
  const supplier = { id: '00000000-0000-4000-a000-000000000001', name: 'Browser Supplier', company_type: 'vendor' }
  const submitted = []
  const fulfill = (requestId, body, responseCode = 200) => call('Fetch.fulfillRequest', {
    requestId, responseCode, responseHeaders: [{ name: 'Content-Type', value: 'application/json' },
      { name: 'Access-Control-Allow-Origin', value: 'http://localhost:5173' }, { name: 'Access-Control-Allow-Credentials', value: 'true' }],
    body: Buffer.from(JSON.stringify(body)).toString('base64'),
  })
  on('Fetch.requestPaused', async ({ requestId, request }) => {
    try {
      const url = new URL(request.url)
      if (request.method === 'OPTIONS') { await call('Fetch.continueRequest', { requestId }); return }
      if (request.method === 'POST' && url.pathname.endsWith('/catalog/products/')) {
        const body = JSON.parse(request.postData)
        submitted.push(body)
        await fulfill(requestId, { ...body, id: '00000000-0000-4000-b000-000000000001' }, 201); return
      }
      if (!['GET', 'HEAD'].includes(request.method)) { await fulfill(requestId, { detail: 'Unexpected fixture mutation blocked' }, 400); return }
      if (url.pathname.endsWith('/catalog/dropdown-configs/')) { await fulfill(requestId, configs); return }
      if (url.pathname.endsWith('/devices/devices/')) { await fulfill(requestId, models); return }
      if (url.pathname.endsWith('/tenant/companies/') && url.searchParams.get('company_type') === 'vendor') { await fulfill(requestId, [supplier]); return }
      await call('Fetch.continueRequest', { requestId })
    } catch (error) {
      report.consoleErrors.push(`Product entry fixture: ${error.message}`)
      await fulfill(requestId, { detail: 'Fixture failed; mutation blocked' }, 500).catch(() => {})
    }
  })
  await call('Fetch.enable', { patterns: ['*catalog/products/*', '*catalog/dropdown-configs/*', '*devices/devices/*', '*tenant/companies/*'].map(urlPattern => ({ urlPattern, requestStage: 'Request' })) })
  const open = async method => {
    await call('Page.navigate', { url: 'http://localhost:5173/catalog' })
    await waitFor('[...document.querySelectorAll("button")].some(button => button.textContent.trim() === "Add Product")')
    await clickText('Add Product')
    await chooseSelect('Product Type', 'accessory')
    await chooseSelect('Product Category', `Browser ${method}`)
    await waitFor('!document.querySelector("[role=listbox]")')
    if (method === 'universal') await waitFor('[...document.querySelectorAll("label")].some(label => label.textContent.trim() === "Phone" && label.querySelector("input[type=checkbox]"))')
    else if (method === 'feature_based') await waitFor('document.body.innerText.includes("Feature Based: compatibility")')
    else await waitFor(`!!document.querySelector('input[placeholder="Search devices..."]')`)
    await waitFor('!document.body.innerText.includes("Loading approved compatibility options")')
  }
  const prepareSave = async () => {
    await fillField('Product Name', 'Browser-only entry payload')
    await fillField('SKU', 'BROWSER-ENTRY')
    await chooseSelect('Supplier Company', supplier.id)
  }
  try {
    await call('Page.navigate', { url: 'http://localhost:5173/catalog' })
    await waitFor('[...document.querySelectorAll("button")].some(button => button.textContent.trim() === "Manage Dropdowns")')
    await clickText('Manage Dropdowns')
    await waitFor(`!!document.querySelector('button[title="Configure compatibility"]')`)
    report.checks.push({ name: 'Product Manage Dropdown preserves original Category/System Color controls without duplicate shared editor', pass: await evaluate(`(() => { const dialog = document.querySelector('.MuiDialog-paper'); return dialog.innerText.includes('Category') && dialog.innerText.includes('System Color') && dialog.innerText.includes('Add Value') && !dialog.innerText.includes('Shared Device and Accessory Compatibility Values') && dialog.querySelector('.MuiList-root').getBoundingClientRect().height > 50; })()`) })
    await evaluate(`document.querySelector('button[title="Configure compatibility"]').click()`)
    await waitFor('document.body.innerText.includes("Configure Category Compatibility")')
    report.checks.push({ name: 'Product category compatibility configuration remains available', pass: await evaluate('document.body.innerText.includes("Eligible Device Types") && document.body.innerText.includes("Save Configuration")') })
    await open('device_specific')
    await fillField('Specific Device Compatibility', 'Browser')
    await waitFor('document.body.innerText.includes("Show more devices (25 remaining)")')
    await clickText('Show more devices (25 remaining)')
    report.checks.push({ name: 'Single-product exact selector reaches model 75 and excludes category-ineligible Tablet', pass: await evaluate('document.body.innerText.includes("Browser Device 75") && !document.body.innerText.includes("Browser Device 76")') })
    await fillField('Specific Device Compatibility', 'CHECK-70')
    await waitFor('document.body.innerText.includes("Browser Device 70") && !document.body.innerText.includes("Browser Device 71")')
    await clickText('Browser Maker Browser Device 70 (CHECK-70)', 'span')
    await prepareSave()
    await clickText('Create Product')
    await waitFor('![...document.querySelectorAll("[role=dialog]")].some(dialog => dialog.innerText.includes("Add New Product"))')
    report.checks.push({ name: 'Exact model search submits canonical device ID without Universal scope', pass: submitted[0]?.device_ids?.length === 1 && submitted[0].device_ids[0] === models[69].id && submitted[0].compatible_device_types.length === 0 })
    await open('universal')
    await evaluate('[...document.querySelectorAll("label")].find(label => label.textContent.trim() === "Phone" && label.querySelector("input[type=checkbox]")).querySelector("input").click()')
    await prepareSave()
    await clickText('Create Product')
    await waitFor('![...document.querySelectorAll("[role=dialog]")].some(dialog => dialog.innerText.includes("Add New Product"))')
    report.checks.push({ name: 'Universal modal submits canonical type ID without individual model selections', pass: submitted[1]?.compatibility_mode === 'universal_device_type' && submitted[1].compatible_device_types?.length === 1 && submitted[1].compatible_device_types[0] === phone.id && !('device_ids' in submitted[1]) })
    await open('hybrid')
    report.checks.push({ name: 'Hybrid form exposes exact-model selector and configured Bluetooth input together', pass: await evaluate(`!!document.querySelector('input[placeholder="Search devices..."]') && [...document.querySelectorAll('.MuiFormControl-root')].some(control => control.innerText.includes('Bluetooth'))`) })
    await open('feature_based')
    report.checks.push({ name: 'Feature Based defaults expose configured capability input without exact models or type checkboxes', pass: await evaluate(`!document.querySelector('input[placeholder="Search devices..."]') && ![...document.querySelectorAll('label')].some(label => label.textContent.trim() === 'Phone' && label.querySelector('input[type=checkbox]')) && [...document.querySelectorAll('.MuiFormControl-root')].some(control => control.innerText.includes('Bluetooth'))`) })
    for (const method of ['device_specific', 'feature_based', 'hybrid']) {
      await open(method)
      await chooseSelect('Product Compatibility', 'universal')
      await waitFor('!document.querySelector("[role=listbox]")')
      await evaluate('[...document.querySelectorAll("label")].find(label => label.textContent.trim() === "Phone" && label.querySelector("input[type=checkbox]")).querySelector("input").click()')
      await prepareSave()
      const index = submitted.length
      await clickText('Create Product')
      await waitFor('![...document.querySelectorAll("[role=dialog]")].some(dialog => dialog.innerText.includes("Add New Product"))')
      const payload = submitted[index]
      report.checks.push({ name: `Explicit Product Universal preserves ${method} business category in the real form payload`, pass: payload?.product_category === `Browser ${method}` && payload.compatibility_mode === 'universal_device_type' && payload.compatible_device_types?.length === 1 && payload.compatible_device_types[0] === phone.id && !('device_ids' in payload) })
    }
  } catch (error) {
    report.productEntryDiagnostics = await evaluate(`(() => { const dialog = document.querySelector('.MuiDialog-paper'); return { text: dialog?.innerText.slice(-5000), search: document.querySelector('input[placeholder="Search devices..."]')?.value }; })()`)
    throw error
  } finally { await call('Fetch.disable') }
}
