/** Render text overlays on feed media (videos + fallback) */

const SIZE_PX = { small: '4.5vw', medium: '6.5vw', large: '9vw' }

function overlayStyle(o) {
  const base = {
    position: 'absolute',
    left: `${(o.x ?? 0.5) * 100}%`,
    top: `${(o.y ?? 0.5) * 100}%`,
    transform: 'translate(-50%, -50%)',
    fontSize: SIZE_PX[o.size] || SIZE_PX.medium,
    fontWeight: 900,
    color: o.color || '#fff',
    textAlign: 'center',
    maxWidth: '85%',
    lineHeight: 1.2,
    wordBreak: 'break-word',
    pointerEvents: 'none',
    zIndex: 12,
    fontFamily: 'Inter, Arial, sans-serif',
    textShadow: o.style === 'shadow' ? '0 2px 12px rgba(0,0,0,0.9)' : '0 1px 6px rgba(0,0,0,0.8)',
  }
  if (o.style === 'outline') {
    return {
      ...base,
      WebkitTextStroke: `1.5px ${o.color === '#FFFFFF' ? '#000' : '#fff'}`,
      color: 'transparent',
    }
  }
  return base
}

export default function TextOverlayLayer({ overlays = [] }) {
  if (!overlays?.length) return null
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 12 }}>
      {overlays.map((o, i) => (
        <div key={i} style={overlayStyle(o)}>{o.text}</div>
      ))}
    </div>
  )
}
