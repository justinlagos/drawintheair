/**
 * Observability — public surface.
 *
 * Three layers wired in this folder:
 *   • sentry.ts    — error tracking (frontend crashes)
 *   • posthog.ts   — product analytics (funnels, cohorts)
 *   • health.ts    — in-memory health registry (powers the
 *                    System Health panel and surfaces last critical error)
 *
 * The existing LIOS pipeline (src/lib/analytics.ts → Supabase
 * analytics_events) is the canonical learning telemetry store. The
 * functions in this barrel do NOT replace it — they run alongside.
 *
 * One-call bootstrap:
 *
 *   import { initObservability } from '@/lib/observability';
 *   initObservability();
 *
 * Then in any code path:
 *
 *   import { trackEvent, captureError, setObservabilityContext }
 *     from '@/lib/observability';
 */

import { initSentry, captureError, setObservabilityContext, clearObservabilityContext, isSentryActive } from './sentry';
import { initPostHog, trackEvent, identifyPseudonymous, resetPostHog, isPostHogActive } from './posthog';

export {
    // Sentry
    captureError,
    setObservabilityContext,
    clearObservabilityContext,
    isSentryActive,
    // PostHog
    trackEvent,
    identifyPseudonymous,
    resetPostHog,
    isPostHogActive,
};

// Health registry exports.
export {
    getHealthSnapshot,
    recordCriticalError,
    recordCameraRequested,
    recordCameraGranted,
    recordCameraDenied,
    recordTrackerInitStarted,
    recordTrackerInitSucceeded,
    recordTrackerInitFailed,
    recordSupabaseRpcFailure,
    recordClassroomSyncFailure,
    setActiveClassSessions,
} from './health';
export type { HealthSnapshot, HealthIncident } from './health';
export type { ObservabilityContext, CaptureErrorOptions } from './sentry';

/**
 * One-call bootstrap. Idempotent. Call from src/main.tsx BEFORE
 * React mounts so we catch even the earliest render errors.
 */
export function initObservability(): void {
    initSentry();
    initPostHog();
}
