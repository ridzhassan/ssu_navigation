import { useEffect, useState } from 'react'
import { Building2, Plus, Pencil, Trash2, Search, X } from 'lucide-react'
import { buildingsApi } from '../services/api'

interface Building {
  id: number
  name: string
  description: string
  latitude: number
  longitude: number
  category: string
  floors: number
  imageUrl?: string
  facilities?: string[]
}

export default function Buildings() {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    latitude: '',
    longitude: '',
    category: 'academic',
    floors: '1',
    facilities: ''
  })

  useEffect(() => {
    loadBuildings()
  }, [])

  const loadBuildings = async () => {
    try {
      const response = await buildingsApi.getAll()
      setBuildings(response.data)
    } catch (error) {
      console.error('Failed to load buildings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredBuildings = buildings.filter(building =>
    building.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    building.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const openModal = (building?: Building) => {
    if (building) {
      setEditingBuilding(building)
      setFormData({
        name: building.name,
        description: building.description || '',
        latitude: building.latitude.toString(),
        longitude: building.longitude.toString(),
        category: building.category,
        floors: building.floors.toString(),
        facilities: building.facilities?.join(', ') || ''
      })
    } else {
      setEditingBuilding(null)
      setFormData({
        name: '',
        description: '',
        latitude: '',
        longitude: '',
        category: 'academic',
        floors: '1',
        facilities: ''
      })
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingBuilding(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const data = {
      name: formData.name,
      description: formData.description,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      category: formData.category,
      floors: parseInt(formData.floors),
      facilities: formData.facilities.split(',').map(f => f.trim()).filter(f => f)
    }

    try {
      if (editingBuilding) {
        await buildingsApi.update(editingBuilding.id, data)
      } else {
        await buildingsApi.create(data)
      }
      closeModal()
      loadBuildings()
    } catch (error) {
      console.error('Failed to save building:', error)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this building?')) return
    
    try {
      await buildingsApi.delete(id)
      loadBuildings()
    } catch (error) {
      console.error('Failed to delete building:', error)
    }
  }

  const categoryColors: Record<string, string> = {
    academic: 'badge-info',
    administrative: 'badge-warning',
    facility: 'badge-success',
    sports: 'bg-orange-500/20 text-orange-400',
    entrance: 'bg-purple-500/20 text-purple-400'
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
          <h1 className="text-2xl font-display font-bold text-white">Buildings</h1>
          <p className="text-slate-400 mt-1">Manage campus buildings and facilities</p>
        </div>
        <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Building
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
        <input
          type="text"
          placeholder="Search buildings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/50">
              <tr>
                <th className="table-header">Building</th>
                <th className="table-header">Category</th>
                <th className="table-header">Coordinates</th>
                <th className="table-header">Floors</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredBuildings.map((building) => (
                <tr key={building.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{building.name}</p>
                        <p className="text-xs text-slate-500 truncate max-w-xs">
                          {building.description || 'No description'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={`badge ${categoryColors[building.category] || 'badge-info'}`}>
                      {building.category}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className="font-mono text-xs">
                      {building.latitude.toFixed(5)}, {building.longitude.toFixed(5)}
                    </span>
                  </td>
                  <td className="table-cell">{building.floors}</td>
                  <td className="table-cell text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openModal(building)}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(building.id)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredBuildings.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500">No buildings found</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-bold text-white">
                {editingBuilding ? 'Edit Building' : 'Add Building'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Building Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  required
                />
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
                  <label className="label">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="input"
                  >
                    <option value="academic">Academic</option>
                    <option value="administrative">Administrative</option>
                    <option value="facility">Facility</option>
                    <option value="sports">Sports</option>
                    <option value="entrance">Entrance</option>
                  </select>
                </div>
                <div>
                  <label className="label">Floors</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.floors}
                    onChange={(e) => setFormData({ ...formData, floors: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="label">Facilities (comma-separated)</label>
                <input
                  type="text"
                  value={formData.facilities}
                  onChange={(e) => setFormData({ ...formData, facilities: e.target.value })}
                  className="input"
                  placeholder="WiFi, Air Conditioned, Computer Lab"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingBuilding ? 'Save Changes' : 'Add Building'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

