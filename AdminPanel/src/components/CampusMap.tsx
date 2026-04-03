import { useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, LayersControl } from 'react-leaflet'
import L from 'leaflet'

// Fix Leaflet default icon in bundlers
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: string })._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })
}

// Sulu State College – campus reference point
const SSC_CENTER: [number, number] = [6.051051865873037, 121.01298063248167]
// Administrative Building
const ADMIN_BUILDING: [number, number] = [6.051607934623702, 121.01233231292177]

interface POI {
  POIId: number
  BuildingName: string
  Latitude: number
  Longitude: number
  Type: string
  Description?: string
}

interface CampusMapProps {
  pois?: POI[]
  height?: string
  className?: string
}

export default function CampusMap({ pois = [], height = '16rem', className = '' }: CampusMapProps) {
  const mapCenter = useMemo(() => ADMIN_BUILDING, [])

  return (
    <div className={className} style={{ height }}>
      <MapContainer
        center={mapCenter}
        zoom={16}
        className="h-full w-full rounded-lg"
        zoomControl={true}
        style={{ minHeight: height }}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer name="OpenStreetMap" checked>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Dark (CartoDB)">
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              attribution="&copy; Esri"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        {/* Administrative Building marker */}
        <Marker position={ADMIN_BUILDING}>
          <Popup>
            <strong>Administrative Building</strong>
            <br />
            <span className="text-xs text-slate-500">Sulu State College</span>
          </Popup>
        </Marker>
        {/* Campus center reference */}
        <Marker position={SSC_CENTER}>
          <Popup>Sulu State College (Campus Center)</Popup>
        </Marker>

        {/* POI markers */}
        {pois.map((poi) => (
          <Marker key={poi.POIId} position={[poi.Latitude, poi.Longitude]}>
            <Popup>
              <div className="min-w-[160px]">
                <strong className="text-slate-900">{poi.BuildingName}</strong>
                <p className="text-xs text-slate-600 mt-1">{poi.Type}</p>
                {poi.Description && (
                  <p className="text-xs text-slate-500 mt-1">{poi.Description}</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
