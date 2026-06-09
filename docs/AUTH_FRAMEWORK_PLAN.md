# Draw in the Air — Authentication Framework: Audit & Phased Implementation Plan

**Status:** Proposal for approval (no code or schema changed yet)
**Author:** Senior security architecture review
**Date:** 2026-06-09
**Scope decided with owner:** Audit + plan first. Act-now phases: **P1, P2, P6/P8, P7**. Deferred-but-documented: **P3 (MFA), P4 (federation hardening), P5 (passkeys), P9 (test execution)**.
**Database authority:** Owner granted production-apply rights. This plan still treats every migration as **review-then-apply** — nothing runs against the live project (`fmrsfjxwswzhvicylaph`) until the specific migration in this document is approved.

---

## 0. TL;DR — the honest starting point

The brief framed this as moving auth "from basic foundation level to mature, production-grade." After auditing the actual code and the 13 applied migrations (0004–0016), that framing is **wrong in your favour**: the system is already security-hardened and most of Phase 1–2 is shipped. This is a **gap-filling and formalisation** job, not a rebuild. Rebuilding it would be the single biggest risk to gameplay, billing, and the parent/teacher dashboards — so this plan deliberately avoids touching what already works.

What is **already done** (verified in code):

- Route consolidation — `/parent` is a redirect, `/parents` is marketing, legacy `/admin` folds into OAuth-gated `/admin/insights`. The `/parent` vs `/parents` conflict you flagged is already resolved (`src/main.tsx`).
- "No session returned by Supabase" — explicitly handled. `signUpWithEmail` decodes both GoTrue response shapes (session vs bare-user on email-confirm) and the obfuscated-duplicate case (`src/lib/supabase.ts`).
- "Email invalid" / "too many attempts" / email-send rate limits — mapped to clear, honest, child-platform-appropriate copy in `friendlyAuthError`.
- Google OAuth returns to `drawintheair.com` via the Supabase redirect allow-list, not the raw project URL (`signInWithGoogle`, allow-list configured 2026-06-04).
- Session persistence + cross-device — refresh-token exchange, single-flight refresh coalescing, 5-min-before-expiry scheduling, `ensureFreshSession()` before Stripe calls.
- RBAC primitives — `get_account_roles()`, `register_parent()`, `register_teacher()`, role-intent stashing for OAuth round-trips, recovery-link handling.
- RLS + tenant isolation — migrations 0005, 0009, 0011, 0013; `is_admin_user()`; admin RPCs assert `is_admin` server-side (migration 20260521 lockdown referenced in code).
- Child-safety data model — `child_profiles` (no email, no DOB, no photo, nickname only), `consent_records`, `parent_controls`, `data_deletion_requests`, `billing_events`. Children have **no** auth accounts by design (migration 0004).

What is **genuinely missing** (the real work):

| Area | Gap |
|---|---|
| P2 | No distinct `school_admin` / `platform_admin`. "Admin" today = `teachers.is_admin` boolean. School-scoped admin does not exist. |
| P3 | No MFA of any kind (no TOTP, no recovery codes). |
| P5 | No passkey / WebAuthn scaffolding. |
| P6 | No step-up re-auth for sensitive actions; no admin session timeout; no "sign out of all devices"; no adaptive-trust signals. |
| P6/P8 | No dedicated **security audit-log table**. `billing_events` logs Stripe only; there is no auth/security event trail. |
| P8 | Login/signup/reset pages emit **no** structured auth observability events (no funnel, no failed-login signal). |
| P7 | Consent **tables** exist but there are no enforced **version constants**, no human-readable export, and the deletion request table has no processing flow wired to it. |

The rest of this document is the plan to close those gaps safely.

---

## 1. Current architecture (as audited)

**Stack:** Vite + React 19 + a custom if-chain router in `src/main.tsx` (note: not React Router's `<Routes>` — navigation context is provided by `BrowserRouter` but page selection is the `getRouteFromPath` switch). Auth is a **dependency-free Supabase client** (`src/lib/supabase.ts`) hitting GoTrue + PostgREST over `fetch`, not `@supabase/supabase-js`. Observability via Sentry + PostHog (`src/lib/observability`).

**Auth model:** Single Supabase `auth.users` identity per email. Role is an *attribute* of the account (parent/teacher/admin), resolved by `get_account_roles()`, not a separate identity. This is the correct design for "same email, multiple roles" and should be preserved.

**Session model:** `localStorage` key `sb-session`; access token refreshed proactively; implicit OAuth flow with hash-token parsing in `handleAuthCallback`.

**Authorization:** Defence in depth — RLS on every table keyed on `auth.uid()`, admin RPCs assert `is_admin` server-side, frontend components do *advisory* gating only (`InsightsDashboard` comments explicitly state the server is the real gate). This is the right posture.

**Child safety:** Pseudonymous `child_profiles.id` is the learner identity. No child credentials, no child email, no child photo. Gameplay reaches a child profile through the authenticated parent/teacher session via `child_profile_id` foreign keys on `learning_attempts` / `lios_state`.

---

## 2. Phase-by-phase plan

Each phase below states: **Status**, **what already exists**, **the gap**, **proposed change**, **files/migrations**, **risk + rollback**, and **feature flag**. "Act-now" phases carry concrete change specs; deferred phases carry a recommendation and the safest alternative.

### PHASE 1 — Foundation hardening — *Act now (mostly verification)*

**Status: ~85% already shipped.** Remaining work is hardening, not fixing.

Already done: route de-duplication, dual-shape signup handling, friendly errors for email/rate-limit/duplicate/weak-password, OAuth domain redirect, session refresh + cross-device, recovery-link routing, internal-only `returnTo` allow-listing.

Gaps to close now:

1. **Server-side validation of `role`, `account_type`, and `consent` at signup.** Today `signUpWithEmail` sends `data.role = 'parent'` from the client and a DB trigger trusts it. A hostile client could set `role: 'admin'`. The trigger should **ignore client-supplied privileged roles** and only ever provision parent/teacher via the explicit `register_*` RPCs (which it already does for tenancy — we extend the same principle to the metadata trigger). → migration `0017` (below), defensive and idempotent.
2. **Retry-loop "too many attempts."** Confirm the cause is server-side GoTrue budget vs a frontend loop. Audit `Login.tsx`/`Signup.tsx` submit handlers for missing `disabled`-while-pending guards and add a debounce/in-flight lock where absent. Pure frontend, zero schema risk.
3. **Redirect whitelist tightening.** `signInWithGoogle` already enforces internal `/`-prefixed paths; add a single shared `isSafeInternalPath()` helper and route all three redirect sites (`signInWithGoogle`, `handleAuthCallback` return-to, recovery) through it so the rule can't drift.
4. **Error-message coverage.** Add explicit handling for `email_provider_disabled` and network-offline states (currently fall through to generic copy).

**Files:** `src/lib/supabase.ts`, `src/pages/parent/Login.tsx`, `src/pages/parent/Signup.tsx`, `src/pages/teacher/Login.tsx`, `src/pages/teacher/Signup.tsx`.
**Migration:** `0017_signup_role_hardening.sql` (trigger ignores privileged client roles).
**Risk:** Low. **Rollback:** Frontend = revert commit; migration = `create or replace` the prior trigger body (included as a down-note in the file).
**Feature flag:** Not needed — these are strict hardening with no behaviour change for legitimate users.

### PHASE 2 — RBAC — *Act now*

**Status: parent/teacher/admin shipped; school_admin & platform_admin missing.**

Today the role set is `{parent, teacher, admin}` where `admin` = `teachers.is_admin`. The brief's clean model is `{parent, teacher, school_admin, platform_admin, child_profile (non-login)}`.

Proposed model (additive, non-breaking):

- Keep `parent`, `teacher`, `child_profile` exactly as-is.
- Introduce a **`platform_admin`** concept that is **explicitly separate** from teacher. Recommendation: a dedicated `platform_admins(user_id uuid pk, granted_by, granted_at)` allow-list table rather than overloading `teachers.is_admin`. `is_admin_user()` is updated to check **either** the legacy flag (back-compat) **or** the new table, so nothing currently working breaks. New grants go only to the table; the legacy flag is frozen and migrated out later.
- Introduce **`school_admin`** as a **tenant role**, not a global one. You already have `tenants` + `tenant_members` (migration 0013). Add `tenant_members.role text not null default 'member'` with `('owner','school_admin','member')`, and RLS helper `is_school_admin(tenant_id)`. A school admin sees only their tenant — enforced by the existing tenant-scoped RLS plus the new role check.
- `get_account_roles()` extended to return `school_admin` and `platform_admin` booleans alongside the current three. The frontend role switcher (already plumbed via `setRoleIntent`/`consumeRoleIntent`) gains the two new entries.

**Enforcement both sides:** backend via RLS + RPC `is_admin`/`is_school_admin` assertions; frontend via `getAccountRoles()` advisory gates (unchanged pattern). Children remain non-login — no change.

**Files:** `src/lib/supabase.ts` (`AccountRoles` type + `getAccountRoles`), role-switcher UI in the relevant dashboard shells.
**Migrations:** `0018_platform_admins.sql`, `0019_school_admin_role.sql` (each explained in §3).
**Risk:** Medium (touches `is_admin_user` and RLS). **Mitigation:** `is_admin_user` becomes a strict superset (legacy OR new) so no current admin loses access; ship behind flag and verify with the RLS test harness (`supabase/migrations/tests/parent_rls_test.sql` pattern) before flipping.
**Feature flag:** `rbac_v2_roles` (gates the new role-switcher UI + school-admin views; the DB superset is safe unflagged).

### PHASE 3 — MFA & account protection — *Deferred; documented (admin MFA recommended next)*

**Gap: no MFA at all.** Supabase GoTrue **does** support TOTP MFA natively (enroll/challenge/verify endpoints + AAL levels). SMS is available but the brief correctly says avoid it — we will not use SMS.

**Recommended sequencing (next milestone after act-now phases):**

- **TOTP via GoTrue MFA API** — enroll (`/auth/v1/factors`), challenge, verify; store nothing extra ourselves (GoTrue holds the factor). Add thin wrappers in `supabase.ts` mirroring the existing fetch style.
- **Backup/recovery codes** — GoTrue does not natively issue one-time backup codes for TOTP. Safest alternative: store **hashed** (bcrypt/argon2) single-use codes in a new `mfa_recovery_codes` table, service-role-write, RLS deny-all to clients, verified via an Edge Function. Documented limitation: this is app-managed, not GoTrue-managed.
- **Policy:** required for `platform_admin` (block dashboard RPCs at AAL1 for admins), recommended (nudge, not gate) for teachers/school_admin, optional for parents at first.
- **Enforcement** uses GoTrue's AAL claim: admin RPCs additionally assert `auth.jwt()->>'aal' = 'aal2'`.

**Why deferred:** requires GoTrue MFA to be enabled on the project (config change), recovery-code UX decisions, and careful admin lockout-prevention (a break-glass path). These are owner decisions, not safe to assume. **Limitation to record:** enabling MFA enrolment is a project-level Supabase Auth setting; the code can be staged but the toggle is yours.

### PHASE 4 — Federated login — *Mostly done; hardening deferred*

Already correct: single-identity-per-email, role-as-attribute, `returnTo` allow-listing, role-intent for OAuth, no random admin→teacher redirects (callback honours stashed path then role).

Remaining (low-risk, fold into P1/P2 commits where cheap):
- Audit the Supabase **callback URL allow-list** and **remove any `localhost` entries** from the production project (config task — I can enumerate current values read-only and list exactly what to delete; the deletion is a console action you approve).
- OAuth consent screen branding (Google Cloud console: app name, domain, logo) — documented as a console checklist, not code.
- Multi-role-on-one-email switcher already plumbed; P2 extends it to the two new roles.

**Limitation:** callback allow-list and Google consent-screen branding live in the Supabase/Google consoles, not the repo. I will produce the exact checklist; the clicks are yours.

### PHASE 5 — Passwordless / passkeys — *Deferred; readiness only*

**Native Supabase support:** GoTrue supports **magic-link** and **email OTP** today (passwordless email). True **WebAuthn/passkeys are not first-class in GoTrue** as of this writing. Recommendation:

- **Now (readiness):** keep password login; add a `passkey_credentials` table schema (documented, not applied) and an architecture note so the data model is ready. Optionally enable **magic-link** as a passwordless *option* for adults (low effort, native) — but only if you want it; it changes the email-sending profile.
- **Later (real passkeys):** implement via an Edge Function using a WebAuthn library (e.g. SimpleWebAuthn) with credentials stored in `passkey_credentials`, bridging to a GoTrue session. This is a project, not a patch.
- **Non-negotiable:** passwordless is an **upgrade path**, never removes password login.

**Limitation to record:** passkeys require custom WebAuthn handling on top of Supabase; it is not a config toggle.

### PHASE 6 — Continuous adaptive trust — *Act now (audit log + step-up + timeouts); biometrics excluded*

The brief explicitly forbids invasive behavioural biometrics on a children's platform — agreed and honoured. "Adaptive trust" here means **lightweight, privacy-first** signals only.

Act-now slice:

1. **Security audit log** (shared with P8) — new `security_audit_log` table: `id, user_id (nullable), event_type, ip_hash, ua_hash, country, metadata jsonb (no PII), created_at`. **IP and UA are stored hashed/truncated**, never raw, and never any child data. Service-role + Edge Function writes; RLS lets a platform_admin read, owners read their own auth events. Captures: login success/failure, logout, role switch, admin access, password reset request/complete, MFA setup/removal (when P3 lands), suspicious redirect rejection.
2. **Step-up re-authentication** for sensitive actions: delete account, export family data, change billing, change email, view admin insights, delete learner data. Implementation: a `requireRecentAuth(maxAgeMinutes)` guard that checks session age and, if stale, prompts for password (or AAL2 once MFA exists) before the action. Frontend guard + server assertion in the corresponding RPCs.
3. **Session expiry by role + admin timeout:** parents/teachers keep the long "stay signed in" UX; **platform_admin sessions get a short idle timeout** (e.g. 30 min) enforced client-side by an idle timer that calls `signOut`, plus an `aal/iat` freshness check server-side on admin RPCs.
4. **"Sign out of all devices":** GoTrue supports global logout (`/auth/v1/logout?scope=global`). Add a `signOutEverywhere()` wrapper and surface it in account settings. Low risk.
5. **Risk flagging (lightweight):** on login, compare hashed UA + coarse country (from existing edge/CDN headers if available) to the last-seen values in `security_audit_log`; if changed, write a `login_new_context` event and (optionally) email the account. **No device fingerprinting beyond coarse UA family; no precise geolocation; no behavioural tracking.**

**Files:** `src/lib/supabase.ts` (`signOutEverywhere`, `requireRecentAuth`, audit-event emitter), account/admin shells, observability.
**Migrations:** `0020_security_audit_log.sql`; small RPC additions for step-up assertions.
**Edge Function:** `log-security-event` (service-role writer so clients can't forge entries).
**Risk:** Low–Medium (new table + new function; no change to existing flows). **Rollback:** drop table + function; remove guards.
**Feature flag:** `adaptive_trust_v1` (gates step-up prompts + new-context emails; audit-log writes can run unflagged since they're passive).

### PHASE 7 — Privacy & compliance — *Act now*

**Status: data model exists; enforcement & UX missing.**

You already have `consent_records`, `child_profiles` (minimal), `data_deletion_requests`, `parent_controls`. Gaps:

1. **Consent version constants + capture at the moments that matter.** Add `src/lib/consent.ts` exporting `CONSENT_VERSIONS = { account_terms, child_privacy, camera_use, data_retention, marketing }` and `PRIVACY_NOTICE_VERSION`. Write a `consent_records` row (with version + timestamp, already columns) at: parent signup (account_terms + child_privacy), first child creation (child_privacy + camera_use), and webcam first-use (camera_use). An adult-consent record is **required before any child profile is created** — enforce in the child-create RPC.
2. **Human-readable export** (not raw JSON). Build `export_family_data` RPC that returns a structured object, rendered client-side into a **PDF** (parent-facing, plain language) covering: account, each child's nickname/age-band/progress summary, consents with versions/timestamps, and a "what we do **not** store" statement (no child email, no child password, no raw camera frames). Reuse the existing `parentReport.ts` rendering approach.
3. **Account & child deletion flows wired to `data_deletion_requests`.** Today the table exists but nothing processes it. Add: a parent-facing "delete this child" and "delete my account" UI (behind step-up re-auth from P6), an RPC that inserts the request + performs the cascade (FKs already `on delete cascade`), and an audit-log entry. Two-step with confirmation; child deletion is reversible-window optional.
4. **Webcam privacy copy** surfaced at point of use (camera prompt) and in the export — short, parent-readable, stating frames are processed on-device and never stored.

**Files:** new `src/lib/consent.ts`, child-create + account paths, export/deletion UI, `src/lib/parent/parentReport.ts` (export render).
**Migrations:** `0021_consent_and_deletion_flow.sql` (child-create requires consent; `export_family_data` + `process_deletion_request` RPCs).
**Risk:** Medium — `process_deletion_request` is destructive. **Mitigation:** soft-delete/status transitions first (`pending→processing→completed`), hard cascade only after a confirmation + audit entry; dry-run on staging data. **Rollback:** RPCs are additive; the consent-required check can be relaxed by `create or replace`.
**Feature flag:** `compliance_flows_v1` (gates the deletion/export UI; consent-version writes are safe unflagged).

### PHASE 8 — Monitoring & visibility — *Act now*

**Gap:** auth pages emit no structured events; no security event sink beyond Sentry's default error capture.

Act-now slice (pairs with P6 audit log):

- **PostHog auth funnel events** (no PII, no child data): `auth_signup_started/succeeded/failed`, `auth_login_succeeded/failed`, `auth_password_reset_requested/completed`, `auth_role_switched`, `auth_mfa_*` (when P3 lands). Email addresses are **never** sent as properties — only a hashed user id and the role.
- **Sentry** for *critical* auth failures only (unexpected 5xx from GoTrue, callback wedge), with scrubbing to guarantee no tokens/passwords/emails in breadcrumbs.
- **`security_audit_log`** (from P6) is the durable, queryable trail for admin/role/reset/MFA events.
- **Redaction guarantee:** a single `redactAuthContext()` helper strips tokens, passwords, raw email, and any `child_*` fields before anything reaches PostHog/Sentry/audit-log. Add a CI check (extend `scripts/check-secrets.mjs`) that greps for forbidden fields in log calls.

**Files:** `src/lib/observability/*`, the four auth pages, `scripts/check-secrets.mjs`.
**Migrations:** none beyond P6's `security_audit_log`.
**Risk:** Low. **Feature flag:** not needed (additive instrumentation), but `auth_observability_v1` available to disable quickly if event volume surprises.

### PHASE 9 — Testing — *Deferred execution; checklist delivered now*

Full checklist in §5. Execution is deferred because it needs a staging project + seeded accounts (and ideally the Supabase branch you declined in favour of prod-apply). Recommendation: stand up a Supabase **preview branch** for auth testing before flipping any flag in prod.

---

## 3. Proposed migrations (review-then-apply)

All migrations are **idempotent** (`if not exists`, `create or replace`), follow the defensive style of 0004–0016, and each ships with an inline rollback note. **None will be applied until you approve it.**

| # | File | Purpose | Destructive? | Risk |
|---|---|---|---|---|
| 0017 | `signup_role_hardening.sql` | Metadata trigger ignores client-supplied privileged roles; provisioning stays via `register_*`. | No | Low |
| 0018 | `platform_admins.sql` | New allow-list table; `is_admin_user()` = legacy flag **OR** table (superset, back-compat). | No | Low–Med |
| 0019 | `school_admin_role.sql` | `tenant_members.role` + `is_school_admin(tenant_id)` + tenant-scoped RLS. | No (additive column, default 'member') | Med |
| 0020 | `security_audit_log.sql` | Auth/security event sink; hashed IP/UA; RLS read for self + platform_admin; service-role write. | No | Low |
| 0021 | `consent_and_deletion_flow.sql` | Child-create requires prior adult consent; `export_family_data` + `process_deletion_request` RPCs. | `process_deletion_request` is, by design | Med |

**Apply order:** 0017 → 0018 → 0019 → 0020 → 0021. Each is independently revertible. 0019 and 0021 should be validated on a preview branch or with the RLS test harness before prod.

---

## 4. Feature flags

Reusing the existing deterministic flag system (`src/lib/featureFlags.ts`) plus the core `featureFlags` module:

| Flag | Gates | Default |
|---|---|---|
| `rbac_v2_roles` | school_admin / platform_admin UI + role switcher entries | off |
| `adaptive_trust_v1` | step-up re-auth prompts, new-context emails, admin idle timeout | off |
| `compliance_flows_v1` | export PDF + account/child deletion UI | off |
| `auth_observability_v1` | new PostHog/audit auth events (kill-switch) | on |

Passive DB writes (audit log, consent versions, `is_admin_user` superset) run **unflagged** because they cannot break a working flow; only user-visible behaviour changes sit behind flags.

---

## 5. Test checklist (Phase 9)

Mapped to real routes. Each runs against parent + teacher + admin where applicable.

1. Parent email signup → `/parent/signup` → confirm both GoTrue shapes (auto-confirm vs email-confirm) land correctly.
2. Parent Google signup → role-intent = parent → lands `/parent/dashboard`.
3. Teacher email signup → `/teacher/signup` → `teacher_profiles` row → `/class`.
4. Teacher Google signup → role-intent = teacher → `/class`, not parent.
5. Admin Google login → `/admin/insights`; non-admin reaching it is server-blocked (RPC 403).
6. Password reset → request (no enumeration), recovery link routes to correct login, set-new-password form appears.
7. Logout (single) and **sign out everywhere** (global scope) invalidate other devices.
8. Session restore after reload + after access-token expiry (refresh path).
9. Cross-device login — two browsers, both stay signed in; global logout kills both.
10. Trial start → `/subscribe` → Stripe checkout (uses `ensureFreshSession`).
11. Billing access — only own subscription; step-up re-auth required to change.
12. Child profile creation — blocked until adult consent recorded (P7); no child email/password ever requested.
13. Parent → gameplay handoff — child_profile_id session, no child auth.
14. Teacher → class handoff — tenant-scoped, only own class.
15. Multiple roles on one email — switcher shows all held roles; no role confusion on redirect.
16. RLS — parent cannot read another parent's children; teacher cannot read another tenant; school_admin scoped to tenant.
17. Unauthorized access attempts — direct RPC calls as anon/non-admin return 401/403, logged to `security_audit_log`.
18. Expired session handling — graceful re-auth, no infinite loader on callback wedge.
19. Account deletion — request recorded, cascade verified, audit entry written.
20. Data export — human-readable PDF, contains consents + "what we don't store," no child PII beyond nickname.

---

## 6. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `is_admin_user` change locks out current admins | Low | High | Superset (legacy OR new); verify with RLS test before flip |
| `process_deletion_request` over-deletes | Low | High | Status-staged, confirmation + audit gate, dry-run on staging |
| New RLS on `tenant_members.role` blocks teachers | Low | Med | Default `'member'`; additive policy; test harness |
| Auth observability leaks PII | Low | High | `redactAuthContext()` + CI grep in `check-secrets.mjs` |
| Prod-apply without staging | Med | High | Recommend Supabase preview branch for 0019/0021 before prod |
| Scope creep into gameplay/billing | Med | High | This plan touches **only** auth/RLS/consent paths; no game or Stripe logic changed |

---

## 7. What I will NOT do (and why)

- **No behavioural biometrics / keystroke / mouse tracking** — children's platform, privacy-first (per brief).
- **No SMS MFA** — TOTP/passkeys only (per brief).
- **No removal of password login** — passwordless is additive.
- **No schema change applied without your approval** — despite prod-apply authority being granted.
- **No rewrite of the working session/refresh/OAuth core** — it's solid; touching it is pure downside.

---

## 8. Final summary

**Files proposed to change (act-now phases):** `src/lib/supabase.ts`, `src/pages/parent/Login.tsx`, `src/pages/parent/Signup.tsx`, `src/pages/teacher/Login.tsx`, `src/pages/teacher/Signup.tsx`, `src/lib/observability/*`, `scripts/check-secrets.mjs`, new `src/lib/consent.ts`, account/admin/child UI shells, `src/lib/parent/parentReport.ts`.

**Migrations proposed:** 0017–0021 (all idempotent, review-then-apply).

**Security features implemented now (on approval):** signup role hardening, platform_admin + school_admin RBAC, security audit log, step-up re-auth, admin session timeout, sign-out-everywhere, consent versioning + enforcement, human-readable export, account/child deletion flow, PII-safe auth observability.

**Deferred (documented, with safest alternative):** TOTP MFA + admin-required policy + recovery codes (P3), OAuth consent branding + localhost-callback removal checklist (P4), passkey/WebAuthn (P5), full test execution on a preview branch (P9).

**Risks remaining after act-now:** adult accounts without MFA until P3; passkeys absent until P5; prod-apply without a staging branch (mitigated by recommending one).

---

**Next step:** tell me which migrations and which act-now slices to implement first. My recommendation: **0017 (role hardening) + 0020 (audit log) + P8 observability** first — highest security value, lowest blast radius, no user-visible change — then P2 RBAC behind `rbac_v2_roles`, then P7 compliance flows.
