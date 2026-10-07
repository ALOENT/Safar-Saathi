import React from 'react'
import { useAuth } from '../context/AuthContext'
import { User, Mail, Phone, Shield, LogOut, CheckCircle } from 'lucide-react'

export const ProfilePage = () => {
  const { user, profile, signOut } = useAuth()

  return (
    <div className="pb-safe max-w-md mx-auto px-4 py-4 space-y-5">
      {/* Profile Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 text-center space-y-3 relative overflow-hidden">
        <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-800 to-emerald-600 border-2 border-emerald-400/40 flex items-center justify-center text-white font-extrabold text-xl shadow-lg">
          {profile?.name ? profile.name.charAt(0).toUpperCase() : 'U'}
        </div>

        <div>
          <h2 className="text-lg font-bold text-white">{profile?.name || 'User Name'}</h2>
          <span className="inline-block mt-1 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 uppercase tracking-wide">
            Role: {profile?.role || 'Traveler'}
          </span>
        </div>
      </div>

      {/* Profile Info Details */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Account Details</h3>

        <div className="space-y-3">
          <div className="flex items-center space-x-3 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <Mail className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div className="truncate">
              <span className="text-[10px] text-slate-500 block">Email Address</span>
              <span className="text-xs font-medium text-slate-200">{user?.email || 'N/A'}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <Phone className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div>
              <span className="text-[10px] text-slate-500 block">Phone Number</span>
              <span className="text-xs font-medium text-slate-200">{profile?.phone || 'Not provided'}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div>
              <span className="text-[10px] text-slate-500 block">Auth Status</span>
              <span className="text-xs font-medium text-emerald-400 flex items-center space-x-1">
                <CheckCircle className="w-3 h-3 inline mr-1" />
                Authenticated Session Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Logout Button */}
      <button
        onClick={signOut}
        className="w-full bg-red-950/80 hover:bg-red-900 text-red-200 font-semibold py-3 px-4 rounded-xl border border-red-800/60 flex items-center justify-center space-x-2 transition-all text-sm"
      >
        <LogOut className="w-4 h-4" />
        <span>Sign Out of SafarSaathi</span>
      </button>
    </div>
  )
}
