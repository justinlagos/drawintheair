/**
 * GestureSpellingMode.tsx
 *
 * React UI wrapper for the Gesture Spelling game mode.
 * Shows word count, hint label, celebration panel.
 */

import { useState, useEffect, useRef } from 'react';
import { Celebration } from '../../../components/Celebration';
import { GameTopBar } from '../../../components/GameTopBar';
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

    useEffect(() => {
        initGestureSpelling();
    }, []);

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
            position: 'relative',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            fontFamily: "'Outfit', system-ui, sans-serif",
        }}>
            <GameTopBar
                onBack={onExit ?? (() => { })}
                stage={`Words Spelled: ${wordsSpelled}`}
            />

            {/* Progress dots */}
            <div style={{
                position: 'absolute',
                bottom: '14px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '10px',
                zIndex: 20,
                pointerEvents: 'none',
            }}>
                {Array.from({ length: wordLength }).map((_, i) => (
                    <div key={i} style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: i < typedSoFar.length ? '#00e676' : 'rgba(255,255,255,0.25)',
                        border: '2px solid ' + (i < typedSoFar.length ? '#00ff88' : 'rgba(255,255,255,0.3)'),
                        boxShadow: i < typedSoFar.length ? '0 0 10px #00e67680' : 'none',
                        transition: 'all 0.2s ease',
                        transform: i < typedSoFar.length ? 'scale(1.2)' : 'scale(1)',
                    }} />
                ))}
            </div>

            {/* Score badge */}
            <div style={{
                position: 'absolute',
                top: '64px',
                right: '20px',
                background: 'rgba(255,255,255,0.12)',
                border: '1.5px solid rgba(255,255,255,0.2)',
                borderRadius: '16px',
                padding: '8px 18px',
                textAlign: 'center',
                zIndex: 20,
                pointerEvents: 'none',
            }}>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' }}>Score</div>
                <div style={{ color: '#FFD93D', fontSize: '1.6rem', fontWeight: 900, lineHeight: 1 }}>{wordsSpelled}</div>
            </div>

            <Celebration
                show={showCelebration}
                message={`✅ You spelled it!`}
                subMessage={`${wordEmoji} Well done, keep going!`}
                icon="✍️"
                duration={2000}
                onComplete={handleCelebrationDone}
                soundEffect
            />
        </div>
    );
};
