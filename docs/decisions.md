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

---

## 2026-09-09 — cPanel Passenger custom server

### 11. `server.js` custom server for production, `next start` dropped
**Decision:** Added `server.js` at the repo root — a plain CommonJS custom Next.js server
(`next({ dev })` + `http.createServer`) that listens on `process.env.PORT`, falling back to
`3000` when unset. `npm run start` now runs `NODE_ENV=production node server.js` instead of
`next start`. `npm run dev` is unchanged (`next dev`, for Fast Refresh).
**Why:** cPanel's Node.js Selector runs on Phusion Passenger, which starts the configured
"Application startup file" directly and assigns the app a port through the `PORT` env var at
launch — a different port each time, not necessarily `3000`. `next start` always binds to a
fixed `-p` value (`3000` by default) and has no supported way to read `PORT` itself, so it
can't be pointed at whatever port Passenger hands out. A custom server that explicitly reads
`process.env.PORT` is the documented Next.js pattern for exactly this ("Custom Server" guide,
`node_modules/next/dist/docs/01-app/02-guides/custom-server.md`).
**Why plain CommonJS (`require`), not the ESM `import` the Next.js docs example shows:**
`package.json` has no `"type": "module"`, so a `.js` file run directly by Node (unbundled,
unlike everything under `app/`/`lib/`, which Next's own compiler handles regardless of that
field) defaults to CommonJS. Making `server.js` the one ESM file in the project would need
either renaming it to `.mjs` or flipping `"type": "module"` for the whole package — a global
change with a wider blast radius than this one entry file needed. `require('next')` /
`require('node:http')` work identically to the ESM example and needed no other change, so that
was the smaller diff. `server.js` is also excluded from `eslint.config.mjs`'s lint targets
(alongside `.next/`, `out/`, etc.) since `@typescript-eslint/no-require-imports` otherwise
flags exactly this pattern — it's a root infra script, not application source.
**Verified:** built with `npm run build`, then ran `PORT=3005 NODE_ENV=production node
server.js` and confirmed it served `/`, `/home`, `/shop`, and `/wizard` (a static page, a
dynamic page, and two DB-backed dynamic pages) on that non-default port.
**Rejected:** `next start -p $PORT` wrapped in a shell script — `next start`'s `-p` flag does
take a value, but there is no built-in flag that reads `PORT` from the environment on its own;
some shape of wrapper reading `process.env.PORT` was unavoidable either way, and the officially
documented path is a custom server, not a shell wrapper around the CLI.
**Follow-up:** the cPanel "Setup Node.js App" panel itself (Application startup file, mode,
Node version) is outside this repo and must be set by whoever has panel access — the exact
values to use are documented in `docs/README.md` §5.

### 12. `prisma.config.ts` paths resolved from `__dirname`, not `process.cwd()`
**Decision:** `schema`, `migrations.path`, and the `seed` command in `prisma.config.ts` are all
built with `path.join(__dirname, ...)`. The `.env` load also switched from the cwd-relative
`import "dotenv/config"` to `dotenv`'s `config()` function called with an explicit
`path.join(__dirname, ".env")`.
**Why:** On cPanel's Node.js Selector (CloudLinux), `node_modules` is a symlink into
`~/nodevenv/<app>/<version>/lib/node_modules`, and running `npm install` through that
environment leaves `process.cwd()` pointed under the symlinked venv path rather than the real
project root by the time the `postinstall` script (`prisma generate`) runs. Plain relative
paths (`"prisma/schema.prisma"`) resolve against that wrong cwd and `prisma generate` fails
with "Could not find Prisma Schema". `__dirname` always points at the directory containing
`prisma.config.ts` itself (the real project root), independent of `process.cwd()`, which is
exactly the pattern Prisma's own monorepo docs use for the same reason (see
`.agents/skills/prisma-upgrade-v7/references/prisma-config.md`, "Monorepo Configuration").
**Also fixed the `.env` load for the same reason:** the original `import "dotenv/config"` loads
`.env` relative to `process.cwd()` too, so even after fixing the schema path, config loading
still failed under the same symlinked-cwd scenario with "Cannot resolve environment variable:
DATABASE_URL" (that env lookup happens while the config module loads, before any Prisma command
touches the datasource — so it broke `prisma generate` too, not just commands that need a live
connection).
**Verified:** ran `prisma validate` and `prisma generate` with `--config
/home/user/viora/prisma.config.ts` from `/tmp` as the working directory (reproducing the
symlinked-cwd scenario) — both succeeded and correctly loaded `.env` and the schema from the
real project root rather than failing or reading from `/tmp`.

---

## 2026-09-09 — postinstall still failed on cPanel after ADR 12; explicit `--schema` + loud config errors

### 13. `postinstall` passes `--schema` explicitly; `prisma.config.ts` fails loudly instead of silently
**Decision:**
1. `postinstall` is now `prisma generate --schema=./prisma/schema.prisma` instead of bare
   `prisma generate` — the schema path no longer depends on `prisma.config.ts` being
   successfully auto-detected and loaded for this one command.
2. `prisma.config.ts` no longer calls `loadEnv(...)` and `env("DATABASE_URL")` bare. It checks
   `loadEnv(...)`'s result and `console.warn`s if `.env` couldn't be read (distinguishing a
   merely-missing file, which is fine — see below — from a real read failure), and wraps
   `env("DATABASE_URL")` in a try/catch that `console.error`s a specific, actionable message
   before re-throwing.
**Why:** After ADR 12's `__dirname`-based fix, `npx prisma generate` run directly in a terminal
on the cPanel host loaded the config and worked correctly — but the identical binary, run as
`postinstall` through npm's own lifecycle-script wrapper (`sh -c "prisma generate"`), still
failed with "Could not find Prisma Schema". Confirmed both invocations use the same
`node_modules/.bin/prisma`, so this is not the cwd/symlink issue ADR 12 fixed (that already
proved cwd-independent from a terminal). The remaining plausible explanation: something about
npm's lifecycle-script execution environment makes `prisma.config.ts` itself fail to load in
that context specifically, and Prisma's CLI falls back to its own legacy schema-discovery (which
*is* cwd-relative) when config loading fails — reproducing exactly this symptom. `generate`
doesn't need `datasource.url`, only the schema location, so giving `--schema` explicitly lets it
succeed regardless of whether config loading works in that environment. This doesn't fix
`prisma.config.ts` loading itself (still needed by `migrate deploy`, `db seed`, `studio`, which
all need `datasource.url` and can't take a `--schema`-only shortcut around that) — hence the
second change: if config loading breaks the same way for one of *those* commands on this host
one day, the failure should say so plainly instead of resurfacing as an unrelated-looking
schema error someone has to re-diagnose from scratch.
**Why warn (not throw) on a merely-missing `.env`, but throw on a missing `DATABASE_URL`:** a
missing `.env` file is an expected, healthy state on a deployed host where the environment
variables are set directly in the hosting panel (cPanel's "Setup Node.js App" supports this)
rather than committed to a file. Throwing there would fail deployments that are configured
correctly. `DATABASE_URL` actually being unresolved, from either source, is unrecoverable for
every Prisma command this config file serves, so that's the one condition worth failing loudly
and immediately on.
**Verified:**
- `npm run postinstall` (exercises npm's own `sh -c` lifecycle wrapper, not a direct `prisma`
  invocation) regenerates the client correctly.
- `DATABASE_URL="" prisma generate --config prisma.config.ts` prints the new clear
  `[prisma.config.ts] DATABASE_URL is not set...` message ahead of Prisma's own generic error,
  and exits `1`.
- Temporarily moving `.env` aside and supplying `DATABASE_URL` only via the process environment
  logs the "No .env file... relying on process.env only" warning and still succeeds (`prisma
  validate` exits `0`) — confirms the panel-injected-env-vars deployment shape isn't broken by
  this change.
- Full `npm run build` + `npm run lint` + `prisma migrate status` still pass clean after both
  changes.
**Open question, flagged rather than guessed at:** *why* `prisma.config.ts` loading itself
would behave differently under npm's lifecycle-script wrapper versus a direct terminal
invocation of the same binary was not root-caused here — only worked around for `generate`
specifically and made loud for everything else. If the loud error from change 2 ever actually
fires on the cPanel host, that log is the next debugging lead.
