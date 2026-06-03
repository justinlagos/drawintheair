/**
 * useParentAccess. lightweight access check for /play.
 *
 * Returns whether the current viewer has an active parent subscription/trial.
 * Designed to be cheap to call from anonymous /play (no ParentProvider needed).
 * Results are cached for the tab via sessionStorage so the lock state doesn't
 * blink every time the menu remounts.
 */

import { useEffect, useState } from 'react';
import { callRpc, getUser } from '../../lib/supabase';

const CACHE_KEY = 'dita-parent-has-access';

type State = { hasAccess: boolean; loading: boolean; checked: boolean };

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

export function useParentAccess(): State {
  const cached = readCached();
  const [state, setState] = useState<State>({
    hasAccess: cached === true,
    loading: cached === null,
    checked: cached !== null,
  });

  useEffect(() => {
    // No auth session → can't have a subscription. Skip the RPC.
    if (!getUser()) {
      setState({ hasAccess: false, loading: false, checked: true });
      writeCached(false);
      return;
    }
    let cancelled = false;
    callRpc<boolean>('parent_has_access', { p_parent: getUser()?.id })
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
  }, []);

  return state;
}

/** Invalidate the cached access result (call after sign-in / sign-out). */
export function clearParentAccessCache() {
  try { sessionStorage.removeItem(CACHE_KEY); } catch { /* noop */ }
}
