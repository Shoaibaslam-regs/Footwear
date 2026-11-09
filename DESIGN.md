# ÉLORA Maison — Design System

How the storefront looks and reads, and the patterns to reuse when building new screens. How the code works (data, auth, caching) lives in `CLAUDE.md`.

## 1. Brand Voice

- **Positioning:** quiet Italian luxury, an atelier rather than a shop, sold in Pakistan with prices in PKR.
- **Vocabulary:** "Atelier", "Maison", "Reserve Size", "Curated Capsule", "Silhouette", "Pieces" (not "products"), "Shopping Bag" (not "cart").
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

  An odd last card spans both columns (Best Sellers lays it out horizontally). Text-heavy sections (testimonials, craft) stay single-column.

### Radius, shadow, motion
- Radius tokens are overridden (`--radius-lg` 0.25rem, `--radius-xl` 0.5rem, `--radius-full` 0.75rem). Check that `rounded-full` still renders as a pill in Tailwind v4 before relying on it for new shapes.
- Pills (buttons, badges, chips, toasts) use `rounded-full`. Cards use `rounded-lg` or `rounded-xl`, and dialogs use `rounded-2xl`.
- Shadows: `shadow-sm` at rest, `hover:shadow-xl` on cards, `shadow-md` on CTAs, `shadow-2xl` only on floating UI (toast, dialog, search panel).
- **Motion:**
  - Default transition: `transition-all duration-300`.
  - Existing effects: `animate-marquee`, `animate-heart-pop`, `btn-shimmer`, `animate-kenburns` (hero) and the `dialogIn` keyframe.
  - Every animation needs a `prefers-reduced-motion` fallback (CSS block or `motion-reduce:` / `motion-safe:`).

### Icons
- Material Symbols Outlined, loaded via `<link>` in `layout.tsx`: `<span className="material-symbols-outlined text-[20px]">name</span>`.
- Use the `icon-filled` class for the filled state, pair every icon-only button with `aria-label`, and mark decorative icons `aria-hidden`.
- A link to a full page gets a trailing `arrow_outward` (↗) that nudges on hover (see the quick-view title).

### Admin panel
- `/admin` is deliberately plain: a system sans-serif, neutral greys and simple tables, from `src/app/admin/admin.css` (`.panel`, `.btn`, `.btn-primary`, `.btn-danger`, `.tag-*`, `.notice-*`).
- Never use brand tokens or the serif there. Dialogs opened from admin pages pass `variant: "admin"`.

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
7. Every new page exports `metadata` (or `generateMetadata`) titled `"<Page> — ÉLORA Maison"`.

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
- [ ] Works at 375px (mobile-first; product grids 2 columns on phones)
- [ ] Interactive parts are small client components, and the page itself stays a Server Component
- [ ] Prices use `<Price>` / `<SalePrice>`, images use `next/image`, popups use the shared dialogs
- [ ] `aria-label` on icon buttons, `aria-pressed` / `aria-expanded` on toggles
- [ ] Motion has a reduced-motion fallback
- [ ] `metadata` exported
- [ ] `npm run lint` and `npm run build` pass
