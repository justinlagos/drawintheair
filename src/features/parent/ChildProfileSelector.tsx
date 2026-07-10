/**
 * ChildProfileSelector. pre-game overlay shown to signed-in parents to pick
 * which learner is about to play. Anonymous /play visitors never see this.
 *
 * The selection is persisted to sessionStorage under the same key
 * ParentContext + analytics.ts read from.
 *
 * Visual tone is a softer, calmer variant of the parent area (so the
 * surrounding /play night theme still reads dominant). Uses Framer Motion
 * for entrance.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { getParentOverview, type ChildSummary } from '../../lib/parentApi';
import { logEvent } from '../../lib/analytics';
import { hasValidSelection, setSelectedChild, subscribe } from './activeLearner';

export function ChildProfileSelector({ onChosen }: { onChosen?: (childId: string) => void }) {
  const { user, loading } = useAuth();
  const [children, setChildren] = useState<ChildSummary[] | null>(null);
  // Open whenever there is no valid (non-expired) selection. Manually
  // dismissed ("skip") within this render is tracked separately.
  const [open, setOpen] = useState(() => !hasValidSelection());
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    getParentOverview().then(o => {
      if (cancelled) return;
      setChildren(o?.children.filter(c => c.status === 'active') ?? []);
    });
    return () => { cancelled = true; };
  }, [loading, user]);

  // React to selection changes (e.g. "Switch learner" clears it → re-open).
  useEffect(() => subscribe(() => {
    const valid = hasValidSelection();
    setOpen(!valid);
    if (!valid) setSkipped(false);
  }), []);

  if (loading || !user || !open || skipped) return null;
  if (children && children.length === 0) return null;

  function choose(id: string) {
    setSelectedChild(id);
    logEvent('parent_child_session_saved');
    setOpen(false);
    onChosen?.(id);
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 60,
          background: 'rgba(7, 12, 24, 0.72)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'grid', placeItems: 'center', padding: 24,
          fontFamily: 'Nunito, system-ui, sans-serif',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.97 }}
          transition={{ duration: 0.28, ease: [0.34, 1.56, 0.64, 1] }}
          style={{
            width: '100%', maxWidth: 460,
            background: 'linear-gradient(180deg, #fff 0%, #FFFAEB 100%)',
            borderRadius: 28, padding: 28,
            boxShadow: '0 40px 80px rgba(0, 0, 0, 0.45)',
            color: '#1A1B2E',
          }}
        >
          <div style={{ marginBottom: 18 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#6C3FA4', letterSpacing: 0.08, textTransform: 'uppercase' }}>
              Before you start
            </p>
            <h2 style={{ margin: '6px 0 4px', fontSize: 22, fontWeight: 800, letterSpacing: '-0.015em' }}>
              Who's playing today?
            </h2>
            <p style={{ margin: 0, color: '#4A4D6B', fontSize: 14 }}>
              We'll save this session's progress to their profile.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 18 }}>
            {(children ?? []).map(c => (
              <motion.button
                key={c.id}
                type="button"
                onClick={() => choose(c.id)}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                  borderRadius: 16,
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: '1.5px solid rgba(63, 64, 82, 0.12)',
                  cursor: 'pointer', textAlign: 'left',
                  fontFamily: 'inherit', font: 'inherit',
                  transition: 'border-color 200ms, box-shadow 200ms',
                }}
              >
                <span style={{
                  width: 40, height: 40, borderRadius: '50%', fontSize: 22,
                  background: 'linear-gradient(145deg, #FFFAEB, #FCEFC8)',
                  display: 'grid', placeItems: 'center',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), 0 4px 10px rgba(63, 64, 82, 0.10)',
                  flex: '0 0 auto',
                }}>{c.avatar || '🌱'}</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontWeight: 800, fontSize: 15 }}>{c.nickname}</span>
                  <span style={{ display: 'block', fontSize: 12, color: '#6B6F84' }}>
                    {c.age_band || 'all ages'}
                  </span>
                </span>
              </motion.button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
            <button
              type="button"
              onClick={() => { setSkipped(true); setOpen(false); }}
              style={{
                background: 'transparent', border: 'none', color: '#6B6F84',
                cursor: 'pointer', font: 'inherit', padding: '4px 0',
              }}
            >
              Skip. don't save this session
            </button>
            <a
              href="/parent/children"
              style={{
                color: '#6C3FA4', textDecoration: 'none', fontWeight: 700,
              }}
            >Manage children →</a>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
