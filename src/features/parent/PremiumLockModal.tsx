/**
 * PremiumLockModal. kid-safe upgrade prompt shown when a child taps a
 * premium-tier game while the family has no active subscription.
 *
 * Two layers of intent:
 *   • Kid-facing copy ("Ask a grown-up to unlock this!"). No payment buttons.
 *   • Adult call to action gated by a "Show grown-up" button that opens the
 *     parent paywall route in a new tab so the kid doesn't lose their place.
 *
 * The modal lives outside the parent-area shell so it can render on top of
 * the menu without dragging in /pages/parent/parent.css; styles are inline.
 */

import { motion, AnimatePresence } from 'framer-motion';

export function PremiumLockModal({
  gameTitle,
  gameIcon,
  onClose,
}: {
  gameTitle: string;
  gameIcon: string;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      <motion.div
        role="dialog" aria-modal="true" aria-label="Game locked"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 60,
          background: 'rgba(11, 20, 48, 0.62)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'grid', placeItems: 'center', padding: 24,
          fontFamily: 'Nunito, system-ui, sans-serif',
        }}
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, y: 18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.96 }}
          transition={{ duration: 0.32, ease: [0.34, 1.56, 0.64, 1] }}
          style={{
            width: '100%', maxWidth: 440,
            background: 'linear-gradient(180deg, #fff 0%, #FFFAEB 100%)',
            borderRadius: 28, padding: 28,
            boxShadow: '0 44px 88px rgba(7, 12, 24, 0.5)',
            color: '#1A1B2E',
            textAlign: 'center',
          }}
        >
          {/* Hero icon with sparkle ring */}
          <div style={{ position: 'relative', width: 96, height: 96, margin: '0 auto 18px' }}>
            <span style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'conic-gradient(from 0deg, #FFD84D, #FF6B6B, #55DDE0, #7ED957, #6C3FA4, #FFD84D)',
              filter: 'blur(10px)', opacity: 0.5,
            }} />
            <span style={{
              position: 'absolute', inset: 8, borderRadius: '50%',
              background: 'linear-gradient(145deg, #fff, #FFFAEB)',
              display: 'grid', placeItems: 'center', fontSize: 44,
              boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.6), 0 8px 20px rgba(63, 64, 82, 0.18)',
            }}>{gameIcon}</span>
            {/* Padlock corner badge */}
            <span style={{
              position: 'absolute', right: -4, bottom: -4,
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6C3FA4, #5A2F8C)',
              display: 'grid', placeItems: 'center', color: '#fff',
              boxShadow: '0 8px 18px rgba(108, 63, 164, 0.45)',
            }} aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
          </div>

          <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: '#6C3FA4', letterSpacing: 0.1, textTransform: 'uppercase' }}>
            A grown-up unlocks this
          </p>
          <h2 style={{ margin: '8px 0 6px', fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>
            {gameTitle}
          </h2>
          <p style={{ margin: 0, color: '#4A4D6B', fontSize: 15, lineHeight: 1.55 }}>
            This game is part of the family plan. A grown-up can start a 14-day free trial. No card needed today.
          </p>

          <div style={{ display: 'grid', gap: 8, marginTop: 22 }}>
            <a
              href="/parent/signup?next=/play"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '14px 22px', minHeight: 52,
                borderRadius: 999,
                background: 'linear-gradient(180deg, #7E4FB8 0%, #6C3FA4 100%)',
                color: '#fff', fontWeight: 800, fontSize: 15,
                textDecoration: 'none',
                boxShadow: '0 10px 24px rgba(108, 63, 164, 0.28), inset 0 1px 0 rgba(255,255,255,0.25)',
              }}
            >
              Show a grown-up →
            </a>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '12px 18px', minHeight: 44,
                borderRadius: 999,
                background: 'rgba(255, 255, 255, 0.7)',
                border: '1.5px solid rgba(63, 64, 82, 0.16)',
                color: '#1A1B2E', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Maybe later, pick another game
            </button>
          </div>

          <p style={{ margin: '14px 0 0', fontSize: 12, color: '#6B6F84' }}>
            Tap "Show a grown-up" to open the parent page in a new tab.
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
