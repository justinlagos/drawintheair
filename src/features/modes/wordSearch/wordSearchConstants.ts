/**
 * Word Search Constants
 * 
 * Tuning values for the Word Search game - Kid-first EYFS design
 */

// Grid configuration — 6-chapter progression (used to be 3).
//   1 4×4   horizontal only           — gentle warm-up
//   2 5×5   horizontal + vertical     — both axes
//   3 6×6   H + V                     — bigger grid
//   4 7×7   H + V + diagonal          — diagonals introduced
//   5 8×8   H + V + diagonal          — bigger grid
//   6 9×9   H + V + diagonal + reverse — full challenge
export const GRID_SIZES = {
    easy: 4,
    standard: 5,
    hard: 6,
    advanced: 7,
    1: 4,
    2: 5,
    3: 6,
    4: 7,
    5: 8,
    6: 9,
} as const;

// Tile sizing (normalized 0-1) — bigger for early chapters, more density later.
export const TILE_SIZES = {
    easy: 0.120,
    standard: 0.100,
    hard: 0.085,
    advanced: 0.075,
    1: 0.14,
    2: 0.11,
    3: 0.095,
    4: 0.082,
    5: 0.072,
    6: 0.064,
} as const;

// Dwell smoothing - More forgiving for kids
export const DWELL_TIME_MS = 80; // Slightly faster response
export const STABLE_FRAMES = 2; // Consecutive frames needed for stability

// Selection thresholds
export const MIN_SELECTION_LENGTH = 3; // Minimum tiles to form a word
export const MAX_SELECTION_LENGTH = 15; // Maximum tiles in selection

// Grid padding (normalized) - More padding for centered look
export const GRID_PADDING = 0.12; // 12% padding on all sides

// Visual constants - Softer, kid-friendly
export const TILE_BORDER_RADIUS = 0.22; // 22% of tile size - rounder corners
export const HOVER_GLOW_INTENSITY = 0.4; // Slightly more visible hover
export const SELECTION_GLOW_INTENSITY = 0.7; // Clear selection feedback
export const FOUND_GLOW_INTENSITY = 0.5;

// Word count per chapter — progressive difficulty across 6 chapters.
export const WORD_COUNTS = {
    easy: 3,
    standard: 5,
    hard: 6,
    advanced: 7,
    1: 3,
    2: 4,
    3: 5,
    4: 6,
    5: 7,
    6: 8,
} as const;

// Word length constraints per chapter.
//   1: 3-letter words only  (CAT, DOG, SUN)
//   2: 3-4 letters          (BIRD, FISH)
//   3: 3-5 letters          (HORSE, SNAKE)
//   4: 4-5 letters          (LEMON, APPLE)
//   5: 4-6 letters          (FRIEND, COUSIN)
//   6: 5-7 letters          (KITCHEN, GARDEN)
export const WORD_LENGTHS = {
    1: { min: 3, max: 3 },
    2: { min: 3, max: 4 },
    3: { min: 3, max: 5 },
    4: { min: 4, max: 5 },
    5: { min: 4, max: 6 },
    6: { min: 5, max: 7 },
    // Named difficulty tiers (Easy 3–5, Medium 5–7, Advanced 7–10)
    easy: { min: 3, max: 5 },
    medium: { min: 5, max: 7 },
    advanced: { min: 7, max: 10 },
} as const;

// Hint system constants - Gentle hints (5-7s idle)
export const HINT_TIMINGS = {
    IDLE_THRESHOLD: 5500,      // 5.5s no pinch + no hover (gentle hint start)
    NO_PROGRESS_THRESHOLD: 9000, // 9s pinch attempts but no word found
    PHASE_2_THRESHOLD: 9000,   // 9s for phase 2
    PHASE_3_THRESHOLD: 14000,  // 14s for phase 3
    COOLDOWN: 8000,            // 8s cooldown between hints
    FULL_WORD_REVEAL_DURATION: 800 // 800ms reveal duration
} as const;

// Friendly fill letters - used instead of random letters
// These are easy vowels and common letters that don't form confusing patterns
export const FRIENDLY_FILL_LETTERS = ['A', 'E', 'O', 'I', 'U', 'S', 'T', 'N', 'R'];
