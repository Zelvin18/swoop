import { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword]     = useState('')
  const [showPw, setShowPw]         = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Determine if identifier is email or phone
    const isEmail = identifier.includes('@')
    const email   = isEmail ? identifier : `${identifier.replace(/\s+/g,'')}@swoop.ug`

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push('/')
  }

  return (
    <>
      <Head>
        <title>Login — Swoop Uganda</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no" />
      </Head>

      <div style={styles.page}>
        {/* Logo */}
        <div style={styles.logoWrap}>
          <div style={styles.logoIcon}>∞</div>
          <div style={styles.logoName}>swoop</div>
          <div style={styles.logoTag}>SHOP. STREAM. CONNECT.</div>
        </div>

        {/* Hero illustration area */}
        <div style={styles.heroArea}>
          <div style={styles.heroEmojis}>
            <span style={{...styles.floatEmoji, top:'10%', left:'8%', animationDelay:'0s'}}>❤️</span>
            <span style={{...styles.floatEmoji, top:'5%',  left:'55%', animationDelay:'0.6s'}}>💬</span>
            <span style={{...styles.floatEmoji, top:'50%', left:'3%', animationDelay:'1.2s'}}>👟</span>
            <span style={{...styles.floatEmoji, top:'55%', left:'78%', animationDelay:'0.3s'}}>📱</span>
          </div>
          <div style={styles.heroCard}>
            <div style={styles.heroBag}>🛍️</div>
            <div style={styles.heroCardName}>swoop</div>
          </div>
        </div>

        {/* Form card */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>Welcome back 👋</div>
          <div style={styles.cardSub}>Login to continue shopping</div>

          <form onSubmit={handleLogin} style={styles.form}>
            {/* Email / phone */}
            <div style={styles.inputWrap}>
              <i className="fas fa-user" style={styles.inputIcon} />
              <input
                type="text"
                placeholder="Email or phone number"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                style={styles.input}
                autoComplete="username"
                required
              />
            </div>

            {/* Password */}
            <div style={styles.inputWrap}>
              <i className="fas fa-lock" style={styles.inputIcon} />
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{...styles.input, paddingRight: 44}}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                style={styles.eyeBtn}
              >
                <i className={`fas ${showPw ? 'fa-eye-slash' : 'fa-eye'}`} style={{fontSize:15, color:'#71717A'}} />
              </button>
            </div>

            {error && <div style={styles.errorMsg}>{error}</div>}

            <div style={{textAlign:'right', marginBottom:20}}>
              <span style={styles.forgotLink}>Forgot password?</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{...styles.btnPrimary, opacity: loading ? 0.7 : 1}}
            >
              {loading
                ? <><i className="fas fa-spinner fa-spin" style={{marginRight:8}} />Logging in...</>
                : 'Login'
              }
            </button>
          </form>

          <div style={styles.divider}>
            <div style={styles.dividerLine} />
            <span style={styles.dividerText}>OR</span>
            <div style={styles.dividerLine} />
          </div>

          <button
            style={styles.btnSocial}
            onClick={() => supabase.auth.signInWithOAuth({ provider:'google', options:{ redirectTo: `${window.location.origin}/` } })}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" style={{marginRight:10}}>
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            Continue with Google
          </button>

          <div style={styles.switchRow}>
            New to Swoop?{' '}
            <Link href="/signup" style={styles.switchLink}>Create account</Link>
          </div>
        </div>
      </div>
    </>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#000',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    fontFamily: "'Inter', -apple-system, sans-serif",
    color: '#fff',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  logoWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 8,
    gap: 2,
  },
  logoIcon: {
    fontSize: 52,
    lineHeight: 1,
    background: 'linear-gradient(135deg, #C026D3, #FF3366, #F97316)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  logoName: {
    fontSize: 34,
    fontWeight: 900,
    letterSpacing: '-1px',
    background: 'linear-gradient(135deg, #C026D3, #FF3366, #F97316)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  logoTag: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: 3,
    color: '#52525B',
    marginTop: 2,
  },
  heroArea: {
    position: 'relative',
    width: '100%',
    maxWidth: 430,
    height: 160,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroEmojis: {
    position: 'absolute',
    inset: 0,
  },
  floatEmoji: {
    position: 'absolute',
    fontSize: 24,
    animation: 'floatUp 3s ease-in-out infinite alternate',
    opacity: 0.7,
  },
  heroCard: {
    width: 100,
    height: 100,
    borderRadius: 24,
    background: 'linear-gradient(135deg, #1a001a, #2d0050)',
    border: '1px solid rgba(255,51,102,0.3)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    boxShadow: '0 8px 32px rgba(255,51,102,0.25)',
  },
  heroBag: {
    fontSize: 42,
  },
  heroCardName: {
    fontSize: 13,
    fontWeight: 800,
    background: 'linear-gradient(135deg, #C026D3, #FF3366)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  card: {
    width: '100%',
    maxWidth: 430,
    background: '#0d0d0d',
    borderTop: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '24px 24px 0 0',
    padding: '28px 24px 40px',
    flex: 1,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 800,
    marginBottom: 4,
    letterSpacing: '-0.5px',
  },
  cardSub: {
    fontSize: 14,
    color: '#71717A',
    marginBottom: 24,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  inputWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 14,
    fontSize: 15,
    color: '#52525B',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    padding: '14px 14px 14px 42px',
    background: '#141414',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    color: '#fff',
    fontSize: 15,
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
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
  errorMsg: {
    background: 'rgba(255,51,102,0.1)',
    border: '1px solid rgba(255,51,102,0.3)',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 13,
    color: '#FF3366',
    marginTop: -4,
  },
  forgotLink: {
    fontSize: 13,
    color: '#FF3366',
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnPrimary: {
    width: '100%',
    padding: '15px',
    background: 'linear-gradient(135deg, #D946EF, #FF3366, #F97316)',
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
    boxShadow: '0 4px 20px rgba(255,51,102,0.4)',
    transition: 'opacity 0.2s',
    marginTop: 4,
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    margin: '24px 0',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: 'rgba(255,255,255,0.08)',
  },
  dividerText: {
    fontSize: 12,
    color: '#52525B',
    fontWeight: 600,
    letterSpacing: 1,
  },
  btnSocial: {
    width: '100%',
    padding: '13px',
    background: '#141414',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 14,
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    transition: 'background 0.2s',
  },
  switchRow: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
    color: '#71717A',
  },
  switchLink: {
    color: '#FF3366',
    fontWeight: 700,
    textDecoration: 'none',
  },
}
