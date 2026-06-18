/**
 * Feedback context collector.
 *
 * Every feedback submission automatically carries the surrounding state
 * so a vague "doesn't work" becomes actionable:
 *
 *   "doesn't work" + Android + FacebookApp in-app + Word Search
 *   + hand never detected + camera granted + exited after 28s
 *
 * All fields here are coarse and non-identifying — no names, no email,
 * no face data — consistent with the on-device privacy promise. We reuse
 * the analytics envelope's detection rather than re-deriving it where we
 * can, and add a few feedback-specific signals (hand/camera/onboarding
 * step) that only the live tracking layer knows.
 */

export type HandDetectionState = 'never' | 'detected' | 'lost' | 'unknown';
export type CameraPermissionState =
    | 'idle'
    | 'requesting'
    | 'running'
    | 'error'
    | 'unknown';

export interface FeedbackContext {
    page: string;
    game_mode: string | null;
    /** Where in onboarding the user was, e.g. 'wave_gate', 'camera_prompt'. */
    onboarding_step: string | null;
    device_type: string;
    browser: string;
    /** True for Facebook / Instagram in-app webviews — camera-hostile. */
    in_app_browser: boolean;
    /** Milliseconds the user has been in this session/screen, if known. */
    session_length_ms: number | null;
    hand_detection: HandDetectionState;
    camera_permission: CameraPermissionState;
    tracker_fps: number | null;
    viewport_w: number | null;
    viewport_h: number | null;
}

/** Fields the caller (the live component) supplies. */
export interface RuntimeContext {
    onboarding_step?: string | null;
    game_mode?: string | null;
    session_length_ms?: number | null;
    hand_detection?: HandDetectionState;
    camera_permission?: CameraPermissionState;
    tracker_fps?: number | null;
}

function detectBrowser(ua: string): string {
    if (/FBAN|FBAV|FB_IAB|FBIOS/.test(ua)) return 'FacebookApp';
    if (/Instagram/.test(ua)) return 'InstagramApp';
    if (/Edg\//.test(ua)) return 'Edge';
    if (/Chrome\//.test(ua)) return 'Chrome';
    if (/Firefox\//.test(ua)) return 'Firefox';
    if (/Safari/.test(ua)) return 'Safari';
    return 'unknown';
}

/**
 * Detect Facebook / Instagram in-app webviews. These throttle or block
 * getUserMedia and are the single biggest environment risk for a webcam
 * hand-tracking game — worth flagging on every submission.
 */
export function detectInAppBrowser(ua: string): boolean {
    return /FBAN|FBAV|FB_IAB|FBIOS|Instagram|Line\/|Twitter|TikTok/.test(ua);
}

function detectDeviceType(width: number): string {
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    if (width >= 1920) return 'desktop-large';
    return 'desktop';
}

/**
 * Build the full context, merging caller-supplied runtime signals with
 * auto-detected environment. SSR-safe (guards `window`/`navigator`).
 */
export function collectFeedbackContext(runtime: RuntimeContext = {}): FeedbackContext {
    const hasWindow = typeof window !== 'undefined';
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const width = hasWindow ? window.innerWidth : 0;

    return {
        page: hasWindow ? window.location.pathname : '',
        game_mode: runtime.game_mode ?? null,
        onboarding_step: runtime.onboarding_step ?? null,
        device_type: detectDeviceType(width),
        browser: detectBrowser(ua),
        in_app_browser: detectInAppBrowser(ua),
        session_length_ms: runtime.session_length_ms ?? null,
        hand_detection: runtime.hand_detection ?? 'unknown',
        camera_permission: runtime.camera_permission ?? 'unknown',
        tracker_fps: runtime.tracker_fps ?? null,
        viewport_w: hasWindow ? window.innerWidth : null,
        viewport_h: hasWindow ? window.innerHeight : null,
    };
}

/**
 * Flatten the context into the scalar shape that submitFormData accepts
 * (string | number | boolean). Used when routing a submission to the
 * unified form pipeline.
 */
export function flattenContext(
    ctx: FeedbackContext,
): Record<string, string | number | boolean> {
    const out: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(ctx)) {
        if (v === null || v === undefined) continue;
        out[`ctx_${k}`] = v as string | number | boolean;
    }
    return out;
}
