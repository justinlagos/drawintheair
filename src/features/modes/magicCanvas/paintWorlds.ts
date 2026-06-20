/**
 * Magic Canvas — worlds, palettes and the reaction system (data + evaluation).
 *
 * Worlds are lightweight: a background "kind" the renderer draws from cached
 * vector layers, a colour palette (core colours stay consistent; accents vary
 * per world), and a small set of REACTIONS. Reactions are triggered by the
 * same measurable DrawingSignals the challenges use — so the world responds to
 * real behaviour, sparingly (1–2 per scene), never faking recognition.
 *
 * Pure data + a pure `evaluateReactions` helper. No canvas, no React.
 */

import type { DrawingSignals } from './challengeModel';

export type WorldKind = 'sky' | 'night' | 'underwater' | 'paper';

export type ReactionEffect =
    | 'flowersBloom'
    | 'leavesAppear'
    | 'starsTwinkle'
    | 'planetGlow'
    | 'fishApproach'
    | 'bubblesRise'
    | 'borderColour'
    | 'lightsOn'
    | 'flagWave';

export interface ReactionDef {
    id: string;
    effect: ReactionEffect;
    /** Trigger reuses measurable signals. */
    trigger:
        | { type: 'overallProgress'; minimum: number }
        | { type: 'coverage'; minimum: number; zone?: string }
        | { type: 'markCountInZone'; zone: string; minimum: number }
        | { type: 'colourCount'; minimum: number }
        | { type: 'strokeCount'; minimum: number };
    /** Where the effect renders (zone id), if spatial. */
    zone?: string;
}

export interface PaintWorld {
    id: string;
    name: string;
    kind: WorldKind;
    /** Short prompt used by Free Create / Finish-the-World headers. */
    blurb: string;
    /** Colour palette (hex). Core colours are shared; accents differ. */
    palette: string[];
    reactions: ReactionDef[];
}

// Core palette (shared) + per-world accents.
const CORE = ['#7BB6FF', '#5BCE9A', '#FFC83D', '#FF9B7E', '#F07A5C', '#8A66F0'];

export const PAINT_WORLDS: PaintWorld[] = [
    {
        id: 'playground',
        name: 'Sunny Playground',
        kind: 'sky',
        blurb: 'Make anything you like in the park.',
        palette: [...CORE, '#FFFFFF'],
        reactions: [
            { id: 'garden-bloom', effect: 'flowersBloom', zone: 'garden', trigger: { type: 'markCountInZone', zone: 'garden', minimum: 2 } },
            { id: 'tree-leaves', effect: 'leavesAppear', zone: 'treetop', trigger: { type: 'markCountInZone', zone: 'treetop', minimum: 2 } },
        ],
    },
    {
        id: 'night',
        name: 'Night Sky',
        kind: 'night',
        blurb: 'Paint the night with bright colours.',
        palette: [...CORE, '#FFFFFF', '#FFE9A8'],
        reactions: [
            { id: 'sky-stars', effect: 'starsTwinkle', zone: 'sky', trigger: { type: 'markCountInZone', zone: 'sky', minimum: 2 } },
            { id: 'planet-glow', effect: 'planetGlow', zone: 'planet', trigger: { type: 'coverage', zone: 'planet', minimum: 0.15 } },
        ],
    },
    {
        id: 'underwater',
        name: 'Underwater',
        kind: 'underwater',
        blurb: 'Fill the sea with colour.',
        palette: [...CORE, '#FFFFFF'],
        reactions: [
            { id: 'reef-fish', effect: 'fishApproach', zone: 'reef', trigger: { type: 'coverage', zone: 'reef', minimum: 0.12 } },
            { id: 'bubbles', effect: 'bubblesRise', trigger: { type: 'strokeCount', minimum: 3 } },
        ],
    },
    {
        id: 'magicpaper',
        name: 'Magic Paper',
        kind: 'paper',
        blurb: 'A calm page for your ideas.',
        palette: [...CORE, '#1F1B2E'],
        reactions: [
            { id: 'border-colour', effect: 'borderColour', trigger: { type: 'overallProgress', minimum: 0.5 } },
            { id: 'creature-spots', effect: 'lightsOn', zone: 'creature', trigger: { type: 'markCountInZone', zone: 'creature', minimum: 2 } },
        ],
    },
];

export const DEFAULT_WORLD_ID = 'magicpaper';

export const getWorldById = (id: string): PaintWorld =>
    PAINT_WORLDS.find((w) => w.id === id) ?? PAINT_WORLDS.find((w) => w.id === DEFAULT_WORLD_ID)!;

/** Which reactions are currently active given the live signals + progress. */
export const evaluateReactions = (
    world: PaintWorld,
    signals: DrawingSignals,
    overallProgress: number
): string[] => {
    const active: string[] = [];
    for (const r of world.reactions) {
        const t = r.trigger;
        let on = false;
        switch (t.type) {
            case 'overallProgress':
                on = overallProgress >= t.minimum;
                break;
            case 'coverage':
                on = (t.zone ? signals.zoneCoverage[t.zone] ?? 0 : signals.coverage) >= t.minimum;
                break;
            case 'markCountInZone':
                on = (signals.marksInZone[t.zone] ?? 0) >= t.minimum;
                break;
            case 'colourCount':
                on = signals.coloursUsed.length >= t.minimum;
                break;
            case 'strokeCount':
                on = signals.strokeCount >= t.minimum;
                break;
        }
        if (on) active.push(r.id);
    }
    return active;
};

export interface WorldIssue {
    worldId: string;
    code: 'duplicate-id' | 'empty-palette' | 'duplicate-reaction-id' | 'bad-trigger';
    message: string;
}

export const validateWorlds = (worlds: PaintWorld[] = PAINT_WORLDS): WorldIssue[] => {
    const issues: WorldIssue[] = [];
    const seen = new Set<string>();
    for (const w of worlds) {
        if (seen.has(w.id)) issues.push({ worldId: w.id, code: 'duplicate-id', message: `Duplicate world "${w.id}"` });
        seen.add(w.id);
        if (w.palette.length === 0) issues.push({ worldId: w.id, code: 'empty-palette', message: `World "${w.id}" has no palette` });
        const rids = new Set<string>();
        for (const r of w.reactions) {
            if (rids.has(r.id)) issues.push({ worldId: w.id, code: 'duplicate-reaction-id', message: `Duplicate reaction "${r.id}"` });
            rids.add(r.id);
            if ('minimum' in r.trigger && !(r.trigger.minimum > 0)) {
                issues.push({ worldId: w.id, code: 'bad-trigger', message: `Reaction "${r.id}" has a non-positive minimum` });
            }
        }
    }
    return issues;
};

export const getWorldValidationIssues = () => validateWorlds();
