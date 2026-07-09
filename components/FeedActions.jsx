import { fmtCount } from '../lib/feed'

function HeartIcon({ filled }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? '#FF3366' : 'none'} stroke={filled ? '#FF3366' : 'white'} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function CommentIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function SaveIcon({ filled }) {
  return (
    <svg width="22" height="26" viewBox="0 0 24 24" fill={filled ? '#FF3366' : 'none'} stroke={filled ? '#FF3366' : 'white'} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function FeedActionBtn({ onClick, count, active, children }) {
  return (
    <button type="button" className={`feed-action-btn-wrap${active ? ' active' : ''}`} onClick={onClick}>
      <div className="feed-action-glass">{children}</div>
      {count !== undefined && <span className="feed-action-count">{count}</span>}
    </button>
  )
}

export default function FeedActionRail({ liked, likes, comments, saved, saves, shares, onLike, onComment, onShare, onSave }) {
  return (
    <div className="feed-action-rail" onClick={e => e.stopPropagation()}>
      <FeedActionBtn onClick={onLike} count={fmtCount(likes)} active={liked}>
        <HeartIcon filled={liked} />
      </FeedActionBtn>
      <FeedActionBtn onClick={onComment} count={fmtCount(comments)}>
        <CommentIcon />
      </FeedActionBtn>
      <FeedActionBtn onClick={onShare} count={shares !== undefined ? fmtCount(shares) : undefined}>
        <ShareIcon />
      </FeedActionBtn>
      <FeedActionBtn onClick={onSave} active={saved}>
        <SaveIcon filled={saved} />
      </FeedActionBtn>
    </div>
  )
}

export function FeedSellerRow({ seller, sellerColor, sellerInitial, following, followLoading, onFollow, onSellerTap, badge, showFollow = true }) {
  const isSelf = !showFollow
  return (
    <div className="feed-seller-row">
      <div className="feed-seller-av" style={{ background: sellerColor, overflow: 'hidden', cursor: 'pointer' }} onClick={onSellerTap}>
        {seller?.avatar_url
          ? <img src={seller.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : sellerInitial}
      </div>
      <span className="feed-seller-name-txt" style={{ cursor: 'pointer' }} onClick={onSellerTap}>
        {seller?.full_name || seller?.username || 'User'}
        {seller?.verified && <span className="feed-verified">✓</span>}
      </span>
      {badge}
      {showFollow && !isSelf && (
        <button
          type="button"
          className={`feed-follow-btn${following ? ' following' : ''}`}
          disabled={followLoading}
          onClick={e => { e.stopPropagation(); e.preventDefault(); onFollow?.() }}
        >
          {followLoading ? '...' : following ? 'Following' : 'Follow'}
        </button>
      )}
    </div>
  )
}

export function FeedMusicPill({ title, artist }) {
  if (!title) return null
  const label = artist ? `${title} · ${artist}` : title
  return (
    <div className="feed-music-pill">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FF3366" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
      <span>{label}</span>
    </div>
  )
}
