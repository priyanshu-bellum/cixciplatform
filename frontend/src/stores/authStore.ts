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
  initialized: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,

  login: async (email, password) => {
    set({ loading: true })
    try {
      const { data } = await api.post('/auth/login/', { email, password })
      localStorage.setItem('access', data.access)
      localStorage.setItem('refresh', data.refresh)
      const me = await api.get('/tenant/users/me/')
      set({ user: me.data, loading: false, initialized: true })
    } catch (err) {
      set({ loading: false })
      throw err
    }
  },

  logout: () => {
    const refresh = localStorage.getItem('refresh')
    if (refresh) api.post('/auth/logout/', { refresh }).catch(() => {})
    localStorage.removeItem('access')
    localStorage.removeItem('refresh')
    set({ user: null, loading: false, initialized: true })
  },

  fetchMe: async () => {
    const token = localStorage.getItem('access')
    if (!token) {
      set({ user: null, loading: false, initialized: true })
      return
    }
    set({ loading: true })
    try {
      const { data } = await api.get('/tenant/users/me/')
      set({ user: data, loading: false, initialized: true })
    } catch {
      set({ user: null, loading: false, initialized: true })
    }
  },
}))
