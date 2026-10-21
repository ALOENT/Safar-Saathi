import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Shield, User, Lock, Mail, Phone, ArrowRight, AlertCircle } from 'lucide-react'

export const AuthPage = () => {
  const [isSignUp, setIsSignUp] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
  })
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setLoading(true)

    try {
      if (isSignUp) {
        if (!formData.name.trim()) {
          setErrorMsg('Please enter your full name')
          setLoading(false)
          return
        }

        // Always sign up as 'traveler' – no role selector
        const { error } = await signUp({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          phone: formData.phone,
        })

        if (error) {
          setErrorMsg(error.message)
          setLoading(false)
          return
        }

        navigate('/home')
      } else {
        const { data, error } = await signIn({
          email: formData.email,
          password: formData.password,
        })

        if (error) {
          setErrorMsg(error.message)
          setLoading(false)
          return
        }

        // Navigate based on loaded profile role
        const role = data?.user?.user_metadata?.role || 'traveler'
        if (role === 'authority') navigate('/authority')
        else navigate('/home')
      }
    } catch (err) {
      setErrorMsg(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center px-4 py-8 sm:px-6 lg:px-8">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-900/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-800/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-md w-full mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-800 to-emerald-600 border border-emerald-400/30 flex items-center justify-center shadow-xl">
            <Shield className="w-9 h-9 text-emerald-100" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Safar<span className="text-emerald-400">Saathi</span>
          </h2>
          <p className="text-xs text-slate-400">Your Trusted Realtime Tourist Safety Companion</p>
        </div>

        {/* Auth Mode Toggle */}
        <div className="bg-slate-900/90 p-1 rounded-xl border border-slate-800 flex">
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setErrorMsg('') }}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all ${
              !isSignUp
                ? 'bg-emerald-900 text-emerald-100 shadow-md border border-emerald-700/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setErrorMsg('') }}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all ${
              isSignUp
                ? 'bg-emerald-900 text-emerald-100 shadow-md border border-emerald-700/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Card Form */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
          {errorMsg && (
            <div className="bg-red-950/80 border border-red-800/80 rounded-xl p-3.5 flex items-start space-x-2.5 text-red-200 text-xs">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name – sign up only */}
            {isSignUp && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    name="name"
                    required={isSignUp}
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  name="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Phone – sign up only */}
            {isSignUp && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Phone Number <span className="text-slate-500">(Optional)</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91 9876543210"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-emerald-800 to-emerald-600 hover:from-emerald-700 hover:to-emerald-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-emerald-950/50 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              <span>{loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
