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
