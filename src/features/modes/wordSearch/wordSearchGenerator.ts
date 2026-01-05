/**
 * Word Search Generator - Kid-First Design
 * 
 * Generates word search grids with:
 * - Progressive difficulty (horizontal → horizontal+vertical)
 * - Friendly fill letters (A, O, E, etc.) instead of random
 * - Chapter-based sizing and word counts
 */

import type { Grid, Tile, Difficulty, Chapter } from './wordSearchTypes';
import { GRID_SIZES, TILE_SIZES, FRIENDLY_FILL_LETTERS } from './wordSearchConstants';

interface Word {
    text: string;
    found: boolean;
    startTile: Tile | null;
    endTile: Tile | null;
}

/**
 * Generate a complete word search grid
 */
export function generateGrid(
    words: string[],
    difficulty: Difficulty,
    _theme: string,
    chapter?: Chapter
): Grid {
    // Use chapter-based sizing if chapter is provided, otherwise fall back to difficulty
    const size = chapter ? GRID_SIZES[chapter] : GRID_SIZES[difficulty];
    const tileSize = chapter ? TILE_SIZES[chapter] : TILE_SIZES[difficulty];
    
    // Initialize empty grid
    const tiles: Tile[][] = [];
    const grid: string[][] = [];
    
    for (let row = 0; row < size; row++) {
        tiles[row] = [];
        grid[row] = [];
        for (let col = 0; col < size; col++) {
            grid[row][col] = '';
        }
    }
    
    // Place words
    const placedWords: Word[] = [];
    const usedWords = new Set<string>();
    
    for (const word of words) {
        if (usedWords.has(word)) continue;
        
        const placement = tryPlaceWord(word, grid, size, difficulty, chapter);
        if (placement) {
            const { row, col, direction } = placement;
            placeWordInGrid(word, grid, row, col, direction);
            
            // Create tile references for start/end
            const startTile = tiles[row]?.[col] || null;
            const endRow = direction === 'down' ? row + word.length - 1 : row;
            const endCol = direction === 'right' ? col + word.length - 1 : 
                          direction === 'down-right' ? col + word.length - 1 : col;
            const endTile = tiles[endRow]?.[endCol] || null;
            
            placedWords.push({
                text: word,
                found: false,
                startTile,
                endTile
            });
            usedWords.add(word);
        }
    }
    
    // Fill remaining cells with FRIENDLY letters (not random A-Z)
    fillFriendlyLetters(grid, size);
    
    // Create tile objects - Center grid with proper offset
    // Account for side panel on desktop (right side takes ~280px)
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 900;
    const gridCenterX = isMobile ? 0.5 : 0.45; // Shift left slightly on desktop for side panel
    const gridCenterY = 0.52; // Slightly below center for top bar
    const totalGridSize = size * tileSize;
    const startX = gridCenterX - totalGridSize / 2;
    const startY = gridCenterY - totalGridSize / 2;
    
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const x = startX + col * tileSize;
            const y = startY + row * tileSize;
            
            tiles[row][col] = {
                id: `tile-${row}-${col}`,
                row,
                col,
                letter: grid[row][col],
                x,
                y,
                width: tileSize,
                height: tileSize
            };
        }
    }
    
    // Update word tile references now that tiles exist
    for (const word of placedWords) {
        const wordData = findWordInGrid(word.text, grid, size);
        if (wordData) {
            word.startTile = tiles[wordData.startRow][wordData.startCol];
            word.endTile = tiles[wordData.endRow][wordData.endCol];
        }
    }
    
    return {
        tiles,
        words: placedWords,
        size
    };
}

type Direction = 'right' | 'down' | 'down-right' | 'down-left' | 'left' | 'up' | 'up-right' | 'up-left';

interface Placement {
    row: number;
    col: number;
    direction: Direction;
}

/**
 * Try to place a word in the grid
 * Chapter-based directions:
 * - Chapter 1: Horizontal only (left to right)
 * - Chapter 2: Horizontal + Vertical
 * - Chapter 3: Horizontal + Vertical (no diagonals for EYFS)
 */
function tryPlaceWord(
    word: string,
    grid: string[][],
    size: number,
    difficulty: Difficulty,
    chapter?: Chapter
): Placement | null {
    const maxAttempts = 100;
    
    // Chapter-based directions - NO DIAGONALS for EYFS
    let directions: Direction[];
    if (chapter === 1) {
        directions = ['right']; // Chapter 1: horizontal only - easiest
    } else if (chapter === 2 || chapter === 3) {
        directions = ['right', 'down']; // Chapter 2-3: horizontal + vertical
    } else {
        // Legacy difficulty-based
        directions = difficulty === 'easy'
            ? ['right', 'down']
            : ['right', 'down']; // Still no diagonals
    }
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const direction = directions[Math.floor(Math.random() * directions.length)];
        const row = Math.floor(Math.random() * size);
        const col = Math.floor(Math.random() * size);
        
        if (canPlaceWord(word, grid, size, row, col, direction)) {
            return { row, col, direction };
        }
    }
    
    return null;
}

/**
 * Check if a word can be placed at a position
 */
function canPlaceWord(
    word: string,
    grid: string[][],
    size: number,
    row: number,
    col: number,
    direction: Direction
): boolean {
    const len = word.length;
    let dr = 0;
    let dc = 0;
    
    switch (direction) {
        case 'right':
            dc = 1;
            break;
        case 'down':
            dr = 1;
            break;
        case 'down-right':
            dr = 1;
            dc = 1;
            break;
        case 'down-left':
            dr = 1;
            dc = -1;
            break;
        case 'left':
            dc = -1;
            break;
        case 'up':
            dr = -1;
            break;
        case 'up-right':
            dr = -1;
            dc = 1;
            break;
        case 'up-left':
            dr = -1;
            dc = -1;
            break;
    }
    
    // Check bounds
    const endRow = row + dr * (len - 1);
    const endCol = col + dc * (len - 1);
    
    if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) {
        return false;
    }
    
    // Check if cells are empty or match
    for (let i = 0; i < len; i++) {
        const r = row + dr * i;
        const c = col + dc * i;
        const cell = grid[r][c];
        if (cell !== '' && cell !== word[i]) {
            return false;
        }
    }
    
    return true;
}

/**
 * Place a word in the grid
 */
function placeWordInGrid(
    word: string,
    grid: string[][],
    row: number,
    col: number,
    direction: Direction
): void {
    const len = word.length;
    let dr = 0;
    let dc = 0;
    
    switch (direction) {
        case 'right':
            dc = 1;
            break;
        case 'down':
            dr = 1;
            break;
        case 'down-right':
            dr = 1;
            dc = 1;
            break;
        case 'down-left':
            dr = 1;
            dc = -1;
            break;
        case 'left':
            dc = -1;
            break;
        case 'up':
            dr = -1;
            break;
        case 'up-right':
            dr = -1;
            dc = 1;
            break;
        case 'up-left':
            dr = -1;
            dc = -1;
            break;
    }
    
    for (let i = 0; i < len; i++) {
        const r = row + dr * i;
        const c = col + dc * i;
        grid[r][c] = word[i];
    }
}

/**
 * Find word in grid (for updating tile references)
 */
function findWordInGrid(
    word: string,
    grid: string[][],
    size: number
): { startRow: number; startCol: number; endRow: number; endCol: number } | null {
    const directions: Direction[] = ['right', 'down', 'down-right', 'down-left', 'left', 'up', 'up-right', 'up-left'];
    
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            for (const direction of directions) {
                if (matchesWordAt(word, grid, size, row, col, direction)) {
                    const len = word.length;
                    let dr = 0;
                    let dc = 0;
                    
                    switch (direction) {
                        case 'right': dc = 1; break;
                        case 'down': dr = 1; break;
                        case 'down-right': dr = 1; dc = 1; break;
                        case 'down-left': dr = 1; dc = -1; break;
                        case 'left': dc = -1; break;
                        case 'up': dr = -1; break;
                        case 'up-right': dr = -1; dc = 1; break;
                        case 'up-left': dr = -1; dc = -1; break;
                    }
                    
                    return {
                        startRow: row,
                        startCol: col,
                        endRow: row + dr * (len - 1),
                        endCol: col + dc * (len - 1)
                    };
                }
            }
        }
    }
    
    return null;
}

/**
 * Check if word matches at position
 */
function matchesWordAt(
    word: string,
    grid: string[][],
    size: number,
    row: number,
    col: number,
    direction: Direction
): boolean {
    const len = word.length;
    let dr = 0;
    let dc = 0;
    
    switch (direction) {
        case 'right': dc = 1; break;
        case 'down': dr = 1; break;
        case 'down-right': dr = 1; dc = 1; break;
        case 'down-left': dr = 1; dc = -1; break;
        case 'left': dc = -1; break;
        case 'up': dr = -1; break;
        case 'up-right': dr = -1; dc = 1; break;
        case 'up-left': dr = -1; dc = -1; break;
    }
    
    const endRow = row + dr * (len - 1);
    const endCol = col + dc * (len - 1);
    
    if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) {
        return false;
    }
    
    for (let i = 0; i < len; i++) {
        const r = row + dr * i;
        const c = col + dc * i;
        if (grid[r][c] !== word[i]) {
            return false;
        }
    }
    
    return true;
}

/**
 * Fill empty cells with FRIENDLY letters
 * Instead of random A-Z, use vowels and common letters
 * that don't accidentally form confusing words
 */
function fillFriendlyLetters(grid: string[][], size: number): void {
    // Weighted friendly letters - more vowels for kid-friendly look
    const weightedLetters = [
        ...FRIENDLY_FILL_LETTERS,
        'A', 'E', 'O', // Extra weight on vowels
        'A', 'E', 'O',
        'A', 'E'
    ];
    
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            if (grid[row][col] === '') {
                grid[row][col] = weightedLetters[Math.floor(Math.random() * weightedLetters.length)];
            }
        }
    }
}
