import { useState } from 'react'

// No mock data — will load from Supabase
const CATS = [
  { label: 'Electronics', emoji: '💻' },
  { label: 'Fashion',     emoji: '👗' },
  { label: 'Home',        emoji: '🏠' },
  { label: 'Phones',      emoji: '📱' },
  { label: 'Beauty',      emoji: '💄' },
  { label: 'Sneakers',    emoji: '👟' },
]

function fmt(n) {
  return n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'K' : String(n)
}

export default function LivePage({ showToast }) {
  const [activeFilter, setActiveFilter] = useState('All')
  const [notified, setNotified]         = useState({})
  const filters = ['All', 'Following', 'Electronics', 'Fashion', 'Home', 'Beauty']

  // Will be replaced with real Supabase data
  const streams  = []
  const upcoming = []

  return (
    <div style={{ paddingBottom: 20 }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Live</div>
          <div className="page-subtitle">Shop live deals and interact with sellers</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="header-btn"><i className="fas fa-search" /></button>
          <button className="header-btn" style={{ position: 'relative' }}>
            <i className="fas fa-bell" />
            <span style={{ position: 'absolute', top: -3, right: -3, minWidth: 16, height: 16, padding: '0 4px', background: '#FF3366', borderRadius: 20, fontSize: 9, fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #000' }}>3</span>
          </button>
        </div>
      </div>

      {/* Go Live banner */}
      <div style={{
        margin: '0 16px 20px', padding: 16,
        background: 'linear-gradient(135deg,#1a0a2e,#2d0a1a)',
        border: '1px solid rgba(168,85,247,0.3)', borderRadius: 16,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'rgba(239,68,68,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          boxShadow: '0 0 0 4px rgba(239,68,68,0.1)',
        }}>
          <i className="fas fa-circle-dot" style={{ color: '#EF4444', fontSize: 20 }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>Go Live &amp; Sell</div>
          <div style={{ fontSize: 12, color: '#A1A1AA' }}>Show your products, engage buyers and grow your sales</div>
        </div>
        <button
          onClick={() => showToast('🎥 Live streaming coming soon...')}
          style={{
            padding: '9px 16px', background: '#EF4444', border: 'none', borderRadius: 20,
            color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
          }}
        >
          <i className="fas fa-video" style={{ fontSize: 13 }} /> Start Live
        </button>
      </div>

      {/* Category filter */}
      <div className="pill-row">
        {filters.map(f => (
          <button key={f} className={`pill ${activeFilter === f ? 'active' : ''}`} onClick={() => setActiveFilter(f)}>{f}</button>
        ))}
      </div>

      {/* Live Now header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 800 }}>
          Live Now
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#FF3366', cursor: 'pointer' }}>See All</span>
      </div>

      {/* Live streams — empty until DB connected */}
      {streams.length === 0 ? (
        <div style={{
          margin: '0 16px 20px', padding: '32px 16px',
          background: '#141414', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16, display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 10,
        }}>
          <div style={{ fontSize: 40 }}>📺</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#A1A1AA' }}>No live streams right now</div>
          <div style={{ fontSize: 12, color: '#52525B' }}>Check back soon or start your own</div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10, padding: '0 16px 20px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {streams.map(s => (
            <StreamCard key={s.id} stream={s} showToast={showToast} />
          ))}
        </div>
      )}

      {/* Upcoming Live header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 12px' }}>
        <div style={{ fontSize: 16, fontWeight: 800 }}>Upcoming Live</div>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#FF3366', cursor: 'pointer' }}>See All</span>
      </div>

      {/* Upcoming streams — empty until DB connected */}
      <div style={{ padding: '0 16px' }}>
        {upcoming.length === 0 ? (
          <div style={{
            padding: '24px 16px',
            background: '#141414', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16, display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 8,
          }}>
            <div style={{ fontSize: 36 }}>🗓️</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#A1A1AA' }}>No upcoming streams scheduled</div>
          </div>
        ) : (
          upcoming.map(u => (
            <UpcomingCard key={u.id} item={u} notified={notified} setNotified={setNotified} showToast={showToast} />
          ))
        )}
      </div>

      {/* Top Categories */}
      <div style={{ padding: '16px 16px 12px', fontSize: 16, fontWeight: 800 }}>Top Categories Live</div>
      <div style={{ display: 'flex', gap: 14, padding: '0 16px 20px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {CATS.map(c => (
          <div
            key={c.label}
            onClick={() => showToast(`📺 ${c.label} streams coming soon...`)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0, cursor: 'pointer' }}
          >
            <div style={{
              width: 64, height: 64, borderRadius: '50%', background: '#1e1e1e',
              border: '2.5px solid #EF4444',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
              position: 'relative',
            }}>
              {c.emoji}
              <span style={{
                position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
                background: '#EF4444', color: 'white', fontSize: 8, fontWeight: 800,
                padding: '1px 5px', borderRadius: 3, whiteSpace: 'nowrap', border: '1.5px solid #000',
              }}>LIVE</span>
            </div>
            <span style={{ fontSize: 11, color: '#A1A1AA' }}>{c.label}</span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.4)} 50%{box-shadow:0 0 0 8px rgba(239,68,68,0)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  )
}

// Stream card — used once real data loads
function StreamCard({ stream: s, showToast }) {
  const seller = s.seller || {}
  return (
    <div
      onClick={() => showToast('📺 Joining live stream...')}
      style={{
        flexShrink: 0, width: 'calc(50vw - 21px)', maxWidth: 190,
        borderRadius: 12, overflow: 'hidden', aspectRatio: '9/13',
        position: 'relative', background: s.bg || '#1a1a1a', cursor: 'pointer',
      }}
    >
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60 }}>{s.emoji}</div>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,transparent 40%,rgba(0,0,0,0.85))' }} />
      <div style={{ position: 'absolute', top: 8, left: 8, right: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ background: '#EF4444', color: 'white', fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4 }}>LIVE</span>
        <span style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', color: 'white', fontSize: 11, fontWeight: 600, padding: '3px 7px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
          <i className="fas fa-eye" style={{ fontSize: 10 }} />{fmt(s.viewers || 0)}
        </span>
      </div>
      <div style={{ position: 'absolute', bottom: 10, left: 10, right: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 4 }}>{s.title}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>{s.sub}</div>
        {seller.name && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: seller.color || '#7C3AED', border: '1.5px solid #FF3366', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900, color: 'white' }}>{seller.initials}</div>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{seller.name}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// Upcoming card — used once real data loads
function UpcomingCard({ item: u, notified, setNotified, showToast }) {
  const isOn = notified[u.id]
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: 14,
      background: '#141414', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12, marginBottom: 10,
    }}>
      <div style={{
        width: 46, height: 46, borderRadius: '50%', background: '#1e1e1e',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, flexShrink: 0,
      }}>{u.emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{u.title}</div>
        <div style={{ fontSize: 12, color: '#A1A1AA', marginBottom: 4 }}>{u.sub}</div>
        <div style={{ fontSize: 11, color: '#71717A', display: 'flex', alignItems: 'center', gap: 4 }}>
          <i className="fas fa-calendar" style={{ fontSize: 11 }} />{u.scheduled_at}
        </div>
      </div>
      <button
        onClick={() => {
          setNotified(n => ({ ...n, [u.id]: !n[u.id] }))
          showToast(isOn ? '🔕 Notification removed' : "🔔 You'll be notified!")
        }}
        style={{
          padding: '7px 12px', borderRadius: 20,
          border: `1.5px solid ${isOn ? '#7C3AED' : 'rgba(255,255,255,0.15)'}`,
          background: isOn ? 'rgba(124,58,237,0.15)' : '#1e1e1e',
          color: isOn ? '#A855F7' : '#A1A1AA',
          fontSize: 12, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
        }}
      >
        <i className="fas fa-bell" style={{ fontSize: 12 }} />
        {isOn ? 'Notifying' : 'Notify Me'}
      </button>
    </div>
  )
}
