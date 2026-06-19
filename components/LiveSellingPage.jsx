import { useState, useEffect, useRef } from 'react'

// Placeholder live comments that auto-scroll
const PLACEHOLDER_COMMENTS = [
  { id:1,  user:'kelvin_254',    text:'Is the Air Jordan still available?',           color:'#7C3AED' },
  { id:2,  user:'sharon.w',      text:'What size is the Yeezy?',                      color:'#EC4899' },
  { id:3,  user:'brian_o',       text:'Can you do delivery to Entebbe?',              color:'#22C55E' },
  { id:4,  user:'grace_m',       text:'Reserved! 🔥',                                 color:'#F59E0B' },
  { id:5,  user:'david_k',       text:'Price on the last pair?',                      color:'#3B82F6' },
  { id:6,  user:'amina.n',       text:'How much is delivery?',                        color:'#F97316' },
  { id:7,  user:'peter_ke',      text:'Can you hold for 30 mins?',                    color:'#8B5CF6' },
]

const PLACEHOLDER_RESERVATIONS = [
  { id:1, user:'Kelvin_254',  product:'Product 1', avatar:'KE', color:'#7C3AED' },
  { id:2, user:'Sharon.w',    product:'Product 2', avatar:'SW', color:'#EC4899' },
  { id:3, user:'Brian O.',    product:'Product 1', avatar:'BO', color:'#22C55E' },
]

export default function LiveSellingPage({ config, onEnd }) {
  const { title = 'Live Sell 🔥', products = [], delivery = false } = config || {}

  const [viewers,    setViewers]    = useState(0)
  const [likes,      setLikes]      = useState(0)
  const [liked,      setLiked]      = useState(false)
  const [comments,   setComments]   = useState(PLACEHOLDER_COMMENTS.slice(0, 3))
  const [comment,    setComment]    = useState('')
  const [elapsed,    setElapsed]    = useState(0)
  const [activeProd, setActiveProd] = useState(0)
  const [showEnd,    setShowEnd]    = useState(false)
  const [showStats,  setShowStats]  = useState(false)
  const [pinnedProd, setPinnedProd] = useState(null)
  const chatRef = useRef(null)

  // Simulate growing viewers & likes
  useEffect(() => {
    const t = setInterval(() => {
      setViewers(v => v + Math.floor(Math.random() * 3))
      setLikes(l => l + Math.floor(Math.random() * 2))
      setElapsed(e => e + 1)
      // add a random comment every ~4s
      if (Math.random() > 0.7) {
        const c = PLACEHOLDER_COMMENTS[Math.floor(Math.random() * PLACEHOLDER_COMMENTS.length)]
        setComments(prev => [...prev.slice(-20), { ...c, id: Date.now() }])
      }
    }, 1000)
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
    setComments(prev => [...prev.slice(-20), { id: Date.now(), user: 'You', text: comment.trim(), color: '#FF3366' }])
    setComment('')
  }

  const displayProducts = products.length > 0 ? products : [
    { id:'p1', name:'Product 1', price:'150,000', stock:5,  instant_reserve:true,  delivery:true  },
    { id:'p2', name:'Product 2', price:'80,000',  stock:3,  instant_reserve:true,  delivery:false },
    { id:'p3', name:'Product 3', price:'220,000', stock:8,  instant_reserve:false, delivery:true  },
  ]

  return (
    <div style={s.page}>

      {/* ── CAMERA / VIDEO AREA (full screen bg) ── */}
      <div style={s.videoBg}>
        <div style={s.videoPlaceholder}>
          <i className="fas fa-video" style={{ fontSize: 48, color: 'rgba(255,255,255,0.12)' }} />
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', marginTop: 10 }}>Camera feed</div>
        </div>
      </div>

      {/* Gradient overlay — heavy at top & bottom, clear in middle */}
      <div style={s.overlay} />

      {/* ── TOP BAR ── */}
      <div style={s.topBar}>
        {/* Left: avatar + name + followers */}
        <div style={s.topLeft}>
          <div style={s.hostAvatar}>H</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: 5 }}>
              Your Store
              <span style={s.verifiedBadge}>✓</span>
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>{fmt(likes)} likes</div>
          </div>
          <div style={s.livePill}>
            <div style={s.liveDot} /> LIVE
          </div>
        </div>

        {/* Right: viewers + timer + end */}
        <div style={s.topRight}>
          <div style={s.viewersPill}>
            <i className="fas fa-eye" style={{ fontSize: 10 }} />
            {fmt(viewers)}
          </div>
          <div style={s.timerPill}>{fmtTime(elapsed)}</div>
          <button onClick={() => setShowEnd(true)} style={s.endBtn}>
            <i className="fas fa-times" style={{ fontSize: 14 }} />
          </button>
        </div>
      </div>

      {/* Delivery badge */}
      {delivery && (
        <div style={s.deliveryBadge}>
          <i className="fas fa-truck" style={{ fontSize: 10 }} /> Free Delivery
        </div>
      )}

      {/* ── RIGHT SIDE: live stats + reactions ── */}
      <div style={s.rightStrip}>
        <div style={s.statBox}>
          <div style={s.statNum}>{fmt(viewers)}</div>
          <div style={s.statLabel}>Viewers</div>
        </div>
        <div style={s.statBox}>
          <div style={{ ...s.statNum, color: '#FF3366' }}>{PLACEHOLDER_RESERVATIONS.length}</div>
          <div style={s.statLabel}>Reserved</div>
        </div>
        <div style={s.statBox}>
          <div style={{ ...s.statNum, color: '#F59E0B' }}>{displayProducts.reduce((a,p) => a + parseInt(p.stock||0), 0)}</div>
          <div style={s.statLabel}>Stock</div>
        </div>
        {/* Like */}
        <div
          style={{ ...s.actionBtn, marginTop: 8 }}
          onClick={() => { setLiked(l => !l); setLikes(n => liked ? n-1 : n+1) }}
        >
          <i className={`fas fa-heart`} style={{ fontSize: 22, color: liked ? '#FF3366' : 'white', filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.8))' }} />
          <span style={s.actionCount}>{fmt(likes)}</span>
        </div>
        {/* Comments */}
        <div style={s.actionBtn} onClick={() => {}}>
          <i className="fas fa-comment" style={{ fontSize: 22, color: 'white', filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.8))' }} />
          <span style={s.actionCount}>{fmt(comments.length)}</span>
        </div>
        {/* Share */}
        <div style={s.actionBtn}>
          <i className="fas fa-share-nodes" style={{ fontSize: 22, color: 'white', filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.8))' }} />
        </div>
      </div>

      {/* ── RECENT RESERVATIONS (left side float) ── */}
      <div style={s.reservationsList}>
        {PLACEHOLDER_RESERVATIONS.map(r => (
          <div key={r.id} style={s.reservationRow}>
            <div style={{ ...s.miniAvatar, background: r.color }}>{r.avatar}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', lineHeight: 1.3 }}>
              <span style={{ fontWeight: 700 }}>{r.user}</span>
              <span style={{ color: 'rgba(255,255,255,0.55)' }}> reserved 1x </span>
              {r.product}
              <span style={{ fontSize: 16, marginLeft: 4 }}>🛍️</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── PRODUCTS STRIP ── */}
      <div style={s.productsSection}>
        <div style={s.productsSectionHeader}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>
            Products in this Live ({displayProducts.length})
          </span>
          {delivery && (
            <span style={s.shippingBadge}>
              <i className="fas fa-truck" style={{ fontSize: 9 }} /> Shipping available
            </span>
          )}
        </div>
        <div style={s.productsScroll}>
          {displayProducts.map((p, i) => (
            <div
              key={p.id || i}
              onClick={() => { setActiveProd(i); setPinnedProd(p) }}
              style={{ ...s.productCard, outline: activeProd === i ? '2px solid #FF3366' : 'none' }}
            >
              <div style={s.productNum}>{i + 1}</div>
              <div style={s.productThumb}>
                <i className="fas fa-box" style={{ fontSize: 18, color: '#52525B' }} />
              </div>
              <div style={{ padding: '0 6px 6px', flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'white', marginBottom: 2, lineHeight: 1.2 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: '#FF3366', fontWeight: 800 }}>UGX {p.price}</div>
                <div style={{ fontSize: 10, color: parseInt(p.stock) <= 2 ? '#EF4444' : '#A1A1AA', marginTop: 1 }}>
                  Stock: {p.stock}
                </div>
              </div>
              {p.instant_reserve && (
                <button style={s.reserveBtn}>Reserve</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── CHAT AREA ── */}
      <div style={s.chatSection}>
        <div ref={chatRef} style={s.chatScroll}>
          {comments.map(c => (
            <div key={c.id} style={s.chatRow}>
              <div style={{ ...s.chatAvatar, background: c.color }}>{c.user[0].toUpperCase()}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 1.3 }}>
                <span style={{ fontWeight: 700, color: c.color }}>{c.user} </span>
                {c.text}
              </div>
            </div>
          ))}
        </div>

        {/* Pinned product */}
        {pinnedProd && (
          <div style={s.pinnedProduct}>
            <span style={s.pinnedLabel}>📌 Pinned</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>{pinnedProd.name}</div>
              <div style={{ fontSize: 12, color: '#FF3366', fontWeight: 800 }}>UGX {pinnedProd.price}</div>
              {parseInt(pinnedProd.stock) <= 3 && (
                <div style={{ fontSize: 10, color: '#EF4444' }}>Stock: {pinnedProd.stock} left</div>
              )}
            </div>
            {pinnedProd.instant_reserve && (
              <button style={s.pinnedReserveBtn}>Reserve</button>
            )}
            <button onClick={() => setPinnedProd(null)} style={{ background:'none',border:'none',color:'#71717A',cursor:'pointer',padding:4,flexShrink:0 }}>
              <i className="fas fa-times" style={{ fontSize: 12 }} />
            </button>
          </div>
        )}

        {/* Comment input + bottom tools */}
        <div style={s.commentBar}>
          <div style={s.commentInputWrap}>
            <input
              placeholder="Add a comment..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendComment()}
              style={s.commentInput}
            />
            <button onClick={sendComment} style={s.sendBtn}>
              <i className="fas fa-paper-plane" style={{ fontSize: 13 }} />
            </button>
          </div>
          <div style={s.bottomTools}>
            {[
              { icon:'fa-question-circle', label:'Q&A' },
              { icon:'fa-chart-bar',       label:'Poll' },
              { icon:'fa-ellipsis',        label:'More' },
            ].map(t => (
              <button key={t.label} style={s.toolBtn}>
                <i className={`fas ${t.icon}`} style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)' }} />
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── END LIVE CONFIRMATION ── */}
      {showEnd && (
        <div style={s.endOverlay}>
          <div style={s.endCard}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>End live stream?</div>
            <div style={{ fontSize: 13, color: '#A1A1AA', marginBottom: 24, lineHeight: 1.5 }}>
              Your live will end for all {fmt(viewers)} viewers. You&apos;ll see a summary of reservations and earnings.
            </div>
            <button
              onClick={onEnd}
              style={{ width: '100%', padding: 14, background: '#EF4444', border: 'none', borderRadius: 12, color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}
            >
              End Live
            </button>
            <button
              onClick={() => setShowEnd(false)}
              style={{ width: '100%', padding: 14, background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
            >
              Keep Streaming
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
    </div>
  )
}

const s = {
  page:       { position:'fixed', inset:0, background:'#000', zIndex:200, fontFamily:"'Inter',sans-serif", color:'#fff', overflow:'hidden' },
  videoBg:    { position:'absolute', inset:0, background:'linear-gradient(135deg,#0a0020,#1a0030,#000)' },
  videoPlaceholder: { width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' },
  overlay:    { position:'absolute', inset:0, background:'linear-gradient(to bottom,rgba(0,0,0,0.55) 0%,transparent 20%,transparent 50%,rgba(0,0,0,0.5) 70%,rgba(0,0,0,0.85) 100%)', pointerEvents:'none' },

  topBar:     { position:'absolute', top:0, left:0, right:0, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', paddingTop:'calc(env(safe-area-inset-top,44px) + 8px)', zIndex:20 },
  topLeft:    { display:'flex', alignItems:'center', gap:8 },
  topRight:   { display:'flex', alignItems:'center', gap:6 },
  hostAvatar: { width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#D946EF,#FF3366)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:900, border:'2px solid white', flexShrink:0 },
  verifiedBadge: { width:13, height:13, borderRadius:'50%', background:'#3B82F6', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:7, color:'white', fontWeight:900 },
  livePill:   { display:'flex', alignItems:'center', gap:4, background:'#EF4444', borderRadius:20, padding:'3px 8px', fontSize:11, fontWeight:800, color:'white' },
  liveDot:    { width:6, height:6, borderRadius:'50%', background:'white', animation:'blink 1s infinite' },
  viewersPill:{ display:'flex', alignItems:'center', gap:4, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(8px)', borderRadius:20, padding:'4px 10px', fontSize:12, fontWeight:600, color:'white', gap:5 },
  timerPill:  { background:'rgba(0,0,0,0.5)', backdropFilter:'blur(8px)', borderRadius:20, padding:'4px 10px', fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.8)', fontVariantNumeric:'tabular-nums' },
  endBtn:     { width:32, height:32, borderRadius:'50%', background:'rgba(0,0,0,0.6)', border:'1px solid rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'white' },
  deliveryBadge: { position:'absolute', top:'calc(env(safe-area-inset-top,44px) + 64px)', left:14, background:'rgba(59,130,246,0.85)', backdropFilter:'blur(6px)', borderRadius:20, padding:'4px 10px', fontSize:11, fontWeight:700, color:'white', display:'flex', alignItems:'center', gap:5, zIndex:20 },

  rightStrip: { position:'absolute', right:10, top:'calc(env(safe-area-inset-top,44px) + 60px)', display:'flex', flexDirection:'column', alignItems:'center', gap:6, zIndex:20 },
  statBox:    { background:'rgba(0,0,0,0.55)', backdropFilter:'blur(8px)', borderRadius:10, padding:'6px 10px', textAlign:'center', marginBottom:2 },
  statNum:    { fontSize:16, fontWeight:900, color:'white', lineHeight:1 },
  statLabel:  { fontSize:9, color:'rgba(255,255,255,0.5)', marginTop:2 },
  actionBtn:  { display:'flex', flexDirection:'column', alignItems:'center', gap:3, cursor:'pointer', marginTop:4 },
  actionCount:{ fontSize:11, fontWeight:700, color:'white', textShadow:'0 1px 3px rgba(0,0,0,0.9)' },

  reservationsList: { position:'absolute', left:14, zIndex:20, display:'flex', flexDirection:'column', gap:6, maxWidth:'55%',
    bottom:'calc(env(safe-area-inset-bottom,0px) + 290px)' },
  reservationRow: { display:'flex', alignItems:'center', gap:7, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(8px)', borderRadius:20, padding:'5px 10px 5px 5px' },
  miniAvatar: { width:24, height:24, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:900, color:'white', flexShrink:0 },

  productsSection: { position:'absolute', left:0, right:0, zIndex:20, bottom:'calc(env(safe-area-inset-bottom,0px) + 140px)' },
  productsSectionHeader: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 14px 8px' },
  shippingBadge: { display:'flex', alignItems:'center', gap:4, background:'rgba(34,197,94,0.2)', border:'1px solid rgba(34,197,94,0.4)', borderRadius:20, padding:'3px 8px', fontSize:10, fontWeight:600, color:'#22C55E' },
  productsScroll: { display:'flex', gap:8, padding:'0 14px', overflowX:'auto', scrollbarWidth:'none' },
  productCard: { flexShrink:0, width:110, background:'rgba(20,20,20,0.92)', backdropFilter:'blur(10px)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, overflow:'hidden', cursor:'pointer', display:'flex', flexDirection:'column', transition:'outline 0.2s' },
  productNum: { position:'absolute', top:6, left:6, width:18, height:18, borderRadius:'50%', background:'#FF3366', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:900, color:'white' },
  productThumb: { width:'100%', height:70, background:'#1e1e1e', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' },
  reserveBtn: { width:'100%', padding:'7px 0', background:'#FF3366', border:'none', color:'white', fontSize:11, fontWeight:800, cursor:'pointer', fontFamily:'inherit' },

  chatSection: { position:'absolute', left:0, right:0, bottom:0, zIndex:20 },
  chatScroll:  { maxHeight:100, overflowY:'auto', padding:'0 14px 6px', scrollbarWidth:'none' },
  chatRow:     { display:'flex', alignItems:'flex-start', gap:7, marginBottom:5, animation:'fadeInUp 0.2s ease' },
  chatAvatar:  { width:20, height:20, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:900, color:'white', flexShrink:0, marginTop:1 },

  pinnedProduct: { margin:'0 14px 8px', padding:'10px 12px', background:'rgba(20,20,20,0.95)', backdropFilter:'blur(10px)', border:'1px solid rgba(255,51,102,0.3)', borderRadius:12, display:'flex', alignItems:'center', gap:10 },
  pinnedLabel:   { fontSize:10, fontWeight:800, color:'#FF3366', whiteSpace:'nowrap' },
  pinnedReserveBtn: { padding:'7px 14px', background:'#FF3366', border:'none', borderRadius:20, color:'white', fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' },

  commentBar:       { padding:'6px 14px', paddingBottom:'calc(env(safe-area-inset-bottom,0px) + 6px)', background:'rgba(0,0,0,0.7)', backdropFilter:'blur(10px)' },
  commentInputWrap: { display:'flex', alignItems:'center', gap:8, marginBottom:8 },
  commentInput:     { flex:1, padding:'9px 14px', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:20, color:'white', fontSize:13, outline:'none', fontFamily:'inherit' },
  sendBtn:          { width:34, height:34, borderRadius:'50%', background:'#FF3366', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'white', flexShrink:0 },
  bottomTools:      { display:'flex', justifyContent:'space-around' },
  toolBtn:          { display:'flex', flexDirection:'column', alignItems:'center', gap:3, background:'none', border:'none', cursor:'pointer', padding:'4px 16px' },

  endOverlay: { position:'absolute', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'flex-end', zIndex:300 },
  endCard:    { width:'100%', background:'#141414', borderRadius:'20px 20px 0 0', padding:'24px 20px', paddingBottom:'calc(env(safe-area-inset-bottom,0px) + 20px)' },
}
