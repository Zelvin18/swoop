import { useState, useRef } from 'react'
import { createPost, CATEGORIES, CATEGORY_EMOJI } from '../lib/feed'

const CONDITIONS = ['Brand New', 'Used – Like New', 'Used – Good', 'Used – Fair']

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ on, onToggle, color = '#22C55E' }) {
  return (
    <div onClick={onToggle} style={{ width: 40, height: 22, borderRadius: 20, background: on ? color : '#1e1e1e', border: `1px solid ${on ? color : 'rgba(255,255,255,0.1)'}`, position: 'relative', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}>
      <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: on ? 20 : 2, transition: 'left 0.2s' }} />
    </div>
  )
}

// ── Field label ───────────────────────────────────────────────────────────────
function FieldLabel({ children, right }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, fontWeight: 700, color: '#A1A1AA', marginBottom: 7, letterSpacing: 0.3 }}>
      <span>{children}</span>
      {right && <span style={{ fontWeight: 400, color: '#52525B' }}>{right}</span>}
    </div>
  )
}

export default function AddPostModal({ onClose, showToast, currentUser }) {
  const [step,        setStep]        = useState('media')  // 'media' | 'details'
  const [mediaType,   setMediaType]   = useState(null)     // null | 'video' | 'photos'
  const [mediaFiles,  setMediaFiles]  = useState([])
  const [title,       setTitle]       = useState('')
  const [price,       setPrice]       = useState('')
  const [origPrice,   setOrigPrice]   = useState('')
  const [desc,        setDesc]        = useState('')
  const [category,    setCategory]    = useState('')
  const [condition,   setCondition]   = useState('Used – Like New')
  const [brand,       setBrand]       = useState('')
  const [location,    setLocation]    = useState('')
  const [negotiable,  setNeg]         = useState(false)
  const [delivery,    setDelivery]    = useState(true)
  const [isHot,       setIsHot]       = useState(false)
  const [posting,     setPosting]     = useState(false)
  const videoRef  = useRef(null)
  const photoRef  = useRef(null)

  const canPost = title.trim().length >= 2 && price

  // ── Media handlers ────────────────────────────────────────────────────────
  const handlePhotoPick = (e) => {
    const files = Array.from(e.target.files || []).slice(0, 10)
    if (!files.length) return
    const previews = files.map(f => ({ url: URL.createObjectURL(f), file: f, type: 'photo' }))
    setMediaFiles(previews)
    setMediaType('photos')
    setStep('details')
  }

  const handleVideoRecord = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setMediaFiles([{ url: URL.createObjectURL(file), file, type: 'video' }])
    setMediaType('video')
    setStep('details')
  }

  const removeMedia = (idx) => setMediaFiles(prev => prev.filter((_,i) => i !== idx))

  // ── Submit ────────────────────────────────────────────────────────────────
  const handlePost = async () => {
    if (!canPost || !currentUser) { showToast('Add a title and price first'); return }
    setPosting(true)
    const post = await createPost({
      sellerId: currentUser.id,
      title: title.trim(),
      description: desc.trim(),
      price, origPrice,
      category: category || 'Other',
      condition, brand,
      location: location || currentUser?.user_metadata?.location || 'Kampala, Uganda',
      isNegotiable: negotiable,
      deliveryAvailable: delivery,
      isHot,
      emoji: CATEGORY_EMOJI[category] || '📦',
    })
    setPosting(false)
    if (post) { showToast('🚀 Post published successfully!'); onClose() }
    else      showToast('Failed to post. Try again.')
  }

  // ════════════════════════════════════════
  // STEP 1 — MEDIA
  // Full-screen TikTok-style camera/upload
  // ════════════════════════════════════════
  if (step === 'media') return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.mediaHeader}>
        <button onClick={onClose} style={S.closeBtn}><i className="fas fa-times" style={{fontSize:18}} /></button>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:16,fontWeight:800}}>New Post</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',marginTop:1}}>Sell faster, reach more buyers</div>
        </div>
        <div style={{width:36}} />
      </div>

      {/* Camera area — hero zone */}
      <div style={S.cameraZone}>
        {/* Background gradient */}
        <div style={{position:'absolute',inset:0,background:'linear-gradient(160deg,#0a0010,#1a0025,#000)',zIndex:0}} />

        {/* Center content */}
        <div style={{position:'relative',zIndex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',gap:8}}>
          <div style={{fontSize:72,opacity:0.2}}>🛍️</div>
          <div style={{fontSize:15,fontWeight:700,color:'rgba(255,255,255,0.4)'}}>Choose how to showcase your item</div>
        </div>
      </div>

      {/* 3 media options */}
      <div style={S.mediaOptions}>
        {/* Record Video */}
        <label style={S.mediaCard}>
          <input ref={videoRef} type="file" accept="video/*" capture="environment" onChange={handleVideoRecord} style={{display:'none'}} />
          <div style={{...S.mediaIconCircle, background:'linear-gradient(135deg,#EF4444,#DC2626)'}}>
            <i className="fas fa-video" style={{fontSize:26,color:'white'}} />
          </div>
          <div style={S.mediaCardTitle}>Record Video</div>
          <div style={S.mediaCardSub}>Up to 60 seconds</div>
          <div style={S.mediaCardBadge}>🎬 Best for sales</div>
        </label>

        {/* Add Photos */}
        <label style={S.mediaCard}>
          <input ref={photoRef} type="file" accept="image/*" multiple onChange={handlePhotoPick} style={{display:'none'}} />
          <div style={{...S.mediaIconCircle, background:'linear-gradient(135deg,#D946EF,#9333EA)'}}>
            <i className="fas fa-images" style={{fontSize:26,color:'white'}} />
          </div>
          <div style={S.mediaCardTitle}>Add Photos</div>
          <div style={S.mediaCardSub}>Up to 10 photos</div>
          <div style={S.mediaCardBadge}>📸 Quick &amp; easy</div>
        </label>

        {/* AI Enhance — coming soon */}
        <div style={{...S.mediaCard, opacity:0.55, cursor:'default'}} onClick={() => showToast('✨ AI Enhance coming soon!')}>
          <div style={{...S.mediaIconCircle, background:'linear-gradient(135deg,#F59E0B,#D97706)'}}>
            <i className="fas fa-wand-magic-sparkles" style={{fontSize:26,color:'white'}} />
          </div>
          <div style={S.mediaCardTitle}>AI Enhance</div>
          <div style={S.mediaCardSub}>Make it stand out</div>
          <div style={{...S.mediaCardBadge, background:'rgba(245,158,11,0.15)',color:'#F59E0B',borderColor:'rgba(245,158,11,0.3)'}}>✨ Coming soon</div>
        </div>
      </div>

      {/* Skip media — go straight to details */}
      <div style={{padding:'0 20px 8px',paddingBottom:'calc(var(--nav-h,50px) + env(safe-area-inset-bottom,0px) + 8px)'}}>
        <button onClick={() => setStep('details')} style={S.skipBtn}>
          Continue without media <i className="fas fa-arrow-right" style={{fontSize:12}} />
        </button>
      </div>
    </div>
  )

  // ════════════════════════════════════════
  // STEP 2 — DETAILS
  // ════════════════════════════════════════
  return (
    <div style={S.page}>
      {/* Sticky header */}
      <div style={S.detailsHeader}>
        <button onClick={() => setStep('media')} style={S.backBtn}>
          <i className="fas fa-arrow-left" style={{fontSize:16}} />
        </button>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:16,fontWeight:800}}>Post Details</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.45)',marginTop:1}}>Tell buyers about your item</div>
        </div>
        <div style={{width:36}} />
      </div>

      {/* Scrollable body */}
      <div style={S.detailsBody}>

        {/* ── Media preview strip ── */}
        {mediaFiles.length > 0 && (
          <div style={{padding:'10px 16px 4px'}}>
            <div style={{display:'flex',gap:8,overflowX:'auto',scrollbarWidth:'none'}}>
              {mediaFiles.map((m,i) => (
                <div key={i} style={{position:'relative',flexShrink:0,width:80,height:80,borderRadius:10,overflow:'hidden',border:'2px solid rgba(255,255,255,0.12)'}}>
                  {m.type==='video'
                    ? <video src={m.url} style={{width:'100%',height:'100%',objectFit:'cover'}} muted />
                    : <img src={m.url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                  }
                  {i===0 && <div style={{position:'absolute',bottom:3,left:3,background:'rgba(0,0,0,0.7)',fontSize:9,fontWeight:800,color:'white',padding:'1px 5px',borderRadius:5}}>COVER</div>}
                  <button onClick={()=>removeMedia(i)} style={{position:'absolute',top:3,right:3,width:18,height:18,borderRadius:'50%',background:'rgba(0,0,0,0.7)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:9}}>✕</button>
                </div>
              ))}
              {/* Add more */}
              {mediaType==='photos' && mediaFiles.length<10 && (
                <label style={{flexShrink:0,width:80,height:80,borderRadius:10,background:'#1e1e1e',border:'1.5px dashed rgba(255,255,255,0.15)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4,cursor:'pointer'}}>
                  <input type="file" accept="image/*" multiple onChange={handlePhotoPick} style={{display:'none'}} />
                  <i className="fas fa-plus" style={{fontSize:18,color:'#52525B'}} />
                  <span style={{fontSize:10,color:'#52525B'}}>Add more</span>
                </label>
              )}
            </div>
          </div>
        )}

        {/* ── Title ── */}
        <div style={S.field}>
          <FieldLabel right={`${title.length}/80`}>Title <span style={{color:'#FF3366'}}>*</span></FieldLabel>
          <input value={title} onChange={e=>setTitle(e.target.value)} maxLength={80}
            placeholder="e.g. iPhone 14 Pro Max 256GB – Deep Purple"
            style={S.input} />
        </div>

        {/* ── Price row ── */}
        <div style={{display:'flex',gap:10,padding:'0 16px 14px'}}>
          <div style={{flex:1}}>
            <FieldLabel>Price <span style={{color:'#FF3366'}}>*</span></FieldLabel>
            <div style={S.priceWrap}>
              <span style={S.currLabel}>UGX</span>
              <input type="number" value={price} onChange={e=>setPrice(e.target.value)} placeholder="0"
                style={{...S.input,paddingLeft:50,fontWeight:800,fontSize:16,margin:0}} />
            </div>
          </div>
          <div style={{flex:1}}>
            <FieldLabel>Original price</FieldLabel>
            <div style={S.priceWrap}>
              <span style={S.currLabel}>UGX</span>
              <input type="number" value={origPrice} onChange={e=>setOrigPrice(e.target.value)} placeholder="0"
                style={{...S.input,paddingLeft:50,margin:0,color:'#71717A'}} />
            </div>
          </div>
        </div>

        {/* Negotiable toggle */}
        <div style={S.toggleRow}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:32,height:32,borderRadius:8,background:'rgba(34,197,94,0.12)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <i className="fas fa-handshake" style={{fontSize:14,color:'#22C55E'}} />
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:600}}>Negotiable</div>
              <div style={{fontSize:11,color:'#71717A'}}>Buyers can make offers</div>
            </div>
          </div>
          <Toggle on={negotiable} onToggle={()=>setNeg(n=>!n)} />
        </div>

        {/* ── Category ── */}
        <div style={S.field}>
          <FieldLabel>Category</FieldLabel>
          <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
            {CATEGORIES.filter(c=>c!=='All').map(c => (
              <button key={c} onClick={()=>setCategory(cat=>cat===c?'':c)}
                style={{padding:'7px 13px',borderRadius:20,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',
                  background:category===c?'rgba(255,51,102,0.15)':'#1e1e1e',
                  border:`1px solid ${category===c?'#FF3366':'rgba(255,255,255,0.08)'}`,
                  color:category===c?'#FF3366':'#A1A1AA',
                  display:'flex',alignItems:'center',gap:5,
                }}>
                <span style={{fontSize:13}}>{CATEGORY_EMOJI[c]||'📦'}</span> {c}
              </button>
            ))}
          </div>
        </div>

        {/* ── Condition + Brand ── */}
        <div style={{display:'flex',gap:10,padding:'0 16px 14px'}}>
          <div style={{flex:1}}>
            <FieldLabel>Condition</FieldLabel>
            <div style={{position:'relative'}}>
              <select value={condition} onChange={e=>setCondition(e.target.value)}
                style={{...S.input,paddingRight:32,appearance:'none',margin:0}}>
                {CONDITIONS.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
              <i className="fas fa-chevron-down" style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',fontSize:11,color:'#52525B',pointerEvents:'none'}} />
            </div>
          </div>
          <div style={{flex:1}}>
            <FieldLabel>Brand</FieldLabel>
            <input value={brand} onChange={e=>setBrand(e.target.value)} placeholder="e.g. Apple, Nike"
              style={{...S.input,margin:0}} />
          </div>
        </div>

        {/* ── Description ── */}
        <div style={S.field}>
          <FieldLabel right={`${desc.length}/300`}>Description</FieldLabel>
          <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={3} maxLength={300}
            placeholder="Describe your item — condition details, what's included, any defects..."
            style={{...S.input,resize:'none',lineHeight:1.55}} />
        </div>

        {/* ── Location ── */}
        <div style={S.field}>
          <FieldLabel>Location</FieldLabel>
          <div style={{position:'relative'}}>
            <i className="fas fa-location-dot" style={{position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',fontSize:13,color:'#52525B',pointerEvents:'none'}} />
            <input value={location} onChange={e=>setLocation(e.target.value)}
              placeholder="e.g. Kampala, Uganda"
              style={{...S.input,paddingLeft:36,margin:0}} />
          </div>
        </div>

        {/* ── Delivery + Hot deal toggles ── */}
        <div style={{padding:'0 16px 6px',display:'flex',flexDirection:'column',gap:8}}>
          <div style={S.toggleRow}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:32,height:32,borderRadius:8,background:'rgba(59,130,246,0.12)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <i className="fas fa-truck" style={{fontSize:14,color:'#3B82F6'}} />
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:600}}>Delivery Available</div>
                <div style={{fontSize:11,color:'#71717A'}}>Offer delivery to buyers</div>
              </div>
            </div>
            <Toggle on={delivery} onToggle={()=>setDelivery(d=>!d)} color="#3B82F6" />
          </div>
          <div style={S.toggleRow}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:32,height:32,borderRadius:8,background:'rgba(255,51,102,0.12)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <span style={{fontSize:16}}>🔥</span>
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:600}}>Mark as Hot Deal</div>
                <div style={{fontSize:11,color:'#71717A'}}>Shows a Hot Deal badge on your post</div>
              </div>
            </div>
            <Toggle on={isHot} onToggle={()=>setIsHot(h=>!h)} color="#FF3366" />
          </div>
        </div>

        {/* Safety note */}
        <div style={{margin:'8px 16px 4px',padding:'11px 14px',background:'rgba(34,197,94,0.06)',border:'1px solid rgba(34,197,94,0.15)',borderRadius:12,display:'flex',alignItems:'center',gap:9}}>
          <i className="fas fa-shield-halved" style={{fontSize:15,color:'#22C55E',flexShrink:0}} />
          <div style={{fontSize:11,color:'#71717A',lineHeight:1.5}}>
            All posts are reviewed. Never share personal financial details in your listing.
          </div>
        </div>

        <div style={{height:8}} />
      </div>

      {/* ── Footer ── */}
      <div style={S.footer}>
        <div style={{display:'flex',gap:10}}>
          <button onClick={onClose} style={S.draftBtn}>
            <i className="fas fa-floppy-disk" style={{fontSize:13}} /> Save Draft
          </button>
          <button onClick={handlePost} disabled={posting||!canPost}
            style={{...S.postBtn, opacity: posting||!canPost ? 0.55 : 1}}>
            {posting
              ? <><i className="fas fa-spinner fa-spin" style={{fontSize:14}} /> Posting...</>
              : <><i className="fas fa-paper-plane" style={{fontSize:14}} /> Post Now</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page: {
    position: 'fixed', inset: 0, zIndex: 300,
    background: '#000', display: 'flex', flexDirection: 'column',
    fontFamily: "'Inter',sans-serif", color: '#fff',
  },

  // Media step
  mediaHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 16px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    flexShrink: 0, background: '#000',
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: '50%',
    background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: '#fff',
  },
  cameraZone: {
    flex: 1, position: 'relative', overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: 0,
  },
  mediaOptions: {
    display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
    gap: 10, padding: '14px 16px 10px', flexShrink: 0,
  },
  mediaCard: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    padding: '18px 10px 14px',
    background: '#141414', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16, cursor: 'pointer', textDecoration: 'none',
  },
  mediaIconCircle: {
    width: 56, height: 56, borderRadius: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
  },
  mediaCardTitle: { fontSize: 13, fontWeight: 800, color: '#fff', textAlign: 'center' },
  mediaCardSub:   { fontSize: 10, color: '#71717A', textAlign: 'center' },
  mediaCardBadge: {
    fontSize: 9, fontWeight: 700, color: '#FF3366',
    background: 'rgba(255,51,102,0.1)', border: '1px solid rgba(255,51,102,0.2)',
    padding: '2px 7px', borderRadius: 20, textAlign: 'center',
  },
  skipBtn: {
    width: '100%', padding: '13px',
    background: 'transparent', border: '1.5px solid rgba(255,255,255,0.1)',
    borderRadius: 12, color: '#A1A1AA', fontSize: 14, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    transition: 'border-color 0.2s',
  },

  // Details step
  detailsHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px 10px',
    background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(16px)',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    position: 'sticky', top: 0, zIndex: 10, flexShrink: 0,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: '50%',
    background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: '#fff',
  },
  detailsBody: {
    flex: 1, overflowY: 'auto', scrollbarWidth: 'none',
  },
  field: { padding: '0 16px 14px' },
  input: {
    width: '100%', padding: '12px 14px',
    background: '#141414', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, color: '#fff', fontSize: 14,
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
    marginBottom: 0,
  },
  priceWrap: { position: 'relative' },
  currLabel: {
    position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
    fontSize: 11, fontWeight: 800, color: '#52525B', pointerEvents: 'none',
  },
  toggleRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '11px 14px', background: '#141414',
    border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12,
  },
  footer: {
    padding: '12px 16px',
    paddingBottom: 'calc(var(--nav-h,50px) + env(safe-area-inset-bottom,0px) + 12px)',
    background: 'rgba(0,0,0,0.97)', backdropFilter: 'blur(16px)',
    borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0,
  },
  draftBtn: {
    flex: 1, padding: '13px 14px',
    background: '#141414', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 12, color: '#A1A1AA', fontSize: 14, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  postBtn: {
    flex: 2, padding: '13px 14px',
    background: 'linear-gradient(135deg,#D946EF,#FF3366,#FB923C)',
    border: 'none', borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 800,
    cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    boxShadow: '0 4px 20px rgba(255,51,102,0.4)', transition: 'opacity 0.2s',
  },
}
