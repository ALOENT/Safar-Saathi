import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { useTrip } from './TripContext'
import { useLocation } from './LocationContext'

const SOSContext = createContext({})

export const SOSProvider = ({ children }) => {
  const { user, profile } = useAuth()
  const { currentTrip } = useTrip()
  const { myLocation } = useLocation()

  const [alerts, setAlerts] = useState([])
  const [incomingAlert, setIncomingAlert] = useState(null) // latest alert to show banner
  const [sending, setSending] = useState(false)
  const [lastSentAlert, setLastSentAlert] = useState(null) // confirmation for traveler
  const alarmRef = useRef(null)

  const role = profile?.role

  // ---------- Fetch existing active alerts on mount ----------
  const fetchAlerts = useCallback(async () => {
    if (!user) return

    try {
      let query = supabase
        .from('sos_alerts')
        .select('*, profiles:user_id(name, phone)')
        .in('status', ['active', 'acknowledged'])
        .order('created_at', { ascending: false })

      // Guide only sees alerts for their own trip
      if (role === 'guide' && currentTrip?.id) {
        query = query.eq('trip_id', currentTrip.id)
      }

      const { data, error } = await query
      if (error) {
        console.warn('SOS fetch error:', error.message)
        return
      }
      setAlerts(data || [])
    } catch (err) {
      console.error('Unexpected error fetching SOS alerts:', err)
    }
  }, [user, role, currentTrip?.id])

  useEffect(() => {
    if (user && (role === 'guide' || role === 'authority')) {
      fetchAlerts()
    }
  }, [user, role, currentTrip?.id, fetchAlerts])

  // ---------- Realtime subscription ----------
  useEffect(() => {
    if (!user || (role !== 'guide' && role !== 'authority')) return

    const channelName = `sos_realtime_${role}_${user.id}`
    const filterObj = {
      event: 'INSERT',
      schema: 'public',
      table: 'sos_alerts',
    }

    // Guide filters by trip_id
    if (role === 'guide' && currentTrip?.id) {
      filterObj.filter = `trip_id=eq.${currentTrip.id}`
    }

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', filterObj, async (payload) => {
        const newAlert = payload.new

        // Fetch the profile name for the alert
        let alertWithProfile = { ...newAlert, profiles: null }
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('name, phone')
            .eq('id', newAlert.user_id)
            .maybeSingle()
          alertWithProfile.profiles = profileData
        } catch {}

        // Add to list
        setAlerts((prev) => [alertWithProfile, ...prev])

        // Trigger full-screen banner
        setIncomingAlert(alertWithProfile)

        // Vibrate
        if (navigator.vibrate) {
          navigator.vibrate([300, 100, 300, 100, 300])
        }

        // Play alarm sound
        playAlarm()
      })
      // Also listen for updates (status changes) to refresh list
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'sos_alerts',
      }, (payload) => {
        const updated = payload.new
        setAlerts((prev) =>
          prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a))
            .filter((a) => a.status !== 'resolved')
        )
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, role, currentTrip?.id])

  // ---------- Send SOS alert (traveler) ----------
  const sendSOS = async () => {
    if (!user || sending) return { error: new Error('Cannot send SOS') }

    setSending(true)
    try {
      const lat = myLocation?.lat || null
      const lng = myLocation?.lng || null
      const tripId = currentTrip?.id || null

      const { data, error } = await supabase
        .from('sos_alerts')
        .insert({
          user_id: user.id,
          trip_id: tripId,
          lat,
          lng,
        })
        .select()
        .single()

      if (error) {
        console.error('SOS insert error:', error.message)
        return { error }
      }

      setLastSentAlert(data)
      return { data, error: null }
    } catch (err) {
      console.error('Unexpected SOS error:', err)
      return { error: err }
    } finally {
      setSending(false)
    }
  }

  // ---------- Resolve / acknowledge ----------
  const resolveAlert = async (alertId) => {
    try {
      const { error } = await supabase
        .from('sos_alerts')
        .update({ status: 'resolved' })
        .eq('id', alertId)

      if (error) {
        console.error('Resolve error:', error.message)
        return { error }
      }

      setAlerts((prev) => prev.filter((a) => a.id !== alertId))
      // Dismiss banner if it matches
      if (incomingAlert?.id === alertId) {
        dismissBanner()
      }
      return { error: null }
    } catch (err) {
      return { error: err }
    }
  }

  // ---------- Alarm sound ----------
  const playAlarm = () => {
    try {
      // Use Web Audio API for alarm tone
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const playTone = (freq, startTime, duration) => {
        const osc = audioCtx.createOscillator()
        const gain = audioCtx.createGain()
        osc.connect(gain)
        gain.connect(audioCtx.destination)
        osc.type = 'square'
        osc.frequency.value = freq
        gain.gain.value = 0.3
        osc.start(audioCtx.currentTime + startTime)
        osc.stop(audioCtx.currentTime + startTime + duration)
      }
      // Siren pattern
      for (let i = 0; i < 4; i++) {
        playTone(880, i * 0.5, 0.2)
        playTone(660, i * 0.5 + 0.25, 0.2)
      }
    } catch (err) {
      console.warn('Audio alert failed:', err)
    }
  }

  // ---------- Dismiss banner ----------
  const dismissBanner = () => {
    setIncomingAlert(null)
  }

  // ---------- Clear last sent (traveler clears confirmation) ----------
  const clearLastSent = () => {
    setLastSentAlert(null)
  }

  return (
    <SOSContext.Provider
      value={{
        alerts,
        incomingAlert,
        sending,
        lastSentAlert,
        sendSOS,
        resolveAlert,
        dismissBanner,
        clearLastSent,
        fetchAlerts,
      }}
    >
      {children}
    </SOSContext.Provider>
  )
}

export const useSOS = () => useContext(SOSContext)
