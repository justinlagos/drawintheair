/**
 * Tracing Progress - Progression Tracking and Unlocks
 * 
 * Stores progress in localStorage:
 * - Current pack
 * - Unlocked level index per pack
 * - Best accuracy per level
 * - Completion status
 */

import type { TracingPath } from './tracingContent';
import { ALL_TRACING_PATHS, getPathsByPack } from './tracingContent';

export interface LevelProgress {
    pathId: string;
    completed: boolean;
    bestAccuracy: number; // 0-1
    attempts: number;
    lastCompletedAt: number | null;
}

export interface PackProgress {
    pack: number;
    unlocked: boolean;
    completedLevels: number;
    unlockedLevelIndex: number; // Index of highest unlocked level
}

export interface TracingProgress {
    currentPack: number;
    currentLevelIndex: number;
    packs: Record<number, PackProgress>;
    levels: Record<string, LevelProgress>;
    createdAt: number;
    updatedAt: number;
}

const STORAGE_KEY = 'draw-in-the-air:tracing-v2:progress';

// Default progress state
const createDefaultProgress = (): TracingProgress => {
    const packs: Record<number, PackProgress> = {
        1: {
            pack: 1,
            unlocked: true, // Pack 1 always unlocked
            completedLevels: 0,
            unlockedLevelIndex: 0
        },
        2: {
            pack: 2,
            unlocked: false,
            completedLevels: 0,
            unlockedLevelIndex: -1
        },
        3: {
            pack: 3,
            unlocked: false,
            completedLevels: 0,
            unlockedLevelIndex: -1
        },
        4: {
            pack: 4,
            unlocked: false,
            completedLevels: 0,
            unlockedLevelIndex: -1
        }
    };
    
    return {
        currentPack: 1,
        currentLevelIndex: 0,
        packs,
        levels: {},
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
};

// Load progress from localStorage
export const loadProgress = (): TracingProgress => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored) as TracingProgress;
            // Merge with defaults to handle new fields
            const defaultProgress = createDefaultProgress();
            return {
                ...defaultProgress,
                ...parsed,
                packs: {
                    ...defaultProgress.packs,
                    ...parsed.packs
                }
            };
        }
    } catch (e) {
        console.warn('[TracingProgress] Failed to load progress:', e);
    }
    
    return createDefaultProgress();
};

// Save progress to localStorage
export const saveProgress = (progress: TracingProgress): void => {
    try {
        progress.updatedAt = Date.now();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
        console.warn('[TracingProgress] Failed to save progress:', e);
    }
};

// Get current progress
let currentProgress: TracingProgress = loadProgress();

// Initialize level progress if missing
const initializeLevelProgress = (pathId: string): LevelProgress => {
    if (!currentProgress.levels[pathId]) {
        currentProgress.levels[pathId] = {
            pathId,
            completed: false,
            bestAccuracy: 0,
            attempts: 0,
            lastCompletedAt: null
        };
    }
    return currentProgress.levels[pathId];
};

// Get current path
export const getCurrentPath = (): TracingPath | null => {
    const packPaths = getPathsByPack(currentProgress.currentPack);
    if (currentProgress.currentLevelIndex < packPaths.length) {
        return packPaths[currentProgress.currentLevelIndex];
    }
    return null;
};

// Get current pack progress
export const getCurrentPackProgress = (): PackProgress => {
    return currentProgress.packs[currentProgress.currentPack] || currentProgress.packs[1];
};

// Get all packs progress
export const getAllPacksProgress = (): PackProgress[] => {
    return [1, 2, 3, 4].map(pack => currentProgress.packs[pack]);
};

// Mark level as completed
export const completeLevel = (pathId: string, accuracy: number): void => {
    const levelProgress = initializeLevelProgress(pathId);
    levelProgress.completed = true;
    levelProgress.bestAccuracy = Math.max(levelProgress.bestAccuracy, accuracy);
    levelProgress.attempts++;
    levelProgress.lastCompletedAt = Date.now();
    
    // Update pack progress
    const path = ALL_TRACING_PATHS.find(p => p.id === pathId);
    if (path) {
        const packProgress = currentProgress.packs[path.pack];
        if (packProgress) {
            // Count completed levels in this pack
            const packPaths = getPathsByPack(path.pack);
            const completedCount = packPaths.filter(p => 
                currentProgress.levels[p.id]?.completed
            ).length;
            packProgress.completedLevels = completedCount;
            
            // Unlock next level in pack
            if (currentProgress.currentLevelIndex < packPaths.length - 1) {
                packProgress.unlockedLevelIndex = Math.max(
                    packProgress.unlockedLevelIndex,
                    currentProgress.currentLevelIndex + 1
                );
            }
        }
    }
    
    // Check for pack unlocks
    checkPackUnlocks();
    
    saveProgress(currentProgress);
};

// Check if packs should be unlocked
const checkPackUnlocks = (): void => {
    // Pack 2 unlocks after 4 completions in Pack 1
    if (!currentProgress.packs[2].unlocked) {
        if (currentProgress.packs[1].completedLevels >= 4) {
            currentProgress.packs[2].unlocked = true;
            currentProgress.packs[2].unlockedLevelIndex = 0;
        }
    }
    
    // Pack 3 unlocks after 5 completions in Pack 2
    if (!currentProgress.packs[3].unlocked && currentProgress.packs[2].unlocked) {
        if (currentProgress.packs[2].completedLevels >= 5) {
            currentProgress.packs[3].unlocked = true;
            currentProgress.packs[3].unlockedLevelIndex = 0;
        }
    }
    
    // Pack 4 unlocks after 6 completions in Pack 3
    if (!currentProgress.packs[4].unlocked && currentProgress.packs[3].unlocked) {
        if (currentProgress.packs[3].completedLevels >= 6) {
            currentProgress.packs[4].unlocked = true;
            currentProgress.packs[4].unlockedLevelIndex = 0;
        }
    }
};

// Set current pack and level
export const setCurrentLevel = (pack: number, levelIndex: number): void => {
    currentProgress.currentPack = pack;
    currentProgress.currentLevelIndex = levelIndex;
    saveProgress(currentProgress);
};

// Advance to next level
export const advanceToNextLevel = (): boolean => {
    const packPaths = getPathsByPack(currentProgress.currentPack);
    
    // Try next level in current pack
    if (currentProgress.currentLevelIndex < packPaths.length - 1) {
        currentProgress.currentLevelIndex++;
        saveProgress(currentProgress);
        return true;
    }
    
    // Try next pack
    for (let pack = currentProgress.currentPack + 1; pack <= 4; pack++) {
        if (currentProgress.packs[pack].unlocked) {
            currentProgress.currentPack = pack;
            currentProgress.currentLevelIndex = 0;
            saveProgress(currentProgress);
            return true;
        }
    }
    
    // All levels completed
    return false;
};

// Unlock pack manually (for adult override)
export const unlockPack = (pack: number): void => {
    if (pack >= 1 && pack <= 4) {
        currentProgress.packs[pack].unlocked = true;
        currentProgress.packs[pack].unlockedLevelIndex = 0;
        saveProgress(currentProgress);
    }
};

// Reset all progress
export const resetProgress = (): void => {
    currentProgress = createDefaultProgress();
    saveProgress(currentProgress);
};

// Get level progress
export const getLevelProgress = (pathId: string): LevelProgress | null => {
    return currentProgress.levels[pathId] || null;
};

// Check if level is unlocked
export const isLevelUnlocked = (pathId: string): boolean => {
    const path = ALL_TRACING_PATHS.find(p => p.id === pathId);
    if (!path) return false;
    
    const packProgress = currentProgress.packs[path.pack];
    if (!packProgress.unlocked) return false;
    
    const packPaths = getPathsByPack(path.pack);
    const levelIndex = packPaths.findIndex(p => p.id === pathId);
    
    return levelIndex <= packProgress.unlockedLevelIndex;
};

// Get completion stats
export const getCompletionStats = () => {
    const totalLevels = ALL_TRACING_PATHS.length;
    const completedLevels = Object.values(currentProgress.levels).filter(l => l.completed).length;
    
    return {
        totalLevels,
        completedLevels,
        completionPercent: (completedLevels / totalLevels) * 100
    };
};
