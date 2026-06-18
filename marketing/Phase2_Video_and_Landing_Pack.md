# Draw in the Air — Phase 2 Video Pack + Landing Build Specs

Pairs with the 6 static PNGs in `/marketing/ads/`. Brand: Lavender #8A66F0, Mint #3FB87F, Sky #5A99F2, Sun #F0AC1F, Peach #F07A5C, Cream #FFFDF7, Ink #1F1B2E. Fonts: Outfit (display), Nunito (body). Captions burned in (85% watch muted). Primary 9:16, also export 1:1.

---

## VIDEO 1 — `DITA_Hero_16s` (the hero, 16s) — PRODUCED ✓ → route to **/parents**

**Built and rendered.** Files: `ai/DITA_Hero_16s_9x16.mp4` (1080×1920, feed/Reels/Stories) and `ai/DITA_Hero_16s_1x1.mp4` (square feed). AI-generated with the Higgsfield/Seedance pipeline from on-brand stills (no real child filmed, no release needed).

**One-line concept (corrected to the Visual Photography System):** all-positive, movement throughout. Every shot holds the Visual Triangle — **child + purposeful gesture + responding screen + visible webcam**. No passive "screen-staring" beat (that breaks our own rule).

| # | Time | Shot (Visual Triangle present in every one) | On-screen caption (Outfit, white on ink pill) |
|---|---|---|---|
| 1 | 0.0–5.0s | Canonical hero: child LEFT tracing a glowing A, laptop RIGHT drawing it back, webcam visible. | "They control the learning by moving." |
| 2 | 5.0–9.5s | Close, joyful: child completes the air-A, screen responds. | "Screen time that gets them moving." |
| 3 | 9.5–13.0s | Parent reassured nearby with a mug; child mid-gesture; screen responds. | "Screen time you feel good about." |
| 4 | 13.0–16.5s | Offer end-card (`DITA_06_offer`). | "7 days free · no card today" |

**Source clips kept for re-editing** (swap order, retime, add your own music/VO): `ai/clip_hero.mp4`, `ai/clip_demo.mp4`, `ai/clip_parent.mp4` — each ~5s, 9:16, with ambient audio baked in by the model.

**Audio:** currently muted with burned captions (Meta autoplays muted). To add a warm music bed + a gentle chime as each letter forms, drop the source clips into CapCut and re-export. Optional VO over shot 1: *"No app. No headset. Just their webcam — and their whole arm."*

**Regenerate / restyle:** `ai/overlay_statics.py` (statics) and `ai/build_video.sh` (the cut) are saved. Change a caption or colour and re-run. To regenerate the footage with a different child/room/letter, re-run the Higgsfield image→video prompts in those scripts' headers.

---

## VIDEO 2 — `Founder_Video_v01` (45s, self-shot, trust) — route → /parents

**Setup:** you, phone on a stand at eye level, natural home light, no script-reading cadence. Talk to the lens like a friend. One take is fine; cut the umms.

**Say (your own words, this is the beat sheet):**
1. (0–5s, hook) "I'm a parent, and I built Draw in the Air because I was tired of screen time feeling like a compromise."
2. (5–18s) "So I made the opposite kind of screen, one my kids have to stand up and move for. They draw and trace letters in the air using nothing but our laptop's webcam." → [cut to 3s b-roll of the air-letter / your child playing]
3. (18–32s) "No app to install, no headset, no accounts for them, and the camera never leaves the device." → [cut to 3s dashboard b-roll]
4. (32–42s, honest limit) "I'm not going to promise it makes your child a genius. It just makes the screen time you're already giving them something they move and learn through."
5. (42–45s, CTA) "Try Free Paint free, no sign-up. The link's right here." → end-card `DITA_10_try-now`.

**On-screen text beats:** "Made by a parent" → "Privacy by design" → "7 days free · no card today".
**Captions:** burn the whole thing (people watch founder videos muted too).

---

## VIDEO 3 — `TryNow_Demo_v01` (15–20s, how-it-works) — route → /play

**Pure screen-capture + a hand. No talking head needed.**

| # | Time | Screen action | On-screen text |
|---|---|---|---|
| 1 | 0–3s | Browser open on drawintheair.com/play | "How it works (it's 3 steps)" |
| 2 | 3–7s | "1. Open your browser" → the page is already there | "1. Open your browser" |
| 3 | 7–11s | "2. Allow the camera" → permission prompt + allow | "2. Allow the camera" |
| 4 | 11–16s | "3. Wave to start" → child waves, Free Paint begins, hand draws a line | "3. Wave to start" |
| 5 | 16–20s | The line draws in the air; cut to logo + CTA | "That's it. No sign-up." → "Try it now" |

**How to capture:** screen-record the actual product (it's live and card-free) on a laptop, film a hand entering frame, or do a clean screen capture of /play with the mouse standing in for the hand. Export 9:16 + 1:1.

---

## Captions / safe-area (all videos)
- Keep all text in the centre 80% (Meta UI covers top ~12% and bottom ~20% on Reels/Stories).
- Caption font: Outfit ExtraBold, white, 1px soft shadow or a 60%-opacity ink pill behind for legibility on bright shots.
- End every video with the same 2s offer card so the CTA + "no card" is unmissable.

---

## LANDING VARIANTS — exact build spec for the developer

Two variants to A/B in Phase 2. Route the "try it now" creatives (Video 1, Video 3, Static `10_try-now`) → **Variant B**; route trust/offer creatives (Founder video, Static `01_air-letter`, `06_offer`) → **Variant A**.

### Variant A — `/parents` (full landing, minor copy tune)
Already built. Change only the hero block:
- **H1:** "Screen time that gets them moving."
- **Sub:** "...that you don't feel guilty about. Children aged 3 to 7 draw, trace and count in the air through your webcam. No app. No headset. The camera never leaves your device."
- **Primary CTA button:** "Try it now" → routes to `/play` (NOT signup).
- **Secondary link under it:** "or start your 7 days free (no card) →" → `/parent/signup`.
- **Trust strip (one line, mute):** "No card today · Up to 2 children · Cancel anytime · Camera stays on your device."
- Keep the rest of the page (demo, why, how, dashboard, privacy, pricing, FAQ).

### Variant B — direct-to-`/play` with a conversion bar (NEW, ~1 hour dev)
Lands cold "try it now" traffic straight inside Free Paint, with a slim persistent top bar so the upgrade path is always visible. This tests the founder's hypothesis that removing the landing page lifts trial starts.

**Build:** add a dismissible top bar that renders only when `/play` is reached with a paid-traffic UTM (`utm_medium=paid_social`). Pseudo-spec:

```tsx
// src/components/PlayPromoBar.tsx  (render inside the /play route shell)
// Shows only for paid-social visitors; sticky top; does not block the canvas.
const isPaid = new URLSearchParams(location.search).get('utm_medium') === 'paid_social';
if (!isPaid || dismissed) return null;
return (
  <div className="play-promo-bar">  {/* fixed top, height 52px, cream bg, ink text, lavender CTA */}
    <span>Loving it? Keep their progress with 7 days free — no card.</span>
    <a href="/parent/signup?next=/parent/dashboard" className="btn btn-primary sm">Start free</a>
    <button aria-label="Dismiss" onClick={dismiss}>×</button>
  </div>
);
```
- Style with the Calm tokens (lavender #8A66F0 button, cream bar, ink text), 52px tall, non-blocking.
- Fire pixel `ViewContent` on /play load and `StartActivity` when a mode begins (already emitted internally as `mode_started` — mirror it).
- Success metric vs Variant A: trial-starts per click. Keep the winner after ~1,000 visits/variant.

---

## Tagging (so the ad buyer can wire it in one pass)

| Asset | Ad name = utm_content | Routes to | Landing variant |
|---|---|---|---|
| GuiltFlip_Video_v01 | `guiltflip_video_01` | /play | B |
| Founder_Video_v01 | `founder_video_01` | /parents | A |
| TryNow_Demo_v01 | `trynow_demo_01` | /play | B |
| DITA_01_air-letter | `airletter_static_01` | /parents | A |
| DITA_10_try-now | `trynow_static_01` | /play | B |
| DITA_06_offer | `offer_static_01` | /parent/signup | A |

UTM template: `?utm_source=meta&utm_medium=paid_social&utm_campaign=parent_prospecting&utm_content=[above]&utm_term=[audience]`.

---

*All copy matches the live product: 7-day card-free trial, $4.99/mo · $54.99/yr, up to 2 learners, on-device camera, no child accounts, browser-only. Central message: "Screen time you don't feel guilty about." Primary cold CTA: "Try it now" → /play.*
