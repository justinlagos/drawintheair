/**
 * StudentGameScreen — renders the actual game during a Class Mode round.
 * Wraps the game component in TrackingLayer + ClassModeGameWrapper.
 * Reads session params from sessionStorage (set by StudentJoin).
 */

import { useState, useCallback, useMemo } from 'react';
import { TrackingLayer } from '../../features/tracking/TrackingLayer';
import { ModeBackground } from '../../components/ModeBackground';
import { MagicCursor } from '../../components/MagicCursor';
import { drawingEngine, PenState } from '../../core/drawingEngine';
import ClassModeGameWrapper from '../../features/classmode/ClassModeGameWrapper';
import type { GameModeId } from '../../features/classmode/scoreMapping';

// Import all game mode components
import { BubbleCalibration } from '../../features/modes/calibration/BubbleCalibration';
import { FreePaintMode } from '../../features/modes/FreePaintMode';
import { PreWritingMode } from '../../features/modes/PreWritingMode';
import { SortAndPlaceMode } from '../../features/modes/sortAndPlace/SortAndPlaceMode';
import { WordSearchMode } from '../../features/modes/wordSearch/WordSearchMode';
import { ColourBuilderMode } from '../../features/modes/colourBuilder/ColourBuilderMode';
import { BalloonMathMode } from '../../features/modes/balloonMath/BalloonMathMode';
import { RainbowBridgeMode } from '../../features/modes/rainbowBridge/RainbowBridgeMode';
import { GestureSpellingMode } from '../../features/modes/gestureSpelling/GestureSpellingMode';

// Import all game logic modules for TrackingLayer onFrame
import { freePaintLogic } from '../../features/modes/freePaintLogic';
import { preWritingLogic } from '../../features/modes/preWriting/preWritingLogic';
import { bubbleCalibrationLogic } from '../../features/modes/calibration/bubbleCalibrationLogic';
import { sortAndPlaceLogic } from '../../features/modes/sortAndPlace/sortAndPlaceLogic';
import { wordSearchLogic } from '../../features/modes/wordSearch/wordSearchLogic';
import { colourBuilderLogic } from '../../features/modes/colourBuilder/colourBuilderLogic';
import { balloonMathLogic } from '../../features/modes/balloonMath/balloonMathLogic';
import { rainbowBridgeLogic } from '../../features/modes/rainbowBridge/rainbowBridgeLogic';
import { gestureSpellingLogic } from '../../features/modes/gestureSpelling/gestureSpellingLogic';

import './classmode.css';

const LOGIC_MAP: Record<string, any> = {
  'calibration': bubbleCalibrationLogic,
  'free': freePaintLogic,
  'pre-writing': preWritingLogic,
  'sort-and-place': sortAndPlaceLogic,
  'word-search': wordSearchLogic,
  'colour-builder': colourBuilderLogic,
  'balloon-math': balloonMathLogic,
  'rainbow-bridge': rainbowBridgeLogic,
  'gesture-spelling': gestureSpellingLogic,
};

export default function StudentGameScreen() {
  const [roundEnded, setRoundEnded] = useState(false);
  const [earnedStars, setEarnedStars] = useState(0);

  // Read session params from sessionStorage
  const sessionId = sessionStorage.getItem('cm_session_id') || '';
  const studentId = sessionStorage.getItem('cm_student_id') || '';
  const activity = (sessionStorage.getItem('cm_activity') || 'calibration') as GameModeId;
  const round = parseInt(sessionStorage.getItem('cm_round') || '1', 10);
  const timerSeconds = parseInt(sessionStorage.getItem('cm_timer') || '90', 10);

  const activeLogic = useMemo(() => LOGIC_MAP[activity], [activity]);

  const handleRoundEnd = useCallback((stars: number) => {
    setEarnedStars(stars);
    setRoundEnded(true);
  }, []);

  const handleExit = useCallback(() => {
    // Go back to student join / waiting room
    window.history.pushState({}, '', '/join');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);

  // If round ended, show results overlay
  if (roundEnded) {
    return (
      <div className="cm-page">
        <div className="cm-student-result">
          <h2>Round Complete!</h2>
          <div className="cm-your-stars">{'⭐'.repeat(earnedStars)}</div>
          <p style={{ color: '#94a3b8', marginTop: 16 }}>Waiting for next round...</p>
          <div className="cm-waiting-spinner" style={{ marginTop: 16 }} />
          <button className="cm-btn-secondary" style={{ marginTop: 24 }} onClick={handleExit}>
            Leave Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <TrackingLayer onFrame={activeLogic}>
        {(frameRef) => (
          <>
            <ModeBackground modeId={activity} />
            <MagicCursor
              frameRef={frameRef}
              getPenDown={() => (activity === 'free'
                ? drawingEngine.getPenState() === PenState.DOWN
                : false)}
              mode={activity}
            />

            <ClassModeGameWrapper
              sessionId={sessionId}
              studentId={studentId}
              activity={activity}
              round={round}
              timerSeconds={timerSeconds}
              onRoundEnd={handleRoundEnd}
            >
              {activity === 'calibration' && (
                <BubbleCalibration onComplete={handleExit} onExit={handleExit} />
              )}
              {activity === 'free' && (
                <FreePaintMode frameRef={frameRef} onExit={handleExit} />
              )}
              {activity === 'pre-writing' && (
                <PreWritingMode onExit={handleExit} />
              )}
              {activity === 'sort-and-place' && (
                <SortAndPlaceMode onExit={handleExit} />
              )}
              {activity === 'word-search' && (
                <WordSearchMode
                  frameRef={frameRef}
                  showSettings={false}
                  onCloseSettings={() => {}}
                  onExit={handleExit}
                />
              )}
              {activity === 'colour-builder' && (
                <ColourBuilderMode onExit={handleExit} />
              )}
              {activity === 'balloon-math' && (
                <BalloonMathMode onExit={handleExit} />
              )}
              {activity === 'rainbow-bridge' && (
                <RainbowBridgeMode onExit={handleExit} />
              )}
              {activity === 'gesture-spelling' && (
                <GestureSpellingMode onExit={handleExit} />
              )}
            </ClassModeGameWrapper>
          </>
        )}
      </TrackingLayer>
    </div>
  );
}
