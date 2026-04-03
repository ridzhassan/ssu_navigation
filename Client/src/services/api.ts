import axios from 'axios'
import { POI, Building } from '../types'

//const API_BASE = '/api'
const API_BASE = 'https://ssunavigation-production.up.railway.app/api'

const api = axios.create({
  baseURL: API_BASE,
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

