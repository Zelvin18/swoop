# Swoop Payments — Phase 1

Reservation → Seller Accept → Buyer Pay (Flutterwave) → Escrow → Release.

```
Buyer fills ReservationPage (delivery fee = per-km, buyer↔seller distance)
  └─► Confirm Reservation  ──►  order: requested  (NO payment yet)
                                 + reservation_request message in chat
Seller inbox  ─►  [Accept] [Decline]
  └─ Accept   ──►  order: accepted  + payment_request (Pay Now) in chat
  └─ Decline  ──►  order: declined  (buyer notified)
Buyer  ─► [Pay Now]  ──►  Flutterwave checkout (MTN MoMo / Airtel / card)
                           └─ webhook verifies  ──►  order: paid (escrow_hold)
Seller ─► ships      ──►  order: shipped
Buyer  ─► [Confirm Receipt]  ──►  order: delivered → completed
                                     └─ release_escrow  ──►  seller wallet credited
```

**Why the gate:** payment only happens *after* the seller confirms stock, so
nobody sends money for an item that isn't available.

---

## 1. Database setup (run in Supabase SQL Editor, in this order)

```
lib/profile-schema.sql          (base orders / transactions — if not already run)
lib/payments-schema.sql         (extends orders, adds wallet_ledger / payouts / payment_events / RPCs)
lib/payments-messages-schema.sql(adds reservation_request + payment_request message types)
```

All files are idempotent — safe to re-run.

---

## 2. Environment

Copy `.env.example` → `.env.local` and fill in.

- **`PAYMENTS_MOCK=true`** runs the full flow with no gateway. Use this for local
  dev. The mock "pays" instantly and fires the same DB updates the real webhook
  would, so you can test the entire escrow loop.
- **`SUPABASE_SERVICE_ROLE_KEY`** must be your real service_role key — the API
  routes use it (via `supabaseAdmin()`) to run the ledger RPCs that bypass RLS.
- When ready for real payments, set `PAYMENTS_MOCK=false` and add the `FLW_*`
  keys from the Flutterwave dashboard (sandbox first).

---

## 3. Distance-based delivery fee

`lib/delivery.js` — per-km tiered, Kampala-tuned:

| Component | Value (UGX) |
|---|---|
| Base fee | 2,000 |
| Per km (road-adjusted ×1.3) | 800 |
| Floor | 2,000 |
| Cap | 25,000 |

Buyer location is obtained via `requestLocation()` (or read from the persisted
`profiles.lat/lng`). Seller location comes from `post.seller.lat/lng` (already
selected in `fetchFeedPosts`). Pickup orders skip the fee entirely.

---

## 4. End-to-end sandbox test

**Mock mode (no gateway):**
1. Two test accounts: **buyer** + **seller** (seller has an active post with a price).
2. As buyer: open the post → **Buy Now** → fill reservation → **Confirm**.
   - You should land in the chat with a reservation_request card.
   - The `orders` row is `fulfillment_status=requested`, `payment_status=unpaid`.
3. As seller: open the inbox → the same conversation shows **[Accept] [Decline]**.
   - Tap **Accept**. The order becomes `accepted`, a payment_request card appears.
4. As buyer: the reservation card now shows **[Pay Now UGX …]**.
   - Tap it. In mock mode, payment "succeeds" immediately.
   - Order: `payment_status=paid`, `fulfillment_status=paid`. A `wallet_ledger`
     `escrow_hold` row exists. Seller `pending_balance` increased.
5. As seller: a **[Mark Shipped]** button appears. Tap → `shipped`.
6. As buyer: **[Confirm Receipt]** appears. Tap → `delivered` → `completed`.
   - `release_escrow` RPC runs. Seller `wallet_balance` increases,
     `pending_balance` decreases, `total_earned` and `sales_count` increment.
7. As seller: open **Wallet** (Profile → Payment & Banking). Balance + ledger show it.
8. Idempotency check: re-run the mock pay on the same order → no double credit.

**Real Flutterwave sandbox:**
- Set `PAYMENTS_MOCK=false`, add sandbox `FLW_*` keys.
- Use Flutterwave **test cards** (e.g. `4187 4274 0982 4213`, any future expiry,
  any CVV) or **test MoMo** numbers from the Flutterwave sandbox docs.
- Expose the webhook: `cloudflared tunnel` (you already have `cloudflared.exe`
  in the repo root) → point Flutterwave webhook to `https://<tunnel>/api/payments/webhook`.

---

## 5. Order status reference

**`fulfillment_status`** (the source of truth for the flow):
`requested · accepted · awaiting_payment · paid · shipped · delivered · completed · cancelled · declined`

**`payment_status`**:
`unpaid · pending · paid · refunded · failed`

The old `orders.status` column is kept for backward-compat with the Dashboard;
the API routes keep it roughly in sync, but read `fulfillment_status` for truth.

---

## 6. Files added/changed

- `lib/payments-schema.sql`, `lib/payments-messages-schema.sql` — DB migrations
- `lib/delivery.js` — fee calc
- `lib/payments.js` — client API helpers
- `pages/api/orders/{create,accept,decline,ship,confirm-receipt,cancel}.js`
- `pages/api/payments/{init,webhook}.js`
- `pages/api/payouts/request.js`
- `components/ActionCard.jsx` — the interactive chat button card
- `components/ReservationPage.jsx` — request-only, distance fee
- `components/ChatScreen.jsx` — renders ActionCards, subscribes to order realtime
- `components/WalletScreen.jsx` — balance + ledger + payout request

---

## 7. Phase 2 (later)

Automated MoMo payouts, dispute flow UI, push notifications, auto-complete timer
(7-day buyer no-action), platform commission/fees on release, admin panel.
