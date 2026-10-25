/**
 * TripDetailsPage.jsx – polished trip details view
 */
import React, { useState, useEffect } from 'react'
import {
  MapContainer, TileLayer, Marker, Polyline, useMap,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Flag, MapPin, Calendar, Users, Copy, Check, Share2, Crown, Phone,
  Clock, Navigation, AlertTriangle, Edit2, Loader2, Info, ChevronDown,
  ChevronUp, FileText,
} from 'lucide-react'
import { useTrip }  from '../context/TripContext'
import { useAuth }  from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { fetchRoute }       from '../lib/routeCache'
import { geojsonToLeaflet } from '../lib/routeUtils'
import { cld } from '../lib/cloudinary'

// ─── Leaflet icon fix ──────────────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const makeStopIcon = (n) => L.divIcon({
  className: '',
  html: `<div style="width:26px;height:26px;border-radius:50%;background:#16a34a;border:2px solid #bbf7d0;color:white;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,.5)">${n}</div>`,
  iconSize: [26, 26], iconAnchor: [13, 13],
})

// ─── Status helpers ────────────────────────────────────────────────────────
function tripStatus(trip) {
  if (!trip?.is_active) return { label: 'Ended',    cls: 'bg-slate-800 border-slate-600 text-slate-400' }
  const now = Date.now()
  const s   = trip.start_date ? new Date(trip.start_date).getTime() : 0
  const e   = trip.end_date   ? new Date(trip.end_date).getTime()   : Infinity
  if (now < s) return { label: 'Upcoming', cls: 'bg-blue-950 border-blue-700 text-blue-300' }
  if (now <= e) return { label: 'Ongoing',  cls: 'bg-emerald-950 border-emerald-700 text-emerald-300' }
  return               { label: 'Ended',    cls: 'bg-slate-800 border-slate-600 text-slate-400' }
}

function fmtDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

function daysRange(a, b) {
  if (!a || !b) return null
  const d = Math.round((new Date(b) - new Date(a)) / 86400000)
  return d === 1 ? '1 day' : `${d} days`
}

// ─── Auto-fit map bounds ───────────────────────────────────────────────────
function FitBounds({ coords, stops }) {
  const map = useMap()
  useEffect(() => {
    const pts = coords.length > 0 ? coords : stops.map(s => [s.lat, s.lng])
    if (pts.length < 2) return
    map.fitBounds(pts, { padding: [20, 20], animate: false })
  }, []) // only on mount
  return null
}

// ─── Section ──────────────────────────────────────────────────────────────
function Card({ children, className = '' }) {
  return (
    <div className={`bg-slate-900/80 border border-slate-800 rounded-2xl ${className}`}>
      {children}
    </div>
  )
}

function SectionHeader({ icon: Icon, title, right }) {
  return (
    <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-800/60">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-emerald-400 shrink-0" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">{title}</h3>
      </div>
      {right}
    </div>
  )
}

function Row({ label, value, children }) {
  if (!value && !children) return null
  return (
    <div className="flex items-start gap-3 text-xs">
      <span className="text-slate-500 w-28 shrink-0 mt-0.5">{label}</span>
      <span className="text-slate-200 flex-1 leading-relaxed">{value || children}</span>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────
export function TripDetailsPage({ onEdit, onEnd, onLeave }) {
  const { currentTrip: trip, members, isGuide } = useTrip()
  const { user }      = useAuth()
  const { addToast }  = useToast()

  const [copied,       setCopied]       = useState(false)
  const [routeCoords,  setRouteCoords]  = useState([])
  const [routeInfo,    setRouteInfo]    = useState(null)
  const [memberExpand, setMemberExpand] = useState(false)

  const stops = Array.isArray(trip?.route)
    ? [...trip.route].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : []

  useEffect(() => {
    if (stops.length < 2) return
    fetchRoute(stops.map(s => ({ lat: s.lat, lng: s.lng }))).then(r => {
      setRouteCoords(geojsonToLeaflet(r.coordinates))
      if (!r.fallback && r.legs) {
        const distKm = (r.legs.reduce((s, l) => s + l.distance, 0) / 1000).toFixed(1)
        const durMin = Math.round(r.legs.reduce((s, l) => s + l.duration, 0) / 60)
        setRouteInfo({ distKm, durMin, fallback: false })
      } else {
        setRouteInfo({ fallback: !!r.fallback })
      }
    })
  }, [trip?.id, stops.length])

  if (!trip) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="text-sm text-slate-400">Loading trip…</p>
      </div>
    )
  }

  const status      = tripStatus(trip)
  const mapCenter   = stops.length > 0 ? [stops[0].lat, stops[0].lng] : [20.5937, 78.9629]
  const guideMember = members.find(m => m.user_id === trip.created_by)
  const guideName   = guideMember?.name  || 'Guide'
  const guidePhone  = guideMember?.phone || ''
  const range       = `${fmtDate(trip.start_date) || '—'} → ${fmtDate(trip.end_date) || '—'}`
  const duration    = daysRange(trip.start_date, trip.end_date)

  const handleCopy = () => {
    navigator.clipboard.writeText(trip.code)
    setCopied(true)
    addToast('Trip code copied!', 'success')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    const text = `Join my SafarSaathi trip "${trip.name}" – code: ${trip.code}`
    if (navigator.share) {
      try { await navigator.share({ title: 'SafarSaathi Trip', text }) } catch {}
    } else {
      navigator.clipboard.writeText(text)
      addToast('Share text copied!', 'success')
    }
  }

  const fmtTime = (t) => {
    if (!t) return null
    // If it's a full ISO string
    if (t.includes('T') || t.includes('-')) return new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    // If it's HH:MM
    return new Date(`2000-01-01T${t}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }

  return (
    <div className="space-y-3 pb-4">

      {/* ── Cover image (if set) ── */}
      {trip.cover_url && (
        <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
          <img
            src={cld(trip.cover_url, 'w_800,h_300,c_fill,f_auto,q_auto')}
            alt={trip.name}
            className="w-full h-36 object-cover"
          />
        </div>
      )}

      {/* ── Hero header ── */}
      <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 border border-emerald-800/60 rounded-2xl p-5 shadow-xl space-y-4">
        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.cls}`}>
            {status.label}
          </span>
          {isGuide && (
            <span className="flex items-center gap-1 bg-amber-950/80 border border-amber-700/50 text-amber-300 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              <Crown className="w-2.5 h-2.5" /> Guide
            </span>
          )}
        </div>

        {/* Name */}
        <div>
          <h2 className="text-2xl font-extrabold text-white leading-tight">{trip.name}</h2>
          {trip.destination && (
            <p className="text-xs text-emerald-300 mt-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" />{trip.destination}
            </p>
          )}
        </div>

        {/* Dates summary */}
        <div className="bg-slate-950/60 border border-slate-700/60 rounded-xl px-3 py-2.5 space-y-1">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Dates</p>
          <p className="text-xs text-white font-semibold leading-relaxed">{range}</p>
          {duration && <p className="text-[11px] text-emerald-400 font-semibold">{duration}</p>}
        </div>

        {/* Trip code */}
        <div className="flex items-center justify-between bg-slate-950/60 border border-emerald-800/40 rounded-xl px-4 py-3">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Trip Code</p>
            <p className="text-2xl font-black text-emerald-400 tracking-widest font-mono mt-0.5">{trip.code}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCopy}
              className="p-2.5 bg-emerald-900/60 hover:bg-emerald-800 border border-emerald-700/50 rounded-xl text-emerald-300 transition-all">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
            <button onClick={handleShare}
              className="p-2.5 bg-emerald-900/60 hover:bg-emerald-800 border border-emerald-700/50 rounded-xl text-emerald-300 transition-all">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Meeting point ── */}
      {trip.meeting_point && (
        <Card>
          <SectionHeader icon={MapPin} title="Meeting Point" />
          <div className="px-4 py-3">
            <p className="text-sm text-white font-semibold">{trip.meeting_point}</p>
          </div>
        </Card>
      )}

      {/* ── Guide ── */}
      <Card>
        <SectionHeader icon={Crown} title="Your Guide" />
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {guideMember?.avatar_url ? (
              <img
                src={cld(guideMember.avatar_url, 'w_80,h_80,c_fill,g_face,f_auto,q_auto')}
                alt={guideName}
                className="w-10 h-10 rounded-full object-cover border-2 border-amber-700/60"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-amber-950 border border-amber-700/60 flex items-center justify-center text-sm font-bold text-amber-300">
                {guideName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-bold text-white">{guideName}</p>
              <p className="text-[10px] text-slate-400">Trip Guide</p>
            </div>
          </div>
          {guidePhone ? (
            <a href={`tel:${guidePhone}`}
              className="flex items-center gap-1.5 bg-emerald-900/60 hover:bg-emerald-800/80 border border-emerald-700/50 px-3.5 py-2.5 rounded-xl text-emerald-300 text-xs font-bold transition-all">
              <Phone className="w-3.5 h-3.5" /> Call
            </a>
          ) : (
            <span className="text-[10px] text-slate-600 italic">No phone on record</span>
          )}
        </div>
      </Card>

      {/* ── Route + map ── */}
      {stops.length > 0 && (
        <Card>
          <SectionHeader
            icon={Navigation}
            title={`Route · ${stops.length} stop${stops.length !== 1 ? 's' : ''}`}
            right={routeInfo && !routeInfo.fallback && routeInfo.distKm ? (
              <span className="text-xs text-emerald-300 font-semibold">
                {routeInfo.distKm} km
                {routeInfo.durMin ? ` · ${routeInfo.durMin < 60 ? `${routeInfo.durMin}m` : `${Math.floor(routeInfo.durMin/60)}h ${routeInfo.durMin%60}m`}` : ''}
              </span>
            ) : null}
          />

          {/* Mini map */}
          <div className="h-44 border-b border-slate-800">
            <MapContainer center={mapCenter} zoom={stops.length > 1 ? 8 : 12}
              style={{ height: '100%', width: '100%' }} scrollWheelZoom={false} zoomControl={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <FitBounds coords={routeCoords} stops={stops} />
              {stops.map((s, i) => <Marker key={i} position={[s.lat, s.lng]} icon={makeStopIcon(i + 1)} />)}
              {routeCoords.length > 1 && (
                <Polyline positions={routeCoords}
                  pathOptions={{ color: '#22c55e', weight: 3, opacity: 0.85 }} />
              )}
            </MapContainer>
          </div>
          {routeInfo?.fallback && (
            <div className="px-4 py-1.5 bg-amber-950/30 text-[11px] text-amber-400 border-b border-slate-800">
              Road route unavailable — showing straight lines
            </div>
          )}

          {/* Stop timeline */}
          <div className="px-4 py-3 space-y-0">
            {stops.map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <span className="w-6 h-6 rounded-full bg-emerald-900 border border-emerald-700 text-emerald-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-1">{i + 1}</span>
                  {i < stops.length - 1 && <div className="w-px h-5 bg-emerald-900/50" />}
                </div>
                <div className="pb-3 flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">
                    {s.name}
                    <span className="ml-2 text-[9px] font-normal text-slate-500 uppercase tracking-wider">
                      {i === 0 ? 'Start' : i === stops.length - 1 ? 'End' : ''}
                    </span>
                  </p>
                  {s.planned_time && (
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {fmtTime(s.planned_time)}
                    </p>
                  )}
                  {s.note && <p className="text-[10px] text-slate-500 italic mt-0.5">{s.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Description / Notes ── */}
      {(trip.description || trip.notes) && (
        <Card>
          <SectionHeader icon={Info} title="About this Trip" />
          <div className="px-4 py-3 space-y-3">
            {trip.description && (
              <p className="text-sm text-slate-200 leading-relaxed">{trip.description}</p>
            )}
            {trip.notes && (
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-500">Notes</p>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{trip.notes}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── Members ── */}
      <Card>
        <SectionHeader
          icon={Users}
          title={`Members (${members.length})`}
          right={
            <button onClick={() => setMemberExpand(p => !p)}
              className="text-slate-400 hover:text-white p-1">
              {memberExpand ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          }
        />
        <div className={`overflow-hidden transition-all ${memberExpand ? '' : 'max-h-40'}`}>
          <div className="px-4 py-3 space-y-2">
            {members.map((m, i) => {
              const isCreator = m.user_id === trip.created_by
              const avatarUrl = m.avatar_url
                ? cld(m.avatar_url, 'w_80,h_80,c_fill,g_face,f_auto,q_auto')
                : null
              return (
                <div key={m.id || i}
                  className={`flex items-center justify-between p-2.5 rounded-xl border ${
                    isCreator
                      ? 'bg-amber-950/30 border-amber-800/50'
                      : 'bg-slate-950/60 border-slate-800/60'
                  }`}>
                  <div className="flex items-center gap-2.5">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={m.name}
                        className={`w-8 h-8 rounded-full object-cover border ${
                          isCreator ? 'border-amber-700/50' : 'border-emerald-700/50'
                        }`}
                      />
                    ) : (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${
                        isCreator ? 'bg-amber-950 text-amber-300 border-amber-700/50' : 'bg-emerald-950 text-emerald-300 border-emerald-700/50'
                      }`}>
                        {isCreator ? '🚩' : (m.name?.charAt(0).toUpperCase() || '?')}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold text-white">{m.name}</p>
                      <p className="text-[10px] text-slate-400">{isCreator ? 'Guide' : 'Member'}</p>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#22c55e]" />
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      {/* ── Guide actions ── */}
      {isGuide && (
        <div className="space-y-2">
          <button onClick={onEdit}
            className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm transition-all">
            <Edit2 className="w-4 h-4 text-emerald-400" /> Edit Trip
          </button>
          <button onClick={onEnd}
            className="w-full bg-slate-950 hover:bg-red-950/40 border border-slate-800 hover:border-red-900/60 text-slate-400 hover:text-red-300 font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm transition-all">
            <AlertTriangle className="w-4 h-4 text-red-400" /> End Trip for Everyone
          </button>
        </div>
      )}

      {/* ── Member leave ── */}
      {!isGuide && onLeave && (
        <button onClick={onLeave}
          className="w-full bg-slate-950 hover:bg-red-950/40 border border-slate-800 hover:border-red-900/60 text-slate-400 hover:text-red-300 font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center text-sm transition-all">
          Leave Trip
        </button>
      )}
    </div>
  )
}
