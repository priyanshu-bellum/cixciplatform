import { useQuery } from '@tanstack/react-query'
import api from '../../../lib/apiClient'

export function useCatalogBrandOptions(user: any, deviceId: string, projectionScope = false) {
  const enabled = user?.company_type === 'buyer' && !user?.is_cixci_admin
  return useQuery<{ brands: string[] }>({
    queryKey: ['catalog-brand-options', user?.id, deviceId, projectionScope],
    enabled,
    queryFn: async () => {
      const response = await api.get('/catalog/products/filter-options/', {
        params: { device_id: deviceId || undefined, projection_scope: projectionScope || undefined },
      })
      return response.data
    },
  })
}
