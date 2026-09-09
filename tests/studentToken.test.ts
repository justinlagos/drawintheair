/**
 * WP2A.3 (DIA-007 Stage B): client-side rules for the student
 * capability token. These decide whether a child device keeps talking to
 * the database, so every branch that can silently strand a class in the
 * middle of a lesson is covered here.
 */

import { describe, it, expect } from 'vitest';
import {
    decodeStudentToken,
    isStudentTokenExpired,
    studentTokenNeedsRefresh,
    studentTokenSessionId,
    studentTokenMatches,
    EXPIRY_SKEW_MS,
    REFRESH_THRESHOLD_MS,
} from '../src/lib/studentToken';

const SESSION = '55555555-5555-4555-8555-000000000002';
const STUDENT = '57575757-5757-4757-8757-000000000205';
const OTHER_SESSION = '55555555-5555-4555-8555-000000000001';

function b64url(value: unknown): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function makeToken(overrides: Record<string, unknown> = {}): string {
    const claims = {
        iss: 'dia-class',
        aud: 'authenticated',
        role: 'anon',
        kind: 'student',
        session_id: SESSION,
        student_id: STUDENT,
        tenant_id: null,
        iat: 1_780_000_000,
        exp: 1_780_018_000,
        ...overrides,
    };
    return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(claims)}.c2lnbmF0dXJl`;
}

describe('decodeStudentToken', () => {
    it('reads the session and roster row out of a well-formed token', () => {
        const claims = decodeStudentToken(makeToken());
        expect(claims?.session_id).toBe(SESSION);
        expect(claims?.student_id).toBe(STUDENT);
        expect(claims?.exp).toBe(1_780_018_000);
    });

    it('rejects a token that is not a student token', () => {
        expect(decodeStudentToken(makeToken({ kind: 'teacher' }))).toBeNull();
    });

    it('rejects a teacher GoTrue token, which also carries a session_id claim', () => {
        // Supabase auth tokens have a top-level session_id (the auth session).
        // Without the kind gate this would read as a classroom capability.
        const gotrue = `${b64url({ alg: 'ES256', typ: 'JWT' })}.${b64url({
            iss: 'https://project.supabase.co/auth/v1',
            sub: '11111111-1111-4111-8111-000000000001',
            role: 'authenticated',
            session_id: '4071288f-6380-4400-9da7-6389d34918b3',
            exp: 1_780_018_000,
        })}.c2ln`;
        expect(decodeStudentToken(gotrue)).toBeNull();
    });

    it('rejects ids that are not uuids', () => {
        expect(decodeStudentToken(makeToken({ session_id: 'not-a-uuid' }))).toBeNull();
        expect(decodeStudentToken(makeToken({ student_id: '' }))).toBeNull();
    });

    it('rejects a missing or non-numeric expiry', () => {
        expect(decodeStudentToken(makeToken({ exp: undefined }))).toBeNull();
        expect(decodeStudentToken(makeToken({ exp: 'soon' }))).toBeNull();
    });

    it('rejects junk without throwing', () => {
        expect(decodeStudentToken('')).toBeNull();
        expect(decodeStudentToken('a.b')).toBeNull();
        expect(decodeStudentToken('a..c')).toBeNull();
        expect(decodeStudentToken('aaa.!!!not-base64!!!.ccc')).toBeNull();
        expect(decodeStudentToken(null)).toBeNull();
        expect(decodeStudentToken(undefined)).toBeNull();
        expect(decodeStudentToken(42)).toBeNull();
    });
});

describe('isStudentTokenExpired', () => {
    const exp = 1_780_018_000;
    const token = makeToken({ exp });

    it('is usable well before expiry', () => {
        expect(isStudentTokenExpired(token, (exp - 3600) * 1000)).toBe(false);
    });

    it('expires early by the skew, so a request in flight still lands', () => {
        expect(isStudentTokenExpired(token, exp * 1000 - EXPIRY_SKEW_MS - 1)).toBe(false);
        expect(isStudentTokenExpired(token, exp * 1000 - EXPIRY_SKEW_MS)).toBe(true);
    });

    it('treats an unreadable token as expired', () => {
        expect(isStudentTokenExpired('rubbish', Date.now())).toBe(true);
        expect(isStudentTokenExpired(null, Date.now())).toBe(true);
    });
});

describe('studentTokenNeedsRefresh', () => {
    const exp = 1_780_018_000;
    const token = makeToken({ exp });

    it('is quiet while there is plenty of life left', () => {
        expect(studentTokenNeedsRefresh(token, exp * 1000 - REFRESH_THRESHOLD_MS - 1000)).toBe(false);
    });

    it('asks for a swap once inside the threshold', () => {
        expect(studentTokenNeedsRefresh(token, exp * 1000 - REFRESH_THRESHOLD_MS)).toBe(true);
    });

    it('asks for a swap after expiry, so the poll can recover', () => {
        expect(studentTokenNeedsRefresh(token, (exp + 60) * 1000)).toBe(true);
    });

    it('asks for a swap when the stored value is unreadable', () => {
        expect(studentTokenNeedsRefresh('rubbish', Date.now())).toBe(true);
    });

    it('honours a caller-supplied threshold', () => {
        expect(studentTokenNeedsRefresh(token, exp * 1000 - 5000, 1000)).toBe(false);
        expect(studentTokenNeedsRefresh(token, exp * 1000 - 5000, 10_000)).toBe(true);
    });
});

describe('scope helpers', () => {
    const exp = 1_780_018_000;
    const token = makeToken({ exp });
    const now = (exp - 3600) * 1000;

    it('reports the scoped session while the token is live', () => {
        expect(studentTokenSessionId(token, now)).toBe(SESSION);
    });

    it('reports nothing once the token is dead', () => {
        expect(studentTokenSessionId(token, (exp + 1) * 1000)).toBeNull();
    });

    it('matches only its own session and roster row', () => {
        expect(studentTokenMatches(token, SESSION, STUDENT)).toBe(true);
        expect(studentTokenMatches(token, OTHER_SESSION, STUDENT)).toBe(false);
        expect(studentTokenMatches(token, SESSION, OTHER_SESSION)).toBe(false);
        expect(studentTokenMatches(null, SESSION, STUDENT)).toBe(false);
    });
});
