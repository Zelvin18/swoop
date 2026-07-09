/**
 * Swoop Feed — Supabase data helpers
 */
import { supabase } from './supabase'

export const CATEGORIES = ['All', 'Phones', 'Fashion', 'Electronics', 'Sneakers', 'Home', 'Beauty', 'Cars']
export const CATEGORY_EMOJI = {
  All: '✨', Phones: '📱', Fashion: '👗', Electronics: '💻',
  Sneakers: '👟', Home: '🏠', Beauty: '💄', Cars: '🚗',
}

export function formatUGX(n) {
  if (!n) return ''
  return `UGX ${Number(n).toLocaleString('en-UG')}`
}
export function discountPct(price, orig) {
  if (!price || !orig || orig <= price) return null
  return `-${Math.round((1 - price / orig) * 100)}%`
}
export function fmtCount(n) {
  n = Math.round(n || 0)
  return n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'K' : String(n)
}

// ── Haversine distance (km) ───────────────────────────────────────────────────
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function fmtDistance(km) {
  if (km < 1)   return `${Math.round(km * 1000)} m away`
  if (km < 10)  return `${km.toFixed(1)} km away`
  return `${Math.round(km)} km away`
}

// ── Geolocation ───────────────────────────────────────────────────────────────
export function requestLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Geolocation not supported')); return }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  })
}

export async function saveUserLocation(userId, lat, lng) {
  await supabase.from('profiles').update({ lat, lng }).eq('id', userId)
}

// ── Fetch feed posts ──────────────────────────────────────────────────────────
export async function fetchFeedPosts({
  category = 'All', tab = 'For You', currentUserId = null,
  userLat = null, userLng = null, page = 0, limit = 10,
} = {}) {
  let query = supabase
    .from('posts')
    .select(`*, seller:profiles!seller_id (id, full_name, username, avatar_url, verified, location, lat, lng)`)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .range(page * limit, page * limit + limit - 1)

  if (category !== 'All') query = query.ilike('category', category)

  const { data, error } = await query
  if (error) { console.error('fetchFeedPosts', error); return [] }
  let posts = data || []

  if (tab === 'Nearby' && userLat !== null && userLng !== null) {
    posts = posts
      .map(p => {
        const sLat = p.seller?.lat, sLng = p.seller?.lng
        const km = (sLat && sLng) ? haversineKm(userLat, userLng, sLat, sLng) : null
        return { ...p, _distanceKm: km }
      })
      .filter(p => p._distanceKm !== null && p._distanceKm <= 50)
      .sort((a, b) => a._distanceKm - b._distanceKm)
  }

  return posts
}

// ── Global search ─────────────────────────────────────────────────────────────
export async function globalSearch(query) {
  if (!query.trim()) return { posts: [], sellers: [] }
  const q = query.trim()
  const [{ data: posts }, { data: sellers }] = await Promise.all([
    supabase
      .from('posts')
      .select(`*, seller:profiles!seller_id (id, full_name, username, avatar_url, verified)`)
      .eq('status', 'active')
      .or(`title.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%,brand.ilike.%${q}%`)
      .order('likes_count', { ascending: false })
      .limit(15),
    supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, verified, location')
      .or(`full_name.ilike.%${q}%,username.ilike.%${q}%`)
      .limit(8),
  ])
  return { posts: posts || [], sellers: sellers || [] }
}

// ── Like / save state ─────────────────────────────────────────────────────────
export async function getUserPostState(postId, userId) {
  if (!userId) return { liked: false, saved: false }
  const [{ data: like }, { data: save }] = await Promise.all([
    supabase.from('likes').select('id').eq('post_id', postId).eq('user_id', userId).maybeSingle(),
    supabase.from('saves').select('id').eq('post_id', postId).eq('user_id', userId).maybeSingle(),
  ])
  return { liked: !!like, saved: !!save }
}

export async function getBatchPostStates(postIds, userId) {
  if (!userId || !postIds.length) return {}
  const [{ data: likedRows }, { data: savedRows }] = await Promise.all([
    supabase.from('likes').select('post_id').eq('user_id', userId).in('post_id', postIds),
    supabase.from('saves').select('post_id').eq('user_id', userId).in('post_id', postIds),
  ])
  const liked = new Set((likedRows || []).map(r => r.post_id))
  const saved = new Set((savedRows || []).map(r => r.post_id))
  return Object.fromEntries(postIds.map(id => [id, { liked: liked.has(id), saved: saved.has(id) }]))
}

// ── Like / unlike ─────────────────────────────────────────────────────────────
export async function likePost(postId, userId) {
  await supabase.from('likes').insert({ post_id: postId, user_id: userId })
  await supabase.rpc('increment_likes', { post_id: postId })
}
export async function unlikePost(postId, userId) {
  await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', userId)
  await supabase.rpc('decrement_likes', { post_id: postId })
}

// ── Save / unsave ─────────────────────────────────────────────────────────────
export async function savePost(postId, userId) {
  await supabase.from('saves').insert({ post_id: postId, user_id: userId })
  await supabase.rpc('increment_saves', { post_id: postId })
}
export async function unsavePost(postId, userId) {
  await supabase.from('saves').delete().eq('post_id', postId).eq('user_id', userId)
  await supabase.rpc('decrement_saves', { post_id: postId })
}

// ── View / share ──────────────────────────────────────────────────────────────
export async function recordView(postId, userId) {
  await supabase.from('post_views').insert({ post_id: postId, user_id: userId || null })
  await supabase.rpc('increment_views', { post_id: postId })
}
export async function sharePost(postId) {
  await supabase.rpc('increment_shares', { post_id: postId })
}

// ── Comments ──────────────────────────────────────────────────────────────────
export async function fetchPostComments(postId) {
  const { data, error } = await supabase
    .from('post_comments')
    .select(`*, author:profiles!user_id (id, full_name, username, avatar_url, verified)`)
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .limit(50)
  if (error) { console.error('fetchPostComments', error); return [] }
  return data || []
}
export async function addComment(postId, userId, message) {
  const { data, error } = await supabase
    .from('post_comments')
    .insert({ post_id: postId, user_id: userId, message })
    .select(`*, author:profiles!user_id (id, full_name, username, avatar_url, verified)`)
    .single()
  if (error) { console.error('addComment', error); return null }
  await supabase.rpc('increment_comments', { post_id: postId })
  return data
}

// ── Upload media files to Supabase Storage ───────────────────────────────────
function extFromMime(mime = '', type = 'photo') {
  const map = {
    'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
    'image/gif': 'gif', 'image/heic': 'jpg', 'image/heif': 'jpg',
    'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
    'video/x-msvideo': 'avi', 'video/3gpp': '3gp',
  }
  return map[mime] || (type === 'video' ? 'mp4' : 'jpg')
}

export async function uploadPostMedia(files, sellerId, onProgress) {
  if (!files || !files.length) return []
  const urls = []
  const total = files.length

  for (let i = 0; i < files.length; i++) {
    const { file, type } = files[i]
    if (!file) continue

    const mime = file.type || (type === 'video' ? 'video/mp4' : 'image/jpeg')
    const ext  = extFromMime(mime, type)
    const path = `${sellerId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error } = await supabase.storage
      .from('post-media')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: mime,
      })

    if (error) {
      console.error('uploadPostMedia', path, error)
      continue
    }

    const { data: { publicUrl } } = supabase.storage.from('post-media').getPublicUrl(path)
    urls.push(publicUrl)
    onProgress?.((i + 1) / total)
  }
  return urls
}

// ── Create post ───────────────────────────────────────────────────────────────
export async function createPost({
  sellerId, postType = 'product',
  title, description, caption,
  price, origPrice, category, condition, brand, location,
  isNegotiable, deliveryAvailable, isHot = false,
  emoji, tags = [], mediaFiles = [],
  filterName = 'Original',
  musicTrackId = null, musicExternalId = null,
  musicFileUrl = null, musicTitle = null, musicArtist = null,
  musicStartSec = 0,
  textOverlays = [],
  // service fields
  serviceCategory, serviceRate, serviceRateType, serviceFeatures, serviceDuration, serviceBadge,
  status = 'active',
  onUploadProgress,
}) {
  const imageUrls = []
  let   videoUrl  = null
  let   thumbnailUrl = null

  if (mediaFiles.length) {
    const photos = mediaFiles.filter(m => m.type === 'photo')
    const videos = mediaFiles.filter(m => m.type === 'video')
    if (photos.length) {
      const u = await uploadPostMedia(photos, sellerId, onUploadProgress)
      imageUrls.push(...u)
    }
    if (videos.length) {
      const u = await uploadPostMedia(videos, sellerId, pct => onUploadProgress?.(0.5 + pct * 0.5))
      videoUrl = u[0] || null
    }
    thumbnailUrl = imageUrls[0] || null
  }

  const { data, error } = await supabase
    .from('posts')
    .insert({
      seller_id: sellerId, post_type: postType,
      title, description, caption,
      price:      (postType === 'product') ? (parseFloat(price) || null) : null,
      orig_price: parseFloat(origPrice) || null,
      category:   category || null,
      condition,  brand, location,
      is_negotiable: isNegotiable,
      delivery_available: deliveryAvailable,
      is_hot: isHot, tags,
      images: imageUrls, video_url: videoUrl,
      thumbnail_url: thumbnailUrl || imageUrls[0] || null,
      emoji: emoji || null,
      filter_name: filterName,
      text_overlays: textOverlays?.length ? textOverlays : [],
      music_track_id: musicTrackId || null,
      music_external_id: musicExternalId || null,
      music_file_url: musicFileUrl || null,
      music_title: musicTitle || null,
      music_artist: musicArtist || null,
      music_start_sec: musicStartSec || 0,
      // service
      service_category: serviceCategory,
      service_rate: serviceRate ? parseFloat(serviceRate) : null,
      service_rate_type: serviceRateType || 'fixed',
      service_features: serviceFeatures || [],
      service_duration: serviceDuration,
      service_badge: serviceBadge,
      status,
    })
    .select(`*, seller:profiles!seller_id (id, full_name, username, avatar_url, verified, location, lat, lng)`)
    .single()
  if (error) { console.error('createPost error:', JSON.stringify(error)); return null }
  return data
}

// ── Save draft ────────────────────────────────────────────────────────────────
export async function saveDraft(params) {
  return createPost({ ...params, status: 'draft' })
}
