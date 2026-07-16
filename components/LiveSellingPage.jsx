/**
 * LiveSellingPage — Host's sell live screen
 * Real Supabase: comments, reactions, viewer count, products, reservations
 * No fake intervals, no placeholder data
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  fetchLiveProducts, sendLiveComment, sendLiveReaction,
  avatarColor, initials, fmtViewers, fmtTime,
} from '../lib/live'
import CameraPreview from './CameraPreview'

export default function LiveSellingPage({ config, currentUser, onEnd }) {
  const { title = 'Live Sell 🔥', streamId } = config || {}

  const [products,     setProducts]     = useState([])
  const [comments,     setComments]     = useState([])
  const [viewers,      setViewers]      = useState(0)
  const [reservations, setReservations] = useState(0)
  const [reactions,    setReactions]    = useState([])   // floating emojis
  const [comment,      setComment]      = useState('')
  const [elapsed,      setElapsed]      = useState(0)
  const [showEnd,      setShowEnd]      = useState(false)
  const [showProducts, setShowProducts] = useState(false)
  const [muted,        setMuted]        = useState(false)
  const [cameraFront,  setCameraFront]  = useState(true)
  const [sending,      setSending]      = useState(false)
  const chatRef = useRef(null)

  // ── Load products ──────────────────────────────────────────
  useEffect(() => {
    if (!streamId) return
    fetchLiveProducts(streamId).then(setProducts)
  }, [streamId])

  // ── Elapsed timer ──────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // ── Realtime: comments ─────────────────────────────────────
  useEffect(() => {
    if (!streamId) return
    const ch = supabase.channel(`host-comments-${streamId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'live_comments', filter: `stream_id=eq.${streamId}`,
      }, async payload => {
        const c = payload.new
        // Fetch sender profile
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
          userId: c.user_id,
        }])
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [streamId])

  // ── Realtime: reactions (floating emojis) ──────────────────
  useEffect(() => {
    if (!streamId) return
    const ch = supabase.channel(`host-reactions-${streamId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'live_reactions', filter: `stream_id=eq.${streamId}`,
      }, payload => {
        const map = { heart:'❤️', fire:'🔥', clap:'👏', star:'⭐' }
        const emoji = map[payload.new.type] || '❤️'
        const id = Date.now() + Math.random()
        setReactions(r => [...r, { id, emoji }])
        setTimeout(() => setReactions(r => r.filter(x => x.id !== id)), 2200)
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [streamId])

  // ── Realtime: viewer count + reservations ──────────────────
  useEffect(() => {
    if (!streamId) return
    const ch = supabase.channel(`host-stream-${streamId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public',
        table: 'live_streams', filter: `id=eq.${streamId}`,
      }, payload => {
        setViewers(payload.new.viewer_count || 0)
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [streamId])

  // ── Realtime: new reservations ────────────────────────────
  useEffect(() => {
    if (!streamId) return
    // Initial count
    supabase.from('live_reservations')
      .select('id', { count: 'exact', head: true })
      .eq('stream_id', streamId)
      .then(({ count }) => setReservations(count || 0))

    const ch = supabase.channel(`host-reservations-${streamId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'live_reservations', filter: `stream_id=eq.${streamId}`,
      }, async payload => {
        setReservations(r => r + 1)
        // Show in chat
        const { data: product } = await supabase
          .from('live_products').select('name').eq('id', payload.new.product_id).single()
        const { data: buyer } = await supabase
          .from('profiles').select('username,full_name').eq('id', payload.new.buyer_id).single()
        const buyerName = buyer?.username || buyer?.full_name || 'Someone'
        const productName = product?.name || 'a product'
        setComments(prev => [...prev.slice(-30), {
          id: Date.now(),
          user: buyerName,
          text: `🛍️ Just reserved ${productName}!`,
          color: '#22C55E',
          isSystem: true,
        }])
        // Update product stock in local state
        setProducts(prods => prods.map(p =>
          p.id === payload.new.product_id
            ? { ...p, stock_remaining: Math.max((p.stock_remaining||0) - 1, 0) }
            : p
        ))
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [streamId])

  // ── Auto-scroll chat ───────────────────────────────────────
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [comments])

  // ── Send comment as host ───────────────────────────────────
  const sendComment = useCallback(async () => {
    if (!comment.trim() || !currentUser || !streamId || sending) return
    const msg = comment.trim()
    setComment('')
    setSending(true)
    // Optimistic
    const profile = currentUser?.user_metadata || {}
    setComments(prev => [...prev.slice(-30), {
      id: Date.now(), user: profile.username || 'You',
      text: msg, color: '#FF3366', isHost: true,
    }])
    await sendLiveComment(streamId, currentUser.id, msg)
    setSending(false)
  }, [comment, currentUser, streamId, sending])

  // ── Send reaction ──────────────────────────────────────────
  const sendReaction = useCallback(async (type) => {
    if (!currentUser || !streamId) return
    await sendLiveReaction(streamId, currentUser.id, type)
  }, [currentUser, streamId])

  const totalStock = products.reduce((a, p) => a + (p.stock_remaining || 0), 0)

  return (
    <div style={S.page}>

      {/* Floating reactions */}
      <div style={S.reactionsFloat}>
        {reactions.map(r => (
          <div key={r.id} style={S.reactionEmoji}>{r.emoji}</div>
        ))}
      </div>

      {/* ── VIDEO ZONE ── */}
      <div style={S.videoZone}>
        <div style={S.videoBg}><CameraPreview facingMode={cameraFront?'user':'environment'}/></div>
        <div style={S.topGrad}/>
        <div style={S.botGrad}/>

        {/* Top bar */}
        <div style={S.topBar}>
          <div style={S.topLeft}>
            <div style={S.hostAvatar}>
              {currentUser?.user_metadata?.avatar_url
                ? <img src={currentUser.user_metadata.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
                : (currentUser?.user_metadata?.username?.[0]?.toUpperCase() || 'H')
              }
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:'white'}}>
                {currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.username || 'Your Store'}
              </div>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.5)'}}>{fmtViewers(viewers)} watching</div>
            </div>
            <div style={S.livePill}><div style={S.blinkDot}/>LIVE</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <div style={S.viewerBadge}><i className="fas fa-eye" style={{fontSize:9}}/> {fmtViewers(viewers)}</div>
            <div style={S.timerBadge}>{fmtTime(elapsed)}</div>
            <button onClick={()=>setShowEnd(true)} style={S.xBtn}>
              <i className="fas fa-times" style={{fontSize:13}}/>
            </button>
          </div>
        </div>

        {/* Right controls */}
        <div style={S.rightControls}>
          <button onClick={()=>setMuted(m=>!m)} style={{...S.ctrlBtn, background: muted?'rgba(239,68,68,0.7)':'rgba(0,0,0,0.55)'}}>
            <i className={`fas ${muted?'fa-microphone-slash':'fa-microphone'}`} style={{fontSize:16,color:'white'}}/>
          </button>
          <button onClick={()=>setCameraFront(f=>!f)} style={S.ctrlBtn}>
            <i className="fas fa-camera-rotate" style={{fontSize:16,color:'white'}}/>
          </button>
        </div>

        {/* Bottom left: stats + products pill */}
        <div style={S.bottomLeft}>
          <div style={S.statsRow}>
            <span style={S.statChip}>
              <i className="fas fa-shield-halved" style={{fontSize:9,color:'#22C55E'}}/> {reservations} reserved
            </span>
            <span style={S.statChip}>
              <i className="fas fa-box" style={{fontSize:9,color:'#F59E0B'}}/> {totalStock} in stock
            </span>
          </div>
          {products.length > 0 && (
            <button onClick={()=>setShowProducts(p=>!p)} style={S.productsPill}>
              <i className="fas fa-bag-shopping" style={{fontSize:11}}/>
              Products ({products.length})
              <i className={`fas fa-chevron-${showProducts?'down':'up'}`} style={{fontSize:9}}/>
            </button>
          )}
        </div>
      </div>

      {/* Products sheet */}
      {showProducts && (
        <div style={S.productsSheet}>
          <div style={S.sheetHandle}/>
          <div style={S.sheetHeader}>
            <span style={{fontSize:13,fontWeight:700}}>Products ({products.length})</span>
            <button onClick={()=>setShowProducts(false)} style={{background:'none',border:'none',color:'#71717A',cursor:'pointer'}}>
              <i className="fas fa-times"/>
            </button>
          </div>
          <div style={S.productsScroll}>
            {products.length === 0 && (
              <div style={{padding:'16px',color:'#71717A',fontSize:13,textAlign:'center'}}>No products added</div>
            )}
            {products.map((p,i) => (
              <div key={p.id} style={S.productRow}>
                <div style={S.productNum}>{i+1}</div>
                <div style={S.productThumb}>
                  {p.image_url
                    ? <img src={p.image_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
                    : <i className="fas fa-box" style={{fontSize:18,color:'#52525B'}}/>
                  }
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:'white'}}>{p.name}</div>
                  <div style={{fontSize:12,color:'#FF3366',fontWeight:800}}>UGX {Number(p.price).toLocaleString()}</div>
                  <div style={{fontSize:10,color:p.stock_remaining<=2?'#EF4444':'#71717A'}}>
                    {p.stock_remaining} left
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CHAT ZONE ── */}
      <div style={S.chatZone}>
        <div ref={chatRef} style={S.chatScroll}>
          {comments.length === 0 && (
            <div style={{fontSize:12,color:'rgba(255,255,255,0.3)',padding:'4px 0'}}>
              Waiting for viewers to join and comment...
            </div>
          )}
          {comments.map(c => (
            <div key={c.id} style={S.chatRow}>
              <div style={{...S.chatAvatar, background: c.isSystem?'#22C55E':c.color}}>
                {c.avatarUrl
                  ? <img src={c.avatarUrl} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}} alt=""/>
                  : c.user[0]?.toUpperCase()
                }
              </div>
              <div style={S.chatBubble}>
                <span style={{fontWeight:700,color: c.isHost?'#FF3366': c.isSystem?'#22C55E':c.color}}>{c.user} </span>
                <span style={{color:'rgba(255,255,255,0.9)'}}>{c.text}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={S.bottomBar}>
          <div style={{flex:1}}>
            <input
              placeholder="Say something to viewers..."
              value={comment}
              onChange={e=>setComment(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&sendComment()}
              style={S.commentInput}
            />
          </div>
          <div style={S.reactionsRow}>
            <button onClick={sendComment} style={S.sendBtn}>
              <i className="fas fa-paper-plane" style={{fontSize:13,color:'white'}}/>
            </button>
            <button style={S.reactionBtn} onClick={()=>sendReaction('heart')}><span style={{fontSize:18}}>❤️</span></button>
            <button style={S.reactionBtn} onClick={()=>sendReaction('fire')}><span style={{fontSize:18}}>🔥</span></button>
          </div>
        </div>
      </div>

      {/* End live confirmation */}
      {showEnd && (
        <div style={S.endOverlay}>
          <div style={S.endCard}>
            <div style={{fontSize:18,fontWeight:800,marginBottom:8}}>End live stream?</div>
            <div style={{background:'#1e1e1e',borderRadius:12,padding:'12px 14px',marginBottom:20}}>
              <div style={{fontSize:12,color:'#A1A1AA',marginBottom:4}}>Session summary</div>
              <div style={{display:'flex',justifyContent:'space-around'}}>
                <Stat label="Viewers" val={fmtViewers(viewers)}/>
                <Stat label="Reserved" val={String(reservations)}/>
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
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.35}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes floatUp{0%{transform:translateY(0) scale(1);opacity:1}100%{transform:translateY(-130px) scale(1.5);opacity:0}}
      `}</style>
    </div>
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

const S = {
  page: { position:'fixed',inset:0,background:'#000',zIndex:200,fontFamily:"'Inter',sans-serif",color:'#fff',display:'flex',flexDirection:'column' },
  videoZone: { position:'relative',height:'55%',flexShrink:0,background:'#0a0a0a',overflow:'hidden' },
  videoBg: { position:'absolute',inset:0,width:'100%',height:'100%',overflow:'hidden' },
  topGrad: { position:'absolute',top:0,left:0,right:0,height:100,background:'linear-gradient(to bottom,rgba(0,0,0,0.7),transparent)',pointerEvents:'none' },
  botGrad: { position:'absolute',bottom:0,left:0,right:0,height:80,background:'linear-gradient(to bottom,transparent,rgba(0,0,0,0.8))',pointerEvents:'none' },
  topBar: { position:'absolute',top:0,left:0,right:0,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'calc(env(safe-area-inset-top,0px) + 10px) 12px 8px',zIndex:10 },
  topLeft: { display:'flex',alignItems:'center',gap:8 },
  hostAvatar: { width:34,height:34,borderRadius:'50%',background:'linear-gradient(135deg,#D946EF,#FF3366)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:900,color:'white',border:'2px solid rgba(255,255,255,0.5)',flexShrink:0,overflow:'hidden' },
  livePill: { display:'flex',alignItems:'center',gap:4,background:'#EF4444',borderRadius:20,padding:'3px 8px',fontSize:10,fontWeight:800,color:'white' },
  blinkDot: { width:5,height:5,borderRadius:'50%',background:'white',animation:'blink 1s infinite' },
  viewerBadge: { display:'flex',alignItems:'center',gap:4,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(8px)',borderRadius:20,padding:'3px 9px',fontSize:11,fontWeight:600,color:'white' },
  timerBadge: { background:'rgba(0,0,0,0.55)',backdropFilter:'blur(8px)',borderRadius:20,padding:'3px 9px',fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.8)' },
  xBtn: { width:30,height:30,borderRadius:'50%',background:'rgba(0,0,0,0.6)',border:'1px solid rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'white' },
  rightControls: { position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',display:'flex',flexDirection:'column',gap:10,zIndex:10 },
  ctrlBtn: { width:40,height:40,borderRadius:'50%',background:'rgba(0,0,0,0.55)',backdropFilter:'blur(8px)',border:'1px solid rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer' },
  bottomLeft: { position:'absolute',bottom:10,left:12,display:'flex',flexDirection:'column',gap:6,zIndex:10,maxWidth:'70%' },
  statsRow: { display:'flex',gap:6 },
  statChip: { display:'flex',alignItems:'center',gap:4,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(8px)',borderRadius:20,padding:'3px 9px',fontSize:10,fontWeight:600,color:'rgba(255,255,255,0.85)' },
  productsPill: { display:'inline-flex',alignItems:'center',gap:6,background:'rgba(255,51,102,0.85)',backdropFilter:'blur(8px)',border:'none',borderRadius:20,padding:'7px 14px',fontSize:12,fontWeight:700,color:'white',cursor:'pointer',fontFamily:'inherit',boxShadow:'0 2px 12px rgba(255,51,102,0.35)' },
  productsSheet: { background:'#141414',borderTop:'1px solid rgba(255,255,255,0.1)',flexShrink:0,maxHeight:'30%',display:'flex',flexDirection:'column' },
  sheetHandle: { width:36,height:4,borderRadius:20,background:'rgba(255,255,255,0.15)',margin:'8px auto 0',flexShrink:0 },
  sheetHeader: { display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 14px 6px',flexShrink:0 },
  productsScroll: { overflowY:'auto',padding:'0 14px 10px',scrollbarWidth:'none',flex:1 },
  productRow: { display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.05)' },
  productNum: { width:20,height:20,borderRadius:'50%',background:'#FF3366',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:900,color:'white',flexShrink:0 },
  productThumb: { width:48,height:48,borderRadius:8,background:'#1e1e1e',border:'1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden' },
  chatZone: { flex:1,display:'flex',flexDirection:'column',background:'#000',overflow:'hidden',minHeight:0 },
  chatScroll: { flex:1,overflowY:'auto',padding:'8px 12px 4px',scrollbarWidth:'none',display:'flex',flexDirection:'column',justifyContent:'flex-end' },
  chatRow: { display:'flex',alignItems:'flex-start',gap:7,marginBottom:5,animation:'fadeUp 0.25s ease' },
  chatAvatar: { width:22,height:22,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:900,color:'white',flexShrink:0,marginTop:1,overflow:'hidden' },
  chatBubble: { background:'rgba(255,255,255,0.08)',backdropFilter:'blur(4px)',borderRadius:12,padding:'5px 10px',fontSize:12,lineHeight:1.35,maxWidth:'85%' },
  bottomBar: { display:'flex',alignItems:'center',gap:8,padding:'6px 12px',borderTop:'1px solid rgba(255,255,255,0.06)',paddingBottom:'calc(env(safe-area-inset-bottom,0px) + 6px)',flexShrink:0 },
  commentInput: { width:'100%',padding:'9px 14px',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:20,color:'white',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box' },
  reactionsRow: { display:'flex',alignItems:'center',gap:4,flexShrink:0 },
  sendBtn: { width:34,height:34,borderRadius:'50%',background:'#FF3366',border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0 },
  reactionBtn: { width:34,height:34,borderRadius:'50%',background:'rgba(255,255,255,0.08)',border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer' },
  reactionsFloat: { position:'absolute',right:60,bottom:200,display:'flex',flexDirection:'column-reverse',gap:6,zIndex:250,pointerEvents:'none' },
  reactionEmoji: { fontSize:28,animation:'floatUp 2.2s ease forwards' },
  endOverlay: { position:'absolute',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'flex-end',zIndex:300 },
  endCard: { width:'100%',background:'#141414',borderRadius:'20px 20px 0 0',padding:'20px',paddingBottom:'calc(env(safe-area-inset-bottom,0px) + 28px)' },
}
