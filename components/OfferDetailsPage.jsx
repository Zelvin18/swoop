/**
 * OfferDetailsPage — Full offer detail view (matches design image Step 4)
 * Grid image layout (1 large + 4 small), side-by-side Accept/Decline buttons,
 * working Follow/Message, proper portal so nav is hidden.
 */
import { useState, useEffect, useRef } from 'react'
import { updateOfferStatus as _updateOfferStatus } from '../lib/requests'
import { formatUGX } from '../lib/feed'
import { supabase } from '../lib/supabase'
import AcceptOfferModal from './AcceptOfferModal'
import OverlayPortal from './OverlayPortal'

const COLORS = ['#7C3AED','#FF3366','#F97316','#22C55E','#3B82F6','#EC4899','#F59E0B','#06B6D4']
const CAT_EMOJI = { Phones:'📱',Electronics:'💻',Fashion:'👗',Sneakers:'👟',Home:'🏠',Beauty:'💄',Cars:'🚗',Furniture:'🛋️',Sports:'⚽',Other:'📦' }
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function avatarColor(id='') { return COLORS[id.split('').reduce((a,c)=>a+c.charCodeAt(0),0)%COLORS.length] }
function initials(n='') { return n.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)||'?' }

function memberSince(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return `Member since ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export default function OfferDetailsPage({ offer, request, currentUser, onBack, onAccepted, onDeclined, onOpenChat }) {
  const [lightboxIdx,     setLightboxIdx]     = useState(null)  // null = grid, number = lightbox
  const [showAcceptModal, setShowAcceptModal] = useState(false)
  const [declining,       setDeclining]       = useState(false)
  const [acceptLoading,   setAcceptLoading]   = useState(false)
  const [acceptError,     setAcceptError]     = useState('')
  const [declineError,    setDeclineError]    = useState('')
  const [following,       setFollowing]       = useState(false)
  const [followLoading,   setFollowLoading]   = useState(false)

  const seller      = offer.seller || {}
  const sellerColor = avatarColor(seller.id || offer.seller_id || '')
  const sellerInit  = initials(seller.full_name || seller.username || 'S')
  const hasImages   = offer.images?.length > 0
  const images      = offer.images || []

  // Check if already following
  useEffect(() => {
    if (!currentUser?.id || !seller?.id) return
    supabase.from('follows')
      .select('id').eq('follower_id', currentUser.id).eq('following_id', seller.id).maybeSingle()
      .then(({ data }) => setFollowing(!!data))
  }, [currentUser?.id, seller?.id])

  const handleFollow = async () => {
    if (!currentUser?.id || !seller?.id || followLoading) return
    setFollowLoading(true)
    if (following) {
      await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', seller.id)
      setFollowing(false)
    } else {
      await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: seller.id })
      setFollowing(true)
    }
    setFollowLoading(false)
  }

  const handleDecline = async () => {
    setDeclining(true); setDeclineError('')
    try {
      await _updateOfferStatus(offer.id, 'rejected')
      setDeclining(false); onDeclined()
    } catch(e) {
      setDeclining(false)
      setDeclineError(e?.message || 'Failed to decline. Try again.')
    }
  }

  const handleAcceptConfirm = async () => {
    setAcceptLoading(true); setAcceptError('')
    try {
      await _updateOfferStatus(offer.id, 'accepted')
      setAcceptLoading(false); setShowAcceptModal(false); onAccepted(offer)
    } catch(e) {
      setAcceptLoading(false)
      setAcceptError(e?.message || 'Failed to accept. Try again.')
    }
  }

  const detailRows = [
    offer.price               ? { label:'Price',          val:formatUGX(offer.price),                  accent:'#FF3366'  } : null,
    offer.negotiable != null  ? { label:'Negotiable',     val:offer.negotiable?'Yes':'No',              accent:offer.negotiable?'#22C55E':null } : null,
    offer.condition           ? { label:'Condition',      val:offer.condition,                          accent:null       } : null,
    offer.storage             ? { label:'Storage',        val:offer.storage,                            accent:null       } : null,
    offer.battery_health      ? { label:'Battery Health', val:offer.battery_health,                     accent:null       } : null,
    offer.includes            ? { label:'Includes',       val:offer.includes,                           accent:null       } : null,
  ].filter(Boolean)

  return (
    <OverlayPortal>
      <div style={{
        position:'fixed', inset:0, zIndex:9999,
        background:'#000', display:'flex', flexDirection:'column',
        fontFamily:"'Inter',sans-serif", color:'#fff',
      }}>
        {/* Header */}
        <div style={{
          flexShrink:0, padding:'12px 16px',
          paddingTop:'calc(env(safe-area-inset-top,0px) + 12px)',
          borderBottom:'1px solid rgba(255,255,255,0.07)',
          background:'rgba(0,0,0,0.98)', backdropFilter:'blur(16px)',
          display:'flex', alignItems:'center', gap:12,
        }}>
          <button onClick={onBack} style={S.iconBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <div style={{flex:1, fontSize:17, fontWeight:800, textAlign:'center'}}>Offer Details</div>
          <button style={S.iconBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2"><circle cx="12" cy="5" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="19" r="1.2" fill="currentColor"/></svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{flex:1, overflowY:'auto', scrollbarWidth:'none'}}>

          {/* ── Image grid ── */}
          <ImageGrid images={images} request={request} onImageClick={setLightboxIdx} />

          {/* ── Lightbox (horizontal scroll, full screen) ── */}
          {lightboxIdx !== null && (
            <Lightbox images={images} startIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
          )}

          {/* ── Seller profile ── */}
          <div style={{padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
            <div style={{display:'flex', alignItems:'flex-start', gap:12, marginBottom:12}}>
              {/* Avatar */}
              <div style={{
                width:52, height:52, borderRadius:'50%', background:sellerColor, flexShrink:0,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontWeight:900, fontSize:17, color:'white',
                overflow:'hidden', border:'2px solid rgba(255,255,255,0.1)',
                boxShadow:`0 0 0 3px ${sellerColor}33`,
              }}>
                {seller.avatar_url
                  ? <img src={seller.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                  : <span>{sellerInit}</span>}
              </div>
              {/* Info */}
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
                  <span style={{fontSize:15,fontWeight:800}}>{seller.full_name||seller.username||'Seller'}</span>
                  {seller.verified && (
                    <span style={{width:15,height:15,borderRadius:'50%',background:'#3B82F6',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:8,color:'white',fontWeight:900}}>✓</span>
                  )}
                </div>
                {memberSince(seller.joined_at) && (
                  <div style={{fontSize:12,color:'#71717A',marginBottom:4}}>{memberSince(seller.joined_at)}</div>
                )}
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  {(seller.avg_rating > 0) && (
                    <div style={{display:'flex',alignItems:'center',gap:3}}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="#F59E0B" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      <span style={{fontSize:12,fontWeight:700,color:'#fff'}}>{seller.avg_rating?.toFixed(1)}</span>
                      {seller.review_count > 0 && <span style={{fontSize:11,color:'#71717A'}}>({seller.review_count})</span>}
                    </div>
                  )}
                  {seller.response_rate > 0 && (
                    <div style={{display:'flex',alignItems:'center',gap:3}}>
                      <div style={{width:7,height:7,borderRadius:'50%',background:'#FF3366'}}/>
                      <span style={{fontSize:11,color:'#A1A1AA'}}>{seller.response_rate}% Response rate</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Follow + Message buttons */}
            <div style={{display:'flex',gap:10}}>
              <button onClick={handleFollow} disabled={followLoading} style={{
                flex:1, padding:'10px', borderRadius:10,
                background: following ? 'rgba(255,51,102,0.1)' : 'transparent',
                border:`1.5px solid ${following ? '#FF3366' : 'rgba(255,255,255,0.2)'}`,
                color: following ? '#FF3366' : 'white',
                fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                opacity: followLoading ? 0.6 : 1,
              }}>
                {followLoading ? (
                  <div style={{width:14,height:14,border:'2px solid rgba(255,255,255,0.2)',borderTopColor:'#FF3366',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
                ) : following ? 'Following' : 'Follow'}
              </button>
              <button onClick={() => onOpenChat?.(seller)} style={{
                flex:1, padding:'10px', borderRadius:10,
                background:'#141414',
                border:'1.5px solid rgba(255,255,255,0.12)',
                color:'white', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                display:'flex', alignItems:'center', justifyContent:'center', gap:6,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                Message
              </button>
            </div>
          </div>

          {/* ── Offer Details table ── */}
          {detailRows.length > 0 && (
            <div style={{padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
              <div style={{fontSize:14,fontWeight:800,marginBottom:12}}>Offer Details</div>
              {detailRows.map((row,i) => (
                <div key={i} style={{
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'9px 0',
                  borderBottom: i<detailRows.length-1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                }}>
                  <span style={{fontSize:13,color:'#71717A'}}>{row.label}</span>
                  <span style={{fontSize:13,fontWeight:700,color:row.accent||'#fff'}}>{row.val}</span>
                </div>
              ))}
            </div>
          )}

          {/* Description */}
          {offer.message && (
            <div style={{padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
              <div style={{fontSize:13,color:'#A1A1AA',lineHeight:1.65}}>{offer.message}</div>
            </div>
          )}

          {declineError && (
            <div style={{margin:'0 16px 8px',background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:10,padding:'10px 14px',fontSize:13,color:'#EF4444'}}>
              {declineError}
            </div>
          )}

          <div style={{height:100}}/>
        </div>

        {/* ── Fixed action footer — Accept + Decline side by side ── */}
        {offer.status === 'pending' && (
          <div style={{
            flexShrink:0, padding:'12px 16px',
            paddingBottom:'calc(env(safe-area-inset-bottom,0px) + 16px)',
            borderTop:'1px solid rgba(255,255,255,0.07)',
            background:'rgba(0,0,0,0.98)',
            backdropFilter:'blur(16px)',
            display:'flex', gap:10,
          }}>
            {/* Accept */}
            <button onClick={()=>setShowAcceptModal(true)} style={{
              flex:1, padding:'14px',
              background:'linear-gradient(135deg,#FF3366,#FF6633)',
              border:'none', borderRadius:12, color:'white',
              fontSize:14, fontWeight:700, cursor:'pointer',
              fontFamily:'inherit', boxShadow:'0 4px 16px rgba(255,51,102,0.4)',
              display:'flex', alignItems:'center', justifyContent:'center', gap:6,
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              Accept Offer
            </button>
            {/* Decline */}
            <button onClick={handleDecline} disabled={declining} style={{
              flex:1, padding:'14px',
              background:'transparent',
              border:'1.5px solid rgba(255,255,255,0.2)',
              borderRadius:12, color:'#A1A1AA',
              fontSize:14, fontWeight:600, cursor:declining?'not-allowed':'pointer',
              fontFamily:'inherit',
              display:'flex', alignItems:'center', justifyContent:'center', gap:6,
              opacity: declining ? 0.6 : 1,
            }}>
              {declining ? (
                <div style={{width:14,height:14,border:'2px solid rgba(255,255,255,0.1)',borderTopColor:'white',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              )}
              Decline Offer
            </button>
          </div>
        )}

        {/* Already accepted/declined state */}
        {offer.status !== 'pending' && (
          <div style={{
            flexShrink:0, padding:'14px 16px',
            paddingBottom:'calc(env(safe-area-inset-bottom,0px) + 16px)',
            borderTop:'1px solid rgba(255,255,255,0.07)',
            background:'rgba(0,0,0,0.98)',
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          }}>
            <div style={{
              padding:'10px 20px', borderRadius:20, fontSize:13, fontWeight:700,
              background: offer.status==='accepted'?'rgba(34,197,94,0.15)':'rgba(239,68,68,0.15)',
              color: offer.status==='accepted'?'#22C55E':'#EF4444',
              border: `1px solid ${offer.status==='accepted'?'rgba(34,197,94,0.3)':'rgba(239,68,68,0.3)'}`,
            }}>
              {offer.status==='accepted' ? '✓ You accepted this offer' : '✗ You declined this offer'}
            </div>
          </div>
        )}

        {showAcceptModal && (
          <AcceptOfferModal
            offer={offer} request={request}
            loading={acceptLoading} error={acceptError}
            onConfirm={handleAcceptConfirm}
            onCancel={()=>{ setShowAcceptModal(false); setAcceptError('') }}
          />
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </OverlayPortal>
  )
}

/* ── Image Grid — 1 large left + 2x2 right (matches design) ── */
function ImageGrid({ images, request, onImageClick }) {
  const hasImages = images.length > 0

  if (!hasImages) {
    return (
      <div style={{width:'100%',aspectRatio:'4/3',background:'#141414',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <span style={{fontSize:80,opacity:0.2}}>{CAT_EMOJI[request.category]||'📦'}</span>
      </div>
    )
  }

  if (images.length === 1) {
    return (
      <div style={{width:'100%',aspectRatio:'4/3',overflow:'hidden'}} onClick={()=>onImageClick(0)}>
        <img src={images[0]} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
      </div>
    )
  }

  // Grid: big left + up to 4 in 2x2 grid on right
  const bigImg  = images[0]
  const smImgs  = images.slice(1, 5)  // max 4 small images
  const extra   = images.length > 5 ? images.length - 5 : 0

  return (
    <div style={{display:'flex',gap:2,height:260}}>
      {/* Large left */}
      <div style={{flex:'0 0 55%',overflow:'hidden',cursor:'pointer'}} onClick={()=>onImageClick(0)}>
        <img src={bigImg} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
      </div>
      {/* 2x2 right grid */}
      <div style={{flex:1,display:'grid',gridTemplateColumns:'1fr 1fr',gridTemplateRows:'1fr 1fr',gap:2}}>
        {smImgs.map((src,i) => (
          <div key={i} style={{overflow:'hidden',position:'relative',cursor:'pointer'}}
            onClick={()=>onImageClick(i+1)}>
            <img src={src} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
            {/* +N overlay on last visible small image if there are more */}
            {i===3 && extra>0 && (
              <div style={{
                position:'absolute',inset:0,background:'rgba(0,0,0,0.65)',
                display:'flex',alignItems:'center',justifyContent:'center',
              }}>
                <span style={{fontSize:18,fontWeight:900,color:'white'}}>+{extra}</span>
              </div>
            )}
          </div>
        ))}
        {/* Show image count in bottom-right of last cell */}
        {smImgs.length > 0 && smImgs.length < 4 && (
          <div style={{
            display:'flex',alignItems:'center',justifyContent:'center',
            background:'#141414',fontSize:12,fontWeight:700,color:'#52525B',
          }}>
            {images.length} photos
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Lightbox — full-screen horizontal scroll opened when tapping any grid image ── */
function Lightbox({ images, startIndex, onClose }) {
  const [current, setCurrent] = useState(startIndex)
  const scrollRef = useRef(null)

  // Scroll to startIndex on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = startIndex * scrollRef.current.offsetWidth
    }
  }, [startIndex])

  const handleScroll = (e) => {
    const idx = Math.round(e.currentTarget.scrollLeft / e.currentTarget.offsetWidth)
    setCurrent(idx)
  }

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:10001,
      background:'#000',
      display:'flex', flexDirection:'column',
    }}>
      {/* Header */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'12px 16px',
        paddingTop:'calc(env(safe-area-inset-top,0px) + 12px)',
        background:'rgba(0,0,0,0.8)', backdropFilter:'blur(12px)',
        flexShrink:0,
      }}>
        <button onClick={onClose} style={{
          width:36, height:36, borderRadius:'50%',
          background:'rgba(255,255,255,0.1)', border:'none',
          display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <span style={{ fontSize:14, fontWeight:700, color:'white' }}>
          {current + 1} / {images.length}
        </span>
        <div style={{ width:36 }} />
      </div>

      {/* Horizontal scroll images */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          flex:1,
          display:'flex',
          overflowX:'auto',
          scrollSnapType:'x mandatory',
          scrollbarWidth:'none',
        }}
      >
        {images.map((src, i) => (
          <div key={i} style={{
            width:'100vw', flexShrink:0,
            scrollSnapAlign:'start',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <img src={src} alt={`Image ${i+1}`} style={{
              maxWidth:'100%', maxHeight:'100%', objectFit:'contain',
            }} />
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      {images.length > 1 && (
        <div style={{
          display:'flex', justifyContent:'center', gap:6,
          padding:'14px 16px',
          paddingBottom:'calc(env(safe-area-inset-bottom,0px) + 14px)',
          flexShrink:0,
        }}>
          {images.map((_, i) => (
            <div key={i} style={{
              width: i === current ? 20 : 6, height:6, borderRadius:3,
              background: i === current ? '#FF3366' : 'rgba(255,255,255,0.3)',
              transition:'all 0.2s',
              cursor:'pointer',
            }} onClick={() => {
              if (scrollRef.current) {
                scrollRef.current.scrollTo({ left: i * scrollRef.current.offsetWidth, behavior:'smooth' })
              }
            }} />
          ))}
        </div>
      )}
    </div>
  )
}

const S = {
  iconBtn: {
    width:36, height:36, borderRadius:10, flexShrink:0,
    background:'rgba(255,255,255,0.06)',
    border:'1px solid rgba(255,255,255,0.08)',
    display:'flex', alignItems:'center', justifyContent:'center',
    cursor:'pointer',
  },
}
