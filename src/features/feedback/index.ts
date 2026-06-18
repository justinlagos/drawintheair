/**
 * Feedback system — public surface.
 *
 * A stuck-state-first feedback system: it rescues confused users in the
 * moment (StuckHelp), captures why people leave (ExitFeedbackModal), and
 * measures satisfaction only from users who succeeded (HappinessCheck).
 * Every submission auto-carries non-identifying context.
 */

export { StuckHelp } from './StuckHelp';
export { ExitFeedbackModal } from './ExitFeedbackModal';
export { HappinessCheck } from './HappinessCheck';
export { shouldShowHappiness, markHappinessAnswered } from './happinessState';
export { ExpectationCheck } from './ExpectationCheck';
export { shouldShowExpectation, markExpectationAnswered } from './expectationState';
export { GestureDemo } from './GestureDemo';
export { submitFeedback } from './submitFeedback';
export type {
    FeedbackKind,
    ExitReason,
    Intent,
    FeedbackSubmission,
} from './submitFeedback';
export {
    collectFeedbackContext,
    detectInAppBrowser,
    flattenContext,
} from './feedbackContext';
export type {
    FeedbackContext,
    RuntimeContext,
    HandDetectionState,
    CameraPermissionState,
} from './feedbackContext';
export {
    selectStuckPrompt,
    STUCK_THRESHOLDS,
} from './stuckTriggers';
export type { StuckPrompt, StuckInput, CameraStatus } from './stuckTriggers';
