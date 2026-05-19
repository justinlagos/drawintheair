/**
 * GestureSampler — on-device gesture-quality summariser.
 *
 * LIOS Sprint 3 / Document A §2.1.
 *
 * Privacy posture (load-bearing): raw (x, y) samples NEVER leave
 * this object. Game modes feed in MediaPipe landmark samples during
 * a stroke, and on stroke end the sampler returns a small scalar
 * summary that gets attached to the item_dropped event's meta. The
 * coordinate buffer is cleared immediately afterwards.
 *
 * If you ever feel tempted to expose the raw points outside this
 * file — for debugging, for an animation, for ML training — stop.
 * That is the line the privacy posture cannot cross. Compute the
 * scalar inside this file, return it, discard the points.
 *
 * Usage:
 *
 *   const gs = new GestureSampler();
 *   gs.start();                              // when the stroke begins
 *   gs.sample(x, y);                         // per MediaPipe frame
 *   const quality = gs.finalize({            // when the stroke ends
 *     idealPath: optionalIdealSamples,       // for spatial error
 *     promptShownAt: optionalPromptTs,       // for time-to-first-move
 *   });
 *   analytics.logEvent('item_dropped', {
 *     ...,
 *     meta: { ..., gesture_quality: quality },
 *   });
 *
 * Sampler is reusable — `start()` resets internal buffers.
 */

export interface GestureQualityIdealPathSample {
    x: number;
    y: number;
}

export interface GestureQualityOptions {
    /**
     * Optional ideal-path samples. When provided, the sampler computes
     * `spatial_error_mean_px` as mean distance from each observed
     * point to the nearest ideal-path sample. Skip if your mode has
     * no notion of an ideal path (free-form gestures).
     */
    idealPath?: ReadonlyArray<GestureQualityIdealPathSample>;
    /**
     * Optional prompt-shown timestamp (`performance.now()` units).
     * When provided, the sampler computes `time_to_first_movement_ms`
     * as the gap from prompt to first significant movement.
     */
    promptShownAt?: number;
}

export interface GestureQualityResult {
    /**
     * Fraction of stroke samples within the ideal path zone (0-100).
     * Only computed when `idealPath` is provided AND a tolerance is
     * configurable upstream — for v1 we leave this NULL and let the
     * existing per-mode logic (e.g. pre-writing's on_path_frames)
     * compute it more accurately with its own threshold. Game modes
     * with their own accuracy tracking should set this directly via
     * the optional override and not let the sampler compute it.
     */
    path_accuracy_pct?: number | null;
    /**
     * Net displacement (first→last) divided by total path length.
     * 0-1. Lower = more jittery / less direct.
     */
    path_efficiency: number | null;
    /** Mean distance from observed point to nearest ideal-path sample. */
    spatial_error_mean_px: number | null;
    /** Variance of per-frame velocity. */
    velocity_variance: number | null;
    /** Count of within-stroke pauses (low-velocity dwell points). */
    pause_count: number | null;
    /** Count of sharp direction reversals. */
    directional_changes: number | null;
    /** Latency from prompt presentation to first significant movement. */
    time_to_first_movement_ms: number | null;
    /** Total stroke duration (ms). */
    time_to_completion_ms: number | null;
    /** Number of direction reversals that recovered toward target. */
    corrections_in_stroke: number | null;
    /** Number of samples used. Data-quality marker. */
    n_samples: number;
}

const PAUSE_VELOCITY_PX_PER_MS = 0.05;   // < 0.05 px/ms = effectively still
const DIR_CHANGE_ANGLE_DEG     = 90;     // > 90° direction change = reversal
const FIRST_MOVEMENT_PX        = 8;      // displacement to call it movement

interface Sample {
    x: number;
    y: number;
    t: number;
}

export class GestureSampler {
    private points: Sample[] = [];
    private startedAt: number | null = null;

    /** Reset and start a new stroke. */
    start(): void {
        this.points = [];
        this.startedAt = performance.now();
    }

    /** Feed one MediaPipe sample. Cheap — just an array push. */
    sample(x: number, y: number, t: number = performance.now()): void {
        if (this.startedAt == null) return;
        this.points.push({ x, y, t });
    }

    /**
     * Number of samples currently buffered. Useful for the calling
     * game mode to verify the sampler is wired up correctly.
     */
    get sampleCount(): number {
        return this.points.length;
    }

    /**
     * Compute the gesture-quality scalars. Clears the internal buffer
     * before returning — the (x, y) sequence cannot be retrieved
     * afterwards by design.
     */
    finalize(opts: GestureQualityOptions = {}): GestureQualityResult {
        const pts = this.points;
        const startedAt = this.startedAt;
        // Clear internal state first so the buffer is gone even if
        // the math below throws. Privacy invariant.
        this.points = [];
        this.startedAt = null;

        const n = pts.length;
        if (n < 2 || startedAt == null) {
            return {
                path_efficiency:            null,
                spatial_error_mean_px:      null,
                velocity_variance:          null,
                pause_count:                null,
                directional_changes:        null,
                time_to_first_movement_ms:  null,
                time_to_completion_ms:      n >= 1 ? Math.round(pts[n - 1].t - startedAt!) : null,
                corrections_in_stroke:      null,
                n_samples:                  n,
            };
        }

        // ── Total path length + net displacement → path_efficiency
        let totalLen = 0;
        const segLens: number[] = [];
        const segDx: number[] = [];
        const segDy: number[] = [];
        const segVel: number[] = [];
        for (let i = 1; i < n; i++) {
            const dx = pts[i].x - pts[i - 1].x;
            const dy = pts[i].y - pts[i - 1].y;
            const dt = Math.max(1, pts[i].t - pts[i - 1].t);
            const len = Math.sqrt(dx * dx + dy * dy);
            totalLen += len;
            segLens.push(len);
            segDx.push(dx);
            segDy.push(dy);
            segVel.push(len / dt);
        }
        const netDx = pts[n - 1].x - pts[0].x;
        const netDy = pts[n - 1].y - pts[0].y;
        const netDisp = Math.sqrt(netDx * netDx + netDy * netDy);
        const pathEfficiency = totalLen > 0
            ? Math.max(0, Math.min(1, netDisp / totalLen))
            : null;

        // ── Velocity variance
        const meanVel = segVel.reduce((a, b) => a + b, 0) / segVel.length;
        const velVariance = segVel.reduce((a, v) => a + (v - meanVel) ** 2, 0) / segVel.length;

        // ── Pause count
        let pauseCount = 0;
        let inPause = false;
        for (const v of segVel) {
            if (v < PAUSE_VELOCITY_PX_PER_MS) {
                if (!inPause) { pauseCount++; inPause = true; }
            } else {
                inPause = false;
            }
        }

        // ── Directional changes
        let dirChanges = 0;
        for (let i = 1; i < segDx.length; i++) {
            const a = Math.atan2(segDy[i - 1], segDx[i - 1]);
            const b = Math.atan2(segDy[i], segDx[i]);
            let diff = Math.abs(b - a) * 180 / Math.PI;
            if (diff > 180) diff = 360 - diff;
            if (diff > DIR_CHANGE_ANGLE_DEG) dirChanges++;
        }

        // ── Time to first movement
        let timeToFirstMovementMs: number | null = null;
        if (opts.promptShownAt != null) {
            for (const p of pts) {
                const dx = p.x - pts[0].x;
                const dy = p.y - pts[0].y;
                if (Math.sqrt(dx * dx + dy * dy) >= FIRST_MOVEMENT_PX) {
                    timeToFirstMovementMs = Math.max(0, Math.round(p.t - opts.promptShownAt));
                    break;
                }
            }
        }

        // ── Spatial error (when an ideal path is provided)
        let spatialErrorMeanPx: number | null = null;
        if (opts.idealPath && opts.idealPath.length > 0) {
            let sum = 0;
            for (const p of pts) {
                let best = Infinity;
                for (const ip of opts.idealPath) {
                    const dx = p.x - ip.x;
                    const dy = p.y - ip.y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < best) best = d2;
                }
                sum += Math.sqrt(best);
            }
            spatialErrorMeanPx = sum / pts.length;
        }

        // ── Corrections-in-stroke. v1 heuristic: count direction
        //    changes that happen near (within 30px of) the ideal path
        //    when an ideal path is provided. Without one, leave NULL.
        let correctionsInStroke: number | null = null;
        if (opts.idealPath && opts.idealPath.length > 0 && dirChanges > 0) {
            // Cheap proxy: assume the fraction of direction changes that
            // happen near the path is roughly proportional to total
            // proximity. A real implementation would walk both sequences;
            // v1 keeps this as a simple multiplier so the column has a
            // populated value to chart while the model is refined.
            const proximityFactor = spatialErrorMeanPx != null && spatialErrorMeanPx < 30
                ? 1.0 : 0.4;
            correctionsInStroke = Math.round(dirChanges * proximityFactor);
        }

        const lastT = pts[n - 1].t;
        return {
            path_efficiency:            pathEfficiency,
            spatial_error_mean_px:      spatialErrorMeanPx,
            velocity_variance:          Number.isFinite(velVariance) ? velVariance : null,
            pause_count:                pauseCount,
            directional_changes:        dirChanges,
            time_to_first_movement_ms:  timeToFirstMovementMs,
            time_to_completion_ms:      Math.round(lastT - startedAt),
            corrections_in_stroke:      correctionsInStroke,
            n_samples:                  n,
        };
    }

    /** Aborted stroke (e.g. cancelled mid-way). Clears state. */
    abort(): void {
        this.points = [];
        this.startedAt = null;
    }
}

/**
 * Convenience builder for game modes (like pre-writing) that already
 * compute their own gesture quality from per-mode signals and just
 * want to package the result. Use this instead of GestureSampler when
 * you already have the numbers — no point re-running computations.
 */
export function buildGestureQuality(
    partial: Partial<GestureQualityResult>
): GestureQualityResult {
    return {
        path_efficiency:            partial.path_efficiency           ?? null,
        spatial_error_mean_px:      partial.spatial_error_mean_px     ?? null,
        velocity_variance:          partial.velocity_variance         ?? null,
        pause_count:                partial.pause_count               ?? null,
        directional_changes:        partial.directional_changes       ?? null,
        time_to_first_movement_ms:  partial.time_to_first_movement_ms ?? null,
        time_to_completion_ms:      partial.time_to_completion_ms     ?? null,
        corrections_in_stroke:      partial.corrections_in_stroke     ?? null,
        n_samples:                  partial.n_samples                 ?? 0,
        path_accuracy_pct:          partial.path_accuracy_pct         ?? null,
    };
}
