import { useRef, useEffect, useState } from 'react'
import FeedCard from './FeedCard'
import { MOCK_POSTS, MOCK_SELLERS } from '../lib/mockData'

// TODO: Replace MOCK_POSTS / MOCK_SELLERS with real Supabase queries

const CATS = ['All', 'Phones', 'Fashion', 'Electronics', 'Sneakers', 'Home']

export default function FeedPage({ showToast, onTabChange }) {
  const containerRef  = useRef(null)
  const [activeCat, setActiveCat]   = useState('All')
  const [activeTab, setActiveTab]   = useState('For You')

  // Pause cards when they scroll out of view
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

  const posts = MOCK_POSTS

  return (
    <>
      {/* ── FIXED TOP NAV — rendered ONCE, floats above all cards ── */}
      <div className="feed-top-nav">
        {/* Live · For You · Nearby */}
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
          {CATS.map((c, i) => (
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

      {/* Search icon — outside feed-top-nav so it stays on top */}
      <div
        className="feed-search-icon"
        onClick={() => showToast('Search coming soon...')}
      >
        <i className="fas fa-search" />
      </div>

      {/* ── SCROLLABLE CARDS ── */}
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
              />
            )
          })
        )}
      </div>
    </>
  )
}
