/**
 * Recyclable illustrations — plastic bottle, can, paper, glass jar.
 * Used by Sort & Place "Recycle vs Trash" stage.
 *
 * Clean clear silhouettes that read as "intact, useful container" so kids
 * intuit they belong in the recycle stream (vs the crumpled trash items).
 */

import type { KidIconDef } from '../kidIcons';

export const RECYCLABLE_ICONS: Record<string, KidIconDef> = {
    'recycle.bottle': {
        viewBox: { w: 100, h: 100 },
        intrinsicColor: true,
        body: `
            <!-- Bottle outer shape (clear plastic) -->
            <path d="M 36 22 L 36 30 Q 30 32 30 40 L 30 84 Q 30 92 38 92 L 62 92 Q 70 92 70 84 L 70 40 Q 70 32 64 30 L 64 22 Z"
                  fill="#A8E0F0" opacity="0.55"/>
            <!-- Water inside -->
            <path d="M 32 50 L 32 84 Q 32 90 38 90 L 62 90 Q 68 90 68 84 L 68 50 Z"
                  fill="#7DD3FC" opacity="0.85"/>
            <!-- Air gap highlight -->
            <path d="M 32 36 L 32 48 L 68 48 L 68 36 Z" fill="#E8F8FE" opacity="0.6"/>
            <!-- Cap -->
            <rect x="36" y="18" width="28" height="10" rx="2" fill="#3FA4FF"/>
            <rect x="36" y="20" width="28" height="2" fill="#FFFFFF" opacity="0.5"/>
            <!-- Label band -->
            <rect x="30" y="58" width="40" height="14" fill="#FFFFFF"/>
            <line x1="34" y1="63" x2="60" y2="63" stroke="#3F4052" stroke-width="1.2" opacity="0.5"/>
            <line x1="34" y1="67" x2="56" y2="67" stroke="#3F4052" stroke-width="1.2" opacity="0.4"/>
            <!-- Glossy highlight -->
            <rect x="38" y="42" width="3" height="44" rx="1.5" fill="#FFFFFF" opacity="0.7"/>
            <!-- Outline -->
            <path d="M 36 22 L 36 30 Q 30 32 30 40 L 30 84 Q 30 92 38 92 L 62 92 Q 70 92 70 84 L 70 40 Q 70 32 64 30 L 64 22 Z"
                  fill="none" stroke="rgba(20,15,40,0.30)" stroke-width="2" stroke-linejoin="round"/>
        `,
    },

    'recycle.can': {
        viewBox: { w: 100, h: 100 },
        intrinsicColor: true,
        body: `
            <!-- Can body -->
            <rect x="28" y="14" width="44" height="76" rx="4" fill="#C8CCD4"/>
            <!-- Top oval (rim) -->
            <ellipse cx="50" cy="14" rx="22" ry="4" fill="#9CA0AC"/>
            <ellipse cx="50" cy="14" rx="22" ry="3" fill="#E0E4EA"/>
            <!-- Pull tab -->
            <rect x="44" y="9" width="12" height="4" rx="2" fill="#9CA0AC"/>
            <circle cx="50" cy="14" r="2" fill="#3F4052" opacity="0.6"/>
            <!-- Label band (bright) -->
            <rect x="28" y="40" width="44" height="24" fill="#E84545"/>
            <!-- Label text bar -->
            <rect x="34" y="48" width="32" height="3" rx="1.5" fill="#FFFFFF"/>
            <rect x="38" y="54" width="24" height="2" rx="1" fill="#FFFFFF" opacity="0.7"/>
            <!-- Bottom rim -->
            <rect x="28" y="86" width="44" height="4" fill="#9CA0AC" opacity="0.55"/>
            <!-- Body highlight -->
            <rect x="32" y="20" width="3" height="68" rx="1.5" fill="#FFFFFF" opacity="0.65"/>
            <!-- Outline -->
            <rect x="28" y="14" width="44" height="76" rx="4"
                  fill="none" stroke="rgba(20,15,40,0.22)" stroke-width="2"/>
        `,
    },

    'recycle.paper': {
        viewBox: { w: 100, h: 100 },
        intrinsicColor: true,
        body: `
            <!-- Bottom paper (rotated back) -->
            <rect x="22" y="32" width="58" height="60" rx="2" fill="#E0E4EA" transform="rotate(-4 50 62)"/>
            <!-- Middle paper -->
            <rect x="22" y="28" width="58" height="62" rx="2" fill="#F4F6FB" transform="rotate(2 50 62)"/>
            <!-- Top paper -->
            <rect x="20" y="22" width="60" height="62" rx="2" fill="#FFFFFF"/>
            <!-- Text lines -->
            <line x1="30" y1="36" x2="70" y2="36" stroke="#A8B0C0" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="30" y1="46" x2="64" y2="46" stroke="#A8B0C0" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="30" y1="56" x2="70" y2="56" stroke="#A8B0C0" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="30" y1="66" x2="60" y2="66" stroke="#A8B0C0" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="30" y1="76" x2="54" y2="76" stroke="#A8B0C0" stroke-width="1.5" stroke-linecap="round"/>
            <!-- Folded corner -->
            <path d="M 80 22 L 80 32 L 70 22 Z" fill="#E0E4EA"/>
            <!-- Outline -->
            <rect x="20" y="22" width="60" height="62" rx="2"
                  fill="none" stroke="rgba(20,15,40,0.22)" stroke-width="2"/>
        `,
    },

    'recycle.glass': {
        viewBox: { w: 100, h: 100 },
        intrinsicColor: true,
        body: `
            <!-- Jar body (clear) -->
            <path d="M 26 26 Q 26 22 30 22 L 70 22 Q 74 22 74 26 L 74 86 Q 74 92 68 92 L 32 92 Q 26 92 26 86 Z"
                  fill="#A8E0F0" opacity="0.55"/>
            <!-- Liquid inside -->
            <path d="M 28 50 L 28 84 Q 28 90 32 90 L 68 90 Q 72 90 72 84 L 72 50 Z"
                  fill="#7DD3FC" opacity="0.7"/>
            <!-- Liquid surface highlight -->
            <ellipse cx="50" cy="50" rx="22" ry="2" fill="#FFFFFF" opacity="0.6"/>
            <!-- Lid -->
            <rect x="26" y="14" width="48" height="12" rx="2" fill="#A86B6B"/>
            <line x1="30" y1="20" x2="70" y2="20" stroke="#7A4F1F" stroke-width="1"/>
            <!-- Lid highlight -->
            <rect x="30" y="16" width="40" height="2" rx="1" fill="#FFFFFF" opacity="0.5"/>
            <!-- Body highlight -->
            <rect x="30" y="32" width="3" height="54" rx="1.5" fill="#FFFFFF" opacity="0.7"/>
            <!-- Outline -->
            <path d="M 26 26 Q 26 22 30 22 L 70 22 Q 74 22 74 26 L 74 86 Q 74 92 68 92 L 32 92 Q 26 92 26 86 Z"
                  fill="none" stroke="rgba(20,15,40,0.30)" stroke-width="2" stroke-linejoin="round"/>
        `,
    },
};
