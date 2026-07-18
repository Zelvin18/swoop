# Implementation Plan: Requests & Offers Flow

## Overview

Implement the complete requests-and-offers lifecycle: DB schema additions, enriched data helpers, full-screen SendOfferPage / OffersInbox / OfferDetailsPage / AcceptOfferModal components, and all wiring inside RequestsPage — all in JavaScript/JSX with inline styles, FontAwesome icons, and the Inter font, matching the existing component conventions.

## Tasks

- [x] 1. Database migration — add new columns to offers table
  - Create `lib/requests-offers-migration.sql` with idempotent `ALTER TABLE` statements
  - Add `negotiable boolean default true`, `condition text`, `storage text`, `battery_health text`, `includes text` columns to `offers` using `ADD COLUMN IF NOT EXISTS`
  - Include a comment noting `images text[]` already exists and requires no change
  - Include an idempotent guard for `profiles.response_rate int default 0` (already in profile-schema.sql)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 2. Update `lib/requests.js` — data layer changes
  - [x] 2.1 Extend `fetchOffers` to include full seller fields
    - Update the `.select()` string to include `lat, lng, avg_rating, review_count, response_rate, joined_at` in the seller sub-select
    - _Requirements: 1.8_

  - [x] 2.2 Extend `makeOffer` signature and return shape
    - Add `negotiable = true` and `images = []` parameters to the destructured argument
    - Pass `negotiable` and `images` into the `.insert()` payload
    - Change return value from `data` to `{ data }` on success and `{ error }` on failure (matching design spec)
    - _Requirements: 4.9_

  - [x] 2.3 Update `OffersSheet.MakeOfferForm` to handle new `makeOffer` return shape
    - In `OffersSheet.jsx`, update the `handleSubmit` call: replace `if (offer)` with `if (result?.data)` and access seller via `result.data`
    - _Requirements: 4.9 (implementation note)_

  - [x] 2.4 Add `fetchRequestOfferAvatars` helper
    - Export a new `fetchRequestOfferAvatars(requestIds)` function
    - Query `offers` table selecting `request_id, seller_id, seller:profiles!seller_id(avatar_url, full_name, username)`
    - Build and return a map `{ [requestId]: [{ seller_id, avatar_url, full_name, username }] }` capped at 3 entries per request
    - Return `{}` safely on error
    - _Requirements: 1.9, 2.2_

  - [ ]* 2.5 Write property test for `fetchRequestOfferAvatars` ≤ 3 avatars
    - **Property 1: fetchRequestOfferAvatars returns at most 3 avatars per request**
    - **Validates: Requirements 1.9, 2.2**

  - [x] 2.6 Update `fetchRequests` to support "My Requests" filter
    - Add a branch for `filter === 'My Requests'` that queries `buyer_id = currentUserId` without the `status = 'open'` constraint (so fulfilled requests are also returned)
    - _Requirements: 3.2_

  - [ ]* 2.7 Write property test for My Requests filter exclusivity
    - **Property 3: My Requests filter excludes other users' requests**
    - **Validates: Requirements 3.2**

- [x] 3. Update `RequestsPage.jsx` — state machine and card enrichment
  - [x] 3.1 Add navigation state machine and update FILTERS constant
    - Add `activePage` state (`null | 'sendOffer' | 'offersInbox' | 'offerDetails' | 'reservation'`)
    - Add `selectedOffer` state (alongside the existing `selectedRequest`)
    - Update `FILTERS` constant to `['My Requests', 'All Requests', 'Near You', 'Following', 'Categories']`
    - _Requirements: 3.1_

  - [x] 3.2 Enrich request cards with real offer avatars via `fetchRequestOfferAvatars`
    - Import `fetchRequestOfferAvatars` from `lib/requests.js`
    - After the `fetchRequests` call in `loadRequests`, call `fetchRequestOfferAvatars` with the returned request IDs
    - Merge results onto each request as `_offerAvatars: avatarMap[r.id] || []`
    - _Requirements: 2.2, 2.3, 2.5_

  - [ ] 3.3 Update `RequestCard` footer to render real seller avatars
    - Replace the `{String.fromCharCode(65+i)}` placeholder letters with a loop over `r._offerAvatars`
    - Render `<img>` when `avatar_url` is set; render a colored initials circle using `avatarColor` / `initials` helpers when `avatar_url` is null
    - _Requirements: 2.2, 2.3, 2.5_

  - [ ]* 3.4 Write property test for RequestCard avatar rendering
    - **Property 2: RequestCard avatar rendering matches avatar data**
    - **Validates: Requirements 2.2, 2.3, 2.5**

  - [ ]* 3.5 Write property test: own request cards never show "Make Offer"
    - **Property 4: Own request cards never show "Make Offer"**
    - **Validates: Requirements 3.4**

  - [x] 3.6 Wire "Make Offer" and "View Offers" buttons to new state machine
    - Change `onMakeOffer` handler: set `activePage = 'sendOffer'` and `selectedRequest = r`
    - Change `onViewOffers` handler: set `activePage = 'offersInbox'` and `selectedRequest = r`
    - Remove the `OffersSheet` render (or guard it as `null`) — the sheet is bypassed, not deleted
    - _Requirements: 4.1, 5.1_

  - [ ] 3.7 Add "My Requests" Active/Completed sub-tab row
    - Add `myRequestsTab` state (`'Active' | 'Completed'`) defaulting to `'Active'`
    - When `filter === 'My Requests'`, render an Active/Completed tab row above the card list
    - Pass `status` sub-filter (`'open'` for Active, `'fulfilled'` for Completed) into `loadRequests` / `fetchRequests`
    - _Requirements: 3.3, 3.5_

  - [ ] 3.8 Render all new full-screen page overlays conditionally
    - Render `<SendOfferPage>` when `activePage === 'sendOffer'`
    - Render `<OffersInbox>` when `activePage === 'offersInbox'`
    - Render `<OfferDetailsPage>` when `activePage === 'offerDetails'`
    - Render `<ReservationPage>` (with offer data bridge props) when `activePage === 'reservation'`
    - Wire all `onBack`, `onSubmitted`, `onViewOffer`, `onAccepted`, `onDeclined`, `onConfirmed` callbacks per the state machine in the design doc
    - _Requirements: 4.1, 5.1, 6.1, 7.1, 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 4. Checkpoint — lib and RequestsPage wiring
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Create `components/SendOfferPage.jsx`
  - [ ] 5.1 Scaffold fixed-layout shell with header, scrollable body, fixed footer
    - Use `position:fixed; inset:0; zIndex:9999; background:#000; display:flex; flexDirection:column`
    - Header: back arrow (`onClose`) + "Send Offer" title
    - Footer: full-width pink gradient "Send Offer" button
    - _Requirements: 4.1, 4.2, 4.8, 9.1, 9.2, 9.3, 9.4_

  - [ ] 5.2 Add "You are offering for" request summary card
    - Show request thumbnail (`images[0]` or `CAT_EMOJI[category]` fallback), request title, buyer name, and `_timeAgo`
    - _Requirements: 4.3_

  - [ ] 5.3 Implement price field and description textarea with live counter
    - Price row: non-editable "UGX" label + numeric input bound to `price` state
    - Description textarea: bound to `description` state, `maxLength={500}`, show `{description.length}/500` counter
    - _Requirements: 4.4, 4.5_

  - [ ]* 5.4 Write property test for description counter
    - **Property 5: Description counter always matches input length**
    - **Validates: Requirements 4.5**

  - [ ] 5.5 Implement negotiable toggle buttons
    - Two buttons: "Yes, negotiable" and "No, not negotiable"; `negotiable` state defaults to `true`
    - Active button has pink/red highlight; inactive is muted
    - _Requirements: 4.6_

  - [ ] 5.6 Implement photo upload grid (up to 5 images via FileReader)
    - Hidden `<input type="file" accept="image/*">` triggered by "+" thumbnail button
    - Use `FileReader` to convert each file to a base64 data-URL and push to `images` state
    - Display existing images as thumbnails in a grid; hide "+" when `images.length >= 5`
    - Show `{images.length}/5` count badge
    - _Requirements: 4.7_

  - [ ]* 5.7 Write property test for photo count badge
    - **Property 6: Photo count badge reflects images array length**
    - **Validates: Requirements 4.7**

  - [ ] 5.8 Wire submit button to `makeOffer` and handle success/error
    - On tap: set `sending = true`, call `makeOffer({ requestId, sellerId, message, price, negotiable, images })`
    - On `{ data }`: call `onSubmitted(data)` and close
    - On `{ error }`: set `error` state; display inline red error box; page stays open
    - Disable button and show spinner while `sending`
    - _Requirements: 4.9, 4.10, 4.11_

  - [ ]* 5.9 Write property test for makeOffer called with all composed fields
    - **Property 7: makeOffer called with all composed offer fields**
    - **Validates: Requirements 4.9**

- [ ] 6. Create `components/OffersInbox.jsx`
  - [ ] 6.1 Scaffold fixed-layout shell with header, filter row, scrollable offer list
    - Full-screen overlay matching `position:fixed; inset:0; zIndex:9999` pattern
    - Header: back arrow (`onBack`) + title "Offers" + subtitle "{N} offers received"
    - Horizontal filter pills: "All", "Lowest Price", "Nearest", "Newest"
    - _Requirements: 5.2, 5.3, 9.1, 9.2_

  - [ ]* 6.2 Write property test for inbox header count
    - **Property 8: OffersInbox header count matches loaded offers**
    - **Validates: Requirements 5.2**

  - [ ] 6.3 Implement client-side sort logic for all filter options
    - "Lowest Price": sort by `offer.price` ascending
    - "Newest": sort by `offer.created_at` descending
    - "Nearest": sort using `haversineKm(request.lat, request.lng, seller.lat, seller.lng)` (fallback `Infinity` if coordinates missing)
    - "All": original fetch order
    - _Requirements: 5.4, 5.5, 5.6, 5.7_

  - [ ]* 6.4 Write property test for sort correctness
    - **Property 9: OffersInbox sort correctness**
    - **Validates: Requirements 5.4, 5.5, 5.6**

  - [ ] 6.5 Implement offer card rendering with all required fields
    - Seller avatar (`<img>` if `avatar_url` set, initials circle fallback), seller name, distance label, verified badge
    - Price formatted as "UGX X,XXX,XXX" in bold red/pink
    - Short description snippet, first offer photo as right-side thumbnail (if `images.length > 0`)
    - "Negotiable" green badge when `offer.negotiable === true`
    - "View Offer" button
    - _Requirements: 5.8, 9.5_

  - [ ]* 6.6 Write property test for offer card required fields
    - **Property 10: Offer card renders required fields**
    - **Validates: Requirements 5.8**

  - [ ] 6.7 Add Supabase Realtime subscription for new offers
    - Subscribe to `postgres_changes` INSERT on `offers` table filtered by `request_id=eq.{request.id}`
    - On new row: fetch the seller profile and prepend `{ ...payload.new, seller }` to the `offers` state
    - Unsubscribe on component unmount
    - _Requirements: 5.9_

- [ ] 7. Checkpoint — SendOfferPage and OffersInbox
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Create `components/OfferDetailsPage.jsx`
  - [ ] 8.1 Scaffold fixed-layout shell with header (back arrow + three-dots menu), scrollable body, fixed action footer
    - Full-screen overlay (`position:fixed; inset:0; zIndex:9999`)
    - Header: back arrow navigating to Offers Inbox, three-dots icon top-right
    - Footer: "Accept Offer" pink gradient button + "Decline Offer" outlined button
    - _Requirements: 6.1, 6.6, 6.7, 9.1, 9.2_

  - [ ] 8.2 Implement image gallery with index counter
    - Horizontal `overflow-x: auto` scroll strip showing `offer.images`
    - Track `imgIndex` state; show `{imgIndex+1}/{offer.images.length}` counter top-right
    - When `offer.images.length === 0`, show `CAT_EMOJI[request.category] || '📦'` placeholder on `#141414` background
    - _Requirements: 6.2, 6.3_

  - [ ] 8.3 Implement seller profile row
    - Seller avatar (`<img>` if `avatar_url`, initials circle otherwise), seller name
    - "Member since {year}" from `new Date(seller.joined_at).getFullYear()` (show "—" if missing)
    - Star rating from `seller.avg_rating` and `seller.review_count` (hide row if both are null/0)
    - Response rate: `{seller.response_rate}%`
    - "Follow" button and "Message" button
    - _Requirements: 6.4, 9.5_

  - [ ] 8.4 Implement Offer Details section with conditional rows
    - Render a labeled row for each of: Price, Negotiable, Condition, Storage, Battery Health, Includes
    - Omit any row whose value is `null` or empty string
    - Format price with `formatUGX`; render Negotiable as "Yes" / "No"
    - _Requirements: 6.5_

  - [ ]* 8.5 Write property test for null detail rows being omitted
    - **Property 11: OfferDetailsPage omits null detail rows**
    - **Validates: Requirements 6.5**

  - [ ] 8.6 Wire Accept and Decline action buttons
    - "Decline Offer": set `declining = true`, call `updateOfferStatus(offer.id, 'rejected')`, then call `onDeclined()` on success; show inline error if it fails
    - "Accept Offer": set `showAcceptModal = true`; render `<AcceptOfferModal>` as overlay when true
    - Wire `AcceptOfferModal.onConfirm`: call `updateOfferStatus(offer.id, 'accepted')`, on success call `onAccepted(offer)`; pass `loading` and `error` as props
    - _Requirements: 6.8, 6.9, 6.10_

- [ ] 9. Create `components/AcceptOfferModal.jsx`
  - [ ] 9.1 Build stateless modal overlay with backdrop and card
    - Backdrop: `position:fixed; inset:0; background:rgba(0,0,0,0.8); backdropFilter:blur(8px); zIndex:10000`
    - Centered card: green checkmark icon in green circle, "Accept this offer?" heading
    - _Requirements: 7.1, 7.2, 7.3, 9.1_

  - [ ] 9.2 Render offer summary row and action buttons
    - Seller avatar + name, request title, offer price via `formatUGX`
    - "Accept & Continue" pink button (disabled + spinner when `loading` prop is true)
    - "Cancel" text link calling `onCancel`
    - Inline error display when `error` prop is non-empty
    - _Requirements: 7.4, 7.5, 7.6, 7.7, 7.8_

  - [ ]* 9.3 Write property test for modal displaying correct offer summary
    - **Property 12: AcceptOfferModal displays correct offer summary**
    - **Validates: Requirements 7.4**

- [ ] 10. Checkpoint — OfferDetailsPage and AcceptOfferModal
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Reservation Page data bridge and final integration
  - [ ] 11.1 Implement `handleOfferAccepted` in `RequestsPage` and map props for `ReservationPage`
    - Construct `post` prop: `{ id: offer.id, title: request.title, description: offer.message, price: offer.price, images: offer.images || [], seller_id: offer.seller_id }`
    - Pass `seller={offer.seller}`, `currentUser`, `onBack` → `setActivePage('offersInbox')`, `onConfirmed` → reset state + `showToast`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 11.2 Write property test for reservation post prop mapping
    - **Property 13: Reservation post props map correctly from offer**
    - **Validates: Requirements 8.1**

- [ ] 12. Final checkpoint — full flow integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- All new components use `position:fixed; inset:0; zIndex:9999; background:#000` — matching `ReservationPage`
- `OffersSheet` is bypassed (not deleted) when `activePage` state drives the new overlays; it can be removed in a later clean-up PR
- Property-based tests use **fast-check** running in Jest/Vitest; each test should run at minimum 100 iterations
- `makeOffer` return shape changes to `{ data } | { error }` — task 2.3 handles the OffersSheet callsite update
- Photo upload uses `FileReader` → base64 data-URLs stored in component state (no Supabase Storage wiring required in this phase)
- `haversineKm` and `formatUGX` are imported from `lib/feed.js`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "2.2"] },
    { "id": 1, "tasks": ["2.3", "2.4", "2.6", "3.1"] },
    { "id": 2, "tasks": ["2.5", "2.7", "3.2", "3.6"] },
    { "id": 3, "tasks": ["3.3", "3.7", "5.1", "6.1"] },
    { "id": 4, "tasks": ["3.4", "3.5", "5.2", "5.3", "5.5", "5.6", "6.3", "6.5", "6.7", "8.1"] },
    { "id": 5, "tasks": ["5.4", "5.7", "5.8", "6.2", "6.4", "6.6", "8.2", "8.3", "8.4"] },
    { "id": 6, "tasks": ["5.9", "6.8", "8.5", "8.6", "9.1"] },
    { "id": 7, "tasks": ["3.8", "9.2"] },
    { "id": 8, "tasks": ["9.3", "11.1"] },
    { "id": 9, "tasks": ["11.2"] }
  ]
}
```
