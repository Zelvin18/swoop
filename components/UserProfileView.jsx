/**
 * UserProfileView — Public profile of another user
 * Opens when tapping seller avatar/name in feed
 * IG-style: avatar, stats, bio, posts grid, follow button
 */
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function avatarColor(id=''){const C=['#7C3AED','#FF3366','#F97316','#22C55E','#3B82F6','#EC4899','#F59E0B','#06B6D4'];return C[id.split('').reduce((a,c)=>a+c.charCodeAt(0),0)%C.length]}
function fmtNum(n){return n>=1000?(n/1000).toFixed(1).replace('.0','')+'K':String(n||0)}

export default function UserProfileView({ userId, currentUser, onClose }) {
  const [profile,   setProfile]   = useState(null)
  const [posts,     setPosts]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [following, setFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [viewPost,  setViewPost]  = useState(null)
  const [activeTab, setActiveTab] = useState('Posts')

  const isOwnProfile = currentUser?.id === userId

  useEffect(() => {
    if (!userId) return
    load()
  }, [userId])

  const load = async () => {
    setLoading(true)
    const [{ data: prof }, { data: userPosts }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('posts').select('*').eq('seller_id', userId).neq('status','draft').order('created_at',{ascending:false}).limit(30),
    ])
    setProfile(prof)
    setPosts(userPosts || [])

    // Check follow state
    if (currentUser?.id && currentUser.id !== userId) {
      const { data: follow } = await supabase.from('follows').select('id')
        .eq('follower_id', currentUser.id).eq('following_id', userId).maybeSingle()
      setFollowing(!!follow)
    }
    setLoading(false)
  }

  const handleFollow = async () => {
    if (!currentUser || isOwnProfile || followLoading) return
    setFollowLoading(true)
    if (following) {
      setFollowing(false)
      setProfile(p => p ? {...p, followers_count: Math.max((p.followers_count||0)-1,0)} : p)
      await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', userId)
    } else {
      setFollowing(true)
      setProfile(p => p ? {...p, followers_count: (p.followers_count||0)+1} : p)
      await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: userId })
    }
    setFollowLoading(false)
  }

  const color   = avatarColor(userId || '')
  const initial = (profile?.full_name || profile?.username || '?')[0]?.toUpperCase() || '?'

  const filteredPosts = posts.filter(p =>
    activeTab === 'Posts'    ? true :
    activeTab === 'Products' ? p.post_type === 'product' :
    activeTab === 'Services' ? p.post_type === 'service' : true
  )

  return (
    <div style={{position:'fixed',inset:0,zIndex:500,background:'#000',display:'flex',flexDirection:'column',fontFamily:"'Inter',sans-serif",color:'#fff',overflowY:'auto'}}>

      {/* ── Header ── */}
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',paddingTop:'calc(env(safe-area-inset-top,0px)+10px)',background:'rgba(0,0,0,0.95)',backdropFilter:'blur(16px)',position:'sticky',top:0,zIndex:10,borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <button onClick={onClose} style={{width:36,height:36,borderRadius:'50%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <div style={{flex:1}}>
          <div style={{fontSize:16,fontWeight:800,color:'white'}}>{profile?.username ? `@${profile.username}` : 'Profile'}</div>
        </div>
        <button style={{width:36,height:36,borderRadius:'50%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
        </button>
      </div>

      {loading ? (
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',flex:1,padding:48}}>
          <div style={{width:28,height:28,border:'3px solid rgba(255,255,255,0.08)',borderTopColor:'#FF3366',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
        </div>
      ) : (
        <>
          {/* ── Avatar + stats ── */}
          <div style={{padding:'20px 16px 16px',display:'flex',alignItems:'flex-start',gap:20}}>
            {/* Avatar */}
            <div style={{width:86,height:86,borderRadius:'50%',background:color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:30,fontWeight:900,color:'white',flexShrink:0,overflow:'hidden',border:'3px solid rgba(255,255,255,0.1)',boxShadow:`0 0 0 3px ${color}33`}}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                : initial
              }
            </div>
            {/* Stats */}
            <div style={{flex:1,display:'flex',justifyContent:'space-around',paddingTop:10}}>
              {[
                {val:fmtNum(profile?.posts_count||posts.length), label:'Posts'},
                {val:fmtNum(profile?.followers_count||0), label:'Followers'},
                {val:fmtNum(profile?.following_count||0), label:'Following'},
              ].map(s=>(
                <div key={s.label} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                  <span style={{fontSize:20,fontWeight:800,color:'white'}}>{s.val}</span>
                  <span style={{fontSize:12,color:'#71717A'}}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Bio ── */}
          <div style={{padding:'0 16px 16px'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
              <span style={{fontSize:15,fontWeight:700}}>{profile?.full_name||'User'}</span>
              {profile?.verified&&<span style={{width:15,height:15,borderRadius:'50%',background:'#3B82F6',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:8,color:'white',fontWeight:900}}>✓</span>}
              {profile?.badge&&<span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,background:'rgba(255,51,102,0.12)',border:'1px solid rgba(255,51,102,0.25)',color:'#FF3366'}}>{profile.badge}</span>}
            </div>
            {profile?.username&&<div style={{fontSize:13,color:'#71717A',marginBottom:4}}>@{profile.username}</div>}
            {profile?.bio&&<div style={{fontSize:13,color:'rgba(255,255,255,0.75)',lineHeight:1.5,marginBottom:6}}>{profile.bio}</div>}
            {profile?.location&&(
              <div style={{display:'flex',alignItems:'center',gap:4,fontSize:12,color:'#71717A'}}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {profile.location}
              </div>
            )}
          </div>

          {/* ── Action buttons ── */}
          <div style={{display:'flex',gap:8,padding:'0 16px 16px'}}>
            {!isOwnProfile ? (
              <>
                <button onClick={handleFollow} disabled={followLoading}
                  style={{flex:1,padding:'10px',borderRadius:10,border:`1.5px solid ${following?'rgba(255,255,255,0.2)':'rgba(255,255,255,0.15)'}`,background:following?'rgba(255,255,255,0.06)':'linear-gradient(135deg,#FF3366,#FF6633)',color:'white',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',boxShadow:following?'none':'0 3px 14px rgba(255,51,102,0.35)',transition:'all 0.2s',opacity:followLoading?0.6:1}}>
                  {followLoading ? '...' : following ? 'Following' : 'Follow'}
                </button>
                <button style={{flex:1,padding:'10px',borderRadius:10,border:'1.5px solid rgba(255,255,255,0.12)',background:'rgba(255,255,255,0.06)',color:'white',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                  Message
                </button>
              </>
            ) : (
              <div style={{flex:1,padding:'10px',borderRadius:10,border:'1px solid rgba(255,255,255,0.1)',background:'#141414',color:'rgba(255,255,255,0.4)',fontSize:14,fontWeight:600,textAlign:'center',cursor:'default'}}>
                Your Profile
              </div>
            )}
          </div>

          {/* ── Post tabs ── */}
          <div style={{display:'flex',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
            {['Posts','Products','Services'].map(t=>(
              <button key={t} onClick={()=>setActiveTab(t)} style={{flex:1,padding:'10px 0',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:activeTab===t?700:400,color:activeTab===t?'white':'#52525B',borderBottom:`2px solid ${activeTab===t?'#FF3366':'transparent'}`,transition:'all 0.2s'}}>
                {t}
              </button>
            ))}
          </div>

          {/* ── Posts grid ── */}
          {filteredPosts.length === 0 ? (
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'48px 24px',gap:12}}>
              <div style={{width:56,height:56,borderRadius:16,background:'#141414',border:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
              </div>
              <div style={{fontSize:14,fontWeight:600,color:'#A1A1AA'}}>No {activeTab.toLowerCase()} yet</div>
            </div>
          ) : (
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:2,padding:2}}>
              {filteredPosts.map(post=>(
                <div key={post.id} onClick={()=>setViewPost(post)} style={{aspectRatio:'1',position:'relative',overflow:'hidden',cursor:'pointer',borderRadius:2,background:'#141414'}}>
                  {post.images?.[0]
                    ? <img src={post.images[0]} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    : post.video_url
                      ? <video src={post.video_url} style={{width:'100%',height:'100%',objectFit:'cover'}} muted playsInline/>
                      : <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26}}>{post.emoji||'📦'}</div>
                  }
                  {post.post_type!=='product'&&(
                    <div style={{position:'absolute',top:4,left:4,fontSize:8,fontWeight:700,padding:'1px 5px',borderRadius:4,background:post.post_type==='social'?'rgba(124,58,237,0.85)':'rgba(249,115,22,0.85)',color:'white'}}>
                      {post.post_type==='social'?'S':'SVC'}
                    </div>
                  )}
                  {post.video_url&&<div style={{position:'absolute',bottom:4,right:4,opacity:0.85}}><svg width="11" height="11" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>}
                </div>
              ))}
            </div>
          )}

          {/* Ratings */}
          {(profile?.review_count||0) > 0 && (
            <div style={{margin:'16px 16px 24px',padding:'14px',background:'#141414',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,display:'flex',alignItems:'center',gap:12}}>
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:22,fontWeight:900,color:'white'}}>{(profile.avg_rating||0).toFixed(1)}</div>
                <div style={{display:'flex',gap:2,justifyContent:'center',margin:'2px 0'}}>
                  {[1,2,3,4,5].map(s=><svg key={s} width="10" height="10" viewBox="0 0 24 24" fill={s<=Math.round(profile.avg_rating||0)?'#F59E0B':'rgba(255,255,255,0.15)'}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>)}
                </div>
                <div style={{fontSize:10,color:'#71717A'}}>{profile.review_count} reviews</div>
              </div>
              <div style={{flex:1,fontSize:12,color:'#A1A1AA',lineHeight:1.5,borderLeft:'1px solid rgba(255,255,255,0.07)',paddingLeft:12}}>
                Based on {profile.review_count} customer reviews
              </div>
            </div>
          )}
        </>
      )}

      {/* Post detail viewer */}
      {viewPost && <PostQuickView post={viewPost} onClose={()=>setViewPost(null)}/>}

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── Quick post viewer ──────────────────────────────────────────────────────────
function PostQuickView({ post: p, onClose }) {
  const isVideo = !!p.video_url
  const hasImages = p.images?.length > 0
  const [imgIdx, setImgIdx] = useState(0)
  return (
    <div style={{position:'fixed',inset:0,zIndex:600,background:'#000',display:'flex',flexDirection:'column'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',paddingTop:'calc(env(safe-area-inset-top,0px)+10px)',background:'rgba(0,0,0,0.9)',backdropFilter:'blur(12px)',flexShrink:0}}>
        <button onClick={onClose} style={{width:36,height:36,borderRadius:'50%',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.1)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <div style={{flex:1,fontSize:15,fontWeight:700,color:'white',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.title||'Post'}</div>
      </div>
      {/* Media */}
      <div style={{flex:1,position:'relative',overflow:'hidden',background:'#0a0a0a'}}>
        {isVideo ? (
          <video src={p.video_url} style={{width:'100%',height:'100%',objectFit:'contain'}} controls autoPlay playsInline/>
        ) : hasImages ? (
          <>
            {p.images.length > 1 ? (
              <div style={{display:'flex',width:'100%',height:'100%',overflowX:'auto',scrollSnapType:'x mandatory',scrollbarWidth:'none'}}
                onScroll={e=>setImgIdx(Math.round(e.currentTarget.scrollLeft/e.currentTarget.offsetWidth))}>
                {p.images.map((src,i)=>(
                  <img key={i} src={src} alt="" style={{width:'100%',height:'100%',objectFit:'contain',flexShrink:0,scrollSnapAlign:'start'}}/>
                ))}
              </div>
            ) : (
              <img src={p.images[0]} alt="" style={{width:'100%',height:'100%',objectFit:'contain'}}/>
            )}
            {p.images.length > 1 && (
              <div style={{position:'absolute',bottom:12,left:0,right:0,display:'flex',justifyContent:'center',gap:5}}>
                {p.images.map((_,i)=>(
                  <div key={i} style={{width:i===imgIdx?18:6,height:4,borderRadius:2,background:i===imgIdx?'white':'rgba(255,255,255,0.4)',transition:'all 0.2s'}}/>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:80}}>{p.emoji||'📦'}</div>
        )}
      </div>
      {/* Details */}
      <div style={{padding:'14px 16px',background:'#0d0d0d',borderTop:'1px solid rgba(255,255,255,0.07)',paddingBottom:'calc(env(safe-area-inset-bottom,0px)+14px)'}}>
        {p.caption&&<div style={{fontSize:14,color:'white',lineHeight:1.6,marginBottom:8}}>{p.caption}</div>}
        {p.description&&<div style={{fontSize:13,color:'rgba(255,255,255,0.6)',lineHeight:1.6,marginBottom:8}}>{p.description}</div>}
        {p.price&&<div style={{fontSize:20,fontWeight:900,color:'#FF3366',marginBottom:6}}>UGX {Number(p.price).toLocaleString()}</div>}
        <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:4}}>
          {p.category&&<span style={{fontSize:11,padding:'3px 10px',borderRadius:20,background:'rgba(255,255,255,0.07)',color:'rgba(255,255,255,0.5)',border:'1px solid rgba(255,255,255,0.1)'}}>{p.category}</span>}
          {p.condition&&<span style={{fontSize:11,padding:'3px 10px',borderRadius:20,background:'rgba(255,255,255,0.07)',color:'rgba(255,255,255,0.5)',border:'1px solid rgba(255,255,255,0.1)'}}>{p.condition}</span>}
          {p.location&&<span style={{fontSize:11,padding:'3px 10px',borderRadius:20,background:'rgba(255,255,255,0.07)',color:'rgba(255,255,255,0.5)',border:'1px solid rgba(255,255,255,0.1)'}}>📍 {p.location}</span>}
        </div>
      </div>
    </div>
  )
}
