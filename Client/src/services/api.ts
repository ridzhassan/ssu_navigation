import axios from 'axios'
import { POI, Building } from '../types'

const DEFAULT_API_BASE = 'https://ssunavigation-production.up.railway.app/api'
const rawApiBase = import.meta.env.VITE_API_URL?.trim() || DEFAULT_API_BASE
const API_BASE = rawApiBase.replace(/\/+$/, '')

const api = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json'
  }
})

export async function fetchPOIs(): Promise<POI[]> {
  const response = await api.get('/poi')
  return response.data
}

export async function fetchBuildings(): Promise<Building[]> {
  const response = await api.get('/buildings')
  return response.data
}

export async function searchPOIs(query: string): Promise<POI[]> {
  const response = await api.get(`/poi/search?q=${encodeURIComponent(query)}`)
  return response.data
}

export async function fetchPOITypes(): Promise<string[]> {
  const response = await api.get('/poi/types')
  return response.data
}

