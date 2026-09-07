# Release/Build Audit — Draw in the Air (new-term readiness)

- Audited commit: `6a81fdf6eb84495e1a42f7f48a6a0e4f466c6880` — "feat(seo): full-body SSG prerender for 93 marketing routes" (2026-07-20, branch feat/ssg-prerender, checked out detached at /home/claude/dia-audit/repo)
- Environment: Node v22.22.2, npm 10.9.7, Linux container. Read-only audit; nothing modified in the repo (git status clean before and after except untracked build output dist/, dist-ssr/ produced by the audited build itself).
- Date: 2026-08-15

## 0. Engine / toolchain matrix

| Where | Node |
|---|---|
| `.nvmrc` | `20` |
| `package.json` engines | `>=20.0.0` |
| This audit container | v22.22.2 |
| CI (`.github/workflows/ci.yml`) | 20 |
| Vercel production (per audit brief) | 24.x |

VERIFIED: `.nvmrc` says 20 while local dev docs, CI (20), this audit (22), and Vercel (24) all differ. `engines: >=20.0.0` permits all of them, so nothing hard-fails, but the production build runs on a Node major (24) that neither CI nor `.nvmrc` exercises. Everything below passed on Node 22; results on Node 20/24 are INFERENCE (likely identical, unproven here).

## 1. Install — `npm ci`

- Command: `npm ci` — exit 0, 18s.
- Output: "added 369 packages, and audited 370 packages in 17s"; "29 vulnerabilities (1 low, 17 moderate, 10 high, 1 critical)".
- VERIFIED: zero `npm warn deprecated` lines in the install log (checked `grep -iE "deprecat|warn" /tmp/npmci.log` — empty). Lockfile untouched.

## 2. Type-check — PASS

- Command: `npm run type-check` (`tsc -b --noEmit`) — exit 0, 22s. No output/errors. VERIFIED.

## 3. Lint — FAIL (expected-red, but count has drifted)

- Command: `npm run lint` (`eslint .`) — exit 1, 49s.
- VERIFIED totals: **309 problems = 11 errors, 298 warnings** (final line of eslint output).
- CLAUDE.md and `.github/workflows/ci.yml:63` both claim **9** pre-existing errors. Actual on this commit: **11**. Two errors have been added since that note was written (documentation drift, and/or new errors merged while lint was known-red — the exact hazard of a permanently red gate).
- The 11 errors:
  1. `platform/src/app/api/insights/generate/route.ts:5:38` — Parsing error (interface extends non-identifier)
  2. `platform/src/lib/security/validation.ts:15:33` — no-control-regex
  3. `src/pages/admin/InsightsDashboard.tsx:217:5` — react-hooks/rules-of-hooks (useEffect after early return)
  4. `video/src/components/TraceLine.tsx:36:52` — react-hooks/rules-of-hooks (conditional useMemo)
  5–11. `@typescript-eslint/ban-ts-comment` (@ts-ignore) x7: `supabase/functions/_shared/stripe.ts:10,12`, `supabase/functions/announce/index.ts:24`, `supabase/functions/billing-diagnostics/index.ts:25`, `supabase/functions/billing-health/index.ts:17`, `supabase/functions/email-dispatch/index.ts:27`, `supabase/functions/pilot-welcome/index.ts:26`
- Only one error is in the shipped kid-app tree (`src/`): the InsightsDashboard rules-of-hooks violation. Mitigating context (VERIFIED by reading the file): `reportMode` comes from a `useState` initializer reading the URL (`src/pages/admin/InsightsDashboard.tsx:129`), so it is fixed for the lifetime of the mount and the conditional-hook order cannot actually change between renders. Real lint error, low runtime risk, admin-only page. The `video/` and `supabase/functions/` errors never reach the browser bundle.

## 4. Tests — PASS

- Command: `npm test` (vitest run) — exit 0, 10s (vitest-reported duration 9.62s).
- VERIFIED: **25 test files passed, 252 tests passed, 0 failed, 0 skipped.** No flaky retries observed. (The `[safeInvoke] call suppressed` stdout lines are intentional test output, not failures.)

## 5. CSP check — PASS

- Command: `npm run check:csp` — exit 0, <1s. Output: `[check-csp] ✓ all 12 required CSP origins present.` VERIFIED.

## 6. Secrets check — PASS

- Command: `npm run check:secrets` — exit 0, <1s. Output: no leaked literals or credential patterns; one informational placeholder note for `.env.example` ("your-strong-pin-here"). VERIFIED.

## 7. Env-safety check — PASS (script exists)

- Command: `npm run check:env-safety` (`node scripts/check-env-safety.mjs`) — exit 0, 1s.
- Output: environment unknown / no vercel env; WARNs that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are missing (expected — audit container has no .env); "OK No environment-safety violations detected." VERIFIED the script exists and passes without env vars present.

## 8. Production build — PASS

- Command: `npm run build` — exit 0, **61s total** (prebuild csp+type-check, client vite build 13.05s, SSR build 1.84s, prerender pass).
- Build pipeline (package.json): `tsc -b && vite build && vite build --ssr src/entry-prerender.tsx --outDir dist-ssr --emptyOutDir && node scripts/prerender-seo.mjs`, with `prebuild` running check:csp + type-check first.
- Prerender log (VERIFIED): `[prerender-seo] pass 1: wrote 26 head-only route file(s).` then `pass 2: wrote 93 full-body route file(s).`
- **The "93 marketing routes" claim in the commit message matches the build output exactly (93 full-body files).** Total HTML files in dist/: **101** (93 full-body + head-only routes not superseded by pass 2).
- NOTE (build-order quirk, VERIFIED from package.json): the SSR step uses `--outDir dist-ssr --emptyOutDir`, so `dist/` from the client build is preserved; prerender-seo.mjs then rewrites HTML into `dist/`. No issue observed.
- Build ran WITHOUT `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` set and still succeeded — client falls back to `''` (src/lib/supabase.ts:13-14). INFERENCE: a Vercel env-var misconfiguration would produce a green build with dead Supabase connectivity; only check-env-safety WARNs (non-fatal).

## 9. npm audit

- `npm audit --omit=dev` — exit 1. **Production deps: 16 vulnerabilities (0 critical, 2 high, 14 moderate, 0 low).**
- `npm audit` (full) — exit 1. **29 total (1 critical, 10 high, 17 moderate, 1 low).**
- Dev-only (advisory noise for a static-hosted SPA; never shipped): critical `vitest`, high `vite`, `postcss`, `nanoid`, `js-yaml`, `minimatch`, `brace-expansion`, `picomatch`, `flatted`, moderate `esbuild`, `vite-node`, `@vitest/mocker`, low `@babel/core`. These run only at build/test time. VERIFIED via audit JSON severity split.
- Production-dep triage — top 5 concrete packages, most-to-least real-world relevant:
  1. **react-router-dom@6.30.3** (moderate, direct; via @remix-run/router) — "Open redirect leading to XSS" / `//`-prefixed same-origin redirect bypass. This IS in the browser bundle and this app routes on user-controllable URLs. Exploitability depends on redirect usage; for a child-facing product an open-redirect is a real safeguarding concern (external-link policy). Most realistic of the set. Fix available within v6/v7 line.
  2. **dompurify@3.4.5** (moderate, transitive via posthog-js) — cross-realm/IN_PLACE sanitization bypasses. In-bundle, but only exploitable if DOMPurify is invoked in the vulnerable modes on attacker HTML; posthog-js's internal usage makes this unlikely. Fix: bump posthog-js.
  3. **posthog-js@1.376.0** (moderate, direct) — flagged via its bundled @opentelemetry/* deps (unbounded memory allocation in W3C baggage parsing) — DoS-class at worst in the browser; low realistic impact. Fix available (>=1.380).
  4. **@vercel/og@0.11.0 → sharp@0.34.5** (both HIGH, but server-side) — sharp/libvips CVEs (incl. CVE-2026-33327). Runs only in the `api/` serverless OG-image function processing server-controlled inputs, NOT in the browser bundle. Realistic exposure only if the OG endpoint accepts untrusted image input. Fix is semver-major (@vercel/og 1.0.1).
  5. **protobufjs@7.6.1** (moderate, transitive via posthog-js otel) — proto-parsing DoS; the app never parses untrusted .proto in the client. Advisory noise.
- Bottom line: **0 critical / 0 high in the client browser bundle.** The 2 prod highs are confined to the OG-image serverless function. The one worth acting on before term is react-router-dom (and a routine posthog-js bump clears dompurify+otel+protobufjs in one go). VERIFIED chains via `npm ls`.

## 10. Bundle audit

- Total dist/: **50MB**, dominated by static media, not JS: landing-images 13M, building 7.6M (single worst file: `dist/building/objects/house-thumbnail.png` **5.7MB**), landing-assets 6.7M, landing-videos 4.0M, icons 2.8M, landing-icons 2.5M, assets (JS+CSS) 2.5M, `pilot-pack.pdf` 1.5M, plus multi-hundred-KB loose JPG/PNGs at dist root (`hero-kid-star.png` 1.8M, `classroom-teacher.png` 1.4M, `brain-skills.png` 1.2M).
- 15 largest files in dist/assets (bytes): ModeBackground 250,591 · react-vendor 214,542 · posthog 191,652 · App 145,912 · vendor 145,843 · gestureSpellingLogic 140,966 · InsightsDashboard 120,481 · motion 109,879 · index 107,935 · Training.css 84,503 · index.css 72,328 · _shared.css 50,584 · TeacherDashboard 44,815 · SEOMeta 40,895 · UseCasePage 38,342. Largest JS chunk gzips to ~68KB — healthy code-splitting. VERIFIED.
- **Source maps: 0 `.map` files in dist/** — none emitted to production. VERIFIED.
- Debug scan (VERIFIED): `debugger` statements: 0. `localhost:` strings: 0. Service-role / `SUPABASE_SERVICE` strings: 0. JWT-shaped `eyJ...` literals: 0. `console.log(` occurrences: 8 total across 5 chunks (ModeBackground 4, posthog 1, index 1, featureFlags 1, App 1) — cosmetic noise only.

## 11. CI workflows

- `.github/workflows/ci.yml` (VERIFIED): triggers on PRs into master, pushes to master, and manual dispatch. 5 jobs on Node 20: `lint` (npm run lint — currently exits 1, comment at line 63 says keep NON-required, "9 pre-existing errors" — stale, now 11), `typecheck`, `secret-scan` (check:secrets + check:csp + check-env-safety), `unit-tests`, `build` (with safe placeholder VITE_ env). Permissions read-only; concurrency-cancelled.
- `.github/workflows/typecheck.yml` (VERIFIED): triggers only on `main` — **production is `master`, so this workflow is dead code**; it never fires on any production-bound PR. It duplicates typecheck+lint from ci.yml and would fail on lint if it ever ran. Should be deleted or retargeted.
- Would CI have gated the production promote of feat/ssg-prerender?
  - If promoted via a PR into master: ci.yml runs; typecheck/secret-scan/unit-tests/build would all have had to pass (they do on this commit), lint would fail but is documented as non-required. Whether any job actually BLOCKS merge depends on GitHub branch-protection settings, which are not stored in the repo — **UNVERIFIED from repo contents alone**; the line-21 comment says the green jobs are "safe to make REQUIRED", implying they may not yet be required.
  - If promoted via direct push to master: ci.yml runs only post-merge (push event) — verification after the fact, not a gate. INFERENCE: given AI_AGENT_RULES/scripts insist on PRs, a PR path is likely, but the repo cannot prove required-checks enforcement.

## 12. Task scripts

- All three exist and are executable (VERIFIED): `scripts/check-task.sh` (lint → type-check → test → env-safety → csp → secrets → build; each step dies on failure), `scripts/start-task.sh` (branch off fast-forwarded master with approved prefixes), `scripts/publish-task.sh` (refuses master/main/staging; re-runs check-task.sh; pushes; prints PR URL; never merges/deploys).
- **Broken-as-documented (VERIFIED by construction + measured lint exit 1): `check-task.sh` runs `npm run lint` FIRST and its `run()` helper `die`s on any non-zero exit. Since lint is red on master (11 errors), `./scripts/check-task.sh` can never complete on any branch based on master — it dies at step 1 before running tests, env-safety, CSP, secrets, or the production build.** CLAUDE.md's core instruction ("Before claiming anything is done, run ./scripts/check-task.sh") is therefore unsatisfiable, and `publish-task.sh` (which calls it) can never push. INFERENCE: recent work has been published bypassing the documented gate, or via the one-off `push-*.sh` scripts.
- Obsolete clutter: ~50 one-off `scripts/push-*.sh` scripts (push-landing-v5_4.sh etc.) totalling ~4,000 lines — historical, none referenced by docs; they bypass the publish-task flow by design and are a footgun if re-run.
- `docs/HANDOVER.md` referenced by CLAUDE.md does not exist on this commit (VERIFIED `ls`). `AI_AGENT_RULES.md` exists.

## 13. Hard-coded environment values

- Command: `grep -rn "fmrsfjxwswzhvicylaph\|app.drawintheair.com\|drawintheair.com" src/` — **88 hits**, ALL of them the public domain (canonical SEO URLs in `src/seo/seo-config.ts:6-11`, mailto links, camera-permission help text, share BASE_URL at `src/components/share/ShareButton.tsx:41`, hostname allowlist at `src/main.tsx:828-829`, form fallback endpoint `src/lib/formSubmission.ts:33`). Expected/benign for a marketing SPA.
- **The Supabase project ref `fmrsfjxwswzhvicylaph` appears NOWHERE in src/** (VERIFIED — 0 hits). It appears only in `vercel.json` CSP `connect-src` (https + wss), which is expected and public by nature.
- **Anon key location (VERIFIED): environment variables, not hardcoded.** `src/lib/supabase.ts:13-14` reads `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` with `|| ''` fallback; same pattern in `src/lib/analytics.ts:1306-1307`. No `eyJ...` JWT literals in src/ or dist/. Correct posture. (The `|| ''` silent fallback is the flip side — see §8 note.)
- Minor observation: CSP `script-src` includes `'unsafe-inline' 'unsafe-eval'` (vercel.json headers) — presumably required by MediaPipe WASM/analytics; noted, not newly introduced by this commit.

## 14. Service worker & stale-client recovery

- Registration (VERIFIED): `src/main.tsx:908-916` — registers `/service-worker.js` scope `/` on every non-localhost host, errors swallowed.
- `public/service-worker.js` (229 lines, VERIFIED): network-first for navigations and `.js/.css/.html`; cache-first for images/fonts; offline fallback page; `skipWaiting()` on install (line 107) and `clients.claim()` on activate (line 125); activate deletes all caches not matching `CACHE_NAME`.
- Stale-client risk: LOW-MODERATE. Network-first for HTML+JS means online returning users get fresh deploys; the header comment says "Bump CACHE_VERSION on every deploy that ships meaningful UI changes", but `CACHE_VERSION` is still `'v10-playful-tracing-magic-canvas-2026-06-20'` (line 25) — not bumped for this 2026-07-20 SSG deploy. INFERENCE: acceptable here because prerendered HTML/JS are network-first, so the stale v10 cache only pins images/fonts; but the documented bump-per-deploy discipline has lapsed, and offline/failed-network fallback can serve a pre-SSG cached page.
- Chunk-recovery path (VERIFIED): `src/lib/lazyWithRetry.tsx:22-83` — wraps React.lazy; retries dynamic imports up to 3 times with exponential backoff capped 6s (line 60), 15s per-attempt timeout (line 27, 36-39), then a single guarded `window.location.reload()` via sessionStorage key `dia:chunk-reload` (lines 20, 67-74) — explicitly designed for the post-deploy "old hashed chunk no longer exists" case. All top-level routes in `src/main.tsx` use it (line 59 onward). This is a solid mitigation for deploy-time chunk skew.

## Command scorecard

| # | Command | Exit | Duration | Result |
|---|---|---|---|---|
| 1 | `npm ci` | 0 | 18s | PASS — 369 pkgs, 0 deprecation warnings |
| 2 | `npm run type-check` | 0 | 22s | PASS |
| 3 | `npm run lint` | 1 | 49s | FAIL — 11 errors / 298 warnings (docs say 9) |
| 4 | `npm test` | 0 | 10s | PASS — 25 files / 252 tests / 0 skip |
| 5 | `npm run check:csp` | 0 | <1s | PASS — 12/12 origins |
| 6 | `npm run check:secrets` | 0 | <1s | PASS |
| 7 | `npm run check:env-safety` | 0 | 1s | PASS (WARNs on absent env, non-fatal) |
| 8 | `npm run build` | 0 | 61s | PASS — 93 full-body prerender files (claim matches), 101 HTML total, no sourcemaps |
| 9 | `npm audit --omit=dev` / full | 1 / 1 | — | 16 prod (2 high, server-side only) / 29 total (1 critical dev-only) |

## Ranked findings

1. **P1 — The documented quality gate cannot pass.** `scripts/check-task.sh` dies at its first step (lint, exit 1 with 11 pre-existing errors), so neither it nor `publish-task.sh` can complete on any branch cut from master. Every "ran the full gate" claim since lint went red is suspect; tests/build/secret checks after lint never execute via the script. Fix: make lint non-fatal in check-task.sh (report-only) until the dedicated lint PR lands, or land that PR. (VERIFIED)
2. **P1 — vercel.json uses `installCommand: "npm install"`, not `npm ci`.** CLAUDE.md mandates the committed lockfile via `npm ci`; production installs can drift from the lockfile CI tested (and Vercel is also on a different Node major, 24 vs CI's 20). Combined, production builds are not reproductions of CI builds. (VERIFIED vercel.json lines 2-4; Node 24 per audit brief = UNVERIFIED from repo)
3. **P2 — Only realistic client-bundle vulnerability: react-router-dom@6.30.3 open-redirect (moderate, fix available); a posthog-js bump clears dompurify/otel/protobufjs in the same pass.** The scary-looking highs (sharp/@vercel/og, semver-major fix) are serverless-only; the critical (vitest) is dev-only. (VERIFIED)
4. **P2 — Lint-error drift and dead/misleading CI config.** Actual errors 11 vs the "9" documented in CLAUDE.md and ci.yml:63 — two new errors merged under cover of a red gate, one a real rules-of-hooks violation in shipped admin code (`src/pages/admin/InsightsDashboard.tsx:217`, low runtime risk since `reportMode` is mount-constant). `typecheck.yml` triggers only on `main` and never runs (production is `master`). Branch-protection enforcement of the green CI jobs is not provable from the repo — ci.yml's own comment suggests they may not be required checks, meaning the promote may not have been hard-gated. (VERIFIED counts; enforcement UNVERIFIED)
5. **P3 — Deploy hygiene nits.** dist/ is 50MB dominated by unoptimized PNGs (5.7MB house-thumbnail.png, 1.8MB hero) — bandwidth cost for school networks, mitigated by SW cache-first for images; service-worker `CACHE_VERSION` still `v10...2026-06-20`, not bumped for this deploy despite the file's own instruction (low impact: HTML/JS are network-first); `docs/HANDOVER.md` referenced by CLAUDE.md doesn't exist; ~50 obsolete `push-*.sh` scripts bypassing the publish flow remain in scripts/; build succeeds silently with empty Supabase env (`|| ''` fallback) so a Vercel env misconfiguration would ship a green-but-broken build. (VERIFIED)

Positive verification worth reporting: the SSG commit's headline claim is true (93 full-body prerendered routes, matching the build log), type-check/tests/build/secret/CSP/env gates are all green on this exact commit, no source maps or secrets in dist, anon key correctly env-injected, and lazyWithRetry + network-first SW give a sound stale-deploy recovery story.
