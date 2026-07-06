import { useState, useEffect, useRef } from 'react'
import { formatUGX, discountPct, fmtCount, fmtDistance, likePost, unlikePost, savePost, unsavePost, sharePost, recordView } from '../lib/feed'

// ── Deterministic avatar colour ───────────────────────────────────────────────
function avatarColor(id=''){const C=['#7C3AED','#FF3366','#F97316','#22C55E','#3B82F6','#EC4899','#F59E0B','#06B6D4'];return C[id.split('').reduce((a,c)=>a+c.charCodeAt(0),0)%C.length]}

// ── Social post — Instagram-style card with caption above media ───────────────
function SocialCard({ p, seller, sellerColor, sellerInitial, liked, likes, saved, saves, onLike, onSave, onShare, onComment, onDoubleTap }) {
  const isVideo = !!p.video_url
  const hasImages = p.images?.length > 0
  const [imgIdx, setImgIdx] = useState(0)

  return (
    <div className={`feed-card`} onDoubleClick={onDoubleTap} style={{height:'auto',minHeight:'100dvh',display:'flex',flexDirection:'column',background:'#000'}}>
      {/* Seller header */}
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',paddingTop:'calc(env(safe-area-inset-top,0px) + 56px)'}}>
        <div style={{width:34,height:34,borderRadius:'50%',background:sellerColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:900,color:'white',flexShrink:0}}>{sellerInitial}</div>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:700,display:'flex',alignItems:'center',gap:5}}>
            {seller?.full_name||seller?.username||'User'}
            {seller?.verified&&<span style={{width:13,height:13,borderRadius:'50%',background:'#3B82F6',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:7,color:'white',fontWeight:900}}>✓</span>}
          </div>
          <div style={{fontSize:11,color:'#71717A'}}>Just now</div>
        </div>
        <button style={{background:'none',border:'none',cursor:'pointer',color:'#71717A',padding:4}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
        </button>
      </div>

      {/* Caption above media */}
      {p.caption && (
        <div style={{padding:'0 14px 10px',fontSize:15,color:'rgba(255,255,255,0.9)',lineHeight:1.55}}>
          {p.caption}
        </div>
      )}

      {/* Media */}
      {(hasImages || isVideo) && (
        <div style={{width:'100%',aspectRatio:'1',background:'#0a0a0a',position:'relative',overflow:'hidden',flexShrink:0}}>
          {isVideo
            ? <video src={p.video_url} style={{width:'100%',height:'100%',objectFit:'cover'}} muted loop autoPlay playsInline/>
            : <img src={p.images[imgIdx]} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
          }
          {/* Multi-image counter */}
          {p.images?.length > 1 && (
            <div style={{position:'absolute',top:10,right:10,background:'rgba(0,0,0,0.6)',borderRadius:20,padding:'3px 8px',fontSize:11,fontWeight:700,color:'white'}}>{imgIdx+1}/{p.images.length}</div>
          )}
          {/* Dot nav */}
          {p.images?.length > 1 && (
            <div style={{position:'absolute',bottom:10,left:0,right:0,display:'flex',justifyContent:'center',gap:5}}>
              {p.images.map((_,i)=>(
                <div key={i} onClick={()=>setImgIdx(i)} style={{width:i===imgIdx?18:5,height:5,borderRadius:3,background:i===imgIdx?'white':'rgba(255,255,255,0.35)',cursor:'pointer',transition:'all 0.2s'}}/>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{padding:'10px 14px 6px',display:'flex',alignItems:'center',gap:16}}>
        <ActionBtn icon="fa-heart" active={liked} activeColor="#FF3366" count={fmtCount(likes)} onClick={onLike}/>
        <ActionBtn icon="fa-comment" count={fmtCount(p.comments_count||0)} onClick={onComment}/>
        <ActionBtn icon="fa-share-nodes" onClick={onShare}/>
        <div style={{marginLeft:'auto'}}><ActionBtn icon={`fa-bookmark${saved?' liked':''}`} onClick={onSave}/></div>
      </div>

      {/* Location */}
      {p.location && <div style={{padding:'0 14px 10px',fontSize:11,color:'#52525B',display:'flex',alignItems:'center',gap:4}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>{p.location}</div>}
    </div>
  )
}

// ── Inline action button ──────────────────────────────────────────────────────
function ActionBtn({ icon, active, activeColor='#FF3366', count, onClick }) {
  return (
    <div onClick={onClick} style={{display:'flex',alignItems:'center',gap:5,cursor:'pointer'}}>
      <i className={`fas ${icon}`} style={{fontSize:22,color:active?activeColor:'rgba(255,255,255,0.7)',transition:'transform 0.15s,color 0.15s',transform:active?'scale(1.15)':'scale(1)'}}/>
      {count!==undefined&&<span style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,0.6)'}}>{count}</span>}
    </div>
  )
}

// ── Service post card ─────────────────────────────────────────────────────────
function ServiceCard({ p, seller, sellerColor, sellerInitial, liked, likes, saved, saves, onLike, onSave, onShare, onComment, onDoubleTap, showToast }) {
  const hasImage = p.images?.[0]
  return (
    <div className="feed-card" onDoubleClick={onDoubleTap} style={{height:'auto',minHeight:'100dvh',display:'flex',flexDirection:'column',background:'#000'}}>
      {/* Seller header */}
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',paddingTop:'calc(env(safe-area-inset-top,0px) + 56px)'}}>
        <div style={{width:34,height:34,borderRadius:'50%',background:sellerColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:900,color:'white',flexShrink:0}}>{sellerInitial}</div>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:700,display:'flex',alignItems:'center',gap:5}}>
            {seller?.full_name||seller?.username||'User'}
            {seller?.verified&&<span style={{width:13,height:13,borderRadius:'50%',background:'#3B82F6',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:7,color:'white',fontWeight:900}}>✓</span>}
          </div>
          <div style={{fontSize:11,color:'#71717A'}}>Just now</div>
        </div>
        <button style={{background:'none',border:'none',cursor:'pointer',color:'#71717A',padding:4}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg></button>
      </div>

      {/* Service badge + title */}
      <div style={{padding:'0 14px 10px'}}>
        <div style={{display:'inline-flex',alignItems:'center',gap:5,background:'rgba(249,115,22,0.12)',border:'1px solid rgba(249,115,22,0.25)',borderRadius:20,padding:'3px 10px',fontSize:10,fontWeight:700,color:'#F97316',marginBottom:8}}>
          SERVICE
        </div>
        <div style={{fontSize:18,fontWeight:800,lineHeight:1.25,marginBottom:6,letterSpacing:'-0.4px'}}>{p.title}</div>
        {p.description && <div style={{fontSize:13,color:'rgba(255,255,255,0.55)',lineHeight:1.5}}>{p.description}</div>}
      </div>

      {/* Portfolio image */}
      {hasImage && (
        <div style={{margin:'0 14px 12px',borderRadius:14,overflow:'hidden',aspectRatio:'16/9',background:'#0a0a0a',flexShrink:0}}>
          <img src={p.images[0]} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
        </div>
      )}

      {/* Features row */}
      {p.service_features?.filter(f=>f).length > 0 && (
        <div style={{display:'flex',gap:0,padding:'0 14px 12px'}}>
          {p.service_features.filter(f=>f).slice(0,3).map((f,i,arr)=>(
            <div key={i} style={{flex:1,textAlign:'center',padding:'10px 6px',borderRight:i<arr.length-1?'1px solid rgba(255,255,255,0.07)':'none',display:'flex',flexDirection:'column',gap:4}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" style={{margin:'0 auto'}}><path d="M20 6L9 17l-5-5"/></svg>
              <div style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.7)',lineHeight:1.3}}>{f}</div>
            </div>
          ))}
        </div>
      )}

      {/* Price + CTA */}
      <div style={{padding:'0 14px 12px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
        <div>
          {p.service_rate ? (
            <>
              <div style={{fontSize:11,color:'#71717A',marginBottom:2}}>{{fixed:'Price',hourly:'Per hour',starting_at:'Starting at',negotiable:'Rate'}[p.service_rate_type]||'Rate'}</div>
              <div style={{fontSize:22,fontWeight:900,color:'#F97316',letterSpacing:'-0.5px'}}>UGX {Number(p.service_rate).toLocaleString()}</div>
            </>
          ) : (
            <div style={{fontSize:15,fontWeight:700,color:'#F97316'}}>Contact for pricing</div>
          )}
        </div>
        <button onClick={()=>showToast('💼 Requesting service...')} style={{padding:'11px 20px',background:'linear-gradient(135deg,#F97316,#EF4444)',border:'none',borderRadius:12,color:'white',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 3px 14px rgba(249,115,22,0.4)',whiteSpace:'nowrap'}}>
          Request Service
        </button>
      </div>

      {/* Actions */}
      <div style={{padding:'6px 14px 10px',display:'flex',alignItems:'center',gap:16,borderTop:'1px solid rgba(255,255,255,0.05)'}}>
        <ActionBtn icon="fa-heart" active={liked} activeColor="#FF3366" count={fmtCount(likes)} onClick={onLike}/>
        <ActionBtn icon="fa-comment" count={fmtCount(p.comments_count||0)} onClick={onComment}/>
        <ActionBtn icon="fa-share-nodes" onClick={onShare}/>
        <div style={{marginLeft:'auto'}}><ActionBtn icon="fa-bookmark" active={saved} activeColor="#FF3366" onClick={onSave}/></div>
      </div>
    </div>
  )
}

// ── Main FeedCard — routes by post_type ───────────────────────────────────────
export default function FeedCard({ post: p, currentUser, initialLiked=false, initialSaved=false, distanceKm=null, onOpenComments, onChatSeller }) {
  const [liked,    setLiked]    = useState(initialLiked)
  const [saved,    setSaved]    = useState(initialSaved)
  const [likes,    setLikes]    = useState(p.likes_count||0)
  const [saves,    setSaves]    = useState(p.saves_count||0)
  const [paused,   setPaused]   = useState(false)
  const [following,setFollowing]= useState(false)
  const [showHeart,setShowHeart]= useState(false)
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

  const commonProps = { p, seller, sellerColor, sellerInitial, liked, likes, saved, saves, onLike:handleLike, onSave:handleSave, onShare:handleShare, onComment:()=>onOpenComments&&onOpenComments(p), onDoubleTap:handleDoubleTap }

  // ── Social post ────────────────────────────────────────────────────────
  if (p.post_type === 'social') return (
    <div style={{position:'relative'}}>
      <SocialCard {...commonProps}/>
      {showHeart && <HeartFlash/>}
    </div>
  )

  // ── Service post ───────────────────────────────────────────────────────
  if (p.post_type === 'service') return (
    <div style={{position:'relative'}}>
      <ServiceCard {...commonProps} showToast={()=>{}}/>
      {showHeart && <HeartFlash/>}
    </div>
  )

  // ── Product post (TikTok full-screen) ──────────────────────────────────
  return (
    <div className={`feed-card${paused?' paused':''}`} onDoubleClick={handleDoubleTap}>
      {/* Background */}
      <div className="feed-media-bg" style={{background:p.bg_color||'#0d0d0d',backgroundImage:p.images?.[0]?`url(${p.images[0]})`:'none',backgroundSize:'cover',backgroundPosition:'center'}} onClick={()=>setPaused(x=>!x)}>
        {!p.images?.[0]&&p.emoji&&<div className="feed-media-emoji">{p.emoji}</div>}
      </div>
      <div className="feed-overlay"/>
      <div className="feed-play"><i className="fas fa-play"/></div>

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

      {/* Right actions */}
      <div className="feed-actions">
        <div className="feed-action-btn" onClick={handleLike}>
          <i className={`fas fa-heart${liked?' liked':''}`} style={{transition:'transform 0.15s,color 0.15s',transform:liked?'scale(1.2)':'scale(1)'}}/>
          <span className="feed-action-count">{fmtCount(likes)}</span>
        </div>
        <div className="feed-action-btn" onClick={()=>onOpenComments&&onOpenComments(p)}>
          <i className="fas fa-comment"/>
          <span className="feed-action-count">{fmtCount(p.comments_count||0)}</span>
        </div>
        <div className="feed-action-btn" onClick={handleSave}>
          <i className={`fas fa-bookmark${saved?' saved':''}`} style={{transition:'transform 0.15s,color 0.15s',transform:saved?'scale(1.2)':'scale(1)'}}/>
          <span className="feed-action-count">{fmtCount(saves)}</span>
        </div>
        <div className="feed-action-btn" onClick={handleShare}>
          <i className="fas fa-share-nodes"/>
          <span className="feed-action-count">{fmtCount(p.shares_count||0)}</span>
        </div>
        <div className="feed-action-btn" onClick={()=>{}}>
          <div className="feed-action-av" style={{background:sellerColor}}>{sellerInitial}</div>
        </div>
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
          <button className="feed-btn-buy" onClick={()=>{}}>
            <i className="fas fa-bag-shopping" style={{fontSize:11}}/> Buy Now
          </button>
          <button className="feed-btn-chat" onClick={()=>onChatSeller&&onChatSeller(p,seller)}>
            <i className="fas fa-comment" style={{fontSize:11}}/> Chat with Seller
          </button>
        </div>
      </div>

      {showHeart&&<HeartFlash/>}
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
