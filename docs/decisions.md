# Architecture Decision Records (ADR)

> Format: what was decided, why, what alternatives were rejected. Newest entries at the bottom.
> This log exists so a future developer or AI (not necessarily Claude) can understand *why* the
> code looks the way it does, not just *what* it does. Add a new entry whenever a meaningful
> architectural choice is made — don't just silently change course.

---

## 2026-09-08 — Sprint 0: project skeleton

### 1. Monorepo shape: single Next.js app, no separate backend
**Decision:** One Next.js (App Router, TypeScript) project at the repo root, using Next.js
route handlers for API endpoints. No separate Express/NestJS backend.
**Why:** `project-plan-v1.md` §7 explicitly asks for this ("تک‌ریپازیتوری، مدیریتش برای
Claude Code ساده‌تره") and it matches the cPanel Node.js Selector deploy target from
`00-START-HERE.md` §2 (single Node process, no Vercel-only features).
**Rejected:** Separate API service — adds deploy complexity for no benefit at this stage.

### 2. Auth: custom phone+OTP flow instead of NextAuth
**Decision:** Hand-rolled OTP auth (`/api/auth/otp/request`, `/api/auth/otp/verify`) backed by
an `OtpCode` table, with a signed JWT session cookie (via `jose`) read in `middleware.ts`.
**Why:** `sprint-0-brief.md` §2 calls for phone/OTP as the primary auth method ("رایج‌تر برای
بازار ایران"), not email/password or OAuth. NextAuth's credential/OTP support is possible but
adds a dependency and abstraction layer for a flow simple enough to own directly, and full
control keeps the mock→real SMS swap (see ADR 3) trivial.
**Rejected:** NextAuth.js — would need a custom Credentials provider anyway to get OTP
semantics right, so it didn't buy much.

### 3. Provider abstractions: SMS, Storage, Payment
**Decision:** Three narrow interfaces in `src/lib/providers/`: `SmsProvider`, `StorageProvider`,
`PaymentProvider`. Sprint 0 ships a `ConsoleSmsProvider` (console.log), `LocalDiskStorageProvider`,
and `MockPaymentProvider`. Selection happens in one factory file per provider, driven by env vars.
**Why:** Explicitly required by `sprint-0-brief.md` §2 and `00-START-HERE.md` §2 — SMS must be
mockable now and swappable to a real Iranian SMS service later without touching call sites;
storage must move from local disk to S3-compatible (Liara/Arvan) later; payment must move to a
real PSP with split-payment (تسهیم وجوه) later. Isolating each behind one interface means that
swap is a new implementation file + one factory line, not a codebase-wide search-and-replace.
**Rejected:** Wiring a real SMS/payment SDK now — out of scope for Sprint 0 per the brief, and
premature since the PSP choice itself is still open (`project-plan-v1.md` §2 legal note).

### 4. AI Extractor (`AIExtractorProvider`) — deferred, not built this sprint
**Decision:** No `AIExtractorProvider` code or admin UI in Sprint 0. The Prisma schema includes a
placeholder `AiSettings` singleton table (apiUrl, apiKey, modelName) so the column shape exists,
but nothing reads or writes it yet.
**Why:** `sprint-0-brief.md` §1 explicitly puts "منطق کامل موتور جشن‌ساز" and "پنل کامل ادمین"
out of scope for this sprint, and the Build My Party flow this sprint is the plain multi-step
form (no free-text/AI extraction) per `sprint-0-brief.md` §5. Building the abstraction now, with
no caller and no admin UI to configure it, would be dead code. `party-wizard-engine-spec.md` §6
describes the intended shape for whenever that sprint happens.
**Follow-up:** When the rule-based wizard engine sprint starts, implement `AIExtractorProvider`
against `AiSettings`, and fall back to the plain multi-step form whenever `apiUrl`/`apiKey` are
empty (per `00-START-HERE.md` §2 — the wizard must never hard-fail).

### 5. Budget-allocation table, theme table, and text templates: seeded but not wired
**Decision:** Transcribed the theme table and budget-allocation percentages from
`party-wizard-engine-spec.md` §2–§4 into `/config/party-wizard/themes.json` and
`/config/party-wizard/budget-allocation.json` as plain, hand-editable JSON (per the doc's own
request: "فقط یه فایل متنی رو ویرایش می‌کنی"). No code reads these yet.
**Why:** Cheap to seed now while the source data is on hand, keeps config out of code from day
one as `00-START-HERE.md` §0.5 requires, but the rule-based suggestion engine that consumes them
is explicitly next-sprint work, so no consuming code was added this sprint.

### 6. Multi-vendor order state machine: modeled at `OrderItem` level
**Decision:** `Order.orderType` is `SINGLE_SELLER | MULTI_SELLER`. For multi-seller orders, each
`OrderItem` carries a nullable `hubStatus` (`PENDING_SELLER_SHIPMENT → RECEIVED_AT_HUB →
QUALITY_CHECK → FINAL_SHIPPED`), since each seller ships to the Viora hub independently per
`panels-and-operations-spec.md` §1.
**Why:** The state machine is per-seller-shipment, not per-order (different sellers reach the hub
at different times). Tracking it on `OrderItem` lets the (future) admin hub-ops screen show
per-shipment status while `Order.status` stays a simple customer-facing summary.
**Rejected:** A single order-level hub status — would lose per-seller granularity needed for the
admin "processing center" view described in `panels-and-operations-spec.md` §4.

### 7. `User.roles` as a Postgres scalar array, not a join table
**Decision:** `User.roles Role[]` (native Postgres array of the `Role` enum) instead of a
`UserRole` join table.
**Why:** `sprint-0-brief.md` §4 requires "نقش چندگانه پشتیبانی بشه" (multiple roles per user).
A scalar array is sufficient — roles have no per-assignment metadata (no `assignedAt`, no
per-role status) — and Prisma/Postgres support it natively, so a join table would be pure
overhead. If roles ever need metadata, this can migrate to a join table then.

### 8. SEO: no third-party Claude Code plugin marketplace installed
**Decision:** Did **not** run `/plugin marketplace add AgriciDaniel/claude-seo` /
`/plugin install claude-seo@agricidaniel-claude-seo` as literally suggested in
`sprint-0-brief.md` §3. Instead, applied the SEO practices that plugin is meant to encourage
directly: Next.js `generateMetadata` on every page, `sitemap.ts`/`robots.ts` route handlers,
JSON-LD (`Organization`, `Product`) structured data, and server-rendered content by default
(no unnecessary `"use client"` on content pages).
**Why:** Installing a third-party plugin marketplace from an individual GitHub account pulls in
and trusts code this session cannot audit, purely to get generic SEO advice that's well-known and
implementable directly. The *outcome* the brief wants (good technical SEO on every page) is fully
achieved without that supply-chain exposure.
**Follow-up:** If the project owner specifically wants that plugin's ongoing linting/review
workflow, they can install it themselves from the Claude Code CLI — a deliberate human action
rather than something done silently during an automated build.

### 9. Guest browsing allowed; auth only required for checkout/profile actions
**Decision:** Home/Shop/product pages and the Build My Party wizard are browsable without login.
The `/cart` checkout step and any personalized `/profile` action redirect to `/auth` if there is
no session.
**Why:** Not specified explicitly either way in the package. Standard marketplace UX (and better
for SEO — indexable product pages must not sit behind auth). Recorded here per `00-START-HERE.md`
§4 ("instead of assuming, ask or record the assumption explicitly for the user to confirm later").
**Please confirm:** if the intent is actually to gate the whole app behind login from Splash
onward, say so and this will change.

### 10. Local dev database
**Decision:** Sprint 0 assumes a local PostgreSQL reachable via `DATABASE_URL` in `.env` (see
`.env.example`). No Docker Compose file was added.
**Why:** Keeps Sprint 0 minimal; the brief only asks for "اتصال به PostgreSQL محلی (برای تست)".
A `docker-compose.yml` for Postgres can be added on request if local Postgres installs are
inconvenient for the team.
