import React from 'react'
import { useAuth } from '../context/AuthContext'
import { Compass, Users, MapPin, Plus, Shield } from 'lucide-react'

export const GuideHome = () => {
  const { profile } = useAuth()

  return (
    <div className="pb-safe max-w-md mx-auto px-4 py-4 space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-950 to-slate-900 rounded-2xl p-5 border border-amber-800/40 shadow-xl space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-amber-400">Tour Guide Portal</span>
            <h2 className="text-xl font-extrabold text-white">Welcome, {profile?.name || 'Guide'} 🚩</h2>
            <p className="text-xs text-slate-300 mt-0.5">Manage groups & track traveler positions</p>
          </div>
          <div className="p-2 bg-amber-950/80 rounded-xl border border-amber-700/50">
            <Compass className="w-6 h-6 text-amber-400" />
          </div>
        </div>

        <div className="inline-flex items-center space-x-2 bg-slate-950/90 px-3 py-1.5 rounded-full border border-amber-600/40 text-xs text-amber-300">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          <span>Guide Console Active</span>
        </div>
      </div>

      {/* Guide Actions */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-200">Group Management</h3>
        
        <button
          onClick={() => alert('Create Trip functionality active in Stage 2')}
          className="w-full bg-emerald-900 hover:bg-emerald-800 text-emerald-100 font-semibold py-3 px-4 rounded-xl border border-emerald-700/60 flex items-center justify-center space-x-2 transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Create New 6-Digit Trip Code</span>
        </button>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
            <Users className="w-5 h-5 text-amber-400 mx-auto mb-1" />
            <span className="text-xs font-semibold text-slate-200 block">Members</span>
            <span className="text-[10px] text-slate-400">0 connected</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
            <MapPin className="w-5 h-5 text-amber-400 mx-auto mb-1" />
            <span className="text-xs font-semibold text-slate-200 block">Live Tracking</span>
            <span className="text-[10px] text-slate-400">0 active signals</span>
          </div>
        </div>
      </div>
    </div>
  )
}
