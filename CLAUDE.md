# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Ŕose Atelier: a luxury women's footwear store for the Pakistani market (prices stored in PKR). Next.js 16.4 App Router + React 19.3, Tailwind v4, MongoDB, JWT auth, UploadThing.

**Read `AGENTS.md` first:** this Next.js version differs from training data. Check `node_modules/next/dist/docs/` before using any Next API. Examples: `middleware` is now `src/proxy.ts`, `error.tsx` receives `retry` (not `reset`), and route props use the global `PageProps<"/route">` / `LayoutProps` types.

**`DESIGN.md` is the design system:** brand voice, tokens, component recipes and the checklist for new screens. Read it before UI work. Keep this file for how the code works, and that one for how it looks.

## Commands

```bash
npm run dev            # dev server (writes the AGENTS.md block; don't fight it)
npm run build          # production build. Connects to the REAL MongoDB in .env (see below)
npm start              # serve the build
npm run lint           # eslint (one pre-existing font-display warning in app/layout.tsx is expected)
npx tsc --noEmit -p .  # type-check
npx next typegen       # regenerate route types after adding/moving routes (else PageProps<"/x"> errors)
```

There is no test suite. Verification so far has been ad-hoc end-to-end scripts run against a throwaway database (see "Testing against another database").

`.env` needs `MONGODB_URI`, `JWT_SECRET` (≥32 chars) and `UPLOADTHING_TOKEN`. Never print the URI: it contains credentials.

Email is optional. Setting `SMTP_HOST`, `SMTP_PORT` (default 587), `SMTP_USER`, `SMTP_PASS` and `MAIL_FROM` switches it on, plus `SITE_URL` for links in emails. Without them, `lib/server/mail.ts` skips every send: order emails, password-reset emails and back-in-stock alerts. Admins then use the WhatsApp buttons, and the "Reset link" button on `/admin/users`.

## Architecture

### Rendering & caching (Cache Components is on)
`next.config.ts` enables `cacheComponents`, `partialPrefetching` and `reactCompiler`. Consequences you will hit:
- Anything reading `cookies()`, `searchParams`, `usePathname()` or the session must sit inside `<Suspense>`, or the build fails. The pattern used throughout is a small async component inside Suspense (e.g. `CheckoutForUser`, `ReviewComposer`, `SignedInAs`, `CartSync`).
- Prerendered code must not read the current time (`Date.now()` / `new Date()`). That's why review dates are absolute.
- **Every admin page wraps its content in its own `<Suspense>`** (`XContent` plus a default-export wrapper). `requireAdmin()` verifies the JWT with async crypto, and the admin layout's Suspense doesn't count for navigations: without it, dev logs "uncached data … outside of `<Suspense>`" and navigations aren't instant. `loading.tsx` did not fix it.
- Code that reads the time after cookies (coupon dates, the dashboard) awaits `io()` from `next/cache` first. Use `io()`, not `connection()`, which blocks prefetching.
- A button with a function `formAction` can't carry `name`/`value`, because React drops them. Bind the value instead: `formAction={action.bind(null, "hidden")}`.
- Storefront data is read through `'use cache'` functions with tags: `products` (`lib/server/products.ts`), `reviews` / `reviews:<slug>` (`lib/server/reviews.ts`), `sales` (`lib/server/sales.ts`), and `settings` (`lib/server/settings.ts`). Any server action that changes that data must call `updateTag(...)` with the matching tag. Admin order actions that only re-render the current page use `refresh()`.
- `npm run build` executes these cached reads, so it hits MongoDB. The one-time seed (`meta: products-seed`, from the static data in `lib/data.ts` / `collection-data.ts`) and migrations (`meta: gallery-v1`) run at build time against the real DB.

### Route groups
- `src/app/(shop)/`: the storefront. Its layout renders `Header`, `Footer` and `ActionToast`.
- `src/app/admin/`: the admin panel. Its own layout uses deliberately plain styling (`admin.css`, system font). Do not use brand tokens there.
  - The overview reads `getDashboard(range)` from `lib/server/dashboard.ts`. It is uncached, and its days are Pakistan calendar days (Asia/Karachi), comparing the current period with the one before.
  - `/admin/users` and `/admin/products` read per-row figures from `lib/server/insights.ts`: orders, spend, bag and wishlist counts per user, and sold, revenue, rating, wishlists and restock requests per listing. They filter, sort and page in memory with `components/admin/Pager.tsx` (`?page=`, `?per=25|50|100`).
  - `/admin/users/[id]` shows one customer: profile, saved address, orders, live bag and wishlist, reviews and restock requests. `/admin/products/[id]/insights` shows one listing's performance; `ListingTabs` switches between it and the edit form.
  - `/admin/orders/[id]/slip` is the printable order slip for receipt printers (80 or 58 mm, `?w=58`; `?print=1` opens the print dialog, used by "Print slip" on the order page). Print CSS takes the admin chrome out of the layout, since merely hiding it makes Chrome shrink the slip, and `PrintButton` sizes `@page` to the slip's measured height.
  - Live orders: `GET /api/admin/orders/stream` is a Server-Sent Events stream (admin only), not a WebSocket, because Next route handlers can't upgrade connections without a custom server. `lib/server/order-events.ts` keeps one MongoDB change stream per server process for all tabs, and falls back to polling `updatedAt` every 5 s when the database has no replica set. `components/admin/LiveOrders.tsx` (admin top bar) shows a popup, a chime and a `(n)` tab-title count for `new` orders, and calls `router.refresh()` on order pages for `new`/`change`. Order writes must keep setting `updatedAt` for the polling fallback.
  - `setUserRole` returns to the page in its `back` field, but only to `/admin/users` or `/admin/users/<id>`.
  - Charts are client SVG components in `components/admin/charts/`. They take a serialisable `unit` prop (`"pkr"` or `"count"`), not a formatter function, because server pages render them.
- `src/app/layout.tsx` (root): fonts only, plus `DialogHost` and `CartSync` (both app-wide).
- `src/app/not-found.tsx` is a standalone page (no header or footer): the brand name and two links back. A `notFound()` inside the shop (e.g. a missing product) still renders within the shop layout, so `globals.css` hides `.shop-chrome` (header, footer) while `#not-found` is on the page. `src/app/api/` holds `cart`, `session` and `admin/images`.

### Auth (`src/lib/auth/`)
- `jwt.ts` (jose HS256, cookie `elora_session`, payload `{sub, role}`) is shared by the server and `src/proxy.ts`.
- `proxy.ts` is only an optimistic cookie check for `/admin`, `/account`, `/checkout`, `/login` and `/register`.
- Real authorization is in `dal.ts`: `getCurrentUser` / `requireUser` / `requireAdmin` re-read the user from MongoDB, so role changes apply immediately. Every admin page and server action calls `requireAdmin()` itself.
- The first registered account becomes admin. Passwords use scrypt (`lib/server/password.ts`).

### Server vs shared modules
- `src/lib/server/*` is `server-only` (DB access).
- `src/lib/*` at the top level holds pure types and mappers safe for both sides, e.g. `products.ts` (`Listing`, `salePrice`, card mappers), `orders.ts` and `reviews.ts`.
- Client components must not import from `lib/server`.

### Data model (MongoDB collections)
- `products`: listings managed in `/admin/products`.
  - `gallery` holds 1–6 photos. Photo 1 is mirrored into `image` / `imageKey` / `alt`, which cards, bag and orders use.
  - Other fields: `discountPercent` (0–90) and `otherSales` (off-site sales added to the "N sold" figure).
  - `lib/product-detail.ts` builds the product page model. Hand-written editorial copy in `lib/product-data.ts` overrides per slug.
- `users`, `orders` and `reviews`. Order statuses follow `nextStatuses` in `lib/orders.ts`.
- `carts`: one document per user, storing references only (`{slug,size,quantity}`). It is hydrated from live listings, so prices are always current.
- `settings`: a single `_id: "site"` document holding `deliveryOptions` (checkout fees; placeholders until saved), plain-text `policies` (served at `/policies/[slug]`), the announcement-bar messages and `heroSlides` (1–8, same shape as a listing gallery photo). It is edited at `/admin/settings` and cached with the `settings` tag; `lib/data.ts` `heroSlides()` supplies the defaults.
- **Stock:**
  - `products.stock` is pairs per size (`{"38": 4}`). A size with no entry is untracked and unlimited.
  - `soldOutSizes` is derived from it (0 = sold out).
  - `lib/server/stock.ts` reserves atomically in `placeOrder` (rolling back on failure) and releases on cancel.
  - Cart actions cap quantities at stock.
  - `stock_alerts` holds "notify me" requests; restocking a size in the admin form notifies them.
- `password_resets`: SHA-256 hashes of single-use tokens with a TTL (1 hour). A reset sets `users.passwordChangedAt`, and `getCurrentUser` rejects JWTs issued before it.
- `users.savedAddress`: the last checkout address, used to prefill the next one.
- `review_uploads`: ownership of review photos, for the daily cap and so a review can only reference the uploader's own files.
- `coupons`: codes managed at `/admin/coupons`.
  - Types: `percent` (with an optional `maxDiscount`), `fixed` (PKR) and `free_delivery`.
  - Rules: `minOrder`, `startsAt` / `endsAt` (Pakistan days), `maxUses` (total) and `perCustomer`.
  - `fullPriceOnly` is on by default, so items with a listing discount don't get the coupon as well.
  - `active` pauses a coupon.
  - Any coupon can be deleted, used or not (`deleteCoupon`). It also removes a campaign's cards, the `coupon_redemptions` rows, and `carts.coupon` references.
  - Orders keep their own `coupon` copy, so they stay intact and findable. `releaseCoupon` ignores codes that no longer exist.
  - `public` ("Show on website") lists it to customers through `publicCouponsFor(userId)`, which returns only coupons this customer can still use and never includes the code.
    - The "Coupons" section (`components/offers/MyCoupons.tsx`, account page `#my-coupons`) shows them as tickets that open the scratch card.
    - `OfferStripView` shows a "You have a coupon" strip on the bag page and in the checkout summary. It hides once a coupon is applied. With several coupons, it links to that section.
    - Codes with `public` off are shared by link only.
  - `uses` counts orders that weren't cancelled.
- Surprise campaigns (`type: "random"`, with `minPercent` / `maxPercent`) are never used directly.
  - `cardFor()` gives each customer one personal coupon on their first visit to `/offers/<CAMPAIGN>`: `ROSE-XXXXXX`, type `percent`, a random value from the range via `crypto.randomInt`, with `campaignId` and `ownerId`, `maxUses: 1`.
  - A unique index on `{campaignId, ownerId}` keeps it to one card each, even with two tabs open at once.
  - The campaign's `uses` / `maxUses` count cards handed out.
  - A card works only for its owner, and stops when its campaign is paused or ends. Editing the campaign updates its cards' rules, but each card keeps its own percent.
  - Admins get a preview, not a card. Personal cards aren't listed in the admin; the campaign row adds up their numbers.
- `coupon_redemptions`: `{_id: "<couponId>:<userId>", n, revealedAt?}`. `n` is for the per-customer limit.
  - `revealedAt` is set when the customer scratches the card (`markCouponRevealed`).
  - Until then, tickets, strips, step text and "with coupon" prices never show the discount (`OfferSummary.headline` is `null`, and `components/offers/Reveal.tsx` gates the offer page).
- `carts.coupon`: the code the customer applied (from checkout or the offer page). It is cleared when the order is placed.
  - The browser keeps pages it has already shown, so a checkout opened before the coupon was applied would come back without it.
    - `applyCouponCode` / `removeCouponCode` call `revalidatePath` on `/checkout` and `/cart`.
    - `Checkout` re-reads the bag's coupon on open (`currentCoupon()`).
- `meta`: seed and migration markers.

### Money paths never trust the client
- `placeOrder` (`app/(shop)/checkout/actions.ts`) builds orders from the account's `carts` document and re-prices from listings, then clears the bag after insert.
- Cart mutations (`lib/cart-actions.ts`) validate product and size against published listings.
- Coupons:
  - The maths lives in `lib/coupons.ts` (`applyCoupon`), so checkout shows the same numbers live.
  - `placeOrder` re-checks the coupon (`unavailableReason` and `applyCoupon` against the re-priced lines and the real fee), then claims it atomically with `claimCoupon` after reserving stock. Both are rolled back if the insert fails.
  - Cancelling an order (customer or admin) calls `releaseCoupon`.
  - Orders store `coupon: {code, type, discount, campaign?}`. `campaign` is the surprise campaign a card came from. Older orders without it are resolved through `campaignOfCards()`.
  - For free delivery, `shippingFee` is 0 and `discount` is the fee that was waived.
  - `/admin/orders?coupon=any|none|<CODE>` filters orders; `orderCodesFor()` expands a campaign to its cards' codes. The list shows a Coupon column, and the filter options include codes of deleted coupons.
- Payments are recorded, not processed: COD, EasyPaisa/JazzCash (wallet number stored), bank transfer, and card via a payment link.

### Performance rules
- **Icons:** the Material Symbols font is a subset of the names in `src/lib/icons.ts` (about 10 KB instead of about 4 MB). **When you use a new icon, add its name there**, or it renders as plain text.
- **Lazy overlays:** quick view, the search panel and the photo viewer load with `next/dynamic` only on first open. Keep new heavy overlays the same way.
- **Images:** photos go through `next/image` with real `sizes`; never use CSS `background-image` for photos. The hero mounts only the current, outgoing and next slides.

### Client state
- `lib/store.ts` mirrors the account bag and wishlist. It applies changes optimistically, queues the server actions in order, and applies the last server result. Only the display currency is per device (localStorage).
- Bag and wishlist UI actions go through `requireLogin()` (`lib/require-login.ts`), which opens the shared dialog.
- Prices render through `<Price>` / `<SalePrice>` (currency conversion lives in `lib/currency.ts`). Never format PKR by hand.
- Never use `window.confirm` / `alert`. Use `confirmDialog` / `alertDialog` from `components/Dialogs.tsx`, or `components/ConfirmButton.tsx` for form submits (admin wrapper: `components/admin/ConfirmButton.tsx`).
- Overlays render via `createPortal` to `document.body` and use `components/header/useDialog.ts` (scroll lock, Esc, focus trap). Sticky or transformed ancestors otherwise trap them. Modal Escape handlers check `#dialog-title` / `#size-guide-title` so stacked popups close one at a time.

### Images
- Admin uploads go to `POST /api/admin/images` with `preset` (`product` fits 1600×2000, `hero` fits 2400×2400). Sharp (`lib/server/images.ts`) applies EXIF rotation, resizes, strips metadata and converts to WebP, then `UTApi` stores it.
- `components/admin/GalleryUploader.tsx` is the shared photo editor for listing galleries and hero slides.
- When an image is removed, it is deleted from UploadThing via `releaseImage` (in `app/admin/actions.ts`), but only if no listing, order or hero slide still references it.

### Collection filters
- `lib/catalog-filters.ts` is a client store synced to the URL with `history.pushState`, which keeps `/collections` static.
- Facets are derived from listing data: the heel height is parsed from "95mm" in `spec`, and material groups are matched by keyword.
- `?q=` is a text filter. The header search dropdown (`components/header/SearchPanel.tsx`) links to `/collections?q=…`.
- `FiltersUrlSync` re-reads the URL on client navigations.

## Testing against another database

To run `next start` against a throwaway DB, rewrite the database name in `MONGODB_URI`. It is a multi-host `mongodb://` URI, so `new URL()` throws on it; use a regex. Then:
- Delete `.next/server/route-cache/` afterwards. `next start` persists regenerated pages there, and they would leak test data into the real server.
- Server actions are scoped to the pages that use them. Post them to a page whose client bundle imports them; cart actions work from any shop page.
- Server-action POSTs need an `Origin` header matching the host.

## Business rules (don't change without asking)

- The first registered account becomes admin. Admins moderate reviews but cannot write them.
- Accounts are required to add to the bag or wishlist and to check out; guest checkout is gone. This is enforced in `proxy.ts`, `placeOrder` and the cart actions.
- A review gets a "Verified purchase" badge only for a delivered order containing that product (`hasPurchased`). Marking an order delivered upgrades the customer's existing reviews.
- "N sold" = units in orders that aren't cancelled + the listing's `otherSales`. `otherSales` is labelled for real off-site sales only. Never seed or suggest invented numbers.
- Payment methods (`lib/orders.ts`): COD, EasyPaisa, JazzCash (wallet number stored, normalised to `03XXXXXXXXX`), bank transfer, card payment link. There is no gateway; admins record payment status and a reference (TID). Never collect card numbers or wallet PINs/OTPs.
- Fulfilment follows `nextStatuses`. Shipping requires a tracking number. Status changes are guarded against concurrent admins.

## Customer-facing pages to know

- `/account/orders/[number]`: the owner-only order page (timeline from `statusDates`, tracking number, cancel while `pending`, WhatsApp help).
- `/forgot-password` and `/reset-password`.
- `/policies/[slug]`.
- `/offers/[CODE]`: the scratch-card coupon page, built from the user's `index.html` design (`components/offers/ScratchCard.tsx`).
  - The admin's Copy link / WhatsApp buttons share it.
  - "Apply to Bag" saves the code on the account's cart.
  - Once revealed, the card stays revealed on that device (localStorage `rose:offer-revealed:<code>`).
  - Paused, expired or used-up codes show "This offer is not available".
- Shop-layout overlays: `CartDrawerHost` (the mini bag; it opens whenever `addToBag` runs unless `{ openBag: false }`) and the floating `WhatsAppButton`.

## Open work

- Real payment gateway (PayFast, or EasyPaisa/JazzCash merchant APIs).
- SMTP credentials, so emails actually send.
- WhatsApp Business API, for automatic order messages (today they are one-click from the admin panel).
- Rate limiting on login, register and checkout.
- Cleanup of uploads that were never saved to a listing.

