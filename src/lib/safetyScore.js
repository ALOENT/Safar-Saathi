/**
 * safetyScore.js
 * Pure function that computes a rule-based safety score (0-100).
 *
 * Inputs:
 *   { lat, lng }           – current user coordinates (required)
 *   members                – array of { lat, lng } for group members (optional)
 *   isSolo                 – boolean: user is in solo mode with no group
 *   weatherCode            – WMO weather interpretation code from Open-Meteo (optional)
 *   riskZones              – array of { id, name, lat, lng, radius } (optional)
 *
 * Returns: { score: number, level: 'low'|'moderate'|'high', reasons: string[] }
 */

import riskZones from '../data/riskZones.json'

// ── Haversine distance in metres ──────────────────────────────────────────────
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000 // Earth radius in metres
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Group centroid helper ─────────────────────────────────────────────────────
function groupCentroid(locations) {
  if (!locations || locations.length === 0) return null
  const valid = locations.filter((l) => l && typeof l.lat === 'number' && typeof l.lng === 'number')
  if (valid.length === 0) return null
  const lat = valid.reduce((s, l) => s + l.lat, 0) / valid.length
  const lng = valid.reduce((s, l) => s + l.lng, 0) / valid.length
  return { lat, lng }
}

// ── WMO weather code → is bad weather? ────────────────────────────────────────
// See: https://open-meteo.com/en/docs#weathervariables
// Codes 51-99 cover drizzle, rain, snow, thunderstorm, hail etc.
export function isBadWeather(wmoCode) {
  if (wmoCode == null) return false
  const code = Number(wmoCode)
  // 51-67: rain/drizzle; 71-77: snow; 80-82: rain showers; 85-86: snow showers; 95-99: thunderstorm
  return (code >= 51 && code <= 67) || (code >= 71 && code <= 77) || (code >= 80 && code <= 99)
}

// ── Night-time check ──────────────────────────────────────────────────────────
export function isNightTime(date = new Date()) {
  const hour = date.getHours()
  return hour >= 20 || hour < 5
}

// ── Main pure function ────────────────────────────────────────────────────────
/**
 * @param {object} params
 * @param {number} params.lat
 * @param {number} params.lng
 * @param {Array<{lat:number,lng:number}>} [params.groupLocations=[]]  – all member locs incl. self
 * @param {boolean} [params.isSolo=false]
 * @param {number|null} [params.weatherCode=null]
 * @param {Date} [params.now]   – injectable for testing; defaults to new Date()
 * @returns {{ score: number, level: 'low'|'moderate'|'high', reasons: string[] }}
 */
export function computeSafetyScore({
  lat,
  lng,
  groupLocations = [],
  isSolo = false,
  weatherCode = null,
  now = new Date(),
} = {}) {
  let score = 100
  const reasons = []

  // 1. Night-time penalty
  if (isNightTime(now)) {
    score -= 20
    reasons.push('Travelling after dark (–20)')
  }

  // 2. Bad weather penalty
  if (isBadWeather(weatherCode)) {
    score -= 15
    reasons.push('Adverse weather conditions – rain or storm (–15)')
  }

  // 3. Group distance from centroid penalty (only for group members)
  if (!isSolo && groupLocations.length > 1) {
    const centroid = groupCentroid(groupLocations)
    if (centroid && typeof lat === 'number' && typeof lng === 'number') {
      const dist = haversineDistance(lat, lng, centroid.lat, centroid.lng)
      if (dist > 500) {
        score -= 20
        reasons.push(`Over 500 m from group centre (${Math.round(dist)} m away, –20)`)
      }
    }
  }

  // 4. Solo traveller penalty
  if (isSolo) {
    score -= 10
    reasons.push('Solo traveller – no group safety net (–10)')
  }

  // 5. Inside a risk zone penalty
  if (typeof lat === 'number' && typeof lng === 'number') {
    for (const zone of riskZones) {
      const dist = haversineDistance(lat, lng, zone.lat, zone.lng)
      if (dist <= zone.radius) {
        score -= 25
        reasons.push(`Inside risk zone: ${zone.name} (–25)`)
        break // Only apply once for the first matching zone
      }
    }
  }

  // Clamp score between 0 and 100
  score = Math.max(0, Math.min(100, score))

  const level = score > 70 ? 'low' : score >= 40 ? 'moderate' : 'high'

  return { score, level, reasons }
}
