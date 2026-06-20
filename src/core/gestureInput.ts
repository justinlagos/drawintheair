/**
 * Shared hand-gesture pointer — lets the React UI (menus, docks) be driven by
 * the tracked hand, not just the mouse. The per-mode frame adapters publish the
 * latest filtered fingertip + pinch every frame; <GestureLayer> reads it to
 * render a cursor and select controls by hover + pinch or dwell.
 *
 * Coordinates are normalized 0..1 of the viewport.
 */

export interface GesturePointer {
    x: number;
    y: number;
    pinch: boolean;
    hasHand: boolean;
    ts: number;
}

let pointer: GesturePointer = { x: 0.5, y: 0.5, pinch: false, hasHand: false, ts: 0 };

/** Called by the frame adapters each frame with the filtered hand point. */
export const setGesturePointer = (
    p: { x: number; y: number } | null,
    pinch: boolean,
    hasHand: boolean
): void => {
    if (p && hasHand) {
        pointer = { x: p.x, y: p.y, pinch, hasHand: true, ts: Date.now() };
    } else {
        pointer = { ...pointer, pinch: false, hasHand: false };
    }
};

export const getGesturePointer = (): GesturePointer => pointer;
