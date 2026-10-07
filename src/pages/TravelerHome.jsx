import React from 'react'
import { useAuth } from '../context/AuthContext'
import { Shield, AlertTriangle, Compass, MapPin, Sun, CloudRain } from 'lucide-react'

export const TravelerHome = () => {
  const { profile } = useAuth()

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
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col items-center text-center space-y-2">
          <div className="p-2.5 bg-emerald-950 rounded-xl text-emerald-400 border border-emerald-900">
            <Compass className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-200">Active Trip</span>
          <span className="text-[10px] text-slate-400">Join or view trip</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col items-center text-center space-y-2">
          <div className="p-2.5 bg-emerald-950 rounded-xl text-emerald-400 border border-emerald-900">
            <MapPin className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-200">Live Map</span>
          <span className="text-[10px] text-slate-400">View safety zone</span>
        </div>
      </div>
    </div>
  )
}
