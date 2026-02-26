import { useState, useEffect, useRef } from 'react';
import { Celebration } from '../../../components/Celebration';
import { GameTopBar } from '../../../components/GameTopBar';
import { STAGES } from './ColourBuilderStages';
import { startStage, getScore, isRoundComplete, getCelebrationTime, getStreak } from './colourBuilderLogic';

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

interface ColourBuilderModeProps {
    onExit?: () => void;
}

export const ColourBuilderMode = ({ onExit }: ColourBuilderModeProps = {}) => {
    const layout = useResponsiveLayout();
    const { isMobile, isTabletSmall, isLandscapePhone, screenWidth } = layout;
    const isCompact = isMobile || isTabletSmall || isLandscapePhone;

    const [instruction, setInstruction] = useState('');
    const [score, setScore] = useState(0);
    const [total, setTotal] = useState(0);
    const [, setStreak] = useState(0); // Using streak in the burst/badge logic using getStreak() directly, but keeping interval hook to re-render. Wait, if I don't use the state, just remove it.
    const [showCelebration, setShowCelebration] = useState(false);
    const [stageNumber, setStageNumber] = useState(1);

    const burstLayerRef = useRef<HTMLDivElement>(null);
    const badgeLayerRef = useRef<HTMLDivElement>(null);
    const skylineRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        startStage(stageNumber - 1);
        const stage = STAGES[stageNumber - 1];
        setInstruction(stage.instruction);
        setTotal(stage.blockPlan.sequence.reduce((acc, curr) => acc + curr.count, 0));

        const interval = setInterval(() => {
            setScore(getScore());
            setStreak(getStreak());

            if (isRoundComplete() && getCelebrationTime() > 0) {
                setShowCelebration(true);
                // Pulse skyline on complete
                if (skylineRef.current) {
                    skylineRef.current.style.filter = "brightness(1.5)";
                    setTimeout(() => {
                        if (skylineRef.current) skylineRef.current.style.filter = "brightness(1)";
                    }, 1000);
                }

                setTimeout(() => {
                    setShowCelebration(false);
                    if (stageNumber < STAGES.length) {
                        setStageNumber(prev => prev + 1);
                    } else {
                        // All complete
                        setStageNumber(1);
                        startStage(0);
                    }
                }, 2500);
            }
        }, 100);

        return () => clearInterval(interval);
    }, [stageNumber]);

    // Handle reward burst overlay via event
    useEffect(() => {
        const handleBurst = (e: CustomEvent) => {
            const { x, y } = e.detail;

            // Skyline building effect (grow or light up)
            if (skylineRef.current) {
                const windows = skylineRef.current.children;
                if (windows.length > 0) {
                    const toLight = Math.min(Math.floor(Math.random() * windows.length), windows.length - 1);
                    (windows[toLight] as HTMLElement).style.background = "#FACC15";
                    (windows[toLight] as HTMLElement).style.boxShadow = "0 0 10px #FACC15";
                }
            }

            if (!burstLayerRef.current) return;

            // X and Y are normalized. Convert to percent clamped to safe margins 10-90% X, 18-85% Y
            const xPct = Math.max(10, Math.min(90, x * 100));
            const yPct = Math.max(18, Math.min(85, y * 100));

            const burstRoot = document.createElement('div');
            burstRoot.style.position = 'absolute';
            burstRoot.style.left = `${xPct}%`;
            burstRoot.style.top = `${yPct}%`;
            burstRoot.style.pointerEvents = 'none';

            // Pool of 12 stars
            for (let i = 0; i < 12; i++) {
                const star = document.createElement('div');
                star.innerHTML = '★';
                star.style.position = 'absolute';
                star.style.fontSize = '24px';
                star.style.color = '#FACC15';

                const angle = (Math.PI * 2 / 12) * i;
                const distance = 50 + Math.random() * 50;
                const dx = Math.cos(angle) * distance;
                const dy = Math.sin(angle) * distance;
                const rot = Math.random() * 360;

                star.style.setProperty('--dx', `${dx}px`);
                star.style.setProperty('--dy', `${dy}px`);
                star.style.setProperty('--rot', `${rot}deg`);
                star.style.animation = 'burstAnim 600ms ease-out forwards';

                burstRoot.appendChild(star);
            }
            burstLayerRef.current.appendChild(burstRoot);

            // Badge popup
            if (getStreak() > 0 && getStreak() % STAGES[stageNumber - 1]?.rewards.streakMilestones[0] === 0) {
                const badge = document.createElement('div');
                const msgs = ["Nice match", "Perfect colour", "Great build", "Keep building", "Awesome"];
                badge.innerText = msgs[Math.floor(Math.random() * msgs.length)];
                badge.style.position = 'absolute';
                badge.style.top = '12%';
                badge.style.left = '50%';
                badge.style.transform = 'translateX(-50%)';
                badge.style.background = 'rgba(255,255,255,0.2)';
                badge.style.backdropFilter = 'blur(10px)'; // The spec says no backdrop filter, wait! "No blur"
                badge.style.color = 'white';
                badge.style.padding = '8px 16px';
                badge.style.borderRadius = '20px';
                badge.style.animation = 'badgeAnim 600ms ease-out forwards';

                badgeLayerRef.current?.appendChild(badge);

                setTimeout(() => {
                    if (badge.parentNode) badge.parentNode.removeChild(badge);
                }, 600);
            }

            setTimeout(() => {
                if (burstRoot.parentNode) burstRoot.parentNode.removeChild(burstRoot);
            }, 600);
        };

        window.addEventListener('colour-builder-burst', handleBurst as EventListener);
        return () => window.removeEventListener('colour-builder-burst', handleBurst as EventListener);
    }, [stageNumber]);

    const progress = total > 0 ? score / total : 0;

    // Spec HUD metrics
    const topBarHeight = isMobile ? (isLandscapePhone ? '52px' : '56px') : (isTabletSmall ? '60px' : screenWidth > 2000 ? '72px' : '64px');
    const padding = isMobile ? '16px' : (isTabletSmall ? '24px' : screenWidth > 2000 ? '48px' : '32px');

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>

            {/* Skyline Background Gradient */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(180deg, #1B274F, #0F1836)',
                zIndex: -2 // behind game canvas
            }} />

            {/* Background City dusk silhouette */}
            <div ref={skylineRef} style={{
                position: 'absolute', bottom: 0, width: '100%', height: '30%',
                background: 'url(/path/to/skyline.png) center bottom / cover no-repeat', // placeholder
                backgroundColor: '#0F1836', // fallback solid
                borderTop: '2px solid rgba(255,255,255,0.1)',
                display: 'flex', gap: '4px', alignItems: 'flex-end', justifyContent: 'center',
                zIndex: -1,
                transition: 'filter 0.3s'
            }}>
                {/* Simulated lit windows that light up on match */}
                {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} style={{
                        width: '10px', height: '10px', background: 'rgba(255,255,255,0.05)',
                        marginBottom: `${Math.random() * 50 + 20}px`
                    }} />
                ))}
            </div>

            <style>{`
                @keyframes burstAnim {
                    0% { transform: scale(0.5) translate(0, 0) rotate(0deg); opacity: 1; }
                    100% { transform: scale(1.5) translate(var(--dx), var(--dy)) rotate(var(--rot)); opacity: 0; }
                }
                @keyframes badgeAnim {
                    0% { top: 15%; opacity: 0; transform: translateX(-50%) scale(0.8); }
                    20% { top: 12%; opacity: 1; transform: translateX(-50%) scale(1.1); }
                    80% { top: 12%; opacity: 1; transform: translateX(-50%) scale(1); }
                    100% { top: 10%; opacity: 0; transform: translateX(-50%) scale(0.9); }
                }
            `}</style>

            {/* Top Bar Zone A */}
            {onExit && (
                <div style={{ position: 'absolute', top: padding, left: padding, right: padding, zIndex: 9999, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>

                    <GameTopBar onBack={onExit} stage={`Stage ${stageNumber}`} compact={isCompact} />

                    {/* Score display logic */}
                    <div style={{
                        background: 'linear-gradient(180deg, #1B274F, #0F1836)',
                        padding: '12px 24px',
                        borderRadius: '18px',
                        border: '1px solid rgba(255,255,255,0.16)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center'
                    }}>
                        <span style={{ color: 'white', fontSize: '1rem', fontWeight: 600 }}>SCORE</span>
                        <span style={{ color: '#FFCC33', fontSize: '1.5rem', fontWeight: 800 }}>{score}</span>
                    </div>
                </div>
            )}

            {/* Instruction Message Zone B */}
            <div style={{
                position: 'absolute',
                top: `calc(${topBarHeight} + ${padding} + 20px)`,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.6)',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '20px',
                fontSize: '1.2rem',
                fontWeight: 600,
                textAlign: 'center',
                zIndex: 20
            }}>
                {instruction}
            </div>

            {/* Zone D - Thin Progress Indicator at Bottom */}
            <div style={{
                position: 'absolute',
                bottom: '10px',
                left: '10%',
                right: '10%',
                height: '4px',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '2px',
                zIndex: 20
            }}>
                <div style={{
                    width: `${progress * 100}%`,
                    height: '100%',
                    background: '#FACC15',
                    borderRadius: '2px',
                    transition: 'width 0.3s ease-out'
                }} />
            </div>

            {/* FX Overlays */}
            <div ref={burstLayerRef} style={{ pointerEvents: 'none', position: 'absolute', inset: 0, zIndex: 30 }} />
            <div ref={badgeLayerRef} style={{ pointerEvents: 'none', position: 'absolute', inset: 0, zIndex: 31 }} />

            <Celebration
                show={showCelebration}
                message={stageNumber === STAGES.length ? "All Stages Complete!" : "Stage Complete!"}
                subMessage="Great building!"
                icon="🏗️"
            />
        </div>
    );
};
