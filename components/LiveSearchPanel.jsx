import { useState, useEffect, useRef } from 'react'
import { searchLiveStreams, avatarColor, initials, fmtViewers } from '../lib/live'

export default function LiveSearchPanel({ onClose, onOpenStream }) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      setLoading(true)
      const data = await searchLiveStreams(query)
      setResults(data)
      setLoading(false)
    }, 350)
    return () => clearTimeout(t)
  }, [query])

  return (
    <div style={S.overlay}>
      {/* Search bar */}
      <div style={S.bar}>
        <button onClick={onClose} style={S.backBtn}>
          <i className="fas fa-arrow-left" style={{ fontSize: 17 }} />
        </button>
        <div style={S.inputWrap}>
          <i className="fas fa-search" style={S.searchIcon} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search live streams..."
            style={S.input}
          />
          {query && (
            <button onClick={() => setQuery('')} style={S.clearBtn}>
              <i className="fas fa-times" style={{ fontSize: 13, color: '#71717A' }} />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div style={S.results}>
        {loading && (
          <div style={S.center}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: 22, color: '#FF3366' }} />
          </div>
        )}

        {!loading && query && results.length === 0 && (
          <div style={S.emptyState}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#A1A1AA', marginBottom: 6 }}>
              No live streams found
            </div>
            <div style={{ fontSize: 13, color: '#52525B', textAlign: 'center' }}>
              No results for &ldquo;{query}&rdquo;
            </div>
          </div>
        )}

        {!loading && !query && (
          <div style={S.emptyState}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📺</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#71717A' }}>
              Search for live streams
            </div>
            <div style={{ fontSize: 13, color: '#52525B', marginTop: 4 }}>
              by title, category or seller name
            </div>
          </div>
        )}

        {!loading && results.map(stream => (
          <StreamResult
            key={stream.id}
            stream={stream}
            onClick={() => onOpenStream(stream)}
          />
        ))}
      </div>
    </div>
  )
}

function StreamResult({ stream, onClick }) {
  const host = stream.profiles || {}
  const color = avatarColor(host.id || stream.host_id)
  const initial = initials(host.full_name || host.username || 'U')

  return (
    <div onClick={onClick} style={S.resultRow}>
      {/* Thumbnail / avatar */}
      <div style={{ ...S.thumb, background: color }}>
        <span style={{ fontSize: 22 }}>
          {stream.type === 'sell' ? '🛍️' : '🎙️'}
        </span>
        <div style={S.liveBadge}>LIVE</div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {stream.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#A1A1AA' }}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900, color: 'white', flexShrink: 0 }}>
            {initial}
          </div>
          {host.full_name || host.username || 'Seller'}
          {host.verified && <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#3B82F6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, color: 'white', fontWeight: 900 }}>✓</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
          <span style={{ fontSize: 11, color: '#71717A', display: 'flex', alignItems: 'center', gap: 3 }}>
            <i className="fas fa-eye" style={{ fontSize: 10 }} />
            {fmtViewers(stream.viewer_count || 0)}
          </span>
          {stream.category && (
            <span style={{ fontSize: 10, fontWeight: 600, background: 'rgba(255,51,102,0.12)', color: '#FF3366', padding: '2px 7px', borderRadius: 20 }}>
              {stream.category}
            </span>
          )}
          <span style={{ fontSize: 10, fontWeight: 600, background: stream.type === 'sell' ? 'rgba(34,197,94,0.12)' : 'rgba(124,58,237,0.12)', color: stream.type === 'sell' ? '#22C55E' : '#A855F7', padding: '2px 7px', borderRadius: 20 }}>
            {stream.type === 'sell' ? 'Sell Live' : 'Social'}
          </span>
        </div>
      </div>

      <i className="fas fa-chevron-right" style={{ fontSize: 13, color: '#52525B', flexShrink: 0 }} />
    </div>
  )
}

const S = {
  overlay: {
    position: 'fixed', inset: 0, background: '#000',
    zIndex: 250, display: 'flex', flexDirection: 'column',
    fontFamily: "'Inter',sans-serif", color: '#fff',
  },
  bar: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '12px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    flexShrink: 0,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: '50%',
    background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.08)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: '#fff', flexShrink: 0,
  },
  inputWrap: {
    flex: 1, position: 'relative',
    display: 'flex', alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute', left: 13, fontSize: 14, color: '#52525B', pointerEvents: 'none',
  },
  input: {
    width: '100%', padding: '11px 36px 11px 38px',
    background: '#141414', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, color: '#fff', fontSize: 15,
    outline: 'none', fontFamily: 'inherit',
  },
  clearBtn: {
    position: 'absolute', right: 10,
    background: 'none', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', padding: 4,
  },
  results: { flex: 1, overflowY: 'auto', padding: '8px 0' },
  center: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 40,
  },
  emptyState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '60px 24px',
  },
  resultRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 16px', cursor: 'pointer',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    transition: 'background 0.15s',
  },
  thumb: {
    width: 56, height: 56, borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', flexShrink: 0, overflow: 'hidden',
  },
  liveBadge: {
    position: 'absolute', top: 4, left: 4,
    background: '#EF4444', color: 'white',
    fontSize: 8, fontWeight: 800,
    padding: '1px 5px', borderRadius: 3,
  },
}
