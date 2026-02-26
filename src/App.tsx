import { useState, useCallback, useEffect, useMemo } from 'react';
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
import { ModeBackground } from './components/ModeBackground';
import { PerfOverlay } from './components/PerfOverlay';
import { drawingEngine, PenState } from './core/drawingEngine';
import { perf } from './core/perf';
import { initToyMode } from './core/toyMode';
import { initNarrator } from './core/narrator';
import { featureFlags } from './core/featureFlags';
import { type GameMode as FeatureGameMode } from './core/featureFlags';
import { interactionStateManager } from './core/InteractionState';
import { getTrackingFlag } from './core/flags/TrackingFlags';
import type { FilterProfileMode } from './core/filters/OneEuroFilter';
import { logEvent, hasActiveSession, endSession } from './lib/pilotAnalytics';
import './App.css';

type AppState = 'onboarding' | 'menu' | 'game';

// Debug: Allow URL params to skip to specific screens
const getInitialState = (): { appState: AppState; gameMode: GameMode } => {
  const params = new URLSearchParams(window.location.search);
  const screen = params.get('screen');
  const mode = params.get('mode') as GameMode;

  // Check screen param first - allows direct access to any screen
  if (screen === 'menu') return { appState: 'menu', gameMode: 'free' };
  if (screen === 'game') {
    const validMode = (mode === 'free' || mode === 'pre-writing' || mode === 'calibration' || mode === 'sort-and-place' || mode === 'word-search') ? mode : 'free';
    return {
      appState: 'game',
      gameMode: validMode
    };
  }

  // Default to onboarding for /play or /onboarding paths
  return { appState: 'onboarding', gameMode: 'free' };
};

function App() {
  // Version marker - v2.0 with all updates
  if (typeof window !== 'undefined') {
    (window as any).__DRAW_IN_AIR_VERSION__ = '2.0.0-updated';
    console.log('🎨 Draw in the Air v2.0.0 - Updated version loaded');

    // Tracking audit log
    console.log("[TrackingAudit] Files touched:", [
      "src/core/InteractionState.ts",
      "src/core/filters/OneEuroFilter.ts",
      "src/core/tracking/DynamicResolution.ts",
      "src/features/tracking/TrackingLayer.tsx",
      "src/App.tsx",
      "src/core/perf.ts",
      "src/core/flags/TrackingFlags.ts",
      "src/components/HandGuidanceOverlay.tsx",
      "src/core/tracking/PinchLogic.ts",
      "scripts/tracking-smoke-test.ts"
    ]);
  }

  const [appState, setAppState] = useState<AppState>(() => getInitialState().appState);
  const [gameMode, setGameMode] = useState<GameMode>(() => getInitialState().gameMode);
  const [flags, setFlags] = useState(featureFlags.getFlags());

  // Subscribe to feature flag changes to ensure reactive updates
  useEffect(() => {
    const unsubscribe = featureFlags.subscribe((newFlags) => {
      setFlags(newFlags);
    });
    return unsubscribe;
  }, []);

  const handleWake = useCallback(() => {
    setAppState('menu');
    // Fire menu_opened event for pilot analytics
    if (hasActiveSession()) {
      logEvent('menu_opened');
    }
  }, []);

  const handleBackToLanding = useCallback(() => {
    // End pilot analytics session when leaving the app
    if (hasActiveSession()) {
      endSession('back_to_landing');
    }
    window.location.href = '/';
  }, []);

  const handleModeSelect = useCallback((mode: GameMode) => {
    setGameMode(mode);
    setAppState('game');
    // Enable flags for this mode
    featureFlags.enableForMode(mode as FeatureGameMode);

    // Fire game_selected event for pilot analytics
    if (hasActiveSession()) {
      logEvent('game_selected', { gameId: mode });
      logEvent('stage_started', { gameId: mode, stageId: 'initial' });
    }

    // Map game mode to filter profile mode (Part E)
    const modeMap: Record<GameMode, FilterProfileMode> = {
      'free': 'free-paint',
      'pre-writing': 'tracing',
      'calibration': 'bubble-pop',
      'sort-and-place': 'sort-and-place',
      'word-search': 'word-search'
    };

    const filterMode = modeMap[mode] || 'default';

    // Set mode in interaction state manager (only if flag enabled)
    if (getTrackingFlag('modeFilterProfiles')) {
      interactionStateManager.setMode(filterMode);
    }

    // Clear any previous drawings when starting fresh
    if (mode === 'free') {
      drawingEngine.clear();
    }
  }, [flags]);

  const handleExitToMenu = useCallback(() => {
    setAppState('menu');
    drawingEngine.clear();
    // Fire events for pilot analytics
    if (hasActiveSession()) {
      logEvent('stage_completed', { gameId: gameMode, stageId: 'exit' });
      logEvent('menu_opened');
    }
  }, [gameMode]);

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
    if (appState !== 'game') {
      return undefined;
    }

    let logic;
    switch (gameMode) {
      case 'free':
        logic = freePaintLogic;
        break;
      case 'pre-writing':
        logic = preWritingLogic;
        break;
      case 'calibration':
        logic = bubbleCalibrationLogic;
        break;
      case 'sort-and-place':
        logic = sortAndPlaceLogic;
        break;
      case 'word-search':
        logic = wordSearchLogic;
        break;
      default:
        logic = undefined;
    }
    return logic;
  };

  // Make activeLogic reactive to gameMode, appState, and flags changes
  const activeLogic = useMemo(() => {
    return getActiveLogic();
  }, [gameMode, appState, flags]);

  // Initialize ToyMode and Narrator
  useEffect(() => {
    initToyMode();
    initNarrator();
  }, []);

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
          const { results, indexTip, confidence, filteredPoint } = frameData;
          const hasHand = results && results.landmarks && results.landmarks.length > 0;

          // Get pen state for cursor feedback
          const penState = gameMode === 'free' && appState === 'game'
            ? drawingEngine.getPenState()
            : PenState.UP;

          // Use filteredPoint for cursor when airPaintEnabled (matches drawing position)
          // Otherwise use indexTip (raw point)
          const cursorPoint = (gameMode === 'free' && flags.airPaintEnabled && filteredPoint)
            ? filteredPoint
            : (indexTip ?? { x: 0.5, y: 0.5 });

          return (
            <>
              {/* Mode Background — unified toy world on every screen */}
              {appState === 'game' && (
                <ModeBackground
                  modeId={
                    gameMode === 'free' ? 'free' :
                      gameMode === 'calibration' ? 'calibration' :
                        gameMode === 'sort-and-place' ? 'sort-and-place' :
                          gameMode === 'pre-writing' ? 'pre-writing' :
                            gameMode === 'word-search' ? 'word-search' :
                              'free'
                  }
                />
              )}

              {/* Magic Cursor - shows pen state */}
              <MagicCursor
                x={cursorPoint.x}
                y={cursorPoint.y}
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
                  onBack={handleBackToLanding}
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
                    <BubbleCalibration
                      onComplete={handleCalibrationComplete}
                      onExit={handleExitToMenu}
                    />
                  )}

                  {gameMode === 'free' && (
                    <FreePaintMode frameData={frameData} onExit={handleExitToMenu} />
                  )}

                  {gameMode === 'pre-writing' && (
                    <PreWritingMode onExit={handleExitToMenu} />
                  )}

                  {gameMode === 'sort-and-place' && (
                    <SortAndPlaceMode onExit={handleExitToMenu} />
                  )}

                  {gameMode === 'word-search' && (
                    <WordSearchMode
                      frameData={frameData}
                      showSettings={wordSearchSettingsOpen}
                      onCloseSettings={() => setWordSearchSettingsOpen(false)}
                      onExit={handleExitToMenu}
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
