/**
 * AddStoryScreen — TikTok/Instagram story creator
 * Full-screen, image fills screen, right-side tools, music pill top center
 * Music auto-plays when selected
 */
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function AddStoryScreen({ currentUser, onClose, onPosted }) {
  const [media,          setMedia]          = useState(null)  // { url, file, type }
  const [caption,        setCaption]        = useState('')
  const [selectedTrack,  setSelectedTrack]  = useState(null)
  const [tracks,         setTracks]         = useState([])
  const [showSoundPanel, setShowSoundPanel] = useState(false)
  const [previewTrack,   setPreviewTrack]   = useState(null)
  const [loadingTracks,  setLoadingTracks]  = useState(false)
  const [posting,        setPosting]        = useState(false)
  const [showCaption,    setShowCaption]    = useState(false)
  const fileRef  = useRef(null)
  const audioRef = useRef(null)

  // Load tracks when sound panel opens
  useEffect(() => {
    if (!showSoundPanel || tracks.length) return
    setLoadingTracks(true)
    supabase.from('music_tracks').select('*').eq('is_active', true)
      .order('play_count', { ascending: false }).limit(30)
      .then(({ data }) => { setTracks(data || []); setLoadingTracks(false) })
  }, [showSoundPanel])

  // Auto-play when track selected
  useEffect(() => {
    if (selectedTrack && audioRef.current) {
      audioRef.current.src = selectedTrack.file_url
      audioRef.current.loop = true
      audioRef.current.play()
    } else {
      audioRef.current?.pause()
    }
  }, [selectedTrack])

  const handleFilePick = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setMedia({ url: URL.createObjectURL(file), file, type: file.type.startsWith('video') ? 'video' : 'photo' })
  }

  const handlePreviewTrack = (track) => {
    if (previewTrack?.id === track.id) {
      audioRef.current?.pause(); setPreviewTrack(null)
    } else {
      setPreviewTrack(track)
      if (audioRef.current) {
        audioRef.current.src = track.file_url
        audioRef.current.currentTime = 0
        audioRef.current.play()
      }
    }
  }

  const handlePost = async () => {
    if (!media || !currentUser) return
    setPosting(true)
    // Upload to Supabase storage
    const ext  = media.type === 'video' ? 'mp4' : 'jpg'
    const path = `${currentUser.id}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('stories').upload(path, media.file)
    if (upErr) { setPosting(false); return }
    const { data: { publicUrl } } = supabase.storage.from('stories').getPublicUrl(path)
    const { error } = await supabase.from('stories').insert({
      user_id: currentUser.id,
      media_url: publicUrl,
      media_type: media.type,
      music_track_id: selectedTrack?.id || null,
      caption: caption.trim() || null,
    })
    setPosting(false)
    if (!error) { onPosted?.(); onClose() }
  }

  // ── No media yet — show file picker UI ──────────────────────────────────
  if (!media) return (
    <div style={S.page}>
      <audio ref={audioRef} style={{ display: 'none' }} />
      <div style={S.topBar}>
        <button onClick={onClose} style={S.iconBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Add to Story</div>
        <div style={{ width: 36 }} />
      </div>

      {/* Gallery picker — full screen grid */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: 32 }}>
        <div style={{ width: 80, height: 80, borderRadius: 22, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Share your moment</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>Stories disappear after 24 hours</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 300 }}>
          <label style={S.pickBtn}>
            <input type="file" accept="image/*,video/*" onChange={handleFilePick} style={{ display: 'none' }} />
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
            Choose from Library
          </label>
          <label style={S.pickBtnOutline}>
            <input type="file" accept="image/*" capture="environment" onChange={handleFilePick} style={{ display: 'none' }} />
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M1.05 12A11 11 0 0123 12M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            Take a Photo
          </label>
        </div>
      </div>
    </div>
  )

  // ── Media selected — full screen editor ──────────────────────────────────
  return (
    <div style={S.page}>
      <audio ref={audioRef} style={{ display: 'none' }} />

      {/* Full screen media */}
      <div style={S.mediaFullScreen}>
        {media.type === 'video'
          ? <video src={media.url} style={S.mediaCover} autoPlay muted loop playsInline />
          : <img src={media.url} alt="" style={S.mediaCover} />
        }
        {/* Dark gradient top + bottom for readability */}
        <div style={S.topGrad} />
        <div style={S.botGrad} />
      </div>

      {/* ── TOP: back + music pill ── */}
      <div style={S.overlay}>
        <div style={S.topRow}>
          <button onClick={() => setMedia(null)} style={S.overlayBtn}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>

          {/* Music pill — always visible center */}
          <button onClick={() => setShowSoundPanel(p => !p)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: selectedTrack ? 'rgba(255,51,102,0.2)' : 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${selectedTrack ? 'rgba(255,51,102,0.4)' : 'rgba(255,255,255,0.15)'}`,
            borderRadius: 20, padding: '7px 13px 7px 10px', cursor: 'pointer',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={selectedTrack ? '#FF3366' : 'rgba(255,255,255,0.7)'} strokeWidth="2.5">
              <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
            </svg>
            <span style={{ fontSize: 12, fontWeight: 600, color: selectedTrack ? 'white' : 'rgba(255,255,255,0.65)', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedTrack ? selectedTrack.title : 'Add Sound'}
            </span>
            {selectedTrack
              ? <button onClick={e => { e.stopPropagation(); setSelectedTrack(null) }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 0, fontSize: 13, marginLeft: 2 }}>✕</button>
              : <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
            }
          </button>

          <div style={{ width: 36 }} />
        </div>

        {/* Right tool strip */}
        <div style={S.rightTools}>
          {[
            { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>, label: 'Aa', action: () => setShowCaption(c => !c) },
            { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M12 3l1.45 2.94L16.9 6.55l-2.45 2.39.58 3.37L12 10.5l-3.03 1.81.58-3.37L7.1 6.55l3.45-.61L12 3z"/></svg>, label: 'Effects', action: () => {} },
            { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={selectedTrack ? '#FF3366' : 'white'} strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>, label: 'Sound', action: () => setShowSoundPanel(p => !p), active: !!selectedTrack },
            { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>, label: 'Filters', action: () => {} },
          ].map((t, i) => (
            <button key={i} onClick={t.action} style={{ ...S.overlayBtn, width: 42, height: 42, flexDirection: 'column', gap: 2, background: t.active ? 'rgba(255,51,102,0.2)' : 'rgba(0,0,0,0.45)', border: `1px solid ${t.active ? 'rgba(255,51,102,0.4)' : 'rgba(255,255,255,0.12)'}` }}>
              {t.icon}
            </button>
          ))}
        </div>

        {/* Caption input */}
        {showCaption && (
          <div style={S.captionWrap}>
            <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Add a caption..." maxLength={150}
              style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, color: 'white', fontSize: 15, padding: '10px 14px', width: '100%', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>
        )}

        {/* Bottom: Your Story button */}
        <div style={S.bottomRow}>
          <button onClick={handlePost} disabled={posting} style={S.postStoryBtn}>
            {posting
              ? <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              : <>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#FF3366', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: 'white', flexShrink: 0 }}>
                    {currentUser?.user_metadata?.full_name?.[0]?.toUpperCase() || 'Y'}
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>Your Story</span>
                </>
            }
          </button>
        </div>
      </div>

      {/* Sound panel */}
      {showSoundPanel && (
        <StoryMusicPanel
          tracks={tracks} loading={loadingTracks}
          selected={selectedTrack} previewing={previewTrack}
          onSelect={t => { setSelectedTrack(t); setPreviewTrack(null); setShowSoundPanel(false) }}
          onPreview={handlePreviewTrack}
          onClose={() => setShowSoundPanel(false)}
        />
      )}

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function StoryMusicPanel({ tracks, loading, selected, previewing, onSelect, onPreview, onClose }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div style={{ background: '#0d0d0d', borderRadius: '20px 20px 0 0', border: '1px solid rgba(255,255,255,0.07)', borderBottom: 'none', maxHeight: '70%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ width: 34, height: 4, borderRadius: 20, background: 'rgba(255,255,255,0.1)', margin: '9px auto 0', flexShrink: 0 }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 800 }}>Add Sound</span>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
          {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><div style={{ width: 22, height: 22, border: '2px solid rgba(255,255,255,0.08)', borderTopColor: '#FF3366', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /></div>}
          <div onClick={() => onSelect(null)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', borderLeft: `3px solid ${!selected ? '#FF3366' : 'transparent'}`, background: !selected ? 'rgba(255,51,102,0.05)' : 'transparent' }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/></svg>
            </div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: !selected ? 700 : 400, color: 'white' }}>No Sound</div><div style={{ fontSize: 11, color: '#52525B' }}>Original audio</div></div>
            {!selected && <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#FF3366', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><path d="M20 6L9 17l-5-5"/></svg></div>}
          </div>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 16px' }} />
          {tracks.map(t => (
            <div key={t.id} onClick={() => onSelect(t)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', borderLeft: `3px solid ${selected?.id === t.id ? '#FF3366' : 'transparent'}`, background: selected?.id === t.id ? 'rgba(255,51,102,0.05)' : 'transparent' }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: 'linear-gradient(135deg,#0d001a,#1a0035)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={selected?.id === t.id ? '#FF3366' : 'rgba(255,255,255,0.3)'} strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                {previewing?.id === t.id && <div style={{ position: 'absolute', inset: 0, borderRadius: 10, background: 'rgba(255,51,102,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 12 }}>{[0,1,2].map(i=><div key={i} style={{ width: 2.5, background: '#FF3366', borderRadius: 1, animation: `wv${i} 0.5s ease-in-out infinite alternate`, animationDelay: `${i*0.12}s` }}/>)}</div></div>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: selected?.id === t.id ? 700 : 400, color: selected?.id === t.id ? 'white' : 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                <div style={{ fontSize: 11, color: '#52525B', marginTop: 1 }}>{t.artist}</div>
              </div>
              <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexShrink: 0 }}>
                {t.duration_sec && <span style={{ fontSize: 10, color: '#52525B' }}>{Math.floor(t.duration_sec/60)}:{String(t.duration_sec%60).padStart(2,'0')}</span>}
                <button onClick={e => { e.stopPropagation(); onPreview(t) }} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  {previewing?.id === t.id ? <svg width="9" height="9" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg> : <svg width="9" height="9" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
                </button>
                {selected?.id === t.id && <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#FF3366', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><path d="M20 6L9 17l-5-5"/></svg></div>}
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`@keyframes wv0{from{height:30%}to{height:90%}}@keyframes wv1{from{height:50%}to{height:80%}}@keyframes wv2{from{height:20%}to{height:100%}}`}</style>
    </div>
  )
}

const S = {
  page:         { position: 'fixed', inset: 0, zIndex: 400, background: '#000', display: 'flex', flexDirection: 'column', fontFamily: "'Inter',sans-serif", color: '#fff' },
  topBar:       { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 12px', flexShrink: 0, background: '#000' },
  iconBtn:      { width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  pickBtn:      { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '14px', background: 'linear-gradient(135deg,#FF3366,#FF6633)', border: 'none', borderRadius: 13, color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  pickBtnOutline: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '13px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 13, color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  mediaFullScreen: { position: 'absolute', inset: 0 },
  mediaCover:   { width: '100%', height: '100%', objectFit: 'cover' },
  topGrad:      { position: 'absolute', top: 0, left: 0, right: 0, height: 160, background: 'linear-gradient(to bottom,rgba(0,0,0,0.6),transparent)', pointerEvents: 'none' },
  botGrad:      { position: 'absolute', bottom: 0, left: 0, right: 0, height: 180, background: 'linear-gradient(to top,rgba(0,0,0,0.7),transparent)', pointerEvents: 'none' },
  overlay:      { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', zIndex: 10 },
  topRow:       { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', paddingTop: 'calc(env(safe-area-inset-top,0px) + 12px)' },
  overlayBtn:   { width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  rightTools:   { position: 'absolute', right: 12, top: 'calc(env(safe-area-inset-top,0px) + 64px)', display: 'flex', flexDirection: 'column', gap: 10 },
  captionWrap:  { position: 'absolute', bottom: 120, left: 16, right: 16 },
  bottomRow:    { position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px', paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 16px)', display: 'flex', justifyContent: 'center' },
  postStoryBtn: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px 10px 10px', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', border: 'none', borderRadius: 50, color: '#000', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(0,0,0,0.4)', minWidth: 180, justifyContent: 'center' },
}
