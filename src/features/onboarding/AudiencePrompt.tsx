/**
 * AudiencePrompt (Sprint 3) — the home vs school path split.
 *
 * Shown once, after a user has activated, only when we couldn't already
 * infer the audience from acquisition signals. One tap personalises the
 * next step: parents are guided to save their child's progress, teachers
 * to free classroom resources. The choice persists, so returning users
 * stay on the right path.
 */

import React, { useEffect, useState } from 'react';
import { tokens } from '../../styles/tokens';
import { logEvent } from '../../lib/analytics';
import { setAudience, pathForAudience, type Audience } from '../../lib/audience';

interface AudiencePromptProps {
    open: boolean;
    onClose: () => void;
    isCompact?: boolean;
}

export const AudiencePrompt: React.FC<AudiencePromptProps> = ({ open, onClose, isCompact = false }) => {
    const [chosen, setChosen] = useState<Audience | null>(null);

    useEffect(() => {
        if (open) logEvent('audience_identified', { meta: { audience: 'unknown', asked: true } });
    }, [open]);

    if (!open) return null;

    const choose = (a: Audience) => {
        setAudience(a);
        setChosen(a);
        logEvent('audience_selected', { meta: { audience: a } });
    };

    const cta = chosen ? pathForAudience(chosen) : null;
    const followCta = () => {
        if (!cta || !chosen) return;
        logEvent('audience_path_clicked', { meta: { audience: chosen } });
        window.location.href = cta.href;
    };

    return (
        <div
            role="dialog"
            aria-label="Where are you using Draw in the Air?"
            style={{
                position: 'fixed',
                left: '50%',
                bottom: isCompact ? 18 : 28,
                transform: 'translateX(-50%)',
                zIndex: 270,
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
            {chosen && cta ? (
                <>
                    <p style={{ margin: '0 0 12px', fontWeight: 800, color: tokens.colors.charcoal }}>
                        {chosen === 'home' ? 'Lovely! 🏠' : 'Great — for your class! 🏫'}
                    </p>
                    <button onClick={followCta} style={primaryBtn}>
                        {cta.label}
                    </button>
                    <div>
                        <button onClick={onClose} style={ghostLink}>Maybe later</button>
                    </div>
                </>
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
                        Where are you using Draw in the Air?
                    </p>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                        <button onClick={() => choose('home')} style={choiceBtn}>
                            <span style={{ fontSize: '1.5rem' }}>🏠</span>
                            At home
                        </button>
                        <button onClick={() => choose('school')} style={choiceBtn}>
                            <span style={{ fontSize: '1.5rem' }}>🏫</span>
                            At school
                        </button>
                    </div>
                    <div>
                        <button onClick={onClose} style={ghostLink}>Skip</button>
                    </div>
                </>
            )}
        </div>
    );
};

const primaryBtn: React.CSSProperties = {
    appearance: 'none',
    border: 'none',
    borderRadius: 9999,
    padding: '12px 22px',
    fontWeight: 800,
    fontSize: '0.98rem',
    cursor: 'pointer',
    background: tokens.colors.deepPlum,
    color: '#fff',
    fontFamily: tokens.fontFamily.body,
    marginBottom: 10,
};
const choiceBtn: React.CSSProperties = {
    appearance: 'none',
    border: `2px solid ${tokens.colors.deepPlum}1f`,
    background: '#FBFCFF',
    borderRadius: 16,
    padding: '12px 18px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    fontFamily: tokens.fontFamily.body,
    fontWeight: 700,
    fontSize: '0.9rem',
    color: tokens.colors.charcoal,
    minWidth: 110,
};
const ghostLink: React.CSSProperties = {
    appearance: 'none',
    background: 'transparent',
    border: 'none',
    marginTop: 10,
    color: tokens.colors.charcoal,
    opacity: 0.55,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: tokens.fontFamily.body,
    fontSize: '0.85rem',
};
