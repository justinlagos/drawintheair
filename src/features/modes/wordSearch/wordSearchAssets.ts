/**
 * Word Search Assets - Kid-First Design
 * 
 * Themes, word sets, and visual assets for Word Search
 * Includes emoji icons for each word to help non-readers
 */

import type { Theme } from './wordSearchTypes';

// Word sets with expanded vocabulary from wordSearchWords.ts
// Uses the new expanded word bank with 400+ words
import { getRandomWords, WORD_CATEGORIES } from './wordSearchWords';

// Map themes to categories for word selection
const THEME_TO_CATEGORIES: Record<Theme, string[]> = {
    animals: ['Animals (Easy)', 'Animals (Medium)', 'Animals (Hard)'],
    colours: ['Colors (Easy)', 'Colors (Medium)'],
    family: ['Family (Medium)'],
    food: ['Food (Easy)', 'Food (Medium)'],
    toys: ['Toys (Easy)'],
    nature: ['Nature (Easy)', 'Nature (Medium)', 'Nature (Hard)']
};

// Legacy WORD_SETS for backward compatibility - now uses expanded vocabulary
// Built from WORD_CATEGORIES
const buildWordSets = (): Record<Theme, string[]> => {
    return {
        animals: WORD_CATEGORIES.filter(c => c.name.startsWith('Animals')).flatMap(c => c.words),
        colours: WORD_CATEGORIES.filter(c => c.name.startsWith('Colors')).flatMap(c => c.words),
        family: WORD_CATEGORIES.filter(c => c.name.startsWith('Family')).flatMap(c => c.words),
        food: WORD_CATEGORIES.filter(c => c.name.startsWith('Food')).flatMap(c => c.words),
        toys: WORD_CATEGORIES.filter(c => c.name.startsWith('Toys')).flatMap(c => c.words),
        nature: WORD_CATEGORIES.filter(c => c.name.startsWith('Nature')).flatMap(c => c.words)
    };
};

export const WORD_SETS: Record<Theme, string[]> = buildWordSets();

// Emoji icons for each word (helps non-readers identify words)
export const WORD_ICONS: Record<string, string> = {
    // Animals
    'CAT': '🐱', 'DOG': '🐕', 'COW': '🐄', 'PIG': '🐷', 'HEN': '🐔',
    'BEE': '🐝', 'ANT': '🐜', 'BAT': '🦇', 'FOX': '🦊', 'OWL': '🦉',
    'BUG': '🐛', 'FLY': '🪰', 'RAT': '🐀', 'ELK': '🦌', 'EMU': '🐦',
    
    // Colors
    'RED': '🔴', 'BLUE': '🔵', 'PINK': '💗', 'GOLD': '🌟', 'GRAY': '⚫',
    'LIME': '💚', 'CYAN': '🩵', 'TEAL': '🌊',
    
    // Family
    'MOM': '👩', 'DAD': '👨', 'SIS': '👧', 'BRO': '👦', 'NAN': '👵',
    'POP': '👴', 'SON': '👦', 'BOY': '👦', 'GIRL': '👧',
    
    // Food
    'PIE': '🥧', 'JAM': '🍓', 'EGG': '🥚', 'HAM': '🍖', 'NUT': '🥜',
    'PEA': '🟢', 'FIG': '🍇', 'TEA': '🍵', 'BUN': '🍞', 'ICE': '🍦',
    'OAT': '🌾', 'YAM': '🍠', 'RYE': '🌾', 'SOY': '🫘',
    
    // Toys
    'TOY': '🧸', 'CAR': '🚗', 'TOP': '🎠', 'KIT': '🧰', 'JET': '✈️',
    'BOX': '📦', 'DEN': '🏠',
    
    // Nature
    'SUN': '☀️', 'BUD': '🌱', 'DEW': '💧', 'MUD': '🟤', 'SKY': '🌤️',
    'LOG': '🪵', 'HAY': '🌾', 'IVY': '🌿', 'OAK': '🌳', 'ELM': '🌲',
    'FIR': '🎄', 'BAY': '🏖️'
};

/**
 * Get emoji icon for a word
 */
export function getWordIcon(word: string): string {
    return WORD_ICONS[word.toUpperCase()] || '📝';
}

/**
 * Get word set for a theme
 */
export function getWordSet(theme: Theme): string[] {
    return WORD_SETS[theme];
}

/**
 * Select random words from a set with length constraints
 * Now uses expanded vocabulary with tracking to avoid repetition
 */
export function selectWords(theme: Theme, count: number, minLength?: number, maxLength?: number): string[] {
    // Determine difficulty based on length constraints
    let difficulty: 1 | 2 | 3 | undefined = undefined;
    if (minLength !== undefined && maxLength !== undefined) {
        if (maxLength <= 4) difficulty = 1;
        else if (maxLength <= 5) difficulty = 2;
        else difficulty = 3;
    }
    
    // Get words from appropriate categories for this theme
    const categories = THEME_TO_CATEGORIES[theme] || [];
    let allWords: string[] = [];
    
    categories.forEach(catName => {
        const category = WORD_CATEGORIES.find(c => c.name === catName);
        if (category) {
            if (!difficulty || category.difficulty === difficulty) {
                allWords = allWords.concat(category.words);
            }
        }
    });
    
    // Filter by length if constraints provided
    if (minLength !== undefined || maxLength !== undefined) {
        allWords = allWords.filter(word => {
            const len = word.length;
            if (minLength !== undefined && len < minLength) return false;
            if (maxLength !== undefined && len > maxLength) return false;
            return true;
        });
    }
    
    // Use getRandomWords to avoid repetition
    return getRandomWords(Math.min(count, allWords.length), difficulty);
}

/**
 * Theme colors for visual styling - Kid-friendly, high contrast
 */
export const THEME_COLORS: Record<Theme, {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
}> = {
    animals: {
        primary: '#4ECDC4',     // Teal
        secondary: '#95E1D3',   // Light teal
        accent: '#FFE66D',      // Warm yellow
        background: 'rgba(78, 205, 196, 0.15)'
    },
    colours: {
        primary: '#FF6B6B',     // Coral
        secondary: '#FFE66D',   // Yellow
        accent: '#4ECDC4',      // Teal
        background: 'rgba(255, 107, 107, 0.15)'
    },
    family: {
        primary: '#A855F7',     // Purple
        secondary: '#FF6B9D',   // Pink
        accent: '#FFD700',      // Gold
        background: 'rgba(168, 85, 247, 0.15)'
    },
    food: {
        primary: '#FF9500',     // Orange
        secondary: '#FFB84D',   // Light orange
        accent: '#FF6B6B',      // Coral
        background: 'rgba(255, 149, 0, 0.15)'
    },
    toys: {
        primary: '#9B59B6',     // Purple
        secondary: '#BB8FCE',   // Light purple
        accent: '#FF6B9D',      // Pink
        background: 'rgba(155, 89, 182, 0.15)'
    },
    nature: {
        primary: '#27AE60',     // Green
        secondary: '#58D68D',   // Light green
        accent: '#F4D03F',      // Yellow
        background: 'rgba(39, 174, 96, 0.15)'
    }
};

/**
 * Get theme icon
 */
export function getThemeIcon(theme: Theme): string {
    switch (theme) {
        case 'animals':
            return '🐾';
        case 'colours':
            return '🌈';
        case 'family':
            return '👨‍👩‍👧‍👦';
        case 'food':
            return '🍎';
        case 'toys':
            return '🧸';
        case 'nature':
            return '🌿';
        default:
            return '🔍';
    }
}
