/**
 * Swoop Feed — Supabase data helpers
 * All feed/post related queries live here.
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

// ── Fetch feed posts ──────────────────────────────────────────────────────────
export async function fetchFeedPosts({ category = 'All', tab = 'For You', currentUserId = null, page = 0, limit = 10 } = {}) {
  let query = supabase
    .from('posts')
    .select(`
      *,
      seller:profiles!seller_id (
        id, full_name, username, avatar_url, verified, location
      )
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .range(page * limit, page * limit + limit - 1)

  if (category !== 'All') {
    query = query.ilike('category', category)
  }

  if (tab === 'Nearby' && currentUserId) {
    // MVP: filter by same city — get user profile location first
    const { data: profile } = await supabase
      .from('profiles')
      .select('location')
      .eq('id', currentUserId)
      .single()
    if (profile?.location) {
      const city = profile.location.split(',')[0].trim()
      query = query.ilike('location', `%${city}%`)
    }
  }

  const { data, error } = await query
  if (error) { console.error('fetchFeedPosts', error); return [] }
  return data || []
}

// ── Check if user liked / saved a post ───────────────────────────────────────
export async function getUserPostState(postId, userId) {
  if (!userId) return { liked: false, saved: false }
  const [{ data: like }, { data: save }] = await Promise.all([
    supabase.from('likes').select('id').eq('post_id', postId).eq('user_id', userId).maybeSingle(),
    supabase.from('saves').select('id').eq('post_id', postId).eq('user_id', userId).maybeSingle(),
  ])
  return { liked: !!like, saved: !!save }
}

// ── Batch check liked/saved for multiple posts ────────────────────────────────
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

// ── Record a view ─────────────────────────────────────────────────────────────
export async function recordView(postId, userId) {
  await supabase.from('post_views').insert({ post_id: postId, user_id: userId || null })
  await supabase.rpc('increment_views', { post_id: postId })
}

// ── Share (increment counter) ─────────────────────────────────────────────────
export async function sharePost(postId) {
  await supabase.rpc('increment_shares', { post_id: postId })
}

// ── Fetch comments for a post ─────────────────────────────────────────────────
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

// ── Post a comment ────────────────────────────────────────────────────────────
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

// ── Create a post (from Add Post modal) ──────────────────────────────────────
export async function createPost({ sellerId, title, description, price, origPrice, category, condition, brand, location, isNegotiable, deliveryAvailable, emoji }) {
  const { data, error } = await supabase
    .from('posts')
    .insert({
      seller_id: sellerId,
      title,
      description,
      price: parseFloat(price) || 0,
      orig_price: parseFloat(origPrice) || null,
      category,
      condition,
      brand,
      location,
      is_negotiable: isNegotiable,
      delivery_available: deliveryAvailable,
      emoji: emoji || '📦',
      status: 'active',
    })
    .select()
    .single()
  if (error) { console.error('createPost', error); return null }
  return data
}
