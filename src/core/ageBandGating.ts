/**
 * Age Band Gating
 * 
 * Controls which assist features are available based on age band.
 * Younger ages get more assistance, older ages get less.
 */

export type AgeBand = '3-4' | '5-6' | '7-8' | '9+';

export interface AgeBandConfig {
    /** Enable magnetic targets and snap assist */
    allowMagneticTargets: boolean;
    /** Enable dynamic difficulty scaling */
    allowDynamicDifficulty: boolean;
    /** Enable two-hand mode */
    allowTwoHandMode: boolean;
    /** Enable tactile audio */
    allowTactileAudio: boolean;
    /** Enable press signal integration */
    allowPressIntegration: boolean;
}

const AGE_BAND_CONFIGS: Record<AgeBand, AgeBandConfig> = {
    '3-4': {
        allowMagneticTargets: true,
        allowDynamicDifficulty: true,
        allowTwoHandMode: true,
        allowTactileAudio: true,
        allowPressIntegration: false, // Too complex for youngest
    },
    '5-6': {
        allowMagneticTargets: true,
        allowDynamicDifficulty: true,
        allowTwoHandMode: true,
        allowTactileAudio: true,
        allowPressIntegration: true,
    },
    '7-8': {
        allowMagneticTargets: true,
        allowDynamicDifficulty: true,
        allowTwoHandMode: true,
        allowTactileAudio: true,
        allowPressIntegration: true,
    },
    '9+': {
        allowMagneticTargets: false, // Less assistance for older kids
        allowDynamicDifficulty: true, // Still allow DDS
        allowTwoHandMode: true,
        allowTactileAudio: false, // May find audio annoying
        allowPressIntegration: true,
    },
};

/**
 * Get age band configuration
 */
export function getAgeBandConfig(ageBand: AgeBand | null): AgeBandConfig {
    if (!ageBand) {
        // Default: allow all features if age not specified
        return {
            allowMagneticTargets: true,
            allowDynamicDifficulty: true,
            allowTwoHandMode: true,
            allowTactileAudio: true,
            allowPressIntegration: true,
        };
    }
    return AGE_BAND_CONFIGS[ageBand];
}

/**
 * Check if a feature should be enabled for given age band
 */
export function isFeatureEnabledForAge(
    feature: keyof AgeBandConfig,
    ageBand: AgeBand | null
): boolean {
    const config = getAgeBandConfig(ageBand);
    return config[feature];
}
