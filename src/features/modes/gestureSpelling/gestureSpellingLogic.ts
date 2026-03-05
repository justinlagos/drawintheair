/**
 * Gesture Spelling Logic
 *
 * A picture emoji appears with the word to spell.
 * Shuffled letter tiles sit below. Kids hover each tile
 * in the correct order (0.7 s dwell) to spell the word.
 *
 * Correct letter → locks in green.
 * Wrong letter   → wobble, no penalty.
 * Complete word  → celebration, next word auto-advances.
 */

import type { DrawingUtils } from '@mediapipe/tasks-vision';
import type { TrackingFrameData } from '../../tracking/TrackingLayer';
import { normalizedToCanvas } from '../../../core/coordinateUtils';

// ─────────────────────────────────────────────────────────────────────────────
// Word list (picture + word pairs)
// ─────────────────────────────────────────────────────────────────────────────

export interface SpellingWord {
    word: string;
    emoji: string;
    category: string;
}

const WORD_LIST: SpellingWord[] = [
    // 3-letter words (easy set)
    { word: 'CAT', emoji: '🐱', category: 'Animals' },
    { word: 'DOG', emoji: '🐶', category: 'Animals' },
    { word: 'SUN', emoji: '☀️', category: 'Nature' },
    { word: 'BEE', emoji: '🐝', category: 'Animals' },
    { word: 'HEN', emoji: '🐔', category: 'Animals' },
    { word: 'FOX', emoji: '🦊', category: 'Animals' },
    { word: 'PIG', emoji: '🐷', category: 'Animals' },
    { word: 'ANT', emoji: '🐜', category: 'Animals' },
    { word: 'HAT', emoji: '🎩', category: 'Clothes' },
    { word: 'CUP', emoji: '☕', category: 'Objects' },
    { word: 'BUS', emoji: '🚌', category: 'Transport' },
    { word: 'MAP', emoji: '🗺️', category: 'Objects' },
    { word: 'EGG', emoji: '🥚', category: 'Food' },
    { word: 'JAM', emoji: '🍓', category: 'Food' },
    { word: 'KEY', emoji: '🔑', category: 'Objects' },
    // 4-letter words (medium)
    { word: 'BIRD', emoji: '🐦', category: 'Animals' },
    { word: 'FROG', emoji: '🐸', category: 'Animals' },
    { word: 'BEAR', emoji: '🐻', category: 'Animals' },
    { word: 'CAKE', emoji: '🎂', category: 'Food' },
    { word: 'MILK', emoji: '🥛', category: 'Food' },
    { word: 'STAR', emoji: '⭐', category: 'Nature' },
    { word: 'MOON', emoji: '🌙', category: 'Nature' },
    { word: 'FISH', emoji: '🐠', category: 'Animals' },
    { word: 'BOOK', emoji: '📚', category: 'Objects' },
    { word: 'BELL', emoji: '🔔', category: 'Objects' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export interface LetterTile {
    id: number;
    letter: string;
    x: number;     // 0-1 normalized
    y: number;
    width: number; // 0-1
    height: number;
    status: 'idle' | 'correct' | 'wrong';
    wrongTime: number;
    dwellStart: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DWELL_MS = 700;
const TILE_W = 0.08;
const TILE_H = 0.10;
const WRONG_FLASH_MS = 400;

// ─────────────────────────────────────────────────────────────────────────────
// Module-level state
// ─────────────────────────────────────────────────────────────────────────────

let currentWord: SpellingWord = WORD_LIST[0];
let tiles: LetterTile[] = [];
let typedSoFar: string[] = [];
let wordComplete = false;
let celebrationTime = 0;
let wordsSpelled = 0;
let tileIdCounter = 0;
let usedWordIndices: number[] = [];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function pickNextWord(): SpellingWord {
    const available = WORD_LIST
        .map((w, i) => ({ w, i }))
        .filter(({ i }) => !usedWordIndices.includes(i));

    if (available.length === 0) {
        usedWordIndices = [];
        return WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
    }
    const pick = available[Math.floor(Math.random() * available.length)];
    usedWordIndices.push(pick.i);
    return pick.w;
}

function buildTiles(word: SpellingWord): LetterTile[] {
    const letters = word.word.split('');
    // Add 2-3 distractor letters (not in the word)
    const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const distractors = shuffle(allLetters.filter(l => !letters.includes(l))).slice(0, Math.min(3, 6 - letters.length));
    const pool = shuffle([...letters, ...distractors]);

    const count = pool.length;
    const totalWidth = count * TILE_W + (count - 1) * 0.015;
    const startX = (1 - totalWidth) / 2;

    return pool.map((letter, i) => ({
        id: tileIdCounter++,
        letter,
        x: startX + i * (TILE_W + 0.015),
        y: 0.6,
        width: TILE_W,
        height: TILE_H,
        status: 'idle' as const,
        wrongTime: 0,
        dwellStart: null,
    }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export function initGestureSpelling(): void {
    wordsSpelled = 0;
    usedWordIndices = [];
    currentWord = pickNextWord();
    tiles = buildTiles(currentWord);
    typedSoFar = [];
    wordComplete = false;
    celebrationTime = 0;
}

export function getSpellingCurrentWord(): SpellingWord { return currentWord; }
export function getSpellingTypedSoFar(): string[] { return typedSoFar; }
export function isSpellingWordComplete(): boolean { return wordComplete; }
export function getSpellingCelebrationTime(): number { return celebrationTime; }
export function getSpellingWordsSpelled(): number { return wordsSpelled; }

export function advanceToNextWord(): void {
    wordsSpelled++;
    currentWord = pickNextWord();
    tiles = buildTiles(currentWord);
    typedSoFar = [];
    wordComplete = false;
    celebrationTime = 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Canvas drawing
// ─────────────────────────────────────────────────────────────────────────────

function drawTile(
    ctx: CanvasRenderingContext2D,
    tile: LetterTile,
    width: number,
    height: number,
    now: number,
): void {
    const tc = normalizedToCanvas({ x: tile.x, y: tile.y }, width, height);
    const tw = tile.width * width;
    const th = tile.height * height;
    const r = 16; // corner radius

    // Wobble on wrong
    let wobbleX = 0;
    if (tile.status === 'wrong') {
        const age = now - tile.wrongTime;
        wobbleX = Math.sin(age * 0.08) * 10 * Math.max(0, 1 - age / WRONG_FLASH_MS);
    }

    const x = tc.x + wobbleX;
    const y = tc.y;

    // Background colour by status
    const bgColors: Record<string, string> = {
        idle: 'rgba(255,255,255,0.15)',
        correct: 'rgba(0,230,118,0.4)',
        wrong: 'rgba(255,82,82,0.4)',
    };
    const borderColors: Record<string, string> = {
        idle: 'rgba(255,255,255,0.35)',
        correct: '#00e676',
        wrong: '#ff5252',
    };

    // Tile shadow
    ctx.shadowBlur = tile.status === 'idle' ? 8 : 20;
    ctx.shadowColor = tile.status === 'correct' ? '#00e67688' :
        tile.status === 'wrong' ? '#ff525288' :
            'rgba(0,0,0,0.4)';

    // Rounded rectangle fill
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + tw - r, y);
    ctx.quadraticCurveTo(x + tw, y, x + tw, y + r);
    ctx.lineTo(x + tw, y + th - r);
    ctx.quadraticCurveTo(x + tw, y + th, x + tw - r, y + th);
    ctx.lineTo(x + r, y + th);
    ctx.quadraticCurveTo(x, y + th, x, y + th - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();

    ctx.fillStyle = bgColors[tile.status];
    ctx.fill();
    ctx.strokeStyle = borderColors[tile.status];
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    // Letter
    ctx.save();
    ctx.font = `bold ${Math.round(th * 0.58)}px Outfit, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = tile.status === 'idle' ? '#ffffff' : tile.status === 'correct' ? '#00ff88' : '#ff8888';
    ctx.fillText(tile.letter, x + tw / 2, y + th / 2);
    ctx.restore();
}

function drawDwellRing(
    ctx: CanvasRenderingContext2D,
    tile: LetterTile,
    progress: number,
    width: number,
    height: number,
): void {
    const tc = normalizedToCanvas({ x: tile.x + tile.width / 2, y: tile.y + tile.height / 2 }, width, height);
    const r = (Math.max(tile.width * width, tile.height * height) / 2) + 8;
    ctx.beginPath();
    ctx.arc(tc.x, tc.y, r, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    ctx.strokeStyle = '#FFD93D';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.stroke();
}

// ─────────────────────────────────────────────────────────────────────────────
// Core per-frame logic
// ─────────────────────────────────────────────────────────────────────────────

export const gestureSpellingLogic = (
    ctx: CanvasRenderingContext2D,
    frameData: TrackingFrameData,
    width: number,
    height: number,
    _drawingUtils: DrawingUtils | null,
): void => {
    if (!currentWord) initGestureSpelling();

    const now = Date.now();
    const { filteredPoint } = frameData;

    // ── Background ────────────────────────────────────────────────────────────
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#0d0838');
    bg.addColorStop(0.5, '#1a0f5c');
    bg.addColorStop(1, '#0c1a3d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Scattered sparkles
    for (let i = 0; i < 25; i++) {
        const sx = ((i * 131 + 37) % 100) / 100 * width;
        const sy = ((i * 79 + 13) % 65) / 100 * height;
        const alpha = 0.3 + 0.5 * Math.abs(Math.sin(now * 0.0008 + i));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx, sy, 2, 2);
    }
    ctx.globalAlpha = 1;

    // ── Big picture emoji ─────────────────────────────────────────────────────
    const emojiSize = Math.min(width, height) * 0.18;
    ctx.font = `${emojiSize}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(currentWord.emoji, width / 2, height * 0.26);

    // ── Blank/filled letters strip ────────────────────────────────────────────
    const word = currentWord.word;
    const blankSize = Math.min(width, height) * 0.07;
    const blankGap = Math.min(width, height) * 0.015;
    const totalBlanksW = word.length * blankSize + (word.length - 1) * blankGap;
    const blankStartX = (width - totalBlanksW) / 2;
    const blankY = height * 0.46;

    for (let i = 0; i < word.length; i++) {
        const bx = blankStartX + i * (blankSize + blankGap);
        const filled = i < typedSoFar.length;

        // Underline
        ctx.beginPath();
        ctx.moveTo(bx, blankY + blankSize);
        ctx.lineTo(bx + blankSize, blankY + blankSize);
        ctx.strokeStyle = filled ? '#00e676' : 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();

        if (filled) {
            ctx.save();
            ctx.font = `bold ${Math.round(blankSize * 0.85)}px Outfit, system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#00e676';
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#00e67688';
            ctx.fillText(typedSoFar[i], bx + blankSize / 2, blankY + blankSize / 2);
            ctx.restore();
        }
    }

    // ── Letter tiles ──────────────────────────────────────────────────────────
    const nextExpected = word[typedSoFar.length];
    const fingerCanvas = filteredPoint ? normalizedToCanvas(filteredPoint, width, height) : null;

    // Dwell detection + correct/wrong logic
    if (fingerCanvas && !wordComplete) {
        tiles.forEach(tile => {
            if (tile.status === 'correct') return;

            const tc = normalizedToCanvas({ x: tile.x, y: tile.y }, width, height);
            const tw = tile.width * width;
            const th = tile.height * height;

            if (
                fingerCanvas.x >= tc.x && fingerCanvas.x <= tc.x + tw &&
                fingerCanvas.y >= tc.y && fingerCanvas.y <= tc.y + th
            ) {
                if (tile.dwellStart === null) tile.dwellStart = now;
                const elapsed = now - tile.dwellStart;

                if (elapsed >= DWELL_MS) {
                    tile.dwellStart = null;
                    if (tile.letter === nextExpected) {
                        tile.status = 'correct';
                        typedSoFar.push(tile.letter);

                        if (typedSoFar.length >= word.length) {
                            wordComplete = true;
                            celebrationTime = now;
                        }
                    } else {
                        tile.status = 'wrong';
                        tile.wrongTime = now;
                        // Reset wrong status after animation
                        setTimeout(() => { tile.status = 'idle'; }, WRONG_FLASH_MS + 50);
                    }
                }
            } else {
                tile.dwellStart = null;
            }
        });
    }

    // Draw tiles
    tiles.forEach(tile => {
        drawTile(ctx, tile, width, height, now);
        // Dwell ring on hovered tile
        if (tile.dwellStart !== null && tile.status !== 'correct') {
            const progress = Math.min((now - tile.dwellStart) / DWELL_MS, 1);
            drawDwellRing(ctx, tile, progress, width, height);
        }
    });

    // ── Category badge ────────────────────────────────────────────────────────
    ctx.save();
    ctx.font = `600 ${Math.round(Math.min(width, height) * 0.025)}px Outfit, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText(currentWord.category, width / 2, height * 0.4);
    ctx.restore();

    // ── Instruction ───────────────────────────────────────────────────────────
    if (!wordComplete) {
        ctx.save();
        ctx.font = `600 ${Math.round(Math.min(width, height) * 0.028)}px Outfit, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.fillText(
            typedSoFar.length === 0
                ? 'Hover over each letter to spell the word!'
                : `Next letter: "${nextExpected}" — hover over it!`,
            width / 2,
            height * 0.56,
        );
        ctx.restore();
    }

    // ── Finger cursor ─────────────────────────────────────────────────────────
    if (fingerCanvas) {
        ctx.beginPath();
        ctx.arc(fingerCanvas.x, fingerCanvas.y, 17, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fill();
        ctx.strokeStyle = '#FFD93D';
        ctx.lineWidth = 3;
        ctx.stroke();
    }
};
