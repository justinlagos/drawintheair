/**
 * modeGate — single source of truth for "may this mode be entered?".
 *
 * The menu can be activated by several input sources (mouse, touch, keyboard
 * and hand-dwell). Each of these MUST make the identical premium-entitlement
 * decision, otherwise a paid activity can be opened through whichever path
 * forgot to check (historically the hand-dwell path bypassed the click-only
 * gate — see attemptModeSelection in ModeSelectionMenu.tsx).
 *
 * Keep this a pure function: it is unit-tested in tests/modeGate.test.ts and
 * is the only place that encodes the free-vs-premium rule.
 */

export type ModeTier = 'free' | 'premium';

export interface ModeGateResult {
  /** True when the mode may start immediately. */
  allowed: boolean;
  /** True when entry is blocked because it is a paid mode and the viewer
   *  has no active subscription/trial (i.e. show the upgrade prompt). */
  locked: boolean;
}

/**
 * Decide whether a mode of the given tier may be entered.
 *
 * @param tier       'free' (always playable) or 'premium' (needs access).
 * @param hasAccess  whether the current viewer has an active subscription/trial.
 */
export function evaluateModeGate(tier: ModeTier, hasAccess: boolean): ModeGateResult {
  const locked = tier === 'premium' && !hasAccess;
  return { allowed: !locked, locked };
}
