# Draw in the Air — Meta (Facebook + Instagram) Ads Execution Plan

**Prepared for:** Founder
**Scope:** Parent acquisition (85%) + Teacher pilot interest (15%)
**Status:** Execution-ready. Hand to designer, ad buyer, developer.

---

## ⚠️ Read this first: product truth check (do not skip)

This plan is written against the **live product**, not the brief. Three facts in the brief are out of date or risky. The ads below use the correct, truthful version so that what a parent reads in the ad matches what they see on the site (mismatch = wasted spend + Meta policy risk + refunds).

| Brief said | Live product (use this) | Why it matters |
|---|---|---|
| 14-day free trial | **7-day free trial** | We shortened it last build. Every ad and landing page must say 7. |
| "no card today if true" | **TRUE — no card at signup** | Trial starts card-free; Stripe only appears if they choose to subscribe. This is a *major* conversion lever. Lead with it. |
| Up to 2 learners, +$2/mo each | Correct | Keep. |
| $4.99/mo, $54.99/yr | Correct | Keep. Yearly saves ~$5. |

**Hard compliance lines (child-facing advertiser):** never imply you target children, never promise academic/developmental outcomes, never use shame. Approved verbs only: *supports, encourages, helps practise, designed with privacy in mind, parent-friendly.* Full list in §16.

---

## ★ Founder revisions v2 (read before §1 — these supersede where they conflict)

Five strategic upgrades from the founder, now the spine of the plan:

**1. The central message is fixed: "Screen time you don't feel guilty about."**
Everything ladders to this one feeling. We are NOT competing with EdTech apps. We are competing with **YouTube Kids, Netflix, Roblox, tablets, passive screens.** That is the category battle. Parents aren't searching for hand-tracking, webcams, or EYFS mapping — they're searching for relief from *"I don't want my child sitting passively in front of screens all day."* Lead headline stays **"Screen time that gets them moving."** Emotional payload underneath it, everywhere: *"...that you don't feel guilty about."*

**2. The primary CTA is "Try it right now" — not "Start your free trial."**
Free Paint is the unfair advantage and it becomes *central*, not a footnote. Competitors gate everything behind sign-up → account → verify → add child. We don't. The moment a parent sees their own child draw in the air in under 60 seconds, the biggest trust barrier is gone. So: **a chunk of cold traffic goes DIRECT to `/play`, not the landing page.** CTA wording across cold creative: **"Try it now"** / **"Try it right now, no sign-up."** Save "Start your 7 days free" for retargeting (people who already played).

**3. New audience — Grandparents & gift-buyers (UK especially).**
A large share of UK children's subscriptions are bought by grandparents, aunties, uncles. Add a dedicated cold ad set: **"Parents & Grandparents of children 3–7."** Interest layer: Grandparenting, gifts for grandchildren, + the early-learning interests. Angle shift for this set: *"A screen-time gift that actually gets them moving"* / *"The present that isn't another tablet game."* Routes to /parents (gift framing), gift-of-learning hook.

**4. Two separate geos — never combined. UK and Lagos run as different campaigns.**
Different purchasing power, messaging, school systems, and trust signals. See the new **§13b Lagos campaign**. UK angle = "Active screen time." Nigeria angle = **"Learning through play."** Separate creatives, separate budgets, separate landing emphasis. Do not let one audience's data pollute the other.

**5. Build the school funnel *alongside* parents, not instead of.**
Parents = cash flow. Schools = scale. One school pilot can equal 50–500 parent subscriptions. Keep 85/15 spend, but the teacher 15% is a *high-ticket lead funnel* with a human step: **Meta Ad → /for-teachers → Pilot Form → Book a Call → Classroom Pilot → School Subscription.** Treat each teacher lead as worth 50×+ a parent click. Expanded in §13.

**The launch discipline (do this, not the 50-creative version):**
> Phase 1: produce assets from this strategy. **Phase 2: build only 3 videos + 3 statics + 2 landing variants. Launch at £20–30/day. Phase 3: collect data before spending more.** The Phase 2 kit is spec'd at the end of this doc (§18). Do not build twenty creatives before your first pound.

---

## 1. Executive summary

Draw in the Air sells one feeling to one buyer: **"screen time I don't feel guilty about."** The parent of a 3–7 year old is not shopping for an EdTech app; they are managing a daily, low-grade guilt about passive screens. We sell relief from that guilt by reframing the screen as *active* — the child stands up, moves their whole arm, and traces letters in the air through the webcam. No app, no hardware, no child login, camera never leaves the device.

The wedge that makes this cheap to acquire: **Free Paint is fully playable with zero account.** A parent can click an ad and watch their own child draw in the air in 60 seconds before we ever ask for an email. That is our single biggest unfair advantage on Meta — most EdTech demands signup before value. We don't. The entire funnel is built to exploit that.

**The strategy in one line:** Show the magic (child moving + drawing) → let them try it free with no account → convert to a card-free 7-day trial → convert trial to paid with progress visibility + a gentle reminder before billing.

**Primary KPI:** Cost per card-free trial start (CompleteRegistration + StartTrial). **North-star:** trial→paid conversion rate. **Guardrail:** never optimise to child engagement metrics in a way that implies child targeting.

---

## 2. Best ad angle recommendation (the one to lead with)

### Primary positioning: **"Active screen time"** — option 1.

**Winning line:** *"Screen time that gets them moving."*

**Why this beats the other four:**

- **It names the parent's actual pain** (guilt about passive screens), not a product feature. "Learn through movement" (option 2) is how it works, not why they care. Lead with why.
- **It's instantly believable from the visual.** One clip of a child arm-drawing an "A" in the air proves "active screen time" with zero words. The claim and the demo are the same thing.
- **It sidesteps the EdTech credibility tax.** "Better home learning" (option 3) and "Fun first, learning underneath" (option 5) invite the skeptical "does it actually work?" question we cannot answer with guarantees. "Active screen time" is self-evidently true and needs no proof.
- **It's a category of one.** No competitor owns "active screen time." Phonics apps, tablets, and YouTube all own "passive." We define ourselves against the thing parents already feel bad about.
- **"Safe webcam-based learning" (option 4) is a trust angle, not an acquisition angle.** Privacy reassurance closes the deal at the middle of the funnel; it doesn't start the conversation at the top. We use it in MOF, never as the hook.

**Positioning hierarchy across the funnel:**

| Funnel stage | Positioning used | Job |
|---|---|---|
| TOF (cold) | **Active screen time** (option 1) | Stop the scroll, name the guilt |
| MOF (warm) | **Safe webcam-based learning** (option 4) + how-it-works | Build trust, answer "is this safe / does it work" |
| BOF (hot) | **Fun first, learning underneath** (option 5) + trial offer | Lower the stakes, convert to free trial |

The four secondary positionings are not discarded — they become the **A/B test rotation** inside the prospecting campaign (§15). We *lead* with active screen time and *challenge* it with the others.

---

## 3. Funnel strategy

### The exact funnel map

```
META AD (TOF: "active screen time" video)
        │
        ▼
LANDING: /parents  (or direct /play for "try it now" creatives)
        │
        ├──────────────► /play  (Free Paint, NO account, instant value)  ◄── the magic moment
        │                       │
        ▼                       ▼
[Pixel: ViewContent]      [Pixel: StartActivity]  (anonymous play)
        │                       │
        ▼                       ▼
/parent/signup  ──────────────► [Lead + CompleteRegistration + StartTrial]
        │                       card-free 7-day trial begins
        ▼
Email confirm → /parent/dashboard
        │
        ▼
Add learner (/parent/children)  ──► [AddChild]
        │
        ▼
Child plays a mode  ──► [StartActivity / CompleteActivity]
        │
        ▼
Dashboard shows progress  (the "this was worth it" moment)
        │
        ▼  (day 5 of trial: branded reminder email — already built & live)
        ▼
/parent/billing → Stripe Checkout  ──► [InitiateCheckout → Purchase / Subscribe]
        7-day trial completes, then $4.99/mo or $54.99/yr
```

### Stage goals + creative

**TOP OF FUNNEL — Awareness & curiosity**
Goal: stop the scroll, plant "active screen time."
Creative: 15s vertical demo clips (child arm-drawing), problem-led hooks ("the screen does all the moving — what if your child did?"), founder 45s story. Optimise for ThruPlay + link clicks early, then CompleteRegistration once pixel has data.

**MIDDLE OF FUNNEL — Trust & understanding**
Goal: answer "is it safe?" and "does it actually do anything?"
Creative: privacy-first explainer (camera stays on device, no child accounts), 30s how-it-works, parent dashboard preview ("see what they practised today"), early-pilot framing. Optimise for CompleteRegistration.

**BOTTOM OF FUNNEL — Trial signup & subscription**
Goal: remove every reason not to start.
Creative: 7-day free trial, **no card today**, up to 2 learners, cancel anytime, "play Free Paint right now, no signup." Optimise for StartTrial, then Purchase.

**RETARGETING** (full sequences in §12): site visitors, /play players who didn't sign up, signups with no child added, trials with no purchase, pricing-page visitors, video viewers ≥50%.

---

## 4. Campaign structure & budgets

### Architecture (6 campaigns)

| # | Campaign name | Objective | Optimisation event | Audience | Budget share |
|---|---|---|---|---|---|
| 1 | `DITA_Parent_Prospecting` | Sales (Conversions) | CompleteRegistration → StartTrial | Cold parents (interest + LAL) | 50% |
| 2 | `DITA_Parent_Retargeting` | Sales | StartTrial / Purchase | Warm (site, players, video viewers) | 20% |
| 3 | `DITA_Trial_Conversion` | Sales | Purchase | Trial-started, not subscribed | 10% |
| 4 | `DITA_Teacher_Awareness` | Traffic/Engagement | Landing page views | Cold educators | 7% |
| 5 | `DITA_Teacher_PilotLeads` | Leads (Instant Form) | Lead | Warm educators + LAL | 8% |
| 6 | `DITA_Creative_Testing` | Sales (low budget) | CompleteRegistration | Broad parents | 5% |

**Naming convention (apply to every layer):**
`DITA_[Audience]_[Stage]` → ad set `[Audience]_[Targeting]_[GeoAge]` → ad `[Angle]_[Format]_[Version]`
Example ad: `ActiveScreenTime_Video_v01`.

### Ad set design — Parent Prospecting (campaign 1)

Run **Advantage+ audience OFF first** for clean reads, then test broad. Ad sets:

- `Parents_Interest_EarlyLearning_UK_3to7` — interests: Early childhood education, Montessori, Phonics, Educational toys, Homeschooling. Parents of 03–05 & 06–08.
- `Parents_Interest_ScreenTimeConcern_UK` — interests: Parenting, Positive parenting, Screen-free / outdoor play, Common Sense Media.
- `Parents_LAL_1pct_TrialStarters` — 1% lookalike of StartTrial (build once you have ≥100 trials; until then use site visitors LAL).
- `Parents_Broad_UK_25to45` — no interests, age 25–45, let the algorithm find them (turn on once pixel matures).

### Budget plans

**Minimum viable test budget: £300 over 7 days** (you cannot learn anything below ~£10/day per active concept; below that, statistical noise).

**£10/day plan (validation — are people clicking and trying?)**
- 100% into campaign 1 (Parent Prospecting), ONE ad set (`Parents_Interest_EarlyLearning`), 3 ads (3 different hooks, same offer).
- Goal: find one hook with CTR (link) ≥1.2% and cost-per-trial under ~£8. Ignore everything else.
- Do NOT run retargeting yet (not enough traffic to retarget).

**£25/day plan (find a winner + start retargeting)**
- £17/day campaign 1, two ad sets (Interest + ScreenTimeConcern), 3 ads each.
- £4/day campaign 2 (retargeting) — site + /play players, 7-day window.
- £4/day campaign 5 (teacher pilot leads) — single Instant Form ad set.

**£50/day plan (scale the winner)**
- £25/day campaign 1 (winning ad set scaled + 1 LAL ad set).
- £10/day campaign 2 retargeting (full sequence §12).
- £5/day campaign 3 trial conversion (only once you have trial-starters who didn't buy).
- £6/day teacher (campaigns 4+5 combined).
- £4/day campaign 6 creative testing (always-on, feeds winners up to campaign 1).

### Optimisation timeline

- **Day 1–7 (test):** learning phase. Do not touch anything for 72h. Kill only catastrophic ads (CTR <0.5% AND zero trials after £15 spend). Judge on cost-per-trial.
- **Day 8–14 (optimise):** pause bottom-third ads. Duplicate the winning ad set, raise budget 20% (never more — resets learning). Launch 3 fresh creative variants of the winning angle.
- **Day 15–30 (scale):** the winner gets 50%+ of budget. Introduce LAL audience. Turn on broad. Layer retargeting + trial-conversion. Begin yearly-plan upsell creative (better LTV).

---

## 5. Creative angles (14)

Format key: V=video, S=static/carousel. LP=landing page destination.

| # | Angle (hook) | Audience | Emotional trigger | Format | Copy direction | Visual | LP | KPI |
|---|---|---|---|---|---|---|---|---|
| 1 | **"The screen does all the moving. What if your child did?"** | Cold parents | Screen-time guilt | V 15s | Pain → reframe → demo | Child slumped vs child arm-drawing | /parents | Cost/trial |
| 2 | **"Screen time that gets them moving."** | Cold parents | Relief | V 15s | Pure demo, 1 line | Big arm letter-trace, joyful | /parents | CTR + trial |
| 3 | **"No app. No headset. Just your webcam."** | Cold, tech-wary | Low friction | S | Objection-killer | Laptop + child mid-air-draw | /play | Click→play |
| 4 | **"Their hands. Not just their thumbs."** | Cold parents | Novelty | V 15s | One-liner over demo | Hands tracing in air | /parents | ThruPlay |
| 5 | **"Try it right now. No sign-up."** | Cold, skeptical | Instant gratification | S | Permission to try free | "Play in your browser →" | /play | StartActivity |
| 6 | **"The camera never leaves the device."** | Warm (MOF) | Safety | V 30s | Privacy explainer | On-device diagram, calm | /parents#privacy | Reg rate |
| 7 | **"See what they practised today."** | Warm | Want visible progress | S carousel | Dashboard reveal | Real dashboard screens | /parents | Reg rate |
| 8 | **"Built by a parent who wanted screen time to mean something."** | Cold/warm | Trust, relatability | V 45s | Founder to camera | Founder, home, natural | /parents | ThruPlay + trial |
| 9 | **"7 days free. No card today."** | BOF / retarget | Risk removal | S | Offer-led | Clean offer card | /parent/signup | StartTrial |
| 10 | **"Up to 2 children. One quiet 10 minutes for you."** | Cold parents (siblings) | Self-interest, honesty | V 15s | Light humour | Two kids playing, parent w/ coffee | /parents | Cost/trial |
| 11 | **"Letters they trace with their whole arm."** | Early-learning parents | Developmental hope (safe-framed) | S | "Supports practice" wording | Big arc air-letter | /parents | CTR |
| 12 | **"You don't have to feel weird about screen time."** | Cold parents | Guilt relief, warmth | V 30s | Gentle, no shame | Soft home scenes | /parents | Trial |
| 13 | **"From 'put the tablet down' to 'five more minutes!'"** | Cold parents | Recognition/humour | V 15s | Relatable flip | Before/after child mood | /parents | CTR |
| 14 | **"Movement-based early learning, in any browser."** (Teacher) | Educators | Professional curiosity | S | EYFS/KS1, no hardware | Classroom IWB + air-draw | /for-teachers | Lead |

---

## 6. Ad copy bank

> Tone: human, warm, confident, simple. Never corporate, never AI-sounding, never overclaiming. All claims verified against live product (7-day trial, no card, on-device camera).

### 10 short primary texts (≤125 chars, mobile-first)

1. Screen time that gets them moving. 7 days free, no card today. ✋
2. Their hands, not just their thumbs. Try it in your browser, no sign-up.
3. No app. No headset. Just your webcam and a bit of space.
4. The screen does all the moving. What if your child did instead?
5. Letters they trace with their whole arm. Try Free Paint free, right now.
6. Active screen time for ages 3–7. Camera stays on your device.
7. One quiet 10 minutes for you. A moving, learning 10 minutes for them.
8. 7 days free. No card today. Cancel anytime. Up to 2 children.
9. Put the tablet down? Try "five more minutes!" instead.
10. Built by a parent who wanted screen time to actually mean something.

### 10 medium primary texts (125–250 chars)

1. Most screens ask kids to sit still and tap. Draw in the Air asks them to stand up and move. They trace letters and numbers in the air with their whole arm, through your webcam. No app, no headset. Try Free Paint free, no sign-up.
2. You know that low-level guilt about screen time? This is the fix. Your child uses their hands to draw, trace, sort and count in the air. It runs in any browser, the camera never leaves your device, and there are no child accounts. 7 days free.
3. Draw in the Air turns your webcam into a learning space. Children move to learn — tracing letters, popping bubbles, sorting shapes — all through hand movements in the air. Designed with privacy in mind. Start a 7-day free trial, no card needed today.
4. No tablet to buy. No headset to charge. Just open your browser, allow the camera, and your child is drawing in the air in under a minute. Supports letter, number and shape practice through movement. Up to 2 children. Cancel anytime.
5. "Five more minutes!" — about a learning activity. That's the goal. Draw in the Air makes early practice physical and playful, in any browser. See what your child worked on each day from a simple parent dashboard. 7 days free.
6. We built this because passive screen time felt like a compromise. Draw in the Air isn't. Children learn by moving — drawing and tracing in the air with their hands. Camera stays on-device, no video is ever stored. Try it free for 7 days.
7. Free to try right now, no account: open Free Paint and watch your child draw in the air with their hand. When you're ready, a 7-day free trial unlocks tracing, counting, sorting and a parent dashboard. $4.99/month after. No card today.
8. Early learning that gets them off the sofa. Draw in the Air uses your webcam so children practise letters and numbers with whole-arm movements. Parent-friendly progress, privacy by design, up to 2 learners. Start free.
9. Your webcam can do more than video calls. Draw in the Air turns it into a movement-learning space for ages 3–7 — drawing, tracing, counting, all in the air. No app to install. 7 days free, cancel anytime.
10. Screen time you don't have to negotiate with yourself about. Children stand, move, and learn through their hands. Runs in the browser, no hardware, designed with privacy in mind. Try Free Paint free, then 7 days on us.

### 10 long storytelling primary texts (250–600 chars)

1. **The "put it down" loop.**
Every parent knows the loop. You hand over the tablet for ten minutes of peace, then spend the next ten negotiating to get it back, feeling a bit rubbish about the whole thing.
Draw in the Air breaks the loop. Your child stands up and uses their webcam to draw, trace and count in the air with their whole arm. It's still a screen — but now they're moving, and they're practising real things like letters and numbers.
No app, no headset, no child login. The camera never leaves your device. Try Free Paint free with no sign-up, then a 7-day free trial unlocks everything. No card today.

2. **What "active screen time" actually looks like.**
It looks like your four-year-old standing in the living room, arm raised, tracing a giant letter "A" in the air — and the screen drawing it back to them in real time.
That's the whole idea. Instead of tapping a glass rectangle, children move their hands and bodies to learn. Letters, numbers, shapes, sorting, building — all through movement, in any browser.
We designed it with privacy first: no child accounts, and the camera feed never leaves your device. You get a quiet, simple dashboard showing what they practised.
7 days free. No card today. Up to 2 children. Cancel anytime.

3. **Founder note.**
I'm a parent. I built Draw in the Air because I was tired of screen time feeling like a small daily compromise.
So I made the opposite kind of screen: one where my kids have to stand up and move. They draw and trace letters in the air using nothing but our laptop's webcam. No app to install, no headset, no accounts for them — and the camera never leaves the device.
It won't promise to turn your child into a genius. It just makes the screen time you're already giving them something they move and learn through.
Try Free Paint free, no sign-up. If you like it, the 7-day trial is on us and there's no card needed today.

4. **For the sceptical parent.**
You've been burned by "educational" apps before. Flashy menus, locked content, a child who just wants the cartoon.
Fair. So here's the deal: you can try Draw in the Air right now, in your browser, with no sign-up and no email. Open Free Paint and let your child draw in the air with their hand. Sixty seconds. See for yourself.
If it clicks, the 7-day trial unlocks the rest — tracing, counting, sorting — with a parent dashboard and no card needed today.
Camera stays on your device. No child accounts. Cancel whenever.

5. **The sibling maths.**
Two kids, one device, ten minutes of actual peace. Draw in the Air includes up to two learners on one plan, so both children get their own profile and their own progress.
They take turns standing in front of the webcam, drawing and tracing in the air — moving, not slumping. You get a coffee and a dashboard that quietly shows you what each of them worked on.
$4.99 a month, or $54.99 a year, after a 7-day free trial. No card today. Add more children for $2 a month each. Cancel anytime.

### 15 headlines (≤40 chars)

1. Screen time that gets them moving
2. Their hands, not just their thumbs
3. No app. No headset. Just a webcam.
4. Active screen time for ages 3–7
5. Try it free. No sign-up.
6. 7 days free, no card today
7. Letters they trace in the air
8. See what they practised today
9. Up to 2 children, one quiet plan
10. The camera stays on your device
11. Movement-based early learning
12. Built by a parent, for parents
13. Five more minutes — of learning
14. Your webcam, a learning space
15. Cancel anytime. Camera stays private.

### 15 link descriptions (≤30 chars typical; news-feed)

1. 7-day free trial. No card today.
2. Runs in any browser
3. Up to 2 learners included
4. Privacy by design
5. No app to install
6. Free Paint — try with no sign-up
7. $4.99/mo. Cancel anytime.
8. Ages 3–7
9. Movement-based practice
10. See progress in plain English
11. No child accounts, ever
12. Webcam stays on your device
13. Start in under a minute
14. $54.99/year — best value
15. Built and made in the UK

### 10 CTA variations (use Meta button + in-copy)

Meta buttons: **Try it now**, **Sign up**, **Learn more**, **Get offer**.
In-copy CTAs: 1) "Play Free Paint free →" 2) "Start your 7 days free" 3) "Try it in your browser" 4) "No card needed — start free" 5) "See it in action" 6) "Open the demo" 7) "Add your child, free for 7 days" 8) "Watch them draw in the air" 9) "Start free, cancel anytime" 10) "Bring movement to screen time".

### Copy by audience/purpose (ready-to-paste)

- **Privacy reassurance:** "Three things we will never do: store your child's video, give your child an account, or let the camera feed leave your device. Everything runs in your browser. That's not a setting you turn on — it's how it's built."
- **Product demo:** "Open your browser, allow the camera, wave to start. Your child traces a letter in the air and the screen draws it back. That's the whole onboarding. Try Free Paint with no sign-up."
- **Founder:** (see long #3).
- **Pricing:** "$4.99 a month or $54.99 a year. Up to 2 children included. 7 days free first, and we don't ask for a card to start. Extra children are $2 a month. Cancel in one tap."
- **Parent dashboard:** "No scores, no jargon. Just a plain-English note of what each child practised and how they're getting on. The kind of update you'd actually read."
- **Retargeting (player, no signup):** "You saw them draw in the air. The 7-day trial unlocks tracing, counting and sorting too — and we still don't need a card to start."

---

## 7. Video ad scripts (8)

All vertical **9:16** primary; shoot a **1:1** safe-crop simultaneously (keep action centred). Easy to film on a phone or assemble in CapCut. `[OST]` = on-screen text.

### Script 1 — 15s demo-led (TOF, the workhorse)
- **Hook (0–2s):** Child stands, raises arm. `[OST: "This is screen time."]`
- **Scene:** Tight on child arm-drawing a glowing "A"; screen draws it back. Bright, real home.
- **VO (optional, warm):** "No tablet. No app. Just their webcam — and their whole arm."
- **0–15s OST beats:** "This is screen time." → "...that gets them moving." → "Draw in the Air" → "7 days free · no card today"
- **CTA:** "Try Free Paint free →"
- **Length:** 15s. **Format:** 9:16, captions burned in (85% watch muted).

### Script 2 — 30s parent pain-point (TOF/MOF)
- **Hook (0–3s):** Parent to camera, kind: "I used to feel a bit guilty about screen time."
- **Scene:** Cut to child slumped with tablet (1s) → cut to same child standing, drawing in the air, grinning.
- **VO/parent:** "Then we found one where she actually has to move. She traces letters in the air through our webcam. Same ten minutes — completely different."
- **OST:** "Active screen time" → "Camera stays on your device" → "7 days free, no card today"
- **CTA:** "Start free in your browser."
- **Length:** 30s. **Format:** 9:16.

### Script 3 — 45s founder (TOF trust, hero asset)
- **Hook (0–4s):** Founder, natural setting, direct: "I'm a parent, and I built this because I was tired of screen time feeling like a compromise."
- **Beats:** "So I made the opposite — a screen my kids have to stand up and move for." [demo b-roll] "They draw and trace letters in the air with our laptop's webcam. No app. No headset. No accounts for them, and the camera never leaves the device." [dashboard b-roll] "I won't promise it makes them a genius. It just makes the screen time you're already giving them something they move and learn through."
- **OST:** "Made by a parent" → "Privacy by design" → "7 days free · no card today"
- **CTA:** "Try Free Paint free — no sign-up."
- **Length:** 45s. **Format:** 9:16. Lo-fi/authentic beats polished here.

### Script 4 — 20s how-it-works demo (MOF)
- **Hook:** `[OST: "How it works (it's 3 steps)"]`
- **Scene/OST:** "1. Open your browser" [laptop] → "2. Allow the camera" [permission tap] → "3. Wave to start" [child waves, mode begins] → child traces, screen responds.
- **VO:** "That's the whole setup. Under a minute."
- **CTA:** "Try it now, no sign-up."
- **Length:** 20s. **Format:** 9:16 / 1:1.

### Script 5 — 30s privacy-first (MOF trust)
- **Hook (0–3s):** `[OST: "Yes, it uses the camera. Here's what that means."]` Calm tone.
- **Beats/OST:** "The camera feed never leaves your device." → "No video is ever stored." → "Your child never gets an account." → "It all runs in your browser." [soft on-device animation, no scary tech]
- **VO:** "Privacy isn't a setting here. It's how it's built."
- **CTA:** "See how it works."
- **Length:** 30s. **Format:** 9:16.

### Script 6 — 15s free-trial conversion (BOF/retarget)
- **Hook:** `[OST: "You saw the demo. Here's the easy part."]`
- **Scene:** Quick montage of 3 modes (trace, count, sort).
- **OST beats:** "7 days free" → "No card today" → "Up to 2 children" → "Cancel anytime"
- **VO:** "Start the trial without a card. If it's not for you, do nothing."
- **CTA:** "Start your 7 days free."
- **Length:** 15s. **Format:** 9:16.

### Script 7 — 30s teacher (Teacher campaign)
- **Hook (0–3s):** `[OST: "Movement-based learning. No new hardware."]`
- **Scene:** IWB or laptop in a classroom; children air-tracing; teacher relaxed.
- **VO:** "Draw in the Air runs in any browser on the devices you already have. Children practise letters, numbers and shapes through movement — a five-minute brain break that's actually on-task. EYFS and KS1 friendly. No child logins, no data collected on pupils."
- **OST:** "Runs on Chromebooks" → "No installs, no IT tickets" → "Free teacher pilot"
- **CTA:** "Request a classroom pilot."
- **Length:** 30s. **Format:** 9:16 / 1:1.

### Script 8 — 15s "five more minutes" flip (TOF, scroll-stopper)
- **Hook (0–2s):** Parent (weary): "Okay, time to put it down—" Child (delighted): "Five more minutes!"
- **Scene:** Reveal child is *standing and air-drawing*, not slumped.
- **VO/OST:** "When the screen time is this, you don't mind the five more minutes." → "Draw in the Air" → "7 days free, no card today"
- **CTA:** "Try it free."
- **Length:** 15s. **Format:** 9:16.

---

## 8. Static creative briefs (12)

Palette: **Lavender #8A66F0** (primary), **Mint #3FB87F**, **Sky #5A99F2**, **Sun #F0AC1F**, **Peach #F07A5C**, **Cream #FFFDF7** (bg), **Ink #1F1B2E** (text). Type: Outfit (display) + Nunito (body) — matches the live site. Logo top-left, small. Feel: active, magical, safe, premium. **Avoid:** stock tablet kids, fake classrooms, cluttered layouts, cheap cartoons.

| # | Concept | Layout | Image direction | Headline | Subtext | CTA | Format | Designer notes |
|---|---|---|---|---|---|---|---|---|
| 1 | **The air-letter** | Centred hero | Real child mid-air-drawing a glowing lavender "A"; cream bg | "Screen time that gets them moving" | "7 days free. No card today." | Try it now | 1:1 + 9:16 | The single best static. Glow trail in lavender→sky gradient. Lots of negative space. |
| 2 | **No-app objection** | 3 icons row | Cross-out icons: app store, headset, login | "No app. No headset. No child login." | "Just your webcam, in any browser." | Learn more | 1:1 | Icons in ink on cream; one mint tick on "webcam". |
| 3 | **Before/after** | Split | Left (desat): child slumped, tablet. Right (vivid): child standing, air-drawing | "Same ten minutes. Completely different." | "Active screen time for ages 3–7." | Try it now | 4:5 | Keep left tasteful, not shaming — soft, not grim. |
| 4 | **Dashboard reveal** | Device mock | Real parent dashboard screen, lavender card UI | "See what they practised today." | "Plain-English progress. No scores, no jargon." | Sign up | 1:1 + 9:16 | Use actual product UI. Blur any names. |
| 5 | **Privacy card** | Centred panel | On-device shield motif, calm | "The camera never leaves your device." | "No stored video. No child accounts." | Learn more | 1:1 | Mint + ink, very clean. Premium-trust look. |
| 6 | **Offer card** | Bold type | Minimal, big numbers | "7 days free" | "Then $4.99/mo. No card today. Cancel anytime." | Get offer | 1:1 + 9:16 | Sun accent on "free". Ultra-legible at thumbnail size. |
| 7 | **Two kids** | Duo hero | Two children air-drawing side by side, parent w/ coffee soft-focus behind | "Up to 2 children. One quiet 10 minutes." | "Both get their own profile and progress." | Try it now | 4:5 | Warm, real, slightly funny. |
| 8 | **Whole-arm trace** | Macro | Close on arm sweeping a big arc, motion blur trail | "Letters they trace with their whole arm." | "Supports early letter and number practice." | Learn more | 9:16 | "Supports... practice" wording = compliance-safe. |
| 9 | **Founder portrait** | Portrait + quote | Founder, warm, home setting | "I built the screen time I wanted for my own kids." | "Try Free Paint free — no sign-up." | Learn more | 4:5 | Authentic > polished. Handwritten-style accent optional. |
| 10 | **Try-now permission** | Browser frame | Laptop browser frame with Free Paint, child's hand entering frame | "Try it right now. No sign-up." | "Open Free Paint in your browser." | Try it now | 1:1 | Lowest-friction CTA. Drives /play directly. |
| 11 | **Webcam reframe** | Object hero | A webcam/laptop camera with a magical lavender swirl emanating | "Your webcam can do more than video calls." | "Turn it into a movement-learning space." | Learn more | 1:1 + 9:16 | Magical but premium, not gimmicky. |
| 12 | **Teacher / EYFS** | Classroom | Children at an IWB air-tracing, teacher relaxed | "Movement-based learning. No new hardware." | "EYFS & KS1 friendly. Free teacher pilot." | Sign up | 1:1 + 9:16 | Sky accent. Routes to /for-teachers. |

---

## 9. UGC & founder content (20 scripts)

> Direction: natural, believable, *not* an advert. Phone-shot. Imperfect is better. No teleprompter cadence.

### 5 founder video scripts (talking head)
1. **The why.** "Quick one. I'm the parent who made Draw in the Air. The honest reason: I didn't love how passive screen time felt. So this one makes my kids stand up and move — they draw letters in the air with our webcam. Have a play, it's free, no sign-up."
2. **The objection.** "People ask, 'a webcam app for kids — is that safe?' Genuinely fair question. So: the camera never leaves your device, we store no video, and your child never gets an account. That's not a promise, it's just how I built it."
3. **The demo.** [walking to laptop] "Let me just show you. Open browser, allow camera, my daughter waves... and she's drawing an 'A' in the air. That's it. Under a minute. No download."
4. **The honest limit.** "I'm not going to tell you this makes your kid a genius. I don't know that and neither does anyone selling you an app. What I do know: it turns ten minutes of screen time into ten minutes of moving and practising. That was enough for me."
5. **The price.** "Pricing, plainly: 7 days free, and I don't ask for a card to start. After that it's $4.99 a month, two kids included. If it's not for you, you literally do nothing. No card means no awkward cancelling."

### 5 UGC-style parent scripts (for parent creators / actors, keep loose)
1. "I was sceptical, ngl. But the no-sign-up thing got me — I just tried it. My son spent the whole time standing up drawing shapes in the air. First 'learning app' he didn't ask to swap for YouTube."
2. "The bit I like as a mum: the camera stays on the laptop, nothing's stored, and there's no account for her. I checked. That's rare."
3. "Two kids, both on one plan, both moving. I got an actual coffee. That's the review."
4. "It's not a fancy app with a million menus. It's literally: hand goes up, letter appears. My 4-year-old got it immediately."
5. "There's a little dashboard that just tells me what she practised. No scores stressing me out. I read it, which is more than I can say for the others."

### 5 teacher reaction scripts
1. "Used it as a five-minute brain break in Reception. They were tracing letters in the air, off their seats, still on-task. On the Chromebooks we already have. No install."
2. "What sold me: no pupil logins, no data collected on the kids. As a SENCO that's the first question I ask and usually the last."
3. "Projected it on the whiteboard, whole class followed along air-tracing. Gross-motor before fine-motor — exactly the order you want in EYFS."
4. "I didn't have to raise an IT ticket. It just ran in the browser. If you teach early years, request the free pilot."
5. "Honest take: it's not replacing your phonics scheme. It's a really good movement-led practice activity that takes 30 seconds to start."

### 5 demo walkthrough scripts (screen-record + voice)
1. "Right, the demo. This is Free Paint — no account. Watch, I move my hand and it draws. Now imagine a 5-year-old's face."
2. "Letter tracing mode: it shows the path, the child traces it in the air, it fills in as they go. Whole-arm movement, that's the point."
3. "This is the bit parents like — the dashboard. Plain English: 'practised letters A, B, C today.' That's it. No jargon."
4. "Adding a second child: name, age band, avatar, done. Both included on the plan. Took me ten seconds."
5. "Starting the trial: notice it doesn't ask for a card. You're just in. That's the whole point — try it for real, decide later."

---

## 10. Landing page recommendations

### Parent landing page (`/parents`) — paid traffic

**Above the fold (exact spec):**
- **Headline:** "Screen time that gets them moving."
- **Sub:** "Children aged 3–7 draw, trace and count in the air through your webcam. No app. No headset. The camera never leaves your device."
- **Primary CTA button:** **"Start 7 days free — no card"**
- **Secondary text link:** "or try Free Paint now, no sign-up →" (routes to /play)
- **Hero visual:** the air-letter clip (Script 1) autoplaying muted, or static #1.
- **Trust strip directly under CTA:** "No card today · Up to 2 children · Cancel anytime · Camera stays on your device."

**Match the ad:** if the ad's angle is privacy, the LP H1 stays the same but the trust strip jumps up; if the ad is the offer, lead the sub with "7 days free, no card." Use dynamic UTM-driven headline swaps if dev time allows (see §14); otherwise one strong default.

**Page order below fold:** 1) Product demo (the magic moment, video). 2) "Why active screen time" (3 cards: moves their body / practises real things / you don't feel guilty). 3) How it works (3 steps). 4) Parent dashboard preview. 5) Privacy reassurance ("Three things we'll never do"). 6) Pricing (7-day free trial, $4.99/$54.99, 2 learners, +$2 each). 7) FAQ. 8) Trust markers (made in UK, privacy-by-design, no child accounts). 9) Repeat CTA.

**Paywall / trial positioning:** lead with **"no card today"** everywhere. The trial is the offer, not the price. Price appears *after* value, framed as "after your 7 free days." Never show a card field before they've added a child and played.

### Teacher landing page (`/for-teachers`) — already rebuilt, route paid teacher traffic here

**Above the fold:**
- **Headline:** "Movement-based early learning. No new hardware."
- **Sub:** "Runs in any browser on the devices you already have. EYFS and KS1 friendly. No pupil logins, no data collected on children."
- **CTA:** **"Request a free classroom pilot"** (opens lead form / mailto).
- Sections (live): classroom use cases, EYFS mapping table (#eyfs-mapping), privacy & safeguarding, "no installs / no IT tickets," teacher controls, pilot CTA.

---

## 11. Conversion psychology (ethical)

| Parent desire | What they're really feeling | Ad message that serves it (no dark pattern) |
|---|---|---|
| Screen time should be useful | Quiet guilt | "Screen time that gets them moving." |
| Want kids to move | Worry about sedentary habits | "Their whole arm, not just their thumbs." |
| Want learning to feel fun | Tired of fights over apps | "Five more minutes — of learning." |
| Want visible progress | Want reassurance they're doing okay | "See what they practised today." |
| Want safe technology | Camera anxiety | "The camera never leaves your device." |
| Want affordable home learning | Budget-aware | "$4.99/mo, two kids, cancel anytime." |
| Want something not-passive | Sick of YouTube autoplay | "The opposite of passive screen time." |

**The conversion feeling we engineer:** *"Here's a better way to give my child the screen time they're getting anyway."* Relief and upgrade — never "you're failing your child." We remove risk (no card, cancel anytime, try with no sign-up) so the decision feels small. **Banned forever:** "is your child falling behind?", "screens are ruining a generation," guilt countdowns, fake scarcity.

---

## 12. Retargeting plan

Build these custom audiences (need Pixel + a few events; §14). Frequency cap guidance assumes Meta's auction; set at ad-set "frequency control" where available.

| # | Audience (how to build) | Window | Message | Creative | CTA | Timing/cap |
|---|---|---|---|---|---|---|
| 1 | **Visited /parents, no signup** (PageView /parents minus CompleteRegistration) | 14d | "Still thinking? Try it with no sign-up first." | Static #10 / Script 4 | Try it now | Show from day 1; cap ~3/wk |
| 2 | **Clicked trial, no signup** (ViewContent /parent/signup minus Lead) | 7d | "The trial doesn't need a card. You're 30 seconds away." | Script 6 | Start free | From day 1; cap ~4/wk |
| 3 | **Signed up, no child added** (CompleteRegistration minus AddChild) | 7d | "Add your first child — it takes ten seconds." | Demo #4 (add-child screen-record) | Add your child | From day 1; cap ~3/wk |
| 4 | **Added child, no activity** (AddChild minus StartActivity) | 7d | "Their first letter in the air is one click away." | Script 1 demo | Open an activity | From day 1; cap ~3/wk |
| 5 | **Played, no subscription** (StartActivity minus Purchase) | 14d | "Loved Free Paint? The trial unlocks tracing, counting and sorting." | Static #6 + dashboard #4 | Start 7 days free | From day 2; cap ~3/wk |
| 6 | **Visited /pricing** (PageView /pricing minus Purchase) | 14d | "7 days free, no card today. The price only starts after." | Static #6 | Get offer | From day 1; cap ~4/wk |
| 7 | **Video viewers ≥50%, no click** | 30d | Re-serve best demo + offer | Script 8 / Static #1 | Try it now | From day 3; cap ~2/wk |

**Sequencing:** audiences 2–4 are *highest intent* — give them the most budget and the most direct, friction-removing copy. Audience 5 (played but didn't pay) is your money audience; lead with the dashboard value + the no-card trial.

---

## 13. Teacher mini-campaign (15%)

**Goal:** generate pilot conversations, not instant subscriptions. Lead gen, not sales.

**Audience plan:**
- Interests: Early childhood education, Primary education, EYFS, Teaching assistant, Twinkl, TES, Special educational needs, Edtech. Job titles: Teacher, Early Years Practitioner, SENCO, Teaching Assistant, Reception/Year 1/Year 2 teacher.
- Geo: UK first. Age 24–55.
- LAL: 1% lookalike of teacher leads once ≥50 collected.
- Exclude: existing teacher accounts, current pilot leads.

**Ad copy (3 to start):**
1. "Movement-based learning for EYFS and KS1 — no new hardware. Runs in any browser on the devices you already have. No pupil logins, no data on children. Request a free classroom pilot."
2. "A five-minute brain break that's actually on-task: children trace letters and numbers in the air. Works on Chromebooks. No installs, no IT tickets. Free pilot for early-years and KS1 teachers."
3. "Built privacy-first for classrooms: no child accounts, no stored video, GDPR-minded. EYFS-mapped activities. See it in your room — request a pilot."

**Lead form questions (keep to 4, high-intent):**
1. Your role (Reception / Year 1–2 / EYFS lead / SENCO / TA / Other)
2. School name
3. Work email
4. "When would you want to try it?" (This term / Next term / Just exploring)

**Landing CTA:** "Request a free classroom pilot" → /for-teachers (or Instant Form). **Pilot offer:** "Free classroom access for the trial period, a 5-minute setup, and a one-page EYFS activity guide. No card, no commitment."

---

## 13b. Lagos / Nigeria campaign (separate — never merged with UK)

Run as its own campaign with its own budget, pixel optimisation, and creatives. UK data must not influence it.

**Angle:** **"Learning through play"** (not "active screen time" — the screen-guilt frame is a Western-affluence anxiety; in Lagos the buying emotion is *aspiration + value + a child getting ahead*). Lead emotion: *give your child a head start, affordably, at home.*

**Messaging shifts vs UK:**
- Lead on **value + outcome aspiration**, framed safely: "Playful early learning your child will actually want to do." Avoid the guilt angle entirely.
- **Trust signals matter more.** Lagos parents are (rightly) wary of online payment and "free trial" traps. Make card-free + cancel-anytime *louder*, and add "no hidden charges."
- **Price framing:** show local relevance. $4.99/mo reads differently; consider presenting as "less than [a common local reference]." Confirm whether Stripe supports NGN / local cards before scaling spend — if card friction is high, the **card-free Free Paint demo is even more central here** (drive most traffic to /play first).
- **Device reality:** more phone-only households. Emphasise "works on the phone or laptop you already have, no app to download" hard.

**Audience:**
- Geo: Lagos + Abuja first. Interests: Parenting, Early childhood education, Nursery/primary education, Educational toys, Phonics, "back to school" Nigeria. Age 25–45. English language.
- Add **diaspora set** (UK/US-based Nigerian parents buying for kids back home or locally) only if data supports — keep separate from the in-country set.

**Creative:** reshoot or recut with locally relatable home settings and on-screen text that reads as aspirational, not corrective. Same product demo (child air-drawing), different emotional wrapper. **CTA: "Try it free now"** → /play.

**Decision gate before scaling Lagos:** confirm payment rails (can a Lagos parent actually subscribe?). If subscription friction is high, run Lagos as a **top-of-funnel brand + Free-Paint-usage play** (grow the habit, monetise once rails are smooth) rather than chasing trial→paid at the same rate as UK.

---

## 13c. School acquisition funnel (the scale play, runs alongside parents)

The 15% teacher spend is not a smaller version of the parent funnel — it's a **high-ticket lead-gen funnel with a human close.** One school = 50–500 potential parent subscriptions and a credibility flywheel.

**Funnel map:**
```
Meta Ad (teacher) → /for-teachers → Pilot Form (4 Qs) → [Lead]
   → automated branded email + "Book a 15-min call" (Calendly)
   → Call (founder) → Free Classroom Pilot (1 term)
   → Pilot success → School / MAT subscription conversation
   → (bonus) school sends Draw in the Air home → parent subscriptions
```

**Why this beats treating teachers as mini-parents:**
- A teacher lead is worth optimising for at **10–30× a parent click** cost — one converted school dwarfs hundreds of trials.
- The human call step is the conversion engine, not the ad. The ad's only job is to get a real teacher to raise their hand.
- Pilots create **case studies + testimonials** that make the *parent* ads more credible ("used in UK classrooms").

**What to build (dev/ops, low lift):**
- Pilot lead form (Meta Instant Form or /for-teachers form) → pipes to email + a simple sheet/CRM.
- Calendly link "Book a 15-minute classroom pilot call."
- A 1-page pilot offer PDF (already have the brand PDF system): "Free classroom access for one term, 5-minute setup, EYFS activity guide, no card, no commitment."
- Tag school leads by type: single class / whole school / MAT (multi-academy trust) — MATs are the scale jackpot.

**KPI:** cost per *qualified* teacher lead (real school email + intent), then pilots booked, then pilots → paid schools. Do not judge this funnel on CPC.

---

## 14. Tracking & measurement

**Meta Pixel + Conversions API events (map to product actions):**

| Event | Fires when | Where in code |
|---|---|---|
| `ViewContent` | /parents or /pricing loads | router page-view |
| `Lead` | signup form submitted | parent/Signup submit |
| `CompleteRegistration` | account created (trial begins) | after signUpWithEmail ok |
| `StartTrial` | card-free trial row created | on register/handle_new_parent (client mirror) |
| `AddChild` | child profile created | createChildProfile success |
| `StartActivity` | a mode is opened | App mode_started (anon + auth) |
| `CompleteActivity` | a stage completed | mode_completed |
| `InitiateCheckout` | Stripe checkout opened | startStripeCheckout |
| `Subscribe` / `Purchase` | subscription active | Stripe webhook → client confirm |

**Implementation note:** you already emit rich internal analytics (`logEvent`, PostHog, route_view). Add a thin Pixel wrapper that mirrors the table above. Use **Conversions API** (server-side, via the Stripe webhook + a Supabase edge function) for Subscribe/Purchase so iOS/ad-blocker loss doesn't hide your most important event.

**PostHog funnel dashboard (build this view):** route_view(/parents) → parent_signup_completed → AddChild → mode_started → InitiateCheckout → Purchase. Add cohort: "trial started, no purchase by day 6" → triggers nothing automatically (the reminder email already covers it) but tells you trial→paid health.

**UTM convention (lock this format):**
`utm_source=meta`
`utm_medium=paid_social`
`utm_campaign=[campaign]` e.g. `parent_prospecting`
`utm_content=[angle]_[format]_[version]` e.g. `active_screen_time_video_01`
`utm_term=[audience]` e.g. `interest_earlylearning_uk`

Full example: `?utm_source=meta&utm_medium=paid_social&utm_campaign=parent_prospecting&utm_content=active_screen_time_video_01&utm_term=interest_earlylearning_uk`

**Naming convention recap:** campaign `DITA_Parent_Prospecting` → ad set `Parents_Interest_EarlyLearning_UK_3to7` → ad `ActiveScreenTime_Video_v01`. The ad name = the utm_content. One source of truth.

---

## 15. Creative testing plan

**Test FIRST (in order):**
1. **Hook** (the first 2 seconds / the headline). Biggest lever by far. Test angles 1 vs 2 vs 8 vs 12. Same offer, same LP.
2. **Format:** winning hook as video vs static.
3. **Offer framing:** "7 days free" vs "no card today" vs both.
4. **Audience:** winning creative across Interest vs ScreenTimeConcern vs Broad.

**Do NOT test yet (not enough data / low leverage):**
- Landing page variants (need ~1,000 visits/variant — wait).
- Price (don't discount a $4.99 product; you'll erode LTV for noise).
- Tiny tweaks (button colour, single words) — irrelevant at this budget.
- Founder vs product demo *before* you've found a winning hook (test the message, then the messenger).

**Test discipline:**
- **One variable per test.** Hook test = identical everything else.
- **Minimum:** £10/day/concept, 4 days, or ≥50 link clicks / ≥1 trial before judging — whichever later.
- **Kill** an ad when: after £15 spend, CTR(link) <0.6% AND zero trials. Kill an ad set when cost-per-trial is >2× your best ad set after £40 spend.
- **Scale** when: an ad holds cost-per-trial ≤ target across ≥3 days and ≥5 trials. Duplicate winner into a fresh ad set, +20% budget, never edit the original mid-flight.
- **Refresh** creative every 10–14 days (watch frequency; >2.5 on cold = fatigue).

**What "good" looks like (UK, early benchmarks to beat):** link CTR ≥1.0%, cost-per-trial-start £3–8, trial→paid ≥15%. These are starting targets; your real numbers set the bar after week 1.

---

## 16. Compliance & safety (child-facing advertiser)

**Never:**
- Imply the ad or product targets children (target *parents/educators* only; never run to under-18 audiences).
- Promise academic, developmental, cognitive, or medical outcomes ("improves IQ/reading age/focus/coordination" — banned).
- Reference disabilities as something the product fixes; if SEND is mentioned, frame as "designed to be accessible / inclusive," never therapeutic.
- Use fear, shame, or "falling behind" framing.
- Use real children's faces you don't have full signed release for (use your own/family with consent, or licensed UGC creators with talent releases).

**Always use approved verbs:** *supports practice, encourages movement, helps children engage, designed with privacy in mind, parent-friendly progress, made for ages 3–7.*

**Meta specifics:** declare the right special-ad-category? No (not housing/employment/credit/politics) — standard. Keep claims literal and verifiable. Privacy claims ("camera stays on device, no stored video, no child accounts") are *true and on-device* — keep them exactly truthful; they're a strength, not a risk.

---

## 17. 30-day launch calendar

**Week 0 — build (no spend):**
- Designer: produce Static #1, #6, #10 + Video Scripts 1, 3, 8 (founder can self-shoot 3 & 8). Square + 9:16 each.
- Dev: install Pixel + the 9 events (§14), Conversions API for Purchase, verify in Meta Events Manager. Set Site URL / domains already done.
- Ops: create the 6 campaigns as drafts, build custom audiences (need traffic first — they'll populate). Lock naming + UTMs.

**Week 1 (days 1–7) — validate (£10–25/day):**
- Launch campaign 1 only, one ad set, 3 hook ads (angles 1, 8, 12). Card-free trial as the event.
- Day 4: first read. Day 7: identify the winning hook. Do not optimise before 72h.
- Start collecting teacher leads (campaign 5, £4/day) in parallel.

**Week 2 (days 8–14) — find the winner (£25/day):**
- Pause bottom ad. Add second ad set (ScreenTimeConcern). Add 3 new variants of the winning hook (different visuals/formats).
- Turn on retargeting (campaign 2) now that you have site + player traffic — audiences 1, 2, 5.
- Launch founder Video Script 3 as a dedicated trust ad.

**Week 3 (days 15–21) — optimise & expand (£25–50/day):**
- Build 1% LAL of trial-starters (if ≥100; else site-visitor LAL). New ad set.
- Add trial-conversion campaign 3 (audience 5: played, no purchase) with dashboard creative.
- Introduce yearly-plan creative ("$54.99/year, best value") to lift LTV.

**Week 4 (days 22–30) — scale what works (£50/day):**
- Winning ad set gets 50%+ budget. Test Broad audience with the winner.
- Full retargeting sequence live (audiences 1–7). Teacher campaign scaled to ~15%.
- Refresh tired creative. Compile the 30-day report: cost-per-trial, trial→paid, best angle, best audience. Decide scale or iterate.

---

## Final checklist (hand-off)

**Developer**
- [ ] Meta Pixel installed + 9 events firing (verify in Events Manager Test Events)
- [ ] Conversions API for Subscribe/Purchase via Stripe webhook
- [ ] UTM params captured and passed through signup → Stripe metadata
- [ ] Confirm /play loads with no account (the no-signup demo path)
- [ ] Confirm "no card today" is literally true on the live trial start

**Designer**
- [ ] Statics #1, #6, #10 (+ #4 dashboard, #5 privacy) in 1:1, 4:5, 9:16
- [ ] Brand palette + Outfit/Nunito locked; logo small top-left
- [ ] No stock-tablet kids; use real/consented children or licensed UGC

**Founder**
- [ ] Self-shoot Video Scripts 3 (45s founder) & 8 (15s flip) on phone
- [ ] Record 3 founder UGC scripts (§9)
- [ ] Approve final ad copy against truth check (§ top) — 7 days, no card

**Ad buyer**
- [ ] 6 campaigns built, named, UTM'd
- [ ] Custom + lookalike + retargeting audiences created
- [ ] Start at £10–25/day, campaign 1 only, 3 hooks
- [ ] Exclusions set (existing customers, current leads)
- [ ] Frequency + kill/scale rules from §15 written into the SOP

**Compliance**
- [ ] Every claim uses approved verbs (§16); zero outcome/medical promises
- [ ] Audience 18+, parents/educators only
- [ ] Talent releases for any child shown

---

---

## 18. PHASE 2 LAUNCH KIT — build ONLY this, launch at £20–30/day

> The founder's discipline, locked: do not build 50 creatives. Build **3 videos + 3 statics + 2 landing variants**, launch lean, let data choose. Everything below is the exact, minimal shipping list. Produce these and you can go live this week.

### The hero ad (build this first — it may beat 20 over-designed creatives)

**`GuiltFlip_Video_v01` — 15s vertical, the killer ad (founder's storyboard, locked):**

| Beat | Scene | On-screen text | Audio |
|---|---|---|---|
| 0–2s | Child watching a tablet, slumped, still | "Most screen time looks like this." | soft ambient |
| 2–4s | Same child stands up | — | a little lift / whoosh |
| 4–7s | Child draws a giant "A" in the air, big arm sweep | — | playful chime as the letter forms |
| 7–9s | The screen responds instantly, drawing the A back | "What if screen time got them moving?" | — |
| 9–11s | Parent watching, smiling | — | warm |
| 11–13s | Logo on cream bg | "Draw in the Air" | — |
| 13–15s | Offer card | "7-day free trial · No card required" | — |
| end | — | CTA button: **Try it now** | — |

Notes: lavender→sky glow trail on the air-letter. Captions burned in. Shoot on a phone; the "slumped vs standing" contrast is the entire ad — keep it honest and warm, never shaming. Cut a **1:1 safe-crop** at the same time. **Route: cold → /play** (let them try immediately), retarget viewers → /parents.

### The 3 videos to ship

1. **`GuiltFlip_Video_v01`** — the hero above. 15s. Cold. → /play.
2. **`Founder_Video_v01`** — Script 3 (45s founder, self-shot on phone). Trust asset. Cold/warm. → /parents.
3. **`TryNow_Demo_v01`** — Script 4 (20s, 3-step how-it-works) OR Script 8 ("five more minutes" flip, 15s). Pick whichever you can shoot fastest. Cold. → /play.

### The 3 statics to ship

1. **Static #1 — The air-letter** ("Screen time that gets them moving" / "7 days free. No card today.") → /parents. *The workhorse.*
2. **Static #10 — Try-now permission** ("Try it right now. No sign-up." / browser frame) → **/play**. *Lowest friction.*
3. **Static #6 — Offer card** ("7 days free" / "Then $4.99/mo. No card today.") → /parent/signup. *For retargeting + pricing visitors.*

All three in **1:1 and 9:16** (6 files). Brand palette, Outfit/Nunito, logo small top-left.

### The 2 landing variants to test

- **Variant A — `/parents` (full landing):** H1 "Screen time that gets them moving," sub adds *"...that you don't feel guilty about."* Primary CTA **"Try it now"** → routes to /play; secondary "Start 7 days free (no card)." Trust strip: "No card today · Up to 2 children · Cancel anytime · Camera stays on your device."
- **Variant B — direct to `/play`:** cold "Try it now" traffic lands *straight in Free Paint*, with a slim persistent top bar: "Loved it? Start 7 days free, no card →". This tests whether removing the landing page entirely lifts trial starts. (The founder's instinct — likely a winner for the lowest-friction creatives.)

Split: send the two "try it now" creatives (Video 1, Static #10) to **Variant B (/play)**; send the trust/offer creatives (Founder video, Static #1, #6) to **Variant A (/parents)**.

### Phase 2 campaign setup (exactly this)

- **1 campaign:** `DITA_Parent_Prospecting`, objective Sales, optimise CompleteRegistration (switch to StartTrial once ≥50 fire).
- **2 ad sets:** `Parents_Interest_EarlyLearning_UK_3to7` and `ParentsGrandparents_Gift_UK_3to7` (the new grandparent set).
- **Ads:** the 3 videos + 3 statics, rotated. Each tagged with its UTM = its ad name.
- **£20–30/day total.** Don't add retargeting until you have traffic to retarget (≈day 4–5). Don't add Lagos or teachers until UK parent economics are proven.
- **Read at day 4, decide at day 7.** Winner = lowest cost per card-free trial. Then follow the Week 2+ optimise/scale plan (§17).

### Phase 2 success criteria (go/no-go before spending more)

- ✅ At least one creative under your cost-per-trial target for 3+ days.
- ✅ Variant B (/play direct) measured against Variant A — keep the winner.
- ✅ ≥15% of trial-starters add a child and play (funnel isn't leaking).
- ❌ If nothing hits after £200 spend: the problem is the *hook or the offer clarity*, not the budget. Re-cut the hero ad's first 2 seconds and the "no card" emphasis before spending another pound.

---

*Built from the live Draw in the Air product (7-day card-free trial, $4.99/mo · $54.99/yr, 2 learners, on-device camera, no child accounts, browser-only). Central message: **"Screen time you don't feel guilty about."** Primary cold CTA: **"Try it now"** → /play. Update the trial length in every asset if the product ever changes it again — the ad must always match the screen.*
