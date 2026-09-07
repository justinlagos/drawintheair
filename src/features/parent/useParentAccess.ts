/**
 * useParentAccess. lightweight access check for /play.
 *
 * Returns whether the current viewer has an active parent subscription/trial.
 * Designed to be cheap to call from anonymous /play (no ParentProvider needed).
 * Results are cached for the tab via sessionStorage so the lock state doesn't
 * blink every time the menu remounts.
 */

import { useCallback, useEffect, useState } from 'react';
import { callRpc, getUser } from '../../lib/supabase';

const CACHE_KEY = 'dita-parent-has-access';

type State = { hasAccess: boolean; loading: boolean; checked: boolean };

export interface ParentAccess extends State {
  /** Ask the server again. The mount guard calls this whenever a mode
   *  mounts so a trial that ended mid-session is noticed without a reload. */
  recheck: () => void;
}

function readCached(): boolean | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
  } catch { /* noop */ }
  return null;
}

function writeCached(v: boolean) {
  try { sessionStorage.setItem(CACHE_KEY, v ? 'true' : 'false'); } catch { /* noop */ }
}

export function useParentAccess(): ParentAccess {
  const cached = readCached();
  const [state, setState] = useState<State>({
    hasAccess: cached === true,
    loading: cached === null,
    checked: cached !== null,
  });
  // Bumped by recheck() to re-run the fetch effect.
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    // No auth session → can't have a subscription. Skip the RPC.
    const user = getUser();
    if (!user) {
      setState({ hasAccess: false, loading: false, checked: true });
      writeCached(false);
      return;
    }
    let cancelled = false;
    callRpc<boolean>('parent_has_access', { p_parent: user.id })
      .then(({ data, error }) => {
        if (cancelled) return;
        const ok = !error && data === true;
        writeCached(ok);
        setState({ hasAccess: ok, loading: false, checked: true });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ hasAccess: false, loading: false, checked: true });
      });
    return () => { cancelled = true; };
  }, [generation]);

  const recheck = useCallback(() => setGeneration((g) => g + 1), []);

  return { ...state, recheck };
}

/** Invalidate the cached access result (call after sign-in / sign-out). */
export function clearParentAccessCache() {
  try { sessionStorage.removeItem(CACHE_KEY); } catch { /* noop */ }
}
