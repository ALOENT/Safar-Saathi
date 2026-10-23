/**
 * CreateTripWizard.jsx  –  fully reworked
 * 3-step wizard: 1 Basics  2 Route  3 Review
 *
 * APIs used:
 *   Photon (Komoot) – place search, no key needed, ~1 req/400 ms debounce
 *   Nominatim – fallback on Enter / button press only
 *   OSRM public – route drawing, cached in routeCache.js
 */
import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react'
import {
  MapContainer, TileLayer, Marker, Polyline,
  useMapEvents, useMap,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  ChevronRight, ChevronLeft, Search, MapPin, Clock, Navigation,
  CheckCircle2, Loader2, AlertCircle, Flag, Trash2, LocateFixed,
  Plus, Calendar, ArrowRight, Info, X,
} from 'lucide-react'
import { fetchRoute } from '../lib/routeCache'
import { geojsonToLeaflet } from '../lib/routeUtils'
import { useLocation as useGeoLocation } from '../context/LocationContext'

// ─── Leaflet icon fix ──────────────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const makeStopIcon = (n, draft = false) => L.divIcon({
  className: '',
  html: `<div style="
    width:30px;height:30px;border-radius:50%;
    background:${draft ? '#f59e0b' : '#16a34a'};
    border:2px solid ${draft ? '#fde68a' : '#bbf7d0'};
    color:white;display:flex;align-items:center;justify-content:center;
    font-size:12px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,.5);
    cursor:pointer
  ">${draft ? '+' : n}</div>`,
  iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -16],
})

// ─── Date helpers ──────────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, '0')

function localDateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
function localTimeStr(d) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function buildISO(dateStr, timeStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  const [h, min]  = (timeStr || '00:00').split(':').map(Number)
  const dt = new Date(y, m - 1, d, h, min)
  return dt.toISOString()
}

function daysDiff(isoA, isoB) {
  if (!isoA || !isoB) return null
  const diff = (new Date(isoB) - new Date(isoA)) / 86400000
  return diff
}

function fmtDateRange(startISO, endISO) {
  if (!startISO) return ''
  const s = new Date(startISO)
  const sStr = s.toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
  if (!endISO) return sStr
  const e    = new Date(endISO)
  const eStr = e.toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
  const days = Math.round((e - s) / 86400000)
  const dLabel = days === 1 ? '1 day' : `${days} days`
  return `${sStr} → ${eStr} (${dLabel})`
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return localDateStr(d)
}

// ─── Photon + Nominatim search hook ───────────────────────────────────────
function usePlaceSearch(mapCenterRef) {
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState([])
  const [status,   setStatus]   = useState('idle') // idle | searching | empty | error
  const timerRef  = useRef(null)
  const abortRef  = useRef(null)

  const doPhoton = useCallback(async (q, signal, center) => {
    let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=en`
    if (center) url += `&lat=${center[0]}&lon=${center[1]}`
    const res  = await fetch(url, { signal })
    const json = await res.json()
    return (json.features || []).map((f) => ({
      id:       f.properties.osm_id || Math.random(),
      name:     f.properties.name   || f.properties.city || q,
      secondary:[f.properties.city, f.properties.state, f.properties.country].filter(Boolean).join(', '),
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
    }))
  }, [])

  const doNominatim = useCallback(async (q, signal) => {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&q=${encodeURIComponent(q)}`
    const res  = await fetch(url, { headers: { 'Accept-Language': 'en' }, signal })
    const json = await res.json()
    return json.map((r) => ({
      id:       r.place_id,
      name:     r.display_name.split(',')[0],
      secondary: r.display_name.split(',').slice(1, 3).join(',').trim(),
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
    }))
  }, [])

  const search = useCallback((q) => {
    setQuery(q)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (q.length < 3) { setResults([]); setStatus('idle'); return }

    timerRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort()
      abortRef.current = new AbortController()
      setStatus('searching')
      try {
        const center = mapCenterRef.current
        const res = await doPhoton(q, abortRef.current.signal, center)
        if (res.length === 0) setStatus('empty')
        else { setResults(res); setStatus('idle') }
      } catch (e) {
        if (e.name !== 'AbortError') setStatus('error')
      }
    }, 400)
  }, [doPhoton, mapCenterRef])

  const searchNominatim = useCallback(async (q) => {
    if (!q.trim()) return
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()
    setStatus('searching')
    try {
      const res = await doNominatim(q, abortRef.current.signal)
      if (res.length === 0) setStatus('empty')
      else { setResults(res); setStatus('idle') }
    } catch (e) {
      if (e.name !== 'AbortError') setStatus('error')
    }
  }, [doNominatim])

  const clear = () => { setQuery(''); setResults([]); setStatus('idle') }

  return { query, results, status, search, searchNominatim, clear, setQuery }
}

// ─── Map internal helpers ──────────────────────────────────────────────────
function MapEvents({ onTap }) {
  useMapEvents({ click: (e) => onTap(e.latlng.lat, e.latlng.lng) })
  return null
}

function MapController({ flyTo, fitBounds, onFlown, onFitted }) {
  const map = useMap()
  const prevFlyRef = useRef(null)
  const prevFitRef = useRef(null)

  useEffect(() => {
    if (!flyTo) return
    const key = flyTo.join(',')
    if (key === prevFlyRef.current) return
    prevFlyRef.current = key
    map.flyTo(flyTo, 14, { animate: true, duration: 0.8 })
    if (onFlown) onFlown()
  }, [flyTo, map, onFlown])

  useEffect(() => {
    if (!fitBounds) return
    const key = JSON.stringify(fitBounds)
    if (key === prevFitRef.current) return
    prevFitRef.current = key
    map.fitBounds(fitBounds, { padding: [30, 30], animate: true })
    if (onFitted) onFitted()
  }, [fitBounds, map, onFitted])

  return null
}

function InvalidateSize({ active }) {
  const map = useMap()
  useEffect(() => {
    if (active) setTimeout(() => map.invalidateSize(), 120)
    const handler = () => map.invalidateSize()
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [active, map])
  return null
}

// ─── Stepper ──────────────────────────────────────────────────────────────
const STEP_LABELS = ['Basics', 'Route', 'Review']
function StepBar({ step }) {
  return (
    <div className="flex items-center px-2 py-3 border-b border-slate-800/60">
      {STEP_LABELS.map((label, i) => (
        <React.Fragment key={label}>
          <div className="flex flex-col items-center min-w-[52px]">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
              i < step  ? 'bg-emerald-600 border-emerald-400 text-white'
              : i === step ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
              : 'bg-slate-900 border-slate-700 text-slate-500'
            }`}>
              {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-[10px] mt-0.5 font-semibold ${
              i === step ? 'text-emerald-400' : i < step ? 'text-emerald-600' : 'text-slate-600'
            }`}>{label}</span>
          </div>
          {i < STEP_LABELS.length - 1 && (
            <div className={`h-0.5 flex-1 mx-1 mb-4 transition-all ${i < step ? 'bg-emerald-600' : 'bg-slate-800'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

// ─── Field wrapper ─────────────────────────────────────────────────────────
function Field({ label, required, error, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-xs font-semibold text-slate-300">
        {label}
        {required && <span className="text-red-400">*</span>}
        {hint && <span className="text-slate-500 font-normal normal-case">{hint}</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  )
}

function Input({ value, onChange, placeholder, required, type = 'text', min, max, className = '' }) {
  return (
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder}
      required={required} min={min} max={max}
      className={`w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-sm text-white
        focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20
        placeholder:text-slate-600 ${className}`}
    />
  )
}

function Textarea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value} onChange={onChange} placeholder={placeholder} rows={rows}
      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-sm text-white
        focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20
        placeholder:text-slate-600 resize-none"
    />
  )
}

// ─── STEP 1: Basics ────────────────────────────────────────────────────────
function StepBasics({ form, setForm, errors }) {
  const onChange = (field, val) => setForm(p => ({ ...p, [field]: val, _errs: { ...p._errs, [field]: '' } }))

  // Date chips
  const today   = localDateStr(new Date())
  const tmrw    = addDays(today, 1)
  const weekend = (() => {
    const d = new Date(); const day = d.getDay()
    const diff = day === 6 ? 0 : 6 - day
    return localDateStr(new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff))
  })()

  const setStart = (ds) => setForm(p => {
    const newEnd = !p.endDate || p.endDate < ds ? addDays(ds, 1) : p.endDate
    return { ...p, startDate: ds, endDate: newEnd }
  })
  const setDuration = (days) => setForm(p => {
    if (!p.startDate) return p
    return { ...p, endDate: addDays(p.startDate, days) }
  })

  const startISO = buildISO(form.startDate, form.startTime)
  const endISO   = buildISO(form.endDate,   form.meetingTime) // reuse meeting time slot for end, store separately
  const endISOActual = buildISO(form.endDate, form.startTime)

  const rangeLabel = fmtDateRange(startISO, endISOActual)

  return (
    <div className="space-y-5 pb-4">
      {/* Trip name */}
      <Field label="Trip Name" required error={errors.name}>
        <Input value={form.name} onChange={e => onChange('name', e.target.value)}
          placeholder="e.g. Shimla Heritage Tour 2026" />
      </Field>

      {/* Destination */}
      <Field label="Destination" required error={errors.destination}>
        <Input value={form.destination} onChange={e => onChange('destination', e.target.value)}
          placeholder="e.g. Shimla, Himachal Pradesh" />
      </Field>

      {/* Dates */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-slate-300">Dates</p>

        {/* Quick chips */}
        <div className="flex flex-wrap gap-2">
          {[['Today', today], ['Tomorrow', tmrw], ['This Sat', weekend]].map(([lbl, ds]) => (
            <button key={lbl} type="button" onClick={() => setStart(ds)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
                form.startDate === ds
                  ? 'bg-emerald-700 border-emerald-500 text-white'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
              }`}>{lbl}</button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Start Date" required error={errors.startDate}>
            <Input type="date" value={form.startDate} onChange={e => setStart(e.target.value)} />
          </Field>
          <Field label="Start Time" required>
            <Input type="time" value={form.startTime} onChange={e => onChange('startTime', e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="End Date" required error={errors.endDate}>
            <Input type="date" value={form.endDate} min={form.startDate}
              onChange={e => onChange('endDate', e.target.value)} />
          </Field>
          <Field label="Meeting Time" hint="(optional)">
            <Input type="time" value={form.meetingTime} onChange={e => onChange('meetingTime', e.target.value)} />
          </Field>
        </div>

        {/* Duration chips */}
        <div className="flex flex-wrap gap-2">
          {[['1 day', 1], ['2 days', 2], ['3 days', 3], ['1 week', 7]].map(([lbl, n]) => (
            <button key={lbl} type="button" onClick={() => setDuration(n)}
              className="px-3 py-1.5 rounded-full text-[11px] font-semibold border bg-slate-900 border-slate-700 text-slate-300 hover:border-emerald-600 hover:text-emerald-300 transition-all">
              {lbl}
            </button>
          ))}
        </div>

        {/* Live summary */}
        {rangeLabel && (
          <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-xl px-3 py-2.5 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
            <p className="text-xs text-emerald-200 leading-relaxed">{rangeLabel}</p>
          </div>
        )}
      </div>

      {/* Meeting point */}
      <Field label="Meeting Point" hint="(optional)">
        <Input value={form.meeting_point} onChange={e => onChange('meeting_point', e.target.value)}
          placeholder="e.g. Platform 2, New Delhi Station" />
      </Field>

      {/* Description */}
      <Field label="Description" hint="(optional)">
        <Textarea value={form.description} onChange={e => onChange('description', e.target.value)}
          placeholder="A short description for your travelers…" />
      </Field>

      {/* Notes */}
      <Field label="Notes" hint="(optional)">
        <Textarea value={form.notes} onChange={e => onChange('notes', e.target.value)}
          placeholder="Packing tips, contact info, emergency numbers…" />
      </Field>

      {/* Cover image placeholder */}
      <div className="border-2 border-dashed border-slate-700 rounded-2xl p-5 text-center space-y-1">
        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mx-auto">
          <Plus className="w-5 h-5 text-slate-500" />
        </div>
        <p className="text-xs font-semibold text-slate-400">Cover Image</p>
        <p className="text-[10px] text-slate-600">Cloudinary upload coming soon</p>
      </div>
    </div>
  )
}

// ─── STEP 2: Route ─────────────────────────────────────────────────────────
function StepRoute({ stops, setStops, active }) {
  const { myLocation } = useGeoLocation()
  const mapCenterRef   = useRef([20.5937, 78.9629])
  const mapRef         = useRef(null)
  const { query, results, status, search, searchNominatim, clear, setQuery } = usePlaceSearch(mapCenterRef)
  const [showDrop,    setShowDrop]    = useState(false)
  const [flyTo,       setFlyTo]       = useState(null)
  const [fitBounds,   setFitBounds]   = useState(null)
  const [draft,       setDraft]       = useState(null)   // {lat,lng,name}
  const [routeCoords, setRouteCoords] = useState([])
  const [routeInfo,   setRouteInfo]   = useState(null)   // {distKm, durMin, fallback}
  const [editIdx,     setEditIdx]     = useState(null)
  const [confirmDel,  setConfirmDel]  = useState(null)

  // Update map center ref on fly
  useEffect(() => { if (flyTo) mapCenterRef.current = flyTo }, [flyTo])

  // Compute initial center
  const initCenter = useMemo(() => {
    if (stops.length > 0) return [stops[0].lat, stops[0].lng]
    if (myLocation)       return [myLocation.lat, myLocation.lng]
    return [20.5937, 78.9629]
  }, []) // only on mount

  // Fetch route when stops change
  const stopsKey = stops.map(s => `${s.lat},${s.lng}`).join('|')
  useEffect(() => {
    if (stops.length < 2) { setRouteCoords([]); setRouteInfo(null); return }
    let alive = true
    fetchRoute(stops.map(s => ({ lat: s.lat, lng: s.lng }))).then(r => {
      if (!alive) return
      const coords = geojsonToLeaflet(r.coordinates)
      setRouteCoords(coords)
      // Calculate bounds for fit
      if (coords.length > 1) {
        const lat1 = Math.min(...coords.map(c => c[0]))
        const lat2 = Math.max(...coords.map(c => c[0]))
        const lng1 = Math.min(...coords.map(c => c[1]))
        const lng2 = Math.max(...coords.map(c => c[1]))
        setFitBounds([[lat1, lng1],[lat2, lng2]])
      }
      // Parse OSRM distance / duration
      if (!r.fallback && r.legs) {
        const distKm  = (r.legs.reduce((s, l) => s + l.distance, 0) / 1000).toFixed(1)
        const durMin  = Math.round(r.legs.reduce((s, l) => s + l.duration, 0) / 60)
        setRouteInfo({ distKm, durMin, fallback: false })
      } else if (!r.fallback) {
        setRouteInfo({ distKm: null, durMin: null, fallback: false })
      } else {
        setRouteInfo({ fallback: true })
      }
    })
    return () => { alive = false }
  }, [stopsKey])

  // Reverse geocode for map taps
  const reverseGeocode = async (lat, lng) => {
    try {
      const r = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`, { signal: AbortSignal.timeout(5000) })
      const j = await r.json()
      const f = j.features?.[0]?.properties
      return f ? (f.name || f.city || `Pinned (${lat.toFixed(4)}, ${lng.toFixed(4)})`) : `Pinned (${lat.toFixed(4)}, ${lng.toFixed(4)})`
    } catch {
      return `Pinned (${lat.toFixed(4)}, ${lng.toFixed(4)})`
    }
  }

  const handleMapTap = async (lat, lng) => {
    const name = await reverseGeocode(lat, lng)
    setDraft({ lat, lng, name })
    setShowDrop(false)
    clear()
  }

  const handleResultClick = (r) => {
    setDraft({ lat: r.lat, lng: r.lng, name: r.name })
    setFlyTo([r.lat, r.lng])
    setShowDrop(false)
    clear()
  }

  const commitDraft = () => {
    if (!draft) return
    setStops(prev => [...prev, { name: draft.name, lat: draft.lat, lng: draft.lng, order: prev.length + 1, planned_time: '', note: '' }])
    setDraft(null)
  }

  const useMyLocation = () => {
    if (!myLocation) return
    setDraft({ lat: myLocation.lat, lng: myLocation.lng, name: 'My current location' })
    setFlyTo([myLocation.lat, myLocation.lng])
  }

  const removeStop = (idx) => {
    setStops(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 })))
    setConfirmDel(null)
    if (editIdx === idx) setEditIdx(null)
  }
  const moveStop = (from, to) => {
    if (to < 0 || to >= stops.length) return
    setStops(prev => {
      const a = [...prev]; const [x] = a.splice(from, 1); a.splice(to, 0, x)
      return a.map((s, i) => ({ ...s, order: i + 1 }))
    })
  }
  const updateStop = (idx, field, val) =>
    setStops(prev => prev.map((s, i) => i === idx ? { ...s, [field]: val } : s))

  const focusStop = (s) => setFlyTo([s.lat, s.lng])

  return (
    <div className="flex flex-col gap-0">
      {/* ── Map (fixed height) ── */}
      <div className="relative" style={{ height: 'clamp(280px,40vw,420px)' }}>
        <MapContainer
          center={initCenter}
          zoom={stops.length > 0 ? 10 : 5}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <InvalidateSize active={active} />
          <MapController
            flyTo={flyTo}
            fitBounds={fitBounds}
            onFlown={() => setFlyTo(null)}
            onFitted={() => setFitBounds(null)}
          />
          <MapEvents onTap={handleMapTap} />

          {/* Committed stops */}
          {stops.map((s, i) => (
            <Marker key={`s-${i}`} position={[s.lat, s.lng]} icon={makeStopIcon(i + 1)}
              eventHandlers={{ click: () => focusStop(s) }}
            />
          ))}

          {/* Draft marker */}
          {draft && <Marker position={[draft.lat, draft.lng]} icon={makeStopIcon(0, true)} />}

          {/* Route */}
          {routeCoords.length > 1 && (
            <Polyline positions={routeCoords}
              pathOptions={{ color: '#22c55e', weight: 4, opacity: 0.8, dashArray: routeInfo?.fallback ? '8 6' : undefined }} />
          )}
        </MapContainer>

        {/* ── Search bar floating over map ── */}
        <div className="absolute top-3 left-3 right-3 z-[2000]">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => { search(e.target.value); setShowDrop(true) }}
              onFocus={() => { if (results.length) setShowDrop(true) }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); searchNominatim(query) } }}
              placeholder="Search a place…"
              className="w-full bg-slate-900/95 backdrop-blur border border-slate-600 rounded-xl pl-9 pr-24 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 shadow-xl"
            />
            <div className="absolute right-2 top-1.5 flex gap-1">
              {query && (
                <button type="button" onClick={() => { clear(); setShowDrop(false) }}
                  className="p-1.5 text-slate-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              {myLocation && (
                <button type="button" onClick={useMyLocation} title="Use my location"
                  className="p-1.5 text-emerald-400 hover:text-emerald-300">
                  <LocateFixed className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Search dropdown */}
          {showDrop && (
            <div className="mt-1 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl z-[2001]">
              {status === 'searching' && (
                <div className="px-4 py-3 flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching…
                </div>
              )}
              {status === 'empty' && (
                <div className="px-4 py-3 text-xs text-slate-400">
                  No results. Try a nearby city or tap the map.
                </div>
              )}
              {status === 'error' && (
                <div className="px-4 py-3 flex items-center justify-between text-xs text-red-300">
                  <span>Search failed.</span>
                  <button type="button" onClick={() => searchNominatim(query)} className="underline">Retry</button>
                </div>
              )}
              {status === 'idle' && results.map(r => (
                <button key={r.id} type="button" onClick={() => handleResultClick(r)}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-800 border-b border-slate-800/60 last:border-0 flex items-start gap-2.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{r.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{r.secondary}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Draft card at bottom of map ── */}
        {draft && (
          <div className="absolute bottom-3 left-3 right-3 z-[2000]
            bg-slate-900/95 backdrop-blur border border-amber-600/60 rounded-xl p-3
            flex items-center justify-between shadow-xl">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-amber-400 font-bold uppercase mb-0.5">Draft stop</p>
              <p className="text-xs font-semibold text-white truncate">{draft.name}</p>
            </div>
            <div className="flex gap-2 ml-2 shrink-0">
              <button type="button" onClick={() => setDraft(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 text-xs font-semibold">
                Cancel
              </button>
              <button type="button" onClick={commitDraft}
                className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-bold">
                Add Stop
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Route stats */}
      {routeInfo && !routeInfo.fallback && (routeInfo.distKm || routeInfo.durMin) && (
        <div className="flex items-center gap-4 px-4 py-2 bg-emerald-950/50 border-b border-slate-800">
          {routeInfo.distKm && <span className="text-xs text-emerald-300 font-semibold">{routeInfo.distKm} km</span>}
          {routeInfo.durMin && <span className="text-xs text-slate-400">{routeInfo.durMin < 60 ? `${routeInfo.durMin} min` : `${Math.floor(routeInfo.durMin/60)}h ${routeInfo.durMin%60}m`}</span>}
        </div>
      )}
      {routeInfo?.fallback && (
        <div className="px-4 py-2 bg-amber-950/40 border-b border-amber-900/40">
          <p className="text-[11px] text-amber-400">⚠ Road route unavailable, showing straight lines</p>
        </div>
      )}

      {/* ── Stops list ── */}
      <div className="p-4 space-y-2">
        {stops.length === 0 ? (
          <div className="border-2 border-dashed border-slate-700 rounded-2xl p-8 text-center">
            <MapPin className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-400">No stops yet</p>
            <p className="text-xs text-slate-600 mt-1">Search above or tap the map to add stops</p>
          </div>
        ) : (
          stops.map((stop, idx) => (
            <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              {/* Stop header */}
              <div className="flex items-center p-3 gap-3">
                <button type="button" onClick={() => focusStop(stop)}
                  className="w-7 h-7 rounded-full bg-emerald-900 border border-emerald-700 text-emerald-300 text-[11px] font-bold flex items-center justify-center shrink-0 hover:bg-emerald-800">
                  {idx + 1}
                </button>
                <div className="flex-1 min-w-0">
                  {editIdx === idx ? (
                    <input
                      type="text"
                      value={stop.name}
                      onChange={e => updateStop(idx, 'name', e.target.value)}
                      className="w-full bg-slate-950 border border-emerald-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                    />
                  ) : (
                    <p className="text-sm font-bold text-white truncate">{stop.name}</p>
                  )}
                  <p className="text-[10px] text-slate-500">
                    {idx === 0 ? '● Start' : idx === stops.length - 1 ? '● Destination' : `Stop ${idx + 1}`}
                  </p>
                </div>
                {/* Reorder */}
                <div className="flex items-center gap-0.5">
                  <button type="button" onClick={() => moveStop(idx, idx - 1)} disabled={idx === 0}
                    className="p-1.5 text-slate-500 hover:text-white disabled:opacity-20 rounded">
                    <ChevronRight className="w-3.5 h-3.5 -rotate-90" />
                  </button>
                  <button type="button" onClick={() => moveStop(idx, idx + 1)} disabled={idx === stops.length - 1}
                    className="p-1.5 text-slate-500 hover:text-white disabled:opacity-20 rounded">
                    <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                  </button>
                  <button type="button" onClick={() => setEditIdx(editIdx === idx ? null : idx)}
                    className="p-1.5 text-slate-500 hover:text-emerald-400 rounded">
                    <Clock className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => setConfirmDel(idx)}
                    className="p-1.5 text-slate-500 hover:text-red-400 rounded">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Expanded edit area */}
              {editIdx === idx && (
                <div className="border-t border-slate-800 px-3 pb-3 pt-2 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold">Planned time</label>
                      <input type="time" value={stop.planned_time}
                        onChange={e => updateStop(idx, 'planned_time', e.target.value)}
                        className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold">Note</label>
                      <input type="text" value={stop.note}
                        onChange={e => updateStop(idx, 'note', e.target.value)}
                        placeholder="Optional note"
                        className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500" />
                    </div>
                  </div>
                  <button type="button" onClick={() => setEditIdx(null)}
                    className="text-[11px] text-emerald-400 hover:underline">Done</button>
                </div>
              )}

              {/* Confirm delete */}
              {confirmDel === idx && (
                <div className="border-t border-red-900/50 bg-red-950/40 px-3 py-2 flex items-center justify-between">
                  <p className="text-xs text-red-300">Remove "{stop.name}"?</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setConfirmDel(null)} className="text-[11px] text-slate-400 hover:text-white">Keep</button>
                    <button type="button" onClick={() => removeStop(idx)} className="text-[11px] text-red-400 font-bold hover:text-red-200">Remove</button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── STEP 3: Review ────────────────────────────────────────────────────────
function StepReview({ form, stops, routeInfo }) {
  const startISO = buildISO(form.startDate, form.startTime)
  const endISO   = buildISO(form.endDate,   form.startTime)
  const range    = fmtDateRange(startISO, endISO)
  const mapCenter = stops.length > 0 ? [stops[0].lat, stops[0].lng] : [20.5937, 78.9629]
  const [routeCoords, setRouteCoords] = useState([])

  useEffect(() => {
    if (stops.length < 2) return
    fetchRoute(stops.map(s => ({ lat: s.lat, lng: s.lng }))).then(r =>
      setRouteCoords(geojsonToLeaflet(r.coordinates))
    )
  }, [stops.length])

  const fmtTime = (t) => t ? new Date(`2000-01-01T${t}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—'

  return (
    <div className="space-y-4 pb-4">
      {/* Trip summary */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Flag className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white">Trip Details</h3>
        </div>
        {[
          ['Name',          form.name],
          ['Destination',   form.destination],
          ['Dates',         range],
          ['Meeting point', form.meeting_point],
          ['Meeting time',  fmtTime(form.meetingTime)],
        ].map(([l, v]) => v ? (
          <div key={l} className="flex gap-3 text-xs">
            <span className="text-slate-500 w-24 shrink-0">{l}</span>
            <span className="text-slate-200 flex-1 leading-relaxed">{v}</span>
          </div>
        ) : null)}
        {form.description && (
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 leading-relaxed">
            {form.description}
          </div>
        )}
        {form.notes && (
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 leading-relaxed">
            <span className="text-slate-500 font-semibold">Notes: </span>{form.notes}
          </div>
        )}
      </div>

      {/* Route */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">{stops.length} Stop{stops.length !== 1 ? 's' : ''}</h3>
          </div>
          {routeInfo && !routeInfo.fallback && routeInfo.distKm && (
            <span className="text-xs text-emerald-300 font-semibold">{routeInfo.distKm} km · {routeInfo.durMin < 60 ? `${routeInfo.durMin}m` : `${Math.floor(routeInfo.durMin/60)}h ${routeInfo.durMin%60}m`}</span>
          )}
        </div>

        {stops.length === 0 ? (
          <p className="text-xs text-slate-500">No stops added — you can add them later by editing.</p>
        ) : (
          <>
            {/* Mini map */}
            <div className="rounded-xl overflow-hidden border border-slate-800" style={{ height: 160 }}>
              <MapContainer center={mapCenter} zoom={stops.length > 1 ? 7 : 12} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {stops.map((s, i) => <Marker key={i} position={[s.lat, s.lng]} icon={makeStopIcon(i + 1)} />)}
                {routeCoords.length > 1 && (
                  <Polyline positions={routeCoords} pathOptions={{ color: '#22c55e', weight: 3, opacity: 0.85 }} />
                )}
              </MapContainer>
            </div>
            {/* Timeline */}
            <div className="space-y-2 mt-1">
              {stops.map((s, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <span className="w-6 h-6 rounded-full bg-emerald-900 border border-emerald-700 text-emerald-300 text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    {i < stops.length - 1 && <div className="w-0.5 h-4 bg-emerald-900/50 mt-0.5" />}
                  </div>
                  <div className="pb-1">
                    <p className="text-xs font-bold text-white">{s.name}</p>
                    {s.planned_time && <p className="text-[10px] text-slate-500 mt-0.5">{fmtTime(s.planned_time)}</p>}
                    {s.note && <p className="text-[10px] text-slate-600 italic">{s.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── MAIN WIZARD ───────────────────────────────────────────────────────────
const tomorrow = () => {
  const d = new Date(); d.setDate(d.getDate() + 1)
  return localDateStr(d)
}

function initForm(data) {
  if (data) {
    // Parse existing ISO dates back to date/time parts
    const sd = data.start_date ? new Date(data.start_date) : null
    const ed = data.end_date   ? new Date(data.end_date)   : null
    return {
      name:          data.name          || '',
      destination:   data.destination   || '',
      description:   data.description   || '',
      meeting_point: data.meeting_point || '',
      notes:         data.notes         || '',
      startDate:     sd ? localDateStr(sd) : tomorrow(),
      startTime:     sd ? localTimeStr(sd) : '08:00',
      endDate:       ed ? localDateStr(ed) : addDays(sd ? localDateStr(sd) : tomorrow(), 1),
      meetingTime:   '',
      _errs:         {},
    }
  }
  const tmrw = tomorrow()
  return {
    name: '', destination: '', description: '', meeting_point: '', notes: '',
    startDate: tmrw, startTime: '08:00', endDate: addDays(tmrw, 1), meetingTime: '',
    _errs: {},
  }
}

export function CreateTripWizard({ onDone, onCreate, initialData }) {
  const [step,        setStep]        = useState(0)
  const [form,        setForm]        = useState(() => initForm(initialData))
  const [stops,       setStops]       = useState(() =>
    Array.isArray(initialData?.route)
      ? [...initialData.route].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      : []
  )
  const [routeInfo,   setRouteInfo]   = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [saveError,   setSaveError]   = useState('')

  const validate = () => {
    const e = {}
    if (!form.name.trim())        e.name        = 'Trip name is required'
    if (!form.destination.trim()) e.destination = 'Destination is required'
    if (!form.startDate)          e.startDate   = 'Start date is required'
    if (!form.endDate)            e.endDate     = 'End date is required'
    if (form.startDate && form.endDate && form.endDate < form.startDate)
      e.endDate = 'End date must be after start date'
    setForm(p => ({ ...p, _errs: e }))
    return Object.keys(e).length === 0
  }

  const next = () => {
    if (step === 0 && !validate()) return
    setStep(s => s + 1)
  }
  const back = () => setStep(s => s - 1)

  const handleSave = async () => {
    setSaving(true); setSaveError('')
    const startISO = buildISO(form.startDate, form.startTime)
    const endISO   = buildISO(form.endDate, form.startTime)
    const payload  = {
      name:          form.name.trim(),
      destination:   form.destination.trim(),
      description:   form.description || null,
      meeting_point: form.meeting_point || null,
      notes:         form.notes || null,
      start_date:    startISO || null,
      end_date:      endISO   || null,
      route:         stops.length ? stops.map((s, i) => ({ ...s, order: i + 1 })) : null,
    }
    const res = await onCreate(payload)
    setSaving(false)
    if (res?.error) setSaveError(res.error.message || 'Save failed. Please try again.')
    else onDone()
  }

  const isEdit = !!initialData

  return (
    <div className="flex flex-col min-h-0" style={{ maxHeight: 'calc(100vh - 120px)' }}>
      <StepBar step={step} />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {step === 0 && (
          <div className="p-4">
            <StepBasics form={form} setForm={setForm} errors={form._errs || {}} />
          </div>
        )}
        {step === 1 && (
          <StepRoute stops={stops} setStops={setStops} active={step === 1} />
        )}
        {step === 2 && (
          <div className="p-4">
            <StepReview form={form} stops={stops} routeInfo={routeInfo} />
          </div>
        )}
      </div>

      {/* Error bar */}
      {saveError && (
        <div className="px-4 py-2 bg-red-950/80 border-t border-red-800/60 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-xs text-red-300">{saveError}</p>
        </div>
      )}

      {/* ── Sticky bottom nav (48px) ── */}
      <div className="shrink-0 flex items-center gap-3 px-4 border-t border-slate-800 bg-slate-950"
        style={{ height: 64, paddingBottom: 'env(safe-area-inset-bottom,0px)' }}>
        {step > 0 && (
          <button type="button" onClick={back} disabled={saving}
            className="flex-1 h-12 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold rounded-xl flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-50">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        )}
        {step < 2 ? (
          <button type="button" onClick={next}
            className="flex-1 h-12 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-sm transition-all shadow-lg shadow-emerald-900/40">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button type="button" onClick={handleSave} disabled={saving}
            className="flex-1 h-12 bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white font-extrabold rounded-xl flex items-center justify-center gap-2 text-sm transition-all shadow-xl shadow-emerald-900/50 disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Trip'}
          </button>
        )}
      </div>
    </div>
  )
}
