/**
 * WP2A.4 (DIA-012): parent trials must follow parent-profile creation, and no
 * role-less account may be defaulted to parent.
 *
 * The enforcement is SQL, so these tests pin the eligibility rule and the
 * safety properties of the migration: the backfill is criteria-based with an
 * expected-count assertion, teachers are excluded everywhere, and the rollback
 * does not take the backfilled entitlements away again.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const migration = readFileSync(
    resolve(ROOT, 'supabase/migrations/20260914000004_parent_trial_anchor.sql'),
    'utf8',
);
const rollback = readFileSync(
    resolve(ROOT, 'supabase/migrations/rollbacks/20260914000004_parent_trial_anchor_rollback.sql'),
    'utf8',
);

interface Account {
    isTeacherRow?: boolean;
    hasTeacherProfile?: boolean;
    metadataRole?: string | null;
}

/** Mirror of public._parent_trial_eligible(). */
function trialEligible(a: Account): boolean {
    if (a.isTeacherRow) return false;
    if (a.hasTeacherProfile) return false;
    if ((a.metadataRole ?? '').trim().toLowerCase() === 'teacher') return false;
    return true;
}

/** Mirror of the gate in handle_new_parent_user(): only an explicit parent role provisions. */
function createsParentProfileOnSignup(metadataRole: string | null): boolean {
    return (metadataRole ?? '').trim().toLowerCase() === 'parent';
}

describe('WP2A.4 trial eligibility', () => {
    it('gives a trial to a plain parent account', () => {
        expect(trialEligible({ metadataRole: 'parent' })).toBe(true);
    });
    it('gives a trial to a role-less account that reached register_parent', () => {
        expect(trialEligible({ metadataRole: null })).toBe(true);
        expect(trialEligible({ metadataRole: '' })).toBe(true);
    });
    it('never gives a trial to a teacher, however the profile row came to exist', () => {
        expect(trialEligible({ isTeacherRow: true })).toBe(false);
        expect(trialEligible({ hasTeacherProfile: true })).toBe(false);
        expect(trialEligible({ metadataRole: 'teacher' })).toBe(false);
        expect(trialEligible({ metadataRole: ' Teacher ' })).toBe(false);
        expect(trialEligible({ isTeacherRow: true, metadataRole: 'parent' })).toBe(false);
    });
});

describe('WP2A.4 signup gate', () => {
    it('provisions a parent profile only for an explicit parent role', () => {
        expect(createsParentProfileOnSignup('parent')).toBe(true);
        expect(createsParentProfileOnSignup(' Parent ')).toBe(true);
    });
    it('does not default a role-less Google OAuth account to parent', () => {
        expect(createsParentProfileOnSignup(null)).toBe(false);
        expect(createsParentProfileOnSignup('')).toBe(false);
    });
    it('does not provision a stray parent profile for a teacher signup', () => {
        expect(createsParentProfileOnSignup('teacher')).toBe(false);
    });
});

describe('WP2A.4 migration contract', () => {
    it('anchors the trial to a parent_profiles insert', () => {
        expect(migration).toMatch(/create trigger trg_parent_profile_start_trial\s+after insert on public\.parent_profiles/);
    });
    it('routes every trial creation through the single eligibility helper', () => {
        expect(migration).toMatch(/_start_parent_trial_if_eligible/);
        const rawCalls = migration.match(/perform public\.start_parent_trial\(/g) ?? [];
        // The only direct call left is the one inside _start_parent_trial_if_eligible.
        expect(rawCalls).toHaveLength(1);
    });
    it('backfills by criteria, not by a hard-coded id list', () => {
        expect(migration).not.toMatch(/'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'/i);
        expect(migration).toMatch(/create temp table _wp2a4_backfill/);
    });
    it('asserts the affected count and aborts on a mismatch', () => {
        expect(migration).toMatch(/v_expected int := 9;/);
        expect(migration).toContain("raise exception 'WP2A.4 backfill: % candidates, expected %");
    });
    it('verifies afterwards that every backfilled account has a subscription', () => {
        expect(migration).toContain('have a subscription afterwards');
        expect(migration).toContain("raise exception 'WP2A.4: % stranded parent profiles remain'");
    });
    it('stamps role metadata rather than leaving OAuth parents unlabelled', () => {
        expect(migration).toMatch(/jsonb_build_object\('role', 'parent'\)/);
        expect(migration).toMatch(/coalesce\(raw_user_meta_data->>'role', ''\) = ''/);
    });
});

describe('WP2A.4 rollback', () => {
    it('restores the previous trigger and RPC bodies', () => {
        expect(rollback).toMatch(/drop trigger if exists trg_parent_profile_start_trial/);
        expect(rollback).toMatch(/create or replace function public\.handle_new_parent_user/);
        expect(rollback).toMatch(/create or replace function public\.register_parent/);
    });
    it('does not delete the backfilled entitlements', () => {
        expect(rollback).not.toMatch(/delete from (public\.)?parent_subscriptions/i);
    });
});
