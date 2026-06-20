import { useState, useEffect } from 'react'
import { formatUGX, discountPct, fmtCount, likePost, unlikePost, savePost, unsavePost, sharePost, recordView } from '../lib/feed'

export default function FeedCard({ post: p, currentUser, initialLiked = false, initialSaved = false, onOpenComments, onChatSeller }) {
  const [liked,     setLiked]     = useState(initialLiked)
  const [saved,     setSaved]     = useState(initialSaved)
  const [likes,     setLikes]     = useState(p.likes_count || 0)
  const [saves,     setSaves]     = useState(p.saves_count || 0)
  const [paused,    setPaused]    = useState(false)
  const [following, setFollowing] = useState(false)
  const [viewRecorded, setViewRecorded] = useState(false)

  const seller   = p.seller || {}
  const discStr  = discountPct(p.price, p.orig_price)
  const priceStr = formatUGX(p.price)
  const origStr  = p.orig_price ? formatUGX(p.orig_price) : null

  // Colour for seller avatar (deterministic)
  const COLORS = ['#7C3AED','#FF3366','#F97316','#22C55E','#3B82F6','#EC4899','#F59E0B','#06B6D4']
  const sellerColor = seller.id
    ? COLORS[seller.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length]
    : '#7C3AED'
  const sellerInitial = (seller.full_name || seller.username || 'S')[0].toUpperCase()

  // Record view once on mount
  useEffect(() => {
    if (!viewRecorded) {
      setViewRecorded(true)
      recordView(p.id, currentUser?.id)
    }
  }, [])

  // Sync initial like/save state from parent (after batch fetch)
  useEffect(() => { setLiked(initialLiked) }, [initialLiked])
  useEffect(() => { setSaved(initialSaved) }, [initialSaved])

  const handleLike = async () => {
    if (!currentUser) return
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikes(n => wasLiked ? n - 1 : n + 1)
    if (wasLiked) await unlikePost(p.id, currentUser.id)
    else          await likePost(p.id, currentUser.id)
  }

  const handleSave = async () => {
    if (!currentUser) return
    const wasSaved = saved
    setSaved(!wasSaved)
    setSaves(n => wasSaved ? n - 1 : n + 1)
    if (wasSaved) await unsavePost(p.id, currentUser.id)
    else          await savePost(p.id, currentUser.id)
  }

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: p.title, text: `${p.title} — UGX ${Number(p.price).toLocaleString()}`, url: window.location.href })
      } else {
        await navigator.clipboard.writeText(window.location.href)
      }
      await sharePost(p.id)
    } catch (e) { /* user dismissed */ }
  }

  return (
    <div className={`feed-card${paused ? ' paused' : ''}`}>

      {/* ── FULL SCREEN MEDIA ── */}
      <div
        className="feed-media-bg"
        style={{
          background: p.bg_color || '#0d0d0d',
          backgroundImage: p.images?.[0] ? `url(${p.images[0]})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        onClick={() => setPaused(x => !x)}
      >
        {!p.images?.[0] && p.emoji && (
          <div className="feed-media-emoji">{p.emoji}</div>
        )}
      </div>

      {/* Gradient overlay */}
      <div className="feed-overlay" />

      {/* Pause indicator */}
      <div className="feed-play">
        <i className="fas fa-play" />
      </div>

      {/* Hot deal badge */}
      {p.is_hot && (
        <div style={{
          position: 'absolute', top: 'calc(50% - 80px)', left: 14,
          background: 'linear-gradient(135deg,#FF3366,#F97316)',
          borderRadius: 20, padding: '4px 12px',
          fontSize: 11, fontWeight: 800, color: 'white',
          display: 'flex', alignItems: 'center', gap: 5,
          boxShadow: '0 2px 12px rgba(255,51,102,0.4)',
          zIndex: 15,
        }}>
          🔥 Hot Deal
        </div>
      )}

      {/* ── RIGHT ACTION STRIP ── */}
      <div className="feed-actions">

        {/* Like */}
        <div className="feed-action-btn" onClick={handleLike}>
          <i className={`fas fa-heart${liked ? ' liked' : ''}`} style={{ transition: 'transform 0.15s, color 0.15s', transform: liked ? 'scale(1.2)' : 'scale(1)' }} />
          <span className="feed-action-count">{fmtCount(likes)}</span>
        </div>

        {/* Comment */}
        <div className="feed-action-btn" onClick={() => onOpenComments && onOpenComments(p)}>
          <i className="fas fa-comment" />
          <span className="feed-action-count">{fmtCount(p.comments_count || 0)}</span>
        </div>

        {/* Save */}
        <div className="feed-action-btn" onClick={handleSave}>
          <i className={`fas fa-bookmark${saved ? ' saved' : ''}`} style={{ transition: 'transform 0.15s, color 0.15s', transform: saved ? 'scale(1.2)' : 'scale(1)' }} />
          <span className="feed-action-count">{fmtCount(saves)}</span>
        </div>

        {/* Share */}
        <div className="feed-action-btn" onClick={handleShare}>
          <i className="fas fa-share-nodes" />
          <span className="feed-action-count">{fmtCount(p.shares_count || 0)}</span>
        </div>

        {/* Seller avatar */}
        <div className="feed-action-btn" onClick={() => {}}>
          <div className="feed-action-av" style={{ background: sellerColor }}>
            {sellerInitial}
          </div>
        </div>

      </div>

      {/* ── BOTTOM INFO BLOCK ── */}
      <div className="feed-info">

        {/* Seller row */}
        <div className="feed-seller-row">
          <div className="feed-seller-av" style={{ background: sellerColor }}>
            {sellerInitial}
          </div>
          <span className="feed-seller-name-txt">
            {seller.full_name || seller.username || 'Seller'}
            {seller.verified && <span className="feed-verified">✓</span>}
          </span>
          <button
            className="feed-follow-btn"
            onClick={() => setFollowing(f => !f)}
            style={{
              background: following ? 'rgba(255,51,102,0.15)' : 'rgba(255,255,255,0.08)',
              borderColor: following ? '#FF3366' : 'rgba(255,255,255,0.65)',
              color: following ? '#FF3366' : 'white',
            }}
          >
            {following ? '✓ Following' : 'Follow'}
          </button>
        </div>

        {/* Title */}
        {p.title && <div className="feed-product-title">{p.title}</div>}

        {/* Description */}
        {p.description && <div className="feed-product-desc">{p.description}</div>}

        {/* Price */}
        {priceStr && (
          <div className="feed-price-row">
            <span className="feed-price">{priceStr}</span>
            {origStr  && <span className="feed-price-orig">{origStr}</span>}
            {discStr  && <span className="feed-price-badge">{discStr}</span>}
          </div>
        )}

        {/* CTA buttons */}
        <div className="feed-cta-row">
          <button className="feed-btn-buy" onClick={() => {}}>
            <i className="fas fa-bag-shopping" style={{ fontSize: 11 }} />
            Buy Now
          </button>
          <button className="feed-btn-chat" onClick={() => onChatSeller && onChatSeller(p, seller)}>
            <i className="fas fa-comment" style={{ fontSize: 11 }} />
            Chat with Seller
          </button>
        </div>

      </div>
    </div>
  )
}
