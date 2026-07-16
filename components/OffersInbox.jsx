/**
 * OffersInbox — Buyer's list of offers (matches design image Step 3)
 * Large cover image, seller info, price, negotiable badge, View Offer button
 */
import { useState, useEffect } from 'react'
import { fetchOffers } from '../lib/requests'
import { haversineKm, formatUGX } from '../lib/feed'
import { supabase } from '../lib/supabase'
import OverlayPortal from './OverlayPortal'

const COLORS = ['#7C3AED','#FF3366','#F97316','#22C55E','#3B82F6','#EC4899','#F59E0B','#06B6D4']
const CAT_EMOJI = { Phones:'📱',Electronics:'💻',Fashion:'👗',Sneakers:'👟',Home:'🏠',Beauty:'💄',Cars:'🚗',Furniture:'🛋️',Sports:'⚽',Other:'📦' }
const SORT_OPTS = ['All','Lowest Price','Nearest','Newest']

function avatarColor(id='') { return COLORS[id.split('').reduce((a,c)=>a+c.charCodeAt(0),0)%COLORS.length] }
function initials(n='') { return n.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)||'?' }
function timeAgo(d) {
  const m = Math.floor((Date.now()-new Date(d))/60000)
  if (m<1) return 'just now'; if (m<60) return `${m}m ago`
  const h = Math.floor(m/60); if (h<24) return `${h}h ago`
  return `${Math.floor(h/24)}d ago`
}

export default function OffersInbox({ request, currentUser, onBack, onViewOffer }) {
  const [offers,     setOffers]     = useState([])
  const [loading,    setLoading]    = useState(true)
  const [sortFilter, setSortFilter] = useState('All')
  const [error,      setError]      = useState('')

  useEffect(() => {
    let mounted = true
    fetchOffers(request.id).then(data => {
      if (mounted) { setOffers(data); setLoading(false) }
    }).catch(() => {
      if (mounted) { setError('Failed to load offers.'); setLoading(false) }
    })

    const ch = supabase.channel(`inbox-${request.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'offers', filter: `request_id=eq.${request.id}` },
        async payload => {
          const { data: seller } = await supabase.from('profiles')
            .select('id,full_name,username,avatar_url,verified,location,lat,lng,rating,avg_rating,review_count,response_rate,joined_at')
            .eq('id', payload.new.seller_id).single()
          if (mounted) setOffers(prev => [{ ...payload.new, seller }, ...prev])
        })
      .subscribe()
    return () => { mounted = false; supabase.removeChannel(ch) }
  }, [request.id])

  const sorted = (() => {
    const arr = [...offers]
    if (sortFilter === 'Lowest Price') return arr.sort((a,b) => (a.price||0)-(b.price||0))
    if (sortFilter === 'Newest') return arr.sort((a,b) => new Date(b.created_at)-new Date(a.created_at))
    if (sortFilter === 'Nearest') return arr.sort((a,b) => {
      const d = o => (o.seller?.lat && o.seller?.lng && request.lat && request.lng)
        ? haversineKm(request.lat, request.lng, o.seller.lat, o.seller.lng) : Infinity
      return d(a)-d(b)
    })
    return arr
  })()

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
          <div style={{flex:1}}>
            <div style={{fontSize:17, fontWeight:800}}>Offers</div>
            <div style={{fontSize:12, color:'#71717A', marginTop:1}}>
              {loading ? 'Loading…' : `${offers.length} offer${offers.length!==1?'s':''} received`}
            </div>
          </div>
          <div style={{
            maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
            fontSize:11, color:'#A1A1AA', background:'#141414',
            border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:'4px 10px',
          }}>{request.title}</div>
        </div>

        {/* Sort pills */}
        <div style={{
          flexShrink:0, display:'flex', gap:8, padding:'10px 16px',
          overflowX:'auto', scrollbarWidth:'none',
          borderBottom:'1px solid rgba(255,255,255,0.05)',
        }}>
          {SORT_OPTS.map(opt => (
            <button key={opt} onClick={() => setSortFilter(opt)} style={{
              flexShrink:0, padding:'7px 16px', borderRadius:20,
              fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
              background: sortFilter===opt ? '#FF3366' : '#141414',
              border: `1.5px solid ${sortFilter===opt ? '#FF3366' : 'rgba(255,255,255,0.1)'}`,
              color: sortFilter===opt ? 'white' : '#A1A1AA',
              transition:'all 0.15s',
            }}>{opt}</button>
          ))}
        </div>

        {/* Body */}
        <div style={{flex:1, overflowY:'auto', scrollbarWidth:'none', paddingBottom:24}}>
          {loading && (
            <div style={S.center}>
              <div style={{width:28,height:28,border:'2px solid rgba(255,255,255,0.1)',borderTopColor:'#FF3366',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
            </div>
          )}
          {!loading && error && (
            <div style={S.center}>
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:14,color:'#A1A1AA',marginBottom:16}}>{error}</div>
                <button onClick={()=>{setError('');setLoading(true);fetchOffers(request.id).then(d=>{setOffers(d);setLoading(false)})}}
                  style={{padding:'10px 24px',background:'linear-gradient(135deg,#FF3366,#FF6633)',border:'none',borderRadius:12,color:'white',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                  Retry
                </button>
              </div>
            </div>
          )}
          {!loading && !error && offers.length===0 && (
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'64px 24px',gap:10}}>
              <div style={{width:72,height:72,borderRadius:'50%',background:'rgba(255,51,102,0.1)',border:'2px solid rgba(255,51,102,0.2)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:8}}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#FF3366" strokeWidth="1.5" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              </div>
              <div style={{fontSize:17,fontWeight:800}}>No offers yet</div>
              <div style={{fontSize:13,color:'#52525B',textAlign:'center',lineHeight:1.6,maxWidth:260}}>
                Sellers will see your request and send offers. Check back soon.
              </div>
            </div>
          )}
          {!loading && !error && sorted.map(offer => (
            <OfferCard key={offer.id} offer={offer} request={request} onClick={()=>onViewOffer(offer)} />
          ))}
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </OverlayPortal>
  )
}

function OfferCard({ offer, request, onClick }) {
  const seller = offer.seller || {}
  const color  = avatarColor(seller.id || offer.seller_id || '')
  const init   = initials(seller.full_name || seller.username || 'S')
  const dist   = (seller.lat && seller.lng && request.lat && request.lng)
    ? haversineKm(request.lat, request.lng, seller.lat, seller.lng) : null
  const coverImage = offer.images?.[0] || null

  return (
    <div style={{
      margin:'12px 16px 0',
      background:'#141414',
      border:'1px solid rgba(255,255,255,0.07)',
      borderRadius:18, overflow:'hidden',
      cursor:'pointer',
    }} onClick={onClick}>
      <div style={{display:'flex', gap:0}}>
        {/* Left: info */}
        <div style={{flex:1, padding:'14px 14px', minWidth:0}}>
          {/* Seller row */}
          <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:6}}>
            <div style={{
              width:38, height:38, borderRadius:'50%', background:color, flexShrink:0,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontWeight:900, fontSize:13, color:'white',
              border:'2px solid rgba(255,255,255,0.1)', overflow:'hidden',
            }}>
              {seller.avatar_url
                ? <img src={seller.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                : <span>{init}</span>}
            </div>
            <div style={{minWidth:0}}>
              <div style={{display:'flex',alignItems:'center',gap:4}}>
                <span style={{fontSize:13,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {seller.full_name || seller.username || 'Seller'}
                </span>
                {seller.verified && (
                  <span style={{width:13,height:13,borderRadius:'50%',background:'#3B82F6',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:7,color:'white',fontWeight:900,flexShrink:0}}>✓</span>
                )}
              </div>
              <div style={{fontSize:11,color:'#71717A',display:'flex',alignItems:'center',gap:4}}>
                {dist!==null && (
                  <span style={{color:'#22C55E',fontWeight:600}}>
                    {dist<1?`${Math.round(dist*1000)}m`:`${dist.toFixed(1)} km`} away
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Price */}
          {offer.price && (
            <div style={{fontSize:17,fontWeight:900,color:'#FF3366',marginBottom:5}}>
              {formatUGX(offer.price)}
            </div>
          )}

          {/* Description */}
          {offer.message && (
            <div style={{fontSize:12,color:'#D4D4D8',lineHeight:1.5,marginBottom:8,display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical',overflow:'hidden'}}>
              {offer.message}
            </div>
          )}

          {/* Negotiable + View Offer */}
          <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
            {offer.negotiable && (
              <span style={{
                fontSize:11,fontWeight:700,padding:'3px 8px',borderRadius:20,
                background:'rgba(34,197,94,0.12)',color:'#22C55E',
                border:'1px solid rgba(34,197,94,0.25)',
                display:'flex',alignItems:'center',gap:4,
              }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Negotiable
              </span>
            )}
            <button
              onClick={e=>{e.stopPropagation();onClick()}}
              style={{
                padding:'7px 16px',borderRadius:20,
                background:'linear-gradient(135deg,#FF3366,#FF6633)',
                border:'none',color:'white',fontSize:12,fontWeight:700,
                cursor:'pointer',fontFamily:'inherit',
                boxShadow:'0 2px 10px rgba(255,51,102,0.35)',
              }}>
              View Offer
            </button>
          </div>
        </div>

        {/* Right: large cover image */}
        <div style={{
          width:130, minHeight:160, flexShrink:0,
          background:'#1e1e1e',
          overflow:'hidden', position:'relative',
        }}>
          {coverImage ? (
            <img src={coverImage} alt="" style={{width:'100%',height:'100%',objectFit:'cover',position:'absolute',inset:0}}/>
          ) : (
            <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',position:'absolute',inset:0}}>
              <span style={{fontSize:40,opacity:0.3}}>{CAT_EMOJI[request.category]||'📦'}</span>
            </div>
          )}
          {/* Image count badge */}
          {offer.images?.length > 1 && (
            <div style={{
              position:'absolute',bottom:8,right:8,
              background:'rgba(0,0,0,0.7)',backdropFilter:'blur(4px)',
              borderRadius:12,padding:'3px 7px',
              fontSize:10,fontWeight:700,color:'white',
            }}>
              1/{offer.images.length}
            </div>
          )}
        </div>
      </div>
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
  center: { display:'flex', alignItems:'center', justifyContent:'center', padding:'64px 24px' },
}
