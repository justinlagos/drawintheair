# WP2B.5 evidence: entitlement and parental controls at mode mount (DIA-014)

Branch: `wp/2b5`. Date: 2026-09-07.

## What was wrong

The paywall (`evaluateModeGate`) and the parental controls (`evaluatePlayControls`)
were only applied in the menu: in `ModeSelectionMenu.attemptModeSelection` and in
`App.handleModeSelect`. `App.getInitialState` read `?screen=game&mode=<id>` and set
the app state straight to `'game'`, so a deep link mounted any paid mode with no
check at all, for anyone, and mounted a mode for a paused learner or one past the
daily limit.

## What changed

| File | Change |
|---|---|
| `src/features/menu/modeCatalog.ts` | New. The one list of mode ids with their tier. 8 listed modes, 5 premium (`gesture-spelling`, `sort-and-place`, `word-search`, `balloon-math`, `rainbow-bridge`), 3 free (`free`, `calibration`, `pre-writing`). The two URL-only modes (`colour-builder`, `building`) are marked premium so they fail closed. `isGameMode()` replaces the hand-written id list in `App.getInitialState`. |
| `src/features/menu/modeMountGuard.ts` | New. `evaluateModeMount(input)` is the pure decision made at the mount point. Returns `allow`, `pending` (paid mode, entitlement answer not yet in), `locked` (paid, no entitlement) or `blocked` (parental control, with reason). Order: class context allows; parental block wins; free modes never wait; paid modes wait for a checked answer then apply `evaluateModeGate`. |
| `src/features/menu/ModeMountHold.tsx` | New. Small "Getting ready" card shown during `pending` so the screen is never empty. |
| `src/App.tsx` | Calls `useParentAccess` and `evaluateModeMount` whenever `appState === 'game'`. A mode component, its per-frame logic (`activeLogic`), the countdown, the play-time accumulator and the mid-play daily-limit watcher now all key off `modeMounted` (game state AND decision `allow`). On `locked` it renders the existing `PremiumLockModal`; on `blocked` the existing `PlayBlockedNotice`; both dismiss to the menu through `handleExitToMenu`. On every mode entry it calls `recheck()` so an expired trial is noticed without a reload. |
| `src/features/menu/ModeSelectionMenu.tsx` | Tier now read from `modeCatalog` (`getModeTier`) instead of a second hard-coded list. `GameMode` type moved to the catalog and re-exported. Menu-level checks are kept: they show the prompt in place without leaving the menu and stop `mode_selected`/`mode_started` analytics firing for a refused mode. The mount guard is the backstop behind them. |
| `src/features/parent/useParentAccess.ts` | Adds `recheck()` (bumps a generation counter that re-runs the RPC). Same return shape plus the new field. |
| `src/features/parent/usePlayControls.ts` | Exposes the raw `controls` and `todaySeconds` behind the gate so the guard can compose them. |
| `tests/modeMountGuard.test.ts` | New. 14 tests, see below. |
| `docs/audits/RELEASE_FINDINGS_LOG.md` | Entries 11 to 13 (allowed_categories not wired, client-side cache, URL-only mode tiers). |

## Class Mode

Class Mode does not go through `App.tsx`. `src/pages/classmode/StudentGameScreen.tsx`
mounts modes itself from `sessionStorage` values that `StudentClassClient` writes
from the teacher's session row (`class_get_activity`). The teacher's account holds
the entitlement and the teacher chooses the activity, so neither the parent paywall
nor parent controls apply. That file is untouched. `evaluateModeMount` has a
`context: 'class'` branch that returns `allow` and is unit tested, so the same
function can be used there later without a second rule.

## Anonymous /play

Free modes (`free`, `calibration`, `pre-writing`) return `allow` before any network
answer is needed (`accessChecked` is ignored for free tiers), so anonymous play is
unchanged, including a deep link to a free mode.

## Unit tests (`tests/modeMountGuard.test.ts`)

- free mode, anonymous: allow
- free mode, anonymous, access not yet checked: allow
- paid mode, anonymous: locked
- paid mode, subscribed: allow
- paid mode, trial expired (signed in, hasAccess false): locked
- paid mode, answer pending: pending
- parental control paused: blocked (free and paid, even with subscription)
- parental control daily limit reached: blocked
- parental block wins over pending entitlement
- class mode student: allow (no entitlement, pending, or paused controls)
- catalog: 8 listed, 5 premium, 3 free by id
- catalog: URL-only modes are premium
- every paid mode id is refused for anonymous, every free id allowed
- `isGameMode` rejects unknown, `__proto__`, null, undefined

## Checks (run in the worktree, 2026-09-07)

- `npm ci`: ok
- `npm run type-check`: ok
- `npm run lint`: 0 errors, 162 warnings (ratchet is 162; baseline before this change was also 162, no warnings added)
- `npm test`: 27 files, 270 tests passed
- `npm run build`: ok (client, SSR and prerender)

## Manual test URLs for Gate 4

Run each in a fresh profile (no session storage), then repeat where noted.

| # | URL | Expected |
|---|---|---|
| 1 | `/play?screen=game&mode=word-search` (anonymous) | No game. `PremiumLockModal` ("Ask a grown-up", Word Search) over the toy-world background. "Pick another game" goes to the menu. No countdown, no drawing. |
| 2 | `/play?screen=game&mode=gesture-spelling`, `sort-and-place`, `balloon-math`, `rainbow-bridge` (anonymous) | Same as 1 for each paid mode. |
| 3 | `/play?screen=game&mode=free`, `calibration`, `pre-writing` (anonymous) | Mode mounts straight away with the 3 second countdown. Unchanged from before. |
| 4 | `/play?screen=game&mode=colour-builder` and `mode=building` (anonymous) | Lock modal (URL-only modes fail closed). |
| 5 | `/play?screen=game&mode=nonsense` | Free Paint mounts (unknown id falls back to `free`, as before). |
| 6 | Sign in as a parent with an active trial, select a learner, then open `/play?screen=game&mode=word-search` | Brief "Getting ready" card at most, then Word Search mounts. |
| 7 | Same parent after the trial has expired (or set `parent_subscription_state` to `expired` on staging) | Lock modal, not the game. |
| 8 | Parent dashboard: pause the learner. Then `/play?screen=game&mode=free` with that learner selected | `PlayBlockedNotice` "Playtime is paused". "Okay" goes to the menu. Applies to free modes as well as paid. |
| 9 | Parent dashboard: daily limit 1 minute. Play any mode for over a minute, then reload `/play?screen=game&mode=calibration` | "That's all for today" notice at mount. |
| 10 | Menu path: anonymous, tap a paid tile | Lock modal in the menu as before (menu-level check still present). |
| 11 | Class Mode: teacher starts a Word Search round, student joins at `/join` on an anonymous device | Round mounts for the student with no paywall or parental notice. |

## Rollback

Revert the single squash commit for `wp/2b5` on `master`. No database change,
no environment change, no migration. The `sessionStorage` key
`dita-parent-has-access` is unchanged in name and meaning.

## Founder actions by hand

None. No Vercel or Supabase dashboard change is needed for this package.
