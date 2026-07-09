import { useFeedVideo } from '../lib/useFeedVideo'
import { getFilterCSS } from '../lib/mediaFilters'
import TextOverlayLayer from './TextOverlayLayer'
import FeedPostMusic from './FeedPostMusic'

/** Shared full-screen media for feed cards — video autoplay, overlays, music, error fallback */
export default function FeedMediaBlock({ post, posterUrl }) {
  const isVideo = !!post.video_url
  const hasImages = post.images?.length > 0
  const filterCSS = getFilterCSS(post.filter_name)
  const overlays = post.text_overlays || []

  const {
    cardRef, videoRef, paused, setPaused, muted, visible,
    videoError, setVideoError, tapUnmute, togglePause,
  } = useFeedVideo(isVideo)

  const poster = posterUrl || post.thumbnail_url || post.images?.[0]

  if (isVideo && !videoError) {
    return (
      <div ref={cardRef} style={{ position: 'absolute', inset: 0 }}>
        <video
          ref={videoRef}
          src={post.video_url}
          className="feed-media-bg"
          poster={poster || undefined}
          style={{ objectFit: 'cover', width: '100%', height: '100%', filter: filterCSS || undefined }}
          autoPlay
          muted={muted}
          loop
          playsInline
          preload="auto"
          onError={() => setVideoError(true)}
          onClick={togglePause}
        />
        <TextOverlayLayer overlays={overlays} />
        <FeedPostMusic post={post} isVisible={visible} />
        {paused && (
          <div onClick={() => setPaused(false)} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 18, cursor: 'pointer' }}>
            <svg width="52" height="52" viewBox="0 0 24 24" fill="rgba(255,255,255,0.85)" style={{ filter: 'drop-shadow(0 2px 12px rgba(0,0,0,0.7))' }}>
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
        )}
        {muted && (
          <button type="button" onClick={e => { e.stopPropagation(); tapUnmute() }}
            style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top,0px)+58px)', left: 14, display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, padding: '6px 12px', cursor: 'pointer', zIndex: 17, color: 'white', fontSize: 11, fontWeight: 600 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
            Tap or raise volume
          </button>
        )}
      </div>
    )
  }

  if (isVideo && videoError && poster) {
    return (
      <div style={{ position: 'absolute', inset: 0 }}>
        <img src={poster} alt="" className="feed-media-bg" style={{ objectFit: 'cover', width: '100%', height: '100%', filter: filterCSS || undefined }} />
        <TextOverlayLayer overlays={overlays} />
        <FeedPostMusic post={post} isVisible={visible} />
      </div>
    )
  }

  if (hasImages) {
    return (
      <div style={{ position: 'absolute', inset: 0 }}>
        <img src={post.images[0]} alt="" className="feed-media-bg" style={{ objectFit: 'cover', width: '100%', height: '100%', filter: filterCSS || undefined }} />
        <TextOverlayLayer overlays={overlays} />
        <FeedPostMusic post={post} isVisible={true} />
      </div>
    )
  }

  return (
    <div className="feed-media-bg" style={{ position: 'absolute', inset: 0, background: post.bg_color || '#0d0d0d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {post.emoji && <div className="feed-media-emoji">{post.emoji}</div>}
    </div>
  )
}

export function FeedCardRoot({ children, onDoubleClick, innerRef, className = 'feed-card' }) {
  return (
    <div ref={innerRef} className={className} onDoubleClick={onDoubleClick} style={{ position: 'relative' }}>
      {children}
    </div>
  )
}
