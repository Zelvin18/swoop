/**
 * MediaEditor — Swoop
 * TikTok/CapCut-quality media editor
 * - Full-screen 9:16 preview
 * - Per-clip filters, text overlays, music from Jamendo
 * - Horizontal clip strip at bottom
 * - Floating tool buttons on right side
 */
import { useState, useEffect, useRef, useCallback } from 'react'

const CLIP_SEC = 3

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
  { name:'Golden',   css:'sepia(0.5) saturate(1.3) brightness(1.05)' },
  { name:'Noir',     css:'grayscale(0.8) contrast(1.3) brightness(0.85)' },
]

export default function MediaEditor({ mediaFiles: initFiles, onDone, onBack }) {
  const [clips,         setClips]         = useState(() => initFiles.map(f => ({ ...f, filter:'Original', textOverlays:[] })))
  const [activeIdx,     setActiveIdx]     = useState(0)
  const [playing,       setPlaying]       = useState(false)
  const [currentTime,   setCurrentTime]   = useState(0)
  const [panel,         setPanel]         = useState(null)
  const [tracks,        setTracks]        = useState([])
  const [selectedTrack, setSelectedTrack] = useState(null)
  const [previewTrack,  setPreviewTrack]  = useState(null)
  const [loadingTracks, setLoadingTracks] = useState(false)
  const [musicStart,    setMusicStart]    = useState(0)
  const [musicQuery,    setMusicQuery]    = useState('')
  const [musicGenre,    setMusicGenre]    = useState('All')

  const timerRef   = useRef(null)
  const audioRef   = useRef(null)
  const addMoreRef = useRef(null)
  const totalDur   = clips.length * CLIP_SEC

  const activeClip = clips[activeIdx]
  const filterCSS  = FILTERS.find(f => f.name === (activeClip?.filter || 'Original'))?.css || ''

  // Auto-play on mount
  useEffect(() => {
    const t = setTimeout(() => startPlayback(), 500)
    return () => { clearTimeout(t); clearInterval(timerRef.current) }
  }, [])

  const stopPlayback = useCallback(() => {
    clearInterval(timerRef.current)
    timerRef.current = null
    setPlaying(false)
    if (audioRef.current) { audioRef.current.pause() }
  }, [])

  const startPlayback = useCallback((fromTime = 0) => {
    clearInterval(timerRef.current)
    let t = fromTime
    if (selectedTrack && audioRef.current) {
      audioRef.current.src = selectedTrack.file_url
      audioRef.current.currentTime = musicStart + (fromTime % (selectedTrack.duration_sec || 60))
      audioRef.current.play().catch(() => {})
    }
    setPlaying(true)
    setCurrentTime(t)
    timerRef.current = setInterval(() => {
      t = t + 0.05
      if (t >= totalDur) t = 0
      setCurrentTime(t)
      setActiveIdx(Math.floor(t / CLIP_SEC) % clips.length)
    }, 50)
  }, [selectedTrack, musicStart, totalDur, clips.length])

  const togglePlay = () => playing ? stopPlayback() : startPlayback(currentTime)

  useEffect(() => {
    if (!playing) return
    stopPlayback(); startPlayback(currentTime)
  }, [selectedTrack, musicStart])

  // Load music from API proxy
  useEffect(() => {
    if (panel !== 'sound') return
    if (tracks.length && !musicQuery) return
    setLoadingTracks(true)
    const params = new URLSearchParams({ limit: 40 })
    if (musicQuery) params.set('q', musicQuery)
    if (musicGenre !== 'All') params.set('genre', musicGenre)
    fetch(`/api/music?${params}`)
      .then(r => r.json())
      .then(data => { setTracks(data.tracks || []); setLoadingTracks(false) })
      .catch(() => { setTracks([]); setLoadingTracks(false) })
  }, [panel, musicGenre])

  // Search with debounce
  useEffect(() => {
    if (panel !== 'sound') return
    const t = setTimeout(() => {
      setLoadingTracks(true)
      const params = new URLSearchParams({ limit: 40 })
      if (musicQuery) params.set('q', musicQuery)
      if (musicGenre !== 'All') params.set('genre', musicGenre)
      fetch(`/api/music?${params}`)
        .then(r => r.json())
        .then(data => { setTracks(data.tracks || []); setLoadingTracks(false) })
        .catch(() => { setTracks([]); setLoadingTracks(false) })
    }, 500)
    return () => clearTimeout(t)
  }, [musicQuery])

  const handlePreviewTrack = (track) => {
    if (previewTrack?.id === track.id) {
      audioRef.current?.pause(); setPreviewTrack(null)
    } else {
      setPreviewTrack(track)
      if (audioRef.current) {
        audioRef.current.src = track.file_url
        audioRef.current.currentTime = 0
        audioRef.current.play().catch(() => {})
      }
    }
  }

  const setClipFilter = (filterName) => {
    setClips(prev => prev.map((c, i) => i === activeIdx ? { ...c, filter: filterName } : c))
  }

  const removeClip = (idx) => {
    if (clips.length <= 1) return
    const next = clips.filter((_, i) => i !== idx)
    setClips(next)
    setActiveIdx(Math.min(idx, next.length - 1))
    stopPlayback(); setCurrentTime(0)
  }

  const handleAddMore = (e) => {
    const newFiles = Array.from(e.target.files || []).slice(0, 10 - clips.length)
    if (!newFiles.length) return
    const newClips = newFiles.map(f => ({ url: URL.createObjectURL(f), file: f, type: f.type.startsWith('video') ? 'video' : 'photo', filter: 'Original', textOverlays: [] }))
    setClips(prev => [...prev, ...newClips])
    e.target.value = ''
  }

  const handleDone = () => {
    stopPlayback()
    onDone({ mediaFiles: clips, selectedTrack, musicStart, perClipFilters: clips.map(c => c.filter) })
  }

  const timePercent = totalDur > 0 ? Math.min((currentTime / totalDur) * 100, 100) : 0

  return (
    <div style={{position:'fixed',inset:0,zIndex:310,background:'#000',display:'flex',flexDirection:'column',fontFamily:"'Inter',sans-serif",color:'#fff',userSelect:'none'}}>
      <audio ref={audioRef} loop style={{display:'none'}}/>
      <input ref={addMoreRef} type="file" accept="image/*,video/*" multiple onChange={handleAddMore} style={{display:'none'}}/>

      {/* ── TOP BAR ── */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',paddingTop:'calc(env(safe-area-inset-top,0px)+10px)',flexShrink:0,zIndex:10,background:'linear-gradient(to bottom,rgba(0,0,0,0.8),transparent)',position:'absolute',top:0,left:0,right:0}}>
        <button onClick={onBack} style={{width:36,height:36,borderRadius:'50%',background:'rgba(0,0,0,0.5)',backdropFilter:'blur(8px)',border:'1px solid rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>

        {/* Music pill */}
        <button onClick={() => setPanel(p => p === 'sound' ? null : 'sound')} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px 7px 10px',borderRadius:20,background:selectedTrack?'rgba(255,51,102,0.25)':'rgba(0,0,0,0.5)',backdropFilter:'blur(10px)',border:`1.5px solid ${selectedTrack?'rgba(255,51,102,0.6)':'rgba(255,255,255,0.2)'}`,cursor:'pointer',maxWidth:180,transition:'all 0.2s',boxShadow:selectedTrack?'0 0 16px rgba(255,51,102,0.3)':'none'}}>
          <div style={{width:22,height:22,borderRadius:'50%',background:selectedTrack?'rgba(255,51,102,0.3)':'rgba(255,255,255,0.1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={selectedTrack?'#FF3366':'rgba(255,255,255,0.7)'} strokeWidth="2.5" strokeLinecap="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          </div>
          <span style={{fontSize:12,fontWeight:600,color:selectedTrack?'white':'rgba(255,255,255,0.7)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,textAlign:'left'}}>
            {selectedTrack ? selectedTrack.title : 'Add Music'}
          </span>
          {selectedTrack && (
            <button onClick={e=>{e.stopPropagation();setSelectedTrack(null);audioRef.current?.pause()}} style={{background:'none',border:'none',color:'rgba(255,255,255,0.5)',cursor:'pointer',padding:0,fontSize:12,lineHeight:1,flexShrink:0}}>✕</button>
          )}
        </button>

        <button onClick={handleDone} style={{padding:'9px 20px',borderRadius:20,background:'linear-gradient(135deg,#FF3366,#FF6633)',border:'none',color:'white',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 3px 16px rgba(255,51,102,0.5)',display:'flex',alignItems:'center',gap:6}}>
          Next <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </div>

      {/* ── FULL-SCREEN PREVIEW ── */}
      <div style={{flex:1,position:'relative',overflow:'hidden',background:'#000',minHeight:0}}>
        {/* Media */}
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',filter:filterCSS||'none'}}>
          {activeClip?.type === 'video'
            ? <video src={activeClip?.url} style={{width:'100%',height:'100%',objectFit:'cover'}} muted playsInline loop autoPlay/>
            : activeClip?.url
              ? <img src={activeClip?.url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
              : <div style={{color:'rgba(255,255,255,0.2)',fontSize:14}}>No media selected</div>
          }
        </div>

        {/* Gradient vignette */}
        <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(0,0,0,0.4) 0%,transparent 20%,transparent 60%,rgba(0,0,0,0.7) 100%)',pointerEvents:'none'}}/>

        {/* Slide dots */}
        {clips.length > 1 && (
          <div style={{position:'absolute',top:'calc(env(safe-area-inset-top,0px)+62px)',left:0,right:0,display:'flex',justifyContent:'center',gap:5,zIndex:5,pointerEvents:'none'}}>
            {clips.map((_,i) => (
              <div key={i} style={{width:i===activeIdx?20:5,height:4,borderRadius:2,background:i===activeIdx?'white':'rgba(255,255,255,0.4)',transition:'all 0.25s'}}/>
            ))}
          </div>
        )}

        {/* Right side tools — floating */}
        <div style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',display:'flex',flexDirection:'column',gap:12,zIndex:10}}>
          {[
            { id:'filters', label:'Filter', icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg> },
            { id:'text',    label:'Text',   icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg> },
            { id:'speed',   label:'Speed',  icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> },
          ].map(({ id, label, icon }) => (
            <button key={id} onClick={() => setPanel(p => p === id ? null : id)} style={{width:46,height:46,borderRadius:14,background:panel===id?'rgba(255,51,102,0.3)':'rgba(0,0,0,0.55)',backdropFilter:'blur(10px)',border:`1.5px solid ${panel===id?'rgba(255,51,102,0.7)':'rgba(255,255,255,0.18)'}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:2,cursor:'pointer',transition:'all 0.15s',boxShadow:panel===id?'0 0 16px rgba(255,51,102,0.4)':'none'}}>
              <div style={{filter:panel===id?'drop-shadow(0 0 4px #FF3366)':'none',transition:'filter 0.15s'}}>{icon}</div>
              <span style={{fontSize:8,fontWeight:700,color:panel===id?'#FF3366':'rgba(255,255,255,0.6)',letterSpacing:'0.3px'}}>{label}</span>
            </button>
          ))}
        </div>

        {/* Filter label badge */}
        {activeClip?.filter && activeClip.filter !== 'Original' && (
          <div style={{position:'absolute',bottom:96,left:14,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:20,padding:'5px 12px',fontSize:11,fontWeight:700,color:'white',zIndex:5}}>
            ✦ {activeClip.filter}
          </div>
        )}
      </div>

      {/* ── CLIP STRIP + TIMELINE ── */}
      <div style={{background:'rgba(0,0,0,0.9)',backdropFilter:'blur(16px)',borderTop:'1px solid rgba(255,255,255,0.07)',flexShrink:0,paddingBottom:'calc(env(safe-area-inset-bottom,0px)+4px)'}}>

        {/* Progress bar */}
        <div style={{height:2,background:'rgba(255,255,255,0.08)',position:'relative',margin:'0'}}>
          <div style={{position:'absolute',left:0,top:0,height:'100%',width:`${timePercent}%`,background:'linear-gradient(90deg,#FF3366,#FF6633)',transition:'width 0.05s linear',borderRadius:1}}/>
        </div>

        {/* Controls */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 16px 6px'}}>
          <span style={{fontSize:11,color:'rgba(255,255,255,0.3)',fontVariantNumeric:'tabular-nums'}}>{fmtTime(currentTime)} / {fmtTime(totalDur)}</span>
          <div style={{display:'flex',gap:12,alignItems:'center'}}>
            <button onClick={() => { stopPlayback(); setCurrentTime(0); setActiveIdx(0) }} style={CS.ctrlBtn}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5" stroke="white" strokeWidth="2.5"/></svg>
            </button>
            <button onClick={togglePlay} style={{...CS.ctrlBtn,width:40,height:40,borderRadius:'50%',background:'linear-gradient(135deg,#FF3366,#FF6633)',boxShadow:'0 3px 14px rgba(255,51,102,0.5)',border:'none'}}>
              {playing
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="white" style={{marginLeft:2}}><polygon points="5 3 19 12 5 21 5 3"/></svg>
              }
            </button>
            <button onClick={() => addMoreRef.current?.click()} style={CS.ctrlBtn} title="Add media">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>
          {selectedTrack ? (
            <div style={{display:'flex',alignItems:'center',gap:5,maxWidth:100}}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FF3366" strokeWidth="2.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
              <span style={{fontSize:10,color:'rgba(255,255,255,0.5)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{selectedTrack.title}</span>
            </div>
          ) : <div style={{width:100}}/>}
        </div>

        {/* Clip thumbnails */}
        <div style={{display:'flex',gap:6,padding:'0 16px 10px',overflowX:'auto',scrollbarWidth:'none',alignItems:'center'}}>
          {clips.map((clip, i) => (
            <div key={i} onClick={() => { stopPlayback(); setActiveIdx(i); setCurrentTime(i * CLIP_SEC) }}
              style={{width:56,height:74,borderRadius:10,overflow:'hidden',flexShrink:0,cursor:'pointer',position:'relative',border:i===activeIdx?'2.5px solid #FF3366':'2px solid rgba(255,255,255,0.1)',transition:'border-color 0.15s',boxShadow:i===activeIdx?'0 0 0 1px rgba(255,51,102,0.4),0 4px 12px rgba(255,51,102,0.3)':'none'}}>
              {clip.type === 'video'
                ? <video src={clip.url} style={{width:'100%',height:'100%',objectFit:'cover',filter:FILTERS.find(f=>f.name===clip.filter)?.css||''}} muted playsInline/>
                : <img src={clip.url} alt="" style={{width:'100%',height:'100%',objectFit:'cover',filter:FILTERS.find(f=>f.name===clip.filter)?.css||''}}/>
              }
              {/* Active indicator */}
              {i === activeIdx && <div style={{position:'absolute',inset:0,border:'2px solid transparent',borderRadius:8,background:'rgba(255,51,102,0.08)'}}/>}
              {/* Filter dot */}
              {clip.filter && clip.filter !== 'Original' && (
                <div style={{position:'absolute',top:4,left:4,width:7,height:7,borderRadius:'50%',background:'#FF3366',boxShadow:'0 0 4px rgba(255,51,102,0.8)'}}/>
              )}
              {/* Video badge */}
              {clip.type === 'video' && <div style={{position:'absolute',bottom:3,right:3,opacity:0.8}}><svg width="10" height="10" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>}
              {/* Remove */}
              {clips.length > 1 && (
                <button onClick={e=>{e.stopPropagation();removeClip(i)}} style={{position:'absolute',top:3,right:3,width:16,height:16,borderRadius:'50%',background:'rgba(0,0,0,0.75)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:9,lineHeight:1}}>✕</button>
              )}
            </div>
          ))}
          {/* Add more */}
          {clips.length < 10 && (
            <button onClick={() => addMoreRef.current?.click()} style={{width:56,height:74,borderRadius:10,flexShrink:0,background:'rgba(255,255,255,0.04)',border:'1.5px dashed rgba(255,255,255,0.15)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4,cursor:'pointer'}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span style={{fontSize:8,color:'rgba(255,255,255,0.25)',fontWeight:700,letterSpacing:'0.5px'}}>ADD</span>
            </button>
          )}
        </div>
      </div>

      {/* ── PANELS ── */}
      {panel === 'filters' && (
        <FiltersPanel clip={activeClip} clipIndex={activeIdx} totalClips={clips.length}
          currentFilter={activeClip?.filter||'Original'} onSelect={setClipFilter} onClose={()=>setPanel(null)}/>
      )}
      {panel === 'sound' && (
        <SoundPanel
          tracks={tracks} loading={loadingTracks}
          selected={selectedTrack} previewing={previewTrack}
          musicStart={musicStart} totalDur={totalDur}
          query={musicQuery} genre={musicGenre}
          onQueryChange={setMusicQuery} onGenreChange={setMusicGenre}
          onMusicStartChange={setMusicStart}
          onSelect={t => { setSelectedTrack(t); setPreviewTrack(null); if(audioRef.current) audioRef.current.pause() }}
          onPreview={handlePreviewTrack}
          onClose={() => setPanel(null)}/>
      )}
      {panel === 'text' && (
        <TextPanel onAdd={() => setPanel(null)} onClose={() => setPanel(null)}/>
      )}
      {panel === 'speed' && (
        <SpeedPanel onClose={() => setPanel(null)}/>
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

// ── Control button base style ──────────────────────────────────────────────
const CS = {
  ctrlBtn: { width:34,height:34,borderRadius:'50%',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'background 0.15s' },
}

// ── SOUND PANEL ────────────────────────────────────────────────────────────
function SoundPanel({ tracks, loading, selected, previewing, musicStart, query, genre, onQueryChange, onGenreChange, onMusicStartChange, onSelect, onPreview, onClose }) {
  const GENRES = ['All','Pop','Electronic','Ambient','Hip-Hop','Rock','Jazz','Classical']
  return (
    <div style={P.overlay}>
      <div style={P.sheet}>
        <div style={P.handle}/>
        <div style={P.header}>
          <div>
            <div style={{fontSize:16,fontWeight:800}}>🎵 Add Sound</div>
            <div style={{fontSize:11,color:'#52525B',marginTop:2}}>Royalty-free music by Jamendo</div>
          </div>
          <button onClick={onClose} style={P.closeBtn}><XIcon/></button>
        </div>
        {/* Search bar */}
        <div style={{padding:'0 16px 10px',flexShrink:0}}>
          <div style={{position:'relative',display:'flex',alignItems:'center'}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" style={{position:'absolute',left:12,pointerEvents:'none'}}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input value={query} onChange={e=>onQueryChange(e.target.value)} placeholder="Search tracks, artists..."
              style={{width:'100%',padding:'11px 14px 11px 36px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:12,color:'white',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/>
            {query && <button onClick={()=>onQueryChange('')} style={{position:'absolute',right:10,background:'none',border:'none',color:'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:16,lineHeight:1}}>✕</button>}
          </div>
        </div>
        {/* Genre pills */}
        <div style={{display:'flex',gap:6,padding:'0 16px 12px',overflowX:'auto',scrollbarWidth:'none',flexShrink:0}}>
          {GENRES.map(g=>(
            <button key={g} onClick={()=>onGenreChange(g)} style={{flexShrink:0,padding:'5px 13px',borderRadius:20,fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all 0.15s',background:genre===g?'rgba(255,51,102,0.2)':'rgba(255,255,255,0.05)',border:`1px solid ${genre===g?'rgba(255,51,102,0.5)':'rgba(255,255,255,0.08)'}`,color:genre===g?'#FF3366':'rgba(255,255,255,0.5)'}}>
              {g}
            </button>
          ))}
        </div>
        {/* Track list */}
        <div style={{flex:1,overflowY:'auto',scrollbarWidth:'none'}}>
          {loading ? (
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,padding:'40px 0'}}>
              <Spinner/>
              <div style={{fontSize:12,color:'#52525B'}}>Loading music library...</div>
            </div>
          ) : (
            <>
              <TrackRow track={{id:null,title:'Original Sound',artist:'Use your media audio'}} isSelected={!selected} isPlaying={false} onSelect={()=>onSelect(null)} onPreview={()=>{}} noMusic/>
              <div style={{height:1,background:'rgba(255,255,255,0.05)',margin:'0 16px'}}/>
              {tracks.map(t=>(
                <TrackRow key={t.id} track={t} isSelected={selected?.id===t.id} isPlaying={previewing?.id===t.id}
                  onSelect={()=>onSelect(t)} onPreview={()=>onPreview(t)}/>
              ))}
              {!tracks.length && !loading && (
                <div style={{padding:'36px 24px',textAlign:'center'}}>
                  <div style={{fontSize:36,marginBottom:10,opacity:0.25}}>♪</div>
                  <div style={{fontSize:13,color:'#71717A',marginBottom:6}}>{query ? `No results for "${query}"` : 'No tracks found'}</div>
                  <div style={{fontSize:11,color:'#52525B'}}>Try a different genre or search term</div>
                </div>
              )}
            </>
          )}
        </div>
        {/* Trim slider */}
        {selected && (
          <div style={{padding:'12px 16px 20px',borderTop:'1px solid rgba(255,255,255,0.07)',flexShrink:0,background:'rgba(255,255,255,0.02)'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
              <div style={{width:34,height:34,borderRadius:10,overflow:'hidden',flexShrink:0,border:'1px solid rgba(255,255,255,0.1)'}}>
                {selected.cover_url ? <img src={selected.cover_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <div style={{width:'100%',height:'100%',background:'linear-gradient(135deg,#1a0035,#0d001a)',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FF3366" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:'white',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{selected.title}</div>
                <div style={{fontSize:11,color:'#52525B'}}>{selected.artist}</div>
              </div>
            </div>
            <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.3)',letterSpacing:1.2,marginBottom:8}}>START POSITION</div>
            <input type="range" min={0} max={selected.duration_sec||60} value={musicStart}
              onChange={e=>onMusicStartChange(Number(e.target.value))}
              style={{width:'100%',accentColor:'#FF3366',height:4,cursor:'pointer'}}/>
            <div style={{display:'flex',justifyContent:'space-between',marginTop:6,fontSize:10,color:'#52525B',fontVariantNumeric:'tabular-nums'}}>
              <span>{fmtTime(musicStart)}</span><span>{fmtTime(selected.duration_sec||60)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── TRACK ROW ──────────────────────────────────────────────────────────────
function TrackRow({ track, isSelected, isPlaying, onSelect, onPreview, noMusic }) {
  return (
    <div onClick={onSelect} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',cursor:'pointer',background:isSelected?'rgba(255,51,102,0.07)':'transparent',borderLeft:`3px solid ${isSelected?'#FF3366':'transparent'}`,transition:'background 0.15s'}}>
      <div style={{width:46,height:46,borderRadius:12,flexShrink:0,overflow:'hidden',position:'relative',background:noMusic?'rgba(255,255,255,0.04)':'linear-gradient(135deg,#0d001a,#1a0035)',border:`1px solid ${isSelected?'rgba(255,51,102,0.4)':'rgba(255,255,255,0.07)'}`,boxShadow:isSelected?'0 0 12px rgba(255,51,102,0.3)':'none'}}>
        {track.cover_url && !noMusic
          ? <img src={track.cover_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
          : <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center'}}>
              {noMusic
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.8"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isSelected?'#FF3366':'rgba(255,255,255,0.3)'} strokeWidth="1.8"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
              }
            </div>
        }
        {isPlaying && (
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.55)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div style={{display:'flex',gap:2,alignItems:'flex-end',height:16}}>
              {[0,1,2,3].map(i=><div key={i} style={{width:3,background:'#FF3366',borderRadius:1.5,animation:`wv${i%3} 0.5s ease-in-out infinite alternate`,animationDelay:`${i*0.1}s`}}/>)}
            </div>
          </div>
        )}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:14,fontWeight:isSelected?700:500,color:isSelected?'white':'rgba(255,255,255,0.85)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{track.title}</div>
        <div style={{fontSize:11,color:'#52525B',marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
          {track.artist||''}{track.genre&&!noMusic?` · ${track.genre}`:''}
        </div>
      </div>
      <div style={{display:'flex',gap:8,alignItems:'center',flexShrink:0}}>
        {track.duration_sec && <span style={{fontSize:11,color:'#52525B',fontVariantNumeric:'tabular-nums'}}>{fmtTime(track.duration_sec)}</span>}
        {!noMusic && (
          <button onClick={e=>{e.stopPropagation();onPreview()}} style={{width:34,height:34,borderRadius:'50%',background:isPlaying?'rgba(255,51,102,0.2)':'rgba(255,255,255,0.06)',border:`1px solid ${isPlaying?'rgba(255,51,102,0.4)':'rgba(255,255,255,0.1)'}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'all 0.15s'}}>
            {isPlaying
              ? <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
              : <svg width="10" height="10" viewBox="0 0 24 24" fill="white" style={{marginLeft:1}}><polygon points="5 3 19 12 5 21 5 3"/></svg>
            }
          </button>
        )}
        {isSelected && <div style={{width:22,height:22,borderRadius:'50%',background:'linear-gradient(135deg,#FF3366,#FF6633)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 2px 8px rgba(255,51,102,0.5)'}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg></div>}
      </div>
    </div>
  )
}

// ── FILTERS PANEL ──────────────────────────────────────────────────────────
function FiltersPanel({ clip, clipIndex, totalClips, currentFilter, onSelect, onClose }) {
  return (
    <div style={P.overlay}>
      <div style={{...P.sheet,maxHeight:'50%'}}>
        <div style={P.handle}/>
        <div style={P.header}>
          <div>
            <div style={{fontSize:16,fontWeight:800}}>✨ Filters</div>
            {totalClips>1&&<div style={{fontSize:11,color:'#52525B',marginTop:2}}>Clip {clipIndex+1} of {totalClips} — each clip can have its own</div>}
          </div>
          <button onClick={onClose} style={P.closeBtn}><XIcon/></button>
        </div>
        <div style={{display:'flex',gap:10,padding:'8px 16px 20px',overflowX:'auto',scrollbarWidth:'none'}}>
          {FILTERS.map(f=>(
            <div key={f.name} onClick={()=>onSelect(f.name)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:7,flexShrink:0,cursor:'pointer'}}>
              <div style={{width:68,height:82,borderRadius:14,overflow:'hidden',border:currentFilter===f.name?'2.5px solid #FF3366':'2px solid rgba(255,255,255,0.07)',boxShadow:currentFilter===f.name?'0 0 0 2px rgba(255,51,102,0.3),0 6px 20px rgba(255,51,102,0.2)':'none',transition:'all 0.2s',position:'relative'}}>
                {clip?.url
                  ? (clip.type==='video'
                    ? <video src={clip.url} style={{width:'100%',height:'100%',objectFit:'cover',filter:f.css||'none'}} muted playsInline/>
                    : <img src={clip.url} alt={f.name} style={{width:'100%',height:'100%',objectFit:'cover',filter:f.css||'none'}}/>)
                  : <div style={{width:'100%',height:'100%',background:'#141414',filter:f.css||'none'}}/>
                }
                {currentFilter===f.name && <div style={{position:'absolute',bottom:5,right:5,width:16,height:16,borderRadius:'50%',background:'#FF3366',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg></div>}
              </div>
              <span style={{fontSize:10,fontWeight:currentFilter===f.name?700:400,color:currentFilter===f.name?'white':'rgba(255,255,255,0.35)',letterSpacing:'0.3px'}}>{f.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── TEXT PANEL ─────────────────────────────────────────────────────────────
function TextPanel({ onAdd, onClose }) {
  const [text, setText] = useState('')
  const [color, setColor] = useState('#FFFFFF')
  const [size, setSize] = useState('medium')
  const [style, setStyle] = useState('bold')
  const COLORS = ['#FFFFFF','#FF3366','#F97316','#22C55E','#3B82F6','#7C3AED','#FBBF24','#EC4899','#000000']
  const STYLES = [{id:'bold',label:'Bold'},{id:'outline',label:'Outline'},{id:'shadow',label:'Shadow'}]
  const SIZES = [{id:'small',label:'S',px:16},{id:'medium',label:'M',px:24},{id:'large',label:'L',px:34}]
  const fontSize = SIZES.find(s=>s.id===size)?.px||24
  const textStyle = style==='outline' ? {WebkitTextStroke:`1.5px ${color==='#FFFFFF'?'#000':'#fff'}`,color:'transparent'}
                   : style==='shadow' ? {textShadow:`0 2px 12px rgba(0,0,0,0.9),0 0 30px ${color}88`}
                   : {fontWeight:900}
  return (
    <div style={P.overlay}>
      <div style={{...P.sheet,maxHeight:'70%'}}>
        <div style={P.handle}/>
        <div style={P.header}>
          <div style={{fontSize:16,fontWeight:800}}>T Add Text</div>
          <button onClick={onClose} style={P.closeBtn}><XIcon/></button>
        </div>
        <div style={{padding:'0 16px 24px',display:'flex',flexDirection:'column',gap:14,overflowY:'auto',scrollbarWidth:'none'}}>
          {/* Live preview */}
          <div style={{background:'rgba(255,255,255,0.03)',borderRadius:14,padding:'20px 16px',textAlign:'center',minHeight:70,display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid rgba(255,255,255,0.06)',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',inset:0,backgroundImage:'repeating-linear-gradient(45deg,rgba(255,255,255,0.015) 0px,rgba(255,255,255,0.015) 1px,transparent 1px,transparent 10px)',backgroundSize:'10px 10px'}}/>
            {text ? (
              <span style={{color,fontSize,lineHeight:1.3,wordBreak:'break-word',textAlign:'center',position:'relative',...textStyle}}>{text}</span>
            ) : (
              <span style={{color:'rgba(255,255,255,0.2)',fontSize:13,fontStyle:'italic'}}>Your text appears here</span>
            )}
          </div>
          {/* Input */}
          <input value={text} onChange={e=>setText(e.target.value)} maxLength={60} placeholder="Type something..."
            style={{width:'100%',padding:'13px 14px',background:'rgba(255,255,255,0.06)',border:'1.5px solid rgba(255,255,255,0.12)',borderRadius:12,color:'white',fontSize:15,outline:'none',fontFamily:'inherit',boxSizing:'border-box',transition:'border-color 0.2s'}}
            autoFocus/>
          {/* Color swatches */}
          <div>
            <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.3)',letterSpacing:1.2,marginBottom:10}}>COLOR</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {COLORS.map(c=>(
                <button key={c} onClick={()=>setColor(c)} style={{width:30,height:30,borderRadius:'50%',background:c,border:color===c?`3px solid white`:'3px solid transparent',cursor:'pointer',boxShadow:color===c?`0 0 0 2px ${c},0 0 12px ${c}66`:'none',transition:'all 0.15s',flexShrink:0}}/>
              ))}
            </div>
          </div>
          {/* Size + style row */}
          <div style={{display:'flex',gap:12}}>
            <div style={{flex:1}}>
              <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.3)',letterSpacing:1.2,marginBottom:8}}>SIZE</div>
              <div style={{display:'flex',gap:6}}>
                {SIZES.map(s=>(
                  <button key={s.id} onClick={()=>setSize(s.id)} style={{flex:1,padding:'8px',borderRadius:10,fontWeight:800,fontSize:14,cursor:'pointer',fontFamily:'inherit',transition:'all 0.15s',background:size===s.id?'rgba(255,51,102,0.2)':'rgba(255,255,255,0.05)',border:`1.5px solid ${size===s.id?'#FF3366':'rgba(255,255,255,0.08)'}`,color:size===s.id?'#FF3366':'rgba(255,255,255,0.5)'}}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{flex:2}}>
              <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.3)',letterSpacing:1.2,marginBottom:8}}>STYLE</div>
              <div style={{display:'flex',gap:6}}>
                {STYLES.map(s=>(
                  <button key={s.id} onClick={()=>setStyle(s.id)} style={{flex:1,padding:'8px 4px',borderRadius:10,fontWeight:700,fontSize:11,cursor:'pointer',fontFamily:'inherit',transition:'all 0.15s',background:style===s.id?'rgba(255,51,102,0.2)':'rgba(255,255,255,0.05)',border:`1.5px solid ${style===s.id?'#FF3366':'rgba(255,255,255,0.08)'}`,color:style===s.id?'#FF3366':'rgba(255,255,255,0.5)',whiteSpace:'nowrap'}}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {/* Add button */}
          <button onClick={()=>{if(text.trim())onAdd()}} disabled={!text.trim()}
            style={{padding:'14px',background:text.trim()?'linear-gradient(135deg,#FF3366,#FF6633)':'rgba(255,255,255,0.05)',border:'none',borderRadius:13,color:'white',fontSize:15,fontWeight:700,cursor:text.trim()?'pointer':'default',fontFamily:'inherit',opacity:text.trim()?1:0.4,boxShadow:text.trim()?'0 4px 20px rgba(255,51,102,0.4)':'none',transition:'all 0.2s'}}>
            Add to Video
          </button>
        </div>
      </div>
    </div>
  )
}

// ── SPEED PANEL ────────────────────────────────────────────────────────────
function SpeedPanel({ onClose }) {
  const [speed, setSpeed] = useState(1)
  const SPEEDS = [{v:0.3,label:'0.3x'},{v:0.5,label:'0.5x'},{v:1,label:'1x'},{v:1.5,label:'1.5x'},{v:2,label:'2x'},{v:3,label:'3x'}]
  return (
    <div style={P.overlay}>
      <div style={{...P.sheet,maxHeight:'40%'}}>
        <div style={P.handle}/>
        <div style={P.header}>
          <div style={{fontSize:16,fontWeight:800}}>⚡ Speed</div>
          <button onClick={onClose} style={P.closeBtn}><XIcon/></button>
        </div>
        <div style={{padding:'0 16px 24px'}}>
          <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
            {SPEEDS.map(s=>(
              <button key={s.v} onClick={()=>setSpeed(s.v)} style={{padding:'12px 20px',borderRadius:12,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',transition:'all 0.15s',background:speed===s.v?'rgba(255,51,102,0.2)':'rgba(255,255,255,0.05)',border:`1.5px solid ${speed===s.v?'#FF3366':'rgba(255,255,255,0.08)'}`,color:speed===s.v?'#FF3366':'rgba(255,255,255,0.6)',boxShadow:speed===s.v?'0 0 14px rgba(255,51,102,0.3)':'none'}}>
                {s.label}
              </button>
            ))}
          </div>
          <div style={{marginTop:16,textAlign:'center',fontSize:12,color:'rgba(255,255,255,0.3)'}}>
            {speed < 1 ? 'Slow motion' : speed > 1 ? 'Fast forward' : 'Normal speed'}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── MICRO COMPONENTS ───────────────────────────────────────────────────────
function Spinner() {
  return <div style={{width:24,height:24,border:'2.5px solid rgba(255,255,255,0.08)',borderTopColor:'#FF3366',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
}
function XIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
}
function fmtTime(s) {
  s = Math.floor(s||0)
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`
}

// ── PANEL STYLES ───────────────────────────────────────────────────────────
const P = {
  overlay: { position:'fixed',inset:0,zIndex:400,display:'flex',alignItems:'flex-end',background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)' },
  sheet:   { width:'100%',maxHeight:'75%',background:'#0d0d0d',borderRadius:'20px 20px 0 0',border:'1px solid rgba(255,255,255,0.08)',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 -8px 40px rgba(0,0,0,0.6)' },
  handle:  { width:36,height:4,borderRadius:2,background:'rgba(255,255,255,0.15)',margin:'12px auto 4px',flexShrink:0 },
  header:  { display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 16px 12px',borderBottom:'1px solid rgba(255,255,255,0.07)',flexShrink:0 },
  closeBtn:{ width:30,height:30,borderRadius:'50%',background:'rgba(255,255,255,0.07)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' },
}
