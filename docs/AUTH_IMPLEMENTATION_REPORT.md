# Draw in the Air — Auth Framework: Implementation Report

**Date:** 2026-06-09
**Applied to:** local repo **and** production Supabase project `fmrsfjxwswzhvicylaph` (owner-authorised).
**Companion doc:** `docs/AUTH_FRAMEWORK_PLAN.md` (the full audit + phase plan).
**Verification:** `tsc -b --noEmit` ✓ · eslint 0 errors (1 pre-existing warning, unrelated) · `vite build` ✓ (874 modules) · 5 migrations recorded in prod history · smoke checks ✓.

---

## 1. What shipped

### Database (migrations 0017–0021, applied to production)

| File | What it does | Breaking? |
|---|---|---|
| `0017_signup_role_hardening.sql` | Signup triggers now normalise the role (`lower(trim())`) and act **only** on exact `parent`/`teacher`; teacher insert forces `is_admin = false`. Privilege can never ride in on signup metadata. | No — behaviour-preserving |
| `0018_platform_admins.sql` | New `platform_admins` allow-list table (RLS deny-all to clients). `is_admin_user()` rewritten as a **superset**: legacy `teachers.is_admin` **OR** `platform_admins` membership. Added `is_platform_admin()`. | No — starts empty, identical behaviour until a row is added |
| `0019_school_admin_role.sql` | `tenant_members.member_role` constrained to `owner/school_admin/member`; new `is_school_admin(tenant_id)` (tenant-scoped, platform-admins pass for all); `get_account_roles()` now returns 5 booleans incl. `school_admin` + `platform_admin`. | No — additive |
| `0020_security_audit_log.sql` | `security_audit_log` table (hashed IP/UA only, no PII/child data); RLS: self-read + platform-admin-read; `log_security_event()` writer — `user_id` from `auth.uid()` only, metadata scrubbed of sensitive/child keys server-side. | No — additive |
| `0021_consent_and_deletion_flow.sql` | `create_child_profile()` (consent-**enforced** child creation); `export_family_data()` (human-readable, no internal ids); `process_account_deletion_requests()` (admin/cron processor, app-side cascade only). | No — additive; existing `record_consent`/`request_*`/`export_parent_data` untouched |

**Verified live:** all 5 migrations in prod history (`20260609112144`–`20260609112651`); `get_account_roles()` returns `{parent,teacher,admin,platform_admin,school_admin}`; consent guard raises when no consent; RLS enabled + policies present on both new tables; **`is_admin_user` EXECUTE grant to `anon` preserved** (student-join gameplay path intact).

### Frontend

| File | Change |
|---|---|
| `src/lib/authEvents.ts` *(new)* | Single PII-safe auth telemetry surface: `logAuthEvent()` → PostHog (allow-listed) **and** `log_security_event` RPC; `redactAuthContext()` strips PII/child keys; hashed UA only. |
| `src/lib/consent.ts` *(new)* | `CONSENT_VERSIONS`, `PRIVACY_NOTICE_VERSION`, `consentVersion()`, `CAMERA_PRIVACY_COPY`. |
| `src/lib/authFlags.ts` *(new)* | Kill-switches: `rbacV2Roles`, `adaptiveTrustV1`, `complianceFlowsV1`, `authObservabilityV1` (+ `ADMIN_IDLE_TIMEOUT_MINUTES`). Risky/visible behaviour gated; passive writes unflagged. |
| `src/lib/supabase.ts` | `AccountRoles` extended (`platform_admin`/`school_admin`); `signOutEverywhere()` (GoTrue global scope); `isRecentlyAuthenticated()` + `reauthenticateWithPassword()` (step-up); `mfaEnrollTotp()` (MFA-readiness stub). |
| `src/lib/parentApi.ts` | `createChildProfile()` routed through the consent-enforced `create_child_profile` RPC (records `child_privacy` consent + version atomically). |
| `src/lib/observability/posthog.ts` | Auth event + property names added to the allow-lists. |
| `src/pages/parent/Login.tsx`, `Signup.tsx`, `src/pages/teacher/Login.tsx`, `Signup.tsx` | Emit `logAuthEvent` for login/signup/reset success+failure (gated by `authObservabilityV1`). Existing double-submit guards confirmed present. |

---

## 2. Security features now live

Signup privilege hardening · platform_admin + school_admin RBAC (back-compat superset) · security audit log with forge-proof writer · sign-out-of-all-devices · step-up re-auth helpers · consent-enforced child creation · human-readable family export RPC · admin/cron account-deletion processor · PII-safe auth funnel + security events · MFA-readiness wrappers · four rollout kill-switches.

## 3. Deferred (documented, with safest alternative — see PLAN doc)

- **P3 MFA enforcement** — TOTP wrapper staged; requires the Supabase project **Auth → MFA** toggle (owner action) + recovery-code UX + admin break-glass before enforcing.
- **P4 console hygiene** — remove any `localhost` callback URLs from the prod Supabase allow-list; add Google consent-screen branding (console actions; checklist in PLAN).
- **P5 passkeys/WebAuthn** — not native to GoTrue; needs an Edge Function + `passkey_credentials` table (schema documented). Magic-link is available natively if you want passwordless sooner.
- **New user-visible UI** — role switcher, step-up dialogs, deletion/export screens, admin idle-timeout timer: library + DB backbone is in place and gated behind flags (`rbac_v2_roles`, `adaptive_trust_v1`, `compliance_flows_v1`); building those screens is the next slice.

## 4. Tests performed

`tsc` type-check ✓ · eslint (auth files) 0 errors ✓ · production `vite build` ✓ · prod migration history ✓ · `get_account_roles` shape ✓ · consent guard raises ✓ · RLS on new tables ✓ · `is_admin_user` anon grant preserved ✓. Full functional checklist (the 20 cases) remains to be executed against a seeded environment — recommend a Supabase preview branch before flipping any flag on.

## 5. Risks remaining

- Adult accounts have **no MFA** until the P3 toggle + UI land.
- The deletion processor handles **app-side** data only; final `auth.users` removal + Stripe cancellation still need the service-role/edge job (documented, not yet wired).
- Changes were applied **directly to production** without a staging branch (owner choice). All migrations are idempotent and individually revertible; rollback notes are inline in each `.sql` file.
- New UI behind flags is **untested in-browser** — keep `rbac_v2_roles` / `adaptive_trust_v1` / `compliance_flows_v1` **off** until the screens exist and are QA'd.

## 6. How to roll back

Each migration file contains an inline `ROLLBACK` note. In short: drop the new functions/tables and `create or replace` the prior function bodies (preserved in migrations 0007/0008/0009/0013). The `is_admin_user` superset reverts to the teachers-only body. Frontend: revert the listed commits; flags default to safe (new behaviour off, observability on).
