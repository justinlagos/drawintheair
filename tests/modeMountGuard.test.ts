import { describe, it, expect } from 'vitest';
import { evaluateModeMount, type ModeMountInput } from '../src/features/menu/modeMountGuard';
import { MODE_CATALOG, GAME_MODE_IDS, getModeTier, isGameMode } from '../src/features/menu/modeCatalog';
import type { ParentControls } from '../src/lib/parentApi';

/**
 * DIA-014: the paywall and parental controls used to be enforced only in
 * the menu, so `?screen=game&mode=<paid mode>` mounted a paid mode with no
 * check. evaluateModeMount is the single decision App.tsx makes at the mount
 * point, whatever navigation path set the app state to 'game'. These tests
 * lock that contract.
 */

function controls(overrides: Partial<ParentControls> = {}): ParentControls {
  return {
    child_profile_id: 'c1',
    parent_id: 'p1',
    daily_play_limit_minutes: null,
    allowed_categories: null,
    paused: false,
    sound_enabled: true,
    camera_reassurance: 'standard',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

/** Anonymous /play visitor: no account, no learner, access check done. */
function anon(overrides: Partial<ModeMountInput> = {}): ModeMountInput {
  return {
    context: 'play',
    tier: 'free',
    hasAccess: false,
    accessChecked: true,
    controls: null,
    todaySeconds: 0,
    ...overrides,
  };
}

describe('evaluateModeMount', () => {
  it('free mode, anonymous visitor: allow', () => {
    expect(evaluateModeMount(anon({ tier: 'free' }))).toEqual({ kind: 'allow' });
  });

  it('free mode, anonymous visitor, access check not yet run: allow without waiting', () => {
    expect(evaluateModeMount(anon({ tier: 'free', accessChecked: false }))).toEqual({ kind: 'allow' });
  });

  it('paid mode, anonymous visitor: locked', () => {
    expect(evaluateModeMount(anon({ tier: 'premium' }))).toEqual({ kind: 'locked' });
  });

  it('paid mode, subscribed parent: allow', () => {
    expect(evaluateModeMount(anon({ tier: 'premium', hasAccess: true, controls: controls() })))
      .toEqual({ kind: 'allow' });
  });

  it('paid mode, signed in parent whose trial has expired: locked', () => {
    // parent_has_access returns false once parent_subscription_state is
    // 'expired'; the client sees the same boolean as an anonymous visitor.
    expect(evaluateModeMount(anon({ tier: 'premium', hasAccess: false, controls: controls() })))
      .toEqual({ kind: 'locked' });
  });

  it('paid mode, entitlement answer still pending: pending, not allow and not locked', () => {
    expect(evaluateModeMount(anon({ tier: 'premium', accessChecked: false, hasAccess: false })))
      .toEqual({ kind: 'pending' });
  });

  it('parental control paused: blocked with reason, even with a subscription', () => {
    expect(evaluateModeMount(anon({ tier: 'premium', hasAccess: true, controls: controls({ paused: true }) })))
      .toEqual({ kind: 'blocked', reason: 'paused' });
    expect(evaluateModeMount(anon({ tier: 'free', hasAccess: true, controls: controls({ paused: true }) })))
      .toEqual({ kind: 'blocked', reason: 'paused' });
  });

  it('parental control daily limit reached: blocked with reason', () => {
    expect(evaluateModeMount(anon({
      tier: 'free', hasAccess: true,
      controls: controls({ daily_play_limit_minutes: 10 }), todaySeconds: 600,
    }))).toEqual({ kind: 'blocked', reason: 'daily-limit' });
  });

  it('parental control block wins over a pending entitlement answer', () => {
    expect(evaluateModeMount(anon({
      tier: 'premium', accessChecked: false, controls: controls({ paused: true }),
    }))).toEqual({ kind: 'blocked', reason: 'paused' });
  });

  it('class mode student: allow, the teacher session governs', () => {
    expect(evaluateModeMount(anon({ context: 'class', tier: 'premium', hasAccess: false })))
      .toEqual({ kind: 'allow' });
    expect(evaluateModeMount(anon({ context: 'class', tier: 'premium', accessChecked: false })))
      .toEqual({ kind: 'allow' });
    expect(evaluateModeMount(anon({ context: 'class', tier: 'free', controls: controls({ paused: true }) })))
      .toEqual({ kind: 'allow' });
  });
});

describe('modeCatalog', () => {
  it('lists 8 menu modes of which 5 are paid', () => {
    const listed = GAME_MODE_IDS.filter((id) => MODE_CATALOG[id].listed);
    expect(listed).toHaveLength(8);
    expect(listed.filter((id) => getModeTier(id) === 'premium')).toHaveLength(5);
    expect(listed.filter((id) => getModeTier(id) === 'free').sort())
      .toEqual(['calibration', 'free', 'pre-writing']);
  });

  it('URL-only modes fail closed (premium)', () => {
    for (const id of GAME_MODE_IDS) {
      if (!MODE_CATALOG[id].listed) expect(getModeTier(id)).toBe('premium');
    }
  });

  it('every paid mode deep link is refused for an anonymous visitor', () => {
    for (const id of GAME_MODE_IDS) {
      const d = evaluateModeMount(anon({ tier: getModeTier(id) }));
      expect(d.kind).toBe(getModeTier(id) === 'premium' ? 'locked' : 'allow');
    }
  });

  it('isGameMode rejects unknown and non-string ids', () => {
    expect(isGameMode('word-search')).toBe(true);
    expect(isGameMode('not-a-mode')).toBe(false);
    expect(isGameMode('__proto__')).toBe(false);
    expect(isGameMode(null)).toBe(false);
    expect(isGameMode(undefined)).toBe(false);
  });
});
