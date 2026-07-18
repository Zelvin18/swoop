/**
 * Swoop Delivery — distance-based fee calculation (per-km tiered)
 *
 * Uses haversineKm() from lib/feed.js between buyer & seller coords.
 * Tuned for Uganda / Kampala: base fee + per-km, floored and capped.
 */

// All amounts in UGX
export const DELIVERY = {
  BASE_FEE: 2000,    // flat starting fee for any delivery
  PER_KM: 800,       // UGX per km
  MIN_FEE: 2000,     // floor
  MAX_FEE: 25000,    // cap (long cross-city / outskirts trips)
}

/**
 * Compute the delivery fee for a given road distance in km.
 * @param {number|null|undefined} km  great-circle distance (we apply a 1.3x road factor)
 * @returns {number} fee in UGX (integer)
 */
export function calcDeliveryFee(km) {
  if (km == null || km <= 0) return DELIVERY.MIN_FEE
  // Great-circle is shorter than road; apply a rough road-distance factor.
  const roadKm = km * 1.3
  const fee = DELIVERY.BASE_FEE + Math.ceil(roadKm) * DELIVERY.PER_KM
  return Math.min(Math.max(Math.round(fee), DELIVERY.MIN_FEE), DELIVERY.MAX_FEE)
}

/**
 * Format a distance + fee line, e.g. "8.4 km · UGX 8,800 delivery"
 */
export function fmtDeliveryLine(km, fee) {
  if (km == null) return `Flat delivery · UGX ${Number(fee || 0).toLocaleString('en-UG')}`
  const kmStr = km < 1 ? `${Math.round(km * 1000)} m` : `${Number(km).toFixed(1)} km`
  return `${kmStr} · UGX ${Number(fee || 0).toLocaleString('en-UG')} delivery`
}
