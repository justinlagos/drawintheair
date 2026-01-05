/**
 * Word Search Constants
 * 
 * Tuning values for the Word Search game - Kid-first EYFS design
 */

// Grid configuration - Progressive chapter-based level system
export const GRID_SIZES = {
    easy: 4,      // Legacy: Level 1
    standard: 5,  // Legacy: Level 2
    hard: 6,      // Legacy: Level 3
    // Chapter-based sizes (these are the active ones)
    1: 4,         // Chapter 1: 4x4 grid, 2 words, horizontal only
    2: 5,         // Chapter 2: 5x5 grid, 3 words, horizontal + vertical
    3: 6          // Chapter 3: 6x6 grid, 4 words, horizontal + vertical
} as const;

// Tile sizing (normalized 0-1) - Bigger tiles for kids
export const TILE_SIZES = {
    easy: 0.12,    // Legacy
    standard: 0.10, // Legacy
    hard: 0.085,   // Legacy
    // Chapter-based sizes - BIGGER for kids
    1: 0.14,       // Chapter 1: 4x4 grid - biggest tiles
    2: 0.11,       // Chapter 2: 5x5 grid
    3: 0.095       // Chapter 3: 6x6 grid
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

// Word count per chapter - PROGRESSIVE DIFFICULTY
// Level 1: 3-4 words (horizontal only)
// Level 2: 5-6 words (horizontal + vertical)
// Level 3+: gradual increase
export const WORD_COUNTS = {
    easy: 3,      // Legacy
    standard: 5,  // Legacy
    hard: 6,      // Legacy
    // Chapter-based word counts
    1: 3,         // Chapter 1: 3-4 words, horizontal only, large letters
    2: 5,         // Chapter 2: 5-6 words, horizontal + vertical
    3: 6          // Chapter 3: 6+ words, gradual increase
} as const;

// Word length constraints per chapter - Simple words for kids
export const WORD_LENGTHS = {
    1: { min: 3, max: 3 },  // Chapter 1: length 3 only (CAT, DOG, SUN)
    2: { min: 3, max: 4 },  // Chapter 2: length 3 to 4
    3: { min: 3, max: 4 }   // Chapter 3: length 3 to 4
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
