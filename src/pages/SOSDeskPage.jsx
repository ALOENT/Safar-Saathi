import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSOS } from '../context/SOSContext'
import {
  AlertTriangle,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  Clock,
  Phone,
  Radio,
} from 'lucide-react'

export const SOSDeskPage = () => {
  const { profile } = useAuth()
  const { alerts, resolveAlert } = useSOS()
  const navigate = useNavigate()

  const role = profile?.role
  const isGuide = role === 'guide'

  const activeAlerts = alerts.filter((a) => a.status === 'active' || a.status === 'acknowledged')

  const handleViewOnMap = (alert) => {
    if (alert.lat && alert.lng) {
      const name = alert.profiles?.name || 'Traveler'
      navigate(`/map?sos_lat=${alert.lat}&sos_lng=${alert.lng}&sos_name=${encodeURIComponent(name)}`)
    }
  }

  const handleResolve = async (alertId) => {
    await resolveAlert(alertId)
  }

  const formatTime = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    const now = new Date()
    if (d.toDateString() === now.toDateString()) return 'Today'
    return d.toLocaleDateString([], { day: 'numeric', month: 'short' })
  }

  return (
    <div className="pb-safe max-w-md mx-auto px-4 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-3 bg-gradient-to-r from-red-950 to-slate-900 border border-red-800/50 p-4 rounded-2xl shadow-lg">
        <div className="p-2.5 bg-red-950/80 rounded-xl text-red-400 border border-red-700/50">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-bold text-white">
            {isGuide ? 'SOS Emergency Desk' : 'Emergency Alert Center'}
          </h2>
          <p className="text-xs text-slate-400">
            {isGuide ? 'Realtime alerts from your group' : 'All active traveler emergencies'}
          </p>
        </div>
        <div className="flex items-center space-x-1.5 bg-slate-950 border border-red-800/40 px-2.5 py-1 rounded-full">
          <Radio className="w-3 h-3 text-red-400 animate-pulse" />
          <span className="text-[10px] font-bold text-red-300">LIVE</span>
        </div>
      </div>

      {/* Alert count badge */}
      <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2.5">
        <span className="text-xs font-semibold text-slate-300">Active Emergencies</span>
        <span
          className={`text-xs font-black px-2.5 py-0.5 rounded-md border ${
            activeAlerts.length > 0
              ? 'bg-red-950 text-red-400 border-red-700 animate-pulse'
              : 'bg-emerald-950 text-emerald-400 border-emerald-800'
          }`}
        >
          {activeAlerts.length} {activeAlerts.length === 1 ? 'ALERT' : 'ALERTS'}
        </span>
      </div>

      {/* Alerts list */}
      {activeAlerts.length === 0 ? (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 text-center space-y-3">
          <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
          <div>
            <h3 className="text-sm font-bold text-white">All Clear</h3>
            <p className="text-xs text-slate-400 mt-1">
              No active SOS emergencies. New alerts will appear here instantly via realtime broadcast.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {activeAlerts.map((alert) => {
            const personName = alert.profiles?.name || 'Unknown Traveler'
            const personPhone = alert.profiles?.phone || null
            const hasLocation = alert.lat && alert.lng

            return (
              <div
                key={alert.id}
                className="bg-slate-900/90 border border-red-900/60 rounded-2xl p-4 space-y-3 shadow-lg relative overflow-hidden"
              >
                {/* Red glow accent */}
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-red-500 to-red-800 rounded-l-2xl"></div>

                {/* Alert header */}
                <div className="flex items-start justify-between pl-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="bg-red-950 text-red-400 border border-red-700/60 px-2 py-0.5 rounded-md text-[9px] font-black uppercase">
                        SOS
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(alert.created_at)} {formatTime(alert.created_at)}</span>
                      </span>
                    </div>
                    <h3 className="text-sm font-extrabold text-white">{personName}</h3>
                    {personPhone && (
                      <p className="text-[11px] text-slate-400 flex items-center space-x-1">
                        <Phone className="w-3 h-3" />
                        <span>{personPhone}</span>
                      </p>
                    )}
                  </div>

                  {/* Pulsing emergency indicator */}
                  <div className="p-2 bg-red-950/80 rounded-xl border border-red-800/50">
                    <AlertTriangle className="w-5 h-5 text-red-500 animate-bounce" />
                  </div>
                </div>

                {/* Location info */}
                {hasLocation && (
                  <div className="bg-slate-950/80 rounded-xl px-3 py-2 flex items-center space-x-2 border border-slate-800 ml-2">
                    <MapPin className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                    <span className="text-[11px] text-slate-300 font-mono">
                      {alert.lat.toFixed(5)}, {alert.lng.toFixed(5)}
                    </span>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex space-x-2 pl-2">
                  {hasLocation && (
                    <button
                      onClick={() => handleViewOnMap(alert)}
                      className="flex-1 bg-white/10 hover:bg-white/15 text-white font-semibold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 border border-slate-700 active:scale-95 transition-all"
                    >
                      <MapPin className="w-4 h-4 text-red-400" />
                      <span>View on Map</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleResolve(alert.id)}
                    className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 active:scale-95 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Mark Resolved</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
