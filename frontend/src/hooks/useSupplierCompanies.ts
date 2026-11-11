import { useQuery } from '@tanstack/react-query'
import api from '../lib/apiClient'

export function useSupplierCompanies(enabled: boolean) {
  return useQuery({ queryKey: ['supplier-companies'], enabled, staleTime: 30_000, queryFn: async () => {
    const rows: any[] = []
    let next: string | null = '/tenant/companies/?company_type=vendor&page_size=100'
    const visited = new Set<string>()
    while (next && !visited.has(next)) {
      visited.add(next)
      const response: { data: any } = await api.get(next)
      rows.push(...(Array.isArray(response.data) ? response.data : response.data.results || []))
      next = Array.isArray(response.data) ? null : response.data.next || null
    }
    return rows
  } })
}
