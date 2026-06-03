# Draw in the Air — Safety, Privacy & Compliance Dossier

Prepared for: Lagos school pilot conversations & DPCO review
Version: 1.0
Last updated: May 2026

---

## 1. Executive summary

Draw in the Air is a browser-based, camera-driven learning platform for children aged 3 to 9. Children practise pre-writing strokes, letters, numbers and shapes by moving their hand in the air; a webcam tracks the position of the index finger using Google's open-source MediaPipe library, entirely within the browser. No camera frames, video, or biometric data ever leave the device. No personal information is collected from children. Parent accounts (for home users) and school accounts (for classrooms) are protected by industry-standard authentication and database row-level security.

This document is the consolidated safety, privacy and compliance brief for school leaders, Data Protection Officers and Data Protection Compliance Organisations (DPCOs) in Nigeria, with reference to the Nigeria Data Protection Act 2023 (NDPA), the NDPC General Application & Implementation Directive 2025 (GAID), the EU General Data Protection Regulation (GDPR), the UK Data Protection Act 2018, and the US Children's Online Privacy Protection Act (COPPA).

The platform has been engineered to privacy-by-design and security-by-design principles. A full OWASP Top 10 audit was completed in May 2026, with all critical findings tracked in a formal remediation plan and a quarterly re-audit cadence. Schools considering a pilot are invited to request the redacted audit summary and remediation roadmap.

---

## 2. Product description

### 2.1 What the platform does

The application opens a webcam feed in the user's browser. A computer-vision model (Google MediaPipe Hand Landmarker) identifies the position of the user's hand and individual finger joints, frame by frame, in real time. The position of the index fingertip is mapped to an on-screen cursor. The child interacts with learning activities — tracing letters, popping bubbles, sorting objects, building shapes — using hand movement alone, without touching the screen.

### 2.2 What the platform does not do

It does not store video. It does not store images. It does not perform face recognition, facial-expression analysis, voice recording, or any other biometric identification. It does not include chat, messaging, or peer-to-peer interaction. It does not show third-party advertising to children. It does not embed third-party trackers in child sessions.

### 2.3 Modes of use

- **Home / individual:** a parent creates an account; children play under a nickname or emoji avatar. Up to two child profiles are included in the base plan.
- **Classroom:** a teacher launches a session with a four-digit join code; children type a first name (treated as ephemeral session data, never persisted to long-term analytics) and join. Class progress is shown to the teacher; individual children are not identified to other classes or to the public.
- **Anonymous /play:** a visitor can try the platform without an account. No data is associated with a profile in this mode.

---

## 3. Data inventory

### 3.1 Data collected from children

| Field | Required? | Stored where | Retention |
|---|---|---|---|
| Nickname | No (emoji avatar accepted) | Database, scoped to parent's account by RLS | Until parent deletes |
| Age band (4–5, 6–7, 8–9, 10–11, 12+) | Optional | Database, scoped to parent | Until parent deletes |
| Emoji avatar | No | Database, scoped to parent | Until parent deletes |
| First name (Class Mode only) | Required for join | Session memory only | Cleared at session end; never written to analytics |
| Pseudonymous device ID (per browser) | Auto-generated | `localStorage` on the child's device | Cleared when site data is cleared |
| Pseudonymous session ID (per tab) | Auto-generated | `sessionStorage` on the child's device | Cleared when tab closes |

### 3.2 Data NOT collected from children

Full name, date of birth, exact age, school name attached to a child, home address, parent's contact details attached to a child profile, phone number, photo, video, voice, fingerprint, facial geometry, gaze data, IP address linked to a profile, social-media handle.

### 3.3 Data collected from parents (parent accounts only)

| Field | Lawful basis | Storage | Retention |
|---|---|---|---|
| Email address | Contract (account creation) | Supabase Auth (`auth.users`) | Account lifetime + 30 days post-deletion |
| Hashed password (if not OAuth) | Contract | Supabase Auth (bcrypt) | Account lifetime |
| Display name (optional) | Consent | `parent_profiles` | Account lifetime |
| Stripe customer ID (if billing) | Contract | `parent_subscriptions` | 7 years (tax law) |
| Consent records | Compliance | `consent_records` | 7 years post-revocation |

### 3.4 Data collected for schools (classroom mode)

| Field | Lawful basis | Storage |
|---|---|---|
| Teacher Google account ID | Contract / public-task | Supabase Auth |
| Class code (4-digit, ephemeral) | Contract | `sessions` table; expires when class ends |
| Activity engagement events | Legitimate interest (with school agreement) | `analytics_events`, 12-month rolling retention |

### 3.5 Telemetry & analytics

The platform records anonymous, coarse-grained product telemetry: which activity was opened, how long it ran, whether the camera was granted, whether the hand tracker initialised, error codes, browser type and viewport size. Every event row carries a pseudonymous session ID and a pseudonymous device ID. No event row carries a child's nickname, no row carries a parent's email, and any free-form `meta` field is engineered to reject identifiers at the call site. A class code is recorded only when a session was joined via the classroom flow; the code expires when the class ends.

Marketing pageview telemetry (Google Analytics, Microsoft Clarity) runs only on the public marketing pages, never inside the child play surfaces. Cookies on the play surfaces are limited to functional storage.

---

## 4. Camera & video handling

### 4.1 Architecture

Every camera frame is processed entirely on the child's device by Google MediaPipe's WebAssembly + WebGL pipeline. The hand-landmark detector returns 21 normalised 2D coordinates per detected hand. Only these coordinates — small numerical scalars — leave the device, and only in aggregate as part of gesture-quality metrics that describe the *quality* of a movement (path accuracy percentage, time-to-first-movement, pause count). Raw coordinates are never transmitted.

### 4.2 No upload, no storage

There is no upload endpoint in the codebase that accepts video, image, or biometric data. The platform has no S3 bucket, no media-storage backend, no facial-analysis service, no voice service. The browser's `MediaStream` is the *only* place the video exists.

### 4.3 Permission scope

The browser's Permissions Policy on Draw in the Air is:

```
Permissions-Policy: camera=(self), microphone=(), geolocation=(), interest-cohort=()
```

This explicitly denies microphone, geolocation, and ad-tech (FLoC / Topics) cohorts at the browser level, and restricts camera access to the Draw in the Air origin only. A third-party script embedded on the page cannot access the camera even if its CSP entry allowed it.

---

## 5. Compliance posture

### 5.1 Nigeria Data Protection Act 2023 (NDPA) & GAID

The NDPA, signed June 2023, replaced the older NDPR. The NDPC's General Application & Implementation Directive (GAID) was issued on 20 March 2025; as of 19 September 2025 the NDPR and its Implementation Framework ceased to be extant, and the NDPA + GAID are the governing instruments. Draw in the Air's posture against the NDPA's core obligations:

| NDPA obligation | Draw in the Air's posture |
|---|---|
| Lawful basis (NDPA s.25) | Parent consent (home), contract + legitimate-interest balanced under a Data Processing Agreement (school). |
| Data minimisation (s.24(1)(c)) | The platform deliberately collects nickname-grade data only; no PII on the child. |
| Purpose limitation (s.24(1)(b)) | Data flows are documented per activity; analytics events are typed and the schema is published in `docs/ANALYTICS_PLAN.md`. |
| Storage limitation (s.24(1)(e)) | 12-month rolling retention on analytics with cron-enforced deletion; parent-initiated deletion of child profiles within 30 days. |
| Security of processing (s.39) | TLS in transit; RLS at rest; OWASP-aligned audit; incident-response SLA. |
| Cross-border transfer (s.41) | EU hosting; cross-border adequacy via the EU adequacy framework. Schools may request data residency confirmation in writing. |
| Data subject rights (s.34) | Self-service view, export, delete in the parent dashboard. |
| Data protection officer (s.32) | Draw in the Air operates an internal DPO function; appointment of an external DPO via a Nigerian DPCO is supported on request for school pilots. |
| Breach notification (s.40) | 72-hour notification to data controllers (the school) on confirmed breach; logged via `partnership@drawintheair.com`. |
| Children (s.31) | Treated as Sensitive Personal Data category; no profiling, no targeted ads. |

The NDPC issued a compliance notice to the Nigerian education sector on 19 February 2026 requiring institutions to file compliance evidence by 11 March 2026. Draw in the Air is structurally aligned with the controls that notice asks schools to evidence.

### 5.2 GDPR (EU 2016/679)

- Articles 6, 7, 8: lawful basis, consent, child consent — implemented via parent-only account creation.
- Article 25: data protection by design and by default — local processing, pseudonymous IDs, k-anonymity ≥ 5.
- Articles 12–22: data-subject rights — view, export, restriction, erasure surfaced in parent dashboard.
- Articles 32–34: security of processing, breach notification.
- Article 35: DPIA-ready — internal documentation supports a Data Protection Impact Assessment on request.

### 5.3 COPPA (US, 1998 / as amended)

Draw in the Air does not collect any personal information from children as defined in COPPA Rule § 312.2: no full name, no contact information, no persistent identifier tied to a child, no geolocation, no photo or video, no audio. For parent-initiated household use of paid features, verifiable parental consent is collected at account creation.

### 5.4 UK Data Protection Act 2018 & Children's Code

Aligned with the ICO's Children's Code (Age Appropriate Design Code) standards: minimum-necessary data, transparency in child-friendly language, default privacy-high settings, no nudge techniques, no profiling.

---

## 6. Technical security architecture

### 6.1 Authentication

- Parent accounts: Supabase Auth (GoTrue). Email + bcrypt password OR Google OAuth (implicit flow currently; PKCE migration planned per May 2026 audit).
- Teacher accounts: Supabase Auth via Google OAuth.
- No accounts for children.

### 6.2 Authorisation (Row-Level Security)

Every database table that holds parent or child data has Postgres Row-Level Security policies enabled and forced. Selected policies, current at time of writing:

```sql
-- A parent can only ever see their own profile
create policy parent_profiles_select on parent_profiles
  for select to authenticated using (id = auth.uid());

-- A parent can only see their own child's profile
create policy child_profiles_select on child_profiles
  for select to authenticated using (parent_id = auth.uid());

-- A parent can only see their own child's learning data
create policy cls_select on child_learning_state
  for select to authenticated using (auth_owns_child(child_profile_id));
```

The helper function `auth_owns_child(uuid)` is `SECURITY DEFINER` and references `auth.uid()` directly; it is the single authoritative check for child ownership across the schema.

### 6.3 Transport & browser hardening

| Header | Value |
|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(self), microphone=(), geolocation=(), interest-cohort=()` |
| `Content-Security-Policy` | `default-src 'self'; frame-ancestors 'none'; form-action 'self'; object-src 'none'; base-uri 'self'; upgrade-insecure-requests` (full policy enumerates allowed script and connection origins) |

### 6.4 CORS

Edge functions allow-list only `https://drawintheair.com`, `https://www.drawintheair.com`, `https://app.drawintheair.com`, and localhost development origins.

### 6.5 Payments

Stripe handles all billing. Card data does not transit Draw in the Air infrastructure. The integration uses Stripe Checkout and the Customer Portal; the platform receives only the Stripe customer ID and the subscription status via signed webhooks. PCI scope is reduced to SAQ-A.

### 6.6 Telemetry pipeline

Product events are batched in `localStorage`, flushed via PostgREST every five seconds, and written to a Postgres table with a per-event UUID for idempotent retry. Sentry receives uncaught exceptions; PostHog receives a privacy-vetted property allow-list. Both observability services are configured with pseudonymous device IDs only.

### 6.7 Public transparency

The platform publishes a live transparency report at `https://drawintheair.com/transparency`. Every figure on that page is queried at page-load time from production via two anon-callable, k-anonymised SECURITY DEFINER RPCs (`dashboard_transparency_report`, `dashboard_transparency_signals`). Groups smaller than 5 children are automatically suppressed.

---

## 7. Child-safety mechanics

### 7.1 Adult Gate

Exiting an activity, accessing settings, or leaving the play surface requires a 2-second press-and-hold gesture in the top-right corner. The interaction is intentionally too deliberate for young children to perform accidentally. There is no shortcut, swipe, or keyboard combination that bypasses the gate.

### 7.2 No external navigation in child mode

Child play surfaces contain no outbound hyperlinks. The platform does not embed third-party content (iframes, embedded video players, social-media widgets) in any child route.

### 7.3 No chat, no social, no leaderboard

There is no in-product mechanism for a child to communicate with any other person, inside or outside the platform. No leaderboards, no public profiles, no shareable links from child accounts.

### 7.4 Adult-only purchases

All monetary transactions require an authenticated parent session. Children cannot reach billing surfaces.

### 7.5 Safeguarding contact

Safeguarding concerns: `partnership@drawintheair.com`, 48-hour acknowledgement SLA.

---

## 8. Security audit history & posture

### 8.1 January 2024 — initial OWASP review

Documented in `SECURITY_AUDIT.md`. Mapped the application to OWASP Top 10 2021, remediated input validation, XSS, session management, security headers, and privacy. Verified COPPA / GDPR alignment.

### 8.2 May 2026 — full-system audit

A formal audit was conducted on 21 May 2026 covering the production SPA, the planned Next.js platform, the Supabase backend, and the row-level security configuration. The audit followed defensive-only methodology (no destructive testing, no bulk extraction). Findings were classified Critical / High / Medium / Low.

**Critical findings (in active remediation):**

1. The legacy `/admin` PIN dashboard exposed a client-side authentication gate. *Status:* the route is being removed; redirect-to-server-gated admin in flight.
2. Several dashboard RPCs were granted `EXECUTE` to the anon role. *Status:* a server-side `_is_admin()` check is being added to every dashboard function; anon access is being revoked.
3. The classroom `sessions` table was readable by anon. *Status:* SELECT is being revoked; a `session_lookup_by_code` SECURITY DEFINER RPC will be the only access path.
4. Two RLS policies on `form_submissions` and `newsletter_subscribers` were missing the `TO service_role` clause. *Status:* both policies are being replaced.

**Roadmap:** the full remediation plan ships across 1, 7 and 30 day buckets. A summary is available on request to school DPOs; the full audit report is not shared externally because it contains exploit-level reproduction steps.

The discipline of running this audit, finding and fixing real issues, and being transparent about the process is itself part of the safety posture. Schools are invited to ask any question about the audit during pilot scoping.

### 8.3 Going forward

- Quarterly RLS policy audit, scripted.
- CI security gates: ESLint security plugin, secret-scanner, CSP regression check.
- Annual third-party penetration test scheduled before any broad school rollout.

---

## 9. Data subject & data controller rights

### 9.1 Rights of parents and children

- Right to access and export every record held about the child.
- Right to correction of inaccurate records (e.g. nickname change).
- Right to deletion, honoured within 30 days, surfaced as a single button in the parent dashboard.
- Right to restriction or pause without losing learning history.
- Right to withdraw consent at any time.
- Right to lodge a complaint with the relevant supervisory authority (in Nigeria: the Nigeria Data Protection Commission, `info@ndpc.gov.ng`).

### 9.2 Rights of school data controllers

- A written Data Processing Agreement before any pilot interaction.
- Quarterly processing report on request.
- Sub-processor list on request (Supabase, Stripe, Sentry, PostHog as primary sub-processors).
- 72-hour breach notification on any confirmed incident affecting the school's data.
- Audit-right clause in the standard DPA.

---

## 10. Incident response

| Step | Owner | SLA |
|---|---|---|
| Initial intake (`partnership@drawintheair.com`) | DPO function | 48 hours acknowledgement |
| Severity triage | Engineering + DPO | 24 hours |
| Containment | Engineering | 24 hours from confirmed severity ≥ High |
| Controller notification (school) | DPO | 72 hours from confirmation |
| NDPC notification, if applicable under NDPA s.40 | DPO | 72 hours from confirmation |
| Subject notification, if applicable | DPO + Comms | Per supervisory-authority guidance |
| Post-incident review | Cross-functional | Within 14 days of resolution |

---

## 11. Sub-processors

| Sub-processor | Purpose | Region | Data shared |
|---|---|---|---|
| Supabase | Database, Auth, Edge Functions, Realtime | EU | Pseudonymous IDs, parent email (hashed for auth), telemetry events |
| Stripe | Payments | EU + US (PCI scope only) | Parent email, Stripe customer ID, subscription metadata |
| Sentry | Error tracking | EU | Pseudonymous IDs, error stack traces |
| PostHog | Product analytics | EU | Pseudonymous IDs, event names, allow-listed properties |
| Vercel | Static hosting & edge CDN | Global edge | TLS termination, no personal data |
| Google MediaPipe (open-source library) | On-device CV model | On the child's device only | None — runs locally |

A change to the sub-processor list is notified to school data controllers in writing before it takes effect.

---

## 12. School pilot framework

### 12.1 Pre-pilot

- Discovery call with the school's ICT lead, Head of Early Years, and DPO.
- Signed Data Processing Agreement.
- Site walk-through: device, network, classroom layout, light conditions for the camera.

### 12.2 Pilot live phase (typically 4–6 weeks)

- Single classroom, single device, single age cohort to start.
- Weekly check-in with the teacher.
- Class-level engagement metrics shared with the school; never individual-child data outside the parent dashboard.
- Adult Gate locked during class time.

### 12.3 Pilot debrief

- 30-minute review with school leadership.
- Engagement summary, teacher feedback, safeguarding observations.
- Mutual go / no-go decision on broader deployment.

---

## 13. Contact

| Topic | Contact |
|---|---|
| Pilot discussions | `partnership@drawintheair.com` |
| Privacy & data-subject rights | Use the in-app account page; for written requests, the partnership address routes to the DPO function |
| Security disclosure | `partnership@drawintheair.com` (48-hour acknowledgement) |
| Public privacy commitments | [drawintheair.com/privacy](https://drawintheair.com/privacy) |
| Live transparency report | [drawintheair.com/transparency](https://drawintheair.com/transparency) |

---

## 14. Document version control

| Version | Date | Notes |
|---|---|---|
| 1.0 | May 2026 | Initial school-facing dossier prepared for Lagos pilot conversations. |

This dossier is reviewed at least annually and reissued on any material change to the platform, sub-processor list, or applicable law.
