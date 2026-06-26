import { describe, it, expect } from 'vitest';
import {
    ActivePlayerLock,
    summarizeHand,
    type HandSample,
} from '../src/core/tracking/ActivePlayerLock';

// A hand at (x,y) with a given size. centroid/indexTip share the point so the
// scenarios read clearly; scale stands in for distance-to-camera.
const hand = (x: number, y: number, scale = 0.12): HandSample => ({
    wrist: { x, y: y + 0.06 },
    indexTip: { x, y },
    centroid: { x, y },
    scale,
});

// Drive the lock until it reports PLAYER_LOCKED, returning the final snapshot.
const lockOnto = (lock: ActivePlayerLock, sample: HandSample, startT = 0) => {
    lock.update([sample], startT);
    return lock.update([sample], startT + 700); // > lockStabilityMs (650)
};

describe('ActivePlayerLock — acquisition', () => {
    it('starts SEARCHING with no hands', () => {
        const lock = new ActivePlayerLock();
        const snap = lock.update([], 0);
        expect(snap.state).toBe('SEARCHING');
        expect(snap.ownedIndex).toBe(-1);
    });

    it('requires sustained stability before locking (no single-frame lock)', () => {
        const lock = new ActivePlayerLock();
        const first = lock.update([hand(0.5, 0.5)], 0);
        expect(first.state).toBe('CANDIDATE_DETECTED');
        expect(first.ownedIndex).toBe(-1);

        const tooSoon = lock.update([hand(0.5, 0.5)], 300); // < 650ms
        expect(tooSoon.state).toBe('CANDIDATE_DETECTED');

        const locked = lock.update([hand(0.5, 0.5)], 700); // >= 650ms
        expect(locked.state).toBe('PLAYER_LOCKED');
        expect(locked.ownedIndex).toBe(0);
    });

    it('locks immediately after an accepted wave', () => {
        const lock = new ActivePlayerLock();
        lock.notifyWaveAccepted(0);
        const snap = lock.update([hand(0.5, 0.5)], 0);
        expect(snap.state).toBe('PLAYER_LOCKED');
        expect(snap.ownedIndex).toBe(0);
    });

    it('prefers the central, closer hand as the player', () => {
        const lock = new ActivePlayerLock();
        // index 0 = far, edge of frame; index 1 = central and larger.
        const far = hand(0.1, 0.2, 0.06);
        const central = hand(0.5, 0.5, 0.14);
        lock.update([far, central], 0);
        const snap = lock.update([far, central], 700);
        expect(snap.state).toBe('PLAYER_LOCKED');
        expect(snap.ownedIndex).toBe(1);
    });
});

describe('ActivePlayerLock — hysteresis (no steal)', () => {
    it('does not switch when a closer/larger background hand appears', () => {
        const lock = new ActivePlayerLock();
        lockOnto(lock, hand(0.5, 0.5, 0.12), 0);

        // A bigger, more-central-ish hand joins. It must NOT take over.
        const player = hand(0.5, 0.5, 0.12);
        const intruder = hand(0.3, 0.5, 0.22);
        const snap = lock.update([player, intruder], 800);
        expect(snap.state).toBe('PLAYER_LOCKED');
        expect(snap.ownedIndex).toBe(0); // still the original player
    });

    it('follows the owned hand regardless of detection array order', () => {
        const lock = new ActivePlayerLock();
        lockOnto(lock, hand(0.5, 0.5, 0.12), 0);

        const player = hand(0.5, 0.5, 0.12);
        const intruder = hand(0.3, 0.5, 0.22);
        // Order A: player first
        let snap = lock.update([player, intruder], 800);
        expect(snap.ownedIndex).toBe(0);
        // Order B: intruder first — owner is now index 1, lock must follow it.
        snap = lock.update([intruder, player], 850);
        expect(snap.state).toBe('PLAYER_LOCKED');
        expect(snap.ownedIndex).toBe(1);
    });
});

describe('ActivePlayerLock — temporary loss & reacquisition', () => {
    it('holds the cursor and reacquires the same hand after a brief drop', () => {
        const lock = new ActivePlayerLock();
        lockOnto(lock, hand(0.5, 0.5, 0.12), 0);

        // Hand vanishes for one frame.
        const lost = lock.update([], 800);
        expect(lost.state).toBe('TEMPORARILY_LOST');
        expect(lost.ownedIndex).toBe(-1);
        expect(lost.heldPoint).not.toBeNull();

        // Same hand returns near where it was, well within the window.
        const back = lock.update([hand(0.51, 0.5, 0.12)], 1000);
        expect(back.state).toBe('PLAYER_LOCKED');
        expect(back.ownedIndex).toBe(0);
    });

    it('reacquires a hand that was MOVING when it dropped (no velocity over-extrapolation)', () => {
        // Regression: a hand moving at loss time used to be predicted far away,
        // so raising it again near where it left never re-bound — the cursor
        // stuck in REACQUIRING forever.
        const lock = new ActivePlayerLock();
        lockOnto(lock, hand(0.5, 0.5, 0.12), 0);
        // Drag the hand across the frame so it has real velocity.
        lock.update([hand(0.6, 0.5, 0.12)], 740);
        lock.update([hand(0.7, 0.5, 0.12)], 780);
        // It vanishes mid-motion.
        expect(lock.update([], 820).state).toBe('TEMPORARILY_LOST');
        // Raised again near where it actually left (not where velocity points).
        const back = lock.update([hand(0.71, 0.5, 0.12)], 1200);
        expect(back.state).toBe('PLAYER_LOCKED');
        expect(back.ownedIndex).toBe(0);
    });

    it('holds and nudges during a brief drop, keeping the same player', () => {
        const lock = new ActivePlayerLock();
        lockOnto(lock, hand(0.5, 0.5, 0.12), 0);

        // Short drop — within the hold window, identity is reserved.
        const early = lock.update([], 760); // ~60ms lost
        expect(early.state).toBe('TEMPORARILY_LOST');
        expect(early.ownedIndex).toBe(-1);
        expect(early.needsHandBackPrompt).toBe(false);

        const nudging = lock.update([], 1600); // ~900ms lost (> handBackPromptMs)
        expect(nudging.state).toBe('TEMPORARILY_LOST');
        expect(nudging.needsHandBackPrompt).toBe(true);

        // Same hand returns within the window — no switch, cursor resumes.
        const back = lock.update([hand(0.5, 0.5, 0.12)], 1700);
        expect(back.state).toBe('PLAYER_LOCKED');
        expect(back.ownedIndex).toBe(0);
    });

    it('auto-recovers to the next stable hand after the player truly leaves (no manual reset)', () => {
        const lock = new ActivePlayerLock();
        lockOnto(lock, hand(0.5, 0.5, 0.12), 0);

        // Player gone past the hold window — lock is dropped automatically.
        const dropped = lock.update([], 2400); // 1700ms lost > 1500ms window
        expect(dropped.ownedIndex).toBe(-1);
        expect(dropped.state).toBe('SEARCHING');

        // A hand (the same child returning, or whoever is now present) stabilises
        // and takes control WITHOUT anyone pressing Change player.
        lock.update([hand(0.45, 0.5, 0.12)], 2500);
        const recovered = lock.update([hand(0.45, 0.5, 0.12)], 3200);
        expect(recovered.state).toBe('PLAYER_LOCKED');
        expect(recovered.ownedIndex).toBe(0);
    });
});

describe('ActivePlayerLock — reset (teacher Change player)', () => {
    it('clears the lock and requires a fresh stable candidate to re-lock', () => {
        const lock = new ActivePlayerLock();
        lockOnto(lock, hand(0.5, 0.5, 0.12), 0);
        expect(lock.getState()).toBe('PLAYER_LOCKED');

        lock.reset(900);
        expect(lock.getState()).toBe('SEARCHING');
        expect(lock.getOwnedIndex()).toBe(-1);

        // A new hand must re-stabilise — no instant relock.
        const soon = lock.update([hand(0.4, 0.5, 0.12)], 1000);
        expect(soon.state).toBe('CANDIDATE_DETECTED');
        const relocked = lock.update([hand(0.4, 0.5, 0.12)], 1700);
        expect(relocked.state).toBe('PLAYER_LOCKED');
        expect(relocked.ownedIndex).toBe(0);
    });
});

describe('summarizeHand', () => {
    it('returns null for a malformed hand', () => {
        expect(summarizeHand([{ x: 0, y: 0 }])).toBeNull();
    });

    it('extracts index tip, a palm centroid and a positive scale', () => {
        // 21 landmarks laid out roughly like an upright hand near frame centre.
        const lm = Array.from({ length: 21 }, (_, i) => ({ x: 0.5 + i * 0.001, y: 0.6 - i * 0.002 }));
        const s = summarizeHand(lm)!;
        expect(s).not.toBeNull();
        expect(s.indexTip).toEqual({ x: lm[8].x, y: lm[8].y });
        expect(s.scale).toBeGreaterThan(0);
        expect(s.centroid.x).toBeGreaterThan(0);
        expect(s.centroid.y).toBeGreaterThan(0);
    });
});
