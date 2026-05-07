import { DrawingUtils } from '@mediapipe/tasks-vision';
import type { TrackingFrameData } from '../../tracking/TrackingLayer';
import { LETTER_PATHS, getAvailableLetters, type PathPoint } from './letterPaths';
import { normalizedToCanvas } from '../../../core/coordinateUtils';
import { isCountdownActive } from '../../../core/countdownService';
import { logEvent } from '../../../lib/analytics';

// Start with shapes, then move to letters
const SHAPES: Array<{ name: string; points: PathPoint[] }> = [
    { name: 'Vertical Line', points: [{ x: 0.5, y: 0.25 }, { x: 0.5, y: 0.75 }] },
    { name: 'Horizontal Line', points: [{ x: 0.25, y: 0.5 }, { x: 0.75, y: 0.5 }] },
    { name: 'Diagonal Line', points: [{ x: 0.25, y: 0.25 }, { x: 0.75, y: 0.75 }] },
    { name: 'V Shape', points: [{ x: 0.25, y: 0.25 }, { x: 0.5, y: 0.75 }, { x: 0.75, y: 0.25 }] },
    { name: 'Zigzag', points: [{ x: 0.2, y: 0.3 }, { x: 0.4, y: 0.7 }, { x: 0.6, y: 0.3 }, { x: 0.8, y: 0.7 }] },
];

// Combine shapes and letters
const ALL_PATHS: Array<{ name: string; points: PathPoint[]; isLetter: boolean }> = [
    ...SHAPES.map(s => ({ ...s, isLetter: false })),
    ...getAvailableLetters().map(letter => {
        const path = LETTER_PATHS[letter];
        return { name: letter, points: path.points, isLetter: true };
    })
];

let currentPathIndex = 0;
let progress = 0;
let onPathStreak = 0;
let celebrationTime = 0;
let completeCallback: (() => void) | null = null;

const PATH_TOLERANCE_PX = 30; // Pixels - converted from normalized based on canvas size
const PROGRESS_THRESHOLD = 0.02;

export const setCompleteCallback = (callback: (() => void) | null) => {
    completeCallback = callback;
};

export const getCelebrationTime = () => celebrationTime;

export const getCurrentPathIndex = () => currentPathIndex;
export const getCurrentPathName = () => ALL_PATHS[currentPathIndex]?.name || '';
export const getProgress = () => progress;
export const getTotalPaths = () => ALL_PATHS.length;
export const isCurrentLetter = () => ALL_PATHS[currentPathIndex]?.isLetter || false;

export const resetPath = () => {
    progress = 0;
    onPathStreak = 0;
    celebrationTime = 0;
};

export const resetAllPaths = () => {
    currentPathIndex = 0;
    resetPath();
};

export const nextPath = () => {
    if (currentPathIndex < ALL_PATHS.length - 1) {
        currentPathIndex++;
        resetPath();
        return true;
    }
    return false;
};

/**
 * Jump to a specific path by name (case-insensitive).
 * Used by the SEO trace pages via deep-link URL param: ?trace=A, ?trace=5, ?trace=circle
 * Returns true if found, false if not (stays at index 0).
 */
export const setInitialPathById = (name: string): boolean => {
    const lower = name.toLowerCase();
    const idx = ALL_PATHS.findIndex(p => p.name.toLowerCase() === lower);
    if (idx !== -1) {
        currentPathIndex = idx;
        resetPath();
        return true;
    }
    return false;
};


/**
 * Get point on path at normalized position t (0-1)
 */
const getPointOnPath = (points: PathPoint[], t: number): PathPoint => {
    if (points.length < 2) return points[0];

    const segmentCount = points.length - 1;
    const scaledT = t * segmentCount;
    const segmentIndex = Math.min(Math.floor(scaledT), segmentCount - 1);
    const localT = scaledT - segmentIndex;

    const p1 = points[segmentIndex];
    const p2 = points[segmentIndex + 1];

    return {
        x: p1.x + (p2.x - p1.x) * localT,
        y: p1.y + (p2.y - p1.y) * localT
    };
};

/**
 * Calculate distance from point to path in pixels
 */
const distanceToPath = (
    point: PathPoint,
    pathPoints: PathPoint[],
    canvasWidth: number,
    canvasHeight: number
): { distance: number; t: number } => {
    let minDist = Infinity;
    let bestT = 0;

    // Sample path at many points to find closest
    const samples = 150;
    for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const pathPoint = getPointOnPath(pathPoints, t);
        const canvasPoint = normalizedToCanvas(point, canvasWidth, canvasHeight);
        const canvasPathPoint = normalizedToCanvas(pathPoint, canvasWidth, canvasHeight);
        const dist = Math.hypot(canvasPoint.x - canvasPathPoint.x, canvasPoint.y - canvasPathPoint.y);

        if (dist < minDist) {
            minDist = dist;
            bestT = t;
        }
    }

    return { distance: minDist, t: bestT };
};

export const preWritingLogic = (
    ctx: CanvasRenderingContext2D,
    frameData: TrackingFrameData,
    width: number,
    height: number,
    _drawingUtils: DrawingUtils | null
) => {
    const currentPath = ALL_PATHS[currentPathIndex];
    if (!currentPath) return;

    const pathPoints = currentPath.points;
    const { indexTip, thumbTip, handScale, confidence } = frameData;

    // Pre-calculate canvas points for start/end markers
    const startPoint = pathPoints[0];
    const endPoint = pathPoints[pathPoints.length - 1];
    const startCanvasPoint = normalizedToCanvas(startPoint, width, height);
    const endCanvasPoint = normalizedToCanvas(endPoint, width, height);

    // Calculate tolerance in pixels
    const tolerancePx = PATH_TOLERANCE_PX;

    // ── Path guide — bright Kid-UI deep-plum dotted track ────────────────
    // Soft drop shadow underneath (sells the depth) + pillowy lavender body
    // + thin deep-plum dots on top. Visible against bright sky.
    ctx.save();

    // Layer 1 — soft shadow under the path (lavender, pillowy)
    ctx.strokeStyle = 'rgba(108, 63, 164, 0.10)';
    ctx.lineWidth = 56;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const startCanvas = normalizedToCanvas(pathPoints[0], width, height);
    ctx.moveTo(startCanvas.x, startCanvas.y);
    for (let i = 1; i < pathPoints.length; i++) {
        const canvasPoint = normalizedToCanvas(pathPoints[i], width, height);
        ctx.lineTo(canvasPoint.x, canvasPoint.y);
    }
    ctx.stroke();

    // Layer 2 — pillowy lavender body
    ctx.strokeStyle = 'rgba(168, 142, 220, 0.55)';
    ctx.lineWidth = 44;
    ctx.beginPath();
    ctx.moveTo(startCanvas.x, startCanvas.y);
    for (let i = 1; i < pathPoints.length; i++) {
        const cp = normalizedToCanvas(pathPoints[i], width, height);
        ctx.lineTo(cp.x, cp.y);
    }
    ctx.stroke();

    // Layer 3 — top inner highlight (white wash)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 36;
    ctx.beginPath();
    ctx.moveTo(startCanvas.x, startCanvas.y);
    for (let i = 1; i < pathPoints.length; i++) {
        const cp = normalizedToCanvas(pathPoints[i], width, height);
        ctx.lineTo(cp.x, cp.y);
    }
    ctx.stroke();

    // Layer 4 — deep plum direction dots (gives the path its readable rhythm)
    ctx.setLineDash([4, 16]);
    ctx.strokeStyle = 'rgba(108, 63, 164, 0.65)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(startCanvas.x, startCanvas.y);
    for (let i = 1; i < pathPoints.length; i++) {
        const cp = normalizedToCanvas(pathPoints[i], width, height);
        ctx.lineTo(cp.x, cp.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // ── Progress trail — sunshine→aqua glossy ribbon over the guide ──────
    if (progress > 0) {
        const progressPoints: PathPoint[] = [];
        const steps = Math.ceil(progress * 100);
        for (let i = 0; i <= steps; i++) {
            const t = Math.min((i / 100), progress);
            progressPoints.push(getPointOnPath(pathPoints, t));
        }

        if (progressPoints.length >= 2) {
            // Glow halo
            ctx.save();
            ctx.shadowColor = 'rgba(85, 221, 224, 0.65)';
            ctx.shadowBlur = 22;
            ctx.strokeStyle = 'rgba(85, 221, 224, 0.55)';
            ctx.lineWidth = 50;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            const fc = normalizedToCanvas(progressPoints[0], width, height);
            ctx.moveTo(fc.x, fc.y);
            for (let i = 1; i < progressPoints.length; i++) {
                const cp = normalizedToCanvas(progressPoints[i], width, height);
                ctx.lineTo(cp.x, cp.y);
            }
            ctx.stroke();
            ctx.restore();

            // Solid ribbon body
            ctx.strokeStyle = '#55DDE0';
            ctx.lineWidth = 32;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            const fc2 = normalizedToCanvas(progressPoints[0], width, height);
            ctx.moveTo(fc2.x, fc2.y);
            for (let i = 1; i < progressPoints.length; i++) {
                const cp = normalizedToCanvas(progressPoints[i], width, height);
                ctx.lineTo(cp.x, cp.y);
            }
            ctx.stroke();

            // Top inner highlight (glossy 2.5D feel)
            ctx.strokeStyle = 'rgba(255,255,255,0.55)';
            ctx.lineWidth = 14;
            ctx.beginPath();
            const fc3 = normalizedToCanvas(progressPoints[0], width, height);
            ctx.moveTo(fc3.x, fc3.y);
            for (let i = 1; i < progressPoints.length; i++) {
                const cp = normalizedToCanvas(progressPoints[i], width, height);
                ctx.lineTo(cp.x, cp.y);
            }
            ctx.stroke();
        }
    }

    // ── Start marker — tactile 3D meadow-green orb with shadow + highlight
    {
        const pulse = Math.sin(Date.now() / 220) * 4 + 22; // 18..26
        const sx = startCanvasPoint.x;
        const sy = startCanvasPoint.y;

        // Drop shadow
        ctx.fillStyle = 'rgba(108, 63, 164, 0.30)';
        ctx.beginPath();
        ctx.ellipse(sx + 2, sy + pulse * 0.85, pulse * 0.95, pulse * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();

        // Glow halo when active
        if (progress < 0.05) {
            ctx.save();
            ctx.shadowColor = 'rgba(126, 217, 87, 0.7)';
            ctx.shadowBlur = 28;
            ctx.fillStyle = 'rgba(126, 217, 87, 0.45)';
            ctx.beginPath();
            ctx.arc(sx, sy, pulse + 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Orb body — radial gradient
        const orbGrad = ctx.createRadialGradient(sx - pulse * 0.3, sy - pulse * 0.3, pulse * 0.1, sx, sy, pulse);
        orbGrad.addColorStop(0, '#D7F8C4');
        orbGrad.addColorStop(0.55, progress < 0.05 ? '#7ED957' : '#9BE08A');
        orbGrad.addColorStop(1, '#5BB04A');
        ctx.fillStyle = orbGrad;
        ctx.beginPath();
        ctx.arc(sx, sy, pulse, 0, Math.PI * 2);
        ctx.fill();

        // Specular highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath();
        ctx.ellipse(sx - pulse * 0.32, sy - pulse * 0.32, pulse * 0.30, pulse * 0.20, -0.4, 0, Math.PI * 2);
        ctx.fill();

        // Outline
        ctx.strokeStyle = 'rgba(58, 122, 38, 0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, pulse, 0, Math.PI * 2);
        ctx.stroke();
    }

    // ── End marker — tactile 3D sunshine target ring → filled orb at completion
    {
        const ex = endCanvasPoint.x;
        const ey = endCanvasPoint.y;
        const r = 22;

        // Drop shadow
        ctx.fillStyle = 'rgba(108, 63, 164, 0.22)';
        ctx.beginPath();
        ctx.ellipse(ex + 2, ey + r * 0.85, r * 0.95, r * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();

        if (progress > 0.95) {
            // Filled sunshine orb (success)
            const targetGrad = ctx.createRadialGradient(ex - r * 0.3, ey - r * 0.3, r * 0.1, ex, ey, r);
            targetGrad.addColorStop(0, '#FFF6D6');
            targetGrad.addColorStop(0.55, '#FFD84D');
            targetGrad.addColorStop(1, '#FFB14D');
            ctx.fillStyle = targetGrad;
            ctx.beginPath();
            ctx.arc(ex, ey, r, 0, Math.PI * 2);
            ctx.fill();

            // Specular
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.ellipse(ex - r * 0.3, ey - r * 0.3, r * 0.3, r * 0.18, -0.4, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = 'rgba(168, 110, 30, 0.55)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(ex, ey, r, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            // Empty target ring — pillowy plum-bordered cream disc
            const ringGrad = ctx.createRadialGradient(ex - r * 0.2, ey - r * 0.2, r * 0.1, ex, ey, r);
            ringGrad.addColorStop(0, '#FFFFFF');
            ringGrad.addColorStop(1, '#F4FAFF');
            ctx.fillStyle = ringGrad;
            ctx.beginPath();
            ctx.arc(ex, ey, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(108, 63, 164, 0.55)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(ex, ey, r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(108, 63, 164, 0.30)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(ex, ey, r * 0.55, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    ctx.restore();

    // Process finger position - only when pinching (pen down)
    if (!isCountdownActive() && indexTip && thumbTip) {
        // Detect pinch
        const pinchDistance = Math.hypot(
            indexTip.x - thumbTip.x,
            indexTip.y - thumbTip.y
        );
        const pinchThreshold = handScale * 0.4;
        const isPinching = pinchDistance < pinchThreshold;

        if (isPinching && confidence >= 0.6) {
            const fingerPoint = indexTip;
            const { distance, t } = distanceToPath(fingerPoint, pathPoints, width, height);

            const fingerCanvas = normalizedToCanvas(fingerPoint, width, height);

            // Check if on path
            const onPath = distance < tolerancePx;

            if (onPath) {
                onPathStreak++;

                // Update progress if moving forward
                if (t > progress + PROGRESS_THRESHOLD * 0.5 && t < progress + 0.15) {
                    progress = t;
                } else if (t < progress - 0.05) {
                    // Moved backward significantly - ignore
                }

                // On-path feedback — tactile aqua brush with halo + highlight
                ctx.save();
                ctx.shadowColor = 'rgba(85, 221, 224, 0.7)';
                ctx.shadowBlur = 18;
                const onGrad = ctx.createRadialGradient(
                    fingerCanvas.x - 6, fingerCanvas.y - 6, 2,
                    fingerCanvas.x, fingerCanvas.y, 20,
                );
                onGrad.addColorStop(0, '#E8FBFC');
                onGrad.addColorStop(0.6, '#55DDE0');
                onGrad.addColorStop(1, '#3FA8AC');
                ctx.fillStyle = onGrad;
                ctx.beginPath();
                ctx.arc(fingerCanvas.x, fingerCanvas.y, 20, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
                ctx.beginPath();
                ctx.ellipse(fingerCanvas.x - 6, fingerCanvas.y - 6, 5, 3, -0.4, 0, Math.PI * 2);
                ctx.fill();

                if (onPathStreak > 20) {
                    ctx.font = '700 22px Fredoka, "Baloo 2", system-ui, sans-serif';
                    ctx.fillStyle = '#FFB14D';
                    ctx.fillText('🔥', fingerCanvas.x + 24, fingerCanvas.y - 12);
                }
            } else {
                onPathStreak = 0;

                // Off-path feedback — coral nudge ring (gentle, not punitive)
                ctx.save();
                ctx.shadowColor = 'rgba(255, 107, 107, 0.55)';
                ctx.shadowBlur = 14;
                ctx.strokeStyle = '#FF6B6B';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(fingerCanvas.x, fingerCanvas.y, 20, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();

                // Arrow pointing to the nearest path point
                const nearestPoint = getPointOnPath(pathPoints, t);
                const nearestCanvas = normalizedToCanvas(nearestPoint, width, height);
                const angle = Math.atan2(nearestCanvas.y - fingerCanvas.y, nearestCanvas.x - fingerCanvas.x);
                const arrowLength = 36;
                const tipX = fingerCanvas.x + Math.cos(angle) * arrowLength;
                const tipY = fingerCanvas.y + Math.sin(angle) * arrowLength;
                const headSize = 12;

                ctx.strokeStyle = '#FF6B6B';
                ctx.lineWidth = 4;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(fingerCanvas.x, fingerCanvas.y);
                ctx.lineTo(tipX, tipY);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(tipX, tipY);
                ctx.lineTo(
                    tipX - Math.cos(angle - 0.5) * headSize,
                    tipY - Math.sin(angle - 0.5) * headSize,
                );
                ctx.moveTo(tipX, tipY);
                ctx.lineTo(
                    tipX - Math.cos(angle + 0.5) * headSize,
                    tipY - Math.sin(angle + 0.5) * headSize,
                );
                ctx.stroke();
            }
        }
    }

    // Check completion - trigger callback instead of drawing on canvas
    if (progress >= 0.95 && celebrationTime === 0) {
        celebrationTime = Date.now();
        logEvent('mode_completed', { game_mode: 'pre-writing', stage_id: currentPath.name });
        if (completeCallback) {
            completeCallback();
        }
    }

    // No canvas celebration - handled by React component
};
