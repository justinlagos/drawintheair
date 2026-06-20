/**
 * Playful Tracing Engine — the stateful core of the redesigned (V2) tracing
 * experience, gated behind the `tracingPlayfulUiV1` feature flag.
 *
 * It owns per-stroke progress + completion and produces a fully-resolved
 * RenderScene that the shared renderer paints. The SAME engine instance is
 * driven by:
 *   • the live frame adapter (TrackingLayer → MediaPipe filtered point), and
 *   • the dev preview harness (a simulated pointer),
 * so there is exactly one implementation of the gameplay logic + visuals.
 *
 * Multi-stroke contract (Workstream 4 / learning requirements):
 *   • The child must begin each stroke inside its start zone.
 *   • Progress is forward-only and rate-limited (no skipping, no jumping to
 *     the finish from the wrong direction).
 *   • Completing a stroke activates the next; completed strokes stay drawn.
 *   • A brief tracking loss never erases completed strokes.
 *   • Completion fires exactly once.
 */

import {
    layoutActivity,
    nearestOnPolyline,
    pointAtT,
    tangentAtT,
    polylineLengthPx,
    orderedStrokes,
    type SafeRegion,
    type StrokePoint,
    type TracingActivity,
    type TracingStroke,
} from './tracingStrokeModel';
import {
    getTheme,
    getTrackMetrics,
    resolveQuality,
    corridorHalfWidthPx,
    vminOf,
    TRACING_TUNING,
    type PerfTier,
    type TracingTheme,
} from './tracingThemes';
import {
    drawStaticWorld,
    drawDynamicWorld,
    makeOffscreen,
    type RenderScene,
    type RenderStroke,
    type TrailParticle,
} from './tracingRenderer';
import { drawVehicle, type VehicleState } from './tracingCharacter';
import { FeedbackMachine, type CoachId } from './tracingFeedback';

export interface EngineInput {
    /** Pointer in canvas-normalized coords (0..1), or null if no point. */
    pointer: StrokePoint | null;
    pinch: boolean;
    hasHand: boolean;
    now: number;
}

export interface EngineConfig {
    perfTier: PerfTier;
    reducedMotion: boolean;
    /** Draw the full learning-park environment (default true). */
    envEnabled?: boolean;
}

export interface EngineSnapshot {
    activityId: string;
    label: string;
    type: TracingActivity['type'];
    /** 0..1 length-weighted across all strokes. */
    overallProgress: number;
    currentStrokeIndex: number;
    totalStrokes: number;
    completed: boolean;
    paused: boolean;
    previewActive: boolean;
    /** Time-on-path / total-traced-time, 0..1 (accuracy proxy). */
    accuracy: number;
    coach: CoachId;
    message: string | null;
    vehicleState: VehicleState;
    /** True the frame completion first fires (one-shot). */
    justCompleted: boolean;
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

export class PlayfulTracingEngine {
    private activity: TracingActivity;
    private strokesDesign: TracingStroke[];
    private width: number;
    private height: number;
    private region: SafeRegion;
    private config: EngineConfig;
    private theme: TracingTheme;

    // Canvas-space geometry (recomputed on resize).
    private strokesCanvas: StrokePoint[][] = [];
    private strokeLenPx: number[] = [];
    private totalLenPx = 1;

    // Gameplay state.
    private progress: number[] = []; // per-stroke 0..1
    private current = 0;
    private started: boolean[] = [];
    private completed = false;
    private completionFired = false;
    private justCompleted = false;
    private paused = false;

    // Timers / smoothing.
    private pinchLostAt: number | null = null;
    private wasOnPath = false;
    private lastPointer: StrokePoint | null = null;
    private lastNow = 0;
    private moving = false;
    private timeOnPathMs = 0;
    private timeOffPathMs = 0;

    // Vehicle.
    private vehicle = { x: 0, y: 0, angle: 0, lean: 0 };
    private vehicleState: VehicleState = 'idle';

    // Preview.
    private previewActive = false;
    private previewStart = 0;

    private particles: TrailParticle[] = [];
    private feedback = new FeedbackMachine();
    private onComplete: (() => void) | null = null;

    // Redesign-pass additions.
    private envEnabled = true;
    private vehicleScale = 1;
    private stateOverride: VehicleState | null = null;
    private guideTarget: StrokePoint | null = null;
    private envLayer: { canvas: CanvasImageSource; ctx: CanvasRenderingContext2D } | null = null;
    private envKey = '';

    constructor(activity: TracingActivity, width: number, height: number, region: SafeRegion, config: EngineConfig) {
        this.activity = activity;
        this.strokesDesign = orderedStrokes(activity);
        this.width = width;
        this.height = height;
        this.region = region;
        this.config = config;
        this.envEnabled = config.envEnabled ?? true;
        this.theme = getTheme(activity.themeId);
        this.recomputeGeometry();
        this.reset();
    }

    setCompletionCallback(cb: (() => void) | null): void {
        this.onComplete = cb;
    }

    setActivity(activity: TracingActivity): void {
        this.activity = activity;
        this.strokesDesign = orderedStrokes(activity);
        this.theme = getTheme(activity.themeId);
        this.recomputeGeometry();
        this.reset();
    }

    resize(width: number, height: number, region: SafeRegion): void {
        this.width = width;
        this.height = height;
        this.region = region;
        this.recomputeGeometry();
        // Keep gameplay progress; just re-place the vehicle.
        this.placeVehicleAtHead(true);
    }

    setConfig(config: EngineConfig): void {
        this.config = config;
        this.envEnabled = config.envEnabled ?? true;
        this.envKey = ''; // invalidate static cache (tier/motion/env may have changed)
    }

    /** Harness: force a vehicle state for visual review (null = live). */
    setStateOverride(state: VehicleState | null): void {
        this.stateOverride = state;
    }

    /** Harness: scale the vehicle for close-up review. */
    setVehicleScale(scale: number): void {
        this.vehicleScale = scale;
    }

    /** Harness: toggle the environment layers on/off. */
    setEnvEnabled(on: boolean): void {
        this.envEnabled = on;
        this.envKey = '';
    }

    private recomputeGeometry(): void {
        const { toCanvas } = layoutActivity(this.region, this.width, this.height);
        this.strokesCanvas = this.strokesDesign.map((s) => s.points.map(toCanvas));
        this.strokeLenPx = this.strokesCanvas.map((p) => polylineLengthPx(p, this.width, this.height));
        this.totalLenPx = Math.max(1, this.strokeLenPx.reduce((a, b) => a + b, 0));
    }

    reset(): void {
        this.progress = this.strokesDesign.map(() => 0);
        this.started = this.strokesDesign.map(() => false);
        this.current = 0;
        this.completed = false;
        this.completionFired = false;
        this.justCompleted = false;
        this.paused = false;
        this.pinchLostAt = null;
        this.wasOnPath = false;
        this.lastPointer = null;
        this.moving = false;
        this.timeOnPathMs = 0;
        this.timeOffPathMs = 0;
        this.particles = [];
        this.feedback.reset();
        this.placeVehicleAtHead(true);
        this.startPreview();
    }

    startPreview(): void {
        this.previewActive = this.config.reducedMotion ? false : true;
        this.previewStart = this.lastNow;
        // In reduced motion we still show numbered stroke badges (handled in
        // the scene) but skip the animated sweep.
    }

    skipPreview(): void {
        this.previewActive = false;
    }

    /** Resolution-scaled tuning distance (px). */
    private sizeScale(): number {
        return Math.max(0.6, vminOf(this.width, this.height) / 1080);
    }

    private strokeTolerancePx(i: number): number {
        return this.strokesDesign[i]?.tolerance ?? this.activity.tolerancePx;
    }

    private completionThreshold(i: number): number {
        return this.strokesDesign[i]?.completionThreshold ?? this.activity.completionPercent;
    }

    private placeVehicleAtHead(snap: boolean): void {
        const stroke = this.strokesCanvas[this.current];
        if (!stroke || stroke.length < 2) return;
        const t = this.progress[this.current] ?? 0;
        const p = pointAtT(stroke, t, this.width, this.height);
        const angle = tangentAtT(stroke, t, this.width, this.height);
        if (snap) {
            this.vehicle = { x: p.x, y: p.y, angle, lean: 0 };
        }
    }

    // ── Simulation / control helpers (used by the harness) ──────────────────

    /** Jump to a stroke, marking all prior strokes complete. */
    jumpToStroke(index: number): void {
        const clamped = Math.max(0, Math.min(this.strokesDesign.length - 1, index));
        for (let i = 0; i < this.strokesDesign.length; i++) {
            if (i < clamped) {
                this.progress[i] = 1;
                this.started[i] = true;
            } else {
                this.progress[i] = 0;
                this.started[i] = false;
            }
        }
        this.current = clamped;
        this.completed = false;
        this.completionFired = false;
        this.previewActive = false;
        this.placeVehicleAtHead(true);
    }

    /** Force completion (harness "trigger completion" control). */
    forceComplete(): void {
        for (let i = 0; i < this.progress.length; i++) {
            this.progress[i] = 1;
            this.started[i] = true;
        }
        this.current = this.strokesDesign.length - 1;
        this.triggerCompletion();
    }

    /** Ideal pointer for the current stroke at fraction t (harness replay). */
    idealPointer(t: number): StrokePoint | null {
        const stroke = this.strokesCanvas[this.current];
        if (!stroke) return null;
        return pointAtT(stroke, t, this.width, this.height);
    }

    /** Start point (canvas-normalized) of the current stroke. */
    currentStrokeStart(): StrokePoint | null {
        const s = this.strokesCanvas[this.current];
        return s ? s[0] : null;
    }

    private triggerCompletion(): void {
        if (this.completed) return;
        this.completed = true;
        this.justCompleted = true;
        const last = this.strokesCanvas[this.strokesCanvas.length - 1];
        if (last) {
            const end = last[last.length - 1];
            this.vehicle.x = end.x;
            this.vehicle.y = end.y;
        }
        if (!this.completionFired) {
            this.completionFired = true;
            if (this.onComplete) this.onComplete();
        }
    }

    // ── Per-frame update ────────────────────────────────────────────────────

    update(input: EngineInput): EngineSnapshot {
        const { now } = input;
        this.justCompleted = false;
        const dt = this.lastNow ? Math.min(64, now - this.lastNow) : 16;

        // Direction preview gate.
        if (this.previewActive) {
            const t = (now - this.previewStart) / TRACING_TUNING.previewDurationMs;
            if (t >= 1 || input.pinch) this.previewActive = false;
        }

        // Effective pinch (grace window for momentary drops).
        if (!input.pinch) {
            if (this.pinchLostAt === null) this.pinchLostAt = now;
        } else {
            this.pinchLostAt = null;
        }
        const effectivePinch =
            input.pinch || (this.pinchLostAt !== null && now - this.pinchLostAt <= TRACING_TUNING.pinchGraceMs);
        this.paused = !effectivePinch;

        const stroke = this.strokesCanvas[this.current];
        let onPath = false;
        let nearStart = false;
        this.moving = false;
        this.guideTarget = null;

        if (!this.completed && !this.previewActive && stroke && input.pointer && input.hasHand) {
            const near = nearestOnPolyline(input.pointer, stroke, this.width, this.height);
            const tol = corridorHalfWidthPx(this.strokeTolerancePx(this.current), this.activity.pack, this.width, this.height);

            // Hysteresis: easier to stay on than to fall off.
            const leaveThreshold = tol + TRACING_TUNING.offPathSlackPx * this.sizeScale();
            onPath = this.wasOnPath ? near.distancePx <= leaveThreshold : near.distancePx <= tol;
            this.wasOnPath = onPath;

            // Off-path: remember the nearest valid point for the guide beam.
            if (!onPath && this.started[this.current]) this.guideTarget = near.nearest;

            // Start-zone gating.
            const startPt = stroke[0];
            const startDist = Math.hypot(
                (input.pointer.x - startPt.x) * this.width,
                (input.pointer.y - startPt.y) * this.height
            );
            nearStart = startDist <= TRACING_TUNING.startZoneRadiusPx * this.sizeScale();

            // Movement bookkeeping.
            if (this.lastPointer) {
                const movedPx = Math.hypot(
                    (input.pointer.x - this.lastPointer.x) * this.width,
                    (input.pointer.y - this.lastPointer.y) * this.height
                );
                this.moving = movedPx > 1.5;
            }

            if (effectivePinch && onPath) {
                if (!this.started[this.current]) {
                    // Must begin inside the start zone (correct formation start).
                    if (nearStart) this.started[this.current] = true;
                }
                if (this.started[this.current]) {
                    // Forward-only, rate-limited advance toward the projected head.
                    const cap = this.progress[this.current] + TRACING_TUNING.maxProgressPerFrame;
                    const next = Math.min(near.overallT, cap);
                    if (next > this.progress[this.current]) {
                        this.progress[this.current] = next;
                    }
                    // Stroke completion.
                    if (this.progress[this.current] >= this.completionThreshold(this.current)) {
                        this.progress[this.current] = 1;
                        if (this.current < this.strokesDesign.length - 1) {
                            this.current += 1;
                            this.wasOnPath = false;
                            // Snap the guide to the NEXT stroke's start instead of
                            // letting it glide in a straight line across the glyph
                            // (which read as the road "spilling out then joining").
                            this.placeVehicleAtHead(true);
                        } else {
                            this.triggerCompletion();
                        }
                    }
                }
            }
            this.lastPointer = input.pointer;

            // Accuracy: fraction of active tracing time spent on-path.
            if (effectivePinch && this.started[this.current] && !this.completed) {
                if (onPath) this.timeOnPathMs += dt;
                else this.timeOffPathMs += dt;
            }
        } else if (input.pointer) {
            this.lastPointer = input.pointer;
        }

        // Vehicle target follows the current stroke head; lerp for stability
        // (no raw landmark jitter — we move toward the projected progress).
        this.updateVehicle(dt);

        // Particles.
        this.updateParticles(dt, onPath && effectivePinch && this.moving);

        // Feedback (single coaching message + vehicle state).
        const fb = this.feedback.update({
            now,
            pinching: effectivePinch,
            hasHand: input.hasHand,
            onPath,
            started: this.started[this.current] ?? false,
            nearStart,
            completed: this.completed,
            moving: this.moving,
        });
        // The feedback machine owns the *emotional* vehicle state; we only
        // override to 'finishing' when the last stroke is nearly done.
        this.vehicleState = fb.vehicleState;
        if (!this.completed && this.current === this.strokesDesign.length - 1 && this.progress[this.current] > 0.8) {
            if (this.vehicleState === 'moving') this.vehicleState = 'finishing';
        }

        this.lastNow = now;
        return this.snapshot(fb.coach, fb.message);
    }

    private updateVehicle(dt: number): void {
        const stroke = this.strokesCanvas[this.current];
        if (!stroke || stroke.length < 2) return;
        let target: StrokePoint;
        let angle: number;
        if (this.completed) {
            const last = this.strokesCanvas[this.strokesCanvas.length - 1];
            target = last[last.length - 1];
            angle = this.vehicle.angle;
        } else {
            const t = this.progress[this.current];
            target = pointAtT(stroke, t, this.width, this.height);
            angle = tangentAtT(stroke, t, this.width, this.height);
        }
        const k = Math.min(1, (dt / 1000) * 14); // smoothing toward target
        this.vehicle.x += (target.x - this.vehicle.x) * k;
        this.vehicle.y += (target.y - this.vehicle.y) * k;
        // Shortest-arc angle interpolation.
        let dA = angle - this.vehicle.angle;
        while (dA > Math.PI) dA -= Math.PI * 2;
        while (dA < -Math.PI) dA += Math.PI * 2;
        this.vehicle.angle += dA * Math.min(1, k * 1.2);
        // Lean follows angular velocity.
        this.vehicle.lean = Math.max(-1, Math.min(1, dA * 2));
    }

    private updateParticles(dt: number, emit: boolean): void {
        const q = resolveQuality(this.config.perfTier, this.config.reducedMotion);
        const fade = dt / 600;
        this.particles = this.particles.filter((p) => (p.life -= fade) > 0);
        if (emit && q.maxParticles > 0 && this.particles.length < q.maxParticles) {
            const colors = this.theme.particles.colors;
            this.particles.push({
                x: this.vehicle.x,
                y: this.vehicle.y,
                life: 1,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.max(2, vminOf(this.width, this.height) * 0.006),
            });
        }
    }

    private overallProgress(): number {
        let done = 0;
        for (let i = 0; i < this.strokesCanvas.length; i++) {
            done += this.strokeLenPx[i] * clamp01(this.progress[i]);
        }
        return clamp01(done / this.totalLenPx);
    }

    private snapshot(coach: CoachId, message: string | null): EngineSnapshot {
        return {
            activityId: this.activity.id,
            label: this.activity.label,
            type: this.activity.type,
            overallProgress: this.completed ? 1 : this.overallProgress(),
            currentStrokeIndex: this.current,
            totalStrokes: this.strokesDesign.length,
            completed: this.completed,
            paused: this.paused,
            previewActive: this.previewActive,
            accuracy: (() => {
                const total = this.timeOnPathMs + this.timeOffPathMs;
                return total > 0 ? this.timeOnPathMs / total : 1;
            })(),
            coach,
            message,
            vehicleState: this.vehicleState,
            justCompleted: this.justCompleted,
        };
    }

    // ── Rendering ───────────────────────────────────────────────────────────

    private buildScene(now: number): RenderScene {
        const quality = resolveQuality(this.config.perfTier, this.config.reducedMotion);
        const metrics = getTrackMetrics(this.width, this.height);

        const strokes: RenderStroke[] = this.strokesCanvas.map((pts, i) => ({
            points: pts,
            progress: this.progress[i],
            status: i < this.current ? 'done' : i === this.current ? 'current' : 'upcoming',
            order: this.strokesDesign[i].order,
        }));

        const currentStroke = this.strokesCanvas[this.current];
        const lastStroke = this.strokesCanvas[this.strokesCanvas.length - 1];
        const start = currentStroke ? currentStroke[0] : { x: 0.5, y: 0.5 };
        const finish = lastStroke ? lastStroke[lastStroke.length - 1] : { x: 0.5, y: 0.5 };

        const previewT = this.previewActive
            ? clamp01((now - this.previewStart) / TRACING_TUNING.previewDurationMs)
            : 0;

        return {
            width: this.width,
            height: this.height,
            now,
            theme: this.theme,
            metrics,
            quality,
            region: this.region,
            glyphType: this.activity.type,
            overallProgress: this.completed ? 1 : this.overallProgress(),
            strokes,
            start,
            finish,
            pulseStart: !this.completed && !this.started[this.current] && !this.previewActive,
            showStartSign: !this.completed && this.current === 0 && !this.started[0] && !this.previewActive,
            emphasizeFinish: this.completed || (this.current === this.strokesCanvas.length - 1 && this.progress[this.current] > 0.5),
            preview: this.previewActive ? { strokeIndex: this.current, t: previewT } : undefined,
            showStrokeNumbers: this.strokesDesign.length > 1 && (this.previewActive || !this.started[this.current]),
            particles: this.particles,
            guideTarget: this.guideTarget,
            vehicle: { x: this.vehicle.x, y: this.vehicle.y },
            envEnabled: this.envEnabled,
        };
    }

    /** Paint the whole frame (world + vehicle) to a 2D context. */
    render(ctx: CanvasRenderingContext2D, now = this.lastNow): void {
        const scene = this.buildScene(now);

        // Static scenery is cached to an offscreen layer and blitted; if no
        // offscreen canvas is available (e.g. headless), draw it inline.
        const key = `${this.activity.id}|${this.width}x${this.height}|${this.config.perfTier}|${this.config.reducedMotion}|${this.envEnabled}`;
        if (key !== this.envKey) {
            this.envKey = key;
            this.envLayer = makeOffscreen(this.width, this.height);
            if (this.envLayer) drawStaticWorld(this.envLayer.ctx, scene);
        }
        if (this.envLayer) ctx.drawImage(this.envLayer.canvas, 0, 0);
        else drawStaticWorld(ctx, scene);

        drawDynamicWorld(ctx, scene);

        if (!this.previewActive) {
            const effectiveState = this.stateOverride ?? this.vehicleState;
            drawVehicle(ctx, {
                x: this.vehicle.x * this.width,
                y: this.vehicle.y * this.height,
                angle: this.vehicle.angle,
                size: scene.metrics.vehiclePx * this.vehicleScale,
                theme: this.theme.character,
                state: effectiveState,
                lean: this.vehicle.lean,
                now,
                glow: scene.quality.glow,
                shadowScale: scene.quality.shadowScale,
                animate: scene.quality.animate,
            });
        }
    }
}
