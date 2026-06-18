import { useRef, useEffect } from 'react'
import FeedCard from './FeedCard'
import { MOCK_POSTS, MOCK_SELLERS } from '../lib/mockData'

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

  return (
    <div ref={containerRef} className="feed-container" id="feedContainer">
      {MOCK_POSTS.map(p => {
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
      })}
    </div>
  )
}
