/**
 * WaveToWake — Bright Kid-UI onboarding screen
 *
 * Replaces the legacy dark navy "magical playroom at night" treatment with the
 * bright sky+meadow Kid-UI aesthetic. Decorative sun, drifting clouds, a
 * tactile cream KidPanel with Fredoka headline and 5 progress dots that fill
 * with sunshine as the child waves their hand.
 *
 * Tracking logic (5 detected horizontal "swipes" → onWake) is unchanged.
 */

import { useRef, useEffect, useState } from 'react';
import { type HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { tokens } from '../../styles/tokens';

const useResponsiveLayout = () => {
    const [layout, setLayout] = useState(() => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        return {
            isMobile: w <= 480,
            isTabletSmall: w > 480 && w <= 768,
            isLandscapePhone: w > h && h <= 500,
            screenWidth: w,
        };
    });

    useEffect(() => {
        const handleResize = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            setLayout({
                isMobile: w <= 480,
                isTabletSmall: w > 480 && w <= 768,
                isLandscapePhone: w > h && h <= 500,
                screenWidth: w,
            });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return layout;
};

interface WaveToWakeProps {
    onWake: () => void;
    trackingResults: HandLandmarkerResult | null;
    /** Camera state, passed in from TrackingLayer diagnostics. Optional for
     *  backwards-compat with older test harnesses. */
    cameraStatus?: 'idle' | 'requesting' | 'running' | 'error';
    cameraErrorCode?: string | null;
    trackerReady?: boolean;
    visionFps?: number;
}

export const WaveToWake = ({ onWake, trackingResults, cameraStatus, cameraErrorCode, trackerReady, visionFps }: WaveToWakeProps) => {
    const [waveCount, setWaveCount] = useState(0);
    // 'searching' = no hand seen yet, 'detected' = hand recently seen,
    // 'lost' = hand was seen but lost (give the user a hint)
    const [handStatus, setHandStatus] = useState<'searching' | 'detected' | 'lost'>('searching');
    // Allow tap-to-skip after 8s so the user is never permanently stuck
    const [showFallback, setShowFallback] = useState(false);
    const prevX = useRef<number | null>(null);
    const wakeThreshold = 4;
    const lastWaveTime = useRef<number>(0);
    const lastHandSeenAt = useRef<number>(0);
    const waveStartTime = useRef<number>(0);
    const hasTrackedView = useRef<boolean>(false);

    useEffect(() => {
        waveStartTime.current = Date.now();
        // Show "Tap here if it's not working" after 8 seconds
        const fallbackTimer = setTimeout(() => setShowFallback(true), 8000);
        return () => clearTimeout(fallbackTimer);
    }, []);

    // Hand-status watchdog: if no hand seen for 1.5s while we're 'detected',
    // flip to 'lost' so the user gets a hint to come back into frame.
    useEffect(() => {
        const interval = setInterval(() => {
            const ms = Date.now() - lastHandSeenAt.current;
            setHandStatus((prev) => {
                if (lastHandSeenAt.current === 0) return 'searching';
                if (ms < 1500) return 'detected';
                if (prev === 'detected') return 'lost';
                return prev;
            });
        }, 500);
        return () => clearInterval(interval);
    }, []);

    const layout = useResponsiveLayout();
    const { isMobile, isTabletSmall, isLandscapePhone } = layout;
    const isCompact = isMobile || isTabletSmall || isLandscapePhone;

    // Wave detection — subscribes to external hand-tracking results from
    // MediaPipe and synchronises into React state (the legitimate effect use
    // case). Set-state is throttled by lastWaveTime so only fires on real waves.
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (trackingResults && trackingResults.landmarks && trackingResults.landmarks.length > 0) {
            // Mark hand as seen for the status indicator
            lastHandSeenAt.current = Date.now();
            setHandStatus('detected');

            const hand = trackingResults.landmarks[0];
            const tip = hand[8]; // Index tip

            if (prevX.current !== null) {
                const dx = tip.x - prevX.current;
                const now = Date.now();
                // Lowered threshold from 0.05 → 0.025 so slower waves register;
                // tightened debounce from 300ms → 220ms so a vigorous wave
                // doesn't get rate-limited.
                if (Math.abs(dx) > 0.025 && now - lastWaveTime.current > 220) {
                    setWaveCount((c) => c + 1);
                    lastWaveTime.current = now;
                }
            }
            prevX.current = tip.x;
        }
    }, [trackingResults]);
    /* eslint-enable react-hooks/set-state-in-effect */

    // Analytics: log view once
    useEffect(() => {
        if (!hasTrackedView.current && typeof window !== 'undefined' && (window as { analytics?: { logEvent: (name: string, props?: Record<string, unknown>) => void } }).analytics) {
            hasTrackedView.current = true;
            const analytics = (window as { analytics?: { logEvent: (name: string, props?: Record<string, unknown>) => void } }).analytics;
            analytics?.logEvent('demo_wave_screen_view', { camera_permission: 'granted' });
        }
    }, []);

    // Wake when threshold reached
    useEffect(() => {
        if (waveCount >= wakeThreshold) {
            if (typeof window !== 'undefined' && (window as { analytics?: { logEvent: (name: string, props?: Record<string, unknown>) => void } }).analytics) {
                const analytics = (window as { analytics?: { logEvent: (name: string, props?: Record<string, unknown>) => void } }).analytics;
                const timeToWave = Date.now() - waveStartTime.current;
                analytics?.logEvent('demo_wave_success', { time_to_wave_ms: timeToWave });
                analytics?.logEvent('demo_mode_select_view');
            }
            onWake();
        }
    }, [waveCount, onWake]);

    const dotSize = isCompact ? 22 : 30;

    return (
        <div
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 50,
                background:
                    'linear-gradient(180deg, #BEEBFF 0%, #DEF5FF 35%, #FFF6E5 75%, #FFFAEB 100%)',
                fontFamily: tokens.fontFamily.body,
                overflow: 'hidden',
            }}
        >
            {/* ── Decorative sky scene ── */}
            <SkyScene />

            {/* Header with logo */}
            <div
                style={{
                    width: '100%',
                    padding: isCompact ? '1rem' : '1.5rem 2rem',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 12,
                    position: 'relative',
                    zIndex: 2,
                }}
            >
                <img
                    src="/logo.png"
                    alt="Draw in the Air"
                    style={{
                        height: isCompact ? 36 : 44,
                        width: 'auto',
                        filter: 'drop-shadow(0 4px 12px rgba(108, 63, 164, 0.18))',
                    }}
                />
            </div>

            {/* Centered wave card */}
            <div
                style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: isCompact ? '1rem' : '2rem',
                    position: 'relative',
                    zIndex: 2,
                }}
            >
                <div
                    style={{
                        width: '100%',
                        maxWidth: isCompact ? '92%' : 620,
                        animation: 'wtw-float 3.6s ease-in-out infinite',
                    }}
                >
                    <div
                        style={{
                            position: 'relative',
                            background:
                                'linear-gradient(180deg, #FFFFFF 0%, #FBFCFF 60%, #F4FAFF 100%)',
                            border: '3px solid rgba(108, 63, 164, 0.16)',
                            borderRadius: isCompact ? 32 : 40,
                            padding: isCompact ? '32px 28px' : '48px 56px',
                            boxShadow:
                                '0 24px 60px rgba(108, 63, 164, 0.22), 0 8px 24px rgba(108, 63, 164, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
                            textAlign: 'center',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Decorative corner sun */}
                        <div
                            style={{
                                position: 'absolute',
                                top: -36,
                                right: -28,
                                width: 130,
                                height: 130,
                                borderRadius: '50%',
                                background:
                                    'radial-gradient(circle at 35% 35%, #FFF1B5 0%, #FFD84D 50%, rgba(255, 216, 77, 0) 100%)',
                                opacity: 0.5,
                                pointerEvents: 'none',
                            }}
                        />
                        {/* Decorative bottom-left cloud */}
                        <div
                            style={{
                                position: 'absolute',
                                bottom: -22,
                                left: -16,
                                width: 90,
                                height: 30,
                                background: 'linear-gradient(180deg, #FFFFFF, #DEF5FF)',
                                borderRadius: 9999,
                                opacity: 0.65,
                                boxShadow:
                                    '20px -4px 0 -2px #FFFFFF, 44px 0 0 -4px #FFFFFF',
                                pointerEvents: 'none',
                            }}
                        />

                        <h1
                            style={{
                                fontFamily: tokens.fontFamily.display,
                                fontWeight: 700,
                                fontSize: isCompact
                                    ? 'clamp(2rem, 8vw, 2.8rem)'
                                    : 'clamp(2.6rem, 5vw, 3.6rem)',
                                lineHeight: 1.05,
                                letterSpacing: '-0.02em',
                                color: tokens.colors.charcoal,
                                margin: 0,
                                position: 'relative',
                                zIndex: 1,
                            }}
                        >
                            Draw in the{' '}
                            <span
                                style={{
                                    color: tokens.colors.deepPlum,
                                    position: 'relative',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                Air
                            </span>
                        </h1>

                        <p
                            style={{
                                fontFamily: tokens.fontFamily.body,
                                fontSize: isCompact ? '1.1rem' : '1.35rem',
                                fontWeight: 600,
                                color: tokens.colors.charcoal,
                                opacity: 0.85,
                                margin: isCompact ? '14px 0 0' : '20px 0 0',
                                position: 'relative',
                                zIndex: 1,
                            }}
                        >
                            Wave your hand to start! <WavingHand size={isCompact ? 28 : 34} />
                        </p>

                        {/* Progress dots */}
                        <div
                            style={{
                                display: 'flex',
                                gap: isCompact ? 10 : 14,
                                justifyContent: 'center',
                                marginTop: isCompact ? 24 : 32,
                                position: 'relative',
                                zIndex: 1,
                            }}
                            aria-label={`Progress: ${waveCount} of ${wakeThreshold}`}
                        >
                            {[...Array(wakeThreshold)].map((_, i) => (
                                <div
                                    key={i}
                                    style={{
                                        width: dotSize,
                                        height: dotSize,
                                        borderRadius: '50%',
                                        background:
                                            i < waveCount
                                                ? `radial-gradient(circle at 30% 30%, #FFF1B5 0%, ${tokens.colors.sunshine} 60%, ${tokens.colors.warmOrange} 100%)`
                                                : '#FFFFFF',
                                        border:
                                            i < waveCount
                                                ? `2px solid ${tokens.colors.sunshine}`
                                                : `2px solid rgba(108, 63, 164, 0.18)`,
                                        boxShadow:
                                            i < waveCount
                                                ? '0 4px 12px rgba(255, 216, 77, 0.55), 0 0 18px rgba(255, 216, 77, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.6)'
                                                : '0 2px 6px rgba(108, 63, 164, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
                                        transition:
                                            'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                        transform: i < waveCount ? 'scale(1.18)' : 'scale(1)',
                                    }}
                                />
                            ))}
                        </div>

                        {/* Hint copy */}
                        <p
                            style={{
                                fontFamily: tokens.fontFamily.body,
                                fontSize: isCompact ? '0.85rem' : '0.95rem',
                                fontWeight: 600,
                                color: tokens.colors.deepPlum,
                                opacity: 0.75,
                                margin: isCompact ? '20px 0 0' : '26px 0 0',
                                position: 'relative',
                                zIndex: 1,
                            }}
                        >
                            Show me your hand and wave it side to side
                        </p>

                        {/* Real-status indicator — derived from camera + tracker + hand */}
                        {(() => {
                            // Decide which message to show, in priority order
                            let statusKey: 'cam-error' | 'cam-loading' | 'tracker-loading' | 'hand-detected' | 'hand-lost' | 'hand-searching';
                            if (cameraStatus === 'error') statusKey = 'cam-error';
                            else if (cameraStatus === 'idle' || cameraStatus === 'requesting') statusKey = 'cam-loading';
                            else if (trackerReady === false) statusKey = 'tracker-loading';
                            else if (handStatus === 'detected') statusKey = 'hand-detected';
                            else if (handStatus === 'lost') statusKey = 'hand-lost';
                            else statusKey = 'hand-searching';

                            const messages: Record<typeof statusKey, { msg: string; tone: 'aqua' | 'green' | 'orange' | 'red' }> = {
                                'cam-error': {
                                    msg: cameraErrorCode === 'PERMISSION_DENIED'
                                        ? '🚫 Camera blocked. Allow it in your browser settings.'
                                        : cameraErrorCode === 'NO_DEVICE'
                                            ? '🚫 No camera found on this device.'
                                            : cameraErrorCode === 'DEVICE_BUSY'
                                                ? '⚠️ Camera in use by another app. Close it and refresh.'
                                                : `⚠️ Camera error (${cameraErrorCode || 'unknown'})`,
                                    tone: 'red',
                                },
                                'cam-loading': { msg: '📷 Starting camera…', tone: 'aqua' },
                                'tracker-loading': { msg: '🤖 Loading hand tracker…', tone: 'aqua' },
                                'hand-detected': { msg: '✋ Got it! Now wave!', tone: 'green' },
                                'hand-lost': { msg: '👀 Come back into the picture', tone: 'orange' },
                                'hand-searching': { msg: 'Looking for your hand…', tone: 'aqua' },
                            };
                            const { msg, tone } = messages[statusKey];
                            const colors = {
                                aqua: { bg: 'rgba(85, 221, 224, 0.18)', border: 'rgba(85, 221, 224, 0.55)', dot: tokens.colors.aqua },
                                green: { bg: 'rgba(126, 217, 87, 0.18)', border: 'rgba(126, 217, 87, 0.55)', dot: tokens.colors.meadowGreen },
                                orange: { bg: 'rgba(255, 177, 77, 0.18)', border: 'rgba(255, 177, 77, 0.55)', dot: tokens.colors.warmOrange },
                                red: { bg: 'rgba(255, 107, 107, 0.18)', border: 'rgba(255, 107, 107, 0.55)', dot: tokens.colors.coral },
                            }[tone];

                            return (
                                <div
                                    style={{
                                        marginTop: isCompact ? 16 : 22,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        padding: '8px 16px',
                                        borderRadius: 9999,
                                        background: colors.bg,
                                        border: `2px solid ${colors.border}`,
                                        fontFamily: tokens.fontFamily.body,
                                        fontWeight: 700,
                                        fontSize: isCompact ? '0.82rem' : '0.92rem',
                                        color: tokens.colors.charcoal,
                                        position: 'relative',
                                        zIndex: 1,
                                        transition: 'all 0.3s ease',
                                        maxWidth: '90%',
                                    }}
                                >
                                    <span
                                        style={{
                                            width: 10,
                                            height: 10,
                                            borderRadius: '50%',
                                            flexShrink: 0,
                                            background: colors.dot,
                                            boxShadow: tone === 'green' ? `0 0 0 4px ${colors.dot}33` : 'none',
                                            animation: tone !== 'green' ? 'wtw-pulse 1.4s ease-in-out infinite' : 'none',
                                        }}
                                    />
                                    {msg}
                                </div>
                            );
                        })()}

                        {/* Tiny FPS readout (only when running, helps debug perf) */}
                        {visionFps !== undefined && visionFps > 0 && (
                            <p style={{
                                marginTop: 8,
                                fontFamily: tokens.fontFamily.body,
                                fontSize: '0.72rem',
                                color: tokens.colors.charcoal,
                                opacity: 0.45,
                                fontWeight: 600,
                            }}>
                                Tracking · {visionFps} fps
                            </p>
                        )}

                        {/* Tap-to-skip fallback if camera/wave isn't working */}
                        {showFallback && waveCount < wakeThreshold && (
                            <div style={{ marginTop: 18, position: 'relative', zIndex: 1 }}>
                                <button
                                    onClick={onWake}
                                    style={{
                                        background: '#FFFFFF',
                                        border: `2.5px solid ${tokens.colors.deepPlum}`,
                                        borderRadius: 9999,
                                        padding: '10px 20px',
                                        fontFamily: tokens.fontFamily.display,
                                        fontWeight: 700,
                                        fontSize: '0.9rem',
                                        color: tokens.colors.deepPlum,
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 10px rgba(108, 63, 164, 0.12)',
                                    }}
                                >
                                    Skip — let me in
                                </button>
                                <p style={{
                                    marginTop: 8,
                                    fontFamily: tokens.fontFamily.body,
                                    fontSize: '0.78rem',
                                    color: tokens.colors.charcoal,
                                    opacity: 0.6,
                                }}>
                                    Camera not working? Tap above to continue.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes wtw-float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-8px); }
                }
                @keyframes wtw-cloud-drift {
                    from { transform: translateX(0); }
                    to { transform: translateX(120vw); }
                }
                @keyframes wtw-sun-pulse {
                    0%, 100% { transform: scale(1); opacity: 0.95; }
                    50% { transform: scale(1.04); opacity: 1; }
                }
                @keyframes wtw-wave-hand {
                    0%, 100% { transform: rotate(-12deg); }
                    50% { transform: rotate(18deg); }
                }
                @keyframes wtw-pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(0.85); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .wtw-cloud, .wtw-sun, .wtw-hand { animation: none !important; }
                }
            `}</style>
        </div>
    );
};

// ── Decorative sky scene ──────────────────────────────────────────
const SkyScene = () => (
    <div
        aria-hidden
        style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
        }}
    >
        {/* Sun */}
        <div
            className="wtw-sun"
            style={{
                position: 'absolute',
                top: '8%',
                right: '10%',
                width: 'clamp(120px, 16vw, 200px)',
                height: 'clamp(120px, 16vw, 200px)',
                borderRadius: '50%',
                background:
                    'radial-gradient(circle at 35% 35%, #FFF1B5 0%, #FFD84D 35%, #FFB14D 70%, rgba(255, 177, 77, 0) 100%)',
                filter: 'drop-shadow(0 0 50px rgba(255, 216, 77, 0.5))',
                animation: 'wtw-sun-pulse 6s ease-in-out infinite',
            }}
        />
        {/* Clouds */}
        <Cloud top="14%" left="-6%" width={210} duration={38} />
        <Cloud top="26%" left="32%" width={150} duration={30} delay={-6} opacity={0.85} />
        <Cloud top="9%" left="58%" width={180} duration={44} delay={-10} />
        <Cloud top="42%" left="-10%" width={170} duration={50} delay={-2} opacity={0.7} />

        {/* Meadow at bottom */}
        <svg
            viewBox="0 0 1440 240"
            preserveAspectRatio="none"
            style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: -1,
                width: '100%',
                height: '24%',
            }}
        >
            <defs>
                <linearGradient id="wtw-meadow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#92E36C" />
                    <stop offset="1" stopColor="#7ED957" />
                </linearGradient>
            </defs>
            <path
                d="M0 80 Q360 30 720 60 T1440 70 L1440 240 L0 240 Z"
                fill="#B5F15C"
                opacity="0.55"
            />
            <path
                d="M0 130 Q360 80 720 110 T1440 120 L1440 240 L0 240 Z"
                fill="url(#wtw-meadow)"
            />
            {/* Tufts */}
            <g fill="#92E36C">
                <path d="M120 130 q6 -16 12 0 z" />
                <path d="M280 124 q5 -14 10 0 z" />
                <path d="M520 134 q5 -14 10 0 z" />
                <path d="M820 130 q6 -16 12 0 z" />
                <path d="M1100 132 q6 -14 12 0 z" />
                <path d="M1300 124 q5 -16 10 0 z" />
            </g>
        </svg>

        {/* Soft sparkles */}
        <Sparkle top="20%" left="14%" size={70} color="rgba(255, 216, 77, 0.55)" />
        <Sparkle top="34%" left="78%" size={90} color="rgba(255, 107, 107, 0.40)" delay={-2} />
        <Sparkle top="56%" left="6%" size={70} color="rgba(85, 221, 224, 0.45)" delay={-4} />
        <Sparkle top="60%" left="86%" size={80} color="rgba(126, 217, 87, 0.50)" delay={-1} />

        <style>{`
            .wtw-cloud {
                position: absolute;
                background: linear-gradient(180deg, #FFFFFF 0%, #F4FAFF 100%);
                border-radius: 9999px;
                box-shadow: 0 8px 24px rgba(108, 63, 164, 0.10), inset 0 -8px 16px rgba(168, 216, 255, 0.30);
                animation: wtw-cloud-drift linear infinite;
            }
            .wtw-cloud::before, .wtw-cloud::after {
                content: '';
                position: absolute;
                background: inherit;
                border-radius: 50%;
            }
            .wtw-cloud::before { width: 65%; height: 130%; left: 10%; top: -50%; }
            .wtw-cloud::after { width: 55%; height: 110%; right: 8%; top: -35%; }

            @keyframes wtw-spark-float {
                0%, 100% { transform: translateY(0); opacity: 0.6; }
                50% { transform: translateY(-22px); opacity: 1; }
            }
        `}</style>
    </div>
);

interface CloudProps {
    top: string;
    left: string;
    width: number;
    duration: number;
    delay?: number;
    opacity?: number;
}
const Cloud = ({ top, left, width, duration, delay = 0, opacity = 0.95 }: CloudProps) => (
    <div
        className="wtw-cloud"
        style={{
            top,
            left,
            width,
            height: width * 0.32,
            opacity,
            animationDuration: `${duration}s`,
            animationDelay: `${delay}s`,
        }}
    />
);

interface SparkleProps {
    top: string;
    left: string;
    size: number;
    color: string;
    delay?: number;
}
const Sparkle = ({ top, left, size, color, delay = 0 }: SparkleProps) => (
    <div
        style={{
            position: 'absolute',
            top,
            left,
            width: size,
            height: size,
            background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
            borderRadius: '50%',
            opacity: 0.7,
            animation: `wtw-spark-float 7s ease-in-out infinite`,
            animationDelay: `${delay}s`,
        }}
    />
);

// ── Animated waving hand SVG ──────────────────────────────────────
const WavingHand = ({ size }: { size: number }) => (
    <span
        className="wtw-hand"
        style={{
            display: 'inline-block',
            width: size,
            height: size,
            verticalAlign: 'middle',
            marginLeft: 6,
            transformOrigin: '70% 80%',
            animation: 'wtw-wave-hand 1.4s ease-in-out infinite',
        }}
    >
        <svg viewBox="0 0 64 64" width={size} height={size}>
            <defs>
                <linearGradient id="wtw-hand-skin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#FFE7C9" />
                    <stop offset="1" stopColor="#F4C58E" />
                </linearGradient>
            </defs>
            <path
                d="M22 50 C22 36 28 26 32 26 L36 26 C40 26 42 30 42 34 L42 22 C42 19 44 17 47 17 C50 17 52 19 52 22 L52 38 C56 38 58 40 58 44 L58 50 C58 56 54 60 48 60 L32 60 C26 60 22 56 22 50 Z"
                fill="url(#wtw-hand-skin)"
                stroke="#3F4052"
                strokeWidth="1.6"
            />
            {/* Fingers */}
            <path d="M42 22 C42 19 40 17 37 17 C34 17 32 19 32 22 L32 38" fill="url(#wtw-hand-skin)" stroke="#3F4052" strokeWidth="1.6" />
            <path d="M32 24 C32 21 30 19 27 19 C24 19 22 21 22 24 L22 40" fill="url(#wtw-hand-skin)" stroke="#3F4052" strokeWidth="1.6" />
            {/* Sparkles around hand */}
            <path d="M10 18 l1.5 0 l0.5 -5 l0.5 5 l1.5 0 l-1.5 0.5 l-0.5 5 l-0.5 -5 z" fill="#FFD84D" />
            <circle cx="58" cy="14" r="2" fill="#FF6B6B" />
        </svg>
    </span>
);
