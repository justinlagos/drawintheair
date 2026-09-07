/**
 * modeMountGuard. The decision made every time a mode is about to mount.
 *
 * The menu already checks the paywall and parental controls before it calls
 * onSelect, but the menu is not the only way into a mode. `/play?screen=game
 * &mode=word-search` set the app state straight to 'game' and the paid mode
 * mounted with no check at all (audit finding DIA-014). This function is the
 * backstop: App.tsx runs it whenever appState is 'game', whatever put it
 * there, and refuses to mount the mode unless the answer is 'allow'.
 *
 * Pure on purpose. It composes the two existing single-source rules
 * (evaluateModeGate for the tier, evaluatePlayControls for the controls) so
 * the menu and the mount point can never disagree. Unit tests live in
 * tests/modeMountGuard.test.ts.
 *
 * Contexts:
 *   'play'  the public /play app. Entitlement comes from the signed in
 *           parent's subscription or trial (useParentAccess). Parental
 *           controls come from the selected learner (usePlayControls).
 *   'class' a Class Mode round. The teacher's session decides what the
 *           children play and the teacher's account holds the entitlement,
 *           so neither the parent paywall nor parent controls apply. The
 *           student client mounts modes itself (StudentGameScreen) and does
 *           not go through App.tsx; the context exists so that path can
 *           share the same function if it ever does.
 */

import { evaluateModeGate, type ModeTier } from './modeGate';
import { evaluatePlayControls, type PlayBlockReason } from '../parent/playControlsGate';
import type { ParentControls } from '../../lib/parentApi';

export type MountContext = 'play' | 'class';

export interface ModeMountInput {
  context: MountContext;
  /** Tier of the mode about to mount (from modeCatalog). */
  tier: ModeTier;
  /** Whether the viewer holds an active subscription or trial. */
  hasAccess: boolean;
  /** False while the access check is still in flight for a signed in user. */
  accessChecked: boolean;
  /** Parental controls for the active learner, null for anonymous play. */
  controls: ParentControls | null;
  /** Active seconds already played today on this device by that learner. */
  todaySeconds: number;
}

export type ModeMountDecision =
  /** Mount the mode. */
  | { kind: 'allow' }
  /** Do not mount yet; the entitlement answer has not arrived. */
  | { kind: 'pending' }
  /** Paid mode, no entitlement. Show the grown-up unlock prompt. */
  | { kind: 'locked' }
  /** A parental control forbids play right now. Show the kid-safe notice. */
  | { kind: 'blocked'; reason: Exclude<PlayBlockReason, null> };

export function evaluateModeMount(input: ModeMountInput): ModeMountDecision {
  // Class Mode: the teacher's session governs. No parent checks.
  if (input.context === 'class') return { kind: 'allow' };

  // Parental controls first. A paused learner or one past today's limit
  // must not play anything, free or paid, and the message they should see
  // is the grown-up one rather than a paywall.
  const play = evaluatePlayControls({ controls: input.controls, todaySeconds: input.todaySeconds });
  if (play.blocked && play.reason) return { kind: 'blocked', reason: play.reason };

  // Free modes never wait on the network.
  if (input.tier === 'free') return { kind: 'allow' };

  // Paid mode: wait for a real answer rather than guessing either way.
  if (!input.accessChecked) return { kind: 'pending' };

  const gate = evaluateModeGate(input.tier, input.hasAccess);
  return gate.locked ? { kind: 'locked' } : { kind: 'allow' };
}
