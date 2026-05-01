/**
 * Food illustrations — apple, banana, pizza, cake.
 * Used by Sort & Place "Food vs Toys" stage.
 *
 * Iconic 2.5D-styled silhouettes — bold simple forms a 4-year-old can name
 * at a glance. Intrinsic colours (red apple, yellow banana, etc.) so the
 * stage data colour is ignored — the food's identity IS its colour.
 */

import type { KidIconDef } from '../kidIcons';

export const FOOD_ICONS: Record<string, KidIconDef> = {
    'food.apple': {
        viewBox: { w: 100, h: 100 },
        intrinsicColor: true,
        body: `
            <defs>
                <radialGradient id="apg" cx="35%" cy="35%" r="80%">
                    <stop offset="0%" stop-color="#FFB8A8" stop-opacity="0.8"/>
                    <stop offset="60%" stop-color="#E84545" stop-opacity="0"/>
                    <stop offset="100%" stop-color="#A82E2E"/>
                </radialGradient>
            </defs>
            <!-- Apple body — slightly heart-bottom shape -->
            <path d="M 50 22 C 36 20 22 26 20 44 C 18 64 28 88 50 90 C 72 88 82 64 80 44 C 78 26 64 20 50 22 Z"
                  fill="#E84545"/>
            <path d="M 50 22 C 36 20 22 26 20 44 C 18 64 28 88 50 90 C 72 88 82 64 80 44 C 78 26 64 20 50 22 Z"
                  fill="url(#apg)"/>
            <!-- Stem -->
            <path d="M 48 22 L 48 14 Q 48 11 50 11 Q 52 11 52 14 L 52 22 Z" fill="#6B4423"/>
            <!-- Leaf -->
            <path d="M 52 18 Q 70 10 78 14 Q 74 22 60 24 Q 54 24 52 18 Z" fill="#5BB04A"/>
            <path d="M 52 18 Q 64 14 76 16" fill="none" stroke="#3F8A2E" stroke-width="1" opacity="0.5"/>
            <!-- Glossy highlight -->
            <ellipse cx="36" cy="44" rx="10" ry="14" fill="#FFFFFF" opacity="0.5"
                     transform="rotate(-22 36 44)"/>
            <ellipse cx="32" cy="36" rx="3.5" ry="2.5" fill="#FFFFFF" opacity="0.95"/>
            <!-- Outline -->
            <path d="M 50 22 C 36 20 22 26 20 44 C 18 64 28 88 50 90 C 72 88 82 64 80 44 C 78 26 64 20 50 22 Z"
                  fill="none" stroke="rgba(20,15,40,0.22)" stroke-width="2" stroke-linejoin="round"/>
        `,
    },

    'food.banana': {
        viewBox: { w: 100, h: 100 },
        intrinsicColor: true,
        body: `
            <!-- Banana curve -->
            <path d="M 16 58 Q 14 24 50 18 Q 86 18 90 44 Q 88 56 76 54 Q 74 38 56 36 Q 32 38 26 64 Q 22 70 16 64 Z"
                  fill="#FFD13D"/>
            <!-- Underbelly shadow -->
            <path d="M 26 64 Q 32 50 56 44 Q 76 44 84 50 Q 76 50 56 50 Q 36 52 30 66 Z"
                  fill="#E8B528" opacity="0.7"/>
            <!-- Brown end (left) -->
            <ellipse cx="18" cy="62" rx="6" ry="3" fill="#7A4F1F" transform="rotate(-12 18 62)"/>
            <!-- Brown end (right) -->
            <ellipse cx="86" cy="44" rx="5" ry="3" fill="#7A4F1F" transform="rotate(20 86 44)"/>
            <!-- Highlight along the top curve -->
            <path d="M 24 52 Q 30 28 50 22 Q 78 22 82 42"
                  fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity="0.55"/>
            <!-- Outline -->
            <path d="M 16 58 Q 14 24 50 18 Q 86 18 90 44 Q 88 56 76 54 Q 74 38 56 36 Q 32 38 26 64 Q 22 70 16 64 Z"
                  fill="none" stroke="rgba(20,15,40,0.22)" stroke-width="2" stroke-linejoin="round"/>
        `,
    },

    'food.pizza': {
        viewBox: { w: 100, h: 100 },
        intrinsicColor: true,
        body: `
            <!-- Crust outer triangle -->
            <path d="M 50 8 L 90 86 L 10 86 Z" fill="#D89B5C"/>
            <!-- Crust inner edge -->
            <path d="M 50 8 L 86 80 L 14 80 Z" fill="#F2C078"/>
            <!-- Cheese -->
            <path d="M 50 18 L 82 76 L 18 76 Z" fill="#FFD86B"/>
            <!-- Cheese melt highlight -->
            <ellipse cx="48" cy="38" rx="8" ry="3" fill="#FFFFFF" opacity="0.4"/>
            <!-- Pepperoni dots -->
            <circle cx="42" cy="52" r="6" fill="#E84545"/>
            <circle cx="64" cy="58" r="5" fill="#E84545"/>
            <circle cx="48" cy="68" r="5" fill="#E84545"/>
            <circle cx="44" cy="50" r="2" fill="#FF8A2A" opacity="0.6"/>
            <circle cx="65" cy="56" r="1.5" fill="#FF8A2A" opacity="0.6"/>
            <!-- Basil leaves -->
            <ellipse cx="56" cy="50" rx="3" ry="1.5" fill="#5BB04A" transform="rotate(30 56 50)"/>
            <ellipse cx="36" cy="62" rx="3" ry="1.5" fill="#5BB04A" transform="rotate(-20 36 62)"/>
            <!-- Outline -->
            <path d="M 50 8 L 90 86 L 10 86 Z"
                  fill="none" stroke="rgba(20,15,40,0.25)" stroke-width="2" stroke-linejoin="round"/>
        `,
    },

    'food.cake': {
        viewBox: { w: 100, h: 100 },
        intrinsicColor: true,
        body: `
            <!-- Plate -->
            <ellipse cx="50" cy="92" rx="42" ry="4" fill="#A8B0C0" opacity="0.5"/>
            <!-- Cake bottom layer -->
            <rect x="14" y="48" width="72" height="42" rx="6" fill="#F4C2C2"/>
            <!-- Layer filling stripe -->
            <rect x="14" y="62" width="72" height="6" fill="#A86B6B"/>
            <!-- Frosting top — wavy -->
            <path d="M 14 48 Q 22 40 28 48 Q 36 40 42 48 Q 50 40 56 48 Q 64 40 72 48 Q 80 40 86 48 L 86 56 Q 80 50 72 56 Q 64 50 56 56 Q 50 50 42 56 Q 36 50 28 56 Q 22 50 14 56 Z"
                  fill="#FFFFFF"/>
            <!-- Frosting drips -->
            <path d="M 22 56 Q 22 64 24 66 Q 26 64 26 56 Z" fill="#FFFFFF"/>
            <path d="M 50 56 Q 50 66 52 68 Q 54 66 54 56 Z" fill="#FFFFFF"/>
            <path d="M 76 56 Q 76 64 78 66 Q 80 64 80 56 Z" fill="#FFFFFF"/>
            <!-- Cherry stem -->
            <path d="M 50 28 Q 56 22 60 16" fill="none" stroke="#5B7F2E" stroke-width="2" stroke-linecap="round"/>
            <!-- Cherry -->
            <circle cx="50" cy="36" r="9" fill="#E84545"/>
            <circle cx="46" cy="33" r="2.5" fill="#FFFFFF" opacity="0.85"/>
            <!-- Sprinkles -->
            <rect x="22" y="74" width="3" height="6" fill="#FFD84D" rx="1.5" transform="rotate(20 22 74)"/>
            <rect x="40" y="78" width="3" height="6" fill="#55DDE0" rx="1.5" transform="rotate(-30 40 78)"/>
            <rect x="60" y="76" width="3" height="6" fill="#FF6B9D" rx="1.5" transform="rotate(15 60 76)"/>
            <rect x="76" y="80" width="3" height="6" fill="#7ED957" rx="1.5" transform="rotate(-10 76 80)"/>
            <!-- Body highlight -->
            <rect x="20" y="74" width="3" height="14" fill="#FFFFFF" opacity="0.6" rx="1.5"/>
            <!-- Outline -->
            <rect x="14" y="48" width="72" height="42" rx="6"
                  fill="none" stroke="rgba(20,15,40,0.22)" stroke-width="2"/>
        `,
    },
};
