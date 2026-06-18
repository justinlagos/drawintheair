/**
 * Feedback submission — one funnel for every kind of feedback.
 *
 * Routing (reuses existing infra, adds nothing new):
 *   1. submitFormData (type 'feedback') → Supabase edge fn → Sheets → localStorage.
 *   2. logEvent(...) → analytics_events table, so reasons are queryable
 *      next to the rest of the funnel instead of stuck in an inbox.
 *
 * Privacy: context is coarse and non-identifying; email is optional and
 * only ever attached when the user volunteers it (open-text widget).
 */

import { submitFormData } from '../../lib/formSubmission';
import { logEvent } from '../../lib/analytics';
import {
    collectFeedbackContext,
    flattenContext,
    type RuntimeContext,
    type FeedbackContext,
} from './feedbackContext';

export type FeedbackKind =
    | 'stuck_help'   // outcome of a rescue prompt (e.g. "couldn't get it working")
    | 'exit_reason'  // trigger 4 micro-survey
    | 'open_text'    // free-text widget / "something isn't working"
    | 'happiness'    // trigger 5 post-success rating
    | 'expectation'; // expectation-gap after first success (1-3)

/** What the user came to do (captured on exit). */
export type Intent =
    | 'start_a_game'
    | 'test_it_out'
    | 'help_child_learn'
    | 'explore_website'
    | 'school_use'
    | 'not_sure';

/** Canonical reasons for the exit micro-survey (trigger 4). */
export type ExitReason =
    | 'didnt_understand'
    | 'camera_issue'
    | 'child_not_interested'
    | 'felt_broken'
    | 'just_exploring';

export interface FeedbackSubmission {
    kind: FeedbackKind;
    /** Structured reason code (exit survey, stuck help). */
    reason?: ExitReason | string;
    /** What the user came to do (exit survey). */
    intent?: Intent | string;
    /** Free-text message (open-text widget). Optional. */
    message?: string;
    /** Happiness rating 1–4 (😞😐🙂🤩) or expectation 1–3 (😕🙂🤩). */
    rating?: number;
    /** Volunteered email — only the open-text widget collects this. */
    email?: string;
    /** Live runtime signals the component knows (hand/camera/step). */
    runtime?: RuntimeContext;
    /** Pre-built context override (mostly for tests). */
    context?: FeedbackContext;
}

/**
 * Submit feedback. Resolves to whether the remote write reported success;
 * never throws (a feedback widget must not be able to break a session).
 */
export async function submitFeedback(
    sub: FeedbackSubmission,
): Promise<{ ok: boolean }> {
    const context = sub.context ?? collectFeedbackContext(sub.runtime);

    // Fire analytics first — it's synchronous-enqueue and must record even
    // if the network write below fails.
    try {
        logEvent('feedback_submitted', {
            page: context.page,
            game_mode: context.game_mode ?? undefined,
            value_number: typeof sub.rating === 'number' ? sub.rating : undefined,
            meta: {
                kind: sub.kind,
                reason: sub.reason,
                intent: sub.intent,
                rating: sub.rating,
                onboarding_step: context.onboarding_step,
                hand_detection: context.hand_detection,
                camera_permission: context.camera_permission,
                in_app_browser: context.in_app_browser,
                device_type: context.device_type,
                browser: context.browser,
                session_length_ms: context.session_length_ms,
            },
        });

        if (sub.kind === 'exit_reason' && sub.reason) {
            logEvent('exit_reason_submitted', { meta: { reason: sub.reason } });
        }
        if (sub.intent) {
            logEvent('intent_captured', { meta: { intent: sub.intent } });
        }
        if (sub.kind === 'happiness' && typeof sub.rating === 'number') {
            logEvent('happiness_rating', { value_number: sub.rating });
        }
        if (sub.kind === 'expectation' && typeof sub.rating === 'number') {
            logEvent('expectation_rating', { value_number: sub.rating });
        }
    } catch {
        /* analytics must never break feedback */
    }

    // Persist the full record through the unified form pipeline.
    try {
        const res = await submitFormData({
            type: 'feedback',
            email: sub.email?.trim() || undefined,
            message:
                sub.message?.trim() ||
                `[${sub.kind}] ${sub.reason ?? ''}${
                    sub.rating != null ? ` rating=${sub.rating}` : ''
                }`.trim(),
            feedback_kind: sub.kind,
            feedback_reason: sub.reason ?? '',
            feedback_intent: sub.intent ?? '',
            feedback_rating: sub.rating ?? '',
            ...flattenContext(context),
        });
        return { ok: res.success };
    } catch {
        return { ok: false };
    }
}
