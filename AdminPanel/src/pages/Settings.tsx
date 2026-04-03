import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { User, Key, Server, MapPin, Save, AlertCircle } from 'lucide-react'

export default function Settings() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // Profile settings
  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || ''
  })

  // Password settings
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  })

  // API settings
  const [apiSettings, setApiSettings] = useState({
    baseUrl: 'http://localhost:3000/api',
    timeout: '30'
  })

  // Campus settings (Administrative Building as default center)
  const [campusSettings, setCampusSettings] = useState({
    centerLat: '6.051607934623702',
    centerLng: '121.01233231292177',
    name: 'Sulu State College'
  })

  const handleSaveProfile = async () => {
    setIsSaving(true)
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000))
    setMessage({ type: 'success', text: 'Profile updated successfully!' })
    setIsSaving(false)
  }

  const handleChangePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      setMessage({ type: 'error', text: 'Passwords do not match!' })
      return
    }
    if (passwords.new.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters!' })
      return
    }
    
    setIsSaving(true)
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000))
    setMessage({ type: 'success', text: 'Password changed successfully!' })
    setPasswords({ current: '', new: '', confirm: '' })
    setIsSaving(false)
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Key },
    { id: 'api', label: 'API Config', icon: Server },
    { id: 'campus', label: 'Campus', icon: MapPin }
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">Manage your account and system configuration</p>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
          message.type === 'success' 
            ? 'bg-green-500/10 border border-green-500/20 text-green-400' 
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>
          <AlertCircle className="w-4 h-4" />
          <span>{message.text}</span>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tabs */}
        <div className="lg:w-48 flex lg:flex-col gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                setMessage({ type: '', text: '' })
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary-600/20 text-primary-400 border-l-2 border-primary-500'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="card">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 pb-6 border-b border-slate-700">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-2xl font-bold text-white">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">{user?.name}</h2>
                    <p className="text-slate-400">{user?.role}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="label">Full Name</label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Email Address</label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="btn-primary flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-white">Change Password</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="label">Current Password</label>
                    <input
                      type="password"
                      value={passwords.current}
                      onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">New Password</label>
                    <input
                      type="password"
                      value={passwords.new}
                      onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Confirm New Password</label>
                    <input
                      type="password"
                      value={passwords.confirm}
                      onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleChangePassword}
                  disabled={isSaving}
                  className="btn-primary flex items-center gap-2"
                >
                  <Key className="w-4 h-4" />
                  {isSaving ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            )}

            {/* API Config Tab */}
            {activeTab === 'api' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-white">API Configuration</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="label">API Base URL</label>
                    <input
                      type="text"
                      value={apiSettings.baseUrl}
                      onChange={(e) => setApiSettings({ ...apiSettings, baseUrl: e.target.value })}
                      className="input font-mono"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      The base URL for API requests from the mobile app
                    </p>
                  </div>
                  <div>
                    <label className="label">Request Timeout (seconds)</label>
                    <input
                      type="number"
                      value={apiSettings.timeout}
                      onChange={(e) => setApiSettings({ ...apiSettings, timeout: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>

                <button className="btn-primary flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Save Configuration
                </button>
              </div>
            )}

            {/* Campus Tab */}
            {activeTab === 'campus' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-white">Campus Configuration</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="label">Campus Name</label>
                    <input
                      type="text"
                      value={campusSettings.name}
                      onChange={(e) => setCampusSettings({ ...campusSettings, name: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Center Latitude</label>
                      <input
                        type="text"
                        value={campusSettings.centerLat}
                        onChange={(e) => setCampusSettings({ ...campusSettings, centerLat: e.target.value })}
                        className="input font-mono"
                      />
                    </div>
                    <div>
                      <label className="label">Center Longitude</label>
                      <input
                        type="text"
                        value={campusSettings.centerLng}
                        onChange={(e) => setCampusSettings({ ...campusSettings, centerLng: e.target.value })}
                        className="input font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-900/50 rounded-lg">
                  <p className="text-sm text-slate-400">
                    The campus center coordinates are used as the reference point for GPS-to-Unity coordinate conversion in the AR navigation system.
                  </p>
                </div>

                <button className="btn-primary flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Save Configuration
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

