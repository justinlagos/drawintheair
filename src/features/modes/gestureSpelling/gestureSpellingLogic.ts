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
import { logEvent } from '../../../lib/analytics';

// ─────────────────────────────────────────────────────────────────────────────
// Word list (picture + word pairs)
// ─────────────────────────────────────────────────────────────────────────────

export interface SpellingWord {
    word: string;
    emoji: string;
    category: string;
}

/**
 * Words organised in 4 tiers by length for progressive difficulty.
 * The pickNextWord helper selects from the appropriate tier based on
 * how many words the player has already spelled (`wordsSpelled`).
 *
 *   tier 1 (1–5):    3-letter words
 *   tier 2 (6–10):   4-letter words
 *   tier 3 (11–15):  5-letter words
 *   tier 4 (16+):    6-letter words (loops back, stays at this tier)
 */
const WORD_LIST_TIER_1: SpellingWord[] = [
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
];

const WORD_LIST_TIER_2: SpellingWord[] = [
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
    { word: 'TREE', emoji: '🌳', category: 'Nature' },
    { word: 'LEAF', emoji: '🍃', category: 'Nature' },
    { word: 'BALL', emoji: '⚽', category: 'Toys' },
    { word: 'KITE', emoji: '🪁', category: 'Toys' },
    { word: 'DUCK', emoji: '🦆', category: 'Animals' },
];

const WORD_LIST_TIER_3: SpellingWord[] = [
    { word: 'APPLE', emoji: '🍎', category: 'Food' },
    { word: 'BREAD', emoji: '🍞', category: 'Food' },
    { word: 'GRAPE', emoji: '🍇', category: 'Food' },
    { word: 'HORSE', emoji: '🐴', category: 'Animals' },
    { word: 'TIGER', emoji: '🐯', category: 'Animals' },
    { word: 'PANDA', emoji: '🐼', category: 'Animals' },
    { word: 'WHALE', emoji: '🐳', category: 'Animals' },
    { word: 'CLOUD', emoji: '☁️', category: 'Nature' },
    { word: 'TRAIN', emoji: '🚂', category: 'Transport' },
    { word: 'PIANO', emoji: '🎹', category: 'Music' },
    { word: 'PLANE', emoji: '✈️', category: 'Transport' },
    { word: 'PIZZA', emoji: '🍕', category: 'Food' },
];

const WORD_LIST_TIER_4: SpellingWord[] = [
    { word: 'GUITAR', emoji: '🎸', category: 'Music' },
    { word: 'ROCKET', emoji: '🚀', category: 'Transport' },
    { word: 'BANANA', emoji: '🍌', category: 'Food' },
    { word: 'CARROT', emoji: '🥕', category: 'Food' },
    { word: 'TURTLE', emoji: '🐢', category: 'Animals' },
    { word: 'RABBIT', emoji: '🐰', category: 'Animals' },
    { word: 'FLOWER', emoji: '🌷', category: 'Nature' },
    { word: 'PUZZLE', emoji: '🧩', category: 'Toys' },
    { word: 'CASTLE', emoji: '🏰', category: 'Objects' },
    { word: 'PENCIL', emoji: '✏️', category: 'Objects' },
];

// Combined list — kept for any callers that iterate everything.
const WORD_LIST: SpellingWord[] = [
    ...WORD_LIST_TIER_1,
    ...WORD_LIST_TIER_2,
    ...WORD_LIST_TIER_3,
    ...WORD_LIST_TIER_4,
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

/**
 * Pick the next word using tier-based difficulty progression.
 *   spelled  0–4   → tier 1 (3-letter)
 *   spelled  5–9   → tier 2 (4-letter)
 *   spelled 10–14  → tier 3 (5-letter)
 *   spelled 15+    → tier 4 (6-letter, loops within tier)
 * Inside the active tier, words don't repeat until the tier is exhausted.
 */
function pickNextWord(): SpellingWord {
    const tier =
        wordsSpelled < 5  ? WORD_LIST_TIER_1 :
        wordsSpelled < 10 ? WORD_LIST_TIER_2 :
        wordsSpelled < 15 ? WORD_LIST_TIER_3 :
                            WORD_LIST_TIER_4;

    // Find global indices for words in the active tier.
    const tierIndices: number[] = tier.map(w => WORD_LIST.indexOf(w));
    const available = tierIndices.filter(i => !usedWordIndices.includes(i));

    // If we've cycled through this tier, clear ONLY this tier's used flags
    // so the next-tier transition still works clean.
    if (available.length === 0) {
        usedWordIndices = usedWordIndices.filter(i => !tierIndices.includes(i));
        const refreshed = tierIndices;
        const pick = refreshed[Math.floor(Math.random() * refreshed.length)];
        usedWordIndices.push(pick);
        return WORD_LIST[pick];
    }

    const pick = available[Math.floor(Math.random() * available.length)];
    usedWordIndices.push(pick);
    return WORD_LIST[pick];
}

function buildTiles(word: SpellingWord): LetterTile[] {
    const letters = word.word.split('');
    const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    // Distractor count scales with how many words the player has spelled,
    // so the tile pool gets fuller (harder to spot the right letter) over
    // time. Capped to keep the pool from overflowing the screen.
    const baseDistractors =
        wordsSpelled < 5  ? 2 :
        wordsSpelled < 10 ? 3 :
        wordsSpelled < 15 ? 4 :
                            5;
    const maxPoolSize = 9; // hard cap so tiles still fit
    const distractorCount = Math.min(baseDistractors, maxPoolSize - letters.length);

    const distractors = shuffle(
        allLetters.filter(l => !letters.includes(l)),
    ).slice(0, Math.max(0, distractorCount));
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

// Tier B/C analytics: per-word timing.
let wordStartedAt = 0;

export function initGestureSpelling(): void {
    wordsSpelled = 0;
    usedWordIndices = [];
    currentWord = pickNextWord();
    tiles = buildTiles(currentWord);
    typedSoFar = [];
    wordComplete = false;
    celebrationTime = 0;
    wordStartedAt = Date.now();
    logEvent('stage_started', {
        game_mode: 'gesture-spelling',
        stage_id: currentWord.word,
        meta: { word: currentWord.word, length: currentWord.word.length },
    });
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
    wordStartedAt = Date.now();
    logEvent('stage_started', {
        game_mode: 'gesture-spelling',
        stage_id: currentWord.word,
        meta: { word: currentWord.word, length: currentWord.word.length, words_spelled: wordsSpelled },
    });
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

    // Bright Kid-UI palette per status
    const fillTop: Record<string, string> = {
        idle: '#FFFFFF',
        correct: 'rgba(126, 217, 87, 0.55)',  // meadow green
        wrong: 'rgba(255, 107, 107, 0.55)',   // coral
    };
    const fillBot: Record<string, string> = {
        idle: '#F4FAFF',
        correct: 'rgba(126, 217, 87, 0.30)',
        wrong: 'rgba(255, 107, 107, 0.30)',
    };
    const borderColors: Record<string, string> = {
        idle: 'rgba(108, 63, 164, 0.20)',
        correct: '#7ED957',
        wrong: '#FF6B6B',
    };
    const letterColors: Record<string, string> = {
        idle: '#3F4052',     // charcoal
        correct: '#3F4052',  // stays charcoal on green for contrast
        wrong: '#3F4052',
    };

    // Drop shadow / soft glow
    ctx.save();
    ctx.shadowColor =
        tile.status === 'correct' ? 'rgba(126, 217, 87, 0.55)'
        : tile.status === 'wrong' ? 'rgba(255, 107, 107, 0.50)'
        : 'rgba(108, 63, 164, 0.18)';
    ctx.shadowBlur = tile.status === 'idle' ? 6 : 18;
    ctx.shadowOffsetY = tile.status === 'idle' ? 3 : 0;

    // Card body — vertical gradient
    const tileGrad = ctx.createLinearGradient(x, y, x, y + th);
    tileGrad.addColorStop(0, fillTop[tile.status]);
    tileGrad.addColorStop(1, fillBot[tile.status]);
    ctx.fillStyle = tileGrad;
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
    ctx.fill();
    ctx.restore();

    // Top inner highlight — pillowy face
    ctx.save();
    ctx.globalAlpha = 0.6;
    const sheen = ctx.createLinearGradient(x, y, x, y + th * 0.45);
    sheen.addColorStop(0, 'rgba(255,255,255,0.95)');
    sheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 2, tw - 4, th * 0.45, r - 2);
    ctx.fill();
    ctx.restore();

    // Border
    ctx.strokeStyle = borderColors[tile.status];
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(x, y, tw, th, r);
    ctx.stroke();

    // Letter — Fredoka bold, charcoal
    ctx.save();
    ctx.font = `700 ${Math.round(th * 0.58)}px Fredoka, "Baloo 2", system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = letterColors[tile.status];
    ctx.fillText(tile.letter, x + tw / 2, y + th / 2 + 1);
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
    ctx.strokeStyle = '#FFD84D'; // sunshine — design-system reward tone
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

    // ── Transparent canvas — HTML background layer (HTML/SVG) provides
    // the scene. Clear previous frame so canvas pixels don't accumulate.
    ctx.clearRect(0, 0, width, height);

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

        // Underline — deep plum at low opacity (idle) / meadow green (filled)
        ctx.beginPath();
        ctx.moveTo(bx, blankY + blankSize);
        ctx.lineTo(bx + blankSize, blankY + blankSize);
        ctx.strokeStyle = filled ? '#7ED957' : 'rgba(108, 63, 164, 0.35)';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.stroke();

        if (filled) {
            ctx.save();
            ctx.font = `700 ${Math.round(blankSize * 0.85)}px Fredoka, "Baloo 2", system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#3F4052'; // charcoal — readable on bright sky
            ctx.shadowBlur = 0;
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
                        // Per-letter mastery row.
                        logEvent('item_dropped', {
                            game_mode: 'gesture-spelling',
                            stage_id: word,
                            meta: {
                                itemKey: tile.letter,
                                isCorrect: true,
                                expected_letter: nextExpected,
                                actual_letter: tile.letter,
                                action_duration_ms: DWELL_MS,
                                position: typedSoFar.length - 1,
                                word: word,
                            },
                        });

                        if (typedSoFar.length >= word.length) {
                            wordComplete = true;
                            celebrationTime = now;
                            const totalDurationMs = wordStartedAt > 0 ? now - wordStartedAt : null;
                            logEvent('spellingstars_word_complete', {
                                game_mode: 'gesture-spelling',
                                stage_id: word,
                                value_number: totalDurationMs ?? undefined,
                                meta: { word, time_to_complete_ms: totalDurationMs },
                            });
                            logEvent('mode_completed', { game_mode: 'gesture-spelling', stage_id: word });
                            logEvent('stage_completed', {
                                game_mode: 'gesture-spelling',
                                stage_id: word,
                                value_number: totalDurationMs ?? undefined,
                                meta: { word, length: word.length, time_to_complete_ms: totalDurationMs },
                            });
                        }
                    } else {
                        tile.status = 'wrong';
                        tile.wrongTime = now;
                        // Mistake-pattern row: which letter did they confuse with the right one?
                        logEvent('item_dropped', {
                            game_mode: 'gesture-spelling',
                            stage_id: word,
                            meta: {
                                itemKey: nextExpected,
                                isCorrect: false,
                                expected_letter: nextExpected,
                                actual_letter: tile.letter,
                                action_duration_ms: DWELL_MS,
                                position: typedSoFar.length,
                                word: word,
                            },
                        });
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

    // ── Category badge — deep plum on the bright sky ──────────────────────────
    ctx.save();
    ctx.font = `600 ${Math.round(Math.min(width, height) * 0.025)}px Fredoka, "Baloo 2", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = 'rgba(108, 63, 164, 0.55)';
    ctx.fillText(currentWord.category, width / 2, height * 0.4);
    ctx.restore();

    // ── Instruction — charcoal on bright sky for readability ──────────────────
    if (!wordComplete) {
        ctx.save();
        ctx.font = `700 ${Math.round(Math.min(width, height) * 0.028)}px Fredoka, "Baloo 2", system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#3F4052';
        ctx.fillText(
            typedSoFar.length === 0
                ? 'Hover over each letter to spell the word!'
                : `Next letter: "${nextExpected}" — hover over it!`,
            width / 2,
            height * 0.56,
        );
        ctx.restore();
    }

    // ── Finger cursor ──────────────────────────────────────────────
    // Intentionally NOT drawn here. The global <MagicCursor> component
    // renders the cursor as an HTML overlay (an outer aqua ring with a
    // concentric inner pearl) at the smoothed/filtered fingertip
    // position. Drawing a separate canvas dot here at the raw
    // landmark used to produce a visible 60–80 px offset between the
    // two indicators, because the canvas mapper and MagicCursor's CSS
    // smoothing pipeline don't share a coordinate frame. Reported
    // 2026-05-11 ("the small blue dot should be in the bigger
    // glowing circle"). MagicCursor is now the only on-screen
    // cursor in this mode; the green tile-frame still shows which
    // letter the cursor is hovering over.
};
