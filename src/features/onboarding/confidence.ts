/**
 * Confidence model — turns raw tracking signals into ONE friendly,
 * human state. The principle: assume the user has never seen hand
 * tracking before in their life. No fps, no jargon, no stream of
 * changing technical strings — just a traffic light a 4-year-old's
 * parent reads instantly (Kinect / Wii / Apple-setup style).
 */

export type ConfidenceLevel = 'green' | 'yellow' | 'red';

export interface ConfidenceSignals {
    /** Camera/tracker status from diagnostics. */
    cameraStatus: 'idle' | 'requesting' | 'running' | 'error';
    trackerReady: boolean;
    /** Is a hand currently detected? */
    hasHand: boolean;
    /** Normalised hand size; larger = closer to camera. ~0 when no hand. */
    handScale: number;
    /** Detection confidence 0–1 (optional). */
    confidence?: number;
}

export interface ConfidenceState {
    level: ConfidenceLevel;
    emoji: string;
    message: string;
}

/** Above this the hand fills too much of the frame — ask them to step back. */
export const TOO_CLOSE_SCALE = 0.16;
/** Below this the hand is too small/far to track reliably. */
export const TOO_FAR_SCALE = 0.04;

/**
 * Map the live signals to a single confidence state. Pure + unit-tested.
 */
export function computeConfidence(s: ConfidenceSignals): ConfidenceState {
    if (s.cameraStatus === 'error') {
        return { level: 'red', emoji: '🔴', message: "I can't see — let's fix the camera" };
    }
    if (s.cameraStatus !== 'running') {
        return { level: 'yellow', emoji: '🟡', message: 'Waking up the camera…' };
    }
    if (!s.trackerReady) {
        return { level: 'yellow', emoji: '🟡', message: 'Getting ready…' };
    }
    if (!s.hasHand) {
        return { level: 'red', emoji: '🔴', message: "I can't see your hand yet" };
    }
    if (s.handScale > TOO_CLOSE_SCALE) {
        return { level: 'yellow', emoji: '🟡', message: 'Move back a little' };
    }
    if (s.handScale > 0 && s.handScale < TOO_FAR_SCALE) {
        return { level: 'yellow', emoji: '🟡', message: 'Move a little closer' };
    }
    return { level: 'green', emoji: '🟢', message: 'Perfect! I can see your hand' };
}
