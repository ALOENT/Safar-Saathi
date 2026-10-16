import React from 'react'
import { ShieldCheck, ShieldAlert, ShieldX, AlertTriangle } from 'lucide-react'

/**
 * SafetyScoreWidget
 * Circular score display + reason list + low-score alert banner.
 *
 * Props:
 *   score   – number 0-100
 *   level   – 'low' | 'moderate' | 'high'
 *   reasons – string[]
 *   loading – boolean
 */
export function SafetyScoreWidget({ score, level, reasons = [], loading = false }) {
  // ── Colour palette per risk level ──────────────────────────────────────────
  const palette = {
    low: {
      ring: '#22c55e',       // green-500
      ringBg: '#052e16',     // green-950
      text: 'text-green-400',
      badge: 'bg-green-950 text-green-300 border-green-800',
      label: 'Low Risk',
      Icon: ShieldCheck,
      iconClass: 'text-green-400',
      glow: 'shadow-[0_0_30px_rgba(34,197,94,0.25)]',
    },
    moderate: {
      ring: '#eab308',       // yellow-500
      ringBg: '#1c1a00',
      text: 'text-yellow-400',
      badge: 'bg-yellow-950 text-yellow-300 border-yellow-800',
      label: 'Moderate Risk',
      Icon: ShieldAlert,
      iconClass: 'text-yellow-400',
      glow: 'shadow-[0_0_30px_rgba(234,179,8,0.2)]',
    },
    high: {
      ring: '#ef4444',       // red-500
      ringBg: '#1c0101',
      text: 'text-red-400',
      badge: 'bg-red-950 text-red-300 border-red-800',
      label: 'High Risk',
      Icon: ShieldX,
      iconClass: 'text-red-400',
      glow: 'shadow-[0_0_30px_rgba(239,68,68,0.3)]',
    },
  }

  const p = palette[level] || palette.low

  // SVG ring math
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const safeScore = Math.max(0, Math.min(100, score ?? 0))
  const dashOffset = circumference - (safeScore / 100) * circumference

  return (
    <div className={`rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4 shadow-xl ${p.glow} transition-all duration-700`}>
      {/* Header */}
      <div className="flex items-center space-x-2">
        <p.Icon className={`w-5 h-5 ${p.iconClass}`} />
        <h3 className="text-sm font-bold text-white">Safety Score</h3>
        {loading && (
          <span className="ml-auto text-[10px] text-slate-500 animate-pulse">Updating…</span>
        )}
      </div>

      {/* Circular Score */}
      <div className="flex items-center justify-center">
        <div className="relative flex items-center justify-center w-[120px] h-[120px]">
          <svg width="120" height="120" viewBox="0 0 100 100" className="-rotate-90">
            {/* Background track */}
            <circle
              cx="50" cy="50" r={radius}
              fill="none"
              stroke={p.ringBg}
              strokeWidth="8"
            />
            {/* Score arc */}
            <circle
              cx="50" cy="50" r={radius}
              fill="none"
              stroke={p.ring}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={loading ? circumference : dashOffset}
              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />
          </svg>

          {/* Score number */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-black tabular-nums ${p.text}`}>
              {loading ? '…' : safeScore}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">/100</span>
          </div>
        </div>
      </div>

      {/* Level badge */}
      <div className="flex justify-center">
        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${p.badge}`}>
          {p.label}
        </span>
      </div>

      {/* High-risk alert banner */}
      {level === 'high' && !loading && (
        <div className="flex items-start space-x-2 bg-red-950/70 border border-red-700/60 rounded-xl p-3 animate-pulse">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-200 font-semibold leading-snug">
            ⚠️ High risk detected! Consider moving to a safer area or notifying your guide.
          </p>
        </div>
      )}

      {/* Reasons list */}
      {reasons.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Risk Factors</p>
          <ul className="space-y-1">
            {reasons.map((r, i) => (
              <li
                key={i}
                className="flex items-start space-x-2 text-xs text-slate-300 bg-slate-800/60 rounded-lg px-3 py-2"
              >
                <span className="text-amber-400 shrink-0">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {reasons.length === 0 && !loading && (
        <p className="text-center text-xs text-slate-500 italic">No active risk factors detected.</p>
      )}
    </div>
  )
}
