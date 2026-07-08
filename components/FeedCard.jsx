import { useState, useEffect, useRef } from 'react'
import { formatUGX, discountPct, fmtCount, fmtDistance, likePost, unlikePost, savePost, unsavePost, sharePost, recordView } from '../lib/feed'
import ReservationPage from './ReservationPage'
import ChatScreen      from './ChatScreen'

// ── Deterministic avatar colour ───────────────────────────────────────────────
function avatarColor(id=''){const C=['#7C3AED','#FF3366','#F97316','#22C55E','#3B82F6','#EC4899','#F59E0B','#06B6D4'];return C[id.split('').reduce((a,c)=>a+c.charCodeAt(0),0)%C.length]}

// ── Social post — full-screen Instagram Reels style ───────────────────────────
function SocialCard({ p, seller, sellerColor, sellerInitial, liked, likes, saved, saves, onLike, onSave, onShare, onComment, onDoubleTap }) {
  const isVideo   = !!p.video_url
  const hasImages = p.images?.length > 0
  const [imgIdx,      setImgIdx]      = useState(0)
  const [videoPaused, setVideoPaused] = useState(false)
  const [muted,       setMuted]       = useState(true)   // start muted for autoplay
  const socialVideoRef = useRef(null)

  useEffect(() => {
    const v = socialVideoRef.current; if (!v) return
    if (videoPaused) v.pause(); else v.play().catch(()=>{})
  }, [videoPaused])

  useEffect(() => {
    const v = socialVideoRef.current; if (!v) return
    v.muted = muted
  }, [muted])

  return (
    <div className="feed-card" onDoubleClick={onDoubleTap} style={{position:'relative'}}>

      {/* ── Full-screen media ── */}
      {isVideo ? (
        <>
          <video ref={socialVideoRef} src={p.video_url}
            className="feed-media-bg" style={{objectFit:'cover',width:'100%',height:'100%'}}
            autoPlay muted={muted} loop playsInline
            onClick={()=>setVideoPaused(x=>!x)}/>
          {videoPaused && (
            <div onClick={()=>setVideoPaused(false)} style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',zIndex:18,cursor:'pointer'}}>
              <div style={{width:64,height:64,borderRadius:'50%',background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </div>
            </div>
          )}
          {/* Mute toggle */}
          <button onClick={e=>{e.stopPropagation();setMuted(m=>!m)}}
            style={{position:'absolute',top:'calc(env(safe-area-inset-top,0px)+60px)',right:14,width:34,height:34,borderRadius:'50%',background:'rgba(0,0,0,0.55)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',zIndex:17}}>
            {muted
              ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
              : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/></svg>
            }
          </button>
        </>
      ) : hasImages ? (
        <>
          {p.images.length > 1 ? (
            <div className="feed-media-bg"
              style={{display:'flex',overflowX:'auto',scrollSnapType:'x mandatory',scrollbarWidth:'none'}}
              onScroll={e=>setImgIdx(Math.round(e.currentTarget.scrollLeft/e.currentTarget.offsetWidth))}>
              {p.images.map((src,i)=>(
                <img key={i} src={src} alt="" style={{width:'100%',height:'100%',objectFit:'cover',flexShrink:0,scrollSnapAlign:'start'}}/>
              ))}
            </div>
          ) : (
            <img src={p.images[0]} alt="" className="feed-media-bg" style={{objectFit:'cover',width:'100%',height:'100%'}}/>
          )}
          {p.images.length > 1 && (
            <>
              <div style={{position:'absolute',top:10,right:10,background:'rgba(0,0,0,0.6)',borderRadius:20,padding:'3px 8px',fontSize:11,fontWeight:700,color:'white',zIndex:16}}>{imgIdx+1}/{p.images.length}</div>
              <div style={{position:'absolute',bottom:'calc(var(--nav-h,50px) + var(--safe-bottom,0px) + 140px)',left:0,right:0,display:'flex',justifyContent:'center',gap:5,zIndex:16,pointerEvents:'none'}}>
                {p.images.map((_,i)=>(
                  <div key={i} style={{width:i===imgIdx?18:5,height:4,borderRadius:2,background:i===imgIdx?'white':'rgba(255,255,255,0.4)',transition:'all 0.2s'}}/>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="feed-media-bg" style={{background:'linear-gradient(160deg,#0d001a,#0d0d0d)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{fontSize:120,opacity:0.12}}>✨</div>
        </div>
      )}

      <div className="feed-overlay"/>

      {/* ── Right side action strip ── */}
      <div style={{position:'absolute',right:12,bottom:'calc(var(--nav-h,50px) + var(--safe-bottom,0px) + 90px)',display:'flex',flexDirection:'column',alignItems:'center',gap:20,zIndex:20}}>
        <div style={{position:'relative',marginBottom:4}}>
          <div style={{width:42,height:42,borderRadius:'50%',background:sellerColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:900,color:'white',border:'2px solid white',boxShadow:'0 2px 8px rgba(0,0,0,0.5)'}}>{sellerInitial}</div>
          <div style={{position:'absolute',bottom:-6,left:'50%',transform:'translateX(-50%)',width:18,height:18,borderRadius:'50%',background:'#FF3366',display:'flex',alignItems:'center',justifyContent:'center',border:'1.5px solid #000'}}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="white"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
        </div>
        <RightAction onClick={onLike} count={fmtCount(likes)} active={liked} activeColor="#FF3366">
          <svg width="26" height="26" viewBox="0 0 24 24" fill={liked?'#FF3366':'none'} stroke={liked?'#FF3366':'white'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
        </RightAction>
        <RightAction onClick={onComment} count={fmtCount(p.comments_count||0)}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        </RightAction>
        <RightAction onClick={onShare}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </RightAction>
        <RightAction onClick={onSave} active={saved} activeColor="#FF3366">
          <svg width="22" height="26" viewBox="0 0 24 24" fill={saved?'#FF3366':'none'} stroke={saved?'#FF3366':'white'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
        </RightAction>
      </div>

      {/* ── Bottom info ── */}
      <div style={{position:'absolute',left:0,right:0,bottom:'calc(var(--nav-h,50px) + var(--safe-bottom,0px))',zIndex:20,padding:'0 14px 12px 14px',paddingRight:70}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
          <div style={{width:28,height:28,borderRadius:'50%',background:sellerColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:900,color:'white',flexShrink:0}}>{sellerInitial}</div>
          <span style={{fontSize:13,fontWeight:700,color:'white',textShadow:'0 1px 3px rgba(0,0,0,0.8)'}}>{seller?.full_name||seller?.username||'User'}</span>
          {seller?.verified&&<span style={{width:14,height:14,borderRadius:'50%',background:'#3B82F6',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:7,color:'white',fontWeight:900,flexShrink:0}}>✓</span>}
        </div>
        {p.caption && <div style={{fontSize:14,color:'rgba(255,255,255,0.9)',lineHeight:1.5,textShadow:'0 1px 3px rgba(0,0,0,0.7)',marginBottom:4,display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{p.caption}</div>}
        {p.location && <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',display:'flex',alignItems:'center',gap:4,marginTop:4}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>{p.location}</div>}
      </div>
    </div>
  )
}

// ── Inline action button (used by SocialCard bottom row) ─────────────────────
function ActionBtn({ icon, active, activeColor='#FF3366', count, onClick }) {
  return (
    <div onClick={onClick} style={{display:'flex',alignItems:'center',gap:5,cursor:'pointer'}}>
      <i className={`fas ${icon}`} style={{fontSize:22,color:active?activeColor:'rgba(255,255,255,0.7)',transition:'transform 0.15s,color 0.15s',transform:active?'scale(1.15)':'scale(1)'}}/>
      {count!==undefined&&<span style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,0.6)'}}>{count}</span>}
    </div>
  )
}

// ── Right-side Instagram-style action button ──────────────────────────────────
function RightAction({ children, onClick, count, active, activeColor='#FF3366' }) {
  return (
    <div onClick={onClick} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,cursor:'pointer',WebkitTapHighlightColor:'transparent'}}>
      <div style={{
        width:46,height:46,borderRadius:'50%',
        background:'rgba(0,0,0,0.35)',
        backdropFilter:'blur(8px)',
        border:`1.5px solid ${active ? activeColor+'80' : 'rgba(255,255,255,0.15)'}`,
        display:'flex',alignItems:'center',justifyContent:'center',
        transform: active ? 'scale(1.08)' : 'scale(1)',
        transition:'transform 0.15s, border-color 0.15s',
        boxShadow: active ? `0 0 0 3px ${activeColor}22` : 'none',
      }}>
        {children}
      </div>
      {count !== undefined && (
        <span style={{fontSize:11,fontWeight:700,color:'white',textShadow:'0 1px 3px rgba(0,0,0,0.9)',lineHeight:1}}>{count}</span>
      )}
    </div>
  )
}

// ── Service post card — full-screen TikTok style ──────────────────────────────
function ServiceCard({ p, seller, sellerColor, sellerInitial, liked, likes, saved, saves, onLike, onSave, onShare, onComment, onDoubleTap, onChatSeller }) {
  const isVideo   = !!p.video_url
  const hasImages = p.images?.length > 0
  const [muted,   setMuted]   = useState(true)
  const [paused,  setPaused]  = useState(false)
  const [imgIdx,  setImgIdx]  = useState(0)
  const videoRef  = useRef(null)

  useEffect(()=>{
    const v = videoRef.current; if (!v) return
    if (paused) v.pause(); else v.play().catch(()=>{})
  }, [paused])

  useEffect(()=>{
    const v = videoRef.current; if (!v) return
    v.muted = muted
  }, [muted])

  return (
    <div className={`feed-card${paused?' paused':''}`} onDoubleClick={onDoubleTap}>

      {/* ── Full-screen background media ── */}
      {isVideo ? (
        <video ref={videoRef} src={p.video_url} className="feed-media-bg"
          style={{objectFit:'cover',width:'100%',height:'100%'}}
          autoPlay muted={muted} loop playsInline
          onClick={()=>setPaused(x=>!x)}/>
      ) : hasImages ? (
        p.images.length > 1 ? (
          <div className="feed-media-bg"
            style={{display:'flex',overflowX:'auto',scrollSnapType:'x mandatory',scrollbarWidth:'none'}}
            onScroll={e=>setImgIdx(Math.round(e.currentTarget.scrollLeft/e.currentTarget.offsetWidth))}
            onClick={()=>setPaused(x=>!x)}>
            {p.images.map((src,i)=>(
              <img key={i} src={src} alt="" style={{width:'100%',height:'100%',objectFit:'cover',flexShrink:0,scrollSnapAlign:'start'}}/>
            ))}
          </div>
        ) : (
          <img src={p.images[0]} alt="" className="feed-media-bg"
            style={{objectFit:'cover',width:'100%',height:'100%'}}
            onClick={()=>setPaused(x=>!x)}/>
        )
      ) : (
        /* No media — gradient background with service emoji */
        <div className="feed-media-bg" style={{
          background:'linear-gradient(160deg,#1a0a00 0%,#0d0d0d 50%,#0a0014 100%)',
          display:'flex',alignItems:'center',justifyContent:'center'
        }} onClick={()=>setPaused(x=>!x)}>
          <div style={{fontSize:120,opacity:0.15,filter:'blur(2px)'}}>🛠️</div>
        </div>
      )}

      {/* Gradient overlay */}
      <div className="feed-overlay"/>

      {/* Pause indicator */}
      {paused && (
        <div onClick={()=>setPaused(false)} style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',zIndex:18,pointerEvents:'all'}}>
          <div style={{width:64,height:64,borderRadius:'50%',background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
        </div>
      )}

      {/* Multi-image dots */}
      {hasImages && p.images.length > 1 && (
        <div style={{position:'absolute',top:'calc(env(safe-area-inset-top,0px)+60px)',left:0,right:0,display:'flex',justifyContent:'center',gap:4,zIndex:16,pointerEvents:'none'}}>
          {p.images.map((_,i)=>(
            <div key={i} style={{width:i===imgIdx?18:5,height:4,borderRadius:2,background:i===imgIdx?'white':'rgba(255,255,255,0.4)',transition:'all 0.2s'}}/>
          ))}
        </div>
      )}

      {/* Mute toggle for video */}
      {isVideo && (
        <button onClick={e=>{e.stopPropagation();setMuted(m=>!m)}}
          style={{position:'absolute',top:'calc(env(safe-area-inset-top,0px)+60px)',right:14,width:34,height:34,borderRadius:'50%',background:'rgba(0,0,0,0.55)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',zIndex:17}}>
          {muted
            ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
            : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/></svg>
          }
        </button>
      )}

      {/* ── Right side action strip (Instagram-style) ── */}
      <div style={{position:'absolute',right:12,bottom:'calc(var(--nav-h,50px) + var(--safe-bottom,0px) + 90px)',display:'flex',flexDirection:'column',alignItems:'center',gap:20,zIndex:20}}>
        {/* Seller avatar */}
        <div style={{position:'relative',marginBottom:4}}>
          <div style={{width:42,height:42,borderRadius:'50%',background:sellerColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:900,color:'white',border:'2px solid white',boxShadow:'0 2px 8px rgba(0,0,0,0.5)'}}>{sellerInitial}</div>
          <div style={{position:'absolute',bottom:-6,left:'50%',transform:'translateX(-50%)',width:18,height:18,borderRadius:'50%',background:'#F97316',display:'flex',alignItems:'center',justifyContent:'center',border:'1.5px solid #000'}}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="white"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
        </div>
        {/* Like */}
        <RightAction onClick={onLike} count={fmtCount(likes)} active={liked} activeColor="#FF3366">
          <svg width="26" height="26" viewBox="0 0 24 24" fill={liked?'#FF3366':'none'} stroke={liked?'#FF3366':'white'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
        </RightAction>
        {/* Comment */}
        <RightAction onClick={onComment} count={fmtCount(p.comments_count||0)}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        </RightAction>
        {/* Share */}
        <RightAction onClick={onShare}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </RightAction>
        {/* Save */}
        <RightAction onClick={onSave} active={saved} activeColor="#F97316">
          <svg width="22" height="26" viewBox="0 0 24 24" fill={saved?'#F97316':'none'} stroke={saved?'#F97316':'white'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
        </RightAction>
      </div>

      {/* ── Bottom info ── */}
      <div style={{position:'absolute',left:0,right:0,bottom:'calc(var(--nav-h,50px) + var(--safe-bottom,0px))',zIndex:20,padding:'0 14px 12px 14px',paddingRight:70}}>
        {/* Seller row */}
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
          <div style={{width:28,height:28,borderRadius:'50%',background:sellerColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:900,color:'white',flexShrink:0}}>{sellerInitial}</div>
          <span style={{fontSize:13,fontWeight:700,color:'white',textShadow:'0 1px 3px rgba(0,0,0,0.8)'}}>{seller?.full_name||seller?.username||'Seller'}</span>
          {seller?.verified&&<span style={{width:14,height:14,borderRadius:'50%',background:'#3B82F6',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:7,color:'white',fontWeight:900,flexShrink:0}}>✓</span>}
          {/* Service badge */}
          <span style={{fontSize:9,fontWeight:800,padding:'2px 8px',borderRadius:20,background:'rgba(249,115,22,0.85)',color:'white',letterSpacing:0.5,flexShrink:0}}>SERVICE</span>
        </div>
        {/* Title */}
        <div style={{fontSize:15,fontWeight:800,color:'white',marginBottom:3,lineHeight:1.25,textShadow:'0 1px 4px rgba(0,0,0,0.8)',letterSpacing:'-0.3px'}}>{p.title}</div>
        {/* Description */}
        {p.description && <div style={{fontSize:12,color:'rgba(255,255,255,0.7)',marginBottom:6,lineHeight:1.4,textShadow:'0 1px 3px rgba(0,0,0,0.7)',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{p.description}</div>}
        {/* Features */}
        {p.service_features?.filter(f=>f).length > 0 && (
          <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:8}}>
            {p.service_features.filter(f=>f).slice(0,3).map((f,i)=>(
              <span key={i} style={{fontSize:11,fontWeight:600,padding:'3px 9px',borderRadius:20,background:'rgba(249,115,22,0.15)',border:'1px solid rgba(249,115,22,0.35)',color:'#FDBA74',backdropFilter:'blur(4px)'}}>✓ {f}</span>
            ))}
          </div>
        )}
        {/* Price + CTA row */}
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          {p.service_rate ? (
            <div>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.5)',marginBottom:1}}>{{fixed:'Price',hourly:'Per hour',starting_at:'Starting at',negotiable:'Rate'}[p.service_rate_type]||'Rate'}</div>
              <div style={{fontSize:20,fontWeight:900,color:'#FB923C',letterSpacing:'-0.5px',textShadow:'0 1px 4px rgba(0,0,0,0.6)'}}>UGX {Number(p.service_rate).toLocaleString()}</div>
            </div>
          ) : (
            <div style={{fontSize:14,fontWeight:700,color:'#FB923C'}}>Contact for pricing</div>
          )}
          <button onClick={()=>onChatSeller&&onChatSeller()}
            style={{marginLeft:'auto',padding:'10px 18px',background:'linear-gradient(135deg,#F97316,#EF4444)',border:'none',borderRadius:11,color:'white',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 3px 14px rgba(249,115,22,0.5)',whiteSpace:'nowrap',letterSpacing:'-0.2px'}}>
            🔧 Request Service
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main FeedCard — routes by post_type ───────────────────────────────────────
export default function FeedCard({ post: p, currentUser, initialLiked=false, initialSaved=false, distanceKm=null, onOpenComments, onChatSeller }) {
  const [liked,       setLiked]       = useState(initialLiked)
  const [saved,       setSaved]       = useState(initialSaved)
  const [likes,       setLikes]       = useState(p.likes_count||0)
  const [saves,       setSaves]       = useState(p.saves_count||0)
  const [paused,      setPaused]      = useState(false)
  const [following,   setFollowing]   = useState(false)
  const [showHeart,   setShowHeart]   = useState(false)
  const [showReserve, setShowReserve] = useState(false)
  const [showChat,    setShowChat]    = useState(false)
  const [conversation,setConversation]= useState(null)
  const heartTimer = useRef(null)

  const seller      = p.seller || {}
  const sellerColor = avatarColor(seller.id||'')
  const sellerInitial = (seller.full_name||seller.username||'S')[0].toUpperCase()

  const discStr  = discountPct(p.price, p.orig_price)
  const priceStr = formatUGX(p.price)
  const origStr  = p.orig_price ? formatUGX(p.orig_price) : null

  useEffect(()=>{setLiked(initialLiked)},[initialLiked])
  useEffect(()=>{setSaved(initialSaved)},[initialSaved])

  useEffect(()=>()=>clearTimeout(heartTimer.current),[])

  const handleLike = async () => {
    if (!currentUser) return
    const was = liked; setLiked(!was); setLikes(n=>was?n-1:n+1)
    if (was) await unlikePost(p.id,currentUser.id); else await likePost(p.id,currentUser.id)
  }
  const handleSave = async () => {
    if (!currentUser) return
    const was = saved; setSaved(!was); setSaves(n=>was?n-1:n+1)
    if (was) await unsavePost(p.id,currentUser.id); else await savePost(p.id,currentUser.id)
  }
  const handleShare = async () => {
    try { if(navigator.share) await navigator.share({title:p.title||'',url:window.location.href}); else await navigator.clipboard.writeText(window.location.href) } catch{}
    await sharePost(p.id)
  }
  const handleDoubleTap = () => {
    if (!liked) { handleLike() }
    setShowHeart(true)
    clearTimeout(heartTimer.current)
    heartTimer.current = setTimeout(()=>setShowHeart(false), 900)
  }

  const handleBuyNow = async () => {
    if (!currentUser) { return }
    setShowReserve(true)
  }

  const handleChatSeller = async () => {
    if (!currentUser) { return }
    // Create or find conversation
    const { supabase: sb } = await import('../lib/supabase')
    const { data: existing } = await sb.from('conversations')
      .select('*,post:posts(id,title,price,images,emoji,bg_color,condition),buyer_profile:profiles!buyer_id(id,full_name,username,avatar_url,verified),seller_profile:profiles!seller_id(id,full_name,username,avatar_url,verified)')
      .eq('post_id', p.id).eq('buyer_id', currentUser.id).eq('seller_id', p.seller_id).maybeSingle()

    if (existing) { setConversation(existing); setShowChat(true); return }

    const { data: newConvo } = await sb.from('conversations').insert({
      post_id: p.id, buyer_id: currentUser.id, seller_id: p.seller_id,
      last_message: `Hi, I'm interested in ${p.title}`, last_at: new Date().toISOString(),
    }).select('*,post:posts(id,title,price,images,emoji,bg_color,condition),buyer_profile:profiles!buyer_id(id,full_name,username,avatar_url,verified),seller_profile:profiles!seller_id(id,full_name,username,avatar_url,verified)').single()

    if (newConvo) {
      await sb.from('messages').insert({
        conversation_id: newConvo.id,
        sender_id: currentUser.id,
        content: `Hi, I'm interested in ${p.title}. Is it still available?`,
      })
      setConversation(newConvo); setShowChat(true)
    }
  }

  const commonProps = { p, seller, sellerColor, sellerInitial, liked, likes, saved, saves, onLike:handleLike, onSave:handleSave, onShare:handleShare, onComment:()=>onOpenComments&&onOpenComments(p), onDoubleTap:handleDoubleTap }

  // ── Social post ────────────────────────────────────────────────────────
  if (p.post_type === 'social') return (
    <div style={{position:'relative'}}>
      <SocialCard {...commonProps}/>
      {showHeart && <HeartFlash/>}
      {showChat && conversation && <ChatScreen conversation={conversation} currentUser={currentUser} onBack={()=>setShowChat(false)}/>}
    </div>
  )

  // ── Service post ───────────────────────────────────────────────────────
  if (p.post_type === 'service') return (
    <div style={{position:'relative'}}>
      <ServiceCard {...commonProps} onChatSeller={handleChatSeller}/>
      {showHeart && <HeartFlash/>}
      {showChat && conversation && <ChatScreen conversation={conversation} currentUser={currentUser} onBack={()=>setShowChat(false)}/>}
    </div>
  )

  // ── Product post (TikTok full-screen) ──────────────────────────────────
  const videoRef   = useRef(null)
  const [muted,    setMuted]    = useState(true)   // start muted for autoplay policy
  const [imgIdx,   setImgIdx]   = useState(0)

  // Control video play/pause
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (paused) v.pause()
    else v.play().catch(()=>{})
  }, [paused])

  const hasImages  = p.images?.length > 0
  const multiImage = hasImages && p.images.length > 1
  const isVideo    = !!p.video_url

  return (
    <div className={`feed-card${paused?' paused':''}`} onDoubleClick={handleDoubleTap}>
      {/* Background — video > images > color/emoji */}
      {isVideo ? (
        <video
          ref={videoRef}
          src={p.video_url}
          className="feed-media-bg"
          style={{objectFit:'cover', width:'100%', height:'100%'}}
          autoPlay
          muted={muted}
          loop
          playsInline
          onClick={()=>setPaused(x=>!x)}
        />
      ) : hasImages ? (
        multiImage ? (
          /* TikTok-style horizontal scroll for multiple images */
          <div
            className="feed-media-bg"
            style={{display:'flex',overflowX:'auto',scrollSnapType:'x mandatory',scrollbarWidth:'none',WebkitOverflowScrolling:'touch'}}
            onScroll={e=>{
              const idx = Math.round(e.currentTarget.scrollLeft / e.currentTarget.offsetWidth)
              setImgIdx(idx)
            }}
            onClick={()=>setPaused(x=>!x)}
          >
            {p.images.map((src,i)=>(
              <img key={i} src={src} alt="" style={{width:'100%',height:'100%',objectFit:'cover',flexShrink:0,scrollSnapAlign:'start'}}/>
            ))}
          </div>
        ) : (
          <img
            src={p.images[0]}
            alt=""
            className="feed-media-bg"
            style={{objectFit:'cover',width:'100%',height:'100%'}}
            onClick={()=>setPaused(x=>!x)}
          />
        )
      ) : (
        <div className="feed-media-bg" style={{
          background: p.bg_color||'#0d0d0d',
          display:'flex',alignItems:'center',justifyContent:'center'
        }} onClick={()=>setPaused(x=>!x)}>
          {p.emoji && <div className="feed-media-emoji">{p.emoji}</div>}
        </div>
      )}

      <div className="feed-overlay"/>

      {/* Play/pause indicator */}
      {paused && (
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',zIndex:18,pointerEvents:'none'}}>
          <div style={{width:64,height:64,borderRadius:'50%',background:'rgba(0,0,0,0.55)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
        </div>
      )}

      {/* Multi-image indicator dots */}
      {multiImage && (
        <div style={{position:'absolute',top:'calc(env(safe-area-inset-top,0px) + 60px)',left:0,right:0,display:'flex',justifyContent:'center',gap:4,zIndex:16,pointerEvents:'none'}}>
          {p.images.map((_,i)=>(
            <div key={i} style={{width:i===imgIdx?18:5,height:4,borderRadius:2,background:i===imgIdx?'white':'rgba(255,255,255,0.4)',transition:'all 0.2s'}}/>
          ))}
        </div>
      )}

      {/* Sound toggle for video */}
      {isVideo && (
        <button
          onClick={e=>{e.stopPropagation();setMuted(m=>!m)}}
          style={{position:'absolute',top:'calc(env(safe-area-inset-top,0px) + 60px)',right:14,width:34,height:34,borderRadius:'50%',background:'rgba(0,0,0,0.55)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',zIndex:17}}
        >
          {muted
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/></svg>
          }
        </button>
      )}

      {/* Distance badge */}
      {distanceKm!==null&&(
        <div style={{position:'absolute',top:'calc(env(safe-area-inset-top,0px) + 100px)',left:14,display:'inline-flex',alignItems:'center',gap:5,background:'rgba(34,197,94,0.15)',border:'1px solid rgba(34,197,94,0.3)',backdropFilter:'blur(8px)',borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:700,color:'#22C55E',zIndex:16}}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          {fmtDistance(distanceKm)}
        </div>
      )}

      {/* Hot badge */}
      {p.is_hot&&(
        <div style={{position:'absolute',top:'50%',left:14,marginTop:-80,background:'linear-gradient(135deg,#FF3366,#F97316)',borderRadius:20,padding:'4px 12px',fontSize:11,fontWeight:800,color:'white',display:'flex',alignItems:'center',gap:5,zIndex:16,boxShadow:'0 2px 12px rgba(255,51,102,0.4)'}}>
          🔥 Hot Deal
        </div>
      )}

      {/* Right actions — Instagram-style */}
      <div className="feed-actions">
        {/* Seller avatar */}
        <div style={{position:'relative',marginBottom:4}}>
          <div className="feed-action-av" style={{background:sellerColor,width:42,height:42,fontSize:14,fontWeight:900,border:'2px solid white'}}>{sellerInitial}</div>
          <div style={{position:'absolute',bottom:-6,left:'50%',transform:'translateX(-50%)',width:18,height:18,borderRadius:'50%',background:'#FF3366',display:'flex',alignItems:'center',justifyContent:'center',border:'1.5px solid #000'}}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="white"><line x1="12" y1="5" x2="12" y2="19" strokeWidth="2.5" stroke="white"/><line x1="5" y1="12" x2="19" y2="12" strokeWidth="2.5" stroke="white"/></svg>
          </div>
        </div>
        {/* Like */}
        <RightAction onClick={handleLike} count={fmtCount(likes)} active={liked} activeColor="#FF3366">
          <svg width="26" height="26" viewBox="0 0 24 24" fill={liked?'#FF3366':'none'} stroke={liked?'#FF3366':'white'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
        </RightAction>
        {/* Comment */}
        <RightAction onClick={()=>onOpenComments&&onOpenComments(p)} count={fmtCount(p.comments_count||0)}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        </RightAction>
        {/* Save */}
        <RightAction onClick={handleSave} count={fmtCount(saves)} active={saved} activeColor="#FF3366">
          <svg width="22" height="26" viewBox="0 0 24 24" fill={saved?'#FF3366':'none'} stroke={saved?'#FF3366':'white'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
        </RightAction>
        {/* Share */}
        <RightAction onClick={handleShare} count={fmtCount(p.shares_count||0)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </RightAction>
      </div>

      {/* Bottom info */}
      <div className="feed-info">
        {distanceKm===null&&(
          <div className="feed-seller-row">
            <div className="feed-seller-av" style={{background:sellerColor}}>{sellerInitial}</div>
            <span className="feed-seller-name-txt">
              {seller?.full_name||seller?.username||'Seller'}
              {seller?.verified&&<span className="feed-verified">✓</span>}
            </span>
            <button className="feed-follow-btn" onClick={()=>setFollowing(f=>!f)} style={{background:following?'rgba(255,51,102,0.15)':'rgba(255,255,255,0.08)',borderColor:following?'#FF3366':'rgba(255,255,255,0.65)',color:following?'#FF3366':'white'}}>
              {following?'✓ Following':'Follow'}
            </button>
          </div>
        )}
        {p.title&&<div className="feed-product-title">{p.title}</div>}
        {p.description&&<div className="feed-product-desc">{p.description}</div>}
        {priceStr&&(
          <div className="feed-price-row">
            <span className="feed-price">{priceStr}</span>
            {origStr&&<span className="feed-price-orig">{origStr}</span>}
            {discStr&&<span className="feed-price-badge">{discStr}</span>}
          </div>
        )}
        <div className="feed-cta-row">
          <button className="feed-btn-buy" onClick={handleBuyNow}>
            <i className="fas fa-bag-shopping" style={{fontSize:11}}/> Buy Now
          </button>
          <button className="feed-btn-chat" onClick={handleChatSeller}>
            <i className="fas fa-comment" style={{fontSize:11}}/> Chat with Seller
          </button>
        </div>
      </div>

      {showHeart&&<HeartFlash/>}

      {showReserve && (
        <ReservationPage post={p} seller={seller} currentUser={currentUser}
          onBack={()=>setShowReserve(false)}
          onConfirmed={()=>{ setShowReserve(false); handleChatSeller() }}
        />
      )}

      {showChat && conversation && (
        <ChatScreen conversation={conversation} currentUser={currentUser} onBack={()=>setShowChat(false)}/>
      )}
    </div>
  )
}

// ── Double-tap heart flash ────────────────────────────────────────────────────
function HeartFlash() {
  return (
    <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',zIndex:30,pointerEvents:'none'}}>
      <i className="fas fa-heart" style={{fontSize:80,color:'white',filter:'drop-shadow(0 4px 20px rgba(0,0,0,0.5))',animation:'heartPop 0.8s ease forwards'}}/>
      <style>{`@keyframes heartPop{0%{opacity:0;transform:scale(0.3)}30%{opacity:1;transform:scale(1.2)}60%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.1)}}`}</style>
    </div>
  )
}
