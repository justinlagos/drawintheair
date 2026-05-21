# Draw in the Air — Security Audit

**Date:** 2026-05-21
**Scope:** `https://drawintheair.com` (Vite SPA on Vercel), `https://drawintheair.com/admin`, related Supabase project `fmrsfjxwswzhvicylaph`, and the `platform/` Next.js codebase in the repo.
**Posture:** Defensive audit, read-only probes only. No destructive testing, no brute force, no bulk data extraction. Every external probe was a single low-cardinality call (count or 1 row) to confirm the existence of an exposure already visible in source code.

---

## Executive Summary

Draw in the Air's claim that `/admin` is "disabled in production" and that "real admin access uses the Supabase-auth admin route on the Next.js deployment" is **substantively false in the currently deployed system**. The findings below are not theoretical — they were confirmed live against the production Vite bundle and the production Supabase project.

1. **There is no Next.js deployment in production.** `https://app.drawintheair.com` resolves to the same Vite SPA as `drawintheair.com` (identical CSP, identical bundle). The Next.js admin layout with `requireAdmin()` server-side gating exists in the repo at `platform/src/app/(admin)/`, but it is not what serves traffic. The "Supabase-auth admin route" the legacy `/admin` page points to is currently a 404 with respect to real auth — visitors are redirected to a page that does not exist.

2. **The "real" production admin dashboard is `/admin/insights`, and its gate is purely client-side.** A hard-coded allow-list (`mrjustinukaegbu@gmail.com`) is shipped in the public JS bundle, and the dashboard data is served by Supabase RPCs that are `GRANT EXECUTE … TO anon`. Anyone with a browser can reproduce the entire dashboard payload without signing in.

3. **The active `sessions` table is anonymously readable.** With the bundled anon key, a stranger can fetch the full list of live classroom sessions — including the 4-digit join codes, teacher UUIDs, school IDs, activity, state and timer — and then join any class as a "student" using a chosen first name. Child-facing.

4. **Legacy `/admin` is still served by the production SPA and the production gate is bypassable in ~3 lines of JS** by writing `admin_authenticated=true` into `sessionStorage`. The build deliberately omits `VITE_ADMIN_PIN`, so the PIN form errors out — but the `useEffect` session-restore path renders the full dashboard component without ever checking that gate.

5. **`form_submissions` and `newsletter_subscribers` RLS policies are misconfigured.** Their policy names say "Service role can …" but the SQL bodies are `USING (true)` / `WITH CHECK (true)` with no `TO service_role` clause. The tables currently have 0 rows, but any submission going forward will be world-readable.

6. **CSP is weakened by `'unsafe-inline' 'unsafe-eval'`** in `script-src`, defeating the protection against the most common XSS payload class on a kid-facing site.

7. **Supabase session is stored in `localStorage`** (`sb-session`) as a long-lived JWT. Any XSS gets a full admin/teacher impersonation; the JWT is not bound to a session cookie or fingerprint.

8. **Authenticated SELECT on `analytics_events` and other analytics tables is `USING (true)`** — any Google-signed-in teacher (or anyone who signs up via Google OAuth) can dump the raw, session-level analytics for every other user.

The single biggest, highest-leverage fix is: **make every dashboard RPC `GRANT … TO authenticated` (not `anon`) and gate admin reads on `is_admin = true` inside the function**. The second is: **lock down the `sessions` table with RLS so anon can only read by exact-code lookup, not enumerate.** Both are a few SQL files.

---

## /admin — Verdict

### What I tried

| Step | Method | Result |
|---|---|---|
| 1 | `curl -I https://drawintheair.com/admin` | HTTP 200, serves the Vite SPA `index.html` (Vercel rewrite catches everything outside `/assets`, `/images`, etc.). |
| 2 | `curl https://drawintheair.com/assets/index-37vKQXRx.js` and grep | Bundle contains the Supabase anon JWT, the `admin_authenticated` / `admin_session_expiry` sessionStorage keys, and the literal session-restore check `sessionStorage.getItem("admin_authenticated")==="true" && Date.now() < parseInt(expiry,10)`. |
| 3 | Fetch the lazy chunk `assets/InsightsDashboard-DPSbSey3.js` | Bundle contains the hard-coded allow-list email `mrjustinukaegbu@gmail.com` and the `allow-list` string. |
| 4 | `POST https://fmrsfjxwswzhvicylaph.supabase.co/rest/v1/rpc/dashboard_executive_summary` with the bundled anon key | HTTP 200, returns real production metrics: 256 sessions in 7d, 81 distinct devices, camera-grant rate, completion rate, 17-day session sparkline. No auth required. |
| 5 | `GET /rest/v1/sessions?select=*` with anon key | HTTP 200, returns a live classroom session row: `code=4045`, `teacher_id=a6a45124-…`, `class_state=in_activity`, `activity=calibration`. |
| 6 | `OPTIONS /rest/v1/sessions` etc. | `allow: GET, HEAD, POST, OPTIONS` for `sessions`, `session_students`, `round_scores`. |

### What the browser showed

The legacy /admin page renders the "Admin Dashboard" card with the production warning banner ("This panel is disabled in production. The PIN flow is bundle-extractable and not safe for live use…"). Both the PIN input and the Login button are disabled. The page **looks** locked down.

### Is the PIN flow truly disabled?

**Yes for the login button. No for the dashboard itself.** The PIN check sits behind `adminPanelDisabledByEnv` (`isProduction && !VITE_ENABLE_ADMIN_PANEL`), and the production build of the bundle does not contain `VITE_ADMIN_PIN`. But the `useEffect` hook at `src/pages/Admin.tsx:365-375` restores the auth state purely from `sessionStorage` and does **not** check `adminPanelDisabledByEnv`. So:

```js
// In the page console:
sessionStorage.setItem("admin_authenticated", "true");
sessionStorage.setItem("admin_session_expiry", String(Date.now() + 3_600_000));
location.reload();
```

…renders the full dashboard, fires `fetchData()`, and if `VITE_SHEETS_ENDPOINT` is configured, POSTs the (bundle-known) PIN to that endpoint and pulls back pilot signups and feedback. With the current build (no Sheets endpoint set in production), the user gets demo data plus whatever the local browser has cached in `dita_form_submissions`. Still bypassable; the protection of the underlying data is luck, not gating.

### Should /admin exist in production?

**No.** The component's own banner says it shouldn't. It is a "casual deterrent" version that the team has explicitly outgrown. Keeping it shipped is a footgun: every time someone bumps `VITE_ENABLE_ADMIN_PANEL=true` for a dev experiment and forgets to flip it back, the panel is live with a bundle-extractable PIN.

### Exact change

In `src/main.tsx`, replace the `/admin` route handler with a hard redirect:

```tsx
// before
if (route === 'admin') {
  return <Admin />;
}

// after — production behavior
if (route === 'admin') {
  // The legacy PIN dashboard has been retired. Real admin access is
  // through /admin/insights (Supabase OAuth + server-side gate).
  if (typeof window !== 'undefined') {
    window.location.replace('/admin/insights');
  }
  return null;
}
```

Delete `src/pages/Admin.tsx`, `src/pages/admin.css`, and the import from `main.tsx`. Remove the lazy `<Admin />` chunk from the build. (Once a real Next.js admin is deployed at a separate origin, change the redirect target to that.)

If you cannot delete today, at minimum extend the `adminPanelDisabledByEnv` check into the `useEffect` session-restore so the dashboard never renders when disabled.

---

## Critical Risks

### C1. Anon-readable `sessions` table exposes live classroom join codes

- **Severity:** Critical
- **Tested:** `GET https://fmrsfjxwswzhvicylaph.supabase.co/rest/v1/sessions?select=id,code,status,class_state,teacher_id,class_name&limit=1` with the bundled anon key.
- **Observed:** HTTP 200 with `[{"id":"cc8f85fc…","code":"4045","status":"lobby","class_state":"in_activity","teacher_id":"a6a45124-…","class_name":null}]`. A second probe with `select=*` returned the full row (school_id, playlist_id, metadata, scoreboard config, timer_seconds, max_students).
- **Why it matters:** Children's live classroom sessions are listable by anyone on the internet. With the code in hand and the public `/join` URL, a stranger can enter a name and join the class. Even if the conductor RPCs prevent disrupting the activity, a hostile-named student appearing on a teacher's lobby in front of a class is a child-safeguarding incident.
- **Exploitable:** Yes — confirmed live. No special tooling needed.
- **Affected:** `public.sessions` table; `src/pages/classmode/StudentJoin.tsx` (relies on `dbSelect('sessions', 'code=eq.…')`); the migration that creates `sessions` does not define RLS policies that scope SELECT to the teacher.
- **Recommended fix:** Add a function-scoped lookup (`SECURITY DEFINER`) and forbid direct `SELECT` from anon:

  ```sql
  -- 1. Force RLS, deny anon by default.
  ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.sessions FORCE ROW LEVEL SECURITY;
  REVOKE SELECT ON public.sessions FROM anon;

  -- 2. Teacher reads own sessions only.
  CREATE POLICY "Teacher reads own sessions"
    ON public.sessions FOR SELECT TO authenticated
    USING (teacher_id = auth.uid());

  -- 3. Students join by code — single-row SECURITY DEFINER RPC.
  CREATE FUNCTION public.session_lookup_by_code(in_code text)
  RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
  DECLARE r record;
  BEGIN
    IF in_code !~ '^\d{4}$' THEN RETURN NULL; END IF;
    SELECT id, code, activity, class_state, timer_seconds, max_students
      INTO r FROM public.sessions
      WHERE code = in_code AND status <> 'ended' AND class_state <> 'ended'
      LIMIT 1;
    IF NOT FOUND THEN RETURN NULL; END IF;
    -- No teacher_id, no school_id, no metadata in the response.
    RETURN to_jsonb(r);
  END $$;
  GRANT EXECUTE ON FUNCTION public.session_lookup_by_code(text) TO anon, authenticated;
  ```

  Then change `StudentJoin.tsx` to call this RPC instead of `dbSelect('sessions', …)`.
- **Safer pattern:** Treat 4-digit codes as a discovery hint, not a secret. Anything sensitive (teacher identity, school, playlist) must never travel down the unauthenticated lookup channel.
- **Verification after fix:**
  1. `curl … rest/v1/sessions?select=id` returns `[]` for anon.
  2. `POST … rpc/session_lookup_by_code` with a known good code returns the limited shape; with an unknown code returns `null`; with a non-4-digit string returns `null`.
  3. Brute-force probe (your own test, ≤10 codes/min) confirms no enumeration via either path.

### C2. "Auth-gated" /admin/insights data is `GRANT … TO anon`

- **Severity:** Critical (business confidentiality), High (privacy adjacency)
- **Tested:** `POST /rest/v1/rpc/dashboard_executive_summary` with the bundled anon key.
- **Observed:** Full executive payload returned. Comment in `src/pages/admin/InsightsDashboard.tsx` explicitly says *"The RPCs are granted to anon — auth is purely component-level."* Migrations confirm `GRANT EXECUTE … TO anon, authenticated` on `dashboard_executive_summary`, `dashboard_today`, `dashboard_funnel`, `dashboard_tracker_health`, `dashboard_top_modes`, `dashboard_errors`, `dashboard_latest_sessions`, `dashboard_cohort_retention`, `dashboard_mastery`, `dashboard_curriculum_coverage`, `dashboard_classrooms`, `dashboard_mastery_milestones`. `dashboard_public_proof` and `landing_public_proof` are *intentionally* anon and can stay that way.
- **Why it matters:** Every "Investor-grade" KPI you ship in the bundle — distinct devices, completion rate, camera grant rate, sparkline of daily session counts, mastery curves, mode breakdowns, cohort retention, classroom analytics — is callable by anyone who fetches your homepage. The hard-coded `ALLOWED_ADMINS = new Set(['mrjustinukaegbu@gmail.com'])` only hides the UI, not the data. The `dashboard_errors` and `dashboard_latest_sessions` RPCs additionally expose session-level metadata (browser, device_type, age_band, page, error meta) — light de-anonymisation risk at low volume, real PII risk if `meta` ever gets a stray string.
- **Exploitable:** Yes — confirmed live.
- **Affected files / endpoints:**
  - Migrations granting to `anon`:
    - `platform/supabase/migrations/20260507_analytics_dashboard_rpcs.sql`
    - `platform/supabase/migrations/20260507_analytics_tier_c_d.sql`
    - `platform/supabase/migrations/20260507_analytics_gaps_4_5_6.sql`
    - `platform/supabase/migrations/20260513_executive_summary_perf.sql`
  - Client RPC client: `src/pages/admin/insights/rpc.ts`.
- **Recommended fix:**

  1. New migration `20260521_lock_dashboards_to_admin.sql`:

     ```sql
     -- Add a server-side admin check.
     CREATE OR REPLACE FUNCTION public._is_admin() RETURNS boolean
     LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
       SELECT COALESCE((SELECT is_admin FROM public.teachers WHERE id = auth.uid()), false)
     $$;

     -- Revoke from anon, regrant to authenticated, and inject the admin
     -- assertion into every SECURITY DEFINER RPC. (For brevity, applied
     -- to dashboard_executive_summary; repeat for each.)
     REVOKE EXECUTE ON FUNCTION public.dashboard_executive_summary(integer) FROM anon;

     CREATE OR REPLACE FUNCTION public.dashboard_executive_summary(in_days integer DEFAULT 7)
     RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
     SET search_path TO 'public', 'pg_temp'
     SET statement_timeout TO '30s'
     AS $$
     BEGIN
       IF NOT public._is_admin() THEN
         RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
       END IF;
       -- … existing body …
     END
     $$;

     GRANT EXECUTE ON FUNCTION public.dashboard_executive_summary(integer) TO authenticated;
     ```

     Repeat the `REVOKE … FROM anon` + admin-check pattern for every dashboard_* function in `rpc.ts`. The `lios_*` ones added in May 2026 are already `TO authenticated` only — same admin-check still belongs inside, because any signed-in teacher would otherwise hit them.

  2. In `src/pages/admin/InsightsDashboard.tsx`, the `ALLOWED_ADMINS` Set is no longer load-bearing — keep it for UI affordances, but the gate that matters is now on the database. Stop bundling the email; read it from a server-rendered or Supabase-fetched `_is_admin()` boolean.

- **Safer pattern:** *Anything a user could not get by signing in as the lowest-privileged user must be gated server-side.* Client-side allow-lists are UX, not security. SECURITY DEFINER + an `is_admin` check is the canonical Supabase pattern.
- **Verification after fix:**
  1. Anonymous `POST /rest/v1/rpc/dashboard_executive_summary` returns HTTP 403 / `42501`.
  2. A signed-in teacher with `is_admin=false` gets HTTP 403.
  3. A signed-in admin gets HTTP 200.
  4. `landing_public_proof` and `dashboard_public_proof` are still anon-callable (intentional).

### C3. `/admin` client-side gate bypassable via sessionStorage

- **Severity:** Critical
- **Tested:** Read `Admin.tsx` (`src/pages/Admin.tsx` lines 364-375) and confirmed both bypass strings exist verbatim in `assets/index-37vKQXRx.js` in production.
- **Observed:** The `useEffect` session-restore path reads `sessionStorage.getItem("admin_authenticated") === "true"` and sets `isAuthenticated=true` without consulting `adminPanelDisabledByEnv` or `adminPin`. Three lines of JS in the console render the full dashboard, kick off `fetchData()`, and on configured deployments POST the bundle-known PIN to the Sheets endpoint.
- **Why it matters:** Defence-in-depth failed. If the Sheets endpoint is ever re-enabled on a build with a bundled PIN (or if `dita_form_submissions` localStorage on a public/kiosk browser holds prior teachers' contact details), this is direct exposure.
- **Exploitable:** Yes for the dashboard render. Whether any *data* leaks behind it depends on what other env vars the build has — in the currently shipped build, only locally-cached form submissions on that particular browser are exposed.
- **Affected:** `src/pages/Admin.tsx`, route `/admin` in `src/main.tsx`.
- **Recommended fix:** Delete the legacy route (see "Exact change" above). If you must keep it for now, at minimum:

  ```tsx
  useEffect(() => {
    if (adminPanelDisabledByEnv || !adminPin) return; // ← add this
    const authStatus = sessionStorage.getItem('admin_authenticated');
    // … rest unchanged …
  }, [fetchData, adminPanelDisabledByEnv, adminPin]);
  ```

  And gate the entire `return (… dashboard JSX …)` block on `!adminPanelDisabledByEnv && adminPin`.
- **Safer pattern:** Don't use client-side `sessionStorage` flags as auth. The only authoritative bit is "did the server validate a credential this request". Anything else is decoration.
- **Verification after fix:** Set `admin_authenticated=true` in DevTools and reload `/admin`. Page should show the disabled banner, not the dashboard.

### C4. RLS policies on `form_submissions` / `newsletter_subscribers` are world-permissive

- **Severity:** Critical
- **Tested:** Read `platform/supabase/migrations/20260313_form_submissions.sql`; live `GET /rest/v1/form_submissions?select=id` with anon returned HTTP 200 / `content-range: */0` (i.e. RLS allows the SELECT — the table just has zero rows yet).
- **Observed:** Policies are named *"Service role can insert / read"* but have no `TO service_role` clause:

  ```sql
  CREATE POLICY "Service role can insert form submissions"
    ON public.form_submissions FOR INSERT WITH CHECK (true);
  CREATE POLICY "Service role can read form submissions"
    ON public.form_submissions FOR SELECT USING (true);
  ```

  Without `TO`, the policies apply to PUBLIC (i.e. all roles, anon included). Same shape on `newsletter_subscribers`. PostgREST is reachable by anon (the table grants are open), and the RLS body is `true`. The fact that the `/api/form-submission` Next.js route was meant to use `SUPABASE_SERVICE_ROLE_KEY` to do the writes is irrelevant — the policy doesn't constrain the role.
- **Why it matters:** Every school-pack request, parent trial signup, contact form submission, newsletter subscription, and feedback message will be world-readable the moment they start arriving. Includes name, school, role, email, message, metadata blob.
- **Exploitable:** Yes the moment a row exists. Currently 0 rows.
- **Affected:** `public.form_submissions`, `public.newsletter_subscribers` and migration `20260313_form_submissions.sql`.
- **Recommended fix:** New migration:

  ```sql
  ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.form_submissions FORCE ROW LEVEL SECURITY;
  ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.newsletter_subscribers FORCE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Service role can insert form submissions" ON public.form_submissions;
  DROP POLICY IF EXISTS "Service role can read form submissions"   ON public.form_submissions;
  DROP POLICY IF EXISTS "Service role can insert subscribers"      ON public.newsletter_subscribers;
  DROP POLICY IF EXISTS "Service role can read subscribers"        ON public.newsletter_subscribers;

  -- service_role bypasses RLS automatically; explicit deny for anon/auth.
  REVOKE ALL ON public.form_submissions       FROM anon, authenticated;
  REVOKE ALL ON public.newsletter_subscribers FROM anon, authenticated;

  -- If you still want to allow anon to POST a form without going via the
  -- Next.js API, do it through a SECURITY DEFINER RPC that validates
  -- shape, runs a per-IP rate limit, and inserts as the service role.
  ```

  Verify in Supabase Studio that the only role with SELECT on these tables is `service_role`.
- **Safer pattern:** Restrict by `TO` clause whenever the role name doesn't appear in the policy. Bias toward `REVOKE ALL … FROM anon, authenticated;` and explicit grants per RPC.
- **Verification after fix:**
  1. `curl … rest/v1/form_submissions?select=id` returns HTTP 401 / 403.
  2. Submitting a real form via the Next.js endpoint still works (uses service-role key).
  3. Submitting via raw PostgREST as anon is blocked.

---

## High Priority

### H1. `analytics_events` SELECT is open to any authenticated user

- **Severity:** High
- **Tested:** `platform/supabase/migrations/20260506_analytics_events.sql` lines 90-95.
- **Observed:** `CREATE POLICY "Authenticated select analytics events" ON public.analytics_events FOR SELECT TO authenticated USING (true);`. Same pattern on `learning_attempts`, the LIOS observability and observation tables. Any user who signs in via Google OAuth (e.g. for Class Mode) automatically becomes `authenticated` and can dump every row.
- **Why it matters:** `analytics_events` contains session_id, age_band, school_id, class_id, build_version, browser, viewport, utm_*, referrer, and a JSONB `meta`. Even though the comment claims "no PII", combining `meta`, `school_id`, `class_id`, and timestamps can re-identify a classroom's pattern of use.
- **Exploitable:** Yes — anyone who signs in.
- **Affected:** `analytics_events`, `learning_attempts`, `lios_anomaly_fact`, `lios_adaptive_decisions`, `human_observation_fact`, and any other table whose SELECT policy is `TO authenticated USING (true)`.
- **Recommended fix:** Replace the policy:

  ```sql
  DROP POLICY "Authenticated select analytics events" ON public.analytics_events;
  CREATE POLICY "Admins select analytics events"
    ON public.analytics_events FOR SELECT TO authenticated
    USING (public._is_admin());
  ```

  Apply the same to `learning_attempts` and the LIOS tables. Internal reads should now flow through the SECURITY DEFINER RPCs (which also need the `_is_admin()` check from C2).
- **Safer pattern:** Never `USING (true)` for a SELECT policy on a table that holds anyone-but-me data. Always express the access rule (`user_id = auth.uid()`, `school_id = my_school()`, or `_is_admin()`).

### H2. Supabase session stored in `localStorage` (XSS → full account takeover)

- **Severity:** High
- **Tested:** `src/lib/supabase.ts` lines 45-52, `persistSession()` writes `JSON.stringify(session)` to `localStorage.sb-session`.
- **Observed:** A long-lived access token + refresh token are kept where any in-page script can read them. CSP is `'unsafe-inline' 'unsafe-eval'`, so a single reflected XSS into any landing page text (e.g. school name in a form preview) is enough to walk the localStorage and post the token to an attacker-controlled domain (CSP `connect-src` blocks unknown destinations, partially mitigating, but `https:` in `img-src` allows pixel exfil).
- **Why it matters:** The same JWT is what `/admin/insights` uses to identify the admin. Loss = admin impersonation. For teachers, loss = ability to start/end classes, kick students, see student stats.
- **Exploitable:** Conditional on finding any XSS in the SPA. The XSS surface is small (no user-rendered HTML in the kid surfaces), but the SPA loads `cdn.tailwindcss.com` and `cdn.jsdelivr.net` scripts in production — any CDN compromise or open-redirect on those origins becomes a full takeover because of `'unsafe-eval'`.
- **Affected:** `src/lib/supabase.ts`, `vercel.json` (CSP).
- **Recommended fix (longer):** Migrate to Supabase's official `@supabase/ssr` cookie-based session storage with HttpOnly cookies. This is what the unshipped Next.js platform already uses.
- **Recommended fix (sooner):** Tighten the CSP — drop `'unsafe-eval'` (Tailwind CDN can be replaced with a build-time Tailwind compile), drop `'unsafe-inline'` for scripts (move the gtag init and Tailwind config to module scripts with nonces), and remove `cdn.tailwindcss.com` from `script-src`. That alone neuters most XSS-to-token paths.
- **Verification:** Build a passing CSP report — `Content-Security-Policy-Report-Only` first, fix all violations, then enforce.

### H3. CSP enables `'unsafe-inline' 'unsafe-eval'` in production

- **Severity:** High (defence-in-depth)
- **Tested:** Live response headers from `https://drawintheair.com/`.
- **Observed:** `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdn.tailwindcss.com https://www.googletagmanager.com https://*.clarity.ms`.
- **Why it matters:** The CSP is doing almost nothing for the `script-src` family — `'unsafe-inline'` allows event-handler injection (`<img onerror=…>`) and inline `<script>` tags, and `'unsafe-eval'` allows `new Function()`/`eval()`/`setTimeout("…", …)`. Combined with the localStorage token (H2) and the CDN allow-list, this is the highest-leverage hardening on the site.
- **Affected:** `vercel.json` headers block.
- **Recommended fix:**

  ```diff
  - "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdn.tailwindcss.com https://www.googletagmanager.com https://*.clarity.ms"
  + "script-src 'self' 'nonce-<runtime-nonce>' https://www.googletagmanager.com https://*.clarity.ms"
  ```

  Replace the Tailwind CDN with a build-time Tailwind compile (already a Vite plugin). Replace inline `gtag()` init with a nonced module script. If `cdn.jsdelivr.net` is needed (it appears unused in production HTML), drop it.
- **Safer pattern:** No `'unsafe-eval'` on a kid-facing site. Nonce or hash every inline script.
- **Verification:** `curl -sI https://drawintheair.com/ | grep -i content-security-policy` shows no `unsafe-*`. Browser console shows no CSP violations on a smoke walk of every route.

### H4. Anon-callable RPC `lios_record_observation` accepts arbitrary device_id

- **Severity:** High
- **Tested:** Read `src/pages/admin/insights/rpc.ts` lines 106-120, then `platform/supabase/migrations/20260519_lios_human_observation.sql`.
- **Observed:** `recordObservation` is the client wrapper; the migration grants `EXECUTE` to anon for that RPC (search `lios_record_observation` in the migrations and verify the grant on your install). The args include `p_device_id`, `p_focus_tags`, `p_note`, etc. — i.e. an outsider can insert observations against any device_id they like, polluting analytics and dashboards.
- **Why it matters:** Trust/safety degrades on the observation table; an attacker can flood it with garbage to make dashboards useless or to embed slurs into per-device "notes" that get rendered to admins.
- **Recommended fix:** Limit `lios_record_observation` to `authenticated` and assert `auth.uid()` against a registered observer (teacher/parent) inside the function. Strip / sanitise free-form `p_note`.
- **Verification:** `POST /rest/v1/rpc/lios_record_observation` as anon returns 403.

### H5. JS-pseudorandom 4-digit class codes; PostgREST exposes session enumeration

- **Severity:** High (defence-in-depth; combines with C1)
- **Tested:** `src/features/classmode/sessionCode.ts` — `Math.floor(1000 + Math.random()*9000)`.
- **Observed:** ~8,986 effective codes (15 excluded patterns). Not cryptographically random. Combined with the anon-readable `sessions` table (C1), this means an attacker doesn't even need to guess; once C1 is patched, the small keyspace means a brute-force is still feasible if no per-IP rate limit is in place.
- **Recommended fix:**
  1. Generate codes in the database (`generate_session_code()` RPC) using `gen_random_bytes(2)` so it's not reliant on the client.
  2. Enforce per-IP / per-anon-token rate-limit on `session_lookup_by_code` (Supabase Edge rate-limit or pg_throttle).
  3. Consider 5- or 6-digit codes for non-classroom use (parents at home don't have the "kids reading off the board" constraint).
- **Verification:** Repeated `session_lookup_by_code` calls from one IP get 429 after a small threshold.

### H6. Misleading `redirect_to=/class` lets implicit-flow tokens land at a route that mishandles them

- **Severity:** Medium-to-High
- **Tested:** `src/lib/supabase.ts` lines 130-140: `signInWithGoogle` always sets `redirect_to=${origin}/class` because *"Supabase's allow-list only contains specific redirect URLs"*. The actual destination is stashed in `sessionStorage['sb-return-to']` and the hash-borne `access_token` is parsed at the callback page.
- **Observed:** `handleAuthCallback()` reads `access_token` from `window.location.hash` on any page that mounts AuthProvider. So if a teacher is sent to `/class` with `#access_token=…`, but for some reason the page errors out before the hash is cleaned, the token survives in `history` and any CSP-allowed third-party script on the page (Clarity, gtag) could see it.
- **Why it matters:** Implicit-flow tokens in `window.location.hash` are visible to *every* script running on the page that processes the URL. The current allow-list-only design forces this anti-pattern.
- **Recommended fix:** Switch to Supabase PKCE flow (`flow_type=pkce` and use the `@supabase/ssr` cookie-based store). Add each canonical post-auth path (`/class`, `/admin/insights`, `/dashboard`) to the Supabase OAuth redirect allow-list so the hash is only ever in the URL on one specific page. Then `handleAuthCallback` becomes a dedicated `/auth/callback` route, not "any page that loads".
- **Verification:** After fix, `#access_token=` never appears on routes other than `/auth/callback`.

### H7. Bundled allow-list email leaks an admin's personal address

- **Severity:** Medium-to-High (privacy + targeting risk)
- **Tested:** `grep mrjustinukaegbu@gmail.com /tmp/insights.js` on the lazy chunk fetched from production.
- **Observed:** The admin's personal Gmail is shipped in plain text in the production bundle.
- **Why it matters:** Anyone who decompiles the bundle gets a high-value spear-phishing target (the human who runs the analytics and has admin in Supabase). On a kid-safety platform this also makes the admin reachable to angry parents.
- **Recommended fix:** Remove the client-side allow-list (it becomes redundant after C2). Authoritative admin check moves to `public._is_admin()` in Postgres. UI can render conditionally on a Supabase fetch (e.g. `select is_admin from teachers where id = auth.uid()`).
- **Verification:** Search the production bundle for `@gmail.com` — should find none.

---

## Medium Priority

### M1. Form-submission API silently falls back from service-role key to anon key

- **Severity:** Medium
- **Tested:** `platform/src/app/api/form-submission/route.ts` line 20: `const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;`.
- **Why it matters:** If anyone deploys the Next.js platform without setting `SUPABASE_SERVICE_ROLE_KEY`, the route silently uses the anon key, which once C4 is fixed will fail INSERT — but won't tell anyone *why*. Worse, before C4 lands, this fallback is what writes form submissions to a world-readable table.
- **Fix:** Hard-fail at boot if `SUPABASE_SERVICE_ROLE_KEY` is unset and the route is being used.

### M2. `app.drawintheair.com` resolves to the same Vite SPA as the apex

- **Severity:** Medium (operational confusion → real outages)
- **Tested:** `curl https://app.drawintheair.com/` returns the same `index.html` and CSP as `https://drawintheair.com/`.
- **Why it matters:** Two things claim to be "the platform" — the SPA reachable via two hostnames and the unshipped Next.js codebase in `platform/`. The Vite SPA links to `https://app.drawintheair.com/api/form-submission`, which currently doesn't exist (so the legacy Google Sheets fallback is the only path). When the Next.js platform ships, ensure `app.drawintheair.com` actually points to it and the two CSPs are correct for each origin.

### M3. Service Worker caches `/admin` HTML

- **Severity:** Medium
- **Tested:** `public/service-worker.js`. Strategy is network-first for HTML, but `/` is in `PRECACHE_ASSETS`.
- **Why it matters:** A user who navigated to `/admin` once and is later offline gets a cached admin shell. Not exploitable by itself, but it makes incident response (e.g. emergency take-down of `/admin`) less effective for returning users.
- **Fix:** Exclude `/admin*`, `/admin/insights*`, `/transparency` from the SW caches; on activate, purge any URL whose path starts with `/admin`.

### M4. Sitemap omits admin URLs (good) but robots.txt Disallow is the only deterrent

- **Severity:** Low/Medium
- **Tested:** `https://drawintheair.com/robots.txt` and `/sitemap.xml`.
- **Why it matters:** `Disallow: /admin` in robots.txt is advisory only — confirms to attackers that `/admin` is interesting. Combined with the unobfuscated route name, it does no harm but provides no protection.
- **Fix:** Once `/admin` is removed (C3 fix), drop the Disallow too — it points at an absent route. Keep `Disallow: /admin*` only if there's a real admin path to deter crawler indexing of marketing artefacts.

### M5. Anon write access on `analytics_events` has no per-anon throttle

- **Severity:** Medium
- **Tested:** `platform/supabase/migrations/20260506_analytics_events.sql` policy `Anonymous insert analytics events WITH CHECK (true)`.
- **Why it matters:** A motivated attacker can blast millions of events into the table, balloon storage costs, and slow the dashboard RPCs (we already saw `dashboard_latest_sessions` time out in production at HTTP 500). The migration comment says it "relies on Supabase's request-rate limits and our own client-side batching" — both of which are easy to bypass.
- **Fix:** Add a database trigger that rate-limits per IP / per session_id, or move event submission through a SECURITY DEFINER RPC that records hashed IPs and per-window counts.

### M6. `dashboard_latest_sessions` HTTP 500 on production (DoS-adjacent)

- **Severity:** Medium
- **Tested:** `POST /rest/v1/rpc/dashboard_latest_sessions { "row_limit": 3 }` returned HTTP 500 / `57014 canceling statement due to statement timeout`.
- **Why it matters:** The same anon-callable surface is a soft DoS lever — repeated calls keep a Postgres worker busy until timeout. Same issue the May 2026 perf fix addressed for `dashboard_executive_summary`.
- **Fix:** Add an index on `analytics_events(session_id, occurred_at)` (already present), refactor `dashboard_latest_sessions` to project only the columns it needs and bound the per-session aggregation window to N days. Also kicked by C2 (revoke from anon).

### M7. `unsubscribe_token` in `newsletter_subscribers` would be readable by anon

- **Severity:** Medium
- **Tested:** Same as C4.
- **Why it matters:** The unsubscribe token is meant to be a per-recipient secret; if `newsletter_subscribers` SELECT is `USING (true)` and reachable by anon, the entire token table leaks the moment a subscriber appears.
- **Fix:** Fold into C4. Additionally, never `SELECT *` the table from any RPC — unsubscribe should be a SECURITY DEFINER RPC that takes `email + token` and returns boolean.

### M8. `cdn.tailwindcss.com` runtime Tailwind compiler in production

- **Severity:** Medium
- **Tested:** `index.html` `<script src="https://cdn.tailwindcss.com"></script>`.
- **Why it matters:** Ships a JIT compiler that requires `'unsafe-eval'` in CSP (H3). Also adds a third-party single-point-of-failure on every page load and a hostile-CDN supply-chain risk.
- **Fix:** Use `@tailwindcss/vite` or the standalone CLI to compile at build time. Drop `'unsafe-eval'` and `cdn.tailwindcss.com` from CSP.

### M9. `dashboard_classrooms` RPC anon-callable

- **Severity:** Medium
- **Tested:** `platform/supabase/migrations/20260507_analytics_tier_c_d.sql:246`.
- **Why it matters:** Even though the page that calls it is gated, the function itself is anon-callable and returns classroom-level aggregates. Same fix as C2.

### M10. CORS `Access-Control-Allow-Origin: *` on Vercel static + Next.js form endpoint

- **Severity:** Low/Medium
- **Tested:** `curl -I https://drawintheair.com/` and `platform/src/app/api/form-submission/route.ts` OPTIONS handler.
- **Why it matters:** `*` on the form-submission endpoint is fine *because the endpoint has no credentials*. It would not be fine if you ever add cookies. Pin to the canonical origins (`https://drawintheair.com`, `https://app.drawintheair.com`) defensively.

---

## Low Priority Hardening

### L1. `index.html` and the production bundle expose internal app version + file paths
The bundle prints "🎨 Draw in the Air v2.0.0 - Updated version loaded" and lists tracking module paths to console when `?debug` is set. Not a vuln, but reduces enumeration friction. Gate behind `import.meta.env.DEV` only.

### L2. `console.debug('[Admin] Fetching from endpoint…')` and friends ship to production
Logs are noisy and reveal flow. Strip with a `terserOptions: { compress: { drop_console: true } }` in `vite.config.ts` for production builds, or wrap behind a `if (import.meta.env.DEV)` predicate.

### L3. Service-worker version `v7-brand-2026-05-20` is exposed
Trivial recon info; consider hashing the version string.

### L4. `X-XSS-Protection: 0` (correct) — keep, but document the reason
You're right to set it to 0. Add a comment in `vercel.json` so future contributors don't "fix" it.

### L5. No `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy`
Add `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Resource-Policy: same-site` to harden against spec-style cross-origin attacks. Will require auditing the MediaPipe model loading.

### L6. No source maps in production (verified 404)
Good. Keep `vite build` configured with `sourcemap: false` (default).

### L7. Sitemap is publicly enumerable (expected)
No action; keep.

### L8. `eslint.config.js` doesn't enforce a security plugin
Add `eslint-plugin-security` and `eslint-plugin-no-secrets` to the chain so future leaks are caught in CI.

### L9. The Vite SPA prints the admin's email in the React tree via the `email` prop on `AuthenticatedDashboard`
Once an admin signs in, the React DOM contains their email in plain text. Defence-in-depth only; minor.

### L10. `vercel.json` rewrite allows `/.env`, `/.env.example` to serve the SPA
Currently harmless (returns the SPA shell, not the file). Add `.env*` to the negative-lookahead in the rewrite source to return 404 instead.

---

## Supabase / RLS Review (summary)

| Surface | Current | Should be |
|---|---|---|
| `analytics_events` INSERT | `TO anon, authenticated WITH CHECK (true)` | Same, but add per-window throttle (M5) |
| `analytics_events` SELECT | `TO authenticated USING (true)` | `USING (public._is_admin())` (H1) |
| `learning_attempts` SELECT | `TO authenticated USING (true)` | `USING (public._is_admin())` |
| `form_submissions` SELECT | `USING (true)` (no `TO`) | service_role only (C4) |
| `newsletter_subscribers` SELECT | `USING (true)` (no `TO`) | service_role only (C4) |
| `sessions` SELECT | Open to anon (no scoping policy seen) | Teacher-owns + SECURITY DEFINER lookup (C1) |
| `session_students`, `round_scores` | POST allowed for anon | Conductor RPCs only |
| `dashboard_*` RPCs (May 2026 batch) | `TO anon, authenticated` | `TO authenticated` + `_is_admin()` (C2) |
| `lios_*` RPCs (mostly) | `TO authenticated` | + `_is_admin()` |
| `landing_public_proof`, `dashboard_public_proof` | `TO anon` | Keep as-is (intentional public) |
| `lios_record_observation` | likely `TO anon` (verify) | `TO authenticated` + observer check (H4) |

A single migration `20260521_rls_admin_lockdown.sql` should:

1. Create `public._is_admin()`.
2. Tighten every dashboard RPC (revoke anon, add admin check).
3. Replace the analytics SELECT policies.
4. Drop the misnamed form_submissions / newsletter_subscribers policies, revoke from anon/authenticated.
5. Add the `sessions` lookup RPC and revoke direct SELECT.
6. Add `Authenticated select` policies on conductor tables that are scoped to teacher-owned rows.

---

## Admin Route Review

- **/admin (legacy):** Bundle-extractable PIN, session-storage bypass, dashboard renders without server-side gate. **Delete or hard-redirect** (C3).
- **/admin/insights (current "real" admin):** Client-only allow-list + anon-callable RPCs. **Lock the RPCs server-side** (C2). The page itself is fine as a viewing surface once the data layer is correct.
- **Next.js /admin (in `platform/`):** Properly server-gated via `requireAdmin()` in `(admin)/layout.tsx` + middleware. **Deploy it.** Not currently in production despite what the legacy banner suggests.

---

## Public Route Review

| Route | Behaviour | Notes |
|---|---|---|
| `/` | Vite SPA, public | Calls `landing_public_proof` (OK) |
| `/play`, `/onboarding` | Vite SPA, public | Camera-gated |
| `/transparency` | Vite SPA, public | Renders `dashboard_transparency_report` — verify it's k-anonymised per its docstring (it claims to be) |
| `/class`, `/join` | Vite SPA, public | OAuth-protected for the teacher console; student join is anon — see C1 |
| `/teach/observe` | Vite SPA, public route | Should be gated to teachers; current source pulls observation data |
| `/admin`, `/admin/insights` | Vite SPA, public route, client-gated | See C3, C2 |
| `/.env`, `/.env.example` | SPA index.html (Vercel rewrite catches all) | Not a leak. Tighten rewrite for cleanliness (L10) |

---

## API Endpoint Review

| Endpoint | Auth | Notes |
|---|---|---|
| `https://fmrsfjxwswzhvicylaph.supabase.co/rest/v1/*` | anon JWT + (optional) user JWT | RLS is the only gate (see RLS table) |
| `…/rest/v1/rpc/dashboard_*` | anon-callable | Tighten (C2) |
| `…/rest/v1/rpc/class_*` | authenticated, asserts `auth.uid()=teacher_id` | OK |
| `https://app.drawintheair.com/api/form-submission` | Public (no auth, no rate limit visible) | Add rate limit; verify it uses service-role (M1) |
| `https://app.drawintheair.com/api/errors/report` | Public, rate-limited 10/min/IP | OK shape; only deployed if Next.js platform is live |
| `https://app.drawintheair.com/api/insights/generate` | Bearer JWT verified server-side | OK |
| `https://app.drawintheair.com/api/auth/join-school` | Cookie session | OK |
| `https://app.drawintheair.com/api/stripe/*` | Stripe webhook signature / authenticated | Not audited in depth — review webhook signature verification before launch |
| Google Apps Script (`VITE_SHEETS_ENDPOINT`) | Bundle-known PIN in POST body | Reduce reliance, prefer Next.js endpoint |
| `/api/og` (Vercel edge) | Public | OK |

---

## Data Privacy Review

- **Children:** No identifiable data captured by the SPA (no names, faces, voice). Class Mode collects "first name + 4-digit code"; first name is treated as ephemeral session data. Verify it is never written to `analytics_events.meta` or `learning_attempts` — spot-checking the analytics module shows it's not, but a code search for `name` going into `logEvent` should be added to CI.
- **Teachers / parents:** Real names, work emails, school names, roles, free-text messages flow through `form_submissions`. With C4 unfixed, this is world-readable as soon as data arrives.
- **Devices:** `device_id` (per-browser pseudonym) is used throughout the LIOS pipeline. Treat as personal data under GDPR (it's at least an online identifier). Document retention; current `analytics_events` claims 12-month retention "in a later phase" — the cron migration `20260519_lios_pipeline_cron*.sql` exists, verify it actually deletes old rows.
- **Cross-border:** Supabase project region must be in `/privacy` and `/cookies` pages; verify the current text matches.
- **K-anonymisation:** `dashboard_transparency_report` is documented as k-anon, but the implementation should be audited (look for `count(*) >= k` thresholds and floor-to-bin behaviours).

---

## Recommended Security Roadmap

### Ship today (≤1 day)

1. **Delete `/admin`** (C3). Redirect to `/admin/insights` (or 404 if you don't want to advertise it).
2. **Migration: lock `sessions` SELECT** (C1). Add `session_lookup_by_code` RPC; revoke direct SELECT from anon.
3. **Migration: fix `form_submissions` / `newsletter_subscribers` RLS** (C4). Revoke from anon/authenticated; rely on service-role for writes.
4. **Migration: revoke dashboard RPCs from anon** (C2). Add `_is_admin()` check inside every dashboard_* function.
5. **Strip client-side ALLOWED_ADMINS email** from the bundle (H7).

### This week (≤1 week)

6. **Migration: replace `analytics_events` / `learning_attempts` `USING (true)` SELECT policies** with `_is_admin()` (H1). Same for LIOS observation/anomaly tables.
7. **Migration: harden `lios_record_observation`** to authenticated only + observer check (H4).
8. **Replace `cdn.tailwindcss.com` with a build-time Tailwind compile** and drop `'unsafe-eval'` / `'unsafe-inline'` from CSP (H3, M8).
9. **Add per-IP rate limit + payload validation** to `analytics_events` insert path (M5) and to `session_lookup_by_code` (H5).
10. **Move Supabase session out of localStorage** to a cookie-backed store via `@supabase/ssr` (H2). Migrate the SPA to use the same store the Next.js platform uses.
11. **Deploy the Next.js platform to a real origin** (`app.drawintheair.com`) and point `/admin` traffic to it via a Vercel redirect (M2).

### Longer term (next 30 days)

12. **Move all admin reads behind the Next.js platform** so anon never sees a token that can query analytics RPCs. The Vite SPA keeps the anon key only for landing proof and Class Mode.
13. **Adopt Supabase PKCE OAuth flow** and add every post-auth path to the redirect allow-list (H6). Retire the hash-token handler.
14. **Add Postgres-side observability** (`pg_stat_statements`, slow-query alerts) so anon-DoS shows up early.
15. **CI security gates:** ESLint security plugin (L8), a check that no `*.env*` is in the bundle, a check that no RPC granted to anon is named `dashboard_*` except the documented public ones, a header check that `Content-Security-Policy` ships without `unsafe-*`.
16. **Quarterly RLS audit** scripted as `pg_dump -s public.* | grep POLICY` + a Python diff against an allow-list of expected policies.
17. **Pen test before broad school rollout.** Specifically test classroom-join flows for hostile-student abuse, and the observation pipeline for content injection.

---

## Immediate Fixes to Ship Today

Concrete, minimal diffs:

**a) `src/main.tsx` — kill legacy /admin route**

```diff
- import { Admin } from './pages/Admin.tsx'
  …
- if (path === '/admin') return 'admin';
+ // Legacy PIN dashboard removed; redirect to the real admin surface.
+ if (path === '/admin') return 'admin-insights';
…
- if (route === 'admin') {
-   return <Admin />;
- }
```

Delete `src/pages/Admin.tsx`, `src/pages/admin.css`, `src/lib/formSubmission`'s `getStoredSubmissions` if it's only used by `Admin.tsx`.

**b) New migration `platform/supabase/migrations/20260521_security_lockdown.sql`** (paraphrased — write per actual function signatures):

```sql
-- _is_admin helper
CREATE OR REPLACE FUNCTION public._is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_admin FROM public.teachers WHERE id = auth.uid()), false)
$$;
REVOKE ALL ON FUNCTION public._is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._is_admin() TO authenticated;

-- Lock dashboard RPCs (repeat for every dashboard_* and lios_*)
DO $$
DECLARE fn text;
BEGIN
  FOR fn IN
    SELECT p.proname || '(' || pg_catalog.pg_get_function_identity_arguments(p.oid) || ')'
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND (p.proname LIKE 'dashboard_%' OR p.proname LIKE 'lios_%')
      AND p.proname NOT IN ('dashboard_public_proof', 'landing_public_proof')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM anon', fn);
  END LOOP;
END $$;

-- Tighten analytics_events SELECT
DROP POLICY IF EXISTS "Authenticated select analytics events" ON public.analytics_events;
CREATE POLICY "Admins select analytics events" ON public.analytics_events
  FOR SELECT TO authenticated USING (public._is_admin());

-- Lock form_submissions / newsletter_subscribers
DROP POLICY IF EXISTS "Service role can insert form submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Service role can read form submissions"   ON public.form_submissions;
DROP POLICY IF EXISTS "Service role can insert subscribers"      ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Service role can read subscribers"        ON public.newsletter_subscribers;
ALTER TABLE public.form_submissions       FORCE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.form_submissions       FROM anon, authenticated;
REVOKE ALL ON public.newsletter_subscribers FROM anon, authenticated;

-- Lock sessions
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions FORCE ROW LEVEL SECURITY;
REVOKE SELECT ON public.sessions FROM anon;
CREATE POLICY "Teacher reads own sessions" ON public.sessions
  FOR SELECT TO authenticated USING (teacher_id = auth.uid());
CREATE OR REPLACE FUNCTION public.session_lookup_by_code(in_code text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF in_code !~ '^\d{4}$' THEN RETURN NULL; END IF;
  SELECT id, activity, class_state, timer_seconds, max_students
    INTO r FROM public.sessions
    WHERE code = in_code AND status <> 'ended' AND class_state <> 'ended'
    LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN to_jsonb(r);
END $$;
GRANT EXECUTE ON FUNCTION public.session_lookup_by_code(text) TO anon, authenticated;
```

**c) `src/pages/classmode/StudentJoin.tsx` — use the RPC, not direct table SELECT**

```diff
- const { data, error: fetchErr } = await dbSelect<SessionRow[]>(
-   'sessions',
-   `code=eq.${code}&status=neq.ended&limit=1`
- );
- if (fetchErr || !data || data.length === 0) {
-   setError('No active session found with that code');
-   return;
- }
- setSession(data[0]);
+ const res = await fetch(`${supabaseUrl}/rest/v1/rpc/session_lookup_by_code`, {
+   method: 'POST',
+   headers: { apikey: anon, 'Content-Type': 'application/json' },
+   body: JSON.stringify({ in_code: code }),
+ });
+ const data = await res.json();
+ if (!data) { setError('No active session found with that code'); return; }
+ setSession(data);
```

**d) `src/pages/admin/InsightsDashboard.tsx` — remove the bundled allow-list email**

```diff
- const ALLOWED_ADMINS = new Set<string>([
-     'mrjustinukaegbu@gmail.com',
- ]);
…
- if (!ALLOWED_ADMINS.has((user.email ?? '').toLowerCase())) {
-     return <NotAllowed email={user.email ?? '(unknown)'} onSignOut={signOut} />;
- }
+ // Admin gate enforced server-side by _is_admin() inside every dashboard RPC.
+ // The component renders the shell once auth is present; failed RPCs surface
+ // as per-tab errors. UI affordance only — never trust this for security.
```

These five edits + one migration take the system from "trivially scraped" to "must steal an admin Google session" for the dashboard data, and remove the misleading legacy admin entirely.

---

## End

Anything in this report that you'd like converted into PRs or migrations directly, say the word.
