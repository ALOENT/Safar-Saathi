import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { TripProvider } from './context/TripContext'
import { LocationProvider } from './context/LocationContext'
import { SOSProvider } from './context/SOSContext'
import { ToastProvider } from './context/ToastContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Navbar } from './components/Navbar'
import { OnlineBanner } from './components/OnlineBanner'
import { SOSAlertBanner } from './components/SOSAlertBanner'
import { ROLE_HOMES } from './config/navConfig'

import { AuthPage } from './pages/AuthPage'
import { HomePage } from './pages/HomePage'
import { TripPage } from './pages/TripPage'
import { AuthorityHome } from './pages/AuthorityHome'
import { MapPage } from './pages/MapPage'
import { AlertsPage } from './pages/AlertsPage'
import { ProfilePage } from './pages/ProfilePage'

const USER_ROLES = ['traveler', 'guide']

const AppRoutes = () => {
  const { user, profile } = useAuth()

  const getRoleDefaultPath = () => {
    if (!user) return '/login'
    return ROLE_HOMES[profile?.role] || '/home'
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />
      <OnlineBanner />
      <SOSAlertBanner />
      <main className="flex-1">
        <Routes>
          {/* Auth */}
          <Route
            path="/login"
            element={user ? <Navigate to={getRoleDefaultPath()} replace /> : <AuthPage />}
          />

          {/* ── User Routes (traveler + legacy guide) ── */}
          <Route
            path="/home"
            element={
              <ProtectedRoute allowedRoles={[...USER_ROLES]}>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trip"
            element={
              <ProtectedRoute allowedRoles={[...USER_ROLES]}>
                <TripPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/map"
            element={
              <ProtectedRoute allowedRoles={[...USER_ROLES, 'authority']}>
                <MapPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/alerts"
            element={
              <ProtectedRoute allowedRoles={[...USER_ROLES, 'authority']}>
                <AlertsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={[...USER_ROLES, 'authority']}>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* ── Authority Route ── */}
          <Route
            path="/authority"
            element={
              <ProtectedRoute allowedRoles={['authority']}>
                <AuthorityHome />
              </ProtectedRoute>
            }
          />

          {/* ── Legacy redirects ── */}
          <Route path="/guide"  element={<Navigate to="/home"  replace />} />
          <Route path="/group"  element={<Navigate to="/trip"  replace />} />
          <Route path="/sos"    element={<Navigate to="/trip"  replace />} />
          <Route path="/trips"  element={<Navigate to="/trip"  replace />} />

          {/* ── Catch-all ── */}
          <Route path="*" element={<Navigate to={getRoleDefaultPath()} replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <TripProvider>
            <LocationProvider>
              <SOSProvider>
                <AppRoutes />
              </SOSProvider>
            </LocationProvider>
          </TripProvider>
        </ToastProvider>
      </AuthProvider>
    </Router>
  )
}
