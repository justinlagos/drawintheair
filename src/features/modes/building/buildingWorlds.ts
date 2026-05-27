/**
 * Building Mode — world + object catalogue.
 *
 * Phase 0 ships one object: the Flower Vase in Guided mode.
 *
 * Holding state: pieces use the AI-generated clay sprites (alpha-
 * matted via rembg). These come from independent renders so they
 * don't share perspective/lighting — that's the open visual debt
 * tracked in /docs/BUILDING_MODE_ROADMAP.md. When the proper master
 * image lands (single source rendered in one scene), we will move
 * back to a master-and-slice approach so pieces reconstruct one
 * coherent object.
 */

import type {
    BuildObject,
    BuildPiece,
    BuildWorldId,
    SnapZone,
} from './buildingTypes';

// ─── Flower Vase ──────────────────────────────────────────────────────
// Pieces spawn around the perimeter and drift inward; snap zones
// stack vertically over the podium (vase at base, plant rising,
// blossoms at top, leaf to the side).

const FLOWER_VASE_PIECES: BuildPiece[] = [
    {
        id: 'vase-base',
        templateId: 'building.flower-vase.base',
        role: 'base',
        color: '#A8D8FF',
        cx: 0.18, cy: 0.30,
        vx: 0.00015, vy: 0.0001,
        width: 0.18, height: 0.22,
        rotation: 0,
        grabbed: false, placed: false,
        attempts: 0, assistTolerance: 1.0,
        spawnDelayMs: 0,
    },
    {
        id: 'flower-plant',
        templateId: 'building.flower-vase.plant',
        role: 'stem',
        color: '#7ED957',
        cx: 0.85, cy: 0.28,
        vx: -0.00015, vy: 0.0001,
        width: 0.10, height: 0.30,
        rotation: 0,
        grabbed: false, placed: false,
        attempts: 0, assistTolerance: 1.0,
        spawnDelayMs: 600,
    },
    {
        id: 'flower-leaf',
        templateId: 'building.flower-vase.leaf',
        role: 'leaf',
        color: '#B5F15C',
        cx: 0.13, cy: 0.70,
        vx: 0.0001, vy: -0.0001,
        width: 0.10, height: 0.07,
        rotation: -0.25,
        grabbed: false, placed: false,
        attempts: 0, assistTolerance: 1.0,
        spawnDelayMs: 1200,
    },
    {
        id: 'blossom-coral',
        templateId: 'building.flower-vase.coral',
        role: 'petal',
        color: '#FF6B6B',
        cx: 0.87, cy: 0.65,
        vx: -0.0001, vy: -0.0001,
        width: 0.13, height: 0.13,
        rotation: 0.18,
        grabbed: false, placed: false,
        attempts: 0, assistTolerance: 1.0,
        spawnDelayMs: 1800,
    },
    {
        id: 'blossom-yellow',
        templateId: 'building.flower-vase.yellow',
        role: 'petal',
        color: '#FFD84D',
        cx: 0.50, cy: 0.12,
        vx: 0.0001, vy: 0.0001,
        width: 0.13, height: 0.13,
        rotation: -0.20,
        grabbed: false, placed: false,
        attempts: 0, assistTolerance: 1.0,
        spawnDelayMs: 2400,
    },
];

const FLOWER_VASE_ZONES: SnapZone[] = [
    {
        id: 'zone-base',
        cx: 0.50, cy: 0.72,
        width: 0.18, height: 0.22,
        acceptsRole: 'base',
        visible: true, glow: 0, filled: false,
    },
    {
        id: 'zone-plant',
        cx: 0.50, cy: 0.45,
        width: 0.10, height: 0.30,
        acceptsRole: 'stem',
        visible: true, glow: 0, filled: false,
    },
    {
        id: 'zone-leaf',
        cx: 0.42, cy: 0.56,
        width: 0.10, height: 0.07,
        acceptsRole: 'leaf',
        visible: true, glow: 0, filled: false,
    },
    {
        id: 'zone-blossom-coral',
        cx: 0.42, cy: 0.28,
        width: 0.13, height: 0.13,
        acceptsRole: 'petal',
        acceptsPieceIds: ['blossom-coral'],
        visible: true, glow: 0, filled: false,
    },
    {
        id: 'zone-blossom-yellow',
        cx: 0.58, cy: 0.26,
        width: 0.13, height: 0.13,
        acceptsRole: 'petal',
        acceptsPieceIds: ['blossom-yellow'],
        visible: true, glow: 0, filled: false,
    },
];

const FLOWER_VASE: BuildObject = {
    id: 'flower-vase',
    world: 'home',
    displayName: 'flower vase',
    defaultBuildType: 'guided',
    silhouette: {
        cx: 0.50, cy: 0.48,
        width: 0.32, height: 0.62,
    },
    pieces: FLOWER_VASE_PIECES,
    snapZones: FLOWER_VASE_ZONES,
    completionAnimationId: 'flower-vase-bloom',
    narratorScript: [
        { phase: 'reveal',        text: "Let's build a flower vase." },
        { phase: 'encouragement', text: 'Take your time.' },
        { phase: 'completion',    text: 'You made a flower vase!' },
    ],
};

// ─── Catalogue exports ────────────────────────────────────────────────

export const BUILDING_CATALOG: BuildObject[] = [FLOWER_VASE];

export const OBJECTS_BY_WORLD: Partial<Record<BuildWorldId, BuildObject[]>> = {
    home: [FLOWER_VASE],
};

export function findObjectById(id: string): BuildObject | undefined {
    return BUILDING_CATALOG.find(o => o.id === id);
}

export function cloneObject(template: BuildObject): BuildObject {
    return {
        ...template,
        silhouette: { ...template.silhouette },
        pieces: template.pieces.map(p => ({ ...p })),
        snapZones: template.snapZones.map(z => ({
            ...z,
            acceptsPieceIds: z.acceptsPieceIds ? [...z.acceptsPieceIds] : undefined,
        })),
        narratorScript: template.narratorScript.map(n => ({ ...n })),
    };
}
