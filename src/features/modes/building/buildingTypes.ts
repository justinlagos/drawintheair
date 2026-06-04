/**
 * Building Mode, shared type definitions.
 *
 * All coordinates that describe positions on the canvas are normalised to
 * [0..1] across both axes, matching the convention used by every other
 * mode in the repo (sortAndPlace, balloonMath, rainbowBridge). The render
 * layer turns them into pixels at draw time.
 *
 * Spec:    /docs/BUILDING_MODE_PRD.md
 * Plan:    /docs/BUILDING_MODE_TECH_PLAN.md
 * Roadmap: /docs/BUILDING_MODE_ROADMAP.md
 */

// ─── World + object identifiers ───────────────────────────────────────
// Phase 0 only ships the 'home' world. The full union is declared up
// front so downstream code (telemetry, classroom panel) can switch on
// it exhaustively without later breaking changes.

export type BuildWorldId =
    | 'home' | 'transport' | 'nature' | 'machines'
    | 'fantasy' | 'space' | 'city' | 'animals';

export type BuildType = 'guided' | 'assisted' | 'discovery';

/**
 * Semantic role, declared on a piece AND on a snap zone. A piece can
 * only be placed in a zone whose `acceptsRole` matches. This is what
 * makes the snap engine "understand" that a wheel belongs to a car and
 * a petal belongs to a flower, separately from coordinate geometry.
 *
 * Phase 0 introduces just the 6 roles needed for the Flower Vase build.
 * Add new roles here as objects land, they're cheap (no per-role wiring
 * required) and a flat union keeps switch-statements exhaustive.
 */
export type SemanticRole =
    | 'base' | 'stem' | 'leaf' | 'petal' | 'accent' | 'body';

// ─── Pieces + zones ───────────────────────────────────────────────────

export interface SnapZone {
    /** Stable within an object instance. */
    id: string;
    /** Normalised centre coords [0..1]. */
    cx: number;
    cy: number;
    /** Normalised size, informs tolerance and visual glow halo. */
    width: number;
    height: number;
    /** Only pieces declaring this role are eligible for this zone. */
    acceptsRole: SemanticRole;
    /**
     * If set, only the listed piece IDs may snap here even if their role
     * matches. Used when an object needs distinct petals in specific
     * positions (left vs right).
     */
    acceptsPieceIds?: string[];
    /** Whether the silhouette outline is currently rendered. */
    visible: boolean;
    /** 0..1, proximity-driven highlight intensity. Reset every frame. */
    glow: number;
    filled: boolean;
    filledByPieceId?: string;
}

export interface BuildPiece {
    /** Unique within the object instance. */
    id: string;
    /** Sprite key registered via kid-icon pipeline (Phase 0 uses canvas
     *  primitives; later phases swap in real sprites). */
    templateId: string;
    role: SemanticRole;
    /** Hex colour, used both by primitive renderer and as sprite tint. */
    color: string;

    cx: number;
    cy: number;
    /** Gentle drift velocity for parked pieces. */
    vx: number;
    vy: number;
    width: number;
    height: number;
    rotation: number;

    grabbed: boolean;
    placed: boolean;
    placedZoneId?: string;

    /** Misplaced-release count, drives silent assistance escalation. */
    attempts: number;
    /** Snap-tolerance multiplier. Starts at 1.0; grows when stuck. */
    assistTolerance: number;
    /** ms after `reveal` enters when this piece floats into scene. */
    spawnDelayMs: number;
}

// ─── Objects + worlds ─────────────────────────────────────────────────

export interface NarratorScriptLine {
    phase: 'reveal' | 'encouragement' | 'completion';
    text: string;
}

export interface BuildObject {
    id: string;
    world: BuildWorldId;
    /** Narrator reads this on `reveal`. */
    displayName: string;
    defaultBuildType: BuildType;
    /** Silhouette outline + completion frame. */
    silhouette: {
        cx: number;
        cy: number;
        width: number;
        height: number;
    };
    /** Template, re-instantiated per build session so state doesn't leak. */
    pieces: BuildPiece[];
    snapZones: SnapZone[];
    /** Key into the completion-animation registry. */
    completionAnimationId: string;
    narratorScript: NarratorScriptLine[];
}

// ─── Live session state ───────────────────────────────────────────────

export type BuildingPhase =
    | 'invitation'   // not in scope for Phase 0 (skip straight to reveal)
    | 'reveal'       // silhouette appears, pieces drift in
    | 'interaction'  // active play
    | 'completion'   // celebration animation
    | 'outro';       // sandbox prompt / next build

export interface BuildSession {
    objectId: string;
    buildType: BuildType;
    startedAt: number;
    firstSnapAt?: number;
    /** Sum of release events across all pieces. */
    attempts: number;
    /** Count of 2s-dwell-without-grab windows. */
    hesitationEvents: number;
    completedAt?: number;
    abandoned: boolean;
}

// ─── Frame-loop helpers ───────────────────────────────────────────────

/**
 * The subset of TrackingFrameData that the snap engine actually needs.
 * Declared separately so unit tests can build minimal fixtures without
 * importing the full MediaPipe-dependent type.
 */
export interface HandFrame {
    point: { x: number; y: number } | null;
    pinchActive: boolean;
    timestamp: number;
}

export type SnapEvent =
    | { kind: 'snapped'; pieceId: string; zoneId: string; wasFirstAttempt: boolean }
    | { kind: 'returned'; pieceId: string; nearZoneId: string | null; distance: number }
    | { kind: 'wrongRole'; pieceId: string; attemptedZoneId: string };

// ─── Constants ────────────────────────────────────────────────────────

/**
 * Base snap tolerance per build type. Measured in normalised units (so
 * 0.08 = 8% of the canvas height). Tuned to feel forgiving for Guided
 * and tight for Discovery, see PRD §6.
 */
export const BASE_SNAP_TOLERANCE: Record<BuildType, number> = {
    guided: 0.08,
    assisted: 0.055,
    discovery: 0.038,
};

/** Silent assistance, see snap-engine docs. */
export const ASSIST_ESCALATION = {
    triggerAfterAttempts: 3,
    multiplier: 1.25,
    cap: 1.5,
} as const;
