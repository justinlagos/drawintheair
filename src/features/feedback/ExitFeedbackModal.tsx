/**
 * ExitFeedbackModal — trigger 4.
 *
 * When a user leaves before starting a game, one tap tells us why.
 * This is the single highest-value signal in the whole system: it turns
 * an anonymous bounce into a tagged reason. Designed to be mounted by
 * the onboarding/menu owner and shown on an exit/back intent.
 *
 * One tap, done. No typing required, no email required.
 */

import React from 'react';
import { tokens } from '../../styles/tokens';
import { submitFeedback, type ExitReason, type Intent } from './submitFeedback';
import type { RuntimeContext } from './feedbackContext';

interface ExitFeedbackModalProps {
    open: boolean;
    onClose: () => void;
    /** Live signals (hand/camera/step) attached to the submission. */
    runtime?: RuntimeContext;
    isCompact?: boolean;
}

// Step 1 — what the user came to do. Intent reframes every other metric:
// a "just exploring" bounce is fine; a "help my child learn" bounce that
// never activated is a failure to chase.
const INTENT_OPTIONS: { intent: Intent; label: string; emoji: string }[] = [
    { intent: 'start_a_game', label: 'Start a game', emoji: '🎮' },
    { intent: 'help_child_learn', label: 'Help my child learn', emoji: '🧒' },
    { intent: 'test_it_out', label: 'Test it out', emoji: '🧪' },
    { intent: 'school_use', label: 'School use', emoji: '🏫' },
    { intent: 'explore_website', label: 'Explore the website', emoji: '👀' },
    { intent: 'not_sure', label: 'Not sure', emoji: '🤷' },
];

// Step 2 — what stopped them.
const REASON_OPTIONS: { reason: ExitReason; label: string; emoji: string }[] = [
    { reason: 'didnt_understand', label: "Didn't understand it", emoji: '🤔' },
    { reason: 'camera_issue', label: 'Camera issue', emoji: '📷' },
    { reason: 'child_not_interested', label: "Child wasn't interested", emoji: '🙂' },
    { reason: 'felt_broken', label: 'Something felt broken', emoji: '🐞' },
    { reason: 'just_exploring', label: 'Just exploring', emoji: '👀' },
];

export const ExitFeedbackModal: React.FC<ExitFeedbackModalProps> = ({
    open,
    onClose,
    runtime,
    isCompact = false,
}) => {
    const [step, setStep] = React.useState<'intent' | 'reason'>('intent');
    const [intent, setIntent] = React.useState<Intent | null>(null);
    const [done, setDone] = React.useState(false);
    if (!open) return null;

    const pickIntent = (i: Intent) => {
        setIntent(i);
        setStep('reason');
    };

    const pickReason = async (reason: ExitReason) => {
        setDone(true);
        await submitFeedback({ kind: 'exit_reason', reason, intent: intent ?? undefined, runtime });
        window.setTimeout(onClose, 1100);
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Before you go"
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 300,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
                background: 'rgba(31,27,46,0.42)',
                fontFamily: tokens.fontFamily.body,
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: isCompact ? 360 : 420,
                    background: '#fff',
                    borderRadius: 24,
                    padding: isCompact ? '22px 20px' : '28px 26px',
                    boxShadow: '0 24px 60px rgba(31,27,46,0.32)',
                    textAlign: 'center',
                }}
            >
                {done ? (
                    <p style={{ margin: '8px 0', fontWeight: 800, color: tokens.colors.charcoal }}>
                        Thank you — that helps us fix it. 💛
                    </p>
                ) : (
                    <>
                        <h3
                            style={{
                                margin: 0,
                                fontFamily: tokens.fontFamily.display,
                                fontSize: '1.35rem',
                                color: tokens.colors.charcoal,
                            }}
                        >
                            Before you go…
                        </h3>
                        <p style={{ margin: '6px 0 16px', color: tokens.colors.charcoal, opacity: 0.7 }}>
                            {step === 'intent'
                                ? 'What did you come to do? (one tap)'
                                : 'What stopped you? (one tap)'}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {step === 'intent'
                                ? INTENT_OPTIONS.map((o) => (
                                      <OptionRow
                                          key={o.intent}
                                          emoji={o.emoji}
                                          label={o.label}
                                          onClick={() => pickIntent(o.intent)}
                                      />
                                  ))
                                : REASON_OPTIONS.map((o) => (
                                      <OptionRow
                                          key={o.reason}
                                          emoji={o.emoji}
                                          label={o.label}
                                          onClick={() => pickReason(o.reason)}
                                      />
                                  ))}
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                appearance: 'none',
                                background: 'transparent',
                                border: 'none',
                                marginTop: 14,
                                color: tokens.colors.charcoal,
                                opacity: 0.55,
                                fontWeight: 700,
                                cursor: 'pointer',
                                fontFamily: tokens.fontFamily.body,
                            }}
                        >
                            Skip
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

const OptionRow: React.FC<{ emoji: string; label: string; onClick: () => void }> = ({
    emoji,
    label,
    onClick,
}) => (
    <button
        onClick={onClick}
        style={{
            appearance: 'none',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            borderRadius: 14,
            border: `2px solid ${tokens.colors.deepPlum}22`,
            background: '#FBFCFF',
            fontWeight: 700,
            fontSize: '0.98rem',
            color: tokens.colors.charcoal,
            cursor: 'pointer',
            fontFamily: tokens.fontFamily.body,
        }}
    >
        <span style={{ fontSize: '1.25rem' }}>{emoji}</span>
        {label}
    </button>
);
