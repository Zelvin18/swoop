/**
 * MediaEditor — professional photo/video editor
 * Tabs: Filters · Crop · Trim (video) · Music
 * Pure browser APIs + canvas. No external libraries.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ── CSS filters ───────────────────────────────────────────────────────────────
const FILTERS = [
  { name:'Original', css:'' },
  { name:'Vivid',    css:'saturate(1.6) contrast(1.1)' },
  { name:'Matte',    css:'contrast(0.9) saturate(0.8) brightness(1.05)' },
  { name:'Cool',     css:'hue-rotate(20deg) saturate(1.1) brightness(1.05)' },
  { name:'Warm',     css:'hue-rotate(-15deg) saturate(1.2) brightness(1.05)' },
  { name:'Fade',     css:'contrast(0.85) brightness(1.1) saturate(0.75)' },
  { name:'Mono',     css:'grayscale(1) contrast(1.1)' },
  { name:'Drama',    css:'contrast(1.3) saturate(1.2) brightness(0.95)' },
]

const TABS = ['Edit', 'Music']

export default function MediaEditor({ mediaFiles, onDone, onBack }) {
  const [tab,           setTab]           = useState('Edit')
  const [editTab,       setEditTab]       = useState('Filters')  // Filters | Crop | Trim
  const [activeIndex,   setActiveIndex]   = useState(0)
  const [filter,        setFilter]        = useState('Original')
  const [brightness,    setBrightness]    = useState(100)
  const [contrast,      setContrast]      = useState(100)
  const [saturation,    setSaturation]    = useState(100)
  const [trimStart,     setTrimStart]     = useState(0)
  const [trimEnd,       setTrimEnd]       = useState(100)
  const [tracks,        setTracks]        = useState([])
  const [selectedTrack, setSelectedTrack] = useState(null)
  const [previewTrack,  setPreviewTrack]  = useState(null)
  const [musicStart,    setMusicStart]    = useState(0)
  const [loadingTracks, setLoadingTracks] = useState(false)
  const [cropMode,      setCropMode]      = useState(false)
  const audioRef = useRef(null)
  const canvasRef = useRef(null)

  const current   = mediaFiles[activeIndex]
  const isVideo   = current?.type === 'video'
  const hasMultiple = mediaFiles.length > 1

  // Build the composite CSS filter string
  const composedFilter = [
    FILTERS.find(f=>f.name===filter)?.css || '',
    brightness !== 100 ? `brightness(${brightness}%)` : '',
    contrast   !== 100 ? `contrast(${contrast}%)`    : '',
    saturation !== 100 ? `saturate(${saturation}%)`  : '',
  ].filter(Boolean).join(' ')

  // ── Load music tracks from Supabase ──────────────────────────────────────
  useEffect(() => {
    if (tab !== 'Music') return
    setLoadingTracks(true)
    supabase.from('music_tracks').select('*').eq('is_active', true)
      .order('play_count', { ascending: false }).limit(30)
      .then(({ data }) => { setTracks(data || []); setLoadingTracks(false) })
  }, [tab])

  // ── Preview a track ───────────────────────────────────────────────────────
  const handlePreview = (track) => {
    if (previewTrack?.id === track.id) {
      audioRef.current?.pause()
      setPreviewTrack(null)
      return
    }
    setPreviewTrack(track)
    if (audioRef.current) {
      audioRef.current.src = track.file_url
      audioRef.current.currentTime = musicStart
      audioRef.current.play()
    }
  }

  // ── Apply filter to canvas (for photo export) ─────────────────────────────
  const getEditedBlob = useCallback(() => {
    return new Promise(resolve => {
      if (isVideo) { resolve(null); return }
      const img = new Image()
      img.onload = () => {
        const c = canvasRef.current
        c.width  = img.width
        c.height = img.height
        const ctx = c.getContext('2d')
        ctx.filter = composedFilter || 'none'
        ctx.drawImage(img, 0, 0)
        c.toBlob(resolve, 'image/jpeg', 0.92)
      }
      img.src = current.url
    })
  }, [current, composedFilter, isVideo])

  const handleDone = async () => {
    onDone({
      mediaFiles,
      filter,
      brightness,
      contrast,
      saturation,
      composedFilter,
      trimStart,
      trimEnd,
      selectedTrack,
      musicStart,
    })
  }

  return (
    <div style={S.page}>
      {/* Hidden audio + canvas */}
      <audio ref={audioRef} style={{display:'none'}} />
      <canvas ref={canvasRef} style={{display:'none'}} />

      {/* ── TOP BAR ── */}
      <div style={S.topBar}>
        <button onClick={onBack} style={S.iconBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <div style={{display:'flex',gap:1,background:'rgba(255,255,255,0.07)',borderRadius:10,padding:3}}>
          {TABS.map(t => (
            <button key={t} onClick={()=>setTab(t)} style={{
              padding:'6px 16px', borderRadius:8, border:'none', cursor:'pointer',
              fontFamily:'inherit', fontSize:13, fontWeight:600,
              background: tab===t ? 'rgba(255,255,255,0.12)' : 'transparent',
              color: tab===t ? 'white' : 'rgba(255,255,255,0.4)',
              transition:'all 0.2s',
            }}>{t}</button>
          ))}
        </div>
        <button onClick={handleDone} style={S.doneBtn}>Done</button>
      </div>

      {/* ── MEDIA PREVIEW ── */}
      <div style={S.previewZone}>
        {isVideo ? (
          <video
            src={current?.url}
            style={{...S.previewMedia, filter: composedFilter || 'none'}}
            loop muted autoPlay playsInline
          />
        ) : (
          <img
            src={current?.url}
            alt=""
            style={{...S.previewMedia, filter: composedFilter || 'none'}}
          />
        )}

        {/* Multi-image dots */}
        {hasMultiple && (
          <div style={S.mediaDots}>
            {mediaFiles.map((_, i) => (
              <button key={i} onClick={()=>setActiveIndex(i)} style={{
                width: i===activeIndex?18:6, height:6,
                borderRadius:3, border:'none', cursor:'pointer',
                background: i===activeIndex ? 'white' : 'rgba(255,255,255,0.35)',
                transition:'all 0.25s',
              }}/>
            ))}
          </div>
        )}

        {/* Music now playing badge */}
        {selectedTrack && (
          <div style={S.nowPlayingBadge}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            <span style={{fontSize:11,fontWeight:600,color:'white',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{selectedTrack.title}</span>
            <button onClick={()=>setSelectedTrack(null)} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.6)',padding:0,lineHeight:1}}>✕</button>
          </div>
        )}
      </div>

      {/* ── EDIT TOOLS ── */}
      {tab === 'Edit' && (
        <div style={S.editPanel}>
          {/* Edit sub-tabs */}
          <div style={S.editTabs}>
            {(['Filters', 'Adjust', ...(isVideo ? ['Trim'] : [])]).map(t => (
              <button key={t} onClick={()=>setEditTab(t)} style={{
                padding:'6px 0', background:'none', border:'none', cursor:'pointer',
                fontFamily:'inherit', fontSize:13, fontWeight:600,
                color: editTab===t ? 'white' : 'rgba(255,255,255,0.35)',
                borderBottom: editTab===t ? '2px solid #FF3366' : '2px solid transparent',
                transition:'all 0.2s', flex:1,
              }}>{t}</button>
            ))}
          </div>

          {/* Filters strip */}
          {editTab === 'Filters' && (
            <div style={S.filtersStrip}>
              {FILTERS.map(f => (
                <div key={f.name} onClick={()=>setFilter(f.name)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,flexShrink:0,cursor:'pointer'}}>
                  <div style={{
                    width:62, height:62, borderRadius:12, overflow:'hidden',
                    border: filter===f.name ? '2.5px solid #FF3366' : '2px solid transparent',
                    boxShadow: filter===f.name ? '0 0 0 1px #FF3366' : 'none',
                    transition:'all 0.2s',
                  }}>
                    {current && (
                      <img src={current.url} alt={f.name} style={{width:'100%',height:'100%',objectFit:'cover',filter:f.css||'none'}}/>
                    )}
                  </div>
                  <span style={{fontSize:10,fontWeight:filter===f.name?700:500,color:filter===f.name?'white':'rgba(255,255,255,0.45)',letterSpacing:'0.2px'}}>{f.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Adjust sliders */}
          {editTab === 'Adjust' && (
            <div style={{padding:'12px 20px',display:'flex',flexDirection:'column',gap:16}}>
              <AdjustSlider label="Brightness" icon="☀️" value={brightness} min={50} max={150} onChange={setBrightness} accent="#F59E0B"/>
              <AdjustSlider label="Contrast"   icon="◑"  value={contrast}   min={50} max={150} onChange={setContrast}   accent="#3B82F6"/>
              <AdjustSlider label="Saturation" icon="🎨" value={saturation} min={0}  max={200} onChange={setSaturation} accent="#D946EF"/>
              <button onClick={()=>{setBrightness(100);setContrast(100);setSaturation(100);setFilter('Original')}}
                style={{alignSelf:'center',padding:'7px 18px',borderRadius:20,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.5)',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                Reset
              </button>
            </div>
          )}

          {/* Trim (video only) */}
          {editTab === 'Trim' && isVideo && (
            <div style={{padding:'16px 20px'}}>
              <div style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.4)',letterSpacing:1,marginBottom:12}}>TRIM VIDEO</div>
              <TrimBar trimStart={trimStart} trimEnd={trimEnd} onChangeStart={setTrimStart} onChangeEnd={setTrimEnd} videoUrl={current?.url}/>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:10}}>
                <span style={{fontSize:11,color:'#71717A'}}>Start: {(trimStart/100*60).toFixed(1)}s</span>
                <span style={{fontSize:11,color:'#71717A'}}>End: {(trimEnd/100*60).toFixed(1)}s</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MUSIC PANEL ── */}
      {tab === 'Music' && (
        <div style={S.musicPanel}>
          <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.3)',letterSpacing:1.2,padding:'12px 20px 8px'}}>ROYALTY-FREE TRACKS</div>

          {loadingTracks && (
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:32}}>
              <div style={{width:24,height:24,border:'2px solid rgba(255,255,255,0.1)',borderTopColor:'#FF3366',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
            </div>
          )}

          {!loadingTracks && tracks.length === 0 && (
            <div style={{padding:'32px 20px',textAlign:'center'}}>
              <div style={{fontSize:32,marginBottom:10}}>🎵</div>
              <div style={{fontSize:14,fontWeight:600,color:'#A1A1AA',marginBottom:4}}>No tracks yet</div>
              <div style={{fontSize:12,color:'#52525B',lineHeight:1.5}}>Royalty-free music will appear here.<br/>Tracks are added by Swoop.</div>
            </div>
          )}

          <div style={{flex:1,overflowY:'auto',scrollbarWidth:'none'}}>
            {/* No music option */}
            <TrackRow
              track={{ id:null, title:'No Music', artist:'Original audio only' }}
              isSelected={selectedTrack===null}
              isPlaying={false}
              onSelect={()=>{ setSelectedTrack(null); audioRef.current?.pause(); setPreviewTrack(null) }}
              onPreview={()=>{}}
              noMusic
            />
            <div style={{height:1,background:'rgba(255,255,255,0.05)',margin:'0 20px'}}/>
            {tracks.map(track => (
              <TrackRow
                key={track.id}
                track={track}
                isSelected={selectedTrack?.id===track.id}
                isPlaying={previewTrack?.id===track.id}
                onSelect={()=>{ setSelectedTrack(track); handlePreview(track) }}
                onPreview={()=>handlePreview(track)}
              />
            ))}
          </div>

          {/* Music start offset */}
          {selectedTrack && (
            <div style={{padding:'10px 20px 8px',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
              <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.3)',letterSpacing:1.2,marginBottom:8}}>START FROM</div>
              <input type="range" min={0} max={selectedTrack.duration_sec||60} value={musicStart}
                onChange={e=>setMusicStart(Number(e.target.value))}
                style={{width:'100%',accentColor:'#FF3366',height:3}}/>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
                <span style={{fontSize:10,color:'#52525B'}}>0:{String(musicStart).padStart(2,'0')}</span>
                <span style={{fontSize:10,color:'#52525B'}}>0:{String(selectedTrack.duration_sec||60).padStart(2,'0')}</span>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── Adjust slider ─────────────────────────────────────────────────────────────
function AdjustSlider({ label, icon, value, min, max, onChange, accent }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
        <div style={{display:'flex',alignItems:'center',gap:7}}>
          <span style={{fontSize:16}}>{icon}</span>
          <span style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,0.7)'}}>{label}</span>
        </div>
        <span style={{fontSize:12,fontWeight:700,color:value===100?'rgba(255,255,255,0.3)':accent,fontVariantNumeric:'tabular-nums'}}>{value}%</span>
      </div>
      <div style={{position:'relative',height:28,display:'flex',alignItems:'center'}}>
        {/* Track */}
        <div style={{position:'absolute',left:0,right:0,height:3,background:'rgba(255,255,255,0.08)',borderRadius:2}}>
          <div style={{position:'absolute',left:0,width:`${pct}%`,height:'100%',background:accent,borderRadius:2,transition:'width 0.05s'}}/>
        </div>
        <input type="range" min={min} max={max} value={value} onChange={e=>onChange(Number(e.target.value))}
          style={{position:'absolute',left:0,right:0,width:'100%',opacity:0,height:28,cursor:'pointer',margin:0}}/>
        {/* Thumb */}
        <div style={{position:'absolute',left:`calc(${pct}% - 10px)`,width:20,height:20,borderRadius:'50%',background:'white',boxShadow:`0 0 0 3px ${accent}40, 0 2px 8px rgba(0,0,0,0.4)`,pointerEvents:'none',transition:'left 0.05s'}}/>
      </div>
    </div>
  )
}

// ── Trim bar ──────────────────────────────────────────────────────────────────
function TrimBar({ trimStart, trimEnd, onChangeStart, onChangeEnd }) {
  return (
    <div style={{position:'relative',height:48,borderRadius:10,overflow:'hidden',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
      {/* Waveform placeholder bars */}
      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',gap:1.5,padding:'0 8px',opacity:0.2}}>
        {Array.from({length:50},(_,i)=>(
          <div key={i} style={{flex:1,background:'white',borderRadius:1,height:`${20+Math.sin(i*0.8)*15+Math.random()*10}px`,transition:'height 0.2s'}}/>
        ))}
      </div>
      {/* Selected region highlight */}
      <div style={{
        position:'absolute', top:0, bottom:0,
        left:`${trimStart}%`, width:`${trimEnd-trimStart}%`,
        background:'rgba(255,51,102,0.15)',
        borderLeft:'3px solid #FF3366', borderRight:'3px solid #FF3366',
        pointerEvents:'none',
      }}/>
      {/* Start handle */}
      <input type="range" min={0} max={trimEnd-1} value={trimStart}
        onChange={e=>onChangeStart(Number(e.target.value))}
        style={{position:'absolute',left:0,right:0,top:0,bottom:0,width:'100%',opacity:0,cursor:'col-resize'}}/>
    </div>
  )
}

// ── Track row ─────────────────────────────────────────────────────────────────
function TrackRow({ track, isSelected, isPlaying, onSelect, onPreview, noMusic }) {
  const fmtDur = s => s ? `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}` : ''
  return (
    <div onClick={onSelect} style={{
      display:'flex', alignItems:'center', gap:12,
      padding:'12px 20px', cursor:'pointer',
      background: isSelected ? 'rgba(255,51,102,0.06)' : 'transparent',
      borderLeft: isSelected ? '3px solid #FF3366' : '3px solid transparent',
      transition:'all 0.15s',
    }}>
      {/* Icon / album art */}
      <div style={{
        width:44, height:44, borderRadius:10, flexShrink:0,
        background: noMusic ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#1a1a2e,#2d0050)',
        display:'flex', alignItems:'center', justifyContent:'center',
        border:'1px solid rgba(255,255,255,0.07)',
        position:'relative', overflow:'hidden',
      }}>
        {noMusic ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round">
            <line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/><path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23M12 20v4M8 20h8"/>
          </svg>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isSelected?'#FF3366':'rgba(255,255,255,0.4)'} strokeWidth="2" strokeLinecap="round">
              <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
            </svg>
            {isPlaying && (
              <div style={{position:'absolute',inset:0,background:'rgba(255,51,102,0.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <div style={{display:'flex',gap:2,alignItems:'flex-end',height:16}}>
                  {[0,1,2].map(i=>(
                    <div key={i} style={{width:3,background:'#FF3366',borderRadius:2,animation:`eq${i} 0.6s ease-in-out infinite alternate`,animationDelay:`${i*0.15}s`}}/>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Info */}
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:14,fontWeight:isSelected?700:500,color:isSelected?'white':'rgba(255,255,255,0.75)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
          {track.title}
        </div>
        <div style={{fontSize:11,color:'#52525B',marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
          {track.artist || (noMusic ? 'Keep original audio' : '')}
        </div>
      </div>

      {/* Duration + selected check */}
      <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
        {track.duration_sec && <span style={{fontSize:11,color:'#52525B'}}>{fmtDur(track.duration_sec)}</span>}
        {isSelected && (
          <div style={{width:20,height:20,borderRadius:'50%',background:'#FF3366',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
        )}
      </div>
    </div>
  )
}

// Styles
const S = {
  page: { position:'fixed', inset:0, zIndex:310, background:'#000', display:'flex', flexDirection:'column', fontFamily:"'Inter',sans-serif", color:'#fff' },
  topBar: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px 10px', borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0 },
  iconBtn: { width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.09)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' },
  doneBtn: { padding:'8px 18px', borderRadius:20, background:'#FF3366', border:'none', color:'white', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 2px 12px rgba(255,51,102,0.4)' },
  previewZone: { flex:1, position:'relative', display:'flex', alignItems:'center', justifyContent:'center', background:'#000', minHeight:0, overflow:'hidden' },
  previewMedia: { maxWidth:'100%', maxHeight:'100%', objectFit:'contain', transition:'filter 0.2s' },
  mediaDots: { position:'absolute', bottom:10, left:0, right:0, display:'flex', alignItems:'center', justifyContent:'center', gap:4 },
  nowPlayingBadge: { position:'absolute', bottom:16, left:'50%', transform:'translateX(-50%)', display:'flex', alignItems:'center', gap:7, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(12px)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:20, padding:'6px 12px 6px 10px', maxWidth:'80%' },
  editPanel: { flexShrink:0, background:'#0a0a0a', borderTop:'1px solid rgba(255,255,255,0.06)', maxHeight:'38%', display:'flex', flexDirection:'column' },
  editTabs: { display:'flex', borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0 },
  filtersStrip: { display:'flex', gap:12, padding:'12px 16px', overflowX:'auto', scrollbarWidth:'none', flex:1, alignItems:'flex-start' },
  musicPanel: { flexShrink:0, background:'#0a0a0a', borderTop:'1px solid rgba(255,255,255,0.06)', flex:1, display:'flex', flexDirection:'column', minHeight:0, maxHeight:'48%' },
}
