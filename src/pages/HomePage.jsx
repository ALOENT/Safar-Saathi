import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTrip } from '../context/TripContext'
import { useSOS } from '../context/SOSContext'
import { useLocation } from '../context/LocationContext'
import { useActiveTrip } from '../hooks/useActiveTrip'
import {
  Shield, AlertTriangle, Compass, MapPin, Copy, Check, UserCheck,
  X, CheckCircle2, Plus, Key, Users, Crown, AlertCircle, Navigation, Flag, Phone, Camera, Loader2,
} from 'lucide-react'
import { computeSafetyScore } from '../lib/safetyScore'
import { getWeatherCode } from '../lib/weatherCache'
import { SafetyScoreWidget } from '../components/SafetyScoreWidget'
import { PageLoader } from '../components/PageStatus'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { fetchRoute } from '../lib/routeCache'
import { findNextStop, formatDistance } from '../lib/routeUtils'
import { uploadImage } from '../lib/cloudinary'

const SCORE_INTERVAL_MS = 60 * 1000
const LOCATION_DELTA_M  = 50

function approxDist(a, b) {
  if (!a || !b) return Infinity
  const R = 6371000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const aa = sinLat * sinLat + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLng * sinLng
  return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa))
}

export const HomePage = () => {
  const { profile, user } = useAuth()
  const { isSolo, members } = useTrip()
  const { trip, isGuide, loading: tripLoading } = useActiveTrip()
  const { sendSOS, sending, lastSentAlert, clearLastSent, myAlertStatus, clearMyAlertStatus, alerts: guideAlerts } = useSOS()
  const { myLocation } = useLocation()
  const { addToast } = useToast()
  const navigate = useNavigate()

  const [copied, setCopied] = useState(false)
  const [countdown, setCountdown] = useState(null)
  const countdownRef = useRef(null)
  const [sosError, setSosError] = useState(null)
  const [sosResolutionToast, setSosResolutionToast] = useState(false)
  const prevAlertStatus = useRef(null)

  // ── Emergency contact nudge ─────────────────────────────────────────────────
  const [showEcNudge, setShowEcNudge] = useState(false)
  const [primaryContact, setPrimaryContact] = useState(null)

  // ── SOS photo upload ──────────────────────────────────────────────────
  const [sosPhotoState, setSosPhotoState] = useState({ uploading: false, done: false, error: null })
  const photoInputRef = useRef(null)

  // ── Safety score ──────────────────────────────────────────────────────────
  const [safetyResult, setSafetyResult] = useState({ score: 100, level: 'low', reasons: [] })
  const [scoreLoading, setScoreLoading] = useState(true)
  const lastScoreLocRef = useRef(null)

  // ── Route (OSRM) – fetched once per trip ────────────────────────────────
  const [routeCoords, setRouteCoords] = useState(null)   // [lng,lat][] GeoJSON
  const [nextStop, setNextStop]       = useState(null)   // { stop, distanceM }

  // Fetch OSRM route when trip has stops
  useEffect(() => {
    const stops = Array.isArray(trip?.route) ? [...trip.route].sort((a,b)=>(a.order??0)-(b.order??0)) : []
    if (stops.length < 2) { setRouteCoords(null); return }
    let cancelled = false
    fetchRoute(stops.map((s) => ({ lat: s.lat, lng: s.lng }))).then((r) => {
      if (!cancelled) setRouteCoords(r.coordinates)  // [lng,lat][]
    })
    return () => { cancelled = true }
  }, [trip?.id, (trip?.route?.length ?? 0)])

  // Recompute next stop whenever location or route changes
  useEffect(() => {
    const stops = Array.isArray(trip?.route) && !isGuide
      ? [...trip.route].sort((a,b)=>(a.order??0)-(b.order??0))
      : []
    if (stops.length === 0 || !myLocation) { setNextStop(null); return }
    setNextStop(findNextStop(stops, myLocation.lat, myLocation.lng))
  }, [myLocation, trip?.id, isGuide, (trip?.route?.length ?? 0)])

  const fetchGroupLocations = useCallback(async () => {
    if (!trip?.id) return []
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('lat, lng, user_id')
        .eq('trip_id', trip.id)
      if (error || !data) return []
      return data.filter((r) => typeof r.lat === 'number' && typeof r.lng === 'number')
    } catch {
      return []
    }
  }, [trip?.id])

  const recalculate = useCallback(async (forcedLoc) => {
    const loc = forcedLoc || myLocation
    if (!loc) {
      setSafetyResult({ score: 85, level: 'low', reasons: [] })
      setScoreLoading(false)
      return
    }
    setScoreLoading(true)
    try {
      const wCode = await getWeatherCode(loc.lat, loc.lng)
      const groupLocations = await fetchGroupLocations()
      const result = computeSafetyScore({
        lat: loc.lat,
        lng: loc.lng,
        groupLocations: groupLocations.length > 0 ? groupLocations : myLocation ? [myLocation] : [],
        isSolo,
        weatherCode: wCode,
        routeCoordinates: routeCoords,   // ← pass OSRM polyline
        now: new Date(),
      })
      setSafetyResult(result)
    } catch (err) {
      console.warn('[SafetyScore] Recalc error:', err)
    } finally {
      setScoreLoading(false)
    }
  }, [myLocation, isSolo, fetchGroupLocations, routeCoords])

  useEffect(() => { recalculate() }, [])
  useEffect(() => {
    const timer = setInterval(() => recalculate(), SCORE_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [recalculate])
  useEffect(() => {
    if (!myLocation) return
    const dist = approxDist(lastScoreLocRef.current, myLocation)
    if (dist > LOCATION_DELTA_M) {
      lastScoreLocRef.current = myLocation
      recalculate(myLocation)
    }
  }, [myLocation, recalculate])
  useEffect(() => { recalculate() }, [isSolo, trip?.id])

  // ── Copy trip code ────────────────────────────────────────────────────────
  const handleCopyCode = () => {
    if (!trip?.code) return
    navigator.clipboard.writeText(trip.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── SOS countdown ─────────────────────────────────────────────────────────
  const handleSOSPress = () => {
    if (countdown !== null || sending) return
    setSosError(null)
    setCountdown(3)
  }
  const handleCancelSOS = () => {
    setCountdown(null)
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null }
  }
  useEffect(() => {
    if (countdown === null) return
    if (countdown === 0) {
      ;(async () => {
        const result = await sendSOS()
        setCountdown(null)
        if (result?.error) {
          setSosError('SOS failed. Tap to try again.')
          addToast('SOS failed to send.', 'error')
        } else {
          addToast('🚨 SOS alert sent to your guide and authorities!', 'success', 5000)
        }
      })()
      return
    }
    countdownRef.current = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null))
    }, 1000)
    return () => { if (countdownRef.current) clearTimeout(countdownRef.current) }
  }, [countdown])

  useEffect(() => {
    if (!lastSentAlert) return
    // Reset photo state on each new alert
    setSosPhotoState({ uploading: false, done: false, error: null })
    const timer = setTimeout(() => clearLastSent(), 30000)
    return () => clearTimeout(timer)
  }, [lastSentAlert])

  // SOS photo upload – fire and forget; never blocks SOS
  const handleSOSPhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !lastSentAlert?.id) return
    e.target.value = ''
    setSosPhotoState({ uploading: true, done: false, error: null })
    try {
      const secure_url = await uploadImage(file)
      const { error } = await supabase
        .from('sos_alerts')
        .update({ photo_url: secure_url })
        .eq('id', lastSentAlert.id)
      if (error) throw error
      setSosPhotoState({ uploading: false, done: true, error: null })
      addToast('Photo attached to your SOS ✅', 'success')
    } catch (err) {
      setSosPhotoState({ uploading: false, done: false, error: err.message || 'Photo upload failed' })
    }
  }

  // Fetch primary emergency contact when SOS is sent
  useEffect(() => {
    if (!lastSentAlert || !user) { setPrimaryContact(null); return }
    let cancelled = false
    supabase
      .from('emergency_contacts')
      .select('name, phone')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { if (!cancelled) setPrimaryContact(data) })
    return () => { cancelled = true }
  }, [lastSentAlert, user])

  // Check if user has emergency contacts → show nudge (per-user dismissal key)
  useEffect(() => {
    if (!user) return
    const nudgeKey = `safarsathi_ec_nudge_dismissed_${user.id}`
    const dismissed = localStorage.getItem(nudgeKey) === 'true'
    if (dismissed) return
    supabase
      .from('emergency_contacts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }) => { if (count === 0) setShowEcNudge(true) })
  }, [user])

  // ── SOS resolution toast ──────────────────────────────────────────────────
  useEffect(() => {
    if (
      myAlertStatus &&
      (myAlertStatus === 'guide_resolved' || myAlertStatus === 'resolved') &&
      prevAlertStatus.current !== myAlertStatus
    ) {
      prevAlertStatus.current = myAlertStatus
      setSosResolutionToast(true)
      clearLastSent()
      setTimeout(() => { setSosResolutionToast(false); clearMyAlertStatus() }, 5000)
    } else {
      prevAlertStatus.current = myAlertStatus
    }
  }, [myAlertStatus])

  const isCountingDown = countdown !== null && countdown > 0

  // ── Active guide SOS alerts banner (only visible to guide) ───────────────
  const activeSOSforGuide = isGuide
    ? guideAlerts.filter((a) => a.status === 'active' || a.status === 'acknowledged')
    : []

  if (tripLoading) {
    return <PageLoader message="Loading your dashboard…" />
  }

  return (
    <div className="pb-safe max-w-md mx-auto px-4 py-4 space-y-5">

      {/* ── SOS Resolution Toast ── */}
      {sosResolutionToast && (
        <div className="bg-emerald-900 border border-emerald-600 text-emerald-100 px-4 py-3 rounded-2xl flex items-center space-x-3 shadow-xl animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold">Your SOS was marked safe ✅</p>
            <p className="text-xs text-emerald-300">Guide and/or authority have confirmed you're okay.</p>
          </div>
          <button onClick={() => { setSosResolutionToast(false); clearMyAlertStatus() }} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Emergency contact nudge ── */}
      {showEcNudge && (
        <div className="bg-amber-950/70 border border-amber-800/60 rounded-2xl px-4 py-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <p className="text-xs text-amber-200">Add an emergency contact for your safety.</p>
          </div>
          <div className="flex items-center gap-2 ml-2 shrink-0">
            <button onClick={() => navigate('/profile')}
              className="text-[11px] text-amber-300 font-bold hover:text-amber-100 bg-amber-900/60 border border-amber-700/50 px-2.5 py-1 rounded-lg">
              Add
            </button>
            <button
              onClick={() => { setShowEcNudge(false); localStorage.setItem(`safarsathi_ec_nudge_dismissed_${user.id}`,'true') }}
              className="p-1 text-amber-400 hover:text-amber-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Guide SOS Alert Banner ── */}
      {activeSOSforGuide.length > 0 && (
        <div className="bg-red-950/90 border border-red-700 rounded-2xl p-4 space-y-2 shadow-xl">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-400 animate-bounce" />
            <span className="text-sm font-bold text-red-200">
              🚨 {activeSOSforGuide.length} Active SOS Alert{activeSOSforGuide.length > 1 ? 's' : ''} in Your Trip
            </span>
          </div>
          {activeSOSforGuide.map((a) => (
            <div key={a.id} className="bg-red-900/60 border border-red-700/60 rounded-xl px-3 py-2 text-xs text-red-100 flex items-center justify-between">
              <span className="font-bold">{a.profiles?.name || 'Unknown'}</span>
              <button
                onClick={() => navigate('/trip')}
                className="text-[10px] bg-red-700 hover:bg-red-600 text-white px-2 py-0.5 rounded-lg font-bold"
              >
                Respond →
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Welcome Header ── */}
      <div className="bg-gradient-to-br from-emerald-900 to-emerald-950 rounded-2xl p-5 border border-emerald-800/80 shadow-xl space-y-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex justify-between items-start">
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-400">SafarSaathi</span>
            <h2 className="text-xl font-extrabold text-white">Namaste, {profile?.name || 'Traveler'} 👋</h2>
            <p className="text-xs text-emerald-200/80 mt-0.5">Your safety connection is Active</p>
          </div>
          <div className="p-2 bg-emerald-900/80 rounded-xl border border-emerald-700/50">
            <Shield className="w-6 h-6 text-emerald-400" />
          </div>
        </div>
        <div className="inline-flex items-center space-x-2 bg-emerald-950/90 px-3 py-1.5 rounded-full border border-emerald-600/40 text-xs text-emerald-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Status: Safe &amp; Monitored</span>
        </div>
      </div>

      {/* ── Safety Score Widget ── */}
      <SafetyScoreWidget
        score={safetyResult.score}
        level={safetyResult.level}
        reasons={safetyResult.reasons}
        loading={scoreLoading}
      />

      {/* ── Trip Status Area ── */}
      {trip ? (
        /* ── Has active trip ── */
        <div className="bg-slate-900/90 border border-emerald-800/60 rounded-2xl p-4 space-y-3 shadow-lg">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] uppercase font-bold text-emerald-400">Active Trip</span>
                {isGuide ? (
                  <span className="flex items-center space-x-1 bg-amber-950/80 border border-amber-700/60 text-amber-300 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                    <Crown className="w-2.5 h-2.5" />
                    <span>You're the Guide</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-1 bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                    <Users className="w-2.5 h-2.5" />
                    <span>Member</span>
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-white">{trip.name}</h3>
              <span className="text-[11px] font-mono text-emerald-300 font-bold block">Code: {trip.code}</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopyCode}
                className="p-2 bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 rounded-xl"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                onClick={() => navigate('/trip')}
                className="px-3 py-2 bg-emerald-900 text-emerald-100 rounded-xl text-xs font-semibold border border-emerald-700/60"
              >
                {isGuide ? 'Manage' : 'View Trip'}
              </button>
            </div>
          </div>

          {/* Members pill */}
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>{members.length} member{members.length !== 1 ? 's' : ''} connected</span>
          </div>
        </div>
      ) : isSolo ? (
        /* ── Solo mode ── */
        <div className="bg-slate-900/90 border border-blue-900/50 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-950 text-blue-400 rounded-xl border border-blue-800">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Solo Traveler Mode</h3>
              <p className="text-[10px] text-slate-400">SOS and Geofence tracking active</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/trip')}
            className="px-3 py-1.5 bg-blue-950 text-blue-300 border border-blue-800 rounded-xl text-xs font-semibold"
          >
            Join Group
          </button>
        </div>
      ) : (
        /* ── No active trip – action cards ── */
        <div className="space-y-3">
          <p className="text-xs text-slate-400 px-1 font-medium uppercase tracking-wider">Get Started</p>
          <div className="grid grid-cols-1 gap-3">

            {/* Create a trip */}
            <button
              onClick={() => navigate('/trip?action=create')}
              className="bg-gradient-to-br from-amber-950/80 to-slate-900 border border-amber-800/60 rounded-2xl p-4 flex items-center space-x-4 text-left transition-all hover:border-amber-600/60 shadow-lg"
            >
              <div className="p-3 bg-amber-900/60 rounded-xl border border-amber-700/50 shrink-0">
                <Crown className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Create a Trip</h3>
                <p className="text-[10px] text-amber-200/70 mt-0.5">You'll be the guide. Share the code with your group.</p>
              </div>
            </button>

            {/* Join with code */}
            <button
              onClick={() => navigate('/trip?action=join')}
              className="bg-slate-900/90 border border-emerald-900/60 rounded-2xl p-4 flex items-center space-x-4 text-left transition-all hover:border-emerald-700/60 shadow-lg"
            >
              <div className="p-3 bg-emerald-950/80 rounded-xl border border-emerald-800/50 shrink-0">
                <Key className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Join with Trip Code</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Enter a 6-character code from your guide.</p>
              </div>
            </button>

            {/* Travel solo */}
            <button
              onClick={() => navigate('/trip?action=solo')}
              className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center space-x-4 text-left transition-all hover:border-slate-700 shadow-lg"
            >
              <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 shrink-0">
                <UserCheck className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Travel Solo</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Personal SOS and safety tracking without a group.</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ── Next Stop (member only, trip has stops) ── */}
      {!isGuide && nextStop && (
        <div className="bg-slate-900/90 border border-blue-900/50 rounded-2xl p-4 space-y-2.5 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Flag className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-blue-300">Next Stop</span>
            </div>
            <span className="text-xs font-bold text-blue-200 bg-blue-950/80 border border-blue-700/50 px-2 py-0.5 rounded-full">
              {formatDistance(nextStop.distanceM)}
            </span>
          </div>
          <div className="flex items-start space-x-2.5">
            <div className="w-7 h-7 rounded-full bg-blue-900 border border-blue-700 flex items-center justify-center text-blue-300 text-xs font-bold shrink-0">
              {nextStop.stop.order}
            </div>
            <div>
              <p className="text-sm font-bold text-white">{nextStop.stop.name}</p>
              {nextStop.stop.planned_time && (
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Planned: {new Date(nextStop.stop.planned_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </p>
              )}
              {nextStop.stop.note && <p className="text-[10px] text-slate-500 italic">{nextStop.stop.note}</p>}
            </div>
          </div>
        </div>
      )}

      <div className={`rounded-2xl p-5 text-center space-y-3 shadow-lg border transition-all duration-300 ${
        isCountingDown
          ? 'bg-red-950/95 border-red-600 shadow-[0_0_30px_rgba(239,68,68,0.3)]'
          : lastSentAlert
          ? 'bg-emerald-950/90 border-emerald-700'
          : 'bg-slate-900/90 border-red-900/50'
      }`}>
        {lastSentAlert ? (
          <>
            <div className="inline-flex p-3 bg-emerald-900/60 rounded-full border border-emerald-600">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">✅ SOS Alert Sent!</h3>
              <p className="text-xs text-emerald-300 mt-0.5">
                Signal broadcast to {trip ? 'your guide and' : ''} local authorities.
              </p>
            </div>
            {/* Emergency call buttons */}
            <div className="flex gap-2 w-full">
              <a href="tel:112"
                className="flex-1 bg-red-700 hover:bg-red-600 text-white font-bold py-3 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs active:scale-95 transition-all">
                <Phone className="w-4 h-4" />
                Call 112
              </a>
              {primaryContact && (
                <a href={`tel:${primaryContact.phone}`}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-semibold py-3 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs active:scale-95 transition-all">
                  <Phone className="w-4 h-4 text-emerald-400" />
                  {primaryContact.name}
                </a>
              )}
            </div>
            {/* SOS photo upload */}
            {sosPhotoState.done ? (
              <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Photo attached
              </p>
            ) : sosPhotoState.uploading ? (
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading photo…
              </p>
            ) : (
              <div className="w-full space-y-1">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="w-full bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs transition-all"
                >
                  <Camera className="w-4 h-4" />
                  Add a Photo (optional)
                </button>
                {sosPhotoState.error && (
                  <p className="text-[10px] text-red-400 text-center">
                    {sosPhotoState.error} —{' '}
                    <button onClick={() => photoInputRef.current?.click()} className="underline">Retry</button>
                  </p>
                )}
              </div>
            )}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleSOSPhoto}
            />
            <button onClick={clearLastSent} className="text-xs text-slate-400 underline hover:text-slate-200">
              Dismiss
            </button>
          </>
        ) : isCountingDown ? (
          <>
            <div className="relative inline-flex items-center justify-center w-24 h-24">
              <div className="absolute inset-0 rounded-full bg-red-600/20 animate-ping"></div>
              <div className="relative w-20 h-20 rounded-full bg-red-900/80 border-4 border-red-500 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.5)]">
                <span className="text-4xl font-black text-white">{countdown}</span>
              </div>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Sending SOS in {countdown}...</h3>
              <p className="text-xs text-red-200 mt-0.5">Press cancel to abort</p>
            </div>
            <button
              onClick={handleCancelSOS}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold min-h-[56px] py-3 px-4 rounded-xl border border-slate-600 flex items-center justify-center space-x-2 text-sm active:scale-95 transition-all"
            >
              <X className="w-5 h-5" />
              <span>CANCEL</span>
            </button>
          </>
        ) : (
          <>
            <div className="inline-flex p-3 bg-red-950/80 rounded-full border border-red-800/50">
              <AlertTriangle className="w-8 h-8 text-red-500 animate-bounce" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Emergency SOS Alert</h3>
              <p className="text-xs text-slate-400 mt-0.5">Press to trigger instant location alert to Guide &amp; Authorities</p>
            </div>
            {sosError && (
              <p className="text-xs text-red-300 bg-red-950/60 border border-red-700/50 rounded-lg px-3 py-2">
                ⚠️ {sosError}
              </p>
            )}
            <button
              onClick={handleSOSPress}
              disabled={sending}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-extrabold min-h-[64px] py-4 px-4 rounded-xl shadow-xl shadow-red-950/80 active:scale-95 transition-all text-base uppercase tracking-wider flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <AlertTriangle className="w-6 h-6" />
              <span>TRIGGER SOS EMERGENCY</span>
            </button>
          </>
        )}
      </div>

      {/* ── Quick Action Grid ── */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/trip')}
          className="bg-slate-900/80 hover:bg-slate-850 border border-slate-800 rounded-2xl p-4 flex flex-col items-center text-center space-y-2 transition-all"
        >
          <div className="p-2.5 bg-emerald-950 rounded-xl text-emerald-400 border border-emerald-900">
            <Compass className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-200">My Trip</span>
          <span className="text-[10px] text-slate-400">View code &amp; members</span>
        </button>

        <button
          onClick={() => navigate('/map')}
          className="bg-slate-900/80 hover:bg-slate-850 border border-slate-800 rounded-2xl p-4 flex flex-col items-center text-center space-y-2 transition-all"
        >
          <div className="p-2.5 bg-emerald-950 rounded-xl text-emerald-400 border border-emerald-900">
            <MapPin className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-200">Live Map</span>
          <span className="text-[10px] text-slate-400">View safety zone</span>
        </button>
      </div>
    </div>
  )
}
