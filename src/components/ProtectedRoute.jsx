import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ROLE_HOMES } from '../config/navConfig'
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

  // If specific roles are required for this route, ensure user profile role matches
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    const defaultRoleHome = ROLE_HOMES[profile.role] || '/home'
    return <Navigate to={defaultRoleHome} replace />
  }

  return children
}
