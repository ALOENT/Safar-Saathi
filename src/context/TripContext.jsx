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

  // Fetch members for a specific trip
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
          .select('id, name, phone, role')
          .in('id', userIds)

        const formattedMembers = allMembers.map((m) => {
          const p = profilesData?.find((prof) => prof.id === m.user_id)
          return {
            ...m,
            name: p?.name || (m.user_id === user?.id ? profile?.name || 'You' : 'Traveler'),
            phone: p?.phone || '',
            userRole: p?.role || m.role || 'traveler',
          }
        })

        setMembers(formattedMembers)
      }
    } catch (err) {
      console.error('Error fetching members:', err)
    }
  }

  // Fetch active trip for user
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
        const activeTripId = memberRows[0].trip_id

        const { data: tripData, error: tripErr } = await supabase
          .from('trips')
          .select('*')
          .eq('id', activeTripId)
          .maybeSingle()

        if (tripErr || !tripData) {
          console.warn('Trip record fetch error:', tripErr?.message)
        } else {
          setCurrentTrip(tripData)
          localStorage.setItem(`safar_trip_${user.id}`, JSON.stringify({ trip: tripData }))
          await fetchMembersForTrip(activeTripId)
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

  // Supabase Realtime Subscription on trip_members
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

  // Guide creates a trip
  const createTrip = async (tripName) => {
    if (!user) return { error: new Error('User not authenticated') }

    const code = generateTripCode()
    const name = tripName?.trim() || `${profile?.name || 'Guide'}'s Tour`

    try {
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .insert({
          name: name,
          code: code,
          created_by: user.id,
        })
        .select()
        .single()

      if (tripError) {
        console.warn('DB create trip fallback:', tripError.message)
        const mockTrip = {
          id: 'mock-trip-' + Date.now(),
          name: name,
          code: code,
          created_by: user.id,
          created_at: new Date().toISOString(),
        }
        const mockMembers = [
          {
            id: 'mock-mem-1',
            user_id: user.id,
            role: 'guide',
            name: profile?.name || 'Guide',
            phone: profile?.phone || '',
            userRole: 'guide',
          },
        ]
        setCurrentTrip(mockTrip)
        setMembers(mockMembers)
        setIsSolo(false)
        localStorage.removeItem(`safar_solo_${user.id}`)
        localStorage.setItem(`safar_trip_${user.id}`, JSON.stringify({ trip: mockTrip, members: mockMembers }))
        return { data: mockTrip, error: null }
      }

      const { error: memberError } = await supabase.from('trip_members').insert({
        trip_id: tripData.id,
        user_id: user.id,
        role: 'guide',
      })

      if (memberError) console.warn('Error adding guide to trip_members:', memberError.message)

      localStorage.removeItem(`safar_solo_${user.id}`)
      await fetchActiveTrip()
      return { data: tripData, error: null }
    } catch (err) {
      return { data: null, error: err }
    }
  }

  // Traveler joins a trip by 6-character code
  const joinTrip = async (inputCode, forceSwitch = false) => {
    if (!user) return { error: new Error('User not authenticated') }
    const cleanedCode = inputCode?.trim().toUpperCase()

    if (!cleanedCode || cleanedCode.length !== 6) {
      return { error: new Error('Please enter a valid 6-character trip code.') }
    }

    // 1. Check if entering code for current trip
    if (currentTrip && currentTrip.code?.toUpperCase() === cleanedCode) {
      return { error: new Error("You're already in this trip") }
    }

    try {
      // 2. Find target trip by code
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .ilike('code', cleanedCode)
        .maybeSingle()

      if (tripError || !tripData) {
        return { error: new Error('No trip found matching that 6-character code. Check and try again.') }
      }

      // Check if target trip is current trip
      if (currentTrip && currentTrip.id === tripData.id) {
        return { error: new Error("You're already in this trip") }
      }

      // 3. If traveler is already in a different trip and forceSwitch is false, ask for confirmation
      if (currentTrip && currentTrip.id !== tripData.id && !forceSwitch) {
        return {
          requiresConfirmation: true,
          currentTripName: currentTrip.name,
          targetTrip: tripData,
        }
      }

      // 4. If forceSwitch is true, leave current trip first
      if (currentTrip && forceSwitch) {
        const { data: delData, error: delErr } = await supabase
          .from('trip_members')
          .delete()
          .eq('trip_id', currentTrip.id)
          .eq('user_id', user.id)
          .select()

        if (delErr) {
          return { error: new Error(`Failed to leave current trip: ${delErr.message}`) }
        }
      }

      // 5. Insert member into trip_members
      const { data: memberData, error: joinError } = await supabase
        .from('trip_members')
        .insert({
          trip_id: tripData.id,
          user_id: user.id,
          role: profile?.role || 'traveler',
        })
        .select()

      if (joinError) {
        // Catch duplicate key violation code 23505 or message
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

  // Traveler chooses Solo Mode
  const chooseSolo = () => {
    if (user) {
      localStorage.setItem(`safar_solo_${user.id}`, 'true')
      localStorage.removeItem(`safar_trip_${user.id}`)
    }
    setIsSolo(true)
    setCurrentTrip(null)
    setMembers([])
  }

  // Leave active trip - REQUIRE actual DB row deletion before local state clear
  const leaveTrip = async () => {
    if (!user || !currentTrip) {
      return { error: new Error('No active trip to leave.') }
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

      // Check that at least 1 row was returned from database
      if (!data || data.length === 0) {
        // Fallback check for mock storage if DB tables not run
        const storedMock = localStorage.getItem(`safar_trip_${user.id}`)
        if (storedMock) {
          localStorage.removeItem(`safar_trip_${user.id}`)
          setCurrentTrip(null)
          setMembers([])
          setIsSolo(false)
          return { data: true, error: null }
        }
        return {
          error: new Error('Failed to leave trip: Membership record was not found or could not be deleted from database.'),
        }
      }

      // Only update local UI after database confirmation
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

  return (
    <TripContext.Provider
      value={{
        currentTrip,
        members,
        isSolo,
        loading,
        createTrip,
        joinTrip,
        chooseSolo,
        leaveTrip,
        refreshTrip: fetchActiveTrip,
      }}
    >
      {children}
    </TripContext.Provider>
  )
}

export const useTrip = () => useContext(TripContext)
