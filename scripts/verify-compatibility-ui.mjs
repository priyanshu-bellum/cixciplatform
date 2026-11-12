import { spawn } from 'node:child_process'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { verifyProductEntry } from './verify-product-entry-ui.mjs'
import { verifyDeviceDropdown } from './verify-device-dropdown-ui.mjs'
import { verifyVendorClient } from './verify-vendor-client-ui.mjs'
import { verifyWirelessMatrix } from './verify-wireless-matrix-ui.mjs'
import { verifyCompanyProfile } from './verify-company-profile-ui.mjs'

if (!process.env.CIXCI_QA_EMAIL || !process.env.CIXCI_QA_PASSWORD || !process.env.CIXCI_QA_CHROME) {
  throw new Error('Set CIXCI_QA_EMAIL, CIXCI_QA_PASSWORD and CIXCI_QA_CHROME at runtime. Requires Node 22+.')
}
const root = path.resolve(process.env.CIXCI_QA_OUTPUT || '.local-copy/compatibility-analysis')
const profile = path.join(root, 'chromium-profile-' + Date.now())
await mkdir(profile, { recursive: true })
const chrome = spawn(process.env.CIXCI_QA_CHROME, [
  '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', '--disable-background-networking', '--disable-extensions', 'about:blank',
], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
let chromeDiagnostic = ''
chrome.stderr.on('data', chunk => { chromeDiagnostic = (chromeDiagnostic + chunk.toString()).slice(-4000) })
let socket
let captureFailure
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
const report = { consoleErrors: [], failedRequests: [], checks: [] }
try {
  let port
  for (let index = 0; index < 300; index++) {
    try { port = Number((await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); if (port) break } catch {}
    await pause(100)
  }
  if (!port) throw new Error('Chromium debug endpoint did not start: ' + chromeDiagnostic)
  const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  const tab = tabs.find(tab => tab.type === 'page')
  socket = new WebSocket(tab.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
  let next = 0
  const pending = new Map()
  const events = new Map()
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data)
    if (message.id) { const waiter = pending.get(message.id); if (waiter) { pending.delete(message.id); message.error ? waiter.reject(new Error(JSON.stringify(message.error))) : waiter.resolve(message.result) } }
    else for (const listener of events.get(message.method) || []) listener(message.params)
  }
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++next
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timed out: ${method}`)) }, 25000)
    pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value) }, reject: error => { clearTimeout(timer); reject(error) } })
    socket.send(JSON.stringify({ id, method, params }))
  })
  const on = (method, callback) => events.set(method, [...events.get(method) || [], callback])
  const evaluate = async expression => {
    const response = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.text + ' ' + response.exceptionDetails.exception?.description)
    return response.result.value
  }
  const waitFor = async expression => {
    for (let index = 0; index < 100; index++) { if (await evaluate(expression)) return; await pause(200) }
    throw new Error(`UI condition not reached: ${expression}`)
  }
  const clickText = async (text, selector = 'button') => {
    const clicked = await evaluate(`(() => { const element = [...document.querySelectorAll(${JSON.stringify(selector)})].find(element => element.textContent.trim() === ${JSON.stringify(text)}); if (!element) return false; element.click(); return true })()`)
    if (!clicked) throw new Error(`Control not found: ${text}`)
    await pause(250)
  }
  const fillField = async (label, value) => {
    const changed = await evaluate(`(() => {
      const input = [...document.querySelectorAll('input')].find(element => element.closest('.MuiFormControl-root')?.innerText.includes(${JSON.stringify(label)}));
      if (!input) return false;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)});
      input.dispatchEvent(new Event('input', { bubbles: true })); return true;
    })()`)
    if (!changed) throw new Error(`Input not found: ${label}`)
  }
  const chooseSelect = async (label, value) => {
    await evaluate(`(() => { const control = [...document.querySelectorAll('[role=combobox]')].find(control => control.closest('.MuiFormControl-root')?.innerText.includes(${JSON.stringify(label)})); if (!control) throw new Error('Select not found'); control.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 })); })()`)
    await waitFor(`[...document.querySelectorAll('[role=option]')].some(option => option.getAttribute('data-value') === ${JSON.stringify(value)})`)
    await evaluate(`[...document.querySelectorAll('[role=option]')].find(option => option.getAttribute('data-value') === ${JSON.stringify(value)}).click()`)
  }
  const screenshot = async name => { const data = await call('Page.captureScreenshot', { format: 'png' }); await writeFile(path.join(root, name), Buffer.from(data.data, 'base64')) }
  captureFailure = async () => { report.page = await evaluate('({ url: location.pathname, body: document.body.innerText.slice(0, 6000) })'); await screenshot('ui-failure.png') }
  on('Runtime.exceptionThrown', event => report.consoleErrors.push(event.exceptionDetails.exception?.description || event.exceptionDetails.text))
  on('Network.responseReceived', event => { if (event.response.status >= 400 && event.response.url.includes('localhost')) report.failedRequests.push({ url: event.response.url, status: event.response.status }) })
  let inspectRegionRequests = false
  const regionMainRequests = []
  on('Network.requestWillBeSent', event => { if (inspectRegionRequests) regionMainRequests.push(new URL(event.request.url).pathname) })
  await call('Page.enable'); await call('Runtime.enable'); await call('Network.enable')
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  const login = await fetch('http://localhost:8000/api/v1/auth/login/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: process.env.CIXCI_QA_EMAIL, password: process.env.CIXCI_QA_PASSWORD }) })
  if (!login.ok) throw new Error(`Local admin login returned ${login.status}`)
  const tokens = await login.json()
  // Chromium can abort the first navigation while its startup blank tab commits.
  // Retry only that startup condition; never hide a page/request failure.
  for (let attempt = 0; attempt < 3; attempt++) {
    const navigation = await call('Page.navigate', { url: 'http://localhost:5173/login' })
    if (!navigation.errorText) break
    if (navigation.errorText !== 'net::ERR_ABORTED' || attempt === 2) throw new Error(`Local UI navigation failed: ${navigation.errorText}`)
    await pause(500)
  }
  await pause(700)
  await waitFor('location.origin === "http://localhost:5173" && document.readyState === "complete"')
  await evaluate(`localStorage.setItem('access', ${JSON.stringify(tokens.access)}); localStorage.setItem('refresh', ${JSON.stringify(tokens.refresh)}); true`)
  if (process.env.CIXCI_QA_SUITE === 'company-profile') {
    await verifyCompanyProfile({ call, on, evaluate, waitFor, clickText, fillField, report, screenshot })
  } else if (process.env.CIXCI_QA_SUITE === 'wireless-matrix') {
    await verifyWirelessMatrix({ call, on, evaluate, waitFor, clickText, chooseSelect, report, tokens, screenshot })
  } else if (['vendor-client', 'vendor-bulk'].includes(process.env.CIXCI_QA_SUITE)) {
    await verifyVendorClient({ call, on, evaluate, waitFor, clickText, chooseSelect, report, tokens, root, screenshot, bulkOnly: process.env.CIXCI_QA_SUITE === 'vendor-bulk' })
  } else {
  await call('Page.navigate', { url: 'http://localhost:5173/devices' }); await pause(700)
  await waitFor('document.querySelectorAll("tbody tr.MuiTableRow-hover").length > 0 && !document.querySelector("tbody .MuiSkeleton-root")')
  report.checks.push({ name: 'Local admin authentication and real device catalog', pass: true })
  await evaluate('document.querySelector("tbody tr.MuiTableRow-hover").click()')
  await waitFor('!!document.querySelector("#device-details-history-title")')
  report.desktopDialog = await evaluate('(() => { const r = document.querySelector("#device-details-history-title").closest(".MuiDialog-paper").getBoundingClientRect(); return { width: r.width, height: r.height, viewportWidth: innerWidth, viewportHeight: innerHeight } })()')
  await clickText('Device Compatibility', '[role=tab]')
  await screenshot('device-capabilities-desktop.png')
  await clickText('Audit History', '[role=tab]')
  await screenshot('device-history-desktop.png')
  await clickText('Compatible Products', '[role=tab]')
  await pause(1500)
  await screenshot('compatible-products-real-data.png')
  report.checks.push({ name: 'All four details/history tabs render', pass: true })
  // Inspect the actual governed setup UI without creating business configuration.
  inspectRegionRequests = true
  await call('Page.navigate', { url: 'http://localhost:5173/regions' }); await pause(700)
  await waitFor('[...document.querySelectorAll("button")].some(button => button.textContent.trim() === "Country Setup & Diagnostics")')
  await waitFor('[...document.querySelectorAll("button")].some(button => button.textContent.trim() === "Update Regions")')
  inspectRegionRequests = false
  report.checks.push({ name: 'Regional main page does not fetch the country registry or all Buyer Entities before diagnostics are opened', pass: !regionMainRequests.some(path => path.includes('/operating-regions/') || path.endsWith('/tenant/entities/')) })
  report.checks.push({ name: 'Regional page keeps Vendor coverage visible without expanded country administration', pass: await evaluate('!document.body.innerText.includes("Buyer country resolution") && !document.body.innerText.includes("Vendor operating countries") && [...document.querySelectorAll("button")].some(button => button.textContent.trim() === "Update Regions")') })
  await screenshot('regional-main-page.png')
  await clickText('Country Setup & Diagnostics')
  await clickText('Buyer Country Checks', '[role=tab]')
  await waitFor('document.body.innerText.includes("Buyer regions are resolved automatically") && document.body.innerText.includes("Buyer country resolution")')
  report.checks.push({ name: 'Country-derived onboarding and Vendor coverage setup render', pass: true })
  await waitFor('document.body.innerText.includes("Resolved automatically")')
  report.checks.push({ name: 'Real Buyer countries resolve without per-Buyer assignment controls', pass: await evaluate('![...document.querySelectorAll("[role=combobox]")].some(control => control.closest(".MuiFormControl-root")?.innerText.includes("Operating Region"))') })
  await screenshot('regional-setup-desktop.png')
  await evaluate(`[...document.querySelectorAll('.MuiDialog-paper button')].find(button => button.textContent.trim() === 'Close').click()`)
  await waitFor('!document.querySelector(".MuiDialog-paper")')
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false })
  await pause(300)
  const regionTabs = await evaluate(`(() => { const rect = document.querySelector('[role=tablist]').getBoundingClientRect(); return { x: Math.min(innerWidth - 25, rect.left + 100), y: rect.top + rect.height / 2 }; })()`)
  await call('Input.dispatchMouseEvent', { type: 'mouseWheel', x: regionTabs.x, y: regionTabs.y, deltaX: 1500, deltaY: 0 })
  await pause(300)
  report.regionMobile = await evaluate(`(() => { const tab = [...document.querySelectorAll('[role=tab]')].find(tab => tab.textContent === 'Region Events'); const rect = tab.getBoundingClientRect(); return { pageWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth, eventsLeft: rect.left, eventsRight: rect.right }; })()`)
  const regionMobilePass = report.regionMobile.pageWidth <= report.regionMobile.viewportWidth + 1 && report.regionMobile.eventsLeft >= 0 && report.regionMobile.eventsRight <= report.regionMobile.viewportWidth
  report.checks.push({ name: 'Mobile regional page fits the viewport and all tabs are reachable by horizontal scrolling', pass: regionMobilePass })
  await screenshot('regional-main-mobile.png')
  if (!regionMobilePass) throw new Error('Regional mobile layout or tab navigation is not usable.')
  await clickText('Country Setup & Diagnostics')
  await waitFor('document.body.innerText.includes("Vendor operating countries")')
  report.checks.push({ name: 'Country setup dialog fits the mobile viewport', pass: await evaluate(`(() => { const rect = document.querySelector('.MuiDialog-paper').getBoundingClientRect(); return rect.left >= 0 && rect.right <= innerWidth && document.documentElement.scrollWidth <= innerWidth + 1; })()`) })
  await screenshot('regional-country-setup-mobile.png')
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await call('Page.navigate', { url: 'http://localhost:5173/catalog' }); await pause(700)
  await waitFor('[...document.querySelectorAll("button")].some(button => button.textContent.trim() === "Add Product")')
  await clickText('Add Product')
  await waitFor('[...document.querySelectorAll("[role=dialog]")].some(element => element.innerText.includes("Add New Product"))')
  report.checks.push({ name: 'Admin product creation shows Supplier Company selector', pass: await evaluate('[...document.querySelectorAll("[role=dialog]")].find(dialog => dialog.innerText.includes("Add New Product"))?.innerText.includes("Supplier Company") === true') })
  await chooseSelect('Product Type', 'accessory')
  await chooseSelect('Product Category', 'Speakers')
  await waitFor('document.body.innerText.includes("Universal Device Types")')
  const types = await evaluate(`(() => { const dialog = [...document.querySelectorAll('[role=dialog]')].find(dialog => dialog.innerText.includes('Add New Product')); return ['Phone','Tablet','Smartwatch'].map(name => ({ name, visible: [...dialog.querySelectorAll('label')].some(label => label.textContent.trim() === name && label.querySelector('input[type=checkbox]')) })); })()`)
  report.checks.push({ name: 'Single-product Speakers modal exposes all three controlled Universal types', pass: types.every(type => type.visible) })
  await screenshot('admin-product-form.png')
  await verifyProductEntry({ call, on, evaluate, waitFor, clickText, chooseSelect, fillField, report, tokens })
  events.delete('Fetch.requestPaused')
  await verifyDeviceDropdown({ call, on, evaluate, waitFor, clickText, fillField, report, screenshot })
  events.delete('Fetch.requestPaused')
  await call('Page.navigate', { url: 'http://localhost:5173/devices' }); await pause(700)
  await waitFor('document.querySelectorAll("tbody tr.MuiTableRow-hover").length > 0 && !document.querySelector("tbody .MuiSkeleton-root")')
  await evaluate('document.querySelector("tbody tr.MuiTableRow-hover").click()')
  await waitFor('!!document.querySelector("#device-details-history-title")')
  // Stress table rendering through a browser-only response fixture. No database
  // writes or invented catalog facts are made by this fixture.
  await evaluate('document.querySelector("[role=dialog] button[aria-label], [role=dialog] .MuiDialogTitle-root button").click()')
  const seedResponse = await fetch('http://localhost:8000/api/v1/catalog/products/?page_size=1', { headers: { Authorization: `Bearer ${tokens.access}` } })
  const seedData = await seedResponse.json()
  const seed = (seedData.results || seedData)[0]
  if (!seed) throw new Error('No real catalog product available as table fixture template')
  const profileResponse = await fetch('http://localhost:8000/api/v1/tenant/users/me/', { headers: { Authorization: `Bearer ${tokens.access}` } })
  const adminProfile = await profileResponse.json()
  const [entityResponse, buyerCompanyResponse] = await Promise.all([
    fetch('http://localhost:8000/api/v1/tenant/entities/', { headers: { Authorization: `Bearer ${tokens.access}` } }),
    fetch('http://localhost:8000/api/v1/tenant/companies/?company_type=buyer', { headers: { Authorization: `Bearer ${tokens.access}` } }),
  ])
  if (!entityResponse.ok || !buyerCompanyResponse.ok) throw new Error('Unable to read authorized Buyer Entity fixture templates')
  const entityData = await entityResponse.json(); const buyerCompanyData = await buyerCompanyResponse.json()
  const buyerIds = new Set((buyerCompanyData.results || buyerCompanyData).map(company => company.id))
  const regionEntityFixtures = (entityData.results || entityData).filter(entity => buyerIds.has(entity.company)).map(entity => ({ ...entity, operating_region: null, operating_region_detail: null }))
  if (!regionEntityFixtures.length) throw new Error('No Buyer Entity fixture template available')
  const regionFixtures = []
  const regionWrites = []
  let regionSetupPreview = false
  let vendorRolePreview = false
  const fixtureResponse = (requestId, body, responseCode = 200) => call('Fetch.fulfillRequest', {
    requestId, responseCode,
    responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: 'http://localhost:5173' }, { name: 'Access-Control-Allow-Credentials', value: 'true' }],
    body: Buffer.from(JSON.stringify(body)).toString('base64'),
  })
  on('Fetch.requestPaused', async ({ requestId, request }) => {
    try {
      const url = new URL(request.url)
      if (regionSetupPreview && url.pathname.includes('/tenant/operating-regions/')) {
        if (request.method === 'OPTIONS') { await call('Fetch.continueRequest', { requestId }); return }
        if (request.method === 'GET' && url.pathname.endsWith('/countries/')) { await fixtureResponse(requestId, [{ code: 'CA', alpha3: 'CAN', name: 'Canada' }]); return }
        if (request.method === 'GET') { await fixtureResponse(requestId, regionFixtures); return }
        if (request.method === 'POST') {
          const body = JSON.parse(request.postData)
          const region = { ...body, id: '37322263-8d07-4c0c-93db-f9f87ab0188b', is_active: true }
          regionFixtures.push(region); regionWrites.push({ method: request.method, kind: 'region', body })
          await fixtureResponse(requestId, region, 201); return
        }
        await fixtureResponse(requestId, { detail: 'Unexpected region fixture operation' }, 400); return
      } else if (regionSetupPreview && url.pathname.includes('/tenant/entities/')) {
        if (request.method === 'OPTIONS') { await call('Fetch.continueRequest', { requestId }); return }
        if (request.method === 'GET') { await fixtureResponse(requestId, { results: regionEntityFixtures, next: null }); return }
        const entity = regionEntityFixtures.find(entity => url.pathname.endsWith(`/${entity.id}/`))
        if (request.method === 'PATCH' && entity) {
          const body = JSON.parse(request.postData)
          Object.assign(entity, body)
          entity.operating_region_detail = regionFixtures.find(region => region.id === entity.operating_region) || null
          regionWrites.push({ method: request.method, kind: 'entity', id: entity.id, body })
          await fixtureResponse(requestId, entity); return
        }
        await fixtureResponse(requestId, { detail: 'Unexpected entity fixture operation' }, 400); return
      } else if (request.method === 'GET' && vendorRolePreview && url.pathname.endsWith('/tenant/users/me/')) {
        const profile = { ...adminProfile, is_cixci_admin: false, company_type: 'vendor', company_id: seed.vendor_company_reference, company_name: 'Browser-only Vendor role preview' }
        await call('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: 'http://localhost:5173' }, { name: 'Access-Control-Allow-Credentials', value: 'true' }], body: Buffer.from(JSON.stringify(profile)).toString('base64') })
      } else if (request.method === 'GET' && url.pathname.endsWith('/catalog/products/') && url.searchParams.has('device_id')) {
        const rows = Array.from({ length: 75 }, (_, index) => ({ ...seed, id: `browser-fixture-${index}`, sku: `UI-SCROLL-${String(index + 1).padStart(3, '0')}`, name: `Browser-only scrolling check ${index + 1}`, status: 'active' }))
        report.fixtureRows = rows.length
        report.requestedFullPage = url.searchParams.get('paginate') === 'false'
        await call('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: 'http://localhost:5173' }, { name: 'Access-Control-Allow-Credentials', value: 'true' }], body: Buffer.from(JSON.stringify(rows)).toString('base64') })
      } else await call('Fetch.continueRequest', { requestId })
    } catch (error) {
      report.consoleErrors.push(`Fixture: ${error.message}`)
      if (regionSetupPreview && !['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
        await fixtureResponse(requestId, { detail: 'Fixture failed; real mutation blocked' }, 500).catch(() => {})
      } else await call('Fetch.continueRequest', { requestId }).catch(() => {})
    }
  })
  await call('Fetch.enable', { patterns: ['*catalog/products/*', '*tenant/users/me/*', '*tenant/operating-regions/*', '*tenant/entities/*'].map(urlPattern => ({ urlPattern, requestStage: 'Request' })) })
  await call('Page.navigate', { url: 'http://localhost:5173/devices' }); await pause(700)
  await waitFor('document.querySelectorAll("tbody tr.MuiTableRow-hover").length > 0 && !document.querySelector("tbody .MuiSkeleton-root")')
  await evaluate('document.querySelector("tbody tr.MuiTableRow-hover").click()')
  await waitFor('!!document.querySelector("#device-details-history-title")')
  await clickText('Compatible Products', '[role=tab]')
  await waitFor('document.querySelectorAll("[role=dialog] tbody tr").length === 75')
  const metrics = async () => evaluate(`(() => {
    const dialog = document.querySelector('#device-details-history-title').closest('.MuiDialog-paper'); const container = dialog.querySelector('.MuiTableContainer-root');
    container.scrollTop = container.scrollHeight; container.scrollLeft = container.scrollWidth;
    const rect = dialog.getBoundingClientRect();
    const viewport = container.getBoundingClientRect();
    const headerCells = [...dialog.querySelectorAll('thead th')].map(cell => {
      const style = getComputedStyle(cell); const bounds = cell.getBoundingClientRect();
      const channels = style.backgroundColor.match(/[\\d.]+/g) || [];
      return { position: style.position, background: style.backgroundColor, alpha: channels.length === 4 ? Number(channels[3]) : channels.length === 3 ? 1 : 0,
        zIndex: Number(style.zIndex), color: style.color,
        visible: bounds.left >= viewport.left && bounds.right <= viewport.right,
        onTop: document.elementFromPoint((bounds.left + bounds.right) / 2, bounds.top + bounds.height / 2)?.closest('th') === cell }
    });
    return { rows: dialog.querySelectorAll('tbody tr').length, dialogWidth: rect.width, dialogHeight: rect.height,
      viewportWidth: innerWidth, viewportHeight: innerHeight, tableWidth: container.scrollWidth, visibleWidth: container.clientWidth,
      tableHeight: container.scrollHeight, visibleHeight: container.clientHeight, scrollTop: container.scrollTop, scrollLeft: container.scrollLeft,
      finalRow: dialog.querySelector('tbody tr:last-child')?.innerText, pageOverflow: document.documentElement.scrollWidth > innerWidth, headerCells }
  })()`)
  const headerReadable = table => table.headerCells.length > 0 && table.headerCells.every(cell => cell.alpha === 1 && cell.position === 'sticky' && cell.zIndex > 0) && table.headerCells.some(cell => cell.visible && cell.onTop)
  report.desktopTable = await metrics()
  report.checks.push({ name: 'Dark sticky header stays opaque above rows after scrolling', pass: headerReadable(report.desktopTable) })
  await screenshot('compatible-products-75-desktop.png')
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await pause(400)
  report.mobileTable = await metrics()
  report.checks.push({ name: 'Mobile sticky header stays opaque after scrolling both directions', pass: headerReadable(report.mobileTable) })
  await screenshot('compatible-products-75-mobile.png')
  report.checks.push({ name: '75 rows and last row reachable vertically', pass: report.desktopTable.rows === 75 && report.desktopTable.scrollTop > 0 })
  report.checks.push({ name: 'Narrow table scrolls horizontally inside modal', pass: report.mobileTable.scrollLeft > 0 && report.mobileTable.visibleHeight > 80 && !report.mobileTable.pageOverflow })
  report.checks.push({ name: 'Dialog fits desktop and narrow viewport', pass: report.desktopDialog.height <= report.desktopDialog.viewportHeight && report.mobileTable.dialogWidth <= report.mobileTable.viewportWidth })
  report.checks.push({ name: 'Full product page requested', pass: report.requestedFullPage === true })
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await evaluate('document.querySelector("button[aria-label=\\\"Switch to light mode\\\"]").click()')
  await waitFor('document.documentElement.dataset.theme === "light"')
  report.lightTable = await metrics()
  report.checks.push({ name: 'Light sticky header stays opaque above rows after scrolling', pass: headerReadable(report.lightTable) })
  await screenshot('compatible-products-light-sticky-header.png')
  await evaluate('document.querySelector("button[aria-label=\\\"Switch to dark mode\\\"]").click()')
  await waitFor('document.documentElement.dataset.theme === "dark"')
  const inspectBulk = async (admin) => {
    await call('Page.navigate', { url: 'http://localhost:5173/catalog' }); await pause(700)
    await waitFor('[...document.querySelectorAll("button")].some(button => button.textContent.trim() === "Bulk Upload")')
    await clickText('Bulk Upload')
    await waitFor('[...document.querySelectorAll("[role=dialog]")].some(dialog => dialog.innerText.includes("Upload & Preview CSV"))')
    const hasSupplier = await evaluate('[...document.querySelectorAll("[role=dialog]")].find(dialog => dialog.innerText.includes("Upload & Preview CSV"))?.innerText.includes("Supplier Company") === true')
    report.checks.push({ name: admin ? 'Admin CSV import requires Supplier Company' : 'Vendor CSV UI has no Supplier selector' + (vendorRolePreview ? ' (profile fixture)' : ''), pass: hasSupplier === admin })
    await screenshot(admin ? 'admin-bulk-upload.png' : 'vendor-bulk-upload.png')
  }
  await inspectBulk(true)
  await call('Page.navigate', { url: 'http://localhost:5173/devices' }); await pause(700)
  await waitFor('[...document.querySelectorAll("button")].some(button => button.textContent.trim() === "Manage Dropdown Values")')
  await clickText('Manage Dropdown Values')
  await clickText('Compatibility Values', '[role=tab]')
  await waitFor('document.body.innerText.includes("Shared Device and Accessory Compatibility Values")')
  report.checks.push({ name: 'Shared controlled-value and wireless-policy UI renders', pass: true })
  await screenshot('shared-compatibility-values.png')
  // Exercise setup interaction without creating or assigning real business data.
  // Actual API persistence/authorization is verified in isolated Django tests.
  regionSetupPreview = true
  await call('Page.navigate', { url: 'http://localhost:5173/regions' }); await pause(700)
  await waitFor('[...document.querySelectorAll("button")].some(button => button.textContent.trim() === "Country Setup & Diagnostics")')
  await clickText('Country Setup & Diagnostics')
  await waitFor('document.body.innerText.includes("No Buyer-by-Buyer region setup is required")')
  report.checks.push({ name: 'Empty country catalog explains automatic Buyer onboarding', pass: true })
  await fillField('Operating country', 'not-a-country')
  report.checks.push({ name: 'Unselected/unrecognized operating country cannot be registered', pass: await evaluate('[...document.querySelectorAll("button")].find(button => button.textContent.trim() === "Register Country").disabled') })
  await fillField('Operating country', 'Canada')
  await waitFor('[...document.querySelectorAll("[role=option]")].some(option => option.textContent === "Canada (CA / CAN)")')
  await clickText('Canada (CA / CAN)', '[role=option]')
  await clickText('Register Country')
  await waitFor('document.body.innerText.includes("Operating country registered for Vendor setup.")')
  report.checks.push({ name: 'Vendor country registration uses a controlled country identity (fixture)', pass: regionWrites.length === 1 && regionWrites[0].body.code === 'CA' })
  report.checks.push({ name: 'Registering Vendor country does not submit Buyer Entity assignments', pass: regionWrites.every(write => write.kind !== 'entity') })
  await screenshot('regional-setup-interaction-fixture.png')
  report.regionSetupFixture = { realBusinessWrites: false, interceptedMutations: regionWrites.length }
  regionSetupPreview = false
  if (process.env.CIXCI_QA_VENDOR_SESSION) {
    const vendorSession = JSON.parse(await readFile(process.env.CIXCI_QA_VENDOR_SESSION, 'utf8'))
    await evaluate(`localStorage.setItem('access', ${JSON.stringify(vendorSession.access)}); localStorage.removeItem('refresh'); true`)
    await inspectBulk(false)
  } else {
    // Read-only rendering fixture; actual Vendor JWT/key authorization is tested
    // in isolated Django databases, not by changing copied production accounts.
    vendorRolePreview = true
    await inspectBulk(false)
  }
  }
  report.checks.push({ name: 'No uncaught UI exceptions', pass: report.consoleErrors.length === 0 })
  await writeFile(path.join(root, 'ui-check-report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  if (report.checks.some(check => !check.pass)) process.exitCode = 1
} catch (error) {
  report.error = error.message
  try { await captureFailure?.() } catch {}
  await writeFile(path.join(root, 'ui-check-report.json'), JSON.stringify(report, null, 2))
  console.error(JSON.stringify(report, null, 2)); process.exitCode = 1
} finally { socket?.close(); chrome.kill() }
