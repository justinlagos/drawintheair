/**
 * WP2A.3 (DIA-007 Stage B): the signing logic inside the
 * class-join-token Edge Function.
 *
 * The module under test is the same file the function imports. It uses
 * only Web Crypto, TextEncoder and atob/btoa, so it runs unchanged here.
 * A bug in this file either hands a child a token that RLS will not
 * honour, or hands out a scope wider than one session.
 */

import { describe, it, expect } from 'vitest';
import {
    buildStudentClaims,
    importHmacKey,
    signStudentToken,
    verifyStudentToken,
    needsRefresh,
    decodeClaimsUnsafe,
    isUuid,
    DEFAULT_TTL_SECONDS,
    MAX_TTL_SECONDS,
    REFRESH_THRESHOLD_SECONDS,
} from '../supabase/functions/class-join-token/token';

const SECRET = 'staging-jwt-secret-for-unit-tests-only-0123456789';
const OTHER_SECRET = 'a-different-secret-0123456789-abcdefghijklmnop';
const SESSION = '55555555-5555-4555-8555-000000000002';
const STUDENT = '57575757-5757-4757-8757-000000000205';
const TENANT = '6fc598e8-1551-4673-a202-8be9090859b8';
const NOW = 1_780_000_000;

describe('isUuid', () => {
    it('accepts the ids the database actually produces', () => {
        expect(isUuid(SESSION)).toBe(true);
        expect(isUuid(TENANT)).toBe(true);
    });

    it('rejects anything else', () => {
        expect(isUuid('')).toBe(false);
        expect(isUuid('55555555-5555-4555-8555')).toBe(false);
        expect(isUuid("' or 1=1 --")).toBe(false);
        expect(isUuid(null)).toBe(false);
        expect(isUuid(123)).toBe(false);
    });
});

describe('buildStudentClaims', () => {
    it('names exactly one session and one roster row', () => {
        const claims = buildStudentClaims({
            sessionId: SESSION, studentId: STUDENT, tenantId: TENANT, nowSeconds: NOW,
        });
        expect(claims.session_id).toBe(SESSION);
        expect(claims.student_id).toBe(STUDENT);
        expect(claims.tenant_id).toBe(TENANT);
        expect(claims.kind).toBe('student');
        expect(claims.iss).toBe('dia-class');
    });

    it('keeps role at anon so no new database role is needed', () => {
        expect(buildStudentClaims({ sessionId: SESSION, studentId: STUDENT, nowSeconds: NOW }).role)
            .toBe('anon');
    });

    it('carries no sub, so auth.uid() stays null and teacher policies cannot match', () => {
        const claims = buildStudentClaims({ sessionId: SESSION, studentId: STUDENT, nowSeconds: NOW });
        expect('sub' in claims).toBe(false);
    });

    it('defaults to a five hour life', () => {
        const claims = buildStudentClaims({ sessionId: SESSION, studentId: STUDENT, nowSeconds: NOW });
        expect(claims.exp - claims.iat).toBe(DEFAULT_TTL_SECONDS);
    });

    it('clamps a caller asking for a longer life', () => {
        const claims = buildStudentClaims({
            sessionId: SESSION, studentId: STUDENT, nowSeconds: NOW, ttlSeconds: 60 * 60 * 24 * 30,
        });
        expect(claims.exp - claims.iat).toBe(MAX_TTL_SECONDS);
    });

    it('accepts a null tenant', () => {
        expect(buildStudentClaims({
            sessionId: SESSION, studentId: STUDENT, tenantId: null, nowSeconds: NOW,
        }).tenant_id).toBeNull();
    });

    it('refuses to mint a token for a malformed scope', () => {
        expect(() => buildStudentClaims({ sessionId: 'nope', studentId: STUDENT, nowSeconds: NOW }))
            .toThrow(/session_id/);
        expect(() => buildStudentClaims({ sessionId: SESSION, studentId: 'nope', nowSeconds: NOW }))
            .toThrow(/student_id/);
        expect(() => buildStudentClaims({
            sessionId: SESSION, studentId: STUDENT, tenantId: 'nope', nowSeconds: NOW,
        })).toThrow(/tenant_id/);
    });

    it('refuses a nonsense clock or lifetime', () => {
        expect(() => buildStudentClaims({ sessionId: SESSION, studentId: STUDENT, nowSeconds: 0 }))
            .toThrow(/nowSeconds/);
        expect(() => buildStudentClaims({
            sessionId: SESSION, studentId: STUDENT, nowSeconds: NOW, ttlSeconds: -1,
        })).toThrow(/ttlSeconds/);
    });
});

describe('sign and verify', () => {
    const claims = buildStudentClaims({
        sessionId: SESSION, studentId: STUDENT, tenantId: TENANT, nowSeconds: NOW,
    });

    it('produces a three part HS256 JWT', async () => {
        const token = await signStudentToken(claims, await importHmacKey(SECRET));
        const parts = token.split('.');
        expect(parts).toHaveLength(3);
        const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
        expect(header).toEqual({ alg: 'HS256', typ: 'JWT' });
    });

    it('round-trips its own token', async () => {
        const key = await importHmacKey(SECRET);
        const token = await signStudentToken(claims, key);
        const result = await verifyStudentToken(token, key, NOW + 60);
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.claims.session_id).toBe(SESSION);
    });

    it('rejects a token signed with a different secret', async () => {
        const token = await signStudentToken(claims, await importHmacKey(OTHER_SECRET));
        const result = await verifyStudentToken(token, await importHmacKey(SECRET), NOW + 60);
        expect(result).toEqual({ ok: false, reason: 'BAD_SIGNATURE' });
    });

    it('rejects a token whose claims were edited to widen the scope', async () => {
        const key = await importHmacKey(SECRET);
        const token = await signStudentToken(claims, key);
        const [header, , signature] = token.split('.');
        const tampered = JSON.stringify({
            ...claims, session_id: '55555555-5555-4555-8555-000000000001',
        });
        const forged = `${header}.${Buffer.from(tampered).toString('base64url')}.${signature}`;
        expect(await verifyStudentToken(forged, key, NOW + 60))
            .toEqual({ ok: false, reason: 'BAD_SIGNATURE' });
    });

    it('rejects an expired token', async () => {
        const key = await importHmacKey(SECRET);
        const token = await signStudentToken(claims, key);
        expect(await verifyStudentToken(token, key, claims.exp))
            .toEqual({ ok: false, reason: 'EXPIRED' });
        expect(await verifyStudentToken(token, key, claims.exp - 1)).toMatchObject({ ok: true });
    });

    it('rejects a correctly signed token that is not a student token', async () => {
        const key = await importHmacKey(SECRET);
        const wrongKind = await signStudentToken(
            { ...claims, kind: 'teacher' as unknown as 'student' }, key,
        );
        expect(await verifyStudentToken(wrongKind, key, NOW + 60))
            .toEqual({ ok: false, reason: 'BAD_CLAIMS' });

        const wrongIssuer = await signStudentToken({ ...claims, iss: 'someone-else' }, key);
        expect(await verifyStudentToken(wrongIssuer, key, NOW + 60))
            .toEqual({ ok: false, reason: 'BAD_CLAIMS' });

        const escalated = await signStudentToken(
            { ...claims, role: 'service_role' as unknown as 'anon' }, key,
        );
        expect(await verifyStudentToken(escalated, key, NOW + 60))
            .toEqual({ ok: false, reason: 'BAD_CLAIMS' });
    });

    it('rejects malformed input without throwing', async () => {
        const key = await importHmacKey(SECRET);
        for (const bad of ['', 'a.b', 'a..c', 'one.two.three.four']) {
            expect(await verifyStudentToken(bad, key, NOW)).toMatchObject({ ok: false });
        }
    });

    it('refuses to build a key from an empty secret', async () => {
        await expect(importHmacKey('')).rejects.toThrow(/secret/);
    });
});

describe('needsRefresh', () => {
    it('is quiet with plenty of life left', () => {
        expect(needsRefresh({ exp: NOW + REFRESH_THRESHOLD_SECONDS + 1 }, NOW)).toBe(false);
    });

    it('fires inside the threshold and after expiry', () => {
        expect(needsRefresh({ exp: NOW + REFRESH_THRESHOLD_SECONDS }, NOW)).toBe(true);
        expect(needsRefresh({ exp: NOW - 1 }, NOW)).toBe(true);
    });
});

describe('decodeClaimsUnsafe', () => {
    it('reads claims without a key, for client-side expiry checks only', async () => {
        const claims = buildStudentClaims({ sessionId: SESSION, studentId: STUDENT, nowSeconds: NOW });
        const token = await signStudentToken(claims, await importHmacKey(SECRET));
        expect(decodeClaimsUnsafe(token)?.student_id).toBe(STUDENT);
    });

    it('returns null for junk', () => {
        expect(decodeClaimsUnsafe('nope')).toBeNull();
        expect(decodeClaimsUnsafe('a.b.c')).toBeNull();
    });
});
