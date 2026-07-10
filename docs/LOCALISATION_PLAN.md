# Localisation Plan — Draw in the Air (v2)

**Date:** 2026-07-07 (v2 — supersedes 2026-07-05 v1)
**Status:** Approved scope, not yet started
**Owner:** Justin

v2 incorporates a second independent repo audit that corrected v1 in four places, each re-verified against this working tree on 2026-07-07: the multi-stroke tracing engine already exists; solo and classroom run different mode implementations; classroom language must be an explicit `sessions` column (not "JSON payload"); parents need their own interface locale.

## 1. Locked decisions

- **Scope:** Full localisation — UI, spoken instructions, AND learning content (Arabic letter tracing, Chinese character tracing, per-language word lists).
- **Launch model:** All seven languages ship together in one release. Internally staged (§7).
- **Audio:** Browser TTS (Web Speech API) with locale-aware voice selection. See §6.1 for the Afrikaans/Swahili exception.
- **Variants:** es-ES, fr-FR, pt-PT, af-ZA, sw (Standard Swahili), ar (Modern Standard Arabic), zh-CN (Simplified, Mandarin voice). en-GB remains the base locale.
- Locale codes are a **closed TypeScript union** (`SupportedLocale`), BCP-47, validated everywhere — never free-form strings.

## 2. Verified current state (re-audited 2026-07-07)

| Area | Fact |
|---|---|
| i18n framework | **None.** No i18next/lingui; no locale files; no `t()`; `index.html` hardcodes `lang="en"`; nothing sets `document.documentElement.lang/dir` |
| **Tracing engines — TWO exist** | Modern: `src/features/modes/tracing/` — `tracingStrokeModel.ts` defines **ordered multi-stroke** activities (`TracingStroke` with id, ordered points, start/end), stroke-order rules documented in-file; `tracingActivities.ts` has 41 activities (warm-up, 4 shapes, A–Z, 0–9). Legacy: `src/features/modes/preWriting/letterPaths.ts` — single-stroke A–Z approximations |
| **Solo vs classroom split** | `src/App.tsx` (~618–625): flag-gated — `MagicCanvasMode` / `TracingModePlayful` when on, legacy `FreePaintMode` / `PreWritingMode` when off. `src/pages/classmode/StudentClassClient.tsx` (~650) and `StudentGameScreen.tsx` (~118) hardcode **legacy** `FreePaintMode` / `PreWritingMode`. Same activity, two implementations, two string sets |
| Strings | ~1,500+ hardcoded English literals across mode components, canvas render functions (`ctx.fillText('START', …)`), `*Logic.ts`/`*Stages.ts` data files, onboarding, teacher/parent/admin pages, landing |
| Narrator | `src/core/narrator.ts` — Web Speech API; 7 events × 3 English lines; voice picker English-only with `en` fallback; modes also pass dynamic English text to `narrateText()` (Rainbow Bridge, Gesture Spelling) |
| Recorded audio | None — no narrator mp3/wav/ogg assets; `TactileAudioManager.ts` earcons are procedural and language-neutral |
| Word Search | `wordSearchWords.ts` ~600 English word entries in 25 categories; generator/logic use **code-unit** indexing (`word[i]`, `split('').reverse()`) — not grapheme-safe; English filler-letter distribution; canvas grid text |
| Phonics | `src/seo/seo-config.ts` `PHONICS` — English A–Z sounds/words/emoji |
| RTL | None. Only `direction: rtl` is a landing-CSS layout trick, immediately reset to LTR |
| Fonts | Outfit + Nunito + Fredoka (index.html), Fraunces (dita2.css); Tailwind sans = Nunito; no Arabic/CJK coverage |
| DB | No locale column anywhere. `parent_profiles` exists (migration 0004). `sessions` anon reads are **column-restricted** (migration `0022_session_read_hardening.sql` explicit `grant select (…)` lists) and hydrated via `class_get_session` RPC |
| Data access | Custom wrappers `dbSelect`/`dbInsert`/`dbUpdate`/`callRpc` (`src/lib/supabase.ts`), not SDK `.from()`. Client-referenced tables: analytics_events, child_profiles, class_children, learning_attempts, parent_controls, round_scores, session_activities, session_students, sessions, stripe_price_map, teacher_profiles |
| Settings/state | AuthContext + ParentContext (child in sessionStorage `dita-selected-child`); assorted localStorage keys; no language key, no central store |
| Landing | Root route = `src/pages/Landing.tsx` via `main.tsx` (NOT the static `landing.html`); build runs `scripts/prerender-seo.mjs` |
| Commands | `npm run type-check`, `lint`, `test` (vitest — no e2e runner), `validate`, `build`, `./scripts/check-task.sh` |

## 3. Locale set

| Locale | Script | Direction | Tracing content | Browser TTS |
|---|---|---|---|---|
| en-GB (base) | Latin | LTR | existing 41 activities | Excellent |
| es-ES | Latin | LTR | A–Z + Ñ | Good |
| fr-FR | Latin | LTR | A–Z | Good |
| pt-PT | Latin | LTR | A–Z | Good |
| af-ZA | Latin | LTR | A–Z | **Poor/absent — §6.1** |
| sw | Latin | LTR | A–Z | **Poor/absent — §6.1** |
| ar (MSA) | Arabic | **RTL** | 28 letters, isolated forms first | Good (ar-SA/ar-EG common) |
| zh-CN | Han (Simplified) | LTR | 一–十 + ~20 starter characters, stroke-order | Good |

## 4. Architecture

### 4.1 Framework
`i18next` + `react-i18next` behind a typed wrapper:

```
src/i18n/
  config.ts  localeTypes.ts (SupportedLocale union)  localeResolution.ts
  LocaleProvider.tsx  fontLoader.ts  speechLocales.ts
  resources/{en-GB,es-ES,fr-FR,pt-PT,af-ZA,sw,ar,zh-CN}/
```

Namespaces: `common`, `onboarding`, `menu`, `modes.<name>` (one per mode), `teacher`, `parent`, `admin`, `marketing`, `narrator`. **Lazy-load per active locale** — Chromebooks must never download 8 languages. Typed keys so `type-check` catches missing/renamed keys. Learning datasets (word lists, tracing paths, phonics) are **typed content modules per locale**, not UI JSON — they carry pedagogy and gameplay behaviour.

### 4.2 Language resolution — per role, one authority each
- **Public/marketing:** URL locale → saved visitor locale → `navigator.languages` → en-GB
- **Parent dashboard:** `parent_profiles.preferred_locale` → local fallback → browser → en-GB
- **Solo learner:** selected child `preferred_learning_locale` → parent-selected play locale → browser → en-GB
- **Teacher dashboard:** `teacher_profiles.preferred_locale` → browser → en-GB
- **Classroom learner:** `sessions.learning_locale` → en-GB. **Authoritative once joined** — pushed like any other session state, idempotent, survives refresh/reconnect via `class_get_session` hydration. No child-facing control can change it mid-activity.

This separation is deliberate: a Spanish-speaking parent can run a Spanish dashboard while their child plays in English; an English-speaking teacher can run an Arabic learner session.

### 4.3 Database (additive, reversible, RLS-preserving)
```
parent_profiles.preferred_locale            text not null default 'en-GB'
teacher_profiles.preferred_locale           text not null default 'en-GB'
child_profiles.preferred_learning_locale    text not null default 'en-GB'
sessions.learning_locale                    text not null default 'en-GB'
```
All with a supported-locale CHECK constraint. **`sessions.learning_locale` is not just a column add:** migration 0022 gives anon a column-restricted `grant select (…)` on `sessions` — the new column must be added to that grant list AND returned by `class_get_session`, or students silently never receive it. Touchpoints: `SessionRow` type (`src/features/classmode/conductor/types.ts`), teacher session creation, RPC, realtime update processing, student refresh/reconnect hydration, analytics session context. Old clients must treat the field as optional (cross-version classroom test in §9).

### 4.4 RTL (Arabic)
- Set `<html lang dir>` from active locale at boot.
- Logical CSS properties / Tailwind logical utilities on Arabic-visible surfaces; audit-driven, not a blanket rewrite. Review nav, forms, tables, modals.
- **Canvas ignores `dir`.** Verified canvas-text sites needing locale-aware font/align/position: `wordSearchRender.ts`, `sortAndPlaceLogic.ts`, `balloonMathLogic.ts`, `gestureSpellingLogic.ts`, `rainbowBridgeLogic.ts`, `tracingLogicV2.ts`, `tracingRenderer.ts`.
- **Never mirror gameplay coordinates or the webcam feed for RTL.** Hand-tracking space stays identical; only linguistic layout mirrors.

### 4.5 Fonts
Noto Sans Arabic (ar), Noto Sans SC (zh-CN), loaded only for the active locale (self-hosted subsets in `public/fonts/` preferred). Nunito/Outfit cover Latin incl. accents. Canvas `fillText` font stacks must include the loaded face for ar/zh.

### 4.6 Narrator / TTS
Per-locale speech config:
```ts
interface LocaleSpeechConfig {
  appLocale: SupportedLocale;
  speechLocales: readonly string[];        // e.g. ['ar-SA','ar-EG']
  voiceNamePreferences: readonly RegExp[]; // named neural voices per language
  recordedAudioAvailable: boolean;
}
```
Fallback ladder: recorded cue (where provided) → matching browser voice → visual instruction + earcon → silence. **Never an English voice speaking translated text.** Both speech layers move to translations: curated `NARRATOR_LINES` (21 lines) AND dynamic `narrateText()` callers (Rainbow Bridge, Gesture Spelling pass generated English today). Keep the documented `public/audio/cues/` upgrade path.

### 4.7 Analytics
`locale` property on analytics events (`src/lib/analytics.ts`) and session context from day one. Not personal data; keep out of anonymous-learner identifiers.

## 5. Content workstreams

### 5.0 Mode reconciliation (PREREQUISITE — biggest risk, was missed in v1)
Classroom children currently get legacy `FreePaintMode`/`PreWritingMode` while solo (flag on) gets `MagicCanvasMode`/`TracingModePlayful`. Extracting strings before reconciling means translating two implementations of the same activity and shipping the old experience to classrooms in 8 languages. Before extraction:
1. Decide the canonical implementation per activity (presumably the playful/magic pair — align with the Trace Mode reconciliation sprint already in flight; docs/ and branch `fix/tracing-classroom-reconciliation`).
2. Route classroom (`StudentClassClient.tsx`, `StudentGameScreen.tsx`) to the canonical modes behind the same flags as solo.
3. Confirm which legacy files remain reachable; localise only reachable code.
**Exit condition:** each activity ID resolves to one implementation across solo and classroom.

### 5.1 String extraction (after 5.0)
Pseudo-locale `en-XA` (accented, +40% length) proves extraction before translation. Extraction must cover **DOM copy AND canvas-drawn copy AND logic/data files** — JSX alone leaves a large share of the learner experience in English. Order: menu + onboarding → live learner modes → canvas copy → narrator → parent → teacher + class console → marketing/SEO → admin (may stay English v1). Also: `src/lib/parent/parentReport.ts` generates hardcoded-English HTML reports.

### 5.2 Tracing: extend the existing multi-stroke engine (NOT a rewrite — v1 was wrong)
`tracingStrokeModel.ts` already provides ordered strokes, start/end points, per-stroke progression. Required extensions:
- Activity metadata: `script: 'latin' | 'arabic' | 'han'`, `grapheme: string`, `speechKey`, `contentLocale` — don't overload the Latin `label`.
- Engine test coverage for: right-to-left stroke travel, short dots/detached marks (Arabic), very short strokes, adjacent repeated strokes, stroke-order strictness for Hanzi, per-script completion tolerance.
- Retire or bypass legacy `preWriting/` data (`letterPaths.ts`, `tracingContent.ts`) as part of 5.0.
Feature-flagged; drawing feel and latency must not regress (measure, don't eyeball; full gesture test matrix).

### 5.3 Arabic tracing content
28 letters, **isolated forms** first (standard for early learners). Stroke data authored right-to-left with correct order/direction; reviewed by a native early-years specialist, not traced from a font.

### 5.4 Chinese tracing content
Numbers 一–十 + ~20 starter pictographs (人 口 日 月 山 水 火 大 小 …), stroke counts ≤4. Source stroke data from Make Me a Hanzi / Hanzi Writer (**verify licence + attribution before vendoring**); convert via a `scripts/` tool into `TracingActivity` format. Stroke order and direction enforced — pedagogically load-bearing.

### 5.5 Word Search per language
Engine work first (all locales): replace code-unit indexing (`word[i]`, `split('')`) with grapheme segmentation (`Intl.Segmenter`); locale-specific alphabets + filler-letter frequency; per-language diacritic policy encoded, not guessed (es: Ñ is a distinct grid letter, É→E fine; fr/pt: strip diacritics; af/sw: ASCII-safe).
- **Latin languages:** new age-banded word lists (~100–150 words each), native-reviewed. **Do not auto-translate the existing ~600 English entries** — build smaller language-specific sets.
- **Arabic:** isolated letterforms per cell (established convention), RTL primary direction, explicit canvas alignment, native pedagogical review.
- **Chinese:** replace with a **character-match activity** (find the target character among distractors) reusing selection mechanics — a letter grid doesn't map to a logographic script for pre-readers.
- Gesture Spelling's 52 English words need the same per-language treatment (or per-locale availability gating).

### 5.6 Maths / colours / categories
Balloon Math, Colour Builder, Sort & Place, Rainbow Bridge: number words, colour names, 70 Sort & Place item/bin labels, dynamic instruction templates — all via translations with native review for child-directed register. Chinese numbers connect tracing 三 ↔ hearing "sān" ↔ counting 3.

### 5.7 Phonics
English `PHONICS` in `seo-config.ts` must NOT become a universal object — phonics pedagogy differs structurally by language. Split into per-locale learning-content modules; letter names/sounds authored per language.

### 5.8 Curriculum honesty
EYFS/White Rose mapping is England-specific. Non-English surfaces make generic claims ("letter formation", "early counting") until per-market mapping is actually done. Not launch-blocking.

## 6. Honest constraint flags

### 6.1 Browser TTS for Afrikaans and Swahili
Desktop browsers generally ship no af/sw voices; classroom Chromebooks/laptops likely cannot speak them. Must be confirmed on real target devices (repo can't establish voice inventories). Decision needed:
1. Ship af/sw with text + earcons only (ladder in §4.6), stated plainly.
2. **Recommended:** pre-record the ~21 narrator lines + short instruction set for af/sw only (bounded cost) — the narrator matters most for pre-readers, and these are the target Africa markets (cf. docs/NIGERIA_RELIABILITY_REPORT.md).

### 6.2 Risk ranking (revised from v1)
1. **Duplicate solo/classroom implementations** (5.0) — translating before reconciling doubles work and ships the old experience to classrooms.
2. **Canvas localisation** — seven render sites with hardcoded English + font/align/grapheme handling.
3. **Classroom session authority** — the `sessions.learning_locale` grant/RPC/hydration chain (§4.3); miss one link and students silently stay English.
4. **Language-specific learning content** — Arabic/Hanzi stroke sets and per-language word lists need native early-years review; longest lead time.
The tracing engine itself dropped off this list — it exists and is multi-stroke.

### 6.3 QA concentration
One launch = 8 locales × modes × solo/classroom × parent/teacher × LTR/RTL × device classes at the end. Budget stage 7 properly; recruit ≥1 native early-years reviewer per language (blocking for stages 4–6 sign-off). AI-draft + native review acceptable for adult surfaces; child-facing text and phonics require native review without exception.

### 6.4 Bundle size
Per-locale lazy loading of translations AND fonts is mandatory. Add a per-locale chunk-size budget to the build check.

## 7. Sequencing (staged workstreams, one flag, one coordinated launch)

| Stage | Work | Exit condition |
|---|---|---|
| 0. Source of truth | Confirm prod branch/commit; reconcile solo↔classroom Free Paint + Tracing (5.0); confirm reachable legacy files; cut clean branch from verified base | One implementation per activity ID everywhere |
| 1. Foundation | i18next + typed wrapper, `SupportedLocale`, LocaleProvider, per-role resolution, lang/dir plumbing, font loader, pseudo-locale, analytics locale, flag `localisationV1` | Locale switch works on a proof surface; en byte-identical with flag off |
| 2. Data + classroom authority | Four migrations (§4.3) incl. 0022 grant list + `class_get_session`; profile types/reads/writes; parent + teacher settings UI; session create/hydrate/realtime | Teacher sets language → student receives, refreshes, reconnects, stays in it |
| 3. English extraction | Full extraction order (5.1) incl. canvas + narrator + dynamic speech; en-XA sweep | No learner-visible literals outside approved content modules |
| 4. Latin content | es/fr/pt/af/sw UI + content datasets + native review; af/sw recorded lines (if 6.1 opt 2); Word Search engine grapheme work | Native sign-off per language |
| 5. Arabic | RTL pass, canvas RTL, ar translations, Arabic word search, isolated-letter tracing set, ar voice selection | Works on a real classroom device: canvas, speech, refresh, classroom sync |
| 6. Chinese | Noto SC, zh-CN copy, Mandarin voice, Hanzi tracing content on existing engine, character-match activity | Native specialist reviews stroke order/direction, glyphs, voice |
| 7. QA + launch | Full matrix + automated suite (§9); one coordinated release | All eight locales signed off |

Stages 4–6 can overlap once 3 lands; 5 and 6 share the tracing metadata work from 5.2. Rough sizing: 0–3 ≈ half the project; 4 ≈ one-sixth; 5+6 ≈ one-quarter; 7 ≈ the rest.

## 8. Git & rollout safety

- Confirm the production base at stage 0 (memory says prod = `chore/professional-release-workflow` @ 4d9eef7, NOT master — reconfirm). Do **not** branch off `fix/commercial-day1-leaks` (unrelated uncommitted work).
- One feature flag `localisationV1`; en behaviour byte-identical while off.
- Migrations additive only, applied to prod only with explicit approval after deployed-client compatibility check; `learning_locale` optional in all payloads for old clients.
- Stage 0 must coordinate with the existing tracing-reconciliation branch rather than duplicate it.

## 9. Verification (real commands, per stage)

- `npm run type-check`, `npm run lint`, `npm run test`, full `./scripts/check-task.sh` before claiming any stage done (build catches prod-only tsc errors — known gotcha).
- New unit tests: locale validation + resolution precedence (parent/teacher/child/session), voice selection + no-English-voice fallback, grapheme segmentation, word normalisation per language, multi-stroke scoring for RTL/dot strokes, Arabic RTL grid coordinates, missing-key fallback, lazy bundle loading, analytics locale, old-client session payload compatibility.
- No e2e runner exists (vitest only) — add Playwright in stage 1 or run a scripted manual checklist per locale (wave → mode → complete).
- Manual matrix: low-res Chromebook; Windows Chrome/Edge; Safari; Arabic visual inspection; Chinese canvas glyphs; af/sw degradation behaviour; teacher+student in separate browser contexts incl. activity change without language drift and student reconnect; en unchanged with flag off.

## 10. Out of scope (explicitly)

- Connected/positional Arabic forms; Chinese beyond the starter set; pinyin instruction
- es-419 / pt-BR / zh-TW (structure supports later addition)
- Per-country curriculum alignment claims (5.8)
- Recorded narrator audio beyond af/sw (if chosen)
- Translating admin insights dashboards (English v1 acceptable)
- Localised SEO routes before the app locale system is stable (then: `/es/ /fr/ /pt/ /af/ /sw/ /ar/ /zh-cn/` + hreflang + locale-aware `prerender-seo.mjs`)

## 11. Open questions for Justin

1. §6.1 — af/sw narrator: text+earcons, or record the lines? (Recommended: record.)
2. Native early-years reviewers per language — who? (Blocks stages 4–6.)
3. Stage 0 canonical-mode decision: confirm playful/magic modes become the classroom implementations (aligns with the tracing reconciliation sprint).
4. Localised landing/SEO routes at launch or post-launch? (Plan assumes post-launch.)
5. Confirm production branch/base before stage 0 branches are cut.
