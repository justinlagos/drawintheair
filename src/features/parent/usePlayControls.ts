/**
 * usePlayControls — makes parental controls real inside the /play app.
 *
 * The play app is not wrapped in ParentProvider (anonymous /play must work
 * without it), so this hook reads the active learner directly from
 * sessionStorage (the same key ParentContext writes), fetches that learner's
 * parent_controls, and exposes a single gate the app acts on:
 *   • blocked + reason  → block activity entry (paused / daily limit)
 *   • soundEnabled      → applied to all audio immediately
 *   • addActiveSeconds  → accumulate today's device-local play time
 *
 * For anonymous play (no learner / not signed in) it returns an unrestricted
 * gate, so nothing changes for visitors without an account.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getUser } from '../../lib/supabase';
import { getParentControls, type ParentControls } from '../../lib/parentApi';
import { evaluatePlayControls, type PlayGateResult } from './playControlsGate';
import { getTodaySeconds, addTodaySeconds } from './dailyPlayTime';
import { applyParentSound } from '../../core/audioMute';

const SELECTED_CHILD_KEY = 'dita-selected-child';

function readSelectedChildId(): string | null {
  try { return sessionStorage.getItem(SELECTED_CHILD_KEY); } catch { return null; }
}

export interface UsePlayControls {
  gate: PlayGateResult;
  /** Active learner id, or null for anonymous play. */
  childId: string | null;
  /** Record active seconds played (from the game loop / on activity end). */
  addActiveSeconds: (delta: number) => void;
  /** Re-fetch controls (call on returning to the menu) to avoid stale state. */
  refresh: () => void;
}

export function usePlayControls(): UsePlayControls {
  const childId = readSelectedChildId();
  const [controls, setControls] = useState<ParentControls | null>(null);
  const [todaySeconds, setTodaySeconds] = useState<number>(() =>
    childId ? getTodaySeconds(childId) : 0,
  );

  const load = useCallback(() => {
    const id = readSelectedChildId();
    if (!id || !getUser()) {
      setControls(null);
      setTodaySeconds(0);
      return;
    }
    setTodaySeconds(getTodaySeconds(id));
    getParentControls(id)
      .then(c => setControls(c))
      .catch(() => setControls(null));
  }, []);

  // Load on mount and whenever the active learner changes. This synchronises
  // React state from external sources (sessionStorage + parent_controls),
  // the legitimate "subscribe to external system" use of an effect.
  /* eslint-disable-next-line react-hooks/set-state-in-effect */
  useEffect(() => { load(); }, [load, childId]);

  const gate = useMemo(
    () => evaluatePlayControls({ controls, todaySeconds }),
    [controls, todaySeconds],
  );

  // Apply the sound control across all audio whenever it changes.
  useEffect(() => { applyParentSound(gate.soundEnabled); }, [gate.soundEnabled]);

  const addActiveSeconds = useCallback((delta: number) => {
    const id = readSelectedChildId();
    if (!id) return;
    setTodaySeconds(addTodaySeconds(id, delta));
  }, []);

  return { gate, childId, addActiveSeconds, refresh: load };
}
