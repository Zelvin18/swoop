/**
 * AddPostModal — three post types
 * Step 0: Type selector (Social / Sell Product / Offer Service)
 * Step 1: Media selection + editor
 * Step 2: Details (varies by type)
 */
import { useState, useRef } from 'react'
import { createPost, saveDraft, CATEGORIES, CATEGORY_EMOJI } from '../lib/feed'
import MediaEditor from './MediaEditor'

const CONDITIONS = ['Brand New','Like New','Good Condition','Fair Condition']
const SERVICE_CATS = ['Design','Tech & Dev','Marketing','Photography','Writing','Tutoring','Delivery','Cleaning','Hair & Beauty','Events','Other']
const RATE_TYPES = [
  { value:'fixed',       label:'Fixed price' },
  { value:'hourly',      label:'Per hour'    },
  { value:'starting_at', label:'Starting at' },
  { value:'negotiable',  label:'Negotiable'  },
]

function Toggle({ on, onToggle, color='#FF3366' }) {
  return (
    <div onClick={onToggle} style={{width:44,height:26,borderRadius:13,background:on?color:'rgba(255,255,255,0.1)',position:'relative',cursor:'pointer',transition:'background 0.25s',flexShrink:0,boxShadow:on?`0 0 0 4px ${color}22`:'none'}}>
      <div style={{width:20,height:20,borderRadius:'50%',background:'white',position:'absolute',top:3,left:on?21:3,transition:'left 0.25s',boxShadow:'0 1px 4px rgba(0,0,0,0.3)'}}/>
    </div>
  )
}
function FieldLabel({ children, right }) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.3)',letterSpacing:1.2,marginBottom:10}}>
      <span>{children}</span>
      {right && <span style={{fontWeight:400,color:'#52525B'}}>{right}</span>}
    </div>
  )
}

export default function AddPostModal({ onClose, showToast, currentUser }) {
  const [postType,     setPostType]     = useState(null)   // null | 'social' | 'product' | 'service'
  const [step,         setStep]         = useState('type') // 'type' | 'media' | 'editing' | 'details'
  const [mediaFiles,   setMediaFiles]   = useState([])
  const [editorResult, setEditorResult] = useState(null)
  const [posting,      setPosting]      = useState(false)

  // Social fields
  const [caption,     setCaption]     = useState('')

  // Product fields
  const [title,       setTitle]       = useState('')
  const [price,       setPrice]       = useState('')
  const [origPrice,   setOrigPrice]   = useState('')
  const [desc,        setDesc]        = useState('')
  const [category,    setCategory]    = useState('')
  const [condition,   setCondition]   = useState('Like New')
  const [brand,       setBrand]       = useState('')
  const [location,    setLocation]    = useState('')
  const [negotiable,  setNeg]         = useState(false)
  const [delivery,    setDelivery]    = useState(true)
  const [isHot,       setIsHot]       = useState(false)

  // Service fields
  const [serviceTitle,    setServiceTitle]    = useState('')
  const [serviceDesc,     setServiceDesc]     = useState('')
  const [serviceCat,      setServiceCat]      = useState('')
  const [serviceRate,     setServiceRate]     = useState('')
  const [serviceRateType, setServiceRateType] = useState('fixed')
  const [serviceFeatures, setServiceFeatures] = useState(['','',''])
  const [serviceDuration, setServiceDuration] = useState('')

  const photoRef   = useRef(null)
  const videoRef   = useRef(null)
  const galleryRef = useRef(null)

  const canPostProduct = title.trim().length >= 2 && price
  const canPostSocial  = caption.trim().length >= 1 || mediaFiles.length > 0
  const canPostService = serviceTitle.trim().length >= 2

  const handlePhotoPick = (e) => {
    const files = Array.from(e.target.files||[]).slice(0,10)
    if (!files.length) return
    // Detect photo vs video by mime type
    setMediaFiles(files.map(f=>({url:URL.createObjectURL(f),file:f,type:f.type.startsWith('video')?'video':'photo'})))
    setStep('editing')
  }
  const handleVideoRecord = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setMediaFiles([{url:URL.createObjectURL(file),file,type:'video'}])
    setStep('editing')
  }
  const handleGalleryPick = (e) => {
    const files = Array.from(e.target.files||[]).slice(0,10)
    if (!files.length) return
    setMediaFiles(files.map(f=>({url:URL.createObjectURL(f),file:f,type:f.type.startsWith('video')?'video':'photo'})))
    setStep('editing')
  }
  const removeMedia = (idx) => setMediaFiles(p=>p.filter((_,i)=>i!==idx))

  const handlePost = async () => {
    if (!currentUser) { showToast('Sign in to post'); return }
    setPosting(true)
    let post = null
    try {
      if (postType === 'social') {
        post = await createPost({
          sellerId: currentUser.id, postType: 'social',
          caption: caption.trim(),
          title: caption.trim().slice(0,60) || 'Social post',
          mediaFiles,
          filterName: editorResult?.filter || 'Original',
          musicTrackId: editorResult?.selectedTrack?.id || null,
        })
      } else if (postType === 'product') {
        post = await createPost({
          sellerId: currentUser.id, postType: 'product',
          title: title.trim(), description: desc.trim(),
          price, origPrice,
          category: category || 'Other',
          condition, brand,
          location: location || 'Kampala, Uganda',
          isNegotiable: negotiable,
          deliveryAvailable: delivery,
          isHot,
          emoji: CATEGORY_EMOJI[category] || '📦',
          mediaFiles,
          filterName: editorResult?.filter || 'Original',
          musicTrackId: editorResult?.selectedTrack?.id || null,
        })
      } else if (postType === 'service') {
        post = await createPost({
          sellerId: currentUser.id, postType: 'service',
          title: serviceTitle.trim(),
          description: serviceDesc.trim(),
          serviceCategory: serviceCat || 'Other',
          serviceRate, serviceRateType,
          serviceFeatures: serviceFeatures.filter(f=>f.trim()),
          serviceDuration,
          emoji: '🛠️',
          mediaFiles,
          filterName: editorResult?.filter || 'Original',
        })
      }
    } catch (err) {
      console.error('Post error:', err)
      showToast('Failed to post. Check console for details.')
      setPosting(false)
      return
    }
    setPosting(false)
    if (post) { showToast('Post published! 🎉'); onClose() }
    else showToast('Failed to post — run fix-schema.sql in Supabase first.')
  }

  // ── Media editor ────────────────────────────────────────────────────────
  if (step === 'editing') return (
    <MediaEditor mediaFiles={mediaFiles} onBack={()=>setStep('media')}
      onDone={result=>{setEditorResult(result);if(result.mediaFiles)setMediaFiles(result.mediaFiles);setStep('details')}}/>
  )

  // ════════════════════════════════════════
  // STEP 0 — TYPE SELECTOR
  // ════════════════════════════════════════
  if (step === 'type') return (
    <div style={S.page}>
      <div style={S.topBar}>
        <button onClick={onClose} style={S.iconBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:15,fontWeight:700,letterSpacing:'-0.3px'}}>Create</div>
        </div>
        <button style={{...S.iconBtn,background:'transparent',border:'1px solid rgba(255,255,255,0.08)'}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </button>
      </div>

      {/* Step dots */}
      <div style={{display:'flex',gap:4,justifyContent:'center',padding:'4px 0 0'}}>
        <div style={{width:20,height:3,borderRadius:2,background:'#FF3366'}}/>
        <div style={{width:20,height:3,borderRadius:2,background:'rgba(255,255,255,0.12)'}}/>
        <div style={{width:20,height:3,borderRadius:2,background:'rgba(255,255,255,0.12)'}}/>
      </div>

      {/* Hero text */}
      <div style={{padding:'28px 24px 20px',textAlign:'center'}}>
        <div style={{fontSize:26,fontWeight:900,letterSpacing:'-0.8px',lineHeight:1.2,marginBottom:10}}>
          What would you like<br/>to <span style={{color:'#FF3366'}}>share today?</span>
        </div>
        <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',lineHeight:1.6}}>
          Choose the type of post that fits what you want to share with the community.
        </div>
      </div>

      {/* Type cards */}
      <div style={{padding:'0 16px',display:'flex',flexDirection:'column',gap:12,flex:1}}>
        {[
          {
            type:'social',
            label:'Creator Post',
            badge:'Social',
            badgeColor:'#7C3AED',
            desc:'Share videos, stories, tips, reviews or just your moments.',
            chips:['Tell a story','Inspire','Connect'],
            gradient:'#141414',
            borderColor:'rgba(255,255,255,0.08)',
            icon:(
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
            ),
            iconBg:'linear-gradient(135deg,#7C3AED,#9333EA)',
          },
          {
            type:'product',
            label:'Sell Product',
            badge:'Marketplace',
            badgeColor:'#FF3366',
            desc:'List a product for sale with price, stock and delivery options.',
            chips:['Add Price','Set Stock','Get Buyers'],
            gradient:'#141414',
            borderColor:'rgba(255,255,255,0.08)',
            icon:(
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
            ),
            iconBg:'linear-gradient(135deg,#FF3366,#FF6633)',
          },
          {
            type:'service',
            label:'Offer Service',
            badge:'Services',
            badgeColor:'#F97316',
            desc:'Promote your skills or business and get more clients.',
            chips:['Any Service','Find Clients','Grow Business'],
            gradient:'#141414',
            borderColor:'rgba(255,255,255,0.08)',
            icon:(
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
            ),
            iconBg:'linear-gradient(135deg,#F97316,#EF4444)',
          },
        ].map(card => (
          <button key={card.type} onClick={()=>{setPostType(card.type);setStep('media')}} style={{
            display:'flex', alignItems:'flex-start', gap:14,
            padding:'16px', borderRadius:18, cursor:'pointer',
            background:card.gradient,
            border:`1px solid ${card.borderColor}`,
            fontFamily:'inherit', textAlign:'left',
            transition:'transform 0.15s, box-shadow 0.15s',
            position:'relative', overflow:'hidden',
          }}>
            {/* Icon */}
            <div style={{width:52,height:52,borderRadius:14,background:card.iconBg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:`0 4px 16px ${card.badgeColor}40`}}>
              {card.icon}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:5}}>
                <span style={{fontSize:16,fontWeight:800,color:'white'}}>{card.label}</span>
                <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,background:'rgba(255,255,255,0.07)',color:'rgba(255,255,255,0.5)',border:'1px solid rgba(255,255,255,0.1)'}}>{card.badge}</span>
              </div>
              <div style={{fontSize:12,color:'rgba(255,255,255,0.5)',lineHeight:1.5,marginBottom:8}}>{card.desc}</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {card.chips.map(chip=>(
                  <span key={chip} style={{fontSize:10,fontWeight:600,padding:'3px 9px',borderRadius:20,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.45)'}}>
                    {chip}
                  </span>
                ))}
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" strokeLinecap="round" style={{flexShrink:0,marginTop:4}}><path d="M9 18l6-6-6-6"/></svg>
          </button>
        ))}

        {/* Trust note */}
        <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:14,marginTop:2}}>
          <div style={{width:32,height:32,borderRadius:'50%',background:'rgba(34,197,94,0.12)',border:'1px solid rgba(34,197,94,0.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:700,color:'rgba(255,255,255,0.7)',marginBottom:2}}>Safe · Trusted · Community First</div>
            <div style={{fontSize:11,color:'#52525B',lineHeight:1.4}}>All posts are reviewed to keep Swoop safe, authentic and trustworthy.</div>
          </div>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </div>
      </div>

      <div style={{height:'calc(var(--nav-h,50px) + env(safe-area-inset-bottom,0px) + 8px)',flexShrink:0}}/>
    </div>
  )

  // ════════════════════════════════════════
  // STEP 1 — MEDIA SELECTION
  // ════════════════════════════════════════
  if (step === 'media') {
    const typeConfig = {
      social:  { accent:'#7C3AED', title:'Add to Post',    heroTitle:'Share your moment',   heroSub:'A photo or video brings your post to life.' },
      product: { accent:'#FF3366', title:'Showcase Product', heroTitle:'Showcase your item', heroSub:'Great photos can 3× your chances of selling.' },
      service: { accent:'#F97316', title:'Add Media',       heroTitle:'Show your work',      heroSub:'Portfolio images help clients trust your service.' },
    }
    const cfg = typeConfig[postType] || typeConfig.product

    return (
      <div style={S.page}>
        <input ref={videoRef} type="file" accept="video/*" capture="environment" onChange={handleVideoRecord} style={{display:'none'}}/>
        <input ref={photoRef} type="file" accept="image/*" multiple onChange={handlePhotoPick} style={{display:'none'}}/>
        <input ref={galleryRef} type="file" accept="image/*,video/*" multiple onChange={handleGalleryPick} style={{display:'none'}}/>
        <div style={S.topBar}>
          <button onClick={()=>setStep('type')} style={S.iconBtn}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <div style={{textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
            <div style={{fontSize:15,fontWeight:700,letterSpacing:'-0.3px'}}>{cfg.title}</div>
            <div style={{fontSize:10,fontWeight:600,padding:'1px 8px',borderRadius:20,background:`${cfg.accent}22`,color:cfg.accent,border:`1px solid ${cfg.accent}40`}}>
              {{social:'Social',product:'Sell Product',service:'Service'}[postType]}
            </div>
          </div>
          <div style={{width:36}}/>
        </div>

        {/* Step dots */}
        <div style={{display:'flex',gap:4,justifyContent:'center',padding:'4px 0 0'}}>
          <div style={{width:20,height:3,borderRadius:2,background:'rgba(255,255,255,0.12)'}}/>
          <div style={{width:20,height:3,borderRadius:2,background:cfg.accent}}/>
          <div style={{width:20,height:3,borderRadius:2,background:'rgba(255,255,255,0.12)'}}/>
        </div>

        <div style={{...S.mediaHero,background:`radial-gradient(ellipse at 50% 40%,${cfg.accent}10,transparent 70%)`}}>
          <div style={{position:'relative',zIndex:1,textAlign:'center'}}>
            <div style={{width:72,height:72,borderRadius:20,background:'rgba(255,255,255,0.05)',border:`1px solid ${cfg.accent}25`,backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={`${cfg.accent}99`} strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/></svg>
            </div>
            <div style={{fontSize:20,fontWeight:800,color:'white',marginBottom:6,letterSpacing:'-0.5px'}}>{cfg.heroTitle}</div>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',lineHeight:1.5,maxWidth:240}}>{cfg.heroSub}</div>
          </div>
        </div>

        <div style={S.mediaList}>
          <label style={S.mediaRow}>
            <input type="file" accept="video/*" capture="environment" onChange={handleVideoRecord} style={{display:'none'}}/>
            <div style={{...S.mediaRowIcon, background:`${cfg.accent}20`, border:`1px solid ${cfg.accent}35`}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={cfg.accent} strokeWidth="2" strokeLinecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:15,fontWeight:700}}>Record Video</div>
              <div style={{fontSize:12,color:'#71717A',marginTop:1}}>Up to 60 seconds · Best for engagement</div>
            </div>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
          </label>
          <div style={S.divider}/>
          <label style={S.mediaRow}>
            <input ref={galleryRef} type="file" accept="image/*,video/*" multiple onChange={handleGalleryPick} style={{display:'none'}}/>
            <div style={{...S.mediaRowIcon, background:`${cfg.accent}14`, border:`1px solid ${cfg.accent}30`}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={cfg.accent} strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:15,fontWeight:700}}>Choose from Gallery</div>
              <div style={{fontSize:12,color:'#71717A',marginTop:1}}>Photos &amp; videos · Up to 10 items</div>
            </div>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
          </label>
        </div>

        <div style={S.mediaFooter}>
          <button onClick={()=>setStep('details')} style={{...S.skipBtn,borderColor:`${cfg.accent}30`,color:`${cfg.accent}80`}}>
            Skip — continue without media
          </button>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════
  // STEP 2 — DETAILS (varies by type)
  // ════════════════════════════════════════

  const accentColor = {social:'#7C3AED',product:'#FF3366',service:'#F97316'}[postType]||'#FF3366'
  const detailsTitle = {social:'Your Post',product:'Product Details',service:'Service Details'}[postType]||'Details'

  return (
    <div style={S.page}>
      <div style={S.topBar}>
        <button onClick={()=>setStep('media')} style={S.iconBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <div style={{textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
          <div style={{fontSize:15,fontWeight:700}}>{detailsTitle}</div>
          <div style={{fontSize:10,fontWeight:600,padding:'1px 8px',borderRadius:20,background:`${accentColor}22`,color:accentColor,border:`1px solid ${accentColor}40`}}>
            {{social:'Social',product:'Sell Product',service:'Service'}[postType]}
          </div>
        </div>
        {/* Step dots */}
        <div style={{display:'flex',gap:4,alignItems:'center'}}>
          <div style={{width:6,height:6,borderRadius:'50%',background:'rgba(255,255,255,0.2)'}}/>
          <div style={{width:6,height:6,borderRadius:'50%',background:'rgba(255,255,255,0.2)'}}/>
          <div style={{width:6,height:6,borderRadius:'50%',background:accentColor}}/>
        </div>
      </div>

      <div style={S.detailsBody}>

        {/* Media preview strip */}
        {mediaFiles.length > 0 && (
          <div style={{padding:'12px 16px 8px'}}>
            <div style={{display:'flex',gap:8,overflowX:'auto',scrollbarWidth:'none'}}>
              {mediaFiles.map((m,i)=>(
                <div key={i} style={{position:'relative',flexShrink:0,width:i===0?96:68,height:i===0?96:68,borderRadius:i===0?13:9,overflow:'hidden',border:i===0?`2px solid ${accentColor}60`:'1px solid rgba(255,255,255,0.1)'}}>
                  {m.type==='video'?<video src={m.url} style={{width:'100%',height:'100%',objectFit:'cover'}} muted/>:<img src={m.url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
                  {i===0&&<div style={{position:'absolute',bottom:0,left:0,right:0,padding:'3px 6px',background:'linear-gradient(transparent,rgba(0,0,0,0.7)',fontSize:8,fontWeight:700,color:'rgba(255,255,255,0.6)',letterSpacing:1}}>COVER</div>}
                  <button onClick={()=>removeMedia(i)} style={{position:'absolute',top:3,right:3,width:16,height:16,borderRadius:'50%',background:'rgba(0,0,0,0.7)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'white'}}>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SOCIAL DETAILS ── */}
        {postType === 'social' && (
          <>
            <div style={S.section}>
              <FieldLabel right={`${caption.length}/500`}>CAPTION</FieldLabel>
              <textarea value={caption} onChange={e=>setCaption(e.target.value)} rows={4} maxLength={500}
                placeholder="What's on your mind? Share a thought, tip, or story..."
                style={{...S.input,resize:'none',lineHeight:1.6,fontSize:15}}/>
            </div>
            <div style={S.section}>
              <FieldLabel>LOCATION</FieldLabel>
              <div style={{position:'relative'}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="2" style={{position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Add your location (optional)"
                  style={{...S.input,paddingLeft:36,margin:0}}/>
              </div>
            </div>
            <div style={{padding:'0 16px 16px'}}>
              <div style={{padding:'12px 14px',background:'rgba(124,58,237,0.06)',border:'1px solid rgba(124,58,237,0.15)',borderRadius:12,fontSize:12,color:'rgba(255,255,255,0.5)',lineHeight:1.5}}>
                💡 Social posts appear in the feed. Add a photo or video above to increase reach.
              </div>
            </div>
          </>
        )}

        {/* ── PRODUCT DETAILS ── */}
        {postType === 'product' && (
          <>
            <div style={S.section}>
              <FieldLabel right={`${title.length}/80`}>ITEM NAME <span style={{color:'#FF3366'}}>*</span></FieldLabel>
              <input value={title} onChange={e=>setTitle(e.target.value)} maxLength={80} placeholder="What are you selling?" style={S.input}/>
            </div>
            <div style={S.section}>
              <FieldLabel>PRICING <span style={{color:'#FF3366'}}>*</span></FieldLabel>
              <div style={{display:'flex',gap:10}}>
                <div style={{flex:1,position:'relative'}}>
                  <div style={S.inputPrefix}>UGX</div>
                  <input type="number" value={price} onChange={e=>setPrice(e.target.value)} placeholder="Selling price" style={{...S.input,paddingLeft:48,fontWeight:700}}/>
                </div>
                <div style={{flex:1,position:'relative'}}>
                  <div style={S.inputPrefix}>UGX</div>
                  <input type="number" value={origPrice} onChange={e=>setOrigPrice(e.target.value)} placeholder="Was (optional)" style={{...S.input,paddingLeft:48,color:'#71717A'}}/>
                </div>
              </div>
              {origPrice&&price&&Number(origPrice)>Number(price)&&(
                <div style={{marginTop:6,display:'flex',alignItems:'center',gap:5}}>
                  <div style={{width:7,height:7,borderRadius:'50%',background:'#22C55E'}}/>
                  <span style={{fontSize:11,color:'#22C55E',fontWeight:600}}>{Math.round((1-Number(price)/Number(origPrice))*100)}% discount will show</span>
                </div>
              )}
            </div>
            <div style={S.section}>
              <FieldLabel>CATEGORY</FieldLabel>
              <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
                {CATEGORIES.filter(c=>c!=='All').map(c=>(
                  <button key={c} onClick={()=>setCategory(ct=>ct===c?'':c)} style={{padding:'7px 13px',borderRadius:20,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',background:category===c?'#FF3366':'rgba(255,255,255,0.05)',border:`1px solid ${category===c?'#FF3366':'rgba(255,255,255,0.08)'}`,color:category===c?'white':'#A1A1AA',transition:'all 0.15s'}}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div style={{display:'flex',gap:10,padding:'0 16px 16px'}}>
              <div style={{flex:1}}>
                <FieldLabel>CONDITION</FieldLabel>
                <div style={{position:'relative'}}>
                  <select value={condition} onChange={e=>setCondition(e.target.value)} style={{...S.input,paddingRight:32,appearance:'none',margin:0}}>
                    {CONDITIONS.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="2.5" style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}><path d="M6 9l6 6 6-6"/></svg>
                </div>
              </div>
              <div style={{flex:1}}>
                <FieldLabel>BRAND</FieldLabel>
                <input value={brand} onChange={e=>setBrand(e.target.value)} placeholder="e.g. Apple, Nike" style={{...S.input,margin:0}}/>
              </div>
            </div>
            <div style={S.section}>
              <FieldLabel>DESCRIPTION</FieldLabel>
              <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={3} maxLength={500} placeholder="Describe your item — specs, condition details, what's included..." style={{...S.input,resize:'none',lineHeight:1.55}}/>
            </div>
            <div style={S.section}>
              <FieldLabel>LOCATION</FieldLabel>
              <input value={location} onChange={e=>setLocation(e.target.value)} placeholder="City, e.g. Kampala" style={{...S.input,margin:0}}/>
            </div>
            <div style={{padding:'0 16px 16px',display:'flex',flexDirection:'column',gap:1}}>
              {[{key:'neg',label:'Negotiable',sub:'Buyers can make offers',val:negotiable,set:()=>setNeg(n=>!n),color:'#22C55E'},{key:'del',label:'Delivery Available',sub:'Ship or deliver to buyers',val:delivery,set:()=>setDelivery(d=>!d),color:'#3B82F6'},{key:'hot',label:'Hot Deal',sub:'Shows Hot Deal badge on your post',val:isHot,set:()=>setIsHot(h=>!h),color:'#FF3366'}].map((t,i,arr)=>(
                <div key={t.key} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'13px 14px',background:'rgba(255,255,255,0.03)',borderTop:'1px solid rgba(255,255,255,0.05)',borderBottom:i===arr.length-1?'1px solid rgba(255,255,255,0.05)':'none'}}>
                  <div><div style={{fontSize:14,fontWeight:600,color:'white'}}>{t.label}</div><div style={{fontSize:11,color:'#52525B',marginTop:1}}>{t.sub}</div></div>
                  <Toggle on={t.val} onToggle={t.set} color={t.color}/>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── SERVICE DETAILS ── */}
        {postType === 'service' && (
          <>
            <div style={S.section}>
              <FieldLabel right={`${serviceTitle.length}/80`}>SERVICE TITLE <span style={{color:'#F97316'}}>*</span></FieldLabel>
              <input value={serviceTitle} onChange={e=>setServiceTitle(e.target.value)} maxLength={80} placeholder="e.g. Professional Website Design for Your Business" style={S.input}/>
            </div>
            <div style={S.section}>
              <FieldLabel>CATEGORY</FieldLabel>
              <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
                {SERVICE_CATS.map(c=>(
                  <button key={c} onClick={()=>setServiceCat(sc=>sc===c?'':c)} style={{padding:'7px 13px',borderRadius:20,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',background:serviceCat===c?'#F97316':'rgba(255,255,255,0.05)',border:`1px solid ${serviceCat===c?'#F97316':'rgba(255,255,255,0.08)'}`,color:serviceCat===c?'white':'#A1A1AA',transition:'all 0.15s'}}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div style={S.section}>
              <FieldLabel>PRICING</FieldLabel>
              <div style={{display:'flex',gap:10}}>
                <div style={{flex:1,position:'relative'}}>
                  <div style={S.inputPrefix}>UGX</div>
                  <input type="number" value={serviceRate} onChange={e=>setServiceRate(e.target.value)} placeholder="Rate" style={{...S.input,paddingLeft:48,fontWeight:700}}/>
                </div>
                <div style={{flex:1,position:'relative'}}>
                  <select value={serviceRateType} onChange={e=>setServiceRateType(e.target.value)} style={{...S.input,paddingRight:28,appearance:'none',margin:0}}>
                    {RATE_TYPES.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="2.5" style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}><path d="M6 9l6 6 6-6"/></svg>
                </div>
              </div>
            </div>
            <div style={S.section}>
              <FieldLabel>WHAT&apos;S INCLUDED <span style={{fontWeight:400,color:'#52525B'}}>(up to 3 key points)</span></FieldLabel>
              {serviceFeatures.map((f,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                  <div style={{width:20,height:20,borderRadius:'50%',background:`rgba(249,115,22,0.15)`,border:'1px solid rgba(249,115,22,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:800,color:'#F97316',flexShrink:0}}>{i+1}</div>
                  <input value={f} onChange={e=>setServiceFeatures(prev=>{const n=[...prev];n[i]=e.target.value;return n})} placeholder={['e.g. Modern responsive design','e.g. Mobile friendly','e.g. Fast delivery'][i]} style={{...S.input,margin:0,flex:1}}/>
                </div>
              ))}
            </div>
            <div style={S.section}>
              <FieldLabel>DESCRIPTION</FieldLabel>
              <textarea value={serviceDesc} onChange={e=>setServiceDesc(e.target.value)} rows={3} maxLength={500} placeholder="Describe what you offer, your experience, and why clients should choose you..." style={{...S.input,resize:'none',lineHeight:1.55}}/>
            </div>
            <div style={S.section}>
              <FieldLabel>DELIVERY TIME</FieldLabel>
              <input value={serviceDuration} onChange={e=>setServiceDuration(e.target.value)} placeholder="e.g. 3–5 business days" style={{...S.input,margin:0}}/>
            </div>
          </>
        )}

        <div style={{height:8}}/>
      </div>

      {/* Footer */}
      <div style={S.footer}>
        <button onClick={async()=>{
          if (!title.trim()&&postType==='product'){showToast('Add a title first');return}
          if (!serviceTitle.trim()&&postType==='service'){showToast('Add a title first');return}
          setPosting(true)
          await saveDraft({sellerId:currentUser?.id,postType,title:postType==='product'?title:postType==='service'?serviceTitle:caption,mediaFiles})
          setPosting(false)
          showToast('Draft saved!'); onClose()
        }} style={S.draftBtn}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v14a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>
          Save Draft
        </button>
        <button onClick={handlePost}
          disabled={posting||(postType==='product'&&!canPostProduct)||(postType==='social'&&!canPostSocial)||(postType==='service'&&!canPostService)}
          style={{...S.postBtn,background:`linear-gradient(135deg,${accentColor},${accentColor}cc)`,opacity:posting?0.5:1,boxShadow:`0 4px 20px ${accentColor}40`}}>
          {posting?<><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{animation:'spin 1s linear infinite'}}><circle cx="12" cy="12" r="10"/></svg> Posting...</>:<>Post <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>}
        </button>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

const S = {
  page:        {position:'fixed',inset:0,zIndex:300,background:'#000',display:'flex',flexDirection:'column',fontFamily:"'Inter',sans-serif",color:'#fff'},
  topBar:      {display:'flex',alignItems:'center',justifyContent:'space-between',padding:'13px 16px 8px',background:'rgba(0,0,0,0.92)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(255,255,255,0.06)',flexShrink:0,position:'sticky',top:0,zIndex:10},
  iconBtn:     {width:36,height:36,borderRadius:'50%',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.09)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'},
  mediaHero:   {flex:1,position:'relative',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',minHeight:0,background:'#000'},
  mediaList:   {padding:0,borderTop:'1px solid rgba(255,255,255,0.06)',flexShrink:0},
  mediaRow:    {display:'flex',alignItems:'center',gap:14,padding:'16px 20px',cursor:'pointer',transition:'background 0.15s'},
  mediaRowIcon:{width:44,height:44,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0},
  divider:     {height:1,background:'rgba(255,255,255,0.05)',margin:'0 20px'},
  mediaFooter: {padding:'12px 20px',paddingBottom:'calc(var(--nav-h,50px) + env(safe-area-inset-bottom,0px) + 12px)',flexShrink:0},
  skipBtn:     {width:'100%',padding:'13px',background:'transparent',border:'1px solid',borderRadius:12,fontSize:14,fontWeight:500,cursor:'pointer',fontFamily:'inherit',letterSpacing:'-0.2px'},
  detailsBody: {flex:1,overflowY:'auto',scrollbarWidth:'none'},
  section:     {padding:'0 16px 16px'},
  input:       {width:'100%',padding:'13px 14px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,color:'#fff',fontSize:14,outline:'none',fontFamily:'inherit',boxSizing:'border-box',transition:'border-color 0.2s'},
  inputPrefix: {position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.25)',pointerEvents:'none'},
  footer:      {padding:'12px 16px',paddingBottom:'calc(var(--nav-h,50px) + env(safe-area-inset-bottom,0px) + 12px)',background:'rgba(0,0,0,0.95)',backdropFilter:'blur(20px)',borderTop:'1px solid rgba(255,255,255,0.07)',flexShrink:0,display:'flex',gap:10},
  draftBtn:    {flex:1,padding:'13px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12,color:'rgba(255,255,255,0.5)',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:6},
  postBtn:     {flex:2,padding:'13px',border:'none',borderRadius:12,color:'white',fontSize:15,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8,transition:'opacity 0.2s',letterSpacing:'-0.2px'},
}
