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

// Chapter themes (environment themes)
const CHAPTER_THEMES: Record<Chapter, Theme> = {
    1: 'animals',
    2: 'nature',
    3: 'food'
};

// Chapter environment configs
const CHAPTER_ENVIRONMENTS: Record<Chapter, {
    backgroundGradient: string;
    accentColor: string;
    name: string;
    icon: string;
}> = {
    1: {
        backgroundGradient: 'linear-gradient(135deg, #1a1a3e 0%, #2d2563 50%, #1e1e4a 100%)',
        accentColor: '#4ECDC4',
        name: 'Animal Friends',
        icon: '🐾'
    },
    2: {
        backgroundGradient: 'linear-gradient(135deg, #0d2b4e 0%, #1a4d6e 50%, #0a3a5e 100%)',
        accentColor: '#27AE60',
        name: 'Nature Garden',
        icon: '🌿'
    },
    3: {
        backgroundGradient: 'linear-gradient(135deg, #3d2e1a 0%, #5a4a2d 50%, #4a3a1a 100%)',
        accentColor: '#FF9500',
        name: 'Yummy Food',
        icon: '🍎'
    }
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

                        // Auto-advance to next chapter after delay
                        setTimeout(() => {
                            setShowLevelComplete(false);
                            if (chapter < 3) {
                                setChapter((chapter + 1) as Chapter);
                            } else {
                                // All chapters complete - go back to chapter 1
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
                {/* Left: Back button + Mode Name */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: isCompact ? '8px' : '12px',
                    pointerEvents: 'auto'
                }}>
                    {onExit && (
                        <button
                            onClick={onExit}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: isCompact ? '6px 10px' : '7px 13px',
                                minHeight: '36px',
                                minWidth: '44px',
                                background: 'rgba(0,0,0,0.30)',
                                border: '1.5px solid rgba(255,255,255,0.18)',
                                borderRadius: '9999px',
                                color: 'rgba(255,255,255,0.92)',
                                cursor: 'pointer',
                                fontSize: isCompact ? '0.78rem' : '0.82rem',
                                fontWeight: 700,
                                transition: 'transform 0.12s ease',
                                touchAction: 'manipulation',
                            }}
                            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.93)'; }}
                            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                            onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.93)'; }}
                            onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                            <span style={{ fontSize: '0.8rem' }}>←</span>
                            <span>Menu</span>
                        </button>
                    )}
                    <span style={{ fontSize: isCompact ? '1.3rem' : '1.8rem' }}>🔍</span>
                    <div>
                        <div style={{
                            fontSize: isCompact ? '1rem' : '1.3rem',
                            fontWeight: 700,
                            color: 'white',
                            lineHeight: 1.2
                        }}>
                            {isCompact ? 'Words' : 'Word Search'}
                        </div>
                        {!isCompact && (
                            <div style={{
                                fontSize: '0.85rem',
                                color: 'rgba(255, 255, 255, 0.7)',
                                fontWeight: 500
                            }}>
                                Find the words
                            </div>
                        )}
                    </div>
                </div>

                {/* Center: Logo (small, calm) - hidden on mobile */}
                {!isCompact && (
                    <div style={{
                        position: 'absolute',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: '1.2rem',
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '0.5px'
                    }}>
                        DRAW IN THE AIR
                    </div>
                )}

                {/* Right: Lock icon handled by AdultGate component in App.tsx */}
                <div style={{ width: isCompact ? '50px' : '100px' }} />
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                PROGRESS STRIP - Visual dots showing progress - Responsive
            ═══════════════════════════════════════════════════════════════ */}
            <div style={{
                position: 'fixed',
                top: isCompact ? '55px' : '75px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 40,
                display: 'flex',
                alignItems: 'center',
                gap: isCompact ? '8px' : '16px',
                background: 'linear-gradient(145deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
                
                
                borderRadius: isCompact ? '20px' : '9999px',
                padding: isCompact ? '8px 14px' : '12px 24px',
                border: '1.5px solid rgba(255, 255, 255, 0.12)',
                maxWidth: isCompact ? 'calc(100% - 120px)' : 'none',
                boxShadow: '0 4px 8px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15)'
            }}>
                {!isCompact && (
                    <>
                        <span style={{
                            fontSize: '0.9rem',
                            color: 'rgba(255, 255, 255, 0.8)',
                            fontWeight: 600
                        }}>
                            {environment.icon} {environment.name}
                        </span>
                        <div style={{
                            width: '1px',
                            height: '20px',
                            background: 'rgba(255, 255, 255, 0.2)'
                        }} />
                    </>
                )}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: isCompact ? '5px' : '8px',
                    flexWrap: 'wrap',
                    justifyContent: 'center'
                }}>
                    {Array.from({ length: totalWords }).map((_, i) => {
                        const isFilled = i < foundCount;
                        const isJustFilled = i === foundCount - 1 && justFoundWord;
                        return (
                            <div
                                key={i}
                                style={{
                                    width: isCompact ? '10px' : '14px',
                                    height: isCompact ? '10px' : '14px',
                                    borderRadius: '50%',
                                    background: isFilled
                                        ? environment.accentColor
                                        : 'rgba(255, 255, 255, 0.15)',
                                    border: `2px solid ${isFilled ? environment.accentColor : 'rgba(255, 255, 255, 0.3)'}`,
                                    boxShadow: isFilled ? `0 0 12px ${environment.accentColor}` : 'none',
                                    transition: 'all 0.4s ease',
                                    transform: isJustFilled ? 'scale(1.3)' : 'scale(1)',
                                    animation: isJustFilled ? 'dotPop 0.6s ease' : 'none'
                                }}
                            />
                        );
                    })}
                </div>
                <span style={{
                    fontSize: isCompact ? '0.75rem' : '0.85rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontWeight: 500
                }}>
                    {foundCount}/{totalWords}
                </span>
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

            {/* ═══════════════════════════════════════════════════════════════
                ONBOARDING INSTRUCTION CARD - Appears briefly on load - Responsive
            ═══════════════════════════════════════════════════════════════ */}
            {showOnboarding && (
                <div style={{
                    position: 'fixed',
                    top: isCompact ? '100px' : '140px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 100,
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)',
                    
                    
                    borderRadius: '9999px',
                    padding: isCompact ? '12px 20px' : '16px 28px',
                    border: `1.5px solid ${environment.accentColor}40`,
                    boxShadow: '0 4px 8px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15)',
                    animation: 'fadeInOut 3s ease-in-out',
                    display: 'flex',
                    alignItems: 'center',
                    gap: isCompact ? '10px' : '16px',
                    maxWidth: isCompact ? 'calc(100% - 32px)' : 'none'
                }}>
                    <div style={{ fontSize: isCompact ? '1.8rem' : '2.5rem' }}>🤏</div>
                    <div>
                        <div style={{
                            fontSize: isCompact ? '0.9rem' : '1.1rem',
                            fontWeight: 700,
                            color: 'white',
                            marginBottom: '4px'
                        }}>
                            {isCompact ? 'Pinch and drag' : 'Pinch and drag to find a word'}
                        </div>
                        <div style={{
                            fontSize: isCompact ? '0.75rem' : '0.9rem',
                            color: 'rgba(255, 255, 255, 0.7)'
                        }}>
                            Trace from start to end
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                BOTTOM INSTRUCTION BAR - Always visible, dynamic copy - Responsive
            ═══════════════════════════════════════════════════════════════ */}
            <div style={{
                position: 'fixed',
                bottom: (isMobile || isTabletSmall) ? '150px' : '32px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 40,
                pointerEvents: 'none',
                maxWidth: isCompact ? 'calc(100% - 24px)' : 'none'
            }}>
                <div style={{
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
                    
                    
                    borderRadius: '9999px',
                    border: `1.5px solid ${instructionState === 'success' ? environment.accentColor + '60' : 'rgba(255, 255, 255, 0.12)'}`,
                    padding: isCompact ? '10px 20px' : '14px 28px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: isCompact ? '8px' : '12px',
                    boxShadow: instructionState === 'success'
                        ? `0 0 30px ${environment.accentColor}40`
                        : '0 8px 32px rgba(0, 0, 0, 0.4)',
                    transition: 'all 0.3s ease'
                }}>
                    <span style={{ fontSize: isCompact ? '1rem' : '1.3rem' }}>{instruction.icon}</span>
                    <span style={{
                        fontSize: isCompact ? '0.85rem' : '1rem',
                        fontWeight: 600,
                        color: instructionState === 'success' ? environment.accentColor : 'white'
                    }}>
                        {instruction.text}
                    </span>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                LEVEL COMPLETE OVERLAY - Calm, centered reward - Responsive
            ═══════════════════════════════════════════════════════════════ */}
            {showLevelComplete && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    
                    zIndex: 200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'fadeIn 0.4s ease',
                    padding: isCompact ? '16px' : '24px'
                }}>
                    <div style={{
                        textAlign: 'center',
                        animation: 'levelCompletePop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}>
                        <div style={{
                            fontSize: isCompact ? '3.5rem' : '5rem',
                            marginBottom: isCompact ? '10px' : '16px',
                            animation: 'starGlow 1.5s ease infinite'
                        }}>
                            ⭐
                        </div>
                        <div style={{
                            fontSize: isCompact ? '1.8rem' : '2.8rem',
                            fontWeight: 'bold',
                            color: '#FFD700',
                            textShadow: '0 0 30px #FFD700',
                            marginBottom: isCompact ? '8px' : '12px'
                        }}>
                            Great Job!
                        </div>
                        <div style={{
                            fontSize: isCompact ? '1rem' : '1.3rem',
                            color: 'white',
                            opacity: 0.9
                        }}>
                            {chapter < 3 ? 'Get ready for the next level!' : 'You completed all levels!'}
                        </div>
                    </div>
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
    const containerStyle: React.CSSProperties = isMobile
        ? {
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 30,
            background: 'linear-gradient(145deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
            
            
            borderTop: '1.5px solid rgba(255, 255, 255, 0.12)',
            borderRadius: isCompact ? '22px 22px 0 0' : '28px 28px 0 0',
            padding: isCompact ? '12px' : '20px',
            maxHeight: isCompact ? '130px' : '170px',
            paddingBottom: 'max(env(safe-area-inset-bottom, 12px), 12px)',
            boxShadow: '0 -4px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15)'
        }
        : {
            position: 'fixed',
            right: '24px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 30,
            background: 'linear-gradient(145deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
            
            
            borderRadius: '22px',
            border: '1.5px solid rgba(255, 255, 255, 0.12)',
            padding: '24px',
            minWidth: '220px',
            maxWidth: '260px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15)'
        };

    return (
        <div style={containerStyle}>
            {/* Title - smaller on compact */}
            <div style={{
                fontSize: isCompact ? '0.85rem' : '1rem',
                fontWeight: 700,
                color: 'white',
                marginBottom: isCompact ? '10px' : '16px',
                display: 'flex',
                alignItems: 'center',
                gap: isCompact ? '6px' : '8px'
            }}>
                <span>📝</span>
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
                                padding: isCompact
                                    ? '6px 10px'
                                    : isMobile
                                        ? '10px 16px'
                                        : '14px 18px',
                                borderRadius: isCompact ? '10px' : '16px',
                                background: isFound
                                    ? `linear-gradient(135deg, ${accentColor}20, ${accentColor}30)`
                                    : isHinted
                                        ? 'rgba(255, 230, 109, 0.15)'
                                        : 'rgba(255, 255, 255, 0.05)',
                                border: isFound
                                    ? `2px solid ${accentColor}`
                                    : isHinted
                                        ? '2px solid rgba(255, 230, 109, 0.5)'
                                        : '2px solid rgba(255, 255, 255, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: isCompact ? '6px' : '10px',
                                transition: 'all 0.3s ease',
                                animation: isJustFound
                                    ? 'wordPillPop 0.5s ease'
                                    : isHinted
                                        ? 'softPulse 2s ease infinite'
                                        : 'none',
                                boxShadow: isFound
                                    ? `0 0 20px ${accentColor}30`
                                    : 'none'
                            }}
                        >
                            {/* Icon or checkmark */}
                            <span style={{
                                fontSize: isCompact ? '0.9rem' : '1.2rem',
                                opacity: isFound ? 1 : 0.5
                            }}>
                                {isFound ? '✓' : wordIcon}
                            </span>

                            {/* Word text */}
                            <span style={{
                                fontSize: isCompact ? '0.75rem' : isMobile ? '0.95rem' : '1.05rem',
                                fontWeight: isFound ? 700 : 600,
                                color: isFound ? accentColor : 'rgba(255, 255, 255, 0.8)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
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
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.8)',
                
                zIndex: 300,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)',
                    
                    
                    borderRadius: '28px',
                    border: '1.5px solid rgba(255, 255, 255, 0.12)',
                    padding: '32px',
                    maxWidth: '500px',
                    width: '90%',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.25), 0 12px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 style={{
                    margin: '0 0 24px',
                    fontSize: '1.8rem',
                    color: 'white',
                    textAlign: 'center'
                }}>
                    ⚙️ Settings
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Difficulty */}
                    <div>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            color: 'white',
                            fontSize: '1rem',
                            fontWeight: 600
                        }}>
                            Difficulty
                        </label>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            {(['easy', 'standard'] as Difficulty[]).map(diff => (
                                <button
                                    key={diff}
                                    onClick={() => onSettingsChange({ ...settings, difficulty: diff })}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        background: settings.difficulty === diff
                                            ? 'rgba(102, 126, 234, 0.3)'
                                            : 'rgba(255, 255, 255, 0.1)',
                                        border: `2px solid ${settings.difficulty === diff ? '#667eea' : 'rgba(255, 255, 255, 0.2)'}`,
                                        borderRadius: '12px',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontSize: '0.95rem',
                                        fontWeight: 600,
                                        textTransform: 'capitalize'
                                    }}
                                >
                                    {diff === 'easy' ? '🌱 Easy' : '🌿 Standard'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sound */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '12px'
                    }}>
                        <label style={{
                            color: 'white',
                            fontSize: '1rem',
                            fontWeight: 600
                        }}>
                            🔊 Sound Effects
                        </label>
                        <button
                            onClick={() => onSettingsChange({ ...settings, sound: !settings.sound })}
                            style={{
                                width: '50px',
                                height: '28px',
                                borderRadius: '14px',
                                background: settings.sound ? '#4ECDC4' : 'rgba(255, 255, 255, 0.2)',
                                border: 'none',
                                cursor: 'pointer',
                                position: 'relative',
                                transition: 'background 0.2s'
                            }}
                        >
                            <div style={{
                                position: 'absolute',
                                top: '2px',
                                left: settings.sound ? '24px' : '2px',
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: 'white',
                                transition: 'left 0.2s'
                            }} />
                        </button>
                    </div>

                    {/* Reduce Motion */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '12px'
                    }}>
                        <label style={{
                            color: 'white',
                            fontSize: '1rem',
                            fontWeight: 600
                        }}>
                            ✨ Reduce Motion
                        </label>
                        <button
                            onClick={() => onSettingsChange({ ...settings, reduceMotion: !settings.reduceMotion })}
                            style={{
                                width: '50px',
                                height: '28px',
                                borderRadius: '14px',
                                background: settings.reduceMotion ? '#4ECDC4' : 'rgba(255, 255, 255, 0.2)',
                                border: 'none',
                                cursor: 'pointer',
                                position: 'relative',
                                transition: 'background 0.2s'
                            }}
                        >
                            <div style={{
                                position: 'absolute',
                                top: '2px',
                                left: settings.reduceMotion ? '24px' : '2px',
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: 'white',
                                transition: 'left 0.2s'
                            }} />
                        </button>
                    </div>

                    {/* Close button */}
                    <button
                        onClick={onClose}
                        style={{
                            marginTop: '8px',
                            padding: '14px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '16px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: 600
                        }}
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

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
