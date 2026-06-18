import { useState, useEffect } from 'react'
import Head from 'next/head'
import FeedPage from '../components/FeedPage'
import RequestsPage from '../components/RequestsPage'
import InboxPage from '../components/InboxPage'
import ProfilePage from '../components/ProfilePage'
import LivePage from '../components/LivePage'
import AddPostModal from '../components/AddPostModal'
import Toast from '../components/Toast'

export default function Home() {
  const [activeTab, setActiveTab]   = useState('home')
  const [showAddPost, setShowAddPost] = useState(false)
  const [toast, setToast]           = useState({ show:false, msg:'' })

  // Global toast helper
  const showToast = (msg) => {
    setToast({ show:true, msg })
    setTimeout(() => setToast({ show:false, msg:'' }), 2200)
  }

  const handleNav = (tab) => {
    if (tab === 'add') { setShowAddPost(true); return }
    setActiveTab(tab)
  }

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
          <FeedPage showToast={showToast} onTabChange={handleNav} />
        </div>

        <div className={`screen ${activeTab==='live'?'active':''}`} style={{background:'#000'}}>
          <LivePage showToast={showToast} />
        </div>

        <div className={`screen ${activeTab==='requests'?'active':''}`} style={{background:'#000'}}>
          <RequestsPage showToast={showToast} />
        </div>

        <div className={`screen ${activeTab==='inbox'?'active':''}`} style={{background:'#000'}}>
          <InboxPage showToast={showToast} />
        </div>

        <div className={`screen ${activeTab==='profile'?'active':''}`} style={{background:'#000'}}>
          <ProfilePage showToast={showToast} onWallet={() => showToast('Opening wallet...')} />
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
          <AddPostModal onClose={() => setShowAddPost(false)} showToast={showToast} />
        )}

        {/* Toast */}
        <Toast msg={toast.msg} show={toast.show} />
      </div>
    </>
  )
}
