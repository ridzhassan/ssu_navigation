import { useState, useMemo } from 'react'
import { Search, X, MapPin, Building2, FlaskConical, Utensils, Dumbbell, DoorOpen, Stethoscope, Landmark } from 'lucide-react'
import { POI } from '../types'

interface SearchPanelProps {
  isOpen: boolean
  onClose: () => void
  pois: POI[]
  onSelectPOI: (poi: POI) => void
}

const typeIcons: Record<string, React.ReactNode> = {
  department: <Landmark className="w-5 h-5" />,
  office: <Building2 className="w-5 h-5" />,
  lab: <FlaskConical className="w-5 h-5" />,
  facility: <MapPin className="w-5 h-5" />,
  food: <Utensils className="w-5 h-5" />,
  sports: <Dumbbell className="w-5 h-5" />,
  entrance: <DoorOpen className="w-5 h-5" />,
  health: <Stethoscope className="w-5 h-5" />,
}

const typeColors: Record<string, string> = {
  department: 'bg-blue-500/20 text-blue-400',
  office: 'bg-purple-500/20 text-purple-400',
  lab: 'bg-cyan-500/20 text-cyan-400',
  facility: 'bg-green-500/20 text-green-400',
  food: 'bg-orange-500/20 text-orange-400',
  sports: 'bg-yellow-500/20 text-yellow-400',
  entrance: 'bg-pink-500/20 text-pink-400',
  health: 'bg-red-500/20 text-red-400',
}

export default function SearchPanel({ isOpen, onClose, pois, onSelectPOI }: SearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string | null>(null)

  // Get unique types
  const types = useMemo(() => {
    const typeSet = new Set(pois.map(p => p.Type.toLowerCase()))
    return Array.from(typeSet)
  }, [pois])

  // Filter POIs
  const filteredPOIs = useMemo(() => {
    return pois.filter(poi => {
      const matchesSearch = searchQuery === '' || 
        poi.BuildingName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        poi.Description?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesType = !selectedType || poi.Type.toLowerCase() === selectedType

      return matchesSearch && matchesType
    })
  }, [pois, searchQuery, selectedType])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[2000] flex flex-col bg-dark-900/95 backdrop-blur-lg slide-up pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* Header */}
      <div className="sticky top-0 z-10 p-3 sm:p-4 border-b border-white/10 bg-dark-900/95">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-lg sm:text-xl font-display font-bold text-white">Find Destination</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search buildings, offices, facilities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10 sm:pl-12 py-2.5 sm:py-3 text-sm sm:text-base"
            autoFocus
          />
        </div>

        {/* Type filters */}
        <div className="flex gap-2 mt-3 sm:mt-4 overflow-x-auto pb-2 -mx-3 sm:-mx-4 px-3 sm:px-4">
          <button
            onClick={() => setSelectedType(null)}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
              !selectedType 
                ? 'bg-primary-500 text-white' 
                : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
          >
            All
          </button>
          {types.map(type => (
            <button
              key={type}
              onClick={() => setSelectedType(type === selectedType ? null : type)}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all capitalize flex items-center gap-1.5 sm:gap-2 ${
                selectedType === type
                  ? 'bg-primary-500 text-white'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              {typeIcons[type] || <MapPin className="w-4 h-4" />}
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 pb-6 sm:pb-8">
        {filteredPOIs.length === 0 ? (
          <div className="text-center py-10 sm:py-12">
            <MapPin className="w-10 h-10 sm:w-12 sm:h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No locations found</p>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">Try a different search term</p>
          </div>
        ) : (
          <div className="space-y-2.5 sm:space-y-3">
            {filteredPOIs.map(poi => (
              <button
                key={poi.POIId}
                onClick={() => onSelectPOI(poi)}
                className="w-full p-3 sm:p-4 bg-white/5 hover:bg-white/10 rounded-xl text-left transition-all group"
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${typeColors[poi.Type.toLowerCase()] || 'bg-slate-500/20 text-slate-400'}`}>
                    {typeIcons[poi.Type.toLowerCase()] || <MapPin className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm sm:text-base text-white group-hover:text-primary-400 transition-colors">
                      {poi.BuildingName}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1 line-clamp-2">
                      {poi.Description}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${typeColors[poi.Type.toLowerCase()] || 'bg-slate-500/20 text-slate-400'}`}>
                        {poi.Type}
                      </span>
                      {poi.Floor && (
                        <span className="text-xs text-slate-500">
                          Floor {poi.Floor}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-slate-600 group-hover:text-primary-400 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

