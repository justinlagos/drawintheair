import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { TrackingLayer } from './features/tracking/TrackingLayer';
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
import { ColourBuilderMode } from './features/modes/colourBuilder/ColourBuilderMode';
import { colourBuilderLogic } from './features/modes/colourBuilder/colourBuilderLogic';
import { BalloonMathMode } from './features/modes/balloonMath/BalloonMathMode';
import { balloonMathLogic } from './features/modes/balloonMath/balloonMathLogic';
import { RainbowBridgeMode } from './features/modes/rainbowBridge/RainbowBridgeMode';
import { rainbowBridgeLogic } from './features/modes/rainbowBridge/rainbowBridgeLogic';
import { GestureSpellingMode } from './features/modes/gestureSpelling/GestureSpellingMode';
import { gestureSpellingLogic } from './features/modes/gestureSpelling/gestureSpellingLogic';
import { WaveToWake } from './features/onboarding/WaveToWake';
import { ModeSelectionMenu, type GameMode } from './features/menu/ModeSelectionMenu';
import { NextModeOverlay } from './features/menu/NextModeOverlay';
import { AdultGate } from './features/safety/AdultGate';
import { MagicCursor } from './components/MagicCursor';
import { ModeBackground } from './components/ModeBackground';
import { PerfOverlay } from './components/PerfOverlay';
import { MessageCardOverlay } from './components/MessageCardOverlay';
import { CountdownOverlay } from './components/CountdownOverlay';
// ShareButton intentionally not imported in-game — teacher CTA only.
import { drawingEngine, PenState } from './core/drawingEngine';
import { perf } from './core/perf';
import { initToyMode } from './core/toyMode';
import { initNarrator } from './core/narrator';
import { featureFlags } from './core/featureFlags';
import { type GameMode as FeatureGameMode } from './core/featureFlags';
import { interactionStateManager } from './core/InteractionState';
import { getTrackingFlag, isDebugModeEnabled } from './core/flags/TrackingFlags';
import type { FilterProfileMode } from './core/filters/OneEuroFilter';
import { logEvent, hasActiveSession, endSession } from './lib/analytics';
import './App.css';
import { startCountdown } from './core/countdownService';

type AppState = 'onboarding' | 'menu' | 'game';

// Debug: Allow URL params to skip to specific screens
const getInitialState = (): {
  appState: AppState;
  gameMode: GameMode;
  // Phase 2 . skip-menu first session. The wave gate still runs (we
  // need the camera grant); after wake, App.tsx skips the menu and
  // mounts Free Paint. When the user exits Free Paint, the
  // "ready for the next one?" overlay fires once.
  firstRun: boolean;
} => {
  const params = new URLSearchParams(window.location.search);
  const screen = params.get('screen');
  const mode = params.get('mode') as GameMode;
  const firstRun = params.get('firstrun') === '1';

  // Check screen param first - allows direct access to any screen
  if (screen === 'menu') return { appState: 'menu', gameMode: 'free', firstRun: false };
  if (screen === 'game') {
    const validMode = (mode === 'free' || mode === 'pre-writing' || mode === 'calibration' || mode === 'sort-and-place' || mode === 'word-search' || mode === 'colour-builder' || mode === 'balloon-math' || mode === 'rainbow-bridge' || mode === 'gesture-spelling') ? mode : 'free';
    return {
      appState: 'game',
      gameMode: validMode,
      firstRun: false,
    };
  }

  // Default to onboarding for /play or /onboarding paths
  return { appState: 'onboarding', gameMode: 'free', firstRun };
};

// Window-level version marker. Lives at module scope (not inside the
// component body) so the new react-hooks/immutability rule doesn't
// flag it as a forbidden side-effect during render.
if (typeof window !== 'undefined') {
  (window as { __DRAW_IN_AIR_VERSION__?: string }).__DRAW_IN_AIR_VERSION__ = '2.0.0-updated';
}

function App() {
  const [appState, setAppState] = useState<AppState>(() => getInitialState().appState);
  const [gameMode, setGameMode] = useState<GameMode>(() => getInitialState().gameMode);
  const [flags, setFlags] = useState(featureFlags.getFlags());

  // Phase 2: first-session-after-Try-Free routing. Sticky for the
  // entire session so we know to (a) auto-mount Free Paint after
  // wake and (b) show the post-paint suggestion overlay once.
  const firstRunRef = useRef<boolean>(getInitialState().firstRun);
  const [showNextModeOverlay, setShowNextModeOverlay] = useState(false);

  // One-time debug noise on mount, gated by the debug flag. Moved out
  // of the function body for the same reason as the version marker.
  useEffect(() => {
    if (typeof window === 'undefined' || !isDebugModeEnabled()) return;
    console.log('🎨 Draw in the Air v2.0.0 - Updated version loaded');
    console.log('[TrackingAudit] Files touched:', [
      'src/core/InteractionState.ts',
      'src/core/filters/OneEuroFilter.ts',
      'src/core/tracking/DynamicResolution.ts',
      'src/features/tracking/TrackingLayer.tsx',
      'src/App.tsx',
      'src/core/perf.ts',
      'src/core/flags/TrackingFlags.ts',
      'src/components/HandGuidanceOverlay.tsx',
      'src/core/tracking/PinchLogic.ts',
      'scripts/tracking-smoke-test.ts',
    ]);
  }, []);

  // Subscribe to feature flag changes to ensure reactive updates
  useEffect(() => {
    const unsubscribe = featureFlags.subscribe((newFlags) => {
      setFlags(newFlags);
    });
    return unsubscribe;
  }, []);

  const handleWake = useCallback(() => {
    // Phase 2 . first-session-after-Try-Free skips the menu and
    // drops straight into Free Paint. Returning users get the menu.
    if (firstRunRef.current) {
      setAppState('game');
      setGameMode('free');
      featureFlags.enableForMode('free' as FeatureGameMode);
      if (hasActiveSession()) {
        logEvent('mode_selected', { game_mode: 'free', meta: { auto: true, variant: 'skip_menu_freepaint_v1' } });
        logEvent('mode_started', { game_mode: 'free', stage_id: 'initial', meta: { auto: true } });
      }
      // Clear drawing canvas for a clean Free Paint canvas
      drawingEngine.clear();
      return;
    }

    setAppState('menu');
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
    // Detect mode-switching (kid bounced back to the menu and picked a
    // different mode without ever closing the session). This pattern is
    // a strong "what's hooking them" signal — far more useful than just
    // counting independent mode_started events.
    // Read previous values from state via the functional updater forms
    // so this callback does not need appState/gameMode in its deps.
    let wasInGame = false;
    let previousMode: GameMode = mode;
    setAppState((prev) => { wasInGame = prev === 'game'; return 'game'; });
    setGameMode((prev) => { previousMode = prev; return mode; });
    // Enable flags for this mode
    featureFlags.enableForMode(mode as FeatureGameMode);

    // Fire game_selected event for pilot analytics
    if (hasActiveSession()) {
      if (wasInGame && previousMode !== mode) {
        logEvent('mode_switched', {
          game_mode: mode,
          meta: { from_mode: previousMode, to_mode: mode },
        });
      }
      logEvent('mode_selected', { game_mode: mode });
      logEvent('mode_started', { game_mode: mode, stage_id: 'initial' });
    }

    // Map game mode to filter profile mode (Part E)
    const modeMap: Record<GameMode, FilterProfileMode> = {
      'free': 'free-paint',
      'pre-writing': 'tracing',
      'calibration': 'bubble-pop',
      'sort-and-place': 'sort-and-place',
      'word-search': 'word-search',
      'colour-builder': 'sort-and-place',  // using similar filter profile as sort and place
      'balloon-math': 'bubble-pop',         // similar quick-pop interaction
      'rainbow-bridge': 'sort-and-place',  // deliberate dwell interaction
      'gesture-spelling': 'tracing',        // deliberate precision interaction
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
    // Phase 2 . if this is the first auto-routed Free Paint session,
    // show the "ready for the next one?" overlay instead of dumping
    // them straight into the menu. The overlay fires only once per
    // session; after it is closed (any way) we flip firstRunRef off
    // and the normal menu flow resumes.
    const isFirstFreePaintExit = firstRunRef.current && gameMode === 'free';

    setAppState('menu');
    drawingEngine.clear();

    if (hasActiveSession()) {
      logEvent('mode_abandoned', {
        game_mode: gameMode,
        meta: { reason: 'exit_to_menu', auto_first_run: isFirstFreePaintExit },
      });
      logEvent('menu_opened');
    }

    if (isFirstFreePaintExit) {
      // Don't fire again for this session, even if the user re-enters
      // Free Paint manually from the menu.
      firstRunRef.current = false;
      setShowNextModeOverlay(true);
      if (hasActiveSession()) {
        logEvent('next_mode_overlay_shown', {
          meta: { variant: 'skip_menu_freepaint_v1' },
        });
      }
    }
  }, [gameMode]);

  const lastCountdownKeyRef = useRef<string>('');

  useEffect(() => {
    if (appState !== 'game') return;
    const key = `${appState}:${gameMode}`;
    if (lastCountdownKeyRef.current === key) return;
    lastCountdownKeyRef.current = key;
    startCountdown(3000);
  }, [appState, gameMode]);

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
      case 'colour-builder':
        logic = colourBuilderLogic;
        break;
      case 'balloon-math':
        logic = balloonMathLogic;
        break;
      case 'rainbow-bridge':
        logic = rainbowBridgeLogic;
        break;
      case 'gesture-spelling':
        logic = gestureSpellingLogic;
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
      <MessageCardOverlay />
      <CountdownOverlay />
      <TrackingLayer onFrame={activeLogic}>
        {(frameRef, diagnostics) => {
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
                              gameMode === 'colour-builder' ? 'colour-builder' :
                                gameMode === 'balloon-math' ? 'balloon-math' :
                                  gameMode === 'rainbow-bridge' ? 'rainbow-bridge' :
                                    gameMode === 'gesture-spelling' ? 'gesture-spelling' :
                                      'free'
                  }
                />
              )}

              {/* Magic Cursor - shows pen state */}
              <MagicCursor
                frameRef={frameRef}
                airPaintEnabled={flags.airPaintEnabled}
                mode={gameMode}
                getPenDown={() => (gameMode === 'free' && appState === 'game'
                  ? drawingEngine.getPenState() === PenState.DOWN
                  : false)}
              />

              {/* State: Onboarding */}
              {appState === 'onboarding' && (
                <WaveToWake
                  trackingResults={frameRef.current.results}
                  onWake={handleWake}
                  cameraStatus={diagnostics.cameraStatus}
                  cameraErrorCode={diagnostics.cameraErrorCode}
                  trackerReady={diagnostics.trackerReady}
                  trackerError={diagnostics.trackerError}
                  trackerDelegate={diagnostics.trackerDelegate}
                  visionFps={diagnostics.visionFps}
                  onRetryTracker={diagnostics.retryTracker}
                />
              )}

              {/* State: Menu */}
              {appState === 'menu' && (
                <ModeSelectionMenu
                  onSelect={handleModeSelect}
                  onBack={handleBackToLanding}
                  trackingResults={frameRef.current.results}
                />
              )}

              {/* Phase 2: post-Free-Paint suggestion overlay */}
              <NextModeOverlay
                open={showNextModeOverlay}
                onPick={(mode) => {
                  setShowNextModeOverlay(false);
                  handleModeSelect(mode);
                }}
                onBrowseAll={() => setShowNextModeOverlay(false)}
                onDismiss={() => setShowNextModeOverlay(false)}
              />

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
                    <FreePaintMode frameRef={frameRef} onExit={handleExitToMenu} />
                  )}

                  {gameMode === 'pre-writing' && (
                    <PreWritingMode onExit={handleExitToMenu} />
                  )}

                  {gameMode === 'sort-and-place' && (
                    <SortAndPlaceMode onExit={handleExitToMenu} />
                  )}

                  {gameMode === 'word-search' && (
                    <WordSearchMode
                      frameRef={frameRef}
                      showSettings={wordSearchSettingsOpen}
                      onCloseSettings={() => setWordSearchSettingsOpen(false)}
                      onExit={handleExitToMenu}
                    />
                  )}

                  {gameMode === 'colour-builder' && (
                    <ColourBuilderMode onExit={handleExitToMenu} />
                  )}

                  {gameMode === 'balloon-math' && (
                    <BalloonMathMode onExit={handleExitToMenu} />
                  )}

                  {gameMode === 'rainbow-bridge' && (
                    <RainbowBridgeMode onExit={handleExitToMenu} />
                  )}

                  {gameMode === 'gesture-spelling' && (
                    <GestureSpellingMode onExit={handleExitToMenu} />
                  )}

                  {/* Share with a Colleague intentionally not rendered in-game.
                      That CTA is for teachers/parents discovering modes; mid-play
                      it's clutter for kids. Lives on landing/marketing routes. */}

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
