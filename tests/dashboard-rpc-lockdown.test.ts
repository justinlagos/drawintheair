/**
 * WP2A.2 (DIA-006): the dashboard_* lock-down.
 *
 * The enforcement itself is SQL, so these tests pin the two things a later
 * edit could quietly break: the classification encoded in the migration
 * (which functions get a guard, which stay anon-callable, which are dropped),
 * and the small-cohort suppression rule the public transparency page relies
 * on. The rehearsal evidence for the runtime behaviour is in
 * docs/audits/evidence/release/WP2A.2/README.md.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const migration = readFileSync(
    resolve(ROOT, 'supabase/migrations/20260914000002_dashboard_rpc_lockdown.sql'),
    'utf8',
);
const rollback = readFileSync(
    resolve(ROOT, 'supabase/migrations/rollbacks/20260914000002_dashboard_rpc_lockdown_rollback.sql'),
    'utf8',
);
const monitors = JSON.parse(
    readFileSync(resolve(ROOT, 'config/betterstack.monitors.json'), 'utf8'),
) as { monitors: Array<Record<string, unknown>> };

/** The three functions that must stay callable with the anon key. */
const PUBLIC_THREE = [
    'dashboard_public_proof',
    'dashboard_transparency_report',
    'dashboard_transparency_signals',
];

/** The four with no caller anywhere in the deployed app. */
const UNUSED_FOUR = [
    'dashboard_classrooms',
    'dashboard_gesture_quality',
    'dashboard_ingest_latency',
    'dashboard_pipeline_status',
];

/**
 * Mirror of the guard in public._dashboard_guard(). A caller is admitted with
 * no JWT at all (cron, psql), as the service role, or as a platform admin.
 */
function guardAdmits(claims: { role?: string } | null, isPlatformAdmin: boolean): boolean {
    if (claims === null) return true;
    if (claims.role === 'service_role') return true;
    return isPlatformAdmin;
}

/** Mirror of the transparency_report suppression rule. */
function reportSuppressed(distinctDevices: number): boolean {
    return distinctDevices < 5;
}

/** Mirror of the transparency_signals suppression rules. */
function signalsSuppression(eligibleModes: number, classroomsEngaged: number) {
    return {
        classroomsEngaged: classroomsEngaged < 5 ? null : classroomsEngaged,
        namedModesSuppressed: eligibleModes < 2,
    };
}

describe('WP2A.2 guard rule', () => {
    it('admits cron and psql, which have no request JWT', () => {
        expect(guardAdmits(null, false)).toBe(true);
    });
    it('admits the service role, which the analytics digest runs as', () => {
        expect(guardAdmits({ role: 'service_role' }, false)).toBe(true);
    });
    it('admits a platform admin', () => {
        expect(guardAdmits({ role: 'authenticated' }, true)).toBe(true);
    });
    it('refuses a signed-in parent or teacher who is not a platform admin', () => {
        expect(guardAdmits({ role: 'authenticated' }, false)).toBe(false);
        expect(guardAdmits({ role: 'anon' }, false)).toBe(false);
    });
});

describe('WP2A.2 small-cohort suppression', () => {
    it('drops the per-mode breakdown below five distinct learners', () => {
        expect(reportSuppressed(0)).toBe(true);
        expect(reportSuppressed(4)).toBe(true);
        expect(reportSuppressed(5)).toBe(false);
        expect(reportSuppressed(50)).toBe(false);
    });
    it('nulls the classroom count below five classrooms', () => {
        expect(signalsSuppression(3, 1).classroomsEngaged).toBeNull();
        expect(signalsSuppression(3, 4).classroomsEngaged).toBeNull();
        expect(signalsSuppression(3, 5).classroomsEngaged).toBe(5);
    });
    it('drops the named single-mode signals when fewer than two modes pass k=5', () => {
        expect(signalsSuppression(0, 9).namedModesSuppressed).toBe(true);
        expect(signalsSuppression(1, 9).namedModesSuppressed).toBe(true);
        expect(signalsSuppression(2, 9).namedModesSuppressed).toBe(false);
    });
});

describe('WP2A.2 migration contract', () => {
    it('wraps exactly the 29 unguarded admin-only functions', () => {
        expect(migration).toMatch(/v_expected int := 29;/);
        for (const fn of ['dashboard_progression_top_learners', 'dashboard_progression_for_learner',
            'dashboard_latest_sessions', 'dashboard_observations', 'dashboard_daily_digest']) {
            expect(migration).toContain(`'${fn}'`);
        }
    });

    it('leaves dashboard_growth alone, because it already carries its own guard', () => {
        expect(migration).not.toMatch(/'dashboard_growth'/);
    });

    it('never re-grants anon EXECUTE on anything but the public three', () => {
        const grants = migration.match(/grant execute on function public\.\w+\([^)]*\) to [^;]+;/g) ?? [];
        const anonGrants = grants.filter(g => /\banon\b/.test(g));
        expect(anonGrants).toHaveLength(PUBLIC_THREE.length);
        for (const fn of PUBLIC_THREE) {
            expect(anonGrants.some(g => g.includes(`public.${fn}(`))).toBe(true);
        }
    });

    it('drops the four unused functions', () => {
        for (const fn of UNUSED_FOUR) {
            expect(migration).toMatch(new RegExp(`drop function if exists public\\.${fn}\\(`));
        }
    });

    it('removes dashboard_classrooms from the daily digest before dropping it', () => {
        const digestIdx = migration.indexOf('_dashboard_daily_digest_impl');
        const dropIdx = migration.indexOf('drop function if exists public.dashboard_classrooms');
        expect(digestIdx).toBeGreaterThan(-1);
        expect(dropIdx).toBeGreaterThan(digestIdx);
        expect(migration).not.toMatch(/select public\.dashboard_classrooms\(/);
    });

    it('keeps the impl functions unreachable from every API role', () => {
        expect(migration).toMatch(/revoke all on function public\.%I\(%s\) from anon, authenticated, service_role/);
        expect(migration).toContain("raise exception 'WP2A.2: impl function(s) still reachable: %'");
    });

    it('asserts its own post-conditions before the transaction ends', () => {
        expect(migration).toContain("raise exception 'WP2A.2: anon still holds EXECUTE on %'");
        expect(migration).toContain("raise exception 'WP2A.2: unguarded admin function(s): %'");
    });
});

describe('WP2A.2 rollback', () => {
    it('restores every wrapped function by renaming the impl back', () => {
        expect(rollback).toMatch(/alter function public\.%I\(%s\) rename to %I/);
        expect(rollback).toMatch(/\^_dashboard_\.\*_impl\$/);
    });
    it('does not re-grant anon on the admin-only functions that WP0.5.2 revoked', () => {
        const grants = rollback.match(/grant execute on function public\.\w+\([^)]*\) to [^;]+;/g) ?? [];
        for (const g of grants.filter(x => /\banon\b/.test(x))) {
            expect(PUBLIC_THREE.some(fn => g.includes(`public.${fn}(`))).toBe(true);
        }
    });
});

describe('WP2A.2 does not break the public surface', () => {
    it('the Better Stack p1 monitor still targets dashboard_public_proof by POST', () => {
        const m = monitors.monitors.find(x => String(x.url).endsWith('/rpc/dashboard_public_proof'));
        expect(m).toBeDefined();
        expect(m?.method).toBe('POST');
        expect(m?.expected_status_codes).toEqual([200]);
    });
    it('public_proof stays anon-callable and is memoised so the monitor cannot fan out full scans', () => {
        expect(migration).toMatch(/grant execute on function public\.dashboard_public_proof\(\) to public, anon/);
        expect(migration).toMatch(/interval '60 seconds'/);
    });
    it('keeps the transparency page default window at 90 days', () => {
        expect(migration).toMatch(/dashboard_transparency_report\(in_days integer default 90\)/);
        expect(migration).toMatch(/dashboard_transparency_signals\(in_days integer default 90\)/);
    });
});
