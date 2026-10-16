import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSOS } from '../context/SOSContext'
import { AlertTriangle, MapPin, CheckCircle2, X } from 'lucide-react'

export const SOSAlertBanner = () => {
  const { incomingAlert, dismissBanner, resolveAlert } = useSOS()
  const navigate = useNavigate()
  const [resolveError, setResolveError] = useState(null)
  const [resolving, setResolving] = useState(false)

  if (!incomingAlert) return null

  const personName = incomingAlert.profiles?.name || 'Unknown Traveler'
  const alertTime = new Date(incomingAlert.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
  const hasLocation = incomingAlert.lat && incomingAlert.lng

  const handleViewOnMap = () => {
    dismissBanner()
    navigate(`/map?sos_lat=${incomingAlert.lat}&sos_lng=${incomingAlert.lng}&sos_name=${encodeURIComponent(personName)}`)
  }

  const handleResolve = async () => {
    setResolveError(null)
    setResolving(true)
    const result = await resolveAlert(incomingAlert.id)
    setResolving(false)
    if (result?.error) {
      // Keep banner open, surface the error
      setResolveError('Failed to resolve. Please try again.')
    }
    // On success resolveAlert calls dismissBanner internally — no extra action needed
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-red-950/95 backdrop-blur-md animate-pulse-slow">
      {/* Pulsing red overlay rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-80 h-80 rounded-full bg-red-600/10 animate-ping" style={{ animationDuration: '2s' }}></div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-60 h-60 rounded-full bg-red-500/15 animate-ping" style={{ animationDuration: '1.5s' }}></div>
      </div>

      <div className="relative max-w-sm mx-auto px-6 text-center space-y-5">
        {/* Close / dismiss */}
        <button
          onClick={dismissBanner}
          className="absolute -top-2 right-2 p-2 text-red-300 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Alert icon */}
        <div className="inline-flex p-5 bg-red-900/60 rounded-full border-2 border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.5)]">
          <AlertTriangle className="w-14 h-14 text-red-400 animate-bounce" />
        </div>

        {/* Title */}
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-wider">
            🚨 SOS EMERGENCY 🚨
          </h2>
          <p className="text-red-200 text-xs mt-1 font-medium">Immediate attention required</p>
        </div>

        {/* Details card */}
        <div className="bg-red-950/80 border border-red-700/60 rounded-2xl p-4 space-y-2 text-left">
          <div className="flex items-center justify-between">
            <span className="text-xs text-red-300 font-bold uppercase">Distress Signal</span>
            <span className="text-xs text-red-200 font-mono">{alertTime}</span>
          </div>
          <h3 className="text-lg font-extrabold text-white">{personName}</h3>
          {hasLocation && (
            <p className="text-xs text-red-200/80 font-mono">
              📍 {incomingAlert.lat.toFixed(5)}, {incomingAlert.lng.toFixed(5)}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {hasLocation && (
            <button
              onClick={handleViewOnMap}
              className="w-full bg-white text-red-950 font-extrabold py-3.5 px-4 rounded-xl shadow-xl flex items-center justify-center space-x-2 text-sm uppercase tracking-wide active:scale-95 transition-all"
            >
              <MapPin className="w-5 h-5" />
              <span>View on Map</span>
            </button>
          )}
          {resolveError && (
            <p className="text-xs text-red-300 bg-red-950/60 border border-red-700/50 rounded-lg px-3 py-2">
              {resolveError}
            </p>
          )}
          <button
            onClick={handleResolve}
            disabled={resolving}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg flex items-center justify-center space-x-2 text-sm active:scale-95 transition-all disabled:opacity-60"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>{resolving ? 'Resolving…' : 'Mark Resolved'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
