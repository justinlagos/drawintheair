import { describe, it, expect } from 'vitest';
import { evaluateModeGate } from '../src/features/menu/modeGate';

/**
 * The menu's premium paywall is enforced by a single pure function so that
 * every input source (mouse, touch, keyboard, hand-dwell) makes the identical
 * decision. These tests lock that contract: a regression here is the same
 * class of bug as the original hand-dwell paywall bypass.
 */
describe('evaluateModeGate', () => {
  it('always allows free modes, regardless of access', () => {
    expect(evaluateModeGate('free', false)).toEqual({ allowed: true, locked: false });
    expect(evaluateModeGate('free', true)).toEqual({ allowed: true, locked: false });
  });

  it('locks premium modes when the viewer has no access', () => {
    expect(evaluateModeGate('premium', false)).toEqual({ allowed: false, locked: true });
  });

  it('allows premium modes when the viewer has an active subscription/trial', () => {
    expect(evaluateModeGate('premium', true)).toEqual({ allowed: true, locked: false });
  });

  it('never reports a mode as both allowed and locked', () => {
    for (const tier of ['free', 'premium'] as const) {
      for (const hasAccess of [false, true]) {
        const r = evaluateModeGate(tier, hasAccess);
        expect(r.allowed).toBe(!r.locked);
      }
    }
  });
});
