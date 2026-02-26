/**
 * Asset Preloader - Warm up camera and ML on menu load
 * 
 * Preloads:
 * - Hand tracker model (during DemoPrep)
 * - Critical images (logo)
 * 
 * This runs in parallel with the demo prep loading screen
 */

import { handTracker } from './handTracker';

const DEBUG = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === 'true';

class AssetPreloader {
    private preloaded = false;
    private preloading = false;

    async preload(): Promise<void> {
        if (this.preloaded || this.preloading) return;
        
        this.preloading = true;
        
        try {
            if (DEBUG) console.log('[AssetPreload] Starting preload...');
            
            // Preload hand tracker model
            await handTracker.initialize();
            
            if (DEBUG) console.log('[AssetPreload] Hand tracker preloaded');
            
            this.preloaded = true;
        } catch (error) {
            console.warn('[AssetPreload] Preload failed:', error);
        } finally {
            this.preloading = false;
        }
    }

    isPreloaded(): boolean {
        return this.preloaded;
    }
}

export const assetPreloader = new AssetPreloader();
