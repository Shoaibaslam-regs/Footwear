# Testing

Three kinds of automated tests protect the store. None of them touch live
data: they use throwaway databases (`<your db>_test`, `<your db>_e2e`, wiped on
every run) and a fake mail server, so no real emails are sent.

| Command | What runs | Time |
|---|---|---|
| `npm test` | Unit + integration tests (Vitest) | ~1 min against Atlas, seconds on GitHub |
| `npm run build && npm run test:e2e` | Browser tests (Playwright, Google Chrome) | ~1 min |
| `npm run test:all` | Everything above, in order | ~3 min |
| `npm run test:watch` | Unit + integration, re-running on save | — |

Run `npm test` before every push. GitHub also runs everything on each push
(`.github/workflows/test.yml`); a red ✗ on a commit means a test failed, and
the browser report is attached to the run.

## What is covered

**Unit** (`tests/unit/`, pure logic, no database)
- Coupon maths: percent, cap, fixed, free delivery, sale items, minimum order, surprise codes, "with coupon" prices, wording.
- Expected delivery labels, fulfilment step rules, the queue statuses.
- Countdown text on locked buttons; the admin secret and its 10-minute pass.

**Integration** (`tests/integration/`, server code against `<db>_test`)
- Rate limits: counts, windows, case-insensitive keys, parallel attempts, visitor IP.
- Stock: reserve, release, the last pair to one of two buyers, rollback.
- Coupons: per-customer and total limits under load, states, surprise cards (one per customer, in range, owner only, paused campaign).
- Sign-up codes and COD order codes: hashing, tries, expiry, resend, fingerprints.
- Order queue order and numbers; two admins changing a status at once; delivery estimates; password-reset links.

**Browser** (`tests/e2e/`, the built store against `<db>_e2e`, desktop and phone)
- Sign-up with the emailed code (wrong code, then right code).
- COD checkout for a new customer with the code, and it appears in the admin queue with "Email confirmed".
- COD for a returning customer without a code; a coupon taken off the total.
- Hidden admin login; visitors and customers kept out of the admin.

## Adding a test

- Pure logic → `tests/unit/<area>.test.ts`.
- Anything in `src/lib/server/` → `tests/integration/<area>.test.ts`. The setup
  (`tests/setup/integration.ts`) empties the database before each file,
  captures emails in `sentMail` and stands in for `next/headers` / `next/cache`.
  Call `resetDb()` in `beforeEach` if tests in the file shouldn't share data.
- A customer or admin journey → `tests/e2e/<journey>.spec.ts`, using the helpers
  in `tests/e2e/helpers.ts` (create users, log in, put shoes in the bag, read
  the code from the fake mail server). Tag it `@phone` to also run it at phone size.

When a feature changes on purpose, update its test in the same change.
