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

import { useEffect, useRef, useState, useCallback } from 'react';
import type { TrackingFrameData } from '../../tracking/TrackingLayer';
import { generateGrid } from './wordSearchGenerator';
import { renderGrid } from './wordSearchRender';
import { processWordSearchFrame, createWordSearchState, type WordSearchState } from './wordSearchLogic';
import { selectWords, getWordIcon } from './wordSearchAssets';
import { WORD_COUNTS, WORD_LENGTHS } from './wordSearchConstants';
import type { WordSearchSettings, Theme, Difficulty, Chapter, Word } from './wordSearchTypes';

export interface WordSearchModeProps {
    frameData?: TrackingFrameData;
    showSettings?: boolean;
    onCloseSettings?: () => void;
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

export const WordSearchMode = ({ frameData, showSettings = false, onCloseSettings }: WordSearchModeProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const stateRef = useRef<WordSearchState>(createWordSearchState(DEFAULT_SETTINGS));
    const animationFrameRef = useRef<number | undefined>(undefined);
    
    const [settings, setSettings] = useState<WordSearchSettings>(DEFAULT_SETTINGS);
    const [chapter, setChapter] = useState<Chapter>(1);
    const [hintPhase, setHintPhase] = useState<0 | 1 | 2 | 3>(0);
    const [hintWordIndex, setHintWordIndex] = useState<number | null>(null);
    const [hintTileIds, setHintTileIds] = useState<string[]>([]);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 900);
    const [showOnboarding, setShowOnboarding] = useState(true);
    const [instructionState, setInstructionState] = useState<'idle' | 'hint' | 'selecting' | 'success' | 'levelComplete'>('idle');
    const [showLevelComplete, setShowLevelComplete] = useState(false);
    const [justFoundWord, setJustFoundWord] = useState<string | null>(null);
    const [hoverTileId, setHoverTileId] = useState<string | null>(null);
    
    // Force re-render for word list updates
    const [, forceUpdate] = useState({});
    
    // Detect mobile
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 900);
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
        
        // Re-show onboarding briefly
        setTimeout(() => setShowOnboarding(false), 3000);
    }, [chapter, settings.difficulty]);
    
    // Process frames and render
    useEffect(() => {
        if (!stateRef.current.grid) {
            return;
        }
        
        const processAndRender = () => {
            // Process frame only if frameData exists
            if (frameData) {
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
    }, [frameData, settings.theme, hoverTileId, hintTileIds, hintPhase, chapter]);
    
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
            ═══════════════════════════════════════════════════════════════ */}
                    <div style={{
                        position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                height: '70px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 24px',
                zIndex: 50,
                pointerEvents: 'none'
            }}>
                {/* Left: Mode Name */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    pointerEvents: 'auto'
                }}>
                    <span style={{ fontSize: '1.8rem' }}>🔍</span>
                    <div>
                        <div style={{
                            fontSize: '1.3rem',
                            fontWeight: 700,
                            color: 'white',
                            lineHeight: 1.2
                        }}>
                            Word Search
                        </div>
                        <div style={{
                            fontSize: '0.85rem',
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontWeight: 500
                        }}>
                            Find the words
                        </div>
                    </div>
                </div>
                
                {/* Center: Logo (small, calm) */}
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
                
                {/* Right: Lock icon handled by AdultGate component in App.tsx */}
                <div style={{ width: '100px' }} />
            </div>
            
            {/* ═══════════════════════════════════════════════════════════════
                PROGRESS STRIP - Visual dots showing progress
            ═══════════════════════════════════════════════════════════════ */}
            <div style={{
                position: 'fixed',
                top: '75px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 40,
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                background: 'rgba(15, 12, 41, 0.8)',
                backdropFilter: 'blur(20px)',
                borderRadius: '30px',
                padding: '12px 24px',
                border: '2px solid rgba(255, 255, 255, 0.1)'
            }}>
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
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    {Array.from({ length: totalWords }).map((_, i) => {
                        const isFilled = i < foundCount;
                        const isJustFilled = i === foundCount - 1 && justFoundWord;
                        return (
                            <div
                                key={i}
                                style={{
                                    width: '14px',
                                    height: '14px',
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
                    fontSize: '0.85rem', 
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontWeight: 500
                }}>
                    {foundCount} of {totalWords}
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
                    isMobile={isMobile}
                accentColor={environment.accentColor}
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
                ONBOARDING INSTRUCTION CARD - Appears briefly on load
            ═══════════════════════════════════════════════════════════════ */}
            {showOnboarding && (
                <div style={{
                    position: 'fixed',
                    top: '140px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 100,
                    background: 'rgba(15, 12, 41, 0.95)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '20px',
                    padding: '20px 32px',
                    border: `2px solid ${environment.accentColor}`,
                    boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px ${environment.accentColor}30`,
                    animation: 'fadeInOut 3s ease-in-out',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                }}>
                    <div style={{ fontSize: '2.5rem' }}>🤏</div>
                    <div>
                        <div style={{
                            fontSize: '1.1rem',
                            fontWeight: 700,
                            color: 'white',
                            marginBottom: '4px'
                        }}>
                            Pinch and drag to find a word
                        </div>
                        <div style={{
                            fontSize: '0.9rem',
                            color: 'rgba(255, 255, 255, 0.7)'
                        }}>
                            Trace from start to end
                        </div>
                    </div>
                </div>
            )}
            
            {/* ═══════════════════════════════════════════════════════════════
                BOTTOM INSTRUCTION BAR - Always visible, dynamic copy
            ═══════════════════════════════════════════════════════════════ */}
            <div style={{
                position: 'fixed',
                bottom: isMobile ? '180px' : '32px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 40,
                pointerEvents: 'none'
            }}>
                <div style={{
                    background: instructionState === 'success' 
                        ? `linear-gradient(135deg, ${environment.accentColor}20, ${environment.accentColor}30)`
                        : 'rgba(15, 12, 41, 0.85)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '24px',
                    border: `2px solid ${instructionState === 'success' ? environment.accentColor : 'rgba(255, 255, 255, 0.15)'}`,
                    padding: '14px 28px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    boxShadow: instructionState === 'success' 
                        ? `0 0 30px ${environment.accentColor}40` 
                        : '0 8px 32px rgba(0, 0, 0, 0.4)',
                    transition: 'all 0.3s ease'
                }}>
                    <span style={{ fontSize: '1.3rem' }}>{instruction.icon}</span>
                    <span style={{
                        fontSize: '1rem',
                        fontWeight: 600,
                        color: instructionState === 'success' ? environment.accentColor : 'white'
                    }}>
                        {instruction.text}
                    </span>
                </div>
            </div>
            
            {/* ═══════════════════════════════════════════════════════════════
                LEVEL COMPLETE OVERLAY - Calm, centered reward
            ═══════════════════════════════════════════════════════════════ */}
            {showLevelComplete && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(10px)',
                    zIndex: 200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'fadeIn 0.4s ease'
                }}>
                    <div style={{
                        textAlign: 'center',
                        animation: 'levelCompletePop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}>
                        <div style={{
                            fontSize: '5rem',
                            marginBottom: '16px',
                            animation: 'starGlow 1.5s ease infinite'
                        }}>
                            ⭐
                        </div>
                        <div style={{
                            fontSize: '2.8rem',
                            fontWeight: 'bold',
                            color: '#FFD700',
                            textShadow: '0 0 30px #FFD700',
                            marginBottom: '12px'
                        }}>
                            Great Job!
                        </div>
                        <div style={{
                            fontSize: '1.3rem',
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
}

const WordPanel = ({ words, justFoundWord, hintWordIndex, hintPhase, isMobile, accentColor }: WordPanelProps) => {
    const containerStyle: React.CSSProperties = isMobile
        ? {
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 30,
            background: 'rgba(15, 12, 41, 0.95)',
            backdropFilter: 'blur(20px)',
            borderTop: '2px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '24px 24px 0 0',
            padding: '20px',
            maxHeight: '170px'
        }
        : {
            position: 'fixed',
            right: '24px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 30,
            background: 'rgba(15, 12, 41, 0.9)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            border: '2px solid rgba(255, 255, 255, 0.1)',
            padding: '24px',
            minWidth: '220px',
            maxWidth: '260px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
        };
    
    return (
        <div style={containerStyle}>
            {/* Title */}
            <div style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: 'white',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                <span>📝</span>
                <span>Find these words</span>
            </div>
            
            {/* Word Pills */}
            <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'row' : 'column',
                flexWrap: isMobile ? 'wrap' : 'nowrap',
                gap: '10px'
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
                                padding: isMobile ? '10px 16px' : '14px 18px',
                                borderRadius: '16px',
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
                                gap: '10px',
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
                                fontSize: '1.2rem',
                                opacity: isFound ? 1 : 0.5
                            }}>
                                {isFound ? '✓' : wordIcon}
                            </span>
                            
                            {/* Word text */}
                            <span style={{
                                fontSize: isMobile ? '0.95rem' : '1.05rem',
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
                        backdropFilter: 'blur(10px)',
                        zIndex: 300,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
            onClick={onClose}
                >
                    <div
                        style={{
                            background: 'rgba(30, 25, 60, 0.95)',
                            borderRadius: '24px',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            padding: '32px',
                            maxWidth: '500px',
                            width: '90%',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
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
