import axios from 'axios'

interface RetryConfig extends NonNullable<import('axios').AxiosError['config']> {
  _retry?: boolean
}

let refreshRequest: Promise<string> | null = null

function refreshAccessToken(): Promise<string> {
  if (!refreshRequest) {
    const refresh = localStorage.getItem('refresh')
    if (!refresh) {
      return Promise.reject(new Error('No refresh token is available'))
    }

    refreshRequest = axios.post(
      `${import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1'}/auth/refresh/`,
      { refresh }
    ).then(({ data }) => {
      if (typeof data.access !== 'string' || !data.access) {
        throw new Error('Token refresh response did not include an access token')
      }

      localStorage.setItem('access', data.access)
      if (typeof data.refresh === 'string' && data.refresh) {
        localStorage.setItem('refresh', data.refresh)
      }
      return data.access as string
    }).finally(() => {
      refreshRequest = null
    })
  }

  return refreshRequest
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config as RetryConfig | undefined
    if (
      err.response?.status === 401 &&
      original &&
      !original._retry &&
      !original.url?.includes('/auth/login/') &&
      !original.url?.includes('/auth/refresh/') &&
      !original.url?.includes('/auth/logout/')
    ) {
      original._retry = true
      let accessToken: string
      try {
        accessToken = await refreshAccessToken()
      } catch (refreshErr) {
        localStorage.removeItem('access')
        localStorage.removeItem('refresh')
        window.location.href = '/login'
        return Promise.reject(refreshErr)
      }

      original.headers.set('Authorization', `Bearer ${accessToken}`)
      return api(original)
    }
    return Promise.reject(err)
  }
)

export default api
