/**
 * ChatScreen — context-aware chat
 * - Loads from: product post, request, order, or direct
 * - Product card pinned at top if context is product
 * - Reserve/Offer actions based on context
 * - Real-time via Supabase Realtime
 */
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { formatUGX } from '../lib/feed'

function avatarColor(id='') {
  const C=['#7C3AED','#FF3366','#F97316','#22C55E','#3B82F6','#EC4899','#F59E0B','#06B6D4']
  return C[id.split('').reduce((a,c)=>a+c.charCodeAt(0),0)%C.length]
}
function initials(n='') { return n.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)||'?' }
function timeLabel(d) {
  const diff = Date.now()-new Date(d)
  const m = Math.floor(diff/60000)
  if(m<1) return 'now'
  if(m<60) return `${m}m`
  const h=Math.floor(m/60); if(h<24) return `${h}h`
  return new Date(d).toLocaleTimeString('en-UG',{hour:'2-digit',minute:'2-digit'})
}

export default function ChatScreen({ conversation, currentUser, onBack }) {
  const [messages,  setMessages]  = useState([])
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(true)
  const [sending,   setSending]   = useState(false)
  const listRef = useRef(null)

  const other = currentUser?.id === conversation.buyer_id
    ? conversation.seller_profile
    : conversation.buyer_profile

  const otherColor   = avatarColor(other?.id || '')
  const otherInitial = initials(other?.full_name || other?.username || 'U')
  const post         = conversation.post

  // Load messages
  useEffect(() => {
    supabase.from('messages').select('*, sender:profiles!sender_id(id,full_name,username,avatar_url)')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => { setMessages(data || []); setLoading(false) })
  }, [conversation.id])

  // Realtime
  useEffect(() => {
    const channel = supabase.channel(`chat-${conversation.id}`)
      .on('postgres_changes',{ event:'INSERT', schema:'public', table:'messages', filter:`conversation_id=eq.${conversation.id}` },
        async payload => {
          const { data: sender } = await supabase.from('profiles').select('id,full_name,username').eq('id',payload.new.sender_id).single()
          setMessages(prev => [...prev, { ...payload.new, sender }])
        })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [conversation.id])

  // Auto-scroll
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages])

  const sendMessage = async (content, messageType = 'text', metadata = {}) => {
    if (!content.trim() && messageType === 'text') return
    setSending(true)
    const msg = content.trim() || JSON.stringify(metadata)
    // Optimistic
    setMessages(prev => [...prev, {
      id: 'opt-'+Date.now(), conversation_id: conversation.id,
      sender_id: currentUser.id, content: msg, message_type: messageType,
      metadata, created_at: new Date().toISOString(),
      sender: { id: currentUser.id, full_name: currentUser.user_metadata?.full_name || 'You' }
    }])
    setInput('')
    await supabase.from('messages').insert({
      conversation_id: conversation.id, sender_id: currentUser.id,
      content: msg, message_type: messageType, metadata,
    })
    // Update conversation last_message
    await supabase.from('conversations').update({ last_message: msg, last_at: new Date().toISOString() }).eq('id', conversation.id)
    setSending(false)
  }

  const sendReserve = () => sendMessage('I would like to reserve this item', 'reservation', { post_id: post?.id, post_title: post?.title, price: post?.price })
  const sendOffer   = () => sendMessage(`I'd like to make an offer on ${post?.title}`, 'offer', { post_id: post?.id })

  return (
    <div style={S.page}>
      {/* ── HEADER ── */}
      <div style={S.header}>
        <button onClick={onBack} style={S.backBtn}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <div onClick={() => {}} style={{ display:'flex', alignItems:'center', gap:10, flex:1, cursor:'pointer' }}>
          <div style={{ position:'relative' }}>
            <div style={{ width:38, height:38, borderRadius:'50%', background:otherColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:900, color:'white' }}>{otherInitial}</div>
            <div style={{ position:'absolute', bottom:0, right:0, width:10, height:10, borderRadius:'50%', background:'#22C55E', border:'2px solid #000' }} />
          </div>
          <div>
            <div style={{ fontSize:14, fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
              {other?.full_name || other?.username || 'User'}
              {other?.verified && <span style={{ width:13, height:13, borderRadius:'50%', background:'#3B82F6', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:7, color:'white', fontWeight:900 }}>✓</span>}
            </div>
            <div style={{ fontSize:11, color:'#22C55E' }}>Online</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button style={S.iconBtn}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013 4.7a19.79 19.79 0 01-3.07-8.67A2 2 0 011.72 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg></button>
          <button style={S.iconBtn}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg></button>
        </div>
      </div>

      {/* ── PRODUCT CONTEXT CARD ── */}
      {post && (
        <div style={S.productCard}>
          <div style={{ width:52, height:52, borderRadius:10, background:post.bg_color||'#1a1a2e', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0, overflow:'hidden' }}>
            {post.images?.[0] ? <img src={post.images[0]} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <span>{post.emoji||'📦'}</span>}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{post.title}</div>
            <div style={{ fontSize:13, fontWeight:800, color:'#FF3366' }}>{formatUGX(post.price)}</div>
            <div style={{ fontSize:11, color:'#71717A', marginTop:1 }}>{post.condition}</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </div>
      )}

      {/* ── QUICK ACTIONS (product context) ── */}
      {post && (
        <div style={S.quickActions}>
          <button onClick={sendOffer} style={S.quickBtn}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            Make Offer
          </button>
          <button onClick={sendReserve} style={{ ...S.quickBtn, background:'rgba(34,197,94,0.12)', border:'1px solid rgba(34,197,94,0.25)', color:'#22C55E' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
            Reserve Item
          </button>
          <button onClick={() => {}} style={{ ...S.quickBtn, background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.2)', color:'#3B82F6' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            Request Delivery
          </button>
        </div>
      )}

      {/* ── MESSAGES ── */}
      <div ref={listRef} style={S.messageList}>
        {loading && <div style={S.center}><div style={{ width:22, height:22, border:'2px solid rgba(255,255,255,0.08)', borderTopColor:'#FF3366', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} /></div>}

        {/* Date separator */}
        {!loading && <div style={S.dateSep}><span style={{ background:'#141414', padding:'3px 12px', borderRadius:20, fontSize:11, color:'#52525B', border:'1px solid rgba(255,255,255,0.06)' }}>Today</span></div>}

        {messages.map((msg, i) => {
          const isOwn = msg.sender_id === currentUser?.id
          const sender = msg.sender || {}
          const color  = avatarColor(sender.id || '')
          const showAvatar = !isOwn && (i === 0 || messages[i-1]?.sender_id !== msg.sender_id)
          const isSpecial = msg.message_type !== 'text'

          return (
            <div key={msg.id} style={{ display:'flex', flexDirection:isOwn?'row-reverse':'row', alignItems:'flex-end', gap:7, marginBottom:6, paddingRight:isOwn?0:48, paddingLeft:isOwn?48:0 }}>
              {!isOwn && showAvatar && (
                <div style={{ width:26, height:26, borderRadius:'50%', background:color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:900, color:'white', flexShrink:0, marginBottom:2 }}>
                  {initials(sender.full_name||sender.username||'U')}
                </div>
              )}
              {!isOwn && !showAvatar && <div style={{ width:26, flexShrink:0 }} />}

              <div style={{ maxWidth:'78%' }}>
                {isSpecial ? (
                  <SpecialMessage msg={msg} isOwn={isOwn} />
                ) : (
                  <div style={{
                    padding:'10px 13px',
                    background: isOwn ? 'linear-gradient(135deg,#FF3366,#FF6633)' : '#1e1e1e',
                    borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    fontSize:14, lineHeight:1.45, color:'white',
                    boxShadow: isOwn ? '0 2px 10px rgba(255,51,102,0.3)' : 'none',
                  }}>
                    {msg.content}
                  </div>
                )}
                <div style={{ fontSize:10, color:'#52525B', marginTop:3, textAlign:isOwn?'right':'left' }}>
                  {timeLabel(msg.created_at)}
                  {isOwn && <span style={{ marginLeft:5, color:msg.read_at?'#3B82F6':'#52525B' }}>
                    {msg.read_at ? '✓✓' : '✓'}
                  </span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── INPUT BAR ── */}
      <div style={S.inputBar}>
        <button style={S.attachBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMessage(input)} placeholder="Message..." style={S.input} />
        {input.trim() ? (
          <button onClick={() => sendMessage(input)} disabled={sending} style={S.sendBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        ) : (
          <button style={{ ...S.sendBtn, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></svg>
          </button>
        )}
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function SpecialMessage({ msg, isOwn }) {
  const meta = msg.metadata || {}
  const typeConfig = {
    reservation: { color:'#22C55E', icon:'🤝', label:'Reservation Request' },
    offer:        { color:'#FF3366', icon:'⭐', label:'Offer Made' },
    product_card: { color:'#7C3AED', icon:'🛍️', label:'Product' },
    system:       { color:'#71717A', icon:'ℹ️', label:'System' },
  }
  const cfg = typeConfig[msg.message_type] || typeConfig.system
  return (
    <div style={{ background: isOwn ? 'rgba(255,51,102,0.12)' : '#1e1e1e', border:`1px solid ${cfg.color}30`, borderRadius:14, padding:'10px 13px', minWidth:180 }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
        <span style={{ fontSize:14 }}>{cfg.icon}</span>
        <span style={{ fontSize:11, fontWeight:700, color:cfg.color, letterSpacing:0.3 }}>{cfg.label}</span>
      </div>
      <div style={{ fontSize:13, color:'rgba(255,255,255,0.8)', lineHeight:1.4 }}>{msg.content}</div>
      {meta.post_title && <div style={{ fontSize:11, color:'#71717A', marginTop:4 }}>{meta.post_title}</div>}
    </div>
  )
}

const S = {
  page:       { position:'fixed', inset:0, zIndex:250, background:'#000', display:'flex', flexDirection:'column', fontFamily:"'Inter',sans-serif", color:'#fff' },
  header:     { display:'flex', alignItems:'center', gap:10, padding:'12px 14px', paddingTop:'calc(env(safe-area-inset-top,0px) + 12px)', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(0,0,0,0.95)', backdropFilter:'blur(16px)', flexShrink:0, zIndex:10 },
  backBtn:    { width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 },
  iconBtn:    { width:34, height:34, borderRadius:'50%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' },
  productCard:{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'#0d0d0d', borderBottom:'1px solid rgba(255,255,255,0.06)', cursor:'pointer', flexShrink:0 },
  quickActions:{ display:'flex', gap:8, padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.06)', overflowX:'auto', scrollbarWidth:'none', flexShrink:0 },
  quickBtn:   { display:'flex', alignItems:'center', gap:5, padding:'7px 13px', borderRadius:20, background:'rgba(255,51,102,0.1)', border:'1px solid rgba(255,51,102,0.2)', color:'#FF3366', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' },
  messageList:{ flex:1, overflowY:'auto', padding:'12px 14px', scrollbarWidth:'none' },
  center:     { display:'flex', justifyContent:'center', padding:24 },
  dateSep:    { display:'flex', justifyContent:'center', margin:'8px 0 12px' },
  inputBar:   { display:'flex', alignItems:'center', gap:8, padding:'10px 14px', paddingBottom:'calc(env(safe-area-inset-bottom,0px) + 10px)', borderTop:'1px solid rgba(255,255,255,0.06)', background:'rgba(0,0,0,0.95)', backdropFilter:'blur(16px)', flexShrink:0 },
  attachBtn:  { width:34, height:34, borderRadius:'50%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 },
  input:      { flex:1, padding:'10px 14px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:22, color:'white', fontSize:14, outline:'none', fontFamily:'inherit' },
  sendBtn:    { width:38, height:38, borderRadius:'50%', background:'linear-gradient(135deg,#FF3366,#FF6633)', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, boxShadow:'0 2px 10px rgba(255,51,102,0.35)' },
}
