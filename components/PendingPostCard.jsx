import { subscribePendingUploads, dismissPending } from '../lib/pendingUploads'

const TYPE_LABEL = { social: 'Post', product: 'Product', service: 'Service' }

export default function PendingPostCard({ item }) {
  const pct = item.progress || 0
  const isError = item.status === 'error'
  const isDone = item.status === 'done'

  return (
    <div className="feed-card pending-post-card">
      <div className="pending-post-media">
        {item.previewUrl ? (
          item.previewUrl.startsWith('blob:') || item.previewUrl.startsWith('http')
            ? <img src={item.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : null
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(160deg,#1a0a2e,#0d0d0d)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, opacity: 0.15 }}>∞</div>
        )}
        <div className="pending-post-shade" />
        {!isDone && !isError && (
          <div className="pending-post-progress-wrap">
            <div className="pending-post-spinner" />
            <div className="pending-post-status">
              {item.status === 'uploading' ? 'Uploading…' : item.status === 'processing' ? 'Processing media…' : 'Posting…'}
            </div>
            <div className="pending-post-bar">
              <div className="pending-post-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="pending-post-pct">{pct}%</div>
          </div>
        )}
        {isDone && (
          <div className="pending-post-done">✓ Posted!</div>
        )}
        {isError && (
          <div className="pending-post-error">
            <div>Failed to post</div>
            <button type="button" onClick={() => dismissPending(item.id)}>Dismiss</button>
          </div>
        )}
      </div>
      <div className="pending-post-info">
        <span className="pending-post-badge">{TYPE_LABEL[item.postType] || 'Post'}</span>
        <span className="pending-post-title">{item.title}</span>
      </div>
    </div>
  )
}

export { subscribePendingUploads }
