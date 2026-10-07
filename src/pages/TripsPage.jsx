import React from 'react'
import { Compass, Plus, Key } from 'lucide-react'

export const TripsPage = () => {
  return (
    <div className="pb-safe max-w-md mx-auto px-4 py-4 space-y-5">
      <div className="flex items-center space-x-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
        <div className="p-3 bg-emerald-950 rounded-xl text-emerald-400 border border-emerald-800">
          <Compass className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Trips & Groups</h2>
          <p className="text-xs text-slate-400">Join a tour using a 6-digit trip code</p>
        </div>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Join a Trip</h3>
        <div className="space-y-3">
          <div className="relative">
            <Key className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              maxLength={6}
              placeholder="ENTER 6-DIGIT CODE"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-3 text-sm text-white font-mono uppercase tracking-widest focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            onClick={() => alert('Trip joining configured in Stage 2')}
            className="w-full bg-emerald-900 hover:bg-emerald-800 text-emerald-100 font-semibold py-3 rounded-xl border border-emerald-700/60 transition-all text-sm"
          >
            Join Trip Group
          </button>
        </div>
      </div>
    </div>
  )
}
