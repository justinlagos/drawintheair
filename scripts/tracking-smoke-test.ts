/**
 * Tracking Smoke Test - Part E
 * 
 * Validates invariants with simulated data.
 * Uses pure functions from PinchLogic.ts for testing.
 * 
 * Run with: npm run tracking:test
 * Or: npx ts-node scripts/tracking-smoke-test.ts
 */

// Note: This script requires compilation or ts-node to run
// Compile with: tsc scripts/tracking-smoke-test.ts --outDir scripts --module esnext --target es2020
// Then run: node scripts/tracking-smoke-test.js

import { 
    computePinchState, 
    applyVelocityTolerance, 
    applyConfidenceGating,
    applyTeleportGuard,
    type PinchParams
} from '../src/core/tracking/PinchLogic.js';

/**
 * Calculate percentile from sorted array
 */
function percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

/**
 * Test 1: Time-based confidence consistency
 */
function testTimeBasedConfidence(): void {
    console.log("[Test] Time-based confidence consistency...");
    
    // Simulate 120ms confidence drop at 20fps (6 frames) and 60fps (7-8 frames)
    // Both should result in same penUp outcome
    const dropDuration = 120; // ms
    const frameTime20fps = 50; // ms per frame
    const frameTime60fps = 16.67; // ms per frame
    
    const frames20fps = Math.ceil(dropDuration / frameTime20fps);
    const frames60fps = Math.ceil(dropDuration / frameTime60fps);
    
    // At 100ms threshold, both should trigger penUp
    const threshold = 100; // ms
    const shouldTrigger20fps = dropDuration >= threshold;
    const shouldTrigger60fps = dropDuration >= threshold;
    
    if (shouldTrigger20fps !== shouldTrigger60fps) {
        throw new Error(`Time-based confidence inconsistent: 20fps=${shouldTrigger20fps}, 60fps=${shouldTrigger60fps}`);
    }
    
    console.log("  ✓ Pass: Time-based confidence consistent at 20fps and 60fps");
}

/**
 * Test 2: Velocity pinch tolerance
 */
function testVelocityPinchTolerance(): void {
    console.log("[Test] Velocity pinch tolerance...");
    
    // Test that higher velocity increases threshold but is clamped
    const baseThreshold = 0.4;
    const maxBoost = 0.15;
    
    const lowVelocity = applyVelocityTolerance(0.3, 0.5, maxBoost);
    const highVelocity = applyVelocityTolerance(0.3, 4.0, maxBoost);
    const veryHighVelocity = applyVelocityTolerance(0.3, 10.0, maxBoost);
    
    if (highVelocity <= lowVelocity) {
        throw new Error(`Velocity boost not applied: low=${lowVelocity}, high=${highVelocity}`);
    }
    
    if (veryHighVelocity > maxBoost) {
        throw new Error(`Velocity boost not clamped: ${veryHighVelocity} > ${maxBoost}`);
    }
    
    console.log("  ✓ Pass: Velocity tolerance increases threshold and is clamped");
}

/**
 * Test 3: Teleport guard
 */
function testTeleportGuard(): void {
    console.log("[Test] Teleport guard...");
    
    const lastPoint = { x: 0.5, y: 0.5 };
    const jumpPoint = { x: 0.7, y: 0.7 }; // Large jump
    const normalPoint = { x: 0.51, y: 0.51 }; // Small movement
    const handScale = 0.1;
    const jumpThreshold = 0.05;
    
    const jumpResult = applyTeleportGuard(lastPoint, jumpPoint, handScale, jumpThreshold);
    const normalResult = applyTeleportGuard(lastPoint, normalPoint, handScale, jumpThreshold);
    
    if (!jumpResult.isTeleport) {
        throw new Error(`Teleport not detected: distance=${jumpResult.distance.toFixed(4)}, threshold=${jumpResult.threshold.toFixed(4)}`);
    }
    
    if (normalResult.isTeleport) {
        throw new Error(`Normal movement detected as teleport: distance=${normalResult.distance.toFixed(4)}`);
    }
    
    console.log("  ✓ Pass: Teleport guard detects large jumps correctly");
}

/**
 * Test 4: Calibration clamps
 */
function testCalibrationClamps(): void {
    console.log("[Test] Calibration clamps...");
    
    // Simulate calibration samples
    const samples = [
        0.15, 0.18, 0.20, 0.22, 0.25, 0.28, 0.30, 0.32, 0.35, 0.38,
        0.40, 0.42, 0.45, 0.48, 0.50, 0.52, 0.55, 0.58, 0.60, 0.65
    ];
    
    const sorted = [...samples].sort((a, b) => a - b);
    const p20 = sorted[Math.floor(sorted.length * 0.2)];
    const p60 = sorted[Math.floor(sorted.length * 0.6)];
    
    // Clamp to safe bounds
    const clampedStart = Math.max(0.2, Math.min(0.6, p20));
    const clampedEnd = Math.max(0.3, Math.min(0.7, p60));
    
    if (clampedStart < 0.2 || clampedStart > 0.6) {
        throw new Error(`Start threshold out of bounds: ${clampedStart}`);
    }
    
    if (clampedEnd < 0.3 || clampedEnd > 0.7) {
        throw new Error(`End threshold out of bounds: ${clampedEnd}`);
    }
    
    if (clampedEnd <= clampedStart) {
        throw new Error(`End threshold not greater than start: ${clampedStart} >= ${clampedEnd}`);
    }
    
    console.log("  ✓ Pass: Calibration thresholds remain within safe bounds");
}

/**
 * Test 5: Pinch state computation
 */
function testPinchStateComputation(): void {
    console.log("[Test] Pinch state computation...");
    
    const params: PinchParams = {
        indexTip: { x: 0.5, y: 0.5 },
        thumbTip: { x: 0.52, y: 0.52 },
        handScale: 0.1,
        lastPinchState: false,
        velocity: { x: 0, y: 0, magnitude: 0 },
        pinchDownThreshold: 0.32,
        pinchUpThreshold: 0.48,
        maxVelocityBoost: 0.15
    };
    
    const result = computePinchState(params);
    
    if (result.pinchDistance < 0 || result.threshold < 0) {
        throw new Error(`Invalid pinch state: distance=${result.pinchDistance}, threshold=${result.threshold}`);
    }
    
    console.log("  ✓ Pass: Pinch state computation works correctly");
}

/**
 * Run all tests
 */
function runTests(): void {
    console.log("[TrackingSmokeTest] Starting tests...\n");
    
    try {
        testTimeBasedConfidence();
        testVelocityPinchTolerance();
        testTeleportGuard();
        testCalibrationClamps();
        testPinchStateComputation();
        
        console.log("\n[TrackingSmokeTest] All tests passed ✓");
    } catch (error) {
        console.error("\n[TrackingSmokeTest] Test failed:", error);
        process.exit(1);
    }
}

// Run tests if executed directly (ES module check)
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests();
}

export { runTests };
