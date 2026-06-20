/**
 * Magic Canvas — challenge + Finish-the-World content (data only).
 *
 * Every challenge is scored from measurable behaviours (see challengeModel).
 * Scene challenges (category 'scene') carry a worldId + target zones and serve
 * as the Finish-the-World content. New challenges can be added here without any
 * renderer change.
 */

import {
    validateChallenges,
    type PaintChallenge,
    type Zone,
} from './challengeModel';

// Core palette hex values referenced by colour rules (kept in sync with worlds).
const C = {
    blue: '#7BB6FF',
    green: '#5BCE9A',
    yellow: '#FFC83D',
    coral: '#F07A5C',
    orange: '#FF9B7E',
    purple: '#8A66F0',
} as const;

const Z = (id: string, x: number, y: number, w: number, h: number, label?: string): Zone => ({ id, x, y, w, h, label });

export const ALL_CHALLENGES: PaintChallenge[] = [
    // ── Ages 3–4 ────────────────────────────────────────────────────────────
    {
        id: 'long-line', title: 'Long Line', instruction: 'Draw one long line!',
        ageBand: '3-4', category: 'movement', learningGoals: ['continuous-movement', 'large-arm-movement'],
        successRules: [{ type: 'pathLength', minimum: 0.6 }],
    },
    {
        id: 'three-circles', title: 'Three Circles', instruction: 'Make three big circles!',
        ageBand: '3-4', category: 'movement', learningGoals: ['hand-eye-coordination', 'fine-motor'],
        successRules: [{ type: 'strokeCount', minimum: 3 }, { type: 'directionChanges', minimum: 6 }],
    },
    {
        id: 'two-colours', title: 'Two Colours', instruction: 'Use two colours!',
        ageBand: '3-4', category: 'colour', learningGoals: ['colour-choice'],
        successRules: [{ type: 'colourCount', minimum: 2 }],
    },
    {
        id: 'cloud-rain', title: 'Rainy Cloud', instruction: 'Fill the cloud with rain!',
        ageBand: '3-4', category: 'scene', worldId: 'playground', learningGoals: ['spatial-awareness', 'continuous-movement'],
        zones: [Z('cloud', 0.24, 0.08, 0.32, 0.2, 'cloud')],
        successRules: [{ type: 'markCountInZone', zone: 'cloud', minimum: 6 }],
    },
    {
        id: 'creature-spots', title: 'Spotty Friend', instruction: 'Add spots to the creature!',
        ageBand: '3-4', category: 'scene', worldId: 'magicpaper', learningGoals: ['fine-motor', 'spatial-awareness'],
        zones: [Z('creature', 0.35, 0.38, 0.3, 0.42, 'creature')],
        successRules: [{ type: 'markCountInZone', zone: 'creature', minimum: 5 }],
    },
    {
        id: 'side-to-side', title: 'Across', instruction: 'Draw from one side to the other!',
        ageBand: '3-4', category: 'spatial', learningGoals: ['spatial-awareness', 'large-arm-movement'],
        zones: [Z('leftEdge', 0, 0, 0.14, 1), Z('rightEdge', 0.86, 0, 0.14, 1)],
        successRules: [{ type: 'reachZone', zone: 'leftEdge' }, { type: 'reachZone', zone: 'rightEdge' }],
    },
    {
        id: 'five-marks', title: 'Five Marks', instruction: 'Make five colourful marks!',
        ageBand: '3-4', category: 'coverage', learningGoals: ['colour-choice', 'creative-confidence'],
        successRules: [{ type: 'strokeCount', minimum: 5 }, { type: 'colourCount', minimum: 2 }],
    },
    {
        id: 'no-lift', title: 'Keep Going', instruction: 'Draw without lifting your finger!',
        ageBand: '3-4', category: 'continuous', learningGoals: ['continuous-movement'],
        successRules: [{ type: 'continuousStroke', minimumSeconds: 4 }],
    },
    {
        id: 'tree-leaves', title: 'Leafy Tree', instruction: 'Add leaves to the tree!',
        ageBand: '3-4', category: 'scene', worldId: 'playground', learningGoals: ['spatial-awareness', 'fine-motor'],
        zones: [Z('treetop', 0.58, 0.14, 0.34, 0.36, 'tree top')],
        successRules: [{ type: 'markCountInZone', zone: 'treetop', minimum: 6 }],
    },

    // ── Ages 5–7 ────────────────────────────────────────────────────────────
    {
        id: 'repeating-pattern', title: 'Pattern Maker', instruction: 'Make a repeating pattern!',
        ageBand: '5-7', category: 'pattern', learningGoals: ['pattern-recognition', 'planning'],
        successRules: [{ type: 'directionChanges', minimum: 12 }],
    },
    {
        id: 'road-to-house', title: 'Road Home', instruction: 'Draw a road to the house!',
        ageBand: '5-7', category: 'scene', worldId: 'playground', learningGoals: ['planning', 'spatial-awareness'],
        zones: [Z('house', 0.62, 0.45, 0.3, 0.4, 'house')],
        successRules: [{ type: 'reachZone', zone: 'house' }, { type: 'pathLength', minimum: 0.5 }],
    },
    {
        id: 'sky-stars', title: 'Starry Sky', instruction: 'Fill the night sky with stars!',
        ageBand: '5-7', category: 'scene', worldId: 'night', learningGoals: ['spatial-awareness', 'creative-confidence'],
        zones: [Z('sky', 0.05, 0.05, 0.9, 0.45, 'sky')],
        successRules: [{ type: 'markCountInZone', zone: 'sky', minimum: 10 }],
    },
    {
        id: 'warm-colours', title: 'Warm Colours', instruction: 'Paint with warm colours!',
        ageBand: '5-7', category: 'colour', learningGoals: ['colour-choice'],
        successRules: [{ type: 'selectedColours', colours: [C.yellow, C.orange, C.coral] }],
    },
    {
        id: 'zigzags', title: 'Zigzag', instruction: 'Draw something using zigzags!',
        ageBand: '5-7', category: 'pattern', learningGoals: ['direction-changes', 'fine-motor'],
        successRules: [{ type: 'directionChanges', minimum: 8 }],
    },
    {
        id: 'three-colours', title: 'Three Colours', instruction: 'Make a picture using three colours!',
        ageBand: '5-7', category: 'colour', learningGoals: ['colour-choice', 'creative-confidence'],
        successRules: [{ type: 'colourCount', minimum: 3 }],
    },
    {
        id: 'spaceship-windows', title: 'Spaceship Windows', instruction: 'Add windows to the spaceship!',
        ageBand: '5-7', category: 'scene', worldId: 'night', learningGoals: ['fine-motor', 'spatial-awareness'],
        zones: [Z('spaceship', 0.4, 0.42, 0.26, 0.26, 'spaceship')],
        successRules: [{ type: 'markCountInZone', zone: 'spaceship', minimum: 4 }],
    },
    {
        id: 'fish-home', title: 'Fish Home', instruction: 'Create a home for the fish!',
        ageBand: '5-7', category: 'scene', worldId: 'underwater', learningGoals: ['creative-confidence', 'spatial-awareness'],
        zones: [Z('reef', 0.1, 0.55, 0.52, 0.4, 'reef')],
        successRules: [{ type: 'coverage', zone: 'reef', minimum: 0.25 }],
    },
    {
        id: 'maze-path', title: 'Maze Path', instruction: 'Draw a maze-like path!',
        ageBand: '5-7', category: 'spatial', learningGoals: ['planning', 'direction-changes'],
        successRules: [{ type: 'directionChanges', minimum: 10 }, { type: 'pathLength', minimum: 0.8 }],
    },

    // ── Extra Finish-the-World scenes ────────────────────────────────────────
    {
        id: 'garden-flowers', title: 'Flower Garden', instruction: 'Grow flowers in the garden!',
        ageBand: 'all', category: 'scene', worldId: 'playground', learningGoals: ['creative-confidence', 'spatial-awareness'],
        zones: [Z('garden', 0.1, 0.62, 0.8, 0.3, 'garden')],
        successRules: [{ type: 'markCountInZone', zone: 'garden', minimum: 6 }],
    },
    {
        id: 'empty-planet', title: 'New Planet', instruction: 'Colour the empty planet!',
        ageBand: 'all', category: 'scene', worldId: 'night', learningGoals: ['colour-choice', 'spatial-awareness'],
        zones: [Z('planet', 0.36, 0.55, 0.28, 0.28, 'planet')],
        successRules: [{ type: 'coverage', zone: 'planet', minimum: 0.3 }],
    },
];

export const getChallengeById = (id: string): PaintChallenge | undefined =>
    ALL_CHALLENGES.find((c) => c.id === id);

export const getChallengesByAge = (age: PaintChallenge['ageBand']): PaintChallenge[] =>
    ALL_CHALLENGES.filter((c) => c.ageBand === age || c.ageBand === 'all' || age === 'all');

export const getSceneChallenges = (): PaintChallenge[] =>
    ALL_CHALLENGES.filter((c) => c.category === 'scene');

export const getSceneChallengesByWorld = (worldId: string): PaintChallenge[] =>
    ALL_CHALLENGES.filter((c) => c.category === 'scene' && c.worldId === worldId);

/** Pure validation hook (kept out of module side-effects for node/test friendliness). */
export const getChallengeValidationIssues = () => validateChallenges(ALL_CHALLENGES);
