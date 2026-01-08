/**
 * Tracing Logic V2 - Robust Progress Evaluation and Assist System
 * 
 * Uses shared interaction state:
 * - filteredPoint for scoring (not predictedPoint)
 * - pinchActive for drawing state
 * - confidence for quality checks
 * 
 * Features:
 * - Robust progress evaluation on polyline paths
 * - Assist system (gentle attraction to centerline)
 * - Pause/resume with clean stroke segments
 * - Accuracy tracking
 * - Forward-only progress (no skipping)
 */

import type { TrackingFrameData } from '../../../features/tracking/TrackingLayer';
import { trackingFeatures } from '../../../core/trackingFeatures';
import { perf } from '../../../core/perf';
import type { TracingPath, PathPoint } from './tracingContent';
import { completeLevel, advanceToNextLevel, getCurrentPath } from './tracingProgress';
import type { DrawingUtils } from '@mediapipe/tasks-vision';

export interface TracingState {
    path: TracingPath | null;
    progress: number; // 0-1 along path (actual farthest point reached)
    isPaused: boolean;
    isCompleted: boolean;
    onPath: boolean;
    nearestDistance: number;
    accuracy: number; // 0-1 (time on path / total time)
    timeOnPath: number;
    timeOffPath: number;
    retries: number;
    lastHintTime: number;
    lastTimestamp: number;
    lastFingerPos: { x: number; y: number } | null;
    lastPathPosition: number; // T value along path where finger was last frame
    lastProgressUpdateTime: number; // Timestamp of last progress update
    pinchLostTime: number | null; // Timestamp when pinch was lost (for grace window)
    offPathStartTime: number | null; // Timestamp when went off-path (for decay)
    recentMovementHistory: Array<{ timestamp: number; distance: number }>; // Track movement over last 300ms
    lookAheadProgressThisSecond: number; // Track look-ahead progress per second
    lookAheadStartTime: number; // Start time of current second for look-ahead tracking
    lastIdleCheckTime: number; // Timestamp of last idle check
    lastOffPathHintTime: number; // Timestamp of last off-path hint (for cooldown)
    sparkleParticles: Array<{ x: number; y: number; life: number; maxLife: number }>; // Sparkle trail particles
    canvasWidth: number;
    canvasHeight: number;
}

// Module-level state (refs pattern, no React state)
let tracingState: TracingState = {
    path: null,
    progress: 0,
    isPaused: false,
    isCompleted: false,
    onPath: false,
    nearestDistance: Infinity,
    accuracy: 1.0,
    timeOnPath: 0,
    timeOffPath: 0,
    retries: 0,
    lastHintTime: 0,
    lastTimestamp: 0,
    lastFingerPos: null,
    lastPathPosition: 0, // T value along path
    lastProgressUpdateTime: 0, // Timestamp
    pinchLostTime: null,
    offPathStartTime: null,
    recentMovementHistory: [],
    lookAheadProgressThisSecond: 0,
    lookAheadStartTime: 0,
    lastIdleCheckTime: 0,
    lastOffPathHintTime: 0,
    sparkleParticles: [],
    canvasWidth: 1920,
    canvasHeight: 1080
};

// Completion callback
let completionCallback: (() => void) | null = null;

export const setCompletionCallback = (callback: (() => void) | null): void => {
    completionCallback = callback;
};

// Initialize tracing session
export const initializeTracing = (width: number, height: number): void => {
    tracingState.canvasWidth = width;
    tracingState.canvasHeight = height;
    loadCurrentPath();
};

// Load current path and reset state
const loadCurrentPath = (): void => {
    tracingState.path = getCurrentPath();
    tracingState.progress = 0;
    tracingState.isPaused = false;
    tracingState.isCompleted = false;
    tracingState.onPath = false;
    tracingState.nearestDistance = Infinity;
    tracingState.accuracy = 1.0;
    tracingState.timeOnPath = 0;
    tracingState.timeOffPath = 0;
    tracingState.retries = 0;
    tracingState.lastHintTime = 0;
    tracingState.lastTimestamp = 0;
    tracingState.lastFingerPos = null;
    tracingState.lastPathPosition = 0;
    tracingState.lastProgressUpdateTime = 0;
    tracingState.pinchLostTime = null;
    tracingState.offPathStartTime = null;
    tracingState.recentMovementHistory = [];
    tracingState.lookAheadProgressThisSecond = 0;
    tracingState.lookAheadStartTime = Date.now();
    tracingState.lastIdleCheckTime = 0;
    tracingState.lastOffPathHintTime = 0;
    tracingState.sparkleParticles = [];
};

// Export loadCurrentPath so it can be called when advancing levels
export const reloadCurrentPath = (): void => {
    loadCurrentPath();
};

// Find nearest point on polyline path
const findNearestPointOnPath = (
    point: { x: number; y: number },
    path: TracingPath,
    canvasWidth: number,
    canvasHeight: number
): { nearestPoint: { x: number; y: number }; segmentT: number; overallT: number; distance: number } => {
    let minDistance = Infinity;
    let nearestPoint = { x: 0, y: 0 };
    let segmentT = 0;
    let overallT = 0;
    
    const points = path.points;
    
    if (points.length === 0) {
        return { nearestPoint, segmentT: 0, overallT: 0, distance: Infinity };
    }
    
    if (points.length === 1) {
        const px = points[0].x * canvasWidth;
        const py = points[0].y * canvasHeight;
        const dx = point.x * canvasWidth - px;
        const dy = point.y * canvasHeight - py;
        const dist = Math.hypot(dx, dy);
        return {
            nearestPoint: { x: px / canvasWidth, y: py / canvasHeight },
            segmentT: 0,
            overallT: 0,
            distance: dist
        };
    }
    
    const totalLength = calculatePathLength(points, canvasWidth, canvasHeight);
    if (totalLength === 0) {
        return { nearestPoint: { x: points[0].x, y: points[0].y }, segmentT: 0, overallT: 0, distance: 0 };
    }
    
    let accumulatedLength = 0;
    
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = { x: points[i].x * canvasWidth, y: points[i].y * canvasHeight };
        const p1 = { x: points[i + 1].x * canvasWidth, y: points[i + 1].y * canvasHeight };
        
        // Project point onto line segment
        const segLength = Math.hypot(p1.x - p0.x, p1.y - p0.y);
        if (segLength === 0) {
            accumulatedLength = 0; // Reset for next iteration
            continue;
        }
        
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        const pointX = point.x * canvasWidth - p0.x;
        const pointY = point.y * canvasHeight - p0.y;
        
        // Calculate t (position along segment 0-1)
        const t = Math.max(0, Math.min(1, (pointX * dx + pointY * dy) / (segLength * segLength)));
        
        const nearestX = p0.x + t * dx;
        const nearestY = p0.y + t * dy;
        
        const dist = Math.hypot(point.x * canvasWidth - nearestX, point.y * canvasHeight - nearestY);
        
        if (dist < minDistance) {
            minDistance = dist;
            nearestPoint = { x: nearestX / canvasWidth, y: nearestY / canvasHeight };
            segmentT = t;
            overallT = (accumulatedLength + t * segLength) / totalLength;
        }
        
        accumulatedLength += segLength;
    }
    
    return { nearestPoint, segmentT, overallT, distance: minDistance };
};

// Calculate total path length
const calculatePathLength = (points: Array<{ x: number; y: number }>, width: number, height: number): number => {
    let length = 0;
    for (let i = 0; i < points.length - 1; i++) {
        const dx = (points[i + 1].x - points[i].x) * width;
        const dy = (points[i + 1].y - points[i].y) * height;
        length += Math.hypot(dx, dy);
    }
    return length;
};

// Main frame logic
export const tracingLogicV2 = (
    ctx: CanvasRenderingContext2D,
    frameData: TrackingFrameData,
    width: number,
    height: number,
    drawingUtils: DrawingUtils | null
): void => {
    // Update canvas size if changed
    if (tracingState.canvasWidth !== width || tracingState.canvasHeight !== height) {
        tracingState.canvasWidth = width;
        tracingState.canvasHeight = height;
    }
    
    // Load path if not loaded
    if (!tracingState.path) {
        loadCurrentPath();
    }
    
    const { path } = tracingState;
    if (!path) return;
    
    const flags = trackingFeatures.getFlags();
    const useAssist = flags.enableTracingAssist;
    const perfConfig = perf.getConfig();
    const assistRadiusPx = 25; // Pixels - reduced for more accuracy
    
    // Movement requirements - Stricter to prevent false progress and skipping
    const baseMinPhysicalMovementPx = 8; // Base minimum pixels (stricter)
    const adaptiveMinPhysicalMovementPx = 5; // Lower bound for slow/confident tracking (stricter)
    const maxProgressPerFrame = 0.005; // 0.5% max progress per frame (very strict to prevent skipping)
    const minForwardMovement = 0.0025; // 0.25% minimum forward movement (stricter)
    const minTimeBetweenProgressMs = 80; // Minimum ms between updates (stricter to prevent rapid skipping)
    
    // Look-ahead constants - Very conservative to prevent skipping
    const lookAheadDistancePx = 10; // Distance to next segment for look-ahead (reduced)
    const lookAheadMovementWindowMs = 300; // Time window to check for movement
    const lookAheadMovementThresholdPx = 5; // Minimum movement in window (increased)
    const maxLookAheadPerSecond = 0.015; // Max 1.5% progress per second from look-ahead (very conservative)
    const maxLookAheadPerUpdate = 0.005; // Max 0.5% progress per update from look-ahead (very conservative)
    
    // Extra forgiveness constants
    const pinchGraceWindowMs = 200; // Grace window for pinch drops (150-250ms)
    const offPathDecayThresholdMs = 700; // Time off-path before decay starts
    const offPathDecayRate = 0.0005; // Small backward drift per frame when off-path
    const toleranceMultiplier = path.pack <= 2 ? 1.15 : 1.0; // +15% tolerance for Pack 1-2
    
    // Draw path with quality settings
    drawPath(ctx, path, width, height, tracingState.progress, tracingState.onPath, perfConfig);
    
    // Handle pause/resume with grace window
    const now = frameData.timestamp;
    const isPinching = frameData.pinchActive;
    
    if (!isPinching) {
        // Track when pinch was lost (for grace window)
        if (tracingState.pinchLostTime === null) {
            tracingState.pinchLostTime = now;
        }
        
        // Check if grace window has expired
        const timeSincePinchLost = now - tracingState.pinchLostTime;
        if (timeSincePinchLost > pinchGraceWindowMs) {
            tracingState.isPaused = true;
            // Draw paused indicator - will be drawn at end of function
            // Continue to draw path and other visuals even when paused
        }
        // Still in grace window - treat as if pinching
    } else {
        // Pinch is active - clear grace window
        tracingState.pinchLostTime = null;
        
        // Resume from pause - start fresh segment
        if (tracingState.isPaused) {
            tracingState.isPaused = false;
            tracingState.lastFingerPos = null;
            tracingState.lastPathPosition = tracingState.progress;
            tracingState.lastProgressUpdateTime = frameData.timestamp;
            tracingState.recentMovementHistory = [];
        }
    }
    
    // Need filtered point to continue (but still draw path and other elements)
    if (!frameData.filteredPoint || !frameData.hasHand) {
        tracingState.onPath = false;
        if (frameData.filteredPoint) {
            tracingState.lastFingerPos = frameData.filteredPoint;
        }
        // Don't return early - path and other visuals should still be drawn
        // Just skip finger feedback and progress updates
        if (!frameData.filteredPoint) {
            return; // Only return if no point at all
        }
    }
    
    const fingerPos = frameData.filteredPoint;
    
    // Find nearest point on path
    const { overallT, distance } = findNearestPointOnPath(
        fingerPos,
        path,
        width,
        height
    );
    
    tracingState.nearestDistance = distance;
    
    // Check if on path (with increased tolerance for younger levels)
    const tolerancePx = path.tolerancePx * toleranceMultiplier;
    const onPath = distance <= tolerancePx;
    tracingState.onPath = onPath;
    
    // Track off-path time for decay
    if (!onPath) {
        if (tracingState.offPathStartTime === null) {
            tracingState.offPathStartTime = now;
        }
    } else {
        tracingState.offPathStartTime = null;
    }
    
    // Calculate physical finger movement in pixels
    let fingerMovedPx = 0;
    if (tracingState.lastFingerPos) {
        fingerMovedPx = Math.hypot(
            (fingerPos.x - tracingState.lastFingerPos.x) * width,
            (fingerPos.y - tracingState.lastFingerPos.y) * height
        );
    }
    
    // Track recent movement history (for look-ahead feature)
    tracingState.recentMovementHistory.push({
        timestamp: now,
        distance: fingerMovedPx
    });
    // Keep only last 300ms of history
    const cutoffTime = now - lookAheadMovementWindowMs;
    tracingState.recentMovementHistory = tracingState.recentMovementHistory.filter(
        entry => entry.timestamp > cutoffTime
    );
    
    // Calculate total movement in last 300ms
    const recentMovementTotal = tracingState.recentMovementHistory.reduce(
        (sum, entry) => sum + entry.distance, 0
    );
    
    // NUDGE 1: Adaptive minimum movement based on confidence and speed
    // Stricter to prevent false progress
    const confidence = frameData.confidence || 0.7;
    const isMovingSlowly = fingerMovedPx < 6 && recentMovementTotal < 5;
    const isLowConfidence = confidence < 0.75; // Stricter threshold
    
    let minPhysicalMovementPx = baseMinPhysicalMovementPx;
    if (isLowConfidence || isMovingSlowly) {
        // Lower threshold for small hands and jittery cameras (but still strict)
        minPhysicalMovementPx = adaptiveMinPhysicalMovementPx;
    } else if (fingerMovedPx > 30) {
        // Increase threshold when moving very fast to avoid accidental jumps
        minPhysicalMovementPx = baseMinPhysicalMovementPx + 2;
    }
    
    // Update accuracy tracking
    if (tracingState.lastTimestamp > 0) {
        const dt = frameData.timestamp - tracingState.lastTimestamp;
        const dtSeconds = dt / 1000; // Convert to seconds
        if (onPath) {
            tracingState.timeOnPath += dtSeconds;
        } else {
            tracingState.timeOffPath += dtSeconds;
        }
        
        const totalTime = tracingState.timeOnPath + tracingState.timeOffPath;
        tracingState.accuracy = totalTime > 0 ? tracingState.timeOnPath / totalTime : 1.0;
    }
    tracingState.lastTimestamp = frameData.timestamp;
    
    // Calculate forward movement along path
    const forwardMovementOnPath = overallT - tracingState.lastPathPosition;
    
    // Apply off-path decay if off-path for too long (but not if already completed/near completion)
    if (!onPath && tracingState.offPathStartTime !== null && tracingState.progress < path.completionPercent * 0.95) {
        const timeOffPath = now - tracingState.offPathStartTime;
        if (timeOffPath > offPathDecayThresholdMs) {
            // Small backward drift when off-path (but don't decay if very close to completion)
            tracingState.progress = Math.max(0, tracingState.progress - offPathDecayRate);
        }
    }
    
    // Track look-ahead progress per second (reset every second)
    if (now - tracingState.lookAheadStartTime > 1000) {
        tracingState.lookAheadProgressThisSecond = 0;
        tracingState.lookAheadStartTime = now;
    }
    
    // NUDGE 2: Check for look-ahead eligibility - DISABLED to prevent skipping
    // Look-ahead is disabled entirely to ensure progress only advances with actual finger movement
    const canUseLookAhead = false; // DISABLED: Prevents any skipping ahead
    
    let lookAheadBoost = 0;
    // Look-ahead disabled to ensure progress only advances with actual finger movement
    // This prevents alphabets/letters from skipping ahead without user movement
    
    // Check if we can update progress (with grace window for pinch)
    const effectivePinchActive = isPinching || (tracingState.pinchLostTime !== null && 
        (now - tracingState.pinchLostTime) <= pinchGraceWindowMs);
    
    const timeSinceLastProgress = now - tracingState.lastProgressUpdateTime;
    const canUpdateProgress = 
        effectivePinchActive && // Pinching (with grace window)
        onPath && // On path
        fingerMovedPx >= minPhysicalMovementPx && // Has moved (adaptive threshold)
        forwardMovementOnPath > minForwardMovement && // Moving forward along path
        overallT > tracingState.progress && // Ahead of current progress
        timeSinceLastProgress >= minTimeBetweenProgressMs; // Rate limiting
    
    if (canUpdateProgress) {
        // Base progress update - ensure we don't skip ahead
        const maxAllowedProgress = tracingState.progress + maxProgressPerFrame;
        let newProgress = Math.min(overallT, maxAllowedProgress);
        
        // Look-ahead is DISABLED - progress only advances with actual finger movement
        // No look-ahead boost applied to prevent skipping
        
        // Only update if we're actually making progress forward
        // CRITICAL: Ensure we don't skip ahead of actual finger position
        // Progress must be <= overallT (actual finger position on path)
        if (newProgress > tracingState.progress && newProgress <= overallT) {
            // Additional safety: ensure progress doesn't jump too far
            const progressDelta = newProgress - tracingState.progress;
            if (progressDelta <= maxProgressPerFrame * 1.5) { // Allow small overshoot for rounding
                tracingState.progress = newProgress;
                tracingState.lastPathPosition = overallT;
                tracingState.lastProgressUpdateTime = now;
            }
        }
    } else if (onPath) {
        // Update last path position even if not advancing progress (for tracking)
        tracingState.lastPathPosition = overallT;
    }
    
    // Note: Assist is visual only - doesn't affect progress calculation
    // Progress only advances when actually on the path and moving forward
    
    // Draw finger feedback with quality settings
    drawFingerFeedback(ctx, fingerPos, width, height, onPath, perfConfig);
    
    // Add sparkle trail particles when on-path
    if (onPath && frameData.pinchActive) {
        // Add new sparkle particle
        tracingState.sparkleParticles.push({
            x: fingerPos.x * width,
            y: fingerPos.y * height,
            life: 1.0,
            maxLife: 1.0
        });
        
        // Keep only last 15 particles
        if (tracingState.sparkleParticles.length > 15) {
            tracingState.sparkleParticles.shift();
        }
    }
    
    // Update and draw sparkle particles
    tracingState.sparkleParticles = tracingState.sparkleParticles.filter(particle => {
        particle.life -= 0.05; // Fade out
        return particle.life > 0;
    });
    
    if (tracingState.sparkleParticles.length > 0 && perfConfig.visualQuality === 'high') {
        drawSparkleTrail(ctx, tracingState.sparkleParticles);
    }
    
    // Show off-path hint when actively off-path (with cooldown)
    const timeSinceOffPathHint = now - tracingState.lastOffPathHintTime;
    if (!onPath && frameData.pinchActive && timeSinceOffPathHint > 2000) {
        // Show gentle hint: "Try staying on the glowing path"
        drawOffPathHint(ctx, width, height);
        tracingState.lastOffPathHintTime = now;
    }
    
    // Check for idle state (5-7 seconds of minimal movement)
    const isIdle = tracingState.lastFingerPos && fingerPos && 
        Math.hypot(
            (fingerPos.x - tracingState.lastFingerPos.x) * width,
            (fingerPos.y - tracingState.lastFingerPos.y) * height
        ) < 10; // Less than 10px movement = idle
    
    if (isIdle) {
        if (tracingState.lastIdleCheckTime === 0) {
            tracingState.lastIdleCheckTime = now;
        }
        const idleDuration = now - tracingState.lastIdleCheckTime;
        
        // Show idle hint after 5-7 seconds (use 6 seconds as middle)
        const timeSinceLastHint = now - tracingState.lastHintTime;
        if (idleDuration > 6000 && timeSinceLastHint > 6000) {
            // Pulse nearest path segment or start dot
            drawIdleHint(ctx, path, width, height, tracingState.progress);
            tracingState.lastHintTime = now;
        }
    } else {
        // Reset idle timer when moving
        tracingState.lastIdleCheckTime = 0;
    }
    
    // Draw paused indicator if paused (at end, so it's on top)
    if (tracingState.isPaused) {
        drawPausedIndicator(ctx, width, height);
    }
    
    // Check completion (only trigger once) - use small epsilon for floating point comparison
    // Also check if very close to end and finger is at/near end of path (forgiveness near completion)
    // ONLY check here (not in progress update) to prevent duplicate triggers
    const completionEpsilon = 0.001; // 0.1% tolerance for floating point issues
    const isNearCompletion = tracingState.progress >= path.completionPercent - completionEpsilon;
    const isAtPathEnd = overallT >= 0.95; // Finger is at 95%+ of path
    const isVeryCloseToEnd = overallT >= path.completionPercent - 0.05; // Within 5% of completion
    
    // Allow completion even if slightly off-path when very close to end
    const allowNearEndCompletion = isVeryCloseToEnd && distance <= tolerancePx * 1.5; // 50% extra tolerance near end
    
    if (!tracingState.isCompleted && (isNearCompletion || (allowNearEndCompletion && isAtPathEnd))) {
        // If near completion but not quite there, boost progress to completion
        if (tracingState.progress < path.completionPercent && allowNearEndCompletion && isAtPathEnd) {
            tracingState.progress = path.completionPercent;
        }
        
        // Mark as completed FIRST to prevent duplicate triggers
        tracingState.isCompleted = true;
        
        // Save progress
        const accuracy = tracingState.accuracy;
        completeLevel(path.id, accuracy);
        
        // Trigger completion callback ONCE (will handle celebration and auto-advance)
        if (completionCallback) {
            // Use requestAnimationFrame to ensure it runs in the next frame (prevents lag)
            // Use a flag to prevent duplicate calls
            let callbackFired = false;
            requestAnimationFrame(() => {
                if (completionCallback && !callbackFired) {
                    callbackFired = true;
                    completionCallback();
                }
            });
        }
    }
    
    tracingState.lastFingerPos = fingerPos;
};

// Draw path with progress (uses performance config for quality)
const drawPath = (
    ctx: CanvasRenderingContext2D,
    path: TracingPath,
    width: number,
    height: number,
    progress: number,
    onPath: boolean,
    perfConfig: { visualQuality: 'high' | 'low'; shadowBlurScale: number }
): void => {
    const points = path.points;
    if (points.length < 2) return;
    
    // Draw ghost path (base lane - faint, quality-aware)
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = path.tolerancePx * 1.5; // Reduced from 2
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (perfConfig.visualQuality === 'high') {
        ctx.shadowBlur = 3 * perfConfig.shadowBlurScale; // Reduced from 5
        ctx.shadowColor = 'rgba(255, 255, 255, 0.08)'; // More subtle
    }
    ctx.beginPath();
    ctx.moveTo(points[0].x * width, points[0].y * height);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x * width, points[i].y * height);
    }
    ctx.stroke();
    ctx.restore();
    
    // Draw progress (brighter inner lane with high quality rendering)
    // Path fills with light when on-path (more visible)
    if (progress > 0) {
        ctx.save();
        const progressColor = onPath ? '#00F5D4' : '#FFD93D';
        ctx.strokeStyle = progressColor;
        ctx.lineWidth = path.tolerancePx * (onPath ? 0.75 : 0.6); // Reduced thickness
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // High quality shadows and glow on good devices (more subtle)
        if (perfConfig.visualQuality === 'high') {
            ctx.shadowBlur = (onPath ? 20 : 15) * perfConfig.shadowBlurScale; // Reduced from 40/30
            ctx.shadowColor = onPath ? 'rgba(0, 245, 212, 0.5)' : 'rgba(255, 217, 61, 0.4)'; // More subtle
        } else {
            // Lower quality fallback
            ctx.shadowBlur = (onPath ? 12 : 8) * perfConfig.shadowBlurScale; // Reduced from 20/15
            ctx.shadowColor = onPath ? 'rgba(0, 245, 212, 0.4)' : 'rgba(255, 217, 61, 0.3)';
        }
        ctx.beginPath();
        
        const totalLength = calculatePathLength(points, width, height);
        const targetLength = totalLength * progress;
        
        ctx.moveTo(points[0].x * width, points[0].y * height);
        
        let accumulatedLength = 0;
        for (let i = 0; i < points.length - 1; i++) {
            const segLength = Math.hypot(
                (points[i + 1].x - points[i].x) * width,
                (points[i + 1].y - points[i].y) * height
            );
            
            if (accumulatedLength + segLength <= targetLength) {
                // Full segment
                ctx.lineTo(points[i + 1].x * width, points[i + 1].y * height);
                accumulatedLength += segLength;
            } else if (accumulatedLength < targetLength) {
                // Partial segment
                const t = (targetLength - accumulatedLength) / segLength;
                const px = points[i].x + (points[i + 1].x - points[i].x) * t;
                const py = points[i].y + (points[i + 1].y - points[i].y) * t;
                ctx.lineTo(px * width, py * height);
                break;
            } else {
                break;
            }
        }
        
        ctx.stroke();
        ctx.restore();
    }
    
    // Draw start dot (pulsing, quality-aware) - always visible, more prominent at start
    const showStartDotProminently = progress < 0.05; // Show prominently when just starting
    drawStartDot(ctx, points[0], width, height, perfConfig, showStartDotProminently);
    
    // Draw end target (glows when close to complete, quality-aware)
    if (progress > 0.8) {
        drawEndTarget(ctx, points[points.length - 1], width, height, progress, perfConfig);
    }
};


// Draw start dot (quality-aware, more prominent when at start)
const drawStartDot = (
    ctx: CanvasRenderingContext2D,
    point: { x: number; y: number },
    width: number,
    height: number,
    perfConfig: { visualQuality: 'high' | 'low'; shadowBlurScale: number },
    prominent: boolean = false
): void => {
    ctx.save();
    const pulse = Math.sin(Date.now() / 500) * 0.3 + 0.7;
    const baseSize = prominent ? 18 : 14; // Reduced from 28/20
    const size = baseSize * pulse;
    
    // High quality glow (more subtle)
    if (perfConfig.visualQuality === 'high') {
        ctx.shadowBlur = (prominent ? 18 : 12) * perfConfig.shadowBlurScale; // Reduced from 35/25
        ctx.shadowColor = 'rgba(0, 245, 212, 0.6)'; // More subtle
    }
    
    // Outer glow ring when prominent (more subtle)
    if (prominent) {
        ctx.beginPath();
        ctx.arc(point.x * width, point.y * height, size + 6, 0, Math.PI * 2); // Reduced from +10
        ctx.fillStyle = 'rgba(0, 245, 212, 0.15)'; // More transparent
        ctx.fill();
    }
    
    ctx.beginPath();
    ctx.arc(point.x * width, point.y * height, size, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 255, 212, 0.9)'; // Slightly more transparent
    ctx.fill();
    ctx.strokeStyle = '#00F5D4';
    ctx.lineWidth = prominent ? 2.5 : 2; // Reduced from 4/3
    ctx.stroke();
    
    // "START" label with shadow on high quality (smaller and more subtle)
    if (perfConfig.visualQuality === 'high') {
        ctx.shadowBlur = 5 * perfConfig.shadowBlurScale; // Reduced from 8
        ctx.shadowColor = 'rgba(0, 245, 212, 0.4)'; // More subtle
    }
    ctx.fillStyle = '#00F5D4';
    ctx.font = prominent ? 'bold 12px Arial' : 'bold 11px Arial'; // Reduced from 16/14
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('START', point.x * width, point.y * height - size - (prominent ? 6 : 4)); // Reduced spacing
    ctx.restore();
};

// Draw end target (quality-aware)
const drawEndTarget = (
    ctx: CanvasRenderingContext2D,
    point: { x: number; y: number },
    width: number,
    height: number,
    progress: number,
    perfConfig: { visualQuality: 'high' | 'low'; shadowBlurScale: number }
): void => {
    ctx.save();
    const glow = (progress - 0.8) / 0.2; // 0-1 as progress goes from 0.8 to 1.0
    const size = 16 + glow * 6; // Reduced from 25+10
    
    // High quality glow effect (more subtle)
    if (perfConfig.visualQuality === 'high' && glow > 0.5) {
        ctx.shadowBlur = 18 * perfConfig.shadowBlurScale; // Reduced from 40
        ctx.shadowColor = 'rgba(255, 215, 0, 0.5)'; // More subtle
    }
    
    ctx.beginPath();
    ctx.arc(point.x * width, point.y * height, size, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 215, 0, ${0.5 + glow * 0.3})`; // More subtle
    ctx.lineWidth = 2; // Reduced from 3
    ctx.setLineDash([4, 4]); // Slightly smaller dashes
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
};

// Draw finger feedback (quality-aware)
const drawFingerFeedback = (
    ctx: CanvasRenderingContext2D,
    fingerPos: { x: number; y: number },
    width: number,
    height: number,
    onPath: boolean,
    perfConfig: { visualQuality: 'high' | 'low'; shadowBlurScale: number }
): void => {
    ctx.save();
    const size = 16; // Reduced from 22
    const color = onPath ? '#00F5D4' : '#FFD93D';
    
    // High quality glow (more subtle)
    if (perfConfig.visualQuality === 'high' && onPath) {
        ctx.shadowBlur = 15 * perfConfig.shadowBlurScale; // Reduced from 30
        ctx.shadowColor = `rgba(0, 245, 212, 0.5)`; // More subtle
    } else if (perfConfig.visualQuality === 'high') {
        ctx.shadowBlur = 10 * perfConfig.shadowBlurScale; // Reduced from 15
        ctx.shadowColor = `rgba(255, 217, 61, 0.4)`; // More subtle
    }
    
    ctx.beginPath();
    ctx.arc(fingerPos.x * width, fingerPos.y * height, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${onPath ? 0.9 : 0.75})`; // Slightly more transparent
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5; // Reduced from 4
    ctx.stroke();
    ctx.restore();
};

// Draw off-path hint (gentle, no punishment)
const drawOffPathHint = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
): void => {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 217, 61, 0.15)';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(255, 217, 61, 0.5)';
    ctx.fillText('Try staying on the glowing path', width / 2, height / 2 + 100);
    ctx.restore();
};

// Draw idle hint (pulse nearest segment or start dot)
const drawIdleHint = (
    ctx: CanvasRenderingContext2D,
    path: TracingPath,
    width: number,
    height: number,
    progress: number
): void => {
    ctx.save();
    const pulse = Math.sin(Date.now() / 300) * 0.3 + 0.7;
    
    // If progress is very low, pulse start dot
    if (progress < 0.1) {
        const startPoint = path.points[0];
        const size = 30 * pulse;
        ctx.beginPath();
        ctx.arc(startPoint.x * width, startPoint.y * height, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 215, 0, ${0.6 * pulse})`;
        ctx.shadowBlur = 20 * pulse;
        ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
        ctx.fill();
    } else {
        // Pulse nearest path segment
        const totalLength = calculatePathLength(path.points, width, height);
        const targetLength = totalLength * progress;
        
        let accumulatedLength = 0;
        for (let i = 0; i < path.points.length - 1; i++) {
            const segLength = Math.hypot(
                (path.points[i + 1].x - path.points[i].x) * width,
                (path.points[i + 1].y - path.points[i].y) * height
            );
            
            if (accumulatedLength + segLength >= targetLength) {
                // This is the nearest segment - pulse it
                ctx.strokeStyle = `rgba(255, 215, 0, ${0.8 * pulse})`;
                ctx.lineWidth = path.tolerancePx * 1.5 * pulse;
                ctx.lineCap = 'round';
                ctx.shadowBlur = 15 * pulse;
                ctx.shadowColor = 'rgba(255, 215, 0, 0.6)';
                ctx.beginPath();
                ctx.moveTo(path.points[i].x * width, path.points[i].y * height);
                ctx.lineTo(path.points[i + 1].x * width, path.points[i + 1].y * height);
                ctx.stroke();
                break;
            }
            accumulatedLength += segLength;
        }
    }
    ctx.restore();
};

// Draw sparkle trail (subtle sparkles when on-path)
const drawSparkleTrail = (
    ctx: CanvasRenderingContext2D,
    particles: Array<{ x: number; y: number; life: number; maxLife: number }>
): void => {
    ctx.save();
    particles.forEach(particle => {
        const alpha = particle.life;
        const size = 3 * alpha;
        ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * alpha})`;
        ctx.shadowBlur = 5 * alpha;
        ctx.shadowColor = 'rgba(0, 245, 212, 0.6)';
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.restore();
};

// Draw paused indicator (bottom center, more visible)
const drawPausedIndicator = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
): void => {
    ctx.save();
    // Background for better visibility
    ctx.fillStyle = 'rgba(255, 217, 61, 0.25)';
    ctx.fillRect(width / 2 - 100, height - 80, 200, 50);
    
    // Border
    ctx.strokeStyle = 'rgba(255, 217, 61, 0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(width / 2 - 100, height - 80, 200, 50);
    
    // Text
    ctx.fillStyle = '#FFD93D';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(255, 217, 61, 0.8)';
    ctx.fillText('⏸️ Paused', width / 2, height - 55);
    ctx.restore();
};

// Get current state (for UI polling)
export const getTracingState = (): TracingState => {
    return { ...tracingState };
};

// Reset current level
export const resetLevel = (): void => {
    loadCurrentPath();
};

// Advance to next level
export const nextLevel = (): boolean => {
    if (advanceToNextLevel()) {
        loadCurrentPath();
        return true;
    }
    return false;
};
