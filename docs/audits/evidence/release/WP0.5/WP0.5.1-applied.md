# WP0.5.1 — Stale-session containment: APPLIED

**Applied:** 2026-08-20 12:55:46 UTC · **Authority:** founder written go, 6 conditions · **Result: 4 sessions ended, 29 presence flags cleared**

## Condition 1 — re-proof immediately before applying ✅
| Check | Result |
|---|---|
| Sessions created since baseline | **0** |
| Sessions total | 6 (unchanged) |
| Student activity in last 7 days | **0** |
| Newest student activity anywhere | 2026-07-14 (37 days ago) |
| `class_*` analytics events last 7 days | **0** |

## Condition 3 — `class_end_stale_sessions()` inspected and REJECTED ⚠️
Not used. Three independent disqualifications, all verified from its definition:

1. **Requires `auth.uid()`** — raises `42501 not authorised` when null. It cannot be invoked administratively at all; it only ever ends *the caller's own* sessions.
2. **Wrong predicate.** It targets `class_state IN ('lobby','between_activities')`. Actual class_state of the four stale sessions was `in_activity`, `lobby`, `lobby`, `in_activity` — so it would have ended **only 2 of 4, and would have missed `4ce5fd6c`, the session holding all 29 children.**
3. **Does not clear presence.** It never touches `session_students.is_connected`, so condition 5(c) could not have been met.

It also applies no age cutoff of any kind.

> **This changes DIA-007 Stage A.** The brief proposed scheduling this function. As written it would not have contained the actual exposure. The Stage A migration (condition 6) must **fix** the function — admin-invocable path, correct state predicate, age cutoff, presence clearing — not merely schedule it.

Explicit transaction used instead, per condition 3's fallback.

## Condition 2 — targeted, not blanket ✅
Four explicit session IDs, plus `status <> 'ended'` and `created_at < now() - interval '14 days'` guards. No unrestricted `WHERE status <> 'ended'`.

**Preconditions validated before writing:** `class_state='ended'` and `status='ended'` are both legal per the CHECK constraints; trigger `_check_active_has_activity` requires `current_activity_id IS NULL` whenever `class_state <> 'in_activity'` (satisfied); `session_students.is_active` is `GENERATED ALWAYS AS (is_connected)` — so `is_connected` was set and `is_active` never touched (this is the 428C9 bug that broke the heartbeat).

## Condition 4 — prior state captured ✅
| Session | Prior status | Prior class_state | Prior ended_at | Prior updated_at | Students |
|---|---|---|---|---|---|
| cc8f85fc… | lobby | in_activity | null | 2026-06-04 12:33:18 | 0 |
| 0b666ae4… | lobby | lobby | null | 2026-06-06 17:25:28 | 0 |
| ca2bf24e… | lobby | lobby | null | 2026-06-24 09:09:12 | 0 |
| **4ce5fd6c…** | **playing** | **in_activity** | null | 2026-07-15 07:38:55 | **29** |

All four now `status='ended'`, `class_state='ended'`, `current_activity_id=null`, `ended_at=2026-08-20 12:55:46`.

Per condition 4, reopening `4ce5fd6c` is **not** the normal rollback. It stays ended unless evidence shows the wrong session was affected — and the affected set matched the four verified IDs exactly.

## Condition 5 — verified AS THE ANON ROLE (`SET LOCAL ROLE anon`) ✅

**(a) sessions and rosters no longer anonymously readable**
| Anon-visible | Count |
|---|---|
| `sessions` | **0** |
| `session_students` | **0** |
| `class_children` | **0** |

**(b) old join codes cannot retrieve or join** — real RPC calls as anon, all four codes:
| Probe | Result (all 4 codes) |
|---|---|
| `session_lookup_by_code(code)` | **null** — no retrieval |
| `class_validate_join(code, …)` | **`{"valid": false, "code": "SESSION_NOT_JOINABLE"}`** |

*(Codes deliberately not reproduced here. `class_join` was NOT called — it performs writes; its rejection is established by `class_validate_join`, the gate that precedes it, and by its own status predicate.)*

**(c) presence flags** — anon sees **0** connected rows. Internally 29 of 30 cleared; see residual below.

## Condition 6 — cron NOT scheduled ✅
No cron entry created. Deferred to a versioned migration with rollback, rehearsed on staging — and that migration must now also repair the function (see condition 3).

## Post-state (internal)
| Check | Value |
|---|---|
| Sessions not ended | **0** |
| status/class_state mismatch | 0 |
| Session codes intact | 6/6 — **deliberately not nulled** (that is the operation breaking the purge; belongs to WP2A.1's retention contract) |
| Student rows still `is_connected` | **1** — see below |

## Residual logged, NOT fixed (out of approved scope)
One `session_students` row remains `is_connected = true`, belonging to session **`84352bde`** — already `ended` on 2026-07-14, and **the very row that blocks the retention purge every night**. It was outside the four approved IDs, so it was left untouched per the log-don't-fix rule. Anon cannot see it. Recommend sweeping it in WP2A.1, or approving a one-line scope extension.

## Rollback (available, not recommended)
Reversible for the three empty lobbies. Restore per-row from the prior-state table above. `4ce5fd6c` remains ended per condition 4.
