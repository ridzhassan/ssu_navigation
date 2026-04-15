import { useEffect, useState } from 'react'
import { MapPin, Plus, Pencil, Trash2, Search, X, Filter } from 'lucide-react'
import { poisApi, buildingsApi } from '../services/api'

interface POI {
  POIId: number
  BuildingName: string
  Latitude: number
  Longitude: number
  Type: string
  Description: string
  ImageUrl?: string
  BuildingId?: number
  Floor?: string
  Tags?: string[]
  AREnabled?: number
  ARLabel?: string
  AnchorHeight?: number
  IconScale?: number
  MinVisibleDistance?: number
  MaxVisibleDistance?: number
}

interface Building {
  id: number
  name: string
}

export default function POIs() {
  const [pois, setPOIs] = useState<POI[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingPOI, setEditingPOI] = useState<POI | null>(null)
  const [formData, setFormData] = useState({
    buildingName: '',
    latitude: '',
    longitude: '',
    type: 'department',
    description: '',
    buildingId: '',
    floor: '',
    tags: '',
    arEnabled: true,
    arLabel: '',
    anchorHeight: '1.6',
    iconScale: '1',
    minVisibleDistance: '3',
    maxVisibleDistance: '300'
  })

  const poiTypes = [
    'department', 'office', 'lab', 'facility', 'food', 
    'sports', 'health', 'entrance', 'academic'
  ]

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [poisRes, buildingsRes] = await Promise.all([
        poisApi.getAll(),
        buildingsApi.getAll()
      ])
      setPOIs(poisRes.data)
      setBuildings(buildingsRes.data)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredPOIs = pois.filter(poi => {
    const matchesSearch = 
      poi.BuildingName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      poi.Description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = !filterType || poi.Type === filterType
    return matchesSearch && matchesType
  })

  const uniqueTypes = [...new Set(pois.map(p => p.Type))]

  const openModal = (poi?: POI) => {
    if (poi) {
      setEditingPOI(poi)
      setFormData({
        buildingName: poi.BuildingName,
        latitude: poi.Latitude.toString(),
        longitude: poi.Longitude.toString(),
        type: poi.Type,
        description: poi.Description || '',
        buildingId: poi.BuildingId?.toString() || '',
        floor: poi.Floor || '',
        tags: poi.Tags?.join(', ') || '',
        arEnabled: (poi.AREnabled ?? 1) === 1,
        arLabel: poi.ARLabel || '',
        anchorHeight: (poi.AnchorHeight ?? 1.6).toString(),
        iconScale: (poi.IconScale ?? 1).toString(),
        minVisibleDistance: (poi.MinVisibleDistance ?? 3).toString(),
        maxVisibleDistance: (poi.MaxVisibleDistance ?? 300).toString()
      })
    } else {
      setEditingPOI(null)
      setFormData({
        buildingName: '',
        latitude: '',
        longitude: '',
        type: 'department',
        description: '',
        buildingId: '',
        floor: '',
        tags: '',
        arEnabled: true,
        arLabel: '',
        anchorHeight: '1.6',
        iconScale: '1',
        minVisibleDistance: '3',
        maxVisibleDistance: '300'
      })
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingPOI(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const data = {
      buildingName: formData.buildingName,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      type: formData.type,
      description: formData.description,
      buildingId: formData.buildingId ? parseInt(formData.buildingId) : undefined,
      floor: formData.floor || undefined,
      tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
      arEnabled: formData.arEnabled,
      arLabel: formData.arLabel || undefined,
      anchorHeight: parseFloat(formData.anchorHeight),
      iconScale: parseFloat(formData.iconScale),
      minVisibleDistance: parseFloat(formData.minVisibleDistance),
      maxVisibleDistance: parseFloat(formData.maxVisibleDistance)
    }

    try {
      if (editingPOI) {
        await poisApi.update(editingPOI.POIId, data)
      } else {
        await poisApi.create(data)
      }
      closeModal()
      loadData()
    } catch (error) {
      console.error('Failed to save POI:', error)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this POI?')) return
    
    try {
      await poisApi.delete(id)
      loadData()
    } catch (error) {
      console.error('Failed to delete POI:', error)
    }
  }

  const typeColors: Record<string, string> = {
    department: 'badge-info',
    office: 'badge-warning',
    lab: 'bg-purple-500/20 text-purple-400',
    facility: 'badge-success',
    food: 'bg-orange-500/20 text-orange-400',
    sports: 'bg-red-500/20 text-red-400',
    health: 'bg-pink-500/20 text-pink-400',
    entrance: 'bg-cyan-500/20 text-cyan-400',
    academic: 'badge-info'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Points of Interest</h1>
          <p className="text-slate-400 mt-1">Manage campus locations and destinations</p>
        </div>
        <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add POI
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search POIs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="relative sm:w-48">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="input pl-10 appearance-none"
          >
            <option value="">All Types</option>
            {uniqueTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPOIs.map((poi) => (
          <div key={poi.POIId} className="card hover:border-primary-500/50 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary-400" />
              </div>
              <span className={`badge ${typeColors[poi.Type] || 'badge-info'}`}>
                {poi.Type}
              </span>
            </div>
            
            <h3 className="font-medium text-white mb-1">{poi.BuildingName}</h3>
            <p className="text-sm text-slate-400 mb-3 line-clamp-2">
              {poi.Description || 'No description'}
            </p>
            
            <div className="text-xs text-slate-500 space-y-1 mb-4">
              <p className="font-mono">
                {poi.Latitude.toFixed(5)}, {poi.Longitude.toFixed(5)}
              </p>
              {poi.Floor && <p>Floor: {poi.Floor}</p>}
              <p>AR: {(poi.AREnabled ?? 1) === 1 ? 'Enabled' : 'Disabled'}</p>
            </div>

            {poi.Tags && poi.Tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {poi.Tags.slice(0, 3).map((tag, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 bg-slate-700 rounded text-slate-400">
                    {tag}
                  </span>
                ))}
                {poi.Tags.length > 3 && (
                  <span className="text-xs text-slate-500">+{poi.Tags.length - 3}</span>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-3 border-t border-slate-700">
              <button
                onClick={() => openModal(poi)}
                className="flex-1 btn-secondary flex items-center justify-center gap-2 py-2"
              >
                <Pencil className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => handleDelete(poi.POIId)}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredPOIs.length === 0 && (
        <div className="card text-center py-12">
          <MapPin className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500">No POIs found</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-bold text-white">
                {editingPOI ? 'Edit POI' : 'Add POI'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Name</label>
                <input
                  type="text"
                  value={formData.buildingName}
                  onChange={(e) => setFormData({ ...formData, buildingName: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="input"
                  >
                    {poiTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Floor</label>
                  <input
                    type="text"
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                    className="input"
                    placeholder="e.g., Ground, 2nd Floor"
                  />
                </div>
              </div>

              <div>
                <label className="label">Parent Building (Optional)</label>
                <select
                  value={formData.buildingId}
                  onChange={(e) => setFormData({ ...formData, buildingId: e.target.value })}
                  className="input"
                >
                  <option value="">None</option>
                  {buildings.map(building => (
                    <option key={building.id} value={building.id}>{building.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input min-h-[80px]"
                  rows={3}
                />
              </div>

              <div>
                <label className="label">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="input"
                  placeholder="IT, Computer Science, Lab"
                />
              </div>

              <div className="rounded-lg border border-slate-700/70 p-4 space-y-4">
                <p className="text-sm font-medium text-slate-200">AR Configuration</p>

                <label className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-300">Enable in AR mode</span>
                  <input
                    type="checkbox"
                    checked={formData.arEnabled}
                    onChange={(e) => setFormData({ ...formData, arEnabled: e.target.checked })}
                    className="h-4 w-4 accent-primary-500"
                  />
                </label>

                <div>
                  <label className="label">AR Label (Optional)</label>
                  <input
                    type="text"
                    value={formData.arLabel}
                    onChange={(e) => setFormData({ ...formData, arLabel: e.target.value })}
                    className="input"
                    placeholder="Custom AR label"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Anchor Height (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.anchorHeight}
                      onChange={(e) => setFormData({ ...formData, anchorHeight: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Icon Scale</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={formData.iconScale}
                      onChange={(e) => setFormData({ ...formData, iconScale: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Min Visible Distance (m)</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={formData.minVisibleDistance}
                      onChange={(e) => setFormData({ ...formData, minVisibleDistance: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Max Visible Distance (m)</label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={formData.maxVisibleDistance}
                      onChange={(e) => setFormData({ ...formData, maxVisibleDistance: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingPOI ? 'Save Changes' : 'Add POI'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

