import { useState } from 'react'
import { createRequest, REQUEST_CATEGORIES, RADIUS_OPTIONS } from '../lib/requests'
import { requestLocation } from '../lib/feed'
import { supabase } from '../lib/supabase'

const CONDITIONS = ['Brand New', 'Used – Like New', 'Used – Good', 'Any Condition']
const VISIBILITY_OPTS = [
  { value: 'everyone',  label: 'Everyone',  icon: 'fa-globe',       desc: 'All sellers can see and respond' },
  { value: 'following', label: 'Following', icon: 'fa-user-group',  desc: 'Only sellers you follow' },
]

export default function PostRequestModal({ currentUser, onClose, onPosted }) {
  const [step,       setStep]       = useState(1)   // 1 = details, 2 = location, 3 = settings
  const [title,      setTitle]      = useState('')
  const [desc,       setDesc]       = useState('')
  const [category,   setCategory]   = useState('')
  const [budgetMin,  setBudgetMin]  = useState('')
  const [budgetMax,  setBudgetMax]  = useState('')
  const [colorPref,  setColorPref]  = useState('')
  const [condition,  setCondition]  = useState('Any Condition')
  const [location,   setLocation]   = useState(currentUser?.user_metadata?.location || 'Kampala, Uganda')
  const [lat,        setLat]        = useState(null)
  const [lng,        setLng]        = useState(null)
  const [radius,     setRadius]     = useState(20)
  const [visibility, setVisibility] = useState('everyone')
  const [posting,    setPosting]    = useState(false)
  const [locLoading, setLocLoading] = useState(false)
  const [imageUrl,   setImageUrl]   = useState('')
  const [uploading,  setUploading]  = useState(false)

  const canSubmit = title.trim().length >= 3

  const handleGetLocation = async () => {
    setLocLoading(true)
    try {
      const { lat: la, lng: lo } = await requestLocation()
      setLat(la); setLng(lo)
    } catch { /* denied */ }
    setLocLoading(false)
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB')
      return
    }

    setUploading(true)
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `request-images/${currentUser.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('request-images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('request-images')
        .getPublicUrl(filePath)

      setImageUrl(publicUrl)
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Failed to upload image. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async () => {
    if (!canSubmit || !currentUser) return
    setPosting(true)
    const req = await createRequest({
      buyerId: currentUser.id, title: title.trim(), description: desc.trim(),
      category, budgetMin, budgetMax, colorPref, conditionPref: condition,
      location, lat, lng, radiusKm: radius, visibility,
      images: imageUrl ? [imageUrl] : [],
    })
    setPosting(false)
    if (req) { onPosted?.(req); onClose() }
  }

  const TOTAL_STEPS = 3

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={S.backdrop} />

      {/* Sheet */}
      <div style={S.sheet}>
        <div style={S.handle} />

        {/* Header */}
        <div style={S.header}>
          <div>
            <div style={S.headerTitle}>Post a Request</div>
            <div style={S.headerSub}>Tell sellers what you&apos;re looking for</div>
          </div>
          <button onClick={onClose} style={S.closeBtn}>
            <i className="fas fa-times" style={{ fontSize: 16 }} />
          </button>
        </div>

        {/* Step indicator */}
        <div style={S.stepRow}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{
                ...S.stepDot,
                background: i + 1 <= step
                  ? 'linear-gradient(135deg,#D946EF,#FF3366)'
                  : '#1e1e1e',
                border: i + 1 <= step ? 'none' : '1px solid rgba(255,255,255,0.1)',
              }}>
                {i + 1 < step
                  ? <i className="fas fa-check" style={{ fontSize: 9, color: 'white' }} />
                  : <span style={{ fontSize: 10, fontWeight: 700, color: i + 1 === step ? 'white' : '#52525B' }}>{i + 1}</span>
                }
              </div>
              {i < TOTAL_STEPS - 1 && (
                <div style={{ height: 2, width: 32, background: i + 1 < step ? '#FF3366' : 'rgba(255,255,255,0.08)', borderRadius: 1 }} />
              )}
            </div>
          ))}
        </div>

        {/* Body */}
        <div style={S.body}>

          {/* ── STEP 1: What are you looking for? ── */}
          {step === 1 && (
            <div style={S.stepContent}>
              <div style={S.stepTitle}>What are you looking for?</div>

              <div style={S.fieldWrap}>
                <div style={S.fieldLabel}>Item name <span style={{ color: '#FF3366' }}>*</span></div>
                <input
                  placeholder="e.g. iPhone 14 Pro Max 256GB"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  style={S.input}
                  maxLength={80}
                />
                <div style={S.charCount}>{title.length}/80</div>
              </div>

              <div style={S.fieldWrap}>
                <div style={S.fieldLabel}>Category</div>
                <div style={S.catGrid}>
                  {REQUEST_CATEGORIES.map(c => (
                    <button
                      key={c}
                      onClick={() => setCategory(c === category ? '' : c)}
                      style={{
                        ...S.catChip,
                        background: category === c ? 'rgba(255,51,102,0.15)' : '#1e1e1e',
                        border: `1px solid ${category === c ? '#FF3366' : 'rgba(255,255,255,0.08)'}`,
                        color: category === c ? '#FF3366' : '#A1A1AA',
                      }}
                    >{c}</button>
                  ))}
                </div>
              </div>

              <div style={S.fieldWrap}>
                <div style={S.fieldLabel}>Product Image <span style={{ color: '#71717A', fontWeight: 400 }}>(optional)</span></div>
                <div style={{ position: 'relative' }}>
                  {imageUrl ? (
                    <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', borderRadius: 12, overflow: 'hidden', background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <img src={imageUrl} alt="Product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        onClick={() => setImageUrl('')}
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: 'rgba(0,0,0,0.7)',
                          border: 'none',
                          color: 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <i className="fas fa-times" style={{ fontSize: 12 }} />
                      </button>
                    </div>
                  ) : (
                    <label style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      aspectRatio: '4/3',
                      borderRadius: 12,
                      background: '#141414',
                      border: '2px dashed rgba(255,255,255,0.15)',
                      cursor: uploading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                    }}>
                      {uploading ? (
                        <>
                          <i className="fas fa-spinner fa-spin" style={{ fontSize: 24, color: '#FF3366', marginBottom: 8 }} />
                          <span style={{ fontSize: 12, color: '#71717A' }}>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <i className="fas fa-camera" style={{ fontSize: 24, color: '#52525B', marginBottom: 8 }} />
                          <span style={{ fontSize: 12, color: '#71717A' }}>Tap to add image</span>
                          <span style={{ fontSize: 10, color: '#52525B', marginTop: 4 }}>Max 5MB</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploading}
                        style={{ display: 'none' }}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div style={S.fieldWrap}>
                <div style={S.fieldLabel}>Description <span style={{ color: '#71717A', fontWeight: 400 }}>(optional)</span></div>
                <textarea
                  placeholder="Add more details — condition, size, color, brand, specs..."
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  rows={3}
                  maxLength={300}
                  style={{ ...S.input, resize: 'none', lineHeight: 1.5 }}
                />
                <div style={S.charCount}>{desc.length}/300</div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1, ...S.fieldWrap }}>
                  <div style={S.fieldLabel}>Condition</div>
                  <div style={S.selectWrap}>
                    <select
                      value={condition}
                      onChange={e => setCondition(e.target.value)}
                      style={S.select}
                    >
                      {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <i className="fas fa-chevron-down" style={S.selectArrow} />
                  </div>
                </div>
                <div style={{ flex: 1, ...S.fieldWrap }}>
                  <div style={S.fieldLabel}>Colour / Style</div>
                  <input
                    placeholder="e.g. Black, Any"
                    value={colorPref}
                    onChange={e => setColorPref(e.target.value)}
                    style={S.input}
                    maxLength={40}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Budget & Location ── */}
          {step === 2 && (
            <div style={S.stepContent}>
              <div style={S.stepTitle}>Budget &amp; Location</div>

              <div style={S.fieldWrap}>
                <div style={S.fieldLabel}>Budget range <span style={{ color: '#71717A', fontWeight: 400 }}>(optional)</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <span style={S.currPrefix}>UGX</span>
                    <input
                      type="number"
                      placeholder="Min"
                      value={budgetMin}
                      onChange={e => setBudgetMin(e.target.value)}
                      style={{ ...S.input, paddingLeft: 48 }}
                    />
                  </div>
                  <span style={{ color: '#52525B', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>—</span>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <span style={S.currPrefix}>UGX</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={budgetMax}
                      onChange={e => setBudgetMax(e.target.value)}
                      style={{ ...S.input, paddingLeft: 48 }}
                    />
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#52525B', marginTop: 5 }}>
                  Leave blank for flexible budget
                </div>
              </div>

              <div style={S.fieldWrap}>
                <div style={S.fieldLabel}>Your location</div>
                <div style={{ position: 'relative' }}>
                  <i className="fas fa-location-dot" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: lat ? '#22C55E' : '#52525B', fontSize: 14 }} />
                  <input
                    placeholder="City or area"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    style={{ ...S.input, paddingLeft: 38 }}
                  />
                </div>
                <button onClick={handleGetLocation} disabled={locLoading} style={S.useMyLocBtn}>
                  {locLoading
                    ? <><i className="fas fa-spinner fa-spin" style={{ fontSize: 12 }} /> Detecting...</>
                    : <><i className="fas fa-crosshairs" style={{ fontSize: 12 }} /> {lat ? '✓ Using GPS location' : 'Use my exact location'}</>
                  }
                </button>
              </div>

              <div style={S.fieldWrap}>
                <div style={S.fieldLabel}>Search radius</div>
                <div style={S.radiusRow}>
                  {RADIUS_OPTIONS.map(r => (
                    <button
                      key={r}
                      onClick={() => setRadius(r)}
                      style={{
                        ...S.radiusChip,
                        background: radius === r ? 'rgba(255,51,102,0.15)' : '#1e1e1e',
                        border: `1px solid ${radius === r ? '#FF3366' : 'rgba(255,255,255,0.08)'}`,
                        color: radius === r ? '#FF3366' : '#A1A1AA',
                      }}
                    >
                      {r} km
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Settings & Review ── */}
          {step === 3 && (
            <div style={S.stepContent}>
              <div style={S.stepTitle}>Settings &amp; Review</div>

              <div style={S.fieldWrap}>
                <div style={S.fieldLabel}>Who can see this request?</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {VISIBILITY_OPTS.map(v => (
                    <button
                      key={v.value}
                      onClick={() => setVisibility(v.value)}
                      style={{
                        ...S.visibilityRow,
                        border: `1.5px solid ${visibility === v.value ? '#FF3366' : 'rgba(255,255,255,0.08)'}`,
                        background: visibility === v.value ? 'rgba(255,51,102,0.06)' : '#141414',
                      }}
                    >
                      <div style={{
                        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                        background: visibility === v.value ? 'rgba(255,51,102,0.15)' : '#1e1e1e',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <i className={`fas ${v.icon}`} style={{ fontSize: 16, color: visibility === v.value ? '#FF3366' : '#71717A' }} />
                      </div>
                      <div style={{ flex: 1, textAlign: 'left' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{v.label}</div>
                        <div style={{ fontSize: 12, color: '#71717A', marginTop: 1 }}>{v.desc}</div>
                      </div>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        border: `2px solid ${visibility === v.value ? '#FF3366' : 'rgba(255,255,255,0.15)'}`,
                        background: visibility === v.value ? '#FF3366' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        {visibility === v.value && <i className="fas fa-check" style={{ fontSize: 9, color: 'white' }} />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary card */}
              <div style={S.summaryCard}>
                <div style={S.summaryTitle}>📋 Request Summary</div>
                <SummaryRow label="Item"       val={title || '—'} />
                <SummaryRow label="Category"   val={category || 'Not specified'} />
                <SummaryRow label="Condition"  val={condition} />
                {colorPref && <SummaryRow label="Colour"  val={colorPref} />}
                {imageUrl && (
                  <div style={{ marginTop: 12, marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#A1A1AA', marginBottom: 6 }}>Product Image</div>
                    <div style={{ width: '100%', aspectRatio: '4/3', borderRadius: 10, overflow: 'hidden', background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <img src={imageUrl} alt="Product preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  </div>
                )}
                <SummaryRow label="Budget"
                  val={budgetMin || budgetMax
                    ? `UGX ${budgetMin ? Number(budgetMin).toLocaleString() : '0'} – ${budgetMax ? Number(budgetMax).toLocaleString() : '∞'}`
                    : 'Flexible'}
                />
                <SummaryRow label="Location"   val={location} />
                <SummaryRow label="Radius"     val={`Within ${radius} km`} />
                <SummaryRow label="Visibility" val={visibility === 'everyone' ? '🌍 Everyone' : '👥 Following only'} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={S.footer}>
          <div style={{ display: 'flex', gap: 10 }}>
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)} style={S.backBtn}>
                <i className="fas fa-arrow-left" style={{ fontSize: 14 }} /> Back
              </button>
            )}
            {step < TOTAL_STEPS ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={step === 1 && !canSubmit}
                style={{ ...S.nextBtn, flex: 1, opacity: (step === 1 && !canSubmit) ? 0.4 : 1 }}
              >
                Continue <i className="fas fa-arrow-right" style={{ fontSize: 13 }} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={posting || !canSubmit}
                style={{ ...S.submitBtn, flex: 1, opacity: posting || !canSubmit ? 0.6 : 1 }}
              >
                {posting
                  ? <><i className="fas fa-spinner fa-spin" style={{ fontSize: 14 }} /> Posting...</>
                  : <><i className="fas fa-paper-plane" style={{ fontSize: 14 }} /> Post Request</>
                }
              </button>
            )}
          </div>
          <div style={{ fontSize: 11, color: '#52525B', textAlign: 'center', marginTop: 10 }}>
            <i className="fas fa-shield-halved" style={{ marginRight: 4, color: '#22C55E' }} />
            All requests are reviewed to keep our community safe
          </div>
        </div>
      </div>
    </>
  )
}

function SummaryRow({ label, val }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ fontSize: 12, color: '#71717A', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 12, color: '#fff', fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{val}</span>
    </div>
  )
}

const S = {
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, backdropFilter: 'blur(3px)' },
  sheet: {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    maxWidth: 430, margin: '0 auto',
    background: '#0d0d0d', borderRadius: '22px 22px 0 0',
    border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none',
    zIndex: 301, display: 'flex', flexDirection: 'column',
    /* cap height so it never covers the full screen — leaves breathing room at top */
    maxHeight: 'calc(100dvh - 100px)',
    fontFamily: "'Inter',sans-serif", color: '#fff',
  },
  handle: { width: 40, height: 4, borderRadius: 20, background: 'rgba(255,255,255,0.15)', margin: '10px auto 0', flexShrink: 0 },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '14px 18px 8px', flexShrink: 0 },
  headerTitle: { fontSize: 18, fontWeight: 800, marginBottom: 2 },
  headerSub:   { fontSize: 12, color: '#71717A' },
  closeBtn: {
    width: 30, height: 30, borderRadius: '50%',
    background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.08)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: '#A1A1AA', flexShrink: 0,
  },
  stepRow:  { display: 'flex', alignItems: 'center', padding: '6px 18px 14px', flexShrink: 0 },
  stepDot:  { width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  body:     { flex: 1, overflowY: 'auto', scrollbarWidth: 'none' },
  stepContent: { padding: '4px 18px 8px' },
  stepTitle:   { fontSize: 16, fontWeight: 800, marginBottom: 18, color: '#fff' },
  fieldWrap:   { marginBottom: 18 },
  fieldLabel:  { fontSize: 12, fontWeight: 700, color: '#A1A1AA', marginBottom: 7, letterSpacing: 0.3 },
  input: {
    width: '100%', padding: '12px 14px',
    background: '#141414', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, color: '#fff', fontSize: 14,
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  },
  charCount: { fontSize: 11, color: '#52525B', textAlign: 'right', marginTop: 4 },
  catGrid: { display: 'flex', flexWrap: 'wrap', gap: 7 },
  catChip: {
    padding: '7px 13px', borderRadius: 20,
    fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    transition: 'all 0.15s',
  },
  selectWrap: { position: 'relative' },
  select: {
    width: '100%', padding: '12px 14px', paddingRight: 34,
    background: '#141414', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, color: '#fff', fontSize: 14,
    outline: 'none', fontFamily: 'inherit', appearance: 'none',
  },
  selectArrow: { position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', color: '#52525B', fontSize: 12, pointerEvents: 'none' },
  currPrefix: { position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 700, color: '#52525B' },
  useMyLocBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    marginTop: 8, padding: '7px 12px', borderRadius: 20,
    background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
    color: '#22C55E', fontSize: 12, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  radiusRow: { display: 'flex', gap: 8 },
  radiusChip: { flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center' },
  visibilityRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 14px', borderRadius: 14,
    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
    transition: 'all 0.15s',
  },
  summaryCard: {
    background: '#141414', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 14, padding: '14px 16px', marginTop: 4,
  },
  summaryTitle: { fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#A1A1AA', letterSpacing: 0.3 },
  footer: {
    padding: '12px 18px',
    /* push above the bottom nav + safe area so buttons are always fully visible */
    paddingBottom: 'calc(var(--nav-h, 50px) + env(safe-area-inset-bottom, 0px) + 12px)',
    borderTop: '1px solid rgba(255,255,255,0.07)',
    flexShrink: 0, background: '#0d0d0d',
  },
  backBtn: {
    padding: '13px 18px', borderRadius: 12,
    background: '#141414', border: '1px solid rgba(255,255,255,0.1)',
    color: '#A1A1AA', fontSize: 14, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', gap: 6,
  },
  nextBtn: {
    padding: '14px', borderRadius: 12,
    background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff', fontSize: 15, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
  },
  submitBtn: {
    padding: '14px', borderRadius: 12,
    background: 'linear-gradient(135deg,#D946EF,#FF3366,#FB923C)',
    border: 'none', color: '#fff', fontSize: 15, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    boxShadow: '0 4px 20px rgba(255,51,102,0.4)',
  },
}
