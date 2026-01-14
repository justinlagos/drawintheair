/**
 * Pinch Logic - Pure Functions for Testing
 * 
 * Part E: Velocity-based pinch tolerance and state management
 * These are pure functions to enable unit testing.
 */

export interface PinchParams {
    indexTip: { x: number; y: number };
    thumbTip: { x: number; y: number };
    handScale: number;
    lastPinchState: boolean;
    velocity: { x: number; y: number; magnitude: number };
    pinchDownThreshold: number;
    pinchUpThreshold: number;
    maxVelocityBoost: number; // Percentage boost (0.15 = 15%)
}

export interface PinchStateResult {
    isPinching: boolean;
    pinchDistance: number;
    threshold: number;
    velocityBoost: number;
}

/**
 * Compute pinch state with velocity tolerance
 */
export function computePinchState(params: PinchParams): PinchStateResult {
    const { indexTip, thumbTip, handScale, lastPinchState, velocity, pinchDownThreshold, pinchUpThreshold, maxVelocityBoost } = params;
    
    const pinchDistance = Math.hypot(
        indexTip.x - thumbTip.x,
        indexTip.y - thumbTip.y
    );
    
    // Base thresholds
    const pinchStartDistance = pinchDownThreshold * handScale;
    const pinchEndDistance = pinchUpThreshold * handScale;
    
    // Apply velocity tolerance (loosen threshold when moving fast)
    const velocityBoost = applyVelocityTolerance(pinchDistance, velocity.magnitude, maxVelocityBoost);
    const adjustedStartDistance = pinchStartDistance * (1 + velocityBoost);
    const adjustedEndDistance = pinchEndDistance * (1 + velocityBoost);
    
    // Hysteresis: easier to start, harder to end
    const threshold = lastPinchState ? adjustedEndDistance : adjustedStartDistance;
    const isPinching = pinchDistance < threshold;
    
    return {
        isPinching,
        pinchDistance,
        threshold,
        velocityBoost
    };
}

/**
 * Apply velocity tolerance to pinch threshold
 * When moving fast, loosen pinchUpThreshold to prevent accidental breaks
 */
export function applyVelocityTolerance(
    _pinchDistance: number,
    velocityMagnitude: number,
    maxBoost: number
): number {
    // Velocity threshold: above this, start applying boost
    const velocityThreshold = 1.0; // Normalized units per second
    const maxVelocity = 5.0; // Maximum velocity for full boost
    
    if (velocityMagnitude < velocityThreshold) {
        return 0; // No boost when moving slowly
    }
    
    // Linear interpolation from velocityThreshold to maxVelocity
    const normalizedVelocity = Math.min(1, (velocityMagnitude - velocityThreshold) / (maxVelocity - velocityThreshold));
    const boost = normalizedVelocity * maxBoost;
    
    return Math.min(boost, maxBoost); // Clamp to maxBoost
}

/**
 * Apply confidence gating to pinch state
 */
export function applyConfidenceGating(
    hasHand: boolean,
    confidence: number,
    minConfidence: number,
    _currentPenDown: boolean
): { shouldForcePenUp: boolean; reason: string } {
    if (!hasHand || confidence < minConfidence) {
        return {
            shouldForcePenUp: true,
            reason: 'low_confidence'
        };
    }
    
    return {
        shouldForcePenUp: false,
        reason: 'good'
    };
}

/**
 * Apply teleport guard
 */
export function applyTeleportGuard(
    lastPoint: { x: number; y: number } | null,
    currentPoint: { x: number; y: number },
    handScale: number,
    jumpThreshold: number
): { isTeleport: boolean; distance: number; threshold: number } {
    if (!lastPoint) {
        return { isTeleport: false, distance: 0, threshold: jumpThreshold };
    }
    
    const distance = Math.hypot(
        currentPoint.x - lastPoint.x,
        currentPoint.y - lastPoint.y
    );
    
    // Relative threshold scales with hand size
    const relativeThreshold = jumpThreshold * (1 + handScale * 2);
    const absoluteThreshold = jumpThreshold;
    const teleportThreshold = Math.max(relativeThreshold, absoluteThreshold);
    
    return {
        isTeleport: distance > teleportThreshold,
        distance,
        threshold: teleportThreshold
    };
}
