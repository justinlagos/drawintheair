/**
 * SaveProgressNudge, calm, never-aggressive conversion prompt.
 *
 * Trigger: anonymous /play visitor (no signed-in parent, no selected child)
 * completes their first successful in-game round. We listen for the same
 * "win" events the analytics mirror watches for, debounce to one shot per
 * session, and surface a single warm card: "Save this progress?"
 *
 * Honours the spec's "no account before the first value moment" rule, the
 * prompt only appears AFTER the kid has succeeded at something, never before.
 *
 * Dismissible. Stays dismissed for the rest of the tab session.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getUser } from '../../lib/supabase';

const SUPPRESSED_KEY = 'dita-save-progress-suppressed';
const SHOWN_KEY = 'dita-save-progress-shown';

// Events to listen for. analytics.ts also tracks these as "win" events.
const WIN_EVENT_NAMES = new Set([
  'mode_completed',
  'stage_completed',
  'tracing_letter_completed',
  'wordsearch_word_found',
  'bubblepop_round_complete',
  'colourbuilder_match_made',
  'balloonmath_balloon_popped',
  'rainbowbridge_match_made',
  'spellingstars_word_complete',
  'build_object_completed',
  'successful_snap',
]);

export function SaveProgressNudge() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Don't show if the parent is signed in (they already save progress).
    if (getUser()) return;
    // Don't show if the parent picked a learner (they're an active parent).
    try {
      if (sessionStorage.getItem('dita-selected-child')) return;
    } catch { /* noop */ }
    // Don't show if previously dismissed this session.
    try {
      if (sessionStorage.getItem(SUPPRESSED_KEY) === '1') return;
      if (sessionStorage.getItem(SHOWN_KEY) === '1') return;
    } catch { /* noop */ }

    const onEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ name?: string }>).detail;
      if (!detail?.name || !WIN_EVENT_NAMES.has(detail.name)) return;
      // Trigger once. The actual show is delayed slightly so the success
      // celebration animation can play first.
      try { sessionStorage.setItem(SHOWN_KEY, '1'); } catch { /* noop */ }
      window.setTimeout(() => setOpen(true), 1400);
      window.removeEventListener('dita:analytics-event', onEvent);
    };
    window.addEventListener('dita:analytics-event', onEvent);
    return () => window.removeEventListener('dita:analytics-event', onEvent);
  }, []);

  function dismiss() {
    try { sessionStorage.setItem(SUPPRESSED_KEY, '1'); } catch { /* noop */ }
    setOpen(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="save-nudge"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.97 }}
          transition={{ duration: 0.42, ease: [0.34, 1.56, 0.64, 1] }}
          role="dialog" aria-label="Save your child's progress"
          style={{
            position: 'fixed',
            bottom: 24, left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 65,
            width: 'min(94vw, 460px)',
            background: 'linear-gradient(180deg, #ffffff 0%, #FFFAEB 100%)',
            color: '#1A1B2E',
            borderRadius: 24,
            padding: '18px 18px 16px',
            boxShadow: '0 28px 60px rgba(11, 20, 48, 0.40)',
            fontFamily: 'Nunito, system-ui, sans-serif',
            border: '1px solid rgba(108, 63, 164, 0.18)',
          }}
        >
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <span style={{
              width: 44, height: 44, borderRadius: 14, flex: '0 0 auto',
              background: 'linear-gradient(135deg, #6C3FA4, #1c7e80)',
              color: '#fff',
              display: 'grid', placeItems: 'center',
              boxShadow: '0 10px 22px rgba(108, 63, 164, 0.32)',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 3l1.9 5.2L19 10l-5.1 1.8L12 17l-1.9-5.2L5 10l5.1-1.8L12 3z"/>
              </svg>
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: '#6C3FA4', letterSpacing: 0.08, textTransform: 'uppercase' }}>
                Nice round
              </p>
              <h3 style={{ margin: '4px 0 4px', fontSize: 18, fontWeight: 800, letterSpacing: '-0.015em' }}>
                Save this progress?
              </h3>
              <p style={{ margin: 0, color: '#4A4D6B', fontSize: 14, lineHeight: 1.5 }}>
                Start a free 7-day trial to keep your child's learning journey, see plain-English progress, and unlock the full activity library.
              </p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              style={{
                width: 32, height: 32, borderRadius: 10, border: 'none', cursor: 'pointer',
                background: 'rgba(108, 63, 164, 0.08)', color: '#4A4D6B',
                display: 'grid', placeItems: 'center', flex: '0 0 auto',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <a
              href="/parent/signup?next=/play"
              style={{
                flex: 1,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px 16px', minHeight: 44,
                borderRadius: 999,
                background: 'linear-gradient(180deg, #7E4FB8 0%, #6C3FA4 100%)',
                color: '#fff', fontWeight: 800, fontSize: 14, textDecoration: 'none',
                boxShadow: '0 10px 22px rgba(108, 63, 164, 0.32), inset 0 1px 0 rgba(255,255,255,0.25)',
              }}
            >
              Start free trial
            </a>
            <button
              type="button"
              onClick={dismiss}
              style={{
                padding: '12px 16px', minHeight: 44,
                borderRadius: 999, border: '1.5px solid rgba(63, 64, 82, 0.18)',
                background: 'rgba(255, 255, 255, 0.85)',
                color: '#1A1B2E', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Maybe later
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
