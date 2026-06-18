/**
 * Happiness-survey gating (trigger 5).
 *
 * Kept separate from the component so the component file only exports a
 * component (clean Fast Refresh boundary).
 */

const SESSION_KEY = 'dita_happiness_answered';

/** Whether the post-success survey should appear: after 3 games, once. */
export function shouldShowHappiness(completedGames: number): boolean {
    if (completedGames < 3) return false;
    try {
        return sessionStorage.getItem(SESSION_KEY) !== '1';
    } catch {
        return true;
    }
}

/** Mark the survey as answered for this session. */
export function markHappinessAnswered(): void {
    try {
        sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
        /* private mode — worst case we ask again next session */
    }
}
