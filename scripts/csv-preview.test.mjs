import test from 'node:test'
import assert from 'node:assert/strict'
import { previewCsvFile } from '../frontend/src/lib/csvPreview.ts'

test('Excel preview edits and Universal comma lists are the actual uploaded CSV', async () => {
  const rows = [['Screen Protection', 'A "quoted", multiline\nname', ''], ['Chargers and Cables', 'Cable', 'Universal, Phone, Tablet, Smartwatch']]
  const file = previewCsvFile('client-original.xlsx', ['Product Category', 'Product Name', 'Device Compatibility'], rows)
  assert.equal(file.name, 'client-original.csv')
  assert.match(file.type, /^text\/csv/)
  assert.equal(await file.text(), '"Product Category","Product Name","Device Compatibility"\r\n"Screen Protection","A ""quoted"", multiline\nname",""\r\n"Chargers and Cables","Cable","Universal, Phone, Tablet, Smartwatch"')
})

test('Ragged preview rows keep column alignment, empty cells and Unicode values', async () => {
  const file = previewCsvFile('edited.csv', ['SKU', 'Category', 'Description'], [['A', 'Cases'], ['B', 'Cases', 'Câble — फोन']])
  assert.equal(await file.text(), '"SKU","Category","Description"\r\n"A","Cases",""\r\n"B","Cases","Câble — फोन"')
})
