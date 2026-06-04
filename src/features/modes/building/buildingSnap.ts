/**
 * Building Mode, snap engine.
 *
 * The single most-tested system in this mode. Implements the visual-
 * promise-before-commit pattern, semantic eligibility filtering, and
 * silent assistance escalation described in the PRD (§8) and tech plan
 * (§5). Pure functions, no React, no DOM, no canvas, so the rules
 * can be unit-tested without a browser.
 *
 * Coordinate space: every (x, y) is normalised [0..1] across the canvas.
 */

import {
    ASSIST_ESCALATION,
    BASE_SNAP_TOLERANCE,
    type BuildPiece,
    type BuildType,
    type SnapEvent,
    type SnapZone,
} from './buildingTypes';

// ─── Eligibility ──────────────────────────────────────────────────────

/**
 * Returns the closest unfilled zone whose `acceptsRole` matches the
 * piece's role AND, if the zone has an `acceptsPieceIds` filter, whose
 * filter admits this piece.
 *
 * The semantic gate is what stops a wheel from snapping into the roof
 * zone just because the hand drifted close. Wrong-role releases are
 * surfaced separately (`wrongRole` events) so the narrator can react.
 */
export function nearestEligibleZone(
    piece: BuildPiece,
    hand: { x: number; y: number },
    zones: SnapZone[],
): { zone: SnapZone | null; distance: number } {
    let best: SnapZone | null = null;
    let bestDist = Infinity;
    for (const z of zones) {
        if (z.filled) continue;
        if (z.acceptsRole !== piece.role) continue;
        if (z.acceptsPieceIds && !z.acceptsPieceIds.includes(piece.id)) continue;
        const d = Math.hypot(hand.x - z.cx, hand.y - z.cy);
        if (d < bestDist) { bestDist = d; best = z; }
    }
    return { zone: best, distance: bestDist };
}

/**
 * Returns the closest unfilled zone of ANY role, regardless of
 * eligibility. Used on release to detect wrong-role attempts (so we can
 * surface them in telemetry and let the narrator help, instead of
 * silently dropping the piece back).
 */
export function nearestZoneAnyRole(
    hand: { x: number; y: number },
    zones: SnapZone[],
): { zone: SnapZone | null; distance: number } {
    let best: SnapZone | null = null;
    let bestDist = Infinity;
    for (const z of zones) {
        if (z.filled) continue;
        const d = Math.hypot(hand.x - z.cx, hand.y - z.cy);
        if (d < bestDist) { bestDist = d; best = z; }
    }
    return { zone: best, distance: bestDist };
}

// ─── Per-frame pull ───────────────────────────────────────────────────

export interface PullState {
    /** Where to render the piece this frame. */
    targetX: number;
    targetY: number;
    /** Soft-thmm should fire once per entry, caller manages debounce. */
    crossedAudioThreshold: boolean;
}

/**
 * Computes the eased position for a grabbed piece this frame, along
 * with the glow value to write back onto the zone. Does NOT mutate
 * piece state, caller decides whether to write the result.
 *
 * The pull starts at `tolerance × 1.4` (gentle nudge), strengthens
 * linearly toward `tolerance × 0.5` where the audio cue fires, and
 * caps at the tolerance itself where commit becomes possible.
 */
export function computePull(
    piece: BuildPiece,
    hand: { x: number; y: number },
    zone: SnapZone | null,
    buildType: BuildType,
): { pull: PullState; zoneGlow: number } {
    if (!zone) {
        return {
            pull: { targetX: hand.x, targetY: hand.y, crossedAudioThreshold: false },
            zoneGlow: 0,
        };
    }
    const tol = BASE_SNAP_TOLERANCE[buildType] * piece.assistTolerance;
    const dx = zone.cx - hand.x;
    const dy = zone.cy - hand.y;
    const dist = Math.hypot(dx, dy);

    // Glow halo, fades in across the outer 1.4× radius.
    const glow = dist < tol * 1.4 ? Math.max(0, 1 - dist / (tol * 1.4)) : 0;

    // Magnetic pull strength, 0 outside outer radius, eased up to 0.7
    // inside tolerance. Cap at 0.7 so the piece never feels like it's
    // been wrenched out of the child's hand.
    let pullStrength = 0;
    if (dist < tol) {
        const t = 1 - dist / tol;
        pullStrength = t * 0.7;
    } else if (dist < tol * 1.4) {
        const t = 1 - (dist - tol) / (tol * 0.4);
        pullStrength = t * 0.2;
    }
    const targetX = hand.x + dx * pullStrength;
    const targetY = hand.y + dy * pullStrength;

    const crossedAudioThreshold = dist < tol * 0.5;

    return {
        pull: { targetX, targetY, crossedAudioThreshold },
        zoneGlow: glow,
    };
}

// ─── On release ───────────────────────────────────────────────────────

/**
 * Decide what happens when the child releases pinch. Returns a SnapEvent
 * describing the outcome. The caller is responsible for actually
 * applying the commit (zone.filled, piece.placed) so this function
 * stays free of side effects and is easy to test.
 *
 * Rules:
 *  - released within tolerance of a SEMANTIC match  → snapped
 *  - released within tolerance of a WRONG-ROLE zone → wrongRole
 *    (narrator can hint, but no shame surfaced to child)
 *  - released anywhere else                         → returned
 *
 * Side-effect-free mutation: callers should pass the piece by reference
 * to `applyResolution` after a snap to update attempts + tolerance.
 */
export function resolveRelease(
    piece: BuildPiece,
    hand: { x: number; y: number },
    zones: SnapZone[],
    buildType: BuildType,
): SnapEvent {
    const eligible = nearestEligibleZone(piece, hand, zones);
    const tol = BASE_SNAP_TOLERANCE[buildType] * piece.assistTolerance;

    if (eligible.zone && eligible.distance < tol) {
        return {
            kind: 'snapped',
            pieceId: piece.id,
            zoneId: eligible.zone.id,
            wasFirstAttempt: piece.attempts === 0,
        };
    }

    // Check whether the release was near a wrong-role zone, useful
    // telemetry + narrator hook (PRD §9, semantic intelligence).
    const anyZone = nearestZoneAnyRole(hand, zones);
    if (anyZone.zone && anyZone.distance < tol * 1.2) {
        return {
            kind: 'wrongRole',
            pieceId: piece.id,
            attemptedZoneId: anyZone.zone.id,
        };
    }

    return {
        kind: 'returned',
        pieceId: piece.id,
        nearZoneId: eligible.zone?.id ?? null,
        distance: eligible.distance,
    };
}

/**
 * Apply silent assistance escalation after a missed attempt. After 3
 * misses on the same piece, snap tolerance silently grows ×1.25
 * (capped at 1.5×). Returns the new multiplier so callers can fire
 * the `assist_escalated` telemetry event when it changes.
 */
export function escalateAssistance(piece: BuildPiece): {
    changed: boolean;
    newTolerance: number;
} {
    piece.attempts += 1;
    if (piece.attempts < ASSIST_ESCALATION.triggerAfterAttempts) {
        return { changed: false, newTolerance: piece.assistTolerance };
    }
    const proposed = piece.assistTolerance * ASSIST_ESCALATION.multiplier;
    const next = Math.min(ASSIST_ESCALATION.cap, proposed);
    if (next === piece.assistTolerance) {
        return { changed: false, newTolerance: piece.assistTolerance };
    }
    piece.assistTolerance = next;
    return { changed: true, newTolerance: next };
}

// ─── Grab pick ────────────────────────────────────────────────────────

/**
 * On pinch-down, picks the closest grabbable piece within a generous
 * radius (1.6× piece width). Returns null if no piece is close enough.
 */
export function pickGrabbedPiece(
    hand: { x: number; y: number },
    pieces: BuildPiece[],
): BuildPiece | null {
    let best: BuildPiece | null = null;
    let bestDist = Infinity;
    for (const p of pieces) {
        if (p.grabbed || p.placed) continue;
        const d = Math.hypot(hand.x - p.cx, hand.y - p.cy);
        const radius = Math.max(p.width, p.height) * 1.5;
        if (d < radius && d < bestDist) { bestDist = d; best = p; }
    }
    return best;
}
