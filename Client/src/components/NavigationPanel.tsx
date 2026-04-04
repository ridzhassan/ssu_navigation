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
      <div className="absolute bottom-0 left-0 right-0 z-[1000] px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:p-4 slide-up">
        <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center max-h-[min(50vh,320px)] sm:max-h-none overflow-y-auto">
          <div className="w-14 h-14 sm:w-20 sm:h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-4">
            <span className="text-3xl sm:text-4xl">🎉</span>
          </div>
          <h3 className="text-lg sm:text-xl font-display font-bold text-white mb-1 sm:mb-2">
            You've Arrived!
          </h3>
          <p className="text-sm sm:text-base text-slate-400 mb-4 sm:mb-6 line-clamp-2">
            Welcome to {selectedPOI.BuildingName}
          </p>
          <button
            onClick={onStopNavigation}
            className="btn-primary w-full py-2.5 sm:py-3 text-sm sm:text-base"
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
      <div className="absolute bottom-0 left-0 right-0 z-[1000] px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:p-4 slide-up">
        <div className="glass rounded-xl sm:rounded-2xl overflow-hidden max-h-[min(52vh,380px)] sm:max-h-none flex flex-col">
          {/* Direction indicator */}
          <div className="bg-primary-500/20 px-3 py-2.5 sm:px-6 sm:py-4 border-b border-primary-500/20 shrink-0">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <div className="w-10 h-10 sm:w-14 sm:h-14 bg-primary-500 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
                <Compass className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-primary-300 text-[11px] sm:text-sm font-medium">Next Direction</p>
                <p className="text-white text-sm sm:text-lg font-semibold leading-snug line-clamp-2">
                  {direction || 'Calculating...'}
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="p-3 sm:p-6 flex flex-col min-h-0 flex-1 overflow-y-auto">
            <div className="flex items-start gap-2 mb-3 sm:mb-6 min-w-0">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-slate-400 text-[10px] sm:text-xs">Destination</p>
                <p className="text-white text-sm sm:text-base font-semibold leading-tight line-clamp-2">
                  {selectedPOI.BuildingName}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-6 min-w-0">
              <div className="bg-white/5 rounded-lg sm:rounded-xl p-2 sm:p-4 text-center min-w-0">
                <Navigation className="w-4 h-4 sm:w-6 sm:h-6 text-primary-400 mx-auto mb-1 sm:mb-2" />
                <p className="text-base sm:text-2xl font-bold text-white tabular-nums leading-tight break-words">
                  {distance !== null ? formatDistance(distance) : '--'}
                </p>
                <p className="text-[10px] sm:text-xs text-slate-400">Distance</p>
              </div>
              <div className="bg-white/5 rounded-lg sm:rounded-xl p-2 sm:p-4 text-center min-w-0">
                <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-primary-400 mx-auto mb-1 sm:mb-2" />
                <p className="text-base sm:text-2xl font-bold text-white tabular-nums leading-tight">
                  {distance !== null ? `${estimateWalkingTime(distance)} min` : '--'}
                </p>
                <p className="text-[10px] sm:text-xs text-slate-400">Est. Time</p>
              </div>
            </div>

            <button
              onClick={onStopNavigation}
              className="w-full mt-auto shrink-0 bg-red-500/20 hover:bg-red-500/30 text-red-400 py-2 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <Square className="w-4 h-4 sm:w-5 sm:h-5" />
              Stop Navigation
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Selected destination (not navigating yet)
  return (
    <div className="absolute bottom-0 left-0 right-0 z-[1000] px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:p-4 slide-up">
      <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6 max-h-[min(48vh,340px)] sm:max-h-none overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <div className="w-10 h-10 sm:w-14 sm:h-14 bg-primary-500/20 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 sm:w-7 sm:h-7 text-primary-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-display font-bold text-white leading-tight line-clamp-2">
                {selectedPOI.BuildingName}
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 capitalize">{selectedPOI.Type}</p>
            </div>
          </div>
          <button
            onClick={onClearSelection}
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Description */}
        {selectedPOI.Description && (
          <p className="text-xs sm:text-sm text-slate-400 mb-4 sm:mb-6 line-clamp-2">
            {selectedPOI.Description}
          </p>
        )}

        {/* Actions */}
        <button
          onClick={onStartNavigation}
          className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 text-sm sm:text-base"
        >
          <Play className="w-4 h-4 sm:w-5 sm:h-5" />
          Start Navigation
        </button>

        <p className="text-[10px] sm:text-xs text-slate-500 text-center mt-2 sm:mt-3">
          Make sure location services are enabled
        </p>
      </div>
    </div>
  )
}
