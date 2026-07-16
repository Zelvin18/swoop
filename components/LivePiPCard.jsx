/**
 * LivePiPCard — Picture-in-Picture floating live card
 * Shown when the host navigates away from the live screen.
 * Draggable, shows camera feed + latest comment bubble.
 * Tap to return to full live screen.
 */
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { avatarColor } from '../lib/live'

export default function LivePiPCard({ liveConfig, onExpand, onEnd }) {
  const videoRef   = useRef(null)
  const streamRef  = useRef(null)
  const cardRef    = useRef(null)

  const [pos,         setPos]         = useState({ x: null, y: null }) // null = not positioned yet
  const [dragging,    setDragging]    = useState(false)
  const [latestComment, setLatestComment] = useState(null)
  const [viewers,     setViewers]     = useState(0)
  const dragStart    = useRef(null)

  const streamId = liveConfig?.streamId

  // ── Position on first render — bottom right above nav ────────────────────
  useEffect(() => {
    const navH = 78
    const safeBottom = 0
    const cardW = 120, cardH = 180
    setPos({
      x: window.innerWidth  - cardW - 16,
      y: window.innerHeight - cardH - navH - safeBottom - 16,
    })
  }, [])

  // ── Restart camera feed for PiP ──────────────────────────────────────────
  useEffect(() => {
    let mounted = true
    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) return
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } },
          audio: false,
        })
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
      } catch { /* silently ignore in PiP */ }
    }
    start()
    return () => {
      mounted = false
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  // ── Realtime: latest comment ──────────────────────────────────────────────
  useEffect(() => {
    if (!streamId) return
    const ch = supabase.channel(`pip-comments-${streamId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'live_comments', filter: `stream_id=eq.${streamId}`,
      }, async payload => {
        const c = payload.new
        const { data: profile } = await supabase
          .from('profiles').select('username,full_name')
          .eq('id', c.user_id).single()
        const name = profile?.username || profile?.full_name || 'viewer'
        setLatestComment({ user: name, text: c.message, color: avatarColor(c.user_id), id: Date.now() })
        // Clear after 4s
        setTimeout(() => setLatestComment(null), 4000)
      })
      .subscribe()

    // Viewer count
    supabase.channel(`pip-stream-${streamId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public',
        table: 'live_streams', filter: `id=eq.${streamId}`,
      }, payload => setViewers(payload.new.viewer_count || 0))
      .subscribe()

    return () => supabase.removeAllChannels()
  }, [streamId])

  // ── Drag handling (touch + mouse) ─────────────────────────────────────────
  const onTouchStart = (e) => {
    const t = e.touches[0]
    dragStart.current = { mx: t.clientX - pos.x, my: t.clientY - pos.y, moved: false }
    setDragging(true)
  }
  const onTouchMove = (e) => {
    if (!dragStart.current) return
    const t = e.touches[0]
    const nx = t.clientX - dragStart.current.mx
    const ny = t.clientY - dragStart.current.my
    dragStart.current.moved = true
    const cardW = 120, cardH = 180
    setPos({
      x: Math.max(0, Math.min(nx, window.innerWidth - cardW)),
      y: Math.max(0, Math.min(ny, window.innerHeight - cardH)),
    })
    e.preventDefault()
  }
  const onTouchEnd = () => {
    if (!dragStart.current?.moved) {
      // Tap — expand back to full live
      onExpand()
    }
    dragStart.current = null
    setDragging(false)
  }

  if (pos.x === null) return null  // not positioned yet

  return (
    <div
      ref={cardRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        position: 'fixed',
        left: pos.x,
        top:  pos.y,
        width:  120,
        height: 180,
        zIndex: 1500,
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
        border: '2px solid rgba(255,51,102,0.6)',
        background: '#000',
        cursor: dragging ? 'grabbing' : 'pointer',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      {/* Camera feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
      />

      {/* Dark overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 40%, rgba(0,0,0,0.6) 100%)',
        pointerEvents: 'none',
      }} />

      {/* LIVE badge + viewer count */}
      <div style={{
        position: 'absolute', top: 6, left: 6, right: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{
          background: '#EF4444', borderRadius: 4, padding: '2px 5px',
          fontSize: 8, fontWeight: 800, color: 'white', letterSpacing: 0.5,
          display: 'flex', alignItems: 'center', gap: 3,
        }}>
          <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'white', animation: 'pipBlink 1s infinite' }} />
          LIVE
        </div>
        <div style={{
          background: 'rgba(0,0,0,0.6)', borderRadius: 10, padding: '2px 5px',
          fontSize: 9, fontWeight: 600, color: 'white',
          display: 'flex', alignItems: 'center', gap: 3,
        }}>
          <svg width="7" height="7" viewBox="0 0 24 24" fill="white"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
          {viewers}
        </div>
      </div>

      {/* Latest comment bubble */}
      {latestComment && (
        <div style={{
          position: 'absolute', bottom: 32, left: 4, right: 4,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
          borderRadius: 8, padding: '4px 6px',
          animation: 'pipFadeIn 0.2s ease',
        }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: latestComment.color }}>
            {latestComment.user.slice(0, 10)}{latestComment.user.length > 10 ? '…' : ''}{' '}
          </span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.9)' }}>
            {latestComment.text.slice(0, 30)}{latestComment.text.length > 30 ? '…' : ''}
          </span>
        </div>
      )}

      {/* Bottom bar: expand + end */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '5px 6px',
        background: 'rgba(0,0,0,0.6)',
      }}>
        {/* Expand arrow */}
        <button
          onTouchEnd={e => { e.stopPropagation(); onExpand() }}
          style={{
            background: 'rgba(255,255,255,0.15)', border: 'none',
            borderRadius: 6, width: 24, height: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'white',
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/>
          </svg>
        </button>

        {/* End live */}
        <button
          onTouchEnd={e => { e.stopPropagation(); onEnd() }}
          style={{
            background: 'rgba(239,68,68,0.7)', border: 'none',
            borderRadius: 6, padding: '2px 6px',
            fontSize: 8, fontWeight: 700, color: 'white', cursor: 'pointer',
          }}
        >
          End
        </button>
      </div>

      <style>{`
        @keyframes pipBlink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes pipFadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}
