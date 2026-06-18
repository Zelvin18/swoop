import { useState } from 'react'

const STORIES = [
  { name:'Your story', own:true },
  { name:'StyleHub UG',   live:true,  color:'#F97316', initials:'SH' },
  { name:'TechPlug UG',   live:true,  color:'#7C3AED', initials:'TP' },
  { name:'Sneaker Vault', live:true,  color:'#06B6D4', initials:'SV' },
  { name:'Trendy Finds',  live:true,  color:'#EC4899', initials:'TF' },
  { name:'FurnishUG',     live:false, color:'#22C55E', initials:'FK' },
]

const CONVOS = [
  { id:1, name:'TechPlug UG',    verified:true,  color:'#7C3AED', initials:'TP', tag:'iPhone 14 Pro Max', tagColor:'rgba(168,85,247,0.2)', tagTextColor:'#A855F7', preview:"Yes, it's still available. What's your best offer?", time:'9:41 AM', unread:2, online:true,  pinned:true },
  { id:2, name:'StyleHub UG',    verified:true,  color:'#F97316', initials:'SH', tag:'Black Dress',       tagColor:'rgba(168,85,247,0.2)', tagTextColor:'#A855F7', preview:'Great! I can deliver it to you today.',            time:'9:20 AM', unread:1, online:false },
  { id:3, name:'Boda Delivery',  verified:true,  color:'#22C55E', initials:'BD', tag:'Delivery in progress', tagColor:'rgba(249,115,22,0.2)', tagTextColor:'#F97316', preview:'Rider is on the way to pick up your item.',       time:'9:15 AM', unread:1, online:true  },
  { id:4, name:'App Notifications', verified:true, color:'#E11D48', initials:'🔔', tag:null, preview:'Your item has been reserved! Check details.',         time:'Yesterday', unread:5, online:false },
  { id:5, name:'Sneaker Vault',  verified:true,  color:'#06B6D4', initials:'SV', tag:'Air Jordan 1',     tagColor:'rgba(168,85,247,0.2)', tagTextColor:'#A855F7', preview:'Price is final. Ready to reserve?',                  time:'Yesterday', unread:0, online:false, muted:true },
  { id:6, name:'FurnishUG',      verified:false, color:'#F59E0B', initials:'FK', tag:'Sofa Set',         tagColor:'rgba(168,85,247,0.2)', tagTextColor:'#A855F7', preview:"Thanks! We'll confirm once we receive payment.",      time:'Mon',       unread:1, online:false },
]

const FILTERS = [
  { label:'All',      count:null },
  { label:'Unread',   count:null },
  { label:'Messages', count:12   },
  { label:'Orders',   count:4    },
  { label:'Alerts',   count:8    },
  { label:'Mentions', count:2    },
  { label:'Likes',    count:'20+'},
]

export default function InboxPage({ showToast }) {
  const [activeFilter, setActiveFilter] = useState('All')

  return (
    <div style={{paddingBottom:20}}>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Inbox</div>
          <div className="page-subtitle">Messages, updates and important alerts</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="header-btn"><i className="fas fa-search" /></button>
          <button className="header-btn"><i className="fas fa-pen-to-square" /></button>
        </div>
      </div>

      {/* Stories */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 16px 8px'}}>
        <span style={{fontSize:15,fontWeight:700}}>Stories</span>
        <span style={{fontSize:13,fontWeight:600,color:'#7C3AED',cursor:'pointer'}}>View all ›</span>
      </div>
      <div style={{display:'flex',gap:12,padding:'4px 16px 16px',overflowX:'auto',scrollbarWidth:'none'}}>
        {STORIES.map((s,i) => (
          <div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:5,flexShrink:0,cursor:'pointer'}}>
            {s.own ? (
              <div style={{position:'relative',width:64,height:64,borderRadius:'50%',background:'#1e1e1e',border:'2px dashed rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <i className="fas fa-user" style={{fontSize:24,color:'#52525B'}} />
                <div style={{position:'absolute',bottom:-2,right:-2,width:20,height:20,borderRadius:'50%',background:'linear-gradient(135deg,#D946EF,#F43F5E)',border:'2px solid #000',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <i className="fas fa-plus" style={{color:'white',fontSize:9}} />
                </div>
              </div>
            ) : (
              <div style={{position:'relative',width:64,height:64}}>
                <div style={{
                  width:64,height:64,borderRadius:'50%',
                  background:s.color,
                  border:`2.5px solid ${s.live?'#EF4444':'transparent'}`,
                  outline:s.live?'none':`2.5px solid linear-gradient(135deg,#D946EF,#F43F5E)`,
                  boxShadow:s.live?'none':`0 0 0 2.5px #D946EF`,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:15,fontWeight:900,color:'white'
                }}>{s.initials}</div>
                {s.live && (
                  <span style={{
                    position:'absolute',bottom:-4,left:'50%',transform:'translateX(-50%)',
                    background:'#EF4444',color:'white',fontSize:8,fontWeight:800,
                    padding:'1px 5px',borderRadius:3,whiteSpace:'nowrap',border:'1.5px solid #000'
                  }}>LIVE</span>
                )}
              </div>
            )}
            <span style={{fontSize:11,color:'#A1A1AA',maxWidth:64,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',textAlign:'center'}}>{s.name}</span>
          </div>
        ))}
      </div>

      {/* Filter pills with counts */}
      <div style={{display:'flex',gap:6,padding:'0 16px 12px',overflowX:'auto',scrollbarWidth:'none',alignItems:'center'}}>
        {FILTERS.map(f => (
          <button
            key={f.label}
            onClick={() => setActiveFilter(f.label)}
            style={{
              flexShrink:0,
              display:'flex',alignItems:'center',gap:6,
              padding:'7px 14px',borderRadius:20,
              background:activeFilter===f.label?'#FF3366':'#1e1e1e',
              border:`1px solid ${activeFilter===f.label?'transparent':'rgba(255,255,255,0.08)'}`,
              color:activeFilter===f.label?'white':'#A1A1AA',
              fontSize:13,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap',
              fontFamily:'inherit',
              boxShadow:activeFilter===f.label?'0 2px 12px rgba(255,51,102,0.35)':'none'
            }}
          >
            {f.label}
            {f.count && (
              <span style={{
                background:activeFilter===f.label?'rgba(255,255,255,0.2)':'#FF3366',
                color:'white',fontSize:10,fontWeight:800,
                borderRadius:20,minWidth:18,height:18,
                display:'flex',alignItems:'center',justifyContent:'center',padding:'0 4px'
              }}>{f.count}</span>
            )}
          </button>
        ))}
        <div style={{width:34,height:34,borderRadius:'50%',background:'#1e1e1e',border:'1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,cursor:'pointer'}}>
          <i className="fas fa-sliders" style={{fontSize:14,color:'#A1A1AA'}} />
        </div>
      </div>

      {/* Conversation list */}
      <div style={{padding:'0 16px'}}>
        {CONVOS.map(c => (
          <ConvoItem key={c.id} c={c} onClick={() => showToast(`Opening chat with ${c.name}...`)} />
        ))}
      </div>
    </div>
  )
}

function ConvoItem({ c, onClick }) {
  const isEmoji = c.initials && c.initials.length > 2
  return (
    <div onClick={onClick} style={{
      display:'flex',alignItems:'flex-start',gap:10,
      padding:'14px 0',
      borderBottom:'1px solid rgba(255,255,255,0.06)',
      cursor:'pointer'
    }}>
      <div style={{position:'relative',flexShrink:0}}>
        <div style={{
          width:52,height:52,borderRadius:'50%',
          background:isEmoji?'#1e1e1e':c.color,
          display:'flex',alignItems:'center',justifyContent:'center',
          fontSize:isEmoji?22:17,fontWeight:900,color:'white'
        }}>{c.initials}</div>
        {c.online && (
          <div style={{position:'absolute',bottom:1,right:1,width:11,height:11,borderRadius:'50%',background:'#22C55E',border:'2px solid #000'}} />
        )}
      </div>

      <div style={{flex:1,minWidth:0}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:3}}>
          <div style={{display:'flex',alignItems:'center',gap:5,fontSize:15,fontWeight:700}}>
            {c.name}
            {c.verified && <span style={{width:14,height:14,borderRadius:'50%',background:'#3B82F6',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:8,color:'white',fontWeight:900}}>✓</span>}
            {c.pinned && <i className="fas fa-thumbtack" style={{fontSize:11,color:'#7C3AED'}} />}
          </div>
          <span style={{fontSize:11,color:'#52525B'}}>{c.time}</span>
        </div>
        {c.tag && (
          <span style={{display:'inline-block',padding:'2px 7px',borderRadius:20,fontSize:11,fontWeight:600,background:c.tagColor||'rgba(168,85,247,0.2)',color:c.tagTextColor||'#A855F7',marginBottom:3}}>
            {c.tag}
          </span>
        )}
        <div style={{fontSize:13,color:'#A1A1AA',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.preview}</div>
      </div>

      <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6,flexShrink:0}}>
        {c.unread > 0 ? (
          <span style={{minWidth:20,height:20,borderRadius:20,background:'#FF3366',color:'white',fontSize:10,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 5px'}}>{c.unread}</span>
        ) : c.muted ? (
          <i className="fas fa-bell-slash" style={{fontSize:14,color:'#52525B'}} />
        ) : null}
      </div>
    </div>
  )
}
