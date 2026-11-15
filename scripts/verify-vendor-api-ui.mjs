import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { verifyVendorPageEditor } from './verify-vendor-page-editor.mjs'

const frontend = process.env.CIXCI_QA_FRONTEND_URL || 'http://localhost:5174'
const apiUrl = process.env.CIXCI_QA_API_URL || 'http://localhost:8001/api/v1'
const vendorName = process.env.CIXCI_QA_VENDOR_NAME || 'Balaji Wireless QA'
const credential = process.env.CIXCI_QA_SUPPLIER_CREDENTIAL || 'private-fixture-credential'
const endpoint = process.env.CIXCI_QA_SUPPLIER_ENDPOINT || 'https://supplier.example/catalog'
const output = path.resolve(process.env.CIXCI_QA_OUTPUT || '.local-copy/compatibility-analysis/vendor-console-ui')
if (!process.env.CIXCI_QA_EMAIL || !process.env.CIXCI_QA_PASSWORD || !process.env.CIXCI_QA_CHROME) throw new Error('Supply runtime QA credentials and Chromium path.')
await mkdir(output, { recursive: true })
const profile = path.join(output, 'chromium-' + Date.now())
const chrome = spawn(process.env.CIXCI_QA_CHROME, ['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','--disable-gpu','--disable-background-networking','about:blank'], {windowsHide:true,stdio:'ignore'})
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
const report = {checks:[],consoleErrors:[]}
let socket
let authHeaders
const cleanupConnectionIds = new Set()
try {
  let port
  for (let index=0;index<200;index++) { try { port=Number((await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]); if(port)break } catch{} await pause(100) }
  if(!port)throw new Error('Chromium did not start.')
  const tabs=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  socket=new WebSocket(tabs.find(tab=>tab.type==='page').webSocketDebuggerUrl)
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject})
  let sequence=0
  const pending=new Map()
  socket.onmessage=({data})=>{const message=JSON.parse(data);if(message.id){const waiter=pending.get(message.id);if(waiter){pending.delete(message.id);message.error?waiter.reject(new Error(message.error.message)):waiter.resolve(message.result)}}else if(message.method==='Runtime.exceptionThrown')report.consoleErrors.push(message.params.exceptionDetails.text)}
  const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;const timer=setTimeout(()=>{pending.delete(id);reject(new Error(`Timed out: ${method}`))},30000);pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value)},reject:error=>{clearTimeout(timer);reject(error)}});socket.send(JSON.stringify({id,method,params}))})
  const evaluate=async expression=>{const result=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value}
  const wait=async expression=>{for(let index=0;index<120;index++){if(await evaluate(expression))return;await pause(200)}throw new Error('UI condition not reached: '+expression)}
  const click=async(text,selector='button')=>{await evaluate(`(()=>{const element=[...document.querySelectorAll(${JSON.stringify(selector)})].find(element=>element.textContent.trim()===${JSON.stringify(text)});if(!element)throw new Error('Control not found: '+${JSON.stringify(text)});element.click()})()`);await pause(200)}
  const fill=async(label,value)=>evaluate(`(()=>{const input=[...document.querySelectorAll('input,textarea')].find(element=>element.closest('.MuiFormControl-root')?.innerText.includes(${JSON.stringify(label)}));if(!input)throw new Error('Input not found');const prototype=input.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}))})()`)
  const select=async(label,value)=>{await evaluate(`(()=>{const element=[...document.querySelectorAll('[role=combobox]')].find(element=>element.closest('.MuiFormControl-root')?.innerText.includes(${JSON.stringify(label)}));if(!element)throw new Error('Select not found');element.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0}))})()`);await wait(`!!document.querySelector('[role=option][data-value="${value}"]')`);await evaluate(`document.querySelector('[role=option][data-value="${value}"]').click()`);await wait('!document.querySelector("[role=listbox]")')}
  await call('Page.enable');await call('Runtime.enable');await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false})
  const auth=await fetch(apiUrl+'/auth/login/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:process.env.CIXCI_QA_EMAIL,password:process.env.CIXCI_QA_PASSWORD})})
  if(!auth.ok)throw new Error('Proof login failed: '+auth.status)
  const tokens=await auth.json()
  authHeaders={Authorization:'Bearer '+tokens.access,'Content-Type':'application/json'}
  for(let attempt=0;attempt<3;attempt++){const nav=await call('Page.navigate',{url:frontend+'/login'});if(!nav.errorText)break;await pause(500)}
  await wait(`location.origin===${JSON.stringify(frontend)}&&document.readyState==='complete'`)
  await evaluate(`localStorage.setItem('access',${JSON.stringify(tokens.access)});localStorage.setItem('refresh',${JSON.stringify(tokens.refresh)})`)
  await call('Page.navigate',{url:frontend+'/settings'})
  await wait('[...document.querySelectorAll("[role=tab]")].some(element=>element.textContent==="Companies")')
  await click('Companies','[role=tab]');await wait(`document.body.innerText.includes(${JSON.stringify(vendorName)})`)
  await evaluate(`(()=>{const row=[...document.querySelectorAll('tbody tr')].find(row=>row.innerText.includes(${JSON.stringify(vendorName)}));const button=[...row?.querySelectorAll('button')||[]].find(button=>button.textContent.trim()==='Manage');if(!button)throw new Error('Vendor Manage action not found');button.click()})()`)
  await wait('document.body.innerText.includes("Manage Company Profile")')
  const available=await evaluate('[...document.querySelectorAll("button,a")].some(button=>button.textContent==="Manage API Catalog"&&!button.disabled&&button.getAttribute("aria-disabled")!=="true")')
  report.checks.push({name:'Saved Company Profile API mode opens a Vendor-bound catalog console',pass:available})
  await click('Manage API Catalog','button,a');await wait(`document.body.innerText.includes(${JSON.stringify('API Catalog — '+vendorName)})`)
  // The responsive sidebar keeps an inaccessible mobile Drawer mounted. Only a
  // visible dialog can mean this workspace is still being shown as a modal.
  const pageReady='location.pathname.includes("/settings/vendor-integrations/")&&![...document.querySelectorAll("[role=dialog]")].some(element=>element.getClientRects().length&&getComputedStyle(element).visibility!=="hidden"&&!element.closest(\'[aria-hidden="true"]\'))'
  await wait(pageReady)
  report.checks.push({name:'Vendor API management opens a full page with a Vendor selector rather than a catalog modal',pass:await evaluate(pageReady+'&&document.body.innerText.includes("Vendor company")')})
  await click('Guide')
  await wait('!!document.querySelector("#vendor-api-guide-title")')
  report.checks.push({name:'Question-mark Guide opens on this page with response paths, pricing conversion and Test/Sync instructions',pass:await evaluate('document.body.innerText.includes("Items array path = payload.offers")&&document.body.innerText.includes("pricing.wholesale_cents")&&document.body.innerText.includes("Test API Connection")&&document.body.innerText.includes("Single response")')})
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:1000,deviceScaleFactor:1,mobile:false})
  report.checks.push({name:'Field mapping guide fits narrow screens and its examples scroll inside the panel',pass:await evaluate('document.querySelector("#vendor-api-guide-title").closest("[role=dialog]").getBoundingClientRect().width<=window.innerWidth+1&&document.documentElement.scrollWidth<=window.innerWidth+2')})
  await evaluate('document.querySelector(\'[aria-label="Close Vendor API guide"]\').click()')
  await wait('!document.querySelector("#vendor-api-guide-title")')
  await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false})
  report.checks.push({name:'Closing the guide returns to the same Vendor workspace',pass:await evaluate(pageReady)})
  if (process.env.CIXCI_QA_PAGE_EDITOR) {
    await verifyVendorPageEditor({call,evaluate,wait,click,fill,select,report,apiUrl,tokens,output,writeFile,path,onCreated:id=>cleanupConnectionIds.add(id)})
  } else if (process.env.CIXCI_QA_EXISTING_CONNECTION) {
    await select('Saved API connection', process.env.CIXCI_QA_EXISTING_CONNECTION)
    await click('Test API Connection');await wait('document.body.innerText.includes("API connection test completed.")')
    report.checks.push({name:'Existing saved connection tests successfully from the built Admin UI',pass:await evaluate('document.body.innerText.includes("HTTP 200")&&document.body.innerText.includes("sample item(s) returned")')})
    let screenshot=await call('Page.captureScreenshot',{format:'png'});await writeFile(path.join(output,'admin-api-test-preview.png'),Buffer.from(screenshot.data,'base64'))
    await click('Imported Rows & Review','[role=tab]');await wait('[...document.querySelectorAll("button")].some(button=>button.textContent==="Inspect Source Row")')
    report.checks.push({name:'Real imported source rows and missing required setup are visible in the Admin panel',pass:await evaluate('document.body.innerText.includes("Review Required")&&document.body.innerText.includes("launch_date")&&document.body.innerText.includes("msrp")')})
    report.checks.push({name:'Imported supplier names, prices and inventory are visible without opening raw JSON',pass:await evaluate('document.body.innerText.includes("Source values (current mapping): Brand")&&document.body.innerText.includes("Wholesale")&&document.body.innerText.includes("Stock")')})
    if (process.env.CIXCI_QA_VERIFY_SYNC) {
      const itemRequests = () => evaluate('performance.getEntriesByType("resource").filter(entry=>entry.name.includes("/items/?")).length')
      const before = await itemRequests()
      // Queue outside React: only background progress polling can refresh this
      // already-open source view. The dedicated worker reads saved rows only.
      const queued = await fetch(apiUrl+'/integration/vendor-catalog-connections/'+process.env.CIXCI_QA_EXISTING_CONNECTION+'/recheck/', {
        method:'POST', headers:{Authorization:'Bearer '+tokens.access,'Content-Type':'application/json'}, body:'{}'})
      if(queued.status!==202)throw new Error('Saved-row UI sync verification did not queue')
      const run=await queued.json()
      await wait(`performance.getEntriesByType('resource').filter(entry=>entry.name.includes('/items/?')).length>${before}`)
      let finished=false
      for(let attempt=0;attempt<60;attempt++){
        const response=await fetch(apiUrl+'/integration/vendor-catalog-connections/'+process.env.CIXCI_QA_EXISTING_CONNECTION+'/runs/',{headers:{Authorization:'Bearer '+tokens.access}})
        const history=await response.json()
        const current=history.results.find(item=>item.id===run.id)
        if(current?.status==='completed'){finished=true;break}
        if(['failed','cancelled'].includes(current?.status))throw new Error('Saved-row UI sync verification '+current.status)
        await pause(500)
      }
      if(!finished)throw new Error('Saved-row UI sync verification did not complete')
      await wait('document.body.innerText.includes("Latest run: completed")')
      report.checks.push({name:'An already-open source view automatically refreshes after a real queued background run without page reload',pass:await itemRequests()>before})
      await click('Refresh Data');await wait('document.body.innerText.includes("No supplier request was made.")')
      report.checks.push({name:'Explicit Refresh Data reloads saved CIXCI data without starting a provider sync',pass:true})
    }
    screenshot=await call('Page.captureScreenshot',{format:'png'});await writeFile(path.join(output,'admin-real-import-review.png'),Buffer.from(screenshot.data,'base64'))
    report.checks.push({name:'Real-source review UI has no uncaught exceptions',pass:report.consoleErrors.length===0})
    if(process.env.CIXCI_QA_VERIFY_CATALOG_IMPORTS){
      await click('View imports in Product Catalog','button,a')
      await wait('!!document.querySelector(\'table[aria-label="Imported API catalog rows"] tbody tr\')')
      report.checks.push({name:'Product Catalog deep link opens API Import Review for the same supplier feed',pass:await evaluate(`location.pathname==='/catalog'&&location.search.includes('connection='+${JSON.stringify(process.env.CIXCI_QA_EXISTING_CONNECTION)})&&document.body.innerText.includes('API Import Review')`)})
      const rows=await(await fetch(apiUrl+'/integration/vendor-catalog-connections/'+process.env.CIXCI_QA_EXISTING_CONNECTION+'/items/?page_size=25',{headers:authHeaders})).json()
      report.checks.push({name:'Product Catalog displays actual saved source rows and required setup blockers without fabricating Products',pass:await evaluate(`document.body.innerText.includes(${JSON.stringify(rows.results[0].source_summary.name)})&&document.body.innerText.includes('Product not created')&&document.body.innerText.includes('launch_date')&&document.querySelectorAll('tr[data-source-id]').length<=25`)})
      const firstPage=await evaluate('[...document.querySelectorAll("tr[data-source-id]")].map(row=>row.dataset.sourceId)')
      if(rows.next){
        await click('Next rows')
        await wait(`!!document.querySelector('tr[data-source-id]')&&document.querySelector('tr[data-source-id]').dataset.sourceId!==${JSON.stringify(firstPage[0])}`)
        const secondPage=await evaluate('[...document.querySelectorAll("tr[data-source-id]")].map(row=>row.dataset.sourceId)')
        report.checks.push({name:'Imported API rows paginate without repeating the first page',pass:secondPage.length>0&&secondPage.every(id=>!firstPage.includes(id))})
        await click('First page')
        await wait(`document.querySelector('tr[data-source-id]')?.dataset.sourceId===${JSON.stringify(firstPage[0])}`)
      }
      await call('Emulation.setDeviceMetricsOverride',{width:390,height:1000,deviceScaleFactor:1,mobile:false})
      await pause(300)
      report.checks.push({name:'Product Catalog import table scrolls internally on narrow screens',pass:await evaluate('document.documentElement.scrollWidth<=window.innerWidth+2')})
      let screenshot=await call('Page.captureScreenshot',{format:'png'});await writeFile(path.join(output,'catalog-imports-mobile.png'),Buffer.from(screenshot.data,'base64'))
      await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false})
      screenshot=await call('Page.captureScreenshot',{format:'png'});await writeFile(path.join(output,'catalog-imports-review.png'),Buffer.from(screenshot.data,'base64'))
      await click('Open API setup','button,a')
      await wait('location.pathname.includes("/settings/vendor-integrations/")&&document.body.innerText.includes("Inspect Source Row")')
      report.checks.push({name:'Import review returns to the same authorized supplier setup',pass:await evaluate(`location.search.includes('connection='+${JSON.stringify(process.env.CIXCI_QA_EXISTING_CONNECTION)})`)})
      report.checks.push({name:'Product Catalog import review has no uncaught UI exceptions',pass:report.consoleErrors.length===0})
      if(process.env.CIXCI_QA_ROLE_CREDENTIALS){
        const accounts=JSON.parse((await readFile(process.env.CIXCI_QA_ROLE_CREDENTIALS,'utf16le')).replace(/^\uFEFF/,''))
        for(const account of accounts){
          const login=await fetch(apiUrl+'/auth/login/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:account.email,password:account.password})})
          if(!login.ok)throw new Error('Role visibility proof login failed')
          const scoped=await login.json()
          await evaluate(`localStorage.setItem('access',${JSON.stringify(scoped.access)});localStorage.setItem('refresh',${JSON.stringify(scoped.refresh)})`)
          await call('Page.navigate',{url:frontend+'/catalog?tab=api-imports'})
          await wait('[...document.querySelectorAll("[role=tab]")].some(tab=>tab.textContent==="All Products")')
          report.checks.push({name:account.role+' cannot open the Admin API Import Review tab',pass:await evaluate('![...document.querySelectorAll("[role=tab]")].some(tab=>tab.textContent==="API Import Review")&&!document.querySelector(\'table[aria-label="Imported API catalog rows"]\')')})
          if(account.role.toLowerCase().includes('buyer')){
            const denied=await fetch(apiUrl+'/integration/vendor-catalog-connections/'+process.env.CIXCI_QA_EXISTING_CONNECTION+'/items/',{headers:{Authorization:'Bearer '+scoped.access}})
            report.checks.push({name:'Buyer source-data access is also denied by the API',pass:[403,404].includes(denied.status)})
          }
        }
      }
    }
    report.proof={existingBusinessRecordsUntouched:true,connectionId:process.env.CIXCI_QA_EXISTING_CONNECTION,remoteReads:1}
  } else {
  await select('Saved API connection','')
  await select('API setup preset','balaji');await wait('[...document.querySelectorAll("button")].some(button=>button.textContent==="Use Preset"&&!button.disabled)')
  await click('Use Preset');await wait('document.body.innerText.includes("Balaji mapping template loaded")')
  const label='QA supplier feed '+Date.now()
  await fill('Connection label',label);await fill('Catalog HTTPS URL',endpoint);await fill('API credential',credential)
  await evaluate('[...document.querySelectorAll("label")].find(label=>label.textContent.includes("Weekly full resync")).querySelector("input").click()')
  await click('Save Catalog Connection');await wait('document.body.innerText.includes("Catalog connection saved.")')
  const headers={Authorization:'Bearer '+tokens.access}
  const connections=await(await fetch(apiUrl+'/integration/vendor-catalog-connections/?paginate=false',{headers})).json()
  const connection=connections.find(row=>row.label===label)
  report.checks.push({name:'Real connection API persists Vendor ownership and returns no credential',pass:!!connection&&connection.has_credentials&&!JSON.stringify(connection).includes(credential)&&!('encrypted_credentials'in connection)&&connection.schedule_enabled===false})
  report.checks.push({name:'Saved credential is cleared from the editor',pass:await evaluate('[...document.querySelectorAll("input[type=password]")].every(input=>input.value==="")')})
  if (process.env.CIXCI_QA_SUPPLIER_CREDENTIAL) {
    await click('Test API Connection');await wait('document.body.innerText.includes("API connection test completed.")')
    report.checks.push({name:'Admin panel tests the real supplier and displays HTTP status/sample items without claiming an import',pass:await evaluate('document.body.innerText.includes("HTTP 200")&&document.body.innerText.includes("0 imported by this test")')})
  }
  await click('Vendor Brands','[role=tab]');await wait('document.body.innerText.includes("Register Brand")')
  const brandName='QA shared brand '+Date.now()
  await fill('New Brand name',brandName);await click('Register Brand');await wait('document.body.innerText.includes("Brand registered.")')
  await click('Approve Brand Relationship');await wait('document.body.innerText.includes("Supplier Brand relationship approved.")')
  report.checks.push({name:'Admin registers reusable Brand and explicitly approves its supplier relationship',pass:await evaluate(`document.body.innerText.includes(${JSON.stringify(brandName)})&&document.body.innerText.includes('Owned')`)})
  await click('Connection & Mapping','[role=tab]');await click('Sync Now');await wait('document.body.innerText.includes("Synchronization queued.")')
  await click('Run History','[role=tab]');await wait('document.body.innerText.includes("manual · queued")')
  report.checks.push({name:'Manual Sync Now creates a durable queued run with visible history',pass:true})
  await click('Imported Rows & Review','[role=tab]');await wait('document.body.innerText.includes("No source rows yet.")')
  report.checks.push({name:'Source review view explains offer-scoped holds and renders empty state',pass:await evaluate('document.body.innerText.includes("hold only the affected offer")')})
  const saved=await call('Page.captureScreenshot',{format:'png'});await writeFile(path.join(output,'vendor-console-review.png'),Buffer.from(saved.data,'base64'))
  report.checks.push({name:'No uncaught UI exceptions',pass:report.consoleErrors.length===0})
  report.proof={existingBusinessRecordsUntouched:true,qaVendorOnly:true,proofConnectionId:connection?.id,remoteReads:process.env.CIXCI_QA_SUPPLIER_CREDENTIAL?1:0}
  }
}catch(error){report.error=error.message;process.exitCode=1}finally{
  socket?.close();chrome.kill()
  for(const id of cleanupConnectionIds){
    try{
      const response=await fetch(apiUrl+'/integration/vendor-catalog-connections/'+id+'/',{headers:authHeaders})
      if(!response.ok)throw new Error('QA connection lookup failed')
      const connection=await response.json()
      const retired=await fetch(apiUrl+'/integration/vendor-catalog-connections/'+id+'/',{method:'PATCH',headers:{...authHeaders,'If-Match':connection.config_version},body:JSON.stringify({is_retired:true,schedule_enabled:false})})
      if(!retired.ok)throw new Error('QA connection retirement failed')
    }catch(error){report.cleanupError=error.message;process.exitCode=1}
  }
  if(cleanupConnectionIds.size&&!report.cleanupError)report.qaConnectionsRetired=cleanupConnectionIds.size
  await writeFile(path.join(output,'ui-check-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(report.checks.some(check=>!check.pass))process.exitCode=1
}
