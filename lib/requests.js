/**
 * Swoop Requests — Supabase data helpers
 */
import { supabase } from './supabase'
import { haversineKm } from './feed'

export const REQUEST_CATEGORIES = [
  'Phones', 'Electronics', 'Fashion', 'Sneakers',
  'Home', 'Beauty', 'Cars', 'Furniture', 'Sports', 'Other',
]

export const RADIUS_OPTIONS = [5, 10, 20, 50, 100]

export function fmtBudget(min, max) {
  const fmt = n => `UGX ${Number(n).toLocaleString('en-UG')}`
  if (min && max) return `${fmt(min)} – ${fmt(max)}`
  if (max) return `Up to ${fmt(max)}`
  if (min) return `From ${fmt(min)}`
  return 'Flexible'
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)   return 'just now'
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7)   return `${d}d ago`
  return new Date(dateStr).toLocaleDateString('en-UG', { month: 'short', day: 'numeric' })
}

// ── Fetch requests ─────────────────────────────────────────────────────────────
export async function fetchRequests({
  filter = 'All Requests',
  category = null,
  currentUserId = null,
  userLat = null,
  userLng = null,
  page = 0,
  limit = 15,
  myRequestsStatus = null,
} = {}) {
  let query = supabase
    .from('requests')
    .select(`
      *,
      buyer:profiles!buyer_id (
        id, full_name, username, avatar_url, verified, location
      )
    `)
    .order('created_at', { ascending: false })
    .range(page * limit, page * limit + limit - 1)

  if (filter === 'My Requests') {
    if (!currentUserId) return []
    query = query.eq('buyer_id', currentUserId)
    if (myRequestsStatus) query = query.eq('status', myRequestsStatus)
    // No status filter when myRequestsStatus is null — shows all statuses
  } else {
    query = query.eq('status', 'open')
  }

  if (category) query = query.ilike('category', category)

  if (filter === 'Following' && currentUserId) {
    const { data: follows } = await supabase
      .from('follows').select('following_id').eq('follower_id', currentUserId)
    const ids = (follows || []).map(f => f.following_id)
    if (!ids.length) return []
    query = query.in('buyer_id', ids)
  }

  const { data, error } = await query
  if (error) { console.error('fetchRequests', error); return [] }
  let rows = data || []

  // Near You: sort by distance
  if (filter === 'Near You' && userLat !== null && userLng !== null) {
    rows = rows
      .map(r => {
        const km = (r.lat && r.lng) ? haversineKm(userLat, userLng, r.lat, r.lng) : null
        return { ...r, _distanceKm: km, _timeAgo: timeAgo(r.created_at) }
      })
      .filter(r => r._distanceKm !== null && r._distanceKm <= (r.radius_km || 50))
      .sort((a, b) => a._distanceKm - b._distanceKm)
    return rows
  }

  return rows.map(r => ({ ...r, _timeAgo: timeAgo(r.created_at) }))
}

// ── Search requests ────────────────────────────────────────────────────────────
export async function searchRequests(query) {
  if (!query.trim()) return []
  const { data, error } = await supabase
    .from('requests')
    .select(`*, buyer:profiles!buyer_id (id, full_name, username, avatar_url, verified)`)
    .eq('status', 'open')
    .or(`title.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)
    .order('offers_count', { ascending: false })
    .limit(20)
  if (error) { console.error('searchRequests', error); return [] }
  return (data || []).map(r => ({ ...r, _timeAgo: timeAgo(r.created_at) }))
}

// ── Create a request ───────────────────────────────────────────────────────────
export async function createRequest({
  buyerId, title, description, category,
  budgetMin, budgetMax, colorPref, conditionPref,
  location, lat, lng, radiusKm, visibility,
  images,
}) {
  const { data, error } = await supabase
    .from('requests')
    .insert({
      buyer_id: buyerId, title, description, category,
      budget_min: budgetMin ? parseFloat(budgetMin) : null,
      budget_max: budgetMax ? parseFloat(budgetMax) : null,
      color_pref: colorPref, condition_pref: conditionPref,
      location, lat, lng,
      radius_km: radiusKm || 20,
      visibility: visibility || 'everyone',
      status: 'open',
      images: images || [],
    })
    .select()
    .single()
  if (error) { console.error('createRequest', error); return null }
  return data
}

// ── Fetch offers for a request ─────────────────────────────────────────────────
export async function fetchOffers(requestId) {
  const { data, error } = await supabase
    .from('offers')
    .select(`
      *,
      seller:profiles!seller_id (
        id, full_name, username, avatar_url, verified,
        location, lat, lng, rating, avg_rating, review_count,
        response_rate, joined_at
      )
    `)
    .eq('request_id', requestId)
    .order('created_at', { ascending: false })
  if (error) { console.error('fetchOffers', error); return [] }
  return data || []
}

// ── Make an offer (seller) ─────────────────────────────────────────────────────
export async function makeOffer({ requestId, sellerId, message, price, negotiable = true, images = [] }) {
  const { data, error } = await supabase
    .from('offers')
    .insert({
      request_id: requestId,
      seller_id:  sellerId,
      message,
      price: price ? parseFloat(price) : null,
      negotiable,
      images,
    })
    .select()
    .single()
  if (error) { console.error('makeOffer', error); return { error } }
  await supabase.rpc('increment_offers_count', { req_id: requestId })
  return { data }
}

// ── Accept / reject an offer ───────────────────────────────────────────────────
export async function updateOfferStatus(offerId, status) {
  const { error } = await supabase
    .from('offers').update({ status }).eq('id', offerId)
  if (error) console.error('updateOfferStatus', error)
}

// ── My requests (for profile page) ────────────────────────────────────────────
export async function fetchMyRequests(userId) {
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .eq('buyer_id', userId)
    .order('created_at', { ascending: false })
  if (error) { console.error('fetchMyRequests', error); return [] }
  return data || []
}

// ── Fetch up to 3 seller avatars per request (for card preview) ──────────────
export async function fetchRequestOfferAvatars(requestIds) {
  if (!requestIds || !requestIds.length) return {}
  const { data, error } = await supabase
    .from('offers')
    .select('request_id, seller_id, seller:profiles!seller_id(avatar_url, full_name, username)')
    .in('request_id', requestIds)
    .order('created_at', { ascending: true })
  if (error) { console.error('fetchRequestOfferAvatars', error); return {} }
  const map = {}
  for (const row of data || []) {
    if (!map[row.request_id]) map[row.request_id] = []
    if (map[row.request_id].length < 3) {
      map[row.request_id].push({ seller_id: row.seller_id, ...(row.seller || {}) })
    }
  }
  return map
}

// ── Delete a request ──────────────────────────────────────────────────────────
export async function deleteRequest(requestId, userId) {
  await supabase.from('requests').delete().eq('id', requestId).eq('buyer_id', userId)
}
