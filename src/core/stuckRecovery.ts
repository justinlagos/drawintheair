/**
 * Stuck-Recovery Service
 *
 * Cross-mode service that watches for kids who go idle inside a stage and
 * triggers progressively softer help. Designed to be called from inside a
 * mode's per-frame logic without the mode having to manage its own timers.
 *
 * Mental model:
 *   - Modes call `recordProgress(modeId)` whenever the kid does anything
 *     meaningful inside a stage (correct dwell, correct stroke segment,
 *     correct letter, correct bin drop, etc.).
 *   - Modes call `tick(modeId, now)` once per frame. The tick computes how
 *     long the kid has been idle and returns the current `RecoveryState`
 *     (NONE → SOFT → MEDIUM → STRONG) so the mode can render the
 *     corresponding scaffolding (ghost trail, voice cue, helper).
 *   - On stage transitions, modes call `resetStage(modeId)`.
 *
 * The thresholds match the analytics definition of `stuck_moment` (30 s)
 * so the dashboard's stuck-rate metric and the in-product helper fire on
 * the same trigger. SOFT and MEDIUM are pre-stuck nudges — they fire
 * before the dashboard counts the moment as stuck, giving us a chance to
 * recover the kid before it lands as a metric.
 *
 * No React state, no observers — modes drive their own render off the
 * returned level. The service only owns the per-mode idle timer.
 */

import { logEvent } from '../lib/analytics';

export type RecoveryLevel = 'NONE' | 'SOFT' | 'MEDIUM' | 'STRONG';

const SOFT_AFTER_MS   = 5_000;   // first nudge — visual ghost
const MEDIUM_AFTER_MS = 12_000;  // second nudge — voice cue
const STRONG_AFTER_MS = 30_000;  // matches `stuck_moment` definition — animated helper

interface ModeRecord {
    lastProgressAt: number;
    stageStartedAt: number;
    stuckEventLogged: boolean;
    lastLevel: RecoveryLevel;
}

const modes = new Map<string, ModeRecord>();

const ensure = (modeId: string, now: number): ModeRecord => {
    let rec = modes.get(modeId);
    if (!rec) {
        rec = {
            lastProgressAt: now,
            stageStartedAt: now,
            stuckEventLogged: false,
            lastLevel: 'NONE',
        };
        modes.set(modeId, rec);
    }
    return rec;
};

/**
 * Call when the kid makes any forward progress inside a stage. Resets the
 * idle clock and clears any in-flight recovery state for this mode.
 */
export const recordProgress = (modeId: string, now: number = Date.now()): void => {
    const rec = ensure(modeId, now);
    rec.lastProgressAt = now;
    rec.stuckEventLogged = false;
    rec.lastLevel = 'NONE';
};

/**
 * Call once per frame from inside the mode's per-frame logic. Returns the
 * current recovery level. The level is monotonic within a single idle
 * stretch — once we hit MEDIUM we stay there (or escalate) until the kid
 * makes progress or the stage is reset.
 */
export const tick = (modeId: string, now: number = Date.now()): RecoveryLevel => {
    const rec = ensure(modeId, now);
    const idleMs = now - rec.lastProgressAt;

    let level: RecoveryLevel = 'NONE';
    if (idleMs >= STRONG_AFTER_MS)      level = 'STRONG';
    else if (idleMs >= MEDIUM_AFTER_MS) level = 'MEDIUM';
    else if (idleMs >= SOFT_AFTER_MS)   level = 'SOFT';

    // Fire the `stuck_detected` analytics event exactly once per idle stretch
    // when we reach STRONG. The dashboard's stuck rate counts these.
    // (Existing schema name — keep as-is so the RPC continues to aggregate.)
    if (level === 'STRONG' && !rec.stuckEventLogged) {
        rec.stuckEventLogged = true;
        try {
            logEvent('stuck_detected', {
                game_mode: modeId,
                meta: {
                    idle_ms: idleMs,
                    since_stage_start_ms: now - rec.stageStartedAt,
                },
            });
        } catch {
            // Best-effort — analytics failures must not break gameplay.
        }
    }

    rec.lastLevel = level;
    return level;
};

/**
 * Returns whether the recovery level has just transitioned upward this
 * frame — useful for one-shot effects like "speak the voice cue once when
 * MEDIUM is reached" without the mode needing to track previous state.
 */
export const justEscalatedTo = (modeId: string, level: RecoveryLevel, now: number = Date.now()): boolean => {
    const rec = ensure(modeId, now);
    // Snapshot the previous-frame level BEFORE we tick — tick() mutates
    // rec.lastLevel as part of normal operation, so reading it after the
    // tick would always equal the current level.
    const previousLevel = rec.lastLevel;
    const current = tick(modeId, now);
    if (current !== level) return false;
    return previousLevel !== level;
};

/**
 * Call on stage start. Resets idle and stuck-event state but keeps the
 * record so we don't churn the Map.
 */
export const resetStage = (modeId: string, now: number = Date.now()): void => {
    const rec = ensure(modeId, now);
    rec.lastProgressAt = now;
    rec.stageStartedAt = now;
    rec.stuckEventLogged = false;
    rec.lastLevel = 'NONE';
};

/**
 * Debug / testing helper — pull the current snapshot for a mode.
 */
export const inspect = (modeId: string): { idleMs: number; level: RecoveryLevel; stuckLogged: boolean } | null => {
    const rec = modes.get(modeId);
    if (!rec) return null;
    const now = Date.now();
    return {
        idleMs: now - rec.lastProgressAt,
        level: rec.lastLevel,
        stuckLogged: rec.stuckEventLogged,
    };
};
