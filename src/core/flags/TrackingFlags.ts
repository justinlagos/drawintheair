/**
 * Tracking Reliability Upgrade - Feature Flags
 * 
 * All flags default to false to ensure zero regressions.
 * When any flag is false, behavior matches current implementation exactly.
 */

export const TrackingFlags = {
    modeFilterProfiles: false,
    timeBasedConfidence: false,
    velocityPinchTolerance: false,
    stabilityDetection: false,
    visualGuidance: false,
    gradualQualityScaling: false,
    sessionCalibration: false,
    teleportGuard: false,
    jitterSpikeGuard: false,
    metricsHud: false
} as const;

export type TrackingFlag = keyof typeof TrackingFlags;

/**
 * Get current flag state
 */
export function getTrackingFlag(flag: TrackingFlag): boolean {
    return TrackingFlags[flag];
}

/**
 * Check if any tracking improvements are enabled
 */
export function hasAnyTrackingFlagsEnabled(): boolean {
    return Object.values(TrackingFlags).some(v => Boolean(v));
}

/**
 * Enable a specific flag (for testing/debugging)
 */
export function enableTrackingFlag(flag: TrackingFlag): void {
    (TrackingFlags as any)[flag] = true;
    console.log(`[TrackingFlags] Enabled: ${flag}`);
}

/**
 * Disable a specific flag
 */
export function disableTrackingFlag(flag: TrackingFlag): void {
    (TrackingFlags as any)[flag] = false;
    console.log(`[TrackingFlags] Disabled: ${flag}`);
}

/**
 * Check if debug mode is enabled via URL params
 */
export function isDebugModeEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    const debug = params.get('debug');
    return debug === 'tracking' || debug === 'freepaint' || debug === 'bubblepop';
}
