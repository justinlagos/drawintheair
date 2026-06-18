/**
 * StuckHelp — the rescue layer (triggers 1–3).
 *
 * Drops onto the onboarding screen and watches the live tracking state.
 * When a user is stuck, it surfaces a gentle, one-tap card that LEADS
 * with help (Show me how / Try again) and quietly captures the reason
 * if they say something's wrong. It never blocks the screen — if the
 * user starts waving, the card disappears on its own.
 *
 *   Trigger 1 (dwell_help)   — >10s, no hand ever seen → "Need help?"
 *   Trigger 2 (gesture_demo) — hand seen, no wave after 15s → live demo
 *   Trigger 3 (camera_help)  — camera errored → "Why do you need my camera?"
 *
 * Triggers 4 (exit survey) and 5 (happiness) live in their own files.
 */

import React, { useEffect, useRef, useState } from 'react';
import { tokens } from '../../styles/tokens';
import { logEvent } from '../../lib/analytics';
import { GestureDemo } from './GestureDemo';
import { submitFeedback } from './submitFeedback';
import {
    selectStuckPrompt,
    type StuckPrompt,
    type CameraStatus,
} from './stuckTriggers';
import type { HandDetectionState, CameraPermissionState } from './feedbackContext';

interface StuckHelpProps {
    cameraStatus: CameraStatus;
    handStatus: 'searching' | 'detected' | 'lost';
    waveCompleted: boolean;
    onboardingStep?: string;
    trackerFps?: number;
    /** Retry the camera (passed from tracking diagnostics). */
    onRetryCamera?: () => void;
    isCompact?: boolean;
}

const SAMPLE_MS = 500;

const handStatusToDetection = (
    s: StuckHelpProps['handStatus'],
    everSeen: boolean,
): HandDetectionState => {
    if (s === 'detected') return 'detected';
    if (s === 'lost') return 'lost';
    return everSeen ? 'lost' : 'never';
};

export const StuckHelp: React.FC<StuckHelpProps> = ({
    cameraStatus,
    handStatus,
    waveCompleted,
    onboardingStep = 'wave_gate',
    trackerFps,
    onRetryCamera,
    isCompact = false,
}) => {
    const mountedAt = useRef<number>(0);
    const shownOnce = useRef<Set<StuckPrompt>>(new Set());
    const [elapsedMs, setElapsedMs] = useState(0);
    // State (not refs) because these drive what the selector renders.
    const [handDetectedAtMs, setHandDetectedAtMs] = useState<number | null>(null);
    const handEverDetected = handDetectedAtMs !== null;
    const [dismissed, setDismissed] = useState<Partial<Record<StuckPrompt, boolean>>>({});
    const [whyCameraOpen, setWhyCameraOpen] = useState(false);
    const [thanks, setThanks] = useState(false);

    // Stamp mount time once (kept out of the ref initializer so render
    // stays pure per react-hooks/purity).
    useEffect(() => {
        mountedAt.current = Date.now();
    }, []);

    // Record the moment a hand is first seen (drives trigger 2).
    useEffect(() => {
        if (handStatus === 'detected') {
            setHandDetectedAtMs((prev) =>
                prev === null ? Date.now() - mountedAt.current : prev,
            );
        }
    }, [handStatus]);

    // Sample elapsed time on a low-frequency interval.
    useEffect(() => {
        const id = setInterval(() => {
            setElapsedMs(Date.now() - mountedAt.current);
        }, SAMPLE_MS);
        return () => clearInterval(id);
    }, []);

    const prompt = waveCompleted
        ? 'none'
        : selectStuckPrompt({
              elapsedMs,
              cameraStatus,
              handEverDetected,
              handDetectedAtMs,
              waveCompleted,
              dismissed,
          });

    // Fire stuck_help_shown once per distinct prompt.
    useEffect(() => {
        if (prompt !== 'none' && !shownOnce.current.has(prompt)) {
            shownOnce.current.add(prompt);
            logEvent('stuck_help_shown', {
                meta: { prompt, onboarding_step: onboardingStep },
            });
        }
    }, [prompt, onboardingStep]);

    if (prompt === 'none' && !thanks) return null;

    const runtime = {
        onboarding_step: onboardingStep,
        hand_detection: handStatusToDetection(handStatus, handEverDetected) as HandDetectionState,
        camera_permission: cameraStatus as CameraPermissionState,
        tracker_fps: trackerFps ?? null,
        session_length_ms: elapsedMs,
    };

    const act = (action: string) =>
        logEvent('stuck_help_action', { meta: { prompt, action } });

    const dismiss = (p: StuckPrompt) =>
        setDismissed((d) => ({ ...d, [p]: true }));

    const reportProblem = async (reason: string) => {
        act('report_problem');
        await submitFeedback({ kind: 'stuck_help', reason, runtime });
        setThanks(true);
        dismiss(prompt as StuckPrompt);
        window.setTimeout(() => setThanks(false), 2600);
    };

    return (
        <div
            style={{
                position: 'absolute',
                left: '50%',
                bottom: isCompact ? 18 : 28,
                transform: 'translateX(-50%)',
                zIndex: 160,
                width: isCompact ? '92%' : 'auto',
                maxWidth: 440,
                display: 'flex',
                justifyContent: 'center',
                pointerEvents: 'auto',
            }}
        >
            <div
                role="dialog"
                aria-live="polite"
                style={{
                    width: '100%',
                    background: 'linear-gradient(180deg, #FFFFFF 0%, #F7FAFF 100%)',
                    border: `2.5px solid ${tokens.colors.deepPlum}26`,
                    borderRadius: 24,
                    padding: isCompact ? '16px 18px' : '20px 24px',
                    boxShadow:
                        '0 18px 44px rgba(108,63,164,0.22), 0 4px 14px rgba(108,63,164,0.12)',
                    fontFamily: tokens.fontFamily.body,
                    textAlign: 'center',
                    animation: 'fb-pop 240ms cubic-bezier(0.34,1.56,0.64,1)',
                }}
            >
                {thanks ? (
                    <p style={{ margin: 0, fontWeight: 700, color: tokens.colors.charcoal }}>
                        Thanks — that really helps. 💛
                    </p>
                ) : prompt === 'camera_help' ? (
                    <CameraHelp
                        whyOpen={whyCameraOpen}
                        onWhy={() => {
                            setWhyCameraOpen((v) => !v);
                            act('why_camera');
                        }}
                        onRetry={() => {
                            act('retry_camera');
                            onRetryCamera?.();
                        }}
                        onReport={() => reportProblem('camera_issue')}
                    />
                ) : prompt === 'gesture_demo' ? (
                    <GestureHelp onGotIt={() => { act('got_it'); dismiss('gesture_demo'); }} />
                ) : (
                    <DwellHelp
                        onShowDemo={() => { act('show_me_how'); dismiss('dwell_help'); }}
                        showDemo={false}
                        onReport={() => reportProblem('didnt_understand')}
                    />
                )}
            </div>
            <style>{`
                @keyframes fb-pop {
                    from { opacity: 0; transform: translate(-50%, 12px) scale(0.96); }
                    to   { opacity: 1; transform: translate(-50%, 0) scale(1); }
                }
            `}</style>
        </div>
    );
};

// ── Prompt bodies ────────────────────────────────────────────────────

const btnPrimary: React.CSSProperties = {
    appearance: 'none',
    border: 'none',
    borderRadius: 9999,
    padding: '10px 18px',
    fontWeight: 700,
    fontSize: '0.95rem',
    cursor: 'pointer',
    background: tokens.colors.deepPlum,
    color: '#fff',
    fontFamily: tokens.fontFamily.body,
};
const btnGhost: React.CSSProperties = {
    appearance: 'none',
    background: 'transparent',
    border: `2px solid ${tokens.colors.deepPlum}33`,
    borderRadius: 9999,
    padding: '9px 16px',
    fontWeight: 700,
    fontSize: '0.9rem',
    cursor: 'pointer',
    color: tokens.colors.deepPlum,
    fontFamily: tokens.fontFamily.body,
};
const rowStyle: React.CSSProperties = {
    display: 'flex',
    gap: 10,
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 14,
};

const DwellHelp: React.FC<{ onShowDemo: () => void; showDemo: boolean; onReport: () => void }> = ({
    onShowDemo,
    onReport,
}) => {
    const [demo, setDemo] = useState(false);
    return (
        <>
            <p style={{ margin: 0, fontWeight: 800, color: tokens.colors.charcoal, fontSize: '1.05rem' }}>
                👋 Need a hand?
            </p>
            <p style={{ margin: '6px 0 0', color: tokens.colors.charcoal, opacity: 0.7, fontSize: '0.9rem' }}>
                Hold your hand up so the camera can see it, then wave side to side.
            </p>
            {demo && <GestureDemo size="sm" />}
            <div style={rowStyle}>
                <button style={btnPrimary} onClick={() => { setDemo(true); onShowDemo(); }}>
                    Show me how
                </button>
                <button style={btnGhost} onClick={onReport}>
                    Something isn't working
                </button>
            </div>
        </>
    );
};

const GestureHelp: React.FC<{ onGotIt: () => void }> = ({ onGotIt }) => (
    <>
        <p style={{ margin: 0, fontWeight: 800, color: tokens.colors.charcoal, fontSize: '1.05rem' }}>
            Not sure what to do?
        </p>
        <p style={{ margin: '6px 0 2px', color: tokens.colors.charcoal, opacity: 0.7, fontSize: '0.9rem' }}>
            Wave your open hand left and right — like this:
        </p>
        <GestureDemo size="md" />
        <div style={rowStyle}>
            <button style={btnPrimary} onClick={onGotIt}>
                Got it!
            </button>
        </div>
    </>
);

const CameraHelp: React.FC<{
    whyOpen: boolean;
    onWhy: () => void;
    onRetry: () => void;
    onReport: () => void;
}> = ({ whyOpen, onWhy, onRetry, onReport }) => (
    <>
        <p style={{ margin: 0, fontWeight: 800, color: tokens.colors.charcoal, fontSize: '1.05rem' }}>
            We can't see your hand yet
        </p>
        <p style={{ margin: '6px 0 0', color: tokens.colors.charcoal, opacity: 0.7, fontSize: '0.9rem' }}>
            The game needs your camera to watch your hand move.
        </p>
        {whyOpen && (
            <p
                style={{
                    margin: '10px 0 0',
                    color: tokens.colors.charcoal,
                    opacity: 0.85,
                    fontSize: '0.85rem',
                    background: `${tokens.colors.aqua}1f`,
                    borderRadius: 12,
                    padding: '10px 12px',
                    textAlign: 'left',
                }}
            >
                🔒 The camera feed never leaves your device. We watch your hand
                in the browser and discard every frame. No video, photos, or
                audio are saved or shared.
            </p>
        )}
        <div style={rowStyle}>
            <button style={btnPrimary} onClick={onRetry}>
                Try again
            </button>
            <button style={btnGhost} onClick={onWhy}>
                {whyOpen ? 'Hide' : 'Why do you need my camera?'}
            </button>
        </div>
        <button
            style={{ ...btnGhost, border: 'none', marginTop: 8, opacity: 0.7 }}
            onClick={onReport}
        >
            Still stuck? Tell us what happened
        </button>
    </>
);
