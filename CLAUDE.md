# CLAUDE.md

Guidance for Claude Code when working in this repository.

## 1. Project overview

Adeeb Club (نادي أَدِيب) — a cultural/creative club at King Faisal University. This repo holds
its website and member platform: a public Arabic site (landing, news, library, radio, surveys,
events, public profiles) plus a capability-gated dashboard for members and leadership
(membership records, org structure, elections, warnings, certificates, tasks, volunteering,
analytics, content management).

The live product is **`v2/`** — a Next.js 16 App Router monorepo on Supabase. `adeeb/` is the
retired V1 (static HTML/JS + Capacitor iOS shell), kept locally for reference and data
migration only; it is **gitignored** and is not a spec, a gate, or a compatibility target.

## 2. Architecture

```
/                      repo root (no package.json — not a workspace root)
├─ adeeb/              V1, retired. Static HTML/CSS/JS + Capacitor. GITIGNORED, read-only reference.
├─ supabase/           Backend source of truth (shared by V1 and V2)
│  ├─ migrations/      532 SQL files. 353 were reconstructed from the live history on
│  │                   2026-08-16 (the repo held only 173 of 500 applied). See its README.md.
│  ├─ functions/       Edge functions: send-contact-reply, send-position-assignment-email, track-pageview
│  ├─ email-templates/ Auth email templates
│  └─ config.toml      Supabase CLI config
├─ .githooks/pre-commit  CSS single-source guard (see §7)
├─ .prettierrc.json    printWidth 100, double quotes, semi, es5 trailing commas, LF
├─ .mcp.json           Supabase MCP server (project ref nnlhkfeybyhvlinbqqfa)
├─ *.md                Historical migration/audit plans (DB-AUDIT, RBAC-MIGRATION, V2-PLAN, …)
└─ v2/                 ← THE PRODUCT. pnpm workspace + Turborepo.
   ├─ apps/web/        Next.js 16.2.10 app (React 19.2.4, App Router, TypeScript strict)
   ├─ packages/core/   @adeeb/core — Supabase client factories + shared helpers (source-only, no build)
   ├─ packages/design-system/  @adeeb/design-system — tokens.css, components.css, fonts, brand SVGs, React components
   ├─ scripts/         Node ESM tooling: dev server, lint guards, Supabase/R2 config-as-code
   ├─ emails/          Auth email HTML (recovery, email-change) uploaded by scripts/auth-config.mjs
   └─ *.md             Living system docs — DESIGN-RULES.md is the design law; read it before UI work
```

### `apps/web/src`

| Path | Role |
| --- | --- |
| `app/` | App Router. Public routes at top level; `_`-prefixed dirs are private (not routes). |
| `app/_components/` | Site-wide client/server components (SiteHeader, BootSplash, VisitTracker, Turnstile, `glyphs.tsx`). |
| `app/_story/` | Scrollytelling landing opener (GSAP + Lenis). |
| `app/dashboard/_shell/` | Dashboard chrome: `DashboardShell`, `nav.ts`, `guard.tsx`, `Breadcrumb`, `ViewAsBar`. |
| `app/ui/` | Component showroom — one route per component (`/ui/buttons`, `/ui/inputs`, …). New library component ⇒ new `/ui` page. |
| `lib/` | Shared logic. Each concern gets **one** module that is the single source (e.g. `fieldFormats.ts`, `personName.ts`, `positionLabel.ts`, `upload.ts`, `capabilities.ts`). |
| `lib/supabase/` | `client.ts` (browser, cookie storage), `server.ts` (RSC/actions), `session.ts` (proxy session refresh + `/dashboard` gate). |
| `src/proxy.ts` | Next 16's middleware convention. Exports `proxy()` + `config.matcher`. There is no `middleware.ts`. |

### Auth & authorization model

- **Authentication** is checked in `src/proxy.ts` → `lib/supabase/session.ts` (session exists?).
- **Authorization is purely capability-based.** No role levels, no numeric ranking.
  `lib/auth.ts` loads the identity with the service-role client and calls the
  `get_user_permissions` RPC; `CurrentAdmin.caps` is the only authorization input.
- `lib/capabilities.ts` (`SECTION_CAP`) maps every dashboard path → one capability key. It is
  read by three places only: the gate (`lib/auth.ts`), the nav (`_shell/nav.ts`), and the page
  guard (`_shell/guard.tsx`). Change a lock there and nowhere else.
- Every dashboard page starts with:
  ```tsx
  const denied = await denyUnless("/dashboard/surveys");
  if (denied) return denied;
  ```
  Hiding a nav item is not a guard — `denyUnless` is.
- Scope inside a room (who may edit whom) is decided by the **database** (RLS + SQL helpers like
  `can_edit_member_data`, `can_manage_tasks_of`, `membership_authority`), not by UI checks.
- `lib/view-as.ts` implements "preview as member": the identity is swapped in the app layer only.
  `auth.uid()` still reports the real viewer, so anything the DB computes from `auth.uid()`
  reflects the previewer, not the previewed.

## 3. Commands

All commands run from `v2/`. Package manager is **pnpm** (`packageManager: pnpm@9.15.9`).
No `engines` field and no `.nvmrc`; developed on Node 26.

```bash
# root (v2/) — turborepo
pnpm dev            # turbo run dev
pnpm build          # turbo run build
pnpm lint           # turbo run lint
pnpm web            # pnpm --filter web dev

# detached dev server (preferred over raw `next dev` — see Gotchas)
pnpm dev:start
pnpm dev:stop
pnpm dev:restart
pnpm dev:status
pnpm dev:logs       # tails apps/web/dev-server.log

# repo guards — must pass
pnpm check          # runs scripts/check.mjs: all four guards, then reports
                    # css-single-source + modal-spacing + no-separators + glyph-weights
                    # Each guard runs even if an earlier one fails (a `&&` chain once left
                    # glyph-weights dark, hiding 6 real violations). Exit 1 if any fell.

# tests
pnpm test           # turbo run test -> vitest in apps/web

# config-as-code
pnpm auth:config    # applies Supabase auth config + email templates via Management API
                    # needs SUPABASE_ACCESS_TOKEN (+ RESEND_API_KEY / GOOGLE_OAUTH_SECRET / APPLE_OAUTH_SECRET)
                    # `node scripts/auth-config.mjs --dry` shows the diff without writing
pnpm r2:cors        # applies the Cloudflare R2 CORS policy (--dry / --show supported)
node scripts/apple-secret.mjs   # mints the Apple OAuth client secret

# app workspace (v2/apps/web)
pnpm --filter web dev
pnpm --filter web build     # next build
pnpm --filter web start
pnpm --filter web lint      # eslint (flat config, eslint-config-next core-web-vitals + typescript)
```

**Type checking:** there is no `typecheck` script. `apps/web/tsconfig.srconly.json` exists for
checking app source without generated `.next` types:
`pnpm --filter web exec tsc --noEmit -p tsconfig.srconly.json`.
`next build` is the final arbiter — it catches things `tsc` alone does not.

**Tests:** vitest, added 2026-08-16. `pnpm test` at the root, `apps/web/vitest.config.ts`,
specs under `apps/web/src/**/__tests__/`. Coverage is deliberately narrow: the pure-logic
single-source modules (`personName`, `capabilities`, `fieldFormats`, `positionLabel`, `dates`)
and the election rules engine. There is no component or E2E testing.
`scripts/no-separators.mjs` skips test files: a test name is not user-visible text.

**CI:** `.github/workflows/ci.yml`, added 2026-08-16. On push to `main` and on every PR:
`pnpm check` → `pnpm lint` → `tsc --noEmit -p tsconfig.srconly.json` → `pnpm test`.
No `next build` (Vercel does that), no secrets, so it runs on a zero-secret fork.

**Deployment:** Vercel, from `main`, with Vercel Root Directory = `v2/apps/web`.
`apps/web/vercel.json`: framework `nextjs`, region `fra1`,
install `pnpm install --frozen-lockfile`, build `next build`.

**Git hook (opt-in, per machine):** `git config core.hooksPath .githooks`. The pre-commit hook
runs all four guards whenever a commit touches `v2/` (~1.3s). The CSS guard reads the **staged**
content via `git show :path`; the other three walk the working tree, so CI is the authoritative
check. Bypass with `--no-verify`.

## 4. Conventions

### File & folder naming
- Route folders are lowercase kebab/plain (`forgot-password`, `dashboard/members/certificates`);
  dynamic segments `[id]`, `[slug]`, `[...slug]`; private folders `_shell`, `_components`, `_member`.
- React components: `PascalCase.tsx` (`SurveysView.tsx`, `IssueCertificateModal.tsx`).
- Plain modules: `camelCase.ts` (`memberData.ts`, `fieldFormats.ts`).
- Per-feature module roles, repeated consistently across `dashboard/*`:
  | File | Contents |
  | --- | --- |
  | `page.tsx` | Server component. Guard → fetch → render the View. Almost no logic. |
  | `data.ts` | Server-side reads for that room. |
  | `actions.ts` | `"use server"` mutations. |
  | `vocab.ts` | Status enums, labels, tone maps. **Framework-free so both server and client may import it.** Every value mirrors a DB check constraint — do not add one without a matching migration. |
  | `*View.tsx` | The client component that owns interaction state. |

### Components & state
- Server components by default; `"use client"` only where interaction/context requires it.
  Server components pass data down as props rather than being pulled into the client bundle.
- No client state library. `useState`/`useReducer` locally, React Context only for genuinely
  shared shell state (`_shell/nav-context.tsx`, `elections/actions-context.tsx`),
  `lib/useDraft.ts` for form drafts.
- Forms: `react-hook-form` + `zod` (`@hookform/resolvers`) on richer forms; plain controlled
  inputs elsewhere. Validation rules are imported from the single-source lib module
  (`lib/fieldFormats.ts`, `lib/membershipFields.ts`, `lib/personName.ts`) — never re-typed inline.
- Tables: `@tanstack/react-table`. Drag-and-drop: `@dnd-kit/*`. Carousels: `embla-carousel-react`.
  Animation: `gsap` + `lenis` (story/landing only).
- All dropdowns/popovers use `AnchoredPopover` from the design system (portal + placement-aware).
  Never build an absolutely-positioned panel inside the flow — it gets clipped.

### Error handling
- Server actions return a plain result object, they don't throw:
  `export type SurveyResult = { ok: boolean; message: string; id?: number }`.
  Messages are user-facing **Arabic**. The client shows them; it doesn't reinterpret them.
- Server actions re-validate everything the client validated (`validateSurvey(...)`) — client
  checks are UX, not security.
- Read failures return `{ data, error }` and the page renders `<Alert tone="warning">` instead of
  crashing.
- Service-role helpers return `null` when env is missing, and callers degrade to "unauthorized"
  (fail-safe), e.g. `lib/auth.ts`.
- Auth errors are translated in `lib/authErrors.ts`.

### Styling — the single-source law
This is the most enforced rule in the repo. `v2/DESIGN-RULES.md` is the authority (15 rules); read
it before any visual work.

- **Two stylesheets, one source each:** `packages/design-system/tokens.css` (design tokens) and
  `packages/design-system/components.css` (~7.7k lines of component classes).
  `apps/web/src/app/globals.css` holds only the Preflight replacement, the Tailwind `@theme`
  binding, and a few page-scoped families (`svy`/`cred`/`form`).
- Load order in `app/layout.tsx` is deliberate: `fonts.css` → `tokens.css` → `globals.css` →
  `components.css` (last wins). A selector defined in both sheets is silently shadowed —
  `scripts/css-single-source.mjs` fails the build/commit if that ever happens again.
- **No literal `#hex` anywhere**, no ad-hoc/inline CSS, no new class outside the library.
- When a needed component does not exist and you were not asked to design one, mark the element
  `data-needs="component name"` and leave it **completely unstyled**. Inventory with
  `grep -rn data-needs`.
- Tailwind v4, via `@tailwindcss/postcss` only. **There is no `tailwind.config.*` in `apps/web`** —
  the theme is bound in `globals.css` with `@theme inline` pointing at the CSS variables.
  (`packages/design-system/tailwind.preset.js` is a v3-style preset that the web app does not use.)
- Radius: only `rounded`, `rounded-xs`, `rounded-sm`, `rounded-nested`, `rounded-full` exist.
  `rounded-md/lg/xl/2xl` emit **nothing** — a silent square corner.
- Light theme only: `color-scheme: light` in `tokens.css`, no dark mode, no `prefers-color-scheme`.

### Icons
- `@phosphor-icons/react`, weight **duotone** for the whole site, set once via `IconContext` in
  `app/_components/IconDefaults.tsx`. Never pass `weight` per icon.
- The only exceptions live in `app/_components/glyphs.tsx` (carets, arrows, `+`/`×`/`✓` — icons
  duotone ruins). Import those names **from `@/app/_components/glyphs`**, not from Phosphor.
  `scripts/glyph-weights.mjs` fails if you bypass that list or import from `dist/ssr`.

### Comments & commit messages
- The codebase is commented **in Arabic**, densely, and the comments explain *why* (which decision,
  which date, which failure it prevents). Match that register when editing these files.
- Commit messages are Arabic, literary, no conventional-commit prefixes.
  Example: `شارةُ «صوتك سرّيّ» لمن له صوت`.

## 5. Arabic & RTL

- Root is `<html lang="ar" dir="rtl" suppressHydrationWarning>`. `suppressHydrationWarning` is
  required because an inline script adds `class="js"` (and possibly `data-flags`) before hydration.
- **Fonts** (`packages/design-system/fonts.css`, self-hosted, no Google Fonts):
  - `Lyon Arabic` (woff2, weights 300/400/500/700/900) — display and body. `--font-display`, `--font-body`.
  - `ITC Eras` (ttf, 300/500/600/700) — Latin. `--font-latin: "Eras", "Lyon Arabic", sans-serif`,
    ordered so glyphs Eras lacks (Arabic letters, Arabic-Indic digits, `٪`) fall back to Lyon, never
    to a browser font.
  - Western digits `U+0030-0039` are re-declared **inside the `Lyon Arabic` family** pointing at
    Eras files, so numbers render in Eras while surrounding Arabic stays Lyon. Those `@font-face`
    rules must stay **after** the Lyon faces. Do not use `unicode-range` on the Lyon faces
    themselves — it breaks Lyon loading.
  - `Twemoji Country Flags` (76 KB subset, `U+1F1E6-1F1FF`) applied only via the `.cflag` class.
    An inline probe in `layout.tsx` measures a flag pair vs. a single regional indicator and sets
    `data-flags="off"` on Windows (which has no flag glyphs); Apple/Android keep their native flags.
- **Digits:** `toLatinDigits()` in `@adeeb/core` converts Arabic-Indic (`٠-٩`) and Persian (`۰-۹`)
  digits to Latin for display in Eras.
- **Person names must be Arabic-only.** `lib/personName.ts` is the single guard across seven entry
  points, backed by `*_arabic_check` constraints in the database. It also handles Arabic name
  splitting: "عبد", "بن", "بنت", "أبو", "آل" etc. are glue words — split by *names*, not by words.
- **Visible-text typography rules (enforced by `scripts/no-separators.mjs`):**
  - No em dash (`—`) in user-visible strings. Replace it with `:`، the Arabic comma `،`، or a full
    stop. Em dash remains allowed in comments and in the empty-value placeholder.
  - No `·` and no `|` as separators in visible Arabic text. A role and its unit join with a **space**
    (produced by `positionLine` in `lib/positionLabel.ts`); two separate facts join with `،`.
  - The guard understands template literals, so `||` in code and TS unions like `"a" | "b"` are fine;
    a bar is only flagged next to an Arabic character.
- **Landing headings:** `LandingHeading` takes a one-word eyebrow and a two-word title, and never
  contains numbers.
- **RTL layout gotchas learned the hard way (see `components.css` around `.fld-*`):**
  - Prefer logical properties (`inset-inline-start`, `padding-inline-start`).
  - But when the *wrapper* inherits `rtl` while the *input* carries `dir="ltr"` (phone, email,
    numbers), logical padding flips to the empty side and text slides under the icon. Those specific
    reservations are intentionally **physical** and scoped with `:dir(rtl)` on the wrapper
    (`.fld-wrap:dir(rtl):has(.fld-iic) .fld-in { padding-right: 44px }`).
  - The `+966` prefix well needs an explicit isolated direction, otherwise the bidi algorithm moves
    the `+` to the wrong end.
  - Comment syntax caution: an Arabic comment inside CSS/JSX reads reversed in the editor — mind the
    delimiters. Character ranges in regexes are written with **escapes, not literal Arabic letters**,
    for the same reason (`lib/personName.ts`).
- Percentages, currency and mixed-script single lines use `font-latin` + `dir="ltr"` on the span.

## 6. Environment variables

`v2/apps/web/.env.example` is the checked-in template (added 2026-08-16, enumerated from the actual
`process.env.*` references, not from memory). `.gitignore` ignores `.env*` but negates that one file
— keep the negation if you touch it. Add any new variable there in the same change. Local values
live in `v2/apps/web/.env.local` (gitignored). Anything without the `NEXT_PUBLIC_` prefix must never
be imported into client code.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (browser + server clients). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key; all RLS-respecting access. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only. Powers `createAdeebServiceClient` (identity + capability load, privileged server actions). Bypasses RLS. |
| `NEXT_PUBLIC_SITE_URL` | Origin for `metadataBase` / OG links. Falls back to `https://adeeb.club`. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile widget key (login, recovery, surveys, booking). |
| `TURNSTILE_SECRET_KEY` | Server-side Turnstile verification for our own actions. |
| `R2_ACCOUNT_ID` | Cloudflare R2 account (radio audio storage). |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | R2 credentials for signed PUT/DELETE/list. |
| `R2_BUCKET` | R2 bucket name; defaults to `adeeb-radio`. |
| `R2_PUBLIC_BASE` | Public read origin for the bucket (audio streaming, show logos). |
| `RESEND_API_KEY` | Resend key — Supabase SMTP config (`auth:config`) and the contact-reply edge function. |
| `SUPABASE_ACCESS_TOKEN` | Supabase Management API token, used only by `scripts/auth-config.mjs`. |
| `GOOGLE_OAUTH_SECRET` | Google sign-in client secret (applied by `auth:config`). |
| `APPLE_OAUTH_SECRET` | Apple sign-in client secret (generated by `scripts/apple-secret.mjs`). |
| `APPLE_KEY_ID` / `APPLE_KEY_FILE` | Apple private key id and `.p8` path, inputs to `apple-secret.mjs`. |
| `GOOGLE_WALLET_ISSUER_ID` / `GOOGLE_WALLET_SA_EMAIL` / `GOOGLE_WALLET_SA_KEY` | Google Wallet loyalty-pass issuance. |
| `WALLET_PASS_TYPE_ID` / `WALLET_TEAM_ID` | Apple Wallet pass identifiers. |
| `WALLET_PASS_CERT_PEM` / `WALLET_PASS_KEY_PEM` / `WALLET_PASS_KEY_PASSPHRASE` / `WALLET_WWDR_PEM` | Apple Wallet signing material (PEM, multiline). |
| `PORT` | Dev server port (`scripts/dev-server.mjs`, default 3000). |

External services: **Supabase** (Postgres + Auth + Storage + Edge Functions), **Cloudflare R2**
(radio audio, signed browser uploads), **Cloudflare Turnstile**, **Resend** (email), **Vercel**
(hosting), **Google/Apple Wallet**, **YouTube** (radio destination).
Supabase Storage buckets in use: `images` (news), `library`, `election-files`, `avatars`.

## 7. Gotchas

- **`src/proxy.ts`, not `middleware.ts`.** Next 16 renamed the convention. Never insert logic
  between `createServerClient(...)` and `supabase.auth.getUser()` in `lib/supabase/session.ts` —
  it causes random session-refresh failures.
- **Turbopack dev disk cache is disabled on purpose** (`turbopackFileSystemCacheForDev: false`).
  A hard kill during a cache write leaves `.meta` files pointing at missing `.sst` and every
  later start dies with "Failed to restore task data (corrupted database)".
- **Use `pnpm dev:start` / `dev:stop`, not a raw backgrounded `next dev`.** The script spawns a
  detached process that survives the terminal and shuts down with SIGINT first (a SIGKILL is what
  corrupts the cache). Logs: `apps/web/dev-server.log`. The PID file can lie — the script trusts
  the port owner.
- **Two stylesheets, never one selector in both.** `components.css` loads after `globals.css`, so a
  duplicate silently shadows: your `globals.css` edit does nothing, and *deleting* a declaration
  from `components.css` resurrects a stale one with no diff to show for it. `pnpm check` enforces it.
- **Modal children never set their own vertical spacing.** `.mdl-body` owns the 14px gap;
  `space-y-*`, `flex-col + gap`, `display:grid + gap` on a direct `<Modal>` child fail
  `scripts/modal-spacing.mjs`. Dead classes `mdl-grid`/`mdl-full`/`org-modal` are also rejected —
  their successors are `form-grid`/`form-full`.
- `next.config.ts` sets `allowedDevOrigins` for LAN testing from a real phone. If the LAN IP is not
  also on the Turnstile widget's allowed-domains list, Turnstile answers `110200`, issues no token,
  and login silently fails.
- `packages/core` and `packages/design-system` have **no build step** — they export `.ts`/`.tsx`
  directly and are compiled by `transpilePackages` in `next.config.ts`. `turbo.json` still declares
  `dependsOn: ["^build"]`; that's a no-op today.
- `@adeeb/core` now ships **generated** types: `packages/core/src/database.types.ts` (2026-08-16,
  76 tables / 222 functions) exporting `Database`. But the clients are **not yet generic over it** —
  wiring it in surfaced 89 real errors in 27 files (mostly `null` vs `undefined` on optional RPC
  args, and genuine nullability mismatches the untyped client was hiding), each needing a
  behavioural decision. So queries are still untyped at the call site and column names are still
  unchecked. Pay it down file by file: type one module's client, fix its errors, move on.
- Database enums and app `vocab.ts` values are coupled by check constraints. Adding a status value
  in TypeScript without a migration produces a runtime insert failure, not a type error.
- **Deebo (`ديبو`) is a live LLM assistant** — this line used to claim the opposite, and that
  `lib/deebo/guard.ts` had been deleted in the ط٤ sweep. Both were wrong (corrected 2026-08-19;
  `git log --diff-filter=D -- '*deebo*'` is empty). What actually exists:
  `app/api/deebo/route.ts` (SSE streaming endpoint behind four guards: request shape → Turnstile →
  per-visitor rate limit + daily cap → provider), `lib/deebo/` (three providers — Claude, Gemini,
  DeepSeek; `guard.ts` a numeric-grounding guard the endpoint *does* import, with 14 tests;
  `knowledge.ts` reading the live `faq` table; `limits.ts`, `persona.ts`, `questions.ts`,
  `useDeebo.ts`), the public `/deebo` page, `/ui/deebo-compare` (provider lab), and
  `/dashboard/deebo` (conversation log, capability `manage_deebo`).
  Live provider: DeepSeek (`DEEPSEEK_API_KEY`). Since 2026-08-20 the page is a full-height
  **chat room** (`.dchs-*`, one shape; the other two were executed), and signed-in visitors get
  a stored conversation history (`deebo_conversations.user_id`/`title`, own-row RLS, monthly
  `deebo_purge_owned(365)`) plus an identity briefing in the prompt (`lib/deebo/viewer.ts`:
  first name + standing + position, nothing else). A session skips Turnstile; anonymous
  visitors keep their talk in `localStorage` only. **The persona is the owner's words, filled
  2026-08-20** — `v2/المتطلبات/ديبو-الهويّة.md` is its only human entry point, and `persona.ts`
  carries his decisions verbatim (emoji now allowed and moderate after being banned outright;
  the name story in his dialect; poems/songs now written, tied to Adeeb, after being refused;
  sixteen prohibitions). Never write a personality trait there that the sheet does not carry.
  Six items are still pending in the sheet's باب ز (the joining answer after registration was
  killed, missing static facts, 4-vs-7 suggested questions, conversation logging, the third-party
  disclosure line, the leadership one-liners) — leave them empty rather than inventing.
- Edge functions in `supabase/functions/` may drift from what is actually deployed. Inspect the
  deployed version (and its `verify_jwt`) before redeploying anything.
- V1 (`adeeb/`) is gitignored and retired. Read it only to understand the domain or migrate data.
  Do not treat its behaviour as a requirement or block V2 work on it.
- **Dates: `lib/dates.ts` only.** It pins `Asia/Riyadh` via `Intl`. A twin `lib/date.ts` used the
  runtime's local zone and was deleted 2026-08-16 — Vercel runs UTC, so every timestamp after
  21:00 Riyadh rendered as the previous day on the live site while looking right on a dev machine.
  Never format a date with `getDate()`/`getMonth()`/`getHours()`. `fmtDateOnly` is the exception
  and is correct: a `date` column has no time, so it is split as a string and never touches `Date`.
- **Turnstile: the widget is not the shield.** `lib/turnstile.ts` is the single verifier, and it
  only guards a path whose write goes through a server action. If an RLS policy still permits the
  insert from the browser, the shield is decorative: close the policy in the same change.

## 8. Working agreement

- Read relevant files before writing code. Never assume structure.
- Never hardcode secrets. Use env vars and update .env.example.
- Match existing patterns in the codebase over general best practices.
- Run build and tests before declaring a task complete. Fix failures.
- Don't stop to ask permission for routine steps. Ask only about architectural decisions or destructive changes.
- Summarize what changed and what needs manual verification when done.

### Standing permission to expand (2026-08-16)

The owner pays for a Max subscription and explicitly asked for the capacity to be **used**, not
conserved. This is a standing request, not a per-task one: **do not ask permission to expand, and do
not treat token cost as a reason to narrow the work.** It overrides any generic
"don't spawn subagents / don't run workflows / don't run deep research unless asked" default —
consider them asked for, here, by default.

| Expand automatically | Stay narrow |
| --- | --- |
| Review and verification before any delivery | A taste tweak (widen a field, change a gap) |
| Searching the repo when you don't know where something is | A question answered by a file you already know |
| Broad build work: tests, generated types, migrations, DB-AUDIT debts | A one- or two-line mechanical fix |
| Checking a change's blast radius across the whole codebase | Conversation, or a question about an opinion |

Two limits that do **not** move:

- **Capacity is released; authority is not.** Deploying, deleting, DDL, and real email still wait for
  his word. Expanding never means acting on something irreversible without asking.
- Expansion must not become noise: run it in the background where possible so he keeps working, and
  never dump raw subagent output into the chat — report the conclusion only.

**And the first round is where a feature is won or lost.** He objected that one feature eats a week
of revisions. The cause is that a taste decision gets *described* in words instead of *shown*.
So: build no visual feature from a verbal description. Put two options side by side on a `/ui`
page, let him look and decide, then build. See `v2/DESIGN-RULES.md`.
