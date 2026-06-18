import { useState } from 'react';

const NAV_ITEMS = [
  { id:'home',     icon:'fa-house',            label:'Home'     },
  { id:'requests', icon:'fa-magnifying-glass',  label:'Requests' },
  { id:'add',      icon:'fa-plus',              label:null       }, // center +
  { id:'inbox',    icon:'fa-comments',           label:'Inbox', badge:12 },
  { id:'profile',  icon:'fa-user',              label:'Profile'  },
];

export default function BottomNav({ activeTab = 'home', onChange }) {
  return (
    <nav style={{
      position:'fixed', bottom:0, left:0, right:0,
      height:78,
      background:'rgba(0,0,0,0.9)',
      backdropFilter:'blur(15px)',
      borderTop:'1px solid rgba(255,255,255,0.08)',
      display:'flex', justifyContent:'space-around', alignItems:'center',
      zIndex:100,
      paddingBottom:'env(safe-area-inset-bottom,0px)',
    }}>
      {NAV_ITEMS.map(item => {
        if (item.id === 'add') return (
          <div
            key="add"
            onClick={() => onChange?.('add')}
            style={{
              width:58, height:58, borderRadius:18,
              background:'#FF3366',
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer',
              boxShadow:'0 4px 16px rgba(255,51,102,0.5)',
            }}
          >
            <i className="fas fa-plus" style={{color:'white',fontSize:22}} />
          </div>
        );

        const isActive = activeTab === item.id;
        return (
          <div
            key={item.id}
            onClick={() => onChange?.(item.id)}
            style={{
              flex:1, display:'flex', flexDirection:'column',
              alignItems:'center', gap:5, cursor:'pointer',
              color: isActive ? '#FF3366' : 'rgba(255,255,255,0.7)',
              fontSize:12, fontWeight:500,
            }}
          >
            <div style={{position:'relative',display:'inline-flex'}}>
              <i className={`fas ${item.icon}`} style={{fontSize:22}} />
              {item.badge && (
                <span style={{
                  position:'absolute', top:-6, right:-8,
                  background:'#FF3366', color:'white',
                  fontSize:9, fontWeight:800,
                  borderRadius:9999, minWidth:16, height:16,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  padding:'0 4px', border:'1.5px solid #000',
                }}>
                  {item.badge}
                </span>
              )}
            </div>
            {item.label && <span>{item.label}</span>}
          </div>
        );
      })}
    </nav>
  );
}
