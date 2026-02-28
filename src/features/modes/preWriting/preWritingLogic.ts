import { DrawingUtils } from '@mediapipe/tasks-vision';
import type { TrackingFrameData } from '../../tracking/TrackingLayer';
import { LETTER_PATHS, getAvailableLetters, type PathPoint } from './letterPaths';
import { normalizedToCanvas } from '../../../core/coordinateUtils';
import { isCountdownActive } from '../../../core/countdownService';
import { pilotAnalytics } from '../../../lib/pilotAnalytics';

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

    // Draw path guide (dashed ghost line) - UNMIRRORED
    ctx.save();
    ctx.setLineDash([20, 20]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 45;
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
    ctx.setLineDash([]);

    // Draw progress (solid glow line)
    if (progress > 0) {
        const progressPoints: PathPoint[] = [];
        const steps = Math.ceil(progress * 100);

        for (let i = 0; i <= steps; i++) {
            const t = Math.min((i / 100), progress);
            progressPoints.push(getPointOnPath(pathPoints, t));
        }

        if (progressPoints.length >= 2) {
            // Glow layers
            [
                { width: 60, alpha: 0.08 },
                { width: 45, alpha: 0.16 },
                { width: 30, alpha: 0.3 }
            ].forEach(layer => {
                ctx.save();
                ctx.globalAlpha = layer.alpha;
                ctx.strokeStyle = '#00F5D4';
                ctx.shadowBlur = 6;
                ctx.shadowColor = 'rgba(0, 245, 212, 0.4)';
                ctx.lineWidth = layer.width;
                ctx.lineCap = 'round';

                ctx.beginPath();
                const firstCanvas = normalizedToCanvas(progressPoints[0], width, height);
                ctx.moveTo(firstCanvas.x, firstCanvas.y);
                for (let i = 1; i < progressPoints.length; i++) {
                    const canvasPoint = normalizedToCanvas(progressPoints[i], width, height);
                    ctx.lineTo(canvasPoint.x, canvasPoint.y);
                }
                ctx.stroke();
                ctx.restore();
            });

            // Main progress line
            ctx.strokeStyle = '#00F5D4';
            ctx.lineWidth = 30;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.beginPath();
            const firstCanvas = normalizedToCanvas(progressPoints[0], width, height);
            ctx.moveTo(firstCanvas.x, firstCanvas.y);
            for (let i = 1; i < progressPoints.length; i++) {
                const canvasPoint = normalizedToCanvas(progressPoints[i], width, height);
                ctx.lineTo(canvasPoint.x, canvasPoint.y);
            }
            ctx.stroke();
        }
    }

    // Draw start marker (pulsing green dot)
    const pulse = Math.sin(Date.now() / 200) * 5 + 20;

    ctx.beginPath();
    ctx.arc(startCanvasPoint.x, startCanvasPoint.y, pulse, 0, Math.PI * 2);
    ctx.fillStyle = progress < 0.05 ? '#00FF00' : 'rgba(0, 255, 0, 0.3)';
    ctx.shadowColor = '#00FF00';
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw end marker
    ctx.beginPath();
    ctx.arc(endCanvasPoint.x, endCanvasPoint.y, 20, 0, Math.PI * 2);
    ctx.strokeStyle = progress > 0.95 ? '#FFD700' : 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 4;
    ctx.stroke();

    if (progress > 0.95) {
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(endCanvasPoint.x, endCanvasPoint.y, 15, 0, Math.PI * 2);
        ctx.fill();
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

                // Draw on-path feedback (green brush)
                ctx.beginPath();
                ctx.arc(fingerCanvas.x, fingerCanvas.y, 18, 0, Math.PI * 2);
                ctx.fillStyle = '#00F5D4';
                ctx.shadowColor = '#00F5D4';
                ctx.shadowBlur = 15;
                ctx.fill();
                ctx.shadowBlur = 0;

                // Streak indicator
                if (onPathStreak > 20) {
                    ctx.font = '28px Arial';
                    ctx.fillStyle = 'orange';
                    ctx.fillText('🔥', fingerCanvas.x + 25, fingerCanvas.y - 10);
                }
            } else {
                onPathStreak = 0;

                // Draw off-path feedback (red ring + arrow)
                ctx.beginPath();
                ctx.arc(fingerCanvas.x, fingerCanvas.y, 18, 0, Math.PI * 2);
                ctx.strokeStyle = '#FF4444';
                ctx.lineWidth = 4;
                ctx.stroke();

                // Draw arrow pointing to nearest path point
                const nearestPoint = getPointOnPath(pathPoints, t);
                const nearestCanvas = normalizedToCanvas(nearestPoint, width, height);
                const angle = Math.atan2(nearestCanvas.y - fingerCanvas.y, nearestCanvas.x - fingerCanvas.x);
                const arrowLength = 35;

                ctx.beginPath();
                ctx.moveTo(fingerCanvas.x, fingerCanvas.y);
                ctx.lineTo(fingerCanvas.x + Math.cos(angle) * arrowLength, fingerCanvas.y + Math.sin(angle) * arrowLength);
                ctx.strokeStyle = '#FF4444';
                ctx.lineWidth = 4;
                ctx.stroke();

                // Arrow head
                const headSize = 12;
                ctx.beginPath();
                ctx.moveTo(
                    fingerCanvas.x + Math.cos(angle) * arrowLength,
                    fingerCanvas.y + Math.sin(angle) * arrowLength
                );
                ctx.lineTo(
                    fingerCanvas.x + Math.cos(angle - 0.5) * (arrowLength - headSize),
                    fingerCanvas.y + Math.sin(angle - 0.5) * (arrowLength - headSize)
                );
                ctx.moveTo(
                    fingerCanvas.x + Math.cos(angle) * arrowLength,
                    fingerCanvas.y + Math.sin(angle) * arrowLength
                );
                ctx.lineTo(
                    fingerCanvas.x + Math.cos(angle + 0.5) * (arrowLength - headSize),
                    fingerCanvas.y + Math.sin(angle + 0.5) * (arrowLength - headSize)
                );
                ctx.stroke();
            }
        }
    }

    // Check completion - trigger callback instead of drawing on canvas
    if (progress >= 0.95 && celebrationTime === 0) {
        celebrationTime = Date.now();
        pilotAnalytics.logEvent('stage_completed', { gameId: 'preWriting', stageId: currentPath.name });
        if (completeCallback) {
            completeCallback();
        }
    }

    // No canvas celebration - handled by React component
};
