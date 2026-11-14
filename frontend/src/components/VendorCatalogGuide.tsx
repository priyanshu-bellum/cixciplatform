import { Box, Button, Divider, Drawer, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import { useState } from 'react'

const example = {
  payload: { offers: [{
    id: 'offer-123', code: 'SKU-123', title: 'Supplier accessory', maker: 'Approved Brand',
    category: 'Provider category', pricing: { wholesale_cents: 945, currency: 'USD', msrp: '24.99' },
    stock: 12, launch: '2026-01-01', compatibility: 'Universal, Phone, Tablet, Smartwatch',
    images: ['https://supplier.example/product.png'],
  }] },
  paging: { next: null },
}

const mappings = [
  ['external_id', 'id', 'Stable provider record ID. Never use the row number.'],
  ['sku', 'code', 'The supplier SKU; offers remain separate for different Vendors.'],
  ['name', 'title', 'Product name from this supplier.'],
  ['brand', 'maker', 'Brand name; approve the Vendor/Brand relationship separately.'],
  ['vendor_category', 'category', 'Map this source value to an active CIXCI category below.'],
  ['vendor_wholesale_price_amount', 'pricing.wholesale_cents', 'Choose cents conversion: 945 becomes 9.45.'],
  ['vendor_wholesale_price_currency', 'pricing.currency', 'Use the declared currency; do not infer it.'],
  ['msrp', 'pricing.msrp', 'Use the actual MSRP, separate from wholesale. Keep identity conversion here.'],
  ['inventory_level', 'stock', 'Available quantity; zero is a valid supplied value.'],
  ['launch_date', 'launch', 'Verified launch date, for example 2026-01-01.'],
  ['compatibility_declaration', 'compatibility', 'Explicit models or Universal plus its declared Device Types.'],
  ['images', 'images', 'Source image URL array. Canonical media still needs approval.'],
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <Box component="section" sx={{ py: 2 }}><Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>{title}</Typography>{children}</Box>
}

export default function VendorCatalogGuide() {
  const [open, setOpen] = useState(false)
  return <>
    <Button startIcon={<HelpOutlineRoundedIcon/>} variant="outlined" onClick={() => setOpen(true)} aria-label="Open Vendor API guide">Guide</Button>
    <Drawer anchor="right" open={open} onClose={() => setOpen(false)} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 700 }, maxWidth: '100vw' } } }}>
      <Box role="dialog" aria-modal="true" aria-labelledby="vendor-api-guide-title" sx={{ height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          <HelpOutlineRoundedIcon color="primary"/><Typography id="vendor-api-guide-title" variant="h6" sx={{ flex: 1 }}>Vendor API Guide</Typography>
          <IconButton aria-label="Close Vendor API guide" onClick={() => setOpen(false)}><CloseRoundedIcon/></IconButton>
        </Box>
        <Box sx={{ px: { xs: 2, sm: 3 }, pb: 3, overflowY: 'auto', minWidth: 0 }}>
          <Section title="1. Choose the Vendor and connection">
            <Typography variant="body2">Create the Vendor Company first and save Integration Mode = API in its Company Profile. Select that Vendor here. Saved API connection lists its real saved feeds; Add API Connection starts another feed for the same Vendor.</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>API setup preset is optional starting configuration, not another connection. Generic works for the supported REST/JSON contract; Balaji pre-fills known Balaji paths. Other protocols may need an adapter.</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>Enter the supplier URL and authentication. For Bearer, enter only the token; the system adds the Bearer prefix. For API-key authentication, use the exact header name from the supplier docs. Credentials are encrypted and are never returned.</Typography>
          </Section>
          <Divider/>
          <Section title="2. Find paths in the provider response">
            <Typography variant="body2">Read the vendor API documentation or a verified sample response. Each vendor can use different names. The example below is illustrative; replace its paths and values with your supplier's actual contract.</Typography>
            <Paper component="pre" variant="outlined" sx={{ p: 1.5, overflowX: 'auto', fontSize: 12 }} aria-label="Example supplier JSON">{JSON.stringify(example, null, 2)}</Paper>
            <Typography variant="body2"><strong>Items array path = payload.offers.</strong> This locates the list in the whole response. Product field paths then start inside each offer: <strong>title</strong> or <strong>pricing.wholesale_cents</strong>. Do not prefix each Product path with payload.offers.</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>Use a source path when a value comes from each item. Use a constant only for an explicitly verified value that applies to every item in this feed. Missing required facts should stay in review.</Typography>
          </Section>
          <Divider/>
          <Section title="3. Map Product fields">
            <Typography variant="body2" sx={{ mb: 1 }}>For the example response, add these CIXCI targets in Product field mapping. Identity keeps the value; cents divides an integer cent amount by 100. For a source amount already expressed as 9.45, use identity; cents requires an integer.</Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 420, overflowX: 'auto' }}>
              <Table size="small" stickyHeader aria-label="Product field mapping examples" sx={{ minWidth: 560, '& th': { bgcolor: 'background.paper' } }}>
                <TableHead><TableRow><TableCell>CIXCI field</TableCell><TableCell>Source path</TableCell><TableCell>How to use it</TableCell></TableRow></TableHead>
                <TableBody>{mappings.map(([target, path, help]) => <TableRow key={target}><TableCell sx={{ overflowWrap: 'anywhere', maxWidth: 190 }}>{target}</TableCell><TableCell sx={{ overflowWrap: 'anywhere' }}>{path}</TableCell><TableCell>{help}</TableCell></TableRow>)}</TableBody>
              </Table>
            </TableContainer>
            <Typography variant="body2" sx={{ mt: 1 }}>In category mapping, map Provider category to the correct active CIXCI category. Do not create a Universal category: Universal is a Product compatibility declaration and requires its explicit type scope. Existing catalog eligibility, exclusions and validation still apply.</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>Advanced JSON edits the same mapping as the visual controls. Correct invalid JSON before saving; it cannot execute scripts or arbitrary formulas.</Typography>
          </Section>
          <Divider/>
          <Section title="4. Configure pagination">
            <Typography variant="body2"><strong>Cursor:</strong> set the next cursor response path, such as paging.next, and the provider's cursor query parameter. A null cursor ends the run; a short or empty page with a next cursor does not.</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}><strong>Page number / offset:</strong> set the correct query parameter and an explicit has-more response path containing true or false. Page starts at 1; offset starts at 0. Single response is for endpoints that return the entire bounded response without pagination.</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>Set page size and request budgets from the provider limits, within platform ceilings. Provider limits pause/retry the same run; they do not mean an incomplete feed is empty.</Typography>
          </Section>
          <Divider/>
          <Section title="5. Save, test, sync and review">
            <Typography variant="body2"><strong>Save Catalog Connection</strong> first. Test and Sync use the saved configuration, not unsaved edits. Test API Connection makes a bounded preview request and imports zero products.</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}><strong>Sync Now</strong> queues data into CIXCI. The page refreshes saved rows and progress automatically. Imported Rows & Review shows source names, prices, stock and validation issues; Run History shows created, updated, unchanged, review and error counts.</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>A saved source row is not automatically an approved Product. Missing required Product inputs can prevent creation; other incomplete setup can leave a Draft or a review hold. Brand approval, category, compatibility, pricing and canonical media rules determine Buyer availability. Buyer requests read saved eligible CIXCI data.</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>Correct the source/mapping or verified canonical setup, then Recheck Review Rows. This revalidates saved rows without calling the supplier. Refresh Data also reads saved CIXCI data only.</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>Weekly full resync requires the saved checkbox plus the server scheduler and dedicated worker. Closing this browser does not stop a queued run. Cancel Sync stops an active run; retiring retains history. Enable Show retired to inspect or reactivate old connections.</Typography>
          </Section>
        </Box>
      </Box>
    </Drawer>
  </>
}
