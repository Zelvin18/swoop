/**
 * AddStoryScreen — TikTok/Instagram-style story creator
 *
 * Flow:
 *  1. Gallery picker  — shows permission prompt first, then grid of selected files
 *  2. Story editor    — full-screen preview + music pill + right tools + "Your Story" button
 */
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

// ── helpers ───────────────────────────────────────────────────────────────────
function avatarColor(id=''){const C=['#7C3AED','#FF3366','#F97316','#22C55E','#3B82F6'];return C[id.split('').reduce((a,c)=>a+c.charCodeAt(0),0)%C.length]}

export default function AddStoryScreen({ currentUser, onClose, onPosted }) {
  // ── stage: 'gallery' | 'editor' ──────────────────────────────────────────
  const [stage,          setStage]          = useState('gallery')
  const [allFiles,       setAllFiles]       = useState([])   // {url, file, type} — from picker
  const [selectedIdx,    setSelectedIdx]    = useState(0)    // active file in grid
  const [mediaTab,       setMediaTab]       = useState('All') // All | Photos | Videos
  const [multiSelect,    setMultiSelect]    = useState(false)
  const [multiSelected,  setMultiSelected]  = useState([])   // indices
  const [permAsked,      setPermAsked]      = useState(false)

  // editor state
  const [caption,        setCaption]        = useState('')
  const [showCaption,    setShowCaption]    = useState(false)
  const [selectedTrack,  setSelectedTrack]  = useState(null)
  const [tracks,         setTracks]         = useState([])
  const [showSoundPanel, setShowSoundPanel] = useState(false)
  const [previewTrack,   setPreviewTrack]   = useState(null)
  const [loadingTracks,  setLoadingTracks]  = useState(false)
  const [posting,        setPosting]        = useState(false)

  const fileRef  = useRef(null)
  const audioRef = useRef(null)

  // ── Load tracks ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!showSoundPanel || tracks.length) return
    setLoadingTracks(true)
    supabase.from('music_tracks').select('*').eq('is_active',true)
      .order('play_count',{ascending:false}).limit(30)
      .then(({data}) => {setTracks(data||[]); setLoadingTracks(false)})
  }, [showSoundPanel])

  // ── Auto-play music ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!audioRef.current) return
    if (selectedTrack) {
      audioRef.current.src = selectedTrack.file_url
      audioRef.current.loop = true
      audioRef.current.play().catch(()=>{})
    } else {
      audioRef.current.pause()
    }
  }, [selectedTrack])

  // ── File picker callback ─────────────────────────────────────────────────
  const handleFilesPicked = (e) => {
    const files = Array.from(e.target.files||[]).slice(0,50)
    if (!files.length) return
    setAllFiles(files.map(f=>({ url:URL.createObjectURL(f), file:f, type:f.type.startsWith('video')?'video':'photo' })))
    setSelectedIdx(0)
    setMultiSelected([])
    setPermAsked(true)
  }

  // ── Post story ───────────────────────────────────────────────────────────
  const handlePost = async () => {
    const mediaFile = allFiles[selectedIdx]
    if (!mediaFile || !currentUser) return
    setPosting(true)
    const ext  = mediaFile.type==='video' ? 'mp4' : 'jpg'
    const path = `${currentUser.id}/${Date.now()}.${ext}`
    const {error:upErr} = await supabase.storage.from('stories').upload(path, mediaFile.file)
    if (upErr) { setPosting(false); return }
    const {data:{publicUrl}} = supabase.storage.from('stories').getPublicUrl(path)
    const {error} = await supabase.from('stories').insert({
      user_id:         currentUser.id,
      media_url:       publicUrl,
      media_type:      mediaFile.type,
      music_track_id:  selectedTrack?.id || null,
      caption:         caption.trim() || null,
    })
    setPosting(false)
    if (!error) { onPosted?.(); onClose() }
  }

  const handlePreviewTrack = (track) => {
    if (previewTrack?.id===track.id) { audioRef.current?.pause(); setPreviewTrack(null) }
    else {
      setPreviewTrack(track)
      if (audioRef.current) { audioRef.current.src=track.file_url; audioRef.current.currentTime=0; audioRef.current.play().catch(()=>{}) }
    }
  }

  const displayFiles = allFiles.filter(f => mediaTab==='All' || (mediaTab==='Photos'&&f.type==='photo') || (mediaTab==='Videos'&&f.type==='video'))
  const activeFile   = allFiles[selectedIdx]
  const userInitial  = currentUser?.user_metadata?.full_name?.[0]?.toUpperCase() || 'Y'

  // ════════════════════════════════════════════════════════
  // STAGE: GALLERY PICKER
  // ════════════════════════════════════════════════════════
  if (stage === 'gallery') {
    return (
      <div style={S.page}>
        <audio ref={audioRef} style={{display:'none'}} />
        <input ref={fileRef} type="file" accept="image/*,video/*" multiple onChange={handleFilesPicked} style={{display:'none'}} />

        {/* Header */}
        <div style={S.galleryHeader}>
          <button onClick={onClose} style={S.iconBtnDark}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <div style={{fontSize:16,fontWeight:700}}>Add to Story</div>
          {allFiles.length > 0 ? (
            <button onClick={()=>setMultiSelect(m=>!m)} style={{...S.pillBtn, background: multiSelect?'#FF3366':'rgba(255,255,255,0.08)', border:`1px solid ${multiSelect?'#FF3366':'rgba(255,255,255,0.15)'}` }}>
              <div style={{width:16,height:16,borderRadius:'50%',border:`2px solid ${multiSelect?'white':'rgba(255,255,255,0.4)'}`,background:multiSelect?'white':'transparent',display:'flex',alignItems:'center',justifyContent:'center'}}>
                {multiSelect && <div style={{width:8,height:8,borderRadius:'50%',background:'#FF3366'}}/>}
              </div>
              Select multiple
            </button>
          ) : <div style={{width:80}}/>}
        </div>

        {/* Source row */}
        {allFiles.length > 0 && (
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 16px 4px'}}>
            <button style={{display:'flex',alignItems:'center',gap:5,background:'none',border:'none',color:'white',fontSize:15,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
              Recents
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
            </button>
          </div>
        )}

        {/* Tabs */}
        {allFiles.length > 0 && (
          <div style={{display:'flex',padding:'0 16px 8px',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
            {['All','Photos','Videos'].map(t=>(
              <button key={t} onClick={()=>setMediaTab(t)} style={{flex:1,padding:'8px 0',background:'none',border:'none',color:mediaTab===t?'white':'rgba(255,255,255,0.4)',fontSize:14,fontWeight:mediaTab===t?700:400,cursor:'pointer',fontFamily:'inherit',borderBottom:`2px solid ${mediaTab===t?'#FF3366':'transparent'}`,transition:'all 0.2s'}}>
                {t}
              </button>
            ))}
          </div>
        )}

        {/* Gallery grid or empty state */}
        {allFiles.length === 0 ? (
          <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:20,padding:32}}>
            {!permAsked ? (
              <>
                {/* Permission prompt */}
                <div style={{width:80,height:80,borderRadius:22,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.4" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                </div>
                <div style={{textAlign:'center',maxWidth:260}}>
                  <div style={{fontSize:18,fontWeight:800,marginBottom:8}}>Access your photos</div>
                  <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',lineHeight:1.6}}>
                    Swoop needs access to your gallery to let you add photos and videos to your story.
                  </div>
                </div>
                <button onClick={()=>fileRef.current?.click()} style={S.allowBtn}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                  Allow Access to Gallery
                </button>
                <button onClick={()=>fileRef.current?.click()} style={S.cameraBtn}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  Take a Photo or Video
                </button>
              </>
            ) : (
              <>
                <div style={{fontSize:40,opacity:0.3}}>📷</div>
                <div style={{fontSize:15,color:'rgba(255,255,255,0.4)'}}>No files selected</div>
                <button onClick={()=>fileRef.current?.click()} style={S.allowBtn}>Choose files</button>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Large preview of selected */}
            <div style={{width:'100%',aspectRatio:'1',background:'#0a0a0a',position:'relative',overflow:'hidden',flexShrink:0}}>
              {activeFile?.type==='video'
                ? <video src={activeFile?.url} style={{width:'100%',height:'100%',objectFit:'cover'}} muted loop autoPlay playsInline/>
                : <img src={activeFile?.url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
              }
              {/* Proceed arrow */}
              <button onClick={()=>setStage('editor')} style={{position:'absolute',bottom:12,right:12,width:44,height:44,borderRadius:'50%',background:'rgba(0,0,0,0.6)',backdropFilter:'blur(8px)',border:'2px solid rgba(255,255,255,0.3)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </div>

            {/* Grid */}
            <div style={{flex:1,overflowY:'auto',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:2,padding:2}}>
              {displayFiles.map((f,i)=>{
                const realIdx = allFiles.indexOf(f)
                const isActive = realIdx===selectedIdx
                const isMultiSel = multiSelected.includes(realIdx)
                return (
                  <div key={i} onClick={()=>{
                    if (multiSelect) {
                      setMultiSelected(prev=>prev.includes(realIdx)?prev.filter(x=>x!==realIdx):[...prev,realIdx])
                    } else { setSelectedIdx(realIdx) }
                  }} style={{position:'relative',aspectRatio:'1',overflow:'hidden',cursor:'pointer',borderRadius:2}}>
                    {f.type==='video'
                      ? <video src={f.url} style={{width:'100%',height:'100%',objectFit:'cover'}} muted/>
                      : <img src={f.url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    }
                    {/* Active border */}
                    {isActive && !multiSelect && <div style={{position:'absolute',inset:0,border:'3px solid #FF3366',borderRadius:2,pointerEvents:'none'}}/>}
                    {/* Video badge */}
                    {f.type==='video' && <div style={{position:'absolute',bottom:4,right:4,background:'rgba(0,0,0,0.6)',borderRadius:4,padding:'1px 5px',fontSize:9,fontWeight:700,color:'white'}}>▶</div>}
                    {/* Multi-select circle */}
                    {multiSelect && (
                      <div style={{position:'absolute',top:6,right:6,width:22,height:22,borderRadius:'50%',border:`2px solid ${isMultiSel?'#FF3366':'rgba(255,255,255,0.6)'}`,background:isMultiSel?'#FF3366':'rgba(0,0,0,0.35)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        {isMultiSel && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><path d="M20 6L9 17l-5-5"/></svg>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Next button */}
            <div style={{padding:'12px 16px',paddingBottom:'calc(var(--nav-h,50px) + env(safe-area-inset-bottom,0px) + 12px)',borderTop:'1px solid rgba(255,255,255,0.07)',flexShrink:0}}>
              <button onClick={()=>setStage('editor')} style={{width:'100%',padding:'14px',background:'linear-gradient(135deg,#FF3366,#FF6633)',border:'none',borderRadius:13,color:'white',fontSize:15,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:'0 4px 20px rgba(255,51,102,0.4)'}}>
                Next
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  // ════════════════════════════════════════════════════════
  // STAGE: STORY EDITOR
  // ════════════════════════════════════════════════════════
  return (
    <div style={S.page}>
      <audio ref={audioRef} style={{display:'none'}} />

      {/* Full-screen media */}
      <div style={S.mediaFullScreen}>
        {activeFile?.type==='video'
          ? <video src={activeFile?.url} style={S.mediaCover} autoPlay muted loop playsInline/>
          : <img src={activeFile?.url} alt="" style={S.mediaCover}/>
        }
        <div style={S.topGrad}/>
        <div style={S.botGrad}/>
      </div>

      {/* All overlays */}
      <div style={{position:'absolute',inset:0,zIndex:10,display:'flex',flexDirection:'column'}}>

        {/* Top row: back + music pill */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',paddingTop:'calc(env(safe-area-inset-top,0px) + 12px)'}}>
          <button onClick={()=>setStage('gallery')} style={S.overlayBtn}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>

          {/* Music pill — center */}
          <button onClick={()=>setShowSoundPanel(p=>!p)} style={{display:'flex',alignItems:'center',gap:6,background:selectedTrack?'rgba(255,51,102,0.2)':'rgba(0,0,0,0.5)',backdropFilter:'blur(12px)',border:`1px solid ${selectedTrack?'rgba(255,51,102,0.45)':'rgba(255,255,255,0.18)'}`,borderRadius:20,padding:'7px 13px 7px 10px',cursor:'pointer',transition:'all 0.2s'}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={selectedTrack?'#FF3366':'rgba(255,255,255,0.7)'} strokeWidth="2.5">
              <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
            </svg>
            <span style={{fontSize:12,fontWeight:600,color:selectedTrack?'white':'rgba(255,255,255,0.7)',maxWidth:110,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {selectedTrack?selectedTrack.title:'Add Sound'}
            </span>
            {selectedTrack
              ? <button onClick={e=>{e.stopPropagation();setSelectedTrack(null)}} style={{background:'none',border:'none',color:'rgba(255,255,255,0.5)',cursor:'pointer',padding:0,fontSize:14,marginLeft:2,lineHeight:1}}>✕</button>
              : <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
            }
          </button>

          <div style={{width:36}}/>
        </div>

        {/* Right tool strip */}
        <div style={{position:'absolute',right:12,top:'calc(env(safe-area-inset-top,0px) + 70px)',display:'flex',flexDirection:'column',gap:10}}>
          {[
            { icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>, action:()=>setShowCaption(c=>!c) },
            { icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M12 3l1.45 2.94L16.9 6.55l-2.45 2.39.58 3.37L12 10.5l-3.03 1.81.58-3.37L7.1 6.55l3.45-.61L12 3z"/></svg>, action:()=>{} },
            { icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={selectedTrack?'#FF3366':'white'} strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>, action:()=>setShowSoundPanel(p=>!p) },
            { icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>, action:()=>{} },
          ].map((t,i)=>(
            <button key={i} onClick={t.action} style={{width:42,height:42,borderRadius:'50%',background:'rgba(0,0,0,0.5)',backdropFilter:'blur(10px)',border:'1px solid rgba(255,255,255,0.14)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
              {t.icon}
            </button>
          ))}
        </div>

        {/* Caption */}
        {showCaption && (
          <div style={{position:'absolute',bottom:130,left:16,right:16}}>
            <input value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Add a caption..." maxLength={150}
              style={{background:'rgba(0,0,0,0.6)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.18)',borderRadius:12,color:'white',fontSize:15,padding:'11px 14px',width:'100%',outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/>
          </div>
        )}

        {/* ── YOUR STORY BUTTON — fixed above nav ── */}
        <div style={{
          position:'absolute',
          bottom:0,
          left:0,
          right:0,
          /* Clear the bottom nav completely */
          paddingBottom:'calc(var(--nav-h,50px) + env(safe-area-inset-bottom,0px) + 16px)',
          paddingTop:16,
          paddingLeft:16,
          paddingRight:16,
          background:'linear-gradient(to top,rgba(0,0,0,0.8) 0%,transparent 100%)',
          display:'flex',
          justifyContent:'center',
        }}>
          <button onClick={handlePost} disabled={posting} style={{
            display:'flex', alignItems:'center', justifyContent:'center', gap:10,
            padding:'11px 28px 11px 10px',
            background:'rgba(255,255,255,0.95)',
            backdropFilter:'blur(10px)',
            border:'none', borderRadius:50,
            color:'#000', fontSize:16, fontWeight:700,
            cursor:'pointer', fontFamily:'inherit',
            boxShadow:'0 4px 24px rgba(0,0,0,0.5)',
            minWidth:200,
            opacity: posting ? 0.7 : 1,
          }}>
            {posting ? (
              <div style={{width:20,height:20,border:'2.5px solid rgba(0,0,0,0.2)',borderTopColor:'#FF3366',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
            ) : (
              <>
                <div style={{width:36,height:36,borderRadius:'50%',background:avatarColor(currentUser?.id||''),border:'2.5px solid rgba(0,0,0,0.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:900,color:'white',flexShrink:0}}>
                  {userInitial}
                </div>
                Your Story
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sound panel */}
      {showSoundPanel && (
        <StoryMusicPanel
          tracks={tracks} loading={loadingTracks}
          selected={selectedTrack} previewing={previewTrack}
          onSelect={t=>{setSelectedTrack(t);setPreviewTrack(null);setShowSoundPanel(false)}}
          onPreview={handlePreviewTrack}
          onClose={()=>setShowSoundPanel(false)}
        />
      )}

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── StoryMusicPanel ───────────────────────────────────────────────────────────
function StoryMusicPanel({ tracks, loading, selected, previewing, onSelect, onPreview, onClose }) {
  const fmt = s => s ? `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}` : ''
  return (
    <div style={{position:'absolute',inset:0,zIndex:50,background:'rgba(0,0,0,0.65)',backdropFilter:'blur(8px)',display:'flex',flexDirection:'column',justifyContent:'flex-end'}}>
      <div style={{background:'#0d0d0d',borderRadius:'20px 20px 0 0',border:'1px solid rgba(255,255,255,0.07)',borderBottom:'none',maxHeight:'70%',display:'flex',flexDirection:'column'}}>
        <div style={{width:34,height:4,borderRadius:20,background:'rgba(255,255,255,0.1)',margin:'9px auto 0',flexShrink:0}}/>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 16px 10px',borderBottom:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
          <span style={{fontSize:15,fontWeight:800}}>Add Sound</span>
          <button onClick={onClose} style={{width:28,height:28,borderRadius:'50%',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style={{flex:1,overflowY:'auto',scrollbarWidth:'none'}}>
          {loading && <div style={{display:'flex',justifyContent:'center',padding:32}}><div style={{width:22,height:22,border:'2px solid rgba(255,255,255,0.08)',borderTopColor:'#FF3366',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/></div>}

          {/* No sound */}
          <div onClick={()=>onSelect(null)} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',cursor:'pointer',borderLeft:`3px solid ${!selected?'#FF3366':'transparent'}`,background:!selected?'rgba(255,51,102,0.05)':'transparent'}}>
            <div style={{width:42,height:42,borderRadius:10,background:'rgba(255,255,255,0.04)',display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/></svg>
            </div>
            <div style={{flex:1}}><div style={{fontSize:14,fontWeight:!selected?700:400,color:'white'}}>No Sound</div><div style={{fontSize:11,color:'#52525B'}}>Use original audio</div></div>
            {!selected && <div style={{width:18,height:18,borderRadius:'50%',background:'#FF3366',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><path d="M20 6L9 17l-5-5"/></svg></div>}
          </div>
          <div style={{height:1,background:'rgba(255,255,255,0.05)',margin:'0 16px'}}/>

          {tracks.map(t=>(
            <div key={t.id} onClick={()=>onSelect(t)} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',cursor:'pointer',borderLeft:`3px solid ${selected?.id===t.id?'#FF3366':'transparent'}`,background:selected?.id===t.id?'rgba(255,51,102,0.05)':'transparent'}}>
              <div style={{width:42,height:42,borderRadius:10,background:'linear-gradient(135deg,#0d001a,#1a0035)',display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid rgba(255,255,255,0.06)',flexShrink:0,position:'relative',overflow:'hidden'}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={selected?.id===t.id?'#FF3366':'rgba(255,255,255,0.3)'} strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                {previewing?.id===t.id && <div style={{position:'absolute',inset:0,background:'rgba(255,51,102,0.15)',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{display:'flex',gap:2,alignItems:'flex-end',height:12}}>{[0,1,2].map(i=><div key={i} style={{width:2.5,background:'#FF3366',borderRadius:1,animation:`wv${i} 0.5s ease-in-out infinite alternate`,animationDelay:`${i*0.12}s`}}/>)}</div></div>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:selected?.id===t.id?700:400,color:selected?.id===t.id?'white':'rgba(255,255,255,0.7)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.title}</div>
                <div style={{fontSize:11,color:'#52525B',marginTop:1}}>{t.artist}</div>
              </div>
              <div style={{display:'flex',gap:7,alignItems:'center',flexShrink:0}}>
                {t.duration_sec && <span style={{fontSize:10,color:'#52525B'}}>{fmt(t.duration_sec)}</span>}
                <button onClick={e=>{e.stopPropagation();onPreview(t)}} style={{width:30,height:30,borderRadius:'50%',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
                  {previewing?.id===t.id ? <svg width="9" height="9" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg> : <svg width="9" height="9" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
                </button>
                {selected?.id===t.id && <div style={{width:18,height:18,borderRadius:'50%',background:'#FF3366',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><path d="M20 6L9 17l-5-5"/></svg></div>}
              </div>
            </div>
          ))}
          {!loading && !tracks.length && <div style={{padding:'32px 20px',textAlign:'center',fontSize:13,color:'#71717A'}}>No tracks available yet</div>}
        </div>
      </div>
      <style>{`@keyframes wv0{from{height:30%}to{height:90%}}@keyframes wv1{from{height:50%}to{height:80%}}@keyframes wv2{from{height:20%}to{height:100%}}`}</style>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page:            { position:'fixed',inset:0,zIndex:400,background:'#000',display:'flex',flexDirection:'column',fontFamily:"'Inter',sans-serif",color:'#fff' },
  galleryHeader:   { display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px 8px',flexShrink:0 },
  iconBtnDark:     { width:36,height:36,borderRadius:'50%',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.09)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer' },
  pillBtn:         { display:'flex',alignItems:'center',gap:7,padding:'7px 13px',borderRadius:20,cursor:'pointer',fontSize:13,fontWeight:600,color:'white',fontFamily:'inherit',transition:'all 0.2s' },
  allowBtn:        { display:'flex',alignItems:'center',justifyContent:'center',gap:8,width:'100%',maxWidth:300,padding:'14px',background:'linear-gradient(135deg,#FF3366,#FF6633)',border:'none',borderRadius:13,color:'white',fontSize:15,fontWeight:700,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 20px rgba(255,51,102,0.35)' },
  cameraBtn:       { display:'flex',alignItems:'center',justifyContent:'center',gap:8,width:'100%',maxWidth:300,padding:'13px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:13,color:'rgba(255,255,255,0.65)',fontSize:15,fontWeight:500,cursor:'pointer',fontFamily:'inherit' },
  mediaFullScreen: { position:'absolute',inset:0 },
  mediaCover:      { width:'100%',height:'100%',objectFit:'cover' },
  topGrad:         { position:'absolute',top:0,left:0,right:0,height:180,background:'linear-gradient(to bottom,rgba(0,0,0,0.65),transparent)',pointerEvents:'none' },
  botGrad:         { position:'absolute',bottom:0,left:0,right:0,height:220,background:'linear-gradient(to top,rgba(0,0,0,0.75),transparent)',pointerEvents:'none' },
  overlayBtn:      { width:36,height:36,borderRadius:'50%',background:'rgba(0,0,0,0.5)',backdropFilter:'blur(10px)',border:'1px solid rgba(255,255,255,0.14)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer' },
}
