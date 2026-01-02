import { useState } from 'react';
import { TrackingLayer } from './features/tracking/TrackingLayer';
import { FreePaintMode } from './features/modes/FreePaintMode';
import { freePaintLogic } from './features/modes/freePaintLogic';
import { PreWritingMode } from './features/modes/PreWritingMode';
import { preWritingLogic } from './features/modes/preWriting/preWritingLogic';
import { WaveToWake } from './features/onboarding/WaveToWake';
import { MagicCursor } from './components/MagicCursor';
import { drawingEngine } from './core/drawingEngine';
import './App.css';

type AppState = 'onboarding' | 'menu' | 'game';
type GameMode = 'free' | 'pre-writing';

function App() {
  const [appState, setAppState] = useState<AppState>('onboarding');
  const [gameMode, setGameMode] = useState<GameMode>('free');

  const handleClear = () => {
    drawingEngine.clear();
  };

  const activeLogic = appState === 'game'
    ? (gameMode === 'free' ? freePaintLogic : preWritingLogic)
    : undefined;

  return (
    <div className="App">
      <TrackingLayer onFrame={activeLogic}>
        {(results: import('@mediapipe/tasks-vision').HandLandmarkerResult | null) => {
          const hasHand = results && results.landmarks && results.landmarks.length > 0;
          const tip = hasHand ? results.landmarks[0][8] : { x: 0.5, y: 0.5 };

          return (
            <>
              {/* Visuals - cursor only shows if hand detected */}
              <MagicCursor x={tip.x} y={tip.y} active={!!hasHand} />

              {/* State: Onboarding */}
              {appState === 'onboarding' && (
                <WaveToWake
                  trackingResults={results}
                  onWake={() => setAppState('game')} // Skip menu for MVP v2 step 1
                />
              )}

              {/* State: Game */}
              {appState === 'game' && (
                <>
                  {/* Mode UI */}
                  {gameMode === 'free' ? <FreePaintMode /> : <PreWritingMode />}

                  {/* Top Controls */}
                  <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 100, display: 'flex', gap: '10px' }}>
                    <button onClick={() => setGameMode('free')} className={gameMode === 'free' ? '' : 'inactive'}>Free Paint</button>
                    <button onClick={() => setGameMode('pre-writing')} className={gameMode === 'pre-writing' ? '' : 'inactive'}>Tracing</button>
                  </div>

                  {/* Free Paint Extras */}
                  {gameMode === 'free' && (
                    <div style={{ position: 'absolute', top: 120, left: 20, zIndex: 10 }}>
                      <button onClick={handleClear}>Clear Canvas</button>
                    </div>
                  )}
                </>
              )}
            </>
          );
        }}
      </TrackingLayer>
    </div>
  );
}

export default App;
