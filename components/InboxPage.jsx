import { useState } from 'react'

// No mock data — conversations will load from Supabase
const FILTERS = [
  { label: 'All',      count: null },
  { label: 'Unread',   count: null },
  { label: 'Messages', count: null },
  { label: 'Orders',   count: null },
  { label: 'Alerts',   count: null },
  { label: 'Mentions', count: null },
  { label: 'Likes',    count: null },
]

export default function InboxPage({ showToast }) {
  const [activeFilter, setActiveFilter] = useState('All')

  // Will be replaced with real Supabase data
  const stories       = []
  const conversations = []

  return (
    <div style={{ paddingBottom: 20 }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Inbox</div>
          <div className="page-subtitle">Messages, updates and important alerts</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="header-btn"><i className="fas fa-search" /></button>
          <button className="header-btn"><i className="fas fa-pen-to-square" /></button>
        </div>
      </div>

      {/* Stories row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 8px' }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>Stories</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#7C3AED', cursor: 'pointer' }}>View all ›</span>
      </div>
      <div style={{ display: 'flex', gap: 12, padding: '4px 16px 16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {/* Your story — always visible */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flexShrink: 0, cursor: 'pointer' }}>
          <div style={{ position: 'relative', width: 64, height: 64, borderRadius: '50%', background: '#1e1e1e', border: '2px dashed rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fas fa-user" style={{ fontSize: 24, color: '#52525B' }} />
            <div style={{ position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg,#D946EF,#F43F5E)', border: '2px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-plus" style={{ color: 'white', fontSize: 9 }} />
            </div>
          </div>
          <span style={{ fontSize: 11, color: '#A1A1AA', maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>Your story</span>
        </div>

        {/* Dynamic stories from DB — empty until connected */}
        {stories.map((s, i) => (
          <StoryItem key={i} story={s} />
        ))}
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6, padding: '0 16px 12px', overflowX: 'auto', scrollbarWidth: 'none', alignItems: 'center' }}>
        {FILTERS.map(f => (
          <button
            key={f.label}
            onClick={() => setActiveFilter(f.label)}
            style={{
              flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 20,
              background: activeFilter === f.label ? '#FF3366' : '#1e1e1e',
              border: `1px solid ${activeFilter === f.label ? 'transparent' : 'rgba(255,255,255,0.08)'}`,
              color: activeFilter === f.label ? 'white' : '#A1A1AA',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              fontFamily: 'inherit',
              boxShadow: activeFilter === f.label ? '0 2px 12px rgba(255,51,102,0.35)' : 'none',
            }}
          >
            {f.label}
            {f.count !== null && (
              <span style={{
                background: activeFilter === f.label ? 'rgba(255,255,255,0.2)' : '#FF3366',
                color: 'white', fontSize: 10, fontWeight: 800,
                borderRadius: 20, minWidth: 18, height: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
              }}>{f.count}</span>
            )}
          </button>
        ))}
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>
          <i className="fas fa-sliders" style={{ fontSize: 14, color: '#A1A1AA' }} />
        </div>
      </div>

      {/* Conversation list */}
      <div style={{ padding: '0 16px' }}>
        {conversations.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '48px 24px', gap: 12,
          }}>
            <div style={{ fontSize: 48 }}>💬</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#A1A1AA' }}>No messages yet</div>
            <div style={{ fontSize: 13, color: '#52525B', textAlign: 'center' }}>
              Start a conversation by tapping &ldquo;Chat with Seller&rdquo; on any post
            </div>
          </div>
        ) : (
          conversations.map(c => (
            <ConvoItem key={c.id} c={c} onClick={() => showToast(`Opening chat with ${c.name}...`)} />
          ))
        )}
      </div>
    </div>
  )
}

function StoryItem({ story: s }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flexShrink: 0, cursor: 'pointer' }}>
      <div style={{ position: 'relative', width: 64, height: 64 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: s.color || '#1e1e1e',
          border: `2.5px solid ${s.is_live ? '#EF4444' : '#D946EF'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 900, color: 'white',
        }}>
          {s.initials || s.username?.[0]?.toUpperCase() || '?'}
        </div>
        {s.is_live && (
          <span style={{
            position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
            background: '#EF4444', color: 'white', fontSize: 8, fontWeight: 800,
            padding: '1px 5px', borderRadius: 3, whiteSpace: 'nowrap', border: '1.5px solid #000',
          }}>LIVE</span>
        )}
      </div>
      <span style={{ fontSize: 11, color: '#A1A1AA', maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>
        {s.name || s.username}
      </span>
    </div>
  )
}

function ConvoItem({ c, onClick }) {
  const isEmoji = c.initials && c.initials.length > 2
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '14px 0',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        cursor: 'pointer',
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: isEmoji ? '#1e1e1e' : (c.color || '#7C3AED'),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: isEmoji ? 22 : 17, fontWeight: 900, color: 'white',
        }}>{c.initials || c.username?.[0]?.toUpperCase() || '?'}</div>
        {c.is_online && (
          <div style={{ position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: '50%', background: '#22C55E', border: '2px solid #000' }} />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 15, fontWeight: 700 }}>
            {c.name || c.username}
            {c.verified && <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#3B82F6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: 'white', fontWeight: 900 }}>✓</span>}
            {c.is_pinned && <i className="fas fa-thumbtack" style={{ fontSize: 11, color: '#7C3AED' }} />}
          </div>
          <span style={{ fontSize: 11, color: '#52525B' }}>{c.time_label}</span>
        </div>
        {c.product_tag && (
          <span style={{ display: 'inline-block', padding: '2px 7px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(168,85,247,0.2)', color: '#A855F7', marginBottom: 3 }}>
            {c.product_tag}
          </span>
        )}
        <div style={{ fontSize: 13, color: '#A1A1AA', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {c.last_message}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        {c.unread_count > 0 ? (
          <span style={{ minWidth: 20, height: 20, borderRadius: 20, background: '#FF3366', color: 'white', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>{c.unread_count}</span>
        ) : c.is_muted ? (
          <i className="fas fa-bell-slash" style={{ fontSize: 14, color: '#52525B' }} />
        ) : null}
      </div>
    </div>
  )
}
