# WP2B.2 evidence: lead capture (DIA-013)

Branch `wp/2b2`. Date 2026-09-07.

## Problem

`src/lib/formSubmission.ts` defaulted every marketing form (school pack, school pilot,
parent trial, pilot list, contact, feedback) to
`https://app.drawintheair.com/api/form-submission`. That route lived on the retired
platform project (`drawintheair-m34j`), which now serves a stale static build with no
API routes, so the POST 404s. The client then reported `success: true, method: 'local_only'`
and every form showed "Thank you, we'll be in touch" while the lead sat only in the
visitor's own localStorage. Leads were lost silently.

## What changed

### New: Supabase edge function `lead-capture`
`supabase/functions/lead-capture/index.ts` plus `validate.ts` (pure rules, unit tested).

- CORS allow-list: `https://drawintheair.com`, `https://www.drawintheair.com`,
  Vercel previews matching `https://drawintheair(-*)?.vercel.app`, localhost dev ports.
  `app.drawintheair.com` is deliberately not allowed.
- Validation: form type whitelist (the same seven types as before), email shape,
  length caps (200 short fields, 4000 message, 40 metadata keys of 1000 chars),
  requires an email or a message, honeypot field `website` (filled means silent 200,
  nothing stored).
- Rate limit: 5 submissions per hashed IP per hour through the service-role-only RPC
  `lead_capture_rate_check`. IP is HMAC-SHA256 hashed with the service role key; the
  raw IP is never stored.
- Storage: inserts into the existing `public.form_submissions` table with the service
  role. Feedback rows are stamped `founder_notified_at` at insert so they are stored but
  never emailed.
- Responses: 200 only after the row is stored; 400 with a reason, 429 on rate limit,
  403 on a bad origin, 503 when the DB or config is unavailable.

### Changed: `email-dispatch` gains step 4 (founder notification)
Every 15 minutes (existing cron `email-dispatch-15m`) it selects up to 50 rows from
`form_submissions` where `founder_notified_at is null and form_type <> 'feedback'`,
emails each to `LEAD_NOTIFY_TO` (default `partnership@drawintheair.com`) via the existing
Resend sender, and stamps `founder_notified_at`. Failed sends are retried next run.
Response JSON now also reports `leads` and `leadsFailed`.

This is how the repo already "enqueues" email: there is no queue table, the cron scans
for unstamped rows. The lead path reuses that pattern rather than inventing a second one.

### Migration `supabase/migrations/20260907130000_wp2b_2_lead_capture.sql` (NOT applied)
Read-only check of production on 2026-09-07 (information_schema, `SELECT` only):
`public.form_submissions` exists with 2 rows (latest 2026-05-21), RLS on, policies
`Service role can insert form submissions` (INSERT, WITH CHECK true, for every role)
and `admin_read_form_submissions` (SELECT, admin only). Table privileges were granted to
`anon` and `authenticated` in full, so the anon key could insert straight into the table.

The migration:
1. `create table if not exists` with the production shape (no-op in prod).
2. Adds `founder_notified_at timestamptz` and a partial index for the pending scan.
3. Drops the public insert policy, adds `form_submissions_insert_service_role`
   (INSERT to `service_role` only), revokes all from `anon`/`authenticated`, re-grants
   SELECT to `authenticated` so the admin read policy still works.
4. Adds `public.lead_rate_limits` (RLS on, no grants) and
   `public.lead_capture_rate_check(text, integer, integer)` (security definer, EXECUTE
   only for `service_role`).

Rollback SQL is in the migration header. All steps are reversible; no data is destroyed.

### Client `src/lib/formSubmission.ts`
- Tier 1 URL is now `${VITE_SUPABASE_URL}/functions/v1/lead-capture` with `apikey` and
  `Authorization: Bearer <anon>` headers. `VITE_FORM_ENDPOINT` is no longer read, so a
  stale value in Vercel cannot point forms back at the dead host.
- `success` is true only when a remote endpoint accepted the submission. `local_only`
  now returns `success: false` with a plain-English `error`. 400 and 429 from
  lead-capture are final (no legacy retry, reason surfaced); 5xx or network failure still
  falls through to `VITE_SHEETS_ENDPOINT` and `VITE_LEADS_ENDPOINT` if configured.
- `SUBMISSION_FAILED_MESSAGE` exported for the UI.

### Forms updated to show failure honestly
`ForSchools.tsx`, `PilotCallout.tsx`, `FeedbackWidget.tsx`, `pages/Schools.tsx`,
`pages/ParentAccess.tsx`, `pages/SchoolPilot.tsx`: each checks `result.success`, shows
the error in a `role="alert"` block on failure, and only shows the thank-you state on
success. Two places that set "submitted" inside `catch` (ParentAccess, SchoolPilot,
FeedbackWidget) no longer do. Buttons disable while sending. `pages/Schools.tsx` is
now a real `<form>` so Enter submits from any field. Aria labels added where inputs had
only placeholders.

In-game micro-surveys (`src/features/feedback/*`) still call `submitFeedback`, which
returns `{ ok: res.success }`; they ignore the flag as before and also log to
`analytics_events`, so child gameplay is unaffected.

### Other
- `.env.example`: removed `VITE_FORM_ENDPOINT`, documented the new path.
- Tests: `tests/formSubmission.test.ts` (11) and `tests/lead-capture.test.ts` (10).

## Verification

Run on `wp/2b2` after `npm ci`:

| Check | Result |
|---|---|
| `npm run type-check` | pass |
| `npm run lint` | 0 errors, 162 warnings (ratchet unchanged) |
| `npm test` | 28 files, 277 tests pass (21 new) |
| `npm run build` | pass (prebuild env-safety, CSP, type-check; SSR prerender 26 + 93 routes) |

Not verified here: the Deno function was not executed (no Deno runtime in this
environment). The pure rules are unit tested through `validate.ts`; the handler is
straight-line code over the same supabase-js client the other functions use.

CSP: the function is on `https://fmrsfjxwswzhvicylaph.supabase.co`, already in
`connect-src`, so no CSP change was needed for the new path. `check-csp.mjs` still
requires `https://script.google.com` for the legacy sheets fallback; left as is.

## Founder steps (by hand)

Do these in order, on staging first, then production, after WP2B.2 merges.

1. Apply migration `20260907130000_wp2b_2_lead_capture.sql` (staging rehearsal, dry-run
   counts, written go, apply, verify). Verify afterwards:
   `select count(*) from public.form_submissions;` (unchanged),
   `select polname from pg_policy where polrelid='public.form_submissions'::regclass;`
   (expect `admin_read_form_submissions`, `form_submissions_insert_service_role`).
2. Deploy the functions: `supabase functions deploy lead-capture` and
   `supabase functions deploy email-dispatch` (both default JWT verification; the
   client sends the anon JWT).
3. Optional secret: `LEAD_NOTIFY_TO` on the Supabase project if the founder inbox is not
   `partnership@drawintheair.com`. `RESEND_API_KEY` must already be set (it is, for
   email-dispatch).
4. Vercel project `drawintheair`: delete the `VITE_FORM_ENDPOINT` environment variable if
   present (it is no longer read; removing avoids confusion). Confirm
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set for Production and Preview.
5. After the Gate 3 deploy, one controlled test submission from
   https://drawintheair.com/schools with a real address. Expect: the page shows the
   thank-you state, one new row in `form_submissions`, and within 15 minutes one
   "New lead: School pack request" email to the founder inbox. Delete the test row
   afterwards.

## Rollback

- Code: revert the WP2B.2 commit. Forms go back to the old behaviour (dead endpoint,
  fake success), so only do this together with a working alternative endpoint.
- Database: run the rollback block in the migration header.
- Functions: `supabase functions delete lead-capture`; redeploy the previous
  `email-dispatch` (its step 4 is harmless without the column only because the select
  fails softly; still redeploy for cleanliness).
