// Profile interactions use controlled responses; no Company is changed.
export async function verifyCompanyProfile({ call, on, evaluate, waitFor, clickText, fillField, report, screenshot }) {
  const company = { id: '00000000-0000-4000-f100-000000000001', name: 'Browser Profile Vendor', display_name: 'Browser Profile Vendor',
    company_type: 'vendor', status: 'draft', country_code: 'US', region_code: 'NY', website: 'https://vendor.example', business_email_domain: 'vendor.example',
    primary_contact_name: 'Profile Contact', primary_contact_email: 'contact@vendor.example', phone_number: '555-0100', address_line1: '100 Example Street', address_line2: '',
    slug: 'browser-profile-vendor', is_parent: false, parent_company: null, allowed_channels: [], capabilities: [], approved_regions: [],
    buyer_pricing_mode: 'custom', commission_percentage: '7.00', map_pricing_enforced: false, order_digest_emails: [],
    return_address: JSON.stringify({address_line1: '100 Example Street', address_line2:'', city:'Example City', region_code:'NY', zip:'10001', country_code:'US'}),
    external_id: JSON.stringify({vendor_type:'brand', integration_mode:'api', city:'Example City', zip:'10001'}) }
  const writes = []
  const fulfill = (requestId, body, responseCode = 200) => call('Fetch.fulfillRequest', { requestId, responseCode,
    responseHeaders: [{ name:'Content-Type',value:'application/json' },{name:'Access-Control-Allow-Origin',value:'http://localhost:5173'},{name:'Access-Control-Allow-Credentials',value:'true'}],body:Buffer.from(JSON.stringify(body)).toString('base64') })
  on('Fetch.requestPaused', async ({requestId,request}) => {
    try {
      if(request.method === 'OPTIONS') return await call('Fetch.continueRequest',{requestId})
      if(request.method === 'GET') return await fulfill(requestId,{count:1,results:[company]})
      if(request.method !== 'PATCH') return await fulfill(requestId,{detail:'Unexpected fixture mutation blocked'},400)
      const payload=JSON.parse(request.postData); writes.push(payload)
      if(writes.length === 1) { await new Promise(resolve=>setTimeout(resolve,1000)); return await fulfill(requestId,{error:true,status_code:400,detail:{slug:['This company slug is already in use.']}},400) }
      Object.assign(company,payload); await fulfill(requestId,company)
    } catch(error) { report.consoleErrors.push(`Profile fixture: ${error.message}`); await fulfill(requestId,{},500) }
  })
  await call('Fetch.enable',{patterns:[{urlPattern:'*tenant/companies/*',requestStage:'Request'}]})
  try {
    await call('Page.navigate',{url:'http://localhost:5173/settings'})
    await waitFor('[...document.querySelectorAll("[role=tab]")].some(element=>element.textContent === "Companies")')
    await clickText('Companies','[role=tab]')
    await waitFor('document.body.innerText.includes("Browser Profile Vendor")')
    await clickText('Manage')
    await waitFor('document.body.innerText.includes("Manage Company Profile")')
    await fillField('Phone', '555-0102')
    await clickText('Save Profile Changes')
    report.checks.push({name:'Company Profile disables duplicate saves while a request is in progress',pass:await evaluate('[...document.querySelectorAll("button")].some(button=>button.textContent.includes("Saving Profile") && button.disabled)')})
    await waitFor('document.body.innerText.includes("This company slug is already in use.")')
    report.checks.push({name:'Profile validation error is actionable and keeps the form available for correction',pass:await evaluate('document.body.innerText.includes("Manage Company Profile") && [...document.querySelectorAll("button")].some(button=>button.textContent === "Save Profile Changes" && !button.disabled)')})
    await clickText('Save Profile Changes')
    await waitFor('document.body.innerText.includes("Company profile changes saved successfully!")')
    report.checks.push({name:'Corrected Company Profile saves successfully and preserves custom pricing',pass:writes.length === 2 && writes[1].buyer_pricing_mode === 'custom' && writes[1].commission_percentage === 7 && writes[1].phone_number === '555-0102'})
    await screenshot('company-profile-save.png')
    report.profileFixture={realBusinessWrites:false,attempts:writes.length}
  } finally { await call('Fetch.disable') }
}
