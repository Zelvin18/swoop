import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { formatUGX, discountPct, fmtDistance, likePost, unlikePost, savePost, unsavePost, sharePost } from '../lib/feed'
import { getFilterCSS } from '../lib/mediaFilters'
import { supabase } from '../lib/supabase'
import { getGlobalMuted, toggleGlobalMuted, subscribeToMuteState, registerMediaElement } from '../lib/globalAudio'
import ReservationPage    from './ReservationPage'
import ChatScreen         from './ChatScreen'
import UserProfileView    from './UserProfileView'
import FeedActionRail, { FeedSellerRow, FeedMusicPill } from './FeedActions'
import OverlayPortal      from './OverlayPortal'

// ── Deterministic avatar colour ───────────────────────────────────────────────
function avatarColor(id=''){const C=['#7C3AED','#FF3366','#F97316','#22C55E','#3B82F6','#EC4899','#F59E0B','#06B6D4'];return C[id.split('').reduce((a,c)=>a+c.charCodeAt(0),0)%C.length]}
// ── Global unmute manager — fires when user presses phone volume up ───────────
let globalMuteCallbacks = []
let _globalListenerAttached = false

function registerVideoForUnmute(cb) {
  // Attach the document listener lazily, only in the browser, only once
  if (typeof window !== 'undefined' && !_globalListenerAttached) {
    _globalListenerAttached = true
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('seekforward', null)
        navigator.mediaSession.setActionHandler('seekbackward', null)
      } catch(_) {}
    }
    document.addEventListener('volumechange', () => {
      globalMuteCallbacks.forEach(cb => cb())
    }, true)
  }
  globalMuteCallbacks.push(cb)
  return () => { globalMuteCallbacks = globalMuteCallbacks.filter(f => f !== cb) }
}

// ── Social post — full-screen Instagram Reels style ───────────────────────────
function SocialCard({ p, seller, sellerColor, sellerInitial, liked, likes, saved, saves, onLike, onSave, onShare, onComment, onDoubleTap, onSellerTap, following, followLoading, onFollow, canFollow }) {
  const router = useRouter()
  const isVideo   = !!p.video_url
  const hasImages = p.images?.length > 0
  const filterCSS = getFilterCSS(p.filter_name)
  const [imgIdx,  setImgIdx]  = useState(0)
  const [paused,  setPaused]  = useState(false)
  const [muted,   setMuted]   = useState(getGlobalMuted())
  const [musicPlaying, setMusicPlaying] = useState(false)
  const [slideshowActive, setSlideshowActive] = useState(false)
  const videoRef  = useRef(null)
  const audioRef  = useRef(null)
  const cardRef   = useRef(null)
  const slideshowTimerRef = useRef(null)

  // Subscribe to global mute state changes
  useEffect(() => {
    const unsubscribe = subscribeToMuteState((newMuted) => {
      setMuted(newMuted)
      // Apply to video element
      if (videoRef.current) {
        videoRef.current.muted = newMuted
      }
      // Apply to audio element
      if (audioRef.current) {
        audioRef.current.muted = newMuted
      }
    })
    return unsubscribe
  }, [])

  // Play/pause control
  useEffect(() => {
    const v = videoRef.current; if (!v) return
    if (paused) v.pause(); else v.play().catch(()=>{})
  }, [paused])

  // Slideshow for multiple images
  useEffect(() => {
    if (!hasImages || p.images.length <= 1 || !slideshowActive) {
      if (slideshowTimerRef.current) {
        clearInterval(slideshowTimerRef.current)
        slideshowTimerRef.current = null
      }
      return
    }

    // Get clip durations from metadata or default to 3 seconds
    const clipDurations = p.clip_durations || {}
    const getDuration = (idx) => clipDurations[idx] || 3

    const interval = setInterval(() => {
      setImgIdx(prev => {
        const nextIdx = (prev + 1) % p.images.length
        return nextIdx
      })
    }, getDuration(imgIdx) * 1000)

    slideshowTimerRef.current = interval

    return () => {
      if (slideshowTimerRef.current) {
        clearInterval(slideshowTimerRef.current)
        slideshowTimerRef.current = null
      }
    }
  }, [hasImages, p.images.length, slideshowActive, imgIdx, p.clip_durations])

  // Volume key → unmute via global manager + video volumechange
  useEffect(() => {
    const v = videoRef.current; if (!v) return
    const a = audioRef.current
    // Register for global unmute (volume up button)
    const unregister = registerVideoForUnmute(() => {
      if (document.hidden) return
      // Only unmute the video that is currently most visible
      const card = cardRef.current
      if (!card) return
      const rect = card.getBoundingClientRect()
      const visible = rect.top >= -rect.height * 0.4 && rect.top <= window.innerHeight * 0.6
      if (visible) { 
        v.muted = false; setMuted(false)
        // Also unmute audio if playing
        if (a && !isVideo) {
          a.muted = false
        }
      }
    })
    // Also listen directly on the video element
    const onVolChange = () => { if (!document.hidden && !v.muted) setMuted(false) }
    v.addEventListener('volumechange', onVolChange)
    return () => { unregister(); v.removeEventListener('volumechange', onVolChange) }
  }, [isVideo])

  // IntersectionObserver — pause when scrolled away, respect global mute
  useEffect(() => {
    const v = videoRef.current; const a = audioRef.current; const card = cardRef.current
    if (!card) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        if (v) { 
          v.play().catch(()=>{}); 
          setPaused(false)
          v.muted = muted
        }
        if (a && p.music_file_url && !isVideo) { 
          a.play().catch(()=>{}); 
          setMusicPlaying(true)
          a.muted = muted
        }
        // Start slideshow for multiple images
        if (hasImages && p.images.length > 1 && !isVideo) {
          setSlideshowActive(true)
        }
      } else {
        if (v) { v.pause() }
        if (a) { a.pause(); setMusicPlaying(false) }
        setSlideshowActive(false)
      }
    }, { threshold: 0.6 })
    obs.observe(card)
    return () => obs.disconnect()
  }, [isVideo, p.music_file_url, hasImages, p.images.length, muted])

  return (
    <div ref={cardRef} className="feed-card" onDoubleClick={onDoubleTap}
      style={{position:'relative'}}
      onClick={()=>{ 
        if(muted){ 
          // Unmute globally - affects all posts in feed
          toggleGlobalMuted()
        } else if (!isVideo && p.music_file_url){ 
          // Toggle music play/pause for image posts
          const a=audioRef.current; 
          if(a){ 
            if(musicPlaying){
              a.pause();setMusicPlaying(false)
            }else{
              a.play().catch(()=>{});setMusicPlaying(true)
            } 
          } 
        } 
      }}
    >
      {/* Hidden audio element for music */}
      {p.music_file_url && !isVideo && (
        <audio
          ref={audioRef}
          src={p.music_file_url}
          loop
          style={{display:'none'}}
          onPlay={()=>setMusicPlaying(true)}
          onPause={()=>setMusicPlaying(false)}
        />
      )}

      {/* ── Full-screen media ── */}
      {isVideo ? (
        <video ref={videoRef} src={p.video_url}
          className="feed-media-bg" style={{objectFit:'cover',width:'100%',height:'100%',filter:filterCSS||undefined}}
          autoPlay muted={muted} loop playsInline
          onClick={()=>setPaused(x=>!x)}/>
      ) : hasImages ? (
        <>
          {p.images.length > 1 ? (
            <div className="feed-media-bg"
              style={{display:'flex',overflowX:'auto',scrollSnapType:'x mandatory',scrollbarWidth:'none'}}
              onScroll={e=>setImgIdx(Math.round(e.currentTarget.scrollLeft/e.currentTarget.offsetWidth))}>
              {p.images.map((src,i)=>(
                <img key={i} src={src} alt="" style={{width:'100%',height:'100%',objectFit:'cover',flexShrink:0,scrollSnapAlign:'start',filter:filterCSS||undefined}}/>
              ))}
            </div>
          ) : (
            <img src={p.images[0]} alt="" className="feed-media-bg" style={{objectFit:'cover',width:'100%',height:'100%',filter:filterCSS||undefined}}/>
          )}
          {p.images.length > 1 && <>
            <div style={{position:'absolute',top:10,right:10,background:'rgba(0,0,0,0.55)',borderRadius:20,padding:'3px 8px',fontSize:11,fontWeight:700,color:'white',zIndex:16}}>{imgIdx+1}/{p.images.length}</div>
            <div style={{position:'absolute',bottom:'calc(var(--nav-h,50px) + var(--safe-bottom,0px) + 150px)',left:0,right:0,display:'flex',justifyContent:'center',gap:5,zIndex:16,pointerEvents:'none'}}>
              {p.images.map((_,i)=>(
                <div key={i} style={{width:i===imgIdx?20:5,height:4,borderRadius:2,background:i===imgIdx?'white':'rgba(255,255,255,0.45)',transition:'all 0.25s'}}/>
              ))}
            </div>
          </>}
        </>
      ) : (
        <div className="feed-media-bg" style={{background:'linear-gradient(160deg,#0d001a,#0d0d0d)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{fontSize:130,opacity:0.1,filter:'blur(1px)'}}>✨</div>
        </div>
      )}

      <div className="feed-overlay"/>

      {/* Pause icon — transparent, floats over media */}
      {paused && isVideo && (
        <div onClick={()=>setPaused(false)} style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',zIndex:18,cursor:'pointer',pointerEvents:'all'}}>
          <svg width="52" height="52" viewBox="0 0 24 24" fill="rgba(255,255,255,0.85)" style={{filter:'drop-shadow(0 2px 12px rgba(0,0,0,0.7))'}}>
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
        </div>
      )}


      {/* Music pill - Instagram style at top-left */}
      {(p.music_title || p.music_artist || p.music_file_url) && (
        <div 
          onClick={(e) => {
            e.stopPropagation()
            // Navigate to music page using music_id or encoded music_file_url as identifier
            const musicId = p.music_id || (p.music_file_url ? encodeURIComponent(p.music_file_url) : null)
            if (musicId) {
              router.push(`/music/${musicId}`)
            }
          }}
          style={{
            position:'absolute',
            top:isVideo ? 'calc(env(safe-area-inset-top,0px)+12px)' : 'calc(env(safe-area-inset-top,0px)+12px)',
            left:12,
            width:44,
            height:44,
            borderRadius:12,
            background:'rgba(0,0,0,0.6)',
            backdropFilter:'blur(8px)',
            border:'1px solid rgba(255,255,255,0.2)',
            cursor:'pointer',
            zIndex:18,
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
            boxShadow:'0 4px 12px rgba(0,0,0,0.3)',
            overflow:'hidden'
          }}
        >
          {/* Album art / music icon */}
          {p.music_album_art ? (
            <img 
              src={p.music_album_art} 
              alt="Album art"
              style={{
                width:36,
                height:36,
                borderRadius:10,
                objectFit:'cover',
                animation:musicPlaying ? 'spin 3s linear infinite' : 'none'
              }}
            />
          ) : (
            <div style={{
              width:36,
              height:36,
              borderRadius:10,
              background:'linear-gradient(135deg,#FF3366,#F97316)',
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              animation:musicPlaying ? 'spin 3s linear infinite' : 'none'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white" style={{animation:musicPlaying ? 'pulse 1s ease-in-out infinite' : 'none'}}>
                <path d="M9 18V5l12-2v13"/>
                <circle cx="6" cy="18" r="3"/>
                <circle cx="18" cy="16" r="3"/>
              </svg>
            </div>
          )}
          {/* Playing indicator dot */}
          {musicPlaying && (
            <div style={{
              position:'absolute',
              bottom:6,
              right:6,
              width:8,
              height:8,
              borderRadius:'50%',
              background:'#22C55E',
              border:'2px solid white',
              boxShadow:'0 2px 4px rgba(0,0,0,0.3)'
            }}/>
          )}
        </div>
      )}

      <FeedActionRail
        liked={liked} likes={likes} comments={p.comments_count||0}
        saved={saved} saves={saves}
        onLike={onLike} onComment={onComment} onShare={onShare} onSave={onSave}
      />

      {/* ── Bottom info ── */}
      <div className="feed-info">
        <FeedSellerRow
          seller={seller} sellerColor={sellerColor} sellerInitial={sellerInitial}
          following={following} followLoading={followLoading} onFollow={onFollow}
          onSellerTap={onSellerTap} showFollow={canFollow}
        />
        {p.caption && <div style={{fontSize:14,color:'rgba(255,255,255,0.92)',lineHeight:1.5,textShadow:'0 1px 4px rgba(0,0,0,0.8)',marginBottom:5,display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{p.caption}</div>}
        {p.location && <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',display:'flex',alignItems:'center',gap:4,marginTop:3}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>{p.location}</div>}
      </div>
    </div>
  )
}

// ── Service post card — full-screen TikTok style ──────────────────────────────
function ServiceCard({ p, seller, sellerColor, sellerInitial, liked, likes, saved, saves, onLike, onSave, onShare, onComment, onDoubleTap, onChatSeller, onSellerTap, following, followLoading, onFollow, canFollow }) {
  const router = useRouter()
  const isVideo   = !!p.video_url
  const hasImages = p.images?.length > 0
  const filterCSS = getFilterCSS(p.filter_name)
  const [muted,   setMuted]   = useState(getGlobalMuted())
  const [paused,  setPaused]  = useState(false)
  const [imgIdx,  setImgIdx]  = useState(0)
  const [musicPlaying, setMusicPlaying] = useState(false)
  const [slideshowActive, setSlideshowActive] = useState(false)
  const videoRef  = useRef(null)
  const audioRef  = useRef(null)
  const cardRef   = useRef(null)
  const slideshowTimerRef = useRef(null)

  // Subscribe to global mute state changes
  useEffect(() => {
    const unsubscribe = subscribeToMuteState((newMuted) => {
      setMuted(newMuted)
      // Apply to video element
      if (videoRef.current) {
        videoRef.current.muted = newMuted
      }
      // Apply to audio element
      if (audioRef.current) {
        audioRef.current.muted = newMuted
      }
    })
    return unsubscribe
  }, [])

  useEffect(()=>{
    const v = videoRef.current; if (!v) return
    if (paused) v.pause(); else v.play().catch(()=>{})
  }, [paused])

  // Slideshow for multiple images
  useEffect(() => {
    if (!hasImages || p.images.length <= 1 || !slideshowActive) {
      if (slideshowTimerRef.current) {
        clearInterval(slideshowTimerRef.current)
        slideshowTimerRef.current = null
      }
      return
    }

    const clipDurations = p.clip_durations || {}
    const getDuration = (idx) => clipDurations[idx] || 3

    const interval = setInterval(() => {
      setImgIdx(prev => {
        const nextIdx = (prev + 1) % p.images.length
        return nextIdx
      })
    }, getDuration(imgIdx) * 1000)

    slideshowTimerRef.current = interval

    return () => {
      if (slideshowTimerRef.current) {
        clearInterval(slideshowTimerRef.current)
        slideshowTimerRef.current = null
      }
    }
  }, [hasImages, p.images.length, slideshowActive, imgIdx, p.clip_durations])

  // Volume key → unmute via global manager
  useEffect(()=>{
    const v = videoRef.current; if (!v) return
    const unregister = registerVideoForUnmute(() => {
      if (document.hidden) return
      const card = cardRef.current; if (!card) return
      const rect = card.getBoundingClientRect()
      const visible = rect.top >= -rect.height * 0.4 && rect.top <= window.innerHeight * 0.6
      if (visible) { 
        toggleGlobalMuted()
      }
    })
    const onVolChange = () => { if (!document.hidden && !v.muted) setMuted(false) }
    v.addEventListener('volumechange', onVolChange)
    return () => { unregister(); v.removeEventListener('volumechange', onVolChange) }
  }, [])

  // Scroll away → pause, respect global mute
  useEffect(()=>{
    const v = videoRef.current; const a = audioRef.current; const card = cardRef.current
    if (!card) return
    const obs = new IntersectionObserver(([e])=>{
      if (e.isIntersecting) {
        if (v) { 
          v.play().catch(()=>{}); 
          setPaused(false)
          v.muted = muted
        }
        if (a && p.music_file_url && !isVideo) { 
          a.play().catch(()=>{}); 
          setMusicPlaying(true)
          a.muted = muted
        }
        // Start slideshow for multiple images
        if (hasImages && p.images.length > 1 && !isVideo) {
          setSlideshowActive(true)
        }
      } else {
        if (v) { v.pause() }
        if (a) { a.pause(); setMusicPlaying(false) }
        setSlideshowActive(false)
      }
    }, { threshold:0.6 })
    obs.observe(card)
    return () => obs.disconnect()
  }, [isVideo, p.music_file_url, hasImages, p.images.length, muted])

  return (
    <div ref={cardRef} className={`feed-card${paused?' paused':''}`} onDoubleClick={onDoubleTap}
      onClick={()=>{ 
        if(muted){ 
          // Unmute globally - affects all posts in feed
          toggleGlobalMuted()
        } else if (!isVideo && p.music_file_url){ 
          // Toggle music play/pause for image posts
          const a=audioRef.current; 
          if(a){ 
            if(musicPlaying){
              a.pause();setMusicPlaying(false)
            }else{
              a.play().catch(()=>{});setMusicPlaying(true)
            } 
          } 
        } 
      }}
    >
      {/* Hidden audio element for music */}
      {p.music_file_url && !isVideo && (
        <audio
          ref={audioRef}
          src={p.music_file_url}
          loop
          style={{display:'none'}}
          onPlay={()=>setMusicPlaying(true)}
          onPause={()=>setMusicPlaying(false)}
        />
      )}

      {/* ── Full-screen background media ── */}
      {isVideo ? (
        <video ref={videoRef} src={p.video_url} className="feed-media-bg"
          style={{objectFit:'cover',width:'100%',height:'100%',filter:filterCSS||undefined}}
          autoPlay muted={muted} loop playsInline onClick={()=>setPaused(x=>!x)}/>
      ) : hasImages ? (
        p.images.length > 1 ? (
          <div className="feed-media-bg"
            style={{display:'flex',overflowX:'auto',scrollSnapType:'x mandatory',scrollbarWidth:'none'}}
            onScroll={e=>setImgIdx(Math.round(e.currentTarget.scrollLeft/e.currentTarget.offsetWidth))}
            onClick={()=>setPaused(x=>!x)}>
            {p.images.map((src,i)=>(
              <img key={i} src={src} alt="" style={{width:'100%',height:'100%',objectFit:'cover',flexShrink:0,scrollSnapAlign:'start',filter:filterCSS||undefined}}/>
            ))}
          </div>
        ) : (
          <img src={p.images[0]} alt="" className="feed-media-bg"
            style={{objectFit:'cover',width:'100%',height:'100%',filter:filterCSS||undefined}} onClick={()=>setPaused(x=>!x)}/>
        )
      ) : (
        <div className="feed-media-bg" style={{background:'#0d0d0d',display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setPaused(x=>!x)}>
          <div style={{fontSize:130,opacity:0.1,filter:'blur(1px)'}}>{p.emoji||'📦'}</div>
        </div>
      )}

      <div className="feed-overlay"/>

      {/* Pause icon */}
      {paused && isVideo && (
        <div onClick={()=>setPaused(false)} style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',zIndex:18,cursor:'pointer',pointerEvents:'all'}}>
          <svg width="52" height="52" viewBox="0 0 24 24" fill="rgba(255,255,255,0.85)" style={{filter:'drop-shadow(0 2px 12px rgba(0,0,0,0.7))'}}>
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
        </div>
      )}

      {/* Multi-image dots */}
      {hasImages && p.images.length > 1 && (
        <div style={{position:'absolute',top:'calc(env(safe-area-inset-top,0px)+60px)',left:0,right:0,display:'flex',justifyContent:'center',gap:4,zIndex:16,pointerEvents:'none'}}>
          {p.images.map((_,i)=>(
            <div key={i} style={{width:i===imgIdx?20:5,height:4,borderRadius:2,background:i===imgIdx?'white':'rgba(255,255,255,0.45)',transition:'all 0.25s'}}/>
          ))}
        </div>
      )}


      {/* Music pill - Instagram style at top-left */}
      {(p.music_title || p.music_artist || p.music_file_url) && (
        <div 
          onClick={(e) => {
            e.stopPropagation()
            // Navigate to music page using music_id or encoded music_file_url as identifier
            const musicId = p.music_id || (p.music_file_url ? encodeURIComponent(p.music_file_url) : null)
            if (musicId) {
              router.push(`/music/${musicId}`)
            }
          }}
          style={{
            position:'absolute',
            top:isVideo ? 'calc(env(safe-area-inset-top,0px)+12px)' : 'calc(env(safe-area-inset-top,0px)+12px)',
            left:12,
            width:44,
            height:44,
            borderRadius:12,
            background:'rgba(0,0,0,0.6)',
            backdropFilter:'blur(8px)',
            border:'1px solid rgba(255,255,255,0.2)',
            cursor:'pointer',
            zIndex:18,
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
            boxShadow:'0 4px 12px rgba(0,0,0,0.3)',
            overflow:'hidden'
          }}
        >
          {/* Album art / music icon */}
          {p.music_album_art ? (
            <img 
              src={p.music_album_art} 
              alt="Album art"
              style={{
                width:36,
                height:36,
                borderRadius:10,
                objectFit:'cover',
                animation:musicPlaying ? 'spin 3s linear infinite' : 'none'
              }}
            />
          ) : (
            <div style={{
              width:36,
              height:36,
              borderRadius:10,
              background:'linear-gradient(135deg,#FF3366,#F97316)',
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              animation:musicPlaying ? 'spin 3s linear infinite' : 'none'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white" style={{animation:musicPlaying ? 'pulse 1s ease-in-out infinite' : 'none'}}>
                <path d="M9 18V5l12-2v13"/>
                <circle cx="6" cy="18" r="3"/>
                <circle cx="18" cy="16" r="3"/>
              </svg>
            </div>
          )}
          {/* Playing indicator dot */}
          {musicPlaying && (
            <div style={{
              position:'absolute',
              bottom:6,
              right:6,
              width:8,
              height:8,
              borderRadius:'50%',
              background:'#22C55E',
              border:'2px solid white',
              boxShadow:'0 2px 4px rgba(0,0,0,0.3)'
            }}/>
          )}
        </div>
      )}

      <FeedActionRail
        liked={liked} likes={likes} comments={p.comments_count||0}
        saved={saved} saves={saves}
        onLike={onLike} onComment={onComment} onShare={onShare} onSave={onSave}
      />

      <div className="feed-info">
        <FeedSellerRow
          seller={seller} sellerColor={sellerColor} sellerInitial={sellerInitial}
          following={following} followLoading={followLoading} onFollow={onFollow}
          onSellerTap={onSellerTap} showFollow={canFollow}
          badge={<span style={{fontSize:9,fontWeight:800,padding:'2px 7px',borderRadius:20,background:'rgba(255,255,255,0.12)',color:'rgba(255,255,255,0.6)',border:'1px solid rgba(255,255,255,0.15)',marginLeft:4}}>SERVICE</span>}
        />
        {p.title&&<div className="feed-product-title">{p.title}</div>}
        {p.description&&<div className="feed-product-desc">{p.description}</div>}
        {/* Features */}
        {p.service_features?.filter(f=>f).length > 0 && (
          <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:7}}>
            {p.service_features.filter(f=>f).slice(0,3).map((f,i)=>(
              <span key={i} style={{fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:20,background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',color:'rgba(255,255,255,0.75)',backdropFilter:'blur(4px)'}}>✓ {f}</span>
            ))}
          </div>
        )}
        {/* Price + CTA */}
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          {p.service_rate ? (
            <div className="feed-price-row" style={{marginBottom:0}}>
              <span className="feed-price">UGX {Number(p.service_rate).toLocaleString()}</span>
              <span style={{fontSize:11,color:'rgba(255,255,255,0.45)',marginLeft:3}}>/{{'hourly':'hr','starting_at':'from','fixed':'','negotiable':'neg.'}[p.service_rate_type]||''}</span>
            </div>
          ) : (
            <span className="feed-price" style={{fontSize:14}}>Contact for pricing</span>
          )}
          <button onClick={()=>onChatSeller&&onChatSeller()} className="feed-btn-buy" style={{whiteSpace:'nowrap',background:'linear-gradient(135deg,#D946EF,#F43F5E,#FB923C)'}}>
            Request Service
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main FeedCard — routes by post_type ───────────────────────────────────────
export default function FeedCard({ post: p, currentUser, initialLiked=false, initialSaved=false, distanceKm=null, onOpenComments, onChatSeller }) {
  const router = useRouter()
  // ── All hooks must be declared unconditionally (Rules of Hooks) ────────────
  const [liked,       setLiked]       = useState(initialLiked)
  const [saved,       setSaved]       = useState(initialSaved)
  const [likes,       setLikes]       = useState(p.likes_count||0)
  const [saves,       setSaves]       = useState(p.saves_count||0)
  const [paused,      setPaused]      = useState(false)
  const [following,   setFollowing]   = useState(false)
  const [followLoading,setFollowLoading]= useState(false)
  const [showHeart,   setShowHeart]   = useState(false)
  const [showReserve, setShowReserve] = useState(false)
  const [showChat,    setShowChat]    = useState(false)
  const [conversation,setConversation]= useState(null)
  const [muted,       setMuted]       = useState(getGlobalMuted())
  const [imgIdx,      setImgIdx]      = useState(0)
  const [musicPlaying, setMusicPlaying] = useState(false)
  const [slideshowActive, setSlideshowActive] = useState(false)
  const [showSellerProfile, setShowSellerProfile] = useState(false)
  const heartTimer  = useRef(null)
  const videoRef    = useRef(null)
  const audioRef    = useRef(null)
  const productRef  = useRef(null)
  const slideshowTimerRef = useRef(null)

  // Subscribe to global mute state changes
  useEffect(() => {
    const unsubscribe = subscribeToMuteState((newMuted) => {
      setMuted(newMuted)
      // Apply to video element
      if (videoRef.current) {
        videoRef.current.muted = newMuted
      }
      // Apply to audio element
      if (audioRef.current) {
        audioRef.current.muted = newMuted
      }
    })
    return unsubscribe
  }, [])

  const seller      = p.seller || {}
  const sellerColor = avatarColor(seller.id||'')
  const sellerInitial = (seller.full_name||seller.username||'S')[0].toUpperCase()

  const discStr  = discountPct(p.price, p.orig_price)
  const priceStr = formatUGX(p.price)
  const origStr  = p.orig_price ? formatUGX(p.orig_price) : null

  // Check if current user follows this seller on mount
  useEffect(()=>{
    if (!currentUser?.id || !seller?.id || currentUser.id === seller.id) return
    supabase.from('follows').select('id').eq('follower_id',currentUser.id).eq('following_id',seller.id).maybeSingle()
      .then(({data})=>setFollowing(!!data))
  },[currentUser?.id, seller?.id])

  useEffect(()=>{setLiked(initialLiked)},[initialLiked])
  useEffect(()=>{setSaved(initialSaved)},[initialSaved])
  useEffect(()=>()=>clearTimeout(heartTimer.current),[])

  // ── Product card video: play/pause, volume key unmute, scroll-away mute ──
  const isProductVideo = p.post_type === 'product' && !!p.video_url
  useEffect(() => {
    const v = videoRef.current; if (!v) return
    if (paused) v.pause(); else v.play().catch(()=>{})
  }, [paused])

  // Slideshow for multiple images in product posts
  useEffect(() => {
    const hasImages = p.images?.length > 0
    if (!hasImages || p.images.length <= 1 || !slideshowActive || isProductVideo) {
      if (slideshowTimerRef.current) {
        clearInterval(slideshowTimerRef.current)
        slideshowTimerRef.current = null
      }
      return
    }

    const clipDurations = p.clip_durations || {}
    const getDuration = (idx) => clipDurations[idx] || 3

    const interval = setInterval(() => {
      setImgIdx(prev => {
        const nextIdx = (prev + 1) % p.images.length
        return nextIdx
      })
    }, getDuration(imgIdx) * 1000)

    slideshowTimerRef.current = interval

    return () => {
      if (slideshowTimerRef.current) {
        clearInterval(slideshowTimerRef.current)
        slideshowTimerRef.current = null
      }
    }
  }, [p.images, slideshowActive, imgIdx, p.clip_durations, isProductVideo])

  useEffect(()=>{
    const v = videoRef.current; if (!v || !isProductVideo) return
    const unregister = registerVideoForUnmute(() => {
      if (document.hidden) return
      const card = productRef.current; if (!card) return
      const rect = card.getBoundingClientRect()
      const visible = rect.top >= -rect.height * 0.4 && rect.top <= window.innerHeight * 0.6
      if (visible) { 
        toggleGlobalMuted()
      }
    })
    const onVolChange = () => { if (!document.hidden && !v.muted) setMuted(false) }
    v.addEventListener('volumechange', onVolChange)
    return () => { unregister(); v.removeEventListener('volumechange', onVolChange) }
  }, [isProductVideo])

  useEffect(()=>{
    const v = videoRef.current; const a = audioRef.current; const card = productRef.current
    if (!card) return
    const obs = new IntersectionObserver(([e])=>{
      if (e.isIntersecting){
        if (v && isProductVideo) { 
          v.play().catch(()=>{}); 
          setPaused(false)
          v.muted = muted
        }
        if (a && p.music_file_url && !isProductVideo) { 
          a.play().catch(()=>{}); 
          setMusicPlaying(true)
          a.muted = muted
        }
        // Start slideshow for multiple images
        const hasImages = p.images?.length > 0
        if (hasImages && p.images.length > 1 && !isProductVideo) {
          setSlideshowActive(true)
        }
      } else {
        if (v) { v.pause() }
        if (a) { a.pause(); setMusicPlaying(false) }
        setSlideshowActive(false)
      }
    }, { threshold:0.6 })
    obs.observe(card)
    return () => obs.disconnect()
  }, [isProductVideo, p.music_file_url, p.images, muted])

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

  const handleFollow = async () => {
    if (!currentUser || !seller?.id || currentUser.id === seller.id || followLoading) return
    setFollowLoading(true)
    const was = following
    setFollowing(!was)
    try {
      if (was) {
        const { error } = await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', seller.id)
        if (error) setFollowing(was)
      } else {
        const { error } = await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: seller.id })
        if (error) setFollowing(was)
      }
    } finally {
      setFollowLoading(false)
    }
  }

  const canFollow = !!(currentUser?.id && seller?.id && currentUser.id !== seller.id)
  const sellerTap = () => { if (seller?.id) setShowSellerProfile(true) }

  const followProps = { following, followLoading, onFollow: handleFollow, canFollow }

  const handleChatSeller = async () => {
    if (!currentUser) { return }
    const { data: existing } = await supabase.from('conversations')
      .select('*,post:posts(id,title,price,images,emoji,bg_color,condition),buyer_profile:profiles!buyer_id(id,full_name,username,avatar_url,verified),seller_profile:profiles!seller_id(id,full_name,username,avatar_url,verified)')
      .eq('post_id', p.id).eq('buyer_id', currentUser.id).eq('seller_id', p.seller_id).maybeSingle()

    if (existing) { setConversation(existing); setShowChat(true); return }

    const { data: newConvo } = await supabase.from('conversations').insert({
      post_id: p.id, buyer_id: currentUser.id, seller_id: p.seller_id,
      last_message: `Hi, I'm interested in ${p.title}`, last_at: new Date().toISOString(),
    }).select('*,post:posts(id,title,price,images,emoji,bg_color,condition),buyer_profile:profiles!buyer_id(id,full_name,username,avatar_url,verified),seller_profile:profiles!seller_id(id,full_name,username,avatar_url,verified)').single()

    if (newConvo) {
      await supabase.from('messages').insert({
        conversation_id: newConvo.id,
        sender_id: currentUser.id,
        content: `Hi, I'm interested in ${p.title}. Is it still available?`,
      })
      setConversation(newConvo); setShowChat(true)
    }
  }

  const commonProps = { p, seller, sellerColor, sellerInitial, liked, likes, saved, saves, onLike:handleLike, onSave:handleSave, onShare:handleShare, onComment:()=>onOpenComments&&onOpenComments(p), onDoubleTap:handleDoubleTap, onSellerTap:sellerTap, ...followProps }

  const overlays = (
    <>
      {showHeart && <HeartFlash/>}
      {showReserve && (
        <OverlayPortal>
          <ReservationPage post={p} seller={seller} currentUser={currentUser}
            onBack={()=>setShowReserve(false)}
            onConfirmed={()=>{ setShowReserve(false); handleChatSeller() }}
          />
        </OverlayPortal>
      )}
      {showChat && conversation && (
        <OverlayPortal>
          <ChatScreen conversation={conversation} currentUser={currentUser} onBack={()=>setShowChat(false)}/>
        </OverlayPortal>
      )}
      {showSellerProfile && seller?.id && (
        <OverlayPortal>
          <UserProfileView userId={seller.id} currentUser={currentUser} onClose={()=>setShowSellerProfile(false)}/>
        </OverlayPortal>
      )}
    </>
  )

  // ── Social post ────────────────────────────────────────────────────────
  if (p.post_type === 'social') return (
    <div style={{position:'relative'}}>
      <SocialCard {...commonProps}/>
      {overlays}
    </div>
  )

  // ── Service post ───────────────────────────────────────────────────────
  if (p.post_type === 'service') return (
    <div style={{position:'relative'}}>
      <ServiceCard {...commonProps} onChatSeller={handleChatSeller}/>
      {overlays}
    </div>
  )

  // ── Product post (TikTok full-screen) ──────────────────────────────────
  const hasImages  = p.images?.length > 0
  const multiImage = hasImages && p.images.length > 1
  const isVideo    = !!p.video_url
  const filterCSS  = getFilterCSS(p.filter_name)

  return (
    <div ref={productRef} className={`feed-card${paused?' paused':''}`}
      onDoubleClick={handleDoubleTap}
      onClick={()=>{ 
        if(muted){ 
          // Unmute globally - affects all posts in feed
          toggleGlobalMuted()
        } else if (!isVideo && p.music_file_url){ 
          // Toggle music play/pause for image posts
          const a=audioRef.current; 
          if(a){ 
            if(musicPlaying){
              a.pause();setMusicPlaying(false)
            }else{
              a.play().catch(()=>{});setMusicPlaying(true)
            } 
          } 
        } 
      }}
    >
      {/* Hidden audio element for music */}
      {p.music_file_url && !isVideo && (
        <audio
          ref={audioRef}
          src={p.music_file_url}
          loop
          style={{display:'none'}}
          onPlay={()=>setMusicPlaying(true)}
          onPause={()=>setMusicPlaying(false)}
        />
      )}

      {/* Background — video > images > color/emoji */}
      {isVideo ? (
        <video
          ref={videoRef}
          src={p.video_url}
          className="feed-media-bg"
          style={{objectFit:'cover', width:'100%', height:'100%', filter: filterCSS || undefined}}
          autoPlay
          muted={muted}
          loop
          playsInline
          onClick={e=>{
            if (muted) { e.currentTarget.muted=false; setMuted(false) }
            else setPaused(x=>!x)
          }}
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
              <img key={i} src={src} alt="" style={{width:'100%',height:'100%',objectFit:'cover',flexShrink:0,scrollSnapAlign:'start',filter:filterCSS||undefined}}/>
            ))}
          </div>
        ) : (
          <img
            src={p.images[0]}
            alt=""
            className="feed-media-bg"
            style={{objectFit:'cover',width:'100%',height:'100%',filter:filterCSS||undefined}}
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

      {/* Play/pause indicator — transparent, floats over media */}
      {paused && (
        <div onClick={()=>setPaused(false)} style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',zIndex:18,cursor:'pointer',pointerEvents:'all'}}>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="rgba(255,255,255,0.85)" style={{filter:'drop-shadow(0 2px 16px rgba(0,0,0,0.8))'}}>
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
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


      {/* Music pill - Instagram style at top-left */}
      {(p.music_title || p.music_artist || p.music_file_url) && (
        <div 
          onClick={(e) => {
            e.stopPropagation()
            // Navigate to music page using music_id or encoded music_file_url as identifier
            const musicId = p.music_id || (p.music_file_url ? encodeURIComponent(p.music_file_url) : null)
            if (musicId) {
              router.push(`/music/${musicId}`)
            }
          }}
          style={{
            position:'absolute',
            top:isVideo ? 'calc(env(safe-area-inset-top,0px)+12px)' : 'calc(env(safe-area-inset-top,0px)+12px)',
            left:12,
            width:44,
            height:44,
            borderRadius:12,
            background:'rgba(0,0,0,0.6)',
            backdropFilter:'blur(8px)',
            border:'1px solid rgba(255,255,255,0.2)',
            cursor:'pointer',
            zIndex:18,
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
            boxShadow:'0 4px 12px rgba(0,0,0,0.3)',
            overflow:'hidden'
          }}
        >
          {/* Album art / music icon */}
          {p.music_album_art ? (
            <img 
              src={p.music_album_art} 
              alt="Album art"
              style={{
                width:36,
                height:36,
                borderRadius:10,
                objectFit:'cover',
                animation:musicPlaying ? 'spin 3s linear infinite' : 'none'
              }}
            />
          ) : (
            <div style={{
              width:36,
              height:36,
              borderRadius:10,
              background:'linear-gradient(135deg,#FF3366,#F97316)',
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              animation:musicPlaying ? 'spin 3s linear infinite' : 'none'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white" style={{animation:musicPlaying ? 'pulse 1s ease-in-out infinite' : 'none'}}>
                <path d="M9 18V5l12-2v13"/>
                <circle cx="6" cy="18" r="3"/>
                <circle cx="18" cy="16" r="3"/>
              </svg>
            </div>
          )}
          {/* Playing indicator dot */}
          {musicPlaying && (
            <div style={{
              position:'absolute',
              bottom:6,
              right:6,
              width:8,
              height:8,
              borderRadius:'50%',
              background:'#22C55E',
              border:'2px solid white',
              boxShadow:'0 2px 4px rgba(0,0,0,0.3)'
            }}/>
          )}
        </div>
      )}

      <FeedActionRail
        liked={liked} likes={likes} comments={p.comments_count||0}
        saved={saved} saves={saves} shares={p.shares_count||0}
        onLike={handleLike}
        onComment={()=>onOpenComments&&onOpenComments(p)}
        onShare={handleShare}
        onSave={handleSave}
      />

      {/* Bottom info */}
      <div className="feed-info">
        <FeedSellerRow
          seller={seller} sellerColor={sellerColor} sellerInitial={sellerInitial}
          following={following} followLoading={followLoading} onFollow={handleFollow}
          onSellerTap={sellerTap} showFollow={canFollow}
        />
        {distanceKm !== null && (
          <div style={{display:'inline-flex',alignItems:'center',gap:5,marginBottom:6,background:'rgba(34,197,94,0.15)',border:'1px solid rgba(34,197,94,0.3)',backdropFilter:'blur(8px)',borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:700,color:'#22C55E'}}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {fmtDistance(distanceKm)}
          </div>
        )}
        {p.title&&<div className="feed-product-title">{p.title}</div>}
        {p.description&&<div className="feed-product-desc">{p.description}</div>}
        {priceStr&&(
          <div className="feed-price-row" style={{display:'flex',alignItems:'center',gap:8}}>
            <span className="feed-price">{priceStr}</span>
            {origStr&&<span className="feed-price-orig">{origStr}</span>}
            {discStr&&<span className="feed-price-badge">{discStr}</span>}
            {p.is_hot && (
              <div style={{display:'inline-flex',alignItems:'center',gap:4,background:'linear-gradient(135deg,#FF3366,#F97316)',borderRadius:16,padding:'4px 10px',fontSize:10,fontWeight:800,color:'white',boxShadow:'0 2px 8px rgba(255,51,102,0.4)'}}>
                🔥 Hot Deal
              </div>
            )}
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

      {overlays}
    </div>
  )
}

// ── Double-tap heart flash ────────────────────────────────────────────────────
function HeartFlash() {
  return (
    <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',zIndex:30,pointerEvents:'none'}}>
      <i className="fas fa-heart" style={{fontSize:80,color:'white',filter:'drop-shadow(0 4px 20px rgba(0,0,0,0.5))',animation:'heartPop 0.8s ease forwards'}}/>
      <style>{`@keyframes heartPop{0%{opacity:0;transform:scale(0.3)}30%{opacity:1;transform:scale(1.2)}60%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.1)}}@keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-100%)}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}`}</style>
    </div>
  )
}
