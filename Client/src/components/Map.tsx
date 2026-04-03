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

const { BaseLayer } = LayersControl

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
      className="h-full w-full"
      zoomControl={false}
    >
      {/* ── Tile layers ──────────────────────────────────────────────────────── */}
      {/*
        All three base layers live inside LayersControl.
        Satellite is checked so it renders by default – giving the "real" look
        the user wants. Street and Dark are available as alternatives.
      */}
      <LayersControl position="topright">
        <BaseLayer name="Satellite (ESRI)" checked>
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a> — Source: Esri, DigitalGlobe, GeoEye, Earthstar Geographics'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={20}
          />
        </BaseLayer>

        <BaseLayer name="Street (OSM)">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </BaseLayer>

        <BaseLayer name="Dark (CartoDB)">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
        </BaseLayer>
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
