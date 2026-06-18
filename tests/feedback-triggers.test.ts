import { describe, it, expect } from 'vitest';
import {
    selectStuckPrompt,
    STUCK_THRESHOLDS,
    type StuckInput,
} from '../src/features/feedback/stuckTriggers';
import {
    detectInAppBrowser,
    collectFeedbackContext,
    flattenContext,
    type FeedbackContext,
} from '../src/features/feedback/feedbackContext';

const base: StuckInput = {
    elapsedMs: 0,
    cameraStatus: 'running',
    handEverDetected: false,
    handDetectedAtMs: null,
    waveCompleted: false,
    dismissed: {},
};

describe('selectStuckPrompt — trigger selection', () => {
    it('shows nothing early in the session', () => {
        expect(selectStuckPrompt({ ...base, elapsedMs: 3_000 })).toBe('none');
    });

    it('trigger 1: dwell_help after the dwell threshold with no hand seen', () => {
        expect(
            selectStuckPrompt({ ...base, elapsedMs: STUCK_THRESHOLDS.dwellMs }),
        ).toBe('dwell_help');
    });

    it('does NOT show dwell_help once a hand has been detected', () => {
        expect(
            selectStuckPrompt({
                ...base,
                elapsedMs: STUCK_THRESHOLDS.dwellMs + 1_000,
                handEverDetected: true,
                handDetectedAtMs: 2_000,
            }),
        ).toBe('none');
    });

    it('trigger 2: gesture_demo when a hand is seen but no wave completes in time', () => {
        const handAt = 4_000;
        expect(
            selectStuckPrompt({
                ...base,
                handEverDetected: true,
                handDetectedAtMs: handAt,
                elapsedMs: handAt + STUCK_THRESHOLDS.handNoWaveMs,
            }),
        ).toBe('gesture_demo');
    });

    it('trigger 3: camera_help takes priority over everything when camera errors', () => {
        expect(
            selectStuckPrompt({
                ...base,
                cameraStatus: 'error',
                elapsedMs: STUCK_THRESHOLDS.dwellMs * 3,
                handEverDetected: true,
                handDetectedAtMs: 1_000,
            }),
        ).toBe('camera_help');
    });

    it('shows nothing once the wave is completed, regardless of state', () => {
        expect(
            selectStuckPrompt({
                ...base,
                cameraStatus: 'error',
                waveCompleted: true,
                elapsedMs: 999_999,
            }),
        ).toBe('none');
    });

    it('respects dismissals — a dismissed prompt is not re-shown', () => {
        expect(
            selectStuckPrompt({
                ...base,
                elapsedMs: STUCK_THRESHOLDS.dwellMs,
                dismissed: { dwell_help: true },
            }),
        ).toBe('none');
    });
});

describe('detectInAppBrowser', () => {
    it('flags the Facebook in-app browser', () => {
        const ua =
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) FBAN/FBIOS;FBAV/450';
        expect(detectInAppBrowser(ua)).toBe(true);
    });

    it('flags the Instagram in-app browser', () => {
        expect(detectInAppBrowser('Mozilla/5.0 ... Instagram 300.0')).toBe(true);
    });

    it('does not flag normal mobile Chrome', () => {
        const ua =
            'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36';
        expect(detectInAppBrowser(ua)).toBe(false);
    });
});

describe('collectFeedbackContext + flattenContext', () => {
    it('merges runtime signals and is SSR-safe', () => {
        const ctx = collectFeedbackContext({
            onboarding_step: 'wave_gate',
            hand_detection: 'never',
            camera_permission: 'running',
            session_length_ms: 12_345,
        });
        expect(ctx.onboarding_step).toBe('wave_gate');
        expect(ctx.hand_detection).toBe('never');
        expect(ctx.camera_permission).toBe('running');
        expect(ctx.session_length_ms).toBe(12_345);
        // Unspecified fields fall back to safe defaults.
        expect(ctx.game_mode).toBeNull();
    });

    it('flattens to scalar ctx_-prefixed keys, dropping nulls', () => {
        const ctx: FeedbackContext = {
            page: '/play',
            game_mode: null,
            onboarding_step: 'wave_gate',
            device_type: 'mobile',
            browser: 'FacebookApp',
            in_app_browser: true,
            session_length_ms: 28_000,
            hand_detection: 'never',
            camera_permission: 'running',
            tracker_fps: null,
            viewport_w: 390,
            viewport_h: 844,
        };
        const flat = flattenContext(ctx);
        expect(flat.ctx_page).toBe('/play');
        expect(flat.ctx_in_app_browser).toBe(true);
        expect(flat.ctx_browser).toBe('FacebookApp');
        // nulls dropped
        expect('ctx_game_mode' in flat).toBe(false);
        expect('ctx_tracker_fps' in flat).toBe(false);
        // every value is a scalar
        for (const v of Object.values(flat)) {
            expect(['string', 'number', 'boolean']).toContain(typeof v);
        }
    });
});
