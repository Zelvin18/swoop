/**
 * ReservationPage — Reserve Item checkout flow
 * Matches the UI design: product card, location, payment options,
 * delivery, address, payment method, confirm button
 */
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatUGX } from '../lib/feed'

export default function ReservationPage({ post, seller, currentUser, onBack, onConfirmed }) {
  const [paymentOption, setPaymentOption] = useState('full')   // 'full' | 'half'
  const [deliveryType,  setDeliveryType]  = useState('delivery') // 'pickup' | 'delivery'
  const [payMethod,     setPayMethod]     = useState('momo')    // 'momo' | 'airtel' | 'card'
  const [address,       setAddress]       = useState('Home\nKampala, Uganda')
  const [notes,         setNotes]         = useState('')
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')

  const price      = Number(post?.price || 0)
  const halfPrice  = Math.ceil(price / 2)
  const deliveryFee= deliveryType === 'delivery' ? 5000 : 0
  const payNow     = paymentOption === 'full' ? price : halfPrice
  const total      = payNow + deliveryFee

  const sellerColor = '#FF3366'
  const sellerInit  = (seller?.full_name || seller?.username || 'S')[0].toUpperCase()

  const handleConfirm = async () => {
    if (!currentUser) { setError('Please sign in first'); return }
    setLoading(true)
    try {
      // Create order
      const { data: order, error: orderErr } = await supabase.from('orders').insert({
        post_id: post.id,
        buyer_id: currentUser.id,
        seller_id: post.seller_id,
        quantity: 1,
        amount: price,
        status: 'confirmed',
        delivery_type: deliveryType,
        delivery_address: deliveryType === 'delivery' ? address : null,
        notes,
      }).select().single()
      if (orderErr) throw orderErr

      // Create/update conversation with reservation message
      const { data: conv } = await supabase.from('conversations')
        .upsert({
          post_id: post.id,
          buyer_id: currentUser.id,
          seller_id: post.seller_id,
          last_message: `🛍️ Reservation confirmed for ${post.title}`,
          last_at: new Date().toISOString(),
        }, { onConflict: 'post_id,buyer_id,seller_id' })
        .select().single()

      if (conv?.id) {
        // Send reservation system message
        await supabase.from('messages').insert({
          conversation_id: conv.id,
          sender_id: currentUser.id,
          content: `🛍️ Reservation confirmed! I've reserved ${post.title} for UGX ${price.toLocaleString()}. ${deliveryType === 'delivery' ? 'Requesting delivery.' : 'I will pick it up.'}`,
        })
      }

      setLoading(false)
      onConfirmed?.(order)
    } catch (err) {
      setError(err.message || 'Failed to confirm reservation. Try again.')
      setLoading(false)
    }
  }

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <button onClick={onBack} style={S.backBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <div>
          <div style={{ fontSize:17, fontWeight:800 }}>Reserve Item</div>
          <div style={{ fontSize:11, color:'#71717A' }}>Review and complete your reservation</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, color:'#22C55E', background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.2)', borderRadius:20, padding:'4px 10px' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Secure
        </div>
      </div>

      {/* Scrollable body */}
      <div style={S.body}>

        {/* ── Product card ── */}
        <Section>
          <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
            <div style={{ width:72, height:72, borderRadius:12, background:post?.bg_color||'#141414', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, flexShrink:0, overflow:'hidden', border:'1px solid rgba(255,255,255,0.08)' }}>
              {post?.images?.[0] ? <img src={post.images[0]} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <span>{post?.emoji||'📦'}</span>}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontWeight:700, marginBottom:3 }}>{post?.title}</div>
              {post?.description && <div style={{ fontSize:12, color:'#A1A1AA', marginBottom:5 }}>{post.description.slice(0,60)}{post.description.length>60?'...':''}</div>}
              <div style={{ fontSize:18, fontWeight:900, color:'#FF3366' }}>{formatUGX(price)}</div>
            </div>
          </div>
          {/* Seller */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:12, paddingTop:12, borderTop:'1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ width:28, height:28, borderRadius:'50%', background:sellerColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, color:'white' }}>{sellerInit}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:12, fontWeight:600 }}>Sold by {seller?.full_name || seller?.username || 'Seller'}</div>
              {seller?.verified && <div style={{ fontSize:10, color:'#3B82F6' }}>✓ Verified seller</div>}
            </div>
            <button onClick={()=>{}} style={{ width:30, height:30, borderRadius:'50%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            </button>
          </div>
        </Section>

        {/* ── Payment amount ── */}
        <Section title="Amount to Pay">
          <div style={{ fontSize:12, color:'#71717A', marginBottom:10 }}>
            Item price · Payment option set by seller
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <PayOption value="full" selected={paymentOption==='full'} onSelect={()=>setPaymentOption('full')}
              label="Full amount" sub="Pay full amount now" amount={formatUGX(price)}/>
            <PayOption value="half" selected={paymentOption==='half'} onSelect={()=>setPaymentOption('half')}
              label="50% now, 50% on delivery" sub="Pay half now, remaining on delivery" amount={formatUGX(halfPrice)}/>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:12, paddingTop:12, borderTop:'1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize:13, color:'#A1A1AA' }}>You pay now</span>
            <span style={{ fontSize:16, fontWeight:800, color:'#FF3366' }}>{formatUGX(payNow)}</span>
          </div>
        </Section>

        {/* ── Delivery ── */}
        <Section title="Delivery">
          <div style={{ display:'flex', gap:10 }}>
            <DeliveryOption value="pickup" selected={deliveryType==='pickup'} onSelect={()=>setDeliveryType('pickup')} label="Pickup" sub="I'll pick it up"/>
            <DeliveryOption value="delivery" selected={deliveryType==='delivery'} onSelect={()=>setDeliveryType('delivery')} label="Request delivery" sub="Get it delivered to you" accent/>
          </div>
          {deliveryType==='delivery' && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:10, fontSize:12, color:'#A1A1AA' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 4v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                Delivery fee
              </div>
              <span style={{ color:'white', fontWeight:600 }}>UGX {deliveryFee.toLocaleString()} &rsaquo;</span>
            </div>
          )}
        </Section>

        {/* ── Delivery address (if delivery) ── */}
        {deliveryType==='delivery' && (
          <Section title="Delivery Address">
            <div style={{ background:'rgba(255,51,102,0.06)', border:'1px solid rgba(255,51,102,0.2)', borderRadius:12, padding:'12px 14px', display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
              <div style={{ display:'flex', gap:8 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:'#FF3366', marginTop:4, flexShrink:0 }}/>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:'white', marginBottom:1 }}>Home <span style={{ fontSize:10, background:'rgba(255,51,102,0.2)', color:'#FF3366', padding:'1px 6px', borderRadius:20, fontWeight:600 }}>Default</span></div>
                  <textarea value={address} onChange={e=>setAddress(e.target.value)} rows={2} style={{ background:'none', border:'none', outline:'none', color:'#A1A1AA', fontSize:12, fontFamily:'inherit', resize:'none', width:'100%', lineHeight:1.5 }}/>
                </div>
              </div>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
            </div>
            <button style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', color:'#FF3366', fontSize:12, fontWeight:600, cursor:'pointer', marginTop:8, fontFamily:'inherit' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add new address
            </button>
          </Section>
        )}

        {/* ── Payment method ── */}
        <Section title="Payment Method">
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <PMOption value="momo" selected={payMethod==='momo'} onSelect={()=>setPayMethod('momo')} label="M-Pesa" sub="0712 345 678" color="#22C55E" icon="📱"/>
            <PMOption value="airtel" selected={payMethod==='airtel'} onSelect={()=>setPayMethod('airtel')} label="Airtel Money" sub="0712 345 678" color="#EF4444" icon="💳"/>
            <PMOption value="card" selected={payMethod==='card'} onSelect={()=>setPayMethod('card')} label="Card" sub="**** 4242" color="#3B82F6" icon="💳"/>
          </div>
        </Section>

        {/* ── Notes ── */}
        <Section>
          <div style={{ fontSize:12, fontWeight:700, color:'#A1A1AA', marginBottom:8 }}>Notes for seller <span style={{fontWeight:400,color:'#52525B'}}>(optional)</span></div>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Any special instructions..." rows={2} style={{ width:'100%', padding:'11px 13px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, color:'white', fontSize:13, outline:'none', fontFamily:'inherit', resize:'none', lineHeight:1.5, boxSizing:'border-box' }}/>
        </Section>

        {/* ── Total ── */}
        <div style={{ margin:'0 16px 8px', padding:'14px', background:'#141414', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
            <span style={{ fontSize:13, color:'#71717A' }}>Item price</span>
            <span style={{ fontSize:13, color:'white' }}>{formatUGX(payNow)}</span>
          </div>
          {deliveryFee > 0 && (
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontSize:13, color:'#71717A' }}>Delivery fee</span>
              <span style={{ fontSize:13, color:'white' }}>{formatUGX(deliveryFee)}</span>
            </div>
          )}
          <div style={{ display:'flex', justifyContent:'space-between', paddingTop:8, borderTop:'1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'white' }}>Total Payable Now</div>
              <div style={{ fontSize:10, color:'#52525B' }}>Including delivery</div>
            </div>
            <div style={{ fontSize:20, fontWeight:900, color:'#FF3366' }}>{formatUGX(total)}</div>
          </div>
        </div>

        {/* Security note */}
        <div style={{ margin:'0 16px 12px', display:'flex', alignItems:'center', gap:8, fontSize:11, color:'#71717A', lineHeight:1.5 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" flexShrink="0"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Your payment is held securely until you confirm you&apos;ve received your item.
          <span style={{ color:'#FF3366', cursor:'pointer' }}>Learn more</span>
        </div>

        {error && <div style={{ margin:'0 16px 8px', background:'rgba(255,51,102,0.1)', border:'1px solid rgba(255,51,102,0.3)', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#FF3366' }}>{error}</div>}

        <div style={{ height:8 }}/>
      </div>

      {/* ── Confirm button ── */}
      <div style={{ padding:'12px 16px', paddingBottom:'calc(env(safe-area-inset-bottom,0px) + 12px)', borderTop:'1px solid rgba(255,255,255,0.07)', background:'rgba(0,0,0,0.95)', backdropFilter:'blur(16px)', flexShrink:0 }}>
        <button onClick={handleConfirm} disabled={loading} style={{ width:'100%', padding:'15px', background:loading?'#333':'linear-gradient(135deg,#FF3366,#FF6633)', border:'none', borderRadius:14, color:'white', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:loading?'none':'0 4px 20px rgba(255,51,102,0.45)' }}>
          {loading ? (
            <><div style={{width:18,height:18,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/> Processing...</>
          ) : (
            <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> Confirm Reservation &amp; Pay</>
          )}
        </button>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{ margin:'0 16px 12px', background:'#141414', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:'14px' }}>
      {title && <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>{title}</div>}
      {children}
    </div>
  )
}
function PayOption({ value, selected, onSelect, label, sub, amount }) {
  return (
    <button onClick={onSelect} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 12px', borderRadius:10, background:selected?'rgba(255,51,102,0.08)':'transparent', border:`1.5px solid ${selected?'#FF3366':'rgba(255,255,255,0.08)'}`, cursor:'pointer', fontFamily:'inherit', width:'100%', textAlign:'left', transition:'all 0.15s' }}>
      <div style={{ width:18, height:18, borderRadius:'50%', border:`2px solid ${selected?'#FF3366':'rgba(255,255,255,0.2)'}`, background:selected?'#FF3366':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        {selected && <div style={{ width:6, height:6, borderRadius:'50%', background:'white' }}/>}
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:600, color:'white' }}>{label}</div>
        <div style={{ fontSize:11, color:'#71717A' }}>{sub}</div>
      </div>
      <span style={{ fontSize:13, fontWeight:700, color:'#FF3366' }}>{amount}</span>
    </button>
  )
}
function DeliveryOption({ value, selected, onSelect, label, sub, accent }) {
  return (
    <button onClick={onSelect} style={{ flex:1, padding:'11px', borderRadius:10, background:selected?(accent?'rgba(255,51,102,0.08)':'rgba(255,255,255,0.04)'):'transparent', border:`1.5px solid ${selected?(accent?'#FF3366':'rgba(255,255,255,0.15)'):'rgba(255,255,255,0.08)'}`, cursor:'pointer', fontFamily:'inherit', textAlign:'left', display:'flex', alignItems:'flex-start', gap:8, transition:'all 0.15s' }}>
      <div style={{ width:16, height:16, borderRadius:'50%', border:`2px solid ${selected?(accent?'#FF3366':'white'):'rgba(255,255,255,0.2)'}`, background:selected&&accent?'#FF3366':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>
        {selected && <div style={{ width:5, height:5, borderRadius:'50%', background:'white' }}/>}
      </div>
      <div>
        <div style={{ fontSize:12, fontWeight:700, color:'white' }}>{label}</div>
        <div style={{ fontSize:10, color:'#71717A', marginTop:1 }}>{sub}</div>
      </div>
    </button>
  )
}
function PMOption({ value, selected, onSelect, label, sub, color, icon }) {
  return (
    <button onClick={onSelect} style={{ flex:'1 1 calc(33% - 6px)', minWidth:90, padding:'10px 10px', borderRadius:10, background:selected?`${color}12`:'transparent', border:`1.5px solid ${selected?color:'rgba(255,255,255,0.08)'}`, cursor:'pointer', fontFamily:'inherit', textAlign:'left', display:'flex', flexDirection:'column', gap:4, transition:'all 0.15s' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:16 }}>{icon}</span>
        <div style={{ width:14, height:14, borderRadius:'50%', border:`2px solid ${selected?color:'rgba(255,255,255,0.2)'}`, background:selected?color:'transparent', display:'flex', alignItems:'center', justifyContent:'center' }}>
          {selected && <div style={{ width:5, height:5, borderRadius:'50%', background:'white' }}/>}
        </div>
      </div>
      <div style={{ fontSize:11, fontWeight:700, color:'white' }}>{label}</div>
      <div style={{ fontSize:10, color:'#52525B' }}>{sub}</div>
    </button>
  )
}
const S = {
  page:    { position:'fixed', inset:0, zIndex:9999, background:'#000', display:'flex', flexDirection:'column', fontFamily:"'Inter',sans-serif", color:'#fff' },
  header:  { display:'flex', alignItems:'center', gap:12, padding:'12px 16px', paddingTop:'calc(env(safe-area-inset-top,0px) + 12px)', borderBottom:'1px solid rgba(255,255,255,0.07)', background:'rgba(0,0,0,0.95)', backdropFilter:'blur(16px)', flexShrink:0 },
  backBtn: { width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 },
  body:    { flex:1, overflowY:'auto', scrollbarWidth:'none', paddingTop:8 },
}
