# Draw in the Air — Production Availability / Routing / SEO Audit

Auditor: web (availability/routing/SEO) · Date: 2026-08-15 (checks run ~21:23–21:30 UTC)
Method: read-only GET/HEAD via curl (57 requests total, paced). Repo reference: /home/claude/dia-audit/repo checked out at 6a81fdf ("feat(seo): full-body SSG prerender for 93 marketing routes", 20 Jul 2026).

Labels: VERIFIED (observed directly), INFERENCE (derived from code + observations), UNVERIFIED (could not confirm), ACCESS BLOCKED (fetch failed).

---

## 0. Deployment freshness note

- VERIFIED: `last-modified: Tue, 11 Aug 2026 08:26:11 GMT` on https://drawintheair.com/ (21:23:45 UTC), `age: 392254` (~4.5 days edge cache).
- UNVERIFIED: whether the live deployment is exactly commit 6a81fdf. The last-modified date (11 Aug) is 3 weeks after the commit date (20 Jul) — production has been redeployed since, possibly from a newer commit. All observed behaviour matched the 6a81fdf source, but the audited SHA may lag production.
- VERIFIED: Cloudflare fronts Vercel (`server: cloudflare`, `cf-ray`, `cf-cache-status`, NEL report-to cloudflare; `x-vercel-id`/`x-vercel-cache` present behind it).

---

## 1. Route map (code-derived, spot-verified live)

Sources: router `src/main.tsx:149-261` (custom pathname if-chain inside BrowserRouter), prerender inputs `src/entry-prerender.tsx:79-208` (ROUTES = 93), head-only metadata `src/seo/seo-config.ts` (PAGE_META = 27 canonicals), sitemap generator `scripts/generate-sitemap.ts`, committed `public/sitemap.xml` (90 URLs, identical to live sitemap — VERIFIED), redirects/rewrites/headers `vercel.json`.

Prerender arithmetic (VERIFIED against entry-prerender.tsx): 19 static + 3 education + 6 learn + 6 use-case + 4 activity + 8 seasonal + 3 viral + 26 letters + 10 numbers + 8 shapes = **93** — matches the SSG commit claim.

### Route map table

| Path (pattern) | Component (src/) | Access | In sitemap? | Prerendered? | Live check |
|---|---|---|---|---|---|
| `/` | pages/Landing.tsx | public | yes | full body | 200, 33,093 B, unique title/canonical VERIFIED |
| `/play`, `/onboarding` | App.tsx (game engine) | public (child mode) | no | no (SPA fallback) | 200 fallback doc VERIFIED |
| `/app` (or `#app`) | App.tsx | public | no | no | not fetched (same fallback) |
| `/demo` | pages/DemoLoader.tsx | public; robots-disallowed | no | no | not fetched |
| `/join`, `/join/play` | pages/classmode/StudentClassClient.tsx | public (code entry) | no | no | 200 fallback VERIFIED |
| `/class`, `/class/{lobby,round,results}` | pages/classmode/TeacherClassConsole.tsx | auth (teacher, client-gated) | no | no | 200 fallback VERIFIED |
| `/teacher`, `/teacher/{dashboard,children,activities,lessons,eyfs,resources,team,settings}` | pages/teacher/TeacherDashboard.tsx | auth (teacher, client-gated) | no | no | 200 fallback VERIFIED |
| `/teacher/signup`, `/teacher/login` | pages/teacher/{Signup,Login}.tsx | public auth forms | no | no | /teacher/login 200 VERIFIED |
| `/parents` | pages/parent/ParentsLanding.tsx | public marketing | **yes** | **no** (see F5) | 200 fallback (33,093 B) VERIFIED |
| `/parent` | redirect → /parent/dashboard (client-side, main.tsx:399-405) | — | no | no | 200 fallback VERIFIED (redirect happens in JS) |
| `/parent/{signup,login,dashboard,children,billing,account,privacy}` | pages/parent/*.tsx | auth (parent, client-gated); robots-disallowed | no | no | not fetched individually |
| `/subscribe`, `/trial` | pages/parent/Subscribe.tsx | public | no | no | not fetched |
| `/admin`, `/admin/insights` | pages/admin/InsightsDashboard.tsx | auth (OAuth + server-side is_admin RPCs, per main.tsx:15-19); robots-disallowed | no | no | 200 fallback shell VERIFIED (see F9) |
| `/teach/observe` | pages/teach/TeachObservePage.tsx | teacher | no | no | not fetched |
| `/transparency` | pages/TransparencyPage.tsx | public | no | no | not fetched |
| `/school` | pages/SchoolPilot.tsx | public; robots-disallowed | no | full body | not fetched |
| `/schools`, `/schools/training` | pages/{Schools,Training}.tsx | public | yes | full body | not fetched (robots conflict — F1) |
| `/teachers` | pages/Teachers.tsx | public | **no** | full body | not fetched |
| `/teachers/setup`, `/parents/setup` | pages/setup/*.tsx | public | no | no | not fetched |
| `/pricing` | pages/Pricing.tsx | public | **no** | full body | 200, 20,774 B (distinct doc) VERIFIED |
| `/about` | pages/About.tsx | public | **no** | full body | 200, 18,922 B VERIFIED |
| `/faq` | pages/FAQ.tsx | public | yes | full body | not fetched |
| `/privacy` `/terms` `/cookies` `/safeguarding` `/accessibility` | pages/*.tsx | public | yes | full body | /privacy 23,585 B, /terms 20,236 B VERIFIED |
| `/embed` `/press` `/free-resources` | pages/seo/*.tsx | public | yes | full body | not fetched |
| `/for-teachers` `/for-parents` | pages/seo/For*Page.tsx | public | yes | full body | not fetched |
| `/for-{homeschool,preschool,kindergarten}` | pages/seo/EducationPage.tsx | public | yes | full body | not fetched |
| `/learn` + `/learn/<6 slugs>` | pages/seo/Learn{Hub,Article}Page.tsx | public | yes | full body | 2 pages VERIFIED (unique title/h1/desc/canonical) |
| 6 use-case pages (`/gesture-learning` …) | pages/seo/UseCasePage.tsx | public | yes | full body | /gesture-learning VERIFIED |
| `/activities/{bubble-pop,sort-and-place,letter-tracing}` + `/free-paint` | pages/seo/ActivityPage.tsx | public | yes except `/activities/letter-tracing` | full body | /activities/bubble-pop VERIFIED |
| `/activities/<8 seasonal slugs>` | pages/seo/SpecialActivityPage.tsx | public | yes | full body | christmas-drawing-for-kids VERIFIED |
| `/draw-number-in-air` `/air-drawing-challenge` `/draw-circle-in-air` | SpecialActivityPage.tsx | public | yes | full body | /draw-circle-in-air VERIFIED |
| `/trace-[a-z]` (26), `/trace-number-{1..10}`, `/trace-<8 shapes>` | pages/seo/TracePage.tsx | public | yes (44) | full body | /trace-a, /trace-number-7 VERIFIED |
| `/letter-tracing` | TracePage.tsx (defaults letter a) | public | yes | **head-only** (deliberate, entry-prerender.tsx:190-192) | 200, 7,077 B, correct title+canonical VERIFIED |
| `/stem-learning` | vercel.json 308 → /ai-learning-tools-for-kids | — | no | excluded | **308** VERIFIED |
| `/dev/*` previews | dev-only (import.meta.env.DEV gate) | not in prod | no | no | n/a |
| PAGE_META-only orphans (see F4): `/draw-heart-in-air`, `/draw-star-in-air`, `/draw-alphabet-in-air`, `/activities/{christmas-drawing,halloween-drawing,back-to-school}` | **no router match** | public | no | head-only (Pass 1) | 2 fetched, 200 VERIFIED |
| anything else | falls through to Landing (main.tsx:260, :773-777) | public | — | — | soft-404 VERIFIED (§3) |

### Count reconciliation (VERIFIED)
- Prerender ROUTES: 93. Sitemap: 90. PAGE_META canonicals: 27.
- Sitemap = 93 prerendered − {`/school`, `/teachers`, `/pricing`, `/about`, `/activities/letter-tracing`} + {`/letter-tracing` (head-only), `/parents` (not prerendered at all)} = 90. ✓
- Committed sitemap.xml is NOT reproducible from scripts/generate-sitemap.ts (script omits `/learn/ai-for-kids`, `/learn/screen-time-alternatives`, the use-case pages, and several seasonal slugs differ) — the file has been hand-maintained past the script. INFERENCE: regenerating the sitemap with the current script would silently drop URLs.

---

## 2. Availability + header posture (apex)

`GET https://drawintheair.com/` @ 2026-08-15 21:23:45 UTC — **200**, 0.60 s, 33,093 B. VERIFIED headers:

- `content-security-policy`: present, matches vercel.json exactly (default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' + jsdelivr/GTM/clarity/facebook/posthog-assets; connect-src incl. app.drawintheair.com, supabase, storage.googleapis.com, sentry, posthog; frame-ancestors 'none'; upgrade-insecure-requests). Note: `'unsafe-inline' 'unsafe-eval'` in script-src weakens CSP materially (required by current inline boot scripts / MediaPipe WASM path). INFERENCE: acceptable trade-off, but flag for hardening.
- `strict-transport-security: max-age=31536000; includeSubDomains` (no `preload`).
- `x-frame-options: DENY`, `x-content-type-options: nosniff`, `referrer-policy: strict-origin-when-cross-origin`, `permissions-policy: camera=(self), microphone=(), geolocation=(), interest-cohort=()`, `x-xss-protection: 0`.
- `cache-control: public, max-age=0, must-revalidate` on HTML; `x-vercel-cache: HIT`, `cf-cache-status: DYNAMIC`, `age: 392254`.
- Oddity: `access-control-allow-origin: *` on the HTML document. Harmless for HTML but broad; worth confirming it isn't a blanket header on API responses.

Redirect chains (VERIFIED, all single-hop 308):
- `http://drawintheair.com/` → 308 → `https://drawintheair.com/`
- `https://www.drawintheair.com/` → 308 → `https://drawintheair.com/` (per vercel.json host redirect)
- `http://www.drawintheair.com/pricing` → 308 → `https://www.drawintheair.com/pricing` (then → apex; 2 hops for http+www deep links — normal).

Static endpoints (VERIFIED): `/sitemap.xml` 200 application/xml 15,731 B (byte-identical to repo); `/robots.txt` 200 text/plain 958 B (identical to repo); `/health.json` 200 application/json 230 B.

Assets (VERIFIED): `/assets/index-Cgmnujx9.js` → 200, `cache-control: public, max-age=31536000, immutable`, etag, cf-cache HIT. `/assets/nonexistent-zzz.js` → **real 404** (text/plain, 79 B) — the vercel.json rewrite correctly excludes /assets, so no HTML-served-as-JS hazard.

---

## 3. Soft-404 behaviour

`GET /404-nonexistent-zzz` → **200**, 33,093 B (VERIFIED). Body is the prerendered homepage document: title "Draw in the Air, Free Gesture Drawing App for Kids | No Download", `<link rel="canonical" href="https://drawintheair.com/">`, prerendered `#dia-ssr` landing body + hidden boot splash + root guard script (prerender-seo.mjs:264-268) which, on non-"/" paths, hides the landing and shows the splash until the SPA mounts… and the SPA then renders the Landing component anyway (main.tsx:260 falls through to 'landing').

Consequences (INFERENCE from verified behaviour):
- No URL ever returns HTTP 404 for humans; typos render the homepage at the wrong URL.
- SEO: mistargeted/dead URLs are "duplicate of /, canonicalised to /" — Google will typically treat as soft-404/duplicate. The canonical-to-home limits damage but bloats crawl and masks genuinely broken links (no way to detect them from status codes). Same behaviour applies to `/contact` and `/login` (both 200, 33,093 B, VERIFIED) — **neither route exists in the router**; any marketing material pointing at /contact or /login lands on the homepage.

---

## 4. Prerendered SEO pages — content quality (VERIFIED)

Fetched full bodies for /trace-a (51,366 B), /learn/hand-tracking-for-kids (31,433 B), /activities/bubble-pop (39,439 B), /gesture-learning (42,826 B), plus /trace-number-7, /activities/christmas-drawing-for-kids, /draw-circle-in-air, /learn/screen-time-alternatives. All eight:
- contain a real `#dia-ssr` prerendered body with a topic-specific `<h1>` (e.g. "Trace Letter A in the Air"),
- unique `<title>`, unique meta description, exactly one self-referential canonical.
- No title/description collisions among fetched pages. `/gesture-learning` ("Gesture-Based Learning Tools for Early Education…") vs `/learn/gesture-learning` ("Kinesthetic and Gesture-Based Learning…") are distinct — no collision despite the shared slug.

Verdict: the "93 marketing routes" SSG is genuinely serving full prerendered content, not an SPA shell.

---

## 5. robots.txt audit

Live = repo (VERIFIED). AI crawlers (GPTBot, OAI-SearchBot, ClaudeBot, Claude-SearchBot, PerplexityBot, Google-Extended, CCBot) all explicitly allowed — matches stated growth strategy; no AI blocks.

**F1 — CRITICAL SEO conflict (VERIFIED logic, prefix semantics of robots.txt):**
`Disallow: /school` and `Disallow: /parent` are prefix rules. They block not only the intended app surfaces but also:
- `/schools` and `/schools/training` — both in the sitemap, both fully prerendered core marketing pages for a schools-facing product;
- `/parents` — in the sitemap (public family-plan marketing page).
So 3 of the 90 sitemap URLs are simultaneously submitted for indexing and forbidden to crawl (Search Console will report "Indexed though blocked by robots.txt" / "Blocked by robots.txt"). Googlebot cannot even see those pages' canonicals or content. Fix: `Disallow: /school$`, `/school/`, `/parent$`, `/parent/` (Google supports `$`), or rename disallow targets.

---

## 6. Cross-check: PAGE_META vs router vs prerender vs sitemap

**F4 — PAGE_META orphans (VERIFIED live):** 6 canonicals in seo-config.ts have no router match and no prerender ROUTES entry, but Pass 1 (prerender-seo.mjs:222-237) still writes head-only files for them, so they are live, indexable 200s:
- `/draw-heart-in-air` (fetched: 200, 6,888 B, self-canonical, title "Draw a Heart in the Air…"), `/draw-star-in-air`, `/draw-alphabet-in-air`: after JS boots, router falls through to **Landing** — page content contradicts its own title/canonical. (Drift acknowledged in entry-prerender.tsx:134-137.)
- `/activities/christmas-drawing` (fetched: 200, 7,024 B, self-canonical, title **identical** to `/activities/christmas-drawing-for-kids`), `/activities/halloween-drawing`, `/activities/back-to-school`: duplicate-title twins of the real seasonal pages, each self-canonical → two competing canonicals per topic. Client-side these hit SpecialActivityPage with a slug missing from SPECIAL_DATA (SpecialActivityPage.tsx:183) — INFERENCE: renders broken/blank or error-boundary content after hydration.
- `/stem-learning` in PAGE_META is correctly excluded (REDIRECTED set) and 308s (VERIFIED).

**F5 — /parents in sitemap but not prerendered (VERIFIED):** serves the 33,093 B homepage fallback whose canonical is `https://drawintheair.com/`. Google is told "this page is really the homepage" — the family-plan marketing page can never rank at /parents. Compounded by F1 (robots also blocks it). No ROUTES entry in entry-prerender.tsx and no PAGE_META canonical.

**Prerendered-but-absent-from-sitemap (repo diff, VERIFIED):** `/school` (intentional, robots-blocked), `/teachers`, `/pricing`, `/about`, `/activities/letter-tracing`. `/pricing`, `/about`, `/teachers` are indexable, canonical, full-body pages that simply aren't submitted — low-harm but inconsistent (INFERENCE: add to sitemap).

**Legacy redirects:** `/stem-learning` handled at edge (308) and mirrored in the router (main.tsx:241,696) — belt-and-braces, correct.

**F9 — /admin exposure:** `GET /admin` → 200 SPA shell (VERIFIED; same fallback doc). The dashboard itself is OAuth-gated with server-side `is_admin` RPC checks (main.tsx:15-19 comment; migration 20260521_security_lockdown.sql) and robots-disallowed. Publicly reachable *shell* only — acceptable posture; the JS chunk name still advertises the admin surface (standard SPA trade-off). INFERENCE: low risk.

---

## 7. MediaPipe / WASM / model availability (VERIFIED via HEAD)

Source: src/core/handTracker.ts:31-33 — WASM from `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm`, model from `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`. Pin 0.10.32 matches package-lock.json resolved version (VERIFIED) — the JS↔WASM contract is intact.

| URL | Status | Size | Cache |
|---|---|---|---|
| jsdelivr …/wasm/vision_wasm_internal.wasm | 200 | 11,453,626 B | max-age=31536000, immutable |
| jsdelivr …/wasm/vision_wasm_internal.js | 200 | 204,816 B | max-age=31536000, immutable |
| GCS hand_landmarker.task | 200 | 7,819,105 B | **max-age=3600 only** |

All reachable and CSP-allowed (script-src jsdelivr, connect-src jsdelivr + storage.googleapis.com). Risks (INFERENCE): (a) ~19 MB of hand-tracking runtime comes from two third-party CDNs — a school content filter blocking jsdelivr.net or storage.googleapis.com kills the core product in that classroom, and there is no self-hosted fallback in handTracker.ts (15 s init timeout then error). (b) The model URL is version-pathed but only 1 h cacheable; Google could in principle move/retire it. Self-hosting both under /assets (already immutable-cached, same-origin, CSP-simpler) would remove the single point of failure. The service worker (public/service-worker.js) may cache them after first successful load — UNVERIFIED whether it precaches cross-origin model files.

---

## 8. app.drawintheair.com (exposure assessment)

VERIFIED @ 21:26 UTC:
- `GET /` → 200, 6,434 B. Title: "Draw in the Air, Free Gesture Drawing App for Kids | No Download". Canonical: `https://drawintheair.com/`. Body is a **Vite SPA shell** (boot splash, no prerender) with asset hashes `index-DJzBSW0d.js`, `vendor-BpMrChGB.js` — **different from production** (`index-Cgmnujx9.js`) ⇒ a stale build of the kid-facing Vite app, not the Next.js teacher platform.
- Any path serves the same shell: `/trace-a` 200 6,434 B, `/login` 200 6,434 B. No auth wall.
- **`GET /api/form-submission` → 404 NOT_FOUND** (Vercel plain-text 404). But `src/lib/formSubmission.ts:32-33` defaults `FORM_ENDPOINT` to exactly `https://app.drawintheair.com/api/form-submission`. INFERENCE: unless `VITE_FORM_ENDPOINT` was set at build time (UNVERIFIED — the string sits in a lazy chunk not fetched), the primary lead/contact form pipeline posts into a 404 and silently relies on the Sheets/Leads fallbacks + localStorage (submitFormData tries endpoints in priority order). For a product whose growth depends on school/parent leads, this needs a definitive check.
- Code references: Footer.tsx:6 and TeacherDashboard.tsx:15 default `VITE_PLATFORM_URL` to this host — footer "platform" links send teachers to the stale shell.
- Security headers present (HSTS incl. subdomains inherited intent, XFO DENY, full CSP) but the CSP is an **older revision** (script-src lacks the posthog asset hosts; connect-src lacks app.drawintheair.com) — corroborates staleness.
- robots.txt on the subdomain: allows crawl, points Sitemap at the apex. No noindex header. SEO exposure is mitigated by the canonical-to-apex; operational exposure is a stale duplicate app + dead API endpoint.

Verdict: not a data-exposure risk (no secrets, no auth bypass observed), but it is a stale prototype/duplicate deployment masquerading as "the platform", with a dead form endpoint that the production client defaults to.

## 9. drawintheair.vercel.app

VERIFIED: `GET /` → 200, 33,093 B — byte-size-identical current production homepage, canonical `https://drawintheair.com/`, same title. No `x-robots-tag: noindex` on the response. Duplicate-content risk is low (every prerendered page carries an absolute canonical to the apex), but best practice is Vercel's "noindex preview/alias" or a redirect. Minor.

---

## 10. Third-party scripts in served homepage HTML (consent gating)

VERIFIED from the fetched homepage document:
- **Present in HTML at load:** only first-party asset references, including bundled `assets/posthog-G5-20pPt.js` and `assets/sentry-DgIEgYWR.js` chunks. **No** GA/gtag, GTM container, Clarity, or Meta Pixel script tags exist in the served HTML.
- Code (main.tsx:840-904, VERIFIED source): GA4 (G-S4XSWT6Q09), Clarity (vseevw9uck) and Meta Pixel are injected only when `hasAnalyticsConsent()` returns 'granted' AND hostname ∈ {drawintheair.com, www.drawintheair.com}. Default consent state is null ⇒ nothing loads (analyticsConsent.ts — opt-in, UK GDPR/PECR-compliant posture).
- PostHog: bundled but init is consent-gated (observability/index.ts:82-91). Sentry: initialises unconditionally as operational error monitoring (documented rationale in the same file) — a defensible legitimate-interest position, worth a line in the privacy policy. INFERENCE: consent implementation is correct at load time; only caveat is Sentry pre-consent.

---

## Top findings (severity suggestions)

| # | Severity | Finding |
|---|---|---|
| F1 | **High** | robots.txt `Disallow: /school` and `Disallow: /parent` prefix-block `/schools`, `/schools/training`, `/parents` — three sitemap-submitted, prerendered core marketing pages are uncrawlable. Directly undermines the schools-product SEO the 93-route SSG was built for. |
| F2 | **High** | Default form endpoint `https://app.drawintheair.com/api/form-submission` returns 404 in production; the client falls back down the chain, but the primary lead-capture path is dead. Verify `VITE_FORM_ENDPOINT` in the live build and where leads actually land. |
| F3 | **Medium-High** | app.drawintheair.com serves a stale Vite build of the kid app (old asset hashes, old CSP) with no auth; footer/TeacherDashboard "platform" links default there. Redeploy or decommission + redirect. |
| F4 | **Medium** | 6 PAGE_META orphan URLs live at 200 with self-canonicals: 3 render the homepage after JS (`/draw-heart-in-air` etc.), 3 are duplicate-title twins of real seasonal pages (`/activities/christmas-drawing` vs `-for-kids`). Fix the drift or 308 them. |
| F5 | **Medium** | `/parents` is in the sitemap but not prerendered — serves the homepage fallback with canonical→`/`, so the family marketing page can't rank (doubly blocked by F1). Add it to entry-prerender ROUTES + PAGE_META. |
| F6 | Low-Med | Universal soft-404: every unknown path (incl. `/contact`, `/login` — routes that don't exist) 200s the homepage. Consider a prerendered 404 page + Vercel 404 for non-route families, and add /contact or fix any collateral pointing to it. |
| F7 | Low-Med | Hand-tracking runtime (~19 MB) is fetched from jsdelivr + storage.googleapis.com with no self-hosted fallback; model cache is 1 h. A school web filter blocking either CDN disables the core product. Self-host under /assets. |
| F8 | Low | Header posture is otherwise strong (CSP/HSTS/XFO/PP/RP/nosniff all present); residual: `unsafe-inline`+`unsafe-eval` in script-src, `access-control-allow-origin: *` on documents, HSTS without preload, vercel.app alias not noindexed, sitemap omits /pricing, /about, /teachers, and generate-sitemap.ts no longer reproduces the committed sitemap. |
