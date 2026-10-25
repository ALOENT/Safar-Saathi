/**
 * cloudinary.js – unsigned upload helper
 * Uses fetch + FormData only; no SDK; no API secret.
 * Env vars: VITE_CLOUDINARY_CLOUD_NAME, VITE_CLOUDINARY_UPLOAD_PRESET
 */

const CLOUD  = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_BYTES     = 5 * 1024 * 1024  // 5 MB
const MAX_PX        = 1280

// ── Build an optimized Cloudinary delivery URL ─────────────────────────────
// Insert transformation string after /upload/
export function cld(url, transform = 'f_auto,q_auto') {
  if (!url) return url
  return url.replace('/upload/', `/upload/${transform}/`)
}

// ── Compress a File to max MAX_PX on the longest side ─────────────────────
async function compress(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const blobUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(blobUrl)
      const { naturalWidth: w, naturalHeight: h } = img
      const scale = Math.min(1, MAX_PX / Math.max(w, h))
      const tw = Math.round(w * scale)
      const th = Math.round(h * scale)
      const canvas = document.createElement('canvas')
      canvas.width  = tw
      canvas.height = th
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, tw, th)
      const mimeType = ALLOWED_TYPES.has(file.type) ? file.type : 'image/jpeg'
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('Canvas compression failed')); return }
          resolve(new File([blob], file.name, { type: mimeType }))
        },
        mimeType,
        0.88,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error('Could not read image')) }
    img.src = blobUrl
  })
}

/**
 * uploadImage(file, { onProgress })
 *   – validates type and size
 *   – compresses to ≤1280px
 *   – uploads via XHR (for progress) to Cloudinary unsigned preset
 *   – resolves with secure_url
 *   – rejects with Error on any failure
 */
export function uploadImage(file, { onProgress } = {}) {
  return new Promise(async (resolve, reject) => {
    // 1. Type check
    if (!ALLOWED_TYPES.has(file.type)) {
      return reject(new Error('Only JPG, PNG or WebP images are allowed.'))
    }
    // 2. Size check (before compression)
    if (file.size > MAX_BYTES) {
      // We'll compress first; warn but continue
    }

    let toUpload
    try {
      toUpload = await compress(file)
    } catch (e) {
      return reject(e)
    }

    // 3. Still too large after compression? Hard reject.
    if (toUpload.size > MAX_BYTES) {
      return reject(new Error('Image is too large (max 5 MB). Please choose a smaller photo.'))
    }

    const fd = new FormData()
    fd.append('file',           toUpload)
    fd.append('upload_preset',  PRESET)
    fd.append('folder',         'safarsaathi')

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`)

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
      })
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText)
          if (json.secure_url) resolve(json.secure_url)
          else reject(new Error('Upload succeeded but no URL returned.'))
        } catch {
          reject(new Error('Invalid response from Cloudinary.'))
        }
      } else {
        let msg = `Upload failed (HTTP ${xhr.status})`
        try { msg = JSON.parse(xhr.responseText)?.error?.message || msg } catch {}
        reject(new Error(msg))
      }
    }
    xhr.onerror = () => reject(new Error('Network error during upload. Check your connection.'))
    xhr.send(fd)
  })
}
