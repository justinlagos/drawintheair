/**
 * Activation counter — how many activities the user has completed this
 * session. Lives at the lib layer (no UI deps) so analytics can bump it
 * without an import cycle, and the App can subscribe to drive surveys:
 *
 *   • 1st completion → ExpectationCheck ("did it work as expected?")
 *   • 3rd completion → HappinessCheck ("how did today go?")
 *
 * Backed by sessionStorage so a mid-session reload doesn't reset the
 * count (and re-pop a survey), with an in-memory fallback for private
 * mode / SSR. Pub/sub so React can react.
 */

const KEY = 'dita_activity_count';
let memory = 0;
const listeners = new Set<(count: number) => void>();

function read(): number {
    try {
        const v = sessionStorage.getItem(KEY);
        return v ? parseInt(v, 10) || 0 : memory;
    } catch {
        return memory;
    }
}

function write(n: number): void {
    memory = n;
    try {
        sessionStorage.setItem(KEY, String(n));
    } catch {
        /* private mode — in-memory fallback already set */
    }
}

/** Current count of completed activities this session. */
export function getActivityCount(): number {
    return read();
}

/**
 * Record a completed activity (called from analytics on `mode_completed`).
 * Returns the new count. Notifies subscribers.
 */
export function recordActivityCompleted(): number {
    const next = read() + 1;
    write(next);
    listeners.forEach((cb) => {
        try {
            cb(next);
        } catch {
            /* a bad listener must not break analytics */
        }
    });
    return next;
}

/** Subscribe to completion events. Returns an unsubscribe function. */
export function onActivityCompleted(cb: (count: number) => void): () => void {
    listeners.add(cb);
    return () => listeners.delete(cb);
}

/** Test/util: reset the counter. */
export function resetActivityCount(): void {
    write(0);
}
