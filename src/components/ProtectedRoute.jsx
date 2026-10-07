import React from 'react'
import { Navigate } from 'react'
import { useAuth } from '../context/AuthContext'
import { Shield } from 'lucide-react'

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-full bg-emerald-950/80 border-2 border-emerald-500/30 flex items-center justify-center animate-pulse mb-4">
          <Shield className="w-8 h-8 text-emerald-400 animate-spin" />
        </div>
        <p className="text-emerald-400 font-medium text-sm tracking-wide">Loading SafarSaathi...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // If specific roles are required and user doesn't match
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    // Redirect to their role home page
    if (profile.role === 'guide') return <Navigate to="/guide" replace />
    if (profile.role === 'authority') return <Navigate to="/authority" replace />
    return <Navigate to="/home" replace />
  }

  return children
}
