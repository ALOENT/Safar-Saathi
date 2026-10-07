import React from 'react'
import { useAuth } from '../context/AuthContext'
import { Building2, AlertTriangle, ShieldCheck, Radio, Eye } from 'lucide-react'

export const AuthorityHome = () => {
  const { profile } = useAuth()

  return (
    <div className="pb-safe max-w-md mx-auto px-4 py-4 space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-br from-red-950 via-slate-900 to-slate-900 rounded-2xl p-5 border border-red-800/40 shadow-xl space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-red-400">Emergency Control Desk</span>
            <h2 className="text-xl font-extrabold text-white">Authority Dashboard 🛡️</h2>
            <p className="text-xs text-slate-300 mt-0.5">Officer: {profile?.name || 'Authorized Personnel'}</p>
          </div>
          <div className="p-2 bg-red-950/80 rounded-xl border border-red-700/50">
            <Building2 className="w-6 h-6 text-red-400" />
          </div>
        </div>

        <div className="inline-flex items-center space-x-2 bg-slate-950/90 px-3 py-1.5 rounded-full border border-red-600/40 text-xs text-red-300">
          <Radio className="w-3.5 h-3.5 text-red-400 animate-pulse" />
          <span>Realtime Emergency Radar: Standby</span>
        </div>
      </div>

      {/* Emergency Radar Summary */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200">Active SOS Alerts</h3>
          <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-md text-[10px] font-bold">
            0 ACTIVE
          </span>
        </div>

        <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 text-center space-y-2">
          <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto" />
          <p className="text-xs text-slate-300 font-medium">All monitored zones clear</p>
          <p className="text-[10px] text-slate-500">Realtime SOS broadcasts from travelers will populate here instantly.</p>
        </div>
      </div>
    </div>
  )
}
