/**
 * Audience (Sprint 3) — home vs school path.
 *
 * A parent at home and a teacher in a classroom need different next
 * steps (save a child's progress vs. get classroom resources). We infer
 * the audience from acquisition signals where we can (UTM / referrer /
 * entry path), let the user confirm or correct it once, and persist the
 * choice so the path stays personalised on return.
 */

export type Audience = 'home' | 'school' | 'unknown';

const KEY = 'dita_audience';

export interface AudienceSignals {
    utmSource?: string | null;
    utmCampaign?: string | null;
    referrer?: string | null;
    path?: string | null;
}

const SCHOOL_HINTS = /teacher|school|classroom|class|edu|pilot|eyfs|send|curriculum/i;
const HOME_HINTS = /parent|family|home|kid|child/i;

/**
 * Pure: infer audience from acquisition signals. Returns 'unknown' when
 * nothing is conclusive (the UI then asks once).
 */
export function deriveAudience(s: AudienceSignals): Audience {
    const hay = [s.utmSource, s.utmCampaign, s.referrer, s.path]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
    if (!hay) return 'unknown';
    const school = SCHOOL_HINTS.test(hay);
    const home = HOME_HINTS.test(hay);
    if (school && !home) return 'school';
    if (home && !school) return 'home';
    return 'unknown';
}

/** Where each audience should be guided next. */
export function pathForAudience(a: Audience): { label: string; href: string } | null {
    if (a === 'home') return { label: "Save your child's progress", href: '/parent/signup' };
    if (a === 'school') return { label: 'Get free classroom resources', href: '/for-teachers' };
    return null;
}

function readStored(): Audience | null {
    try {
        const v = localStorage.getItem(KEY);
        return v === 'home' || v === 'school' ? v : null;
    } catch {
        return null;
    }
}

/** Stored choice wins; otherwise infer from the live URL/referrer. */
export function getAudience(): Audience {
    const stored = readStored();
    if (stored) return stored;
    if (typeof window === 'undefined') return 'unknown';
    const params = new URLSearchParams(window.location.search);
    return deriveAudience({
        utmSource: params.get('utm_source'),
        utmCampaign: params.get('utm_campaign'),
        referrer: typeof document !== 'undefined' ? document.referrer : null,
        path: window.location.pathname,
    });
}

export function setAudience(a: Audience): void {
    if (a === 'unknown') return;
    try {
        localStorage.setItem(KEY, a);
    } catch {
        /* private mode */
    }
}
