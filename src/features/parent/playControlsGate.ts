/**
 * playControlsGate — single source of truth for how parental controls affect
 * a live /play session.
 *
 * Parents pay for these controls in the Family plan, so gameplay MUST honour
 * them. Historically the controls were stored (parent_controls table, edited
 * in the dashboard) but never read by the play app. This pure function turns a
 * ParentControls row + the learner's active-time-so-far-today into a concrete
 * decision the play app can act on. Keeping it pure means it is unit-tested and
 * has no dependency on React, storage or the network.
 *
 * Scope note (daily limit): `todaySeconds` is the learner's active play time on
 * THIS DEVICE today. The data model has no per-day duration server-side (only
 * lifetime rollups), so the limit is enforced per-device. A cross-device limit
 * would require a new server duration write-path — deliberately out of scope.
 */

import type { ParentControls } from '../../lib/parentApi';

export type PlayBlockReason = 'paused' | 'daily-limit' | null;

export interface PlayControlsInput {
  /** null when there is no active parent-linked learner (anonymous /play). */
  controls: ParentControls | null;
  /** Active seconds already used today for this learner, on this device. */
  todaySeconds: number;
}

export interface PlayGateResult {
  /** True when the child should NOT be able to start/continue an activity. */
  blocked: boolean;
  /** Why entry is blocked (drives which kid-safe message to show). */
  reason: PlayBlockReason;
  /** Whether game sound/narration is allowed (defaults true with no controls). */
  soundEnabled: boolean;
  /** Camera reassurance level for the transparency UI. */
  cameraReassurance: ParentControls['camera_reassurance'];
  /** Seconds of play left today, or null when no daily limit is set. */
  remainingSeconds: number | null;
}

/** Result used when there is no active parent-linked learner. */
const UNRESTRICTED: PlayGateResult = {
  blocked: false,
  reason: null,
  soundEnabled: true,
  cameraReassurance: 'standard',
  remainingSeconds: null,
};

export function evaluatePlayControls(input: PlayControlsInput): PlayGateResult {
  const c = input.controls;
  if (!c) return UNRESTRICTED;

  const limitSeconds =
    c.daily_play_limit_minutes != null && c.daily_play_limit_minutes > 0
      ? c.daily_play_limit_minutes * 60
      : null;

  const used = Math.max(0, input.todaySeconds);
  const remainingSeconds = limitSeconds != null ? Math.max(0, limitSeconds - used) : null;

  // Pause is authoritative and takes precedence over the daily limit.
  let reason: PlayBlockReason = null;
  if (c.paused) reason = 'paused';
  else if (limitSeconds != null && used >= limitSeconds) reason = 'daily-limit';

  return {
    blocked: reason !== null,
    reason,
    soundEnabled: c.sound_enabled,
    cameraReassurance: c.camera_reassurance,
    remainingSeconds,
  };
}
