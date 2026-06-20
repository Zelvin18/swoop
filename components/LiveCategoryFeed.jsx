import { useState, useEffect } from 'react'
import { fetchLiveStreams, avatarColor, initials, fmtViewers } from '../lib/live'
import LiveViewerPage from './LiveViewerPage'

export default function LiveCategoryFeed({ category, currentUser, onClose }) {
  const [streams, setStreams]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [activeIdx, setActiveIdx]   = useState(0)
  const [viewingStream, setViewing] = useState(null)

  useEffect(() => {
    fetchLiveStreams({ filter: category }).then(data => {
      setStreams(data)
      setLoading(false)
    })
  }, [category])

  if (viewingStream) {
    return (
      <LiveViewerPage
        stream={viewingStream}
        currentUser={currentUser}
        onClose={() => setViewing(null)}
      />
    )
  }

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <button onClick={onClose} style={S.backBtn}>
          <i className="fas fa-arrow-left" style={{ fontSize: 17 }} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 800 }}>{category}</div>
          <div style={{ fontSize: 11, color: '#71717A' }}>Live streams</div>
        </div>
        <div style={S.liveBadge}>
          <div style={S.blinkDot} />
          {streams.length} LIVE
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div style={S.center}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: 28, color: '#FF3366' }} />
        </div>
      )}

      {!loading && streams.length === 0 && (
        <div style={S.emptyState}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📺</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#A1A1AA', marginBottom: 8 }}>
            No {category} streams live right now
          </div>
          <div style={{ fontSize: 13, color: '#52525B', textAlign: 'center', lineHeight: 1.6 }}>
            Check back soon or be the first to go live in this category
          </div>
        </div>
      )}

      {!loading && streams.length > 0 && (
        <>
          {/* Grid view */}
          <div style={S.grid}>
            {streams.map((stream, i) => (
              <StreamTile
                key={stream.id}
                stream={stream}
                onOpen={() => setViewing(stream)}
              />
            ))}
          </div>
        </>
      )}

      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  )
}

function StreamTile({ stream, onOpen }) {
  const host  = stream.profiles || {}
  const color = avatarColor(host.id || stream.host_id)
  const init  = initials(host.full_name || host.username || 'H')

  return (
    <div onClick={onOpen} style={S.tile}>
      {/* Thumbnail */}
      <div style={{ ...S.tileThumb, background: color + '33' }}>
        <span style={{ fontSize: 36 }}>
          {stream.type === 'sell' ? '🛍️' : '🎙️'}
        </span>
        {/* LIVE badge */}
        <div style={S.tileLiveBadge}>LIVE</div>
        {/* Viewers */}
        <div style={S.tileViewers}>
          <i className="fas fa-eye" style={{ fontSize: 9 }} />
          {fmtViewers(stream.viewer_count || 0)}
        </div>
      </div>
      {/* Info */}
      <div style={S.tileInfo}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900, color: 'white', flexShrink: 0 }}>
            {init}
          </div>
          <span style={{ fontSize: 11, color: '#A1A1AA', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {host.full_name || host.username || 'Seller'}
          </span>
          {host.verified && <span style={S.verifiedDot}>✓</span>}
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {stream.title}
        </div>
        <div style={{ display: 'flex', gap: 5, marginTop: 5 }}>
          <span style={{ fontSize: 10, background: stream.type === 'sell' ? 'rgba(34,197,94,0.15)' : 'rgba(124,58,237,0.15)', color: stream.type === 'sell' ? '#22C55E' : '#A855F7', padding: '2px 6px', borderRadius: 20, fontWeight: 600 }}>
            {stream.type === 'sell' ? 'Sell' : 'Social'}
          </span>
        </div>
      </div>
    </div>
  )
}

const S = {
  page:   { position: 'fixed', inset: 0, background: '#000', zIndex: 200, fontFamily: "'Inter',sans-serif", color: '#fff', display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, background: '#000' },
  backBtn:{ width: 36, height: 36, borderRadius: '50%', background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', flexShrink: 0 },
  liveBadge: { display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 20, padding: '4px 10px', fontSize: 11, fontWeight: 800, color: '#EF4444' },
  blinkDot: { width: 6, height: 6, borderRadius: '50%', background: '#EF4444', animation: 'blink 1s infinite' },
  center:   { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px' },
  grid:     { flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, padding: 14 },
  tile:     { background: '#141414', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden', cursor: 'pointer' },
  tileThumb:{ position: 'relative', width: '100%', paddingBottom: '70%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  tileLiveBadge: { position: 'absolute', top: 7, left: 7, background: '#EF4444', color: 'white', fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4 },
  tileViewers:   { position: 'absolute', top: 7, right: 7, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', color: 'white', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 3 },
  tileInfo:      { padding: '10px 12px 12px' },
  verifiedDot:   { width: 12, height: 12, borderRadius: '50%', background: '#3B82F6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, color: 'white', fontWeight: 900, flexShrink: 0 },
}
