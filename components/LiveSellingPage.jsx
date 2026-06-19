import { useState, useEffect, useRef } from 'react'

const SAMPLE_COMMENTS = [
  { id:1,  user:'kelvin_254', text:'Is the first item still available?', color:'#7C3AED' },
  { id:2,  user:'sharon.w',   text:'What sizes do you have? 👟',          color:'#EC4899' },
  { id:3,  user:'brian_o',    text:'Can you deliver to Entebbe?',         color:'#22C55E' },
  { id:4,  user:'grace_m',    text:'Reserved! 🔥',                        color:'#F59E0B' },
  { id:5,  user:'david_k',    text:'Price on the last one?',              color:'#3B82F6' },
  { id:6,  user:'amina.n',    text:'How much is delivery?',               color:'#F97316' },
  { id:7,  user:'peter_ke',   text:'❤️❤️❤️',                             color:'#8B5CF6' },
]

export default function LiveSellingPage({ config, onEnd }) {
  const { title = 'Live Sell 🔥', products: cfgProducts = [], delivery = false } = config || {}

  const [viewers,      setViewers]      = useState(12)
  const [likes,        setLikes]        = useState(0)
  const [comments,     setComments]     = useState(SAMPLE_COMMENTS.slice(0,3))
  const [comment,      setComment]      = useState('')
  const [elapsed,      setElapsed]      = useState(0)
  const [reservations, setReservations] = useState(0)
  const [showEnd,      setShowEnd]      = useState(false)
  const [showProducts, setShowProducts] = useState(false)
  const [muted,        setMuted]        = useState(false)
  const [cameraFront,  setCameraFront]  = useState(true)
  const chatRef = useRef(null)

  const displayProducts = cfgProducts.length > 0 ? cfgProducts : [
    { id:'p1', name:'Product 1', price:'150,000', stock:5,  instant_reserve:true  },
    { id:'p2', name:'Product 2', price:'80,000',  stock:3,  instant_reserve:true  },
    { id:'p3', name:'Product 3', price:'220,000', stock:8,  instant_reserve:false },
  ]

  // Simulate live activity
  useEffect(() => {
    const t = setInterval(() => {
      setViewers(v => v + Math.floor(Math.random() * 2))
      setLikes(l => l + Math.floor(Math.random() * 2))
      setElapsed(e => e + 1)
      if (Math.random() > 0.6) {
        const c = SAMPLE_COMMENTS[Math.floor(Math.random() * SAMPLE_COMMENTS.length)]
        setComments(prev => [...prev.slice(-12), { ...c, id: Date.now() }])
      }
    }, 1200)
    return () => clearInterval(t)
  }, [])

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [comments])

  const fmt = n => n >= 1000 ? (n/1000).toFixed(1).replace('.0','')+'K' : String(n)
  const fmtTime = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

  const sendComment = () => {
    if (!comment.trim()) return
    setComments(prev => [...prev.slice(-12), { id:Date.now(), user:'You', text:comment.trim(), color:'#FF3366' }])
    setComment('')
  }

  return (
    <div style={S.page}>

      {/* ══════════════════════════════════════
          ZONE 1 — VIDEO (65% of screen height)
          Host sees themselves here, controls on sides
      ══════════════════════════════════════ */}
      <div style={S.videoZone}>

        {/* Camera placeholder */}
        <div style={S.videoBg}>
          <i className="fas fa-video" style={{ fontSize:44, color:'rgba(255,255,255,0.08)' }} />
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.15)', marginTop:10 }}>Camera preview</div>
        </div>

        {/* Top gradient for readability */}
        <div style={S.topGrad} />
        {/* Bottom gradient fade into content */}
        <div style={S.botGrad} />

        {/* ── TOP BAR ── */}
        <div style={S.topBar}>
          <div style={S.topLeft}>
            <div style={S.hostAvatar}>H</div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'white', display:'flex', alignItems:'center', gap:4 }}>
                Your Store <span style={S.verifiedDot}>✓</span>
              </div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)' }}>{fmt(likes)} likes</div>
            </div>
            <div style={S.livePill}><div style={S.blinkDot} />LIVE</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={S.viewerBadge}><i className="fas fa-eye" style={{fontSize:9}} /> {fmt(viewers)}</div>
            <div style={S.timerBadge}>{fmtTime(elapsed)}</div>
            <button onClick={() => setShowEnd(true)} style={S.xBtn}>
              <i className="fas fa-times" style={{fontSize:13}} />
            </button>
          </div>
        </div>

        {/* ── RIGHT CONTROLS (mic, flip, effects) ── */}
        <div style={S.rightControls}>
          <button
            onClick={() => setMuted(m => !m)}
            style={{ ...S.ctrlBtn, background: muted ? 'rgba(239,68,68,0.7)' : 'rgba(0,0,0,0.55)' }}
          >
            <i className={`fas ${muted ? 'fa-microphone-slash' : 'fa-microphone'}`} style={{fontSize:16, color:'white'}} />
          </button>
          <button onClick={() => setCameraFront(f => !f)} style={S.ctrlBtn}>
            <i className="fas fa-camera-rotate" style={{fontSize:16, color:'white'}} />
          </button>
          <button style={S.ctrlBtn}>
            <i className="fas fa-wand-magic-sparkles" style={{fontSize:15, color:'white'}} />
          </button>
        </div>

        {/* ── BOTTOM-LEFT: Products pill + live stats ── */}
        <div style={S.bottomLeft}>
          {/* Stats row */}
          <div style={S.statsRow}>
            <span style={S.statChip}>
              <i className="fas fa-shield-halved" style={{fontSize:9, color:'#22C55E'}} />
              {reservations} reserved
            </span>
            <span style={S.statChip}>
              <i className="fas fa-box" style={{fontSize:9, color:'#F59E0B'}} />
              {displayProducts.reduce((a,p)=>a+parseInt(p.stock||0),0)} in stock
            </span>
          </div>
          {/* Products toggle pill */}
          <button
            onClick={() => setShowProducts(p => !p)}
            style={S.productsPill}
          >
            <i className="fas fa-bag-shopping" style={{fontSize:11}} />
            Products ({displayProducts.length})
            <i className={`fas fa-chevron-${showProducts ? 'down' : 'up'}`} style={{fontSize:9}} />
          </button>
        </div>

      </div>

      {/* ══════════════════════════════════════
          PRODUCTS SHEET — slides up from bottom of video zone
          Only visible when showProducts=true
          Does NOT cover the chat below
      ══════════════════════════════════════ */}
      {showProducts && (
        <div style={S.productsSheet}>
          <div style={S.productsSheetHandle} />
          <div style={S.productsSheetHeader}>
            <span style={{fontSize:13, fontWeight:700}}>Products in this Live</span>
            <button onClick={() => setShowProducts(false)} style={{background:'none', border:'none', color:'#71717A', cursor:'pointer', fontSize:13}}>
              <i className="fas fa-times" />
            </button>
          </div>
          <div style={S.productsScroll}>
            {displayProducts.map((p, i) => (
              <div key={p.id || i} style={S.productRow}>
                <div style={S.productRowNum}>{i+1}</div>
                <div style={S.productRowThumb}>
                  <i className="fas fa-box" style={{fontSize:18, color:'#52525B'}} />
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:13, fontWeight:700, color:'white'}}>{p.name}</div>
                  <div style={{fontSize:12, color:'#FF3366', fontWeight:800}}>UGX {p.price}</div>
                  <div style={{fontSize:10, color: parseInt(p.stock)<=2 ? '#EF4444' : '#71717A'}}>
                    Stock: {p.stock}
                  </div>
                </div>
                <div style={{display:'flex', flexDirection:'column', gap:4, alignItems:'flex-end'}}>
                  {p.instant_reserve && (
                    <button
                      onClick={() => setReservations(r=>r+1)}
                      style={S.reserveBtn}
                    >
                      Reserve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          ZONE 2 — CHAT + INPUT (flex:1, fills rest)
          TikTok-style: comments float up left side,
          viewer count + input bar at very bottom
      ══════════════════════════════════════ */}
      <div style={S.chatZone}>

        {/* Scrollable comments — TikTok style (left-aligned, transparent bg) */}
        <div ref={chatRef} style={S.chatScroll}>
          {comments.map(c => (
            <div key={c.id} style={S.chatRow}>
              <div style={{...S.chatAvatar, background:c.color}}>{c.user[0].toUpperCase()}</div>
              <div style={S.chatBubble}>
                <span style={{fontWeight:700, color:c.color}}>{c.user} </span>
                <span style={{color:'rgba(255,255,255,0.9)'}}>{c.text}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom bar — TikTok host style:
            comment input left, viewer reactions right */}
        <div style={S.bottomBar}>
          <div style={S.commentWrap}>
            <input
              placeholder="Add a comment..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              onKeyDown={e => e.key==='Enter' && sendComment()}
              style={S.commentInput}
            />
          </div>
          {/* Quick reactions for host to send */}
          <div style={S.reactionsRow}>
            <button onClick={sendComment} style={S.sendBtn}>
              <i className="fas fa-paper-plane" style={{fontSize:13, color:'white'}} />
            </button>
            <button style={S.reactionBtn} onClick={() => setComments(p=>[...p.slice(-12),{id:Date.now(),user:'You',text:'❤️',color:'#FF3366'}])}>
              <span style={{fontSize:18}}>❤️</span>
            </button>
            <button style={S.reactionBtn} onClick={() => setComments(p=>[...p.slice(-12),{id:Date.now(),user:'You',text:'🔥',color:'#F97316'}])}>
              <span style={{fontSize:18}}>🔥</span>
            </button>
          </div>
        </div>

        {/* Tools row: Q&A, Poll, More */}
        <div style={S.toolsRow}>
          {[
            {icon:'fa-question-circle', label:'Q&A'},
            {icon:'fa-chart-bar',       label:'Poll'},
            {icon:'fa-ellipsis',        label:'More'},
          ].map(t => (
            <button key={t.label} style={S.toolBtn}>
              <i className={`fas ${t.icon}`} style={{fontSize:15, color:'rgba(255,255,255,0.55)'}} />
              <span style={{fontSize:10, color:'rgba(255,255,255,0.35)'}}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ══ END LIVE CONFIRMATION ══ */}
      {showEnd && (
        <div style={S.endOverlay}>
          <div style={S.endCard}>
            <div style={{fontSize:18, fontWeight:800, marginBottom:8}}>End live stream?</div>
            <div style={{fontSize:13, color:'#A1A1AA', marginBottom:24, lineHeight:1.5}}>
              {fmt(viewers)} people are watching. End stream for everyone?
            </div>
            <button onClick={onEnd} style={{width:'100%',padding:14,background:'#EF4444',border:'none',borderRadius:12,color:'white',fontSize:15,fontWeight:700,cursor:'pointer',marginBottom:10}}>
              End Live
            </button>
            <button onClick={()=>setShowEnd(false)} style={{width:'100%',padding:14,background:'#1e1e1e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,color:'white',fontSize:15,fontWeight:600,cursor:'pointer'}}>
              Keep Streaming
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.35}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
    </div>
  )
}

// ─────────────────────────────────────────
// Styles
// ─────────────────────────────────────────
const S = {
  page: {
    position:'fixed', inset:0,
    background:'#000',
    zIndex:200,
    fontFamily:"'Inter',sans-serif", color:'#fff',
    display:'flex', flexDirection:'column',
    paddingBottom:'calc(var(--nav-h, 50px) + var(--safe-bottom, 0px))',
  },

  // ── Video zone ──
  videoZone: {
    position:'relative',
    height:'62%',
    flexShrink:0,
    background:'linear-gradient(135deg,#080015,#14002a,#000)',
    overflow:'hidden',
  },
  videoBg: {
    width:'100%', height:'100%',
    display:'flex', flexDirection:'column',
    alignItems:'center', justifyContent:'center',
  },
  topGrad: {
    position:'absolute', top:0, left:0, right:0, height:100,
    background:'linear-gradient(to bottom,rgba(0,0,0,0.65),transparent)',
    pointerEvents:'none',
  },
  botGrad: {
    position:'absolute', bottom:0, left:0, right:0, height:80,
    background:'linear-gradient(to bottom,transparent,rgba(0,0,0,0.75))',
    pointerEvents:'none',
  },

  topBar: {
    position:'absolute', top:0, left:0, right:0,
    display:'flex', alignItems:'center', justifyContent:'space-between',
    padding:'10px 12px 8px',
    zIndex:10,
  },
  topLeft: { display:'flex', alignItems:'center', gap:8 },
  hostAvatar: {
    width:34, height:34, borderRadius:'50%',
    background:'linear-gradient(135deg,#D946EF,#FF3366)',
    display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:14, fontWeight:900, color:'white',
    border:'2px solid rgba(255,255,255,0.5)', flexShrink:0,
  },
  verifiedDot: {
    width:13, height:13, borderRadius:'50%', background:'#3B82F6',
    display:'inline-flex', alignItems:'center', justifyContent:'center',
    fontSize:7, color:'white', fontWeight:900,
  },
  livePill: {
    display:'flex', alignItems:'center', gap:4,
    background:'#EF4444', borderRadius:20,
    padding:'3px 8px', fontSize:10, fontWeight:800, color:'white',
  },
  blinkDot: { width:5, height:5, borderRadius:'50%', background:'white', animation:'blink 1s infinite' },
  viewerBadge: {
    display:'flex', alignItems:'center', gap:4,
    background:'rgba(0,0,0,0.55)', backdropFilter:'blur(8px)',
    borderRadius:20, padding:'3px 9px',
    fontSize:11, fontWeight:600, color:'white',
  },
  timerBadge: {
    background:'rgba(0,0,0,0.55)', backdropFilter:'blur(8px)',
    borderRadius:20, padding:'3px 9px',
    fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.8)',
  },
  xBtn: {
    width:30, height:30, borderRadius:'50%',
    background:'rgba(0,0,0,0.6)', border:'1px solid rgba(255,255,255,0.15)',
    display:'flex', alignItems:'center', justifyContent:'center',
    cursor:'pointer', color:'white',
  },

  // Right controls (mic, flip, effects)
  rightControls: {
    position:'absolute', right:12, top:'50%',
    transform:'translateY(-50%)',
    display:'flex', flexDirection:'column', gap:10,
    zIndex:10,
  },
  ctrlBtn: {
    width:40, height:40, borderRadius:'50%',
    background:'rgba(0,0,0,0.55)', backdropFilter:'blur(8px)',
    border:'1px solid rgba(255,255,255,0.15)',
    display:'flex', alignItems:'center', justifyContent:'center',
    cursor:'pointer',
  },

  // Bottom-left of video: stats + products pill
  bottomLeft: {
    position:'absolute', bottom:10, left:12,
    display:'flex', flexDirection:'column', gap:6,
    zIndex:10, maxWidth:'70%',
  },
  statsRow: { display:'flex', gap:6 },
  statChip: {
    display:'flex', alignItems:'center', gap:4,
    background:'rgba(0,0,0,0.55)', backdropFilter:'blur(8px)',
    borderRadius:20, padding:'3px 9px',
    fontSize:10, fontWeight:600, color:'rgba(255,255,255,0.85)',
  },
  productsPill: {
    display:'inline-flex', alignItems:'center', gap:6,
    background:'rgba(255,51,102,0.85)', backdropFilter:'blur(8px)',
    border:'none', borderRadius:20, padding:'7px 14px',
    fontSize:12, fontWeight:700, color:'white',
    cursor:'pointer', fontFamily:'inherit',
    boxShadow:'0 2px 12px rgba(255,51,102,0.35)',
  },

  // Products slide-up sheet
  productsSheet: {
    background:'#141414',
    borderTop:'1px solid rgba(255,255,255,0.1)',
    flexShrink:0,
    maxHeight:'35%',
    display:'flex', flexDirection:'column',
  },
  productsSheetHandle: {
    width:36, height:4, borderRadius:20,
    background:'rgba(255,255,255,0.15)',
    margin:'8px auto 0',
    flexShrink:0,
  },
  productsSheetHeader: {
    display:'flex', alignItems:'center', justifyContent:'space-between',
    padding:'8px 14px 6px', flexShrink:0,
  },
  productsScroll: {
    overflowY:'auto', padding:'0 14px 10px',
    scrollbarWidth:'none', flex:1,
  },
  productRow: {
    display:'flex', alignItems:'center', gap:10,
    padding:'10px 0',
    borderBottom:'1px solid rgba(255,255,255,0.05)',
  },
  productRowNum: {
    width:20, height:20, borderRadius:'50%',
    background:'#FF3366', display:'flex', alignItems:'center',
    justifyContent:'center', fontSize:9, fontWeight:900, color:'white', flexShrink:0,
  },
  productRowThumb: {
    width:48, height:48, borderRadius:8,
    background:'#1e1e1e', border:'1px solid rgba(255,255,255,0.08)',
    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
  },
  reserveBtn: {
    padding:'6px 14px', background:'#FF3366', border:'none',
    borderRadius:20, color:'white', fontSize:11, fontWeight:700,
    cursor:'pointer', whiteSpace:'nowrap',
  },

  // Chat zone
  chatZone: {
    flex:1, display:'flex', flexDirection:'column',
    background:'#000', overflow:'hidden',
    minHeight:0,
  },
  chatScroll: {
    flex:1, overflowY:'auto', padding:'8px 12px 4px',
    scrollbarWidth:'none',
    /* TikTok style: comments start from bottom */
    display:'flex', flexDirection:'column', justifyContent:'flex-end',
  },
  chatRow: {
    display:'flex', alignItems:'flex-start', gap:7,
    marginBottom:5,
    animation:'fadeUp 0.25s ease',
  },
  chatAvatar: {
    width:22, height:22, borderRadius:'50%',
    display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:9, fontWeight:900, color:'white',
    flexShrink:0, marginTop:1,
  },
  chatBubble: {
    background:'rgba(255,255,255,0.08)',
    backdropFilter:'blur(4px)',
    borderRadius:12,
    padding:'5px 10px',
    fontSize:12, lineHeight:1.35,
    maxWidth:'85%',
  },

  // Bottom bar
  bottomBar: {
    display:'flex', alignItems:'center', gap:8,
    padding:'6px 12px',
    borderTop:'1px solid rgba(255,255,255,0.06)',
    flexShrink:0,
  },
  commentWrap: { flex:1 },
  commentInput: {
    width:'100%', padding:'9px 14px',
    background:'rgba(255,255,255,0.08)',
    border:'1px solid rgba(255,255,255,0.1)',
    borderRadius:20, color:'white', fontSize:13,
    outline:'none', fontFamily:'inherit',
    boxSizing:'border-box',
  },
  reactionsRow: { display:'flex', alignItems:'center', gap:4, flexShrink:0 },
  sendBtn: {
    width:34, height:34, borderRadius:'50%',
    background:'#FF3366', border:'none',
    display:'flex', alignItems:'center', justifyContent:'center',
    cursor:'pointer', flexShrink:0,
  },
  reactionBtn: {
    width:34, height:34, borderRadius:'50%',
    background:'rgba(255,255,255,0.08)', border:'none',
    display:'flex', alignItems:'center', justifyContent:'center',
    cursor:'pointer',
  },

  // Tools row
  toolsRow: {
    display:'flex', justifyContent:'space-around',
    padding:'4px 0 6px',
    borderTop:'1px solid rgba(255,255,255,0.05)',
    flexShrink:0,
  },
  toolBtn: {
    display:'flex', flexDirection:'column', alignItems:'center', gap:2,
    background:'none', border:'none', cursor:'pointer', padding:'4px 20px',
  },

  // End modal
  endOverlay: {
    position:'absolute', inset:0,
    background:'rgba(0,0,0,0.75)',
    display:'flex', alignItems:'flex-end', zIndex:300,
  },
  endCard: {
    width:'100%', background:'#141414',
    borderRadius:'20px 20px 0 0',
    padding:'24px 20px 32px',
  },
}
