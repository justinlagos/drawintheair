/**
 * WP2B.6 (DIA-029): the ingest canary is a pipeline liveness check, not a
 * silence alarm. These tests pin the contract between the SQL side
 * (supabase/migrations/20260914000006_wp2b6_observability_canary.sql) and
 * the Better Stack monitor spec (config/betterstack.monitors.json) so a
 * later edit cannot quietly turn the canary into something that pages on a
 * quiet weekend or leaks event data through the anon endpoint.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const monitors = JSON.parse(
    readFileSync(resolve(ROOT, 'config/betterstack.monitors.json'), 'utf8'),
) as { monitors: Array<Record<string, unknown>> };
const migration = readFileSync(
    resolve(ROOT, 'supabase/migrations/20260914000006_wp2b6_observability_canary.sql'),
    'utf8',
);
const rollback = readFileSync(
    resolve(ROOT, 'supabase/migrations/rollbacks/20260914000006_wp2b6_observability_canary_rollback.sql'),
    'utf8',
);

/** Mirror of public.canary_status(): healthy while the newest row is under 45 min old. */
function canaryHealthy(newestAgeSeconds: number | null, thresholdMin = 45): boolean {
    if (newestAgeSeconds === null) return false;
    return newestAgeSeconds < thresholdMin * 60;
}

describe('ingest canary status rule', () => {
    it('is healthy when the newest canary row is younger than 45 minutes', () => {
        expect(canaryHealthy(0)).toBe(true);
        expect(canaryHealthy(15 * 60)).toBe(true);
        expect(canaryHealthy(44 * 60 + 59)).toBe(true);
    });
    it('is unhealthy after three missed 15-minute runs or when no row exists', () => {
        expect(canaryHealthy(45 * 60)).toBe(false);
        expect(canaryHealthy(60 * 60)).toBe(false);
        expect(canaryHealthy(null)).toBe(false);
    });
    it('the migration encodes the same 45-minute threshold and 15-minute schedule', () => {
        expect(migration).toMatch(/interval '45 minutes'/);
        expect(migration).toMatch(/cron\.schedule\('ingest-canary-15m', '3-59\/15 \* \* \* \*'/);
    });
});

describe('canary is excluded from product analytics', () => {
    it('stamps traffic_type=internal via meta, the value the dashboards exclude', () => {
        expect(migration).toMatch(/'traffic_type', 'internal'/);
        // The exclusion predicate the dashboards use, repeated in the digest and anomaly check.
        expect(migration).toMatch(/not in \('internal', 'qa', 'bot'\)/);
    });
    it('goes through the client ingest RPC rather than a direct insert', () => {
        expect(migration).toMatch(/public\.ingest_analytics_events\(payload\)/);
        expect(migration).not.toMatch(/insert into public\.analytics_events/i);
    });
    it('uses a fixed synthetic session id and a null device id', () => {
        expect(migration).toMatch(/c0a7a7a7-0000-4000-8000-000000000001/);
        expect(migration).toMatch(/'device_id',\s+null/);
    });
});

describe('Better Stack canary monitor', () => {
    const canary = monitors.monitors.find((m) => m.name === 'Supabase health — ingest canary');

    it('exists and polls the narrow canary_status RPC with the anon key', () => {
        expect(canary).toBeDefined();
        expect(canary?.url).toContain('/rest/v1/rpc/canary_status');
        expect(canary?.method).toBe('POST');
        expect((canary?.headers as Record<string, string>).apikey).toBe('${SUPABASE_ANON_KEY}');
    });
    it('alerts on the keyword, because the RPC returns 200 in both states', () => {
        expect(canary?.expected_status_codes).toEqual([200]);
        expect(canary?.keyword_present).toEqual(['true']);
    });
    it('is a p2 liveness check, not a p1 page', () => {
        expect(canary?.priority).toBe('p2');
    });
    it('the existing public-proof monitor is untouched', () => {
        const proof = monitors.monitors.find((m) => m.name === 'Supabase health — public proof RPC');
        expect(proof?.url).toContain('/rest/v1/rpc/dashboard_public_proof');
        expect(proof?.priority).toBe('p1');
    });
});

describe('rollback file', () => {
    it('stops the job, restores both function definitions and drops the new objects', () => {
        expect(rollback).toMatch(/cron\.unschedule\('ingest-canary-15m'\)/);
        expect(rollback).toMatch(/CREATE OR REPLACE FUNCTION public\.dashboard_daily_digest\(\)/);
        expect(rollback).toMatch(/CREATE OR REPLACE FUNCTION public\.dashboard_anomaly_check\(\)/);
        expect(rollback).toMatch(/drop function if exists public\.canary_status\(\)/);
        expect(rollback).toMatch(/drop function if exists app_private\.run_ingest_canary\(\)/);
        expect(rollback).toMatch(/drop index if exists public\.analytics_events_ingest_canary_idx/);
    });
    it('the restored anomaly check is the pre-WP2B.6 one (session_started), the forward one is not', () => {
        expect(rollback).toMatch(/event_name = 'session_started'/);
        expect(migration).not.toMatch(/event_name = 'session_started'/);
    });
});
