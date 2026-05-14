/**
 * NextModeOverlay . Phase 2 activation path
 *
 * Shows after a first-time visitor finishes their auto-routed Free
 * Paint session. Suggests Bubble Pop or Tracing as the next step,
 * with a "browse all games" escape hatch.
 *
 * Picks are persisted via `onPick(mode)` (handled by App.tsx, which
 * starts that mode immediately). "All games" lands them on the menu.
 *
 * Analytics events fired:
 *   next_mode_overlay_shown  . in App.tsx when this mounts
 *   next_mode_overlay_pick   . meta.choice = 'calibration'|'pre-writing'|'menu'
 *   next_mode_overlay_dismissed . closed without picking
 */

import React from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { logEvent } from '../../lib/analytics';
import type { GameMode } from './ModeSelectionMenu';
import './nextModeOverlay.css';

interface NextModeOverlayProps {
    open: boolean;
    onPick: (mode: GameMode) => void;
    onBrowseAll: () => void;
    onDismiss: () => void;
}

const suggestions: Array<{
    id: GameMode;
    title: string;
    blurb: string;
    accent: string;
    icon: string;
}> = [
    {
        id: 'calibration',
        title: 'Bubble Pop',
        blurb: 'Pop bubbles with a wave. Quick wins, big smiles.',
        accent: '#55DDE0',
        icon: '🫧',
    },
    {
        id: 'pre-writing',
        title: 'Tracing',
        blurb: 'Trace letters in the air. Build pre-writing muscles.',
        accent: '#6C3FA4',
        icon: '✏️',
    },
];

const fadeUp: Variants = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const stagger: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08, delayChildren: 0.06 } },
};

export const NextModeOverlay: React.FC<NextModeOverlayProps> = ({
    open,
    onPick,
    onBrowseAll,
    onDismiss,
}) => {
    const prefersReduced = useReducedMotion();

    if (!open) return null;

    const handlePick = (mode: GameMode) => {
        logEvent('next_mode_overlay_pick', {
            game_mode: mode,
            meta: { choice: mode, variant: 'skip_menu_freepaint_v1' },
        });
        onPick(mode);
    };

    const handleBrowseAll = () => {
        logEvent('next_mode_overlay_pick', {
            meta: { choice: 'menu', variant: 'skip_menu_freepaint_v1' },
        });
        onBrowseAll();
    };

    const handleDismiss = () => {
        logEvent('next_mode_overlay_dismissed', {
            meta: { variant: 'skip_menu_freepaint_v1' },
        });
        onDismiss();
    };

    return (
        <motion.div
            className="nmo-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="nmo-title"
        >
            <motion.div
                className="nmo-card"
                variants={prefersReduced ? undefined : stagger}
                initial="hidden"
                animate="show"
            >
                <button
                    className="nmo-close"
                    onClick={handleDismiss}
                    aria-label="Close"
                >
                    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                        <path
                            d="M6 6l12 12M18 6L6 18"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            fill="none"
                        />
                    </svg>
                </button>

                <motion.div className="nmo-eyebrow" variants={fadeUp}>
                    Nice painting!
                </motion.div>

                <motion.h2 id="nmo-title" className="nmo-title" variants={fadeUp}>
                    Ready for the <span className="nmo-emph">next one?</span>
                </motion.h2>

                <motion.p className="nmo-sub" variants={fadeUp}>
                    Pick what to try next. We picked two crowd favourites.
                </motion.p>

                <motion.div className="nmo-grid" variants={fadeUp}>
                    {suggestions.map(s => (
                        <motion.button
                            key={s.id}
                            className="nmo-card-pick"
                            style={{ '--nmo-accent': s.accent } as React.CSSProperties}
                            onClick={() => handlePick(s.id)}
                            whileHover={prefersReduced ? undefined : { y: -6, scale: 1.02 }}
                            whileTap={prefersReduced ? undefined : { scale: 0.97 }}
                            transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                        >
                            <span className="nmo-card-icon" aria-hidden>{s.icon}</span>
                            <span className="nmo-card-title">{s.title}</span>
                            <span className="nmo-card-blurb">{s.blurb}</span>
                            <span className="nmo-card-arrow" aria-hidden>→</span>
                        </motion.button>
                    ))}
                </motion.div>

                <motion.button
                    className="nmo-browse"
                    onClick={handleBrowseAll}
                    variants={fadeUp}
                    whileHover={prefersReduced ? undefined : { y: -1 }}
                >
                    Or browse all games →
                </motion.button>
            </motion.div>
        </motion.div>
    );
};

export default NextModeOverlay;
