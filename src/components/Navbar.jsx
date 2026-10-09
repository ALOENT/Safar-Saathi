import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { NAV_CONFIG } from '../config/navConfig'
import { Shield } from 'lucide-react'

export const Navbar = () => {
  const { user, profile } = useAuth()
  const location = useLocation()

  if (!user) return null

  const userRole = profile?.role || 'traveler'
  const navItems = NAV_CONFIG[userRole] || NAV_CONFIG.traveler

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'guide':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40'
      case 'authority':
        return 'bg-red-500/20 text-red-300 border-red-500/40'
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    }
  }

  return (
    <>
      {/* Top Mobile Header */}
      <header className="sticky top-0 z-40 bg-emerald-950/90 backdrop-blur-md border-b border-emerald-900/60 px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-900 flex items-center justify-center shadow-inner border border-emerald-400/30">
            <Shield className="w-5 h-5 text-emerald-200" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-none tracking-wide">
              Safar<span className="text-emerald-400">Saathi</span>
            </h1>
            <p className="text-[10px] text-emerald-300/70 leading-tight">Tourist Safety Companion</p>
          </div>
        </div>

        {profile && (
          <div className="flex items-center space-x-2">
            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border capitalize ${getRoleBadgeColor(profile.role)}`}>
              {profile.role}
            </span>
          </div>
        )}
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-emerald-950/95 backdrop-blur-xl border-t border-emerald-900/80 px-2 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
        <div className="max-w-md mx-auto flex justify-around items-center">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path

            return (
              <NavLink
                key={item.label}
                to={item.path}
                className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'text-emerald-400 font-semibold scale-105'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_8px_#22c55e]"></span>
                  )}
                </div>
                <span className="text-[11px] mt-1 tracking-tight">{item.label}</span>
              </NavLink>
            )
          })}
        </div>
      </nav>
    </>
  )
}
