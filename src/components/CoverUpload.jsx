/**
 * CoverUpload.jsx
 * Dashed upload zone for trip cover image.
 * Props:
 *   url       – current cover_url (or null)
 *   onUpload  – async (secure_url) => void
 *   className – extra wrapper classes
 */
import React, { useRef, useState } from 'react'
import { Image, Loader2, X } from 'lucide-react'
import { uploadImage, cld } from '../lib/cloudinary'
import { useToast } from '../context/ToastContext'

export function CoverUpload({ url, onUpload, className = '' }) {
  const inputRef  = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [progress,  setProgress]  = useState(0)
  const { addToast } = useToast()

  const optimizedUrl = url ? cld(url, 'w_800,h_300,c_fill,f_auto,q_auto') : null

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploading(true)
    setProgress(0)
    try {
      const secure_url = await uploadImage(file, {
        onProgress: (p) => setProgress(p),
      })
      await onUpload?.(secure_url)
    } catch (err) {
      addToast(err.message || 'Cover upload failed', 'error')
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  const handleRemove = (e) => {
    e.stopPropagation()
    onUpload?.(null)
  }

  return (
    <div className={`relative rounded-2xl overflow-hidden ${className}`}>
      {optimizedUrl ? (
        /* Has image – show it with remove button */
        <div className="relative">
          <img
            src={optimizedUrl}
            alt="Trip cover"
            className="w-full h-36 object-cover rounded-2xl"
          />
          {!uploading && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 bg-black/60 rounded-full p-1 hover:bg-black/80 transition-colors"
              aria-label="Remove cover"
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center rounded-2xl">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
              {progress > 0 && <span className="text-xs text-white mt-1">{progress}%</span>}
            </div>
          )}
        </div>
      ) : (
        /* No image – dashed upload zone */
        <button
          type="button"
          onClick={() => !uploading && inputRef.current?.click()}
          className="w-full border-2 border-dashed border-slate-700 hover:border-emerald-600
            rounded-2xl p-5 flex flex-col items-center gap-2 transition-colors group"
        >
          {uploading ? (
            <>
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              {progress > 0 && <span className="text-xs text-emerald-400">{progress}%</span>}
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-slate-800 group-hover:bg-slate-700 flex items-center justify-center transition-colors">
                <Image className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 transition-colors" />
              </div>
              <p className="text-xs font-semibold text-slate-400 group-hover:text-slate-200 transition-colors">
                Add Cover Image <span className="text-slate-600 font-normal">(optional)</span>
              </p>
              <p className="text-[10px] text-slate-600">JPG · PNG · WebP · max 5 MB</p>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  )
}
