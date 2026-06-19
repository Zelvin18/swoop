import { useState, useEffect, useRef } from 'react'

const PLACEHOLDER_COMMENTS = [
  { id:1, user:'kelvin_254', text:'🔥🔥🔥',                          color:'#7C3AED' },
  { id:2, user:'sharon.w',   text:'Love this!',                       color:'#EC4899' },
  { id:3, user:'brian_o',    text:'Hello from Kampala 👋',             color:'#22C55E' },
  { id:4, user:'grace_m',    text:'Just joined!',                     color:'#F59E0B' },
  { id:5, user:'amina.n',    text:'You should go live more often 🙌', color:'#3B82F6' },
  { id:6, user:'peter_ke',   text:'❤️❤️',                            color:'#F97316' },
]

const GIFT_EMOJIS = ['❤️','🔥','💎','⭐','🎁','💰','👏','🚀']

export default function LiveSocialPage({ config, onEnd }) {
  const { title = 'Live 🔴', category = 'Social' } = config || {}

  const [viewers,   setViewers]   = useState(0)
  const [likes,     setLikes]     = useState(0)
  const [liked,     setLiked]     = useState(false)
  const [comments,  setComments]  = useState(PLACEHOLDER_COMMENTS.slice(0, 3))
  const [comment,   setComment]   = useState('')
  const [elapsed,   setElapsed]   = useState(0)
  const [gifts,     setGifts]     = useState([])
  const [showEnd,   setShowEnd]   = useState(false)
  const [muted,     setMuted]     = useState(false)
  const [cameraFront, setCameraFront] = useState(true)
  const chatRef = useRef(null)

  useEffect(() => {
    const t = setInterval(() => {
      setViewers(v => v + Math.floor(Math.random() * 4))
      setLikes(l => l + Math.floor(Math.random() * 3))
      setElapsed(e => e + 1)
      if (Math.random() > 0.65) {
        const c = PLACEHOLDER_COMMENTS[Math.floor(Math.random() * PLACEHOLDER_COMMENTS.length)]
        setComments(prev => [...prev.slice(-25), { ...c, id: Date.now() }])
      }
      if (Math.random() > 0.85) {
        const emoji = GIFT_EMOJIS[Math.floor(Math.random() * GIFT_EMOJIS.length)]
        const id = Date.now()
        setGifts(g => [...g, { id, emoji }])
        setTimeout(() => setGifts(g => g.filter(x => x.id !== id)), 2000)
      }
    }, 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [comments])

  const fmt = n => n >= 1000 ? (n/1000).toFixed(1).replace('.0','')+'K' : String(n)
  const fmtTime = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`
  const sendComment = () => {
    if (!comment.trim()) return
    setComments(prev => [...prev.slice(-25), { id: Date.now(), user: 'You', text: comment.trim(), color: '#FF3366' }])
    setComment('')
  }

  return (
    <div style={s.page}>

      {/* Full screen camera bg */}
      <div style={s.videoBg} />
      <div style={s.overlay} />

      {/* Floating gift animations */}
      <div style={s.giftsArea}>
        {gifts.map(g => (
          <div key={g.id} style={s.giftFloat}>{g.emoji}</div>
        ))}
      </div>

      {/* ── TOP BAR ── */}
      <div style={s.topBar}>
        <div style={s.topLeft}>
          <div style={s.hostAvatar}>H</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
              Your Name
              <span style={s.verifiedBadge}>✓</span>
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>{fmt(likes)} likes</div>
          </div>
          <div style={s.livePill}>
            <div style={s.liveDot} /> LIVE
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={s.viewersPill}>
            <i className="fas fa-eye" style={{ fontSize: 10 }} />
            {fmt(viewers)}
          </div>
          <div style={s.timerPill}>{fmtTime(elapsed)}</div>
          <button onClick={() => setShowEnd(true)} style={s.xBtn}>
            <i className="fas fa-times" style={{ fontSize: 14 }} />
          </button>
        </div>
      </div>

      {/* Category tag */}
      <div style={s.categoryTag}>
        {category}
      </div>

      {/* ── RIGHT CONTROLS (TikTok-style) ── */}
      <div style={s.rightControls}>
        {/* Like */}
        <div style={s.ctrlBtn} onClick={() => { setLiked(l => !l); setLikes(n => liked ? n-1 : n+1) }}>
          <i className="fas fa-heart" style={{ fontSize: 26, color: liked ? '#FF3366' : 'white', filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.8))' }} />
          <span style={s.ctrlCount}>{fmt(likes)}</span>
        </div>
        {/* Comment */}
        <div style={s.ctrlBtn}>
          <i className="fas fa-comment" style={{ fontSize: 26, color: 'white', filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.8))' }} />
          <span style={s.ctrlCount}>{fmt(comments.length)}</span>
        </div>
        {/* Save */}
        <div style={s.ctrlBtn}>
          <i className="fas fa-bookmark" style={{ fontSize: 26, color: 'white', filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.8))' }} />
        </div>
        {/* Share */}
        <div style={s.ctrlBtn}>
          <i className="fas fa-share-nodes" style={{ fontSize: 26, color: 'white', filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.8))' }} />
        </div>
        {/* Gift */}
        <div style={s.ctrlBtn}>
          <i className="fas fa-gift" style={{ fontSize: 26, color: '#F59E0B', filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.8))' }} />
        </div>
      </div>

      {/* ── HOST CONTROLS (bottom right, above input) ── */}
      <div style={s.hostControls}>
        <button onClick={() => setMuted(m => !m)} style={{ ...s.hostCtrlBtn, background: muted ? 'rgba(239,68,68,0.5)' : 'rgba(0,0,0,0.5)' }}>
          <i className={`fas ${muted ? 'fa-microphone-slash' : 'fa-microphone'}`} style={{ fontSize: 14, color: 'white' }} />
        </button>
        <button onClick={() => setCameraFront(f => !f)} style={s.hostCtrlBtn}>
          <i className="fas fa-camera-rotate" style={{ fontSize: 14, color: 'white' }} />
        </button>
        <button style={s.hostCtrlBtn}>
          <i className="fas fa-wand-magic-sparkles" style={{ fontSize: 14, color: 'white' }} />
        </button>
      </div>

      {/* ── CHAT ── */}
      <div style={s.chatSection}>
        <div ref={chatRef} style={s.chatScroll}>
          {comments.map(c => (
            <div key={c.id} style={s.chatRow}>
              <div style={{ ...s.chatAvatar, background: c.color }}>{c.user[0].toUpperCase()}</div>
              <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.9)', lineHeight: 1.3 }}>
                <span style={{ fontWeight: 700, color: c.color }}>{c.user} </span>
                {c.text}
              </div>
            </div>
          ))}
        </div>

        {/* Comment input */}
        <div style={s.commentBar}>
          <div style={s.inputWrap}>
            <input
              placeholder="Add a comment..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendComment()}
              style={s.commentInput}
            />
            <button onClick={sendComment} style={s.sendBtn}>
              <i className="fas fa-paper-plane" style={{ fontSize: 12 }} />
            </button>
          </div>
          <div style={s.bottomTools}>
            {[
              { icon:'fa-question-circle', label:'Q&A'  },
              { icon:'fa-chart-bar',       label:'Poll' },
              { icon:'fa-share-nodes',     label:'Share'},
              { icon:'fa-ellipsis',        label:'More' },
            ].map(t => (
              <button key={t.label} style={s.toolBtn}>
                <i className={`fas ${t.icon}`} style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)' }} />
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── END CONFIRMATION ── */}
      {showEnd && (
        <div style={s.endOverlay}>
          <div style={s.endCard}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>End live stream?</div>
            <div style={{ fontSize: 13, color: '#A1A1AA', marginBottom: 24, lineHeight: 1.5 }}>
              {fmt(viewers)} people are watching. Are you sure you want to end?
            </div>
            <button onClick={onEnd} style={{ width:'100%', padding:14, background:'#EF4444', border:'none', borderRadius:12, color:'white', fontSize:15, fontWeight:700, cursor:'pointer', marginBottom:10 }}>
              End Live
            </button>
            <button onClick={() => setShowEnd(false)} style={{ width:'100%', padding:14, background:'#1e1e1e', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, color:'white', fontSize:15, fontWeight:600, cursor:'pointer' }}>
              Keep Streaming
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes floatUp{0%{transform:translateY(0) scale(1);opacity:1}100%{transform:translateY(-120px) scale(1.4);opacity:0}}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
    </div>
  )
}

const s = {
  page:       { position:'fixed', inset:0, background:'#000', zIndex:200, fontFamily:"'Inter',sans-serif", color:'#fff', overflow:'hidden' },
  videoBg:    { position:'absolute', inset:0, background:'linear-gradient(160deg,#0a001a,#1a0030,#000020,#000)' },
  overlay:    { position:'absolute', inset:0, background:'linear-gradient(to bottom,rgba(0,0,0,0.4) 0%,transparent 15%,transparent 55%,rgba(0,0,0,0.6) 80%,rgba(0,0,0,0.88) 100%)', pointerEvents:'none' },

  giftsArea:  { position:'absolute', right:60, bottom:260, display:'flex', flexDirection:'column-reverse', gap:8, zIndex:25, pointerEvents:'none' },
  giftFloat:  { fontSize:32, animation:'floatUp 2s ease forwards' },

  topBar:     { position:'absolute', top:0, left:0, right:0, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px 10px', zIndex:20 },
  topLeft:    { display:'flex', alignItems:'center', gap:8 },
  hostAvatar: { width:38, height:38, borderRadius:'50%', background:'linear-gradient(135deg,#7C3AED,#3B82F6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:900, border:'2px solid white', flexShrink:0 },
  verifiedBadge: { width:13, height:13, borderRadius:'50%', background:'#3B82F6', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:7, color:'white', fontWeight:900 },
  livePill:   { display:'flex', alignItems:'center', gap:4, background:'#EF4444', borderRadius:20, padding:'3px 8px', fontSize:11, fontWeight:800, color:'white' },
  liveDot:    { width:6, height:6, borderRadius:'50%', background:'white', animation:'blink 1s infinite' },
  viewersPill:{ display:'flex', alignItems:'center', gap:5, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(8px)', borderRadius:20, padding:'4px 10px', fontSize:12, fontWeight:600, color:'white' },
  timerPill:  { background:'rgba(0,0,0,0.5)', backdropFilter:'blur(8px)', borderRadius:20, padding:'4px 10px', fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.8)' },
  xBtn:       { width:32, height:32, borderRadius:'50%', background:'rgba(0,0,0,0.6)', border:'1px solid rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'white' },
  categoryTag:{ position:'absolute', top:'calc(env(safe-area-inset-top,44px) + 64px)', left:14, background:'rgba(124,58,237,0.7)', backdropFilter:'blur(6px)', borderRadius:20, padding:'4px 12px', fontSize:11, fontWeight:700, color:'white', zIndex:20 },

  rightControls: { position:'absolute', right:12, bottom:'calc(env(safe-area-inset-bottom,0px) + 200px)', display:'flex', flexDirection:'column', alignItems:'center', gap:20, zIndex:20 },
  ctrlBtn:    { display:'flex', flexDirection:'column', alignItems:'center', gap:4, cursor:'pointer' },
  ctrlCount:  { fontSize:11, fontWeight:700, color:'white', textShadow:'0 1px 3px rgba(0,0,0,0.9)' },

  hostControls: { position:'absolute', right:12, top:'calc(env(safe-area-inset-top,44px) + 64px)', display:'flex', flexDirection:'column', gap:8, zIndex:20 },
  hostCtrlBtn:{ width:36, height:36, borderRadius:'50%', background:'rgba(0,0,0,0.5)', backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' },

  chatSection:  { position:'absolute', left:0, right:0, bottom:0, zIndex:20 },
  chatScroll:   { maxHeight:120, overflowY:'auto', padding:'0 14px 6px', scrollbarWidth:'none' },
  chatRow:      { display:'flex', alignItems:'flex-start', gap:7, marginBottom:5, animation:'fadeInUp 0.2s ease' },
  chatAvatar:   { width:20, height:20, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:900, color:'white', flexShrink:0, marginTop:1 },

  commentBar:   { padding:'6px 14px', paddingBottom:'calc(var(--nav-h, 50px) + env(safe-area-inset-bottom, 0px) + 6px)', background:'rgba(0,0,0,0.6)', backdropFilter:'blur(12px)' },
  inputWrap:    { display:'flex', alignItems:'center', gap:8, marginBottom:8 },
  commentInput: { flex:1, padding:'10px 14px', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:20, color:'white', fontSize:13, outline:'none', fontFamily:'inherit' },
  sendBtn:      { width:34, height:34, borderRadius:'50%', background:'#7C3AED', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'white', flexShrink:0 },
  bottomTools:  { display:'flex', justifyContent:'space-around' },
  toolBtn:      { display:'flex', flexDirection:'column', alignItems:'center', gap:3, background:'none', border:'none', cursor:'pointer', padding:'4px 12px' },

  endOverlay: { position:'absolute', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'flex-end', zIndex:300 },
  endCard:    { width:'100%', background:'#141414', borderRadius:'20px 20px 0 0', padding:'24px 20px', paddingBottom:'calc(var(--nav-h, 50px) + var(--safe-bottom, env(safe-area-inset-bottom, 0px)) + 16px)' },
}
