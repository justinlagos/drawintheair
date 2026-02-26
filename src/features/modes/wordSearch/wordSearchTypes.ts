/**
 * Word Search Types
 * 
 * Type definitions for the Word Search game module
 */

export type Difficulty = 'easy' | 'standard';
export type Chapter = 1 | 2 | 3;

export type Theme = 'animals' | 'colours' | 'family' | 'food' | 'toys' | 'nature';

export interface WordSearchSettings {
    difficulty: Difficulty;
    theme: Theme;
    sound: boolean;
    backwardWords: boolean;
    reduceMotion: boolean;
    chapter?: Chapter; // Current chapter (1-3)
}

export interface Tile {
    id: string;
    row: number;
    col: number;
    letter: string;
    x: number; // Normalized 0-1
    y: number; // Normalized 0-1
    width: number; // Normalized 0-1
    height: number; // Normalized 0-1
}

export interface Word {
    text: string;
    found: boolean;
    startTile: Tile | null;
    endTile: Tile | null;
}

export interface Grid {
    tiles: Tile[][];
    words: Word[];
    size: number; // rows/cols
}

export interface SelectionState {
    anchorTileId: string | null;
    currentTileId: string | null;
    selectionPath: string[]; // Array of tile IDs
    isActive: boolean;
}

export interface DwellState {
    tileId: string | null;
    startTime: number | null;
    stableFrames: number;
}

export interface HintState {
    lastActivityTime: number;
    lastPinchTime: number;
    lastWordFoundTime: number;
    currentPhase: 0 | 1 | 2 | 3;
    hintWordIndex: number | null;
    lastHintTime: number;
    hintCooldown: number;
}

