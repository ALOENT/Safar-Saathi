/**
 * ProfilePage.jsx — complete rewrite
 * Sections: Personal · Emergency Contacts · Medical & Safety · Active Trip · Logout
 */
import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate }    from 'react-router-dom'
import { useAuth }        from '../context/AuthContext'
import { useTrip }        from '../context/TripContext'
import { useActiveTrip }  from '../hooks/useActiveTrip'
import { supabase }       from '../lib/supabase'
import { useToast }       from '../context/ToastContext'
import {
  User, Phone, Globe, MapPin, Shield, LogOut, Edit3, Save, X,
  Plus, Trash2, Star, AlertCircle, CheckCircle2, Loader2,
  Heart, AlertTriangle, Calendar, DoorOpen, Crown, Lock,
} from 'lucide-react'

// ── Constants ──────────────────────────────────────────────────────────────────
const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown']
const LANGUAGES    = ['English','Hindi','Bengali','Telugu','Marathi','Tamil','Urdu','Gujarati','Kannada','Punjabi','Odia','Other']
const GENDERS      = ['Male','Female','Non-binary','Prefer not to say']
const RELATIONS    = ['Spouse','Parent','Child','Sibling','Friend','Colleague','Doctor','Other']

// ── Helpers ────────────────────────────────────────────────────────────────────
function validatePhone(p) {
  if (!p.trim()) return 'Phone number is required'
  if (!/^\+?[\d\s\-()\u0966-\u096F]{7,15}$/.test(p.trim())) return 'Enter a valid phone number'
  return ''
}

function computeCompletion(profile, medInfo, contacts) {
  const checks = [
    !!profile?.name,
    !!profile?.phone,
    !!profile?.home_city,
    !!profile?.preferred_language,
    contacts?.length > 0,
    !!medInfo?.blood_group,
    !!medInfo?.date_of_birth,
    !!(medInfo?.allergies || medInfo?.medical_conditions),
  ]
  const filled = checks.filter(Boolean).length
  return Math.round((filled / checks.length) * 100)
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function SectionCard({ icon: Icon, title, children, action }) {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-emerald-400 shrink-0" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function FieldRow({ label, editing, children }) {
  return (
    <div className={`flex items-start gap-3 px-4 py-3 border-b border-slate-800/30 last:border-0 ${editing ? 'bg-slate-950/30' : ''}`}>
      <span className="text-[10px] text-slate-500 uppercase tracking-wide w-28 shrink-0 mt-0.5">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

function FInput({ value, onChange, placeholder, type = 'text', min, max }) {
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} min={min} max={max}
      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white
        focus:outline-none focus:border-emerald-500 placeholder:text-slate-600"
    />
  )
}

function FSelect({ value, onChange, options }) {
  return (
    <select value={value} onChange={onChange}
      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500">
      <option value="">— Select —</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function FTextarea({ value, onChange, placeholder, rows = 2 }) {
  return (
    <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white
        focus:outline-none focus:border-emerald-500 placeholder:text-slate-600 resize-none"
    />
  )
}

function EditBar({ onSave, onCancel, saving, label = 'Save' }) {
  return (
    <div className="flex gap-1.5">
      <button onClick={onCancel}
        className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 border border-slate-700">
        <X className="w-3.5 h-3.5" />
      </button>
      <button onClick={onSave} disabled={saving}
        className="flex items-center gap-1 text-[11px] font-bold text-white bg-emerald-700 hover:bg-emerald-600 px-2.5 py-1.5 rounded-lg disabled:opacity-50 transition-colors">
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
        {label}
      </button>
    </div>
  )
}

function ViewVal({ value }) {
  return value
    ? <span className="text-xs text-slate-200">{value}</span>
    : <span className="text-xs text-slate-600 italic">Not set</span>
}

// ── Contact inline form ────────────────────────────────────────────────────────
function ContactForm({ initial, onSave, onCancel, saving }) {
  const [f, setF] = useState({
    name:       initial?.name       || '',
    relation:   initial?.relation   || '',
    phone:      initial?.phone      || '',
    is_primary: initial?.is_primary || false,
  })
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!f.name.trim()) e.name = 'Name required'
    const pe = validatePhone(f.phone)
    if (pe) e.phone = pe
    setErrors(e)
    return !Object.keys(e).length
  }

  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  return (
    <div className="bg-slate-950/60 border border-slate-700 rounded-xl p-3 space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-slate-400 font-semibold">Name *</label>
          <FInput value={f.name} onChange={e => set('name', e.target.value)} placeholder="Contact name" />
          {errors.name  && <p className="text-[10px] text-red-400 mt-0.5">{errors.name}</p>}
        </div>
        <div>
          <label className="text-[10px] text-slate-400 font-semibold">Relation</label>
          <FSelect value={f.relation} onChange={e => set('relation', e.target.value)} options={RELATIONS} />
        </div>
      </div>
      <div>
        <label className="text-[10px] text-slate-400 font-semibold">Phone *</label>
        <FInput type="tel" value={f.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
        {errors.phone && <p className="text-[10px] text-red-400 mt-0.5">{errors.phone}</p>}
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
        <input type="checkbox" checked={f.is_primary} onChange={e => set('is_primary', e.target.checked)}
          className="accent-emerald-500 w-3.5 h-3.5" />
        Set as primary contact
      </label>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold rounded-xl">
          Cancel
        </button>
        <button type="button" onClick={() => { if (validate()) onSave(f) }} disabled={saving}
          className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save
        </button>
      </div>
    </div>
  )
}

// ── ProfilePage ────────────────────────────────────────────────────────────────
export const ProfilePage = () => {
  const { user, profile, signOut, fetchProfile } = useAuth()
  const { leaveTrip, endTrip }   = useTrip()
  const { trip, isGuide }        = useActiveTrip()
  const { addToast }             = useToast()
  const navigate                 = useNavigate()

  // ── Remote data ────────────────────────────────────────────────────────
  const [medInfo,  setMedInfo]  = useState(null)
  const [contacts, setContacts] = useState([])
  const [loading,  setLoading]  = useState(true)

  // ── Personal edit ──────────────────────────────────────────────────────
  const [editP, setEditP]       = useState(false)
  const [personal, setPersonal] = useState({ name:'', phone:'', home_city:'', preferred_language:'' })
  const [savingP,  setSavingP]  = useState(false)

  // ── Medical edit ───────────────────────────────────────────────────────
  const [editM, setEditM] = useState(false)
  const [med, setMed]     = useState({
    blood_group:'', date_of_birth:'', gender:'', nationality:'',
    home_address:'', allergies:'', medical_conditions:'', medications:'',
  })
  const [savingM, setSavingM] = useState(false)

  // ── Contacts UI ────────────────────────────────────────────────────────
  const [showAdd,    setShowAdd]    = useState(false)
  const [editingId,  setEditingId]  = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [savingC,    setSavingC]    = useState(false)

  // ── Trip actions ───────────────────────────────────────────────────────
  const [showLeave, setShowLeave] = useState(false)
  const [showEnd,   setShowEnd]   = useState(false)
  const [tripBusy,  setTripBusy]  = useState(false)

  // ── Load data ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [medRes, contactRes] = await Promise.all([
      supabase.from('emergency_profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('emergency_contacts').select('*').eq('user_id', user.id).order('is_primary', { ascending: false }),
    ])
    setMedInfo(medRes.data)
    if (medRes.data) {
      const d = medRes.data
      setMed({
        blood_group:        d.blood_group         || '',
        date_of_birth:      d.date_of_birth        || '',
        gender:             d.gender               || '',
        nationality:        d.nationality           || '',
        home_address:       d.home_address          || '',
        allergies:          d.allergies             || '',
        medical_conditions: d.medical_conditions    || '',
        medications:        d.medications           || '',
      })
    }
    setContacts(contactRes.data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (profile) {
      setPersonal({
        name:               profile.name               || '',
        phone:              profile.phone              || '',
        home_city:          profile.home_city          || '',
        preferred_language: profile.preferred_language || '',
      })
    }
  }, [profile])

  const completion = computeCompletion(profile, medInfo, contacts)
  const completionColor = completion >= 80 ? 'bg-emerald-500' : completion >= 50 ? 'bg-amber-500' : 'bg-red-500'

  // ── Save personal ──────────────────────────────────────────────────────
  const savePersonal = async () => {
    if (!personal.name.trim()) { addToast('Name cannot be empty', 'error'); return }
    setSavingP(true)
    const { error } = await supabase.from('profiles').update({
      name:               personal.name.trim(),
      phone:              personal.phone.trim()              || null,
      home_city:          personal.home_city.trim()          || null,
      preferred_language: personal.preferred_language         || null,
    }).eq('id', user.id)
    setSavingP(false)
    if (error) { addToast('Save failed: ' + error.message, 'error'); return }
    await fetchProfile(user.id)
    setEditP(false)
    addToast('Profile saved!', 'success')
  }

  const cancelPersonal = () => {
    setPersonal({
      name:               profile?.name               || '',
      phone:              profile?.phone              || '',
      home_city:          profile?.home_city          || '',
      preferred_language: profile?.preferred_language || '',
    })
    setEditP(false)
  }

  // ── Save medical ───────────────────────────────────────────────────────
  const saveMed = async () => {
    setSavingM(true)
    const payload = {
      user_id: user.id,
      blood_group:        med.blood_group        || null,
      date_of_birth:      med.date_of_birth      || null,
      gender:             med.gender             || null,
      nationality:        med.nationality.trim() || null,
      home_address:       med.home_address.trim()|| null,
      allergies:          med.allergies.trim()   || null,
      medical_conditions: med.medical_conditions.trim() || null,
      medications:        med.medications.trim() || null,
    }
    const { error } = await supabase.from('emergency_profiles').upsert(payload, { onConflict: 'user_id' })
    setSavingM(false)
    if (error) { addToast('Save failed: ' + error.message, 'error'); return }
    setMedInfo(payload)
    setEditM(false)
    addToast('Medical info saved!', 'success')
  }

  const cancelMed = () => {
    if (medInfo) {
      setMed({
        blood_group:        medInfo.blood_group         || '',
        date_of_birth:      medInfo.date_of_birth        || '',
        gender:             medInfo.gender               || '',
        nationality:        medInfo.nationality           || '',
        home_address:       medInfo.home_address          || '',
        allergies:          medInfo.allergies             || '',
        medical_conditions: medInfo.medical_conditions    || '',
        medications:        medInfo.medications           || '',
      })
    }
    setEditM(false)
  }

  // ── Contacts CRUD ──────────────────────────────────────────────────────
  const setPrimary = async (id) => {
    await supabase.from('emergency_contacts').update({ is_primary: false }).eq('user_id', user.id)
    await supabase.from('emergency_contacts').update({ is_primary: true }).eq('id', id)
    loadData()
    addToast('Primary contact updated', 'success')
  }

  const addContact = async (data) => {
    setSavingC(true)
    if (data.is_primary) {
      await supabase.from('emergency_contacts').update({ is_primary: false }).eq('user_id', user.id)
    }
    const { error } = await supabase.from('emergency_contacts').insert({ ...data, user_id: user.id })
    setSavingC(false)
    if (error) { addToast('Failed to add contact', 'error'); return }
    setShowAdd(false)
    addToast('Contact added!', 'success')
    loadData()
  }

  const saveContact = async (id, data) => {
    setSavingC(true)
    if (data.is_primary) {
      await supabase.from('emergency_contacts').update({ is_primary: false }).eq('user_id', user.id)
    }
    const { error } = await supabase.from('emergency_contacts').update(data).eq('id', id)
    setSavingC(false)
    if (error) { addToast('Failed to update', 'error'); return }
    setEditingId(null)
    addToast('Contact updated!', 'success')
    loadData()
  }

  const deleteContact = async (id) => {
    const { error } = await supabase.from('emergency_contacts').delete().eq('id', id)
    if (error) { addToast('Failed to delete', 'error'); return }
    setConfirmDel(null)
    addToast('Contact removed', 'success')
    loadData()
  }

  // ── Trip actions ───────────────────────────────────────────────────────
  const handleLeave = async () => {
    setTripBusy(true)
    const res = await leaveTrip()
    setTripBusy(false)
    if (res?.error) addToast('Failed to leave trip', 'error')
    else { setShowLeave(false); addToast('Left trip', 'success') }
  }

  const handleEnd = async () => {
    setTripBusy(true)
    const res = await endTrip(trip?.id)
    setTripBusy(false)
    if (res?.error) addToast('Failed to end trip', 'error')
    else { setShowEnd(false); addToast('Trip ended', 'success') }
  }

  // ── Skeleton ───────────────────────────────────────────────────────────
  if (!user || !profile) {
    return (
      <div className="pb-safe max-w-md mx-auto px-4 py-4 space-y-4 animate-pulse">
        <div className="h-36 bg-slate-900 rounded-2xl" />
        <div className="h-48 bg-slate-900 rounded-2xl" />
        <div className="h-32 bg-slate-900 rounded-2xl" />
        <div className="h-64 bg-slate-900 rounded-2xl" />
      </div>
    )
  }

  const initials  = profile.name?.charAt(0).toUpperCase() || 'U'
  const roleColor = profile.role === 'authority'
    ? 'from-red-800 to-red-600'
    : 'from-emerald-800 to-emerald-600'
  const roleBadge = profile.role === 'authority'
    ? 'bg-red-950 text-red-300 border-red-800'
    : 'bg-emerald-950 text-emerald-300 border-emerald-800'

  return (
    <div className="pb-safe max-w-md mx-auto px-4 py-4 space-y-4">

      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-emerald-900 to-slate-950 border border-emerald-800/60 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-full bg-gradient-to-tr ${roleColor} border-2 border-white/20 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shrink-0`}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-white truncate">{profile.name}</h2>
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
            <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${roleBadge}`}>
              {profile.role}
            </span>
          </div>
        </div>

        {/* Completion bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Profile Completeness</span>
            <span className={`text-[10px] font-bold ${completion >= 80 ? 'text-emerald-400' : completion >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
              {completion}%
            </span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${completionColor}`}
              style={{ width: `${completion}%` }} />
          </div>
          {completion < 100 && (
            <p className="text-[10px] text-slate-500">
              {completion < 50
                ? 'Add medical info and emergency contacts to improve your safety profile.'
                : completion < 80
                  ? 'Almost there — a few more details to go.'
                  : 'Nearly complete!'}
            </p>
          )}
        </div>
      </div>

      {/* ── Personal section ── */}
      <SectionCard
        icon={User}
        title="Personal Info"
        action={
          editP
            ? <EditBar onSave={savePersonal} onCancel={cancelPersonal} saving={savingP} />
            : <button onClick={() => setEditP(true)}
                className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-1.5 rounded-lg transition-colors">
                <Edit3 className="w-3 h-3" /> Edit
              </button>
        }
      >
        <div>
          <FieldRow label="Name" editing={editP}>
            {editP
              ? <FInput value={personal.name} onChange={e => setPersonal(p => ({ ...p, name: e.target.value }))} placeholder="Your full name" />
              : <ViewVal value={profile.name} />}
          </FieldRow>
          <FieldRow label="Phone" editing={editP}>
            {editP
              ? <FInput type="tel" value={personal.phone} onChange={e => setPersonal(p => ({ ...p, phone: e.target.value }))} placeholder="+91 98765 43210" />
              : <ViewVal value={profile.phone} />}
          </FieldRow>
          <FieldRow label="Home City" editing={editP}>
            {editP
              ? <FInput value={personal.home_city} onChange={e => setPersonal(p => ({ ...p, home_city: e.target.value }))} placeholder="e.g. Mumbai" />
              : <ViewVal value={profile.home_city} />}
          </FieldRow>
          <FieldRow label="Language" editing={editP}>
            {editP
              ? <FSelect value={personal.preferred_language} onChange={e => setPersonal(p => ({ ...p, preferred_language: e.target.value }))} options={LANGUAGES} />
              : <ViewVal value={profile.preferred_language} />}
          </FieldRow>
          <FieldRow label="Email">
            <span className="text-xs text-slate-500 italic truncate">{user.email}</span>
          </FieldRow>
          <FieldRow label="Auth Status">
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Active session
            </span>
          </FieldRow>
        </div>
      </SectionCard>

      {/* ── Emergency contacts ── */}
      <SectionCard
        icon={Phone}
        title={`Emergency Contacts (${contacts.length}/3)`}
        action={
          contacts.length < 3 && !showAdd
            ? <button onClick={() => setShowAdd(true)}
                className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-1.5 rounded-lg transition-colors">
                <Plus className="w-3 h-3" /> Add
              </button>
            : null
        }
      >
        <div className="p-4 space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading contacts…
            </div>
          ) : contacts.length === 0 && !showAdd ? (
            <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center space-y-2">
              <Phone className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400 font-semibold">No emergency contacts yet</p>
              <p className="text-[10px] text-slate-600">Add up to 3 people to contact in an emergency.</p>
              <button onClick={() => setShowAdd(true)}
                className="text-xs text-emerald-400 font-bold hover:underline mt-1">
                + Add first contact
              </button>
            </div>
          ) : (
            contacts.map(c => (
              <div key={c.id} className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden">
                {editingId === c.id ? (
                  <div className="p-3">
                    <ContactForm
                      initial={c}
                      onSave={data => saveContact(c.id, data)}
                      onCancel={() => setEditingId(null)}
                      saving={savingC}
                    />
                  </div>
                ) : confirmDel === c.id ? (
                  <div className="px-3 py-2.5 flex items-center justify-between bg-red-950/40 border-t border-red-900/50">
                    <p className="text-xs text-red-300">Remove <strong>{c.name}</strong>?</p>
                    <div className="flex gap-3">
                      <button onClick={() => setConfirmDel(null)} className="text-[11px] text-slate-400 hover:text-white">Keep</button>
                      <button onClick={() => deleteContact(c.id)} className="text-[11px] text-red-400 font-bold hover:text-red-200">Remove</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center px-3 py-3 gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs font-bold text-white">{c.name}</p>
                        {c.is_primary && (
                          <span className="text-[9px] text-amber-400 bg-amber-950/60 border border-amber-800/50 px-1.5 py-0.5 rounded-full font-bold">
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400">
                        {c.relation ? `${c.relation} · ` : ''}{c.phone}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {!c.is_primary && (
                        <button onClick={() => setPrimary(c.id)} title="Make primary"
                          className="p-1.5 text-slate-500 hover:text-amber-400 rounded transition-colors">
                          <Star className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <a href={`tel:${c.phone}`}
                        className="p-1.5 text-slate-500 hover:text-emerald-400 rounded transition-colors">
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                      <button onClick={() => { setEditingId(c.id); setConfirmDel(null) }}
                        className="p-1.5 text-slate-500 hover:text-slate-200 rounded transition-colors">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { setConfirmDel(c.id); setEditingId(null) }}
                        className="p-1.5 text-slate-500 hover:text-red-400 rounded transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {showAdd && (
            <ContactForm
              onSave={addContact}
              onCancel={() => setShowAdd(false)}
              saving={savingC}
            />
          )}
        </div>
      </SectionCard>

      {/* ── Medical & Safety ── */}
      <SectionCard
        icon={Heart}
        title="Medical & Safety"
        action={
          editM
            ? <EditBar onSave={saveMed} onCancel={cancelMed} saving={savingM} />
            : <button onClick={() => setEditM(true)}
                className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-1.5 rounded-lg transition-colors">
                <Edit3 className="w-3 h-3" /> Edit
              </button>
        }
      >
        <div>
          {/* Blood group */}
          <FieldRow label="Blood Group" editing={editM}>
            {editM
              ? <FSelect value={med.blood_group} onChange={e => setMed(p => ({ ...p, blood_group: e.target.value }))} options={BLOOD_GROUPS} />
              : medInfo?.blood_group
                ? <span className="text-xs font-bold text-red-300 bg-red-950/50 border border-red-800/40 px-2 py-0.5 rounded-full">{medInfo.blood_group}</span>
                : <span className="text-xs text-slate-600 italic">Not set</span>}
          </FieldRow>

          {/* DOB */}
          <FieldRow label="Date of Birth" editing={editM}>
            {editM
              ? <FInput type="date" value={med.date_of_birth} max={new Date().toISOString().split('T')[0]}
                  onChange={e => setMed(p => ({ ...p, date_of_birth: e.target.value }))} />
              : <ViewVal value={medInfo?.date_of_birth
                  ? new Date(medInfo.date_of_birth).toLocaleDateString([], { day:'numeric', month:'short', year:'numeric' })
                  : null} />}
          </FieldRow>

          {/* Gender */}
          <FieldRow label="Gender" editing={editM}>
            {editM
              ? <FSelect value={med.gender} onChange={e => setMed(p => ({ ...p, gender: e.target.value }))} options={GENDERS} />
              : <ViewVal value={medInfo?.gender} />}
          </FieldRow>

          {/* Nationality */}
          <FieldRow label="Nationality" editing={editM}>
            {editM
              ? <FInput value={med.nationality} onChange={e => setMed(p => ({ ...p, nationality: e.target.value }))} placeholder="e.g. Indian" />
              : <ViewVal value={medInfo?.nationality} />}
          </FieldRow>

          {/* Home address */}
          <FieldRow label="Home Address" editing={editM}>
            {editM
              ? <FTextarea value={med.home_address} onChange={e => setMed(p => ({ ...p, home_address: e.target.value }))} placeholder="Your home address" />
              : <span className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {medInfo?.home_address || <span className="text-slate-600 italic">Not set</span>}
                </span>}
          </FieldRow>

          {/* Allergies */}
          <FieldRow label="Allergies" editing={editM}>
            {editM
              ? <FTextarea value={med.allergies} onChange={e => setMed(p => ({ ...p, allergies: e.target.value }))} placeholder="e.g. Penicillin, Peanuts" />
              : <span className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {medInfo?.allergies || <span className="text-slate-600 italic">None</span>}
                </span>}
          </FieldRow>

          {/* Conditions */}
          <FieldRow label="Conditions" editing={editM}>
            {editM
              ? <FTextarea value={med.medical_conditions} onChange={e => setMed(p => ({ ...p, medical_conditions: e.target.value }))} placeholder="e.g. Asthma, Diabetes" />
              : <span className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {medInfo?.medical_conditions || <span className="text-slate-600 italic">None</span>}
                </span>}
          </FieldRow>

          {/* Medications */}
          <FieldRow label="Medications" editing={editM}>
            {editM
              ? <FTextarea value={med.medications} onChange={e => setMed(p => ({ ...p, medications: e.target.value }))} placeholder="Current medications and dosage" />
              : <span className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {medInfo?.medications || <span className="text-slate-600 italic">None</span>}
                </span>}
          </FieldRow>
        </div>

        {/* Privacy note */}
        <div className="mx-4 mb-4 mt-1 flex items-start gap-2 bg-slate-950/60 border border-slate-700/50 rounded-xl px-3 py-2.5">
          <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Visible only to you, your trip guide and authorities in emergencies.
          </p>
        </div>
      </SectionCard>

      {/* ── Active trip ── */}
      {trip && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-slate-800/60">
            <DoorOpen className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{trip.name}</p>
              <p className="text-[10px] text-slate-500">
                {isGuide ? 'Guide' : 'Member'} · Code: <span className="font-mono text-emerald-400">{trip.code}</span>
              </p>
            </div>
            {isGuide && <Crown className="w-4 h-4 text-amber-400 shrink-0" />}
          </div>
          <div className="p-4 space-y-2">
            {isGuide ? (
              !showEnd ? (
                <button onClick={() => setShowEnd(true)}
                  className="w-full bg-red-950/60 hover:bg-red-900/50 border border-red-800/50 text-red-300 font-semibold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors">
                  <AlertTriangle className="w-4 h-4" /> End Trip for Everyone
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-red-300 text-center">End <strong>{trip.name}</strong> for all members?</p>
                  <div className="flex gap-2">
                    <button onClick={() => setShowEnd(false)}
                      className="flex-1 py-2.5 bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold rounded-xl">Cancel</button>
                    <button onClick={handleEnd} disabled={tripBusy}
                      className="flex-1 py-2.5 bg-red-700 hover:bg-red-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors">
                      {tripBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} End Trip
                    </button>
                  </div>
                </div>
              )
            ) : (
              !showLeave ? (
                <button onClick={() => setShowLeave(true)}
                  className="w-full bg-amber-950/60 hover:bg-amber-900/50 border border-amber-800/50 text-amber-300 font-semibold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors">
                  <DoorOpen className="w-4 h-4" /> Leave Trip
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-amber-300 text-center">Leave <strong>{trip.name}</strong>?</p>
                  <div className="flex gap-2">
                    <button onClick={() => setShowLeave(false)}
                      className="flex-1 py-2.5 bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold rounded-xl">Cancel</button>
                    <button onClick={handleLeave} disabled={tripBusy}
                      className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors">
                      {tripBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Leave
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* ── Logout ── */}
      <button
        id="signout-btn"
        onClick={signOut}
        className="w-full bg-red-950/80 hover:bg-red-900 text-red-200 font-semibold py-3.5 px-4 rounded-xl
          border border-red-800/60 flex items-center justify-center gap-2 transition-all text-sm min-h-[48px]"
      >
        <LogOut className="w-4 h-4" />
        Sign Out of SafarSaathi
      </button>

      <div className="h-4" />
    </div>
  )
}
