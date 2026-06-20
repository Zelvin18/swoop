import { useState, useEffect, useRef } from 'react'
import { fetchPostComments, addComment } from '../lib/feed'
import { supabase } from '../lib/supabase'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function avatarColor(id = '') {
  const COLORS = ['#7C3AED','#FF3366','#F97316','#22C55E','#3B82F6','#EC4899','#F59E0B','#06B6D4']
  const n = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return COLORS[n % COLORS.length]
}
function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
}

export default function PostCommentsSheet({ post, currentUser, onClose }) {
  const [comments, setComments] = useState([])
  const [message,  setMessage]  = useState('')
  const [loading,  setLoading]  = useState(true)
  const [sending,  setSending]  = useState(false)
  const listRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    fetchPostComments(post.id).then(data => {
      setComments(data)
      setLoading(false)
    })
    // Focus input
    setTimeout(() => inputRef.current?.focus(), 300)
  }, [post.id])

  // Realtime new comments
  useEffect(() => {
    const channel = supabase
      .channel(`post-comments-${post.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'post_comments',
        filter: `post_id=eq.${post.id}`,
      }, async payload => {
        // Fetch the author details
        const { data: author } = await supabase
          .from('profiles').select('id, full_name, username, avatar_url, verified')
          .eq('id', payload.new.user_id).single()
        setComments(prev => [...prev, { ...payload.new, author }])
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [post.id])

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [comments])

  const handleSend = async () => {
    if (!message.trim() || !currentUser || sending) return
    setSending(true)
    const text = message.trim()
    setMessage('')
    // Optimistic
    const optimistic = {
      id: 'opt-' + Date.now(),
      message: text,
      created_at: new Date().toISOString(),
      author: {
        id: currentUser.id,
        full_name: currentUser.user_metadata?.full_name || 'You',
        username: currentUser.user_metadata?.username || '',
        verified: false,
      },
    }
    setComments(prev => [...prev, optimistic])
    await addComment(post.id, currentUser.id, text)
    setSending(false)
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={S.backdrop} />

      {/* Sheet */}
      <div style={S.sheet}>
        {/* Handle */}
        <div style={S.handle} />

        {/* Header */}
        <div style={S.header}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>
            Comments
            <span style={{ fontSize: 13, fontWeight: 400, color: '#71717A', marginLeft: 8 }}>
              {post.comments_count || comments.length}
            </span>
          </div>
          <button onClick={onClose} style={S.closeBtn}>
            <i className="fas fa-times" style={{ fontSize: 16 }} />
          </button>
        </div>

        {/* Comments list */}
        <div ref={listRef} style={S.list}>
          {loading && (
            <div style={S.center}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: 20, color: '#FF3366' }} />
            </div>
          )}

          {!loading && comments.length === 0 && (
            <div style={S.emptyState}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>💬</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#A1A1AA', marginBottom: 4 }}>No comments yet</div>
              <div style={{ fontSize: 13, color: '#52525B' }}>Be the first to comment</div>
            </div>
          )}

          {comments.map(c => {
            const author  = c.author || {}
            const color   = avatarColor(author.id || '')
            const initial = initials(author.full_name || author.username || 'U')
            const isOwn   = author.id === currentUser?.id

            return (
              <div key={c.id} style={S.commentRow}>
                {/* Avatar */}
                <div style={{ ...S.avatar, background: color }}>{initial}</div>

                {/* Bubble */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={S.commentMeta}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: isOwn ? '#FF3366' : '#fff' }}>
                      {isOwn ? 'You' : (author.full_name || author.username || 'User')}
                    </span>
                    {author.verified && (
                      <span style={S.verifiedBadge}>✓</span>
                    )}
                    <span style={{ fontSize: 11, color: '#52525B', marginLeft: 'auto' }}>
                      {timeAgo(c.created_at)}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.88)', lineHeight: 1.45, marginTop: 2 }}>
                    {c.message}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Input bar */}
        <div style={S.inputBar}>
          {currentUser ? (
            <>
              <div style={{ ...S.userDot, background: avatarColor(currentUser.id) }}>
                {initials(currentUser.user_metadata?.full_name || 'U')}
              </div>
              <div style={S.inputWrap}>
                <input
                  ref={inputRef}
                  placeholder="Add a comment..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  style={S.input}
                  maxLength={300}
                />
              </div>
              <button
                onClick={handleSend}
                disabled={!message.trim() || sending}
                style={{ ...S.sendBtn, opacity: message.trim() && !sending ? 1 : 0.4 }}
              >
                <i className="fas fa-paper-plane" style={{ fontSize: 14 }} />
              </button>
            </>
          ) : (
            <div style={{ flex: 1, textAlign: 'center', fontSize: 13, color: '#71717A' }}>
              Sign in to comment
            </div>
          )}
        </div>
      </div>
    </>
  )
}

const S = {
  backdrop: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    zIndex: 400, backdropFilter: 'blur(2px)',
  },
  sheet: {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    maxWidth: 430, margin: '0 auto',
    background: '#0d0d0d',
    borderRadius: '20px 20px 0 0',
    border: '1px solid rgba(255,255,255,0.08)',
    borderBottom: 'none',
    zIndex: 401,
    display: 'flex', flexDirection: 'column',
    maxHeight: '75vh',
    fontFamily: "'Inter',sans-serif", color: '#fff',
  },
  handle: {
    width: 40, height: 4, borderRadius: 20,
    background: 'rgba(255,255,255,0.15)',
    margin: '10px auto 0', flexShrink: 0,
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px 10px', flexShrink: 0,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  closeBtn: {
    width: 30, height: 30, borderRadius: '50%',
    background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.08)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: '#A1A1AA',
  },
  list:  { flex: 1, overflowY: 'auto', padding: '8px 16px', scrollbarWidth: 'none' },
  center:{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '40px 0',
  },
  commentRow: {
    display: 'flex', gap: 10, padding: '10px 0',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  avatar: {
    width: 34, height: 34, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 900, color: 'white', flexShrink: 0,
  },
  commentMeta: {
    display: 'flex', alignItems: 'center', gap: 5,
  },
  verifiedBadge: {
    width: 13, height: 13, borderRadius: '50%', background: '#3B82F6',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 7, color: 'white', fontWeight: 900,
  },
  inputBar: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 14px',
    paddingBottom: 'calc(var(--nav-h, 50px) + env(safe-area-inset-bottom, 0px) + 10px)',
    borderTop: '1px solid rgba(255,255,255,0.07)',
    background: '#0d0d0d', flexShrink: 0,
  },
  userDot: {
    width: 30, height: 30, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 10, fontWeight: 900, color: 'white', flexShrink: 0,
  },
  inputWrap: { flex: 1 },
  input: {
    width: '100%', padding: '10px 14px',
    background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20, color: '#fff', fontSize: 14,
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: '50%',
    background: 'linear-gradient(135deg,#D946EF,#FF3366)',
    border: 'none', display: 'flex', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer', color: 'white',
    flexShrink: 0, boxShadow: '0 2px 12px rgba(255,51,102,0.4)',
    transition: 'opacity 0.2s',
  },
}
