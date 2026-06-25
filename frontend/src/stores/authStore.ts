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
      localStorage.setItem('access', data.access)
      localStorage.setItem('refresh', data.refresh)
      const me = await api.get('/tenant/users/me/')
      set({ user: me.data, loading: false })
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
    set({ user: null })
  },

  fetchMe: async () => {
    const token = localStorage.getItem('access')
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
