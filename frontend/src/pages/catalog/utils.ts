import { COLOR_SWATCH_MAP, DEFAULT_SWATCH_COLOR } from './constants'

export const getColorSwatchBg = (colorStr?: string | null, sysColorStr?: string | null): string => {
  const c = ((colorStr || '') + ' ' + (sysColorStr || '')).toLowerCase().trim()
  for (const [keywords, color] of COLOR_SWATCH_MAP) {
    if (keywords.some(k => c.includes(k))) return color
  }
  return DEFAULT_SWATCH_COLOR
}

export const formatExcelDate = (val: any): string => {
  if (val === undefined || val === null) return ''
  if (val instanceof Date) {
    const month = String(val.getUTCMonth() + 1).padStart(2, '0')
    const day = String(val.getUTCDate()).padStart(2, '0')
    const year = val.getUTCFullYear()
    return `${month}-${day}-${year}`
  }
  const str = String(val).trim()
  if (!str) return ''
  const slash = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slash) {
    return `${slash[1].padStart(2, '0')}-${slash[2].padStart(2, '0')}-${slash[3]}`
  }
  const num = Number(str)
  if (!isNaN(num) && num > 25569 && num < 100000) {
    const date = new Date((num - 25569) * 24 * 60 * 60 * 1000)
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    const year = date.getUTCFullYear()
    return `${month}-${day}-${year}`
  }
  const parsedDate = new Date(str)
  if (!isNaN(parsedDate.getTime())) {
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
    const day = String(parsedDate.getDate()).padStart(2, '0')
    const year = parsedDate.getFullYear()
    return `${month}-${day}-${year}`
  }
  return str
}

export const formatExportedDate = (dateVal: any): string | null => {
  if (!dateVal) return null
  try {
    const d = new Date(dateVal)
    if (isNaN(d.getTime())) return null
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${mm}-${dd}-${d.getFullYear()}`
  } catch {
    return null
  }
}

export const parseCSV = (text: string): string[][] => {
  const result: string[][] = []
  let row: string[] = []
  let currentCell = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentCell.trim())
      currentCell = ''
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++
      }
      row.push(currentCell.trim())
      if (row.some(cell => cell !== '')) {
        result.push(row)
      }
      row = []
      currentCell = ''
    } else {
      currentCell += char
    }
  }

  if (currentCell !== '' || row.length > 0) {
    row.push(currentCell.trim())
    if (row.some(cell => cell !== '')) {
      result.push(row)
    }
  }

  return result
}

export const extractUuid = (str: string): string | null => {
  if (!str) return null
  const matches = str.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi)
  return matches && matches.length > 0 ? matches[matches.length - 1] : null
}

export interface ValidationResult {
  hasErrors: boolean
  rowErrors: Record<number, string[]>
  cellErrors: Record<string, boolean>
}

export function validateCsvRows(
  csvHeaders: string[],
  csvPreviewRows: string[][],
  opts: {
    isVendor: boolean
    companyName?: string
    allowedCategories: string[]
    allowedColors: string[]
    allowedBrands: string[]
    dropdownsLoaded: boolean
  }
): ValidationResult {
  if (csvHeaders.length === 0 || csvPreviewRows.length === 0) {
    return { hasErrors: false, rowErrors: {}, cellErrors: {} }
  }

  const normalize = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '')
  const normalizedHeaders = csvHeaders.map(normalize)
  const nameColIdx = normalizedHeaders.findIndex(h => h === 'accessoryname' || h === 'name' || h === 'productname')
  const skuColIdx = normalizedHeaders.findIndex(h => h === 'sku')
  const brandColIdx = normalizedHeaders.findIndex(h => h === 'brand')
  const upcColIdx = normalizedHeaders.findIndex(h => h === 'upc')
  const categoryColIdx = normalizedHeaders.findIndex(h => h === 'productcategory' || h === 'category')
  const launchDateColIdx = normalizedHeaders.findIndex(h => h === 'launchdate')
  const colorColIdx = normalizedHeaders.findIndex(h => h === 'color')
  const sysColorColIdx = normalizedHeaders.findIndex(h => h === 'systemcolor')
  const warrantyColIdx = normalizedHeaders.findIndex(h => h === 'brandwarranty' || h === 'warranty')
  const wholesaleColIdx = normalizedHeaders.findIndex(h => h === 'vendorwholesaleprice' || h === 'wholesaleprice' || h === 'vendorwholesalepriceamount')
  const msrpColIdx = normalizedHeaders.findIndex(h => h === 'msrp')
  const lengthColIdx = normalizedHeaders.findIndex(h => h === 'length')
  const widthColIdx = normalizedHeaders.findIndex(h => h === 'width')
  const heightColIdx = normalizedHeaders.findIndex(h => h === 'height')
  const weightColIdx = normalizedHeaders.findIndex(h => h === 'weight')
  const descColIdx = normalizedHeaders.findIndex(h => h === 'productdescription' || h === 'description')
  const compatColIdx = normalizedHeaders.findIndex(h => h === 'devicecompatibility' || h === 'compatibility')
  const statusColIdx = normalizedHeaders.findIndex(h => h === 'productstatus' || h === 'status' || h === 'prodstatus')
  const inventoryLevelColIdx = normalizedHeaders.findIndex(h => h === 'inventorylevel' || h === 'inventory' || h === 'qty' || h === 'quantity' || h === 'stock')

  const dateColIdxs = normalizedHeaders.map((h, i) => ['launchdate', 'releasedate'].includes(h) ? i : -1).filter(i => i !== -1)
  const boolColIdxs = normalizedHeaders.map((h, i) => ['recommendedacccessory', 'recommendedaccessory'].includes(h) ? i : -1).filter(i => i !== -1)
  const priceColIdxs = normalizedHeaders.map((h, i) => ['vendorwholesaleprice', 'wholesaleprice', 'vendorwholesalepriceamount', 'msrp', 'mapprice', 'saleprice'].includes(h) ? i : -1).filter(i => i !== -1)
  const numColIdxs = normalizedHeaders.map((h, i) => ['inventorylevel', 'inventorythreshold', 'length', 'width', 'height', 'weight'].includes(h) ? i : -1).filter(i => i !== -1)

  const rowErrors: Record<number, string[]> = {}
  const cellErrors: Record<string, boolean> = {}
  const seenSkus = new Set<string>()
  let hasErrors = false

  csvPreviewRows.forEach((row, rowIdx) => {
    const errors: string[] = []

    // Brand
    if (brandColIdx === -1) {
      errors.push("Missing 'Brand' column.")
    } else {
      const val = row[brandColIdx]?.trim()
      if (!val) {
        errors.push("Brand is required.")
        cellErrors[`${rowIdx}-${brandColIdx}`] = true
      } else if (val.length > 200) {
        errors.push("Brand exceeds database limit of 200 characters.")
        cellErrors[`${rowIdx}-${brandColIdx}`] = true
      } else if (opts.isVendor && opts.companyName && val.toLowerCase() !== opts.companyName.toLowerCase()) {
        errors.push(`Brand must match your company name '${opts.companyName}'.`)
        cellErrors[`${rowIdx}-${brandColIdx}`] = true
      } else if (!opts.isVendor && opts.dropdownsLoaded && opts.allowedBrands.length > 0 && !opts.allowedBrands.some(b => b.toLowerCase() === val.toLowerCase())) {
        errors.push(`Brand must be one of: ${opts.allowedBrands.join(', ')}`)
        cellErrors[`${rowIdx}-${brandColIdx}`] = true
      }
    }

    // Product Name
    if (nameColIdx === -1) {
      errors.push("Missing 'Product Name' or 'Name' column.")
    } else {
      const val = row[nameColIdx]?.trim()
      if (!val) { errors.push("Product Name is required."); cellErrors[`${rowIdx}-${nameColIdx}`] = true }
      else if (val.length > 300) { errors.push("Product Name exceeds database limit of 300 characters."); cellErrors[`${rowIdx}-${nameColIdx}`] = true }
    }

    // SKU
    if (skuColIdx === -1) {
      errors.push("Missing 'SKU' column.")
    } else {
      const val = row[skuColIdx]?.trim()
      if (!val) { errors.push("SKU is required."); cellErrors[`${rowIdx}-${skuColIdx}`] = true }
      else {
        if (val.length > 200) { errors.push("SKU exceeds database limit of 200 characters."); cellErrors[`${rowIdx}-${skuColIdx}`] = true }
        if (seenSkus.has(val.toLowerCase())) { errors.push(`Duplicate SKU '${val}' in file.`); cellErrors[`${rowIdx}-${skuColIdx}`] = true }
        seenSkus.add(val.toLowerCase())
      }
    }

    // UPC
    if (upcColIdx === -1) { errors.push("Missing 'UPC' column.") }
    else {
      const val = row[upcColIdx]?.trim()
      if (!val) { errors.push("UPC is required."); cellErrors[`${rowIdx}-${upcColIdx}`] = true }
      else if (!/^\d{12}$/.test(val)) { errors.push("UPC must follow valid UPC-A format (12 numeric characters)."); cellErrors[`${rowIdx}-${upcColIdx}`] = true }
    }

    // Category
    if (categoryColIdx === -1) { errors.push("Missing 'Product Category' column.") }
    else {
      const val = row[categoryColIdx]?.trim()
      if (!val) { errors.push("Product Category is required."); cellErrors[`${rowIdx}-${categoryColIdx}`] = true }
      else {
        const match = opts.allowedCategories.some(cat => cat.toLowerCase() === val.toLowerCase())
        if (opts.dropdownsLoaded && !match) { errors.push(`Product Category must be one of: ${opts.allowedCategories.join(', ')}`); cellErrors[`${rowIdx}-${categoryColIdx}`] = true }
      }
    }

    // Launch Date
    if (launchDateColIdx === -1) { errors.push("Missing 'Launch Date' column.") }
    else { const val = row[launchDateColIdx]?.trim(); if (!val) { errors.push("Launch Date is required."); cellErrors[`${rowIdx}-${launchDateColIdx}`] = true } }

    // Color
    if (colorColIdx === -1) { errors.push("Missing 'Color' column.") }
    else {
      const val = row[colorColIdx]?.trim()
      if (!val) { errors.push("Color is required."); cellErrors[`${rowIdx}-${colorColIdx}`] = true }
      else if (val.length > 100) { errors.push("Color exceeds database limit of 100 characters."); cellErrors[`${rowIdx}-${colorColIdx}`] = true }
    }

    // System Color
    if (sysColorColIdx === -1) { errors.push("Missing 'System Color' column.") }
    else {
      const val = row[sysColorColIdx]?.trim()
      if (!val) { errors.push("System Color is required."); cellErrors[`${rowIdx}-${sysColorColIdx}`] = true }
      else {
        const sysColors = val.replace(/;/g, ',').split(',').map(x => x.trim().toLowerCase()).filter(Boolean)
        const invalid = sysColors.filter(sc => !opts.allowedColors.some(ac => ac.toLowerCase() === sc))
        if (opts.dropdownsLoaded && invalid.length > 0) { errors.push(`Invalid system colors: ${invalid.join(', ')}. Must be from: ${opts.allowedColors.join(', ')}`); cellErrors[`${rowIdx}-${sysColorColIdx}`] = true }
      }
    }

    // Warranty
    if (warrantyColIdx === -1) { errors.push("Missing 'Brand Warranty' column.") }
    else {
      const val = row[warrantyColIdx]?.trim()
      if (!val) { errors.push("Brand Warranty is required."); cellErrors[`${rowIdx}-${warrantyColIdx}`] = true }
      else if (val.length > 200) { errors.push("Warranty exceeds database limit of 200 characters."); cellErrors[`${rowIdx}-${warrantyColIdx}`] = true }
    }

    // Wholesale Price
    if (wholesaleColIdx === -1) { errors.push("Missing 'Vendor Wholesale Price' column.") }
    else { const val = row[wholesaleColIdx]?.trim(); if (!val) { errors.push("Vendor Wholesale Price is required."); cellErrors[`${rowIdx}-${wholesaleColIdx}`] = true } }

    // MSRP
    if (msrpColIdx === -1) { errors.push("Missing 'MSRP' column.") }
    else { const val = row[msrpColIdx]?.trim(); if (!val) { errors.push("MSRP is required."); cellErrors[`${rowIdx}-${msrpColIdx}`] = true } }

    // Dimensions
    for (const [idx, name] of [[lengthColIdx, 'Length'], [widthColIdx, 'Width'], [heightColIdx, 'Height'], [weightColIdx, 'Weight']] as [number, string][]) {
      if (idx === -1) { errors.push(`Missing '${name}' column.`) }
      else { const val = row[idx]?.trim(); if (!val) { errors.push(`${name} is required.`); cellErrors[`${rowIdx}-${idx}`] = true } }
    }

    // Description
    if (descColIdx === -1) { errors.push("Missing 'Product Description' column.") }
    else { const val = row[descColIdx]?.trim(); if (!val) { errors.push("Product Description is required."); cellErrors[`${rowIdx}-${descColIdx}`] = true } }

    // Compatibility
    if (compatColIdx === -1) { errors.push("Missing 'Device Compatibility' column.") }
    else { const val = row[compatColIdx]?.trim(); if (!val) { errors.push("Device Compatibility is required."); cellErrors[`${rowIdx}-${compatColIdx}`] = true } }

    // Status
    if (statusColIdx === -1) { errors.push("Missing 'Product Status' column.") }
    else {
      const val = row[statusColIdx]?.trim()
      if (!val) { errors.push("Product Status is required."); cellErrors[`${rowIdx}-${statusColIdx}`] = true }
      else {
        const validStatuses = ['active', 'inactive', 'eol', 'out_of_stock']
        if (!validStatuses.includes(val.toLowerCase())) { errors.push(`Product Status must be one of: Active, Inactive, EOL, Out of Stock. Got '${val}'.`); cellErrors[`${rowIdx}-${statusColIdx}`] = true }
      }
    }

    // Inventory Level
    if (inventoryLevelColIdx === -1) { errors.push("Missing 'Inventory Level' column.") }
    else {
      const val = row[inventoryLevelColIdx]?.trim()
      if (!val) { errors.push("Inventory Level is required."); cellErrors[`${rowIdx}-${inventoryLevelColIdx}`] = true }
      else if (isNaN(Number(val)) || Number(val) < 0) { errors.push(`Inventory Level must be a non-negative number. Got '${val}'.`); cellErrors[`${rowIdx}-${inventoryLevelColIdx}`] = true }
    }

    // Price numeric checks
    priceColIdxs.forEach(colIdx => {
      const val = row[colIdx]?.trim()
      if (val) {
        const cleaned = val.replace('$', '').replace(/,/g, '').trim()
        if (isNaN(Number(cleaned))) { errors.push(`Invalid price '${val}' in '${csvHeaders[colIdx]}'.`); cellErrors[`${rowIdx}-${colIdx}`] = true }
      }
    })

    // Other numeric checks
    numColIdxs.forEach(colIdx => {
      const val = row[colIdx]?.trim()
      if (val && isNaN(Number(val))) { errors.push(`Invalid numeric value '${val}' in '${csvHeaders[colIdx]}'.`); cellErrors[`${rowIdx}-${colIdx}`] = true }
    })

    // Date validity
    dateColIdxs.forEach(colIdx => {
      const val = row[colIdx]?.trim()
      if (val) {
        const timestamp = Date.parse(val)
        if (isNaN(timestamp)) { errors.push(`Invalid date '${val}' in '${csvHeaders[colIdx]}'. Use MM-DD-YYYY.`); cellErrors[`${rowIdx}-${colIdx}`] = true }
      }
    })

    // Boolean checks
    boolColIdxs.forEach(colIdx => {
      const val = row[colIdx]?.trim()
      if (val) {
        const lower = val.toLowerCase()
        const validBools = ['true', 'false', 'yes', 'no', 'y', 'n', '1', '0']
        if (!validBools.includes(lower)) { errors.push(`Invalid boolean value '${val}' in '${csvHeaders[colIdx]}'. Use true/false or yes/no.`); cellErrors[`${rowIdx}-${colIdx}`] = true }
      }
    })

    if (errors.length > 0) {
      rowErrors[rowIdx] = errors
      hasErrors = true
    }
  })

  return { hasErrors, rowErrors, cellErrors }
}
