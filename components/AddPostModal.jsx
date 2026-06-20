import { useState } from 'react'
import { createPost } from '../lib/feed'

export default function AddPostModal({ onClose, showToast, currentUser }) {
  const [title, setTitle]       = useState('')
  const [price, setPrice]       = useState('')
  const [desc, setDesc]         = useState('')
  const [category, setCategory] = useState('Phones')
  const [condition, setCondition] = useState('Used – Like New')
  const [brand, setBrand]       = useState('')
  const [negotiable, setNeg]    = useState(false)
  const [delivery, setDelivery] = useState(true)
  const [posting, setPosting]   = useState(false)

  return (
    <div style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(4px)',display:'flex',alignItems:'flex-end'}}>
      <div style={{width:'100%',background:'#0d0d0d',borderRadius:'20px 20px 0 0',border:'1px solid rgba(255,255,255,0.08)',borderBottom:'none',maxHeight:'92vh',overflowY:'auto',scrollbarWidth:'none'}}>

        {/* Handle */}
        <div style={{width:40,height:4,background:'rgba(255,255,255,0.15)',borderRadius:20,margin:'10px auto 4px'}} />

        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 16px 8px'}}>
          <div>
            <div style={{fontSize:18,fontWeight:800}}>Add Post</div>
            <div style={{fontSize:13,color:'#71717A',marginTop:2}}>Sell faster, reach more buyers 🚀</div>
          </div>
          <button onClick={onClose} style={{width:32,height:32,borderRadius:'50%',background:'#1e1e1e',border:'1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#A1A1AA'}}>
            <i className="fas fa-times" style={{fontSize:15}} />
          </button>
        </div>

        {/* Upload options */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,padding:'12px 16px 16px'}}>
          {[
            { icon:'fa-video',         iconColor:'#EF4444', bg:'rgba(239,68,68,0.15)',  label:'Record Video', sub:'Up to 60 sec' },
            { icon:'fa-images',        iconColor:'#E11D48', bg:'rgba(228,29,72,0.15)',  label:'Add Photos',   sub:'Up to 10 photos' },
            { icon:'fa-wand-magic-sparkles', iconColor:'#A855F7', bg:'rgba(168,85,247,0.15)', label:'AI Enhance', sub:'Stand out' },
          ].map(opt => (
            <div key={opt.label} onClick={() => showToast(`Opening ${opt.label}...`)} style={{padding:'16px 8px',background:'#141414',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12,display:'flex',flexDirection:'column',alignItems:'center',gap:8,cursor:'pointer'}}>
              <div style={{width:42,height:42,borderRadius:10,background:opt.bg,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <i className={`fas ${opt.icon}`} style={{fontSize:20,color:opt.iconColor}} />
              </div>
              <div style={{fontSize:12,fontWeight:700,textAlign:'center'}}>{opt.label}</div>
              <div style={{fontSize:10,color:'#71717A',textAlign:'center'}}>{opt.sub}</div>
            </div>
          ))}
        </div>

        {/* Title */}
        <div style={{padding:'0 16px 14px'}}>
          <div style={{fontSize:13,fontWeight:600,color:'#A1A1AA',marginBottom:6,display:'flex',justifyContent:'space-between'}}>
            Title <span style={{fontWeight:400,color:'#71717A'}}>{title.length}/60</span>
          </div>
          <input value={title} onChange={e=>setTitle(e.target.value)} maxLength={60} style={{width:'100%',padding:'12px 14px',background:'#141414',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12,color:'white',fontSize:14,outline:'none',fontFamily:'Inter,sans-serif'}} />
        </div>

        {/* Price */}
        <div style={{padding:'0 16px 14px'}}>
          <div style={{fontSize:13,fontWeight:600,color:'#A1A1AA',marginBottom:6}}>Price</div>
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',background:'#141414',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12}}>
            <span style={{fontSize:14,fontWeight:700,color:'#71717A'}}>UGX</span>
            <input type="number" value={price} onChange={e=>setPrice(e.target.value)} placeholder="0" style={{flex:1,background:'none',border:'none',outline:'none',color:'white',fontSize:18,fontWeight:700,fontFamily:'Inter,sans-serif'}} />
            <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'#A1A1AA',fontWeight:500}}>
              Negotiable
              <div onClick={() => setNeg(n=>!n)} style={{width:36,height:20,borderRadius:20,background:negotiable?'#22C55E':'#1e1e1e',border:`1px solid ${negotiable?'#22C55E':'rgba(255,255,255,0.1)'}`,position:'relative',cursor:'pointer',transition:'background 0.2s'}}>
                <div style={{width:14,height:14,borderRadius:'50%',background:'white',position:'absolute',top:2,left:negotiable?18:2,transition:'left 0.2s'}} />
              </div>
            </div>
          </div>
        </div>

        {/* Category */}
        <div style={{padding:'0 16px 14px'}}>
          <div style={{fontSize:13,fontWeight:600,color:'#A1A1AA',marginBottom:6}}>Category</div>
          <div onClick={() => showToast('Select category...')} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',background:'#141414',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12,cursor:'pointer'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,color:'white',fontSize:14}}>
              <i className="fas fa-mobile-screen" style={{color:'#7C3AED'}} /> Phones &amp; Tablets
            </div>
            <i className="fas fa-chevron-right" style={{color:'#71717A',fontSize:14}} />
          </div>
        </div>

        {/* Condition + Brand */}
        <div style={{display:'flex',gap:10,padding:'0 16px 14px'}}>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:600,color:'#A1A1AA',marginBottom:6}}>Condition</div>
            <div onClick={() => showToast('Select condition...')} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',background:'#141414',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12,cursor:'pointer',fontSize:13,color:'white'}}>
              Used – Like New <i className="fas fa-chevron-down" style={{color:'#71717A'}} />
            </div>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:600,color:'#A1A1AA',marginBottom:6}}>Brand</div>
            <div onClick={() => showToast('Select brand...')} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',background:'#141414',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12,cursor:'pointer',fontSize:13,color:'white'}}>
              🍎 Apple <i className="fas fa-chevron-right" style={{color:'#71717A'}} />
            </div>
          </div>
        </div>

        {/* Delivery toggle */}
        <div style={{padding:'0 16px 14px'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',background:'#141414',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12}}>
            <i className="fas fa-truck" style={{color:'#A1A1AA',fontSize:16}} />
            <span style={{flex:1,fontSize:14,color:'white'}}>Delivery Available</span>
            <div onClick={() => setDelivery(d=>!d)} style={{width:36,height:20,borderRadius:20,background:delivery?'#22C55E':'#1e1e1e',border:`1px solid ${delivery?'#22C55E':'rgba(255,255,255,0.1)'}`,position:'relative',cursor:'pointer',transition:'background 0.2s'}}>
              <div style={{width:14,height:14,borderRadius:'50%',background:'white',position:'absolute',top:2,left:delivery?18:2,transition:'left 0.2s'}} />
            </div>
          </div>
        </div>

        {/* Description */}
        <div style={{padding:'0 16px 14px'}}>
          <div style={{fontSize:13,fontWeight:600,color:'#A1A1AA',marginBottom:6,display:'flex',justifyContent:'space-between'}}>
            Description <span style={{fontWeight:400,color:'#71717A'}}>{desc.length}/300</span>
          </div>
          <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={3} maxLength={300} placeholder="Describe your item..." style={{width:'100%',padding:'12px 14px',background:'#141414',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12,color:'white',fontSize:14,outline:'none',fontFamily:'Inter,sans-serif',resize:'none',lineHeight:1.5}} />
        </div>

        {/* Extras */}
        <div style={{display:'flex',gap:6,padding:'0 16px 16px'}}>
          {[
            { icon:'fa-hashtag',      label:'Add Tags',      sub:'Up to 5 tags' },
            { icon:'fa-bolt',         label:'Set as Urgent', sub:'Sell faster'  },
            { icon:'fa-rocket',       label:'Boost Post',    sub:'More views', badge:'New' },
          ].map(e => (
            <div key={e.label} onClick={() => showToast(`${e.label}...`)} style={{flex:1,display:'flex',alignItems:'center',gap:6,padding:'10px',background:'#141414',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,fontSize:12,fontWeight:600,color:'#A1A1AA',cursor:'pointer',justifyContent:'center',position:'relative',flexDirection:'column'}}>
              <i className={`fas ${e.icon}`} style={{fontSize:13}} />
              <span style={{fontSize:11,textAlign:'center'}}>{e.label}</span>
              <span style={{fontSize:9,color:'#71717A',textAlign:'center'}}>{e.sub}</span>
              {e.badge && <span style={{position:'absolute',top:-6,right:-4,background:'linear-gradient(135deg,#D946EF,#F43F5E)',color:'white',fontSize:9,fontWeight:800,padding:'1px 5px',borderRadius:20}}>{e.badge}</span>}
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div style={{display:'flex',gap:10,padding:'0 16px 32px'}}>
          <button onClick={onClose} style={{flex:1,padding:14,background:'#141414',border:'1px solid rgba(255,255,255,0.15)',borderRadius:20,color:'white',fontSize:15,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,fontFamily:'inherit'}}>
            <i className="fas fa-floppy-disk" style={{fontSize:14}} /> Save Draft
          </button>
          <button onClick={() => {showToast('🚀 Post published!'); onClose()}} style={{flex:2,padding:14,background:'linear-gradient(135deg,#D946EF,#F43F5E,#FB923C)',border:'none',borderRadius:20,color:'white',fontSize:15,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,boxShadow:'0 4px 20px rgba(228,29,72,0.4)',fontFamily:'inherit'}}>
            <i className="fas fa-paper-plane" style={{fontSize:14}} /> Post Now
          </button>
          <button
            onClick={async () => {
              if (!title.trim() || !price) { showToast('Add a title and price first'); return }
              if (!currentUser) { showToast('Sign in to post'); return }
              setPosting(true)
              const post = await createPost({
                sellerId: currentUser.id,
                title: title.trim(),
                description: desc.trim(),
                price,
                category,
                condition,
                brand,
                isNegotiable: negotiable,
                deliveryAvailable: delivery,
              })
              setPosting(false)
              if (post) { showToast('🚀 Post published!'); onClose() }
              else        showToast('Failed to post. Try again.')
            }}
            disabled={posting || !title.trim() || !price}
            style={{flex:2,padding:14,background:'linear-gradient(135deg,#D946EF,#F43F5E,#FB923C)',border:'none',borderRadius:20,color:'white',fontSize:15,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,boxShadow:'0 4px 20px rgba(228,29,72,0.4)',fontFamily:'inherit',opacity: posting ? 0.7 : 1}}
          >
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
