import { useEffect, useState } from 'react'
import { Route, Plus, Pencil, Trash2, Navigation, Clock, Footprints } from 'lucide-react'
import { routesApi } from '../services/api'

interface RouteData {
  id: number
  name: string
  description?: string
  totalDistance: number
  estimatedTime: number
  isAccessible: boolean
  waypoints: {
    latitude: number
    longitude: number
    order: number
    description?: string
  }[]
}

export default function Routes_Page() {
  const [routes, setRoutes] = useState<RouteData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadRoutes()
  }, [])

  const loadRoutes = async () => {
    try {
      const response = await routesApi.getAll()
      setRoutes(response.data)
    } catch (error) {
      console.error('Failed to load routes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this route?')) return
    
    try {
      await routesApi.delete(id)
      loadRoutes()
    } catch (error) {
      console.error('Failed to delete route:', error)
    }
  }

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`
    }
    return `${Math.round(meters)} m`
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
          <h1 className="text-2xl font-display font-bold text-white">Navigation Routes</h1>
          <p className="text-slate-400 mt-1">Predefined paths between campus locations</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Route
        </button>
      </div>

      {/* Routes Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {routes.map((route) => (
          <div key={route.id} className="card">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
                  <Navigation className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-white">{route.name}</h3>
                  <p className="text-sm text-slate-400">
                    {route.waypoints?.length || 0} waypoints
                  </p>
                </div>
              </div>
              {route.isAccessible && (
                <span className="badge-success">Accessible</span>
              )}
            </div>

            <p className="text-sm text-slate-400 mb-4">
              {route.description || 'No description'}
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-900/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Footprints className="w-4 h-4" />
                  <span className="text-xs">Distance</span>
                </div>
                <p className="text-lg font-semibold text-white">
                  {formatDistance(route.totalDistance)}
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs">Est. Time</span>
                </div>
                <p className="text-lg font-semibold text-white">
                  {route.estimatedTime} min
                </p>
              </div>
            </div>

            {/* Waypoints Preview */}
            {route.waypoints && route.waypoints.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-slate-500 mb-2">Route Path:</p>
                <div className="flex items-center gap-1 flex-wrap">
                  {route.waypoints.slice(0, 4).map((_, index) => (
                    <div key={index} className="flex items-center">
                      <span className="w-6 h-6 bg-primary-500/20 rounded-full flex items-center justify-center text-xs text-primary-400">
                        {index + 1}
                      </span>
                      {index < Math.min(route.waypoints.length - 1, 3) && (
                        <div className="w-4 h-0.5 bg-slate-700" />
                      )}
                    </div>
                  ))}
                  {route.waypoints.length > 4 && (
                    <span className="text-xs text-slate-500 ml-1">
                      +{route.waypoints.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t border-slate-700">
              <button className="flex-1 btn-secondary flex items-center justify-center gap-2 py-2">
                <Pencil className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => handleDelete(route.id)}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {routes.length === 0 && (
        <div className="card text-center py-12">
          <Route className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 mb-4">No routes defined yet</p>
          <button className="btn-primary">Create Your First Route</button>
        </div>
      )}

      {/* Info Card */}
      <div className="card bg-primary-500/5 border-primary-500/20">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Navigation className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h3 className="font-medium text-white mb-1">About Routes</h3>
            <p className="text-sm text-slate-400">
              Routes are predefined navigation paths between campus locations. 
              Users can follow these routes in the AR app to navigate efficiently. 
              Each route consists of waypoints that guide users step by step.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

