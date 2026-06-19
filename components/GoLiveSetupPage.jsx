import { useState } from 'react'

const CATEGORIES = ['Phones','Electronics','Fashion','Sneakers','Home','Beauty','Cars','Other']

const EMPTY_PRODUCT = {
  name: '', price: '', stock: '', delivery: true, instant_reserve: true,
}

export default function GoLiveSetupPage({ onClose, onStartSell, onStartSocial }) {
  const [mode, setMode]               = useState(null)        // null | 'sell' | 'social'
  const [title, setTitle]             = useState('')
  const [category, setCategory]       = useState('Fashion')
  const [delivery, setDelivery]       = useState(false)
  const [products, setProducts]       = useState([{ ...EMPTY_PRODUCT, id: 1 }])
  const [cameraFront, setCameraFront] = useState(true)

  const addProduct = () => {
    if (products.length >= 10) return
    setProducts(p => [...p, { ...EMPTY_PRODUCT, id: Date.now() }])
  }
  const updateProduct = (id, field, val) => {
    setProducts(p => p.map(x => x.id === id ? { ...x, [field]: val } : x))
  }
  const removeProduct = (id) => {
    setProducts(p => p.filter(x => x.id !== id))
  }

  // ── MODE SELECT ──
  if (!mode) {
    return (
      <div style={s.page}>
        {/* Header */}
        <div style={s.header}>
          <button onClick={onClose} style={s.closeBtn}>
            <i className="fas fa-times" style={{ fontSize: 18 }} />
          </button>
          <div style={s.headerTitle}>Go Live</div>
          <div style={{ width: 36 }} />
        </div>

        {/* Camera preview placeholder */}
        <div style={s.cameraPreview}>
          <div style={s.cameraPlaceholder}>
            <i className="fas fa-camera" style={{ fontSize: 48, color: 'rgba(255,255,255,0.15)' }} />
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 12 }}>Camera preview</div>
          </div>
          {/* Flip camera */}
          <button
            onClick={() => setCameraFront(f => !f)}
            style={s.flipBtn}
          >
            <i className="fas fa-camera-rotate" style={{ fontSize: 16 }} />
          </button>
          {/* Beauty filter btn */}
          <button style={{ ...s.flipBtn, bottom: 16, right: 16, top: 'auto' }}>
            <i className="fas fa-wand-magic-sparkles" style={{ fontSize: 15 }} />
          </button>
        </div>

        {/* Mode choice */}
        <div style={s.modeSection}>
          <div style={s.modeSectionTitle}>Choose your live type</div>
          <div style={s.modeRow}>

            {/* Sell Live */}
            <button onClick={() => setMode('sell')} style={s.modeCard}>
              <div style={{ ...s.modeIcon, background: 'linear-gradient(135deg,#D946EF,#FF3366,#FB923C)' }}>
                <i className="fas fa-bag-shopping" style={{ fontSize: 26, color: 'white' }} />
              </div>
              <div style={s.modeCardTitle}>Sell Live</div>
              <div style={s.modeCardSub}>Showcase products, take reservations &amp; sell in real time</div>
              <div style={s.modeCardChevron}>
                <i className="fas fa-chevron-right" style={{ fontSize: 12, color: '#FF3366' }} />
              </div>
            </button>

            {/* Social Live */}
            <button onClick={() => setMode('social')} style={s.modeCard}>
              <div style={{ ...s.modeIcon, background: 'linear-gradient(135deg,#7C3AED,#3B82F6)' }}>
                <i className="fas fa-users" style={{ fontSize: 26, color: 'white' }} />
              </div>
              <div style={s.modeCardTitle}>Social Live</div>
              <div style={s.modeCardSub}>Connect with your audience, share your story, grow your brand</div>
              <div style={s.modeCardChevron}>
                <i className="fas fa-chevron-right" style={{ fontSize: 12, color: '#7C3AED' }} />
              </div>
            </button>

          </div>
        </div>

        <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
      </div>
    )
  }

  // ── SOCIAL SETUP ──
  if (mode === 'social') {
    return (
      <div style={s.page}>
        <div style={s.header}>
          <button onClick={() => setMode(null)} style={s.closeBtn}>
            <i className="fas fa-arrow-left" style={{ fontSize: 17 }} />
          </button>
          <div style={s.headerTitle}>Social Live</div>
          <div style={{ width: 36 }} />
        </div>

        <div style={s.cameraPreview}>
          <div style={s.cameraPlaceholder}>
            <i className="fas fa-camera" style={{ fontSize: 48, color: 'rgba(255,255,255,0.15)' }} />
          </div>
          <button onClick={() => setCameraFront(f => !f)} style={s.flipBtn}>
            <i className="fas fa-camera-rotate" style={{ fontSize: 16 }} />
          </button>
        </div>

        <div style={{ padding: '20px 16px', flex: 1, overflowY: 'auto' }}>
          {/* Title */}
          <div style={s.fieldLabel}>Live title</div>
          <input
            placeholder="What's your live about? (e.g. Q&A with my community)"
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={s.input}
            maxLength={60}
          />
          <div style={s.charCount}>{title.length}/60</div>

          {/* Category */}
          <div style={s.fieldLabel}>Category</div>
          <div style={s.catGrid}>
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                style={{ ...s.catPill, ...(category === c ? s.catPillActive : {}) }}
              >{c}</button>
            ))}
          </div>

          {/* Tips */}
          <div style={s.tipBox}>
            <i className="fas fa-lightbulb" style={{ color: '#F59E0B', fontSize: 14 }} />
            <div style={{ fontSize: 12, color: '#A1A1AA', lineHeight: 1.5 }}>
              <strong style={{ color: '#fff' }}>Tips for a great live:</strong> Good lighting, stable camera, greet your audience early, interact with comments.
            </div>
          </div>
        </div>

        <div style={s.footer}>
          <button onClick={() => onStartSocial({ title, category })} style={s.goLiveBtnSocial}>
            <div style={s.liveDot} />
            Go Live
          </button>
        </div>
      </div>
    )
  }

  // ── SELL LIVE SETUP ──
  return (
    <div style={s.page}>
      <div style={s.header}>
        <button onClick={() => setMode(null)} style={s.closeBtn}>
          <i className="fas fa-arrow-left" style={{ fontSize: 17 }} />
        </button>
        <div style={s.headerTitle}>Sell Live Setup</div>
        <div style={{ width: 36 }} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }}>

        {/* Camera preview (small) */}
        <div style={{ ...s.cameraPreview, height: 180, borderRadius: 16, marginBottom: 20, flexShrink: 0 }}>
          <div style={s.cameraPlaceholder}>
            <i className="fas fa-camera" style={{ fontSize: 32, color: 'rgba(255,255,255,0.15)' }} />
          </div>
          <button onClick={() => setCameraFront(f => !f)} style={s.flipBtn}>
            <i className="fas fa-camera-rotate" style={{ fontSize: 15 }} />
          </button>
        </div>

        {/* Live title */}
        <div style={s.fieldLabel}>Live title <span style={{ color: '#FF3366' }}>*</span></div>
        <input
          placeholder="e.g. iPhone Deals LIVE 🔥 — Best prices today!"
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={s.input}
          maxLength={60}
        />
        <div style={s.charCount}>{title.length}/60</div>

        {/* Category */}
        <div style={s.fieldLabel}>Category</div>
        <div style={s.catGrid}>
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              style={{ ...s.catPill, ...(category === c ? s.catPillActive : {}) }}
            >{c}</button>
          ))}
        </div>

        {/* Delivery toggle */}
        <div style={s.toggleRow}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fas fa-truck" style={{ color: '#3B82F6', fontSize: 16 }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Offer Delivery</div>
              <div style={{ fontSize: 11, color: '#71717A' }}>Delivery badge will show on your live</div>
            </div>
          </div>
          <div onClick={() => setDelivery(d => !d)} style={{ ...s.toggle, background: delivery ? '#22C55E' : '#1e1e1e', border: `1px solid ${delivery ? '#22C55E' : 'rgba(255,255,255,0.1)'}` }}>
            <div style={{ ...s.toggleThumb, left: delivery ? 18 : 2 }} />
          </div>
        </div>

        {/* Products section */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>
            Products in this Live
            <span style={{ fontSize: 12, color: '#71717A', fontWeight: 400, marginLeft: 6 }}>({products.length}/10)</span>
          </div>
          {products.length < 10 && (
            <button onClick={addProduct} style={s.addProductBtn}>
              <i className="fas fa-plus" style={{ fontSize: 11 }} /> Add Product
            </button>
          )}
        </div>

        {products.map((prod, idx) => (
          <ProductRow
            key={prod.id}
            prod={prod}
            idx={idx}
            onUpdate={updateProduct}
            onRemove={removeProduct}
            canRemove={products.length > 1}
          />
        ))}

        {/* Info note */}
        <div style={s.tipBox}>
          <i className="fas fa-shield-halved" style={{ color: '#22C55E', fontSize: 14 }} />
          <div style={{ fontSize: 12, color: '#A1A1AA', lineHeight: 1.5 }}>
            Products with <strong style={{ color: '#fff' }}>Instant Reserve</strong> enabled will show a Reserve button to viewers during your live.
          </div>
        </div>

        <div style={{ height: 16 }} />
      </div>

      <div style={s.footer}>
        <button
          onClick={() => onStartSell({ title, category, delivery, products })}
          disabled={!title.trim()}
          style={{ ...s.goLiveBtnSell, opacity: title.trim() ? 1 : 0.5 }}
        >
          <div style={s.liveDot} />
          Start Sell Live
        </button>
      </div>
    </div>
  )
}

// Single product row inside the setup form
function ProductRow({ prod, idx, onUpdate, onRemove, canRemove }) {
  return (
    <div style={{
      background: '#141414', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14, padding: 14, marginBottom: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{
          width: 24, height: 24, borderRadius: '50%',
          background: 'linear-gradient(135deg,#D946EF,#FF3366)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800, color: 'white',
        }}>{idx + 1}</div>
        {canRemove && (
          <button onClick={() => onRemove(prod.id)} style={{ background: 'none', border: 'none', color: '#71717A', cursor: 'pointer', padding: 4 }}>
            <i className="fas fa-trash" style={{ fontSize: 13 }} />
          </button>
        )}
      </div>

      {/* Photo placeholder */}
      <div style={{
        width: '100%', height: 80, borderRadius: 10,
        background: '#1e1e1e', border: '1.5px dashed rgba(255,255,255,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 10, cursor: 'pointer', gap: 8,
      }}>
        <i className="fas fa-image" style={{ fontSize: 18, color: '#52525B' }} />
        <span style={{ fontSize: 12, color: '#52525B' }}>Tap to add photo</span>
      </div>

      {/* Name */}
      <input
        placeholder="Product name"
        value={prod.name}
        onChange={e => onUpdate(prod.id, 'name', e.target.value)}
        style={{ ...pStyle.input, marginBottom: 8 }}
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {/* Price */}
        <div style={{ flex: 1, position: 'relative' }}>
          <span style={pStyle.prefix}>UGX</span>
          <input
            type="number"
            placeholder="Price"
            value={prod.price}
            onChange={e => onUpdate(prod.id, 'price', e.target.value)}
            style={{ ...pStyle.input, paddingLeft: 46 }}
          />
        </div>
        {/* Stock */}
        <div style={{ width: 80 }}>
          <input
            type="number"
            placeholder="Stock"
            value={prod.stock}
            onChange={e => onUpdate(prod.id, 'stock', e.target.value)}
            style={{ ...pStyle.input, textAlign: 'center' }}
          />
        </div>
      </div>

      {/* Toggles */}
      <div style={{ display: 'flex', gap: 8 }}>
        <ToggleChip
          label="Instant Reserve"
          icon="fa-shield-halved"
          color="#22C55E"
          active={prod.instant_reserve}
          onToggle={() => onUpdate(prod.id, 'instant_reserve', !prod.instant_reserve)}
        />
        <ToggleChip
          label="Delivery"
          icon="fa-truck"
          color="#3B82F6"
          active={prod.delivery}
          onToggle={() => onUpdate(prod.id, 'delivery', !prod.delivery)}
        />
      </div>
    </div>
  )
}

function ToggleChip({ label, icon, color, active, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        padding: '7px 0', borderRadius: 8, cursor: 'pointer',
        background: active ? `${color}18` : '#1e1e1e',
        border: `1px solid ${active ? color : 'rgba(255,255,255,0.08)'}`,
        color: active ? color : '#71717A',
        fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
        transition: 'all 0.2s',
      }}
    >
      <i className={`fas ${icon}`} style={{ fontSize: 11 }} />
      {label}
    </button>
  )
}

const pStyle = {
  input: {
    width: '100%', padding: '10px 12px',
    background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10, color: 'white', fontSize: 13,
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  },
  prefix: {
    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
    fontSize: 11, fontWeight: 700, color: '#52525B',
  },
}

const s = {
  page: {
    position: 'fixed', inset: 0, background: '#000',
    display: 'flex', flexDirection: 'column',
    fontFamily: "'Inter', sans-serif", color: '#fff',
    zIndex: 200,
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 16px 12px',
    paddingTop: 'calc(env(safe-area-inset-top, 44px) + 12px)',
    background: 'rgba(0,0,0,0.9)',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    flexShrink: 0,
  },
  headerTitle: { fontSize: 17, fontWeight: 700 },
  closeBtn: {
    width: 36, height: 36, borderRadius: '50%',
    background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: '#fff',
  },
  cameraPreview: {
    position: 'relative', width: '100%', height: 240,
    background: '#0a0a0a', flexShrink: 0, overflow: 'hidden',
  },
  cameraPlaceholder: {
    width: '100%', height: '100%',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
  },
  flipBtn: {
    position: 'absolute', top: 12, right: 12,
    width: 36, height: 36, borderRadius: '50%',
    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.15)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: 'white', fontSize: 15,
  },
  modeSection: {
    padding: '24px 16px', flex: 1,
  },
  modeSectionTitle: {
    fontSize: 13, fontWeight: 600, color: '#71717A',
    letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 16,
  },
  modeRow: { display: 'flex', flexDirection: 'column', gap: 12 },
  modeCard: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 16,
    background: '#141414', border: '1px solid rgba(255,255,255,0.08)',
    cursor: 'pointer', textAlign: 'left', position: 'relative',
    fontFamily: 'inherit',
  },
  modeIcon: {
    width: 52, height: 52, borderRadius: 14, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  modeCardTitle: { fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 4 },
  modeCardSub:   { fontSize: 12, color: '#A1A1AA', lineHeight: 1.4, flex: 1, textAlign: 'left' },
  modeCardChevron: {
    width: 28, height: 28, borderRadius: '50%',
    background: '#1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  fieldLabel: { fontSize: 12, fontWeight: 600, color: '#A1A1AA', marginBottom: 6, marginTop: 4, letterSpacing: 0.3 },
  input: {
    width: '100%', padding: '13px 14px',
    background: '#141414', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, color: 'white', fontSize: 14,
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 4,
  },
  charCount: { fontSize: 11, color: '#52525B', textAlign: 'right', marginBottom: 16 },
  catGrid: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  catPill: {
    padding: '7px 14px', borderRadius: 20,
    background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.08)',
    color: '#A1A1AA', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    transition: 'all 0.2s',
  },
  catPillActive: {
    background: 'rgba(255,51,102,0.15)', border: '1px solid #FF3366', color: '#FF3366',
  },
  toggleRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 16px', background: '#141414',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, marginBottom: 20,
  },
  toggle: {
    width: 38, height: 22, borderRadius: 20,
    position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
  },
  toggleThumb: {
    width: 16, height: 16, borderRadius: '50%', background: 'white',
    position: 'absolute', top: 2, transition: 'left 0.2s',
  },
  addProductBtn: {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '6px 12px', borderRadius: 20,
    background: 'rgba(255,51,102,0.1)', border: '1px solid rgba(255,51,102,0.3)',
    color: '#FF3366', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  },
  tipBox: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    padding: 14, background: '#141414',
    border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, marginTop: 8,
  },
  footer: {
    padding: '12px 16px',
    /* sit above the bottom nav (50px) + safe area */
    paddingBottom: 'calc(var(--nav-h, 50px) + env(safe-area-inset-bottom, 0px) + 12px)',
    background: 'rgba(0,0,0,0.95)',
    borderTop: '1px solid rgba(255,255,255,0.07)',
    flexShrink: 0,
  },
  goLiveBtnSell: {
    width: '100%', padding: 15,
    background: 'linear-gradient(135deg,#D946EF,#FF3366,#FB923C)',
    border: 'none', borderRadius: 14,
    color: 'white', fontSize: 16, fontWeight: 800,
    cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    boxShadow: '0 4px 20px rgba(255,51,102,0.4)',
  },
  goLiveBtnSocial: {
    width: '100%', padding: 15,
    background: 'linear-gradient(135deg,#7C3AED,#3B82F6)',
    border: 'none', borderRadius: 14,
    color: 'white', fontSize: 16, fontWeight: 800,
    cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
  },
  liveDot: {
    width: 10, height: 10, borderRadius: '50%', background: 'white',
    animation: 'blink 1s infinite',
  },
}
