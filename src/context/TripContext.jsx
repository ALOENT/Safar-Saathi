import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const TripContext = createContext({})

const generateTripCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export const TripProvider = ({ children }) => {
  const { user, profile } = useAuth()
  const [currentTrip, setCurrentTrip] = useState(null)
  const [members, setMembers] = useState([])
  const [isSolo, setIsSolo] = useState(false)
  const [loading, setLoading] = useState(true)

  // ── Derived: is user the creator of the current trip? ────────────────────
  const isGuide = !!(user && currentTrip && currentTrip.created_by === user.id)

  // ── Fetch members for a trip ──────────────────────────────────────────────
  const fetchMembersForTrip = async (tripId) => {
    if (!tripId) return

    try {
      const { data: allMembers, error: membersErr } = await supabase
        .from('trip_members')
        .select('id, user_id, role, joined_at')
        .eq('trip_id', tripId)

      if (!membersErr && allMembers) {
        const userIds = allMembers.map((m) => m.user_id)
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, name, phone, role, avatar_url')
          .in('id', userIds)

        const formattedMembers = allMembers.map((m) => {
          const p = profilesData?.find((prof) => prof.id === m.user_id)
          return {
            ...m,
            name: p?.name || (m.user_id === user?.id ? profile?.name || 'You' : 'Traveler'),
            phone: p?.phone || '',
            userRole: p?.role || m.role || 'traveler',
            avatar_url: p?.avatar_url || null,
          }
        })

        setMembers(formattedMembers)
      }
    } catch (err) {
      console.error('Error fetching members:', err)
    }
  }

  // ── Fetch active trip for user ────────────────────────────────────────────
  const fetchActiveTrip = async () => {
    if (!user) {
      setCurrentTrip(null)
      setMembers([])
      setIsSolo(false)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data: memberRows, error: memberErr } = await supabase
        .from('trip_members')
        .select('trip_id, role, joined_at')
        .eq('user_id', user.id)

      if (memberErr) {
        console.warn('Supabase trip_members query issue:', memberErr.message)
        const storedMock = localStorage.getItem(`safar_trip_${user.id}`)
        if (storedMock) {
          const parsed = JSON.parse(storedMock)
          setCurrentTrip(parsed.trip)
          setMembers(parsed.members || [])
          setIsSolo(false)
        } else {
          const soloFlag = localStorage.getItem(`safar_solo_${user.id}`) === 'true'
          setIsSolo(soloFlag)
          setCurrentTrip(null)
          setMembers([])
        }
        setLoading(false)
        return
      }

      if (memberRows && memberRows.length > 0) {
        // Find the active trip among all memberships
        const tripIds = memberRows.map((r) => r.trip_id)

        const { data: tripsData, error: tripsErr } = await supabase
          .from('trips')
          .select('*')
          .in('id', tripIds)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle()

        if (tripsErr || !tripsData) {
          // No active trip found
          setCurrentTrip(null)
          setMembers([])
          const soloFlag = localStorage.getItem(`safar_solo_${user.id}`) === 'true'
          setIsSolo(soloFlag)
        } else {
          setCurrentTrip(tripsData)
          localStorage.setItem(`safar_trip_${user.id}`, JSON.stringify({ trip: tripsData }))
          await fetchMembersForTrip(tripsData.id)
          setIsSolo(false)
        }
      } else {
        setCurrentTrip(null)
        setMembers([])
        const soloFlag = localStorage.getItem(`safar_solo_${user.id}`) === 'true'
        setIsSolo(soloFlag)
      }
    } catch (err) {
      console.error('Error fetching active trip:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActiveTrip()
  }, [user?.id])

  // ── Realtime: trip_members changes ────────────────────────────────────────
  useEffect(() => {
    if (!currentTrip?.id) return

    const channelName = `trip_members_realtime_${currentTrip.id}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_members',
          filter: `trip_id=eq.${currentTrip.id}`,
        },
        () => {
          fetchMembersForTrip(currentTrip.id)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentTrip?.id])

  // ── Realtime: trip is_active=false (guide ends trip) ─────────────────────
  useEffect(() => {
    if (!currentTrip?.id) return

    const channelName = `trip_active_watch_${currentTrip.id}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trips',
          filter: `id=eq.${currentTrip.id}`,
        },
        (payload) => {
          if (payload.new?.is_active === false) {
            // Guide ended the trip – members see this via realtime
            localStorage.removeItem(`safar_trip_${user?.id}`)
            setCurrentTrip(null)
            setMembers([])
            setIsSolo(false)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentTrip?.id, user?.id])

  // ── Create trip (any user becomes the guide) ──────────────────────────────
  // payload: { name, description, destination, start_point, meeting_point,
  //            start_date, end_date, notes, route: [{name,lat,lng,order,planned_time,note}] }
  const createTrip = async (payload) => {
    if (!user) return { error: new Error('User not authenticated') }

    const code = generateTripCode()
    const name = (typeof payload === 'string' ? payload : payload?.name)?.trim()
      || `${profile?.name || 'Guide'}'s Tour`

    const insertData = typeof payload === 'object' && payload !== null
      ? {
          name,
          code,
          created_by: user.id,
          is_active: true,
          description:    payload.description    || null,
          destination:    payload.destination    || null,
          start_point:    payload.start_point    || null,
          meeting_point:  payload.meeting_point  || null,
          start_date:     payload.start_date     || null,
          end_date:       payload.end_date        || null,
          notes:          payload.notes           || null,
          route:          payload.route?.length   ? payload.route : null,
        }
      : { name, code, created_by: user.id, is_active: true }

    try {
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .insert(insertData)
        .select()
        .single()

      if (tripError) {
        console.warn('DB create trip fallback:', tripError.message)
        const mockTrip = { id: 'mock-trip-' + Date.now(), ...insertData, created_at: new Date().toISOString() }
        const mockMembers = [{
          id: 'mock-mem-1', user_id: user.id, role: 'guide',
          name: profile?.name || 'Guide', phone: profile?.phone || '', userRole: profile?.role || 'traveler',
        }]
        setCurrentTrip(mockTrip)
        setMembers(mockMembers)
        setIsSolo(false)
        localStorage.removeItem(`safar_solo_${user.id}`)
        localStorage.setItem(`safar_trip_${user.id}`, JSON.stringify({ trip: mockTrip, members: mockMembers }))
        return { data: mockTrip, error: null }
      }

      const { error: memberError } = await supabase
        .from('trip_members')
        .insert({ trip_id: tripData.id, user_id: user.id, role: 'guide' })
      if (memberError) console.warn('Error adding creator to trip_members:', memberError.message)

      localStorage.removeItem(`safar_solo_${user.id}`)
      await fetchActiveTrip()
      return { data: tripData, error: null }
    } catch (err) {
      return { data: null, error: err }
    }
  }

  // ── Update trip details (guide only) ──────────────────────────────────────
  const updateTrip = async (tripId, updates) => {
    if (!user || !isGuide) return { error: new Error('Only the guide can edit the trip.') }
    try {
      const { data, error } = await supabase
        .from('trips')
        .update(updates)
        .eq('id', tripId)
        .select()
        .single()
      if (error) return { error }
      setCurrentTrip((prev) => prev ? { ...prev, ...data } : data)
      return { data, error: null }
    } catch (err) {
      return { error: err }
    }
  }

  // ── Join trip by code ─────────────────────────────────────────────────────
  const joinTrip = async (inputCode, forceSwitch = false) => {
    if (!user) return { error: new Error('User not authenticated') }
    const cleanedCode = inputCode?.trim().toUpperCase()

    if (!cleanedCode || cleanedCode.length !== 6) {
      return { error: new Error('Please enter a valid 6-character trip code.') }
    }

    if (currentTrip && currentTrip.code?.toUpperCase() === cleanedCode) {
      return { error: new Error("You're already in this trip") }
    }

    try {
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .ilike('code', cleanedCode)
        .eq('is_active', true)
        .maybeSingle()

      if (tripError || !tripData) {
        return { error: new Error('No active trip found matching that 6-character code. Check and try again.') }
      }

      if (currentTrip && currentTrip.id === tripData.id) {
        return { error: new Error("You're already in this trip") }
      }

      // Already in a different trip – require confirmation unless force
      if (currentTrip && currentTrip.id !== tripData.id && !forceSwitch) {
        return {
          requiresConfirmation: true,
          currentTripName: currentTrip.name,
          targetTrip: tripData,
        }
      }

      // Leave current trip if switching
      if (currentTrip && forceSwitch) {
        if (isGuide) {
          return { error: new Error("You're the guide. End your current trip before joining another.") }
        }
        const { error: delErr } = await supabase
          .from('trip_members')
          .delete()
          .eq('trip_id', currentTrip.id)
          .eq('user_id', user.id)
          .select()

        if (delErr) {
          return { error: new Error(`Failed to leave current trip: ${delErr.message}`) }
        }
      }

      const { error: joinError } = await supabase
        .from('trip_members')
        .insert({
          trip_id: tripData.id,
          user_id: user.id,
          role: 'traveler',
        })
        .select()

      if (joinError) {
        if (joinError.code === '23505' || joinError.message?.includes('duplicate key') || joinError.message?.includes('already exists')) {
          return { error: new Error("You're already in this trip") }
        }
        throw joinError
      }

      localStorage.removeItem(`safar_solo_${user.id}`)
      await fetchActiveTrip()
      return { data: tripData, error: null }
    } catch (err) {
      return { data: null, error: err }
    }
  }

  // ── Solo mode ─────────────────────────────────────────────────────────────
  const chooseSolo = () => {
    if (user) {
      localStorage.setItem(`safar_solo_${user.id}`, 'true')
      localStorage.removeItem(`safar_trip_${user.id}`)
    }
    setIsSolo(true)
    setCurrentTrip(null)
    setMembers([])
  }

  // ── Leave trip (members only) ─────────────────────────────────────────────
  const leaveTrip = async () => {
    if (!user || !currentTrip) {
      return { error: new Error('No active trip to leave.') }
    }

    if (isGuide) {
      return { error: new Error("You're the guide. Use 'End Trip' to close this trip for everyone.") }
    }

    try {
      const { data, error } = await supabase
        .from('trip_members')
        .delete()
        .eq('trip_id', currentTrip.id)
        .eq('user_id', user.id)
        .select()

      if (error) {
        console.error('Database error on leaving trip:', error.message)
        return { error: new Error(`Failed to leave trip: ${error.message}`) }
      }

      if (!data || data.length === 0) {
        const storedMock = localStorage.getItem(`safar_trip_${user.id}`)
        if (storedMock) {
          localStorage.removeItem(`safar_trip_${user.id}`)
          setCurrentTrip(null)
          setMembers([])
          setIsSolo(false)
          return { data: true, error: null }
        }
        return {
          error: new Error('Failed to leave trip: Membership record was not found.'),
        }
      }

      localStorage.removeItem(`safar_trip_${user.id}`)
      setCurrentTrip(null)
      setMembers([])
      setIsSolo(false)
      return { data, error: null }
    } catch (err) {
      console.error('Unexpected error leaving trip:', err)
      return { error: err }
    }
  }

  // ── End trip (guide only) – sets is_active = false ────────────────────────
  const endTrip = async () => {
    if (!user || !currentTrip) {
      return { error: new Error('No active trip to end.') }
    }

    if (!isGuide) {
      return { error: new Error("Only the guide can end the trip.") }
    }

    try {
      const { error } = await supabase
        .from('trips')
        .update({ is_active: false })
        .eq('id', currentTrip.id)

      if (error) {
        console.error('Error ending trip:', error.message)
        return { error: new Error(`Failed to end trip: ${error.message}`) }
      }

      localStorage.removeItem(`safar_trip_${user.id}`)
      setCurrentTrip(null)
      setMembers([])
      setIsSolo(false)
      return { data: true, error: null }
    } catch (err) {
      console.error('Unexpected error ending trip:', err)
      return { error: err }
    }
  }

  return (
    <TripContext.Provider
      value={{
        currentTrip,
        members,
        isSolo,
        isGuide,
        loading,
        createTrip,
        updateTrip,
        joinTrip,
        chooseSolo,
        leaveTrip,
        endTrip,
        refreshTrip: fetchActiveTrip,
      }}
    >
      {children}
    </TripContext.Provider>
  )
}

export const useTrip = () => useContext(TripContext)
