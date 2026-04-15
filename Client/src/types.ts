export interface POI {
  POIId: number
  BuildingName: string
  Latitude: number
  Longitude: number
  Type: string
  Description: string
  ImageUrl?: string
  BuildingId?: number
  Floor?: string
  Tags?: string[]
  AREnabled?: number
  ARLabel?: string
  AnchorHeight?: number
  IconScale?: number
  MinVisibleDistance?: number
  MaxVisibleDistance?: number
}

export interface Building {
  id: number
  name: string
  description: string
  latitude: number
  longitude: number
  imageUrl?: string
  category: string
  floors: number
  facilities?: string[]
}

export interface UserLocation {
  latitude: number
  longitude: number
  accuracy: number
  heading?: number
}

export type NavigationState = 'idle' | 'navigating' | 'arrived'

export interface Route {
  id: number
  name: string
  waypoints: Waypoint[]
  totalDistance: number
}

export interface Waypoint {
  latitude: number
  longitude: number
  order: number
}

