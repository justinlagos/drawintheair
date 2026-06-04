/**
 * LearnerGreeting, warm, time-of-day greeting shown briefly when a parent-
 * linked learner enters gameplay. Auto-dismisses, respects reduce-motion,
 * never appears for anonymous /play (no selected child = no overlay).
 *
 * The greeting is intentionally short and friendly. It uses the learner's
 * nickname, never a full name, and lives outside the parent-area shell so
 * it can render over the menu without dragging in /pages/parent CSS.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getParentOverview, type ChildSummary } from '../../lib/parentApi';

const SELECTED_CHILD_KEY = 'dita-selected-child';
const GREETED_KEY = 'dita-greeted-child'; // sessionStorage: greeted this child this session?

function greetingFor(name: string): string {
  const h = new Date().getHours();
  if (h < 12) return `Good morning, ${name}!`;
  if (h < 18) return `Hi ${name}, ready to play?`;
  return `Hi ${name}, let's draw in the air!`;
}

export function LearnerGreeting() {
  const [child, setChild] = useState<ChildSummary | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let raf: number;

    async function bootstrap() {
      const sel = (() => {
        try { return sessionStorage.getItem(SELECTED_CHILD_KEY); } catch { return null; }
      })();
      if (!sel) return;

      const already = (() => {
        try { return sessionStorage.getItem(GREETED_KEY) === sel; } catch { return false; }
      })();
      if (already) return;

      const o = await getParentOverview();
      if (cancelled) return;
      const found = o?.children.find(c => c.id === sel) ?? null;
      if (!found) return;
      setChild(found);
      // schedule a frame so the greeting appears after the screen settles
      raf = window.requestAnimationFrame(() => setVisible(true));
      try { sessionStorage.setItem(GREETED_KEY, sel); } catch { /* noop */ }
      // auto-dismiss
      window.setTimeout(() => setVisible(false), 3200);
    }

    void bootstrap();
    return () => {
      cancelled = true;
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  if (!child) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="greeting"
          aria-live="polite"
          initial={{ opacity: 0, y: -16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
          style={{
            position: 'fixed',
            top: 18, left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 70,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 18px 12px 12px',
            borderRadius: 999,
            background: 'linear-gradient(180deg, #ffffff 0%, #FFFAEB 100%)',
            color: '#1A1B2E',
            boxShadow: '0 18px 38px rgba(11, 20, 48, 0.32), inset 0 1px 0 rgba(255,255,255,0.6)',
            fontFamily: 'Nunito, system-ui, sans-serif',
            border: '1px solid rgba(108, 63, 164, 0.15)',
            maxWidth: 'min(92vw, 420px)',
            pointerEvents: 'none', // never blocks the menu
          }}
        >
          <span style={{
            width: 38, height: 38, borderRadius: '50%',
            display: 'grid', placeItems: 'center',
            fontSize: 22,
            background: 'linear-gradient(145deg, #FFFAEB, #FCEFC8)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), 0 4px 10px rgba(63, 64, 82, 0.10)',
          }}>{child.avatar || '🌱'}</span>
          <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.01em' }}>
            {greetingFor(child.nickname)}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
