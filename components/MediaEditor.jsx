/**
 * MediaEditor — TikTok/CapCut style
 * - Full screen preview with sliding images
 * - Bottom timeline: image clips + music bar
 * - Right side tool strip: Sound, Text, Effects, Filters, Crop
 * - Music from Supabase music_tracks
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const CLIP_DURATION = 3   // seconds per image in slideshow
const FILTERS = [
  { name:'Original', css:'' },
  { name:'Vivid',    css:'saturate(1.6) contrast(1.1)' },
  { name:'Matte',    css:'contrast(0.9) saturate(0.8) brightness(1.05)' },
  { name:'Cool',     css:'hue-rotate(20deg) saturate(1.1) brightness(1.05)' },
  { name:'Warm',     css:'hue-rotate(-15deg) saturate(1.2) brightness(1.05)' },
  { name:'Fade',     css:'contrast(0.85) brightness(1.1) saturate(0.75)' },
  { name:'Mono',     css:'grayscale(1)' },
  { name:'Drama',    css:'contrast(1.3) saturate(1.2) brightness(0.95)' },
]

export default function MediaEditor({ mediaFiles: initialFiles, onDone, onBack }) {
  const [files,         setFiles]         = useState(initialFiles)
  const [activeIdx,     setActiveIdx]     = useState(0)
  const [playing,       setPlaying]       = useState(false)
  const [currentTime,   setCurrentTime]   = useState(0)
  const [filter,        setFilter]        = useState('Original')
  const [rightTool,     setRightTool]     = useState(null) // null|'sound'|'filters'|'text'|'effects'|'crop'
  const [tracks,        setTracks]        = useState([])
  const [selectedTrack, setSelectedTrack] = useState(null)
  const [previewTrack,  setPreviewTrack]  = useState(null)
  const [loadingTracks, setLoadingTracks] = useState(false)
  const [musicStart,    setMusicStart]    = useState(0)

  const timerRef     = useRef(null)
  const audioRef     = useRef(null)
  const timelineRef  = useRef(null)

  const totalDuration = files.length * CLIP_DURATION

  // ── Playback engine ───────────────────────────────────────────────────────
  const stopPlayback = useCallback(() => {
    clearInterval(timerRef.current)
    setPlaying(false)
    audioRef.current?.pause()
  }, [])

  const startPlayback = useCallback(() => {
    if (selectedTrack && audioRef.current) {
      audioRef.current.src = selectedTrack.file_url
      audioRef.current.currentTime = musicStart
      audioRef.current.play()
    }
    setPlaying(true)
    timerRef.current = setInterval(() => {
      setCurrentTime(t => {
        const next = t + 0.05
        if (next >= totalDuration) {
          stopPlayback()
          setCurrentTime(0)
          setActiveIdx(0)
          return 0
        }
        setActiveIdx(Math.floor(next / CLIP_DURATION))
        return next
      })
    }, 50)
  }, [selectedTrack, musicStart, totalDuration, stopPlayback])

  const togglePlay = () => { playing ? stopPlayback() : startPlayback() }

  useEffect(() => () => clearInterval(timerRef.current), [])

  // ── Sound tab: load tracks ────────────────────────────────────────────────
  useEffect(() => {
    if (rightTool !== 'sound') return
    if (tracks.length) return
    setLoadingTracks(true)
    supabase.from('music_tracks').select('*').eq('is_active', true)
      .order('play_count', { ascending: false }).limit(30)
      .then(({ data }) => { setTracks(data || []); setLoadingTracks(false) })
  }, [rightTool])

  const handlePreviewTrack = (track) => {
    if (previewTrack?.id === track.id) {
      audioRef.current?.pause()
      setPreviewTrack(null)
    } else {
      setPreviewTrack(track)
      if (audioRef.current) {
        audioRef.current.src = track.file_url
        audioRef.current.currentTime = 0
        audioRef.current.play()
      }
    }
  }

  // ── Remove a clip ─────────────────────────────────────────────────────────
  const removeClip = (idx) => {
    if (files.length <= 1) return
    const next = files.filter((_,i) => i !== idx)
    setFiles(next)
    setActiveIdx(Math.min(idx, next.length - 1))
    stopPlayback(); setCurrentTime(0)
  }

  // ── Reorder: move clip left ───────────────────────────────────────────────
  const moveLeft = (idx) => {
    if (idx === 0) return
    const next = [...files]
    ;[next[idx-1], next[idx]] = [next[idx], next[idx-1]]
    setFiles(next)
  }

  // ── Handle done ───────────────────────────────────────────────────────────
  const handleDone = () => {
    stopPlayback()
    onDone({
      mediaFiles: files,
      filter,
      composedFilter: FILTERS.find(f=>f.name===filter)?.css || '',
      selectedTrack,
      musicStart,
    })
  }

  const composedFilter = FILTERS.find(f => f.name === filter)?.css || ''
  const timePercent    = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0

  return (
    <div style={S.page}>
      <audio ref={audioRef} style={{display:'none'}} />

      {/* ── TOP BAR ── */}
      <div style={S.topBar}>
        <button onClick={onBack} style={S.iconBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>

        {/* Music now-playing pill (TikTok-style top center) */}
        {selectedTrack ? (
          <div style={S.musicPill}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            <span style={{fontSize:12,fontWeight:600,maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{selectedTrack.title}</span>
            <button onClick={()=>{setSelectedTrack(null);audioRef.current?.pause()}} style={{background:'none',border:'none',color:'rgba(255,255,255,0.5)',cursor:'pointer',padding:'0 0 0 4px',fontSize:13,lineHeight:1}}>✕</button>
          </div>
        ) : (
          <div style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,0.4)'}}>Edit</div>
        )}

        <button onClick={handleDone} style={S.nextBtn}>
          Next
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </div>

      {/* ── MAIN PREVIEW ── */}
      <div style={S.previewArea}>
        {/* Full screen image */}
        <div style={{...S.previewFrame, filter: composedFilter || 'none'}}>
          {files[activeIdx] && (
            files[activeIdx].type === 'video'
              ? <video src={files[activeIdx].url} style={S.previewMedia} muted loop playsInline autoPlay/>
              : <img src={files[activeIdx].url} alt="" style={S.previewMedia}/>
          )}
        </div>

        {/* Image counter dots */}
        {files.length > 1 && (
          <div style={S.dotRow}>
            {files.map((_,i) => (
              <div key={i} onClick={()=>{setActiveIdx(i);stopPlayback();setCurrentTime(i*CLIP_DURATION)}} style={{
                width: i===activeIdx ? 18 : 6, height: 6, borderRadius: 3,
                background: i===activeIdx ? 'white' : 'rgba(255,255,255,0.3)',
                cursor:'pointer', transition:'all 0.25s',
              }}/>
            ))}
          </div>
        )}

        {/* Right tool strip */}
        <div style={S.rightStrip}>
          {[
            { id:'sound',   icon: <MusicIcon/>,   label:'Sound'   },
            { id:'text',    icon: <TextIcon/>,    label:'Text'    },
            { id:'effects', icon: <EffectsIcon/>, label:'Effects' },
            { id:'filters', icon: <FiltersIcon/>, label:'Filters' },
            { id:'crop',    icon: <CropIcon/>,    label:'Crop'    },
          ].map(tool => (
            <button key={tool.id} onClick={()=>setRightTool(rightTool===tool.id?null:tool.id)} style={{
              ...S.rightBtn,
              opacity: tool.id===rightTool ? 1 : 0.7,
            }}>
              {tool.icon}
              <span style={{fontSize:9,color:'white',marginTop:3,fontWeight:500}}>{tool.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── TIMELINE ── */}
      <div style={S.timelineSection}>
        {/* Time + playback controls */}
        <div style={S.timeRow}>
          <span style={{fontSize:12,color:'rgba(255,255,255,0.45)',fontVariantNumeric:'tabular-nums'}}>
            {fmtTime(currentTime)} / {fmtTime(totalDuration)}
          </span>
          <div style={{display:'flex',gap:12,alignItems:'center'}}>
            <button onClick={()=>{stopPlayback();setCurrentTime(0);setActiveIdx(0)}} style={S.ctrlBtn}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></svg>
            </button>
            <button onClick={togglePlay} style={S.playBtn}>
              {playing
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              }
            </button>
            <button onClick={()=>{}} style={S.ctrlBtn}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 014-4h12"/></svg>
            </button>
          </div>
          <button style={{...S.ctrlBtn, opacity:0.5}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
          </button>
        </div>

        {/* Scrollable timeline tracks */}
        <div ref={timelineRef} style={S.timeline}>
          {/* Playhead */}
          <div style={{...S.playhead, left:`${timePercent}%`}}/>

          {/* Time ruler */}
          <div style={S.ruler}>
            {Array.from({length: Math.ceil(totalDuration) + 1}, (_,i) => (
              <div key={i} style={{position:'absolute',left:`${(i/totalDuration)*100}%`,display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                <div style={{width:1,height:6,background:'rgba(255,255,255,0.2)'}}/>
                <span style={{fontSize:9,color:'rgba(255,255,255,0.3)',fontVariantNumeric:'tabular-nums'}}>{fmtTime(i)}</span>
              </div>
            ))}
          </div>

          {/* Image clip track */}
          <div style={S.trackRow}>
            <div style={{width:28,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
            </div>
            <div style={{flex:1,position:'relative',height:'100%',display:'flex',gap:2}}>
              {files.map((f,i) => (
                <div key={i} onClick={()=>{setActiveIdx(i);stopPlayback();setCurrentTime(i*CLIP_DURATION)}}
                  style={{
                    flex:`0 0 ${(CLIP_DURATION/totalDuration)*100}%`,
                    height:'100%', borderRadius:6, overflow:'hidden',
                    border: i===activeIdx ? '2px solid #FF3366' : '2px solid transparent',
                    position:'relative', cursor:'pointer', transition:'border-color 0.15s',
                    boxShadow: i===activeIdx ? '0 0 0 1px #FF3366' : 'none',
                  }}>
                  <img src={f.url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                  {/* Remove button */}
                  {files.length > 1 && (
                    <button onClick={e=>{e.stopPropagation();removeClip(i)}} style={{position:'absolute',top:2,right:2,width:16,height:16,borderRadius:'50%',background:'rgba(0,0,0,0.7)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:9,lineHeight:1}}>✕</button>
                  )}
                  {/* Move left */}
                  {i > 0 && (
                    <button onClick={e=>{e.stopPropagation();moveLeft(i)}} style={{position:'absolute',bottom:2,left:2,width:16,height:16,borderRadius:4,background:'rgba(0,0,0,0.6)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:9}}>←</button>
                  )}
                </div>
              ))}
              {/* Add more clip button */}
              <div style={{flexShrink:0,width:44,height:'100%',borderRadius:6,background:'rgba(255,255,255,0.05)',border:'1.5px dashed rgba(255,255,255,0.12)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
            </div>
          </div>

          {/* Music track */}
          {selectedTrack && (
            <div style={S.trackRow}>
              <div style={{width:28,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FF3366" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
              </div>
              <div style={{flex:1,height:'100%',borderRadius:6,background:'rgba(255,51,102,0.15)',border:'1px solid rgba(255,51,102,0.3)',display:'flex',alignItems:'center',padding:'0 10px',gap:7,overflow:'hidden'}}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FF3366" strokeWidth="2.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                <span style={{fontSize:11,fontWeight:600,color:'#FF3366',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{selectedTrack.title}</span>
                {/* Waveform bars */}
                <div style={{display:'flex',gap:1.5,alignItems:'flex-end',height:16,marginLeft:'auto',flexShrink:0}}>
                  {Array.from({length:16},(_,i)=>(
                    <div key={i} style={{width:2,background:'rgba(255,51,102,0.5)',borderRadius:1,height:`${6+Math.sin(i*0.7)*5+Math.random()*4}px`}}/>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT TOOL PANELS ── */}
      {rightTool === 'sound'   && <SoundPanel tracks={tracks} loading={loadingTracks} selected={selectedTrack} previewing={previewTrack} musicStart={musicStart} onMusicStartChange={setMusicStart} onSelect={t=>{setSelectedTrack(t);setPreviewTrack(null);audioRef.current?.pause()}} onPreview={handlePreviewTrack} onClose={()=>setRightTool(null)}/>}
      {rightTool === 'filters' && <FiltersPanel current={files[activeIdx]} filter={filter} onSelect={setFilter} onClose={()=>setRightTool(null)}/>}
      {rightTool === 'text'    && <ComingSoonPanel label="Text overlays" onClose={()=>setRightTool(null)}/>}
      {rightTool === 'effects' && <ComingSoonPanel label="Effects"       onClose={()=>setRightTool(null)}/>}
      {rightTool === 'crop'    && <ComingSoonPanel label="Crop tool"     onClose={()=>setRightTool(null)}/>}
    </div>
  )
}

// ── Sub-panels ────────────────────────────────────────────────────────────────

function SoundPanel({ tracks, loading, selected, previewing, musicStart, onMusicStartChange, onSelect, onPreview, onClose }) {
  return (
    <div style={P.overlay}>
      <div style={P.sheet}>
        <div style={P.sheetHandle}/>
        <div style={P.sheetHeader}>
          <span style={{fontSize:15,fontWeight:700}}>Add Sound</span>
          <button onClick={onClose} style={P.closeBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style={{flex:1,overflowY:'auto',scrollbarWidth:'none'}}>
          {loading && <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:32}}><Spinner/></div>}
          {/* No sound option */}
          <SoundRow track={{id:null,title:'Original Audio',artist:'No music added'}} isSelected={!selected} isPlaying={false}
            onSelect={()=>onSelect(null)} onPreview={()=>{}} noMusic/>
          <div style={{height:1,background:'rgba(255,255,255,0.05)',margin:'0 16px'}}/>
          {tracks.map(t=>(
            <SoundRow key={t.id} track={t} isSelected={selected?.id===t.id} isPlaying={previewing?.id===t.id}
              onSelect={()=>onSelect(t)} onPreview={()=>onPreview(t)}/>
          ))}
          {!loading && tracks.length===0 && (
            <div style={{padding:'32px 20px',textAlign:'center'}}>
              <div style={{fontSize:13,color:'#71717A'}}>No tracks available yet</div>
            </div>
          )}
        </div>
        {selected && (
          <div style={{padding:'10px 16px 16px',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
            <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.3)',letterSpacing:1.2,marginBottom:8}}>START FROM</div>
            <input type="range" min={0} max={selected.duration_sec||60} value={musicStart}
              onChange={e=>onMusicStartChange(Number(e.target.value))}
              style={{width:'100%',accentColor:'#FF3366'}}/>
            <div style={{display:'flex',justifyContent:'space-between',marginTop:4,fontSize:10,color:'#52525B'}}>
              <span>{fmtTime(musicStart)}</span><span>{fmtTime(selected.duration_sec||60)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SoundRow({ track, isSelected, isPlaying, onSelect, onPreview, noMusic }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',cursor:'pointer',background:isSelected?'rgba(255,51,102,0.06)':'transparent',borderLeft:isSelected?'3px solid #FF3366':'3px solid transparent',transition:'all 0.15s'}} onClick={onSelect}>
      <div style={{width:42,height:42,borderRadius:10,background:noMusic?'rgba(255,255,255,0.04)':'linear-gradient(135deg,#1a1a2e,#2d0050)',display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid rgba(255,255,255,0.07)',flexShrink:0,position:'relative'}}>
        {noMusic
          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/></svg>
          : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isSelected?'#FF3366':'rgba(255,255,255,0.35)'} strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
        }
        {isPlaying && <div style={{position:'absolute',inset:0,borderRadius:10,background:'rgba(255,51,102,0.2)',display:'flex',alignItems:'center',justifyContent:'center'}}><EqBars/></div>}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13,fontWeight:isSelected?700:500,color:isSelected?'white':'rgba(255,255,255,0.75)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{track.title}</div>
        <div style={{fontSize:11,color:'#52525B',marginTop:1}}>{track.artist||''}</div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
        {track.duration_sec && <span style={{fontSize:11,color:'#52525B'}}>{fmtTime(track.duration_sec)}</span>}
        {!noMusic && (
          <button onClick={e=>{e.stopPropagation();onPreview()}} style={{width:30,height:30,borderRadius:'50%',background:isPlaying?'rgba(255,51,102,0.15)':'rgba(255,255,255,0.06)',border:`1px solid ${isPlaying?'rgba(255,51,102,0.3)':'rgba(255,255,255,0.08)'}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
            {isPlaying
              ? <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
              : <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            }
          </button>
        )}
        {isSelected && <div style={{width:18,height:18,borderRadius:'50%',background:'#FF3366',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><path d="M20 6L9 17l-5-5"/></svg></div>}
      </div>
    </div>
  )
}

function FiltersPanel({ current, filter, onSelect, onClose }) {
  return (
    <div style={P.overlay}>
      <div style={{...P.sheet,maxHeight:'55%'}}>
        <div style={P.sheetHandle}/>
        <div style={P.sheetHeader}>
          <span style={{fontSize:15,fontWeight:700}}>Filters</span>
          <button onClick={onClose} style={P.closeBtn}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <div style={{display:'flex',gap:12,padding:'8px 16px 20px',overflowX:'auto',scrollbarWidth:'none'}}>
          {FILTERS.map(f=>(
            <div key={f.name} onClick={()=>onSelect(f.name)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,flexShrink:0,cursor:'pointer'}}>
              <div style={{width:68,height:68,borderRadius:12,overflow:'hidden',border:filter===f.name?'2.5px solid #FF3366':'2px solid transparent',boxShadow:filter===f.name?'0 0 0 1px #FF3366':'none',transition:'all 0.2s'}}>
                {current && <img src={current.url} alt={f.name} style={{width:'100%',height:'100%',objectFit:'cover',filter:f.css||'none'}}/>}
              </div>
              <span style={{fontSize:10,fontWeight:filter===f.name?700:400,color:filter===f.name?'white':'rgba(255,255,255,0.4)',letterSpacing:'0.2px'}}>{f.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ComingSoonPanel({ label, onClose }) {
  return (
    <div style={P.overlay}>
      <div style={{...P.sheet,maxHeight:'40%'}}>
        <div style={P.sheetHandle}/>
        <div style={P.sheetHeader}>
          <span style={{fontSize:15,fontWeight:700}}>{label}</span>
          <button onClick={onClose} style={P.closeBtn}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10,padding:'24px 24px 32px'}}>
          <div style={{width:52,height:52,borderRadius:14,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"><path d="M12 3l1.45 2.94L16.9 6.55l-2.45 2.39.58 3.37L12 10.5l-3.03 1.81.58-3.37L7.1 6.55l3.45-.61L12 3z"/></svg>
          </div>
          <div style={{fontSize:14,fontWeight:600,color:'#A1A1AA'}}>{label} coming soon</div>
          <div style={{fontSize:12,color:'#52525B',textAlign:'center',lineHeight:1.5}}>This feature is in development and will be available soon.</div>
        </div>
      </div>
    </div>
  )
}

// ── Micro components ──────────────────────────────────────────────────────────
function EqBars() {
  return (
    <div style={{display:'flex',gap:2,alignItems:'flex-end',height:14}}>
      {[0,1,2].map(i=>(
        <div key={i} style={{width:3,background:'#FF3366',borderRadius:1.5,animation:`eq 0.6s ease-in-out infinite alternate`,animationDelay:`${i*0.15}s`,height:'60%'}}/>
      ))}
      <style>{`@keyframes eq{from{height:30%}to{height:90%}}`}</style>
    </div>
  )
}
function Spinner() {
  return <div style={{width:22,height:22,border:'2px solid rgba(255,255,255,0.1)',borderTopColor:'#FF3366',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
}

// SVG icons for right strip
const iconProps = { width:20, height:20, viewBox:"0 0 24 24", fill:"none", stroke:"white", strokeWidth:2, strokeLinecap:"round", strokeLinejoin:"round" }
function MusicIcon()   { return <svg {...iconProps}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg> }
function TextIcon()    { return <svg {...iconProps}><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg> }
function EffectsIcon() { return <svg {...iconProps}><path d="M12 3l1.45 2.94L16.9 6.55l-2.45 2.39.58 3.37L12 10.5l-3.03 1.81.58-3.37L7.1 6.55l3.45-.61L12 3z"/></svg> }
function FiltersIcon() { return <svg {...iconProps}><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg> }
function CropIcon()    { return <svg {...iconProps}><polyline points="6.13 1 6 16 21 15.87"/><polyline points="1 6.13 16 6 15.87 21"/></svg> }

function fmtTime(s) {
  s = Math.floor(s || 0)
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page:        { position:'fixed',inset:0,zIndex:310,background:'#000',display:'flex',flexDirection:'column',fontFamily:"'Inter',sans-serif",color:'#fff' },
  topBar:      { display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px 8px',flexShrink:0,zIndex:10 },
  iconBtn:     { width:36,height:36,borderRadius:'50%',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.09)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer' },
  musicPill:   { display:'flex',alignItems:'center',gap:6,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:20,padding:'5px 12px',maxWidth:160 },
  nextBtn:     { display:'flex',alignItems:'center',gap:6,padding:'8px 18px',borderRadius:20,background:'#FF3366',border:'none',color:'white',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 2px 12px rgba(255,51,102,0.4)' },
  previewArea: { flex:1,position:'relative',display:'flex',alignItems:'center',justifyContent:'center',background:'#000',overflow:'hidden',minHeight:0 },
  previewFrame:{ width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',transition:'filter 0.25s' },
  previewMedia:{ maxWidth:'100%',maxHeight:'100%',objectFit:'contain' },
  dotRow:      { position:'absolute',bottom:12,left:0,right:0,display:'flex',alignItems:'center',justifyContent:'center',gap:5 },
  rightStrip:  { position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',display:'flex',flexDirection:'column',gap:6,zIndex:10 },
  rightBtn:    { width:44,height:54,borderRadius:10,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(8px)',border:'1px solid rgba(255,255,255,0.08)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:1,cursor:'pointer',transition:'opacity 0.2s' },
  timelineSection: { flexShrink:0,background:'#0d0d0d',borderTop:'1px solid rgba(255,255,255,0.06)',paddingBottom:'calc(env(safe-area-inset-bottom,0px) + 4px)' },
  timeRow:     { display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 14px 4px' },
  ctrlBtn:     { width:28,height:28,borderRadius:8,background:'rgba(255,255,255,0.06)',border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer' },
  playBtn:     { width:36,height:36,borderRadius:'50%',background:'#FF3366',border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',boxShadow:'0 2px 10px rgba(255,51,102,0.4)' },
  timeline:    { position:'relative',padding:'4px 14px 12px',overflowX:'auto',scrollbarWidth:'none',minHeight:90 },
  ruler:       { position:'relative',height:18,marginBottom:4 },
  playhead:    { position:'absolute',top:0,bottom:0,width:2,background:'#FF3366',zIndex:5,pointerEvents:'none',boxShadow:'0 0 6px rgba(255,51,102,0.6)',transition:'left 0.05s' },
  trackRow:    { display:'flex',gap:6,alignItems:'stretch',height:52,marginBottom:5 },
}
const P = {
  overlay:     { position:'absolute',bottom:0,left:0,right:0,zIndex:20,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(6px)' },
  sheet:       { background:'#0d0d0d',borderRadius:'18px 18px 0 0',border:'1px solid rgba(255,255,255,0.07)',borderBottom:'none',display:'flex',flexDirection:'column',maxHeight:'65%' },
  sheetHandle: { width:36,height:4,borderRadius:20,background:'rgba(255,255,255,0.12)',margin:'9px auto 0',flexShrink:0 },
  sheetHeader: { display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 16px 8px',borderBottom:'1px solid rgba(255,255,255,0.06)',flexShrink:0 },
  closeBtn:    { width:28,height:28,borderRadius:'50%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer' },
}
