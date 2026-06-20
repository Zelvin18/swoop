import { useState, useEffect, useRef } from 'react'
import {
  fetchLiveProducts, sendLiveComment, sendLiveReaction,
  reserveProduct, joinStream, leaveStream,
  followUser, unfollowUser, isFollowing,
  avatarColor, initials, fmtViewers, fmtTime,
} from '../lib/live'
import { supabase } from '../lib/supabase'

export default function LiveViewerPage({ stream, currentUser, onClose }) {
  const [products,   setProducts]   = useState([])
  const [comments,   setComments]   = useState([])
  const [comment,    setComment]    = useState('')
  const [viewers,    setViewers]    = useState(stream.viewer_count || 0)
  const [liked,      setLiked]      = useState(false)
  const [likes,      setLikes]      = useState(0)
  const [following,  setFollowing]  = useState(false)
  const [showProds,  setShowProds]  = useState(false)
  const [reserved,   setReserved]   = useState({})
  const [gifts,      setGifts]      = useState([])
  const [elapsed,    setElapsed]    = useState(0)
  const chatRef = useRef(null)

  const host = stream.profiles || {}
  const hostColor   = avatarColor(host.id || stream.host_id)
  const hostInitial = initials(host.full_name || host.username || 'Host')
  const isSell      = stream.type === 'sell'

  // Join stream + load products
  useEffect(() => {
    joinStream(stream.id)
    if (isSell) fetchLiveProducts(stream.id).then(setProducts)

    // Check if following
    if (currentUser && host.id) {
      isFollowing(currentUser.id, host.id).then(setFollowing)
    }

    // Timer
    const timer = setInterval(() => setElapsed(e => e + 1), 1000)

    return () => {
      clearInterval(timer)
      leaveStream(stream.id)
    }
  }, [stream.id])

  // Realtime: comments
  useEffect(() => {
    const channel = supabase
      .channel(`live-comments-${stream.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'live_comments',
        filter: `stream_id=eq.${stream.id}`,
      }, payload => {
        const c = payload.new
        setComments(prev => [...prev.slice(-20), {
          id: c.id,
          user: c.profiles?.username || c.profiles?.full_name || 'viewer',
          text: c.message,
          color: avatarColor(c.user_id),
          userId: c.user_id,
        }])
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [stream.id])

  // Realtime: viewer count
  useEffect(() => {
    const channel = supabase
      .channel(`live-stream-${stream.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'live_streams',
        filter: `id=eq.${stream.id}`,
      }, payload => {
        setViewers(payload.new.viewer_count || 0)
        if (payload.new.status === 'ended') onClose()
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [stream.id])

  // Realtime: reactions (show floating emojis)
  useEffect(() => {
    const channel = supabase
      .channel(`live-reactions-${stream.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'live_reactions',
        filter: `stream_id=eq.${stream.id}`,
      }, payload => {
        const emoji = payload.new.type === 'fire' ? '🔥' : payload.new.type === 'clap' ? '👏' : '❤️'
        const id = Date.now() + Math.random()
        setGifts(g => [...g, { id, emoji }])
        setLikes(l => l + 1)
        setTimeout(() => setGifts(g => g.filter(x => x.id !== id)), 2000)
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [stream.id])

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [comments])

  const handleSend = async () => {
    if (!comment.trim() || !currentUser) return
    const msg = comment.trim()
    setComment('')
    // Optimistic
    setComments(prev => [...prev.slice(-20), {
      id: Date.now(), user: 'You', text: msg, color: '#FF3366',
    }])
    await sendLiveComment(stream.id, currentUser.id, msg)
  }

  const handleLike = async () => {
    setLiked(l => !l)
    setLikes(l => liked ? l - 1 : l + 1)
    if (currentUser && !liked) {
      await sendLiveReaction(stream.id, currentUser.id, 'heart')
    }
  }

  const handleReserve = async (product) => {
    if (!currentUser || reserved[product.id]) return
    setReserved(r => ({ ...r, [product.id]: true }))
    await reserveProduct(stream.id, product.id, currentUser.id)
    setComments(prev => [...prev.slice(-20), {
      id: Date.now(), user: 'You', text: `🛍️ Reserved ${product.name}!`, color: '#22C55E',
    }])
  }

  const handleFollow = async () => {
    if (!currentUser || !host.id) return
    if (following) {
      setFollowing(false)
      await unfollowUser(currentUser.id, host.id)
    } else {
      setFollowing(true)
      await followUser(currentUser.id, host.id)
    }
  }

  return (
    <div style={S.page}>
      {/* Full screen video bg */}
      <div style={{ ...S.videoBg, background: hostColor + '22' }}>
        <div style={S.videoPlaceholder}>
          <i className="fas fa-video" style={{ fontSize: 48, color: 'rgba(255,255,255,0.1)' }} />
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 8 }}>Live stream</div>
        </div>
      </div>
      <div style={S.overlay} />

      {/* Floating reactions */}
      <div style={S.giftsArea}>
        {gifts.map(g => <div key={g.id} style={S.giftFloat}>{g.emoji}</div>)}
      </div>

      {/* ── TOP BAR ── */}
      <div style={S.topBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <div style={{ ...S.hostAvatar, background: hostColor }}>{hostInitial}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {host.full_name || host.username || 'Host'}
              </span>
              {host.verified && <span style={S.verifiedDot}>✓</span>}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)' }}>
              {fmtViewers(likes)} likes
            </div>
          </div>
          <div style={S.livePill}><div style={S.blinkDot} />LIVE</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={S.viewerBadge}>
            <i className="fas fa-eye" style={{ fontSize: 9 }} /> {fmtViewers(viewers)}
          </div>
          <button onClick={onClose} style={S.xBtn}>
            <i className="fas fa-times" style={{ fontSize: 13 }} />
          </button>
        </div>
      </div>

      {/* Category + type tag */}
      <div style={{ position: 'absolute', top: 56, left: 14, display: 'flex', gap: 6, zIndex: 20 }}>
        {stream.category && (
          <div style={S.tag}>{stream.category}</div>
        )}
        <div style={{ ...S.tag, background: isSell ? 'rgba(34,197,94,0.7)' : 'rgba(124,58,237,0.7)' }}>
          {isSell ? '🛍️ Sell Live' : '🎙️ Social'}
        </div>
      </div>

      {/* ── RIGHT ACTIONS ── */}
      <div style={S.rightActions}>
        <ActionBtn icon="fa-heart" count={fmtViewers(likes)} active={liked} activeColor="#FF3366" onClick={handleLike} />
        <ActionBtn icon="fa-comment" count={fmtViewers(comments.length)} onClick={() => {}} />
        <ActionBtn icon="fa-share-nodes" onClick={() => {}} />
        <ActionBtn icon="fa-bookmark" onClick={() => {}} />
        {/* Host avatar */}
        <div style={{ marginTop: 4 }} onClick={handleFollow}>
          <div style={{ ...S.hostAvatarSm, background: hostColor, position: 'relative' }}>
            {hostInitial}
            {!following && (
              <div style={S.followPlus}>+</div>
            )}
          </div>
        </div>
      </div>

      {/* ── SELL LIVE: Products pill ── */}
      {isSell && products.length > 0 && (
        <div style={S.productsPillWrap}>
          <button onClick={() => setShowProds(p => !p)} style={S.productsPill}>
            <i className="fas fa-bag-shopping" style={{ fontSize: 11 }} />
            Products ({products.length})
            <i className={`fas fa-chevron-${showProds ? 'down' : 'up'}`} style={{ fontSize: 9 }} />
          </button>
        </div>
      )}

      {/* Products sheet */}
      {showProds && (
        <div style={S.productsSheet}>
          <div style={S.sheetHandle} />
          <div style={S.sheetHeader}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Products in this Live</span>
            <button onClick={() => setShowProds(false)} style={{ background: 'none', border: 'none', color: '#71717A', cursor: 'pointer' }}>
              <i className="fas fa-times" />
            </button>
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 260, padding: '0 14px 12px' }}>
            {products.map(p => (
              <div key={p.id} style={S.productRow}>
                <div style={S.productThumb}>
                  <i className="fas fa-box" style={{ fontSize: 18, color: '#52525B' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: '#FF3366', fontWeight: 800 }}>
                    UGX {Number(p.price).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 10, color: p.stock_remaining <= 2 ? '#EF4444' : '#71717A' }}>
                    {p.stock_remaining} left
                  </div>
                </div>
                {p.instant_reserve && (
                  <button
                    onClick={() => handleReserve(p)}
                    style={{ ...S.reserveBtn, opacity: reserved[p.id] || p.stock_remaining === 0 ? 0.5 : 1 }}
                    disabled={!!reserved[p.id] || p.stock_remaining === 0}
                  >
                    {reserved[p.id] ? '✓ Reserved' : 'Reserve'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CHAT + INPUT ── */}
      <div style={S.chatZone}>
        {/* Follow button */}
        <div style={{ padding: '0 14px 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={handleFollow} style={{ ...S.followBtn, background: following ? 'transparent' : '#FF3366', border: following ? '1.5px solid rgba(255,255,255,0.4)' : 'none' }}>
            {following ? 'Following' : '+ Follow'}
          </button>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{stream.title}</div>
        </div>

        <div ref={chatRef} style={S.chatScroll}>
          {comments.length === 0 && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', padding: '8px 0' }}>
              Be the first to comment...
            </div>
          )}
          {comments.map(c => (
            <div key={c.id} style={S.chatRow}>
              <div style={{ ...S.chatAvatar, background: c.color }}>{c.user[0].toUpperCase()}</div>
              <div style={S.chatBubble}>
                <span style={{ fontWeight: 700, color: c.color }}>{c.user} </span>
                <span style={{ color: 'rgba(255,255,255,0.9)' }}>{c.text}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={S.inputRow}>
          <input
            placeholder={currentUser ? 'Add a comment...' : 'Sign in to comment'}
            value={comment}
            onChange={e => setComment(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            style={S.input}
            disabled={!currentUser}
          />
          <button onClick={handleSend} style={S.sendBtn} disabled={!comment.trim()}>
            <i className="fas fa-paper-plane" style={{ fontSize: 12 }} />
          </button>
          <button
            onClick={() => currentUser && sendLiveReaction(stream.id, currentUser.id, 'heart')}
            style={S.reactionBtn}
          >
            ❤️
          </button>
          <button
            onClick={() => currentUser && sendLiveReaction(stream.id, currentUser.id, 'fire')}
            style={S.reactionBtn}
          >
            🔥
          </button>
        </div>
      </div>

      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes floatUp{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-100px) scale(1.3);opacity:0}}
      `}</style>
    </div>
  )
}

function ActionBtn({ icon, count, active, activeColor = '#FF3366', onClick }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
      <i className={`fas ${icon}`} style={{ fontSize: 26, color: active ? activeColor : 'white', filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.8))', transition: 'color 0.2s' }} />
      {count && <span style={{ fontSize: 11, fontWeight: 700, color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>{count}</span>}
    </div>
  )
}

const S = {
  page:     { position: 'fixed', inset: 0, background: '#000', zIndex: 200, fontFamily: "'Inter',sans-serif", color: '#fff', overflow: 'hidden' },
  videoBg:  { position: 'absolute', inset: 0 },
  videoPlaceholder: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  overlay:  { position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,0.5) 0%,transparent 20%,transparent 50%,rgba(0,0,0,0.6) 72%,rgba(0,0,0,0.92) 100%)', pointerEvents: 'none' },

  giftsArea: { position: 'absolute', right: 60, bottom: 200, display: 'flex', flexDirection: 'column-reverse', gap: 8, zIndex: 25, pointerEvents: 'none' },
  giftFloat: { fontSize: 28, animation: 'floatUp 2s ease forwards' },

  topBar:      { position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px 8px', zIndex: 20 },
  hostAvatar:  { width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: 'white', border: '2px solid rgba(255,255,255,0.6)', flexShrink: 0 },
  hostAvatarSm:{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: 'white', border: '2px solid white', cursor: 'pointer' },
  followPlus:  { position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)', width: 14, height: 14, borderRadius: '50%', background: '#FF3366', border: '2px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: 'white' },
  verifiedDot: { width: 13, height: 13, borderRadius: '50%', background: '#3B82F6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, color: 'white', fontWeight: 900, flexShrink: 0 },
  livePill:    { display: 'flex', alignItems: 'center', gap: 4, background: '#EF4444', borderRadius: 20, padding: '3px 8px', fontSize: 10, fontWeight: 800, color: 'white', flexShrink: 0 },
  blinkDot:    { width: 5, height: 5, borderRadius: '50%', background: 'white', animation: 'blink 1s infinite' },
  viewerBadge: { display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', borderRadius: 20, padding: '3px 9px', fontSize: 11, fontWeight: 600, color: 'white' },
  xBtn:        { width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' },
  tag:         { background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 700, color: 'white' },

  rightActions:    { position: 'absolute', right: 10, bottom: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, zIndex: 20 },

  productsPillWrap:{ position: 'absolute', bottom: 148, left: 14, zIndex: 20 },
  productsPill:    { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,51,102,0.85)', backdropFilter: 'blur(8px)', border: 'none', borderRadius: 20, padding: '7px 14px', fontSize: 12, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'inherit' },

  productsSheet:   { position: 'absolute', bottom: 120, left: 0, right: 0, background: 'rgba(14,14,14,0.97)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(255,255,255,0.1)', zIndex: 21 },
  sheetHandle:     { width: 36, height: 4, borderRadius: 20, background: 'rgba(255,255,255,0.15)', margin: '8px auto 0', flexShrink: 0 },
  sheetHeader:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px 6px' },
  productRow:      { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  productThumb:    { width: 46, height: 46, borderRadius: 8, background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  reserveBtn:      { padding: '7px 14px', background: '#FF3366', border: 'none', borderRadius: 20, color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' },

  chatZone:  { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20 },
  chatScroll:{ maxHeight: 110, overflowY: 'auto', padding: '4px 14px 4px', scrollbarWidth: 'none' },
  chatRow:   { display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 5 },
  chatAvatar:{ width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900, color: 'white', flexShrink: 0, marginTop: 1 },
  chatBubble:{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(4px)', borderRadius: 12, padding: '4px 9px', fontSize: 12, lineHeight: 1.35, maxWidth: '80%' },

  inputRow:  { display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px 10px' },
  input:     { flex: 1, padding: '9px 14px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, color: 'white', fontSize: 13, outline: 'none', fontFamily: 'inherit' },
  sendBtn:   { width: 34, height: 34, borderRadius: '50%', background: '#FF3366', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', flexShrink: 0 },
  reactionBtn:{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 18, flexShrink: 0 },

  followBtn: { padding: '5px 14px', borderRadius: 20, color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' },
}
