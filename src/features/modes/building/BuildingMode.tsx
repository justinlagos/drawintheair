/**
 * BuildingMode — React shell for Building.
 *
 * Owns lifecycle (init/teardown of state machine + asset preload),
 * narrator cues triggered by phase transitions, and the Celebration
 * overlay. Visual panels are composed from `BuildingPanels.tsx`.
 *
 * Layout sits over the TrackingLayer canvas. Container has
 * `pointerEvents: none`; only the picker / action tiles opt back in.
 */

import { useEffect, useRef, useState } from 'react';
import { Celebration } from '../../../components/Celebration';
import { narrateText } from '../../../core/narrator';
import { tokens } from '../../../styles/tokens';
import {
    BrandHeader,
    BottomHint,
    HintCardCelebrate,
    HintCardLightbulb,
    ObjectPicker,
    PromptBar,
    StepsPanel,
    TopRightButtons,
    UndoButton,
    type PickerTile,
} from './BuildingPanels';
import { preloadBuildingAssets } from './buildingAssets';
import { _resetBuildingFrameState } from './buildingLogic';
import {
    abandon,
    consumePendingNarrator,
    getCurrentObject,
    getPhase,
    progressPct,
    resetBuildingState,
    startBuild,
} from './buildingState';
import { resetTelemetryDebounce } from './buildingTelemetry';

interface BuildingModeProps {
    onExit?: () => void;
}

// Phase 0: only Flower Vase is playable. Other tiles communicate the
// catalogue without enabling them.
const PICKER_TILES: PickerTile[] = [
    { objectId: 'flower-vase', label: 'Flower Vase', enabled: true },
    { objectId: 'house',       label: 'House',       enabled: false },
    { objectId: 'car',         label: 'Car',         enabled: false },
    { objectId: 'plane',       label: 'Plane',       enabled: false },
];

const TOTAL_STEPS = 5;   // Flower Vase = 5 zones; would be per-object in Phase 1.

export const BuildingMode = ({ onExit }: BuildingModeProps) => {
    const [phase, setPhase] = useState(getPhase());
    const [progress, setProgress] = useState(0);
    const [displayName, setDisplayName] = useState('');
    const [filledCount, setFilledCount] = useState(0);
    const [showCelebration, setShowCelebration] = useState(false);
    const celebrationFiredRef = useRef(false);

    // Kick off asset preload + start the build. Preload is async; the
    // canvas falls back to placeholder ellipses until images resolve,
    // so first frame is never blank.
    useEffect(() => {
        void preloadBuildingAssets({
            pieceTemplateIds: [
                'building.flower-vase.base',
                'building.flower-vase.plant',
                'building.flower-vase.leaf',
                'building.flower-vase.coral',
                'building.flower-vase.yellow',
            ],
            objectIds: ['flower-vase', 'house'],
            sceneIds: ['home-background'],
        });
        startBuild();
        return () => {
            abandon('unmount');
            _resetBuildingFrameState();
            resetTelemetryDebounce();
            resetBuildingState();
        };
    }, []);

    // Poll FSM state at 10Hz — cheap, plenty for UI updates.
    useEffect(() => {
        const interval = setInterval(() => {
            const p = getPhase();
            setPhase(p);
            setProgress(progressPct());

            const obj = getCurrentObject();
            if (obj) {
                setDisplayName(prev =>
                    prev === obj.displayName ? prev : obj.displayName);
                const filled = obj.snapZones.filter(z => z.filled).length;
                setFilledCount(prev => prev === filled ? prev : filled);
            }

            const pending = consumePendingNarrator();
            if (pending && obj) {
                const line = obj.narratorScript.find(n => n.phase === pending);
                if (line) narrateText(line.text);
            }

            if (p === 'completion' && !celebrationFiredRef.current) {
                celebrationFiredRef.current = true;
                setTimeout(() => setShowCelebration(true), 1500);
            }
        }, 100);
        return () => clearInterval(interval);
    }, []);

    const handleCelebrationDone = () => {
        setShowCelebration(false);
        if (onExit) onExit();
    };

    return (
        <div style={containerStyle}>
            <BrandHeader />
            <PromptBar displayName={displayName} />
            <TopRightButtons onHome={onExit} />
            <ObjectPicker selectedId="flower-vase" tiles={PICKER_TILES} />
            <StepsPanel total={TOTAL_STEPS} filled={filledCount} />
            <HintCardLightbulb />
            <HintCardCelebrate />
            <BottomHint />
            <UndoButton />

            {showCelebration && (
                <Celebration
                    show={showCelebration}
                    message={`You made a ${displayName}!`}
                    subMessage="Beautiful work."
                    icon="🌸"
                    stars={3}
                    onComplete={handleCelebrationDone}
                />
            )}

            {/* Screen-reader live region — keeps screen-reader users in
                sync with phase + progress without visual clutter. */}
            <span style={srOnly} aria-live="polite">
                {phase === 'completion' ? `${displayName} complete` : `${progress}% built`}
            </span>
        </div>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    fontFamily: tokens.fontFamily.body,
    pointerEvents: 'none',
};

const srOnly: React.CSSProperties = {
    position: 'absolute',
    width: '1px',
    height: '1px',
    overflow: 'hidden',
    clip: 'rect(0,0,0,0)',
};
