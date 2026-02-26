/**
 * Try Free Modal
 *
 * Asks for age band only (required). Optional school/class codes
 * visible behind ?admin=1 URL param. No personal data collected.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { startSession, type PilotAgeBand } from '../lib/pilotAnalytics';
import './tryFreeModal.css';

const AGE_BANDS: { value: PilotAgeBand; label: string }[] = [
    { value: '4-5', label: '4–5' },
    { value: '6-7', label: '6–7' },
    { value: '8-9', label: '8–9' },
    { value: '10-11', label: '10–11' },
    { value: '12+', label: '12+' },
];

interface TryFreeModalProps {
    open: boolean;
    onClose: () => void;
}

export const TryFreeModal: React.FC<TryFreeModalProps> = ({ open, onClose }) => {
    const [ageBand, setAgeBand] = useState<PilotAgeBand | null>(null);
    const [schoolCode, setSchoolCode] = useState('');
    const [classCode, setClassCode] = useState('');
    const [showAdmin, setShowAdmin] = useState(false);

    // Detect ?admin=1 in URL
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        setShowAdmin(params.get('admin') === '1');
    }, []);

    const handleStart = useCallback(() => {
        if (!ageBand) return;

        // Start pilot analytics session
        startSession(ageBand, schoolCode.trim(), classCode.trim());

        // Log the demo_try_click for the existing analytics too
        if (typeof window !== 'undefined' && (window as any).analytics) {
            (window as any).analytics.logEvent('demo_try_click', {
                source: 'tryfree_modal',
                age_band: ageBand,
            });
        }

        // Navigate to demo loader
        window.location.pathname = '/demo';
    }, [ageBand, schoolCode, classCode]);

    const handleOverlayClick = useCallback(
        (e: React.MouseEvent) => {
            if (e.target === e.currentTarget) {
                onClose();
            }
        },
        [onClose]
    );

    // Handle Escape key
    useEffect(() => {
        if (!open) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="tryfree-overlay" onClick={handleOverlayClick}>
            <div className="tryfree-card" role="dialog" aria-modal="true" aria-label="Try Free">
                <button className="tryfree-close" onClick={onClose} aria-label="Close">
                    ×
                </button>

                <h2 className="tryfree-title">Let's Get Started</h2>
                <p className="tryfree-subtitle">Just one quick question</p>

                {/* Age Band Selector */}
                <label className="tryfree-label">How old is the child?</label>
                <div className="tryfree-age-pills" role="radiogroup" aria-label="Age band">
                    {AGE_BANDS.map((band) => (
                        <button
                            key={band.value}
                            className="tryfree-age-pill"
                            data-selected={ageBand === band.value ? 'true' : 'false'}
                            onClick={() => setAgeBand(band.value)}
                            role="radio"
                            aria-checked={ageBand === band.value}
                            type="button"
                        >
                            {band.label}
                        </button>
                    ))}
                </div>

                {/* Admin-only fields */}
                {showAdmin && (
                    <div className="tryfree-admin-fields">
                        <div className="tryfree-admin-badge">Pilot Admin</div>
                        <div className="tryfree-admin-row">
                            <input
                                type="text"
                                className="tryfree-admin-input"
                                placeholder="School code"
                                value={schoolCode}
                                onChange={(e) => setSchoolCode(e.target.value)}
                                maxLength={32}
                            />
                            <input
                                type="text"
                                className="tryfree-admin-input"
                                placeholder="Class code"
                                value={classCode}
                                onChange={(e) => setClassCode(e.target.value)}
                                maxLength={32}
                            />
                        </div>
                    </div>
                )}

                {/* Privacy Copy */}
                <p className="tryfree-privacy">
                    <span className="tryfree-privacy-icon">🔒</span>
                    We only collect age band and gameplay stats. We do not collect names,
                    photos, addresses, or camera images.
                </p>

                {/* Actions */}
                <div className="tryfree-actions">
                    <button
                        className="tryfree-btn tryfree-btn-cancel"
                        onClick={onClose}
                        type="button"
                    >
                        Cancel
                    </button>
                    <button
                        className="tryfree-btn tryfree-btn-start"
                        onClick={handleStart}
                        disabled={!ageBand}
                        type="button"
                    >
                        Start ▶
                    </button>
                </div>
            </div>
        </div>
    );
};
