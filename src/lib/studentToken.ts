/**
 * Student capability token: decoding and lifetime rules.
 *
 * WP2A.3 (DIA-007 Stage B). The token itself is minted and signed by
 * the class-join-token Edge Function. Nothing here verifies a signature:
 * the client cannot and must not. These helpers only answer "is the
 * token I am holding still usable, and is it time to swap it".
 *
 * Keep this file free of imports so it can be unit tested on its own.
 */

/** sessionStorage key. Sits next to the classroom reconnect memo. */
export const STUDENT_TOKEN_KEY = 'cd_student_token_v1';

/** Swap the token when this much life or less remains. */
export const REFRESH_THRESHOLD_MS = 15 * 60 * 1000;

/**
 * Treat a token as unusable slightly before its stated expiry, so a
 * request started just under the wire does not arrive just over it.
 */
export const EXPIRY_SKEW_MS = 30 * 1000;

export interface StudentTokenClaims {
    iss: string;
    role: string;
    kind: string;
    session_id: string;
    student_id: string;
    tenant_id: string | null;
    iat: number;
    /** Seconds since the epoch, as in the JWT. */
    exp: number;
}

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function base64UrlDecode(segment: string): string {
    const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
    return atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
}

/**
 * Read the claims out of a token. Returns null for anything that is not
 * a well-formed student token, so a corrupted sessionStorage value can
 * never be mistaken for a live capability.
 */
export function decodeStudentToken(token: unknown): StudentTokenClaims | null {
    if (typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3 || parts.some((part) => part.length === 0)) return null;
    try {
        const claims = JSON.parse(base64UrlDecode(parts[1])) as Partial<StudentTokenClaims>;
        if (claims.kind !== 'student') return null;
        if (typeof claims.session_id !== 'string' || !UUID_RE.test(claims.session_id)) return null;
        if (typeof claims.student_id !== 'string' || !UUID_RE.test(claims.student_id)) return null;
        if (typeof claims.exp !== 'number' || !Number.isFinite(claims.exp)) return null;
        return claims as StudentTokenClaims;
    } catch {
        return null;
    }
}

/** True when the token is past its usable life. Unreadable counts as expired. */
export function isStudentTokenExpired(token: unknown, nowMs: number): boolean {
    const claims = decodeStudentToken(token);
    if (!claims) return true;
    return claims.exp * 1000 - EXPIRY_SKEW_MS <= nowMs;
}

/**
 * True when the reconciliation poll should ask the Edge Function for a
 * fresh token. An unreadable or already expired token also returns true:
 * the poll is the only place that can recover, and a refused refresh is
 * cheaper than a child silently losing the class.
 */
export function studentTokenNeedsRefresh(
    token: unknown,
    nowMs: number,
    thresholdMs: number = REFRESH_THRESHOLD_MS,
): boolean {
    const claims = decodeStudentToken(token);
    if (!claims) return true;
    return claims.exp * 1000 - nowMs <= thresholdMs;
}

/** The session this token is scoped to, or null if it is not usable. */
export function studentTokenSessionId(token: unknown, nowMs: number): string | null {
    if (isStudentTokenExpired(token, nowMs)) return null;
    return decodeStudentToken(token)?.session_id ?? null;
}

/**
 * True when the token in hand still matches the session and roster row
 * the screen is showing. Guards the case where a child rejoins a
 * different class in the same tab and the old token is still stored.
 */
export function studentTokenMatches(
    token: unknown,
    sessionId: string,
    studentId: string,
): boolean {
    const claims = decodeStudentToken(token);
    return claims?.session_id === sessionId && claims?.student_id === studentId;
}
