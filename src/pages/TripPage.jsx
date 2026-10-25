/**
 * TripPage.jsx
 * Unified trip page: join / create (3-step wizard) / details / manage
 */
import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useTrip } from '../context/TripContext'
import { useActiveTrip } from '../hooks/useActiveTrip'
import { useSOS } from '../context/SOSContext'
import { useToast } from '../context/ToastContext'
import { clearRouteCache } from '../lib/routeCache'
import {
  Compass, Key, UserCheck, AlertCircle, ArrowRight, AlertTriangle, X,
  Users, Crown, CheckCircle2, Phone, LogOut, Sparkles,
} from 'lucide-react'
import { CreateTripWizard } from '../components/CreateTripWizard'
import { TripDetailsPage } from './TripDetailsPage'
import { EmergencyInfoPanel } from '../components/EmergencyInfoPanel'
import { ImageModal } from '../components/ImageModal'
import { cld } from '../lib/cloudinary'
import { PageLoader } from '../components/PageStatus'

// ── Modals ────────────────────────────────────────────────────────────────────
const ConfirmModal = ({ title, subtitle, body, confirmLabel, confirmCls, onConfirm, onCancel, loading, error, icon: Icon = AlertTriangle, iconCls = 'bg-red-950/80 text-red-400 border-red-800/60' }) => (
  <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl relative">
      <button onClick={onCancel} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
      <div className="flex items-center space-x-3">
        <div className={`p-3 rounded-xl border ${iconCls}`}><Icon className="w-6 h-6" /></div>
        <div><h3 className="text-base font-bold text-white">{title}</h3>{subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}</div>
      </div>
      <p className="text-xs text-slate-300 leading-relaxed">{body}</p>
      {error && <p className="text-xs text-red-300 bg-red-950/60 border border-red-700/50 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex items-center space-x-3 pt-2">
        <button onClick={onCancel} disabled={loading} className="flex-1 bg-slate-950 hover:bg-slate-800 text-slate-300 font-semibold py-2.5 px-4 rounded-xl border border-slate-800 text-xs">Cancel</button>
        <button onClick={onConfirm} disabled={loading} className={`flex-1 font-bold py-2.5 px-4 rounded-xl shadow-lg text-xs flex items-center justify-center space-x-1.5 disabled:opacity-50 ${confirmCls}`}>
          <span>{loading ? 'Working…' : confirmLabel}</span>
        </button>
      </div>
    </div>
  </div>
)

// ── Guide SOS card ────────────────────────────────────────────────────────────
const GuideSosCard = ({ alert, onResolve }) => {
  const [resolving,    setResolving]    = useState(false)
  const [lightboxSrc,  setLightboxSrc]  = useState(null)
  const handleResolve = async () => { setResolving(true); await onResolve(alert.id); setResolving(false) }
  const statusBadge = { active: 'bg-red-950 border-red-700 text-red-300', acknowledged: 'bg-amber-950 border-amber-700 text-amber-300' }[alert.status] || 'bg-slate-800 border-slate-700 text-slate-300'

  const avatarUrl   = alert.profiles?.avatar_url
    ? cld(alert.profiles.avatar_url, 'w_80,h_80,c_fill,g_face,f_auto,q_auto')
    : null
  const initials    = (alert.profiles?.name || '?').charAt(0).toUpperCase()
  const photoThumb  = alert.photo_url
    ? cld(alert.photo_url, 'w_120,h_90,c_fill,f_auto,q_auto')
    : null

  return (
    <>
      {lightboxSrc && <ImageModal src={lightboxSrc} alt="SOS photo" onClose={() => setLightboxSrc(null)} />}
      <div className="bg-red-950/40 border border-red-800/60 rounded-xl p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2.5">
            {/* Traveler avatar */}
            {avatarUrl ? (
              <img src={avatarUrl} alt={alert.profiles?.name}
                className="w-9 h-9 rounded-full object-cover border-2 border-red-700/60 shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-red-900/60 border-2 border-red-700/60 flex items-center justify-center text-red-200 font-bold text-sm shrink-0">
                {initials}
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                <p className="text-sm font-bold text-white">{alert.profiles?.name || 'Unknown Traveler'}</p>
              </div>
              {alert.profiles?.phone && <p className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5"><Phone className="w-2.5 h-2.5" /><span>{alert.profiles.phone}</span></p>}
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${statusBadge}`}>{alert.status}</span>
            <p className="text-[10px] text-slate-500 mt-0.5">{new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
        {alert.lat && alert.lng && <p className="text-[10px] text-slate-400 font-mono">📍 {alert.lat.toFixed(5)}, {alert.lng.toFixed(5)}</p>}
        {/* SOS photo thumbnail */}
        {photoThumb && (
          <button type="button" onClick={() => setLightboxSrc(alert.photo_url)}
            className="block rounded-xl overflow-hidden border border-slate-700 hover:border-emerald-600 transition-colors w-full">
            <img src={photoThumb} alt="SOS photo" className="w-full h-24 object-cover" />
            <p className="text-[10px] text-slate-400 py-1 text-center">Tap to view full photo</p>
          </button>
        )}
        <button onClick={handleResolve} disabled={resolving}
          className="w-full bg-emerald-800 hover:bg-emerald-700 text-emerald-100 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 disabled:opacity-50">
          <CheckCircle2 className="w-4 h-4" />
          <span>{resolving ? 'Marking…' : 'Traveler is Safe ✓'}</span>
        </button>
        {alert.user_id && (
          <EmergencyInfoPanel userId={alert.user_id} travelerPhone={alert.profiles?.phone} />
        )}
      </div>
    </>
  )
}

// ── Main TripPage ─────────────────────────────────────────────────────────────
export const TripPage = () => {
  const { trip, isGuide, isMember, isSolo, members, loading } = useActiveTrip()
  const { createTrip, updateTrip, joinTrip, chooseSolo, leaveTrip, endTrip } = useTrip()
  const { alerts, guideResolveAlert } = useSOS()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const initialAction = searchParams.get('action') // 'create' | 'join' | 'solo'

  // view: 'details' | 'choose' | 'create' | 'join' | 'solo' | 'edit'
  const [view, setView] = useState(
    trip || isSolo ? 'details' : (initialAction || 'choose')
  )

  const [code, setCode]               = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [errorMsg, setErrorMsg]       = useState('')
  const [showEndModal, setShowEndModal] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [showSwitchModal, setShowSwitchModal] = useState(null)
  const [leaveError, setLeaveError]   = useState('')
  const [endLoading, setEndLoading]   = useState(false)
  const [leaveLoading, setLeaveLoading] = useState(false)

  // Sync view when trip status changes
  useEffect(() => {
    if (!loading) {
      if (trip || isSolo) {
        if (view !== 'edit') setView('details')
      } else if (initialAction) {
        setView(initialAction)
      } else {
        setView('choose')
      }
    }
  }, [trip?.id, isSolo, loading]) // eslint-disable-line

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCreateTrip = async (payload) => {
    const res = await createTrip(payload)
    if (res?.error) {
      addToast(res.error.message || 'Failed to create trip', 'error')
    } else {
      addToast(`Trip created! Code: ${res.data?.code || ''}`, 'success')
    }
    return res
  }

  const handleUpdateTrip = async (payload) => {
    const stops = payload.route?.map((s, i) => ({ ...s, order: i + 1 })) || null
    const updates = { ...payload, route: stops?.length ? stops : null }
    const res = await updateTrip(trip.id, updates)
    if (res?.error) {
      addToast(res.error.message || 'Failed to save trip', 'error')
    } else {
      clearRouteCache()
      addToast('Trip updated!', 'success')
    }
    return res
  }

  const handleJoin = async (e, forceSwitch = false) => {
    if (e) e.preventDefault()
    setErrorMsg('')
    const codeToUse = forceSwitch && showSwitchModal ? showSwitchModal.code : code
    if (!codeToUse || codeToUse.length !== 6) { setErrorMsg('Please enter a valid 6-character code.'); return }
    setActionLoading(true)
    const res = await joinTrip(codeToUse, forceSwitch)
    setActionLoading(false)
    if (res?.requiresConfirmation) { setShowSwitchModal({ currentTripName: res.currentTripName, code: codeToUse }); return }
    if (res?.error) { setErrorMsg(res.error.message || 'Failed to join trip.'); addToast(res.error.message || 'Failed to join.', 'error') }
    else { setCode(''); setShowSwitchModal(null); addToast('Joined trip!', 'success') }
  }

  const handleSolo = () => { chooseSolo(); addToast('Solo mode activated. Stay safe!', 'success') }

  const handleEndTrip = async () => {
    setEndLoading(true)
    const res = await endTrip()
    setEndLoading(false)
    if (res?.error) { addToast(res.error.message || 'Failed to end trip.', 'error') }
    else { setShowEndModal(false); addToast('Trip ended.', 'success') }
  }

  const handleLeaveTrip = async () => {
    setLeaveError(''); setLeaveLoading(true)
    const res = await leaveTrip()
    setLeaveLoading(false)
    if (res?.error) { setLeaveError(res.error.message || 'Failed to leave trip.'); addToast(res.error.message || 'Failed to leave.', 'error') }
    else { setShowLeaveModal(false); addToast('Left the trip.', 'success') }
  }

  const guideActiveAlerts = isGuide
    ? alerts.filter((a) => a.status === 'active' || a.status === 'acknowledged')
    : []

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return <PageLoader message="Loading your trip…" />
  }

  return (
    <div className={`pb-safe max-w-md mx-auto ${
      (view === 'create' || view === 'edit')
        ? 'flex flex-col'
        : 'px-4 py-4 space-y-5'
    }`}>
      {/* Page header – hidden when wizard is full-screen */}
      {view !== 'create' && view !== 'edit' && (
        <div className="flex items-center space-x-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
          <div className="p-3 bg-emerald-950 rounded-xl text-emerald-400 border border-emerald-800">
            <Compass className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white truncate">
              {trip ? (isGuide ? 'Manage My Trip' : 'My Trip') : 'Trips & Groups'}
            </h2>
            <p className="text-xs text-slate-400">
              {trip ? (isGuide ? 'You are the guide' : `Member of ${trip.name}`) : 'Create, join, or travel solo'}
            </p>
          </div>
          {(view === 'join' || view === 'solo') && (
            <button onClick={() => { setView(trip || isSolo ? 'details' : 'choose'); setErrorMsg('') }}
              className="p-2 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* ── Guide SOS alert section (shown on details view for guide) ── */}
      {isGuide && view === 'details' && guideActiveAlerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-red-300">
              Active SOS Alerts ({guideActiveAlerts.length})
            </h3>
          </div>
          {guideActiveAlerts.map((a) => (
            <GuideSosCard key={a.id} alert={a} onResolve={guideResolveAlert} />
          ))}
        </div>
      )}
      {isGuide && view === 'details' && guideActiveAlerts.length === 0 && trip && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center space-x-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-xs text-slate-400">No active SOS alerts — all travelers safe.</p>
        </div>
      )}

      {/* ── Trip details / Wizard / Join / Solo views ── */}
      {view === 'details' && (trip || isSolo) && (
        <>
          {trip ? (
            <TripDetailsPage
              onEdit={() => setView('edit')}
              onEnd={() => setShowEndModal(true)}
              onLeave={!isGuide ? () => setShowLeaveModal(true) : undefined}
            />
          ) : (
            /* Solo mode card */
            <div className="bg-slate-900/90 border border-blue-900/50 rounded-2xl p-5 space-y-3 shadow-xl">
              <div className="flex items-center space-x-2.5">
                <div className="p-2.5 bg-blue-950 rounded-xl text-blue-400 border border-blue-800"><UserCheck className="w-5 h-5" /></div>
                <div><span className="text-[10px] uppercase font-bold text-blue-400">Current Mode</span><h3 className="text-base font-bold text-white">Solo Traveler</h3></div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">Emergency SOS, geofencing, and safety tracking remain active without a group.</p>
            </div>
          )}

          {/* Join a different trip */}
          <button onClick={() => setView('join')}
            className="w-full bg-slate-900 hover:bg-slate-850 text-emerald-400 font-semibold py-3 px-4 rounded-xl border border-emerald-900/50 flex items-center justify-center space-x-2 transition-all text-xs">
            <Key className="w-4 h-4" />
            <span>{isSolo ? 'Join a Tour Group with Code' : 'Join a Different Trip Group'}</span>
          </button>
        </>
      )}

      {/* ── Choose action ── */}
      {view === 'choose' && (
        <div className="space-y-4">
          {errorMsg && (
            <div className="bg-red-950/80 border border-red-800/80 p-3 rounded-xl text-red-300 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{errorMsg}</span>
            </div>
          )}
          {/* Empty state — no active trip */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center space-y-2">
            <Compass className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">You're not in a trip yet</p>
            <p className="text-xs text-slate-500 leading-relaxed">Create a group trip, join one with a code, or travel solo with full SOS coverage.</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'create', icon: Crown,     label: 'Create Trip', cls: 'bg-amber-950/60 border-amber-800 text-amber-300' },
              { id: 'join',   icon: Key,       label: 'Join Code',   cls: 'bg-emerald-950/60 border-emerald-800 text-emerald-300' },
              { id: 'solo',   icon: UserCheck, label: 'Solo',        cls: 'bg-slate-900 border-slate-700 text-blue-300' },
            ].map(({ id, icon: Icon, label, cls }) => (
              <button key={id} onClick={() => setView(id)}
                className={`min-h-[80px] p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 text-xs font-semibold transition-all hover:opacity-90 active:scale-95 ${cls}`}>
                <Icon className="w-5 h-5" /><span className="text-[11px]">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Create wizard ── */}
      {(view === 'create' || view === 'edit') && (
        <CreateTripWizard
          initialData={view === 'edit' && trip ? trip : undefined}
          onDone={() => setView('details')}
          onCreate={view === 'edit' ? handleUpdateTrip : handleCreateTrip}
        />
      )}

      {/* ── Join form ── */}
      {view === 'join' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <p className="text-xs text-slate-400">Received a 6-character code from your guide? Enter it below.</p>
          {errorMsg && (
            <div className="bg-red-950/80 border border-red-800/80 p-3 rounded-xl text-red-300 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{errorMsg}</span>
            </div>
          )}
          <form onSubmit={(e) => handleJoin(e, false)} className="space-y-3">
            <div className="relative">
              <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input type="text" maxLength={6} value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ENTER 6-DIGIT CODE" required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white font-mono uppercase tracking-widest focus:outline-none focus:border-emerald-500" />
            </div>
            <button type="submit" disabled={actionLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold min-h-[56px] py-3.5 px-4 rounded-xl shadow-lg transition-all text-sm uppercase tracking-wider flex items-center justify-center space-x-2 disabled:opacity-50">
              <span>{actionLoading ? 'Joining…' : 'Join Trip Group'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
          <div className="relative py-2 flex items-center justify-center">
            <div className="border-t border-slate-800 w-full absolute" />
            <span className="bg-slate-900 px-3 text-[10px] text-slate-500 uppercase font-bold relative">OR</span>
          </div>
          <button onClick={handleSolo}
            className="w-full bg-slate-950 hover:bg-slate-900 text-slate-300 font-semibold py-3 px-4 rounded-xl border border-slate-800 flex items-center justify-center space-x-2 transition-all text-xs">
            <UserCheck className="w-4 h-4 text-blue-400" /><span>Choose "Solo" & Skip Group Joining</span>
          </button>
        </div>
      )}

      {/* ── Solo confirm ── */}
      {view === 'solo' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <p className="text-xs text-slate-400 leading-relaxed">Emergency SOS, geofencing, and safety tracking stay fully active without joining a group.</p>
          <button onClick={handleSolo}
            className="w-full bg-blue-900/60 hover:bg-blue-800/60 text-blue-200 font-bold py-3.5 px-4 rounded-xl border border-blue-700/60 text-sm flex items-center justify-center space-x-2 transition-all">
            <UserCheck className="w-5 h-5" /><span>Activate Solo Mode</span>
          </button>
        </div>
      )}

      {/* ── Modals ── */}
      {showEndModal && (
        <ConfirmModal
          title="End Trip?" subtitle="This ends the trip for all members"
          body={`Ending "${trip?.name}" will deactivate it for everyone. Members will see a "Trip ended" message.`}
          confirmLabel="End Trip" confirmCls="bg-red-700 hover:bg-red-600 text-white"
          onConfirm={handleEndTrip} onCancel={() => setShowEndModal(false)} loading={endLoading}
        />
      )}
      {showLeaveModal && (
        <ConfirmModal
          title="Leave Trip?" subtitle="Confirmation Required"
          body={`Are you sure you want to leave "${trip?.name}"?`}
          confirmLabel="Leave Trip" confirmCls="bg-amber-600 hover:bg-amber-500 text-slate-950"
          onConfirm={handleLeaveTrip} onCancel={() => { setShowLeaveModal(false); setLeaveError('') }}
          loading={leaveLoading} error={leaveError}
          icon={LogOut} iconCls="bg-amber-950/80 text-amber-400 border-amber-800/60"
        />
      )}
      {showSwitchModal && (
        <ConfirmModal
          title="Switch Tour Group?" subtitle="Single Group Limit"
          body={`You're already in "${showSwitchModal.currentTripName}". Leave it and join the new trip?`}
          confirmLabel="Leave & Join" confirmCls="bg-emerald-600 hover:bg-emerald-500 text-slate-950"
          onConfirm={() => handleJoin(null, true)} onCancel={() => setShowSwitchModal(null)} loading={actionLoading}
          icon={AlertTriangle} iconCls="bg-amber-950/80 text-amber-400 border-amber-800/60"
        />
      )}
    </div>
  )
}
