# Draw in the Air — Onboarding, Activation & Feedback Strategy

**Date:** 18 June 2026
**Author:** Growth / Product
**Scope:** Diagnose why visitors don't reach the game, fix onboarding comprehension, and install a stuck‑state feedback system that tells us *why* people leave.
**Data window:** 16–18 June 2026 (Microsoft Clarity: dashboard, recordings, region exports + session‑replay review).

> **Read order:** §1–§7 are the original diagnosis and the feedback system (built and shipped). **§8 onwards is the v2 product plan** — it supersedes the §4 roadmap and §5 priority order, folding in the activation north‑star, a learn‑by‑doing tutorial, a confidence system, and a live camera feed. Nothing from v1 is thrown away; the feedback system is re‑sequenced, not removed.

---

## 1. The one sentence that matters

We are paying to send people to a webcam hand‑tracking game, but **only ~5 in 100 ever reach the game**, and **two‑thirds of them arrive in the one browser where the game is least likely to work**. The onboarding confusion you spotted in the recording is real — but it's the *second* leak, not the first.

We will fix both, in order, and we will stop guessing why people leave by building a feedback system into the exact moments they get stuck.

---

## 2. What the data actually says

After excluding bot traffic (14 sessions) and your own `/admin/insights` views (which inflate "top pages" to 23), there are **~87 real external sessions** in the window. Here is where they go:

| Signal | Number | What it means |
|---|---|---|
| Reached `/play` (the actual game) | **4 of 87 (4.6%)** | The core experience is barely being seen. |
| Reached `/parent/signup` | 8 | The parent funnel is also thin. |
| Left in ≤3 seconds | **41%** | Most visitors bounce before anything loads or registers. |
| Zero clicks the entire session | **74%** | They look, they don't act. |
| Median session length | **9 seconds** | Long enough to see a screen, not long enough to understand it. |
| Arrived via Facebook / Instagram in‑app browser | **64%** | The most camera‑hostile environment there is. |
| On mobile or tablet | **74%** | The product's core interaction is designed hand‑at‑a‑webcam, i.e. laptop‑first. |
| In‑app homepage landers who bounced in ≤3s | **28 of 55 (51%)** | Half of paid social traffic is gone before the hero finishes rendering. |

Supporting quality signals from the dashboard: **dead clicks 7.76%** (9 sessions tapping things that aren't interactive), **active time 17s of 47s** (people are present but not engaged), scroll depth 51%.

### The three leaks, stacked

```
100 paid clicks (mostly mobile, in-app FB/IG browser)
        │  Leak 1 — ENVIRONMENT MISMATCH
        │  In-app browsers throttle/deny camera; mobile is laptop-first UX.
        ▼  ~51% of in-app landers gone in ≤3s
   ~40 engaged-ish sessions
        │  Leak 2 — COMPREHENSION
        │  "Wave your hand to start" with no setup, no expectation, no demo.
        │  The recording you watched lives here: "do I wave or not?"
        ▼
    ~4 reach /play
        │  Leak 3 — WE CAN'T SEE WHY
        │  No instrumented reason for any drop. We're inferring from replays.
        ▼
     Activation
```

---

## 3. The principle: treat every user like they don't know jack

A first‑time parent landing from a Facebook ad is **not** thinking "let me explore this product." They are thinking *"what is this and what do I do right now?"* Every screen has to answer three questions before it asks for anything:

1. **What is this?** (a free drawing game your kid plays with their hand, no controller)
2. **What's about to happen?** (the camera will turn on so it can see your hand — nothing is saved)
3. **What do I do?** (hold your hand up and wave — here's a 5‑second example)

Right now `/play` answers none of these loudly. It shows a beautiful sky, the words "Wave your hand to start," and four empty dots. If you already know the trick, it's delightful. If you don't, you freeze — exactly what the recording shows ("Looking for your hand…", "Come back into the picture", "Hi! I need to see your hands"). The user is doing nothing wrong; the screen never taught them.

---

## 4. Prioritized roadmap (all three, in order)

### Priority 1 — Onboarding comprehension *(ship first, this sprint)*
The cheapest, highest‑leverage fix, and the one you personally observed failing. Make "what to do" impossible to miss **before** we ask for a wave:

- A 3‑step "here's what happens" beat before/around the wave gate: *Hold up your hand → Wave side to side → Start drawing.*
- A **"Show me how" 5‑second looping demo** of a hand waving and the dots filling, so the gesture is shown, not just described.
- Keep the live status pill (it's good) but pair it with **stuck‑state help** (Priority 3) so a confused user is rescued within 10 seconds instead of leaving.

**Target:** lift `/play` → wave‑completed from its current near‑zero to a measurable rate; cut the onboarding‑screen dwell‑without‑progress.

### Priority 2 — Mobile & in‑app environment fit *(next sprint)*
Stop burning ad spend on an environment that can't run the product:

- **Detect the in‑app FB/IG browser + mobile** on landing. For those users, either (a) one‑tap "Open in Chrome/Safari" handoff, (b) a "this works best on a laptop — text me the link" capture, or (c) at minimum set the expectation up front instead of dropping them into a camera prompt that will fail silently.
- **Feed this back to Meta targeting/placement**: if the product is laptop‑first, exclude or down‑weight mobile‑only in‑app placements, or build a genuinely mobile‑capable fallback mode before paying for that traffic.
- Add a camera‑capability pre‑check so a doomed `getUserMedia` becomes a helpful message, not a dead end.

**Target:** convert the 51% instant‑bounce of in‑app landers into either a working session, a saved‑for‑later lead, or a cheaper, better‑matched ad audience.

### Priority 3 — The feedback system *(build now — it's the sensor for 1 & 2)*
This is the connective tissue. It both **helps the stuck user in the moment** and **captures the reason** so we stop inferring drop‑off from replays. Spec in §5. It ships alongside Priority 1 because the onboarding fix and the feedback system are the same surface.

---

## 5. The feedback system — design spec

**Design intent:** the primary job is **comprehension and rescue, not satisfaction polling.** A confused parent doesn't want to "leave feedback" — they want to know what to do. So the system leads with *help*, and quietly captures *signal*. Satisfaction (the happy‑face survey) only appears once someone has actually succeeded.

### The five triggers

| # | Fires when | Surface | Primary intent |
|---|---|---|---|
| 1 | On the onboarding screen **> 10s** with no progress | `👋 Need help?` → `[Show me how]` · `[Something isn't working]` | Rescue the frozen user |
| 2 | Hand detected but **wave not completed after 15s** | `Not sure what to do?` → `▶ Watch a 5‑second example` (plays the gesture demo) | Teach the gesture |
| 3 | **Camera permission denied / error** | `We can't see your hand yet.` → `[Try again]` · `[Why do you need my camera?]` | Recover trust + access |
| 4 | User **exits before starting a game** | Micro‑modal: *"Before you go, what stopped you?"* — Didn't understand it · Camera issue · Child wasn't interested · Something felt broken · Just exploring | Capture the drop reason (one tap) |
| 5 | **After 3 completed games** (not every session) | `How did today go?` 😞 😐 🙂 🤩 | Measure real satisfaction from real users |

### Context captured on every submission (automatic, no PII)

So a vague "doesn't work" becomes actionable:

```
"doesn't work"
  + page (/play)
  + game (Word Search)
  + device (Android, mobile)
  + browser (FacebookApp in-app)
  + session length (28s)
  + hand detection status (never detected)
  + camera permission status (granted)
  + onboarding step (wave gate)
  + tracker state / fps
```

All of this already exists in the analytics envelope (`device_type`, `browser`, `viewport`, `utm_*`, `referrer`, `session_id`) — the feedback module reuses it rather than re‑deriving it. **No names, no emails required, no faces — consistent with the on‑device privacy promise.**

### Where it routes
Submissions flow through the existing unified pipeline (`submitFormData` → Supabase edge function → Google Sheets fallback → localStorage backup) **and** fire a product analytics event (`feedback_submitted`, `stuck_help_shown`, `stuck_help_action`) so reasons are queryable next to the rest of the funnel, not stuck in an inbox.

### Build order (matches your instinct)
1. **Stuck‑state help + feedback** (triggers 1–4) — the rescue layer, built first.
2. **Behaviour analytics** — already partly there via Clarity + the events table; the new events extend it.
3. **Tiny floating feedback button** — always‑available, low priority.
4. **Post‑session happiness survey** (trigger 5) — only after real success.

---

## 6. What "good" looks like (success metrics)

| Metric | Today | Target (30 days) |
|---|---|---|
| Real sessions reaching `/play` wave gate | baseline | +instrument first, then +50% |
| Wave‑completed / wave‑screen‑view | ~unknown (near zero) | establish baseline, then >40% |
| In‑app‑browser instant bounce (≤3s) | 51% | <30% (via handoff/expectation) |
| Drop‑off reasons captured per week | 0 | every abandoned onboarding tagged with a reason |
| Stuck users rescued (help shown → progressed) | 0 | track and grow |

The most important short‑term win isn't a number going up — it's that **for the first time, every drop‑off carries a reason.** That turns the next month of decisions from opinion into evidence.

---

## 7. What's being built in code alongside this doc

- `src/features/feedback/` — context collector, submit helper, and a pure, unit‑tested **trigger state machine** for the five triggers.
- `StuckHelp` rescue layer (triggers 1–4) wired into the onboarding/`WaveToWake` screen.
- `HappinessCheck` (trigger 5) ready to mount after the third completed game.
- Onboarding comprehension upgrades in `WaveToWake`: clearer "what happens" expectation and a "Show me how" gesture demo.
- New analytics events: `stuck_help_shown`, `stuck_help_action`, `feedback_submitted`, `exit_reason_submitted`, `happiness_rating`.

See the implementation notes in the same PR for wiring details.

---

# v2 — The Integrated Product Plan

*Added after product‑lead review. Goal framing: get Draw in the Air from ~100 users to 10,000. The feedback system is necessary but not the lever. The lever is **activation** — and activation is won by making people succeed, not by asking them how it went.*

## 8. The one metric everything optimises toward: Activation

The v1 doc tracked `/play`, wave‑completed, feedback, satisfaction — but never named an activation event. Without one, every screen optimises for something different. We fix that now.

> **Activation = a child successfully completes their first activity.**
> (First `mode_completed` event in a session.)

Landing, opening the camera, waving, entering a game — **none of these count.** They are necessary steps, not the win. A waved hand that never completes an activity is a failure we should be able to see and chase.

### The real business funnel (instrument this end‑to‑end)

```
Homepage view        landing_view
   ↓
Decided to try       cta_click / try_free_clicked     ← homepage's job (often the biggest leak, see §13)
   ↓
Camera granted       camera_granted
   ↓
Hand seen            wave_first_hand_seen
   ↓
Wave completed       wave_completed
   ↓
Entered game         mode_started
   ↓
★ ACTIVATION ★       mode_completed (first)           ← the metric everything optimises toward
   ↓
Habit signal         mode_completed (second)
   ↓
Retention            return visit (new session, same device_id, >1h later)
```

Every event above already exists in the analytics vocabulary except the explicit "decided to try" and "return visit" rollups. **Deliverable:** an Activation Funnel view in the existing `admin/insights` dashboard showing absolute counts and step‑to‑step conversion, plus drop‑off split by device / in‑app‑browser. This makes the 4‑of‑87 number a live, sliceable chart instead of a one‑off finding.

## 9. Learn by doing, not by watching — the Tutorial Activity

People don't learn an unfamiliar interaction (hand tracking) from a demo loop. They learn by doing it once, successfully, with zero stakes. So the **first thing every brand‑new user does is a 20‑second tutorial activity**, not the menu.

> **"Can you pop 3 balloons?"**
> Balloon 1 → **wave** to pop it
> Balloon 2 → **point** to pop it
> Balloon 3 → **pinch** to pop it
> 🎉 *"You did it!"* → drop into the menu, now fluent.

This secretly teaches every core interaction the platform uses, with **no text, no narration, no language dependency** — works identically in Nigeria, the UAE, and the UK. It also produces a *guaranteed first success*, which is the psychological hook activation depends on.

We already have a `calibration` mode (`BubbleCalibration`) and bubble/balloon assets — the tutorial is a focused build on existing primitives, gated as a one‑time first‑run step (skippable for returning devices). **The tutorial's completion is the first `mode_completed` for most users — i.e. it *is* the activation event.**

## 10. The Confidence System — speak human, not system

Current onboarding speaks system language: *"Looking for your hand…", "Tracking · 23 fps", "Come back into the picture."* Kids (and most parents) don't parse that. Replace it with a Kinect/Wii‑style traffic‑light confidence indicator, driven by data we already compute (`hasHand`, `handScale`, confidence):

| State | Message |
|---|---|
| 🟢 | **Perfect! I can see your hand** |
| 🟡 | **Move a little closer** / **Move back a little** |
| 🔴 | **I can't see your hand yet** |

One persistent, friendly indicator — not a stream of changing technical strings. The `fps` readout drops to a debug‑only affordance. This is a small, high‑leverage change to `WaveToWake` + the `TrackingLayer` notification logic.

## 11. Show the camera feed immediately — the biggest single win

Right now the camera turns on but the user sees an *abstract* screen (the `<video>` is pinned to 1×1 px). The moment people **see themselves on screen**, confusion collapses and trust jumps: *"Oh — it can see me."*

> Camera permission → **live mirrored camera feed** → see yourself → wave → play.

We already have the exact mechanism: `ParentTransparencyBanner` borrows the live `MediaStream` into a visible `<video>` with no second `getUserMedia` call. We reuse that to render a **mirrored, rounded camera preview inside the wave card** during onboarding, with the hand‑confidence indicator (§10) overlaid. This is the highest‑ROI change in the whole plan and is technically de‑risked.

## 12. Sharper feedback — intent and expectation gap

Two additions to the existing feedback system (built in v1):

**a) Capture intent on exit (not just the reason).** The exit micro‑survey asks *why* you left; add *what you came to do*:

> **"What were you trying to do?"** — Start a game · Test it out · Help my child learn · Explore the website · School use · Not sure

Intent reframes every other metric: a "just exploring" bounce is fine; a "help my child learn" bounce that never activated is a failure to chase.

**b) Parent Confidence / Expectation‑gap score — immediately after first success** (not after 3 games; that's a *separate* satisfaction read):

> **"Did Draw in the Air work the way you expected?"**
> 😕 Not really · 🙂 Mostly · 🤩 Better than expected

This measures the gap between the promise (the ad / homepage) and the experience — the single most predictive signal for paid‑acquisition scaling. The v1 `HappinessCheck` (after 3 games) stays as a distinct, later satisfaction measure.

## 13. The homepage is a bigger leak than onboarding

69 homepage entries → 4 reached `/play`. Most visitors **never even decide to try** — that is a homepage comprehension problem sitting *upstream* of onboarding. Before spending more on ads, we run Clarity specifically on the homepage: hero visibility, primary‑CTA click map, scroll depth, and rage/dead clicks on the hero. Hypothesis: visitors still don't understand *what Draw in the Air is* in the first 3 seconds. **Deliverable:** a homepage‑specific Clarity read + a hero/CTA clarity pass, tracked as its own funnel step ("decided to try").

## 14. Guiding principle, taken further

The strongest line in v1 was *"treat every user like they don't know jack."* We harden it into a design rule for every screen, animation, button, and message:

> **Assume every user is seeing hand tracking for the first time in their life.**

If we build from that assumption, activation rises further than any survey ever could.

## 15. Revised build order (supersedes §4 / §5)

Each item maps to concrete code; ✅ = already built in v1 and kept.

### Sprint 1 — Make people succeed (activation core)
1. **Live mirrored camera feed during onboarding** (reuse `ParentTransparencyBanner` stream‑borrow → preview inside `WaveToWake`).
2. **Interactive balloon tutorial** — first‑run "pop 3 balloons: wave / point / pinch", built on `calibration`/bubble primitives; its completion = activation.
3. **Confidence indicators** (🟢🟡🔴) replacing system language in `WaveToWake` + `TrackingLayer`.
4. **Stuck‑state help** ✅ (`StuckHelp`, already wired) — kept as the safety net under 1–3.
5. **Activation funnel view** in `admin/insights` + define activation = first `mode_completed`.

### Sprint 2 — Learn why, close the loop
1. **Exit reason capture** ✅ (`ExitFeedbackModal`) — wire into App on exit intent.
2. **Intent question** added to the exit survey (§12a).
3. **Parent confidence / expectation‑gap** score immediately after first success (§12b) — new component.
4. **Feedback widget** ✅ (`FeedbackWidget` exists) + **in‑app‑browser detection/handoff** for mobile FB/IG traffic (§Priority 2, `detectInAppBrowser` already built).
5. **Post‑3‑games happiness** ✅ (`HappinessCheck`) — wire into App.

### Sprint 3 — Personalise the path
1. **Device‑specific onboarding** (mobile in‑app vs laptop divergent flows).
2. **School onboarding path** vs **parent onboarding path** (intent‑driven, from §12a).
3. **Personalised return‑user flow** (skip tutorial, greet by progress).

## 16. Sprint 1 acceptance criteria
- A returning‑with‑camera user sees their **live mirrored feed** within 1s of granting permission.
- A brand‑new user is routed into the **balloon tutorial** before the menu and cannot reach a real game without one guaranteed success (skippable only for known returning devices).
- Onboarding shows **exactly one** confidence state (🟢/🟡/🔴) at a time; no raw fps in the default view.
- `admin/insights` renders the **activation funnel** with per‑step conversion and a device / in‑app‑browser split.
- Everything stays green: `tsc -b --noEmit`, `eslint`, `vitest`, production build.
