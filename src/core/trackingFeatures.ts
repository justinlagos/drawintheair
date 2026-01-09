/**
 * Tracking Feature Flags
 * 
 * All tracking improvements are behind feature flags with safe defaults OFF.
 * Enable per mode once verified.
 * 
 * Now uses central featureFlags system as source of truth.
 */

import { featureFlags, type FeatureFlags as CentralFeatureFlags } from './featureFlags';

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
    
    /** Enable magnetic targets and snap assist (tracing and sorting) */
    enableMagneticTargets: boolean;
    
    /** Enable dynamic difficulty scaling (tracing and bubble) */
    enableDynamicDifficulty: boolean;
    
    /** Enable two-hand ergonomics (palette panel) */
    enableTwoHandMode: boolean;
    
    /** Enable tactile audio cues */
    enableTactileAudio: boolean;
    
    /** Enable press signal integration enhancements */
    enablePressIntegration: boolean;
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

export interface MagneticTargetsConfig {
    /** Assist radius in pixels for tracing. Default: 50 */
    assistRadiusPx: number;
    /** Maximum assist strength (0-1). Default: 0.3 */
    maxAssistStrength: number;
    /** Speed scaling factor for assist (higher = less assist when fast). Default: 0.8 */
    speedScalingFactor: number;
    /** Forgiveness corridor multiplier (extra tolerance). Default: 1.5 */
    forgivenessMultiplier: number;
    /** Snap distance in pixels for sorting. Default: 80 */
    snapDistancePx: number;
    /** Easing strength for snap (0-1). Default: 0.15 */
    snapEasingStrength: number;
}

export interface DynamicDifficultyConfig {
    /** Tighten threshold (success accuracy/hit rate). Default: 0.85 */
    tightenThreshold: number;
    /** Failures before easing. Default: 2 */
    failureThreshold: number;
    /** Adjustment rate per frame (0-1). Default: 0.01 */
    adjustmentRate: number;
    /** Minimum tolerance multiplier. Default: 0.7 */
    minToleranceMultiplier: number;
    /** Maximum tolerance multiplier. Default: 1.5 */
    maxToleranceMultiplier: number;
    /** Minimum assist strength. Default: 0.1 */
    minAssistStrength: number;
    /** Maximum assist strength. Default: 0.5 */
    maxAssistStrength: number;
}

export interface TwoHandConfig {
    /** Detection duration in ms before activating. Default: 500 */
    detectionDurationMs: number;
    /** Stability threshold for second hand. Default: 0.7 */
    stabilityThreshold: number;
    /** Palette panel width in normalized units. Default: 0.15 */
    paletteWidth: number;
}

export interface TactileAudioConfig {
    /** Master volume (0-1). Default: 0.15 */
    masterVolume: number;
    /** Pinch down sound frequency (Hz). Default: 220 */
    pinchDownFreq: number;
    /** Pinch up sound frequency (Hz). Default: 180 */
    pinchUpFreq: number;
    /** Movement hum base frequency (Hz). Default: 60 */
    movementHumFreq: number;
    /** Speed-to-pitch scaling. Default: 0.5 */
    speedToPitchFactor: number;
    /** Respect system mute. Default: true */
    respectMute: boolean;
}

export interface PressIntegrationConfig {
    /** Free paint brush boost multiplier. Default: 1.5 */
    freePaintBoost: number;
    /** Tracing assist boost when pressing. Default: 1.3 */
    tracingAssistBoost: number;
    /** Sorting confirm threshold (press value). Default: 0.7 */
    sortingConfirmThreshold: number;
}

const DEFAULT_FLAGS: TrackingFeatureFlags = {
    enablePredictiveSmoothing: false,
    enableDynamicResolution: false,
    enableDepthSensitivity: false,
    enableOcclusionRecovery: false,
    showDebugOverlay: false,
    enableMagneticTargets: false,
    enableDynamicDifficulty: false,
    enableTwoHandMode: false,
    enableTactileAudio: false,
    enablePressIntegration: false,
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

const DEFAULT_MAGNETIC_TARGETS_CONFIG: MagneticTargetsConfig = {
    assistRadiusPx: 50,
    maxAssistStrength: 0.3,
    speedScalingFactor: 0.8,
    forgivenessMultiplier: 1.5,
    snapDistancePx: 80,
    snapEasingStrength: 0.15,
};

const DEFAULT_DYNAMIC_DIFFICULTY_CONFIG: DynamicDifficultyConfig = {
    tightenThreshold: 0.85,
    failureThreshold: 2,
    adjustmentRate: 0.01,
    minToleranceMultiplier: 0.7,
    maxToleranceMultiplier: 1.5,
    minAssistStrength: 0.1,
    maxAssistStrength: 0.5,
};

const DEFAULT_TWO_HAND_CONFIG: TwoHandConfig = {
    detectionDurationMs: 500,
    stabilityThreshold: 0.7,
    paletteWidth: 0.15,
};

const DEFAULT_TACTILE_AUDIO_CONFIG: TactileAudioConfig = {
    masterVolume: 0.15,
    pinchDownFreq: 220,
    pinchUpFreq: 180,
    movementHumFreq: 60,
    speedToPitchFactor: 0.5,
    respectMute: true,
};

const DEFAULT_PRESS_INTEGRATION_CONFIG: PressIntegrationConfig = {
    freePaintBoost: 1.5,
    tracingAssistBoost: 1.3,
    sortingConfirmThreshold: 0.7,
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
    private magneticTargetsConfig: MagneticTargetsConfig = { ...DEFAULT_MAGNETIC_TARGETS_CONFIG };
    private dynamicDifficultyConfig: DynamicDifficultyConfig = { ...DEFAULT_DYNAMIC_DIFFICULTY_CONFIG };
    private twoHandConfig: TwoHandConfig = { ...DEFAULT_TWO_HAND_CONFIG };
    private tactileAudioConfig: TactileAudioConfig = { ...DEFAULT_TACTILE_AUDIO_CONFIG };
    private pressIntegrationConfig: PressIntegrationConfig = { ...DEFAULT_PRESS_INTEGRATION_CONFIG };

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
        // Map from central featureFlags to TrackingFeatureFlags
        const centralFlags = featureFlags.getFlags();
        return {
            enablePredictiveSmoothing: centralFlags.trackingPredictor,
            enableDynamicResolution: centralFlags.dynamicResolution,
            enableDepthSensitivity: centralFlags.pressSignal,
            enableOcclusionRecovery: centralFlags.occlusionRecovery,
            showDebugOverlay: this.flags.showDebugOverlay, // Keep local (UI only)
            enableMagneticTargets: centralFlags.assistMode,
            enableDynamicDifficulty: centralFlags.dynamicDifficulty,
            enableTwoHandMode: centralFlags.twoHandPalette,
            enableTactileAudio: this.flags.enableTactileAudio, // Keep separate
            enablePressIntegration: centralFlags.pressSignal,
        };
    }

    setFlags(flags: Partial<TrackingFeatureFlags>): void {
        // Map to central featureFlags
        const centralUpdates: Partial<CentralFeatureFlags> = {};
        if ('enablePredictiveSmoothing' in flags) {
            centralUpdates.trackingPredictor = flags.enablePredictiveSmoothing;
        }
        if ('enableDynamicResolution' in flags) {
            centralUpdates.dynamicResolution = flags.enableDynamicResolution;
        }
        if ('enableDepthSensitivity' in flags || 'enablePressIntegration' in flags) {
            centralUpdates.pressSignal = flags.enableDepthSensitivity ?? flags.enablePressIntegration ?? false;
        }
        if ('enableOcclusionRecovery' in flags) {
            centralUpdates.occlusionRecovery = flags.enableOcclusionRecovery;
        }
        if ('enableMagneticTargets' in flags) {
            centralUpdates.assistMode = flags.enableMagneticTargets;
        }
        if ('enableDynamicDifficulty' in flags) {
            centralUpdates.dynamicDifficulty = flags.enableDynamicDifficulty;
        }
        if ('enableTwoHandMode' in flags) {
            centralUpdates.twoHandPalette = flags.enableTwoHandMode;
        }
        
        if (Object.keys(centralUpdates).length > 0) {
            featureFlags.setFlags(centralUpdates);
        }
        
        // Keep local flags (UI only)
        if ('showDebugOverlay' in flags) {
            this.flags.showDebugOverlay = flags.showDebugOverlay!;
        }
        if ('enableTactileAudio' in flags) {
            this.flags.enableTactileAudio = flags.enableTactileAudio!;
        }
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

    getMagneticTargetsConfig(): MagneticTargetsConfig {
        return { ...this.magneticTargetsConfig };
    }

    setMagneticTargetsConfig(config: Partial<MagneticTargetsConfig>): void {
        this.magneticTargetsConfig = { ...this.magneticTargetsConfig, ...config };
    }

    getDynamicDifficultyConfig(): DynamicDifficultyConfig {
        return { ...this.dynamicDifficultyConfig };
    }

    setDynamicDifficultyConfig(config: Partial<DynamicDifficultyConfig>): void {
        this.dynamicDifficultyConfig = { ...this.dynamicDifficultyConfig, ...config };
    }

    getTwoHandConfig(): TwoHandConfig {
        return { ...this.twoHandConfig };
    }

    setTwoHandConfig(config: Partial<TwoHandConfig>): void {
        this.twoHandConfig = { ...this.twoHandConfig, ...config };
    }

    getTactileAudioConfig(): TactileAudioConfig {
        return { ...this.tactileAudioConfig };
    }

    setTactileAudioConfig(config: Partial<TactileAudioConfig>): void {
        this.tactileAudioConfig = { ...this.tactileAudioConfig, ...config };
    }

    getPressIntegrationConfig(): PressIntegrationConfig {
        return { ...this.pressIntegrationConfig };
    }

    setPressIntegrationConfig(config: Partial<PressIntegrationConfig>): void {
        this.pressIntegrationConfig = { ...this.pressIntegrationConfig, ...config };
    }

    /**
     * Enable features for a specific mode
     */
    enableForMode(_mode: string): void {
        // Safe defaults: all OFF
        // Can be enabled per mode once verified
        // Example:
        // if (_mode === 'free') {
        //     this.flags.enablePredictiveSmoothing = true;
        // }
    }
}

export const trackingFeatures = new TrackingFeaturesManager();
