/**
 * ToyMode Feature Flag System
 * 
 * Controls the ToyMode theme and features.
 * When OFF (default), app behaves exactly as it does now.
 * When ON, adds playful toy-like styling and features.
 * 
 * Now uses central featureFlags system as source of truth.
 */

import { featureFlags } from './featureFlags';

/**
 * Get ToyMode enabled state from central feature flags
 */
export const isToyModeEnabled = (): boolean => {
    return featureFlags.getFlag('toyModeTheme');
};

/**
 * Set ToyMode enabled state
 */
export const setToyModeEnabled = (enabled: boolean): void => {
    featureFlags.setFlags({ toyModeTheme: enabled });
    updateBodyClass(enabled);
};

/**
 * Update body class for ToyMode styling
 */
const updateBodyClass = (enabled: boolean): void => {
    try {
        if (typeof window === 'undefined' || !document.body) {
            return; // Not ready yet
        }
        if (enabled) {
            document.body.classList.add('toy-mode');
        } else {
            document.body.classList.remove('toy-mode');
        }
    } catch (e) {
        console.warn('Failed to update ToyMode class:', e);
    }
};

/**
 * Initialize ToyMode - should be called on app load
 */
export const initToyMode = (): void => {
    const enabled = isToyModeEnabled();
    updateBodyClass(enabled);
    
    // Subscribe to changes
    featureFlags.subscribe((flags) => {
        updateBodyClass(flags.toyModeTheme);
    });
};
