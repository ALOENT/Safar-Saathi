import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { useTrip } from './TripContext'

const LocationContext = createContext({})

const UPSERT_THROTTLE_MS = 5000 // Throttle upserts to max once every 5 seconds

export const LocationProvider = ({ children }) => {
  const { user } = useAuth()
  const { currentTrip } = useTrip()

  // State for user's own location
  const [myLocation, setMyLocation] = useState(null)
  const [locationError, setLocationError] = useState(null)

  // Sharing location toggle (default true)
  const [isSharing, setIsSharing] = useState(() => {
    const saved = localStorage.getItem('safarsathi_location_sharing')
    return saved === null ? true : saved === 'true'
  })

  // Watcher ref
  const watchIdRef = useRef(null)
  const lastUpsertRef = useRef(0)

  // Save sharing preference to localStorage
  useEffect(() => {
    localStorage.setItem('safarsathi_location_sharing', isSharing ? 'true' : 'false')
  }, [isSharing])

  // Function to upsert user's location to Supabase locations table
  const upsertLocation = async (lat, lng, accuracy) => {
    if (!user) return

    const now = Date.now()
    if (now - lastUpsertRef.current < UPSERT_THROTTLE_MS) {
      return // Throttled
    }
    lastUpsertRef.current = now

    const tripId = currentTrip?.id || null

    try {
      const { error } = await supabase.from('locations').upsert({
        user_id: user.id,
        trip_id: tripId,
        lat: lat,
        lng: lng,
        accuracy: accuracy || null,
        updated_at: new Date().toISOString(),
      })

      if (error) {
        console.warn('Supabase locations upsert issue (schema might be pending):', error.message)
        // Fallback to local cache so prototype works seamlessly
        const cacheKey = `safarsathi_loc_${user.id}`
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            user_id: user.id,
            trip_id: tripId,
            lat,
            lng,
            accuracy,
            updated_at: new Date().toISOString(),
          })
        )
      }
    } catch (err) {
      console.error('Unexpected error upserting location:', err)
    }
  }

  // Start watching location
  const startWatching = () => {
    if (!navigator.geolocation) {
      setLocationError({
        type: 'UNSUPPORTED',
        code: 0,
        message: 'Geolocation is not supported by your browser or device.',
      })
      return
    }

    // Clear existing watch if any
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }

    setLocationError(null)

    const successHandler = (position) => {
      const { latitude: lat, longitude: lng, accuracy } = position.coords
      const timestamp = position.timestamp || Date.now()

      const newLoc = { lat, lng, accuracy, timestamp }
      setMyLocation(newLoc)
      setLocationError(null)

      if (isSharing && user) {
        upsertLocation(lat, lng, accuracy)
      }
    }

    const errorHandler = (err) => {
      console.warn('Geolocation error:', err.code, err.message)
      let type = 'UNKNOWN'
      let message = err.message || 'Unable to retrieve location.'

      switch (err.code) {
        case 1: // PERMISSION_DENIED
          type = 'PERMISSION_DENIED'
          message = 'Location access was denied. Please enable location permissions in your browser settings.'
          break
        case 2: // POSITION_UNAVAILABLE
          type = 'POSITION_UNAVAILABLE'
          message = 'GPS signal is currently unavailable. Ensure device location/GPS is enabled.'
          break
        case 3: // TIMEOUT
          type = 'TIMEOUT'
          message = 'Location request timed out. Retrying...'
          break
        default:
          type = 'UNKNOWN'
      }

      setLocationError({ type, code: err.code, message })
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 3000,
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      successHandler,
      errorHandler,
      options
    )
  }

  // Stop watching location
  const stopWatching = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }

  // Trigger watching based on sharing toggle and user state
  useEffect(() => {
    if (user && isSharing) {
      startWatching()
    } else {
      stopWatching()
    }

    return () => {
      // If sharing is OFF when component unmounts, stop watching.
      // If sharing is ON, keep watching running in app context!
      if (!isSharing) {
        stopWatching()
      }
    }
  }, [user?.id, isSharing, currentTrip?.id])

  // Toggle location sharing ON / OFF
  const toggleSharing = () => {
    setIsSharing((prev) => !prev)
  }

  // Set mock position for testing / desktop without GPS
  const setMockPosition = (lat = 28.6139, lng = 77.209) => {
    const mockLoc = {
      lat: lat + (Math.random() - 0.5) * 0.005,
      lng: lng + (Math.random() - 0.5) * 0.005,
      accuracy: 15,
      timestamp: Date.now(),
    }
    setMyLocation(mockLoc)
    setLocationError(null)
    if (isSharing && user) {
      upsertLocation(mockLoc.lat, mockLoc.lng, mockLoc.accuracy)
    }
  }

  return (
    <LocationContext.Provider
      value={{
        myLocation,
        locationError,
        isSharing,
        toggleSharing,
        startWatching,
        stopWatching,
        setMockPosition,
      }}
    >
      {children}
    </LocationContext.Provider>
  )
}

export const useLocation = () => useContext(LocationContext)
