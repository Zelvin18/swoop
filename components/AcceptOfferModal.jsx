/**
 * AcceptOfferModal — Confirmation popup before accepting an offer
 * Stateless: parent owns the async call, passes loading/error as props.
 * Matches Step 5 of the Requests & Offers flow design image.
 */
import { formatUGX } from '../lib/feed'

const COLORS = ['#7C3AED','#FF3366','#F97316','#22C55E','#3B82F6','#EC4899','#F59E0B','#06B6D4']
function avatarColor(id='') { return COLORS[id.split('').reduce((a,c)=>a+c.charCodeAt(0),0)%COLORS.length] }
function initials(n='') { return n.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)||'?' }

export default function AcceptOfferModal({ offer, request, onConfirm, onCancel, loading, error }) {
  const seller = offer.seller || {}
  const sellerColor = avatarColor(seller.id || offer.seller_id || '')
  const sellerInit  = initials(seller.full_name || seller.username || 'S')

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{
        width: '100%', maxWidth: 360,
        background: '#111', borderRadius: 24,
        border: '1px solid rgba(255,255,255,0.1)',
        overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
      }}>

        {/* Green checkmark header */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '28px 24px 20px',
          background: 'linear-gradient(180deg, rgba(34,197,94,0.08) 0%, transparent 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(34,197,94,0.15)',
            border: '2px solid rgba(34,197,94,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 14,
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 6 }}>
            Accept this offer?
          </div>
          <div style={{ fontSize: 13, color: '#71717A', textAlign: 'center', lineHeight: 1.5 }}>
            You&apos;ll be taken to the reservation page to finalize the details.
          </div>
        </div>

        {/* Offer summary */}
        <div style={{
          margin: '16px', borderRadius: 14,
          background: '#141414', border: '1px solid rgba(255,255,255,0.07)',
          padding: '14px',
        }}>
          {/* Seller row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', background: sellerColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: 14, color: 'white', flexShrink: 0,
              overflow: 'hidden',
            }}>
              {seller.avatar_url
                ? <img src={seller.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span>{sellerInit}</span>
              }
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
                {seller.full_name || seller.username || 'Seller'}
              </div>
              <div style={{ fontSize: 11, color: '#71717A' }}>Offering for: {request.title}</div>
            </div>
            {seller.verified && (
              <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#3B82F6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'white', fontWeight: 900 }}>✓</span>
            )}
          </div>

          {/* Price */}
          {offer.price && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 12px',
              background: 'rgba(255,51,102,0.08)', borderRadius: 10,
              border: '1px solid rgba(255,51,102,0.2)',
            }}>
              <span style={{ fontSize: 12, color: '#A1A1AA', fontWeight: 600 }}>Offer price</span>
              <span style={{ fontSize: 17, fontWeight: 900, color: '#FF3366' }}>{formatUGX(offer.price)}</span>
            </div>
          )}

          {/* Negotiable note */}
          {offer.negotiable && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 11, color: '#22C55E' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Price is negotiable — you can discuss further in chat
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            margin: '0 16px 12px',
            background: 'rgba(255,51,102,0.1)', border: '1px solid rgba(255,51,102,0.3)',
            borderRadius: 10, padding: '10px 14px',
            fontSize: 13, color: '#FF3366',
          }}>
            {error}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              width: '100%', padding: 15,
              background: loading ? '#333' : 'linear-gradient(135deg, #FF3366, #FF6633)',
              border: 'none', borderRadius: 14, color: 'white',
              fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: loading ? 'none' : '0 4px 20px rgba(255,51,102,0.45)',
              opacity: loading ? 0.8 : 1,
            }}>
            {loading ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{animation:'spin 0.7s linear infinite'}}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
                Accepting...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                Accept &amp; Continue
              </>
            )}
          </button>

          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              width: '100%', padding: '12px',
              background: 'none', border: 'none', color: '#71717A',
              fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}>
            Cancel
          </button>
        </div>
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
