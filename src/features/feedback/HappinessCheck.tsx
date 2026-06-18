/**
 * HappinessCheck — trigger 5.
 *
 * Satisfaction is only worth measuring from users who actually succeeded,
 * so this is shown AFTER 3 completed games — never on a struggling
 * session. One tap on a face, done.
 *
 * Mount it from the game/menu owner once `completedGames >= 3` and it
 * hasn't been answered this session (see `shouldShowHappiness`).
 */

import React from 'react';
import { tokens } from '../../styles/tokens';
import { submitFeedback } from './submitFeedback';
import { markHappinessAnswered } from './happinessState';

const FACES: { rating: number; emoji: string; label: string }[] = [
    { rating: 1, emoji: '😞', label: 'Not great' },
    { rating: 2, emoji: '😐', label: 'Okay' },
    { rating: 3, emoji: '🙂', label: 'Good' },
    { rating: 4, emoji: '🤩', label: 'Loved it' },
];

interface HappinessCheckProps {
    open: boolean;
    onClose: () => void;
    isCompact?: boolean;
}

export const HappinessCheck: React.FC<HappinessCheckProps> = ({
    open,
    onClose,
    isCompact = false,
}) => {
    const [done, setDone] = React.useState(false);
    if (!open) return null;

    const rate = async (rating: number) => {
        setDone(true);
        markHappinessAnswered();
        await submitFeedback({ kind: 'happiness', rating });
        window.setTimeout(onClose, 1200);
    };

    return (
        <div
            role="dialog"
            aria-label="How did today go?"
            style={{
                position: 'fixed',
                left: '50%',
                bottom: isCompact ? 18 : 28,
                transform: 'translateX(-50%)',
                zIndex: 280,
                width: isCompact ? '92%' : 'auto',
                maxWidth: 420,
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
                    Thanks for playing! 🌟
                </p>
            ) : (
                <>
                    <p
                        style={{
                            margin: '0 0 12px',
                            fontWeight: 800,
                            fontSize: '1.05rem',
                            color: tokens.colors.charcoal,
                        }}
                    >
                        How did today go?
                    </p>
                    <div style={{ display: 'flex', gap: isCompact ? 10 : 16, justifyContent: 'center' }}>
                        {FACES.map((f) => (
                            <button
                                key={f.rating}
                                aria-label={f.label}
                                title={f.label}
                                onClick={() => rate(f.rating)}
                                style={{
                                    appearance: 'none',
                                    border: 'none',
                                    background: 'transparent',
                                    fontSize: isCompact ? '2rem' : '2.4rem',
                                    cursor: 'pointer',
                                    lineHeight: 1,
                                    transition: 'transform 0.12s ease',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.22)')}
                                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                            >
                                {f.emoji}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};
