/**
 * LiveSocialPage — Host's social live screen
 * Real Supabase: comments, reactions, viewer count
 * No fake intervals, no placeholder data
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  sendLiveComment, sendLiveReaction,
  avatarColor, fmtViewers, fmtTime,
} from '../lib/live'
import CameraPreview from './CameraPreview'
import OverlayPortal from './OverlayPortal'

const REACTION_MAP = { heart:'❤️', fire:'🔥', clap:'👏', star:'⭐' }

export default function LiveSocialPage({ config, currentUser, onEnd }) {
  const { title = 'Live 🔴', category = 'Social', streamId } = config || {}

  const [comments,    setComments]    = useState([])
  const [viewers,     setViewers]     = useState(0)
  const [reactions,   setReactions]   = useState([])  // floating emojis
  const [comment,     setComment]     = useState('')
  const [elapsed,     setElapsed]     = useState(0)
  const [showEnd,     setShowEnd]     = useState(false)
  const [muted,       setMuted]       = useState(false)
  const [cameraFront, setCameraFront] = useState(true)
  const [sending,     setSending]     = useState(false)
  const chatRef = useRef(null)

  // ── Timer ──────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // ── Realtime: comments ─────────────────────────────────────
  useEffect(() => {
    if (!streamId) return
    const ch = supabase.channel(`social-comments-${streamId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'live_comments', filter: `stream_id=eq.${streamId}`,
      }, async payload => {
        const c = payload.new
        const { data: profile } = await supabase
          .from('profiles').select('id,username,full_name,avatar_url')
          .eq('id', c.user_id).single()
        const name = profile?.username || profile?.full_name || 'viewer'
        setComments(prev => [...prev.slice(-30), {
          id: c.id,
          user: name,
          text: c.message,
          color: avatarColor(c.user_id),
          avatarUrl: profile?.avatar_url || null,
        }])
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [streamId])

  // ── Realtime: reactions ────────────────────────────────────
  useEffect(() => {
    if (!streamId) return
    const ch = supabase.channel(`social-reactions-${streamId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'live_reactions', filter: `stream_id=eq.${streamId}`,
      }, payload => {
        const emoji = REACTION_MAP[payload.new.type] || '❤️'
        const id = Date.now() + Math.random()
        setReactions(r => [...r, { id, emoji }])
        setTimeout(() => setReactions(r => r.filter(x => x.id !== id)), 2200)
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [streamId])

  // ── Realtime: viewer count ─────────────────────────────────
  useEffect(() => {
    if (!streamId) return
    const ch = supabase.channel(`social-stream-${streamId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public',
        table: 'live_streams', filter: `id=eq.${streamId}`,
      }, payload => {
        setViewers(payload.new.viewer_count || 0)
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [streamId])

  // ── Auto-scroll ────────────────────────────────────────────
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [comments])

  // ── Send comment ───────────────────────────────────────────
  const sendComment = useCallback(async () => {
    if (!comment.trim() || !currentUser || !streamId || sending) return
    const msg = comment.trim()
    setComment('')
    setSending(true)
    const profile = currentUser?.user_metadata || {}
    setComments(prev => [...prev.slice(-30), {
      id: Date.now(),
      user: profile.username || 'You',
      text: msg,
      color: '#FF3366',
      isHost: true,
    }])
    await sendLiveComment(streamId, currentUser.id, msg)
    setSending(false)
  }, [comment, currentUser, streamId, sending])

  const sendReaction = useCallback(async (type) => {
    if (!currentUser || !streamId) return
    await sendLiveReaction(streamId, currentUser.id, type)
  }, [currentUser, streamId])

  return (
    <OverlayPortal>
    <div style={s.page}>
      {/* Camera background */}
      <div style={{position:'absolute',inset:0,zIndex:0}}>
        <CameraPreview facingMode={cameraFront?'user':'environment'} style={{width:'100%',height:'100%'}}/>
      </div>
      <div style={s.overlay}/>

      {/* Floating reactions */}
      <div style={s.giftsArea}>
        {reactions.map(r => (
          <div key={r.id} style={s.giftFloat}>{r.emoji}</div>
        ))}
      </div>

      {/* ── TOP BAR ── */}
      <div style={s.topBar}>
        <div style={s.topLeft}>
          <div style={s.hostAvatar}>
            {currentUser?.user_metadata?.avatar_url
              ? <img src={currentUser.user_metadata.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
              : (currentUser?.user_metadata?.username?.[0]?.toUpperCase() || 'H')
            }
          </div>
          <div>
            <div style={{fontSize:13,fontWeight:700,display:'flex',alignItems:'center',gap:5}}>
              {currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.username || 'Your Live'}
              <span style={s.verifiedBadge}>✓</span>
            </div>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.6)'}}>{fmtViewers(viewers)} watching</div>
          </div>
          <div style={s.livePill}><div style={s.liveDot}/> LIVE</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <div style={s.viewersPill}>
            <i className="fas fa-eye" style={{fontSize:10}}/> {fmtViewers(viewers)}
          </div>
          <div style={s.timerPill}>{fmtTime(elapsed)}</div>
          <button onClick={()=>setShowEnd(true)} style={s.xBtn}>
            <i className="fas fa-times" style={{fontSize:14}}/>
          </button>
        </div>
      </div>

      {/* Category tag */}
      {category && (
        <div style={s.categoryTag}>{category}</div>
      )}

      {/* Host controls (mic, flip) */}
      <div style={s.hostControls}>
        <button onClick={()=>setMuted(m=>!m)} style={{...s.hostCtrlBtn, background: muted?'rgba(239,68,68,0.5)':'rgba(0,0,0,0.5)'}}>
          <i className={`fas ${muted?'fa-microphone-slash':'fa-microphone'}`} style={{fontSize:14,color:'white'}}/>
        </button>
        <button onClick={()=>setCameraFront(f=>!f)} style={s.hostCtrlBtn}>
          <i className="fas fa-camera-rotate" style={{fontSize:14,color:'white'}}/>
        </button>
      </div>

      {/* ── CHAT ── */}
      <div style={s.chatSection}>
        <div ref={chatRef} style={s.chatScroll}>
          {comments.length === 0 && (
            <div style={{fontSize:12,color:'rgba(255,255,255,0.3)',padding:'4px 0'}}>
              Waiting for viewers to join and comment...
            </div>
          )}
          {comments.map(c => (
            <div key={c.id} style={s.chatRow}>
              <div style={{...s.chatAvatar, background: c.color, overflow:'hidden'}}>
                {c.avatarUrl
                  ? <img src={c.avatarUrl} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}} alt=""/>
                  : c.user[0]?.toUpperCase()
                }
              </div>
              <div style={{fontSize:12.5,color:'rgba(255,255,255,0.9)',lineHeight:1.3}}>
                <span style={{fontWeight:700,color: c.isHost?'#FF3366':c.color}}>{c.user} </span>
                {c.text}
              </div>
            </div>
          ))}
        </div>

        <div style={s.commentBar}>
          <div style={s.inputWrap}>
            <input
              placeholder="Say something..."
              value={comment}
              onChange={e=>setComment(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&sendComment()}
              style={s.commentInput}
            />
            <button onClick={sendComment} style={s.sendBtn}>
              <i className="fas fa-paper-plane" style={{fontSize:12}}/>
            </button>
          </div>
          <div style={s.bottomTools}>
            {[
              {icon:'fa-heart',       emoji:'heart' },
              {icon:'fa-fire',        emoji:'fire'  },
              {icon:'fa-hands-clapping', emoji:'clap'},
            ].map(t => (
              <button key={t.icon} onClick={()=>sendReaction(t.emoji)} style={s.toolBtn}>
                <i className={`fas ${t.icon}`} style={{fontSize:16,color:'rgba(255,255,255,0.7)'}}/>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* End confirmation */}
      {showEnd && (
        <div style={s.endOverlay}>
          <div style={s.endCard}>
            <div style={{fontSize:18,fontWeight:800,marginBottom:8}}>End live stream?</div>
            <div style={{background:'#1e1e1e',borderRadius:12,padding:'12px 14px',marginBottom:20}}>
              <div style={{display:'flex',justifyContent:'space-around'}}>
                <Stat label="Viewers" val={fmtViewers(viewers)}/>
                <Stat label="Comments" val={String(comments.length)}/>
                <Stat label="Duration" val={fmtTime(elapsed)}/>
              </div>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setShowEnd(false)} style={{flex:1,padding:14,background:'#1e1e1e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,color:'white',fontSize:14,fontWeight:600,cursor:'pointer'}}>
                Keep Streaming
              </button>
              <button onClick={onEnd} style={{flex:1,padding:14,background:'#EF4444',border:'none',borderRadius:12,color:'white',fontSize:14,fontWeight:700,cursor:'pointer'}}>
                End Live
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes floatUp{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-130px) scale(1.4);opacity:0}}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
    </div>
    </OverlayPortal>
  )
}

function Stat({ label, val }) {
  return (
    <div style={{textAlign:'center'}}>
      <div style={{fontSize:18,fontWeight:900,color:'#FF3366'}}>{val}</div>
      <div style={{fontSize:11,color:'#71717A'}}>{label}</div>
    </div>
  )
}

const s = {
  page:        { position:'fixed',inset:0,background:'#000',zIndex:200,fontFamily:"'Inter',sans-serif",color:'#fff',overflow:'hidden' },
  overlay:     { position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(0,0,0,0.4) 0%,transparent 15%,transparent 55%,rgba(0,0,0,0.6) 80%,rgba(0,0,0,0.88) 100%)',pointerEvents:'none' },
  giftsArea:   { position:'absolute',right:60,bottom:260,display:'flex',flexDirection:'column-reverse',gap:8,zIndex:25,pointerEvents:'none' },
  giftFloat:   { fontSize:32,animation:'floatUp 2.2s ease forwards' },
  topBar:      { position:'absolute',top:0,left:0,right:0,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'calc(env(safe-area-inset-top,0px) + 12px) 14px 10px',zIndex:20 },
  topLeft:     { display:'flex',alignItems:'center',gap:8 },
  hostAvatar:  { width:38,height:38,borderRadius:'50%',background:'linear-gradient(135deg,#7C3AED,#3B82F6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,fontWeight:900,border:'2px solid white',flexShrink:0,overflow:'hidden' },
  verifiedBadge:{ width:13,height:13,borderRadius:'50%',background:'#3B82F6',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:7,color:'white',fontWeight:900 },
  livePill:    { display:'flex',alignItems:'center',gap:4,background:'#EF4444',borderRadius:20,padding:'3px 8px',fontSize:11,fontWeight:800,color:'white' },
  liveDot:     { width:6,height:6,borderRadius:'50%',background:'white',animation:'blink 1s infinite' },
  viewersPill: { display:'flex',alignItems:'center',gap:5,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(8px)',borderRadius:20,padding:'4px 10px',fontSize:12,fontWeight:600,color:'white' },
  timerPill:   { background:'rgba(0,0,0,0.5)',backdropFilter:'blur(8px)',borderRadius:20,padding:'4px 10px',fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.8)' },
  xBtn:        { width:32,height:32,borderRadius:'50%',background:'rgba(0,0,0,0.6)',border:'1px solid rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'white' },
  categoryTag: { position:'absolute',top:'calc(env(safe-area-inset-top,0px) + 68px)',left:14,background:'rgba(124,58,237,0.7)',backdropFilter:'blur(6px)',borderRadius:20,padding:'4px 12px',fontSize:11,fontWeight:700,color:'white',zIndex:20 },
  hostControls:{ position:'absolute',right:12,top:'calc(env(safe-area-inset-top,0px) + 68px)',display:'flex',flexDirection:'column',gap:8,zIndex:20 },
  hostCtrlBtn: { width:36,height:36,borderRadius:'50%',backdropFilter:'blur(8px)',border:'1px solid rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer' },
  chatSection: { position:'absolute',left:0,right:0,bottom:0,zIndex:20 },
  chatScroll:  { maxHeight:140,overflowY:'auto',padding:'0 14px 6px',scrollbarWidth:'none' },
  chatRow:     { display:'flex',alignItems:'flex-start',gap:7,marginBottom:5,animation:'fadeInUp 0.2s ease' },
  chatAvatar:  { width:20,height:20,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:900,color:'white',flexShrink:0,marginTop:1 },
  commentBar:  { padding:'6px 14px',paddingBottom:'calc(env(safe-area-inset-bottom,0px) + 8px)',background:'rgba(0,0,0,0.6)',backdropFilter:'blur(12px)' },
  inputWrap:   { display:'flex',alignItems:'center',gap:8,marginBottom:8 },
  commentInput:{ flex:1,padding:'10px 14px',background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:20,color:'white',fontSize:13,outline:'none',fontFamily:'inherit' },
  sendBtn:     { width:34,height:34,borderRadius:'50%',background:'#7C3AED',border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'white',flexShrink:0 },
  bottomTools: { display:'flex',justifyContent:'space-around' },
  toolBtn:     { display:'flex',flexDirection:'column',alignItems:'center',gap:3,background:'none',border:'none',cursor:'pointer',padding:'4px 12px' },
  endOverlay:  { position:'absolute',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'flex-end',zIndex:300 },
  endCard:     { width:'100%',background:'#141414',borderRadius:'20px 20px 0 0',padding:'20px',paddingBottom:'calc(env(safe-area-inset-bottom,0px) + 28px)' },
}
