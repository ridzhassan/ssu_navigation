import { useEffect } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Circle,
  CircleMarker,
  useMap,
  LayersControl,
} from 'react-leaflet'
import L from 'leaflet'
import { CAMPUS_GRAPH_NODES, CAMPUS_GRAPH_EDGES } from '../constants/mapMatrix'
import { POI, UserLocation } from '../types'

const { BaseLayer, Overlay } = LayersControl

// Real-world basemaps (no API key). Esri terms: https://www.esri.com/en-us/legal/terms/full-master-agreement
const ESRI_IMAGERY =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
// Same host as imagery (avoids some firewalls / CSP that block services.arcgisonline.com only)
const ESRI_REFERENCE_LABELS =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'
const ESRI_STREET =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'

// Fix Leaflet default icon path resolution in bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// ─── SVG pin factory ─────────────────────────────────────────────────────────
// Produces a proper Google Maps-style teardrop pin with an emoji in the centre.
function makePinIcon(fillColor: string, emoji: string, size: [number, number] = [30, 38]) {
  const [w, h] = size
  const cx = w / 2
  const cy = cx // circle centre

  return L.divIcon({
    className: '',
    html: `
      <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
        <filter id="shadow" x="-30%" y="-20%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#00000055"/>
        </filter>
        <path
          d="M${cx} 1 C${cx - cx + 3} 1, 1 ${cy - cy + 3}, 1 ${cy}
             C1 ${cy + cx * 0.55}, ${cx - cx * 0.55} ${h - 2}, ${cx} ${h - 1}
             C${cx + cx * 0.55} ${h - 2}, ${w - 1} ${cy + cx * 0.55}, ${w - 1} ${cy}
             C${w - 1} ${cy - cy + 3}, ${cx + cx - 3} 1, ${cx} 1Z"
          fill="${fillColor}" filter="url(#shadow)"
        />
        <circle cx="${cx}" cy="${cy}" r="${cx * 0.48}" fill="white" fill-opacity="0.92"/>
        <text x="${cx}" y="${cy + 4}" text-anchor="middle"
              font-size="${cx * 0.7}" font-family="system-ui">${emoji}</text>
      </svg>
    `,
    iconSize: size,
    iconAnchor: [cx, h],
    popupAnchor: [0, -h],
  })
}

// ─── User location icon ───────────────────────────────────────────────────────
// Clean blue puck (no animation) – accuracy shown as a Circle overlay.
const userPuckIcon = L.divIcon({
  className: '',
  html: `
    <div style="
      width: 18px; height: 18px;
      background: #4285F4;
      border-radius: 50%;
      border: 2.5px solid white;
      box-shadow: 0 2px 6px rgba(66,133,244,0.55);
    "></div>
  `,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -12],
})

// ─── POI icon map ─────────────────────────────────────────────────────────────
const POI_EMOJI: Record<string, string> = {
  department: '🏛',
  office:     '🏢',
  lab:        '🔬',
  facility:   '🏪',
  food:       '🍽',
  sports:     '⚽',
  entrance:   '🚪',
  health:     '🏥',
}
function poiEmoji(type: string) {
  return POI_EMOJI[type.toLowerCase()] ?? '📍'
}

// Pre-built selected-destination pin (red, larger)
const selectedPinIcon = makePinIcon('#ef4444', '🎯', [34, 42])

interface MapProps {
  pois: POI[]
  userLocation: UserLocation | null
  selectedPOI: POI | null
  onSelectPOI: (poi: POI) => void
  isNavigating: boolean
  routeWaypoints?: [number, number][]
  showMatrix?: boolean
  /** When this flips false, map size is recalculated (loading overlay was covering the map). */
  isLoading?: boolean
}

// ─── Fix grey / missing tiles when map mounts inside flex / after loading overlay ───
function MapLayoutFix({ isLoading }: { isLoading?: boolean }) {
  const map = useMap()
  useEffect(() => {
    const fix = () => {
      map.invalidateSize()
    }
    fix()
    const t = window.setTimeout(fix, 100)
    const t2 = window.setTimeout(fix, 400)
    window.addEventListener('resize', fix)
    return () => {
      window.clearTimeout(t)
      window.clearTimeout(t2)
      window.removeEventListener('resize', fix)
    }
  }, [map])

  useEffect(() => {
    if (isLoading) return
    const t = window.setTimeout(() => map.invalidateSize(), 0)
    const t2 = window.setTimeout(() => map.invalidateSize(), 150)
    return () => {
      window.clearTimeout(t)
      window.clearTimeout(t2)
    }
  }, [isLoading, map])

  return null
}

// ─── Map view auto-updater ─────────────────────────────────────────────────────
function MapUpdater({ userLocation, selectedPOI, isNavigating }: {
  userLocation: UserLocation | null
  selectedPOI: POI | null
  isNavigating: boolean
}) {
  const map = useMap()
  useEffect(() => {
    if (isNavigating && userLocation) {
      map.setView([userLocation.latitude, userLocation.longitude], 18, { animate: true })
    } else if (selectedPOI) {
      map.setView([selectedPOI.Latitude, selectedPOI.Longitude], 17, { animate: true })
    }
  }, [userLocation, selectedPOI, isNavigating, map])
  useEffect(() => {
    const id = window.setTimeout(() => map.invalidateSize(), 0)
    return () => window.clearTimeout(id)
  }, [userLocation, selectedPOI, isNavigating, map])
  return null
}

// ─── Map matrix overlay ────────────────────────────────────────────────────────
// Renders the campus walkable path network as a subtle overlay that blends with
// satellite imagery (thin white lines + small dots).
function MapMatrixOverlay() {
  const nodeById: Record<number, (typeof CAMPUS_GRAPH_NODES)[0]> = Object.fromEntries(
    CAMPUS_GRAPH_NODES.map(n => [n.id, n])
  )

  return (
    <>
      {/* Path edges – thin, low-opacity white strokes */}
      {CAMPUS_GRAPH_EDGES.map(([a, b], idx) => {
        const na = nodeById[a]
        const nb = nodeById[b]
        if (!na || !nb) return null
        return (
          <Polyline
            key={`edge-${idx}`}
            positions={[[na.lat, na.lng], [nb.lat, nb.lng]]}
            pathOptions={{
              color: '#ffffff',
              weight: 1.5,
              opacity: 0.28,
            }}
          />
        )
      })}

      {/* Path nodes – tiny dots, barely visible on satellite */}
      {CAMPUS_GRAPH_NODES.map(node => (
        <CircleMarker
          key={`node-${node.id}`}
          center={[node.lat, node.lng]}
          radius={node.type === 'intersection' ? 2 : 3}
          pathOptions={{
            color: node.type === 'entrance' ? '#fbbf24' : '#ffffff',
            fillColor: node.type === 'entrance' ? '#f59e0b' : '#e2e8f0',
            fillOpacity: 0.65,
            weight: 1,
            opacity: 0.5,
          }}
        >
          <Popup>
            <div className="text-xs font-medium">{node.name}</div>
            <div className="text-xs text-slate-400 capitalize">{node.type}</div>
          </Popup>
        </CircleMarker>
      ))}
    </>
  )
}

// ─── Main Map component ────────────────────────────────────────────────────────
export default function Map({
  pois,
  userLocation,
  selectedPOI,
  onSelectPOI,
  isNavigating,
  routeWaypoints,
  showMatrix = true,
  isLoading = false,
}: MapProps) {
  const campusCenter: [number, number] = [6.051051865873037, 121.01298063248167]

  // Route geometry: prefer Dijkstra waypoints, fall back to straight line
  const routeLine: [number, number][] | null = (() => {
    if (!isNavigating || !userLocation || !selectedPOI) return null
    if (routeWaypoints && routeWaypoints.length >= 2) return routeWaypoints
    return [
      [userLocation.latitude, userLocation.longitude],
      [selectedPOI.Latitude, selectedPOI.Longitude],
    ]
  })()

  return (
    <MapContainer
      center={campusCenter}
      zoom={17}
      className="h-full w-full z-0"
      style={{ minHeight: '100%', width: '100%', height: '100%' }}
      zoomControl={false}
    >
      {/* Ensure Leaflet recalculates size after flex layout / overlay hides */}
      <MapLayoutFix isLoading={isLoading} />

      {/*
        Important: put ALL BaseLayers first, then Overlays last.
        An Overlay between BaseLayers breaks layer switching / can leave a grey map in react-leaflet.
      */}
      <LayersControl position="topright">
        <BaseLayer name="Aerial (real satellite)" checked>
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a> — Maxar, Earthstar, others'
            url={ESRI_IMAGERY}
            maxZoom={20}
          />
        </BaseLayer>

        <BaseLayer name="Street map (Esri)">
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            url={ESRI_STREET}
            maxZoom={19}
          />
        </BaseLayer>

        <BaseLayer name="Street (OpenStreetMap)">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
            subdomains={['a', 'b', 'c']}
          />
        </BaseLayer>

        <BaseLayer name="Dark (Carto)">
          <TileLayer
            attribution='&copy; OSM &copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            maxZoom={20}
          />
        </BaseLayer>

        {/* Optional hybrid labels — off by default so a bad overlay never hides the basemap */}
        <Overlay name="Labels on aerial">
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            url={ESRI_REFERENCE_LABELS}
            maxZoom={20}
            opacity={0.9}
          />
        </Overlay>
      </LayersControl>

      {/* ── Map updater ───────────────────────────────────────────────────── */}
      <MapUpdater
        userLocation={userLocation}
        selectedPOI={selectedPOI}
        isNavigating={isNavigating}
      />

      {/* ── Map-matrix path network ───────────────────────────────────────── */}
      {showMatrix && <MapMatrixOverlay />}

      {/* ── Navigation route ─────────────────────────────────────────────── */}
      {/*
        Rendered as two stacked polylines:
          1. A white/light outer casing  — like Google Maps road style
          2. A solid coloured inner line — no dashes, clean real-navigation look
      */}
      {routeLine && (
        <>
          <Polyline
            positions={routeLine}
            pathOptions={{
              color: 'white',
              weight: 9,
              opacity: 0.75,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
          <Polyline
            positions={routeLine}
            pathOptions={{
              color: '#1d6ef5',
              weight: 5,
              opacity: 1,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        </>
      )}

      {/* ── User location ─────────────────────────────────────────────────── */}
      {userLocation && (
        <>
          {/* GPS accuracy circle */}
          <Circle
            center={[userLocation.latitude, userLocation.longitude]}
            radius={userLocation.accuracy}
            pathOptions={{
              color: '#4285F4',
              fillColor: '#4285F4',
              fillOpacity: 0.08,
              weight: 1,
              opacity: 0.35,
            }}
          />
          {/* Blue location puck */}
          <Marker
            position={[userLocation.latitude, userLocation.longitude]}
            icon={userPuckIcon}
          >
            <Popup>
              <div className="text-center">
                <strong>Your Location</strong>
                <p className="text-xs text-slate-400 mt-1">
                  GPS accuracy ±{Math.round(userLocation.accuracy)} m
                </p>
              </div>
            </Popup>
          </Marker>
        </>
      )}

      {/* ── POI markers ───────────────────────────────────────────────────── */}
      {pois.map(poi => {
        const isSelected = selectedPOI?.POIId === poi.POIId
        const icon = isSelected
          ? selectedPinIcon
          : makePinIcon('#00a86b', poiEmoji(poi.Type), [28, 35])

        return (
          <Marker
            key={poi.POIId}
            position={[poi.Latitude, poi.Longitude]}
            icon={icon}
            eventHandlers={{ click: () => onSelectPOI(poi) }}
          >
            <Popup>
              <div className="min-w-[180px]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{poiEmoji(poi.Type)}</span>
                  <strong className="text-white">{poi.BuildingName}</strong>
                </div>
                <p className="text-xs text-slate-300 mb-2">{poi.Description}</p>
                <span className="inline-block px-2 py-1 bg-primary-500/20 text-primary-400 text-xs rounded-full capitalize">
                  {poi.Type}
                </span>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
