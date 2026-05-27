/**
 * Building Mode — onFrame entry point.
 *
 * Matches the signature every other mode uses:
 *   (ctx, frameData, width, height, drawingUtils) => void
 *
 * Per frame this module:
 *   1. updates parked-piece drift physics
 *   2. handles pinch state transitions (grab / hold / release)
 *   3. runs the snap engine to choose target position + glow
 *   4. fires telemetry
 *   5. paints the scene
 *   6. paints the completion animation when in completion phase
 *
 * All world state lives in `buildingState` so the React shell can poll
 * without prop drilling and so unit tests can drive scripted frames.
 */

import { DrawingUtils } from '@mediapipe/tasks-vision';
import { isCountdownActive } from '../../../core/countdownService';
import { OneEuroFilter2D } from '../../../core/filters/OneEuroFilter';
import { tactileAudioManager } from '../../../core/TactileAudioManager';
import { trackingFeatures } from '../../../core/trackingFeatures';
import { elapsedSinceGrab, markGrab } from '../../../lib/analytics';
import type { TrackingFrameData } from '../../tracking/TrackingLayer';
import { getCompletionAnimator } from './buildingCompletion';
import { renderBuildScene } from './buildingRender';
import {
    computePull,
    escalateAssistance,
    nearestEligibleZone,
    pickGrabbedPiece,
    resolveRelease,
} from './buildingSnap';
import {
    allPiecesPlaced,
    completionAnimationFinished,
    getCompletionElapsedMs,
    getCurrentObject,
    getCurrentSession,
    getPhase,
    getRevealElapsedMs,
    markFirstSnap,
    piecesSettled,
    recordAttempt,
    recordHesitation,
} from './buildingState';
import {
    logAssistEscalated,
    logHesitationDetected,
    logPieceGrabbed,
    logPlacementAttempt,
    logSuccessfulSnap,
    logWrongPieceAttempt,
} from './buildingTelemetry';
import type { BuildPiece, BuildingPhase, SnapZone } from './buildingTypes';

// ─── Module-local frame state ─────────────────────────────────────────

let grabbed: BuildPiece | null = null;
let grabFilter: OneEuroFilter2D | null = null;
let audioPlayedForGrab = false;
let lastPinch = false;

/** When the hand has been still without grabbing — for hesitation event. */
let dwellStartTs = 0;
let lastHesitationTs = 0;
const HESITATION_DWELL_MS = 2000;
const HESITATION_COOLDOWN_MS = 6000;

const SETTLE_DURATION_MS = 1200;

/** Test/reset hook. */
export function _resetBuildingFrameState(): void {
    grabbed = null;
    grabFilter = null;
    audioPlayedForGrab = false;
    lastPinch = false;
    dwellStartTs = 0;
    lastHesitationTs = 0;
}

// ─── Main onFrame ─────────────────────────────────────────────────────

export const buildingLogic = (
    ctx: CanvasRenderingContext2D,
    frameData: TrackingFrameData,
    width: number,
    height: number,
    _drawingUtils: DrawingUtils | null,
): void => {
    const object = getCurrentObject();
    if (!object) return;

    if (isCountdownActive()) {
        renderBuildScene(ctx, width, height, object, getPhase(), getRevealElapsedMs());
        return;
    }

    const phase = getPhase();
    const revealElapsed = getRevealElapsedMs();

    // Reveal → interaction promotion happens here so it's frame-driven
    // rather than time-of-day driven (matches countdown semantics).
    if (phase === 'reveal' && revealElapsed >= SETTLE_DURATION_MS) {
        piecesSettled();
    }

    if (phase === 'completion') {
        renderBuildScene(ctx, width, height, object, phase, revealElapsed);
        const animator = getCompletionAnimator(object.completionAnimationId);
        if (animator) {
            const stillRunning = animator(ctx, getCompletionElapsedMs(), width, height, object);
            if (!stillRunning) completionAnimationFinished();
        } else {
            completionAnimationFinished();
        }
        return;
    }

    // Always-on: drift parked pieces gently.
    driftParkedPieces(object.pieces, phase);
    // Reset zone glow each frame — set again below if a piece is nearby.
    for (const z of object.snapZones) z.glow = 0;

    const { filteredPoint, pinchActive, timestamp } = frameData;
    if (filteredPoint) {
        handlePinchTransitions(object.pieces, object.snapZones, filteredPoint, pinchActive, timestamp);
    } else if (lastPinch) {
        // Hand vanished mid-grab — release without snapping (treated as
        // returned). Avoid leaving `grabbed` non-null across frames.
        cancelGrab();
    }
    lastPinch = pinchActive;

    // Hesitation: hand present, not pinching, hovering over the scene
    // for >2s without grabbing anything.
    detectHesitation(filteredPoint, pinchActive, timestamp);

    renderBuildScene(ctx, width, height, object, phase, revealElapsed);
};

// ─── Frame-loop helpers ───────────────────────────────────────────────

function driftParkedPieces(pieces: BuildPiece[], phase: BuildingPhase): void {
    // Only drift during reveal/interaction; freeze in completion.
    if (phase !== 'reveal' && phase !== 'interaction') return;
    for (const p of pieces) {
        if (p.grabbed || p.placed) continue;
        p.cx += p.vx;
        p.cy += p.vy;
        // Soft world bounds — bounce gently.
        if (p.cx < 0.06 || p.cx > 0.94) p.vx *= -1;
        if (p.cy < 0.10 || p.cy > 0.90) p.vy *= -1;
        p.cx = Math.max(0.06, Math.min(0.94, p.cx));
        p.cy = Math.max(0.10, Math.min(0.90, p.cy));
        p.rotation += 0.003;
    }
}

function handlePinchTransitions(
    pieces: BuildPiece[],
    zones: SnapZone[],
    hand: { x: number; y: number },
    pinchActive: boolean,
    timestamp: number,
): void {
    const object = getCurrentObject();
    if (!object) return;

    // ── pinch START ──
    if (pinchActive && !lastPinch && !grabbed) {
        const pick = pickGrabbedPiece(hand, pieces);
        if (pick) {
            grabbed = pick;
            pick.grabbed = true;
            grabFilter = new OneEuroFilter2D({ minCutoff: 1.8, beta: 0.015, dCutoff: 1.0 });
            audioPlayedForGrab = false;
            markGrab(pick.id);
            logPieceGrabbed(object, pick.id);
            const flags = trackingFeatures.getFlags();
            if (flags.enableTactileAudio) tactileAudioManager.updatePinchState(true);
        }
        return;
    }

    // ── pinch HOLD ──
    if (pinchActive && grabbed) {
        const session = getCurrentSession();
        if (!session) return;

        const eligible = nearestEligibleZone(grabbed, hand, zones);
        const { pull, zoneGlow } = computePull(
            grabbed, hand, eligible.zone, session.buildType,
        );
        if (eligible.zone) eligible.zone.glow = Math.max(eligible.zone.glow, zoneGlow);

        // Smooth onto the (possibly snap-eased) target.
        if (grabFilter) {
            const smoothed = grabFilter.filter(pull.targetX, pull.targetY, timestamp);
            grabbed.cx = smoothed.x;
            grabbed.cy = smoothed.y;
        } else {
            grabbed.cx = pull.targetX;
            grabbed.cy = pull.targetY;
        }

        if (pull.crossedAudioThreshold && !audioPlayedForGrab) {
            const flags = trackingFeatures.getFlags();
            if (flags.enableTactileAudio) tactileAudioManager.playSuccess('sorting');
            audioPlayedForGrab = true;
        }
        return;
    }

    // ── pinch RELEASE ──
    if (!pinchActive && grabbed) {
        const piece = grabbed;
        const session = getCurrentSession();
        if (!session) { cancelGrab(); return; }

        recordAttempt();
        const event = resolveRelease(piece, hand, zones, session.buildType);

        if (event.kind === 'snapped') {
            const zone = zones.find(z => z.id === event.zoneId);
            if (zone) {
                zone.filled = true;
                zone.filledByPieceId = piece.id;
                piece.placed = true;
                piece.placedZoneId = zone.id;
                piece.grabbed = false;
                piece.cx = zone.cx;
                piece.cy = zone.cy;
                piece.rotation = 0;
                piece.vx = 0;
                piece.vy = 0;
                markFirstSnap();
                logSuccessfulSnap(
                    object, piece.id, zone.id,
                    elapsedSinceGrab(piece.id) ?? 0,
                    event.wasFirstAttempt,
                );
                const flags = trackingFeatures.getFlags();
                if (flags.enableTactileAudio) tactileAudioManager.playSuccess('sorting');

                if (zones.every(z => z.filled)) allPiecesPlaced();
            }
            grabbed = null;
            grabFilter = null;
            return;
        }

        // Returned or wrongRole — no commit. Piece bounces back into
        // play with gentle restitution (no shame surface).
        const target = nearestEligibleZone(piece, hand, zones);
        logPlacementAttempt(object, piece.id, target.zone?.id ?? null, target.distance);

        if (event.kind === 'wrongRole') {
            const wrongZone = zones.find(z => z.id === event.attemptedZoneId);
            if (wrongZone) {
                logWrongPieceAttempt(object, piece.id, wrongZone.id, wrongZone.acceptsRole);
            }
        }

        const { changed, newTolerance } = escalateAssistance(piece);
        if (changed) logAssistEscalated(object, piece.id, newTolerance);

        piece.grabbed = false;
        piece.vx = (Math.random() - 0.5) * 0.0003;
        piece.vy = (Math.random() - 0.5) * 0.0003;
        grabbed = null;
        grabFilter = null;
        return;
    }
}

function cancelGrab(): void {
    if (grabbed) grabbed.grabbed = false;
    grabbed = null;
    grabFilter = null;
    audioPlayedForGrab = false;
}

function detectHesitation(
    hand: { x: number; y: number } | null,
    pinchActive: boolean,
    timestamp: number,
): void {
    const object = getCurrentObject();
    if (!object || getPhase() !== 'interaction') {
        dwellStartTs = 0;
        return;
    }
    if (!hand || pinchActive || grabbed) {
        dwellStartTs = 0;
        return;
    }
    if (dwellStartTs === 0) {
        dwellStartTs = timestamp;
        return;
    }
    if (timestamp - dwellStartTs >= HESITATION_DWELL_MS
        && timestamp - lastHesitationTs >= HESITATION_COOLDOWN_MS) {
        lastHesitationTs = timestamp;
        dwellStartTs = 0;
        recordHesitation();
        const available = object.pieces.filter(p => !p.placed).map(p => p.id);
        logHesitationDetected(object, available);
    }
}
