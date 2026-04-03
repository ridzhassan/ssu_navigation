import { Navigation, X, Play, Square, MapPin, Clock, Compass } from 'lucide-react'
import { POI, NavigationState } from '../types'
import { formatDistance, estimateWalkingTime } from '../utils/navigation'

interface NavigationPanelProps {
  selectedPOI: POI | null
  navigationState: NavigationState
  distance: number | null
  direction: string
  onStartNavigation: () => void
  onStopNavigation: () => void
  onClearSelection: () => void
}

export default function NavigationPanel({
  selectedPOI,
  navigationState,
  distance,
  direction,
  onStartNavigation,
  onStopNavigation,
  onClearSelection
}: NavigationPanelProps) {
  if (!selectedPOI) return null

  // Arrived state
  if (navigationState === 'arrived') {
    return (
      <div className="absolute bottom-0 left-0 right-0 z-[1000] p-4 slide-up">
        <div className="glass rounded-2xl p-6 text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🎉</span>
          </div>
          <h3 className="text-xl font-display font-bold text-white mb-2">
            You've Arrived!
          </h3>
          <p className="text-slate-400 mb-6">
            Welcome to {selectedPOI.BuildingName}
          </p>
          <button
            onClick={onStopNavigation}
            className="btn-primary w-full"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  // Navigating state
  if (navigationState === 'navigating') {
    return (
      <div className="absolute bottom-0 left-0 right-0 z-[1000] p-4 slide-up">
        <div className="glass rounded-2xl overflow-hidden">
          {/* Direction indicator */}
          <div className="bg-primary-500/20 px-6 py-4 border-b border-primary-500/20">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary-500 rounded-xl flex items-center justify-center">
                <Compass className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-primary-300 text-sm font-medium">Next Direction</p>
                <p className="text-white text-lg font-semibold">{direction || 'Calculating...'}</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-red-400" />
                <div>
                  <p className="text-slate-400 text-xs">Destination</p>
                  <p className="text-white font-semibold">{selectedPOI.BuildingName}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <Navigation className="w-6 h-6 text-primary-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">
                  {distance !== null ? formatDistance(distance) : '--'}
                </p>
                <p className="text-xs text-slate-400">Distance</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <Clock className="w-6 h-6 text-primary-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">
                  {distance !== null ? `${estimateWalkingTime(distance)} min` : '--'}
                </p>
                <p className="text-xs text-slate-400">Est. Time</p>
              </div>
            </div>

            <button
              onClick={onStopNavigation}
              className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <Square className="w-5 h-5" />
              Stop Navigation
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Selected destination (not navigating yet)
  return (
    <div className="absolute bottom-0 left-0 right-0 z-[1000] p-4 slide-up">
      <div className="glass rounded-2xl p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary-500/20 rounded-xl flex items-center justify-center">
              <MapPin className="w-7 h-7 text-primary-400" />
            </div>
            <div>
              <h3 className="text-lg font-display font-bold text-white">
                {selectedPOI.BuildingName}
              </h3>
              <p className="text-sm text-slate-400 capitalize">{selectedPOI.Type}</p>
            </div>
          </div>
          <button
            onClick={onClearSelection}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Description */}
        {selectedPOI.Description && (
          <p className="text-sm text-slate-400 mb-6 line-clamp-2">
            {selectedPOI.Description}
          </p>
        )}

        {/* Actions */}
        <button
          onClick={onStartNavigation}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5" />
          Start Navigation
        </button>

        <p className="text-xs text-slate-500 text-center mt-3">
          Make sure location services are enabled
        </p>
      </div>
    </div>
  )
}

