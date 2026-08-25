/**
 * ActiveLearnerChip — always-visible confirmation of who progress is being
 * saved for, shown on the menu for signed-in parents.
 *
 * "Playing as Amara · Switch learner". Making the attribution visible on every
 * session (not just the first) is what prevents one child's progress being
 * silently logged against another. "Switch learner" clears the selection,
 * which re-opens the picker (both read the same activeLearner store).
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getParentOverview, type ChildSummary } from '../../lib/parentApi';
import { clearSelectedChild, getSelectedChildId, hasValidSelection, subscribe } from './activeLearner';

export function ActiveLearnerChip() {
  const { user, loading } = useAuth();
  const [children, setChildren] = useState<ChildSummary[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(() => getSelectedChildId());

  // Keep in sync with the shared selection store.
  useEffect(() => subscribe(() => setSelectedId(getSelectedChildId())), []);

  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    getParentOverview().then(o => {
      if (!cancelled) setChildren(o?.children ?? []);
    });
    return () => { cancelled = true; };
  }, [loading, user]);

  if (loading || !user) return null;
  if (!selectedId || !hasValidSelection()) return null;

  const child = children?.find(c => c.id === selectedId);
  if (!child) return null;

  return (
    <div
      style={{
        position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
        zIndex: 55, display: 'flex', alignItems: 'center', gap: 10,
        padding: '7px 8px 7px 14px', borderRadius: 999,
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxShadow: '0 6px 18px rgba(64,50,90,0.16)', border: '1px solid rgba(63,64,82,0.10)',
        fontFamily: 'Nunito, system-ui, sans-serif', fontSize: 14, color: '#40325A',
      }}
    >
      <span style={{ fontSize: 18, lineHeight: 1 }} aria-hidden>{child.avatar || '🌱'}</span>
      <span>Playing as <strong>{child.nickname}</strong></span>
      <button
        type="button"
        onClick={() => clearSelectedChild()}
        style={{
          border: 'none', cursor: 'pointer', borderRadius: 999,
          padding: '6px 12px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
          color: '#6D4FBE', background: 'rgba(109,79,190,0.10)',
        }}
      >
        Switch learner
      </button>
    </div>
  );
}
