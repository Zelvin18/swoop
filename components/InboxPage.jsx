import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import AddStoryScreen from './AddStoryScreen'
import ChatScreen     from './ChatScreen'

function avatarColor(id=''){const C=['#7C3AED','#FF3366','#F97316','#22C55E','#3B82F6','#EC4899','#F59E0B','#06B6D4'];return C[id.split('').reduce((a,c)=>a+c.charCodeAt(0),0)%C.length]}
function initials(n=''){return n.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)||'?'}
function timeAgo(d){const diff=Date.now()-new Date(d);const m=Math.floor(diff/60000);if(m<1)return 'now';if(m<60)return `${m}m`;const h=Math.floor(m/60);if(h<24)return `${h}h`;if(h<48)return 'Yesterday';return new Date(d).toLocaleDateString('en-UG',{month:'short',day:'numeric'})}

const FILTERS=['All','Unread','Messages','Orders','Alerts']

export default function InboxPage({ showToast, currentUser }) {
  const [activeFilter,  setActiveFilter]  = useState('All')
  const [stories,       setStories]       = useState([])
  const [conversations, setConversations] = useState([])
  const [loading,       setLoading]       = useState(true)
  const [showSearch,    setShowSearch]    = useState(false)
  const [searchQuery,   setSearchQuery]   = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showAddStory,  setShowAddStory]  = useState(false)
  const [activeChat,    setActiveChat]    = useState(null)
  const [unreadCounts,  setUnreadCounts]  = useState({})
  const searchRef = useRef(null)

  // ── Load conversations ──────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return
    loadConversations()
    loadStories()
  }, [currentUser?.id])

  const loadConversations = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('conversations')
      .select(`
        *,
        post:posts(id,title,price,images,emoji,bg_color,condition),
        buyer_profile:profiles!buyer_id(id,full_name,username,avatar_url,verified),
        seller_profile:profiles!seller_id(id,full_name,username,avatar_url,verified)
      `)
      .or(`buyer_id.eq.${currentUser.id},seller_id.eq.${currentUser.id}`)
      .order('last_at', { ascending: false })
    setConversations(data || [])
    setLoading(false)
  }

  const loadStories = async () => {
    const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', currentUser.id)
    const ids = (follows||[]).map(f=>f.following_id)
    if (!ids.length) return
    const { data } = await supabase
      .from('stories')
      .select(`*, author:profiles!user_id(id,full_name,username,avatar_url,verified)`)
      .in('user_id', ids)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
    setStories(data || [])
  }

  // Realtime: new messages
  useEffect(() => {
    if (!currentUser) return
    const channel = supabase.channel('inbox-convos')
      .on('postgres_changes',{ event:'UPDATE', schema:'public', table:'conversations' }, () => loadConversations())
      .on('postgres_changes',{ event:'INSERT', schema:'public', table:'conversations' }, () => loadConversations())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [currentUser?.id])

  // Search
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('conversations')
        .select(`*,
          post:posts(id,title,price,emoji),
          buyer_profile:profiles!buyer_id(id,full_name,username),
          seller_profile:profiles!seller_id(id,full_name,username)
        `)
        .or(`buyer_id.eq.${currentUser?.id},seller_id.eq.${currentUser?.id}`)
        .ilike('last_message', `%${searchQuery}%`)
        .limit(15)
      setSearchResults(data || [])
    }, 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  const getOtherProfile = (convo) => currentUser?.id === convo.buyer_id ? convo.seller_profile : convo.buyer_profile
  const getUnread = (convo) => currentUser?.id === convo.buyer_id ? convo.unread_buyer : convo.unread_seller

  const totalUnread = conversations.reduce((sum, c) => sum + (getUnread(c)||0), 0)

  const displayConvos = showSearch && searchQuery ? searchResults : conversations

  // Chat screen
  if (activeChat) return (
    <ChatScreen conversation={activeChat} currentUser={currentUser} onBack={() => { setActiveChat(null); loadConversations() }} />
  )

  // Add story screen
  if (showAddStory) return (
    <AddStoryScreen currentUser={currentUser} onClose={() => setShowAddStory(false)} onPosted={() => { setShowAddStory(false); loadStories(); showToast('Story posted!') }} />
  )

  return (
    <div style={{ paddingBottom: 20, fontFamily:"'Inter',sans-serif" }}>

      {/* ── Header ── */}
      {!showSearch ? (
        <div className="page-header">
          <div>
            <div className="page-title">Inbox</div>
            <div className="page-subtitle">
              {totalUnread > 0 ? `${totalUnread} unread message${totalUnread>1?'s':''}` : 'Messages & updates'}
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button className="header-btn" onClick={() => { setShowSearch(true); setTimeout(()=>searchRef.current?.focus(),100) }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            <button className="header-btn" onClick={() => showToast('New message coming soon')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderBottom:'1px solid rgba(255,255,255,0.07)', background:'rgba(0,0,0,0.92)', backdropFilter:'blur(16px)', position:'sticky', top:0, zIndex:10 }}>
          <button onClick={() => { setShowSearch(false); setSearchQuery('') }} style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <div style={{ flex:1, position:'relative' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="2" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input ref={searchRef} value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search conversations..." style={{ width:'100%', padding:'10px 12px 10px 36px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, color:'white', fontSize:14, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }} />
          </div>
        </div>
      )}

      {/* ── Stories row ── */}
      {!showSearch && (
        <div style={{ padding:'12px 16px 8px', overflowX:'auto', display:'flex', gap:14, scrollbarWidth:'none' }}>
          {/* Your story */}
          <div onClick={() => setShowAddStory(true)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, flexShrink:0, cursor:'pointer' }}>
            <div style={{ position:'relative', width:64, height:64 }}>
              <div style={{ width:64, height:64, borderRadius:'50%', background:'#1e1e1e', border:'2px dashed rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              </div>
              <div style={{ position:'absolute', bottom:-1, right:-1, width:22, height:22, borderRadius:'50%', background:'linear-gradient(135deg,#D946EF,#FF3366)', border:'2.5px solid #000', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
            </div>
            <span style={{ fontSize:10, color:'#71717A', fontWeight:500 }}>Your story</span>
          </div>

          {/* Following stories */}
          {stories.map(s => {
            const author = s.author || {}
            const color  = avatarColor(author.id||'')
            const init   = initials(author.full_name||author.username||'U')
            return (
              <div key={s.id} onClick={() => showToast('Story viewer coming soon')} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, flexShrink:0, cursor:'pointer' }}>
                <div style={{ width:64, height:64, borderRadius:'50%', padding:2.5, background:'linear-gradient(135deg,#D946EF,#FF3366,#FB923C)' }}>
                  <div style={{ width:'100%', height:'100%', borderRadius:'50%', background:color, border:'2px solid #000', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:900, color:'white', overflow:'hidden' }}>
                    {author.avatar_url ? <img src={author.avatar_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : init}
                  </div>
                </div>
                <span style={{ fontSize:10, color:'#A1A1AA', maxWidth:64, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textAlign:'center', fontWeight:500 }}>
                  {author.full_name || author.username}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Filter pills ── */}
      {!showSearch && (
        <div style={{ display:'flex', gap:7, padding:'4px 16px 12px', overflowX:'auto', scrollbarWidth:'none' }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setActiveFilter(f)} style={{
              flexShrink:0, padding:'7px 15px', borderRadius:20, border:'none', cursor:'pointer', fontFamily:'inherit',
              fontSize:13, fontWeight:600, transition:'all 0.15s',
              background: activeFilter===f ? '#FF3366' : 'rgba(255,255,255,0.05)',
              color: activeFilter===f ? 'white' : 'rgba(255,255,255,0.45)',
              boxShadow: activeFilter===f ? '0 2px 12px rgba(255,51,102,0.3)' : 'none',
            }}>
              {f}
            </button>
          ))}
        </div>
      )}

      {/* ── Conversations ── */}
      <div style={{ padding:'0 14px' }}>
        {loading && !showSearch && (
          <div style={{ display:'flex', flexDirection:'column', gap:10, padding:'4px 0' }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ display:'flex', gap:12, alignItems:'center', padding:'4px 0' }}>
                <div style={{ width:52, height:52, borderRadius:'50%', background:'rgba(255,255,255,0.05)', flexShrink:0, animation:'pulse 1.5s ease-in-out infinite', animationDelay:`${i*0.1}s` }} />
                <div style={{ flex:1, display:'flex', flexDirection:'column', gap:7 }}>
                  <div style={{ height:12, borderRadius:6, background:'rgba(255,255,255,0.05)', width:'50%', animation:'pulse 1.5s ease-in-out infinite' }} />
                  <div style={{ height:10, borderRadius:6, background:'rgba(255,255,255,0.03)', width:'75%', animation:'pulse 1.5s ease-in-out infinite' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && displayConvos.length === 0 && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'56px 24px', gap:12 }}>
            <div style={{ width:64, height:64, borderRadius:18, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            </div>
            <div style={{ fontSize:16, fontWeight:700, color:'#A1A1AA' }}>{showSearch && searchQuery ? 'No results found' : 'No messages yet'}</div>
            <div style={{ fontSize:13, color:'#52525B', textAlign:'center', lineHeight:1.6 }}>
              {showSearch && searchQuery ? `No conversations matching "${searchQuery}"` : 'Start chatting by tapping "Chat with Seller" on any post'}
            </div>
          </div>
        )}

        {displayConvos.map(convo => {
          const other  = getOtherProfile(convo)
          const unread = getUnread(convo)
          const color  = avatarColor(other?.id||'')
          const init   = initials(other?.full_name||other?.username||'U')
          return (
            <div key={convo.id} onClick={() => setActiveChat(convo)} style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 0', borderBottom:'1px solid rgba(255,255,255,0.05)', cursor:'pointer' }}>
              <div style={{ position:'relative', flexShrink:0 }}>
                <div style={{ width:52, height:52, borderRadius:'50%', background:color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, fontWeight:900, color:'white', overflow:'hidden' }}>
                  {other?.avatar_url ? <img src={other.avatar_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : init}
                </div>
                {/* Product thumbnail inset */}
                {convo.post && (
                  <div style={{ position:'absolute', bottom:-2, right:-2, width:20, height:20, borderRadius:5, background:convo.post.bg_color||'#1a1a2e', border:'2px solid #000', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, overflow:'hidden' }}>
                    {convo.post.images?.[0] ? <img src={convo.post.images[0]} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : convo.post.emoji||'📦'}
                  </div>
                )}
              </div>

              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:3 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:15, fontWeight: unread>0 ? 700 : 500 }}>
                    {other?.full_name || other?.username || 'User'}
                    {other?.verified && <span style={{ width:13, height:13, borderRadius:'50%', background:'#3B82F6', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:7, color:'white', fontWeight:900 }}>✓</span>}
                  </div>
                  <span style={{ fontSize:11, color: unread>0 ? '#FF3366' : '#52525B' }}>{convo.last_at ? timeAgo(convo.last_at) : ''}</span>
                </div>
                {convo.post && (
                  <div style={{ display:'inline-flex', alignItems:'center', gap:4, background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.18)', borderRadius:20, padding:'1px 8px', fontSize:10, fontWeight:600, color:'#A855F7', marginBottom:3 }}>
                    {convo.post.title?.slice(0,24)}{convo.post.title?.length>24?'…':''}
                  </div>
                )}
                <div style={{ fontSize:13, color: unread>0 ? '#E4E4E7' : '#71717A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight: unread>0 ? 500 : 400 }}>
                  {convo.last_message || 'Start a conversation'}
                </div>
              </div>

              <div style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:5 }}>
                {unread > 0 && (
                  <div style={{ minWidth:20, height:20, borderRadius:10, background:'#FF3366', color:'white', fontSize:10, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 5px' }}>{unread}</div>
                )}
                {convo.is_muted && !unread && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6"/></svg>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  )
}
