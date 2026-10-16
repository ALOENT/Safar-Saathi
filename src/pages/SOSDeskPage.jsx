import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSOS } from '../context/SOSContext'
import {
  AlertTriangle,
  ShieldCheck,
  MapPin,
  Clock,
  Phone,
  Radio,
  Hourglass,
  CheckCircle2,
} from 'lucide-react'

// ── Relative time helper ──────────────────────────────────────────────────────
const timeAgo = (iso) => {
  if (!iso) return ''
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 5) return 'just now'
  if (diff < 60) return `${diff}s ago`
  const m = Math.floor(diff / 60)
  if (m < 60) return `${m} min ago`
  return `${Math.floor(m / 60)} hr ago`
}

const formatTime = (dateStr) =>
  new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const formatDate = (dateStr) => {
  const d = new Date(dateStr)
  if (d.toDateString() === new Date().toDateString()) return 'Today'
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

export const SOSDeskPage = () => {
  const { profile } = useAuth()
  const { alerts, guideResolveAlert } = useSOS()
  const navigate = useNavigate()

  // Separate active vs waiting-for-authority
  const activeAlerts   = alerts.filter((a) => a.status === 'active' || a.status === 'acknowledged')
  const waitingAlerts  = alerts.filter((a) => a.status === 'guide_resolved')

  const handleViewOnMap = (alert) => {
    if (alert.lat && alert.lng) {
      const name = alert.profiles?.name || 'Traveler'
      navigate(`/map?sos_lat=${alert.lat}&sos_lng=${alert.lng}&sos_name=${encodeURIComponent(name)}`)
    }
  }

  const handleGuideResolve = async (alertId) => {
    await guideResolveAlert(alertId)
  }

  return (
    <div className="pb-28 max-w-md mx-auto px-4 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-3 bg-gradient-to-r from-red-950 to-slate-900 border border-red-800/50 p-4 rounded-2xl shadow-lg">
        <div className="p-2.5 bg-red-950/80 rounded-xl text-red-400 border border-red-700/50">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-bold text-white">SOS Emergency Desk</h2>
          <p className="text-xs text-slate-400">Realtime alerts from your group</p>
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

      {/* ── Active alerts list ─────────────────────────────────────────── */}
      {activeAlerts.length === 0 && waitingAlerts.length === 0 ? (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 text-center space-y-3">
          <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
          <div>
            <h3 className="text-sm font-bold text-white">All Clear</h3>
            <p className="text-xs text-slate-400 mt-1">
              No active SOS emergencies. New alerts will appear here instantly.
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
                {/* Red accent bar */}
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-red-500 to-red-800 rounded-l-2xl" />

                {/* Header */}
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

                  <div className="p-2 bg-red-950/80 rounded-xl border border-red-800/50">
                    <AlertTriangle className="w-5 h-5 text-red-500 animate-bounce" />
                  </div>
                </div>

                {/* Location */}
                {hasLocation && (
                  <div className="bg-slate-950/80 rounded-xl px-3 py-2 flex items-center space-x-2 border border-slate-800 ml-2">
                    <MapPin className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                    <span className="text-[11px] text-slate-300 font-mono">
                      {alert.lat.toFixed(5)}, {alert.lng.toFixed(5)}
                    </span>
                  </div>
                )}

                {/* Actions */}
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
                    onClick={() => handleGuideResolve(alert.id)}
                    className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 active:scale-95 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Traveler is safe</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Waiting for authority confirmation section ─────────────────── */}
      {waitingAlerts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2 px-1">
            <Hourglass className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
              Waiting for Authority Confirmation
            </span>
            <span className="text-[10px] bg-amber-950 text-amber-400 border border-amber-700 px-2 py-0.5 rounded-full font-bold">
              {waitingAlerts.length}
            </span>
          </div>

          {waitingAlerts.map((alert) => {
            const personName = alert.profiles?.name || 'Unknown Traveler'
            return (
              <div
                key={alert.id}
                className="bg-slate-900/70 border border-amber-800/30 rounded-2xl px-4 py-3 relative overflow-hidden flex items-center justify-between"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-500 to-amber-800 rounded-l-2xl" />
                <div className="pl-2 space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="bg-amber-950 text-amber-400 border border-amber-700/60 px-2 py-0.5 rounded-md text-[9px] font-black uppercase">
                      Guide Safe
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white">{personName}</p>
                  <p className="text-[11px] text-slate-400">
                    {alert.guide_resolved_at
                      ? `Marked safe ${timeAgo(alert.guide_resolved_at)}`
                      : 'Pending authority review'}
                  </p>
                </div>
                <Hourglass className="w-5 h-5 text-amber-400/60 shrink-0" />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
