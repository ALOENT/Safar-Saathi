/**
 * weatherCache.js
 * Fetches current weather from Open-Meteo (no API key required).
 * Caches results for 10 minutes to avoid excessive requests.
 *
 * Returns the WMO weathercode integer (or null on failure).
 */

const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

let cache = {
  weatherCode: null,
  fetchedAt: 0,
  lat: null,
  lng: null,
}

/**
 * Fetches the current WMO weather code for the given coordinates.
 * Uses a 10-minute in-memory cache keyed to the last fetched position.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<number|null>} WMO weathercode or null on error
 */
export async function getWeatherCode(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null

  const now = Date.now()
  const cacheAge = now - cache.fetchedAt
  const samePosition =
    cache.lat != null &&
    Math.abs(cache.lat - lat) < 0.05 &&
    Math.abs(cache.lng - lng) < 0.05

  // Return cached value if fresh enough and for roughly the same location
  if (cache.weatherCode !== null && cacheAge < CACHE_TTL_MS && samePosition) {
    return cache.weatherCode
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&current_weather=true&timezone=auto`
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) })

    if (!response.ok) throw new Error(`Open-Meteo responded with ${response.status}`)

    const data = await response.json()
    const code = data?.current_weather?.weathercode ?? null

    cache = {
      weatherCode: code,
      fetchedAt: Date.now(),
      lat,
      lng,
    }

    return code
  } catch (err) {
    console.warn('[weatherCache] Failed to fetch weather:', err.message)
    // Return stale cached value if available, otherwise null
    return cache.weatherCode
  }
}

/** Force-clear the cache (useful for testing) */
export function clearWeatherCache() {
  cache = { weatherCode: null, fetchedAt: 0, lat: null, lng: null }
}
