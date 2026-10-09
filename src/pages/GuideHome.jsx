import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTrip } from '../context/TripContext'
import { Compass, Users, MapPin, Plus, Shield, Copy, Check } from 'lucide-react'

export const GuideHome = () => {
  const { profile } = useAuth()
  const { currentTrip, members } = useTrip()
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

      {/* Guide Active Trip Card */}
      {currentTrip ? (
        <div className="bg-slate-900/80 border border-amber-800/50 rounded-2xl p-5 space-y-3 shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-400">Active Tour Group</span>
              <h3 className="text-base font-bold text-white">{currentTrip.name}</h3>
            </div>
            <button
              onClick={() => navigate('/group')}
              className="text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-700/60 px-3 py-1 rounded-xl"
            >
              Manage Group
            </button>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-amber-900/40 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block">Share 6-Digit Code</span>
              <span className="text-xl font-black text-amber-400 tracking-widest font-mono">
                {currentTrip.code}
              </span>
            </div>
            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 bg-amber-600 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1"
            >
              {copied ? <Check className="w-4 h-4 text-slate-950" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-200">Group Management</h3>

          <button
            onClick={() => navigate('/group')}
            className="w-full bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold py-3.5 px-4 rounded-xl shadow-lg flex items-center justify-center space-x-2 transition-all text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create New 6-Digit Trip Code</span>
          </button>
        </div>
      )}

      {/* Quick Info Grid */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/group')}
          className="bg-slate-900/80 hover:bg-slate-850 p-4 rounded-2xl border border-slate-800 text-center transition-all"
        >
          <Users className="w-6 h-6 text-amber-400 mx-auto mb-1.5" />
          <span className="text-xs font-semibold text-slate-200 block">Members</span>
          <span className="text-[10px] text-slate-400">{members.length} connected</span>
        </button>

        <button
          onClick={() => navigate('/map')}
          className="bg-slate-900/80 hover:bg-slate-850 p-4 rounded-2xl border border-slate-800 text-center transition-all"
        >
          <MapPin className="w-6 h-6 text-amber-400 mx-auto mb-1.5" />
          <span className="text-xs font-semibold text-slate-200 block">Live Tracking</span>
          <span className="text-[10px] text-slate-400">Map view</span>
        </button>
      </div>
    </div>
  )
}
