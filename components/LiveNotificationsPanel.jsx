import { useState, useEffect } from 'react'
import { fetchNotifications, markNotificationsRead, avatarColor, initials } from '../lib/live'

const TYPE_META = {
  stream_started:        { icon: 'fa-circle-dot',    color: '#EF4444', label: 'went live'           },
  stream_scheduled:      { icon: 'fa-calendar',      color: '#3B82F6', label: 'scheduled a live'    },
  reservation_made:      { icon: 'fa-shield-halved', color: '#22C55E', label: 'made a reservation'  },
  reservation_confirmed: { icon: 'fa-circle-check',  color: '#22C55E', label: 'confirmed your order'},
  stream_notify_request: { icon: 'fa-bell',          color: '#F59E0B', label: 'reminder set'        },
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function LiveNotificationsPanel({ userId, onClose, onOpenStream }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading]             = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    fetchNotifications(userId).then(data => {
      setNotifications(data)
      setLoading(false)
      markNotificationsRead(userId)
    })
  }, [userId])

  return (
    <div style={S.overlay}>
      {/* Header */}
      <div style={S.header}>
        <button onClick={onClose} style={S.backBtn}>
          <i className="fas fa-arrow-left" style={{ fontSize: 17 }} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Notifications</div>
          <div style={{ fontSize: 12, color: '#71717A' }}>Live activity and updates</div>
        </div>
      </div>

      <div style={S.body}>
        {loading && (
          <div style={S.center}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: 24, color: '#FF3366' }} />
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div style={S.emptyState}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🔔</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#A1A1AA', marginBottom: 6 }}>
              No notifications yet
            </div>
            <div style={{ fontSize: 13, color: '#52525B', textAlign: 'center', lineHeight: 1.5 }}>
              Follow sellers and streamers to get notified when they go live
            </div>
          </div>
        )}

        {!loading && notifications.map(n => (
          <NotifItem
            key={n.id}
            n={n}
            onPress={() => n.stream && onOpenStream(n.stream)}
          />
        ))}
      </div>
    </div>
  )
}

function NotifItem({ n, onPress }) {
  const actor = n.actor || {}
  const meta  = TYPE_META[n.type] || { icon: 'fa-bell', color: '#FF3366', label: '' }
  const color = avatarColor(actor.id || '')
  const init  = initials(actor.full_name || actor.username || 'U')

  return (
    <div
      onClick={onPress}
      style={{
        ...S.row,
        background: n.read ? 'transparent' : 'rgba(255,51,102,0.04)',
        borderLeft: n.read ? 'none' : '3px solid #FF3366',
      }}
    >
      {/* Actor avatar */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{ width: 46, height: 46, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: 'white' }}>
          {init}
        </div>
        <div style={{ position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: '50%', background: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #000' }}>
          <i className={`fas ${meta.icon}`} style={{ fontSize: 8, color: 'white' }} />
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: '#fff', lineHeight: 1.4 }}>
          <span style={{ fontWeight: 700 }}>
            {actor.full_name || actor.username || 'Someone'}
          </span>
          {' '}{meta.label}
          {n.stream && (
            <span style={{ color: '#FF3366', fontWeight: 600 }}> · {n.stream.title}</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: '#52525B', marginTop: 2 }}>
          {timeAgo(n.created_at)}
        </div>
      </div>

      {n.stream && (
        <i className="fas fa-chevron-right" style={{ fontSize: 12, color: '#52525B', flexShrink: 0 }} />
      )}
    </div>
  )
}

const S = {
  overlay: {
    position: 'fixed', inset: 0, background: '#000',
    zIndex: 250, display: 'flex', flexDirection: 'column',
    fontFamily: "'Inter',sans-serif", color: '#fff',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '14px 16px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    flexShrink: 0,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: '50%',
    background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.08)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: '#fff', flexShrink: 0,
  },
  body: { flex: 1, overflowY: 'auto' },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 },
  emptyState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '60px 24px',
  },
  row: {
    display: 'flex', alignItems: 'flex-start', gap: 12,
    padding: '14px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    cursor: 'pointer',
  },
}
