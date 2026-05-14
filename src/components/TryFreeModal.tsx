/**
 * Try Free Modal
 *
 * Asks for age band only (required). Optional school/class codes
 * visible behind ?admin=1 URL param. No personal data collected.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { logEvent, startSession, type AgeBand as PilotAgeBand } from '../lib/analytics';
import './tryFreeModal.css';

// Removed 12+ option: the landing pill says "Motion learning for ages
// 3 to 10" and the activities are calibrated for that range. 12+ is
// off-brand and surfaced as part of the 32% age-picker drop (audit
// 2026-05-11) — keeping only the relevant 4 bands keeps the picker
// faster and lets the layout fit in one tidy row.
const AGE_BANDS: { value: PilotAgeBand; label: string }[] = [
    { value: '4-5', label: '4-5' },
    { value: '6-7', label: '6-7' },
    { value: '8-9', label: '8-9' },
    { value: '10-11', label: '10-11' },
];

// Default band — pre-selected on modal open so the user can hit Start
// in one tap. They can always change. The median visitor on the site
// has a 6-year-old in the funnel (educated guess from age-band data),
// so 6-7 is the least-wrong default.
const DEFAULT_BAND: PilotAgeBand = '6-7';

interface TryFreeModalProps {
    open: boolean;
    onClose: () => void;
}

interface AnalyticsWindow {
    analytics?: {
        logEvent: (name: string, props?: Record<string, unknown>) => void;
    };
}

// Read ?admin=1 once at module load — pure, no setState-in-effect needed.
const initialAdmin =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('admin') === '1';

export const TryFreeModal: React.FC<TryFreeModalProps> = ({ open, onClose }) => {
    // Default-select the median band so Start is immediately clickable.
    // Reduces the picker to a one-tap interaction for the 95% case
    // (parent doesn't need to change it) and a two-tap for the 5% who
    // do. Was previously null, requiring an explicit pick before Start
    // would enable — contributing to a 32% drop at this screen.
    const [ageBand, setAgeBand] = useState<PilotAgeBand>(DEFAULT_BAND);
    const [schoolCode, setSchoolCode] = useState('');
    const [classCode, setClassCode] = useState('');
    const [showAdmin] = useState(initialAdmin);

    const handleStart = useCallback(() => {
        // ageBand is always non-null now (DEFAULT_BAND on open) but the
        // strictness is cheap to keep.
        if (!ageBand) return;

        // Activation funnel: the kid has committed to a band. This event
        // fires _before_ startSession so it lands under the previous
        // session_id (or none) — important so we can count age-band
        // commits even when the session row doesn't materialise (e.g. if
        // the navigation aborts before the next page boots analytics).
        logEvent('age_band_selected', {
            meta: { age_band: ageBand, has_school_code: schoolCode.trim().length > 0 },
        });

        // Start the analytics session — generates a fresh UUID and sets
        // the age_band context that all subsequent events inherit.
        startSession({ ageBand, schoolId: schoolCode.trim(), classId: classCode.trim() });

        // Log the demo_try_click for the existing analytics too
        if (typeof window !== 'undefined') {
            const analytics = (window as AnalyticsWindow).analytics;
            analytics?.logEvent('demo_try_click', {
                source: 'tryfree_modal',
                age_band: ageBand,
            });
        }

        // Navigate to play
        window.location.pathname = '/play';
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

    // Activation funnel: log try_free_clicked exactly once each time the
    // modal opens. We instrument here (not at the seven landing CTAs)
    // because it gives us one canonical event regardless of which CTA
    // the user used.
    useEffect(() => {
        if (open) logEvent('try_free_clicked');
    }, [open]);

    if (!open) return null;

    return (
        <div className="tryfree-overlay" onClick={handleOverlayClick}>
            <div className="tryfree-card" role="dialog" aria-modal="true" aria-label="Try Free">
                <button className="tryfree-close" onClick={onClose} aria-label="Close">
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

                <h2 className="tryfree-title">Let's Get Started</h2>
                <p className="tryfree-subtitle">Just one quick question</p>

                {/* Age Band Selector */}
                <label className="tryfree-label">How Old Is the Child?</label>
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
