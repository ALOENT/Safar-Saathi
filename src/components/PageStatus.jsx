/**
 * PageStatus.jsx
 * Tiny shared building blocks for loading, error and empty states.
 * Import wherever a page fetches data.
 */
import React from 'react'
import { Loader2, AlertCircle, CheckCircle2, WifiOff } from 'lucide-react'

// ── Full-page spinner ──────────────────────────────────────────────────────────
export function PageLoader({ message = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 py-16 px-4">
      <div className="relative">
        <div className="w-14 h-14 rounded-full border-2 border-emerald-800/40" />
        <Loader2 className="w-14 h-14 text-emerald-400 animate-spin absolute inset-0" />
      </div>
      <p className="text-sm text-slate-400 font-medium animate-pulse">{message}</p>
    </div>
  )
}

// ── Inline card skeleton rows ──────────────────────────────────────────────────
export function SkeletonCard({ rows = 3 }) {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`h-3 rounded-full bg-slate-800 ${i === 0 ? 'w-3/4' : i % 2 === 0 ? 'w-1/2' : 'w-full'}`} />
      ))}
    </div>
  )
}

// ── Error banner ───────────────────────────────────────────────────────────────
export function PageError({ message, onRetry }) {
  return (
    <div className="bg-red-950/60 border border-red-800/60 rounded-2xl p-4 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-red-300">Something went wrong</p>
        <p className="text-xs text-red-400/80 mt-0.5 leading-relaxed">{message || 'Failed to load data. Check your connection.'}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 text-xs text-red-300 underline hover:text-red-100"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  )
}

// ── Empty state card ──────────────────────────────────────────────────────────
export function EmptyCard({ icon: Icon = CheckCircle2, title, subtitle }) {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 flex flex-col items-center text-center gap-3">
      <div className="p-3 bg-slate-800 rounded-full border border-slate-700">
        <Icon className="w-6 h-6 text-slate-400" />
      </div>
      {title && <p className="text-sm font-semibold text-slate-300">{title}</p>}
      {subtitle && <p className="text-xs text-slate-500 leading-relaxed max-w-[240px]">{subtitle}</p>}
    </div>
  )
}

// ── Offline inline notice (use inside content, not app-level) ─────────────────
export function OfflineNotice() {
  return (
    <div className="bg-amber-950/60 border border-amber-800/60 rounded-xl px-3 py-2.5 flex items-center gap-2">
      <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
      <p className="text-xs text-amber-300">You're offline — showing last known data</p>
    </div>
  )
}
