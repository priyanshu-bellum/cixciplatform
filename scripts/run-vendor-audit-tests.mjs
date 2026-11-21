// npm test entry: compile the requested TSX test file with installed TypeScript,
// run node:test against a real Chromium UI and mocked APIs. No added packages.
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from '../frontend/node_modules/typescript/lib/typescript.js'
import { createAuditBrowser, vendorId, productIds, devices, phoneTypeId } from './vendor-audit-browser.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const browser = await createAuditBrowser()
globalThis.__vendorAuditTest = { ...browser, vendorId, productIds, devices, phoneTypeId }
try {
  const source = await fs.readFile(path.join(root, 'frontend/src/pages/catalog/__tests__/VendorAuditTab.test.tsx'), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const compiledFile = path.join(root, '.local-copy/vendor-audit-ui/VendorAuditTab.test.generated.mjs')
  await fs.writeFile(compiledFile, compiled)
  await import(pathToFileURL(compiledFile).href)
} catch (error) { await browser.close(); throw error }
