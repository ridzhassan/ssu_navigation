import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera } from 'lucide-react'
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
  direction: _direction,
}: ARViewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null)
  const [sensorError, setSensorError] = useState<string | null>(null)
  const [viewportWidth, setViewportWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  )

  const arEnabled = selectedPOI ? (selectedPOI.AREnabled ?? 1) === 1 : false
  const arLabel = selectedPOI?.ARLabel?.trim() || selectedPOI?.BuildingName || 'Destination'
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

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
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
  const arrowOffset = 0
  const laneTilt = 0
  const turnMagnitude = Math.abs(relativeTurn ?? 0)
  const isSharpTurn = turnMagnitude >= 65
  const turnIntensity = Math.min(1, turnMagnitude / 90)
  const arrowScale = viewportWidth <= 640 ? 1.45 : viewportWidth <= 900 ? 1.25 : 1.1
  const arrowSpacing = viewportWidth <= 640 ? 62 : viewportWidth <= 900 ? 58 : 52
  const requestSensorPermission = async () => {
    try {
      const orientationAPI = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
        requestPermission?: () => Promise<'granted' | 'denied'>
      }
      if (typeof orientationAPI.requestPermission !== 'function') {
        setSensorError(null)
        return
      }
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

  useEffect(() => {
    // Automatically try enabling sensors when AR view loads.
    requestSensorPermission()
  }, [])

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

      <div className="absolute top-24 left-4 right-4 z-[1000] space-y-2 hidden">
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
        </div>

        {sensorError && (
          <div className="bg-amber-500/80 rounded-xl px-4 py-3 text-xs text-amber-950">
            {sensorError}
          </div>
        )}
      </div>

      {/* AR destination path arrows (pseudo-3D floor projection) */}
      {isNavigating && selectedPOI && arEnabled && isWithinVisibleDistance && navigationState !== 'arrived' && (
        <div className="absolute inset-x-0 bottom-44 top-[24%] z-[900] pointer-events-none overflow-hidden">
          <div
            className="absolute left-1/2 bottom-0 -translate-x-1/2 ar-lane-shadow-strip"
            style={{
              width: `${(380 + turnIntensity * 150) * arrowScale}px`,
              opacity: 0.35 + turnIntensity * 0.35,
              transform: `translateX(calc(-50% + ${arrowOffset * 0.32}px)) rotate(${laneTilt * 0.7}deg)`,
            }}
          />
          <div
            className="absolute left-1/2 bottom-0 -translate-x-1/2 ar-arrow-lane-3d"
            style={{ transform: `translateX(calc(-50% + ${arrowOffset}px)) rotate(${laneTilt}deg)` }}
          >
            {Array.from({ length: 12 }).map((_, idx) => {
              const depthProgress = idx / 11
              const depthScaleBase = Math.max(0.2, 1 - idx * 0.11)
              const depthScale = depthScaleBase * (1 + turnIntensity * 0.15)
              const leadBoost = idx === 0 ? 1.45 : idx === 1 ? 1.2 : 1
              const arrowWidth = Math.round(42 * depthScale * arrowScale * leadBoost)
              const arrowHeight = Math.round(68 * depthScale * arrowScale * leadBoost)
              const curvePx = 0
              const arrowYaw = 0
              const depthTilt = Math.round(58 - depthProgress * 34)
              const bright = isSharpTurn ? 'rgba(253, 230, 138, 0.98)' : 'rgba(103, 232, 249, 0.98)'
              const base = isSharpTurn ? 'rgba(245, 158, 11, 0.92)' : 'rgba(6, 182, 212, 0.9)'
              const tail = isSharpTurn ? 'rgba(180, 83, 9, 0.86)' : 'rgba(8, 145, 178, 0.84)'

              return (
                <div
                  key={idx}
                  className="ar-arrow-chevron-3d"
                  style={{
                    bottom: `${idx * arrowSpacing}px`,
                    opacity: idx === 0 ? 0.98 : Math.max(0.24, 1 - idx * 0.1),
                    width: `${arrowWidth * 2}px`,
                    height: `${arrowHeight}px`,
                    backgroundImage: `linear-gradient(165deg, ${bright} 0%, ${base} 46%, ${tail} 100%)`,
                    transform: `translateX(calc(-50% + ${curvePx}px)) rotate(${arrowYaw}deg) rotateX(${depthTilt}deg)`,
                    filter: isSharpTurn
                      ? 'drop-shadow(0 0 10px rgba(251, 191, 36, 0.72)) drop-shadow(0 10px 8px rgba(251, 146, 60, 0.34))'
                      : 'drop-shadow(0 0 8px rgba(34, 211, 238, 0.65)) drop-shadow(0 10px 8px rgba(14, 116, 144, 0.32))',
                    animationDelay: `${idx * 120}ms`,
                    animationDuration: `${1.6 - turnIntensity * 0.45}s`,
                  }}
                />
              )
            })}
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
