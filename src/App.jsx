import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Navbar } from './components/Navbar'
import { AuthPage } from './pages/AuthPage'
import { TravelerHome } from './pages/TravelerHome'
import { GuideHome } from './pages/GuideHome'
import { AuthorityHome } from './pages/AuthorityHome'
import { TripsPage } from './pages/TripsPage'
import { MapPage } from './pages/MapPage'
import { AlertsPage } from './pages/AlertsPage'
import { ProfilePage } from './pages/ProfilePage'

const AppRoutes = () => {
  const { user, profile } = useAuth()

  // Root redirect logic based on user role
  const getRoleDefaultPath = () => {
    if (!user) return '/login'
    if (profile?.role === 'guide') return '/guide'
    if (profile?.role === 'authority') return '/authority'
    return '/home'
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/login" element={user ? <Navigate to={getRoleDefaultPath()} replace /> : <AuthPage />} />
          
          <Route
            path="/home"
            element={
              <ProtectedRoute allowedRoles={['traveler', 'guide', 'authority']}>
                <TravelerHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/guide"
            element={
              <ProtectedRoute allowedRoles={['guide', 'authority']}>
                <GuideHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/authority"
            element={
              <ProtectedRoute allowedRoles={['authority']}>
                <AuthorityHome />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/trips"
            element={
              <ProtectedRoute>
                <TripsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/map"
            element={
              <ProtectedRoute>
                <MapPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/alerts"
            element={
              <ProtectedRoute>
                <AlertsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
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
        <AppRoutes />
      </AuthProvider>
    </Router>
  )
}
