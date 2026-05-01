/**
 * GestureSpellingMode — React UI wrapper for the Spelling Stars mode.
 *
 * Bright Kid-UI design language:
 *   - Sky + stars + drifting letters background
 *   - KidChip for words-spelled tally
 *   - KidPanel housing the progress dots (one per letter, fills as typed)
 *   - Celebration 2.0 with stars
 *
 * Game logic untouched — visual migration only.
 */

import { useState, useEffect, useRef } from 'react';
import { Celebration } from '../../../components/Celebration';
import { GameTopBar } from '../../../components/GameTopBar';
import { SpellingStarsBackground } from './SpellingStarsBackground';
import { KidChip, KidPanel } from '../../../components/kid-ui';
import { tokens } from '../../../styles/tokens';
import {
    initGestureSpelling,
    getSpellingCurrentWord,
    getSpellingTypedSoFar,
    isSpellingWordComplete,
    getSpellingCelebrationTime,
    getSpellingWordsSpelled,
    advanceToNextWord,
} from './gestureSpellingLogic';

interface GestureSpellingModeProps {
    onExit?: () => void;
}

export const GestureSpellingMode = ({ onExit }: GestureSpellingModeProps) => {
    const [wordsSpelled, setWordsSpelled] = useState(0);
    const [typedSoFar, setTypedSoFar] = useState<string[]>([]);
    const [wordLength, setWordLength] = useState(3);
    const [showCelebration, setShowCelebration] = useState(false);
    const wordCompletedRef = useRef(false);
    const [wordEmoji, setWordEmoji] = useState('');

    useEffect(() => { initGestureSpelling(); }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            const cw = getSpellingCurrentWord();
            setWordEmoji(cw.emoji);
            setWordLength(cw.word.length);
            setTypedSoFar([...getSpellingTypedSoFar()]);
            setWordsSpelled(getSpellingWordsSpelled());

            const celebTime = getSpellingCelebrationTime();
            if (isSpellingWordComplete() && celebTime > 0 && !wordCompletedRef.current) {
                wordCompletedRef.current = true;
                setShowCelebration(true);
            }
        }, 100);
        return () => clearInterval(interval);
    }, []);

    const handleCelebrationDone = () => {
        wordCompletedRef.current = false;
        setShowCelebration(false);
        advanceToNextWord();
    };

    return (
        <div style={{
            position: 'relative', width: '100%', height: '100%', overflow: 'hidden',
            fontFamily: tokens.fontFamily.body,
        }}>
            <SpellingStarsBackground />

            <GameTopBar onBack={onExit ?? (() => { })} />

            {/* TOP-LEFT: Mode chip */}
            <div style={{
                position: 'absolute', top: '100px', left: tokens.spacing.xxl,
                zIndex: tokens.zIndex.hud, pointerEvents: 'none',
            }}>
                <KidChip variant="neutral" size="md" icon={<span>✨</span>}>
                    Spelling Stars
                </KidChip>
            </div>

            {/* TOP-RIGHT: Words spelled tally */}
            <div style={{
                position: 'absolute', top: '100px', right: tokens.spacing.xxl,
                zIndex: tokens.zIndex.hud, pointerEvents: 'none',
            }}>
                <KidChip variant="reward" size="md"
                         icon={<span style={{ color: tokens.colors.sunshine }}>★</span>}>
                    {wordsSpelled}<span style={{
                        color: tokens.semantic.textSecondary,
                        fontWeight: tokens.fontWeight.medium,
                        marginLeft: 4,
                    }}>spelled</span>
                </KidChip>
            </div>

            {/* BOTTOM-CENTER: Progress dots in a soft white panel */}
            <div style={{
                position: 'absolute', bottom: tokens.spacing.xl, left: '50%',
                transform: 'translateX(-50%)',
                zIndex: tokens.zIndex.hud, pointerEvents: 'none',
            }}>
                <KidPanel size="sm" tone="white" style={{
                    padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
                    display: 'flex', alignItems: 'center', gap: tokens.spacing.md,
                }}>
                    {Array.from({ length: wordLength }).map((_, i) => {
                        const filled = i < typedSoFar.length;
                        return (
                            <div key={i} style={{
                                width: '22px', height: '22px',
                                borderRadius: '50%',
                                background: filled ? tokens.semantic.success : 'rgba(108, 63, 164, 0.10)',
                                border: filled
                                    ? `3px solid ${tokens.colors.meadowGreen}`
                                    : `2px solid rgba(108, 63, 164, 0.20)`,
                                boxShadow: filled
                                    ? `0 0 14px rgba(126, 217, 87, 0.6), 0 2px 6px rgba(0,0,0,0.10)`
                                    : `0 2px 4px rgba(108, 63, 164, 0.10)`,
                                transform: filled ? 'scale(1.18)' : 'scale(1)',
                                transition: `transform ${tokens.motion.duration.quick} ${tokens.motion.ease.bounce}`,
                            }} />
                        );
                    })}
                </KidPanel>
            </div>

            <Celebration
                show={showCelebration}
                message="You spelled it!"
                subMessage={`${wordEmoji} Well done, keep going!`}
                icon="✨"
                duration={2000}
                stars={2}
                showConfetti
                soundEffect
                onComplete={handleCelebrationDone}
            />
        </div>
    );
};
