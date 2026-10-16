import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useSOS } from '../context/SOSContext'
import {
  AlertTriangle,
  ShieldCheck,
  Radio,
  MapPin,
  CheckCircle2,
  Clock,
  Users,
  Route,
  Locate,
  Siren,
  X,
  Building2,
} from 'lucide-react'

// ── Fix Leaflet default icon paths in Vite ───────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// ── SOS map marker ───────────────────────────────────────────────────────────
const createSOSIcon = (status) => {
  const isGuideSafe = status === 'guide_resolved'
  const isAck       = status === 'acknowledged'

  let bg, ring, anim, label
  if (isGuideSafe) {
    bg = '#22c55e'; ring = 'rgba(34,197,94,0.4)'; anim = ''; label = 'SAFE?'
  } else if (isAck) {
    bg = '#f59e0b'; ring = 'rgba(245,158,11,0.4)'; anim = ''; label = 'ACK'
  } else {
    bg = '#ef4444'; ring = 'rgba(239,68,68,0.45)'
    anim = 'animation:sos-ping 1.4s ease-in-out infinite;'
    label = 'SOS'
  }

  const html = `
    <style>
      @keyframes sos-ping {
        0%  {transform:scale(1);opacity:1}
        70% {transform:scale(2.4);opacity:0}
        100%{transform:scale(1);opacity:0}
      }
    </style>
    <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
      <div style="position:absolute;width:36px;height:36px;border-radius:50%;background:${ring};${anim}"></div>
      <div style="width:32px;height:32px;border-radius:50%;background:${bg};border:2.5px solid #fff;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 4px 14px rgba(0,0,0,0.5);z-index:10;">
        <span style="font-size:14px;line-height:1;">${isGuideSafe ? '✅' : '🆘'}</span>
      </div>
      <div style="margin-top:3px;background:rgba(15,23,42,0.92);border:1px solid rgba(255,255,255,0.2);
        color:#fff;font-size:9px;font-weight:700;padding:1px 6px;border-radius:9999px;white-space:nowrap;">
        ${label}
      </div>
    </div>`

  return L.divIcon({
    className: 'sos-authority-marker',
    html,
    iconSize:     [40, 52],
    iconAnchor:   [20, 26],
    popupAnchor:  [0, -28],
  })
}

// ── MapFlyTo + invalidateSize on mount ───────────────────────────────────────
function MapController({ target }) {
  const map = useMap()

  // invalidateSize once tiles settle
  useEffect(() => {
    const id = setTimeout(() => map.invalidateSize(), 200)
    return () => clearTimeout(id)
  }, [map])

  // Fly to target
  useEffect(() => {
    if (target) map.flyTo(target, 16, { animate: true, duration: 1.1 })
  }, [target, map])

  return null
}

// ── Time helpers ──────────────────────────────────────────────────────────────
const timeAgo = (iso) => {
  if (!iso) return 'Unknown'
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 5)  return 'Just now'
  if (diff < 60) return `${diff}s ago`
  const m = Math.floor(diff / 60)
  if (m < 60)    return `${m} min ago`
  return `${Math.floor(m / 60)} hr ago`
}

// ── Toast ─────────────────────────────────────────────────────────────────────
const Toast = ({ message, onClose }) => (
  <div
    style={{ zIndex: 9999 }}
    className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-emerald-900 border border-emerald-600
      text-emerald-100 px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold
      flex items-center space-x-2 pointer-events-auto"
  >
    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
    <span>{message}</span>
    <button onClick={onClose} className="ml-2 text-emerald-400 hover:text-white">
      <X className="w-4 h-4" />
    </button>
  </div>
)

// ── Incoming alert banner ─────────────────────────────────────────────────────
const IncomingBanner = ({ alert, onDismiss }) => {
  if (!alert) return null
  return (
    <div style={{ zIndex: 9000 }} className="fixed inset-x-0 top-16 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-lg bg-red-950 border-2 border-red-500
        rounded-2xl shadow-[0_0_40px_rgba(239,68,68,0.6)] p-4 flex items-start space-x-4 animate-pulse">
        <div className="p-2.5 bg-red-900/60 rounded-xl border border-red-700 shrink-0">
          <AlertTriangle className="w-6 h-6 text-red-400 animate-bounce" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-red-300 uppercase tracking-widest">🚨 New SOS Alert</p>
          <p className="text-base font-extrabold text-white truncate">
            {alert.profiles?.name || 'Unknown traveler'} needs help!
          </p>
          {alert.lat && alert.lng && (
            <p className="text-xs text-red-300 font-mono mt-0.5">
              📍 {alert.lat.toFixed(5)}, {alert.lng.toFixed(5)}
            </p>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="p-1.5 rounded-xl bg-red-900/50 hover:bg-red-800 border border-red-700 text-red-300 hover:text-white transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = {
    active:         'bg-red-950 text-red-400 border-red-700/60',
    acknowledged:   'bg-amber-950 text-amber-400 border-amber-700/60',
    guide_resolved: 'bg-emerald-950 text-emerald-400 border-emerald-800/60',
    resolved:       'bg-slate-800 text-slate-400 border-slate-700',
  }
  const label = {
    active:         'Active',
    acknowledged:   'Acknowledged',
    guide_resolved: 'Guide marked safe',
    resolved:       'Resolved',
  }
  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${cfg[status] || cfg.active}`}>
      {label[status] || status}
    </span>
  )
}

// ── Summary card ──────────────────────────────────────────────────────────────
const accentMap = {
  red:     { bg: 'bg-red-950/60',     border: 'border-red-800/50',     val: 'text-red-300'     },
  sky:     { bg: 'bg-sky-950/60',     border: 'border-sky-800/50',     val: 'text-sky-300'     },
  emerald: { bg: 'bg-emerald-950/60', border: 'border-emerald-800/50', val: 'text-emerald-300' },
}

const SummaryCard = ({ icon, label, value, accent = 'red', pulse = false }) => {
  const { bg, border, val } = accentMap[accent] || accentMap.red
  return (
    <div className={`${bg} ${border} border rounded-2xl p-3 sm:p-4 flex flex-col items-center text-center space-y-1.5`}>
      <div className={pulse ? 'animate-bounce' : ''}>{icon}</div>
      <p className={`text-xl sm:text-2xl font-black ${val} ${pulse ? 'animate-pulse' : ''}`}>{value}</p>
      <p className="text-[10px] sm:text-xs text-slate-400 font-semibold leading-tight">{label}</p>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Main Authority Dashboard
// ════════════════════════════════════════════════════════════════════════════
export const AuthorityHome = () => {
  const { user, profile } = useAuth()
  const { alerts, incomingAlert, acknowledgeAlert, resolveAlert, dismissBanner, playAlarm } = useSOS()

  // Stats
  const [activeTripCount, setActiveTripCount] = useState(0)
  const [sharingCount, setSharingCount]       = useState(0)
  const [statsLoading, setStatsLoading]       = useState(true)

  // Map
  const [mapFlyTarget, setMapFlyTarget] = useState(null)

  // Toast
  const [toast, setToast] = useState(null)

  // Timestamp ticker
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 15000)
    return () => clearInterval(id)
  }, [])

  // Play alarm on new incoming alert
  const prevIncomingId = useRef(null)
  useEffect(() => {
    if (incomingAlert && incomingAlert.id !== prevIncomingId.current) {
      prevIncomingId.current = incomingAlert.id
      playAlarm?.()
    }
  }, [incomingAlert, playAlarm])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  // ── Stats fetch ──────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const { count: tripCount } = await supabase
        .from('trips').select('*', { count: 'exact', head: true })
      setActiveTripCount(tripCount || 0)

      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      const { count: locCount } = await supabase
        .from('locations').select('*', { count: 'exact', head: true }).gte('updated_at', fiveMinAgo)
      setSharingCount(locCount || 0)
    } catch (err) {
      console.warn('Stats fetch error:', err)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    const id = setInterval(fetchStats, 60000)
    return () => clearInterval(id)
  }, [fetchStats])

  useEffect(() => {
    const ch = supabase
      .channel('authority_loc_watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, fetchStats)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [fetchStats])

  // ── Derive lists ─────────────────────────────────────────────────────────
  // Only 'active' and 'acknowledged' get red pins; 'guide_resolved' gets green pins
  const mapAlerts    = alerts.filter((a) => a.status !== 'resolved')
  const activeCount  = alerts.filter((a) => a.status === 'active').length
  const visibleAlerts = alerts   // already filtered to active|acknowledged|guide_resolved by context

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleAcknowledge = async (id) => {
    await acknowledgeAlert(id)
    showToast('Alert acknowledged')
  }

  const handleDispatch = async (id) => {
    await acknowledgeAlert(id)
    showToast('Nearest unit notified (demo)')
  }

  const handleClose = async (id) => {
    await resolveAlert(id)
    showToast('Alert closed')
  }

  const handleConfirmSafe = async (id) => {
    await resolveAlert(id)
    showToast('Confirmed safe — alert closed')
  }

  const handleLocate = (alert) => {
    if (alert.lat && alert.lng) {
      setMapFlyTarget([alert.lat, alert.lng])
      // On mobile scroll to top where map is
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // ── Map default center ────────────────────────────────────────────────────
  const defaultCenter = [23.5, 80.5]
  const firstWithLoc  = mapAlerts.find((a) => a.lat && a.lng)
  const mapCenter     = firstWithLoc ? [firstWithLoc.lat, firstWithLoc.lng] : defaultCenter

  // ── Map height constants (fixed, never grows) ─────────────────────────────
  // h-[360px] on mobile, h-[440px] on lg
  const MAP_HEIGHT_MOBILE  = 360
  const MAP_HEIGHT_DESKTOP = 440

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <IncomingBanner alert={incomingAlert} onDismiss={dismissBanner} />
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* ── Outer wrapper: pb-20 keeps content above bottom nav ─────────── */}
      <div className="max-w-7xl mx-auto px-4 pt-4 pb-20 space-y-4">

        {/* Header */}
        <div className="bg-gradient-to-br from-red-950 via-slate-900 to-slate-950 rounded-2xl p-5
          border border-red-800/40 shadow-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-red-950/80 rounded-xl border border-red-700/50">
              <Building2 className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <p className="text-[11px] uppercase font-black tracking-widest text-red-400">
                Emergency Control Desk
              </p>
              <h1 className="text-xl font-extrabold text-white leading-tight">
                Authority Dashboard 🛡️
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Officer: {profile?.name || 'Authorized Personnel'}
              </p>
            </div>
          </div>
          <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full border text-xs font-bold self-start sm:self-auto
            ${activeCount > 0
              ? 'bg-red-950/80 text-red-300 border-red-700/60 animate-pulse'
              : 'bg-slate-800 text-slate-300 border-slate-700'}`}>
            <Radio className="w-3.5 h-3.5" />
            <span>Radar: {activeCount > 0 ? 'ACTIVE' : 'Standby'}</span>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <SummaryCard
            icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
            label="Active Alerts" value={activeCount} accent="red" pulse={activeCount > 0}
          />
          <SummaryCard
            icon={<Route className="w-5 h-5 text-sky-400" />}
            label="Active Trips" value={statsLoading ? '…' : activeTripCount} accent="sky"
          />
          <SummaryCard
            icon={<Users className="w-5 h-5 text-emerald-400" />}
            label="Sharing Now" value={statsLoading ? '…' : sharingCount} accent="emerald"
          />
        </div>

        {/* ── 2-column grid on desktop ─────────────────────────────────── */}
        <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-4 lg:items-start space-y-4 lg:space-y-0">

          {/* ── LEFT / TOP: Map ─────────────────────────────────────────── */}
          <div
            className="authority-map-wrapper bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
          >
            {/* Map header strip */}
            <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-red-400" />
                <span className="text-sm font-bold text-white">Live SOS Map</span>
                {mapAlerts.length > 0 && (
                  <span className="text-[11px] bg-red-950 text-red-400 border border-red-800 px-2 py-0.5 rounded-full font-bold">
                    {mapAlerts.length} pin{mapAlerts.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-500 hidden sm:block">Click a pin for details</span>
            </div>

            {/* Map fill */}
            <div className="flex-1 min-h-0">
              <MapContainer
                center={mapCenter}
                zoom={mapAlerts.length > 0 ? 10 : 5}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%', background: '#0f172a' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapController target={mapFlyTarget} />

                {mapAlerts.map((alert) => {
                  if (!alert.lat || !alert.lng) return null
                  return (
                    <Marker
                      key={alert.id}
                      position={[alert.lat, alert.lng]}
                      icon={createSOSIcon(alert.status)}
                    >
                      <Popup>
                        <div className="text-slate-800 space-y-1 min-w-[160px]">
                          <p className="font-extrabold text-sm">{alert.profiles?.name || 'Traveler'}</p>
                          <StatusBadge status={alert.status} />
                          <p className="text-xs text-slate-500 mt-1">{timeAgo(alert.created_at)}</p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {alert.lat.toFixed(5)}, {alert.lng.toFixed(5)}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  )
                })}
              </MapContainer>
            </div>
          </div>

          {/* ── RIGHT / BOTTOM: Alert list ──────────────────────────────── */}
          <div className="authority-alert-list overflow-y-auto space-y-3 pr-0.5">
            {/* List header */}
            <div className="flex items-center justify-between px-1 sticky top-0 bg-slate-950/90 backdrop-blur-sm py-1 z-10">
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <Siren className="w-4 h-4 text-red-400" />
                <span>Alert Queue</span>
              </h2>
              <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-md border
                ${visibleAlerts.length > 0
                  ? 'bg-red-950 text-red-400 border-red-700 animate-pulse'
                  : 'bg-emerald-950 text-emerald-400 border-emerald-800'}`}>
                {visibleAlerts.length} {visibleAlerts.length === 1 ? 'ALERT' : 'ALERTS'}
              </span>
            </div>

            {/* Empty state */}
            {visibleAlerts.length === 0 && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
                <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto" />
                <h3 className="text-sm font-bold text-white">All Clear</h3>
                <p className="text-xs text-slate-400">
                  No active emergencies. New alerts appear here instantly.
                </p>
              </div>
            )}

            {/* Alert cards */}
            {visibleAlerts.map((alert) => {
              const name           = alert.profiles?.name || 'Unknown Traveler'
              const hasLoc         = alert.lat && alert.lng
              const isActive       = alert.status === 'active'
              const isGuideSafe    = alert.status === 'guide_resolved'
              const isAck          = alert.status === 'acknowledged'

              const cardBorder = isActive   ? 'border-red-800/60'
                               : isGuideSafe? 'border-emerald-800/50'
                               :              'border-amber-800/40'
              const barColor   = isActive   ? 'from-red-500 to-red-800'
                               : isGuideSafe? 'from-emerald-500 to-emerald-800'
                               :              'from-amber-500 to-amber-800'

              return (
                <div
                  key={alert.id}
                  className={`relative bg-slate-900/90 rounded-2xl border overflow-hidden shadow-lg ${cardBorder}`}
                >
                  {/* Left accent bar */}
                  <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${barColor}`} />

                  {/* Card body */}
                  <div className="pl-4 pr-3 pt-3 pb-3">
                    {/* Name + badge */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="text-sm font-extrabold text-white truncate">{name}</span>
                          <StatusBadge status={alert.status} />
                        </div>
                        <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-0.5">
                          {alert.trip_id && (
                            <span className="flex items-center space-x-1">
                              <Route className="w-3 h-3" />
                              <span className="truncate max-w-[90px]">Trip</span>
                            </span>
                          )}
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{timeAgo(alert.created_at)}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Location pill */}
                    {hasLoc && (
                      <div className="mt-2 bg-slate-950/70 rounded-lg px-2.5 py-1 flex items-center
                        space-x-1.5 border border-slate-800 w-fit">
                        <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                        <span className="text-[10px] text-slate-300 font-mono">
                          {alert.lat.toFixed(4)}, {alert.lng.toFixed(4)}
                        </span>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {/* Guide-safe: primary "Confirm safe & close" */}
                      {isGuideSafe && (
                        <button
                          onClick={() => handleConfirmSafe(alert.id)}
                          className="flex-1 min-w-[140px] flex items-center justify-center space-x-1.5 py-2.5 px-3
                            bg-emerald-700 hover:bg-emerald-600 border border-emerald-600
                            text-white text-xs font-bold rounded-xl active:scale-95 transition-all"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Confirm safe &amp; close</span>
                        </button>
                      )}

                      {/* Acknowledge (only active) */}
                      {isActive && (
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          className="flex items-center justify-center space-x-1 py-2 px-3
                            bg-amber-900/60 hover:bg-amber-800/70 border border-amber-700/50
                            text-amber-200 text-xs font-bold rounded-xl active:scale-95 transition-all"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Acknowledge</span>
                        </button>
                      )}

                      {/* Dispatch (active + ack only) */}
                      {(isActive || isAck) && (
                        <button
                          onClick={() => handleDispatch(alert.id)}
                          className="flex items-center justify-center space-x-1 py-2 px-3
                            bg-red-900/70 hover:bg-red-800/80 border border-red-700/50
                            text-red-100 text-xs font-bold rounded-xl active:scale-95 transition-all"
                        >
                          <Siren className="w-3.5 h-3.5" />
                          <span>Dispatch</span>
                        </button>
                      )}

                      {/* Locate */}
                      {hasLoc && (
                        <button
                          onClick={() => handleLocate(alert)}
                          className="flex items-center justify-center space-x-1 py-2 px-3
                            bg-sky-900/60 hover:bg-sky-800/70 border border-sky-700/50
                            text-sky-200 text-xs font-bold rounded-xl active:scale-95 transition-all"
                        >
                          <Locate className="w-3.5 h-3.5" />
                          <span>Locate</span>
                        </button>
                      )}

                      {/* Close (always available) */}
                      <button
                        onClick={() => handleClose(alert.id)}
                        className="flex items-center justify-center space-x-1 py-2 px-3
                          bg-slate-800 hover:bg-slate-700 border border-slate-600
                          text-slate-300 text-xs font-bold rounded-xl active:scale-95 transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Close</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

        </div>{/* end 2-col grid */}
      </div>{/* end max-w wrapper */}
    </div>
  )
}
