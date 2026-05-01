/**
 * Word Search Mode - Redesigned for EYFS
 * 
 * Kid-first guided game screen with:
 * - Top bar with logo, mode name, and lock icon
 * - Progress strip with visual dots
 * - Centered play area with rounded container
 * - Side panel word tray with rounded pills
 * - Dynamic instruction bar
 * - Calm, clear feedback without floating banners
 */

import { useEffect, useRef, useState, useCallback, type MutableRefObject } from 'react';
import type { TrackingFrameData } from '../../tracking/TrackingLayer';
import { generateGrid } from './wordSearchGenerator';
import { renderGrid } from './wordSearchRender';
import { processWordSearchFrame, createWordSearchState, type WordSearchState } from './wordSearchLogic';
import { selectWords, getWordIcon } from './wordSearchAssets';
import { WORD_COUNTS, WORD_LENGTHS } from './wordSearchConstants';
import type { WordSearchSettings, Theme, Difficulty, Chapter, Word } from './wordSearchTypes';
import { showMessageCard, getRandomMessageCopy } from '../../../core/messageCardService';
import { isCountdownActive } from '../../../core/countdownService';
import { KidPanel, KidButton, KidObjectiveCard, KidBadge } from '../../../components/kid-ui';
import { tokens } from '../../../styles/tokens';

export interface WordSearchModeProps {
    frameRef?: MutableRefObject<TrackingFrameData>;
    showSettings?: boolean;
    onCloseSettings?: () => void;
    onExit?: () => void;
}

// Default settings
const DEFAULT_SETTINGS: WordSearchSettings = {
    difficulty: 'easy',
    theme: 'animals',
    sound: true,
    backwardWords: false,
    reduceMotion: false,
    chapter: 1
};

// Chapter themes (environment themes) — 6 chapters of progressive difficulty.
const CHAPTER_THEMES: Record<Chapter, Theme> = {
    1: 'animals',
    2: 'nature',
    3: 'food',
    4: 'colours',
    5: 'family',
    6: 'toys',
};

// Chapter environment configs — bright Kid-UI palette per chapter.
const CHAPTER_ENVIRONMENTS: Record<Chapter, {
    backgroundGradient: string;
    accentColor: string;
    name: string;
    icon: string;
}> = {
    1: {
        backgroundGradient: 'linear-gradient(180deg, #BEEBFF 0%, #DEF5FF 55%, #FFFAEB 100%)',
        accentColor: '#55DDE0',
        name: 'Animal Friends',
        icon: '🐾',
    },
    2: {
        backgroundGradient: 'linear-gradient(180deg, #C5F0BC 0%, #E5F8E0 60%, #FFF6E5 100%)',
        accentColor: '#7ED957',
        name: 'Nature Garden',
        icon: '🌿',
    },
    3: {
        backgroundGradient: 'linear-gradient(180deg, #FFE4D4 0%, #FFF4E0 55%, #FFFAEB 100%)',
        accentColor: '#FFB14D',
        name: 'Yummy Food',
        icon: '🍎',
    },
    4: {
        backgroundGradient: 'linear-gradient(180deg, #FFE0F0 0%, #FFF0FA 55%, #FFFAEB 100%)',
        accentColor: '#FF6B9D',
        name: 'Rainbow Colours',
        icon: '🌈',
    },
    5: {
        backgroundGradient: 'linear-gradient(180deg, #FFF6E5 0%, #FFFAF0 55%, #FFE8C0 100%)',
        accentColor: '#FFD84D',
        name: 'Family Time',
        icon: '👪',
    },
    6: {
        backgroundGradient: 'linear-gradient(180deg, #E8DEFB 0%, #F4EAFF 55%, #FFF6E5 100%)',
        accentColor: '#A855F7',
        name: 'Toy Chest',
        icon: '🧸',
    },
};

// Instruction text based on state
const getInstructionText = (state: 'idle' | 'hint' | 'selecting' | 'success' | 'levelComplete', foundCount: number, totalWords: number): { text: string; icon: string } => {
    switch (state) {
        case 'idle':
            return { text: 'Pinch and drag to find a word', icon: '👆' };
        case 'hint':
            return { text: 'Try starting here', icon: '💡' };
        case 'selecting':
            return { text: 'Keep going!', icon: '✨' };
        case 'success':
            const remaining = totalWords - foundCount;
            return remaining > 0
                ? { text: `Nice work! ${remaining} more!`, icon: '🌟' }
                : { text: 'All words found!', icon: '🎉' };
        case 'levelComplete':
            return { text: 'Great job!', icon: '⭐' };
        default:
            return { text: 'Pinch and drag to find a word', icon: '👆' };
    }
};

export const WordSearchMode = ({ frameRef, showSettings = false, onCloseSettings, onExit }: WordSearchModeProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const stateRef = useRef<WordSearchState>(createWordSearchState(DEFAULT_SETTINGS));
    const animationFrameRef = useRef<number | undefined>(undefined);

    const [settings, setSettings] = useState<WordSearchSettings>(DEFAULT_SETTINGS);
    const [chapter, setChapter] = useState<Chapter>(1);
    const [hintPhase, setHintPhase] = useState<0 | 1 | 2 | 3>(0);
    const [hintWordIndex, setHintWordIndex] = useState<number | null>(null);
    const [hintTileIds, setHintTileIds] = useState<string[]>([]);
    const [showOnboarding, setShowOnboarding] = useState(true);
    const [instructionState, setInstructionState] = useState<'idle' | 'hint' | 'selecting' | 'success' | 'levelComplete'>('idle');
    const [showLevelComplete, setShowLevelComplete] = useState(false);
    const [justFoundWord, setJustFoundWord] = useState<string | null>(null);
    const [hoverTileId, setHoverTileId] = useState<string | null>(null);
    const stageStartTimeRef = useRef<number>(Date.now());
    const successCountRef = useRef<number>(0);
    const streakRef = useRef<number>(0);

    // Force re-render for word list updates
    const [, forceUpdate] = useState({});

    // Responsive layout detection
    const [layout, setLayout] = useState(() => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        return {
            isMobile: w < 600,
            isTabletSmall: w >= 600 && w < 900,
            isTablet: w >= 900 && w < 1200,
            isDesktop: w >= 1200,
            isLandscapePhone: w > h && h <= 500,
            screenWidth: w,
            screenHeight: h
        };
    });

    const { isMobile, isTabletSmall, isLandscapePhone } = layout;
    const isCompact = isMobile || isLandscapePhone;

    // Detect responsive layout
    useEffect(() => {
        const handleResize = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            setLayout({
                isMobile: w < 600,
                isTabletSmall: w >= 600 && w < 900,
                isTablet: w >= 900 && w < 1200,
                isDesktop: w >= 1200,
                isLandscapePhone: w > h && h <= 500,
                screenWidth: w,
                screenHeight: h
            });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Hide onboarding after 3 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowOnboarding(false);
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    // Initialize grid when chapter or settings change
    useEffect(() => {
        const currentChapter = chapter;
        const chapterTheme = CHAPTER_THEMES[currentChapter];
        const wordCount = WORD_COUNTS[currentChapter];
        const wordLengths = WORD_LENGTHS[currentChapter];

        // Select words with length constraints
        const words = selectWords(chapterTheme, wordCount, wordLengths.min, wordLengths.max);
        const grid = generateGrid(words, settings.difficulty, chapterTheme, currentChapter);

        const newSettings = { ...settings, chapter: currentChapter, theme: chapterTheme };
        stateRef.current = createWordSearchState(newSettings);
        stateRef.current.chapter = currentChapter;
        stateRef.current.grid = grid;

        // Reset UI state
        setShowLevelComplete(false);
        setHoverTileId(null);
        setHintPhase(0);
        setHintWordIndex(null);
        setHintTileIds([]);
        setInstructionState('idle');
        setJustFoundWord(null);
        setShowOnboarding(true);
        stageStartTimeRef.current = Date.now();
        successCountRef.current = 0;
        streakRef.current = 0;

        // Re-show onboarding briefly
        setTimeout(() => setShowOnboarding(false), 3000);
    }, [chapter, settings.difficulty]);

    // Process frames and render
    useEffect(() => {
        if (!stateRef.current.grid) {
            return;
        }

        const processAndRender = () => {
            const frameData = frameRef?.current;
            if (frameData && !isCountdownActive()) {
                const result = processWordSearchFrame(stateRef, frameData, Date.now());

                // Update hint state
                setHintPhase(result.hintPhase);
                setHintWordIndex(result.hintWordIndex);
                setHintTileIds(result.hintTileIds);

                // Update instruction state based on hint
                if (result.hintPhase > 0) {
                    setInstructionState('hint');
                } else if (stateRef.current.selectionState.isActive) {
                    setInstructionState('selecting');
                }

                // Handle word found
                if (result.wordFound) {
                    setJustFoundWord(result.wordFound);
                    setInstructionState('success');
                    forceUpdate({});

                    const now = Date.now();
                    const eligible = now - stageStartTimeRef.current >= 2000;
                    if (eligible) {
                        successCountRef.current += 1;
                        streakRef.current += 1;
                        if (successCountRef.current % 3 === 0) {
                            showMessageCard({ text: getRandomMessageCopy(), variant: 'success', durationMs: 1000 });
                        }
                        if (streakRef.current === 5) {
                            showMessageCard({ text: getRandomMessageCopy(), variant: 'success', durationMs: 1000 });
                        }
                    }

                    // Clear just-found highlight after animation (1-1.5 seconds)
                    setTimeout(() => {
                        setJustFoundWord(null);
                    }, 1200);

                    // Reset to idle after success message
                    setTimeout(() => {
                        if (!result.roundComplete) {
                            setInstructionState('idle');
                        }
                    }, 1800);

                    if (result.roundComplete) {
                        // Show level complete
                        setInstructionState('levelComplete');
                        setShowLevelComplete(true);
                        if (Date.now() - stageStartTimeRef.current >= 2000) {
                            showMessageCard({ text: getRandomMessageCopy(), variant: 'success', durationMs: 1100 });
                        }

                        // Auto-advance to next chapter after delay (6 chapters)
                        setTimeout(() => {
                            setShowLevelComplete(false);
                            if (chapter < 6) {
                                setChapter((chapter + 1) as Chapter);
                            } else {
                                // All chapters complete - loop back to chapter 1
                                setChapter(1);
                            }
                        }, 2500);
                    }
                }

                // Update hover tile
                if (frameData.filteredPoint && stateRef.current.grid) {
                    const tile = getTileAtPoint(stateRef.current.grid, frameData.filteredPoint);
                    setHoverTileId(tile?.id || null);
                } else {
                    setHoverTileId(null);
                }
            }

            // Always render if grid exists
            if (canvasRef.current && stateRef.current.grid) {
                const ctx = canvasRef.current.getContext('2d');
                if (ctx) {
                    const width = canvasRef.current.width;
                    const height = canvasRef.current.height;

                    renderGrid(
                        ctx,
                        stateRef.current.grid,
                        settings.theme,
                        hoverTileId,
                        stateRef.current.selectionState,
                        stateRef.current.foundTileIds,
                        width,
                        height,
                        hintTileIds,
                        hintPhase
                    );
                }
            }

            animationFrameRef.current = requestAnimationFrame(processAndRender);
        };

        animationFrameRef.current = requestAnimationFrame(processAndRender);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [frameRef, settings.theme, hoverTileId, hintTileIds, hintPhase, chapter]);

    // Setup canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        return () => {
            window.removeEventListener('resize', resizeCanvas);
        };
    }, []);

    // Handle settings change
    const handleSettingsChange = useCallback((newSettings: WordSearchSettings) => {
        setSettings(newSettings);
        onCloseSettings?.();
    }, [onCloseSettings]);

    const foundCount = stateRef.current.grid
        ? stateRef.current.grid.words.filter(w => w.found).length
        : 0;
    const totalWords = stateRef.current.grid ? stateRef.current.grid.words.length : 0;
    const environment = CHAPTER_ENVIRONMENTS[chapter];
    const words = stateRef.current.grid?.words || [];
    const instruction = getInstructionText(instructionState, foundCount, totalWords);

    return (
        <>
            {/* Background with chapter environment */}
            <div style={{
                position: 'fixed',
                inset: 0,
                background: environment.backgroundGradient,
                zIndex: 0,
                pointerEvents: 'none'
            }} />

            {/* Subtle ambient decoration */}
            <div style={{
                position: 'fixed',
                inset: 0,
                background: `radial-gradient(circle at 20% 30%, ${environment.accentColor}15 0%, transparent 40%),
                             radial-gradient(circle at 80% 70%, ${environment.accentColor}10 0%, transparent 40%)`,
                zIndex: 1,
                pointerEvents: 'none'
            }} />

            {/* ═══════════════════════════════════════════════════════════════
                TOP BAR - Logo, Mode Name, Lock Icon (handled by AdultGate)
                Responsive: Compact on mobile, full on desktop
            ═══════════════════════════════════════════════════════════════ */}
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                height: isCompact ? '50px' : '70px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: isCompact ? '0 12px' : '0 24px',
                zIndex: 50,
                pointerEvents: 'none'
            }}>
                {/* Left: KidButton-secondary back + mode label */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: isCompact ? tokens.spacing.sm : tokens.spacing.md,
                    pointerEvents: 'auto',
                }}>
                    {onExit && (
                        <KidButton variant="secondary" size="md" onClick={onExit}
                                   icon={<span aria-hidden>←</span>}>
                            Menu
                        </KidButton>
                    )}
                    <span style={{ fontSize: isCompact ? '1.3rem' : '1.8rem' }}>🔍</span>
                    <div>
                        <div style={{
                            fontFamily: tokens.fontFamily.heading,
                            fontWeight: tokens.fontWeight.bold,
                            fontSize: isCompact ? tokens.fontSize.label : tokens.fontSize.button,
                            color: tokens.semantic.primary,
                            lineHeight: 1.2,
                        }}>
                            {isCompact ? 'Words' : 'Word Search'}
                        </div>
                        {!isCompact && (
                            <div style={{
                                fontFamily: tokens.fontFamily.body,
                                fontSize: tokens.fontSize.caption,
                                color: tokens.semantic.textSecondary,
                                fontWeight: tokens.fontWeight.medium,
                            }}>
                                Find the words
                            </div>
                        )}
                    </div>
                </div>

                {/* Centre and right intentionally minimal — AdultGate handles the lock icon */}
                <div style={{ width: isCompact ? '50px' : '100px' }} />
            </div>

            {/* PROGRESS STRIP — Kid-UI cream pill with bright dots */}
            <div style={{
                position: 'fixed',
                top: isCompact ? '60px' : '82px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: tokens.zIndex.hud,
                pointerEvents: 'none',
                maxWidth: isCompact ? 'calc(100% - 120px)' : 'none',
            }}>
                <KidPanel size="sm" tone="white" style={{
                    padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: isCompact ? tokens.spacing.sm : tokens.spacing.md,
                }}>
                    {!isCompact && (
                        <>
                            <span style={{
                                fontFamily: tokens.fontFamily.heading,
                                fontWeight: tokens.fontWeight.bold,
                                fontSize: tokens.fontSize.label,
                                color: tokens.semantic.textPrimary,
                                whiteSpace: 'nowrap',
                            }}>
                                {environment.icon} {environment.name}
                            </span>
                            <div style={{
                                width: '1px', height: '20px',
                                background: 'rgba(108, 63, 164, 0.18)',
                            }} />
                        </>
                    )}
                    <div style={{
                        display: 'flex', alignItems: 'center',
                        gap: isCompact ? '5px' : '8px',
                        flexWrap: 'wrap', justifyContent: 'center',
                    }}>
                        {Array.from({ length: totalWords }).map((_, i) => {
                            const isFilled = i < foundCount;
                            const isJustFilled = i === foundCount - 1 && justFoundWord;
                            return (
                                <div key={i} style={{
                                    width: isCompact ? '11px' : '15px',
                                    height: isCompact ? '11px' : '15px',
                                    borderRadius: '50%',
                                    background: isFilled
                                        ? environment.accentColor
                                        : 'rgba(108, 63, 164, 0.12)',
                                    border: `2px solid ${isFilled
                                        ? environment.accentColor
                                        : 'rgba(108, 63, 164, 0.20)'}`,
                                    boxShadow: isFilled ? `0 0 10px ${environment.accentColor}88` : 'none',
                                    transition: 'all 0.4s ease',
                                    transform: isJustFilled ? 'scale(1.3)' : 'scale(1)',
                                    animation: isJustFilled ? 'dotPop 0.6s ease' : 'none',
                                }} />
                            );
                        })}
                    </div>
                    <span style={{
                        fontFamily: tokens.fontFamily.heading,
                        fontWeight: tokens.fontWeight.bold,
                        fontSize: tokens.fontSize.label,
                        color: tokens.semantic.textSecondary,
                    }}>
                        {foundCount}<span style={{ color: tokens.semantic.textMuted }}>/{totalWords}</span>
                    </span>
                </KidPanel>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                SIDE PANEL - Word List (Desktop: right side, Mobile: bottom)
            ═══════════════════════════════════════════════════════════════ */}
            <WordPanel
                words={words}
                justFoundWord={justFoundWord}
                hintWordIndex={hintWordIndex}
                hintPhase={hintPhase}
                isMobile={isMobile || isTabletSmall}
                accentColor={environment.accentColor}
                isCompact={isCompact}
            />

            {/* Canvas for grid rendering */}
            <canvas
                ref={canvasRef}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    zIndex: 10
                }}
            />

            {/* ONBOARDING — Kid-UI cream card, animated in/out via existing keyframes */}
            {showOnboarding && (
                <div style={{
                    position: 'fixed',
                    top: isCompact ? '110px' : '150px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: tokens.zIndex.modal,
                    pointerEvents: 'none',
                    animation: 'fadeInOut 3s ease-in-out',
                    maxWidth: isCompact ? 'calc(100% - 32px)' : '460px',
                }}>
                    <KidPanel size="md" tone="white" style={{
                        display: 'flex', alignItems: 'center',
                        gap: tokens.spacing.lg,
                    }}>
                        <span aria-hidden style={{ fontSize: isCompact ? '1.8rem' : '2.4rem' }}>🤏</span>
                        <div>
                            <div style={{
                                fontFamily: tokens.fontFamily.heading,
                                fontWeight: tokens.fontWeight.bold,
                                fontSize: isCompact ? tokens.fontSize.label : tokens.fontSize.button,
                                color: tokens.semantic.textPrimary,
                                marginBottom: tokens.spacing.xs,
                            }}>
                                {isCompact ? 'Pinch and drag' : 'Pinch and drag to find a word'}
                            </div>
                            <div style={{
                                fontFamily: tokens.fontFamily.body,
                                fontSize: tokens.fontSize.caption,
                                color: tokens.semantic.textSecondary,
                            }}>
                                Trace from start to end
                            </div>
                        </div>
                    </KidPanel>
                </div>
            )}

            {/* BOTTOM INSTRUCTION — KidObjectiveCard with state-based icon */}
            <div style={{
                position: 'fixed',
                bottom: (isMobile || isTabletSmall) ? '150px' : '32px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: tokens.zIndex.hud,
                pointerEvents: 'none',
                maxWidth: isCompact ? 'calc(100% - 24px)' : 'none',
            }}>
                <KidObjectiveCard
                    icon={<span>{instruction.icon}</span>}
                    animate={instructionState === 'idle'}
                    style={{
                        border: instructionState === 'success'
                            ? `2px solid ${environment.accentColor}`
                            : `2px solid ${tokens.semantic.borderPanel}`,
                        boxShadow: instructionState === 'success'
                            ? `0 0 28px ${environment.accentColor}66, ${tokens.shadow.float}`
                            : tokens.shadow.float,
                    }}
                >
                    {instruction.text}
                </KidObjectiveCard>
            </div>

            {/* LEVEL COMPLETE — Kid-UI overlay with badge + bright text */}
            {showLevelComplete && (
                <div style={{
                    position: 'fixed', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: tokens.zIndex.modal,
                    background: 'rgba(190, 235, 255, 0.55)',
                    animation: 'fadeIn 0.4s ease',
                    padding: isCompact ? tokens.spacing.lg : tokens.spacing.xl,
                }}>
                    <KidPanel size="lg" tone="white" style={{
                        textAlign: 'center',
                        maxWidth: isCompact ? '92%' : '500px',
                        animation: 'levelCompletePop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}>
                        <div style={{
                            display: 'flex', justifyContent: 'center',
                            marginBottom: tokens.spacing.lg,
                        }}>
                            <KidBadge shape="star" tone="sunshine" size="lg" animateIn />
                        </div>
                        <div style={{
                            fontFamily: tokens.fontFamily.display,
                            fontWeight: tokens.fontWeight.bold,
                            fontSize: 'clamp(1.7rem, 5vw, 2.4rem)',
                            color: tokens.semantic.primary,
                            marginBottom: tokens.spacing.md,
                            letterSpacing: tokens.letterSpacing.tight,
                        }}>
                            Great Job!
                        </div>
                        <div style={{
                            fontFamily: tokens.fontFamily.body,
                            fontSize: 'clamp(1rem, 2.4vw, 1.2rem)',
                            color: tokens.semantic.textPrimary,
                        }}>
                            {chapter < 6 ? 'Get ready for the next level!' : 'You completed all levels!'}
                        </div>
                    </KidPanel>
                </div>
            )}

            {/* Settings Modal */}
            {showSettings && onCloseSettings && (
                <SettingsModal
                    settings={settings}
                    onSettingsChange={handleSettingsChange}
                    onClose={onCloseSettings}
                />
            )}

            {/* CSS Animations */}
            <style>{`
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
                    15% { opacity: 1; transform: translateX(-50%) translateY(0); }
                    85% { opacity: 1; transform: translateX(-50%) translateY(0); }
                    100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes dotPop {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.5); }
                    100% { transform: scale(1); }
                }
                
                @keyframes levelCompletePop {
                    0% { transform: scale(0); opacity: 0; }
                    60% { transform: scale(1.1); }
                    100% { transform: scale(1); opacity: 1; }
                }
                
                @keyframes starGlow {
                    0%, 100% { filter: drop-shadow(0 0 20px #FFD700); }
                    50% { filter: drop-shadow(0 0 40px #FFD700); }
                }
                
                @keyframes wordPillPop {
                    0% { transform: scale(1); }
                    30% { transform: scale(1.08); }
                    100% { transform: scale(1); }
                }
                
                @keyframes softPulse {
                    0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(255, 230, 109, 0.4); }
                    50% { opacity: 0.9; box-shadow: 0 0 20px 5px rgba(255, 230, 109, 0.3); }
                }
            `}</style>
        </>
    );
};

/**
 * Word Panel Component - Shows words to find with visual feedback
 */
interface WordPanelProps {
    words: Word[];
    justFoundWord: string | null;
    hintWordIndex: number | null;
    hintPhase: 0 | 1 | 2 | 3;
    isMobile: boolean;
    accentColor: string;
    isCompact?: boolean;
}

const WordPanel = ({ words, justFoundWord, hintWordIndex, hintPhase, isMobile, accentColor, isCompact = false }: WordPanelProps) => {
    // Kid-UI cream card with bright shadow. Mobile: bottom sheet shape;
    // desktop: floating side panel.
    const containerStyle: React.CSSProperties = isMobile
        ? {
            position: 'fixed',
            bottom: 0, left: 0, right: 0,
            zIndex: tokens.zIndex.hud,
            background: tokens.semantic.bgPanel,
            borderTop: `2px solid ${tokens.semantic.borderPanel}`,
            borderRadius: isCompact ? '24px 24px 0 0' : '32px 32px 0 0',
            padding: isCompact ? tokens.spacing.md : tokens.spacing.xl,
            maxHeight: isCompact ? '140px' : '190px',
            paddingBottom: 'max(env(safe-area-inset-bottom, 12px), 12px)',
            boxShadow: '0 -8px 28px rgba(108, 63, 164, 0.14)',
        }
        : {
            position: 'fixed',
            right: tokens.spacing.xl, top: '50%',
            transform: 'translateY(-50%)',
            zIndex: tokens.zIndex.hud,
            background: tokens.semantic.bgPanel,
            border: `2px solid ${tokens.semantic.borderPanel}`,
            borderRadius: tokens.radius.xxl,
            padding: tokens.spacing.xl,
            minWidth: '230px', maxWidth: '270px',
            boxShadow: tokens.shadow.float,
        };

    return (
        <div style={containerStyle}>
            <div style={{
                fontFamily: tokens.fontFamily.heading,
                fontWeight: tokens.fontWeight.bold,
                fontSize: isCompact ? tokens.fontSize.label : tokens.fontSize.button,
                color: tokens.semantic.primary,
                marginBottom: isCompact ? tokens.spacing.md : tokens.spacing.lg,
                display: 'flex', alignItems: 'center', gap: tokens.spacing.sm,
            }}>
                <span aria-hidden>📝</span>
                <span>{isCompact ? 'Find' : 'Find these words'}</span>
            </div>

            {/* Word Pills - Responsive */}
            <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'row' : 'column',
                flexWrap: isMobile ? 'wrap' : 'nowrap',
                gap: isCompact ? '6px' : '10px'
            }}>
                {words.map((word, index) => {
                    const isFound = word.found;
                    const isJustFound = justFoundWord === word.text;
                    const isHinted = hintWordIndex === index && hintPhase > 0;
                    const wordIcon = getWordIcon(word.text);

                    return (
                        <div
                            key={word.text}
                            style={{
                                padding: isCompact ? '7px 12px' : isMobile ? '11px 16px' : '13px 18px',
                                borderRadius: isCompact ? tokens.radius.md : tokens.radius.lg,
                                background: isFound
                                    ? `linear-gradient(135deg, ${accentColor}26, ${accentColor}40)`
                                    : isHinted
                                        ? 'rgba(255, 216, 77, 0.22)'
                                        : '#F4FAFF',
                                border: isFound
                                    ? `2px solid ${accentColor}`
                                    : isHinted
                                        ? `2px solid ${tokens.colors.sunshine}`
                                        : `2px solid ${tokens.semantic.borderPanel}`,
                                display: 'flex', alignItems: 'center',
                                gap: isCompact ? tokens.spacing.xs : tokens.spacing.sm,
                                transition: 'all 0.3s ease',
                                animation: isJustFound
                                    ? 'wordPillPop 0.5s ease'
                                    : isHinted
                                        ? 'softPulse 2s ease infinite'
                                        : 'none',
                                boxShadow: isFound
                                    ? `0 0 18px ${accentColor}55, 0 2px 6px rgba(108,63,164,0.10)`
                                    : '0 2px 4px rgba(108,63,164,0.06)',
                            }}
                        >
                            <span aria-hidden style={{
                                fontSize: isCompact ? '0.9rem' : '1.2rem',
                                opacity: isFound ? 1 : 0.85,
                            }}>
                                {isFound ? '✓' : wordIcon}
                            </span>
                            <span style={{
                                fontFamily: tokens.fontFamily.heading,
                                fontSize: isCompact ? '0.78rem' : isMobile ? '0.95rem' : '1.05rem',
                                fontWeight: tokens.fontWeight.bold,
                                color: isFound
                                    ? accentColor
                                    : isHinted
                                        ? tokens.semantic.textPrimary
                                        : tokens.semantic.textPrimary,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                textDecoration: isFound ? 'line-through' : 'none',
                                textDecorationThickness: isFound ? '2px' : undefined,
                            }}>
                                {word.text}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

/**
 * Settings Modal Component
 */
interface SettingsModalProps {
    settings: WordSearchSettings;
    onSettingsChange: (settings: WordSearchSettings) => void;
    onClose: () => void;
}

const SettingsModal = ({ settings, onSettingsChange, onClose }: SettingsModalProps) => {
    return (
        <div
            style={{
                position: 'fixed', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: tokens.zIndex.modal,
                background: 'rgba(190, 235, 255, 0.55)',
                padding: tokens.spacing.xl,
            }}
            onClick={onClose}
        >
            <KidPanel
                size="lg"
                tone="white"
                style={{ maxWidth: '500px', width: '90%' }}
                onClick={(e?: React.MouseEvent) => e?.stopPropagation()}
            >
                <h2 style={{
                    margin: `0 0 ${tokens.spacing.xl}`,
                    fontFamily: tokens.fontFamily.display,
                    fontWeight: tokens.fontWeight.bold,
                    fontSize: 'clamp(1.4rem, 4vw, 1.8rem)',
                    color: tokens.semantic.primary,
                    textAlign: 'center',
                    letterSpacing: tokens.letterSpacing.tight,
                }}>
                    ⚙️ Settings
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg }}>
                    {/* Difficulty */}
                    <div>
                        <label style={{
                            display: 'block',
                            marginBottom: tokens.spacing.sm,
                            fontFamily: tokens.fontFamily.heading,
                            fontWeight: tokens.fontWeight.bold,
                            fontSize: tokens.fontSize.label,
                            color: tokens.semantic.textPrimary,
                        }}>
                            Difficulty
                        </label>
                        <div style={{ display: 'flex', gap: tokens.spacing.md }}>
                            {(['easy', 'standard'] as Difficulty[]).map((diff) => {
                                const active = settings.difficulty === diff;
                                return (
                                    <KidButton
                                        key={diff}
                                        variant={active ? 'primary' : 'secondary'}
                                        size="md"
                                        fullWidth
                                        onClick={() => onSettingsChange({ ...settings, difficulty: diff })}
                                    >
                                        {diff === 'easy' ? '🌱 Easy' : '🌿 Standard'}
                                    </KidButton>
                                );
                            })}
                        </div>
                    </div>

                    {/* Sound toggle */}
                    <SettingsToggleRow
                        label="🔊 Sound Effects"
                        active={settings.sound}
                        onToggle={() => onSettingsChange({ ...settings, sound: !settings.sound })}
                    />

                    {/* Reduce Motion toggle */}
                    <SettingsToggleRow
                        label="✨ Reduce Motion"
                        active={settings.reduceMotion}
                        onToggle={() => onSettingsChange({ ...settings, reduceMotion: !settings.reduceMotion })}
                    />

                    {/* Close button */}
                    <KidButton variant="primary" size="md" fullWidth onClick={onClose}>
                        Done
                    </KidButton>
                </div>
            </KidPanel>
        </div>
    );
};

/**
 * Settings row with a label + toggle switch — styled to bright Kid-UI.
 */
const SettingsToggleRow = ({
    label, active, onToggle,
}: {
    label: string; active: boolean; onToggle: () => void;
}) => (
    <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: tokens.spacing.md,
        background: tokens.semantic.bgPanelTinted,
        borderRadius: tokens.radius.lg,
        border: `1.5px solid ${tokens.semantic.borderPanel}`,
    }}>
        <label style={{
            fontFamily: tokens.fontFamily.heading,
            fontWeight: tokens.fontWeight.bold,
            fontSize: tokens.fontSize.label,
            color: tokens.semantic.textPrimary,
        }}>
            {label}
        </label>
        <button
            onClick={onToggle}
            aria-pressed={active}
            style={{
                width: '52px',
                height: '30px',
                borderRadius: '15px',
                background: active ? tokens.semantic.success : tokens.colors.softGrey,
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: `background ${tokens.motion.duration.quick} ${tokens.motion.ease.standard}`,
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.10)',
            }}
        >
            <div style={{
                position: 'absolute',
                top: '3px',
                left: active ? '25px' : '3px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: '#FFFFFF',
                transition: `left ${tokens.motion.duration.quick} ${tokens.motion.ease.bounce}`,
                boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
            }} />
        </button>
    </div>
);

/**
 * Get tile at point (helper)
 */
function getTileAtPoint(grid: WordSearchState['grid'], point: { x: number; y: number }): { id: string } | null {
    if (!grid) return null;

    for (const row of grid.tiles) {
        for (const tile of row) {
            if (
                point.x >= tile.x &&
                point.x < tile.x + tile.width &&
                point.y >= tile.y &&
                point.y < tile.y + tile.height
            ) {
                return { id: tile.id };
            }
        }
    }
    return null;
}

// Export settings type for Adult Gate
export type { WordSearchSettings };
