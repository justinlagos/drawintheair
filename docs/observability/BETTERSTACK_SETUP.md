# BetterStack — Uptime monitoring setup

This is the setup runbook for the uptime + SSL + status-page layer of
Draw in the Air's observability stack. It pairs with
[`config/betterstack.monitors.json`](../../config/betterstack.monitors.json),
which is the declarative source of truth for what we monitor.

BetterStack is the **third layer** in the observability stack:

| Layer | Tool | What it owns |
|-------|------|--------------|
| 1 | **Sentry** | Frontend crashes — JS errors, React render errors, MediaPipe failures, Supabase RPC failures. |
| 2 | **PostHog** | Product behaviour — funnels, cohorts, drop-offs. |
| 3 | **BetterStack** | **Is the site up? Are the routes alive? Is SSL valid? Did the last deploy break a critical path?** |
| 4 | **In-app System Health panel** | `/admin/insights` → "System Health" — live counters from the current admin tab. |

## What it covers

Every monitor in `betterstack.monitors.json` answers one of the
success-criteria questions from the brief:

| Brief question | Monitor that answers it |
|----------------|--------------------------|
| Is the site currently up? | "Marketing — Homepage", "Play — Activation surface" |
| Did the latest deployment break a critical route? | All P1 monitors flip red within 1–2 minutes of a bad deploy |
| Are SSL certificates healthy? | SSL monitor on `drawintheair.com` (alerts 14 days before expiry) |
| Are 5xx responses increasing? | Native BetterStack response-status filtering |
| Is response time degraded? | `alert_on_response_time_above_ms` per monitor |
| Are Supabase RPCs reachable? | "Supabase health — public proof RPC" |
| Are public asset bundles loading? | "Main JS bundle reachable" |

## Setup — step by step

### 1. Create the BetterStack account and team

1. Sign up at <https://betterstack.com/uptime>.
2. Create a team named **Draw in the Air**.
3. Add yourself as Owner. Invite any co-on-call humans as Members.

### 2. Configure notification channels

1. **Settings → On-call → Add channel.**
2. Create at minimum:
   - `email:on-call` → routes to `oncall@drawintheair.com` or your real on-call inbox.
   - *(Later)* `slack:#alerts` or `discord:#alerts` — leave these
     un-configured for now; the JSON references `email:on-call` only.
3. Set the **escalation policy** to: first alert immediately, repeat
   after 10 minutes if unacknowledged, escalate to the team after 30.

### 3. Create the monitors

For each entry in `config/betterstack.monitors.json` → `monitors`:

1. **Monitors → New monitor.**
2. **URL or IP**: copy `url` from the JSON. Replace `${SUPABASE_PROJECT_REF}`
   and `${SUPABASE_ANON_KEY}` with the real values for the Supabase RPC monitor
   (the anon key is the public-bundle key — safe to paste here).
3. **HTTP method**: `method` from JSON.
4. **Headers / body**: copy from JSON where present.
5. **Expected status codes**: paste the array.
6. **Keyword present**: for the Homepage monitor, set to `Draw in the Air`.
7. **Request timeout**: `30s` (from `defaults`).
8. **Check frequency**: every `60s` (from `defaults`).
9. **Recovery + confirmation periods**: `180s` / `120s`.
10. **Notification channel**: `email:on-call`.
11. **Regions**: enable EU, US, and Asia.

### 4. Create the SSL monitor

1. **Monitors → New SSL monitor.**
2. **Domain**: `drawintheair.com`.
3. **Alert me X days before expiry**: `14`.
4. **Notification channel**: `email:on-call`.

### 5. Create the status page (private)

1. **Status pages → New status page.**
2. Name: `Draw in the Air — Status`.
3. Subdomain: `status.drawintheair.com`.
4. Include the four monitors listed under `status_pages[0].monitors_included` in the JSON.
5. Visibility: **Private** for now.

### 6. Verify

After ~3 minutes you should see:
- All monitors green.
- A test alert by intentionally pausing one monitor — confirms the email arrives.
- The SSL monitor reports the current cert + days remaining.

### 7. Wire the in-app link

The System Health tab in `/admin/insights` shows an **"Open BetterStack ↗"**
button. Edit `src/pages/admin/insights/tabs/SystemHealthTab.tsx` and
update `uptimeUrl` to the real status-page URL once you have it.

## Alert thresholds — calibration

- **P1** (homepage, play, class, Supabase RPC, main bundle):
  alert after 2 consecutive failures (~2 minutes).
- **P2** (admin-insights, transparency, SSL):
  alert after 3 consecutive failures (~3 minutes).
- **P3** (for-teachers and similar growth pages):
  alert after 5 consecutive failures (~5 minutes).
- **Response-time alerts**: only on P1; the threshold per monitor is
  in the JSON. Tune downward as the app gets faster.

## Maintenance windows

Before any deploy that you expect to flap:
1. **Monitors → Bulk actions → Pause** for the affected routes.
2. Deploy.
3. Resume monitors after the smoke test passes.

## Verification checklist

After initial setup:

- [ ] All P1 monitors green.
- [ ] All P2 monitors green.
- [ ] All P3 monitors green.
- [ ] SSL monitor reports cert valid > 30 days.
- [ ] Test alert reached `oncall@drawintheair.com`.
- [ ] Status page accessible at `status.drawintheair.com` (private).
- [ ] `SystemHealthTab.tsx` link updated to the real status-page URL.
- [ ] On-call escalation policy reviewed by team.
