import { useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTrip } from '../context/TripContext'

/**
 * useActiveTrip()
 *
 * Returns the user's currently active trip context, with guide detection
 * based solely on trips.created_by, NOT on profile.role.
 *
 * @returns {{
 *   trip: object|null,
 *   isGuide: boolean,
 *   isMember: boolean,
 *   isSolo: boolean,
 *   members: object[],
 *   loading: boolean,
 * }}
 */
export function useActiveTrip() {
  const { user } = useAuth()
  const { currentTrip, isSolo, members, loading } = useTrip()

  const isGuide = useMemo(() => {
    if (!user || !currentTrip) return false
    return currentTrip.created_by === user.id
  }, [user, currentTrip])

  const isMember = useMemo(() => {
    return !!currentTrip && !isGuide
  }, [currentTrip, isGuide])

  return {
    trip: currentTrip,
    isGuide,
    isMember,
    isSolo,
    members,
    loading,
  }
}
