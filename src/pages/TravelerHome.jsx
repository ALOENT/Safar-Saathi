import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTrip } from '../context/TripContext'
import { useSOS } from '../context/SOSContext'
import { useLocation } from '../context/LocationContext'
import { Shield, AlertTriangle, Compass, MapPin, Copy, Check, UserCheck, X, CheckCircle2 } from 'lucide-react'
import { computeSafetyScore } from '../lib/safetyScore'
import { getWeatherCode } from '../lib/weatherCache'
import { SafetyScoreWidget } from '../components/SafetyScoreWidget'
import { supabase } from '../lib/supabase'

const SCORE_INTERVAL_MS   = 60 * 1000  // recalculate every 60 seconds
const LOCATION_DELTA_M    = 50          // significant movement threshold
const WEATHER_INTERVAL_MS = 10 * 60 * 1000 // already handled by weatherCache

// Haversine inline (avoid circular import) – only used for delta check
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

export const TravelerHome = () => {
  const { profile } = useAuth()
  const { currentTrip, isSolo, members } = useTrip()
  const { sendSOS, sending, lastSentAlert, clearLastSent, myAlertStatus, clearMyAlertStatus } = useSOS()
  const { myLocation } = useLocation()
  const navigate = useNavigate()
  const [copied, setCopied] = React.useState(false)

  // SOS countdown state
  const [countdown, setCountdown] = useState(null)
  const countdownRef = useRef(null)
  const [sosError, setSosError] = useState(null)

  // Toast when own alert is marked safe by guide / authority
  const [sosResolutionToast, setSosResolutionToast] = useState(false)
  const prevAlertStatus = useRef(null)

  // ── Safety score state ──────────────────────────────────────────────────────
  const [safetyResult, setSafetyResult] = useState({ score: 100, level: 'low', reasons: [] })
  const [scoreLoading, setScoreLoading] = useState(true)
  const lastScoreLocRef = useRef(null)
  const weatherCodeRef  = useRef(null)

  // ── Fetch group member locations from Supabase for centroid calc ──────────
  const fetchGroupLocations = useCallback(async () => {
    if (!currentTrip?.id) return []
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('lat, lng, user_id')
        .eq('trip_id', currentTrip.id)
      if (error || !data) return []
      return data.filter((r) => typeof r.lat === 'number' && typeof r.lng === 'number')
    } catch {
      return []
    }
  }, [currentTrip?.id])

  // ── Core recalculate function ──────────────────────────────────────────────
  const recalculate = useCallback(async (forcedLoc) => {
    const loc = forcedLoc || myLocation
    if (!loc) {
      // No location yet – return default safe-ish score
      setSafetyResult({ score: 85, level: 'low', reasons: [] })
      setScoreLoading(false)
      return
    }

    setScoreLoading(true)
    try {
      // Fetch weather (cached for 10 min)
      const wCode = await getWeatherCode(loc.lat, loc.lng)
      weatherCodeRef.current = wCode

      // Fetch group member locations for centroid
      const groupLocations = await fetchGroupLocations()

      const result = computeSafetyScore({
        lat: loc.lat,
        lng: loc.lng,
        groupLocations: groupLocations.length > 0 ? groupLocations : myLocation ? [myLocation] : [],
        isSolo,
        weatherCode: wCode,
        now: new Date(),
      })

      setSafetyResult(result)
    } catch (err) {
      console.warn('[SafetyScore] Recalc error:', err)
    } finally {
      setScoreLoading(false)
    }
  }, [myLocation, isSolo, fetchGroupLocations])

  // ── Initial calculation on mount ───────────────────────────────────────────
  useEffect(() => {
    recalculate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Recalculate every 60 seconds ───────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => recalculate(), SCORE_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [recalculate])

  // ── Recalculate when location changes significantly ────────────────────────
  useEffect(() => {
    if (!myLocation) return
    const dist = approxDist(lastScoreLocRef.current, myLocation)
    if (dist > LOCATION_DELTA_M) {
      lastScoreLocRef.current = myLocation
      recalculate(myLocation)
    }
  }, [myLocation, recalculate])

  // ── Recalculate when isSolo / trip changes ─────────────────────────────────
  useEffect(() => {
    recalculate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSolo, currentTrip?.id])

  // ── Copy trip code ─────────────────────────────────────────────────────────
  const handleCopyCode = () => {
    if (!currentTrip?.code) return
    navigator.clipboard.writeText(currentTrip.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Start 3-second countdown
  const handleSOSPress = () => {
    if (countdown !== null || sending) return
    setSosError(null)
    setCountdown(3)
  }

  // Cancel countdown
  const handleCancelSOS = () => {
    setCountdown(null)
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
  }

  // Run countdown timer
  useEffect(() => {
    if (countdown === null) return

    if (countdown === 0) {
      // Fire SOS
      ;(async () => {
        const result = await sendSOS()
        setCountdown(null)
        if (result?.error) {
          setSosError('SOS failed to send. Tap to try again.')
        } else {
          setSosError(null)
        }
      })()
      return
    }

    countdownRef.current = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null))
    }, 1000)

    return () => {
      if (countdownRef.current) clearTimeout(countdownRef.current)
    }
  }, [countdown])

  // Auto-dismiss confirmation after 5 seconds
  useEffect(() => {
    if (!lastSentAlert) return
    const timer = setTimeout(() => clearLastSent(), 5000)
    return () => clearTimeout(timer)
  }, [lastSentAlert])

  // ── Show toast when own alert becomes guide_resolved / resolved ───────────
  useEffect(() => {
    if (
      myAlertStatus &&
      (myAlertStatus === 'guide_resolved' || myAlertStatus === 'resolved') &&
      prevAlertStatus.current !== myAlertStatus
    ) {
      prevAlertStatus.current = myAlertStatus
      setSosResolutionToast(true)
      // Also clear lastSentAlert so the SOS box resets
      clearLastSent()
      setTimeout(() => {
        setSosResolutionToast(false)
        clearMyAlertStatus()
      }, 5000)
    } else {
      prevAlertStatus.current = myAlertStatus
    }
  }, [myAlertStatus])

  const isCountingDown = countdown !== null && countdown > 0

  return (
    <div className="pb-safe max-w-md mx-auto px-4 py-4 space-y-5">
      {/* ── SOS resolution toast ───────────────────────────────────────── */}
      {sosResolutionToast && (
        <div className="bg-emerald-900 border border-emerald-600 text-emerald-100 px-4 py-3 rounded-2xl
          flex items-center space-x-3 shadow-xl animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold">Your SOS was marked safe ✅</p>
            <p className="text-xs text-emerald-300">Guide and/or authority have confirmed you're okay.</p>
          </div>
          <button
            onClick={() => { setSosResolutionToast(false); clearMyAlertStatus() }}
            className="text-emerald-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {/* Welcome Header */}
      <div className="bg-gradient-to-br from-emerald-900 to-emerald-950 rounded-2xl p-5 border border-emerald-800/80 shadow-xl space-y-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex justify-between items-start">
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-400">Traveler Dashboard</span>
            <h2 className="text-xl font-extrabold text-white">Namaste, {profile?.name || 'Traveler'} 👋</h2>
            <p className="text-xs text-emerald-200/80 mt-0.5">Your safety connection is Active</p>
          </div>
          <div className="p-2 bg-emerald-900/80 rounded-xl border border-emerald-700/50">
            <Shield className="w-6 h-6 text-emerald-400" />
          </div>
        </div>

        {/* Status Indicator */}
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

      {/* Active Trip / Solo Banner */}
      {currentTrip ? (
        <div className="bg-slate-900/90 border border-emerald-800/60 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-emerald-400">Active Group</span>
            <h3 className="text-sm font-bold text-white">{currentTrip.name}</h3>
            <span className="text-[11px] font-mono text-emerald-300 font-bold block">
              Code: {currentTrip.code}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyCode}
              className="p-2 bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 rounded-xl text-xs font-semibold flex items-center space-x-1"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={() => navigate('/trips')}
              className="px-3 py-2 bg-emerald-900 text-emerald-100 rounded-xl text-xs font-semibold border border-emerald-700/60"
            >
              View Trip
            </button>
          </div>
        </div>
      ) : isSolo ? (
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
            onClick={() => navigate('/trips')}
            className="px-3 py-1.5 bg-blue-950 text-blue-300 border border-blue-800 rounded-xl text-xs font-semibold"
          >
            Join Group
          </button>
        </div>
      ) : (
        <div className="bg-slate-900/90 border border-amber-900/40 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <h3 className="text-xs font-bold text-white">No Active Tour Group</h3>
            <p className="text-[10px] text-slate-400">Join with a 6-digit code or travel Solo</p>
          </div>
          <button
            onClick={() => navigate('/trips')}
            className="px-3.5 py-2 bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs shadow-md"
          >
            Join Trip
          </button>
        </div>
      )}

      {/* SOS Quick Trigger Box */}
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
                Your emergency signal has been broadcast to {currentTrip ? 'your guide and' : ''} local authorities.
              </p>
            </div>
            <button
              onClick={clearLastSent}
              className="text-xs text-slate-400 underline hover:text-slate-200"
            >
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
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-xl border border-slate-600 flex items-center justify-center space-x-2 text-sm active:scale-95 transition-all"
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
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-xl shadow-red-950/80 active:scale-95 transition-all text-sm uppercase tracking-wider flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <AlertTriangle className="w-5 h-5" />
              <span>TRIGGER SOS EMERGENCY</span>
            </button>
          </>
        )}
      </div>

      {/* Quick Action Grid */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/trips')}
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
