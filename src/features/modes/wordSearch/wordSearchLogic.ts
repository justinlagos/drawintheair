/**
 * Word Search Logic
 * 
 * Per-frame selection and matching logic using refs (no per-frame setState)
 */

import type { TrackingFrameData } from '../../tracking/TrackingLayer';
import type { Grid, Tile, SelectionState, DwellState, WordSearchSettings, HintState } from './wordSearchTypes';
import { DWELL_TIME_MS, STABLE_FRAMES, HINT_TIMINGS } from './wordSearchConstants';
import { pilotAnalytics } from '../../../lib/pilotAnalytics';

/**
 * Word Search Logic Function (for onFrame callback)
 * This is called by TrackingLayer but Word Search uses its own canvas
 */
export const wordSearchLogic = (
    _ctx: CanvasRenderingContext2D,
    _frameData: TrackingFrameData,
    _width: number,
    _height: number,
    _drawingUtils: any
) => {
    // Word Search uses its own canvas, so this is a no-op
    // The actual rendering happens in WordSearchMode component
};

export interface WordSearchState {
    grid: Grid | null;
    selectionState: SelectionState;
    dwellState: DwellState;
    foundTileIds: Set<string>;
    foundWords: Set<string>;
    lastPinchState: boolean;
    settings: WordSearchSettings;
    hintState: HintState;
    chapter: 1 | 2 | 3;
    lastHoverTileId: string | null;
    lastHoverTime: number;
}

/**
 * Initialize word search state
 */
export function createWordSearchState(settings: WordSearchSettings): WordSearchState {
    const now = Date.now();
    return {
        grid: null,
        selectionState: {
            anchorTileId: null,
            currentTileId: null,
            selectionPath: [],
            isActive: false
        },
        dwellState: {
            tileId: null,
            startTime: null,
            stableFrames: 0
        },
        foundTileIds: new Set(),
        foundWords: new Set(),
        lastPinchState: false,
        settings,
        hintState: {
            lastActivityTime: now,
            lastPinchTime: 0,
            lastWordFoundTime: now,
            currentPhase: 0,
            hintWordIndex: null,
            lastHintTime: 0,
            hintCooldown: 0
        },
        chapter: settings.chapter || 1,
        lastHoverTileId: null,
        lastHoverTime: now
    };
}

/**
 * Process a frame of tracking data
 * Returns updates that should trigger React state changes (word found, round complete, etc.)
 */
export function processWordSearchFrame(
    stateRef: { current: WordSearchState },
    frameData: TrackingFrameData,
    timestamp: number
): {
    wordFound: string | null;
    roundComplete: boolean;
    needsRender: boolean;
    hintPhase: 0 | 1 | 2 | 3;
    hintWordIndex: number | null;
    hintTileIds: string[];
} {
    const state = stateRef.current;
    const { filteredPoint, pinchActive, hasHand } = frameData;

    // Early return if no grid or no hand
    if (!state.grid || !hasHand) {
        // No grid or no hand - clear selection
        if (state.selectionState.isActive) {
            state.selectionState = {
                anchorTileId: null,
                currentTileId: null,
                selectionPath: [],
                isActive: false
            };
            state.dwellState = {
                tileId: null,
                startTime: null,
                stableFrames: 0
            };
            return { wordFound: null, roundComplete: false, needsRender: true, hintPhase: 0, hintWordIndex: null, hintTileIds: [] };
        }
        return { wordFound: null, roundComplete: false, needsRender: false, hintPhase: 0, hintWordIndex: null, hintTileIds: [] };
    }

    // Update hint state - track activity (only if grid exists)
    const hintState = state.hintState;
    const currentTile = filteredPoint ? getTileAtPoint(state.grid, filteredPoint) : null;
    const currentTileId = currentTile?.id || null;

    // Track hover activity
    if (currentTileId && currentTileId !== state.lastHoverTileId) {
        state.lastHoverTileId = currentTileId;
        state.lastHoverTime = timestamp;
        hintState.lastActivityTime = timestamp;
    }

    // Track pinch activity
    if (pinchActive) {
        hintState.lastPinchTime = timestamp;
        hintState.lastActivityTime = timestamp;
    }

    // Detect pinch start/end transitions
    const pinchJustStarted = pinchActive && !state.lastPinchState;
    const pinchJustEnded = !pinchActive && state.lastPinchState;
    state.lastPinchState = pinchActive;

    // Handle pinch start
    if (pinchJustStarted && filteredPoint) {
        const tile = getTileAtPoint(state.grid, filteredPoint);
        if (tile) {
            state.selectionState = {
                anchorTileId: tile.id,
                currentTileId: tile.id,
                selectionPath: [tile.id],
                isActive: true
            };
            state.dwellState = {
                tileId: tile.id,
                startTime: timestamp,
                stableFrames: 1
            };
            return { wordFound: null, roundComplete: false, needsRender: true, hintPhase: 0, hintWordIndex: null, hintTileIds: [] };
        }
    }

    // Handle pinch end
    if (pinchJustEnded && state.selectionState.isActive) {

        // Log item grab (when they click on the anchor tile)
        if (state.selectionState.anchorTileId) {
            pilotAnalytics.logEvent('item_grabbed', { gameId: 'wordSearch', stageId: state.chapter.toString(), itemInstanceId: state.selectionState.anchorTileId });
        }

        const result = checkWordMatch(state);

        // Log the drop (did they find a word or not?)
        pilotAnalytics.logEvent('item_dropped', { gameId: 'wordSearch', stageId: state.chapter.toString(), itemKey: result.wordFound || 'unknown_word', itemInstanceId: state.selectionState.selectionPath.join(','), isCorrect: !!result.wordFound });

        state.selectionState = {
            anchorTileId: null,
            currentTileId: null,
            selectionPath: [],
            isActive: false
        };
        state.dwellState = {
            tileId: null,
            startTime: null,
            stableFrames: 0
        };

        // Update hint state on word found
        if (result.wordFound) {
            hintState.lastWordFoundTime = timestamp;
            hintState.currentPhase = 0;
            hintState.hintWordIndex = null;
            hintState.hintCooldown = timestamp + HINT_TIMINGS.COOLDOWN;
        }

        // Process hints
        const hintResult = processHints(state, timestamp);

        return {
            ...result,
            hintPhase: hintResult.phase,
            hintWordIndex: hintResult.wordIndex,
            hintTileIds: hintResult.tileIds
        };
    }

    // Handle active selection (while pinching)
    if (pinchActive && state.selectionState.isActive && filteredPoint) {
        const tile = getTileAtPoint(state.grid, filteredPoint);

        if (tile) {
            // Update dwell state
            if (tile.id === state.dwellState.tileId) {
                // Same tile - increment stable frames
                state.dwellState.stableFrames++;

                // Check if we should switch to this tile
                const shouldSwitch =
                    state.dwellState.stableFrames >= STABLE_FRAMES ||
                    (state.dwellState.startTime && timestamp - state.dwellState.startTime >= DWELL_TIME_MS);

                if (shouldSwitch && tile.id !== state.selectionState.currentTileId) {
                    // Update current tile and rebuild path
                    state.selectionState.currentTileId = tile.id;
                    state.selectionState.selectionPath = buildSelectionPath(
                        state.grid,
                        state.selectionState.anchorTileId!,
                        tile.id
                    );
                    const hintResult = processHints(state, timestamp);
                    return { wordFound: null, roundComplete: false, needsRender: true, hintPhase: hintResult.phase, hintWordIndex: hintResult.wordIndex, hintTileIds: hintResult.tileIds };
                }
            } else {
                // New tile - reset dwell and immediately check if we should switch
                state.dwellState = {
                    tileId: tile.id,
                    startTime: timestamp,
                    stableFrames: 1
                };

                // More responsive: update path immediately if tile is adjacent to current path
                // This makes dragging feel smoother and more responsive
                const currentTileId = state.selectionState.currentTileId || state.selectionState.anchorTileId;
                const shouldSwitchImmediately =
                    !currentTileId || // No current tile yet
                    isAdjacentTile(state.grid, currentTileId, tile.id) || // Adjacent to current
                    state.selectionState.selectionPath.length === 0; // Empty path

                if (shouldSwitchImmediately && tile.id !== state.selectionState.currentTileId) {
                    state.selectionState.currentTileId = tile.id;
                    state.selectionState.selectionPath = buildSelectionPath(
                        state.grid,
                        state.selectionState.anchorTileId!,
                        tile.id
                    );
                    const hintResult = processHints(state, timestamp);
                    return { wordFound: null, roundComplete: false, needsRender: true, hintPhase: hintResult.phase, hintWordIndex: hintResult.wordIndex, hintTileIds: hintResult.tileIds };
                }
            }
        } else {
            // No tile under cursor - reset dwell but keep selection active
            state.dwellState = {
                tileId: null,
                startTime: null,
                stableFrames: 0
            };
        }

        // Always render during active selection to show current path
        const hintResult = processHints(state, timestamp);
        return { wordFound: null, roundComplete: false, needsRender: true, hintPhase: hintResult.phase, hintWordIndex: hintResult.wordIndex, hintTileIds: hintResult.tileIds };
    }

    // Process hints
    const hintResult = processHints(state, timestamp);
    return { wordFound: null, roundComplete: false, needsRender: false, hintPhase: hintResult.phase, hintWordIndex: hintResult.wordIndex, hintTileIds: hintResult.tileIds };
}

/**
 * Process hint system - returns current hint phase and word to highlight
 */
function processHints(
    state: WordSearchState,
    timestamp: number
): {
    phase: 0 | 1 | 2 | 3;
    wordIndex: number | null;
    tileIds: string[];
} {
    if (!state.grid) {
        return { phase: 0, wordIndex: null, tileIds: [] };
    }

    const hintState = state.hintState;
    const timeSinceActivity = timestamp - hintState.lastActivityTime;
    const timeSinceLastPinch = hintState.lastPinchTime > 0 ? timestamp - hintState.lastPinchTime : Infinity;
    const timeSinceLastWord = timestamp - hintState.lastWordFoundTime;
    const timeSinceLastHint = timestamp - hintState.lastHintTime;

    // Check cooldown
    if (timeSinceLastHint < HINT_TIMINGS.COOLDOWN) {
        return { phase: hintState.currentPhase, wordIndex: hintState.hintWordIndex, tileIds: [] };
    }

    // Find unfound words
    const unfoundWords = state.grid.words
        .map((word, index) => ({ word, index }))
        .filter(({ word }) => !word.found);

    if (unfoundWords.length === 0) {
        return { phase: 0, wordIndex: null, tileIds: [] };
    }

    // Determine inactivity
    const isIdle = timeSinceActivity > HINT_TIMINGS.IDLE_THRESHOLD &&
        (state.lastHoverTileId === null || timeSinceActivity > HINT_TIMINGS.IDLE_THRESHOLD);
    const noProgress = timeSinceLastPinch < HINT_TIMINGS.NO_PROGRESS_THRESHOLD &&
        timeSinceLastWord > HINT_TIMINGS.NO_PROGRESS_THRESHOLD;

    // Phase 1: 8s idle - pulse word tray and first letter
    if (isIdle && timeSinceActivity >= HINT_TIMINGS.IDLE_THRESHOLD && timeSinceActivity < HINT_TIMINGS.PHASE_2_THRESHOLD) {
        const wordIndex = hintState.hintWordIndex ?? unfoundWords[0].index;
        hintState.currentPhase = 1;
        hintState.hintWordIndex = wordIndex;
        hintState.lastHintTime = timestamp;

        const word = state.grid.words[wordIndex];
        const firstTile = word.startTile;
        return {
            phase: 1,
            wordIndex,
            tileIds: firstTile ? [firstTile.id] : []
        };
    }

    // Phase 2: 12s no progress - shimmer path for first 2 letters
    if (noProgress && timeSinceLastWord >= HINT_TIMINGS.PHASE_2_THRESHOLD && timeSinceLastWord < HINT_TIMINGS.PHASE_3_THRESHOLD) {
        const wordIndex = hintState.hintWordIndex ?? unfoundWords[0].index;
        hintState.currentPhase = 2;
        hintState.hintWordIndex = wordIndex;
        hintState.lastHintTime = timestamp;

        const word = state.grid.words[wordIndex];
        const tileIds = getWordTileIds(state.grid, word.text);
        return {
            phase: 2,
            wordIndex,
            tileIds: tileIds.slice(0, 2) // First 2 letters only
        };
    }

    // Phase 3: 18s still no progress - briefly reveal full word
    if (noProgress && timeSinceLastWord >= HINT_TIMINGS.PHASE_3_THRESHOLD) {
        const wordIndex = hintState.hintWordIndex ?? unfoundWords[0].index;
        hintState.currentPhase = 3;
        hintState.hintWordIndex = wordIndex;
        hintState.lastHintTime = timestamp;

        const word = state.grid.words[wordIndex];
        const tileIds = getWordTileIds(state.grid, word.text);
        return {
            phase: 3,
            wordIndex,
            tileIds
        };
    }

    return { phase: 0, wordIndex: null, tileIds: [] };
}

/**
 * Get tile IDs for a word in the grid
 */
function getWordTileIds(grid: Grid, wordText: string): string[] {
    const word = grid.words.find(w => w.text === wordText);
    if (!word || !word.startTile || !word.endTile) return [];

    const tiles: string[] = [];
    const startRow = word.startTile.row;
    const startCol = word.startTile.col;
    const endRow = word.endTile.row;
    const endCol = word.endTile.col;

    const dr = endRow > startRow ? 1 : endRow < startRow ? -1 : 0;
    const dc = endCol > startCol ? 1 : endCol < startCol ? -1 : 0;

    let row = startRow;
    let col = startCol;
    const wordLength = wordText.length;

    for (let i = 0; i < wordLength; i++) {
        if (row >= 0 && row < grid.size && col >= 0 && col < grid.size) {
            tiles.push(grid.tiles[row][col].id);
        }
        row += dr;
        col += dc;
    }

    return tiles;
}

/**
 * Get tile at a normalized point
 */
function getTileAtPoint(grid: Grid, point: { x: number; y: number }): Tile | null {
    for (const row of grid.tiles) {
        for (const tile of row) {
            if (
                point.x >= tile.x &&
                point.x < tile.x + tile.width &&
                point.y >= tile.y &&
                point.y < tile.y + tile.height
            ) {
                return tile;
            }
        }
    }
    return null;
}

/**
 * Build a straight-line path from anchor to current tile
 * Quantizes to 8 directions
 */
function buildSelectionPath(grid: Grid, anchorTileId: string, currentTileId: string): string[] {
    const anchorTile = findTileById(grid, anchorTileId);
    const currentTile = findTileById(grid, currentTileId);

    if (!anchorTile || !currentTile) {
        return [anchorTileId];
    }

    const dr = currentTile.row - anchorTile.row;
    const dc = currentTile.col - anchorTile.col;

    // Determine direction (quantize to 8 directions)
    let directionRow = 0;
    let directionCol = 0;

    if (Math.abs(dr) > Math.abs(dc)) {
        // Vertical movement dominates
        directionRow = dr > 0 ? 1 : -1;
        directionCol = 0;
    } else if (Math.abs(dc) > Math.abs(dr)) {
        // Horizontal movement dominates
        directionRow = 0;
        directionCol = dc > 0 ? 1 : -1;
    } else if (dr !== 0 && dc !== 0) {
        // Diagonal movement
        directionRow = dr > 0 ? 1 : -1;
        directionCol = dc > 0 ? 1 : -1;
    }

    // Build path along direction
    const path: string[] = [];
    const maxDistance = Math.max(Math.abs(dr), Math.abs(dc));

    for (let i = 0; i <= maxDistance; i++) {
        const row = anchorTile.row + directionRow * i;
        const col = anchorTile.col + directionCol * i;

        if (row >= 0 && row < grid.size && col >= 0 && col < grid.size) {
            path.push(grid.tiles[row][col].id);
        }
    }

    return path;
}

/**
 * Find tile by ID
 */
function findTileById(grid: Grid, tileId: string): Tile | null {
    for (const row of grid.tiles) {
        for (const tile of row) {
            if (tile.id === tileId) {
                return tile;
            }
        }
    }
    return null;
}

/**
 * Check if two tiles are adjacent (for smoother selection)
 */
function isAdjacentTile(grid: Grid, tileId1: string, tileId2: string): boolean {
    const tile1 = findTileById(grid, tileId1);
    const tile2 = findTileById(grid, tileId2);

    if (!tile1 || !tile2) return false;

    const rowDiff = Math.abs(tile1.row - tile2.row);
    const colDiff = Math.abs(tile1.col - tile2.col);

    // Adjacent if row or col differs by 1 (including diagonals)
    return (rowDiff <= 1 && colDiff <= 1) && (rowDiff + colDiff > 0);
}

/**
 * Check if selection matches a word
 */
function checkWordMatch(
    state: WordSearchState
): {
    wordFound: string | null;
    roundComplete: boolean;
    needsRender: boolean;
} {
    const { selectionPath, anchorTileId } = state.selectionState;

    if (!state.grid || selectionPath.length < 3 || !anchorTileId) {
        return { wordFound: null, roundComplete: false, needsRender: true };
    }

    // Convert selection path to string
    const selectedWord = selectionPath
        .map(id => {
            if (!state.grid) return '';
            for (const row of state.grid.tiles) {
                for (const tile of row) {
                    if (tile.id === id) return tile.letter;
                }
            }
            return '';
        })
        .join('');

    // Check forward match
    for (const word of state.grid.words) {
        if (word.found || state.foundWords.has(word.text)) continue;

        if (word.text === selectedWord) {
            // Word found!
            word.found = true;
            state.foundWords.add(word.text);

            // Mark tiles as found
            for (const tileId of selectionPath) {
                state.foundTileIds.add(tileId);
            }

            // Check if round is complete
            const allFound = state.grid?.words.every(w => w.found) ?? false;

            if (allFound) {
                pilotAnalytics.logEvent('stage_completed', { gameId: 'wordSearch', stageId: state.chapter.toString() });
            }

            return {
                wordFound: word.text,
                roundComplete: allFound,
                needsRender: true
            };
        }
    }

    // Check backward match (if enabled)
    if (state.settings.backwardWords) {
        const reversedWord = selectedWord.split('').reverse().join('');

        for (const word of state.grid.words) {
            if (word.found || state.foundWords.has(word.text)) continue;

            if (word.text === reversedWord) {
                // Word found (backward)!
                word.found = true;
                state.foundWords.add(word.text);

                // Mark tiles as found
                for (const tileId of selectionPath) {
                    state.foundTileIds.add(tileId);
                }

                // Check if round is complete
                const allFound = state.grid?.words.every(w => w.found) ?? false;

                if (allFound) {
                    pilotAnalytics.logEvent('stage_completed', { gameId: 'wordSearch', stageId: state.chapter.toString() });
                }

                return {
                    wordFound: word.text,
                    roundComplete: allFound,
                    needsRender: true
                };
            }
        }
    }

    // No match - gentle fail feedback
    return { wordFound: null, roundComplete: false, needsRender: true };
}

