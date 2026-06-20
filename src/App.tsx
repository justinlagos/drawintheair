import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { TrackingLayer } from './features/tracking/TrackingLayer';
import { FreePaintMode } from './features/modes/FreePaintMode';
import { freePaintLogic } from './features/modes/freePaintLogic';
// Magic Canvas (Free Paint redesign), gated behind freePaintMagicCanvasV1.
import { MagicCanvasMode } from './features/modes/magicCanvas/MagicCanvasMode';
import { magicCanvasFrame } from './features/modes/magicCanvas/magicCanvasFrame';
import { PreWritingMode } from './features/modes/PreWritingMode';
import { preWritingLogic } from './features/modes/preWriting/preWritingLogic';
// Playful tracing redesign (V2), gated behind tracingPlayfulUiV1. Falls back
// to PreWritingMode/preWritingLogic above when the flag is off.
import { TracingModePlayful } from './features/modes/tracing/TracingModePlayful';
import { playfulTracingFrame } from './features/modes/tracing/tracingPlayfulFrame';
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
import { BuildingMode } from './features/modes/building/BuildingMode';
import { buildingLogic } from './features/modes/building/buildingLogic';
import { WaveToWake } from './features/onboarding/WaveToWake';
import { WarmupTutorial } from './features/onboarding/WarmupTutorial';
import { InAppBrowserNotice } from './features/onboarding/InAppBrowserNotice';
import { shouldShowInAppNotice } from './features/onboarding/inAppDetection';
import { AudiencePrompt } from './features/onboarding/AudiencePrompt';
import { recordVisit } from './lib/visitHistory';
import { getAudience } from './lib/audience';
import {
  ExitFeedbackModal,
  ExpectationCheck,
  HappinessCheck,
  shouldShowExpectation,
  shouldShowHappiness,
} from './features/feedback';
import { getActivityCount, onActivityCompleted } from './lib/activationCounter';
import { ModeSelectionMenu, type GameMode } from './features/menu/ModeSelectionMenu';
import { GameCompanion } from './features/kid2/GameCompanion';
import { ChildProfileSelector } from './features/parent/ChildProfileSelector';
import { LearnerGreeting } from './features/parent/LearnerGreeting';
import { SaveProgressNudge } from './features/parent/SaveProgressNudge';
import { AdultGate } from './features/safety/AdultGate';
import { MagicCursor } from './components/MagicCursor';
import { ModeBackground } from './components/ModeBackground';
import { PerfOverlay } from './components/PerfOverlay';
import { MessageCardOverlay } from './components/MessageCardOverlay';
import { CountdownOverlay } from './components/CountdownOverlay';
// ShareButton intentionally not imported in-game, teacher CTA only.
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

type AppState = 'onboarding' | 'tutorial' | 'menu' | 'game';

// First-run warm-up gate. The optional balloon tutorial is offered once
// per device; returning devices skip straight to the menu.
const WARMUP_DONE_KEY = 'dita_warmup_done';
const warmupDone = (): boolean => {
  try { return localStorage.getItem(WARMUP_DONE_KEY) === '1'; } catch { return false; }
};
const markWarmupDone = (): void => {
  try { localStorage.setItem(WARMUP_DONE_KEY, '1'); } catch { /* private mode */ }
};

// Debug: Allow URL params to skip to specific screens
const getInitialState = (): { appState: AppState; gameMode: GameMode } => {
  const params = new URLSearchParams(window.location.search);
  const screen = params.get('screen');
  const mode = params.get('mode') as GameMode;

  // Check screen param first - allows direct access to any screen
  if (screen === 'menu') return { appState: 'menu', gameMode: 'free' };
  if (screen === 'game') {
    const validMode = (mode === 'free' || mode === 'pre-writing' || mode === 'calibration' || mode === 'sort-and-place' || mode === 'word-search' || mode === 'colour-builder' || mode === 'balloon-math' || mode === 'rainbow-bridge' || mode === 'gesture-spelling' || mode === 'building') ? mode : 'free';
    return {
      appState: 'game',
      gameMode: validMode
    };
  }

  // Default to onboarding for /play or /onboarding paths
  return { appState: 'onboarding', gameMode: 'free' };
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

  // ── Sprint 2: feedback / survey surfaces ──────────────────────────
  const [activityCount, setActivityCount] = useState(() => getActivityCount());
  const [exitOpen, setExitOpen] = useState(false);
  const [expectationOpen, setExpectationOpen] = useState(false);
  const [happinessOpen, setHappinessOpen] = useState(false);
  const [inAppDismissed, setInAppDismissed] = useState(false);
  const [audienceOpen, setAudienceOpen] = useState(false);

  // Sprint 3: record the visit (returning-device detection) and infer the
  // home/school audience from acquisition signals — once per app load.
  useEffect(() => {
    const visit = recordVisit();
    if (visit.returning) {
      logEvent('returning_visitor', { meta: { visit_count: visit.count } });
    }
    const audience = getAudience();
    if (audience !== 'unknown') {
      logEvent('audience_identified', { meta: { audience } });
    }
  }, []);

  // Drive the post-success surveys off completed activities. The 1st
  // completion (incl. the warm-up) opens the expectation read; the 3rd
  // opens the happiness check. Both self-gate to once per session.
  // set-state here is in an event-driven subscription callback, not the
  // effect body — the legitimate exception to the rule.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    return onActivityCompleted((count) => {
      setActivityCount(count);
      if (count >= 1 && shouldShowExpectation(count)) setExpectationOpen(true);
      if (count >= 3 && shouldShowHappiness(count)) setHappinessOpen(true);
      // Home/school path: ask once, only if we couldn't already infer it.
      if (count >= 1 && getAudience() === 'unknown') {
        try {
          if (sessionStorage.getItem('dita_audience_prompted') !== '1') {
            sessionStorage.setItem('dita_audience_prompted', '1');
            setAudienceOpen(true);
          }
        } catch {
          setAudienceOpen(true);
        }
      }
    });
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

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

  const goToMenu = useCallback(() => {
    setAppState('menu');
    // Fire menu_opened event for pilot analytics
    if (hasActiveSession()) {
      logEvent('menu_opened');
    }
  }, []);

  const handleWake = useCallback(() => {
    // First-time devices get the optional balloon warm-up (learn-by-doing,
    // guaranteed first success = activation). Returning devices skip it.
    if (!warmupDone()) {
      setAppState('tutorial');
      return;
    }
    goToMenu();
  }, [goToMenu]);

  const handleTutorialComplete = useCallback(() => {
    markWarmupDone();
    goToMenu();
  }, [goToMenu]);

  const handleTutorialSkip = useCallback(() => {
    markWarmupDone();
    goToMenu();
  }, [goToMenu]);

  const handleBackToLanding = useCallback(() => {
    // End pilot analytics session when leaving the app
    if (hasActiveSession()) {
      endSession('back_to_landing');
    }
    window.location.href = '/';
  }, []);

  // Exit intent: if the user is leaving WITHOUT ever activating (no
  // completed activity), capture one-tap intent + reason before they go.
  // This turns an anonymous bounce into a tagged reason. Once they've
  // activated, just leave.
  const handleExitIntent = useCallback(() => {
    if (activityCount === 0) {
      setExitOpen(true);
      return;
    }
    handleBackToLanding();
  }, [activityCount, handleBackToLanding]);

  const handleExitModalClose = useCallback(() => {
    setExitOpen(false);
    handleBackToLanding();
  }, [handleBackToLanding]);

  const handleModeSelect = useCallback((mode: GameMode) => {
    // Detect mode-switching (kid bounced back to the menu and picked a
    // different mode without ever closing the session). This pattern is
    // a strong "what's hooking them" signal, far more useful than just
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
      'building': 'building',               // smooth-settle grab profile
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
    // Fire events for pilot analytics. We treat every menu-button exit
    // as `mode_abandoned` . the per-stage `mode_completed` events from
    // inside the game logic are the source of truth for "actually
    // finished a stage". Using mode_completed here was a lie that made
    // every exit look like a win.
    if (hasActiveSession()) {
      logEvent('mode_abandoned', {
        game_mode: gameMode,
        meta: { reason: 'exit_to_menu' },
      });
      logEvent('menu_opened');
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
        // Flag decides the engine BEFORE mount; the two never run together.
        logic = featureFlags.getFlag('freePaintMagicCanvasV1') ? magicCanvasFrame : freePaintLogic;
        break;
      case 'pre-writing':
        // Flag decides the engine BEFORE mount; the two never run together.
        logic = featureFlags.getFlag('tracingPlayfulUiV1') ? playfulTracingFrame : preWritingLogic;
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
      case 'building':
        logic = buildingLogic;
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
      <TrackingLayer onFrame={activeLogic} suppressNotifications={appState === 'onboarding' || appState === 'tutorial'}>
        {(frameRef, diagnostics) => {
          return (
            <>
              {/* Mode Background, unified toy world on every screen */}
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
                                      gameMode === 'building' ? 'building' :
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

              {/* Mobile in-app webview (FB/IG) → hand off to a real browser
                   before the camera prompt fails silently. */}
              {appState === 'onboarding' && !inAppDismissed && shouldShowInAppNotice() && (
                <InAppBrowserNotice onContinueAnyway={() => setInAppDismissed(true)} />
              )}

              {/* State: Warm-up tutorial (optional, first-run) */}
              {appState === 'tutorial' && (
                <WarmupTutorial
                  frameRef={frameRef}
                  onComplete={handleTutorialComplete}
                  onSkip={handleTutorialSkip}
                  isCompact={typeof window !== 'undefined' && window.innerWidth <= 768}
                />
              )}

              {/* State: Menu */}
              {appState === 'menu' && (
                <>
                  {/* Child profile picker, renders nothing for anonymous
                       /play users (no account, no children). Signed-in
                       parents see it once per session so progress saves
                       to the right learner. */}
                  <ChildProfileSelector />
                  {/* Warm greeting by nickname for parent-linked learners.
                       Anonymous /play visitors never see it. */}
                  <LearnerGreeting />
                  {/* "Save this progress?" appears once for anonymous /play
                       visitors after their first successful round. */}
                  <SaveProgressNudge />
                  <ModeSelectionMenu
                    onSelect={handleModeSelect}
                    onBack={handleExitIntent}
                    trackingResults={frameRef.current.results}
                  />
                </>
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
                    flags.freePaintMagicCanvasV1
                      ? <MagicCanvasMode onExit={handleExitToMenu} />
                      : <FreePaintMode frameRef={frameRef} onExit={handleExitToMenu} />
                  )}

                  {gameMode === 'pre-writing' && (
                    flags.tracingPlayfulUiV1
                      ? <TracingModePlayful onExit={handleExitToMenu} />
                      : <PreWritingMode onExit={handleExitToMenu} />
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

                  {gameMode === 'building' && (
                    <BuildingMode onExit={handleExitToMenu} />
                  )}

                  {/* Share with a Colleague intentionally not rendered in-game.
                      That CTA is for teachers/parents discovering modes; mid-play
                      it's clutter for kids. Lives on landing/marketing routes. */}

                  {/* 2.0 Spark companion — decorative coaching presence.
                      pointer-events:none, so it cannot intercept gestures or
                      clicks and touches no game/tracking/analytics logic. */}
                  <GameCompanion modeId={gameMode} companion="spark" />

                </>
              )}

              {/* ── Feedback surfaces (any state) ── */}
              {/* Exit micro-survey: intent + reason, before an un-activated leave. */}
              <ExitFeedbackModal
                open={exitOpen}
                onClose={handleExitModalClose}
                runtime={{
                  onboarding_step: appState,
                  hand_detection: frameRef.current.hasHand ? 'detected' : 'never',
                  session_length_ms: null,
                }}
                isCompact={typeof window !== 'undefined' && window.innerWidth <= 768}
              />
              {/* Expectation gap, after the first activity. Menu-only:
                   never interrupt active gameplay — it waits for the pause. */}
              <ExpectationCheck
                open={expectationOpen && appState === 'menu'}
                onClose={() => setExpectationOpen(false)}
                isCompact={typeof window !== 'undefined' && window.innerWidth <= 768}
              />
              {/* Happiness, after 3 completed activities. Menu-only. */}
              <HappinessCheck
                open={happinessOpen && appState === 'menu'}
                onClose={() => setHappinessOpen(false)}
                isCompact={typeof window !== 'undefined' && window.innerWidth <= 768}
              />
              {/* Home vs school path — on the menu, once, when not already
                   inferred. Yields to the survey cards to avoid overlap. */}
              <AudiencePrompt
                open={audienceOpen && appState === 'menu' && !expectationOpen && !happinessOpen}
                onClose={() => setAudienceOpen(false)}
                isCompact={typeof window !== 'undefined' && window.innerWidth <= 768}
              />
            </>
          );
        }}
      </TrackingLayer>
    </div>
  );
}

export default App;
