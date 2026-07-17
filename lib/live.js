/**
 * Swoop Live — Supabase data helpers
 * All live-related queries and realtime subscriptions live here.
 */
import { supabase } from './supabase'

// ─── Colour palette for user avatars (deterministic from user id) ───────────
const AVATAR_COLORS = [
  '#7C3AED','#FF3366','#F97316','#22C55E','#3B82F6',
  '#EC4899','#8B5CF6','#F59E0B','#06B6D4','#EF4444',
]
export function avatarColor(id = '') {
  const n = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[n % AVATAR_COLORS.length]
}
export function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
}
export function fmtViewers(n) {
  return n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'K' : String(n)
}
export function fmtTime(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

// ─── Fetch live streams (list page) ─────────────────────────────────────────
export async function fetchLiveStreams({ filter = 'All', currentUserId = null } = {}) {
  let query = supabase
    .from('live_streams')
    .select(`
      *,
      profiles:host_id (
        id, full_name, username, avatar_url, verified
      )
    `)
    .eq('status', 'live')
    .order('viewer_count', { ascending: false })

  if (filter === 'Following' && currentUserId) {
    // Get ids of people the user follows
    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', currentUserId)
    const ids = (follows || []).map(f => f.following_id)
    if (ids.length === 0) return []
    query = query.in('host_id', ids)
  } else if (filter !== 'All') {
    query = query.ilike('category', filter)
  }

  const { data, error } = await query.limit(20)
  if (error) { console.error('fetchLiveStreams', error); return [] }
  return data || []
}

// ─── Fetch upcoming streams (from people user follows) ───────────────────────
export async function fetchUpcomingStreams(currentUserId) {
  if (!currentUserId) return []

  const { data: follows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', currentUserId)
  const ids = (follows || []).map(f => f.following_id)
  if (ids.length === 0) return []

  const { data, error } = await supabase
    .from('live_streams')
    .select(`*, profiles:host_id (id, full_name, username, avatar_url, verified)`)
    .eq('status', 'scheduled')
    .in('host_id', ids)
    .gt('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(10)

  if (error) { console.error('fetchUpcomingStreams', error); return [] }
  return data || []
}

// ─── Top categories (grouped count of live streams) ──────────────────────────
export async function fetchTopCategories() {
  const { data, error } = await supabase
    .from('live_streams')
    .select('category')
    .eq('status', 'live')

  if (error) { console.error('fetchTopCategories', error); return [] }

  // Count per category
  const counts = {}
  ;(data || []).forEach(row => {
    if (row.category) counts[row.category] = (counts[row.category] || 0) + 1
  })
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }))
}

// ─── Search live streams ──────────────────────────────────────────────────────
export async function searchLiveStreams(query) {
  if (!query.trim()) return []
  const { data, error } = await supabase
    .from('live_streams')
    .select(`*, profiles:host_id (id, full_name, username, avatar_url, verified)`)
    .eq('status', 'live')
    .or(`title.ilike.%${query}%,category.ilike.%${query}%`)
    .limit(20)
  if (error) { console.error('searchLiveStreams', error); return [] }
  return data || []
}

// ─── Notifications ────────────────────────────────────────────────────────────
export async function fetchNotifications(userId) {
  const { data, error } = await supabase
    .from('live_notifications')
    .select(`
      *,
      actor:actor_id (id, full_name, username, avatar_url),
      stream:stream_id (id, title, type)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30)
  if (error) { console.error('fetchNotifications', error); return [] }
  return data || []
}

export async function markNotificationsRead(userId) {
  await supabase
    .from('live_notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)
}

export async function countUnreadNotifications(userId) {
  const { count } = await supabase
    .from('live_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false)
  return count || 0
}

// ─── Notify me (upcoming stream) ─────────────────────────────────────────────
export async function subscribeToStream(userId, streamId) {
  await supabase.from('live_notifications').insert({
    user_id: userId,
    type: 'stream_notify_request',
    stream_id: streamId,
  })
}

// ─── Start a live stream (host) ───────────────────────────────────────────────
export async function startLiveStream({ hostId, title, category, type, deliveryAvailable }) {
  // First, end any existing active stream for this host to prevent duplicates
  await supabase
    .from('live_streams')
    .update({ status: 'ended', ended_at: new Date().toISOString() })
    .eq('host_id', hostId)
    .eq('status', 'live')

  const { data, error } = await supabase
    .from('live_streams')
    .insert({
      host_id: hostId,
      title,
      category,
      type,
      delivery_available: deliveryAvailable,
      status: 'live',
      viewer_count: 0,
      started_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (error) { console.error('startLiveStream', error); return null }
  return data
}

// ─── Insert products for a sell live ─────────────────────────────────────────
export async function insertLiveProducts(streamId, products) {
  if (!products.length) return
  const rows = products.map((p, i) => ({
    stream_id: streamId,
    name: p.name,
    price: parseFloat(p.price) || 0,
    stock_count: parseInt(p.stock) || 0,
    stock_remaining: parseInt(p.stock) || 0,
    instant_reserve: p.instant_reserve,
    delivery: p.delivery,
    position: i,
  }))
  const { error } = await supabase.from('live_products').insert(rows)
  if (error) console.error('insertLiveProducts', error)
}

// ─── End a live stream ────────────────────────────────────────────────────────
export async function endLiveStream(streamId) {
  await supabase
    .from('live_streams')
    .update({ status: 'ended', ended_at: new Date().toISOString() })
    .eq('id', streamId)
}

// ─── Fetch products for a stream ──────────────────────────────────────────────
export async function fetchLiveProducts(streamId) {
  const { data, error } = await supabase
    .from('live_products')
    .select('*')
    .eq('stream_id', streamId)
    .order('position')
  if (error) { console.error('fetchLiveProducts', error); return [] }
  return data || []
}

// ─── Send a comment ───────────────────────────────────────────────────────────
export async function sendLiveComment(streamId, userId, message) {
  const { error } = await supabase
    .from('live_comments')
    .insert({ stream_id: streamId, user_id: userId, message })
  if (error) console.error('sendLiveComment', error)
}

// ─── Send a reaction ──────────────────────────────────────────────────────────
export async function sendLiveReaction(streamId, userId, type = 'heart') {
  await supabase
    .from('live_reactions')
    .insert({ stream_id: streamId, user_id: userId, type })
}

// ─── Reserve a product ───────────────────────────────────────────────────────
export async function reserveProduct(streamId, productId, buyerId) {
  const { data, error } = await supabase
    .from('live_reservations')
    .insert({
      stream_id: streamId,
      product_id: productId,
      buyer_id: buyerId,
      quantity: 1,
      status: 'pending',
    })
    .select()
    .single()

  if (error) { console.error('reserveProduct', error); return null }

  // Decrement stock
  await supabase.rpc('decrement_live_stock', { product_id: productId })

  return data
}

// ─── Increment viewer count ───────────────────────────────────────────────────
export async function joinStream(streamId) {
  await supabase.rpc('increment_viewer_count', { stream_id: streamId })
}
export async function leaveStream(streamId) {
  await supabase.rpc('decrement_viewer_count', { stream_id: streamId })
}

// ─── Follow / unfollow ───────────────────────────────────────────────────────
export async function followUser(followerId, followingId) {
  await supabase.from('follows').insert({ follower_id: followerId, following_id: followingId })
}
export async function unfollowUser(followerId, followingId) {
  await supabase.from('follows').delete()
    .eq('follower_id', followerId).eq('following_id', followingId)
}
export async function isFollowing(followerId, followingId) {
  const { data } = await supabase
    .from('follows').select('id')
    .eq('follower_id', followerId).eq('following_id', followingId).single()
  return !!data
}
