import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTrip } from '../context/TripContext'
import { supabase } from '../lib/supabase'
import {
  User, Mail, Phone, Shield, LogOut, CheckCircle, Edit3, Save, X,
  DoorOpen, Loader2, AlertCircle,
} from 'lucide-react'

// ── Small skeleton for profile loading ───────────────────────────────────────
const ProfileSkeleton = () => (
  <div className="pb-safe max-w-md mx-auto px-4 py-4 space-y-5 animate-pulse">
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 text-center space-y-3">
      <div className="mx-auto w-16 h-16 rounded-full bg-slate-700" />
      <div className="h-5 bg-slate-700 rounded w-36 mx-auto" />
      <div className="h-4 bg-slate-800 rounded w-24 mx-auto" />
    </div>
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-12 bg-slate-800 rounded-xl" />
      ))}
    </div>
    <div className="h-12 bg-slate-800 rounded-xl" />
  </div>
)

export const ProfilePage = () => {
  const { user, profile, signOut, fetchProfile } = useAuth()
  const { currentTrip, leaveTrip } = useTrip()
  const navigate = useNavigate()

  // ── Edit state ───────────────────────────────────────────────────────────
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(profile?.name || '')
  const [editPhone, setEditPhone] = useState(profile?.phone || '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  // ── Leave trip state ─────────────────────────────────────────────────────
  const [leavingTrip, setLeavingTrip] = useState(false)
  const [leaveError, setLeaveError] = useState('')
  const [leaveConfirm, setLeaveConfirm] = useState(false)

  if (!user || !profile) return <ProfileSkeleton />

  const initials = profile?.name ? profile.name.charAt(0).toUpperCase() : 'U'

  const roleColor = {
    traveler: 'from-emerald-800 to-emerald-600',
    guide: 'from-amber-800 to-amber-600',
    authority: 'from-red-800 to-red-600',
  }[profile.role] || 'from-emerald-800 to-emerald-600'

  const roleBadge = {
    traveler: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    guide: 'bg-amber-950 text-amber-300 border-amber-800',
    authority: 'bg-red-950 text-red-300 border-red-800',
  }[profile.role] || 'bg-emerald-950 text-emerald-300 border-emerald-800'

  // ── Save profile edits ───────────────────────────────────────────────────
  const handleSave = async () => {
    if (!editName.trim()) { setSaveError('Name cannot be empty.'); return }
    setSaving(true)
    setSaveError('')
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: editName.trim(), phone: editPhone.trim() })
        .eq('id', user.id)
      if (error) throw error
      await fetchProfile(user.id)
      setSaveSuccess(true)
      setEditing(false)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setSaveError(err.message || 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditName(profile?.name || '')
    setEditPhone(profile?.phone || '')
    setSaveError('')
    setEditing(false)
  }

  // ── Leave trip ───────────────────────────────────────────────────────────
  const handleLeaveTrip = async () => {
    setLeavingTrip(true)
    setLeaveError('')
    const res = await leaveTrip()
    setLeavingTrip(false)
    if (res?.error) {
      setLeaveError(res.error.message || 'Failed to leave trip.')
    } else {
      setLeaveConfirm(false)
    }
  }

  return (
    <div className="pb-safe max-w-md mx-auto px-4 py-4 space-y-5">

      {/* ── Profile Header ─────────────────────────────────────────────── */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 text-center space-y-3 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800/30 to-transparent pointer-events-none" />

        <div className={`mx-auto w-16 h-16 rounded-full bg-gradient-to-tr ${roleColor}
          border-2 border-white/20 flex items-center justify-center text-white
          font-extrabold text-xl shadow-lg`}>
          {initials}
        </div>

        <div>
          <h2 className="text-lg font-bold text-white">{profile?.name || 'User Name'}</h2>
          <span className={`inline-block mt-1 text-xs font-semibold px-3 py-1 rounded-full border capitalize ${roleBadge}`}>
            {profile?.role || 'traveler'}
          </span>
        </div>

        {saveSuccess && (
          <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-semibold animate-pulse">
            <CheckCircle className="w-4 h-4" />
            <span>Profile saved!</span>
          </div>
        )}
      </div>

      {/* ── Account Details ─────────────────────────────────────────────── */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Account Details</h3>
          {!editing ? (
            <button
              id="edit-profile-btn"
              onClick={() => { setEditing(true); setEditName(profile?.name || ''); setEditPhone(profile?.phone || '') }}
              className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/60 hover:bg-emerald-900/40 transition-all min-h-[44px]"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                id="save-profile-btn"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 text-xs text-emerald-300 font-bold px-2.5 py-1.5 rounded-lg bg-emerald-900/60 border border-emerald-700 hover:bg-emerald-800/50 transition-all min-h-[44px] disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save
              </button>
              <button
                onClick={handleCancelEdit}
                className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-all min-h-[44px]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {saveError && (
          <div className="bg-red-950/80 border border-red-800/60 px-3 py-2 rounded-xl flex items-center gap-2 text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        <div className="space-y-3">
          {/* Email (read-only) */}
          <div className="flex items-center space-x-3 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <Mail className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-slate-500 block">Email Address</span>
              <span className="text-xs font-medium text-slate-200 truncate block">{user?.email || 'N/A'}</span>
            </div>
          </div>

          {/* Name (editable) */}
          <div className={`flex items-center space-x-3 p-3 rounded-xl border transition-all ${
            editing ? 'bg-slate-800 border-emerald-700/60' : 'bg-slate-950 border-slate-800/80'
          }`}>
            <User className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div className="flex-1">
              <span className="text-[10px] text-slate-500 block">Display Name</span>
              {editing ? (
                <input
                  id="profile-name-input"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-transparent text-xs font-medium text-white border-none outline-none placeholder-slate-500"
                  placeholder="Your name"
                />
              ) : (
                <span className="text-xs font-medium text-slate-200">{profile?.name || 'Not set'}</span>
              )}
            </div>
          </div>

          {/* Phone (editable) */}
          <div className={`flex items-center space-x-3 p-3 rounded-xl border transition-all ${
            editing ? 'bg-slate-800 border-emerald-700/60' : 'bg-slate-950 border-slate-800/80'
          }`}>
            <Phone className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div className="flex-1">
              <span className="text-[10px] text-slate-500 block">Phone Number</span>
              {editing ? (
                <input
                  id="profile-phone-input"
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-transparent text-xs font-medium text-white border-none outline-none placeholder-slate-500"
                  placeholder="+91 9876543210"
                />
              ) : (
                <span className="text-xs font-medium text-slate-200">{profile?.phone || 'Not provided'}</span>
              )}
            </div>
          </div>

          {/* Auth status (read-only) */}
          <div className="flex items-center space-x-3 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div>
              <span className="text-[10px] text-slate-500 block">Auth Status</span>
              <span className="text-xs font-medium text-emerald-400 flex items-center space-x-1">
                <CheckCircle className="w-3 h-3 inline mr-1" />
                Session Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Leave Trip (travelers only, when in a trip) ─────────────────── */}
      {currentTrip && profile.role === 'traveler' && (
        <div className="bg-slate-900/80 border border-amber-900/40 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <DoorOpen className="w-4 h-4 text-amber-400" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white">Active Trip</p>
              <p className="text-[11px] text-slate-400 truncate">{currentTrip.name} · {currentTrip.code}</p>
            </div>
          </div>

          {leaveError && (
            <div className="bg-red-950/70 border border-red-800/60 px-3 py-2 rounded-xl flex items-center gap-2 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{leaveError}</span>
            </div>
          )}

          {!leaveConfirm ? (
            <button
              id="leave-trip-btn"
              onClick={() => { setLeaveConfirm(true); setLeaveError('') }}
              className="w-full bg-amber-950/60 hover:bg-amber-900/50 text-amber-300 font-semibold
                py-3 px-4 rounded-xl border border-amber-800/60 flex items-center justify-center
                gap-2 transition-all text-sm min-h-[44px]"
            >
              <DoorOpen className="w-4 h-4" />
              Leave Trip
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-amber-200 text-center">Are you sure you want to leave <strong>{currentTrip.name}</strong>?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setLeaveConfirm(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold
                    py-3 px-4 rounded-xl border border-slate-700 text-xs min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  id="confirm-leave-trip-btn"
                  onClick={handleLeaveTrip}
                  disabled={leavingTrip}
                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold
                    py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 min-h-[44px] disabled:opacity-50"
                >
                  {leavingTrip ? <Loader2 className="w-4 h-4 animate-spin" /> : <DoorOpen className="w-4 h-4" />}
                  Leave Trip
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Logout Button ────────────────────────────────────────────────── */}
      <button
        id="signout-btn"
        onClick={signOut}
        className="w-full bg-red-950/80 hover:bg-red-900 text-red-200 font-semibold
          py-3.5 px-4 rounded-xl border border-red-800/60 flex items-center justify-center
          gap-2 transition-all text-sm min-h-[44px]"
      >
        <LogOut className="w-4 h-4" />
        <span>Sign Out of SafarSaathi</span>
      </button>
    </div>
  )
}
