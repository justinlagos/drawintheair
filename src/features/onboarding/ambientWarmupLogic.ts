/**
 * ambientWarmupLogic — pure state machine for the no-modal warm-up.
 *
 * Replaces the removed "Quick warm-up?" offer interstitial (f2defb5) with
 * an ambient variant: three balloons drift up OVER the activity menu.
 * Pop them or ignore them — nothing blocks, nothing needs reading.
 * Popping the third balloon is the guaranteed first success that fires
 * the activation events and lets SaveProgressNudge do its job.
 *
 * Interaction (mirrors the menu's own conventions):
 *   • pinch while touching a balloon  → pops instantly (teaches pinch)
 *   • hold the hand cursor on it      → pops after a short dwell
 *   • pointer tap/click               → handled by the component layer
 *
 * All motion is a deterministic function of (spawnedAt, now) so the
 * component never stores per-frame state and this module stays fully
 * unit-testable without a DOM.
 */

export const BALLOON_COUNT = 3;
export const POP_RADIUS_PX = 70;        // generous hit target for small hands
export const DWELL_POP_MS = 250;        // touch-and-hold pop (pinch is instant)
export const RISE_DURATION_MS = 16000;  // bottom → top travel time (calm)
export const SPAWN_STAGGER_MS = 2200;   // balloons enter one at a time
export const BALLOON_RADIUS_PX = 44;    // visual radius (render hint)
export const SWAY_AMPLITUDE_PX = 22;
const SWAY_PERIOD_MS = 2400;

export interface AmbientBalloon {
    id: number;
    /** Horizontal base position, 0..1 of viewport width. */
    xNorm: number;
    spawnedAt: number;
    swayPhase: number;
    popped: boolean;
    poppedAt: number | null;
    /** Hint rendered on the balloon. Purely visual — touch always works. */
    hint: 'touch' | 'pinch';
}

export interface AmbientWarmupState {
    balloons: AmbientBalloon[];
    popCount: number;
    completed: boolean;
    completedAt: number | null;
    /** Dwell tracking: which balloon the cursor is currently held on. */
    dwellBalloonId: number | null;
    dwellStartedAt: number | null;
}

export interface AmbientInput {
    /** Cursor position in viewport px (index fingertip), or null when no hand. */
    cursorX: number | null;
    cursorY: number | null;
    pinchActive: boolean;
}

export interface Viewport {
    width: number;
    height: number;
}

/** Result of one advance step — the component logs events from `poppedIds`. */
export interface AmbientAdvanceResult {
    state: AmbientWarmupState;
    poppedIds: number[];
    justCompleted: boolean;
}

export function createAmbientWarmupState(now: number): AmbientWarmupState {
    // Deterministic layout: spread across the viewport, avoiding the exact
    // centre where the menu header sits. Third balloon carries the pinch hint.
    const xs = [0.18, 0.82, 0.5];
    return {
        balloons: xs.map((xNorm, i) => ({
            id: i,
            xNorm,
            spawnedAt: now + i * SPAWN_STAGGER_MS,
            swayPhase: i * 2.1,
            popped: false,
            poppedAt: null,
            hint: i === BALLOON_COUNT - 1 ? 'pinch' : 'touch',
        })),
        popCount: 0,
        completed: false,
        completedAt: null,
        dwellBalloonId: null,
        dwellStartedAt: null,
    };
}

/**
 * Centre of a balloon at time `now`, in viewport px. Balloons rise from just
 * below the bottom edge to just above the top, then wrap and rise again
 * (an unpopped balloon keeps offering itself without any prompt).
 * Returns null if the balloon hasn't spawned yet or is popped.
 */
export function balloonCenterAt(
    balloon: AmbientBalloon,
    now: number,
    viewport: Viewport,
): { x: number; y: number } | null {
    if (balloon.popped) return null;
    const elapsed = now - balloon.spawnedAt;
    if (elapsed < 0) return null;
    const t = (elapsed % RISE_DURATION_MS) / RISE_DURATION_MS; // 0..1, wraps
    const travel = viewport.height + 4 * BALLOON_RADIUS_PX;
    const y = viewport.height + 2 * BALLOON_RADIUS_PX - t * travel;
    const sway = Math.sin((elapsed / SWAY_PERIOD_MS) * 2 * Math.PI + balloon.swayPhase)
        * SWAY_AMPLITUDE_PX;
    const x = balloon.xNorm * viewport.width + sway;
    return { x, y };
}

/** Pop a specific balloon (used by the component for pointer tap/click). */
export function popBalloon(
    state: AmbientWarmupState,
    balloonId: number,
    now: number,
): AmbientAdvanceResult {
    const target = state.balloons.find(b => b.id === balloonId);
    if (!target || target.popped || state.completed || now < target.spawnedAt) {
        return { state, poppedIds: [], justCompleted: false };
    }
    const balloons = state.balloons.map(b =>
        b.id === balloonId ? { ...b, popped: true, poppedAt: now } : b);
    const popCount = state.popCount + 1;
    const completed = popCount >= BALLOON_COUNT;
    return {
        state: {
            ...state,
            balloons,
            popCount,
            completed,
            completedAt: completed ? now : null,
            dwellBalloonId: null,
            dwellStartedAt: null,
        },
        poppedIds: [balloonId],
        justCompleted: completed,
    };
}

/**
 * Advance one frame. Hit-tests the hand cursor against live balloons:
 * pinch pops instantly; a steady touch pops after DWELL_POP_MS.
 */
export function advanceAmbientWarmup(
    state: AmbientWarmupState,
    input: AmbientInput,
    now: number,
    viewport: Viewport,
): AmbientAdvanceResult {
    if (state.completed) return { state, poppedIds: [], justCompleted: false };

    if (input.cursorX === null || input.cursorY === null) {
        if (state.dwellBalloonId === null) return { state, poppedIds: [], justCompleted: false };
        return {
            state: { ...state, dwellBalloonId: null, dwellStartedAt: null },
            poppedIds: [],
            justCompleted: false,
        };
    }

    // Nearest live balloon under the cursor.
    let hitId: number | null = null;
    let hitDist = Infinity;
    for (const b of state.balloons) {
        const c = balloonCenterAt(b, now, viewport);
        if (!c) continue;
        const d = Math.hypot(input.cursorX - c.x, input.cursorY - c.y);
        if (d <= POP_RADIUS_PX && d < hitDist) {
            hitId = b.id;
            hitDist = d;
        }
    }

    if (hitId === null) {
        if (state.dwellBalloonId === null) return { state, poppedIds: [], justCompleted: false };
        return {
            state: { ...state, dwellBalloonId: null, dwellStartedAt: null },
            poppedIds: [],
            justCompleted: false,
        };
    }

    // Pinch on a balloon pops immediately.
    if (input.pinchActive) return popBalloon(state, hitId, now);

    // Dwell handling: continuous touch on the SAME balloon pops after the
    // threshold; switching balloons restarts the clock.
    if (state.dwellBalloonId !== hitId) {
        return {
            state: { ...state, dwellBalloonId: hitId, dwellStartedAt: now },
            poppedIds: [],
            justCompleted: false,
        };
    }
    if (state.dwellStartedAt !== null && now - state.dwellStartedAt >= DWELL_POP_MS) {
        return popBalloon(state, hitId, now);
    }
    return { state, poppedIds: [], justCompleted: false };
}
