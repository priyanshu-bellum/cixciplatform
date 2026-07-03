import { create } from 'zustand'
import api from '../lib/apiClient'

interface User {
  id: string
  email: string
  full_name: string
  is_cixci_admin: boolean
  company_name: string
  entity_name: string
  company_type?: string
  capabilities?: any[]
  company_id?: string
  company_map_pricing_enforced?: boolean
}

interface AuthState {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,

  login: async (email, password) => {
    set({ loading: true })
    try {
      const { data } = await api.post('/auth/login/', { email, password })
      sessionStorage.setItem('access', data.access)
      sessionStorage.setItem('refresh', data.refresh)
      const me = await api.get('/tenant/users/me/')
      set({ user: me.data, loading: false })
    } catch (err) {
      set({ loading: false })
      throw err
    }
  },

  logout: () => {
    const refresh = sessionStorage.getItem('refresh')
    if (refresh) api.post('/auth/logout/', { refresh }).catch(() => {})
    sessionStorage.removeItem('access')
    sessionStorage.removeItem('refresh')
    set({ user: null })
  },

  fetchMe: async () => {
    const token = sessionStorage.getItem('access')
    if (!token) return
    set({ loading: true })
    try {
      const { data } = await api.get('/tenant/users/me/')
      set({ user: data, loading: false })
    } catch {
      set({ user: null, loading: false })
    }
  },
}))
