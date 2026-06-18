/**
 * InAppBrowserNotice — the mobile / in-app-webview handoff (Sprint 2).
 *
 * The launch data's biggest single leak: 64% of paid traffic arrives in
 * the Facebook / Instagram in-app browser, the one environment where a
 * webcam hand-tracking game is most likely to fail silently. Rather than
 * drop those users into a camera prompt that won't work, we set the
 * expectation up front and hand them off to a real browser.
 *
 * We can't force-launch an external browser from inside a webview, so we
 * copy the link and show the platform's "open in browser" gesture.
 */

import React, { useEffect, useRef, useState } from 'react';
import { tokens } from '../../styles/tokens';
import { logEvent } from '../../lib/analytics';

interface InAppBrowserNoticeProps {
    onContinueAnyway: () => void;
}

export const InAppBrowserNotice: React.FC<InAppBrowserNoticeProps> = ({ onContinueAnyway }) => {
    const [copied, setCopied] = useState(false);
    const logged = useRef(false);

    useEffect(() => {
        if (logged.current) return;
        logged.current = true;
        const browser = /Instagram/.test(navigator.userAgent) ? 'InstagramApp' : 'FacebookApp';
        logEvent('inapp_browser_detected', { meta: { browser } });
    }, []);

    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const url = typeof window !== 'undefined' ? window.location.href : 'drawintheair.com/play';

    const openExternal = async () => {
        logEvent('inapp_open_external_clicked');
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
        } catch {
            setCopied(true); // still show the instruction; they can type the URL
        }
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Open in your browser"
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 400,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20,
                background: 'linear-gradient(180deg, #BEEBFF 0%, #DEF5FF 35%, #FFF6E5 75%, #FFFAEB 100%)',
                fontFamily: tokens.fontFamily.body,
            }}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: 420,
                    background: '#fff',
                    borderRadius: 28,
                    padding: '30px 26px',
                    boxShadow: '0 22px 56px rgba(108,63,164,0.24)',
                    textAlign: 'center',
                }}
            >
                <div style={{ fontSize: '3rem' }}>🪄</div>
                <h2
                    style={{
                        fontFamily: tokens.fontFamily.display,
                        fontSize: '1.5rem',
                        color: tokens.colors.charcoal,
                        margin: '6px 0 6px',
                    }}
                >
                    Let's open this properly
                </h2>
                <p style={{ color: tokens.colors.charcoal, opacity: 0.75, margin: '0 0 18px', lineHeight: 1.5 }}>
                    Draw in the Air uses your camera to see your hand. That works best in
                    your phone's own browser — it can be blocked inside the {isIOS ? 'Instagram/Facebook' : 'in-app'} window.
                </p>

                {copied ? (
                    <div
                        style={{
                            background: `${tokens.colors.aqua}1f`,
                            borderRadius: 14,
                            padding: '14px 16px',
                            margin: '0 0 16px',
                            textAlign: 'left',
                            color: tokens.colors.charcoal,
                            fontWeight: 600,
                            fontSize: '0.92rem',
                            lineHeight: 1.5,
                        }}
                    >
                        ✅ Link copied! Now tap the <strong>•••</strong> menu{' '}
                        {isIOS ? '(bottom or top corner)' : '(top-right corner)'} and choose{' '}
                        <strong>“Open in {isIOS ? 'Safari' : 'Chrome'}”</strong> — then paste.
                    </div>
                ) : (
                    <button onClick={openExternal} style={primaryBtn}>
                        Open in my browser →
                    </button>
                )}

                <div>
                    <button onClick={onContinueAnyway} style={ghostLink}>
                        Continue here anyway
                    </button>
                </div>
            </div>
        </div>
    );
};

const primaryBtn: React.CSSProperties = {
    appearance: 'none',
    border: 'none',
    borderRadius: 9999,
    padding: '14px 26px',
    fontWeight: 800,
    fontSize: '1.02rem',
    cursor: 'pointer',
    background: tokens.colors.deepPlum,
    color: '#fff',
    fontFamily: tokens.fontFamily.body,
    width: '100%',
    marginBottom: 14,
};
const ghostLink: React.CSSProperties = {
    appearance: 'none',
    background: 'transparent',
    border: 'none',
    color: tokens.colors.charcoal,
    opacity: 0.55,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: tokens.fontFamily.body,
    fontSize: '0.9rem',
};
