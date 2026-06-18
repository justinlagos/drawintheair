import { describe, it, expect, beforeEach } from 'vitest';
import {
    getActivityCount,
    recordActivityCompleted,
    onActivityCompleted,
    resetActivityCount,
} from '../src/lib/activationCounter';
import { shouldShowExpectation } from '../src/features/feedback/expectationState';
import { shouldShowHappiness } from '../src/features/feedback/happinessState';
import { detectInAppBrowser } from '../src/features/feedback/feedbackContext';

describe('activationCounter', () => {
    beforeEach(() => resetActivityCount());

    it('starts at zero', () => {
        expect(getActivityCount()).toBe(0);
    });

    it('increments on each completed activity', () => {
        expect(recordActivityCompleted()).toBe(1);
        expect(recordActivityCompleted()).toBe(2);
        expect(getActivityCount()).toBe(2);
    });

    it('notifies subscribers with the new count', () => {
        const seen: number[] = [];
        const off = onActivityCompleted((c) => seen.push(c));
        recordActivityCompleted();
        recordActivityCompleted();
        off();
        recordActivityCompleted(); // not observed after unsubscribe
        expect(seen).toEqual([1, 2]);
    });

    it('a throwing listener does not break the counter', () => {
        const off = onActivityCompleted(() => {
            throw new Error('bad listener');
        });
        expect(() => recordActivityCompleted()).not.toThrow();
        expect(getActivityCount()).toBe(1);
        off();
    });
});

describe('survey gating thresholds', () => {
    it('expectation read appears only at/after the first activity', () => {
        expect(shouldShowExpectation(0)).toBe(false);
        expect(shouldShowExpectation(1)).toBe(true);
    });

    it('happiness check needs three completed activities', () => {
        expect(shouldShowHappiness(2)).toBe(false);
        expect(shouldShowHappiness(3)).toBe(true);
    });
});

describe('in-app browser handoff detection', () => {
    it('flags FB/IG webviews that should be handed off', () => {
        expect(detectInAppBrowser('... FBAN/FBIOS ...')).toBe(true);
        expect(detectInAppBrowser('... Instagram 300 ...')).toBe(true);
    });
    it('leaves real browsers alone', () => {
        expect(detectInAppBrowser('... Chrome/120 Mobile Safari/537.36')).toBe(false);
    });
});
