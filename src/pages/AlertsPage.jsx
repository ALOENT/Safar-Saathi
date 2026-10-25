import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSOS } from '../context/SOSContext'
import { useActiveTrip } from '../hooks/useActiveTrip'
import { SOSDeskPage } from './SOSDeskPage'
import { EmergencyInfoPanel } from '../components/EmergencyInfoPanel'
import { ImageModal } from '../components/ImageModal'
import { cld } from '../lib/cloudinary'
import { PageLoader } from '../components/PageStatus'
import {
  Bell, CheckCircle2, AlertTriangle, Clock, MapPin, CheckCircle, Crown, AlertCircle,
} from 'lucide-react'

// ── Status helpers ────────────────────────────────────────────────────────────
const STATUS_BADGE = {
  active:         'bg-red-950 border-red-700 text-red-300',
  acknowledged:   'bg-amber-950 border-amber-700 text-amber-300',
  guide_resolved: 'bg-blue-950 border-blue-700 text-blue-300',
  resolved:       'bg-emerald-950 border-emerald-700 text-emerald-300',
}
const STATUS_LABEL = {
  active:         '🚨 Active',
  acknowledged:   '👁 Acknowledged',
  guide_resolved: '✅ Guide Marked Safe',
  resolved:       '✔ Resolved',
}

// ── My own SOS row ────────────────────────────────────────────────────────────
const MyAlertRow = ({ alert }) => {
  const [lightbox, setLightbox] = useState(null)
  const alertTime = new Date(alert.created_at).toLocaleString([], {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  const st = alert.status || 'active'
  const photoThumb = alert.photo_url
    ? cld(alert.photo_url, 'w_300,h_160,c_fill,f_auto,q_auto') : null
  return (
    <>
      {lightbox && <ImageModal src={lightbox} alt="SOS photo" onClose={() => setLightbox(null)} />}
      <div className={`bg-slate-900/80 border rounded-2xl p-4 space-y-2 ${st === 'active' ? 'border-red-900/60' : 'border-slate-800'}`}>
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_BADGE[st] || 'bg-slate-800 border-slate-700 text-slate-300'}`}>
            {STATUS_LABEL[st] || st}
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
        {photoThumb && (
          <button type="button" onClick={() => setLightbox(alert.photo_url)}
            className="block w-full rounded-xl overflow-hidden border border-slate-700 hover:border-emerald-600 transition-colors">
            <img src={photoThumb} alt="SOS photo" className="w-full h-24 object-cover" />
            <p className="text-[10px] text-slate-400 py-1 text-center">Photo — tap to view</p>
          </button>
        )}
      </div>
    </>
  )
}

// ── Trip alert row (guide sees this for their members) ────────────────────────
const TripAlertRow = ({ alert }) => {
  const [lightbox, setLightbox] = useState(null)
  const personName  = alert.profiles?.name  || 'Unknown Traveler'
  const personPhone = alert.profiles?.phone || null
  const alertTime   = new Date(alert.created_at).toLocaleString([], {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  const st          = alert.status || 'active'
  const avatarThumb = alert.profiles?.avatar_url
    ? cld(alert.profiles.avatar_url, 'w_80,h_80,c_fill,g_face,f_auto,q_auto') : null
  const avatarInit  = personName.charAt(0).toUpperCase()
  const photoThumb  = alert.photo_url
    ? cld(alert.photo_url, 'w_300,h_160,c_fill,f_auto,q_auto') : null
  return (
    <>
      {lightbox && <ImageModal src={lightbox} alt="SOS photo" onClose={() => setLightbox(null)} />}
      <div className={`bg-slate-900/80 border rounded-2xl p-4 space-y-2 ${st === 'active' ? 'border-red-900/60' : 'border-slate-800'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {avatarThumb ? (
              <img src={avatarThumb} alt={personName}
                className="w-7 h-7 rounded-full object-cover border border-slate-600 shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-slate-300 text-[10px] font-bold shrink-0">
                {avatarInit}
              </div>
            )}
            <span className="text-xs font-bold text-white">{personName}</span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_BADGE[st] || 'bg-slate-800 border-slate-700 text-slate-300'}`}>
            {STATUS_LABEL[st] || st}
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
        {photoThumb && (
          <button type="button" onClick={() => setLightbox(alert.photo_url)}
            className="block w-full rounded-xl overflow-hidden border border-slate-700 hover:border-emerald-600 transition-colors">
            <img src={photoThumb} alt="SOS photo" className="w-full h-24 object-cover" />
            <p className="text-[10px] text-slate-400 py-1 text-center">Photo — tap to view</p>
          </button>
        )}
        {alert.user_id && (
          <EmergencyInfoPanel userId={alert.user_id} travelerPhone={personPhone} />
        )}
      </div>
    </>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
const EmptyState = ({ text }) => (
  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 text-center space-y-3">
    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
    <p className="text-xs text-slate-400">{text}</p>
  </div>
)

// ── Error state ───────────────────────────────────────────────────────────────
const ErrorState = ({ text }) => (
  <div className="bg-red-950/60 border border-red-800/60 rounded-2xl p-4 flex items-start space-x-2.5">
    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
    <p className="text-xs text-red-300">{text || 'Failed to load alerts. Pull to retry.'}</p>
  </div>
)

// ── Main AlertsPage ───────────────────────────────────────────────────────────
export const AlertsPage = () => {
  const { profile } = useAuth()
  const { isGuide, trip } = useActiveTrip()
  // `alerts`      = guide's or authority's active trip alerts
  // `myOwnAlerts` = this user's own SOS sends
  const { alerts: tripAlerts, myOwnAlerts, fetchError, fetchLoading } = useSOS()

  // Authority always sees the full SOS desk
  if (profile?.role === 'authority') {
    return <SOSDeskPage />
  }

  if (fetchLoading) {
    return <PageLoader message="Loading your alerts…" />
  }

  // Guide sees their own history + all trip member alerts
  // Regular traveler sees only their own history
  return (
    <div className="pb-safe max-w-md mx-auto px-4 py-4 space-y-5">

      {/* Header */}
      <div className="flex items-center space-x-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
        <div className="p-2.5 bg-emerald-950 rounded-xl text-emerald-400 border border-emerald-800">
          <Bell className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white">Alerts &amp; History</h2>
          <p className="text-xs text-slate-400">
            {isGuide ? 'My SOS history + my trip alerts' : 'My SOS history'}
          </p>
        </div>
      </div>

      {/* ── My own SOS history ── */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">My SOS History</h3>
        {fetchError && myOwnAlerts.length === 0 ? (
          <ErrorState text={fetchError} />
        ) : myOwnAlerts.length === 0 ? (
          <EmptyState text="You haven't sent any SOS alerts. Your emergency history will appear here." />
        ) : (
          myOwnAlerts.map((a) => <MyAlertRow key={a.id} alert={a} />)
        )}
      </div>

      {/* ── Guide: alerts from trip members ── */}
      {isGuide && trip && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Alerts from My Trip
            </h3>
            <span className="flex items-center space-x-1 bg-amber-950/60 border border-amber-700/40 text-amber-300 text-[9px] font-bold px-2 py-0.5 rounded-full">
              <Crown className="w-2.5 h-2.5" /><span>Guide</span>
            </span>
          </div>
          {fetchError ? (
            <ErrorState text={fetchError} />
          ) : tripAlerts.length === 0 ? (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-center">
              <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No active SOS alerts in your trip. All travelers are safe.</p>
            </div>
          ) : (
            tripAlerts.map((a) => <TripAlertRow key={a.id} alert={a} />)
          )}
        </div>
      )}
    </div>
  )
}
