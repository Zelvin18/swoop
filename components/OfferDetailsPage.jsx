/**
 * OfferDetailsPage — Full offer detail view
 * Matches Step 4 of the Requests & Offers flow design image.
 */
import { useState } from 'react'
import { updateOfferStatus as _updateOfferStatus } from '../lib/requests'
import { formatUGX } from '../lib/feed'
import AcceptOfferModal from './AcceptOfferModal'

const COLORS = ['#7C3AED','#FF3366','#F97316','#22C55E','#3B82F6','#EC4899','#F59E0B','#06B6D4']
const CAT_EMOJI = { Phones:'📱',Electronics:'💻',Fashion:'👗',Sneakers:'👟',Home:'🏠',Beauty:'💄',Cars:'🚗',Furniture:'🛋️',Sports:'⚽',Other:'📦' }

function avatarColor(id='') { return COLORS[id.split('').reduce((a,c)=>a+c.charCodeAt(0),0)%COLORS.length] }
function initials(n='') { return n.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)||'?' }

export default function OfferDetailsPage({ offer, request, currentUser, onBack, onAccepted, onDeclined }) {
  const [imgIndex,        setImgIndex]        = useState(0)
  const [showAcceptModal, setShowAcceptModal] = useState(false)
  const [declining,       setDeclining]       = useState(false)
  const [acceptLoading,   setAcceptLoading]   = useState(false)
  const [acceptError,     setAcceptError]     = useState('')
  const [declineError,    setDeclineError]    = useState('')

  const seller = offer.seller || {}
  const sellerColor = avatarColor(seller.id || offer.seller_id || '')
  const sellerInit  = initials(seller.full_name || seller.username || 'S')
  const hasImages   = offer.images?.length > 0
  const memberYear  = seller.joined_at
    ? new Date(seller.joined_at).getFullYear()
    : null

  const handleDecline = async () => {
    setDeclining(true)
    setDeclineError('')
    try {
      await _updateOfferStatus(offer.id, 'rejected')
      setDeclining(false)
      onDeclined()
    } catch(e) {
      setDeclining(false)
      setDeclineError(e?.message || 'Failed to decline. Try again.')
    }
  }

  const handleAcceptConfirm = async () => {
    setAcceptLoading(true)
    setAcceptError('')
    try {
      await _updateOfferStatus(offer.id, 'accepted')
      setAcceptLoading(false)
      setShowAcceptModal(false)
      onAccepted(offer)
    } catch(e) {
      setAcceptLoading(false)
      setAcceptError(e?.message || 'Failed to accept. Try again.')
    }
  }

  // Detail rows — only render non-null/empty values
  const detailRows = [
    offer.price               ? { label: 'Price',          val: formatUGX(offer.price)           } : null,
    offer.negotiable != null  ? { label: 'Negotiable',     val: offer.negotiable ? 'Yes' : 'No'  } : null,
    offer.condition           ? { label: 'Condition',      val: offer.condition                  } : null,
    offer.storage             ? { label: 'Storage',        val: offer.storage                    } : null,
    offer.battery_health      ? { label: 'Battery Health', val: offer.battery_health             } : null,
    offer.includes            ? { label: 'Includes',       val: offer.includes                   } : null,
  ].filter(Boolean)

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
          <div style={{ fontSize: 17, fontWeight: 800 }}>Offer Details</div>
          <div style={{ fontSize: 12, color: '#71717A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {request.title}
          </div>
        </div>
        <button style={S.iconBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>

        {/* ── Image Gallery ── */}
        <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', background: '#141414', overflow: 'hidden' }}>
          {hasImages ? (
            <>
              {/* Image strip */}
              <div style={{ display: 'flex', width: '100%', height: '100%', overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}
                onScroll={e => setImgIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.offsetWidth))}>
                {offer.images.map((src, i) => (
                  <div key={i} style={{ width: '100%', height: '100%', flexShrink: 0, scrollSnapAlign: 'start', overflow: 'hidden' }}>
                    <img src={src} alt={`Offer image ${i+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>

              {/* Counter badge */}
              {offer.images.length > 1 && (
                <div style={{
                  position: 'absolute', top: 12, right: 12,
                  background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                  borderRadius: 20, padding: '4px 10px',
                  fontSize: 12, fontWeight: 700, color: 'white',
                }}>
                  {imgIndex+1}/{offer.images.length}
                </div>
              )}

              {/* Dot indicators */}
              {offer.images.length > 1 && (
                <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 5 }}>
                  {offer.images.map((_, i) => (
                    <div key={i} style={{
                      width: i === imgIndex ? 20 : 5, height: 4, borderRadius: 2,
                      background: i === imgIndex ? 'white' : 'rgba(255,255,255,0.4)',
                      transition: 'all 0.25s',
                    }} />
                  ))}
                </div>
              )}
            </>
          ) : (
            /* No images — category emoji placeholder */
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 80, opacity: 0.3 }}>{CAT_EMOJI[request.category] || '📦'}</span>
            </div>
          )}
        </div>

        {/* ── Price banner ── */}
        {offer.price && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#FF3366', lineHeight: 1 }}>
                {formatUGX(offer.price)}
              </div>
              {offer.negotiable && (
                <div style={{ fontSize: 11, color: '#22C55E', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Open to negotiation
                </div>
              )}
            </div>
            {offer.status && offer.status !== 'pending' && (
              <div style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                background: offer.status === 'accepted' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                color: offer.status === 'accepted' ? '#22C55E' : '#EF4444',
                border: `1px solid ${offer.status === 'accepted' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              }}>
                {offer.status === 'accepted' ? '✓ Accepted' : '✗ Declined'}
              </div>
            )}
          </div>
        )}

        {/* ── Seller profile row ── */}
        <div style={{
          margin: '12px 16px',
          background: '#141414', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16, padding: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Avatar */}
            <div style={{
              width: 54, height: 54, borderRadius: '50%', background: sellerColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: 18, color: 'white', flexShrink: 0,
              overflow: 'hidden', border: '2px solid rgba(255,255,255,0.1)',
              boxShadow: `0 0 0 4px ${sellerColor}33`,
            }}>
              {seller.avatar_url
                ? <img src={seller.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span>{sellerInit}</span>
              }
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 800 }}>
                  {seller.full_name || seller.username || 'Seller'}
                </span>
                {seller.verified && (
                  <span style={{ width: 15, height: 15, borderRadius: '50%', background: '#3B82F6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: 'white', fontWeight: 900 }}>✓</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: '#71717A', marginTop: 3, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {memberYear && <span>Member since {memberYear}</span>}
                {seller.location && <span>· {seller.location}</span>}
              </div>
              {/* Star rating */}
              {(seller.avg_rating > 0 || seller.review_count > 0) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  {[1,2,3,4,5].map(i => (
                    <svg key={i} width="11" height="11" viewBox="0 0 24 24"
                      fill={i <= Math.round(seller.avg_rating || 0) ? '#F59E0B' : 'none'}
                      stroke="#F59E0B" strokeWidth="1.5">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  ))}
                  <span style={{ fontSize: 11, color: '#A1A1AA' }}>
                    {seller.avg_rating?.toFixed(1)} ({seller.review_count || 0} reviews)
                  </span>
                </div>
              )}
              {seller.response_rate > 0 && (
                <div style={{ fontSize: 10, color: '#52525B', marginTop: 2 }}>
                  {seller.response_rate}% response rate
                </div>
              )}
            </div>
          </div>

          {/* Follow + Message buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button style={{
              flex: 1, padding: '9px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              background: 'rgba(255,51,102,0.1)', border: '1.5px solid #FF3366',
              color: '#FF3366', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
              Follow
            </button>
            <button style={{
              flex: 1, padding: '9px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              background: '#141414', border: '1px solid rgba(255,255,255,0.1)',
              color: '#D4D4D8', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              Message
            </button>
          </div>
        </div>

        {/* ── Offer Description ── */}
        {offer.message && (
          <div style={{
            margin: '0 16px 12px',
            background: '#141414', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16, padding: 14,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#A1A1AA', marginBottom: 8, letterSpacing: 0.3 }}>
              OFFER DESCRIPTION
            </div>
            <div style={{ fontSize: 14, color: '#E4E4E7', lineHeight: 1.65 }}>
              {offer.message}
            </div>
          </div>
        )}

        {/* ── Offer Details ── */}
        {detailRows.length > 0 && (
          <div style={{
            margin: '0 16px 12px',
            background: '#141414', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16, padding: 14,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#A1A1AA', marginBottom: 10, letterSpacing: 0.3 }}>
              OFFER DETAILS
            </div>
            {detailRows.map((row, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '9px 0',
                borderBottom: i < detailRows.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}>
                <span style={{ fontSize: 13, color: '#71717A', fontWeight: 500 }}>{row.label}</span>
                <span style={{
                  fontSize: 13, fontWeight: 700,
                  color: row.label === 'Price' ? '#FF3366' : row.label === 'Negotiable' && row.val === 'Yes' ? '#22C55E' : '#fff',
                }}>
                  {row.val}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Decline error */}
        {declineError && (
          <div style={{ margin: '0 16px 8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#EF4444' }}>
            {declineError}
          </div>
        )}

        <div style={{ height: 'calc(env(safe-area-inset-bottom, 0px) + 160px)' }} />
      </div>

      {/* ── Fixed action footer ── */}
      {offer.status === 'pending' && (
        <div style={{
          flexShrink: 0, padding: '12px 16px',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          background: '#000', backdropFilter: 'blur(16px)',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {/* Accept button */}
          <button
            onClick={() => setShowAcceptModal(true)}
            style={{
              width: '100%', padding: 15,
              background: 'linear-gradient(135deg, #FF3366, #FF6633)',
              border: 'none', borderRadius: 14, color: 'white',
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 20px rgba(255,51,102,0.45)',
            }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            Accept Offer
          </button>

          {/* Decline button */}
          <button
            onClick={handleDecline}
            disabled={declining}
            style={{
              width: '100%', padding: 13,
              background: 'transparent', border: '1.5px solid rgba(255,255,255,0.15)',
              borderRadius: 14, color: '#A1A1AA', fontSize: 14, fontWeight: 600,
              cursor: declining ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: declining ? 0.6 : 1,
            }}>
            {declining ? (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{animation:'spin 0.7s linear infinite'}}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Declining...</>
            ) : (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Decline Offer</>
            )}
          </button>
        </div>
      )}

      {/* ── Accept confirmation modal ── */}
      {showAcceptModal && (
        <AcceptOfferModal
          offer={offer}
          request={request}
          loading={acceptLoading}
          error={acceptError}
          onConfirm={handleAcceptConfirm}
          onCancel={() => { setShowAcceptModal(false); setAcceptError('') }}
        />
      )}

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
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
}
