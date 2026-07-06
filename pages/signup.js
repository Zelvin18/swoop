import { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

function LockIcon()  { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> }
function MailIcon()  { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> }
function PhoneIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013 4.7a19.79 19.79 0 01-3.07-8.67A2 2 0 011.72 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg> }
function UserIcon()  { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }
function EyeIcon({ open }) { return open ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> }
function Spinner()   { return <div style={{ width:16,height:16,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin 0.7s linear infinite',marginRight:8 }}/> }
function CheckIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg> }

function Field({ icon, placeholder, value, onChange, type='text', autoComplete, right, half }) {
  return (
    <div style={{ position:'relative', display:'flex', alignItems:'center', flex: half?1:'auto' }}>
      <div style={{ position:'absolute', left:13, color:'rgba(255,255,255,0.3)', pointerEvents:'none', display:'flex' }}>{icon}</div>
      <input value={value} onChange={onChange} type={type} placeholder={placeholder} autoComplete={autoComplete}
        style={{ width:'100%', padding:'14px 40px 14px 40px', background:'#141414', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, color:'white', fontSize:14, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}/>
      {right && <div style={{ position:'absolute', right:10 }}>{right}</div>}
    </div>
  )
}

export default function SignupPage() {
  const router = useRouter()
  const [firstName,    setFirstName]    = useState('')
  const [lastName,     setLastName]     = useState('')
  const [email,        setEmail]        = useState('')
  const [phone,        setPhone]        = useState('')
  const [password,     setPassword]     = useState('')
  const [confirmPw,    setConfirmPw]    = useState('')
  const [showPw,       setShowPw]       = useState(false)
  const [showCPw,      setShowCPw]      = useState(false)
  const [agreeTerms,   setAgreeTerms]   = useState(false)
  const [agreeUpdates, setAgreeUpdates] = useState(true)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')

  const handleSignup = async (e) => {
    e.preventDefault()
    setError('')
    if (!firstName.trim()) return setError('Enter your first name.')
    if (!email.trim())     return setError('Enter your email address.')
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    if (password !== confirmPw) return setError('Passwords do not match.')
    if (!agreeTerms) return setError('Please agree to the Terms of Service.')

    setLoading(true)
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone } },
    })

    if (authError) { setError(authError.message); setLoading(false); return }

    // Create profile immediately (no email confirmation needed for demo)
    if (data.user) {
      await supabase.from('profiles').upsert({
        id:        data.user.id,
        full_name: fullName,
        username:  firstName.toLowerCase().replace(/[^a-z0-9]/g,'') + '_' + Math.floor(Math.random()*9999),
        phone,
        location:  'Kampala, Uganda',
        verified:  false,
      })
      // Initialize settings
      await supabase.from('user_settings').upsert({ id: data.user.id })
    }

    setLoading(false)
    router.push('/')
  }

  return (
    <>
      <Head>
        <title>Create Account — Swoop</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no"/>
      </Head>
      <div style={S.page}>

        {/* Hero banner */}
        <div style={S.hero}>
          {/* Back button */}
          <Link href="/login" style={S.backBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </Link>

          {/* Ambient glow */}
          <div style={S.heroGlow}/>

          {/* 3D phone illustration — CSS drawn */}
          <div style={S.phoneWrap}>
            {/* Floating user icons */}
            <div style={{ position:'absolute', top:20, left:20, width:36, height:36, borderRadius:10, background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div style={{ position:'absolute', bottom:30, right:10, width:32, height:32, borderRadius:9, background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            {/* + badge */}
            <div style={{ position:'absolute', bottom:40, right:-8, width:26, height:26, borderRadius:'50%', background:'linear-gradient(135deg,#FF3366,#FF6633)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:900, color:'white', boxShadow:'0 4px 12px rgba(255,51,102,0.5)' }}>+</div>
            {/* Phone body */}
            <div style={{ width:90, height:150, borderRadius:16, background:'linear-gradient(160deg,#1a1a1a,#0d0d0d)', border:'2px solid rgba(255,51,102,0.6)', position:'relative', boxShadow:'0 0 30px rgba(255,51,102,0.3)', display:'flex', flexDirection:'column', alignItems:'center', padding:'14px 10px', gap:7 }}>
              {/* Avatar circle */}
              <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#FF3366,#FF6633)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              {/* Lines */}
              {[60,50,40].map((w,i)=><div key={i} style={{ width:`${w}px`, height:5, borderRadius:3, background:'rgba(255,51,102,0.5)' }}/>)}
            </div>
          </div>

          {/* Title */}
          <div style={S.heroText}>
            <div style={{ fontSize:28, fontWeight:900, letterSpacing:'-0.5px', lineHeight:1.1 }}>
              Create <span style={{ color:'#FF3366' }}>account</span>
            </div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginTop:8, lineHeight:1.6 }}>
              Join SWOOP and start your journey<br/>of buying, selling and connecting.
            </div>
          </div>
        </div>

        {/* Form */}
        <div style={S.formWrap}>
          <form onSubmit={handleSignup} style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {/* Name row */}
            <div style={{ display:'flex', gap:10 }}>
              <Field icon={<UserIcon/>} placeholder="First name"  value={firstName} onChange={e=>setFirstName(e.target.value)}  half/>
              <Field icon={<UserIcon/>} placeholder="Last name"   value={lastName}  onChange={e=>setLastName(e.target.value)}   half/>
            </div>
            <Field icon={<MailIcon/>}  placeholder="Email address"  value={email}    onChange={e=>setEmail(e.target.value)}    type="email"    autoComplete="email"/>
            <Field icon={<PhoneIcon/>} placeholder="Phone number"   value={phone}    onChange={e=>setPhone(e.target.value)}    type="tel"/>
            <Field icon={<LockIcon/>} placeholder="Password"       value={password} onChange={e=>setPassword(e.target.value)} type={showPw?'text':'password'} autoComplete="new-password"
              right={<button type="button" onClick={()=>setShowPw(p=>!p)} style={S.eyeBtn}><EyeIcon open={showPw}/></button>}/>
            <Field icon={<LockIcon/>} placeholder="Confirm password" value={confirmPw} onChange={e=>setConfirmPw(e.target.value)} type={showCPw?'text':'password'} autoComplete="new-password"
              right={<button type="button" onClick={()=>setShowCPw(p=>!p)} style={S.eyeBtn}><EyeIcon open={showCPw}/></button>}/>

            {error && <div style={S.error}>{error}</div>}

            {/* Checkboxes */}
            <div style={{ display:'flex', flexDirection:'column', gap:10, margin:'4px 0' }}>
              <CheckRow checked={agreeTerms} onChange={()=>setAgreeTerms(t=>!t)}>
                I agree to the <span style={{color:'#FF3366',cursor:'pointer'}}> Terms of Service</span> and <span style={{color:'#FF3366',cursor:'pointer'}}>Privacy Policy</span>
              </CheckRow>
              <CheckRow checked={agreeUpdates} onChange={()=>setAgreeUpdates(t=>!t)}>
                I want to receive updates and offers from SWOOP
              </CheckRow>
            </div>

            <button type="submit" disabled={loading} style={{ ...S.primaryBtn, opacity:loading?0.7:1 }}>
              {loading ? <><Spinner/> Creating account...</> : 'Create account'}
            </button>
          </form>

          <div style={{ textAlign:'center', marginTop:18, fontSize:14, color:'rgba(255,255,255,0.4)', paddingBottom:16 }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color:'#FF3366', fontWeight:700, textDecoration:'none' }}>Login</Link>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </>
  )
}

function CheckRow({ checked, onChange, children }) {
  return (
    <div onClick={onChange} style={{ display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer' }}>
      <div style={{ width:20, height:20, borderRadius:6, background:checked?'#FF3366':'transparent', border:`1.5px solid ${checked?'#FF3366':'rgba(255,255,255,0.2)'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1, transition:'all 0.2s' }}>
        {checked && <CheckIcon/>}
      </div>
      <span style={{ fontSize:12, color:'rgba(255,255,255,0.6)', lineHeight:1.5 }}>{children}</span>
    </div>
  )
}

const S = {
  page:       { minHeight:'100dvh', background:'#000', display:'flex', flexDirection:'column', fontFamily:"'Inter',sans-serif", color:'#fff', overflowY:'auto' },
  hero:       { position:'relative', minHeight:220, display:'flex', flexDirection:'column', justifyContent:'flex-end', padding:'20px 24px 20px', overflow:'hidden' },
  heroGlow:   { position:'absolute', bottom:0, right:0, width:250, height:250, borderRadius:'50%', background:'radial-gradient(ellipse,rgba(255,51,102,0.2),transparent 70%)', pointerEvents:'none' },
  heroText:   { position:'relative', zIndex:2 },
  phoneWrap:  { position:'absolute', right:20, top:16, width:130, height:190, display:'flex', alignItems:'center', justifyContent:'center', zIndex:1 },
  backBtn:    { width:38, height:38, borderRadius:'50%', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', textDecoration:'none', marginBottom:16, flexShrink:0, zIndex:2, position:'relative' },
  formWrap:   { flex:1, padding:'16px 22px', paddingBottom:'calc(env(safe-area-inset-bottom,0px) + 20px)' },
  primaryBtn: { width:'100%', padding:'15px', background:'linear-gradient(135deg,#FF3366,#FF6633)', border:'none', borderRadius:14, color:'white', fontSize:16, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 20px rgba(255,51,102,0.45)', marginTop:4 },
  error:      { background:'rgba(255,51,102,0.1)', border:'1px solid rgba(255,51,102,0.3)', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#FF3366' },
  eyeBtn:     { background:'none', border:'none', cursor:'pointer', padding:4, display:'flex', alignItems:'center' },
}
