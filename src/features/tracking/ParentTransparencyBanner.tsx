/**
 * Parent Transparency Banner
 *
 * Always-on small badge that appears whenever the camera is live, with a
 * click-to-expand modal that shows the actual live camera feed so a parent
 * can verify visually that nothing is being uploaded.
 *
 * The TrackingLayer keeps the <video> at 1×1 px (decoder-pinning trick) —
 * we render a second <video> in the modal whose srcObject is borrowed
 * from the same MediaStream. Same stream, no extra getUserMedia call,
 * no extra permission prompt.
 *
 * Rationale (2026-05-13): a kids-with-camera product is one viral parent
 * post away from a trust crisis. Making the privacy claim *visible* and
 * *verifiable* without buried settings or external pages is the cheapest
 * way to short-circuit that risk and the strongest pre-fundraise signal
 * that we take child-data seriously.
 */

import React, { useEffect, useRef, useState } from 'react';

interface ParentTransparencyBannerProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    cameraActive: boolean;
}

export const ParentTransparencyBanner: React.FC<ParentTransparencyBannerProps> = ({
    videoRef,
    cameraActive,
}) => {
    const [expanded, setExpanded] = useState(false);

    if (!cameraActive) return null;

    return (
        <>
            <button
                onClick={() => setExpanded(true)}
                aria-label="Privacy details — tap to see what the camera sees"
                title="Camera frames are processed on this device and never sent to a server. Tap to verify."
                style={{
                    position: 'fixed',
                    bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
                    left: 12,
                    zIndex: 200,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '5px 10px 5px 9px',
                    border: '1px solid rgba(255,255,255,0.30)',
                    borderRadius: 999,
                    background: 'rgba(11, 18, 38, 0.55)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    color: '#F8FAFC',
                    font: '700 10.5px Nunito, system-ui, sans-serif',
                    letterSpacing: '0.02em',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.20)',
                    opacity: 0.82,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.82'; }}
            >
                <span aria-hidden="true" style={{ fontSize: 11 }}>🔒</span>
                <span>On-device · tap to verify</span>
            </button>

            {expanded && <PreviewModal videoRef={videoRef} onClose={() => setExpanded(false)} />}
        </>
    );
};

const PreviewModal: React.FC<{
    videoRef: React.RefObject<HTMLVideoElement | null>;
    onClose: () => void;
}> = ({ videoRef, onClose }) => {
    const localRef = useRef<HTMLVideoElement>(null);

    // Borrow the live MediaStream from the hidden 1×1 video the
    // TrackingLayer is already rendering. Same stream, no extra
    // getUserMedia call, no extra permission prompt.
    useEffect(() => {
        const local = localRef.current;
        const source = videoRef.current;
        if (!local || !source) return;
        const stream = source.srcObject as MediaStream | null;
        if (stream) {
            local.srcObject = stream;
            local.play().catch(() => {/* user-gesture failure is fine */});
        }
        return () => {
            // Don't stop the stream — TrackingLayer still owns it. Just
            // detach so this preview element doesn't keep a reference.
            if (local) local.srcObject = null;
        };
    }, [videoRef]);

    // Escape closes
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="What the camera sees"
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1000,
                background: 'rgba(11, 18, 38, 0.78)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20,
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    width: 'min(640px, 92vw)',
                    background: '#FFFFFF',
                    borderRadius: 18,
                    padding: 24,
                    boxShadow: '0 24px 60px rgba(0,0,0,0.30)',
                    color: '#1A1B2E',
                    fontFamily: 'Nunito, system-ui, sans-serif',
                }}
            >
                <h2 style={{
                    margin: 0,
                    font: '700 22px Fredoka, system-ui, sans-serif',
                    color: '#6C3FA4',
                }}>
                    This is what the camera sees
                </h2>
                <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.5, color: '#3F4052' }}>
                    Frames are processed on your device by MediaPipe and used only to
                    estimate where your hand is. <strong>Nothing is uploaded, recorded,
                    or sent to a server.</strong> Close this tab and the camera turns off.
                </p>
                <div style={{
                    marginTop: 16,
                    background: '#0B1226',
                    borderRadius: 12,
                    overflow: 'hidden',
                    aspectRatio: '16 / 9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <video
                        ref={localRef}
                        playsInline
                        muted
                        autoPlay
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transform: 'scaleX(-1)', // mirror — what the kid expects
                        }}
                    />
                </div>
                <p style={{ marginTop: 12, fontSize: 12, color: '#6B6F84' }}>
                    Tracker model: MediaPipe HandLandmarker · runs entirely in your browser.
                </p>
                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px 18px',
                            background: '#6C3FA4',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: 999,
                            font: '700 13px Nunito, system-ui, sans-serif',
                            cursor: 'pointer',
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ParentTransparencyBanner;
