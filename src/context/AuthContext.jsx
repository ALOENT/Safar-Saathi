import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('Error fetching profile:', error.message)
        return null
      }
      return data
    } catch (err) {
      console.error('Unexpected error fetching profile:', err)
      return null
    }
  }

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser(session.user)
          const userProfile = await fetchProfile(session.user.id)
          setProfile(userProfile)
        }
      } catch (err) {
        console.error('Session initialization error:', err)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        const userProfile = await fetchProfile(session.user.id)
        setProfile(userProfile)
      } else {
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async ({ email, password, name, phone, role }) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone,
            role,
          }
        }
      })

      if (error) throw error

      if (data.user) {
        // Double-check profile creation (upsert if trigger is not present)
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            name: name,
            role: role || 'traveler',
            phone: phone || ''
          })

        if (profileError) {
          console.warn('Profile upsert warning:', profileError.message)
        }

        const freshProfile = await fetchProfile(data.user.id)
        setUser(data.user)
        setProfile(freshProfile || { id: data.user.id, name, role, phone })
      }

      return { data, error: null }
    } catch (err) {
      return { data: null, error: err }
    } finally {
      setLoading(false)
    }
  }

  const signIn = async ({ email, password }) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        setUser(data.user)
        const userProfile = await fetchProfile(data.user.id)
        setProfile(userProfile)
      }

      return { data, error: null }
    } catch (err) {
      return { data: null, error: err }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
    } catch (err) {
      console.error('Sign out error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
