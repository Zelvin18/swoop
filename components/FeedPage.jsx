import { useRef, useEffect, useState, useCallback } from 'react'
import FeedCard            from './FeedCard'
import PostCommentsSheet   from './PostCommentsSheet'
import { fetchFeedPosts, getBatchPostStates, CATEGORIES } from '../lib/feed'

export default function FeedPage({ showToast, onTabChange, currentUser }) {
  const containerRef = useRef(null)

  const [activeTab, setActiveTab]         = useState('For You')
  const [activeCat, setActiveCat]         = useState('All')
  const [posts,     setPosts]             = useState([])
  const [postStates,setPostStates]        = useState({})   // { postId: { liked, saved } }
  const [loading,   setLoading]           = useState(true)
  const [loadingMore,setLoadingMore]      = useState(false)
  const [page,      setPage]              = useState(0)
  const [hasMore,   setHasMore]           = useState(true)
  const [commentPost,setCommentPost]      = useState(null) // post for comment sheet

  const LIMIT = 10

  // ── Load posts ──────────────────────────────────────────────────────────────
  const loadPosts = useCallback(async (reset = false) => {
    const pg = reset ? 0 : page
    if (reset) setLoading(true)
    else       setLoadingMore(true)

    const data = await fetchFeedPosts({
      category: activeCat,
      tab: activeTab,
      currentUserId: currentUser?.id,
      page: pg,
      limit: LIMIT,
    })

    if (reset) {
      setPosts(data)
      setPage(1)
    } else {
      setPosts(prev => [...prev, ...data])
      setPage(pg + 1)
    }

    setHasMore(data.length === LIMIT)
    setLoading(false)
    setLoadingMore(false)

    // Batch fetch liked/saved states
    if (data.length && currentUser?.id) {
      const ids = data.map(p => p.id)
      const states = await getBatchPostStates(ids, currentUser.id)
      setPostStates(prev => ({ ...prev, ...states }))
    }
  }, [activeCat, activeTab, currentUser?.id, page])

  // Reset when tab or category changes
  useEffect(() => {
    setPage(0)
    setHasMore(true)
    loadPosts(true)
  }, [activeCat, activeTab])

  // ── IntersectionObserver: pause cards + infinite scroll ─────────────────────
  useEffect(() => {
    if (!containerRef.current) return
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          entry.target.classList.toggle('paused', !entry.isIntersecting)
        })
      },
      { threshold: 0.55 }
    )
    containerRef.current.querySelectorAll('.feed-card').forEach(c => observer.observe(c))
    return () => observer.disconnect()
  }, [posts])

  // ── Load more when user reaches last card ───────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || !hasMore || loadingMore) return
    const cards = containerRef.current.querySelectorAll('.feed-card')
    if (!cards.length) return
    const lastCard = cards[cards.length - 1]

    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loadingMore) {
        loadPosts(false)
      }
    }, { threshold: 0.3 })
    observer.observe(lastCard)
    return () => observer.disconnect()
  }, [posts, hasMore, loadingMore, loadPosts])

  const handleChatSeller = (post, seller) => {
    showToast('💬 Chat coming soon...')
  }

  return (
    <>
      {/* ── FIXED TOP NAV ── */}
      <div className="feed-top-nav">
        <div className="feed-top-bar">
          <button
            className={`feed-tab${activeTab === 'Live' ? ' active' : ''}`}
            onClick={() => { setActiveTab('Live'); onTabChange?.('live') }}
          >
            Live
          </button>
          <button
            className={`feed-tab${activeTab === 'For You' ? ' active' : ''}`}
            onClick={() => setActiveTab('For You')}
          >
            For You
          </button>
          <button
            className={`feed-tab${activeTab === 'Nearby' ? ' active' : ''}`}
            onClick={() => setActiveTab('Nearby')}
          >
            Nearby
          </button>
        </div>

        {/* Category pills */}
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
      <div className="feed-search-icon" onClick={() => showToast('🔍 Search coming soon...')}>
        <i className="fas fa-search" />
      </div>

      {/* ── FEED CONTAINER ── */}
      <div ref={containerRef} className="feed-container" id="feedContainer">

        {/* Loading skeleton */}
        {loading && (
          <div style={{
            height: '100dvh', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 16, background: '#000',
          }}>
            <div style={{
              width: 52, height: 52,
              background: 'linear-gradient(135deg,#D946EF,#FF3366,#FB923C)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, animation: 'pulse 1.5s ease-in-out infinite',
            }}>
              ∞
            </div>
            <div style={{ fontSize: 14, color: '#A1A1AA', fontFamily: 'Inter,sans-serif' }}>
              Loading posts...
            </div>
            <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.6;transform:scale(0.95)}}`}</style>
          </div>
        )}

        {/* Empty state */}
        {!loading && posts.length === 0 && (
          <div style={{
            height: '100dvh', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 12, background: '#000', padding: '0 32px',
            fontFamily: 'Inter,sans-serif',
          }}>
            <div style={{ fontSize: 56, marginBottom: 4 }}>
              {activeCat === 'All' ? '📱' : { Phones:'📱', Fashion:'👗', Electronics:'💻', Sneakers:'👟', Home:'🏠', Beauty:'💄', Cars:'🚗' }[activeCat] || '📦'}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#A1A1AA', textAlign: 'center' }}>
              {activeTab === 'Nearby'
                ? 'No nearby posts found'
                : activeCat !== 'All'
                ? `No ${activeCat} posts yet`
                : 'No posts yet'}
            </div>
            <div style={{ fontSize: 13, color: '#52525B', textAlign: 'center', lineHeight: 1.6 }}>
              {activeTab === 'Nearby'
                ? 'Posts from sellers near you will appear here'
                : 'Be the first to post something amazing'}
            </div>
          </div>
        )}

        {/* Posts */}
        {!loading && posts.map(p => (
          <FeedCard
            key={p.id}
            post={p}
            currentUser={currentUser}
            initialLiked={postStates[p.id]?.liked || false}
            initialSaved={postStates[p.id]?.saved || false}
            onOpenComments={post => setCommentPost(post)}
            onChatSeller={handleChatSeller}
          />
        ))}

        {/* Loading more indicator */}
        {loadingMore && (
          <div style={{
            height: '100dvh', display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: '#000',
          }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: 24, color: '#FF3366' }} />
          </div>
        )}

        {/* End of feed */}
        {!loading && !hasMore && posts.length > 0 && (
          <div style={{
            height: '40dvh', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: '#000', gap: 10,
          }}>
            <div style={{
              width: 40, height: 40,
              background: 'linear-gradient(135deg,#D946EF,#FF3366)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, color: 'white',
            }}>∞</div>
            <div style={{ fontSize: 13, color: '#52525B', fontFamily: 'Inter,sans-serif' }}>
              You&apos;re all caught up
            </div>
          </div>
        )}
      </div>

      {/* ── COMMENTS SHEET ── */}
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
