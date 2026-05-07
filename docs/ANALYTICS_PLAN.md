# Analytics & Insight — Audit + Plan

**Status:** Investigation complete · Plan awaiting approval before execution.

## What's currently in place (audit)

You have **three independent analytics systems** wired up, and they
overlap, conflict, and drop data in different places. None of them
gives you a single dashboard you can open in 30 seconds to see
"what's working."

### 1. `src/lib/analytics.ts` — custom event tracker
- Defines 30+ event names (`landing_view`, `mode_start`, `wordsearch_word_found`, `camera_permission_denied`, etc.)
- Generates session IDs in `sessionStorage`
- 15-second heartbeat ping
- Captures viewport, device type, browser+version, UTM params, referrer
- **Posts events to `/api/track`** — but **that endpoint does not exist** in the Vite build. There's no `api/track.ts` anywhere. Events queue, try to flush, silently 404, and fall back to `sessionStorage` (capped at 1000 events). They never leave the browser.
- Auto-instantiated on import. Globally exposed as `window.analytics`.
- **Dead in production.** No data is being captured today.

### 2. `src/lib/pilotAnalytics.ts` — Google Sheets backend
- Different event vocabulary: `session_started`, `game_selected`, `stage_started`, `item_grabbed`, `item_dropped`, `stage_completed`, `session_ended`
- Posts to `VITE_SHEETS_ENDPOINT` (a Google Apps Script) as GET with `?data=...` (because GAS drops POST bodies on redirect)
- localStorage queue with retry + exponential backoff
- Triggered explicitly by `App.tsx` and `TryFreeModal` and 4 game-mode files
- Captures age band, school code, class code, device type, build version
- **This one actually works** — but only if `VITE_SHEETS_ENDPOINT` is set, and the data lives in a Google Sheet, which is not queryable from the app. It's read-only by you.

### 3. `gtag` + Microsoft Clarity in `index.html`
- Google Analytics 4 (`G-S4XSWT6Q09`) — pageviews + automatic events
- Microsoft Clarity (`vseevw9uck`) — session recordings + heatmaps
- Both work. Both are in 3rd-party dashboards (analytics.google.com, clarity.microsoft.com). Neither is wired to product events.
- GA4 sees pageviews of `/`, `/play`, `/schools`, etc. but doesn't see "child completed Tracing letter B at 4-5 age band."

### 4. Supabase tables
- `form_submissions` — pilot pack requests, feedback widget, school-pilot form
- `newsletter_subscribers` — email captures
- `sessions` (Class Mode) — teacher-created class sessions with code, activity, status, round, timer
- `session_students` (Class Mode) — student-name + score per session
- All RLS-enabled. Class Mode session data IS captured. Form submissions ARE captured.

### What this means in practice

| Question you'd want to answer | Where the data lives | Can you actually see it? |
|---|---|---|
| How many people land on `/`? | GA4 | Yes — GA4 dashboard |
| How many click Try Free? | GA4 (via `gtag('event','demo_try_click')`) | Sort of — buried |
| What % of Try-Free clicks complete the wave gate? | Nowhere | **No** |
| What activity do kids pick most? | pilotAnalytics → Google Sheets | Only if you have the sheet |
| How long is an average session? | pilotAnalytics → Google Sheets | Same |
| What % of sessions reach 'first stage complete'? | Mixed: pilotAnalytics has `stage_completed`, but the activation funnel isn't drawn anywhere | **No** |
| Hand tracking init failure rate by browser/device? | Not tracked at all | **No** |
| Which schools are running pilot sessions today? | Supabase `sessions` table | If you query the DB |
| Average session length by age band? | pilotAnalytics → Google Sheets | If you build a pivot table |
| Clarity heatmap of the wave screen | clarity.microsoft.com | Yes |
| Conversion of school-pilot form viewers → submissions | Nowhere | **No** |

You have a lot of *data flowing*, but no *dashboard you can open*. Five
of the most product-critical questions can't be answered today without
manual SQL or pivot tables.

## What I recommend (plan, no code yet)

Don't add a fourth analytics system. **Consolidate to one source of truth in Supabase**, kill the dead `/api/track` path, repurpose `analytics.ts` to write to Supabase directly, and build a small admin dashboard you can open in 30 seconds.

### Phase 1 — Single source of truth (1-2 days work)

**1.1 New Supabase table: `analytics_events`**

```
CREATE TABLE public.analytics_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL,
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  event_name      text NOT NULL,
  page            text,
  age_band        text,        -- '4-5' | '6-7' | …
  school_id       text,        -- if known
  class_id        text,
  game_mode       text,
  stage_id        text,
  build_version   text,
  device_type     text,        -- 'desktop' | 'tablet' | 'mobile' | 'tv'
  browser         text,
  browser_version text,
  viewport_w      int,
  viewport_h      int,
  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  referrer        text,
  meta            jsonb,       -- everything else: scores, errors, durations
  -- Anonymous, no personal data
);

CREATE INDEX ON analytics_events (occurred_at DESC);
CREATE INDEX ON analytics_events (session_id);
CREATE INDEX ON analytics_events (event_name, occurred_at DESC);
CREATE INDEX ON analytics_events (game_mode, occurred_at DESC);
```

RLS: `INSERT` allowed for anyone with the publishable key (rate-limited at the edge). `SELECT` allowed only for `auth.uid() in admin_users`.

**1.2 New Supabase Edge Function: `/functions/v1/track`**

A tiny function that accepts `POST` with a batch of events, validates shape, does basic rate-limiting (max 100 events/session/min), inserts to `analytics_events`. Replaces the dead `/api/track` endpoint.

**1.3 Repoint `analytics.ts`** to flush to that Supabase function instead of `/api/track`. Keep its existing event vocabulary but merge the pilotAnalytics events into the same flow. Single place to add events, single table to query.

**1.4 Sunset `pilotAnalytics.ts`**. Migrate the seven events it owns into the unified system. Keep the Google Sheets endpoint as a write-only mirror for one release cycle if you want a paper trail, then remove it.

This consolidation alone fixes the silent-data-loss bug (events going to a 404).

### Phase 2 — Track what actually matters (1 day)

The events that exist today are mostly UI-touch events. The events you *need* to make product decisions are **funnel** and **error** events.

**Activation funnel (every kid):**
- `landing_view` (already exists)
- `try_free_clicked` — TryFreeModal opens
- `age_band_selected` — age picker submitted
- `camera_requested` — getUserMedia called
- `camera_granted` / `camera_denied` — outcome
- `tracker_init_started` — handTracker.initialize() invoked
- `tracker_init_succeeded` — with `delegate=GPU|CPU`, `init_duration_ms`
- `tracker_init_failed` — with error code (CRITICAL: lets you see CSP-style regressions in 5 minutes instead of 3 days)
- `wave_screen_shown`
- `wave_first_hand_seen` — at least one MediaPipe landmark detected
- `wave_completed` — gate cleared, going to menu
- `mode_selected` — with `game_mode`
- `first_play_completed` — first stage finished in any mode

This funnel is your product. Every event has `session_id` so you can count drop-off at each step.

**Quality + reliability:**
- `tracker_delegate_used` — GPU vs CPU per session
- `vision_fps_average` — emitted at session end, average detection FPS
- `tracker_low_confidence_seconds` — total time `hasHand=false` while session active
- `system_error` — any uncaught exception (already in vocab, not wired)
- `csp_violation` — pre-existing browser API; just listen to `securitypolicyviolation` and forward

**Engagement:**
- `mode_started` (already)
- `mode_completed` (already as `stage_completed`)
- `mode_abandoned` — exit before completion + how far through
- `chapter_unlocked`
- `session_duration_minutes` — emitted at session end

**Conversion:**
- `school_pilot_form_viewed`
- `school_pilot_form_submitted`
- `feedback_widget_opened`
- `feedback_submitted`

### Phase 3 — The dashboard you actually open (3-4 days)

A new route, `/admin/insights`, behind your existing AuthContext (Justin's email only). Six panels, each one query, all on a single page so you can scan it like a morning paper.

| Panel | Question it answers | Query |
|---|---|---|
| **Today** | Sessions today, kids tracked, modes played | `count(*)` last 24h grouped by event_name |
| **Activation funnel** | Of N people who visit, how many activate? | step-by-step % drop from `landing_view` → `first_play_completed`, last 7d |
| **Tracker health** | What % of init attempts succeed? On what delegate? | `tracker_init_*` last 7d, grouped by `delegate` |
| **Most-played modes** | Which games pull repeat sessions? | `mode_started` count + completion rate per `game_mode`, last 30d |
| **Error stream** | What's failing right now? | last 50 `tracker_init_failed`, `system_error`, `camera_denied` events |
| **Latest sessions** | Live "is anyone playing right now?" | `session_started` events last 30 min |

Built with the same Kid-UI tokens but with a dense, dashboard-style layout (small text, more rows). Refreshes every 30 seconds.

### Phase 4 — Hands-off cron + alerts (1 day)

Two Supabase scheduled jobs:

- **Daily digest (07:00 GMT):** runs the six dashboard queries, emails Justin a one-page summary.
- **Anomaly alert (every 15 min):** checks `tracker_init_failed` rate over last 30min vs last 24h baseline. If failure rate spikes 5x, sends Justin an email with the latest error message and user-agent.

This is the "hands-off" piece — you don't need to remember to check the dashboard. The digest tells you what's healthy. The alert tells you when something breaks (which is exactly the system that would have caught the CSP regression 3 days early).

### Phase 5 — Privacy + compliance (half a day)

You're collecting anonymous telemetry from kids, so we have to be tight:

- **No PII fields.** No names (kids type a first name in Class Mode — keep that scoped to Class Mode tables; never copy to `analytics_events`). No emails. No camera frames.
- **Update `Privacy.tsx`** to reflect what's actually collected (the new event list).
- **Cookie consent** — UK/EU users need it. Currently you have GA4 + Clarity firing without consent. Add a banner that gates GA4 + Clarity until consented; first-party Supabase analytics are essential and don't need consent under UK GDPR (legitimate interest).
- **Data retention:** auto-delete `analytics_events` rows older than 12 months via a Supabase cron job.

## Strategic ordering

1. **Phase 1 first** (Supabase backend + repointing). Without this nothing else works.
2. **Phase 2 next** (real funnel events). This is what makes the dashboard meaningful.
3. **Phase 3 dashboard** (the visible product) — you open this every morning.
4. **Phase 4 cron + alerts** (the compounding piece — once it's there, you never check the dashboard for routine health, only when the alert fires).
5. **Phase 5 privacy** in parallel with Phase 1, before Phase 4 emails go out.

## Total work estimate

- Phase 1: 1-2 days (Edge Function + table + repointing)
- Phase 2: 1 day (event instrumentation across files)
- Phase 3: 3-4 days (admin dashboard with queries)
- Phase 4: 1 day (cron + email digest)
- Phase 5: ½ day (privacy doc + cookie banner)

**Total: ~7 working days of focused work** to get from "three half-broken systems" to "open one URL each morning, see the whole platform's pulse."

## Three questions before I execute

1. **OK to delete the dead `/api/track` path and consolidate everything to Supabase?** This means dropping the half-implemented custom analytics and building one clean pipeline. No data is being lost — that endpoint never worked.

2. **Keep the Google Sheets pilotAnalytics for backwards compat (one release), or cut it cleanly now?** Cutting cleanly is simpler; mirror writes for one release means you don't lose continuity if a school is mid-pilot.

3. **Email digest preference — daily, weekly, or only-when-anomaly?** I'd default to daily 07:00 GMT + anomaly alerts. You can mute the daily once you trust the system.

Approve those three and I'll start Phase 1 in the next session. The roadmap is written — execution from here is mechanical.
