/**
 * Building Mode, telemetry payload builders.
 *
 * Wraps `logEvent` so call sites stay clean and per-event payload shape
 * is centralised. Some events are debounced (piece_hovered, at most
 * once per 400ms per piece) so the analytics stream doesn't drown in
 * passive-cursor noise.
 *
 * Event names extended in src/lib/analytics.ts → EventName union.
 */

import { logEvent } from '../../../lib/analytics';
import type { BuildObject } from './buildingTypes';

// ─── Debounce: piece_hovered ──────────────────────────────────────────

const HOVER_DEBOUNCE_MS = 400;
const lastHoverAt: Map<string, number> = new Map();

export function logPieceHovered(pieceId: string, role: string, dwellMs: number): void {
    const now = Date.now();
    const last = lastHoverAt.get(pieceId) ?? 0;
    if (now - last < HOVER_DEBOUNCE_MS) return;
    lastHoverAt.set(pieceId, now);
    logEvent('piece_hovered', {
        game_mode: 'building',
        meta: { piece_id: pieceId, semantic_role: role, dwell_ms: Math.round(dwellMs) },
    });
}

// ─── Pass-throughs ────────────────────────────────────────────────────

export function logPieceGrabbed(object: BuildObject, pieceId: string): void {
    logEvent('piece_grabbed', {
        game_mode: 'building',
        stage_id: object.id,
        meta: { piece_id: pieceId },
    });
}

export function logPlacementAttempt(
    object: BuildObject,
    pieceId: string,
    targetZoneId: string | null,
    distance: number,
): void {
    logEvent('placement_attempt', {
        game_mode: 'building',
        stage_id: object.id,
        meta: {
            piece_id: pieceId,
            target_zone_id: targetZoneId,
            distance_to_target: Number(distance.toFixed(4)),
        },
    });
}

export function logSuccessfulSnap(
    object: BuildObject,
    pieceId: string,
    zoneId: string,
    timeSinceGrabMs: number,
    wasFirstAttempt: boolean,
): void {
    logEvent('successful_snap', {
        game_mode: 'building',
        stage_id: object.id,
        meta: {
            piece_id: pieceId,
            target_zone_id: zoneId,
            time_since_grab_ms: timeSinceGrabMs,
            was_first_attempt: wasFirstAttempt,
        },
    });
}

export function logWrongPieceAttempt(
    object: BuildObject,
    pieceId: string,
    attemptedZoneId: string,
    attemptedZoneRole: string,
): void {
    logEvent('wrong_piece_attempt', {
        game_mode: 'building',
        stage_id: object.id,
        meta: {
            piece_id: pieceId,
            attempted_zone_id: attemptedZoneId,
            attempted_zone_role: attemptedZoneRole,
        },
    });
}

export function logHesitationDetected(
    object: BuildObject,
    availablePieceIds: string[],
): void {
    logEvent('hesitation_detected', {
        game_mode: 'building',
        stage_id: object.id,
        meta: { available_pieces: availablePieceIds },
    });
}

export function logAssistEscalated(
    object: BuildObject,
    pieceId: string,
    newTolerance: number,
): void {
    logEvent('assist_escalated', {
        game_mode: 'building',
        stage_id: object.id,
        meta: { piece_id: pieceId, new_tolerance: Number(newTolerance.toFixed(3)) },
    });
}

export function logBuildWorldSelected(worldId: string): void {
    logEvent('build_world_selected', {
        game_mode: 'building',
        meta: { world_id: worldId },
    });
}

/** Reset all debounce maps. Called on mode unmount. */
export function resetTelemetryDebounce(): void {
    lastHoverAt.clear();
}
