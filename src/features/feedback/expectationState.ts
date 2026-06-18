/**
 * Expectation-survey gating (Sprint 2). Separate from the component so
 * the component file only exports a component (clean Fast Refresh).
 */

const SESSION_KEY = 'dita_expectation_answered';

/** Show the expectation read after the first activity, once per session. */
export function shouldShowExpectation(activityCount: number): boolean {
    if (activityCount < 1) return false;
    try {
        return sessionStorage.getItem(SESSION_KEY) !== '1';
    } catch {
        return true;
    }
}

export function markExpectationAnswered(): void {
    try {
        sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
        /* private mode */
    }
}
