import { useState, useRef } from 'react'
import { makeOffer } from '../lib/requests'
import OverlayPortal from './OverlayPortal'

const CAT_EMOJI = {
  Phones: '📱', Electronics: '💻', Fashion: '👗', Sneakers: '👟',
  Home: '🏠', Beauty: '💄', Cars: '🚗', Furniture: '🛋️', Sports: '⚽', Other: '📦',
}

export default function SendOfferPage({ request, currentUser, onClose, onSubmitted }) {
  const [price,       setPrice]       = useState('')
  const [description, setDescription] = useState('')
  const [negotiable,  setNegotiable]  = useState(true)
  const [images,      setImages]      = useState([])
  const [sending,     setSending]     = useState(false)
  const [error,       setError]       = useState('')
  const fileInputRef = useRef(null)

  /* ── Image handlers ─────────────────────────────────────────────────────── */
  const handleImageAdd = (e) => {
    const files = Array.from(e.target.files || [])
    files.forEach(file => {
      if (images.length >= 5) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        setImages(prev => prev.length < 5 ? [...prev, ev.target.result] : prev)
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const removeImage = (idx) => setImages(prev => prev.filter((_, i) => i !== idx))

  /* ── Submit ─────────────────────────────────────────────────────────────── */
  const handleSubmit = async () => {
    if (!description.trim()) { setError('Please add a description'); return }
    setSending(true)
    setError('')
    const result = await makeOffer({
      requestId:  request.id,
      sellerId:   currentUser.id,
      message:    description.trim(),
      price:      price ? Number(price) : null,
      negotiable,
      images,
    })
    setSending(false)
    if (result?.data) {
      onSubmitted(result.data)
    } else {
      setError(result?.error?.message || 'Failed to send offer. Please try again.')
    }
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <OverlayPortal>
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#000', display: 'flex', flexDirection: 'column',
      fontFamily: "'Inter', sans-serif", color: '#fff',
    }}>

      {/* ── Header ── */}
      <div style={{
        flexShrink: 0,
        padding: '12px 16px',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(0,0,0,0.95)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <button
          onClick={onClose}
          aria-label="Go back"
          style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#fff',
          }}
        >
          <i className="fas fa-arrow-left" style={{ fontSize: 15 }} />
        </button>
        <span style={{ fontSize: 17, fontWeight: 700 }}>Send Offer</span>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{
        flex: 1, overflowY: 'auto', scrollbarWidth: 'none', padding: 16,
        paddingBottom: 100,
      }}>

        {/* ── Request summary card ── */}
        <div style={{ background:'#141414', borderRadius:16, overflow:'hidden', marginBottom:16, border:'1px solid rgba(255,255,255,0.07)' }}>
          {/* Label */}
          <div style={{ padding:'10px 14px 0', fontSize:11, fontWeight:600, color:'#71717A', letterSpacing:0.5, textTransform:'uppercase' }}>
            You are offering for
          </div>

          {/* Image banner — large if available */}
          {request.images?.[0] && (
            <div style={{ width:'100%', height:140, overflow:'hidden', marginTop:10 }}>
              <img src={request.images[0]} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            </div>
          )}

          {/* Details row */}
          <div style={{ padding:'12px 14px', display:'flex', alignItems:'flex-start', gap:12 }}>
            {/* Category emoji badge when no image */}
            {!request.images?.[0] && (
              <div style={{
                width:56, height:56, borderRadius:12, background:'#1e1e1e',
                border:'1px solid rgba(255,255,255,0.08)', flexShrink:0,
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:28,
              }}>
                {CAT_EMOJI[request.category] || '📦'}
              </div>
            )}
            <div style={{ flex:1, minWidth:0 }}>
              {/* Title */}
              <div style={{ fontSize:15, fontWeight:800, marginBottom:5, lineHeight:1.25 }}>
                {request.title}
              </div>
              {/* Meta: poster + time */}
              <div style={{ fontSize:11, color:'#71717A', marginBottom:8 }}>
                Posted by @{request.buyer?.username || 'buyer'}
                {request._timeAgo ? ` · ${request._timeAgo}` : ''}
              </div>
              {/* Budget + condition chips */}
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {(request.budget_min || request.budget_max) && (
                  <span style={{
                    display:'inline-flex', alignItems:'center', gap:4,
                    background:'rgba(34,197,94,0.12)', color:'#22C55E',
                    border:'1px solid rgba(34,197,94,0.25)',
                    padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:700,
                  }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                    Budget: {request.budget_max
                      ? `Up to UGX ${Number(request.budget_max).toLocaleString()}`
                      : request.budget_min
                        ? `From UGX ${Number(request.budget_min).toLocaleString()}`
                        : 'Flexible'}
                  </span>
                )}
                {!request.budget_min && !request.budget_max && (
                  <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:'rgba(255,255,255,0.06)', color:'#A1A1AA', border:'1px solid rgba(255,255,255,0.08)', padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:600 }}>
                    Budget: Flexible
                  </span>
                )}
                {request.category && (
                  <span style={{ background:'rgba(124,58,237,0.12)', color:'#A855F7', border:'1px solid rgba(124,58,237,0.2)', padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:600 }}>
                    {request.category}
                  </span>
                )}
                {request.condition_pref && request.condition_pref !== 'Any Condition' && (
                  <span style={{ background:'rgba(255,255,255,0.06)', color:'#A1A1AA', border:'1px solid rgba(255,255,255,0.08)', padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:600 }}>
                    {request.condition_pref}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Price field */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#A1A1AA', marginBottom: 8 }}>
            Price
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <div style={{
              padding: '12px 14px', marginRight: 8,
              background: '#1e1e1e',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              fontSize: 12, fontWeight: 700, color: '#A1A1AA',
              flexShrink: 0,
            }}>
              UGX
            </div>
            <input
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={price}
              onChange={e => setPrice(e.target.value)}
              style={{
                flex: 1, padding: '12px 14px',
                background: '#1e1e1e',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                fontSize: 18, fontWeight: 900, color: '#FF3366',
                outline: 'none', fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        {/* Description field */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#A1A1AA' }}>Description</span>
            <span style={{ fontSize: 11, color: '#52525B' }}>{description.length}/500</span>
          </div>
          <textarea
            rows={4}
            maxLength={500}
            placeholder="Describe your offer — condition, what's included, why they should choose you…"
            value={description}
            onChange={e => setDescription(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '12px 14px',
              background: '#141414',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              color: '#fff', fontSize: 14,
              resize: 'none', lineHeight: 1.5,
              outline: 'none', fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Negotiable toggle */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#A1A1AA', marginBottom: 8 }}>
            Negotiable?
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Yes */}
            <button
              onClick={() => setNegotiable(true)}
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 10,
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: negotiable ? 'rgba(255,51,102,0.12)' : '#1e1e1e',
                border: `1.5px solid ${negotiable ? '#FF3366' : 'rgba(255,255,255,0.08)'}`,
                color: negotiable ? '#FF3366' : '#71717A',
              }}
            >
              {negotiable && <i className="fas fa-check-circle" style={{ fontSize: 12 }} />}
              Yes, negotiable
            </button>
            {/* No */}
            <button
              onClick={() => setNegotiable(false)}
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 10,
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: !negotiable ? 'rgba(255,51,102,0.12)' : '#1e1e1e',
                border: `1.5px solid ${!negotiable ? '#FF3366' : 'rgba(255,255,255,0.08)'}`,
                color: !negotiable ? '#FF3366' : '#71717A',
              }}
            >
              {!negotiable && <i className="fas fa-check-circle" style={{ fontSize: 12 }} />}
              No, not negotiable
            </button>
          </div>
        </div>

        {/* Upload Photos */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#A1A1AA' }}>Upload Photos (Max. 5)</span>
            <span style={{ fontSize: 11, color: '#52525B' }}>{images.length}/5</span>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {/* Existing thumbnails */}
            {images.map((src, idx) => (
              <div
                key={idx}
                style={{
                  position: 'relative', width: 72, height: 72,
                  borderRadius: 10, overflow: 'hidden', flexShrink: 0,
                }}
              >
                <img
                  src={src}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <button
                  onClick={() => removeImage(idx)}
                  aria-label="Remove image"
                  style={{
                    position: 'absolute', top: 3, right: 3,
                    width: 18, height: 18, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.7)', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#fff', fontSize: 10,
                    padding: 0,
                  }}
                >
                  ×
                </button>
              </div>
            ))}

            {/* Add button */}
            {images.length < 5 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                aria-label="Add photo"
                style={{
                  width: 72, height: 72, borderRadius: 10, flexShrink: 0,
                  background: '#141414',
                  border: '2px dashed rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <i className="fas fa-plus" style={{ color: '#52525B', fontSize: 20 }} />
              </button>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageAdd}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{
        flexShrink: 0,
        padding: '12px 16px',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        background: '#000',
        backdropFilter: 'blur(16px)',
      }}>
        {/* Error box */}
        {error ? (
          <div style={{
            background: 'rgba(255,51,102,0.1)',
            border: '1px solid rgba(255,51,102,0.3)',
            borderRadius: 10, padding: '10px 14px',
            fontSize: 13, color: '#FF3366',
            marginBottom: 8,
          }}>
            {error}
          </div>
        ) : null}

        <button
          onClick={handleSubmit}
          disabled={sending}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #FF3366, #FF6633)',
            border: 'none', borderRadius: 14,
            padding: 15, fontSize: 15, fontWeight: 700, color: '#fff',
            cursor: sending ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 20px rgba(255,51,102,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: 'inherit',
            opacity: sending ? 0.8 : 1,
          }}
        >
          {sending ? (
            <>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: 14 }} />
              Sending...
            </>
          ) : (
            'Send Offer'
          )}
        </button>
      </div>
    </div>
    </OverlayPortal>
  )
}
