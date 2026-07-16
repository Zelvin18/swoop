/**
 * CameraPreview — requests camera access and shows live feed
 * Used in live streaming pages and Go Live setup
 */
import { useEffect, useRef, useState } from 'react'

export default function CameraPreview({ facingMode = 'user', style = {}, className = '' }) {
  const videoRef  = useRef(null)
  const streamRef = useRef(null)
  const [error,   setError]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const startCamera = async () => {
      // Stop any existing stream before requesting a new one
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          // Lower constraints — 640×480 is plenty for a live preview and much faster to negotiate
          video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        })
        if (!active) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          // Use a promise so we don't throw on fast unmounts
          videoRef.current.play().catch(() => {})
        }
        setLoading(false)
        setError(null)
      } catch (err) {
        if (!active) return
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Camera access denied')
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('No camera found')
        } else if (err.name === 'NotReadableError') {
          setError('Camera in use by another app')
        } else {
          setError('Camera unavailable')
        }
        setLoading(false)
      }
    }

    startCamera()

    return () => {
      active = false
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
    }
  }, [facingMode])

  if (error) return (
    <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, background:'#0a0a0a', ...style }}>
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round">
        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </svg>
      <div style={{ fontSize:12, color:'rgba(255,255,255,0.35)', textAlign:'center', maxWidth:160 }}>{error}</div>
    </div>
  )

  return (
    <div style={{ width:'100%', height:'100%', position:'relative', background:'#000', ...style }} className={className}>
      {loading && (
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#0a0a0a', zIndex:1, gap:10 }}>
          <div style={{ width:24, height:24, border:'2px solid rgba(255,255,255,0.1)', borderTopColor:'#FF3366', borderRadius:'50%', animation:'camSpin 0.7s linear infinite' }}/>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)' }}>Starting camera…</div>
        </div>
      )}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width:'100%', height:'100%', objectFit:'cover', transform: facingMode==='user' ? 'scaleX(-1)' : 'none' }}
      />
      <style>{`@keyframes camSpin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
