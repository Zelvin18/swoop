import { useState, useRef } from 'react'
import { createPost, saveDraft, CATEGORIES, CATEGORY_EMOJI } from '../lib/feed'
import MediaEditor from './MediaEditor'

const CONDITIONS  = ['Brand New', 'Like New', 'Good Condition', 'Fair Condition']
const COND_LABELS = { 'Brand New':'Never used', 'Like New':'Minimal wear', 'Good Condition':'Some signs of use', 'Fair Condition':'Noticeable wear' }

function Toggle({ on, onToggle, color='#FF3366' }) {
  return (
    <div onClick={onToggle} style={{width:44,height:26,borderRadius:13,background:on?color:'rgba(255,255,255,0.1)',position:'relative',cursor:'pointer',transition:'background 0.25s',flexShrink:0,boxShadow:on?`0 0 0 4px ${color}22`:'none'}}>
      <div style={{width:20,height:20,borderRadius:'50%',background:'white',position:'absolute',top:3,left:on?21:3,transition:'left 0.25s',boxShadow:'0 1px 4px rgba(0,0,0,0.3)'}} />
    </div>
  )
}

export default function AddPostModal({ onClose, showToast, currentUser }) {
  const [step,       setStep]       = useState('media')  // 'media' | 'editing' | 'details'
  const [mediaFiles, setMediaFiles] = useState([])
  const [mediaType,  setMediaType]  = useState(null)
  const [editorResult, setEditorResult] = useState(null)  // from MediaEditor
  const [title,      setTitle]      = useState('')
  const [price,      setPrice]      = useState('')
  const [origPrice,  setOrigPrice]  = useState('')
  const [desc,       setDesc]       = useState('')
  const [category,   setCategory]   = useState('')
  const [condition,  setCondition]  = useState('Like New')
  const [brand,      setBrand]      = useState('')
  const [location,   setLocation]   = useState('')
  const [negotiable, setNeg]        = useState(false)
  const [delivery,   setDelivery]   = useState(true)
  const [isHot,      setIsHot]      = useState(false)
  const [posting,    setPosting]    = useState(false)
  const photoRef = useRef(null)
  const videoRef = useRef(null)

  const canPost = title.trim().length >= 2 && price

  const handlePhotoPick = (e) => {
    const files = Array.from(e.target.files||[]).slice(0,10)
    if (!files.length) return
    setMediaFiles(files.map(f=>({url:URL.createObjectURL(f),file:f,type:'photo'})))
    setMediaType('photos')
    setStep('editing')   // go to editor first
  }
  const handleVideoRecord = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setMediaFiles([{url:URL.createObjectURL(file),file,type:'video'}])
    setMediaType('video')
    setStep('editing')   // go to editor first
  }
  const removeMedia = (idx) => setMediaFiles(p=>p.filter((_,i)=>i!==idx))

  const handlePost = async () => {
    if (!canPost||!currentUser) { showToast('Add a title and price first'); return }
    setPosting(true)
    const post = await createPost({
      sellerId: currentUser.id,
      title: title.trim(),
      description: desc.trim(),
      price, origPrice,
      category: category || 'Other',
      condition, brand,
      location: location || 'Kampala, Uganda',
      isNegotiable: negotiable,
      deliveryAvailable: delivery,
      isHot,
      emoji: CATEGORY_EMOJI[category] || '📦',
      mediaFiles,
      filterName:      editorResult?.filter      || 'Original',
      musicTrackId:    editorResult?.selectedTrack?.id || null,
      musicStartSec:   editorResult?.musicStart  || 0,
      status: 'active',
    })
    setPosting(false)
    if (post) { showToast('Post published!'); onClose() }
    else showToast('Failed to post. Try again.')
  }

  const handleDraft = async () => {
    if (!title.trim() || !currentUser) { showToast('Add a title first to save draft'); return }
    const post = await saveDraft({
      sellerId: currentUser.id,
      title: title.trim(),
      description: desc.trim(),
      price, origPrice,
      category: category || 'Other',
      condition, brand,
      location: location || 'Kampala, Uganda',
      isNegotiable: negotiable,
      deliveryAvailable: delivery,
      isHot,
      emoji: CATEGORY_EMOJI[category] || '📦',
      mediaFiles,
    })
    if (post) { showToast('Draft saved!'); onClose() }
    else showToast('Failed to save draft.')
  }

  // ══════════════════════════════════════════════
  // STEP 1.5 — MEDIA EDITOR
  // ══════════════════════════════════════════════
  if (step === 'editing') return (
    <MediaEditor
      mediaFiles={mediaFiles}
      onBack={() => setStep('media')}
      onDone={(result) => {
        setEditorResult(result)
        // Apply edited files back (in case cropped/trimmed)
        if (result.mediaFiles) setMediaFiles(result.mediaFiles)
        setStep('details')
      }}
    />
  )

  // ══════════════════════════════════════════════
  // STEP 1 — MEDIA SELECTION
  // ══════════════════════════════════════════════
  if (step === 'media') return (
    <div style={S.page}>
      {/* Top bar */}
      <div style={S.topBar}>
        <button onClick={onClose} style={S.iconBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:15,fontWeight:700,letterSpacing:'-0.3px'}}>New Listing</div>
        </div>
        <div style={{width:36}}/>
      </div>

      {/* Hero — clean gradient, no emoji */}
      <div style={S.mediaHero}>
        <div style={S.heroInner}>
          {/* Abstract lines / composition hint */}
          <div style={{position:'absolute',inset:0,overflow:'hidden'}}>
            <div style={{position:'absolute',top:'20%',left:'-10%',width:'120%',height:1,background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.04),transparent)',transform:'rotate(-8deg)'}}/>
            <div style={{position:'absolute',top:'45%',left:'-10%',width:'120%',height:1,background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)',transform:'rotate(-8deg)'}}/>
            <div style={{position:'absolute',top:'70%',left:'-10%',width:'120%',height:1,background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.04),transparent)',transform:'rotate(-8deg)'}}/>
          </div>
          <div style={{position:'relative',textAlign:'center'}}>
            <div style={{width:72,height:72,borderRadius:20,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/>
              </svg>
            </div>
            <div style={{fontSize:20,fontWeight:800,color:'white',marginBottom:6,letterSpacing:'-0.5px'}}>Showcase your item</div>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',lineHeight:1.5,maxWidth:240}}>Great photos or a short video can 3× your chances of selling</div>
          </div>
        </div>
      </div>

      {/* Media options — clean list style, not card grid */}
      <div style={S.mediaList}>
        {/* Video */}
        <label style={S.mediaRow}>
          <input ref={videoRef} type="file" accept="video/*" capture="environment" onChange={handleVideoRecord} style={{display:'none'}}/>
          <div style={{...S.mediaRowIcon, background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.2)'}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
            </svg>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:700}}>Record Video</div>
            <div style={{fontSize:12,color:'#71717A',marginTop:1}}>Up to 60 seconds · Best for demonstrating your item</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </label>

        <div style={S.divider}/>

        {/* Photos */}
        <label style={S.mediaRow}>
          <input ref={photoRef} type="file" accept="image/*" multiple onChange={handlePhotoPick} style={{display:'none'}}/>
          <div style={{...S.mediaRowIcon, background:'rgba(217,70,239,0.12)', border:'1px solid rgba(217,70,239,0.2)'}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D946EF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
            </svg>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:700}}>Add Photos</div>
            <div style={{fontSize:12,color:'#71717A',marginTop:1}}>Up to 10 photos · First photo becomes cover</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </label>

        <div style={S.divider}/>

        {/* AI — coming soon, subtle */}
        <div style={{...S.mediaRow,opacity:0.45,cursor:'default'}}>
          <div style={{...S.mediaRowIcon, background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.15)'}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.45 2.94L16.9 6.55l-2.45 2.39.58 3.37L12 10.5l-3.03 1.81.58-3.37L7.1 6.55l3.45-.61L12 3z"/><path d="M5 17l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/><path d="M18 13l.5 1 1 .5-1 .5-.5 1-.5-1-1-.5 1-.5z"/>
            </svg>
          </div>
          <div style={{flex:1}}>
            <div style={{display:'flex',alignItems:'center',gap:7}}>
              <span style={{fontSize:15,fontWeight:700}}>AI Enhance</span>
              <span style={{fontSize:10,fontWeight:700,color:'#F59E0B',background:'rgba(245,158,11,0.12)',border:'1px solid rgba(245,158,11,0.2)',padding:'1px 7px',borderRadius:20}}>Soon</span>
            </div>
            <div style={{fontSize:12,color:'#71717A',marginTop:1}}>Auto-improve photos and write descriptions</div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={S.mediaFooter}>
        <button onClick={()=>setStep('details')} style={S.skipBtn}>
          Skip — add details only
        </button>
      </div>
    </div>
  )

  // ══════════════════════════════════════════════
  // STEP 2 — DETAILS
  // ══════════════════════════════════════════════
  return (
    <div style={S.page}>
      {/* Sticky header */}
      <div style={S.topBar}>
        <button onClick={()=>setStep('media')} style={S.iconBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:15,fontWeight:700,letterSpacing:'-0.3px'}}>Post Details</div>
        </div>
        {/* Progress dots */}
        <div style={{display:'flex',gap:4,alignItems:'center'}}>
          <div style={{width:6,height:6,borderRadius:'50%',background:'#FF3366'}}/>
          <div style={{width:18,height:3,borderRadius:2,background:'rgba(255,255,255,0.15)'}}/>
          <div style={{width:6,height:6,borderRadius:'50%',background:'rgba(255,255,255,0.2)'}}/>
        </div>
      </div>

      {/* Body */}
      <div style={S.detailsBody}>

        {/* Media preview */}
        {mediaFiles.length > 0 && (
          <div style={{padding:'12px 16px 8px'}}>
            <div style={{display:'flex',gap:8,overflowX:'auto',scrollbarWidth:'none'}}>
              {mediaFiles.map((m,i)=>(
                <div key={i} style={{position:'relative',flexShrink:0,width:i===0?100:72,height:i===0?100:72,borderRadius:i===0?14:10,overflow:'hidden',border:i===0?'2px solid rgba(255,255,255,0.2)':'1px solid rgba(255,255,255,0.1)'}}>
                  {m.type==='video'
                    ? <video src={m.url} style={{width:'100%',height:'100%',objectFit:'cover'}} muted/>
                    : <img src={m.url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                  }
                  {i===0 && <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'4px 6px',background:'linear-gradient(transparent,rgba(0,0,0,0.6)',fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.7)',letterSpacing:1}}>COVER</div>}
                  <button onClick={()=>removeMedia(i)} style={{position:'absolute',top:4,right:4,width:18,height:18,borderRadius:'50%',background:'rgba(0,0,0,0.65)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'white'}}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))}
              {mediaType==='photos' && mediaFiles.length<10 && (
                <label style={{flexShrink:0,width:72,height:72,borderRadius:10,background:'rgba(255,255,255,0.04)',border:'1px dashed rgba(255,255,255,0.12)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4,cursor:'pointer'}}>
                  <input type="file" accept="image/*" multiple onChange={handlePhotoPick} style={{display:'none'}}/>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  <span style={{fontSize:9,color:'#52525B'}}>Add</span>
                </label>
              )}
            </div>
          </div>
        )}

        {/* Title */}
        <div style={S.section}>
          <div style={S.sectionLabel}>ITEM NAME <span style={{color:'#FF3366'}}>*</span></div>
          <input value={title} onChange={e=>setTitle(e.target.value)} maxLength={80}
            placeholder="What are you selling?"
            style={S.input}/>
          <div style={{fontSize:11,color:'#52525B',textAlign:'right',marginTop:4}}>{title.length}/80</div>
        </div>

        {/* Price */}
        <div style={S.section}>
          <div style={S.sectionLabel}>PRICING <span style={{color:'#FF3366'}}>*</span></div>
          <div style={{display:'flex',gap:10}}>
            <div style={{flex:1,position:'relative'}}>
              <div style={S.inputPrefix}>UGX</div>
              <input type="number" value={price} onChange={e=>setPrice(e.target.value)} placeholder="Selling price"
                style={{...S.input,paddingLeft:48,fontWeight:700}}/>
            </div>
            <div style={{flex:1,position:'relative'}}>
              <div style={S.inputPrefix}>UGX</div>
              <input type="number" value={origPrice} onChange={e=>setOrigPrice(e.target.value)} placeholder="Was (optional)"
                style={{...S.input,paddingLeft:48,color:'#71717A'}}/>
            </div>
          </div>
          {origPrice && price && Number(origPrice)>Number(price) && (
            <div style={{marginTop:6,display:'flex',alignItems:'center',gap:6}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:'#22C55E'}}/>
              <span style={{fontSize:12,color:'#22C55E',fontWeight:600}}>
                {Math.round((1-Number(price)/Number(origPrice))*100)}% discount will show on your post
              </span>
            </div>
          )}
        </div>

        {/* Category */}
        <div style={S.section}>
          <div style={S.sectionLabel}>CATEGORY</div>
          <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
            {CATEGORIES.filter(c=>c!=='All').map(c=>(
              <button key={c} onClick={()=>setCategory(ct=>ct===c?'':c)}
                style={{padding:'8px 14px',borderRadius:20,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all 0.15s',
                  background:category===c?'#FF3366':'rgba(255,255,255,0.05)',
                  border:`1px solid ${category===c?'#FF3366':'rgba(255,255,255,0.08)'}`,
                  color:category===c?'white':'#A1A1AA',
                }}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Condition */}
        <div style={S.section}>
          <div style={S.sectionLabel}>CONDITION</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {CONDITIONS.map(c=>(
              <button key={c} onClick={()=>setCondition(c)}
                style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',borderRadius:12,cursor:'pointer',fontFamily:'inherit',transition:'all 0.15s',
                  background:condition===c?'rgba(255,255,255,0.06)':'transparent',
                  border:`1px solid ${condition===c?'rgba(255,255,255,0.2)':'rgba(255,255,255,0.06)'}`,
                }}>
                <div style={{textAlign:'left'}}>
                  <div style={{fontSize:14,fontWeight:600,color:'white'}}>{c}</div>
                  <div style={{fontSize:11,color:'#71717A',marginTop:1}}>{COND_LABELS[c]}</div>
                </div>
                <div style={{width:18,height:18,borderRadius:'50%',border:`2px solid ${condition===c?'#FF3366':'rgba(255,255,255,0.15)'}`,background:condition===c?'#FF3366':'transparent',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {condition===c && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><path d="M20 6L9 17l-5-5"/></svg>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Brand + Location */}
        <div style={{display:'flex',gap:10,padding:'0 16px 16px'}}>
          <div style={{flex:1}}>
            <div style={S.sectionLabel}>BRAND</div>
            <input value={brand} onChange={e=>setBrand(e.target.value)} placeholder="e.g. Apple, Nike"
              style={{...S.input,margin:0}}/>
          </div>
          <div style={{flex:1}}>
            <div style={S.sectionLabel}>LOCATION</div>
            <input value={location} onChange={e=>setLocation(e.target.value)} placeholder="City"
              style={{...S.input,margin:0}}/>
          </div>
        </div>

        {/* Description */}
        <div style={S.section}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',...S.sectionLabel}}>
            <span>DESCRIPTION</span><span style={{fontWeight:400,color:'#52525B'}}>{desc.length}/500</span>
          </div>
          <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={3} maxLength={500}
            placeholder="Add details — specs, included accessories, reason for selling, any defects..."
            style={{...S.input,resize:'none',lineHeight:1.6}}/>
        </div>

        {/* Toggles */}
        <div style={{padding:'0 16px 16px',display:'flex',flexDirection:'column',gap:1}}>
          {[
            { key:'neg',  label:'Negotiable',          sub:'Allow buyers to make offers',         val:negotiable, set:()=>setNeg(n=>!n),      color:'#22C55E' },
            { key:'del',  label:'Delivery Available',  sub:'Ship or deliver to buyers',            val:delivery,   set:()=>setDelivery(d=>!d), color:'#3B82F6' },
            { key:'hot',  label:'Hot Deal',             sub:'Highlight as a time-sensitive deal',   val:isHot,      set:()=>setIsHot(h=>!h),    color:'#FF3366' },
          ].map((t,i,arr)=>(
            <div key={t.key} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 14px',
              background:'rgba(255,255,255,0.03)',
              borderTop:'1px solid rgba(255,255,255,0.05)',
              borderBottom:i===arr.length-1?'1px solid rgba(255,255,255,0.05)':'none',
              borderLeft:'none',borderRight:'none',
            }}>
              <div>
                <div style={{fontSize:14,fontWeight:600,color:'white'}}>{t.label}</div>
                <div style={{fontSize:11,color:'#52525B',marginTop:1}}>{t.sub}</div>
              </div>
              <Toggle on={t.val} onToggle={t.set} color={t.color}/>
            </div>
          ))}
        </div>
        <div style={{height:8}}/>
      </div>

      {/* Footer */}
      <div style={S.footer}>
        <button onClick={handleDraft} style={S.draftBtn}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v14a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>
          Save Draft
        </button>
        <button onClick={handlePost} disabled={posting||!canPost}
          style={{...S.postBtn,opacity:posting||!canPost?0.45:1}}>
          {posting
            ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{animation:'spin 1s linear infinite'}}><circle cx="12" cy="12" r="10"/></svg> Publishing...</>
            : <>Post <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>
          }
        </button>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

const S = {
  page: { position:'fixed', inset:0, zIndex:300, background:'#000', display:'flex', flexDirection:'column', fontFamily:"'Inter',sans-serif", color:'#fff' },
  topBar: {
    display:'flex', alignItems:'center', justifyContent:'space-between',
    padding:'14px 16px 12px',
    background:'rgba(0,0,0,0.9)', backdropFilter:'blur(20px)',
    borderBottom:'1px solid rgba(255,255,255,0.06)',
    flexShrink:0, position:'sticky', top:0, zIndex:10,
  },
  iconBtn: { width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.09)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' },

  // Media step
  mediaHero: { flex:1, position:'relative', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', minHeight:0, background:'#000' },
  heroInner: { position:'relative', zIndex:1, display:'flex', alignItems:'center', justifyContent:'center', width:'100%', height:'100%', background:'radial-gradient(ellipse at 50% 40%,rgba(255,51,102,0.08),transparent 70%)' },
  mediaList: { padding:'0', borderTop:'1px solid rgba(255,255,255,0.06)', flexShrink:0 },
  mediaRow: { display:'flex', alignItems:'center', gap:14, padding:'16px 20px', cursor:'pointer', transition:'background 0.15s' },
  mediaRowIcon: { width:44, height:44, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  divider: { height:1, background:'rgba(255,255,255,0.05)', margin:'0 20px' },
  mediaFooter: { padding:'12px 20px', paddingBottom:'calc(var(--nav-h,50px) + env(safe-area-inset-bottom,0px) + 12px)', flexShrink:0 },
  skipBtn: { width:'100%', padding:'13px', background:'transparent', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, color:'rgba(255,255,255,0.4)', fontSize:14, fontWeight:500, cursor:'pointer', fontFamily:'inherit', letterSpacing:'-0.2px' },

  // Details step
  detailsBody: { flex:1, overflowY:'auto', scrollbarWidth:'none' },
  section: { padding:'0 16px 16px' },
  sectionLabel: { fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.3)', letterSpacing:1.2, marginBottom:10 },
  input: {
    width:'100%', padding:'13px 14px',
    background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.07)',
    borderRadius:12, color:'#fff', fontSize:14,
    outline:'none', fontFamily:'inherit', boxSizing:'border-box',
    transition:'border-color 0.2s',
  },
  inputPrefix: { position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.25)', pointerEvents:'none' },

  footer: {
    padding:'12px 16px',
    paddingBottom:'calc(var(--nav-h,50px) + env(safe-area-inset-bottom,0px) + 12px)',
    background:'rgba(0,0,0,0.95)', backdropFilter:'blur(20px)',
    borderTop:'1px solid rgba(255,255,255,0.07)',
    flexShrink:0, display:'flex', gap:10,
  },
  draftBtn: { flex:1, padding:'13px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, color:'rgba(255,255,255,0.5)', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:6 },
  postBtn: { flex:2, padding:'13px', background:'linear-gradient(135deg,#FF3366,#FF6633)', border:'none', borderRadius:12, color:'white', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:'0 4px 20px rgba(255,51,102,0.35)', transition:'opacity 0.2s, transform 0.1s', letterSpacing:'-0.2px' },
}
