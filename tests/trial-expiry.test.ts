/**
 * WP2A.5 (DIA-015): expired trials must leave the `trialing` status, without
 * swallowing the "your trial has ended" email and without touching anything
 * Stripe manages.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describeSubscriptionState } from '../src/lib/parentApi';

const ROOT = resolve(__dirname, '..');
const migration = readFileSync(
    resolve(ROOT, 'supabase/migrations/20260914000005_trial_expiry_transition.sql'),
    'utf8',
);
const rollback = readFileSync(
    resolve(ROOT, 'supabase/migrations/rollbacks/20260914000005_trial_expiry_transition_rollback.sql'),
    'utf8',
);
const emailDispatch = readFileSync(
    resolve(ROOT, 'supabase/functions/email-dispatch/index.ts'),
    'utf8',
);

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const GRACE = 48 * HOUR;

interface Row {
    status: string;
    trialEndMsFromNow: number | null;
    expiryEmailSent: boolean;
    stripeSubscriptionId: string | null;
}

/** Mirror of app_private.expire_parent_trials()'s predicate. */
function shouldTransition(r: Row): boolean {
    if (r.status !== 'trialing') return false;
    if (r.trialEndMsFromNow === null) return false;
    if (r.trialEndMsFromNow > 0) return false;
    if (r.stripeSubscriptionId !== null) return false;
    return r.expiryEmailSent || r.trialEndMsFromNow <= -GRACE;
}

/** Mirror of public.parent_subscription_state() for the trial branches. */
function readState(status: string, trialEndMsFromNow: number | null): string {
    if (status === 'trial_expired') return 'trial_expired';
    if (status === 'trialing') {
        if (trialEndMsFromNow !== null && trialEndMsFromNow <= 0) return 'trial_expired';
        return 'trial_active';
    }
    return status;
}

function row(o: Partial<Row> = {}): Row {
    return {
        status: 'trialing',
        trialEndMsFromNow: -3 * DAY,
        expiryEmailSent: true,
        stripeSubscriptionId: null,
        ...o,
    };
}

describe('WP2A.5 transition predicate', () => {
    it('transitions an expired trial whose ending email has been sent', () => {
        expect(shouldTransition(row({ trialEndMsFromNow: -HOUR, expiryEmailSent: true }))).toBe(true);
    });
    it('waits inside the grace period when the ending email has not gone out', () => {
        expect(shouldTransition(row({ trialEndMsFromNow: -HOUR, expiryEmailSent: false }))).toBe(false);
        expect(shouldTransition(row({ trialEndMsFromNow: -47 * HOUR, expiryEmailSent: false }))).toBe(false);
    });
    it('transitions anyway once the grace period has passed with no email', () => {
        expect(shouldTransition(row({ trialEndMsFromNow: -GRACE, expiryEmailSent: false }))).toBe(true);
        expect(shouldTransition(row({ trialEndMsFromNow: -10 * DAY, expiryEmailSent: false }))).toBe(true);
    });
    it('leaves a live trial alone', () => {
        expect(shouldTransition(row({ trialEndMsFromNow: 2 * DAY }))).toBe(false);
    });
    it('leaves a Stripe-managed subscription to billing-health', () => {
        expect(shouldTransition(row({ stripeSubscriptionId: 'sub_123' }))).toBe(false);
    });
    it('leaves rows with no trial_end alone', () => {
        expect(shouldTransition(row({ trialEndMsFromNow: null }))).toBe(false);
    });
    it('is idempotent: an already transitioned row is not picked up again', () => {
        expect(shouldTransition(row({ status: 'trial_expired' }))).toBe(false);
    });
});

describe('WP2A.5 read model is unchanged for parents', () => {
    it('gives the same answer before and after the flip', () => {
        expect(readState('trialing', -HOUR)).toBe('trial_expired');
        expect(readState('trial_expired', -HOUR)).toBe('trial_expired');
    });
    it('still reports a live trial as active', () => {
        expect(readState('trialing', 2 * DAY)).toBe('trial_active');
    });
    it('keeps the "Trial ended" copy rather than "Subscription expired"', () => {
        expect(describeSubscriptionState('trial_expired')).toBe('Trial ended');
        expect(describeSubscriptionState('expired')).toBe('Subscription expired');
    });
});

describe('WP2A.5 migration contract', () => {
    it('schedules a nightly job at 01:30, before the 02:00 retention purge', () => {
        expect(migration).toMatch(/cron\.schedule\(\s*'expire-parent-trials-nightly',\s*'30 1 \* \* \*'/);
    });
    it('is not callable over the REST API', () => {
        expect(migration).toMatch(/request\.jwt\.claims/);
        expect(migration).toContain("raise exception 'not callable over the API'");
        expect(migration).toMatch(/revoke all on function app_private\.expire_parent_trials\(interval\) from anon, authenticated/);
    });
    it('uses a 48 hour grace period in both the function default and the job', () => {
        expect(migration).toMatch(/in_grace interval default interval '48 hours'/);
        expect(migration).toMatch(/expire_parent_trials\(interval '48 hours'\)/);
    });
    it('asserts the catch-up moved exactly the rows that matched', () => {
        expect(migration).toContain("raise exception 'WP2A.5: transitioned % but % rows matched the predicate'");
        expect(migration).toContain('eligible rows still trialing after the catch-up');
    });
    it('keeps growth reporting counting these as lapsed trials, not cancellations', () => {
        expect(migration).toMatch(/ps\.status = 'trial_expired'\s*\n\s*or \(ps\.status = 'trialing'/);
        expect(migration).toMatch(/status not in \('active', 'trialing', 'trial_expired'\)/);
    });
});

describe('WP2A.5 does not swallow the trial-ended email', () => {
    it('email-dispatch still drives off status = trialing', () => {
        expect(emailDispatch).toMatch(/\.in\('status', \['trialing'\]\)/);
    });
    it('so the transition waits for reminder_expired_sent_at', () => {
        expect(migration).toMatch(/ps\.reminder_expired_sent_at is not null/);
    });
});

describe('WP2A.5 rollback', () => {
    it('stops the job before reversing the flip', () => {
        const unschedule = rollback.indexOf('cron.unschedule');
        const update = rollback.indexOf("set status = 'trialing'");
        expect(unschedule).toBeGreaterThan(-1);
        expect(update).toBeGreaterThan(unschedule);
    });
    it('reverses every row the transition wrote', () => {
        expect(rollback).toMatch(/where status = 'trial_expired'/);
    });
});
