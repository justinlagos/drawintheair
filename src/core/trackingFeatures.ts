/**
 * Tracking Feature Flags
 * 
 * All tracking improvements are behind feature flags with safe defaults OFF.
 * Enable per mode once verified.
 */

export interface TrackingFeatureFlags {
    /** Enable predictive smoothing (Stage A: One Euro + Stage B: Kalman/constant-velocity) */
    enablePredictiveSmoothing: boolean;
    
    /** Enable dynamic resolution scaling for MediaPipe detection */
    enableDynamicResolution: boolean;
    
    /** Enable depth sensitivity using z coordinate for "press" signal */
    enableDepthSensitivity: boolean;
    
    /** Enable occlusion recovery for pinch stability */
    enableOcclusionRecovery: boolean;
    
    /** Show debug overlay (hidden by default, accessible via ?debug=tracking) */
    showDebugOverlay: boolean;
}

export interface PredictiveSmoothingConfig {
    /** One Euro Filter: minimum cutoff frequency in Hz. Lower = more smoothing. Default: 0.8 */
    minCutoff: number;
    /** One Euro Filter: speed coefficient. Higher = more responsive. Default: 0.01 */
    beta: number;
    /** One Euro Filter: derivative cutoff. Default: 1.0 */
    dCutoff: number;
    /** Prediction: milliseconds to predict ahead. Default: 16 (one frame at 60fps) */
    predictionMs: number;
    /** Prediction: maximum prediction distance in pixels. Default: 50 */
    maxPredictionDistancePx: number;
    /** Confidence gate: minimum confidence to apply prediction. Default: 0.6 */
    confidenceGate: number;
}

export interface DynamicResolutionConfig {
    /** FPS threshold below which to downscale. Default: 50 */
    fpsThreshold: number;
    /** Detection latency threshold in ms. Default: 60 */
    latencyThresholdMs: number;
    /** Duration to sustain threshold before scaling. Default: 500ms */
    sustainDurationMs: number;
    /** Hysteresis: FPS must exceed this to scale back up. Default: 55 */
    fpsHysteresis: number;
    /** Resolution levels: [width, height] pairs. Default: [[1280, 720], [960, 540], [640, 360]] */
    resolutionLevels: Array<[number, number]>;
}

export interface DepthSensitivityConfig {
    /** Z near plane (closest). Auto-calibrated, but can override. */
    zNear: number | null;
    /** Z far plane (farthest). Auto-calibrated, but can override. */
    zFar: number | null;
    /** Calibration duration in ms. Default: 10000 (10 seconds) */
    calibrationDurationMs: number;
    /** Minimum samples for calibration. Default: 100 */
    minCalibrationSamples: number;
}

export interface OcclusionRecoveryConfig {
    /** Grace window in ms for thumb occlusion. Default: 200 */
    graceWindowMs: number;
    /** Minimum confidence to consider landmark valid. Default: 0.5 */
    minLandmarkConfidence: number;
    /** Maximum distance to infer thumb position. Default: 0.1 (10% of screen) */
    maxInferenceDistance: number;
}

const DEFAULT_FLAGS: TrackingFeatureFlags = {
    enablePredictiveSmoothing: false,
    enableDynamicResolution: false,
    enableDepthSensitivity: false,
    enableOcclusionRecovery: false,
    showDebugOverlay: false,
};

const DEFAULT_PREDICTIVE_CONFIG: PredictiveSmoothingConfig = {
    minCutoff: 0.8,
    beta: 0.01,
    dCutoff: 1.0,
    predictionMs: 16,
    maxPredictionDistancePx: 50,
    confidenceGate: 0.6,
};

const DEFAULT_DYNAMIC_RESOLUTION_CONFIG: DynamicResolutionConfig = {
    fpsThreshold: 50,
    latencyThresholdMs: 60,
    sustainDurationMs: 500,
    fpsHysteresis: 55,
    resolutionLevels: [[1280, 720], [960, 540], [640, 360]],
};

const DEFAULT_DEPTH_CONFIG: DepthSensitivityConfig = {
    zNear: null,
    zFar: null,
    calibrationDurationMs: 10000,
    minCalibrationSamples: 100,
};

const DEFAULT_OCCLUSION_CONFIG: OcclusionRecoveryConfig = {
    graceWindowMs: 200,
    minLandmarkConfidence: 0.5,
    maxInferenceDistance: 0.1,
};

/**
 * Tracking Features Manager
 */
class TrackingFeaturesManager {
    private flags: TrackingFeatureFlags = { ...DEFAULT_FLAGS };
    private predictiveConfig: PredictiveSmoothingConfig = { ...DEFAULT_PREDICTIVE_CONFIG };
    private dynamicResolutionConfig: DynamicResolutionConfig = { ...DEFAULT_DYNAMIC_RESOLUTION_CONFIG };
    private depthConfig: DepthSensitivityConfig = { ...DEFAULT_DEPTH_CONFIG };
    private occlusionConfig: OcclusionRecoveryConfig = { ...DEFAULT_OCCLUSION_CONFIG };

    constructor() {
        // Check for debug parameter
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('debug') === 'tracking') {
                this.flags.showDebugOverlay = true;
            }
        }
    }

    getFlags(): TrackingFeatureFlags {
        return { ...this.flags };
    }

    setFlags(flags: Partial<TrackingFeatureFlags>): void {
        this.flags = { ...this.flags, ...flags };
    }

    getPredictiveConfig(): PredictiveSmoothingConfig {
        return { ...this.predictiveConfig };
    }

    setPredictiveConfig(config: Partial<PredictiveSmoothingConfig>): void {
        this.predictiveConfig = { ...this.predictiveConfig, ...config };
    }

    getDynamicResolutionConfig(): DynamicResolutionConfig {
        return { ...this.dynamicResolutionConfig };
    }

    setDynamicResolutionConfig(config: Partial<DynamicResolutionConfig>): void {
        this.dynamicResolutionConfig = { ...this.dynamicResolutionConfig, ...config };
    }

    getDepthConfig(): DepthSensitivityConfig {
        return { ...this.depthConfig };
    }

    setDepthConfig(config: Partial<DepthSensitivityConfig>): void {
        this.depthConfig = { ...this.depthConfig, ...config };
    }

    getOcclusionConfig(): OcclusionRecoveryConfig {
        return { ...this.occlusionConfig };
    }

    setOcclusionConfig(config: Partial<OcclusionRecoveryConfig>): void {
        this.occlusionConfig = { ...this.occlusionConfig, ...config };
    }

    /**
     * Enable features for a specific mode
     */
    enableForMode(mode: string): void {
        // Safe defaults: all OFF
        // Can be enabled per mode once verified
        // Example:
        // if (mode === 'free') {
        //     this.flags.enablePredictiveSmoothing = true;
        // }
    }
}

export const trackingFeatures = new TrackingFeaturesManager();
