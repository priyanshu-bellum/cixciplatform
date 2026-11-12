/** RFC 4180 encoding of the table the user reviewed, including inline edits. */
export function previewCsvFile(originalName: string, headers: string[], rows: string[][]): File {
  const quote = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const text = [headers, ...rows.map(row => headers.map((_, index) => row[index] ?? ''))]
    .map(row => row.map(quote).join(',')).join('\r\n')
  const name = originalName.replace(/\.[^.]+$/, '') + '.csv'
  return new File(['\uFEFF', text], name, { type: 'text/csv;charset=utf-8' })
}
