import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ROLE_HOMES } from '../config/navConfig'
import { Construction, ArrowLeft } from 'lucide-react'

export const PlaceholderPage = ({ title = 'Feature Under Development', icon: Icon = Construction }) => {
  const navigate = useNavigate()
  const { profile } = useAuth()

  const handleBackHome = () => {
    const homePath = ROLE_HOMES[profile?.role] || '/home'
    navigate(homePath)
  }

  return (
    <div className="pb-safe max-w-md mx-auto px-4 py-8 space-y-6">
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-emerald-950/80 border border-emerald-700/50 text-emerald-400 mx-auto flex items-center justify-center shadow-inner">
          <Icon className="w-8 h-8" />
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">
            SafarSaathi Module
          </span>
          <h2 className="text-xl font-extrabold text-white mt-1">{title}</h2>
          <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto leading-relaxed">
            This module is being built in the upcoming implementation stages. Stay tuned for full functionality!
          </p>
        </div>

        <button
          onClick={handleBackHome}
          className="w-full bg-emerald-900 hover:bg-emerald-800 text-emerald-100 font-semibold py-3 px-4 rounded-xl border border-emerald-700/60 flex items-center justify-center space-x-2 transition-all text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </button>
      </div>
    </div>
  )
}
