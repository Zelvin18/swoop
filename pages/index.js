import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import FeedPage from '../components/FeedPage'
import RequestsPage from '../components/RequestsPage'
import InboxPage from '../components/InboxPage'
import ProfilePage from '../components/ProfilePage'
import LivePage from '../components/LivePage'
import AddPostModal from '../components/AddPostModal'
import Toast from '../components/Toast'
import { supabase } from '../lib/supabase'

export default function Home() {
  const router = useRouter()
  const [activeTab, setActiveTab]     = useState('home')
  const [showAddPost, setShowAddPost] = useState(false)
  const [toast, setToast]             = useState({ show:false, msg:'' })
  const [user, setUser]               = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
      if (!session) { router.replace('/login'); return }
      // Check if user has completed profile setup (has username)
      const { data: profile } = await supabase.from('profiles').select('username').eq('id', session.user.id).single()
      if (!profile?.username) { router.replace('/setup-profile') }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session) router.replace('/login')
    })

    return () => subscription.unsubscribe()
  }, [router])

  // Global toast helper
  const showToast = (msg) => {
    setToast({ show:true, msg })
    setTimeout(() => setToast({ show:false, msg:'' }), 2200)
  }

  const handleNav = (tab) => {
    if (tab === 'add') { setShowAddPost(true); return }
    setActiveTab(tab)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  // Show blank screen while checking auth
  if (authLoading) {
    return (
      <div style={{
        position:'fixed', inset:0, background:'#000',
        display:'flex', alignItems:'center', justifyContent:'center',
        flexDirection:'column', gap:8,
      }}>
        <div style={{
          fontSize:52, lineHeight:1,
          background:'linear-gradient(135deg,#C026D3,#FF3366,#F97316)',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
        }}>∞</div>
        <div style={{
          fontSize:32, fontWeight:900, letterSpacing:'-1px',
          background:'linear-gradient(135deg,#C026D3,#FF3366,#F97316)',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
        }}>swoop</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <>
      <Head>
        <title>Swoop Uganda — Shop. Stream. Connect.</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no" />
        <meta name="description" content="Uganda's social commerce marketplace — buy, sell, stream live." />
      </Head>

      <div className="app-shell">

        {/* Splash */}
        <div id="splash" className="splash">
          <div className="splash-icon">∞</div>
          <div className="splash-name">swoop</div>
          <div className="splash-tag">SHOP. STREAM. CONNECT.</div>
        </div>

        {/* Screens */}
        <div className={`screen screen-feed ${activeTab==='home'?'active':''}`}>
          <FeedPage showToast={showToast} onTabChange={handleNav} currentUser={user} />
        </div>

        <div className={`screen ${activeTab==='live'?'active':''}`} style={{background:'#000'}}>
          <LivePage showToast={showToast} user={user} />
        </div>

        <div className={`screen ${activeTab==='requests'?'active':''}`} style={{background:'#000'}}>
          <RequestsPage showToast={showToast} currentUser={user} />
        </div>

        <div className={`screen ${activeTab==='inbox'?'active':''}`} style={{background:'#000'}}>
          <InboxPage showToast={showToast} currentUser={user} />
        </div>

        <div className={`screen ${activeTab==='profile'?'active':''}`} style={{background:'#000'}}>
          <ProfilePage showToast={showToast} onWallet={() => showToast('Opening wallet...')} user={user} onSignOut={handleSignOut} />
        </div>

        {/* Bottom Nav */}
        <nav className="bottom-nav">
          {[
            { id:'home',     icon:'fa-house',           label:'Home'      },
            { id:'requests', icon:'fa-magnifying-glass', label:'Requests'  },
            { id:'add',      icon:'fa-plus',             label:null        },
            { id:'inbox',    icon:'fa-comments',         label:'Inbox', badge:12 },
            { id:'profile',  icon:'fa-user',             label:'Profile'   },
          ].map(item => {
            if (item.id === 'add') return (
              <button key="add" className="nav-item nav-center" onClick={() => handleNav('add')}>
                <div className="nav-center-btn">
                  <i className="fas fa-plus" style={{color:'white',fontSize:22}} />
                </div>
              </button>
            )
            const active = activeTab === item.id
            return (
              <button
                key={item.id}
                className={`nav-item ${active ? 'active' : ''}`}
                onClick={() => handleNav(item.id)}
              >
                <div style={{position:'relative',display:'inline-flex'}}>
                  <i className={`fas ${item.icon}`} />
                  {item.badge && (
                    <span className="nav-badge">{item.badge}</span>
                  )}
                </div>
                {item.label && <span>{item.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* Add Post Modal */}
        {showAddPost && (
          <AddPostModal onClose={() => setShowAddPost(false)} showToast={showToast} currentUser={user} />
        )}

        {/* Toast */}
        <Toast msg={toast.msg} show={toast.show} />
      </div>
    </>
  )
}
