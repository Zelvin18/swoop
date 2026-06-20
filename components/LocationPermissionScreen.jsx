/**
 * LocationPermissionScreen
 * Shown when the user taps "Nearby" for the first time.
 * Designed to feel trustworthy, clear, and friendly —
 * explains exactly why we need location and what we do with it.
 */

export default function LocationPermissionScreen({ onAllow, onDeny, loading }) {
  return (
    <div style={S.page}>

      {/* Illustration */}
      <div style={S.illustrationWrap}>
        {/* Outer pulse rings */}
        <div style={{ ...S.ring, width: 280, height: 280, opacity: 0.06, animation: 'ringPulse 2.4s ease-out infinite' }} />
        <div style={{ ...S.ring, width: 210, height: 210, opacity: 0.10, animation: 'ringPulse 2.4s ease-out infinite 0.4s' }} />
        <div style={{ ...S.ring, width: 150, height: 150, opacity: 0.15, animation: 'ringPulse 2.4s ease-out infinite 0.8s' }} />

        {/* Center map pin icon */}
        <div style={S.pinCircle}>
          <i className="fas fa-location-dot" style={{ fontSize: 36, color: 'white' }} />
        </div>

        {/* Floating product badges around the pin */}
        <div style={{ ...S.floatBadge, top: '15%', left: '10%', animationDelay: '0s'   }}>📱 2.1 km</div>
        <div style={{ ...S.floatBadge, top: '12%', right: '8%', animationDelay: '0.5s' }}>👟 0.8 km</div>
        <div style={{ ...S.floatBadge, bottom: '18%', left: '6%', animationDelay: '1s'  }}>👗 1.4 km</div>
        <div style={{ ...S.floatBadge, bottom: '15%', right: '5%', animationDelay: '1.5s'}}>💻 3.2 km</div>
      </div>

      {/* Text content */}
      <div style={S.content}>
        <div style={S.title}>Discover what&apos;s near you</div>
        <div style={S.subtitle}>
          See amazing deals from sellers within walking distance. The closer they are, the faster your delivery.
        </div>

        {/* Trust points */}
        <div style={S.trustList}>
          <TrustItem
            icon="fa-shield-halved"
            color="#22C55E"
            title="Your privacy is protected"
            desc="We only use your location to find nearby posts. It's never shared with sellers."
          />
          <TrustItem
            icon="fa-location-dot"
            color="#3B82F6"
            title="Used only while browsing Nearby"
            desc="Location is not tracked in the background. Only active when you're on the Nearby tab."
          />
          <TrustItem
            icon="fa-ban"
            color="#F59E0B"
            title="Turn it off anytime"
            desc="You can disable location access in your phone's app settings whenever you want."
          />
        </div>

        {/* Buttons */}
        <button
          onClick={onAllow}
          disabled={loading}
          style={S.allowBtn}
        >
          {loading ? (
            <><i className="fas fa-spinner fa-spin" style={{ fontSize: 15 }} /> Getting location...</>
          ) : (
            <><i className="fas fa-location-dot" style={{ fontSize: 15 }} /> Allow Location Access</>
          )}
        </button>

        <button onClick={onDeny} style={S.denyBtn}>
          Not now
        </button>

        <div style={S.legalNote}>
          By allowing location access you agree to our{' '}
          <span style={{ color: '#FF3366' }}>Privacy Policy</span>.
          Location data is processed securely and never sold.
        </div>
      </div>

      <style>{`
        @keyframes ringPulse {
          0%   { transform: scale(0.8); opacity: 0.15; }
          50%  { opacity: 0.08; }
          100% { transform: scale(1.2); opacity: 0; }
        }
        @keyframes floatBadge {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}

function TrustItem({ icon, color, title, desc }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '12px 0',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: `${color}18`, border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className={`fas ${icon}`} style={{ fontSize: 16, color }} />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 12, color: '#71717A', lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  )
}

const S = {
  page: {
    position: 'absolute', inset: 0,
    background: '#000',
    display: 'flex', flexDirection: 'column',
    fontFamily: "'Inter',sans-serif", color: '#fff',
    overflow: 'hidden',
    zIndex: 50,
  },
  illustrationWrap: {
    position: 'relative',
    height: 260, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderRadius: '50%',
    border: '2px solid #FF3366',
  },
  pinCircle: {
    width: 80, height: 80, borderRadius: '50%',
    background: 'linear-gradient(135deg,#D946EF,#FF3366,#FB923C)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 0 0 12px rgba(255,51,102,0.12), 0 0 40px rgba(255,51,102,0.3)',
    zIndex: 2,
  },
  floatBadge: {
    position: 'absolute',
    background: 'rgba(20,20,20,0.95)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: '5px 11px',
    fontSize: 11, fontWeight: 700, color: 'white',
    backdropFilter: 'blur(10px)',
    animation: 'floatBadge 3s ease-in-out infinite',
    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    whiteSpace: 'nowrap',
  },
  content: {
    flex: 1, overflowY: 'auto',
    padding: '4px 24px 32px',
  },
  title: {
    fontSize: 24, fontWeight: 900, letterSpacing: '-0.5px',
    marginBottom: 10, lineHeight: 1.2,
    background: 'linear-gradient(135deg,#fff 60%,rgba(255,255,255,0.6))',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  subtitle: {
    fontSize: 14, color: '#A1A1AA', lineHeight: 1.6,
    marginBottom: 20,
  },
  trustList: { marginBottom: 28 },
  allowBtn: {
    width: '100%', padding: '15px',
    background: 'linear-gradient(135deg,#D946EF,#FF3366,#FB923C)',
    border: 'none', borderRadius: 14,
    color: 'white', fontSize: 16, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    boxShadow: '0 4px 24px rgba(255,51,102,0.4)',
    marginBottom: 12,
    transition: 'opacity 0.2s',
  },
  denyBtn: {
    width: '100%', padding: '13px',
    background: 'transparent',
    border: '1.5px solid rgba(255,255,255,0.1)',
    borderRadius: 14, color: '#A1A1AA',
    fontSize: 15, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
    marginBottom: 16,
  },
  legalNote: {
    fontSize: 11, color: '#52525B',
    textAlign: 'center', lineHeight: 1.6,
  },
}
