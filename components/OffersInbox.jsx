/**
 * OffersInbox — Buyer's list of offers on their request
 * Full-screen overlay matching the design image (Step 3 of flow)
 */
import { useState, useEffect } from 'react'
import { fetchOffers } from '../lib/requests'
import { haversineKm, formatUGX } from '../lib/feed'
import { supabase } from '../lib/supabase'

const COLORS = ['#7C3AED','#FF3366','#F97316','#22C55E','#3B82F6','#EC4899','#F59E0B','#06B6D4']
const CAT_EMOJI = { Phones:'📱',Electronics:'💻',Fashion:'👗',Sneakers:'👟',Home:'🏠',Beauty:'💄',Cars:'🚗',Furniture:'🛋️',Sports:'⚽',Other:'📦' }
const SORT_OPTS = ['All','Lowest Price','Nearest','Newest']

function avatarColor(id='') { return COLORS[id.split('').reduce((a,c)=>a+c.charCodeAt(0),0)%COLORS.length] }
function initials(n='') { return n.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)||'?' }
function timeAgo(d) {
  const m = Math.floor((Date.now()-new Date(d))/60000)
  if (m<1) return 'just now'; if (m<60) return `${m}m ago`
  const h = Math.floor(m/60); if (h<24) return `${h}h ago`
  return `${Math.floor(h/24)}d ago`
}

export default function OffersInbox({ request, currentUser, onBack, onViewOffer }) {
  const [offers,     setOffers]     = useState([])
  const [loading,    setLoading]    = useState(true)
  const [sortFilter, setSortFilter] = useState('All')
  const [error,      setError]      = useState('')

  // Load offers
  useEffect(() => {
    let mounted = true
    fetchOffers(request.id).then(data => {
      if (mounted) { setOffers(data); setLoading(false) }
    }).catch(() => {
      if (mounted) { setError('Failed to load offers. Tap to retry.'); setLoading(false) }
    })

    // Realtime: new offers
    const ch = supabase.channel(`inbox-${request.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'offers', filter: `request_id=eq.${request.id}` },
        async payload => {
          const { data: seller } = await supabase.from('profiles')
            .select('id, full_name, username, avatar_url, verified, location, lat, lng, rating, avg_rating, review_count, response_rate, joined_at')
            .eq('id', payload.new.seller_id).single()
          if (mounted) setOffers(prev => [{ ...payload.new, seller }, ...prev])
        })
      .subscribe()
    return () => { mounted = false; supabase.removeChannel(ch) }
  }, [request.id])

  // Sort logic (client-side)
  const sorted = (() => {
    const arr = [...offers]
    if (sortFilter === 'Lowest Price') return arr.sort((a,b) => (a.price||0) - (b.price||0))
    if (sortFilter === 'Newest') return arr.sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
    if (sortFilter === 'Nearest') {
      return arr.sort((a,b) => {
        const dist = o => (o.seller?.lat && o.seller?.lng && request.lat && request.lng)
          ? haversineKm(request.lat, request.lng, o.seller.lat, o.seller.lng)
          : Infinity
        return dist(a) - dist(b)
      })
    }
    return arr // All — original order
  })()

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#000', display: 'flex', flexDirection: 'column',
      fontFamily: "'Inter', sans-serif", color: '#fff',
    }}>
      {/* ── Header ── */}
      <div style={{
        flexShrink: 0, padding: '12px 16px',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={onBack} aria-label="Go back" style={S.iconBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 800 }}>Offers</div>
          <div style={{ fontSize: 12, color: '#71717A', marginTop: 1 }}>
            {loading ? 'Loading…' : `${offers.length} offer${offers.length !== 1 ? 's' : ''} received`}
          </div>
        </div>
        {/* Request mini-title */}
        <div style={{
          maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontSize: 11, color: '#A1A1AA', background: '#141414',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '4px 10px',
        }}>
          {request.title}
        </div>
      </div>

      {/* ── Sort filter pills ── */}
      <div style={{
        flexShrink: 0, display: 'flex', gap: 8, padding: '10px 16px',
        overflowX: 'auto', scrollbarWidth: 'none',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        {SORT_OPTS.map(opt => (
          <button key={opt} onClick={() => setSortFilter(opt)}
            style={{
              flexShrink: 0, padding: '7px 14px', borderRadius: 20,
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              background: sortFilter === opt ? 'rgba(255,51,102,0.15)' : '#141414',
              border: `1.5px solid ${sortFilter === opt ? '#FF3366' : 'rgba(255,255,255,0.08)'}`,
              color: sortFilter === opt ? '#FF3366' : '#A1A1AA',
              transition: 'all 0.15s',
            }}>
            {opt}
          </button>
        ))}
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>

        {/* Loading */}
        {loading && (
          <div style={S.center}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF3366" strokeWidth="2" style={{animation:'spin 0.7s linear infinite'}}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={S.center}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
              <div style={{ fontSize: 14, color: '#A1A1AA', marginBottom: 16 }}>{error}</div>
              <button onClick={() => { setError(''); setLoading(true); fetchOffers(request.id).then(d => { setOffers(d); setLoading(false) }) }}
                style={{ padding: '10px 24px', background: 'linear-gradient(135deg,#FF3366,#FF6633)', border: 'none', borderRadius: 12, color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && offers.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', gap: 10 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,51,102,0.1)', border: '2px solid rgba(255,51,102,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#FF3366" strokeWidth="1.5" strokeLinecap="round"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
            </div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>No offers yet</div>
            <div style={{ fontSize: 13, color: '#52525B', textAlign: 'center', lineHeight: 1.6, maxWidth: 260 }}>
              Sellers will see your request and send offers. Check back soon.
            </div>
          </div>
        )}

        {/* Offer cards */}
        {!loading && !error && sorted.map(offer => (
          <OfferCard
            key={offer.id}
            offer={offer}
            request={request}
            onClick={() => onViewOffer(offer)}
          />
        ))}

        <div style={{ height: 'calc(var(--nav-h, 50px) + env(safe-area-inset-bottom, 0px) + 16px)' }} />
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function OfferCard({ offer, request, onClick }) {
  const seller = offer.seller || {}
  const color  = avatarColor(seller.id || offer.seller_id || '')
  const init   = initials(seller.full_name || seller.username || 'S')
  const dist   = (seller.lat && seller.lng && request.lat && request.lng)
    ? haversineKm(request.lat, request.lng, seller.lat, seller.lng)
    : null

  const statusColors = { accepted: '#22C55E', rejected: '#EF4444', pending: '#F59E0B' }
  const statusLabels = { accepted: 'Accepted', rejected: 'Declined', pending: 'Pending' }

  return (
    <div onClick={onClick} style={{
      margin: '12px 16px 0',
      background: '#141414',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 18, overflow: 'hidden',
      cursor: 'pointer', transition: 'transform 0.15s',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', gap: 12, padding: '14px 14px 10px', alignItems: 'flex-start' }}>
        {/* Avatar */}
        <div style={{
          width: 46, height: 46, borderRadius: '50%', background: color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, fontSize: 15, color: 'white', flexShrink: 0,
          border: '2px solid rgba(255,255,255,0.1)', overflow: 'hidden',
          boxShadow: `0 0 0 3px ${color}33`,
        }}>
          {seller.avatar_url
            ? <img src={seller.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span>{init}</span>
          }
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {seller.full_name || seller.username || 'Seller'}
            </span>
            {seller.verified && (
              <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#3B82F6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: 'white', fontWeight: 900, flexShrink: 0 }}>✓</span>
            )}
            {offer.negotiable && (
              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 20, background: 'rgba(34,197,94,0.15)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.25)', flexShrink: 0 }}>Negotiable</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: '#71717A', display: 'flex', alignItems: 'center', gap: 6 }}>
            {dist !== null && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#22C55E' }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {dist < 1 ? `${Math.round(dist*1000)}m` : `${dist.toFixed(1)}km`}
              </span>
            )}
            {seller.location && <span>{seller.location}</span>}
            <span>·</span>
            <span>{timeAgo(offer.created_at)}</span>
          </div>
        </div>

        {/* Status badge */}
        <div style={{
          fontSize: 11, fontWeight: 700, padding: '4px 9px', borderRadius: 20,
          color: statusColors[offer.status] || '#F59E0B',
          background: `${statusColors[offer.status] || '#F59E0B'}15`,
          border: `1px solid ${statusColors[offer.status] || '#F59E0B'}30`,
          flexShrink: 0,
        }}>
          {statusLabels[offer.status] || 'Pending'}
        </div>
      </div>

      {/* Description snippet */}
      {offer.message && (
        <div style={{
          fontSize: 13, color: '#D4D4D8', lineHeight: 1.5,
          padding: '0 14px 10px',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {offer.message}
        </div>
      )}

      {/* Footer: price + first image + view button */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px 14px', borderTop: '1px solid rgba(255,255,255,0.05)',
        gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* First offer image thumbnail */}
          {offer.images?.length > 0 && (
            <div style={{ width: 42, height: 42, borderRadius: 8, overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,255,255,0.08)' }}>
              <img src={offer.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
          {offer.price ? (
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#FF3366', lineHeight: 1 }}>
                {formatUGX(offer.price)}
              </div>
              {offer.negotiable && <div style={{ fontSize: 10, color: '#22C55E', marginTop: 2 }}>Open to negotiation</div>}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: '#A1A1AA' }}>Price not specified</div>
          )}
        </div>

        <button onClick={e => { e.stopPropagation(); onClick() }}
          style={{
            padding: '8px 16px', borderRadius: 20,
            background: 'linear-gradient(135deg, #FF3366, #FF6633)',
            border: 'none', color: 'white',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
            fontFamily: 'inherit', flexShrink: 0,
            boxShadow: '0 2px 12px rgba(255,51,102,0.35)',
          }}>
          View Offer
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>
    </div>
  )
}

const S = {
  iconBtn: {
    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
  },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 24px' },
}
