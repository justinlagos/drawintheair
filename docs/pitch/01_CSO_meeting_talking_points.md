# Talking-Points Cheat Sheet — CSO Meeting

**Goal of this doc:** prep you to walk in confident, speak plainly about what Draw in the Air does, prove the safety case, and make it easy for her to pitch you to Lagos schools.

---

## 1. The 30-second pitch (memorise this)

> "Draw in the Air is a camera-based learning platform for early-years kids. They learn letters, shapes, numbers and pre-writing by moving their hand in the air — no touchscreen, no pencil, no shared tablet. The camera only watches the hand to figure out where the finger is. Video never leaves the device. We don't collect names, faces, or any personal data about the child. It runs in a browser on whatever the school already has."

That single paragraph hits the four things she cares about: the product, the safety model, the privacy model, and the deployment story.

---

## 2. The five facts she will test you on

| If she asks... | You answer... |
|---|---|
| **"Where does the camera footage go?"** | "Nowhere. The camera frame is processed locally on the device by a Google library called MediaPipe. The platform never receives or stores video, photos, or biometrics. Only numerical coordinates of the hand position leave the device." |
| **"What personal data do you collect about the child?"** | "A nickname (or just an emoji avatar) and an age band — 4-5, 6-7, 8-9. That's it. No full name, no date of birth, no school name attached to a child, no email, no photo." |
| **"Who owns the data?"** | "The parent or the school. Parents can export or delete everything we hold from their account page. For school deployments we sign a data-processing agreement and we host inside the EU." |
| **"Is the kid identifiable?"** | "No. Every learner is a randomly generated pseudonymous ID. We also suppress any analytics group under 5 learners so individuals can't be picked out — that's k-anonymity. It's the same standard the UK Office for National Statistics uses." |
| **"What about NDPA compliance?"** | "We're built privacy-first, which matches NDPA principles — lawful basis, data minimisation, consent, parental rights. For a school pilot we'd register as a data processor with the school as data controller and sign the standard processing agreement. We're aware the NDPC issued a compliance notice to the education sector in February 2026 — happy to align with whatever the school's DPCO requires." |

That last one is your power move. **NDPC = Nigeria Data Protection Commission. NDPA = Nigeria Data Protection Act 2023 (the live law). GAID = the implementation directive issued March 2025. NDPR = the OLD law (don't quote it as current).** A CSO will instantly upgrade her opinion of you if you don't mix these up.

---

## 3. What's actually built into the platform (so you're not bluffing)

These are real, in-code controls. If she pushes hard, you can name them.

**On the camera and the child**
- MediaPipe hand-landmark detection runs **in the browser**, not on a server.
- No video upload anywhere in the code. Only normalised hand coordinates (numbers between 0 and 1) leave the device.
- An "Adult Gate" — a 2-second press-and-hold lock — prevents a child from exiting the app or hitting external links.

**On who can see what**
- Parent accounts use Supabase auth (email + password OR Google sign-in).
- Every database table that holds child data has **Row-Level Security** (RLS) — Postgres-enforced policies that mean a parent can only see their own children. There's a helper called `auth_owns_child()` that enforces this on every query.
- Child profiles, learning state, activity summaries, parent controls, billing — all RLS-locked.
- We have a public `/transparency` page that shows live aggregate numbers from production with no editorial layer.
- We have a `/privacy` page written in plain English for parents.

**On the wire and the host**
- HTTPS enforced (HSTS — `Strict-Transport-Security`).
- Security headers: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(self), microphone=(), geolocation=(), interest-cohort=()`. (Translation: only Draw in the Air can use the camera, mic and location are disabled, no ad-tech cohorts.)
- Content Security Policy whitelists script and connection origins.
- CORS allow-list — only `drawintheair.com` and `app.drawintheair.com` can call our edge functions.
- Data hosted in the EU (matters for cross-border under GDPR and aligns with NDPA Section 41 cross-border rules).
- Stripe for any billing — no card data ever touches our servers.
- Sentry + PostHog for error/usage telemetry, pseudonymous IDs only.

**On governance**
- An internal `SECURITY.md` and a recent **OWASP Top 10 audit** report (May 2026) in the repo. The audit found real issues (we'll get to that in section 4) and a 30-day remediation roadmap is in flight.
- A documented incident-response email at `partnership@drawintheair.com`.
- 12-month retention policy on analytics, with cron jobs to enforce deletion.

---

## 4. The honest gap — and how to handle it

**The CLAUDE.md context shows there is no formal, school-facing compliance documentation pack.** That's what this meeting is helping you build. Here is how to handle it without losing the room:

> "Most of what I've described is in the code and in our internal audit, but I'm honest that we haven't packaged it into a vendor-grade compliance dossier that schools can hand to their DPO. I'm using this conversation to scope exactly what schools in Lagos will need so I get it right the first time — would you walk me through what your network typically asks for?"

That move does three things at once:
1. Admits the gap without making it sound like a deficiency.
2. Flatters her expertise.
3. Turns her into a co-author of the next deliverable rather than a sceptic.

There is **also** a security audit done on 2026-05-21 that found real critical issues — class join codes being readable, some dashboard RPCs being callable without auth, CSP weaknesses. **The right way to talk about that:** "We ran a hard internal audit last month, it found real issues, the team is working through the remediation roadmap. Here's the roadmap." Don't hide it. A CSO will respect that you ran the audit way more than she'll worry that it found things — every system that's actually been audited has findings. Systems with zero findings have just never been looked at.

**Do not** say "we are fully NDPA compliant." Say "we are aligned with NDPA principles and we'd complete a formal compliance review with the school's DPCO before pilot live-fire."

---

## 5. Stats she'll respect (for the schools pitch)

Have these in your head — they make the case for *why* schools should care, and they tie into her own product (which teaches kids internet safety).

- **82% of 15–24 year olds globally used the internet in 2025** (ITU, via UN). Pre-internet generation literally no longer exists.
- **80% of children in 25 countries report feeling at risk of online sexual abuse or exploitation** (UNICEF Innocenti, 2025). This is the problem her product addresses directly.
- **Over a third of young people in 30 countries have been cyberbullied. 1 in 5 have skipped school because of it** (UN).
- **In six African countries (Ethiopia, Kenya, Mozambique, Namibia, Tanzania, Uganda), poorer children have measurably lower digital skills** (UNICEF). Inequality is widening with digital adoption.
- **In Kenya, 80% of children know how to remove a contact, but only 30% know how to check whether a website can be trusted** (UNICEF, 2025). The skills gap is in the *judgement* layer, which is exactly where her programme operates.
- **NDPC has audited the Nigerian education sector this year** — Feb 2026 compliance notice, deadline 11 March 2026. Schools are already in defensive posture. That's a tailwind for a vendor who can show up with a clean privacy story.
- **The product itself is screen-free in the most important sense** — no touch, no tap. Hand in the air. This sidesteps the screen-time anxiety many Lagos parents already have.

---

## 6. Why she will want to ride this — make it easy for her to pitch you

She teaches internet safety to kids. Draw in the Air sits one layer earlier in the same pipeline: it is *literally a product whose entire architecture is the internet-safety lesson she teaches.* Position it that way.

Pitch she can use with school heads:

> "I work with a platform called Draw in the Air. They've built an early-years learning tool that is privacy-safe by design — no child data, no faces, no cloud video, EU-hosted, NDPA-aligned. For a school that's currently under the NDPC compliance lens, it's an EdTech you can actually point to as part of your compliance story rather than a liability. They're looking for two or three pilot schools in Lagos. Would your DPO be interested in a 30-minute conversation?"

Three asks you should make of her at the meeting:
1. **Which schools should we start with** — the safest yes-yes is the school where her own internet-safety programme is already running.
2. **Who at each school is the actual buyer** — head, deputy head, ICT lead, or DPO. (Hint: with NDPA in play, the DPO has unusual leverage right now.)
3. **What format does the school need to see** — a one-pager, a vendor-risk questionnaire response, a demo? (The leave-behind I prepared answers the one-pager version.)

---

## 7. What you should NOT say

- Do **not** say "we don't have any documentation." Say "we have internal audit documentation; the school-facing compliance pack is what I'm building right now."
- Do **not** say "we are GDPR/NDPA compliant." Say "we are built to GDPR and NDPA principles."
- Do **not** quote the NDPR. It was replaced by the NDPA in September 2025.
- Do **not** promise anything about Lagos State Ministry of Education approval — they have their own process and you don't know it yet.
- Do **not** show the SECURITY_AUDIT_2026-05-21.md raw. It's an *internal* findings doc with exploit-level detail. Talk *about* it, don't share it.
- Do **not** mention specific endpoint URLs, the Supabase project ID, or the admin email — that's all internal.

---

## 8. Closing the meeting

End with a clear ask. Three options, in order of preference:

1. *"Would you be willing to introduce me to one school this week as a warm intro?"*
2. *"Would you co-host a 30-minute virtual demo with two or three school heads from your network?"*
3. *"If you can send me a vendor-risk questionnaire that schools in your network typically use, I'll fill it in this week and that becomes the asset we both use."*

Whichever she says yes to, follow up with a one-paragraph email within 24 hours that links the **one-pager** (the second file I made you) and offers the **full safety & compliance doc** (the third file) on request. Keep one in your back pocket, lead with the lighter one.

---

## Quick crib — only if you panic

- Camera: local only, never uploads.
- Child data collected: nickname + age band + emoji avatar. That's it.
- Hosting: EU.
- Auth: Supabase, parents only, row-level security per parent.
- Compliance basis: NDPA-aligned + GDPR principles. Formal pilot review via school DPCO.
- Documentation gap: acknowledged, being built (this meeting is shaping it).
- Recent audit: done May 2026, remediation in flight, happy to share roadmap.
- Adult gate: 2-second hold to prevent accidental exits.
- K-anonymity threshold: groups <5 suppressed.
- Retention: 12 months on analytics, parent-controlled deletion for child profiles.
