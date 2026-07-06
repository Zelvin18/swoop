import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function avatarColor(id=''){const C=['#7C3AED','#FF3366','#F97316','#22C55E','#3B82F6','#EC4899','#F59E0B','#06B6D4'];return C[id.split('').reduce((a,c)=>a+c.charCodeAt(0),0)%C.length]}
function initials(n=''){return n.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)||'?'}
function fmtNum(n){return n>=1000?(n/1000).toFixed(1).replace('.0','')+'K':String(n||0)}

const POST_TABS = ['Posts','Products','Services']

export default function ProfilePage({ showToast, onWallet, user, onSignOut }) {
  const [profile,      setProfile]      = useState(null)
  const [posts,        setPosts]        = useState([])
  const [activeTab,    setActiveTab]    = useState('Posts')
  const [loading,      setLoading]      = useState(true)
  const [showMenu,     setShowMenu]     = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showDashboard,setShowDashboard]= useState(false)

  useEffect(() => { if (user?.id) loadProfile() }, [user?.id])

  const loadProfile = async () => {
    const [{ data: prof }, { data: userPosts }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('posts').select('*').eq('seller_id', user.id).neq('status','draft').order('created_at',{ascending:false}).limit(30),
    ])
    setProfile(prof)
    setPosts(userPosts || [])
    setLoading(false)
  }

  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'You'
  const username    = profile?.username  || ''
  const bio         = profile?.bio       || ''
  const location    = profile?.location  || ''
  const color       = avatarColor(user?.id || '')
  const initial     = initials(displayName)
  const followers   = profile?.followers_count || 0
  const following   = profile?.following_count || 0
  const postsCount  = profile?.posts_count     || posts.length

  const filteredPosts = posts.filter(p =>
    activeTab === 'Posts'    ? true :
    activeTab === 'Products' ? p.post_type === 'product' :
    activeTab === 'Services' ? p.post_type === 'service' : true
  )

  if (showSettings) return <SettingsScreen profile={profile} user={user} onBack={()=>setShowSettings(false)} onSignOut={onSignOut} showToast={showToast}/>
  if (showDashboard) return <DashboardScreen user={user} onBack={()=>setShowDashboard(false)} showToast={showToast}/>

  return (
    <div style={{ paddingBottom: 24, fontFamily:"'Inter',sans-serif", color:'#fff' }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px 8px' }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>Profile</div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="header-btn" onClick={()=>showToast('Share profile coming soon')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          </button>
          <button className="header-btn" onClick={()=>setShowMenu(true)} style={{position:'relative'}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
        </div>
      </div>

      {/* ── Avatar + stats ── */}
      <div style={{ padding:'0 16px 16px', display:'flex', alignItems:'flex-start', gap:16 }}>
        <div style={{ position:'relative', flexShrink:0 }}>
          <div style={{ width:80, height:80, borderRadius:'50%', background:color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, fontWeight:900, color:'white', border:`3px solid ${color}44` }}>
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}/> : initial}
          </div>
          <button onClick={()=>showToast('Edit photo coming soon')} style={{ position:'absolute', bottom:0, right:0, width:24, height:24, borderRadius:'50%', background:'linear-gradient(135deg,#FF3366,#FF6633)', border:'2.5px solid #000', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
        </div>

        {/* Stats row */}
        <div style={{ flex:1, display:'flex', justifyContent:'space-around', paddingTop:8 }}>
          {[
            { val: fmtNum(postsCount), label:'Posts' },
            { val: fmtNum(followers),  label:'Followers', action:()=>showToast('Followers list coming soon') },
            { val: fmtNum(following),  label:'Following',  action:()=>showToast('Following list coming soon') },
          ].map(s => (
            <button key={s.label} onClick={s.action} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, background:'none', border:'none', cursor: s.action?'pointer':'default' }}>
              <span style={{ fontSize:18, fontWeight:800, color:'white' }}>{s.val}</span>
              <span style={{ fontSize:12, color:'#71717A' }}>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Bio ── */}
      <div style={{ padding:'0 16px 12px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
          <span style={{ fontSize:15, fontWeight:700 }}>{displayName}</span>
          {profile?.verified && <span style={{width:15,height:15,borderRadius:'50%',background:'#3B82F6',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:8,color:'white',fontWeight:900}}>✓</span>}
          {profile?.badge && <span style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:20,background:'rgba(255,51,102,0.12)',border:'1px solid rgba(255,51,102,0.25)',color:'#FF3366'}}>{profile.badge}</span>}
        </div>
        {username && <div style={{ fontSize:13, color:'#71717A', marginBottom:4 }}>@{username}</div>}
        {bio && <div style={{ fontSize:13, color:'rgba(255,255,255,0.75)', lineHeight:1.5, marginBottom:6 }}>{bio}</div>}
        {location && (
          <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, color:'#71717A' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {location}
          </div>
        )}
      </div>

      {/* ── Action buttons ── */}
      <div style={{ display:'flex', gap:8, padding:'0 16px 16px' }}>
        <button onClick={()=>showToast('Edit profile coming soon')} style={{ flex:1, padding:'9px', background:'#141414', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, color:'white', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
          Edit Profile
        </button>
        <button onClick={()=>setShowDashboard(true)} style={{ flex:1, padding:'9px', background:'linear-gradient(135deg,#FF3366,#FF6633)', border:'none', borderRadius:10, color:'white', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 2px 10px rgba(255,51,102,0.3)' }}>
          Dashboard
        </button>
        <button onClick={()=>showToast('Share coming soon')} style={{ width:38, height:38, background:'#141414', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        </button>
      </div>

      {/* ── Highlights / Story circles ── */}
      <div style={{ display:'flex', gap:14, padding:'0 16px 16px', overflowX:'auto', scrollbarWidth:'none' }}>
        {[{label:'Add', icon:true}].map((h,i)=>(
          <div key={i} onClick={()=>showToast('Story highlights coming soon')} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:5,flexShrink:0,cursor:'pointer'}}>
            <div style={{width:58,height:58,borderRadius:'50%',background:'#141414',border:'1.5px dashed rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </div>
            <span style={{fontSize:10,color:'#71717A'}}>Add</span>
          </div>
        ))}
      </div>

      {/* ── Post tabs ── */}
      <div style={{ display:'flex', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
        {POST_TABS.map(t => (
          <button key={t} onClick={()=>setActiveTab(t)} style={{ flex:1, padding:'10px 0', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:activeTab===t?700:400, color:activeTab===t?'white':'#52525B', borderBottom:`2px solid ${activeTab===t?'#FF3366':'transparent'}`, transition:'all 0.2s' }}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Posts grid ── */}
      {loading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:2, padding:2 }}>
          {[1,2,3,4,5,6].map(i => <div key={i} style={{aspectRatio:'1',background:'#141414',borderRadius:2,animation:'pulse 1.5s ease-in-out infinite',animationDelay:`${i*0.1}s`}}/>)}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'48px 24px', gap:12 }}>
          <div style={{width:56,height:56,borderRadius:16,background:'#141414',border:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
          </div>
          <div style={{ fontSize:15, fontWeight:600, color:'#A1A1AA' }}>No {activeTab.toLowerCase()} yet</div>
          <div style={{ fontSize:12, color:'#52525B', textAlign:'center' }}>Tap the + button to share your first post</div>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:2, padding:2 }}>
          {filteredPosts.map(p => (
            <div key={p.id} onClick={()=>showToast('Post view coming soon')} style={{ aspectRatio:'1', position:'relative', overflow:'hidden', cursor:'pointer', borderRadius:2 }}>
              {p.images?.[0]
                ? <img src={p.images[0]} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                : <div style={{width:'100%',height:'100%',background:p.bg_color||'#141414',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28}}>{p.emoji||'📦'}</div>
              }
              {/* Post type badge */}
              {p.post_type!=='product' && (
                <div style={{position:'absolute',top:5,left:5,fontSize:8,fontWeight:700,padding:'1px 5px',borderRadius:4,background:p.post_type==='social'?'rgba(124,58,237,0.85)':'rgba(249,115,22,0.85)',color:'white'}}>
                  {p.post_type==='social'?'S':'SVC'}
                </div>
              )}
              {/* Status badge */}
              {p.status==='sold' && <div style={{position:'absolute',top:5,right:5,fontSize:8,fontWeight:700,padding:'1px 5px',borderRadius:4,background:'rgba(34,197,94,0.85)',color:'white'}}>SOLD</div>}
              {p.status==='reserved' && <div style={{position:'absolute',top:5,right:5,fontSize:8,fontWeight:700,padding:'1px 5px',borderRadius:4,background:'rgba(245,158,11,0.85)',color:'white'}}>RSRVD</div>}
              {/* Video indicator */}
              {p.video_url && <div style={{position:'absolute',bottom:5,right:5,opacity:0.8}}><svg width="12" height="12" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>}
            </div>
          ))}
        </div>
      )}

      {/* ── Ratings & reviews snippet ── */}
      {(profile?.review_count||0) > 0 && (
        <div style={{ margin:'16px 16px 0', padding:'14px', background:'#141414', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, display:'flex', alignItems:'center', gap:12 }}>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:22,fontWeight:900,color:'white'}}>{(profile.avg_rating||0).toFixed(1)}</div>
            <div style={{display:'flex',gap:2,justifyContent:'center',margin:'2px 0'}}>
              {[1,2,3,4,5].map(s=><svg key={s} width="10" height="10" viewBox="0 0 24 24" fill={s<=Math.round(profile.avg_rating||0)?'#F59E0B':'rgba(255,255,255,0.15)'} ><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>)}
            </div>
            <div style={{fontSize:10,color:'#71717A'}}>{profile.review_count} reviews</div>
          </div>
          <div style={{flex:1,fontSize:12,color:'#A1A1AA',lineHeight:1.5,borderLeft:'1px solid rgba(255,255,255,0.07)',paddingLeft:12}}>
            Based on {profile.review_count} customer reviews
          </div>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

      {/* ── Menu drawer ── */}
      {showMenu && (
        <MenuDrawer
          onClose={()=>setShowMenu(false)}
          onSettings={()=>{setShowMenu(false);setShowSettings(true)}}
          onDashboard={()=>{setShowMenu(false);setShowDashboard(true)}}
          onSignOut={onSignOut}
          showToast={showToast}
        />
      )}
    </div>
  )
}

// ── Menu Drawer ───────────────────────────────────────────────────────────────
function MenuDrawer({ onClose, onSettings, onDashboard, onSignOut, showToast }) {
  const items = [
    { icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>, label:'Dashboard', sub:'Sales, orders & analytics', action:onDashboard },
    { icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>, label:'Saved Posts', sub:'Your bookmarked items', action:()=>showToast('Saved posts coming soon') },
    { icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>, label:'My Orders', sub:'Track your purchases', action:()=>showToast('Orders coming soon') },
    { icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>, label:'Payment & Banking', sub:'Wallet, withdrawals & MoMo', action:()=>showToast('Payments coming soon') },
    { icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>, label:'Settings', sub:'Privacy, notifications & more', action:onSettings },
    { icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32"/></svg>, label:'Get Verified', sub:'Boost trust with a verified badge', action:()=>showToast('Verification coming soon') },
  ]

  return (
    <>
      <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:450,backdropFilter:'blur(4px)'}}/>
      <div style={{position:'fixed',top:0,right:0,bottom:0,width:'80%',maxWidth:320,background:'#0d0d0d',borderLeft:'1px solid rgba(255,255,255,0.07)',zIndex:451,display:'flex',flexDirection:'column',fontFamily:"'Inter',sans-serif",color:'#fff',overflowY:'auto'}}>
        {/* Header */}
        <div style={{padding:'20px 20px 12px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <button onClick={onClose} style={{display:'flex',alignItems:'center',gap:8,background:'none',border:'none',color:'rgba(255,255,255,0.5)',cursor:'pointer',fontFamily:'inherit',fontSize:13,padding:0,marginBottom:16}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Close
          </button>
          <div style={{fontSize:16,fontWeight:800}}>Menu</div>
        </div>

        {/* Menu items */}
        <div style={{padding:'8px 0',flex:1}}>
          {items.map((item,i) => (
            <button key={i} onClick={item.action} style={{width:'100%',display:'flex',alignItems:'center',gap:14,padding:'13px 20px',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',textAlign:'left',borderBottom:'1px solid rgba(255,255,255,0.04)',transition:'background 0.15s'}}>
              <div style={{width:36,height:36,borderRadius:10,background:'#141414',border:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:'rgba(255,255,255,0.6)'}}>{item.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:600,color:'white'}}>{item.label}</div>
                <div style={{fontSize:11,color:'#52525B',marginTop:1}}>{item.sub}</div>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          ))}
        </div>

        {/* Sign out */}
        <div style={{padding:'12px 20px',borderTop:'1px solid rgba(255,255,255,0.06)',paddingBottom:'calc(env(safe-area-inset-bottom,0px) + 12px)'}}>
          <button onClick={onSignOut} style={{width:'100%',padding:'12px',background:'rgba(255,51,102,0.08)',border:'1px solid rgba(255,51,102,0.2)',borderRadius:12,color:'#FF3366',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:7}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign Out
          </button>
        </div>
      </div>
    </>
  )
}

// ── Dashboard Screen ──────────────────────────────────────────────────────────
function DashboardScreen({ user, onBack, showToast }) {
  const [stats, setStats] = useState({ sales:0, orders:0, earned:0, views:0, pending:0 })
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('orders').select('*').eq('seller_id', user.id).order('created_at',{ascending:false}).limit(20),
      supabase.from('transactions').select('amount,type').eq('user_id', user.id),
    ]).then(([{data:ords},{data:txns}])=>{
      setOrders(ords||[])
      const earned = (txns||[]).filter(t=>t.type==='sale').reduce((s,t)=>s+t.amount,0)
      const pending = (ords||[]).filter(o=>o.status==='pending').length
      setStats({ sales:(ords||[]).filter(o=>o.status==='delivered').length, orders:(ords||[]).length, earned, views:0, pending })
      setLoading(false)
    })
  },[user.id])

  const statusColor = {pending:'#F59E0B',confirmed:'#3B82F6',processing:'#7C3AED',shipped:'#F97316',delivered:'#22C55E',cancelled:'#EF4444'}

  return (
    <div style={{position:'fixed',inset:0,background:'#000',zIndex:250,display:'flex',flexDirection:'column',fontFamily:"'Inter',sans-serif",color:'#fff',overflowY:'auto'}}>
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',borderBottom:'1px solid rgba(255,255,255,0.07)',background:'rgba(0,0,0,0.92)',backdropFilter:'blur(16px)',flexShrink:0,position:'sticky',top:0,zIndex:10}}>
        <button onClick={onBack} style={{width:36,height:36,borderRadius:'50%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <div><div style={{fontSize:17,fontWeight:800}}>Dashboard</div><div style={{fontSize:11,color:'#71717A'}}>Your business overview</div></div>
      </div>

      {loading ? (
        <div style={{display:'flex',justifyContent:'center',padding:48}}><div style={{width:24,height:24,border:'2px solid rgba(255,255,255,0.08)',borderTopColor:'#FF3366',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/></div>
      ) : (
        <div style={{padding:'16px'}}>
          {/* Stats grid */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10,marginBottom:20}}>
            {[
              {label:'Total Earned',val:`UGX ${stats.earned.toLocaleString()}`,color:'#22C55E',icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>},
              {label:'Total Orders',val:stats.orders,color:'#3B82F6',icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>},
              {label:'Sales Done',val:stats.sales,color:'#FF3366',icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>},
              {label:'Pending',val:stats.pending,color:'#F59E0B',icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>},
            ].map(s=>(
              <div key={s.label} style={{background:'#141414',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:'14px'}}>
                <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:8}}>
                  <div style={{width:28,height:28,borderRadius:8,background:`${s.color}18`,display:'flex',alignItems:'center',justifyContent:'center',color:s.color}}>{s.icon}</div>
                  <span style={{fontSize:11,color:'#71717A'}}>{s.label}</span>
                </div>
                <div style={{fontSize:20,fontWeight:800,color:'white'}}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Recent orders */}
          <div style={{fontSize:15,fontWeight:700,marginBottom:12}}>Recent Orders</div>
          {orders.length === 0 ? (
            <div style={{background:'#141414',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:'28px',textAlign:'center'}}>
              <div style={{fontSize:13,color:'#71717A'}}>No orders yet</div>
            </div>
          ) : orders.map(o=>(
            <div key={o.id} style={{background:'#141414',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,padding:'12px 14px',marginBottom:8,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <div style={{fontSize:13,fontWeight:600}}>Order #{o.id.slice(-6).toUpperCase()}</div>
                <div style={{fontSize:11,color:'#71717A',marginTop:2}}>UGX {Number(o.amount).toLocaleString()}</div>
              </div>
              <span style={{fontSize:10,fontWeight:700,padding:'3px 9px',borderRadius:20,background:`${statusColor[o.status]||'#52525B'}18`,color:statusColor[o.status]||'#52525B',border:`1px solid ${statusColor[o.status]||'#52525B'}30`}}>
                {o.status.charAt(0).toUpperCase()+o.status.slice(1)}
              </span>
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── Settings Screen ───────────────────────────────────────────────────────────
function SettingsScreen({ profile, user, onBack, onSignOut, showToast }) {
  const [settings, setSettings] = useState({ dark_mode:true, show_online_status:true, notifications_messages:true, notifications_orders:true, notifications_live:true, notifications_likes:true })

  const SECTIONS = [
    {
      title:'Account',
      items:[
        {label:'Edit Profile',       sub:'Update name, bio, photo',          action:()=>showToast('Edit profile coming soon')},
        {label:'Username',           sub:`@${profile?.username||'Set username'}`,action:()=>showToast('Username coming soon')},
        {label:'Phone Number',       sub:profile?.phone||'Add phone number', action:()=>showToast('Phone coming soon')},
        {label:'Verify Account',     sub:'Get the verified badge',           action:()=>showToast('Verification coming soon')},
      ]
    },
    {
      title:'Privacy',
      items:[
        {label:'Profile Visibility', sub:'Who can see your profile',         action:()=>showToast('Privacy coming soon')},
        {label:'Blocked Users',      sub:'Manage blocked accounts',          action:()=>showToast('Blocked users coming soon')},
        {label:'Online Status',      sub:'Show when you\'re active', toggle:true, key:'show_online_status'},
      ]
    },
    {
      title:'Notifications',
      items:[
        {label:'Messages',           toggle:true, key:'notifications_messages'},
        {label:'Orders',             toggle:true, key:'notifications_orders'},
        {label:'Live Streams',       toggle:true, key:'notifications_live'},
        {label:'Likes & Comments',   toggle:true, key:'notifications_likes'},
      ]
    },
    {
      title:'Support',
      items:[
        {label:'Help Center',        sub:'FAQs and guides',                  action:()=>showToast('Help coming soon')},
        {label:'Report a Problem',   sub:'Something not working?',          action:()=>showToast('Report coming soon')},
        {label:'About Swoop',        sub:'Version 1.0.0 MVP',               action:()=>showToast('About coming soon')},
      ]
    }
  ]

  return (
    <div style={{position:'fixed',inset:0,background:'#000',zIndex:250,display:'flex',flexDirection:'column',fontFamily:"'Inter',sans-serif",color:'#fff',overflowY:'auto'}}>
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',borderBottom:'1px solid rgba(255,255,255,0.07)',background:'rgba(0,0,0,0.92)',backdropFilter:'blur(16px)',flexShrink:0,position:'sticky',top:0,zIndex:10}}>
        <button onClick={onBack} style={{width:36,height:36,borderRadius:'50%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <div style={{fontSize:17,fontWeight:800}}>Settings</div>
      </div>

      <div style={{padding:'8px 0 32px'}}>
        {SECTIONS.map(section=>(
          <div key={section.title} style={{marginBottom:8}}>
            <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.3)',letterSpacing:1.2,padding:'14px 16px 6px'}}>{section.title.toUpperCase()}</div>
            {section.items.map((item,i)=>(
              <button key={i} onClick={item.action||undefined} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'13px 16px',background:'none',border:'none',borderBottom:'1px solid rgba(255,255,255,0.04)',cursor:item.action?'pointer':'default',fontFamily:'inherit',textAlign:'left'}}>
                <div>
                  <div style={{fontSize:14,color:'white',fontWeight:500}}>{item.label}</div>
                  {item.sub&&<div style={{fontSize:11,color:'#52525B',marginTop:1}}>{item.sub}</div>}
                </div>
                {item.toggle ? (
                  <div onClick={()=>setSettings(s=>({...s,[item.key]:!s[item.key]}))} style={{width:44,height:26,borderRadius:13,background:settings[item.key]?'#FF3366':'rgba(255,255,255,0.1)',position:'relative',cursor:'pointer',transition:'background 0.2s',flexShrink:0}}>
                    <div style={{width:20,height:20,borderRadius:'50%',background:'white',position:'absolute',top:3,left:settings[item.key]?21:3,transition:'left 0.2s',boxShadow:'0 1px 4px rgba(0,0,0,0.3)'}}/>
                  </div>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                )}
              </button>
            ))}
          </div>
        ))}

        <div style={{padding:'16px'}}>
          <button onClick={onSignOut} style={{width:'100%',padding:'13px',background:'rgba(255,51,102,0.08)',border:'1px solid rgba(255,51,102,0.2)',borderRadius:12,color:'#FF3366',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:7}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
