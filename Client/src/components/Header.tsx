import { Navigation, Search } from 'lucide-react'

interface HeaderProps {
  onSearchClick: () => void
  isNavigating: boolean
}

export default function Header({ onSearchClick, isNavigating }: HeaderProps) {
  return (
    <header className="absolute top-0 left-0 right-0 z-[1000] p-4">
      <div className="glass rounded-2xl px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg">
            <Navigation className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="font-display font-bold text-white text-lg leading-tight">SSC Navigator</h1>
            <p className="text-xs text-slate-400">Campus Navigation</p>
          </div>
        </div>

        {/* Search button */}
        {!isNavigating && (
          <button
            onClick={onSearchClick}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 transition-all"
          >
            <Search className="w-4 h-4 text-slate-400" />
            <span className="text-slate-300 text-sm hidden sm:inline">Search destination...</span>
            <span className="text-slate-300 text-sm sm:hidden">Search</span>
          </button>
        )}

        {/* Navigation status */}
        {isNavigating && (
          <div className="flex items-center gap-2 bg-primary-500/20 border border-primary-500/30 rounded-xl px-4 py-2">
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
            <span className="text-primary-400 text-sm font-medium">Navigating</span>
          </div>
        )}
      </div>
    </header>
  )
}

