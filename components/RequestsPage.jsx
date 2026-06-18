import { useState } from 'react'

// No mock data — requests will load from Supabase
const COLORS = ['#E11D48','#7C3AED','#F97316','#06B6D4','#22C55E','#EC4899']

const CATEGORY_EMOJI = {
  Phones:'📱', Electronics:'💻', Fashion:'👗',
  Sneakers:'👟', Furniture:'🛋️', Home:'🏠', Beauty:'💄',
}

export default function RequestsPage({ showToast }) {
  const [activeFilter, setActiveFilter] = useState('All Requests')
  const filters = ['All Requests', 'Near You', 'Following', 'Categories']

  // Will be replaced with real Supabase data
  const requests = []

  return (
    <div style={{ paddingBottom: 20 }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Requests</div>
          <div className="page-subtitle">People are looking for these items</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="header-btn"><i className="fas fa-search" /></button>
          <button className="header-btn" style={{ position: 'relative' }}>
            <i className="fas fa-filter" />
            <span style={{ position: 'absolute', top: -3, right: -3, width: 8, height: 8, background: '#FF3366', borderRadius: '50%', border: '1.5px solid #000' }} />
          </button>
        </div>
      </div>

      {/* Filter pills */}
      <div className="pill-row">
        {filters.map(f => (
          <button key={f} className={`pill ${activeFilter === f ? 'active' : ''}`} onClick={() => setActiveFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      {/* Post request banner */}
      <div style={{
        margin: '0 16px 16px',
        padding: '14px 16px',
        background: '#141414',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '2px dashed #FF3366',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <i className="fas fa-plus" style={{ color: '#FF3366', fontSize: 16 }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Looking for something?</div>
          <div style={{ fontSize: 13, color: '#71717A', marginTop: 2 }}>Post a request and get offers from sellers</div>
        </div>
        <button
          onClick={() => showToast('📤 Post request coming soon...')}
          style={{
            padding: '8px 16px', background: '#FF3366', border: 'none',
            borderRadius: 20, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            whiteSpace: 'nowrap', boxShadow: '0 2px 12px rgba(255,51,102,0.35)',
          }}
        >
          Post Request
        </button>
      </div>

      {/* Request cards — empty until DB is connected */}
      {requests.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '48px 24px', gap: 12,
        }}>
          <div style={{ fontSize: 48 }}>📭</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#A1A1AA' }}>No requests yet</div>
          <div style={{ fontSize: 13, color: '#52525B', textAlign: 'center' }}>
            Be the first to post what you&apos;re looking for
          </div>
        </div>
      ) : (
        requests.map((r, idx) => (
          <RequestCard key={r.id} r={r} idx={idx} showToast={showToast} />
        ))
      )}
    </div>
  )
}

function RequestCard({ r, idx, showToast }) {
  return (
    <div style={{
      margin: '0 16px 12px',
      background: '#141414',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 14px 10px' }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%', background: r.buyer_color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, fontSize: 14, color: 'white', flexShrink: 0,
        }}>
          {r.buyer_initials}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 14, fontWeight: 700 }}>
            {r.buyer_name}
            {r.verified && (
              <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#3B82F6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: 'white', fontWeight: 900 }}>✓</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: '#71717A', marginTop: 1 }}>{r.location} · {r.time}</div>
        </div>
        <i className="fas fa-ellipsis-vertical" style={{ color: '#71717A', cursor: 'pointer' }} />
      </div>

      {/* Body */}
      <div style={{ display: 'flex', gap: 12, padding: '0 14px 12px' }}>
        <div style={{
          width: 80, height: 80, borderRadius: 12,
          background: `linear-gradient(135deg,${r.buyer_color}33,${r.buyer_color}11)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, flexShrink: 0,
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          {CATEGORY_EMOJI[r.category] || '📦'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{r.title}</div>
          <div style={{ fontSize: 12, color: '#A1A1AA', lineHeight: 1.4, marginBottom: 8 }}>{r.description}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {r.budget && (
              <span style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E', padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                💰 Budget: {Number(r.budget).toLocaleString()} UGX
              </span>
            )}
            {r.color_pref && (
              <span style={{ background: 'rgba(113,113,122,0.15)', color: '#A1A1AA', padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                🎨 {r.color_pref}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Location radius */}
      {r.radius && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#71717A', padding: '0 14px 8px' }}>
          <i className="fas fa-location-dot" style={{ fontSize: 11 }} />
          Within {r.radius} km
        </div>
      )}

      {/* Footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px 14px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex' }}>
            {Array.from({ length: Math.min(3, r.offers_count || 0) }, (_, i) => (
              <div key={i} style={{
                width: 22, height: 22, borderRadius: '50%',
                background: COLORS[i], border: '2px solid #141414',
                marginLeft: i === 0 ? 0 : -7, fontSize: 9, fontWeight: 700, color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{String.fromCharCode(65 + i)}</div>
            ))}
          </div>
          <span style={{ fontSize: 12, color: '#7C3AED', fontWeight: 600 }}>
            {r.offers_count || 0} sellers already offered
          </span>
        </div>
        <button
          onClick={() => showToast('📬 Loading offers...')}
          style={{
            padding: '7px 14px', borderRadius: 20,
            border: '1.5px solid #FF3366', background: 'rgba(255,51,102,0.08)',
            color: '#FF3366', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          View Offers <i className="fas fa-chevron-right" style={{ fontSize: 10 }} />
        </button>
      </div>
    </div>
  )
}
