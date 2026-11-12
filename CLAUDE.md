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

Tests (see `TESTING.md`): `npm test` runs Vitest unit tests (`tests/unit/`) and integration tests (`tests/integration/`) against `<db>_test`. `npm run build && npm run test:e2e` runs Playwright browser tests (`tests/e2e/`) against `<db>_e2e`, through `tests/e2e/server.mjs`: `next start` on :3457 with a fake SMTP server on :2525, whose messages are listed on :2526. GitHub runs everything on each push (`.github/workflows/test.yml`, with its own MongoDB). Both test databases are wiped on every run; names that don't end in `_test` / `_e2e` are refused. **Add or update tests with every change to money, stock, coupons, codes, auth or the queue.**

`.env` needs `MONGODB_URI`, `JWT_SECRET` (≥32 chars) and `UPLOADTHING_TOKEN`. Never print the URI: it contains credentials.

`CRON_SECRET` (optional, 16+ chars) switches on the weekly photo cleanup on Vercel. `ADMIN_SECRET` (optional, 12+ chars) switches on the hidden admin login.

Email is optional. Setting `SMTP_HOST`, `SMTP_PORT` (default 587), `SMTP_USER`, `SMTP_PASS` (or `SMTP_KEY`) and `MAIL_FROM` switches it on. The store uses Brevo (`smtp-relay.brevo.com:587`), plus `SITE_URL` for links in emails. Without them, `lib/server/mail.ts` skips every send: order emails, password-reset emails and back-in-stock alerts. Admins then use the WhatsApp buttons, and the "Reset link" button on `/admin/users`.

## Architecture

### Rendering & caching (Cache Components is on)
`next.config.ts` enables `cacheComponents`, `partialPrefetching` and `reactCompiler`. Consequences you will hit:
- Anything reading `cookies()`, `searchParams`, `usePathname()` or the session must sit inside `<Suspense>`, or the build fails. The pattern used throughout is a small async component inside Suspense (e.g. `CheckoutForUser`, `ReviewComposer`, `SignedInAs`, `CartSync`).
- Prerendered code must not read the current time (`Date.now()` / `new Date()`). That's why review dates are absolute.
- **Every admin page wraps its content in its own `<Suspense>`** (`XContent` plus a default-export wrapper). `requireAdmin()` verifies the JWT with async crypto, and the admin layout's Suspense doesn't count for navigations: without it, dev logs "uncached data … outside of `<Suspense>`" and navigations aren't instant. `loading.tsx` did not fix it.
- Code that reads the time after cookies (coupon dates, the dashboard) awaits `io()` from `next/cache` first. Use `io()`, not `connection()`, which blocks prefetching.
- A button with a function `formAction` can't carry `name`/`value`, because React drops them. Bind the value instead: `formAction={action.bind(null, "hidden")}`.
- Pages stay alive when the customer navigates away: Next.js hides them with React `<Activity>` (up to 3 routes) and keeps all their state, so forms come back exactly as they were left. Anything showing a one-off result must reset when hidden. `Checkout` does this: after an order is placed, a `useLayoutEffect` cleanup bumps the key of `CheckoutForm`, so the next visit is a fresh checkout instead of the last "Thank you" screen (`tests/e2e/checkout-again.spec.ts`). See `node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md`.
- Storefront data is read through `'use cache'` functions with tags: `products` (`lib/server/products.ts`), `reviews` / `reviews:<slug>` (`lib/server/reviews.ts`), `sales` (`lib/server/sales.ts`), and `settings` (`lib/server/settings.ts`). Any server action that changes that data must call `updateTag(...)` with the matching tag. Admin order actions that only re-render the current page use `refresh()`.
- `npm run build` executes these cached reads, so it hits MongoDB. The one-time seed (`meta: products-seed`, from the static data in `lib/data.ts` / `collection-data.ts`) and migrations (`meta: gallery-v1`) run at build time against the real DB.

### Route groups
- `src/app/(shop)/`: the storefront. Its layout renders `Header`, `Footer` and `ActionToast`.
- `src/app/admin/`: the admin panel. Its own layout is a plain Microsoft-style layout in the website's colours (`admin.css`, `--a-*` variables mapped to the theme tokens, inside `@layer components`; no blue; see DESIGN.md).
  - The overview reads `getDashboard(range)` from `lib/server/dashboard.ts`. It is uncached, and its days are Pakistan calendar days (Asia/Karachi), comparing the current period with the one before.
  - `/admin/users` and `/admin/products` read per-row figures from `lib/server/insights.ts`: orders, spend, bag and wishlist counts per user, and sold, revenue, rating, wishlists and restock requests per listing. They filter, sort and page in memory with `components/admin/Pager.tsx` (`?page=`, `?per=25|50|100`).
  - `/admin/users/[id]` shows one customer: profile, saved address, orders, live bag and wishlist, reviews and restock requests. `/admin/products/[id]/insights` shows one listing's performance; `ListingTabs` switches between it and the edit form.
  - `/admin/orders/[id]/slip` is the printable order slip for receipt printers (80 or 58 mm, `?w=58`; `?print=1` opens the print dialog, used by "Print slip" on the order page). Print CSS takes the admin chrome out of the layout, since merely hiding it makes Chrome shrink the slip, and `PrintButton` sizes `@page` to the slip's measured height.
  - Live orders: `GET /api/admin/orders/stream` is a Server-Sent Events stream (admin only), not a WebSocket, because Next route handlers can't upgrade connections without a custom server. `lib/server/order-events.ts` keeps one MongoDB change stream per server process for all tabs, and falls back to polling `updatedAt` every 5 s when the database has no replica set. `components/admin/LiveOrders.tsx` (admin top bar) shows a popup, a chime and a `(n)` tab-title count for `new` orders, and calls `router.refresh()` on order pages for `new`/`change`. Order writes must keep setting `updatedAt` for the polling fallback. On Vercel the route has `maxDuration = 300` and closes itself after 270 s. Every ping carries `id: <time>`, so on reconnect the browser sends `Last-Event-ID` and the route first replays orders created since then (minus 5 s; `LiveOrders` skips ids it already announced).
  - The orders list is a first-come-first-served queue by default (`listOrders({sort: "queue"})`).
    - Orders still to be sent (`queueStatuses`: pending, confirmed, processing) come first, oldest at the top. Sent and finished orders follow, newest first, after a divider row.
    - `queuePositions()` numbers the waiting orders across all filters (#1 = oldest); the list and the order page ("#2 of 12 in queue") show it.
    - `?sort=newest|oldest` gives plain date order.
  - Expected delivery: `order.eta = {from, to, note?, setAt}` (Pakistan calendar days, `YYYY-MM-DD`). It is set on the admin order page (`EtaControl` → `setOrderEta`), from a preset range counted from today in PKT (`etaPresets`, e.g. 4–5 days) or picked dates, with an optional reason the customer sees (`etaReasons` suggestions).
    - Saving notes it in the history and emails the customer.
    - It shows on the customer's order page, the account order cards, the order slip and the admin list, and `statusLines` adds it to status emails and the WhatsApp update until delivery. Labels come from `etaLabel` (no year).
  - `setUserRole` returns to the page in its `back` field, but only to `/admin/users` or `/admin/users/<id>`.
  - Charts are client SVG components in `components/admin/charts/`. They take a serialisable `unit` prop (`"pkr"` or `"count"`), not a formatter function, because server pages render them.
- `src/app/layout.tsx` (root): fonts only, plus `DialogHost` and `CartSync` (both app-wide).
- `src/app/not-found.tsx` is a standalone page (no header or footer): the brand name and two links back. A `notFound()` inside the shop (e.g. a missing product) still renders within the shop layout, so `globals.css` hides `.shop-chrome` (header, footer) while `#not-found` is on the page. `src/app/api/` holds `cart`, `session` and `admin/images`.

### Auth (`src/lib/auth/`)
- `jwt.ts` (jose HS256, cookie `elora_session`, payload `{sub, role}`) is shared by the server and `src/proxy.ts`.
- `proxy.ts` is only an optimistic cookie check for `/admin`, `/account`, `/checkout`, `/login` and `/register`.
- Real authorization is in `dal.ts`: `getCurrentUser` / `requireUser` / `requireAdmin` re-read the user from MongoDB, so role changes apply immediately. Every admin page and server action calls `requireAdmin()` itself.
- The first registered account becomes admin. Passwords use scrypt (`lib/server/password.ts`).
- Hidden admin login (`lib/server/admin-gate.ts`), on when `ADMIN_SECRET` (12+ characters, not an email) is set.
  - Typing the secret into the login form's email box returns `{admin, gate}`, where `gate` is a 10-minute signed pass, and `AuthForm` shows `AdminLogin`. `adminLogin` then accepts only admin accounts.
  - While the gate is on, admin accounts are refused on the normal login with the same "incorrect" answer.
  - Non-email input in the email box counts as a secret guess: `adminGateIp`, 10 per IP per hour, with the countdown on the button.
  - The admin form has its own stricter limit, `adminLoginIp` (5 failed tries per IP in 15 minutes), on top of the login email and IP limits. "Not an admin? Log in as a customer" returns to the normal form.
  - Without `ADMIN_SECRET`, admins log in normally, so a missing setting can't lock anyone out.

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
- `pending_registrations`: sign-ups waiting for their email code (`lib/server/email-otp.ts`). The record is keyed by email, holds the name, password hash and a hash of the code (peppered with `JWT_SECRET`), and expires 1 hour after the first code (TTL).
  - With email configured, `register` creates no account. It emails a 6-digit code, and `AuthForm` switches to `VerifyCode`.
  - `verifyRegistration` creates the account (`users.emailVerifiedAt`) and logs in.
  - Codes work for 10 minutes with 5 tries. "Resend code" is limited to once a minute (countdown on the button) and 5 per sign-up. Re-submitting the form within a minute keeps the code already sent.
  - Without email configured, sign-up creates the account at once, as before. Accounts made before this have no `emailVerifiedAt`.
  - To test without sending real email, start the test server with `SMTP_HOST=127.0.0.1 SMTP_PORT=2525` and a local SMTP sink (`--env-file` doesn't override variables already set).
- `order_codes`: Cash on Delivery confirmations (`lib/server/order-codes.ts`), one per account, with a TTL of 1 hour.
  - When email is configured, a COD order from an account with no delivered order is not placed by `placeOrder`. It prices the order, saves the checkout data with a fingerprint of the priced order (lines, prices, coupon, delivery, address, total) and emails a 6-digit code. It returns `{confirm: {email, total}}`, and `Checkout` opens `OrderCodeDialog`.
  - `confirmCodOrder` checks the code, prices the order again and requires the same fingerprint (otherwise `restart`: "Your bag, prices or details changed…"). Then the shared `finalise` reserves stock, claims the coupon and inserts the order with `codeConfirmed: true`, shown as "Email confirmed" in the admin.
  - Nothing is reserved before the code is entered. Codes work for 10 minutes with 5 tries; resend once a minute, 5 per hour.
  - Other payment methods, and customers with a delivered order, place the order directly.
  - `placeOrder` is split into `orderLimits` → `readForm` → `priceOrder` → `finalise`; keep both paths going through these.
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
- `rate_limits`: counters (`{_id: "<rule>:<key>", n, expiresAt}`, TTL index on `expiresAt`) used by `lib/server/rate-limit.ts`. Each window starts at the first attempt, so a lockout always lasts until that window ends. Actions answer a reached limit with `retryAfter` (seconds), never a message: the button locks and counts down via `useCooldown` (`lib/use-cooldown.ts`), e.g. "Try again in 14:32". The limits are listed in `RULES`:
  - Login: 5 failed tries per email and 20 per IP in 15 min. Only failures count, and the check runs before the password.
  - Register: 5 per IP per hour.
  - Reset emails: 3 per address per hour (silent cap, same answer), plus 10 per IP. Bad reset links: 10 per IP per hour.
  - Orders: 5 placed per account per hour, and at most `MAX_PENDING_ORDERS` (3) still `pending`.
  - Wrong coupon codes: 10 per account in 15 min (someone else's surprise card counts as wrong).
  - "Notify me": 20 per account per day. Reviews: 20 per account per hour.
  - Per-IP keys come from `x-real-ip` or the last `x-forwarded-for` entry. The site is hosted on Vercel, which sets both headers itself, so they can be trusted there. Elsewhere, without a proxy, they can be faked, and the per-email and per-account limits are the ones that hold.

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
- Unused uploads (uploaded but never saved, or left behind) are cleared by `lib/server/storage-cleanup.ts`. It lists UploadThing files and keeps anything a listing, hero slide, order line or review refers to (by key or `ufs.sh` URL), plus anything newer than the safety age.
  - `/admin/settings/storage` ("Photo storage", linked from Settings) shows usage and the unused files, with a confirmed Delete button (24 h safety age).
  - `GET /api/cron/cleanup-uploads` runs weekly via Vercel Cron (`vercel.json`, Saturday 22:00 UTC = Sunday 03:00 PKT) with a 48 h safety age. It needs `CRON_SECRET` (16+ chars) in Vercel; without it the route refuses everyone.
  - Deletion always rescans on the server. It refuses when the database references none of the stored files, and the automatic run also refuses when more than half would go.
  - **Never press Delete against a test database:** it shares the UploadThing account with the live site, so every real photo looks unused there.

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
- Email sends through Brevo with a Gmail sender; a domain of the store's own (with Brevo DKIM) would keep it out of spam.
- WhatsApp Business API, for automatic order messages (today they are one-click from the admin panel).

