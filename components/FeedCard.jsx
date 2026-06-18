import { useState } from 'react'
import { formatUGX, discount } from '../lib/mockData'

export default function FeedCard({ post: p, seller, showToast }) {
  const [liked,     setLiked]     = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [likes,     setLikes]     = useState(p.likes_count || 0)
  const [paused,    setPaused]    = useState(false)
  const [following, setFollowing] = useState(false)

  const fmt = n => {
    n = Math.round(n)
    return n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'K' : String(n)
  }

  const discStr  = p.price && p.orig_price ? discount(p.price, p.orig_price) : null
  const priceStr = p.price     ? formatUGX(p.price)      : null
  const origStr  = p.orig_price ? formatUGX(p.orig_price) : null

  return (
    <div className={`feed-card${paused ? ' paused' : ''}`}>

      {/* ── FULL SCREEN MEDIA ── */}
      <div
        className="feed-media-bg"
        style={{ background: p.bg || '#0d0d0d' }}
        onClick={() => setPaused(x => !x)}
      >
        {p.emoji && <div className="feed-media-emoji">{p.emoji}</div>}
      </div>
      <div className="feed-overlay" />

      {/* Pause icon */}
      <div className="feed-play">
        <i className="fas fa-play" />
      </div>

      {/* ── RIGHT ACTION STRIP ── */}
      <div className="feed-actions">

        {/* Like */}
        <div className="feed-action-btn" onClick={() => { setLiked(l => !l); setLikes(n => liked ? n - 1 : n + 1) }}>
          <i className={`fas fa-heart${liked ? ' liked' : ''}`} />
          <span className="feed-action-count">{fmt(likes)}</span>
        </div>

        {/* Comment */}
        <div className="feed-action-btn" onClick={() => showToast('💬 Comments coming soon...')}>
          <i className="fas fa-comment" />
          <span className="feed-action-count">{fmt(p.comments_count || 0)}</span>
        </div>

        {/* Save */}
        <div className="feed-action-btn" onClick={() => { setSaved(s => !s); showToast(saved ? 'Removed from saved' : '🔖 Saved!') }}>
          <i className={`fas fa-bookmark${saved ? ' saved' : ''}`} />
          <span className="feed-action-count">{fmt(p.saves_count || 0)}</span>
        </div>

        {/* Share */}
        <div className="feed-action-btn" onClick={() => showToast('🔗 Link copied!')}>
          <i className="fas fa-share-nodes" />
          <span className="feed-action-count">{fmt(p.shares_count || 0)}</span>
        </div>

        {/* Seller avatar */}
        <div className="feed-action-btn" onClick={() => showToast(`View ${seller?.name || 'Seller'}'s store`)}>
          <div
            className="feed-action-av"
            style={{ background: seller?.color || '#7C3AED' }}
          >
            {seller?.initials || '?'}
          </div>
        </div>
      </div>

      {/* ── BOTTOM INFO BLOCK ── */}
      <div className="feed-info">

        {/* Seller row */}
        <div className="feed-seller-row">
          <div className="feed-seller-av" style={{ background: seller?.color || '#7C3AED' }}>
            {seller?.initials || '?'}
          </div>
          <div className="feed-seller-name-txt">
            {seller?.name || ''}
            {seller?.verified && <span className="feed-verified">✓</span>}
          </div>
          <button className="feed-follow-btn" onClick={() => setFollowing(f => !f)}>
            {following ? 'Following' : 'Follow'}
          </button>
        </div>

        {/* Product title */}
        {p.title && <div className="feed-product-title">{p.title}</div>}

        {/* Description */}
        {p.description && <div className="feed-product-desc">{p.description}</div>}

        {/* Trust badges */}
        {p.trust_badges?.length > 0 && (
          <div className="feed-badges-row">
            {p.trust_badges.map(b => (
              <span key={b} className="feed-badge">
                {b === 'Verified Seller'    && <i className="fas fa-shield-halved" style={{ fontSize: 9, color: '#22C55E' }} />}
                {b === 'Free Delivery'      && <i className="fas fa-truck"         style={{ fontSize: 9, color: '#3B82F6' }} />}
                {b === 'Delivery Available' && <i className="fas fa-truck"         style={{ fontSize: 9, color: '#3B82F6' }} />}
                {b === '7 Days Return'      && <i className="fas fa-rotate-left"   style={{ fontSize: 9, color: '#F59E0B' }} />}
                {b}
              </span>
            ))}
          </div>
        )}

        {/* Price row */}
        {priceStr && (
          <div className="feed-price-row">
            <span className="feed-price">{priceStr}</span>
            {origStr  && <span className="feed-price-orig">{origStr}</span>}
            {discStr  && <span className="feed-price-badge">{discStr}</span>}
          </div>
        )}

        {/* CTA buttons */}
        <div className="feed-cta-row">
          <button className="feed-btn-buy" onClick={() => showToast('🛍️ Checkout coming soon...')}>
            <i className="fas fa-bag-shopping" style={{ fontSize: 12 }} />
            Buy Now
          </button>
          <button className="feed-btn-chat" onClick={() => showToast('💬 Chat coming soon...')}>
            <i className="fas fa-comment" style={{ fontSize: 12 }} />
            Chat with Seller
          </button>
        </div>

      </div>
    </div>
  )
}
