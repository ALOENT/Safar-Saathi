import React, { useState } from 'react'
import { useTrip } from '../context/TripContext'
import { useAuth } from '../context/AuthContext'
import { Compass, Copy, Check, Users, User, Shield, LogOut, ArrowRight, UserCheck, AlertTriangle, X } from 'lucide-react'

export const MyTripView = () => {
  const { currentTrip, members, isSolo, leaveTrip } = useTrip()
  const { user, profile } = useAuth()
  const [copied, setCopied] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [leaveError, setLeaveError] = useState('')

  const handleCopyCode = () => {
    if (!currentTrip?.code) return
    navigator.clipboard.writeText(currentTrip.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleConfirmLeave = async () => {
    setLeaveError('')
    setLeaving(true)
    const res = await leaveTrip()
    setLeaving(false)

    if (res?.error) {
      setLeaveError(res.error.message || 'Failed to leave trip.')
    } else {
      setShowLeaveModal(false)
    }
  }

  if (isSolo) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-blue-950 rounded-xl text-blue-400 border border-blue-800">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Current Mode</span>
              <h3 className="text-base font-bold text-white">Solo Traveler</h3>
            </div>
          </div>
          <span className="bg-blue-950 text-blue-300 border border-blue-700/60 px-2.5 py-1 rounded-full text-xs font-semibold">
            Solo Mode
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          You are exploring solo! Emergency SOS, Geofencing, and Safe Map tracking remain 100% active for your personal safety.
        </p>
      </div>
    )
  }

  if (!currentTrip) {
    return null
  }

  return (
    <div className="space-y-5">
      {/* Trip Header Banner */}
      <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-950 border border-emerald-800/80 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">Active Tour Group</span>
            <h2 className="text-xl font-extrabold text-white mt-0.5">{currentTrip.name}</h2>
          </div>
          <span className="bg-emerald-950/90 text-emerald-300 border border-emerald-600/50 px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Active</span>
          </span>
        </div>

        {/* 6-Character Trip Code Box with Copy Button */}
        <div className="bg-slate-950/90 border border-emerald-800/60 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Group Trip Code</span>
            <span className="text-2xl font-black text-emerald-400 tracking-widest font-mono">
              {currentTrip.code}
            </span>
          </div>

          <button
            onClick={handleCopyCode}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg font-semibold text-xs transition-all shadow-md active:scale-95 ${
              copied
                ? 'bg-emerald-600 text-white border border-emerald-400'
                : 'bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 border border-emerald-700/60'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-emerald-300" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>

        {/* View Live Map Quick Link */}
        <a
          href="/map"
          className="w-full bg-emerald-950/90 hover:bg-emerald-900/90 border border-emerald-700/60 rounded-xl py-2.5 px-3 flex items-center justify-center space-x-2 text-xs font-bold text-emerald-300 transition-all shadow-sm"
        >
          <Compass className="w-4 h-4 text-emerald-400" />
          <span>View Live Group Map</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Member List */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Trip Members ({members.length})
            </h3>
          </div>
          <span className="text-[10px] text-slate-400">Live Group Signals</span>
        </div>

        <div className="space-y-2.5">
          {members.length === 0 ? (
            <div className="bg-slate-950 p-4 rounded-xl text-center border border-slate-800">
              <p className="text-xs text-slate-400">Loading members...</p>
            </div>
          ) : (
            members.map((m, idx) => {
              const isMe = m.user_id === user?.id
              const isGuide = m.userRole === 'guide' || m.role === 'guide'

              return (
                <div
                  key={m.id || idx}
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    isMe
                      ? 'bg-emerald-950/40 border-emerald-800/60'
                      : 'bg-slate-950 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border ${
                        isGuide
                          ? 'bg-amber-950 text-amber-300 border-amber-600/50'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-700/50'
                      }`}
                    >
                      {isGuide ? '🚩' : '🧳'}
                    </div>

                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-white">
                          {m.name}
                        </span>
                        {isMe && (
                          <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                            YOU
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 capitalize block">
                        {isGuide ? 'Tour Guide' : 'Traveler'} {m.phone ? `• ${m.phone}` : ''}
                      </span>
                    </div>
                  </div>

                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#22c55e]"></span>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Leave Trip Button */}
      <button
        onClick={() => {
          setLeaveError('')
          setShowLeaveModal(true)
        }}
        className="w-full bg-slate-950 hover:bg-red-950/40 text-slate-400 hover:text-red-300 font-semibold py-3 px-4 rounded-xl border border-slate-800 hover:border-red-900/60 flex items-center justify-center space-x-2 transition-all text-xs"
      >
        <LogOut className="w-4 h-4 text-red-400" />
        <span>Leave Trip</span>
      </button>

      {/* Leave Confirmation Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative">
            <button
              onClick={() => setShowLeaveModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="p-3 bg-red-950/80 rounded-xl text-red-400 border border-red-800/60">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Leave Tour Group?</h3>
                <p className="text-xs text-slate-400">Confirmation Required</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to leave <strong className="text-white">{currentTrip.name}</strong>?
            </p>

            {leaveError && (
              <div className="bg-red-950/90 border border-red-800 p-3 rounded-xl text-red-200 text-xs">
                {leaveError}
              </div>
            )}

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                disabled={leaving}
                className="flex-1 bg-slate-950 hover:bg-slate-800 text-slate-300 font-semibold py-2.5 px-4 rounded-xl border border-slate-800 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLeave}
                disabled={leaving}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg text-xs flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{leaving ? 'Leaving...' : 'Leave Trip'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
