import { describe, it, expect, beforeEach } from 'vitest';
import {
    logEvent,
    startAttempt,
    endAttempt,
    getCurrentAttemptId,
    abandonOpenAttempt,
} from '../src/lib/analytics';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('attempt_id lifecycle (explicit API)', () => {
    beforeEach(() => endAttempt());

    it('startAttempt opens a uuid attempt that getCurrentAttemptId reflects', () => {
        const id = startAttempt();
        expect(id).toMatch(UUID_RE);
        expect(getCurrentAttemptId()).toBe(id);
    });

    it('endAttempt closes the attempt', () => {
        startAttempt();
        endAttempt();
        expect(getCurrentAttemptId()).toBeNull();
    });

    it('each attempt gets a distinct id', () => {
        const a = startAttempt();
        const b = startAttempt();
        expect(a).not.toBe(b);
    });
});

describe('attempt_id lifecycle (auto-managed via logEvent)', () => {
    beforeEach(() => endAttempt());

    it('mode_started opens an attempt', () => {
        expect(getCurrentAttemptId()).toBeNull();
        logEvent('mode_started', { game_mode: 'tracing' });
        expect(getCurrentAttemptId()).toMatch(UUID_RE);
    });

    it('a second mode_started opens a fresh attempt (replay / new activity)', () => {
        logEvent('mode_started', { game_mode: 'tracing' });
        const first = getCurrentAttemptId();
        logEvent('mode_started', { game_mode: 'balloon-math' });
        const second = getCurrentAttemptId();
        expect(first).not.toBeNull();
        expect(second).not.toBe(first);
    });

    it.each(['mode_completed', 'mode_abandoned', 'mode_switched'] as const)(
        'terminal event %s closes the attempt',
        (terminal) => {
            logEvent('mode_started', { game_mode: 'tracing' });
            expect(getCurrentAttemptId()).not.toBeNull();
            logEvent(terminal, { game_mode: 'tracing' });
            expect(getCurrentAttemptId()).toBeNull();
        },
    );

    it('non-terminal events during an attempt do not close it', () => {
        logEvent('mode_started', { game_mode: 'tracing' });
        const id = getCurrentAttemptId();
        logEvent('stage_started', { game_mode: 'tracing', stage_id: 'L' });
        logEvent('tracing_stroke_completed', { game_mode: 'tracing' });
        expect(getCurrentAttemptId()).toBe(id);
    });
});

describe('terminal-outcome guarantee (abandonOpenAttempt)', () => {
    beforeEach(() => endAttempt());

    it('closes an open attempt and returns the id it closed', () => {
        logEvent('mode_started', { game_mode: 'tracing' });
        const open = getCurrentAttemptId();
        const closed = abandonOpenAttempt('tab_close');
        expect(closed).toBe(open);
        expect(getCurrentAttemptId()).toBeNull();
    });

    it('is a no-op when no attempt is open', () => {
        expect(getCurrentAttemptId()).toBeNull();
        expect(abandonOpenAttempt('timed_out')).toBeNull();
        expect(getCurrentAttemptId()).toBeNull();
    });

    it.each(['tab_close', 'timed_out', 'tracking_lost', 'teacher_ended', 'nav_away'] as const)(
        'closes the attempt for exit reason %s',
        (reason) => {
            logEvent('mode_started', { game_mode: 'balloon-math' });
            expect(abandonOpenAttempt(reason)).not.toBeNull();
            expect(getCurrentAttemptId()).toBeNull();
        },
    );
});
