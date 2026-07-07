import { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

// ── SWOOP logo matching the brand ────────────────────────────────────────────
function SwoopLogo({ size = 48 }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
      <div style={{ fontSize: size, fontWeight:900, letterSpacing:'-2px', lineHeight:1, display:'flex', alignItems:'center' }}>
        <span style={{ color:'white' }}>SW</span>
        <span style={{ background:'linear-gradient(135deg,#FF3366,#FF6633)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', fontSize: size * 1.1, letterSpacing:'-4px', margin:'0 -2px' }}>∞</span>
        <span style={{ color:'white' }}>P</span>
      </div>
      <div style={{ fontSize:10, fontWeight:700, letterSpacing:3, color:'rgba(255,255,255,0.35)' }}>BUY. SELL. CONNECT.</div>
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [password,   setPassword]   = useState('')
  const [showPw,     setShowPw]     = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    const isEmail = identifier.includes('@')
    // Phone login: we registered them with phone@swoop.ug pattern
    const email = isEmail
      ? identifier.trim().toLowerCase()
      : `${identifier.replace(/\D/g,'').replace(/^0/,'256')}@swoop.ug`
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) { setError('Invalid email/phone or password. Please check your details.'); setLoading(false); return }
    router.push('/')
  }

  return (
    <>
      <Head>
        <title>Login — Swoop</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no"/>
      </Head>
      <div style={S.page}>
        {/* Top section — logo + hero */}
        <div style={S.top}>
          {/* Ambient glow */}
          <div style={S.glow}/>

          {/* Logo */}
          <div style={{ paddingTop: 48, marginBottom: 8, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
            <SwoopLogo size={36}/>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:3, color:'rgba(255,255,255,0.35)' }}>BUY. SELL. CONNECT.</div>
          </div>

          {/* Welcome text */}
          <div style={{ padding:'28px 28px 0', flex:1, display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
            <div style={{ fontSize:26, fontWeight:900, letterSpacing:'-0.5px', marginBottom:6 }}>Welcome back 👋</div>
            <div style={{ fontSize:14, color:'rgba(255,255,255,0.45)', marginBottom:24 }}>Login to continue to your account</div>
          </div>

          {/* Shopping bag hero — CSS-drawn 3D effect */}
          <div style={{ position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)', width:220, height:160, display:'flex', alignItems:'flex-end', justifyContent:'center', pointerEvents:'none' }}>
            {/* Platform */}
            <div style={{ width:180, height:20, borderRadius:'50%', background:'radial-gradient(ellipse,rgba(255,51,102,0.4),transparent 70%)', position:'absolute', bottom:0 }}/>
            {/* Bag */}
            <div style={{ width:100, height:110, borderRadius:'0 0 18px 18px', background:'linear-gradient(160deg,#FF3366,#FF6633)', position:'relative', boxShadow:'0 0 40px rgba(255,51,102,0.5)', marginBottom:10 }}>
              {/* Handles */}
              <div style={{ position:'absolute', top:-18, left:'50%', transform:'translateX(-50%)', display:'flex', gap:14 }}>
                <div style={{ width:14, height:28, borderRadius:'8px 8px 0 0', border:'4px solid #FF3366', borderBottom:'none', background:'transparent' }}/>
                <div style={{ width:14, height:28, borderRadius:'8px 8px 0 0', border:'4px solid #FF3366', borderBottom:'none', background:'transparent' }}/>
              </div>
              {/* Infinity logo on bag */}
              <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', fontSize:32, color:'rgba(255,255,255,0.9)' }}>∞</div>
              {/* Shine */}
              <div style={{ position:'absolute', top:8, left:10, width:20, height:40, background:'rgba(255,255,255,0.15)', borderRadius:10, transform:'rotate(-20deg)' }}/>
            </div>
          </div>
        </div>

        {/* Bottom form card */}
        <div style={S.card}>
          <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {/* Email/phone */}
            <Field icon={<MailIcon/>} placeholder="Email or phone number" value={identifier} onChange={e=>setIdentifier(e.target.value)} type="text" autoComplete="username"/>
            {/* Password */}
            <Field icon={<LockIcon/>} placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} type={showPw?'text':'password'} autoComplete="current-password"
              right={<button type="button" onClick={()=>setShowPw(p=>!p)} style={S.eyeBtn}><EyeIcon open={showPw}/></button>}
            />

            {error && <div style={S.error}>{error}</div>}

            <div style={{ textAlign:'right', marginBottom:4 }}>
              <span style={{ fontSize:13, color:'#FF3366', fontWeight:600, cursor:'pointer' }}>Forgot password?</span>
            </div>

            <button type="submit" disabled={loading} style={{ ...S.primaryBtn, opacity:loading?0.7:1 }}>
              {loading ? <><Spinner/> Logging in...</> : 'Login'}
            </button>
          </form>

          {/* Social auth */}
          <div style={S.divider}><div style={S.divLine}/><span style={S.divText}>or continue with</span><div style={S.divLine}/></div>
          <div style={{ display:'flex', gap:10 }}>
            <SocialBtn icon={<GoogleIcon/>} label="Google" onClick={()=>supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:`${window.location.origin}/`}})}/>
            <SocialBtn icon={<FacebookIcon/>} label="Facebook" onClick={()=>{}}/>
            <SocialBtn icon={<AppleIcon/>} label="Apple" onClick={()=>{}}/>
          </div>

          <div style={{ textAlign:'center', marginTop:20, fontSize:14, color:'rgba(255,255,255,0.4)' }}>
            Don&apos;t have an account?{' '}
            <Link href="/signup" style={{ color:'#FF3366', fontWeight:700, textDecoration:'none' }}>Create account</Link>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Shared sub-components ─────────────────────────────────────────────────────
function Field({ icon, placeholder, value, onChange, type='text', autoComplete, right }) {
  return (
    <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
      <div style={{ position:'absolute', left:14, color:'rgba(255,255,255,0.3)', pointerEvents:'none', display:'flex' }}>{icon}</div>
      <input value={value} onChange={onChange} type={type} placeholder={placeholder} autoComplete={autoComplete}
        style={{ width:'100%', padding:'15px 44px 15px 44px', background:'#141414', border:'1px solid rgba(255,255,255,0.08)', borderRadius:13, color:'white', fontSize:15, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}/>
      {right && <div style={{ position:'absolute', right:12 }}>{right}</div>}
    </div>
  )
}
function SocialBtn({ icon, label, onClick }) {
  return (
    <button onClick={onClick} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'11px 8px', background:'#141414', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, color:'white', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
      {icon} {label}
    </button>
  )
}
function Spinner() { return <div style={{ width:16,height:16,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin 0.7s linear infinite',marginRight:8 }}/>}
function MailIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> }
function LockIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> }
function EyeIcon({ open }) { return open ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> }
function GoogleIcon() { return <svg width="16" height="16" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg> }
function FacebookIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> }
function AppleIcon() { return <svg width="16" height="16" viewBox="0 0 814 1000" fill="white"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46.7 790.7 0 663 0 541.8c0-194.3 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/></svg> }

const S = {
  page: { minHeight:'100dvh', background:'#000', display:'flex', flexDirection:'column', fontFamily:"'Inter',sans-serif", color:'#fff', overflow:'hidden' },
  top:  { flex:1, position:'relative', display:'flex', flexDirection:'column', minHeight:320, overflow:'hidden' },
  glow: { position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)', width:300, height:200, borderRadius:'50%', background:'radial-gradient(ellipse,rgba(255,51,102,0.25),transparent 70%)', pointerEvents:'none' },
  card: { background:'#0d0d0d', borderRadius:'24px 24px 0 0', borderTop:'1px solid rgba(255,255,255,0.07)', padding:'28px 22px', paddingBottom:'calc(env(safe-area-inset-bottom,0px) + 28px)', flexShrink:0 },
  primaryBtn: { width:'100%', padding:'15px', background:'linear-gradient(135deg,#FF3366,#FF6633)', border:'none', borderRadius:14, color:'white', fontSize:16, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 20px rgba(255,51,102,0.45)' },
  error: { background:'rgba(255,51,102,0.1)', border:'1px solid rgba(255,51,102,0.3)', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#FF3366' },
  eyeBtn: { background:'none', border:'none', cursor:'pointer', padding:4, display:'flex', alignItems:'center' },
  divider: { display:'flex', alignItems:'center', gap:12, margin:'20px 0' },
  divLine: { flex:1, height:1, background:'rgba(255,255,255,0.07)' },
  divText: { fontSize:12, color:'#52525B', fontWeight:600, whiteSpace:'nowrap' },
}
