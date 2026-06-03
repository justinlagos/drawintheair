# Draw in the Air — Safety & Privacy at a Glance

A one-page brief for school leaders and Data Protection Officers in Lagos

---

## What it is

Draw in the Air is a browser-based early-years learning platform. Children practise letters, numbers, shapes and pre-writing by moving their hand in front of a webcam — no touch, no pencil, no shared device. It runs on any modern laptop or tablet with a camera; nothing to install.

## What it is NOT

It is not a social network. It is not a video-storage service. It is not an AI camera. There is no chat, no leaderboard, no child-to-child contact, no advertising, and no data sold to third parties — ever.

---

## Privacy by design

| Concern | How Draw in the Air handles it |
|---|---|
| Camera video | Processed locally in the browser by Google's open-source MediaPipe library. Frames are never uploaded, never stored, never sent off-device. |
| Personal data on a child | A nickname (or just an emoji avatar) and an age band (4–5, 6–7, 8–9). No full names, dates of birth, photos, phone numbers, school names attached to a child, or biometric data. |
| Identifiability | Each learner is a randomly generated pseudonymous ID. Any analytics group of fewer than 5 children is suppressed automatically (k-anonymity). |
| Hosting | EU-based infrastructure (Supabase). Data does not transit through ad networks. |
| Tracking and ads | No behavioural advertising. No tracking cookies for child sessions. `Permissions-Policy` disables microphone, geolocation, and ad-tech cohorts at the browser level. |
| Parental control | Parents can view, export, or delete every record we hold about them and their child from a self-service account page. Consent can be withdrawn at any time. |

---

## Built-in safety mechanics

- **Adult Gate** — exiting the activity, accessing settings, or leaving the app requires a 2-second press-and-hold a young child will not perform by accident.
- **No external links** in child mode. A child cannot navigate out of the learning surface.
- **No chat, no messaging, no social sharing** from a child account.
- **HTTPS enforced** on every page, with HSTS preloading.
- **Camera permission scoped** to Draw in the Air origin only.

---

## Compliance posture

Draw in the Air is engineered to the principles of:

- **Nigeria Data Protection Act 2023 (NDPA)** and the General Application & Implementation Directive 2025 (GAID).
- **GDPR (EU 2016/679)**, the global benchmark for personal-data protection.
- **UK Data Protection Act 2018** principles.
- **COPPA** (US Children's Online Privacy Protection Act) principles — no personal information collected from children under 13 without verifiable parental consent.

For each pilot school, Draw in the Air operates as a **data processor**, the school remains the **data controller**, and a standard data-processing agreement is signed before any data is collected. The pilot is reviewed against the school's Data Protection Compliance Organisation (DPCO) requirements before live-fire.

---

## Technical safety controls (summary)

| Layer | Control |
|---|---|
| Application | OWASP Top 10 audit completed May 2026; remediation roadmap active. Input validation, output encoding, no `dangerouslySetInnerHTML`. |
| Authentication | Parent accounts via Supabase (email + password OR Google sign-in). No child accounts. |
| Authorisation | Postgres Row-Level Security — every child record is locked to the owning parent's authenticated user ID via the `auth_owns_child()` policy helper. |
| Transport | TLS 1.2+; HSTS `max-age=31536000; includeSubDomains`. |
| Browser hardening | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, Content Security Policy with `frame-ancestors 'none'`. |
| Payments | Stripe-managed. PCI scope reduced to standard SAQ-A. No card data touches Draw in the Air infrastructure. |
| Logging & telemetry | Sentry + PostHog with pseudonymous IDs only. CSP-violation events are captured automatically. |
| Retention | 12-month rolling retention on analytics events; parent-initiated deletion for child profiles is honoured within 30 days. |
| Incident response | Security disclosures: `partnership@drawintheair.com`. 48-hour acknowledgement SLA. |

---

## What schools get from a pilot

- A **screen-free** (no touch, no tap) early-years activity that runs on existing classroom hardware.
- A **vendor with a clean privacy story** at a moment when the NDPC is actively auditing the education sector (Feb 2026 compliance notice).
- A **measurement layer** that reports learning progress at the classroom level, never on individual children, with all groups under 5 suppressed.
- **Live transparency** — every metric we publish is queryable on a public `/transparency` page generated directly from production.
- **No software to install.** Works in Chrome, Edge, Safari and Firefox on existing devices.

---

## Asks of the school

1. A classroom or learning-support room with one camera-enabled device and reliable internet (3 Mbps sustained is enough).
2. A named contact for the pilot — typically the ICT lead or Head of Early Years.
3. A signed data-processing agreement before any child interacts with the platform.
4. A 30-day debrief at the end of pilot covering engagement, teacher feedback, and any safeguarding observations.

---

## Contact

- Website: [drawintheair.com](https://drawintheair.com)
- Privacy commitments: [drawintheair.com/privacy](https://drawintheair.com/privacy)
- Live transparency report: [drawintheair.com/transparency](https://drawintheair.com/transparency)
- Pilot & partnerships: `partnership@drawintheair.com`

*Document version 1.0 — prepared for Lagos pilot conversations.*
