import { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

const STEPS = ['account', 'profile']

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep]           = useState('account')
  const [fullName, setFullName]   = useState('')
  const [phone, setPhone]         = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [username, setUsername]   = useState('')
  const [location, setLocation]   = useState('Kampala, Uganda')
  const [showPw, setShowPw]       = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  // Step 1 — create auth account
  const handleContinue = async (e) => {
    e.preventDefault()
    setError('')

    if (!fullName.trim())    return setError('Please enter your full name.')
    if (!phone.trim())       return setError('Please enter your phone number.')
    if (!email.trim())       return setError('Please enter your email address.')
    if (password.length < 6) return setError('Password must be at least 6 characters.')

    setLoading(true)

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone,
        },
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Move to profile step (username / location)
    setStep('profile')
    setLoading(false)
  }

  // Step 2 — save profile row
  const handleFinish = async (e) => {
    e.preventDefault()
    setError('')

    if (!username.trim()) return setError('Please choose a username.')

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id:         user.id,
          full_name:  fullName,
          username:   username.toLowerCase().replace(/\s+/g, '_'),
          phone,
          location,
          avatar_url: null,
          verified:   false,
        })

      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }
    }

    router.push('/')
  }

  return (
    <>
      <Head>
        <title>Create Account — Swoop Uganda</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no" />
      </Head>

      <div style={styles.page}>
        {/* Logo */}
        <div style={styles.logoWrap}>
          <div style={styles.logoIcon}>∞</div>
          <div style={styles.logoName}>swoop</div>
          <div style={styles.logoTag}>SHOP. STREAM. CONNECT.</div>
        </div>

        {/* Step indicator */}
        <div style={styles.stepRow}>
          {STEPS.map((s, i) => (
            <div key={s} style={{display:'flex',alignItems:'center',gap:6}}>
              <div style={{
                ...styles.stepDot,
                background: step === s || (i === 0 && step === 'profile')
                  ? 'linear-gradient(135deg,#D946EF,#FF3366)'
                  : '#1e1e1e',
                border: step === s || (i === 0 && step === 'profile')
                  ? 'none'
                  : '1px solid rgba(255,255,255,0.1)',
              }}>
                {i === 0 && step === 'profile'
                  ? <i className="fas fa-check" style={{fontSize:10,color:'white'}} />
                  : <span style={{fontSize:11,fontWeight:700,color:'white'}}>{i+1}</span>
                }
              </div>
              {i < STEPS.length - 1 && (
                <div style={{width:40,height:1,background: step==='profile' ? '#FF3366' : 'rgba(255,255,255,0.1)'}} />
              )}
            </div>
          ))}
        </div>

        {/* Promo strip */}
        {step === 'account' && (
          <div style={styles.promoStrip}>
            <span style={styles.promoEmoji}>🚀</span>
            <span style={styles.promoText}>
              <strong>Buy. Sell. Discover.</strong> — Uganda&apos;s social commerce marketplace
            </span>
          </div>
        )}

        {/* Form card */}
        <div style={styles.card}>

          {step === 'account' ? (
            <>
              <div style={styles.cardTitle}>Create your account</div>
              <div style={styles.cardSub}>Join thousands of buyers and sellers</div>

              <form onSubmit={handleContinue} style={styles.form}>
                <div style={styles.inputWrap}>
                  <i className="fas fa-user" style={styles.inputIcon} />
                  <input
                    type="text"
                    placeholder="Full name"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.inputWrap}>
                  <i className="fas fa-phone" style={styles.inputIcon} />
                  <input
                    type="tel"
                    placeholder="Phone number (e.g. 0772 123456)"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.inputWrap}>
                  <i className="fas fa-envelope" style={styles.inputIcon} />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={styles.input}
                    autoComplete="email"
                    required
                  />
                </div>

                <div style={styles.inputWrap}>
                  <i className="fas fa-lock" style={styles.inputIcon} />
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="Password (min. 6 characters)"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{...styles.input, paddingRight: 44}}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(p => !p)}
                    style={styles.eyeBtn}
                  >
                    <i className={`fas ${showPw ? 'fa-eye-slash' : 'fa-eye'}`} style={{fontSize:15,color:'#71717A'}} />
                  </button>
                </div>

                {error && <div style={styles.errorMsg}>{error}</div>}

                <button
                  type="submit"
                  disabled={loading}
                  style={{...styles.btnPrimary, opacity: loading ? 0.7 : 1}}
                >
                  {loading
                    ? <><i className="fas fa-spinner fa-spin" style={{marginRight:8}} />Creating account...</>
                    : <>Continue <i className="fas fa-arrow-right" style={{marginLeft:8,fontSize:13}} /></>
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
                Already have an account?{' '}
                <Link href="/login" style={styles.switchLink}>Log in</Link>
              </div>

              <div style={styles.terms}>
                By signing up you agree to our{' '}
                <span style={{color:'#FF3366',cursor:'pointer'}}>Terms</span>
                {' '}and{' '}
                <span style={{color:'#FF3366',cursor:'pointer'}}>Privacy Policy</span>
              </div>
            </>
          ) : (
            <>
              <div style={styles.cardTitle}>Almost done! 🎉</div>
              <div style={styles.cardSub}>Set up your public profile</div>

              <form onSubmit={handleFinish} style={styles.form}>
                {/* Avatar placeholder */}
                <div style={{display:'flex',justifyContent:'center',marginBottom:8}}>
                  <div style={{
                    width: 80, height: 80, borderRadius: '50%',
                    background: 'linear-gradient(135deg,#D946EF,#FF3366)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 32, fontWeight: 900, color: 'white',
                    border: '3px solid rgba(255,51,102,0.3)',
                    cursor: 'pointer',
                    position: 'relative',
                  }}>
                    {fullName ? fullName[0].toUpperCase() : 'U'}
                    <div style={{
                      position: 'absolute', bottom: 0, right: 0,
                      width: 24, height: 24, borderRadius: '50%',
                      background: '#141414', border: '2px solid #000',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <i className="fas fa-camera" style={{fontSize:10, color:'#A1A1AA'}} />
                    </div>
                  </div>
                </div>

                <div style={styles.inputWrap}>
                  <span style={{...styles.inputIcon, fontSize:14, fontWeight:700, color:'#52525B'}}>@</span>
                  <input
                    type="text"
                    placeholder="Choose a username"
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g,''))}
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.inputWrap}>
                  <i className="fas fa-location-dot" style={styles.inputIcon} />
                  <input
                    type="text"
                    placeholder="Your location (e.g. Kampala, Uganda)"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    style={styles.input}
                  />
                </div>

                {error && <div style={styles.errorMsg}>{error}</div>}

                <button
                  type="submit"
                  disabled={loading}
                  style={{...styles.btnPrimary, opacity: loading ? 0.7 : 1}}
                >
                  {loading
                    ? <><i className="fas fa-spinner fa-spin" style={{marginRight:8}} />Setting up...</>
                    : <>Start Shopping 🛍️</>
                  }
                </button>
              </form>
            </>
          )}
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
    paddingTop: 36,
    paddingBottom: 4,
    gap: 2,
  },
  logoIcon: {
    fontSize: 44,
    lineHeight: 1,
    background: 'linear-gradient(135deg, #C026D3, #FF3366, #F97316)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  logoName: {
    fontSize: 30,
    fontWeight: 900,
    letterSpacing: '-1px',
    background: 'linear-gradient(135deg, #C026D3, #FF3366, #F97316)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  logoTag: {
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: 3,
    color: '#52525B',
    marginTop: 2,
  },
  stepRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 0,
    marginTop: 16,
    marginBottom: 8,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoStrip: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    margin: '12px 24px',
    padding: '12px 16px',
    background: 'rgba(255,51,102,0.08)',
    border: '1px solid rgba(255,51,102,0.2)',
    borderRadius: 12,
    maxWidth: 382,
    width: 'calc(100% - 48px)',
  },
  promoEmoji: { fontSize: 20, flexShrink: 0 },
  promoText: { fontSize: 13, color: '#A1A1AA', lineHeight: 1.4 },
  card: {
    width: '100%',
    maxWidth: 430,
    background: '#0d0d0d',
    borderTop: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '24px 24px 0 0',
    padding: '28px 24px 48px',
    flex: 1,
    marginTop: 12,
  },
  cardTitle: {
    fontSize: 22,
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
  terms: {
    textAlign: 'center',
    marginTop: 14,
    fontSize: 12,
    color: '#52525B',
    lineHeight: 1.5,
  },
}
