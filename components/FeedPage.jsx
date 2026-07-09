import { useRef, useEffect, useState, useCallback } from 'react'
import FeedCard                  from './FeedCard'
import PendingPostCard, { subscribePendingUploads } from './PendingPostCard'
import PostCommentsSheet         from './PostCommentsSheet'
import LocationPermissionScreen  from './LocationPermissionScreen'
import FeedSearchPanel           from './FeedSearchPanel'
import {
  fetchFeedPosts, getBatchPostStates, CATEGORIES,
  requestLocation, saveUserLocation,
} from '../lib/feed'

// localStorage key so we only ask once
const LOC_KEY = 'swoop_location_asked'

export default function FeedPage({ showToast, onTabChange, currentUser, refreshToken = 0 }) {
  const containerRef = useRef(null)

  const [activeTab,    setActiveTab]    = useState('For You')
  const [activeCat,    setActiveCat]    = useState('All')
  const [posts,        setPosts]        = useState([])
  const [postStates,   setPostStates]   = useState({})
  const [loading,      setLoading]      = useState(true)
  const [loadingMore,  setLoadingMore]  = useState(false)
  const [page,         setPage]         = useState(0)
  const [hasMore,      setHasMore]      = useState(true)
  const [commentPost,  setCommentPost]  = useState(null)
  const [showSearch,   setShowSearch]   = useState(false)
  const [pendingPosts, setPendingPosts] = useState([])

  // Location state
  const [userLat,      setUserLat]      = useState(null)
  const [userLng,      setUserLng]      = useState(null)
  const [locStatus,    setLocStatus]    = useState('idle')
  // 'idle' | 'asking' | 'loading' | 'granted' | 'denied'

  const LIMIT = 10

  // ── When user taps Nearby ─────────────────────────────────────────────────
  const handleNearbyTab = () => {
    setActiveTab('Nearby')
    // Already have location
    if (userLat !== null) return
    // Already denied/asked — skip asking again
    const asked = localStorage.getItem(LOC_KEY)
    if (asked === 'denied') return
    // Show the permission screen
    setLocStatus('asking')
  }

  const handleAllowLocation = async () => {
    setLocStatus('loading')
    try {
      const { lat, lng } = await requestLocation()
      setUserLat(lat)
      setUserLng(lng)
      setLocStatus('granted')
      localStorage.setItem(LOC_KEY, 'granted')
      if (currentUser?.id) await saveUserLocation(currentUser.id, lat, lng)
    } catch {
      setLocStatus('denied')
      localStorage.setItem(LOC_KEY, 'denied')
      showToast('Location access denied. Nearby may be limited.')
    }
  }

  const handleDenyLocation = () => {
    setLocStatus('denied')
    localStorage.setItem(LOC_KEY, 'denied')
  }

  // ── Load posts ────────────────────────────────────────────────────────────
  const loadPosts = useCallback(async (reset = false) => {
    // Don't load Nearby until we have a location decision
    if (activeTab === 'Nearby' && locStatus === 'asking') return

    const pg = reset ? 0 : page
    if (reset) setLoading(true)
    else       setLoadingMore(true)

    const data = await fetchFeedPosts({
      category: activeCat,
      tab: activeTab,
      currentUserId: currentUser?.id,
      userLat,
      userLng,
      page: pg,
      limit: LIMIT,
    })

    if (reset) { setPosts(data); setPage(1) }
    else       { setPosts(prev => [...prev, ...data]); setPage(pg + 1) }

    setHasMore(data.length === LIMIT)
    setLoading(false)
    setLoadingMore(false)

    if (data.length && currentUser?.id) {
      const ids    = data.map(p => p.id)
      const states = await getBatchPostStates(ids, currentUser.id)
      setPostStates(prev => ({ ...prev, ...states }))
    }
  }, [activeCat, activeTab, currentUser?.id, userLat, userLng, page, locStatus])

  useEffect(() => {
    if (locStatus === 'asking') return
    setPage(0); setHasMore(true)
    loadPosts(true)
  }, [activeCat, activeTab, locStatus])

  // Reload feed after a new post is published
  useEffect(() => {
    if (refreshToken > 0) {
      setPage(0); setHasMore(true)
      loadPosts(true)
    }
  }, [refreshToken])

  // TikTok-style pending uploads at top of feed
  useEffect(() => {
    return subscribePendingUploads(items => {
      setPendingPosts(items)
      const completed = items.filter(i => i.status === 'done' && i.post)
      if (completed.length) {
        setPosts(prev => {
          let next = [...prev]
          for (const item of completed) {
            if (!next.some(p => p.id === item.post.id)) {
              next = [{ ...item.post, seller: item.post.seller || item.seller }, ...next]
            }
          }
          return next
        })
      }
    })
  }, [])

  // Re-load when location granted
  useEffect(() => {
    if (locStatus === 'granted' && activeTab === 'Nearby') {
      setPage(0); setHasMore(true)
      loadPosts(true)
    }
  }, [locStatus])

  // ── IntersectionObserver: pause + infinite scroll ─────────────────────────
  useEffect(() => {
    if (!containerRef.current) return
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => e.target.classList.toggle('paused', !e.isIntersecting)),
      { threshold: 0.55 }
    )
    containerRef.current.querySelectorAll('.feed-card').forEach(c => obs.observe(c))
    return () => obs.disconnect()
  }, [posts])

  useEffect(() => {
    if (!containerRef.current || !hasMore || loadingMore) return
    const cards = containerRef.current.querySelectorAll('.feed-card')
    if (!cards.length) return
    const last = cards[cards.length - 1]
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadPosts(false)
    }, { threshold: 0.3 })
    obs.observe(last)
    return () => obs.disconnect()
  }, [posts, hasMore, loadingMore, loadPosts])

  // ── Search panel ──────────────────────────────────────────────────────────
  if (showSearch) {
    return <FeedSearchPanel onClose={() => setShowSearch(false)} />
  }

  // ── Location permission screen (Nearby) ───────────────────────────────────
  if (activeTab === 'Nearby' && locStatus === 'asking') {
    return (
      <>
        {/* Still render nav so user can switch away */}
        <div className="feed-top-nav">
          <div className="feed-top-bar">
            <TabBtn label="Live"     active={false} onClick={() => { onTabChange?.('live') }} />
            <TabBtn label="For You"  active={false} onClick={() => { setLocStatus('idle'); setActiveTab('For You') }} />
            <TabBtn label="Nearby"   active={true}  onClick={() => {}} />
          </div>
        </div>
        <div style={{ position: 'absolute', top: 80, inset: 0, zIndex: 40 }}>
          <LocationPermissionScreen
            onAllow={handleAllowLocation}
            onDeny={handleDenyLocation}
            loading={locStatus === 'loading'}
          />
        </div>
      </>
    )
  }

  return (
    <>
      {/* ── FIXED TOP NAV ── */}
      <div className="feed-top-nav">
        <div className="feed-top-bar">
          <TabBtn label="Live"    active={activeTab === 'Live'}    onClick={() => { setActiveTab('Live'); onTabChange?.('live') }} />
          <TabBtn label="For You" active={activeTab === 'For You'} onClick={() => setActiveTab('For You')} />
          <TabBtn
            label="Nearby"
            active={activeTab === 'Nearby'}
            onClick={handleNearbyTab}
            dot={activeTab === 'Nearby' && locStatus === 'granted'}
          />
        </div>
        <div className="feed-cats">
          {CATEGORIES.map((c, i) => (
            <button
              key={c}
              className={`feed-cat${activeCat === c ? ' active' : ''}`}
              onClick={() => setActiveCat(c)}
            >
              {i === 0 && <i className="fas fa-th" style={{ fontSize: 10 }} />}
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Search icon */}
      <div className="feed-search-icon" onClick={() => setShowSearch(true)}>
        <i className="fas fa-search" />
      </div>

      {/* ── FEED CONTAINER ── */}
      <div ref={containerRef} className="feed-container">

        {/* Loading */}
        {loading && <LoadingCard />}

        {/* Nearby — location denied, no coords: show city-level fallback message */}
        {!loading && activeTab === 'Nearby' && userLat === null && locStatus === 'denied' && (
          <div style={ES.page}>
            <div style={ES.iconCircle}>
              <i className="fas fa-location-slash" style={{ fontSize: 28, color: '#FF3366' }} />
            </div>
            <div style={ES.title}>Location access needed</div>
            <div style={ES.desc}>
              Enable location access in your phone settings to see posts from nearby sellers.
            </div>
            <button
              onClick={() => { setLocStatus('asking'); localStorage.removeItem(LOC_KEY) }}
              style={ES.retryBtn}
            >
              <i className="fas fa-location-dot" /> Try again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && posts.length === 0 && !(activeTab === 'Nearby' && userLat === null && locStatus === 'denied') && (
          <EmptyState tab={activeTab} category={activeCat} />
        )}

        {/* Pending uploads (TikTok-style) */}
        {pendingPosts.filter(p => p.status !== 'done').map(p => (
          <PendingPostCard key={p.id} item={p} />
        ))}

        {/* Posts */}
        {!loading && posts.map(p => (
          <FeedCard
            key={p.id}
            post={p}
            currentUser={currentUser}
            initialLiked={postStates[p.id]?.liked || false}
            initialSaved={postStates[p.id]?.saved || false}
            distanceKm={p._distanceKm ?? null}
            onOpenComments={post => setCommentPost(post)}
          />
        ))}

        {/* Loading more */}
        {loadingMore && (
          <div style={{ height: '50dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: 22, color: '#FF3366' }} />
          </div>
        )}

        {/* End of feed */}
        {!loading && !hasMore && posts.length > 0 && <EndCard />}
      </div>

      {/* Comments sheet */}
      {commentPost && (
        <PostCommentsSheet
          post={commentPost}
          currentUser={currentUser}
          onClose={() => setCommentPost(null)}
        />
      )}
    </>
  )
}

// ── Helper sub-components ─────────────────────────────────────────────────────

function TabBtn({ label, active, onClick, dot }) {
  return (
    <button className={`feed-tab${active ? ' active' : ''}`} onClick={onClick} style={{ position: 'relative' }}>
      {label}
      {dot && (
        <span style={{
          position: 'absolute', top: -2, right: -8,
          width: 6, height: 6, borderRadius: '50%',
          background: '#22C55E', border: '1.5px solid #000',
        }} />
      )}
    </button>
  )
}

function LoadingCard() {
  return (
    <div style={{
      height: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 16, background: '#000',
    }}>
      <div style={{
        width: 56, height: 56,
        background: 'linear-gradient(135deg,#D946EF,#FF3366,#FB923C)',
        borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, color: 'white', fontWeight: 900,
        animation: 'swoopPulse 1.4s ease-in-out infinite',
        boxShadow: '0 0 32px rgba(255,51,102,0.4)',
      }}>∞</div>
      <div style={{ fontSize: 14, color: '#A1A1AA', fontFamily: 'Inter,sans-serif', letterSpacing: '0.5px' }}>
        Loading posts...
      </div>
      <style>{`@keyframes swoopPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(0.9);opacity:0.7}}`}</style>
    </div>
  )
}

const CAT_EMOJI = { Phones:'📱', Fashion:'👗', Electronics:'💻', Sneakers:'👟', Home:'🏠', Beauty:'💄', Cars:'🚗' }

function EmptyState({ tab, category }) {
  const emoji = category !== 'All' ? (CAT_EMOJI[category] || '📦') : (tab === 'Nearby' ? '📍' : '✨')
  const title = tab === 'Nearby'
    ? 'No nearby posts found'
    : category !== 'All'
    ? `No ${category} posts yet`
    : 'No posts yet'
  const desc = tab === 'Nearby'
    ? 'There are no posts from sellers within 50 km of you right now.'
    : 'Be the first to post something amazing in this category.'
  return (
    <div style={{
      height: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 10, background: '#000', padding: '0 32px',
      fontFamily: 'Inter,sans-serif',
    }}>
      <div style={{ fontSize: 60, marginBottom: 4 }}>{emoji}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', textAlign: 'center', letterSpacing: '-0.3px' }}>{title}</div>
      <div style={{ fontSize: 13, color: '#52525B', textAlign: 'center', lineHeight: 1.6 }}>{desc}</div>
    </div>
  )
}

function EndCard() {
  return (
    <div style={{
      height: '40dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#000', gap: 10,
    }}>
      <div style={{
        width: 44, height: 44,
        background: 'linear-gradient(135deg,#D946EF,#FF3366)',
        borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, color: 'white', fontWeight: 900,
      }}>∞</div>
      <div style={{ fontSize: 13, color: '#52525B', fontFamily: 'Inter,sans-serif' }}>
        You&apos;re all caught up
      </div>
    </div>
  )
}

// ── Nearby empty state with retry ─────────────────────────────────────────────
const ES = {
  page: {
    height: '100dvh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: 14, background: '#000', padding: '0 36px',
    fontFamily: 'Inter,sans-serif',
  },
  iconCircle: {
    width: 72, height: 72, borderRadius: '50%',
    background: 'rgba(255,51,102,0.1)', border: '1px solid rgba(255,51,102,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 18, fontWeight: 800, color: '#fff', textAlign: 'center' },
  desc:  { fontSize: 13, color: '#52525B', textAlign: 'center', lineHeight: 1.6 },
  retryBtn: {
    marginTop: 8, padding: '11px 24px',
    background: 'linear-gradient(135deg,#D946EF,#FF3366)',
    border: 'none', borderRadius: 12,
    color: 'white', fontSize: 14, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', gap: 8,
    boxShadow: '0 3px 16px rgba(255,51,102,0.35)',
  },
}
