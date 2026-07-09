/**
 * Background post upload queue — TikTok-style instant return to feed.
 */
import { createPost } from './feed'
import { prepareMediaForUpload } from './mediaExport'
import { editorMeta } from './postEditorMeta'

const listeners = new Set()
let queue = []

function notify() {
  const snap = queue.map(q => ({ ...q }))
  listeners.forEach(fn => fn(snap))
}

export function subscribePendingUploads(fn) {
  listeners.add(fn)
  fn(queue.map(q => ({ ...q })))
  return () => listeners.delete(fn)
}

export function getPendingUploads() {
  return queue.map(q => ({ ...q }))
}

/**
 * @param {object} payload — post fields + mediaFiles (clips) + editorResult + previewUrl
 */
export function enqueuePost(payload) {
  const id = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const item = {
    id,
    status: 'queued',
    progress: 0,
    error: null,
    post: null,
    previewUrl: payload.previewUrl || null,
    postType: payload.postType,
    title: payload.title || payload.caption || 'New post',
    createdAt: Date.now(),
  }
  queue = [item, ...queue]
  notify()
  processItem(item, payload)
  return id
}

async function processItem(item, payload) {
  const update = (patch) => {
    Object.assign(item, patch)
    notify()
  }

  try {
    update({ status: 'processing', progress: 5 })

    const clips = payload.mediaFiles || []
    const prepared = await prepareMediaForUpload(clips, p => update({ progress: p }))

    const meta = editorMeta(payload.editorResult)
    const mediaFiles = [
      ...prepared.photos.map(f => ({ file: f.file, type: 'photo' })),
      ...prepared.videos.map(f => ({ file: f.file, type: 'video' })),
    ]

    update({ status: 'uploading', progress: 65 })

    const post = await createPost({
      ...payload.postFields,
      sellerId: payload.sellerId,
      postType: payload.postType,
      mediaFiles,
      filterName: prepared.filterName || meta.filterName,
      textOverlays: prepared.textOverlays,
      ...meta,
      onUploadProgress: pct => update({ progress: 65 + Math.round(pct * 0.35) }),
    })

    if (!post) throw new Error('Post creation failed')

    update({ status: 'done', progress: 100, post, seller: post.seller })
    setTimeout(() => {
      queue = queue.filter(q => q.id !== item.id)
      notify()
    }, 1200)
  } catch (err) {
    console.error('enqueuePost failed', err)
    update({ status: 'error', error: err.message || 'Upload failed', progress: 0 })
  }
}

export function dismissPending(id) {
  queue = queue.filter(q => q.id !== id)
  notify()
}
