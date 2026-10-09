import React, { useState } from 'react'
import { useTrip } from '../context/TripContext'
import { MyTripView } from '../components/MyTripView'
import { Compass, Key, UserCheck, AlertCircle, ArrowRight, AlertTriangle, X } from 'lucide-react'

export const TripsPage = () => {
  const { currentTrip, isSolo, joinTrip, chooseSolo } = useTrip()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [showJoinForm, setShowJoinForm] = useState(false)

  // Switch Trip Confirmation Modal state
  const [switchModal, setSwitchModal] = useState(null) // { currentTripName, newCode }

  const handleJoin = async (e, forceSwitch = false) => {
    if (e) e.preventDefault()
    setErrorMsg('')

    const codeToUse = forceSwitch && switchModal ? switchModal.newCode : code
    if (!codeToUse || codeToUse.length !== 6) {
      setErrorMsg('Please enter a valid 6-character code.')
      return
    }

    setLoading(true)
    const res = await joinTrip(codeToUse, forceSwitch)
    setLoading(false)

    if (res?.requiresConfirmation) {
      // User is already in a trip, trigger confirmation modal
      setSwitchModal({
        currentTripName: res.currentTripName,
        newCode: codeToUse,
      })
      return
    }

    if (res?.error) {
      setErrorMsg(res.error.message || 'Failed to join trip. Please check your code.')
    } else {
      setCode('')
      setShowJoinForm(false)
      setSwitchModal(null)
    }
  }

  return (
    <div className="pb-safe max-w-md mx-auto px-4 py-4 space-y-5">
      {/* Header */}
      <div className="flex items-center space-x-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
        <div className="p-3 bg-emerald-950 rounded-xl text-emerald-400 border border-emerald-800">
          <Compass className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Trips & Groups</h2>
          <p className="text-xs text-slate-400">Join a tour using a 6-digit trip code or travel solo</p>
        </div>
      </div>

      {/* If in trip or solo, and not explicitly requesting join form */}
      {(currentTrip || isSolo) && !showJoinForm ? (
        <div className="space-y-4">
          <MyTripView />

          <button
            onClick={() => {
              setErrorMsg('')
              setShowJoinForm(true)
            }}
            className="w-full bg-slate-900 hover:bg-slate-850 text-emerald-400 font-semibold py-3 px-4 rounded-xl border border-emerald-900/50 flex items-center justify-center space-x-2 transition-all text-xs"
          >
            <Key className="w-4 h-4" />
            <span>{isSolo ? 'Join a Tour Group with Code' : 'Join a Different Trip Group'}</span>
          </button>
        </div>
      ) : (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Join a Tour Trip
            </h3>
            {showJoinForm && (currentTrip || isSolo) && (
              <button
                onClick={() => {
                  setErrorMsg('')
                  setShowJoinForm(false)
                }}
                className="text-xs text-slate-400 hover:text-white underline"
              >
                Cancel
              </button>
            )}
          </div>

          <p className="text-xs text-slate-400">
            Received a 6-character code from your guide? Enter it below to join your safety group.
          </p>

          {errorMsg && (
            <div className="bg-red-950/80 border border-red-800/80 p-3 rounded-xl text-red-300 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={(e) => handleJoin(e, false)} className="space-y-3">
            <div className="relative">
              <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ENTER 6-DIGIT CODE"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white font-mono uppercase tracking-widest focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold py-3.5 px-4 rounded-xl shadow-lg transition-all text-sm uppercase tracking-wider flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{loading ? 'Joining Trip...' : 'Join Trip Group'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="relative py-2 flex items-center justify-center">
            <div className="border-t border-slate-800 w-full absolute"></div>
            <span className="bg-slate-900 px-3 text-[10px] text-slate-500 uppercase font-bold relative">
              OR
            </span>
          </div>

          {/* Option to Choose Solo */}
          <button
            type="button"
            onClick={() => {
              chooseSolo()
              setShowJoinForm(false)
            }}
            className="w-full bg-slate-950 hover:bg-slate-900 text-slate-300 font-semibold py-3 px-4 rounded-xl border border-slate-800 flex items-center justify-center space-x-2 transition-all text-xs"
          >
            <UserCheck className="w-4 h-4 text-blue-400" />
            <span>Choose "Solo" & Skip Group Joining</span>
          </button>
        </div>
      )}

      {/* Switch Trip Confirmation Modal */}
      {switchModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative">
            <button
              onClick={() => setSwitchModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="p-3 bg-amber-950/80 rounded-xl text-amber-400 border border-amber-800/60">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Switch Tour Group?</h3>
                <p className="text-xs text-slate-400">Single Group Limit</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              You're already in <strong className="text-white">{switchModal.currentTripName}</strong>. Leave it and join the new trip?
            </p>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setSwitchModal(null)}
                disabled={loading}
                className="flex-1 bg-slate-950 hover:bg-slate-800 text-slate-300 font-semibold py-2.5 px-4 rounded-xl border border-slate-800 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleJoin(null, true)}
                disabled={loading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold py-2.5 px-4 rounded-xl shadow-lg text-xs flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                <span>{loading ? 'Switching...' : 'Leave & Join'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
