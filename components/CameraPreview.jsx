/**
 * CameraPreview — requests camera + microphone access and shows live feed
 * Exports the MediaStream via onStream callback so host pages can use it for WebRTC.
 */
import { useEffect, useRef, useState, useCallback } from 'react'

export default function CameraPreview({ facingMode = 'user', style = {}, className = '', onStream = null, captureAudio = false }) {
  const videoRef   = useRef(null)
  const streamRef  = useRef(null)
  const mountedRef = useRef(true)
  const [error,    setError]   = useState(null)
  const [loading,  setLoading] = useState(true)

  const startCamera = useCallback(async () => {
    if (!mountedRef.current) return

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }

    setLoading(true)
    setError(null)

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Camera not supported.\nOpen via https://')
      setLoading(false)
      return
    }

    try {
      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: captureAudio,
        })
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: captureAudio })
      }

      if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return }

      streamRef.current = stream
      onStream?.(stream)

      const attach = () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
          if (mountedRef.current) setLoading(false)
        } else {
          requestAnimationFrame(() => {
            if (videoRef.current && mountedRef.current) {
              videoRef.current.srcObject = stream
              videoRef.current.play().catch(() => {})
              setLoading(false)
            }
          })
        }
      }
      attach()

    } catch (err) {
      if (!mountedRef.current) return
      const n = err?.name || ''
      if (n === 'NotAllowedError' || n === 'PermissionDeniedError') {
        setError('Camera access denied.\nTap to retry.')
      } else if (n === 'NotFoundError' || n === 'DevicesNotFoundError') {
        setError('No camera found on this device')
      } else if (n === 'NotReadableError' || n === 'TrackStartError') {
        setError('Camera in use by another app.\nTap to retry.')
      } else if (n === 'OverconstrainedError') {
        setError('Camera settings not supported')
      } else {
        setError('Camera unavailable.\nTap to retry.')
      }
      setLoading(false)
    }
  }, [facingMode, captureAudio, onStream])

  useEffect(() => {
    mountedRef.current = true
    startCamera()
    return () => {
      mountedRef.current = false
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
    }
  }, [startCamera])

  if (error) {
    return (
      <div onClick={startCamera} style={{ width:'100%',height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,background:'#0a0a0a',cursor:'pointer',...style }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round">
          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
        <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', textAlign:'center', maxWidth:180, lineHeight:1.6, whiteSpace:'pre-line' }}>{error}</div>
        <div style={{ fontSize:12, fontWeight:700, color:'#FF3366', background:'rgba(255,51,102,0.1)', border:'1px solid rgba(255,51,102,0.3)', borderRadius:20, padding:'6px 16px' }}>Tap to retry</div>
      </div>
    )
  }

  return (
    <div style={{ width:'100%', height:'100%', position:'relative', background:'#000', ...style }} className={className}>
      {loading && (
        <div style={{ position:'absolute', inset:0, zIndex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#0a0a0a', gap:12 }}>
          <div style={{ width:28, height:28, border:'2px solid rgba(255,255,255,0.08)', borderTopColor:'#FF3366', borderRadius:'50%', animation:'camSpin 0.8s linear infinite' }}/>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.35)' }}>Starting camera…</div>
        </div>
      )}
      <video ref={videoRef} autoPlay playsInline muted
        style={{ width:'100%', height:'100%', objectFit:'cover', transform: facingMode==='user'?'scaleX(-1)':'none', display: loading?'none':'block' }}
      />
      <style>{`@keyframes camSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}
