import { useState } from 'react'
import { formatUGX, discount } from '../lib/mockData'

const CATS = ['All', 'Phones', 'Fashion', 'Electronics', 'Home']

export default function FeedCard({ post: p, seller, showToast, onLive }) {
  const [liked,     setLiked]     = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [likes,     setLikes]     = useState(p.likes_count)
  const [paused,    setPaused]    = useState(false)
  const [following, setFollowing] = useState(false)
  const [activeCat, setActiveCat] = useState('All')

  const fmt = n => {
    n = Math.round(n)
    return n >= 1000 ? (n/1000).toFixed(1).replace('.0','')+'K' : String(n)
  }

  const disc     = discount(p.price, p.orig_price)
  const priceStr = formatUGX(p.price)
  const origStr  = formatUGX(p.orig_price)

  return (
    <div className="feed-card">

      {/* ── FULL SCREEN MEDIA ── */}
      <div
        className="feed-media-bg"
        style={{ background: p.bg }}
        onClick={() => setPaused(x => !x)}
      >
        <div className="feed-media-emoji">{p.emoji}</div>
      </div>
      <div className="feed-overlay" />

      {/* Pause indicator */}
      <div className={`feed-play ${paused ? '' : 'hidden'}`}>
        <i className="fas fa-play" />
      </div>

      {/* ── TOP NAV: Live · For You · Nearby (no background) ── */}
      <div className="feed-top-bar">
        <button className="feed-tab tab-live" onClick={onLive}>Live</button>
        <button className="feed-tab active">For You</button>
        <button className="feed-tab">Nearby</button>
      </div>
      <div className="feed-search-icon">
        <i className="fas fa-search" />
      </div>

      {/* ── SUB NAV: transparent white pills ── */}
      <div className="feed-cats">
        {CATS.map((c, i) => (
          <button
            key={c}
            className={`feed-cat ${activeCat === c ? 'active' : ''}`}
            onClick={() => setActiveCat(c)}
          >
            {i === 0 && <i className="fas fa-th" style={{fontSize:10}} />}
            {c}
          </button>
        ))}
      </div>

      {/* ── RIGHT ACTIONS ── */}
      <div className="feed-actions">
        {/* Like */}
        <div className="feed-action-btn" onClick={() => { setLiked(l=>!l); setLikes(n => liked ? n-1 : n+1) }}>
          <i className={`fas fa-heart ${liked ? 'liked' : ''}`} />
          <span className="feed-action-count">{fmt(likes)}</span>
        </div>
        {/* Comment */}
        <div className="feed-action-btn" onClick={() => showToast('💬 Comments...')}>
          <i className="fas fa-comment" />
          <span className="feed-action-count">{fmt(p.comments_count)}</span>
        </div>
        {/* Save */}
        <div className="feed-action-btn" onClick={() => { setSaved(s=>!s); showToast(saved?'Removed from saved':'🔖 Saved!') }}>
          <i className={`fas fa-bookmark ${saved ? 'liked' : ''}`} />
          <span className="feed-action-count">{fmt(p.saves_count * 220)}</span>
        </div>
        {/* Share */}
        <div className="feed-action-btn" onClick={() => showToast('🔗 Link copied!')}>
          <i className="fas fa-share-nodes" />
          <span className="feed-action-count">{fmt(p.shares_count)}</span>
        </div>
        {/* Seller avatar */}
        <div className="feed-action-btn">
          <div
            className="feed-seller-av feed-action-av"
            style={{ background: seller.color }}
          >
            {seller.initials}
          </div>
        </div>
      </div>

      {/* ── BOTTOM INFO ── */}
      <div className="feed-info">

        {/* Product name pill */}
        <div className="feed-product-pill">
          <div className="feed-product-pill-icon">🏷️</div>
          <span className="feed-product-pill-name">{p.title}</span>
        </div>

        {/* Seller + Follow */}
        <div className="feed-seller-row">
          <div className="feed-seller-av" style={{ background: seller.color }}>
            {seller.initials}
          </div>
          <div className="feed-seller-name-txt">
            {seller.name}
            {seller.verified && <span className="feed-verified">✓</span>}
          </div>
          <button
            className="feed-follow-btn"
            onClick={() => setFollowing(f => !f)}
          >
            {following ? 'Following' : 'Follow'}
          </button>
        </div>

        {/* Price row */}
        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:3}}>
          <span className="feed-price">{priceStr}</span>
          <span className="price-strike">{origStr}</span>
          <span className="price-discount">{disc}</span>
        </div>

        {/* Specs line */}
        <div style={{fontSize:13,color:'rgba(255,255,255,0.7)',marginBottom:8}}>
          {p.description}
        </div>

        {/* CTA buttons */}
        <div className="feed-cta-row">
          <button
            className="feed-btn-details"
            onClick={() => showToast('🛍️ Opening checkout...')}
          >
            <i className="fas fa-bag-shopping" style={{fontSize:12}} />
            Buy Now
          </button>
          <button
            className="feed-btn-chat"
            onClick={() => showToast('💬 Opening chat...')}
          >
            <i className="fas fa-comment" style={{fontSize:12}} />
            Chat with Seller
          </button>
        </div>

      </div>
    </div>
  )
}
