import { useState, useEffect, useCallback } from 'react'
import Map from './components/Map'
import ARView from './components/ARView'
import SearchPanel from './components/SearchPanel'
import NavigationPanel from './components/NavigationPanel'
import Header from './components/Header'
import { POI, UserLocation, NavigationState } from './types'
import { fetchPOIs } from './services/api'
import {
  calculateDistance,
  calculateBearing,
  getDirectionText,
  findNearestNode,
  dijkstra,
  pathToWaypoints,
} from './utils/navigation'
import { CAMPUS_GRAPH_NODES, CAMPUS_GRAPH_EDGES } from './constants/mapMatrix'

function App() {
  // POIs from API only – Admin Panel is the single source of truth for all coordinates
  const [pois, setPois] = useState<POI[]>([])
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null)
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [navigationState, setNavigationState] = useState<NavigationState>('idle')
  const [distance, setDistance] = useState<number | null>(null)
  const [direction, setDirection] = useState<string>('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [watchId, setWatchId] = useState<number | null>(null)
  const [routeWaypoints, setRouteWaypoints] = useState<[number, number][] | undefined>(undefined)
  const [showMatrix, setShowMatrix] = useState(true)
  const [isARMode, setIsARMode] = useState(false)

  // Load POIs on mount
  useEffect(() => {
    loadPOIs()
  }, [])

  // Track user location when navigating
  useEffect(() => {
    if (navigationState === 'navigating' && selectedPOI) {
      startLocationTracking()
    } else {
      stopLocationTracking()
    }

    return () => stopLocationTracking()
  }, [navigationState, selectedPOI])

  // Update distance and direction when location changes
  useEffect(() => {
    if (userLocation && selectedPOI && navigationState === 'navigating') {
      const dist = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        selectedPOI.Latitude,
        selectedPOI.Longitude
      )
      setDistance(dist)

      const bearing = calculateBearing(
        userLocation.latitude,
        userLocation.longitude,
        selectedPOI.Latitude,
        selectedPOI.Longitude
      )
      
      const heading = userLocation.heading || 0
      setDirection(getDirectionText(heading, bearing))

      // Check if arrived
      if (dist < 15) {
        setNavigationState('arrived')
      }
    }
  }, [userLocation, selectedPOI, navigationState])

  const loadPOIs = async () => {
    try {
      setIsLoading(true)
      const data = await fetchPOIs()
      setPois(data)
    } catch (err) {
      setError('Failed to load campus locations')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const startLocationTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading || undefined
        })
        setError(null)
      },
      (err) => {
        console.error('Geolocation error:', err)
        setError('Unable to get your location. Please enable GPS.')
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
    setWatchId(id)
  }, [])

  const stopLocationTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId)
      setWatchId(null)
    }
  }, [watchId])

  /** Compute the Dijkstra route between the current location and the destination POI */
  const computeRoute = useCallback(
    (userLat: number, userLng: number, destLat: number, destLng: number) => {
      const startNode = findNearestNode(CAMPUS_GRAPH_NODES, userLat, userLng)
      const endNode = findNearestNode(CAMPUS_GRAPH_NODES, destLat, destLng)
      const nodeIds = dijkstra(CAMPUS_GRAPH_NODES, CAMPUS_GRAPH_EDGES, startNode.id, endNode.id)
      if (nodeIds.length >= 2) {
        // Prepend user's actual position and append POI position for accuracy
        const graphWaypoints = pathToWaypoints(CAMPUS_GRAPH_NODES, nodeIds)
        setRouteWaypoints([
          [userLat, userLng],
          ...graphWaypoints,
          [destLat, destLng],
        ])
      } else {
        // Graph disconnected – fall back to straight line (handled in Map)
        setRouteWaypoints(undefined)
      }
    },
    []
  )

  const handleSelectDestination = (poi: POI) => {
    setSelectedPOI(poi)
    setRouteWaypoints(undefined)
    setIsSearchOpen(false)
  }

  const handleStartNavigation = () => {
    if (!selectedPOI) return

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude
        const userLng = position.coords.longitude
        setUserLocation({
          latitude: userLat,
          longitude: userLng,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading || undefined,
        })
        computeRoute(userLat, userLng, selectedPOI.Latitude, selectedPOI.Longitude)
        setNavigationState('navigating')
      },
      (err) => {
        console.error('Initial location error:', err)
        setError('Please enable location services to start navigation')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleStopNavigation = () => {
    setNavigationState('idle')
    setSelectedPOI(null)
    setDistance(null)
    setDirection('')
    setRouteWaypoints(undefined)
  }

  const handleCenterOnUser = () => {
    if (!userLocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading || undefined
          })
        },
        (err) => console.error(err),
        { enableHighAccuracy: true }
      )
    }
  }

  return (
    <div className="h-full w-full flex flex-col relative">
      {/* Header */}
      <Header 
        onSearchClick={() => setIsSearchOpen(true)}
        isNavigating={navigationState === 'navigating'}
        isARMode={isARMode}
        onToggleARMode={() => setIsARMode(v => !v)}
      />

      {/* Map — min-h-0 so flex child can shrink; Leaflet needs a real height for tiles */}
      <div className="flex-1 relative min-h-0">
        {isARMode ? (
          <ARView
            userLocation={userLocation}
            selectedPOI={selectedPOI}
            isNavigating={navigationState === 'navigating'}
            navigationState={navigationState}
            distance={distance}
            direction={direction}
          />
        ) : (
          <Map
            pois={pois}
            userLocation={userLocation}
            selectedPOI={selectedPOI}
            onSelectPOI={handleSelectDestination}
            isNavigating={navigationState === 'navigating'}
            routeWaypoints={routeWaypoints}
            showMatrix={showMatrix}
            isLoading={isLoading}
          />
        )}

        {/* Error message */}
        {error && (
          <div className="absolute top-20 sm:top-4 left-3 right-3 sm:left-4 sm:right-4 z-[1000] bg-red-500/90 text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm fade-in">
            {error}
          </div>
        )}

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-[1000] bg-dark-900/80 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-300">Loading campus map...</p>
            </div>
          </div>
        )}

        {/* Center on user button */}
        {!isARMode && (
          <button
            onClick={handleCenterOnUser}
            className="absolute right-3 sm:right-4 z-[1000] w-11 h-11 sm:w-12 sm:h-12 bg-dark-700 hover:bg-dark-600 rounded-full flex items-center justify-center shadow-lg transition-all"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 7rem)' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-primary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v2m0 16v2M2 12h2m16 0h2" />
            </svg>
          </button>
        )}

        {/* Map matrix toggle */}
        {!isARMode && (
          <button
            onClick={() => setShowMatrix(v => !v)}
            title={showMatrix ? 'Hide path network' : 'Show path network'}
            className={`absolute right-3 sm:right-4 z-[1000] w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${
              showMatrix
                ? 'bg-primary-600 hover:bg-primary-500 text-white'
                : 'bg-dark-700 hover:bg-dark-600 text-slate-400'
            }`}
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 10.25rem)' }}
          >
            {/* Grid / matrix icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
          </button>
        )}
      </div>

      {/* Search Panel */}
      <SearchPanel
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        pois={pois}
        onSelectPOI={handleSelectDestination}
      />

      {/* Navigation Panel */}
      <NavigationPanel
        selectedPOI={selectedPOI}
        navigationState={navigationState}
        distance={distance}
        direction={direction}
        onStartNavigation={handleStartNavigation}
        onStopNavigation={handleStopNavigation}
        onClearSelection={() => setSelectedPOI(null)}
      />
    </div>
  )
}

export default App

