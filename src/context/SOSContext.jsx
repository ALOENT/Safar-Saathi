import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { useTrip } from './TripContext'
import { useLocation } from './LocationContext'

const SOSContext = createContext({})

// Statuses the guide sees for their trip
const GUIDE_ACTIVE_STATUSES    = ['active', 'acknowledged']
// Statuses authority sees
const AUTHORITY_ACTIVE_STATUSES = ['active', 'acknowledged', 'guide_resolved']

export const SOSProvider = ({ children }) => {
  const { user, profile } = useAuth()
  // isGuide from TripContext: currentTrip.created_by === user.id
  const { currentTrip, isGuide } = useTrip()
  const { myLocation } = useLocation()

  const [alerts, setAlerts]           = useState([])
  const [myOwnAlerts, setMyOwnAlerts] = useState([])  // traveler's personal SOS history
  const [fetchError, setFetchError]   = useState(null) // last fetch error for consumers
  const [fetchLoading, setFetchLoading] = useState(true) // true until first fetch completes
  const [incomingAlert, setIncomingAlert] = useState(null)
  const [sending, setSending]         = useState(false)
  const [lastSentAlert, setLastSentAlert] = useState(null)
  const [myAlertStatus, setMyAlertStatus] = useState(null)
  const myAlertIdRef = useRef(null)

  const isAuthority = profile?.role === 'authority'

  // ── Fetch alerts ─────────────────────────────────────────────────────────
  // `alerts` = what the guide/authority sees.
  // `myOwnAlerts` = the current user's own sent SOS history (for Alerts tab).
  const fetchAlerts = useCallback(async () => {
    if (!user) { setFetchLoading(false); return }

    setFetchError(null)
    setFetchLoading(true)
    try {
      // 1. Always fetch user's own SOS history
      const { data: ownData, error: ownError } = await supabase
        .from('sos_alerts')
        .select('*, profiles:user_id(name, phone, avatar_url)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30)
      if (ownError) {
        setFetchError(ownError.message)
      } else {
        setMyOwnAlerts(ownData || [])
      }

      // 2. Guide or Authority: fetch trip-scoped / all alerts
      if (isAuthority) {
        const { data, error } = await supabase
          .from('sos_alerts')
          .select('*, profiles:user_id(name, phone, avatar_url)')
          .in('status', AUTHORITY_ACTIVE_STATUSES)
          .order('created_at', { ascending: false })
        if (error) setFetchError(error.message)
        else setAlerts(data || [])

      } else if (isGuide && currentTrip?.id) {
        const { data, error } = await supabase
          .from('sos_alerts')
          .select('*, profiles:user_id(name, phone, avatar_url)')
          .in('status', GUIDE_ACTIVE_STATUSES)
          .eq('trip_id', currentTrip.id)
          .order('created_at', { ascending: false })
        if (error) setFetchError(error.message)
        else setAlerts(data || [])

      } else {
        // Regular member or solo: alerts state is unused (only myOwnAlerts matters)
        setAlerts([])
      }
    } catch (err) {
      console.error('Unexpected error fetching SOS alerts:', err)
      setFetchError(err.message || 'Unexpected error')
    } finally {
      setFetchLoading(false)
    }
  }, [user, isAuthority, isGuide, currentTrip?.id])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  // ── Realtime subscription (guide and authority only) ─────────────────────
  useEffect(() => {
    if (!user) return
    if (!isAuthority && !isGuide) return
    if (isGuide && !currentTrip?.id) return

    const channelName = `sos_realtime_${user.id}_${currentTrip?.id || 'auth'}`

    const insertFilter = isGuide
      ? { event: 'INSERT', schema: 'public', table: 'sos_alerts', filter: `trip_id=eq.${currentTrip.id}` }
      : { event: 'INSERT', schema: 'public', table: 'sos_alerts' }

    const channel = supabase
      .channel(channelName)

      // New SOS inserted
      .on('postgres_changes', insertFilter, async (payload) => {
        const newAlert = payload.new
        let alertWithProfile = { ...newAlert, profiles: null }
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('name, phone, avatar_url')
            .eq('id', newAlert.user_id)
            .maybeSingle()
          alertWithProfile.profiles = profileData
        } catch {}

        setAlerts((prev) => {
          if (prev.find((a) => a.id === newAlert.id)) return prev
          return [alertWithProfile, ...prev]
        })
        setIncomingAlert(alertWithProfile)
        if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300])
        playAlarm()
      })

      // Status update
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sos_alerts' },
        (payload) => {
          const updated = payload.new
          setAlerts((prev) => {
            if (updated.status === 'resolved') return prev.filter((a) => a.id !== updated.id)
            if (isGuide && updated.status === 'guide_resolved') return prev.filter((a) => a.id !== updated.id)
            const exists = prev.find((a) => a.id === updated.id)
            if (exists) return prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a))
            return prev
          })
        }
      )

      // Hard delete
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'sos_alerts' },
        (payload) => {
          const deletedId = payload.old?.id
          if (deletedId) {
            setAlerts((prev) => prev.filter((a) => a.id !== deletedId))
            if (incomingAlert?.id === deletedId) dismissBanner()
          }
        }
      )

      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, isAuthority, isGuide, currentTrip?.id])

  // ── Watch own alert for status updates (traveler) ─────────────────────────
  useEffect(() => {
    if (!user || isAuthority) return

    const loadMyAlert = async () => {
      const { data } = await supabase
        .from('sos_alerts')
        .select('id, status')
        .eq('user_id', user.id)
        .in('status', ['active', 'acknowledged', 'guide_resolved'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (data) {
        myAlertIdRef.current = data.id
        setMyAlertStatus(data.status)
      }
    }
    loadMyAlert()

    const channel = supabase
      .channel(`user_own_alert_${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sos_alerts', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const updated = payload.new
          // Only update myAlertStatus when this is the current active alert
          if (myAlertIdRef.current && updated.id === myAlertIdRef.current) {
            setMyAlertStatus(updated.status)
          }
          // Always patch myOwnAlerts so MyAlertRow re-renders immediately
          setMyOwnAlerts((prev) =>
            prev.map((a) => (a.id === updated.id ? { ...a, status: updated.status } : a))
          )
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user?.id, isAuthority])

  // ── Send SOS ─────────────────────────────────────────────────────────────
  const sendSOS = async () => {
    if (!user || sending) return { error: new Error('Cannot send SOS') }
    setSending(true)
    try {
      const lat    = myLocation?.lat ?? null
      const lng    = myLocation?.lng ?? null
      const tripId = currentTrip?.id || null

      const { data, error } = await supabase
        .from('sos_alerts')
        .insert({ user_id: user.id, trip_id: tripId, lat, lng })
        .select()
        .single()

      if (error) return { error }
      myAlertIdRef.current = data.id
      setMyAlertStatus('active')
      setLastSentAlert(data)
      // Add to own history immediately
      setMyOwnAlerts((prev) => [data, ...prev])
      return { data, error: null }
    } catch (err) {
      return { error: err }
    } finally {
      setSending(false)
    }
  }

  // ── Guide: "Traveler is safe" → guide_resolved ────────────────────────────
  const guideResolveAlert = async (alertId) => {
    try {
      const { error } = await supabase
        .from('sos_alerts')
        .update({ status: 'guide_resolved', guide_resolved_at: new Date().toISOString() })
        .eq('id', alertId)
      if (error) return { error }
      // Remove from guide's active list (guide only sees active + acknowledged)
      setAlerts((prev) => prev.filter((a) => a.id !== alertId))
      if (incomingAlert?.id === alertId) dismissBanner()
      return { error: null }
    } catch (err) {
      return { error: err }
    }
  }

  // ── Authority: acknowledge ────────────────────────────────────────────────
  const acknowledgeAlert = async (alertId) => {
    try {
      const { error } = await supabase
        .from('sos_alerts')
        .update({ status: 'acknowledged' })
        .eq('id', alertId)
      if (error) return { error }
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: 'acknowledged' } : a))
      )
      return { error: null }
    } catch (err) {
      return { error: err }
    }
  }

  // ── Authority / Guide: fully resolve → closed ─────────────────────────────
  const resolveAlert = async (alertId) => {
    try {
      const { error } = await supabase
        .from('sos_alerts')
        .update({ status: 'resolved', closed_by: user?.id, closed_at: new Date().toISOString() })
        .eq('id', alertId)
      if (error) return { error }
      setAlerts((prev) => prev.filter((a) => a.id !== alertId))
      if (incomingAlert?.id === alertId) dismissBanner()
      return { error: null }
    } catch (err) {
      return { error: err }
    }
  }

  // ── Alarm sound ───────────────────────────────────────────────────────────
  const playAlarm = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const playTone = (freq, startTime, duration) => {
        const osc  = audioCtx.createOscillator()
        const gain = audioCtx.createGain()
        osc.connect(gain)
        gain.connect(audioCtx.destination)
        osc.type = 'square'
        osc.frequency.value = freq
        gain.gain.value     = 0.3
        osc.start(audioCtx.currentTime + startTime)
        osc.stop(audioCtx.currentTime  + startTime + duration)
      }
      for (let i = 0; i < 4; i++) {
        playTone(880, i * 0.5, 0.2)
        playTone(660, i * 0.5 + 0.25, 0.2)
      }
    } catch {}
  }

  const dismissBanner      = ()  => setIncomingAlert(null)
  const clearLastSent      = ()  => setLastSentAlert(null)
  const clearMyAlertStatus = ()  => setMyAlertStatus(null)

  return (
    <SOSContext.Provider
      value={{
        alerts,         // guide/authority-scoped active alerts
        myOwnAlerts,    // traveler's personal SOS history
        fetchError,     // last fetch error string or null
        fetchLoading,   // true while first fetch is in flight
        incomingAlert,
        sending,
        lastSentAlert,
        myAlertStatus,
        isGuide,
        sendSOS,
        guideResolveAlert,
        resolveAlert,
        acknowledgeAlert,
        dismissBanner,
        clearLastSent,
        clearMyAlertStatus,
        fetchAlerts,
        playAlarm,
      }}
    >
      {children}
    </SOSContext.Provider>
  )
}

export const useSOS = () => useContext(SOSContext)
