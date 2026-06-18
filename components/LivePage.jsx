import { useState } from 'react'
import { MOCK_SELLERS } from '../lib/mockData'

const STREAMS = [
  { id:1,sellerId:1,title:'iPhone Deals LIVE 🔥',sub:'Best prices today!',     viewers:1200,bg:'linear-gradient(135deg,#1a003a,#2d0050)',emoji:'📱' },
  { id:2,sellerId:4,title:'Sneaker Drop 🔥',     sub:'Limited pairs available',viewers:845, bg:'linear-gradient(135deg,#0a1a00,#1a3000)',emoji:'👟' },
  { id:3,sellerId:3,title:"Bags Collection ❤️",  sub:'Trendy & Affordable',    viewers:623, bg:'linear-gradient(135deg,#1a0020,#2d003a)',emoji:'👜' },
  { id:4,sellerId:5,title:'Modern Living 🏠',    sub:'New arrivals ✨',          viewers:412, bg:'linear-gradient(135deg,#001a1a,#002d2d)',emoji:'🛋️' },
]
const UPCOMING = [
  { id:1,sellerId:6,title:'Tech Talk & Gadgets',       sub:'New gadgets, reviews & amazing offers',time:'Today, 2:00 PM',   emoji:'💻' },
  { id:2,sellerId:3,title:'Affordable Fashion Friday', sub:'Outfits, bags, shoes & more',         time:'Today, 5:00 PM',   emoji:'👗' },
  { id:3,sellerId:1,title:'Car Deals Live 🚗',          sub:'Clean cars, best prices',              time:'Tomorrow, 11:00 AM',emoji:'🚗' },
]
const CATS = [
  {label:'Electronics',emoji:'💻'},{label:'Fashion',emoji:'👗'},{label:'Home',emoji:'🏠'},
  {label:'Phones',emoji:'📱'},{label:'Beauty',emoji:'💄'},{label:'Sneakers',emoji:'👟'},
]

function fmt(n) { return n>=1000?(n/1000).toFixed(1).replace('.0','')+'K':String(n) }

export default function LivePage({ showToast }) {
  const [activeFilter, setActiveFilter] = useState('All')
  const [notified, setNotified] = useState({})
  const filters = ['All','Following','Electronics','Fashion','Home','Beauty']

  return (
    <div style={{paddingBottom:20}}>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Live</div>
          <div className="page-subtitle">Shop live deals and interact with sellers</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="header-btn"><i className="fas fa-search" /></button>
          <button className="header-btn" style={{position:'relative'}}>
            <i className="fas fa-bell" />
            <span style={{position:'absolute',top:-3,right:-3,minWidth:16,height:16,padding:'0 4px',background:'#FF3366',borderRadius:20,fontSize:9,fontWeight:800,color:'white',display:'flex',alignItems:'center',justifyContent:'center',border:'1.5px solid #000'}}>3</span>
          </button>
        </div>
      </div>

      {/* Go Live banner */}
      <div style={{
        margin:'0 16px 20px',padding:16,
        background:'linear-gradient(135deg,#1a0a2e,#2d0a1a)',
        border:'1px solid rgba(168,85,247,0.3)',borderRadius:16,
        display:'flex',alignItems:'center',gap:12
      }}>
        <div style={{
          width:44,height:44,borderRadius:'50%',
          background:'rgba(239,68,68,0.15)',
          display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
          boxShadow:'0 0 0 4px rgba(239,68,68,0.15)',
          animation:'pulse 1.5s infinite'
        }}>
          <i className="fas fa-circle-dot" style={{color:'#EF4444',fontSize:20}} />
        </div>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:15,marginBottom:2}}>Go Live &amp; Sell</div>
          <div style={{fontSize:12,color:'#A1A1AA'}}>Show your products, engage buyers and grow your sales</div>
        </div>
        <button
          onClick={() => showToast('🎥 Starting live stream...')}
          style={{
            padding:'9px 16px',background:'#EF4444',border:'none',borderRadius:20,
            color:'white',fontSize:13,fontWeight:700,cursor:'pointer',
            display:'flex',alignItems:'center',gap:6,whiteSpace:'nowrap'
          }}
        >
          <i className="fas fa-video" style={{fontSize:13}} /> Start Live
        </button>
      </div>

      {/* Category filter */}
      <div className="pill-row">
        {filters.map(f => (
          <button key={f} className={`pill ${activeFilter===f?'active':''}`} onClick={() => setActiveFilter(f)}>{f}</button>
        ))}
      </div>

      {/* Live Now */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 16px 12px'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,fontSize:16,fontWeight:800}}>
          Live Now
          <span style={{width:8,height:8,borderRadius:'50%',background:'#EF4444',display:'inline-block',animation:'blink 1s infinite'}} />
          <span style={{fontSize:12,color:'#EF4444',fontWeight:700,background:'rgba(239,68,68,0.1)',padding:'2px 8px',borderRadius:20}}>12 Live</span>
        </div>
        <span style={{fontSize:13,fontWeight:600,color:'#FF3366',cursor:'pointer'}}>See All</span>
      </div>

      {/* Horizontal scroll grid — 2 visible */}
      <div style={{display:'flex',gap:10,padding:'0 16px 20px',overflowX:'auto',scrollbarWidth:'none'}}>
        {STREAMS.map(s => {
          const seller = MOCK_SELLERS.find(x=>x.id===s.sellerId)||MOCK_SELLERS[0]
          return (
            <div key={s.id} onClick={() => showToast('📺 Joining live stream...')} style={{
              flexShrink:0, width:'calc(50vw - 21px)', maxWidth:190,
              borderRadius:12, overflow:'hidden', aspectRatio:'9/13',
              position:'relative', background:s.bg, cursor:'pointer'
            }}>
              <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:60}}>{s.emoji}</div>
              <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,transparent 40%,rgba(0,0,0,0.85))'}}>
              </div>
              <div style={{position:'absolute',top:8,left:8,right:8,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <span style={{background:'#EF4444',color:'white',fontSize:10,fontWeight:800,padding:'2px 6px',borderRadius:4}}>LIVE</span>
                <span style={{background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',color:'white',fontSize:11,fontWeight:600,padding:'3px 7px',borderRadius:20,display:'flex',alignItems:'center',gap:4}}>
                  <i className="fas fa-eye" style={{fontSize:10}} />{fmt(s.viewers)}
                </span>
              </div>
              <div style={{position:'absolute',bottom:10,left:10,right:10}}>
                <div style={{fontSize:13,fontWeight:700,color:'white',marginBottom:4}}>{s.title}</div>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.7)',marginBottom:6}}>{s.sub}</div>
                <div style={{display:'flex',alignItems:'center',gap:5}}>
                  <div style={{width:20,height:20,borderRadius:'50%',background:seller.color,border:'1.5px solid #FF3366',display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:900,color:'white'}}>{seller.initials}</div>
                  <span style={{fontSize:11,color:'rgba(255,255,255,0.8)',fontWeight:600}}>{seller.name}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Upcoming */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 16px 12px'}}>
        <div style={{fontSize:16,fontWeight:800}}>Upcoming Live</div>
        <span style={{fontSize:13,fontWeight:600,color:'#FF3366',cursor:'pointer'}}>See All</span>
      </div>
      <div style={{padding:'0 16px'}}>
        {UPCOMING.map(u => {
          const seller = MOCK_SELLERS.find(x=>x.id===u.sellerId)||MOCK_SELLERS[0]
          const isOn = notified[u.id]
          return (
            <div key={u.id} style={{
              display:'flex',alignItems:'center',gap:12,padding:14,
              background:'#141414',border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:12,marginBottom:10
            }}>
              <div style={{
                width:46,height:46,borderRadius:'50%',background:seller.color,
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:20,flexShrink:0,
                boxShadow:`0 0 0 2px ${seller.color}44, 0 0 0 4px #1a1a1a`
              }}>{u.emoji}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:700,marginBottom:2}}>{u.title}</div>
                <div style={{fontSize:12,color:'#A1A1AA',marginBottom:4}}>{u.sub}</div>
                <div style={{fontSize:11,color:'#71717A',display:'flex',alignItems:'center',gap:4}}>
                  <i className="fas fa-calendar" style={{fontSize:11}} />{u.time}
                </div>
              </div>
              <button
                onClick={() => {
                  setNotified(n=>({...n,[u.id]:!n[u.id]}))
                  showToast(isOn ? '🔕 Notification removed' : "🔔 You'll be notified!")
                }}
                style={{
                  padding:'7px 12px',borderRadius:20,
                  border:`1.5px solid ${isOn?'#7C3AED':'rgba(255,255,255,0.15)'}`,
                  background:isOn?'rgba(124,58,237,0.15)':'#1e1e1e',
                  color:isOn?'#A855F7':'#A1A1AA',
                  fontSize:12,fontWeight:600,cursor:'pointer',
                  display:'flex',alignItems:'center',gap:5,whiteSpace:'nowrap'
                }}
              >
                <i className="fas fa-bell" style={{fontSize:12}} />
                {isOn?'Notifying':'Notify Me'}
              </button>
            </div>
          )
        })}
      </div>

      {/* Top Categories */}
      <div style={{padding:'8px 16px 12px',fontSize:16,fontWeight:800}}>Top Categories Live</div>
      <div style={{display:'flex',gap:14,padding:'0 16px 20px',overflowX:'auto',scrollbarWidth:'none'}}>
        {CATS.map(c => (
          <div key={c.label} onClick={() => showToast(`📺 ${c.label} live...`)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,flexShrink:0,cursor:'pointer'}}>
            <div style={{
              width:64,height:64,borderRadius:'50%',background:'#1e1e1e',
              border:'2.5px solid #EF4444',
              display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,
              position:'relative'
            }}>
              {c.emoji}
              <span style={{
                position:'absolute',bottom:-4,left:'50%',transform:'translateX(-50%)',
                background:'#EF4444',color:'white',fontSize:8,fontWeight:800,
                padding:'1px 5px',borderRadius:3,whiteSpace:'nowrap',border:'1.5px solid #000'
              }}>LIVE</span>
            </div>
            <span style={{fontSize:11,color:'#A1A1AA'}}>{c.label}</span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.4)} 50%{box-shadow:0 0 0 8px rgba(239,68,68,0)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  )
}
