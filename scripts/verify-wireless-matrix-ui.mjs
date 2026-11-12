// Exercise the actual matrix editor with fixture-only configuration writes.
export async function verifyWirelessMatrix({ call, on, evaluate, waitFor, clickText, fillField, chooseSelect, report, tokens, screenshot }) {
  const response = await fetch('http://localhost:8000/api/v1/catalog/dropdown-configs/compatibility-options/', { headers: { Authorization: `Bearer ${tokens.access}` } })
  const options = await response.json()
  const values = ['MagSafe', 'Qi', 'Qi2', 'Qi1']
  options.fields.wireless_charging_compatibility = [...values, 'Not Compatible'].map(value => ({ value, label: value }))
  options.wireless_policy = { id: '00000000-0000-4000-f000-000000000001', configured: true, allowed_combinations: [['MagSafe', 'Qi', 'Qi2']], prohibited_combinations: [] }
  const writes = []
  const records = []
  const fulfill = (requestId, body, responseCode = 200) => call('Fetch.fulfillRequest', { requestId, responseCode,
    responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: 'http://localhost:5173' }, { name: 'Access-Control-Allow-Credentials', value: 'true' }], body: Buffer.from(JSON.stringify(body)).toString('base64') })
  on('Fetch.requestPaused', async ({ requestId, request }) => {
    try {
      const url = new URL(request.url)
      if (request.method === 'OPTIONS') return await call('Fetch.continueRequest', { requestId })
      if (request.method === 'GET') return await fulfill(requestId, url.pathname.endsWith('/compatibility-options/') ? options : records)
      const body = JSON.parse(request.postData || '{}')
      if (body.field_name === 'wireless_charging_compatibility') {
        const record = { id: '00000000-0000-4000-f000-000000000002', ...body }
        records.push(record)
        options.fields.wireless_charging_compatibility.push({ value: body.value, label: body.display_name })
        return await fulfill(requestId, record, 201)
      }
      if (body.field_name !== 'wireless_combination_policy') return await fulfill(requestId, { detail: 'Unexpected fixture mutation blocked' }, 400)
      writes.push(body)
      options.wireless_policy = { ...options.wireless_policy, ...body.compatibility_rules, configured: true }
      await fulfill(requestId, { id: options.wireless_policy.id, ...body })
    } catch (error) { report.consoleErrors.push(`Wireless fixture: ${error.message}`); await fulfill(requestId, {}, 500) }
  })
  await call('Fetch.enable', { patterns: [{ urlPattern: '*catalog/dropdown-configs/*', requestStage: 'Request' }] })
  try {
    await call('Page.navigate', { url: 'http://localhost:5173/devices' })
    await waitFor('[...document.querySelectorAll("button")].some(button => button.textContent.trim() === "Manage Dropdown Values")')
    await clickText('Manage Dropdown Values')
    await clickText('Compatibility Values', '[role=tab]')
    await waitFor('document.body.innerText.includes("Shared Device and Accessory Compatibility Values")')
    report.checks.push({ name: 'Wireless matrix is hidden for Charging Interface', pass: !await evaluate('document.body.innerText.includes("Wireless Charging Combination Matrix")') })
    await evaluate(`(() => { const root = [...document.querySelectorAll('h6')].find(element => element.textContent === 'Shared Device and Accessory Compatibility Values').parentElement; root.querySelector('[role=combobox]').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 })); })()`)
    await waitFor('!!document.querySelector(\'[role=option][data-value="wireless_charging_compatibility"]\')')
    await evaluate('document.querySelector(\'[role=option][data-value="wireless_charging_compatibility"]\').click()')
    await waitFor('!document.querySelector("[role=listbox]")')
    const triple = await evaluate('[...document.querySelectorAll("p")].some(element => element.textContent === "MagSafe + Qi + Qi2")')
    report.checks.push({ name: 'Saved three-of-four wireless combination remains visible', pass: triple })
    const builder = await evaluate('[...document.querySelectorAll("[role=combobox]")].some(element => element.closest(".MuiFormControl-root")?.innerText.includes("Combination values"))')
    report.checks.push({ name: 'Admin can create an arbitrary combination from approved values', pass: builder })
    if (!builder) { report.matrixDiagnostics = await evaluate('({labels: [...document.querySelectorAll("label")].map(element => element.textContent), text: document.querySelector(".MuiDialog-paper")?.innerText.slice(-5000)})'); await screenshot('wireless-matrix-missing-builder.png') }
    if (builder) {
      report.checks.push({ name: 'Unchanged configured matrix cannot be saved repeatedly', pass: await evaluate('[...document.querySelectorAll("button")].find(button => button.textContent.trim() === "Save wireless matrix").disabled') })
      await fillField('New approved value', 'QA Wireless')
      await clickText('Add approved value')
      await waitFor('document.body.innerText.includes("Approved value saved.")')
      report.checks.push({ name: 'Adding an approved wireless value persists and releases controls', pass: records.some(record => record.value === 'QA Wireless') && await evaluate('![...document.querySelectorAll("[role=combobox]")].find(control => control.closest(".MuiFormControl-root")?.innerText.includes("Combination values")).getAttribute("aria-disabled")') })
      await chooseSelect('Combination values', 'MagSafe')
      await evaluate('document.querySelector(\'[role=option][data-value="QA Wireless"]\').click()')
      await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
      await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
      await waitFor('!document.querySelector("[role=listbox]")')
      await chooseSelect('Combination rule', 'prohibited')
      await clickText('Add combination')
      await clickText('Save wireless matrix')
      await waitFor('document.body.innerText.includes("Wireless matrix saved.")')
      const saved = writes.at(-1)?.compatibility_rules
      report.checks.push({ name: 'Saving a new rule preserves the arbitrary saved triple and new approved-value prohibition', pass: saved?.allowed_combinations.some(row => row.length === 3 && ['MagSafe', 'Qi', 'Qi2'].every(value => row.includes(value))) && saved.prohibited_combinations.some(row => row.length === 2 && ['MagSafe', 'QA Wireless'].every(value => row.includes(value))) })
      report.checks.push({ name: 'Save feedback disables redundant saves and explains unlisted combinations', pass: await evaluate('[...document.querySelectorAll("button")].find(button => button.textContent.trim() === "Save wireless matrix").disabled && document.body.innerText.includes("Unlisted multi-value combinations are rejected")') })
      await screenshot('wireless-matrix-saved.png')
    }
    report.wirelessFixture = { realBusinessWrites: false, savedPolicies: writes.length }
  } finally { await call('Fetch.disable') }
}
