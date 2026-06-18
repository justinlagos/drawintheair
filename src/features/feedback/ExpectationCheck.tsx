/**
 * ExpectationCheck — the expectation-gap read (Sprint 2, §12b).
 *
 * Shown ONCE, immediately after a user's FIRST successful activity — not
 * after three games (that's HappinessCheck, a separate satisfaction
 * read). This measures the gap between what the ad / homepage promised
 * and what the experience delivered — the single most predictive signal
 * for whether paid acquisition will scale profitably.
 *
 *   "Did Draw in the Air work the way you expected?"
 *   😕 Not really   🙂 Mostly   🤩 Better than expected
 */

import React from 'react';
import { tokens } from '../../styles/tokens';
import { submitFeedback } from './submitFeedback';
import { markExpectationAnswered } from './expectationState';

const OPTIONS: { rating: number; emoji: string; label: string }[] = [
    { rating: 1, emoji: '😕', label: 'Not really' },
    { rating: 2, emoji: '🙂', label: 'Mostly' },
    { rating: 3, emoji: '🤩', label: 'Better than expected' },
];

interface ExpectationCheckProps {
    open: boolean;
    onClose: () => void;
    isCompact?: boolean;
}

export const ExpectationCheck: React.FC<ExpectationCheckProps> = ({
    open,
    onClose,
    isCompact = false,
}) => {
    const [done, setDone] = React.useState(false);
    if (!open) return null;

    const rate = async (rating: number) => {
        setDone(true);
        markExpectationAnswered();
        await submitFeedback({ kind: 'expectation', rating });
        window.setTimeout(onClose, 1200);
    };

    return (
        <div
            role="dialog"
            aria-label="Did it work the way you expected?"
            style={{
                position: 'fixed',
                left: '50%',
                bottom: isCompact ? 18 : 28,
                transform: 'translateX(-50%)',
                zIndex: 285,
                width: isCompact ? '92%' : 'auto',
                maxWidth: 440,
                background: '#fff',
                borderRadius: 22,
                padding: isCompact ? '16px 18px' : '18px 24px',
                boxShadow: '0 18px 44px rgba(31,27,46,0.26)',
                fontFamily: tokens.fontFamily.body,
                textAlign: 'center',
            }}
        >
            {done ? (
                <p style={{ margin: 0, fontWeight: 800, color: tokens.colors.charcoal }}>
                    Thanks — noted! 🙏
                </p>
            ) : (
                <>
                    <p
                        style={{
                            margin: '0 0 12px',
                            fontWeight: 800,
                            fontSize: isCompact ? '0.98rem' : '1.05rem',
                            color: tokens.colors.charcoal,
                        }}
                    >
                        Did it work the way you expected?
                    </p>
                    <div style={{ display: 'flex', gap: isCompact ? 8 : 12, justifyContent: 'center' }}>
                        {OPTIONS.map((o) => (
                            <button
                                key={o.rating}
                                aria-label={o.label}
                                title={o.label}
                                onClick={() => rate(o.rating)}
                                style={{
                                    appearance: 'none',
                                    border: `2px solid ${tokens.colors.deepPlum}1f`,
                                    background: '#FBFCFF',
                                    borderRadius: 16,
                                    padding: isCompact ? '8px 10px' : '10px 14px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 4,
                                    fontFamily: tokens.fontFamily.body,
                                    fontWeight: 700,
                                    fontSize: isCompact ? '0.7rem' : '0.78rem',
                                    color: tokens.colors.charcoal,
                                    minWidth: isCompact ? 84 : 100,
                                }}
                            >
                                <span style={{ fontSize: isCompact ? '1.6rem' : '2rem' }}>{o.emoji}</span>
                                {o.label}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};
