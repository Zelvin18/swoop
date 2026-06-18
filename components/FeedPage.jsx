import { useRef, useEffect } from 'react'
import FeedCard from './FeedCard'
import { MOCK_POSTS, MOCK_SELLERS } from '../lib/mockData'

// TODO: Replace MOCK_POSTS / MOCK_SELLERS with real Supabase queries
// e.g. const { data: posts } = useSWR('posts', fetchPosts)

export default function FeedPage({ showToast, onTabChange }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          entry.target.classList.toggle('paused', !entry.isIntersecting)
        })
      },
      { threshold: 0.6 }
    )
    containerRef.current.querySelectorAll('.feed-card').forEach(c => observer.observe(c))
    return () => observer.disconnect()
  }, [])

  // Using mock data temporarily — will be replaced with Supabase
  const posts = MOCK_POSTS

  return (
    <div ref={containerRef} className="feed-container" id="feedContainer">
      {posts.length === 0 ? (
        <div style={{
          height: '100dvh',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 12, background: '#000',
        }}>
          <div style={{ fontSize: 52, opacity: 0.4 }}>📱</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#A1A1AA' }}>No posts yet</div>
          <div style={{ fontSize: 13, color: '#52525B' }}>Be the first to post something</div>
        </div>
      ) : (
        posts.map(p => {
          const seller = MOCK_SELLERS.find(s => s.id === p.seller_id) || MOCK_SELLERS[0]
          return (
            <FeedCard
              key={p.id}
              post={p}
              seller={seller}
              showToast={showToast}
              onLive={() => onTabChange?.('live')}
            />
          )
        })
      )}
    </div>
  )
}
