/**
 * CameraRecovery — shown when the camera state machine lands in an
 * error. Picks copy + steps tailored to the specific cause
 * (denied / no_device / device_busy / not_supported / constraints /
 * unknown), with browser/OS-specific instructions via cameraHelp.
 *
 * Fires camera_recovery_shown on mount, camera_recovery_retry on
 * tap-retry, camera_recovery_dismissed on tap-back-to-home.
 */

import React, { useEffect, useRef, useState } from 'react';
import { tokens } from '../../styles/tokens';
import { logEvent } from '../../lib/analytics';
import { detectBrowser, getRecoveryCopy, type CameraCause } from '../../lib/cameraHelp';

interface CameraRecoveryProps {
    cause: CameraCause;
    onRetry?: () => void;
    onBackToHome?: () => void;
    isCompact?: boolean;
}

export const CameraRecovery: React.FC<CameraRecoveryProps> = ({
    cause,
    onRetry,
    onBackToHome,
    isCompact = false,
}) => {
    const hasLoggedView = useRef(false);
    const ctx = detectBrowser();
    const copy = getRecoveryCopy(cause, ctx);
    const [retrying, setRetrying] = useState(false);

    useEffect(() => {
        if (hasLoggedView.current) return;
        hasLoggedView.current = true;
        logEvent('camera_recovery_shown', {
            meta: { cause, browser: ctx.browser, os: ctx.os },
        });
    }, [cause, ctx.browser, ctx.os]);

    const handleRetry = () => {
        if (!onRetry || retrying) return;
        setRetrying(true);
        logEvent('camera_recovery_retry', { meta: { cause } });
        onRetry();
        // Re-enable retry button after 2s
        setTimeout(() => setRetrying(false), 2000);
    };

    const handleDismiss = () => {
        logEvent('camera_recovery_dismissed', { meta: { cause } });
        if (onBackToHome) onBackToHome();
        else window.location.href = '/';
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cam-recovery-title"
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
                    maxWidth: isCompact ? '94%' : 580,
                    background: 'linear-gradient(180deg, #FFFFFF 0%, #FBFCFF 60%, #F4FAFF 100%)',
                    border: '3px solid rgba(108, 63, 164, 0.16)',
                    borderRadius: isCompact ? 28 : 36,
                    padding: isCompact ? '28px 24px' : '40px 48px',
                    boxShadow: '0 24px 60px rgba(108, 63, 164, 0.22), 0 6px 20px rgba(108, 63, 164, 0.12)',
                    textAlign: 'left',
                }}
            >
                {/* Crossed-camera icon */}
                <div style={{
                    width: 72, height: 72,
                    margin: '0 auto 18px',
                    borderRadius: 22,
                    background: 'linear-gradient(165deg, #FFE2EC 0%, #FFD2DD 100%)',
                    border: '2px solid rgba(255, 107, 107, 0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={tokens.colors.coral} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="6" width="14" height="12" rx="2" />
                        <path d="M21 8v8l-4-3v-2l4-3z" />
                        <path d="M2 2l20 20" />
                    </svg>
                </div>

                <h1
                    id="cam-recovery-title"
                    style={{
                        fontFamily: tokens.fontFamily.display,
                        fontWeight: 700,
                        fontSize: isCompact ? '1.4rem' : '1.75rem',
                        lineHeight: 1.18,
                        color: tokens.colors.charcoal,
                        margin: 0,
                        textAlign: 'center',
                    }}
                >
                    {copy.title}
                </h1>

                <p style={{
                    marginTop: 10,
                    fontFamily: tokens.fontFamily.body,
                    fontSize: isCompact ? '0.95rem' : '1.02rem',
                    color: tokens.colors.charcoal,
                    opacity: 0.78,
                    textAlign: 'center',
                    lineHeight: 1.5,
                }}>
                    {copy.body}
                </p>

                {/* Steps */}
                {copy.steps.length > 0 && (
                    <ol style={{
                        margin: '20px 0 22px',
                        padding: 0,
                        listStyle: 'none',
                        fontFamily: tokens.fontFamily.body,
                        fontSize: isCompact ? '0.9rem' : '0.98rem',
                        color: tokens.colors.charcoal,
                        lineHeight: 1.55,
                    }}>
                        {copy.steps.map((step, i) => (
                            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                                <span style={{
                                    width: 24, height: 24, borderRadius: '50%',
                                    background: tokens.colors.deepPlum + '1A',
                                    color: tokens.colors.deepPlum,
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    fontFamily: tokens.fontFamily.display,
                                    fontWeight: 700, fontSize: '0.82rem', flexShrink: 0,
                                }}>{i + 1}</span>
                                <span style={{ paddingTop: 2 }}>{step}</span>
                            </li>
                        ))}
                    </ol>
                )}

                {/* Buttons */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                    {copy.canRetry && onRetry && (
                        <button
                            onClick={handleRetry}
                            disabled={retrying}
                            style={{
                                background: 'linear-gradient(180deg, #7E4FB8 0%, #6C3FA4 100%)',
                                border: 'none',
                                color: '#FFFFFF',
                                fontFamily: tokens.fontFamily.display,
                                fontWeight: 700,
                                fontSize: '1rem',
                                padding: '12px 24px',
                                borderRadius: 9999,
                                cursor: retrying ? 'wait' : 'pointer',
                                boxShadow: '0 6px 14px rgba(108, 63, 164, 0.30), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
                                opacity: retrying ? 0.7 : 1,
                            }}
                        >
                            {retrying ? 'Retrying…' : 'Try again'}
                        </button>
                    )}
                    <button
                        onClick={handleDismiss}
                        style={{
                            background: '#FFFFFF',
                            border: `2.5px solid ${tokens.colors.deepPlum}`,
                            color: tokens.colors.deepPlum,
                            fontFamily: tokens.fontFamily.display,
                            fontWeight: 700,
                            fontSize: '1rem',
                            padding: '10px 22px',
                            borderRadius: 9999,
                            cursor: 'pointer',
                        }}
                    >
                        Back to home
                    </button>
                </div>

                <p style={{
                    marginTop: 18,
                    fontFamily: tokens.fontFamily.body,
                    fontSize: '0.78rem',
                    color: tokens.colors.charcoal,
                    opacity: 0.55,
                    textAlign: 'center',
                    lineHeight: 1.45,
                }}>
                    Still stuck? Email <a href="mailto:help@drawintheair.com" style={{ color: tokens.colors.deepPlum, fontWeight: 700 }}>help@drawintheair.com</a>.
                </p>
            </div>
        </div>
    );
};

export default CameraRecovery;
