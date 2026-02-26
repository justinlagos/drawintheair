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
import { perf } from '../../../core/perf';
import type { TracingPath } from './tracingContent';
import { completeLevel, advanceToNextLevel, getCurrentPath } from './tracingProgress';
import type { DrawingUtils } from '@mediapipe/tasks-vision';
import { trackingFeatures } from '../../../core/trackingFeatures';
import { DifficultyController } from '../../../core/DifficultyController';
import { tactileAudioManager } from '../../../core/TactileAudioManager';
import { featureFlags } from '../../../core/featureFlags';
import { isCountdownActive } from '../../../core/countdownService';

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
    // Streak system
    streakMeter: number; // 0-1, builds on-path, decays off-path
    streakStartTime: number | null; // When current streak started
    lastStreakUpdateTime: number; // Last time streak was updated
    streakActive: boolean; // Whether currently building streak
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
    canvasHeight: 1080,
    // Streak system
    streakMeter: 0,
    streakStartTime: null,
    lastStreakUpdateTime: 0,
    streakActive: false
};

// Completion callback
let completionCallback: (() => void) | null = null;

export const setCompletionCallback = (callback: (() => void) | null): void => {
    completionCallback = callback;
};

// Difficulty controller instance (lazy initialized)
let difficultyController: DifficultyController | null = null;
let lastDifficultyUpdateTime: number = 0;

const getDifficultyController = (): DifficultyController | null => {
    const flags = trackingFeatures.getFlags();
    if (flags.enableDynamicDifficulty) {
        if (!difficultyController) {
            difficultyController = new DifficultyController();
        }
        return difficultyController;
    }
    return null;
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
    // Reset streak
    tracingState.streakMeter = 0;
    tracingState.streakStartTime = null;
    tracingState.lastStreakUpdateTime = 0;
    tracingState.streakActive = false;
    tracingState.offPathStartTime = null;
    tracingState.recentMovementHistory = [];
    tracingState.lookAheadProgressThisSecond = 0;
    tracingState.lookAheadStartTime = Date.now();
    tracingState.lastIdleCheckTime = 0;
    tracingState.lastOffPathHintTime = 0;
    tracingState.sparkleParticles = [];
    
    // Reset difficulty controller if enabled
    const dds = getDifficultyController();
    if (dds) {
        dds.reset();
    }
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
    _drawingUtils: DrawingUtils | null
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
    
    const perfConfig = perf.getConfig();
    
    // Movement requirements - Stricter to prevent false progress and skipping
    const baseMinPhysicalMovementPx = 8; // Base minimum pixels (stricter)
    const adaptiveMinPhysicalMovementPx = 5; // Lower bound for slow/confident tracking (stricter)
    const maxProgressPerFrame = 0.005; // 0.5% max progress per frame (very strict to prevent skipping)
    const minForwardMovement = 0.0025; // 0.25% minimum forward movement (stricter)
    const minTimeBetweenProgressMs = 80; // Minimum ms between updates (stricter to prevent rapid skipping)
    
    // Look-ahead constants - Very conservative to prevent skipping
    const lookAheadMovementWindowMs = 300; // Time window to check for movement
    
    // Extra forgiveness constants
    const pinchGraceWindowMs = 200; // Grace window for pinch drops (150-250ms)
    const offPathDecayThresholdMs = 700; // Time off-path before decay starts
    const offPathDecayRate = 0.0005; // Small backward drift per frame when off-path
    const toleranceMultiplier = path.pack <= 2 ? 1.15 : 1.0; // +15% tolerance for Pack 1-2
    
    // Draw path with quality settings
    drawPath(ctx, path, width, height, tracingState.progress, tracingState.onPath, perfConfig);
    
    // Handle pause/resume with grace window
    const now = frameData.timestamp;
    const countdownActive = isCountdownActive(now);
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
    if (countdownActive || !frameData.filteredPoint || !frameData.hasHand) {
        tracingState.onPath = false;
        if (frameData.filteredPoint) {
            tracingState.lastFingerPos = frameData.filteredPoint;
        }
        // Don't return early - path and other visuals should still be drawn
        // Just skip finger feedback and progress updates
        if (!frameData.filteredPoint || countdownActive) {
            return; // Only return if no point at all
        }
    }
    
    let fingerPos = frameData.filteredPoint;
    
    // Apply magnetic attraction if enabled
    const flags = trackingFeatures.getFlags();
    
    if (flags.enableMagneticTargets && fingerPos) {
        const magneticConfig = trackingFeatures.getMagneticTargetsConfig();
        const { nearestPoint, distance: rawDistance } = findNearestPointOnPath(
            fingerPos,
            path,
            width,
            height
        );
        
        // Calculate distance in pixels
        const distancePx = rawDistance;
        
        // If within assist radius, apply gentle attraction
        if (distancePx <= magneticConfig.assistRadiusPx && distancePx > 0) {
            // Calculate assist strength based on distance and speed
            const normalizedDistance = distancePx / magneticConfig.assistRadiusPx; // 0-1
            const distanceFactor = 1 - normalizedDistance; // 1 when close, 0 at edge
            
            // Calculate speed for scaling assist
            let speedPx = 0;
            if (tracingState.lastFingerPos) {
                speedPx = Math.hypot(
                    (fingerPos.x - tracingState.lastFingerPos.x) * width,
                    (fingerPos.y - tracingState.lastFingerPos.y) * height
                );
            }
            const normalizedSpeed = Math.min(speedPx / 50, 1); // Normalize speed (50px is "fast")
            const speedFactor = 1 - (normalizedSpeed * magneticConfig.speedScalingFactor); // Less assist when fast
            
            // Get assist strength from DDS if enabled, otherwise use config default
            let assistStrength = magneticConfig.maxAssistStrength;
            if (flags.enableDynamicDifficulty) {
                const dds = getDifficultyController();
                if (dds) {
                    const params = dds.getParams();
                    assistStrength = params.assistStrength;
                }
            }
            
            // Apply press signal boost if enabled
            if (flags.enablePressIntegration && frameData.pressValue) {
                const pressConfig = trackingFeatures.getPressIntegrationConfig();
                const pressBoost = 1 + (frameData.pressValue - 0.5) * (pressConfig.tracingAssistBoost - 1);
                assistStrength = Math.min(assistStrength * pressBoost, magneticConfig.maxAssistStrength * 1.5);
            }
            
            // Calculate attraction amount (smooth, no teleporting)
            const attractionAmount = assistStrength * distanceFactor * speedFactor;
            
            // Smoothly move finger towards nearest point on path
            const dx = nearestPoint.x - fingerPos.x;
            const dy = nearestPoint.y - fingerPos.y;
            
            fingerPos = {
                x: fingerPos.x + dx * attractionAmount,
                y: fingerPos.y + dy * attractionAmount
            };
        }
    }
    
    // Find nearest point on path (using potentially adjusted position)
    const { overallT, distance } = findNearestPointOnPath(
        fingerPos,
        path,
        width,
        height
    );
    
    tracingState.nearestDistance = distance;
    
    // Get tolerance multiplier from DDS if enabled
    let effectiveToleranceMultiplier = toleranceMultiplier;
    if (flags.enableDynamicDifficulty) {
        const dds = getDifficultyController();
        if (dds) {
            const params = dds.getParams();
            effectiveToleranceMultiplier *= params.pathTolerance;
        }
    }
    
    // Apply forgiveness corridor (always apply, not just when magnetic is on)
    let forgivenessTolerancePx = path.tolerancePx * effectiveToleranceMultiplier;
    if (flags.enableMagneticTargets) {
        const magneticConfig = trackingFeatures.getMagneticTargetsConfig();
        forgivenessTolerancePx *= magneticConfig.forgivenessMultiplier;
    }
    
    // Check if on path (with dynamic tolerance and forgiveness corridor)
    const onPath = distance <= forgivenessTolerancePx;
    tracingState.onPath = onPath;
    
    // Streak system - build on-path, decay off-path (non-punitive) - only if enabled
    if (featureFlags.getFlag('tracingStreak')) {
        const streakUpdateInterval = 100; // Update every 100ms
        if (now - tracingState.lastStreakUpdateTime > streakUpdateInterval) {
            if (onPath && !tracingState.isPaused) {
                // Building streak
                if (!tracingState.streakActive) {
                    tracingState.streakStartTime = now;
                    tracingState.streakActive = true;
                }
                // Build meter: 0 to 1 in 10 seconds (0.01 per 100ms)
                tracingState.streakMeter = Math.min(1, tracingState.streakMeter + 0.01);
            } else {
                // Decaying streak (not hard reset)
                if (tracingState.streakActive) {
                    tracingState.streakActive = false;
                }
                // Decay meter: lose 0.005 per 100ms (slower than build)
                tracingState.streakMeter = Math.max(0, tracingState.streakMeter - 0.005);
            }
            tracingState.lastStreakUpdateTime = now;
        }
    }
    
    // Update DDS with on/off path state
    if (flags.enableDynamicDifficulty) {
        const dds = getDifficultyController();
        if (dds) {
            if (onPath) {
                // Will record success when accuracy is good
            } else {
                // Record off-path spikes for difficulty adjustment
                if (distance > forgivenessTolerancePx * 1.2) {
                    dds.recordOffPathSpike();
                }
            }
        }
    }
    
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
    
    // Update DDS with performance metrics
    const confidence = frameData.confidence || 0.7;
    if (flags.enableDynamicDifficulty) {
        const dds = getDifficultyController();
        if (dds) {
            // Update difficulty controller periodically
            const now = Date.now();
            if (now - lastDifficultyUpdateTime > 1000) {
                dds.update(confidence);
                lastDifficultyUpdateTime = now;
            }
            
            // Record low confidence
            if (confidence < 0.6) {
                dds.recordLowConfidence();
            }
            
            // Record off-path spikes
            if (!onPath && distance > forgivenessTolerancePx * 1.5) {
                dds.recordOffPathSpike();
            }
        }
    }
    
    // NUDGE 1: Adaptive minimum movement based on confidence and speed
    // Stricter to prevent false progress
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
    
    // Look-ahead is disabled entirely to ensure progress only advances with actual finger movement
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
    const allowNearEndCompletion = isVeryCloseToEnd && distance <= forgivenessTolerancePx * 1.5; // 50% extra tolerance near end
    
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
        
        // Record success in DDS if enabled
        if (flags.enableDynamicDifficulty) {
            const dds = getDifficultyController();
            if (dds && accuracy >= 0.85) {
                dds.recordSuccess(accuracy);
            }
        }
        
        // Play success audio if enabled
        if (flags.enableTactileAudio) {
            tactileAudioManager.playSuccess('tracing');
        }
        
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
    
    // Update tactile audio for pinch and movement if enabled
    if (flags.enableTactileAudio) {
        tactileAudioManager.updatePinchState(frameData.pinchActive);
        tactileAudioManager.updateMovement(fingerPos, frameData.timestamp);
    }
    
    tracingState.lastFingerPos = fingerPos;
};

// ═══════════════════════════════════════════════
// NEON TUBULAR PATH — Magical cave style
// Thick glowing tubes with gradient fill and outer glow
// ═══════════════════════════════════════════════
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
    const tol = path.tolerancePx;
    const thicknessScale = 2.0;
    const blurScale = Math.min(0.6, perfConfig.shadowBlurScale);

    // Helper to draw a polyline through points
    const traceLine = (pts: {x:number;y:number}[], endFraction?: number) => {
        ctx.beginPath();
        ctx.moveTo(pts[0].x * width, pts[0].y * height);
        if (endFraction !== undefined) {
            const totalLen = calculatePathLength(pts, width, height);
            const targetLen = totalLen * endFraction;
            let acc = 0;
            for (let i = 0; i < pts.length - 1; i++) {
                const segLen = Math.hypot(
                    (pts[i+1].x - pts[i].x) * width,
                    (pts[i+1].y - pts[i].y) * height
                );
                if (acc + segLen <= targetLen) {
                    ctx.lineTo(pts[i+1].x * width, pts[i+1].y * height);
                    acc += segLen;
                } else if (acc < targetLen) {
                    const t = (targetLen - acc) / segLen;
                    ctx.lineTo(
                        (pts[i].x + (pts[i+1].x - pts[i].x) * t) * width,
                        (pts[i].y + (pts[i+1].y - pts[i].y) * t) * height
                    );
                    break;
                } else break;
            }
        } else {
            for (let i = 1; i < pts.length; i++) {
                ctx.lineTo(pts[i].x * width, pts[i].y * height);
            }
        }
    };

    // 1. GHOST PATH — thick, faint tubular lane
    // Outer glow layer
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (perfConfig.visualQuality === 'high') {
        ctx.shadowBlur = 6 * blurScale;
        ctx.shadowColor = 'rgba(100, 140, 255, 0.12)';
    }
    ctx.strokeStyle = 'rgba(80, 120, 200, 0.10)';
    ctx.lineWidth = tol * 3.5 * thicknessScale;
    traceLine(points);
    ctx.stroke();
    ctx.restore();

    // Inner ghost lane — slightly brighter center
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(150, 180, 255, 0.15)';
    ctx.lineWidth = tol * 2.0 * thicknessScale;
    traceLine(points);
    ctx.stroke();
    ctx.restore();

    // Thin center guide line
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(200, 220, 255, 0.12)';
    ctx.lineWidth = 3 * thicknessScale;
    traceLine(points);
    ctx.stroke();
    ctx.restore();

    // 2. PROGRESS FILL — neon glow tube
    if (progress > 0) {
        // Outer glow layer (wide, soft)
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        const glowColor = onPath ? 'rgba(0, 245, 212, 0.3)' : 'rgba(255, 160, 50, 0.25)';
        ctx.shadowBlur = 8 * blurScale;
        ctx.shadowColor = onPath ? 'rgba(0, 245, 212, 0.6)' : 'rgba(255, 160, 50, 0.5)';
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = tol * 3.2 * thicknessScale;
        traceLine(points, progress);
        ctx.stroke();
        ctx.restore();

        // Core bright tube
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowBlur = 6 * blurScale;
        ctx.shadowColor = onPath ? 'rgba(0, 245, 212, 0.8)' : 'rgba(255, 200, 80, 0.7)';
        ctx.strokeStyle = onPath ? '#00F5D4' : '#FFB830';
        ctx.lineWidth = tol * 1.3 * thicknessScale;
        traceLine(points, progress);
        ctx.stroke();
        ctx.restore();

        // Inner white-hot center
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = onPath ? 'rgba(200, 255, 245, 0.7)' : 'rgba(255, 240, 200, 0.5)';
        ctx.lineWidth = tol * 0.4 * thicknessScale;
        traceLine(points, progress);
        ctx.stroke();
        ctx.restore();
    }

    // 3. GLOWING START ORB
    const showStartProminently = progress < 0.05;
    drawStartDot(ctx, points[0], width, height, perfConfig, showStartProminently);

    // 4. GLOWING END ORB
    if (progress > 0.8) {
        drawEndTarget(ctx, points[points.length - 1], width, height, progress, perfConfig);
    }
};


// ═══════════════════════════════════════════════
// GLOWING START ORB — pulsing green sphere
// ═══════════════════════════════════════════════
const drawStartDot = (
    ctx: CanvasRenderingContext2D,
    point: { x: number; y: number },
    width: number,
    height: number,
    perfConfig: { visualQuality: 'high' | 'low'; shadowBlurScale: number },
    prominent: boolean = false
): void => {
    ctx.save();
    const pulse = Math.sin(Date.now() / 400) * 0.3 + 0.7;
    const baseSize = prominent ? 20 : 14;
    const size = baseSize * pulse;
    const px = point.x * width;
    const py = point.y * height;

    // Outer glow aura
    if (perfConfig.visualQuality === 'high') {
        const auraGrad = ctx.createRadialGradient(px, py, size * 0.5, px, py, size * 3);
        auraGrad.addColorStop(0, 'rgba(0, 245, 212, 0.3)');
        auraGrad.addColorStop(0.5, 'rgba(0, 245, 212, 0.08)');
        auraGrad.addColorStop(1, 'rgba(0, 245, 212, 0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(px, py, size * 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // Main orb with 3D gradient
    const orbGrad = ctx.createRadialGradient(
        px - size * 0.2, py - size * 0.2, size * 0.1,
        px, py, size
    );
    orbGrad.addColorStop(0, '#AFFFEC');
    orbGrad.addColorStop(0.4, '#00F5D4');
    orbGrad.addColorStop(1, '#008B76');

    ctx.shadowBlur = 6 * perfConfig.shadowBlurScale;
    ctx.shadowColor = 'rgba(0, 245, 212, 0.8)';
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fillStyle = orbGrad;
    ctx.fill();

    // Specular dot
    ctx.beginPath();
    ctx.arc(px - size * 0.25, py - size * 0.25, size * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fill();

    // "START" label
    ctx.shadowBlur = 3 * perfConfig.shadowBlurScale;
    ctx.shadowColor = 'rgba(0, 245, 212, 0.5)';
    ctx.fillStyle = '#00F5D4';
    ctx.font = prominent ? 'bold 13px Arial' : 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('START', px, py - size - 6);
    ctx.restore();
};

// ═══════════════════════════════════════════════
// GLOWING END ORB — golden target sphere
// ═══════════════════════════════════════════════
const drawEndTarget = (
    ctx: CanvasRenderingContext2D,
    point: { x: number; y: number },
    width: number,
    height: number,
    progress: number,
    perfConfig: { visualQuality: 'high' | 'low'; shadowBlurScale: number }
): void => {
    ctx.save();
    const glow = (progress - 0.8) / 0.2; // 0-1
    const size = 16 + glow * 8;
    const px = point.x * width;
    const py = point.y * height;

    // Outer golden aura
    if (perfConfig.visualQuality === 'high') {
        const auraGrad = ctx.createRadialGradient(px, py, size * 0.3, px, py, size * 3);
        auraGrad.addColorStop(0, `rgba(255, 215, 0, ${0.2 + glow * 0.3})`);
        auraGrad.addColorStop(0.5, `rgba(255, 215, 0, ${0.05 + glow * 0.1})`);
        auraGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(px, py, size * 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // Golden orb
    const orbGrad = ctx.createRadialGradient(
        px - size * 0.2, py - size * 0.2, size * 0.1,
        px, py, size
    );
    orbGrad.addColorStop(0, '#FFF8DC');
    orbGrad.addColorStop(0.4, '#FFD700');
    orbGrad.addColorStop(1, '#B8860B');

    ctx.shadowBlur = 6 * perfConfig.shadowBlurScale;
    ctx.shadowColor = `rgba(255, 215, 0, ${0.4 + glow * 0.5})`;
    ctx.globalAlpha = 0.5 + glow * 0.5;
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fillStyle = orbGrad;
    ctx.fill();

    // Specular
    ctx.beginPath();
    ctx.arc(px - size * 0.2, py - size * 0.2, size * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();

    // "END" label
    ctx.globalAlpha = 0.5 + glow * 0.5;
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('END', px, py - size - 5);
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
        ctx.shadowBlur = 6 * perfConfig.shadowBlurScale;
        ctx.shadowColor = `rgba(0, 245, 212, 0.5)`; // More subtle
    } else if (perfConfig.visualQuality === 'high') {
        ctx.shadowBlur = 4 * perfConfig.shadowBlurScale;
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
    ctx.shadowBlur = 5;
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
        ctx.shadowBlur = 6 * pulse;
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
                ctx.shadowBlur = 5 * pulse;
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
        ctx.shadowBlur = 3 * alpha;
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
    ctx.shadowBlur = 5;
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
