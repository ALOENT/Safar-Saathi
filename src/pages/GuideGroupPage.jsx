import React, { useState } from 'react'
import { useTrip } from '../context/TripContext'
import { MyTripView } from '../components/MyTripView'
import { Users, Plus, Shield, Sparkles } from 'lucide-react'

export const GuideGroupPage = () => {
  const { currentTrip, createTrip } = useTrip()
  const [tripName, setTripName] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleCreateTrip = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setLoading(true)
    const res = await createTrip(tripName)
    setLoading(false)
    if (res.error) {
      setErrorMsg(res.error.message || 'Failed to create trip')
    } else {
      setTripName('')
    }
  }

  return (
    <div className="pb-safe max-w-md mx-auto px-4 py-4 space-y-5">
      {/* Header */}
      <div className="flex items-center space-x-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
        <div className="p-3 bg-amber-950 rounded-xl text-amber-400 border border-amber-800">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Guide Group Management</h2>
          <p className="text-xs text-slate-400">Create & manage your tour group trip</p>
        </div>
      </div>

      {currentTrip ? (
        <MyTripView />
      ) : (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Create New Tour Group
            </h3>
          </div>

          <p className="text-xs text-slate-400">
            Generate a unique 6-character trip code for your group. Travelers can join your tour using this code.
          </p>

          {errorMsg && (
            <div className="bg-red-950/80 border border-red-800/80 p-3 rounded-xl text-red-300 text-xs">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleCreateTrip} className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Tour / Group Name
              </label>
              <input
                type="text"
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                placeholder="e.g. Shimla Heritage Tour 2026"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-600 hover:bg-amber-500 text-slate-950 font-extrabold py-3.5 px-4 rounded-xl shadow-lg transition-all text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{loading ? 'Generating Code...' : 'Create Trip & 6-Char Code'}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
