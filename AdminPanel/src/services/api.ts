import axios from 'axios'

// const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
const API_BASE_URL = 'https://ssunavigation-production.up.railway.app/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// API functions
export const buildingsApi = {
  getAll: () => api.get('/buildings'),
  getById: (id: number) => api.get(`/buildings/${id}`),
  create: (data: any) => api.post('/buildings', data),
  update: (id: number, data: any) => api.put(`/buildings/${id}`, data),
  delete: (id: number) => api.delete(`/buildings/${id}`)
}

export const poisApi = {
  getAll: () => api.get('/poi'),
  getById: (id: number) => api.get(`/poi/${id}`),
  search: (query: string) => api.get(`/poi/search?q=${query}`),
  getTypes: () => api.get('/poi/types'),
  create: (data: any) => api.post('/poi', data),
  update: (id: number, data: any) => api.put(`/poi/${id}`, data),
  delete: (id: number) => api.delete(`/poi/${id}`)
}

export const routesApi = {
  getAll: () => api.get('/routes'),
  getById: (id: number) => api.get(`/routes/${id}`),
  create: (data: any) => api.post('/routes', data),
  update: (id: number, data: any) => api.put(`/routes/${id}`, data),
  delete: (id: number) => api.delete(`/routes/${id}`)
}

export default api

