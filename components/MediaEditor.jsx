/**
 * MediaEditor — Swoop
 * Premium TikTok/CapCut-quality media editor
 * - Per-clip filters (each image editable independently)
 * - Auto-play slideshow on open
 * - Music pill in header (tap to change)
 * - Working + button to add more images
 * - Playhead, waveform, clip management
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const CLIP_SEC = 3  // seconds per image

const FILTERS = [
  { name:'Original', css:'' },
  { name:'Vivid',    css:'saturate(1.6) contrast(1.1)' },
  { name:'Matte',    css:'contrast(0.9) saturate(0.8) brightness(1.05)' },
  { name:'Cool',     css:'hue-rotate(20deg) saturate(1.1)' },
  { name:'Warm',     css:'hue-rotate(-15deg) saturate(1.2) brightness(1.05)' },
  { name:'Fade',     css:'contrast(0.85) brightness(1.12) saturate(0.7)' },
  { name:'Mono',     css:'grayscale(1)' },
  { name:'Drama',    css:'contrast(1.35) saturate(1.15) brightness(0.92)' },
  { name:'Chrome',   css:'saturate(0) contrast(1.4) brightness(1.1)' },
]

export default function MediaEditor({ mediaFiles: initFiles, onDone, onBack }) {
  // Each clip has its own filter
  const [clips,         setClips]         = useState(() => initFiles.map(f => ({ ...f, filter:'Original' })))
  const [activeIdx,     setActiveIdx]     = useState(0)
  const [playing,       setPlaying]       = useState(false)
  const [currentTime,   setCurrentTime]   = useState(0)
  const [panel,         setPanel]         = useState(null) // null|'sound'|'filters'|'text'|'effects'|'crop'
  const [tracks,        setTracks]        = useState([])
  const [selectedTrack, setSelectedTrack] = useState(null)
  const [previewTrack,  setPreviewTrack]  = useState(null)
  const [loadingTracks, setLoadingTracks] = useState(false)
  const [musicStart,    setMusicStart]    = useState(0)
  const timerRef    = useRef(null)
  const audioRef    = useRef(null)
  const addMoreRef  = useRef(null)
  const totalDur    = clips.length * CLIP_SEC

  const activeClip  = clips[activeIdx]
  const filterCSS   = FILTERS.find(f => f.name === (activeClip?.filter || 'Original'))?.css || ''

  // ── Auto-play on mount ────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => startPlayback(), 400)
    return () => { clearTimeout(t); clearInterval(timerRef.current) }
  }, [])

  const stopPlayback = useCallback(() => {
    clearInterval(timerRef.current)
    timerRef.current = null
    setPlaying(false)
    audioRef.current?.pause()
  }, [])

  const startPlayback = useCallback((fromTime = 0) => {
    clearInterval(timerRef.current)
    let t = fromTime
    if (selectedTrack && audioRef.current) {
      audioRef.current.src = selectedTrack.file_url
      audioRef.current.currentTime = musicStart + (fromTime % (selectedTrack.duration_sec || 60))
      audioRef.current.play()
    }
    setPlaying(true)
    setCurrentTime(t)
    timerRef.current = setInterval(() => {
      t += 0.05
      if (t >= totalDur) t = 0   // loop
      setCurrentTime(t)
      setActiveIdx(Math.floor(t / CLIP_SEC) % clips.length)
    }, 50)
  }, [selectedTrack, musicStart, totalDur, clips.length])

  const togglePlay = () => playing ? stopPlayback() : startPlayback(currentTime)

  // Re-start when music changes
  useEffect(() => {
    if (!playing) return
    stopPlayback()
    startPlayback(currentTime)
  }, [selectedTrack, musicStart])

  // ── Load tracks when sound panel opens ───────────────────────────────────
  useEffect(() => {
    if (panel !== 'sound') return
    if (tracks.length) return
    setLoadingTracks(true)
    supabase.from('music_tracks').select('*').eq('is_active', true)
      .order('play_count', { ascending: false }).limit(30)
      .then(({ data }) => { setTracks(data || []); setLoadingTracks(false) })
  }, [panel])

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

  // ── Per-clip filter ───────────────────────────────────────────────────────
  const setClipFilter = (filterName) => {
    setClips(prev => prev.map((c, i) => i === activeIdx ? { ...c, filter: filterName } : c))
  }

  // ── Remove clip ───────────────────────────────────────────────────────────
  const removeClip = (idx) => {
    if (clips.length <= 1) return
    const next = clips.filter((_, i) => i !== idx)
    setClips(next)
    setActiveIdx(Math.min(idx, next.length - 1))
    stopPlayback(); setCurrentTime(0)
  }

  // ── Move clip left ────────────────────────────────────────────────────────
  const moveLeft = (idx) => {
    if (idx === 0) return
    const next = [...clips]
    ;[next[idx-1], next[idx]] = [next[idx], next[idx-1]]
    setClips(next)
  }

  // ── Add more images ───────────────────────────────────────────────────────
  const handleAddMore = (e) => {
    const newFiles = Array.from(e.target.files || []).slice(0, 10 - clips.length)
    if (!newFiles.length) return
    const newClips = newFiles.map(f => ({ url: URL.createObjectURL(f), file: f, type: 'photo', filter: 'Original' }))
    setClips(prev => [...prev, ...newClips])
    e.target.value = ''
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  const handleDone = () => {
    stopPlayback()
    onDone({ mediaFiles: clips, selectedTrack, musicStart, perClipFilters: clips.map(c => c.filter) })
  }

  const timePercent = totalDur > 0 ? Math.min((currentTime / totalDur) * 100, 100) : 0

  return (
    <div style={S.page}>
      <audio ref={audioRef} loop style={{ display: 'none' }} />
      <input ref={addMoreRef} type="file" accept="image/*,video/*" multiple onChange={handleAddMore} style={{ display: 'none' }} />

      {/* ══ TOP BAR ══ */}
      <div style={S.topBar}>
        <button onClick={onBack} style={S.iconBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>

        {/* Music pill — center, always visible, tap to open sound panel */}
        <button onClick={() => setPanel(p => p === 'sound' ? null : 'sound')} style={{
          ...S.musicPill,
          background: panel === 'sound' ? 'rgba(255,51,102,0.2)' : 'rgba(255,255,255,0.08)',
          border: `1px solid ${panel === 'sound' ? 'rgba(255,51,102,0.5)' : 'rgba(255,255,255,0.1)'}`,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={selectedTrack ? '#FF3366' : 'rgba(255,255,255,0.6)'} strokeWidth="2.5" strokeLinecap="round">
            <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
          </svg>
          <span style={{ fontSize: 12, fontWeight: 600, color: selectedTrack ? 'white' : 'rgba(255,255,255,0.55)', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedTrack ? selectedTrack.title : 'Add Sound'}
          </span>
          {selectedTrack
            ? <button onClick={e => { e.stopPropagation(); setSelectedTrack(null); audioRef.current?.pause() }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1, marginLeft: 2 }}>✕</button>
            : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
          }
        </button>

        <button onClick={handleDone} style={S.nextBtn}>
          Next
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </div>

      {/* ══ PREVIEW ══ */}
      <div style={S.previewArea}>
        <div style={{ ...S.previewInner, filter: filterCSS || 'none' }}>
          {activeClip?.type === 'video'
            ? <video src={activeClip?.url} style={S.media} muted playsInline loop autoPlay />
            : <img src={activeClip?.url} alt="" style={S.media} />
          }
        </div>

        {/* Slide dots */}
        {clips.length > 1 && (
          <div style={S.dots}>
            {clips.map((_, i) => (
              <button key={i} onClick={() => { setActiveIdx(i); stopPlayback(); setCurrentTime(i * CLIP_SEC) }} style={{ width: i === activeIdx ? 20 : 6, height: 6, borderRadius: 3, border: 'none', cursor: 'pointer', background: i === activeIdx ? 'white' : 'rgba(255,255,255,0.28)', transition: 'all 0.25s', padding: 0 }} />
            ))}
          </div>
        )}

        {/* Right tool strip */}
        <div style={S.rightStrip}>
          {[
            { id:'filters', label:'Filters', Icon:FiltersIcon },
            { id:'effects', label:'Effects', Icon:EffectsIcon },
            { id:'text',    label:'Text',    Icon:TextIcon    },
            { id:'crop',    label:'Crop',    Icon:CropIcon    },
          ].map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setPanel(p => p === id ? null : id)} style={{
              ...S.rightBtn,
              background: panel === id ? 'rgba(255,51,102,0.18)' : 'rgba(0,0,0,0.55)',
              border: `1px solid ${panel === id ? 'rgba(255,51,102,0.45)' : 'rgba(255,255,255,0.1)'}`,
            }}>
              <Icon active={panel === id} />
              <span style={{ fontSize: 9, color: panel === id ? '#FF3366' : 'rgba(255,255,255,0.6)', marginTop: 2, fontWeight: 600 }}>{label}</span>
            </button>
          ))}
        </div>

        {/* Active filter chip */}
        {activeClip?.filter && activeClip.filter !== 'Original' && (
          <div style={{ position: 'absolute', bottom: 56, left: 14, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '4px 10px', fontSize: 11, fontWeight: 600, color: '#FF3366' }}>
            {activeClip.filter}
          </div>
        )}
      </div>

      {/* ══ TIMELINE ══ */}
      <div style={S.timelineWrap}>
        {/* Controls row */}
        <div style={S.ctrlRow}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontVariantNumeric: 'tabular-nums', minWidth: 64 }}>
            {fmtTime(currentTime)} / {fmtTime(totalDur)}
          </span>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={() => { stopPlayback(); setCurrentTime(0); setActiveIdx(0) }} style={S.ctrlBtn}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></svg>
            </button>
            <button onClick={togglePlay} style={S.playBtn}>
              {playing
                ? <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                : <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              }
            </button>
            <button onClick={() => startPlayback(currentTime)} style={S.ctrlBtn}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 014-4h12"/></svg>
            </button>
          </div>
          <div style={{ minWidth: 64 }} />
        </div>

        {/* Ruler + tracks */}
        <div style={S.trackScroll}>
          {/* Playhead */}
          <div style={{ ...S.playhead, left: `${timePercent}%` }} />

          {/* Time ruler */}
          <div style={{ position: 'relative', height: 16, marginBottom: 3 }}>
            {Array.from({ length: Math.floor(totalDur) + 1 }, (_, i) => (
              <div key={i} style={{ position: 'absolute', left: `${(i / Math.max(totalDur, 0.01)) * 100}%`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 1, height: 5, background: 'rgba(255,255,255,0.18)' }} />
                <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', marginTop: 1, fontVariantNumeric: 'tabular-nums' }}>{fmtTime(i)}</span>
              </div>
            ))}
          </div>

          {/* Image track */}
          <div style={S.trackRow}>
            <div style={{ width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
            </div>
            <div style={{ flex: 1, display: 'flex', gap: 3, alignItems: 'stretch' }}>
              {clips.map((clip, i) => (
                <div key={i} onClick={() => { stopPlayback(); setActiveIdx(i); setCurrentTime(i * CLIP_SEC) }} style={{
                  flex: `0 0 calc(${(1 / clips.length) * 100}% - 3px)`,
                  maxWidth: 72, minWidth: 40, height: '100%',
                  borderRadius: 7, overflow: 'hidden', position: 'relative', cursor: 'pointer',
                  border: i === activeIdx ? '2px solid #FF3366' : '2px solid rgba(255,255,255,0.08)',
                  boxShadow: i === activeIdx ? '0 0 0 1px #FF336640' : 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}>
                  <img src={clip.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: FILTERS.find(f=>f.name===clip.filter)?.css||'' }} />
                  {/* Filter indicator dot */}
                  {clip.filter && clip.filter !== 'Original' && (
                    <div style={{ position: 'absolute', top: 3, left: 3, width: 8, height: 8, borderRadius: '50%', background: '#FF3366', boxShadow: '0 0 4px rgba(255,51,102,0.6)' }} />
                  )}
                  {/* Remove button */}
                  {clips.length > 1 && (
                    <button onClick={e => { e.stopPropagation(); removeClip(i) }} style={{ position: 'absolute', top: 2, right: 2, width: 15, height: 15, borderRadius: '50%', background: 'rgba(0,0,0,0.75)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 8, lineHeight: 1 }}>✕</button>
                  )}
                  {/* Move left */}
                  {i > 0 && (
                    <button onClick={e => { e.stopPropagation(); moveLeft(i) }} style={{ position: 'absolute', bottom: 2, left: 2, width: 15, height: 15, borderRadius: 4, background: 'rgba(0,0,0,0.65)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 9 }}>‹</button>
                  )}
                </div>
              ))}
              {/* Add more — works via file input */}
              {clips.length < 10 && (
                <button onClick={() => addMoreRef.current?.click()} style={{ flexShrink: 0, width: 44, height: '100%', borderRadius: 7, background: 'transparent', border: '1.5px dashed rgba(255,255,255,0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, cursor: 'pointer' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', fontWeight: 600 }}>ADD</span>
                </button>
              )}
            </div>
          </div>

          {/* Music track */}
          {selectedTrack && (
            <div style={{ ...S.trackRow, marginTop: 4 }}>
              <div style={{ width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FF3366" strokeWidth="2.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
              </div>
              <div style={{ flex: 1, height: '100%', borderRadius: 7, background: 'rgba(255,51,102,0.1)', border: '1px solid rgba(255,51,102,0.25)', display: 'flex', alignItems: 'center', padding: '0 10px', gap: 8, overflow: 'hidden' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#FF3366', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{selectedTrack.title}</span>
                <div style={{ display: 'flex', gap: 1.5, alignItems: 'flex-end', height: 16, flexShrink: 0 }}>
                  {Array.from({ length: 20 }, (_, i) => (
                    <div key={i} style={{ width: 2, background: playing ? '#FF3366' : 'rgba(255,51,102,0.35)', borderRadius: 1, height: `${8 + Math.sin(i * 0.8) * 5}px`, transition: 'height 0.1s', animation: playing ? `wv${i % 3} 0.5s ease-in-out infinite alternate` : 'none', animationDelay: `${i * 0.04}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ PANELS ══ */}
      {panel === 'sound' && (
        <SoundPanel
          tracks={tracks} loading={loadingTracks}
          selected={selectedTrack} previewing={previewTrack}
          musicStart={musicStart} totalDur={totalDur}
          onMusicStartChange={setMusicStart}
          onSelect={t => { setSelectedTrack(t); setPreviewTrack(null); audioRef.current?.pause() }}
          onPreview={handlePreviewTrack}
          onClose={() => setPanel(null)}
        />
      )}
      {panel === 'filters' && (
        <FiltersPanel
          clip={activeClip} clipIndex={activeIdx} totalClips={clips.length}
          currentFilter={activeClip?.filter || 'Original'}
          onSelect={setClipFilter}
          onClose={() => setPanel(null)}
        />
      )}
      {(panel === 'text' || panel === 'effects' || panel === 'crop') && (
        <ComingSoonPanel label={panel === 'text' ? 'Text overlays' : panel === 'effects' ? 'Visual effects' : 'Crop & resize'} onClose={() => setPanel(null)} />
      )}

      <style>{`
        @keyframes wv0{from{height:30%}to{height:90%}}
        @keyframes wv1{from{height:50%}to{height:80%}}
        @keyframes wv2{from{height:20%}to{height:100%}}
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
      `}</style>
    </div>
  )
}

// ══ SOUND PANEL ══
function SoundPanel({ tracks, loading, selected, previewing, musicStart, totalDur, onMusicStartChange, onSelect, onPreview, onClose }) {
  return (
    <div style={P.overlay}>
      <div style={P.sheet}>
        <div style={P.handle} />
        <div style={P.header}>
          <span style={{ fontSize: 15, fontWeight: 800 }}>Add Sound</span>
          <button onClick={onClose} style={P.closeBtn}><XIcon /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
          {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>}
          <TrackRow track={{ id: null, title: 'No Sound', artist: 'Use original audio' }} isSelected={!selected} isPlaying={false} onSelect={() => onSelect(null)} onPreview={() => {}} noMusic />
          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 16px' }} />
          {tracks.map(t => (
            <TrackRow key={t.id} track={t} isSelected={selected?.id === t.id} isPlaying={previewing?.id === t.id}
              onSelect={() => onSelect(t)} onPreview={() => onPreview(t)} />
          ))}
          {!loading && !tracks.length && (
            <div style={{ padding: '40px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.3 }}>♪</div>
              <div style={{ fontSize: 13, color: '#71717A' }}>No tracks available yet</div>
            </div>
          )}
        </div>
        {selected && (
          <div style={{ padding: '10px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: 1.2, marginBottom: 8 }}>START FROM</div>
            <input type="range" min={0} max={selected.duration_sec || 60} value={musicStart}
              onChange={e => onMusicStartChange(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#FF3366', height: 2 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 10, color: '#52525B' }}>
              <span>{fmtTime(musicStart)}</span><span>{fmtTime(selected.duration_sec || 60)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function TrackRow({ track, isSelected, isPlaying, onSelect, onPreview, noMusic }) {
  return (
    <div onClick={onSelect} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', cursor: 'pointer', background: isSelected ? 'rgba(255,51,102,0.06)' : 'transparent', borderLeft: `3px solid ${isSelected ? '#FF3366' : 'transparent'}`, transition: 'all 0.15s' }}>
      <div style={{ width: 44, height: 44, borderRadius: 11, background: noMusic ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg,#0d001a,#1a0035)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(255,255,255,0.06)', position: 'relative', overflow: 'hidden' }}>
        {noMusic
          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/></svg>
          : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isSelected ? '#FF3366' : 'rgba(255,255,255,0.3)'} strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
        }
        {isPlaying && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,51,102,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 14 }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 3, background: '#FF3366', borderRadius: 1.5, animation: `wv${i} 0.5s ease-in-out infinite alternate`, animationDelay: `${i*0.12}s` }} />)}
            </div>
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: isSelected ? 700 : 500, color: isSelected ? 'white' : 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.title}</div>
        <div style={{ fontSize: 11, color: '#52525B', marginTop: 2 }}>{track.artist || ''}</div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
        {track.duration_sec && <span style={{ fontSize: 11, color: '#52525B' }}>{fmtTime(track.duration_sec)}</span>}
        {!noMusic && (
          <button onClick={e => { e.stopPropagation(); onPreview() }} style={{ width: 32, height: 32, borderRadius: '50%', background: isPlaying ? 'rgba(255,51,102,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${isPlaying ? 'rgba(255,51,102,0.3)' : 'rgba(255,255,255,0.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            {isPlaying
              ? <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
              : <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            }
          </button>
        )}
        {isSelected && <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#FF3366', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><path d="M20 6L9 17l-5-5"/></svg></div>}
      </div>
    </div>
  )
}

// ══ FILTERS PANEL ══
function FiltersPanel({ clip, clipIndex, totalClips, currentFilter, onSelect, onClose }) {
  return (
    <div style={P.overlay}>
      <div style={{ ...P.sheet, maxHeight: '52%' }}>
        <div style={P.handle} />
        <div style={P.header}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>Filters</div>
            {totalClips > 1 && <div style={{ fontSize: 11, color: '#71717A', marginTop: 1 }}>Photo {clipIndex + 1} of {totalClips} — each can have its own filter</div>}
          </div>
          <button onClick={onClose} style={P.closeBtn}><XIcon /></button>
        </div>
        <div style={{ display: 'flex', gap: 12, padding: '10px 16px 20px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {FILTERS.map(f => (
            <div key={f.name} onClick={() => onSelect(f.name)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0, cursor: 'pointer' }}>
              <div style={{ width: 70, height: 70, borderRadius: 13, overflow: 'hidden', border: currentFilter === f.name ? '2.5px solid #FF3366' : '2px solid rgba(255,255,255,0.07)', boxShadow: currentFilter === f.name ? '0 0 0 1px #FF336650,0 4px 16px rgba(255,51,102,0.25)' : 'none', transition: 'all 0.2s' }}>
                {clip && <img src={clip.url} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: f.css || 'none' }} />}
              </div>
              <span style={{ fontSize: 10, fontWeight: currentFilter === f.name ? 700 : 400, color: currentFilter === f.name ? 'white' : 'rgba(255,255,255,0.35)', letterSpacing: '0.3px' }}>{f.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ══ COMING SOON PANEL ══
function ComingSoonPanel({ label, onClose }) {
  return (
    <div style={P.overlay}>
      <div style={{ ...P.sheet, maxHeight: '38%' }}>
        <div style={P.handle} />
        <div style={P.header}>
          <span style={{ fontSize: 15, fontWeight: 800 }}>{label}</span>
          <button onClick={onClose} style={P.closeBtn}><XIcon /></button>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 24px 32px', gap: 10 }}>
          <div style={{ width: 48, height: 48, borderRadius: 13, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#A1A1AA' }}>Coming soon</div>
          <div style={{ fontSize: 12, color: '#52525B', textAlign: 'center', lineHeight: 1.5 }}>{label} will be available in an upcoming update.</div>
        </div>
      </div>
    </div>
  )
}

// ══ MICRO COMPONENTS ══
function Spinner() { return <div style={{ width: 22, height: 22, border: '2.5px solid rgba(255,255,255,0.08)', borderTopColor: '#FF3366', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> }
function XIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> }

const iconSVGProps = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
function FiltersIcon({ active }) { return <svg {...iconSVGProps} stroke={active ? '#FF3366' : 'white'}><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg> }
function EffectsIcon({ active }) { return <svg {...iconSVGProps} stroke={active ? '#FF3366' : 'white'}><path d="M12 3l1.45 2.94L16.9 6.55l-2.45 2.39.58 3.37L12 10.5l-3.03 1.81.58-3.37L7.1 6.55l3.45-.61L12 3z"/><path d="M5 17l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM18 13l.5 1 1 .5-1 .5-.5 1-.5-1-1-.5 1-.5z"/></svg> }
function TextIcon({ active }) { return <svg {...iconSVGProps} stroke={active ? '#FF3366' : 'white'}><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg> }
function CropIcon({ active }) { return <svg {...iconSVGProps} stroke={active ? '#FF3366' : 'white'}><polyline points="6.13 1 6 16 21 15.87"/><polyline points="1 6.13 16 6 15.87 21"/></svg> }

function fmtTime(s) {
  s = Math.floor(s || 0)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

// ══ STYLES ══
const S = {
  page:         { position: 'fixed', inset: 0, zIndex: 310, background: '#000', display: 'flex', flexDirection: 'column', fontFamily: "'Inter',sans-serif", color: '#fff' },
  topBar:       { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px 8px', flexShrink: 0, zIndex: 10, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)' },
  iconBtn:      { width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  musicPill:    { display: 'flex', alignItems: 'center', gap: 6, borderRadius: 20, padding: '7px 12px 7px 10px', cursor: 'pointer', transition: 'all 0.2s', maxWidth: 160 },
  nextBtn:      { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 20, background: 'linear-gradient(135deg,#FF3366,#FF6633)', border: 'none', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 14px rgba(255,51,102,0.45)' },
  previewArea:  { flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', minHeight: 0, overflow: 'hidden' },
  previewInner: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'filter 0.3s' },
  media:        { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' },
  dots:         { position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 },
  rightStrip:   { position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 5 },
  rightBtn:     { width: 46, height: 52, borderRadius: 11, backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, cursor: 'pointer', transition: 'all 0.2s' },
  timelineWrap: { flexShrink: 0, background: '#0a0a0a', borderTop: '1px solid rgba(255,255,255,0.06)', paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 4px)' },
  ctrlRow:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px 4px' },
  ctrlBtn:      { width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  playBtn:      { width: 38, height: 38, borderRadius: '50%', background: '#FF3366', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 12px rgba(255,51,102,0.45)' },
  trackScroll:  { position: 'relative', padding: '2px 14px 10px', overflowX: 'auto', scrollbarWidth: 'none' },
  playhead:     { position: 'absolute', top: 0, bottom: 0, width: 2, background: '#FF3366', zIndex: 5, pointerEvents: 'none', boxShadow: '0 0 8px rgba(255,51,102,0.7)', transition: 'left 0.05s', borderRadius: 1 },
  trackRow:     { display: 'flex', gap: 4, alignItems: 'stretch', height: 54 },
}
const P = {
  overlay: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' },
  sheet:   { background: '#0d0d0d', borderRadius: '18px 18px 0 0', border: '1px solid rgba(255,255,255,0.07)', borderBottom: 'none', display: 'flex', flexDirection: 'column', maxHeight: '66%' },
  handle:  { width: 34, height: 4, borderRadius: 20, background: 'rgba(255,255,255,0.1)', margin: '9px auto 0', flexShrink: 0 },
  header:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 },
  closeBtn:{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
}
