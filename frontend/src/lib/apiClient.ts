import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('access')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = sessionStorage.getItem('refresh')
      if (refresh) {
        try {
          const { data } = await axios.post(
              `${import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api/v1'}/auth/refresh/`,
              { refresh }
          )
          sessionStorage.setItem('access', data.access)
          original.headers.Authorization = `Bearer ${data.access}`
          return api(original)
        } catch (refreshErr) {
          sessionStorage.removeItem('access')
          sessionStorage.removeItem('refresh')
          window.location.href = '/login'
          return Promise.reject(refreshErr)
        }
      } else {
        sessionStorage.removeItem('access')
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api
