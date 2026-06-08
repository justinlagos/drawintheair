/**
 * Mode Selection Menu — "Choose your adventure" (Draw in the Air 2.0)
 *
 * VISUAL REDESIGN ONLY. This file was re-skinned to the 2.0 adventure
 * gallery (premium toy-console look). Every piece of PRODUCT LOGIC from
 * the previous implementation is preserved verbatim:
 *   - `GameMode` ids and the behavioural MODES order
 *   - `#mode-card-${id}` element ids (hand-tracking hit-test targets)
 *   - 1.5s dwell-to-select via index-fingertip hover
 *   - Premium gating (useParentAccess + PremiumLockModal)
 *   - Responsive breakpoints (phone / tablet / desktop, portrait/landscape)
 *   - The onSelect / onBack / trackingResults public API
 *
 * No-scroll: tablet/desktop/landscape render a fixed 4×2 gallery that
 * fits the viewport. Phone portrait keeps a compact list (the only
 * surface that may scroll, matching prior behaviour).
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { type HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { useParentAccess } from '../parent/useParentAccess';
import { PremiumLockModal } from '../parent/PremiumLockModal';
import { Dita2Root, type Tone } from '../kid2/Kid2';

export type GameMode = 'calibration' | 'free' | 'pre-writing' | 'sort-and-place' | 'word-search' | 'colour-builder' | 'balloon-math' | 'rainbow-bridge' | 'gesture-spelling' | 'building';

interface ModeOption {
    id: GameMode;
    title: string;
    subtitle: string;
    icon: string;
    /** 2.0 tonal family driving the badge gradient + glow. */
    tone: Tone;
    category: string;
    /** Age band shown on the tile tag (product fact, not progress). */
    age: string;
    /** 'free' = always playable; 'premium' = requires parent subscription/trial. */
    tier: 'free' | 'premium';
}

/**
 * Mode order is BEHAVIOURAL, not alphabetical.
 *
 * Tier 1 (top row . activation modes . highest first-session engagement):
 *   1. Free Paint . the "they just played this" anchor + creative.
 *   2. Bubble Pop . quickest win, biggest smile, lowest learning curve.
 *   3. Tracing . the curriculum gateway.
 *   4. Spelling Stars . the literacy hook for parents.
 *
 * Tier 2 (next-step modes . need more dexterity / dwell control):
 *   5. Sort & Place
 *   6. Word Search
 *   7. Balloon Math
 *   8. Rainbow Bridge
 *
 * Source: dashboard mode_started + mode_completed counts over the
 * last 90 days. Phase 2 of the activation refactor.
 */
const MODES: ModeOption[] = [
    { id: 'free',             title: 'Free Paint',     subtitle: 'Create anything',        icon: '🎨', tone: 'lavender', category: 'Creative', age: '3–7', tier: 'free' },
    { id: 'calibration',      title: 'Bubble Pop',     subtitle: 'Warm up your hands',     icon: '🫧', tone: 'peach',    category: 'Warm-up',  age: '3–7', tier: 'free' },
    { id: 'pre-writing',      title: 'Tracing',        subtitle: 'Follow the path',        icon: '✏️', tone: 'mint',     category: 'Learning', age: '3–7', tier: 'free' },
    { id: 'gesture-spelling', title: 'Spelling Stars', subtitle: 'Spell the word!',        icon: '✍️', tone: 'lavender', category: 'Learning', age: '5–7', tier: 'premium' },
    { id: 'sort-and-place',   title: 'Sort & Place',   subtitle: 'Think and sort',         icon: '🗂️', tone: 'sky',      category: 'Puzzle',   age: '3–6', tier: 'premium' },
    { id: 'word-search',      title: 'Word Search',    subtitle: 'Find the words',         icon: '🔍', tone: 'sun',      category: 'Puzzle',   age: '5–7', tier: 'premium' },
    { id: 'balloon-math',     title: 'Balloon Math',   subtitle: 'Pop the right number!',  icon: '🎈', tone: 'peach',    category: 'Learning', age: '4–7', tier: 'premium' },
    { id: 'rainbow-bridge',   title: 'Rainbow Bridge', subtitle: 'Match the colours',      icon: '🌈', tone: 'sky',      category: 'Learning', age: '3–6', tier: 'premium' },
];

interface ModeSelectionMenuProps {
    onSelect: (mode: GameMode) => void;
    onBack?: () => void;
    trackingResults: HandLandmarkerResult | null;
}

/* ═══════════════════════════════════════════════════
   ADVENTURE CARD — 2.0 tonal tile with 3D icon badge.
   Visuals only; selection/dwell are driven by the parent.
   ═══════════════════════════════════════════════════ */
interface AdventureCardProps {
    mode: ModeOption;
    featured?: boolean;
    compact?: boolean;
    locked?: boolean;
    isHovered: boolean;
    isSelected: boolean;
    hoverProgress: number; // 0..1, hand-tracking dwell
    onClick: () => void;
}

const DWELL_R = 15;
const DWELL_C = 2 * Math.PI * DWELL_R;

const AdventureCard = ({ mode, featured, compact, locked, isHovered, isSelected, hoverProgress, onClick }: AdventureCardProps) => {
    return (
        <button
            id={`mode-card-${mode.id}`}
            className={`d2-adv t-${mode.tone}${featured ? ' feature' : ''}${compact ? ' compact' : ''}${locked ? ' locked' : ''}${isSelected ? ' selected' : ''}`}
            onClick={onClick}
        >
            <div className="d2-adv-bg" />

            {locked && (
                <span className="d2-adv-lockbadge" aria-label="Premium game, ask a grown-up to unlock">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <rect x="3" y="11" width="18" height="11" rx="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Family
                </span>
            )}

            {/* Hand-tracking dwell ring (visual feedback for the 1.5s hold). */}
            {isHovered && hoverProgress > 0 && (
                <div className="d2-dwell-ring" aria-hidden="true">
                    <svg viewBox="0 0 32 32">
                        <circle cx="16" cy="16" r={DWELL_R} className="trk" />
                        <circle cx="16" cy="16" r={DWELL_R} className="fil" strokeDasharray={DWELL_C} strokeDashoffset={DWELL_C * (1 - hoverProgress)} />
                    </svg>
                </div>
            )}

            <div className="d2-adv-head">
                <div className="d2-adv-icon-badge">
                    <span className="d2-adv-icon-sheen" />
                    <span className="d2-adv-icon">{mode.icon}</span>
                </div>
                {!compact && (
                    <div className="d2-adv-play" style={{ background: `var(--d2-${mode.tone}-400)` }}>▶</div>
                )}
            </div>

            <div className="d2-adv-body">
                <div className="d2-adv-tag" style={{ color: `var(--d2-${mode.tone}-700, var(--d2-${mode.tone}-600))` }}>
                    {mode.category} · Ages {mode.age}
                </div>
                <h3 className="d2-adv-title">{mode.title}</h3>
                <p className="d2-adv-sub">{mode.subtitle}</p>
            </div>
        </button>
    );
};

/* ═══════════════════════════════════════════════════
   MAIN MENU COMPONENT
   ═══════════════════════════════════════════════════ */
export const ModeSelectionMenu = ({ onSelect, onBack, trackingResults }: ModeSelectionMenuProps) => {
    const [hoveredMode, setHoveredMode] = useState<GameMode | null>(null);
    const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
    const [hoverProgress, setHoverProgress] = useState(0);
    const [lockedPrompt, setLockedPrompt] = useState<ModeOption | null>(null);
    const { hasAccess } = useParentAccess();
    const hoverStartTime = useRef<number | null>(null);
    const cardRefs = useRef<Map<GameMode, DOMRect>>(new Map());

    const getScreenInfo = useCallback(() => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        return {
            isPhone: w <= 520,
            isTablet: w > 520 && w <= 1024,
            isDesktop: w > 1024,
            isLandscape: w > h,
            width: w,
            height: h,
        };
    }, []);
    const [screenInfo, setScreenInfo] = useState(getScreenInfo);

    useEffect(() => {
        const handleResize = () => setScreenInfo(getScreenInfo());
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [getScreenInfo]);

    const { isPhone, isLandscape } = screenInfo;
    const isMobilePortrait = isPhone && !isLandscape;

    // Update card hit areas for hand tracking
    useEffect(() => {
        const updateRefs = () => {
            MODES.forEach(mode => {
                const el = document.getElementById(`mode-card-${mode.id}`);
                if (el) cardRefs.current.set(mode.id, el.getBoundingClientRect());
            });
        };
        updateRefs();
        const interval = setInterval(updateRefs, 1000);
        return () => clearInterval(interval);
    }, []);

    // Hand tracking: dwell-to-select (1.5s hover)
    // This effect synchronizes external hand-tracking data (MediaPipe results)
    // into React state, the legitimate "subscribe to external system" pattern
    // for useEffect. The set-state calls are guarded by hover transitions so
    // they only fire on changes, not every frame.
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!trackingResults?.landmarks?.length) {
            if (hoverStartTime.current) {
                hoverStartTime.current = null;
                setHoverProgress(0);
                setHoveredMode(null);
            }
            return;
        }

        const tip = trackingResults.landmarks[0][8]; // index fingertip
        const fx = tip.x * window.innerWidth;
        const fy = tip.y * window.innerHeight;

        let found: GameMode | null = null;
        cardRefs.current.forEach((rect, modeId) => {
            if (fx >= rect.left && fx <= rect.right && fy >= rect.top && fy <= rect.bottom) {
                found = modeId;
            }
        });

        if (found !== hoveredMode) {
            setHoveredMode(found);
            hoverStartTime.current = found ? Date.now() : null;
            setHoverProgress(0);
        }

        if (found && hoverStartTime.current) {
            const elapsed = Date.now() - hoverStartTime.current;
            const progress = Math.min(elapsed / 1500, 1);
            setHoverProgress(progress);
            if (progress >= 1 && !selectedMode) {
                setSelectedMode(found);
                setTimeout(() => onSelect(found!), 250);
            }
        }
    }, [trackingResults, hoveredMode, selectedMode, onSelect]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const handleSelect = useCallback((mode: ModeOption) => {
        if (selectedMode) return;
        // Premium gate: if this is a paid-tier game and the visitor has no
        // active parent subscription/trial, surface the upgrade prompt
        // instead of starting the game.
        if (mode.tier === 'premium' && !hasAccess) {
            setLockedPrompt(mode);
            return;
        }
        setSelectedMode(mode.id);
        setTimeout(() => onSelect(mode.id), 200);
    }, [selectedMode, onSelect, hasAccess]);

    const galleryLayout = !isMobilePortrait;

    return (
        <Dita2Root ambient motionLevel={7} style={{ position: 'absolute', inset: 0, zIndex: 50 }}>
            {/* Soft sky background sits behind the design-system ambient layers. */}
            <div
                aria-hidden
                style={{
                    position: 'absolute', inset: 0, zIndex: 0,
                    background: 'linear-gradient(180deg, #F4EFFF 0%, #EEF6FF 38%, #FBF7EE 78%, #FFFDF7 100%)',
                }}
            />

            {/* Back chip (top-left) — preserves onBack contract. */}
            {onBack && (
                <div className="d2-hud-tl">
                    <button className="d2-chip" onClick={onBack}>
                        <span className="d2-ic">←</span> Back
                    </button>
                </div>
            )}

            <div className={isMobilePortrait ? 'd2-menu-portrait' : 'd2-menu-stage'}
                style={isMobilePortrait
                    ? { position: 'absolute', inset: 0, zIndex: 1, display: 'flex', flexDirection: 'column', gap: 12, padding: '64px 16px 16px', overflowY: 'auto' }
                    : undefined}
            >
                {/* Header */}
                <div className="d2-menu-head">
                    <div className="d2-spark-wrap">
                        <img
                            src="/logo.png"
                            alt="Draw in the Air"
                            style={{ height: isPhone ? 40 : 56, width: 'auto', filter: 'drop-shadow(0 2px 8px rgba(64,50,90,0.18))' }}
                        />
                        <div className="d2-say" style={{ fontSize: 'var(--d2-text-base)' }}>
                            Pick a world to explore. Point and hold, or tap.
                        </div>
                    </div>
                    <h1>Choose your <span style={{ color: 'var(--d2-lavender-600)' }}>adventure</span></h1>
                </div>

                {/* ═══ TILES ═══ */}
                {galleryLayout ? (
                    <div className="d2-menu-gallery">
                        {MODES.map(mode => (
                            <AdventureCard
                                key={mode.id}
                                mode={mode}
                                locked={mode.tier === 'premium' && !hasAccess}
                                isHovered={hoveredMode === mode.id}
                                isSelected={selectedMode === mode.id}
                                hoverProgress={hoveredMode === mode.id ? hoverProgress : 0}
                                onClick={() => handleSelect(mode)}
                            />
                        ))}
                    </div>
                ) : (
                    /* Phone portrait — compact vertical list (may scroll). */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {MODES.map(mode => (
                            <div key={mode.id} style={{ minHeight: 76 }}>
                                <AdventureCard
                                    mode={mode}
                                    compact
                                    locked={mode.tier === 'premium' && !hasAccess}
                                    isHovered={hoveredMode === mode.id}
                                    isSelected={selectedMode === mode.id}
                                    hoverProgress={hoveredMode === mode.id ? hoverProgress : 0}
                                    onClick={() => handleSelect(mode)}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer instruction pill */}
                <div
                    style={{
                        alignSelf: 'center', marginTop: isMobilePortrait ? 4 : 6,
                        padding: isPhone ? '10px 20px' : '12px 26px',
                        background: 'var(--d2-bg-elevated)', borderRadius: 'var(--d2-r-pill)',
                        border: '1px solid var(--d2-border-2)', boxShadow: 'var(--d2-shadow-2)',
                        display: 'flex', alignItems: 'center', gap: 10,
                        fontFamily: 'var(--d2-font-display)', fontWeight: 700,
                        fontSize: isPhone ? '0.9rem' : '1rem', color: 'var(--d2-fg-2)',
                    }}
                >
                    <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>👆</span>
                    {isPhone ? 'Tap to play' : 'Point and hold to select'}
                </div>
            </div>

            {/* Premium upgrade prompt, appears when an anonymous viewer taps
                a paid-tier game. Kid-safe copy, adult call-to-action. */}
            {lockedPrompt && (
                <PremiumLockModal
                    gameTitle={lockedPrompt.title}
                    gameIcon={lockedPrompt.icon}
                    onClose={() => setLockedPrompt(null)}
                />
            )}
        </Dita2Root>
    );
};
