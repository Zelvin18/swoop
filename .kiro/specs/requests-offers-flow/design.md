# Design Document: Requests & Offers Flow

## Overview

This feature replaces the existing `OffersSheet` bottom-sheet with a cohesive set of full-screen pages
that cover the complete requests-and-offers lifecycle: browsing requests, composing an offer, reviewing
received offers, inspecting a single offer in detail, confirming acceptance, and handing off to the
existing `ReservationPage` checkout flow.

The implementation stays entirely within the `RequestsPage` component tree using a local `activePage`
state machine — no Next.js router changes. Every new surface uses `position:fixed; inset:0; zIndex:9999`
overlays, matching the `ReservationPage` precedent. All styling is inline (no Tailwind), using
`FontAwesome` icons and the `'Inter', sans-serif` font, consistent with every existing component.

### Key Design Decisions

- **Single state machine in `RequestsPage`** — `activePage` drives which overlay is visible.
  Avoids prop-drilling router state and keeps the feature self-contained.
- **`OffersSheet` is retained but bypassed** — existing sheet is not deleted; `RequestsPage` just
  stops rendering it. It can be removed in a later clean-up PR.
- **`fetchRequestOfferAvatars` is a separate helper** — it enriches each request card with `_offerAvatars`
  and is called once per `loadRequests()` cycle, keeping `fetchRequests` pure.
- **`makeOffer` signature extended, not replaced** — new optional fields (`negotiable`, `images`) are
  added; existing callers (OffersSheet) continue to work without changes.

---

## Architecture

### Navigation State Machine

`RequestsPage` owns a single `activePage` value (a discriminated string) plus two selected-entity refs.

```
activePage: null | 'sendOffer' | 'offersInbox' | 'offerDetails' | 'reservation'
selectedRequest: Request | null
selectedOffer:   Offer   | null
```

State transitions:

```
null
  ├─ Make Offer (non-owner)      → 'sendOffer',    selectedRequest = r
  └─ View Offers (owner)         → 'offersInbox',  selectedRequest = r

'sendOffer'
  ├─ back / cancel               → null
  └─ onSubmitted                 → null  (+ refresh cards)

'offersInbox'
  ├─ back                        → null
  └─ onViewOffer(offer)          → 'offerDetails', selectedOffer = offer

'offerDetails'
  ├─ back                        → 'offersInbox'
  ├─ onDeclined                  → 'offersInbox'
  └─ onAccepted(offer)           → 'reservation',  selectedOffer = offer

'reservation'
  ├─ onBack                      → 'offersInbox'
  └─ onConfirmed                 → null  (+ showToast)
```

### Component Tree

```
RequestsPage (state owner)
├── [filter pills: "My Requests" | "All Requests" | "Near You" | "Following" | "Categories"]
├── RequestCard[]          ← enriched with _offerAvatars
├── PostRequestModal       (existing, unchanged)
│
├── {activePage === 'sendOffer'}
│   └── SendOfferPage      (new)
│
├── {activePage === 'offersInbox'}
│   └── OffersInbox        (new)
│
├── {activePage === 'offerDetails'}
│   └── OfferDetailsPage   (new)
│       └── {showAcceptModal}
│           └── AcceptOfferModal (new)
│
└── {activePage === 'reservation'}
    └── ReservationPage    (existing, unchanged)
```

---

## Components and Interfaces

### RequestsPage (modified)

```jsx
// New state additions
const [activePage,       setActivePage]       = useState(null)  // null|'sendOffer'|'offersInbox'|'offerDetails'|'reservation'
const [selectedRequest,  setSelectedRequest]  = useState(null)
const [selectedOffer,    setSelectedOffer]    = useState(null)

// FILTERS constant updated:
const FILTERS = ['My Requests', 'All Requests', 'Near You', 'Following', 'Categories']

// loadRequests now calls fetchRequestOfferAvatars after fetching:
// requests → enriched with _offerAvatars: [{ avatar_url, seller_id, full_name }]
```

`RequestCard` receives two new props:
- `onMakeOffer(r)` — fires when non-owner taps "Make Offer"
- `onViewOffers(r)` — fires when owner taps "View Offers"

The card footer avatar row is updated: instead of `{String.fromCharCode(65+i)}` placeholders,
it iterates `r._offerAvatars` and renders `<img>` when `avatar_url` is set, or a colored
initials circle using the existing `avatarColor` / `initials` helpers when it is not.

---

### SendOfferPage

```
File:  components/SendOfferPage.jsx
Props: { request, currentUser, onClose, onSubmitted(offer) }
```

Internal state: `price`, `description` (string, maxLength 500), `negotiable` (bool, default true),
`images` (array, max 5), `sending` (bool), `error` (string).

The page is a `position:fixed; inset:0; zIndex:9999; background:#000; display:flex; flexDirection:column`
container with:
1. **Fixed header** — back arrow (`<button onClick={onClose}>`), title "Send Offer"
2. **Scrollable body** — request summary card, price row, description textarea, negotiable pills, photo upload grid
3. **Fixed footer** — "Send Offer" gradient button; disabled + spinner when `sending`

Photo upload: `<input type="file" accept="image/*">` hidden; clicking the "+" thumbnail triggers it.
Uploaded files are read via `FileReader` and stored as base64 data-URLs in `images` state (or
Supabase Storage URLs if upload is wired). Max 5; "+" button hidden when `images.length >= 5`.

On submit:
```js
const offer = await makeOffer({
  requestId: request.id,
  sellerId: currentUser.id,
  message: description,
  price: Number(price),
  negotiable,
  images,  // text[] of URLs / data-URLs
})
if (offer) onSubmitted(offer)
else setError('Failed to send offer. Try again.')
```

---

### OffersInbox

```
File:  components/OffersInbox.jsx
Props: { request, currentUser, onBack, onViewOffer(offer), onReservation(offer) }
```

Internal state: `offers` (array), `loading` (bool), `sortFilter` ('All'|'Lowest Price'|'Nearest'|'Newest').

Sorting is done client-side after fetch:
- **Lowest Price** — `[...offers].sort((a,b) => (a.price||0) - (b.price||0))`
- **Nearest** — `[...offers].sort((a,b) => distFn(a) - distFn(b))`
  where `distFn(o) = haversineKm(request.lat, request.lng, o.seller?.lat, o.seller?.lng)`
  (falls back to `Infinity` if coordinates missing)
- **Newest** — `[...offers].sort((a,b) => new Date(b.created_at) - new Date(a.created_at))`
- **All** — original fetch order

Realtime subscription:
```js
supabase.channel(`inbox-${request.id}`)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'offers',
      filter: `request_id=eq.${request.id}` },
    async payload => {
      const { data: seller } = await supabase.from('profiles')
        .select('id, full_name, username, avatar_url, verified, location, lat, lng, rating, response_rate, joined_at')
        .eq('id', payload.new.seller_id).single()
      setOffers(prev => [{ ...payload.new, seller }, ...prev])
    })
  .subscribe()
```

---

### OfferDetailsPage

```
File:  components/OfferDetailsPage.jsx
Props: { offer, request, currentUser, onBack, onAccepted(offer), onDeclined() }
```

Internal state: `showAcceptModal` (bool), `declining` (bool), `error` (string).

**Image gallery**: horizontal `overflow-x: auto` scroll strip. Active index tracked with `imgIndex`
state. Prev/next arrows update `imgIndex`. Counter `{imgIndex+1}/{offer.images.length}` top-right.
When `offer.images.length === 0`, shows `CAT_EMOJI[request.category] || '📦'` centred on `#141414` bg.

**Seller row**: `seller.joined_at` is converted to `new Date(seller.joined_at).getFullYear()` for
the "Member since YYYY" display. `seller.avg_rating` drives star rendering (filled/empty, 1 decimal).
`seller.response_rate` displayed as `{seller.response_rate}%`.

**Offer Details rows** — rendered as a list; each row only renders if value is non-null and non-empty:
```
Price           → formatUGX(offer.price)
Negotiable      → offer.negotiable ? 'Yes' : 'No'
Condition       → offer.condition
Storage         → offer.storage
Battery Health  → offer.battery_health
Includes        → offer.includes
```

**Decline flow**:
```js
setDeclining(true)
await updateOfferStatus(offer.id, 'rejected')
setDeclining(false)
onDeclined()
```

**Accept flow** → sets `showAcceptModal = true`.

---

### AcceptOfferModal

```
File:  components/AcceptOfferModal.jsx
Props: { offer, request, onConfirm, onCancel, loading, error }
```

The modal is purely presentational — its parent (`OfferDetailsPage`) owns the async call and
passes `loading` / `error` down as props. This keeps the modal stateless and easy to test.

Structure:
- Backdrop: `position:fixed; inset:0; background:rgba(0,0,0,0.8); backdropFilter:blur(8px); zIndex:10000`
- Card: `position:absolute; top:50%; left:50%; transform:translate(-50%,-50%)` white-bordered box
- Green circle checkmark, "Accept this offer?" heading
- Seller summary row (avatar + name + request title + `formatUGX(offer.price)`)
- "Accept & Continue" button (disabled + spinner when `loading`)
- "Cancel" text button

The parent wires `onConfirm`:
```js
const handleAccept = async () => {
  setAcceptLoading(true)
  const { error } = await updateOfferStatus(offer.id, 'accepted')
  setAcceptLoading(false)
  if (error) { setAcceptError(error.message); return }
  onAccepted(offer)  // → parent sets activePage='reservation'
}
```

---

## Data Models

### Database Migration (lib/requests-schema.sql additions)

```sql
-- Offers table: new detail columns
alter table offers
  add column if not exists negotiable      boolean default true,
  add column if not exists condition       text,
  add column if not exists storage         text,
  add column if not exists battery_health  text,
  add column if not exists includes        text;
-- Note: images text[] already exists; no change needed.
```

The `profiles` table already has `response_rate int default 0` and `joined_at timestamptz` from
`profile-schema.sql`. The migration runs idempotently via `add column if not exists`.

---

### Updated lib/requests.js

#### fetchOffers — updated seller select

```js
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
```

#### makeOffer — extended signature

```js
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
```

Note: return shape changes to `{ data } | { error }` to allow callers to distinguish success from failure.
`OffersSheet.MakeOfferForm` accesses `offer` via `result.data` (minor update needed there).

#### fetchRequestOfferAvatars — new helper

```js
export async function fetchRequestOfferAvatars(requestIds) {
  // Returns: { [requestId]: [{ seller_id, avatar_url, full_name, username }] }  (max 3 per request)
  if (!requestIds.length) return {}
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
      map[row.request_id].push({ seller_id: row.seller_id, ...row.seller })
    }
  }
  return map
}
```

`loadRequests()` in `RequestsPage` calls this after fetching requests and merges results:
```js
const avatarMap = await fetchRequestOfferAvatars(rows.map(r => r.id))
return rows.map(r => ({ ...r, _offerAvatars: avatarMap[r.id] || [] }))
```

#### fetchRequests — "My Requests" filter

```js
if (filter === 'My Requests' && currentUserId) {
  query = query.eq('buyer_id', currentUserId).neq('status', 'expired')
  // Remove the .eq('status','open') base filter for this branch to show fulfilled too
}
```

The My Requests filter removes the `status = 'open'` guard so buyers see both open and fulfilled
requests. An `activeTab` prop/state ('Active'|'Completed') is added to the My Requests view:
- Active → `status = 'open'`
- Completed → `status = 'fulfilled'`

---

### Reservation Page Data Bridge

When `AcceptOfferModal.onConfirm` fires, `RequestsPage` maps the accepted offer to `ReservationPage`
props before setting `activePage = 'reservation'`:

```js
const handleOfferAccepted = (offer) => {
  setSelectedOffer(offer)
  setActivePage('reservation')
}

// In render:
{activePage === 'reservation' && selectedOffer && (
  <ReservationPage
    post={{
      id:          selectedOffer.id,           // used as reference (no orders table post_id needed)
      title:       selectedRequest.title,
      description: selectedOffer.message,
      price:       selectedOffer.price,
      images:      selectedOffer.images || [],
      seller_id:   selectedOffer.seller_id,
    }}
    seller={selectedOffer.seller}
    currentUser={currentUser}
    onBack={() => setActivePage('offersInbox')}
    onConfirmed={() => {
      setActivePage(null)
      setSelectedRequest(null)
      setSelectedOffer(null)
      showToast('✅ Reservation confirmed!')
    }}
  />
)}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a
system — essentially, a formal statement about what the system should do. Properties serve as the
bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: fetchRequestOfferAvatars returns at most 3 avatars per request

*For any* set of requests where individual requests have N ≥ 0 offers, `fetchRequestOfferAvatars`
SHALL return an array of length `min(N, 3)` for each request, and every entry in the array SHALL
have a `seller_id` that matches a seller who submitted an offer on that request.

**Validates: Requirements 1.9, 2.2**

---

### Property 2: RequestCard avatar rendering matches avatar data

*For any* request enriched with `_offerAvatars` of length N (0 ≤ N ≤ 3), the rendered
`RequestCard` footer SHALL display exactly `min(N, 3)` avatar slots; each slot where
`avatar_url` is non-null SHALL render an `<img>` element, and each slot where `avatar_url`
is null SHALL render a colored initials circle — never a literal placeholder letter (A, B, C).

**Validates: Requirements 2.2, 2.3, 2.5**

---

### Property 3: My Requests filter excludes other users' requests

*For any* list of requests with mixed `buyer_id` values, applying the "My Requests" filter
(where `currentUserId = U`) SHALL produce a subset in which every request has `buyer_id === U`.
No request belonging to a different user SHALL appear in the result.

**Validates: Requirements 3.2**

---

### Property 4: Own request cards never show "Make Offer"

*For any* request where `request.buyer_id === currentUser.id`, the rendered `RequestCard`
SHALL NOT contain the text "Make Offer" or invoke the `onMakeOffer` action.

**Validates: Requirements 3.4**

---

### Property 5: Description counter always matches input length

*For any* string of length N (0 ≤ N ≤ 500) typed into the `SendOfferPage` description
textarea, the live counter SHALL display the string `"{N}/500"`.

**Validates: Requirements 4.5**

---

### Property 6: Photo count badge reflects images array length

*For any* images array of length N (0 ≤ N ≤ 5) in `SendOfferPage`, the upload section
badge SHALL display `"{N}/5"` and the "+" add button SHALL be visible if and only if N < 5.

**Validates: Requirements 4.7**

---

### Property 7: makeOffer called with all composed offer fields

*For any* valid combination of (price, description, negotiable, images) entered into
`SendOfferPage`, tapping "Send Offer" SHALL call `makeOffer` with params where
`message === description`, `price === Number(price)`, `negotiable === negotiable`,
and `images === images`. No field SHALL be silently dropped or transformed.

**Validates: Requirements 4.9**

---

### Property 8: OffersInbox header count matches loaded offers

*For any* list of offers of length N returned by `fetchOffers`, the `OffersInbox` header
subtitle SHALL display `"{N} offers received"`.

**Validates: Requirements 5.2**

---

### Property 9: OffersInbox sort correctness

*For any* list of offers with varied `price` values, applying "Lowest Price" sort SHALL produce
a list where `offers[i].price ≤ offers[i+1].price` for all i. Similarly, "Newest" sort SHALL
produce a list where `offers[i].created_at ≥ offers[i+1].created_at` for all i. "Nearest" sort
SHALL produce a list where `haversineKm(request, offers[i].seller) ≤ haversineKm(request, offers[i+1].seller)`
for all i where seller coordinates are defined.

**Validates: Requirements 5.4, 5.5, 5.6**

---

### Property 10: Offer card renders required fields

*For any* offer object with seller data, the rendered offer card in `OffersInbox` SHALL contain:
the seller's name, the price formatted as "UGX X,XXX,XXX", and — when `offer.negotiable === true`
— a "Negotiable" badge.

**Validates: Requirements 5.8**

---

### Property 11: OfferDetailsPage omits null detail rows

*For any* offer where a subset of {condition, storage, battery_health, includes} fields are
`null` or empty, the rendered "Offer Details" section SHALL contain exactly the rows whose
corresponding values are non-null and non-empty. No null field SHALL produce a rendered row.

**Validates: Requirements 6.5**

---

### Property 12: AcceptOfferModal displays correct offer summary

*For any* (offer, request) pair, the rendered `AcceptOfferModal` SHALL display the seller's name,
the request's title, and the offer price formatted via `formatUGX`. No field SHALL be omitted
when the corresponding data is present.

**Validates: Requirements 7.4**

---

### Property 13: Reservation post props map correctly from offer

*For any* (offer, request) pair where `offer.price`, `request.title`, `offer.message`, and
`offer.images` are defined, the `post` prop constructed and passed to `ReservationPage` SHALL
satisfy: `post.price === offer.price`, `post.title === request.title`,
`post.description === offer.message`, and `post.images[0] === offer.images[0]`.

**Validates: Requirements 8.1**

---

## Error Handling

### SendOfferPage
- `makeOffer` returns `{ error }` → set `error` state → display inline red error box below the
  "Send Offer" button; page stays open, user can retry.
- Image file read error → skip that image; show toast "Could not load image".
- Price field left blank → allowed (price is optional per schema); warn if zero but don't block.

### OffersInbox
- `fetchOffers` error → show empty state with "Failed to load offers. Tap to retry." retry button.
- Realtime subscription failure → silent degradation; list shows last known state.
- `haversineKm` with missing seller coordinates → fallback `distFn = Infinity`; those offers sort last.

### OfferDetailsPage
- `updateOfferStatus` error on Decline → show inline error; `onDeclined()` not called until success.
- Missing `seller.joined_at` → display "Member since —" rather than crash.
- Missing `seller.avg_rating` or `review_count` → hide stars row entirely.

### AcceptOfferModal
- `updateOfferStatus` error → `setAcceptError(msg)`; button re-enables; modal stays open.
- Loading state on "Accept & Continue" button: spinner + disabled, prevents double-submission.

### General
- All Supabase helpers log errors via `console.error` and return safe empty values (`null`, `[]`,
  `{}`) so that the UI always has a renderable state.
- All async button handlers guard against double-tap with a `loading` / `sending` flag.

---

## Testing Strategy

### Dual Testing Approach

Unit tests cover specific examples, edge cases, and error conditions. Property-based tests verify
universal properties across all inputs. Together they provide comprehensive coverage.

### Property-Based Testing Library

Use **[fast-check](https://github.com/dubzzz/fast-check)** (JavaScript / React ecosystem, runs in
Jest/Vitest, minimum 100 iterations per property).

Each property test is tagged with a comment referencing its design property:
```
// Feature: requests-offers-flow, Property N: <property text summary>
```

### Unit Tests (example-based)

Focus areas:
- **Navigation state transitions** — simulate each `activePage` state change, assert correct overlay
  is rendered.
- **Filter pills rendering** — "My Requests" is first; all five pills present.
- **RequestCard footer** — `offers_count=0` renders "No offers yet"; `offers_count>0` renders count.
- **SendOfferPage defaults** — negotiable="Yes" selected on mount; description counter starts "0/500".
- **AcceptOfferModal cancel** — `onCancel` called; `updateOfferStatus` not called.
- **OfferDetailsPage decline** — `updateOfferStatus('rejected')` called; `onDeclined()` called.
- **Reservation bridge** — `post` prop fields match offer/request fields exactly.

### Property-Based Tests (fast-check)

Each property from the Correctness Properties section maps to one `fc.assert(fc.property(...))` test:

| Property | Generator inputs | Assertion |
|---|---|---|
| P1: fetchRequestOfferAvatars ≤ 3 | array of request IDs, variable offer counts | `avatars.length <= 3` and all `seller_id` in offer set |
| P2: Avatar rendering | `_offerAvatars` array with mix of null/non-null `avatar_url` | `<img>` count matches non-null count; no A/B/C literals |
| P3: My Requests filter | mixed `buyer_id` request arrays | all returned `buyer_id === currentUserId` |
| P4: No Make Offer on own | own request objects | rendered output ∌ "Make Offer" |
| P5: Description counter | strings 0–500 chars | counter text === `${len}/500` |
| P6: Photo badge | arrays 0–5 items | badge === `${n}/5`; "+" visible iff n < 5 |
| P7: makeOffer params | (price, desc, negotiable, images) tuples | mock spy args === inputs |
| P8: Inbox header count | offers arrays of varying length N | subtitle === `${N} offers received` |
| P9: Sort correctness | offers with random prices / dates / coordinates | sorted invariants hold |
| P10: Offer card fields | offer+seller objects | name, UGX price, negotiable badge present |
| P11: Null detail rows | offers with random null/non-null subsets | only non-null rows rendered |
| P12: Modal offer summary | (offer, request) pairs | name + title + price in modal output |
| P13: Reservation prop mapping | (offer, request) pairs | post fields === offer/request fields |

### Integration Tests

- **Realtime subscription** — mock Supabase channel, fire INSERT event, assert offer appears in list.
- **fetchOffers seller shape** — call against Supabase test project; assert `seller.response_rate`
  and `seller.joined_at` are present in response.
- **Schema migration** — run migration SQL against test DB; assert new columns exist on `offers` table.
