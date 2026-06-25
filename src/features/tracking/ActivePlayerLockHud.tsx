/**
 * ActivePlayerLockHud — host-local controls for the primary-player lock.
 *
 * Renders three things, only when the activePlayerLock flag is on:
 *   1. A small, edge-positioned teacher "Change player" button. It is a native
 *      click target with NO `data-gesture` attribute, so the child's air-cursor
 *      (GestureLayer) can never trigger it — only a real tap/click by an adult.
 *      It calls activePlayerLock.reset(), clearing the identity and held cursor
 *      and returning the lock to SEARCHING; the next child must wave and stay
 *      stable to take control.
 *   2. A small, non-blocking "bring your hand back" nudge when the owned hand
 *      has been gone past the short hold window. It sits at the top edge and
 *      never covers the play area.
 *   3. A compact debug chip (state / candidates / confidence) when
 *      ?debug=tracking is active.
 *
 * It reads the lock snapshot from a ref written by TrackingLayer's vision loop
 * and polls at ~6 Hz (cheap; no per-frame React state).
 */

import { useEffect, useState } from 'react';
import { activePlayerLock, type ActivePlayerLockSnapshot } from '../../core/tracking/ActivePlayerLock';
import { isDebugModeEnabled } from '../../core/flags/TrackingFlags';

interface Props {
    snapshotRef: React.MutableRefObject<ActivePlayerLockSnapshot | null>;
}

const POLL_MS = 160; // ~6 Hz — enough for status text, far below render cost.

export function ActivePlayerLockHud({ snapshotRef }: Props) {
    const [snap, setSnap] = useState<ActivePlayerLockSnapshot | null>(null);

    useEffect(() => {
        // Start each session clean.
        activePlayerLock.reset(Date.now());
        const id = window.setInterval(() => {
            setSnap(snapshotRef.current);
        }, POLL_MS);
        return () => {
            window.clearInterval(id);
            activePlayerLock.reset(Date.now());
        };
    }, [snapshotRef]);

    const debug = isDebugModeEnabled();
    const showPrompt = snap?.needsHandBackPrompt === true;

    return (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none', // children opt back in individually
                zIndex: 160,
            }}
        >
            {/* (2) Non-blocking "bring your hand back" nudge — top edge only. */}
            {showPrompt && (
                <div
                    role="status"
                    style={{
                        position: 'absolute',
                        top: 'clamp(12px, 2.5vh, 28px)',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(30,26,60,0.86)',
                        color: '#fff',
                        borderRadius: '9999px',
                        padding: '10px 20px',
                        fontSize: 'clamp(0.85rem, 2vw, 1rem)',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        boxShadow: '0 6px 20px rgba(0,0,0,0.22)',
                        pointerEvents: 'none',
                    }}
                >
                    ✋ Bring your hand back into view
                </div>
            )}

            {/* (1) Teacher-only Change player control — small, bottom-left edge. */}
            <button
                type="button"
                aria-label="Change player — hand control to a different child"
                onClick={() => activePlayerLock.reset(Date.now())}
                style={{
                    position: 'absolute',
                    bottom: 'clamp(10px, 2vh, 22px)',
                    left: 'clamp(10px, 2vw, 22px)',
                    pointerEvents: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'rgba(255,255,255,0.9)',
                    color: '#40325A',
                    border: '1.5px solid rgba(64,50,90,0.18)',
                    borderRadius: 12,
                    padding: '8px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                    opacity: 0.85,
                }}
            >
                ↻ Change player
            </button>

            {/* (3) Debug chip — only with ?debug=tracking. */}
            {debug && snap && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: 'clamp(10px, 2vh, 22px)',
                        right: 'clamp(10px, 2vw, 22px)',
                        pointerEvents: 'none',
                        background: 'rgba(0,0,0,0.7)',
                        color: '#9CFFB0',
                        fontFamily: 'monospace',
                        fontSize: '0.72rem',
                        lineHeight: 1.4,
                        borderRadius: 8,
                        padding: '8px 10px',
                        whiteSpace: 'pre',
                    }}
                >
                    {`lock:   ${snap.state}\n` +
                        `owned:  ${snap.ownedIndex}  track:${snap.trackId ?? '-'}\n` +
                        `cands:  ${snap.candidateCount}  conf:${snap.confidence.toFixed(2)}\n` +
                        `lost:   ${snap.msSinceLost != null ? Math.round(snap.msSinceLost) + 'ms' : '-'}`}
                </div>
            )}
        </div>
    );
}

export default ActivePlayerLockHud;
