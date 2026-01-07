import { useState, useEffect } from 'react';
import {
    getCurrentRound,
    getScore,
    getTotalObjects,
    isRoundComplete,
    getCelebrationTime,
    nextRound,
    resetAllRounds
} from './sortAndPlaceLogic';
import { Celebration } from '../../../components/Celebration';

// Responsive hook
const useResponsiveLayout = () => {
    const [layout, setLayout] = useState(() => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        return {
            isMobile: w <= 480,
            isTabletSmall: w > 480 && w <= 768,
            isTablet: w > 768 && w <= 1024,
            isLandscapePhone: w > h && h <= 500,
            screenWidth: w
        };
    });

    useEffect(() => {
        const handleResize = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            setLayout({
                isMobile: w <= 480,
                isTabletSmall: w > 480 && w <= 768,
                isTablet: w > 768 && w <= 1024,
                isLandscapePhone: w > h && h <= 500,
                screenWidth: w
            });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return layout;
};

export const SortAndPlaceMode = () => {
    const [round, setRound] = useState<'color' | 'size' | 'category'>('color');
    const [score, setScore] = useState(0);
    const [total, setTotal] = useState(6);
    const [showCelebration, setShowCelebration] = useState(false);
    const [roundNumber, setRoundNumber] = useState(1);
    
    const layout = useResponsiveLayout();
    const { isMobile, isTabletSmall, isLandscapePhone } = layout;
    const isCompact = isMobile || isTabletSmall || isLandscapePhone;

    useEffect(() => {
        // Reset everything when component mounts to ensure fresh start
        resetAllRounds();
        
        const interval = setInterval(() => {
            setRound(getCurrentRound());
            setScore(getScore());
            setTotal(getTotalObjects());
            
            if (isRoundComplete() && getCelebrationTime() > 0) {
                setShowCelebration(true);
                setTimeout(() => {
                    setShowCelebration(false);
                    if (nextRound()) {
                        setRoundNumber(prev => prev + 1);
                    } else {
                        // All rounds complete - reset to start fresh cycle
                        setRoundNumber(1);
                        resetAllRounds();
                        // Force update round state after reset
                        setRound(getCurrentRound());
                    }
                }, 2500);
            }
        }, 100);

        return () => clearInterval(interval);
    }, []);

    const roundLabels = {
        color: { 
            title: 'Sort by Color', 
            icon: '🎨', 
            instruction: 'Pinch to grab! Put red things in the red box, blue things in the blue box!',
            gradient: 'linear-gradient(135deg, #FF6B6B, #4ECDC4)'
        },
        size: { 
            title: 'Sort by Size', 
            icon: '📦', 
            instruction: 'Pinch to grab! Put big things in the big box, small things in the small box!',
            gradient: 'linear-gradient(135deg, #FFD700, #87CEEB)'
        },
        category: { 
            title: 'Sort by Type', 
            icon: '🗂️', 
            instruction: 'Pinch to grab! Put food in the food box, toys in the toy box!',
            gradient: 'linear-gradient(135deg, #FF6B6B, #4ECDC4)'
        }
    };

    const label = roundLabels[round];
    const progress = total > 0 ? score / total : 0;
    
    // Responsive sizing
    const hudSpacing = isCompact ? '12px' : '24px';
    const hudPadding = isCompact ? '12px 16px' : '20px 28px';
    const hudRadius = isCompact ? '16px' : '24px';

    return (
        <>
            {/* Top Left - Enhanced Mode indicator - Responsive */}
            <div style={{
                position: 'absolute',
                top: hudSpacing,
                left: hudSpacing,
                zIndex: 20,
                maxWidth: isCompact ? 'calc(50% - 16px)' : 'none'
            }}>
                <div style={{
                    background: 'rgba(15, 12, 41, 0.85)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: hudRadius,
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    padding: hudPadding,
                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)',
                    minWidth: isCompact ? 'auto' : '280px'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: isCompact ? '8px' : '14px',
                        marginBottom: isCompact ? '8px' : '16px'
                    }}>
                        <span style={{ 
                            fontSize: isCompact ? '1.3rem' : '2rem',
                            filter: 'drop-shadow(0 0 10px rgba(255, 255, 255, 0.5))'
                        }}>
                            {label.icon}
                        </span>
                        <span style={{
                            fontSize: isCompact ? '0.95rem' : '1.3rem',
                            fontWeight: 700,
                            background: label.gradient,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            textShadow: '0 0 20px rgba(255, 255, 255, 0.3)'
                        }}>
                            {isCompact ? 'Sort' : 'Sort and Place'}
                        </span>
                    </div>
                    
                    <div style={{
                        fontSize: isCompact ? '0.8rem' : '1rem',
                        color: 'rgba(255,255,255,0.8)',
                        marginBottom: isCompact ? '6px' : '12px',
                        fontWeight: 500
                    }}>
                        Round {roundNumber}/3
                    </div>
                    
                    <div style={{
                        fontSize: isCompact ? '0.85rem' : '0.95rem',
                        color: 'rgba(255,255,255,0.6)',
                        marginBottom: isCompact ? '6px' : '12px'
                    }}>
                        <strong style={{ 
                            color: '#00F5D4',
                            fontSize: isCompact ? '1rem' : '1.1rem'
                        }}>
                            {score}
                        </strong> / {total}
                    </div>

                    {/* Progress bar */}
                    <div style={{
                        width: '100%',
                        height: isCompact ? '6px' : '8px',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        marginTop: isCompact ? '6px' : '12px'
                    }}>
                        <div style={{
                            width: `${progress * 100}%`,
                            height: '100%',
                            background: label.gradient,
                            borderRadius: '4px',
                            transition: 'width 0.3s ease',
                            boxShadow: `0 0 15px ${progress === 1 ? '#00F5D4' : '#4ECDC4'}88`
                        }} />
                    </div>
                </div>
            </div>

            {/* Enhanced Instruction Banner - Responsive */}
            <div style={{
                position: 'absolute',
                top: hudSpacing,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 20,
                pointerEvents: 'none',
                animation: 'float 3s ease-in-out infinite',
                maxWidth: isCompact ? 'calc(100% - 180px)' : 'none'
            }}>
                <div style={{
                    background: 'linear-gradient(135deg, rgba(0, 245, 212, 0.2), rgba(79, 172, 254, 0.2))',
                    border: '2px solid rgba(0, 245, 212, 0.5)',
                    borderRadius: isCompact ? '12px' : '16px',
                    padding: isCompact ? '10px 16px' : '16px 32px',
                    color: '#00f5d4',
                    fontSize: isCompact ? '0.85rem' : '1.2rem',
                    textAlign: 'center',
                    fontWeight: 600,
                    boxShadow: '0 8px 32px rgba(0, 245, 212, 0.3)',
                    backdropFilter: 'blur(10px)'
                }}>
                    👆 {isCompact ? label.title : label.instruction}
                </div>
            </div>

            {/* Celebration */}
            <Celebration
                show={showCelebration}
                message={roundNumber === 3 ? "All Rounds Complete!" : "Round Complete!"}
                subMessage={roundNumber === 3 ? "🎉 Amazing work! 🎉" : "Great job!"}
                icon="🎉"
            />

            {/* Add CSS animation */}
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateX(-50%) translateY(0px); }
                    50% { transform: translateX(-50%) translateY(-10px); }
                }
            `}</style>
        </>
    );
};
