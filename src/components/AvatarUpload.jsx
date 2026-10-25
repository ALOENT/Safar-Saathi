/**
 * AvatarUpload.jsx
 * Tappable avatar circle: shows photo or initials, camera-overlay on hover/tap.
 * Props:
 *   url      – current avatar_url (Cloudinary URL or null)
 *   name     – user name (for initials fallback)
 *   size     – tailwind size class for w/h e.g. 'w-14 h-14' (default)
 *   onUpload – async (secure_url: string) => void  called after successful upload
 *   roleColor – gradient classes e.g. 'from-emerald-800 to-emerald-600'
 */
import React, { useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { uploadImage, cld } from '../lib/cloudinary'
import { useToast } from '../context/ToastContext'

export function AvatarUpload({
  url,
  name = '',
  size = 'w-14 h-14',
  onUpload,
  roleColor = 'from-emerald-800 to-emerald-600',
}) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [progress,  setProgress]  = useState(0)
  const { addToast } = useToast()

  const initials = name?.charAt(0).toUpperCase() || 'U'

  const optimizedUrl = url
    ? cld(url, 'w_200,h_200,c_fill,g_face,f_auto,q_auto')
    : null

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''   // reset so same file can be picked again
    setUploading(true)
    setProgress(0)
    try {
      const secure_url = await uploadImage(file, {
        onProgress: (p) => setProgress(p),
      })
      await onUpload?.(secure_url)
    } catch (err) {
      addToast(err.message || 'Upload failed', 'error')
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  return (
    <button
      type="button"
      onClick={() => !uploading && inputRef.current?.click()}
      className={`relative ${size} rounded-full shrink-0 group focus:outline-none`}
      aria-label="Change avatar"
    >
      {/* Image or gradient initials */}
      {optimizedUrl ? (
        <img
          src={optimizedUrl}
          alt={name}
          className="w-full h-full rounded-full object-cover border-2 border-white/20 shadow-lg"
        />
      ) : (
        <div
          className={`w-full h-full rounded-full bg-gradient-to-tr ${roleColor} border-2 border-white/20
            flex items-center justify-center text-white font-extrabold text-xl shadow-lg`}
        >
          {initials}
        </div>
      )}

      {/* Overlay */}
      <div className={`absolute inset-0 rounded-full flex flex-col items-center justify-center
        bg-black/55 transition-opacity ${uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        {uploading ? (
          <>
            <Loader2 className="w-5 h-5 text-white animate-spin" />
            {progress > 0 && (
              <span className="text-[10px] text-white font-bold mt-0.5">{progress}%</span>
            )}
          </>
        ) : (
          <Camera className="w-5 h-5 text-white" />
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="user"
        className="hidden"
        onChange={handleFile}
      />
    </button>
  )
}
