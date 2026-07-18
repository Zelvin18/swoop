# Requirements Document

## Introduction

This feature redesigns and builds the complete Requests & Offers flow in the Swoop app (Next.js + Supabase). The flow enables buyers to post requests and review incoming offers, and enables sellers to browse requests and submit detailed offers. It replaces the existing bottom-sheet-based OffersSheet with a set of full-screen pages that match the intended design, while keeping the existing PostRequestModal and the general RequestsPage card layout unchanged.

The feature touches six distinct UI surfaces: the request card (offer count + real seller avatars), a "My Requests" navigation tab, a full-screen Send Offer page, a full-screen Offers Inbox, a full-screen Offer Details page, and an Accept Offer confirmation popup. It also includes the data-mapping bridge to the existing ReservationPage and the necessary database schema additions.

## Glossary

- **Buyer**: A logged-in user who has posted a request.
- **Seller**: A logged-in user who is not the owner of a given request and may submit an offer on it.
- **Request**: A record in the `requests` table representing a buyer's intent to purchase a specific item.
- **Offer**: A record in the `offers` table representing a seller's proposal to fulfil a request, including price, description, negotiability, condition metadata, and photos.
- **Request_Card**: The UI card component that renders a single request in the RequestsPage feed.
- **My_Requests_Tab**: A filter pill in the RequestsPage navigation that shows only the current user's own requests.
- **Send_Offer_Page**: A full-screen page (replacing the MakeOfferForm inside OffersSheet) where a seller fills in and submits an offer.
- **Offers_Inbox**: A full-screen page where the buyer sees all offers received on one of their requests.
- **Offer_Details_Page**: A full-screen page where the buyer reviews the full details of a single offer.
- **Accept_Offer_Modal**: A confirmation popup shown before an offer is accepted.
- **Reservation_Page**: The existing `ReservationPage` component that handles checkout after an offer is accepted.
- **Offer_Images**: Photos attached to an offer, stored as a `text[]` column on the `offers` table.
- **Negotiable**: A boolean flag on an offer indicating whether the seller's price is open to negotiation.
- **haversineKm**: The distance utility function exported from `lib/feed.js` used to compute km between two lat/lng coordinates.
- **formatUGX**: The currency formatting utility exported from `lib/feed.js`.
- **UGX**: Ugandan Shilling — the currency used throughout the app.
- **Avatar_Url**: The `avatar_url` column on the `profiles` table containing the URL of a user's profile photo.

---

## Requirements

### Requirement 1: Database Schema Additions

**User Story:** As a developer, I want the `offers` table to carry all offer-detail fields, so that sellers can express rich offer information and buyers can compare offers accurately.

#### Acceptance Criteria

1. THE Database SHALL add a `negotiable` boolean column with a default value of `true` to the `offers` table if it does not already exist.
2. THE Database SHALL add a `condition` text column to the `offers` table if it does not already exist.
3. THE Database SHALL add a `storage` text column to the `offers` table if it does not already exist.
4. THE Database SHALL add a `battery_health` text column to the `offers` table if it does not already exist.
5. THE Database SHALL add an `includes` text column to the `offers` table if it does not already exist.
6. THE Database SHALL retain the existing `images text[]` column on the `offers` table as the storage mechanism for offer photos (no separate `offer_images` table is needed).
7. THE Database SHALL add a `response_rate int default 0` column to the `profiles` table if it does not already exist (it is already defined in `profile-schema.sql` but the migration must be idempotent).
8. THE Database SHALL provide a query (via `fetchOffers` in `lib/requests.js`) that returns `seller:profiles!seller_id(id, full_name, username, avatar_url, verified, location, rating, response_rate, joined_at)` so that all seller display fields are available on the Offers_Inbox and Offer_Details_Page.
9. THE Database SHALL provide a Supabase query that returns the first 3 distinct `seller.avatar_url` values per `request_id` from the `offers` table, so that the Request_Card can display real seller avatars.

---

### Requirement 2: Request Card — Offer Count and Seller Avatars

**User Story:** As a buyer or visitor browsing requests, I want each request card to show how many offers exist and preview the real profile photos of sellers who have offered, so that I can quickly gauge interest without opening the full offer list.

#### Acceptance Criteria

1. WHEN a request has one or more offers, THE Request_Card SHALL display the total offer count (e.g. "32 offers") in the footer area.
2. WHEN a request has one or more offers, THE Request_Card SHALL display up to 3 overlapping circular avatars in the footer, sourced from the `avatar_url` of the sellers who submitted those offers.
3. WHEN a seller's `avatar_url` is null or empty, THE Request_Card SHALL render that avatar slot as a colored circle containing the seller's initials, using the same `avatarColor` / `initials` helpers already present in the component.
4. WHEN a request has no offers, THE Request_Card SHALL display the text "No offers yet" in the footer area instead of avatars and a count.
5. THE Request_Card SHALL never display placeholder letter-avatars (A, B, C) for offer-count avatar slots when real `avatar_url` data is available.

---

### Requirement 3: My Requests Tab

**User Story:** As a buyer, I want a dedicated "My Requests" tab in the RequestsPage navigation, so that I can quickly view and manage only the requests I have posted without scrolling through all requests.

#### Acceptance Criteria

1. THE RequestsPage SHALL render "My Requests" as the first filter pill in the navigation row, positioned before "All Requests", "Near You", "Following", and "Categories".
2. WHEN the "My Requests" pill is selected, THE RequestsPage SHALL display only the requests whose `buyer_id` equals the current logged-in user's id.
3. WHEN "My Requests" is selected and the current user has no requests, THE RequestsPage SHALL display an empty state prompting the user to post their first request.
4. WHEN "My Requests" is selected, THE Request_Card footer SHALL display "View Offers" (with offer count) if the request has at least one offer, or "Awaiting offers" if the request has no offers — the "Make Offer" button SHALL NOT appear for the owner's own requests regardless of the active tab.
5. WHEN "My Requests" is selected, THE RequestsPage SHALL show an "Active" / "Completed" tab row at the top of the card list, with "Active" as the default selection, so that buyers can filter between open and fulfilled requests.

---

### Requirement 4: Send Offer Page (Seller Flow)

**User Story:** As a seller, I want a full-screen page to compose and submit my offer with price, description, negotiability, condition details, and photos, so that I can present a complete and compelling proposal to the buyer.

#### Acceptance Criteria

1. WHEN a non-owner taps "Make Offer" on a Request_Card, THE App SHALL navigate to the Send_Offer_Page as a full-screen overlay (not a bottom sheet).
2. THE Send_Offer_Page SHALL display a header with a back-arrow button and the title "Send Offer".
3. THE Send_Offer_Page SHALL display a "You are offering for:" section showing the request's thumbnail image (or category emoji fallback), the request title, the buyer's name, and the time elapsed since the request was posted.
4. THE Send_Offer_Page SHALL display a price field consisting of a non-editable "UGX" currency label and a numeric text input.
5. THE Send_Offer_Page SHALL display a description textarea with a live character counter showing the format "X/500".
6. THE Send_Offer_Page SHALL display a negotiable toggle with two buttons labeled "Yes, negotiable" and "No, not negotiable"; "Yes, negotiable" SHALL be selected by default and SHALL be visually highlighted in the active (pink/red) state.
7. THE Send_Offer_Page SHALL display an "Upload Photos" section that allows up to 5 images to be attached; the section SHALL show existing thumbnails in a grid with an "add" button, and SHALL display the current count in the format "N/5".
8. THE Send_Offer_Page SHALL display a full-width "Send Offer" button styled with the pink gradient (`linear-gradient(135deg,#FF3366,#FF6633)`).
9. WHEN the seller taps "Send Offer", THE Send_Offer_Page SHALL call `makeOffer` with `{ requestId, sellerId, message: description, price, negotiable, images }` and close the page on success.
10. IF `makeOffer` returns an error, THEN THE Send_Offer_Page SHALL display an inline error message without navigating away.
11. WHEN the seller taps the back-arrow, THE Send_Offer_Page SHALL close and return to the RequestsPage without submitting the offer.

---

### Requirement 5: Offers Inbox (Buyer View)

**User Story:** As a buyer, I want a full-screen Offers Inbox that lists all offers on one of my requests with filtering options, so that I can review, compare, and act on incoming offers efficiently.

#### Acceptance Criteria

1. WHEN a buyer taps "View Offers" on one of their own Request_Cards, THE App SHALL navigate to the Offers_Inbox as a full-screen page.
2. THE Offers_Inbox SHALL display a header with a back-arrow button, the title "Offers", and a subtitle showing "{N} offers received".
3. THE Offers_Inbox SHALL display a horizontal filter row with the options "All", "Lowest Price", "Nearest", and "Newest".
4. WHEN "Lowest Price" is selected, THE Offers_Inbox SHALL sort the offer list by `offer.price` ascending.
5. WHEN "Nearest" is selected, THE Offers_Inbox SHALL sort the offer list by distance from the request's `lat`/`lng` to the seller's `location` coordinates ascending, using `haversineKm`.
6. WHEN "Newest" is selected, THE Offers_Inbox SHALL sort the offer list by `offer.created_at` descending.
7. WHEN "All" is selected, THE Offers_Inbox SHALL display offers in the default order returned by `fetchOffers` (creation date descending).
8. THE Offers_Inbox SHALL render each offer as a card containing: the seller's real `avatar_url` (with initials-color fallback), the seller's name, the seller's distance from the request location, a verified badge if `seller.verified` is true, the offer price formatted as "UGX X,XXX,XXX" in bold red/pink, a short description snippet, the first offer photo as a right-side thumbnail (if images exist), a "Negotiable" green badge if `offer.negotiable` is true, and a "View Offer" button.
9. WHEN a new offer is inserted into the `offers` table for the open request, THE Offers_Inbox SHALL update the list in real time via a Supabase Realtime subscription without requiring a page refresh.
10. WHEN the buyer taps "View Offer" on an offer card, THE App SHALL navigate to the Offer_Details_Page for that offer.
11. WHEN the buyer taps the back-arrow, THE Offers_Inbox SHALL close and return to the RequestsPage.

---

### Requirement 6: Offer Details Page (Buyer View)

**User Story:** As a buyer, I want a full-screen Offer Details page showing the seller's complete offer including photos, profile, pricing, condition metadata, and action buttons, so that I can make an informed accept-or-decline decision.

#### Acceptance Criteria

1. WHEN the buyer taps "View Offer" in the Offers_Inbox, THE App SHALL navigate to the Offer_Details_Page as a full-screen page.
2. THE Offer_Details_Page SHALL display the offer's images in a gallery at the top of the page; WHEN multiple images exist, the gallery SHALL show a count indicator in the format "1/N".
3. WHEN the offer has no images, THE Offer_Details_Page SHALL display a placeholder using the request's category emoji or a default icon.
4. THE Offer_Details_Page SHALL display a seller profile row containing: the seller's real `avatar_url` (with initials fallback), the seller's name, "Member since [year]" derived from `seller.joined_at`, the seller's star rating and review count, the seller's `response_rate` as a percentage, a "Follow" button, and a "Message" button.
5. THE Offer_Details_Page SHALL display an "Offer Details" section with labeled rows for: Price (`offer.price` formatted as UGX), Negotiable ("Yes" or "No" derived from `offer.negotiable`), Condition (`offer.condition`), Storage (`offer.storage`), Battery Health (`offer.battery_health`), and Includes (`offer.includes`); rows whose values are null or empty SHALL be omitted.
6. THE Offer_Details_Page SHALL display an "Accept Offer" button styled with the pink gradient and a "Decline Offer" button styled as an outlined button.
7. THE Offer_Details_Page SHALL display a three-dots menu icon in the top-right corner of the header.
8. WHEN the buyer taps "Accept Offer", THE Offer_Details_Page SHALL open the Accept_Offer_Modal.
9. WHEN the buyer taps "Decline Offer", THE Offer_Details_Page SHALL call `updateOfferStatus(offerId, 'rejected')` and navigate back to the Offers_Inbox.
10. WHEN the buyer taps the back-arrow, THE Offer_Details_Page SHALL navigate back to the Offers_Inbox.

---

### Requirement 7: Accept Offer Confirmation Modal

**User Story:** As a buyer, I want a confirmation popup before accepting an offer, so that I can review the key details one more time and avoid accidental acceptances.

#### Acceptance Criteria

1. WHEN the buyer taps "Accept Offer" on the Offer_Details_Page, THE Accept_Offer_Modal SHALL appear as an overlay on top of the Offer_Details_Page.
2. THE Accept_Offer_Modal SHALL display a green checkmark icon inside a green circle.
3. THE Accept_Offer_Modal SHALL display the text "Accept this offer?".
4. THE Accept_Offer_Modal SHALL display the seller's avatar, the seller's name, the request title, and the offer price.
5. THE Accept_Offer_Modal SHALL display an "Accept & Continue" button styled in pink and a "Cancel" text link.
6. WHEN the buyer taps "Accept & Continue", THE Accept_Offer_Modal SHALL call `updateOfferStatus(offerId, 'accepted')` and then navigate to the Reservation_Page.
7. WHEN the buyer taps "Cancel", THE Accept_Offer_Modal SHALL close and return the buyer to the Offer_Details_Page without modifying the offer status.
8. IF `updateOfferStatus` returns an error, THEN THE Accept_Offer_Modal SHALL display an inline error message and remain open.

---

### Requirement 8: Reservation Page Data Bridge

**User Story:** As a buyer, I want the Reservation Page to be pre-populated with data from the accepted offer, so that the checkout experience is coherent and reflects what the seller proposed.

#### Acceptance Criteria

1. WHEN the buyer confirms acceptance of an offer, THE App SHALL navigate to the Reservation_Page and pass a `post` prop constructed by mapping offer fields as follows: `post.price` ← `offer.price`, `post.title` ← `request.title`, `post.description` ← `offer.message`, `post.images[0]` ← `offer.images[0]` (if present).
2. WHEN the buyer confirms acceptance of an offer, THE App SHALL pass a `seller` prop to the Reservation_Page constructed from `offer.seller` (the seller's profile record joined on the offer).
3. WHEN the buyer confirms acceptance of an offer, THE App SHALL pass the `currentUser` prop to the Reservation_Page unchanged from the current session.
4. WHEN the buyer confirms acceptance of an offer, THE App SHALL pass an `onBack` callback to the Reservation_Page that navigates back to the Offers_Inbox.
5. WHEN the buyer confirms acceptance of an offer, THE App SHALL pass an `onConfirmed` callback to the Reservation_Page that closes the full Requests & Offers flow and shows a toast notification confirming the reservation.

---

### Requirement 9: Visual Design Consistency

**User Story:** As a user, I want all new pages and components to match the existing dark theme and design language of the Swoop app, so that the experience feels cohesive.

#### Acceptance Criteria

1. THE Send_Offer_Page, Offers_Inbox, Offer_Details_Page, and Accept_Offer_Modal SHALL use a black (`#000`) page background, `#141414` card backgrounds, `#FF3366` as the primary accent color, and white (`#fff`) as the primary text color.
2. THE Send_Offer_Page, Offers_Inbox, Offer_Details_Page, and Accept_Offer_Modal SHALL use inline styles (no Tailwind CSS), consistent with the existing component files in the project.
3. THE Send_Offer_Page, Offers_Inbox, Offer_Details_Page, and Accept_Offer_Modal SHALL use FontAwesome icon classes (`fas fa-*`) for all icons, consistent with existing components.
4. THE Send_Offer_Page, Offers_Inbox, Offer_Details_Page, and Accept_Offer_Modal SHALL use the `'Inter', sans-serif` font family set via `fontFamily` inline style, consistent with existing components.
5. WHEN an avatar image is available (`avatar_url` is non-null and non-empty), THE component SHALL render the image via an `<img>` tag with `objectFit: 'cover'`; THE component SHALL NOT render letter-initials when a real photo is available.
