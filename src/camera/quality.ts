/**
 * Quality tier computation.
 *
 * @param avgFpsVision   Rolling average vision fps (computed by useVisionLoop)
 * @param missingInWindow  Count of frames with no detection in the last 30-frame window
 */

const GOOD_FPS = 26;
const OK_FPS = 20;
const GOOD_MISSING_MAX = 4;  // ≤4 out of 30 frames missing → good
const OK_MISSING_MAX = 14;   // ≤14 out of 30 frames missing → ok

export function computeQualityTier(
    avgFpsVision: number,
    missingInWindow: number,
): 'good' | 'ok' | 'poor' {
    if (avgFpsVision >= GOOD_FPS && missingInWindow <= GOOD_MISSING_MAX) return 'good';
    if (avgFpsVision >= OK_FPS && missingInWindow <= OK_MISSING_MAX) return 'ok';
    return 'poor';
}
