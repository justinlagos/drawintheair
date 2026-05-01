/**
 * Toy illustrations — teddy, toy car, balloon, controller.
 * Used by Sort & Place "Food vs Toys" stage.
 *
 * Friendly chunky silhouettes that read clearly at small size.
 */

import type { KidIconDef } from '../kidIcons';

export const TOY_ICONS: Record<string, KidIconDef> = {
    'toy.teddy': {
        viewBox: { w: 100, h: 100 },
        intrinsicColor: true,
        body: `
            <!-- Outer ears -->
            <circle cx="22" cy="28" r="13" fill="#A86B3F"/>
            <circle cx="78" cy="28" r="13" fill="#A86B3F"/>
            <!-- Inner ears -->
            <circle cx="22" cy="28" r="7" fill="#E8B894"/>
            <circle cx="78" cy="28" r="7" fill="#E8B894"/>
            <!-- Head -->
            <circle cx="50" cy="56" r="34" fill="#A86B3F"/>
            <!-- Snout -->
            <ellipse cx="50" cy="64" rx="20" ry="14" fill="#E8D2A8"/>
            <!-- Eyes -->
            <circle cx="38" cy="50" r="4" fill="#3F4052"/>
            <circle cx="62" cy="50" r="4" fill="#3F4052"/>
            <circle cx="39.5" cy="48" r="1.6" fill="#FFFFFF"/>
            <circle cx="63.5" cy="48" r="1.6" fill="#FFFFFF"/>
            <!-- Nose -->
            <path d="M 46 58 Q 50 55 54 58 Q 50 63 46 58 Z" fill="#3F4052"/>
            <!-- Smile -->
            <path d="M 44 70 Q 50 74 56 70" fill="none"
                  stroke="#3F4052" stroke-width="2" stroke-linecap="round"/>
            <!-- Cheek blush -->
            <ellipse cx="32" cy="60" rx="4" ry="2" fill="#FF6B9D" opacity="0.45"/>
            <ellipse cx="68" cy="60" rx="4" ry="2" fill="#FF6B9D" opacity="0.45"/>
            <!-- Outline -->
            <circle cx="50" cy="56" r="34" fill="none" stroke="rgba(20,15,40,0.22)" stroke-width="2"/>
            <circle cx="22" cy="28" r="13" fill="none" stroke="rgba(20,15,40,0.22)" stroke-width="2"/>
            <circle cx="78" cy="28" r="13" fill="none" stroke="rgba(20,15,40,0.22)" stroke-width="2"/>
        `,
    },

    'toy.car': {
        viewBox: { w: 100, h: 100 },
        intrinsicColor: true,
        body: `
            <!-- Chunky toy-car body — exaggerated rounded shape -->
            <path d="M 14 64 L 14 50 Q 14 44 22 40 L 30 30 Q 34 24 44 24 L 64 24 Q 72 24 76 30 L 84 40 Q 90 44 90 50 L 90 64 Q 90 72 80 72 L 20 72 Q 14 72 14 64 Z"
                  fill="#FF6B6B"/>
            <!-- Window -->
            <path d="M 34 32 L 36 46 L 64 46 L 66 32 Z" fill="#7DD3FC"/>
            <!-- Window frame -->
            <line x1="50" y1="32" x2="50" y2="46" stroke="#FFFFFF" stroke-width="1.5"/>
            <!-- Body shine stripe -->
            <rect x="22" y="58" width="56" height="3" rx="1.5" fill="#FFFFFF" opacity="0.45"/>
            <!-- Headlight -->
            <circle cx="86" cy="56" r="3" fill="#FFD84D"/>
            <!-- Wheels -->
            <circle cx="28" cy="74" r="10" fill="#3F4052"/>
            <circle cx="28" cy="74" r="5" fill="#A8A8B8"/>
            <circle cx="28" cy="74" r="2" fill="#3F4052"/>
            <circle cx="72" cy="74" r="10" fill="#3F4052"/>
            <circle cx="72" cy="74" r="5" fill="#A8A8B8"/>
            <circle cx="72" cy="74" r="2" fill="#3F4052"/>
            <!-- Outline -->
            <path d="M 14 64 L 14 50 Q 14 44 22 40 L 30 30 Q 34 24 44 24 L 64 24 Q 72 24 76 30 L 84 40 Q 90 44 90 50 L 90 64 Q 90 72 80 72 L 20 72 Q 14 72 14 64 Z"
                  fill="none" stroke="rgba(20,15,40,0.22)" stroke-width="2" stroke-linejoin="round"/>
        `,
    },

    'toy.balloon': {
        viewBox: { w: 100, h: 100 },
        intrinsicColor: true,
        body: `
            <defs>
                <radialGradient id="balg" cx="35%" cy="32%" r="80%">
                    <stop offset="0%" stop-color="#FFB8D4" stop-opacity="0.85"/>
                    <stop offset="60%" stop-color="#FF6B9D" stop-opacity="0"/>
                    <stop offset="100%" stop-color="#D84B7A"/>
                </radialGradient>
            </defs>
            <!-- Balloon body — classic teardrop -->
            <path d="M 50 14 C 28 14 18 38 18 52 C 18 70 32 80 48 82 L 50 82 L 52 82 C 68 80 82 70 82 52 C 82 38 72 14 50 14 Z"
                  fill="#FF6B9D"/>
            <path d="M 50 14 C 28 14 18 38 18 52 C 18 70 32 80 48 82 L 50 82 L 52 82 C 68 80 82 70 82 52 C 82 38 72 14 50 14 Z"
                  fill="url(#balg)"/>
            <!-- Highlight -->
            <ellipse cx="38" cy="34" rx="10" ry="14" fill="#FFFFFF" opacity="0.45"
                     transform="rotate(-22 38 34)"/>
            <ellipse cx="34" cy="28" r="3" fill="#FFFFFF" opacity="0.95"/>
            <!-- Tie -->
            <polygon points="46,82 50,76 54,82 52,88 48,88" fill="#FF6B9D"/>
            <!-- String -->
            <path d="M 50 88 Q 48 93 50 96" fill="none" stroke="#3F4052" stroke-width="1.5" stroke-linecap="round"/>
            <!-- Outline -->
            <path d="M 50 14 C 28 14 18 38 18 52 C 18 70 32 80 48 82 L 50 82 L 52 82 C 68 80 82 70 82 52 C 82 38 72 14 50 14 Z"
                  fill="none" stroke="rgba(20,15,40,0.22)" stroke-width="2" stroke-linejoin="round"/>
        `,
    },

    'toy.controller': {
        viewBox: { w: 100, h: 100 },
        intrinsicColor: true,
        body: `
            <!-- Body -->
            <path d="M 12 56 Q 12 36 32 36 L 68 36 Q 88 36 88 56 Q 88 76 72 76 L 64 76 L 56 70 L 44 70 L 36 76 L 28 76 Q 12 76 12 56 Z"
                  fill="#3F4052"/>
            <!-- Body top highlight stripe -->
            <path d="M 22 44 L 32 38 L 68 38 L 78 44"
                  fill="none" stroke="#FFFFFF" stroke-width="3" opacity="0.22"/>
            <!-- D-pad -->
            <rect x="20" y="54" width="14" height="4" rx="1" fill="#A8A8B8"/>
            <rect x="25" y="49" width="4" height="14" rx="1" fill="#A8A8B8"/>
            <!-- Action buttons -->
            <circle cx="68" cy="50" r="3.5" fill="#FF6B6B"/>
            <circle cx="78" cy="56" r="3.5" fill="#7ED957"/>
            <circle cx="68" cy="62" r="3.5" fill="#55DDE0"/>
            <circle cx="58" cy="56" r="3.5" fill="#FFD84D"/>
            <!-- Center small button -->
            <circle cx="50" cy="50" r="2" fill="#A8A8B8"/>
            <!-- Outline -->
            <path d="M 12 56 Q 12 36 32 36 L 68 36 Q 88 36 88 56 Q 88 76 72 76 L 64 76 L 56 70 L 44 70 L 36 76 L 28 76 Q 12 76 12 56 Z"
                  fill="none" stroke="rgba(20,15,40,0.22)" stroke-width="2" stroke-linejoin="round"/>
        `,
    },
};
