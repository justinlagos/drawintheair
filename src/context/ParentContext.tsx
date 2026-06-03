/**
 * ParentContext — single source of truth for parent dashboard data.
 *
 * Responsibilities:
 *   • Load /rpc/get_parent_overview once per session + on refresh().
 *   • Expose derived subscription state (server-side trusted).
 *   • Track the "selected child" — which learner is about to play.
 *   • Persist selected child in sessionStorage so a tab refresh during
 *     gameplay keeps progress attached to the right child.
 *
 * Privacy: this provider only holds data we already store server-side.
 * It NEVER persists email or display_name to localStorage — the auth
 * session already does that.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  type ChildSummary,
  type ParentOverview,
  type SubscriptionState,
  getParentOverview,
} from '../lib/parentApi';

interface ParentContextValue {
  overview: ParentOverview | null;
  loading: boolean;
  error: string | null;
  /** Server-trusted subscription state. Never derive this on the client. */
  subscriptionState: SubscriptionState;
  /** True iff the parent can use paid features right now. */
  hasAccess: boolean;
  /** Active learner count vs included slots (for "2 of 2" UI). */
  planUsage: { active: number; included: number; archived: number };
  /** Currently selected child (the one about to play). */
  selectedChild: ChildSummary | null;
  selectChild: (childId: string | null) => void;
  refresh: () => Promise<void>;
}

const ParentContext = createContext<ParentContextValue>({
  overview: null,
  loading: true,
  error: null,
  subscriptionState: 'none',
  hasAccess: false,
  planUsage: { active: 0, included: 2, archived: 0 },
  selectedChild: null,
  selectChild: () => {},
  refresh: async () => {},
});

const SELECTED_CHILD_KEY = 'dita-selected-child';

export function ParentProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [overview, setOverview] = useState<ParentOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(SELECTED_CHILD_KEY);
    } catch {
      return null;
    }
  });

  const refresh = useCallback(async () => {
    if (!user) {
      setOverview(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getParentOverview();
      setOverview(data);
      if (!data) setError('Could not load your account. Please try again.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    refresh();
  }, [authLoading, refresh]);

  // Drop the selected child if the parent signs out or that child is gone.
  useEffect(() => {
    if (!user) {
      setSelectedChildId(null);
      try { sessionStorage.removeItem(SELECTED_CHILD_KEY); } catch {/*noop*/}
      return;
    }
    if (selectedChildId && overview && !overview.children.some(c => c.id === selectedChildId)) {
      setSelectedChildId(null);
      try { sessionStorage.removeItem(SELECTED_CHILD_KEY); } catch {/*noop*/}
    }
  }, [user, overview, selectedChildId]);

  const selectChild = useCallback((childId: string | null) => {
    setSelectedChildId(childId);
    try {
      if (childId) sessionStorage.setItem(SELECTED_CHILD_KEY, childId);
      else sessionStorage.removeItem(SELECTED_CHILD_KEY);
    } catch {/*noop*/}
  }, []);

  const value = useMemo<ParentContextValue>(() => {
    const subscriptionState: SubscriptionState = overview?.subscription?.state ?? 'none';
    const hasAccess = Boolean(overview?.subscription?.has_access);
    const planUsage = {
      active: overview?.plan_usage?.active_children ?? 0,
      included: overview?.plan_usage?.included_slots ?? 2,
      archived: overview?.plan_usage?.archived_children ?? 0,
    };
    const selectedChild =
      overview?.children.find(c => c.id === selectedChildId) ?? null;
    return {
      overview,
      loading,
      error,
      subscriptionState,
      hasAccess,
      planUsage,
      selectedChild,
      selectChild,
      refresh,
    };
  }, [overview, loading, error, selectedChildId, selectChild, refresh]);

  return <ParentContext.Provider value={value}>{children}</ParentContext.Provider>;
}

export function useParent(): ParentContextValue {
  return useContext(ParentContext);
}
