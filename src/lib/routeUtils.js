/**
 * routeUtils.js
 * Pure geometry helpers for trip-route features.
 */

import { haversineDistance } from './safetyScore'

/**
 * Minimum distance from point (lat,lng) to a polyline expressed as
 * [lng, lat][] (GeoJSON order).
 *
 * Uses segment-by-segment closest-point math.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {number[][]} coordinates  – [[lng,lat], …]  (GeoJSON order)
 * @returns {number} distance in metres
 */
export function distanceToPolyline(lat, lng, coordinates) {
  if (!coordinates || coordinates.length === 0) return Infinity
  if (coordinates.length === 1) {
    const [cLng, cLat] = coordinates[0]
    return haversineDistance(lat, lng, cLat, cLng)
  }

  let minDist = Infinity

  for (let i = 0; i < coordinates.length - 1; i++) {
    const [aLng, aLat] = coordinates[i]
    const [bLng, bLat] = coordinates[i + 1]

    // Project (lat,lng) onto segment (A,B) and clamp to [0,1]
    const dx = bLng - aLng
    const dy = bLat - aLat
    const len2 = dx * dx + dy * dy
    let t = 0
    if (len2 > 0) {
      t = ((lng - aLng) * dx + (lat - aLat) * dy) / len2
      t = Math.max(0, Math.min(1, t))
    }
    const closestLat = aLat + t * dy
    const closestLng = aLng + t * dx
    const d = haversineDistance(lat, lng, closestLat, closestLng)
    if (d < minDist) minDist = d
  }

  return minDist
}

/**
 * Given an ordered list of stops and the user's current position, find the
 * next stop that hasn't been passed (closest stop ahead by order).
 * "Passed" = within 150 m of the stop.
 *
 * @param {{ lat:number, lng:number, name:string, order:number }[]} stops
 * @param {number} myLat
 * @param {number} myLng
 * @returns {{ stop, distanceM: number } | null}
 */
export function findNextStop(stops, myLat, myLng) {
  if (!stops || stops.length === 0) return null
  const sorted = [...stops].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  for (const stop of sorted) {
    const dist = haversineDistance(myLat, myLng, stop.lat, stop.lng)
    if (dist > 150) {
      return { stop, distanceM: dist }
    }
  }
  return null // all stops within 150 m → trip nearly complete
}

/**
 * Format metres to a human-readable distance string.
 */
export function formatDistance(metres) {
  if (metres < 1000) return `${Math.round(metres)} m`
  return `${(metres / 1000).toFixed(1)} km`
}

/**
 * Convert a [lng,lat][] GeoJSON coordinate array to Leaflet's [lat,lng][] format.
 */
export function geojsonToLeaflet(coordinates) {
  return coordinates.map(([lng, lat]) => [lat, lng])
}
