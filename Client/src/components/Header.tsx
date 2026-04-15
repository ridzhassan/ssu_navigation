import { Navigation, Search, Camera } from 'lucide-react'

interface HeaderProps {
  onSearchClick: () => void
  isNavigating: boolean
  isARMode: boolean
  onToggleARMode: () => void
}

export default function Header({ onSearchClick, isNavigating, isARMode, onToggleARMode }: HeaderProps) {
  return (
    <header className="absolute top-0 left-0 right-0 z-[1000] px-2 pt-[max(0.4rem,env(safe-area-inset-top))] pb-2 sm:p-4">
      <div className="glass rounded-xl sm:rounded-2xl px-2.5 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-2 sm:gap-3">
        {/* Logo */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg shrink-0">
            <Navigation className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display font-bold text-white text-sm sm:text-lg leading-tight truncate">SSC Navigator</h1>
            <p className="text-[10px] sm:text-xs text-slate-400 truncate">Campus Navigation</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {!isNavigating && (
            <button
              onClick={onSearchClick}
              className="flex items-center gap-1.5 sm:gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg sm:rounded-xl px-2.5 sm:px-4 py-2 sm:py-2.5 transition-all"
            >
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-slate-300 text-xs sm:text-sm hidden sm:inline">Search destination...</span>
              <span className="text-slate-300 text-xs sm:text-sm sm:hidden">Search</span>
            </button>
          )}

          {isNavigating && (
            <div className="flex items-center gap-1.5 bg-primary-500/20 border border-primary-500/30 rounded-lg sm:rounded-xl px-2.5 sm:px-3 py-2">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary-500 rounded-full animate-pulse shrink-0" />
              <span className="text-primary-300 text-[11px] sm:text-sm font-medium">Navigating</span>
            </div>
          )}

          <button
            onClick={onToggleARMode}
            className={`flex items-center gap-1.5 sm:gap-2 border rounded-lg sm:rounded-xl px-2.5 sm:px-3 py-2 sm:py-2.5 transition-all ${
              isARMode
                ? 'bg-primary-500/25 border-primary-500/40 text-primary-300'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
            }`}
            title={isARMode ? 'Switch to map view' : 'Switch to AR view'}
          >
            <Camera className="w-4 h-4 shrink-0" />
            <span className="text-xs sm:text-sm hidden sm:inline">{isARMode ? 'Map' : 'AR'}</span>
          </button>
        </div>
      </div>
    </header>
  )
}

