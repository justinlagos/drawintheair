import { useState, useCallback, useEffect } from 'react';
import { TrackingLayer, type TrackingFrameData } from './features/tracking/TrackingLayer';
import { FreePaintMode } from './features/modes/FreePaintMode';
import { freePaintLogic } from './features/modes/freePaintLogic';
import { PreWritingMode } from './features/modes/PreWritingMode';
import { preWritingLogic } from './features/modes/preWriting/preWritingLogic';
import { BubbleCalibration } from './features/modes/calibration/BubbleCalibration';
import { bubbleCalibrationLogic } from './features/modes/calibration/bubbleCalibrationLogic';
import { SortAndPlaceMode } from './features/modes/sortAndPlace/SortAndPlaceMode';
import { sortAndPlaceLogic } from './features/modes/sortAndPlace/sortAndPlaceLogic';
import { WordSearchMode } from './features/modes/wordSearch/WordSearchMode';
import { wordSearchLogic } from './features/modes/wordSearch/wordSearchLogic';
import { WaveToWake } from './features/onboarding/WaveToWake';
import { ModeSelectionMenu, type GameMode } from './features/menu/ModeSelectionMenu';
import { AdultGate } from './features/safety/AdultGate';
import { MagicCursor } from './components/MagicCursor';
import { PerfOverlay } from './components/PerfOverlay';
import { drawingEngine, PenState } from './core/drawingEngine';
import { perf } from './core/perf';
import './App.css';

type AppState = 'onboarding' | 'menu' | 'game';

// Debug: Allow URL params to skip to specific screens
const getInitialState = (): { appState: AppState; gameMode: GameMode } => {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const screen = params.get('screen');
  const mode = params.get('mode') as GameMode;

  // If coming from /play or /onboarding, start at onboarding
  if (path === '/play' || path === '/onboarding') {
    return { appState: 'onboarding', gameMode: 'free' };
  }

  if (screen === 'menu') return { appState: 'menu', gameMode: 'free' };
  if (screen === 'game') {
    return {
      appState: 'game',
      gameMode: (mode === 'free' || mode === 'pre-writing' || mode === 'calibration' || mode === 'sort-and-place' || mode === 'word-search') ? mode : 'free'
    };
  }
  return { appState: 'onboarding', gameMode: 'free' };
};

function App() {
  // Version marker - v2.0 with all updates
  if (typeof window !== 'undefined') {
    (window as any).__DRAW_IN_AIR_VERSION__ = '2.0.0-updated';
    console.log('🎨 Draw in the Air v2.0.0 - Updated version loaded');
  }

  const [appState, setAppState] = useState<AppState>(() => getInitialState().appState);
  const [gameMode, setGameMode] = useState<GameMode>(() => getInitialState().gameMode);

  const handleWake = useCallback(() => {
    setAppState('menu');
  }, []);

  const handleModeSelect = useCallback((mode: GameMode) => {
    setGameMode(mode);
    setAppState('game');
    // Clear any previous drawings when starting fresh
    if (mode === 'free') {
      drawingEngine.clear();
    }
  }, []);

  const handleExitToMenu = useCallback(() => {
    setAppState('menu');
    drawingEngine.clear();
  }, []);

  const handleCalibrationComplete = useCallback(() => {
    // After calibration, go to menu to pick another mode
    setAppState('menu');
  }, []);

  const [wordSearchSettingsOpen, setWordSearchSettingsOpen] = useState(false);
  const handleWordSearchSettings = useCallback(() => {
    setWordSearchSettingsOpen(true);
  }, []);

  // Determine which logic to use based on current mode
  const getActiveLogic = () => {
    if (appState !== 'game') return undefined;

    switch (gameMode) {
      case 'free':
        return freePaintLogic;
      case 'pre-writing':
        return preWritingLogic;
      case 'calibration':
        return bubbleCalibrationLogic;
      case 'sort-and-place':
        return sortAndPlaceLogic;
      case 'word-search':
        return wordSearchLogic;
      default:
        return undefined;
    }
  };

  const activeLogic = getActiveLogic();

  // Apply performance tier class to body for CSS styling
  useEffect(() => {
    const updatePerfClass = () => {
      const config = perf.getConfig();
      document.body.className = document.body.className
        .replace(/\bperf-tier-(low|medium|high)\b/g, '')
        .trim();
      document.body.classList.add(`perf-tier-${config.tier}`);
      if (!config.enableBackdropBlur) {
        document.body.classList.add('perf-no-blur');
      } else {
        document.body.classList.remove('perf-no-blur');
      }
    };
    
    // Initial update
    updatePerfClass();
    
    // Watch for perf config changes (e.g., user override)
    const interval = setInterval(updatePerfClass, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="App">
      <PerfOverlay />
      <TrackingLayer onFrame={activeLogic}>
        {(frameData: TrackingFrameData) => {
          const { results, indexTip, confidence } = frameData;
          const hasHand = results && results.landmarks && results.landmarks.length > 0;

          // Get pen state for cursor feedback
          const penState = gameMode === 'free' && appState === 'game'
            ? drawingEngine.getPenState()
            : PenState.UP;

          return (
            <>
              {/* Magic Cursor - shows pen state */}
              <MagicCursor
                x={indexTip?.x ?? 0.5}
                y={indexTip?.y ?? 0.5}
                active={!!hasHand}
                penDown={penState === PenState.DOWN}
                confidence={confidence}
              />

              {/* State: Onboarding */}
              {appState === 'onboarding' && (
                <WaveToWake
                  trackingResults={results}
                  onWake={handleWake}
                />
              )}

              {/* State: Menu */}
              {appState === 'menu' && (
                <ModeSelectionMenu
                  onSelect={handleModeSelect}
                  trackingResults={results}
                />
              )}

              {/* State: Game */}
              {appState === 'game' && (
                <>
                  {/* Adult Gate - always visible in game mode */}
                  <AdultGate 
                    onExit={handleExitToMenu}
                    onSettings={gameMode === 'word-search' ? handleWordSearchSettings : undefined}
                  />

                  {/* Mode-specific UI */}
                  {gameMode === 'calibration' && (
                    <BubbleCalibration onComplete={handleCalibrationComplete} />
                  )}

                        {gameMode === 'free' && (
                          <FreePaintMode frameData={frameData} />
                        )}

                  {gameMode === 'pre-writing' && (
                    <PreWritingMode />
                  )}

                  {gameMode === 'sort-and-place' && (
                    <SortAndPlaceMode />
                  )}

                  {gameMode === 'word-search' && (
                    <WordSearchMode 
                      frameData={frameData}
                      showSettings={wordSearchSettingsOpen}
                      onCloseSettings={() => setWordSearchSettingsOpen(false)}
                    />
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
