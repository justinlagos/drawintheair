/**
 * Sticker Book System
 * 
 * Local storage only, no child PII.
 * Earn stickers on mode completions.
 * Pinch-to-place stickers in sticker book.
 */

import { withFeatureFlag } from './featureFlags';

const STORAGE_KEY = 'sticker-book';

export type StickerType = 'tracing-complete' | 'bubble-milestone' | 'sorting-complete' | 'free-paint-time';

export interface Sticker {
    id: string;
    type: StickerType;
    earnedAt: number;
    emoji: string;
    placed: boolean;
    placedX?: number;
    placedY?: number;
}

export interface StickerCollection {
    stickers: Sticker[];
    lastUpdated: number;
}

// Sticker type configurations
const STICKER_CONFIGS: Record<StickerType, { emoji: string; name: string }> = {
    'tracing-complete': { emoji: '⭐', name: 'Tracing Star' },
    'bubble-milestone': { emoji: '🫧', name: 'Bubble Pop' },
    'sorting-complete': { emoji: '🗂️', name: 'Sorting Badge' },
    'free-paint-time': { emoji: '🎨', name: 'Art Time' }
};

/**
 * Load sticker collection from localStorage
 */
const loadStickers = (): StickerCollection => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            return { stickers: [], lastUpdated: Date.now() };
        }
        return JSON.parse(stored) as StickerCollection;
    } catch (e) {
        console.warn('Failed to load stickers:', e);
        return { stickers: [], lastUpdated: Date.now() };
    }
};

/**
 * Save sticker collection to localStorage
 */
const saveStickers = (collection: StickerCollection): void => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(collection));
    } catch (e) {
        console.warn('Failed to save stickers:', e);
    }
};

/**
 * Earn a sticker (called on mode completions)
 */
export const earnSticker = (type: StickerType): Sticker | null => {
    return withFeatureFlag(
        'stickerRewards',
        () => {
            try {
                const collection = loadStickers();
                const config = STICKER_CONFIGS[type];
                
                const sticker: Sticker = {
                    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
                    type,
                    earnedAt: Date.now(),
                    emoji: config.emoji,
                    placed: false
                };
                
                collection.stickers.push(sticker);
                collection.lastUpdated = Date.now();
                saveStickers(collection);
                
                return sticker;
            } catch (e) {
                console.warn('Failed to earn sticker:', e);
                throw e; // Re-throw to trigger rollback
            }
        },
        () => null // Fallback: return null if flag disabled
    );
};

/**
 * Get all stickers
 */
export const getAllStickers = (): Sticker[] => {
    const collection = loadStickers();
    return collection.stickers;
};

/**
 * Get unplaced stickers
 */
export const getUnplacedStickers = (): Sticker[] => {
    const collection = loadStickers();
    return collection.stickers.filter(s => !s.placed);
};

/**
 * Place a sticker at coordinates (pinch-to-place)
 */
export const placeSticker = (stickerId: string, x: number, y: number): boolean => {
    try {
        const collection = loadStickers();
        const sticker = collection.stickers.find(s => s.id === stickerId);
        
        if (!sticker) {
            return false;
        }
        
        sticker.placed = true;
        sticker.placedX = x;
        sticker.placedY = y;
        collection.lastUpdated = Date.now();
        saveStickers(collection);
        
        return true;
    } catch (e) {
        console.warn('Failed to place sticker:', e);
        return false;
    }
};

/**
 * Remove a sticker (un-place it)
 */
export const unplaceSticker = (stickerId: string): boolean => {
    try {
        const collection = loadStickers();
        const sticker = collection.stickers.find(s => s.id === stickerId);
        
        if (!sticker) {
            return false;
        }
        
        sticker.placed = false;
        delete sticker.placedX;
        delete sticker.placedY;
        collection.lastUpdated = Date.now();
        saveStickers(collection);
        
        return true;
    } catch (e) {
        console.warn('Failed to unplace sticker:', e);
        return false;
    }
};

/**
 * Get sticker config for display
 */
export const getStickerConfig = (type: StickerType) => {
    return STICKER_CONFIGS[type];
};
