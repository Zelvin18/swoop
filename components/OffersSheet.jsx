import { useState, useEffect } from 'react'
import { fetchOffers, makeOffer, updateOfferStatus } from '../lib/requests'
import { supabase } from '../lib/supabase'

function avatarColor(id = '') {
  const C = ['#7C3AED','#FF3366','#F97316','#22C55E','#3B82F6','#EC4899','#F59E0B','#06B6D4']
  return C[id.split('').reduce((a,c)=>a+c.charCodeAt(0),0) % C.length]
}
function initials(name='') { return name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)||'?' }
function timeAgo(d) {
  const m = Math.floor((Date.now()-new Date(d))/60000)
  if(m<1) return 'now'
  if(m<60) return `${m}m ago`
  const h = Math.floor(m/60)
  if(h<24) return `${h}h ago`
  return `${Math.floor(h/24)}d ago`
}

export default function OffersSheet({ request, currentUser, onClose, onAccepted }) {
  const [offers,      setOffers]      = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showMakeOffer, setShowMakeOffer] = useState(false)
  const [updating,    setUpdating]    = useState(null)

  const isBuyer  = currentUser?.id === request.buyer_id
  const isSeller = !isBuyer

  useEffect(() => {
    fetchOffers(request.id).then(d => { setOffers(d); setLoading(false) })

    // Realtime new offers
    const channel = supabase
      .channel(`offers-${request.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'offers', filter: `request_id=eq.${request.id}` },
        async payload => {
          const { data: seller } = await supabase.from('profiles')
            .select('id, full_name, username, avatar_url, verified, location, rating').eq('id', payload.new.seller_id).single()
          setOffers(prev => [{ ...payload.new, seller }, ...prev])
        })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [request.id])

  const handleAccept = async (offer) => {
    setUpdating(offer.id)
    await updateOfferStatus(offer.id, 'accepted')
    setOffers(prev => prev.map(o => ({ ...o, status: o.id === offer.id ? 'accepted' : o.status })))
    setUpdating(null)
    onAccepted?.(offer)
  }
  const handleReject = async (offer) => {
    setUpdating(offer.id)
    await updateOfferStatus(offer.id, 'rejected')
    setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, status: 'rejected' } : o))
    setUpdating(null)
  }

  return (
    <>
      <div onClick={onClose} style={S.backdrop} />
      <div style={S.sheet}>
        <div style={S.handle} />
        <div style={S.header}>
          <div>
            <div style={S.headerTitle}>
              {isBuyer ? `Offers (${offers.length})` : 'Make an Offer'}
            </div>
            <div style={S.headerSub} title={request.title}>
              {request.title.length > 36 ? request.title.slice(0, 36) + '…' : request.title}
            </div>
          </div>
          <button onClick={onClose} style={S.closeBtn}>
            <i className="fas fa-times" style={{ fontSize: 15 }} />
          </button>
        </div>

        <div style={S.body}>
          {/* ── Seller: make offer form ── */}
          {isSeller && !showMakeOffer && (
            <div style={{ padding: '16px 16px 0' }}>
              {/* Request summary */}
              <div style={S.requestSummary}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{request.title}</div>
                {request.description && <div style={{ fontSize: 12, color: '#A1A1AA', marginBottom: 6, lineHeight: 1.4 }}>{request.description}</div>}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(request.budget_min || request.budget_max) && (
                    <span style={S.tag}>
                      💰 {request.budget_max ? `Up to UGX ${Number(request.budget_max).toLocaleString()}` : 'Flexible'}
                    </span>
                  )}
                  {request.category && <span style={S.tag}>{request.category}</span>}
                  {request.condition_pref && <span style={S.tag}>{request.condition_pref}</span>}
                  {request.location && (
                    <span style={S.tag}>
                      <i className="fas fa-location-dot" style={{ fontSize: 9 }} /> {request.location}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setShowMakeOffer(true)} style={S.makeOfferBtn}>
                <i className="fas fa-handshake" style={{ fontSize: 14 }} /> Make an Offer
              </button>
            </div>
          )}

          {isSeller && showMakeOffer && (
            <MakeOfferForm
              request={request}
              currentUser={currentUser}
              onCancel={() => setShowMakeOffer(false)}
              onSubmitted={offer => {
                setOffers(prev => [offer, ...prev])
                setShowMakeOffer(false)
              }}
            />
          )}

          {/* ── Buyer: list of offers ── */}
          {isBuyer && (
            <>
              {loading && (
                <div style={S.center}>
                  <i className="fas fa-spinner fa-spin" style={{ fontSize: 22, color: '#FF3366' }} />
                </div>
              )}
              {!loading && offers.length === 0 && (
                <div style={S.emptyState}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#A1A1AA', marginBottom: 4 }}>No offers yet</div>
                  <div style={{ fontSize: 13, color: '#52525B', textAlign: 'center' }}>
                    Sellers will appear here once they make an offer on your request
                  </div>
                </div>
              )}
              {!loading && offers.map(o => (
                <OfferRow
                  key={o.id}
                  offer={o}
                  isBuyer={isBuyer}
                  updating={updating === o.id}
                  onAccept={() => handleAccept(o)}
                  onReject={() => handleReject(o)}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </>
  )
}

function OfferRow({ offer, isBuyer, updating, onAccept, onReject }) {
  const seller = offer.seller || {}
  const color  = avatarColor(seller.id || '')
  const init   = initials(seller.full_name || seller.username || 'S')
  const statusColor = { accepted: '#22C55E', rejected: '#EF4444', pending: '#F59E0B' }
  const statusLabel = { accepted: '✓ Accepted', rejected: '✗ Rejected', pending: 'Pending' }

  return (
    <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      {/* Seller info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: 'white', flexShrink: 0, border: '2px solid #141414', overflow: 'hidden' }}>
          {seller.avatar_url ? (
            <img src={seller.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span>{init}</span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
            {seller.full_name || seller.username || 'Seller'}
            {seller.verified && <span style={{ width: 13, height: 13, borderRadius: '50%', background: '#3B82F6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, color: 'white', fontWeight: 900 }}>✓</span>}
            {seller.rating > 0 && (
              <span style={{ fontSize: 11, color: '#F59E0B', display: 'flex', alignItems: 'center', gap: 2 }}>
                <i className="fas fa-star" style={{ fontSize: 9 }} />{seller.rating}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: '#71717A' }}>{seller.location} · {timeAgo(offer.created_at)}</div>
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: statusColor[offer.status] || '#F59E0B', background: `${statusColor[offer.status] || '#F59E0B'}15`, padding: '3px 8px', borderRadius: 20, border: `1px solid ${statusColor[offer.status] || '#F59E0B'}30` }}>
          {statusLabel[offer.status] || 'Pending'}
        </div>
      </div>

      {/* Offer message */}
      <div style={{ fontSize: 13, color: '#E4E4E7', lineHeight: 1.5, background: '#141414', borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
        {offer.message}
      </div>

      {/* Price */}
      {offer.price && (
        <div style={{ fontSize: 15, fontWeight: 800, color: '#FF3366', marginBottom: 10 }}>
          UGX {Number(offer.price).toLocaleString()}
        </div>
      )}

      {/* Actions — only for buyer, only on pending offers */}
      {isBuyer && offer.status === 'pending' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onAccept}
            disabled={updating}
            style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'linear-gradient(135deg,#22C55E,#16A34A)', border: 'none', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: updating ? 0.6 : 1 }}
          >
            {updating ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-check" />}
            Accept Offer
          </button>
          <button
            onClick={onReject}
            disabled={updating}
            style={{ flex: 1, padding: '10px', borderRadius: 10, background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.1)', color: '#A1A1AA', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: updating ? 0.6 : 1 }}
          >
            <i className="fas fa-times" /> Decline
          </button>
        </div>
      )}
    </div>
  )
}

function MakeOfferForm({ request, currentUser, onCancel, onSubmitted }) {
  const [message, setMessage] = useState('')
  const [price,   setPrice]   = useState('')
  const [sending, setSending] = useState(false)

  const handleSubmit = async () => {
    if (!message.trim()) return
    setSending(true)
    const offer = await makeOffer({ requestId: request.id, sellerId: currentUser.id, message: message.trim(), price })
    setSending(false)
    if (offer) {
      const { data: seller } = await supabase.from('profiles').select('id, full_name, username, avatar_url, verified, location, rating').eq('id', currentUser.id).single()
      onSubmitted({ ...offer, seller })
    }
  }

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Your Offer</div>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#71717A', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Cancel</button>
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, color: '#A1A1AA', marginBottom: 6 }}>Your message <span style={{ color: '#FF3366' }}>*</span></div>
      <textarea
        placeholder={`Tell the buyer what you have for "${request.title}"...`}
        value={message}
        onChange={e => setMessage(e.target.value)}
        rows={4}
        maxLength={500}
        style={{ width: '100%', padding: '12px 14px', background: '#141414', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#fff', fontSize: 14, outline: 'none', fontFamily: 'inherit', resize: 'none', lineHeight: 1.5, boxSizing: 'border-box', marginBottom: 12 }}
      />

      <div style={{ fontSize: 12, fontWeight: 700, color: '#A1A1AA', marginBottom: 6 }}>Your price <span style={{ color: '#71717A', fontWeight: 400 }}>(optional)</span></div>
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 700, color: '#52525B' }}>UGX</span>
        <input type="number" placeholder="0" value={price} onChange={e => setPrice(e.target.value)} style={{ width: '100%', padding: '12px 14px 12px 48px', background: '#141414', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 700, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!message.trim() || sending}
        style={{ width: '100%', padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg,#D946EF,#FF3366,#FB923C)', border: 'none', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: !message.trim() || sending ? 0.5 : 1, boxShadow: '0 4px 20px rgba(255,51,102,0.35)' }}
      >
        {sending ? <><i className="fas fa-spinner fa-spin" /> Sending...</> : <><i className="fas fa-handshake" /> Send Offer</>}
      </button>
    </div>
  )
}

const S = {
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 350, backdropFilter: 'blur(3px)' },
  sheet: { position: 'fixed', bottom: 0, left: 0, right: 0, maxWidth: 430, margin: '0 auto', background: '#0d0d0d', borderRadius: '22px 22px 0 0', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none', zIndex: 351, display: 'flex', flexDirection: 'column', maxHeight: 'calc(100dvh - 100px)', fontFamily: "'Inter',sans-serif", color: '#fff' },
  handle: { width: 40, height: 4, borderRadius: 20, background: 'rgba(255,255,255,0.15)', margin: '10px auto 0', flexShrink: 0 },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '14px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 },
  headerTitle: { fontSize: 17, fontWeight: 800, marginBottom: 2 },
  headerSub:   { fontSize: 12, color: '#71717A' },
  closeBtn: { width: 28, height: 28, borderRadius: '50%', background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#A1A1AA', flexShrink: 0 },
  body: { flex: 1, overflowY: 'auto', scrollbarWidth: 'none', paddingBottom: 'calc(var(--nav-h, 50px) + env(safe-area-inset-bottom, 0px) + 16px)' },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' },
  requestSummary: { background: '#141414', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px', marginBottom: 14 },
  tag: { display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.06)', color: '#A1A1AA', padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 },
  makeOfferBtn: { width: '100%', padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg,#D946EF,#FF3366,#FB923C)', border: 'none', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 20px rgba(255,51,102,0.35)', marginBottom: 16 },
}
