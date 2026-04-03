import { useEffect, useState } from 'react'
import { Building2, MapPin, Route, Users, TrendingUp, Activity } from 'lucide-react'
import { buildingsApi, poisApi, routesApi } from '../services/api'
import CampusMap from '../components/CampusMap'

interface Stats {
  buildings: number
  pois: number
  routes: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ buildings: 0, pois: 0, routes: 0 })
  const [recentPOIs, setRecentPOIs] = useState<any[]>([])
  const [allPOIs, setAllPOIs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [buildingsRes, poisRes, routesRes] = await Promise.all([
        buildingsApi.getAll(),
        poisApi.getAll(),
        routesApi.getAll()
      ])

      setStats({
        buildings: buildingsRes.data.length,
        pois: poisRes.data.length,
        routes: routesRes.data.length
      })

      setAllPOIs(poisRes.data)
      setRecentPOIs(poisRes.data.slice(0, 5))
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const statCards = [
    {
      title: 'Total Buildings',
      value: stats.buildings,
      icon: Building2,
      color: 'from-blue-500 to-blue-700',
      shadowColor: 'shadow-blue-500/25'
    },
    {
      title: 'Points of Interest',
      value: stats.pois,
      icon: MapPin,
      color: 'from-primary-500 to-primary-700',
      shadowColor: 'shadow-primary-500/25'
    },
    {
      title: 'Navigation Routes',
      value: stats.routes,
      icon: Route,
      color: 'from-accent-500 to-accent-700',
      shadowColor: 'shadow-accent-500/25'
    },
    {
      title: 'Active Users',
      value: '—',
      icon: Users,
      color: 'from-purple-500 to-purple-700',
      shadowColor: 'shadow-purple-500/25',
      subtitle: 'Coming soon'
    }
  ]

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
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">Overview of your campus navigation system</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <div 
            key={stat.title}
            className="card hover:scale-[1.02] transition-transform duration-200"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-400">{stat.title}</p>
                <p className="text-3xl font-display font-bold text-white mt-1">
                  {stat.value}
                </p>
                {stat.subtitle && (
                  <p className="text-xs text-slate-500 mt-1">{stat.subtitle}</p>
                )}
              </div>
              <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center shadow-lg ${stat.shadowColor}`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent POIs */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-semibold text-white">Recent POIs</h2>
            <Activity className="w-5 h-5 text-slate-500" />
          </div>
          
          {recentPOIs.length > 0 ? (
            <div className="space-y-3">
              {recentPOIs.map((poi) => (
                <div 
                  key={poi.POIId}
                  className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg hover:bg-slate-800/50 transition-colors"
                >
                  <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {poi.BuildingName}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {poi.Type} • {poi.Latitude.toFixed(4)}, {poi.Longitude.toFixed(4)}
                    </p>
                  </div>
                  <span className="badge-info">{poi.Type}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">No POIs found</p>
          )}
        </div>

        {/* Quick Stats */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-semibold text-white">System Status</h2>
            <TrendingUp className="w-5 h-5 text-slate-500" />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
              <span className="text-slate-400">API Server</span>
              <span className="badge-success">Online</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
              <span className="text-slate-400">Database</span>
              <span className="badge-success">Connected</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
              <span className="text-slate-400">GPS Service</span>
              <span className="badge-info">Standby</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
              <span className="text-slate-400">AR Module</span>
              <span className="badge-warning">Mobile Only</span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-primary-500/10 border border-primary-500/20 rounded-lg">
            <p className="text-sm text-primary-400">
              <strong>Tip:</strong> Use the mobile app to test AR navigation features on campus.
            </p>
          </div>
        </div>
      </div>

      {/* Campus Map - centered on Administrative Building */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-semibold text-white">Campus Overview</h2>
        </div>
        <CampusMap pois={allPOIs} height="20rem" className="rounded-lg overflow-hidden border border-slate-700/50" />
        <p className="text-xs text-slate-500 mt-2">
          Sulu State College • Administrative Building: 6.0516°N, 121.0123°E • Switch layers via map control
        </p>
      </div>
    </div>
  )
}

