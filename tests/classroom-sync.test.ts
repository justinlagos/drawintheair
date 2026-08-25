/**
 * P0 classroom sync fixes (2026-07-09): unit coverage for the pure logic
 * behind the incident — reconciliation change-detection (pause/resume with
 * an unchanged activity id), presence staleness, score-submit idempotency
 * and payload shape, and the child code-entry sanitiser.
 */

import { describe, it, expect } from 'vitest';
import { classroomStateChanged, engagementOf, PRESENCE_FRESH_MS, PRESENCE_STALE_MS } from '../src/features/classmode/reconcile';
import { buildRoundScoreRow, createOnceGuard } from '../src/features/classmode/roundScore';
import { sanitizeCodeInput, isValidCode } from '../src/features/classmode/sessionCode';
import type { SessionRow, SessionActivityRow, StudentRow } from '../src/features/classmode/conductor/types';

const session = (over: Partial<SessionRow> = {}): SessionRow => ({
    id: 'sess-1',
    teacher_id: 't-1',
    code: '6513',
    activity: 'balloon-math',
    class_state: 'in_activity',
    current_activity_id: 'act-1',
    class_name: null,
    scoreboard_visible: false,
    timer_seconds: 90,
    started_at: '2026-07-09T12:00:00Z',
    ended_at: null,
    created_at: '2026-07-09T11:59:00Z',
    updated_at: '2026-07-09T12:00:00Z',
    status: 'playing',
    round: 1,
    ...over,
});

const activity = (over: Partial<SessionActivityRow> = {}): SessionActivityRow => ({
    id: 'act-1',
    session_id: 'sess-1',
    activity: 'balloon-math',
    state: 'playing',
    ordinal: 1,
    started_at: '2026-07-09T12:00:00Z',
    ended_at: null,
    metadata: {},
    ...over,
});

const student = (over: Partial<StudentRow> = {}): StudentRow => ({
    id: 'stu-1',
    session_id: 'sess-1',
    name: 'Zara',
    avatar_seed: 'seed',
    joined_at: '2026-07-09T12:00:00Z',
    left_at: null,
    is_active: true,
    is_connected: true,
    kicked_at: null,
    kicked_reason: null,
    updated_at: '2026-07-09T12:00:00Z',
    ...over,
});

describe('classroomStateChanged (student reconciliation)', () => {
    it('returns false when nothing changed', () => {
        expect(classroomStateChanged(session(), activity(), session(), activity())).toBe(false);
    });

    it('detects PAUSE even though the activity id is unchanged (the incident gap)', () => {
        expect(classroomStateChanged(
            session(), activity({ state: 'playing' }),
            session({ status: 'paused' }), activity({ state: 'paused' }),
        )).toBe(true);
        // even if the session projection omitted status, activity state wins:
        expect(classroomStateChanged(
            session({ status: undefined }), activity({ state: 'playing' }),
            session({ status: undefined }), activity({ state: 'paused' }),
        )).toBe(true);
    });

    it('detects RESUME (paused → playing, same id)', () => {
        expect(classroomStateChanged(
            session({ status: 'paused' }), activity({ state: 'paused' }),
            session({ status: 'playing' }), activity({ state: 'playing' }),
        )).toBe(true);
    });

    it('detects a new activity id (teacher started the next game)', () => {
        expect(classroomStateChanged(
            session(), activity(),
            session({ current_activity_id: 'act-2' }), activity({ id: 'act-2', ordinal: 2 }),
        )).toBe(true);
    });

    it('detects end-activity (activity cleared, between_activities)', () => {
        expect(classroomStateChanged(
            session(), activity(),
            session({ class_state: 'between_activities', current_activity_id: null, activity: null, status: 'lobby' }),
            null,
        )).toBe(true);
    });

    it('detects timer changes', () => {
        expect(classroomStateChanged(
            session(), activity(),
            session({ timer_seconds: 120 }), activity(),
        )).toBe(true);
    });
});

describe('engagementOf (presence staleness)', () => {
    const t0 = Date.parse('2026-07-09T12:00:00Z');

    it('engaged while the heartbeat is fresh', () => {
        expect(engagementOf(student(), t0 + PRESENCE_FRESH_MS - 1)).toBe('engaged');
    });

    it('offline once the heartbeat is stale — closed tabs no longer show engaged forever', () => {
        expect(engagementOf(student(), t0 + PRESENCE_STALE_MS)).toBe('offline');
        expect(engagementOf(student(), t0 + 6 * 60 * 60 * 1000)).toBe('offline');
    });

    it('kicked is always offline regardless of heartbeat', () => {
        expect(engagementOf(student({ kicked_at: '2026-07-09T12:00:01Z' }), t0 + 1000)).toBe('offline');
    });

    it('grey zone (15–20s) falls back to the legacy booleans', () => {
        const inGrey = t0 + (PRESENCE_FRESH_MS + PRESENCE_STALE_MS) / 2;
        expect(engagementOf(student(), inGrey)).toBe('engaged');
        expect(engagementOf(student({ is_connected: false }), inGrey)).toBe('offline');
    });

    it('rows without updated_at fall back to joined_at', () => {
        expect(engagementOf(student({ updated_at: undefined }), t0 + 1000)).toBe('engaged');
        expect(engagementOf(student({ updated_at: undefined }), t0 + PRESENCE_STALE_MS)).toBe('offline');
    });
});

describe('round score submission', () => {
    it('builds the full insert payload with activity linkage and ordinal round', () => {
        const row = buildRoundScoreRow({
            sessionId: 'sess-1',
            studentId: 'stu-1',
            sessionActivityId: 'act-2',
            round: 2,
            activity: 'balloon-math',
            rawScore: 7,
            stars: 4,
            startedAtMs: 1_000_000,
            nowMs: 1_042_000,
        });
        expect(row.session_id).toBe('sess-1');
        expect(row.student_id).toBe('stu-1');
        expect(row.session_activity_id).toBe('act-2');
        expect(row.round).toBe(2); // ordinal, NOT hardcoded 1 — round=1 for every
        // activity collided with UNIQUE(session_id, student_id, round) and
        // silently lost every score after the first activity.
        expect(row.raw_score).toBe(7);
        expect(row.stars).toBe(4);
        expect(row.duration_seconds).toBe(42);
        expect(row.completed).toBe(true);
    });

    it('omits session_activity_id when unknown (legacy compatibility)', () => {
        const row = buildRoundScoreRow({
            sessionId: 's', studentId: 'st', round: 1, activity: 'balloon-math',
            rawScore: 0, stars: 1, startedAtMs: 0, nowMs: 0,
        });
        expect('session_activity_id' in row).toBe(false);
        expect(row.duration_seconds).toBe(0);
    });

    it('clamps stars into the DB check range 1-5 and never reports negative duration', () => {
        const row = buildRoundScoreRow({
            sessionId: 's', studentId: 'st', round: 1, activity: 'balloon-math',
            rawScore: 0, stars: 0, startedAtMs: 10_000, nowMs: 5_000,
        });
        expect(row.stars).toBe(1); // round_scores_stars_check requires 1..5
        expect(row.duration_seconds).toBe(0);
        expect(buildRoundScoreRow({
            sessionId: 's', studentId: 'st', round: 1, activity: 'balloon-math',
            rawScore: 999, stars: 9, startedAtMs: 0, nowMs: 0,
        }).stars).toBe(5);
    });

    it('once-guard: a burst of terminal events submits exactly once', () => {
        const guard = createOnceGuard();
        let submits = 0;
        // timer expiry + activity-ended prop + realtime echo + unmount all fire:
        for (let i = 0; i < 4; i++) {
            if (guard.tryAcquire()) submits++;
        }
        expect(submits).toBe(1);
        expect(guard.acquired()).toBe(true);
    });
});

describe('code entry sanitiser', () => {
    it('accepts a clean 4-digit code', () => {
        expect(sanitizeCodeInput('6513')).toBe('6513');
        expect(isValidCode(sanitizeCodeInput('6513'))).toBe(true);
    });

    it('strips non-digits from pasted content', () => {
        expect(sanitizeCodeInput('12 34')).toBe('1234');
        expect(sanitizeCodeInput('code: 9-8-7-6')).toBe('9876');
        expect(sanitizeCodeInput('\n 65 13 ')).toBe('6513');
    });

    it('caps at four digits (overtyping / long pastes)', () => {
        expect(sanitizeCodeInput('651398765')).toBe('6513');
    });

    it('empty and letters-only input yields empty string', () => {
        expect(sanitizeCodeInput('')).toBe('');
        expect(sanitizeCodeInput('abcd')).toBe('');
        expect(isValidCode('')).toBe(false);
    });
});
