import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { useTrip } from './TripContext'
import { useLocation } from './LocationContext'

const SOSContext = createContext({})

// Statuses the guide sees for their trip
const GUIDE_ACTIVE_STATUSES = ['active', 'acknowledged']
// Statuses authority sees
const AUTHORITY_ACTIVE_STATUSES = ['active', 'acknowledged', 'guide_resolved']

export const SOSProvider = ({ children }) => {
  const { user, profile } = useAuth()
  const { currentTrip, isGuide } = useTrip()
  const { myLocation } = useLocation()

  const [alerts, setAlerts] = useState([])
  const [incomingAlert, setIncomingAlert] = useState(null)
  const [sending, setSending] = useState(false)
  const [lastSentAlert, setLastSentAlert] = useState(null)

  // For regular users: track the status of their own latest SOS
  const [myAlertStatus, setMyAlertStatus] = useState(null)
  const myAlertIdRef = useRef(null)

  const isAuthority = profile?.role === 'authority'

  // ── Fetch alerts ──────────────────────────────────────────────────────────
  const fetchAlerts = useCallback(async () => {
    if (!user) return

    try {
      let query = supabase
        .from('sos_alerts')
        .select('*, profiles:user_id(name, phone)')
        .order('created_at', { ascending: false })

      if (isAuthority) {
        query = query.in('status', AUTHORITY_ACTIVE_STATUSES)
      } else if (isGuide) {
        if (!currentTrip?.id) return
        query = query
          .in('status', GUIDE_ACTIVE_STATUSES)
          .eq('trip_id', currentTrip.id)
      } else {
        // Normal user – just fetch their own alerts for Alerts tab
        query = query.eq('user_id', user.id).limit(20)
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
  }, [user, isAuthority, isGuide, currentTrip?.id])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  // ── Realtime subscription for guide / authority ───────────────────────────
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

      .on('postgres_changes', insertFilter, async (payload) => {
        const newAlert = payload.new

        let alertWithProfile = { ...newAlert, profiles: null }
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('name, phone')
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

      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sos_alerts' },
        (payload) => {
          const updated = payload.new
          setAlerts((prev) => {
            if (updated.status === 'resolved') {
              return prev.filter((a) => a.id !== updated.id)
            }
            if (isGuide && updated.status === 'guide_resolved') {
              return prev.filter((a) => a.id !== updated.id)
            }
            const exists = prev.find((a) => a.id === updated.id)
            if (exists) {
              return prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a))
            }
            return prev
          })
        }
      )

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

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, isAuthority, isGuide, currentTrip?.id])

  // ── Watch own alert for status updates (regular user) ────────────────────
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
          setMyAlertStatus(updated.status)
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
      const lat = myLocation?.lat ?? null
      const lng = myLocation?.lng ?? null
      const tripId = currentTrip?.id || null

      const { data, error } = await supabase
        .from('sos_alerts')
        .insert({ user_id: user.id, trip_id: tripId, lat, lng })
        .select()
        .single()

      if (error) {
        console.error('SOS insert error:', error.message)
        return { error }
      }

      myAlertIdRef.current = data.id
      setMyAlertStatus('active')
      setLastSentAlert(data)
      return { data, error: null }
    } catch (err) {
      console.error('Unexpected SOS error:', err)
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

      if (error) {
        console.error('Guide resolve error:', error.message)
        return { error }
      }

      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: 'guide_resolved', guide_resolved_at: new Date().toISOString() } : a))
      )
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

      if (error) {
        console.error('Acknowledge error:', error.message)
        return { error }
      }

      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: 'acknowledged' } : a))
      )
      return { error: null }
    } catch (err) {
      return { error: err }
    }
  }

  // ── Authority: fully resolve ──────────────────────────────────────────────
  const resolveAlert = async (alertId) => {
    try {
      const { error } = await supabase
        .from('sos_alerts')
        .update({
          status: 'resolved',
          closed_by: user?.id,
          closed_at: new Date().toISOString(),
        })
        .eq('id', alertId)

      if (error) {
        console.error('Resolve error:', error.message)
        return { error }
      }

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
      for (let i = 0; i < 4; i++) {
        playTone(880, i * 0.5, 0.2)
        playTone(660, i * 0.5 + 0.25, 0.2)
      }
    } catch (err) {
      console.warn('Audio alert failed:', err)
    }
  }

  const dismissBanner = () => setIncomingAlert(null)
  const clearLastSent = () => setLastSentAlert(null)
  const clearMyAlertStatus = () => setMyAlertStatus(null)

  return (
    <SOSContext.Provider
      value={{
        alerts,
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
