import { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

function Spinner() { return <div style={{width:16,height:16,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin 0.7s linear infinite',marginRight:8}}/> }
function EyeIcon({ open }) {
  return open
    ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
    : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
}

export default function LoginPage() {
  const router   = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [password,   setPassword]   = useState('')
  const [showPw,     setShowPw]     = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const isEmail = identifier.includes('@')
    const email   = isEmail
      ? identifier.trim().toLowerCase()
      : `${identifier.replace(/\D/g,'').replace(/^0/,'256')}@swoop.ug`
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError('Invalid email/phone or password.')
      setLoading(false)
      return
    }
    router.push('/')
  }

  return (
    <>
      <Head>
        <title>Login — Swoop</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no"/>
      </Head>

      <div style={S.page}>

        {/* ── LOGO ── */}
        <div style={S.logoSection}>
          <img src="/swoop-logo.png" alt="SWOOP" style={S.logoImg}/>
        </div>

        {/* ── WELCOME TEXT ── */}
        <div style={S.welcomeSection}>
          <div style={S.welcomeTitle}>Welcome back 👋</div>
          <div style={S.welcomeSub}>Login to continue to your account</div>
        </div>

        {/* ── FORM ── */}
        <div style={S.formSection}>
          <form onSubmit={handleLogin} style={S.form}>

            {/* Email / Phone */}
            <div style={S.fieldWrap}>
              <div style={S.fieldIcon}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </div>
              <input
                type="text"
                placeholder="Email or phone number"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                autoComplete="username"
                required
                style={S.input}
              />
            </div>

            {/* Password */}
            <div style={S.fieldWrap}>
              <div style={S.fieldIcon}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              </div>
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                style={{ ...S.input, paddingRight: 46 }}
              />
              <button type="button" onClick={() => setShowPw(p => !p)} style={S.eyeBtn}>
                <EyeIcon open={showPw}/>
              </button>
            </div>

            {error && <div style={S.error}>{error}</div>}

            {/* Forgot */}
            <div style={{ textAlign:'right' }}>
              <span style={S.forgot}>Forgot password?</span>
            </div>

            {/* Login button */}
            <button type="submit" disabled={loading} style={{ ...S.loginBtn, opacity: loading ? 0.7 : 1 }}>
              {loading ? <><Spinner/>Logging in...</> : 'Login'}
            </button>
          </form>

          {/* Divider */}
          <div style={S.divider}>
            <div style={S.divLine}/>
            <span style={S.divText}>or continue with</span>
            <div style={S.divLine}/>
          </div>

          {/* Social buttons */}
          <div style={S.socialRow}>
            <button onClick={() => supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:`${window.location.origin}/`}})} style={S.socialBtn}>
              <svg width="16" height="16" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
              Google
            </button>
            <button onClick={() => {}} style={S.socialBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Facebook
            </button>
            <button onClick={() => {}} style={S.socialBtn}>
              <svg width="16" height="16" viewBox="0 0 814 1000" fill="white"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46.7 790.7 0 663 0 541.8c0-194.3 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/></svg>
              Apple
            </button>
          </div>

          {/* Sign up link */}
          <div style={S.signupRow}>
            Don&apos;t have an account?{' '}
            <Link href="/signup" style={S.signupLink}>Create account</Link>
          </div>
        </div>

        {/* ── BAG IMAGE at bottom ── */}
        <div style={S.bagSection}>
          <img src="/swoop-bag.png" alt="" style={S.bagImg}/>
        </div>

      </div>

      <style>{`
        @keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
      `}</style>
    </>
  )
}

const S = {
  page: {
    minHeight: '100dvh',
    background: '#000',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    fontFamily: "'Inter', -apple-system, sans-serif",
    color: '#fff',
    overflowY: 'auto',
    overflowX: 'hidden',
  },

  /* Logo */
  logoSection: {
    paddingTop: 52,
    paddingBottom: 8,
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
  },
  logoImg: {
    width: 200,
    height: 'auto',
    objectFit: 'contain',
  },

  /* Welcome */
  welcomeSection: {
    padding: '20px 28px 4px',
    width: '100%',
    maxWidth: 430,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: 900,
    letterSpacing: '-0.5px',
    marginBottom: 6,
  },
  welcomeSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
  },

  /* Form */
  formSection: {
    width: '100%',
    maxWidth: 430,
    padding: '20px 22px 0',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  fieldWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  fieldIcon: {
    position: 'absolute',
    left: 14,
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    padding: '15px 14px 15px 44px',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 13,
    color: '#fff',
    fontSize: 15,
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
  },
  error: {
    background: 'rgba(255,51,102,0.1)',
    border: '1px solid rgba(255,51,102,0.3)',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 13,
    color: '#FF3366',
  },
  forgot: {
    fontSize: 13,
    color: '#FF3366',
    fontWeight: 600,
    cursor: 'pointer',
  },
  loginBtn: {
    width: '100%',
    padding: '15px',
    background: 'linear-gradient(135deg, #FF3366, #FF6633)',
    border: 'none',
    borderRadius: 14,
    color: '#fff',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 20px rgba(255,51,102,0.45)',
    marginTop: 4,
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    margin: '20px 0',
  },
  divLine: { flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' },
  divText: { fontSize: 12, color: '#52525B', fontWeight: 600, whiteSpace: 'nowrap' },

  socialRow: {
    display: 'flex',
    gap: 10,
  },
  socialBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '11px 6px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    color: 'white',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },

  signupRow: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },
  signupLink: {
    color: '#FF3366',
    fontWeight: 700,
    textDecoration: 'none',
  },

  /* Bag */
  bagSection: {
    marginTop: 'auto',
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    paddingBottom: 'calc(env(safe-area-inset-bottom, 0px))',
  },
  bagImg: {
    width: '100%',
    maxWidth: 360,
    height: 'auto',
    objectFit: 'contain',
    display: 'block',
  },
}
