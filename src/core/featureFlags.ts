/**
 * Central Feature Flags System
 * 
 * Every major change must have:
 * - A feature flag
 * - A safe default OFF
 * - A quick rollback path
 * - A simple acceptance test
 */

export type GameMode = 'calibration' | 'free' | 'pre-writing' | 'sort-and-place' | 'word-search' | 'colour-builder';

export interface FeatureFlags {
    // Tracking features
    trackingPredictor: boolean;      // Predictive smoothing
    dynamicResolution: boolean;      // Dynamic resolution scaling
    pressSignal: boolean;            // Depth sensitivity for press
    occlusionRecovery: boolean;      // Occlusion recovery for pinch
    assistMode: boolean;             // Magnetic targets and snap assist
    dynamicDifficulty: boolean;      // Dynamic difficulty scaling
    twoHandPalette: boolean;         // Two-hand ergonomics

    // ToyMode features
    toyModeTheme: boolean;           // ToyMode styling and tokens
    stickerRewards: boolean;         // Sticker book system
    tracingStreak: boolean;          // Tracing streak meter
    narrator: boolean;               // Safe narrator TTS

    // Free Paint Pro features (AIR PAINT PRO)
    airPaintEnabled: boolean;        // Enable AIR PAINT PRO mode
    layersEnabled: boolean;          // Enable layered canvas system
    fillEnabled: boolean;             // Enable fill bucket tool
    shapesEnabled: boolean;          // Enable shape tools (line, rect, circle)
    selectionEnabled: boolean;       // Enable selection tools (rect select, move, delete)
}

const DEFAULT_FLAGS: FeatureFlags = {
    // All OFF by default - safe defaults
    trackingPredictor: false,
    dynamicResolution: false,
    pressSignal: false,
    occlusionRecovery: false,
    assistMode: false,
    dynamicDifficulty: false,
    twoHandPalette: false,
    toyModeTheme: false,
    stickerRewards: false,
    tracingStreak: false,
    narrator: false,
    // Free Paint Pro - AIR PAINT PRO (default OFF as per requirements)
    airPaintEnabled: false,  // Phase 1-5: All changes behind flag, default OFF
    layersEnabled: false,    // Phase 5: Layered canvas system, default OFF
    fillEnabled: false,      // Fill bucket tool, default OFF
    shapesEnabled: false,    // Shape tools, default OFF
    selectionEnabled: false, // Selection tools, default OFF
};

const STORAGE_KEY = 'feature-flags';
const DISABLED_FLAGS_KEY = 'disabled-flags-session'; // For rollback

// Mode-specific flag presets (can override defaults)
const MODE_PRESETS: Partial<Record<GameMode, Partial<FeatureFlags>>> = {
    // Example: 'free': { trackingPredictor: true }
    // All empty by default - safe
};

// Rollback tracking
interface DisabledFlag {
    flag: keyof FeatureFlags;
    disabledAt: number;
    reason: string;
}

class FeatureFlagsManager {
    private flags: FeatureFlags = { ...DEFAULT_FLAGS };
    private disabledThisSession: Set<keyof FeatureFlags> = new Set();
    private modePresets: typeof MODE_PRESETS = { ...MODE_PRESETS };
    private listeners: Array<(flags: FeatureFlags) => void> = [];

    constructor() {
        this.loadFromStorage();
        this.loadSessionDisables();

        // Listen for URL params
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const debugFlags = params.get('flags');
            if (debugFlags) {
                this.parseQueryFlags(debugFlags);
            }

            // Force enable AIR PAINT PRO if ?airpaint=true
            if (params.get('airpaint') === 'true') {
                this.flags.airPaintEnabled = true;
                this.flags.layersEnabled = true;
                this.flags.fillEnabled = true;
                console.log('[FeatureFlags] AIR PAINT PRO forced enabled via URL');
            }
        }

        // Log AIR PAINT PRO status
        console.log('[FeatureFlags] AIR PAINT PRO:', {
            airPaintEnabled: this.flags.airPaintEnabled,
            layersEnabled: this.flags.layersEnabled,
            fillEnabled: this.flags.fillEnabled
        });
    }

    /**
     * Load flags from localStorage
     */
    private loadFromStorage(): void {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as Partial<FeatureFlags>;
                // Only load valid flags, merge with defaults
                // BUT: Don't override AIR PAINT PRO flags if they're explicitly set in defaults
                Object.keys(DEFAULT_FLAGS).forEach(key => {
                    const flagKey = key as keyof FeatureFlags;
                    // Skip AIR PAINT PRO flags - always use defaults
                    if (flagKey === 'airPaintEnabled' || flagKey === 'layersEnabled' ||
                        flagKey === 'fillEnabled' || flagKey === 'shapesEnabled' ||
                        flagKey === 'selectionEnabled') {
                        // Use default value (don't load from storage)
                        return;
                    }
                    if (parsed[flagKey] === true || parsed[flagKey] === false) {
                        this.flags[flagKey] = parsed[flagKey] as boolean;
                    }
                });
            }
        } catch (e) {
            console.warn('Failed to load feature flags:', e);
        }
    }

    /**
     * Save flags to localStorage
     */
    private saveToStorage(): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.flags));
        } catch (e) {
            console.warn('Failed to save feature flags:', e);
        }
    }

    /**
     * Load session disables (for rollback)
     */
    private loadSessionDisables(): void {
        try {
            const stored = sessionStorage.getItem(DISABLED_FLAGS_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as DisabledFlag[];
                parsed.forEach(item => {
                    this.disabledThisSession.add(item.flag);
                    this.flags[item.flag] = false;
                });
            }
        } catch (e) {
            // Ignore - fresh session
        }
    }

    /**
     * Save session disables
     */
    private saveSessionDisables(): void {
        try {
            const disabled: DisabledFlag[] = Array.from(this.disabledThisSession).map(flag => ({
                flag,
                disabledAt: Date.now(),
                reason: 'Auto-disabled due to error'
            }));
            sessionStorage.setItem(DISABLED_FLAGS_KEY, JSON.stringify(disabled));
        } catch (e) {
            // Ignore
        }
    }

    /**
     * Parse query string flags (e.g., ?flags=trackingPredictor,assistMode)
     */
    private parseQueryFlags(flagsStr: string): void {
        const flagNames = flagsStr.split(',');
        flagNames.forEach(name => {
            const trimmed = name.trim();
            if (trimmed.startsWith('!')) {
                // Disable flag
                const flagKey = trimmed.slice(1) as keyof FeatureFlags;
                if (flagKey in DEFAULT_FLAGS) {
                    this.flags[flagKey] = false;
                }
            } else {
                // Enable flag
                const flagKey = trimmed as keyof FeatureFlags;
                if (flagKey in DEFAULT_FLAGS) {
                    this.flags[flagKey] = true;
                }
            }
        });
    }

    /**
     * Get all flags
     */
    getFlags(): Readonly<FeatureFlags> {
        return { ...this.flags };
    }

    /**
     * Get flag value
     */
    getFlag<K extends keyof FeatureFlags>(flag: K): boolean {
        // Check if disabled this session (rollback)
        if (this.disabledThisSession.has(flag)) {
            return false;
        }
        return this.flags[flag];
    }

    /**
     * Set flags (with validation and rollback tracking)
     */
    setFlags(updates: Partial<FeatureFlags>): void {
        let changed = false;
        Object.keys(updates).forEach(key => {
            const flagKey = key as keyof FeatureFlags;
            const newValue = updates[flagKey];
            if (newValue !== undefined && newValue !== this.flags[flagKey]) {
                this.flags[flagKey] = newValue as boolean;
                // Remove from disabled list if re-enabling
                if (newValue === true) {
                    this.disabledThisSession.delete(flagKey);
                }
                changed = true;
            }
        });

        if (changed) {
            this.saveToStorage();
            this.notifyListeners();
            console.log('[FeatureFlags] Flags updated');
        }
    }

    /**
     * Enable flags for a specific mode (applies presets)
     */
    enableForMode(mode: GameMode): void {
        const preset = this.modePresets[mode];
        if (preset) {
            this.setFlags(preset);
        }
    }

    /**
     * Rollback: Disable a flag due to error (session-only)
     */
    disableFlag(flag: keyof FeatureFlags, reason: string): void {
        if (!this.disabledThisSession.has(flag)) {
            console.warn(`[FeatureFlags] Auto-disabling ${flag}: ${reason}`);
            this.disabledThisSession.add(flag);
            this.flags[flag] = false;
            this.saveSessionDisables();
            this.notifyListeners();

            // Show toast if flag was enabled
            if (typeof window !== 'undefined') {
                this.showRollbackToast(flag);
            }
        }
    }

    /**
     * Show rollback toast notification
     */
    private showRollbackToast(_flag: keyof FeatureFlags): void {
        // Use shared toast service — lazy dynamic import to avoid circular deps
        import('./toastService').then(({ showToast }) => {
            showToast('Performance mode enabled, stabilizing input', 'warning', 3000);
        }).catch(() => {
            // Toast service not loaded yet — ignore
        });
    }

    /**
     * Subscribe to flag changes
     */
    subscribe(listener: (flags: FeatureFlags) => void): () => void {
        this.listeners.push(listener);
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    /**
     * Notify all listeners
     */
    private notifyListeners(): void {
        const currentFlags = this.getFlags();
        this.listeners.forEach(listener => {
            try {
                listener(currentFlags);
            } catch (e) {
                console.error('Feature flag listener error:', e);
            }
        });
    }

    /**
     * Reset to defaults (for testing)
     */
    reset(): void {
        this.flags = { ...DEFAULT_FLAGS };
        this.disabledThisSession.clear();
        this.saveToStorage();
        try {
            sessionStorage.removeItem(DISABLED_FLAGS_KEY);
        } catch (e) {
            // Ignore
        }
        this.notifyListeners();
    }

    /**
     * Get disabled flags for this session
     */
    getDisabledFlags(): ReadonlySet<keyof FeatureFlags> {
        return new Set(this.disabledThisSession);
    }

    /**
     * Check if a flag is disabled this session
     */
    isDisabled(flag: keyof FeatureFlags): boolean {
        return this.disabledThisSession.has(flag);
    }
}

export const featureFlags = new FeatureFlagsManager();

// Wrapper to handle errors and auto-rollback
export function withFeatureFlag<T>(
    flag: keyof FeatureFlags,
    fn: () => T,
    fallback: () => T
): T {
    if (!featureFlags.getFlag(flag)) {
        return fallback();
    }

    try {
        return fn();
    } catch (error) {
        console.error(`[FeatureFlags] Error with flag ${flag}:`, error);
        featureFlags.disableFlag(flag, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return fallback();
    }
}
