import { useState, useEffect, useRef } from 'react'

const PLACEHOLDER_COMMENTS = [
  { id:1,  user:'kelvin_254', text:'Is the first item still available?',  color:'#7C3AED' },
  { id:2,  user:'sharon.w',   text:'What sizes do you have?',              color:'#EC4899' },
  { id:3,  user:'brian_o',    text:'Can you deliver to Entebbe?',          color:'#22C55E' },
  { id:4,  user:'grace_m',    text:'Reserved! 🔥',                         color:'#F59E0B' },
  { id:5,  user:'david_k',    text:'Price on the last one?',               color:'#3B82F6' },
  { id:6,  user:'amina.n',    text:'How much is delivery?',                color:'#F97316' },
  { id:7,  user:'peter_ke',   text:'Can you hold for 30 mins?',            color:'#8B5CF6' },
]

export default function LiveSellingPage({ config, onEnd }) {
  const { title = 'Live Sell 🔥', products: cfgProducts = [], delivery = false } = config || {}

  const [viewers,   setViewers]   = useState(12)
  const [likes,     setLikes]     = useState(0)
  const [liked,     setLiked]     = useState(false)
  const [comments,  setComments]  = useState(PLACEHOLDER_COMMENTS.slice(0, 3))
  const [comment,   setComment]   = useState('')
  const [elapsed,   setElapsed]   = useState(0)
  const [activeProd,setActiveProd]= useState(0)
  const [pinnedProd,setPinnedProd]= useState(null)
  const [showEnd,   setShowEnd]   = useState(false)
  const [muted,     setMuted]     = useState(false)
  const [reservations, setReservations] = useState(0)
  const chatRef = useRef(null)

  const displayProducts = cfgProducts.length > 0 ? cfgProducts : [
    { id:'p1', name:'Product 1', price:'150,000', stock:5,  instant_reserve:true,  delivery:true  },
    { id:'p2', name:'Product 2', price:'80,000',  stock:3,  instant_reserve:true,  delivery:false },
    { id:'p3', name:'Product 3', price:'220,000', stock:8,  instant_reserve:false, delivery:true  },
  ]

  useEffect(() => {
    const t = setInterval(() => {
      setViewers(v => v + Math.floor(Math.random() * 2))
      setLikes(l => l + Math.floor(Math.random() * 2))
      setElapsed(e => e + 1)
      if (Math.random() > 0.65) {
        const c = PLACEHOLDER_COMMENTS[Math.floor(Math.random() * PLACEHOLDER_COMMENTS.length)]
        setComments(prev => [...prev.slice(-15), { ...c, id: Date.now() }])
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
    setComments(prev => [...prev.slice(-15), { id:Date.now(), user:'You', text:comment.trim(), color:'#FF3366' }])
    setComment('')
  }

  return (
    <div style={S.page}>

      {/* ══ ZONE 1: VIDEO (top ~48% of screen) ══ */}
      <div style={S.videoZone}>
        {/* Camera placeholder */}
        <div style={S.videoPlaceholder}>
          <i className="fas fa-video" style={{ fontSize:40, color:'rgba(255,255,255,0.1)' }} />
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.2)', marginTop:8 }}>Camera preview</div>
        </div>

        {/* Top bar over video */}
        <div style={S.topBar}>
          {/* Left: avatar + name */}
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={S.hostAvatar}>H</div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'white', display:'flex', alignItems:'center', gap:5 }}>
                Your Store
                <span style={S.verifiedDot}>✓</span>
              </div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.55)' }}>{fmt(likes)} likes</div>
            </div>
            <div style={S.livePill}>
              <div style={S.liveDot} /> LIVE
            </div>
          </div>
          {/* Right: viewers + timer + close */}
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={S.viewersPill}>
              <i className="fas fa-eye" style={{ fontSize:10 }} /> {fmt(viewers)}
            </div>
            <div style={S.timerPill}>{fmtTime(elapsed)}</div>
            <button onClick={() => setShowEnd(true)} style={S.xBtn}>
              <i className="fas fa-times" />
            </button>
          </div>
        </div>

        {/* Delivery badge */}
        {delivery && (
          <div style={S.deliveryBadge}>
            <i className="fas fa-truck" style={{ fontSize:10 }} /> Free Delivery
          </div>
        )}

        {/* Host controls (mic, flip, effects) — bottom-left of video */}
        <div style={S.hostControls}>
          <button onClick={() => setMuted(m => !m)} style={{ ...S.hostBtn, background: muted ? 'rgba(239,68,68,0.6)' : 'rgba(0,0,0,0.5)' }}>
            <i className={`fas ${muted ? 'fa-microphone-slash' : 'fa-microphone'}`} style={{ fontSize:13, color:'white' }} />
          </button>
          <button style={S.hostBtn}>
            <i className="fas fa-camera-rotate" style={{ fontSize:13, color:'white' }} />
          </button>
          <button style={S.hostBtn}>
            <i className="fas fa-wand-magic-sparkles" style={{ fontSize:13, color:'white' }} />
          </button>
        </div>

        {/* Right action strip — over video, right side */}
        <div style={S.actionStrip}>
          <div style={S.actionBtn} onClick={() => { setLiked(l=>!l); setLikes(n=>liked?n-1:n+1) }}>
            <i className="fas fa-heart" style={{ fontSize:26, color: liked?'#FF3366':'white', filter:'drop-shadow(0 1px 4px rgba(0,0,0,0.8))' }} />
            <span style={S.actionCount}>{fmt(likes)}</span>
          </div>
          <div style={S.actionBtn}>
            <i className="fas fa-comment" style={{ fontSize:26, color:'white', filter:'drop-shadow(0 1px 4px rgba(0,0,0,0.8))' }} />
            <span style={S.actionCount}>{fmt(comments.length)}</span>
          </div>
          <div style={S.actionBtn}>
            <i className="fas fa-bookmark" style={{ fontSize:26, color:'white', filter:'drop-shadow(0 1px 4px rgba(0,0,0,0.8))' }} />
          </div>
          <div style={S.actionBtn}>
            <i className="fas fa-share-nodes" style={{ fontSize:26, color:'white', filter:'drop-shadow(0 1px 4px rgba(0,0,0,0.8))' }} />
          </div>
        </div>

        {/* Video gradient fade into the content zone below */}
        <div style={S.videoFade} />
      </div>

      {/* ══ ZONE 2: LIVE STATS BAR (thin strip between video and products) ══ */}
      <div style={S.statsBar}>
        <StatChip icon="fa-eye"           color="#3B82F6" val={fmt(viewers)}      label="Viewers"     />
        <StatChip icon="fa-shield-halved" color="#22C55E" val={reservations}       label="Reservations"/>
        <StatChip icon="fa-box"           color="#F59E0B" val={displayProducts.reduce((a,p)=>a+parseInt(p.stock||0),0)} label="Stock left" />
        <StatChip icon="fa-money-bill"    color="#FF3366" val="UGX 0"              label="Earnings"    />
      </div>

      {/* ══ ZONE 3: PRODUCTS STRIP ══ */}
      <div style={S.productsZone}>
        <div style={S.productsHeader}>
          <span style={{ fontSize:13, fontWeight:700 }}>
            Products ({displayProducts.length})
          </span>
          {delivery && (
            <span style={S.shippingBadge}>
              <i className="fas fa-truck" style={{ fontSize:9 }} /> Shipping available
            </span>
          )}
        </div>
        <div style={S.productsScroll}>
          {displayProducts.map((p, i) => (
            <div
              key={p.id || i}
              onClick={() => { setActiveProd(i); setPinnedProd(pinnedProd?.id===p.id?null:p) }}
              style={{ ...S.productCard, outline: activeProd===i ? '2px solid #FF3366' : 'none' }}
            >
              <div style={S.productNum}>{i+1}</div>
              <div style={S.productThumb}>
                <i className="fas fa-box" style={{ fontSize:22, color:'#52525B' }} />
              </div>
              <div style={{ padding:'6px 8px' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'white', lineHeight:1.2, marginBottom:2 }}>{p.name}</div>
                <div style={{ fontSize:12, color:'#FF3366', fontWeight:800 }}>UGX {p.price}</div>
                <div style={{ fontSize:10, color: parseInt(p.stock)<=2 ? '#EF4444' : '#71717A', marginTop:1 }}>
                  Stock: {p.stock}
                </div>
              </div>
              {p.instant_reserve && (
                <button
                  onClick={e => { e.stopPropagation(); setReservations(r=>r+1) }}
                  style={S.reserveBtn}
                >
                  Reserve
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ══ ZONE 4: CHAT ══ */}
      <div style={S.chatZone}>
        {/* Pinned product */}
        {pinnedProd && (
          <div style={S.pinnedRow}>
            <span style={{ fontSize:10, fontWeight:800, color:'#FF3366', flexShrink:0 }}>📌 Pinned</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'white', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{pinnedProd.name}</div>
              <div style={{ fontSize:11, color:'#FF3366', fontWeight:800 }}>UGX {pinnedProd.price}</div>
            </div>
            {pinnedProd.instant_reserve && (
              <button onClick={() => setReservations(r=>r+1)} style={S.pinnedReserveBtn}>Reserve</button>
            )}
            <button onClick={() => setPinnedProd(null)} style={{ background:'none',border:'none',color:'#71717A',cursor:'pointer',padding:4,flexShrink:0 }}>
              <i className="fas fa-times" style={{ fontSize:11 }} />
            </button>
          </div>
        )}

        {/* Scrollable comments */}
        <div ref={chatRef} style={S.chatScroll}>
          {comments.map(c => (
            <div key={c.id} style={S.chatRow}>
              <div style={{ ...S.chatAvatar, background:c.color }}>{c.user[0].toUpperCase()}</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.85)', lineHeight:1.3 }}>
                <span style={{ fontWeight:700, color:c.color }}>{c.user} </span>
                {c.text}
              </div>
            </div>
          ))}
        </div>

        {/* Input + tools */}
        <div style={S.commentInputRow}>
          <input
            placeholder="Add a comment..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            onKeyDown={e => e.key==='Enter' && sendComment()}
            style={S.commentInput}
          />
          <button onClick={sendComment} style={S.sendBtn}>
            <i className="fas fa-paper-plane" style={{ fontSize:12 }} />
          </button>
        </div>
        <div style={S.toolsRow}>
          {[{icon:'fa-question-circle',label:'Q&A'},{icon:'fa-chart-bar',label:'Poll'},{icon:'fa-ellipsis',label:'More'}].map(t=>(
            <button key={t.label} style={S.toolBtn}>
              <i className={`fas ${t.icon}`} style={{ fontSize:15, color:'rgba(255,255,255,0.6)' }} />
              <span style={{ fontSize:10, color:'rgba(255,255,255,0.4)' }}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ══ END LIVE MODAL ══ */}
      {showEnd && (
        <div style={S.endOverlay}>
          <div style={S.endCard}>
            <div style={{ fontSize:18, fontWeight:800, marginBottom:8 }}>End live stream?</div>
            <div style={{ fontSize:13, color:'#A1A1AA', marginBottom:24, lineHeight:1.5 }}>
              {fmt(viewers)} people are watching. End stream for everyone?
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
      `}</style>
    </div>
  )
}

function StatChip({ icon, color, val, label }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, flex:1 }}>
      <i className={`fas ${icon}`} style={{ fontSize:13, color }} />
      <div style={{ fontSize:14, fontWeight:800, color:'white' }}>{val}</div>
      <div style={{ fontSize:9, color:'#71717A', textAlign:'center' }}>{label}</div>
    </div>
  )
}

// ── Styles — fixed zone layout ──
const VH = '100dvh'
// Zone heights (must sum to 100dvh minus nav):
//   Video:    48%
//   Stats:    52px
//   Products: 140px
//   Chat:     rest (flex:1)
const S = {
  page: {
    position:'fixed', inset:0,
    background:'#000',
    zIndex:200,
    fontFamily:"'Inter',sans-serif", color:'#fff',
    display:'flex', flexDirection:'column',
    // account for bottom nav
    paddingBottom:`calc(var(--nav-h, 50px) + var(--safe-bottom, 0px))`,
  },

  // Zone 1 — Video
  videoZone: {
    position:'relative',
    flexShrink:0,
    height:'46%',
    background:'linear-gradient(135deg,#0a0020,#1a0035,#000)',
    overflow:'hidden',
  },
  videoPlaceholder: {
    width:'100%', height:'100%',
    display:'flex', flexDirection:'column',
    alignItems:'center', justifyContent:'center',
  },
  videoFade: {
    position:'absolute', bottom:0, left:0, right:0, height:60,
    background:'linear-gradient(to bottom,transparent,#000)',
    pointerEvents:'none',
  },
  topBar: {
    position:'absolute', top:0, left:0, right:0,
    display:'flex', alignItems:'center', justifyContent:'space-between',
    padding:'10px 12px 8px',
    background:'linear-gradient(to bottom,rgba(0,0,0,0.6),transparent)',
    zIndex:10,
  },
  hostAvatar: {
    width:34, height:34, borderRadius:'50%',
    background:'linear-gradient(135deg,#D946EF,#FF3366)',
    display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:13, fontWeight:900, color:'white',
    border:'2px solid rgba(255,255,255,0.6)', flexShrink:0,
  },
  verifiedDot: {
    width:13, height:13, borderRadius:'50%', background:'#3B82F6',
    display:'inline-flex', alignItems:'center', justifyContent:'center',
    fontSize:7, color:'white', fontWeight:900,
  },
  livePill: {
    display:'flex', alignItems:'center', gap:4,
    background:'#EF4444', borderRadius:20,
    padding:'2px 7px', fontSize:10, fontWeight:800, color:'white',
  },
  liveDot: { width:5, height:5, borderRadius:'50%', background:'white', animation:'blink 1s infinite' },
  viewersPill: {
    display:'flex', alignItems:'center', gap:4,
    background:'rgba(0,0,0,0.5)', backdropFilter:'blur(8px)',
    borderRadius:20, padding:'3px 8px',
    fontSize:11, fontWeight:600, color:'white',
  },
  timerPill: {
    background:'rgba(0,0,0,0.5)', backdropFilter:'blur(8px)',
    borderRadius:20, padding:'3px 8px',
    fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.8)',
  },
  xBtn: {
    width:30, height:30, borderRadius:'50%',
    background:'rgba(0,0,0,0.6)', border:'1px solid rgba(255,255,255,0.2)',
    display:'flex', alignItems:'center', justifyContent:'center',
    cursor:'pointer', color:'white', fontSize:13,
  },
  deliveryBadge: {
    position:'absolute', bottom:16, left:12,
    background:'rgba(59,130,246,0.85)', backdropFilter:'blur(6px)',
    borderRadius:20, padding:'4px 10px',
    fontSize:11, fontWeight:700, color:'white',
    display:'flex', alignItems:'center', gap:5, zIndex:10,
  },
  hostControls: {
    position:'absolute', bottom:12, left:12,
    display:'flex', gap:6, zIndex:10,
  },
  hostBtn: {
    width:32, height:32, borderRadius:'50%',
    background:'rgba(0,0,0,0.5)', backdropFilter:'blur(8px)',
    border:'1px solid rgba(255,255,255,0.15)',
    display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
  },
  actionStrip: {
    position:'absolute', right:10, bottom:14,
    display:'flex', flexDirection:'column', alignItems:'center', gap:14, zIndex:10,
  },
  actionBtn: {
    display:'flex', flexDirection:'column', alignItems:'center', gap:3, cursor:'pointer',
  },
  actionCount: { fontSize:11, fontWeight:700, color:'white', textShadow:'0 1px 3px rgba(0,0,0,0.9)' },

  // Zone 2 — Stats bar
  statsBar: {
    display:'flex', alignItems:'center', justifyContent:'space-around',
    padding:'10px 16px',
    background:'#0d0d0d',
    borderTop:'1px solid rgba(255,255,255,0.07)',
    borderBottom:'1px solid rgba(255,255,255,0.07)',
    flexShrink:0,
  },

  // Zone 3 — Products
  productsZone: {
    flexShrink:0,
    background:'#0a0a0a',
  },
  productsHeader: {
    display:'flex', alignItems:'center', justifyContent:'space-between',
    padding:'8px 14px 6px',
  },
  shippingBadge: {
    display:'flex', alignItems:'center', gap:4,
    background:'rgba(34,197,94,0.15)', border:'1px solid rgba(34,197,94,0.3)',
    borderRadius:20, padding:'3px 8px', fontSize:10, fontWeight:600, color:'#22C55E',
  },
  productsScroll: {
    display:'flex', gap:8, padding:'0 14px 10px',
    overflowX:'auto', scrollbarWidth:'none',
  },
  productCard: {
    flexShrink:0, width:100,
    background:'#181818', border:'1px solid rgba(255,255,255,0.08)',
    borderRadius:10, overflow:'hidden', cursor:'pointer',
    position:'relative', transition:'outline 0.15s',
  },
  productNum: {
    position:'absolute', top:5, left:5,
    width:16, height:16, borderRadius:'50%',
    background:'#FF3366', display:'flex', alignItems:'center',
    justifyContent:'center', fontSize:8, fontWeight:900, color:'white', zIndex:2,
  },
  productThumb: {
    width:'100%', height:60,
    background:'#1e1e1e',
    display:'flex', alignItems:'center', justifyContent:'center',
  },
  reserveBtn: {
    width:'100%', padding:'6px 0',
    background:'#FF3366', border:'none',
    color:'white', fontSize:11, fontWeight:800,
    cursor:'pointer', fontFamily:'inherit',
  },

  // Zone 4 — Chat
  chatZone: {
    flex:1, display:'flex', flexDirection:'column',
    background:'#000', overflow:'hidden',
    borderTop:'1px solid rgba(255,255,255,0.06)',
  },
  pinnedRow: {
    display:'flex', alignItems:'center', gap:8,
    padding:'8px 12px',
    background:'rgba(255,51,102,0.08)',
    borderBottom:'1px solid rgba(255,51,102,0.2)',
    flexShrink:0,
  },
  pinnedReserveBtn: {
    padding:'5px 12px', background:'#FF3366', border:'none',
    borderRadius:20, color:'white', fontSize:11, fontWeight:700,
    cursor:'pointer', whiteSpace:'nowrap',
  },
  chatScroll: {
    flex:1, overflowY:'auto', padding:'8px 12px',
    scrollbarWidth:'none',
  },
  chatRow: {
    display:'flex', alignItems:'flex-start', gap:7, marginBottom:6,
  },
  chatAvatar: {
    width:20, height:20, borderRadius:'50%',
    display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:8, fontWeight:900, color:'white', flexShrink:0, marginTop:1,
  },
  commentInputRow: {
    display:'flex', alignItems:'center', gap:8,
    padding:'6px 12px',
    borderTop:'1px solid rgba(255,255,255,0.06)',
    flexShrink:0,
  },
  commentInput: {
    flex:1, padding:'9px 14px',
    background:'rgba(255,255,255,0.08)',
    border:'1px solid rgba(255,255,255,0.1)',
    borderRadius:20, color:'white', fontSize:13,
    outline:'none', fontFamily:'inherit',
  },
  sendBtn: {
    width:34, height:34, borderRadius:'50%',
    background:'#FF3366', border:'none',
    display:'flex', alignItems:'center', justifyContent:'center',
    cursor:'pointer', color:'white', flexShrink:0,
  },
  toolsRow: {
    display:'flex', justifyContent:'space-around',
    padding:'4px 0 6px',
    borderTop:'1px solid rgba(255,255,255,0.05)',
    flexShrink:0,
  },
  toolBtn: {
    display:'flex', flexDirection:'column', alignItems:'center', gap:2,
    background:'none', border:'none', cursor:'pointer', padding:'4px 16px',
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
