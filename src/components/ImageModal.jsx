/**
 * ImageModal.jsx
 * Full-screen lightbox for viewing any image URL.
 * Props: src, alt, onClose
 */
import React, { useEffect } from 'react'
import { X } from 'lucide-react'

export function ImageModal({ src, alt = 'Photo', onClose }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
        onClick={onClose}
        aria-label="Close"
      >
        <X className="w-5 h-5 text-white" />
      </button>
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-[90vh] rounded-2xl object-contain shadow-2xl"
      />
    </div>
  )
}
