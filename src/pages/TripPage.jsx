import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useTrip } from '../context/TripContext'
import { useActiveTrip } from '../hooks/useActiveTrip'
import { useSOS } from '../context/SOSContext'
import { useToast } from '../context/ToastContext'
import {
  Compass, Key, UserCheck, AlertCircle, ArrowRight, AlertTriangle, X,
  Plus, Users, Crown, Copy, Check, LogOut, Sparkles, MapPin,
  CheckCircle2, Clock, Phone,
} from 'lucide-react'

// ── "End Trip" dialog (guide only) ────────────────────────────────────────────
const EndTripModal = ({ trip, onConfirm, onCancel, loading }) => (
  <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-slate-900 border border-red-900/60 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl relative">
      <button onClick={onCancel} className="absolute top-4 right-4 text-slate-400 hover:text-white">
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-center space-x-3">
        <div className="p-3 bg-red-950/80 rounded-xl text-red-400 border border-red-800/60">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">End Trip?</h3>
          <p className="text-xs text-slate-400">This ends the trip for all members</p>
        </div>
      </div>
      <p className="text-xs text-slate-300 leading-relaxed">
        Ending <strong className="text-white">{trip?.name}</strong> will deactivate it for everyone.
        Members will see a "Trip ended" message.
      </p>
      <div className="flex items-center space-x-3 pt-2">
        <button onClick={onCancel} disabled={loading}
          className="flex-1 bg-slate-950 hover:bg-slate-800 text-slate-300 font-semibold py-2.5 px-4 rounded-xl border border-slate-800 text-xs">
          Cancel
        </button>
        <button onClick={onConfirm} disabled={loading}
          className="flex-1 bg-red-700 hover:bg-red-600 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg text-xs flex items-center justify-center space-x-1.5 disabled:opacity-50">
          <span>{loading ? 'Ending...' : 'End Trip'}</span>
        </button>
      </div>
    </div>
  </div>
)

// ── "Leave Trip" dialog (member only) ─────────────────────────────────────────
const LeaveTripModal = ({ trip, onConfirm, onCancel, loading, error }) => (
  <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl relative">
      <button onClick={onCancel} className="absolute top-4 right-4 text-slate-400 hover:text-white">
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-center space-x-3">
        <div className="p-3 bg-amber-950/80 rounded-xl text-amber-400 border border-amber-800/60">
          <LogOut className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Leave Trip?</h3>
          <p className="text-xs text-slate-400">Confirmation Required</p>
        </div>
      </div>
      <p className="text-xs text-slate-300 leading-relaxed">
        Are you sure you want to leave <strong className="text-white">{trip?.name}</strong>?
      </p>
      {error && <p className="text-xs text-red-300 bg-red-950/60 border border-red-700/50 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex items-center space-x-3 pt-2">
        <button onClick={onCancel} disabled={loading}
          className="flex-1 bg-slate-950 hover:bg-slate-800 text-slate-300 font-semibold py-2.5 px-4 rounded-xl border border-slate-800 text-xs">
          Cancel
        </button>
        <button onClick={onConfirm} disabled={loading}
          className="flex-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold py-2.5 px-4 rounded-xl shadow-lg text-xs flex items-center justify-center space-x-1.5 disabled:opacity-50">
          <LogOut className="w-3.5 h-3.5" />
          <span>{loading ? 'Leaving...' : 'Leave Trip'}</span>
        </button>
      </div>
    </div>
  </div>
)

// ── "Switch Trip" confirmation ─────────────────────────────────────────────────
const SwitchTripModal = ({ currentTripName, onConfirm, onCancel, loading }) => (
  <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl relative">
      <button onClick={onCancel} className="absolute top-4 right-4 text-slate-400 hover:text-white">
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-center space-x-3">
        <div className="p-3 bg-amber-950/80 rounded-xl text-amber-400 border border-amber-800/60">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Switch Tour Group?</h3>
          <p className="text-xs text-slate-400">Single Group Limit</p>
        </div>
      </div>
      <p className="text-xs text-slate-300 leading-relaxed">
        You're already in <strong className="text-white">{currentTripName}</strong>. Leave it and join the new trip?
      </p>
      <div className="flex items-center space-x-3 pt-2">
        <button onClick={onCancel} disabled={loading}
          className="flex-1 bg-slate-950 hover:bg-slate-800 text-slate-300 font-semibold py-2.5 px-4 rounded-xl border border-slate-800 text-xs">
          Cancel
        </button>
        <button onClick={onConfirm} disabled={loading}
          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold py-2.5 px-4 rounded-xl shadow-lg text-xs flex items-center justify-center space-x-1.5 disabled:opacity-50">
          <span>{loading ? 'Switching...' : 'Leave & Join'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </div>
)

// ── Guide SOS card ─────────────────────────────────────────────────────────────
const GuideSosCard = ({ alert, onResolve }) => {
  const [resolving, setResolving] = useState(false)
  const personName = alert.profiles?.name || 'Unknown Traveler'
  const alertTime = new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const handleResolve = async () => {
    setResolving(true)
    await onResolve(alert.id)
    setResolving(false)
  }

  const statusBadge = {
    active: 'bg-red-950 border-red-700 text-red-300',
    acknowledged: 'bg-amber-950 border-amber-700 text-amber-300',
  }[alert.status] || 'bg-slate-800 border-slate-700 text-slate-300'

  return (
    <div className="bg-red-950/40 border border-red-800/60 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
          <div>
            <p className="text-sm font-bold text-white">{personName}</p>
            {alert.profiles?.phone && (
              <p className="text-[10px] text-slate-400 flex items-center space-x-1">
                <Phone className="w-2.5 h-2.5" /><span>{alert.profiles.phone}</span>
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${statusBadge}`}>
            {alert.status}
          </span>
          <p className="text-[10px] text-slate-500 mt-0.5">{alertTime}</p>
        </div>
      </div>
      {alert.lat && alert.lng && (
        <p className="text-[10px] text-slate-400 font-mono">
          📍 {alert.lat.toFixed(5)}, {alert.lng.toFixed(5)}
        </p>
      )}
      <button
        onClick={handleResolve}
        disabled={resolving}
        className="w-full bg-emerald-800 hover:bg-emerald-700 text-emerald-100 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 disabled:opacity-50 transition-all"
      >
        <CheckCircle2 className="w-4 h-4" />
        <span>{resolving ? 'Marking safe...' : 'Traveler is Safe ✓'}</span>
      </button>
    </div>
  )
}

// ── Main TripPage ─────────────────────────────────────────────────────────────
export const TripPage = () => {
  const { trip, isGuide, isMember, isSolo, members, loading } = useActiveTrip()
  const { createTrip, joinTrip, chooseSolo, leaveTrip, endTrip } = useTrip()
  const { alerts, guideResolveAlert } = useSOS()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const initialAction = searchParams.get('action') // 'create' | 'join' | 'solo'

  const [view, setView] = useState(initialAction || (trip || isSolo ? 'active' : 'choose'))
  const [code, setCode] = useState('')
  const [tripName, setTripName] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [copied, setCopied] = useState(false)

  // Modal states
  const [showEndModal, setShowEndModal] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [showSwitchModal, setShowSwitchModal] = useState(null) // { currentTripName, code }
  const [leaveError, setLeaveError] = useState('')
  const [endLoading, setEndLoading] = useState(false)
  const [leaveLoading, setLeaveLoading] = useState(false)

  // Sync view when trip status changes (e.g., guide ends trip - members redirect)
  useEffect(() => {
    if (!loading) {
      if (trip || isSolo) setView('active')
      else if (initialAction) setView(initialAction)
      else setView('choose')
    }
  }, [trip?.id, isSolo, loading])

  const handleCopyCode = () => {
    if (!trip?.code) return
    navigator.clipboard.writeText(trip.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Create trip ──────────────────────────────────────────────────────────
  const handleCreateTrip = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setActionLoading(true)
    const res = await createTrip(tripName)
    setActionLoading(false)
    if (res?.error) {
      setErrorMsg(res.error.message || 'Failed to create trip')
      addToast(res.error.message || 'Failed to create trip', 'error')
    } else {
      setTripName('')
      addToast(`Trip created! Code: ${res.data?.code || ''}`, 'success')
    }
  }

  // ── Join trip ────────────────────────────────────────────────────────────
  const handleJoin = async (e, forceSwitch = false) => {
    if (e) e.preventDefault()
    setErrorMsg('')

    const codeToUse = forceSwitch && showSwitchModal ? showSwitchModal.code : code
    if (!codeToUse || codeToUse.length !== 6) {
      setErrorMsg('Please enter a valid 6-character code.')
      return
    }

    setActionLoading(true)
    const res = await joinTrip(codeToUse, forceSwitch)
    setActionLoading(false)

    if (res?.requiresConfirmation) {
      setShowSwitchModal({ currentTripName: res.currentTripName, code: codeToUse })
      return
    }
    if (res?.error) {
      setErrorMsg(res.error.message || 'Failed to join trip.')
      addToast(res.error.message || 'Failed to join trip.', 'error')
    } else {
      setCode('')
      setShowSwitchModal(null)
      addToast('Successfully joined the trip!', 'success')
    }
  }

  // ── Choose solo ──────────────────────────────────────────────────────────
  const handleSolo = () => {
    chooseSolo()
    addToast('Solo mode activated. Stay safe!', 'success')
  }

  // ── End trip (guide) ─────────────────────────────────────────────────────
  const handleEndTrip = async () => {
    setEndLoading(true)
    const res = await endTrip()
    setEndLoading(false)
    if (res?.error) {
      addToast(res.error.message || 'Failed to end trip.', 'error')
    } else {
      setShowEndModal(false)
      addToast('Trip ended successfully.', 'success')
    }
  }

  // ── Leave trip (member) ──────────────────────────────────────────────────
  const handleLeaveTrip = async () => {
    setLeaveError('')
    setLeaveLoading(true)
    const res = await leaveTrip()
    setLeaveLoading(false)
    if (res?.error) {
      setLeaveError(res.error.message || 'Failed to leave trip.')
      addToast(res.error.message || 'Failed to leave trip.', 'error')
    } else {
      setShowLeaveModal(false)
      addToast('You have left the trip.', 'success')
    }
  }

  // ── Active SOS alerts for guide ───────────────────────────────────────────
  const guideActiveAlerts = isGuide
    ? alerts.filter((a) => a.status === 'active' || a.status === 'acknowledged')
    : []

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="pb-safe max-w-md mx-auto px-4 py-4 space-y-5">
      {/* Header */}
      <div className="flex items-center space-x-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
        <div className="p-3 bg-emerald-950 rounded-xl text-emerald-400 border border-emerald-800">
          <Compass className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">
            {trip ? (isGuide ? 'Manage My Trip' : 'My Trip') : 'Trips & Groups'}
          </h2>
          <p className="text-xs text-slate-400">
            {trip
              ? isGuide
                ? 'You created this trip — you are the guide'
                : `Member of ${trip.name}`
              : 'Create, join, or travel solo'}
          </p>
        </div>
      </div>

      {/* ── Active trip view ── */}
      {(trip || isSolo) && view === 'active' && (
        <div className="space-y-4">

          {/* Solo mode */}
          {isSolo && !trip && (
            <div className="bg-slate-900/90 border border-blue-900/50 rounded-2xl p-5 space-y-3 shadow-xl">
              <div className="flex items-center space-x-2.5">
                <div className="p-2.5 bg-blue-950 rounded-xl text-blue-400 border border-blue-800">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-blue-400">Current Mode</span>
                  <h3 className="text-base font-bold text-white">Solo Traveler</h3>
                </div>
                <span className="ml-auto bg-blue-950 text-blue-300 border border-blue-700/60 px-2.5 py-1 rounded-full text-xs font-semibold">Solo Mode</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Exploring solo! Emergency SOS, Geofencing, and Safe Map tracking remain active for your personal safety.
              </p>
            </div>
          )}

          {/* Active trip with code */}
          {trip && (
            <>
              <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-950 border border-emerald-800/80 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">Active Tour Group</span>
                      {isGuide && (
                        <span className="flex items-center space-x-1 bg-amber-950/80 border border-amber-700/50 text-amber-300 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                          <Crown className="w-2.5 h-2.5" /><span>Guide</span>
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-extrabold text-white">{trip.name}</h2>
                  </div>
                  <span className="bg-emerald-950/90 text-emerald-300 border border-emerald-600/50 px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Active</span>
                  </span>
                </div>

                {/* Trip code */}
                <div className="bg-slate-950/90 border border-emerald-800/60 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Group Trip Code</span>
                    <span className="text-2xl font-black text-emerald-400 tracking-widest font-mono">{trip.code}</span>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg font-semibold text-xs transition-all shadow-md active:scale-95 ${
                      copied
                        ? 'bg-emerald-600 text-white border border-emerald-400'
                        : 'bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 border border-emerald-700/60'
                    }`}
                  >
                    {copied ? <><Check className="w-4 h-4 text-white" /><span>Copied!</span></> : <><Copy className="w-4 h-4 text-emerald-300" /><span>Copy Code</span></>}
                  </button>
                </div>

                {/* View map */}
                <a href="/map" className="w-full bg-emerald-950/90 hover:bg-emerald-900/90 border border-emerald-700/60 rounded-xl py-2.5 px-3 flex items-center justify-center space-x-2 text-xs font-bold text-emerald-300 transition-all shadow-sm">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span>View Live Group Map</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Member list */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Trip Members ({members.length})
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-400">Live Group Signals</span>
                </div>

                <div className="space-y-2.5">
                  {members.length === 0 ? (
                    <div className="bg-slate-950 p-4 rounded-xl text-center border border-slate-800">
                      <p className="text-xs text-slate-400">Loading members...</p>
                    </div>
                  ) : (
                    members.map((m, idx) => {
                      const isMe = m.user_id === trip?.created_by ? false : undefined // handled below
                      const isTripCreator = m.user_id === trip?.created_by
                      return (
                        <div
                          key={m.id || idx}
                          className={`flex items-center justify-between p-3 rounded-xl border ${
                            isTripCreator
                              ? 'bg-amber-950/30 border-amber-800/50'
                              : 'bg-slate-950 border-slate-800/80'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border ${
                              isTripCreator
                                ? 'bg-amber-950 text-amber-300 border-amber-600/50'
                                : 'bg-emerald-950 text-emerald-300 border-emerald-700/50'
                            }`}>
                              {isTripCreator ? '🚩' : '🧳'}
                            </div>
                            <div>
                              <div className="flex items-center space-x-1.5">
                                <span className="text-xs font-bold text-white">{m.name}</span>
                                {isTripCreator && (
                                  <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">GUIDE</span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 capitalize block">
                                {isTripCreator ? 'Tour Guide' : 'Traveler'} {m.phone ? `• ${m.phone}` : ''}
                              </span>
                            </div>
                          </div>
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#22c55e]"></span>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Guide-only SOS alerts section */}
              {isGuide && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Active SOS Alerts ({guideActiveAlerts.length})
                    </h3>
                  </div>
                  {guideActiveAlerts.length === 0 ? (
                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-center">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                      <p className="text-xs text-slate-400">No active SOS alerts — all travelers safe.</p>
                    </div>
                  ) : (
                    guideActiveAlerts.map((a) => (
                      <GuideSosCard key={a.id} alert={a} onResolve={guideResolveAlert} />
                    ))
                  )}
                </div>
              )}

              {/* End/Leave trip buttons */}
              {isGuide ? (
                <button
                  onClick={() => setShowEndModal(true)}
                  className="w-full bg-slate-950 hover:bg-red-950/40 text-slate-400 hover:text-red-300 font-semibold py-3 px-4 rounded-xl border border-slate-800 hover:border-red-900/60 flex items-center justify-center space-x-2 transition-all text-xs"
                >
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span>End Trip (for everyone)</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowLeaveModal(true)}
                  className="w-full bg-slate-950 hover:bg-red-950/40 text-slate-400 hover:text-red-300 font-semibold py-3 px-4 rounded-xl border border-slate-800 hover:border-red-900/60 flex items-center justify-center space-x-2 transition-all text-xs"
                >
                  <LogOut className="w-4 h-4 text-red-400" />
                  <span>Leave Trip</span>
                </button>
              )}
            </>
          )}

          {/* Allow joining/creating even if in solo (show option below) */}
          <button
            onClick={() => setView('choose')}
            className="w-full bg-slate-900 hover:bg-slate-850 text-emerald-400 font-semibold py-3 px-4 rounded-xl border border-emerald-900/50 flex items-center justify-center space-x-2 transition-all text-xs"
          >
            <Key className="w-4 h-4" />
            <span>{isSolo ? 'Join a Tour Group with Code' : 'Join a Different Trip Group'}</span>
          </button>
        </div>
      )}

      {/* ── No trip – choose action ── */}
      {view === 'choose' && (
        <div className="space-y-4">
          {errorMsg && (
            <div className="bg-red-950/80 border border-red-800/80 p-3 rounded-xl text-red-300 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action pick buttons */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'create', icon: Crown, label: 'Create Trip', color: 'amber' },
              { id: 'join', icon: Key, label: 'Join Code', color: 'emerald' },
              { id: 'solo', icon: UserCheck, label: 'Solo', color: 'blue' },
            ].map(({ id, icon: Icon, label, color }) => {
              const colorMap = {
                amber: 'bg-amber-950/60 border-amber-800 text-amber-300',
                emerald: 'bg-emerald-950/60 border-emerald-800 text-emerald-300',
                blue: 'bg-slate-900 border-slate-700 text-blue-300',
              }
              return (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  className={`p-3 rounded-xl border flex flex-col items-center text-center gap-1 text-xs font-semibold transition-all ${colorMap[color]}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px]">{label}</span>
                </button>
              )
            })}
          </div>

          {view === 'choose' && (
            <p className="text-xs text-slate-500 text-center">Select an option above to get started.</p>
          )}
        </div>
      )}

      {/* ── Create form ── */}
      {view === 'create' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Create New Tour Group</h3>
            </div>
            <button onClick={() => { setView(trip || isSolo ? 'active' : 'choose'); setErrorMsg('') }}
              className="text-xs text-slate-400 hover:text-white underline">Back</button>
          </div>
          <p className="text-xs text-slate-400">Generate a 6-character trip code. You'll be the guide — members join using this code.</p>
          {errorMsg && (
            <div className="bg-red-950/80 border border-red-800/80 p-3 rounded-xl text-red-300 text-xs">{errorMsg}</div>
          )}
          <form onSubmit={handleCreateTrip} className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Tour / Group Name</label>
              <input
                type="text"
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                placeholder="e.g. Shimla Heritage Tour 2026"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <button
              type="submit"
              disabled={actionLoading}
              className="w-full bg-amber-600 hover:bg-amber-500 text-slate-950 font-extrabold py-3.5 px-4 rounded-xl shadow-lg transition-all text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{actionLoading ? 'Creating...' : 'Create Trip & Get Code'}</span>
            </button>
          </form>
        </div>
      )}

      {/* ── Join form ── */}
      {view === 'join' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Join a Tour Trip</h3>
            <button onClick={() => { setView(trip || isSolo ? 'active' : 'choose'); setErrorMsg('') }}
              className="text-xs text-slate-400 hover:text-white underline">Back</button>
          </div>
          <p className="text-xs text-slate-400">Received a 6-character code from your guide? Enter it below.</p>
          {errorMsg && (
            <div className="bg-red-950/80 border border-red-800/80 p-3 rounded-xl text-red-300 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
          <form onSubmit={(e) => handleJoin(e, false)} className="space-y-3">
            <div className="relative">
              <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ENTER 6-DIGIT CODE"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white font-mono uppercase tracking-widest focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              type="submit"
              disabled={actionLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold py-3.5 px-4 rounded-xl shadow-lg transition-all text-sm uppercase tracking-wider flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{actionLoading ? 'Joining...' : 'Join Trip Group'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
          <div className="relative py-2 flex items-center justify-center">
            <div className="border-t border-slate-800 w-full absolute"></div>
            <span className="bg-slate-900 px-3 text-[10px] text-slate-500 uppercase font-bold relative">OR</span>
          </div>
          <button
            onClick={handleSolo}
            className="w-full bg-slate-950 hover:bg-slate-900 text-slate-300 font-semibold py-3 px-4 rounded-xl border border-slate-800 flex items-center justify-center space-x-2 transition-all text-xs"
          >
            <UserCheck className="w-4 h-4 text-blue-400" />
            <span>Choose "Solo" & Skip Group Joining</span>
          </button>
        </div>
      )}

      {/* ── Solo confirm ── */}
      {view === 'solo' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Solo Travel Mode</h3>
            </div>
            <button onClick={() => setView('choose')} className="text-xs text-slate-400 hover:text-white underline">Back</button>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Emergency SOS, geofencing, and safety tracking will stay fully active without joining a group.
          </p>
          <button
            onClick={handleSolo}
            className="w-full bg-blue-900/60 hover:bg-blue-800/60 text-blue-200 font-bold py-3.5 px-4 rounded-xl border border-blue-700/60 text-sm flex items-center justify-center space-x-2 transition-all"
          >
            <UserCheck className="w-5 h-5" />
            <span>Activate Solo Mode</span>
          </button>
        </div>
      )}

      {/* ── Modals ── */}
      {showEndModal && (
        <EndTripModal
          trip={trip}
          onConfirm={handleEndTrip}
          onCancel={() => setShowEndModal(false)}
          loading={endLoading}
        />
      )}
      {showLeaveModal && (
        <LeaveTripModal
          trip={trip}
          onConfirm={handleLeaveTrip}
          onCancel={() => setShowLeaveModal(false)}
          loading={leaveLoading}
          error={leaveError}
        />
      )}
      {showSwitchModal && (
        <SwitchTripModal
          currentTripName={showSwitchModal.currentTripName}
          onConfirm={() => handleJoin(null, true)}
          onCancel={() => setShowSwitchModal(null)}
          loading={actionLoading}
        />
      )}
    </div>
  )
}
