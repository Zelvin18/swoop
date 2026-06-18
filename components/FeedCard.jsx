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
  const priceStr = p.price      ? formatUGX(p.price)      : null
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
      <div className="feed-play"><i className="fas fa-play" /></div>

      {/* ── RIGHT ACTION STRIP ── */}
      <div className="feed-actions">

        <div className="feed-action-btn" onClick={() => { setLiked(l => !l); setLikes(n => liked ? n - 1 : n + 1) }}>
          <i className={`fas fa-heart${liked ? ' liked' : ''}`} />
          <span className="feed-action-count">{fmt(likes)}</span>
        </div>

        <div className="feed-action-btn" onClick={() => showToast('💬 Comments coming soon...')}>
          <i className="fas fa-comment" />
          <span className="feed-action-count">{fmt(p.comments_count || 0)}</span>
        </div>

        <div className="feed-action-btn" onClick={() => { setSaved(s => !s); showToast(saved ? 'Removed' : '🔖 Saved!') }}>
          <i className={`fas fa-bookmark${saved ? ' saved' : ''}`} />
          <span className="feed-action-count">{fmt(p.saves_count || 0)}</span>
        </div>

        <div className="feed-action-btn" onClick={() => showToast('🔗 Link copied!')}>
          <i className="fas fa-share-nodes" />
          <span className="feed-action-count">{fmt(p.shares_count || 0)}</span>
        </div>

        <div className="feed-action-btn" onClick={() => showToast(`View ${seller?.name || 'Seller'}'s store`)}>
          <div className="feed-action-av" style={{ background: seller?.color || '#7C3AED' }}>
            {seller?.initials || '?'}
          </div>
        </div>

      </div>

      {/* ── BOTTOM INFO BLOCK ── */}
      <div className="feed-info">

        {/* Seller row: avatar · name · verified · Follow (Instagram-style, all inline) */}
        <div className="feed-seller-row">
          <div className="feed-seller-av" style={{ background: seller?.color || '#7C3AED' }}>
            {seller?.initials || '?'}
          </div>
          <span className="feed-seller-name-txt">
            {seller?.name || ''}
            {seller?.verified && <span className="feed-verified">✓</span>}
          </span>
          <button className="feed-follow-btn" onClick={() => setFollowing(f => !f)}>
            {following ? 'Following' : 'Follow'}
          </button>
        </div>

        {/* Product title */}
        {p.title && <div className="feed-product-title">{p.title}</div>}

        {/* Description — single truncated line */}
        {p.description && <div className="feed-product-desc">{p.description}</div>}

        {/* Price */}
        {priceStr && (
          <div className="feed-price-row">
            <span className="feed-price">{priceStr}</span>
            {origStr && <span className="feed-price-orig">{origStr}</span>}
            {discStr && <span className="feed-price-badge">{discStr}</span>}
          </div>
        )}

        {/* CTA buttons */}
        <div className="feed-cta-row">
          <button className="feed-btn-buy" onClick={() => showToast('🛍️ Checkout coming soon...')}>
            <i className="fas fa-bag-shopping" style={{ fontSize: 11 }} />
            Buy Now
          </button>
          <button className="feed-btn-chat" onClick={() => showToast('💬 Chat coming soon...')}>
            <i className="fas fa-comment" style={{ fontSize: 11 }} />
            Chat with Seller
          </button>
        </div>

      </div>
    </div>
  )
}
