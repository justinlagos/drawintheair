/**
 * Building Mode — pure FSM + session bookkeeping.
 *
 * Module-local singleton state, same pattern as sortAndPlaceLogic.ts so
 * the React shell can poll via setInterval and the onFrame callback can
 * read/mutate without prop drilling. The trade-off: only one build at
 * a time, which matches product reality.
 */

import { logEvent } from '../../../lib/analytics';
import {
    BUILDING_CATALOG,
    cloneObject,
    findObjectById,
} from './buildingWorlds';
import type {
    BuildObject,
    BuildSession,
    BuildType,
    BuildingPhase,
} from './buildingTypes';

// ─── State ────────────────────────────────────────────────────────────

let phase: BuildingPhase = 'reveal';
let currentObject: BuildObject | null = null;
let currentSession: BuildSession | null = null;
let revealEnteredAt = 0;
let completionEnteredAt = 0;
let pendingNarratorPhase: 'reveal' | 'completion' | null = null;

// ─── Accessors ────────────────────────────────────────────────────────

export function getPhase(): BuildingPhase { return phase; }
export function getCurrentObject(): BuildObject | null { return currentObject; }
export function getCurrentSession(): BuildSession | null { return currentSession; }
export function getRevealElapsedMs(): number {
    return phase === 'reveal' && revealEnteredAt > 0 ? Date.now() - revealEnteredAt : 0;
}
export function getCompletionElapsedMs(): number {
    return phase === 'completion' && completionEnteredAt > 0 ? Date.now() - completionEnteredAt : 0;
}
export function consumePendingNarrator(): 'reveal' | 'completion' | null {
    const p = pendingNarratorPhase;
    pendingNarratorPhase = null;
    return p;
}

// ─── Transitions ──────────────────────────────────────────────────────

/**
 * Kick off a new build. Defaults to the first object in the catalogue
 * if no id is given (Phase 0 has exactly one). Always resets all per-
 * piece state via `cloneObject` so a re-entry never inherits stale
 * grab/placed flags.
 */
export function startBuild(objectId?: string, buildType?: BuildType): void {
    const template = (objectId && findObjectById(objectId))
        ?? BUILDING_CATALOG[0];
    if (!template) {
        // Defensive — should never hit unless catalogue is empty in dev.
        console.warn('[building] no objects in catalogue; cannot start build');
        return;
    }

    currentObject = cloneObject(template);
    currentSession = {
        objectId: currentObject.id,
        buildType: buildType ?? currentObject.defaultBuildType,
        startedAt: Date.now(),
        attempts: 0,
        hesitationEvents: 0,
        abandoned: false,
    };
    phase = 'reveal';
    revealEnteredAt = Date.now();
    completionEnteredAt = 0;
    pendingNarratorPhase = 'reveal';

    logEvent('build_object_started', {
        game_mode: 'building',
        stage_id: currentObject.id,
        meta: {
            world: currentObject.world,
            build_type: currentSession.buildType,
        },
    });
}

/** Promote from reveal → interaction. Called by the React shell after a
 *  settle timer (1200ms) so all pieces have visibly drifted in. */
export function piecesSettled(): void {
    if (phase !== 'reveal') return;
    phase = 'interaction';
}

/** Promote from interaction → completion. Called by the snap engine
 *  caller when the last zone fills. */
export function allPiecesPlaced(): void {
    if (phase !== 'interaction' || !currentObject || !currentSession) return;
    phase = 'completion';
    completionEnteredAt = Date.now();
    currentSession.completedAt = Date.now();
    pendingNarratorPhase = 'completion';

    logEvent('build_object_completed', {
        game_mode: 'building',
        stage_id: currentObject.id,
        value_number: currentSession.completedAt - currentSession.startedAt,
        meta: {
            world: currentObject.world,
            build_type: currentSession.buildType,
            total_attempts: currentSession.attempts,
            hesitation_events: currentSession.hesitationEvents,
            time_to_first_snap_ms:
                currentSession.firstSnapAt
                    ? currentSession.firstSnapAt - currentSession.startedAt
                    : null,
        },
    });
    // Mirror to legacy mode_completed so dashboards that aggregate by
    // mode_completed don't go quiet for Building until the new event
    // makes it into reporting.
    logEvent('mode_completed', { game_mode: 'building', stage_id: currentObject.id });
}

/** Promote from completion → outro (sandbox prompt or next-build). */
export function completionAnimationFinished(): void {
    if (phase !== 'completion') return;
    phase = 'outro';
}

/** Called when the user exits before completion. */
export function abandon(reason: string): void {
    if (!currentObject || !currentSession || currentSession.completedAt) return;
    currentSession.abandoned = true;
    logEvent('build_abandoned', {
        game_mode: 'building',
        stage_id: currentObject.id,
        meta: {
            world: currentObject.world,
            build_type: currentSession.buildType,
            progress_pct: progressPct(),
            reason,
        },
    });
}

/** Reset state — called on mode unmount. */
export function resetBuildingState(): void {
    phase = 'reveal';
    currentObject = null;
    currentSession = null;
    revealEnteredAt = 0;
    completionEnteredAt = 0;
    pendingNarratorPhase = null;
}

// ─── Helpers ──────────────────────────────────────────────────────────

export function progressPct(): number {
    if (!currentObject) return 0;
    const total = currentObject.snapZones.length;
    if (total === 0) return 0;
    const filled = currentObject.snapZones.filter(z => z.filled).length;
    return Math.round((filled / total) * 100);
}

export function recordAttempt(): void {
    if (currentSession) currentSession.attempts += 1;
}

export function recordHesitation(): void {
    if (currentSession) currentSession.hesitationEvents += 1;
}

export function markFirstSnap(): void {
    if (currentSession && !currentSession.firstSnapAt) {
        currentSession.firstSnapAt = Date.now();
    }
}
