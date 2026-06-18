import { useState } from 'react'

// No mock data — profile, listings, tools structure stays,
// real data will load from Supabase

const STATUS_STYLE = {
  live:     { background: '#EF4444', color: 'white' },
  reserved: { background: '#F59E0B', color: 'white' },
  sold:     { background: '#22C55E', color: 'white' },
}

const TOOLS = [
  { label: 'My Orders',    icon: 'fa-bag-shopping',  badge: null, color: '#7C3AED' },
  { label: 'Reservations', icon: 'fa-shield-halved', badge: null, color: '#7C3AED' },
  { label: 'Saved Items',  icon: 'fa-heart',         badge: null, color: '#FF3366' },
  { label: 'Following',    icon: 'fa-user-group',    badge: null, color: '#3B82F6' },
  { label: 'Reviews',      icon: 'fa-star',          badge: null, color: '#F59E0B' },
  { label: 'Requests',     icon: 'fa-circle-check',  badge: null, color: '#22C55E' },
  { label: 'Go Live',      icon: 'fa-video',         badge: null, color: '#EF4444' },
  { label: 'Add Post',     icon: 'fa-plus',          badge: null, color: '#FF3366' },
  { label: 'Boost Center', icon: 'fa-bolt',          badge: null, color: '#F97316' },
  { label: 'Refer & Earn', icon: 'fa-user-plus',     badge: null, color: '#22C55E' },
]

export default function ProfilePage({ showToast, onWallet, user }) {
  const [activeTab, setActiveTab] = useState('Listings')

  // Will be replaced with real Supabase data
  const profile  = null   // user's profile row
  const listings = []     // user's posts
  const stats    = { views: 0, likes: 0, messages: 0, sales: 0, response: '—' }

  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'You'
  const username    = profile?.username  || ''
  const location    = profile?.location  || 'Kampala, Uganda'
  const initial     = displayName[0]?.toUpperCase() || 'U'

  return (
    <div style={{ paddingBottom: 30 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 20px' }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>My Profile</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="header-btn" onClick={() => showToast('Settings coming soon...')}><i className="fas fa-gear" /></button>
          <button className="header-btn" style={{ position: 'relative' }}>
            <i className="fas fa-bell" />
          </button>
        </div>
      </div>

      {/* Profile top */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '0 16px 16px' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 900, color: 'white', border: '2px solid #7C3AED' }}>
            {initial}
          </div>
          <div
            onClick={() => showToast('Edit profile photo coming soon...')}
            style={{ position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#D946EF,#F43F5E)', border: '2px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <i className="fas fa-pen" style={{ color: 'white', fontSize: 9 }} />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 18, fontWeight: 800 }}>{displayName}</span>
            {profile?.verified && (
              <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#3B82F6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'white', fontWeight: 900 }}>✓</span>
            )}
          </div>
          {username && <div style={{ fontSize: 13, color: '#71717A', marginBottom: 5 }}>@{username}</div>}
          {profile?.trusted_seller && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#7C3AED', fontWeight: 600, padding: '3px 10px', background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 20, marginBottom: 8 }}>
              <i className="fas fa-shield-halved" style={{ fontSize: 12 }} /> Trusted member
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
            <span style={{ fontSize: 12, color: '#A1A1AA', display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="fas fa-location-dot" style={{ color: '#71717A' }} /> {location}
            </span>
            {profile?.rating > 0 && (
              <span style={{ fontSize: 12, color: '#F59E0B', display: 'flex', alignItems: 'center', gap: 4 }}>
                <i className="fas fa-star" style={{ color: '#F59E0B' }} /> {profile.rating}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Complete profile banner */}
      <div style={{ margin: '0 16px 16px', padding: '14px 16px', background: '#141414', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>Complete your profile</div>
          <div style={{ fontSize: 12, color: '#71717A' }}>Get verified to unlock more trust and reach.</div>
        </div>
        <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
          <svg width="44" height="44" viewBox="0 0 44 44" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="22" cy="22" r="18" fill="none" stroke="#1e1e1e" strokeWidth="4" />
            <circle cx="22" cy="22" r="18" fill="none" stroke="url(#pg)" strokeWidth="4" strokeLinecap="round" strokeDasharray="113" strokeDashoffset="56" />
            <defs><linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#C026D3" /><stop offset="100%" stopColor="#F97316" /></linearGradient></defs>
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: 'linear-gradient(135deg,#C026D3,#F97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>50%</div>
        </div>
        <button
          onClick={() => showToast('Verification coming soon...')}
          style={{ padding: '8px 14px', background: 'linear-gradient(135deg,#D946EF,#F43F5E)', border: 'none', borderRadius: 20, color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          Verify Now
        </button>
      </div>

      {/* Earnings card */}
      <div
        onClick={onWallet}
        style={{ margin: '0 16px 16px', padding: 16, background: '#141414', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12, color: '#71717A', marginBottom: 4 }}>Your Earnings</div>
            <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.5px' }}>UGX 0</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: '#71717A' }}>Pending</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#F97316', display: 'flex', alignItems: 'center', gap: 4 }}>
                UGX 0 <i className="fas fa-chevron-right" style={{ fontSize: 13 }} />
              </div>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-wallet" style={{ fontSize: 18, color: '#A1A1AA' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', margin: '0 16px 16px', background: '#141414', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
        {[
          { val: stats.views,    label: 'Views',    color: '#7C3AED', icon: 'fa-eye'        },
          { val: stats.likes,    label: 'Likes',    color: '#FF3366', icon: 'fa-heart'      },
          { val: stats.messages, label: 'Messages', color: '#3B82F6', icon: 'fa-message'    },
          { val: stats.sales,    label: 'Sales',    color: '#22C55E', icon: 'fa-bag-shopping'},
          { val: stats.response, label: 'Response', color: '#F59E0B', icon: 'fa-chart-bar'  },
        ].map((s, i, arr) => (
          <div key={s.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 4px', borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
            <i className={`fas ${s.icon}`} style={{ fontSize: 14, color: s.color, marginBottom: 4 }} />
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>{s.val}</div>
            <div style={{ fontSize: 10, color: '#71717A', textAlign: 'center' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* My Listings */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 12px' }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>My Listings</div>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#7C3AED', display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
          View all <i className="fas fa-chevron-right" style={{ fontSize: 12 }} />
        </span>
      </div>

      {listings.length === 0 ? (
        <div style={{
          margin: '0 16px 16px', padding: '28px 16px',
          background: '#141414', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16, display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 10,
        }}>
          <div style={{ fontSize: 36 }}>📦</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#A1A1AA' }}>No listings yet</div>
          <div style={{ fontSize: 12, color: '#52525B' }}>Tap the + button to add your first post</div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10, padding: '0 16px 16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {listings.map(l => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}

      {/* More tools */}
      <div style={{ padding: '0 16px 16px' }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>More</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
          {TOOLS.map(t => (
            <div
              key={t.label}
              onClick={() => showToast(`${t.label} coming soon...`)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer' }}
            >
              <div style={{ width: 52, height: 52, borderRadius: 12, background: `${t.color}15`, border: `1px solid ${t.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <i className={`fas ${t.icon}`} style={{ fontSize: 20, color: t.color }} />
                {t.badge !== null && t.badge > 0 && (
                  <span style={{ position: 'absolute', top: -4, right: -4, background: '#FF3366', color: 'white', fontSize: 9, fontWeight: 800, borderRadius: 20, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', border: '1.5px solid #000' }}>{t.badge}</span>
                )}
              </div>
              <span style={{ fontSize: 11, color: '#A1A1AA', textAlign: 'center', fontWeight: 500 }}>{t.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Refer banner */}
      <div style={{ margin: '0 16px 16px', padding: 16, background: 'linear-gradient(135deg,#1a0a2e,#0d1535)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 38 }}>🎁</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>Invite friends, earn rewards</div>
          <div style={{ fontSize: 12, color: '#71717A' }}>Get UGX 20,000 for every friend who joins and makes a purchase.</div>
        </div>
        <button
          onClick={() => showToast('🔗 Invite link coming soon!')}
          style={{ padding: '9px 16px', background: 'linear-gradient(135deg,#D946EF,#F43F5E)', border: 'none', borderRadius: 20, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          Invite Now
        </button>
      </div>
    </div>
  )
}

function ListingCard({ listing: l }) {
  const statusStyle = STATUS_STYLE[l.status] || {}
  return (
    <div style={{ flexShrink: 0, width: 120, cursor: 'pointer' }}>
      <div style={{ width: 120, height: 120, borderRadius: 12, background: l.bg || '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 46, marginBottom: 6, position: 'relative', overflow: 'hidden' }}>
        {l.emoji || '📦'}
        {l.status && (
          <div style={{ position: 'absolute', top: 6, left: 6, fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 20, ...statusStyle }}>
            {l.status.toUpperCase()}
          </div>
        )}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#A1A1AA', marginBottom: 2 }}>{l.title}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#FF3366' }}>UGX {Number(l.price).toLocaleString()}</div>
      <div style={{ fontSize: 11, color: '#71717A', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
        <i className="fas fa-eye" style={{ fontSize: 10 }} />{l.views || 0}
      </div>
    </div>
  )
}
