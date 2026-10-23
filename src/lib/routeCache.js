/**
 * routeCache.js
 * Fetch a driving route from the public OSRM server through an ordered list of
 * waypoints. Results are cached in memory keyed by the waypoint string.
 *
 * Rate-limit: OSRM demo is public / no key required. One request per trip page
 * load is the expected pattern; caching prevents hammering on re-renders.
 */

// In-memory cache: key → { coordinates: [[lng,lat],…], fallback: bool }
const _cache = new Map()

/**
 * @param {Array<{lat:number,lng:number}>} stops – ordered waypoints (min 2)
 * @returns {Promise<{ coordinates: number[][], fallback: boolean }>}
 *   coordinates: array of [lng, lat] pairs (GeoJSON order) forming the polyline
 *   fallback: true when OSRM failed and straight-line segments are returned
 */
export async function fetchRoute(stops) {
  if (!stops || stops.length < 2) return { coordinates: [], fallback: false }

  const key = stops.map((s) => `${s.lat.toFixed(5)},${s.lng.toFixed(5)}`).join('|')
  if (_cache.has(key)) return _cache.get(key)

  // OSRM coordinate list: lng,lat;lng,lat;…
  const coordStr = stops.map((s) => `${s.lng},${s.lat}`).join(';')
  const url =
    `https://router.project-osrm.org/route/v1/driving/${coordStr}` +
    `?overview=full&geometries=geojson&continue_straight=false`

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(`OSRM ${res.status}`)
    const json = await res.json()
    const route  = json?.routes?.[0]
    const coords = route?.geometry?.coordinates
    if (!coords || coords.length === 0) throw new Error('Empty OSRM response')
    const result = {
      coordinates: coords,
      fallback: false,
      legs: route.legs || [],           // [{distance, duration}, …]
    }
    _cache.set(key, result)
    return result
  } catch (err) {
    console.warn('[routeCache] OSRM failed, using straight-line fallback:', err.message)
    const coords = stops.map((s) => [s.lng, s.lat])
    const result = { coordinates: coords, fallback: true, legs: [] }
    _cache.set(key, result)
    return result
  }
}

/** Clear the in-memory cache (useful after editing a trip) */
export function clearRouteCache() {
  _cache.clear()
}
