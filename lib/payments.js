/**
 * Swoop Payments — client-side helpers
 *
 * Talks to the server API routes (pages/api/orders/*, pages/api/payments/*).
 * The browser NEVER sees gateway secret keys; it only ever calls our own API,
 * which performs the server→gateway calls and the privileged ledger RPCs.
 *
 * Order lifecycle (mirrors the API):
 *   requested → accepted → awaiting_payment → paid → shipped → delivered → completed
 *   requested → declined            (seller declines)
 *   paid → cancelled (refund)       (cancellation after payment)
 */

// ── FULFILLMENT / PAYMENT STATUS HELPERS (shared display logic) ──────────────

// Human-readable single-line status for an order
export function orderStatusLabel(order) {
  const f = order?.fulfillment_status
  const p = order?.payment_status
  switch (f) {
    case 'requested':         return 'Reservation requested'
    case 'accepted':          return 'Awaiting payment'
    case 'awaiting_payment':  return 'Awaiting payment'
    case 'paid':              return 'Paid · in escrow'
    case 'shipped':           return 'On the way'
    case 'delivered':         return 'Delivered · awaiting confirmation'
    case 'completed':         return 'Completed'
    case 'declined':          return 'Declined by seller'
    case 'cancelled':         return 'Cancelled'
    default:                  return p === 'paid' ? 'Paid' : 'Pending'
  }
}

// What action buttons should be shown to each role for an order?
// Returns an array like [{kind:'accept'}, {kind:'decline'}] or [] when none.
export function actionsForOrder(order, currentUserId) {
  if (!order) return []
  const isSeller = currentUserId === order.seller_id
  const isBuyer  = currentUserId === order.buyer_id
  const f = order.fulfillment_status
  const p = order.payment_status
  const out = []

  if (isSeller && f === 'requested') {
    out.push({ kind: 'accept' }, { kind: 'decline' })
  }
  if (isSeller && f === 'paid') {
    out.push({ kind: 'ship' })
  }
  if (isBuyer && f === 'accepted') {
    out.push({ kind: 'pay' })   // pay now
  }
  if (isBuyer && f === 'shipped') {
    out.push({ kind: 'confirm_receipt' })
  }
  // Cancellation allowed for buyer before payment, for seller before shipment
  if (isBuyer && (f === 'requested' || (f === 'accepted' && p !== 'paid'))) {
    out.push({ kind: 'cancel' })
  }
  return out
}

// ── API CALLS ────────────────────────────────────────────────────────────────

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data?.error) {
    const err = new Error(data?.error || `Request failed (${res.status})`)
    err.status = res.status
    err.payload = data
    throw err
  }
  return data
}

/**
 * Create a reservation (no payment). Buyer flow.
 * Server creates the order + posts the reservation_request message into the chat.
 * Returns { orderId, conversationId }.
 */
export function createReservation({ post, sellerId, buyerId, deliveryType, address, notes, deliveryFee, distanceKm, buyerLat, buyerLng }) {
  return postJSON('/api/orders/create', {
    postId: post.id,
    sellerId,
    buyerId,
    amount: Number(post.price),
    deliveryType,
    deliveryAddress: deliveryType === 'delivery' ? address : null,
    notes,
    deliveryFee,
    distanceKm,
    buyerLat,
    buyerLng,
  })
}

/** Seller accepts a reservation. Posts payment_request into chat. */
export function acceptOrder(orderId) {
  return postJSON('/api/orders/accept', { orderId })
}

/** Seller declines a reservation. */
export function declineOrder(orderId) {
  return postJSON('/api/orders/decline', { orderId })
}

/** Seller marks shipped. */
export function shipOrder(orderId) {
  return postJSON('/api/orders/ship', { orderId })
}

/** Buyer confirms receipt → releases escrow to seller. */
export function confirmReceipt(orderId) {
  return postJSON('/api/orders/confirm-receipt', { orderId })
}

/** Cancel an order (buyer before payment, or seller in limited cases). */
export function cancelOrder(orderId) {
  return postJSON('/api/orders/cancel', { orderId })
}

/**
 * Buyer initiates payment. Server talks to Flutterwave (or mock in dev) and
 * returns either a hosted checkout link or (mock mode) an immediate paid result.
 * Returns { checkoutUrl?, mock?, orderId, paymentRef }.
 */
export function initiatePayment({ orderId, method, phone }) {
  return postJSON('/api/payments/init', { orderId, method, phone })
}

/** Seller requests a payout of wallet balance (phase 1: just records it). */
export function requestPayout({ amount, method, destination }) {
  return postJSON('/api/payouts/request', { amount, method, destination })
}
