import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { fetchRequests, fetchRequestOfferAvatars, searchRequests, fmtBudget, REQUEST_CATEGORIES } from '../lib/requests'
import { requestLocation, saveUserLocation, haversineKm } from '../lib/feed'
import PostRequestModal  from './PostRequestModal'
import SendOfferPage     from './SendOfferPage'
import OffersInbox       from './OffersInbox'
import OfferDetailsPage  from './OfferDetailsPage'
import ReservationPage   from './ReservationPage'

const COLORS = ['#7C3AED','#FF3366','#F97316','#22C55E','#3B82F6','#EC4899','#F59E0B','#06B6D4']
const CAT_EMOJI = { Phones:'📱',Electronics:'💻',Fashion:'👗',Sneakers:'👟',Home:'🏠',Beauty:'💄',Cars:'🚗',Furniture:'🛋️',Sports:'⚽',Other:'📦' }
const LOC_KEY = 'swoop_req_location_asked'

function avatarColor(id='') { return COLORS[id.split('').reduce((a,c)=>a+c.charCodeAt(0),0)%COLORS.length] }
function initials(n='') { return n.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)||'?' }

const FILTERS = ['My Requests','All Requests','Near You','Following','Categories']

export default function RequestsPage({ showToast, currentUser }) {
  const [filter,       setFilter]       = useState('All Requests')
  const [category,     setCategory]     = useState(null)
  const [requests,     setRequests]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [searchQuery,  setSearchQuery]  = useState('')
  const [searchResults,setSearchResults]= useState([])
  const [searching,    setSearching]    = useState(false)
  const [showSearch,   setShowSearch]   = useState(false)
  const [showPostModal,setShowPostModal]= useState(false)
  const [showFilterSheet,setShowFilterSheet] = useState(false)
  const [selectedRequest,setSelectedRequest] = useState(null)
  const [userLat,      setUserLat]      = useState(null)
  const [userLng,      setUserLng]      = useState(null)
  const [locStatus,    setLocStatus]    = useState('idle')
  const searchRef = useRef(null)

  const [activePage,      setActivePage]      = useState(null)  // null | 'sendOffer' | 'offersInbox' | 'offerDetails' | 'reservation'
  const [selectedOffer,   setSelectedOffer]   = useState(null)
  const [myRequestsTab,   setMyRequestsTab]   = useState('Active') // 'Active' | 'Completed'

  const loadRequests = useCallback(async () => {
    setLoading(true)
    const data = await fetchRequests({ filter, category, currentUserId: currentUser?.id, userLat, userLng, myRequestsStatus: filter === 'My Requests' ? (myRequestsTab === 'Active' ? 'open' : 'fulfilled') : null })
    if (data.length > 0) {
      const avatarMap = await fetchRequestOfferAvatars(data.map(r => r.id))
      setRequests(data.map(r => ({ ...r, _offerAvatars: avatarMap[r.id] || [] })))
    } else {
      setRequests([])
    }
    setLoading(false)
  }, [filter, category, currentUser?.id, userLat, userLng, myRequestsTab])

  useEffect(() => { loadRequests() }, [loadRequests])

  // Realtime: new requests
  useEffect(() => {
    const ch = supabase.channel('requests-list')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'requests'},()=>loadRequests())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [loadRequests])

  const handleFilterChange = async (f) => {
    setFilter(f)
    setCategory(null)
    if (f === 'Near You' && userLat === null) {
      const asked = localStorage.getItem(LOC_KEY)
      if (asked !== 'denied') {
        setLocStatus('loading')
        try {
          const { lat, lng } = await requestLocation()
          setUserLat(lat); setUserLng(lng); setLocStatus('granted')
          localStorage.setItem(LOC_KEY,'granted')
          if (currentUser?.id) await saveUserLocation(currentUser.id, lat, lng)
        } catch {
          setLocStatus('denied'); localStorage.setItem(LOC_KEY,'denied')
          showToast('Location access denied')
        }
      }
    }
  }

  // Search
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      const data = await searchRequests(searchQuery)
      setSearchResults(data); setSearching(false)
    }, 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  const displayRequests = showSearch && searchQuery ? searchResults : requests

  return (
    <>
    <div style={{ paddingBottom: 'calc(var(--nav-h, 50px) + env(safe-area-inset-bottom, 0px) + 24px)', fontFamily:"'Inter',sans-serif" }}>
      {/* ── Header ── */}
      {!showSearch ? (
        <div className="page-header">
          <div>
            <div className="page-title">Requests</div>
            <div className="page-subtitle">People are looking for these items</div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button className="header-btn" onClick={()=>{ setShowSearch(true); setTimeout(()=>searchRef.current?.focus(),100) }}>
              <i className="fas fa-search" />
            </button>
            <button className="header-btn" onClick={()=>setShowFilterSheet(true)} style={{position:'relative'}}>
              <i className="fas fa-sliders" />
              {category && <span style={{position:'absolute',top:-3,right:-3,width:8,height:8,background:'#FF3366',borderRadius:'50%',border:'1.5px solid #000'}} />}
            </button>
          </div>
        </div>
      ) : (
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',borderBottom:'1px solid rgba(255,255,255,0.07)',background:'rgba(0,0,0,0.92)',backdropFilter:'blur(16px)',position:'sticky',top:0,zIndex:10}}>
          <button onClick={()=>{setShowSearch(false);setSearchQuery('')}} style={{width:36,height:36,borderRadius:'50%',background:'#1e1e1e',border:'1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#fff',flexShrink:0}}>
            <i className="fas fa-arrow-left" style={{fontSize:16}} />
          </button>
          <div style={{flex:1,position:'relative'}}>
            <i className="fas fa-search" style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontSize:13,color:'#52525B',pointerEvents:'none'}} />
            <input ref={searchRef} value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
              placeholder="Search requests..."
              style={{width:'100%',padding:'10px 36px 10px 36px',background:'#141414',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12,color:'#fff',fontSize:14,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}
            />
            {searchQuery && <button onClick={()=>setSearchQuery('')} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#52525B',padding:4}}><i className="fas fa-times" style={{fontSize:14}} /></button>}
          </div>
        </div>
      )}

      {/* ── Filter pills ── */}
      {!showSearch && (
        <div style={{display:'flex',gap:8,padding:'10px 16px 4px',overflowX:'auto',scrollbarWidth:'none'}}>
          {FILTERS.map(f => (
            <button key={f}
              className={`pill${filter===f?' active':''}`}
              onClick={()=>handleFilterChange(f)}
              style={filter===f?{}:{}}
            >
              {f === 'Near You' && locStatus==='loading' ? <><i className="fas fa-spinner fa-spin" style={{fontSize:10}} /> Near You</> : f}
            </button>
          ))}
        </div>
      )}

      {/* ── Category sub-filter (when Categories selected) ── */}
      {filter==='Categories' && !showSearch && (
        <div style={{display:'flex',gap:8,padding:'8px 16px 4px',overflowX:'auto',scrollbarWidth:'none'}}>
          {REQUEST_CATEGORIES.map(c => (
            <button key={c} onClick={()=>setCategory(cat=>cat===c?null:c)}
              style={{flexShrink:0,padding:'6px 13px',borderRadius:20,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',
                background:category===c?'rgba(255,51,102,0.15)':'#1e1e1e',
                border:`1px solid ${category===c?'#FF3366':'rgba(255,255,255,0.08)'}`,
                color:category===c?'#FF3366':'#A1A1AA',
              }}>
              {CAT_EMOJI[c]||'📦'} {c}
            </button>
          ))}
        </div>
      )}

      {/* ── My Requests Active/Completed tabs ── */}
      {filter === 'My Requests' && !showSearch && (
        <div style={{display:'flex',gap:0,margin:'8px 16px 4px',background:'#141414',borderRadius:12,padding:4,border:'1px solid rgba(255,255,255,0.07)'}}>
          {['Active','Completed'].map(tab => (
            <button key={tab}
              onClick={()=>setMyRequestsTab(tab)}
              style={{flex:1,padding:'8px',borderRadius:9,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',border:'none',background:myRequestsTab===tab?'#FF3366':'transparent',color:myRequestsTab===tab?'white':'#71717A',transition:'all 0.15s'}}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* ── Post Request banner ── */}
      {!showSearch && (
        <div style={{margin:'12px 16px',padding:'14px 16px',background:'#141414',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:42,height:42,borderRadius:'50%',background:'rgba(255,51,102,0.15)',border:'2px dashed #FF3366',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <i className="fas fa-plus" style={{color:'#FF3366',fontSize:16}} />
          </div>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:14,marginBottom:2}}>Looking for something?</div>
            <div style={{fontSize:12,color:'#A1A1AA'}}>Post a request and get offers from sellers near you</div>
          </div>
          <button onClick={()=>setShowPostModal(true)}
            style={{padding:'9px 16px',background:'linear-gradient(135deg,#FF3366,#FF6633)',border:'none',borderRadius:20,color:'white',fontSize:13,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap',boxShadow:'0 2px 14px rgba(255,51,102,0.4)',fontFamily:'inherit'}}>
            Post Request
          </button>
        </div>
      )}

      {/* ── Search loading ── */}
      {showSearch && searching && (
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:48}}>
          <i className="fas fa-spinner fa-spin" style={{fontSize:22,color:'#FF3366'}} />
        </div>
      )}

      {/* ── Search empty ── */}
      {showSearch && searchQuery && !searching && searchResults.length===0 && (
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'56px 24px',gap:10}}>
          <div style={{fontSize:44,marginBottom:4}}>🔍</div>
          <div style={{fontSize:16,fontWeight:700,color:'#A1A1AA'}}>No requests found</div>
          <div style={{fontSize:13,color:'#52525B',textAlign:'center'}}>No requests matching &ldquo;{searchQuery}&rdquo;</div>
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {!showSearch && loading && (
        <div style={{padding:'0 16px'}}>
          {[1,2,3].map(i=>(
            <div key={i} style={{height:160,background:'linear-gradient(135deg,#141414,#0d0d0d)',borderRadius:16,marginBottom:12,border:'1px solid rgba(255,255,255,0.04)',animation:'reqPulse 1.5s ease-in-out infinite',animationDelay:`${i*0.15}s`}} />
          ))}
          <style>{`@keyframes reqPulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !searching && displayRequests.length===0 && !(showSearch&&searchQuery) && (
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'56px 24px',gap:10}}>
          <div style={{fontSize:52,marginBottom:4}}>📭</div>
          <div style={{fontSize:17,fontWeight:800,color:'#fff'}}>
            {filter==='My Requests' ? `No ${myRequestsTab.toLowerCase()} requests`
             : filter==='Following' ? 'No requests from people you follow'
             : filter==='Near You' && locStatus==='denied' ? 'Location needed for Near You'
             : category ? `No ${category} requests yet`
             : 'No requests yet'}
          </div>
          <div style={{fontSize:13,color:'#52525B',textAlign:'center',lineHeight:1.6,maxWidth:280}}>
            {filter==='My Requests' ? 'Post a request to start receiving offers'
             : filter==='Near You' && locStatus==='denied'
              ? 'Enable location access to see requests from nearby buyers'
              : 'Be the first to post what you\'re looking for'}
          </div>
          {filter==='Near You' && locStatus==='denied' && (
            <button onClick={()=>{setLocStatus('idle');localStorage.removeItem(LOC_KEY);handleFilterChange('Near You')}}
              style={{marginTop:8,padding:'10px 22px',background:'linear-gradient(135deg,#D946EF,#FF3366)',border:'none',borderRadius:12,color:'white',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
              <i className="fas fa-location-dot" style={{marginRight:6}} />Try again
            </button>
          )}
        </div>
      )}

      {/* ── Request cards ── */}
      {!loading && !searching && displayRequests.map(r => (
        <RequestCard
          key={r.id}
          r={r}
          currentUser={currentUser}
          onViewOffers={()=>{ setSelectedRequest(r); setActivePage('offersInbox') }}
          onMakeOffer={()=>{ setSelectedRequest(r); setActivePage('sendOffer') }}
        />
      ))}

      {/* ── Modals ── */}
      {showPostModal && (
        <PostRequestModal
          currentUser={currentUser}
          onClose={()=>setShowPostModal(false)}
          onPosted={()=>{ loadRequests(); showToast('✅ Request posted!') }}
        />
      )}

    </div>

    {/* ── Full-screen overlays — state machine ── */}

    {activePage === 'sendOffer' && selectedRequest && (
      <SendOfferPage
        request={selectedRequest}
        currentUser={currentUser}
        onClose={() => setActivePage(null)}
        onSubmitted={() => {
          setActivePage(null)
          loadRequests()
          showToast('✅ Offer sent!')
        }}
      />
    )}

    {activePage === 'offersInbox' && selectedRequest && (
      <OffersInbox
        request={selectedRequest}
        currentUser={currentUser}
        onBack={() => setActivePage(null)}
        onViewOffer={(offer) => {
          setSelectedOffer(offer)
          setActivePage('offerDetails')
        }}
      />
    )}

    {activePage === 'offerDetails' && selectedOffer && selectedRequest && (
      <OfferDetailsPage
        offer={selectedOffer}
        request={selectedRequest}
        currentUser={currentUser}
        onBack={() => setActivePage('offersInbox')}
        onDeclined={() => setActivePage('offersInbox')}
        onAccepted={(offer) => {
          setSelectedOffer(offer)
          setActivePage('reservation')
        }}
        onOpenChat={(seller) => {
          // Close offers flow and signal parent to open inbox
          setActivePage(null)
          setSelectedRequest(null)
          setSelectedOffer(null)
          showToast('Opening chat...')
        }}
      />
    )}

    {activePage === 'reservation' && selectedOffer && selectedRequest && (
      <ReservationPage
        post={{
          id:          selectedOffer.id,
          title:       selectedRequest.title,
          description: selectedOffer.message,
          price:       selectedOffer.price,
          images:      selectedOffer.images || [],
          seller_id:   selectedOffer.seller_id,
        }}
        seller={selectedOffer.seller}
        currentUser={currentUser}
        onBack={() => setActivePage('offerDetails')}
        onConfirmed={() => {
          setActivePage(null)
          setSelectedRequest(null)
          setSelectedOffer(null)
          loadRequests()
          showToast('✅ Reservation confirmed!')
        }}
      />
    )}
    </>
  )
}

function RequestCard({ r, currentUser, onViewOffers, onMakeOffer }) {
  const buyer   = r.buyer || {}
  const color   = avatarColor(buyer.id || r.buyer_id || '')
  const initial = initials(buyer.full_name || buyer.username || 'B')
  const isBuyer = currentUser?.id === r.buyer_id
  const hasOffers = (r.offers_count || 0) > 0

  return (
    <div style={{margin:'0 16px 12px',background:'#141414',border:'1px solid rgba(255,255,255,0.07)',borderRadius:18,overflow:'hidden',transition:'transform 0.15s'}}>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'14px 14px 10px'}}>
        <div style={{width:42,height:42,borderRadius:'50%',background:color,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:15,color:'white',flexShrink:0,boxShadow:`0 0 0 3px ${color}33`,border:'2px solid #141414',overflow:'hidden'}}>
          {buyer.avatar_url ? (
            <img src={buyer.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />
          ) : (
            <span>{initial}</span>
          )}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:5,fontSize:14,fontWeight:700,overflow:'hidden'}}>
            <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{buyer.full_name || buyer.username || 'Buyer'}</span>
            {buyer.verified && <span style={{width:14,height:14,borderRadius:'50%',background:'#3B82F6',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:8,color:'white',fontWeight:900,flexShrink:0}}>✓</span>}
          </div>
          <div style={{fontSize:11,color:'#71717A',marginTop:1,display:'flex',alignItems:'center',gap:4}}>
            {buyer.location && <><i className="fas fa-location-dot" style={{fontSize:10}} />{buyer.location} · </>}{r._timeAgo}
          </div>
        </div>
        {r._distanceKm != null && (
          <div style={{display:'flex',alignItems:'center',gap:4,background:'rgba(34,197,94,0.12)',border:'1px solid rgba(34,197,94,0.25)',borderRadius:20,padding:'3px 9px',fontSize:11,fontWeight:700,color:'#22C55E',flexShrink:0}}>
            <i className="fas fa-location-dot" style={{fontSize:9}} />
            {r._distanceKm<1?`${Math.round(r._distanceKm*1000)}m`:`${r._distanceKm.toFixed(1)}km`}
          </div>
        )}
        <i className="fas fa-ellipsis-vertical" style={{color:'#52525B',cursor:'pointer',padding:'0 4px',flexShrink:0}} />
      </div>

      {/* Body */}
      <div style={{display:'flex',gap:12,padding:'0 14px 10px'}}>
        <div style={{width:76,height:76,borderRadius:12,overflow:'hidden',flexShrink:0,border:'1px solid rgba(255,255,255,0.06)',background:`linear-gradient(135deg,${color}22,${color}11)`}}>
          {r.images && r.images.length > 0 ? (
            <img src={r.images[0]} alt="Product" style={{width:'100%',height:'100%',objectFit:'cover'}} />
          ) : (
            <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:34}}>
              {CAT_EMOJI[r.category]||'📦'}
            </div>
          )}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:15,fontWeight:800,marginBottom:4,lineHeight:1.2}}>{r.title}</div>
          {r.description && <div style={{fontSize:12,color:'#A1A1AA',lineHeight:1.45,marginBottom:7,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{r.description}</div>}
          <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
            {(r.budget_min||r.budget_max) && (
              <span style={{background:'rgba(34,197,94,0.12)',color:'#22C55E',padding:'3px 8px',borderRadius:20,fontSize:11,fontWeight:600,display:'flex',alignItems:'center',gap:3}}>
                <i className="fas fa-coins" style={{fontSize:9}} />{fmtBudget(r.budget_min,r.budget_max)}
              </span>
            )}
            {r.category && <span style={{background:'rgba(124,58,237,0.12)',color:'#A855F7',padding:'3px 8px',borderRadius:20,fontSize:11,fontWeight:600}}>{r.category}</span>}
            {r.condition_pref && r.condition_pref!=='Any Condition' && <span style={{background:'rgba(255,255,255,0.06)',color:'#A1A1AA',padding:'3px 8px',borderRadius:20,fontSize:11,fontWeight:600}}>{r.condition_pref}</span>}
            {r.color_pref && <span style={{background:'rgba(255,255,255,0.06)',color:'#A1A1AA',padding:'3px 8px',borderRadius:20,fontSize:11,fontWeight:600}}>🎨 {r.color_pref}</span>}
          </div>
        </div>
      </div>

      {/* Location */}
      {r.location && (
        <div style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:'#71717A',padding:'0 14px 8px'}}>
          <i className="fas fa-location-dot" style={{fontSize:11,color:'#52525B'}} />
          {r.location} · Within {r.radius_km||20} km
        </div>
      )}

      {/* Footer */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px 14px',borderTop:'1px solid rgba(255,255,255,0.05)'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {hasOffers ? (
            <>
              <div style={{display:'flex'}}>
                {(r._offerAvatars || []).map((av, i) => (
                  <div key={i} style={{width:22,height:22,borderRadius:'50%',background:avatarColor(av.seller_id||''),border:'2px solid #141414',marginLeft:i===0?0:-7,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:'white',flexShrink:0}}>
                    {av.avatar_url
                      ? <img src={av.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                      : <span>{initials(av.full_name||av.username||'S')}</span>
                    }
                  </div>
                ))}
              </div>
              <span style={{fontSize:12,color:'#7C3AED',fontWeight:700}}>{r.offers_count} {r.offers_count===1?'offer':'offers'}</span>
            </>
          ) : (
            <span style={{fontSize:12,color:'#52525B'}}>No offers yet</span>
          )}
        </div>
        <button
          onClick={isBuyer ? onViewOffers : onMakeOffer}
          style={{padding:'8px 16px',borderRadius:20,border:`1.5px solid ${isBuyer&&hasOffers?'#7C3AED':'#FF3366'}`,background:`rgba(${isBuyer&&hasOffers?'124,58,237':'255,51,102'},0.08)`,color:isBuyer&&hasOffers?'#A855F7':'#FF3366',fontSize:12,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:5,fontFamily:'inherit'}}
        >
          {isBuyer
            ? hasOffers ? <><i className="fas fa-eye" style={{fontSize:10}} /> View Offers</> : <><i className="fas fa-clock" style={{fontSize:10}} /> Awaiting offers</>
            : <><i className="fas fa-handshake" style={{fontSize:10}} /> Make Offer</>
          }
          {isBuyer && hasOffers && <i className="fas fa-chevron-right" style={{fontSize:9}} />}
        </button>
      </div>
    </div>
  )
}
