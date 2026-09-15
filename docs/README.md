# Viora — Project Documentation

Viora (ویورا) is a party-planning marketplace platform for the Iranian market, starting with a
single-city, single-category beachhead (Tehran, birthday supplies + promotional balloon
printing) and built to expand city-by-city and category-by-category via database flags, not
code changes.

This file is the entry point for any human or AI picking up this project without prior context.

---

## 1. Where things are

| Path | What it is |
|---|---|
| `docs/00-START-HERE.md` | The original project brief handed to Claude Code. Read this first — it explains the documentation/ADR discipline this project follows. |
| `docs/project-plan-v1.md` | Vision, business model, phased roadmap, high-level architecture. |
| `docs/party-wizard-engine-spec.md` | Full design of the "Build My Party" suggestion engine (themes, budget allocation, AI extraction layer) — mostly **not yet implemented**, see §4 below. |
| `docs/panels-and-operations-spec.md` | Single/multi-vendor order flow, seller panel, print-partner panel, admin panel — **mostly not yet built**, see §4 below. |
| `docs/sprint-0-brief.md` | The actual scope this codebase currently implements. |
| `docs/legal-pages-draft.md` | Draft Terms/Privacy/Refund copy — not yet wired into any page. |
| `docs/wireframes/` | Reference low-fidelity UI kit (generic shapes, not page-specific mockups). |
| `docs/decisions.md` | **Architecture Decision Record.** Every non-obvious choice made while building this, with the reasoning and the alternatives rejected. Read this before assuming something is a bug — it might be a documented, deliberate simplification. |
| `config/party-wizard/*.json` | Hand-editable theme list and budget-allocation table (see §4). |

## 2. What's actually built (Sprint 0)

A Next.js (App Router, TypeScript) skeleton with:

- Marketplace database schema (Prisma + MySQL) covering users/roles, cities, categories,
  sellers, service providers, products, service offerings, party profiles, orders/order items
  (single- and multi-vendor), subscriptions, settlements, reviews, support tickets, and
  admin-editable settings — see `prisma/schema.prisma`. Every model is commented with which
  spec section it comes from.
- Phone + OTP auth (mock SMS via `console.log`), session cookie, no passwords.
- All Sprint 0 pages, mobile-first, RTL, in Persian: splash/onboarding, auth, home, shop
  (category grid → product list → product detail), Build My Party wizard (5 steps + a real
  suggested bundle), cart/checkout (mock payment), profile + order history.
- A real (if minimal) checkout: adding a product to cart and completing checkout creates an
  actual `Order`/`OrderItem` row and shows up in the profile's order history. This is the one
  piece of Sprint 0 that's more than a pure UI skeleton — it exists to prove the schema, auth,
  and provider abstractions actually work together end to end.
- Build My Party's phase-1 suggestion engine (`lib/wizard/engine.ts`): rule-based, no AI —
  reads `config/party-wizard/budget-allocation.json`, filters active products/services in the
  chosen city, and returns a real suggested bundle with an "add all to cart" action. See
  `docs/decisions.md` ADR 22.
- Product seller panel (`app/seller/`): a 4-step registration wizard (shop info + avatar,
  business identity, terms agreement, contact/address) ending in admin approval,
  product CRUD with image upload (search/filter on the list page), and order fulfillment
  (mark an order item shipped with a tracking code). See `docs/decisions.md` ADR 27, 29.
- Print-partner panel (`app/provider/`): registration (business identity + printable balloon
  types/colors chosen from an admin-curated catalog + self-defined tiered pricing by quantity
  band) ending in admin approval, an order queue with two-stage visibility (limited info until the
  partner accepts, full design-file/color/notes after), and shipping with a tracking code.
  Customer side (`app/(main)/print/`): a design-file upload + finish/color/quantity/delivery form
  (a real Jalali date picker for express delivery, a computed calendar-date range for normal
  delivery) that matches against qualified partners and places a real `Order` (reusing the same
  `Order`/`OrderItem` models every other order uses, not a parallel schema). See
  `docs/decisions.md` ADR 31, 32.
- Reviews & ratings: a customer's own order detail page (`app/(main)/orders/[id]/`, linked from
  `/profile`'s order history) gets a "سفارش رو دریافت کردم" delivery-confirmation button once
  shipped, which unlocks a 1-5 star + optional-comment review prompt per order item (product or
  print-service alike - one review per item, ever). Reviews show with an average + count on the
  product detail page. See `docs/decisions.md` ADR 33.
- Support tickets: open to any account - customer, seller, or print partner alike, all reached
  from the same "تماس با پشتیبانی" entry point on their own profile/dashboard (`/support` list,
  `/support/new`, a per-ticket chat thread). Admin side (`/admin/tickets`, with independent
  status *and* sender-type filters, a sender badge per row, reply, and status change) shares the
  same thread-display component, but posts through its own dedicated reply route - a message's
  customer-vs-staff label is decided by which route handled it, not by comparing user ids (that
  comparison broke for an account that is both a ticket's owner and an admin - see ADR 34). See
  `docs/decisions.md` ADR 33, 34.
- Two independent discount mechanisms (docs/decisions.md ADR 35): a seller's own optional
  `Product.discountPrice` (absorbed by the seller - flows straight into `unitPrice`/
  `splitAmount` like the regular price always has, shown strikethrough in the shop), and a
  platform-wide `Coupon` (admin-managed at `/admin/coupons`, percentage or fixed-amount, with
  caps/limits/date windows) applied at checkout on either a product cart or a print order. The
  two stack, but only the seller's own discount ever touches what a seller/print-partner is
  paid - a Coupon's discount comes only off `Order.totalAmount`, absorbed by Viora, never
  `OrderItem.splitAmount`.
- Minimal admin panel (`app/admin/`): access gated on a `User.roles` check (the first `ADMIN` is
  granted by editing the database directly - see ADR 30), seller and print-partner approval queues
  (approve/reject with a reason, PENDING/APPROVED/REJECTED tabs), city/category active toggles,
  a print-color catalog (add/remove), a support-ticket queue, coupon management (add +
  active/inactive toggle), a seasonal-theme editor (`/admin/themes` - full palette override of
  `app/globals.css`'s tokens, a date window that decides what's live *today* with no manual daily
  step, and an admin-only preview of a not-yet-public theme), and banner management
  (`/admin/banners` - image/text/link for a fixed set of UI placements, one to start, same
  date-window activation) - replacing the direct-DB editing §4 below used to document. See
  `docs/decisions.md` ADR 30, 31, 32, 33, 35, 36.
- Champagne Rose brand theme (Tailwind v4 tokens in `app/globals.css`) - the default palette,
  live-overridable site-wide by an admin-scheduled `SeasonalTheme` (ADR 36).
- SEO baseline on every page: per-page metadata, `sitemap.xml`, `robots.txt`, JSON-LD
  (`Organization` on home, `Product` on product pages), and server-rendered content by default.

**Not built yet** (intentionally, per `docs/sprint-0-brief.md` §1): real payment/split-payment,
the AI free-text entry point for Build My Party (the plain multi-step form + rule-based engine is
the whole of phase 1 — see ADR 22), and — within the seller panel — sales analytics, subscription
management, and a seller-facing view of their own reviews (ADR 27, 33 - customers can review and
see reviews on the product page; sellers have no dashboard for it yet); within the print-partner
panel — the order-reassignment marketplace, the paid "تاییدیه‌ی ویژه‌ی ویورا" badge, a visual
partner calendar, and a real rating *shown in the partner-matching list* (ADR 31 - print
offerings can now genuinely be reviewed the same as products via ADR 33's generic order-item
review flow, but `getMatchingPrintProviders`'s "امتیاز —" slot doesn't read that data yet); within
the admin panel — user/customer management, order operations, reports, and an audit log (all
named but deliberately deferred in `panels-and-operations-spec.md` §4 — see ADR 30; discount
codes and seasonal themes/banners, also named there, are now built — see ADR 35, 36). The
database has placeholders for most of this
(see `docs/decisions.md` ADR 4, 6) so building it later doesn't require a schema rewrite.

## 3. Running it locally

```bash
npm install                  # also runs `prisma generate` via postinstall
cp .env.example .env         # then fill in DATABASE_URL / AUTH_SESSION_SECRET
npm run db:migrate           # applies prisma/migrations, or use `prisma migrate deploy` in prod
npm run db:seed              # City/Category/Product/ServiceOffering fake data
npm run dev
```

Requires a running MySQL/MariaDB instance reachable at `DATABASE_URL`. Generate a real
`AUTH_SESSION_SECRET` for anything beyond local dev (`openssl rand -base64 32`).

Other scripts: `npm run build` / `npm run start` (production), `npm run lint`,
`npm run db:studio` (Prisma Studio), `npm run db:seed` (safe to re-run — it upserts).

Mock OTP codes are printed to the server console (`[sms:console] to=... message="..."`) instead
of being sent by real SMS — see ADR 3.

## 4. Configuration — nothing below is hardcoded in code

| What | Where | Notes |
|---|---|---|
| SMS / storage / payment provider selection | `.env` (`SMS_PROVIDER`, `STORAGE_PROVIDER`, `PAYMENT_PROVIDER`) | Implementations live in `lib/providers/*.ts`. Only the mock/local implementation exists today; add a new class + one line in the relevant `get*Provider()` factory to go live. See ADR 3. |
| Session signing secret | `.env` (`AUTH_SESSION_SECRET`) | |
| Database connection | `.env` (`DATABASE_URL`) | A single `mysql://` connection string, both locally and on the deploy host — no driver-selection variable needed (see ADR 20; superseded the Postgres/Neon setup ADR 7, 16, and 18 described). |
| Active cities / categories (phase gating) | Database (`City.isActive`, `Category.isActive`) | Toggle from `/admin/catalog` (ADR 30) once an admin account exists, or via `npm run db:studio` directly either way. |
| AI extractor for the party wizard (future) | Database, `AiSettings` singleton row | Schema-only placeholder; nothing reads it yet. See ADR 4. |
| Party-wizard theme list | `config/party-wizard/themes.json` | Plain JSON, edit directly. Not consumed by any code yet (ADR 5) — the rule-based suggestion engine sprint wires this up. |
| Party-wizard budget allocation | `config/party-wizard/budget-allocation.json` | Same as above. |
| Party-wizard result text template | `config/party-wizard/result-template.txt` | Same as above. |
| Hub processing buffer, partner support contact block, express print fee, normal print turnaround days | Database, `PlatformSetting` key/value table | Seeded with defaults (`hub_min_days_before_event`, `partner_support_contact`, `print_express_fee`, `print_normal_turnaround_days`); no admin UI yet. |
| Printable balloon colors | Database, `PrintColor` table | Admin add/remove UI at `/admin/catalog` (ADR 32) - both the partner registration wizard and the customer order flow read this same list. |

## 5. Deployment target

cPanel with Node.js Selector / Phusion Passenger (per `docs/00-START-HERE.md` §2) — but the
host's own OS glibc is too old for Next.js's build tooling (native bindings *and* their WASM
fallback both fail there — see `docs/decisions.md` ADR 15). **The host never builds this
project.** A build happens elsewhere (GitHub Actions, or a developer machine) and only the
finished, self-contained output is deployed.

**How the artifact is built and shipped:** `next.config.ts` sets `output: "standalone"`, so
`next build` produces `.next/standalone` — a pruned bundle with only the runtime dependencies
actually used (no devDependencies, no build tools), plus a generated `server.js` that already
reads `PORT`/`HOSTNAME` from the environment (exactly what Passenger needs — no custom server
file required for this, unlike the earlier approach in ADR 11, which this supersedes). The
`postbuild` script (`scripts/prepare-standalone.sh`) copies `public/` and `.next/static/` into
that bundle (standalone mode deliberately omits them, expecting a CDN in front — we don't have
one, so this does it directly) and strips any `.env*` file Next's file tracer pulled in, since
it does this by default regardless of whether anything in it is actually needed at runtime.

`.github/workflows/deploy-build.yml` runs this whole build on a normal GitHub-hosted runner
(modern glibc, no issue there) on every push to the tracked branch, and force-pushes the
resulting `.next/standalone` contents as the entire, single-commit history of a `deploy`
branch — rewritten fresh each time, not accumulated, so that branch's size stays bounded. Set
the `NEXT_PUBLIC_SITE_URL` repository variable (Settings → Actions → Variables) once the real
domain is known — it's inlined into metadata/sitemap output at build time and otherwise falls
back to the same `http://localhost:3000` default local dev uses.

**cPanel "Setup Node.js App" settings:**

| Field | Value |
|---|---|
| Application root | a checkout of the `deploy` branch (not the branch with source code) |
| Application startup file | `server.js` |
| Application URL | the domain/subdomain for Viora |
| Application mode | Production (cPanel sets `PORT`; the generated `server.js` sets its own `NODE_ENV`) |
| Node.js version | any recent one — `deploy`'s `node_modules` are pre-built for Linux x64, not compiled on the host |

**Database — the host's own cPanel-provided MySQL (see ADR 20):** the whole Postgres/Neon setup
described in earlier ADRs (7, 16, 18 — a WebSocket driver, then an HTTP-only driver, to route
around this host's firewall blocking any international connection to AWS) is gone. cPanel's own
MySQL runs on the same machine as the app, so there's no firewall to route around and no
driver-selection variable to set — just point `DATABASE_URL` at it directly:

```
DATABASE_URL=mysql://<cpanel-db-user>:<password>@localhost:3306/<cpanel-db-name>
```

cPanel's "MySQL Databases" panel is where that user/database/password are created (cPanel
usually prefixes both the database name and the username with the cPanel account's own
username, e.g. `cpaneluser_viora`) — grant that user "ALL PRIVILEGES" on that one database.
`localhost:3306` is standard for a same-host MySQL; only change it if cPanel's panel says
otherwise for this specific host.

**On the host, after a new `deploy` branch build lands:** pull it, then just restart the app
from the Node.js Selector UI (or touch `tmp/restart.txt` if Passenger is configured for that
convention). No `npm install`, no `npm run build` — those already happened in CI. Database
migrations are a separate step — `npx prisma migrate deploy` against the real `DATABASE_URL`.
Unlike the Postgres/Neon setup this replaced, there's no reason this can't be run **from the
host itself** now (no cross-border connection needed) as well as from a developer machine or CI
— either works; the `deploy` branch's own stripped-down bundle still has no `prisma` CLI in it
either way (see below), so run it from a full checkout of the source branch, not from `deploy`.

**Locally, for testing production mode end to end:**

```bash
npm run build   # runs postbuild automatically -> .next/standalone is ready
npm run start   # node .next/standalone/server.js
```

**What's deliberately *not* in the `deploy` branch:** source files, devDependencies, the
`prisma` CLI and `prisma/` directory, `.env` — none of them are needed to run the already-built
app, and shipping them would just be dead weight (or, for `.env`, a real risk of leaking
whoever's machine built it). Runtime environment variables (`DATABASE_URL`,
`AUTH_SESSION_SECRET`, etc.) are set directly in cPanel's Node.js App panel instead.

## 6. Conventions

- Standard Next.js App Router / Prisma patterns, not clever tricks — see `docs/decisions.md`
  ADR 1 rationale. This project runs on **Next.js 16** and **Prisma 7**, both of which changed
  meaningfully from what most training data assumes (async `cookies()`/`params`, `proxy.ts`
  instead of `middleware.ts`, Prisma's driver-adapter + `prisma.config.ts` model, no
  auto-generate/auto-seed after `migrate dev`). Check `node_modules/next/dist/docs/` and
  `node_modules/prisma/../*/references/*.md` (installed by `prisma init`) before assuming an
  older API still applies.
- All amounts are Toman, stored as `Decimal` — always convert with `lib/decimal.ts`'s
  `toNumber()` before formatting or doing math.
- All user-facing numbers are formatted with `.toLocaleString("fa-IR")` for Persian digits —
  keep this consistent when adding new UI.
- New architectural decisions belong in `docs/decisions.md`, not just in a commit message.
