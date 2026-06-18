/**
 * Visit history (Sprint 3) — returning-visitor detection.
 *
 * A returning device shouldn't be treated like a stranger: we skip the
 * warm-up offer (already gated elsewhere) and greet them back. Persisted
 * in localStorage so it survives across sessions. Pure logic is exposed
 * for testing; the storage wrapper degrades gracefully in private mode.
 */

const KEY = 'dita_visits';

export interface VisitRecord {
    count: number;
    firstSeen: number;
    lastSeen: number;
}

export interface VisitState extends VisitRecord {
    /** True when this is NOT the device's first visit. */
    returning: boolean;
}

/** Pure: compute the next visit record from the previous one. */
export function nextVisit(prev: VisitRecord | null, now: number): VisitRecord {
    if (!prev) return { count: 1, firstSeen: now, lastSeen: now };
    return { count: prev.count + 1, firstSeen: prev.firstSeen, lastSeen: now };
}

/** Pure: is this a returning visitor, given a record? */
export function isReturning(rec: VisitRecord | null): boolean {
    return !!rec && rec.count > 1;
}

function read(): VisitRecord | null {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return null;
        const v = JSON.parse(raw) as VisitRecord;
        if (typeof v.count !== 'number') return null;
        return v;
    } catch {
        return null;
    }
}

/**
 * Record a visit (call once per app load). Returns the resulting state,
 * including whether this is a returning visitor.
 */
export function recordVisit(now: number = Date.now()): VisitState {
    const prev = read();
    const rec = nextVisit(prev, now);
    try {
        localStorage.setItem(KEY, JSON.stringify(rec));
    } catch {
        /* private mode — still report state for this load */
    }
    // The device is "returning" when this is not its first visit, i.e. the
    // resulting record's count is > 1.
    return { ...rec, returning: isReturning(rec) };
}

/** Read the current visit state without recording a new visit. */
export function getVisitState(): VisitState {
    const rec = read();
    return rec
        ? { ...rec, returning: rec.count > 1 }
        : { count: 0, firstSeen: 0, lastSeen: 0, returning: false };
}
