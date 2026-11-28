// Dependency-free CDP support. All /api/v1/ requests are fulfilled with fixtures.
import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import net from 'node:net'

export const vendorId = '00000000-0000-4000-8000-000000000001'
export const phoneTypeId = '00000000-0000-4000-8000-000000000006'
export const productIds = [2, 3].map(n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`)
export const devices = [4, 5].map((n, i) => ({ id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`, name: 'Model ' + (i ? 'Beta' : 'Alpha'), manufacturer_name: 'Audit Maker', device_type: phoneTypeId }))
  .concat([{ id: '00000000-0000-4000-8000-000000000007', name: 'Galaxy Z Fold8', manufacturer_name: 'Samsung', device_type: phoneTypeId }])
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const output = path.join(root, '.local-copy/vendor-audit-ui')
const unusedPort = () => new Promise((resolve, reject) => { const server = net.createServer(); server.on('error', reject); server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)) }) })

export async function createAuditBrowser() {
  const chromePath = process.env.CIXCI_QA_CHROME
  if (!chromePath) throw new Error('Set CIXCI_QA_CHROME to an existing Chromium/Chrome executable; no browser is installed by this test.')
  await fs.mkdir(output, { recursive: true })
  const profile = path.join(output, 'profile-' + Date.now())
  const port = await unusedPort()
  let diagnostic = ''
  const vite = spawn(process.execPath, [path.join(root, 'frontend/node_modules/vite/bin/vite.js'),
    '--config', path.join(root,'scripts/vendor-audit-vite.config.mjs'), '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    { cwd: path.join(root, 'frontend'), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
  vite.stdout.on('data', data => { diagnostic = (diagnostic + data).slice(-4000) })
  vite.stderr.on('data', data => { diagnostic = (diagnostic + data).slice(-4000) })
  const browser = spawn(chromePath, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profile,
    '--no-first-run', '--disable-gpu', '--disable-background-networking', '--disable-extensions', 'about:blank'],
    { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
  let browserDiagnostic = ''
  browser.stderr.on('data', data => { browserDiagnostic = (browserDiagnostic + data).slice(-2000) })
  let socket
  const close = async () => { try { socket?.close() } catch {} browser.kill(); vite.kill() }
  try {
    let debugPort
    for (let n = 0; n < 150; n++) {
      try { debugPort = Number((await fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); if (debugPort) break } catch {}
      await pause(200)
    }
    if (!debugPort) throw new Error('Chromium did not start (exit ' + browser.exitCode + '): ' + browserDiagnostic)
    for (let n = 0; n < 150; n++) { try { if ((await fetch(`http://127.0.0.1:${port}/tests/vendor-audit.html`)).ok) break } catch {} if (n === 149) throw new Error('Vite did not start: ' + diagnostic); await pause(200) }
    let tabs
    for (let n = 0; n < 100; n++) {
      try { tabs = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json(); break } catch {}
      if (n === 99) throw new Error('Chromium debug endpoint unavailable: ' + browserDiagnostic)
      await pause(100)
    }
    socket = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl)
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
    let sequence = 0
    const pending = new Map()
    const listeners = new Map()
    socket.onmessage = ({ data }) => {
      const message = JSON.parse(data)
      if (message.id && pending.has(message.id)) { const waiter = pending.get(message.id); pending.delete(message.id); message.error ? waiter.reject(new Error(message.error.message)) : waiter.resolve(message.result) }
      else for (const listener of listeners.get(message.method) || []) listener(message.params)
    }
    const call = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence; const timer = setTimeout(() => { pending.delete(id); reject(new Error(method + ' timed out')) }, 25000)
      pending.set(id, { resolve: result => { clearTimeout(timer); resolve(result) }, reject: error => { clearTimeout(timer); reject(error) } })
      socket.send(JSON.stringify({ id, method, params }))
    })
    const evaluate = async expression => { const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text); return result.result.value }
    const until = async expression => { for (let n = 0; n < 450; n++) { if (await evaluate(expression)) return; await pause(100) } throw new Error('UI condition timed out: ' + expression + '\n' + await evaluate('document.body.innerText.slice(0,2500)')) }
    const state = { rows: [], configs: [], requests: [], errors: [], failure: null }
    const status = row => row.review_errors.length ? 'review' : row.compatibility_mode==='direct_device' && !row.device_assertions.length ? 'no_devices' : !row.primary_image_url ? 'no_image' : 'ok'
    listeners.set('Runtime.exceptionThrown', [event => state.errors.push(event.exceptionDetails.exception?.description || event.exceptionDetails.text)])
    listeners.set('Fetch.requestPaused', [async event => {
      try {
        const request = event.request, url = new URL(request.url), endpoint = url.pathname, method = request.method
        const body = request.postData ? JSON.parse(request.postData) : {}
        let data = {}, code = 200
        if (method !== 'OPTIONS') {
          state.requests.push({ endpoint, method, body, params: Object.fromEntries(url.searchParams) })
          if (state.failure?.endpoint === endpoint) { ({ code, data } = state.failure); state.failure = null }
          else if (endpoint === '/api/v1/tenant/companies/') data = [{ id: vendorId, name: 'Fixture Vendor' }]
          else if (endpoint === '/api/v1/catalog/dropdown-configs/') data = state.configs
          else if (endpoint === '/api/v1/catalog/dropdown-configs/compatibility-options/') data = {
            device_types: [{id:phoneTypeId,code:'phone',name:'Phone'}], field_operations: {bluetooth_compatibility:'boolean'},
            fields: {compatible_charging_interface:[{value:'USB-C',label:'USB-C'},{value:'Not Compatible',label:'Not Compatible'}],
              bluetooth_compatibility:[{value:'Yes',label:'Yes'},{value:'No',label:'No'}]}, storage_capacity_options:{}, wireless_policy:{} }
          else if (method==='PATCH' && endpoint.startsWith('/api/v1/catalog/dropdown-configs/')) {
            const config=state.configs.find(config=>config.id===endpoint.split('/').at(-2));Object.assign(config,body);data=config
          }
          else if (endpoint === '/api/v1/devices/devices/') data = { results: devices.filter(device => !url.searchParams.get('search') || (device.manufacturer_name + ' ' + device.name).toLowerCase().includes(url.searchParams.get('search').toLowerCase())) }
          else if (endpoint.endsWith('/vendor-audit-stats/')) data = { total: state.rows.length, active: 2, mapped: state.rows.filter(row => row.device_assertions.length).length,
            unmapped: state.rows.filter(row => !row.device_assertions.length).length, review_products: state.rows.filter(row => row.review_errors.length).length,
            review_required: state.rows.filter(row => row.review_errors.length).length, no_image: state.rows.filter(row => !row.primary_image_url).length,
            brands: [{ brand_reference_id: vendorId, brand_reference__name: 'Fixture Brand' }] }
          else if (endpoint.endsWith('/vendor-audit/')) {
            const filter = url.searchParams.get('audit_status'), search = (url.searchParams.get('search') || '').toLowerCase()
            const rows = state.rows.filter(row => (!filter || status(row) === filter) && (!search || (row.name + row.sku).toLowerCase().includes(search)))
            data = { count: rows.length, next: null, previous: null, results: rows.map(row => ({ ...row, audit_status: status(row) })) }
          } else if (method==='GET' && endpoint.startsWith('/api/v1/catalog/products/')) {
            data={...state.rows.find(row=>row.id===endpoint.split('/').at(-2)),compatible_charging_interface:'',bluetooth_compatibility:'',compatible_device_types:[],universal_device_type_ids:[]}
          } else if (endpoint.endsWith('/bulk-map-devices/') || endpoint.endsWith('/map-devices/')) {
            const ids = body.product_ids || [endpoint.split('/').at(-3)]
            for (const row of state.rows.filter(row => ids.includes(row.id))) {
              const chosen = devices.filter(device => body.device_ids.includes(device.id)).map(device => ({ device_id: device.id, name: device.manufacturer_name + ' ' + device.name }))
              row.device_assertions = body.update_type === 'add' ? [...new Map([...row.device_assertions, ...chosen].map(device => [device.device_id, device])).values()] : chosen
            }
            data = { status: 'ok', updated: ids.length, total: ids.length, device_count: body.device_ids.length, unapplied_device_ids: [], failures: [] }
          } else if (endpoint.endsWith('/bulk-set-compatibility/')) {
            for (const row of state.rows.filter(row => body.product_ids.includes(row.id))) Object.assign(row, body.values)
            data = { status: 'ok', updated: body.product_ids.length, total: body.product_ids.length, results: [], failures: [] }
          } else if (endpoint.endsWith('/resolve-review/') || endpoint.endsWith('/bulk-resolve-review/')) {
            const ids = body.product_ids || [endpoint.split('/').at(-3)]
            for (const row of state.rows.filter(row => ids.includes(row.id))) row.review_errors = []
            data = { status: 'ok', cleared: ids.length }
          } else if (method === 'PATCH' && endpoint.startsWith('/api/v1/catalog/products/')) {
            const row = state.rows.find(row => row.id === endpoint.split('/').at(-2)); Object.assign(row, body); data = row
          } else { code = 500; data = { detail: 'Unexpected fixture API request' }; state.errors.push(method + ' ' + endpoint) }
        }
        await call('Fetch.fulfillRequest', { requestId: event.requestId, responseCode: code,
          responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' },
            { name: 'Access-Control-Allow-Methods', value: 'GET,POST,PATCH,OPTIONS' }, { name: 'Access-Control-Allow-Headers', value: 'authorization,content-type' }],
          body: Buffer.from(JSON.stringify(data)).toString('base64') })
      } catch (error) { state.errors.push(error.message); try { await call('Fetch.failRequest', { requestId: event.requestId, errorReason: 'Failed' }) } catch {} }
    }])
    await call('Page.enable'); await call('Runtime.enable'); await call('Fetch.enable', { patterns: [{ urlPattern: '*/api/v1/*' }] })
    const reset = async (query = '') => {
      state.requests = []; state.errors = []; state.failure = null
      state.rows = productIds.map((id, i) => ({ id, sku: 'SKU-' + (i + 1), name: 'System product ' + (i + 1), brand: 'Fixture Brand',
        product_category: 'Cases', system_color: 'Black', status: 'active', compatibility_mode: 'direct_device',
        primary_image_url: null, device_assertions: [], review_errors: i ? [] : [{ code: 'COMPATIBILITY_REVIEW_REQUIRED', field: 'devices' }],
        vendor_payload: { name: 'Provider product ' + (i + 1), color: 'Blue' }, vendor_values: { name: 'Provider product ' + (i + 1), color: 'Blue', brand: 'Fixture Brand', msrp: '30.00', vendor_wholesale_price_amount: '5.00', inventory_level: 10 },
        payload_category: 'Phone Cases', payload_devices: [{ id: 47, name: 'Model Alpha' }], payload_images: [], msrp: '30.00', vendor_wholesale_price_amount: '5.00', inventory_level: 10 }))
      state.configs=['Cases','Screen Protection','Phone Attachments','Speakers'].map((name,index)=>({
        id:'config-'+index,field_name:'product_category',value:name,status:'active',eligible_device_types:[phoneTypeId],
        compatibility_mode:index===3?'universal':index===2?'feature_based':'device_specific',
        accessory_fields:index===3?['compatible_charging_interface','bluetooth_compatibility']:[],
        compatibility_rules:index===3?{compatible_charging_interface:{mode:'required',comparison:'informational'},bluetooth_compatibility:{mode:'required',comparison:'informational'}}:{}
      })).concat([{id:'color-black',field_name:'system_color',value:'Black',status:'active'},{id:'color-blue',field_name:'system_color',value:'Blue',status:'active'}])
      if(query.includes('feature=1') || query.includes('bundle=1')){state.rows[0].product_category='Phone Attachments';state.rows[0].review_errors=[]}
      if(query.includes('derived=1')){
        // A Universal product in a Hybrid category: every current match is rule-derived.
        state.configs[0].compatibility_mode='hybrid'
        Object.assign(state.rows[0],{compatibility_mode:'universal_device_type',review_errors:[],
          device_assertions:devices.slice(0,2).map(device=>({device_id:device.id,name:device.manufacturer_name+' '+device.name,explicit:false}))})
      }
      if(query.includes('bundle=1')){
        state.rows[0].name='Nimbus9 Alto 2 + Power Bank Bundle for Galaxy Z Flip8'
        state.rows[0].payload_devices=[{name:'Galaxy Z Flip8'}]
        state.rows[0].vendor_payload.compatible_devices=[{name:'Galaxy Z Flip8'}]
      }
      await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
      await call('Page.navigate', { url: `http://127.0.0.1:${port}/tests/vendor-audit.html${query}` })
      await until('!!document.querySelector(\'[data-testid="vendor-audit"]\') || document.body.innerText.includes("requires CIXCI")')
    }
    const click = async selector => {
      await until(`!!document.querySelector(${JSON.stringify(selector)})`)
      return evaluate(`(()=>{const node=document.querySelector(${JSON.stringify(selector)});node.dispatchEvent(new MouseEvent('click',{bubbles:true}));return true})()`)
    }
    const button = async text => { await until(`[...document.querySelectorAll('button,[role="button"]')].some(node=>node.textContent.trim()===${JSON.stringify(text)} && !node.disabled)`); return evaluate(`(()=>{[...document.querySelectorAll('button,[role="button"]')].find(node=>node.textContent.trim()===${JSON.stringify(text)} && !node.disabled).click();return true})()`) }
    const select = async (label, value) => {
      await until(`[...document.querySelectorAll('[role="combobox"]')].some(node=>node.closest('.MuiFormControl-root')?.innerText.includes(${JSON.stringify(label)}))`)
      await evaluate(`(()=>{const control=[...document.querySelectorAll('[role="combobox"]')].find(node=>node.closest('.MuiFormControl-root')?.innerText.includes(${JSON.stringify(label)}));if(!control)throw new Error('Select not found');control.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0}));return true})()`)
      await until(`[...document.querySelectorAll('[role="option"]')].some(node=>node.getAttribute('data-value')===${JSON.stringify(value)})`)
      await click(`[role="option"][data-value="${value}"]`)
    }
    const fill = async (selector, value) => evaluate(`(()=>{const node=document.querySelector(${JSON.stringify(selector)});if(!node)throw new Error('Input not found');node.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,${JSON.stringify(value)});node.dispatchEvent(new Event('input',{bubbles:true}));return true})()`)
    const chooseDevice = async (name, scope = '') => {
      const selector = (scope ? scope + ' ' : '') + 'input[role="combobox"]'
      await until(`!!document.querySelector(${JSON.stringify(selector)})`)
      await fill(selector, name)
      await until(`[...document.querySelectorAll('[role="option"]')].some(node=>node.textContent.includes(${JSON.stringify(name)}))`)
      await evaluate(`(()=>{[...document.querySelectorAll('[role="option"]')].find(node=>node.textContent.includes(${JSON.stringify(name)})).click();return true})()`)
    }
    const screenshot = async name => { const result = await call('Page.captureScreenshot', { format: 'png' }); await fs.writeFile(path.join(output, name), Buffer.from(result.data, 'base64')) }
    return { state, reset, evaluate, until, click, button, select, fill, chooseDevice, screenshot, call, close }
  } catch (error) { await close(); throw error }
}
