import React, { useState, useEffect } from 'react'
import { Wifi, WifiOff } from 'lucide-react'

/**
 * OnlineBanner – shows a small sticky banner at the top of the page when the
 * browser is offline.  Disappears automatically 3 s after connectivity returns.
 */
export const OnlineBanner = () => {
  const [online, setOnline] = useState(navigator.onLine)
  const [showReconnected, setShowReconnected] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true)
      setShowReconnected(true)
      setTimeout(() => setShowReconnected(false), 3000)
    }
    const handleOffline = () => {
      setOnline(false)
      setShowReconnected(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (online && !showReconnected) return null

  return (
    <div
      className={`w-full z-50 text-center py-1.5 px-4 text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-500 ${
        online
          ? 'bg-emerald-900/90 text-emerald-200 border-b border-emerald-700/50'
          : 'bg-amber-900/95 text-amber-100 border-b border-amber-700/60'
      }`}
    >
      {online ? (
        <>
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          <span>Back online</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>You're offline — live data paused</span>
        </>
      )}
    </div>
  )
}
