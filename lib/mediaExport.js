/**
 * Bake filters + text overlays into images before upload.
 * Videos keep overlays as JSON (rendered in feed) + CSS filters.
 */
import { getFilterCSS } from './mediaFilters'

const OUT_W = 1080
const OUT_H = 1920

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function coverDraw(ctx, img, w, h) {
  const ir = img.width / img.height
  const cr = w / h
  let sw, sh, sx, sy
  if (ir > cr) {
    sh = img.height; sw = sh * cr
    sx = (img.width - sw) / 2; sy = 0
  } else {
    sw = img.width; sh = sw / cr
    sx = 0; sy = (img.height - sh) / 2
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h)
}

function drawTextOverlay(ctx, overlay, w, h) {
  const sizeMap = { small: 48, medium: 72, large: 102 }
  const fontSize = sizeMap[overlay.size] || 72
  const x = (overlay.x ?? 0.5) * w
  const y = (overlay.y ?? 0.5) * h

  ctx.save()
  ctx.font = `900 ${fontSize}px Inter, Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  if (overlay.style === 'outline') {
    ctx.strokeStyle = overlay.color === '#FFFFFF' ? '#000' : '#fff'
    ctx.lineWidth = Math.max(3, fontSize * 0.06)
    ctx.strokeText(overlay.text, x, y)
    ctx.fillStyle = 'transparent'
  } else if (overlay.style === 'shadow') {
    ctx.shadowColor = 'rgba(0,0,0,0.85)'
    ctx.shadowBlur = fontSize * 0.25
    ctx.fillStyle = overlay.color || '#fff'
  } else {
    ctx.fillStyle = overlay.color || '#fff'
  }

  ctx.fillText(overlay.text, x, y)
  ctx.restore()
}

export async function exportImageClip(clip) {
  const src = clip.url || (clip.file ? URL.createObjectURL(clip.file) : null)
  if (!src) throw new Error('No image source')

  const img = await loadImage(src)
  const canvas = document.createElement('canvas')
  canvas.width = OUT_W
  canvas.height = OUT_H
  const ctx = canvas.getContext('2d')

  const filterCSS = getFilterCSS(clip.filter)
  if (filterCSS) ctx.filter = filterCSS

  coverDraw(ctx, img, OUT_W, OUT_H)

  for (const overlay of clip.textOverlays || []) {
    drawTextOverlay(ctx, overlay, OUT_W, OUT_H)
  }

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Canvas export failed'))), 'image/jpeg', 0.9)
  })

  if (src.startsWith('blob:') && src !== clip.url) URL.revokeObjectURL(src)
  return new File([blob], `swoop-${Date.now()}.jpg`, { type: 'image/jpeg' })
}

/** Capture first frame of video as JPEG thumbnail */
export async function captureVideoThumbnail(clip) {
  const src = clip.url || (clip.file ? URL.createObjectURL(clip.file) : null)
  if (!src) return null

  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.crossOrigin = 'anonymous'
    video.preload = 'metadata'
    video.src = src

    const cleanup = () => { video.src = ''; video.load() }

    video.onloadeddata = () => {
      video.currentTime = Math.min(0.5, (video.duration || 1) * 0.1)
    }
    video.onseeked = async () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = OUT_W
        canvas.height = OUT_H
        const ctx = canvas.getContext('2d')
        const filterCSS = getFilterCSS(clip.filter)
        if (filterCSS) ctx.filter = filterCSS
        coverDraw(ctx, video, OUT_W, OUT_H)
        for (const overlay of clip.textOverlays || []) {
          drawTextOverlay(ctx, overlay, OUT_W, OUT_H)
        }
        canvas.toBlob(b => { cleanup(); resolve(b ? new File([b], 'thumb.jpg', { type: 'image/jpeg' }) : null) }, 'image/jpeg', 0.85)
      } catch {
        cleanup()
        resolve(null)
      }
    }
    video.onerror = () => { cleanup(); resolve(null) }
    setTimeout(() => { cleanup(); resolve(null) }, 8000)
  })
}

function normalizeVideoFile(file) {
  if (!file) return null
  const type = file.type || 'video/mp4'
  const ext = type.includes('webm') ? 'webm' : 'mp4'
  if (file.name?.endsWith(`.${ext}`)) return file
  return new File([file], `swoop-video-${Date.now()}.${ext}`, { type })
}

/**
 * Prepare clips for upload — bake photos, normalize videos, collect overlay metadata.
 */
export async function prepareMediaForUpload(clips = [], onProgress) {
  const photos = []
  const videos = []
  const textOverlays = []
  let filterName = 'Original'
  const total = clips.length || 1
  let done = 0

  for (const clip of clips) {
    filterName = clip.filter || filterName
    const overlays = (clip.textOverlays || []).map(o => ({ ...o }))

    if (clip.type === 'video') {
      const file = normalizeVideoFile(clip.file)
      if (file) videos.push({ file, type: 'video' })
      if (overlays.length) textOverlays.push(...overlays)
    } else {
      try {
        const file = await exportImageClip(clip)
        photos.push({ file, type: 'photo' })
      } catch (err) {
        console.error('exportImageClip failed, using original', err)
        if (clip.file) photos.push({ file: clip.file, type: 'photo' })
      }
    }
    done++
    onProgress?.(Math.round((done / total) * 60))
  }

  return { photos, videos, textOverlays, filterName }
}

export function serializeTextOverlays(clips) {
  const all = []
  for (const clip of clips) {
    for (const o of clip.textOverlays || []) {
      all.push({ ...o })
    }
  }
  return all
}
