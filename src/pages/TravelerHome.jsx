import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTrip } from '../context/TripContext'
import { Shield, AlertTriangle, Compass, MapPin, Copy, Check, Users, UserCheck } from 'lucide-react'

export const TravelerHome = () => {
  const { profile } = useAuth()
  const { currentTrip, isSolo } = useTrip()
  const navigate = useNavigate()
  const [copied, setCopied] = React.useState(false)

  const handleCopyCode = () => {
    if (!currentTrip?.code) return
    navigator.clipboard.writeText(currentTrip.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="pb-safe max-w-md mx-auto px-4 py-4 space-y-5">
      {/* Welcome Header */}
      <div className="bg-gradient-to-br from-emerald-900 to-emerald-950 rounded-2xl p-5 border border-emerald-800/80 shadow-xl space-y-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex justify-between items-start">
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-400">Traveler Dashboard</span>
            <h2 className="text-xl font-extrabold text-white">Namaste, {profile?.name || 'Traveler'} 👋</h2>
            <p className="text-xs text-emerald-200/80 mt-0.5">Your safety connection is Active</p>
          </div>
          <div className="p-2 bg-emerald-900/80 rounded-xl border border-emerald-700/50">
            <Shield className="w-6 h-6 text-emerald-400" />
          </div>
        </div>

        {/* Status Indicator */}
        <div className="inline-flex items-center space-x-2 bg-emerald-950/90 px-3 py-1.5 rounded-full border border-emerald-600/40 text-xs text-emerald-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Status: Safe & Monitored</span>
        </div>
      </div>

      {/* Active Trip / Solo Banner */}
      {currentTrip ? (
        <div className="bg-slate-900/90 border border-emerald-800/60 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-emerald-400">Active Group</span>
            <h3 className="text-sm font-bold text-white">{currentTrip.name}</h3>
            <span className="text-[11px] font-mono text-emerald-300 font-bold block">
              Code: {currentTrip.code}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyCode}
              className="p-2 bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 rounded-xl text-xs font-semibold flex items-center space-x-1"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={() => navigate('/trips')}
              className="px-3 py-2 bg-emerald-900 text-emerald-100 rounded-xl text-xs font-semibold border border-emerald-700/60"
            >
              View Trip
            </button>
          </div>
        </div>
      ) : isSolo ? (
        <div className="bg-slate-900/90 border border-blue-900/50 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-950 text-blue-400 rounded-xl border border-blue-800">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Solo Traveler Mode</h3>
              <p className="text-[10px] text-slate-400">SOS and Geofence tracking active</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/trips')}
            className="px-3 py-1.5 bg-blue-950 text-blue-300 border border-blue-800 rounded-xl text-xs font-semibold"
          >
            Join Group
          </button>
        </div>
      ) : (
        <div className="bg-slate-900/90 border border-amber-900/40 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <h3 className="text-xs font-bold text-white">No Active Tour Group</h3>
            <p className="text-[10px] text-slate-400">Join with a 6-digit code or travel Solo</p>
          </div>
          <button
            onClick={() => navigate('/trips')}
            className="px-3.5 py-2 bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs shadow-md"
          >
            Join Trip
          </button>
        </div>
      )}

      {/* SOS Quick Trigger Box */}
      <div className="bg-slate-900/90 border border-red-900/50 rounded-2xl p-5 text-center space-y-3 shadow-lg">
        <div className="inline-flex p-3 bg-red-950/80 rounded-full border border-red-800/50">
          <AlertTriangle className="w-8 h-8 text-red-500 animate-bounce" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Emergency SOS Alert</h3>
          <p className="text-xs text-slate-400 mt-0.5">Press to trigger instant location alert to Guide & Authorities</p>
        </div>
        <button
          onClick={() => alert('SOS Alert Triggered! (Full realtime broadcast enabled in Stage 4)')}
          className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-xl shadow-red-950/80 active:scale-95 transition-all text-sm uppercase tracking-wider flex items-center justify-center space-x-2"
        >
          <AlertTriangle className="w-5 h-5" />
          <span>TRIGGER SOS EMERGENCY</span>
        </button>
      </div>

      {/* Quick Action Grid */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/trips')}
          className="bg-slate-900/80 hover:bg-slate-850 border border-slate-800 rounded-2xl p-4 flex flex-col items-center text-center space-y-2 transition-all"
        >
          <div className="p-2.5 bg-emerald-950 rounded-xl text-emerald-400 border border-emerald-900">
            <Compass className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-200">My Trip</span>
          <span className="text-[10px] text-slate-400">View code & members</span>
        </button>

        <button
          onClick={() => navigate('/map')}
          className="bg-slate-900/80 hover:bg-slate-850 border border-slate-800 rounded-2xl p-4 flex flex-col items-center text-center space-y-2 transition-all"
        >
          <div className="p-2.5 bg-emerald-950 rounded-xl text-emerald-400 border border-emerald-900">
            <MapPin className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-200">Live Map</span>
          <span className="text-[10px] text-slate-400">View safety zone</span>
        </button>
      </div>
    </div>
  )
}
