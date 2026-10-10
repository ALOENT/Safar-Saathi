import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { TripProvider } from './context/TripContext'
import { LocationProvider } from './context/LocationContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Navbar } from './components/Navbar'
import { ROLE_HOMES } from './config/navConfig'

import { AuthPage } from './pages/AuthPage'
import { TravelerHome } from './pages/TravelerHome'
import { GuideHome } from './pages/GuideHome'
import { GuideGroupPage } from './pages/GuideGroupPage'
import { AuthorityHome } from './pages/AuthorityHome'
import { TripsPage } from './pages/TripsPage'
import { MapPage } from './pages/MapPage'
import { AlertsPage } from './pages/AlertsPage'
import { ProfilePage } from './pages/ProfilePage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { AlertTriangle } from 'lucide-react'

const AppRoutes = () => {
  const { user, profile } = useAuth()

  // Default path helper
  const getRoleDefaultPath = () => {
    if (!user) return '/login'
    return ROLE_HOMES[profile?.role] || '/home'
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route
            path="/login"
            element={user ? <Navigate to={getRoleDefaultPath()} replace /> : <AuthPage />}
          />

          {/* Traveler Routes */}
          <Route
            path="/home"
            element={
              <ProtectedRoute allowedRoles={['traveler']}>
                <TravelerHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trips"
            element={
              <ProtectedRoute allowedRoles={['traveler']}>
                <TripsPage />
              </ProtectedRoute>
            }
          />

          {/* Guide Routes */}
          <Route
            path="/guide"
            element={
              <ProtectedRoute allowedRoles={['guide']}>
                <GuideHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/group"
            element={
              <ProtectedRoute allowedRoles={['guide']}>
                <GuideGroupPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sos"
            element={
              <ProtectedRoute allowedRoles={['guide']}>
                <PlaceholderPage title="Guide Emergency SOS Desk" icon={AlertTriangle} />
              </ProtectedRoute>
            }
          />

          {/* Authority Routes */}
          <Route
            path="/authority"
            element={
              <ProtectedRoute allowedRoles={['authority']}>
                <AuthorityHome />
              </ProtectedRoute>
            }
          />

          {/* Shared Routes */}
          <Route
            path="/alerts"
            element={
              <ProtectedRoute allowedRoles={['traveler', 'authority']}>
                <AlertsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/map"
            element={
              <ProtectedRoute allowedRoles={['traveler', 'guide', 'authority']}>
                <MapPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={['traveler', 'guide', 'authority']}>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Fallback wildcard route */}
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
        <TripProvider>
          <LocationProvider>
            <AppRoutes />
          </LocationProvider>
        </TripProvider>
      </AuthProvider>
    </Router>
  )
}
