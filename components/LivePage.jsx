import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  fetchLiveStreams, fetchUpcomingStreams, fetchTopCategories,
  countUnreadNotifications, subscribeToStream,
  startLiveStream, insertLiveProducts, endLiveStream,
  avatarColor, initials, fmtViewers,
} from '../lib/live'
import GoLiveSetupPage        from './GoLiveSetupPage'
import LiveSellingPage         from './LiveSellingPage'
import LiveSocialPage          from './LiveSocialPage'
import LiveViewerPage          from './LiveViewerPage'
import LiveSearchPanel         from './LiveSearchPanel'
import LiveNotificationsPanel  from './LiveNotificationsPanel'
import LiveCategoryFeed        from './LiveCategoryFeed'

const CATEGORY_EMOJI = {
  Electronics: '💻', Fashion: '👗', Home: '🏠',
  Phones: '📱', Beauty: '💄', Sneakers: '👟',
  Cars: '🚗', Other: '📦',
}
const FILTER_OPTIONS = ['All', 'Following', 'Electronics', 'Fashion', 'Home', 'Beauty']

export default function LivePage({ showToast, user, onGoLive, onLiveEnded }) {
  // ── View state ─────────────────────────────────────────────────────────────
  const [view, setView]         = useState('list')
  // view: 'list' | 'setup' | 'sell-host' | 'social-host' | 'viewer' | 'search' | 'notifications' | 'category'

  const [liveConfig,    setLiveConfig]    = useState(null)
  const [activeStream,  setActiveStream]  = useState(null)  // stream being viewed
  const [activeCategory,setActiveCategory]= useState(null)
  const [liveStreamId,  setLiveStreamId]  = useState(null)  // host's current stream id

  // ── List page data ──────────────────────────────────────────────────────────
  const [filter,         setFilter]        = useState('All')
  const [streams,        setStreams]        = useState([])
  const [upcoming,       setUpcoming]      = useState([])
  const [topCats,        setTopCats]       = useState([])
  const [unreadCount,    setUnreadCount]   = useState(0)
  const [notified,       setNotified]      = useState({})
  const [loading,        setLoading]       = useState(true)
  const [loadingUpcoming,setLoadingUpcoming]= useState(true)

  // ── Load main data ──────────────────────────────────────────────────────────
  const loadStreams = useCallback(async () => {
    setLoading(true)
    const data = await fetchLiveStreams({ filter, currentUserId: user?.id })
    setStreams(data)
    setLoading(false)
  }, [filter, user?.id])

  useEffect(() => { loadStreams() }, [loadStreams])

  useEffect(() => {
    fetchUpcomingStreams(user?.id).then(d => { setUpcoming(d); setLoadingUpcoming(false) })
    fetchTopCategories().then(setTopCats)
    if (user?.id) countUnreadNotifications(user.id).then(setUnreadCount)
  }, [user?.id])

  // ── Realtime: new streams go live ──────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('live-streams-list')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'live_streams',
      }, () => { loadStreams() })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [loadStreams])

  // ── Handle going live ──────────────────────────────────────────────────────
  const handleStartSell = async (config) => {
    if (!user) { showToast('Please sign in to go live'); return }
    const stream = await startLiveStream({
      hostId: user.id, title: config.title,
      category: config.category, type: 'sell',
      deliveryAvailable: config.delivery,
    })
    if (!stream) { showToast('Failed to start live. Try again.'); return }
    if (config.products?.length) await insertLiveProducts(stream.id, config.products)
    const fullConfig = { ...config, streamId: stream.id, type: 'sell' }
    setLiveConfig(fullConfig)
    setLiveStreamId(stream.id)
    onGoLive?.(fullConfig)
    setView('sell-host')
  }

  const handleStartSocial = async (config) => {
    if (!user) { showToast('Please sign in to go live'); return }
    const stream = await startLiveStream({
      hostId: user.id, title: config.title,
      category: config.category, type: 'social',
      deliveryAvailable: false,
    })
    if (!stream) { showToast('Failed to start live. Try again.'); return }
    const fullConfig = { ...config, streamId: stream.id, type: 'social' }
    setLiveConfig(fullConfig)
    setLiveStreamId(stream.id)
    onGoLive?.(fullConfig)
    setView('social-host')
  }

  const handleEndLive = async () => {
    if (!liveStreamId) return  // guard against double-tap
    const id = liveStreamId
    setLiveStreamId(null)      // clear immediately to prevent double-tap
    setLiveConfig(null)
    await endLiveStream(id)
    setView('list')
    onLiveEnded?.()
    showToast('✅ Live ended!')
    loadStreams()
  }

  // ── Stream card tap — never let host join their own live as viewer ──────────
  const handleOpenStream = (s) => {
    if (s.host_id === user?.id && liveStreamId === s.id) {
      // They're already hosting this — go back to host view
      setView(liveConfig?.type === 'sell' ? 'sell-host' : 'social-host')
      return
    }
    if (s.host_id === user?.id) {
      // Orphan stream belonging to this user — end it silently
      endLiveStream(s.id).then(loadStreams)
      showToast('Your previous live has been ended.')
      return
    }
    setActiveStream(s)
    setView('viewer')
  }

  const handleNotifyMe = async (streamId) => {
    if (!user) { showToast('Sign in to get notified'); return }
    const isOn = notified[streamId]
    setNotified(n => ({ ...n, [streamId]: !isOn }))
    if (!isOn) {
      await subscribeToStream(user.id, streamId)
      showToast("🔔 You'll be notified when this stream starts!")
    } else {
      showToast('🔕 Notification removed')
    }
  }

  // ── Sub-views ──────────────────────────────────────────────────────────────
  // Pause all feed media whenever we're in any live sub-view
  useEffect(() => {
    if (view !== 'list') {
      // Kill all feed videos/audio while in live
      if (typeof document !== 'undefined') {
        document.querySelectorAll('video').forEach(v => { v.pause(); v.muted = true })
        document.querySelectorAll('audio').forEach(a => a.pause())
      }
    }
  }, [view])

  if (view === 'setup')
    return <GoLiveSetupPage onClose={() => setView('list')} onStartSell={handleStartSell} onStartSocial={handleStartSocial} />

  if (view === 'sell-host')
    return <LiveSellingPage config={liveConfig} currentUser={user} onEnd={handleEndLive} />

  if (view === 'social-host')
    return <LiveSocialPage config={liveConfig} currentUser={user} onEnd={handleEndLive} />

  if (view === 'viewer' && activeStream)
    return <LiveViewerPage stream={activeStream} currentUser={user} onClose={() => { setView('list'); loadStreams() }} />

  if (view === 'search')
    return <LiveSearchPanel onClose={() => setView('list')} onOpenStream={s => { setActiveStream(s); setView('viewer') }} />

  if (view === 'notifications')
    return <LiveNotificationsPanel userId={user?.id} onClose={() => setView('list')} onOpenStream={s => { setActiveStream(s); setView('viewer') }} />

  if (view === 'category' && activeCategory)
    return <LiveCategoryFeed category={activeCategory} currentUser={user} onClose={() => setView('list')} />

  // ── Main list page ─────────────────────────────────────────────────────────
  return (
    <div style={{ paddingBottom: 24 }}>
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <div className="page-title">Live</div>
          <div className="page-subtitle">Shop live deals and interact with sellers</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="header-btn" onClick={() => setView('search')}>
            <i className="fas fa-search" />
          </button>
          <button className="header-btn" onClick={() => { setView('notifications'); setUnreadCount(0) }} style={{ position: 'relative' }}>
            <i className="fas fa-bell" />
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: -3, right: -3, minWidth: 16, height: 16, padding: '0 4px', background: '#FF3366', borderRadius: 20, fontSize: 9, fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #000' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Go Live banner ── */}
      <div style={{
        margin: '0 16px 20px', padding: 16,
        background: '#141414',
        border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'rgba(239,68,68,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 0 6px rgba(239,68,68,0.08)',
          flexShrink: 0,
        }}>
          <i className="fas fa-circle-dot" style={{ color: '#EF4444', fontSize: 20 }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>Go Live &amp; Sell</div>
          <div style={{ fontSize: 12, color: '#A1A1AA' }}>Show your products, engage buyers and grow your sales</div>
        </div>
        <button
          onClick={() => setView('setup')}
          style={{
            padding: '9px 16px', background: 'linear-gradient(135deg,#FF3366,#FF6633)', border: 'none', borderRadius: 20,
            color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
            boxShadow: '0 3px 12px rgba(255,51,102,0.4)',
          }}
        >
          <i className="fas fa-video" style={{ fontSize: 13 }} /> Start Live
        </button>
      </div>

      {/* ── Filter pills ── */}
      <div className="pill-row">
        {FILTER_OPTIONS.map(f => (
          <button
            key={f}
            className={`pill ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* ── Live Now ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 800 }}>
          Live Now
          {streams.length > 0 && (
            <>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', display: 'inline-block', animation: 'blink 1.2s infinite' }} />
              <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 700, background: 'rgba(239,68,68,0.1)', padding: '2px 8px', borderRadius: 20 }}>
                {streams.length} Live
              </span>
            </>
          )}
        </div>
        {streams.length > 0 && (
          <button onClick={() => { setActiveCategory(filter === 'All' ? 'All' : filter); setView('category') }} style={S.seeAllBtn}>
            See All
          </button>
        )}
      </div>

      {loading ? (
        <div style={S.loadingRow}>
          {[1,2,3].map(i => <div key={i} style={S.skeletonCard} />)}
        </div>
      ) : streams.length === 0 ? (
        <div style={S.emptyCard}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📺</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#A1A1AA', marginBottom: 4 }}>
            {filter === 'Following'
              ? 'No live streams from people you follow'
              : filter !== 'All'
              ? `No ${filter} streams live right now`
              : 'No live streams right now'}
          </div>
          <div style={{ fontSize: 12, color: '#52525B' }}>Check back soon or start your own</div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10, padding: '0 16px 20px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {streams.map(s => (
            <StreamCard
              key={s.id}
              stream={s}
              onOpen={() => handleOpenStream(s)}
            />
          ))}
        </div>
      )}

      {/* ── Upcoming Live ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 12px' }}>
        <div style={{ fontSize: 16, fontWeight: 800 }}>Upcoming Live</div>
        <span style={S.seeAllBtn}>See All</span>
      </div>

      <div style={{ padding: '0 16px' }}>
        {loadingUpcoming ? (
          <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: 18, color: '#FF3366' }} />
          </div>
        ) : upcoming.length === 0 ? (
          <div style={{ ...S.emptyCard, padding: '20px 16px' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🗓️</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#A1A1AA', marginBottom: 3 }}>
              No upcoming streams from people you follow
            </div>
            <div style={{ fontSize: 11, color: '#52525B' }}>Follow sellers to see their scheduled lives here</div>
          </div>
        ) : (
          upcoming.map(u => (
            <UpcomingCard
              key={u.id}
              item={u}
              notified={notified}
              onNotify={() => handleNotifyMe(u.id)}
            />
          ))
        )}
      </div>

      {/* ── Top Categories Live ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 16px 12px' }}>
        <div style={{ fontSize: 16, fontWeight: 800 }}>Top Categories Live</div>
      </div>

      <div style={{ display: 'flex', gap: 14, padding: '0 16px 24px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {/* Always show all categories; show live count on active ones */}
        {Object.entries(CATEGORY_EMOJI).map(([label, emoji]) => {
          const liveCount = topCats.find(c => c.label.toLowerCase() === label.toLowerCase())?.count || 0
          return (
            <div
              key={label}
              onClick={() => { setActiveCategory(label); setView('category') }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0, cursor: 'pointer' }}
            >
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: liveCount > 0 ? '#1a0a0a' : '#1e1e1e',
                border: `2.5px solid ${liveCount > 0 ? '#EF4444' : 'rgba(255,255,255,0.1)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, position: 'relative',
                boxShadow: liveCount > 0 ? '0 0 16px rgba(239,68,68,0.25)' : 'none',
              }}>
                {emoji}
                {liveCount > 0 && (
                  <span style={{
                    position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)',
                    background: '#EF4444', color: 'white', fontSize: 8, fontWeight: 800,
                    padding: '1px 6px', borderRadius: 3, whiteSpace: 'nowrap', border: '1.5px solid #000',
                  }}>
                    {liveCount > 9 ? '9+ LIVE' : `${liveCount} LIVE`}
                  </span>
                )}
              </div>
              <span style={{ fontSize: 11, color: liveCount > 0 ? '#fff' : '#71717A', fontWeight: liveCount > 0 ? 600 : 400 }}>
                {label}
              </span>
            </div>
          )
        })}
      </div>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  )
}

// ── Stream Card ───────────────────────────────────────────────────────────────
function StreamCard({ stream, onOpen }) {
  const host  = stream.profiles || {}
  const color = avatarColor(host.id || stream.host_id)
  const init  = initials(host.full_name || host.username || 'H')

  return (
    <div
      onClick={onOpen}
      style={{
        flexShrink: 0, width: 'calc(50vw - 21px)', maxWidth: 190,
        borderRadius: 14, overflow: 'hidden',
        aspectRatio: '9/13', position: 'relative',
        background: `linear-gradient(135deg, ${color}33, ${color}11)`,
        cursor: 'pointer', border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Background */}
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60 }}>
        {stream.type === 'sell' ? '🛍️' : '🎙️'}
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,transparent 35%,rgba(0,0,0,0.85))' }} />

      {/* Top badges */}
      <div style={{ position: 'absolute', top: 8, left: 8, right: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ background: '#EF4444', color: 'white', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 4 }}>LIVE</span>
        <span style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', color: 'white', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
          <i className="fas fa-eye" style={{ fontSize: 9 }} />{fmtViewers(stream.viewer_count || 0)}
        </span>
      </div>

      {/* Bottom info */}
      <div style={{ position: 'absolute', bottom: 10, left: 10, right: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 5, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {stream.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: color, border: '1.5px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900, color: 'white', flexShrink: 0 }}>
            {init}
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {host.full_name || host.username || 'Seller'}
          </span>
          {host.verified && <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#3B82F6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, color: 'white', fontWeight: 900, flexShrink: 0 }}>✓</span>}
        </div>
      </div>
    </div>
  )
}

// ── Upcoming Card ─────────────────────────────────────────────────────────────
function UpcomingCard({ item: u, notified, onNotify }) {
  const host  = u.profiles || {}
  const color = avatarColor(host.id || u.host_id)
  const init  = initials(host.full_name || host.username || 'H')
  const isOn  = notified[u.id]

  const scheduledLabel = u.scheduled_at
    ? new Date(u.scheduled_at).toLocaleString('en-UG', { weekday: 'short', hour: '2-digit', minute: '2-digit' })
    : 'Scheduled'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: 14,
      background: '#141414', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 14, marginBottom: 10,
    }}>
      <div style={{ width: 46, height: 46, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: 'white', flexShrink: 0, boxShadow: `0 0 0 3px ${color}33` }}>
        {init}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {u.title}
        </div>
        <div style={{ fontSize: 11, color: '#A1A1AA', marginBottom: 3 }}>
          {host.full_name || host.username}
          {host.verified && <span style={{ marginLeft: 4, fontSize: 9, background: '#3B82F6', color: 'white', padding: '0 4px', borderRadius: 3, fontWeight: 700 }}>✓</span>}
        </div>
        <div style={{ fontSize: 11, color: '#F59E0B', display: 'flex', alignItems: 'center', gap: 4 }}>
          <i className="fas fa-calendar" style={{ fontSize: 10 }} />
          {scheduledLabel}
        </div>
      </div>
      <button
        onClick={onNotify}
        style={{
          padding: '7px 12px', borderRadius: 20, flexShrink: 0,
          border: `1.5px solid ${isOn ? '#7C3AED' : 'rgba(255,255,255,0.12)'}`,
          background: isOn ? 'rgba(124,58,237,0.15)' : '#1e1e1e',
          color: isOn ? '#A855F7' : '#A1A1AA',
          fontSize: 12, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
        }}
      >
        <i className="fas fa-bell" style={{ fontSize: 11 }} />
        {isOn ? 'Notifying' : 'Notify Me'}
      </button>
    </div>
  )
}

// ── Shared button style ───────────────────────────────────────────────────────
const S = {
  seeAllBtn: {
    fontSize: 13, fontWeight: 600, color: '#FF3366',
    cursor: 'pointer', background: 'none', border: 'none',
    fontFamily: 'inherit',
  },
  emptyCard: {
    margin: '0 0 20px', padding: '32px 16px',
    background: '#141414', border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: 16, display: 'flex', flexDirection: 'column',
    alignItems: 'center', textAlign: 'center', gap: 4,
  },
  loadingRow: {
    display: 'flex', gap: 10, padding: '0 16px 20px',
    overflowX: 'hidden',
  },
  skeletonCard: {
    flexShrink: 0, width: 'calc(50vw - 21px)', maxWidth: 190,
    borderRadius: 14, aspectRatio: '9/13',
    background: 'linear-gradient(135deg,#1a1a1a,#0d0d0d)',
    border: '1px solid rgba(255,255,255,0.04)',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
}
