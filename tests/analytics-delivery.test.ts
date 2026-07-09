/**
 * Delivery-settlement logic for the analytics flush pipeline
 * (2026-07-09 repair of the 26-Jun → 9-Jul silent ingest outage).
 *
 * Root cause recap: `Prefer: resolution=ignore-duplicates` requires
 * Postgres to see conflicting rows, the anon role has no SELECT policy,
 * so EVERY flush 42501'd and requeued forever; only the unload beacon
 * (a plain insert) ever delivered rows — minus the in-flight front
 * batch, which is why prod sessions "started" at client_seq 21.
 *
 * These tests pin the pure decision logic that replaces it:
 *   • which errors mean "the ingest RPC doesn't exist, fall back"
 *   • which plain-insert outcomes settle a batch vs requeue it
 */
import { describe, it, expect } from 'vitest';
import { isMissingRpc, plainInsertSettled } from '../src/lib/analytics';

describe('isMissingRpc', () => {
    it('recognises PostgREST function-not-found (PGRST202)', () => {
        expect(isMissingRpc('PGRST202')).toBe(true);
    });

    it('recognises a raw 404 (proxy/gateway shape)', () => {
        expect(isMissingRpc('404')).toBe(true);
    });

    it('does NOT treat RLS rejection as a missing function', () => {
        // 42501 was the outage: it must surface as a failure (requeue),
        // never silently reroute.
        expect(isMissingRpc('42501')).toBe(false);
    });

    it('does NOT treat network failure or undefined as missing', () => {
        expect(isMissingRpc('FETCH_ERROR')).toBe(false);
        expect(isMissingRpc(undefined)).toBe(false);
    });
});

describe('plainInsertSettled', () => {
    it('success settles the batch', () => {
        expect(plainInsertSettled(null)).toBe(true);
    });

    it('duplicate-key (23505) settles the batch — rows already exist, retrying would poison the queue forever', () => {
        expect(plainInsertSettled({ code: '23505' })).toBe(true);
    });

    it('RLS rejection (42501) does NOT settle — must requeue and surface', () => {
        expect(plainInsertSettled({ code: '42501' })).toBe(false);
    });

    it('network / server errors do NOT settle', () => {
        expect(plainInsertSettled({ code: 'FETCH_ERROR' })).toBe(false);
        expect(plainInsertSettled({ code: '500' })).toBe(false);
        expect(plainInsertSettled({ code: undefined })).toBe(false);
    });
});
