# Observability — Draw in the Air

> No silent crashes. No invisible drop-offs. No unknown camera failures.
> No broken classroom sessions without alerts. No guessing.

This document is the single source of truth for how Draw in the Air
observes itself in production. It explains what each layer owns, how
the layers compose, the privacy contract that binds all of them, and
how to answer the standard production questions.

## The four layers

| Layer | Tool | Owns | Lives at |
|-------|------|------|----------|
| 1 | **Sentry** | Frontend errors. JS errors, React render errors, MediaPipe / tracker failures, dynamic-import failures, asset failures, Supabase RPC failures. | `src/lib/observability/sentry.ts` |
| 2 | **PostHog** | Product behaviour. Funnels (camera grant → tracker → activity → completion), cohorts, drop-offs, building-mode interactions, classroom flows. | `src/lib/observability/posthog.ts` |
| 3 | **BetterStack** | Uptime, SSL, status page, route-level liveness. | `config/betterstack.monitors.json` + [setup guide](./BETTERSTACK_SETUP.md) |
| 4 | **In-app System Health** | Live in-tab counters for the admin dashboard. | `/admin/insights` → "System Health" tab |

The existing **LIOS analytics pipeline** (`src/lib/analytics.ts` →
Supabase `analytics_events`) is the canonical learning-intelligence
store and is **not** replaced. Everything in this doc runs alongside
LIOS. PostHog handles funnel visualisation; LIOS handles learning.

## Code layout

```
src/lib/observability/
├── index.ts        # Barrel — public API surface
├── sentry.ts       # Sentry init + captureError + setObservabilityContext
├── posthog.ts      # PostHog init + trackEvent + identifyPseudonymous
└── health.ts       # In-memory health registry powering the System Health tab

src/components/
└── ErrorBoundary.tsx  # Captures into Sentry + health, never leaks technical details to kids

src/pages/admin/insights/tabs/
└── SystemHealthTab.tsx  # The nervous-system panel

config/
└── betterstack.monitors.json

docs/observability/
├── OBSERVABILITY.md            # this file
└── BETTERSTACK_SETUP.md        # runbook
```

## Environment variables

All three observability vars are **optional**. If a key is empty the
corresponding subsystem silently no-ops — the app keeps working.

| Var | Purpose |
|-----|---------|
| `VITE_SENTRY_DSN` | Sentry project DSN. Empty = Sentry disabled. |
| `VITE_POSTHOG_KEY` | PostHog public project key. Empty = PostHog disabled. |
| `VITE_POSTHOG_HOST` | PostHog ingest host. Use the **EU host** (`https://eu.i.posthog.com`) for GDPR. |
| `VITE_APP_ENV` | `development` \| `staging` \| `production` — appears as tag in every event. |
| `VITE_APP_VERSION` | Pinned at build (commit SHA or semver) — Sentry release + PostHog property. |

See `.env.example` for the full template.

## Privacy contract

These rules are enforced **in code**, not by convention:

- **No child names.** No `firstName`, `lastName`, `studentName` field
  is ever forwarded. The Sentry `beforeSend` and PostHog allow-list
  both enforce this.
- **No raw camera footage or landmarks.** Property keys like `frame`,
  `landmarks`, `gestureSample`, `rawCoords` are on the Sentry PII denylist.
- **No PII.** Emails, phone numbers, tokens, paths are scrubbed before
  events leave the device.
- **Pseudonymous IDs only.** `deviceId` is a UUID in localStorage,
  `sessionId` is a per-tab UUID. Neither can be reversed to a person.
- **Respect Do-Not-Track.** PostHog honours `Navigator.doNotTrack`.
- **No autocapture, no session recording.** PostHog is configured to
  capture only events we explicitly fire.
- **EU residency by default.** PostHog host is set to `eu.i.posthog.com`
  unless explicitly overridden.

The full denylist lives in `src/lib/observability/sentry.ts` →
`PII_KEY_DENYLIST`, and the PostHog allow-list lives in `posthog.ts` →
`PH_EVENT_ALLOWLIST` + `PH_PROPERTY_ALLOWLIST`. **Adding a new key to
either is a privacy review.**

## Event vocabulary

PostHog receives a subset of the LIOS event vocabulary. The full LIOS
list lives in `src/lib/analytics.ts` → `EventName`. The subset
forwarded to PostHog is `PH_EVENT_ALLOWLIST` in `posthog.ts`. Adding
to the PH list is a deliberate choice — most LIOS events should stay
in LIOS only.

### Funnel events (PostHog-tracked)

- Acquisition: `landing_view`, `landing_engaged`, `cta_click`, `try_free_clicked`
- Activation: `age_band_selected`, `camera_*`, `tracker_init_*`, `wave_*`
- Mode lifecycle: `menu_opened`, `mode_*`, `stage_*`
- Friction: `stuck_detected`, `activity_retry`
- Classroom: `class_session_*`, `class_student_*`, `class_activity_*`, `classroom_sync_failure`
- Building: `build_*`, `piece_*`, `successful_snap`, `wrong_piece_attempt`
- System: `route_view`, `app_crash`, `asset_load_failed`, `dynamic_import_failed`

## How the layers compose

```
                ┌──────────────────────────────┐
   user action  │   App code / game mode       │
       │        └──────────────┬───────────────┘
       ▼                       │
 logEvent(name)  ──────────────┤
                               │
                ┌──────────────▼───────────────┐
                │  src/lib/analytics.ts (LIOS) │
                └──────────────┬───────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
  analytics_events       PostHog (subset)      health registry
   (canonical)           (funnel view)          (live counters)
                                │                      │
                                ▼                      ▼
                          PostHog dashboards     System Health tab
                                                       ▲
   captureError(err) ──► Sentry  ───────────────────► (last critical error)
   render error ──► ErrorBoundary ──► Sentry + health
```

The fan-out happens inside `logEvent` (`src/lib/analytics.ts`) — call
sites do not need to know about PostHog or the health registry.

## On-call playbook

When BetterStack alerts:

1. **Open `/admin/insights` → System Health tab.** Check the overall
   tile, last critical error, and camera/tracker rates.
2. **Open Sentry.** Filter by `environment:production` and the time
   window. The `scope` tag tells you which subsystem failed.
3. **Open PostHog.** Funnel: `camera_requested → tracker_init_succeeded
   → mode_started → mode_completed`. A new break-point shows the
   failing step.
4. **Decide severity.** If P1: notify the team. If P2/P3: file a ticket.
5. **Mitigate.** Roll back the last deploy if Sentry shows the error
   started at the deploy timestamp.

## How the success criteria are answered

> The brief asks: after implementation, I should be able to answer …

| Question | Where the answer lives |
|----------|------------------------|
| Did the app crash today? | Sentry "Issues" filter by date · System Health: totalErrors |
| Which route crashed? | Sentry tag `route` · ErrorBoundary `scope` |
| Which browser/device? | Sentry tags `browser` + `device_type` |
| Which game mode? | Sentry tag `game_mode` |
| How many users were affected? | Sentry "Users affected" column |
| Did the camera fail? | System Health: camera grant rate · PostHog funnel step `camera_granted` |
| Did the tracker fail? | System Health: tracker success rate · Sentry `scope:tracker` |
| Did a classroom session desync? | System Health: classroom sync failures · Sentry `scope:classmode` |
| Where are users dropping off? | PostHog funnels |
| Did the latest deployment introduce errors? | Sentry "Release" filter on `VITE_APP_VERSION` |
| Is the site currently up? | BetterStack status page · System Health "System status" tile |

## Maintenance

- **Adding a new LIOS event** that should also appear in PostHog:
  add the name to `PH_EVENT_ALLOWLIST` in `posthog.ts`.
- **Adding a new event property**: add the key to `PH_PROPERTY_ALLOWLIST`.
  This is a privacy review.
- **Adding a new scoped boundary**: wrap the subtree with
  `<ScopedErrorBoundary scope="...">`. Pick a scope from
  `CaptureErrorOptions['scope']` or extend the union.
- **Adding a new BetterStack monitor**: edit
  `config/betterstack.monitors.json` and add the monitor in BetterStack.
- **Pausing observability for a critical deploy**: keep
  `VITE_SENTRY_DSN` and `VITE_POSTHOG_KEY` set, but pause specific
  BetterStack monitors via Bulk Actions to suppress flapping alerts.

## Engineering rules (mirrored from the brief)

- Do not spam analytics. Do not duplicate events.
- Do not send sensitive data. Do not send raw camera information.
- Do not send child names.
- Do not break current LIOS analytics. Do not replace the
  `analytics_events` table.
- PostHog supports product analytics. LIOS remains the learning
  intelligence system. Sentry handles errors. BetterStack handles
  uptime.
