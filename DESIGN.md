# Ŕose Atelier — Design System

How the storefront looks and reads, and the patterns to reuse when building new screens. How the code works (data, auth, caching) lives in `CLAUDE.md`.

## 1. Brand Voice

- **Positioning:** Italian luxury women's shoes, sold in Pakistan with prices in PKR. The look stays premium; the **words stay simple**, for shoppers with basic English.
- **Brand name:** **Ŕose Atelier**. The R carries an acute accent (Ŕ), as the old É did; the logo shows it uppercase as ŔOSE ATELIER. The fonts load `latin-ext` for it. Handles and hashtags have no accent: #RoseAtelier, @RoseAtelier.
- **Place and time:** the workshop is in **Karachi**; don't name other cities. Never show a year in marketing text (no "2025", "SS25", "©" year). Order and review dates keep their year.
- **Plain English rules:**
  - Short sentences and everyday words, like a good local shopping site.
  - No fancy or foreign words: maison, bespoke, curated, silhouette, concierge, couture, complimentary, acquisition, grazie. "Atelier" appears only inside the brand name "Ŕose Atelier".
  - Don't translate into Urdu or Roman Urdu.
  - British spelling (colour, favourite).
- **Use these words, the same everywhere:**

  | Say | Not |
  |---|---|
  | customer | client |
  | product / item / shoes; **pair(s)** for quantities | piece(s), silhouette(s) |
  | Log in / Log out / Create account | Sign in / Sign out |
  | Bag, Add to Bag | Shopping cart, Reserve |
  | Wishlist, Added to Wishlist | Atelier Wishlist, saved pieces |
  | Delivery, Delivery address, Delivery & Returns | Shipping, Destination |
  | Free | Complimentary |
  | Shop Now | Explore / Discover the collection |
  | Our team | Our concierge |
  | website (admin text) | storefront |

- **Category names:** Heels, Sandals, Flats & Loafers, Bridal & Party (`lib/products.ts`).
- **Copy pattern:** an uppercase eyebrow, then a serif headline, then one light body sentence.
- **Mood:** espresso, ivory, champagne gold and blush. Lots of whitespace, soft shadows, no hard borders.
- **Honesty:** never invent claims: no shipping promises, sales numbers or reviews that aren't real. Announcement defaults state only facts, such as payment methods, the size guide and WhatsApp.

## 2. Design Tokens (use these and nothing else)

All tokens live in `src/app/globals.css` (`@theme`). **Never hardcode hex values** in storefront components.

### Color roles (Material 3 naming)
| Role | Token | Use |
|---|---|---|
| Page background | `surface` / `background` (#fbf9f6) | default page |
| Alt section bg | `surface-container-low` | alternating sections (e.g. New Arrivals) |
| Cards | `surface-container-lowest` (#fff) | product cards, panels, dialogs |
| Chips / inputs | `surface-container`, `-high`, `-highest` | size chips, toggles, disabled |
| Ink | `primary` (#030101), `on-surface`, `on-surface-variant` | headings, body, secondary text |
| Dark panels | `primary-container` (#211b19) | primary buttons, hero bg, mobile menu |
| Gold accent | `secondary-fixed` (#f6dfc1), `secondary` (#6c5c44) | hover state of dark buttons, eyebrows, highlights, stars |
| Blush accent | `tertiary-fixed`, `tertiary-container` | limited/edition badges, destructive-dialog icon |
| Lines | `outline`, `outline-variant` (often `/40`) | dividers, rings |
| Error / sale | `error`, `error-container` | sale price, discount chip, wishlist heart, validation |

### Typography
- **Serif (Playfair Display):** `font-headline-*` and `font-display-hero*`, always weight 400, `tracking-tight`.
- **Sans (Plus Jakarta Sans):** `font-body-*` and `font-label-*`.
- Always pair a family with its size token, e.g. `font-headline-lg text-headline-lg`.
- Scale: `display-hero` 64 · `headline-lg` 44 · `headline-md` 28 · `headline-sm` 22 · `body-lg` 18 · `body-md` 15 · `body-sm` 13 · `label-md` 14 · `label-sm` 12 · `label-uppercase` 11.
- Eyebrows and labels: `font-label-uppercase text-label-uppercase uppercase tracking-[0.2em] text-secondary`.
- Mobile: `text-headline-lg-mobile` / `text-display-hero-mobile`, stepped up with an `lg:` variant. On compact phone cards, titles drop to `text-body-lg` while keeping the serif family.

### Spacing & layout
- Container: `max-w-[1536px] mx-auto px-margin-mobile lg:px-margin`.
- Section rhythm: `py-space-xl`; header block `mb-space-lg`; grid `gap-gutter` (phones `gap-space-sm`).
- Scale: `space-xs` 4 · `space-sm` 8 · `space-md` 16 · `space-lg` 28 · `space-xl` 48 · `gutter` 24 · `margin` 56.
- The fixed header is `pt-28` tall (marquee + 80px bar). Full-bleed heroes use `-mt-28`, sticky bars use `top-20`, and anchors get `scroll-margin-top: 7rem` globally.
- **Product grids are 2 columns on phones** (collection, New Arrivals, Best Sellers, categories). Compact cards on phones mean:
  - smaller badges;
  - one-line material text;
  - no hover-only controls;
  - a dropdown instead of size chips.

  An odd last card spans both columns (Best Sellers lays it out horizontally). Text-heavy sections (craft) stay single-column.

### Radius, shadow, motion
- Radius tokens are overridden (`--radius-lg` 0.25rem, `--radius-xl` 0.5rem, `--radius-full` 0.75rem). Check that `rounded-full` still renders as a pill in Tailwind v4 before relying on it for new shapes.
- Pills (buttons, badges, chips, toasts) use `rounded-full`. Cards use `rounded-lg` or `rounded-xl`, and dialogs use `rounded-2xl`.
- Shadows: `shadow-sm` at rest, `hover:shadow-xl` on cards, `shadow-md` on CTAs, `shadow-2xl` only on floating UI (toast, dialog, search panel).
- **Motion** ("Premium motion" in `globals.css`, driven by `components/Motion.tsx`):
  - One ease, `--ease-lux` (fast start, long settle), at 0.5–1.4 s. Fade, translate and clip only, never layout, and each animation plays once.
  - **Scroll reveals:** put `data-reveal` on a section's heading block and `data-reveal-stagger` on a grid (its items appear about 90 ms apart). For a photo wipe, use `data-reveal="curtain"` on a `relative overflow-hidden` box.
  - **Photos:** add `img-fade` to fade them in on load. Never on the hero/LCP image.
  - **Hero entrance:** `.hero-rise` with `--d` delays; the headline uses `.hero-word` masks.
  - **Text links:** `.link-draw` (gold underline drawn on hover; `--draw-color` to change it).
  - **Header:** `.site-bar` frosts once `html[data-scrolled]` is set.
  - **How it stays safe:** content is only hidden under `html[data-motion]`, which an inline script in the root layout sets only when the visitor hasn't asked for reduced motion. It is removed again if `Motion` hasn't started within 4 s.
  - Other effects: `animate-marquee`, `animate-heart-pop`, `btn-shimmer`, `animate-kenburns` (hero, plus a gentle scroll parallax), and `dialogIn`. Every new animation needs a reduced-motion fallback.

### Icons
- Material Symbols Outlined: `<span className="material-symbols-outlined text-[20px]">name</span>`. The font is a subset, so **add every new icon name to `src/lib/icons.ts`**.
- Use the `icon-filled` class for the filled state, pair every icon-only button with `aria-label`, and mark decorative icons `aria-hidden`.
- A link to a full page gets a trailing `arrow_outward` (↗) that nudges on hover (see the quick-view title).

### Admin panel
- **Layout** (`src/app/admin/layout.tsx`):
  - A white top bar: the emblem, "Ŕose Atelier" in the accent colour, a divider, "Admin", and the admin's first name with **Log out** on the right.
  - A left sidebar (`components/admin/AdminNav.tsx`, `.a-side-link`; the current page is a white card with a soft shadow). On phones it becomes a row that scrolls sideways.
  - Content sits on a light grey page in white rounded cards (`.panel`). The panel uses the full desktop width (capped at 1920px), so build pages as responsive grids rather than one narrow column.
- **Overview dashboard** (`src/app/admin/page.tsx`, data from `lib/server/dashboard.ts`):
  - One filter row at the top: a 7 / 30 / 90-day range (`?range=`, default 30) that every figure below follows.
  - KPI tiles (`components/admin/charts/StatTile.tsx`): label, value, and the change vs the previous period of the same length, shown as an arrow plus text.
  - Then "Needs attention" (things waiting on the admin, each a link), the charts, the latest orders and "Store at a glance".
- **Lists** (Users, Listings):
  - Order: summary tiles (each links to its filter), then one filter row (search, selects, Sort by, Apply/Reset), then the table, then the pager ("Showing 1–25 of N", page numbers, rows per page).
  - Keep row actions to two or three small buttons (`.btn-sm`). Everything else lives on the item's own page, which the name links to.
  - Tables must fit at 1440px; hide secondary columns below `2xl` rather than scroll.
- **Charts** (`components/admin/charts/`, hand-written SVG, no chart library):
  - One series colour only: `--a-chart` (#9c6a2a), validated for chroma and contrast on white. The brand espresso is too grey for data. Gridlines are `--a-grid` hairlines; text is always ink or muted, never the series colour.
  - Line charts: a 2px line, a 10% wash and an end dot with its value. A crosshair and tooltip follow the pointer and the arrow keys. Columns are at most 24px with 4px rounded tops. Ranked or staged data uses horizontal bars (`BarList`).
  - Count axes use whole numbers only. Every chart card (`ChartCard`) offers "View as table", so no figure depends on hovering.
  - A single series has no legend: the card title names it.
- **Style** (`src/app/admin/admin.css`): the same colours as the store, read from the theme tokens (`--a-*` variables map to `--color-*` from `globals.css`), so the admin changes with the website theme.
  - Colours: an ivory page, white cards, warm `outline-variant` lines and espresso primary buttons and pills, with a gold-brown hover and focus ring. The current sidebar page gets a gold edge.
  - System sans-serif (no serif), and no decorative motion.
  - Classes: `.btn` / `.btn-primary` / `.btn-danger` / `.btn-text`, pill filter tabs (`.pill`, current page = `aria-current="page"`), `.tag-*` (status colours: green, amber, red), `.notice-*`, and dashed empty states (`.empty`).
  - Never hard-code hex colours in admin components; use the theme classes (`bg-surface-container`, `border-outline`…). Dialogs opened from admin pages pass `variant: "admin"`. Changing anyone's admin access (Make admin / Remove admin) always asks for confirmation first.
  - Exception: chart marks use `--a-chart`.
- Flex or grid children holding wide tables or `<fieldset>`s need `min-w-0` so they scroll inside their card on phones.

## 3. Component Recipes (copy these, don't reinvent them)

| Pattern | Reference file |
|---|---|
| Section header (eyebrow + h2 + right-side meta/controls) | `components/NewArrivals.tsx` |
| Primary pill CTA (dark → gold on hover) | `components/QuickAddButton.tsx`, `Hero.tsx` |
| Glass secondary CTA on imagery | `Hero.tsx` (`bg-surface-container-lowest/15 backdrop-blur-md`) |
| Product card (home, catalog) | `NewArrivals.tsx`, `BestSellerCard.tsx`, `collection/CatalogProductCard.tsx` |
| Price, sale price, discount chip | `<Price>` / `useFormatPrice()` (`components/Price.tsx`), `<SalePrice>` / `<DiscountBadge>` (`components/SalePrice.tsx`) |
| Star rating | `components/product/Stars.tsx` (half stars, real value) |
| Wishlist heart | `components/WishlistButton.tsx` |
| Toast feedback | `showToast()` from `lib/toast.ts` (rendered by `ActionToast`) |
| Confirmation / alert popup | `confirmDialog` / `alertDialog` in `components/Dialogs.tsx` (`variant`, `tone: "danger"`, optional product `image`); form submits use `components/ConfirmButton.tsx` |
| Sign-in prompt before bag/wishlist actions | `requireLogin()` in `lib/require-login.ts` |
| Modal / drawer / sheet behaviour | `components/header/useDialog.ts` (scroll lock, Esc, focus trap); render via `createPortal` to `document.body` |
| Bottom sheet on phones, sidebar on desktop | `components/collection/FilterSidebar.tsx` |
| Search dropdown (combobox) | `components/header/SearchPanel.tsx` |
| Full-screen photo viewer (swipe, zoom, pan) | `components/product/PhotoViewer.tsx` (product gallery, review photos) |
| Mini bag after add-to-bag | `components/cart/CartDrawerHost.tsx` + `CartDrawer.tsx` |
| Floating WhatsApp button | `components/WhatsAppButton.tsx` |
| Hero slideshow | `components/HeroSlideshow.tsx` |
| Size guide trigger | `components/SizeGuideLink.tsx` |
| Checkout form fields with server errors | `components/checkout/fields.tsx` |
| Admin photo editor (gallery / hero slides) | `components/admin/GalleryUploader.tsx` |
| Badges | `rounded-full px-2.5 py-1 font-label-uppercase text-[10px] tracking-widest uppercase` |

**Rules**
1. Server Components by default. Add `"use client"` only for interactive leaves (buttons, toggles, modals).
2. Static copy and content data go in `src/lib/*-data.ts` with exported types, never inline in JSX. Listings come from MongoDB, never from static arrays.
3. Images go through `next/image` (`fill` + `sizes`), with `sizes` matching the real phone and desktop widths.
4. Prices are stored in PKR and always rendered with `<Price>` / `<SalePrice>`, never formatted by hand.
5. Never use `window.confirm`, `alert` or `prompt`. Use the shared dialogs. Destructive actions use `tone: "danger"`, so focus starts on Cancel.
6. Shared class strings become a `const` at the top of the file (see `iconBtn` and `chipBase`).
7. Every new page exports `metadata` (or `generateMetadata`) titled `"<Page> — Ŕose Atelier"`.

## 4. Open Design Work

- Footer items with no page yet: Press, Cookie Settings, Accessibility (rendered as plain text). Shipping & Returns, Privacy and Terms are admin-editable at `/admin/settings`.
- Editorial pages: `/maison` (brand story), `/wedding-atelier` (bridal capsule plus appointment booking) and `/new-arrivals`.
- Accessibility pass:
  - Focus rings everywhere (`focus-visible:ring-2 ring-secondary`).
  - An alt-text audit.
  - Contrast checks on gold-on-ivory text.
  - A way to pause the hero on touch devices.
- Optional dark theme: map the Material 3 roles to dark values. The token naming already supports this.

## 5. Checklist for Every New Screen

- [ ] Uses only theme tokens: no raw hex, no arbitrary font sizes outside the badge `text-[10px]` convention
- [ ] Container, gutter and section rhythm match §2
- [ ] Eyebrow + serif headline pattern for each section
- [ ] No sideways scroll at 320px: long rows use `flex-wrap`, flex children with text get `min-w-0`, and tooltips/popovers anchor inwards (`right-0`) near the edge. Product grids are 2 columns on phones
- [ ] Interactive parts are small client components, and the page itself stays a Server Component
- [ ] Prices use `<Price>` / `<SalePrice>`, images use `next/image`, popups use the shared dialogs
- [ ] `aria-label` on icon buttons, `aria-pressed` / `aria-expanded` on toggles
- [ ] Motion has a reduced-motion fallback
- [ ] `metadata` exported
- [ ] `npm run lint` and `npm run build` pass
