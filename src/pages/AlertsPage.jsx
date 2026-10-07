import React from 'react'
import { Bell, ShieldAlert, CheckCircle2 } from 'lucide-react'

export const AlertsPage = () => {
  return (
    <div className="pb-safe max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center space-x-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
        <div className="p-2.5 bg-emerald-950 rounded-xl text-emerald-400 border border-emerald-800">
          <Bell className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white">Emergency Alerts & Broadcasts</h2>
          <p className="text-xs text-slate-400">Realtime SOS & weather advisories</p>
        </div>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 text-center space-y-3">
        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
        <div>
          <h3 className="text-sm font-bold text-white">No Active Emergency Alerts</h3>
          <p className="text-xs text-slate-400 mt-1">
            Realtime Supabase broadcasts will stream incoming SOS alerts & weather warnings here.
          </p>
        </div>
      </div>
    </div>
  )
}
