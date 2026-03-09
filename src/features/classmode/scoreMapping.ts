/**
 * Score extraction and star mapping for all 9 game modes.
 * Maps raw game scores → 1-5 stars for the Class Mode leaderboard.
 */

// Import score getters from each game logic module
import { getScore as getBubbleScore } from '../modes/calibration/bubbleCalibrationLogic';
import { getScore as getSortScore } from '../modes/sortAndPlace/sortAndPlaceLogic';
import { getScore as getColourScore } from '../modes/colourBuilder/colourBuilderLogic';
import { getBalloonMathScore } from '../modes/balloonMath/balloonMathLogic';
import { getProgress as getPreWritingProgress } from '../modes/preWriting/preWritingLogic';
import { getRainbowTotalCompleted } from '../modes/rainbowBridge/rainbowBridgeLogic';
import { getSpellingWordsSpelled } from '../modes/gestureSpelling/gestureSpellingLogic';

// Word Search uses a different state pattern — we'll handle it separately
// Free Paint has no score (creative mode)

export type GameModeId =
  | 'calibration'
  | 'free'
  | 'pre-writing'
  | 'sort-and-place'
  | 'word-search'
  | 'colour-builder'
  | 'balloon-math'
  | 'rainbow-bridge'
  | 'gesture-spelling';

/**
 * Get the current raw score for a game mode.
 * Returns 0 if the mode has no score concept (e.g. Free Paint).
 */
export function getRawScore(mode: GameModeId): number {
  switch (mode) {
    case 'calibration':
      return getBubbleScore();
    case 'sort-and-place':
      return getSortScore();
    case 'colour-builder':
      return getColourScore();
    case 'balloon-math':
      return getBalloonMathScore();
    case 'pre-writing':
      return Math.round(getPreWritingProgress() * 100); // 0-100 scale
    case 'rainbow-bridge':
      return getRainbowTotalCompleted();
    case 'gesture-spelling':
      return getSpellingWordsSpelled();
    case 'free':
      return 0; // Free Paint — no competitive score
    case 'word-search':
      return 0; // Will be wired when word search exposes a getter
    default:
      return 0;
  }
}

/**
 * Star thresholds per mode.
 * Array of 4 thresholds: [2-star, 3-star, 4-star, 5-star]
 * Any score > 0 earns at least 1 star.
 */
const STAR_THRESHOLDS: Record<GameModeId, [number, number, number, number]> = {
  'calibration':      [5, 10, 18, 25],       // bubbles popped
  'balloon-math':     [3, 6, 10, 15],        // correct answers
  'pre-writing':      [20, 40, 65, 85],      // progress %
  'sort-and-place':   [3, 6, 9, 12],         // items sorted
  'colour-builder':   [3, 6, 10, 15],        // blocks placed
  'rainbow-bridge':   [2, 4, 6, 8],          // patterns completed
  'gesture-spelling': [2, 4, 6, 8],          // words spelled
  'word-search':      [1, 2, 3, 4],          // words found
  'free':             [1, 1, 1, 1],           // not competitive
};

/**
 * Convert a raw score into 1-5 stars.
 */
export function rawToStars(mode: GameModeId, rawScore: number): number {
  if (rawScore <= 0) return 1; // Participation star

  const thresholds = STAR_THRESHOLDS[mode];
  if (rawScore >= thresholds[3]) return 5;
  if (rawScore >= thresholds[2]) return 4;
  if (rawScore >= thresholds[1]) return 3;
  if (rawScore >= thresholds[0]) return 2;
  return 1;
}

/**
 * Human-friendly labels for modes.
 */
export const MODE_LABELS: Record<GameModeId, { title: string; icon: string }> = {
  'calibration':      { title: 'Bubble Pop', icon: '🫧' },
  'free':             { title: 'Free Paint', icon: '🎨' },
  'pre-writing':      { title: 'Tracing', icon: '✏️' },
  'sort-and-place':   { title: 'Sort & Place', icon: '🗂️' },
  'word-search':      { title: 'Word Search', icon: '🔍' },
  'colour-builder':   { title: 'Colour Builder', icon: '🎨' },
  'balloon-math':     { title: 'Balloon Math', icon: '🎈' },
  'rainbow-bridge':   { title: 'Rainbow Bridge', icon: '🌈' },
  'gesture-spelling': { title: 'Spelling Stars', icon: '✍️' },
};

/** All modes that support competitive scoring in Class Mode */
export const SCOREABLE_MODES: GameModeId[] = [
  'calibration',
  'balloon-math',
  'pre-writing',
  'sort-and-place',
  'colour-builder',
  'rainbow-bridge',
  'gesture-spelling',
  'word-search',
  'free',
];
