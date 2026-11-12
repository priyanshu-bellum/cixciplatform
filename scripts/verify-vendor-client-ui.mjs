import { writeFile } from 'node:fs/promises'
import path from 'node:path'

// Real UI, intercepted writes. Backend Vendor authorization is tested separately.
export async function verifyVendorClient({ call, on, evaluate, waitFor, clickText, chooseSelect, report, tokens, root, screenshot, bulkOnly = false }) {
  const headers = { Authorization: `Bearer ${tokens.access}` }
  const get = async endpoint => {
    const response = await fetch('http://localhost:8000/api/v1' + endpoint, { headers })
    if (!response.ok) throw new Error(`Fixture template request failed: ${response.status}`)
    return response.json()
  }
  const [profile, companies, products, options, devices] = await Promise.all([
    get('/tenant/users/me/'), get('/tenant/companies/?company_type=vendor&paginate=false'), get('/catalog/products/?page_size=1'),
    get('/catalog/dropdown-configs/compatibility-options/'), get('/devices/devices/?paginate=false'),
  ])
  const company = (companies.results || companies)[0]
  const seed = (products.results || products)[0]
  const phone = options.device_types.find(type => type.code === 'phone')
  const model = (devices.results || devices).find(device => device.device_type === phone.id && device.lifecycle_status === 'available')
  if (!company || !seed || !model) throw new Error('Vendor, product and Phone templates are required.')
  const vendor = { ...profile, is_cixci_admin: false, company_type: 'vendor', company_id: company.id, company_name: company.name }
  const visibleProducts = []
  let productReads = 0
  let failImport = false
  let imported = false
  const writes = []
  const fixtureResponse = (requestId, body, responseCode = 200) => call('Fetch.fulfillRequest', { requestId, responseCode,
    responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: 'http://localhost:5173' }, { name: 'Access-Control-Allow-Credentials', value: 'true' }],
    body: Buffer.from(JSON.stringify(body)).toString('base64') })
  on('Fetch.requestPaused', async ({ requestId, request }) => {
    try {
      const url = new URL(request.url)
      if (request.method === 'OPTIONS') { await call('Fetch.continueRequest', { requestId }); return }
      if (request.method === 'GET' && url.pathname.endsWith('/tenant/users/me/')) { await fixtureResponse(requestId, vendor); return }
      if (request.method === 'GET' && url.pathname.endsWith('/catalog/products/')) {
        productReads++; await fixtureResponse(requestId, { results: visibleProducts, count: visibleProducts.length, next: null, previous: null }); return
      }
      if (request.method === 'POST' && url.pathname.endsWith('/catalog/products/bulk_upload/')) {
        writes.push({ kind: 'csv' })
        if (failImport) {
          await fixtureResponse(requestId, { total_rows_processed: 2, rows_passed: 0, rows_staged: 0, rows_failed: 2, products: [], errors: [{ row_number: 2, column_name: 'SKU', validation_error: 'Fixture validation failure' }] }, 207); return
        }
        visibleProducts.splice(0, visibleProducts.length, ...[1, 2].map(index => ({ ...seed,
          id: `00000000-0000-4000-d000-00000000000${index}`, sku: `CLIENT-UI-${index}`, name: `Client imported item ${index}`,
          brand: company.name, vendor_company_reference: company.id, status: 'pending_review', primary_image_reference: null, primary_image_url: '', media_references: [] })))
        imported = true
        await fixtureResponse(requestId, { total_rows_processed: 2, rows_passed: 0, rows_staged: 2, rows_failed: 0, products: visibleProducts, errors: [] }); return
      }
      if (!['GET', 'HEAD'].includes(request.method)) { await fixtureResponse(requestId, { detail: 'Unexpected fixture mutation blocked' }, 400); return }
      await call('Fetch.continueRequest', { requestId })
    } catch (error) {
      report.consoleErrors.push(`Vendor client fixture: ${error.message}`)
      await fixtureResponse(requestId, { detail: 'Fixture failed; mutation blocked' }, 500).catch(() => {})
    }
  })
  on('Page.javascriptDialogOpening', async event => { if (event.type === 'confirm') await call('Page.handleJavaScriptDialog', { accept: true }) })
  await call('Fetch.enable', { patterns: [{ urlPattern: '*api/v1/*', requestStage: 'Request' }] })
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
    window.__vendorPreviewUploads = [];
    const send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(body) {
      if (body instanceof FormData && body.get('file') instanceof File) {
        const file = body.get('file');
        if (/\\.(csv|xlsx|xls)$/i.test(file.name)) {
          const entry = { name: file.name, text: null }; window.__vendorPreviewUploads.push(entry);
          file.text().then(text => { entry.text = text; });
        }
      }
      return send.apply(this, arguments);
    };
  })();` })
  const csv = [
    ['SKU','Brand','Product Category','Vendor Category','UPC','Launch Date','Vendor Wholesale Price','MSRP','Product Name','Product Description','Product Status','Device Compatibility','Inventory Level','Color','System Color','Brand Warranty','Length','Width','Height','Weight'],
    ['CLIENT-UI-1',company.name,'Bundles','','123456789012','01/01/2026','10','30','Client imported item 1','Declared exact model','Pending Review',model.id,'10','Black','Black','12 months','1','1','1','1'],
    ['CLIENT-UI-2',company.name,'Speakers','','123456789029','01/01/2026','10','30','Client imported item 2','Declared Universal scope','Pending Review','Universal, Phone, Tablet, Smartwatch','10','Black','Black','12 months','1','1','1','1'],
  ].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')
  const csvFile = path.resolve(root, 'vendor-client-import.csv')
  await writeFile(csvFile, csv)
  const openBulk = async () => {
    await clickText('Bulk Upload')
    await waitFor('!!document.querySelector(".MuiDialog-paper input[type=file]")')
    const { root: document } = await call('DOM.getDocument')
    const { nodeId } = await call('DOM.querySelector', { nodeId: document.nodeId, selector: '.MuiDialog-paper input[type=file][accept*=".csv"]' })
    await call('DOM.setFileInputFiles', { nodeId, files: [csvFile] })
    await waitFor('document.querySelector(".MuiDialog-paper")?.innerText.includes("CLIENT-UI-1")')
    await evaluate(`document.querySelector('.MuiDialog-paper tbody tr').querySelectorAll('td')[3].querySelector('div').click()`)
    await waitFor(`!!document.querySelector('.MuiDialog-paper tbody tr td:nth-child(4) input')`)
    await evaluate(`(() => { const input = document.querySelector('.MuiDialog-paper tbody tr td:nth-child(4) input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Cases'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`)
    await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
    await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
    await waitFor(`document.querySelector('.MuiDialog-paper tbody tr td:nth-child(4)')?.textContent.trim() === 'Cases'`)
  }
  const upload = async () => {
    const point = await evaluate(`(() => { const button = [...document.querySelectorAll('.MuiDialog-paper button')].find(button => button.textContent.trim() === 'Upload CSV'); const rect = button.getBoundingClientRect(); return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }; })()`)
    await call('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 })
    await call('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 })
  }
  try {
    await call('Page.navigate', { url: 'http://localhost:5173/catalog' })
    await waitFor('[...document.querySelectorAll("button")].some(button => button.textContent.trim() === "Add Product")')
    if (!bulkOnly) {
    await clickText('Add Product')
    await chooseSelect('Product Type', 'accessory')
    await waitFor('!document.querySelector("[role=listbox]")')
    const categoryAvailable = await evaluate('[...document.querySelectorAll("[role=combobox]")].some(control => control.closest(".MuiFormControl-root")?.innerText.includes("Product Category"))')
    report.checks.push({ name: 'Vendor manual accessory form has CIXCI Product Category selector', pass: categoryAvailable })
    report.checks.push({ name: 'Vendor Category remains optional and Supplier selector stays hidden', pass: await evaluate('document.querySelector(".MuiDialog-paper").innerText.includes("Vendor Category (optional)") && !document.querySelector(".MuiDialog-paper").innerText.includes("Supplier Company")') })
    if (categoryAvailable) {
      await chooseSelect('Product Category', 'Cases')
      await waitFor('document.body.innerText.includes("Specific Device Compatibility")')
      await chooseSelect('Product Compatibility', 'universal')
      await waitFor('!document.querySelector("[role=listbox]")')
      await waitFor('!document.body.innerText.includes("Specific Device Compatibility")')
      report.checks.push({ name: 'Explicit Universal is selectable without changing the Cases business category', pass: await evaluate('[...document.querySelectorAll("[role=combobox]")].some(control => control.closest(".MuiFormControl-root")?.innerText.includes("Product Category") && control.innerText.includes("Cases")) && document.body.innerText.includes("Universal Device Types")') })
      await chooseSelect('Product Compatibility', 'category')
      await waitFor('!document.querySelector("[role=listbox]")')
      await waitFor('document.body.innerText.includes("Specific Device Compatibility")')
      await chooseSelect('Product Category', 'Speakers')
      await waitFor('document.body.innerText.includes("Universal Device Types")')
      report.checks.push({ name: 'Vendor category choice drives Exact versus Universal compatibility controls', pass: true })
    }
    await screenshot('vendor-manual-category.png')
    await call('Page.navigate', { url: 'http://localhost:5173/catalog' })
    await waitFor('[...document.querySelectorAll("button")].some(button => button.textContent.trim() === "Bulk Upload")')
    }
    await openBulk()
    const beforeImportReads = productReads
    await upload()
    await waitFor(imported ? 'true' : 'document.body.innerText.includes("Upload")')
    // Support the app's existing/native prompt and the shared MUI confirmation.
    for (let index = 0; index < 50; index++) {
      const confirm = await evaluate('[...document.querySelectorAll(".MuiDialog-paper button")].find(button => button.textContent.trim() === "Upload Images")?.textContent || ""')
      if (confirm) { await clickText('Upload Images'); break }
      if (await evaluate(`!!document.querySelector('.MuiDialog-paper input[type=file][accept*=".zip"]')`)) break
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    await waitFor(`!!document.querySelector('.MuiDialog-paper input[type=file][accept*=".zip"]')`)
    report.checks.push({ name: 'Accepted two-row Vendor import keeps the image ZIP step open', pass: imported })
    report.checks.push({ name: 'Uploaded file contains the edited preview category rather than original Bundles value', pass: await evaluate(`(() => { const upload = window.__vendorPreviewUploads?.[0]; return upload && upload.name.endsWith('.csv') && upload.text?.includes('"Cases"') && !upload.text?.includes('"Bundles"'); })()`) })
    report.checks.push({ name: 'Catalog query refreshes after staged/imported rows without closing image flow', pass: productReads > beforeImportReads })
    await screenshot('vendor-bulk-image-step.png')
    await clickText('Done')
    await waitFor('document.body.innerText.includes("CLIENT-UI-1") && document.body.innerText.includes("CLIENT-UI-2")')
    report.checks.push({ name: 'Both imported products appear in Vendor catalog before image upload', pass: true })
    failImport = true
    await openBulk(); await upload()
    await waitFor('document.querySelector(".MuiDialog-paper")?.innerText.includes("Fixture validation failure")')
    report.checks.push({ name: 'HTTP 207 with all rows failed shows errors and does not offer ZIP success', pass: await evaluate(`!document.querySelector('.MuiDialog-paper input[type=file][accept*=".zip"]') && !document.body.innerText.includes('Would you like to upload')`) })
    report.vendorClientFixture = { realBusinessWrites: false, csvAttempts: writes.length }
  } finally { await call('Fetch.disable') }
}
