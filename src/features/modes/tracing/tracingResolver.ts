/**
 * Tracing resolver (pure) — the single source of truth for the canonical
 * Tracing activity id and which per-frame engine runs. Kept free of JSX /
 * React-component imports so it can be unit-tested in a node environment and
 * imported by the per-frame loop without pulling in the DOM shells.
 *
 * The render shell lives in canonicalTracing.tsx and re-exports everything
 * here, so callers can import either from one module.
 */
import { featureFlags } from '../../../core/featureFlags';
import { playfulTracingFrame, getPlayfulSnapshot } from './tracingPlayfulFrame';

/** Canonical activity id for the Tracing experience (solo + classroom). */
export const TRACING_ACTIVITY_ID = 'pre-writing' as const;

/** True when the redesigned (playful V2) tracing experience is active. */
export const isPlayfulTracingActive = (): boolean =>
    featureFlags.getFlag('tracingPlayfulUiV1');

/**
 * Per-frame logic for the TrackingLayer `onFrame` contract. Resolves to the
 * same engine the render shell uses, so the shell and the frame loop can never
 * disagree about which tracing engine is running.
 */
export const getTracingFrameLogic = () => playfulTracingFrame;

/**
 * Current tracing progress (0-1) from the ACTIVE engine. Classroom scoring
 * (scoreMapping) reads this so the star score reflects the SAME engine the
 * child traced on. The legacy engine was retired (June 2026); this is the
 * playful engine's overall progress.
 */
export const getTracingProgress = (): number =>
    getPlayfulSnapshot()?.overallProgress ?? 0;

export interface CanonicalTracingProps {
    onExit?: () => void;
    /**
     * Whether the child may pick a category (Warm-up / Shapes / Letters /
     * Numbers) before tracing. Stated EXPLICITLY by the caller — never inferred
     * from the route or UI. Solo defaults to `true`. Classroom passes the value
     * derived from the teacher's assignment intent (general Tracing → `true`,
     * a specific assigned category → `false` with `initialSection`).
     */
    allowCategorySelection?: boolean;
    /** When category selection is not allowed, the section (pack) to enter directly. */
    initialSection?: number | null;
}
