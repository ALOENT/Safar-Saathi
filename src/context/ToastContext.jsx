import React, { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext([])

let _addToast = null

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, duration)
  }, [])

  _addToast = addToast

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)

// Standalone call (outside React tree, e.g. from context files)
export const toast = {
  success: (msg) => _addToast?.(msg, 'success'),
  error: (msg) => _addToast?.(msg, 'error'),
  info: (msg) => _addToast?.(msg, 'info'),
}

// ── Toast Container ──────────────────────────────────────────────────────────

const ICONS = {
  success: '✅',
  error: '❌',
  info: 'ℹ️',
}

const STYLES = {
  success: 'bg-emerald-900/95 border-emerald-700/70 text-emerald-100',
  error: 'bg-red-900/95 border-red-700/70 text-red-100',
  info: 'bg-slate-800/95 border-slate-700 text-slate-100',
}

const ToastContainer = ({ toasts }) => {
  if (!toasts.length) return null

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2 w-full max-w-sm px-4 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`w-full flex items-start gap-2.5 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md text-sm font-medium pointer-events-auto
            animate-[fadeInDown_0.2s_ease] ${STYLES[t.type] || STYLES.info}`}
        >
          <span className="text-base leading-none mt-0.5 flex-shrink-0">{ICONS[t.type]}</span>
          <span className="leading-snug">{t.message}</span>
        </div>
      ))}
    </div>
  )
}
