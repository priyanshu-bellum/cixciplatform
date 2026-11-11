// Save/toggle fixtures use the real manager UI and never mutate catalog records.
export async function verifyDeviceDropdown({ call, on, evaluate, waitFor, clickText, fillField, report, screenshot }) {
  const manufacturers = Array.from({ length: 60 }, (_, index) => ({ id: `00000000-0000-4000-c000-${String(index).padStart(12, '0')}`, name: `Browser Manufacturer ${index + 1}`, is_active: true }))
  const writes = []
  let fullListRequested = false
  const fulfill = (requestId, body, responseCode = 200) => call('Fetch.fulfillRequest', {
    requestId, responseCode, responseHeaders: [{ name: 'Content-Type', value: 'application/json' },
      { name: 'Access-Control-Allow-Origin', value: 'http://localhost:5173' }, { name: 'Access-Control-Allow-Credentials', value: 'true' }],
    body: Buffer.from(JSON.stringify(body)).toString('base64'),
  })
  on('Fetch.requestPaused', async ({ requestId, request }) => {
    try {
      const url = new URL(request.url)
      if (request.method === 'OPTIONS') { await call('Fetch.continueRequest', { requestId }); return }
      if (request.method === 'GET') {
        fullListRequested ||= url.searchParams.get('paginate') === 'false'
        await fulfill(requestId, manufacturers); return
      }
      const body = JSON.parse(request.postData || '{}')
      writes.push({ method: request.method, body })
      if (request.method === 'POST') {
        const row = { id: '00000000-0000-4000-c000-000000009999', name: body.name, is_active: true }
        manufacturers.unshift(row)
        await fulfill(requestId, row, 201); return
      }
      if (request.method === 'PATCH') {
        const row = manufacturers.find(row => url.pathname.endsWith(`/${row.id}/`))
        if (row) { Object.assign(row, body); await fulfill(requestId, row); return }
      }
      await fulfill(requestId, { detail: 'Unexpected fixture mutation blocked' }, 400)
    } catch (error) {
      report.consoleErrors.push(`Manufacturer fixture: ${error.message}`)
      await fulfill(requestId, { detail: 'Fixture failed; mutation blocked' }, 500).catch(() => {})
    }
  })
  await call('Fetch.enable', { patterns: [{ urlPattern: '*devices/manufacturers/*', requestStage: 'Request' }] })
  try {
    await call('Page.navigate', { url: 'http://localhost:5173/devices' })
    await waitFor('[...document.querySelectorAll("button")].some(button => button.textContent.trim() === "Manage Dropdown Values")')
    await clickText('Manage Dropdown Values')
    await waitFor(`!!document.querySelector('[aria-label="Configured Manufacturers"]')`)
    report.checks.push({ name: 'Manufacturer manager opens directly with readable names and complete taxonomy list', pass: fullListRequested && await evaluate(`(() => { const list = document.querySelector('[aria-label="Configured Manufacturers"]'); const rect = list.getBoundingClientRect(); const dialog = list.closest('[role=dialog]').getBoundingClientRect(); return rect.height >= 100 && rect.top < dialog.bottom && list.innerText.includes('Browser Manufacturer 60') && !list.closest('[role=dialog]').innerText.includes('Shared Device and Accessory Compatibility Values'); })()`) })
    await evaluate(`document.querySelector('[aria-label="Configured Manufacturers"]').scrollTop = 10000`)
    await fillField('Manufacturer Name', 'Browser Saved Manufacturer')
    await clickText('Add Value')
    await waitFor(`document.querySelector('[aria-label="Configured Manufacturers"]').innerText.includes('Browser Saved Manufacturer')`)
    report.checks.push({ name: 'Saved manufacturer immediately appears in visible list after refetch', pass: writes.length === 1 && writes[0].body.name === 'Browser Saved Manufacturer' && await evaluate(`(() => { const list = document.querySelector('[aria-label="Configured Manufacturers"]'); const name = [...list.querySelectorAll('p')].find(element => element.textContent === 'Browser Saved Manufacturer'); const row = name?.getBoundingClientRect(); const bounds = list.getBoundingClientRect(); return row && row.top >= bounds.top && row.bottom <= bounds.bottom && list.scrollTop === 0; })()`) })
    await evaluate(`(() => { const name = [...document.querySelectorAll('[aria-label="Configured Manufacturers"] p')].find(element => element.textContent === 'Browser Saved Manufacturer'); [...name.parentElement.parentElement.querySelectorAll('button')].find(button => button.textContent.trim() === 'Deactivate').click(); })()`)
    await waitFor(`(() => { const name = [...document.querySelectorAll('[aria-label="Configured Manufacturers"] p')].find(element => element.textContent === 'Browser Saved Manufacturer'); return name?.parentElement.innerText.includes('Inactive'); })()`)
    report.checks.push({ name: 'Existing manufacturer activation management remains available', pass: writes.some(write => write.method === 'PATCH' && write.body.is_active === false) })
    await screenshot('manufacturer-management.png')
    await clickText('Device Types & Compatibility Rules', '[role=tab]')
    await waitFor('[...document.querySelectorAll("button")].some(button => button.textContent.trim() === "Configure Rules")')
    await clickText('Configure Rules')
    await waitFor('document.body.innerText.includes("Configure Device Type Rules") && document.body.innerText.includes("Charging Interface")')
    report.checks.push({ name: 'Device compatibility rules open in the same Manage Dropdown modal', pass: await evaluate('document.body.innerText.includes("Max Supported Storage") && document.body.innerText.includes("Eligible for Auto-Mapping Remap") && document.body.innerText.includes("Save Rules")') })
    await screenshot('device-type-rules.png')
    await clickText('Cancel')
    await clickText('Compatibility Values', '[role=tab]')
    await waitFor('document.body.innerText.includes("Shared Device and Accessory Compatibility Values")')
    report.checks.push({ name: 'Shared compatibility values remain accessible without hiding manufacturer management', pass: true })
  } finally { await call('Fetch.disable') }
}
