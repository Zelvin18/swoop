import { useState, useEffect, useRef } from 'react'
import { globalSearch, formatUGX, discountPct, fmtCount, CATEGORY_EMOJI } from '../lib/feed'

function avatarColor(id = '') {
  const COLORS = ['#7C3AED','#FF3366','#F97316','#22C55E','#3B82F6','#EC4899','#F59E0B','#06B6D4']
  const n = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return COLORS[n % COLORS.length]
}
function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
}

const TRENDING = ['iPhone 14', 'Air Jordan', 'Sofa', 'MacBook', 'Sneakers', 'Samsung Galaxy', 'Handbag', 'PS5']

export default function FeedSearchPanel({ onClose }) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState({ posts: [], sellers: [] })
  const [loading, setLoading] = useState(false)
  const [tab,     setTab]     = useState('All')  // 'All' | 'Products' | 'Sellers'
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (!query.trim()) { setResults({ posts: [], sellers: [] }); return }
    const t = setTimeout(async () => {
      setLoading(true)
      const data = await globalSearch(query)
      setResults(data)
      setLoading(false)
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  const hasResults = results.posts.length > 0 || results.sellers.length > 0
  const showTabs   = hasResults && !loading

  return (
    <div style={S.overlay}>

      {/* ── Search bar ── */}
      <div style={S.topBar}>
        <button onClick={onClose} style={S.backBtn}>
          <i className="fas fa-arrow-left" style={{ fontSize: 17 }} />
        </button>
        <div style={S.inputWrap}>
          <i className="fas fa-search" style={S.searchIcon} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search products, sellers, brands..."
            style={S.input}
          />
          {query ? (
            <button onClick={() => setQuery('')} style={S.clearBtn}>
              <i className="fas fa-times-circle" style={{ fontSize: 16, color: '#52525B' }} />
            </button>
          ) : null}
        </div>
      </div>

      {/* ── Filter tabs (when results exist) ── */}
      {showTabs && (
        <div style={S.tabRow}>
          {['All', 'Products', 'Sellers'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                ...S.tabBtn,
                background: tab === t ? '#FF3366' : 'transparent',
                color: tab === t ? 'white' : '#A1A1AA',
                border: tab === t ? 'none' : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {tab === t && t === 'Products' && `${results.posts.length} `}
              {tab === t && t === 'Sellers'  && `${results.sellers.length} `}
              {t}
            </button>
          ))}
        </div>
      )}

      {/* ── Body ── */}
      <div style={S.body}>

        {/* Loading */}
        {loading && (
          <div style={S.center}>
            <div style={S.spinnerWrap}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: 22, color: '#FF3366' }} />
            </div>
          </div>
        )}

        {/* No query yet — show trending */}
        {!loading && !query && (
          <div style={{ padding: '20px 16px' }}>
            <div style={S.sectionLabel}>🔥 Trending searches</div>
            <div style={S.trendingGrid}>
              {TRENDING.map(t => (
                <button key={t} onClick={() => setQuery(t)} style={S.trendingPill}>
                  <i className="fas fa-arrow-trend-up" style={{ fontSize: 10, color: '#FF3366' }} />
                  {t}
                </button>
              ))}
            </div>

            <div style={{ ...S.sectionLabel, marginTop: 24 }}>Browse by category</div>
            <div style={S.catGrid}>
              {Object.entries(CATEGORY_EMOJI).filter(([k]) => k !== 'All').map(([label, emoji]) => (
                <button key={label} onClick={() => setQuery(label)} style={S.catChip}>
                  <span style={{ fontSize: 20 }}>{emoji}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#A1A1AA' }}>{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No results */}
        {!loading && query && !hasResults && (
          <div style={S.emptyState}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#A1A1AA', marginBottom: 6 }}>
              No results found
            </div>
            <div style={{ fontSize: 13, color: '#52525B', textAlign: 'center', lineHeight: 1.5 }}>
              No products or sellers matching &ldquo;{query}&rdquo;
            </div>
          </div>
        )}

        {/* Results */}
        {!loading && hasResults && (
          <div style={{ padding: '0 0 24px' }}>

            {/* Sellers section */}
            {(tab === 'All' || tab === 'Sellers') && results.sellers.length > 0 && (
              <>
                <div style={{ ...S.sectionLabel, padding: '14px 16px 8px' }}>
                  Sellers · {results.sellers.length}
                </div>
                <div style={{ display: 'flex', gap: 10, padding: '0 16px 16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                  {results.sellers.map(s => <SellerChip key={s.id} seller={s} />)}
                </div>
              </>
            )}

            {/* Products section */}
            {(tab === 'All' || tab === 'Products') && results.posts.length > 0 && (
              <>
                <div style={{ ...S.sectionLabel, padding: '4px 16px 12px' }}>
                  Products · {results.posts.length}
                </div>
                {results.posts.map(p => <ProductResult key={p.id} post={p} />)}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Seller chip (horizontal scroll) ──────────────────────────────────────────
function SellerChip({ seller }) {
  const color = avatarColor(seller.id)
  const init  = initials(seller.full_name || seller.username || 'S')
  return (
    <div style={S.sellerChip}>
      <div style={{ ...S.sellerAvatar, background: color }}>{init}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', textAlign: 'center', marginTop: 6, maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {seller.full_name || seller.username}
      </div>
      {seller.verified && (
        <div style={S.verifiedBadge}>✓</div>
      )}
    </div>
  )
}

// ── Product result row ────────────────────────────────────────────────────────
function ProductResult({ post: p }) {
  const seller  = p.seller || {}
  const color   = avatarColor(seller.id || '')
  const init    = initials(seller.full_name || seller.username || 'S')
  const disc    = discountPct(p.price, p.orig_price)

  return (
    <div style={S.productRow}>
      {/* Thumbnail */}
      <div style={{
        ...S.productThumb,
        background: p.bg_color || color + '22',
        backgroundImage: p.images?.[0] ? `url(${p.images[0]})` : 'none',
        backgroundSize: 'cover', backgroundPosition: 'center',
      }}>
        {!p.images?.[0] && (
          <span style={{ fontSize: 28 }}>
            {CATEGORY_EMOJI[p.category] || p.emoji || '📦'}
          </span>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.title}
        </div>
        <div style={{ fontSize: 12, color: '#71717A', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.description}
        </div>
        {/* Seller */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 900, color: 'white' }}>{init}</div>
          <span style={{ fontSize: 11, color: '#A1A1AA' }}>{seller.full_name || seller.username}</span>
          {seller.verified && <span style={{ fontSize: 9, background: '#3B82F6', color: 'white', padding: '0 4px', borderRadius: 3, fontWeight: 700 }}>✓</span>}
        </div>
        {/* Price + stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#FF3366' }}>{formatUGX(p.price)}</span>
          {p.orig_price && <span style={{ fontSize: 11, textDecoration: 'line-through', color: '#52525B' }}>{formatUGX(p.orig_price)}</span>}
          {disc && <span style={{ fontSize: 10, fontWeight: 800, background: '#FF3366', color: 'white', padding: '1px 6px', borderRadius: 5 }}>{disc}</span>}
        </div>
      </div>

      {/* Engagement */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#71717A' }}>
          <i className="fas fa-heart" style={{ fontSize: 9, color: '#FF3366' }} />
          {fmtCount(p.likes_count)}
        </div>
        {p.category && (
          <span style={{ fontSize: 10, background: 'rgba(255,51,102,0.1)', color: '#FF3366', padding: '2px 6px', borderRadius: 20, fontWeight: 600 }}>
            {p.category}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  overlay: {
    position: 'fixed', inset: 0, background: '#000',
    zIndex: 250, display: 'flex', flexDirection: 'column',
    fontFamily: "'Inter',sans-serif", color: '#fff',
  },
  topBar: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '12px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    flexShrink: 0,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: '50%',
    background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.08)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: '#fff', flexShrink: 0,
  },
  inputWrap: {
    flex: 1, position: 'relative',
    display: 'flex', alignItems: 'center',
  },
  searchIcon: { position: 'absolute', left: 13, fontSize: 14, color: '#52525B', pointerEvents: 'none' },
  input: {
    width: '100%', padding: '11px 36px 11px 38px',
    background: '#141414', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, color: '#fff', fontSize: 15,
    outline: 'none', fontFamily: 'inherit',
  },
  clearBtn: {
    position: 'absolute', right: 10,
    background: 'none', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', padding: 4,
  },
  tabRow: {
    display: 'flex', gap: 8, padding: '10px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    flexShrink: 0,
  },
  tabBtn: {
    padding: '6px 14px', borderRadius: 20,
    fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
    transition: 'all 0.15s',
  },
  body: { flex: 1, overflowY: 'auto' },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 },
  spinnerWrap: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
  emptyState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '60px 24px',
  },
  sectionLabel: {
    fontSize: 13, fontWeight: 700, color: '#71717A',
    letterSpacing: 0.3,
  },
  trendingGrid: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  trendingPill: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', borderRadius: 20,
    background: '#141414', border: '1px solid rgba(255,255,255,0.07)',
    color: '#A1A1AA', fontSize: 13, fontWeight: 500,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  catGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 10 },
  catChip: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
    padding: '12px 8px', borderRadius: 12,
    background: '#141414', border: '1px solid rgba(255,255,255,0.06)',
    cursor: 'pointer', fontFamily: 'inherit',
    transition: 'background 0.15s',
  },
  sellerChip: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 4, flexShrink: 0, width: 72, position: 'relative', cursor: 'pointer',
  },
  sellerAvatar: {
    width: 52, height: 52, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 18, fontWeight: 900, color: 'white',
    border: '2px solid rgba(255,255,255,0.1)',
  },
  verifiedBadge: {
    position: 'absolute', bottom: 26, right: 4,
    width: 14, height: 14, borderRadius: '50%',
    background: '#3B82F6', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: 7, color: 'white', fontWeight: 900,
    border: '2px solid #000',
  },
  productRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    cursor: 'pointer',
  },
  productThumb: {
    width: 64, height: 64, borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, overflow: 'hidden',
  },
}
