/**
 * EmergencyInfoPanel.jsx
 * Lazy-loaded collapsible panel for guide / authority SOS cards.
 * Fetches emergency_profiles + emergency_contacts only when expanded.
 */
import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { ChevronDown, ChevronUp, Phone, Loader2, Heart } from 'lucide-react'

export function EmergencyInfoPanel({ userId, travelerPhone }) {
  const [expanded, setExpanded] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [loaded,   setLoaded]   = useState(false)
  const [medInfo,  setMedInfo]  = useState(null)
  const [contacts, setContacts] = useState([])
  const [error,    setError]    = useState(null)

  const load = async () => {
    if (loaded) return
    setLoading(true)
    setError(null)
    try {
      const [medRes, contactRes] = await Promise.all([
        supabase
          .from('emergency_profiles')
          .select('blood_group,allergies,medical_conditions,medications')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('emergency_contacts')
          .select('id,name,relation,phone,is_primary')
          .eq('user_id', userId)
          .order('is_primary', { ascending: false }),
      ])
      setMedInfo(medRes.data)
      setContacts(contactRes.data || [])
      setLoaded(true)
    } catch {
      setError('Could not load emergency info.')
    } finally {
      setLoading(false)
    }
  }

  const toggle = () => {
    if (!expanded && !loaded) load()
    setExpanded(p => !p)
  }

  const hasData = medInfo || contacts.length > 0

  return (
    <div className="mt-2 border-t border-slate-800/60">
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between px-1 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Heart className="w-3.5 h-3.5 text-red-400" />
          Emergency Info
        </span>
        {expanded
          ? <ChevronUp  className="w-3.5 h-3.5" />
          : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {expanded && (
        <div className="space-y-2.5 pb-2">
          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
            </div>
          )}
          {error && <p className="text-xs text-red-400">{error}</p>}

          {/* Traveler call button */}
          {travelerPhone && (
            <a
              href={`tel:${travelerPhone}`}
              className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-800/50 rounded-xl px-3 py-2.5 text-emerald-300 text-xs font-bold hover:bg-emerald-900/60 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              Call Traveler: {travelerPhone}
            </a>
          )}

          {/* Medical info */}
          {medInfo && (
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-2">
              {medInfo.blood_group && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 w-24 shrink-0">Blood Group</span>
                  <span className="text-xs font-bold text-red-300 bg-red-950/60 border border-red-800/50 px-2 py-0.5 rounded-full">
                    {medInfo.blood_group}
                  </span>
                </div>
              )}
              {[
                ['Allergies',   medInfo.allergies],
                ['Conditions',  medInfo.medical_conditions],
                ['Medications', medInfo.medications],
              ].map(([label, val]) => val ? (
                <div key={label} className="flex items-start gap-2 text-xs">
                  <span className="text-slate-500 w-24 shrink-0 mt-0.5">{label}</span>
                  <span className="text-slate-200 leading-relaxed">{val}</span>
                </div>
              ) : null)}
            </div>
          )}

          {/* Emergency contacts */}
          {contacts.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Emergency Contacts</p>
              {contacts.map(c => (
                <a
                  key={c.id}
                  href={`tel:${c.phone}`}
                  className="flex items-center justify-between bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2.5 hover:bg-slate-900/60 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-bold text-white">{c.name}</p>
                      {c.is_primary && (
                        <span className="text-[9px] text-amber-400 bg-amber-950/60 border border-amber-800/50 px-1.5 py-0.5 rounded-full font-bold shrink-0">
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {c.relation ? `${c.relation} · ` : ''}{c.phone}
                    </p>
                  </div>
                  <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-2" />
                </a>
              ))}
            </div>
          )}

          {loaded && !hasData && !travelerPhone && (
            <p className="text-xs text-slate-500 italic py-1">
              No emergency info on file for this traveler.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
