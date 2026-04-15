import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Compass, Navigation } from 'lucide-react'
import { POI, UserLocation, NavigationState } from '../types'
import { calculateBearing, formatDistance } from '../utils/navigation'

interface ARViewProps {
  userLocation: UserLocation | null
  selectedPOI: POI | null
  isNavigating: boolean
  navigationState: NavigationState
  distance: number | null
  direction: string
}

export default function ARView({
  userLocation,
  selectedPOI,
  isNavigating,
  navigationState,
  distance,
  direction,
}: ARViewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null)
  const [sensorError, setSensorError] = useState<string | null>(null)

  const arEnabled = selectedPOI ? (selectedPOI.AREnabled ?? 1) === 1 : false
  const arLabel = selectedPOI?.ARLabel?.trim() || selectedPOI?.BuildingName || 'Destination'
  const iconScale = selectedPOI?.IconScale && selectedPOI.IconScale > 0 ? selectedPOI.IconScale : 1
  const minVisibleDistance = selectedPOI?.MinVisibleDistance ?? 3
  const maxVisibleDistance = selectedPOI?.MaxVisibleDistance ?? 300
  const isWithinVisibleDistance = distance !== null && distance >= minVisibleDistance && distance <= maxVisibleDistance

  useEffect(() => {
    let stream: MediaStream | null = null
    let isCancelled = false

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera access is not supported on this browser.')
        return
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        if (isCancelled) {
          stream.getTracks().forEach(track => track.stop())
          return
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          try {
            await videoRef.current.play()
          } catch (playErr) {
            const domErr = playErr as DOMException
            if (domErr?.name === 'AbortError') {
              // Can happen if the stream is replaced quickly during rerender/unmount.
              return
            }
            throw playErr
          }
          if (isCancelled) return
          setIsCameraReady(true)
          setCameraError(null)
        }
      } catch (err) {
        const domErr = err as DOMException
        if (domErr?.name === 'AbortError' || isCancelled) return
        console.error('Camera error:', err)
        setCameraError('Unable to access camera. Allow permission and reload.')
      }
    }

    startCamera()

    return () => {
      isCancelled = true
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.srcObject = null
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  useEffect(() => {
    const handler = (event: DeviceOrientationEvent) => {
      // iOS Safari may provide webkitCompassHeading; most browsers provide alpha.
      const raw = (event as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading
      if (typeof raw === 'number' && Number.isFinite(raw)) {
        setDeviceHeading((raw + 360) % 360)
        return
      }
      if (typeof event.alpha === 'number' && Number.isFinite(event.alpha)) {
        setDeviceHeading((360 - event.alpha + 360) % 360)
      }
    }

    window.addEventListener('deviceorientation', handler, true)
    return () => window.removeEventListener('deviceorientation', handler, true)
  }, [])

  const relativeTurn = useMemo(() => {
    if (!isNavigating || !userLocation || !selectedPOI) return null
    const heading = userLocation.heading ?? deviceHeading
    if (heading === null || heading === undefined) return null

    const bearing = calculateBearing(
      userLocation.latitude,
      userLocation.longitude,
      selectedPOI.Latitude,
      selectedPOI.Longitude
    )
    const turn = ((bearing - heading + 540) % 360) - 180
    return Math.round(turn)
  }, [isNavigating, userLocation, selectedPOI, deviceHeading])
  const arrowOffset = Math.max(-120, Math.min(120, (relativeTurn ?? 0) * 1.8))

  const requestSensorPermission = async () => {
    try {
      const orientationAPI = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
        requestPermission?: () => Promise<'granted' | 'denied'>
      }
      if (typeof orientationAPI.requestPermission !== 'function') return
      const result = await orientationAPI.requestPermission()
      if (result !== 'granted') {
        setSensorError('Motion sensor permission was denied.')
      } else {
        setSensorError(null)
      }
    } catch (err) {
      console.error('Sensor permission error:', err)
      setSensorError('Could not enable motion sensors on this device.')
    }
  }

  return (
    <div className="absolute inset-0 z-[1] bg-black overflow-hidden">
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
        autoPlay
      />

      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/65 pointer-events-none" />

      <div className="absolute top-24 left-4 right-4 z-[1000] space-y-2">
        {!isCameraReady && !cameraError && (
          <div className="glass rounded-xl px-4 py-3 text-sm text-slate-300">
            Initializing camera...
          </div>
        )}

        {cameraError && (
          <div className="bg-red-500/85 rounded-xl px-4 py-3 text-sm text-white">
            {cameraError}
          </div>
        )}

        <div className="glass rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-200">
            <Camera className="w-4 h-4 text-primary-400" />
            <span className="text-sm font-medium">AR View</span>
          </div>
          <button
            onClick={requestSensorPermission}
            className="text-xs px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-slate-200 transition-all"
          >
            Enable Sensors
          </button>
        </div>

        {sensorError && (
          <div className="bg-amber-500/80 rounded-xl px-4 py-3 text-xs text-amber-950">
            {sensorError}
          </div>
        )}
      </div>

      {selectedPOI && arEnabled && isWithinVisibleDistance && (
        <div className="absolute top-[38%] left-1/2 -translate-x-1/2 z-[1000] text-center pointer-events-none">
          <div
            className="mx-auto mb-2 w-16 h-16 rounded-full bg-primary-500/30 border border-primary-300/60 backdrop-blur-sm flex items-center justify-center"
            style={{
              transform: `translateX(${Math.max(-140, Math.min(140, relativeTurn ?? 0))}px) scale(${iconScale})`,
            }}
          >
            <Navigation className="w-8 h-8 text-primary-100" />
          </div>
          <p className="text-white text-sm font-semibold bg-black/45 px-3 py-1 rounded-full">
            {arLabel}
          </p>
        </div>
      )}

      {isNavigating && selectedPOI && arEnabled && isWithinVisibleDistance && navigationState !== 'arrived' && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 z-[1000] text-center pointer-events-none">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-500/25 border border-primary-300/50 px-4 py-2">
            <Compass className="w-4 h-4 text-primary-100" />
            <span className="text-sm text-white font-medium">{direction || 'Aligning direction...'}</span>
          </div>
        </div>
      )}

      {/* AR destination path arrows */}
      {isNavigating && selectedPOI && arEnabled && isWithinVisibleDistance && navigationState !== 'arrived' && (
        <div className="absolute inset-x-0 bottom-52 top-[52%] z-[900] pointer-events-none overflow-hidden">
          <div
            className="absolute left-1/2 bottom-0 -translate-x-1/2 flex flex-col items-center gap-2"
            style={{ transform: `translateX(${arrowOffset}px)` }}
          >
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className="w-0 h-0 border-l-[18px] border-r-[18px] border-b-[28px] border-l-transparent border-r-transparent border-b-cyan-300/90"
                style={{
                  opacity: Math.max(0.2, 1 - idx * 0.11),
                  transform: `scale(${Math.max(0.45, 1 - idx * 0.08)})`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="absolute bottom-36 left-4 right-4 z-[1000]">
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-slate-400 mb-1">Destination</p>
          <p className="text-white font-semibold text-base">
            {selectedPOI ? arLabel : 'Select a destination to begin'}
          </p>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-slate-300">
              Distance: <span className="text-white font-semibold">{distance !== null ? formatDistance(distance) : '--'}</span>
            </span>
            <span className="text-slate-300">
              Heading: <span className="text-white font-semibold">
                {Math.round((userLocation?.heading ?? deviceHeading ?? 0))}°
              </span>
            </span>
          </div>
          {selectedPOI && !arEnabled && (
            <p className="mt-2 text-xs text-amber-300">
              AR marker is disabled for this destination by admin settings.
            </p>
          )}
          {selectedPOI && arEnabled && distance !== null && distance < minVisibleDistance && (
            <p className="mt-2 text-xs text-slate-300">
              Move a little farther (at least {Math.round(minVisibleDistance)}m) to show AR marker.
            </p>
          )}
          {selectedPOI && arEnabled && distance !== null && distance > maxVisibleDistance && (
            <p className="mt-2 text-xs text-slate-300">
              AR marker appears when you are within {Math.round(maxVisibleDistance)}m.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
