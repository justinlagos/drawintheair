/**
 * CameraExplainer — warm pre-prompt shown before the browser's camera
 * permission dialog.
 *
 * Industry pattern (Calendly, Whereby, Loom): a one-screen explainer
 * that says "here's why we need your camera, here's what we promise
 * not to do with it" before the user sees the cold OS-level prompt.
 * Targets users who would otherwise hit "Block" reflexively.
 *
 * Behaviour:
 *  - Mounted ONLY in the A/B treatment arm. Control arm skips this and
 *    goes straight to the legacy startCamera() path.
 *  - "Continue" fires camera_explainer_continue, hides the screen, and
 *    the parent triggers startCamera().
 *  - "Skip" fires camera_explainer_dismissed and proceeds anyway, since
 *    we don't want this to be a hard gate.
 *
 * Visual: matches the bright Kid-UI sky+meadow aesthetic used by
 * WaveToWake — same plum/sunshine palette, Fredoka headings.
 */

import React, { useEffect, useRef } from 'react';
import { tokens } from '../../styles/tokens';
import { logEvent } from '../../lib/analytics';

interface CameraExplainerProps {
    onContinue: () => void;
    onSkip?: () => void;
    isCompact?: boolean;
}

export const CameraExplainer: React.FC<CameraExplainerProps> = ({
    onContinue,
    onSkip,
    isCompact = false,
}) => {
    const hasLoggedView = useRef(false);
    useEffect(() => {
        if (hasLoggedView.current) return;
        hasLoggedView.current = true;
        logEvent('camera_explainer_shown');
    }, []);

    const handleContinue = () => {
        logEvent('camera_explainer_continue');
        onContinue();
    };

    const handleSkip = () => {
        logEvent('camera_explainer_dismissed');
        (onSkip ?? onContinue)();
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cam-explainer-title"
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: isCompact ? '20px 16px' : '40px',
                background: 'linear-gradient(180deg, #BEEBFF 0%, #DEF5FF 35%, #FFF6E5 75%, #FFFAEB 100%)',
                fontFamily: tokens.fontFamily.body,
                overflow: 'auto',
            }}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: isCompact ? '94%' : 560,
                    background: 'linear-gradient(180deg, #FFFFFF 0%, #FBFCFF 60%, #F4FAFF 100%)',
                    border: '3px solid rgba(108, 63, 164, 0.16)',
                    borderRadius: isCompact ? 28 : 36,
                    padding: isCompact ? '28px 24px' : '40px 48px',
                    boxShadow: '0 24px 60px rgba(108, 63, 164, 0.22), 0 6px 20px rgba(108, 63, 164, 0.12)',
                }}
            >
                {/* Camera icon */}
                <div style={{
                    width: 78, height: 78,
                    margin: '0 auto 16px',
                    borderRadius: 24,
                    background: 'linear-gradient(165deg, #FFF1B5 0%, #FFD84D 100%)',
                    border: '2.5px solid rgba(255, 177, 77, 0.55)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 8px 20px rgba(255, 177, 77, 0.35)',
                }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6C3FA4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                    </svg>
                </div>

                <h1
                    id="cam-explainer-title"
                    style={{
                        fontFamily: tokens.fontFamily.display,
                        fontWeight: 700,
                        fontSize: isCompact ? '1.5rem' : '1.95rem',
                        lineHeight: 1.15,
                        color: tokens.colors.charcoal,
                        margin: 0,
                        textAlign: 'center',
                    }}
                >
                    We use your camera so your kid can wave hello.
                </h1>

                <p style={{
                    marginTop: 12,
                    fontFamily: tokens.fontFamily.body,
                    fontSize: isCompact ? '1rem' : '1.08rem',
                    color: tokens.colors.charcoal,
                    opacity: 0.82,
                    textAlign: 'center',
                    lineHeight: 1.55,
                }}>
                    Your browser will ask for permission next.{' '}
                    <strong>Tap Allow</strong> and you’re in.
                </p>

                {/* Promise list */}
                <div style={{
                    marginTop: 22,
                    background: 'rgba(85, 221, 224, 0.10)',
                    border: '2px solid rgba(85, 221, 224, 0.40)',
                    borderRadius: 18,
                    padding: isCompact ? '14px 16px' : '18px 22px',
                }}>
                    {[
                        { icon: '🔒', text: <>The camera feed <strong>never leaves your device</strong>. We process frames in the browser and discard them.</> },
                        { icon: '📵', text: <>No video, audio, or photos are saved or shared. Ever.</> },
                        { icon: '🚫', text: <>No accounts, no email, no advertising tracking.</> },
                    ].map((row, i) => (
                        <div key={i} style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 10,
                            marginBottom: i < 2 ? 10 : 0,
                            fontFamily: tokens.fontFamily.body,
                            fontSize: isCompact ? '0.9rem' : '0.98rem',
                            color: tokens.colors.charcoal,
                            lineHeight: 1.55,
                        }}>
                            <span aria-hidden style={{ fontSize: isCompact ? '1.1rem' : '1.2rem', flexShrink: 0 }}>{row.icon}</span>
                            <span>{row.text}</span>
                        </div>
                    ))}
                </div>

                {/* Buttons */}
                <div style={{
                    marginTop: 22,
                    display: 'flex',
                    flexDirection: isCompact ? 'column' : 'row',
                    gap: 12,
                    justifyContent: 'center',
                    alignItems: 'center',
                }}>
                    <button
                        onClick={handleContinue}
                        style={{
                            background: 'linear-gradient(180deg, #7E4FB8 0%, #6C3FA4 100%)',
                            border: 'none',
                            color: '#FFFFFF',
                            fontFamily: tokens.fontFamily.display,
                            fontWeight: 700,
                            fontSize: '1.05rem',
                            padding: '14px 30px',
                            borderRadius: 9999,
                            cursor: 'pointer',
                            boxShadow: '0 6px 18px rgba(108, 63, 164, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
                            width: isCompact ? '100%' : 'auto',
                            minWidth: isCompact ? undefined : 200,
                        }}
                    >
                        Allow camera →
                    </button>
                    <button
                        onClick={handleSkip}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: tokens.colors.deepPlum,
                            fontFamily: tokens.fontFamily.body,
                            fontWeight: 700,
                            fontSize: '0.92rem',
                            padding: '10px 14px',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            textUnderlineOffset: 3,
                        }}
                    >
                        Tell me more first
                    </button>
                </div>

                <p style={{
                    marginTop: 16,
                    fontFamily: tokens.fontFamily.body,
                    fontSize: '0.78rem',
                    color: tokens.colors.charcoal,
                    opacity: 0.55,
                    textAlign: 'center',
                    lineHeight: 1.45,
                }}>
                    Full detail at <a href="/privacy" style={{ color: tokens.colors.deepPlum, fontWeight: 700 }}>drawintheair.com/privacy</a>.
                </p>
            </div>
        </div>
    );
};

export default CameraExplainer;
