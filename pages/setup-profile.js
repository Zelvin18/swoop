import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

function Spinner() { return <div style={{width:16,height:16,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin 0.7s linear infinite',marginRight:8}}/> }

export default function SetupProfilePage() {
  const router = useRouter()
  const [user,          setUser]          = useState(null)
  const [username,      setUsername]      = useState('')
  const [usernameOk,    setUsernameOk]    = useState(null)   // null | true | false
  const [checkingUN,    setCheckingUN]    = useState(false)
  const [avatarUrl,     setAvatarUrl]     = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarFile,    setAvatarFile]    = useState(null)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')
  const fileRef  = useRef(null)
  const unTimer  = useRef(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }
      setUser(user)
      // Pre-fill username from full name
      const name = user.user_metadata?.full_name || ''
      const base = name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g,'')
      if (base) setUsername(base)
    })
  }, [])

  // Debounced username availability check
  useEffect(() => {
    if (!username || username.length < 3) { setUsernameOk(null); return }
    clearTimeout(unTimer.current)
    setCheckingUN(true)
    unTimer.current = setTimeout(async () => {
      const { data } = await supabase.from('profiles').select('id').eq('username', username.toLowerCase()).neq('id', user?.id || '').maybeSingle()
      setUsernameOk(!data)
      setCheckingUN(false)
    }, 400)
    return () => clearTimeout(unTimer.current)
  }, [username, user?.id])

  const handlePickPhoto = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleContinue = async () => {
    if (!username.trim() || username.length < 3) { setError('Username must be at least 3 characters.'); return }
    if (usernameOk === false) { setError('That username is already taken.'); return }
    if (!user) return
    setLoading(true); setError('')

    let uploadedUrl = null
    if (avatarFile) {
      const ext  = avatarFile.name.split('.').pop() || 'jpg'
      const path = `${user.id}/avatar.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true })
      if (!upErr) {
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
        uploadedUrl = publicUrl
      }
    }

    const { error: profileErr } = await supabase.from('profiles').upsert({
      id:         user.id,
      username:   username.trim().toLowerCase(),
      avatar_url: uploadedUrl || undefined,
    })

    setLoading(false)
    if (profileErr) { setError(profileErr.message); return }
    router.replace('/')
  }

  const initial = (user?.user_metadata?.full_name || 'U')[0].toUpperCase()
  const unStatus = checkingUN ? 'checking' : usernameOk === true ? 'available' : usernameOk === false ? 'taken' : null

  return (
    <>
      <Head>
        <title>Set Up Profile — Swoop</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no"/>
      </Head>
      <div style={S.page}>
        <input ref={fileRef} type="file" accept="image/*" onChange={handlePickPhoto} style={{display:'none'}}/>

        {/* Logo + step indicator */}
        <div style={S.topBar}>
          <div style={{fontSize:22,fontWeight:900,letterSpacing:'-1px',display:'flex',alignItems:'center',gap:0}}>
            <span style={{color:'white'}}>SW</span>
            <span style={{background:'linear-gradient(135deg,#FF3366,#FF6633)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',fontSize:24}}>∞</span>
            <span style={{color:'white'}}>P</span>
          </div>
          {/* 3-dot progress */}
          <div style={{display:'flex',gap:5,alignItems:'center'}}>
            <div style={{width:20,height:4,borderRadius:2,background:'rgba(255,255,255,0.15)'}}/>
            <div style={{width:20,height:4,borderRadius:2,background:'rgba(255,255,255,0.15)'}}/>
            <div style={{width:20,height:4,borderRadius:2,background:'#FF3366'}}/>
          </div>
        </div>

        {/* Hero text */}
        <div style={{padding:'24px 24px 20px',textAlign:'center'}}>
          <div style={{fontSize:26,fontWeight:900,letterSpacing:'-0.5px',lineHeight:1.2,marginBottom:8}}>
            Almost there! 👋<br/>
            <span style={{color:'white'}}>Let&apos;s set up </span>
            <span style={{color:'#FF3366'}}>your profile</span>
          </div>
          <div style={{fontSize:13,color:'rgba(255,255,255,0.45)',lineHeight:1.6}}>
            Add a profile picture and username<br/>so others can recognize you.
          </div>
        </div>

        {/* Avatar section */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'0 24px 24px',gap:16}}>
          {/* Avatar circle */}
          <div style={{position:'relative',cursor:'pointer'}} onClick={()=>fileRef.current?.click()}>
            <div style={{width:110,height:110,borderRadius:'50%',border:'3px solid #FF3366',background:'#1a1a1a',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',boxShadow:'0 0 0 6px rgba(255,51,102,0.1)'}}>
              {avatarPreview
                ? <img src={avatarPreview} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                : <span style={{fontSize:42,fontWeight:900,color:'rgba(255,255,255,0.6)'}}>{initial}</span>
              }
            </div>
            {/* Camera badge */}
            <div style={{position:'absolute',bottom:4,right:4,width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#FF3366,#FF6633)',border:'2.5px solid #000',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 10px rgba(255,51,102,0.5)'}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,width:'100%',maxWidth:340}}>
            {[
              {icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>, label:'Photo Library', onClick:()=>fileRef.current?.click()},
              {icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>, label:'Take Photo', onClick:()=>fileRef.current?.click()},
              {icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>, label:'Avatar', onClick:()=>{}},
              {icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>, label:'Remove', onClick:()=>{setAvatarPreview(null);setAvatarFile(null)}},
            ].map((btn,i)=>(
              <button key={i} onClick={btn.onClick} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,padding:'12px 8px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12,cursor:'pointer',color:'rgba(255,255,255,0.7)',fontFamily:'inherit'}}>
                <div style={{color:'#FF3366'}}>{btn.icon}</div>
                <span style={{fontSize:10,fontWeight:600,textAlign:'center',lineHeight:1.2}}>{btn.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Username section */}
        <div style={{padding:'0 24px 32px',display:'flex',flexDirection:'column',gap:8}}>
          <div style={{fontSize:15,fontWeight:700,marginBottom:2}}>Choose your username</div>
          <div style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginBottom:8}}>This is how people will find and recognize you on SWOOP.</div>

          <div style={{position:'relative',display:'flex',alignItems:'center'}}>
            <div style={{position:'absolute',left:13,color:'rgba(255,255,255,0.3)',pointerEvents:'none',display:'flex'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <input
              value={username}
              onChange={e=>setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g,''))}
              placeholder="@yourusername"
              maxLength={30}
              style={{width:'100%',padding:'14px 44px 14px 40px',background:'rgba(255,255,255,0.06)',border:`1.5px solid ${unStatus==='available'?'#22C55E':unStatus==='taken'?'rgba(255,51,102,0.5)':'rgba(255,255,255,0.1)'}`,borderRadius:12,color:'white',fontSize:14,outline:'none',fontFamily:'inherit',boxSizing:'border-box',transition:'border-color 0.2s'}}
            />
            <div style={{position:'absolute',right:12}}>
              {checkingUN && <Spinner/>}
              {!checkingUN && unStatus==='available' && (
                <div style={{width:24,height:24,borderRadius:'50%',background:'#22C55E',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                </div>
              )}
              {!checkingUN && unStatus==='taken' && (
                <div style={{width:24,height:24,borderRadius:'50%',background:'rgba(255,51,102,0.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FF3366" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </div>
              )}
            </div>
          </div>

          {/* Status text */}
          {unStatus==='available' && <div style={{fontSize:12,color:'#22C55E',fontWeight:600}}>✓ Great choice! This username is available.</div>}
          {unStatus==='taken'     && <div style={{fontSize:12,color:'#FF3366',fontWeight:600}}>✗ That username is already taken.</div>}
          {error && <div style={{fontSize:12,color:'#FF3366',fontWeight:600}}>{error}</div>}

          {/* Continue button */}
          <button onClick={handleContinue} disabled={loading||!username||usernameOk===false}
            style={{width:'100%',padding:'15px',background:'linear-gradient(135deg,#FF3366,#FF6633)',border:'none',borderRadius:14,color:'white',fontSize:16,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:'0 4px 20px rgba(255,51,102,0.4)',marginTop:8,opacity:loading||!username||usernameOk===false?0.5:1,transition:'opacity 0.2s'}}>
            {loading?<><Spinner/>Setting up...</>:<>Continue <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>}
          </button>

          <div style={{textAlign:'center',fontSize:12,color:'rgba(255,255,255,0.3)',marginTop:6,display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            You can change this later in your settings.
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </>
  )
}

const S = {
  page:   {minHeight:'100dvh',background:'#000',display:'flex',flexDirection:'column',fontFamily:"'Inter',sans-serif",color:'#fff',overflowY:'auto'},
  topBar: {display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 24px 8px'},
}
