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

---

## 2026-09-09 — actual root cause found: `postinstall` runs with the wrong `cwd` on this host

### 14. `postinstall` restores the real project directory via `$INIT_CWD` before running `prisma generate`
**Decision:** `postinstall` is now `cd "$INIT_CWD" && prisma generate` — no `--schema` flag
(reverting ADR 13's workaround, now unnecessary — see below).
**Why — the actual root cause, confirmed on the host:** on this cPanel deployment
(CloudLinux's Node.js Selector), `node_modules` is a symlink into
`~/nodevenv/<app>/<version>/lib/node_modules`. When npm runs the `postinstall` lifecycle
script, the shell subprocess's `cwd` ends up as `~/nodevenv/.../lib` — **not** the real project
root — even though the project root is where `npm install` was actually invoked from. That one
fact explains everything ADR 12 and ADR 13 were reacting to without being able to fully
explain: Prisma's own discovery of `prisma.config.ts` (an upward directory search starting from
`cwd`) never finds it, because that symlinked venv path isn't an ancestor of the real project
directory in the filesystem at all — so Prisma falls back to its legacy schema search, which is
also `cwd`-relative, and fails the same way. This is *not* a Prisma bug and *not* fixable from
inside `prisma.config.ts` (ADR 12's `__dirname` fix only helps once the config file is already
found and loaded — it does nothing for Prisma's own search step that has to locate that file in
the first place). ADR 13's explicit `--schema=./prisma/schema.prisma` didn't fix this either,
for the identical reason: that path is also resolved against the same wrong `cwd`.
**Why `$INIT_CWD` is the right fix:** npm sets the `INIT_CWD` environment variable for every
script it runs to the directory `npm install` (or `npm run ...`) was originally invoked from —
captured once at npm's own startup, before any internal directory changes npm or its
environment wrapper make afterward. `cd "$INIT_CWD"` before invoking `prisma` restores the real
project root as `cwd` for that command specifically, which fixes Prisma's own config-discovery
search directly rather than working around it — so the plain `--schema`-less `prisma generate`
(and, implicitly, its normal `prisma.config.ts`-driven behavior) now runs exactly as if invoked
from a terminal in the project root, which is what ADR 13 observed already worked correctly.
**Why ADR 13's `--schema` flag is no longer needed:** it was solving a narrower version of this
same problem for `generate` alone (which doesn't need `datasource.url`). Fixing `cwd` itself is
strictly more complete — it also fixes `prisma.config.ts` discovery for any other Prisma command
that might ever run in this same lifecycle-script context and *does* need `datasource.url`
(`migrate deploy`, `db seed`, etc.), which the `--schema` workaround never could.
**Verified:** reproduced the exact failure and the fix locally by simulating the reported
environment — ran, from a throwaway directory standing in for `~/nodevenv/.../lib`, with
`INIT_CWD` set to the real project root and `PATH` including its `node_modules/.bin` (matching
what npm sets up for a lifecycle script):
- `INIT_CWD=/home/user/viora PATH=.../node_modules/.bin:$PATH sh -c 'prisma generate
  --schema=./prisma/schema.prisma'` (ADR 13's form) → failed: `Could not load --schema from
  provided path 'prisma/schema.prisma': file or directory not found` — confirming that
  workaround genuinely breaks under a wrong `cwd`, not just in theory.
- The same setup with `sh -c 'cd "$INIT_CWD" && prisma generate'` (this ADR's form) →
  succeeded: config and schema both loaded from the real project root, client generated.
- `npm run postinstall`, `npm run build`, `npm run lint`, and `prisma migrate status` from the
  normal project root all still pass clean (`INIT_CWD` equals the project root in the ordinary
  case, so the added `cd` is a no-op there).
**Not changed:** `db:migrate`, `db:seed`, `db:studio`, and `start` are untouched. Nothing
reported a `cwd` problem for those, and unlike `postinstall` they're run manually (from an SSH
session or cPanel terminal already sitting in the project directory), not by npm's own
lifecycle-script machinery — so there's no reason to believe they hit the same wrapper-induced
`cwd` remapping. If one of them ever does, the fix is the same one-line pattern.

---

## 2026-09-09 — the host can't build at all; build elsewhere, ship the artifact

### 15. `output: "standalone"` + a CI-built `deploy` branch; ADR 11's custom `server.js` retired
**Decision:**
1. `next.config.ts` sets `output: "standalone"`. `next build` now produces `.next/standalone` —
   a pruned bundle containing only the runtime dependencies actually used, plus a Next-generated
   `server.js` that already reads `PORT`/`HOSTNAME` from the environment.
2. `server.js` at the repo root (ADR 11) is deleted. It existed for exactly one reason — making
   a production server honor Passenger's `PORT` — and the standalone bundle's own generated
   `server.js` already does that natively, so keeping a second, parallel "how do we serve this
   app in production" mechanism around would just be confusing dead weight.
3. `scripts/prepare-standalone.sh` (wired up as the `postbuild` npm script, so `npm run build`
   always leaves a ready-to-run bundle) copies `public/` and `.next/static/` into
   `.next/standalone` — standalone mode deliberately omits them, expecting a CDN in front — and
   strips any `.env*` file Next's tracer copied in (see the security note below).
4. `.github/workflows/deploy-build.yml` runs this whole build on a normal GitHub-hosted runner
   on every push, and force-pushes the resulting `.next/standalone` as the entire history of a
   `deploy` branch (an orphan commit each run, not accumulated — keeps that branch's size
   bounded instead of growing forever).
5. `docs/README.md` §5's cPanel instructions now point at deploying a checkout of the `deploy`
   branch, with `npm install`/`npm run build` removed from the host-side steps entirely.
**Why:** the cPanel host's OS glibc is old enough that Next.js's build tooling fails two ways in
a row — the platform-specific native bindings (SWC, lightningcss, Tailwind v4's Oxide engine)
fail to load, *and* Next's own WASM fallback for the same tooling also crashes (reported
symptom: a `Cannot read properties of null (reading 'useContext')` crash while prerendering
Next's internal `/_global-error` page). This is unambiguously a **build-time** failure in
Rust-based compiler tooling, not a runtime problem — once code is compiled to plain JS, running
it needs nothing but Node.js itself, which already works fine on this host today (it's running
the current Passenger-managed app). So the fix is to never let this host build at all, and ship
it something that's already fully compiled.
**Why `output: "standalone"` specifically, not "commit the raw `.next` folder + still run `npm
install` on the host"** (the literal shape of what was asked for): a raw `.next` folder still
needs the *full* `node_modules` tree installed on the host to run (`next start`'s own
documented requirement before Output File Tracing existed) — meaning `npm install` would still
pull in the same native-binary-bearing build tools (Tailwind's Oxide engine, `@next/swc-*`,
etc.) that caused the original problem, just shifted from "fails during build" to "maybe fails
during install, or ships dead risk if it doesn't." Standalone's traced bundle only contains
what the compiled server code actually `require()`s at runtime, which the driver-adapter model
already made pointedly small for this project — see the next paragraph. Committing a full
`.next` folder as regular ongoing history is also just bad git hygiene (large, binary-ish,
churns every deploy, doesn't diff or compress meaningfully) — standalone's *pruned* bundle on
its own dedicated, rewritten-not-accumulated branch avoids that too.
**A confirmed nice side effect of ADR 3's driver-adapter choice:** the traced `node_modules`
does still include `sharp` (Next bundles it defensively for `next/image`'s optimizer, whether or
not a project uses it) and its native `@img/sharp-linux-x64` binding — but this project's own
code has zero `next/image` usage (checked: `grep -rn "next/image" app components lib` — no
matches), and Node never loads a native addon file that nothing `require()`s, so that binding
just sits there unused rather than becoming the exact same class of failure one level down. If
`next/image` usage is ever added, this is worth re-checking on the actual host, or set
`images.unoptimized = true` to remove the concern outright. Separately: Prisma 7's driver
adapters (ADR 3) mean `@prisma/client`'s generated code has **no native or WASM query engine at
all** in its runtime path — the entire original class of problem (native bindings vs. old
glibc) that this ADR is about doesn't even apply to Prisma at request-handling time, only to
Next's own build compiler. That was a pre-existing choice, not made for this reason, but it
matters here.
**Security note — `.env` gets traced into `.next/standalone` by Next itself:** verified by
building locally: whatever `.env` exists in the project root at build time is copied verbatim
into `.next/standalone/.env`, regardless of whether anything in it is actually read by traced
code. Left alone, this would silently ship whoever's machine (or CI run) produced the build's
own `DATABASE_URL`/`AUTH_SESSION_SECRET` into a public, force-pushed git branch. This is why
`prepare-standalone.sh` explicitly deletes `.next/standalone/.env*` after copying static assets
— every build strips it, not just a one-time manual cleanup.
**Why a CI-built `deploy` branch over other artifact-transport options considered:**
- *Commit `.next`/standalone output to the same branch as source, as literally asked* — rejected
  per the git-hygiene point above; a dedicated, rewritten branch keeps build output out of the
  project's real history entirely.
- *A GitHub Release tarball instead of a branch* — arguably even better git hygiene (release
  assets are explicitly for binary artifacts and never touch any branch's object history at
  all), and worth switching to later. Not chosen now because it needs an extra
  download/extract step on the host that a plain `git pull`/checkout doesn't, for a project
  that's still finding its deployment footing — the branch approach was the smaller change for
  the immediate need.
- *A GitHub Actions step that `rsync`/`scp`s straight to the host* — the actually ideal
  end-state (fully automated, nothing for a human to manually pull), and explicitly worth doing
  once cPanel SSH/deploy-key access is available to wire into repository secrets. Not set up
  here because it needs credentials only the account holder can provide — this ADR's approach
  needs none beyond the workflow's own default `GITHUB_TOKEN`.
**Verified:** built locally with `output: "standalone"` and ran the exact `npm run build && npm
run start` flow — `postbuild` correctly produced and populated `.next/standalone` (public
assets, static chunks, `.env` absent from the result), and the resulting `node .next/standalone/
server.js` served `/`, `/home`, `/shop`, `/shop/product/[slug]`, `/wizard`, `/profile`,
`/robots.txt`, and a static asset — all `200` — while honoring a non-default `PORT`, matching
(and replacing) the coverage ADR 11 verified for the retired custom server. Also confirmed the
node_modules bundle is ~71MB / 27 top-level packages, a large reduction from a full install.
**Not done here:** actually configuring cPanel to pull from `deploy` instead of the source
branch, and setting the `NEXT_PUBLIC_SITE_URL` repository variable — both need the account
holder's access to the cPanel panel and the GitHub repo settings respectively. `docs/README.md`
§5 documents exactly what to set.

---

## 2026-09-09 — confirmed live: the 5432 block breaks the running app too, not just migrations

### 16. Runtime queries go through Neon's serverless driver on the deploy host — `DATABASE_DRIVER` switch
**Decision:** `lib/prisma.ts` now picks which driver adapter `PrismaClient` uses based on a new
`DATABASE_DRIVER` env var — `"pg"` (`@prisma/adapter-pg`, direct TCP, port 5432, default,
unchanged behavior) or `"neon"` (`@prisma/adapter-neon` + `@neondatabase/serverless`, tunnelled
over WebSocket/HTTPS, port 443). Both adapters are imported unconditionally at the top of the
file; only which one gets *instantiated* is conditional, so the module stays a plain synchronous
singleton — no call site anywhere else in the app changed. `neonConfig.webSocketConstructor =
ws` is set unconditionally too (harmless when unused — it only configures the neondatabase
package, which does nothing unless a Neon adapter is actually built) rather than gated behind
the driver check, since Node.js versions before 22 have no built-in `WebSocket` global and this
project's stated minimum is 20.9+ (see `docs/README.md` §6).
**Why now, confirmed rather than anticipated:** the earlier Neon conversation (the session note
right before ADR 14) flagged that the deploy host's firewall blocking port 5432 would eventually
also break the *running app's* queries, not just `prisma migrate deploy` — this is that
prediction landing for real. Confirmed report: `POST /api/auth/otp/request` was returning
`ERR_EMPTY_RESPONSE` in production, because the request handler's attempt to open a direct
Postgres connection on 5432 was being silently dropped by the same firewall ADR 14 first hit
during migrations.
**Why an env-switched adapter instead of just replacing `@prisma/adapter-pg` outright:** local
dev (and any future host that *can* reach Postgres directly) has no reason to pay for an extra
WebSocket hop to a proxy when a plain TCP connection works and is simpler to reason about
locally (no `ws` dependency in the request path, ordinary `pg` error messages). This also
follows the same pattern already established for `SMSProvider`/`StorageProvider`/
`PaymentProvider` (ADR 3): one small, explicit env-driven switch, not a silent runtime
auto-detect based on e.g. sniffing the `DATABASE_URL` hostname for `neon.tech`.
**Pooled vs. direct Neon connection string for `DATABASE_URL` here:** use the **pooled** one for
this (the live, per-request query path — exactly Neon's pooler's purpose), not the **direct**
one ADR 14 uses for `prisma migrate deploy`. They're different connection strings for different
jobs; `docs/README.md` §5 spells out which goes where so this isn't lost.
**Verified against the real Neon database, from this same network-restricted environment (which
blocks outbound 5432 exactly like the deploy host does, confirmed in the earlier Neon
conversation):**
- A raw `$queryRaw` round-trip through `PrismaNeon` succeeded (~1.8s, first-connection
  WebSocket handshake cost) where a direct `pg`/TCP connection to the same database from this
  same environment had already been proven to fail outright.
- A full ORM-level nested write (`prisma.category.create` with a nested `children: { create:
  [...] }` sub-record, the same shape `/api/checkout` uses for `Order` + `OrderItem`) succeeded
  and was cleaned up afterward — confirms the adapter handles Prisma's implicit-transaction
  nested writes, not just single flat queries.
- Ran the actual `.next/standalone/server.js` (the exact artifact the `deploy` branch ships)
  with `DATABASE_DRIVER=neon` and the pooled `DATABASE_URL`, and called the real, previously-
  failing endpoint end to end: `POST /api/auth/otp/request` returned `200 {"ok":true,...}`,
  meaning it wrote a live `OtpCode` row to the real database over the WebSocket path. The test
  row was deleted afterward.
**A concern raised and then resolved during verification, not swept past:** `@prisma/adapter-
neon`, `@neondatabase/serverless`, and `ws` are all *absent* from `.next/standalone/
node_modules` even after a full rebuild — worth checking rather than assuming ADR 15's tracing
was broken by this change, since the whole point of that ADR was a working standalone bundle.
Investigated: unlike `pg` (which has dynamic/conditional `require()`s inside its own code for
optional native/Cloudflare paths, so Turbopack must leave it as a real external `require()` that
needs the actual files present at runtime), the Neon packages have no such dynamic requires, so
Turbopack inlines their code directly into the compiled server chunks — confirmed by finding
`@neondatabase/serverless`'s own error-message strings baked into `.next/server/chunks/ssr/
*.js`. The standalone-server test above proves this conclusively in practice: it ran the real
Neon query path successfully with those `node_modules` entries entirely missing. Nothing to fix
here — recorded so a future "why isn't neon in node_modules" investigation doesn't restart from
scratch.

---

## 2026-09-09 — CI hit the same "Cannot resolve environment variable: DATABASE_URL" once for real

### 17. `DATABASE_URL` secret set on the `npm ci` step too, not just the explicit `prisma generate` step
**Decision:** `.github/workflows/deploy-build.yml`'s "Install dependencies" step (`npm ci`) now
also sets `DATABASE_URL: ${{ secrets.DATABASE_URL }}` in its own `env:` block, using a real
GitHub Actions secret rather than the placeholder string that step's sibling steps used before.
**Why:** `npm ci` runs the project's own `postinstall` script automatically as part of install -
that script is `cd "$INIT_CWD" && prisma generate` (ADR 14), which means `prisma.config.ts`'s
eager `DATABASE_URL` check (ADR 13) was already firing *inside the "Install dependencies" step*,
before the workflow ever reached its separate, explicit "Generate Prisma client" step further
down - which is the step that actually had a `DATABASE_URL` value set. The install step had
none, so it failed with exactly the error ADR 13 was written to make loud and specific:
"Cannot resolve environment variable: DATABASE_URL" - now surfacing in CI instead of on the
cPanel host, for the identical underlying reason (a Prisma command running with no resolvable
`DATABASE_URL` in its environment). The explicit "Generate Prisma client" step was kept
alongside the now-redundant postinstall run rather than removed - a second `prisma generate` is
a harmless no-op, and a separately named CI step gives a clear, individually-diagnosable
checkpoint in the log rather than relying on a lifecycle script's success being noticed only
via a later step's failure, which is exactly the confusion that led to this ADR.
**Why the real secret instead of another placeholder:** the account holder added a `DATABASE_URL`
repository secret specifically for this. Using it everywhere `prisma.config.ts` gets loaded in
this workflow (install, explicit generate, and the build step, which never actually touches
`prisma.config.ts` itself but is set for consistency) is simpler than maintaining a separate
"this one's intentionally fake" placeholder alongside it, and carries no downside: `prisma
generate` never opens a real connection regardless of which string it's given, and GitHub's
hosted runners (unlike this project's own build-time constraints) have no trouble reaching
Postgres on port 5432 even if something eventually did.

---

## 2026-09-09 — the host blocks WebSocket too; ADR 16's "neon" mode doesn't reach it either

### 18. `"neon-http"` driver added; `verifyOtp` and checkout rewritten to not need a transaction
**Decision:**
1. `lib/prisma.ts` gains a third `DATABASE_DRIVER` option, `"neon-http"`, using
   `PrismaNeonHttp` (also exported by `@prisma/adapter-neon`, alongside the `PrismaNeon` ADR 16
   already uses) — plain HTTPS POST requests via `@neondatabase/serverless`'s `neon()` function,
   no WebSocket Upgrade at all.
2. `lib/auth/otp.ts`'s `verifyOtp` no longer calls `prisma.user.upsert()` — it now calls a new
   `findOrCreateUserByPhone` helper that does a plain `findUnique`, then `create` on a miss,
   with a `P2002`-unique-constraint-race fallback that re-reads instead of assuming failure.
3. `app/api/checkout/route.ts` no longer creates `Order` and its `OrderItem`s as one nested
   write — it creates the `Order` first, then each `OrderItem` in a sequential loop.
**Why:** ADR 16 verified `PrismaNeon` (WebSocket mode) worked from a sandbox that blocks TCP
port 5432 but allows a WebSocket Upgrade. The actual cPanel deploy host is more restrictive
than that sandbox: it blocks the Upgrade too, confirmed by a live failure there —
`AggregateError { code: 'ETIMEDOUT', _url: 'wss://…/v2' }` — while plain HTTPS from the same
host works fine (that's how its own `npm install` reaches the npm registry). So the firewall
isn't blocking "port 5432" or even "port 443 to Neon" as such - it's specifically filtering the
WebSocket Upgrade handshake, a common pattern for restrictive outbound firewalls/proxies that
allow ordinary request/response HTTPS but not long-lived bidirectional connections. `neon-http`
is genuinely indistinguishable from any other HTTPS POST to that kind of filter, which is
exactly why it was worth adding as its own mode rather than trying to coax the WebSocket path
through some other transport.
**Why `verifyOtp` and checkout needed real code changes, not just a driver swap:** `PrismaNeonHttp`
implements Prisma's transaction interface as `startTransaction() { return Promise.reject(new
Error("Transactions are not supported in HTTP mode")) }` — a hard, unconditional rejection, not
a degraded-but-working mode. Both `prisma.X.upsert()` and a nested `create` (`items: { create:
[...] }`) compile to an implicit transaction under Prisma's current query engine regardless of
which model or how simple the write looks, so both broke immediately under `neon-http` — this
was *not* obvious from either operation's own shape and is recorded here so nobody has to
rediscover it by trial and error:
- `prisma.user.upsert({ where: { phone }, update: {}, create: {...} })` — a single-model,
  single-row operation with no visible relations — still requires a transaction internally.
  Verified directly: an isolated call to just this line, under `neon-http`, throws the same
  "Transactions are not supported in HTTP mode" error a nested multi-table write does.
- A nested `Order` + `items: { create: [...] }` write behaves the same way, as expected.
**The fixes, and what each one costs:**
- `findOrCreateUserByPhone` trades `upsert`'s single-round-trip atomicity for two round trips in
  the common case (existing user) and up to three on the rare race (`findUnique` → `create` →
  P2002 → `findUnique` again). This is the account-login path, called once per OTP verification,
  so the extra latency is a non-issue; a genuine race requires two concurrent first-ever
  verifications for the exact same brand-new phone number, handled explicitly rather than
  assumed away.
- The checkout rewrite trades the nested write's atomicity for working under every driver mode:
  a crash between the `Order` create and the `OrderItem` loop finishing would now leave an Order
  with fewer items than it should have, where the nested-write version couldn't do that (the DB
  would reject the whole write). No compensating fix was added for this (no raw-SQL
  `sql.transaction()` bypass of Prisma to restore atomicity under `neon-http` specifically) -
  checkout in Sprint 0 is explicitly a skeleton with a fully mocked payment step (see the
  Sprint 0 docs and `docs/README.md` §2), not a real-money path yet, so this was judged an
  acceptable, clearly-documented trade-off for now rather than a case for hand-written
  transaction-batching SQL. Revisit if/when checkout becomes a real-money flow.
**Verified against the real Neon database, through the actual compiled `.next/standalone/
server.js` artifact with `DATABASE_DRIVER=neon-http`** (not just unit-style calls against the
adapter directly):
- Full login round trip end to end: `POST /api/auth/otp/request` → `POST /api/auth/otp/verify`
  → the returned session cookie → `GET /profile` rendered the correct phone number, proving a
  real session was issued for a real (fixed) user lookup/creation, not just that the request
  didn't 500.
- Full checkout round trip: seeded a throwaway City/Category/Seller/Product directly against
  Neon, called the real `/api/checkout` endpoint with the authenticated session from the step
  above, got `200 { ok: true, orderId }`, and confirmed via `/profile`'s order history that the
  order showed the correct total (2 × a 150,000 Toman product = 300,000) and status - meaning
  the sequential `OrderItem` creation actually produced correct data, not just a non-error.
  All seeded/test rows deleted afterward; the Neon database's row counts confirmed back at zero.
- Regression-checked `DATABASE_DRIVER=pg` (local Postgres) still completes the same OTP
  request→verify round trip correctly after the `findOrCreateUserByPhone` rewrite.
**Not investigated further:** *why* this specific host's firewall distinguishes a WebSocket
Upgrade from other HTTPS traffic wasn't root-caused (deep packet inspection, a proxy that
strips `Upgrade` headers, and an explicit protocol allowlist are all plausible and behave
identically from the outside) - `neon-http`'s success is the operationally relevant fact.

## 2026-09-09 — same `wss://…/v2 ETIMEDOUT` reported again with `DATABASE_DRIVER=neon-http` set

### 19. Startup logging + defensive `.trim()` added to `lib/prisma.ts`'s driver selection
**Decision:** `createAdapter()` now (1) trims `process.env.DATABASE_DRIVER` before comparing it
against `"pg"`/`"neon"`/`"neon-http"`, and (2) unconditionally `console.log`s both the raw and
trimmed value, plus which adapter class it picked, before returning it. No behavior changed for
a correctly-set env var - this is diagnostics plus one tolerance fix.
**Why:** After ADR 18 shipped (commit `0ef810a` on `deploy`), the exact same live
`wss://…/v2 ETIMEDOUT` was reported again, this time with `DATABASE_DRIVER=neon-http` reportedly
set explicitly for the `node server.js` process. Re-audited everything that could cause this:
- `driver === "neon-http"` in `lib/prisma.ts`: compared correctly, no case/typo bug.
- `PrismaNeonHttpAdapterFactory.connect()`, read directly from the installed
  `node_modules/@prisma/adapter-neon/dist/index.js` (v7.10.0): calls only
  `neon.neon(this.connectionString, this.options)` - the plain-HTTP function. It never
  constructs `Pool`/`Client` or touches `neonConfig.webSocketConstructor`. Only
  `PrismaNeonAdapterFactory.connect()` (the `"neon"` driver, a different code path entirely)
  calls `new neon.Pool(...)`, which is what actually opens the WebSocket.
- Repo-wide grep for `neonConfig`, `@neondatabase/serverless`, `PrismaNeon`, `new Pool`,
  `webSocketConstructor`, `wss:` outside `lib/prisma.ts`: no hits in any app code. No
  `proxy.ts`/`middleware.ts`/`instrumentation.ts` exists that could run this at the edge or
  build a second client.
- Empirically re-verified locally (`tsx`, no build step): setting `DATABASE_DRIVER=neon-http`
  and importing `lib/prisma.ts` logs `using PrismaNeonHttp (plain HTTPS, no WebSocket)` and
  constructs the client with no WebSocket involved, exactly as the source predicts.
So the driver-selection code itself is not the bug. One real gap was found and fixed: a value
with trailing whitespace (a stray `\r` from a CRLF paste into a config field is the realistic
case) fell through every `===` branch silently-ish before this change, throwing a confusing
"Unknown DATABASE_DRIVER" *if construction ran at all* - `.trim()` now tolerates that. Verified:
`DATABASE_DRIVER="neon-http\r"` now resolves and logs as `neon-http`, where it previously would
not have matched any branch.
**What this doesn't rule out, and why logging (not a silent guess) was the right fix:** with the
code itself clean, the remaining explanations are operational, not something readable from this
repo - a Passenger worker process still running from *before* the ADR 18 deploy (Passenger
reuses spawned processes; a code+env change needs an actual restart, not just a new request), a
persistent `DATABASE_DRIVER=neon` left over from ADR 16 in cPanel's own "Setup Node.js App" env
var panel (which governs the *live* Passenger-served process regardless of what a manual SSH
`node server.js` test showed), or a `.env` file on the host itself still carrying the old value
(the `deploy` branch never ships one - see ADR 15 - but nothing stops one existing on the host
from an earlier manual step). None of these are visible from source review; the new unconditional
startup log (`[lib/prisma] DATABASE_DRIVER raw=... resolved=... using ...`) is what turns "is the
code wrong" into "what did this specific process actually see", by putting the answer directly in
the host's own process log rather than requiring another round of guessing.

## 2026-09-10 — root cause of the whole ADR 16/18/19 saga found: AWS itself is unreachable from Iran

### 20. Dropped Postgres/Neon entirely; moved to the deploy host's own local MySQL
**Decision:**
1. `prisma/schema.prisma`'s `datasource` switches from `provider = "postgresql"` to
   `provider = "mysql"`.
2. `lib/prisma.ts` and `prisma/seed.ts` drop `@prisma/adapter-pg`, `@prisma/adapter-neon`,
   `@neondatabase/serverless`, and `ws` entirely, replacing them with a single
   `@prisma/adapter-mariadb` (`mariadb` npm driver) adapter - no more `DATABASE_DRIVER`
   env var, no more branching in `createAdapter()`. `lib/prisma.ts` is back to the plain
   single-adapter singleton shape.
3. `User.roles` and `Product.images` change from native array columns (`Role[]`, `String[]`) to
   `Json` (`@default("[\"CUSTOMER\"]")` / `@default("[]")`) - MySQL has no scalar-list column
   type. This supersedes ADR 7's reasoning (which was specifically about *why a Postgres array*
   was fine); the "why not a join table" argument in ADR 7 still holds, it just now resolves to
   Json instead of a native array.
4. Several `String?`/`String` fields that hold real free text gain `@db.Text`:
   `Product.description`, `ServiceOffering.description`, `SellerProfile.rejectionReason`,
   `ServiceProviderProfile.rejectionReason`, `PartyProfile.rawInputText`, `Order.shippingAddress`,
   `Review.comment`, `TicketMessage.body`.
5. `lib/auth/otp.ts`'s `verifyOtp` goes back to a plain `prisma.user.upsert()` (the
   `findOrCreateUserByPhone` workaround from ADR 18 is removed), and `/api/checkout` goes back to
   one atomic `prisma.order.create()` with a nested `items: { create: [...] } }` (the sequential
   `OrderItem` loop from ADR 18 is removed).
6. The old `prisma/migrations/20260908211643_init` (Postgres-flavored SQL) is deleted and
   replaced with a fresh `mysql`-flavored initial migration, generated and applied against a real
   local MariaDB instance for this change (see Verified below) - there is no meaningful way to
   "port" a migration history across database engines, so this is a clean restart of migration
   history, not a converted one.
7. `DATABASE_DRIVER` is removed from `.env`/`.env.example`/`docs/README.md` entirely.
   `DATABASE_URL` becomes a single `mysql://` connection string everywhere (local dev, CI,
   the deploy host) - no per-environment driver choice needed anymore.

**Why:** ADR 16, 18, and 19 were three consecutive attempts to route around the deploy host's
firewall (TCP 5432 blocked, then WebSocket Upgrades also blocked) by changing *how* Postgres was
reached, each confirmed working from this sandbox and each still failing identically once
actually deployed. The account holder tested directly against two different Neon regions
(ap-southeast-1/Singapore - the one already in use - and a Frankfurt/eu-central region) and got
the exact same timeout on *both* raw TCP (5432) and the HTTP driver, on both regions. Two
different regions failing identically rules out "wrong region" or "this one Neon endpoint has an
outage" - the common factor is AWS itself (Neon is AWS-hosted), which is consistent with AWS
being unreachable for Iran-based traffic due to US sanctions, not a Neon-specific or
protocol-specific block as ADR 16/18/19 each assumed in turn. No further attempt to reach an
AWS-hosted database from this host makes sense - the fix is to stop routing through AWS at all,
not to find yet another protocol that might slip past a block that was never protocol-specific to
begin with. cPanel hosts almost universally ship their own local MySQL server (via "MySQL
Databases" in the panel) at no extra cost, reachable over `localhost` with zero international
routing - eliminating the entire class of problem ADR 16/18/19 were fighting, not working around
it again.

**Why the schema needed real changes, not just a provider string flip:** MySQL and Postgres are
not interchangeable at the type-system level, and Prisma does not paper over every difference:
- MySQL (and MariaDB) have no native scalar-list column type - Postgres's `Role[]`/`String[]`
  have no MySQL equivalent, so `prisma generate`/`migrate dev` would simply fail to produce valid
  DDL for `User.roles`/`Product.images` without a schema change (verified by attempting the
  provider flip alone first, locally, before deciding what to replace the arrays with).
- MySQL's default column type for a bare `String` field is `VARCHAR(191)` (confirmed directly in
  the generated migration SQL - see Verified below), unlike Postgres where an unqualified
  `String` is effectively unbounded. That default is fine for ids/slugs/phone numbers/business
  names, but would silently truncate anything closer to real prose - a product description, a
  shipping address, a support ticket message - at 191 characters. Every field in this codebase
  that plausibly holds real free text got `@db.Text` (MySQL's `TEXT`, up to 64KB) rather than
  discovering the truncation later from a support ticket that got cut off mid-sentence.

**Why `verifyOtp`/checkout were reverted, not left as they were:** both rewrites in ADR 18 existed
*specifically* because Neon's HTTP driver could not run a Prisma transaction at all - a hard
protocol limitation, not a general best practice. `@prisma/adapter-mariadb`'s
`PrismaMariaDbAdapter.startTransaction()` is a real implementation (confirmed by reading the
installed package's `dist/index.d.ts`), so MySQL via this adapter has no such limitation. Keeping
the non-atomic workarounds after the constraint that required them is gone would mean carrying
forward a real correctness downgrade (a crash mid-checkout could leave an `Order` with fewer
`OrderItem`s than it should have, as ADR 18 itself flagged as an accepted-for-now gap) for no
remaining reason, and leaving stale comments in the code blaming "neon-http" for behavior that no
longer uses neon-http at all. Reverting both was verified end to end (see below), not assumed
safe by inspection alone.

**Verified**, all against a real MariaDB 10.11 instance installed directly in this environment for
this change (not just a syntax check):
- `prisma migrate dev` generated and applied a fresh migration cleanly on the first real attempt
  after the schema changes - no key-length errors on any `@unique`/`@@index`'d `String` field
  (all fit comfortably inside the default `VARCHAR(191)`), confirming the schema conversion was
  actually complete rather than technically valid, and confirming
  `@db.Text`/`Json`/`Decimal`/enum columns all generated the expected MySQL column types by
  reading the generated `migration.sql` directly.
- The `Json @default("[\"CUSTOMER\"]")` default is applied by Prisma's query engine when a
  `create()` call omits the field, even though MySQL's DDL itself carries no `DEFAULT` clause for
  `JSON` columns (confirmed directly: created a `User` row passing no `roles` at all, read back
  `roles === ["CUSTOMER"]`).
- Full `npm run build` succeeded (this is the same `output: "standalone"` artifact the `deploy`
  branch ships), and the built `.next/standalone/server.js` was run directly against the local
  MariaDB - not just `next dev`, the actual production artifact.
- Real HTTP round trip through that running server: `POST /api/auth/otp/request` → the mock code
  read from the server's own console log → `POST /api/auth/otp/verify` → the returned session
  cookie → `GET /profile` rendered the correct phone number, proving the reverted `upsert()` path
  works.
- Real checkout round trip through the same server: `POST /api/checkout` against a real seeded
  product returned `{ ok: true, orderId }`; the `Order` and `OrderItem` rows were then read back
  directly from MySQL and confirmed correct (2× a 1,850,000 Toman product → `totalAmount
  3,700,000`, matching `OrderItem.splitAmount`), proving the reverted nested-write `Order.create`
  is both atomic and correct under MySQL.
- `npm run db:seed` ran cleanly against the new schema/adapter.
- All test rows created during verification (the throwaway `User`, `Order`, `OrderItem`, `OtpCode`
  rows) were deleted afterward and row counts confirmed back to whatever the seed alone leaves.
- `tsc --noEmit` and `eslint .` both clean after every code change in this ADR.

**Rejected:**
- Keeping Postgres and self-hosting it on the cPanel host too, instead of switching to MySQL -
  not offered by this specific host's control panel (per the account holder, who has access to
  it and confirmed only MySQL is available), and even if it were, it would mean maintaining a
  second database engine's operational knowledge for no benefit over the MySQL this host already
  provides natively.
- A `UserRole` join table instead of `Json` for `User.roles` - would be the more conventional
  relational shape and was seriously considered, but ADR 7's original reasoning (a user's role
  set is small, read as a whole, never queried by "which users have role X" in Sprint 0) still
  applies unchanged; `Json` keeps the same call-site shape (`roles: ["CUSTOMER"]`) that existed
  under the Postgres array, where a join table would have touched every read/write site for a
  feature Sprint 0 doesn't yet use for authorization decisions anyway.
- Leaving `DATABASE_DRIVER` in place as a single-valued no-op "for future flexibility" - nothing
  in this project's actual roadmap calls for supporting more than one database engine
  simultaneously, and a switch that always evaluates the same way is a place for a future reader
  to wonder what the other branches were for; deleting it entirely was more honest about the
  current architecture than keeping unused optionality.
**Follow-up required outside this repo (cannot be done from here):** the account holder needs
to (1) create a MySQL database + user via cPanel's "MySQL Databases" panel, (2) set the new
`mysql://` `DATABASE_URL` in cPanel's "Setup Node.js App" env vars (replacing the old
`DATABASE_DRIVER`/Neon `DATABASE_URL` pair entirely - `DATABASE_DRIVER` should be deleted from
that panel, not just left unread), (3) update the `DATABASE_URL` GitHub Actions secret to the
same value (CI's `prisma generate`/`next build` steps don't actually connect to the database, so
they won't fail either way, but the secret should still match reality), and (4) run
`npx prisma migrate deploy` against the real `DATABASE_URL` to create the tables - and, unlike
every prior ADR's migration story, this can now be run from the host itself if that's more
convenient, since there's no more firewall in the way of anything.

## 2026-09-10 — reported live: session cookie not recognized after a real login (profile, wizard, checkout all affected)

### 21. Diagnostic logging added to `lib/auth/session.ts`; no session-logic bug found in the code itself
**Decision:** `lib/auth/session.ts` now (1) logs a short, non-reversible SHA-256 fingerprint
(first 8 hex chars) of `AUTH_SESSION_SECRET` every time `getSecretKey()` runs, and (2) replaces
`getSession()`'s silent `catch { return null }` with one that logs the actual failure reason
(`error.name: error.message` from `jose`, e.g. `JWSSignatureVerificationFailed: signature
verification failed`) and separately logs when a request simply carries no cookie at all. No
behavior changed for a correctly-signed, correctly-verified session - this is diagnostics only,
following the same pattern ADR 19 used for `DATABASE_DRIVER`.
**Why:** Reported live on `https://violive.tavaloda.com`: after a successful OTP login, every
auth-gated feature (profile, the wizard's submit step, checkout) behaves as if the user is still
logged out - the profile page keeps showing the "ورود / ثبت‌نام" button, and the wizard/checkout
flows bounce the user back to `/auth` again immediately after a login that itself reported
success. Re-audited the three things asked about specifically:
1. **Cookie attributes (`secure`/`sameSite`/`domain`/`path`):** unchanged, and confirmed correct.
   `secure: process.env.NODE_ENV === "production"` is **guaranteed** true in this deployment -
   Next's own generated `.next/standalone/server.js` hardcodes `process.env.NODE_ENV =
   "production"` unconditionally as literally its first executable line, before any app code or
   host-provided env var can affect it (read directly from the built artifact - not an
   assumption). A `Secure` cookie over a genuinely-HTTPS site (confirmed: `https://…`) is sent
   and stored normally by the browser regardless of what the *backend* Node process itself
   perceives behind a reverse proxy - `Secure` only restricts the browser↔origin leg, which is
   HTTPS here either way. No `domain` override is set (correct: defaults to the exact host, no
   cross-subdomain requirement exists), `path: "/"` and `sameSite: "lax"` are both correct for an
   entirely same-origin app with no cross-site posting into it.
2. **Server-side session-detection logic** (`getSession()`, called from Server Components and
   Route Handlers, and the cookie-setting side in `createSession()`): matches Next.js's own
   documented pattern for Route Handlers exactly (`node_modules/next/dist/docs/01-app/03-api-
   reference/04-functions/cookies.md`: "You can use `cookieStore.set(...)` in a Server Function or
   Route Handler to set a cookie" - mutations are automatically merged into whatever response the
   handler returns). This is not a code pattern being assumed correct - it is the same code that
   was verified end to end against the real compiled standalone server earlier in this same
   session (ADR 20's verification: full OTP → verify → cookie → `/profile` round trip via real
   HTTP requests, correct phone number rendered). The wizard's and checkout's "redirect to
   `/auth`, come back, still logged out" behavior was traced through
   `components/wizard/WizardFlow.tsx` and `components/cart/CartView.tsx` - both simply retry the
   same authenticated request after the redirect completes (the wizard auto-resubmits a
   `sessionStorage`-persisted draft on remount; checkout requires a manual re-click). Neither has
   its own bug; both are straightforward, correct amplifications of whatever `getSession()`
   actually returns on that retry - so the loop is a symptom of the session check failing
   *again*, not a separate client-side defect.
3. **Whether the `AUTH_SESSION_SECRET` used to sign matches the one used to verify:** this is the
   one thing that cannot be confirmed or ruled out from source review alone, and is the most
   likely explanation given (1) and (2) check out and the exact same code was independently
   proven working end to end against a real server earlier in this session. A JWT signed with one
   secret value will *always* fail `jwtVerify` against a different one - there is no code fix for
   that, only making sure the value is actually identical everywhere it's read. This project's
   deploy host already had one confirmed incident of an env-var value going stale on some but not
   all running processes (ADR 19's `DATABASE_DRIVER` investigation, on cPanel's Node.js Selector /
   Passenger) - `AUTH_SESSION_SECRET` reaches the running process through the exact same
   mechanism (cPanel's "Setup Node.js App" panel → `process.env`, no `.env` file shipped in
   `deploy` per ADR 15), so it is exposed to the identical class of risk: a Passenger worker
   process that was already running before the panel's `AUTH_SESSION_SECRET` value was last
   set/changed keeps signing or verifying with whatever it started with until it is actually
   restarted, not just re-deployed.
**Verified:**
- Locally, with a single consistent `AUTH_SESSION_SECRET`, against the real local MariaDB and the
  actual compiled `.next/standalone/server.js`: a full `POST /api/auth/otp/request` → `POST
  /api/auth/otp/verify` → `GET /profile` → `POST /api/party-profile` (the wizard's own endpoint)
  round trip all succeeded, and the new log lines showed the *same* secret fingerprint on every
  call - confirming the logging itself works and doesn't misfire on the healthy case.
- A standalone script reproduced the failure signature directly: signing a token with one secret
  and verifying it with a different one throws exactly `JWSSignatureVerificationFailed: signature
  verification failed` - confirming that's precisely the line to look for in the host's logs if
  this is in fact what's happening there.
- `tsc --noEmit` and `eslint .` clean after the change; full `npm run build` still succeeds.
**Not fixable from this repo:** if the fingerprints in the host's own logs turn out to differ
between a `createSession` call and a later `getSession` call for the same login, the fix is
operational - a full app restart from the cPanel Node.js Selector UI (or its
`tmp/restart.txt` convention, per ADR 15/`docs/README.md` §5) after confirming the panel's
`AUTH_SESSION_SECRET` value is what it's meant to be, not a further code change. If the
fingerprints match and verification still fails, or the log shows "no session cookie on this
request" for a browser that just logged in, that points somewhere else entirely (a reverse
proxy/CDN in front of this host stripping or not forwarding the `Set-Cookie` header) and is the
next thing to check with the actual log output in hand, rather than guessed at further here.

## 2026-09-11 — Build My Party phase 1: the rule-based suggestion engine

### 22. `lib/wizard/engine.ts` — rule-based bundle suggestion, no AI, wired to the existing form
**Decision:**
1. New `lib/wizard/engine.ts` exports `suggestBundle({ cityId, theme, budget, guestCount,
   ageGroup, partyType })`, implementing `docs/party-wizard-engine-spec.md` §1 step 4-5 (the
   rule-based half of the engine) against the *existing* multi-step form's answers — no AI
   extraction layer (§2's step 1-3, the free-text entry point) is built, matching §6's own
   design: "اگر این تنظیمات [AiSettings] خالی باشه، سیستم خودکار به همون فرم چندمرحله‌ای قبلی
   سوییچ می‌کنه" (empty `AiSettings` → the plain multi-step form is the whole flow, not a
   degraded fallback bolted onto something else). This fulfills ADR 5's "seeded but not wired"
   status for `config/party-wizard/budget-allocation.json`, `themes.json`, and
   `result-template.txt` — all three are now genuinely read by this engine, not just transcribed
   reference data.
2. For each category in `budget-allocation.json` (after applying its own low-budget overflow
   rule), the engine queries active `Product`s (or, for the one `"auxiliary-services"` slot,
   active `ServiceOffering`s) in the requested city and picks one, scored by a simple
   theme-keyword/color substring match against title+description, falling back to the cheapest
   option when nothing matches the theme.
3. `app/api/party-profile/route.ts` now calls this engine before creating the `PartyProfile`,
   stores the result directly in the already-existing `suggestedBundle` `Json?` column, and
   returns it in the response.
4. `components/wizard/WizardFlow.tsx`'s result screen renders the real bundle (per-category
   line items, quantities, the filled-in `result-template.txt` summary, grand total) instead of
   the old "به‌زودی فعال می‌شود" placeholder, with an "افزودن همه به سبد خرید" button that adds
   every *product* line to the existing cart (`lib/cart/CartContext.tsx`) and navigates to
   `/cart` — reusing the checkout path ADR 9/18/20 already built and verified, not a new one.
**Why product categories always resolve to something, but the auxiliary-services slot doesn't:**
the five product categories (decor, tableware, cake, gifts, costume) are core to any birthday
bundle per the spec's own table - if nothing fits the category's budget slice, the engine falls
back to the cheapest active option in that city/category rather than silently dropping an
essential line. `auxiliary-services` is explicitly framed as optional in the spec ("فقط اگر
بودجه اجازه بده و در آن شهر/فاز فعال باشد") - the engine skips it outright when nothing fits,
never forcing an over-budget "extra."
**Why `auxiliary-services` matches *any* active `SERVICE`-type category, not one fixed slug:**
unlike the five product categories (each maps 1:1 to a real seeded `Category.slug` - see the fix
below), "خدمات جانبی (عکاس، دی‌جی و…)" is a conceptual bucket, not one category. Sprint 0's
catalog only ever seeds a single `SERVICE`-type category (promotional balloon printing, a B2B
print service, not a birthday-party extra) - hardcoding that one slug into a "party wizard
auxiliary service" slot would be actively wrong once a real photographer/DJ category gets added
later, and matching the whole `SERVICE` type instead needs no further code change when it does.
**A pre-existing data bug fixed along the way:** `config/party-wizard/budget-allocation.json`'s
category ids (`decor-balloons`, etc.) never matched the real seeded `Category.slug` values
(`balloons-decor`, etc. - see `prisma/seed.ts`) - harmless while nothing read the file (ADR 5),
but would have made every product-category lookup silently return nothing the moment code
started consuming it. Corrected the ids to the real slugs as part of wiring this up, and added a
comment to the file's own `$comment` explaining the id-must-match-a-real-slug constraint (and the
one exception) for whoever edits it next.
**Why theme matching is keyword/substring-based, not a new schema field:** `Product` and
`ServiceOffering` have no structured "theme" column, and the spec doesn't ask for one - adding
one now would be schema churn for a feature this phase-1 pass doesn't need. `themes.json`'s
`label` field is often compound (`"یونیکورن/رنگین‌کمان"`) - split on `/`/whitespace into
keywords rather than requiring the whole compound string verbatim in a product's title, or a
product titled just "بک‌دراپ تم یونیکورن" would never match at all. Verified this mattered: an
early version of this check used the raw compound label and, empirically, matched nothing; the
keyword-split version correctly matched that exact product in testing (see Verified below).
**Why `guest-gifts` scales quantity by `guestCount` but every other category doesn't:** a gift is
inherently "one per attendee." Every other seeded product is already a party-sized unit (a
100-balloon pack, a 32-person tableware set, a 1kg cake) - multiplying those by `guestCount` too
would wildly overshoot both the budget and what a customer would actually order. No attempt was
made to parse a "covers N guests" capacity out of product titles/descriptions (e.g. the tableware
set's own "۳۲ نفره" claim) to scale non-gift quantities more precisely - that's a real
refinement, deliberately left for when there's enough real catalog/order data to justify a
structured capacity field instead of guessing from title text.
**Why `result-template.txt` needed a runtime `fs.readFileSync`, and what that required
elsewhere:** unlike the two JSON config files (which Next's compiler bundles directly wherever
they're `import`ed - already true for `themes.json` in `wizard/page.tsx` before this ADR), a
plain `.txt` file has no such loader, so honoring the file's own stated purpose ("فقط یه فایل
متنیه" - edit the text, no code change) meant reading it from disk at request time instead. That
only works if the file is actually next to `server.js` at runtime, which `output: "standalone"`
does not do automatically for anything outside `public/`/`.next/static/` (ADR 15) -
`scripts/prepare-standalone.sh` now also copies the whole `config/` directory into
`.next/standalone/`. A hardcoded fallback string (identical to the current file's content) is
used if the read ever fails, so a future deploy-shape change that forgets this copy step degrades
to a fixed default summary text rather than a hard crash on every wizard submission.
**Verified**, against the real local MariaDB + the actual compiled `.next/standalone/server.js`
(confirmed `config/` was physically present in the built bundle first):
- A full wizard submission (Tehran, تm "یونیکورن/رنگین‌کمان", ۲۰ guests, ۵,۰۰۰,۰۰۰ Toman budget)
  through the real `/api/party-profile` endpoint returned a 6-item bundle: the theme-matched
  unicorn backdrop for decor (proving the keyword-split theme match works, not just falls back to
  "cheapest"), a correctly `guestCount`-scaled guest-gift line (20 × 85,000 = 1,700,000), and the
  one seeded service offering for the auxiliary slot - `totalAmount` matched the manually-summed
  line totals exactly.
- The row's `suggestedBundle` column, read back directly from MySQL, held the same 6-item
  structure the API returned - not just an in-memory response.
- The low-budget overflow path (۲,۰۰۰,۰۰۰ Toman, same city/theme) correctly dropped the
  `auxiliary-services` line entirely and visibly boosted the decor/tableware categories' resolved
  budgets from the redistributed percentage.
- Fed the bundle's five *product* line items (its one *service* line deliberately excluded, per
  the point above) into the real `/api/checkout` endpoint exactly as the new "افزودن همه به سبد
  خرید" button would - it succeeded and the resulting `Order.totalAmount` matched the summed
  product lines precisely, confirming the suggested bundle is actually purchasable through the
  existing checkout path, not just a rendered preview.
- All test rows (`User`, `OtpCode`, `PartyProfile`, `Order`, `OrderItem`) deleted afterward,
  counts confirmed back to zero.
- `tsc --noEmit` and `eslint .` clean; `npm run build` succeeds.
**Rejected:**
- Letting "افزودن همه به سبد خرید" add the auxiliary service line to the same product cart -
  `/api/checkout` only ever looks up `Product` rows (ADR 9's original single-seller design,
  unchanged through ADR 18/20); a `ServiceOffering` id passed as a `productId` would simply fail
  the "برخی محصولات دیگر موجود نیستند" check. Service checkout is a real, separate piece of work
  (`panels-and-operations-spec.md`'s balloon-print order form, explicitly out of scope per
  `docs/sprint-0-brief.md` §1) - the UI shows that line as informational only ("این خدمت جداگانه
  هماهنگ می‌شود") rather than silently breaking checkout the first time a bundle happens to
  include one.
- A `UserRole`-style join table or new relational "theme" model instead of text matching - not
  justified yet at Sprint 0's catalog size (ten products, one theme-specific title), and the spec
  itself frames the budget/theme tables as hand-editable JSON precisely so this kind of tuning
  happens by editing data, not schema.
**Not done here (explicitly out of scope for this phase, per the request and `docs/sprint-0-brief.md` §1):**
the AI free-text extraction entry point (§1 steps 1-3, `AIExtractorProvider`, ADR 4's deferred
scope - unchanged), the party-wizard data-flywheel admin dashboard (§7), and review/rating UI
(§8). `PartyProfile.finalBundle` (what the customer actually bought, vs. what was suggested) also
stays unwritten - worth revisiting once there's a reason to compare the two, not invented now.

## 2026-09-12 — real catalog data: 500 products, replacing the 10-item Sprint 0 sample set

### 23. `prisma/seed-data/products.json` — a real, theme-tagged catalog for ADR 22's engine to work with
**Decision:**
1. New `prisma/seed-data/products.json` (500 entries: `title`, `categorySlug`, `price`,
   `description`, `themeSlug`, `slug`) replaces the original Sprint 0 sample list of ten generic
   products in `prisma/seed.ts`.
2. `main()` now does `prisma.product.deleteMany({ where: { sellerId: sellerProfile.id } })`
   before a single `prisma.product.createMany(...)` bulk insert from the new file - not a
   per-row `upsert` loop like the old ten-item list used. This makes reseeding fully
   re-runnable (verified: ran `prisma db seed` twice back to back, second run left the same 500
   rows, no duplicates or errors) and means the old sample products are actually gone after
   reseeding, not just superseded by new rows sitting alongside them.
3. `themeSlug` from the source file is read but not written to any column - `Product` has no
   structured theme field (ADR 22's own decision, unchanged) and this field exists in the source
   data only as the curator's own bookkeeping. What actually drives theme matching is that every
   entry's `description` already spells the theme out in Persian ("مناسب جشن‌های با تم
   ماینکرفت..."), which is exactly the text ADR 22's engine already searches.
**Why deleting by `sellerId` rather than by a hardcoded list of the ten old slugs:** the old
approach (`prisma.product.upsert({ where: { slug }, ... })` for each of ten fixed items) has no
way to *remove* a product that a future edit of the seed data drops - it only ever adds or
updates. Scoping the delete to "everything under the one sample seller" instead means the seed
script's output is always exactly what `products.json` currently says, regardless of what used to
be there - the correct property for something meant to be rerun as the real catalog evolves.
**Foreign-key safety, checked rather than assumed:** the account holder flagged that this session
had created real `Order`/`OrderItem` rows against the old sample products during ADR 20/22's own
verification work, and asked whether deleting those products would fail on the FK. Confirmed
directly from the generated migration SQL (not from memory of what was intended when the schema
was written): `` `OrderItem` ADD CONSTRAINT `OrderItem_productId_fkey` ... ON DELETE SET NULL ``
- Prisma's own default for this nullable relation. Deleting a `Product` nulls out any
`OrderItem.productId` that pointed at it rather than failing or cascading further; `OrderItem`
already stores `unitPrice`/`quantity`/`splitAmount` at order time and no code anywhere reads
`orderItem.product.*` (checked: `grep -rn "\.product\." app components lib`), so nothing in the
UI depends on the row surviving. In the event, this was moot anyway - all of this session's own
test orders had already been deleted as part of each ADR's own cleanup step before this ADR
started, so `deleteMany` ran with zero referencing `OrderItem` rows in practice; the FK behavior
was verified as a fact about the schema either way, not asserted from the (accurate, but
unexercised here) reasoning alone.
**Verified**, against the real local MariaDB (the same instance used throughout ADR 20-22):
- All 500 rows validated before touching the seed script: every `categorySlug` in the file
  matches one of the five real seeded `Category.slug` values exactly (`balloons-decor`,
  `disposable-tableware`, `cake-sweets`, `guest-gifts`, `costume-accessories` - the same fix ADR
  22 already made), all 500 `slug`s are unique, all required fields present and well-typed.
- `npx prisma db seed` (`tsx prisma/seed.ts`) ran clean; the database held exactly 500 `Product`
  rows afterward with the expected per-category split (150/90/100/80/80, matching the source
  file), all 500 slugs distinct, and the ten old sample slugs (`party-backdrop-unicorn`, etc.)
  confirmed gone. Ran the seed a second time immediately after - still exactly 500 rows, no
  duplicate-key errors.
- `npx prisma migrate reset --force` also exercised end to end against this same local database
  (drop, recreate, reapply the migration) - Prisma's own AI-safety guard for this specific command
  required explicit user consent threaded through `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION`
  before it would run at all; the account holder's own message had already explicitly requested
  this exact command, scoped explicitly to "محیط محلی/تست" (the local/test environment) - not
  the real deployed database, which lives on the cPanel host's own MySQL and was never touched by
  this. `migrate reset` does not auto-run the seed step in this Prisma version - `prisma db seed`
  was run as an explicit second step, confirmed necessary by checking row counts came back `0`
  immediately after the reset and `500` only after the explicit seed run.
- Rebuilt the actual `.next/standalone/server.js` artifact against the freshly reseeded database
  and ran three real wizard scenarios through the live HTTP endpoint per the account holder's own
  request - Minecraft, Barbie, Dinosaur (all previously untestable with any real precision, since
  the old ten-product catalog had exactly one theme-specific item total):
  - Dinosaur: all five core categories matched a dinosaur-specific product by name
    (`بک‌دراپ تم دایناسور`, `... تم دایناسور` for tableware/cake/gift/costume) - a full 5/5
    theme-matched bundle, not a fallback.
  - Minecraft and Barbie: 4/5 categories matched their theme by name; the `guest-gifts` slot fell
    back to a generic "طلایی کلاسیک" item in both. Checked *why* directly against the database
    rather than assuming a matching bug: `SELECT ... WHERE categorySlug='guest-gifts' AND title
    LIKE '%ماینکرفت%'` (and the Barbie equivalent) returned zero rows - the source data simply
    has no Minecraft- or Barbie-themed `guest-gifts` product to find. The engine's fallback
    behavior (cheapest available, per ADR 22) is working exactly as designed here; the gap is in
    the source catalog, not the matching logic.
  - Fed the Dinosaur bundle's product lines into the real `/api/checkout` endpoint - succeeded,
    `Order.totalAmount` (2,236,000) matched the summed line totals exactly.
  - All test rows (`User`, `OtpCode`, `PartyProfile`, `Order`, `OrderItem`) from this round of
    testing deleted afterward.
- `tsc --noEmit` and `eslint .` clean; `npm run build` succeeds.
**Not done here:** no attempt was made to backfill the `guest-gifts` gap found for Minecraft/
Barbie above by inventing new products - that's a real, reportable gap in the supplied catalog
data, not something to paper over by fabricating inventory that doesn't reflect any real
seller's actual stock.

## 2026-09-12 — ADR 23's "real data gap" conclusion was wrong: two real engine bugs found instead

### 24. Fixed: a hard budget filter, and a color-coincidence, both silently discarding real theme matches
**Correction to the record, not a silent edit of it:** ADR 23 reported that Minecraft- and
Barbie-themed `guest-gifts` products didn't exist in the supplied catalog, based on a `mysql`
CLI query (`WHERE title LIKE '%ماینکرفت%' ...`) that returned zero rows. The account holder
checked the source JSON directly and found four matching products for each theme
(`guest-gifts-minecraft-1..4`, `guest-gifts-barbie-1..4`) and asked for this to be re-investigated
before accepting "data gap" as the explanation. They were right to push back - both products
existed in the database the whole time (confirmed with `SELECT slug, title, price FROM Product
WHERE slug LIKE 'guest-gifts-minecraft%' ...` - a slug-based, ASCII-only query, sidestepping
whatever made the earlier Persian-literal `LIKE` query unreliable, most likely a client charset
default in that one ad-hoc `mysql -e` invocation rather than anything about the stored data
itself; the terminal's own `?????` rendering of Persian text in that session was a second, later
sign of the same display/encoding wrinkle). ADR 23's conclusion stands corrected here, not edited
there, per this log's own append-only discipline.
**The two real bugs, found by testing `lib/wizard/engine.ts`'s actual logic directly (not the CLI)
against the real data:**
1. `pickProduct()` filtered every candidate to "fits this category's budget slice" *before*
   ranking by theme match. `guest-gifts`' cost scales by `quantity = guestCount` (ADR 22), so a
   themed item priced only slightly above a generic one routinely blows the slice once multiplied
   by 15-20 guests - and the filter discarded it outright, with no path back, even though three or
   four other themed candidates existed at only a modest premium. The result read exactly like "no
   themed product exists," which is what ADR 23 wrongly concluded from watching the symptom rather
   than the cause.
2. After fixing (1) to prioritize any theme-matched candidate over budget, Barbie's `guest-gifts`
   *still* picked "پاکت هدیه تم طلایی کلاسیک" (a generic "gold classic" gift) instead of an
   actual Barbie item. Cause: `themeMatchScore()` added color words (from `themes.json`'s
   `colors` array - Barbie's are `["صورتی", "طلایی"]`, pink/gold) into the *same* score as
   keyword matches. "طلایی" (gold) appears in the generic item's own title, giving it `score: 1`
   - enough to land it in the "themed" pool being prioritized over budget, where its
   comparatively low price then let it win over every real (but pricier) Barbie item, none of
   which fit the slice either. A color word is real evidence when picking among several
   plausible candidates, but it is not the same claim as an actual theme keyword match, and
   treating them as one number let a coincidence stand in for the real thing.
**The fix:**
- `themeMatchScore()` now returns `{ keywordScore, colorScore }` separately instead of one
  combined number.
- `pickProduct()`'s "should this category prioritize theme over its budget slice" gate now checks
  `keywordScore > 0` specifically (`isThemed`), not `score > 0` - a color-only match no longer
  qualifies a product to bypass the budget filter, though it still contributes to `score` for
  ranking *within* whichever pool (themed or not) actually gets used.
- `pickAuxiliaryService()` (which never had bug 1 - it already only offers the optional slot when
  something fits, per ADR 22 - and wasn't exposed to bug 2 in testing either) now combines
  `keywordScore + colorScore` into the same `score` it always used; unaffected in behavior.
**Why color words stay in the model at all, rather than being dropped:** they're a legitimate
secondary signal for *ranking among already-plausible candidates* (e.g. choosing between two
otherwise-equal decor items, or nudging a themed-but-ambiguous product up), which is the role
`colorScore` still plays via `score`. The bug was specifically letting that secondary signal
promote a product into the "genuinely on-theme, worth exceeding budget for" tier it was never
meant to qualify for on its own.
**Verified**, against the real local MariaDB + the actual compiled `.next/standalone/server.js`
(both bugs reproduced and then confirmed fixed against the *exact* data in dispute, not a
synthetic example):
- Direct query confirmed the 8 disputed rows (4 Minecraft, 4 Barbie `guest-gifts` products) exist
  in `Product` exactly as the source file specifies.
- A standalone script replicating the engine's own scoring against these exact rows reproduced
  bug 1 precisely: all 4 Minecraft items scored correctly (`keywordScore: 2`) but none fit the
  600,000-Toman category slice at 15 guests (lineTotals 705,000-1,005,000), so the pre-fix
  algorithm's budget-first filter excluded all of them before scoring ever mattered.
- After fixing bug 1 alone: Minecraft's `guest-gifts` correctly picked the cheapest Minecraft
  item (47,000 × 15). Barbie's did not - still picked the gold-classic item - reproducing bug 2
  specifically, isolating it from bug 1.
- After fixing bug 2: re-ran all three originally-requested scenarios (Minecraft, Barbie,
  Dinosaur) through the real `/api/party-profile` endpoint - all three now return a full 5-of-5
  theme-matched bundle across every core category, not 4-of-5 or a silent fallback.
- Spot-checked four more themes not in the original request (Frozen, Space, Safari, Spider-Man -
  all compound labels like Minecraft's own "ماینکرفت/گیمینگ") the same way - 20 of 20
  core-category picks matched their theme by name, confirming the fix generalizes rather than
  being a narrow patch for the two themes that happened to be reported.
- Fed the corrected Barbie bundle's product lines into the real `/api/checkout` endpoint -
  succeeded with a correct order total, confirming the fix didn't disturb the
  checkout-compatibility work from ADR 22.
- All test rows from this round deleted afterward. `tsc --noEmit` and `eslint .` clean;
  `npm run build` succeeds.
**Lesson for future verification in this repo, recorded because it nearly produced a wrong
conclusion in the log:** an ad-hoc `mysql -e "... LIKE '%<Persian text>%' ..."` query is not a
reliable way to check whether Persian data exists - a slug/ASCII-keyed query, or better, a script
that goes through the actual Prisma client (the same driver path the app itself uses, as this
ADR's reproduction script did), is the trustworthy check. A CLI text-literal match failing is
evidence about the CLI invocation, not about the data, and should have been treated that way
before ADR 23 was written.

## 2026-09-13 — reported live: the host's process-count quota (200/200) hit overnight, no code change

### 25. Audited for a process/connection leak; found none - not fixable from this repo
**What was reported:** the cPanel account's "Number of Processes" resource hit its 200/200 cap
and locked the whole account, discovered around noon, with no manual host interaction since the
previous night - only the deployed app was running. Asked to check whether this codebase (DB
connections, a queue, a timer/interval, an unbounded retry) could leak OS processes or connections
that accumulate over time, fix it if so, and say plainly if not.
**What was checked, and found clean:**
- **Process/thread spawning:** repo-wide search for `child_process`, `spawn(`, `exec(`,
  `execSync`, `fork(`, `worker_threads`, `new Worker` - zero matches in application code (the only
  hits anywhere in the repo are inside `.agents/skills/*/references/*.md`, static documentation
  files, and `package-lock.json` metadata, neither of which executes). Nothing in this codebase
  spawns an OS process or thread, ever.
- **Timers/intervals:** exactly one `setTimeout` in the whole app
  (`components/shop/AddToCartButton.tsx`, resetting a button's "added" label after 1.5s) - a
  `"use client"` component, so it runs in the visitor's browser, not on the server, and cannot
  affect the host's process count under any circumstance. No `setInterval` anywhere. No
  `instrumentation.ts` (Next's server-startup hook file) exists in this project at all.
- **Queues:** there is no queue/background-job system in this codebase - Sprint 0 has no cron-like
  scheduled task, no message queue, nothing that runs outside a request's own lifecycle. The
  question's premise (a queue that could leak) doesn't apply; nothing here to check further.
- **Database connections:** `lib/prisma.ts` is a proper singleton - one `PrismaClient`/one
  `PrismaMariaDb` adapter instance per Node process, matching Prisma's own documented pattern for
  a long-lived server (as opposed to a serverless/lambda-per-request shape, which is what the
  `global`-caching half of that pattern actually guards against - see the file itself). The
  underlying `mariadb` driver defaults `connectionLimit` to `10` when unspecified (confirmed by
  reading `node_modules/mariadb/lib/config/pool-options.js` directly, not from memory) - a bounded
  pool of at most 10 real MySQL connections for the process's entire lifetime, not one created per
  request. Nothing in this app ever calls `prisma.$disconnect()` at runtime (only
  `prisma/seed.ts`, a one-off CLI script, does - correctly, since it's short-lived), which is the
  *correct* behavior for a persistent server, not a leak. In any case, MySQL connections are TCP
  sockets/threads inside `mysqld`, not separate OS processes under the cPanel account's own NPROC
  quota - even a genuine connection leak here would show up as a MySQL-side limit, not this one.
- **Fire-and-forget / unhandled rejections:** the one `void submit(draft.answers)` in
  `components/wizard/WizardFlow.tsx` is also client-side, and `submit()` itself wraps its body in
  try/catch/finally, so it can't reject unhandled even in the browser. No server-side code calls
  an async function without awaiting or otherwise handling its result. No global
  `uncaughtException`/`unhandledRejection` handler exists (none was needed - there's nothing here
  that would produce one).
**Conclusion, stated plainly as asked:** nothing in this repository can account for an
accumulating OS-level process leak. This looks like a hosting/Passenger-side issue, not an
application-code one - consistent with CloudLinux's account-wide NPROC quota counting *every*
process under the account (not just this app: cron jobs, mail, other subdomains sharing the same
cPanel account, and Passenger's own worker-process pool for this app all count against the same
200). A single Node app cannot exhaust a 200-process quota through its own JavaScript logic
without spawning processes, which this codebase never does - the plausible causes from here are
Passenger's own process-pool sizing/recycling behavior on this host (e.g. crashed-and-respawned
workers not being fully reaped, or a concurrency setting sized without the LVE's NPROC budget in
mind) or something else entirely on the same account, neither of which is visible or fixable from
this repository.
**Suggested next step (operational, not a code change):** ask the hosting provider for a process
list/snapshot from the time of the lockout (`ps` output or CloudLinux's own LVE stats), or check
whether cPanel offers a process-history graph - that would show what was actually running when the
quota was hit, which is the only way to distinguish "this app's Passenger workers" from "something
else on the account" from here on.
**Not done here:** no code was changed - there was nothing to fix, and the account holder
explicitly asked for an honest "not a code issue" rather than a speculative change.

## 2026-09-13 — three wizard usability/correctness requests

### 26. Formatted budget input, adult age brackets, and capacity-aware bundle quantities
**Decision:**
1. **Budget input formatting.** The custom-budget field in `components/wizard/WizardFlow.tsx`
   (step 3) is now `type="text"` instead of `type="number"`, storing the raw digit string in
   `customBudget` state and deriving the *displayed* value on every render via
   `Number(customBudget).toLocaleString("fa-IR")` - so it shows `۱۵٬۰۰۰٬۰۰۰` while the user types,
   while `answers.budget` (and everything downstream: the request payload, `PartyProfile.budget`)
   stays the plain number it always was. Along the way, added `toEnglishDigits()`/`digitsOnly()`
   helpers so a Persian-keyboard `۰-۹` digit (common on Iranian mobile keyboards) is normalized
   before parsing - `Number("۱۵")` alone returns `NaN`, which would have made the field silently
   stop working the moment someone typed with a Persian numeral keyboard, a real risk for this
   audience even though it wasn't the reported bug.
2. **Adult age brackets.** `lib/wizard/types.ts`'s `AGE_BUCKETS` went from five child-only options
   ending in a single "۱۳ سال به بالا" catch-all to eight: the same four child brackets, then
   "۱۳ تا ۱۷ سال", "۱۸ تا ۳۰ سال", "۳۰ تا ۵۰ سال", "بالای ۵۰ سال". The old catch-all was replaced
   rather than kept alongside the new brackets - "۱۳ سال به بالا" and "۱۸ تا ۳۰ سال" would
   otherwise both be valid, overlapping answers to the same question, which is worse than not
   having the option at all (a customer's stated age group becomes ambiguous data). Checked
   whether any code branches on `ageGroup` before changing it: it doesn't - grepped every
   `ageGroup`/`ageRange` reference in the repo and found `ageGroup` is only ever stored, echoed
   into `PartyProfile`, and interpolated into the result-template summary text; `themes.json`'s
   own `ageRange` field (a *different*, unrelated field, one entry per theme, not per party) is
   never read by any code at all. So there was no "child party" filtering logic to find or fix -
   changing the bucket list has zero effect on the suggestion engine's behavior.
3. **Capacity-aware quantities (the real bug).** `lib/wizard/engine.ts` computed quantity per
   category, not per product, and only ever special-cased `guest-gifts` (`quantity = guestCount`)
   - every other category, including `disposable-tableware`, always used `quantity: 1` regardless
   of what the chosen product's own title said about its capacity ("ست ظروف یک‌بارمصرف ۱۶ نفره" -
   a 16-*person* set). A 50-guest party got exactly one 16-person tableware set, not four. Fixed
   with two new functions: `parseGuestCapacity(title)` extracts a "serves N guests" number from a
   product's own title (`\d+\s*(?:نفره|عددی)`, Persian digits normalized first - "۱۶ نفره" or a
   "۱۰ عددی" cup/cupcake pack both mean "one unit covers N guests"), and
   `requiredQuantity(categoryId, guestCount, capacity)` returns `guestCount` for `guest-gifts`
   unconditionally (unchanged), `Math.ceil(guestCount / capacity)` when the product states a
   capacity, or `1` otherwise (a backdrop, a costume set, a cake sold by weight - genuinely single
   party-sized units, not something a real customer buys multiples of here). Quantity moved from
   being computed once per category (`suggestBundle`, before knowing which product would be
   picked) to once per *candidate product* inside `pickProduct`'s own scoring loop, since two
   products in the same category can state different capacities (a 16- vs. a 32-person set) and
   each needs its own unit count and `lineTotal` before the existing budget/theme ranking runs -
   this is also what makes "prefer the product with a more precisely-fitting capacity" (the
   request's second framing of the same ask) happen automatically: a better-fitting capacity means
   less waste, which means a lower `lineTotal` for the same coverage, which the existing
   budget-aware ranking already favors without any new logic for that specifically.
**Why "عددی" (a pack of N units) counts as a capacity signal alongside "نفره" (serves N people),
but "کیلویی" (a cake's weight, e.g. "۱ کیلویی") does not:** checked every numeric+unit-word
pattern across all 500 seeded product titles (not guessed) - exactly three exist:
`نفره` (46 products, `disposable-tableware` only), `عددی` (42 products, split between
`disposable-tableware` cup packs and `cake-sweets` cupcake boxes), and `کیلویی` (40 products,
`cake-sweets` only). A "بسته ۱۰ عددی" cup pack or a "باکس کاپ‌کیک ۶ عددی" box is the same shape
of fact as a "۱۶ نفره" set - a discrete count of guest-servable units per pack - so both feed the
same parser. A cake's weight is a fundamentally different kind of fact: there's no stated
"serves N guests" number to divide by, and converting kilograms to a guest count would need an
invented assumption (some guessed "servings per kilogram" constant) not present anywhere in the
spec or the data - and this catalog doesn't model "buy two cakes for a bigger party" at all (each
weight is already a separate SKU). Left alone rather than guessed at.
**Verified**, against the real local MariaDB + the actual compiled `.next/standalone/server.js`,
and the actual browser UI (not just the API) for the two frontend changes - using Playwright
against the pre-installed Chromium, per this environment's own testing guidance:
- Loaded `/wizard` in a real headless browser: all eight age buckets render in the correct order,
  including the three new adult brackets, with no visual or logical overlap.
- Typed `15000000` into the real budget input field and read back `input.value` from the live
  DOM: displayed as `۱۵٬۰۰۰٬۰۰۰`, confirming the formatting actually reaches the rendered input,
  not just the code that's supposed to produce it.
- Drove the entire wizard through a real browser session (logged in via the real OTP endpoints,
  clicked through all five steps including typing into the formatted budget field) and captured
  the actual outgoing `POST /api/party-profile` network request: `"budget":15000000` - a plain
  number, proving the comma-formatted display never leaks into what's actually stored or sent.
- Capacity math, via the real API: a 50-guest Barbie bundle correctly resolved the 16-person
  tableware set to `quantity: 4` (`Math.ceil(50/16)`), while every non-capacity-bearing category
  (decor, cake, costume) stayed at `quantity: 1` and `guest-gifts` stayed at `quantity: 50`,
  exactly as before - confirming the fix is additive, not a regression for the categories that
  were already correct.
- Boundary-tested the ceiling math directly against a 32-person Unicorn tableware set: 32 guests
  → 1 set, 33 → 2, 64 → 2, 65 → 3 - exact at every edge, not just the one number requested.
- Fed the 50-guest Barbie bundle's product lines (including the new `quantity: 4` line) into the
  real `/api/checkout` endpoint - succeeded, and `OrderItem.quantity`/`splitAmount` and the
  resulting `Order.totalAmount` (5,270,000) all matched the expected math exactly, confirming the
  capacity-aware quantity survives all the way through to a real, paid order, not just the
  suggestion response.
- All test rows (`User`, `OtpCode`, `PartyProfile`, `Order`, `OrderItem`) from this round deleted
  afterward. `tsc --noEmit` and `eslint .` clean; `npm run build` succeeds.
**Not verified, and stated plainly:** the seeded catalog has no single theme with *two different*
stated capacities in the same category (each theme's tableware sets are uniformly either all
16-person or all 32-person - checked directly, not assumed), so "picks the more precisely-fitting
capacity when more than one is available" couldn't be demonstrated against real data as its own
scenario. The mechanism is the same computation validated above (`lineTotal` computed per
candidate, ranked the same way regardless of source), not separate logic, so this isn't treated as
an open risk - but it's recorded rather than silently claimed as separately tested.
**Known minor UX limitation, not fixed:** the budget field re-renders its full formatted value on
every keystroke without explicit caret-position preservation, so editing in the middle of an
already-typed number (rather than typing left-to-right into an empty field) can reposition the
cursor unexpectedly. Accepted rather than adding caret-tracking logic for a Sprint 0 field whose
overwhelmingly common use is typing a fresh number, per this project's stated preference for
standard patterns over cleverness (ADR 1).

## 2026-09-13 — Product seller panel (minimum viable)

### 27. Seller registration, product CRUD, and order fulfillment for product sellers
**Decision:** Built the first working version of `panels-and-operations-spec.md`'s "پنل
فروشنده‌ی محصول", scoped to exactly what was asked (registration, product CRUD, order
fulfillment) and explicitly not sales analytics, subscription management, or reviews:
- **Registration** (`app/seller/register`, `POST /api/seller/register`): a form collecting
  businessName/description/categoryId/cityId/nationalId/bankAccountIban, creating a
  `SellerProfile` with `status: PENDING` and appending `"SELLER"` to the user's existing
  `roles` array (never replacing it — a user can already be a `CUSTOMER` and become a `SELLER`
  too, per ADR 7/20's multi-role design) inside one `$transaction`, so a `SellerProfile` and its
  matching role never diverge even if one write somehow failed. Approval is a direct
  `UPDATE SellerProfile SET status='APPROVED'` for now — explicitly requested rather than
  building an admin panel first.
- **The panel gate** (`app/seller/(panel)/layout.tsx`, a route group so `/seller/register`
  itself sits outside it): redirects to `/auth` if not logged in, to `/seller/register` if the
  user has no `SellerProfile` yet, and renders a dedicated "pending" or "rejected" screen (with
  `rejectionReason`) in place of the panel for those two statuses — the actual dashboard/
  products/orders pages only ever render for `status: APPROVED`.
- **Product CRUD** (`app/seller/(panel)/products/*`, `/api/seller/products*`): title,
  description, categoryId, cityId, price, stock, up to 6 images, active/inactive, with a
  search (`?q=`) and status filter (`?status=active|inactive`) on the list page. Delete is a
  real `prisma.product.delete()`, not a soft-delete — safe because `OrderItem.productId` is
  `ON DELETE SET NULL` (confirmed against the actual migration SQL, not assumed — the same fact
  already established for the 500-product reseed, ADR 23), and no UI anywhere reads
  `OrderItem.product` for a past order, so deleting a product a customer already bought loses
  nothing a user would see. Every product route re-checks `sellerId` ownership server-side
  (`getSellerProductById`) — the page-level gate stops navigation, not a direct `fetch()` to the
  API, so each route needs its own check regardless of what the layout already enforced.
- **Order fulfillment** (`app/seller/(panel)/orders`, `POST /api/seller/orders/[itemId]/ship`):
  lists only `OrderItem`s where `sellerId` matches this seller **and** the parent order's
  `paymentStatus` is `PAID` — a `PENDING_PAYMENT`/`FAILED` order never reached a real customer's
  hands in this codebase (checkout only flips to `PROCESSING` on a successful mock charge), so
  showing it in a seller's fulfillment queue would be actionable-looking noise for an order that
  isn't real yet. Marking an item shipped sets `shippedAt`/`trackingCode` on that `OrderItem`
  only, then separately checks whether *every* item on the parent `Order` (not just this
  seller's) now has `shippedAt` set before flipping `Order.status` to `SHIPPED` — orders are
  hardcoded `orderType: SINGLE_SELLER` today (ADR 20), but nothing stops a customer's cart from
  actually mixing products from different sellers (the cart has no such restriction), so a
  single-item auto-flip would incorrectly mark a multi-seller order fully shipped the moment
  the first seller ships their own piece.
- **Image storage**: added `S3StorageProvider` (`lib/providers/storage.ts`) alongside the
  existing `LocalDiskStorageProvider`, using `@aws-sdk/client-s3` with `forcePathStyle: true`
  (works against Liara Object Storage, ArvanCloud Object Storage, or real AWS S3 — see
  `.env.example`). This is a genuine architectural fork, not a style choice, so it was put to
  the user directly rather than assumed: the `deploy` branch is force-pushed as a rewritten
  orphan commit on every CI build (ADR 15), and this sandbox has no way to verify from here
  whether the user's actual cPanel update process preserves an untracked `public/uploads/`
  directory across that or does a fresh checkout every time — guessing wrong would mean sellers'
  product photos silently vanish on the next deploy. The user chose cloud storage; `local` stays
  the (default, dev-only) implementation for `STORAGE_PROVIDER` since it needs no credentials to
  develop against.
**Also added**, not explicitly requested but directly in service of the stated goal ("سلرها
هیچ راهی برای ورود ندارند" — sellers have no way in): a "ثبت‌نام به‌عنوان فروشنده" / "پنل
فروشنده" link on the existing customer profile page (`app/(main)/profile/page.tsx`), since a
panel with no discoverable entry point from anywhere in the app would still leave sellers with
no real way in.
**Rejected:** slug regeneration on product title edits — `Product.slug` is the product's public
URL (`/shop/product/[slug]`) and already shared/bookmarkable the moment a product goes active,
so an edit changes the title but never the slug. New products get a slug via
`lib/slug.ts`'s `productSlug()`: ASCII-only characters extracted from the title plus a random
hex suffix, since seller-entered titles are almost always Persian (which transliterates to
nothing meaningful) and a random suffix is what actually guarantees uniqueness here, not a
best-effort transliteration.
**Verified**, against the real local MariaDB + the actual compiled `.next/standalone/server.js`
(not `next dev`), driving every route via real HTTP (`curl`, cookie-jar sessions) rather than
reading the code and assuming it works:
- Registered a fresh test user as a seller → `SellerProfile.status: PENDING`,
  `User.roles: ["CUSTOMER","SELLER"]` (both, not just `SELLER`) confirmed directly in the
  database, and `GET /seller` rendered the pending screen, not the dashboard.
- A second registration attempt on the same account was correctly rejected
  ("شما قبلاً... ثبت کرده‌اید"), and the pre-existing seed-data seller (`فروشگاه جشن پارسا`,
  owner of all 500 catalog products) was left untouched throughout — confirmed to be seed
  fixture data, not leftover test residue, before doing anything destructive near it.
- Approved the test seller directly via SQL; `GET /seller` then rendered the real dashboard
  with the correct business name and stats.
- Uploaded a real image via `POST /api/seller/uploads` (`local` provider for this test run, no
  real S3 credentials exist to test against, and none should ever be pasted into this
  conversation) and used the returned URL to create a product; the product then appeared,
  correctly, on the seller's own product list, in a `?q=` search for part of its title, and
  disappeared under a `?status=inactive` filter (it was active) — but *not* under a
  non-matching search term, confirming the filter is a real `WHERE`, not a no-op.
- The product edit page correctly pre-filled every field, including Persian-digit-formatted
  price/stock (`۱۵۰٬۰۰۰`) and a rendered `<img>` preview of the uploaded photo.
- `PATCH` from a *different* seller session against this product, and a direct `GET` of its
  edit page, both correctly returned 404 — ownership checks work, not just UI hiding.
- Placed a real order for the product as a separate customer account via `/api/checkout`, then
  confirmed it appeared in the seller's `/seller/orders` list (only after `paymentStatus: PAID`
  — the mock payment provider always succeeds, so this always passes in Sprint 0, but the query
  itself was read to confirm it filters on this, not just eyeballing the result). Marked it
  shipped with a tracking code: `OrderItem.shippedAt`/`trackingCode` set correctly,
  `Order.status` flipped to `SHIPPED` (the only item on that order), the UI updated to show
  "ارسال شده" and the tracking code, and a second ship attempt on the same item was correctly
  rejected ("قبلاً ارسال شده").
- Deleted the product afterward: the delete succeeded, `OrderItem.productId` for the
  already-shipped order confirmed `NULL` in the database (not a foreign-key error), and the
  seller's own orders page still rendered that historical line correctly via a
  `"محصول حذف‌شده"` fallback instead of crashing on a null relation.
- Exercised the `REJECTED` status screen directly via SQL, including a real `rejectionReason`
  string rendering correctly on the page (one intermediate check appeared to fail — the reason
  text didn't show up — but this was `mysql` CLI's own default-charset mangling of the Persian
  `UPDATE` statement, the exact same known pitfall from ADR 23/24, not an app bug; re-ran the
  same `UPDATE` with `--default-character-set=utf8mb4` and the text rendered correctly).
- `npm run build` succeeds (all new routes listed in its output), `tsc --noEmit` and `eslint .`
  both clean. All test rows (`User`, `SellerProfile`, `Product`, `Order`, `OrderItem`,
  `OtpCode`) and the one uploaded test image created during this pass were deleted afterward;
  the pre-existing seed data (3 users, 500 products) was confirmed unchanged before and after.
**Not built, per the request's explicit scope:** an admin panel/UI for approving sellers (manual
SQL only, as asked), sales analytics, subscription management (every `APPROVED` seller has full
access, no `Subscription` row is created or checked), and reviews/ratings. **Not fixed, a
pre-existing gap unrelated to this feature:** the storefront (`ProductCard`,
`components/shop/*`) never renders a product's actual `images` — every product, seed data and
seller-uploaded alike, shows the same generic placeholder icon on `/shop`. Seller-uploaded
images are stored and retrievable (confirmed above) but nothing customer-facing displays them
yet; out of scope for a seller-panel feature and not something the request asked for.

## 2026-09-14 — Post-deploy `/profile` incident: two unrelated causes, not one session bug

### 28. `/profile` crash on the live host is a missed migration, not a session regression
**Reported:** after the seller-panel deploy, `/profile` showed Next's generic "A server error
occurred" page (with a digest, no detail) on the real live host for a logged-in user, and a
separate manual test (`node server.js` on a bare test port, real OTP login cycle) showed the
*logged-out* UI instead of a crash - suggesting, from the outside, one session-handling
regression caused by the seller panel. Investigated both, on the real compiled
`.next/standalone/server.js` against real MariaDB, as asked - not by reading the code and
guessing. **They are two different, unrelated bugs, and neither one is a session bug:**
1. **The live crash.** Reproduced exactly: built a throwaway database seeded from only the
   *pre*-seller-panel migration (`20260910085317_init`), leaving out
   `20260913134354_seller_panel` (i.e. `SellerProfile.categoryId`/`description` and
   `OrderItem.shippedAt`/`trackingCode` never got added) - simulating a host where the app was
   redeployed but `npx prisma migrate deploy` was never run against the real `DATABASE_URL`
   afterward, exactly the two-separate-steps deploy process `docs/README.md` §5 already
   documents. A real login against that database, then a real `GET /profile`, reproduced the
   crash exactly: `HTTP 500`, and the server log showed
   `PrismaClientKnownRequestError: The column 'OrderItem.shippedAt' does not exist in the
   current database`. Note that this throws from `getOrdersForUser()` - code that predates the
   seller panel entirely - not from the new `getSellerProfile()` call: Prisma 7's generated
   client selects every column the *schema* declares on a model, so once the client is
   regenerated for the new schema, **any** query touching `OrderItem` breaks against an
   un-migrated database, not just seller-panel-specific ones. `/cart`'s checkout flow and every
   `/seller/*` page read `OrderItem` too and would break the exact same way right now if this
   migration is genuinely missing on the live host - `/profile` isn't uniquely broken, it's just
   the page this was first noticed on.
   **The fix is not a code change** - it's the operational step `docs/README.md` §5 already
   calls out as separate from redeploying the app: run `npx prisma migrate deploy` against the
   real production `DATABASE_URL` (from the host itself, or any machine that can reach it - no
   cross-border connectivity issue exists for this host's own MySQL per ADR 20). This session has
   no access to the real production database and did not - and could not - run that command;
   confirming and applying it is the next action on the actual host, not something this fix
   claims to have done.
2. **What *is* a code change:** `/profile`'s own data-fetching (`prisma.user.findUniqueOrThrow`,
   `getOrdersForUser`, `getSellerProfile`) is now wrapped in a `try/catch` that logs
   `[app/(main)/profile] failed to load profile data for userId=<id> - <Error.name>:
   <Error.message>` before re-throwing (Next's error boundary/digest page still renders exactly
   as before - this doesn't swallow or hide the error, only makes its cause identifiable from
   the server's own log without needing to reproduce it first). Same "state the precise reason
   instead of leaving two different failures looking identical" intent as `lib/auth/session.ts`'s
   own catch block (ADR 21) - here the ambiguity being removed is "session actually invalid" vs.
   "session fine, something downstream threw", which otherwise both surface to a real user as the
   exact same generic error page. Scoped to `/profile` only, matching what was asked - not
   applied to every authenticated page in this pass.
3. **The local "shows logged out" result is unrelated to both of the above, and predates the
   seller panel.** `createSession()` (`lib/auth/session.ts`, ADR 21) sets the session cookie with
   `secure: process.env.NODE_ENV === "production"`, and the *compiled* `server.js` Next emits for
   `output: "standalone"` unconditionally hard-codes `NODE_ENV=production` before any app code
   runs - so a `Secure` cookie is always what gets set once running from that build, regardless
   of the actual connection. Confirmed directly: a real OTP verify against `node server.js` on
   plain `http://localhost:<port>` returns `Set-Cookie: ...; Secure; HttpOnly; SameSite=lax`.
   Real browsers (and RFC 6265bis-compliant clients) refuse to store a `Secure` cookie received
   over a non-HTTPS connection - so testing the standalone build via a bare `http://` URL in an
   actual browser silently drops the session cookie, and every following request looks logged
   out, with nothing to report as a verification failure because the cookie was never received in
   the first place. `curl` does **not** enforce this restriction (it stores/replays `Secure`
   cookies over plain HTTP regardless), which is exactly why every `curl`-based reproduction in
   this project's own testing - including this incident's - shows a working session while a real
   browser against the same bare-HTTP test setup would not. This is why `getSession()`'s own
   "request carried no session cookie" log (ADR 21) wasn't seen for this case: it would have
   logged normally if the cookie had actually reached the server, but with the cookie dropped
   client-side, no request carrying it was ever made. **Not a regression** - this exact
   `secure:` line has been unchanged since ADR 21, and the real deployment sits behind a
   TLS-terminating reverse proxy (ADR 21's own comment already documents this assumption), where
   this never triggers. It only surfaces when testing the standalone artifact directly over plain
   HTTP, which this incident's manual test did. **Not changed** - loosening `secure:` to make bare
   -HTTP local testing easier would weaken a real, correct production security property for a
   testing convenience; the accurate way to test session behavior against the compiled build
   locally is `curl` (as this project's own verification passes have done throughout, including
   ADR 26/27) or a local HTTPS-terminating proxy in front of it, not a bare browser tab.
**Verified**, against the real local MariaDB + the actual compiled `.next/standalone/server.js`,
using real HTTP end-to-end for every claim above rather than inspecting code and asserting it:
reproduced the live crash exactly (same error class, same missing-column message) against a
purpose-built pre-migration database, confirmed the fix logs a clear, attributable line for that
exact failure while leaving normal operation (against the real, fully-migrated dev database)
completely silent and unaffected, and confirmed the `Secure`-cookie-over-HTTP mechanism directly
from the raw `Set-Cookie` response header rather than inferring it. `tsc --noEmit` and `eslint .`
clean; `npm run build` succeeds. All throwaway databases and test users created during this
investigation were dropped/deleted afterward.
**Not done, and stated plainly rather than left ambiguous:** running `npx prisma migrate deploy`
against the real production database - this session cannot reach it, and doing so is the actual
resolution for symptom 1. This should be run, then `/profile` (and the other `OrderItem`-touching
pages listed above) re-checked on the live host.

## 2026-09-14 — Seller registration becomes a 4-step wizard

### 29. Multi-step seller registration wizard, plus two bugs found and fixed along the way
**Decision:** Replaced the single-page seller registration form with a 4-step wizard
(`components/seller/SellerRegisterWizard.tsx`, mirroring `WizardFlow`'s own pattern -
`ProgressDots`, a `sessionStorage` draft so navigating to the terms page and back doesn't lose
progress, back/next step nav): step 1 (shop name, avatar, multi-category, short description),
step 2 (business license photo, national ID, union ID, IBAN with a plain-language note on what
it's used for), step 3 (a single terms-acceptance checkbox linking to a new `/legal/seller-terms`
page built from `legal-pages-draft.md` §4), step 4 (address, 1-5 contact phone numbers, a "how
did you hear about us" survey). Final button reads "ثبت اطلاعات و ارسال برای ویورا" per the
request, not the old "ثبت درخواست".
**Schema changes** (`prisma/migrations/20260914101619_seller_registration_wizard`):
`SellerProfile` gained `avatarUrl`, `unionId`, `businessLicenseImageUrl`, `address`,
`phoneNumbers` (`Json`), `referralSource`/`referralSourceOther`, `termsAcceptedAt` (a nullable
"set = happened" timestamp, matching `OtpCode.consumedAt`/`OrderItem.shippedAt`'s convention, not
a boolean); its single nullable `categoryId` was replaced with a `SellerCategory` join table
(`@@id([sellerProfileId, categoryId])`) since a shop can now sell across more than one category
at once. Every new column is nullable at the DB level even though the wizard treats almost all of
them as required - deliberately, not an oversight: `SellerProfile` already had one real row (the
seed fixture) before this migration, and Prisma's non-interactive `migrate dev` can't prompt for
a backfill value for a new `NOT NULL` column with no default, so "required" is enforced entirely
at the API/zod layer here, the same trade-off `cityId` already made under ADR 27.
**A real migration bug, caught before it shipped:** the first generated migration added
`phoneNumbers JSON NOT NULL` with no explicit `DEFAULT`. Applying it locally left the existing
seed row's `phoneNumbers` as an **empty string**, not `[]` - MySQL/MariaDB's own implicit default
for a `NOT NULL` text-like column with no stated default, which is not valid JSON and fails that
same column's own `json_valid()` CHECK constraint on every future read (confirmed directly: a
fresh Prisma query against that row throws). This is the exact same failure shape as ADR 28's
`/profile` incident - a schema change that silently breaks reads on pre-existing rows - except
caught here before the migration was ever pushed anywhere, by testing it against a throwaway
database seeded with one pre-existing row first. Fixed by rewriting the migration SQL to add the
column nullable, backfill `'[]'` explicitly, then tighten to `NOT NULL` - verified by replaying
the corrected SQL from scratch against a fresh throwaway database with a simulated pre-existing
row, not just re-trusting the same environment that already had the column hand-patched.
**Two more bugs found while building this feature, both fixed, neither scoped only to the
wizard:**
1. `app/api/seller/products/route.ts` and `.../products/[id]/route.ts` validated `images` with
   `z.array(z.string().url()).max(6)` (shipped under ADR 27). `z.string().url()` requires an
   *absolute* URL - confirmed directly against zod - but `LocalDiskStorageProvider.save()` (the
   default `STORAGE_PROVIDER`, and what local dev/testing runs without real S3 credentials)
   returns a site-relative path like `/uploads/xyz.png`. Every earlier "end-to-end" test of the
   product-photo upload flow had manually prefixed that path with `http://localhost:3100` before
   sending it - never actually exercising what the real `ProductForm.tsx` client code sends. Real
   browser-driven testing this round (see below) hit the bug directly. Fixed with a shared
   `lib/validation/url.ts`'s `storageUrlSchema` (accepts an absolute URL *or* a `/`-prefixed
   relative path) used by the product routes and this feature's new `avatarUrl`/
   `businessLicenseImageUrl` fields alike, instead of duplicating the bug into new code.
2. The wizard's "شماره‌های تماس" (contact phone numbers) initially reused
   `normalizeIranianPhone()` (ADR 2, mobile-only - it exists for OTP delivery, which requires a
   mobile number). A shop's own listed contact number is reasonably a landline, and real testing
   with one (`02112345678`) was rejected. Added `normalizeIranianContactNumber()` alongside it in
   `lib/validation/phone.ts` (any 10-11 digit number starting with `0`) rather than loosening the
   OTP-specific function, since OTP genuinely does require a mobile number and the two rules
   shouldn't be coupled.
**City selection was dropped from the wizard entirely, not asked about:** the request's step-4
fields don't mention a city selector, and `SellerProfile.cityId` exists purely for phase-gating
(ADR 20's city-rollout mechanism) - with exactly one active city (Tehran) right now, asking a
seller to "choose" between one available option is friction with no real decision behind it, the
opposite of the "warm, stress-free" tone the request asked for throughout. `POST
/api/seller/register` now auto-assigns `cityId` to whichever city is active server-side (erroring
clearly if none is, an edge case that can't happen today but shouldn't fail silently if it ever
did). If a second city ever opens, this one line - not the wizard's UI - is what needs revisiting.
**Default avatars:** 12 flat, single-motif SVGs (`public/avatars/avatar-01..12.svg`, listed in
`lib/avatars.ts`) built directly from this app's own Champagne Rose tokens (`app/globals.css`) -
a circle background plus one geometric shape (dot, triangle, hexagon, diamond, crescent, rings,
star, stripes, dot-grid, plus), no two using the same background/shape color pair. A placeholder
set exercising the picker UI, not the full 50, per the request.
**A significant, previously-unknown finding from real testing, not a defect in this feature's own
code:** verifying the avatar/license image previews in a real browser surfaced that the compiled
`.next/standalone/server.js` **never serves a file added to `public/uploads/` after the server
process started** - not eventually, not after retrying, only after the process itself is
restarted. Confirmed precisely: a freshly-uploaded file (written to disk successfully, confirmed
via `ls`) 404s on its very first request and every request after, served as a rendered Next.js
not-found response (`x-nextjs-cache`/`x-nextjs-prerender` headers present, not a plain static-file
404); restarting the server process with no other change makes the exact same file start
returning `200` immediately. Next.js's standalone server appears to resolve `useFileSystemPublicRoutes`
once at process startup rather than re-checking the filesystem per request - `next dev` is a
different code path and isn't affected (per Next's own docs on how `public/` is generally
served), which is exactly why this never surfaced in any dev-mode use of the app, only when
testing the actual compiled artifact directly, as this project's own testing standard requires.
This makes `STORAGE_PROVIDER="local"` materially worse than previously documented: ADR 27 flagged
it as a *data-loss-on-the-next-deploy* risk; it turns out uploaded files are never servable at all
during the *current* running process either, unless that process happens to restart after the
upload. This doesn't change anything about production (S3 is already the chosen path there, per
ADR 27, and S3-served URLs never touch Next's own static file resolution at all) - recorded here
because it materially changes how "risky" local storage actually is, and because it explains a
gap in this project's own earlier "verified end-to-end" claim for the product-photo upload
feature: that pass never re-fetched an uploaded image, only checked that the API accepted and
stored its URL.
**Verified**, against the real local MariaDB + the actual compiled `.next/standalone/server.js`,
using real HTTP and a real browser rather than reading the code and assuming it works:
- Drove the entire wizard through a real headless Chromium session (Playwright): real OTP login,
  all four steps including picking a default avatar by clicking it, selecting two categories,
  uploading a real business-license image through the actual file input, checking the terms
  checkbox (confirmed its link points at `/legal/seller-terms`), adding a second phone number via
  "افزودن شماره‌ی دیگر", and submitting - landed on `/seller` showing the exact new PENDING copy
  ("به جمع ویورا خوش اومدی!..."), confirmed via a full-page screenshot.
- Confirmed every field in the database afterward: `avatarUrl`, `businessLicenseImageUrl`,
  `nationalId`, `unionId`, `bankAccountIban`, `address`, `phoneNumbers` (both the mobile and the
  landline number, normalized), `referralSource`, `termsAcceptedAt` set, `status: PENDING`, both
  selected categories present in `SellerCategory`, `User.roles` correctly became
  `["CUSTOMER","SELLER"]` (not replacing the existing role), and `cityId` correctly
  auto-assigned to Tehran.
- Screenshotted each step individually to check the actual rendered design against the "warm,
  confident, stress-free" brief - avatars, category chips, and the license-upload dropzone all
  render as intended in the Champagne Rose palette.
- Exercised every validation rule directly via the API with real requests: terms not accepted,
  `referralSource: "other"` with no free text, zero categories selected, and a malformed image
  URL - each rejected with its own specific, correctly-worded error message, not a generic one.
- Re-ran the product-photo upload flow end-to-end with the corrected `storageUrlSchema` using the
  *actual* relative path an upload returns (not a manually-prefixed one this time) - product
  creation now succeeds where it would have silently failed before this fix.
- All test users, seller profiles, category links, the one test product, and uploaded test files
  created during this pass were deleted/removed afterward; the pre-existing seed data (3 users,
  1 seller with 500 products) was confirmed unchanged before and after.
- `tsc --noEmit` and `eslint .` clean; `npm run build` succeeds, all new routes listed in its
  output.
**Not done, per the request's own framing:** the print-partner-specific bullet from
`legal-pages-draft.md` §4 ("پارتنر چاپ متعهد می‌شود...") was left out of `/legal/seller-terms` -
that page is specifically for product sellers going through this wizard, not print partners, and
including a print-partner obligation in a product-seller's terms page would be confusing, not
thorough.

## 2026-09-15 — Minimal admin panel: access, seller approval, city/category toggle

### 30. First ADMIN grant is a direct database edit, matching the seller-approval precedent
**Decision:** Built exactly the three pieces asked for, scoped down from
`panels-and-operations-spec.md` §4's much larger four-area admin panel design (user/partner
management, order operations, platform config, reports - all deliberately out of scope here, per
the request):
1. **Access** (`app/admin/layout.tsx`, `lib/auth/admin.ts`): login is the existing OTP flow,
   unchanged, per the request ("راه ورودش همون سیستم OTP فعلی باشه") - there is no separate admin
   login form. `requireAdmin()` checks `User.roles` (still the same `Json` array every other role
   lives in - ADR 7/20) for `"ADMIN"`, exactly mirroring `requireApprovedSeller()`'s shape. A
   logged-in non-admin hitting `/admin` sees a plain "access denied" message, not a redirect
   loop or a leak of what admin features exist.
2. **Seller approval** (`/admin/sellers`, defaulting to the `PENDING` tab, with `APPROVED`/
   `REJECTED` tabs alongside it - a superset of "list PENDING sellers" for free, at no extra
   design cost, matching the seller panel's own product-list filter convention): the detail page
   shows every field collected at registration (avatar, categories, national ID, union ID,
   business-license photo, IBAN, address, phone numbers, referral survey - not just the four
   fields the request named as examples), since an admin making an approve/reject call needs the
   full picture, not a subset. Approve is one click; reject requires a reason (the pre-existing
   `rejectionReason` column, per the request) via a small inline form. Approving a previously
   -rejected seller clears any stale `rejectionReason` - otherwise a re-approved profile would
   carry a rejection reason that no longer applies.
3. **City/category toggles** (`/admin/catalog`): a plain list of every `City`/`Category` with an
   `ActiveToggle` switch each, replacing the `npm run db:studio`/direct-DB editing
   `docs/README.md` §4 has documented as the only way to do this since Sprint 0. Toggling only -
   no create/delete UI - the request named the switch specifically, and creating a brand-new
   city or category is a materially bigger feature (slug generation, category type/parent/
   sort-order) nothing in the request asked for.
**The first-ADMIN bootstrap question, asked before starting since this is the first time this
role is ever granted:** given `User.roles` is a `Json` array, not a real enum column, the choice
was between (a) a direct database edit - the same mechanism seller approval already uses, zero
new code, and the account holder's real phone number never has to appear in this conversation or
the repository, or (b) a small reusable CLI script for granting roles. **The account holder chose
(a).** The exact command, verified against this session's own local database (see below):
```sql
UPDATE User SET roles = JSON_ARRAY_APPEND(roles, '$', 'ADMIN') WHERE phone = '<real phone>';
```
`JSON_ARRAY_APPEND` (not a hand-typed replacement string) is the important part - it preserves
whatever roles the account already has (almost certainly `["CUSTOMER"]`) instead of risking
overwriting them.
**A real bug caught by testing this against a genuinely malformed request, not just the intended
UI flow:** rejecting a seller with no `reason` field at all (not just an empty one) returned
zod's own raw English message ("Invalid input: expected string, received undefined") instead of
the route's own Persian one - `z.string().min(1, "...")`'s custom message only covers the
*too-short* failure, not the separate *wrong-type-or-missing* failure zod raises first when a
field isn't present at all. The reject form's own `required` textarea attribute means a real
admin can't actually trigger this through the UI, but the same gap existed in
`app/api/seller/register/route.ts` (found by systematically testing every field's *missing
entirely* case, not just the one this incident happened to surface) and in the shared
`storageUrlSchema` (`lib/validation/url.ts`, so this also covers the product-image routes from
ADR 29) - any of these are reachable by anyone calling the API directly, not only through this
app's own bundled UI. Fixed everywhere by passing `{ error: "..." }` as a second argument
alongside the existing `.min()`/`.regex()` message, which zod v4 uses for the base
type-or-presence failure specifically - confirmed field-by-field with a script that removes one
key at a time from an otherwise-valid payload and checks the returned message is Persian, not
just fixed for the one field manually tested.
**Verified**, against the real local MariaDB + the actual compiled `.next/standalone/server.js`,
using real HTTP rather than reading the code and assuming it works:
- A fresh, ordinary logged-in user hitting `/admin` saw the access-denied screen, and a direct
  `POST` to an admin API route returned `403` - confirmed the gate isn't just a UI-level
  redirect.
- Ran the exact bootstrap `UPDATE ... JSON_ARRAY_APPEND ...` command above against that same
  user; `/admin` (and its API routes) worked immediately on the very next request, with no
  re-login - confirming `requireAdmin()` really does re-check the database per request rather
  than relying on anything cached in the session.
- Registered two real pending sellers through the actual registration API, approved one and
  rejected the other (with a reason) through the real admin routes; confirmed both outcomes in
  the database, that the approved seller's own `/seller` now shows their dashboard, and that the
  rejected seller's own `/seller` shows the exact reason text just entered - the full loop, not
  just the admin side of it.
- Toggled a category off via the real API and confirmed it disappeared from the seller
  registration wizard's live category list (the same `getActiveProductCategories()` every other
  active-only query in this app already depends on), then toggled it back on and confirmed it
  reappeared - not just that the database row flipped. Did the same for a city, then restored it
  to its original (inactive) seed state.
- All test users, seller profiles, and category links created during this pass were deleted
  afterward; the toggled category/city were both restored to their pre-test state; the
  pre-existing seed data (3 users, 1 approved seller, 500 products) was confirmed unchanged
  before and after.
- `tsc --noEmit` and `eslint .` clean; `npm run build` succeeds, every new route listed in its
  output.
**Not built, per the request's explicit scope:** seasonal themes/banners, AI extractor settings,
reports/analytics, discount codes - all named in `panels-and-operations-spec.md` §4 and
explicitly deferred by the request to a later phase. Also not built: creating new cities or
categories (toggle-only, see above), customer account management, and an audit log of admin
actions (§4's own "تکمیلی" list) - none of these were asked for in this phase.

---

## 2026-09-15 — print partner (چاپ بادکنک تبلیغاتی)

### 31. Print-partner core built on the existing `ServiceProviderProfile`/`ServiceOffering`/
`Order`/`OrderItem` models, not a parallel schema
**Decision:** Built exactly the three pieces asked for from `panels-and-operations-spec.md`'s
"پنل پارتنر تولید" section, deliberately scoped down from that doc's larger design (order-
reassignment marketplace, paid "تاییدیه‌ی ویژه" badge, visual partner calendar - all explicitly
deferred):
1. **Provider registration/profile** (`components/provider/ProviderRegisterWizard.tsx`,
   `/api/provider/register`): a 2-step wizard reusing `ServiceProviderProfile` (added
   `businessLicenseImageUrl`, `commissionRate` given a `@default(10.00)`) and `ServiceOffering`
   (added `supportsChrome`/`supportsMatte`, `printableColors Json`, `minOrderQuantity`, and a new
   `PrintPricingTier` child model for the partner's self-defined quantity-band pricing). Registers
   PENDING, exactly mirroring the seller wizard's shape (`lib/auth/provider.ts` is a line-for-line
   mirror of `lib/auth/seller.ts`).
2. **Customer order flow** (`app/(main)/print/page.tsx`, `components/print/PrintOrderFlow.tsx`,
   `lib/data/print.ts`, `/api/print-orders*`): design-file upload, finish/color/quantity form,
   normal-vs-express delivery choice (express adds a flat fee read from `PlatformSetting`), then a
   matching step that lists only providers who (a) are `APPROVED`, (b) support the requested
   finish, (c) list the requested color, and (d) have `minOrderQuantity <= quantity` - each shown
   with its tier-priced total and a `completedOrderCount` (from `shippedAt IS NOT NULL`, since no
   rating system exists yet, per the request). Order creation re-validates every one of those
   conditions server-side against a fresh DB read rather than trusting the client's own earlier
   `/match` response, and re-computes the price from the matching `PrintPricingTier` rather than
   accepting a client-supplied total.
3. **Provider-side order management** (`app/provider/(panel)/orders/*`,
   `/api/provider/orders/[itemId]/{accept,ship}`): two-stage visibility gated on the new
   `OrderItem.acceptedAt` (nullable - "set = happened," the same pattern `hubStatus`/`shippedAt`
   already use) - before accept, only customer name/quantity/delivery date are shown; accepting
   unlocks the design-file download link, color, finish, and notes. Shipping is blocked until
   accepted ("ابتدا باید سفارش را بپذیرید") and, exactly like the seller order flow, flips the
   parent `Order.status` to `SHIPPED` only once every item on that order has been shipped.
**Why `Order`/`OrderItem` reuse over a separate model, per the account holder's explicit answer
when asked:** the wizard engine has already been putting print-balloon line items into suggested
carts as `kind: "service"` + `providerId` since its earliest tests - a parallel order model would
fork that pipeline rather than extend it, for a feature that is structurally an order line item
(quantity, price, a provider to fulfil it, a delivery/shipping lifecycle) like any other. The new
fields added to `OrderItem` (`designFileUrl`, `printColor`, `printFinish`, `isExpressDelivery`,
`requestedDeliveryDate`, `expressFee`, `customerNotes`, `acceptedAt`) are all nullable and
print-specific, following the same "extend the existing row, don't fork the model" precedent
`hubStatus`/`shippedAt` set for the seller hub flow (ADR 6).
**Why offerings are created `isActive: false` and only flipped true on admin approval:** a
PENDING provider's print listing must never be visible to customers before approval - this is
enforced twice, independently: `lib/data/print.ts`'s `activePrintOfferingFilter` already checks
`provider: { status: "APPROVED" }` on every query, and `isActive: false` at creation means even a
bug or a future query that forgets that provider-status check still can't surface it. Approval
(`/api/admin/providers/[id]/approve`) flips both `ServiceProviderProfile.status` and every one of
that provider's `ServiceOffering.isActive` rows in the same transaction, mirroring the seller
approve route's `rejectionReason: null` clearing on approval.
**Admin approval queue** (`/admin/providers`, mirroring `/admin/sellers`'s PENDING/APPROVED/
REJECTED tabs exactly): the detail page shows identity info, the license document, print settings
(finish types, min quantity, colors), and the full pricing-tier table, since - same reasoning as
ADR 30's seller detail page - an admin approve/reject decision needs the whole picture, not a
subset.
**A migration bug caught proactively before shipping, same class as ADR 29:** `ServiceOffering.
printableColors JSON NOT NULL` with no explicit SQL `DEFAULT`, applied against a table with one
pre-existing seeded row, left that row's value as MySQL's implicit empty-string default - not
valid JSON, so it fails the column's own `json_valid()` CHECK constraint on every future read.
Fixed with the by-now-standard pattern: add nullable → `UPDATE ServiceOffering SET
printableColors='[]' WHERE printableColors IS NULL` → `MODIFY COLUMN ... NOT NULL`. This was
checked for and fixed *before* the migration was ever applied to the real dev database, by
recognizing the pattern from ADR 29 rather than rediscovering it the same way (a broken read).
**Verified**, against the real local MariaDB + the actual compiled `.next/standalone/server.js`,
using real HTTP throughout (two fresh provider accounts, one fresh customer account, one fresh
admin account, all via the real OTP flow):
- Replayed every migration from scratch against a throwaway database with a simulated
  pre-existing `ServiceOffering` row inserted before the `print_partner` migration ran - confirmed
  the row ends up with a valid `[]`, not the broken empty string.
- Registered a provider with two pricing tiers (50-199 → 6,000 / 200+ → 5,000); confirmed the
  profile landed `PENDING`, its offering `isActive = 0`, both tiers persisted correctly, and
  `SERVICE_PROVIDER` was appended (not replacing) the account's existing `["CUSTOMER"]` roles.
  Confirmed the PENDING panel screen shows the exact welcome copy with the business name
  interpolated.
- Granted `ADMIN` to a separate fresh account via the same direct-DB `JSON_ARRAY_APPEND` bootstrap
  ADR 30 established (no new bootstrap mechanism needed - it already generalizes). Confirmed the
  provider showed up in `/admin/providers?status=PENDING`, approved it, and confirmed both the
  profile flipped `APPROVED` and the offering flipped `isActive = 1` in the same check - then that
  the provider's own `/provider` now rendered the real dashboard instead of the PENDING screen.
- Matching correctness, each checked as a distinct request against the real endpoint: a provider
  whose `supportsMatte = false` is correctly excluded from a `MATTE` search; a color not in a
  provider's `printableColors` returns zero matches; a quantity below every matching provider's
  `minOrderQuantity` returns zero matches; a quantity exactly on a tier boundary (200, where tiers
  are 50-199/200-999) returned the *upper* tier's price (5,000), not the lower one - confirming
  the boundary comparison is `>=`, not off-by-one.
- Placed a real express order (design-file upload, `CHROME`/red/200 units, express with a future
  date): confirmed `Order.orderType = SERVICE`, `totalAmount` equalled the tier price
  (200 × 5,000 = 1,000,000) plus the seeded express fee (150,000) exactly, and every print-specific
  `OrderItem` field persisted correctly. Separately confirmed an express order missing
  `requestedDeliveryDate` is rejected server-side with a Persian message, not silently accepted.
- Placed a second, normal-delivery order (60 units, tier 1 → 6,000/unit) and confirmed its total
  (360,000) carries no express fee, `isExpressDelivery = 0`.
- Two-stage visibility on the real order detail page: before `accept`, the rendered HTML contained
  neither the design-file download link nor the customer's notes text (only name/quantity/delivery
  date); after accepting, both appeared, along with the finish/color. Attempting to `ship` before
  `accept` was rejected with "ابتدا باید سفارش را بپذیرید"; attempting to `accept` an
  already-accepted order was rejected; a *different* provider's session attempting to `accept` this
  order returned 403; a plain customer session hitting the same endpoint also returned 403.
- Shipped the express order with a tracking code and confirmed `Order.status` flipped to `SHIPPED`
  (the only item on that order); confirmed a subsequent `/match` call for the same finish/color/
  quantity now reported `completedOrderCount: 1` for that provider and sorted it ahead of a
  same-search competitor with `completedOrderCount: 0`.
- Reject flow: rejecting a second test provider with no `reason` field returned the route's own
  Persian message, not zod's raw English (this route was written with the ADR 30 lesson already
  applied, and this confirms it holds) - and its offering correctly stayed `isActive = 0` since it
  was never approved. The rejected provider's own `/provider` panel showed the exact rejection
  reason text.
- All test users (4 phone numbers), both provider profiles, their offerings/tiers, and both real
  orders/order-items created during this pass were deleted afterward; uploaded test files removed
  from `public/uploads/`; pre-existing seed data (the one seeded approved provider/offering/tiers,
  `PlatformSetting` rows) confirmed unchanged before and after.
- `tsc --noEmit` and `eslint .` clean; `npm run build` succeeds, every new route (`/print`,
  `/provider*`, `/admin/providers*`, `/api/provider/*`, `/api/print-orders*`,
  `/api/admin/providers/*`) listed in its output.
**Not built, per the request's explicit scope:** order-reassignment marketplace ("بازار واگذاری
سفارش"), the paid "تاییدیه‌ی ویژه‌ی ویورا" badge, and a visual partner calendar - all named in
`panels-and-operations-spec.md`'s print-partner section and explicitly deferred by the request to
a later phase. Also not built: a real rating system (`completedOrderCount` is the only ranking
signal for now, exactly as the request anticipated - "می‌تونه صفر/خالی باشه").

---

## 2026-09-15 — print-partner review pass: four gaps found against the original design doc

### 32. Jalali date picker, admin-curated color catalog, computed delivery-date range
**Decision:** Four fixes to the print-partner feature (ADR 31), found on a re-read of
`panels-and-operations-spec.md`'s print-partner section against what was actually shipped:
1. **A real Jalali (Persian) date picker** (`lib/jalali.ts`, `components/ui/JalaliDatePicker.tsx`)
   replaces the native `<input type="date">` that the express-delivery date field used. A native
   date input always renders the Gregorian calendar regardless of `lang`/locale - a real HTML
   limitation, not something CSS or a locale attribute fixes - while every other Persian-date
   *display* in this app (`toLocaleDateString("fa-IR")`) already converts correctly, since that's
   Intl/ICU's job, not the browser widget's (verified directly: Node's ICU has full Jalali
   support). `lib/jalali.ts` wraps `jalaali-js` (MIT, zero dependencies, the Borkowski algorithm -
   the same one and JS ecosystem's de facto standard) for the Jalali<->Gregorian conversion this
   needs; hand-rolling that conversion was considered and rejected; correctness here matters (a
   subtle date-math bug is the kind of thing that ships silently wrong) and the leap-year break
   table the real algorithm needs is exactly the kind of "solved problem, don't reinvent it"
   case this project already accepts for `zod`/`jose`/`clsx`. `JalaliDatePicker` is a popover
   month-grid (prev/next navigation, Saturday-first week per Persian convention, disabled days
   before a `minIso` bound) - not three raw day/month/year `<select>`s, which would read as a
   bureaucratic form control rather than matching the "warm, confident" brand identity ADR 29
   established for this whole registration/ordering experience.
2. **`PrintColor` model** (`prisma/schema.prisma`) replaces free-text color entry at partner
   registration with an admin-curated catalog - the original design
   (`panels-and-operations-spec.md`'s print-partner section, re-read for this pass) always
   specified a fixed, admin-managed color list, not partner-defined free text; ADR 31 missed this
   and let partners type anything. `ServiceOffering.printableColors` still stores the chosen
   names as a plain JSON string array, not a relation to `PrintColor` - a partner's already-saved
   selection must survive an admin later removing that color from the catalog (their offering
   keeps showing what they actually support; only *new* selections and the customer-facing color
   list are affected), and MySQL's `json_valid()` machinery already makes that array the
   established pattern for this exact field (ADR 20, ADR 31). Admin management lives as a third
   section on the existing `/admin/catalog` page (add a color, remove one - no toggle, unlike
   City/Category's phased-rollout `isActive` switch, because a print color has no "not ready yet"
   phase the way an unlaunched city does: it's either offered or it isn't) rather than a new nav
   tab, matching `panels-and-operations-spec.md` §4's own grouping of color/city/category
   management under one "پیکربندی پلتفرم" concern. The provider registration wizard's free-text
   input + chips became a checkbox list sourced from this catalog, and
   `/api/provider/register` now re-validates every submitted color against the live `PrintColor`
   table server-side (never trusting the client's checkbox state - the same "never trust the
   client" posture ADR 31's `/api/print-orders` already applied to the matching step). The
   customer-facing color list (`getPrintColorNames`, `lib/data/print.ts`) switched from *deriving*
   available colors from what currently-qualifying offerings happen to support to reading the
   admin catalog directly - the two are meant to be the same list now that one exists, and
   matching can legitimately return zero partners for a given color (already a handled UI state:
   "فعلاً پارتنری با این مشخصات پیدا نشد"), so there's no correctness reason left to hide a
   catalog color just because nobody currently supports it.
3. **Normal delivery shows a real calendar date range, not prose.** `print_normal_turnaround_text`
   (a free-text `PlatformSetting`, e.g. "معمولاً ۳ تا ۵ روز کاری") is replaced by
   `print_normal_turnaround_days` (`{ minDays, maxDays }`), and `getPrintDeliverySettings()`
   resolves it against "today" server-side into two real ISO dates
   (`normalDeliveryFromDate`/`normalDeliveryToDate`) - a customer choosing normal delivery now
   sees "تحویل بین ۲۷ شهریور تا ۲۹ شهریور ۱۴۰۵", not a relative description that never says *which*
   dates to actually expect. Resolved once per page request rather than shipping raw day counts
   to the client and computing "today" there, so the date shown is always anchored to the
   server's clock, matching how every other request-time value in this app is computed. Kept to
   plain calendar-day arithmetic (no Friday/business-day skipping, no holiday calendar) -
   `panels-and-operations-spec.md` itself only ever asked for an approximate range ("بازه‌ای، مثلاً
   شنبه تا سه‌شنبه"), and modeling Iran's actual business-day/holiday calendar is real scope this
   phase never asked for.
4. **Naming audit: no code change needed.** The spec's own naming note ("به‌جای «چاپ‌کننده» →
   **پارتنر تولید**") was checked against every Persian string in `app/`, `components/`, and
   `lib/` (`grep` for چاپ‌کننده/چاپ کننده/چاپخانه/چاپگر/پرینتر across all of ADR 31's new code) -
   already consistently "پارتنر تولید" everywhere a role/entity is named. The only "چاپخانه" hit
   is `prisma/seed.ts`'s fake business name ("چاپخانه گلرنگ"), a proper noun for one seeded
   partner's shop name, not a UI label for the role - left as-is.
**Verified**, against the real local MariaDB + the actual compiled `.next/standalone/server.js`:
- `lib/jalali.ts`'s conversion functions round-tripped correctly via a direct `tsx` check
  (`toJalaali`/`toGregorian` inverse, `formatJalaliRange` across both a same-year and a
  year-boundary-crossing pair, `jalaaliMonthLength` for a known leap/common year).
- Real Playwright interaction (Chromium, not just reading the component's source) against the
  live `/print` page's date picker: today (before the `minIso` bound) renders disabled, tomorrow
  renders selectable and becomes the shown value on click; "ماه قبل" (prev month) is disabled
  while viewing the bound month and re-disables correctly after navigating forward and back;
  navigating to the next month shows the correct next Jalali month name, the correct day count
  for that month (۳۰ for مهر, a 30-day month), and zero disabled days (a fully-future month has
  no `minIso` boundary inside it). The selected date then correctly appeared in the step-3
  confirmation via `formatJalaliLong` ("فوری - ۲۵ شهریور ۱۴۰۵").
- Admin color management via real HTTP: added a color, confirmed it appears on `/admin/catalog`;
  duplicate add rejected with a Persian message (not a raw constraint error); empty/whitespace
  name rejected; a non-admin session's add attempt returned 403; deleted the color, confirmed a
  second delete on the same id returns a 404 with a Persian message.
- `/api/provider/register` with a color not in the `PrintColor` table was rejected
  ("یک یا چند رنگ انتخاب‌شده دیگر معتبر نیست."); the identical request with a real catalog color
  succeeded - confirms server-side re-validation actually runs, not just the checkbox UI
  happening to only offer valid options.
- Real Playwright check of the provider registration wizard's step 2: 8 checkboxes rendered (2
  balloon-finish + 6 seeded colors), zero free-text color inputs present - confirms the free-text
  chip UI is fully gone, not just visually replaced while the old input still exists.
- `/print`'s rendered HTML showed "تحویل بین ۲۷ شهریور تا ۲۹ شهریور ۱۴۰۵" against a request made on
  2026-09-15 (Jalali ۱۴۰۵/۶/۲۴) with the seeded `{minDays: 3, maxDays: 5}` - matches
  today+3/today+5 exactly.
- All test users, the one test provider profile/offering/tier created during this pass, and
  uploaded test files were deleted afterward; the stale `print_normal_turnaround_text` row (left
  over from before this ADR, now fully superseded by `print_normal_turnaround_days`) was removed
  from the local dev database.
- `tsc --noEmit` and `eslint .` clean; `npm run build` succeeds, `/api/admin/print-colors` and
  `/api/admin/print-colors/[id]` listed in its output alongside every pre-existing route.
**Rejected:** three raw `<select>` dropdowns (day/month/year) for the date picker - functionally
sufficient but reads as an administrative form control, not the "warm, confident" experience this
whole flow is meant to be. A relation from `ServiceOffering.printableColors`/`OrderItem.printColor`
to `PrintColor` instead of a plain string snapshot - would make an admin's color removal
retroactively invalidate a partner's existing offering or a past order's historical record, which
is exactly the failure mode a snapshot avoids; nothing about this feature needs *querying* "which
offerings use color X" at the database level, so the relation would add complexity with no
matching use case.

---

## 2026-09-15 — customer reviews/ratings + support tickets

### 33. `OrderItem.deliveredAt` (customer-confirmed) gates reviews; `Review`/`SupportTicket`/
`TicketMessage` get their first real UI
**Decision:** Built both pieces asked for, both using models that already existed as schema
placeholders (`Review`, `SupportTicket`, `TicketMessage` - present since Sprint 0, unused by any
UI until now):
1. **Reviews & ratings**: a customer's own order detail page (`app/(main)/orders/[id]/page.tsx` -
   the first customer-facing order detail page; before this, `/profile`'s order history was a
   flat, unlinked list) gets a "سفارش رو دریافت کردم" button once `Order.status === "SHIPPED"`.
   Clicking it (`POST /api/orders/[id]/deliver`) sets a new `OrderItem.deliveredAt` on every item
   and flips `Order.status` to `DELIVERED`. Once an item has `deliveredAt`, its review prompt (a
   1-5 star picker + optional comment, `components/reviews/ReviewForm.tsx`) appears in its place
   until submitted, after which the submitted rating/comment shows instead - one review per
   `OrderItem`, matching `Review.orderItemId`'s existing `@unique` constraint (which the request
   itself asked for: "هر کاربر فقط یه‌بار برای هر آیتم سفارش می‌تونه نظر بده"). Reviews display
   with an average + count on the product detail page (`ReviewList`, reading
   `getProductReviewSummary`); the identical `getServiceOfferingReviewSummary` exists for the same
   purpose on a service-offering detail page, but no such browsable page exists yet (print is a
   guided order flow, not a catalog) - wired up the moment one does, without any further schema or
   query work.
2. **Support tickets**: customer side (`/support` list, `/support/new`, `/support/[id]` thread,
   all reached from a new "تماس با پشتیبانی" button on `/profile`) and admin side
   (`/admin/tickets` with OPEN/IN_PROGRESS/RESOLVED/CLOSED tabs - all four `TicketStatus` values
   get a tab, not just the three the request named as examples, same reasoning as ADR 30's
   PENDING/APPROVED/REJECTED sellers queue - and `/admin/tickets/[id]` with a status selector)
   share one `TicketThread` presentational component and one `TicketReplyForm`/reply endpoint
   (`POST /api/support/tickets/[id]/messages`) - who's allowed to post is resolved server-side
   (the ticket's own owner, or an admin), not by which page happens to call it, so there's exactly
   one message-creation code path instead of two nearly-identical ones.
**Why the customer confirms delivery explicitly, rather than gating reviews on `SHIPPED` directly
or auto-marking `DELIVERED` some days after shipping - asked of the account holder, since nothing
in the codebase set `Order.status` to `DELIVERED` before this (it only ever reached `SHIPPED`, an
enum value that had existed unused since Sprint 0):** the account holder chose the explicit
customer-confirmation button, for a reason beyond preference -
`docs/legal-pages-draft.md` §3 defines the physical-product return window as "ظرف ۲۴ ساعت پس از
تحویل" (within 24 hours *of delivery*), which needs a real delivery timestamp to ever be
enforceable; treating `shippedAt` as good enough, or auto-marking delivered after some
configured lag, would both leave that legal clause permanently unimplementable, since neither
produces the moment the customer actually received the order. `deliveredAt` follows the exact
same nullable "set = happened" convention `shippedAt`/`acceptedAt` already established (ADR 27,
31) rather than a new status enum value, for the same reason those were nullable timestamps: it's
a fact about one event, not a state machine with further transitions.
**Why confirm-delivery operates on the whole `Order`, not per `OrderItem` (unlike `shippedAt`,
which is genuinely per-item since different sellers ship independently):** the customer only ever
experiences one delivery event - one parcel arrives, whether it contains one seller's items or
(via the hub pipeline, ADR 6) several sellers' combined shipment - so there is no real per-item
"I received seller A's item but not seller B's" case to model for confirmation, unlike shipping
where sellers genuinely act independently and at different times. By the time `Order.status`
reaches `SHIPPED` every item already has `shippedAt` (the seller/provider ship routes only flip
that status once true), so the confirm-delivery route is a single unconditional update across all
items, not the incremental "only flip once everything's done" logic the ship routes need.
**Why the product detail page needed `dynamic = "force-dynamic"` added (a real, if small,
behavior change to a pre-existing page):** without it, a dynamic-segment page with no
`generateStaticParams` is cached after its first render - meaning a newly submitted review would
never appear there until the next deploy. This wasn't a pre-existing bug worth fixing on its own;
it became one the moment this page started showing live, frequently-changing review data, the
same reasoning behind every other `force-dynamic` export already in this codebase.
**Verified**, against the real local MariaDB + the actual compiled `.next/standalone/server.js`,
using real HTTP throughout (a fresh customer, the existing seeded seller, a fresh admin, and a
fourth unrelated "stranger" account, all via the real OTP flow):
- Placed a real order via `/api/checkout` against a seeded product, shipped it via the existing
  seller ship route, confirmed the order detail page's "سفارش رو دریافت کردم" button appears only
  once `SHIPPED`. A non-owner session hitting the deliver endpoint got a 404 (not 403 - doesn't
  confirm the order id exists to a non-owner); the owner's confirmation flipped
  `Order.status = DELIVERED` and set `OrderItem.deliveredAt`; a second confirmation attempt was
  correctly rejected ("قبلاً تحویل داده شده است").
- The review form appeared only after delivery confirmation; submitting `rating: 0` was rejected
  by zod ("امتیاز را انتخاب کنید."); a non-owner session got a 404 on the same `orderItemId`; the
  owner's real submission (rating 4, a Persian comment) succeeded and immediately appeared on the
  product's real detail page with the correct average ("۴ از ۱ نظر"); a second submission for the
  same `orderItemId` was rejected ("قبلاً … نظر ثبت کرده‌اید").
- Created a real ticket via the customer flow; confirmed it listed on `/support` and its initial
  message rendered on `/support/[id]`. Confirmed the admin account hitting the *customer* route
  `/support/[id]` for a ticket it doesn't own got a 404 (that route is the customer's own view,
  not an admin shortcut - admins use `/admin/tickets/[id]`), while `/admin/tickets?status=OPEN`
  and `/admin/tickets/[id]` correctly showed the same ticket with the customer's message labeled
  "مشتری". Admin reply + status change (`IN_PROGRESS`) both succeeded and were immediately visible
  on the customer's own `/support/[id]`, with the reply correctly labeled "پشتیبانی ویورا". A
  fourth, wholly unrelated account attempting to post a message on this ticket got a 403; the
  actual owner's own reply succeeded. An invalid status string was rejected by the admin status
  route; resolving the ticket correctly dropped the admin dashboard's new "تیکت باز" stat tile
  from 1 to 0.
- All test users (4 phone numbers, the pre-existing seeded seller account's session cookie only -
  its own `User` row was never deleted), the one test order/order-item, the one test review, and
  the one test support ticket (with its messages) created during this pass were deleted
  afterward; the seeded product/seller/review-free baseline was confirmed unchanged.
- `tsc --noEmit` and `eslint .` clean; `npm run build` succeeds, every new route (`/orders/[id]`,
  `/support*`, `/admin/tickets*`, `/api/orders/[id]/deliver`, `/api/reviews`,
  `/api/support/tickets*`, `/api/admin/tickets/[id]/status`) listed in its output.
**Not built, per the request's explicit scope:** discount codes (needs a new database model -
next phase, per the request) and real-time ticket notifications (a page refresh is enough for
now, per the request - explicitly deferred, not overlooked).

---

## 2026-09-15 — support-ticket review pass: a real sender-labeling bug, plus two extensions

### 34. `TicketMessage.isFromStaff` (set by which route replied, not who); ticket system opened to
sellers/providers; admin sender-type filter
**Decision:** Three fixes to the support-ticket half of ADR 33, reported after the account
holder tested the live deploy:
1. **Fixed a real sender-mislabeling bug.** `TicketThread` used to classify each message by
   comparing `message.authorId` to `ticket.userId` ("is this the ticket owner's own message?").
   That comparison is correct for a customer with no ADMIN role, but breaks down exactly for the
   account this project's own admin bootstrap (ADR 30) produces: an existing account that a
   direct-DB edit *also* granted ADMIN, rather than a separate staff account. When that account
   replies to its *own* ticket from `/admin/tickets` (intending to answer as staff), `authorId`
   is still equal to `ticket.userId` - same person, same row - so the old logic showed it as a
   customer message, identically styled to the customer's own message right above it. Fixed by
   adding `TicketMessage.isFromStaff`, set explicitly by *which reply route* handled the request,
   never re-derived from identity: `/api/support/tickets/[id]/messages` (the ticket owner's own
   route - reused as-is for the seller/provider case below) always creates `isFromStaff: false`
   after checking `ticket.userId === session.userId`, with no admin fallback anymore; a new,
   separate `/api/admin/tickets/[id]/messages` always creates `isFromStaff: true` after
   `requireAdmin()`, with no ownership check (an admin can reply to anyone's ticket). The same
   physical account posting through both routes now correctly produces one owner-labeled message
   and one staff-labeled one - confirmed directly (see Verified below), not just reasoned about.
2. **Support tickets opened to sellers and providers.** `SupportTicket.userId` already pointed at
   a plain `User`, not a role-specific table, so nothing in the schema blocked a seller or
   provider from filing one - the only missing piece was a way to get there. Added a "تماس با
   پشتیبانی" button to both the seller and provider dashboards, linking to the exact same
   `/support` pages the customer profile already used. No new pages, no role-specific branching
   in any of them - they were already role-agnostic.
3. **Admin sender-type filter.** `/admin/tickets` gets a second row of tabs (همه/مشتری/فروشنده/
   پارتنر تولید) alongside the existing status tabs, plus a small sender-type badge on every row
   in the list - both independent of status, combinable via `?status=&type=` query params. A
   ticket has no stored "sender type" - `classifyTicketSender()` (`lib/data/support.ts`) reads it
   live off the ticket owner's *current* `sellerProfile`/`serviceProviderProfile` relations (an
   account with a seller profile is classified "فروشنده", one with a provider profile
   "پارتنر تولید", anyone else "مشتری" - seller takes priority over provider on the rare account
   holding both), matching the "never cache a role, always a fresh lookup" pattern every other
   role check in this app already follows (ADR 21). This also made the thread's owner-side label
   role-aware for free: `TicketThread`'s `ownerLabel` prop is now this same classification instead
   of a hardcoded "مشتری", so a seller's own message reads "فروشنده" in the admin's view of their
   ticket, not a misleading blanket "مشتری".
**Why splitting into two routes, not a request-body flag like `{ body, asStaff: true }`:** a
client-supplied flag is trivially forgeable - anyone could POST `asStaff: true` to the shared
endpoint and have their message rendered as an official reply. Which URL handled the request is
decided entirely server-side by routing and its own `requireAdmin()`/ownership check, so there is
no equivalent trust boundary to forge. `TicketReplyForm` (unchanged internally) now takes an
`endpoint` prop instead of a bare `ticketId`, the same shape `ApproveButton`/`RejectForm` already
use (ADR 30/32) for "identical UI, different backing route depending on which page renders it."
**Verified**, against the real local MariaDB + the actual compiled `.next/standalone/server.js`,
using real HTTP throughout:
- Reproduced the exact reported scenario: one account, granted ADMIN over its own existing
  `CUSTOMER` role (the same bootstrap shape ADR 30 documents), created a ticket, then posted one
  reply through `/api/support/tickets/[id]/messages` and one through
  `/api/admin/tickets/[id]/messages` - all three messages share the identical `authorId`, but the
  database rows show `isFromStaff` as `0, 0, 1` respectively, and both the ticket owner's own
  `/support/[id]` view and the admin's `/admin/tickets/[id]` view of the *same* thread rendered
  the first two as "مشتری" and the third as "پشتیبانی ویورا" - confirming the fix from both the
  data layer and both rendering surfaces, not just one.
- A fresh seller account (a directly-inserted `SellerProfile`, APPROVED) and a fresh provider
  account (`ServiceProviderProfile`, APPROVED) each saw "تماس با پشتیبانی" on their own dashboard,
  and each successfully created a real ticket via the existing `/support/new` flow with no code
  changes needed there.
- `/admin/tickets?status=OPEN` with no `type` showed all three tickets (the self-admin's,
  seller's, provider's); `type=SELLER`, `type=SERVICE_PROVIDER`, and `type=CUSTOMER` each
  correctly narrowed to exactly the one matching ticket; the unfiltered list's per-row badges
  read "فروشنده"، "پارتنر تولید"، and "مشتری" respectively, next to the right subjects.
- Access control on the split routes: a fourth, wholly unrelated account (neither the ticket
  owner nor an admin) got a 404 from the owner route and a 403 from the admin route; the admin
  account itself, deliberately hitting the *old* owner-only route on a ticket it doesn't own,
  now gets a 404 too - confirming the admin fallback is actually gone, not just unused - and
  correctly succeeded once it used the dedicated admin route instead.
- All test accounts (4 phone numbers), the directly-inserted seller/provider profiles, and all
  three test tickets (with their messages) created during this pass were deleted afterward.
- `tsc --noEmit` and `eslint .` clean; `npm run build` succeeds, the new
  `/api/admin/tickets/[id]/messages` route listed in its output alongside every pre-existing one.
**Rejected:** inferring staff-ness from "does this account currently hold ADMIN" at render time
instead of storing `isFromStaff` per message - this is exactly the identity-based approach that
caused the original bug (an admin who is also the ticket's owner would still be misclassified,
just via a different comparison), and it would also retroactively relabel a *past* message if the
account's roles ever changed later, which a fact about a specific moment in time (who this reply
was sent *as*) should never do.

---

## 2026-09-15 — two independent discount mechanisms

### 35. Platform `Coupon` (admin-managed, absorbed by Viora) + seller `Product.discountPrice`
(seller-absorbed, no dedicated model) - deliberately kept separate, stackable
**Decision:** Built exactly the two mechanisms asked for, kept structurally independent per the
request's own framing ("این دوتا کاملاً مستقل از هم پیاده بشن"):
1. **`Product.discountPrice`** - one new nullable column on `Product`, no new model. When a
   seller sets it (must be strictly less than `price`, enforced in both `ProductForm`'s submit
   button and both product API routes' zod `superRefine` - never in SQL, matching this schema's
   existing convention of validating cross-field invariants at the API layer, not the DB), it is
   simply *the* price everywhere a real amount is computed - `unitPrice`/`splitAmount` at
   checkout, the strikethrough display on `ProductCard` and the product detail page. No separate
   "seller discount" calculation exists anywhere; `discountPrice ?? price` is the one place this
   is resolved (`/api/checkout`), same as how `unitPrice` has always just been "the product's
   price" before this.
2. **`Coupon`** - a new model, admin-managed at `/admin/coupons` (create + an `isActive` toggle,
   never a hard delete - `Order.couponId` references it, and the toggle-not-delete convention
   already established for City/Category (ADR 30) and reused for PrintColor (ADR 32) applies
   here too, for the same reason: a coupon that's been used must stay resolvable). Supports both
   `PERCENTAGE` (with an optional `maxDiscountAmount` cap) and `FIXED_AMOUNT`, an optional
   `minOrderAmount`, optional total and per-user redemption caps, and an optional
   `startsAt`/`endsAt` window. `validateCoupon()` (`lib/data/coupons.ts`) is the single place
   every one of these rules is checked, shared by a lightweight preview endpoint
   (`/api/coupons/validate`, called while the customer is still editing their cart or print
   order, so they see the real discount before committing) and both order-creation routes
   (`/api/checkout`, `/api/print-orders`), which **never trust the preview result** and
   re-validate everything (still active, still within its window, still under its redemption
   caps, still meets `minOrderAmount` against the real server-computed subtotal) at the moment of
   actually charging - the identical "never trust an earlier read" posture ADR 31 established for
   print-partner matching, applied here to a case where the stakes are a real discount amount,
   not just a stale provider list. Redemption counts are computed directly from `Order` rows
   (`count({ couponId, paymentStatus: "PAID" })`, optionally `+ userId`) rather than a separate
   `CouponRedemption` join table - nothing about this feature needs to query redemptions except
   by coupon and by coupon+user, both of which `Order` already answers directly once it carries
   `couponId`, so a dedicated table would just be a relation with no distinct use.
**The financial rule that made these two mechanisms need to stay structurally separate, per the
request's own explicit instruction:** a seller's own `discountPrice` is absorbed by the seller -
it's their price, so it flows straight into `OrderItem.splitAmount` (their payout share) exactly
like the regular price always has. A platform `Coupon`, by contrast, must **never** reduce what a
seller or print partner receives - Viora itself absorbs the gap between what the customer paid
(`Order.totalAmount`, net of the coupon) and what the vendor is owed (`sum(OrderItem.splitAmount)`,
computed only from `unitPrice` - which already reflects any seller-level discount, but is
computed *before* the coupon is ever considered). Concretely: `subtotal` is computed first from
real (seller-discounted, if applicable) unit prices → `OrderItem.splitAmount` is fixed at that
point → *then* the coupon is validated against that same `subtotal` and its `discountAmount`
is subtracted only when computing `Order.totalAmount`, never touching `OrderItem` at all. This
is why both order routes compute the coupon discount as a step strictly after building each
line's `unitPrice`/`splitAmount`, not folded into the same per-line calculation.
**Why `/api/print-orders` needed the identical treatment, not just `/api/checkout`:** the request
named "فروشنده/پارتنر" (seller/partner) together when describing the split-amount rule, and a
print order's `OrderItem.splitAmount` is exactly as real a vendor payout as a product order's -
`lineTotal` (the provider's tier-priced total) is fixed before the coupon is applied to
`lineTotal + expressFee`, so a print partner's payout is equally protected from ever being
reduced by a platform coupon.
**Why `JalaliDatePicker` gained an optional `minIso`, and why a separate
`OptionalJalaliDatePicker` wrapper exists rather than changing the picker's own value semantics:**
a coupon's `startsAt`/`endsAt` are genuinely optional and, unlike the print flow's delivery date,
`startsAt` can legitimately be a past or present date - so the existing picker (which always
requires a real value and, until now, always a lower bound) needed `minIso` to become optional
rather than forcing every future caller to invent a meaningless bound. The unset/set toggle itself
(an "افزودن تاریخ" affordance until a date is picked, then the real picker plus a clear button)
was kept in a separate wrapper component instead of teaching the core picker to represent "no
date" as a value, since every other caller (the print flow's express-delivery date) never has an
unset state and shouldn't have to handle one.
**Verified**, against the real local MariaDB + the actual compiled `.next/standalone/server.js`,
using real HTTP and one real Playwright pass for the two client-heavy interactions (the admin
coupon form's date picker, and the cart's coupon apply/remove flow):
- A seller-set `discountPrice` (600,000 vs. a 735,000 `price`) rejected when submitted `>=
  price` (both the disabled submit button and the API's own re-validation); once set, rendered
  correctly strikethrough on both the home page's `ProductCard` and the product detail page, and
  a real checkout of that product used 600,000 as `unitPrice`/`splitAmount` with zero coupon
  involved - confirmed via the actual `OrderItem` row, not just the request succeeding.
- A real `PERCENTAGE` coupon (20%, capped at 100,000, `minOrderAmount` 500,000, total cap 2,
  per-user cap 1): preview correctly rejected a 400,000 subtotal (`سفارش‌های بالای ۵۰۰٬۰۰۰`),
  correctly capped a 600,000 and a 1,000,000 subtotal to the same 100,000 (confirming the cap
  binds, not just the percentage math). A real checkout combining the seller-discounted product
  (subtotal 1,200,000) with this coupon produced `Order.totalAmount = 1,100,000`,
  `Order.discountAmount = 100,000`, **and `OrderItem.splitAmount = 1,200,000` - unchanged by the
  coupon** - the exact financial isolation the request required, confirmed from the database, not
  assumed from the code. The same customer's second attempt at the same coupon was rejected
  (per-user cap); a second customer's use succeeded (bringing total redemptions to the cap); a
  third customer was then correctly rejected (`ظرفیت … تمام شده`) - the total cap enforced across
  different accounts, not just per-account.
- A real `FIXED_AMOUNT` coupon (50,000 flat, no caps) applied to a real print order: `lineTotal`
  (5,700 × 150 = 855,000) stayed the provider's full `splitAmount`; `Order.totalAmount` came out
  to exactly 805,000 (855,000 − 50,000) - confirming the identical financial-isolation rule holds
  for print-partner orders, not just product ones.
- Deactivating a coupon via the real admin toggle immediately made it unusable for a customer who
  hadn't even hit their own redemption limit yet - confirming `isActive` is checked independently
  of every other rule, not skipped once other checks pass.
- Date-window rules: a coupon with `endsAt` before `startsAt` was rejected at creation
  (`تاریخ پایان باید بعد از تاریخ شروع باشد`); a coupon already past its `endsAt` was rejected as
  expired; one whose `startsAt` was still in the future was rejected as not yet active - both
  against real dates, not mocked time.
- Real Playwright interaction: the admin coupon form's `OptionalJalaliDatePicker` opened to
  today's real Jalali date on "افزودن تاریخ شروع" and the created coupon appeared in the real
  list afterward; a real product was added to a real cart and the cart's `CouponInput` correctly
  showed the applied-code badge and a discount line after typing a code and clicking "اعمال", and
  correctly reverted to the plain input after "حذف".
- All test users (7 phone numbers across both sessions), all four real test orders, both test
  coupons plus the two invalid ones created to test date-window rejection, and the Playwright-run
  coupon were deleted afterward; the seller-test product's `discountPrice` was reset to `null`;
  the pre-existing seed baseline (products, the one seeded seller/provider, zero coupons)
  confirmed unchanged before and after.
- `tsc --noEmit` and `eslint .` clean; `npm run build` succeeds, every new route (`/admin/coupons`,
  `/admin/coupons/new`, `/api/admin/coupons`, `/api/admin/coupons/[id]`, `/api/coupons/validate`)
  listed in its output alongside every pre-existing one.
**Rejected:** a `CouponRedemption` join table (see above - `Order` already answers every query
this feature needs). Encoding `discountPrice < price` as a database constraint - this schema
validates cross-field invariants at the API layer throughout (e.g. `PrintPricingTier`'s
`maxQuantity > minQuantity`), and MySQL's `CHECK` constraint support doesn't cleanly fit this
codebase's existing migration-safety patterns for a comparison between two nullable-adjacent
columns.

---

## 2026-09-15 — seasonal theme + banner management

### 36. `SeasonalTheme`/`Banner` as dedicated models (superseding `PlatformSetting`'s original
placeholder); live palette override via inline `style` on `<html>`; admin-only preview cookie
**Decision:** Built both pieces named in `panels-and-operations-spec.md` §4's admin-panel
wishlist ("تم فصلی/مناسبتی" and "مدیریت بنر/اعلامیه"), scoped exactly as the request asked (palette
swap only, no micro-interactions; one banner placement to start):
1. **`SeasonalTheme`** - `name`, `palette` (`Json`), `startsAt`/`endsAt` (both required - unlike
   `Coupon`'s optional window, a theme with no date range isn't "seasonal" at all, and the live-
   activation query needs a well-defined window to pick at most one theme when rows could
   otherwise overlap), `isActive` (an admin kill switch independent of the window, same shape as
   `Coupon.isActive`). `palette` is always a **complete** replacement map over every token
   `app/globals.css`'s `@theme` block defines (`lib/theme.ts`'s `CHAMPAGNE_ROSE_PALETTE` - 19 keys:
   `warm-white`, `surface`, `rose-50..700`, `gold-100..600`, `charcoal`, `charcoal-muted`,
   `border`), never a sparse override - so there's no merge logic and no question of what a
   partially-specified theme falls back to. `ThemeForm` pre-fills every field with the current
   default, grouped by hue, so an admin who only wants to swap the rose/gold accents can leave the
   rest untouched rather than having to know all 19 hex values.
2. **`Banner`** - `imageUrl`, `text`, optional `link`, a `BannerPlacement` enum (one member,
   `HOME_TOP`, for now - per the request, additive later, never a schema change), `isActive`,
   and an **optional** `startsAt`/`endsAt` (unlike `SeasonalTheme` - a standing announcement with
   no end date is a reasonable banner, matching `Coupon`'s optional-window convention instead).
**Why dedicated models, not `PlatformSetting`:** that generic key/value table's own doc comment
already named "banner slots, seasonal theme" as candidates for it, but both need several
independent, individually-dated rows (several themes/banners scheduled across the year) plus
admin list/CRUD pages with per-row `isActive` toggles - a singleton-style key/value row doesn't
fit either requirement, so `PlatformSetting`'s comment was updated to point here instead.
**Why a live per-request check, not an actual scheduled job:** the request's "بدون نیاز به دخالت
دستی روزانه" (no daily manual step) doesn't require a cron job - this project has no
background-job runner, and the cPanel/Passenger host only ever runs `node server.js` (ADR 15), so
"automatic" here means the same thing it already means for `Coupon` (ADR 35): a live date-window
check against `new Date()` on every request, never a value flipped by an out-of-band process.
`getActiveSeasonalTheme()`/`getActiveBanner()` (`lib/data/theme.ts`, `lib/data/banners.ts`) are
the direct extension of `validateCoupon()`'s date-window pattern to this case.
**How the palette actually overrides `app/globals.css`, without touching `<head>`:** Next's own
docs (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/layout.md`) say a
root layout should not manually render `<head>` tags - that guidance is about the Metadata API's
own territory (`title`/`meta`), not a blanket ban on inline styling, but there's a simpler and
more robust option anyway: `RootLayout` (now `async`) applies the active palette as an inline
`style` object directly on the `<html>` element it already renders. An inline `style` attribute
has the highest possible specificity, so it overrides the `@theme` block's own generated `:root`
declarations unconditionally - no reliance on `<style>`-tag source order, no `<head>` involved.
React passes custom-property keys (`--color-rose-500`) through a `style` object as-is rather than
camelCasing them, so `paletteToCssVars()` (`lib/theme.ts`) just maps the palette to
`{ "--color-<token>": "<hex>" }`.
**Admin preview, before public release:** `getEffectiveTheme()` checks a `viora_theme_preview`
cookie (holding a theme id) before falling back to the live-window query. The cookie is not
treated as sufficient on its own - every read re-verifies `requireAdmin()` server-side, the same
"never trust an earlier read" posture ADR 31/35 established, so a non-admin who somehow sets this
cookie on themselves gains nothing (confirmed directly: a non-admin session got `403` attempting
to set it). This means the preview is genuinely admin-only and genuinely invisible to other
visitors - not just hidden by client-side logic - since the palette is computed server-side before
any HTML is sent. A `ThemePreviewBanner` (rendered in `RootLayout` only when previewing) tells the
admin they're in preview mode and lets them exit back to whatever theme is actually live.
`/admin/themes`'s per-row "پیش‌نمایش" button sets the cookie and opens the home page in a new tab;
exiting is a separate static `DELETE /api/admin/themes/preview` route (not nested under `[id]`,
since ending a preview never needs to name a theme).
**Not added to `AdminNav`'s bottom tab bar:** the nav already carries six tabs at mobile width;
both new sections are reachable from the admin dashboard's own button list (same precedent as
`PrintColor` management, which similarly has no dedicated bottom tab and lives inside an existing
page instead).
**Verified**, against the real local MariaDB + the actual compiled `.next/standalone/server.js`,
using real HTTP and one real Playwright pass (logged in through the actual OTP UI flow, not an
injected cookie - a `secure` session cookie set by the standalone server, which always runs with
`NODE_ENV=production` per ADR 21, cannot be attached by Playwright's `context.addCookies()` to a
plain-`http://` page the way `curl -b` tolerates; a real browser login sidesteps this entirely):
- A theme with `startsAt`/`endsAt` spanning today, created via the real admin API, appeared in the
  rendered `<html style="...">` attribute for a plain anonymous request with no cookies at all -
  confirmed via raw `curl`, not just "no error."
- Deactivating that theme (`isActive: false`) made the override disappear from a fresh anonymous
  request immediately - no caching lag.
- A second theme dated ten days in the future (not live by window) was invisible to an anonymous
  request even after being created; setting the admin's own preview cookie for it made the
  override appear **only** on requests carrying that admin's session + cookie, while a concurrent
  anonymous request kept seeing the default palette throughout - confirmed side-by-side, not
  sequentially. A separately-logged-in non-admin account got `403` attempting to set the same
  preview cookie for itself. Clearing the preview (`DELETE`) reverted the admin's own view to the
  default palette.
- A real `Banner` (uploaded image via `/api/admin/banners/uploads`, `HOME_TOP` placement, a real
  link) rendered above the home page's header for an anonymous request; `isActive: false` and,
  separately, an already-expired `endsAt` each independently hid it from a fresh request.
- Real Playwright pass: the admin theme-creation form rendered all 19 color-picker fields grouped
  by hue with working Jalali date pickers; `/admin/themes` and `/admin/banners` list pages
  rendered their real just-created rows with working `ActiveToggle`s.
- All test rows (two `SeasonalTheme`s, one `Banner`, the uploaded test image file), the
  admin-bootstrap `ADMIN` role grant on the test account, and all `OtpCode` rows created during
  login were deleted/reverted afterward.
- `tsc --noEmit` and `eslint .` clean; `npm run build` succeeds (also regenerated the Prisma
  client, `npx prisma generate`, after the migration - needed separately from `migrate dev` in
  this run), every new route (`/admin/themes`, `/admin/themes/new`, `/admin/themes/[id]/edit`,
  `/admin/banners`, `/admin/banners/new`, `/admin/banners/[id]/edit`, and their matching
  `/api/admin/...` routes) listed in its output alongside every pre-existing one.
**Rejected:** a sparse/partial palette override (see above - always a complete 19-key map, no
merge logic). A real cron job or Node `setInterval` for "daily" activation - no background-job
infrastructure exists on this project's deploy target, and a live per-request check is exactly as
correct with zero added moving parts. Nesting the preview-exit route under `/api/admin/themes/
[id]/preview` - it never needs an id, so it lives at the static `/api/admin/themes/preview`
instead (static segments take precedence over a sibling dynamic `[id]` in Next's own router, so
this required no special-casing).

---

## 2026-09-16 — single/multi-seller order routing to the Viora hub

### 37. `Order.orderType`/`OrderItem.hubStatus` (both already in the schema since Sprint 0, never
set or read until now) wired up end-to-end; no migration needed
**Decision:** A cart checkout's real distinct-seller count now decides the order's fate, exactly
as `panels-and-operations-spec.md` §1 originally specified and the schema already anticipated
(`OrderType.MULTI_SELLER`, `HubProcessingStatus`'s four-value pipeline, and `Order.eventDate`'s
own doc comment - "Used for the hub's minimum-lead-time rule on multi-seller orders" - were all
sitting unused since Sprint 0, the same kind of gap ADR 33 found for `OrderStatus.DELIVERED`).
Every field this phase needed already existed, so there is no migration in this push:
1. **`/api/checkout`** groups its server-computed lines by `sellerId` (never trusting the client's
   own cart contents for this any more than it already didn't trust them for price) - more than
   one distinct seller sets `orderType: "MULTI_SELLER"` and every `OrderItem.hubStatus` to
   `PENDING_SELLER_SHIPMENT`; exactly one seller keeps today's behavior (`SINGLE_SELLER`,
   `hubStatus: null`) untouched. An optional `eventDate` field was added to `CartView` (a plain
   `OptionalJalaliDatePicker`, shown unconditionally - the client cart doesn't carry `sellerId`
   per line today, so there's no reliable way to show it only when a cart will turn out
   multi-seller, and asking for it always is harmless for a single-seller order too) - without it,
   the hub's lead-time warning below would have no real date to compute against.
2. **Seller panel**: a hub item's ship action is a new, separate `SendToHubButton`/
   `/api/seller/orders/[itemId]/send-to-hub` route, not the existing `ShipItemForm`/`/ship` route -
   no tracking-code input, since the destination is the Viora hub, not the customer (the request's
   own explicit reasoning). The existing `/ship` route now rejects any item with a non-null
   `hubStatus` rather than silently accepting a direct-ship call on a hub item. There is no
   separate hub-intake actor/account in this system (panels-and-operations-spec.md §1's own note
   that the beachhead-phase hub is too small to need real warehouse modeling), so the seller's own
   "sent it" declaration is what advances `hubStatus` straight to `RECEIVED_AT_HUB` - the admin
   queue is simply a view of items at or past that state, not a separate intake confirmation step.
   Also shown: a **textual, non-blocking** lead-time warning (per the request - "فعلاً نیازی به
   اعتبارسنجی سخت‌گیرانه نیست") computed from `Order.eventDate` minus the hub's configurable
   minimum-lead-time buffer (`PlatformSetting` key `hub_min_days_before_event`, seeded as
   `{"days": 2}` back in Sprint 0 - already exactly the key this phase needed, read for the first
   time here via `lib/data/hub.ts`'s `getHubMinDaysBeforeEvent()`, mirroring
   `lib/data/print.ts`'s `getPrintDeliverySettings()`). A generic version of the same text shows
   when `eventDate` is null. `getSellerStats`'s "سفارش در انتظار ارسال" count was narrowed to
   exclude items already sent to the hub - once a seller has sent an item, it's no longer theirs
   to act on, so counting it as "pending" for them would be misleading.
3. **Admin panel** (`/admin/hub`, `lib/data/hub.ts`'s `getHubQueueItems()`): a **two-step** flow,
   not one collapsed action, so `QUALITY_CHECK` is a real, observable state something actually
   sets - not a schema value nothing ever reaches, the exact anti-pattern ADR 33 already flagged
   once for `DELIVERED`. `RECEIVED_AT_HUB` items get a "شروع کنترل کیفیت" button
   (`/api/admin/hub-items/[itemId]/start-quality-check`, reusing the existing generic
   `ApproveButton`); `QUALITY_CHECK` items get `FinalizeHubItemForm` (a required tracking-code
   input - the only tracking code this customer will ever see for a hub item, unlike the seller's
   own optional one) posting to `/api/admin/hub-items/[itemId]/finalize`, which sets
   `hubStatus: "FINAL_SHIPPED"`, `shippedAt`, `trackingCode`, and - only once every item on the
   order has shipped, the same convention every other ship route in this codebase already uses -
   flips `Order.status` to `SHIPPED`.
**Why `shippedAt` is set at finalize, not when the seller sends the item to the hub:** `shippedAt`
is this schema's one "did this item actually ship to the customer" signal, gating both the
customer's delivery-confirmation/review flow (ADR 33) and, per `docs/legal-pages-draft.md`, the
24-hour return window - none of which should start counting while an item is still sitting in
Viora's own hub. A hub item's real "shipped" moment is when it leaves the hub for the customer,
which is exactly what `finalize` represents.
**Verified**, against the real local MariaDB + the actual compiled `.next/standalone/server.js`,
using real HTTP (a second seller/product created directly in the database for this test, since
the seeded catalog only had one seller) and one real Playwright pass:
- A cart mixing products from two distinct sellers produced a real `MULTI_SELLER` order with both
  `OrderItem`s at `hubStatus: "PENDING_SELLER_SHIPMENT"` - confirmed from the database, not just
  the request succeeding. The same customer's single-seller cart, checked out immediately after,
  produced an unaffected `SINGLE_SELLER` order with `hubStatus: null` on its item.
- The direct-ship route (`/api/seller/orders/[itemId]/ship`) rejected a call against a hub item
  (`"این کالا باید از طریق «ارسال به مرکز ویورا» پردازش شود."`); `send-to-hub` then correctly
  advanced it to `RECEIVED_AT_HUB` for both sellers' own items.
- Admin `finalize` on a `RECEIVED_AT_HUB` item (quality check not yet started) was correctly
  rejected (`"این آیتم آماده‌ی ارسال نهایی نیست."`); `start-quality-check` then `finalize`
  succeeded in sequence, setting `shippedAt`/`trackingCode` on that item alone -
  `Order.status` stayed `PROCESSING` (confirmed from the database) until the *second* item on the
  same order was independently taken through the same two steps, at which point `Order.status`
  flipped to `SHIPPED` - the "only once every item has shipped" rule verified against a real
  two-seller order, not assumed from the code.
- Real Playwright pass: the seller orders page showed the hub lead-time warning with a real
  computed Jalali deadline date for an order with `eventDate` set, and the generic version of the
  same text for one without; a `FINAL_SHIPPED` hub item showed "ارسال نهایی شده" (not the generic
  "ارسال شده" badge) via its own `hubStatus`-derived label. The admin `/admin/hub` queue correctly
  showed its empty state once every item created during this test had either not yet been sent by
  its seller or had already been finalized. The cart page, with an item present, rendered the new
  "تاریخ جشن (اختیاری)" field and its explanatory copy correctly.
- All test rows (the second seller account/profile/product, all orders created against them, the
  admin-bootstrap `ADMIN` grant on the test account, and every `OtpCode` row created during
  login) were deleted/reverted afterward.
- `tsc --noEmit` and `eslint .` clean; `npm run build` succeeds, every new route
  (`/admin/hub`, `/api/admin/hub-items/[itemId]/start-quality-check`,
  `/api/admin/hub-items/[itemId]/finalize`, `/api/seller/orders/[itemId]/send-to-hub`) listed in
  its output alongside every pre-existing one.
**Rejected:** collapsing the admin's two-step hub flow into one action (see above - would leave
`QUALITY_CHECK` permanently unreachable, the exact gap already fixed once for `DELIVERED`).
Modeling a distinct "seller shipped, hub hasn't received it yet" state between
`PENDING_SELLER_SHIPMENT` and `RECEIVED_AT_HUB` - there is no hub-intake actor in this system to
ever observe or act on that distinction, so it would be a state nothing could ever transition out
of on its own. Threading `sellerId` into the client-side cart so the event-date field could be
shown conditionally only for a soon-to-be multi-seller order - real added complexity (touching
`CartContext` and every "add to cart" call site) for a field that's harmless to show unconditionally.

---

## 2026-09-16 — product returns (wired into the existing support-ticket system) + seller suspension

### 38. `SupportTicket.type`/`orderItemId`, `TicketMessage.imageUrl`, `OrderItem.returnStatus`, and
a dedicated `SellerStatus` enum (not a shared-enum SUSPENDED value)
**Decision:** A return request is a `SupportTicket` with a new `type` (`GENERAL` | `RETURN_REQUEST`,
default `GENERAL` so nothing about the existing ticket system changes for anyone), wired to the
`OrderItem` it's about:
1. **Customer side** - a "درخواست مرجوعی" button (`ReturnRequestForm`, mirroring
   `components/admin/RejectForm.tsx`'s open/closed toggle) appears on a delivered product item
   (`item.deliveredAt` set, `item.product` set - print/service items are out of scope, see below)
   that has no return yet (`item.returnStatus === null`). Submitting it
   (`POST /api/support/tickets/returns`) creates the `RETURN_REQUEST` ticket, its first
   `TicketMessage` (the customer's reason + an optional photo via a new customer-facing upload
   route, `/api/support/tickets/uploads` - any logged-in user, not role-restricted like
   `/api/seller/uploads`), and sets `OrderItem.returnStatus = REQUESTED`, all in one transaction.
   Once a return exists for an item, the button is replaced by its live status
   (`RETURN_STATUS_LABELS`) and a link into the same `/support/[id]` thread the ticket system
   already renders - no new customer-facing ticket UI needed at all.
2. **Admin side** - `/admin/tickets` gains a third filter row (mirroring the existing sender-type
   row exactly) for `type=RETURN_REQUEST`, plus a badge per ticket row. The ticket detail page
   shows the item/seller/amount and, while `returnStatus === REQUESTED`, two actions: "تایید
   مرجوعی" (`POST /api/admin/tickets/[id]/approve-return`) and "رد درخواست" - literally the
   existing `RejectForm` component reused unchanged, exactly matching the request's own framing
   ("رد درخواست با دلیل، مثل رد فروشنده"). Approving posts an automatic staff message with the
   seller's address and states the return-shipping cost is the seller's responsibility to
   coordinate directly - deliberately **not** a promised automatic cost refund, since this
   codebase has no real payment/refund infrastructure yet (`PaymentProvider` only ever
   `charge()`s) to plug a real one into; rejecting posts the reason and sets
   `returnRejectionReason`, shown back to the customer next to their `REJECTED` status badge.
**Why `TicketType`/`orderItemId` on `SupportTicket`, not a separate `ReturnRequest` model:** the
request's own explicit question was how to model "ticket type" - a return request *is* a support
conversation (reason text, photo evidence, admin replies, a status the admin changes) with two
extra pieces of structured data (which item, and its own approve/reject state) bolted on, so
reusing the whole existing thread/reply/status machinery (`TicketThread`, both reply routes,
`TicketStatusSelect`) costs nothing and a parallel model would have needed to reinvent all of it.
**Why `TicketMessage.imageUrl`, not a return-specific photo column:** a photo is naturally part of
"what the customer said" (their reason plus evidence) - putting it on the message means
`TicketThread` renders it for free wherever it's set, and the field stays available for any future
use of an image in a ticket message, not hardcoded to returns.
**Why print/service order items are excluded:** the request's own framing is entirely in terms of
"فروشنده" (seller) and physical goods; a print order's balloons are custom-made per order, not a
generic "send it back" case, and have no `sellerId` (only `providerId`) for the approval message's
seller-address lookup to work against anyway - gated on `item.sellerId !== null`.
**`SellerProfile.status` becomes a dedicated `SellerStatus` enum** (`PENDING` | `APPROVED` |
`REJECTED` | `SUSPENDED`), not `SUSPENDED` added to the shared `ApprovalStatus` that
`ServiceProviderProfile.status` also uses - a print partner has no suspension concept in this
request at all, and a shared enum would let its own `status` column represent a value that means
nothing for it. `SUSPENDED` is reachable only via a manual admin action
(`POST /api/admin/sellers/[id]/suspend`, only from `APPROVED`) and reversible the same way
(`.../unsuspend`, back to `APPROVED`) - nothing in this codebase ever sets it automatically, per
the request's explicit "نه خودکار".
**Why `requireOperatingSeller()` is a new, separate helper from the existing
`requireApprovedSeller()`, rather than changing what "approved" means:** the request's own
constraint - "سفارش‌های قبلیش دست‌نخورده می‌مونه" - means a `SUSPENDED` seller must keep shipping,
sending items to the hub, and editing their existing catalog exactly as before; only *creating a
new product* is blocked. Rather than loosen `requireApprovedSeller()`'s meaning (used everywhere,
including product creation) to quietly also accept `SUSPENDED`, a second helper
(`requireOperatingSeller()`, accepting `APPROVED` or `SUSPENDED`) was added and swapped into every
call site **except** `POST /api/seller/products` (create) - `requireApprovedSeller()`'s name and
behavior stay exactly what they've always meant. The seller panel layout renders a persistent
warning banner while suspended (children and `SellerNav` still render underneath it, unlike the
`PENDING`/`REJECTED` states which replace the whole panel), and both the dashboard's and the
product list's "افزودن محصول جدید" entry points are hidden - the `/seller/products/new` page
itself also redirects away defensively, in case a suspended seller still has the URL bookmarked.
**Return-rate stat, not auto-suspension:** `getSellerReturnStats()` (`lib/data/returns.ts`) computes
`approvedReturns / totalPaidOrderItems` for a seller and is shown on their admin profile
unconditionally, with a visual-only warning (`AlertTriangle`, no action taken) once it exceeds a
threshold read from `PlatformSetting` (`seller_return_rate_warning_threshold`, seeded at 10% -
configurable per this project's own "nothing hardcoded" principle, `docs/README.md` §4's own
section title, even though the request didn't explicitly ask for this one to be configurable, the
same way `hub_min_days_before_event` already was). Nothing reads this threshold to take any
action - the request was explicit that suspension is manual-only.
**Verified**, against the real local MariaDB + the actual compiled `.next/standalone/server.js`,
using real HTTP and one real Playwright pass:
- A full return lifecycle on a real delivered item: request (with an uploaded photo) → ticket
  created with `type=RETURN_REQUEST`, first message carrying the reason and `imageUrl`,
  `OrderItem.returnStatus=REQUESTED` - confirmed from the database, not just the request
  succeeding. A second request on the same item was rejected
  (`"برای این مورد قبلاً درخواست مرجوعی ثبت شده است."`).
- Admin approval set `returnStatus=APPROVED` and posted a real auto-message containing the
  seller's actual stored address and the "بر عهده‌ی فروشنده" cost-coordination note - read back
  from the database. A second, independent return (different item, same seller) was rejected with
  a reason, correctly setting `returnStatus=REJECTED` + `returnRejectionReason`, both shown back
  on the customer's own order page next to a "مشاهده‌ی گفتگوی مرجوعی" link into the real ticket.
- Suspending the seller (`APPROVED → SUSPENDED`) made `POST /api/seller/products` return `403`
  immediately, while the *same* suspended seller successfully shipped a different, already-placed
  order's item through the normal ship route in the same session - confirmed both halves of "no
  new products, but existing orders untouched" directly, not just one side of it. Unsuspending
  (`SUSPENDED → APPROVED`) immediately restored product creation.
- The admin seller detail page's real rendered HTML showed the return-rate stat (1 approved out of
  3 real paid items, 33.3%) and the "بالاتر از آستانه‌ی هشدار" warning, correctly crossing the
  seeded 10% threshold.
- Real Playwright pass: the customer's order detail page showed the review form and, independently,
  the return status + link for an item with an approved return; the admin ticket detail page
  rendered the uploaded photo inline in the thread (via `TicketThread`'s new `imageUrl` handling),
  the return-request badge, seller/item context, and the real auto-approval message text.
- All test rows (every ticket/message/order created during this test, the extra test product made
  while verifying unsuspend, the admin-bootstrap `ADMIN` grant, and every `OtpCode` row from
  login) were deleted/reverted afterward; the seller's status confirmed back at `APPROVED`.
- `tsc --noEmit` and `eslint .` clean; `npm run build` succeeds, every new route
  (`/api/support/tickets/returns`, `/api/support/tickets/uploads`,
  `/api/admin/tickets/[id]/approve-return`, `/api/admin/tickets/[id]/reject-return`,
  `/api/admin/sellers/[id]/suspend`, `/api/admin/sellers/[id]/unsuspend`) listed in its output
  alongside every pre-existing one.
**Rejected:** a separate `ReturnRequest` model (see above - `SupportTicket` already has everything
one needs once given a `type` and an `orderItemId`). A real refund-processing flow for return
shipping costs - this project has no payment/refund infrastructure to build it on yet; the request
itself offered this exact simplification as an acceptable option. Adding `SUSPENDED` to the shared
`ApprovalStatus` enum instead of a dedicated `SellerStatus` (see above). Automatically suspending a
seller once their return rate crosses the warning threshold - the request was explicit this stays
a human decision.
