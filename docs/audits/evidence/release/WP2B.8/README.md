# WP2B.8 Measurement repair (DIA-030, DIA-032)

Branch `wp/2b8` on top of `release/new-term` (d6a6646). Date: 2026-09-07.

**Scope note for the founder:** this package is required before any
progression or efficacy claim is made from learning data. It is NOT a
condition of the release itself. It ships with the release because the
client change is small and additive, but nothing in Gate 3 waits on it.

## What was wrong (verified against production, read-only)

Read-only SELECTs against project fmrsfjxwswzhvicylaph, 7 Sept 2026, 120-day lookback.
Counts only; no names or free text were copied.

1. `learning_attempts` had one general-purpose writer: the `item_dropped`
   mirror in `src/lib/analytics.ts`. A second "win event" mirror existed
   but only fired when a parent had selected a child profile in the
   dashboard (`dita-selected-child` in sessionStorage). School and
   anonymous play produced no rows from any other event.
2. The activities that actually run on the deployed client do not emit
   `item_dropped`:
   - Tracing (game_mode `pre-writing`, playful engine, flag
     `tracingPlayfulUiV1` on by default): emits `tracing_letter_completed`
     with meta `{ tracing_engine, strokes }` and the activity id in
     `stage_id`. 962 events to 7 Sept. `item_dropped` for pre-writing
     stopped on 10 July (last legacy engine session).
   - Bubbles (game_mode `calibration`): emits `bubblepop_round_complete`
     with meta `{ score, target }` and `level-N` in `stage_id`.
     7287 events to 7 Sept. Never emitted `item_dropped`.
   - Result: `learning_attempts.max(occurred_at)` for pre-writing is
     10 July; for calibration 24 June (last child-bound session).
     `sort-and-place` still wrote rows to 25 Aug because it emits
     `item_dropped` correctly.
3. The other modes (balloon-math, rainbow-bridge, gesture-spelling,
   word-search, colour-builder) emit `item_dropped` with the full shape
   (`itemKey`, `isCorrect`, expected/actual). Their pipeline works, but
   none has had a `mode_started` since 25 June, so their rows stopped for
   a menu reason, not a writer reason. Word-search incorrect drags carry
   no `itemKey` (753 of 1358 events) and were never mirrored.
4. DIA-032 idle timeout: the audit said PR #8 (`1f142b7`,
   `feat/attempt-idle-timeout`) was undeployed. Checked with git:
   `1f142b7` IS an ancestor of the production commit `6a81fdf` and its
   logic (`shouldTimeoutAttempt`, `checkAttemptIdleTimeout` in the
   heartbeat, `IDLE_PASSIVE_EVENTS`, `lastActivityAt` reset in
   `logEvent`, `dita_idle_timeout_ms` kill switch, tests in
   `tests/attempt-id.test.ts`) is already present, verbatim, on
   `release/new-term` via the master sync (cca72f5).
   `git cherry-pick 1f142b7` onto this branch produces an empty commit.
   Nothing to port. The audit register entry was stale on this point
   (standing rule 8: deployed commit beats findings files).

## What changed

| File | Change |
|---|---|
| `src/lib/attemptMirror.ts` | New. Pure mapping table `ATTEMPT_EVENT_MAP` (game_mode -> event -> attempt spec), `mapEventToAttempt()`, `sanitiseAttemptMeta()` with a scalar allow-list, `KNOWN_GAME_MODES`. No side effects, no imports from analytics. |
| `src/lib/analytics.ts` | In `logEvent`, after the existing `item_dropped` mirror: consult the table; when it returns an attempt, push a `learning_attempts` row into the existing `learningQueue` (same `ingest_learning_attempts` RPC, same event_uid idempotency, same offline persistence, fire-and-forget). Fires for every session, child bound or not. The older child-only win-event mirror is skipped for an event the table already wrote, so a child-bound session never gets two rows for one attempt. Added `readSelectedChildId()` helper and a test-only `peekLearningQueueForTests()`. |
| `tests/attempt-mirror.test.ts` | 26 tests: table covers every mode explicitly; per-mode mappings; no double count with item_dropped; privacy allow-list; technical key prefix agrees with `lios_is_technical_item_key()`; end to end through `logEvent` for anonymous sessions. |

No database change. No dashboard change. No new write path.

### The mapping table (summary)

| game_mode | event | item_key | was_correct | item_kind | notes |
|---|---|---|---|---|---|
| pre-writing | tracing_letter_completed | stage_id (activity id) | true | content | Only when `meta.tracing_engine` is present (playful engine). Legacy engine mirrors via its own item_dropped. |
| calibration (Bubbles) | bubblepop_round_complete | stage_id (`level-N`) | true | content | No per-miss event exists; misses stay in stage_completed meta. |
| word-search | item_dropped without itemKey | `stage_<chapter>` | meta.isCorrect | technical | Incorrect drag has no target word; engagement evidence only. Correct drags already go through the item_dropped mirror. |
| building | successful_snap | meta.piece_id | true | content | expected/actual = target_zone_id. |
| building | wrong_piece_attempt | meta.piece_id | false | content | actual = attempted_zone_id. |
| sort-and-place, colour-builder, balloon-math, rainbow-bridge, gesture-spelling | (none) | | | | item_dropped mirror is the writer; derived win events deliberately not mapped. |
| free, tutorial | (none) | | | | Open-ended; no item, no correctness. |

Meta on mirrored rows is restricted to `ATTEMPT_META_ALLOWLIST` scalars
(stage_index, strokes, score, target, timings, zone ids, traffic tags,
attempt_id) plus `_mirror_source` and `_item_kind`. Strings capped at 64
characters. Words, letters typed as free text, gesture blocks and any
nested object are dropped.

### Behaviour change for parent dashboards (data only, no code)

`bump_child_activity_summary()` keys on game_mode and counts rows. For a
child-bound session the number of rows per tracing or bubble event is
unchanged (one), but the row is now `content` keyed by the activity id
instead of `technical` keyed by the event name. Word-search incorrect
drags now produce a was_correct=false row where before they produced
none; this matches what sort-and-place and the other item_dropped modes
already do.

## How verified

Run on wp/2b8, Node 20, after `npm ci`:

- `npm run type-check`: pass
- `npm run lint`: 0 errors, 162 warnings (ratchet unchanged, no warnings added)
- `npm test`: 27 files, 282 tests, all pass (26 new)
- `npm run build`: pass (client + SSR + prerender 93 routes)
- `./scripts/check-task.sh`: all local checks passed

## How to roll back

Revert the single commit on this branch. It is additive client code;
no migration, no RPC change. Rows already written stay (they are
correct data). If a specific mapping misbehaves, delete that entry from
`ATTEMPT_EVENT_MAP` and the mode falls back to the previous behaviour.

## Founder-only steps

None for this package. No Vercel or Supabase dashboard action.

## Verification SQL (read-only, run after Gate 3)

Attempts per mode per day since the deploy. Expect rows for
`pre-writing` and `calibration` on any day with play, with
`_mirror_source` set and `child_profile_id` mostly null for school
and anonymous play.

```sql
select
  (occurred_at at time zone 'utc')::date as day,
  game_mode,
  meta->>'_mirror_source'                 as source_event,
  coalesce(meta->>'_item_kind', 'content') as item_kind,
  count(*)                                 as attempts,
  count(*) filter (where was_correct)      as correct,
  count(distinct session_id)               as sessions,
  count(*) filter (where child_profile_id is not null) as child_bound
from learning_attempts
where occurred_at >= date '2026-09-08'   -- replace with the Gate 3 deploy date
group by 1, 2, 3, 4
order by 1 desc, 2, 3;
```

Orphan check for DIA-032 (attempts that reached a terminal outcome):

```sql
with starts as (
  select meta->>'attempt_id' as attempt_id, game_mode, occurred_at
  from analytics_events
  where event_name = 'mode_started' and occurred_at >= date '2026-09-08'
), ends as (
  select distinct meta->>'attempt_id' as attempt_id
  from analytics_events
  where event_name in ('mode_completed','mode_abandoned','mode_switched')
    and occurred_at >= date '2026-09-08'
)
select s.game_mode,
       count(*)                                        as started,
       count(*) filter (where e.attempt_id is null)    as orphaned,
       round(100.0 * count(*) filter (where e.attempt_id is null) / count(*), 1) as orphan_pct
from starts s left join ends e using (attempt_id)
group by 1 order by 1;
```

Pass condition for a later efficacy claim: orphan_pct well below the
38% measured in the audit (tutorial excluded, it has no activity), and
`learning_attempts` rows present for every mode that had a
`mode_started` on the same day.

## Findings logged (not fixed)

See `docs/audits/RELEASE_FINDINGS_LOG.md` entries added by this package.
