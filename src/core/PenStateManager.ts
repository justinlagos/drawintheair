/**
 * Pen State Manager - Pinch-to-Draw Model
 * 
 * Manages pen up/down states based on:
 * - Pinch gesture (thumb + index finger)
 * - Tracking confidence
 * - Hand presence
 * 
 * Uses hysteresis to prevent flicker.
 */

export const PenState = {
    UP: 'up',
    DOWN: 'down'
} as const;

export type PenState = typeof PenState[keyof typeof PenState];

export interface PenStateConfig {
    /** Minimum confidence to consider hand "present". Default: 0.6 */
    minConfidence: number;
    /** Frames below confidence before triggering pen up. Default: 3 */
    dropoutFrameThreshold: number;
    /** Maximum normalized distance before breaking stroke. Default: 0.08 (8% of screen) */
    jumpThreshold: number;
    /** Minimum movement to register (filters micro-jitter). Default: 0.001 */
    minMovement: number;
    /** Frames to debounce state changes. Default: 2 */
    debounceFrames: number;
    /** Pinch down threshold (multiplied by handScale). Default: 0.35 */
    pinchDownThreshold: number;
    /** Pinch up threshold (multiplied by handScale). Default: 0.45 */
    pinchUpThreshold: number;
}

const DEFAULT_CONFIG: PenStateConfig = {
    minConfidence: 0.6,
    dropoutFrameThreshold: 3,
    jumpThreshold: 0.08,
    minMovement: 0.001,
    debounceFrames: 2,
    pinchDownThreshold: 0.35,
    pinchUpThreshold: 0.45
};

export interface PenStateEvent {
    type: 'stroke_start' | 'stroke_continue' | 'stroke_end' | 'none';
    position?: { x: number; y: number };
    confidence?: number;
}

export interface Point {
    x: number;
    y: number;
}

export class PenStateManager {
    private config: PenStateConfig;
    private currentState: PenState = PenState.UP;
    private lastPosition: Point | null = null;
    private lowConfidenceFrames: number = 0;
    private pendingState: PenState | null = null;
    private stateChangeFrames: number = 0;

    constructor(config: Partial<PenStateConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Detect pinch gesture from thumb and index tip positions
     */
    private detectPinch(
        indexTip: Point,
        thumbTip: Point,
        handScale: number
    ): boolean {
        const distance = Math.hypot(
            indexTip.x - thumbTip.x,
            indexTip.y - thumbTip.y
        );
        const threshold = this.currentState === PenState.DOWN
            ? this.config.pinchUpThreshold * handScale
            : this.config.pinchDownThreshold * handScale;

        return distance < threshold;
    }

    /**
     * Process a frame of tracking data and determine pen state
     */
    process(
        indexTip: Point | null,
        thumbTip: Point | null,
        handScale: number,
        confidence: number
    ): PenStateEvent {
        // No position or low confidence = pen up
        if (!indexTip || !thumbTip || confidence < this.config.minConfidence) {
            this.lowConfidenceFrames++;

            if (this.lowConfidenceFrames >= this.config.dropoutFrameThreshold) {
                return this.transitionTo(PenState.UP);
            }

            // Grace period - hold last state
            return { type: 'none' };
        }

        // Good confidence - reset dropout counter
        this.lowConfidenceFrames = 0;

        // Detect pinch
        const isPinching = this.detectPinch(indexTip, thumbTip, handScale);

        // Check for jump (teleport) - only if pen was down
        if (this.lastPosition && this.currentState === PenState.DOWN) {
            const distance = Math.hypot(
                indexTip.x - this.lastPosition.x,
                indexTip.y - this.lastPosition.y
            );

            if (distance > this.config.jumpThreshold) {
                // Break stroke due to jump
                this.transitionTo(PenState.UP);
                this.lastPosition = indexTip;
                // Start new stroke if pinching
                if (isPinching) {
                    return this.transitionTo(PenState.DOWN, indexTip, confidence);
                }
                return { type: 'none' };
            }
        }

        // Pinch state detected

        // Determine desired state based on pinch
        const desiredState = isPinching ? PenState.DOWN : PenState.UP;

        // Check minimum movement (filter jitter when stationary)
        if (this.lastPosition && this.currentState === PenState.DOWN) {
            const distance = Math.hypot(
                indexTip.x - this.lastPosition.x,
                indexTip.y - this.lastPosition.y
            );

            if (distance < this.config.minMovement) {
                // Not enough movement - maintain state but don't add point
                return { type: 'none' };
            }
        }

        this.lastPosition = indexTip;

        // State transition logic
        if (desiredState !== this.currentState) {
            return this.transitionTo(desiredState, indexTip, confidence);
        }

        // Pen is down and moving
        if (this.currentState === PenState.DOWN) {
            return {
                type: 'stroke_continue',
                position: indexTip,
                confidence
            };
        }

        // Pen is up
        return { type: 'none' };
    }

    private transitionTo(
        newState: PenState,
        position?: Point,
        confidence?: number
    ): PenStateEvent {
        // Debounce state changes
        if (this.pendingState === newState) {
            this.stateChangeFrames++;
            if (this.stateChangeFrames < this.config.debounceFrames) {
                return { type: 'none' };
            }
        } else {
            this.pendingState = newState;
            this.stateChangeFrames = 1;
            if (this.config.debounceFrames > 1) {
                return { type: 'none' };
            }
        }

        // Apply state change
        const previousState = this.currentState;
        this.currentState = newState;
        this.pendingState = null;
        this.stateChangeFrames = 0;

        if (newState === PenState.UP) {
            if (previousState === PenState.DOWN) {
                return { type: 'stroke_end' };
            }
            return { type: 'none' };
        }

        // Pen down
        if (previousState === PenState.UP) {
            return {
                type: 'stroke_start',
                position,
                confidence
            };
        }

        return {
            type: 'stroke_continue',
            position,
            confidence
        };
    }

    /**
     * Get current pen state
     */
    getState(): PenState {
        return this.currentState;
    }

    /**
     * Check if pen is currently down (drawing)
     */
    isDown(): boolean {
        return this.currentState === PenState.DOWN;
    }

    /**
     * Force pen up (e.g., when leaving drawing mode)
     */
    forceUp(): PenStateEvent {
        if (this.currentState === PenState.DOWN) {
            this.currentState = PenState.UP;
            this.lastPosition = null;
            this.pendingState = null;
            this.stateChangeFrames = 0;
            return { type: 'stroke_end' };
        }
        return { type: 'none' };
    }

    /**
     * Reset all state
     */
    reset(): void {
        this.currentState = PenState.UP;
        this.lastPosition = null;
        this.lowConfidenceFrames = 0;
            this.pendingState = null;
            this.stateChangeFrames = 0;
    }
}
