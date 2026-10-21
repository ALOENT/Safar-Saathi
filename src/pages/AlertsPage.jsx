import React, { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSOS } from '../context/SOSContext'
import { useActiveTrip } from '../hooks/useActiveTrip'
import { SOSDeskPage } from './SOSDeskPage'
import { Bell, CheckCircle2, AlertTriangle, Clock, MapPin, CheckCircle } from 'lucide-react'

// ── Status helpers ──────────────────────────────────────────────────────────
const statusBadge = {
  active:         'bg-red-950 border-red-700 text-red-300',
  acknowledged:   'bg-amber-950 border-amber-700 text-amber-300',
  guide_resolved: 'bg-blue-950 border-blue-700 text-blue-300',
  resolved:       'bg-emerald-950 border-emerald-700 text-emerald-300',
}

const statusLabel = {
  active:         '🚨 Active',
  acknowledged:   '👁 Acknowledged',
  guide_resolved: '✅ Guide Resolved',
  resolved:       '✔ Resolved',
}

const AlertRow = ({ alert }) => {
  const alertTime = new Date(alert.created_at).toLocaleString([], {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  const st = alert.status || 'active'
  return (
    <div className={`bg-slate-900/80 border rounded-2xl p-4 space-y-2 ${st === 'active' ? 'border-red-900/60' : 'border-slate-800'}`}>
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${statusBadge[st] || 'bg-slate-800 border-slate-700 text-slate-300'}`}>
          {statusLabel[st] || st}
        </span>
        <span className="text-[10px] text-slate-500 flex items-center space-x-1">
          <Clock className="w-2.5 h-2.5" /><span>{alertTime}</span>
        </span>
      </div>
      {alert.lat && alert.lng && (
        <p className="text-[10px] text-slate-400 font-mono flex items-center space-x-1">
          <MapPin className="w-2.5 h-2.5" />
          <span>{alert.lat.toFixed(5)}, {alert.lng.toFixed(5)}</span>
        </p>
      )}
    </div>
  )
}

const GuideSosRow = ({ alert }) => {
  const personName = alert.profiles?.name || 'Unknown Traveler'
  const alertTime = new Date(alert.created_at).toLocaleString([], {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  const st = alert.status || 'active'
  return (
    <div className={`bg-slate-900/80 border rounded-2xl p-4 space-y-2 ${st === 'active' ? 'border-red-900/60' : 'border-slate-800'}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-white">{personName}</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${statusBadge[st] || 'bg-slate-800 border-slate-700 text-slate-300'}`}>
          {statusLabel[st] || st}
        </span>
      </div>
      <span className="text-[10px] text-slate-500 flex items-center space-x-1">
        <Clock className="w-2.5 h-2.5" /><span>{alertTime}</span>
      </span>
      {alert.lat && alert.lng && (
        <p className="text-[10px] text-slate-400 font-mono flex items-center space-x-1">
          <MapPin className="w-2.5 h-2.5" />
          <span>{alert.lat.toFixed(5)}, {alert.lng.toFixed(5)}</span>
        </p>
      )}
    </div>
  )
}

export const AlertsPage = () => {
  const { profile } = useAuth()
  const { isGuide } = useActiveTrip()
  const { alerts, fetchAlerts } = useSOS()

  // Authority always sees the full SOS desk
  if (profile?.role === 'authority') {
    return <SOSDeskPage />
  }

  // Split: my own alerts vs. alerts from the trip I guide
  const myAlerts = alerts.filter((a) => !a.profiles || !isGuide)
  const guideAlerts = isGuide ? alerts.filter((a) => a.profiles) : []

  return (
    <div className="pb-safe max-w-md mx-auto px-4 py-4 space-y-5">
      {/* Header */}
      <div className="flex items-center space-x-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
        <div className="p-2.5 bg-emerald-950 rounded-xl text-emerald-400 border border-emerald-800">
          <Bell className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white">Emergency Alerts &amp; History</h2>
          <p className="text-xs text-slate-400">Your SOS history{isGuide ? ' + your trip alerts' : ''}</p>
        </div>
      </div>

      {/* My own SOS history */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">My SOS History</h3>
        {alerts.length === 0 ? (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 text-center space-y-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <div>
              <h3 className="text-sm font-bold text-white">No SOS Alerts Sent</h3>
              <p className="text-xs text-slate-400 mt-1">Your emergency history will appear here.</p>
            </div>
          </div>
        ) : (
          alerts
            .filter((a) => !isGuide || !a.profiles?.name) // Show all own alerts
            .map((a) => <AlertRow key={a.id} alert={a} />)
        )}
      </div>

      {/* Guide: alerts from their trip */}
      {isGuide && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Alerts from My Trip</h3>
          </div>
          {guideAlerts.length === 0 ? (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-center">
              <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No active SOS alerts in your trip.</p>
            </div>
          ) : (
            guideAlerts.map((a) => <GuideSosRow key={a.id} alert={a} />)
          )}
        </div>
      )}
    </div>
  )
}
