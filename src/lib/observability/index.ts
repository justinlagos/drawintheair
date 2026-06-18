/**
 * Observability, public surface.
 *
 * Three layers wired in this folder:
 *   • sentry.ts   , error tracking (frontend crashes)
 *   • posthog.ts  , product analytics (funnels, cohorts)
 *   • health.ts   , in-memory health registry (powers the
 *                    System Health panel and surfaces last critical error)
 *
 * The existing LIOS pipeline (src/lib/analytics.ts → Supabase
 * analytics_events) is the canonical learning telemetry store. The
 * functions in this barrel do NOT replace it, they run alongside.
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
import { safeInvoke, safeInvokeAsync } from './safeInvoke';
import { initPostHog, trackEvent, identifyPseudonymous, resetPostHog, isPostHogActive } from './posthog';
import {
    initMetaPixel, trackMeta, trackMetaPageView, isMetaActive,
    newEventId, rememberCheckoutEventId, readCheckoutEventId, clearCheckoutEventId,
} from './meta';

export {
    // Sentry
    captureError,
    setObservabilityContext,
    clearObservabilityContext,
    isSentryActive,
    // Defensive instrumentation wrapper
    safeInvoke,
    safeInvokeAsync,
    // PostHog
    trackEvent,
    identifyPseudonymous,
    resetPostHog,
    isPostHogActive,
    // Meta Pixel
    initMetaPixel,
    trackMeta,
    trackMetaPageView,
    isMetaActive,
    newEventId,
    rememberCheckoutEventId,
    readCheckoutEventId,
    clearCheckoutEventId,
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
export type { SafeInvokeOptions } from './safeInvoke';

/**
 * One-call bootstrap. Idempotent. Call from src/main.tsx BEFORE
 * React mounts so we catch even the earliest render errors.
 */
export function initObservability(): void {
    initSentry();
    initPostHog();
}
